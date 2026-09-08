const assert=require('node:assert/strict');
const {boot}=require('./scripts/career-test-fixture.cjs');
// Follow public decisions through the actual daily simulator and saved career.
for(const load of ['normal','light','rest']){
 const app=boot(),run=app.run;
 run(`startCareerWithClub('HV71');globalThis.p=managerRoster().find(p=>p.pos==='C');p.fatigue=60;p.health.load=20;setTrainingSession(0,'type','skills');setTrainingSession(0,'intensity','hard');setIndividualLoad(p.id,'${load}');`);
 const expected=run('trainingSessionEffect(p,state.training.plan[0]).fatigue');
 const before=run('JSON.stringify(state)');run('trainingPlanningPanel(p)');
 assert.equal(run('JSON.stringify(state)'),before,'Preview must not mutate the career');
 run('managerContinue()');
 assert.equal(run('p.trainingSessions[0].after'),expected,'Real pass must agree with preview');
 assert.equal(run('p.trainingSessions[0].rest'),load==='rest');
 assert.equal(run('p.health.load'),16+(load==='rest'?0:load==='normal'?12:5));
 assert.equal(run('state.calendar.date'),'2026-09-08');
}
const app=boot(),run=app.run;
run(`startCareerWithClub('HV71');globalThis.p=managerRoster().find(p=>p.pos==='C');p.fatigue=70;setIndividualLoad(p.id,'rest');setTrainingReturn(p.id,3);`);
assert.equal(run('p.trainingReturn.date'),'2026-09-10');
run('managerContinue();managerContinue();save()');
const restored=boot(app.storage.value),r=restored.run;
r(`resumeCareer();globalThis.p=managerRoster().find(p=>p.pos==='C');`);
assert.equal(r('p.trainingLoad'),'rest');assert.equal(r('p.trainingReturn.rested'),2);
r('managerContinue()');
assert.equal(r('p.trainingLoad'),'normal');assert.equal(r('p.trainingReturn'),undefined);
assert.ok(r(`state.training.messages.some(m=>m.title===p.name+': belastningsplan avslutad'&&m.body.includes('3 återhämtningspass'))`));
const count=r('state.training.messages.length');r('trainingReturnDay()');assert.equal(r('state.training.messages.length'),count,'No repeated follow-up');
// Manual changes cancel the timer, indefinite rest and legacy saves keep their behavior.
r(`setIndividualLoad(p.id,'rest');setTrainingReturn(p.id,1);setIndividualLoad(p.id,'light');calendarStep(true);`);
assert.equal(r('p.trainingLoad'),'light');assert.equal(r('p.trainingReturn'),undefined);
r(`setIndividualLoad(p.id,'rest');calendarStep(true);`);assert.equal(r('p.trainingLoad'),'rest');
// Expiry never clears an injury or medically authorizes a comeback.
r(`setTrainingReturn(p.id,1);p.health.injury={remaining:5,readiness:20};calendarStep(true);`);
assert.equal(r('p.trainingLoad'),'normal');assert.equal(r('medicalCanTrain(p)'),false);
assert.equal(r(`trainingSessionEffect(p,{type:'skills',intensity:'hard'}).points`),0);
// Match preparation remains light in both training and medical exposure.
const b=boot();b.run(`startCareerWithClub('HV71');globalThis.p=managerRoster().find(p=>p.pos==='C');p.fatigue=30;p.health.load=20;setTrainingSession(0,'type','matchprep');setTrainingSession(0,'intensity','hard');managerContinue();`);
assert.equal(b.run('p.fatigue'),21);assert.equal(b.run('p.health.load'),21);
// The real growth/rehab/next-day machinery above stays active throughout.
console.log('Training planning: previews, medical consistency, timed recovery, manual override, save/reload and injury safeguards passed.');
