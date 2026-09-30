'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const H=require('./scripts/current-match-engine.cjs'),rosters=require('./match-lab-rosters'),Motion=require('./match-broadcast-motion');
const ctx=vm.createContext({});for(const f of ['match-broadcast-motion.js','match-3d.js'])vm.runInContext(fs.readFileSync(f,'utf8'),ctx);const R=vm.runInContext('Match3D',ctx);
const dist=(a,b)=>Math.hypot(...a.map((n,i)=>n-b[i])),near=(a,b)=>assert.ok(dist(a,b)<1e-7,`${a} differs from ${b}`);
test('upper-body orientation is recorded with an angular speed limit and cannot rotate the skates',()=>{
 const m=new H.Match(rosters,{seed:33,scenario:'rush'}),a=m.skaters(0)[0];Object.assign(a,{x:25,y:15,vx:3,vy:0,travelled:2,motion:{heading:0,travel:0,upperHeading:0,gazeHeading:0,distance:2}});m.puck={x:25,y:25};m.carrier=a.id;
 const rng=m.rng;m.recordMotion(a,3,0,.1);assert.equal(m.rng,rng);assert.ok(a.motion.upperHeading>0&&a.motion.upperHeading<=.28);assert.ok(a.motion.gazeHeading<=.4);
 const f=m.presentationFrame(),actor=f.actors.find(p=>p.id===a.id),pose=R.pose(f,actor),turned=R.pose(f,{...actor,motion:{...actor.motion,upperHeading:.65}});
 near(pose.feet[0],turned.feet[0]);near(pose.feet[1],turned.feet[1]);assert.ok(turned.torsoAngle>pose.torsoAngle);
});
test('free arm swing is distance driven, while puck work keeps the blade on the real puck',()=>{
 assert.notDeepEqual(Motion.upper(.1,1),Motion.upper(.6,1));assert.equal(Motion.upper(.1,1,1).shoulder,0);
 const a={id:'a',side:0,role:'C',x:25,y:15,vx:3,vy:0,shoots:'L',skateState:{heading:0},motion:{heading:0,upperHeading:0,drive:1,phase:.1},energy:100};
 const f={wall:10,time:10,carrier:'a',puck:{x:25.6,y:14.7},actors:[a]};
 for(const phase of [.1,.3,.6,.8]){const p=R.pose(f,{...a,motion:{...a.motion,phase}});near(p.blade,[25.6,.08,14.7]);for(const arm of p.arms){assert.ok(Math.abs(dist(arm.shoulder,arm.elbow)-.40)<.002);assert.ok(Math.abs(dist(arm.elbow,arm.hand)-.42)<.002);}}
});
test('shot follow-through starts on the recorded contact origin including its height',()=>{
 const a={id:'a',side:0,role:'C',x:25,y:15,vx:2,vy:0,shoots:'R',skateState:{heading:0},motion:{heading:0,upperHeading:0,drive:.5,phase:.3},action:{kind:'shot',at:10,origin:{x:25.65,y:15.2,z:.12},target:{x:56,y:15},style:'wrist'}};
 const f={wall:10,time:10,carrier:null,puck:{x:25.65,y:15.2,z:.12},actors:[a]},p=R.pose(f,a);near(p.blade,[25.65,.20,15.2]);
 const later=R.pose({...f,wall:10.01},a);assert.ok(dist(p.blade,later.blade)<.03,'release must not jump toward the idle stick position');
});
test('rendered keeper hands and legs equal the authoritative equipment, including limited reach and recovery',()=>{
 for(const shoots of ['L','R'])for(const facing of [0,Math.PI,.8])for(const drop of [0,.5,1]){
  const a={id:'g',side:1,role:'G',shoots,x:54,y:15,vx:0,vy:0,keeperBody:{facing,drop,load:.7,mode:'ready'},keeperState:{at:0,facing,drop,glove:{lateral:shoots==='R'?.93:-.93,z:1.45},blocker:{lateral:shoots==='R'?-.85:.85,z:.6}},keeperAction:{at:9.9,style:'glove',contact:{x:51,y:20,z:1.4}}};
  const f={wall:10,time:10,puck:{x:49,y:15},actors:[a]},p=R.pose(f,a),e=Motion.keeper({drop,load:.7,catchSide:shoots==='R'?1:-1,glove:a.keeperState.glove,blocker:a.keeperState.blocker});
  const world=q=>[a.x+Math.cos(facing)*q[0]-Math.sin(facing)*q[2],q[1],a.y+Math.sin(facing)*q[0]+Math.cos(facing)*q[2]];
  near(p.glove,world(e.glove));near(p.blocker,world(e.blocker));near(p.blade,world(e.blade));for(let i=0;i<2;i++){near(p.legs[i].knee,world(e.legs[i].knee));assert.ok(dist(p.arms[i].hand,p.arms[i].shoulder)<=.901);}
 }
});
test('a physical save uses the rendered glove, and retours follow the contacted hand in both rink directions',()=>{
 for(const side of [0,1])for(const style of ['glove','blocker']){
  const m=new H.Match(rosters,{seed:78,scenario:'attack'}),g=m.actors.find(a=>a.role==='G'&&a.side!==side),facing=side?0:Math.PI;
  Object.assign(g,{x:side?5:55,y:15,keeperState:{at:0,drop:0,facing,glove:{lateral:.85,z:1.1},blocker:{lateral:-.80,z:1.1}}});
  const e=Motion.keeper({catchSide:g.player.shoots==='R'?1:-1,glove:g.keeperState.glove,blocker:g.keeperState.blocker}),h=e[style];
  m.puck={x:g.x+Math.cos(facing)*h[0]-Math.sin(facing)*h[2],y:g.y+Math.sin(facing)*h[0]+Math.cos(facing)*h[2],z:h[1]-.025};
  assert.equal(m.keeperContact(g,m.puck)?.style,style);
  const origin={...m.puck},rolls=[.99,0,.5,.5];m.random=()=>rolls.shift()??.5;
  m.saveRebound(g,{side,start:{x:g.x+Math.cos(facing)*10,y:15},end:{...origin},duration:.5,shot:{context:{},playerId:'a',player:'a',keeperContact:{style,lateral:h[2]}}});
  assert.deepEqual(m.flight.start,origin);assert.equal(m.flight.contactVersion,1);assert.equal(m.flight.saveStyle,style);
  const lateral=-(m.flight.end.x-origin.x)*Math.sin(facing)+(m.flight.end.y-origin.y)*Math.cos(facing),hand=g.player.shoots==='R'?1:-1;
  assert.equal(Math.sign(lateral),style==='glove'?hand:-hand);assert.equal(m.stats[1-side].saves,0,'the helper cannot award an extra save');
 }
});
test('either team can reach a travelling rebound before its endpoint',()=>{
 for(const side of [0,1]){
  const m=new H.Match(rosters,{seed:89,scenario:'attack'});m.stoppage=0;m.time=m.wall=20;
  for(const a of m.skaters(0).concat(m.skaters(1)))Object.assign(a,{x:30,y:4,vx:0,vy:0});
  const receiver=m.skaters(side)[0];Object.assign(receiver,{x:48,y:15});m.puck={x:50,y:15,z:0};m.carrier=null;m.owner=0;
  m.flight={kind:'rebound',contactVersion:1,side:0,start:{...m.puck},end:{x:45,y:15},elapsed:0,duration:1,vertical:{z:0,vz:0}};
  m.random=()=>0;m.resolveFlight(.5);assert.equal(m.carrier,receiver.id);assert.equal(m.owner,side);assert.ok(m.puck.x>45,'contact precedes the planned endpoint');
 }
});
