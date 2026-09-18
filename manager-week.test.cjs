'use strict';
const assert=require('node:assert/strict');
const {boot}=require('./scripts/career-test-fixture.cjs');
const app=boot(),r=app.run;
r("startCareerWithClub('HV71')");
const initial=r('JSON.stringify(state)');
assert.equal(r('managerWeekRecommendation()'),null);
assert.match(r('managerWeekView()'),/första fullständigt registrerade/);
assert.equal(r('managerWeekDays().length'),7);
assert.equal(r('JSON.stringify(state)'),initial,'opening the week does not mutate a fresh career');
r(`globalThis.report=(id,against=8,own=2)=>({id,year:state.season.year,date:calAdd(state.calendar.date,-1),club:managerClub(),opponent:'Testlag',finished:true,units:[],players:[],events:[],shots:[...Array.from({length:against},()=>({dangerous:true,side:'opponent',x:80,y:50,time:60,name:'Test',outcome:'save'})),...Array.from({length:own},()=>({dangerous:true,side:'own',x:80,y:50,time:60,name:'Test',outcome:'save'}))]});
state.analysis.matches=[{...report('incomplete',99),partial:true},{...report('friendly',99),friendly:true},{...report('old-year',99),year:state.season.year-1},report('baseline')];`);
assert.equal(r('managerWeekRecommendation().key'),'defense');
assert.equal(r('managerWeekRecommendation().count'),1);
assert.equal(r("managerWeekAdopt('defense','stale')"),false);
assert.equal(r("managerWeekAdopt('defense','baseline')"),true);
const focus=r('JSON.stringify(coachFocus())');
assert.equal(r("managerWeekAdopt('defense','baseline')"),false,'repeat click cannot reset an active follow-up');
assert.equal(r('JSON.stringify(coachFocus())'),focus);
assert.equal(r('coachFocus().sessions.length'),0,'adopting a focus does not invent completed training');

// The action uses the dated calendar, preserves rest and match preparation,
// and a repeated click keeps the same focus pass.
r('coachPlan()');
const planned=r('coachFocus().planned');
assert.ok(planned);
assert.equal(r('calendarSession(coachFocus().planned).type'),'tactics');
assert.equal(r('calendarSession(state.calendar.date).type'),'recovery');
assert.equal(r('calendarSession(calAdd(calendarTarget(),-1)).type'),'matchprep');
r('coachPlan()');
assert.equal(r('coachFocus().planned'),planned);
assert.match(r('managerWeekView()'),/Fokuspass i kalendern/);

// A user edit is authoritative even if training.plan has not been refreshed.
r("calendarSetSession(coachFocus().planned,'type','physical')");
assert.equal(r('coachPlanSlot()'),null);
assert.ok(!r('managerWeekView()').includes('Fokuspass i kalendern'));
r('coachPlan()');
assert.equal(r('calendarSession(coachFocus().planned).type'),'physical');
r("calendarSetSession(coachFocus().planned,'type','tactics')");
const readonly=r('JSON.stringify(state)');
r('managerWeekView();managerWeekFollowupView();managerOfficeView()');
assert.equal(r('JSON.stringify(state)'),readonly);

// Actual daily progression executes the planned session and records real work.
r('calendarContinue();calendarContinue()');
assert.equal(r('coachFocus().sessions.length'),1);
assert.equal(r('coachFocus().sessions[0].date'),planned);
assert.ok(r('coachFocus().sessions[0].trained')>0);
assert.match(r('managerWeekFollowupView()'),/1 relevanta pass genomförda/);
r("coachMatchDone(report('next',4));coachMatchDone(report('next',4));coachMatchDone({...report('partial-next'),partial:true});save()");
assert.equal(r('coachFocus().results.length'),1);
assert.match(r('managerWeekFollowupView()'),/4.0/);
const restored=boot(app.storage.value);
assert.equal(restored.run('JSON.stringify(coachFocus())'),r('JSON.stringify(coachFocus())'));
assert.equal(restored.run('managerWeekFollowupView()'),r('managerWeekFollowupView()'));

// The briefing targets the actual next fixture, excludes old/partial reports,
// and does not attribute the former coach's style to a replacement.
r(`globalThis.next=deskFixtures().upcoming[0];globalThis.rival=state.rivals.clubs[next.opponent];
rival.coach.style='control';rival.recent=[{year:state.season.year-1,date:state.calendar.date,gf:9,ga:0,style:'pressure',coachId:rival.coach.id},{year:state.season.year,date:state.calendar.date,gf:9,ga:0,partial:true,style:'pressure',coachId:rival.coach.id},{year:state.season.year,date:state.calendar.date,gf:3,ga:1,style:'counter',coachId:rival.coach.id}];`);
assert.equal(r('managerWeekOpponent().games.length'),1);
assert.equal(r('managerWeekOpponent().style'),'counter');
assert.match(r('managerWeekView()'),/Senast observerad spelidé/);
r("rival.coach.id='replacement'");
assert.equal(r('managerWeekOpponent().style'),'control');
assert.match(r('managerWeekView()'),/Tränarens grundprofil/);
r('state.season.year++');
assert.equal(r('coachFocus()'),null);
assert.equal(r('managerWeekRecommendation()'),null);
assert.equal(r('managerWeekOpponent().games.length'),0);

const locked=boot(),q=locked.run;
q("startCareerWithClub('HV71');state.calendar.date=calendarTarget();startMatch();pauseMatch()");
assert.equal(q("coachPlanSlot('attack')"),null);
const snapshot=q('JSON.stringify(state)');
assert.equal(q("managerWeekAdopt('attack','anything')"),false);
q('managerWeekView();managerWeekFollowupView()');
assert.equal(q('JSON.stringify(state)'),snapshot,'viewing a paused match never changes its clock or plan');
console.log('PASS: actionable evidence, protected dated planning, real daily training, exact-once follow-up, save/reload, opponent evidence, season isolation and paused-match safety.');
