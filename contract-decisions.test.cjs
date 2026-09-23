'use strict';
const assert=require('node:assert/strict');
const {boot}=require('./scripts/career-test-fixture.cjs');
const app=boot(),r=app.run;
r("startCareerWithClub('HV71');globalThis.p=managerRoster().find(p=>p.pos!=='MV'&&!playerLoan(p));globalThis.other=managerRoster().find(q=>q.id!==p.id&&!playerLoan(q));other.name=p.name;state.boardPlan.offer.wageLimit=1e9;state.money=1e9;deskOpenPlayer(p.id);openContractNegotiation(p.id);globalThis.w=renewalWishes(p);");
const edit=(salary,years,role)=>{app.get('#renewalSalary').value=String(salary);app.get('#renewalYears').value=String(years);app.get('#renewalRole').value=role;r('renewalDraftEdit(p.id)');};
const salary=r('w.salary')+10000,years=r('w.minYears');
const before=r('JSON.stringify([p.salary,p.contractYears,p.promisedRole,state.money,state.recruitment.deals])');
edit(salary,years,'Nyckelspelare');
assert.equal(r('JSON.stringify([p.salary,p.contractYears,p.promisedRole,state.money,state.recruitment.deals])'),before,'drafts must not spend or promise');
assert.match(app.get('#renewalPreview').textContent,/Avtalsåtagande/);
assert.match(app.get('#renewalPreview').textContent,/15 minuter i 2 av 3/);
assert.ok(r('playerView()').includes('value="'+salary+'"'));
r('deskOpenPlayer(other.id);openContractNegotiation(other.id);deskBack();openContractNegotiation(p.id);');
assert.equal(r('Number(renewalDraftValues(p).salary)'),salary,'another player with same name has a separate draft');
assert.equal(r('other.renewalDraft'),undefined);
r('flushInterfaceSave();save()');const reload=boot(app.storage.value);
assert.equal(reload.run('Number(renewalDraftValues(playerById('+JSON.stringify(r('p.id'))+')).salary)'),salary);
assert.doesNotThrow(()=>reload.run('validateSaveText(saveExportText())'));
// Existing salary is replaced, not counted twice; reservations are shared with enforcement.
r('globalThis.preview=managerCommitmentPreview(p,0,p.salary,2,{renewal:true})');
assert.equal(r('preview.wageAfter'),r('managerRecruitmentBudget(p.id).wageRoom'));
r("state.recruitment.deals.push({id:999,playerId:other.id,buyer:managerClub(),status:'pending',fee:100,salary:200000,years:2});globalThis.reserved=managerCommitmentPreview(p,0,p.salary,2,{renewal:true})");
assert.equal(r('preview.wageAfter-reserved.wageAfter'),200000);
r('state.recruitment.deals.at(-1).status="cancelled";');
// Rejection leaves the draft; acceptance applies only the submitted player and clears it.
edit(1,years,'Nyckelspelare');r("submitContractRenewal(p.id,1,w.minYears,'Nyckelspelare')");
assert.equal(r('p.renewalDraft.salary'),'1');assert.ok(r('state.contractNegotiation'));
edit(salary,years,'Nyckelspelare');r("submitContractRenewal(p.id,renewalDraftValues(p).salary,renewalDraftValues(p).years,renewalDraftValues(p).role)");
assert.equal(r('p.salary'),salary);assert.equal(r('p.renewalDraft'),undefined);assert.equal(r('state.contractNegotiation'),null);
assert.equal(r('p.recruitmentPromise.role'),'Nyckelspelare');
assert.ok(r('state.training.messages.some(m=>samePlayerId(m.playerId,p.id)&&m.titleParts?.some(part=>part.playerId===p.id))'));
// Actual daily work and a production match feed the same role promise and saved report.
r('globalThis.days=0;while(state.calendar.date<calendarTarget()&&days++<14)calendarContinue();startMatch();pauseMatch();globalThis.promiseBefore=JSON.stringify(p.recruitmentPromise);globalThis.clock=JSON.stringify([state.live.minute,state.live.second,state.live.running]);rolePromisePlayerView(p);');
assert.equal(r('JSON.stringify(p.recruitmentPromise)'),r('promiseBefore'));
assert.equal(r('JSON.stringify([state.live.minute,state.live.second,state.live.running])'),r('clock'));
r('globalThis.steps=0;while(!state.live.finished&&steps++<65000){if(!state.live.running){while(medicalPending())medicalDecisionAccept();startMatch();}studioStep();}');
assert.equal(r('state.live.finished'),true);
if(!r('state.live.friendly')&&!r('medicalExcused(p,900)')){assert.ok(r('p.recruitmentPromise.evidence.length')>0);assert.match(r('rolePromiseEvidence(p.recruitmentPromise)'),/#match\//);}
r('save()');const loaded=boot(app.storage.value);
assert.equal(loaded.run('JSON.stringify(playerById('+JSON.stringify(r('p.id'))+').recruitmentPromise)'),r('JSON.stringify(p.recruitmentPromise)'));
// Prospective signals do not settle a promise or invent a missing historical report.
r("globalThis.q={minutes:15,total:3,required:2,games:2,qualified:0,resolved:false};globalThis.copy=JSON.stringify(q);");
assert.match(r('rolePromiseProgress(q)'),/kan inte längre nås/);
assert.equal(r('JSON.stringify(q)'),r('copy'));
assert.match(r('rolePromiseProgress({...q,qualified:2})'),/målet är nått/);
assert.match(r("rolePromiseEvidence({evidence:[{key:'missing',date:state.calendar.date,seconds:0,qualified:false}]})"),/Matchrapport saknas/);
r('state.live=null;openContractNegotiation(p.id)');edit(123456,2,'Rotation');r('cancelContractNegotiation()');assert.equal(r('p.renewalDraft'),undefined);
assert.doesNotMatch(r('renewalDecisionText(p,{salary:"",years:2,role:"Ordinarie"})'),/ryms/);
r("p.renewalDraft={club:'Other',salary:1,years:1,role:'Bredd'}");assert.notEqual(r('renewalDraftValues(p).salary'),1);
assert.match(r("renewalDecisionText(p,{salary:p.salary,years:1,role:'Rotation'})"),/Nästa säsong/);
const snapshot=r('JSON.stringify(state)');r('renewalDecisionText(p);rolePromisePlayerView(p);');assert.equal(r('JSON.stringify(state)'),snapshot);
console.log('PASS: saved separate drafts → budget preview → rejected/accepted renewal → days → production match → promise evidence → reload; no spending on edit, identity and historical boundaries. Automated workflow, not visual playtesting.');
