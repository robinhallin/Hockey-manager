'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const context=vm.createContext({});
for(const file of ['match-presentation.js','archive/retired-3d/match-3d.js'])vm.runInContext(fs.readFileSync(file,'utf8'),context);
const {present,retired}=vm.runInContext('({present:MatchPresentation,retired:Match3D})',context);
test('the 2D snapshot adapter preserves interpolation and tactical evidence without writes',()=>{
 const H=require('./scripts/current-match-engine.cjs'),rosters=require('./match-lab-rosters'),engine=new H.Match(rosters,{seed:712});
 let prior=engine.presentationFrame();
 for(let i=0;i<180;i++){
  engine.step();if(i%9)continue;
  const frame=engine.presentationFrame(),saved=JSON.stringify([prior,frame]);
  for(const blend of [0,.35,1])assert.equal(JSON.stringify(present.sample(frame,prior,blend)),JSON.stringify(retired.sample(frame,prior,blend)));
  assert.equal(JSON.stringify(present.replayAnalysis([prior,frame],frame)),JSON.stringify(retired.replayAnalysis([prior,frame],frame)));
  assert.equal(JSON.stringify([prior,frame]),saved);
  prior=frame;
 }
});
test('the production entrypoint has no 3D runtime or view-switch controls',()=>{
 const {boot}=require('./scripts/career-test-fixture.cjs'),a=boot(undefined,{production:true}),r=a.run;
 assert.equal(r('typeof Match3D'),'undefined');assert.equal(r('typeof ClubhouseScene'),'undefined');assert.equal(r('typeof HockeyThree'),'undefined');
 r("startCareerWithClub('HV71');preseasonConfigure('balanced','manager','rotation','assistant','assistant');globalThis.window={};clubhouseGo('office');");
 assert.doesNotMatch(r('clubhouseWorldView("WORK")'),/Utforska i 3D|Byt till tabelläge|coachWorkspaceEnter|clubhouse-canvas/);
 r('state.calendar.date=calendarTarget();coachJourneyPrepare()');
 assert.match(r('coachJourneyRoomView("locker")'),/Till 2D-matchen/);
 r('coachJourneyMove("bench")');
 assert.match(r('matchDeskView()'),/career-ice/);
 assert.doesNotMatch(r('matchDeskView()+matchPreferencesView()'),/career-ice-3d|3D-kamera|3D-grafik/);
});
test('primary destinations and recruitment steps remain usable without changing the career',()=>{
 const {boot}=require('./scripts/career-test-fixture.cjs'),a=boot(undefined,{production:true}),r=a.run;
 r("startCareerWithClub('HV71');preseasonConfigure('balanced','manager','rotation','assistant','assistant');globalThis.window={};clubhouseGo('office');ensureLines();globalThis.before=JSON.stringify([state.calendar,state.money,state.lines,managerRoster().map(p=>[p.id,p.promisedRole])]);");
 for(const [page,area,room] of [['squad','team','locker'],['lines','tactics','tactics'],['training','development','ice'],['transfers','recruit','recruit'],['board','club','boardroom'],['world','world','world']]){
  r('clubhouseThemeNavigate('+JSON.stringify(page)+')');assert.equal(r('clubhouseRoomsKey()'),room);assert.equal(r('clubhouseThemeArea().id'),area);
  assert.match(r('clubhouseWorldView("ROOM")'),/cr-environment/);r('clubhouseRoomsOpen('+JSON.stringify(page)+',null,clubhouseRoomsUI.token)');assert.equal(r('state.page'),page);
  const html=r('clubhouseWorldView("WORK")');assert.match(html,/role="region"/);assert.doesNotMatch(html,/aria-modal="true"/);
  r('clubhouseReturn()');assert.equal(r('clubhouseRoomForPage()'),room);
 }
 assert.equal(r('JSON.stringify([state.calendar,state.money,state.lines,managerRoster().map(p=>[p.id,p.promisedRole])])'),r('before'));
 r("clubhouseThemeNavigate('transfers')");
 for(const key of ['overview','needs','search','missions','shortlist','deals','loans']){
  r("clubhouseOpen('transfers',"+JSON.stringify(key)+")");
  assert.equal(r('state.recruitment.tab'),key);
  assert.match(r('clubhouseThemeRecruitmentTabs()'),/aria-current="page"/);
 }
});
