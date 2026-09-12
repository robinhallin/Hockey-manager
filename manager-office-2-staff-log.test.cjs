const assert=require('node:assert/strict');
const {boot}=require('./scripts/career-test-fixture.cjs');
const {run:r}=boot();
r("startCareerWithClub('HV71')");

assert.equal(r("managerOffice2StaffLogEnsure().length"),0);

// A real delegated recovery action is written to the staff log.
r("managerOffice2ToggleDelegation('training')");
r("const logP0=managerRoster()[0];logP0.trainingLoad='normal';logP0.fatigue=70;logP0.trainingManualDate=null");
r("trainingDelegateRecovery()");
assert.equal(r("managerRoster()[0].trainingLoad"),'rest');
assert.equal(r("managerOffice2StaffLogEnsure().some(e=>e.area==='training'&&e.title.includes(managerRoster()[0].name))"),true);
const afterTraining=r("managerOffice2StaffLogEnsure().length");
r("trainingDelegateRecovery()");
assert.equal(r("managerOffice2StaffLogEnsure().length"),afterTraining,'same action must not duplicate on the same day');

// A real delegated limited-comeback action is also written.
r("managerOffice2ToggleDelegation('medical')");
r("const logP1=managerRoster()[1];logP1.health={load:0,injury:{name:'Log test',remaining:0,initial:3,readiness:80,source:'test'},clearance:'rest'}");
r("managerOffice2MedicalStaffPlan()");
assert.equal(r("managerRoster()[1].health.clearance"),'limited');
assert.equal(r("managerOffice2StaffLogEnsure().some(e=>e.area==='medical'&&e.title.includes(managerRoster()[1].name))"),true);

const view=r("managerOffice2StaffLogView()");
assert.match(view,/Stabens senaste åtgärder/);
assert.match(view,/Träning/);
assert.match(view,/Medicinskt/);

// The log stays bounded across saves and navigation-sized histories.
r("state.office2.staffLog=Array.from({length:45},(_,i)=>({signature:'old:'+i,date:'2026-01-01',area:'training',title:'T'+i,detail:'D'}));managerOffice2StaffLogAdd('medical','Ny åtgärd','Detalj','new')");
assert.equal(r("state.office2.staffLog.length"),40);

console.log('PASS: delegated training and medical actions create a bounded, deduplicated Manager Office staff log.');
