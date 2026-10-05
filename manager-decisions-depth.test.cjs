'use strict';
const assert=require('node:assert/strict');
const {test}=require('node:test');
const {boot}=require('./scripts/career-test-fixture.cjs');
function setup(){const app=boot(undefined,{production:true});app.run("startCareerWithClub('HV71')");return app;}

test('staff proposals require fresh consent and survive save/reload',()=>{
 const app=setup(),r=app.run;
 r("staffProposalCreate('training','Ett nytt pass');globalThis.p=state.office2.proposals[0];globalThis.before=state.money");
 assert.equal(r("staffProposalAnswer(p.id,'accept')"),true);
 assert.equal(r('state.money'),r('before'));
 assert.equal(r('JSON.stringify(state.calendar.plans[p.target])'),r('JSON.stringify(p.session)'));
 assert.equal(r("staffProposalAnswer(p.id,'accept')"),false);
 r("save()");const restored=boot(app.storage.value,{production:true});
 assert.equal(restored.run('state.office2.proposals[0].status'),'accepted');
 r("state.calendar.date=calAdd(p.target,1);staffProposalFollowup()");
 assert.equal(r('p.status'),'followed');
 r("staffProposalCreate('training','Ett annat pass');p=state.office2.proposals[0];state.calendar.plans[p.target]={type:'recovery',intensity:'light'}");
 assert.equal(r("staffProposalAnswer(p.id,'accept')"),false);
 assert.equal(r('p.status'),'expired');
 r("staffProposalCreate('contracts','Se avtalen');p=state.office2.proposals[0]");
 assert.equal(r("staffProposalAnswer(p.id,'accept')"),false);
 assert.equal(r("staffProposalAnswer(p.id,'decline')"),true);
});

test('junior loans retain their plan without becoming senior appearances',()=>{
 const app=setup(),r=app.run;
 r("globalThis.p=juniorPlayers()[0];managerJ20PathSet(p.id);p.academy.path='loan';p.academy.loan={destination:'Utvecklingsklubb',remaining:4,games:4,seconds:4800};managerJ20PathSelect(p.id)");
 assert.equal(r('managerJ20PathStatus(p).e.loan.games'),4);
 assert.equal(r('managerJ20PathStatus(p).e.senior.games'),0);
 assert.equal(r("managerJ20PathAction(p.id,'light')"),false);
 assert.match(r('managerJ20PathView()'),/Låneistid räknas inte/);
 r("delete p.academy.loan;p.academy.path='junior'");
 assert.equal(r('managerJ20PathPlan(p).pace'),'balanced');
 assert.equal(r('managerJ20PathStatus(p).e.loan'),null);
});

test('dated financial assumptions replace wages, charge fees once and never sign contracts',()=>{
 const app=setup(),r=app.run;
 r("globalThis.p=clubDecisionCandidates().find(isOwnPlayer);globalThis.original=JSON.stringify(p);globalThis.cash=state.money;clubDecisionAdd(p.id,p.salary,900000,'now',2)");
 assert.equal(r('clubDecisionProjection(1)[0].decisionWages'),0);
 assert.equal(r('clubDecisionProjection(1)[0].decisionFees'),0);
 r("clubDecisionAdd(p.id,p.salary+120000,'0','now',2)");
 assert.ok(r('clubDecisionProjection(1)[0].decisionWages')>0);
 assert.equal(r('state.clubOffice.decisionContracts.length'),1);
 assert.equal(r('JSON.stringify(p)'),r('original'));
 assert.equal(r('state.money'),r('cash'));
 assert.equal(r("clubDecisionAdd(p.id,NaN,0,'now',2)"),false);
 assert.equal(r('state.clubOffice.decisionContracts[0].end'),r('`${state.season.year+2}-08-01`'));
 r("globalThis.other=Object.values(state.clubRosters).flat().find(q=>q.club!==managerClub()&&!playerLoan(q)&&!q.futureContract);state.recruitment.shortlist.push(other.id);clubDecisionAdd(other.id,600000,250000,'summer',2)");
 assert.equal(r('clubDecisionProjection(18).reduce((n,row)=>n+row.decisionFees,0)'),250000);
 assert.ok(r('clubDecisionProjection(18).filter(row=>row.month<`${state.season.year+1}-08`).every(row=>row.decisionFees===0)'));
 assert.equal(r('clubDecisionProjection(18).find(row=>row.month===`${state.season.year+1}-08`).knownPlayers'),r('Math.round([...clubFutureCommitments(1).values()].reduce((n,v)=>n+v,0)/12)'));
 r('save()');const restored=boot(app.storage.value,{production:true});
 assert.equal(restored.run('state.clubOffice.decisionContracts.length'),2);
 assert.doesNotThrow(()=>restored.run('clubCashflowView()'));
});

