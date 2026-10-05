'use strict';
const assert=require('node:assert/strict');
const {test}=require('node:test');
const {boot}=require('./scripts/career-test-fixture.cjs');
function setup(){const a=boot(undefined,{production:true});a.run("startCareerWithClub('HV71')");return a;}
test('one proposal appears in every decision view and records its actual outcome',()=>{
 const a=setup(),r=a.run;r("staffProposalCreate('training','Mitt gemensamma förslag');managerAgendaReconcile();globalThis.p=state.office2.proposals[0]");
 assert.equal(r("managerAgendaItems().filter(i=>i.id==='staff-proposal:'+p.id).length"),1);
 assert.match(r('staffFollowupView()'),/Mitt gemensamma förslag/);
 assert.match(r('managerAgendaView()'),/Mitt gemensamma förslag/);
 assert.equal(r("staffProposalAnswer(p.id,'decline')"),true);
 assert.equal(r("managerAgendaItems().some(i=>i.id==='staff-proposal:'+p.id)"),false);
 assert.match(r("state.office2.agenda.history.find(h=>h.id==='staff-proposal:'+p.id).outcome"),/Avböjt/);
});
test('rolling scenarios preserve remaining wage effects and hypothetical fees without posting',()=>{
 const a=setup(),r=a.run;r("globalThis.p=clubDecisionCandidates().find(isOwnPlayer);clubDecisionAdd(p.id,p.salary+120000,0,'now',2);globalThis.cash=state.money;state.calendar.date=calAdd(state.calendar.date,1)");
 assert.ok(r('clubDecisionProjection(1)[0].decisionWages')>0);
 r("globalThis.q=Object.values(state.clubRosters).flat().find(p=>p.club!==managerClub()&&!playerLoan(p)&&!p.futureContract);state.recruitment.shortlist.push(q.id);clubDecisionAdd(q.id,500000,250000,'now',2);state.calendar.date=calAdd(state.calendar.date,2)");
 assert.equal(r('clubDecisionProjection(3).reduce((n,r)=>n+r.decisionFees,0)'),250000);
 assert.equal(r('clubDecisionProjection(3).reduce((n,r)=>n+r.decisionFees,0)'),250000);
 assert.equal(r('state.money'),r('cash'));
 r('p.salary+=10000');assert.match(r('clubDecisionIssue(state.clubOffice.decisionContracts[0])'),/ändrats/);
 r('save()');assert.doesNotThrow(()=>boot(a.storage.value,{production:true}).run('clubCashflowView()'));
});
test('scenario drafts carry exact amounts and years but do not send or overwrite offers',()=>{
 const a=setup(),r=a.run;r("globalThis.p=clubDecisionCandidates().find(isOwnPlayer);clubDecisionAdd(p.id,765432,0,'now',4);globalThis.cash=state.money;globalThis.contract=JSON.stringify([p.salary,p.contractYears]);clubDecisionDraft(p.id)");
 assert.equal(r('p.renewalDraft.salary'),'765432');assert.equal(r('p.renewalDraft.years'),'4');
 assert.equal(r('JSON.stringify([p.salary,p.contractYears])'),r('contract'));
 r("globalThis.q=Object.values(state.clubRosters).flat().find(p=>p.club!==managerClub()&&!playerLoan(p)&&!p.futureContract);state.recruitment.shortlist.push(q.id);clubDecisionAdd(q.id,654321,123456,'now',4)");
 assert.equal(r('clubDecisionDraft(q.id)'),true);
 assert.equal(r('state.transferNegotiation.salaryDemand'),654321);
 assert.equal(r('state.transferNegotiation.years'),4);
 assert.match(r('hubTransferForm(q)'),/value="654321"/);
 assert.equal(r('recruitHub.player'),r('q.id'));
 assert.equal(r('state.money'),r('cash'));assert.equal(r('state.recruitment.deals.length'),0);
 r("globalThis.draft=JSON.stringify(state.transferNegotiation);clubDecisionDraft(q.id)");assert.equal(r('JSON.stringify(state.transferNegotiation)'),r('draft'));
});
test('future plans only become future drafts when their start and eligibility agree',()=>{
 const a=setup(),r=a.run;r("globalThis.p=Object.values(state.clubRosters).flat().find(p=>p.club!==managerClub()&&!playerLoan(p)&&!p.futureContract&&!naActive(p));p.contractYears=1;state.recruitment.shortlist.push(p.id);clubDecisionAdd(p.id,543210,0,'summer',3)");
 assert.equal(r('clubDecisionDraft(p.id)'),false);assert.equal(r('state.transferNegotiation'),null);
 r("state.season.phase='regular'");assert.equal(r('clubDecisionDraft(p.id)'),true);
 assert.equal(r('state.transferNegotiation.kind'),'future');assert.equal(r('recruitHub.panel'),'future');
 assert.match(r('calendarFuturePanel(p)'),/value="543210"/);
 assert.equal(r('state.recruitment.deals.length'),0);
 r("state.boardPlan.offer.wageLimit=1000000000;state.money=1000000000;submitFutureOffer(p.id,543210,3,'Rotation')");
 assert.equal(r('state.recruitment.deals[0].kind'),'future');
 assert.equal(r('state.transferNegotiation'),null);
});
test('named impact reports are read-only and cover both arrivals and departures',()=>{
 const a=setup(),r=a.run;r("globalThis.p=managerRoster().find(p=>p.pos==='C');globalThis.before=JSON.stringify(state)");
 assert.ok(r("squadDecisionImpact(p,'departure').peers.length")>0);
 assert.match(r("squadDecisionImpactView(p,'departure')"),/återstår/);
 assert.match(r("squadDecisionImpactView(p,'arrival','Nyckelspelare')"),/Juniorvägar/);
 assert.equal(r('JSON.stringify(state)'),r('before'));
});
test('season review freezes evidence, carries open questions once and survives reload',()=>{
 const a=setup(),r=a.run;r("globalThis.p=juniorPlayers()[0];managerJ20PathSet(p.id);globalThis.rows=seasonDecisionRows();state.season.archive.unshift({year:state.season.year,club:managerClub(),decisions:rows});globalThis.evidence=JSON.stringify(rows);seasonDecisionCarry(state.season.year);globalThis.count=state.office2.seasonActions.length;seasonDecisionCarry(state.season.year)");
 assert.equal(r('state.office2.seasonActions.length'),r('count'));
 assert.ok(r("managerAgendaItems().some(i=>i.id.startsWith('season-action:'))"));
 r("globalThis.id=state.office2.seasonActions[0].id;seasonDecisionClose(id)");
 assert.equal(r("managerAgendaItems().some(i=>i.id==='season-action:'+id)"),false);
 r('p.fatigue=95');assert.equal(r('JSON.stringify(rows)'),r('evidence'));
 r('save()');const b=boot(a.storage.value,{production:true});
 assert.equal(b.run('state.office2.seasonActions.length'),r('count'));
 assert.doesNotThrow(()=>b.run('validateManagerSystemsSave(state)'));
 assert.match(b.run('seasonDecisionView()'),/Överförda frågor/);
 r("state.office2.seasonActions[0].area='invalid'");assert.throws(()=>r('validateManagerSystemsSave(state)'),/Ogiltiga/);
});
