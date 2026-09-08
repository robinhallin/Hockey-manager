const assert=require('node:assert/strict');
const {boot}=require('./scripts/career-test-fixture.cjs');
function setup(){const app=boot();app.run(`startCareerWithClub('HV71');
 globalThis.buyer='Färjestad BK';globalThis.seller='Luleå Hockey';
 state.recruitment.ai[buyer].cash=100000000;state.recruitment.ai[buyer].wageLimit=100000000;
 globalThis.ids=()=>JSON.stringify([...Object.values(state.clubRosters).flat(),...state.playerWorld.freeAgents,...state.loans.external,...state.juniors.roster,...aiAcademyPlayers()].map(p=>String(p.id)).sort());
`);return app;}

// Pending current and future contracts both reserve their full wage obligation.
{
 const {run:r}=setup();
 r(`globalThis.p=state.playerWorld.freeAgents[0];globalThis.q=state.playerWorld.freeAgents[1];
  globalThis.need=aiSquadNeeds(buyer).find(n=>n.role==='forward');
  globalThis.salary=recruitPlayerWishes(p,buyer).salary;
  state.recruitment.ai[buyer].wageLimit=loanWageCost(buyer)+salary+100;
  aiSubmitMarket(buyer,p,need,'transfer',{fee:0,salary,years:2,role:'Nyckelspelare'});`);
 assert.equal(r('aiMarketReserved(buyer).salary'),r('salary'));
 assert.equal(r('aiFutureReserved(buyer)'),r('salary'));
 assert.equal(r('aiCanCommit(buyer,q,0,1000,{years:2})'),false);
 r('state.clubAI.offers[0].status="rejected"');
 assert.equal(r('aiMarketReserved(buyer).salary'),0);
 r(`state.recruitment.incoming.push({id:999,playerId:p.id,buyer,fee:500000,salary,years:3,status:'pending',expires:state.recruitment.tick+3});`);
 assert.equal(r('aiMarketReserved(buyer).fee'),500000);
 assert.equal(r('aiFutureReserved(buyer)'),r('salary'));
 r('state.recruitment.incoming.at(-1).status="rejected"');
 assert.equal(r('aiFutureReserved(buyer)'),0);
}

// A future signing stays with its present club and activates once, at the real year boundary.
{
 const a=setup(),r=a.run;
 r(`state.calendar.date='2027-01-10';
  for(const p of state.clubRosters[buyer])if(worldGroup(p)==='F')p.contractYears=1;
  globalThis.p=state.clubRosters[seller].find(p=>worldGroup(p)==='F'&&!playerLoan(p));p.contractYears=1;
  globalThis.need=aiSquadNeeds(buyer).find(n=>n.role==='forward');
  globalThis.w=recruitPlayerWishes(p,buyer);globalThis.allBefore=ids();globalThis.oldId=p.id;
  aiSubmitMarket(buyer,p,need,'future',{fee:0,salary:w.salary,years:2,role:'Nyckelspelare'});
  state.calendar.date=calAdd(state.calendar.date,2);aiResolveMarket();`);
 assert.equal(r('getPlayerClub(p.id)'),r('seller'));
 assert.equal(r('p.futureContract.buyer'),r('buyer'));
 assert.ok(r('calendarFutureRoom(buyer)')<r('state.recruitment.ai[buyer].wageLimit'));
 assert.equal(r('ids()'),r('allBefore'));
 r('save()');const loaded=boot(a.storage.value);
 assert.equal(loaded.run(`findPlayerAnywhere(${JSON.stringify(r('oldId'))}).futureContract.buyer`),r('buyer'));
 r('state.season.phase="review";state.season.boardResult=[];beginPreseason()');
 assert.equal(r('getPlayerClub(oldId)'),r('buyer'));
 assert.equal(r('findPlayerAnywhere(oldId).futureContract'),undefined);
 assert.equal(r('state.recruitment.history.filter(h=>samePlayerId(h.playerId,oldId)&&h.buyer===buyer).length'),1);
 r('calendarActivateFuture();playerWorldNewYear()');
 assert.equal(r('state.recruitment.history.filter(h=>samePlayerId(h.playerId,oldId)&&h.buyer===buyer).length'),1);
 assert.doesNotThrow(()=>r('validateSaveText(saveExportText())'));
}

