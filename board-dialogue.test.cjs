'use strict';
const assert=require('node:assert/strict');
const {test}=require('node:test');
const {boot}=require('./scripts/career-test-fixture.cjs');
function setup(){const a=boot(undefined,{production:true});a.run("startCareerWithClub('HV71')");return a;}
function offer(a,kind='wages',amount=500000,argument='retention'){a.run(`boardDialogueRequest('${kind}',${amount},'${argument}');state.calendar.date=calAdd(state.calendar.date,2);boardDialogueDay();globalThis.r=boardDialogueStore().requests[0]`);}
test('board views are read-only; requests wait for dated replies and can receive a counteroffer',()=>{
 const a=setup(),r=a.run;r('globalThis.before=JSON.stringify(state)');r('boardDialogueView();boardDialogueItems()');assert.equal(r('JSON.stringify(state)'),r('before'));
 assert.equal(r("boardDialogueRequest('wages',500000,'retention')"),true);
 r('boardDialogueDay()');assert.equal(r('boardDialogueStore().requests[0].status'),'pending');
 r('state.calendar.date=calAdd(state.calendar.date,2);boardDialogueDay();boardDialogueDay()');
 assert.equal(r('boardDialogueStore().requests[0].status'),'offered');
 assert.equal(r('boardDialogueStore().requests[0].offered'),250000);
 assert.equal(r("state.training.messages.filter(m=>m.key.startsWith('board-response:')).length"),1);
 assert.ok(r("managerAgendaItems().some(i=>i.id==='board-dialogue:1'&&i.requiresDecision)"));
});
test('accepting raises the effective annual wage limit exactly once and creates no money or contract',()=>{
 const a=setup(),r=a.run;offer(a);r('globalThis.cash=state.money;globalThis.budget=wageBudget();globalThis.contracts=JSON.stringify(managerRoster().map(p=>[p.id,p.salary,p.contractYears]))');
 assert.equal(r('boardDialogueAnswer(r.id,true)'),true);
 assert.equal(r('wageBudget()'),r('budget+250000'));assert.equal(r('state.boardPlan.offer.wageLimit'),r('wageBudget()'));
 assert.equal(r('state.money'),r('cash'));assert.equal(r('JSON.stringify(managerRoster().map(p=>[p.id,p.salary,p.contractYears]))'),r('contracts'));
 assert.equal(r('boardDialogueAnswer(r.id,true)'),false);assert.equal(r('wageBudget()'),r('budget+250000'));
 r('save()');const b=boot(a.storage.value,{production:true});assert.equal(b.run('boardDialogueStore().requests[0].status'),'active');
 assert.doesNotThrow(()=>b.run('validateSaveText(saveExportText())'));
});
test('acceptance rechecks reservations, budget changes and live matches',()=>{
 const a=setup(),r=a.run;offer(a);r('globalThis.cash=state.money;globalThis.budget=wageBudget();state.recruitment.deals.push({id:999,status:"pending",fee:state.money,salary:0,years:1})');
 assert.equal(r('boardDialogueAnswer(1,true)'),false);assert.equal(r('state.money'),r('cash'));assert.equal(r('wageBudget()'),r('budget'));
 r('state.recruitment.deals=[];state.live={finished:false}');assert.equal(r('boardDialogueAnswer(1,true)'),false);
 r('state.live=null;state.season.nextWageLimit+=10000');assert.equal(r('boardDialogueAnswer(1,true)'),false);
 r('state.season.nextWageLimit=budget');assert.equal(r('boardDialogueAnswer(1,false)'),true);assert.equal(r('wageBudget()'),r('budget'));
});
test('unsupported arguments, low trust and missing cash produce explained rejections',()=>{
 for(const fixture of ["state.managerCareer.confidence=20","state.money=0","for(const p of managerRoster())p.contractYears=3"]){
  const a=setup(),r=a.run;r(fixture);offer(a);assert.equal(r('r.status'),'rejected');assert.ok(r('r.outcome.length')>15);
  assert.equal(r('r.granted'),false);assert.equal(r("boardDialogueRequest('wages',500000,'retention')"),false);
 }
});
test('daily compliance review has evidence, a single consequence and season grant limits',()=>{
 const a=setup(),r=a.run;offer(a);r('boardDialogueAnswer(1,true);globalThis.confidence=state.managerCareer.confidence;for(let i=0;i<28;i++){state.calendar.date=calAdd(state.calendar.date,1);boardDialogueDay();boardDialogueDay()}');
 assert.equal(r('r.observations'),28);assert.equal(r('r.status'),'met');assert.equal(r('state.managerCareer.confidence'),r('confidence+2'));
 r('boardDialogueDay()');assert.equal(r('state.managerCareer.confidence'),r('confidence+2'));
 assert.equal(r("boardDialogueRequest('wages',1000000,'retention')"),false);
});
test('breached conditions lower confidence once but never revoke signed contracts or the granted limit',()=>{
 const a=setup(),r=a.run;offer(a);r('boardDialogueAnswer(1,true);globalThis.limit=wageBudget();globalThis.confidence=state.managerCareer.confidence;state.money=0;for(let i=0;i<28;i++){state.calendar.date=calAdd(state.calendar.date,1);boardDialogueDay()}');
 assert.equal(r('r.status'),'missed');assert.equal(r('r.breaches'),28);assert.equal(r('state.managerCareer.confidence'),r('confidence-3'));assert.equal(r('wageBudget()'),r('limit'));
});
test('project investment posts once, matures only after review, and can unlock an existing milestone',()=>{
 const a=setup(),r=a.run;r("state.managerCareer.confidence=80;state.clubOffice.priority='youth';state.clubOffice.priorityLockedYear=clubYear();state.clubOffice.projects??={};state.clubOffice.projects.youth={id:'youth',started:clubYear(),seasons:0,maturity:40}");offer(a,'project',500000,'development');r('globalThis.cash=state.money;boardDialogueAnswer(1,true)');
 assert.equal(r('state.money'),r('cash-500000'));assert.equal(r('state.clubOffice.projects.youth.maturity'),40);
 assert.equal(r('boardDialogueAnswer(1,true)'),false);assert.equal(r('state.money'),r('cash-500000'));
 r('for(let i=0;i<90;i++){state.calendar.date=calAdd(state.calendar.date,1);boardDialogueDay()}');
 assert.equal(r('r.status'),'met');assert.equal(r('state.clubOffice.projects.youth.maturity'),60);
 assert.equal(r("state.clubOffice.ledger.filter(e=>e.label.startsWith('Styrelsebeslut')).length"),1);
 assert.equal(r("clubProjectChoose('youth',clubProjectMilestones('youth')[0].id)"),true);
});
test('staff budget grants affect the real personnel cap without paying salary upfront',()=>{
 const a=setup(),r=a.run;offer(a,'staff',150000,'expertise');r('globalThis.cash=state.money;globalThis.limit=state.clubOffice.staffLimit;boardDialogueAnswer(1,true)');
 assert.equal(r('state.clubOffice.staffLimit'),r('limit+75000'));assert.equal(r('state.money'),r('cash'));
});
test('expiry, limited observations and club departure do not punish missing evidence',()=>{
 const a=setup(),r=a.run;offer(a);r('state.calendar.date=calAdd(r.expires,1);boardDialogueDay()');assert.equal(r('r.status'),'expired');assert.equal(r('boardDialogueAnswer(1,true)'),false);
 const b=setup(),s=b.run;offer(b);s('boardDialogueAnswer(1,true);globalThis.confidence=state.managerCareer.confidence;state.calendar.date=r.review;boardDialogueDay()');assert.equal(s('r.status'),'closed');assert.equal(s('state.managerCareer.confidence'),s('confidence'));
 const c=setup(),t=c.run;offer(c);t("boardDialogueClose('Klubbbyte');save()");assert.equal(t('r.status'),'closed');assert.equal(t('boardDialogueAnswer(1,true)'),false);
});
test('new save data rejects invalid grants and foreign-club requests cannot be accepted',()=>{
 const a=setup(),r=a.run;offer(a);r("r.club='annan klubb'");assert.equal(r('boardDialogueAnswer(1,true)'),false);r('r.club=managerClub();r.offered=-1');assert.throws(()=>r('validateManagerSystemsSave(state)'),/styrelsedialog/);
});
test('pending requests can be withdrawn without resource changes or later responses',()=>{
 const a=setup(),r=a.run;r("globalThis.cash=state.money;globalThis.limit=wageBudget();boardDialogueRequest('wages',500000,'retention')");
 assert.equal(r('boardDialogueWithdraw(1)'),true);assert.equal(r('boardDialogueWithdraw(1)'),false);
 r('state.calendar.date=calAdd(state.calendar.date,3);boardDialogueDay()');
 assert.equal(r('boardDialogueStore().requests[0].status'),'declined');assert.equal(r('state.money'),r('cash'));assert.equal(r('wageBudget()'),r('limit'));
});
test('the actual calendar delivers board responses and club storage closes responsibility',()=>{
 const a=setup(),r=a.run;
 r("preseasonConfigure('balanced','assistant','rotation','assistant','assistant');boardDialogueRequest('wages',500000,'retention');calendarContinue();calendarContinue()");
 assert.equal(r('boardDialogueStore().requests[0].status'),'offered');
 r('boardDialogueAnswer(1,true);globalThis.limit=wageBudget();managerStoreClub()');
 assert.equal(r('state.managerCareer.bank[managerClub()].office2.boardDialogue.requests[0].status'),'closed');
 assert.equal(r('state.managerCareer.bank[managerClub()].wageLimit'),r('limit'));
 r('save()');const b=boot(a.storage.value,{production:true});
 assert.doesNotThrow(()=>b.run('validateManagerSystemsSave(state)'));
});
