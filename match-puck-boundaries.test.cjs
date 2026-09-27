'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const H=require('./scripts/current-match-engine.cjs'),rosters=require('./match-lab-rosters');
function setup(side=0){const m=new H.Match(rosters,{seed:621,scenario:'attack'});m.time=m.wall=20;m.stoppage=0;m.flight=m.battle=null;m.owner=side;m.random=()=>0;return m;}
test('a pass behind either goal hits the net instead of reaching a receiver through the cage',()=>{
 for(const side of [0,1]){
  const m=setup(side),[a,b]=m.skaters(side);m.actors=[a,b];Object.assign(a,{x:H.progress(side,58.5),y:15,vx:0,vy:0});Object.assign(b,{x:H.progress(side,54),y:15,vx:0,vy:0});m.carrier=a.id;m.puck={x:a.x,y:a.y,z:0};
  assert.equal(m.pass(a,b),true);m.resolveFlight(.1);
  assert.equal(m.carrier,null);assert.equal(m.flight,null);assert.ok(H.progress(side,m.puck.x)>57.75,'puck remains behind the back panel');assert.ok(H.progress(side,30+m.puckVelocity.x)>30,'bounce points away from the net');assert.equal(m.stats[side].passes,0);assert.deepEqual(m.score,[0,0]);
  const before=m.puck.x;m.moveFreePuck(.1);assert.ok(Math.abs(m.puck.x-before)>0,'puck continues after contact');
 }
});
test('net sides and roof collide in both directions while the goal mouth and air above the net stay open',()=>{
 for(const side of [0,1]){
  const x=n=>H.progress(side,n);
  for(const [p,q] of [[{x:x(57),y:13,z:.2},{x:x(57),y:17,z:.2}],[{x:x(57),y:17,z:.2},{x:x(57),y:13,z:.2}],[{x:x(57),y:15,z:1.8},{x:x(57),y:15,z:.2}],[{x:x(57),y:15,z:.2},{x:x(57),y:15,z:1.8}]]){const hit=H.netContact(p,q);assert.equal(hit?.kind,'net');assert.ok(hit.t>0&&hit.t<1);}
  assert.equal(H.netContact({x:x(55),y:15,z:.3},{x:x(57),y:15,z:.3}),null);
  assert.equal(H.netContact({x:x(58.5),y:15,z:1.6},{x:x(54),y:15,z:1.6}),null);
  assert.equal(H.netContact({x:x(57.76),y:15,z:0},{x:x(57),y:15,z:0})?.t,0,'an almost touching puck cannot tunnel through a panel');
 }
});
test('dump flights hit all four rounded corners and keep moving inside the visible rink',()=>{
 for(const side of [0,1])for(const y of [2,28]){
  const m=setup(side),a=m.skaters(side)[0];m.actors=[a];Object.assign(a,{x:H.progress(side,43),y,vx:0,vy:0});m.puck={x:a.x,y,z:0};m.carrier=a.id;assert.equal(m.dump(a),true);
  for(let i=0;i<20&&m.flight;i++){m.resolveFlight(H.STEP);assert.equal(H.rinkLimit(m.puck,.119).hit,false,'flight never crosses the visible boards');}
  assert.equal(m.flight,null);assert.ok(m.puckVelocity);assert.ok(m.effects.some(e=>e.kind==='board'));
  const start={...m.puck};m.moveFreePuck(.2);assert.ok(H.distance(start,m.puck)>.1);assert.equal(H.rinkLimit(m.puck,.119).hit,false);assert.equal(m.carrier,null);
 }
});
test('loose pucks use the same net surfaces, retain remaining impact time and never gain energy',()=>{
 const m=setup();m.actors=[];m.carrier=null;m.puck={x:58.5,y:15,z:0};m.puckVelocity={x:-18,y:0,z:0};
 m.moveFreePuck(.1);assert.ok(m.puck.x>57.80,'remaining time moves the reflected puck away from contact');assert.ok(m.puckVelocity.x>0&&m.puckVelocity.x<2);
 const p=setup();p.actors=[];p.carrier=null;p.puck={x:57,y:13,z:0};p.puckVelocity={x:0,y:10,z:0};
 p.moveFreePuck(.2);assert.ok(p.puck.y<14.08);assert.ok(p.puckVelocity.y<0);assert.ok(Math.hypot(p.puckVelocity.x,p.puckVelocity.y)<10);
});
test('surface continuation survives serialization and identical fixed-step subdivision',()=>{
 const make=()=>{const m=setup();delete m.random;m.actors=[];m.carrier=null;m.puck={x:56,y:3,z:.3};m.puckVelocity={x:18,y:-4,z:1};return m;};
 const a=make(),b=make();for(let i=0;i<15;i++){a.moveFreePuck(.1);b.moveFreePuck(.05);b.moveFreePuck(.05);}assert.deepEqual(a.puck,b.puck);assert.deepEqual(a.puckVelocity,b.puckVelocity);assert.equal(a.rng,b.rng);
 const c=Object.assign(Object.create(H.Match.prototype),JSON.parse(JSON.stringify(a)));for(let i=0;i<20;i++){a.moveFreePuck(.1);c.moveFreePuck(.1);}assert.deepEqual(a.puck,c.puck);assert.deepEqual(a.puckVelocity,c.puckVelocity);assert.deepEqual(a.effects,c.effects);
});
test('release speed and assessed shooting lane use the carried puck rather than the body anchor',()=>{
 const m=setup(),[a,b]=m.skaters(0);m.actors=[a,b];Object.assign(a,{x:45,y:10,vx:0,vy:0});Object.assign(b,{x:50,y:20,vx:0,vy:0});m.carrier=a.id;m.puck={x:45.6,y:10.3,z:0};
 const origin={...m.puck},speed=15+m.attribute(a,'passing')*.22;m.pass(a,b);assert.ok(Math.abs(H.distance(origin,m.flight.end)/m.flight.duration-speed)<1e-9);
 m.carrier=a.id;m.puck={...origin};
 // Compare the exact same release location with and without a separate body
 // anchor. Both chance calculations must assess the same physical lane.
 const keeper=setup().actors.find(a=>a.role==='G'&&a.side===1),defender=setup().skaters(1)[0];Object.assign(defender,{x:50,y:13,vx:0,vy:0});m.actors.push(keeper,defender);
 const context=m.shotContext(a),atPuck={...a,id:'release-location',x:origin.x,y:origin.y};assert.deepEqual(m.shotModel(a,context),m.shotModel(atPuck,context));
 m.carrier=a.id;m.puck={x:56.7,y:15,z:0};a.shotPreparation={releaseAt:m.time};assert.equal(m.shoot(a),false);assert.equal(a.shotPreparation,undefined,'an invalidated windup cannot trap a skater behind the goal line');
});
