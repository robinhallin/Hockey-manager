const test=require('node:test'),assert=require('node:assert/strict');
const {boot}=require('./scripts/career-test-fixture.cjs');
function game(){const a=boot(undefined,{production:true});a.run(`startCareerWithClub('HV71');state.calendar.date='2026-08-02';globalThis.p=state.juniors.roster.find(p=>p.pos==='B');p.age=19;p.nhlDraft={year:2026,club:'Seattle Kraken',expires:'2030-06-30'};for(const k of Object.keys(p.attributes))p.attributes[k]=13;p.health={load:0,injury:null,clearance:'rest'};playerSocialIdentity(p);p.social.ambition=15;p.social.loyalty=10;state.season.nextWageLimit=1000000000;state.boardPlan.offer.wageLimit=1000000000;globalThis.o=naOffer(p,managerClub());`);return a;}
function sign(a,mode='move'){assert.equal(a.run(`naAnswer(o.id,'${mode}')`),true);a.run('state.calendar.date=o.dueDate;naProcessOffers(state.calendar.date)');assert.equal(a.run('o.status'),'signed');}
test('club approval reserves terms but cannot bypass player decision; settlement is exactly once',()=>{
 const a=game(),r=a.run;r('globalThis.cash=state.money');assert.equal(r('naSign(o)'),false);assert.equal(r("naAnswer(o.id,'move')"),true);
 assert.equal(r('naActive(p)'),false);assert.equal(r('state.money'),r('cash'));assert.equal(r("naAnswer(o.id,'move')"),false);
 r('naProcessOffers(state.calendar.date)');assert.equal(r('o.status'),'pending');r('state.calendar.date=o.dueDate;naProcessOffers(state.calendar.date)');
 assert.equal(r('o.status'),'signed');assert.equal(r('state.money-cash'),r('o.fee'));r('naProcessOffers(state.calendar.date)');assert.equal(r('state.money-cash'),r('o.fee'));
});
test('pending decision survives save and reload without changing outcome',()=>{
 const a=game();a.run("naAnswer(o.id,'loanback');save()");const b=boot(a.storage.value,{production:true});
 b.run('globalThis.o=state.northAmerica.offers.find(o=>o.stage===\'player\');state.calendar.date=o.dueDate;naProcessOffers(state.calendar.date)');
 assert.equal(b.run('o.status'),'signed');assert.equal(b.run('playerLoan(naFind(o.playerId)).owner'),'Seattle Kraken');
});
test('undrafted veterans are eligible on quality; draft-age unknowns are not silently free',()=>{
 const a=game(),r=a.run;r('delete p.nhlDraft;p.age=28;for(const k of Object.keys(p.attributes))p.attributes[k]=16');assert.equal(r('naInterested(p)'),true);
 assert.equal(r('naTerms(p).contractType'),'one-way');assert.equal(r('naTerms(p).nhlSalary===naTerms(p).ahlSalary'),true);
 r('p.age=19');assert.equal(r('naInterested(p)'),false);r('p.age=24');assert.equal(r('naTerms(p).years'),1);assert.equal(r('naTerms(p).contractType'),'entry');
 r('p.naHistory=[{}]');assert.notEqual(r('naTerms(p).contractType'),'entry');
});
test('player can decline AHL wages and club capacity includes unresolved offers',()=>{
 const a=game(),r=a.run;r('p.age=30;p.salary=9000000;p.social.ambition=5;p.social.loyalty=19');assert.equal(r("naPlayerDecision(p,o,'move').accepted"),false);
 assert.equal(r('naReservations(o.team).contracts'),1);r('state.northAmerica.fees[`${state.season.year}:${o.team}`]=6000000-o.fee');assert.equal(r('naFunded(o.team,o)'),false);assert.equal(r('naFunded(o.team,o,o.id)'),true);
});
test('changed origin or rights invalidates settlement without a fee',()=>{
 const a=game(),r=a.run;r("naAnswer(o.id,'move');globalThis.cash=state.money;p.nhlDraft.club='Boston Bruins';state.calendar.date=o.dueDate;naProcessOffers(state.calendar.date)");
 assert.equal(r('o.status'),'expired');assert.equal(r('naActive(p)'),false);assert.equal(r('state.money'),r('cash'));
});
test('AHL loan requests reserve wage room and do not instantly move a player',()=>{
 const a=game(),r=a.run;sign(a);r('globalThis.before=managerRecruitmentBudget().salaryReserved');assert.equal(r('naBorrow(p.id)'),true);
 assert.equal(r('playerLoan(p)'),null);assert.equal(r('naBorrow(p.id)'),false);assert.equal(r('managerRecruitmentBudget().salaryReserved-before'),r('p.naContract.ahlSalary*.5'));
 r('state.calendar.date=calAdd(state.calendar.date,3);naProcessLoans(state.calendar.date)');assert.equal(r('state.northAmerica.loanRequests[0].status'),'signed');assert.equal(r('managerRecruitmentBudget().salaryReserved'),r('before'));
 assert.equal(r('managerRoster().filter(q=>q.id===p.id).length'),1);assert.equal(r('state.northAmerica.abroad.includes(p)'),false);
});
test('loan refuses changed budgets and releases its reservation',()=>{
 const a=game(),r=a.run;sign(a);r('naBorrow(p.id);state.season.nextWageLimit=1;state.boardPlan.offer.wageLimit=1;state.calendar.date=calAdd(state.calendar.date,3);naProcessLoans(state.calendar.date)');
 assert.equal(r('state.northAmerica.loanRequests[0].status'),'rejected');assert.equal(r('naLoanReserved(managerClub())'),0);assert.equal(r('playerLoan(p)'),null);assert.equal(r('state.northAmerica.abroad.includes(p)'),true);
});
test('contract expiry retains NHL-only rights while permitting European negotiations',()=>{
 const a=game(),r=a.run;sign(a);r("p.naContract.end='2026-08-01';naExpire(p)");assert.equal(r('worldIsFree(p.id)'),true);assert.equal(r('naRights(p).kind'),'retained');assert.equal(r('naChooseTeam(p)'),'Seattle Kraken');
 r('state.money=1000000000');assert.equal(r("transferRecruitPlayer(p,WORLD_FREE,managerClub(),0,900000,2,'Breddspelare')"),true);assert.equal(r('naRights(p).team'),'Seattle Kraken');
 r("state.calendar.date='2028-08-02'");assert.equal(r('naRights(p).kind'),'free');
});
test('injury or international duty does not administratively demote NHL players',()=>{
 const a=game(),r=a.run;sign(a);r("for(const k of Object.keys(p.attributes))p.attributes[k]=18;naAssignTeam(o.team);p.health.injury={remaining:5};naAssignTeam(o.team)");assert.equal(r('p.naContract.assignment'),'NHL');
});
test('market cards are read-only and expose owner, rights, registration and next step',()=>{
 const a=game(),r=a.run;r('globalThis.before=JSON.stringify(state)');const html=r('naStatusView(p)+naRecruitmentView()');assert.match(html,/Registrerad hos/);assert.match(html,/Kontraktsägare/);assert.match(html,/Ditt beslut/);assert.equal(r('JSON.stringify(state)'),r('before'));
});
test('pending loans can be withdrawn once without moving players or retaining wages',()=>{
 const a=game(),r=a.run;sign(a);r('naBorrow(p.id);globalThis.request=state.northAmerica.loanRequests[0]');assert.equal(r('naCancelLoan(request.id)'),true);assert.equal(r('naCancelLoan(request.id)'),false);assert.equal(r('naLoanReserved(managerClub())'),0);
 r('state.calendar.date=request.dueDate;naProcessLoans(state.calendar.date)');assert.equal(r('playerLoan(p)'),null);assert.equal(r('request.status'),'cancelled');
});
test('v1 pending offers migrate without changing agreed wages, duration or cash',()=>{
 const a=game(),r=a.run;r('state.northAmerica.version=1;delete state.northAmerica.loanRequests;delete o.stage;delete o.modelVersion;globalThis.terms=JSON.stringify([o.nhlSalary,o.ahlSalary,o.end,state.money]);ensureNorthAmerica()');
 assert.equal(r('state.northAmerica.version'),2);assert.equal(r('o.stage'),'club');assert.equal(r('JSON.stringify([o.nhlSalary,o.ahlSalary,o.end,state.money])'),r('terms'));assert.equal(r('naSign(o)'),false);
});
test('window closure and live matches prevent settlement or duplicate mutation',()=>{
 const a=game(),r=a.run;r("state.calendar.date='2026-09-30';o.expires=state.calendar.date;naAnswer(o.id,'move');globalThis.before=JSON.stringify(state);state.live={finished:false};naProcessOffers(o.dueDate);naProcessLoans(o.dueDate)");assert.equal(r('o.status'),'pending');
 r('state.live=null;state.calendar.date=o.dueDate;naProcessOffers(state.calendar.date)');assert.equal(r('o.status'),'expired');assert.equal(r('naActive(p)'),false);
});
test('a player rejection closes the case without a transfer or a fee',()=>{
 const a=game(),r=a.run;r("p.age=30;p.salary=9000000;for(const k of Object.keys(p.attributes))p.attributes[k]=14;p.social.ambition=5;p.social.loyalty=19;globalThis.cash=state.money;naAnswer(o.id,'move');state.calendar.date=o.dueDate;naProcessOffers(state.calendar.date)");
 assert.equal(r('o.status'),'rejected');assert.match(r('o.reason'),/Spelaren avböjde/);assert.equal(r('state.money'),r('cash'));assert.equal(r('naActive(p)'),false);assert.equal(r('naReservations(o.team).contracts'),0);
});
