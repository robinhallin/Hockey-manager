'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {boot}=require('./scripts/career-test-fixture.cjs');

function counter({paid=false,daily=false}={}){
 const app=boot(null,{production:daily}),r=app.run;
 r(`startCareerWithClub('HV71');${daily?'':'state.money=1e9;state.boardPlan.offer.wageLimit=1e9;'}
  globalThis.p=${paid?'state.clubRosters[RECRUIT_CLUBS[0][0]][5]':"state.playerWorld.freeAgents.find(p=>p.name==='Daniel Brodin')"};
  ${paid?'p.transferListed=true;':''}globalThis.w=recruitPlayerWishes(p);globalThis.cash=state.money;
  submitRecruitOffer(p.id,recruitFee(p),Math.round(w.salary*.8),Math.min(2,w.maxYears),w.role);
  globalThis.d=state.recruitment.deals[0];`);
 assert.equal(r('d.status'),'pending');
 r(daily?'calendarStep(true);calendarStep(true)':'state.calendar.date=d.dueDate;resolveRecruitDeal(d)');
 assert.ok(r('d.counter'),'ordinary offer must produce a real counter');
 return app;
}
function finances(html){return Object.fromEntries([...html.matchAll(/data-finance="([^"]+)" data-value="([^"]+)"/g)].map(([,k,v])=>[k,Number(v)]));}
function json(app,code){return JSON.parse(app.run(`JSON.stringify(${code})`));}

