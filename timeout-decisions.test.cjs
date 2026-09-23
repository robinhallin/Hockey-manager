'use strict';
const assert=require('node:assert/strict');
const {boot}=require('./scripts/career-test-fixture.cjs');
const a=boot(),r=a.run;
r("startCareerWithClub('HV71');state.calendar.date=calendarTarget();startMatch();medicalRoll=()=>.999;for(let i=0;i<200;i++)studioStep();pauseMatch();globalThis.e=studioEngine();globalThis.p=studioPlayer(0,e.skaters(0)[0].player.id);globalThis.q=studioPlayer(1,e.skaters(1)[0].player.id);p.attributes.stamina=q.attributes.stamina=10;p.fatigue=q.fatigue=20;state.live.rink.oppFatigue[q.id]=0;state.live.energy.players[p.id].level=state.live.energy.players[q.id].level=40;globalThis.expected=timeoutOwnPlayers().find(x=>x.id===p.id).after;globalThis.before=JSON.stringify([e.rng,e.time,e.score,e.puck,e.penaltyList(),state.live.iceTime,p.fatigue,q.fatigue,state.live.momentum]);globalThis.attribute=e.attribute(e.skaters(0)[0],'passing');");
const stateBefore=r('JSON.stringify(state)');r('timeoutDecisionView();timeoutOwnPlayers()');assert.equal(r('JSON.stringify(state)'),stateBefore);
r('matchAction("timeout")');
assert.equal(r('state.live.timeoutUsed'),true);assert.equal(r('state.live.running'),false);
assert.equal(r('matchEnergy(p)'),r('expected'));
assert.equal(r('matchEnergy(p)'),r('matchEnergy(q)'),'equal stamina, initial energy and load get equal recovery');
assert.equal(r('matchEnergy(p)'),45.94);
assert.ok(r("e.attribute(e.skaters(0)[0],'passing')")>r('attribute'),'recovered energy reaches actual match attributes');
assert.equal(r('e.teams[0].players.find(x=>x.id===p.id).energy'),r('matchEnergy(p)'));
assert.equal(r('JSON.stringify([e.rng,e.time,e.score,e.puck,e.penaltyList(),state.live.iceTime,p.fatigue,q.fatigue,state.live.momentum])'),r('before'),'no free time, score, workload or momentum boost');
const once=r('JSON.stringify([state.live.energy,state.live.timeoutReports])');r('matchAction("timeout")');assert.equal(r('JSON.stringify([state.live.energy,state.live.timeoutReports])'),once);
r('save()');const loaded=boot(a.storage.value);assert.equal(loaded.run('JSON.stringify(state.live.timeoutReports)'),r('JSON.stringify(state.live.timeoutReports)'));
loaded.run('useTimeout()');assert.equal(loaded.run('JSON.stringify(state.live.energy)'),r('JSON.stringify(state.live.energy)'));
assert.match(r('timeoutDecisionView()'),/#player\//);
// Identical seed and decisions stay identical across display modes after recovery.
const states=[];
for(const mode of ['full','highlights','commentary']){
 const app=boot(a.storage.value),run=app.run;
 run(`medicalRoll=()=>.999;rinkMode('${mode}');startMatch();for(let i=0;i<250;i++)studioStep();pauseMatch();`);
 states.push(run('JSON.stringify([studioEngine().rng,studioEngine().score,studioEngine().puck,state.live.energy,state.live.analysis.shots])'));
}
assert.equal(states[0],states[1]);assert.equal(states[0],states[2]);
// The live AI uses the same pause once, without consuming the manager's choice.
const b=boot(),s=b.run;
s("startCareerWithClub('HV71');state.calendar.date=calendarTarget();startMatch();medicalRoll=()=>.999;for(let i=0;i<30;i++)studioStep();pauseMatch();state.live.period=3;state.live.minute=18;state.live.second=0;state.live.hv=2;state.live.opp=1;state.live.aiTeam.lastDecisionBucket=-1;rivalLiveDecision();");
assert.equal(s('state.live.aiTeam.timeout'),true);assert.equal(s('state.live.timeoutUsed'),false);
assert.equal(s('state.live.timeoutReports[0].seconds'),30);
const aiReport=s('JSON.stringify(state.live.timeoutReports)');s('rivalLiveDecision()');assert.equal(s('JSON.stringify(state.live.timeoutReports)'),aiReport);
// Background pauses recover both rosters. Force the existing coach decision in this fixture only.
const c=boot(),t=c.run;
t("startCareerWithClub('HV71');globalThis.game=state.schedule.find(g=>g.home!==managerClub()&&g.away!==managerClub());globalThis.decide=aiCoachDecision;aiCoachDecision=(...args)=>({...decide(...args),timeout:true});globalThis.recover=timeoutEnergy;globalThis.calls=0;timeoutEnergy=(...args)=>{calls++;return recover(...args)};globalThis.roster=JSON.stringify(state.clubRosters);globalThis.result=rivalSimulate(game,{regulationOnly:true});");
assert.equal(t('JSON.stringify(state.clubRosters)'),t('roster'));
assert.equal(t('calls'),t('result.rows.length*2'),'two team timeouts each recover every participant');
assert.equal(t('result.duration'),3600);
assert.ok(t('result.reports.every(report=>report.decisions.some(d=>d.reason.includes("30 sekunders")))'));
t('globalThis.again=rivalSimulate(game,{regulationOnly:true})');assert.equal(t('JSON.stringify(again)'),t('JSON.stringify(result)'));
// Complete the original production fixture and verify that observations are archived.
r('globalThis.steps=0;while(!state.live.finished&&steps++<65000){if(!state.live.running){while(medicalPending())medicalDecisionAccept();startMatch();}studioStep();}');
assert.equal(r('state.live.finished'),true);assert.equal(r('state.live.analysis.saved'),true);
assert.equal(r('state.analysis.matches[0].timeoutReports[0].players.find(x=>x.id===p.id).after'),r('expected'));
assert.match(r('timeoutReportView(state.analysis.matches[0])'),/inte en säker effekt/);
assert.equal(r('timeoutReportView({})'),'','old reports must not invent timeout evidence');
r('save()');const final=boot(a.storage.value);assert.equal(final.run('JSON.stringify(state.analysis.matches[0].timeoutReports)'),r('JSON.stringify(state.analysis.matches[0].timeoutReports)'));
console.log('PASS: fair real energy recovery for manager/AI/background, actual attribute effect, unchanged RNG/clocks/score/workload, idempotence/reload, display-mode continuation equality and full archived match. Automated workflow, not visual playtesting.');
