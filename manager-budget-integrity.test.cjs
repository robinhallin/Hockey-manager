'use strict';
const assert=require('node:assert/strict');
const {test}=require('node:test');
const {boot}=require('./scripts/career-test-fixture.cjs');
function setup(){const a=boot();a.run("startCareerWithClub('HV71');globalThis.p=state.playerWorld.freeAgents.find(p=>p.name==='Oula Palve');globalThis.w=recruitPlayerWishes(p)");return a;}

test('multi-year offers and renewals respect next-year commitments in either order',()=>{
 const a=setup(),r=a.run;
 r("globalThis.q=state.clubRosters['AIK'][0];q.futureContract={buyer:managerClub(),seller:'AIK',salary:calendarFutureRoom()-1000,years:2,joinYear:2027,role:'Rotation'};globalThis.cash=state.money;submitRecruitOffer(p.id,0,w.salary,2,w.role)");
 assert.equal(r('state.recruitment.deals.length'),0);
 assert.match(r('state.recruitment.message'),/Nästa säsongs löneutrymme/);
 assert.equal(r('state.money'),r('cash'));
 assert.equal(r("transferRecruitPlayer(p,WORLD_FREE,managerClub(),0,w.salary,2,w.role)"),false,'registration cannot bypass the same budget');
 // One-season cover remains possible, since it makes no next-season commitment.
 r('submitRecruitOffer(p.id,0,w.salary,1,w.role)');assert.equal(r('state.recruitment.deals.length'),1);
 r('cancelRecruitOffer(state.recruitment.deals[0].id);delete q.futureContract;submitRecruitOffer(p.id,0,w.salary,2,w.role);globalThis.d=state.recruitment.deals[0];globalThis.reserved=calendarFutureRoom()');
 assert.equal(r('d.status'),'pending');
 assert.equal(r('calendarFutureRoom(managerClub(),p.id)-reserved'),r('d.salary'),'own offer is counted exactly once');
 r("q.futureContract={buyer:managerClub(),seller:'AIK',salary:reserved+1,years:2,joinYear:2027,role:'Rotation'};globalThis.dealsBefore=state.recruitment.history.length;state.calendar.date=d.dueDate;resolveRecruitDeal(d)");
 assert.equal(r('d.status'),'rejected','changed commitments are rechecked at registration');
 assert.equal(r('getPlayerClub(p.id)'),r('WORLD_FREE'));
 assert.equal(r('state.recruitment.history.length'),r('dealsBefore'));
 r("globalThis.own=managerRoster().find(p=>!playerLoan(p)&&p.contractYears===1);globalThis.terms=renewalWishes(own);q.futureContract.salary+=calendarFutureRoom()-1000;globalThis.oldSalary=own.salary;openContractNegotiation(own.id);submitContractRenewal(own.id,terms.salary,2,terms.role)");
 assert.equal(r('own.salary'),r('oldSalary'));assert.equal(r('own.contractYears'),1);
 assert.match(r('state.contractNegotiation.message'),/Nästa säsongs löneutrymme/);
});

test('junior promotions and North American loans preserve existing bid reservations',()=>{
 const a=setup(),r=a.run;
 r("globalThis.y=state.juniors.roster.find(p=>!p.academy.seniorContract);state.boardPlan.offer.wageLimit=annualWageCost()+600000;state.recruitment.deals.push({id:999,playerId:p.id,status:'pending',fee:0,salary:500000,years:1});globalThis.ids=JSON.stringify(managerRoster().map(p=>p.id));juniorPromote(y.id)");
 assert.equal(r('JSON.stringify(managerRoster().map(p=>p.id))'),r('ids'));
 assert.match(r('state.juniors.message'),/pågående köp- och lånebud/);
 assert.equal(r('naLoanRoom(p,managerClub(),.5)'),false,'legacy offers without buyer still reserve wages');
 r('state.recruitment.deals[0].status="cancelled"');
 assert.equal(r('naLoanRoom(p,managerClub(),.5)'),true);
 r('juniorPromote(y.id)');assert.equal(r('managerRoster().filter(p=>p.id===y.id).length'),1);
 r('juniorPromote(y.id)');assert.equal(r('managerRoster().filter(p=>p.id===y.id).length'),1);
 r('save()');assert.doesNotThrow(()=>r('validateSaveText(saveExportText())'));
 assert.equal(boot(a.storage.value).run('managerRoster().filter(p=>p.id==='+JSON.stringify(r('y.id'))+').length'),1);
});

test('budget panels share the decision budget and exclude cancelled offers',()=>{
 const a=setup(),r=a.run;
 r('submitRecruitOffer(p.id,0,w.salary,2,w.role)');
 assert.equal(r('managerRecruitmentBudget().salaryReserved'),r('w.salary'));
 assert.equal(r('managerRecruitmentBudget().wageRoom'),r('wageBudget()-annualWageCost()-w.salary'));
 assert.match(r('hubHeader()'),/Nästa säsongs löneutrymme/);
 assert.match(r('clubFinanceWorkspace()'),/Reserverade köp- och lånelöner/);
 r('cancelRecruitOffer(state.recruitment.deals[0].id)');assert.equal(r('managerRecruitmentBudget().salaryReserved'),0);
});
