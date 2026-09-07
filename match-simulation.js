"use strict";
/* Shared hockey simulation. Fixed 0.1 s simulation; the view never rolls results.
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
  const PHASES={faceoff:'Tekning',breakout:'Uppspel',entry:'Zoninträde',attack:'Etablerat anfall',counter:'Omställning',loose:'Lös puck',battle:'Kamp om pucken',dump:'Dump & jakt',clear:'Rensning',stoppage:'Avblåsning',finished:'Periodpaus'};
  function segmentDistance(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,l=dx*dx+dy*dy,t=l?clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/l,0,1):0;return {d:distance(p,{x:a.x+dx*t,y:a.y+dy*t}),t};}
  function rating(p,keys){return keys.reduce((s,k)=>s+(p.attributes[k]||10),0)/keys.length;}
  class Match {
    constructor(rosters,{seed=710031,scenario='period',duration=1200}={}){
      this.modelVersion=2;this.rng=seed>>>0;this.time=0;this.duration=duration;this.wall=0;this.tick=0;this.finished=false;
      this.score=[0,0];this.events=[];this.shots=[];this.goals=[];this.pressure=[];this.history=[];this.latestReplay=null;
      this.stats=[0,1].map(()=>({shots:0,attempts:0,saves:0,passes:0,entries:0,zone:0,clears:0,turnovers:0,faceoffs:0,passAttempts:0,battles:0,battleWins:0,hits:0,blocks:0,dangerousRebounds:0,oneTimers:0,dumps:0}));
      this.teams=rosters.map((r,side)=>{
        const players=r.players.map(p=>({...p,attributes:{...p.attributes},energy:100,ice:0}));
        const forwards=players.filter(p=>p.pos!=='B'&&p.pos!=='MV').sort((a,b)=>rating(b,['passing','shooting','positioning'])-rating(a,['passing','shooting','positioning']));
        const defense=players.filter(p=>p.pos==='B').sort((a,b)=>rating(b,['positioning','passing','checking'])-rating(a,['positioning','passing','checking']));
        const goalies=players.filter(p=>p.pos==='MV').sort((a,b)=>rating(b,['reflexes','positioning','handling'])-rating(a,['reflexes','positioning','handling']));
        if(forwards.length<3||defense.length<2||!goalies.length)throw new Error('Testmatchen behöver minst tre forwards, två backar och en målvakt per lag.');
        return {...r,players,forwards,defense,goalie:goalies[0],side,line:0,pair:0,shift:0,requested:false,change:null,changeQueue:[],tactics:{mentality:'balanced',pp:'131',pk:'box'}};
      });
      this.actors=[];this.penalty=null;this.owner=0;this.carrier=null;this.flight=null;this.lastTouches=[];this.battle=null;this.rebound=null;
      this.phase='faceoff';this.phaseTime=0;this.attackPasses=0;this.setupTime=0;this.decision=1;
      this.caption='Lagen väntar på nedsläpp.';this.eventType='faceoff';this.stoppage=1.8;this.restartSpot={x:30,y:15};this.restartSide=null;
      this.focus=true;this.focusUntil=0;this.advice='Backarna säkrar bakom anfallet. Leta efter fria passningsvägar.';
      for(let side=0;side<2;side++)this.installUnit(side);
      this.faceoffPositions();this.puck={x:30,y:15};
      this.loadScenario(scenario);this.capture();
    }
    random(){this.rng=(Math.imul(this.rng,1664525)+1013904223)>>>0;return this.rng/4294967296;}
    skaters(side){return this.actors.filter(a=>a.side===side&&a.role!=='G');}
    shiftTime(a){return a.shift||0;}
    actor(id){return this.actors.find(a=>a.id===id);}
    attribute(a,key){return clamp((a?.player.attributes[key]||10)*(1-(100-(a?.player.energy??100))*.0035),1,20);}
    // Upgrade old in-progress saves without re-rolling an already travelling puck.
    upgrade(){
      if(this.modelVersion>=2)return;
      for(const s of this.stats){for(const key of ['battles','battleWins','hits','blocks','dangerousRebounds','oneTimers','dumps'])s[key]??=0;s.priorPasses=s.passes;s.passAttempts=0;}
      if(this.flight)this.flight.preRealism=true;
      this.battle??=null;this.rebound??=null;this.modelVersion=2;this.partialRealism=true;this.realismStartedAt=this.time;
    }
    playerEvent(a,key,amount=1){if(a?.player){a.player.matchMetrics??={};a.player.matchMetrics[key]=(a.player.matchMetrics[key]||0)+amount;}}
    pressureAt(a){return clamp(1-Math.min(...this.skaters(1-a.side).map(b=>distance(a,b)))/3,0,1);}
    readDelay(a){
      const reading=this.attribute(a,'decisions')*.4+this.attribute(a,'vision')*.25+this.attribute(a,'puckControl')*.35;
      return clamp(1.18-reading*.043+this.pressureAt(a)*(20-this.attribute(a,'composure'))*.018,.28,1.35);
    }
    goalieTarget(side,puck=this.puck){
      const goalie=this.actors.find(a=>a.side===side&&a.role==='G');
      const x=progress(side,puck.x)-3.5,y=puck.y-15,d=Math.hypot(x,y);
      // Square to the shooting angle. Skill limits tracking error; movement must get there.
      const read=this.attribute(goalie,'positioning')*.7+this.attribute(goalie,'composure')*.3;
      const error=(20-read)*.022*Math.sin(this.time*.8+side*2);
      const depth=clamp(1.25+d*.035,1.35,2.05);
      return point(side,3.5+Math.max(.35,x/Math.max(1,d)*depth),15+clamp(y/Math.max(1,d)*depth+error,-1.2,1.2));
    }
    rememberTouch(id,name,y){
      this.lastTouches=this.lastTouches.filter(t=>t.id!==id);
      this.lastTouches.push({id,name,y,time:this.time});this.lastTouches=this.lastTouches.slice(-2);
    }
    battleChance(defender,carrier){
      const attack=this.attribute(defender,'checking')*.5+this.attribute(defender,'strength')*.25+this.attribute(defender,'workRate')*.25;
      const shield=this.attribute(carrier,'puckControl')*.5+this.attribute(carrier,'strength')*.3+this.attribute(carrier,'decisions')*.2;
      return clamp(.24+(attack-shield)*.018,.08,.48);
    }
    battleStrength(a){return this.attribute(a,'strength')*.35+this.attribute(a,'checking')*.2+this.attribute(a,'puckControl')*.25+this.attribute(a,'workRate')*.2;}
    startBattle(a,b){
      if(!a||!b||a.side===b.side||distance(a,b)>2.3)return false;
      const boards=this.puck.y<4||this.puck.y>26||this.puck.x<3||this.puck.x>57;
      this.battle={a:a.id,b:b.id,remaining:.55+this.random()*.65,spot:{...this.puck},boards};
      this.carrier=null;this.flight=null;this.setPhase('battle');
      this.stats[a.side].battles++;this.stats[b.side].battles++;
      if(Math.hypot(a.vx-b.vx,a.vy-b.vy)>1.8&&this.random()<this.attribute(b,'checking')/40){this.stats[b.side].hits++;this.playerEvent(b,'hits');this.battle.hit=b.id;}
      this.say('battle',a.player.name+' och '+b.player.name.split(' ').at(-1)+(boards?' kämpar längs sargen.':' kämpar om pucken.'),a.side);
      return true;
    }
    resolveBattle(dt){
      const battle=this.battle;if(!battle)return;
      battle.remaining-=dt;if(battle.remaining>0)return;
      const a=this.actor(battle.a),b=this.actor(battle.b);this.battle=null;
      if(!a||!b){this.setPhase('loose');this.looseTime=0;return;}
      const chance=clamp(.5+(this.battleStrength(a)-this.battleStrength(b))*.027,.15,.85);
      const winner=this.random()<chance?a:b;
      this.stats[winner.side].battleWins++;this.playerEvent(winner,'battleWins');this.playerEvent(winner===a?b:a,'battleLosses');a.contactUntil=b.contactUntil=this.time+2.5;
      this.takePossession(winner,{turnover:winner.side!==this.owner});
      this.say('battle-win',winner.player.name+(battle.boards?' skyddar pucken och vinner sargduellen.':' får kontroll efter närkampen.'),winner.side,true);
    }
    unit(side,line=this.teams[side].line,pair=this.teams[side].pair){
      const t=this.teams[side],forwardCount=Math.min(4,Math.floor(t.forwards.length/3)),pairCount=Math.min(3,Math.floor(t.defense.length/2));
      const f=t.forwards.slice((line%forwardCount)*3,(line%forwardCount)*3+3);
      const c=[...f].sort((a,b)=>rating(b,['faceoffs'])-rating(a,['faceoffs']))[0];
      const wings=f.filter(p=>p.id!==c.id);
      const rows=[{role:'LW',player:wings[0]},{role:'C',player:c},{role:'RW',player:wings[1]},...t.defense.slice((pair%pairCount)*2,(pair%pairCount)*2+2).map((player,i)=>({role:i?'RD':'LD',player}))];
      return this.isShortHanded(side)?rows.filter(p=>p.role!=='C'):rows;
    }
    makeActor(side,row,where){return {id:side+':'+row.player.id,side,role:row.role,player:row.player,...where,vx:0,vy:0,shift:0,target:{...where},duty:ROLE_NAMES[row.role],status:'playing'};}
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
      if(this.delayedOffside===a.side&&this.skaters(a.side).some(b=>progress(a.side,b.x)>40.1)){this.stop('offside','Fördröjd offside: anfallaren spelar pucken innan laget hunnit ut.',point(a.side,37,9));return;}
      this.delayedOffside=null;this.icingCandidate=null;this.puckVelocity=null;this.rimPath=null;
      this.owner=a.side;this.carrier=a.id;this.flight=null;this.puck={x:a.x,y:a.y};
      this.decision=this.readDelay(a)+this.random()*.15;
      a.controlledAt=this.time;
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
      this.restartSide=null;this.icingHold=null;this.stats[win].faceoffs++;this.takePossession(centers[win]);
      this.say('faceoff',centers[win].player.name+' vinner tekningen.',win);
    }
    stop(reason,text,spot={x:30,y:15}){
      if(reason!=='icing')this.icingHold=null;
      this.carrier=null;this.flight=null;this.battle=null;this.rebound=null;this.puckVelocity=null;this.rimPath=null;this.icingCandidate=null;this.delayedOffside=null;this.lastTouches=[];this.restartSpot={...spot};this.stoppage=reason==='goal'?4:2.3;
      this.setPhase('stoppage');this.say(reason,text,this.owner,true);this.pendingFaceoff=true;
    }
    requestChange(side=0){
      const t=this.teams[side];if(this.finished||t.requested||t.changeQueue.length||t.change)return false;
      t.requested=true;this.say('bench',t.name+' begär nästa femma. Vi inväntar ett säkert byte.',side);return true;
    }
    nextUnit(side){const t=this.teams[side];t.line=(t.line+1)%Math.min(4,Math.floor(t.forwards.length/3));t.pair=(t.pair+1)%Math.min(3,Math.floor(t.defense.length/2));}
    changeAtStoppage(){for(const side of [0,1]){const t=this.teams[side];if(this.icingHold===side)continue;if(t.requested||t.shift>32||t.change||t.changeQueue.length){if(!t.changeQueue.length&&!t.change)this.nextUnit(side);this.installUnit(side);}}}
    safeToChange(side){
      // A controlled dump or PK clearance creates a real window for a short change.
      if(this.flight?.side===side&&['dump','clear'].includes(this.flight.kind)&&progress(side,this.puck.x)>40)return true;
      if(this.owner!==side||!this.carrier||this.phase==='counter'||this.phase==='loose')return false;
      const puckCarrier=this.actor(this.carrier);
      return progress(side,this.puck.x)>39&&this.skaters(1-side).every(a=>distance(a,puckCarrier)>2.4);
    }
    updateChanges(dt){
      for(const side of [0,1]){
        const t=this.teams[side];
        const overdue=this.skaters(side).some(a=>this.shiftTime(a)>Math.max(60,(t.shiftLimit||43)*1.4));
        if((t.shift>43||overdue)&&!t.requested&&!t.change&&!t.changeQueue.length)t.requested=true;
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
          }else if(c.stage==='in'&&a&&(distance(a,{x:c.gate,y:.7})>3||distance(a,a.target)<2)){
            // The next player can change once this replacement has cleared the gate.
            // Waiting for a moving tactical target could keep the whole queue stuck.
            a.status='playing';t.change=null;if(!t.changeQueue.length)t.shift=0;
          }
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
      const t=this.teams[side],carrier=this.actor(this.carrier),p=progress(side,this.puck.x),pp=this.hasPowerPlay(side);
      const slots=pp?(t.tactics.pp==='131'?{LD:[42,15],LW:[48,5.5],RW:[49,15],RD:[48,24.5],C:[54,15]}:{LD:[42,15],LW:[44,6],RD:[44,24],C:[53,12],RW:[53,19]}):{LW:[49,5.5],C:[53,15],RW:[49,24.5],LD:[42,8],RD:[42,22]};
      for(const a of this.skaters(side)){
        let x,y,duty;
        if(this.phase==='attack'){
          [x,y]=slots[a.role]||[51,21];y+=Math.sin(this.time*.28+ROLES.indexOf(a.role))*.8;
          duty=pp?({LD:'Spelar på blålinjen',LW:'Vänsterflank',RW:'Spelbar i slottet',RD:'Högerflank',C:'Skymmer framför mål'}[a.role]):a.role.endsWith('D')?'Säkrar bakom anfallet':a.role==='C'?'Söker ytan framför mål':'Breddar anfallet';
          if(a===carrier){x=Math.min(x,54);duty='Söker passning eller avslut';}
          else if(!pp&&!a.role.endsWith('D')&&carrier&&p>46){
            const weak=a.role===(carrier.y<15?'RW':'LW');
            const timing=(this.attribute(a,'positioning')+this.attribute(a,'decisions'))/40;
            if(weak){x=50+timing*3;y=carrier.y<15?21:9;duty='Söker bortre stolpen och en direktpassning';}
            else if(a.role==='C'){x=53+timing;y=15+(carrier.y<15?1:-1);duty='Skymmer och förbereder sig för returen';}
          }
        }else{
          const isBack=a.role.endsWith('D'),index=ROLES.indexOf(a.role);
          y=isBack?(a.role==='LD'?8:22):([6,15,24][index]??20);
          x=isBack?clamp(p-9,9,32):clamp(p+(a===carrier?7:a.role==='C'?3:5),15,47);
          if(a===carrier){x=Math.min(49,p+(t.tactics.mentality==='direct'?12:8));y=clamp(a.y,6,24);}
          else if(p<40&&x>=37.5)x=37.5; // brake before the blue line, leaving room for momentum
          duty=isBack?'Säkrar bakom pucken':a===carrier?'Driver uppspelet':p<40?'Gör sig spelbar utan offside':'Följer med i anfallet';
        }
        if(a.id!==this.carrier&&(p<=40||this.delayedOffside===side)&&progress(side,a.x)>39)x=36.5;
        if(a.id===this.carrier&&p<=40&&this.skaters(side).some(b=>b.id!==a.id&&progress(side,b.x)>40.1)){x=Math.min(x,37.5);duty='Inväntar att medspelarna lämnar anfallszonen';}
        this.assign(a,point(side,x,y),duty);
      }
      if(!carrier&&this.flight?.kind==='pass'){const receiver=this.actor(this.flight.to);if(receiver)this.assign(receiver,this.flight.end,'Möter passningen');}
    }
    defenseTargets(side){
      const attackers=this.skaters(1-side),defenders=this.skaters(side),carrier=this.actor(this.carrier),pk=this.isShortHanded(side);
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
        const gap=hasPuck?1.65-this.attribute(a,'positioning')*.035:2.55-this.attribute(a,'positioning')*.035;
        const anticipate=this.attribute(a,'decisions')*.017;
        let x=clamp(at-gap,6,47),y=threat.y+(15-threat.y)*(hasPuck?.04:.14)+clamp(threat.vy*anticipate,-.7,.7);
        // Backward skating keeps defenders between the rush and their own goal.
        if(enemyProgress<28&&a.role.endsWith('D'))x=Math.min(x,30);
        this.assign(a,point(side,x,y),hasPuck?'Styr puckföraren mot utsidan':'Täcker '+threat.player.name.split(' ').at(-1));
      }
      for(const a of available)this.assign(a,point(side,10,a.role==='LD'?11:19),'Skyddar slottet');
    }
    targets(){
      this.attackTargets(this.owner);this.defenseTargets(1-this.owner);
      if(!this.carrier&&!this.flight&&!this.battle){
        // One pursuer per side; the other eight skaters continue supporting and covering.
        for(const side of [0,1]){const nearest=[...this.skaters(side)].filter(a=>a.status!=='leaving').sort((a,b)=>distance(a,this.puck)-distance(b,this.puck))[0];if(nearest)this.assign(nearest,this.puck,'Jagar den lösa pucken');}
      }
      for(const a of this.actors){
        if(a.role==='G'){
          this.assign(a,this.goalieTarget(a.side,this.flight?.kind==='shot'?this.flight.start:this.puck),'Följer pucken, sätter fötterna och täcker vinkeln');
        }
        if(this.battle&&(a.id===this.battle.a||a.id===this.battle.b))this.assign(a,{x:this.battle.spot.x+(a.side===0?-.35:.35),y:this.battle.spot.y},'Skyddar pucken och arbetar i närkampen');
        if(a.status==='leaving')this.assign(a,{x:this.teams[a.side].change.gate,y:.7},'Går till bänken');
      }
    }
    move(dt){
      for(const a of this.actors){
        const dx=a.target.x-a.x,dy=a.target.y-a.y,d=Math.hypot(dx,dy);
        let top=a.role==='G'?2.2+this.attribute(a,'movement')*.09:3.1+this.attribute(a,'skating')*.09;
        if(a.role!=='G'&&a.side!==this.owner)top*=.9+this.attribute(a,'workRate')*.008;
        if(a.id===this.carrier)top*=.86;
        const accel=2.7+this.attribute(a,a.role==='G'?'movement':'acceleration')*.085;
        let speed=Math.min(top,Math.sqrt(2*accel*d));
        // Brake based on stopping distance before the puck enters, instead of
        // skating to an attacking target and correcting after the blue line.
        if(a.side===this.owner&&a.id!==this.carrier&&a.role!=='G'&&progress(a.side,this.puck.x)<=40&&progress(a.side,a.x)<40){
          const room=Math.max(0,39.2-progress(a.side,a.x));
          if(progress(a.side,a.target.x)>progress(a.side,a.x))speed=Math.min(speed,Math.sqrt(2*accel*room));
        }
        let vx=d>.03?dx/d*speed:0,vy=d>.03?dy/d*speed:0;
        for(const b of this.actors){if(a.id===b.id)continue;const gap=distance(a,b);if(gap>.02&&gap<1.1){vx+=(a.x-b.x)/gap*(1.1-gap)*1.6;vy+=(a.y-b.y)/gap*(1.1-gap)*1.6;}}
        const change=Math.hypot(vx-a.vx,vy-a.vy),blend=change?Math.min(1,accel*dt/change):1;
        a.vx+=(vx-a.vx)*blend;a.vy+=(vy-a.vy)*blend;
        a.x=clamp(a.x+a.vx*dt,1,59);a.y=clamp(a.y+a.vy*dt,.6,29.4);
      }
      const carrier=this.actor(this.carrier);if(carrier)this.puck={x:carrier.x,y:carrier.y};
    }
    laneRisk(a,b){return this.skaters(1-a.side).reduce((risk,d)=>{const lane=segmentDistance(d,a,b),reading=this.attribute(d,'positioning')*.65+this.attribute(d,'decisions')*.35;return lane.t>.1&&lane.t<.94?Math.max(risk,clamp(1-lane.d/1.9,0,1)*(reading/20)):risk;},0);}
    passChance(a,b){
      const pressure=this.pressureAt(a),calm=this.attribute(a,'composure')/20;
      return clamp(.68+this.attribute(a,'passing')*.009+this.attribute(b,'puckControl')*.005-this.laneRisk(a,b)*.45-distance(a,b)*.0035-pressure*(.2-calm*.12),.15,.97);
    }
    passingOptions(a){
      const p=progress(a.side,a.x),pp=this.hasPowerPlay(a.side);
      return this.skaters(a.side).filter(b=>b.id!==a.id&&!['leaving','entering'].includes(b.status)&&distance(a,b)>3).map(b=>{
        const free=1-this.pressureAt(b),forward=progress(a.side,b.x)-p;
        let score=this.passChance(a,b)+free*.19+this.shotQuality(b)*1.8+(pp?Math.abs(b.y-a.y)/90:clamp(forward/65,-.18,.2));
        if(this.lastTouches.at(-1)?.id===b.id)score-=.07;
        if(p<30&&forward<0)score-=.2;
        if(p>=40&&progress(a.side,b.x)<40)score-=.65;
        if(p>=32&&p<40&&forward<-4)score-=.32;
        if(p<40&&progress(a.side,b.x)>40)score-=1;
        return {b,score};
      });
    }
    choosePass(a){
      const uncertainty=(21-this.attribute(a,'vision'))*.013+(21-this.attribute(a,'decisions'))*.012;
      // Better readers recognize valuable lanes more consistently; the pass can still fail.
      return this.passingOptions(a).map(row=>({...row,seen:row.score+(this.random()-.5)*uncertainty*2})).sort((x,y)=>y.seen-x.seen)[0];
    }
    shotContext(a){
      const goal=point(a.side,56.5,15),d=distance(a,goal),forward=56.5-progress(a.side,a.x);
      const angle=Math.atan2(Math.abs(a.y-15),Math.max(.1,forward));
      const last=a.receivedPass,oneTimer=Boolean(last&&this.time-last.time<.85&&Math.abs(last.y-a.y)>5);
      const rebound=Boolean(this.rebound&&this.rebound.side===a.side&&this.time-this.rebound.time<3);
      const screen=this.actors.filter(b=>b.role!=='G'&&b.id!==a.id).reduce((sum,b)=>{
        const lane=segmentDistance(b,a,goal);
        return sum+(lane.t>.5&&lane.t<.98&&distance(b,goal)<9?clamp(1-lane.d/.95,0,1)*(b.side===a.side?1:.55):0);
      },0);
      return {d,angle,pressure:this.pressureAt(a),screen:clamp(screen,0,1),oneTimer,rebound,behind:forward<=0,
        type:rebound?'Retur':oneTimer?'Direktskott':d>16?'Slagskott':d<5?'Näravslut':'Handledsskott'};
    }
    shotModel(a,context=this.shotContext(a)){
      const c=context,keeper=this.actors.find(b=>b.side!==a.side&&b.role==='G');
      const shooting=this.attribute(a,'shooting'),control=this.attribute(a,'puckControl'),calm=this.attribute(a,'composure');
      const onTarget=clamp(.53+shooting*.012+control*.004-c.pressure*(.2-calm*.006)-c.angle*.065-(c.oneTimer?.035:0),.28,.9);
      const goal=point(a.side,56.5,15);
      const block=this.skaters(1-a.side).reduce((risk,b)=>{
        const lane=segmentDistance(b,a,goal),commit=this.attribute(b,'positioning')*.6+this.attribute(b,'workRate')*.4;
        return lane.t>0&&lane.t<.96&&distance(a,b)>.4?Math.max(risk,clamp(1-lane.d/1.35,0,1)*(.14+commit*.014)):risk;
      },0);
      if(c.behind)return {goalChance:0,onTarget,block,quality:0,alignment:0};
      if(!keeper)return {goalChance:1,onTarget:clamp(onTarget-c.d*.0025,.25,.9),block,quality:(1-block)*clamp(onTarget-c.d*.0025,.25,.9),alignment:1};
      const desired=this.goalieTarget(keeper.side,a),alignment=clamp(distance(keeper,desired)/2.5,0,1);
      const reflex=this.attribute(keeper,'reflexes'),position=this.attribute(keeper,'positioning'),composure=this.attribute(keeper,'composure');
      const saving=reflex*(c.d<10?.5:.3)+position*(c.d<10?.3:.5)+composure*.2;
      const location=(.027+.23*Math.exp(-c.d/9))*(.16+.84*Math.cos(c.angle)**2);
      const finish=(.63+shooting*.035)*(1-c.pressure*(.30-calm*.011));
      const goalChance=clamp(location*finish*(1.65-saving*.049)+alignment*.12+c.screen*(.032+(20-composure)*.0013)+(c.oneTimer?.018:0)+(c.rebound?.035:0),.003,.65);
      return {goalChance,onTarget,block,quality:(1-block)*onTarget*goalChance,alignment};
    }
    shotQuality(a){return this.shotModel(a).quality;}
    pass(a,b){
      const end={x:b.x+b.vx*.25,y:b.y+b.vy*.25};end.x=clamp(end.x,1,59);end.y=clamp(end.y,1,29);
      if(progress(a.side,a.x)<40&&progress(a.side,end.x)>40&&this.skaters(a.side).some(p=>p.id!==a.id&&progress(a.side,p.x)>40.3))return false;
      const chance=this.passChance(a,b),success=this.random()<chance;
      this.stats[a.side].passAttempts++;this.playerEvent(a,'passAttempts');
      const interceptors=this.skaters(1-a.side).map(d=>({actor:d,...segmentDistance(d,a,end)})).filter(row=>row.t>.12&&row.t<.92&&row.d<2.1).sort((x,y)=>x.t-y.t);
      // A failed pass meets the actual defender along its lane, not the intended receiver.
      const interceptor=!success?interceptors[0]:null;
      if(interceptor){end.x=interceptor.actor.x;end.y=interceptor.actor.y;}
      else if(!success){end.x=clamp(end.x+(this.random()-.5)*6,1,59);end.y=clamp(end.y+(this.random()-.5)*6,1,29);}
      this.flight={kind:interceptor?'intercept':'pass',from:a.id,fromName:a.player.name,to:interceptor?interceptor.actor.id:b.id,start:{...this.puck},end,elapsed:0,duration:Math.max(.24,distance(a,end)/(15+this.attribute(a,'passing')*.22)),chance,success,side:a.side};
      this.carrier=null;this.decision=1.2;
      this.say('pass',a.player.name+' söker '+b.player.name.split(' ').at(-1)+'.',a.side);return true;
    }
    shoot(a){
      const context=this.shotContext(a);if(context.behind)return false;
      const model=this.shotModel(a,context),goal=point(a.side,56.5,15);
      const blockRoll=this.random(),targetRoll=this.random(),finishRoll=this.random();
      let outcome=blockRoll<model.block?'block':targetRoll>model.onTarget?'wide':null;
      let end={...goal};
      if(outcome==='wide')end.y=15+(a.y<15?-1:1)*(2.3+this.random()*2);
      let blocker=null;
      if(outcome==='block'){
        blocker=this.skaters(1-a.side).filter(b=>{const lane=segmentDistance(b,a,goal);return lane.t>0&&lane.t<.96&&lane.d<1.35&&distance(a,b)>.4;}).sort((b,c)=>segmentDistance(b,a,goal).t-segmentDistance(c,a,goal).t)[0];
        if(blocker)end={x:blocker.x,y:blocker.y};else outcome=null;
      }
      const shot={time:this.time,side:a.side,player:a.player.name,playerId:a.id,role:a.role,x:a.x,y:a.y,quality:model.quality,outcome,context,finishRoll,blockChance:model.block,onTargetChance:model.onTarget,liveResolution:true,blockerId:blocker?.id||null,assists:this.lastTouches.filter(t=>t.id!==a.id&&this.time-t.time<10).slice(-2).reverse()};
      const velocity=context.type==='Slagskott'?28+this.attribute(a,'strength')*.2:23+this.attribute(a,'shooting')*.22;
      this.flight={kind:'shot',start:{...this.puck},end,elapsed:0,duration:Math.max(.18,distance(a,end)/velocity),shot,side:a.side};this.carrier=null;this.focusUntil=this.wall+4;
      const reason=context.oneTimer?' möter sidledspassningen med ett direktskott!':context.rebound?' hugger på returen!':context.screen>.3?' skjuter genom trafiken framför mål!':context.pressure>.5?' avslutar under hård press!':context.d<8?' avslutar från slottet!':' skjuter'+(context.angle>.65?' ur snäv vinkel!':' från distans!');
      this.say('shot',a.player.name+reason,a.side,true);return true;
    }
    clear(a){
      const chance=clamp(.77+this.attribute(a,'passing')*.006+this.attribute(a,'composure')*.003-this.pressureAt(a)*.22,.5,.98);
      const success=this.random()<chance,end=point(a.side,success?59:clamp(progress(a.side,a.x)+8,22,38),a.y<15?4:26);
      if(success)this.stats[a.side].clears++;
      this.icingCandidate=success&&progress(a.side,a.x)<30&&!this.isShortHanded(a.side)?{side:a.side}:null;
      this.flight={kind:'clear',side:a.side,start:{...this.puck},end,elapsed:0,duration:Math.max(.3,distance(a,end)/18)};
      this.carrier=null;this.lastTouches=[];this.setPhase('clear');
      this.say('clear',a.player.name+(success?' rensar ur zonen. Boxplayenheten får andrum.':' pressas och får inte ut pucken ur zonen.'),a.side,true);
      this.advice=success?(a.side===0?'Bra rensning. Vi kan samla boxen och få ner belastningen.':'De rensar. Hämta pucken och bygg upp powerplayet igen.'):'Pucken är kvar i zonen. Boxplaylaget behöver behålla sin täckning.';
    }
    dump(a){
      // A dump lets early forwards tag up while the puck keeps travelling.
      if(progress(a.side,a.x)<30)return false;
      if(this.skaters(a.side).some(b=>b.id!==a.id&&progress(a.side,b.x)>40))this.delayedOffside=a.side;
      const end=point(a.side,59,a.y<15?2:28);this.stats[a.side].dumps++;
      this.flight={kind:'dump',side:a.side,start:{...this.puck},end,elapsed:0,duration:distance(a,end)/19};
      this.carrier=null;this.lastTouches=[];this.setPhase('dump');
      this.say('dump',a.player.name+' lägger pucken bakom backarna. Närmaste forward jagar; övriga säkrar.',a.side,true);return true;
    }
    reboundModel(goalie,context={}){
      const pressure=(context.screen||0)*.1+(context.oneTimer?.08:0)+(context.d<7?.08:0);
      const freeze=clamp(.38+this.attribute(goalie,'handling')*.012+this.attribute(goalie,'reboundControl')*.006+this.attribute(goalie,'composure')*.003-pressure,.3,.87);
      const safe=clamp(.24+this.attribute(goalie,'reboundControl')*.027-this.pressureAt(goalie)*.1,.22,.85);
      return {freeze,safe};
    }
    saveRebound(goalie,f){
      const model=this.reboundModel(goalie,f.shot.context),name=goalie?.player.name||'Målvakten';
      if(this.random()<model.freeze){
        this.stop('save',name+' räddar och håller fast pucken.',point(f.side,47,f.start.y<15?9:21));return;
      }
      const safe=this.random()<model.safe;
      const end=point(f.side,safe?54+this.random()*3:51+this.random()*3,safe?(f.start.y<15?4+this.random()*3:23+this.random()*3):12+this.random()*6);
      this.rebound={side:f.side,time:this.time};
      if(!safe)this.stats[1-f.side].dangerousRebounds++;
      // A rebound travels out from the save. It does not appear magically in the slot.
      this.flight={kind:'rebound',side:f.side,start:{...this.puck},end,elapsed:0,duration:Math.max(.3,distance(this.puck,end)/10)};
      this.setPhase('loose');this.looseTime=0;
      this.rememberTouch(f.shot.playerId,f.shot.player,f.start.y);
      this.say('rebound',name+(safe?' styr returen ut mot sargen.':' lämnar en lös retur i slottet!'),f.side,true);
    }
    resolveFlight(dt){
      const f=this.flight;if(!f)return;
      const before={...this.puck};
      f.elapsed+=dt;const fraction=Math.min(1,f.elapsed/f.duration);
      this.puck={x:f.start.x+(f.end.x-f.start.x)*fraction,y:f.start.y+(f.end.y-f.start.y)*fraction};
      if(this.checkIcing(before))return;
      if(['clear','dump'].includes(f.kind)){
        const touching=this.skaters(1-f.side).find(a=>distance(a,this.puck)<.8);
        if(touching){this.takePossession(touching,{turnover:true});return;}
      }
      if(fraction<1)return;
      this.flight=null;
      if(f.kind==='intercept'){
        const defender=this.actor(f.to);
        if(defender&&distance(defender,this.puck)<2.4)this.takePossession(defender,{turnover:true});
        else{this.setPhase('loose');this.lastTouches=[];this.looseTime=0;this.say('loose','Passningen bryts och pucken blir lös.',f.side);}
      }else if(f.kind==='pass'){
        const from=this.actor(f.from),to=this.actor(f.to);
        if(to&&distance(to,this.puck)<2.4&&f.success){
          const previous=this.phase;this.takePossession(to);if(previous==='attack'&&progress(to.side,to.x)>40){this.phase='attack';this.attackPasses++;}
          this.stats[f.side].passes++;this.playerEvent(from,'passes');
          if(f.preRealism)this.stats[f.side].priorPasses++;
          this.rememberTouch(f.from,from?.player.name||f.fromName||'',f.start.y);
          to.receivedPass={time:this.time,y:f.start.y};
          this.say('pass',to.player.name+' tar emot passningen.',f.side);
        }else{this.setPhase('loose');this.lastTouches=[];this.looseTime=0;this.say('loose','Passningen bryts. Båda lagen söker pucken.',f.side);}
      }else if(f.kind==='shot'){
        const shot=f.shot;
        if(shot.liveResolution&&shot.outcome===null){
          const player=this.teams[f.side].players.find(p=>f.side+':'+p.id===shot.playerId);
          const shooter={side:f.side,id:shot.playerId,role:shot.role||this.actor(shot.playerId)?.role,player,x:shot.x,y:shot.y};
          const model=this.shotModel(shooter,shot.context);
          shot.quality=(1-shot.blockChance)*shot.onTargetChance*model.goalChance;shot.outcome=shot.finishRoll<model.goalChance?'goal':'save';shot.alignment=model.alignment;
        }
        this.shots.push(shot);this.stats[f.side].attempts++;
        const shooter=this.teams[f.side].players.find(p=>f.side+':'+p.id===shot.playerId);this.playerEvent({player:shooter},'xG',shot.quality);
        if(shot.blockerId)this.playerEvent(this.actor(shot.blockerId),'blocks');
        if(['goal','save'].includes(shot.outcome))this.playerEvent(this.actors.find(a=>a.side!==f.side&&a.role==='G'),'xGA',shot.quality/Math.max(.05,(1-(shot.blockChance||0))*(shot.onTargetChance||1)));
        if(shot.context?.oneTimer)this.stats[f.side].oneTimers++;
        if(shot.outcome==='block')this.stats[1-f.side].blocks++;
        if(['goal','save'].includes(shot.outcome))this.stats[f.side].shots++;
        if(shot.outcome==='goal'){
          this.score[f.side]++;this.goals.push(shot);
          this.goalPenalty(f.side);
          this.stop('goal','MÅL! '+shot.player+' gör '+this.score.join('–')+'.');
        }else if(shot.outcome==='save'){
          this.stats[1-f.side].saves++;
          const goalie=this.actors.find(a=>a.side!==f.side&&a.role==='G');
          this.saveRebound(goalie,f);
        }else{
          this.puck={...f.end};this.glideFrom(f,shot.outcome==='block'?.22:.72);
          this.setPhase('loose');this.looseTime=0;this.say(shot.outcome,shot.player+(shot.outcome==='block'?' får skottet blockerat.':' skjuter utanför. Pucken går bakom mål.'),f.side,true);
        }
        this.pendingReplayShot=shot;this.lastShot=shot;
      }else{this.setPhase('loose');this.looseTime=0;this.glideFrom(f,.85);
        if(f.kind==='dump'||f.kind==='clear'&&progress(f.side,this.puck.x)>56){
          const low=this.puck.y<15;this.rimPath=[point(f.side,59,low?7:23),point(f.side,59,low?23:7),point(f.side,57,low?28.8:1.2),point(f.side,48,low?29:1)];
        }
      }
      if(!this.carrier&&!this.flight&&!this.stoppage&&!this.puckVelocity)this.glideFrom(f,.55);
    }
    glideFrom(f,factor=1){
      this.puckVelocity={x:(f.end.x-f.start.x)/Math.max(.1,f.duration)*factor,y:(f.end.y-f.start.y)/Math.max(.1,f.duration)*factor};
    }
    checkIcing(before){
      const c=this.icingCandidate;if(!c)return false;
      if(progress(c.side,before.x)<56.5&&progress(c.side,this.puck.x)>=56.5){
        const race=this.skaters(c.side).some(a=>progress(c.side,a.x)>54&&distance(a,this.puck)<3);
        if(!race){this.icingHold=c.side;this.stop('icing','Icing. Pucken passerar förlängda mållinjen utan beröring. Inget byte för laget som rensade.',point(c.side,13,this.puck.y<15?9:21));return true;}
        this.icingCandidate=null;
      }return false;
    }
    moveFreePuck(dt){
      const v=this.puckVelocity;if(!v)return;const before={...this.puck};
      let speed=Math.hypot(v.x,v.y);
      if(this.rimPath?.length){const target=this.rimPath[0],d=distance(this.puck,target);if(d<Math.max(.3,speed*dt)){this.rimPath.shift();}else{v.x=(target.x-this.puck.x)/d*speed;v.y=(target.y-this.puck.y)/d*speed;}}
      this.puck.x+=v.x*dt;this.puck.y+=v.y*dt;
      if(this.checkIcing(before))return;
      if(this.puck.x<.35||this.puck.x>59.65){this.puck.x=clamp(this.puck.x,.35,59.65);v.x*=-.72;}
      if(this.puck.y<.35||this.puck.y>29.65){this.puck.y=clamp(this.puck.y,.35,29.65);v.y*=-.72;}
      const decay=Math.max(0,1-.45*dt/Math.max(.01,speed));v.x*=decay;v.y*=decay;
    }
    decide(){
      const a=this.actor(this.carrier);if(!a)return;
      const t=this.teams[a.side],p=progress(a.side,a.x),opponents=this.skaters(1-a.side),nearest=[...opponents].sort((b,c)=>distance(a,b)-distance(a,c))[0];
      const pk=this.isShortHanded(a.side),pp=this.hasPowerPlay(a.side);
      this.decision=this.readDelay(a)+.2+this.random()*.35;
      if(nearest&&distance(a,nearest)<2&&this.time>(a.contactUntil||0)){
        const reaching=distance(a,nearest)>1.5?1.35:1;
        const penaltyRisk=(.003+(20-this.attribute(nearest,'discipline'))*.0012)*reaching;
        if(this.canGivePenalty(nearest.side)&&this.random()<penaltyRisk){this.givePenalty(nearest.side,nearest.player.name);return;}
        if(this.random()<this.battleChance(nearest,a)&&this.startBattle(a,nearest))return;
      }
      if(pk&&p<32){
        const outlet=this.skaters(a.side).find(b=>b.id!==a.id&&progress(a.side,b.x)>p+8&&this.passChance(a,b)>.82&&opponents.every(d=>distance(d,b)>3));
        if(outlet&&!t.safeCounter&&this.random()<.12+this.attribute(a,'vision')*.009)this.pass(a,outlet);else this.clear(a);return;
      }
      const context=this.shotContext(a),quality=this.shotModel(a,context).quality,option=this.choosePass(a);
      const clearChance=p>47&&context.angle<.6&&context.pressure<.45;
      const instant=context.oneTimer||context.rebound||clearChance;
      // Established PP moves the box; a real rebound or open slot is never passed up
      // merely because an arbitrary number of passes has not been completed.
      const ready=!pp||instant||this.attackPasses>=2&&this.setupTime>1.2;
      if(p>41&&!context.behind&&ready&&(this.phaseTime>.4||instant)){
        const intent=t.tactics.mentality==='direct'?.63:t.tactics.mentality==='control'?.31:.44;
        const composure=this.attribute(a,'composure')/20;
        const urge=intent+quality*1.8+(instant?.3:0)-(context.angle>.9?.16:0);
        const betterPass=option&&option.score>1.2&&quality<.045;
        if(this.random()<clamp(urge-(betterPass?composure*.18:0),.07,.92)&&this.shoot(a))return;
      }
      if(p>=30&&p<40&&(this.delayedOffside===a.side||this.skaters(a.side).some(b=>b.id!==a.id&&progress(a.side,b.x)>40.1))&&this.dump(a))return;
      if(!pp&&p>=30&&p<40&&this.pressureAt(a)>.35&&(t.tactics.mentality==='direct'||!option||option.score<.9)&&this.random()<.45&&this.dump(a))return;
      if(option&&(this.phase==='attack'||this.pressureAt(a)>.3||this.random()<.35)&&this.pass(a,option.b))return;
      // A carrier with time and space can skate; carrying ability is resolved by
      // skating/acceleration, offside, defensive gaps and the next physical contest.
      a.duty=this.pressureAt(a)>.4?'Skyddar pucken och söker understöd':'Utnyttjar fri is med pucken';
    }
    isShortHanded(side){return this.penalty?.side===side;}
    hasPowerPlay(side){return Boolean(this.penalty&&this.penalty.side!==side);}
    canGivePenalty(){return !this.penalty;}
    tickPenalties(dt){if(this.penalty){this.penalty.remaining-=dt;if(this.penalty.remaining<=0)this.endPenalty();}}
    goalPenalty(side){if(this.hasPowerPlay(side))this.endPenalty(true);}
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
      this.upgrade();
      const dt=STEP;this.wall+=dt;this.tick++;
      if(this.stoppage>0){
        this.stoppage-=dt;
        if(this.pendingFaceoff&&this.stoppage<1.5){this.changeAtStoppage();this.faceoffPositions();this.puck={...this.restartSpot};this.pendingFaceoff=false;this.setPhase('faceoff');}
        if(this.stoppage<=0)this.faceoff();this.capture();return;
      }
      this.time=Math.min(this.duration,this.time+dt);this.phaseTime+=dt;
      if(this.time>=this.duration-1e-7){this.time=this.duration;this.finished=true;this.setPhase('finished');this.say('finished','Periodpaus. '+this.teams[0].name+' '+this.score.join('–')+' '+this.teams[1].name+'.',0,true);this.capture();return;}
      this.tickPenalties(dt);
      for(const t of this.teams){t.shift+=dt;for(const p of t.players){const a=this.actors.find(a=>a.player===p);if(a){a.shift=(a.shift||0)+dt;p.ice+=dt;if(a.role!=='G')p.energy=clamp(p.energy-dt*(.20+(Math.hypot(a.vx,a.vy)>3?.08:0))*(1.4-rating(p,['stamina'])/35),15,100);}else p.energy=clamp(p.energy+dt*.31,15,100);}}
      const puckBefore={...this.puck};
      if(this.delayedOffside!=null&&this.skaters(this.delayedOffside).every(a=>progress(this.delayedOffside,a.x)<=40))this.delayedOffside=null;
      this.updateChanges(dt);this.targets();this.move(dt);
      if(this.carrier&&progress(this.owner,puckBefore.x)<=40&&progress(this.owner,this.puck.x)>40&&this.skaters(this.owner).some(a=>a.id!==this.carrier&&progress(this.owner,a.x)>40.3)){
        this.stop('offside','En medspelare är inne före pucken. Offside och tekning i mittzonen.',point(this.owner,37,this.puck.y<15?9:21));this.capture();return;
      }
      if(this.battle)this.resolveBattle(dt);
      else if(this.flight)this.resolveFlight(dt);
      else if(!this.carrier){
        this.looseTime=(this.looseTime||0)+dt;this.moveFreePuck(dt);if(this.stoppage>0){this.capture();return;}
        const closest=[...this.skaters(0),...this.skaters(1)].filter(a=>a.status!=='leaving').sort((a,b)=>distance(a,this.puck)-distance(b,this.puck));
        const first=closest[0],rival=first&&closest.find(a=>a.side!==first.side);
        if(first&&distance(first,this.puck)<1.1){
          if(rival&&distance(rival,this.puck)<1.35&&this.time>(first.contactUntil||0)&&this.time>(rival.contactUntil||0))this.startBattle(first,rival);
          else this.takePossession(first,{turnover:first.side!==this.owner});
        }
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
