"use strict";
/* Shared hockey simulation. Fixed 0.1 s simulation; the view never rolls results.
 * Coordinates are metres on a 60 × 30 rink. Home attacks right. No career/storage access.
 * Phase transitions, player motion and puck flights share one authoritative event stream.
 */
const StudioHockey = (() => {
  const skating=typeof HockeyMotion!=='undefined'?HockeyMotion:typeof require==='function'?require('./match-broadcast-motion.js'):null;
  const STEP=.1, clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const progress=(side,x)=>side===0?x:60-x;
  const point=(side,x,y)=>({x:progress(side,x),y});
  // Height is metres above the ice (the puck's underside). Old saves without
  // vertical data keep their original flat flight. No additional random rolls.
  const GRAVITY=9.81,PUCK_RESTITUTION=.28;
  function puckVertical(initial,time){
    let z=Math.max(0,initial?.z||0),vz=initial?.vz||0,bounces=0,t=Math.max(0,time);
    for(let i=0;i<12;i++){
      if(z<1e-8&&Math.abs(vz)<.45)return {z:0,vz:0,bounces};
      const impact=(vz+Math.sqrt(vz*vz+2*GRAVITY*z))/GRAVITY;
      if(t<impact-1e-9)return {z:Math.max(0,z+vz*t-GRAVITY*t*t/2),vz:vz-GRAVITY*t,bounces};
      t=Math.max(0,t-impact);vz=Math.abs(vz-GRAVITY*impact)*PUCK_RESTITUTION;z=0;bounces++;
    }
    return {z:0,vz:0,bounces};
  }
  function flightVertical(f,time=f.elapsed){return puckVertical(f.vertical,time);}
  function keeperStyle(goalie,contact,origin){
    const height=contact.z||0,angle=Math.atan2(origin.y-goalie.y,origin.x-goalie.x);
    const lateral=-(contact.x-goalie.x)*Math.sin(angle)+(contact.y-goalie.y)*Math.cos(angle);
    if(height<.14&&Math.abs(lateral)<.4)return 'stick';
    if(height<.48)return 'butterfly';
    return lateral*(goalie.player.shoots==='R'?1:-1)>=0?'glove':'blocker';
  }
  const ROLES=['LW','C','RW','LD','RD','X'];
  const ROLE_NAMES={LW:'Vänsterforward',C:'Center',RW:'Högerforward',LD:'Vänsterback',RD:'Högerback',G:'Målvakt',X:'Extra forward'};
  const PHASES={faceoff:'Tekning',breakout:'Uppspel',entry:'Zoninträde',attack:'Etablerat anfall',counter:'Omställning',loose:'Lös puck',battle:'Kamp om pucken',dump:'Dump & jakt',clear:'Rensning',stoppage:'Avblåsning',finished:'Periodpaus'};
  // Shared penalty model. No career, presentation, storage or random access.
  const penaltyCount=rows=>Math.min(2,(rows||[]).filter(p=>p?.affectsStrength!==false).length);
  const activePenalties=(rows,side)=>rows.filter(p=>p.side===side&&p.affectsStrength!==false).slice(0,2);
  const strengthState=(rows,threeOnThree=false)=>{
    const counts=[0,1].map(side=>penaltyCount((rows||[]).filter(p=>p.side===side))),base=threeOnThree?3:5;
    if(threeOnThree){const diff=counts[1]-counts[0];return diff>0?[Math.min(5,base+diff),base]:diff<0?[base,Math.min(5,base-diff)]:[base,base];}
    return [Math.max(3,base-counts[0]),Math.max(3,base-counts[1])];
  };
  function penaltyOffender(match,side,reference){
    if(![0,1].includes(side)||match.finished)return null;
    const rows=match.skaters(side),id=reference&&typeof reference==='object'?reference.playerId:reference;
    const exact=rows.find(a=>String(a.player.id)===String(id));
    if(exact)return exact;
    // Compatibility for old callers only. Ambiguous names never select a player.
    if(reference&&typeof reference==='object')return null;
    const named=rows.filter(a=>a.player.name===reference);
    return named.length===1?named[0]:null;
  }
  function penaltyRecord(match,offender,type='minor',kind='tripping',label=kind){
    if(!offender||!['minor','major','misconduct'].includes(type))return null;
    const minutes=type==='major'?5:type==='misconduct'?10:2,sequence=(match.penaltySequence||0)+1;
    return {id:'penalty:'+sequence,version:1,sequence,side:offender.side,seconds:match.time,playerId:offender.player.id,name:offender.player.name,type,kind,label,minutes,remaining:minutes*60,affectsStrength:type!=='misconduct',releasable:type==='minor'};
  }
  const penaltyDetails=p=>({penaltyId:p.id,playerId:p.playerId,playerName:p.name,minutes:p.minutes,kind:p.kind,label:p.label,affectsStrength:p.affectsStrength,releasable:p.releasable});
  function segmentDistance(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,l=dx*dx+dy*dy,t=l?clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/l,0,1):0;return {d:distance(p,{x:a.x+dx*t,y:a.y+dy*t}),t};}
  const angleDelta=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
  // Same eight-metre corners as the visible rink. Project centres inward by
  // their physical radius, retaining the wall normal for a glancing contact.
  function rinkLimit(p,radius=.35){
    const x=clamp(p.x,radius,60-radius),y=clamp(p.y,radius,30-radius),cx=clamp(x,8,52),cy=clamp(y,8,22),dx=x-cx,dy=y-cy,d=Math.hypot(dx,dy),r=8-radius;
    let q={x,y};if(d>r)q={x:cx+dx*r/d,y:cy+dy*r/d};
    const nx=p.x-q.x,ny=p.y-q.y,n=Math.hypot(nx,ny);return {...q,nx:n?nx/n:0,ny:n?ny/n:0,hit:n>1e-8};
  }
  function netObstacle(a,b,radius=.35){
    if(Math.min(a.x,b.x)>3.5+radius&&Math.max(a.x,b.x)<56.5-radius)return null;
    for(const x of [3.5,56.5]){
      const back=x+(x<30?-1.25:1.25),lo=Math.min(x,back)-radius,hi=Math.max(x,back)+radius,bottom=14.08-radius,top=15.92+radius;
      // Slab intersection catches crossings, not just endpoints inside a net.
      let enter=0,leave=1,nx=0,ny=0;
      for(const [p,v,min,max,axis] of [[a.x,b.x-a.x,lo,hi,0],[a.y,b.y-a.y,bottom,top,1]]){
        if(Math.abs(v)<1e-9){if(p<min||p>max){leave=-1;break;}continue;}
        const t1=(min-p)/v,t2=(max-p)/v,t=Math.min(t1,t2);
        if(t>enter){enter=t;nx=axis?0:(v>0?-1:1);ny=axis?(v>0?-1:1):0;}leave=Math.min(leave,Math.max(t1,t2));
      }
      if(enter<=leave&&leave>=0&&enter<=1)return {x:clamp(a.x+(b.x-a.x)*Math.max(0,enter-.001),.35,59.65),y:a.y+(b.y-a.y)*Math.max(0,enter-.001),nx,ny,lo,hi,bottom,top};
    }return null;
  }
  function skateVelocity(v,desired,acceleration,edge,dt){
    const speed=Math.hypot(v.x,v.y),target=Math.hypot(desired.x,desired.y);
    if(speed<.12){const gain=Math.min(target,acceleration*dt);return {x:desired.x/Math.max(.001,target)*gain||0,y:desired.y/Math.max(.001,target)*gain||0};}
    const travel=Math.atan2(v.y,v.x),change=target>.03?angleDelta(travel,Math.atan2(desired.y,desired.x)):0;
    const rate=edge/Math.max(.65,speed),turn=clamp(change,-rate*dt,rate*dt);
    const aim=target*Math.max(0,Math.cos(change)),brake=acceleration*1.7,next=speed+clamp(aim-speed,-brake*dt,acceleration*dt);
    return {x:Math.cos(travel+turn)*Math.max(0,next)||0,y:Math.sin(travel+turn)*Math.max(0,next)||0};
  }
  // Earliest contact between two moving points. Sweeps prevent a fast puck
  // tunnelling through a player between the fixed 100 ms simulation ticks.
  function sweepContact(p,q,a,b,radius){
    const x=p.x-a.x,y=p.y-a.y,dx=q.x-p.x-b.x+a.x,dy=q.y-p.y-b.y+a.y;
    const c=x*x+y*y-radius*radius;if(c<=0)return 0;
    const aa=dx*dx+dy*dy,bb=2*(x*dx+y*dy),disc=bb*bb-4*aa*c;
    if(aa<1e-12||disc<0)return null;
    const t=(-bb-Math.sqrt(disc))/(2*aa);return t>=0&&t<=1?t:null;
  }
  function receptionModel({control,composure,pressure,speed,height=0}){
    const difficulty=Math.max(0,speed-12)*.009+pressure*.13+height*.12;
    const clean=clamp(.81+control*.007+composure*.003-difficulty,.35,.985);
    return {clean,bobble:clamp((1-clean)*.72,.01,.38)};
  }
  function goalFrameContact(p,q){
    const hits=[];
    for(const x of [3.5,56.5]){
      for(const y of [14.08,15.92]){
        const t=sweepContact(p,q,{x,y},{x,y},.088);if(t==null)continue;
        const z=(p.z||0)+((q.z||0)-(p.z||0))*t;if(z>1.25)continue;
        const dx=p.x+(q.x-p.x)*t-x,dy=p.y+(q.y-p.y)*t-y,n=Math.hypot(dx,dy)||1;
        hits.push({t,kind:'post',nx:dx/n,ny:dy/n,nz:0});
      }
      const t=sweepContact({x:p.x,y:(p.z||0)+.013},{x:q.x,y:(q.z||0)+.013},{x,y:1.22},{x,y:1.22},.066);
      if(t!=null){const y=p.y+(q.y-p.y)*t;if(y>=14.03&&y<=15.97){const dx=p.x+(q.x-p.x)*t-x,dz=(p.z||0)+((q.z||0)-(p.z||0))*t+.013-1.22,n=Math.hypot(dx,dz)||1;hits.push({t,kind:'bar',nx:dx/n,ny:0,nz:dz/n});}}
    }
    return hits.sort((a,b)=>a.t-b.t)[0]||null;
  }
  // Sweep against the same rounded boards drawn by the presentation. Normals
  // point back onto the ice so both airborne and loose pucks share the bounce.
  function rinkContact(p,q,radius=.12){
    const dx=q.x-p.x,dy=q.y-p.y,hits=[];
    const add=(t,nx,ny)=>{if(t>=-1e-8&&t<=1+1e-8&&dx*nx+dy*ny< -1e-9)hits.push({t:clamp(t,0,1),kind:'board',nx,ny,nz:0});};
    for(const [x,nx] of [[radius,1],[60-radius,-1]])if(Math.abs(dx)>1e-9){const t=(x-p.x)/dx,y=p.y+dy*t;if(y>=8&&y<=22)add(t,nx,0);}
    for(const [y,ny] of [[radius,1],[30-radius,-1]])if(Math.abs(dy)>1e-9){const t=(y-p.y)/dy,x=p.x+dx*t;if(x>=8&&x<=52)add(t,0,ny);}
    const aa=dx*dx+dy*dy,r=8-radius;
    if(aa>1e-12)for(const [cx,cy,sx,sy] of [[8,8,-1,-1],[52,8,1,-1],[52,22,1,1],[8,22,-1,1]]){
      const ox=p.x-cx,oy=p.y-cy,bb=2*(ox*dx+oy*dy),disc=bb*bb-4*aa*(ox*ox+oy*oy-r*r);if(disc<0)continue;
      const t=(-bb+Math.sqrt(disc))/(2*aa),x=p.x+dx*t-cx,y=p.y+dy*t-cy;
      if(x*sx>=-1e-8&&y*sy>=-1e-8)add(t,-x/r,-y/r);
    }
    return hits.sort((a,b)=>a.t-b.t)[0]||null;
  }
  // Open goal mouth, closed back/sides and sloping roof. The panels are
  // two-sided: a puck entering legally can still hit the back of the net.
  function netContact(p,q){
    if(Math.min(p.x,q.x)>3.6&&Math.max(p.x,q.x)<56.4)return null;
    const v={x:q.x-p.x,y:q.y-p.y,z:(q.z||0)-(p.z||0)},hits=[];
    const plane=(nx,ny,nz,d,contains)=>{
      const start=p.x*nx+p.y*ny+(p.z||0)*nz-d,speed=v.x*nx+v.y*ny+v.z*nz;
      const sign=start>=0?1:-1;if(sign*speed>=-1e-9)return;
      const t=Math.max(0,(sign*.04-start)/speed);if(t>1+1e-8)return;
      const at={x:p.x+v.x*t,y:p.y+v.y*t,z:(p.z||0)+v.z*t};
      if(contains(at))hits.push({t:clamp(t,0,1),kind:'net',nx:nx*sign,ny:ny*sign,nz:nz*sign});
    };
    for(const front of [3.5,56.5]){
      const back=front+(front<30?-1.25:1.25),lo=Math.min(front,back),hi=Math.max(front,back),slope=(.9-1.22)/(back-front),roof=x=>1.22+(x-front)*slope;
      plane(1,0,0,back,p=>p.y>=14.04&&p.y<=15.96&&p.z>=-.04&&p.z<=roof(back)+.04);
      for(const y of [14.08,15.92])plane(0,1,0,y,p=>p.x>=lo&&p.x<=hi&&p.z>=-.04&&p.z<=roof(p.x)+.04);
      const length=Math.hypot(slope,1);
      plane(-slope/length,0,1/length,(1.22-front*slope)/length,p=>p.x>=lo&&p.x<=hi&&p.y>=14.04&&p.y<=15.96);
    }
    return hits.sort((a,b)=>a.t-b.t)[0]||null;
  }
  function puckSurfaceContact(p,q){return [goalFrameContact(p,q),netContact(p,q),rinkContact(p,q)].filter(Boolean).sort((a,b)=>a.t-b.t)[0]||null;}
  function surfaceBounce(v,hit){
    const normal=Math.min(0,v.x*hit.nx+v.y*hit.ny+(v.z||0)*hit.nz),board=hit.kind==='board',net=hit.kind==='net',tangent=board?.9:net?.45:.65,restitution=board?.48:net?.08:.65;
    return {x:(v.x-normal*hit.nx)*tangent-normal*hit.nx*restitution,y:(v.y-normal*hit.ny)*tangent-normal*hit.ny*restitution,z:((v.z||0)-normal*hit.nz)*tangent-normal*hit.nz*restitution};
  }
  function contactBalance(match,a,b){
    const d=Math.max(.1,distance(a,b)),nx=(b.x-a.x)/d,ny=(b.y-a.y)/d;
    const drive=clamp(((a.vx||0)-(b.vx||0))*nx+((a.vy||0)-(b.vy||0))*ny,0,6);
    const heading=Math.atan2(a.vy||0,a.vx||0),brace=Math.abs(Math.cos(heading-Math.atan2(ny,nx)));
    const stability=match.attribute(a,'strength')*.55+match.attribute(a,'skating')*.45;
    return drive*.18+brace*stability*.025+(a.shieldUntil>match.time?.7:0);
  }
  function rating(p,keys){return keys.reduce((s,k)=>s+(p.attributes[k]||10),0)/keys.length;}
  // Shared finishing model. Callers provide measured or explicitly estimated context.
  // Pure calculation: no random draws, actor mutation or career state.
  function evaluateShot({shooter,keeper,context:c,block=0,alignment=0}){
    const shooting=shooter.shooting,control=shooter.puckControl,calm=shooter.composure;
    const onTarget=clamp(.53+shooting*.012+control*.004-c.pressure*(.2-calm*.006)-c.angle*.065-(c.oneTimer?.035:0),.28,.9);
      if(c.behind)return {goalChance:0,onTarget,block,quality:0,alignment:0};
      if(!keeper)return {goalChance:1,onTarget:clamp(onTarget-c.d*.0025,.25,.9),block,quality:(1-block)*clamp(onTarget-c.d*.0025,.25,.9),alignment:1};
      alignment=clamp(alignment,0,1);
      const reflex=keeper.reflexes,position=keeper.positioning,composure=keeper.composure;
      const saving=reflex*(c.d<10?.5:.3)+position*(c.d<10?.3:.5)+composure*.2;
      const location=(.027+.23*Math.exp(-c.d/9))*(.16+.84*Math.cos(c.angle)**2);
      const finish=(.63+shooting*.035)*(1-c.pressure*(.30-calm*.011));
      const goalChance=clamp(location*finish*(1.65-saving*.049)*(1+alignment*.6)+c.screen*(.032+(20-composure)*.0013)+(c.oneTimer?.018:0)+(c.lateralSpeed?clamp(c.lateralSpeed/25,0,1)*.022*(1-keeper.movement/30):0)+(c.rebound?.035:0),.003,.65);
      // Calibration belongs to the shared model, not a spatial-only wrapper.
      const calibrated=goalChance*.75;
      return {goalChance:calibrated,onTarget,block,quality:(1-block)*onTarget*calibrated,alignment};
  }
  // Shootouts use the same skill model and resolver in both match paths.
  // They are separate from ordinary shot/goal statistics.
  function shootoutChance(shooter,keeper){
    const skill=a=>a.shooting*.4+a.puckControl*.35+a.composure*.25;
    if(!keeper)return .95;
    const save=keeper.reflexes*.4+keeper.positioning*.25+keeper.movement*.2+keeper.composure*.15;
    return clamp(.30+(skill(shooter)-save)*.017,.06,.70);
  }
  function resolveShootout(teams,rand){
    const squads=teams.map(t=>t.shooters.slice().sort((a,b)=>shootoutChance(b.attributes,{reflexes:10,positioning:10,movement:10,composure:10})-shootoutChance(a.attributes,{reflexes:10,positioning:10,movement:10,composure:10})).slice(0,5));
    if(squads.some(s=>!s.length))throw new Error('Shootout requires a skater on each team');
    const score=[0,0],taken=[0,0],attempts=[];
    const chance=side=>shootoutChance(squads[side][taken[side]%squads[side].length].attributes,teams[1-side].keeper);
    const take=(side,forced=null)=>{const player=squads[side][taken[side]%squads[side].length],probability=chance(side),goal=forced??(rand()<probability);taken[side]++;if(goal)score[side]++;attempts.push({side,playerId:player.id,player:player.name,round:taken[side],probability,goal});};
    for(let round=0;round<5;round++)for(let side=0;side<2;side++){
      take(side);
      if(score[0]>score[1]+5-taken[1]||score[1]>score[0]+5-taken[0])return {winner:score[0]>score[1]?0:1,score,attempts};
    }
    let skippedTies=false;
    while(score[0]===score[1]){
      if(taken[0]>=105){
        // Condition on the next decisive pair after an extreme run of ties.
        // This preserves its win probability and also bounds pathological RNGs.
        const a=chance(0),b=chance(1),home=rand()<a*(1-b)/(a*(1-b)+b*(1-a));
        take(0,home);take(1,!home);skippedTies=true;
      }else{take(0);take(1);}
    }
    return {winner:score[0]>score[1]?0:1,score,attempts,skippedTies};
  }
  // Identical roll boundaries for spatial and estimated attempts. The spatial
  // keeper is evaluated again on arrival, so finishing remains a separate stage.
  function shotBlockChance(coverage,defender){return clamp(coverage,0,1)*(.14+(defender.positioning*.6+defender.workRate*.4)*.014);}
  function shotFlightOutcome(model,blockRoll,targetRoll){
    return blockRoll<model.block?'block':targetRoll>model.onTarget?'wide':null;
  }
  function finishShot(model,roll){return roll<model.goalChance?'goal':'save';}
  function shotTacticalBias(plan={}){
    const mentality=plan.mentality||(plan.style==='control'?'control':['pressure','counter'].includes(plan.style)?'direct':'balanced');
    return (mentality==='direct'?.07:mentality==='control'?-.025:0)+(plan.shotChoice==='shoot'?.09:plan.shotChoice==='patient'?-.055:0);
  }
  // Probability for a nearby pressure duel; geometry decides whether it occurs.
  function pressureWinChance(defender,carrier){
    const attack=defender.checking*.5+defender.strength*.25+defender.workRate*.25;
    const shield=carrier.puckControl*.5+carrier.strength*.3+carrier.decisions*.2;
    return clamp(.24+(attack-shield)*.018,.08,.48);
  }
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
    energyLevel(a){return a?.player.energy??100;}
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
      return clamp(1.18-reading*.043+this.pressureAt(a)*(20-this.attribute(a,'composure'))*.018+this.balanceLevel(a)*.3,.28,1.55);
    }
    goalieTarget(side,puck=this.puck){
      const goalie=this.actors.find(a=>a.side===side&&a.role==='G');
      const x=progress(side,puck.x)-3.5,y=puck.y-15,d=Math.hypot(x,y);
      // Square to the shooting angle. Skill limits tracking error; movement must get there.
      const read=this.attribute(goalie,'positioning')*.7+this.attribute(goalie,'composure')*.3;
      const error=(20-read)*.022*Math.sin(this.time*.8+side*2);
      const depth=clamp(1.25+d*.035,1.35,2.05);
      if(x<4.2&&Math.abs(y)>1.8&&Math.abs(y)<9)return point(side,4.12,15+Math.sign(y)*.80);
      return point(side,3.5+Math.max(.35,x/Math.max(1,d)*depth),15+clamp(y/Math.max(1,d)*depth+error,-1.2,1.2));
    }
    rememberTouch(id,name,y){
      this.lastTouches=this.lastTouches.filter(t=>t.id!==id);
      this.lastTouches.push({id,name,y,time:this.time});this.lastTouches=this.lastTouches.slice(-2);
    }
    battleChance(defender,carrier){
      const values=(a,keys)=>Object.fromEntries(keys.map(k=>[k,this.attribute(a,k)]));
      return pressureWinChance(values(defender,['checking','strength','workRate']),values(carrier,['puckControl','strength','decisions']));
    }
    battleStrength(a){return this.attribute(a,'strength')*.35+this.attribute(a,'checking')*.2+this.attribute(a,'puckControl')*.25+this.attribute(a,'workRate')*.2;}
    balanceLevel(a){const b=a?.balanceState;return b&&this.wall>=b.at?b.level*clamp((b.until-this.wall)/(b.until-b.at),0,1):0;}
    disruptBalance(a,opponent,closing,scale=1){
      if(!a||a.role==='G')return;
      const strength=this.attribute(a,'strength'),skating=this.attribute(a,'skating');
      const mass=clamp((opponent.player.weight||85)/(a.player.weight||85),.75,1.3);
      const brace=.55+strength*.012+skating*.010+this.energyLevel(a)*.002+(a.shieldUntil>this.time?.2:0);
      const level=clamp(closing*mass/(9*brace)*scale+this.balanceLevel(a)*.35,.04,.9);
      const duration=.35+level*.95+(100-this.energyLevel(a))*.002;
      a.balanceState={at:this.wall,until:this.wall+duration,level,direction:Math.atan2(a.y-opponent.y,a.x-opponent.x)};
      delete a.footPlants;
    }
    startBattle(a,b){
      if(!a||!b||a.side===b.side||distance(a,b)>2.3||(this.puck.z||0)>.45)return false;
      const boards=this.puck.y<4||this.puck.y>26||this.puck.x<3||this.puck.x>57;
      const defender=this.carrier===b.id?a:b,holder=defender===a?b:a;
      const separation=Math.max(.1,distance(a,b)),nx=(holder.x-defender.x)/separation,ny=(holder.y-defender.y)/separation;
      const closing=Math.max(0,(defender.vx-holder.vx)*nx+(defender.vy-holder.vy)*ny);
      const type=boards&&closing<2.6?'pin':closing>1.8&&separation<1.6?'check':'poke';
      this.battle={a:a.id,b:b.id,remaining:(type==='pin'?.85:.45)+this.random()*.55,spot:{...this.puck},boards,type,closing,at:this.time,support:[],
        balanceA:contactBalance(this,a,b),balanceB:contactBalance(this,b,a),axis:{x:nx,y:ny}};
      delete a.shotPreparation;delete b.shotPreparation;
      if(type==='check'){this.disruptBalance(holder,defender,closing);this.disruptBalance(defender,holder,closing,.3);}
      for(const actor of [a,b]){
        this.recordContact(actor,actor===defender?type:'protect',this.puck,closing/5,actor===defender?holder:defender);
        actor.vx*=type==='pin'?.25:.6;actor.vy*=type==='pin'?.25:.6;
      }
      this.carrier=null;this.flight=null;this.setPhase('battle');
      this.stats[a.side].battles++;this.stats[b.side].battles++;
      if(type==='check'){this.stats[defender.side].hits++;this.playerEvent(defender,'hits');this.battle.hit=defender.id;holder.recoverUntil=this.time+.35+clamp(closing/8,0,.55);this.effect('board',defender.side,clamp(closing/5,.2,1));}
      this.say('battle',a.player.name+' och '+b.player.name.split(' ').at(-1)+(boards?' kämpar längs sargen.':' kämpar om pucken.'),a.side);
      return true;
    }
    resolveBattle(dt){
      const battle=this.battle;if(!battle)return;
      // One nearby helper per side may enter the actual stick contest. Being
      // assigned to support does not count until the player reaches the puck.
      battle.support??=[];
      for(const side of [0,1]){
        battle.support=battle.support.filter(row=>{const a=this.actor(row.id);return a&&a.status==='playing'&&distance(a,battle.spot)<2.1;});
        if(battle.support.some(row=>row.side===side))continue;
        const helper=this.skaters(side).filter(a=>a.id!==battle.a&&a.id!==battle.b&&a.status==='playing'&&distance(a,battle.spot)<1.35).sort((a,b)=>distance(a,battle.spot)-distance(b,battle.spot))[0];
        if(helper){battle.support.push({id:helper.id,side,at:this.time});this.recordContact(helper,'support',battle.spot,.35);}
      }
      battle.remaining-=dt;if(battle.remaining>0)return;
      const a=this.actor(battle.a),b=this.actor(battle.b);this.battle=null;
      if(!a||!b){this.setPhase('loose');this.looseTime=0;return;}
      const helpers=battle.support.map(row=>this.actor(row.id)).filter(Boolean);
      const support=side=>helpers.filter(a=>a.side===side).reduce((sum,a)=>sum+this.battleStrength(a)*.16*(1-this.balanceLevel(a)),0);
      const chance=clamp(.5+(this.battleStrength(a)-this.battleStrength(b)+(battle.balanceA||0)-(battle.balanceB||0)+support(a.side)-support(b.side))*.027,.15,.85);
      const winner=this.random()<chance?a:b;
      this.stats[winner.side].battleWins++;this.playerEvent(winner,'battleWins');this.playerEvent(winner===a?b:a,'battleLosses');a.contactUntil=b.contactUntil=this.time+2.5;
      this.recordContact(winner,'recover',this.puck,.4,winner===a?b:a);
      if(helpers.length&&battle.boards){
        // A third stick pries the puck out; possession is settled by the real
        // pickup race on subsequent ticks, including opponents arriving late.
        const helper=helpers.find(h=>h.side===winner.side)||helpers[0],dx=helper.x-this.puck.x,dy=helper.y-this.puck.y,n=Math.hypot(dx,dy)||1;
        a.pickupAfter=b.pickupAfter=this.time+.25;
        this.puckVelocity={x:dx/n*1.8,y:dy/n*1.8,z:0};this.setPhase('loose');this.looseTime=0;
        this.say('battle-release',helper.player.name+' hjälper till att få loss pucken ur sargduellen.',helper.side);return;
      }
      if(battle.type==='poke'&&battle.closing>1.2){
        const away=Math.atan2(winner.y-(winner===a?b:a).y,winner.x-(winner===a?b:a).x);
        this.puckVelocity={x:Math.cos(away)*2.2,y:Math.sin(away)*2.2,z:0};this.setPhase('loose');this.looseTime=0;
        this.say('poke',winner.player.name+' petar pucken fri. Båda lagen följer efter.',winner.side);return;
      }
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
    makeActor(side,row,where){return {id:side+':'+row.player.id,side,role:row.role,player:row.player,...where,vx:0,vy:0,travelled:0,shift:0,target:{...where},duty:ROLE_NAMES[row.role],status:'playing'};}
    // Recorded animation facts are output only. They never feed targets, RNG,
    // attributes or puck decisions, and survive save/replay entry mid-stride.
    recordMotion(a,oldVx,oldVy,dt){
      const wrap=n=>Math.atan2(Math.sin(n),Math.cos(n));
      const speed=Math.hypot(a.vx,a.vy),oldSpeed=Math.hypot(oldVx,oldVy),m=a.motion;
      const travel=speed>.12?Math.atan2(a.vy,a.vx):(m?.travel??(a.side===0?0:Math.PI));
      const puckAngle=Math.atan2(this.puck.y-a.y,this.puck.x-a.x);
      const retreat=a.role!=='G'&&a.status==='playing'&&a.side!==this.owner&&speed<4.2&&distance(a,this.puck)<22&&Math.cos(travel-puckAngle)<(m?.backward>.5?-.15:-.5);
      const blend=1-Math.exp(-dt/.18),backward=(m?.backward||0)+((retreat?1:0)-(m?.backward||0))*blend;
      const aim=a.skateState?.heading??(a.role==='G'?puckAngle:speed>.18?travel+wrap(puckAngle-travel)*backward:(m?.heading??puckAngle));
      const heading=a.skateState?.heading??(m?m.heading+wrap(aim-m.heading)*blend:aim);
      const acceleration=(speed-oldSpeed)/dt,rotation=oldSpeed>.35&&speed>.35?wrap(travel-Math.atan2(oldVy,oldVx))/dt:0;
      a.motion={heading:wrap(heading),travel,backward,
        acceleration:(m?.acceleration||0)+(acceleration-(m?.acceleration||0))*blend,
        turn:(m?.turn||0)+(clamp(rotation,-3,3)-(m?.turn||0))*blend};
      if(a.role!=='G'){
        const moving=clamp((speed-.1)/.8,0,1),brake=clamp(-a.motion.acceleration/2.3,0,1)*moving;
        const drive=moving*clamp((a.motion.acceleration-.15)/2,0,1)*(1-brake),curve=clamp(a.motion.turn/1.6,-1,1)*moving*(1-brake);
        const ease=1-Math.exp(-dt/.14);
        a.motion.drive=(m?.drive||0)+(drive-(m?.drive||0))*ease;
        a.motion.brake=(m?.brake||0)+(brake-(m?.brake||0))*ease;
        a.motion.curve=(m?.curve||0)+(curve-(m?.curve||0))*ease;
        const identity=Array.from(String(a.id)).reduce((n,c)=>(Math.imul(n,31)+c.charCodeAt(0))>>>0,0);
        if(skating)Object.assign(a.motion,skating.advance(m,{speed,acceleration:a.motion.acceleration,turn:a.motion.turn,distance:Math.max(0,(a.travelled||0)-(m?.distance??a.travelled??0)),height:a.player.height||185,energy:this.energyLevel(a),dt,phaseOffset:(identity%997)/997,preferredSide:identity%2?1:-1}));
        a.motion.distance=a.travelled||0;
        const incoming=this.flight?.kind==='pass'&&this.flight.to===a.id;
        const action=a.presentationAction,active=action&&this.wall-action.at<.72;
        const target=a.shotPreparation?.target||active&&action.kind!=='receive'&&action.target||this.puck;
        const looking=Math.atan2(target.y-a.y,target.x-a.x),weight=a.id===this.carrier||incoming||a.shotPreparation||active?1:.35;
        const upperAim=heading+clamp(wrap(looking-heading),-.75,.75)*weight;
        const oldUpper=m?.upperHeading??heading,change=wrap(upperAim-oldUpper);
        // Angular speed belongs to the fixed-step recording, not the render FPS.
        a.motion.upperHeading=wrap(oldUpper+clamp(change*(1-Math.exp(-dt/.18)),-2.8*dt,2.8*dt));
        const oldGaze=m?.gazeHeading??a.motion.upperHeading;
        a.motion.gazeHeading=wrap(oldGaze+clamp(wrap(looking-oldGaze)*(1-Math.exp(-dt/.12)),-4*dt,4*dt));
        const phase=(a.travelled||0)*Math.PI/1.6,anchor=!a.skateState&&a.id===this.carrier?-.65:0;
        const body=skating?.body(a.travelled||0,a.motion,speed),facing=heading+(a.motion.stopSide||1)*a.motion.brake*.45;
        a.footPlants=[-1,1].map((side,i)=>{
          const stroke=skating?.cycle(a.travelled||0,side,{...a.motion,bank:body?.bank||0,pivot:body?.pivot||0}),cycle=stroke?stroke.load:Math.sin(phase+(side===1?Math.PI:0)),old=a.footPlants?.[i];
          if(cycle<.5||speed<.25||a.motion.drive<.05)return null;
          if(old&&this.wall-old.at<.55&&distance(a,old)<1.1){
            // A blade slides along its edge, while resisting sideways drift.
            const desired=facing+(stroke?.edge||0),angle=(old.angle??facing)+wrap(desired-(old.angle??facing))*Math.min(1,dt*8),along=(a.vx*Math.cos(angle)+a.vy*Math.sin(angle))*dt;
            return {...old,x:old.x+Math.cos(angle)*along,y:old.y+Math.sin(angle)*along,angle};
          }
          const forward=anchor+(stroke?.forward??.08),lateral=stroke?.lateral??side*.28;
          return {x:a.x+Math.cos(facing)*forward-Math.sin(facing)*lateral,y:a.y+Math.sin(facing)*forward+Math.cos(facing)*lateral,angle:facing+(stroke?.edge||0),at:this.wall};
        });
      }
    }
    recordAction(a,kind,target,style=null){
      a.presentationAction={kind,at:this._contactWall??this.wall,origin:{...this.puck},target:{...target},style};
      this.effect('stick',a.side,kind==='shot'?1:kind==='receive'?.3:.55);
    }
    recordContact(a,kind,spot,strength=.5,opponent=null){
      a.contactAction={kind,at:this._contactWall??this.wall,spot:{...spot},strength:clamp(strength,0,1),opponent:opponent?.id||null,
        direction:opponent?Math.atan2(opponent.y-a.y,opponent.x-a.x):Math.atan2(spot.y-a.y,spot.x-a.x)};
    }
    effect(kind,side=this.owner,strength=1){
      this.effectSequence=(this.effectSequence||0)+1;
      this.effects=[...(this.effects||[]).filter(e=>this.wall-e.at<3).slice(-15),{id:this.effectSequence,at:this._contactWall??this.wall,kind,side,strength,x:this.puck.x,y:this.puck.y,z:this.puck.z||0}];
    }
    recordPuckPoint(at,p=this.puck){
      if(!Number.isFinite(at)||at<0)return;
      const row={at,x:p.x,y:p.y,z:p.z||0};
      const path=this.puckPath??=[];
      if(path.length&&Math.abs(path.at(-1).at-at)<1e-7)path[path.length-1]=row;
      else if(!path.length||at>path.at(-1).at)path.push(row);
      while(path.length>32||path.length&&at-path[0].at>.4)path.shift();
    }
    recordKeeper(goalie,f,saved){
      if(!goalie)return;
      goalie.keeperAction={kind:saved?'save':'attempt',at:this._contactWall??this.wall,style:f.shot.keeperContact?.style||keeperStyle(goalie,this.puck,f.start),contact:{...this.puck},origin:{x:goalie.x,y:goalie.y},facing:Math.atan2(f.start.y-goalie.y,f.start.x-goalie.x)};
      if(saved){f.shot.saveStyle=goalie.keeperAction.style;this.effect('save',goalie.side);}
    }
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
      if(!a||(this.puck.z||0)>.45)return;
      const changed=a.side!==this.owner;
      if(changed){this.lastTouches=[];this.teams[a.side].markingPlan=null;}
      if(this.delayedOffside===a.side&&this.skaters(a.side).some(b=>progress(a.side,b.x)>40.1)){this.stop('offside','Fördröjd offside: anfallaren spelar pucken innan laget hunnit ut.',point(a.side,37,9));return;}
      if(this.phase!=='faceoff')this.recordAction(a,'receive',this.flight?.start||this.puck);
      this.delayedOffside=null;this.icingCandidate=null;this.puckVelocity=null;this.rimPath=null;
      this.owner=a.side;this.carrier=a.id;this.flight=null;this.battle=null;
      // The blade reaches the contact point, then cushions the puck toward the
      // skating anchor. Do not teleport a received puck by a player's reach.
      const reach=distance(a,this.puck);
      a.controlContact=this.phase!=='faceoff'&&reach>.02&&reach<=1.15?{x:this.puck.x,y:this.puck.y,z:this.puck.z||0,remaining:.18}:null;
      if(!a.controlContact)this.puck={x:a.x,y:a.y};
      this.decision=this.readDelay(a)+this.random()*.15;
      a.controlledAt=this.time;delete a.carryPlan;delete a.receivedPass;delete a.stickControl;
      if(changed&&this.rebound?.side!==a.side)this.rebound=null;
      const p=progress(a.side,a.x);
      this.setPhase(p>40?'attack':changed&&p>18?'counter':p>23?'entry':'breakout');
      if(turnover){this.stats[a.side].turnovers++;this.say('turnover',a.player.name+' läser spelet och vinner pucken.',a.side,true);}
    }
    faceoffPositions(){
      this.presentationReset=(this.presentationReset||0)+1;this.puckPath=[];
      for(const side of [0,1]){
        this.teams[side].markingPlan=null;
        const skaters=this.skaters(side),center=skaters.find(a=>a.role==='C')||[...skaters].sort((a,b)=>this.attribute(b,'faceoffs')-this.attribute(a,'faceoffs'))[0],dx=side===0?-1:1;
        for(const a of this.actors.filter(a=>a.side===side)){
          const offset={LW:[2,-6],C:[.65,0],RW:[2,6],LD:[8,-5],RD:[8,5],X:[4,3]};
          const z=a===center?[.65,0]:offset[a.role];
          const p=a.role==='G'?point(side,4.4,15):{x:clamp(this.restartSpot.x+dx*z[0],2,58),y:clamp(this.restartSpot.y+z[1],2,28)};
          a.x=p.x;a.y=p.y;a.target={...p};a.vx=0;a.vy=0;a.status='playing';
          delete a.keeperState;delete a.keeperBody;delete a.markHandoff;delete a.motion;delete a.presentationAction;delete a.keeperAction;delete a.contactAction;delete a.shotPreparation;delete a.controlContact;delete a.footPlants;delete a.balanceState;delete a.skateState;delete a.stickControl;delete a.netFront;
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
      for(const a of this.actors)delete a.shotPreparation;
      this.effect('whistle');
    }
    requestChange(side=0){
      const t=this.teams[side];if(this.finished||t.requested||t.changeQueue.length||t.change)return false;
      t.requested=true;this.say('bench',t.name+' begär nästa femma. Vi inväntar ett säkert byte.',side);return true;
    }
    nextUnit(side){const t=this.teams[side];t.line=(t.line+1)%Math.min(4,Math.floor(t.forwards.length/3));t.pair=(t.pair+1)%Math.min(3,Math.floor(t.defense.length/2));}
    changeAtStoppage(){for(const side of [0,1]){const t=this.teams[side];if(this.icingHold===side)continue;if(t.requested||t.shift>32||t.change||t.changeQueue.length){if(!t.changeQueue.length&&!t.change)this.nextUnit(side);this.installUnit(side);}}}
    safeToChange(side){
      // One skater leaves at a time. Puck territory, not ownership alone, makes
      // the window: a deep opponent retrieval still permits a change behind it.
      if(this.flight?.side===side&&['dump','clear'].includes(this.flight.kind)&&progress(side,this.puck.x)>40)return true;
      if(progress(side,this.puck.x)>44)return true;
      if(this.owner!==side||!this.carrier||this.phase==='loose')return false;
      const puckCarrier=this.actor(this.carrier);
      return puckCarrier&&progress(side,this.puck.x)>27&&this.skaters(1-side).every(a=>distance(a,puckCarrier)>1.5);
    }
    updateChanges(dt){
      for(const side of [0,1]){
        const t=this.teams[side];
        const limit=t.shiftLimit||43,overdue=this.skaters(side).some(a=>this.shiftTime(a)>limit*1.4);
        if((t.shift>limit||overdue)&&!t.requested&&!t.change&&!t.changeQueue.length)t.requested=true;
        if(t.requested&&!t.change&&!t.changeQueue.length&&this.safeToChange(side)){
          this.nextUnit(side);t.changeQueue=this.unit(side);t.requested=false;
        }
        if(t.change){
          const c=t.change,a=this.actor(c.id);
          if(c.stage==='out'&&a&&(this.carrier===a.id||(this.owner!==side&&progress(side,this.puck.x)<39))){a.status='playing';t.changeQueue.unshift(c.row);t.change=null;t.requested=false;continue;}
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
          // Nearby players clear the gate sooner. Never pull the puck carrier
          // off the ice, and never create two copies of an incoming player.
          const gate={x:side===0?27:33,y:.7};
          t.changeQueue.sort((x,y)=>{
            const a=this.skaters(side).find(a=>a.role===x.role),b=this.skaters(side).find(a=>a.role===y.role);
            return (a?distance(a,gate):Infinity)-(b?distance(b,gate):Infinity);
          });
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
        let target=point(side,x,y);
        if(carrier&&a!==carrier&&!pp)target=this.supportTarget(a,carrier,target);
        if(a===carrier&&a.carryPlan?.until>this.time){target={...a.carryPlan.target};duty=a.carryPlan.reason;}
        if(a===carrier&&p<=40&&this.skaters(side).some(b=>b.id!==a.id&&progress(side,b.x)>40.1))target.x=point(side,Math.min(37.5,progress(side,target.x)),0).x;
        if(a.id!==this.carrier&&(p<=40||this.delayedOffside===side)&&progress(side,target.x)>37.5)target.x=point(side,37.5,0).x;
        this.assign(a,target,duty);
      }
      if(!carrier&&this.flight?.kind==='pass'){const receiver=this.actor(this.flight.to);if(receiver)this.assign(receiver,this.flight.end,'Möter passningen');}
    }
    defenseTargets(side){
      const attackers=this.skaters(1-side),defenders=this.skaters(side),carrier=this.actor(this.carrier),pk=this.isShortHanded(side);
      const enemyProgress=progress(1-side,this.puck.x);
      if(pk&&enemyProgress>40){
        this.teams[side].markingPlan=null;
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
      const danger=b=>progress(1-side,b.x)+(1-Math.abs(b.y-15)/15)*8+(b===carrier?5:carrier?(1-this.laneRisk(carrier,b))*3:0);
      const threats=[...attackers].sort((a,b)=>danger(b)-danger(a));
      const available=[...defenders];let assignments=[];
      for(const threat of threats){
        if(!available.length)break;
        const deepest=assignments.length<2;
        let pool=deepest?available.filter(a=>a.role.endsWith('D')):available;
        if(!pool.length)pool=available;
        const cost=a=>distance(a,threat)-(a.markedThreat===threat.id?2:0);
        const marker=[...pool].sort((a,b)=>cost(a)-cost(b))[0];available.splice(available.indexOf(marker),1);
        assignments.push({a:marker,threat});
      }
      const team=this.teams[side],old=team.markingPlan;
      const eligible=enemyProgress>43&&!this.hasPowerPlay(side)&&defenders.length===5&&attackers.length===5;
      const valid=eligible&&old&&this.time-old.at<1&&old.marks.length===assignments.length&&old.marks.every(r=>defenders.some(a=>a.id===r.id)&&attackers.some(a=>a.id===r.threat));
      if(valid&&this.time<old.readAt){
        assignments=old.marks.map(r=>({a:this.actor(r.id),threat:this.actor(r.threat)}));
      }else if(eligible){
        const reading=defenders.reduce((sum,a)=>sum+this.attribute(a,'decisions')+this.attribute(a,'positioning'),0)/(defenders.length*2);
        team.markingPlan={at:this.time,readAt:this.time+clamp(.65-reading*.021,.23,.55),marks:assignments.map(({a,threat})=>({id:a.id,threat:threat.id}))};
        if(valid)for(const {a,threat} of assignments){const from=old.marks.find(r=>r.id===a.id)?.threat;if(from&&from!==threat.id)a.markHandoff={from,to:threat.id,at:this.time,until:this.time+.6};}
      }else team.markingPlan=null;
      for(const {a,threat} of assignments){
        a.markedThreat=threat.id;
        const at=progress(side,threat.x),hasPuck=threat===carrier;
        const gap=hasPuck?1.65-this.attribute(a,'positioning')*.035:2.55-this.attribute(a,'positioning')*.035;
        const anticipate=this.attribute(a,'decisions')*.017;
        let x=clamp(at-gap,6,47),y=threat.y+(15-threat.y)*(hasPuck?.04:.14)+clamp(threat.vy*anticipate,-.7,.7);
        // Backward skating keeps defenders between the rush and their own goal.
        if(enemyProgress<28&&a.role.endsWith('D'))x=Math.min(x,30);
        this.assign(a,point(side,x,y),hasPuck?'Styr puckföraren mot utsidan':a.markHandoff?.until>this.time?'Tar över markeringen av '+threat.player.name.split(' ').at(-1):'Täcker '+threat.player.name.split(' ').at(-1));
      }
      if(eligible&&carrier&&(carrier.y<8||carrier.y>22)){
        const pressing=assignments.find(({a,threat})=>threat===carrier&&a.role.endsWith('D')&&distance(a,carrier)<2.7);
        if(pressing){
          const cover=assignments.filter(({a,threat})=>!a.role.endsWith('D')&&threat!==carrier&&progress(side,threat.x)>11).sort((a,b)=>distance(a.a,point(side,9,15))-distance(b.a,point(side,9,15)))[0]?.a;
          if(cover)this.assign(cover,point(side,9,carrier.y<15?11:19),'Täcker bakom backen som pressar vid sargen');
        }
      }
      for(const a of available)this.assign(a,point(side,10,a.role==='LD'?11:19),'Skyddar slottet');
    }
    targets(){
      this.attackTargets(this.owner);this.defenseTargets(1-this.owner);
      if(this.battle)for(const side of [0,1]){
        const b=this.battle,helper=this.skaters(side).filter(a=>a.id!==b.a&&a.id!==b.b&&a.status==='playing'&&!a.role.endsWith('D')&&distance(a,b.spot)<4.5).sort((a,b)=>distance(a,this.battle.spot)-distance(b,this.battle.spot))[0];
        if(helper){const d=Math.max(.1,distance(helper,b.spot));this.assign(helper,{x:b.spot.x+(helper.x-b.spot.x)/d*.95,y:b.spot.y+(helper.y-b.spot.y)/d*.95},'Ger understöd och söker pucken ur närkampen');}
      }
      if(!this.carrier&&!this.flight&&!this.battle){
        // One pursuer per side; the other eight skaters continue supporting and covering.
        for(const side of [0,1]){const nearest=[...this.skaters(side)].filter(a=>a.status!=='leaving').sort((a,b)=>distance(a,this.puck)-distance(b,this.puck))[0];if(nearest)this.assign(nearest,this.puck,'Jagar den lösa pucken');}
      }
      for(const a of this.actors){
        if(a.role==='G'){
          this.assign(a,this.goalieTarget(a.side,this.flight?.kind==='shot'?this.flight.start:this.puck),'Följer pucken, sätter fötterna och täcker vinkeln');
        }
        if(this.battle&&(a.id===this.battle.a||a.id===this.battle.b)){
          const d=Math.max(.1,distance(a,this.battle.spot));
          this.assign(a,{x:this.battle.spot.x+(a.x-this.battle.spot.x)/d*.45,y:this.battle.spot.y+(a.y-this.battle.spot.y)/d*.45},this.battle.type==='pin'?'Låser duellen mot sargen':'Skyddar pucken och arbetar i närkampen');
        }
        if(a.shotPreparation&&a.id===this.carrier)this.assign(a,{x:a.x+a.vx*.08,y:a.y+a.vy*.08},'Sätter fötterna och förbereder skottet');
        if(a.status==='leaving')this.assign(a,{x:this.teams[a.side].change.gate,y:.7},'Går till bänken');
      }
    }
    routeAroundNet(a,target){
      const hit=netObstacle(a,target,.55);if(!hit)return rinkLimit(target,.4);
      const y=(a.y<14.5||a.y<15.5&&target.y<15)?hit.bottom-.45:hit.top+.45;
      const beyond=a.y<hit.bottom||a.y>hit.top;
      const x=(beyond?target.x:a.x)<(hit.lo+hit.hi)/2?hit.lo-.4:hit.hi+.4;
      return rinkLimit({x,y},.4);
    }
    netFrontHold(a){
      const d=this.actor(a.netFront?.opponent);if(!d||a.netFront.until<=this.time||d.side===a.side||d.status!=='playing'||distance(a,d)>1.05)return 0;
      const inside=progress(a.side,d.x)>progress(a.side,a.x);if(!inside)return 0;
      const defending=this.attribute(d,'strength')*.45+this.attribute(d,'checking')*.3+this.attribute(d,'positioning')*.25,attacking=this.attribute(a,'strength')*.45+this.attribute(a,'puckControl')*.55;
      return clamp(.2+(defending-attacking)*.035,0,.65)*(1-clamp((distance(a,d)-.65)/.4,0,1));
    }
    constrainBody(a,before){
      const wall=rinkLimit(a,a.role==='G'?.38:.34);
      if(wall.hit){a.x=wall.x;a.y=wall.y;const toward=a.vx*wall.nx+a.vy*wall.ny;if(toward>0){a.vx-=toward*wall.nx;a.vy-=toward*wall.ny;}}
      const hit=netObstacle(before,a,a.role==='G'?.30:.34);
      if(hit){
        if(hit.nx||hit.ny){a.x=hit.x;a.y=hit.y;const toward=a.vx*hit.nx+a.vy*hit.ny;if(toward<0){a.vx-=toward*hit.nx;a.vy-=toward*hit.ny;}}
        else{const exits=[[Math.abs(a.x-hit.lo),'x',hit.lo-.002],[Math.abs(a.x-hit.hi),'x',hit.hi+.002],[Math.abs(a.y-hit.bottom),'y',hit.bottom-.002],[Math.abs(a.y-hit.top),'y',hit.top+.002]].sort((x,y)=>x[0]-y[0]);a[exits[0][1]]=exits[0][2];a[exits[0][1]==='x'?'vx':'vy']=0;}
      }
    }
    updateStickControl(a,dt){
      const heading=a.skateState?.heading??(a.side?Math.PI:0),hand=a.player.shoots==='R'?1:-1,skill=this.attribute(a,'puckControl'),speed=Math.hypot(a.vx,a.vy);
      const defender=this.skaters(1-a.side).filter(b=>b.status==='playing').sort((b,c)=>distance(a,b)-distance(a,c))[0];
      const pressure=defender?clamp(1-distance(a,defender)/2.4,0,1):0;
      const protecting=pressure>.22||a.shieldUntil>this.time,enemySide=defender?-(defender.x-a.x)*Math.sin(heading)+(defender.y-a.y)*Math.cos(heading):0;
      const turnSide=-(a.target.x-a.x)*Math.sin(heading)+(a.target.y-a.y)*Math.cos(heading);
      const side=protecting&&Math.abs(enemySide)>.1?-Math.sign(enemySide):speed>1&&Math.abs(turnSide)>2?Math.sign(turnSide):hand;
      const state=a.stickControl??={at:this.wall,lateral:0,forward:0,heading,mode:'forehand'};
      const lateral=side*(protecting?.48:.28),forward=(protecting?.35:.58)+speed*.018;
      const reachRate=2+skill*.1;state.lateral+=clamp(lateral-state.lateral,-reachRate*dt,reachRate*dt);state.forward+=clamp(forward-state.forward,-reachRate*dt,reachRate*dt);
      state.heading=heading;state.mode=protecting?'protect':state.lateral*hand<-.05?'backhand':'forehand';
      const target=rinkLimit({x:a.x+Math.cos(heading)*state.forward-Math.sin(heading)*state.lateral,y:a.y+Math.sin(heading)*state.forward+Math.cos(heading)*state.lateral},.12);
      const c=a.controlContact;
      if(c?.remaining>0){c.remaining=Math.max(0,c.remaining-dt);const t=c.remaining/.18;this.puck={x:target.x+(c.x-target.x)*t,y:target.y+(c.y-target.y)*t,z:c.z*t};}
      else{
        const d=distance(this.puck,target),step=Math.min(1,(speed+3+skill*.15)*(1-this.balanceLevel(a)*.45)*dt/Math.max(.001,d));
        this.puck={x:this.puck.x+(target.x-this.puck.x)*step,y:this.puck.y+(target.y-this.puck.y)*step,z:0};
      }
      // A body pushed beyond its stick cannot retain possession by teleporting
      // the puck. The ordinary loose-puck race settles the next touch.
      if(distance(a,this.puck)>1.25||netObstacle(a,this.puck,.04)){
        this.carrier=null;this.puckVelocity={x:a.vx*.7,y:a.vy*.7,z:0};a.pickupAfter=this.time+.25;this.setPhase('loose');this.looseTime=0;
        this.recordContact(a,'bobble',this.puck,.45);this.say('bobble',a.player.name+' tappar pucken utanför räckhåll.',a.side);
      }
    }
    move(dt){
      const initial=new Map(this.actors.map(a=>[a.id,{x:a.x,y:a.y,vx:a.vx,vy:a.vy}]));
      for(const a of this.actors){
        a.sweepStart={x:a.x,y:a.y,at:this.time};
        const target=this.routeAroundNet(a,a.target),dx=target.x-a.x,dy=target.y-a.y,d=Math.hypot(dx,dy);
        let top=a.role==='G'?2.2+this.attribute(a,'movement')*.09:3.1+this.attribute(a,'skating')*.09;
        if(a.role!=='G'&&a.side!==this.owner)top*=.9+this.attribute(a,'workRate')*.008;
        if(a.role==='G'&&a.keeperBody)top*=1-a.keeperBody.drop*.16;
        if(a.id===this.carrier)top*=.86;
        if(a.role!=='G')top*=1-clamp((70-this.energyLevel(a))*.004,0,.18);
        const unsteady=this.balanceLevel(a);
        top*=Math.min(a.recoverUntil>this.time?.55:1,1-unsteady*.55);
        if(this.battle&&(a.id===this.battle.a||a.id===this.battle.b))top*=.3;
        const accel=(2.7+this.attribute(a,a.role==='G'?'movement':'acceleration')*.085)*(1-unsteady*.65);
        const travel=Math.hypot(a.vx,a.vy)>.12?Math.atan2(a.vy,a.vx):Math.atan2(dy,dx),puckAngle=Math.atan2(this.puck.y-a.y,this.puck.x-a.x);
        const backward=a.role!=='G'&&a.side!==this.owner&&distance(a,this.puck)<22&&Math.cos(travel-puckAngle)<-.5;
        if(backward)top*=.85+this.attribute(a,'skating')*.006;
        let speed=Math.min(top,Math.sqrt(2*accel*d));
        // Brake based on stopping distance before the puck enters, instead of
        // skating to an attacking target and correcting after the blue line.
        if(a.side===this.owner&&a.id!==this.carrier&&a.role!=='G'&&progress(a.side,this.puck.x)<=40&&progress(a.side,a.x)<40){
          const room=Math.max(0,39.2-progress(a.side,a.x));
          if(progress(a.side,a.target.x)>progress(a.side,a.x))speed=Math.min(speed,Math.sqrt(2*accel*room));
        }
        let vx=d>.03?dx/d*speed:0,vy=d>.03?dy/d*speed:0;
        for(const b of this.actors){if(a.id===b.id)continue;const old=initial.get(b.id),gap=distance(a,old);if(gap>.02&&gap<1.1){vx+=(a.x-old.x)/gap*(1.1-gap)*1.6;vy+=(a.y-old.y)/gap*(1.1-gap)*1.6;}}
        if(a.role==='G'){const change=Math.hypot(vx-a.vx,vy-a.vy),blend=change?Math.min(1,accel*dt/change):1;a.vx+=(vx-a.vx)*blend;a.vy+=(vy-a.vy)*blend;}
        else{
          const velocity=skateVelocity({x:a.vx,y:a.vy},{x:vx,y:vy},accel,(3.8+this.attribute(a,'skating')*.12)*(1-unsteady*.4),dt);a.vx=velocity.x;a.vy=velocity.y;
          const aim=backward?puckAngle:Math.hypot(a.vx,a.vy)>.12?Math.atan2(a.vy,a.vx):a.skateState?.heading??travel,previous=a.skateState?.heading??aim;
          a.skateState={at:this.wall,heading:previous+clamp(angleDelta(previous,aim),-4.8*dt,4.8*dt),backward};a.skateState.heading=Math.atan2(Math.sin(a.skateState.heading),Math.cos(a.skateState.heading));
        }
        a.x+=a.vx*dt;a.y+=a.vy*dt;this.constrainBody(a,initial.get(a.id));
      }
      // Symmetric body contacts avoid actor-order bias; preserve tangential
      // motion so a shoulder contact does not stop a whole group of players.
      for(let pass=0;pass<2;pass++)for(let i=0;i<this.actors.length;i++)for(let j=i+1;j<this.actors.length;j++){
        const a=this.actors[i],b=this.actors[j],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),radius=a.role==='G'||b.role==='G'?.74:.66;
        let nx=d?dx/d:(String(a.id)<String(b.id)?1:-1),ny=d?dy/d:0,shift=Math.min(.22,radius-d+.001),crossed=false;
        if(pass===0){
          const oldA=initial.get(a.id),oldB=initial.get(b.id),ox=oldB.x-oldA.x,oy=oldB.y-oldA.y,oldDistance=Math.hypot(ox,oy);
          if(oldDistance>.001&&dx*ox+dy*oy<0){
            const sx=dx-ox,sy=dy-oy,t=clamp(-(ox*sx+oy*sy)/(sx*sx+sy*sy),0,1);
            if(Math.hypot(ox+sx*t,oy+sy*t)<radius){crossed=true;nx=ox/oldDistance;ny=oy/oldDistance;shift=radius-dx*nx-dy*ny+.001;}
          }
        }
        // Preserve the incoming side when fast bodies cross between ticks;
        // a separation based only on end positions would push them through.
        if(!crossed&&d>=radius)continue;
        const wa=1/(a.player.weight||85),wb=1/(b.player.weight||85),sum=wa+wb;
        a.x-=nx*shift*wa/sum;a.y-=ny*shift*wa/sum;b.x+=nx*shift*wb/sum;b.y+=ny*shift*wb/sum;
        const closing=(a.vx-b.vx)*nx+(a.vy-b.vy)*ny;if(closing>0){a.vx-=closing*nx*wa/sum;a.vy-=closing*ny*wa/sum;b.vx+=closing*nx*wb/sum;b.vy+=closing*ny*wb/sum;}
      }
      for(const a of this.actors){const old=initial.get(a.id);this.constrainBody(a,old);a.travelled=(a.travelled||0)+distance(a,old);this.recordMotion(a,old.vx,old.vy,dt);}
      const carrier=this.actor(this.carrier);
      if(carrier)this.updateStickControl(carrier,dt);
      // Contact can happen between puck decisions; a player cannot skate through
      // a defender merely because the next decision timer has not expired.
      if(carrier&&this.carrier===carrier.id&&!this.battle&&this.time>(carrier.contactUntil||0)){
        const challenger=this.skaters(1-carrier.side).filter(d=>this.time>(d.contactUntil||0)&&distance(d,carrier)<1.45).sort((a,b)=>distance(a,carrier)-distance(b,carrier))[0];
        if(challenger&&this.random()<1-Math.exp(-this.battleChance(challenger,carrier)*6*dt))this.startBattle(carrier,challenger);
      }
    }
    laneRisk(a,b){const origin=this.carrier===a.id?this.puck:a;return this.skaters(1-a.side).reduce((risk,d)=>{const lane=segmentDistance(d,origin,b),reading=this.attribute(d,'positioning')*.65+this.attribute(d,'decisions')*.35;return lane.t>.1&&lane.t<.94?Math.max(risk,clamp(1-lane.d/1.9,0,1)*(reading/20)):risk;},0);}
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
    // Spatial value is evaluated from the current rink, without drawing random numbers.
    skatingLane(a){
      const p=progress(a.side,a.x);
      const options=[[7,0],[5,-5],[5,5],[1,-5],[1,5],[-3,a.y<15?4:-4]];
      return options.map(([dx,dy])=>{
        const target=point(a.side,clamp(p+dx,5,54),clamp(a.y+dy,3,27));
        const threats=this.skaters(1-a.side).map(d=>({...d,x:d.x+clamp(d.vx*.5,-2,2),y:d.y+clamp(d.vy*.5,-2,2)}));
        const gap=Math.min(8,...threats.map(d=>segmentDistance(d,a,target).d));
        const space=Math.min(6,...threats.map(d=>distance(d,target)))/6;
        const advance=(progress(a.side,target.x)-p)/7;
        return {target,value:.14+space*.13+clamp(advance,-1,1)*(p>40?.045:.12)+clamp(gap/3,0,1)*.08-this.pressureAt(a)*.19,reason:gap>2?'Utnyttjar en fri skridskoväg':'Söker en väg runt pressen'};
      }).sort((a,b)=>b.value-a.value)[0];
    }
    shieldTarget(a){
      const threats=this.skaters(1-a.side),nearest=[...threats].sort((b,c)=>distance(a,b)-distance(a,c))[0];
      if(!nearest)return {x:a.x,y:a.y};
      const away=Math.atan2(a.y-nearest.y,a.x-nearest.x);
      const candidates=[0,-Math.PI/3,Math.PI/3,-Math.PI/2,Math.PI/2].map(turn=>{
        const angle=away+turn,target={x:clamp(a.x+Math.cos(angle)*1.35,1.2,58.8),y:clamp(a.y+Math.sin(angle)*1.35,1.1,28.9)};
        // Puck protection cannot carry the puck across blue ahead of a teammate.
        if(progress(a.side,a.x)<40&&this.skaters(a.side).some(b=>b.id!==a.id&&progress(a.side,b.x)>40.1)&&progress(a.side,target.x)>39.5)target.x=point(a.side,39.5,0).x;
        const clearance=Math.min(4,...threats.map(d=>distance(d,target)));
        const separation=Math.min(2,...this.skaters(a.side).filter(b=>b.id!==a.id).map(b=>distance(b,target)));
        return {target,value:clearance+separation*.15-distance(a,target)*.08};
      });
      return candidates.sort((x,y)=>y.value-x.value)[0].target;
    }
    dumpTarget(a){
      const active=side=>this.skaters(side).filter(b=>b.id!==a.id&&!['leaving','entering'].includes(b.status));
      const arrival=(players,target)=>Math.min(20,...players.map(b=>distance(b,target)/(3.1+this.attribute(b,'skating')*.09)));
      return [2,28].map(y=>{
        const target=point(a.side,59,y),ours=arrival(active(a.side),target),theirs=arrival(active(1-a.side),target);
        // Prefer the near boards when races are otherwise similar; switch only
        // when actual support and defensive coverage justify the longer route.
        const near=(a.y<15)===(y<15),value=theirs-ours+(near?.35:0);
        return {target,value,far:!near};
      }).sort((x,y)=>y.value-x.value)[0];
    }
    supportTarget(a,carrier,anchor){
      const key=this.owner+':'+this.phase+':'+carrier.id;
      if(a.supportPlan?.key===key&&a.supportPlan.until>this.time)return a.supportPlan.target;
      const role=a.role,p=progress(a.side,carrier.x),back=role.endsWith('D');
      const offsets=this.phase==='attack'?[[0,0],[-3,-3],[-3,3],[1,-3],[1,3],[-5,0]]:[[0,0],[-4,-4],[-4,4],[-7,0],[2,-3],[2,3]];
      const candidates=offsets.map(([dx,dy])=>{
        const target=point(a.side,clamp(progress(a.side,anchor.x)+dx,this.phase==='attack'&&p>40?41:5,back?Math.min(45,p+2):55),clamp(anchor.y+dy,3,27));
        if(p<=40)target.x=point(a.side,Math.min(37.5,progress(a.side,target.x)),0).x;
        const separation=Math.min(6,...this.skaters(a.side).filter(b=>b.id!==a.id&&b.id!==carrier.id).map(b=>distance(b,target)))/6;
        const open=Math.min(5,...this.skaters(1-a.side).map(b=>distance(b,target)))/5;
        const reach=distance(carrier,target),range=1-Math.min(1,Math.abs(reach-10)/14);
        const lane=1-this.laneRisk(carrier,target),anchorCost=distance(anchor,target)*.025;
        return {target,value:lane*.4+open*.24+separation*.18+range*.18-anchorCost};
      }).sort((a,b)=>b.value-a.value);
      const target=candidates[0].target;a.supportPlan={key,until:this.time+.6,target};return target;
    }
    actionOptions(a){
      const p=progress(a.side,a.x),pressure=this.pressureAt(a),context=this.shotContext(a),model=this.shotModel(a,context),t=this.teams[a.side];
      const lane=this.skatingLane(a),rows=[{kind:'carry',value:lane.value,target:lane.target,reason:lane.reason}];
      const held=this.time-(a.controlledAt??this.time),pk=this.isShortHanded(a.side),pp=this.hasPowerPlay(a.side);
      for(const {b} of this.passingOptions(a)){
        const chance=this.passChance(a,b),forward=progress(a.side,b.x)-p;
        if(p<=40&&progress(a.side,b.x)>40)continue;
        const receiver=this.shotModel(b),space=1-this.pressureAt(b);
        let value=chance*(.32+receiver.quality*3+space*.08+clamp(forward/20,-.5,1)*.10)-(1-chance)*.22;
        if(this.lastTouches.at(-1)?.id===b.id)value-=.06;
        const reset=p>40&&progress(a.side,b.x)<40,escape=pressure>.4&&chance>.72&&space>.6;
        if(reset)value-=escape?.07:.24;
        if(p>=32&&p<40&&forward<-6&&pressure<.4)value-=.10;
        rows.push({kind:'pass',value,to:b.id,reason:reset?(escape?'Återspelar bakom blå för att ta sig ur pressen':'Väger ett återspel mot risken att tappa anfallszonen'):receiver.quality>model.quality*1.5?'Passar till ett bättre avslutsläge':chance>.8?(pressure>.35?'Spelar ur pressen via en säker passningsväg':'Behåller pucken via en fri passningsväg'):'Söker en öppning genom täckningen'});
      }
      const instant=context.oneTimer||context.rebound||(p>47&&context.angle<.6&&context.pressure<.45);
      if(p>41&&!context.behind&&(!pp||instant||this.attackPasses>=2&&this.setupTime>1.2))rows.push({kind:'shoot',value:.12+model.quality*4+shotTacticalBias({mentality:t.tactics.mentality})+(instant?.06:0),reason:context.oneTimer?'Avslutar innan målvakten hinner över':context.screen>.3?'Utnyttjar skymningen':'Väljer avslut framför en sämre fortsättning'});
      if(p>=30&&p<40){const lane=this.dumpTarget(a);rows.push({kind:'dump',value:.08+pressure*.28+(t.tactics.mentality==='direct'?.07:0),target:lane.target,reason:lane.far?'Dumpar mot bortre hörnet där understödet har bättre chans':'Lägger pucken längs närmaste sarg för nästa duell'});}
      if(pressure>.35&&held<1.6)rows.push({kind:'shield',value:.1+pressure*.18+this.attribute(a,'puckControl')*.002-held*.04,target:this.shieldTarget(a),reason:'Flyttar pucken bort från pressen medan understödet blir spelbart'});
      if(pk&&p<32)rows.push({kind:'clear',value:.52+pressure*.15,reason:'Prioriterar att få ut pucken i numerärt underläge'});
      return rows.sort((a,b)=>b.value-a.value);
    }
    chooseAction(a){
      const noise=(40-this.attribute(a,'vision')-this.attribute(a,'decisions'))*.0018;
      const rows=this.actionOptions(a).map(r=>({...r,seen:r.value+(this.random()-.5)*noise})).sort((a,b)=>b.seen-a.seen);
      const selected=rows[0];
      this.decisionAudit??={counts:{},recent:[]};
      const audit=this.decisionAudit;audit.counts[selected.kind]=(audit.counts[selected.kind]||0)+1;
      audit.recent.push({time:this.time,side:a.side,player:a.player.name,kind:selected.kind,reason:selected.reason,alternatives:rows.slice(0,3).map(r=>({kind:r.kind,value:Math.round(r.value*1000)/1000}))});audit.recent=audit.recent.slice(-30);
      return selected;
    }
    shotContext(a){
      const origin=this.carrier===a.id?this.puck:a,goal=point(a.side,56.5,15),d=distance(origin,goal),forward=56.5-progress(a.side,origin.x);
      const angle=Math.atan2(Math.abs(origin.y-15),Math.max(.1,forward));
      const last=a.receivedPass,oneTimer=Boolean(last&&this.time-last.time<.85&&Math.abs(last.y-a.y)>5);
      const rebound=Boolean(this.rebound&&this.rebound.side===a.side&&this.time-this.rebound.time<3&&(!this.rebound.spot||distance(a,this.rebound.spot)<6));
      const screen=this.actors.filter(b=>b.role!=='G'&&b.id!==a.id).reduce((sum,b)=>{
        const lane=segmentDistance(b,origin,goal);
        return sum+(lane.t>.5&&lane.t<.98&&distance(b,goal)<9?clamp(1-lane.d/.95,0,1)*(b.side===a.side?1:.55):0);
      },0);
      return {d,angle,pressure:this.pressureAt(a),screen:clamp(screen,0,1),oneTimer,rebound,behind:forward<=0,
        lateralSpeed:last&&this.time-last.time<1.2?Math.abs(last.y-a.y)/Math.max(.25,last.duration||.5):0,
        type:rebound?'Retur':oneTimer?'Direktskott':d>16?'Slagskott':d<5?'Näravslut':'Handledsskott'};
    }
    shotModel(a,context=this.shotContext(a)){
      const c=context,keeper=this.actors.find(b=>b.side!==a.side&&b.role==='G');
      const shooting=this.attribute(a,'shooting'),control=this.attribute(a,'puckControl'),calm=this.attribute(a,'composure');
      const goal=point(a.side,56.5,15),origin=this.carrier===a.id?this.puck:a;
      const block=this.skaters(1-a.side).reduce((risk,b)=>{
        const lane=segmentDistance(b,origin,goal);
        return lane.t>0&&lane.t<.96&&distance(origin,b)>.4?Math.max(risk,shotBlockChance(1-lane.d/1.35,{positioning:this.attribute(b,'positioning'),workRate:this.attribute(b,'workRate')})):risk;
      },0);
      const keeperValues=keeper?Object.fromEntries(['reflexes','positioning','composure','movement'].map(k=>[k,this.attribute(keeper,k)])):null;
      const alignment=keeper?clamp(distance(keeper,this.goalieTarget(keeper.side,origin))/2.5,0,1):1;
      return evaluateShot({shooter:{shooting, puckControl:control,composure:calm},keeper:keeperValues,context:c,block,alignment});
    }
    updateKeeperBody(g,dt){
      const incoming=this.flight?.kind==='shot'&&this.flight.side!==g.side&&!this.flight.keeperPassed;
      const previous=g.keeperState,move=this.attribute(g,'movement'),speed=this.stoppage>0?0:Math.hypot(g.vx,g.vy);
      const body=g.keeperBody??={at:this.wall,drop:previous?.drop||0,facing:previous?.facing??(g.side?Math.PI:0),load:0,post:0,mode:'ready'};
      const p=progress(g.side,this.puck.x),y=this.puck.y-15,nearPost=!incoming&&p<7.7&&Math.abs(y)>1.8&&Math.abs(y)<9&&distance(g,this.goalieTarget(g.side))<1.3;
      const age=this.wall-(g.keeperAction?.at??-100),hold=age<.42&&distance(g,this.puck)<9;
      if(!incoming){
        // Prepare for an observed close carrier before release. The keeper
        // cannot wait for flight to begin at point-blank range, and does not
        // know the intended shot height or its eventual outcome.
        const carrier=this.actor(this.carrier),ready=carrier&&carrier.side!==g.side&&p>3.5&&p<11?.20*clamp((8-distance(g,this.puck))/4,0,1):0;
        const target=nearPost?.68:Math.max(ready,hold?Math.min(1,previous?.drop??body.drop):0);
        const rate=target>body.drop?2.4:.85+move*.045;
        body.drop+=clamp(target-body.drop,-rate*dt,rate*dt);
        if(previous){
          previous.drop=body.drop;
          const sign=g.player.shoots==='R'?1:-1;
          for(const [key,lateral,z] of [['glove',sign*.53,.88],['blocker',-sign*.43,.78]]){
            previous[key].lateral+=(lateral-previous[key].lateral)*Math.min(1,dt*3);
            previous[key].z+=(z-body.drop*.2-previous[key].z)*Math.min(1,dt*3);
          }
        }
      }else body.drop=previous?.drop??body.drop;
      // Stay square to the observed release line while the equipment tracks
      // the shot. Turning the whole contact plane toward an arriving puck
      // would turn corner shots into artificial central body contacts.
      const tracking=incoming?this.flight.start:this.puck;
      const relative=progress(g.side,tracking.x)-progress(g.side,g.x),angle=Math.atan2(tracking.y-g.y,Math.max(.2,relative)),aim=g.side?Math.PI-angle:angle;
      const turn=Math.atan2(Math.sin(aim-body.facing),Math.cos(aim-body.facing)),rate=(3.2+move*.10)*(1-body.drop*.18);
      if(distance(g,tracking)>.25)body.facing+=clamp(turn,-rate*dt,rate*dt);
      body.facing=Math.atan2(Math.sin(body.facing),Math.cos(body.facing));
      const lateral=this.stoppage>0?0:-g.vx*Math.sin(body.facing)+g.vy*Math.cos(body.facing);
      body.load+=(clamp(lateral/3,-1,1)-body.load)*Math.min(1,dt*5);
      body.post=nearPost?Math.sign(y):0;
      body.mode=nearPost?'post':body.drop>.3?(speed>.6?'butterfly-slide':incoming?'butterfly':'recovering'):speed>.2?'tracking':'ready';
    }
    beginKeeperRead(f){
      const g=this.actors.find(a=>a.role==='G'&&a.side!==f.side);if(!g)return;
      const catchSide=g.player.shoots==='R'?1:-1,previous=g.keeperState;
      const carried=Boolean(g.keeperBody||previous&&this.wall-previous.at<1.1);
      g.keeperState={at:this.wall,elapsed:0,seen:0,screen:0,drop:g.keeperBody?.drop??(carried?previous?.drop||0:0),
        facing:g.keeperBody?.facing??Math.atan2(f.start.y-g.y,f.start.x-g.x)+(20-this.attribute(g,'positioning'))*.003*Math.sin(this.time*.8+g.side*2),glove:carried&&previous?{...previous.glove}:{lateral:catchSide*.53,z:.88},blocker:carried&&previous?{...previous.blocker}:{lateral:-catchSide*.43,z:.78},
        recovery:g.keeperBody?clamp(g.keeperBody.drop*.65+Math.abs(g.keeperBody.load)*.35,0,1):g.keeperAction?clamp(1-(this.wall-g.keeperAction.at)/1.1,0,1):0,
        // The seeded read error affects the attempted reach, never awards a goal.
        error:(f.shot.finishRoll-.5)*(.035+(20-this.attribute(g,'positioning'))*.012+(20-this.attribute(g,'composure'))*.006)};
    }
    updateKeeperPlane(f){
      if(!f.goalLine||f.keeperPassed)return;
      const g=this.actors.find(a=>a.role==='G'&&a.side!==f.side);if(!g?.keeperState)return;
      const angle=g.keeperBody?.facing??g.keeperState.facing,cs=Math.cos(angle),sn=Math.sin(angle),dx=f.goalLine.x-f.start.x,dy=f.goalLine.y-f.start.y;
      const toward=dx*cs+dy*sn;if(Math.abs(toward)<1e-8)return;
      const total=f.duration+(f.goalDuration||0),start=(f.start.x-g.x)*cs+(f.start.y-g.y)*sn;
      const fraction=clamp((.4-start)/toward,Math.min(1,f.elapsed/total),1);
      // Keep the same path and velocity while the contact plane moves with the
      // actual keeper. A retreating goalie must not be judged before arrival.
      f.duration=Math.max(.001,total*fraction);f.goalDuration=Math.max(0,total-f.duration);
      f.end={x:f.start.x+dx*fraction,y:f.start.y+dy*fraction,z:flightVertical(f,f.duration).z};
    }
    readKeeper(f,dt){
      const g=this.actors.find(a=>a.role==='G'&&a.side!==f.side);if(!g)return;
      if(!g.keeperState)this.beginKeeperRead(f);const s=g.keeperState;
      if(g.keeperBody)s.facing=g.keeperBody.facing;
      const sight=this.skaters(0).concat(this.skaters(1)).filter(a=>a.id!==f.shot.playerId).reduce((n,a)=>{const ray=segmentDistance(a,g,this.puck);return ray.t>.07&&ray.t<.95&&ray.d<.36?n+1:n;},0);
      s.screen=Math.min(1,sight*.55);s.elapsed+=dt;s.seen+=dt*(1-s.screen*.8);
      const delay=.055+(20-this.attribute(g,'reflexes'))*.004+(20-this.attribute(g,'composure'))*.0015+s.recovery*.08;
      const active=Math.max(0,Math.min(dt,s.seen-delay));
      if(!active)return;
      // Estimate from visible puck velocity. Deflections force a fresh read of
      // the new path; no access to the finish roll or intended goal location.
      const vx=(f.end.x-f.start.x)/f.duration,vy=(f.end.y-f.start.y)/f.duration;
      const cs=Math.cos(s.facing),sn=Math.sin(s.facing),forward=(this.puck.x-g.x)*cs+(this.puck.y-g.y)*sn,closing=vx*cs+vy*sn;
      const arrival=clamp((.4-forward)/(closing||.001),0,.8);
      const end={x:this.puck.x+vx*arrival,y:this.puck.y+vy*arrival},vertical=flightVertical(f,Math.min(f.duration,f.elapsed+arrival));
      const lateral=-(end.x-g.x)*Math.sin(s.facing)+(end.y-g.y)*Math.cos(s.facing)+s.error;
      const z=vertical.z+.025,move=this.attribute(g,'movement'),rate=3.2+this.attribute(g,'reflexes')*.075;
      s.drop=clamp(s.drop+(z<.53?1:-1)*active*(3.3+move*.07),0,1);
      if(g.keeperBody)g.keeperBody.drop=s.drop;
      for(const [key,sign] of [['glove',g.player.shoots==='R'?1:-1],['blocker',g.player.shoots==='R'?-1:1]]){
        const hand=s[key],targetL=clamp(lateral,sign<0?-.93:.12,sign<0?-.12:.93),targetZ=clamp(z,.34,1.48);
        const dl=targetL-hand.lateral,dz=targetZ-hand.z,length=Math.hypot(dl,dz),step=Math.min(1,active*rate/Math.max(.001,length));
        hand.lateral+=dl*step;hand.z+=dz*step;
      }
    }
    keeperContact(g,puck){
      if(!g||!g.keeperState)return null;
      const s=g.keeperState,lateral=-(puck.x-g.x)*Math.sin(s.facing)+(puck.y-g.y)*Math.cos(s.facing),z=(puck.z||0)+.025;
      const forward=(puck.x-g.x)*Math.cos(s.facing)+(puck.y-g.y)*Math.sin(s.facing);
      if(Math.abs(forward)>.95)return null;
      const drop=s.drop,equipment=skating.keeper({drop,load:g.keeperBody?.load||0,catchSide:g.player.shoots==='R'?1:-1,glove:s.glove,blocker:s.blocker});
      const {bodyBottom,bodyTop}=equipment;
      if(z<.13&&Math.abs(lateral-equipment.blade[2])<.34+drop*.16&&Math.abs(forward-equipment.blade[0])<.36)return {style:'stick',lateral,z};
      if(Math.abs(lateral)<.34&&z>=bodyBottom&&z<=bodyTop)return {style:z<.55?'butterfly':'body',lateral,z};
      // Pads spread as the actual butterfly develops. The five-hole closes last.
      // A moving butterfly cannot keep both legs at maximum extension. The
      // same remaining spread is used by the rendered legs, not a save roll.
      if(equipment.pads.some(p=>z<p.top&&Math.abs(lateral-p.center[2])<p.width))return {style:'butterfly',lateral,z};
      for(const [key,rx,rz] of [['glove',.245,.27],['blocker',.21,.24]]){
        const hand=equipment[key];if(((lateral-hand[2])/rx)**2+((z-hand[1])/rz)**2<=1)return {style:key,lateral,z};
      }
      return null;
    }
    shotQuality(a){return this.shotModel(a).quality;}
    pass(a,b){
      this.rebound=null;
      const end={x:b.x+b.vx*.25,y:b.y+b.vy*.25};end.x=clamp(end.x,1,59);end.y=clamp(end.y,1,29);
      if(progress(a.side,a.x)<40&&progress(a.side,end.x)>40&&this.skaters(a.side).some(p=>p.id!==a.id&&progress(a.side,p.x)>40.3))return false;
      // Planning estimates include the lane and receiver. Release accuracy
      // only concerns the passer: interceptions and control are now separate
      // physical stages and must not be charged a second time here.
      const chance=clamp(this.passChance(a,b)+this.laneRisk(a,b)*.45+(10-this.attribute(b,'puckControl'))*.005,.15,.98),success=this.random()<chance;
      this.stats[a.side].passAttempts++;this.playerEvent(a,'passAttempts');
      const interceptors=this.skaters(1-a.side).map(d=>({actor:d,...segmentDistance(d,a,end)})).filter(row=>row.t>.12&&row.t<.92&&row.d<2.1).sort((x,y)=>x.t-y.t);
      // Accuracy sets the trajectory. No defender or reception result is
      // selected until the moving puck actually reaches a stick or body.
      if(!success){end.x=clamp(end.x+(this.random()-.5)*6,1,59);end.y=clamp(end.y+(this.random()-.5)*6,1,29);}
      this.flight={kind:'pass',contactVersion:1,from:a.id,fromName:a.player.name,to:b.id,start:{...this.puck},end,elapsed:0,duration:Math.max(.24,distance(this.puck,end)/(15+this.attribute(a,'passing')*.22)),chance,success,side:a.side};
      // A short completed pass through a covered lane can clear a stick. Its
      // launch velocity lands it back on the ice at the intended receiver.
      const loft=success&&interceptors.length&&distance(a,end)<14&&this.attribute(a,'passing')>=12;
      this.flight.vertical={z:this.puck.z||0,vz:loft?GRAVITY*this.flight.duration/2:0};
      this.recordAction(a,'pass',end);
      this.carrier=null;this.decision=1.2;
      this.say('pass',a.player.name+' söker '+b.player.name.split(' ').at(-1)+'.',a.side);return true;
    }
    shoot(a){
      const context=this.shotContext(a);if(context.behind){delete a.shotPreparation;this.decision=0;return false;}
      delete a.shotPreparation;
      const model=this.shotModel(a,context),goal=point(a.side,56.5,15);
      const blockRoll=this.random(),targetRoll=this.random(),finishRoll=this.random();
      let outcome=targetRoll>model.onTarget?'wide':null;
      const placement=clamp(targetRoll/Math.max(.01,model.onTarget),0,1);
      const placementWidth=clamp(.72+this.attribute(a,'shooting')*.008,.74,.87);
      goal.y=15+Math.sin(placement*Math.PI*4)*placementWidth;
      goal.z=.04+placement*1.04;
      let end={...goal},miss=null;
      if(outcome==='wide'){
        const spread=2.3+this.random()*2;
        miss=(targetRoll-model.onTarget)/Math.max(.01,1-model.onTarget)>.58?'high':'wide';
        if(miss==='high')end.z=1.4+spread*.13;
        else end.y=15+(a.y<15?-1:1)*spread;
      }
      const origin={...this.puck},shot={time:this.time,side:a.side,player:a.player.name,playerId:a.id,role:a.role,x:origin.x,y:origin.y,quality:model.quality,outcome,context,finishRoll,blockChance:model.block,onTargetChance:model.onTarget,liveResolution:true,blockerId:null,miss,assists:this.lastTouches.filter(t=>t.id!==a.id&&this.time-t.time<10).slice(-2).reverse()};
      const velocity=context.type==='Slagskott'?28+this.attribute(a,'strength')*.2:23+this.attribute(a,'shooting')*.22;
      const fullDuration=Math.max(.18,distance(origin,end)/velocity),startZ=this.puck.z||0;
      const vertical={z:startZ,vz:(end.z-startZ)/fullDuration+GRAVITY*fullDuration/2};
      let duration=fullDuration;
      // Resolve at the keeper's front, then let an unbeaten shot cross the
      // actual goal line. A save never appears behind the goalkeeper.
      const keeper=this.actors.find(b=>b.side!==a.side&&b.role==='G');
      let goalLine=null,goalDuration=0;
      if(outcome===null&&keeper){
        const plane=clamp(progress(a.side,keeper.x)-.4,progress(a.side,origin.x)+.15,56.45);
        const fraction=clamp((plane-progress(a.side,origin.x))/(56.5-progress(a.side,origin.x)),.02,1);
        goalLine={...goal};end={x:origin.x+(goal.x-origin.x)*fraction,y:origin.y+(goal.y-origin.y)*fraction};duration=fullDuration*fraction;goalDuration=fullDuration-duration;
      }
      end.z=puckVertical(vertical,duration).z;
      this.flight={kind:'shot',keeperVersion:2,contactVersion:1,contactRoll:blockRoll,start:{...this.puck},end,vertical,goalLine,goalDuration,velocity,elapsed:0,duration,shot,side:a.side};this.carrier=null;this.focusUntil=this.wall+4;
      this.beginKeeperRead(this.flight);this.updateKeeperPlane(this.flight);
      this.recordAction(a,'shot',end,context.oneTimer?'one-timer':context.type==='Slagskott'?'slap':'wrist');
      const reason=context.oneTimer?' möter sidledspassningen med ett direktskott!':context.rebound?' hugger på returen!':context.screen>.3?' skjuter genom trafiken framför mål!':context.pressure>.5?' avslutar under hård press!':context.d<8?' avslutar från slottet!':' skjuter'+(context.angle>.65?' ur snäv vinkel!':' från distans!');
      this.say('shot',a.player.name+reason,a.side,true);return true;
    }
    clear(a){
      const chance=clamp(.77+this.attribute(a,'passing')*.006+this.attribute(a,'composure')*.003-this.pressureAt(a)*.22,.5,.98);
      const success=this.random()<chance,end=point(a.side,success?59:clamp(progress(a.side,a.x)+8,22,38),a.y<15?4:26);
      if(success)this.stats[a.side].clears++;
      this.icingCandidate=success&&progress(a.side,a.x)<30&&!this.isShortHanded(a.side)?{side:a.side}:null;
      this.flight={kind:'clear',contactVersion:1,from:a.id,side:a.side,start:{...this.puck},end,elapsed:0,duration:Math.max(.3,distance(this.puck,end)/18)};
      this.flight.vertical={z:this.puck.z||0,vz:success?3.4+this.attribute(a,'strength')*.055:1.8};
      this.recordAction(a,'clear',end);
      this.carrier=null;this.lastTouches=[];this.setPhase('clear');
      this.say('clear',a.player.name+(success?' rensar ur zonen. Boxplayenheten får andrum.':' pressas och får inte ut pucken ur zonen.'),a.side,true);
      this.advice=success?(a.side===0?'Bra rensning. Vi kan samla boxen och få ner belastningen.':'De rensar. Hämta pucken och bygg upp powerplayet igen.'):'Pucken är kvar i zonen. Boxplaylaget behöver behålla sin täckning.';
    }
    dump(a){
      // A dump lets early forwards tag up while the puck keeps travelling.
      if(progress(a.side,a.x)<30)return false;
      if(this.skaters(a.side).some(b=>b.id!==a.id&&progress(a.side,b.x)>40))this.delayedOffside=a.side;
      const end=this.dumpTarget(a).target;this.stats[a.side].dumps++;
      this.flight={kind:'dump',contactVersion:1,from:a.id,side:a.side,start:{...this.puck},end,elapsed:0,duration:Math.max(.1,distance(this.puck,end)/19)};
      this.flight.vertical={z:this.puck.z||0,vz:this.pressureAt(a)>.4?2.5:0};
      this.recordAction(a,'dump',end);
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
      const style=f.shot.keeperContact?.style||goalie?.keeperAction?.style||'body';
      const freeze=clamp(model.freeze+(style==='glove'?.15:style==='blocker'?-.24:style==='stick'?-.14:0),.15,.94);
      if(this.random()<freeze){
        this.stop('save',name+' räddar och håller fast pucken.',point(f.side,47,f.start.y<15?9:21));
        if(goalie)this.puck.heldBy=goalie.id;return;
      }
      const safe=this.random()<model.safe;
      const facing=goalie?.keeperState?.facing??Math.atan2(f.start.y-this.puck.y,f.start.x-this.puck.x),cs=Math.cos(facing),sn=Math.sin(facing);
      const incomingX=(f.end.x-f.start.x)/f.duration,incomingY=(f.end.y-f.start.y)/f.duration,incomingL=-incomingX*sn+incomingY*cs;
      const lateral=f.shot.keeperContact?.lateral||0,hand=goalie?.player.shoots==='R'?1:-1;
      const side=style==='glove'?hand:style==='blocker'?-hand:Math.abs(lateral)>.12?Math.sign(lateral):Math.abs(incomingL)>.1?Math.sign(incomingL):hand;
      // The contacted surface redirects the incoming velocity. Control chooses
      // how far it is steered; the release always begins at the actual save.
      const forward=(style==='glove'?1.8:3.0)+this.random()*1.7;
      const sideways=safe?side*(6.5+this.attribute(goalie,'reboundControl')*.15+this.random()*1.5):incomingL*.22+side*(.7+this.random()*1.8);
      const vx=cs*forward-sn*sideways,vy=sn*forward+cs*sideways,span=safe?.85:.65;
      const end=rinkLimit({x:this.puck.x+vx*span,y:this.puck.y+vy*span},.04);
      this.rebound={side:f.side,time:this.time,spot:{...end}};
      if(!safe)this.stats[1-f.side].dangerousRebounds++;
      // A rebound travels out from the save. It does not appear magically in the slot.
      this.flight={kind:'rebound',contactVersion:1,side:f.side,start:{...this.puck},end:{x:end.x,y:end.y},elapsed:0,duration:Math.max(.1,distance(this.puck,end)/Math.hypot(vx,vy)),saveStyle:style};
      this.flight.vertical={z:this.puck.z||0,vz:(this.puck.z||0)>.4?-.7:style==='stick'?.35:1.1};
      this.setPhase('loose');this.looseTime=0;
      this.rememberTouch(f.shot.playerId,f.shot.player,f.start.y);
      this.say('rebound',name+(safe?' styr returen ut mot sargen.':' lämnar en lös retur i slottet!'),f.side,true);
    }
    resolveFlight(dt,startWall=this.wall-dt){return this.advanceFlight(dt,startWall);}
    flightContact(f,from,to){
      if(!f.contactVersion||f.preRealism||f.shot&&!f.shot.liveResolution)return null;
      const position=t=>({x:f.start.x+(f.end.x-f.start.x)*t/f.duration,y:f.start.y+(f.end.y-f.start.y)*t/f.duration,z:flightVertical(f,t).z});
      const p=position(from),q=position(to),hits=[];
      const surface=f.framePassed?[netContact(p,q),rinkContact(p,q)].filter(Boolean).sort((a,b)=>a.t-b.t)[0]:puckSurfaceContact(p,q);
      if(surface)hits.push({...surface,elapsed:from+(to-from)*surface.t});
      for(const a of this.actors){
        if(a.role==='G'||a.id===(f.from||f.shot?.playerId)||a.status==='leaving'||f.touched?.includes(a.id))continue;
        if(a.side===f.side&&a.id!==f.to)continue;
        const before=a.sweepStart?.at===this.time?a.sweepStart:a;
        const catching=a.id===f.to&&f.kind==='pass';
        const facing=Math.atan2(a.vy||0,(a.vx||0)||(a.side? -1:1)),sx=-Math.sin(facing)*.23,sy=Math.cos(facing)*.23;
        const shapes=[['body',.30,1.50,.65,0,0],['body',.14,.65,0,sx,sy],['body',.14,.65,0,-sx,-sy],['stick',catching?1.05:.85,.45,0,0,0]];
        for(const [kind,radius,height,bottom,ox,oy] of shapes){
          const t=sweepContact(p,q,{x:before.x+ox,y:before.y+oy},{x:a.x+ox,y:a.y+oy},radius);if(t==null)continue;
          const elapsed=from+(to-from)*t,spot=position(elapsed);
          if(spot.z>height||spot.z<bottom)continue;
          if(f.kind==='shot'&&kind==='stick'){
            const reaction=clamp(distance(f.start,a)/7,.2,1);
            const chance=shotBlockChance(1,{positioning:this.attribute(a,'positioning'),workRate:this.attribute(a,'workRate')})*reaction;
            if((f.contactRoll??1)>=chance)continue;
          }
          hits.push({t,elapsed,kind,actor:a,spot});
        }
      }
      return hits.sort((a,b)=>a.t-b.t||(a.kind==='stick'?-1:1))[0]||null;
    }
    receiveContact(a,f,kind='stick'){
      const vx=(f.end.x-f.start.x)/f.duration,vy=(f.end.y-f.start.y)/f.duration,speed=Math.hypot(vx-a.vx,vy-a.vy);
      const model=receptionModel({control:this.attribute(a,'puckControl')*(1-this.balanceLevel(a)*.35)*(1-this.netFrontHold(a)*.35),composure:this.attribute(a,'composure'),pressure:this.pressureAt(a),speed,height:this.puck.z||0});
      const roll=this.random(),clean=kind==='stick'&&roll<model.clean,bobble=!clean&&(kind==='body'||roll<model.clean+model.bobble);
      this.recordContact(a,clean?'receive':bobble?'bobble':'miss',this.puck,clamp(speed/24,.2,1));
      if(clean){
        const oldPhase=this.phase;this.takePossession(a,{turnover:a.side!==f.side});
        if(this.carrier!==a.id)return;
        if(a.side===f.side&&f.kind==='pass'){
          this.stats[f.side].passes++;this.playerEvent(this.actor(f.from),'passes');
          this.rememberTouch(f.from,this.actor(f.from)?.player.name||f.fromName||'',f.start.y);
          a.receivedPass={time:this.time,y:f.start.y,duration:f.elapsed};
          this.decision=Math.min(this.decision,.24+(20-this.attribute(a,'decisions'))*.012);
          if(oldPhase==='attack'&&progress(a.side,a.x)>40){this.phase='attack';this.attackPasses++;}
          this.say('pass',a.player.name+' tar emot passningen.',a.side);
        }
      }else{
        this.flight=null;this.carrier=null;this.rimPath=null;this.icingCandidate=null;this.setPhase('loose');this.looseTime=0;
        const factor=bobble?.18:.7,angle=Math.atan2(vy,vx)+(bobble?(a.shoots==='R'?1:-1)*.65:0);
        this.puckVelocity={x:Math.cos(angle)*speed*factor,y:Math.sin(angle)*speed*factor,z:bobble?.65:flightVertical(f).vz};
        a.pickupAfter=this.time+(bobble?.22:.4);this.lastTouches=[];this.effect(kind==='body'?'block':'stick',a.side,.5);
        this.say(bobble?'bobble':'loose',a.player.name+(bobble?' får en studsande puck på klubban.':' får inte kontroll på pucken.'),a.side);
      }
    }
    advanceFlight(dt,startWall=this.wall-dt){
      const prior=this._contactWall;
      try{return this.advancePuckFlight(dt,startWall);}finally{if(prior===undefined)delete this._contactWall;else this._contactWall=prior;}
    }
    advancePuckFlight(dt,startWall){
      if(this.flight?.keeperVersion===2&&!this.flight.keeperPassed){this.updateKeeperPlane(this.flight);this.readKeeper(this.flight,Math.min(dt,this.flight.duration-this.flight.elapsed));}
      const f=this.flight;if(!f)return;
      const before={...this.puck};
      const oldElapsed=f.elapsed,left=Math.max(0,f.elapsed+dt-f.duration);
      this.recordPuckPoint(startWall,before);
      const contact=this.flightContact(f,oldElapsed,Math.min(f.duration,f.elapsed+dt));
      f.elapsed=contact?.elapsed??Math.min(f.duration,f.elapsed+dt);let fraction=Math.min(1,f.elapsed/f.duration);
      this.puck={x:f.start.x+(f.end.x-f.start.x)*fraction,y:f.start.y+(f.end.y-f.start.y)*fraction};
      const vertical=flightVertical(f);this._contactWall=startWall+f.elapsed-oldElapsed;
      if(f.vertical){this.puck.z=vertical.z;if(vertical.bounces>flightVertical(f,oldElapsed).bounces)this.effect('ice',f.side,.3);}
      this._contactWall=startWall+f.elapsed-oldElapsed;
      this.recordPuckPoint(this._contactWall);
      if(this.checkIcing(before))return;
      if(contact){
        const velocity={x:(f.end.x-f.start.x)/f.duration,y:(f.end.y-f.start.y)/f.duration,z:vertical.vz};
        if(contact.actor){
          if(f.kind!=='shot'){this.receiveContact(contact.actor,f,contact.kind);return;}
          f.shot.outcome='block';f.shot.blockerId=contact.actor.id;f.goalLine=null;
          this.recordContact(contact.actor,'block',this.puck,.8);
          const dx=this.puck.x-contact.actor.x,dy=this.puck.y-contact.actor.y,n=Math.hypot(dx,dy)||1;
          contact.nx=dx/n;contact.ny=dy/n;contact.nz=0;
        }else if(f.kind==='shot'){
          f.shot.outcome='wide';f.shot.miss=['post','bar'].includes(contact.kind)?contact.kind:'wide';f.goalLine=null;
        }
        const inward=Math.min(0,velocity.x*contact.nx+velocity.y*contact.ny+velocity.z*contact.nz),loss=contact.actor?.24:.65;
        f.contactVelocity=contact.actor?{x:(velocity.x-2*inward*contact.nx)*loss,y:(velocity.y-2*inward*contact.ny)*loss,z:(velocity.z-2*inward*contact.nz)*loss}:surfaceBounce(velocity,contact);
        if(f.shot)f.shot.contact={kind:contact.kind,actor:contact.actor?.id||null,spot:{...this.puck},at:this._contactWall};
        if(!contact.actor)this.effect(contact.kind==='board'?'board':contact.kind==='net'?'stick':'post',f.side,contact.kind==='net'?.2:.9);
        if(!contact.actor&&['post','bar'].includes(contact.kind)&&f.kind==='shot'){
          const v=f.contactVelocity,goalX=progress(f.side,56.5),time=(goalX-this.puck.x)/v.x;
          const y=this.puck.y+v.y*time,z=puckVertical({z:this.puck.z||0,vz:v.z},time).z;
          // A glancing post/bar contact can still send the puck into the net.
          // Keep travelling and award the goal only at the later line crossing.
          if(time>1e-6&&time<.12&&Math.abs(y-15)<.832&&z<1.15){
            f.shot.outcome='goal';f.shot.woodwork=contact.kind;f.shot.miss=null;
            this.flight={...f,start:{...this.puck},end:{x:goalX,y,z},vertical:{z:this.puck.z||0,vz:v.z},elapsed:0,duration:time,goalLine:null,keeperPassed:true,framePassed:true};
            const remaining=dt-(f.elapsed-oldElapsed);if(remaining>1e-9)this.advanceFlight(remaining,this._contactWall);return;
          }
        }
        fraction=1;
      }
      if(!f.contactVersion&&['clear','dump'].includes(f.kind)){
        const touching=(this.puck.z||0)<=.45&&this.skaters(1-f.side).find(a=>distance(a,this.puck)<.8);
        if(touching){this.takePossession(touching,{turnover:true});return;}
      }
      if(fraction<1)return;
      this.flight=null;
      if(f.kind==='intercept'){
        const defender=this.actor(f.to);
        if(defender&&distance(defender,this.puck)<2.4&&(this.puck.z||0)<=.45)this.takePossession(defender,{turnover:true});
        else{this.setPhase('loose');this.lastTouches=[];this.looseTime=0;this.say('loose','Passningen bryts och pucken blir lös.',f.side);}
      }else if(f.kind==='pass'&&f.contactVersion){
        // A receiver who left the lane cannot catch a pass at a distance.
        this.setPhase('loose');this.lastTouches=[];this.looseTime=0;this.glideFrom(f,.85);
        this.say('loose','Passningen når inte klubban. Pucken fortsätter över isen.',f.side);
      }else if(f.kind==='pass'){
        const from=this.actor(f.from),to=this.actor(f.to);
        if(to&&distance(to,this.puck)<2.4&&f.success&&(this.puck.z||0)<=.45){
          const previous=this.phase;this.takePossession(to);if(previous==='attack'&&progress(to.side,to.x)>40){this.phase='attack';this.attackPasses++;}
          this.stats[f.side].passes++;this.playerEvent(from,'passes');
          if(f.preRealism)this.stats[f.side].priorPasses++;
          this.rememberTouch(f.from,from?.player.name||f.fromName||'',f.start.y);
          to.receivedPass={time:this.time,y:f.start.y,duration:f.duration};
          this.say('pass',to.player.name+' tar emot passningen.',f.side);
        }else{this.setPhase('loose');this.lastTouches=[];this.looseTime=0;this.say('loose','Passningen bryts. Båda lagen söker pucken.',f.side);}
      }else if(f.kind==='shot'){
        const shot=f.shot;
        if(shot.liveResolution&&shot.outcome===null&&!f.keeperVersion){
          const player=this.teams[f.side].players.find(p=>f.side+':'+p.id===shot.playerId);
          const shooter={side:f.side,id:shot.playerId,role:shot.role||this.actor(shot.playerId)?.role,player,x:shot.x,y:shot.y};
          const model=this.shotModel(shooter,shot.context);
          shot.quality=(1-shot.blockChance)*shot.onTargetChance*model.goalChance;shot.outcome=finishShot(model,shot.finishRoll);shot.alignment=model.alignment;
        }
        const goalie=this.actors.find(a=>a.side!==f.side&&a.role==='G');
        if(f.keeperVersion===2&&shot.outcome===null){const contact=this.keeperContact(goalie,this.puck);shot.outcome=contact?'save':'goal';shot.keeperContact=contact;shot.keeperRead=goalie?.keeperState?{seen:goalie.keeperState.seen,screen:goalie.keeperState.screen,drop:goalie.keeperState.drop}:null;shot.alignment=goalie?clamp(distance(goalie,this.goalieTarget(goalie.side,f.start))/2.5,0,1):1;}
        if(f.vertical&&shot.outcome!=='block'&&!['post','bar'].includes(shot.contact?.kind)){
          const target=f.keeperPassed?this.puck:f.goalLine||this.puck;
          if((target.z||0)>1.17||Math.abs(target.y-15)>.87){shot.outcome='wide';shot.miss=(target.z||0)>1.17?'high':'wide';}
        }
        if(f.goalLine&&!f.keeperPassed){
          // A keeper cannot save a shot beyond the actual pad/glove reach.
          if(shot.outcome==='save'&&(!goalie||distance(goalie,this.puck)>1.5))shot.outcome='goal';
          this.recordKeeper(goalie,f,shot.outcome==='save');
          if(shot.outcome==='goal'){
            this.flight={...f,start:{...this.puck},end:{...f.goalLine},vertical:{z:vertical.z,vz:vertical.vz},elapsed:0,duration:Math.max(.001,f.goalDuration??distance(this.puck,f.goalLine)/f.velocity),keeperPassed:true};
            // Large explicit steps still resolve once, without re-entering
            // the career ledger or the production deflection wrappers.
            if(left>1e-9)this.advanceFlight(left,this._contactWall);
            return;
          }
        }else if(shot.outcome==='save')this.recordKeeper(goalie,f,true);
        shot.height=this.puck.z||0;shot.resolvedAt=this._contactWall;
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
          this.puckFall=vertical.vz;this.effect('goal',f.side);
        }else if(shot.outcome==='save'){
          this.stats[1-f.side].saves++;
          this.saveRebound(goalie,f);
        }else{
          this.glideFrom(f,shot.outcome==='block'?.22:.72);
          this.effect(shot.outcome==='block'?'block':'miss',shot.outcome==='block'?1-f.side:f.side);
          this.setPhase('loose');this.looseTime=0;this.say(shot.outcome,shot.player+(shot.outcome==='block'?' får skottet blockerat.':shot.miss==='post'?' träffar stolpen!':shot.miss==='bar'?' träffar ribban!':shot.miss==='high'?' skjuter över ribban. Pucken går bakom mål.':' skjuter utanför. Pucken går bakom mål.'),f.side,true);
        }
        this.pendingReplayShot=shot;this.lastShot=shot;
      }else{this.setPhase('loose');this.looseTime=0;this.glideFrom(f,.85);
        if(!f.contactVelocity&&(f.kind==='dump'||f.kind==='clear'&&progress(f.side,this.puck.x)>56)){
          const low=this.puck.y<15;this.rimPath=[point(f.side,59,low?7:23),point(f.side,59,low?23:7),point(f.side,57,low?28.8:1.2),point(f.side,48,low?29:1)];
        }
      }
      if(!this.carrier&&!this.flight&&!this.stoppage&&!this.puckVelocity)this.glideFrom(f,.55);
      if(contact&&['board','net'].includes(contact.kind)&&!this.carrier&&!this.flight&&!this.stoppage){
        this.rimPath=null;
        this.puck.x+=contact.nx*.002;this.puck.y+=contact.ny*.002;this.puck.z=Math.max(0,(this.puck.z||0)+contact.nz*.002);
        const remaining=dt-(f.elapsed-oldElapsed);if(remaining>1e-9)this.moveFreePuck(remaining,this._contactWall);
      }
    }
    glideFrom(f,factor=1){
      if(f.contactVelocity){this.puckVelocity={...f.contactVelocity};return;}
      this.puckVelocity={x:(f.end.x-f.start.x)/Math.max(.1,f.duration)*factor,y:(f.end.y-f.start.y)/Math.max(.1,f.duration)*factor};
      if(f.vertical)this.puckVelocity.z=flightVertical(f).vz*factor;
    }
    checkIcing(before){
      const c=this.icingCandidate;if(!c)return false;
      if(progress(c.side,before.x)<56.5&&progress(c.side,this.puck.x)>=56.5){
        const race=this.skaters(c.side).some(a=>progress(c.side,a.x)>54&&distance(a,this.puck)<3);
        if(!race){this.icingHold=c.side;this.stop('icing','Icing. Pucken passerar förlängda mållinjen utan beröring. Inget byte för laget som rensade.',point(c.side,13,this.puck.y<15?9:21));return true;}
        this.icingCandidate=null;
      }return false;
    }
    moveFreePuck(dt,startWall=this.wall-dt){
      const prior=this._contactWall;
      try{return this.advanceFreePuck(dt,startWall);}finally{if(prior===undefined)delete this._contactWall;else this._contactWall=prior;}
    }
    advanceFreePuck(dt,startWall){
      const v=this.puckVelocity;if(!v||!Number.isFinite(dt)||dt<=0)return;
      this.recordPuckPoint(startWall);
      const rest=()=>{this.puckVelocity=null;this.rimPath=null;this.icingCandidate=null;};
      // Fixed small slices preserve save/reload and split-step equivalence.
      // Every impact consumes only the time spent reaching its actual surface.
      for(let remaining=dt;remaining>1e-9;){
        const h=Math.min(.05,remaining);remaining-=h;
        for(let left=h,contacts=0;left>1e-9&&contacts<8;){
          let speed=Math.hypot(v.x,v.y);
          const airborne=(this.puck.z||0)>0||Math.abs(v.z||0)>.45;
          if(speed<=.12&&!airborne){rest();return;}
          const target=this.rimPath?.[0];let step=left;
          if(target&&speed>1e-9){
            const d=distance(this.puck,target);if(d<1e-7){this.rimPath.shift();continue;}
            const ux=(target.x-this.puck.x)/d,uy=(target.y-this.puck.y)/d;
            const loss=.85+.15*clamp((v.x*ux+v.y*uy)/speed,-1,1);v.x=ux*speed*loss;v.y=uy*speed*loss;speed*=loss;
            if(d<(speed+Math.max(0,speed-1.8*left))*.5*left)step=Math.min(left,(speed-Math.sqrt(Math.max(0,speed*speed-3.6*d)))/1.8);
          }
          const next=Math.max(0,speed-1.8*step),travel=(speed+next)*.5*step,before={...this.puck};
          const initial={z:before.z||0,vz:v.z||0},vertical=puckVertical(initial,step);
          const end={x:before.x+(speed?v.x/speed*travel:0),y:before.y+(speed?v.y/speed*travel:0),z:vertical.z},contact=puckSurfaceContact(before,end);
          const travelled=travel*(contact?.t??1),spent=contact?(travel>1e-9?Math.min(step,2*travelled/Math.max(.001,speed+Math.sqrt(Math.max(0,speed*speed-3.6*travelled)))):step*contact.t):step;
          const flight=puckVertical(initial,spent),fraction=contact?.t??1;
          this.puck={x:before.x+(end.x-before.x)*fraction,y:before.y+(end.y-before.y)*fraction,z:flight.z};
          this._contactWall=startWall+dt-remaining-left+spent;this.recordPuckPoint(this._contactWall);
          const scale=speed?Math.max(0,speed-1.8*spent)/speed:0;v.x*=scale;v.y*=scale;v.z=flight.vz;
          if(flight.bounces)this.effect('ice',this.owner,.3);
          if(this.checkIcing(before))return;
          left-=spent;
          if(contact){
            this.puck.x+=contact.nx*.002;this.puck.y+=contact.ny*.002;this.puck.z=Math.max(0,this.puck.z+contact.nz*.002);
            Object.assign(v,surfaceBounce(v,contact));this.rimPath=null;contacts++;
            this.effect(contact.kind==='board'?'board':contact.kind==='net'?'stick':'post',this.owner,contact.kind==='net'?.2:.7);
          }else if(target&&distance(this.puck,target)<1e-6)this.rimPath.shift();
          // Restore a legacy out-of-bounds loose puck once, then keep the sweep
          // authoritative. New motion reaches the wall before this guard.
          const bounded=rinkLimit(this.puck,.12);
          if(bounded.hit){this.puck.x=bounded.x;this.puck.y=bounded.y;const dot=v.x*bounded.nx+v.y*bounded.ny;if(dot>0)Object.assign(v,surfaceBounce(v,{kind:'board',nx:-bounded.nx,ny:-bounded.ny,nz:0}));this.rimPath=null;}
          if(Math.hypot(v.x,v.y)<=.12&&this.puck.z===0&&Math.abs(v.z||0)<=.45){rest();return;}
        }
      }
    }
    decide(){
      const a=this.actor(this.carrier);if(!a)return;
      if(this.balanceLevel(a)>.32){this.decision=.1;a.duty='Återfår balansen innan nästa puckbeslut';return;}
      const t=this.teams[a.side],p=progress(a.side,a.x),opponents=this.skaters(1-a.side),nearest=[...opponents].sort((b,c)=>distance(a,b)-distance(a,c))[0];
      const pk=this.isShortHanded(a.side),pp=this.hasPowerPlay(a.side);
      this.decision=this.readDelay(a)+.2+this.random()*.35;
      if(nearest&&distance(a,nearest)<2&&this.time>(a.contactUntil||0)){
        const reaching=distance(a,nearest)>1.5?1.35:1;
        const penaltyRisk=(.003+(20-this.attribute(nearest,'discipline'))*.0012)*reaching;
        if(this.canGivePenalty(nearest.side)&&this.random()<penaltyRisk){this.givePenalty(nearest.side,{playerId:nearest.player.id});return;}
        if(this.random()<this.battleChance(nearest,a)&&this.startBattle(a,nearest))return;
      }
      // Delayed offside is a rule constraint, not a preference to gamble on.
      if(p>=30&&p<40&&(this.delayedOffside===a.side||this.skaters(a.side).some(b=>b.id!==a.id&&progress(a.side,b.x)>40.1))&&this.dump(a))return;
      const choice=this.chooseAction(a);a.duty=choice.reason;this.advice=choice.reason;
      if(choice.kind==='shoot'){
        const context=this.shotContext(a);
        if(context.oneTimer){this.shoot(a);return;}
        // Contact is a fixed-step event. Use its actual scheduled timestamp in
        // the rig too; .18/.32 windups used to finish before the .2/.4 release.
        const delay=Math.ceil((context.type==='Slagskott'?.32:.18)/STEP)*STEP;
        a.shotPreparation={at:this.wall,releaseAt:this.time+delay,duration:delay,style:context.type==='Slagskott'?'slap':'wrist',target:point(a.side,56.5,15)};
        a.duty='Förbereder avslutet';this.decision=delay;return;
      }
      if(choice.kind==='pass'){const receiver=this.actor(choice.to);if(receiver)this.pass(a,receiver);return;}
      if(choice.kind==='dump'){this.dump(a);return;}
      if(choice.kind==='clear'){this.clear(a);return;}
      a.carryPlan={until:this.time+this.decision+.15,target:choice.target||{x:a.x,y:a.y},reason:choice.reason};
      if(choice.kind==='shield'){a.shieldUntil=this.time+this.decision;this.recordContact(a,'protect',this.puck,.5,nearest);}
    }

    isShortHanded(side){return this.penalty?.side===side;}
    hasPowerPlay(side){return Boolean(this.penalty&&this.penalty.side!==side);}
    canGivePenalty(){return !this.penalty;}
    tickPenalties(dt){if(this.penalty){this.penalty.remaining-=dt;if(this.penalty.remaining<=0)this.endPenalty();}}
    goalPenalty(side){if(this.hasPowerPlay(side))this.endPenalty(true);}
    givePenalty(side,reference){
      if(!this.canGivePenalty(side))return false;
      const offender=penaltyOffender(this,side,reference),p=penaltyRecord(this,offender,'minor','hooking','hakning');if(!p)return false;
      this.penalty=p;this.penaltySequence=p.sequence;
      // Stoppage is the only place where the short-handed unit is installed instantly.
      this.installUnit(side);this.stop('penalty',p.name+' utvisas två minuter för hakning.',point(1-side,47,9));
      this.advice=side===0?'Boxplay. Håll mitten och rensa när vi vinner pucken.':'Powerplay. Ställ upp och flytta pucken innan avslutet.';
      return p;
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
      const dt=STEP;this.recordPuckPoint(this.wall);this.wall+=dt;this.tick++;
      for(const g of this.actors.filter(a=>a.role==='G'))this.updateKeeperBody(g,dt);
      if(this.stoppage>0){
        this.stoppage-=dt;
        if((this.puck.z||0)>0&&!this.puck.heldBy){const v=puckVertical({z:this.puck.z,vz:this.puckFall||0},dt);this.puck.z=v.z;this.puckFall=v.vz;}
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
        const closest=[...this.skaters(0),...this.skaters(1)].filter(a=>a.status!=='leaving'&&!(a.pickupAfter>this.time)).sort((a,b)=>distance(a,this.puck)-distance(b,this.puck));
        const first=closest.find(a=>distance(a,this.puck)<1.1*(1-this.netFrontHold(a)*.25)),rival=first&&closest.find(a=>a.side!==first.side);
        if(first&&(this.puck.z||0)<=.45){
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
        if(a.shotPreparation){if(this.time+1e-7>=a.shotPreparation.releaseAt)this.shoot(a);}
        else{this.decision-=dt;if(this.decision<=0){this.decision=1.1+this.random()*.7;this.decide();}}
      }
      const bucket=Math.floor(this.time/10);if(!this.pressure[bucket])this.pressure[bucket]={home:0,away:0};
      if(progress(this.owner,this.puck.x)>40){this.pressure[bucket][this.owner===0?'home':'away']+=dt;this.stats[this.owner].zone+=dt;}
      this.focus=this.phase==='attack'||this.phase==='counter'||this.phase==='stoppage'||this.phase==='faceoff'||Boolean(this.penalty)||this.wall<this.focusUntil;
      this.capture();
    }
    presentationFrame(){
      const f=this.flight;
      // Presentation receives observed flight data, never hidden outcome rolls.
      return {time:this.time,wall:this.wall,reset:this.presentationReset||0,score:[...this.score],phase:this.phase,caption:this.caption,eventType:this.eventType,puck:{...this.puck},carrier:this.carrier,owner:this.owner,
        periodStart:this.periodStart||0,period:Math.min(4,1+Math.floor((this.periodStart||0)/1200)),
        strength:[0,1].map(side=>this.skaters(side).length),
        penalties:(this.penaltyList?.()||(this.penalty?[this.penalty]:[])).map(p=>({side:p.side,name:p.name,remaining:p.remaining})),
        effects:(this.effects||[]).filter(e=>this.wall-e.at<3).map(e=>({...e})),
        ...(this.puckPath?.length?{puckPath:[...this.puckPath.filter(p=>this.wall-p.at<=.4).map(p=>({...p})),{at:this.wall,x:this.puck.x,y:this.puck.y,z:this.puck.z||0}]}:{}),
        actors:this.actors.map(a=>({id:a.id,side:a.side,role:a.role,name:a.player.name,number:a.player.jerseyNumber||this.teams[a.side].players.findIndex(p=>p.id===a.player.id)+1,shoots:a.player.shoots||null,x:a.x,y:a.y,vx:a.vx,vy:a.vy,travelled:a.travelled||0,duty:a.duty,status:a.status,
          energy:this.energyLevel(a),height:a.player.height||null,weight:a.player.weight||null,markedThreat:a.markedThreat||null,target:{...a.target},
          ...(a.footPlants?{footPlants:a.footPlants.map(p=>p?{...p}:null)}:{}),
          ...(a.motion?{motion:{...a.motion}}:{}),
          ...(a.skateState?{skateState:{...a.skateState}}:{}),
          ...(a.stickControl?{stickControl:{...a.stickControl}}:{}),
          ...(a.netFront&&a.netFront.until>this.time?{netFront:{...a.netFront,hold:this.netFrontHold(a)}}:{}),
          ...(a.keeperBody?{keeperBody:{...a.keeperBody}}:{}),
          ...(a.balanceState&&this.wall<a.balanceState.until?{balanceState:{...a.balanceState}}:{}),
          ...(a.shotPreparation?{windup:{...a.shotPreparation,target:{...a.shotPreparation.target}}}:{}),
          ...(a.contactAction&&this.wall-a.contactAction.at<1.3?{contactAction:{...a.contactAction,spot:{...a.contactAction.spot}}}:{}),
          ...(a.keeperState?{keeperState:{at:a.keeperState.at,drop:a.keeperState.drop,facing:a.keeperState.facing,glove:{...a.keeperState.glove},blocker:{...a.keeperState.blocker}}}:{}),
          ...(a.keeperAction&&this.wall-a.keeperAction.at<1.6?{keeperAction:{...a.keeperAction,contact:{...a.keeperAction.contact},origin:{...a.keeperAction.origin}}}:{}),
          ...(a.presentationAction&&this.wall-a.presentationAction.at<1?{action:{...a.presentationAction,origin:{...a.presentationAction.origin},target:{...a.presentationAction.target}}}:{})})),
        flight:f?{kind:f.kind,start:{...f.start},end:{...f.end},from:f.from??f.shot?.playerId??null,to:f.to??null,side:f.side,elapsed:f.elapsed,duration:f.duration}:null};
    }
    capture(){
      const frame=this.presentationFrame();
      if(Math.abs((this.history.at(-1)?.wall??-Infinity)-frame.wall)<1e-7)this.history[this.history.length-1]=frame;
      else this.history.push(frame);
      if(this.history.length>300)this.history.shift();
      if(this.pendingReplayShot){this.latestReplay={shot:this.pendingReplayShot,frames:this.history.filter(f=>this.wall-f.wall<14)};this.replayTailUntil=this.wall+.8;this.pendingReplayShot=null;}
      else if(this.latestReplay&&this.replayTailUntil){
        // Keep the actually observed recovery after a shot, without mutating a
        // replay already being viewed or inventing future frames while paused.
        if(this.wall>this.replayTailUntil+1e-7||this.phase==='faceoff')this.replayTailUntil=null;
        // Hydration rebuilds history at the saved tick. It is not a new tick
        // and must not append the same frame to the saved replay a second time.
        else if(frame.wall>(this.latestReplay.frames.at(-1)?.wall??-Infinity)+1e-7)this.latestReplay={shot:this.latestReplay.shot,frames:[...this.latestReplay.frames.filter(f=>frame.wall-f.wall<14),frame]};
      }
    }
    snapshot(){return this.history.at(-1);}
    loadScenario(scenario){
      if(scenario==='period')return;
      this.stoppage=0;this.phase='attack';this.phaseTime=0;this.owner=scenario==='pk'?1:0;
      if(scenario==='pp'||scenario==='pk'){const side=1-this.owner;this.penalty={side,remaining:120,name:'Testläge'};this.installUnit(side);}
      const carrier=this.skaters(this.owner).find(a=>a.role==='LW');this.carrier=carrier.id;this.puck=point(this.owner,48,6);Object.assign(carrier,this.puck);
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
  return {Match,STEP,PHASES,ROLE_NAMES,progress,distance,rinkLimit,netObstacle,skateVelocity,puckVertical,flightVertical,keeperStyle,sweepContact,goalFrameContact,rinkContact,netContact,puckSurfaceContact,receptionModel,evaluateShot,shootoutChance,resolveShootout,shotBlockChance,shotFlightOutcome,finishShot,shotTacticalBias,pressureWinChance,penaltyCount,activePenalties,strengthState,penaltyOffender,penaltyRecord,penaltyDetails};
})();
if(typeof module!=="undefined")module.exports=StudioHockey;
