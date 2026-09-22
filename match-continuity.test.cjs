'use strict';
const assert=require('node:assert/strict');
const {boot}=require('./scripts/career-test-fixture.cjs');
const app=boot(),r=app.run;
r("startCareerWithClub('HV71');state.tactic='balanced';state.tacticalPlan.tempo='low';state.tacticalPlan.shotChoice='shoot';");
const orders=r('JSON.stringify(tacticalReviewPlan())');
r("matchBriefChoose('continuity')");
assert.equal(r('JSON.stringify(tacticalReviewPlan())'),orders);
assert.equal(r('state.matchBrief.goal'),'continuity');
assert.match(r('matchBriefView(matchBriefFixture().opponent)'),/Följ vår nuvarande plan/);
assert.equal(boot(app.storage.value).run('state.matchBrief.goal'),'continuity');
r('state.calendar.date=calendarTarget();startMatch();pauseMatch();save()');
assert.equal(r('state.live.matchBrief.goal'),'continuity');
// A purely observational brief cannot change the seeded production simulation.
const control=boot(app.storage.value),q=control.run;
q('delete state.live.matchBrief');
r('for(let i=0;i<250;i++)studioStep()');q('for(let i=0;i<250;i++)studioStep()');
assert.equal(r('JSON.stringify([studioEngine().rng,studioEngine().score,studioEngine().puck,state.live.analysis.shots])'),q('JSON.stringify([studioEngine().rng,studioEngine().score,studioEngine().puck,state.live.analysis.shots])'));
assert.match(r('matchBriefReport({...analysisSnapshot(),finished:true})'),/ingen förutbestämd förbättringsriktning/);
// Real physicality order changes engine attributes, not morale or energy.
r(`pauseMatch();state.live.minute=5;state.live.second=0;state.live.analysis.shots=[];
globalThis.actor=studioEngine().skaters(0)[0];actor.player.attributes.discipline=10;actor.player.attributes.checking=10;
state.tacticalPlan.physicality='balanced';state.live.tacticalReviews=[];
state.live.analysis.events=[{type:'penalty',side:'own',time:230,playerId:actor.player.id,playerName:'Samma Namn'}, {type:'penalty',side:'own',time:260,playerId:'another-id',playerName:'Samma Namn'}];
globalThis.disciplineBefore=studioEngine().attribute(actor,'discipline');globalThis.checkBefore=studioEngine().attribute(actor,'checking');
globalThis.beforeEnergy=JSON.stringify(state.live.energy);`);
assert.match(r('matchEvidenceBody()'),/data-player-id="another-id"/);
r("matchCoachChoose('discipline','apply');studioSyncPlans()");
assert.equal(r('state.tacticalPlan.physicality'),'safe');
assert.ok(r("studioEngine().attribute(actor,'discipline')")>r('disciplineBefore'));
assert.ok(r("studioEngine().attribute(actor,'checking')")<r('checkBefore'));
assert.equal(r('JSON.stringify(state.live.energy)'),r('beforeEnergy'));
assert.equal(r('state.live.running'),false);
assert.equal(r('matchCoachCurrent().row.coachDecision.discipline.count'),2);
assert.equal(r('matchCoachCurrent().row.coachPenalties'),0);
// All strengths count, future/other-side events do not; new orders close the period.
r(`state.live.minute=8;state.live.analysis.events.push({type:'penalty',side:'own',time:400,situation:'pk'},{type:'penalty',side:'opponent',time:410},{type:'penalty',side:'own',time:600});`);
assert.equal(r('matchCoachCurrent().row.coachPenalties'),1);
assert.equal(r('matchCoachOutcome(matchCoachCurrent().row).enough'),true);
assert.match(r('matchEvidenceBody()'),/alla spelformer: 2 under 5:00 före · 1 under 3:00 efter/);
r("matchOrder('tempo','normal');state.live.minute=11");
assert.equal(r('matchCoachCurrent().row.coachPenalties'),1);
r('save()');
const restored=boot(app.storage.value);
assert.equal(restored.run('matchCoachCurrent().row.coachPenalties'),1);
r('globalThis.archived=JSON.parse(JSON.stringify(analysisSnapshot()));');
assert.match(r('matchCoachFollowupView(archived.tacticalReviews[0],true)'),/1 under 3:00 efter/);
r('state.live.analysis.events=[]');
assert.match(r('matchCoachFollowupView(archived.tacticalReviews[0],true)'),/1 under 3:00 efter/);
// A stale discipline button cannot apply after the events expire.
r("matchCoachReview();state.tacticalPlan.physicality='hard';matchCoachChoose('discipline','apply')");
assert.equal(r('state.tacticalPlan.physicality'),'hard');
assert.equal(r("matchCoachEvidence({strengthPartial:true,shots:Array.from({length:6},()=>({time:250,situation:'even',side:'own',dangerous:false}))},300).advice.length"),0);
// Report shortcut must preserve an existing training decision and navigate correctly.
r("state.live.finished=true;state.analysis.coachFocus={key:'defense',club:managerClub(),year:state.season.year,date:state.calendar.date,target:3,baseline:[],seen:[],sessions:[],results:[]};globalThis.focus=JSON.stringify(coachFocus());matchBriefTraining('attack')");
assert.equal(r('JSON.stringify(coachFocus())'),r('focus'));
assert.equal(r('state.page'),'home');assert.equal(r('officeUI.panel'),'followup');
console.log('PASS: unchanged-plan simulation parity, real discipline tradeoff, player IDs, timed all-strength evidence, closed/archive/reload observations, stale guards and protected training focus.');
