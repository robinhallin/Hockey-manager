'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const H=require('./scripts/current-match-engine.cjs'),rosters=require('./match-lab-rosters');
const ctx=vm.createContext({});for(const f of ['match-player-asset.js','match-player-model.js','match-3d.js'])vm.runInContext(fs.readFileSync(f,'utf8'),ctx);
const R=vm.runInContext('Match3D',ctx),Model=vm.runInContext('HockeyPlayerModel',ctx);
function setup(side=0){const m=new H.Match(rosters,{seed:381,scenario:'attack',duration:100});m.time=m.wall=20;m.stoppage=0;m.owner=side;for(const a of m.actors)if(a.role!=='G')Object.assign(a,{x:30,y:3+m.skaters(a.side).indexOf(a)*5,vx:0,vy:0});const a=m.skaters(side)[0],d=m.skaters(1-side)[0],g=m.actors.find(a=>a.role==='G'&&a.side!==side);Object.assign(a,{x:H.progress(side,50),y:15});m.carrier=a.id;m.puck={x:a.x,y:a.y};Object.assign(g,m.goalieTarget(1-side,a));return {m,a,d,g};}

test('recorded motion eases between push and glide; blade contacts slide along their edge and replay stays frozen',()=>{
 const {m,a}=setup();a.vx=3;a.vy=0;a.travelled=.8;m.recordMotion(a,2.6,0,.1);const first=a.motion.drive;assert.ok(first>0&&first<1);
 m.wall+=.1;m.recordMotion(a,3,0,.1);assert.ok(Math.abs(a.motion.drive-first)<.5);
 const plant=a.footPlants.find(Boolean);assert.ok(plant);const before={...plant};m.wall+=.1;m.recordMotion(a,3,0,.1);
 const after=a.footPlants.find(Boolean);assert.ok(after.x>before.x);assert.ok(Math.abs(-(after.x-before.x)*Math.sin(after.angle)+(after.y-before.y)*Math.cos(after.angle))<1e-9,'the loaded blade slides along its edge without lateral drift');
 const f=m.presentationFrame(),snapshot=JSON.stringify(f),pose=R.pose(f,f.actors.find(p=>p.id===a.id));assert.equal(JSON.stringify(R.pose(f,f.actors.find(p=>p.id===a.id))),JSON.stringify(pose));assert.equal(JSON.stringify(f),snapshot);
 const old={...f.actors.find(p=>p.id===a.id),motion:{heading:0,acceleration:2,turn:0,backward:0}};assert.ok(Number.isFinite(R.pose(f,old).pitch));
});

test('shot preparation returns the blade to the real puck before release and interpolation cannot skip the backswing',()=>{
 const {m,a}=setup();m.chooseAction=()=>({kind:'shoot',reason:'Test'});m.decide();const f=m.presentationFrame(),actor=f.actors.find(p=>p.id===a.id),duration=actor.windup.duration;
 const end={...f,wall:actor.windup.at+duration-.0001},p=R.pose(end,actor);assert.ok(Math.hypot(p.blade[0]-f.puck.x,p.blade[2]-f.puck.y)<.01);
 const released={...f,wall:f.wall+.2,time:f.time+.2,actors:f.actors.map(p=>p.id===a.id?{...p,windup:null,action:{kind:'shot',at:f.wall+.2,origin:f.puck,target:{x:56.5,y:15},style:'wrist'}}:p)};
 const between=R.sample(released,f,.4);assert.ok(between.actors.find(p=>p.id===a.id).windup);assert.equal(between.actors.find(p=>p.id===a.id).action?.kind==='shot',false);
});

test('a nearby third player can pry a puck from a board duel; distant support and bench players cannot',()=>{
 for(const side of [0,1]){
  const {m,a,d}=setup(side),helper=m.skaters(side)[1];Object.assign(a,{y:2});Object.assign(d,{x:a.x-.8,y:2});m.puck={x:a.x,y:a.y};Object.assign(helper,{x:a.x-3,y:2});m.startBattle(a,d);m.targets();assert.match(helper.duty,/understöd/);
  m.resolveBattle(.1);assert.equal(m.battle.support.length,0);Object.assign(helper,{x:a.x-.9,y:2.5,status:'leaving'});m.resolveBattle(.1);assert.equal(m.battle.support.length,0);
  helper.status='playing';m.resolveBattle(.1);assert.ok(m.battle.support.some(r=>r.id===helper.id));assert.equal(helper.contactAction.kind,'support');
  m.resolveBattle(2);assert.equal(m.battle,null);assert.equal(m.carrier,null);assert.ok(m.puckVelocity);assert.ok(m.events.some(e=>e.type==='battle-release'));
  for(const other of m.skaters(1-side))Object.assign(other,{x:30,y:25});m.step();assert.equal(m.carrier,helper.id,'the helper collects through the ordinary loose-puck race');
 }
});

