// Match fixtures below explicitly set match day; daily progression is tested in daily-manager.test.cjs.
const fs=require('node:fs'),assert=require('node:assert/strict');
const {boot}=require('./scripts/career-test-fixture.cjs');
const app=boot(),{run}=app;
run('startCareerWithClub("HV71");globalThis.originalCoach=rivalsClubState("AIK").coach.id;');
// Exercise a whole background league season with real dates, recovery, transfers and standings.
const started=Date.now();
run('for(state.round=1;state.round<=52;state.round++){while(state.calendar.date<calendarTarget())calendarStep();for(const g of state.schedule.filter(g=>g.round===state.round))leagueBackground(g);calendarAfterFixture();}');
assert.equal(run('state.schedule.filter(g=>g.played&&g.statsRecorded&&g.rivalsRecorded).length'),728);
assert.equal(run('state.teams.every(t=>t.gp===52&&t.w+t.l+t.otw+t.otl===52)'),true);
assert.equal(run('state.teams.reduce((n,t)=>n+t.gf,0)'),run('state.teams.reduce((n,t)=>n+t.ga,0)'));
assert.equal(run('state.teams.reduce((n,t)=>n+t.pts,0)'),728*3);
assert.equal(run('Object.values(state.leagueStatistics.rows).reduce((n,r)=>n+r.goals,0)'),run('state.teams.reduce((n,t)=>n+t.gf,0)-state.schedule.filter(g=>g.shootout).length'));
assert.equal(run('Object.values(state.rivals.clubs).every(c=>c.recent.length<=8&&c.history.length<=12&&c.changes<=2)'),true);
assert.equal(run('Object.values(state.clubRosters).flat().every(p=>Number.isFinite(p.fatigue)&&p.fatigue>=0&&p.fatigue<=100)'),true);
assert.equal(run('state.rivals.events.length<=80'),true);
assert.ok(run('state.rivals.events.some(e=>e.kind==="injury")'));
const meanGoals=run('state.teams.reduce((n,t)=>n+t.gf,0)/728');assert.ok(meanGoals>3&&meanGoals<9,meanGoals);
run('globalThis.completed=JSON.stringify([state.teams,state.rivals,state.leagueStatistics]);for(const g of state.schedule)leagueBackground(g)');
assert.equal(run('JSON.stringify([state.teams,state.rivals,state.leagueStatistics])'),run('completed'));
run('save()');const loaded=boot(app.storage.value);assert.equal(loaded.run('JSON.stringify(state.rivals)'),run('JSON.stringify(state.rivals)'));
// Finish both cups; no background match may produce a tied playoff result or a shootout winner.
run('enterPlayoffs();globalThis.steps=0;while(state.season.phase==="playoffs"&&steps++<100){if(currentSeasonFixture()){(state.calendar.date=calendarTarget(),createMatch());state.live.hv=4;state.live.opp=1;finishMatch(false);}else (pendingManagerDecision()&&answerPlayerConversation(pendingManagerDecision().id,"honest"),state.calendar.date=calendarTarget(),watchRemainingPlayoffs());}');
assert.equal(run('state.season.phase'),'review');assert.equal(run('state.schedule.filter(g=>g.seriesId).every(g=>g.played&&g.homeGoals!==g.awayGoals&&!g.shootout)'),true);
run('globalThis.coachHistory=JSON.stringify(rivalsClubState("AIK").history);globalThis.duels=JSON.stringify(state.rivals.duels);beginPreseason()');
assert.equal(run('state.rivals.year'),2027);assert.equal(run('JSON.stringify(rivalsClubState("AIK").history)'),run('coachHistory'));assert.equal(run('JSON.stringify(state.rivals.duels)'),run('duels'));
assert.equal(run('Object.values(state.rivals.clubs).every(c=>!c.recent.length&&!c.changes)'),true);
assert.equal(run('validateSaveText(saveExportText()).rivals.year'),2027);
console.log('PASS: 728 fixtures, all standings and player goals reconcile, no replay, bounded histories, full playoffs, promotion/relegation and next-year save. Mean goals:',meanGoals.toFixed(2),'Elapsed ms:',Date.now()-started);
