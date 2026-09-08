const assert=require('node:assert/strict');
const {boot}=require('./scripts/career-test-fixture.cjs');
const a=boot(),r=a.run;
r("startCareerWithClub('HV71');ensureLines();globalThis.ids=state.lines.forwards.slice(0,3);globalThis.p=playerById(ids[0]);globalThis.q=playerById(ids[1]);globalThis.z=playerById(ids[2]);globalThis.key=dynamicsKey(p.id,q.id)");
const before=r('lineChemistry(ids).value');
r("trainSocialPairs({type:'tactics'});globalThis.once=JSON.stringify(state.teamDynamics);trainSocialPairs({type:'tactics'})");
assert.equal(r('JSON.stringify(state.teamDynamics)'),r('once'),'a training day is not farmable');
assert.equal(r('dynamicsClub().pairs[key].training'),.4);
assert.ok(Math.abs(r('lineChemistry(ids).parts.training')-.4)<1e-12);
r("state.calendar.date=calAdd(state.calendar.date,1);z.trainingLoad='rest';trainSocialPairs({type:'tactics'})");
assert.equal(r('dynamicsClub().pairs[key].training'),.8);
assert.equal(r('dynamicsClub().pairs[dynamicsKey(p.id,z.id)].training'),.4);
r("state.calendar.date=calAdd(state.calendar.date,1);p.health.injury={remaining:5,readiness:0};trainSocialPairs({type:'tactics'});p.health.injury=null;z.trainingLoad='normal'");
assert.equal(r('dynamicsClub().pairs[key].training'),.8,'injured teammates cannot train');
for(let i=0;i<40;i++)r("state.calendar.date=calAdd(state.calendar.date,1);dynamicsTrain(managerClub(),[ids],'tactics')");
assert.equal(r('dynamicsClub().pairs[key].training'),8);
assert.ok(r('lineChemistry(ids).value')>before);
assert.equal(r('lineChemistry([p.id]).value'),50);
r("globalThis.snapshot=JSON.stringify(state.teamDynamics);chemistryAnalysisView();lockerView();lineupBoardView()");
assert.equal(r('JSON.stringify(state.teamDynamics)'),r('snapshot'),'inspection is read-only after initialization');
r('save()');const reloaded=boot(a.storage.value);
assert.equal(reloaded.run('JSON.stringify(state.teamDynamics)'),r('snapshot'));
assert.doesNotThrow(()=>reloaded.run('validateSaveText(saveExportText())'));
r("globalThis.bad=JSON.parse(saveExportText());bad.career.teamDynamics.clubs[managerClub()].pairs[key].training='8'");
assert.throws(()=>r('validateSaveText(JSON.stringify(bad))'),/samspel/);
// Old data remains intact; no fictional historical sessions are backfilled.
r("dynamicsClub().pairs[key]={seconds:3600,form:2};globalThis.old=lineChemistry([p.id,q.id]);");
assert.equal(r('old.parts.training'),0);assert.equal(r('old.minutes'),60);
// Actual paired goals, not a team's final result, drive recent chemistry.
r("dynamicsClub().pairs={};globalThis.reserve=state.lines.forwards[6];dynamicsCommit(managerClub(),{[key]:600,[dynamicsKey(p.id,z.id)]:600},{[key]:2});");
assert.equal(r('dynamicsClub().pairs[key].form'),1.2);
assert.equal(r('dynamicsClub().pairs[dynamicsKey(p.id,z.id)].form'),0);
assert.equal(r('dynamicsClub().pairs[dynamicsKey(p.id,reserve)]'),undefined);
// A genuine AI day uses the same training rule and does not repeat.
r("state.calendar.date='2026-09-08';state.rivals.lastDay=null;globalThis.ai='Färjestad BK';dynamicsClub(ai).pairs={};dynamicsClub(ai).lastTrainingDate=null;rivalsDay();globalThis.aiDay=JSON.stringify(dynamicsClub(ai));rivalsDay()");
assert.equal(r('JSON.stringify(dynamicsClub(ai))'),r('aiDay'));
assert.ok(r('Object.values(dynamicsClub(ai).pairs).some(x=>x.training===.4)'));
// Controlled live attribute contrast: only chemistry changes, no new RNG draw.
r("state.calendar.date=calendarTarget();startMatch();globalThis.e=studioEngine();globalThis.actor=e.actors.find(x=>x.side===0&&x.role==='LW');globalThis.fw=e.actors.filter(x=>x.side===0&&['LW','RW','C'].includes(x.role)).map(x=>x.player.id);globalThis.rng=e.rng;globalThis.passBefore=e.attribute(actor,'passing');globalThis.shotBefore=e.attribute(actor,'shooting');for(let i=0;i<fw.length;i++)for(let j=i+1;j<fw.length;j++)dynamicsClub().pairs[dynamicsKey(fw[i],fw[j])]={seconds:0,form:0,training:8};studioChemistryCache.delete(e)");
assert.ok(r("e.attribute(actor,'passing')")>r('passBefore'));
assert.equal(r("e.attribute(actor,'shooting')"),r('shotBefore'));
assert.equal(r('e.rng'),r('rng'));
// Changing the planned line alone cannot give active skaters another unit's chemistry.
r("globalThis.actual=e.attribute(actor,'passing');e.teams[0].line=3;studioSyncPlans(e);studioChemistryCache.delete(e)");
assert.equal(r("e.attribute(actor,'passing')"),r('actual'));
// AI fixture reports conserve simultaneous pair seconds and net goal contributions.
r("state.live=null;globalThis.g=state.schedule.find(g=>g.home!==managerClub()&&g.away!==managerClub());globalThis.result=rivalSimulate(g)");
assert.ok(r('result.reports.every(x=>Object.values(x.pairSeconds).some(s=>s>0))'));
assert.ok(r('result.reports.every(x=>Object.values(x.pairResults).every(Number.isInteger))'));
r("Object.assign(g,{played:true,homeGoals:result.homeGoals,awayGoals:result.awayGoals});rivalAfterFixture(g,result.rows,result.reports);globalThis.committed=JSON.stringify(state.teamDynamics);rivalAfterFixture(g,result.rows,result.reports)");
assert.equal(r('JSON.stringify(state.teamDynamics)'),r('committed'));
console.log('PASS: training participation/cap/idempotence, shared AI day, old saves, reload, active-line attribute causality, unaffected shooting/RNG, local goal attribution and fixture idempotence.');
// Exercise the public calendar -> actual session path, not just the training helper.
{
 const b=boot(),t=b.run;
 t("startCareerWithClub('HV71');medicalRoll=()=>.999;calendarSetSession(state.calendar.date,'type','tactics');globalThis.day=state.calendar.date");
 assert.equal(t('runTrainingSession()'),true);
 assert.equal(t('dynamicsClub().lastTrainingDate'),t('day'));
 assert.ok(t('Object.values(dynamicsClub().pairs).some(p=>p.training===.4)'));
 console.log('PASS: the actual scheduled training session reaches match chemistry.');
}