test('keeper post position, butterfly motion and second read share a saved physical posture on both ends',()=>{
 for(const side of [0,1]){
  const {m,a,g}=setup(side);m.puck={x:H.progress(g.side,5),y:20};Object.assign(g,m.goalieTarget(g.side));
  for(let i=0;i<5;i++){m.wall+=.1;m.updateKeeperBody(g,.1);}assert.equal(g.keeperBody.mode,'post');assert.ok(g.keeperBody.drop>.4);
  const drop=g.keeperBody.drop;m.puck={x:a.x,y:a.y};m.random=()=>.5;m.shoot(a);assert.equal(g.keeperState.drop,drop);assert.equal(g.keeperState.facing,g.keeperBody.facing);
  const frame=m.presentationFrame(),p=R.pose(frame,frame.actors.find(a=>a.id===g.id));assert.equal(p.drop,g.keeperBody.drop);
  m.flight=null;g.keeperBody.drop=1;g.keeperState.drop=1;g.keeperAction={kind:'save',at:m.wall,style:'butterfly',contact:{x:g.x,y:g.y},origin:{x:g.x,y:g.y},facing:g.keeperBody.facing};
  m.puck={x:H.progress(g.side,11),y:15};g.vy=1.5;m.wall+=.1;m.updateKeeperBody(g,.1);assert.equal(g.keeperBody.mode,'butterfly-slide');assert.ok(g.keeperBody.drop>.9);
  const previous=g.keeperBody.facing;m.puck.y=8;m.wall+=.1;m.updateKeeperBody(g,.1);assert.ok(Math.abs(Math.atan2(Math.sin(g.keeperBody.facing-previous),Math.cos(g.keeperBody.facing-previous)))<.55);
  m.wall+=2;g.vy=0;for(let i=0;i<20;i++)m.updateKeeperBody(g,.1);assert.ok(g.keeperBody.drop<.001);
 }
});

test('crossing attackers trigger a coordinated handoff after the read, while a pressing back has inside support',()=>{
 const {m,a}=setup();a.x=48;a.y=5;m.puck={x:a.x,y:a.y};const offense=m.skaters(0),defense=m.skaters(1);
 offense.forEach((p,i)=>{if(p!==a)Object.assign(p,{x:50+(i%2)*3,y:4+i*5});});defense.forEach((p,i)=>Object.assign(p,{x:54,y:4+i*5}));
 m.defenseTargets(1);const old=JSON.stringify(m.teams[1].markingPlan.marks),x=offense[1],y=offense[4],spot={x:x.x,y:x.y};Object.assign(x,{x:y.x,y:y.y});Object.assign(y,spot);
 m.time+=.05;m.defenseTargets(1);assert.equal(JSON.stringify(m.teams[1].markingPlan.marks),old);
 m.time+=.7;m.defenseTargets(1);assert.notEqual(JSON.stringify(m.teams[1].markingPlan.marks),old);assert.equal(new Set(defense.map(a=>a.markedThreat)).size,5);assert.ok(defense.some(a=>a.markHandoff));
 a.x=54;m.puck={x:a.x,y:a.y};Object.assign(offense[4],{x:44,y:25});const back=defense.find(a=>a.role==='LD');Object.assign(back,{x:a.x+.5,y:a.y});m.teams[1].markingPlan=null;m.defenseTargets(1);assert.ok(defense.some(a=>a.duty.includes('Täcker bakom backen')));
 m.stop('stoppage','Test');assert.equal(m.teams[1].markingPlan,null);
});

test('a sliding butterfly has less remaining pad extension in both contact geometry and the visible stance',()=>{
 const {m,a,g}=setup();m.updateKeeperBody(g,.1);m.random=()=>.5;m.shoot(a);g.keeperState.drop=g.keeperBody.drop=1;g.keeperBody.load=0;
 const angle=g.keeperState.facing,puck={x:g.x-Math.sin(angle)*.79,y:g.y+Math.cos(angle)*.79,z:.25};assert.equal(m.keeperContact(g,puck)?.style,'butterfly');
 const pose=()=>{const f=m.presentationFrame();return R.pose(f,f.actors.find(a=>a.id===g.id));},standing=pose();g.keeperBody.load=1;
 assert.equal(m.keeperContact(g,puck),null);const moving=pose(),width=p=>Math.hypot(...p.feet[0].map((n,i)=>n-p.feet[1][i]));assert.ok(width(moving)<width(standing));
});

