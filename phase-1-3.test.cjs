const assert=require('node:assert/strict');
const {boot}=require('./scripts/career-test-fixture.cjs');

// 1. The office briefing is read-only and explains the manager's immediate day.
const office=boot(),r=office.run;
r("startCareerWithClub('HV71')");
const before=r('JSON.stringify(state)');
assert.match(r('managerOfficeView()'),/Morgonmöte/);
assert.match(r('managerOfficeView()'),/Dagens huvuduppgift/);
assert.match(r('managerOfficeView()'),/Största risk|Nästa kontrollpunkt/);
assert.equal(r('JSON.stringify(state)'),before,'manager briefing must not advance or mutate the career');
r('runTrainingSession()');
assert.match(r('managerOfficeView()'),/Gårdagen/);

// 2. A real skater in the shooting lane can become the scorer on a deflection.
r("state.calendar.date=calendarTarget();startMatch();pauseMatch();globalThis.e=studioEngine();globalThis.s=e.skaters(0).find(a=>a.role==='LD')||e.skaters(0)[0];globalThis.tip=e.skaters(0).find(a=>a!==s&&!a.role.endsWith('D'))||e.skaters(0).find(a=>a!==s);Object.assign(s,{x:44,y:15});Object.assign(tip,{x:53,y:15});for(const d of e.skaters(1))Object.assign(d,{x:35,y:d.y});e.puck={x:s.x,y:s.y};e.owner=0;e.carrier=s.id;e.stoppage=0;e.random=(()=>{const q=[.99,.01,.5,0];return()=>q.length?q.shift():0;})();e.shoot(s)");
assert.equal(r('e.flight.shot.context.deflection'),true);
assert.equal(r('e.flight.shot.player'),r('tip.player.name'));
assert.equal(r('e.flight.shot.originalShooter.name'),r('s.player.name'));
assert.equal(r('e.flight.shot.assists.some(a=>a.id===s.id)'),true);

// 3. Junior fixtures now populate a real-club J20 world and survive reload.
const juniors=boot(),q=juniors.run;
q("startCareerWithClub('HV71');ensureJuniors();ensureClubAI();juniorFixture('j20:round:1')");
assert.equal(q('juniorWorldTable(leagueOf()).length'),14);
assert.equal(q("juniorWorldTable(leagueOf()).find(r=>r.name===managerClub()).gp"),1);
assert.equal(q('juniorWorldClubs(leagueOf()).includes(state.juniors.matches[0].opponent)'),true);
assert.match(q('developmentJuniorsView()'),/J20 · utvecklingsserie/);
assert.doesNotMatch(q('developmentJuniorsView()'),/Motståndarna är fiktiva/);
const resultCount=q('state.juniorWorld.results.length');q("juniorFixture('j20:round:1')");assert.equal(q('state.juniorWorld.results.length'),resultCount,'same junior fixture must be idempotent');
q('save()');const restored=boot(juniors.storage.value);assert.equal(restored.run('state.juniorWorld.results.length'),resultCount);

console.log('PASS: manager morning brief, spatial deflection scorer/assist and persistent real-club J20 table.');
