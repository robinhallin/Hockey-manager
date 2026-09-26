'use strict';
const assert=require('node:assert/strict');
const {boot}=require('./scripts/career-test-fixture.cjs');

function setup(loan=false){
 const app=boot(),r=app.run;
 r(`startCareerWithClub('HV71');globalThis.owner=managerClub();globalThis.buyer='AIK';
 globalThis.p=managerRoster().filter(p=>p.pos==='MV')[2];
 p.age=${loan?20:28};p.salary=250000;p.contractYears=3;p.transferListed=false;p.loanListed=false;
 for(const k in p.attributes)p.attributes[k]=15;
 globalThis.vacancy=club=>{
  for(const g of [...state.clubRosters[club]].filter(p=>p.pos==='MV')){state.clubRosters[club]=state.clubRosters[club].filter(p=>p!==g);worldRelease(g,club,'Controlled vacancy');}
  state.recruitment.ai[club].cash=100000000;state.recruitment.ai[club].wageLimit=100000000;
  clubAIState(club).scouting[p.id]={visits:3,date:state.calendar.date,snapshot:{...p.attributes}};
 };vacancy(buyer);
 globalThis.offerTo=club=>{clubAIState(club).lastMarket=null;aiScoutClub(club,[{...p,team:owner}]);return state.recruitment.incoming.find(o=>o.buyer===club&&samePlayerId(o.playerId,p.id)&&o.status==='pending');};
 globalThis.nextDay=()=>{state.calendar.date=calAdd(state.calendar.date,1);calendarMarketDay();};
 globalThis.cash=state.money,bank=state.recruitment.ai[buyer].cash;
 globalThis.o=offerTo(buyer);`);
 assert.ok(r('o'),'actual candidate search produces an incoming offer');
 return app;
}

// Same coverage facts feed UI and AI. A quality judgement does not remove a goalie.
{
 const a=boot(),r=a.run;r(`startCareerWithClub('HV71');for(const p of managerRoster().filter(p=>p.pos==='MV')){for(const k in p.attributes)p.attributes[k]=15;p.contractYears=3;}`);
 assert.equal(r("recruitmentNeeds().find(n=>n.name==='Målvakt').need"),0);
 assert.equal(r("aiSquadNeeds(managerClub()).find(n=>n.role==='goalie').missing"),0);
 assert.match(r("recruitmentNeeds().find(n=>n.name==='Målvakt').reasons.join(' ')"),/utlåning/);
 r(`for(const p of managerRoster().filter(p=>p.pos==='MV'))p.contractYears=1;`);
 assert.equal(r("recruitmentNeeds().find(n=>n.name==='Målvakt').futureNeed"),2);
 assert.equal(r("aiSquadNeeds(managerClub()).find(n=>n.role==='goalie').futureNeed"),2);
 assert.ok(r('managerRoster().every(p=>marketCandidates().some(q=>samePlayerId(q.id,p.id)&&q.team===managerClub()))'));
 assert.ok(r('marketCandidates().some(p=>p.team===managerClub()&&!isOwnPlayer(p))'));
}

// An unsolicited loan needs explicit approval, survives reload and returns exactly once.
{
 const a=setup(true),r=a.run;
 assert.equal(r('o.kind'),'loan');assert.equal(r('getPlayerClub(p.id)'),'HV71');
 r('nextDay()');assert.equal(r('getPlayerClub(p.id)'),'HV71','time alone never accepts a sale or loan');
 r('counterIncomingOffer(o.id,.75,56,"starter","day28");save()');
 const b=boot(a.storage.value),q=b.run;
 assert.equal(q('state.recruitment.incoming[0].stage'),'counter_wait');
 assert.equal(q('state.recruitment.incoming[0].share'),.75);
 r('nextDay();nextDay()');assert.equal(r('o.stage'),'offer');assert.equal(r('o.share'),.75);
 r('globalThis.wage=annualWageCost();answerIncomingOffer(o.id,true)');
 assert.equal(r('o.stage'),'club_agreed');assert.equal(r('getPlayerClub(p.id)'),'HV71');
 r('nextDay();globalThis.l=playerLoan(p);');assert.equal(r('o.status'),'accepted');
 assert.equal(r('l.owner'),'HV71');assert.equal(r('getPlayerClub(p.id)'),r('buyer'));
 assert.equal(r('annualWageCost()'),r('wage-p.salary*l.share'));
 assert.equal(r('state.money'),r('cash'),'loans do not invent transfer fees');
 r(`loansAfterFixture({home:buyer,away:owner,round:88,date:state.calendar.date},[{club:buyer,id:p.id,seconds:3600,saves:27,against:2}]);save()`);
 assert.equal(r('l.games'),1);assert.equal(r('l.seconds'),3600);
 const loaded=boot(a.storage.value);assert.equal(loaded.run('state.loans.active.find(l=>l.id==='+r('l.id')+').seconds'),3600);
 r('state.calendar.date=l.until;loansDay();loansDay()');
 assert.equal(r('getPlayerClub(p.id)'),'HV71');assert.equal(r('annualWageCost()'),r('wage'));
 assert.equal(r('state.loans.history.filter(x=>x.id===l.id).length'),1);
 assert.doesNotThrow(()=>r('validateSaveText(saveExportText())'));
}

