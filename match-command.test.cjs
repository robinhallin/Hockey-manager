'use strict';
const assert=require('node:assert/strict');
const {boot,bootLegacy}=require('./scripts/career-test-fixture.cjs');
for(const launch of [boot,bootLegacy]){
 const app=launch(),r=app.run;
 r("startCareerWithClub('HV71');state.calendar.date=calendarTarget();createMatch();deskNavigate('match');coachJourneyMove('bench')");
 assert.equal(r('matchCommandPhase()'),'pregame');
 const snapshot=r('JSON.stringify([state.live.broadcast,state.live.rink,state.lines,state.tacticalPlan,state.live.analysis])');
 for(const action of ['timeout','goalie']){assert.equal(r(`matchCommandAvailability('${action}')`),false);r(`matchCommandBenchAction('${action}')`);}
 assert.equal(r('JSON.stringify([state.live.broadcast,state.live.rink,state.lines,state.tacticalPlan,state.live.analysis])'),snapshot,'unavailable pregame actions do nothing');
 assert.ok(r('matchFeedbackView().indexOf("locker-talk")<matchFeedbackView().indexOf("mx-assistant")'),'the team talk comes before observations');
 r('startMatch()');assert.equal(r('matchCommandPhase()'),'running');
 r("matchTab('stats')");assert.equal(r('state.live.running'),true,'match data follows play');
 r("if(studioActive()){for(let i=0;i<120;i++)studioStep()}else liveStep();matchTab('changes')");assert.equal(r('matchCommandPhase()'),'paused');
 assert.equal(r("matchCommandAvailability('timeout')"),true);
 if(r('studioActive()')){
  r('studioEngine().icingHold=0;studioEngine().stoppage=3');
  assert.equal(r("matchCommandAvailability('goalie')"),false,'icing prevents a keeper change');
  r('studioEngine().icingHold=null;studioEngine().teams[0].wantPulled=true');
  assert.equal(r('matchCommandGoalieLabel()'),'Sätt in målvakten','pending request can be cancelled before the whistle');
  r('studioReplayState={frames:[studioFrame(studioEngine())],elapsed:0,lastNow:null}');
  assert.equal(r('matchCommandPhase()'),'replay');
  assert.equal(r("matchCommandAvailability('timeout')"),false);
  for(const tab of ['feedback','tactics','changes','lineup']){r(`matchDesk.tab='${tab}'`);assert.match(r('matchDeskContent()'),/Stäng reprisen och coacha/);}
  r('studioReplayState=null');
 }
 r('state.live.minute=0;state.live.second=0;state.live.period=2');
 assert.equal(r('matchCommandPhase()'),'intermission');
 r('state.live.timeoutUsed=true');assert.equal(r("matchCommandAvailability('timeout')"),false);
 r('state.live.finished=true');assert.equal(r('matchCommandPhase()'),'finished');
 assert.equal(r("matchCommandAvailability('goalie')"),false);
 assert.doesNotMatch(r('matchDeskView()'),/id="match-play"|NaN|undefined/);
}
console.log('PASS: match phases, live statistics, pregame/replay/icing guards, queued keeper labels and final-whistle controls.');
