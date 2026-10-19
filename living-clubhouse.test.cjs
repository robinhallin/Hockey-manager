'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {boot}=require('./scripts/career-test-fixture.cjs');
function setup(){const a=boot(),r=a.run;r(`startCareerWithClub('HV71');globalThis.window={};ClubhouseScene.mount=()=>{};ClubhouseScene.dispose=()=>{};clubhouseGo('office');`);return a;}
test('the default clubhouse uses the actual club and full roster without simulating or creating a lineup',()=>{
 const {run:r}=setup();r('globalThis.before=JSON.stringify(state);globalThis.model=clubhouseModel();clubhouseView();clubhouseModel();clubhousePanel(model)');
 assert.equal(r('JSON.stringify(state)'),r('before'));assert.equal(r('model.club'),'HV71');assert.equal(r('model.players.length'),r('managerRoster().length'));assert.equal(r('model.coach'),r('state.managerCareer.name'));assert.match(r('clubhouseWrap("old")'),/Tränarkontoret/);assert.doesNotMatch(r('clubhouseWrap("old")'),/undefined|NaN/);
});
test('walking between three rooms and opening workspaces preserves time, cash, selection and promises',()=>{
 const {run:r}=setup();r('ensureLines();globalThis.before=JSON.stringify([state.calendar,state.money,state.lines,state.locker,state.training.promises]);clubhouseGo("locker");clubhouseGo("ice");clubhouseOpen("lines");');
 assert.equal(r('state.page'),'lines');assert.match(r('clubhouseWrap("TACTICS")'),/Tillbaka till träningshallen/);r('clubhouseReturn()');assert.equal(r('clubhouseRoomForPage()'),'ice');
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
 r('careerScreen="menu"');assert.equal(r('clubhouseWrap("MENU")'),'MENU');
});
test('appearance changes are cosmetic, validate choices and survive on this device',()=>{
 const {run:r}=setup();r('globalThis.before=JSON.stringify(state)');assert.equal(r('clubhouseAppearance("skin","dark")'),true);assert.equal(r('clubhouseAppearanceData().skin'),'dark');assert.equal(r('clubhouseAppearance("outfit","tracksuit")'),true);assert.equal(r('clubhouseAppearance("skin","invalid")'),false);assert.equal(r('JSON.stringify(state)'),r('before'));
});
