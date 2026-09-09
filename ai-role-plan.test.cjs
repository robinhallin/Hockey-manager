const assert=require('node:assert/strict');const {boot}=require('./scripts/career-test-fixture.cjs');
function setup(){const app=boot();app.run(`startCareerWithClub('HV71');globalThis.club='Färjestad BK';
 state.recruitment.ai[club].cash=100000000;state.recruitment.ai[club].wageLimit=100000000;state.loans.active=[];
 globalThis.p=state.playerWorld.freeAgents.find(p=>worldGroup(p)==='F');
 for(const k of Object.keys(p.attributes))p.attributes[k]=10;
 for(const q of state.clubRosters[club]){q.contractYears=3;for(const k of Object.keys(q.attributes))q.attributes[k]=18;}
 globalThis.need=aiSquadNeeds(club).find(n=>n.role==='forward');
 globalThis.terms={salary:1000000,fee:0,years:2,role:'Nyckelspelare'};`);return app;}
{
 const a=setup(),r=a.run;
 assert.match(r("aiRoleOfferIssue(club,p,{...terms,kind:'transfer'})"),/bedömd plats/);
 assert.equal(r("aiSubmitMarket(club,p,need,'transfer',terms)"),false);
 assert.equal(r('state.clubAI.offers.length'),0,'no offer or wage reservation for an implausible promise');
 assert.equal(r("transferRecruitPlayer(p,WORLD_FREE,club,0,1000000,2,'Nyckelspelare')"),false,'actual signing uses the same gate');
 r(`for(const q of state.clubRosters[club])q.health.injury={remaining:40};`);
 assert.match(r("aiRoleOfferIssue(club,p,{...terms,kind:'transfer'})"),/bedömd plats/,'injuries do not erase competition');
 r('save()');const restored=boot(a.storage.value);
 assert.match(restored.run(`aiRoleOfferIssue(${JSON.stringify(r('club'))},findPlayerAnywhere(${JSON.stringify(r('p.id'))}),{kind:'transfer',years:2,role:'Nyckelspelare'})`),/bedömd plats/);
 r('for(const k of Object.keys(p.attributes))p.attributes[k]=20');
 assert.equal(r("aiRoleOfferIssue(club,p,{...terms,kind:'transfer'})"),'','a stronger recruit can credibly compete for a key role');
 assert.equal(r("aiSubmitMarket(club,p,need,'transfer',terms)"),true);
 assert.equal(r('state.clubAI.offers[0].role'),'Nyckelspelare');
 assert.equal(r("transferRecruitPlayer(p,WORLD_FREE,club,0,1000000,2,'Nyckelspelare')"),true);
 assert.equal(r('getPlayerClub(p.id)'),r('club'));
 r('for(let i=0;i<30;i++)aiAfterPlayerFixture(club,[],1,2)');
 assert.equal(r('p.aiRoleReview.unhappy'),true,'a feasible promise still has consequences when actual playing time is withheld');
}
// Future arrivals matter; expiring players do not occupy next season's depth chart.
{
 const {run:r}=setup();r('for(const q of state.clubRosters[club])q.contractYears=1');
 assert.equal(r("aiRoleOfferIssue(club,p,{...terms,kind:'future'})"),'');
 r(`globalThis.arrivals=state.clubRosters['Luleå Hockey'].filter(q=>worldGroup(q)==='F').slice(0,7);
 for(const q of arrivals){for(const k of Object.keys(q.attributes))q.attributes[k]=19;
 state.clubAI.offers.push({playerId:q.id,buyer:club,status:'pending',kind:'future',years:2,salary:1000});}`);
 assert.match(r("aiRoleOfferIssue(club,p,{...terms,kind:'future'})"),/nästa säsong/);
 r("p.contractYears=1");
 assert.match(r("aiValidateOffer({...terms,kind:'future',playerId:p.id,seller:WORLD_FREE,buyer:club,needRole:'forward'})"),/Rollen/);
 r("for(const o of state.clubAI.offers)o.status='rejected'");
 assert.equal(r("aiRoleOfferIssue(club,p,{...terms,kind:'future'})"),'');
}
// Own pending offer never competes against its candidate. Loan roles keep their existing model.
{
 const {run:r}=setup();r('for(const k of Object.keys(p.attributes))p.attributes[k]=20');
 r("state.clubAI.offers.push({playerId:p.id,buyer:club,status:'pending',kind:'transfer',years:2})");
 assert.equal(r("aiRoleOfferIssue(club,p,{...terms,kind:'transfer'})"),'');
 assert.equal(r("aiRoleOfferIssue(club,p,{kind:'loan',role:'starter'})"),'');
}
// The manager receives the actual role explanation when a buyer withdraws at acceptance.
{
 const {run:r}=setup();r(`globalThis.own=managerRoster().find(q=>worldGroup(q)==='F'&&!playerLoan(q));
 for(const k of Object.keys(own.attributes))own.attributes[k]=10;
 globalThis.o={id:999,playerId:own.id,buyer:club,...terms,status:'pending',expires:state.recruitment.tick+3};
 state.recruitment.incoming.push(o);globalThis.cash=state.money;answerIncomingOffer(999,true);`);
 assert.equal(r('o.status'),'expired');assert.match(r('o.reason'),/Rollen/);
 assert.match(r('state.recruitment.message'),/drar tillbaka budet/);
 assert.equal(r('getPlayerClub(own.id)'),'HV71');assert.equal(r('state.money'),r('cash'));
}
console.log('PASS: role feasibility, actual submission/signing, injury return, future arrivals, cancelled bids, candidate deduplication, stronger recruits and save reload.');
