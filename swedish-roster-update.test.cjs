const assert=require('node:assert/strict');
const fs=require('node:fs');
const {boot}=require('./scripts/career-test-fixture.cjs');
const app=boot(),r=app.run;
r('startCareerWithClub("Almtuna IS")');
assert.equal(r('state.calendar.date'),'2026-09-23');
assert.equal(r('calendarTarget()'),'2026-09-26');
assert.ok(r('state.schedule.every(g=>g.date>=state.calendar.date)'));
r('calendarInitialPreseason()');assert.equal(r('state.calendar.date'),'2026-09-23','snapshot must not rewind before its transfers');
const review=JSON.parse(fs.readFileSync('data/roster-update-2026-09-23.json'));
assert.equal(review.clubs.length,28);
for(const e of review.changes){
 const id=JSON.stringify(e.id),club=e.to==='Luleå HF'?'Luleå Hockey':e.to;
 assert.equal(r(`playerIdentity(${id}).club`),club,e.name);
 assert.equal(r(`playerIdentity(${id}).player.research.birth`),e.birth,e.name);
 assert.equal(r(`Object.values(state.clubRosters).flat().filter(p=>p.id===${id}).length`),['retire','free','abroad'].includes(e.kind)||['Wings HC','Lindlövens IF','Karlskrona HK'].includes(e.to)?0:1,e.name+' single roster');
 assert.match(r(`playerReference(${id})`),new RegExp(e.id));
}
// Namesakes remain two people with their own contracts and loans.
assert.equal(r('getPlayerClub("ep-880546")'),'Almtuna IS');
assert.equal(r('getPlayerClub("ep-648366")'),'Östersunds IK');
assert.equal(r('playerLoan(findPlayerAnywhere("ep-880546")).owner'),'Brynäs IF');
assert.equal(r('playerLoan(findPlayerAnywhere("ep-648366")).owner'),'Skellefteå AIK');
// Later official recall and temporary registrations override cumulative team pages.
assert.equal(r('getPlayerClub("ep-619002")'),'Linköping HC');
assert.equal(r('getPlayerClub("ep-177879")'),'Örebro Hockey');
assert.equal(r('findPlayerAnywhere("ep-424479")'),null,'tryout is not a signed contract');
assert.equal(r('findPlayerAnywhere("ep-13991")'),null,'retired goalkeeper cannot play');
assert.match(r('historicalPlayerView("ep-13991")'),/Pensionerad|Nybro Vikings/);
assert.equal(r('getPlayerClub("ep-300505")'),'Kontraktslös');
assert.equal(r('getPlayerClub("ep-349832")'),'Kontraktslös');
// An outgoing lower-division loan keeps identity/history and returns once.
r('globalThis.loan=state.loans.active.find(l=>l.playerId==="ep-788657");globalThis.person=loanPlayer(loan);person.fatigue=31;globalThis.realHistory=JSON.stringify(person.research.stats);loanRecall(loan.id)');
assert.equal(r('getPlayerClub("ep-788657")'),'Almtuna IS');
assert.equal(r('findPlayerAnywhere("ep-788657").fatigue'),31);
assert.equal(r('JSON.stringify(findPlayerAnywhere("ep-788657").research.stats)'),r('realHistory'));
r('loanRecall(loan.id);save()');
assert.equal(r('state.loans.history.filter(l=>l.playerId==="ep-788657").length'),1);
// Imports reject impossible dates, duplicate loan locations and orphan loans.
for(const mutate of ["bad.rosterStartDate='2026-02-30'", "bad.loans.external.find(p=>p.loanId).loanId=999999", "bad.loans.active.find(l=>l.external).borrower='HV71'"]){
 r('globalThis.bad=JSON.parse(saveExportText()).career;'+mutate);
 assert.throws(()=>r('validateSaveText(JSON.stringify(bad))'));
}
assert.equal(r('evidenceSavedModel({model:2}).asOf'),'2026-09-07');
assert.equal(r('evidenceSavedModel({model:3}).asOf'),'2026-09-23');
assert.match(r('loanTermsNote(state.loans.active.find(l=>l.playerId==="ep-689901"))'),/Carolina Hurricanes/);
assert.match(r('loanTermsNote(state.loans.active.find(l=>l.playerId==="ep-718912"))'),/månad/);
assert.match(r('historicalPlayerView("ep-719785")'),/Följ lånet/);
assert.match(r('loanProduction(state.loans.active.find(l=>l.playerId==="ep-719785"))'),/simuleras inte/);
const restored=boot(app.storage.value);
assert.equal(restored.run('getPlayerClub("ep-788657")'),'Almtuna IS');
assert.equal(restored.run('state.loans.external.some(p=>p.id==="ep-788657")'),false);
assert.equal(restored.run('validateSaveText(saveExportText()).rosterStartDate'),'2026-09-23');
// Legacy careers: no new-player injection, no calendar rewrite, no lost manager move.
const old=JSON.parse(app.storage.value);delete old.rosterStartDate;delete old.seedRosterUpdate;
old.playerDatabaseVersion='se-2026-09-07-evidence2';old.calendar.date='2026-09-08';
old.clubRosters['Djurgårdens IF']=old.clubRosters['Djurgårdens IF'].filter(p=>p.id!=='ep-241370');
const legacy=boot(JSON.stringify(old));
assert.equal(legacy.run('findPlayerAnywhere("ep-241370")'),null);
assert.equal(legacy.run('state.calendar.date'),'2026-09-08');
assert.equal(legacy.run('getPlayerClub("ep-788657")'),'Almtuna IS');
assert.equal(legacy.run('calRoundDate(1,2026)'),'2026-09-10');
assert.equal(r('calRoundDate(1,2027)'),'2027-09-10','later seasons use their usual calendar');
console.log('PASS: 52 dated roster changes, identity and namesake checks, real loans/recall, retirements, saves and legacy preservation.');
