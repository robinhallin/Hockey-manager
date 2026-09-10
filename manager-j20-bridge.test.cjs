const assert=require('node:assert/strict');
const {boot}=require('./scripts/career-test-fixture.cjs');
const app=boot(),r=app.run;
r("startCareerWithClub('HV71');ensureJuniors();ensureJuniorCalendar()");
// Complete the first dedicated J20 matchday.
while(r("state.calendar.date<'2026-09-09'"))r('calendarStep(true)');
assert.equal(r("juniorWorldTable(leagueOf()).find(x=>x.name===managerClub()).gp"),1);
let review=r('managerJ20Review()');
assert.ok(review&&review.match&&review.match.j20);
assert.ok(['Seger','Förlust','Oavgjort'].includes(review.resultLabel));
assert.ok(review.best,'played J20 match should identify a development signal');
assert.ok(review.bestRow.seconds>0);
assert.ok(['A-lagsnära','Knackar på dörren','Fortsatt J20-utveckling'].includes(review.readiness.level));
const firstId=String(review.best.id),firstForm=r(`managerJ20RecentForm(juniorById(${JSON.stringify(firstId)}))`);
assert.equal(firstForm.games,1);
// Add two more actual scheduled J20 rounds and verify that form is a rolling match sample, not a one-game label.
for(const date of ['2026-09-11','2026-09-15'])r(`state.calendar.date=${JSON.stringify(date)};juniorCalendarProcess(state.calendar.date)`);
assert.equal(r("juniorWorldTable(leagueOf()).find(x=>x.name===managerClub()).gp"),3);
review=r('managerJ20Review()');
assert.ok(review.form.games>=1&&review.form.games<=3);
assert.equal(review.form.points,review.form.goals+review.form.assists);
const before=r('JSON.stringify(state)');
const html=r('managerOfficeView()');
assert.match(html,/J20 SENAST/);
assert.match(html,/Matchens utvecklingssignal/);
assert.equal(r('JSON.stringify(state)'),before,'manager J20 review must be read-only');
// Senior totals are untouched by the manager summary.
assert.equal(r('state.juniors.roster.reduce((n,p)=>n+(p.goals||0)+(p.assists||0),0)'),0);
console.log('PASS: manager office turns actual J20 results, rolling form, minutes and production into a read-only development signal.');
