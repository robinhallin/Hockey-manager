"use strict";
/* Independent one-period prototype. Fixed 0.1 s simulation; the view never rolls results.
 * Coordinates are metres on a 60 × 30 rink. Home attacks right. No career/storage access.
 * Phase transitions, player motion and puck flights share one authoritative event stream.
 */
const StudioHockey = (() => {
  const STEP=.1, clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const progress=(side,x)=>side===0?x:60-x;
  const point=(side,x,y)=>({x:progress(side,x),y});
  const ROLES=['LW','C','RW','LD','RD','X'];
  const ROLE_NAMES={LW:'Vänsterforward',C:'Center',RW:'Högerforward',LD:'Vänsterback',RD:'Högerback',G:'Målvakt',X:'Extra forward'};
  const PHASES={faceoff:'Tekning',breakout:'Uppspel',entry:'Zoninträde',attack:'Etablerat anfall',counter:'Omställning',loose:'Lös puck',clear:'Rensning',stoppage:'Avblåsning',finished:'Periodpaus'};
  function segmentDistance(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,l=dx*dx+dy*dy,t=l?clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/l,0,1):0;return {d:distance(p,{x:a.x+dx*t,y:a.y+dy*t}),t};}
  function rating(p,keys){return keys.reduce((s,k)=>s+(p.attributes[k]||10),0)/keys.length;}
  class Match {
    constructor(rosters,{seed=710031,scenario='period',duration=1200}={}){
      this.rng=seed>>>0;this.time=0;this.duration=duration;this.wall=0;this.tick=0;this.finished=false;
      this.score=[0,0];this.events=[];this.shots=[];this.goals=[];this.pressure=[];this.history=[];this.latestReplay=null;
      this.stats=[0,1].map(()=>({shots:0,attempts:0,saves:0,passes:0,entries:0,zone:0,clears:0,turnovers:0,faceoffs:0}));
      this.teams=rosters.map((r,side)=>{
        const players=r.players.map(p=>({...p,attributes:{...p.attributes},energy:100,ice:0}));
        const forwards=players.filter(p=>p.pos!=='B'&&p.pos!=='MV').sort((a,b)=>rating(b,['passing','shooting','positioning'])-rating(a,['passing','shooting','positioning']));
        const defense=players.filter(p=>p.pos==='B').sort((a,b)=>rating(b,['positioning','passing','checking'])-rating(a,['positioning','passing','checking']));
        const goalies=players.filter(p=>p.pos==='MV').sort((a,b)=>rating(b,['reflexes','positioning','handling'])-rating(a,['reflexes','positioning','handling']));
        if(forwards.length<3||defense.length<2||!goalies.length)throw new Error('Testmatchen behöver minst tre forwards, två backar och en målvakt per lag.');
        return {...r,players,forwards,defense,goalie:goalies[0],side,line:0,pair:0,shift:0,requested:false,change:null,changeQueue:[],tactics:{mentality:'balanced',pp:'131',pk:'box'}};
      });
      this.actors=[];this.penalty=null;this.owner=0;this.carrier=null;this.flight=null;this.lastTouches=[];
      this.phase='faceoff';this.phaseTime=0;this.attackPasses=0;this.setupTime=0;this.decision=1;
      this.caption='Lagen väntar på nedsläpp.';this.eventType='faceoff';this.stoppage=1.8;this.restartSpot={x:30,y:15};this.restartSide=null;
      this.focus=true;this.focusUntil=0;this.advice='Backarna säkrar bakom anfallet. Leta efter fria passningsvägar.';
      for(let side=0;side<2;side++)this.installUnit(side);
      this.faceoffPositions();this.puck={x:30,y:15};
      this.loadScenario(scenario);this.capture();
    }
    random(){this.rng=(Math.imul(this.rng,1664525)+1013904223)>>>0;return this.rng/4294967296;}
    skaters(side){return this.actors.filter(a=>a.side===side&&a.role!=='G');}
    actor(id){return this.actors.find(a=>a.id===id);}
    attribute(a,key){return clamp((a?.player.attributes[key]||10)*(1-(100-(a?.player.energy??100))*.0035),1,20);}
    unit(side,line=this.teams[side].line,pair=this.teams[side].pair){
      const t=this.teams[side],forwardCount=Math.min(4,Math.floor(t.forwards.length/3)),pairCount=Math.min(3,Math.floor(t.defense.length/2));
      const f=t.forwards.slice((line%forwardCount)*3,(line%forwardCount)*3+3);
      const c=[...f].sort((a,b)=>rating(b,['faceoffs'])-rating(a,['faceoffs']))[0];
      const wings=f.filter(p=>p.id!==c.id);
      const rows=[{role:'LW',player:wings[0]},{role:'C',player:c},{role:'RW',player:wings[1]},...t.defense.slice((pair%pairCount)*2,(pair%pairCount)*2+2).map((player,i)=>({role:i?'RD':'LD',player}))];
      return this.penalty?.side===side?rows.filter(p=>p.role!=='C'):rows;
    }
    makeActor(side,row,where){return {id:side+':'+row.player.id,side,role:row.role,player:row.player,...where,vx:0,vy:0,target:{...where},duty:ROLE_NAMES[row.role],status:'playing'};}
    installUnit(side){
      this.actors=this.actors.filter(a=>a.side!==side);
      for(const row of this.unit(side))this.actors.push(this.makeActor(side,row,point(side,20,15)));
      this.actors.push(this.makeActor(side,{role:'G',player:this.teams[side].goalie},point(side,4.4,15)));
      const t=this.teams[side];t.requested=false;t.change=null;t.changeQueue=[];t.shift=0;
    }
    setPhase(phase){if(this.phase===phase)return;this.phase=phase;this.phaseTime=0;if(phase==='attack'){this.attackPasses=0;this.setupTime=0;}}
    say(type,text,side=this.owner,important=false,extra={}){
      this.caption=text;this.eventType=type;
      const event={id:this.events.length+1,time:this.time,type,text,side,...extra};
      this.events.push(event);if(important)this.focusUntil=this.wall+3;
      return event;
    }
    takePossession(a,{turnover=false}={}){
      if(!a)return;
      const changed=a.side!==this.owner;
      if(changed)this.lastTouches=[];
      this.owner=a.side;this.carrier=a.id;this.flight=null;this.puck={x:a.x,y:a.y};
      this.decision=1.0+this.random()*.5;
      const p=progress(a.side,a.x);
      this.setPhase(p>40?'attack':changed&&p>18?'counter':p>23?'entry':'breakout');
      if(turnover){this.stats[a.side].turnovers++;this.say('turnover',a.player.name+' läser spelet och vinner pucken.',a.side,true);}
    }
    faceoffPositions(){
      for(const side of [0,1]){
        const skaters=this.skaters(side),center=skaters.find(a=>a.role==='C')||[...skaters].sort((a,b)=>this.attribute(b,'faceoffs')-this.attribute(a,'faceoffs'))[0],dx=side===0?-1:1;
        for(const a of this.actors.filter(a=>a.side===side)){
          const offset={LW:[2,-6],C:[.65,0],RW:[2,6],LD:[8,-5],RD:[8,5],X:[4,3]};
          const z=a===center?[.65,0]:offset[a.role];
          const p=a.role==='G'?point(side,4.4,15):{x:clamp(this.restartSpot.x+dx*z[0],2,58),y:clamp(this.restartSpot.y+z[1],2,28)};
          a.x=p.x;a.y=p.y;a.target={...p};a.vx=0;a.vy=0;a.status='playing';
        }
      }
    }
    faceoff(){
      const centers=[0,1].map(side=>this.skaters(side).find(a=>a.role==='C')||[...this.skaters(side)].sort((a,b)=>this.attribute(b,'faceoffs')-this.attribute(a,'faceoffs'))[0]);
      const win=this.restartSide??(this.random()<clamp(.5+(this.attribute(centers[0],'faceoffs')-this.attribute(centers[1],'faceoffs'))*.022,.25,.75)?0:1);
      this.restartSide=null;this.stats[win].faceoffs++;this.takePossession(centers[win]);
      this.say('faceoff',centers[win].player.name+' vinner tekningen.',win);
    }
    stop(reason,text,spot={x:30,y:15}){
      this.carrier=null;this.flight=null;this.lastTouches=[];this.restartSpot={...spot};this.stoppage=reason==='goal'?4:2.3;
      this.setPhase('stoppage');this.say(reason,text,this.owner,true);this.pendingFaceoff=true;
    }
    requestChange(side=0){
      const t=this.teams[side];if(this.finished||t.requested||t.changeQueue.length||t.change)return false;
      t.requested=true;this.say('bench',t.name+' begär nästa femma. Vi inväntar ett säkert byte.',side);return true;
    }
    nextUnit(side){const t=this.teams[side];t.line=(t.line+1)%Math.min(4,Math.floor(t.forwards.length/3));t.pair=(t.pair+1)%Math.min(3,Math.floor(t.defense.length/2));}
    changeAtStoppage(){for(const side of [0,1]){const t=this.teams[side];if(t.requested||t.shift>32||t.change||t.changeQueue.length){if(!t.changeQueue.length&&!t.change)this.nextUnit(side);this.installUnit(side);}}}
    safeToChange(side){
      if(this.owner!==side||!this.carrier||this.penalty||this.phase==='counter'||this.phase==='loose')return false;
      const puckCarrier=this.actor(this.carrier);
      return progress(side,this.puck.x)>39&&this.skaters(1-side).every(a=>distance(a,puckCarrier)>2.4);
    }
    updateChanges(dt){
      for(const side of [0,1]){
        const t=this.teams[side];
        if(t.shift>43&&!t.requested&&!t.change&&!t.changeQueue.length)t.requested=true;
        if(t.requested&&!t.change&&!t.changeQueue.length&&this.safeToChange(side)){
          this.nextUnit(side);t.changeQueue=this.unit(side);t.requested=false;
        }
        if(t.change){
          const c=t.change,a=this.actor(c.id);
          if(c.stage==='out'&&a&&(this.owner!==side||this.carrier===a.id)){a.status='playing';t.changeQueue.unshift(c.row);t.change=null;t.requested=false;continue;}
          if(c.stage==='out'&&a&&distance(a,{x:c.gate,y:.7})<.8){
            this.actors=this.actors.filter(x=>x.id!==a.id);
            const incoming=this.makeActor(side,c.row,{x:c.gate,y:.7});incoming.status='entering';
            this.actors.push(incoming);c.id=incoming.id;c.stage='in';
            this.say('change',a.player.name+' lämnar vid sargen. '+incoming.player.name+' går in.',side);
          }else if(c.stage==='in'&&a&&distance(a,a.target)<2){a.status='playing';t.change=null;if(!t.changeQueue.length)t.shift=0;}
          continue;
        }
        if(t.changeQueue.length&&this.safeToChange(side)){
          const index=t.changeQueue.findIndex(row=>{const a=this.skaters(side).find(x=>x.role===row.role);return a&&a.id!==this.carrier&&a.player.id!==row.player.id&&!this.skaters(side).some(b=>b.player.id===row.player.id);});
          if(index<0){t.changeQueue=t.changeQueue.filter(row=>!this.skaters(side).some(a=>a.player.id===row.player.id));continue;}
          const row=t.changeQueue.splice(index,1)[0],a=this.skaters(side).find(x=>x.role===row.role);
          a.status='leaving';t.change={stage:'out',id:a.id,row,gate:side===0?27:33};
        }
      }
    }
    setTactics(side,plan){
      const t=this.teams[side];
      if(['balanced','control','direct'].includes(plan.mentality))t.tactics.mentality=plan.mentality;
      if(['131','umbrella'].includes(plan.pp))t.tactics.pp=plan.pp;
      if(['box','diamond'].includes(plan.pk))t.tactics.pk=plan.pk;
      const texts={balanced:'Balanserat spel: två backar säkrar, forwards söker öppna ytor.',control:'Vårda pucken: fler korta passningar, invänta en öppnare skottväg.',direct:'Rakare mot mål: snabbare zoninträden och tidigare avslut.'};
      this.say('bench',texts[t.tactics.mentality],side);this.advice=texts[t.tactics.mentality];
    }
    assign(a,p,duty){a.target={x:clamp(p.x,1.2,58.8),y:clamp(p.y,1.1,28.9)};a.duty=duty;}
    attackTargets(side){
      const t=this.teams[side],carrier=this.actor(this.carrier),p=progress(side,this.puck.x),pp=this.penalty&&this.penalty.side!==side;
      const slots=pp?(t.tactics.pp==='131'?{LD:[42,15],LW:[48,5.5],RW:[49,15],RD:[48,24.5],C:[54,15]}:{LD:[42,15],LW:[44,6],RD:[44,24],C:[53,12],RW:[53,19]}):{LW:[49,5.5],C:[53,15],RW:[49,24.5],LD:[42,8],RD:[42,22]};
      for(const a of this.skaters(side)){
        let x,y,duty;
        if(this.phase==='attack'){
          [x,y]=slots[a.role]||[51,21];y+=Math.sin(this.time*.28+ROLES.indexOf(a.role))*.8;
          duty=pp?({LD:'Spelar på blålinjen',LW:'Vänsterflank',RW:'Spelbar i slottet',RD:'Högerflank',C:'Skymmer framför mål'}[a.role]):a.role.endsWith('D')?'Säkrar bakom anfallet':a.role==='C'?'Söker ytan framför mål':'Breddar anfallet';
          if(a===carrier){x=Math.min(x,54);duty='Söker passning eller avslut';}
        }else{
          const isBack=a.role.endsWith('D'),index=ROLES.indexOf(a.role);
          y=isBack?(a.role==='LD'?8:22):([6,15,24][index]??20);
          x=isBack?clamp(p-9,9,32):clamp(p+(a===carrier?7:a.role==='C'?3:5),15,47);
          if(a===carrier){x=Math.min(49,p+(t.tactics.mentality==='direct'?12:8));y=clamp(a.y,6,24);}
          else if(p<40&&x>=37.5)x=37.5; // brake before the blue line, leaving room for momentum
          duty=isBack?'Säkrar bakom pucken':a===carrier?'Driver uppspelet':p<40?'Gör sig spelbar utan offside':'Följer med i anfallet';
        }
        if(a.id!==this.carrier&&p<=40&&progress(side,a.x)>40)x=37.5;
        if(a.id===this.carrier&&p<=40&&this.skaters(side).some(b=>b.id!==a.id&&progress(side,b.x)>40.1)){x=Math.min(x,37.5);duty='Inväntar att medspelarna lämnar anfallszonen';}
        this.assign(a,point(side,x,y),duty);
      }
      if(!carrier&&this.flight?.kind==='pass'){const receiver=this.actor(this.flight.to);if(receiver)this.assign(receiver,this.flight.end,'Möter passningen');}
    }
    defenseTargets(side){
      const attackers=this.skaters(1-side),defenders=this.skaters(side),carrier=this.actor(this.carrier),pk=this.penalty?.side===side;
      const enemyProgress=progress(1-side,this.puck.x);
      if(pk&&enemyProgress>40){
        const box=this.teams[side].tactics.pk==='box',slots=box?[[10,10],[10,20],[16,10],[16,20]]:[[7.5,15],[12.5,9],[12.5,21],[18,15]];
        const sorted=[...defenders].sort((a,b)=>Number(b.role.endsWith('D'))-Number(a.role.endsWith('D')));
        sorted.forEach((a,i)=>{const [x,y]=slots[i%4];const shift=clamp((this.puck.y-15)*.13,-1.4,1.4);this.assign(a,point(side,x,y+shift),'Håller '+(box?'boxen':'diamanten')+' och stänger skottlinjen');});
        if(carrier&&(carrier.y<9||carrier.y>21)){
          const forward=[...defenders].filter(a=>!a.role.endsWith('D')).sort((a,b)=>distance(a,carrier)-distance(b,carrier))[0];
          if(forward)this.assign(forward,point(side,progress(side,carrier.x)-1,carrier.y+(15-carrier.y)*.08),'Pressar flanken medan övriga skyddar mitten');
        }
        return;
      }
      // Assign each dangerous opponent a distinct defender. The deepest threats are covered first.
      const threats=[...attackers].sort((a,b)=>progress(1-side,b.x)-progress(1-side,a.x));
      const available=[...defenders],assignments=[];
      for(const threat of threats){
        if(!available.length)break;
        const deepest=assignments.length<2;
        let pool=deepest?available.filter(a=>a.role.endsWith('D')):available;
        if(!pool.length)pool=available;
        const marker=[...pool].sort((a,b)=>distance(a,threat)-distance(b,threat))[0];available.splice(available.indexOf(marker),1);
        assignments.push({a:marker,threat});
      }
      for(const {a,threat} of assignments){
        const at=progress(side,threat.x),hasPuck=threat===carrier;
        const gap=hasPuck?1.15:2.1;
        let x=clamp(at-gap,6,47),y=threat.y+(15-threat.y)*(hasPuck?.04:.14);
        // Backward skating keeps defenders between the rush and their own goal.
        if(enemyProgress<28&&a.role.endsWith('D'))x=Math.min(x,30);
        this.assign(a,point(side,x,y),hasPuck?'Styr puckföraren mot utsidan':'Täcker '+threat.player.name.split(' ').at(-1));
      }
      for(const a of available)this.assign(a,point(side,10,a.role==='LD'?11:19),'Skyddar slottet');
    }
    targets(){
      this.attackTargets(this.owner);this.defenseTargets(1-this.owner);
      if(!this.carrier&&!this.flight){
        // One pursuer per side; the other eight skaters continue supporting and covering.
        for(const side of [0,1]){const nearest=[...this.skaters(side)].filter(a=>a.status!=='leaving').sort((a,b)=>distance(a,this.puck)-distance(b,this.puck))[0];if(nearest)this.assign(nearest,this.puck,'Jagar den lösa pucken');}
      }
      for(const a of this.actors){
        if(a.role==='G'){
          const p=progress(a.side,this.puck.x),depth=p<20?1.2:.5;
          this.assign(a,point(a.side,3.4+depth,15+clamp((this.puck.y-15)*.19,-1.9,1.9)),'Följer pucken och täcker vinkeln');
        }
        if(a.status==='leaving')this.assign(a,{x:this.teams[a.side].change.gate,y:.7},'Går till bänken');
      }
    }
    move(dt){
      for(const a of this.actors){
        const dx=a.target.x-a.x,dy=a.target.y-a.y,d=Math.hypot(dx,dy);
        let top=a.role==='G'?2.2+this.attribute(a,'movement')*.09:3.1+this.attribute(a,'skating')*.09;
        if(a.id===this.carrier)top*=.86;
        const accel=2.7+this.attribute(a,a.role==='G'?'movement':'acceleration')*.085;
        const speed=Math.min(top,Math.sqrt(2*accel*d));
        let vx=d>.03?dx/d*speed:0,vy=d>.03?dy/d*speed:0;
        for(const b of this.actors){if(a.id===b.id)continue;const gap=distance(a,b);if(gap>.02&&gap<1.1){vx+=(a.x-b.x)/gap*(1.1-gap)*1.6;vy+=(a.y-b.y)/gap*(1.1-gap)*1.6;}}
        const change=Math.hypot(vx-a.vx,vy-a.vy),blend=change?Math.min(1,accel*dt/change):1;
        a.vx+=(vx-a.vx)*blend;a.vy+=(vy-a.vy)*blend;
        a.x=clamp(a.x+a.vx*dt,1,59);a.y=clamp(a.y+a.vy*dt,.6,29.4);
      }
      const carrier=this.actor(this.carrier);if(carrier)this.puck={x:carrier.x,y:carrier.y};
    }
    laneRisk(a,b){return this.skaters(1-a.side).reduce((risk,d)=>{const lane=segmentDistance(d,a,b);return lane.t>.12&&lane.t<.92?Math.max(risk,clamp(1-lane.d/1.9,0,1)*(this.attribute(d,'positioning')/20)):risk;},0);}
    passChance(a,b){return clamp(.66+(this.attribute(a,'passing')+this.attribute(b,'puckControl'))*.007-this.laneRisk(a,b)*.48-distance(a,b)*.0035,.2,.97);}
    shotQuality(a){
      const goal=point(a.side,56.5,15),d=distance(a,goal),angle=Math.abs(a.y-15);
      const defense=this.skaters(1-a.side),pressure=Math.max(0,1-Math.min(...defense.map(b=>distance(a,b)))/2.3);
      const keeper=this.actors.find(b=>b.side!==a.side&&b.role==='G');
      if(!keeper)return clamp(.8*Math.exp(-d/60)-pressure*.12,.15,.85);
      const lateral=this.lastTouches.length&&this.time-this.lastTouches.at(-1).time<2.4?Math.min(.06,Math.abs(this.lastTouches.at(-1).y-a.y)*.004):0;
      return clamp(.16*Math.exp(-d/13)*(1-angle/25)+(this.attribute(a,'shooting')-this.attribute(keeper,'reflexes'))*.003+lateral-pressure*.035,.012,.28);
    }
    pass(a,b){
      const end={x:b.x+b.vx*.25,y:b.y+b.vy*.25};end.x=clamp(end.x,1,59);end.y=clamp(end.y,1,29);
      if(progress(a.side,a.x)<40&&progress(a.side,end.x)>40&&this.skaters(a.side).some(p=>p.id!==a.id&&progress(a.side,p.x)>40.3))return false;
      const chance=this.passChance(a,b),success=this.random()<chance;
      const interceptors=this.skaters(1-a.side).map(d=>({actor:d,...segmentDistance(d,a,end)})).filter(row=>row.t>.12&&row.t<.92&&row.d<2.1).sort((x,y)=>x.t-y.t);
      // A failed pass meets the actual defender along its lane, not the intended receiver.
      const interceptor=!success?interceptors[0]:null;
      if(interceptor){end.x=interceptor.actor.x;end.y=interceptor.actor.y;}
      else if(!success){end.x=clamp(end.x+(this.random()-.5)*6,1,59);end.y=clamp(end.y+(this.random()-.5)*6,1,29);}
      this.flight={kind:interceptor?'intercept':'pass',from:a.id,to:interceptor?interceptor.actor.id:b.id,start:{...this.puck},end,elapsed:0,duration:Math.max(.24,distance(a,end)/17),chance,success,side:a.side};
      this.carrier=null;this.decision=1.2;
      this.say('pass',a.player.name+' söker '+b.player.name.split(' ').at(-1)+'.',a.side);return true;
    }
    shoot(a){
      const quality=this.shotQuality(a),goal=point(a.side,56.5,15),risk=this.laneRisk(a,goal);
      const roll=this.random(),onTarget=clamp(.61+(this.attribute(a,'shooting')-10)*.012,.48,.79);
      let outcome=roll<risk*.23?'block':roll<risk*.23+(1-risk*.23)*(1-onTarget)?'wide':this.random()<quality?'goal':'save';
      if(outcome==='save'&&!this.actors.some(b=>b.side!==a.side&&b.role==='G'))outcome='goal';
      let end={...goal};
      if(outcome==='wide')end.y=15+(a.y<15?-1:1)*(2.3+this.random()*2);
      if(outcome==='block'){
        const blocker=[...this.skaters(1-a.side)].sort((b,c)=>segmentDistance(b,a,goal).d-segmentDistance(c,a,goal).d)[0];end={x:blocker.x,y:blocker.y};
      }
      const shot={time:this.time,side:a.side,player:a.player.name,playerId:a.id,x:a.x,y:a.y,quality,outcome,assists:this.lastTouches.filter(t=>t.id!==a.id&&this.time-t.time<10).slice(-2).reverse()};
      this.flight={kind:'shot',start:{...this.puck},end,elapsed:0,duration:Math.max(.22,distance(a,end)/26),shot,side:a.side};this.carrier=null;this.focusUntil=this.wall+4;
      this.say('shot',a.player.name+' skjuter'+(a.y>10&&a.y<20?' från mitten!':' från kanten!'),a.side,true);
    }
    clear(a){
      this.stats[a.side].clears++;
      const end=point(a.side,52,clamp(a.y<15?5:25,2,28));
      this.flight={kind:'clear',side:a.side,start:{...this.puck},end,elapsed:0,duration:distance(a,end)/18};
      this.carrier=null;this.lastTouches=[];this.setPhase('clear');
      this.say('clear',a.player.name+' rensar ur zonen. Boxplayenheten får andrum.',a.side,true);
      this.advice=a.side===0?'Bra rensning. Vi kan samla boxen och få ner belastningen.':'De rensar. Hämta pucken och bygg upp powerplayet igen.';
    }
    resolveFlight(dt){
      const f=this.flight;if(!f)return;
      f.elapsed+=dt;const fraction=Math.min(1,f.elapsed/f.duration);
      this.puck={x:f.start.x+(f.end.x-f.start.x)*fraction,y:f.start.y+(f.end.y-f.start.y)*fraction};
      if(fraction<1)return;
      this.flight=null;
      if(f.kind==='intercept'){
        const defender=this.actor(f.to);
        if(defender&&distance(defender,this.puck)<2.4)this.takePossession(defender,{turnover:true});
        else{this.setPhase('loose');this.lastTouches=[];this.looseTime=0;this.say('loose','Passningen bryts och pucken blir lös.',f.side);}
      }else if(f.kind==='pass'){
        const from=this.actor(f.from),to=this.actor(f.to);
        if(to&&distance(to,this.puck)<2.4&&f.success){
          const previous=this.phase;this.takePossession(to);if(previous==='attack'){this.phase='attack';this.attackPasses++;}
          this.stats[f.side].passes++;
          this.lastTouches=this.lastTouches.filter(t=>t.id!==from.id);this.lastTouches.push({id:from.id,name:from.player.name,time:this.time,y:from.y});this.lastTouches=this.lastTouches.slice(-2);
          this.say('pass',to.player.name+' tar emot passningen.',f.side);
        }else{this.setPhase('loose');this.lastTouches=[];this.looseTime=0;this.say('loose','Passningen bryts. Båda lagen söker pucken.',f.side);}
      }else if(f.kind==='shot'){
        const shot=f.shot;this.shots.push(shot);this.stats[f.side].attempts++;
        if(['goal','save'].includes(shot.outcome))this.stats[f.side].shots++;
        if(shot.outcome==='goal'){
          this.score[f.side]++;this.goals.push(shot);
          if(this.penalty&&this.penalty.side!==f.side)this.endPenalty(true);
          this.stop('goal','MÅL! '+shot.player+' gör '+this.score.join('–')+'.');
        }else if(shot.outcome==='save'){
          this.stats[1-f.side].saves++;
          const goalie=this.actors.find(a=>a.side!==f.side&&a.role==='G');
          if(this.random()<.67+(this.attribute(goalie,'reboundControl')-10)*.012){this.stop('save',goalie.player.name+' räddar och blockerar pucken.',point(f.side,47,f.start.y<15?9:21));}
          else{this.puck=point(f.side,53.5,13+this.random()*4);this.setPhase('loose');this.looseTime=0;this.say('rebound',goalie.player.name+' räddar – retur framför mål!',f.side,true);}
        }else{
          this.puck=shot.outcome==='wide'?point(f.side,58,clamp(f.end.y,2,28)):{...f.end};
          this.setPhase('loose');this.looseTime=0;this.say(shot.outcome,shot.player+(shot.outcome==='block'?' får skottet blockerat.':' skjuter utanför. Pucken går bakom mål.'),f.side,true);
        }
        this.pendingReplayShot=shot;
      }else{this.setPhase('loose');this.looseTime=0;}
    }
    decide(){
      const a=this.actor(this.carrier);if(!a)return;
      const t=this.teams[a.side],p=progress(a.side,a.x),opponents=this.skaters(1-a.side),nearest=[...opponents].sort((b,c)=>distance(a,b)-distance(a,c))[0];
      const pk=this.penalty?.side===a.side,pp=this.penalty&&this.penalty.side!==a.side;
      if(pk&&p<32){
        const outlet=this.skaters(a.side).find(b=>b.id!==a.id&&progress(a.side,b.x)>p+8&&this.laneRisk(a,b)<.1&&opponents.every(d=>distance(d,b)>3));
        if(outlet&&this.random()<.22)this.pass(a,outlet);else this.clear(a);return;
      }
      if(nearest&&distance(a,nearest)<1.65&&this.random()<clamp(.19+(this.attribute(nearest,'checking')-this.attribute(a,'puckControl'))*.013,.08,.4)){
        this.takePossession(nearest,{turnover:true});return;
      }
      if(nearest&&distance(a,nearest)<2&&this.random()<.003+(20-this.attribute(nearest,'discipline'))*.0009&&!this.penalty){this.givePenalty(nearest.side,nearest.player.name);return;}
      if(this.phase==='attack'&&p>42&&this.phaseTime>(pp?2:.8)&&(!pp||this.setupTime>2.5&&this.attackPasses>=2)){
        const shoot=t.tactics.mentality==='direct'?.60:t.tactics.mentality==='control'?.24:.42;
        if(this.random()<shoot+this.shotQuality(a)*.45){this.shoot(a);return;}
      }
      const options=this.skaters(a.side).filter(b=>b.id!==a.id&&b.status!=='leaving'&&b.status!=='entering'&&distance(a,b)>3).map(b=>{
        const pressure=Math.min(...opponents.map(d=>distance(b,d)));
        const forward=progress(a.side,b.x)-p,quality=this.shotQuality(b);
        let score=this.passChance(a,b)+clamp(pressure/12,0,.32)+quality+(pp?Math.abs(b.y-a.y)/65:clamp(forward/35,-.3,.3));
        if(this.lastTouches.at(-1)?.id===b.id)score-=.14;
        if(p<30&&forward<0)score-=.4;
        return {b,score:score+this.random()*.08};
      }).sort((a,b)=>b.score-a.score);
      if(options.length&&(this.phase==='attack'||this.random()<.45)&&this.pass(a,options[0].b))return;
      if(this.phase==='attack'&&this.phaseTime>20&&p>40&&(!pp||this.attackPasses>=2))this.shoot(a);
    }
    givePenalty(side,name){
      this.penalty={side,remaining:120,name};
      // Stoppage is the only place where the short-handed unit is installed instantly.
      this.installUnit(side);this.stop('penalty',name+' utvisas två minuter för hakning.',point(1-side,47,9));
      this.advice=side===0?'Boxplay. Håll mitten och rensa när vi vinner pucken.':'Powerplay. Ställ upp och flytta pucken innan avslutet.';
    }
    endPenalty(stopped=false){
      if(!this.penalty)return;const side=this.penalty.side;this.penalty=null;
      if(stopped){this.installUnit(side);return;}
      const row=this.unit(side).find(r=>r.role==='C');
      if(row&&!this.skaters(side).some(a=>a.role==='C')){const a=this.makeActor(side,row,{x:30,y:29});a.status='returning';this.actors.push(a);}
      this.say('penalty-end',this.teams[side].name+' är fulltaligt.',side,true);
    }
    step(){
      if(this.finished)return;
      const dt=STEP;this.wall+=dt;this.tick++;
      if(this.stoppage>0){
        this.stoppage-=dt;
        if(this.pendingFaceoff&&this.stoppage<1.5){this.changeAtStoppage();this.faceoffPositions();this.puck={...this.restartSpot};this.pendingFaceoff=false;this.setPhase('faceoff');}
        if(this.stoppage<=0)this.faceoff();this.capture();return;
      }
      this.time=Math.min(this.duration,this.time+dt);this.phaseTime+=dt;
      if(this.time>=this.duration-1e-7){this.time=this.duration;this.finished=true;this.setPhase('finished');this.say('finished','Periodpaus. '+this.teams[0].name+' '+this.score.join('–')+' '+this.teams[1].name+'.',0,true);this.capture();return;}
      if(this.penalty){this.penalty.remaining-=dt;if(this.penalty.remaining<=0)this.endPenalty();}
      for(const t of this.teams){t.shift+=dt;for(const p of t.players){const a=this.actors.find(a=>a.player===p);if(a){p.ice+=dt;if(a.role!=='G')p.energy=clamp(p.energy-dt*(.20+(Math.hypot(a.vx,a.vy)>3?.08:0))*(1.4-rating(p,['stamina'])/35),15,100);}else p.energy=clamp(p.energy+dt*.31,15,100);}}
      const puckBefore={...this.puck};
      this.updateChanges(dt);this.targets();this.move(dt);
      if(this.carrier&&progress(this.owner,puckBefore.x)<=40&&progress(this.owner,this.puck.x)>40&&this.skaters(this.owner).some(a=>a.id!==this.carrier&&progress(this.owner,a.x)>40.3)){
        this.stop('offside','En medspelare är inne före pucken. Offside och tekning i mittzonen.',point(this.owner,37,this.puck.y<15?9:21));this.capture();return;
      }
      if(this.flight)this.resolveFlight(dt);
      else if(!this.carrier){
        this.looseTime=(this.looseTime||0)+dt;
        const closest=[...this.skaters(0),...this.skaters(1)].filter(a=>a.status!=='leaving').sort((a,b)=>distance(a,this.puck)-distance(b,this.puck));
        if(closest[0]&&distance(closest[0],this.puck)<1.1)this.takePossession(closest[0],{turnover:closest[0].side!==this.owner});
        else if(this.looseTime>10)this.stop('stoppage','Pucken låses vid sargen. Ny tekning.',{x:this.puck.x<30?13:47,y:this.puck.y<15?9:21});
      }else{
        const a=this.actor(this.carrier),p=progress(this.owner,a.x);
        if(p>40&&this.phase!=='attack'){
          this.stats[this.owner].entries++;this.setPhase('attack');
          this.say('entry',a.player.name+' tar in pucken i anfallszonen.',this.owner,true);
        }else if(p<=40&&this.phase==='attack')this.setPhase(p>22?'entry':'breakout');
        else if(p>23&&this.phase==='breakout')this.setPhase('entry');
        if(this.phase==='attack'){
          this.setupTime+=this.skaters(this.owner).every(a=>progress(this.owner,a.x)>40&&distance(a,a.target)<3)?dt:0;
        }
        this.decision-=dt;if(this.decision<=0){this.decision=1.1+this.random()*.7;this.decide();}
      }
      const bucket=Math.floor(this.time/10);if(!this.pressure[bucket])this.pressure[bucket]={home:0,away:0};
      if(progress(this.owner,this.puck.x)>40){this.pressure[bucket][this.owner===0?'home':'away']+=dt;this.stats[this.owner].zone+=dt;}
      this.focus=this.phase==='attack'||this.phase==='counter'||this.phase==='stoppage'||this.phase==='faceoff'||Boolean(this.penalty)||this.wall<this.focusUntil;
      this.capture();
    }
    capture(){
      if(this.tick%2!==0)return;
      const frame={time:this.time,wall:this.wall,score:[...this.score],phase:this.phase,caption:this.caption,eventType:this.eventType,puck:{...this.puck},carrier:this.carrier,owner:this.owner,actors:this.actors.map(a=>({id:a.id,side:a.side,role:a.role,name:a.player.name,x:a.x,y:a.y,vx:a.vx,vy:a.vy,duty:a.duty,status:a.status})),flight:this.flight?{kind:this.flight.kind,start:{...this.flight.start},end:{...this.flight.end}}:null};
      this.history.push(frame);if(this.history.length>150)this.history.shift();
      if(this.pendingReplayShot){this.latestReplay={shot:this.pendingReplayShot,frames:this.history.slice(-70)};this.pendingReplayShot=null;}
    }
    snapshot(){return this.history.at(-1);}
    loadScenario(scenario){
      if(scenario==='period')return;
      this.stoppage=0;this.phase='attack';this.phaseTime=0;this.owner=scenario==='pk'?1:0;
      if(scenario==='pp'||scenario==='pk'){const side=1-this.owner;this.penalty={side,remaining:120,name:'Testläge'};this.installUnit(side);}
      const carrier=this.skaters(this.owner).find(a=>a.role==='LW');this.carrier=carrier.id;this.puck=point(this.owner,48,6);
      this.targets();for(const a of this.actors){a.x=a.target.x;a.y=a.target.y;}
      this.puck={x:carrier.x,y:carrier.y};
      // Scenario placements are pre-match setup, so position the defense against the final attack.
      this.targets();for(const a of this.actors.filter(a=>a.side!==this.owner)){a.x=a.target.x;a.y=a.target.y;}
      if(scenario==='rush'){
        this.phase='counter';this.phaseTime=0;
        const positions={LW:[34,7],C:[32,22],RW:[17,24],LD:[16,9],RD:[14,20]};
        for(const a of this.skaters(0))Object.assign(a,point(0,...positions[a.role]));
        const enemy={LD:[42,15],RD:[25,9],LW:[22,6],C:[20,17],RW:[23,24]};
        for(const a of this.skaters(1))Object.assign(a,{x:enemy[a.role][0],y:enemy[a.role][1]});
        this.puck={x:carrier.x,y:carrier.y};
      }
      if(scenario==='change'){this.teams[0].shift=44;this.requestChange(0);}
      this.say('scenario',scenario==='rush'?'Två HV-spelare bryter fram. En back styr anfallet medan övriga jobbar hem.':scenario==='pp'?'HV71 ställer upp i powerplay. Flytta boxen innan avslutet.':scenario==='pk'?'HV71 håller boxen. Vinn pucken och rensa.':scenario==='change'?'HV71 har pucken i anfallszonen och begär ett kontrollerat byte.':'HV71 etablerar fem mot fem. Backarna säkrar vid blålinjen.',this.owner,true);
      this.advice=scenario==='rush'?'Puckföraren kan skjuta eller spela över. Den ensamma backen måste skydda mitten.':scenario==='pk'?'Skydda slottet. Kontra bara när en fri passningsväg finns.':'Se hur spelarna söker passningsvägar samtidigt som försvararna täcker farliga ytor.';
    }
  }
  return {Match,STEP,PHASES,ROLE_NAMES,progress,distance};
})();
if(typeof module!=="undefined")module.exports=StudioHockey;
