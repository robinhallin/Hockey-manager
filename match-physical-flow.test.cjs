'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const H=require('./scripts/current-match-engine.cjs'),rosters=require('./match-lab-rosters');
const ctx=vm.createContext({});for(const file of ['match-player-asset.js','match-player-model.js','match-3d.js'])vm.runInContext(fs.readFileSync(file,'utf8'),ctx);
const R=vm.runInContext('Match3D',ctx),Model=vm.runInContext('HockeyPlayerModel',ctx);
function setup(side=0){const m=new H.Match(rosters,{seed:621,scenario:'attack'});m.time=m.wall=20;m.stoppage=0;m.flight=m.battle=null;m.owner=side;for(const a of m.actors){a.vx=a.vy=0;if(a.role!=='G')Object.assign(a,{x:25,y:3+m.skaters(a.side).indexOf(a)*5});}const a=m.skaters(side)[0];Object.assign(a,{x:H.progress(side,48),y:15,target:{x:H.progress(side,54),y:15}});m.carrier=a.id;m.puck={x:a.x,y:a.y};return {m,a};}

test('carried puck moves to the actual blade, switches hands and releases from the same observed point on either end',()=>{
 for(const side of [0,1]){
  const {m,a}=setup(side);a.player.shoots='R';a.skateState={at:m.wall,heading:side?Math.PI:0,backward:false};
  for(let i=0;i<5;i++)m.updateStickControl(a,.1);
  assert.ok(H.distance(a,m.puck)>.5&&H.distance(a,m.puck)<1);assert.equal(a.stickControl.mode,'forehand');
  const f=m.presentationFrame(),actor=f.actors.find(p=>p.id===a.id),pose=R.pose(f,actor);assert.ok(Math.hypot(pose.blade[0]-f.puck.x,pose.blade[2]-f.puck.y)<.001);assert.ok(Math.hypot(pose.point(0,0,0)[0]-a.x,pose.point(0,0,0)[2]-a.y)<.001,'body stays at the simulated body position');
  a.vx=side?-2:2;a.target={x:a.x,y:a.y+(side? -1:1)*-5};for(let i=0;i<6;i++)m.updateStickControl(a,.1);assert.equal(a.stickControl.mode,'backhand');
  const origin={...m.puck};m.random=()=>.5;m.shoot(a);assert.deepEqual(m.flight.start,origin);assert.equal(m.flight.shot.x,origin.x);assert.equal(m.flight.shot.y,origin.y);
 }
});

test('puck protection changes stick side under real pressure and loss of reach releases a collectable puck',()=>{
 const {m,a}=setup(),d=m.skaters(1)[0];a.skateState={at:20,heading:0,backward:false};Object.assign(d,{x:a.x,y:a.y+.8});
 for(let i=0;i<5;i++)m.updateStickControl(a,.1);assert.equal(a.stickControl.mode,'protect');assert.ok(m.puck.y<a.y);
 a.x+=3;m.updateStickControl(a,.1);assert.equal(m.carrier,null);assert.ok(m.puckVelocity);assert.ok(a.pickupAfter>m.time);assert.equal(a.contactAction.kind,'bobble');
});

test('fast turns use a wider arc, reversals brake first, and stopping has no negative-zero save drift',()=>{
 const turn=speed=>H.skateVelocity({x:speed,y:0},{x:0,y:speed},4,5,.1);
 const slow=turn(1),fast=turn(5);assert.ok(Math.atan2(slow.y,slow.x)>Math.atan2(fast.y,fast.x));
 const reverse=H.skateVelocity({x:4,y:0},{x:-4,y:0},4,5,.1);assert.ok(reverse.x>0&&Math.hypot(reverse.x,reverse.y)<4);
 let v={x:-.15,y:0};for(let i=0;i<5;i++)v=H.skateVelocity(v,{x:0,y:0},4,5,.1);assert.deepEqual(v,{x:0,y:0});
});

