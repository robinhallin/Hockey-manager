'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{boot}=require('./scripts/career-test-fixture.cjs');
function setup(){const a=boot(undefined,{production:true});a.run("globalThis.window={};startCareerWithClub('HV71');preseasonConfigure('balanced','manager','rotation','manager','assistant');ensureLines();depthSelection();ensureSpecialTeams();globalThis.p=managerRoster().find(p=>p.name==='Herman Liv');");return a;}
test('plans are intentions, preserve real contracts and lineups, deduplicate and survive initial load validation',()=>{
 const a=setup(),r=a.run;r('globalThis.before=JSON.stringify([state.lines,state.money,p.salary,p.contractYears,p.promisedRole,p.recruitmentPromise]);globalThis.ctx=clubDecisionContext()');
 assert.equal(r("clubPlanSet(p.id,'retain',ctx)"),true);assert.equal(r("clubPlanSet(p.id,'retain',ctx)"),false);
 assert.equal(r('clubDecisionStore().plans.length'),1);assert.equal(r('JSON.stringify([state.lines,state.money,p.salary,p.contractYears,p.promisedRole,p.recruitmentPromise])'),r('before'));
 r('save()');const q=boot(a.storage.value,{production:true}).run;assert.equal(q('clubDecisionStore().plans[0].intent'),'retain');assert.doesNotThrow(()=>q('validateSaveText(saveExportText())'));
 r("clubPlanSet(p.id,'replace',clubDecisionContext())");assert.equal(r('clubDecisionStore().plans.length'),2);assert.ok(r('clubDecisionStore().plans[1].closed'));
});
test('plans review actual changes, reject stale and live controls, and cannot close an unchanged early review',()=>{
 const {run:r}=setup();r("globalThis.ctx=clubDecisionContext();clubPlanSet(p.id,'evaluate',ctx)");assert.equal(r('clubPlanReview(p.id,ctx)'),false);
 r('p.salary+=10000');assert.equal(r('clubPlanEvidence(clubDecisionStore().plans[0]).changed'),true);assert.match(r('clubPlanEvidence(clubDecisionStore().plans[0]).text'),/årslön/);
 assert.equal(r('clubPlanReview(p.id,ctx)'),true);r('state.calendar.date=calAdd(state.calendar.date,1)');assert.equal(r("clubPlanSet(p.id,'retain',ctx)"),false);
 r('state.live={finished:false}');assert.equal(r("clubPlanSet(p.id,'retain',clubDecisionContext())"),false);
});
test('case history records changed evidence once and pure views never progress or persist anything',()=>{
 const {run:r}=setup();r("clubDecisionCapture();globalThis.count=clubDecisionStore().cases.reduce((n,c)=>n+c.events.length,0);clubDecisionCapture()");assert.equal(r('clubDecisionStore().cases.reduce((n,c)=>n+c.events.length,0)'),r('count'));
 r('globalThis.before=JSON.stringify(state);clubDecisionDailyView();clubContractPlansView();clubCompetitionView(p);clubSelectionView();for(const room of Object.keys(CLUBHOUSE_WORKROOMS))clubRoomInsight(room)');assert.equal(r('JSON.stringify(state)'),r('before'));
 r("globalThis.sampleCase=clubDecisionCases()[0];globalThis.original=managerAgendaItems;managerAgendaItems=()=>[];clubDecisionCapture()");assert.ok(r('clubDecisionStore().cases.find(c=>c.key===sampleCase.key).closed'));
});
test('named goalie trial uses six actual eligible games and retains the other goalie obligations',()=>{
 const a=setup(),r=a.run;r('globalThis.old=JSON.stringify([state.lines,managerRoster().filter(p=>p.pos===\'MV\').map(p=>[p.id,p.promisedRole,p.recruitmentPromise])]);globalThis.trust=p.social.trust');
 assert.equal(r('clubTrialStart(p.id,clubDecisionContext())'),true);assert.match(r('overviewWorkspaceView()'),/Ge en målvaktsperiod/);r("globalThis.s=state.stories.active.find(s=>s.ids.includes(String(p.id)));storiesChoose(s.id,'promote')");assert.equal(r('s.expectation.matches'),6);assert.equal(r('s.expectation.seconds'),1800);
 assert.equal(r("JSON.stringify([state.lines,managerRoster().filter(p=>p.pos==='MV').map(p=>[p.id,p.promisedRole,p.recruitmentPromise])])"),r('old'));
 r("state.season.phase='regular';globalThis.sample=(id,seconds,extra={})=>({id,club:managerClub(),year:state.season.year,date:state.calendar.date,opponent:'AIK',finished:true,players:[{id:p.id,seconds,goals:0,assists:0}],units:[],own:2,against:1,...extra});storiesAfterMatch(sample('friendly',3600,{friendly:true}));storiesAfterMatch(sample('partial',3600,{partial:true}))");assert.equal(r('s.expectation.eligible'),0);
 r("for(let i=0;i<6;i++)storiesAfterMatch(sample('keeper-'+i,i<3?3600:0))");assert.equal(r('s.status'),'closed');assert.ok(r('p.social.trust')>r('trust'));const trust=r('p.social.trust');r("storiesAfterMatch(sample('keeper-5',0))");assert.equal(r('p.social.trust'),trust);assert.ok(r("journeyPlayer(p.id).events.some(e=>e.title==='Din satsning blev verklighet')"));assert.doesNotThrow(()=>r('validateSaveText(saveExportText())'));
});
test('an unfulfilled goalie trial has a lasting different trust outcome',()=>{
 const {run:r}=setup();r("clubTrialStart(p.id,clubDecisionContext());globalThis.s=state.stories.active.find(s=>s.ids.includes(String(p.id)));storiesChoose(s.id,'promote');globalThis.trust=p.social.trust;state.season.phase='regular';for(let i=0;i<6;i++)storiesAfterMatch({id:'unused-'+i,club:managerClub(),year:state.season.year,date:state.calendar.date,opponent:'AIK',finished:true,players:[{id:p.id,seconds:0,goals:0,assists:0}],units:[],own:1,against:2})");assert.equal(r('s.outcome'),'Ansvar som ännu inte blev verklighet');assert.ok(r('p.social.trust')<r('trust'));
});
test('tactical explanations expose strengths and weaknesses without changing engine factors',()=>{
 const {run:r}=setup();r('globalThis.ids=state.lines.forwards.slice(0,3);globalThis.before=JSON.stringify([lineTacticalFit(ids),state]);globalThis.html=tacticalFitView(ids)');assert.match(r('html'),/<details class="cw-fit">/);assert.match(r('html'),/Att bevaka/);assert.equal(r('JSON.stringify([lineTacticalFit(ids),state])'),r('before'));
});
test('malformed plan and history data are rejected on exported save import',()=>{
 const {run:r}=setup();r("clubPlanSet(p.id,'retain',clubDecisionContext());clubDecisionStore().plans[0].baseline.salary=-1");assert.throws(()=>r('validateSaveText(saveExportText())'),/truppplan|ärendehistorik/);
});
test('a postponed planning case remains actionable and can be restored from waiting',()=>{
 const {run:r}=setup();r("globalThis.item=managerAgendaItems().find(i=>!i.requiresDecision&&i.level!=='critical');globalThis.id=item.id;managerAgendaSnooze(id,3);clubDecisionFilter('waiting')");
 assert.match(r('clubDecisionDailyView()'),/Visa nu/);assert.ok(r('clubDecisionCases().find(c=>c.items.some(i=>i.id===id)).items.some(i=>i.deferred)'));
 r('managerAgendaSnooze(id,0)');assert.equal(r('managerAgendaItems().find(i=>i.id===id).deferred'),false);
});
