'use strict';
// Production career adapter, same career and random seeds for each plan. Medical
// incidents are disabled here to isolate shifts; injury rules have their own suite.
const assert=require('node:assert/strict');
const {boot}=require('./career-test-fixture.cjs');
const start=boot();start.run(`startCareerWithClub('HV71');state.calendar.date=calendarTarget();startMatch();save();`);
const rows=[];
for(const seed of [1879,3758])for(const plan of ['short','long']){
 const app=boot(start.storage.value);
 app.run(`medicalRoll=()=>.999;state.tacticalPlan.shiftLength=${JSON.stringify(plan)};state.tacticalPlan.lineUsage='rollFour';studioEngine().rng=${seed};studioSyncPlans();`);
 const result=JSON.parse(app.run(`JSON.stringify((()=>{
  const e=studioEngine(),active=new Map(),completed=[],totals=[{seconds:0,tired:0},{seconds:0,tired:0}];let steps=0;
  while(e.time<1199&&steps++<30000){
   state.live.running=true;const time=e.time,actors=e.actors.slice();studioStep();const dt=e.time-time;if(dt<=0)continue;
   const ids=new Set();for(const a of actors){if(a.role==='G')continue;const id=a.side+':'+a.player.id;ids.add(id);const row=active.get(id)||{side:a.side,seconds:0};row.seconds+=dt;active.set(id,row);totals[a.side].seconds+=dt;if((state.live.energy?.players[a.player.id]?.level??100)<25)totals[a.side].tired+=dt;}
   for(const [id,row] of active)if(!ids.has(id)){completed.push(row);active.delete(id);}
   if(e.tick%10===0&&new Set(e.actors.map(a=>a.side+':'+a.player.id)).size!==e.actors.length)throw new Error('Duplicate on-ice player');
  }
  return {time:e.time,score:e.score,shots:e.stats.map(s=>s.shots),goalsRecorded:state.live.analysis.events.filter(s=>s.type==='goal').length,lineSeconds:matchLineRows(state.live.analysis.lineMatchups).reduce((n,r)=>n+r.seconds,0),sides:totals.map((total,side)=>{const shifts=completed.filter(r=>r.side===side).map(r=>r.seconds).sort((a,b)=>a-b);return {completed:shifts.length,mean:shifts.reduce((a,b)=>a+b,0)/shifts.length,p90:shifts[Math.floor((shifts.length-1)*.9)],max:Math.max(...shifts),lowEnergyPercent:total.tired*100/total.seconds};})};
 })())`));
 assert.ok(result.time>=1199);assert.equal(result.goalsRecorded,result.score[0]+result.score[1]);
 assert.ok(result.lineSeconds<=result.time+.2);rows.push({seed,plan,...result});
}
const mean=plan=>rows.filter(r=>r.plan===plan).reduce((n,r)=>n+r.sides[0].mean,0)/2;
assert.ok(mean('short')<mean('long'),'short shifts should shorten actual exposure across the paired sample');
console.log(JSON.stringify({method:'Four 20-minute production periods, paired seeds, same HV71 career, four-line rotation. Injuries disabled to isolate shifts. Descriptive game test, not empirical league calibration.',meanShiftSeconds:{short:mean('short'),long:mean('long')},rows},null,2));
