// Match fixtures below explicitly set match day; daily progression is tested in daily-manager.test.cjs.
const fs=require('node:fs'),assert=require('node:assert/strict');
const {boot}=require('./scripts/career-test-fixture.cjs');
const app=boot(),{run,get}=app;
run('startCareerWithClub("HV71")');
assert.equal(run('managerRoster().length'),25);assert.equal(run('goalies().length'),3);
assert.equal(run('Object.values({...ALLSVENSKAN_DATABASE.clubs,...SHL_DATABASE.clubs}).reduce((n,c)=>n+c.players.length,0)'),680);
assert.equal(run('new Set(Object.values({...ALLSVENSKAN_DATABASE.clubs,...SHL_DATABASE.clubs}).flatMap(c=>c.players.map(p=>p.id))).size'),680);
assert.equal(run('state.loans.active.length'),23);
assert.equal(run('state.loans.active.find(l=>l.name==="Edvin Hammarlund").owner'),'Almtuna IS');
assert.equal(run('getPlayerClub(state.loans.active.find(l=>l.name==="Edvin Hammarlund").playerId)'),'Örebro Hockey');
assert.ok(run('Object.values({...ALLSVENSKAN_DATABASE.clubs,...SHL_DATABASE.clubs}).flatMap(c=>c.players).every(p=>p.stats.length&&p.stats.every(s=>s.gp>0&&Number.isFinite(HA_LEAGUE_LEVEL[s.league])&&(s.pim==null||s.pim>=0)))'));
// Independent published controls: offence, penalties and a starting goalkeeper.
run('globalThis.ang=managerRoster().find(p=>p.name==="Jonathan Ang").research.stats.find(s=>s.season==="25-26"&&s.league==="SHL")');
assert.deepEqual(JSON.parse(run('JSON.stringify([ang.gp,ang.goals,ang.assists,ang.pim])')),[52,21,25,38]);
run('globalThis.normann=SHL_DATABASE.clubs["Frölunda HC"].players.find(p=>p.name==="Tobias Normann").stats.find(s=>s.season==="25-26"&&s.league==="SHL")');
assert.equal(run('normann.gp'),24);assert.equal(run('normann.sv'),.923);
// Every club has an eligible, unique match squad; the bench uses two flexible skater slots.
for(const club of run('Object.keys(state.world.membership)')){
 run(`startCareerWithClub(${JSON.stringify(club)});depthSelection();(state.calendar.date=calendarTarget(),createMatch());depthLock()`);
 assert.ok(run('state.live.matchSquad.length<=22'),club);
 assert.equal(run('state.live.matchSquad.length'),run('new Set(state.live.matchSquad).size'),club);
 assert.ok(run('state.live.matchSquad.map(playerById).every(p=>p&&medicalReady(p))'),club);
 assert.ok(run('state.live.matchSquad.map(playerById).filter(p=>p.pos==="MV").length<=2'),club);
 assert.doesNotMatch(run('depthBenchView()'),/undefined|NaN/,club);
}
run('startCareerWithClub("HV71");depthSelection();globalThis.extra=playerById(state.matchSelection.extras[0]);globalThis.kind=extra.pos==="B"?"defense":"forwards";globalThis.old=state.lines[kind][0];(state.calendar.date=calendarTarget(),createMatch());depthLock();globalThis.outside=managerRoster().find(p=>!state.live.matchSquad.includes(String(p.id))&&p.pos==="MV");globalThis.goal=state.lines.goalie;changeGoalie(outside.id)');
assert.equal(run('state.lines.goalie'),run('goal'));
run('changeLinePlayer(kind,0,extra.id)');assert.equal(run('state.lines[kind][0]'),run('extra.id'));
run('injurePlayer(extra,"match",4)');assert.ok(run('state.lines[kind][0]!==extra.id'));
assert.ok(run('state.lines[kind].filter(Boolean).every(id=>state.live.matchSquad.includes(String(id)))'));
run('save()');const locked=boot(app.storage.value);assert.equal(locked.run('JSON.stringify(state.live.matchSquad)'),run('JSON.stringify(state.live.matchSquad)'));
// A real outgoing keeper: wage split, one host, medical/training continuity, match evidence.
run('startCareerWithClub("HV71");globalThis.keeper=goalies().find(p=>p.name==="Olof Glifford");globalThis.destination=Object.keys(state.world.membership).find(c=>leagueOf(c)==="HA"&&loanFit(keeper,c).interested);');
assert.ok(run('destination'),'The third HV keeper has an interested Allsvenskan club');
run('globalThis.ownerWage=annualWageCost();globalThis.hostWage=loanWageCost(destination);globalThis.contract=keeper.contractYears;globalThis.salary=keeper.salary;loanSubmit(keeper.id,destination,28,.5);calendarStep(true);hostWage=loanWageCost(destination);calendarStep(true);if(state.loans.offers[0].status==="counter")loanAnswer(state.loans.offers[0].id,true);globalThis.loan=playerLoan(keeper)');
assert.ok(run('loan'));assert.equal(run('getPlayerClub(keeper.id)'),run('destination'));
assert.equal(run('annualWageCost()'),run('ownerWage-salary*loan.share'));assert.equal(run('loanWageCost(destination)'),run('hostWage+salary*loan.share'));
assert.equal(run('keeper.contractYears'),run('contract'));assert.equal(run('keeper.salary'),run('salary'));
assert.equal(run('Object.values(state.clubRosters).flat().filter(p=>samePlayerId(p.id,keeper.id)).length'),1);
assert.equal(run('transferRecruitPlayer(keeper,destination,managerClub(),0,salary,4,"Ordinarie")'),false);
run('globalThis.before=JSON.stringify(keeper.attributes);for(let i=1;i<=8;i++){const game=state.schedule.find(g=>g.round===i&&(g.home===destination||g.away===destination));const r=rivalSimulate(game);game.played=true;game.homeGoals=r.homeGoals;game.awayGoals=r.awayGoals;game.rivalReports=r.reports;leagueCommitRows(game,r.rows);leagueCommitRows(game,r.rows);keeper.fatigue=0;}');
assert.ok(run('loan.games>0&&loan.games<=8&&loan.seconds>0'));
assert.equal(run('keeper.games'),run('loan.games'));
assert.ok(run('(loan.saves||0)+(loan.against||0)>0'));assert.match(run('loanProduction(loan)'),/räddningar/);
assert.ok(run('Object.values(keeper.trainingProgress||{}).some(n=>n>0)||JSON.stringify(keeper.attributes)!==before'));
run('save()');const reload=boot(app.storage.value);assert.equal(reload.run('state.loans.active.find(l=>l.name==="Olof Glifford").games'),run('loan.games'));
assert.doesNotThrow(()=>run('validateSaveText(saveExportText())'));
run('globalThis.savedGames=keeper.games;for(let i=0;i<28;i++)calendarStep(true);loanRecall(loan.id);loanRecall(loan.id)');
assert.equal(run('getPlayerClub(keeper.id)'),'HV71');assert.equal(run('keeper.games'),run('savedGames'));
assert.equal(run('keeper.contractYears'),run('contract'));assert.equal(run('annualWageCost()'),run('ownerWage'));
assert.equal(run('Object.values(state.clubRosters).flat().filter(p=>samePlayerId(p.id,keeper.id)).length'),1);
// A historic September loan returns to its real owner; external returns stay owned, never free agents.
run('startCareerWithClub("HV71");state.calendar.date="2026-09-30";loansDay()');assert.equal(run('getPlayerClub("ep-177879")'),'Örebro Hockey');
run('state.calendar.date="2026-10-01";loansDay()');assert.equal(run('getPlayerClub("ep-177879")'),'Almtuna IS');
assert.ok(run('state.loans.external.some(p=>p.name==="Isak Jonsson"&&p.club==="Lindlövens IF")'));
assert.equal(run('state.playerWorld.freeAgents.some(p=>p.name==="Isak Jonsson")'),false);
assert.doesNotThrow(()=>run('validateSaveText(saveExportText())'));
run('globalThis.bad=JSON.parse(saveExportText());bad.career.loans.active[0].borrower="HV71"');assert.throws(()=>run('validateSaveText(JSON.stringify(bad))'));
// Old worlds are not silently rewritten or given fresh researched attributes.
run('state.playerDatabaseVersion="ha-2026-09-05";managerRoster()[0].attributes.reflexes=19;globalThis.ids=JSON.stringify(managerRoster().map(p=>p.id));save()');
const old=boot(app.storage.value);assert.equal(old.run('JSON.stringify(managerRoster().map(p=>p.id))'),run('ids'));
assert.equal(old.run('managerRoster()[0].attributes.reflexes'),19);assert.match(old.run('rosterDatabaseNotice()'),/ny karriär/i);
run('deskNavigate("transfers","loans")');assert.match(get('#content').innerHTML,/Aktiva lån/);assert.doesNotMatch(get('#content').innerHTML,/undefined|NaN/);
console.log('PASS: 680 sourced identities, all 28 match squads, locked bench substitutions/injuries, real goalkeeper loan games/growth/wages, contract and save continuity, recall/expiry/external ownership, invalid import rejection and legacy preservation.');

