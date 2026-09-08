const assert=require('node:assert/strict');const {boot}=require('./scripts/career-test-fixture.cjs');const a=boot(),r=a.run;
r("startCareerWithClub('HV71');state.calendar.date=calendarTarget();startMatch();for(let i=0;i<800;i++)studioStep();");
assert.ok(r('studioEngine().decisionAudit.recent.length')>0);
r('save();validateSaveText(saveExportText());');
const audit=r('JSON.stringify(studioEngine().decisionAudit)'),b=boot(a.storage.value);
assert.equal(b.run('JSON.stringify(studioEngine().decisionAudit)'),audit);
assert.ok(b.run("studioDecisionView().includes('SPELARVAL')"));
assert.throws(()=>b.run("globalThis.invalid=JSON.parse(saveExportText()).career;invalid.live.broadcast.decisionAudit.recent=Array(31).fill({});validateSpatialMatchSave(invalid)"));
console.log('PASS: career decision explanations, bounded serialized audit, full save validation and exact restored observations.');
