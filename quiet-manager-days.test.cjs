'use strict';
const assert=require('node:assert/strict');
const {boot}=require('./scripts/career-test-fixture.cjs');
const app=boot(),r=app.run;
r("startCareerWithClub('HV71');globalThis.before=state.calendar.date;dayTransitionStart();dayTransitionRun(dayTransition)");
assert.equal(r('dayTransition'),null,'ordinary day requires no dismiss click');
assert.equal(r('state.calendar.date'),r('calAdd(before,1)'));
assert.equal(app.get('.game-shell').inert,false);
assert.match(r('matchesCalendarView()'),/nya rapporter och resultat/);
assert.equal(r('state.calendar.lastDaySummary.currentDate'),r('state.calendar.date'));
const saved=boot(app.storage.value);
assert.equal(saved.run('daySummaryView()'),r('daySummaryView()'),'optional summary survives reload');
const snapshot=r('JSON.stringify(state)');r('daySummaryView();managerOfficeView()');
assert.equal(r('JSON.stringify(state)'),snapshot);
// The next click performs precisely one more day, without an intermediate close action.
r('globalThis.next=state.calendar.date;dayTransitionStart();dayTransitionRun(dayTransition)');
assert.equal(r('state.calendar.date'),r('calAdd(next,1)'));
assert.equal(r('dayTransition'),null);
// Modern jobs participate in the same agenda and next dated event as legacy missions.
r(`globalThis.target=getTransferMarketPlayers()[0];state.money=100000000;
scoutingStart({players:[target.id],person:scoutingPerson(scoutingStaff()[0]),method:'screen',profile:'ALL',horizon:'now'});
scoutingContact(target.id);`);
assert.equal(r('officeScoutMissions().length'),1);
assert.equal(r("managerOffice2Items().find(i=>i.id==='scouting:missions').title"),'1 aktiva scoutuppdrag');
assert.equal(r('officeWaiting().value'),'Kontaktbesked','earlier contact outranks a later scout visit');
r('globalThis.waiting=officeWaiting();eval(deskAction(waiting.action))');
assert.equal(r('state.selectedMarketPlayer'),r('target.id'));
assert.equal(r('profileWorkspace.tab'),'contract');
assert.equal(r('recruitHub.panel'),'transfer');
r("state.recruitment.scouting.contacts[String(target.id)].status='unavailable'");
assert.match(r('officeWaiting().value'),/1 scoutuppdrag/);
// Delegation hides routine rows, but not substantial risks still needing the manager.
r("managerOffice2ToggleDelegation('training');managerRoster().forEach(p=>p.fatigue=60)");
assert.equal(r("managerOffice2VisibleItems().some(i=>i.id==='training:fatigue'&&i.level==='high')"),true);
r("managerOffice2ToggleDelegation('contracts');managerRoster().forEach(p=>{p.contractYears=1;delete p.futureContract;})");
assert.equal(r("managerOffice2VisibleItems().some(i=>i.id==='contracts:expiring')"),true);
// Views never execute delegated decisions. The actual day uses existing recovery policy.
const delegated=boot(),d=delegated.run;
d("startCareerWithClub('HV71');globalThis.p=managerRoster()[0];p.fatigue=70;managerOffice2ToggleDelegation('training');dayTransitionStart();dayTransitionRun(dayTransition)");
assert.equal(d('p.trainingSessions[0].rest'),true);
assert.ok(d('p.fatigue')<70);
// Previous-club and previous-day summaries must not present stale events as current.
r("state.calendar.lastDaySummary.club='Other'");assert.equal(r('daySummaryView()'),'');
r("delete state.calendar.lastDaySummary;save()");assert.equal(boot(app.storage.value).run('daySummaryView()'),'');
console.log('PASS: consecutive one-click days, optional persisted summary, exact next contact, modern scout agenda, visible delegated risks, real staff recovery and old-save compatibility.');