test('active affairs exposes counter differences, revision and separate proposal finances',()=>{
 const a=counter(),r=a.run,html=r('hubDealDetail(hubAffairRows().find(row=>row.d===d))');
 assert.match(html,/Ändrat sedan ditt senaste bud/);assert.match(html,/Årslön/);
 assert.match(html,/reviseRecruitCounter\(/);assert.match(html,/Acceptera motbud/);
 assert.match(html,/Ditt reviderade förslag/);assert.match(html,/Motbudets ekonomi/);
 assert.equal(r('recruitHub.drawer'),null);assert.equal(r('recruitHub.deal'),r("'transfer:'+d.id"));
 assert.equal(r('state.money'),r('cash'));assert.equal(r('managerRecruitmentBudget().salaryReserved'),r('d.salary'));
 assert.equal(r("hubDealStatus({key:'loan:1',status:'pending',d:{negotiationRounds:1}})"),'Inväntar besked');
 r('cancelRecruitOffer(d.id)');
 assert.equal(r('managerRecruitmentBudget().salaryReserved'),0);
 assert.equal(r('d.counter'),undefined);
 assert.equal(r('hubDealStatus(hubAffairRows().find(row=>row.d===d))'),'Återkallad');
 assert.doesNotMatch(r('hubDealDetail(hubAffairRows().find(row=>row.d===d))'),/acceptRecruitCounter|reviseRecruitCounter/);
});

test('accepted revised terms survive real calendar days, export and reload without a second wage decision',()=>{
 const a=counter({daily:true}),r=a.run;
 assert.equal(r('reviseRecruitCounter(d.id,Math.round(w.salary*.98),d.years,d.role)'),true);
 assert.equal(r('d.status'),'pending');assert.ok(r('d.salary<w.salary'),'reproduces the previously rejected accepted salary');
 assert.equal(r('state.money'),r('cash'),'agreement reserves money without payment');
 assert.equal(r('acceptRecruitCounter(d.id)'),false,'duplicate acceptance is inert');
 const deal=json(a,'d'),id=r('p.id');
 r('resolveRecruitDeal(d)');assert.equal(r('getPlayerClub(p.id)'),r('WORLD_FREE'),'registration waits until tomorrow');
 assert.doesNotThrow(()=>r('validateSaveText(saveExportText())'));r('save()');
 const b=boot(a.storage.value,{production:true}),s=b.run;
 assert.deepEqual(json(b,'state.recruitment.deals[0].agreement'),deal.agreement);
 s(`globalThis.d=state.recruitment.deals[0];globalThis.p=findPlayerAnywhere(${JSON.stringify(id)});calendarStep(true)`);
 assert.equal(s('d.status'),'signed');assert.equal(s('getPlayerClub(p.id)'),'HV71');
 assert.match(s('state.recruitment.message'),/är klar/);assert.doesNotMatch(s('state.recruitment.message'),/i morgon/);
 assert.equal(s('p.salary'),deal.salary);assert.equal(s('p.contractYears'),deal.years);assert.equal(s('p.promisedRole'),deal.role);
 assert.equal(s('managerRoster().filter(q=>samePlayerId(q.id,p.id)).length'),1);
 assert.equal(s('state.recruitment.history.filter(h=>samePlayerId(h.playerId,p.id)&&h.buyer===managerClub()).length'),1);
 const after=s('state.money');s('resolveRecruitDeal(d);acceptRecruitCounter(d.id)');assert.equal(s('state.money'),after);
 assert.doesNotThrow(()=>s('validateSaveText(saveExportText())'));
});

test('accepting an agent compromise registers its exact package and books a paid transfer once',()=>{
 const a=counter({paid:true}),r=a.run;
 r('globalThis.sellerCash=state.recruitment.ai[d.seller].cash;reviseRecruitCounter(d.id,Math.round(w.salary*.7),d.years,d.role)');
 assert.ok(r('d.counter'));assert.ok(r('d.counter.salary<w.salary'));
 const terms=json(a,'recruitDealTerms(d.counter)');
 r('acceptRecruitCounter(d.id)');assert.deepEqual(json(a,'d.agreement.terms'),terms);
 assert.equal(r('state.money'),r('cash'));
 // Changed asking price/wishes after agreement must not reopen accepted terms.
 r('p.askingPrice=d.fee*3;p.salary=w.salary*3;state.calendar.date=d.dueDate;resolveRecruitDeal(d)');
 assert.equal(r('d.status'),'signed');assert.equal(r('state.money'),r('cash-d.fee'));
 assert.equal(r('state.recruitment.ai[d.seller].cash'),r('sellerCash+d.fee'));
 assert.equal(r('p.salary'),terms.salary);assert.equal(r('p.contractYears'),terms.years);assert.equal(r('p.promisedRole'),terms.role);
 assert.equal(r('Object.values(state.clubRosters).flat().filter(q=>samePlayerId(q.id,p.id)).length'),1);
 r('resolveRecruitDeal(d)');assert.equal(r('state.money'),r('cash-d.fee'));
});

test('changed funding, availability, club or terms still block registration with a reason and no payment',()=>{
 for(const [change,reason] of [
  ['state.boardPlan.offer.wageLimit=annualWageCost()',/årets kassa eller lönebudget/],
  ["state.clubRosters['AIK'][0].futureContract={buyer:managerClub(),salary:1e9,years:2,joinYear:state.season.year+1,role:'Rotation'}",/Nästa säsongs löneutrymme/],
  ["state.playerWorld.freeAgents=state.playerWorld.freeAgents.filter(q=>q!==p);state.clubRosters['Luleå Hockey'].push(p)",/redan lämnat/],
  ["p.futureContract={buyer:'Luleå Hockey',joinYear:state.season.year+1}",/kontrakts- eller lånesituation/],
  ["d.buyer='Luleå Hockey'",/tidigare klubb/],
  ['d.salary++',/Villkoren har ändrats/],
  ["d.dueDate=(state.season.year+1)+'-02-16'",/transferfönstrets stängning/]
 ]){
  const a=counter(),r=a.run;r('acceptRecruitCounter(d.id);'+change+';state.calendar.date=d.dueDate;resolveRecruitDeal(d)');
  assert.equal(r('d.status'),'rejected',change);assert.match(r('d.reason'),reason,change);
  assert.equal(r('state.money'),r('cash'),change);assert.equal(r('managerRoster().some(q=>samePlayerId(q.id,p.id))'),false,change);
  assert.equal(r('managerRecruitmentBudget().salaryReserved'),0,change);
 }
});

test('counter deadline includes the displayed last day; expired and exhausted counters persist closed',()=>{
 const a=counter(),r=a.run;r('state.calendar.date=d.dueDate;resolveRecruitDeal(d)');
 assert.ok(r('d.counter'));assert.equal(r('acceptRecruitCounter(d.id)'),true);
 const b=counter(),s=b.run;s('state.calendar.date=calAdd(d.dueDate,1)');
 assert.equal(s('acceptRecruitCounter(d.id)'),false);assert.equal(s('d.status'),'rejected');assert.equal(s('d.counter'),undefined);
 assert.match(s('state.recruitment.message'),/löpte ut/);
 assert.equal(boot(b.storage.value).run('state.recruitment.deals[0].status'),'rejected');
 const c=counter(),t=c.run;t('reviseRecruitCounter(d.id,1,d.years,d.role);reviseRecruitCounter(d.id,1,d.years,d.role)');
 assert.match(t('hubRecruitCounter(d)'),/sista motbud/);assert.doesNotMatch(t('hubRecruitCounter(d)'),/rh-counter-editor/);
 t('reviseRecruitCounter(d.id,1,d.years,d.role)');
 assert.equal(t('d.status'),'rejected');assert.equal(t('d.counter'),undefined);
 assert.equal(boot(c.storage.value).run('state.recruitment.deals[0].status'),'rejected','last-round rejection is saved');
});

test('invalid revision, unfinished match and unaffordable counter never alter the agreement or charge money',()=>{
 const a=counter(),r=a.run,before=json(a,'d');
 for(const args of ["'bad',2,d.role","0,2,d.role","d.salary,2.5,d.role","d.salary,2,'Bogus'"]){
  assert.equal(r(`reviseRecruitCounter(d.id,${args})`),false);assert.deepEqual(json(a,'d'),before);
 }
 r('state.boardPlan.offer.wageLimit=annualWageCost()');assert.equal(r('acceptRecruitCounter(d.id)'),false);
 assert.match(r('state.recruitment.message'),/lönebudget/);assert.deepEqual(json(a,'d'),before);
 r('state.boardPlan.offer.wageLimit=1e9;state.calendar.date=calendarTarget();createMatch()');
 assert.equal(r('acceptRecruitCounter(d.id)'),false);assert.equal(r('reviseRecruitCounter(d.id,d.salary,d.years,d.role)'),false);
 assert.match(r('state.recruitment.message'),/Avsluta matchen/);assert.deepEqual(json(a,'d'),before);
 assert.equal(r('state.money'),r('cash'));
});

test('legacy accepted counters still register; new agreement snapshots reject mismatched import terms',()=>{
 const a=counter(),r=a.run;r('reviseRecruitCounter(d.id,Math.round(w.salary*.98),d.years,d.role)');
 r('globalThis.originalSalary=d.salary;d.salary++');
 assert.throws(()=>r('validateSaveText(saveExportText())'),/accepterat köpbud/);
 r('d.salary=originalSalary;delete d.agreement;delete d.buyer;save()');
 const b=boot(a.storage.value),s=b.run;s('globalThis.d=state.recruitment.deals[0];state.calendar.date=d.dueDate;resolveRecruitDeal(d)');
 assert.equal(s('d.status'),'signed');assert.equal(s('findPlayerAnywhere(d.playerId).salary'),r('originalSalary'));
});

test('live forecast uses actual draft values, other reservations and the same decision budgets once',()=>{
 const a=counter({paid:true}),r=a.run;
 r(`globalThis.other=state.playerWorld.freeAgents.find(q=>q!==p);submitRecruitOffer(other.id,0,500000,2,'Rotation');
  state.transferNegotiation={playerId:p.id,transferFee:2000000,salaryDemand:1234567};`);
 const initial=finances(r('hubTransferForm(p)'));
 assert.equal(initial.total,2000000+1234567*3);assert.equal(initial.cashAfter,r('state.money-2000000'));assert.equal(initial.wageAfter,r('wageBudget()-annualWageCost()-500000-1234567'));
 const before=r('JSON.stringify(state)');
 r(`globalThis.output={innerHTML:''};globalThis.form={dataset:{recruitPlayer:p.id,forecastTitle:'Ditt reviderade förslag'},
  elements:{fee:{value:'2000000'},salary:{value:'695800'},years:{value:'1'}},querySelector:()=>output};recruitFinancePreview(form)`);
 const edited=finances(r('output.innerHTML'));
 assert.ok(r('output.innerHTML').includes(r('money(2695800)')),'rendered totals retain the same precision as submitted terms');
 assert.equal(edited.total,2695800);assert.equal(edited.cashAfter,r('state.money-2000000'));assert.equal(edited.wageAfter,r('wageBudget()-annualWageCost()-500000-695800'));
 assert.equal(edited.futureAfter,r('calendarFutureRoom(managerClub(),p.id)'),'one-year draft reserves no next-year salary');
 assert.equal(r('JSON.stringify(state)'),before,'editing a forecast never changes game state, offers or money');
 r("form.elements.salary.value='';recruitFinancePreview(form)");assert.match(r('output.innerHTML'),/Fyll i/);assert.doesNotMatch(r('output.innerHTML'),/NaN|data-value/);
 r("form.elements.salary.value='bad';recruitFinancePreview(form)");assert.match(r('output.innerHTML'),/Ange giltig/);
 r("state.clubRosters.AIK[0].futureContract={buyer:managerClub(),salary:1e9,years:2,joinYear:state.season.year+1,role:'Rotation'};form.elements.salary.value='695800';form.elements.years.value='2';recruitFinancePreview(form)");
 assert.match(r('output.innerHTML'),/Nästa säsongs löneutrymme räcker inte/);
 assert.match(r('managerCommitmentIssue(p,2000000,695800,2)'),/Nästa säsongs/);
 r("form.elements.years.value='1';recruitFinancePreview(form)");assert.match(r('output.innerHTML'),/befintliga åtaganden/);
 assert.equal(r('managerCommitmentIssue(p,2000000,695800,1)'),'');
});
