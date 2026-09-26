'use strict';
const assert=require('node:assert/strict');
const {boot}=require('./scripts/career-test-fixture.cjs');
const app=boot(),r=app.run;
r(`startCareerWithClub('HV71');state.calendar.date=calendarTarget();startMatch();pauseMatch();
 globalThis.e=studioEngine();for(const side of [0,1]){e.teams[side].line=0;e.teams[side].pair=0;e.installUnit(side);}
 globalThis.actor=e.skaters(0).find(a=>a.role==='LW');globalThis.id=String(actor.player.id);
 globalThis.initialFit=PLAYER_TASKS.creator.keys.reduce((n,key)=>n+state.live.analysis.players[id].startAttributes[key],0)/3;
 trackIceTime(120);setPlayerTask('forwards',0,'creator');
 for(const key of PLAYER_TASKS.creator.keys)playerById(id).attributes[key]=20;
 trackIceTime(240);`);
assert.equal(r('state.live.analysis.players[id].taskUsage.retriever.seconds'),120);
assert.equal(r('state.live.analysis.players[id].taskUsage.creator.seconds'),240);
assert.equal(r('state.live.analysis.players[id].taskUsage.creator.fit'),r('initialFit'),'fit is frozen at match start, before later development');
// A requested line change is not an immediate player substitution. Record the
// actual actor with the same task slot used by the simulation during that shift.
r(`e.teams[0].line=1;setPlayerTask('forwards',3,'finisher');trackIceTime(60);`);
assert.equal(r('state.live.analysis.players[id].taskUsage.finisher.seconds'),60);
assert.equal(r('state.live.analysis.players[String(state.lines.forwards[3])].taskUsage'),undefined,'unused player gets no assignment minutes');
assert.equal(r('Object.values(state.live.analysis.players).filter(p=>p.taskUsage).length'),5);
assert.ok(r('Object.values(state.live.analysis.players).filter(p=>p.pos==="MV").every(p=>!p.taskUsage)'));
// Special teams, empty nets and three-on-three cannot inflate a 5v5 assessment.
const taskLedger=()=>r('JSON.stringify(Object.values(state.live.analysis.players).map(p=>p.taskUsage||null))');
const beforeSpecial=taskLedger();
r(`e.givePenalty(1,e.skaters(1)[0].player.name);trackIceTime(60);e.endPenalty(true);
 e.givePenalty(0,e.skaters(0)[0].player.name);trackIceTime(60);e.endPenalty(true);
 globalThis.actors=e.actors.slice();e.actors=e.actors.filter(a=>!(a.side===1&&a.role==='G'));trackIceTime(30);e.actors=actors;
 e.actors=e.actors.filter(a=>a.role==='G'||!['LW','RW'].includes(a.role));trackIceTime(30);e.actors=actors;`);
assert.equal(taskLedger(),beforeSpecial);
// This save represents an older, unfinished match: only subsequent usage can
// be observed, and it is explicitly insufficient for a complete task grade.
r('save()');
const oldSave=JSON.parse(app.storage.value);
delete oldSave.live.analysis.taskUsageVersion;delete oldSave.live.analysis.taskUsagePartial;
for(const p of Object.values(oldSave.live.analysis.players))delete p.taskUsage;
const old=boot(JSON.stringify(oldSave)),q=old.run;
q(`trackIceTime(200);state.live.finished=true;finishAnalysis();`);
assert.equal(q('state.live.performance.taskUsagePartial'),true);
assert.ok(q('state.live.performance.taskRows.length>0&&state.live.performance.taskRows.every(r=>r.seconds===200&&r.stars===null)'));
assert.match(q('performanceTaskView(state.live.performance)'),/bara under en del av matchen/);
// Commit through the ordinary archive path; repeated views and completion must
// preserve both grades and the task change within this match.
r(`state.live.finished=true;finishAnalysis();globalThis.report=state.analysis.matches[0];`);
assert.equal(r('report.performance.taskRows.find(r=>String(r.id)===id&&r.key==="retriever").stars'),null,'less than three task minutes is unrated');
assert.ok(r('Number.isFinite(report.performance.taskRows.find(r=>String(r.id)===id&&r.key==="creator").stars)'));
const archived=r('JSON.stringify(report.performance)'),tasks=r('JSON.stringify(performanceTaskRows(report.performance))');
r(`state.lines.forwards.reverse();state.lines.defense.reverse();setPlayerTask('forwards',0,'twoWay');
 // Controlled post-transfer registry; negotiation rules have separate suites.
 globalThis.departing=findPlayerAnywhere(id);state.clubRosters[managerClub()]=managerRoster().filter(p=>String(p.id)!==id);
 state.clubRosters[state.live.opponent].push(departing);departing.club=state.live.opponent;
 syncManagerRoster();repairMedicalLines();ensureSpecialTeams();
 for(const p of managerRoster())for(const key of Object.keys(p.attributes))p.attributes[key]=1;
 finishAnalysis();performanceView(report.performance);save();`);
