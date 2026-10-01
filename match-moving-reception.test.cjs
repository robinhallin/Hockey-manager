'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const H=require('./scripts/current-match-engine.cjs'),rosters=require('./match-lab-rosters');
const context=vm.createContext({});for(const file of ['match-broadcast-motion.js','match-3d.js'])vm.runInContext(fs.readFileSync(file,'utf8'),context);
const R=vm.runInContext('Match3D',context);
function setup(side=0,speed=4){
  const m=new H.Match(rosters,{seed:12}),point=(p,y)=>({x:H.progress(side,p),y});m.time=m.wall=20;m.stoppage=0;m.phase='attack';m.owner=side;
  for(const a of m.actors)if(a.role!=='G')Object.assign(a,point(20+a.side*10,3+m.skaters(a.side).indexOf(a)*5),{vx:0,vy:0});
  const a=m.skaters(side)[0],b=m.skaters(side)[1];Object.assign(a,point(43,8));Object.assign(b,point(51,12),{vx:speed*(side?-1:1),vy:0});
  m.carrier=a.id;m.puck={x:a.x,y:a.y};m.random=()=>0;return {m,a,b,point};
}
test('a moving pass is led by observed travel time, not a fixed quarter second, in both directions',()=>{
  for(const side of [0,1]){
    const {m,a,b}=setup(side);const before=[b.x,b.y];assert.equal(m.pass(a,b),true);const f=m.flight;
    assert.ok(Math.abs(f.end.x-(b.x+b.vx*f.duration))<.025,'endpoint and launch duration agree');
    assert.ok(H.distance(f.end,b)>2,'moving receiver is led through a medium pass');
    assert.deepEqual([b.x,b.y],before,'release never teleports the receiver');
  }
});
test('a receiver keeps skating through the real contact without forcing possession',()=>{
  for(const side of [0,1]){
    const {m,a,b}=setup(side);m.pass(a,b);const flight=m.flight;let ticks=0;
    while(m.flight&&ticks++<20){m.time+=H.STEP;m.wall+=H.STEP;m.targets();m.move(H.STEP);m.resolveFlight(H.STEP);}
    assert.equal(m.carrier,b.id);assert.equal(m.stats[side].passes,1);
    assert.ok(Math.hypot(b.vx,b.vy)>3.7,'a clean reception does not require stopping');
    const at=b.presentationAction.at,alpha=(at-(m.wall-H.STEP))/H.STEP;
    const body={x:b.sweepStart.x+(b.x-b.sweepStart.x)*alpha,y:b.sweepStart.y+(b.y-b.sweepStart.y)*alpha};
    assert.ok(H.distance(b.contactAction.spot,body)<=1.051,'the travelled puck reaches the moving body at the recorded contact time');
    assert.ok(at>=m.wall-H.STEP&&at<=m.wall,'contact timestamp belongs to this fixed step');
  }
});
test('a pass behind the receiver requires braking; stationary players do not acquire a phantom glide',()=>{
  const {m,b}=setup(),front={kind:'pass',end:{x:b.x+2,y:b.y},duration:.5,elapsed:0};
  assert.ok(m.passReceiveTarget(b,front).x>front.end.x+1);
  const behind={...front,end:{x:b.x-2,y:b.y}};assert.equal(m.passReceiveTarget(b,behind).x,behind.end.x);
  b.vx=0;assert.equal(m.passReceiveTarget(b,front).x,front.end.x);
  b.vx=4;const distant={...front,end:{x:b.x+6,y:b.y},duration:.2};assert.equal(m.passReceiveTarget(b,distant).x,distant.end.x,'unreachable passes do not demand extra acceleration past the puck');
});
test('leading remains bounded at the boards and cannot release to a receiver already offside',()=>{
  const {m,a,b,point}=setup();Object.assign(b,{x:57,y:28,vx:4,vy:4});m.pass(a,b);assert.ok(m.flight.end.x<=59&&m.flight.end.y<=29);
  m.flight=null;Object.assign(a,point(35,8));Object.assign(b,point(42,12));m.carrier=a.id;m.puck={x:a.x,y:a.y};
  const attempts=m.stats[0].passAttempts;assert.equal(m.pass(a,b),false);assert.equal(m.flight,null);assert.equal(m.stats[0].passAttempts,attempts);
});
test('incoming preparation uses recorded arrival time even beyond three metres and seeks identically',()=>{
  const actor={id:'b',side:0,role:'LW',x:50,y:15,vx:4,vy:0,travelled:12,shoots:'L',motion:{heading:0,upperHeading:0,phase:.25,drive:1}};
  const frame={wall:20,time:20,phase:'attack',carrier:null,actors:[actor],puck:{x:54,y:13,z:0},flight:{kind:'pass',side:0,to:'b',start:{x:58,y:11},end:{x:50,y:15},duration:.8,elapsed:.5}};
  const before=JSON.stringify(frame),ready=R.pose(frame,actor),idle=R.pose({...frame,flight:null},actor);
  assert.ok(Math.hypot(frame.puck.x-actor.x,frame.puck.y-actor.y)>3);
  assert.ok(Math.hypot(ready.blade[0]-idle.blade[0],ready.blade[2]-idle.blade[2])>.03,'blade prepares before the puck is already within three metres');
  R.pose({...frame,wall:20.1,flight:{...frame.flight,elapsed:.6}},actor);
  assert.equal(JSON.stringify(R.pose(frame,actor)),JSON.stringify(ready),'replay seek has no hidden animation clock');assert.equal(JSON.stringify(frame),before);
  const legacy={...frame,flight:{kind:'pass',side:0,to:actor.id}};
  assert.ok(R.pose(legacy,actor).blade.every(Number.isFinite),'legacy frames without flight timing retain a bounded distance-based preparation');
});
test('a career save during a moving pass preserves the same puck path, actors and decisions',()=>{
  const {boot}=require('./scripts/career-test-fixture.cjs'),app=boot();
  app.run("startCareerWithClub('HV71');state.calendar.date=calendarTarget();startMatch();pauseMatch();globalThis.e=studioEngine();e.stoppage=0;e.time=e.wall=20;e.phase='attack';e.owner=0;for(const p of e.actors)if(p.role!=='G')Object.assign(p,{x:20+p.side*10,y:3+e.skaters(p.side).indexOf(p)*5,vx:0,vy:0});globalThis.a=e.skaters(0)[0];globalThis.b=e.skaters(0)[1];Object.assign(a,{x:43,y:8});Object.assign(b,{x:51,y:12,vx:4,vy:0});e.carrier=a.id;e.puck={x:a.x,y:a.y};e.pass(a,b);save();validateSaveText(localStorage.getItem('hockey_manager_alpha02'));");
  assert.ok(app.run("e.flight.kind==='pass'&&e.flight.elapsed===0"));const restored=boot(app.storage.value);
  const resume="globalThis.e=studioEngine();for(let i=0;i<20;i++)e.step();JSON.stringify([e.rng,e.puck,e.flight,e.carrier,e.score,e.stats,e.actors.map(a=>[a.id,a.x,a.y,a.vx,a.vy,a.motion,a.contactAction])])";
  assert.equal(restored.run(resume),app.run(resume));
});
