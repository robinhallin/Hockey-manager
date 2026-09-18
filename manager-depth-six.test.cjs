'use strict';
const assert=require('node:assert/strict');
const {boot}=require('./scripts/career-test-fixture.cjs');
const app=boot(),r=app.run;
r("startCareerWithClub('HV71');ensureLines();globalThis.p=managerRoster().find(p=>p.pos==='C');");
// Recurring real combinations, isolated by club/year, and scoped follow-up.
r(`globalThis.report=(id)=>({id,year:state.season.year,club:managerClub(),date:state.calendar.date,finished:true,shots:[],events:[],players:[],units:[{key:'line-a',kind:'forward',names:['A','B','C'],seconds:300,dangerFor:1,dangerAgainst:4}]});state.analysis.matches=[report('a'),report('b'),report('c')];globalThis.rec=managerWeekRecommendation();`);
assert.equal(r('rec.diagnosis.unitKey'),'line-a');
r("managerWeekAdopt(rec.key,rec.evidenceId);coachMatchDone({...report('next'),units:[]});");
assert.equal(r('coachFocus().diagnosis.results[0].seconds'),0);
assert.match(r('coachDiagnosisView(coachFocus())'),/Ingen registrerad istid/);
assert.equal(r('coachFocus().diagnosis.baseline.length'),3);
// A single extreme game is never called a recurring formation problem.
r("state.analysis.matches=[report('single')]");
assert.equal(r('managerWeekRecommendation().diagnosis'),undefined);
// PP diagnosis schedules actual PP training, and does not count a skills pass.
r(`state.analysis.matches=['pp1','pp2','pp3'].map(id=>({...report(id),units:[{key:'pp',kind:'pp',names:['A'],seconds:240,dangerFor:0,dangerAgainst:0}]}));state.analysis.coachFocus=null;rec=managerWeekRecommendation();managerWeekAdopt(rec.key,rec.evidenceId);coachPlan();coachTrainingDone({date:'2026-01-01',trained:10,type:'skills'});`);
assert.equal(r('calendarSession(coachFocus().planned).type'),'powerplay');
assert.equal(r('coachFocus().sessions.length'),0);
r("coachTrainingDone({date:'2026-01-02',trained:10,type:'powerplay'})");
assert.equal(r('coachFocus().sessions.length'),1);
// A plan displaces a named player but cannot change formations, money or roles.
r(`globalThis.candidate=Object.values(state.clubRosters).flat().find(q=>!isOwnPlayer(q)&&q.pos==='C');globalThis.before=JSON.stringify([state.lines,state.money,managerRoster().map(p=>p.promisedRole)]);squadPlacementSave(candidate.id,1,roleWeights(candidate)[0]);`);
assert.equal(r('JSON.stringify([state.lines,state.money,managerRoster().map(p=>p.promisedRole)])'),r('before'));
assert.equal(r('squadPlacementPlan(candidate).displaced'),r('state.lines.forwards[1]'));
assert.match(r('squadPlacementView(candidate)'),/Tar platsen från/);
assert.equal(r('squadPlacementSave(candidate.id,99,roleWeights(candidate)[0])'),false);
assert.equal(r("squadPlacementSave(candidate.id,1,'Målvakt')"),false);
r('save()');let reload=boot(app.storage.value);
assert.equal(reload.run('JSON.stringify(state.recruitment.placementPlans)'),r('JSON.stringify(state.recruitment.placementPlans)'));
// Personality and previous treatment affect new promises, frozen at decision.
r(`state.stories.active=[];state.stories.started=[];p.social.ambition=18;p.social.sensitivity=18;p.social.loyalty=18;p.social.missed=2;p.social.trust=40;
globalThis.s=storiesCreate('talent',[p.id],'En chans','Underlag');storiesChoose(s.id,'powerplay');globalThis.frozen=JSON.stringify(s.expectation.reactions);p.social.ambition=1;p.social.sensitivity=1;
globalThis.sample=(id,ppSeconds=120,playerSeconds=75)=>({id,club:managerClub(),year:state.season.year,date:state.calendar.date,finished:true,own:1,against:0,opponent:'AIK',players:[{id:p.id,seconds:600}],units:ppSeconds?[{kind:'pp',ids:[p.id],seconds:playerSeconds},{kind:'pp',ids:['other'],seconds:ppSeconds-playerSeconds}]:[]});storiesAfterMatch(sample('no-pp',0,0));`);
assert.equal(r('s.expectation.eligible'),0);
assert.equal(r('JSON.stringify(s.expectation.reactions)'),r('frozen'));
assert.equal(r('s.expectation.reactions[s.ids[0]].missed.change'),-7);
r("for(let i=0;i<4;i++)storiesAfterMatch(sample('pp-story-'+i));");
assert.equal(r('s.firstHonoured'),true);
assert.equal(r('p.social.trust'),45);
// Legacy story has unchanged choices and effects.
r("globalThis.legacy={...s,personalVersion:undefined,stage:1,expectation:null};");
assert.equal(r('storiesChoices(legacy)[0].seconds'),480);
// Track real training participation, preserve duplicate guard and source labels.
r("developmentReviewStart(p.id);globalThis.plan=JSON.stringify(p.developmentReview);developmentReviewStart(p.id)");
assert.equal(r('JSON.stringify(p.developmentReview)'),r('plan'));
r("trainingPlanRecord(p,{type:'skills'},{rest:false},p.fatigue,'passing');");
assert.equal(r('developmentReviewEvidence(p).trained'),1);
r("p.trainingProgress.passing=0;p.attributes.passing=5;p.developmentModel.ceiling.passing=20;developmentAdvance(p,'passing',60,'Träningsarbete');developmentAdvance(p,'passing',60,'Matchvana (senior)');");
assert.match(r('p.developmentModel.history[0].reason'),/Träningsarbete.*Matchvana/);
assert.doesNotMatch(r('developmentReviewView(p)'),/ceiling|peakOffset|pace/);
r('save()');reload=boot(app.storage.value);
assert.equal(reload.run('JSON.stringify(managerRoster().find(p=>p.id==='+JSON.stringify(r('p.id'))+').developmentReview)'),r('JSON.stringify(p.developmentReview)'));
// Same aggregate ability, different individual skills: actual decision profile differs.
r(`globalThis.baseAttrs=Object.fromEntries(MatchWorld2.KEYS.map(k=>[k,12]));globalThis.args={creation:12,resistance:12,attackAttributes:baseAttrs,defenseAttributes:baseAttrs};globalThis.passer=MatchWorld2.backgroundDecisionProfile({...args,attackAttributes:{...baseAttrs,passing:18,vision:18,shooting:6}});globalThis.shooter=MatchWorld2.backgroundDecisionProfile({...args,attackAttributes:{...baseAttrs,passing:6,vision:6,shooting:18}});`);
assert.ok(r('passer.pass>shooter.pass&&shooter.shoot>passer.shoot'));
assert.equal(r('MatchWorld2.backgroundShotContext(args,()=>0).oneTimer'),true);
console.log('PASS: scoped coaching, real PP scheduling, saved placement without side effects, personal and legacy promises, actual PP exposure, development evidence and real-attribute chance building.');
// Background and live must apply the same calibration once, after readiness.
r(`globalThis.originalReadiness=readinessAttribute;globalThis.originalShot=StudioHockey.evaluateShot;globalThis.inputs=[];
readinessAttribute=()=>17.4;StudioHockey.evaluateShot=input=>{inputs.push(input);return originalShot(input);};
rivalSimulate(state.schedule.find(g=>g.home!==managerClub()&&g.away!==managerClub()));
readinessAttribute=originalReadiness;StudioHockey.evaluateShot=originalShot;`);
assert.ok(r('inputs.length')>20);
assert.ok(r('inputs.every(input=>Object.values(input.shooter).every(v=>v===matchCalibrationAttribute(17.4)))'));
console.log('PASS: background attributes use the same once-only post-readiness calibration as the spatial engine.');