// Autonomous loans use the same ownership, wage split, participation and return ledger.
{
 const a=setup(),r=a.run;
 r(`globalThis.p=state.clubRosters[seller].find(p=>p.pos==='B'&&!playerLoan(p));p.age=20;
  for(const key of Object.keys(p.attributes))p.attributes[key]=17;
  const backs=state.clubRosters[buyer].filter(p=>p.pos==='B');
  for(const extra of backs.slice(5)){state.clubRosters[buyer]=state.clubRosters[buyer].filter(q=>q!==extra);worldRelease(extra,buyer,'Controlled loan vacancy');}
  globalThis.need=aiSquadNeeds(buyer).find(n=>n.role==='defense');
  globalThis.terms=loanTerms(p,seller,buyer,{id:null,days:56,share:.5,role:'regular',recall:'day28'}).terms;
  globalThis.ownerWage=loanWageCost(seller),borrowerWage=loanWageCost(buyer),allBefore=ids();
  aiSubmitMarket(buyer,p,need,'loan',{fee:0,salary:Math.round(p.salary*terms.share),years:0,...terms,loanRole:terms.role});
  state.calendar.date=calAdd(state.calendar.date,2);aiResolveMarket();`);
 assert.equal(r('getPlayerClub(p.id)'),r('buyer'));assert.equal(r('playerLoan(p).owner'),r('seller'));
 assert.equal(r('loanWageCost(seller)'),r('ownerWage-p.salary*terms.share'));
 assert.equal(r('loanWageCost(buyer)'),r('borrowerWage+p.salary*terms.share'));
 assert.equal(r('ids()'),r('allBefore'));
 r('globalThis.loan=playerLoan(p);loansAfterFixture({home:buyer,away:seller,round:99,date:state.calendar.date},[{club:buyer,id:p.id,seconds:1000,goals:0,assists:1}]);');
 assert.equal(r('loan.seconds'),1000);assert.equal(r('loan.games'),1);
 r('save()');assert.doesNotThrow(()=>r('validateSaveText(saveExportText())'));
 const loaded=boot(a.storage.value);assert.equal(loaded.run('state.loans.active.filter(l=>!l.initial).length'),1);
 r('state.calendar.date=calAdd(loan.until,1);loansDay();loansDay()');
 assert.equal(r('getPlayerClub(p.id)'),r('seller'));assert.equal(r('ids()'),r('allBefore'));
 assert.equal(r('loanWageCost(seller)'),r('ownerWage'));assert.equal(r('loanWageCost(buyer)'),r('borrowerWage'));
 assert.equal(r('state.loans.history.filter(l=>l.id===loan.id).length'),1);
}

// Expired windows or a newly signed renewal prevent stale AI offers from taking a player.
{
 const {run:r}=setup();
 r(`globalThis.p=state.clubRosters[seller].find(p=>p.pos==='B'&&!playerLoan(p));p.contractYears=1;
  globalThis.need=aiSquadNeeds(buyer).find(n=>n.role==='defense');globalThis.w=recruitPlayerWishes(p,buyer);
  aiSubmitMarket(buyer,p,need,'future',{fee:0,salary:w.salary,years:2,role:'Nyckelspelare'});
  p.contractYears=3;state.calendar.date=calAdd(state.calendar.date,2);aiResolveMarket();`);
 assert.equal(r('getPlayerClub(p.id)'),r('seller'));assert.equal(r('p.futureContract'),undefined);
 assert.equal(r('state.clubAI.offers[0].status'),'rejected');assert.equal(r('aiFutureReserved(buyer)'),0);
}
// The player's shared choice must count a rival's own reservation once, and
// withdraw that rival from the choice if its real offer has been cancelled.
for(const cancelled of [false,true]){
 const {run:r}=setup();
 r(`state.calendar.date='2027-01-10';state.money=100000000;state.boardPlan.offer.wageLimit=100000000;
  for(const p of state.clubRosters[buyer])if(worldGroup(p)==='F')p.contractYears=1;
  globalThis.p=state.clubRosters[seller].find(p=>worldGroup(p)==='F'&&!playerLoan(p));p.contractYears=1;
  globalThis.need=aiSquadNeeds(buyer).find(n=>n.role==='forward');
  globalThis.salary=recruitPlayerWishes(p,buyer).salary*4;
  state.recruitment.ai[buyer].wageLimit-=calendarFutureRoom(buyer)-salary-1;
  aiSubmitMarket(buyer,p,need,'future',{fee:0,salary,years:2,role:'Nyckelspelare'});
  submitFutureOffer(p.id,recruitPlayerWishes(p).salary*2,2,'Nyckelspelare');
  globalThis.deal=state.recruitment.deals[0];`);
 assert.equal(r('calendarFutureRoom(buyer)'),1);
 assert.ok(r('deal.rival.aiOfferId'));
 if(cancelled)r('state.clubAI.offers[0].status="rejected"');
 r('calendarResolveFuture(deal)');
 assert.equal(r('p.futureContract.buyer'),cancelled?'HV71':r('buyer'));
 assert.equal(r('deal.status'),cancelled?'future_signed':'rejected');
}
console.log('PASS: current/future reservations, incoming bids, future contract activation and player competition, shared loan accounting and return, identity preservation, reload and stale-offer rejection.');
