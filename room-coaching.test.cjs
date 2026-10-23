'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{boot}=require('./scripts/career-test-fixture.cjs');
function setup(){const a=boot(undefined,{production:true});a.run("globalThis.window={};startCareerWithClub('HV71');preseasonConfigure('balanced','manager','rotation','manager','assistant');ensureLines();depthSelection();ensureSpecialTeams();tacticsLocks();tacticsWorkspaceView();clubhouseRoomsVisit('tactics');");return a;}
test('in-room board preserves the career and shares swaps, special teams, locks, undo and saved selection',()=>{
 const a=setup(),r=a.run;r('globalThis.before=JSON.stringify(state);roomCoachBoardOpen()');assert.equal(r('JSON.stringify(state)'),r('before'));assert.equal(r('state.page'),'home');assert.equal(r('clubhouseRoomsKey()'),'tactics');
 assert.match(r('clubhouseWorldView("HOME")'),/aria-label="Taktiktavlan i rummet"/);assert.doesNotMatch(r('clubhouseWorldView("HOME")'),/class="ct-work/);
 r('globalThis.lines=JSON.stringify(state.lines);globalThis.ids=state.lines.forwards.slice(0,2);tacticsPick("forwards",0);tacticsPick("forwards",1)');assert.equal(r('state.lines.forwards[0]'),r('ids[1]'));assert.match(r('roomCoachChanges()'),/2 platser ändrade/);
 r('tacticsUndo()');assert.equal(r('JSON.stringify(state.lines)'),r('lines'));
 r("tacticsLock('forwards',0);tacticsAssistant()");assert.equal(r('state.lines.forwards[0]'),r('ids[0]'));r('tacticsUndo();tacticsLock("forwards",0)');
 r("tacticsTab('pp');specialSelect('pp2',0);globalThis.pp=JSON.stringify(state.specialTeams.pp2);globalThis.p=managerRoster().find(p=>p.pos!=='MV'&&medicalAvailable(p)&&!state.specialTeams.pp2.includes(p.id));specialPlace(p.id)");assert.equal(r('state.specialTeams.pp2[0]'),r('p.id'));assert.equal(r('new Set(state.specialTeams.pp2).size'),5);
 const loaded=boot(a.storage.value,{production:true});assert.equal(loaded.run('state.specialTeams.pp2[0]'),r('p.id'));r('tacticsUndo()');assert.equal(r('JSON.stringify(state.specialTeams.pp2)'),r('pp'));
});
test('staff initiative is read-only until answered and uses the canonical saved proposal with follow-up',()=>{
 const a=setup(),r=a.run;r("staffProposalCreate('training','Återhämtning efter tät matchning');clubhouseRoomsVisit('ice');roomCoachSync();globalThis.row=roomCoachInitiatives().find(r=>r.kind==='staff');globalThis.token=roomCoachUI.token;globalThis.before=JSON.stringify(state)");
 assert.equal(r('roomCoachInitiatives().filter(r=>r.proposal?.id===row.proposal.id||r.agenda?.id==="staff-proposal:"+row.proposal.id).length'),1);assert.equal(r('roomCoachInitiativeOpen(row.id,token,row.signature)'),true);assert.match(r('clubhouseWorldView("HOME")'),/Godkänn förslaget/);assert.equal(r('JSON.stringify(state)'),r('before'));
 assert.equal(r("roomCoachInitiativeAct(row.id,'accept',token,row.signature)"),true);assert.equal(r('state.office2.proposals[0].status'),'accepted');assert.equal(r("roomCoachInitiativeAct(row.id,'accept',token,row.signature)"),false);assert.match(r('roomCoachHistory()[0].text'),/Godkänt/);
 const loaded=boot(a.storage.value,{production:true});assert.equal(loaded.run('state.office2.proposals[0].status'),'accepted');assert.equal(loaded.run('JSON.stringify(state.calendar.plans[state.office2.proposals[0].target])'),r('JSON.stringify(state.office2.proposals[0].session)'));
});
test('changed evidence, navigation, a new day and another career invalidate old initiative actions',()=>{
 const {run:r}=setup();r("staffProposalCreate('training','Ett konkret förslag');clubhouseRoomsVisit('ice');roomCoachSync();globalThis.row=roomCoachInitiatives().find(r=>r.kind==='staff');globalThis.token=roomCoachUI.token;state.calendar.plans[row.proposal.target]={type:'recovery',intensity:'light'};globalThis.before=JSON.stringify(state)");
 assert.equal(r("roomCoachInitiativeAct(row.id,'accept',token,row.signature)"),false);assert.equal(r('JSON.stringify(state)'),r('before'));
 r("clubhouseRoomsVisit('world');roomCoachSync()");assert.equal(r("roomCoachInitiativeAct(row.id,'decline',token,row.signature)"),false);
 r('state.calendar.date=calAdd(state.calendar.date,1);roomCoachSync()');assert.equal(r('roomCoachBoardOpen(token)'),false);
 r("startCareerWithClub('Leksands IF');preseasonConfigure('balanced','manager','rotation','manager','assistant');clubhouseGo('office');roomCoachSync()");assert.equal(r("roomCoachInitiativeAct(row.id,'accept',token,row.signature)"),false);assert.equal(r('roomCoachUI.board'),false);
});
test('player initiatives open actual conversations and opening is never recorded as resolution',()=>{
 const a=setup(),r=a.run;r("clubhouseRoomsVisit('locker');globalThis.p=managerRoster().find(p=>clubhousePresence(p).present);playerFollowupStart(p,'Rollsamtal');p.roleFollowup.due=state.calendar.date;roomCoachSync();globalThis.row=roomCoachInitiatives().find(r=>r.agenda?.action?.conversationPlayer===p.id);globalThis.token=roomCoachUI.token;globalThis.before=JSON.stringify(state)");
 assert.ok(r('row'));assert.equal(r('roomCoachInitiativeOpen(row.id,token,row.signature)'),true);assert.equal(r('JSON.stringify(state)'),r('before'));assert.equal(r("roomCoachInitiativeAct(row.id,'open',token,row.signature)"),true);assert.equal(r('clubhouseUI.player'),r('p.id'));assert.equal(r('p.roleFollowup.closed'),undefined);
 r('globalThis.trust=p.social.trust');assert.equal(r('clubhouseTalk(p.id,"listen")'),true);assert.ok(r('p.social.trust')>r('trust'));assert.equal(r('clubhouseTalk(p.id,"listen")'),false);
});
test('briefing and selection do not create a match, move time or simulate; only gathering the actual match does',()=>{
 const {run:r}=setup();r('globalThis.date=state.calendar.date;globalThis.before=JSON.stringify(state)');assert.equal(r("roomCoachMatchStep('brief')"),true);assert.equal(r('JSON.stringify(state)'),r('before'));assert.equal(r("roomCoachMatchStep('locker')"),false);assert.equal(r('state.live'),null);
 r("state.calendar.date=calendarTarget();clubhouseGo('office');globalThis.date=state.calendar.date;globalThis.g=matchBriefFixture();");assert.equal(r('clubhouseThemeContinue()'),true);assert.equal(r('roomCoachUI.step'),'brief');assert.equal(r('state.live'),null);
 assert.equal(r("roomCoachChooseBrief('defense',matchBriefKey(g),roomCoachUI.token)"),true);assert.equal(r('state.matchBrief.goal'),'defense');assert.equal(r("roomCoachMatchStep('lineup')"),true);assert.equal(r('state.live'),null);assert.equal(r('state.calendar.date'),r('date'));
 assert.equal(r("roomCoachMatchStep('locker')"),true);assert.equal(r('state.live.opponent'),r('g.opponent'));assert.equal(r('state.live.friendly'),true);assert.equal(r('state.live.matchBrief.goal'),'defense');assert.equal(r('coachJourneyStage()'),'locker');
 r('globalThis.live=state.live;globalThis.before=JSON.stringify([state.live.broadcast,state.live.analysis,state.calendar]);');assert.equal(r("roomCoachMatchStep('locker')"),true);assert.equal(r('state.live===live'),true);assert.equal(r('JSON.stringify([state.live.broadcast,state.live.analysis,state.calendar])'),r('before'));
 r('teamTalk("support");globalThis.once=JSON.stringify(state.live.socialTalks);teamTalk("support");coachJourneyMove("bench")');assert.equal(r('JSON.stringify(state.live.socialTalks)'),r('once'));assert.match(r('matchDeskView()'),/career-ice/);assert.equal(r('state.calendar.date'),r('date'));
});
test('one real friendly reaches the analysis room and its saved brief survives reload',()=>{
 const a=setup(),r=a.run;r("state.calendar.date=calendarTarget();clubhouseGo('office');roomCoachMatchStep('brief');roomCoachChooseBrief('pressure',matchBriefKey(matchBriefFixture()),roomCoachUI.token);roomCoachMatchStep('lineup');roomCoachMatchStep('locker');teamTalk('support');coachJourneyMove('bench');");
 r("globalThis.steps=0;while(!state.live.finished&&steps++<65000){if(!state.live.running){while(medicalPending())medicalDecisionAccept();startMatch();}studioStep();}if(!state.live.finished)throw Error('Match failed to finish')");
 assert.equal(r('coachJourneyStage()'),'locker');assert.match(r('coachJourneyRoomView("locker")'),/Till analysbordet/);r('globalThis.before=JSON.stringify({...state,page:"home"})');assert.equal(r("roomCoachMatchStep('analysis')"),true);assert.equal(r('clubhouseRoomsKey()'),'tactics');assert.equal(r('roomCoachUI.step'),'analysis');assert.match(r('roomCoachAnalysisView()'),/Matchbriefens utfall/);assert.equal(r('JSON.stringify(state)'),r('before'));
 r('save()');const loaded=boot(a.storage.value,{production:true});loaded.run("globalThis.window={};resumeCareer();clubhouseGo('office');roomCoachMatchStep('analysis')");assert.equal(loaded.run('roomCoachReport().matchBrief.goal'),'pressure');assert.equal(loaded.run('roomCoachUI.step'),'analysis');
});

test('player deep links return to the same in-room board and its comparison',()=>{
 const {run:r}=setup();r("roomCoachBoardOpen();tacticsPick('forwards',0);tacticsPick('forwards',3);globalThis.original=JSON.stringify(roomCoachUI.before);globalThis.selection=lineupUI.player;deskOpenPlayer(selection)");
 assert.equal(r('state.page'),'player');r('clubhouseReturn()');assert.equal(r('roomCoachUI.board'),true);assert.equal(r('JSON.stringify(roomCoachUI.before)'),r('original'));assert.equal(r('lineupUI.player'),r('selection'));assert.match(r('roomCoachChanges()'),/2 platser ändrade/);
});

test('moving back from selection to briefing closes the magnets without changing the lineup',()=>{
 const {run:r}=setup();r("roomCoachBoardOpen();globalThis.before=JSON.stringify(state.lines)");assert.equal(r("roomCoachMatchStep('brief')"),true);assert.equal(r('roomCoachUI.board'),false);assert.equal(r('roomCoachUI.step'),'brief');assert.match(r('clubhouseWorldView("HOME")'),/Motståndarbrief i rummet/);assert.equal(r('JSON.stringify(state.lines)'),r('before'));
});

test('staff meeting exposes canonical advice mandates without silently changing ownership',()=>{
 const a=setup(),r=a.run;r("clubhouseRoomsVisit('boardroom');clubhouseRoomsStation('staff',clubhouseRoomsUI.token);roomCoachSync();globalThis.before=JSON.stringify(state);globalThis.token=roomCoachUI.token");
 assert.match(r('roomCoachMandatesView()'),/Stabsansvar för A-lagets träning/);assert.equal(r('JSON.stringify(state)'),r('before'));assert.equal(r("roomCoachMandate('training','advise','manual',token)"),true);assert.equal(r("staffMode('training')"),'advise');assert.equal(r('state.training.assistantOwner'),'manager');assert.equal(r("roomCoachMandate('training','execute','manual',token)"),false);
 const loaded=boot(a.storage.value,{production:true});assert.equal(loaded.run("staffMode('training')"),'advise');
});
