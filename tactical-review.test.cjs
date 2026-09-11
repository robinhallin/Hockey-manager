const assert=require('node:assert/strict');
const {boot}=require('./scripts/career-test-fixture.cjs');
const app=boot(),r=app.run;
r(`startCareerWithClub('HV71');state.calendar.date=calendarTarget();startMatch();pauseMatch();`);
assert.equal(r('Array.isArray(coachEvidence())'),true,'Post-match evidence must not be overwritten by live observations');
assert.equal(r('coachEvidence().length'),0);
assert.ok(r('coachCycleView().includes("Tränarens fokus")'));
// Use a known recorded match interval to verify exact strength/time accounting.
r(`state.live.minute=5;state.live.analysis.strengthSeconds.even=240;state.live.analysis.shots=[
 {side:'own',situation:'even',dangerous:true,time:100},
 {side:'opponent',situation:'even',dangerous:true,time:200},
 {side:'opponent',situation:'pk',dangerous:true,time:220}];
 matchOrder('forecheck','passive');`);
assert.equal(r('state.live.tacticalReviews.length'),1);
assert.equal(r('state.live.tacticalReviews[0].baseline.against'),1,'Boxplay is excluded');
assert.equal(r('state.live.tacticalReviews[0].baseline.seconds'),240);
assert.equal(r('state.tacticalPlan.forecheck'),'passive');
assert.equal(r('state.live.running'),false);
r(`matchOrder('tempo','low');`);
assert.equal(r('state.live.tacticalReviews.length'),1,'Same stoppage groups the decision');
assert.equal(r('state.live.tacticalReviews[0].after.tempo'),'low');
r(`state.live.minute=9;state.live.analysis.strengthSeconds.even=420;state.live.analysis.shots.push({side:'own',situation:'even',dangerous:true,time:400});`);
assert.equal(r('tacticalReviewSnapshot()[0].result.seconds'),180);
assert.equal(r('tacticalReviewSnapshot()[0].result.dangerFor'),1);
assert.equal(r('tacticalReviewSnapshot()[0].result.dangerAgainst'),0);
const before=r('JSON.stringify(state)');
assert.ok(r('tacticalReviewView(tacticalReviewSnapshot()).includes("Farliga lägen per 10 minuter")'));
assert.equal(r('JSON.stringify(state)'),before,'Reading the comparison is side-effect free');
assert.equal(r('tacticalReviewView(undefined)'),'', 'Old archived reports must not inherit the current match');
r(`matchOrder('physicality','safe');state.live.minute=10;state.live.analysis.strengthSeconds.even=480;`);
assert.equal(r('tacticalReviewSnapshot()[0].result.seconds'),180,'Closed intervals never keep growing');
assert.equal(r('tacticalReviewSnapshot()[1].result.seconds'),60);
assert.ok(r('tacticalReviewView(tacticalReviewSnapshot()).includes("Minst tre minuter")'));
r('save()');const restored=boot(app.storage.value);
assert.equal(restored.run('JSON.stringify(tacticalReviewSnapshot())'),r('JSON.stringify(tacticalReviewSnapshot())'));
r('state.live.finished=true;globalThis.report=analysisSnapshot();state.analysis.matches.unshift(JSON.parse(JSON.stringify(report)));');
assert.equal(r('report.tacticalReviews.length'),2);
assert.equal(r('coachEvidence().length'),1,'Completed match reaches the training evidence cycle');
assert.ok(r('coachCycleView().includes("Välj vad laget ska arbeta med")'));
assert.ok(r('matchesAnalysisView().includes("Dina taktiska ändringar")'));
console.log('PASS: distinct live/post-match evidence, real order handlers, strength separation, grouped changes, exposure rates, saved reviews and archived match rendering.');
// Real engine continuation: legitimate stoppages, auto-pauses and special teams must not make the test stop observing play.
const live=boot(),sim=live.run;
sim(`startCareerWithClub('HV71');state.calendar.date=calendarTarget();startMatch();`);
sim(`for(let i=0;i<300&&!state.live.finished;i++){if(!state.live.running)startMatch();if(state.live.running)liveStep();}matchOrder('forecheck','passive');globalThis.reviewClock=analysisClock();for(let i=0;i<800&&!state.live.finished&&analysisClock()-reviewClock<30;i++){if(!state.live.running)startMatch();if(state.live.running)liveStep();}`);
assert.equal(sim('studioEngine().teams[0].forecheck'),'passive');
assert.ok(sim('analysisClock()-reviewClock')>0,'the production match must advance after the tactical order');
assert.equal(sim('tacticalReviewSnapshot()[0].result.for'),sim(`state.live.analysis.shots.filter(s=>s.side==='own'&&s.situation==='even').length-state.live.tacticalReviews[0].totals.for`));
console.log('PASS: continued production match applies the tactical order and records actual subsequent play.');
