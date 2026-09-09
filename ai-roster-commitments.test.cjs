const assert=require('node:assert/strict');
const {boot}=require('./scripts/career-test-fixture.cjs');
function setup(){const app=boot();app.run(`startCareerWithClub('HV71');
 globalThis.buyer='Färjestad BK';globalThis.seller='Luleå Hockey';
 state.loans.active=[]; // Controlled permanent squad, without the database's initial loans.
 const roster=state.clubRosters[buyer];
 state.clubRosters[buyer]=Object.entries({MV:2,B:6,F:12}).flatMap(([group,count])=>roster.filter(p=>worldGroup(p)===group).slice(0,count));
 for(const p of roster.filter(p=>!state.clubRosters[buyer].includes(p)))worldRelease(p,buyer,'Test fixture');
 for(const p of state.clubRosters[buyer])p.contractYears=3;
 globalThis.p=state.playerWorld.freeAgents.find(p=>worldGroup(p)==='F');
 globalThis.arrivals=Object.values(state.clubRosters).flat().filter(p=>p.club!==buyer&&getPlayerClub(p.id)!==buyer&&worldGroup(p)==='F').slice(0,10);
 for(const q of arrivals)q.futureContract={buyer,seller:getPlayerClub(q.id),joinYear:state.season.year+1,salary:1000,years:2,role:'Truppspelare'};
 state.recruitment.ai[buyer].cash=1000000000;state.recruitment.ai[buyer].wageLimit=1000000000;
 `);return app;}
{
 const app=setup(),r=app.run;
 assert.equal(r('state.clubRosters[buyer].length'),20);
 assert.equal(r('aiCanCommit(buyer,p,0,1000,{years:1})'),true,'one-season cover does not take a next-season place');
 assert.equal(r('aiCanCommit(buyer,p,0,1000,{years:2})'),false,'multi-year purchase must include signed future arrivals');
 r('globalThis.cashBefore=state.recruitment.ai[buyer].cash;globalThis.oldClub=getPlayerClub(p.id)');
 assert.equal(r("transferRecruitPlayer(p,oldClub,buyer,0,1000,2,'Truppspelare')"),false,'actual transfer cannot bypass future capacity');
 assert.equal(r('getPlayerClub(p.id)'),r('oldClub'));assert.equal(r('state.recruitment.ai[buyer].cash'),r('cashBefore'));
 r('save()');const loaded=boot(app.storage.value);
 assert.equal(loaded.run(`aiCanCommit(${JSON.stringify(r('buyer'))},findPlayerAnywhere(${JSON.stringify(r('p.id'))}),0,1000,{years:2})`),false,'reload preserves obligations');
 r('delete arrivals[0].futureContract');
 assert.equal(r("transferRecruitPlayer(p,oldClub,buyer,0,1000,2,'Truppspelare')"),true,'available future place permits real transfer');
 assert.equal(r('getPlayerClub(p.id)'),r('buyer'));
}
// A pending current purchase also uses future space; an expired user-facing bid does not.
for(const source of ['market','incoming']){
 const {run:r}=setup();r(`globalThis.q=arrivals[0];delete q.futureContract;
 globalThis.offer={id:900,playerId:q.id,buyer,seller:getPlayerClub(q.id),kind:'transfer',years:2,fee:0,salary:1000,status:'pending',expires:state.recruitment.tick+3};
 ${source==='market'?'state.clubAI.offers':'state.recruitment.incoming'}.push(offer);`);
 assert.equal(r('aiCanCommit(buyer,p,0,1000,{future:true,years:2})'),false,source+' reserves next-season place');
 assert.equal(r('aiCanCommit(buyer,q,0,1000,{years:2})'),true,source+' own offer counts once');
 r(source==='market'?"offer.status='rejected'":"offer.expires=state.recruitment.tick-1");
 assert.equal(r('aiCanCommit(buyer,p,0,1000,{future:true,years:2})'),true,source+' releases place');
}
// Current offers reserve current capacity, future-only offers do not.
{
 const {run:r}=setup();r(`for(const q of arrivals){delete q.futureContract;state.clubRosters[getPlayerClub(q.id)]=state.clubRosters[getPlayerClub(q.id)].filter(x=>x!==q);state.clubRosters[buyer].push(q);q.club=buyer;}
 globalThis.q=state.clubRosters[buyer].pop();state.playerWorld.freeAgents.push(q);q.club=WORLD_FREE;
 globalThis.offer={id:901,playerId:q.id,buyer,kind:'loan',years:0,salary:1000,fee:0,status:'pending'};state.clubAI.offers.push(offer);`);
 assert.equal(r('aiCanCommit(buyer,p,0,1000,{years:1})'),false,'pending loan reserves last current place');
 assert.equal(r('aiCanCommit(buyer,q,0,1000,{years:1})'),true,'own pending arrival counts once');
 r("offer.kind='future'");
 assert.equal(r('aiCanCommit(buyer,p,0,1000,{years:1})'),true,'future arrival does not block one-season cover');
}
// Loan ownership, not the player's temporary team, determines next year's squad.
{
 const {run:r}=setup();r(`globalThis.q=arrivals[0];delete q.futureContract;q.contractYears=3;q.loanId=800;
 state.loans.active.push({id:800,playerId:q.id,owner:buyer,borrower:getPlayerClub(q.id),share:1});`);
 assert.equal(r('aiCanCommit(buyer,p,0,1000,{years:2})'),false,'own returning loan takes a future place');
 r(`const loan=state.loans.active[0];loan.owner=getPlayerClub(q.id);loan.borrower=buyer;
 state.clubRosters[loan.owner]=state.clubRosters[loan.owner].filter(x=>x!==q);state.clubRosters[buyer].push(q);q.club=buyer;`);
 assert.equal(r('aiCanCommit(buyer,p,0,1000,{years:2})'),true,'borrowed player does not take a permanent future place');
}
// The separate loan negotiation ledger reserves a place through a counteroffer.
{
 const {run:r}=setup();r(`for(const q of arrivals){delete q.futureContract;state.clubRosters[getPlayerClub(q.id)]=state.clubRosters[getPlayerClub(q.id)].filter(x=>x!==q);state.clubRosters[buyer].push(q);q.club=buyer;}
 globalThis.q=state.clubRosters[buyer].pop();state.playerWorld.freeAgents.push(q);q.club=WORLD_FREE;
 globalThis.offer={id:902,playerId:q.id,borrower:buyer,status:'counter',share:0};state.loans.offers.push(offer);`);
 assert.equal(r('aiCanCommit(buyer,p,0,1000,{years:1})'),false,'loan counteroffer retains reserved place');
 r("offer.status='rejected'");
 assert.equal(r('aiCanCommit(buyer,p,0,1000,{years:1})'),true,'rejected loan releases place');
}
console.log('PASS: current/future roster reservations, real transfer guard, one-season cover, no duplicate candidate, released bids and save reload.');
