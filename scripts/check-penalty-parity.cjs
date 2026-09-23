'use strict';
// Complete production matches, repeated with the same initial state and timed
// manager instructions. Display selection is observational. No artificial goals.
const assert=require('node:assert/strict'),fs=require('node:fs');
const app=require('./headless-career.cjs').headlessCareer(),r=app.run;
const samples=Number(process.env.PENALTY_SAMPLES||3),modes=['full','extended','highlights','commentary'];
assert.ok(Number.isInteger(samples)&&samples>=1&&samples<=20);
r("startCareerWithClub('HV71');state.calendar.date=calendarTarget();medicalRoll=()=>.999;simulateOtherGames=()=>{};startMatch();pauseMatch();globalThis.penaltyInitial=JSON.stringify(state)");
const results=[];
for(let sample=0;sample<samples;sample++){
 const seed=710031+sample*1107;let expected;
 for(const [modeIndex,mode] of modes.entries()){
  r(`state=JSON.parse(penaltyInitial);state.live.rink.mode=${JSON.stringify(mode)};state.live.speed=${modeIndex+1};globalThis.penaltyEngine=studioEngine();penaltyEngine.rng=${seed};globalThis.penaltySteps=0;globalThis.penaltyOrders=0;globalThis.penaltyReloaded=false;
  while(!state.live.finished&&penaltySteps++<100000){
   if(penaltyEngine.time>=600&&penaltyOrders===0){matchOrder('physicality','safe');penaltyOrders++;}
   if(penaltyEngine.time>=1200&&penaltyOrders===1){matchOrder('tempo','low');penaltyOrders++;}
   if(${modeIndex>=2}&&!penaltyReloaded&&penaltyEngine.time>=900){state=validateSaveText(saveExportText());penaltyEngine=studioEngine();penaltyReloaded=true;}
   if(!state.live.running){while(medicalPending())medicalDecisionAccept();startMatch();}
   studioTrackHighlight(penaltyEngine,state.live);studioPlaybackRate(penaltyEngine,state.live);studioStep();
  }`);
  assert.equal(r('state.live.finished'),true,mode+' completes');
  assert.equal(r('state.live.analysis.saved'),true);
  assert.equal(r('state.live.leagueBox.saved'),true);
  const raw=r(`JSON.stringify({score:[state.live.hv,state.live.opp],shots:[state.live.shotsHV,state.live.shotsOpp],events:state.live.eventStream,report:state.live.analysis,box:state.live.leagueBox,ice:state.live.iceTime,energy:state.live.energy,rng:penaltyEngine.rng})`);
  if(expected)assert.equal(raw,expected,mode+' must have identical outcomes, events, accounting, energy and RNG');else expected=raw;
  const data=JSON.parse(raw),summary=r('MatchEventStream.summary(state.live.eventStream)');
  for(const row of Object.values(data.box.players)){
   const side=row.club===r('managerClub()')?0:1,key=side+':'+row.id;
   assert.equal(row.pim,summary.players[key]?.pim||0,'league box and event minutes');
   if(side===0)assert.equal(data.report.players[row.id]?.pim||0,row.pim,'analysis and box minutes');
  }
  assert.deepEqual(Array.from(summary.shots),data.shots,'scoreboard and shot events');
  const committed=r('JSON.stringify([state.leagueStatistics.rows,state.analysis.matches])');
  r('leagueCommitLive();finishAnalysis();save();state=validateSaveText(saveExportText());studioEngine();leagueCommitLive();finishAnalysis()');
  assert.equal(r('JSON.stringify([state.leagueStatistics.rows,state.analysis.matches])'),committed,'finished match cannot be committed twice after load');
  const penalties=data.events.events.filter(e=>e.type==='penalty');
  const row={sample:sample+1,seed,mode,reloaded:r('penaltyReloaded'),score:data.score,shots:data.shots,penalties:penalties.length,minutes:[0,1].map(side=>penalties.filter(e=>e.side===side).reduce((n,e)=>n+e.minutes,0)),powerplays:Array.from(summary.pp),ppGoals:Array.from(summary.ppGoals),duration:r('penaltyEngine.time'),rng:data.rng};
  results.push(row);console.log(JSON.stringify(row));
 }
}
const independent=results.filter(r=>r.mode==='full');
const result={passed:true,matches:results.length,independentSeeds:samples,displayModes:modes,controls:'Same start state, lineups, seed and timed physicality/tempo instructions. Injury rolls disabled and other fixtures skipped only in this harness. Natural player decisions, penalties, energy, AI coaching, overtime, shootout and career commit remain active. Highlight/commentary runs also export/import at 900 simulated seconds. Automated integration, not visual playtesting or sufficient balance proof.',averages:{totalGoals:independent.reduce((n,r)=>n+r.score[0]+r.score[1],0)/samples,totalShots:independent.reduce((n,r)=>n+r.shots[0]+r.shots[1],0)/samples,totalPenalties:independent.reduce((n,r)=>n+r.penalties,0)/samples},results};
if(process.env.PENALTY_OUTPUT)fs.writeFileSync(process.env.PENALTY_OUTPUT,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({...result,results:undefined}));
