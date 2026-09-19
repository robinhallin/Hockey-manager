const test=require('node:test');const assert=require('node:assert/strict');const {boot}=require('./scripts/career-test-fixture.cjs');
test('brief applies real orders, survives reload and refuses stale or live edits',()=>{
 const a=boot(),r=a.run;r("startCareerWithClub('HV71');matchBriefChoose('defense');matchBriefMatchup('matchupLine','2');matchBriefMatchup('matchupTarget','0')");
 assert.equal(r('state.tactic'),'defense');assert.equal(r('state.tacticalPlan.forecheck'),'passive');assert.equal(r('state.tacticalPlan.matchupLine'),'2');
 const saved=r('JSON.stringify(state.matchBrief)');assert.equal(boot(a.storage.value).run('JSON.stringify(state.matchBrief)'),saved);
 r('state.calendar.date=matchBriefFixture().date');assert.equal(r('matchBriefCapture(matchBriefFixture().opponent).goal'),'defense');
 assert.equal(r("matchBriefCapture('Wrong club')"),null);
 r('state.matchBrief.year--;state.matchBrief.key="old"');assert.equal(r('matchBriefCapture(matchBriefFixture().opponent)'),null);
 r("state.live={finished:false};matchBriefChoose('attack')");assert.equal(r('state.tactic'),'defense');
});
test('complete exposure required, rates use even strength and archived report never infers causality',()=>{
 const a=boot(),r=a.run;r("startCareerWithClub('HV71');matchBriefChoose('attack')");
 r("globalThis.sample={strengthSeconds:{even:600,pp:120},shots:[{situation:'even',dangerous:true,side:'own'},{situation:'pp',dangerous:true,side:'own'}]}");
 assert.equal(r('matchBriefMeasures(sample).own'),1);
 assert.equal(r('matchBriefMeasures({...sample,strengthPartial:true})'),null);
 assert.equal(r('matchBriefMeasures({...sample,strengthSeconds:{even:599}})'),null);
 assert.match(r('matchBriefReport({...sample,matchBrief:state.matchBrief})'),/Minst tre tidigare/);
 assert.match(r('matchBriefReport({...sample,matchBrief:state.matchBrief})'),/bevisar inte/);
});
test('capture and archive are immutable and old saves are supported',()=>{
 const a=boot(),r=a.run;r("startCareerWithClub('HV71');matchBriefChoose('pressure');state.calendar.date=calendarTarget();createMatch()");
 assert.equal(r('state.live.matchBrief.goal'),'pressure');r("state.matchBrief.goal='defense'");assert.equal(r('state.live.matchBrief.goal'),'pressure');
 r('ensureAnalysis();globalThis.snap=analysisSnapshot()');assert.equal(r('snap.matchBrief.goal'),'pressure');r("state.live.matchBrief.goal='attack'");assert.equal(r('snap.matchBrief.goal'),'pressure');
 r('delete state.live.matchBrief');assert.equal(r('matchBriefLive()'),'');
});
