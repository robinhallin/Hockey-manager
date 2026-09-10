const assert=require('node:assert/strict');
const {boot}=require('./scripts/career-test-fixture.cjs');

// 1. The office briefing is read-only and complements the existing manager pulse.
const office=boot(),r=office.run;
r("startCareerWithClub('HV71')");
const before=r('JSON.stringify(state)');
assert.match(r('managerOfficeView()'),/MORGONMÖTE/);
assert.match(r('managerOfficeView()'),/Påverka idag/);
assert.match(r('managerOfficeView()'),/Största risk|Nästa kontrollpunkt/);
assert.equal(r('JSON.stringify(state)'),before,'manager briefing must not advance or mutate the career');
r('runTrainingSession()');
assert.match(r('managerOfficeView()'),/Senast/);

// 2. The puck must reach a real teammate before a deflection can change scorer and ledger.
// Save before the puck reaches the stick: reload must preserve the same pending spatial event.
r("state.calendar.date=calendarTarget();startMatch();pauseMatch();globalThis.e=studioEngine();globalThis.s=e.skaters(0).find(a=>a.role==='LD')||e.skaters(0)[0];globalThis.tip=e.skaters(0).find(a=>a!==s&&!a.role.endsWith('D'))||e.skaters(0).find(a=>a!==s);Object.assign(s,{x:44,y:15});Object.assign(tip,{x:53,y:15});for(const d of e.skaters(1))Object.assign(d,{x:35,y:d.y});e.puck={x:s.x,y:s.y};e.owner=0;e.carrier=s.id;e.stoppage=0;e.rng=4440;e.shoot(s);globalThis.shot=e.flight.shot;shot.finishRoll=0;save()");
assert.equal(r('shot.context.deflection'),undefined,'release alone must not award the tip');
assert.ok(r('e.flight.deflectionCandidate'),'a spatial candidate must be serialized with the travelling shot');
const tipped=boot(office.storage.value),t=tipped.run;
t("globalThis.e=studioEngine();globalThis.shot=e.flight.shot;globalThis.c=e.flight.deflectionCandidate;globalThis.tip=e.actor(c.id);globalThis.s=e.actor(c.shooterId);globalThis.tipCareer=studioPlayer(0,tip.player.id);globalThis.sCareer=studioPlayer(0,s.player.id);globalThis.tipGoalsBefore=tipCareer.goals||0;globalThis.sAssistBefore=sCareer.assists||0");
assert.equal(t('shot.context.deflection'),undefined);
t('while(e.flight)e.resolveFlight(.1)');
assert.equal(t('shot.context.deflection'),true);
assert.equal(t('shot.player'),t('tip.player.name'));
assert.equal(t('shot.originalShooter.name'),t('s.player.name'));
assert.equal(t('shot.assists.some(a=>a.id===s.id)'),true);
assert.equal(t('tipCareer.goals'),t('tipGoalsBefore+1'));
assert.equal(t('sCareer.assists'),t('sAssistBefore+1'));
assert.equal(t('state.live.hv'),1);

// 3. Junior fixtures populate a real-club J20 round robin; team and player ledgers agree and survive reload.
const juniors=boot(),q=juniors.run;
q("startCareerWithClub('HV71');ensureJuniors();ensureClubAI()");
assert.equal(q("juniorWorldPairings(leagueOf(),1).length"),7);
assert.equal(q("new Set(juniorWorldPairings(leagueOf(),1).flatMap(g=>[g.home,g.away])).size"),14);
assert.equal(q("new Set(Array.from({length:13},(_,i)=>juniorWorldPairings(leagueOf(),i+1)).flat().map(g=>[g.home,g.away].sort().join('|'))).size"),91,'first 13 rounds must cover every pairing once');
q("juniorFixture('j20:round:1')");
assert.equal(q('juniorWorldTable(leagueOf()).length'),14);
assert.equal(q("juniorWorldTable(leagueOf()).find(row=>row.name===managerClub()).gp"),1);
assert.equal(q('juniorWorldClubs(leagueOf()).includes(state.juniors.matches[0].opponent)'),true);
assert.equal(q('state.juniors.matches[0].players.reduce((n,row)=>n+(row.goals||0),0)'),q('state.juniors.matches[0].own'),'player goals must equal the J20 team score');
assert.match(q('developmentJuniorsView()'),/J20 · utvecklingsserie/);
assert.doesNotMatch(q('developmentJuniorsView()'),/Motståndarna är fiktiva/);
const resultCount=q('state.juniorWorld.results.length'),table=q('JSON.stringify(juniorWorldTable(leagueOf()))');
q("juniorFixture('j20:round:1')");assert.equal(q('state.juniorWorld.results.length'),resultCount,'same junior fixture must be idempotent');
q('save()');const restored=boot(juniors.storage.value);
assert.equal(restored.run('state.juniorWorld.results.length'),resultCount);
assert.equal(restored.run('JSON.stringify(juniorWorldTable(leagueOf()))'),table,'J20 table must survive save/reload exactly');

console.log('PASS: compact manager morning brief, save-stable puck-timed deflection ledger and persistent real-club J20 round robin.');
