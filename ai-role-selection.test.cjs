const assert=require('node:assert/strict');const {boot}=require('./scripts/career-test-fixture.cjs');
function setup(club="Färjestad BK"){const a=boot();a.run(`startCareerWithClub('HV71');globalThis.club=${JSON.stringify(club)};
 for(const p of state.clubRosters[club]){for(const k of Object.keys(p.attributes))p.attributes[k]=12;p.aiForm=0;p.fatigue=0;p.age=27;p.promisedRole='Rotation';delete p.aiRoleReview;}
 globalThis.backs=state.clubRosters[club].filter(p=>p.pos==='B');globalThis.p=backs.at(-1);p.promisedRole='Ordinarie';`);return a;}
{
 const a=setup(),r=a.run;
 assert.equal(r('rivalLineup(club).defense.includes(p)'),false);
 r('for(let i=0;i<3;i++)aiAfterPlayerFixture(club,backs.filter(q=>q!==p).map(q=>({id:q.id,seconds:1000})),2,1)');
 assert.equal(r('rivalRoleSelection(p)'),.6);
 assert.equal(r('rivalLineup(club).defense.includes(p)'),true,'comparable underused regular earns a real roster place');
 r('globalThis.snapshot=JSON.stringify(state);rivalLineup(club);rivalLineup(club)');assert.equal(r('JSON.stringify(state)'),r('snapshot'),'reading lineup does not advance promises');
 r('save()');const loaded=boot(a.storage.value);
 assert.equal(loaded.run(`rivalLineup(${JSON.stringify(r('club'))}).defense.some(q=>q.id===${JSON.stringify(r('p.id'))})`),true);
 r('globalThis.g=state.schedule.find(g=>(g.home===club||g.away===club)&&g.home!==managerClub()&&g.away!==managerClub());state.calendar.date=g.date;leagueBackground(g)');
 assert.ok(r('p.aiRoleReview.seconds')>0,'the background match records actual ice time for the selected player');
}
{
 const {run:r}=setup();r('p.aiRoleReview={games:3,seconds:0};p.fatigue=35');assert.equal(r('rivalRoleSelection(p)'),0);
 r("p.fatigue=0;p.health.injury={remaining:5,readiness:50};p.health.clearance='rest'");assert.equal(r('rivalLineup(club).defense.includes(p)'),false);
 r("p.health.injury=null;p.health.clearance='full';for(const k of Object.keys(p.attributes))p.attributes[k]=9");
 assert.equal(r('rivalLineup(club).defense.includes(p)'),false,'promise does not override a clear ability gap');
 r('p.aiRoleReview={games:3,seconds:3000}');assert.equal(r('rivalRoleSelection(p)'),0,'fulfilled role creates no extra selection pressure');
 r('p.aiRoleReview={games:6,seconds:0,lastAverage:0}');assert.equal(r('rivalRoleSelection(p)'),.6,'completed review carries unmet evidence into next cycle');
}
{
 const {run:r}=setup();r(`globalThis.gs=state.clubRosters[club].filter(p=>p.pos==='MV');globalThis.g=gs[1];g.promisedRole='Nyckelspelare';
 for(let i=0;i<3;i++)aiAfterPlayerFixture(club,[{id:gs[0].id,seconds:3600}],1,2);`);
 assert.equal(r('rivalRoleSelection(g)'),.8);assert.equal(r('rivalLineup(club).keeper.id'),r('g.id'));
 r('g.fatigue=40');assert.equal(r('rivalRoleSelection(g)'),0);assert.notEqual(r('rivalLineup(club).keeper.id'),r('g.id'));
}
// The user's live match uses the same selection, and keeps it when resumed.
{
 const a=setup('Björklöven'),r=a.run;r(`p.aiRoleReview={games:3,seconds:0};
 globalThis.fixture=state.schedule.find(g=>(g.home===club&&g.away===managerClub())||(g.away===club&&g.home===managerClub()));
 state.round=fixture.round;state.calendar.date=calendarTarget();startMatch();`);
 assert.equal(r('state.live.opponent'),r('club'));assert.equal(r('state.live.aiTeam.defense.includes(p.id)'),true);
 r('save()');const loaded=boot(a.storage.value);
 assert.equal(loaded.run(`state.live.aiTeam.defense.includes(${JSON.stringify(r('p.id'))})`),true);
}
console.log('PASS: real lineup and match participation, fulfilled/unfulfilled reviews, keeper rotation, health/fatigue/quality safeguards, read-only planning and save reload.');
