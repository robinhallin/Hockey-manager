'use strict';
const assert=require('node:assert/strict');
const r=require('./scripts/headless-career.cjs').headlessCareer().run;
r("startCareerWithClub('HV71');globalThis.g=state.schedule.find(g=>g.home!==managerClub()&&g.away!==managerClub());globalThis.initial=JSON.stringify(state);");
let sawGoal=false,sawPenalty=false,sawRebound=false;
for(let round=1;round<=24;round++){
 r('state=JSON.parse(initial)');
 const result=JSON.parse(r(`JSON.stringify(rivalSimulate({...g,round:${round}},{regulationOnly:true}))`));
 assert.equal(result.eventStream.meta.recorded,true);
 let last=0;
 for(const e of result.eventStream.events){assert.ok(e.seconds>=last&&e.seconds<=3600);last=e.seconds;assert.ok(e.seconds>0);if(e.type==='penalty')sawPenalty=true;if(e.context?.rebound)sawRebound=true;if(e.outcome==='goal')sawGoal=true;
  if(e.type==='shot'){assert.ok(e.onIce.includes(e.playerId));assert.ok(e.assists.every(a=>a.id!==e.playerId&&e.onIce.includes(a.id)));assert.ok(Number.isFinite(e.probability));}
 }
 for(const [side,report] of result.reports.entries()){
  assert.equal(report.strengthEvidence.reduce((n,x)=>n+x.seconds,0),3600);
  for(const key of ['shots','goals','assists','pim'])for(const row of result.rows.filter(p=>p.club===report.club&&p.pos!=='MV'))assert.equal(result.eventSummary.players[side+':'+row.id]?.[key]||0,row[key],`${round} ${row.name} ${key}`);
  for(const row of result.rows.filter(p=>p.club===report.club))assert.equal(result.eventStream.ice[side+':'+row.id]||0,row.seconds);
  assert.equal(report.strengthEvidence.reduce((n,x)=>n+x.shots,0),report.shots);
  assert.equal(report.strengthEvidence.reduce((n,x)=>n+x.attempts,0),report.attempts);
  assert.ok(Math.abs(report.strengthEvidence.reduce((n,x)=>n+x.xg,0)-report.attemptXg)<1e-9);
 }
}
assert.ok(sawGoal&&sawPenalty&&sawRebound);
console.log('PASS: 24 fixtures with chronological native events, correct scorers/assists, penalties, rebounds, ice time and strength ledgers.');
r("globalThis.attrs=Object.fromEntries(MatchWorld2.KEYS.map(k=>[k,12]));globalThis.unit={creation:12,resistance:12,plan:{style:'counter'}};");
assert.ok(r('MatchWorld2.backgroundAttemptRate({...unit,pk:true})<MatchWorld2.backgroundAttemptRate(unit)*.6'));
assert.ok(r("MatchWorld2.backgroundAttemptRate({...unit,pk:true,plan:{...unit.plan,counter:'safe'}})<MatchWorld2.backgroundAttemptRate({...unit,pk:true})"));
assert.equal(r("MatchWorld2.specialTeamsEdge(attrs,attrs,'oneThreeOne','box')"),r("MatchWorld2.specialTeamsEdge(attrs,attrs,'131','box')"));
assert.ok(r("MatchWorld2.backgroundDecisionProfile({...unit,pk:true}).clear>MatchWorld2.backgroundDecisionProfile(unit).clear"));
assert.equal(r('rivalStrengthEvidenceView([{shots:20,gf:2}])'),'');
r("globalThis.report=rivalSimulate(g,{regulationOnly:true}).reports[0];globalThis.view=rivalStrengthEvidenceView([report,{partial:true,...report}]);");
assert.match(r('view'),/1 matcher med registrerad speltid/);
assert.match(r('view'),/Boxplay/);
assert.match(r('rivalShotReport([report])'),/Lagets avslut per spelform/);
r("g=state.schedule.find(g=>g.home!==managerClub()&&g.away!==managerClub());leagueBackground(g);globalThis.savedEvidence=JSON.stringify(g.rivalReports.map(r=>r.strengthEvidence));save();globalThis.exported=saveExportText();");
assert.doesNotThrow(()=>r('validateSaveText(exported)'));
console.log('PASS: PK clearing/selected counters, PP scheme alias and evidence-only report views.');

const saved=r("localStorage.getItem('hockey_manager_alpha02')");
const restored=require('./scripts/career-test-fixture.cjs').boot(saved);
assert.equal(restored.run('JSON.stringify(state.schedule.find(g=>g.rivalsRecorded).rivalReports.map(r=>r.strengthEvidence))'),r('savedEvidence'));
console.log('PASS: strength evidence survives actual career save/reload.');
