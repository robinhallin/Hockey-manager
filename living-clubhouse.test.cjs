'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {boot}=require('./scripts/career-test-fixture.cjs');
function setup(){const a=boot(),r=a.run;r(`startCareerWithClub('HV71');globalThis.window={};clubhouseGo('office');`);return a;}
test('the default clubhouse uses the actual club and full roster without simulating or creating a lineup',()=>{
 const {run:r}=setup();r('globalThis.before=JSON.stringify(state);globalThis.model=clubhouseModel();clubhouseView();clubhouseModel();clubhousePanel(model)');
 assert.equal(r('JSON.stringify(state)'),r('before'));assert.equal(r('model.club'),'HV71');assert.equal(r('model.players.length'),r('managerRoster().length'));assert.equal(r('model.coach'),r('state.managerCareer.name'));assert.match(r('clubhouseWrap("old")'),/Tränarkontoret/);assert.doesNotMatch(r('clubhouseWrap("old")'),/undefined|NaN/);
});
test('walking between three rooms and opening workspaces preserves time, cash, selection and promises',()=>{
 const {run:r}=setup();r('ensureLines();globalThis.before=JSON.stringify([state.calendar,state.money,state.lines,state.locker,state.training.promises]);clubhouseGo("locker");clubhouseGo("ice");clubhouseOpen("lines");');
 assert.equal(r('state.page'),'lines');assert.match(r('clubhouseWrap("TACTICS")'),/Tillbaka till utvecklingscentret/);assert.equal(r('clubhouseUI.origin.room'),'ice');r('clubhouseReturn()');assert.equal(r('clubhouseRoomForPage()'),'ice');
 assert.equal(r('JSON.stringify([state.calendar,state.money,state.lines,state.locker,state.training.promises])'),r('before'));assert.equal(r('clubhouseGo("unknown")'),false);
});
test('selecting a real player is read-only and names/concerns/absence use career evidence',()=>{
 const {run:r}=setup();r('clubhouseGo("locker");globalThis.p=managerRoster()[0];p.social.trust=35;p.happiness=40;globalThis.before=JSON.stringify(state);clubhouseSelect(p.id)');
 assert.equal(r('JSON.stringify(state)'),r('before'));assert.equal(r('String(clubhouseUI.player)'),r('String(p.id)'));assert.match(r('clubhousePanel(clubhouseModel())'),/35\/100/);assert.equal(r('clubhouseSelect("not-a-player")'),false);
 r('p.health.injury={name:"Skada",remaining:5}');assert.equal(r('clubhousePresence(p).present'),false);assert.match(r('clubhousePanel(clubhouseModel())'),/inte på plats/);assert.equal(r('clubhouseTalk(p.id,"listen")'),false);
});
test('a conversation has the existing real trust effect, followup, memory and cooldown after reload',()=>{
 const a=setup(),r=a.run;r('clubhouseGo("locker");globalThis.p=managerRoster()[0];clubhouseSelect(p.id);globalThis.trust=p.social.trust;globalThis.date=state.calendar.date;');
 assert.equal(r('clubhouseTalk(p.id,"listen")'),true);assert.ok(r('p.social.trust>trust'));assert.ok(r('p.social.lastResponse'));assert.ok(r('state.locker.log.length>0'));assert.equal(r('state.calendar.date'),r('date'));
 r('globalThis.after=JSON.stringify([p.social,state.locker]);');assert.equal(r('clubhouseTalk(p.id,"listen")'),false);assert.equal(r('JSON.stringify([p.social,state.locker])'),r('after'));assert.doesNotThrow(()=>r('validateSaveText(saveExportText())'));r('save()');
 const q=boot(a.storage.value).run;assert.equal(q('managerRoster()[0].social.lastResponse'),r('p.social.lastResponse'));assert.equal(q('managerRoster()[0].social.lastTalk'),r('p.social.lastTalk'));
});
test('stale, foreign, unselected and live-match conversation actions cannot edit another player',()=>{
 const {run:r}=setup();r('clubhouseGo("locker");globalThis.p=managerRoster()[0],other=managerRoster()[1];clubhouseSelect(p.id);globalThis.before=JSON.stringify(state.locker)');
 assert.equal(r('clubhouseTalk(other.id,"listen")'),false);assert.equal(r('clubhouseTalk("foreign","listen")'),false);assert.equal(r('clubhouseTalk(p.id,"invented")'),false);
 r('state.live={finished:false};');assert.equal(r('clubhouseTalk(p.id,"listen")'),false);assert.equal(r('JSON.stringify(state.locker)'),r('before'));
});
test('classic mode, expanded press/stories and navigation retain all existing screens',()=>{
 const {run:r}=setup();r('clubhouseMode(false)');assert.equal(r('clubhouseEnabled()'),false);assert.match(r('clubhouseWrap("ORIGINAL")'),/ORIGINAL/);assert.match(r('clubhouseWrap("ORIGINAL")'),/Tillbaka/);
 r('clubhouseGo("office");overviewUI.press=true');assert.equal(r('clubhouseIsRoom()'),false);assert.match(r('clubhouseWrap("PRESS")'),/PRESS/);r('overviewUI.press=false');assert.equal(r('clubhouseIsRoom()'),true);
 r('clubhouseGo("ice");deskNavigate("home")');assert.equal(r('clubhouseRoomForPage()'),'office');
 r('state.page="match"');assert.equal(r('clubhouseWrap("FULL-MATCH")'),'FULL-MATCH');
 r('careerScreen="menu"');assert.equal(r('clubhouseWrap("MENU")'),'MENU');
});
test('appearance changes are cosmetic, validate choices and survive on this device',()=>{
 const {run:r}=setup();r('globalThis.before=JSON.stringify(state)');assert.equal(r('clubhouseAppearance("skin","dark")'),true);assert.equal(r('clubhouseAppearanceData().skin'),'dark');assert.equal(r('clubhouseAppearance("outfit","tracksuit")'),true);assert.equal(r('clubhouseAppearance("skin","invalid")'),false);assert.equal(r('JSON.stringify(state)'),r('before'));
});
test('work tools use their mapped rooms and return to the originating room without changing the career',()=>{
 const {run:r}=setup();r('ensureLines();globalThis.before=JSON.stringify([state.calendar,state.money,state.lines,state.training.promises]);');
 for(const [room,page,workroom] of [['office','squad','locker'],['locker','lines','tactics'],['ice','training','ice'],['recruit','transfers','recruit'],['boardroom','finance','boardroom'],['world','leagues','world']]){
  r(`clubhouseGo('${room}');clubhouseOpen('${page}')`);assert.equal(r('clubhouseRoomForPage()'),workroom);assert.equal(r('clubhouseUI.origin.room'),room);assert.match(r('clubhouseWrap("REAL-WORK")'),/ch-work-dialog[\s\S]*REAL-WORK/);assert.equal(r('clubhouseEnabled()'),true);
  r('clubhouseReturn()');assert.equal(r('clubhouseRoomForPage()'),room);assert.equal(r('clubhouseIsRoom()'),true);assert.doesNotMatch(r('clubhouseWrap("WORK")'),/ch-work-dialog/);
 }
 assert.equal(r('JSON.stringify([state.calendar,state.money,state.lines,state.training.promises])'),r('before'));
 r('clubhouseGo("office");clubhouseAreas()');const menu=r('clubhouseWrap("WORK")');for(const text of ['Alla områden','Sparfiler & inställningar','Huvudmeny'])assert.ok(menu.includes(text));
});
test('work overlay preserves the selected locker player and classic mode remains explicit',()=>{
 const {run:r}=setup();r('clubhouseGo("locker");globalThis.id=managerRoster()[0].id;clubhouseSelect(id);clubhouseWorkView()');assert.equal(r('clubhouseIsRoom()'),false);assert.equal(r('clubhouseEnabled()'),true);assert.match(r('clubhouseWrap("RELATIONS")'),/RELATIONS/);
 r('clubhouseReturn()');assert.equal(r('clubhouseRoomForPage()'),'locker');assert.equal(r('String(clubhouseUI.player)'),r('String(id)'));r('clubhouseTableMode()');assert.equal(r('clubhouseEnabled()'),false);assert.doesNotMatch(r('clubhouseWrap("TABLES")'),/id="ch-world"/);
});
test('daily initiatives reflect actual career evidence without changing or completing it',()=>{
 const {run:r}=setup();r('globalThis.p=managerRoster()[0];p.social.trust=42;globalThis.before=JSON.stringify(state);globalThis.life=clubhouseModel().life;clubhouseWorldView("ORIGINAL");clubhouseLifeBriefing(clubhouseModel())');
 assert.equal(r('JSON.stringify(state)'),r('before'));assert.equal(r('life.visitor.playerId'),r('String(p.id)'));assert.equal(r('life.visitor.label'),'Assistentens samtalsförslag');assert.ok(r('life.agenda.some(i=>i.action?.conversationPlayer===p.id)'));
 r('p.health.injury={name:"Skada",remaining:4}');assert.notEqual(r('clubhouseLifeVisitor()?.playerId'),r('String(p.id)'));r('delete p.health.injury;p.social.lastTalk=state.locker.turn');assert.notEqual(r('clubhouseLifeVisitor()?.playerId'),r('String(p.id)'));
 assert.equal(r('clubhouseLifeOpen("stale-or-foreign-item")'),false);
});
test('a real office visitor has one guarded conversation, feedback and persisted memory',()=>{
 const a=setup(),r=a.run;r('globalThis.p=managerRoster()[0];p.social.trust=43;globalThis.trust=p.social.trust;globalThis.before=JSON.stringify([state.calendar,state.money,state.lines,p.promisedRole]);');
 assert.equal(r('clubhouseAcceptVisitor("not-the-visitor")'),false);assert.equal(r('clubhouseAcceptVisitor(p.id)'),true);assert.match(r('clubhousePanel(clubhouseModel())'),/På ditt kontor/);
 assert.equal(r('clubhouseTalk(p.id,"listen")'),true);assert.equal(r('clubhouseUI.feedback.delta'),r('Math.round((p.social.trust-trust)*10)/10'));assert.match(r('clubhouseLifeFeedback(clubhouseModel())'),/Samtalets återkoppling/);assert.equal(r('clubhouseTalk(p.id,"listen")'),false);
 assert.equal(r('JSON.stringify([state.calendar,state.money,state.lines,p.promisedRole])'),r('before'));assert.equal(r('clubhouseLifeVisitor().playerId'),r('String(p.id)'));
 assert.equal(r('clubhouseModel().life.agenda.some(i=>samePlayerId(i.action?.conversationPlayer,p.id))'),false,'a review fourteen days away does not request a second meeting today');
 r('clubhouseOpen("player");clubhouseReturn()');assert.equal(r('clubhouseRoomForPage()'),'office');assert.equal(r('String(clubhouseUI.player)'),r('String(p.id)'));
 r('save()');const q=boot(a.storage.value).run;assert.equal(q('managerRoster()[0].social.lastResponse'),r('p.social.lastResponse'));assert.ok(q('managerRoster()[0].social.journal.length')>0);
 r('clubhouseCloseMeeting()');assert.notEqual(r('clubhouseLifeVisitor()?.playerId'),r('String(p.id)'));
});
test('an office conversation cannot silently answer a mandatory player request',()=>{
 const {run:r}=setup();r(`globalThis.p=managerRoster()[0];managerMessage('clubhouse-request','Spelaren vill ha ett rollbesked','Ett faktiskt beslut','Spelarsamtal',{playerId:p.id,decisionType:'minutes'});globalThis.message=pendingManagerDecision();`);
 assert.equal(r('clubhouseLifeVisitor().kind'),'request');assert.equal(r('clubhouseAcceptVisitor(p.id)'),true);assert.match(r('clubhousePanel(clubhouseModel())'),/Svara på Spelaren vill ha ett rollbesked/);assert.equal(r('clubhouseTalk(p.id,"listen")'),true);assert.equal(r('Boolean(message.resolved)'),false);
 r('globalThis.date=state.calendar.date');assert.equal(r('clubhouseNextEvent()'),false);assert.equal(r('state.calendar.date'),r('date'));assert.equal(r('Boolean(message.resolved)'),false);
 assert.match(r('clubhouseLifePace(clubhouseModel())'),/Spelaren vill ha ett rollbesked/);r('message.resolved=true');assert.equal(r('clubhouseLifePace(clubhouseModel())'),'');
});
test('an office meeting cannot carry its actor or feedback into a new day or an injury',()=>{
 const {run:r}=setup();r('globalThis.p=managerRoster()[0];p.social.trust=42;clubhouseAcceptVisitor(p.id);clubhouseTalk(p.id,"listen");state.calendar.date=calAdd(state.calendar.date,1);clubhouseLifeSync()');
 assert.equal(r('clubhouseUI.officeGuest'),null);assert.equal(r('clubhouseUI.feedback'),null);assert.equal(r('clubhouseUI.player'),null);
 r('p.social.lastTalk=-10;clubhouseAcceptVisitor(p.id);p.health.injury={name:"Skada",remaining:4};clubhouseLifeSync()');assert.equal(r('clubhouseUI.officeGuest'),null);assert.equal(r('clubhouseUI.player'),null);assert.equal(r('clubhouseTalk(p.id,"listen")'),false);
 r('delete p.health.injury;p.social.lastTalk=-10;clubhouseAcceptVisitor(p.id);clubhouseTalk(p.id,"listen");startCareerWithClub("HV71");clubhouseGo("office")');assert.equal(r('clubhouseUI.officeGuest'),null);assert.equal(r('clubhouseUI.feedback'),null);assert.equal(r('clubhouseUI.player'),null);
});
test('dated office followup preserves match-based promises and returns from their work surface',()=>{
 const {run:r}=setup();r('globalThis.p=managerRoster().find(p=>p.pos!=="MV"&&!playerLoan(p));playerChance(p.id);state.calendar.date=calAdd(state.calendar.date,14);clubhouseGo("office");');
 assert.equal(r('clubhouseLifeVisitor().kind'),'followup');assert.equal(r('clubhouseAcceptVisitor(p.id)'),true);assert.equal(r('clubhouseReviewPromises()'),true);assert.equal(r('clubhouseUI.work'),true);assert.equal(r('lockerUI.tab'),'promises');r('clubhouseReturn()');assert.equal(r('clubhouseRoomForPage()'),'office');assert.equal(r('String(clubhouseUI.player)'),r('String(p.id)'));
 assert.equal(r('clubhouseReviewConversation(p.id)'),true);assert.equal(r('p.recruitmentPromise.resolved'),false);assert.equal(r('clubhouseReviewConversation(p.id)'),false);
 r('clubhouseCloseMeeting()');assert.notEqual(r('clubhouseLifeVisitor()?.playerId'),r('String(p.id)'));assert.doesNotThrow(()=>r('validateSaveText(saveExportText())'));
});
test('room event progression uses the existing calendar and stops before the actual match',()=>{
 const a=boot(undefined,{production:true}),r=a.run;r(`startCareerWithClub('HV71');preseasonConfigure('balanced','manager','rotation','assistant','assistant');globalThis.window={};clubhouseGo('office');for(const key of Object.keys(calendarPaceStore().stops))calendarPaceStore().stops[key]=false;globalThis.before=state.calendar.date;`);
 assert.equal(r('clubhouseNextEvent()'),true);r('globalThis.n=0;while(calendarPaceRun&&n++<20)calendarPaceTick(calendarPaceRun)');assert.equal(r('state.calendar.date'),'2026-08-06');assert.equal(r('state.live'),null);assert.equal(r('calendarPaceSettings().last.days'),5);assert.equal(r('clubhouseRoomForPage()'),'office');assert.equal(r('clubhouseIsRoom()'),true);
 assert.match(r('clubhouseLifePace(clubhouseModel())'),/5 dagar senare/);assert.equal(r('clubhouseNextEvent()'),false);assert.equal(r('state.calendar.date'),'2026-08-06');
 r('clubhouseGo("ice");calendarSetSession(state.calendar.date,"type","recovery")');assert.equal(r('clubhouseModel().life.session'),'recovery');assert.doesNotThrow(()=>r('validateSaveText(saveExportText())'));
});
