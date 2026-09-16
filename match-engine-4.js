"use strict";

// Match Engine 4, stage 1: player identity changes hockey decisions, not a hidden
// overall rating. Each action reads only attributes relevant to that hockey skill.
(function installMatchEngine4PlayerDecisions(){
  if(typeof StudioHockey==='undefined'||StudioHockey.Match.prototype.matchEngine4PlayerDecisionsInstalled)return;
  const proto=StudioHockey.Match.prototype,baseActionOptions=proto.actionOptions;
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const centered=(match,a,key)=>clamp((match.attribute(a,key)-10)/10,-.55,.75);
  proto.actionOptions=function(a){
    const rows=baseActionOptions.call(this,a);if(!a||a.role==='G')return rows;
    const pressure=this.pressureAt(a),progress=StudioHockey.progress(a.side,a.x);
    const shooting=centered(this,a,'shooting'),passing=centered(this,a,'passing'),vision=centered(this,a,'vision'),decisions=centered(this,a,'decisions'),control=centered(this,a,'puckControl'),skating=centered(this,a,'skating'),composure=centered(this,a,'composure'),strength=centered(this,a,'strength'),work=centered(this,a,'workRate');
    for(const row of rows){
      if(row.kind==='shoot'){const context=this.shotContext(a),laneFactor=clamp(1-context.pressure*.45,.55,1);row.value+=shooting*.085*laneFactor+composure*.025;if(progress<47&&context.d>14)row.value-=decisions*.035;row.identityReason='Avslutsval: skott, kyla och beslut';}
      if(row.kind==='pass'){row.value+=passing*.055+vision*.05+decisions*.03+composure*pressure*.025;row.identityReason='Passningsval: passning, spelförståelse och beslut';}
      if(row.kind==='carry'){row.value+=control*.055+skating*.035+decisions*.02+control*pressure*.025;row.identityReason='Pucktransport: puckkontroll, skridskoåkning och beslut';}
      if(row.kind==='shield'){row.value+=control*.05+strength*.045+composure*.035;row.identityReason='Puckskydd: kontroll, styrka och kyla';}
      if(row.kind==='dump'){row.value+=(decisions*.035+work*.02)*clamp(.35+pressure,.35,1.2);row.identityReason='Djupledspuck: beslut, press och arbetskapacitet';}
      if(row.kind==='clear'){row.value+=decisions*.035+composure*.025;row.identityReason='Rensning: beslut och kyla';}
    }
    return rows.sort((x,y)=>y.value-x.value);
  };
  proto.matchEngine4PlayerDecisionsInstalled=true;
})();
