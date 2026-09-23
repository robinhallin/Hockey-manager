'use strict';
const assert=require('node:assert/strict');
const {headlessCareer}=require('./scripts/headless-career.cjs');
const {boot}=require('./scripts/career-test-fixture.cjs');
const app=headlessCareer(),r=app.run;
r(`startCareerWithClub('Djurgårdens IF');globalThis.signing=playerById('ep-241370');
 lineupPickSlot('forwards',2);lineupPlace(signing.id);setIndividualLoad(signing.id,'light');`);
assert.equal(r('state.lines.forwards[2]'),'ep-241370');
assert.equal(r('state.calendar.date'),'2026-09-23');
const matches=[];
for(let guard=0;r('state.calendar.date')<'2026-09-30'&&guard<30;guard++){
 if(r('Boolean(pendingManagerDecision())'))r(`globalThis.decision=pendingManagerDecision();if(decision.decisionType==='minutes')answerPlayerConversation(decision.id,'honest')`);
 if(r('state.calendar.date>=calendarTarget()&&(!state.live||state.live.finished)&&state.calendar.completedMatchDate!==state.calendar.date')){
  r(`lineupPickSlot('forwards',2);lineupPlace(signing.id);startMatch();pauseMatch();
   globalThis.beforeProfile=JSON.stringify(state.live);deskOpenPlayer(signing.id);deskBack('match');`);
  assert.equal(r('JSON.stringify(state.live)'),r('beforeProfile'),'profile visit preserves paused match and RNG');
  r('save()');const paused=boot(app.storage.value);
  assert.equal(paused.run('JSON.stringify(state.live)'),r('JSON.stringify(state.live)'));
  r(`globalThis.steps=0;while(!state.live.finished&&steps++<100000){
   if(!state.live.running){while(medicalPending())medicalDecisionAccept();startMatch();}
   studioStep();
  }`);
  assert.equal(r('state.live.finished'),true);
  assert.ok(r('state.live.iceTime[signing.id]>0'),'new signing has recorded ice time');
  matches.push(r('({date:state.calendar.date,score:[state.live.hv,state.live.opp],seconds:state.live.iceTime[signing.id]})'));
 }else r('calendarContinue()');
}
assert.equal(r('state.calendar.date'),'2026-09-30');
assert.equal(matches.length,2);
assert.equal(r('signing.games'),2);
assert.equal(r('signing.trainingLoad'),'light');
r('save()');const restored=boot(app.storage.value);
assert.equal(restored.run('playerById("ep-241370").games'),2);
assert.equal(restored.run('JSON.stringify(state.analysis.matches)'),r('JSON.stringify(state.analysis.matches)'));
assert.equal(restored.run('state.calendar.date'),'2026-09-30');
assert.doesNotThrow(()=>restored.run('validateSaveText(saveExportText())'));
console.log('PASS: current-roster week, Wahlstrom lineup/training, two engine matches, paused profile/reload and saved reports.',JSON.stringify(matches));
