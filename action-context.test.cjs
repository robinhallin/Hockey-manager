'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{boot}=require('./scripts/career-test-fixture.cjs');
function setup(){const app=boot(undefined,{production:true});app.run("startCareerWithClub('HV71');preseasonConfigure('balanced','manager','rotation','assistant','assistant');globalThis.window={};clubhouseGo('locker');globalThis.a=managerRoster()[3];globalThis.b=managerRoster()[6];clubhouseSelect(b.id);a.social.trust=35;");return app;}
test('a named followup replaces the previously selected room player without changing the career',()=>{
 const {run:r}=setup();r('globalThis.before=JSON.stringify(state);playerFollowupOpen(a.id)');
 assert.equal(r('clubhousePlayer()?.id'),r('a.id'));assert.equal(r('clubhouseIsRoom()'),true);
 assert.match(r('clubhousePanel(clubhouseModel())'),new RegExp(r('a.name')));
 assert.equal(r('JSON.stringify(state)'),r('before'));
});
test('opening a particular message exits the agenda and a conflicting report filter',()=>{
 const {run:r}=setup();r("managerMessage('context-a',a.name+' vill prata','A','Spelarsamtal',{playerId:a.id,decisionType:'minutes'});globalThis.messageA=pendingManagerDecision();managerMessage('context-b',b.name+' vill prata','B','Spelarsamtal',{playerId:b.id,decisionType:'minutes'});globalThis.item=managerAgendaItems().find(i=>i.action?.messageId===messageA.id);inboxFilter('agenda');clubhouseGo('office');clubhouseLifeOpen(item.id)");
 assert.equal(r('inboxUI.filter'),'all');assert.equal(r('state.training.selectedMessage'),r('messageA.id'));
 assert.match(r('inboxView()'),/id="inbox-letter"/);assert.equal(r('Boolean(messageA.resolved)'),false);
 r("inboxFilter('reports');openManagerMessage(messageA.id)");assert.equal(r('inboxUI.filter'),'all');
 assert.equal(r('inboxUI.detail'),true);
});
test('a removed player and expired agenda link cannot open a different person',()=>{
 const {run:r}=setup();r('globalThis.selected=clubhouseUI.player');
 assert.equal(r("playerFollowupOpen('missing-player')"),false);assert.equal(r('clubhouseUI.player'),r('selected'));
 assert.equal(r("clubhouseLifeOpen('expired-case')"),false);assert.equal(r('clubhouseUI.player'),r('selected'));
});
test('the classic followup still opens the exact player in the existing conversation tool',()=>{
 const {run:r}=setup();r('clubhouseMode(false);playerFollowupOpen(a.id)');
 assert.equal(r('state.page'),'locker');assert.equal(r('lockerUI.player'),r('a.id'));assert.equal(r('lockerUI.detail'),'talk');
});
test('a named promise review selects the same player in the working tool and remains read-only during absence',()=>{
 const {run:r}=setup();r("a.health.injury={name:'Skada',remaining:4};globalThis.before=JSON.stringify([state.calendar,state.lines,state.money,state.training.promises]);managerOfficeOpenPromise(a.id)");
 assert.equal(r('lockerUI.player'),r('a.id'));assert.equal(r('lockerUI.tab'),'promises');assert.equal(r('clubhouseIsRoom()'),false);
 assert.equal(r('JSON.stringify([state.calendar,state.lines,state.money,state.training.promises])'),r('before'));
});
