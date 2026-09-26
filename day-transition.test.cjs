'use strict';
const assert=require('node:assert/strict');
const {boot}=require('./scripts/career-test-fixture.cjs');
const app=boot(),r=app.run;
r("startCareerWithClub('HV71');save();globalThis.queued=[];setTimeout=fn=>{queued.push(fn);return queued.length}");
const reference=boot(app.storage.value),q=reference.run;
q("resumeCareer()");
const before=r('state.calendar.date');
r('globalThis.clock=100;performanceNow=()=>clock;globalThis.timedContinue=calendarContinue;calendarContinue=()=>{clock+=37;timedContinue()}');
r('continueGame();continueGame()');
assert.equal(r('queued.length'),1,'double click schedules exactly one step');
assert.equal(r('state.calendar.date'),before,'loading paints before simulation');
assert.equal(app.get('.game-shell').inert,true);
assert.equal(r('dayTransitionClose()'),false,'cannot dismiss while processing');
assert.match(app.get('#day-transition-root').innerHTML,/Dagen bearbetas/);
assert.equal(r("performanceSummary('nextDay').count"),0,'no sample before queued work');
r('clock=10000;queued.shift()()');q('calendarContinue()');
assert.equal(r("performanceSummary('nextDay').count"),1);
assert.equal(r("performanceSummary('nextDay').last"),37,'measures actual work, excludes queued waiting');
assert.equal(r('state.calendar.date'),r(`calAdd('${before}',1)`));
assert.equal(r('dayTransition'),null);assert.ok(r('state.calendar.lastDaySummary'));
const projection='JSON.stringify([state.calendar.date,state.training.history,state.money,state.round,managerRoster().map(p=>[p.id,p.fatigue,p.attributes]),state.rivals.events])';
const av=JSON.parse(r(projection)),bv=JSON.parse(q(projection));av.forEach((v,i)=>assert.deepEqual(v,bv[i],'parity field '+i));
assert.ok(r("state.calendar.lastDaySummary.rows.some(row=>row.kind==='message'&&row.title.includes('rapport'))"));
const after=r('JSON.stringify(state)');
r('daySummaryView();dayTransitionRender()');
assert.equal(r('JSON.stringify(state)'),after,'summary rendering and further clicks cannot advance time');
const count=r('state.training.history.length');
r('dayTransitionClose()');
assert.equal(app.get('.game-shell').inert,false);
assert.equal(r('state.training.history.length'),count);
assert.equal(r('dayTransition'),null);
assert.equal(boot(app.storage.value).run('state.calendar.date'),r('state.calendar.date'),'completed day is already saved');

// Existing mandatory decisions route directly, without a timer or a day step.
r("managerMessage('day-required','Ditt svar','Välj roll','Spelare',{decisionType:'role'});globalThis.date=state.calendar.date;continueGame()");
assert.equal(r('dayTransition'),null);
assert.equal(r('state.calendar.date'),r('date'));

// Only newly registered events/results are shown, with correct leagues and escaping.
r("pendingManagerDecision().resolved=true;globalThis.snapshot=dayTransitionSnapshot();managerMessage('day-new','<img src=x>','Ny rapport','Scout');rivalEvent('AIK','coach','Ny tränare','Faktisk händelse');globalThis.g=state.schedule.find(g=>!g.played);Object.assign(g,{played:true,homeGoals:3,awayGoals:2});globalThis.rows=dayTransitionSummary(snapshot)");
assert.ok(r("rows.some(row=>row.kind==='world'&&row.title==='Ny tränare')"));
assert.ok(r("rows.some(row=>row.kind==='result'&&row.title.includes('3–2'))"));
assert.equal(r("rows.filter(row=>row.kind==='result').length"),1);
assert.equal(r('dayTransitionSummary(dayTransitionSnapshot()).length'),0);
r("dayTransition={state,date:state.calendar.date,phase:'ready',rows,shell:document.querySelector('.game-shell'),inert:false};dayTransitionRender()");
assert.ok(app.get('#day-transition-root').innerHTML.includes('&lt;img'));
assert.ok(!app.get('#day-transition-root').innerHTML.includes('<img'));
r("dayTransitionOpen(state.training.messages.find(m=>m.key==='day-new').id)");
assert.equal(r('dayTransition'),null);
assert.equal(r('state.training.selectedMessage'),r("state.training.messages.find(m=>m.key==='day-new').id"));

