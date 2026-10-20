'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{boot}=require('./scripts/career-test-fixture.cjs');
function setup(){const a=boot(undefined,{production:true});a.run("startCareerWithClub('HV71');preseasonConfigure('balanced','manager','rotation','assistant','assistant');globalThis.window={};ClubhouseScene.mount=()=>{};ClubhouseScene.dispose=()=>{};coachWorkspaceEnter();");return a;}
test('the coherent home replaces old layers, while all existing domain workspaces remain reachable',()=>{
 const a=setup(),r=a.run;
 assert.equal(r('coachWorkspaceEnabled()'),true);assert.equal(r('clubhouseEnabled()'),false);
 const home=r('overviewWorkspaceView()');assert.match(home,/Din tränarvecka/);assert.doesNotMatch(home,/office2-priority|ov-community|ch-world/);
 const html=r('coachWorkspaceWrap(overviewWorkspaceView())');assert.equal((html.match(/aria-label="Spelets arbetsytor"/g)||[]).length,1);assert.doesNotMatch(html,/desk-subnav|ch-work-dialog|desk-tools/);
 r('COACH_WORKSPACES.flatMap(a=>a.pages).forEach(([p])=>{deskNavigate(p);if(state.page!==p)throw Error("Unreachable "+p);if(!coachWorkspaceEnabled())throw Error("Lost workspace "+p);});');
 r("deskNavigate('home');deskNavigate('stories')");assert.match(r('overviewWorkspaceView()'),/Till tränaröversikten/);assert.doesNotMatch(r('overviewWorkspaceView()'),/coach-home-grid/);
 r("coachHome();clubhouseGo('locker')");assert.equal(r('clubhouseEnabled()'),true);assert.equal(r('coachWorkspaceEnabled()'),false);r('coachWorkspaceEnter()');assert.equal(r('state.page'),'home');assert.equal(r('coachWorkspaceEnabled()'),true);
});
test('reading the home and selecting future days never simulates, completes work or changes RNG',()=>{
 const {run:r}=setup();r('coachHomeView();globalThis.before=JSON.stringify(state);globalThis.future=calAdd(state.calendar.date,3);');
 assert.equal(r('coachSelectDay(future)'),true);r('coachHomeView();coachAgendaGroups();coachWorkspaceWrap("READ");coachAgendaFilter("all");coachFollowup()');assert.equal(r('JSON.stringify(state)'),r('before'));
 assert.equal(r('coachSelectDay(calAdd(state.calendar.date,8))'),false);
 r("calendarSetSession(future,'type','powerplay')");assert.equal(r('calendarSession(future).type'),'powerplay');assert.equal(r('state.training.history.some(h=>h.date===future)'),false);assert.equal(r('state.calendar.date'),r('coachWorkspaceUI.today'));
 r('save()');assert.doesNotThrow(()=>r('validateSaveText(saveExportText())'));
});
test('canonical agenda obligations remain visible and viewing an action never resolves a decision',()=>{
 const {run:r}=setup();r("managerMessage('coach-required','Ett verkligt beslut','Spelaren behöver svar','Spelare',{decisionType:'role'});globalThis.pending=pendingManagerDecision();globalThis.before=state.calendar.date;");
 assert.equal(r('coachContinueLabel()'),'Besvara ärendet');assert.equal(r('coachContinue()'),false);assert.equal(r('pendingManagerDecision().id'),r('pending.id'));assert.equal(r('pending.resolved'),undefined);assert.equal(r('state.calendar.date'),r('before'));assert.equal(r('dayTransition'),null);
 r('coachHome();globalThis.ids=coachAgendaGroups().flatMap(g=>g.items.map(i=>i.id));');assert.equal(r('managerAgendaItems(true).filter(i=>i.area!=="match").every(i=>ids.includes(i.id))'),true);
 assert.match(r('coachAgendaView()'),/Ett verkligt beslut/);
 r('pending.resolved=true;coachHome()');assert.equal(r('coachBlocker()'),null);
});
test('one real day returns home, records only real training and survives save reload',()=>{
 const a=setup(),r=a.run;r("calendarSetSession(state.calendar.date,'type','skills');globalThis.before=state.calendar.date;globalThis.history=state.training.history.length;");
 assert.equal(r('coachContinue()'),true);assert.equal(r('coachContinue()'),false);assert.equal(r('state.calendar.date'),r('before'));r('dayTransitionRun(dayTransition)');
 assert.equal(r('state.calendar.date'),r('calAdd(before,1)'));assert.equal(r('state.page'),'home');assert.equal(r('state.training.history.length'),r('history+1'));assert.equal(r('state.training.history.find(h=>h.date===before).type'),'skills');assert.equal(r('state.calendar.lastDaySummary.currentDate'),r('state.calendar.date'));
 const date=r('state.calendar.date');r('dayTransitionRun(dayTransition);coachHomeView();save()');assert.equal(r('state.calendar.date'),date);
 const b=boot(a.storage.value,{production:true});assert.equal(b.run('state.calendar.date'),date);assert.equal(b.run('state.training.history.length'),r('state.training.history.length'));assert.equal(b.run('state.page'),'home');
});
test('a real week reaches the actual friendly without advancing through the fixture or changing the engine',()=>{
 const a=setup(),r=a.run;r('globalThis.start=state.calendar.date;globalThis.target=calendarTarget();globalThis.initialHistory=state.training.history.length;');
 for(let i=0;i<6;i++){r('coachContinue();dayTransitionRun(dayTransition);if(pendingManagerDecision())throw Error("Unexpected decision");');assert.equal(r('state.page'),'home');}
 assert.equal(r('state.calendar.date'),r('target'));assert.equal(r('state.training.history.length'),r('initialHistory+6'));assert.equal(r('coachContinueLabel()'),'Till dagens match');
 assert.equal(r('coachContinue()'),true);assert.equal(r('state.live.friendly'),true);assert.equal(r('state.calendar.date'),r('target'));assert.equal(r('coachJourneyStage()'),'locker');assert.ok(r('state.live.broadcast'));
 r('globalThis.before=JSON.stringify([state.live,state.lines,state.calendar]);coachJourneyRoomView("locker");coachJourneyMove("tunnel");coachJourneyMove("bench")');assert.equal(r('JSON.stringify([state.live,state.lines,state.calendar])'),r('before'));
 r('save()');const b=boot(a.storage.value,{production:true});assert.equal(b.run('state.live.friendly'),true);assert.equal(b.run('state.calendar.date'),r('target'));
});
test('new careers and stale queued steps cannot carry a selected day or advance another club',()=>{
 const {run:r}=setup();r('coachSelectDay(calAdd(state.calendar.date,4));coachAgendaFilter("later");coachContinue();globalThis.tx=dayTransition;startCareerWithClub("HV71");preseasonConfigure("balanced","manager","rotation","assistant","assistant");coachWorkspaceEnter();globalThis.before=JSON.stringify(state);dayTransitionRun(tx);coachWorkspaceSync()');
 assert.equal(r('JSON.stringify(state)'),r('before'));assert.equal(r('coachWorkspaceUI.date'),r('state.calendar.date'));assert.equal(r('coachWorkspaceUI.filter'),'now');assert.equal(r('dayTransition'),null);
});