test('players route around either goal and remain inside the same rounded rink that is rendered',()=>{
 for(const side of [0,1]){
  const {m,a}=setup(side);m.actors=[a];m.carrier=null;Object.assign(a,{x:H.progress(side,1.3),y:15,vx:0,vy:0,target:{x:H.progress(side,6),y:15}});
  for(let i=0;i<110;i++){m.move(.1);const p=H.progress(side,a.x);assert.ok(!(p>1.91&&p<3.84&&a.y>13.74&&a.y<16.26),'skater cannot cross the goal volume');assert.equal(H.rinkLimit(a,.33).hit,false);}
  assert.ok(H.progress(side,a.x)>4.3,'route reaches the front of the goal');
  a.target={x:H.progress(side,59),y:1};for(let i=0;i<200;i++)m.move(.1);assert.equal(H.rinkLimit(a,.33).hit,false);
 }
 const wall=H.rinkLimit({x:59,y:1},.34);assert.ok(wall.hit);assert.ok(Math.abs(Math.hypot(wall.x-52,wall.y-8)-7.66)<1e-6);
});

test('head-on bodies preserve a finite separation and a glancing loose puck reflects off a rounded corner',()=>{
 const {m,a}=setup(),b=m.skaters(1)[0];m.actors=[a,b];m.carrier=null;Object.assign(a,{x:30,y:15,vx:3,vy:0,target:{x:35,y:15}});Object.assign(b,{x:31,y:15,vx:-3,vy:0,target:{x:25,y:15}});
 for(let i=0;i<8;i++){m.move(.1);assert.ok(H.distance(a,b)>.63);assert.ok([a.x,a.y,b.x,b.y].every(Number.isFinite));}
 Object.assign(a,{x:30,y:15,vx:5,vy:0});Object.assign(b,{x:30.8,y:15,vx:-5,vy:0});m.move(.1);assert.ok(a.x<b.x&&H.distance(a,b)>.65,'fast opposing bodies cannot exchange sides between ticks');
 Object.assign(a,{x:30,y:15,vx:5,vy:0});Object.assign(b,{x:30.8,y:16.2,vx:-5,vy:0});b.target={x:25,y:16.2};m.move(.1);assert.ok(a.x>b.x,'a clear skating lane can pass beside another body');
 m.puck={x:57,y:3};m.puckVelocity={x:10,y:-10,z:0};m.moveFreePuck(.2);assert.equal(H.rinkLimit(m.puck,.119).hit,false);assert.ok(m.puckVelocity.x<0&&m.puckVelocity.y>0);
});

test('net-front inside position constrains the attackers stick only while the defender physically holds it',()=>{
 for(const side of [0,1]){
  const {m,a}=setup(side),screen=m.skaters(side).find(p=>p.role==='C'),d=m.skaters(1-side).find(p=>p.role==='LD');Object.assign(a,{x:H.progress(side,49),y:7});m.puck={x:a.x,y:a.y};Object.assign(screen,{x:H.progress(side,54),y:15});Object.assign(d,{x:H.progress(side,54.7),y:15});
  m.netFrontTargets();assert.equal(screen.netFront.kind,'screen');assert.equal(d.netFront.kind,'boxout');assert.ok(m.netFrontHold(screen)>0);
  d.y+=3;assert.equal(m.netFrontHold(screen),0);m.carrier=null;m.rebound={side,time:m.time,spot:{x:H.progress(side,53),y:17}};m.puck={...m.rebound.spot};m.netFrontTargets();assert.equal(screen.netFront.kind,'rebound');assert.deepEqual(screen.target,m.puck);
 }
});

test('ordinary possession phases remain smooth but a real faceoff reset cuts every actor and the puck',()=>{
 const a={id:'a',role:'C',side:0,x:30,y:15,vx:3,vy:0},before={time:10,wall:11,reset:1,phase:'entry',puck:{x:39.9,y:15},actors:[a]},after={...before,time:10.1,wall:11.1,phase:'attack',puck:{x:40.3,y:15},actors:[{...a,x:30.3}]};
 const sample=R.sample(after,before,.5);assert.ok(Math.abs(sample.puck.x-40.1)<1e-8);assert.equal(sample.actors[0].x,30.15);
 const camera=R.trackPuck(before,null),follow=R.trackPuck(after,camera);assert.ok(follow.x>39.9&&follow.x<40.3);
 const reset={...after,reset:2,puck:{x:30,y:15}};assert.equal(R.sample(reset,before,.2).puck.x,30);assert.equal(R.trackPuck(reset,camera).x,30);
});