test('staff profiles trade skills and enforce actual availability and project terms',()=>{
 const app=setup(),r=app.run;
 assert.equal(r('state.clubOffice.market.length'),25);
 r("globalThis.c=state.clubOffice.market.find(c=>c.personId.endsWith('-3'));globalThis.original=JSON.stringify(state.staff);globalThis.cash=state.money;state.clubOffice.offer={type:'hire',personId:c.personId,salary:999999,years:3};clubSign()");
 assert.equal(r('JSON.stringify(state.staff)'),r('original'));
 assert.equal(r('state.money'),r('cash'));
 assert.equal(r('clubStaffTerms(c).available'),false);
 r('state.calendar.date=c.marketProfile.available');
 assert.equal(r('clubStaffTerms(c).available'),true);
 assert.ok(r('clubStaffTerms(c).minimum>c.salary'));
 r('state.clubOffice.priority=c.marketProfile.project');
 assert.equal(r('clubStaffTerms(c).minimum'),r('c.salary'));
 r('delete c.marketProfile');
 assert.equal(r('clubStaffTerms(c).minimum'),r('c.salary'));
 assert.match(r('clubStaffDossier(c)'),/Svagare sida/);
});

test('real club loans stay selectable and do not permit parent-club workload changes',()=>{
 const app=setup(),r=app.run;
 r("globalThis.p=juniorPlayers()[0];managerJ20PathSet(p.id,'careful');globalThis.dest=Object.keys(state.clubRosters).find(c=>c!==managerClub());state.juniors.roster=state.juniors.roster.filter(q=>q.id!==p.id);p.club=dest;p.loanId=98765;state.clubRosters[dest].push(p);state.loans.active.push({id:98765,playerId:p.id,owner:managerClub(),borrower:dest,start:state.calendar.date,until:calAdd(state.calendar.date,60),games:3,seconds:2700});managerJ20PathSelect(p.id)");
 assert.equal(r('managerJ20PathPlayer(p.id).id'),r('p.id'));
 assert.equal(r('managerJ20PathStatus(p).e.loan.kind'),'Klubblån');
 assert.equal(r('managerJ20PathStatus(p).e.senior.games'),0);
 assert.equal(r("managerJ20PathAction(p.id,'light')"),false);
 assert.match(r('managerJ20PathView()'),/Granska lånet/);
 assert.equal(r('managerJ20PathPlan(p).pace'),'careful');
});

test('new save fields are validated and pending advice cannot cross clubs or live matches',()=>{
 const app=setup(),r=app.run;
 r("staffProposalCreate('juniors','Belastning');globalThis.p=state.office2.proposals[0];state.live={finished:false}");
 assert.equal(r("staffProposalAnswer(p.id,'accept')"),false);
 r("state.live=null;p.club='annan klubb'");
 assert.equal(r("staffProposalAnswer(p.id,'decline')"),false);
 r("p.club=managerClub();p.snapshot='broken'");
 assert.throws(()=>r('validateManagerSystemsSave(state)'),/Ogiltiga/);
 r("p.snapshot='[]';state.clubOffice.decisionContracts=[{playerId:1,name:'Test',salary:-1,fee:0,start:'2026-08-01',end:'2027-08-01'}]");
 assert.throws(()=>r('validateManagerSystemsSave(state)'),/Ogiltiga/);
});
