const assert=require('node:assert/strict');
const {boot}=require('./scripts/career-test-fixture.cjs');
function setup(){const a=boot();a.run(`startCareerWithClub('HV71');globalThis.club='Färjestad BK';globalThis.c=clubAIState(club);
 state.loans.active=[];state.recruitment.ai[club].cash=100000000;state.recruitment.ai[club].wageLimit=100000000;
 for(const p of state.clubRosters[club])p.contractYears=3;
 globalThis.p=state.clubRosters[club].find(p=>p.pos==='MV');p.contractYears=1;p.age=28;
 globalThis.q=state.clubRosters['Luleå Hockey'].find(p=>p.pos==='MV');
 globalThis.offer={id:900,playerId:q.id,buyer:club,kind:'future',salary:1000,years:2,status:'pending'};
 `);return a;}
// Wait for a contracted replacement; reconsider after a failed negotiation and cooldown.
{
 const a=setup(),r=a.run;r('state.clubAI.offers.push(offer);aiRenewContracts(club)');
 assert.equal(r('p.contractYears'),1);
 assert.match(r('c.contractDecisions[p.id].reason'),/Efterträdare/);
 assert.ok(r('c.decisions.some(d=>d.text.includes(p.name)&&d.text.includes("avvaktar"))')||r('c.decisions.some(d=>d.text.includes(p.name)&&d.text.includes("Avvaktar"))'));
 const count=r('c.decisions.length');r('aiRenewContracts(club)');assert.equal(r('c.decisions.length'),count,'no duplicate explanation on repeated review');
 r('save()');const loaded=boot(a.storage.value);
 assert.equal(loaded.run(`clubAIState(${JSON.stringify(r('club'))}).contractDecisions[${JSON.stringify(r('p.id'))}].reason`),r('c.contractDecisions[p.id].reason'));
 r("offer.status='rejected';state.calendar.date=calAdd(state.calendar.date,28);aiRenewContracts(club)");
 assert.equal(r('p.contractYears'),3,'two additional years when the replacement falls through');
}
// A one-year contract remaining after the year boundary still secures this season.
{
 const {run:r}=setup();r(`p.contractYears=0;for(const g of state.clubRosters[club].filter(x=>x.pos==='MV'&&x!==p))g.contractYears=1;
 state.clubRosters['Luleå Hockey']=state.clubRosters['Luleå Hockey'].filter(x=>x!==q);q.club=club;q.contractYears=1;state.clubRosters[club].push(q);
 aiRenewContracts(club,true);`);
 assert.equal(r('state.clubRosters[club].some(x=>x.id===p.id)'),false,'two secured goalkeepers make an expired third unnecessary');
 assert.equal(r('state.playerWorld.freeAgents.some(x=>x.id===p.id)'),true,'released player retains identity');
}
// A promotion may fit today's wages but must also fit the committed future payroll.
{
 const a=setup(),r=a.run;r(`for(const x of state.clubRosters[club])x.contractYears=1;
 globalThis.j=c.academy.roster.find(x=>x.pos==='B');j.academy.seniorContract=false;
 q.futureContract={buyer:club,seller:'Luleå Hockey',salary:100000000,years:2,joinYear:state.season.year+1};
 globalThis.before=JSON.stringify([j,state.clubRosters[club],state.recruitment.ai[club]]);`);
 assert.equal(r("aiPromote(club,j,'Redo för seniorhockey')"),false);
 assert.equal(r('JSON.stringify([j,state.clubRosters[club],state.recruitment.ai[club]])'),r('before'),'blocked promotion changes no contract or roster');
 r('delete q.futureContract');assert.equal(r("aiPromote(club,j,'Redo för seniorhockey')"),true);
 assert.equal(r('c.academy.roster.includes(j)'),false);assert.equal(r('state.clubRosters[club].filter(x=>x.id===j.id).length'),1);
 assert.ok(r('j.contractYears')>=2);r('save()');const loaded=boot(a.storage.value);
 assert.equal(loaded.run(`state.clubRosters[${JSON.stringify(r('club'))}].filter(x=>x.id===${JSON.stringify(r('j.id'))}).length`),1);
}
// Already paid senior academy contracts are not charged a second time on promotion.
{
 const {run:r}=setup();r(`globalThis.j=c.academy.roster.find(x=>x.pos==='B');j.academy.seniorContract=true;j.contractYears=3;
 state.recruitment.ai[club].wageLimit=loanWageCost(club);globalThis.wages=loanWageCost(club);`);
 assert.equal(r("aiPromote(club,j,'Seniorchans')"),true);
 assert.equal(r('loanWageCost(club)'),r('wages'));
}
// Internal moves cannot promise the last future place twice.
for(const action of ['promote','renew']){
 const {run:r}=setup();r(`for(const x of state.clubRosters[club])x.contractYears=3;
 while(state.clubRosters[club].length<${action==='promote'?29:30})state.clubRosters[club].push(worldProspect(club,'VF'));
 for(const x of state.clubRosters[club])x.contractYears=3;
 globalThis.j=c.academy.roster.find(x=>x.pos==='VF');state.clubAI.offers.push(offer);
 p.contractYears=1;p.age=21;c.project='develop';`);
 if(action==='promote'){
  r('p.contractYears=3');assert.equal(r("aiPromote(club,j,'Seniorchans')"),false);
  r("offer.status='rejected'");assert.equal(r("aiPromote(club,j,'Seniorchans')"),true);
 }else{
  r('aiRenewContracts(club)');assert.equal(r('p.contractYears'),1);
  assert.match(r('c.contractDecisions[p.id].reason'),/platser/);
  r("offer.status='rejected';state.calendar.date=calAdd(state.calendar.date,28);aiRenewContracts(club)");
  assert.equal(r('p.contractYears'),4);
 }
}
// Exercise the actual year-boundary pipeline, without pretending these are played seasons.
{
 let app=boot();app.run("startCareerWithClub('HV71')");
 for(let year=0;year<3;year++){
  app.run(`for(const p of managerRoster())p.contractYears=5;
   state.season.phase='review';state.season.boardResult=[];beginPreseason();`);
  assert.equal(app.run(`Object.entries(state.clubRosters).filter(([club])=>club!==managerClub()).every(([,roster])=>
   roster.length<=30&&roster.every(p=>p.contractYears>0)&&Object.entries({MV:2,B:6,F:12}).every(([group,n])=>roster.filter(p=>worldGroup(p)===group).length>=n))`),true,'playable AI squads after real year transition');
  app.run('save()');const before=app.run('JSON.stringify(state.clubAI)');app=boot(app.storage.value);
  assert.equal(app.run('JSON.stringify(state.clubAI)'),before,'year-boundary decisions persist');
 }
}
console.log('PASS: replacement-aware renewal, cooldown and saved explanation, post-decrement contracts, future promotion wages, actual roster moves and existing salary credit.');
