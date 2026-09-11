const assert=require('node:assert/strict');
const {boot}=require('./scripts/career-test-fixture.cjs');
const app=boot(),r=app.run;
r("startCareerWithClub('HV71')");

assert.deepEqual(r("Array.from(DESK_AREAS.find(a=>a.id==='overview').pages,p=>p[0])"),['home']);
assert.deepEqual(r("Array.from(DESK_AREAS.find(a=>a.id==='matches').pages,p=>p[0])"),['calendar','statistics']);
assert.deepEqual(r("Array.from(DESK_AREAS.find(a=>a.id==='leagues').pages,p=>p[0])"),['leagues','table','leagueStats']);
assert.deepEqual(r("Array.from(DESK_RECRUIT_TABS,p=>p[0])"),['needs','search','deals']);
assert.equal(r("deskSubnav()"),'','overview must not add another row of tabs');

r("deskNavigate('lines')");
assert.ok(r("deskPrimaryNav().includes(\"deskNavigate('lines')\")"),'Laget must remember tactics as the last working surface');
r("deskNavigate('home')");
assert.ok(r("deskPrimaryNav().includes(\"deskNavigate('lines')\")"),'remembered team workspace must survive leaving the area');

r("deskNavigate('transfers','missions')");
assert.ok(r("deskSubnav().includes('Spelare & scouting')"));
assert.equal(r("(deskSubnav().match(/<button/g)||[]).length"),3,'recruitment must expose only three primary tabs');
r("deskNavigate('home')");
assert.ok(r("deskPrimaryNav().includes('missions')"),'recruitment entry must return to the last recruitment workspace');

r("deskNavigate('match')");
assert.equal(r("(deskSubnav().match(/<button/g)||[]).length"),2,'match area must expose only calendar and analysis as primary tabs');
assert.ok(r("deskSubnav().includes('Kalender')&&deskSubnav().includes('Matchanalys')"));

r("deskNavigate('stories')");
assert.equal(r("deskArea().id"),'overview','legacy story route may remain reachable without becoming navigation');
assert.equal(r("deskSubnav()"),'','hidden legacy routes must not recreate extra overview tabs');

console.log('PASS: navigation is flatter, grouped and returns to the manager’s latest working surface.');
