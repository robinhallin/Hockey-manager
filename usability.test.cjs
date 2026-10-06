'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {boot}=require('./scripts/career-test-fixture.cjs');
function start(){const a=boot(undefined,{production:true});a.run("startCareerWithClub('HV71');deskNavigate('home')");return a;}
test('six unambiguous areas preserve every old route and club responsibility',()=>{
 const {run:r}=start();assert.equal(r('DESK_AREAS.length'),6);
 for(const route of ['leagues','world','table','leagueStats','news','clubDetail','international','nhl','season'])assert.equal(r(`deskArea('${route}').id`),'world');
 assert.equal(r("deskArea('staffReview').id"),'club');
 assert.equal(r('new Set(DESK_AREAS.flatMap(a=>a.pages.map(p=>p[0]))).size'),r('DESK_AREAS.flatMap(a=>a.pages).length'));
 for(const page of ['calendar','schedule','round','press','stories','statistics','tactics','specialTeams','scouting','news','leagues','table','leagueStats','season','staffReview']){
  r(`deskNavigate('${page}')`);assert.doesNotMatch(r("document.getElementById('content').innerHTML"),/undefined|NaN/);
 }
});
test('search finds workflows, supports Swedish accents, and is read-only',()=>{
 const {run:r}=start();r('globalThis.before=JSON.stringify([state.money,state.calendar,state.lines,state.recruitment.deals,state.training.promises])');
 for(const [word,key] of [['budget','finance'],['lan','loans'],['delegering','staffReview'],['förlängningar','contracts'],['rehabilitering','medical'],['jvm','international'],['draft','nhl'],['bud','deals']])assert.ok(r(`deskFindResults(${JSON.stringify(word)}).some(d=>d[0]===${JSON.stringify(key)})`),word);
 assert.equal(r('deskFindResults("").length'),0);
 r(`state.playerSearchQuery='<img src=x onerror=bad()>';playerSearchView();deskSearchSuggestions()`);
 assert.doesNotMatch(r('playerSearchView()'),/<img/);
 assert.equal(r('JSON.stringify([state.money,state.calendar,state.lines,state.recruitment.deals,state.training.promises])'),r('before'));
});
test('every function shortcut opens the intended destination without committing a decision',()=>{
 const {run:r}=start();r('ensureLines();globalThis.before=JSON.stringify([state.money,state.calendar.date,state.recruitment.deals,state.training.promises,state.lines])');
 for(const key of r('DESK_DESTINATIONS.map(d=>d[0])')){
  assert.equal(r(`deskFindOpen('${key}')`),true,key);
  assert.equal(r('state.page'),r(`DESK_DESTINATIONS.find(d=>d[0]==='${key}')[3]`),key);
  assert.doesNotMatch(r("document.getElementById('content').innerHTML"),/undefined|NaN/,key);
 }
 assert.equal(r('JSON.stringify([state.money,state.calendar.date,state.recruitment.deals,state.training.promises,state.lines])'),r('before'));
 r("deskFindOpen('loans')");assert.equal(r('recruitHub.affairs'),'active');
 r("deskFindOpen('deals')");assert.equal(r('recruitHub.affairs'),'open');
 r("deskFindOpen('contracts')");assert.equal(r('squadUI.tab'),'contracts');assert.equal(r('squadUI.status'),'expiring');
 assert.equal(r("deskFindOpen('send-offer')"),false);
});
test('external player profile has four sections, preserves legacy links and hides private health',()=>{
 const {run:r}=start();r(`globalThis.p=state.playerWorld.freeAgents[0];deskOpenPlayer(p.id);p.health.injury={name:'SECRET-DIAGNOSIS'};`);
 assert.equal((r('playerProfileTabs(p)').match(/<button/g)||[]).length,4);
 for(const tab of ['overview','attributes','report','development','performance','history','contract']){
  r(`profileWorkspace.tab='${tab}'`);assert.doesNotMatch(r('externalPlayerProfile(p)'),/SECRET-DIAGNOSIS|undefined|NaN/);
 }
 r("profileWorkspace.tab='history'");assert.match(r('externalPlayerProfile(p)'),/Registrerad historik/);
});
test('league subnavigation replaces duplicate tabs and keeps selected competition',()=>{
 const {run:r}=start();r("deskNavigate('leagues');leagueSelect('HA');deskLeagueOpen('playoffs')");
 assert.equal(r('state.world.selected'),'HA');assert.match(r('deskLeagueNavigation()'),/aria-current="page"[^>]*>Slutspel & kval/);
 assert.doesNotMatch(r('leagueWorkspaceView()'),/class="lg-tabs"|Fullständig tabell/);
 r("deskNavigate('table');deskNavigate('leagueStats');deskLeagueOpen('history')");assert.equal(r('state.world.selected'),'HA');
 assert.equal(r('leagueWorkspaceUI.tab'),'history');
});
