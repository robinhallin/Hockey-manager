'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{boot}=require('./scripts/career-test-fixture.cjs');
test('archived scene constructors remain reproducible without loading them in the game',()=>{
 const fs=require('node:fs'),vm=require('node:vm'),c=vm.createContext({console});
 vm.runInContext(fs.readFileSync('archive/retired-3d/assets/vendor/hockey-three.js','utf8'),c);
 const names=[...fs.readFileSync('archive/retired-3d/living-clubhouse-scene.js','utf8').matchAll(/new (?:c\.)?T\.([A-Za-z0-9_]+)/g)].map(m=>m[1]);
 for(const name of new Set(names))assert.equal(vm.runInContext('typeof HockeyThree.'+name,c),'function',name+' must be available offline');
});
function setup(){const a=boot(),r=a.run;r(`startCareerWithClub('HV71');globalThis.window={};clubhouseGo('office');`);return a;}
function match(r){r(`state.calendar.date=calendarTarget();createMatch();deskNavigate('match');`);}
test('room histories, groups and the board read the career without writing it',()=>{
 const {run:r}=setup();r('ensureLines();globalThis.before=JSON.stringify(state);coachJourneyGroups();coachJourneyStories();coachJourneyPulse(clubhouseModel());clubhouseWorldView("WORK")');assert.equal(r('JSON.stringify(state)'),r('before'));
 assert.match(r('tacticsWorkspaceView()'),/Tränarens taktiktavla/);r('clubhouseMode(false)');assert.doesNotMatch(r('tacticsWorkspaceView()'),/Tränarens taktiktavla/);
});
test('a real role case visits the office and a concrete plan remains an actual obligation',()=>{
 const a=setup(),r=a.run;
 r(`globalThis.p=managerRoster().find(p=>p.pos!=='MV');p.promisedRole='Ordinarie';p.social.missed=2;p.social.lastTalk=-100;state.round=1001;state.live={finished:true,hv:0,opp:2,iceTime:{[p.id]:0},analysis:{partial:false}};relationshipAfterMatch();state.live=null;clubhouseGo('office');globalThis.c=state.relationships.cases[0];`);
 assert.equal(r('clubhouseLifeVisitor().kind'),'relationship');assert.equal(r('clubhouseAcceptVisitor(p.id)'),true);assert.match(r('clubhousePanel(clubhouseModel())'),/Sätt en konkret väg tillbaka/);
 r('globalThis.trust=p.social.trust');assert.equal(r('coachJourneyRelationship(c.id,"listen")'),true);assert.equal(r('c.heard'),true);assert.equal(r('p.social.trust'),r('trust'));
 r('coachJourneyRelationship(c.id,"plan");globalThis.once=JSON.stringify(state.relationships);coachJourneyRelationship(c.id,"plan")');assert.equal(r('JSON.stringify(state.relationships)'),r('once'));assert.equal(r('c.status'),'following');assert.equal(r('c.good'),0);r('save()');assert.equal(boot(a.storage.value).run('state.relationships.cases[0].status'),'following');
});
test('a player story is chosen in the room, saves its promise and never awards progress on view',()=>{
 const a=setup(),r=a.run;r(`clubhouseGo('locker');globalThis.p=managerRoster().find(p=>p.pos!=='MV'&&!playerLoan(p));clubhouseSelect(p.id)`);
 assert.equal(r('coachJourneyStartStory(p.id)'),true);assert.equal(r('clubhouseRoomForPage()'),'locker');r('globalThis.s=state.stories.active.find(s=>s.ids.includes(String(p.id)))');
 assert.match(r('clubhousePanel(clubhouseModel())'),/Vilket besked ger du/);assert.equal(r('coachJourneyChoose(s.id,"promote")'),true);assert.equal(r('s.status'),'following');assert.equal(r('s.expectation.qualified'),0);
 r('globalThis.before=JSON.stringify(state);clubhousePanel(clubhouseModel());clubhouseWorldView("WORK")');assert.equal(r('JSON.stringify(state)'),r('before'));assert.equal(r('coachJourneyChoose(s.id,"promote")'),false);r('save()');assert.equal(boot(a.storage.value).run('state.stories.active[0].status'),'following');
});
test('only real present-player bonds produce social groups',()=>{
 const {run:r}=setup();r(`globalThis.a=managerRoster()[0];globalThis.b=managerRoster()[1];socialPair(a.id,b.id,true).bond=65;`);assert.ok(r('coachJourneyGroups().some(g=>g.ids.includes(String(a.id))&&g.ids.includes(String(b.id)))'));
 r(`a.health.injury={name:'Skada',remaining:3}`);assert.equal(r('coachJourneyGroups().some(g=>g.ids.includes(String(a.id)))'),false);
});
test('the preparation to 2D route preserves match state and applies each talk once',()=>{
 const a=setup(),r=a.run;match(r);assert.equal(r('coachJourneyStage()'),'locker');assert.match(r('matchDeskView()'),/DITT LAG. DINA ORD/);
 r('globalThis.before=JSON.stringify([state.live.broadcast,state.live.rink,state.lines,state.live.analysis,state.calendar]);');
 assert.equal(r('coachJourneyMove("tunnel")'),false);assert.equal(r('coachJourneyMove("bench")'),true);assert.match(r('studioView()'),/id="career-ice"/);assert.doesNotMatch(r('studioView()'),/career-ice-3d/);assert.match(r('matchDeskView()'),/cj-bench/);assert.equal(r('JSON.stringify([state.live.broadcast,state.live.rink,state.lines,state.live.analysis,state.calendar])'),r('before'));
 r('coachJourneyMove("locker");teamTalk("support");globalThis.after=JSON.stringify([state.live.socialTalks,state.locker,managerRoster().map(p=>p.social)]);teamTalk("support")');assert.equal(r('JSON.stringify([state.live.socialTalks,state.locker,managerRoster().map(p=>p.social)])'),r('after'));assert.ok(r('state.live.socialTalks[socialTalkSlot()].reactions.length')>0);r('save()');assert.ok(boot(a.storage.value).run('state.live.socialTalks.p1'));
});
test('the production friendly entry respects the real fixture and the calendar does not advance',()=>{
 const a=boot(undefined,{production:true}),r=a.run;r(`startCareerWithClub('HV71');preseasonConfigure('balanced','manager','rotation','assistant','assistant');globalThis.window={};state.calendar.date=calendarTarget();clubhouseGo('office');globalThis.date=state.calendar.date;globalThis.g=matchBriefFixture();`);
 assert.equal(r('coachJourneyPrepare()'),true);assert.equal(r('state.live.friendly'),true);assert.equal(r('state.live.opponent'),r('g.opponent'));assert.equal(r('state.calendar.date'),r('date'));assert.equal(r('coachJourneyStage()'),'locker');
});
test('stale actions, off-day preparation and new-career state cannot carry over',()=>{
 const {run:r}=setup();r('state.calendar.date=calAdd(calendarTarget(),-1);globalThis.before=JSON.stringify(state)');assert.equal(r('coachJourneyPrepare()'),false);assert.equal(r('JSON.stringify(state)'),r('before'));assert.equal(r('coachJourneyChoose("foreign","open")'),false);assert.equal(r('coachJourneyRelationship("foreign","listen")'),false);
 match(r);r('coachJourneyMove("bench");startCareerWithClub("HV71");clubhouseGo("office");coachJourneySync()');assert.equal(r('coachJourneyUI.stage'),null);assert.equal(r('coachJourneyUI.player'),null);assert.equal(r('coachJourneyUI.story'),null);
});
test('midperiod navigation pauses play, cannot restart a finished match and exposes a real report',()=>{
 const {run:r}=setup();match(r);r('teamTalk("support");coachJourneyMove("bench");startMatch()');assert.equal(r('coachJourneyStage()'),'bench');assert.equal(r('coachJourneyMove("tunnel")'),false);r('coachJourneyMove("locker")');assert.equal(r('state.live.running'),false);assert.equal(r('coachJourneyMove("tunnel")'),false,'an earlier speech cannot reopen the tunnel midperiod');assert.match(r('coachJourneyRoomView("locker")'),/Till matchbänken/);r('deskNavigate("home");coachJourneyPrepare()');assert.equal(r('coachJourneyStage()'),'bench','resuming an already started match returns to the bench');
 r('state.live.finished=true;coachJourneySync();globalThis.before=JSON.stringify(state.live);');assert.equal(r('coachJourneyMove("tunnel")'),false);assert.equal(r('coachJourneyReport()'),true);assert.equal(r('matchDesk.tab'),'report');assert.equal(r('JSON.stringify(state.live)'),r('before'));
});
