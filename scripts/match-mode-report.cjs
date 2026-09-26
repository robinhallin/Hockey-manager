'use strict';
// Compare whole fixture pairs, never individual shots as independent samples.
const fs=require('node:fs'),assert=require('node:assert/strict');
function interval(values){
 if(values.length<2)return null;
 let seed=17339;const samples=[];
 for(let b=0;b<2000;b++){
  let total=0;for(let i=0;i<values.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;total+=values[Math.floor(seed/4294967296*values.length)];}
  samples.push(total/values.length);
 }
 samples.sort((a,b)=>a-b);return [samples[49],samples[1949]];
}
function summarize(rows){
 assert.ok(rows.length,'No completed fixture pairs');
 const groups={},seen=new Set();
 for(const row of rows){
  const fixtureKey=JSON.stringify([row.live?.[0]?.club,row.venue,row.scenario,row.sample]);
  assert.ok(!seen.has(fixtureKey),'Duplicate fixture would inflate the sample');seen.add(fixtureKey);
  assert.ok(row.live?.length===2&&row.background?.length===2,'Two teams in both modes required');
  for(const [side,live] of row.live.entries()){
   const background=row.background.find(t=>t.club===live.club);assert.ok(background,'Background club must match live club');
   assert.ok(live.shots>=live.goals&&background.shots>=background.goals,'Goals cannot exceed shots on target');
   const key=[row.live[0].club,row.venue,row.scenario,side===0?'manager':'opponent'].join(' / ');
   const group=groups[key]??={fixtures:0,club:live.club,metrics:{},strength:{},_pairs:[]};
   group.fixtures++;group._pairs.push({live,background});
   for(const mode of ['live','background'])for(const strength of ({live,background})[mode].strength){
    const dest=(group.strength[strength.kind]??={})[mode]??={seconds:0,shots:0,attempts:0,xg:0,goals:0};
    for(const k of Object.keys(dest)){assert.ok(Number.isFinite(strength[k])&&strength[k]>=0,'Finite nonnegative strength evidence');dest[k]+=strength[k];}
   }
  }
 }
 const warnings=[];
 for(const [key,g] of Object.entries(groups)){
  for(const metric of ['shots','goals','xg']){
   const live=g._pairs.map(p=>p.live[metric]),background=g._pairs.map(p=>p.background[metric]);
   assert.ok([...live,...background].every(n=>Number.isFinite(n)&&n>=0),'Finite nonnegative metrics');
   const mean=xs=>xs.reduce((s,x)=>s+x,0)/xs.length,deltas=live.map((x,i)=>x-background[i]);
   g.metrics[metric]={live:mean(live),background:mean(background),liveMinusBackground:mean(deltas),bootstrap95:interval(deltas)};
   // Preserve the original diagnostic limits. Uncertainty is shown separately.
   if((metric==='shots'&&Math.abs(mean(deltas))>10)||(metric==='goals'&&Math.abs(mean(deltas))>2))warnings.push({group:key,metric,...g.metrics[metric]});
  }
  for(const modes of Object.values(g.strength))for(const v of Object.values(modes)){v.shotsPer60=v.seconds?v.shots*3600/v.seconds:null;v.xgPerAttempt=v.attempts?v.xg/v.attempts:null;}
  delete g._pairs;
 }
 return {completed:true,calibrationPassed:warnings.length===0,fixtures:rows.length,warnings,method:'Fixed roster and plan within each pair; regulation only. Bootstrap intervals resample fixture differences (2,000 draws); they describe sampling uncertainty, not external league validation or proof of equivalence. Groups are kept separate by manager club, venue, tactic and side. Different engines use independent RNG paths. Sparse special-team exposure is reported, not hidden. Shot/goal warning limits remain 10/2 per team per game.',groups};
}
if(require.main===module){
 const files=process.argv.slice(2);assert.ok(files.length,'Usage: node scripts/match-mode-report.cjs results.jsonl [...]');
 const rows=files.flatMap(file=>fs.readFileSync(file,'utf8').trim().split('\n').filter(Boolean).map(JSON.parse).filter(r=>r.live));
 const report=summarize(rows);console.log(JSON.stringify(report,null,2));process.exitCode=report.calibrationPassed?0:1;
}
module.exports={summarize};
