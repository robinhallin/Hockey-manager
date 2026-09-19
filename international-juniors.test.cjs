const test=require('node:test'),assert=require('node:assert/strict');const {boot}=require('./scripts/career-test-fixture.cjs');
function setup(){const a=boot();a.run("startCareerWithClub('HV71')");return a;}
function select(a){a.run("state.calendar.date='2026-12-15';internationalPrepare();state.calendar.date='2026-12-20';internationalPrepare()");}
test('age identity, role-balanced selection and read-only rendering',()=>{
 const a=setup(),r=a.run;
 assert.equal(r("internationalEligible({age:19,nationality:'SWE',research:{birth:'2006-12-31'}},2027)"),false);
 assert.equal(r("internationalEligible({age:20,nationality:'SWE',research:{birth:'2007-01-01'}},2027)"),true);
 const before=r('JSON.stringify(state)');r('internationalView();internationalCalendar()');assert.equal(r('JSON.stringify(state)'),before);
 select(a);assert.equal(r('Object.values(state.international.tournament.rosters).every(rs=>rs.length===25&&rs.filter(p=>p.pos==="MV").length===3&&rs.filter(p=>p.pos==="B").length===8)'),true);
 assert.equal(r('new Set(Object.values(state.international.tournament.rosters).flat().map(p=>String(p.id))).size'),250);
 r('globalThis.p=managerRoster()[0];globalThis.score=internationalScore(p);p.potential=999;p.attributeGrowth=100');assert.equal(r('internationalScore(p)'),r('score'));
});
test('entire tournament conserves events, points, shots and time and returns once',()=>{
 const a=setup(),r=a.run;select(a);r("for(let d='2026-12-20';d<='2027-01-06';d=calAdd(d,1)){state.calendar.date=d;internationalPrepare();internationalProcess(d)}");
 assert.equal(r('state.international.tournament.games.filter(g=>g.played).length'),29);assert.equal(r('new Set(state.international.tournament.medals).size'),3);
 const games=JSON.parse(r('JSON.stringify(state.international.tournament.games)'));
 for(const g of games){assert.notEqual(g.hg,g.ag);if(g.administrative)continue;
  assert.equal(g.events.length,g.hg+g.ag-(g.shootout?1:0));
  for(let side=0;side<2;side++){const ps=g.players[side],keeper=ps.find(p=>p.pos==='MV');assert.equal(ps.reduce((n,p)=>n+p.shots,0),g.shots[side]);assert.equal(keeper.saves+keeper.against,g.shots[1-side]);assert.equal(ps.reduce((n,p)=>n+p.goals,0),g.events.filter(e=>e.side===side).length);assert.equal(ps.reduce((n,p)=>n+p.assists,0),g.events.filter(e=>e.side===side).reduce((n,e)=>n+e.assists.length,0));assert.equal(ps.filter(p=>p.pos!=='MV').reduce((n,p)=>n+p.seconds,0),18000+(keeper.seconds-3600)*3);}
 }
 assert.equal(r('internationalPlayers().some(r=>internationalAway(r.p))'),false);
 const before=r('JSON.stringify(state)');r('internationalProcess();internationalReturn();internationalPrepare();save()');assert.equal(r('JSON.stringify(state)'),before);
 const b=boot(a.storage.value);assert.equal(b.run('JSON.stringify(state.international.tournament)'),r('JSON.stringify(state.international.tournament)'));
});
test('club and junior availability, valid absence and training have no double workload',()=>{
 const a=setup(),r=a.run;r("globalThis.p=state.juniors.roster.find(p=>p.pos==='B');p.internationalDuty={year:2027,nation:'SWE',from:'2026-12-20',until:'2027-01-06',returned:false};state.calendar.date='2026-12-21';p.fatigue=43;p.academy.path='guest'");
 assert.equal(r('medicalReady(p)'),false);assert.equal(r('medicalCanTrain(p)'),false);assert.equal(r('medicalExcused(p)'),true);assert.equal(r('medicalStatus(p)'),'På landslagsuppdrag');assert.equal(r('juniorMatchPlan().seconds.get(String(p.id))'),0);
 r("juniorTraining({type:'skills',intensity:'normal'},'intl-absence');medicalDay({type:'skills',intensity:'normal'})");assert.equal(r('p.fatigue'),43);
 assert.equal(r('state.juniors.aTraining?.[String(p.id)]'),undefined);
 const missed=r('p.academy.missed');r("juniorAppearance(p,1200,10,'test')");assert.equal(r('p.academy.missed'),missed);assert.equal(r('p.fatigue'),43);
 r("state.calendar.date='2027-01-06'");assert.equal(r('medicalReady(p)'),true);
});
test('medical withdrawal replaces a player; late saves do not invent a tournament',()=>{
 const a=setup(),r=a.run;r("state.calendar.date='2026-12-15';internationalPrepare();globalThis.old=state.international.tournament.rosters.SWE[0].id;globalThis.p=internationalPlayers().find(r=>samePlayerId(r.p.id,old)).p;p.health.injury={remaining:10};state.calendar.date='2026-12-20';internationalPrepare()");
 assert.notEqual(r('state.international.tournament.rosters.SWE[0].id'),r('old'));assert.equal(r('internationalAway(p)'),false);
 r("delete state.international;state.calendar.date='2027-01-03';ensureInternational();internationalPrepare();internationalProcess()");assert.equal(r('state.international.tournament.skipped'),true);assert.equal(r('state.international.tournament.games.length'),0);
});
test('daily integration, immutable birth year and bounded next-season player pool',()=>{
 const a=setup(),r=a.run;r("state.calendar.date='2026-12-14';calendarStep(true)");assert.equal(r('state.international.tournament.announced'),true);
 r("globalThis.p=state.international.pool.find(p=>p.age===19);for(const k of Object.keys(p.attributes))p.attributes[k]=20;globalThis.id=p.id;globalThis.birth=p.internationalIdentity.birthYear;state.season.year=2028;state.calendar.date='2028-08-01';ensureInternational()");
 assert.equal(r('state.international.pool.length'),320);assert.ok(r('state.playerWorld.freeAgents.filter(p=>p.internationalOrigin).length')<=20);assert.equal(r('state.playerWorld.freeAgents.some(p=>p.id===id)'),true);assert.equal(r('p.internationalIdentity.birthYear'),r('birth'));assert.equal(r('state.international.archive.length'),1);
});
