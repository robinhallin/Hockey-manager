'use strict';
const assert=require('node:assert/strict');
const r=require('./headless-career.cjs').headlessCareer().run;
r("startCareerWithClub('HV71');globalThis.initial=JSON.stringify(state);globalThis.originalLineup=rivalLineup;globalThis.originalChance=MatchWorld2.backgroundAttemptRate;aiCoachDecision=(club,base)=>({...base});");
const results={};
for(const mode of ['ungated','selective','safe']){
 r(`state=JSON.parse(initial);rivalLineup=(...args)=>{const l=originalLineup(...args);l.plan.counter=${JSON.stringify(mode==='safe'?'safe':'selective')};return l;};MatchWorld2.backgroundAttemptRate=${mode==='ungated'?'args=>originalChance({...args,pk:false})':'originalChance'};`);
 const totals=Object.fromEntries(['even','pp','pk'].map(k=>[k,{seconds:0,shots:0,goals:0}]));
 for(let i=0;i<60;i++){
  const rows=JSON.parse(r(`JSON.stringify(rivalSimulate(state.schedule[${i}],{regulationOnly:true}).reports.flatMap(x=>x.strengthEvidence))`));
  for(const row of rows)for(const key of ['seconds','shots','goals'])totals[row.kind][key]+=row[key];
 }
 for(const row of Object.values(totals))row.shotsPer60=row.shots*3600/row.seconds;
 results[mode]=totals;
}
assert.ok(results.selective.pk.shotsPer60<results.ungated.pk.shotsPer60*.6,'PK should clear most recoveries');
assert.ok(results.safe.pk.shotsPer60<results.selective.pk.shotsPer60*.75,'safe PK must meaningfully reduce counters');
assert.ok(results.selective.pp.shotsPer60>results.selective.pk.shotsPer60*2,'extra skater should change attacking frequency');
console.log(JSON.stringify({passed:true,fixturesPerMode:60,controls:'Same initial rosters and first 60 fixtures; adaptive coaching frozen. Ungated disables only the new PK attempt gate, not a replay of an older release. Independent RNG paths after changed decisions.',results},null,2));
