const assert=require('node:assert/strict');const {boot}=require('./scripts/career-test-fixture.cjs');
function setup(){const a=boot();a.run(`startCareerWithClub('HV71');globalThis.club='Färjestad BK';state.loans.active=[];
 for(const q of state.clubRosters[club]){q.contractYears=3;q.promisedRole='Breddspelare';q.squadRole='Breddspelare';for(const k of Object.keys(q.attributes))q.attributes[k]=12;}
 state.recruitment.ai[club].cash=100000000;state.recruitment.ai[club].wageLimit=100000000;
 globalThis.p=state.playerWorld.freeAgents.find(q=>worldGroup(q)==='F');for(const k of Object.keys(p.attributes))p.attributes[k]=20;
 globalThis.terms={kind:'transfer',role:'Nyckelspelare',years:2,fee:0,salary:1000000};
 `);return a;}
{
 const a=setup(),r=a.run;r(`globalThis.fs=state.clubRosters[club].filter(q=>worldGroup(q)==='F');
 for(const q of fs.slice(0,12))q.promisedRole='Nyckelspelare';`);
 assert.match(r('aiRoleOfferIssue(club,p,terms)'),/Rollöftena ryms inte tillsammans/,'best candidate cannot bypass collective load');
 assert.equal(r("aiSubmitMarket(club,p,aiSquadNeeds(club)[0],'transfer',terms)"),false);
 assert.equal(r("transferRecruitPlayer(p,WORLD_FREE,club,0,1000000,2,'Nyckelspelare')"),false);
 r('save()');const reloaded=boot(a.storage.value);
 assert.match(reloaded.run(`aiRoleOfferIssue(${JSON.stringify(r('club'))},findPlayerAnywhere(${JSON.stringify(r('p.id'))}),{kind:'transfer',years:2,role:'Nyckelspelare'})`),/Rollöftena/);
 r("for(const q of fs.slice(0,3))q.promisedRole='Breddspelare'");
 assert.equal(r('aiRoleOfferIssue(club,p,terms)'),'');
 assert.equal(r("transferRecruitPlayer(p,WORLD_FREE,club,0,1000000,2,'Nyckelspelare')"),true);
 assert.equal(r('getPlayerClub(p.id)'),r('club'));
}
// Pending terms belong to the buyer's plan, not the player's old role at the seller.
{
 const {run:r}=setup();r(`for(const q of state.clubRosters[club])q.contractYears=1;
 globalThis.arrivals=state.clubRosters['Luleå Hockey'].filter(q=>worldGroup(q)==='F').slice(0,12);
 for(const q of arrivals){q.promisedRole='Breddspelare';state.clubAI.offers.push({playerId:q.id,buyer:club,status:'pending',kind:'future',years:2,role:'Nyckelspelare',salary:1000});}`);
 assert.equal(r("aiRoleBudget(club,p,{...terms,kind:'future'},true).used"),13*900);
 assert.match(r("aiRoleOfferIssue(club,p,{...terms,kind:'future'})"),/nästa säsong/);
 r("state.clubAI.offers[0].status='rejected'");
 assert.equal(r("aiRoleBudget(club,p,{...terms,kind:'future'},true).used"),12*900);
 assert.equal(r("aiRoleOfferIssue(club,p,{...terms,kind:'future'})"),'');
 r("state.clubAI.offers.push({playerId:p.id,buyer:club,status:'pending',kind:'future',years:2,role:'Nyckelspelare',salary:1000})");
 assert.equal(r("aiRoleBudget(club,p,{...terms,kind:'future'},true).used"),12*900,'own offer counts once');
}
// Keeper rotation has six planned starts; key plus regular fits, two keys do not.
{
 const {run:r}=setup();r(`globalThis.gs=state.clubRosters[club].filter(q=>q.pos==='MV');
 globalThis.g=gs[0];g.promisedRole='Nyckelspelare';globalThis.other=gs[1];other.promisedRole='Nyckelspelare';`);
 assert.equal(r("aiRoleBudget(club,g,{role:'Nyckelspelare'},false).used"),8);
 assert.match(r('aiClubView(club)'),/8 \/ 6 starter · Överbokat/);
 assert.equal(r("aiRoleBudget(club,null,{},false,'MV').used"),8);
 assert.match(r("aiRoleBudgetIssue(club,g,{kind:'transfer',role:'Nyckelspelare',years:1})"),/8 starter av 6/);
 r("other.promisedRole='Ordinarie'");
 assert.equal(r("aiRoleBudgetIssue(club,g,{kind:'transfer',role:'Nyckelspelare',years:1})"),'');
 r("delete other.promisedRole;other.squadRole='Ordinarie';other.happiness=56;for(let i=0;i<6;i++)aiAfterPlayerFixture(club,[],1,2)");
 assert.equal(r('other.aiRoleReview.unhappy'),true,'fallback squad role uses same two-start requirement in real follow-up');
}
// Internal contract decisions share the same aggregate constraint.
for(const action of ['renew','promote']){
 const {run:r}=setup();r(`globalThis.fs=state.clubRosters[club].filter(q=>worldGroup(q)==='F');
 for(const q of fs.slice(0,12))q.promisedRole='Nyckelspelare';
 globalThis.c=clubAIState(club);c.project='develop';globalThis.existing=fs[0];existing.age=21;
 globalThis.j=c.academy.roster.find(q=>worldGroup(q)==='F');`);
 if(action==='renew'){
  r('existing.contractYears=1;aiRenewContracts(club)');
  assert.equal(r('existing.contractYears'),1);assert.match(r('c.contractDecisions[existing.id].reason'),/Rollöftena/);
  r("for(const q of fs.slice(1,4))q.promisedRole='Breddspelare';state.calendar.date=calAdd(state.calendar.date,28);aiRenewContracts(club)");
  assert.equal(r('existing.contractYears'),4);
 }else{
  assert.equal(r("aiPromote(club,j,'Seniorchans')"),false);
  r("for(const q of fs.slice(1,4))q.promisedRole='Breddspelare'");
  assert.equal(r("aiPromote(club,j,'Seniorchans')"),true);
 }
}
console.log('PASS: aggregate minutes, pending buyer roles, future-only commitments, deduplication, real transfer, save reload and shared goalkeeper follow-up.');
