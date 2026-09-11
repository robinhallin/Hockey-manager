const assert=require('node:assert/strict');
const {boot}=require('./scripts/career-test-fixture.cjs');
const app=boot(),r=app.run;
r("startCareerWithClub('HV71');ensureJuniors();ensureJuniorCalendar()");
while(r("state.calendar.date<'2026-09-09'"))r('calendarStep(true)');
const review=r('managerJ20Review()');
assert.ok(review?.best&&review?.match?.j20,'need a real J20 recommendation before promotion');
const id=String(review.best.id),date=review.match.date;
assert.equal(r(`managerJ20Act(${JSON.stringify(id)},'promote',${JSON.stringify(date)})`),true);
let follow=r('managerSeniorProspectFollowup()');
assert.equal(String(follow.player.id),id);
assert.equal(follow.level,'Väntar på A-lagschans');
assert.equal(follow.totals.games,0);
const before=r('JSON.stringify(state)');
assert.match(r('managerSeniorProspectFollowupView()'),/A-LAGSUPPFÖLJNING/);
assert.equal(r('JSON.stringify(state)'),before,'rendering senior follow-up must be read-only');
// Senior reports are the source of truth for the promoted player's actual usage.
r(`state.analysis??={matches:[]};state.analysis.matches=[
 {finished:true,abandoned:false,club:managerClub(),date:'2026-09-12',players:[{id:${JSON.stringify(id)},seconds:720,goals:0,assists:1}]},
 {finished:true,abandoned:false,club:managerClub(),date:'2026-09-11',players:[{id:${JSON.stringify(id)},seconds:660,goals:0,assists:0}]},
 {finished:true,abandoned:false,club:managerClub(),date:'2026-09-10',players:[{id:${JSON.stringify(id)},seconds:600,goals:1,assists:0}]}
]`);
follow=r('managerSeniorProspectFollowup()');
assert.equal(follow.totals.games,3);
assert.equal(follow.totals.goals,1);
assert.equal(follow.totals.assists,1);
assert.equal(follow.level,'Etableras i A-laget');
assert.equal(follow.debut.match.date,'2026-09-10');
assert.match(r('managerSeniorProspectFollowupView()'),/3 A-lagsmatcher/);
assert.match(r('managerSeniorProspectFollowupView()'),/Debut/);
// Three straight senior games without usage must surface a genuine manager warning and return option.
r(`state.analysis.matches=[
 {finished:true,abandoned:false,club:managerClub(),date:'2026-09-15',players:[]},
 {finished:true,abandoned:false,club:managerClub(),date:'2026-09-14',players:[]},
 {finished:true,abandoned:false,club:managerClub(),date:'2026-09-13',players:[]}
]`);
follow=r('managerSeniorProspectFollowup()');
assert.equal(follow.level,'Behöver matchtid');
const warning=r('managerSeniorProspectFollowupView()');
assert.match(warning,/Behöver matchtid/);
assert.match(warning,/Tillbaka till J20/);
assert.equal(r(`managerSeniorProspectAct(${JSON.stringify(id)},'return')`),true);
assert.equal(r(`state.juniors.roster.some(p=>samePlayerId(p.id,${JSON.stringify(id)}))`),true);
assert.equal(r(`managerRoster().some(p=>samePlayerId(p.id,${JSON.stringify(id)}))`),false);
console.log('PASS: promoted juniors are followed through real senior minutes, debut, establishment, bench warnings and a real return-to-J20 decision.');
