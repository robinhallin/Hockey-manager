const assert=require('node:assert/strict');
const {boot}=require('./scripts/career-test-fixture.cjs');
const app=boot(),r=app.run;
r("startCareerWithClub('HV71');ensureJuniors()");
const id=r("String(state.juniors.roster[0].id)");
assert.equal(r(`managerJ20PathSet(${JSON.stringify(id)},'balanced')`),true);
assert.equal(r(`managerJ20PathPlan(juniorById(${JSON.stringify(id)})).pace`),'balanced');
const before=r('JSON.stringify(state)');
let status=r(`managerJ20PathStatus(juniorById(${JSON.stringify(id)}))`);
assert.equal(r('JSON.stringify(state)'),before,'reading the development path must not mutate career state');
assert.equal(status.cfg.aSessions,3);
assert.equal(status.milestones.length,4);
assert.match(status.milestones.map(x=>x.label).join('|'),/J20-underlag.*A-träningsunderlag.*A-lagsprov.*Etablering/);
// Pace changes thresholds, not existing evidence.
assert.equal(r(`managerJ20PathSet(${JSON.stringify(id)},'careful')`),true);
assert.equal(r(`managerJ20PathStatus(juniorById(${JSON.stringify(id)})).cfg.aSessions`),5);
assert.equal(r(`managerJ20PathSet(${JSON.stringify(id)},'fast')`),true);
assert.equal(r(`managerJ20PathStatus(juniorById(${JSON.stringify(id)})).cfg.aSessions`),2);
// Real A-training evidence feeds the same long-term path.
r(`juniorById(${JSON.stringify(id)}).academy.path='guest'; juniorById(${JSON.stringify(id)}).fatigue=20`);
r("juniorTraining({type:'skills',intensity:'normal'},'path-test:1')");
r("juniorTraining({type:'tactics',intensity:'normal'},'path-test:2')");
assert.equal(r(`state.juniors.aTraining[${JSON.stringify(id)}].sessions`),2);
assert.equal(r(`managerJ20PathStatus(juniorById(${JSON.stringify(id)})).milestones.find(m=>m.key==='training').done`),true);
// Pace-specific load ceiling is respected.
r(`juniorById(${JSON.stringify(id)}).fatigue=73`);
assert.equal(r(`managerJ20PathStatus(juniorById(${JSON.stringify(id)})).next`),'Sänk belastningen');
r(`juniorById(${JSON.stringify(id)}).fatigue=30`);
assert.equal(r(`managerJ20PathAction(${JSON.stringify(id)},'light')`),true);
assert.equal(r(`juniorById(${JSON.stringify(id)}).trainingLoad`),'light');
// Promotion through the plan must enter the same promotion history used by senior follow-up.
assert.equal(r(`managerJ20PathAction(${JSON.stringify(id)},'promote')`),true);
assert.equal(r(`managerRoster().some(p=>samePlayerId(p.id,${JSON.stringify(id)})&&p.academy?.path==='senior')`),true);
assert.equal(r(`managerSeniorProspectDecision(managerRoster().find(p=>samePlayerId(p.id,${JSON.stringify(id)}))).action`),'promote');
assert.equal(r(`managerJ20PathPlan(managerRoster().find(p=>samePlayerId(p.id,${JSON.stringify(id)}))).pace`),'fast');
assert.equal(r(`managerJ20PathStatus(managerRoster().find(p=>samePlayerId(p.id,${JSON.stringify(id)}))).next`),'Ge faktisk A-lagsistid');
console.log('PASS: junior development paths persist pace, milestones, real A-training evidence, workload action and senior follow-up continuity.');