test('keeper prepares gradually for an observed close carrier and releases the stance when that threat leaves',()=>{
 for(const side of [0,1]){
  const {m,a}=setup(side),g=m.actors.find(p=>p.role==='G'&&p.side!==side);Object.assign(g,{x:H.progress(side,55),y:15});
  Object.assign(a,{x:H.progress(side,51),y:15});m.puck={x:a.x,y:a.y};m.updateKeeperBody(g,.01);assert.ok(g.keeperBody.drop>0&&g.keeperBody.drop<.20,'readiness develops over time');
  for(let i=0;i<10;i++)m.updateKeeperBody(g,.1);assert.ok(Math.abs(g.keeperBody.drop-.20)<.001);assert.equal(m.flight,null);
  const prepared=g.keeperBody.drop;m.carrier=null;m.puck={x:30,y:15};m.updateKeeperBody(g,.01);assert.ok(g.keeperBody.drop<prepared&&g.keeperBody.drop>0);for(let i=0;i<10;i++)m.updateKeeperBody(g,.1);assert.equal(g.keeperBody.drop,0);
 }
});

test('foreground frame pulses advance interpolation between fixed ticks without changing the match ledger',()=>{
 const {boot}=require('./scripts/career-test-fixture.cjs'),app=boot();app.run("startCareerWithClub('HV71');state.calendar.date=calendarTarget();startMatch();state.live.rink.mode='full';globalThis.now=10000;Date.now=()=>now;studioLastPulse=now;studioAccumulator=0;studioLastSave=now;studioLastPaint=now;globalThis.before=JSON.stringify(state.live);now+=16;studioPulse(true);globalThis.first=studioAccumulator;now+=16;studioPulse(true);");
 assert.ok(app.run('studioAccumulator>first'));assert.equal(app.run('JSON.stringify(state.live)'),app.run('before'));
 app.run('now+=80;studioPulse(true)');assert.notEqual(app.run('JSON.stringify(state.live)'),app.run('before'));assert.ok(app.run('studioAccumulator<StudioHockey.STEP'));
});

test('equipment skinning reuses its buffer and preserves paused geometry, fixed grips and finite vertices',()=>{
 const {m,a}=setup();m.move(.1);const f=m.presentationFrame(),poses=new Map(f.actors.map(a=>[a.id,R.pose(f,a)])),kits=R.kits([]),mesh=Model.mesh(f.actors,poses,kits),copy=Array.from(mesh),again=Model.mesh(f.actors,poses,kits,mesh);
 assert.equal(again,mesh);assert.deepEqual(Array.from(again),copy);assert.ok(again.every(Number.isFinite));
 const p=poses.get(a.id);assert.ok(Math.abs(Math.hypot(...p.shaftTop.map((v,i)=>v-p.heel[i]))-1.38)<1e-6);
});

test('new physical posture and puck control resume exactly after saving, and malformed physical fields are rejected',()=>{
 const {boot}=require('./scripts/career-test-fixture.cjs'),app=boot();app.run("startCareerWithClub('HV71');state.calendar.date=calendarTarget();startMatch();for(let i=0;i<100;i++)studioStep();pauseMatch();save();validateSaveText(localStorage.getItem('hockey_manager_alpha02'))");const loaded=boot(app.storage.value);
 const steps="globalThis.e=studioEngine();for(let i=0;i<30;i++)e.step();JSON.stringify([e.rng,e.puck,e.carrier,e.score,e.actors.map(a=>[a.skateState,a.stickControl,a.netFront])])";assert.equal(loaded.run(steps),app.run(steps));
 assert.throws(()=>app.run("globalThis.bad=JSON.parse(localStorage.getItem('hockey_manager_alpha02'));bad.live.broadcast.actors.find(a=>a.skateState).skateState.heading=99;validateSaveText(JSON.stringify(bad))"));
});
