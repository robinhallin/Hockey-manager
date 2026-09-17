"use strict";

// Match Engine 4, stage 1-3: player identity, blue-line reads and pressure-aware breakouts.
(function installMatchEngine4PlayerDecisions(){
  if(typeof StudioHockey==='undefined'||StudioHockey.Match.prototype.matchEngine4PlayerDecisionsInstalled)return;
  const proto=StudioHockey.Match.prototype,baseActionOptions=proto.actionOptions;
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const centered=(match,a,key)=>clamp((match.attribute(a,key)-10)/10,-.55,.75);
  const zoneRead=(match,a)=>{
    const p=StudioHockey.progress(a.side,a.x),pressure=match.pressureAt(a),mates=match.skaters(a.side).filter(b=>b.id!==a.id&&!['leaving','entering'].includes(b.status));
    const ahead=mates.filter(b=>StudioHockey.progress(a.side,b.x)>p),offside=ahead.filter(b=>StudioHockey.progress(a.side,b.x)>40),onsideAhead=ahead.filter(b=>StudioHockey.progress(a.side,b.x)<=40);
    const support=mates.filter(b=>Math.abs(StudioHockey.progress(a.side,b.x)-p)<9).length;
    const outlets=ahead.filter(b=>StudioHockey.progress(a.side,b.x)<32&&match.pressureAt(b)<.38).length;
    return {p,pressure,lineRush:p>=32&&p<40,breakout:p<23,offside:offside.length,onsideAhead:onsideAhead.length,support,outlets};
  };
  proto.actionOptions=function(a){
    const rows=baseActionOptions.call(this,a);if(!a||a.role==='G')return rows;
    const read=zoneRead(this,a),pressure=read.pressure,progress=read.p;
    const shooting=centered(this,a,'shooting'),passing=centered(this,a,'passing'),vision=centered(this,a,'vision'),decisions=centered(this,a,'decisions'),control=centered(this,a,'puckControl'),skating=centered(this,a,'skating'),composure=centered(this,a,'composure'),strength=centered(this,a,'strength'),work=centered(this,a,'workRate');
    for(const row of rows){
      if(row.kind==='shoot'){const context=this.shotContext(a),laneFactor=clamp(1-context.pressure*.45,.55,1);row.value+=shooting*.085*laneFactor+composure*.025;if(progress<47&&context.d>14)row.value-=decisions*.035;row.identityReason='Avslutsval: skott, kyla och beslut';}
      if(row.kind==='pass'){row.value+=passing*.055+vision*.05+decisions*.03+composure*pressure*.025;row.identityReason='Passningsval: passning, spelförståelse och beslut';}
      if(row.kind==='carry'){row.value+=control*.055+skating*.035+decisions*.02+control*pressure*.025;row.identityReason='Pucktransport: puckkontroll, skridskoåkning och beslut';}
      if(row.kind==='shield'){row.value+=control*.05+strength*.045+composure*.035;row.identityReason='Puckskydd: kontroll, styrka och kyla';}
      if(row.kind==='dump'){row.value+=(decisions*.035+work*.02)*clamp(.35+pressure,.35,1.2);row.identityReason='Djupledspuck: beslut, press och arbetskapacitet';}
      if(row.kind==='clear'){row.value+=decisions*.035+composure*.025;row.identityReason='Rensning: beslut och kyla';}

      if(read.breakout){
        const hardForecheck=pressure>.42;
        if(row.kind==='pass'){
          row.value+=read.outlets*.035+(passing+vision+decisions)*.025-(hardForecheck&&read.outlets===0?.13:0);
          row.zoneReason=read.outlets?'Hittar ett spelbart förstapass ur egen zon':'Forechecken stänger första passningen';
        }
        if(row.kind==='carry'){
          row.value+=read.outlets?-.025:clamp((control+skating+decisions)*.035-pressure*.12,-.11,.08);
          row.zoneReason=hardForecheck?'Bedömer om pucken kan transporteras ur pressen':'Tar is när uppspelsvägen är öppen';
        }
        if(row.kind==='shield'){
          row.value+=(hardForecheck?.07:0)+control*.02+composure*.018;
          row.zoneReason='Skyddar pucken för att ge understödet tid';
        }
        if(row.kind==='clear'){
          row.value+=(hardForecheck&&read.outlets===0?.14:-.06)+decisions*.02;
          row.zoneReason=hardForecheck&&read.outlets===0?'Tar det säkra beslutet när forechecken låser uppspelet':'Behåller pucken när ett riktigt uppspel finns';
        }
      }

      if(read.lineRush){
        if(row.kind==='carry'){
          if(read.offside)row.value-=.65+read.offside*.12;
          else row.value+=clamp((control+skating+decisions)*.035-pressure*.11,-.08,.12);
          row.zoneReason=read.offside?'Väntar in lagkamrater vid offensiv blå':'Bedömer kontrollerad zonentré';
        }
        if(row.kind==='pass'){
          row.value+=read.offside?-.18:clamp((passing+vision)*.025+read.onsideAhead*.018,-.04,.09);
          row.zoneReason=read.offside?'Undviker passning som låser laget offside':'Söker spelbar lagkamrat före blå';
        }
        if(row.kind==='dump'){
          const forced=pressure>.32||read.offside>0||read.support<2;
          row.value+=(forced?.24:-.045)+decisions*(forced?.025:.01);
          row.zoneReason=read.offside?'Chippar djupt medan laget taggar upp':pressure>.32?'Lägger pucken bakom pressen vid blå':'Har stöd för en kontrollerad entré';
        }
      }
    }
    return rows.sort((x,y)=>y.value-x.value);
  };
  proto.matchEngine4PlayerDecisionsInstalled=true;
})();
