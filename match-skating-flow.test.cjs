'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const H=require('./scripts/current-match-engine.cjs'),rosters=require('./match-lab-rosters'),Motion=require('./match-broadcast-motion');
const context=vm.createContext({});for(const file of ['match-broadcast-motion.js','match-3d.js'])vm.runInContext(fs.readFileSync(file,'utf8'),context);
const R=vm.runInContext('Match3D',context);

test('starting strides shorten under effort, then relax into a stable glide without a free-running clock',()=>{
 const options={speed:2,acceleration:2,turn:0,distance:.2,dt:.1};
 const start=Motion.advance({phase:0},options),cruise=Motion.advance({phase:0},{...options,acceleration:0});
 assert.ok(start.phase>cruise.phase&&start.start>0,'the same distance has shorter strokes during the start');
 let glide=start;for(let i=0;i<20;i++)glide=Motion.advance(glide,{...options,acceleration:-.4});
 assert.ok(glide.start<.001&&glide.drive<.001);
 const paused=Motion.advance(start,{...options,dt:0,distance:0});assert.equal(paused.phase,start.phase);assert.equal(paused.start,start.start);
});

test('weight transfers onto alternating support legs and turn banking follows speed and curvature',()=>{
 for(const [phase,side] of [[.3,-1],[.8,1]]){
  const motion={phase,drive:1,turn:0},body=Motion.body(0,motion,4),support=Motion.cycle(0,side,motion),recover=Motion.cycle(0,-side,motion);
  assert.ok(body.lateral*side>.08&&support.load>.99&&recover.lift>.10,'pelvis loads the skate still on the ice');
 }
 const left=Motion.body(0,{phase:0,drive:.6,turn:1},5),right=Motion.body(0,{phase:0,drive:.6,turn:-1},5);
 assert.ok(left.bank>0&&left.bank<.5);assert.equal(left.bank,-right.bank);assert.equal(left.torsoRoll,-right.torsoRoll);
 assert.equal(Motion.body(0,{turn:3},0).bank,0,'a stationary body cannot bank from stale angular velocity');
});

test('left and right stops hold their side through a braking interval and keep stick contact and limb lengths',()=>{
 const base={id:'skater',role:'C',side:0,x:30,y:15,vx:4,vy:0,shoots:'L',skateState:{heading:0},motion:{heading:0,phase:.3,drive:.1,brake:1,backward:0}};
 for(const side of [-1,1]){
  const motion=Motion.advance({...base.motion,stopSide:side},{speed:3,acceleration:-3,turn:-side,distance:.3,dt:.1});assert.equal(motion.stopSide,side,'a small counter-turn cannot reverse an established stop');
  const actor={...base,motion:{...base.motion,stopSide:side}},frame={time:1,wall:1,actors:[actor],carrier:actor.id,puck:{x:30.65,y:15,z:0}},pose=R.pose(frame,actor);
  assert.ok(pose.footAngles.every(a=>a*side>.9));assert.ok(Math.hypot(pose.blade[0]-frame.puck.x,pose.blade[2]-frame.puck.y)<.001);
  for(const leg of pose.legs){assert.ok(Math.abs(Math.hypot(...leg.hip.map((n,i)=>n-leg.knee[i]))-.45)<1e-6);assert.ok(Math.abs(Math.hypot(...leg.ankle.map((n,i)=>n-leg.knee[i]))-.46)<1e-6);}
 }
});

test('individual stride phases use stable identities, preserve the random stream and survive save/reload',()=>{
 const match=new H.Match(rosters,{seed:981}),rng=match.rng;
 const actors=match.skaters(0);for(const a of actors){delete a.motion;Object.assign(a,{vx:2,vy:0,travelled:0});match.recordMotion(a,1.9,0,.1);}
 assert.equal(match.rng,rng);assert.ok(new Set(actors.map(a=>a.motion.phase)).size>3);
 const frame=match.presentationFrame(),saved=JSON.stringify(frame),clone=JSON.parse(saved);
 for(const a of frame.actors)assert.equal(JSON.stringify(R.pose(frame,a)),JSON.stringify(R.pose(clone,clone.actors.find(b=>b.id===a.id))));
 assert.equal(JSON.stringify(frame),saved);
});

test('reused equipment buffers match fresh geometry through changing player and puck counts',()=>{
 const match=new H.Match(rosters,{seed:981}),builder=R.sceneData.geometry(18000);let buffer;
 for(const count of [12,12,6,12]){
  const frame=match.presentationFrame();frame.actors=frame.actors.slice(0,count);frame.carrier=count===6?null:frame.actors[0].id;frame.puck.heldBy=count===6?'goalie':null;
  const expected=R.figures(frame,[],true),actual=R.figures(frame,[],true,new Map(),builder);
  assert.deepEqual(actual,expected);if(buffer)assert.equal(actual.buffer,buffer,'normal redraws reuse capacity');buffer=actual.buffer;
 }
});


test('interpolated plants use the shortest angle and old recordings do not invent a blade heading',()=>{
 const a={id:'a',x:20,y:15,motion:{heading:0,stopSide:-1},footPlants:[{x:20,y:15,at:1,angle:3.1},null]};
 const before={time:2,wall:2,reset:0,actors:[a],puck:{x:22,y:15}},frame={...before,time:2.1,wall:2.1,actors:[{...a,motion:{heading:0,stopSide:1},footPlants:[{...a.footPlants[0],angle:-3.1},null]}]};
 const shown=R.sample(frame,before,.5).actors[0];assert.ok(Math.abs(shown.footPlants[0].angle-Math.PI)<1e-6);assert.equal(shown.motion.stopSide,1);
 delete a.footPlants[0].angle;delete frame.actors[0].footPlants[0].angle;
 assert.equal(R.sample(frame,before,.5).actors[0].footPlants[0].angle,undefined);
});

test('career saves accept legacy motion and reject corrupt starting effort or stopping side',()=>{
 const app=require('./scripts/career-test-fixture.cjs').boot();
 app.run("startCareerWithClub('HV71');state.calendar.date=calendarTarget();startMatch();pauseMatch();for(let i=0;i<10;i++)studioEngine().step();save();globalThis.saved=localStorage.getItem('hockey_manager_alpha02');validateSaveText(saved);");
 for(const mutation of ['motion.start=2','motion.stopSide=0'])assert.throws(()=>app.run(`globalThis.bad=JSON.parse(saved);bad.live.broadcast.actors.find(a=>a.role!=='G').${mutation};validateSaveText(JSON.stringify(bad))`));
 app.run("globalThis.old=JSON.parse(saved);for(const a of old.live.broadcast.actors)if(a.motion){delete a.motion.start;delete a.motion.stopSide;}validateSaveText(JSON.stringify(old));");
});