assert.equal(r('managerRoster().some(p=>String(p.id)===id)'),false);
assert.equal(r('findPlayerAnywhere(id).club'),r('state.live.opponent'));
assert.equal(r('JSON.stringify(report.performance)'),archived,'lineup, role, attribute and transfer changes cannot rewrite a report');
assert.equal(r('JSON.stringify(performanceTaskRows(report.performance))'),tasks);
assert.equal(r('JSON.stringify(validateSaveText(saveExportText()).analysis.matches[0].performance)'),archived,'export/import keeps the frozen evidence');
const restored=boot(app.storage.value);
assert.equal(restored.run('JSON.stringify(state.analysis.matches[0].performance)'),archived);
r(`state.managerClub=state.live.opponent;syncManagerRoster();`);
assert.equal(r('JSON.stringify(performanceTaskRows(report.performance))'),tasks,'new manager club does not change the historical task rows');
// Legacy completed reports keep their existing performance data without
// inventing tasks from today's lineup or silently replacing old ratings.
r(`globalThis.legacyReport=JSON.parse(JSON.stringify(report));delete legacyReport.performance.taskRows;delete legacyReport.performance.taskUsagePartial;`);
const legacy=r('JSON.stringify(legacyReport)');
assert.match(r('performanceView(legacyReport.performance)'),/äldre rapporten saknar registrerade spelaruppgifter/);
assert.equal(r('JSON.stringify(legacyReport)'),legacy);
// The active report and archive must use the chosen match's decisions even
// while a different match (or no match) is live. No duplicate focus IDs.
r(`globalThis.decision=label=>({time:300,end:600,partial:false,label,before:{},after:{},
 baseline:{seconds:300,for:6,against:4,dangerFor:1,dangerAgainst:2},result:{seconds:300,for:6,against:4,dangerFor:4,dangerAgainst:1},
 coachDecision:{key:'quality',label,choice:'apply',evidence:'Sex avslut.',risk:'Färre snabba skott.'}});
 report.tacticalReviews=[decision('Arkiverat beslut')];
 globalThis.other=JSON.parse(JSON.stringify(report));other.id='another-match';other.tacticalReviews=[decision('Annat beslut')];
 state.analysis.matches.unshift(other);state.analysis.selected=report.id;matchesUI.analysis='overview';
 state.live.tacticalReviews=[decision('Levande beslut')];matchDesk.tab='report';`);
assert.equal(r('analysisMatchVerdict(report).decision.coachDecision.label'),'Arkiverat beslut');
assert.equal(r('analysisLiveReport().id'),r('report.id'),'the finished match panel looks up its ID, not the newest archived match');
const html=r('matchesAnalysisView()');
assert.match(html,/Tre svar efter matchen/);assert.match(html,/Arkiverat beslut/);assert.doesNotMatch(html,/Annat beslut|Levande beslut/);
assert.equal([...html.matchAll(/id="match-coach-report-300"/g)].length,1);
assert.match(r('matchDeskContent()'),/Tre svar efter matchen/);assert.match(r('matchDeskContent()'),/Arkiverat beslut/);
assert.doesNotMatch(r('matchDeskContent()'),/Annat beslut|Levande beslut/);
const readOnly=r('JSON.stringify(state)');
r('performanceView(report.performance);analysisMatchVerdictView(report);matchDeskContent();matchesAnalysisView();');
assert.equal(r('JSON.stringify(state)'),readOnly,'rendering historical evidence leaves match state and RNG untouched');
r('state.live=null;');assert.equal(r('analysisMatchVerdict(report).decision.coachDecision.label'),'Arkiverat beslut');
r('report.tacticalReviews=[];');assert.equal(r('analysisMatchVerdict(report).decision'),null);
r('report.shots=[];report.events=[];');assert.equal(r('analysisMatchVerdict(report).factor.label'),'Jämn matchbild');
r('report.partial=true;');assert.equal(r('analysisMatchVerdict(report)'),null);
console.log('PASS: actual task exposure, mid-match changes, initial fit, special-teams exclusion, old-save migration, transfer/club/lineup invariance, save/import/reload and match-specific active reports.');
