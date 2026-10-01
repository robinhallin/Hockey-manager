'use strict';
const assert=require('node:assert/strict'),test=require('node:test'),fs=require('node:fs'),vm=require('node:vm');
const context=vm.createContext({});vm.runInContext(fs.readFileSync('match-3d.js','utf8'),context);const R=vm.runInContext('Match3D',context);
const frame=(wall,x=30,y=15)=>({time:wall,wall,reset:0,phase:'attack',puck:{x,y},actors:[]});

test('camera momentum does not instantly reverse with a rebound and settles on a held puck',()=>{
 let camera=R.trackPuck(frame(0),null);
 for(let i=1;i<=60;i++)camera=R.trackPuck(frame(i/60,30+i/12),camera);
 assert.ok(camera.vx>4,'camera has caught up with a skating carrier');
 const next=R.trackPuck(frame(61/60,camera.x-.3),camera);
 assert.ok(next.x>camera.x&&next.vx>0,'a rebound decelerates the pan before changing direction');
 camera=next;for(let i=62;i<=240;i++)camera=R.trackPuck(frame(i/60,33),camera);
 assert.ok(Math.abs(camera.x-33)<1e-8&&Math.abs(camera.vx)<1e-7,'the camera settles without an oscillating tail');
});

test('camera integration agrees across display cadences for a held focus and pause is exact',()=>{
 const run=steps=>{let camera=R.trackPuck(frame(0),null);for(let i=1;i<=steps;i++)camera=R.trackPuck(frame(i*.3/steps,34,17),camera);return camera;};
 const single=run(1);for(const steps of [3,9,18,36]){const many=run(steps);for(const key of ['x','y','vx','vy'])assert.ok(Math.abs(single[key]-many[key])<1e-9,key+' depends on elapsed time, not frame count');}
 const input=frame(.3,34,17),saved=JSON.stringify([input,single]);assert.deepEqual(R.trackPuck(input,single),single);assert.equal(JSON.stringify([input,single]),saved);
});

test('a puck behind the goal eases the camera to the pan limit without a hard stop',()=>{
 let view=R.cameraFrame(1.8,'follow',frame(0,30),null,1);
 for(let i=1;i<=120;i++){
  const f=frame(i/60,Math.max(6,30-i*.4)),next=R.cameraFrame(1.8,'follow',f,view.tracked,1);
  assert.ok(next.tracked.x>=10&&next.tracked.x<=50,'no invisible pan continues outside the permitted camera range');
  assert.ok(next.target[0]>10,'approach the limit smoothly instead of clamping a moving pan');view=next;
 }
 assert.ok(view.target[0]<10.01,'the camera still reaches the end-zone view');
});

test('edge recovery keeps the puck visible without cutting all the way to its position',()=>{
 for(const direction of [-1,1]){
  const before=frame(10),prior=R.cameraFrame(1.8,'rinkside',before,null,1.5),after=frame(10.1,30+direction*12),saved=JSON.stringify([after,prior]);
  const view=R.cameraFrame(1.8,'rinkside',after,prior.tracked,1.5),p=R.project([after.puck.x,.1,15],view.matrix);
  assert.ok(p.x>=.059&&p.x<=.941&&p.y>0&&p.y<1,'puck stays inside the safety margin');
  assert.ok(Math.abs(view.tracked.x-prior.tracked.x)<10,'avoid the old full twelve-metre re-centre');
  const held=R.cameraFrame(1.8,'rinkside',after,view.tracked,1.5);assert.deepEqual(held.matrix,view.matrix,'a paused boundary correction does not drift');
  assert.equal(JSON.stringify([after,prior]),saved,'framing cannot mutate a match snapshot or prior camera');
 }
});

test('rewind, highlight skip and faceoff reset discard old camera momentum',()=>{
 const prior={...R.trackPuck(frame(10),null),vx:9,vy:-3};
 for(const next of [frame(9,44,5),frame(12,44,5),{...frame(10.1,44,5),reset:1},{...frame(10.1,44,5),phase:'faceoff'}]){
  const camera=R.trackPuck(next,prior);assert.equal(camera.x,44);assert.equal(camera.y,5);assert.equal(camera.vx,0);assert.equal(camera.vy,0);
 }
});

test('close zoom includes a lifted puck, restores gently and accepts a paused manual zoom',()=>{
 const airborne={...frame(10,57.9,12.7),puck:{x:57.9,y:12.7,z:3.75}},view=R.cameraFrame(1.8,'rinkside',airborne,null,1.5);
 const p=R.project([57.9,3.85,12.7],view.matrix);assert.ok(p.y>.04&&p.y<.96);assert.ok(view.tracked.fit<1.5);
 const paused=R.cameraFrame(1.8,'rinkside',airborne,view.tracked,1.5);assert.deepEqual(paused.matrix,view.matrix);
 const landed=R.cameraFrame(1.8,'rinkside',frame(10.1,57.9,12.7),paused.tracked,1.5);assert.ok(landed.tracked.fit>paused.tracked.fit&&landed.tracked.fit<1.5);
 const manual=R.cameraFrame(1.8,'rinkside',frame(10.1,57.9,12.7),landed.tracked,1);assert.equal(manual.tracked.fit,1,'explicit zoom works while the match is paused');
});

test('all tracking views retain a real shot, save and rebound sequence without altering it',()=>{
 const H=require('./scripts/current-match-engine.cjs'),seen=new Set();let checked=0;
 // Natural trajectories change with tactical decisions. Exercise a fixed
 // contiguous seed set, without requiring every short game to have a rebound.
 for(const seed of [227,228,229,230]){
 const match=new H.Match(require('./match-lab-rosters'),{seed,scenario:'rush',duration:90}),cameras=new Map();
 while(!match.finished){
  match.step();const f=match.presentationFrame(),saved=JSON.stringify(f);for(const e of f.effects||[])seen.add(e.kind);for(const a of f.actors)if(a.action)seen.add(a.action.kind);if(match.rebound)seen.add('rebound');
  for(const mode of ['follow','auto','rinkside'])for(const zoom of [1,1.5]){
   const key=mode+zoom,view=R.cameraFrame(1.8,mode,f,cameras.get(key),zoom);cameras.set(key,view.tracked);
   const p=R.project([f.puck.x,.1+(f.puck.z||0),f.puck.y],view.matrix);assert.ok(p.x>0&&p.x<1&&p.y>0&&p.y<1,JSON.stringify({key,time:f.time,p}));checked++;
  }
  assert.equal(JSON.stringify(f),saved);
 }
 }
 assert.ok(checked>12000);assert.ok(seen.has('shot')&&seen.has('save')&&seen.has('rebound'),'exercise observed shots, saves and rebounds');
});