// A stale queued callback must not operate on a changed career date.
r('dayTransitionStart();globalThis.tx=dayTransition;state.calendar.date=calAdd(state.calendar.date,1);globalThis.changed=state.calendar.date;dayTransitionRun(tx)');
assert.equal(r('state.calendar.date'),r('changed'));
assert.equal(r('dayTransition'),null);

// A queued step that becomes blocked records an aborted attempt, not a day.
r('globalThis.blockedContinue=calendarContinue;calendarContinue=()=>{};dayTransitionStart();dayTransitionRun(dayTransition);calendarContinue=blockedContinue;dayTransitionRun(null)');
assert.equal(r("performanceSummary('nextDay').count"),1);
assert.equal(r("performanceSummary('nextDayAborted').count"),1);
assert.equal(r('dayTransition'),null);

// Failure is visible and never automatically replayed, including partial work.
r("globalThis.originalContinue=calendarContinue;calendarContinue=()=>{state.calendar.date=calAdd(state.calendar.date,1);throw Error('controlled failure')};dayTransitionStart();globalThis.tx=dayTransition;dayTransitionRun(tx)");
assert.equal(r('dayTransition.phase'),'error');
assert.equal(r("performanceSummary('nextDay').count"),1,'failure cannot count as a successful day');
assert.equal(r("performanceSummary('nextDayAborted').count"),2);
r('dayTransitionRun(tx)');
assert.equal(r("performanceSummary('nextDayAborted').count"),2,'failed callback is never replayed');
const failedDate=r('state.calendar.date');
r('continueGame();dayTransitionClose();calendarContinue=originalContinue');
assert.equal(r('state.calendar.date'),failedDate);
assert.equal(app.get('.game-shell').inert,false);

const match=boot(),m=match.run;
m("startCareerWithClub('HV71');state.calendar.date=calendarTarget();startMatch();pauseMatch();globalThis.time=studioEngine().time;continueGame()");
assert.equal(m('dayTransition'),null);
assert.equal(m('studioEngine().time'),m('time'));
assert.equal(m('state.page'),'match');
// Decisions raised by the day itself remain visible and block the following day.
const decision=boot(),d=decision.run;
d("startCareerWithClub('HV71');globalThis.calendarCore=calendarContinue;calendarContinue=()=>{calendarCore();managerMessage('during-day','Beslut efter dagen','Svara först','Spelare',{decisionType:'role'});save()};dayTransitionStart();dayTransitionRun(dayTransition)");
assert.equal(d('dayTransition.phase'),'ready');
assert.equal(d("performanceSummary('nextDay').count"),1);
d('dayTransitionRun(dayTransition)');
assert.equal(d("performanceSummary('nextDay').count"),1,'completed callback is never replayed');
assert.ok(d("dayTransition.rows.some(row=>row.required&&row.title==='Beslut efter dagen')"));
const stopped=d('state.calendar.date');
d('dayTransitionClose();continueGame()');
assert.equal(d('state.calendar.date'),stopped);
assert.equal(d('dayTransition'),null);
assert.equal(d('state.training.selectedMessage'),d('pendingManagerDecision().id'));

// The completed-match route advances once, without an additional training day.
m("state.live.finished=true;state.calendar.completedMatchDate=state.calendar.date;globalThis.matchDate=state.calendar.date;globalThis.trainingCount=state.training.history.length;continueGame();dayTransitionRun(dayTransition)");
assert.equal(m('state.calendar.date'),m('calAdd(matchDate,1)'));
assert.equal(m('state.training.history.length'),m('trainingCount'));
assert.equal(m('dayTransition'),null);
m('dayTransitionClose()');
console.log('PASS: one scheduled day, authoritative parity, real summary, saved progress, decisions, escaping, stale callback, failure cleanup and paused match navigation.');