// Unlisted established player, a real counter response, two buyers, single settlement.
{
 const a=setup(),r=a.run;
 assert.equal(r('p.transferListed'),false);assert.equal(r('o.kind'),'transfer');
 r('counterIncomingOffer(o.id,Math.round(o.fee*1.1));nextDay();nextDay()');
 assert.equal(r('o.stage'),'offer');assert.ok(r('o.log.some(x=>x.action==="response")'));
 r(`globalThis.other='Mora IK';vacancy(other);globalThis.second=offerTo(other);answerIncomingOffer(o.id,true);answerIncomingOffer(second.id,true);save()`);
 const b=boot(a.storage.value),q=b.run;
 assert.equal(q('state.recruitment.incoming.filter(o=>o.stage==="club_agreed").length'),2);
 q('state.calendar.date=calAdd(state.calendar.date,1);incomingDay();incomingDay()');
 assert.equal(q('state.recruitment.incoming.filter(o=>o.status==="accepted").length'),1);
 assert.equal(q('state.recruitment.incoming.filter(o=>o.status==="lost").length'),1);
 const winner=q('state.recruitment.incoming.find(o=>o.status==="accepted")');
 assert.equal(q('state.money'),r('cash')+winner.fee);
 assert.equal(q(`state.recruitment.ai[${JSON.stringify(winner.buyer)}].cash`),100000000-winner.fee);
 assert.equal(q(`Object.values(state.clubRosters).flat().filter(p=>samePlayerId(p.id,${JSON.stringify(r('p.id'))})).length`),1);
 assert.equal(q('state.recruitment.history.filter(h=>h.playerId==='+JSON.stringify(r('p.id'))+').length'),1);
}

// Player refusal and a bank shortfall leave both rosters and both accounts untouched.
for(const cause of ['player','cash']){
 const {run:r}=setup();r('answerIncomingOffer(o.id,true)');
 r(cause==='player'?'p.salary=10000000':'state.recruitment.ai[buyer].cash=0');
 r('globalThis.beforeBuyer=state.recruitment.ai[buyer].cash;nextDay()');
 assert.equal(r('o.status'),'rejected',cause);assert.equal(r('getPlayerClub(p.id)'),'HV71');
 assert.equal(r('state.money'),r('cash'));assert.equal(r('state.recruitment.ai[buyer].cash'),r('beforeBuyer'));
 assert.match(r('o.reason'),cause==='player'?/Spelaren tackar nej/:/finansiering/);
}

// Rejection is not a moral penalty or a reason to send an identical offer tomorrow.
{
 const {run:r}=setup();r('globalThis.morale=p.morale;answerIncomingOffer(o.id,false);nextDay();offerTo(buyer)');
 assert.equal(r('p.morale'),r('morale'));assert.equal(r('state.recruitment.incoming.length'),1);
}

// No lower-level or legacy AI path may bypass the manager's approval.
for(const loan of [false,true]){
 const {run:r}=setup(loan);
 assert.equal(r(loan?'loanCompleteOffer({playerId:p.id,owner,borrower:buyer,days:o.days,share:o.share,role:o.loanRole,recall:o.recall})':'transferRecruitPlayer(p,owner,buyer,o.fee,o.salary,o.years,o.role)'),false);
 assert.equal(r('getPlayerClub(p.id)'),'HV71');assert.equal(r('state.money'),r('cash'));
 r(`globalThis.old={...o,id:state.clubAI.nextOffer++,due:state.calendar.date};delete old.stage;delete old.expiresDate;
 state.recruitment.incoming=[];state.clubAI.offers.push(old);aiResolveMarket();o=state.recruitment.incoming[0];`);
 assert.equal(r('old.status'),'cancelled');assert.equal(r('o.stage'),'offer');assert.equal(r('getPlayerClub(p.id)'),'HV71');
 assert.doesNotThrow(()=>r('validateSaveText(saveExportText())'));
 r('o.stage="club_agreed";o.dueDate=calAdd(state.calendar.date,1);o.approved=false');
 assert.throws(()=>r('validateSaveText(saveExportText())'),/godkännande/);
}

