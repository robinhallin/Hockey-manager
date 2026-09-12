const assert=require('node:assert/strict');
const {boot}=require('./scripts/career-test-fixture.cjs');
const {run:r}=boot();
r("startCareerWithClub('HV71')");

// Training delegation must control the real recovery responsibility.
assert.equal(r("managerOffice2Delegated('training')"),false);
r("managerOffice2ToggleDelegation('training')");
assert.equal(r("state.training.recoveryOwner"),'staff');
assert.equal(r("managerOffice2Delegated('training')"),true);
r("managerOffice2ToggleDelegation('training')");
assert.equal(r("managerOffice2Delegated('training')"),false,'undefined/default recovery owner is manager-controlled');

// Medical staff may choose only a conservative limited comeback.
r("managerOffice2ToggleDelegation('medical')");
r("const p=managerRoster()[0];p.health={load:0,injury:{name:'Test',remaining:0,initial:3,readiness:80,source:'test'},clearance:'rest'}");
let changed=r("managerOffice2MedicalStaffPlan()");
assert.equal(changed.length,1);
assert.equal(r("managerRoster()[0].health.clearance"),'limited');

// Below the threshold the player stays in rehab.
r("const p=managerRoster()[1];p.health={load:0,injury:{name:'Test 2',remaining:0,initial:3,readiness:60,source:'test'},clearance:'rest'}");
changed=r("managerOffice2MedicalStaffPlan()");
assert.equal(r("managerRoster()[1].health.clearance"),'rest');

// A manual full-comeback choice is never overwritten by the delegated routine.
r("const p=managerRoster()[2];p.health={load:0,injury:{name:'Test 3',remaining:0,initial:3,readiness:90,source:'test'},clearance:'full'}");
r("managerOffice2MedicalStaffPlan()");
assert.equal(r("managerRoster()[2].health.clearance"),'full');

const summary=r("managerOffice2ResponsibilitySummary()");
assert.match(summary.training,/Du styr individuell återhämtning|Tränarstaben/);
assert.match(summary.medical,/begränsad comeback/);
console.log('PASS: Office 2 delegation drives real training recovery and conservative medical staff routines without auto full comeback.');
