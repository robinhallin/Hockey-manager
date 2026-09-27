"use strict";

// Match Engine 4: additive hockey intelligence around the authoritative Match.
(function installMatchEngine4PlayerDecisions(){
  if(typeof StudioHockey==='undefined'||StudioHockey.Match.prototype.matchEngine4PlayerDecisionsInstalled)return;
  const proto=StudioHockey.Match.prototype,baseActionOptions=proto.actionOptions,baseDefenseTargets=proto.defenseTargets,baseDump=proto.dump,baseResolveFlight=proto.resolveFlight,baseTargets=proto.targets;
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),centered=(m,a,k)=>clamp((m.attribute(a,k)-10)/10,-.55,.75);
  function zoneRead(m,a){
    const p=StudioHockey.progress(a.side,a.x),pressure=m.pressureAt(a);
    const mates=m.skaters(a.side).filter(b=>b.id!==a.id&&!['leaving','entering'].includes(b.status));
    const ahead=mates.filter(b=>StudioHockey.progress(a.side,b.x)>p);
    return {p,pressure,lineRush:p>=32&&p<40,breakout:p<23,
      offside:ahead.filter(b=>StudioHockey.progress(a.side,b.x)>40).length,
      onsideAhead:ahead.filter(b=>StudioHockey.progress(a.side,b.x)<=40).length,
      support:mates.filter(b=>Math.abs(StudioHockey.progress(a.side,b.x)-p)<9).length,
      outlets:ahead.filter(b=>StudioHockey.progress(a.side,b.x)<32&&m.pressureAt(b)<.38).length};
  }
  proto.actionOptions=function(a){
    const rows=baseActionOptions.call(this,a);
    if(!a||a.role==='G')return rows;
    const r=zoneRead(this,a),pressure=r.pressure,p=r.p;
    const shooting=centered(this,a,'shooting'),passing=centered(this,a,'passing'),vision=centered(this,a,'vision');
    const decisions=centered(this,a,'decisions'),control=centered(this,a,'puckControl'),skating=centered(this,a,'skating');
    const composure=centered(this,a,'composure'),strength=centered(this,a,'strength'),work=centered(this,a,'workRate');
    for(const row of rows){
      row.identityReason=({shoot:'Avslut och kyla',pass:'Passning, spelförståelse och beslut',
        carry:'Puckkontroll, skridskoåkning och beslut',shield:'Puckkontroll, styrka och kyla',
        dump:'Beslut och arbetskapacitet',clear:'Beslut och kyla'})[row.kind]||'Situationsbedömning';
      if(row.kind==='shoot'){
        const c=this.shotContext(a);
        row.value+=shooting*.085*clamp(1-c.pressure*.45,.55,1)+composure*.025;
        if(p<47&&c.d>14)row.value-=decisions*.035;
      }
      if(row.kind==='pass')row.value+=passing*.055+vision*.05+decisions*.03+composure*pressure*.025;
      const pattern=this.teams[a.side].attackPattern,planned=pattern?.receiver;
      if(row.kind==='pass'&&row.to===planned){const receiver=this.actor(row.to);if(receiver&&this.laneRisk(a,receiver)<.45){row.value+=.035*this.attribute(a,'decisions')/20;row.reason='Söker nästa passning i lagets pågående kombination';}}
      if(row.kind==='carry')row.value+=control*.055+skating*.035+decisions*.02+control*pressure*.025;
      if(row.kind==='shield')row.value+=control*.05+strength*.045+composure*.035;
      if(row.kind==='dump')row.value+=(decisions*.035+work*.02)*clamp(.35+pressure,.35,1.2);
      if(row.kind==='clear')row.value+=decisions*.035+composure*.025;
      if(r.breakout){
        const hard=pressure>.42;
        row.zoneReason=r.outlets?'Söker förstapass genom öppet understöd':'Pressen stänger förstapasset';
        if(row.kind==='pass')row.value+=r.outlets*.035+(passing+vision+decisions)*.025-(hard&&r.outlets===0?.13:0);
        if(row.kind==='carry')row.value+=r.outlets?-.025:clamp((control+skating+decisions)*.035-pressure*.12,-.11,.08);
        if(row.kind==='shield')row.value+=(hard?.07:0)+control*.02+composure*.018;
        if(row.kind==='clear')row.value+=(hard&&r.outlets===0?.14:-.06)+decisions*.02;
      }
      if(r.lineRush){
        row.zoneReason=r.offside?(row.kind==='dump'?'Dumpar djupt medan medspelarna taggar upp':'Väntar på att medspelarna lämnar anfallszonen'):'Läser understödet vid blålinjen';
        if(row.kind==='carry')row.value+=r.offside?-.65-r.offside*.12:clamp((control+skating+decisions)*.035-pressure*.11,-.08,.12);
        if(row.kind==='pass')row.value+=r.offside?-.18:clamp((passing+vision)*.025+r.onsideAhead*.018,-.04,.09);
        if(row.kind==='dump'){
          const forced=pressure>.32||r.offside>0||r.support<2;
          // Missing nearby support alone is not a reason to dump every entry.
          // Tag-up is urgent; pressure makes surrendering possession useful,
          // while an onside carrier can still skate or find a passing lane.
          const urgency=r.offside?.36:pressure>.42?.14:r.support<2?.06:-.045;
          row.value+=urgency+decisions*(forced?.025:.01);
        }
      }
    }
    return rows.sort((x,y)=>y.value-x.value);
  };
  proto.defenseTargets=function(side){
    baseDefenseTargets.call(this,side);
    const carrier=this.actor(this.carrier);
    if(!carrier||carrier.side===side||this.isShortHanded(side))return;
    // Every target below uses the defending team's frame: own goal is 0.
    // Mixing enemy progress with this frame mirrors targets behind the rush.
    const enemyP=StudioHockey.progress(carrier.side,carrier.x);
    const ownP=StudioHockey.progress(side,carrier.x);
    const point=(p,y)=>({x:StudioHockey.progress(side,p),y});
    const defenders=this.skaters(side).filter(a=>!['leaving','entering'].includes(a.status));
    const forwards=defenders.filter(a=>!a.role.endsWith('D')),backs=defenders.filter(a=>a.role.endsWith('D'));
    if(enemyP<30&&forwards.length){
      // Keep an established F1 until another forward has a meaningful lead.
      // This avoids swapping the pressure assignment every simulation tick.
      const team=this.teams[side],cost=a=>StudioHockey.distance(a,carrier)-(team.forecheckLead===a.id?1.7:0);
      const ranked=[...forwards].sort((a,b)=>cost(a)-cost(b));team.forecheckLead=ranked[0]?.id;
      const [f1,f2,f3]=ranked;
      const passive=team.forecheck==='passive',aggressive=team.forecheck==='aggressive';
      if(f1)this.assign(f1,point(clamp(ownP-(passive?4.5:aggressive?.25:.7),1,59),clamp(carrier.y+(carrier.y<15?1:-1),2,28)),passive?'F1 styr från mittzonen och håller avstånd':'F1 styr puckföraren mot sargen');
      if(f2){
        const outlet=this.skaters(carrier.side).filter(a=>a.id!==carrier.id&&!['leaving','entering'].includes(a.status))
          .sort((a,b)=>StudioHockey.distance(a,carrier)-StudioHockey.distance(b,carrier))[0];
        const outletP=outlet?StudioHockey.progress(side,outlet.x):ownP-5;
        this.assign(f2,point(clamp(Math.min(ownP-(passive?7:2),outletP-(aggressive?.3:1)),6,47),clamp(outlet?(outlet.y+carrier.y)/2:15,5,25)),'F2 stänger förstapasset och skyddar mitten');
      }
      if(f3)this.assign(f3,point(clamp(ownP-8,12,42),15),'F3 ligger ovanför pucken och säkrar mitten');
    }
    if(enemyP>=22&&enemyP<43){
      for(const b of backs){
        const read=(this.attribute(b,'positioning')*.45+this.attribute(b,'decisions')*.35+this.attribute(b,'skating')*.2)/20;
        const desired=clamp(5.7-Math.hypot(carrier.vx||0,carrier.vy||0)*.42-read*1.35,2.1,5.5);
        this.assign(b,point(clamp(ownP-desired,6,47),clamp(carrier.y*.58+(b.role==='LD'?11:19)*.42,6,24)),'Håller gap och skyddar insidan');
      }
      if(enemyP>=30)for(const [i,a] of forwards.entries()){
        const threat=this.actor(a.markedThreat),lane=threat?threat.y:11+i*4;
        this.assign(a,point(clamp(ownP-2-i*1.2,8,40),clamp(lane*.7+15*.3,6,24)),i?'Backcheckar och plockar upp släpande spelare':'Backcheckar genom mitten och tar första sena hotet');
      }
    }
    // Once the rush is established in our zone, retain the base engine's
    // individual marking instead of pulling forwards back to neutral ice.
  };
  proto.collectiveTargets=function(){
    const carrier=this.actor(this.carrier);if(!carrier)return;
    const side=carrier.side,p=StudioHockey.progress(side,carrier.x),team=this.teams[side];
    const mates=this.skaters(side).filter(a=>a.id!==carrier.id&&a.status==='playing');
    const pp=this.hasPowerPlay(side),pk=this.isShortHanded(side);
    if(p<32&&!pk&&mates.length>=2){
      const forwards=mates.filter(a=>!a.role.endsWith('D'));
      const support=[...forwards,...mates.filter(a=>a.role.endsWith('D'))].sort((a,b)=>StudioHockey.distance(a,carrier)-StudioHockey.distance(b,carrier)).slice(0,2);
      const span=team.attackStyle==='counter'||team.tactics.mentality==='direct'?8:5.5;
      support.forEach((a,i)=>{
        const lane=carrier.y<15?1:-1,offset=i?lane*span:-lane*3.5;
        const target={x:StudioHockey.progress(side,clamp(p+(i?5:-2.5),5,37.5)),y:clamp(carrier.y+offset,3,27)};
        // Evaluate the two sides of the support triangle against actual lanes.
        const alternative={...target,y:clamp(30-target.y,3,27)};
        if(this.laneRisk(carrier,alternative)+.18<this.laneRisk(carrier,target))target.y=alternative.y;
        this.assign(a,target,i?'Breddar understödet och öppnar nästa passning':'Ger nära understöd bakom pressen');
      });
    }
    if(pp&&this.phase==='attack'){
      // Move the weak-side flank with the puck; retain the selected PP shape,
      // its point player and net-front screen from attackTargets().
      const weak=mates.filter(a=>['LW','RD'].includes(a.role)&&Math.abs(a.y-carrier.y)>8);
      for(const a of weak){a.target.x=clamp(a.target.x+(side===0?1:-1)*.65,1.2,58.8);a.duty='Öppnar diagonalpassningen på bortre flanken';}
    }
    if(this.isShortHanded(1-side)&&p>40){
      const defenders=this.skaters(1-side).filter(a=>a.status==='playing');
      const presser=defenders.filter(a=>!a.role.endsWith('D')).sort((a,b)=>StudioHockey.distance(a,carrier)-StudioHockey.distance(b,carrier))[0];
      if(presser&&(carrier.y<9||carrier.y>21))for(const a of defenders){
        if(a===presser)continue;
        a.target.y=clamp(a.target.y+(carrier.y<15?-1:1)*.65,4,26);a.duty+=' · täcker bakom pressen';
      }
    }
    // Respect the assigned role while giving teammates separate usable lanes.
    // Only small corrections: no extra rushers, duplicate F1s or blue-line cuts.
    for(const a of mates){
      if(a.id===this.flight?.to)continue;
      for(const b of mates){if(String(a.id)<=String(b.id))continue;
        if(StudioHockey.distance(a.target,b.target)<2.4){
          const sign=a.target.y>=b.target.y?1:-1;
          a.target.y=clamp(a.target.y+sign*.6,2,28);b.target.y=clamp(b.target.y-sign*.6,2,28);
        }
      }
    }
  };
  proto.dump=function(a){const ok=baseDump.call(this,a);if(ok&&this.flight?.kind==='dump'){this.flight.matchEngine4Rim=true;this.flight.dumpLane=this.flight.end.y<15?'low':'high';}return ok;};
  proto.resolveFlight=function(dt){const f=this.flight,was=Boolean(f?.kind==='dump'&&f.matchEngine4Rim),side=f?.side,lane=f?.dumpLane;baseResolveFlight.call(this,dt);if(!was||this.flight||this.carrier||this.stoppage||!this.puckVelocity||!this.rimPath?.length)return;const low=lane==='low';this.rimPath=[{x:StudioHockey.progress(side,59),y:low?5.5:24.5},{x:StudioHockey.progress(side,58.7),y:low?24.5:5.5},{x:StudioHockey.progress(side,54),y:low?29:1},{x:StudioHockey.progress(side,47),y:low?28.7:1.3}];this.puckVelocity.x*=.82;this.puckVelocity.y*=.82;};

  // Loose-puck races now target where the puck is going, not only where it was.
  proto.targets=function(){baseTargets.call(this);this.collectiveTargets();this.patternTargets();if(this.carrier||this.flight||this.battle){this.specialTeamsTargets();return;}const v=this.puckVelocity||{x:0,y:0},speed=Math.hypot(v.x,v.y),look=clamp(.35+speed*.035,.35,1.15),future={x:clamp(this.puck.x+v.x*look,1,59),y:clamp(this.puck.y+v.y*look,1,29)};for(const side of [0,1]){const candidates=this.skaters(side).filter(a=>a.status!=='leaving').map(a=>{const pace=3.1+this.attribute(a,'skating')*.09,read=(this.attribute(a,'positioning')*.45+this.attribute(a,'decisions')*.3+this.attribute(a,'workRate')*.25)/20,eta=StudioHockey.distance(a,future)/Math.max(1,pace)-read*.32;return {a,eta,read};}).sort((x,y)=>x.eta-y.eta);const first=candidates[0];if(first){const lead=clamp(first.read*.55,0,.55);this.assign(first.a,{x:clamp(future.x+v.x/Math.max(1,speed)*lead,1,59),y:clamp(future.y+v.y/Math.max(1,speed)*lead,1,29)},speed>1.2?'Läser puckbanan och attackerar nästa sargpunkt':'Jagar den lösa pucken');}}this.specialTeamsTargets();};
  // Retain the same attack, but reread actual coverage instead of prescribing
  // its next two touches. Skill governs read latency and attention to lane risk.
  proto.patternRoute=function(carrier,plan){
    const side=carrier.side,p=StudioHockey.progress(side,carrier.x),lane=carrier.y<15?-1:1;
    const preferred=this.hasPowerPlay(side)?'diagonal':p>51&&(carrier.y<9||carrier.y>21)?'low-high':carrier.y<9||carrier.y>21?'cycle':'give-go';
    const reading=(this.attribute(carrier,'vision')+this.attribute(carrier,'decisions'))/40;
    const options=[];
    for(const a of this.skaters(side).filter(a=>a.id!==carrier.id&&a.status==='playing')){
      const kinds=a.role.endsWith('D')?['low-high']:['cycle','diagonal','give-go'];
      for(const kind of kinds){
        if(kind==='cycle'&&p<47)continue;
        const x=kind==='low-high'?44.5:kind==='cycle'?57.2:kind==='diagonal'?49.5:clamp(p+2.5,46,53);
        const y=kind==='low-high'?15+lane*7:kind==='cycle'?15+lane*4:kind==='diagonal'?15-lane*8:15-lane*4;
        const target={x:StudioHockey.progress(side,x),y};
        const risk=this.laneRisk(carrier,a),future=this.laneRisk(carrier,target),space=1-this.pressureAt(a);
        const score=space*.12-risk*(.26+reading*.2)-future*.13-StudioHockey.distance(a,target)*.009+(kind===preferred?.15:0)+(plan?.receiver===a.id&&plan.kind===kind?.06:0)+(plan?.previous===a.id&&kind==='give-go'?.04:0);
        options.push({kind,receiver:a.id,target,risk,score,lane});
      }
    }
    return options.sort((a,b)=>b.score-a.score)[0]||null;
  };
  proto.updateAttackPattern=function(){
    const carrier=this.actor(this.carrier),side=carrier?.side??this.flight?.side;
    for(const team of this.teams){
      let plan=team.attackPattern;
      const actors=this.skaters(team.side).filter(a=>a.status==='playing'),valid=new Set(actors.map(a=>a.id));
      const broken=this.stoppage>0||side!==team.side||this.battle||this.isShortHanded(team.side)||carrier&&carrier.side===team.side&&StudioHockey.progress(team.side,carrier.x)<40;
      if(plan&&(broken||actors.length!==plan.strength||plan.players.some(id=>!valid.has(id)))){team.attackPattern=null;continue;}
      if(plan&&this.time>plan.until)plan=team.attackPattern=null;
      if(broken||!carrier||carrier.side!==team.side||StudioHockey.progress(team.side,carrier.x)<42)continue;
      if(plan&&plan.holder!==carrier.id){plan.previous=plan.holder;plan.holder=carrier.id;plan.stage++;plan.readAt=0;if(plan.stage>6){team.attackPattern=null;continue;}}
      if(!plan){
        if(this.time<(team.nextPatternAt||0)||actors.length<4||actors.length!==this.skaters(team.side).length)continue;
        plan=team.attackPattern={version:2,at:this.time,until:this.time+14,stage:0,holder:carrier.id,origin:carrier.id,players:actors.map(a=>a.id),strength:actors.length,readAt:0};
        team.nextPatternAt=this.time+7;
      }
      if(this.time<(plan.readAt||0))continue;
      const route=this.patternRoute(carrier,plan);if(!route){team.attackPattern=null;continue;}
      const changed=plan.kind&& (plan.kind!==route.kind||plan.receiver!==route.receiver);
      if(changed){plan.switchedAt=this.time;plan.reason=plan.risk>.3?'Byter fortsättning när passningsvägen stängs':'Läser en ny yta efter passningen';}
      const runner=actors.filter(a=>a!==carrier&&a.id!==route.receiver&&!a.role.endsWith('D')).sort((a,b)=>StudioHockey.distance(a,{x:StudioHockey.progress(team.side,53),y:15})-StudioHockey.distance(b,{x:StudioHockey.progress(team.side,53),y:15}))[0];
      Object.assign(plan,{kind:route.kind,receiver:route.receiver,target:route.target,risk:route.risk,lane:route.lane,runner:runner?.id,readAt:this.time+clamp(1.05-this.attribute(carrier,'decisions')*.025-this.attribute(carrier,'vision')*.01,.35,.9)});
    }
  };
  proto.patternTargets=function(){
    this.updateAttackPattern();const carrier=this.actor(this.carrier);if(!carrier)return;
    const plan=this.teams[carrier.side].attackPattern;if(!plan)return;
    const receiver=this.actor(plan.receiver),runner=this.actor(plan.runner);
    if(receiver&&receiver.id!==carrier.id&&!receiver.shotPreparation){
      // Old saves acquire a current route at the next read before this target is used.
      const target=plan.target||{x:StudioHockey.progress(carrier.side,49.5),y:15-plan.lane*8};
      this.assign(receiver,target,({'low-high':'Ger understöd för spel från hörnet till backen',cycle:'Erbjuder fortsatt spel bakom mål',diagonal:'Öppnar sig på bortre flanken','give-go':'Söker nästa yta i väggspelet'})[plan.kind]);
    }
    if(!this.hasPowerPlay(carrier.side)&&runner&&runner.id!==carrier.id&&runner!==receiver&&!runner.role.endsWith('D'))this.assign(runner,{x:StudioHockey.progress(carrier.side,plan.kind==='low-high'?54:51),y:15+plan.lane*2.5},'Attackerar nästa yta medan medspelarna kombinerar');
  };
  proto.specialTeamsTargets=function(){
    const carrier=this.actor(this.carrier);
    for(const team of this.teams){
      const side=team.side,actors=this.skaters(side).filter(a=>a.status==='playing'),ids=new Set(actors.map(a=>a.id));
      const pp=this.hasPowerPlay(side),pk=this.isShortHanded(side),p=StudioHockey.progress(pp?side:1-side,this.puck.x);
      let play=team.specialPlay;
      if(play&&(this.stoppage>0||this.battle||this.time>=play.until||actors.length!==play.strength||play.players.some(id=>!ids.has(id))||(play.kind==='press'?!pk||carrier?.side===side:!pp||this.owner!==side)||p<40))team.specialPlay=play=null;
      if(!pp&&!pk||this.stoppage>0||this.battle||p<43)continue;
      if(pk&&!play){
        const loose=this.skaters(1-side).filter(a=>['bobble','miss'].includes(a.contactAction?.kind)&&this.wall-a.contactAction.at<.8).sort((a,b)=>b.contactAction.at-a.contactAction.at)[0];
        const forwards=actors.filter(a=>!a.role.endsWith('D')).sort((a,b)=>StudioHockey.distance(a,this.puck)-StudioHockey.distance(b,this.puck)),leader=forwards[0];
        const signal=loose?.contactAction.at,delay=leader?.id?.length?clamp(.34-this.attribute(leader,'decisions')*.012,.10,.29):1;
        if(loose&&leader&&actors.length>=3&&team.lastPressSignal!==signal&&this.wall-signal>=delay&&StudioHockey.distance(leader,this.puck)<8&&this.energyLevel(leader)>40&&(!carrier||carrier.side!==side)){
          team.lastPressSignal=signal;play=team.specialPlay={kind:'press',at:this.time,until:this.time+1.35,players:forwards.slice(0,2).map(a=>a.id),strength:actors.length,leader:leader.id,source:loose.id};
        }
      }
      if(pp&&!play&&carrier?.side===side&&actors.length===5&&this.time>=(team.nextSpecialAt||0)){
        const flank=carrier.y<10||carrier.y>20;
        const weak=actors.find(a=>a.id!==carrier.id&&['LW','RD'].includes(a.role)&&Math.abs(a.y-carrier.y)>8),bumper=actors.find(a=>a.role==='RW'&&a.id!==carrier.id);
        if(flank&&weak&&bumper&&weak!==bumper&&(this.laneRisk(carrier,weak)>.28||this.pressureAt(carrier)>.3)){
          const lane=carrier.y<15?-1:1,umbrella=team.tactics.pp!=='131';
          const targets=umbrella?[{id:weak.id,x:57,y:15+lane*5},{id:bumper.id,x:49,y:15-lane*7}]:[{id:weak.id,x:50,y:15-lane*2},{id:bumper.id,x:48,y:15-lane*9}];
          play=team.specialPlay={kind:umbrella?'low-cycle':'flank-swap',at:this.time,until:this.time+4.2,players:[weak.id,bumper.id],strength:actors.length,targets};team.nextSpecialAt=this.time+8;
        }
      }
      if(!play)continue;
      if(play.kind==='press'){
        const leader=this.actor(play.leader);if(!leader)continue;
        if(!play.observed&&this.time-play.at>=.3){play.observed=true;this.observeTactic('pk-press',side,{players:[leader.id,play.source]});}
        if(this.flight?.kind==='pass'&&this.flight.side!==side&&StudioHockey.distance(leader,this.puck)>7){team.specialPlay=null;continue;}
        this.assign(leader,{x:clamp(this.puck.x+(this.puckVelocity?.x||0)*.16,1,59),y:clamp(this.puck.y+(this.puckVelocity?.y||0)*.16,1,29)},'BP pressar den misslyckade mottagningen');
        const cover=this.actor(play.players.find(id=>id!==leader.id));
        if(cover){const outlet=this.skaters(1-side).filter(a=>a.id!==carrier?.id&&a.id!==play.source).sort((a,b)=>StudioHockey.distance(a,this.puck)-StudioHockey.distance(b,this.puck))[0];if(outlet)this.assign(cover,{x:clamp(this.puck.x+(outlet.x-this.puck.x)*.55,1,59),y:clamp(this.puck.y+(outlet.y-this.puck.y)*.55,4,26)},'BP stänger närmaste passning och lämnar bortre kanten');}
      }else for(const target of play.targets){
        const actor=this.actor(target.id);if(actor&&actor.id!==this.carrier&&actor.id!==this.flight?.to&&!actor.shotPreparation)this.assign(actor,{x:StudioHockey.progress(side,target.x),y:target.y},play.kind==='flank-swap'?'PP byter plats mellan flanken och slottet':'PP roterar via kortsidan för att öppna boxen');
      }
    }
  };
  const basePatternTake=proto.takePossession,basePatternShoot=proto.shoot,basePatternStop=proto.stop;
  proto.takePossession=function(a,options){
    const f=this.flight,owner=this.owner,holder=this.carrier,phase=this.phase;const result=basePatternTake.call(this,a,options);
    if(a&&this.carrier===a.id&&a.side!==owner&&(holder||['pass','intercept'].includes(f?.kind)||phase==='battle'))this.observeTactic('turnover',owner,{players:[holder||f?.from,a.id]});
    if(a&&this.carrier===a.id&&f?.kind==='pass'&&f.side===a.side&&StudioHockey.progress(a.side,a.x)>42){
      const stats=this.stats[a.side];if(Math.abs(f.start.y-a.y)>9){stats.diagonalPasses=(stats.diagonalPasses||0)+1;this.observeTactic('diagonal',a.side,{players:[f.from,a.id],from:f.start});}
      const marker=this.skaters(1-a.side).find(d=>d.status==='playing'&&d.markedThreat===a.id);
      if(marker&&StudioHockey.progress(a.side,a.x)>49&&Math.abs(a.y-15)<5&&StudioHockey.distance(marker,a)>4)this.observeTactic('marking',1-a.side,{players:[marker.id,a.id],from:marker});
      if(this.teams[a.side].specialPlay?.targets?.some(t=>t.id===a.id))this.observeTactic('pp-rotation',a.side,{players:[f.from,a.id],from:f.start});
      if(StudioHockey.progress(a.side,f.start.x)>51&&StudioHockey.progress(a.side,a.x)<48)stats.pointFeeds=(stats.pointFeeds||0)+1;
    }
    if(a)for(const team of this.teams)if(team.side!==a.side)team.attackPattern=null;
    return result;
  };
  proto.shoot=function(a){const result=basePatternShoot.call(this,a);if(result){if(StudioHockey.progress(a.side,a.x)>48&&Math.abs(a.y-15)<5)this.stats[a.side].slotAttempts=(this.stats[a.side].slotAttempts||0)+1;this.teams[a.side].attackPattern=null;}return result;};
  proto.stop=function(...args){for(const team of this.teams){team.attackPattern=null;team.specialPlay=null;team.markingPlan=null;}for(const a of this.actors)delete a.netFront;return basePatternStop.apply(this,args);};
  const baseCoverage=proto.defenseTargets;
  proto.defenseTargets=function(side){
    baseCoverage.call(this,side);const coverage=this.teams[side].coverage,carrier=this.actor(this.carrier);
    if(!carrier||carrier.side===side||StudioHockey.progress(carrier.side,carrier.x)<42||this.isShortHanded(side)||this.hasPowerPlay(side))return;
    const defenders=this.skaters(side).filter(a=>a.status==='playing'&&StudioHockey.distance(a,carrier)>2.5);
    if(coverage==='diagonal'){
      const flank=this.skaters(carrier.side).filter(a=>a.id!==carrier.id&&!a.role.endsWith('D')).sort((a,b)=>Math.abs(b.y-carrier.y)-Math.abs(a.y-carrier.y))[0];
      const guard=defenders.filter(a=>!a.role.endsWith('D')).sort((a,b)=>StudioHockey.distance(a,flank||carrier)-StudioHockey.distance(b,flank||carrier))[0];
      if(flank&&guard)this.assign(guard,{x:carrier.x+(flank.x-carrier.x)*.66,y:carrier.y+(flank.y-carrier.y)*.66},'Stänger den återkommande diagonalpassningen; lämnar mer yta vid sargen');
    }else if(coverage==='point'){
      const back=this.skaters(carrier.side).filter(a=>a.role.endsWith('D')).sort((a,b)=>StudioHockey.distance(a,carrier)-StudioHockey.distance(b,carrier))[0],guard=defenders.filter(a=>!a.role.endsWith('D')).sort((a,b)=>StudioHockey.distance(a,back||carrier)-StudioHockey.distance(b,back||carrier))[0];
      if(back&&guard)this.assign(guard,{x:back.x+(carrier.x-back.x)*.22,y:back.y+(carrier.y-back.y)*.22},'Skär av passningen till backen; en forward lämnar mitten');
    }else if(coverage==='slot'){
      for(const a of defenders.filter(a=>!a.role.endsWith('D')).slice(0,2)){a.target.y=15+(a.target.y-15)*.68;a.target.x=StudioHockey.progress(side,clamp(StudioHockey.progress(side,a.target.x),6,12));a.duty='Skyddar slottet; ger motståndaren mer tid ute på kanten';}
    }
  };
  // Bounded, observational clips. Recording never draws randomness or changes
  // a decision. Each clip owns its frame list so an open replay stays immutable.
  const compactFrames=new WeakMap();
  function clipFrame(frame){
    if(!compactFrames.has(frame)){
      // Quantize presentation coordinates to 0.1 mm; physics retains full
      // precision. Keep action targets (needed by the stick pose), omit only
      // actor coaching fields that are not used to render these recordings.
      const clean={...frame,actors:frame.actors.map(({target,duty,status,...a})=>a)};
      const copy=value=>typeof value==='number'?Math.round(value*10000)/10000:Array.isArray(value)?value.map(copy):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([k,v])=>[k,copy(v)])):value;
      compactFrames.set(frame,copy(clean));
    }
    return compactFrames.get(frame);
  }
  proto.observeTactic=function(kind,side,details={}){
    const kinds=['diagonal','turnover','support','marking','pp-rotation','pk-press'];
    if(!kinds.includes(kind)||![0,1].includes(side))return;
    const recent=this.tacticalObservations||[],last=[...recent].reverse().find(o=>o.kind===kind&&o.side===side);
    if(last&&this.time-last.time<(kind==='support'?8:.15))return;
    const id=(this.observationSequence||0)+1;this.observationSequence=id;
    const row={id,kind,side,time:this.time,wall:Math.round(this.wall*10000)/10000,situation:this.hasPowerPlay(side)?'pp':this.isShortHanded(side)?'pk':this.threeOnThree?'ot':'even',players:(details.players||[]).filter(id=>typeof id==='string').slice(0,4),spot:{x:this.puck.x,y:this.puck.y},...(details.from?{from:{x:details.from.x,y:details.from.y}}:{})};
    this.tacticalObservations=[...recent.filter(o=>this.time-o.time<=300),row].slice(-96);
    const clips=this.tacticalClips||[],same=[...clips].reverse().find(c=>c.kind===kind&&c.side===side);
    if(same&&this.wall-same.wall<4)return;
    const frame=clipFrame(this.presentationFrame()),frames=this.history.filter(f=>f.wall<frame.wall-1e-4&&frame.wall-f.wall<4.4).slice(-22).map(clipFrame);
    frames.push(frame);
    const clip={...row,frames,until:this.wall+1};
    const peers=clips.filter(c=>c.kind===kind&&c.side===side&&c.situation===row.situation);
    const retained=peers.length>=2?clips.filter(c=>c!==peers[0]):clips;
    this.tacticalClips=[...retained,clip].slice(-6);
  };
  const baseTacticalCapture=proto.capture,baseTacticalDecide=proto.decide;
  proto.capture=function(){
    baseTacticalCapture.call(this);if(this.tick%2!==0||!this.tacticalClips?.some(c=>this.wall<=c.until))return;
    const latest=this.history.at(-1);if(!latest)return;const frame=clipFrame(latest);
    this.tacticalClips=this.tacticalClips.map(c=>{
      if(this.wall>c.until||frame.phase==='faceoff'||frame.wall<=(c.frames.at(-1)?.wall??Infinity)+1e-7)return c;
      return {...c,frames:[...c.frames,frame].slice(-30)};
    });
  };
  proto.decide=function(){
    const a=this.actor(this.carrier);
    if(a&&StudioHockey.progress(a.side,a.x)<32&&this.pressureAt(a)>.45&&!this.skaters(a.side).some(b=>b.id!==a.id&&b.status==='playing'&&StudioHockey.distance(a,b)<10&&this.laneRisk(a,b)<.45))this.observeTactic('support',a.side,{players:[a.id]});
    return baseTacticalDecide.call(this);
  };
  const baseNetFrontTargets=proto.targets;
  proto.targets=function(){baseNetFrontTargets.call(this);this.netFrontTargets();};
  proto.netFrontTargets=function(){
    for(const a of this.actors)if(a.netFront?.until<=this.time)delete a.netFront;
    if(this.stoppage||this.battle)return;
    const carrier=this.actor(this.carrier),shot=this.flight?.kind==='shot',rebound=this.rebound&&this.time-this.rebound.time<2.5;
    const side=carrier?.side??(shot?this.flight.side:rebound?this.rebound.side:null);if(side==null||this.isShortHanded(side)||StudioHockey.progress(side,this.puck.x)<44)return;
    const goal={x:StudioHockey.progress(side,56.5),y:15},pp=this.hasPowerPlay(side);
    const rotating=new Set((this.teams[side].specialPlay?.targets||[]).map(a=>a.id));
    const candidates=this.skaters(side).filter(a=>a.status==='playing'&&a!==carrier&&!a.role.endsWith('D')&&(!pp||a.role==='C')&&!rotating.has(a.id)&&a.id!==this.flight?.to&&StudioHockey.progress(side,a.x)>49&&StudioHockey.distance(a,goal)<7);
    const screen=candidates.sort((a,b)=>(StudioHockey.distance(a,goal)-(pp&&a.role==='C'?3:0))-(StudioHockey.distance(b,goal)-(pp&&b.role==='C'?3:0)))[0];if(!screen)return;
    const defenders=this.skaters(1-side).filter(d=>d.status==='playing'&&StudioHockey.distance(d,screen)<3.2&&(!carrier||StudioHockey.distance(d,carrier)>2.7));
    const guard=defenders.sort((a,b)=>(StudioHockey.distance(a,screen)-(a.markedThreat===screen.id?1:0))-(StudioHockey.distance(b,screen)-(b.markedThreat===screen.id?1:0)))[0];
    const loose=rebound&&!this.flight&&!carrier;
    const p=loose?{x:this.puck.x,y:this.puck.y}:{x:StudioHockey.progress(side,54.1),y:15+clamp((this.puck.y-15)*.16,-1.2,1.2)};
    // Keep a screen on the observed sight line; after a real rebound attack
    // that puck. The defender must reach the inside position to tie a stick.
    this.assign(screen,p,loose?'Attackerar den faktiska returen':'Söker skymning och håller klubban spelbar framför mål');
    const record=(a,kind,opponent)=>{const old=a.netFront;a.netFront={at:old?.kind===kind?old.at:this.wall,until:this.time+.35,kind,opponent:opponent?.id||null};};
    record(screen,loose?'rebound':'screen',guard);
    if(guard){
      const dx=goal.x-screen.x,dy=goal.y-screen.y,n=Math.hypot(dx,dy)||1;
      this.assign(guard,{x:screen.x+dx/n*.72,y:screen.y+dy/n*.72},'Håller insidan och försöker kontrollera klubban framför mål');record(guard,'boxout',screen);
    }
  };
  proto.matchEngine4PlayerDecisionsInstalled=true;
})();
