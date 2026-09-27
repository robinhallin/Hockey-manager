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
      const pattern=this.teams[a.side].attackPattern,planned=pattern&&(pattern.stage?pattern.origin:pattern.receiver);
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
  proto.targets=function(){baseTargets.call(this);this.collectiveTargets();this.patternTargets();if(this.carrier||this.flight||this.battle)return;const v=this.puckVelocity||{x:0,y:0},speed=Math.hypot(v.x,v.y),look=clamp(.35+speed*.035,.35,1.15),future={x:clamp(this.puck.x+v.x*look,1,59),y:clamp(this.puck.y+v.y*look,1,29)};for(const side of [0,1]){const candidates=this.skaters(side).filter(a=>a.status!=='leaving').map(a=>{const pace=3.1+this.attribute(a,'skating')*.09,read=(this.attribute(a,'positioning')*.45+this.attribute(a,'decisions')*.3+this.attribute(a,'workRate')*.25)/20,eta=StudioHockey.distance(a,future)/Math.max(1,pace)-read*.32;return {a,eta,read};}).sort((x,y)=>x.eta-y.eta);const first=candidates[0];if(first){const lead=clamp(first.read*.55,0,.55);this.assign(first.a,{x:clamp(future.x+v.x/Math.max(1,speed)*lead,1,59),y:clamp(future.y+v.y/Math.max(1,speed)*lead,1,29)},speed>1.2?'Läser puckbanan och attackerar nästa sargpunkt':'Jagar den lösa pucken');}}};
  // A short-lived shared intention survives a pass, but never a turnover,
  // stoppage, manpower change or substitution of a required participant.
  proto.updateAttackPattern=function(){
    const carrier=this.actor(this.carrier),side=carrier?.side??this.flight?.side;
    for(const team of this.teams){
      let plan=team.attackPattern;
      const actors=this.skaters(team.side).filter(a=>a.status==='playing'),valid=new Set(actors.map(a=>a.id));
      if(plan&&(this.stoppage>0||side!==team.side||this.battle||this.time>plan.until||this.isShortHanded(team.side)||actors.length!==plan.strength||plan.players.some(id=>!valid.has(id))))plan=team.attackPattern=null;
      if(!carrier||carrier.side!==team.side||StudioHockey.progress(team.side,carrier.x)<42)continue;
      if(plan&&plan.holder!==carrier.id){plan.holder=carrier.id;plan.stage++;if(plan.stage>2)plan=team.attackPattern=null;}
      if(plan||this.time<(team.nextPatternAt||0))continue;
      const mates=actors.filter(a=>a.id!==carrier.id),backs=mates.filter(a=>a.role.endsWith('D')),forwards=mates.filter(a=>!a.role.endsWith('D'));
      if(mates.length<3||!backs.length||actors.length!==this.skaters(team.side).length)continue;
      const p=StudioHockey.progress(team.side,carrier.x),wall=carrier.y<9||carrier.y>21;
      const kind=this.hasPowerPlay(team.side)?'diagonal':p>51&&wall?'low-high':wall?'cycle':'give-go';
      const pool=kind==='low-high'?backs:forwards,receiver=[...pool].sort((a,b)=>this.laneRisk(carrier,a)-this.laneRisk(carrier,b)||StudioHockey.distance(carrier,a)-StudioHockey.distance(carrier,b))[0];
      if(!receiver)continue;
      const runner=forwards.find(a=>a!==receiver)||mates.find(a=>a!==receiver);
      team.attackPattern={kind,at:this.time,until:this.time+5.5,stage:0,holder:carrier.id,origin:carrier.id,receiver:receiver.id,runner:runner?.id,players:[carrier.id,receiver.id,...(runner?[runner.id]:[])],strength:actors.length,lane:carrier.y<15?-1:1};
      team.nextPatternAt=this.time+7;
    }
  };
  proto.patternTargets=function(){
    this.updateAttackPattern();const carrier=this.actor(this.carrier);if(!carrier)return;
    const plan=this.teams[carrier.side].attackPattern;if(!plan)return;
    const p=StudioHockey.progress(carrier.side,carrier.x),receiver=this.actor(plan.stage?plan.origin:plan.receiver),runner=this.actor(plan.runner),point=(x,y)=>({x:StudioHockey.progress(carrier.side,x),y:clamp(y,3,27)});
    if(receiver&&receiver.id!==carrier.id&&!receiver.shotPreparation){
      const target=plan.kind==='low-high'?point(plan.stage?53:44.5,15+plan.lane*(plan.stage?3:7)):plan.kind==='cycle'?point(56.9,15+plan.lane*5):plan.kind==='diagonal'?point(49.5,15-plan.lane*8):point(clamp(p+3,45,53),15-plan.lane*4);
      this.assign(receiver,target,({ 'low-high':'Ger understöd för spel från hörnet till backen',cycle:'Erbjuder fortsatt spel bakom mål',diagonal:'Öppnar sig på bortre flanken','give-go':'Söker nästa yta i väggspelet'})[plan.kind]);
    }
    if(runner&&runner.id!==carrier.id&&runner!==receiver&&!runner.role.endsWith('D'))this.assign(runner,point(plan.kind==='low-high'?54:51,15+plan.lane*2.5),'Attackerar nästa yta medan medspelarna kombinerar');
  };
  const basePatternTake=proto.takePossession,basePatternShoot=proto.shoot,basePatternStop=proto.stop;
  proto.takePossession=function(a,options){
    const f=this.flight;const result=basePatternTake.call(this,a,options);
    if(a&&this.carrier===a.id&&f?.kind==='pass'&&f.side===a.side&&StudioHockey.progress(a.side,a.x)>42){
      const stats=this.stats[a.side];if(Math.abs(f.start.y-a.y)>9)stats.diagonalPasses=(stats.diagonalPasses||0)+1;
      if(StudioHockey.progress(a.side,f.start.x)>51&&StudioHockey.progress(a.side,a.x)<48)stats.pointFeeds=(stats.pointFeeds||0)+1;
    }
    if(a)for(const team of this.teams)if(team.side!==a.side)team.attackPattern=null;
    return result;
  };
  proto.shoot=function(a){const result=basePatternShoot.call(this,a);if(result){if(StudioHockey.progress(a.side,a.x)>48&&Math.abs(a.y-15)<5)this.stats[a.side].slotAttempts=(this.stats[a.side].slotAttempts||0)+1;this.teams[a.side].attackPattern=null;}return result;};
  proto.stop=function(...args){for(const team of this.teams)team.attackPattern=null;return basePatternStop.apply(this,args);};
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
  proto.matchEngine4PlayerDecisionsInstalled=true;
})();
