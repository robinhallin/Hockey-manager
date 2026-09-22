'use strict';
// Public career actions and the production engine. DOM layout/animation are not
// represented by the fixture; no gameplay rules, RNG or medical events are stubbed.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {headlessCareer}=require('./headless-career.cjs');
const {boot}=require('./career-test-fixture.cjs');
const app=headlessCareer(),r=app.run;
const result={scope:'Headless integration and generated markup; not browser visual QA',views:[],workflows:{}};
r("beginCareerSelection();chooseCareerClub('HV71');careerReview();acceptCareer();desktopOrder('tempo','low');calendarInitialPreseason()");
assert.equal(r('state.season.phase'),'preseason');
assert.equal(r('state.tacticalPlan.tempo'),'low');
const pages=r('DESK_AREAS.flatMap(a=>a.pages.map(p=>p[0])).concat(["inbox","settings"])');
for(const page of pages){
 const start=performance.now();r(`deskNavigate(${JSON.stringify(page)})`);
 const html=r("document.getElementById('content').innerHTML");
 assert.equal(r('state.page'),page);assert.ok(html.length>100,page);
 assert.doesNotMatch(html,/>[^<>]*(?:NaN|undefined)[^<>]*</,page);
 result.views.push({page,markupMs:Math.round(performance.now()-start),characters:html.length});
}
// One date per action, including real training, scouting and world processing.
function nextDay(){
 const before=r('state.calendar.date');
 if(r('Boolean(pendingManagerDecision())')){
  assert.equal(r('pendingManagerDecision().decisionType'),'minutes');
  r('answerPlayerConversation(pendingManagerDecision().id,"honest")');
 }
 r('calendarContinue()');
 assert.equal(r('state.calendar.date'),r(`calAdd(${JSON.stringify(before)},1)`),'one date per continue');
}
r("deskNavigate('transfers','needs');globalThis.need=recruitmentNeeds().find(n=>n.name==='Spelfördelare');hubNeed(need.name);globalThis.target=state.playerWorld.freeAgents.find(p=>p.name==='Oula Palve');scoutingDraft([target.id]);scoutingDraftSet('method','screen');scoutingStart();scoutingContact(target.id);globalThis.job=scoutingOffice().jobs[0]");
assert.ok(r('job.status==="active"'));
for(let day=0;r('job.status')==='active'&&day<20;day++)nextDay();
assert.equal(r('job.status'),'completed');
assert.ok(r('playerAssessment(target).known'));
r('scoutingCompare(target.id);scoutingCompare(managerRoster().find(p=>p.pos===target.pos).id)');
assert.doesNotMatch(r('scoutingComparison()'),/NaN|undefined/);
r('globalThis.contact=scoutingContactKnown(target);globalThis.cashBefore=state.money;globalThis.wageBefore=annualWageCost();submitRecruitOffer(target.id,contact.fee,contact.salary,contact.minYears,contact.role);globalThis.deal=state.recruitment.deals[0]');
assert.equal(r('deal?.status'),'pending',r('state.recruitment.message'));
nextDay();nextDay();
assert.equal(r('deal.status'),'signed',r('deal.reason'));
assert.equal(r('managerRoster().filter(p=>p.id===target.id).length'),1);
assert.equal(r('cashBefore-state.money'),r('deal.fee'));
assert.equal(r('annualWageCost()-wageBefore'),r('deal.salary'));
r("ensureLines();lineupUI.slot={type:'forwards',index:1};lineupPlace(target.id);globalThis.injured=playerById(state.lines.defense[0]);globalThis.injuryId=injured.id;injurePlayer(injured,'träning',2);setIndividualLoad(injured.id,'rest');setTrainingReturn(injured.id,3)");
assert.equal(r('state.lines.defense.includes(injuryId)'),false);
for(let day=0;day<7;day++)nextDay();
assert.equal(r('medicalReady(injured)'),true);
assert.equal(r('injured.trainingLoad'),'normal');
assert.ok(r('state.training.messages.some(m=>m.title.includes(injured.name)&&m.title.includes("belastningsplan"))'));
result.workflows.C={recovered:true,replacedInLineup:true,planFollowup:true};
while(r('state.calendar.date')<'2026-09-07')nextDay();
r('launchSeason()');assert.equal(r('state.season.phase'),'regular',r('state.season.message'));
while(r('state.calendar.date<calendarTarget()'))nextDay();
r("ensureLines();lineupUI.slot={type:'forwards',index:1};lineupPlace(target.id);startMatch();pauseMatch();globalThis.matchStart=JSON.stringify(state)");
// Complete the same match through all presentation modes, including interruptions,
// background fixtures, table/stat registrations and stored reports.
let baseline;
result.workflows.E=[];
for(const mode of ['full','extended','highlights','commentary']){
 r(`state=JSON.parse(matchStart);state.live.rink.mode=${JSON.stringify(mode)};studioRestartClock();globalThis.iterations=0;
 while(!state.live.finished&&iterations++<100000){
  if(!state.live.running){while(medicalPending())medicalDecisionAccept();startMatch();}
  studioTrackHighlight(studioEngine(),state.live);studioPlaybackRate(studioEngine(),state.live);studioStep();
 }
 globalThis.outcome=JSON.stringify({score:[state.live.hv,state.live.opp],shots:state.live.analysis.shots,events:state.live.analysis.events,ice:state.live.iceTime,energy:state.live.energy,table:state.teams,stats:state.leagueStatistics,rng:studioEngine().rng});`);
 assert.ok(r('state.live.finished'),mode+' can be completed');
 const outcome=r('outcome');if(baseline)assert.equal(outcome,baseline,mode+' preserves authoritative results');else baseline=outcome;
 assert.ok(r('state.live.iceTime[target.id]>0'),'new signing plays in the actual match');
 r('finishMatch(false);save()');
 assert.equal(r('JSON.stringify({score:[state.live.hv,state.live.opp],shots:state.live.analysis.shots,events:state.live.analysis.events,ice:state.live.iceTime,energy:state.live.energy,table:state.teams,stats:state.leagueStatistics,rng:studioEngine().rng})'),outcome,'repeated finish is a no-op');
 const restored=boot(app.storage.value);
 assert.equal(restored.run('JSON.stringify(state.teams)'),r('JSON.stringify(state.teams)'));
 assert.equal(restored.run('JSON.stringify(state.analysis.matches)'),r('JSON.stringify(state.analysis.matches)'));
 assert.equal(restored.run('state.live.finished'),true);
 result.workflows.E.push({mode,score:JSON.parse(outcome).score,signedPlayerSeconds:r('state.live.iceTime[target.id]'),savedReport:true});
}
result.workflows.A={club:r('managerClub()'),date:r('state.calendar.date'),played:r('team(managerClub()).gp'),savedTable:true,savedReport:true};
result.workflows.B={player:r('target.name'),observations:r('state.scoutReports[target.id].visits'),salary:r('deal.salary'),uniqueRoster:true,played:true};
r("deskNavigate('transfers','search');recruitFilters().query='ZZZ_NO_PLAYER_123';render()");
assert.equal(r('recruitCandidates().length'),0);
assert.doesNotMatch(r("document.getElementById('content').innerHTML"),/>[^<>]*(?:NaN|undefined)[^<>]*</);
result.emptySearch=true;
if(process.env.CAREER_AUDIT_OUTPUT)fs.writeFileSync(process.env.CAREER_AUDIT_OUTPUT,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
