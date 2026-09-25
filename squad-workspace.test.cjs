const assert=require('node:assert/strict');const {boot}=require('./scripts/career-test-fixture.cjs');const {run:r}=boot();
r("startCareerWithClub('HV71');squadWorkspaceView()");const before=r('JSON.stringify(state)');r('squadWorkspaceView()');assert.equal(r('JSON.stringify(state)'),before);
r("squadSet('position','MV')");assert.equal(r("squadPlayers().every(p=>p.pos==='MV')"),true);
r("squadReset();squadSort('salary')");assert.equal(r('squadPlayers().every((p,i,a)=>!i||a[i-1].salary<=p.salary)'),true);
r("squadSort('salary')");assert.equal(r('squadPlayers().every((p,i,a)=>!i||a[i-1].salary>=p.salary)'),true);
r("deskNavigate('squad','contracts')");assert.equal(r('squadUI.tab'),'contracts');assert.equal(r('squadPlayers().every(contractNeedsDecision)'),true);
r("squadReset();squadSet('position','B');deskNavigate('squad');selectPlayer(squadPlayers()[0].id);deskBack()");assert.equal(r('state.page'),'squad');assert.equal(r('squadUI.position'),'B');assert.equal(r('squadUI.tab'),'contracts');
r("squadSet('query','zzzzzzzz')");assert.match(r('squadWorkspaceView()'),/Inga spelare matchar/);
r('squadReset()');assert.equal(r('squadPlayers().length'),r('managerRoster().length'));
console.log('PASS: read-only squad, position/search/contract filters, ascending and descending numeric sorting, profile return and reset.');

// Read models must not initialize or silently change the manager's lineup.
const fresh=boot(),q=fresh.run;
q("startCareerWithClub('HV71');deskNavigate('squad')");
const initial=q('JSON.stringify(state)');q('squadWorkspaceView();squadWorkspaceView()');assert.equal(q('JSON.stringify(state)'),initial);
q('globalThis.a=managerRoster()[0];globalThis.b=managerRoster()[1];a.morale=38;a.happiness=91;');
assert.equal(q('squadValue(a,"morale")'),38,'match morale is independent of happiness');
assert.equal(q('squadValue(a,"ice")'),null,'no invented ice time without a ledger');
q(`state.leagueStatistics.rows={
 own:{id:a.id,club:managerClub(),stage:'regular',games:2,seconds:1800,goals:1,assists:2},
 playoff:{id:a.id,club:managerClub(),stage:'playoffs',games:1,seconds:600,goals:0,assists:1},
 other:{id:a.id,club:'AIK',stage:'regular',games:9,seconds:99999,goals:44,assists:33},
 friendly:{id:a.id,club:managerClub(),stage:'friendly',games:1,seconds:9999,goals:9,assists:9}
};`);
assert.equal(q('squadValue(a,"games")'),3);assert.equal(q('squadValue(a,"points")'),4);assert.equal(q('squadValue(a,"ice")'),800);
q('squadSort("ice")');assert.equal(q('squadPlayers()[0].id'),q('a.id'));q('squadSort("ice")');assert.equal(q('squadPlayers()[0].id'),q('a.id'),'missing data stays last in both directions');
q("squadSet('position','MV');squadSelectPlayer(b.id)");assert.equal(q('state.page'),'squad');assert.equal(q('squadUI.player'),q('b.id'));
q("squadSet('query','missing-name')");assert.match(q('squadWorkspaceView()'),/ingår inte i aktuellt urval/);
q("squadPlayerAction('profile');deskBack()");assert.equal(q('state.page'),'squad');assert.equal(q('squadUI.player'),q('b.id'));assert.equal(q('squadUI.query'),'missing-name');
q("lockerUI.tab='promises';lockerUI.filter='concerns';squadPlayerAction('talk')");assert.equal(q('lockerUI.player'),q('b.id'));assert.equal(q('lockerUI.tab'),'situation');assert.equal(q('lockerUI.filter'),'all');
q("deskBack();squadPlayerAction('contract')");assert.equal(q('state.selectedPlayer'),q('b.id'));assert.equal(q('profileWorkspace.tab'),'contract');
q("deskBack();squadPlayerAction('training')");assert.equal(q('developmentUI.player'),q('b.id'));assert.equal(q('developmentUI.detail'),true);
q("deskBack();developmentUI.medicalTab='history';squadPlayerAction('medical')");assert.equal(q('developmentUI.medical'),q('b.id'));assert.equal(q('developmentUI.medicalTab'),'cases');
q("deskBack();squadPlayerAction('place')");assert.equal(q('state.page'),'lines');assert.equal(q('lineupWorkspace'),'even');assert.equal(q('lineupUI.slot.type'),'goalie');
q("deskBack();squadReset();squadSet('tab','status');b.health.injury={remaining:5,name:'Testskada'};b.health.clearance='rest'");
assert.equal(q('squadPlayerAdvice(b,"status").action'),'medical');assert.equal(q('squadAvailability(b)'),'Skadad');
q("squadSet('status','unavailable')");assert.equal(q('squadPlayers().some(p=>p.id===b.id)'),true);
q("squadSet('tab','contracts')");assert.equal(q('squadPlayerAdvice(b,"contracts").action'),'contract');
const valid=q('JSON.stringify(squadUI)');q("squadSet('tab','bad');squadSort('bad');squadSet('status','bad')");assert.equal(q('JSON.stringify(squadUI)'),valid);
q("squadUI.player='not-in-current-club'");const history=q('deskHistory.length');q("squadPlayerAction('contract')");assert.equal(q('deskHistory.length'),history);assert.equal(q('squadSelected()'),null);
for(const tab of q('Object.keys(SQUAD_VIEWS)')){q(`squadSet('tab',${JSON.stringify(tab)})`);const html=q('squadWorkspaceView()');for(const column of q(`SQUAD_VIEW_COLUMNS[${JSON.stringify(tab)}]`))assert.ok(html.includes(`squadSort('${column}')`),tab+': '+column);}
console.log('PASS: real morale, club-scoped season data, missing ice-time sorting, persistent player inspector, exact action destinations, injury/contract priority and stale identity guards.');
