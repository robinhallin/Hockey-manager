'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{boot}=require('./scripts/career-test-fixture.cjs');
function setup(){const a=boot(undefined,{production:true});a.run("globalThis.window={};startCareerWithClub('HV71');preseasonConfigure('balanced','manager','rotation','manager','assistant');ensureLines();depthSelection();ensureSpecialTeams();tacticsWorkspaceView();clubhouseGo('office')");return a;}
test('all 21 room stations directly open a real tool, briefing or conversation workspace without advancing the career',()=>{
 const {run:r}=setup();r('globalThis.before=JSON.stringify([state.calendar.date,state.money,state.training.history,state.live,state.round,state.lines,state.specialTeams])');
 for(const room of r('Object.keys(ROOM_WORK_ROUTES)'))for(const [station,route] of Object.entries(r('ROOM_WORK_ROUTES['+JSON.stringify(room)+']'))){
  r('clubhouseRoomsVisit('+JSON.stringify(room)+')');assert.equal(r('roomWorkStation('+JSON.stringify(station)+',clubhouseRoomsUI.token)'),true,room+'/'+station);
  if(room==='tactics'&&['board','opponent'].includes(station)){assert.equal(r('clubhouseIsRoom()'),true);assert.equal(r('roomCoachUI.step'),station==='board'?'lineup':'brief');}
  else{assert.equal(r('state.page'),route[0]);assert.equal(r('clubhouseIsRoom()'),false);assert.match(r('clubhouseWorldView("CANONICAL TOOL")'),/rw-workbench/);assert.match(r('clubhouseWorldView("CANONICAL TOOL")'),/CANONICAL TOOL/);if(room==='recruit')assert.equal(r('state.recruitment.tab'),route[1]);}
 }
 assert.equal(r('JSON.stringify([state.calendar.date,state.money,state.training.history,state.live,state.round,state.lines,state.specialTeams])'),r('before'));
});
test('station controls reject stale day, career and room contexts and preserve actual return location',()=>{
 const {run:r}=setup();r("clubhouseRoomsVisit('recruit');roomWorkStation('reports',clubhouseRoomsUI.token);globalThis.token=roomWorkUI.token");
 assert.equal(r('state.recruitment.tab'),'missions');assert.equal(r("roomWorkSwitch('ice','medical',token)"),false);assert.equal(r("roomWorkSwitch('recruit','deals',token)"),true);assert.equal(r('state.recruitment.tab'),'deals');
 assert.equal(r("roomWorkSwitch('recruit','needs',token)"),false);r('clubhouseReturn()');assert.equal(r('clubhouseRoomsKey()'),'recruit');assert.equal(r('clubhouseRoomsUI.station'),'deals');
 r("roomWorkStation('needs',clubhouseRoomsUI.token);globalThis.token=roomWorkUI.token;state.calendar.date=calAdd(state.calendar.date,1)");assert.equal(r("roomWorkPage('transfers','search',token)"),false);
 r("startCareerWithClub('Leksands IF');preseasonConfigure('balanced','manager','rotation','manager','assistant')");assert.equal(r("roomWorkPage('transfers','deals',token)"),false);
});
test('every existing career route uses the room material system and detail navigation keeps canonical history',()=>{
 const {run:r}=setup();
 for(const page of ['inbox','calendar','season','settings','squad','locker','lines','opponents','statistics','training','juniors','medical','transfers','board','finance','staff','staffReview','manager','world','leagues','international','nhl','table','leagueStats','news','clubDetail']){
  r('clubhouseRoomsVisit("office");clubhouseRoomsOpen('+JSON.stringify(page)+')');const html=r('clubhouseWorldView("TOOL BODY")');assert.match(html,/rw-workbench/,page);assert.match(html,/TOOL BODY/,page);assert.doesNotMatch(html,/Bredda|aria-modal="true"|clubhouse-canvas/,page);
 }
 r("clubhouseRoomsVisit('recruit');roomWorkStation('needs',clubhouseRoomsUI.token);globalThis.player=managerRoster()[0].id;deskOpenPlayer(player)");assert.equal(r('state.page'),'player');assert.match(r('clubhouseWorldView("PROFILE")'),/Till arbetet/);r("deskBack('transfers')");assert.equal(r('state.page'),'transfers');assert.equal(r('state.recruitment.tab'),'needs');
});
test('world watch and contract stations open the correct working filter without recording decisions',()=>{
 const {run:r}=setup();r("clubhouseRoomsVisit('world');globalThis.before=JSON.stringify(state.worldWatch);roomWorkStation('watch',clubhouseRoomsUI.token)");assert.equal(r('worldWatchUI.filter'),'following');assert.equal(r('JSON.stringify(state.worldWatch)'),r('before'));
 r("clubhouseRoomsVisit('locker');roomWorkStation('roles',clubhouseRoomsUI.token)");assert.equal(r('squadUI.tab'),'contracts');assert.equal(r('squadUI.status'),'all');
 r("clubhouseRoomsVisit('boardroom');roomWorkStation('staff',clubhouseRoomsUI.token)");assert.equal(r('state.page'),'staffReview');assert.match(r('clubhouseWorldView(staffReviewView())'),/Ansvar & mandat/);
});
