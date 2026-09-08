const assert=require('node:assert/strict');
const {boot}=require('./scripts/career-test-fixture.cjs');
const app=boot(),r=app.run;
r("startCareerWithClub('HV71')");
assert.equal(r("Object.keys(state.clubRosters).includes('Luleå HF')"),false);
assert.equal(r("state.clubRosters['Luleå Hockey'].every(p=>p.research&&p.id.startsWith('ep-'))"),true);
assert.equal(r("Object.values(state.clubRosters).flat().filter(p=>p.name==='Anton Levtchi').length"),1);
assert.equal(r("state.loans.active.every(l=>l.owner!=='Luleå HF')"),true);
assert.equal(r("Object.keys(state.world.membership).every(c=>state.clubRosters[c].every(p=>p.research))"),true);
// A fresh Luleå manager receives the very roster used by scouting and league games.
r("startCareerWithClub('Luleå Hockey')");
assert.equal(r("managerRoster().length"),24);
assert.equal(r("managerRoster().every(p=>p.research)"),true);
// Build the erroneous prior-save shape with an established legacy player and a
// duplicate source roster. Keep progress and pending selections through repair.
r(`globalThis.source=managerRoster().find(p=>p.name==='Anton Levtchi');
 state.clubRosters['Luleå HF']=state.clubRosters['Luleå Hockey'];
 for(const p of state.clubRosters['Luleå HF'])p.club='Luleå HF';
 globalThis.old=JSON.parse(JSON.stringify(source));old.id='Luleå Hockey-F-7';old.club='Luleå Hockey';old.goals=8;old.salary=1234567;old.attributes.shooting=19;
 state.clubRosters['Luleå Hockey']=[old];state.roster=state.clubRosters['Luleå Hockey'];
 state.selectedPlayer=source.id;state.recruitment.shortlist=[source.id];
 state.recruitment.deals.push({id:991,playerId:source.id,status:'pending',seller:'Luleå HF',salary:500000,fee:100000,years:2,role:'Rotation'});
 globalThis.broken=JSON.stringify(state);`);
const repaired=boot(r('broken')),q=repaired.run;
assert.equal(q("Object.keys(state.clubRosters).includes('Luleå HF')"),false);
assert.equal(q("Object.values(state.clubRosters).flat().filter(p=>p.name==='Anton Levtchi').length"),1);
assert.equal(q("findPlayerAnywhere('ep-92085').goals"),8);
assert.equal(q("findPlayerAnywhere('ep-92085').salary"),1234567);
assert.equal(q("findPlayerAnywhere('ep-92085').attributes.shooting"),19);
assert.equal(q("state.selectedPlayer"),'Luleå Hockey-F-7');
assert.equal(q("state.recruitment.deals.find(d=>d.id===991).seller"),'Luleå Hockey');
assert.equal(q("state.recruitment.deals.find(d=>d.id===991).playerId"),'Luleå Hockey-F-7');
q('save();globalThis.once=JSON.stringify(state);save()');assert.equal(q('JSON.stringify(state)'),q('once'));
q('validateSaveText(saveExportText())');
// A player already bought from the alias retains his destination and contract.
const moved=JSON.parse(r('broken'));const bought=moved.clubRosters['Luleå HF'].find(p=>p.id==='ep-92085');
moved.clubRosters['Luleå HF']=moved.clubRosters['Luleå HF'].filter(p=>p!==bought);
bought.club='AIK';bought.salary=987654;moved.clubRosters.AIK.push(bought);
const acquired=boot(JSON.stringify(moved));
assert.equal(acquired.run("getPlayerClub('ep-92085')"),'AIK');
assert.equal(acquired.run("findPlayerAnywhere('ep-92085').salary"),987654);
assert.equal(acquired.run("getPlayerClub('Luleå Hockey-F-7')"),'AIK');
// Import follows the same migration, and a paused match is left intact.
r('globalThis.checked=validateSaveText(broken)');assert.equal(r("Boolean(checked.clubRosters['Luleå HF'])"),false);
r('globalThis.waiting=JSON.parse(broken);waiting.live={finished:false,running:false};haRepairClubIdentity(waiting)');
assert.equal(r("Boolean(waiting.clubRosters['Luleå HF'])"),true);
r('waiting.live.finished=true;haRepairClubIdentity(waiting)');assert.equal(r("Boolean(waiting.clubRosters['Luleå HF'])"),false);
// Renewals replace the actual promise, and declined proposals preserve it.
r(`startCareerWithClub('HV71');state.boardPlan.offer.wageLimit=1e9;
 globalThis.p=managerRoster().find(p=>!playerLoan(p)&&p.age<30);
 p.recruitmentPromise={role:'Nyckelspelare',minutes:15,games:2,qualified:0,resolved:false};
 p.promisedRole='Rotation';p.squadRole='Rotation';openContractNegotiation(p.id);
 globalThis.w=renewalWishes(p);submitContractRenewal(p.id,w.salary,w.minYears,'Rotation');`);
