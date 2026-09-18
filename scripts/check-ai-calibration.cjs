'use strict';
// Acceptance limits are set before evaluating the held-out clubs. This checks
// simulation consistency, not a claim of matching an external hockey dataset.
const fs=require('node:fs'),assert=require('node:assert/strict');
const input=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const baseline=process.argv[3]?JSON.parse(fs.readFileSync(process.argv[3],'utf8')):null;
const output=process.argv[4];
const limits={overallShotsRelative:.10,overallXgRelative:.15,evenShotsRelative:.15,ppShotsRelative:.25,pkShotsAbsolute:5,strengthXgPerAttemptAbsolute:.012,ppExposureRelative:.25,tacticalShotsAbsolute:8,tacticalShotsRelative:.25,tacticalXgAbsolute:.6,tacticalXgRelative:.30,venueShotsRelative:.15,venueXgRelative:.20,ppMatchupShotsRelative:.35,ppMatchupQualityAbsolute:.02};
function aggregate(input,phase){
 const groups={};
 for(const r of input.results.filter(r=>r.spec.phase===phase))for(const [side,live] of r.live.entries()){
  const plan=r.plans[side];
  const keys=['all','tactic:'+plan.style+':'+plan.shotChoice,'venue:'+r.spec.venue];
  for(const [mode,rows] of [['live',[live]],['background',r.background.map(b=>b.find(t=>t.club===live.club))]])for(const t of rows){
   for(const key of keys){const d=((groups[key]??={})[mode]??={n:0,shots:0,goals:0,xg:0});d.n+=1/rows.length;for(const metric of ['shots','goals','xg'])d[metric]+=t[metric]/rows.length;}
   for(const strength of t.strength)for(const key of strength.kind==='pp'?['pp','pp-matchup:'+plan.pp+':'+r.plans[1-side].pk,...(r.spec.purpose==='targetedControl'?['pp-matchup:targeted-overload-diamond']:[])]:[strength.kind]){const d=((groups[key]??={})[mode]??={seconds:0,shots:0,goals:0,xg:0,attempts:0});for(const metric of Object.keys(d))d[metric]+=strength[metric]/rows.length;}
  }
 }
 for(const modes of Object.values(groups))for(const d of Object.values(modes)){
  if(d.n){for(const key of ['shots','goals','xg'])d[key]/=d.n;}
  else{d.shotsPer60=d.shots*3600/d.seconds;d.attemptsPer60=d.attempts*3600/d.seconds;d.xgPerAttempt=d.xg/Math.max(1,d.attempts);}
 }
 return groups;
}
const groups=aggregate(input,'validation'),checks=[];
const check=(name,difference,limit)=>checks.push({name,difference,limit,passed:difference<=limit});
const diff=(g,k)=>Math.abs(g.live[k]-g.background[k]);
const relative=(g,k)=>diff(g,k)/Math.max(1e-9,g.live[k]);
assert.equal(input.results.filter(r=>r.spec.phase==='validation').length,99,'81 general and 18 fresh targeted control fixtures');
for(const key of ['shots','xg'])check('overall '+key,relative(groups.all,key),key==='shots'?limits.overallShotsRelative:limits.overallXgRelative);
for(const kind of ['even','pp','pk']){
 check(kind+' shots/60',kind==='pk'?diff(groups[kind],'shotsPer60'):relative(groups[kind],'shotsPer60'),kind==='pk'?limits.pkShotsAbsolute:kind==='pp'?limits.ppShotsRelative:limits.evenShotsRelative);
 check(kind+' expected goals per attempt',diff(groups[kind],'xgPerAttempt'),limits.strengthXgPerAttemptAbsolute);
}
check('powerplay exposure',relative(groups.pp,'seconds'),limits.ppExposureRelative);
for(const [key,g] of Object.entries(groups)){
 if(key.startsWith('tactic:')){
  check(key+' shots',diff(g,'shots'),Math.max(limits.tacticalShotsAbsolute,g.live.shots*limits.tacticalShotsRelative));
  check(key+' xg',diff(g,'xg'),Math.max(limits.tacticalXgAbsolute,g.live.xg*limits.tacticalXgRelative));
 }
 if(key.startsWith('pp-matchup:')){check(key+' shots/60',relative(g,'shotsPer60'),limits.ppMatchupShotsRelative);check(key+' expected goals per attempt',diff(g,'xgPerAttempt'),limits.ppMatchupQualityAbsolute);}
 if(key.startsWith('venue:'))for(const metric of ['shots','xg'])check(key+' '+metric,relative(g,metric),metric==='shots'?limits.venueShotsRelative:limits.venueXgRelative);
}
// Cluster resampling keeps both teams and their tactical interaction together.
let seed=17339;const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const rows=input.results.filter(r=>r.spec.phase==='validation'),intervals={};
for(const metric of ['shots','xg']){
 const samples=[];
 for(let b=0;b<1000;b++){
  let delta=0;
  for(let n=0;n<rows.length;n++){
   const r=rows[Math.floor(rand()*rows.length)];
   delta+=r.background.reduce((sum,teams)=>sum+teams.reduce((s,t)=>s+t[metric],0),0)/r.background.length-r.live.reduce((s,t)=>s+t[metric],0);
  }
  samples.push(delta/(rows.length*2));
 }
 samples.sort((a,b)=>a-b);intervals[metric]={backgroundMinusLive:groups.all.background[metric]-groups.all.live[metric],bootstrap95:[samples[24],samples[974]]};
}
const score=g=>Object.entries(g).filter(([k])=>k.startsWith('tactic:')).reduce((n,[,v])=>n+(diff(v,'shots')/8)**2+(diff(v,'xg')/.6)**2,0);
const before=baseline?aggregate(baseline,'validation'):null;
if(before)check('tactical discrepancy improvement',score(groups),score(before)*.8);
const report={passed:checks.every(c=>c.passed),limits,method:'81 general regulation controls plus 18 fresh targeted controls after a sparse-cell diagnosis; parameters fitted to 174 separate training fixtures. Background repeats share the same frozen initial lineup, plan and roster. Adaptive coaching/injuries disabled only in the comparison harness; fatigue and rotation retained. Bootstrap resamples whole fixtures. Limits are consistency guardrails, not external league validation.',fixtures:rows.length,backgroundRepeats:input.repeats,checks,intervals,groups,before:before?{groups:before,discrepancy:score(before),afterDiscrepancy:score(groups)}:null};
if(output)fs.writeFileSync(output,JSON.stringify(report,null,2));
console.log(JSON.stringify({passed:report.passed,checks:checks.length,failures:checks.filter(c=>!c.passed),intervals,overall:groups.all},null,2));
process.exitCode=report.passed?0:1;
