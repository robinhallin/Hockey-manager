'use strict';
const assert=require('node:assert/strict');
const {boot,bootLegacy}=require('./scripts/career-test-fixture.cjs');
for(const launch of [boot,bootLegacy]){
 const app=launch(),r=app.run;
 r("startCareerWithClub('HV71');state.calendar.date=calendarTarget();createMatch();deskNavigate('match');render()");
 const before=r('JSON.stringify([state.live.broadcast,state.live.rink,state.lines,state.tacticalPlan,state.live.analysis])');
 for(const tab of ['feedback','tactics','changes','lineup','stats','players','events','analysis','settings']){
  r(`matchTab('${tab}');matchCentreView();matchCoachView()`);
  assert.equal(r('JSON.stringify([state.live.broadcast,state.live.rink,state.lines,state.tacticalPlan,state.live.analysis])'),before,'rendering '+tab+' does not advance or change the engine');
 }
 r("state.live.venue={home:state.live.opponent,away:managerClub(),ownHome:false,arena:'Bortaarenan'};state.live.hv=1;state.live.opp=3;state.live.analysis.events.push({type:'goal',time:60,own:1,against:3,text:'Registrerat mål'})");
 assert.match(r('matchScoringView()'),/3–1/,'scoring strip follows home-away scoreboard');
 r("matchTab('players');globalThis.snapshot=deskSnapshot();matchTab('events');deskRestore(snapshot)");
 assert.equal(r('matchDesk.tab'),'players','profile history restores match panel');
 r('state.live.finished=true;matchDesk.tab="tactics";render()');
 assert.equal(r('matchDesk.tab'),'feedback','final whistle exposes post-match decisions');
 for(const tab of ['feedback','report','stats','players','events','analysis']){
  r(`matchTab('${tab}')`);assert.doesNotMatch(r('matchCentreView()'),/id="match-play"|NaN|undefined/);
 }
}
console.log('PASS: current and legacy match views preserve simulation, home-away scoring order, profile context and post-match reports.');
