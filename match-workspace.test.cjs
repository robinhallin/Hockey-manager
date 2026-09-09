const assert=require('node:assert/strict');
const {boot}=require('./scripts/career-test-fixture.cjs');
const a=boot(),r=a.run;
r("startCareerWithClub('HV71');state.calendar.date=calendarTarget();startMatch();state.page='match';pauseMatch();save()");
const saved=a.storage.value;
assert.doesNotMatch(r('matchCentreView()'),/<details class="mc-details"/,'live statistics have one home on the bench');
r("matchTab('settings')");assert.match(r('matchCoachView()'),/Automatiska pauser/);
r("setMatchPreference('goal',false);save()");const restored=boot(a.storage.value);assert.equal(restored.run('matchPreferences().goal'),false);
r("matchTab('stats')");assert.match(r('matchCoachView()'),/Båda lagens matchstatistik/);
// Same saved engine and coaching, different presentation modes: events must agree.
let expected;
for(const mode of r('Object.keys(MATCH_VIEW_MODES)')){
 const b=boot(saved),q=b.run;
 q(`rinkMode(${JSON.stringify(mode)});startMatch();for(let i=0;i<2400;i++)studioStep();`);
 const actual=q('JSON.stringify([studioEngine().rng,studioEngine().score,studioEngine().time,state.live.analysis.shots,state.live.analysis.events])');
 if(expected)assert.equal(actual,expected,mode+' shares simulation and ledger');else expected=actual;
}
console.log('PASS: one live statistics home, settings persistence, identical simulated events across all presentation modes.');
