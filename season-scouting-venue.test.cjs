'use strict';
const assert=require('node:assert/strict');
const {boot}=require('./scripts/career-test-fixture.cjs');
const app=boot(null,{production:true}),r=app.run;
r(`startCareerWithClub('HV71');preseasonConfigure('balanced','manager','strongest','manager','manager')`);
// A specific scouting brief is a conjunction of public facts and observed ability.
r(`globalThis.criteria={profile:'Målskytt',placement:'Andra kedjan',maxSalary:5000000,maxAge:45,horizon:'now',league:'SHL',targetRole:'key',confidence:'supported'};
 globalThis.candidate=getTransferMarketPlayers().find(p=>scoutingLeague(p)==='SHL'&&p.pos==='C');
 state.scoutReports[candidate.id]={visits:3,origin:'scout',snapshot:Object.fromEntries(Object.keys(candidate.attributes).map(k=>[k,19])),lastObserved:state.calendar.date,snapshotDate:state.calendar.date};
 globalThis.choices=scoutingBriefCandidates(criteria);`);
assert.ok(r('choices.some(p=>p.id===candidate.id)'));
assert.ok(r('choices.every(p=>scoutingLeague(p)==="SHL"&&RECRUIT_PROFILES.Målskytt.positions.includes(p.pos))'));
r('globalThis.before=JSON.stringify(choices.map(p=>p.id));for(const k of Object.keys(candidate.attributes))candidate.attributes[k]=1;globalThis.after=JSON.stringify(scoutingBriefCandidates(criteria).map(p=>p.id))');
assert.equal(r('after'),r('before'),'hidden actual attributes never choose candidates');
r(`scoutingBrief('Målskytt','Andra kedjan',5000000,45,'now',scoutingPerson(scoutingStaff()[0]),'SHL','key','supported')`);
assert.equal(r('scoutDesk.draft.criteria.league'),'SHL');assert.equal(r('scoutDesk.draft.criteria.targetRole'),'key');
r('scoutingStart()');assert.equal(r('scoutingOffice().jobs[0].criteria.placement'),'Andra kedjan');
assert.match(r('scoutingBriefResult(candidate)'),/Observerad nivå/);
assert.equal(r('scoutingPlacementAssessment(candidate,"Målskytt","Förstemålvakt","all")'),null);
r(`scoutingBrief('Målskytt','Andra kedjan',1,18,'now',scoutingPerson(scoutingStaff()[0]),'SHL','key','supported')`);
assert.equal(r('scoutDesk.draft'),null,'empty search never leaves an old payable draft');
assert.match(r('scoutingBriefView()'),/Fjärde kedjan/);assert.match(r('scoutingBriefView()'),/Andra backparet/);assert.match(r('scoutingBriefView()'),/Tredjemålvakt/);
// Both real venues, same manager-based engine accounting; no swapping player sides.
for(const home of [true,false]){
 r(`state.live=null;state.calendar.active=null;globalThis.f=state.calendar.friendlies[${home?0:1}];state.calendar.date=f.date;calendarPlayFriendly(f.id);state.live.hv=4;state.live.opp=1;state.live.shotsHV=23;state.live.shotsOpp=11`);
 assert.equal(r('matchVenue().ownHome'),home);assert.equal(r('studioEngine().teams[0].name'),'HV71');
 assert.equal(r('matchVenueScore().join(":")'),home?'4:1':'1:4');
 const html=r('matchCentreView()');assert.match(html,/HEMMA/);assert.match(html,/BORTA/);
 const names=r('JSON.stringify([matchVenue().home,matchVenue().away])');const [first,second]=JSON.parse(names);
 assert.ok(html.indexOf('<strong>'+first+'</strong>')<html.indexOf('<strong>'+second+'</strong>'));
 assert.equal(r('analysisSnapshot().home'),home);
 r('save()');const loaded=boot(app.storage.value,{production:true});assert.equal(loaded.run('matchVenue().home'),first);
}
// Existing saves keep their date/schedule and only replace fictional arena maxima.
const old=JSON.parse(app.storage.value);delete old.preseasonCoach;delete old.seasonCalendar;old.live=null;old.calendar.date='2027-01-10';old.clubOffice.capacity=12345;delete old.clubOffice.arenaVersion;
const legacy=boot(JSON.stringify(old),{production:true});assert.equal(legacy.run('state.calendar.date'),'2027-01-10');assert.equal(legacy.run('state.clubOffice.capacity'),7000);assert.equal(legacy.run('Boolean(preseasonPlan())'),false);
// Taking a new job during the league season opens the plan without changing time.
const move=boot(null,{production:true}),m=move.run;
m(`startCareerWithClub('HV71');preseasonConfigure('balanced','manager','rotation','assistant','assistant');
 state.season.phase='regular';state.round=9;state.calendar.date='2026-11-12';state.teams[0].gp=8;
 state.calendar.friendlies=[];state.managerCareer.moveYear=null;managerDismiss();state.managerCareer.reputation=100;
 globalThis.job=state.managerCareer.jobs.find(j=>j.status==='open');managerInterview(job.id);managerInterviewAnswer('balanced');
 globalThis.scheduleBefore=JSON.stringify(state.schedule);managerAcceptJob()`);
assert.equal(m('managerClub()'),m('job.club'));assert.equal(m('state.page'),'season');
assert.equal(m('state.calendar.date'),'2026-11-12');assert.equal(m('state.round'),9);assert.equal(m('state.season.phase'),'regular');
assert.equal(m('JSON.stringify(state.schedule)'),m('scheduleBefore'));assert.equal(m('state.calendar.friendlies.length'),0);
assert.equal(m('preseasonPlan().hasPreseason'),false);assert.match(m('seasonView()'),/pågående säsong/);
m(`preseasonConfigure('balanced','manager','rotation','assistant','assistant');
 globalThis.p=managerRoster().find(p=>medicalCanTrain(p));p.fatigue=45;p.trainingLoad='normal';delete p.trainingReturn;delete p.trainingManualDate;
 globalThis.projectedLoad=trainingEffectiveLoad(p);assistantPrepareTraining()`);
assert.equal(m('projectedLoad'),'light');assert.equal(m('p.trainingLoad'),'light');
// The previous season's table still has games until launch; it must not block August fixtures.
const next=boot(null,{production:true}),n=next.run;
n(`startCareerWithClub('HV71');preseasonConfigure('balanced','manager','rotation','assistant','assistant');
 state.season.phase='review';state.season.boardResult=[{met:true}];state.teams.forEach(t=>t.gp=52);beginPreseason()`);
assert.equal(n('state.season.year'),2027);assert.equal(n('state.calendar.date'),'2027-08-01');
assert.equal(n('state.calendar.friendlies.filter(f=>f.club===managerClub()).length'),5);
assert.equal(n('preseasonPlan().pending'),true);assert.equal(n('preseasonPlan().hasPreseason'),true);
assert.equal(n('state.calendar.friendlies.every(f=>f.date.startsWith("2027-"))'),true);
n(`state.managerCareer.status='unemployed';preseasonStart()`);
assert.equal(n('state.page'),'manager');assert.equal(n('preseasonPlan()'),null);
n(`state.managerCareer.status='awaiting';state.managerCareer.decision=null;state.managerCareer.renewal={expires:2029,salary:700000};managerAcceptRenewal()`);
assert.equal(n('managerEmployed()'),true);assert.equal(n('preseasonPlan().pending'),true);assert.equal(n('state.page'),'season');
console.log('PASS: specific scouting criteria, observed-only ranking, expanded places, home/away score and keeper accounting, venue save and arena migration.');