// Incoming loans cannot become permanent signings; player contracts age at the owner once.
run('startCareerWithClub("AIK");globalThis.borrow=state.clubRosters["HV71"].find(p=>p.pos!=="MV"&&p.contractYears>1&&loanCanLeave(p,"HV71")&&loanFit(p,"AIK").interested);globalThis.originalYears=borrow.contractYears;globalThis.originalSalary=borrow.salary;loanSubmit(borrow.id,"AIK",56,.5);calendarStep(true);calendarStep(true);if(state.loans.offers[0].status==="counter")loanAnswer(state.loans.offers[0].id,true);globalThis.inloan=playerLoan(borrow);');
assert.ok(run('inloan'));
run('openContractNegotiation(borrow.id);toggleTransferStatus(borrow.id);');
assert.equal(run('state.contractNegotiation'),null);assert.equal(run('borrow.transferListed'),false);
assert.equal(run('borrow.contractYears'),run('originalYears'));
run('state.season.phase="review";state.season.boardResult=[];beginPreseason()');
assert.equal(run('playerLoan(borrow)'),null);assert.notEqual(run('getPlayerClub(borrow.id)'),'AIK');
assert.equal(run('borrow.contractYears'),run('originalYears-1'));assert.equal(run('borrow.salary'),run('originalSalary'));
assert.equal(run('Object.values(state.clubRosters).flat().filter(p=>samePlayerId(p.id,borrow.id)).length'),1);
assert.doesNotThrow(()=>run('validateSaveText(saveExportText())'));
assert.ok(run('saveExportText().length<4500000'));
console.log('PASS: incoming loans block owner-contract mutations and return before annual contract processing; active save fits the storage budget.');
