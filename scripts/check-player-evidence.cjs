'use strict';
// Controlled model comparison using current production physics for both groups.
// Requires the referenced historical commit locally; never fetches or changes saves.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const {boot}=require('./career-test-fixture.cjs');
const {Match}=require('./current-match-engine.cjs');
const baseline='de038ac831c3c3632ad7c4175896c942a71c4f26';
const legacy=vm.createContext({});
for(const file of ['attributes.js','allsvenskan-data.js','allsvenskan.js'])vm.runInContext(execFileSync('git',['show',baseline+':'+file],{encoding:'utf8'}),legacy);
const app=boot(),r=app.run;
r('startCareerWithClub("AIK")');
const clubs=['HV71','Frölunda HC','AIK','Mora IK'];
const fresh=JSON.parse(r(`JSON.stringify(Object.fromEntries(${JSON.stringify(clubs)}.map(c=>[c,state.clubRosters[c]])))`));
const old={};
for(const club of clubs)old[club]=JSON.parse(vm.runInContext(`JSON.stringify((SHL_DATABASE.clubs[${JSON.stringify(club)}]||ALLSVENSKAN_DATABASE.clubs[${JSON.stringify(club)}]).players.map(p=>haPlayer(p,${JSON.stringify(club)})))`,legacy));
const samples=16,rows=[];
for(const [home,away] of [['HV71','Frölunda HC'],['AIK','Mora IK']])for(let seed=1;seed<=samples;seed++)for(const [model,data] of [['previous',old],['updated',fresh]]){
 const rosters=[home,away].map(name=>({name,code:name,players:data[name].map(p=>({id:p.id,name:p.name,pos:p.pos,attributes:p.attributes}))}));
 const m=new Match(rosters,{seed:seed*1107,duration:1200});let steps=0;
 while(!m.finished&&steps++<24000)m.step();
 assert.ok(m.finished,'period completed');
 assert.equal(m.shots.filter(s=>s.outcome==='goal').length,m.score[0]+m.score[1]);
 rows.push({home,away,seed:seed*1107,model,score:m.score,stats:m.stats.map(s=>({shots:s.shots,attempts:s.attempts,saves:s.saves})),rng:m.rng});
 console.log(JSON.stringify(rows.at(-1)));
}
const all=r('Object.values(state.clubRosters).flat().filter(p=>p.research?.model)');
const examples=['Tim Forslund','Marcus Hellgren-Smed','Tobias Normann','Fredrik Händemark','Scott Pooley','Anders Grönlund','Daniel Meyer','Lukas Nikolaj Pettersen-Finckenhagen'].map(name=>{
 const p=all.find(p=>p.name===name);assert.ok(p,name);
 const before=vm.runInContext(`(()=>{const row=[...Object.values(SHL_DATABASE.clubs),...Object.values(ALLSVENSKAN_DATABASE.clubs)].flatMap(c=>c.players).find(p=>p.id===${JSON.stringify(p.id)});return haPlayer(row,${JSON.stringify(p.club)});})()`,legacy);
 return {id:p.id,name,club:p.club,age:p.age,before:{height:before.research.height,weight:before.research.weight,attributes:before.attributes,growth:before.attributeGrowth},after:{height:p.research.height,weight:p.research.weight,attributes:p.attributes,growth:p.attributeGrowth,forecast:r(`evidencePotential(evidenceStartingRow([...Object.values(SHL_DATABASE.clubs),...Object.values(ALLSVENSKAN_DATABASE.clubs)].flatMap(c=>c.players).find(p=>p.id===${JSON.stringify(p.id)})))`)},officialSources:[...new Set(p.research.stats.flatMap(s=>(s.sources||[]).map(x=>typeof x==='string'?'https://stats.swehockey.se/Players/Statistics/'+x:x.url)))]};
});
const totals=Object.fromEntries(['previous','updated'].map(model=>{const games=rows.filter(r=>r.model===model),sum=key=>games.reduce((n,r)=>n+r.stats.reduce((n,s)=>n+s[key],0),0);return [model,{periods:games.length,goals:games.reduce((n,r)=>n+r.score[0]+r.score[1],0),shots:sum('shots'),attempts:sum('attempts')}];}));
const report={baselineCommit:baseline,model:r('PLAYER_EVIDENCE_MODEL.version'),periods:rows.length,fullMatches:0,controls:'64 twenty-minute periods: 2 fixtures × 16 identical seeds × previous/updated player attributes. Same current production engine, roster order, rules and default tactics. Development/social values do not add match bonuses. Random paths diverge after changed decisions; outcomes are descriptive, not proof of improved realism or individual causality.',totals,rows,examples,
 limitations:['Small four-club sample, not a league calibration or full-season playtest.','Unmeasured defensive, physical and mental traits remain explicit model priors. No visual playtesting performed.']};
fs.writeFileSync('data/player-model-review.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({totals,examples:examples.length}));