// Closing an old competing offer must also produce a valid, reloadable record.
{
 const {run:r}=setup();r('delete o.stage;delete o.expiresDate;marketCloseCompeting(p.id,"transfer")');
 assert.equal(r('o.status'),'lost');assert.doesNotThrow(()=>r('validateSaveText(saveExportText())'));
}

// Contracted adult junior can attract a bid and move only after the same approval path.
{
 const {run:r}=setup();r(`answerIncomingOffer(o.id,false);globalThis.j=state.juniors.roster.find(p=>p.pos==='MV')||state.juniors.roster[0];
 j.age=19;j.pos='MV';j.contractYears=3;j.academy.seniorContract=false;j.salary=250000;j.attributes={...p.attributes};p=j;vacancy(buyer);
 p.loanListed=false;globalThis.need=aiSquadNeeds(buyer).find(n=>n.role==='goalie'),w=recruitPlayerWishes(p,buyer);
 aiSubmitMarket(buyer,p,need,'transfer',{fee:recruitFee(p),salary:w.salary*2,years:3,role:'Nyckelspelare'});o=state.recruitment.incoming[0];answerIncomingOffer(o.id,true);nextDay();`);
 assert.equal(r('o.status'),'accepted');assert.equal(r('getPlayerClub(j.id)'),r('buyer'));
 assert.equal(r('state.juniors.roster.some(p=>samePlayerId(p.id,j.id))'),false);
}

// Criteria-based scouting keeps the brief, actual observations and cost uncertainty.
{
 const a=boot(),r=a.run;r(`startCareerWithClub('HV71');scoutingBrief('Defensiv back','Tredje backparet',1200000,30,'now',scoutingPerson(scoutingStaff()[0]));scoutingStart();globalThis.j=scoutingOffice().jobs[0];save()`);
 assert.equal(r('j.criteria.maxSalary'),1200000);assert.equal(r('j.criteria.placement'),'Tredje backparet');
 const b=boot(a.storage.value);assert.equal(b.run('scoutingOffice().jobs[0].criteria.maxSalary'),1200000);
 r('state.calendar.date=j.next;scoutingDay()');assert.ok(r('j.players.some(id=>state.scoutReports[id]?.visits>0)'));
 assert.match(r('scoutingBriefResult(findPlayerAnywhere(j.players[0]))'),/Tredje backparet/);
}

// Official ordinary-loan boundary; saved older/seed loans retain their original terms.
{
 const {run:r}=setup(true);r('state.calendar.date="2027-02-01"');
 assert.equal(r('loanRegistrationTerms(p,owner,buyer,56).until'),'2027-02-15');
 r('state.calendar.date="2027-02-15"');assert.ok(r('loanRegistrationTerms(p,owner,buyer,28).reason'));
}
// Real scouting interest can become visible before an offer and multi-club interest creates a transfer race.
run("globalThis.storyPlayer=managerRoster().find(p=>p.pos!=='MV');globalThis.need={role:'forward',reason:'Testbehov'};globalThis.storyClub=Object.keys(state.clubAI.clubs).find(c=>c!==managerClub());marketInterest(storyClub,storyPlayer,need,'transfer');clubAIState(storyClub).scouting[storyPlayer.id]={visits:2,date:state.calendar.date,snapshot:{...storyPlayer.attributes}};marketInterest(storyClub,storyPlayer,need,'transfer');globalThis.secondClub=Object.keys(state.clubAI.clubs).find(c=>c!==managerClub()&&c!==storyClub);marketInterest(secondClub,storyPlayer,need,'transfer');marketCompetitionSignals()");
assert.ok(run('clubAIState(storyClub).interests[String(storyPlayer.id)].noticeStage'));assert.ok(run('storyPlayer.marketCompetition.clubs.length')>=2);
console.log('PASS: shared needs, complete AI search, unsolicited loan/purchase, counters, player refusal, finances, competing offers, academy player, saved cases, loan performance/return, scouting briefs and registration boundary.');
