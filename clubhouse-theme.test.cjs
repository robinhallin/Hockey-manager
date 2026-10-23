'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{boot}=require('./scripts/career-test-fixture.cjs');
function setup(){const a=boot(undefined,{production:true});a.run("startCareerWithClub('HV71');preseasonConfigure('balanced','manager','rotation','assistant','assistant');globalThis.window={};clubhouseGo('office');");return a;}
test('the option-three shell reads career evidence and every room preserves the career',()=>{
 const {run:r}=setup();r('globalThis.before=JSON.stringify(state)');
 const html=r('clubhouseWorldView("READ")');assert.match(html,/ct-world/);assert.match(html,/Din tränardag/);assert.match(html,/assets\/clubhouse\/interior.webp/);assert.match(html,/HV71/);assert.doesNotMatch(html,/11\.00|Ge junioren chansen/);
 r("for(const room of Object.keys(CLUBHOUSE_ROOMS)){clubhouseGo(room);clubhouseWorldView('READ');}clubhouseGo('office');");
 assert.equal(r('JSON.stringify(state)'),r('before'));
 for(const p of ['squad','lines','transfers','training','juniors','medical','finance','board','staff','world','leagues','international','nhl','settings','player']){
  r(`clubhouseOpen(${JSON.stringify(p)});`);assert.match(r('clubhouseWorldView("READ")'),/role="region"/);r('clubhouseReturn()');assert.equal(r('clubhouseIsRoom()'),true);
 }
});
test('a required decision is shown first and Continue opens it without advancing or resolving it',()=>{
 const {run:r}=setup();r("managerMessage('theme-required','Ett viktigt spelarbesked','Ett svar krävs.','Spelaren',{decisionType:'role'});globalThis.pending=pendingManagerDecision();globalThis.date=state.calendar.date;");
 assert.equal(r('clubhouseThemePriority(clubhouseModel()).title'),'Ett viktigt spelarbesked');
 assert.equal(r('clubhouseThemeContinue()'),false);assert.equal(r('state.calendar.date'),r('date'));assert.equal(r('pendingManagerDecision().id'),r('pending.id'));assert.equal(r('dayTransition'),null);
});
test('the theme Continue performs one real day and returns to the same presentation after save reload',()=>{
 const a=setup(),r=a.run;r("calendarSetSession(state.calendar.date,'type','skills');globalThis.date=state.calendar.date;globalThis.n=state.training.history.length;");
 assert.equal(r('clubhouseThemeContinue()'),true);assert.equal(r('clubhouseThemeContinue()'),false);
 r('dayTransitionRun(dayTransition)');assert.equal(r('state.calendar.date'),r('calAdd(date,1)'));assert.equal(r('state.training.history.length'),r('n+1'));assert.equal(r('clubhouseEnabled()'),true);
 r('save()');const b=boot(a.storage.value,{production:true});assert.equal(b.run('state.calendar.date'),r('state.calendar.date'));assert.equal(b.run('state.training.history.length'),r('n+1'));
});
test('retired live rooms cannot return; actual conversations keep their cooldown and effect',()=>{
 const {run:r}=setup();r('globalThis.before=JSON.stringify(state)');assert.equal(r('clubhouseThemeScene("fake")'),false);assert.equal(r('clubhouseThemeScene("live")'),false);assert.equal(r('clubhouseThemeScene("illustrated")'),true);assert.equal(r('JSON.stringify(state)'),r('before'));
 r("clubhouseGo('locker');globalThis.p=managerRoster().find(p=>clubhousePresence(p).present);globalThis.trust=p.social.trust;");
 assert.equal(r('clubhouseSelect(p.id)'),true);assert.equal(r('clubhouseTalk(p.id,"listen")'),true);assert.ok(r('p.social.trust')>r('trust'));assert.equal(r('clubhouseTalk(p.id,"listen")'),false);assert.ok(r('clubhouseUI.feedback'));
});
test('the theme match button uses the real fixture and existing match-day route',()=>{
 const {run:r}=setup();r("state.calendar.date=calendarTarget();globalThis.date=state.calendar.date;");
 assert.equal(r('clubhouseThemeContinue()'),true);assert.equal(r('state.live.friendly'),true);assert.equal(r('state.page'),'match');assert.equal(r('coachJourneyStage()'),'locker');assert.equal(r('state.calendar.date'),r('date'));
});
