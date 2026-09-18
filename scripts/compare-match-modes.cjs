'use strict';
// Paired fixtures from the same career state. Report distributions, not identical
// outcomes: background opportunities and spatial geometry remain distinct.
const assert=require('node:assert/strict');
const {boot}=require('./career-test-fixture.cjs');
const samples=Number(process.env.MATCH_SAMPLES||6);
const app=boot(),r=app.run;
r("startCareerWithClub('HV71');globalThis.initial=JSON.stringify(state);globalThis.fixture=state.schedule.find(g=>g.round===state.round&&(g.home===managerClub()||g.away===managerClub()));");
const totals={live:[{shots:0,goals:0,xg:0},{shots:0,goals:0,xg:0}],background:[{shots:0,goals:0,xg:0},{shots:0,goals:0,xg:0}]};
const fixture=JSON.parse(r('JSON.stringify(fixture)'));
for(let i=0;i<samples;i++){
 r(`state=JSON.parse(initial);fixture=state.schedule.find(g=>g.round===state.round&&(g.home===managerClub()||g.away===managerClub()));fixture.round=${i+1};globalThis.result=rivalSimulate(fixture);`);
 const background=JSON.parse(r('JSON.stringify(result.reports.map(x=>({shots:x.shots,goals:x.shotAssessment.goals,xg:x.shotAssessment.expectedGoals})))'));
 // Return home/away to manager/opponent order used by the live engine.
 if(fixture.home!=='HV71')background.reverse();
 r(`state=JSON.parse(initial);state.calendar.date=calendarTarget();startMatch();pauseMatch();globalThis.e=studioEngine();e.rng=${(i+1)*1107};e.duration=1200;globalThis.steps=0;while(!e.finished&&steps++<24000)e.step();`);
 assert.ok(r('e.finished'),'Spatial period must complete');
 const live=JSON.parse(r('JSON.stringify([0,1].map(side=>({shots:e.stats[side].shots*3,goals:e.score[side]*3,xg:e.shots.filter(s=>s.side===side&&["goal","save","rebound"].includes(s.outcome)).reduce((n,s)=>n+s.quality/Math.max(.001,(1-s.blockChance)*s.onTargetChance),0)*3})))'));
 for(const mode of ['live','background'])for(let side=0;side<2;side++)for(const key of ['shots','goals','xg'])totals[mode][side][key]+=(mode==='live'?live:background)[side][key]/samples;
 console.log(JSON.stringify({sample:i+1,live,background}));
}
for(const rows of Object.values(totals))for(const row of rows)assert.ok(Object.values(row).every(Number.isFinite));
const ratios=totals.live.map((row,i)=>({shots:row.shots/Math.max(1,totals.background[i].shots),xg:row.xg/Math.max(.01,totals.background[i].xg)}));
// Wide smoke bounds flag catastrophic divergence, not a claim of calibration.
assert.ok(ratios.every(r=>r.shots>.2&&r.shots<5&&r.xg>.1&&r.xg<10),JSON.stringify({totals,ratios}));
console.log(JSON.stringify({passed:true,samples,fixture:{home:fixture.home,away:fixture.away},units:'Conditional xG on target in both modes. Live 20-minute periods scaled to 60; background full games (may include overtime). Each mode retains its selection/rotation policy.',totals,ratios}));