assert.equal(r('state.contractNegotiation'),null);assert.equal(r('p.recruitmentPromise'),undefined);
r("openContractNegotiation(p.id);w=renewalWishes(p);submitContractRenewal(p.id,w.salary,w.minYears,'Ordinarie')");
assert.equal(r('p.recruitmentPromise.minutes'),r('p.pos')==='MV'?30:12);
assert.equal(r('p.recruitmentPromise.games'),0);
r("globalThis.promise=JSON.stringify(p.recruitmentPromise);openContractNegotiation(p.id);submitContractRenewal(p.id,1,1,'Breddspelare')");
assert.equal(r('JSON.stringify(p.recruitmentPromise)'),r('promise'));
// Pending contracts and the opened list use exactly the same eligibility rule.
r("startCareerWithClub('HV71');globalThis.loanee=managerRoster().find(p=>playerLoan(p));loanee.contractYears=1;globalThis.future=managerRoster().find(p=>!playerLoan(p));future.contractYears=1;future.futureContract={club:'AIK'};deskNavigate('home')");
assert.equal(r('contractNeedsDecision(loanee)'),false);assert.equal(r('contractNeedsDecision(future)'),false);
assert.equal(r("deskTasks().find(t=>t.tag==='Trupp').title"),r("managerRoster().filter(contractNeedsDecision).length+' kontrakt på sista året'"));
r("deskNavigate('squad','contracts')");assert.equal(r('squadUI.tab'),'contracts');assert.equal(r('squadUI.status'),'expiring');
assert.equal(r('squadPlayers().every(contractNeedsDecision)'),true);
assert.equal(r('squadPlayers().length'),r('managerRoster().filter(contractNeedsDecision).length'));
assert.match(app.get('#content').innerHTML,/Avtalad roll/);
console.log('PASS: canonical sourced Luleå, loan ownership, old saves/import/transferred players/paused matches, idempotent repair, contract promises and focused eligible contract tasks.');

// Reproduce the entire old start database, including the misspelled Casper and
// the duplicate goalkeeper whose sourced identity is already on loan in HA.
const whole=boot(),h=whole.run;
h(`startCareerWithClub('HV71');globalThis.canonical=haRemoveStartingDuplicates;
 haRemoveStartingDuplicates=rosters=>rosters;globalThis.oldRoster=createClubRosters()['Luleå Hockey'];haRemoveStartingDuplicates=canonical;
 state.clubRosters['Luleå HF']=state.clubRosters['Luleå Hockey'];
 for(const p of state.clubRosters['Luleå HF'])p.club='Luleå HF';
 state.clubRosters['Luleå Hockey']=oldRoster;for(const l of state.loans.active)if(l.owner==='Luleå Hockey')l.owner='Luleå HF';globalThis.originalWhole=JSON.stringify(state);`);
const consolidated=boot(h('originalWhole')),c=consolidated.run;
assert.equal(c("state.clubRosters['Luleå Hockey'].length"),24);
assert.equal(c("Object.values(state.clubRosters).flat().filter(p=>p.name==='Isak Sörqvist').length"),1);
assert.equal(c("getPlayerClub(Object.values(state.clubRosters).flat().find(p=>p.name==='Isak Sörqvist').id)"),'Vimmerby HC');
assert.equal(c("state.clubRosters['Luleå Hockey'].filter(p=>p.name==='Casper Juustovaara Karlsson').length"),1);
assert.equal(c("state.clubRosters['Luleå Hockey'].some(p=>p.name==='Caper Juustovaara Karlsson')"),false);
c('validateSaveText(saveExportText())');
console.log('PASS: full prior database consolidates to 24 Luleå players, including the source-name typo and already loaned goalkeeper.');
