const assert=require('node:assert/strict');
const {boot}=require('./scripts/career-test-fixture.cjs');
let app=boot(),run=app.run;
run('startCareerWithClub("HV71")');
let regularGames=0;
for(let season=0;season<3;season++){
 // Keep manager-controlled contracts and employment long enough to isolate AI.
 // AI contracts, money, injuries, recruitment and training follow normal time.
 run('for(const p of managerRoster())p.contractYears=5;state.managerCareer.status="employed";state.managerCareer.expires=state.season.year+3;');
 if(season){
  run('while(state.calendar.date<state.season.year+"-09-07")calendarStep();launchSeason()');
  assert.equal(run('state.season.phase'),'regular',run('state.season.message'));
 }
 run('for(state.round=1;state.round<=52;state.round++){while(state.calendar.date<calendarTarget())calendarStep();for(const g of state.schedule.filter(g=>g.round===state.round))leagueBackground(g);calendarAfterFixture();}');
 assert.equal(run('state.schedule.filter(g=>g.played&&g.statsRecorded&&g.rivalsRecorded).length'),728);
 regularGames+=728;
 assert.equal(run('state.teams.reduce((n,t)=>n+t.pts,0)'),728*3);
 assert.equal(run('state.teams.reduce((n,t)=>n+t.gf,0)'),run('state.teams.reduce((n,t)=>n+t.ga,0)'));
 assert.equal(run('Object.values(state.leagueStatistics.rows).reduce((n,r)=>n+r.goals,0)'),run('state.teams.reduce((n,t)=>n+t.gf,0)-state.schedule.filter(g=>g.shootout).length'));
 // Use the real background playoff entrypoints for both leagues, including
 // the manager's club, so unanswered user-only dialogs cannot stall this soak.
 run('enterPlayoffs();globalThis.steps=0;while(state.season.phase==="playoffs"&&steps++<100){while(state.calendar.date<calendarTarget())calendarStep();for(const g of state.schedule.filter(g=>g.round===state.round&&g.seriesId&&!g.played))simulatePlayoffGame(g);finishPlayoffDay();}');
 assert.equal(run('state.season.phase'),'review');
 // Every balance reconciles to a real opening balance and recorded transactions.
 assert.equal(run('Object.entries(state.clubAI.clubs).filter(([club])=>club!==managerClub()).every(([club,c])=>state.recruitment.ai[club].cash===c.finance.opening+Object.values(c.finance.totals).reduce((n,v)=>n+v,0))'),true);
 assert.equal(run('Object.entries(state.clubAI.clubs).filter(([club])=>club!==managerClub()).every(([club,c])=>c.finance.settled.length>=52&&c.finance.totals.wages<0)'),true);
 const report=run('JSON.stringify({year:state.season.year,transfers:state.recruitment.history.filter(h=>h.year===state.season.year).length,loans:state.loans.history.length+state.loans.active.filter(l=>!l.initial).length,academies:aiAcademyPlayers().length,negativeCash:Object.keys(state.clubAI.clubs).filter(c=>c!==managerClub()&&state.recruitment.ai[c].cash<0).length})');
 run('globalThis.closing=Object.fromEntries(Object.keys(state.clubAI.clubs).filter(c=>c!==managerClub()).map(c=>[c,state.recruitment.ai[c].cash]));beginPreseason()');
 assert.equal(run('Object.entries(closing).every(([club,cash])=>clubAIState(club).finance.archives[0].closing===cash&&clubAIState(club).finance.opening===cash)'),true);
 const squadIssues=run('Object.keys(state.clubAI.clubs).filter(c=>c!==managerClub()).flatMap(c=>{const r=state.clubRosters[c],counts={club:c,MV:r.filter(p=>p.pos==="MV").length,B:r.filter(p=>p.pos==="B").length,F:r.filter(p=>worldGroup(p)==="F").length,total:r.length,expired:r.filter(p=>p.contractYears<=0).map(p=>p.name)};return counts.MV<2||counts.B<6||counts.F<12||counts.total>30||counts.expired.length?[counts]:[]})');
 if(squadIssues.length)require('node:fs').writeFileSync('/tmp/hockey-ai-career-failed.json',run('JSON.stringify(state)'));
 assert.equal(squadIssues.length,0,JSON.stringify(squadIssues));
 assert.equal(run('(()=>{const ps=[...Object.values(state.clubRosters).flat(),...state.playerWorld.freeAgents,...state.loans.external,...state.juniors.roster,...aiAcademyPlayers()];return ps.length===new Set(ps.map(p=>String(p.id))).size&&ps.every(p=>Object.values(p.attributes).every(n=>Number.isFinite(n)&&n>=1&&n<=20))})()'),true);
 assert.doesNotThrow(()=>run('validateSaveText(saveExportText())'));
 run('save();globalThis.savedAI=JSON.stringify(state.clubAI)');
 const previous=run('savedAI');app=boot(app.storage.value);run=app.run;
 assert.equal(run('JSON.stringify(state.clubAI)'),previous);
 const packedBytes=run('careerPack(JSON.stringify(state)).length*2');
 if(packedBytes>=5*1024*1024)require('node:fs').writeFileSync('/tmp/hockey-ai-career-storage.json',run('JSON.stringify(state)'));
 assert.ok(packedBytes<5*1024*1024,`Compressed career exceeds browser storage budget: ${packedBytes} bytes`);
 console.log('Career checkpoint:',report);
}
console.log(`PASS: ${regularGames} regular fixtures, three playoffs and real year transitions, autonomous club finances, playable squads, unique identities, bounded attributes and reloaded careers.`);
