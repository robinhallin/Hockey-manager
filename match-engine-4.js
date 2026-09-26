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
      const ranked=[...forwards].sort((a,b)=>StudioHockey.distance(a,carrier)-StudioHockey.distance(b,carrier));
      const [f1,f2,f3]=ranked;
      if(f1)this.assign(f1,point(clamp(ownP-.7,1,59),clamp(carrier.y+(carrier.y<15?1:-1),2,28)),'F1 styr puckföraren mot sargen');
      if(f2){
        const outlet=this.skaters(carrier.side).filter(a=>a.id!==carrier.id&&!['leaving','entering'].includes(a.status))
          .sort((a,b)=>StudioHockey.distance(a,carrier)-StudioHockey.distance(b,carrier))[0];
        const outletP=outlet?StudioHockey.progress(side,outlet.x):ownP-5;
        this.assign(f2,point(clamp(Math.min(ownP-2,outletP-1),6,47),clamp(outlet?(outlet.y+carrier.y)/2:15,5,25)),'F2 stänger förstapasset och skyddar mitten');
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
        this.assign(a,point(clamp(ownP-2-i*1.2,8,40),clamp(11+i*4,6,24)),i?'Backcheckar och plockar upp släpande spelare':'Backcheckar genom mitten och tar första sena hotet');
      }
    }
    // Once the rush is established in our zone, retain the base engine's
    // individual marking instead of pulling forwards back to neutral ice.
  };
  proto.dump=function(a){const ok=baseDump.call(this,a);if(ok&&this.flight?.kind==='dump'){this.flight.matchEngine4Rim=true;this.flight.dumpLane=this.flight.end.y<15?'low':'high';}return ok;};
  proto.resolveFlight=function(dt){const f=this.flight,was=Boolean(f?.kind==='dump'&&f.matchEngine4Rim),side=f?.side,lane=f?.dumpLane;baseResolveFlight.call(this,dt);if(!was||this.flight||this.carrier||this.stoppage||!this.puckVelocity||!this.rimPath?.length)return;const low=lane==='low';this.rimPath=[{x:StudioHockey.progress(side,59),y:low?5.5:24.5},{x:StudioHockey.progress(side,58.7),y:low?24.5:5.5},{x:StudioHockey.progress(side,54),y:low?29:1},{x:StudioHockey.progress(side,47),y:low?28.7:1.3}];this.puckVelocity.x*=.82;this.puckVelocity.y*=.82;};

  // Loose-puck races now target where the puck is going, not only where it was.
  proto.targets=function(){baseTargets.call(this);if(this.carrier||this.flight||this.battle)return;const v=this.puckVelocity||{x:0,y:0},speed=Math.hypot(v.x,v.y),look=clamp(.35+speed*.035,.35,1.15),future={x:clamp(this.puck.x+v.x*look,1,59),y:clamp(this.puck.y+v.y*look,1,29)};for(const side of [0,1]){const candidates=this.skaters(side).filter(a=>a.status!=='leaving').map(a=>{const pace=3.1+this.attribute(a,'skating')*.09,read=(this.attribute(a,'positioning')*.45+this.attribute(a,'decisions')*.3+this.attribute(a,'workRate')*.25)/20,eta=StudioHockey.distance(a,future)/Math.max(1,pace)-read*.32;return {a,eta,read};}).sort((x,y)=>x.eta-y.eta);const first=candidates[0];if(first){const lead=clamp(first.read*.55,0,.55);this.assign(first.a,{x:clamp(future.x+v.x/Math.max(1,speed)*lead,1,59),y:clamp(future.y+v.y/Math.max(1,speed)*lead,1,29)},speed>1.2?'Läser puckbanan och attackerar nästa sargpunkt':'Jagar den lösa pucken');}}};
  proto.matchEngine4PlayerDecisionsInstalled=true;
})();