test('the keeper stays square to the release line instead of rotating corner shots into body contact',()=>{
 for(const side of [0,1]){
  const {m,a,g}=setup(side);m.updateKeeperBody(g,.1);m.random=()=>.5;m.shoot(a);
  const before=g.keeperBody.facing;m.puck={x:g.x+(a.x-g.x)*.06,y:g.y+.75,z:.6};m.updateKeeperBody(g,.1);
  assert.ok(Math.abs(Math.atan2(Math.sin(g.keeperBody.facing-before),Math.cos(g.keeperBody.facing-before)))<.01);
  g.keeperBody.facing+=.2;m.updateKeeperPlane(m.flight);const f=m.flight,angle=g.keeperBody.facing;
  assert.ok(Math.abs((f.end.x-g.x)*Math.cos(angle)+(f.end.y-g.y)*Math.sin(angle)-.4)<1e-6,'contact plane follows the current body before the next hand read');
 }
});

test('equipment surfaces distinguish cloth, shell and steel independently of kit colors; graphics levels retain all actors',()=>{
 const {m}=setup(),f=m.presentationFrame(),surfaces=Model.surfaces(f.actors);assert.equal(surfaces.length,f.actors.reduce((n,a)=>n+Model.model(Model.kind(a)).vertices*2,0));assert.ok(surfaces.every(Number.isFinite));
 const rough=new Set();for(let i=0;i<surfaces.length;i+=2){assert.ok(surfaces[i]>=.1&&surfaces[i]<=1);rough.add(surfaces[i].toFixed(2));}assert.ok(rough.size>=6);assert.ok(surfaces.some((v,i)=>i%2&&v>.8));
 assert.ok(R.quality('low').scale<R.quality('normal').scale);assert.ok(R.quality('high').dpr>R.quality('normal').dpr);assert.equal(R.quality('toString').level,1);
 const before=JSON.stringify(f),normal=R.crowd(f,[],0,1),low=R.crowd(f,[],0,2);assert.ok(low.length<normal.length*.65);assert.equal(JSON.stringify(f),before);
});

test('graphics settings persist without touching live simulation, with normal quality for older saves',()=>{
 const {boot}=require('./scripts/career-test-fixture.cjs'),app=boot();app.run("startCareerWithClub('HV71');state.calendar.date=calendarTarget();startMatch();pauseMatch();globalThis.before=JSON.stringify(state.live);studioSetGraphics('low');");assert.equal(app.run('JSON.stringify(state.live)'),app.run('before'));assert.equal(app.run('studioGraphicsQuality()'),'low');
 const loaded=boot(app.storage.value);assert.equal(loaded.run('studioGraphicsQuality()'),'low');loaded.run("delete state.matchPreferences.graphics3d;studioSetGraphics('bogus')");assert.equal(loaded.run('studioGraphicsQuality()'),'normal');assert.ok(loaded.run("matchPreferencesView().includes('3D-grafik')"));
});

test('saving with a joined duel, keeper posture and marking plan resumes exactly and rejects invalid physical values',()=>{
 const {boot}=require('./scripts/career-test-fixture.cjs'),app=boot();app.run("startCareerWithClub('HV71');state.calendar.date=calendarTarget();startMatch();pauseMatch();globalThis.e=studioEngine();e.time=e.wall=30;e.stoppage=0;for(const p of e.actors)if(p.role!=='G')Object.assign(p,{x:30,y:25,vx:0,vy:0});globalThis.a=e.skaters(0)[0];globalThis.d=e.skaters(1)[0];globalThis.h=e.skaters(0)[1];Object.assign(a,{x:50,y:2});Object.assign(d,{x:49.2,y:2});Object.assign(h,{x:49.2,y:2.5});e.puck={x:50,y:2};e.owner=0;e.carrier=a.id;for(const g of e.actors.filter(a=>a.role==='G'))e.updateKeeperBody(g,.1);e.defenseTargets(1);e.startBattle(a,d);e.resolveBattle(.1);save();");
 assert.ok(app.run('e.battle.support.length>0'));assert.ok(app.run('e.teams[1].markingPlan.marks.length===5'));app.run('validateSaveText(localStorage.getItem("hockey_manager_alpha02"))');
 const loaded=boot(app.storage.value),steps="globalThis.e=studioEngine();for(let i=0;i<20;i++)e.step();JSON.stringify([e.rng,e.time,e.puck,e.carrier,e.battle,e.score,e.actors.map(a=>[a.motion,a.keeperBody]),e.teams.map(t=>t.markingPlan)])";assert.equal(loaded.run(steps),app.run(steps));
 assert.throws(()=>app.run('globalThis.bad=JSON.parse(localStorage.getItem("hockey_manager_alpha02"));bad.live.broadcast.actors.find(a=>a.keeperBody).keeperBody.drop=2;validateSaveText(JSON.stringify(bad))'));
});
