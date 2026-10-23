'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {boot}=require('./scripts/career-test-fixture.cjs');
function setup(){const a=boot(undefined,{production:true});a.run("globalThis.window={};startCareerWithClub('HV71');preseasonConfigure('balanced','manager','rotation','assistant','assistant');ensureLines();clubhouseGo('office');");return a;}
const facts="JSON.stringify([state.calendar,state.money,state.lines,state.specialTeams,state.schedule,state.training,state.recruitment,managerRoster(),state.season,state.managerCareer,state.worldWatch])";
test('seven distinct workrooms and every station read the actual career without simulation or rewards',()=>{
 const a=setup(),r=a.run,images=new Set();r('globalThis.before='+facts);
 for(const room of ['office','locker','tactics','ice','recruit','boardroom','world']){
  assert.equal(r('clubhouseRoomsVisit('+JSON.stringify(room)+')'),true);
  assert.equal(r('clubhouseRoomsKey()'),room);assert.equal(r('clubhouseIsRoom()'),true);
  const image=r('CLUBHOUSE_WORKROOMS['+JSON.stringify(room)+'].image');images.add(image);assert.ok(fs.existsSync('assets/clubhouse/rooms/'+image+'.webp'));
  for(const key of r('CLUBHOUSE_WORKROOMS['+JSON.stringify(room)+'].stations.map(s=>s[0])')){
   assert.equal(r('clubhouseRoomsStation('+JSON.stringify(key)+',clubhouseRoomsUI.token)'),true);
   const html=r('clubhouseWorldView("READ")');assert.match(html,/cr-environment/);assert.match(html,/cr-side-panel/);assert.doesNotMatch(html,/clubhouse-canvas|career-ice-3d/);
  }
 }
 assert.equal(images.size,7);assert.equal(r(facts),r('before'));
 r("clubhouseGo('office')");assert.equal(r('clubhouseRoomsKey()'),'hub');assert.match(r('clubhouseWorldView("READ")'),/assets\/clubhouse\/interior.webp/);
});
test('room training choices persist and have exactly the canonical calendar command effects',()=>{
 const a=setup(),r=a.run;r("clubhouseRoomsVisit('ice');globalThis.date=calAdd(state.calendar.date,1);globalThis.token=clubhouseRoomsUI.token;save();");
 const b=boot(a.storage.value,{production:true});
 assert.equal(r('clubhouseRoomsDay(date,token)'),true);assert.equal(r("clubhouseRoomsSession(date,'type','recovery',token)"),true);
 b.run("calendarSetSession(calAdd(state.calendar.date,1),'type','recovery')");
 assert.equal(r('JSON.stringify(state.calendar.plans)'),b.run('JSON.stringify(state.calendar.plans)'));
 assert.equal(r("clubhouseRoomsSession(date,'intensity','hard',token)"),false);
 assert.equal(r('state.calendar.date'),b.run('state.calendar.date'));assert.equal(r('state.training.history.length'),0);
 const loaded=boot(a.storage.value,{production:true});assert.equal(loaded.run('calendarSession(calAdd(state.calendar.date,1)).type'),'recovery');
 r("globalThis.matchDate=calendarTarget();clubhouseRoomsDay(matchDate,token)");assert.equal(r("clubhouseRoomsSession(matchDate,'type','skills',token)"),false);
 r("clubhouseRoomsVisit('world')");assert.equal(r("clubhouseRoomsSession(date,'type','skills',token)"),false);
 r("clubhouseRoomsVisit('ice');globalThis.old=clubhouseRoomsUI.token;state.calendar.date=calAdd(state.calendar.date,1);clubhouseRoomsSync()");assert.equal(r("clubhouseRoomsSession(date,'type','skills',old)"),false);
});
test('real conversations preserve the existing effect and cooldown, while absent and foreign players cannot be selected',()=>{
 const a=setup(),r=a.run;r("clubhouseRoomsVisit('locker');globalThis.p=managerRoster().find(p=>clubhousePresence(p).present);globalThis.trust=p.social.trust;globalThis.date=state.calendar.date;");
 assert.equal(r('clubhouseRoomsTalk(p.id,clubhouseRoomsUI.token)'),true);assert.equal(r("clubhouseTalk(p.id,'listen')"),true);assert.ok(r('p.social.trust')>r('trust'));
 const trust=r('p.social.trust');assert.equal(r("clubhouseTalk(p.id,'listen')"),false);assert.equal(r('p.social.trust'),trust);assert.equal(r('state.calendar.date'),r('date'));
 r('clubhouseCloseMeeting();p.health.injury={name:"Test",days:3}');assert.equal(r('clubhouseRoomsTalk(p.id,clubhouseRoomsUI.token)'),false);assert.equal(r("clubhouseRoomsTalk('another-club-player',clubhouseRoomsUI.token)"),false);
 r("clubhouseRoomsVisit('recruit')");assert.equal(r('clubhouseRoomsTalk(p.id,clubhouseRoomsUI.token)'),false);
});
test('the world desk uses canonical saved following and rejects stale career actions',()=>{
 const a=setup(),r=a.run;r("clubhouseRoomsVisit('world');globalThis.target=deskFixtures().upcoming[0].opponent;globalThis.token=clubhouseRoomsUI.token;globalThis.date=state.calendar.date;globalThis.cash=state.money;");
 assert.equal(r('clubhouseRoomsFollow(target,token)'),true);assert.equal(r('worldWatchStore().clubs.includes(target)'),true);assert.equal(r('state.calendar.date'),r('date'));assert.equal(r('state.money'),r('cash'));
 const loaded=boot(a.storage.value,{production:true});assert.equal(loaded.run('worldWatchStore().clubs.includes('+JSON.stringify(r('target'))+')'),true);
 r("startCareerWithClub('Leksands IF');preseasonConfigure('balanced','manager','rotation','assistant','assistant');clubhouseRoomsVisit('world')");assert.equal(r('clubhouseRoomsFollow(target,token)'),false);
});
test('each work surface returns to its room and the selected station; special teams open the requested unit',()=>{
 const a=setup(),r=a.run;
 for(const [room,page] of [['office','calendar'],['locker','squad'],['tactics','lines'],['ice','medical'],['recruit','transfers'],['boardroom','finance'],['world','leagues']]){
  r('clubhouseRoomsVisit('+JSON.stringify(room)+');clubhouseRoomsStation(CLUBHOUSE_WORKROOMS['+JSON.stringify(room)+'].stations[1][0],clubhouseRoomsUI.token);globalThis.station=clubhouseRoomsUI.station;');
  assert.equal(r('clubhouseRoomsOpen('+JSON.stringify(page)+',null,clubhouseRoomsUI.token)'),true);assert.equal(r('state.page'),page);assert.match(r('clubhouseWorldView("WORK")'),/role="region"/);
  r('clubhouseReturn()');assert.equal(r('clubhouseRoomsKey()'),room);assert.equal(r('clubhouseRoomsUI.station'),r('station'));
 }
 r("clubhouseRoomsVisit('tactics');globalThis.before=JSON.stringify([state.lines,state.specialTeams,state.calendar.date]);");assert.equal(r("clubhouseRoomsLine('pp',1,clubhouseRoomsUI.token)"),true);assert.equal(r('specialUI.unit'),'pp2');assert.equal(r('JSON.stringify([state.lines,state.specialTeams,state.calendar.date])'),r('before'));
});
