'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
const dir=process.argv[2],out=process.argv[3];
if(!dir||!out)throw Error('Usage: node scripts/check-ai-overtime.cjs sample-directory output.json');
const r=require('./headless-career.cjs').headlessCareer().run;
// Test-only adapter skips regulation; the entire production overtime tick runs.
const code=fs.readFileSync(path.join(__dirname,'../rivals.js'),'utf8');
const start=code.indexOf('function rivalSimulate('),end=code.indexOf('\nfunction rivalAfterFixture(',start);
let body=code.slice(start,end).replace('function rivalSimulate(', 'function calibrationOvertime(');
const regulation='for(let i=0;i<180;i++){if(i>0&&i%60===0)recover(180);tick();}';
assert.ok(body.includes(regulation));body=body.replace(regulation,'time=3600;');r(body);
r('medicalExposure=()=>{};aiDecisions=()=>{};simulateOtherGames=()=>{};aiCoachDecision=(club,base)=>({...base});finishMatch=()=>{state.live.finished=true;state.live.running=false;};');
const rows=[];
for(let i=0;i<24;i++){
 const sample=JSON.parse(fs.readFileSync(path.join(dir,i+'.json'),'utf8'));
 globalThis.calibrationInput=sample;
 r(`state=JSON.parse(JSON.stringify(calibrationInput.initial));globalThis.e=studioEngine();e.rng=${341011+i*9199};e.time=3600;e.periodStart=3600;e.duration=3900;e.finished=false;e.threeOnThree=true;e.score=[0,0];state.live.period=4;state.live.hv=0;state.live.opp=0;studioSyncPlans(e);for(const side of [0,1])e.installUnit(side);e.faceoffPositions();state.live.analysis.shots=[];while(e.time<3900&&!state.live.finished){state.live.running=true;studioStep();}`);
 const live=JSON.parse(r('JSON.stringify({seconds:e.time-3600,shots:state.live.analysis.shots.filter(analysisOnTarget).length,attempts:state.live.analysis.shots.length,xg:state.live.analysis.shots.reduce((n,s)=>n+s.probability,0),goals:e.score[0]+e.score[1]})'));
 const background=[];
 for(let j=0;j<8;j++){
  globalThis.calibrationInput=JSON.parse(JSON.stringify(sample));
  r(`state=calibrationInput.initial;globalThis.otLineups=calibrationInput.lineups;rivalLineup=club=>otLineups.find(l=>l.club===club);globalThis.result=calibrationOvertime({...calibrationInput.fixture,round:${441011+i*9199+j*104729}});`);
  background.push(JSON.parse(r("JSON.stringify({seconds:result.duration-3600,shots:result.reports.reduce((n,t)=>n+t.shots,0),attempts:result.reports.reduce((n,t)=>n+t.attempts,0),xg:result.reports.reduce((n,t)=>n+t.attemptXg,0),goals:result.homeGoals+result.awayGoals-(result.shootout?1:0)})")));
 }
 assert.ok(live.goals<=1&&background.every(b=>b.goals<=1));rows.push({id:i,live,background});
}
const totals=Object.fromEntries(['live','background'].map(mode=>{const ts=rows.flatMap(r=>mode==='live'?[r.live]:r.background),d=Object.fromEntries(['seconds','shots','attempts','xg','goals'].map(k=>[k,ts.reduce((n,t)=>n+t[k],0)]));d.shotsPer60=d.shots*1800/d.seconds;d.xgPerAttempt=d.xg/Math.max(1,d.attempts);return [mode,d];}));
const checks={shots:Math.abs(totals.live.shotsPer60-totals.background.shotsPer60)/totals.live.shotsPer60<=.25,quality:Math.abs(totals.live.xgPerAttempt-totals.background.xgPerAttempt)<=.015};
const report={passed:Object.values(checks).every(Boolean),method:'24 fresh-roster sudden-death 3v3 overtime samples; eight background seeds each. Test-only entry skips regulation; actual career and background overtime rules run. Both sides pooled, minutes end at decisive goal. Fatigue carryover is covered separately by readiness and full-game rules tests.',checks,totals,rows};
fs.writeFileSync(out,JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,totals,checks}));process.exitCode=report.passed?0:1;
