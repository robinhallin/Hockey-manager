'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Match,puckVertical,flightVertical}=require('./scripts/current-match-engine.cjs'),rosters=require('./match-lab-rosters');
function shotSetup(side=0){
 const m=new Match(rosters,{seed:771,scenario:'attack'});m.time=20;m.wall=20;m.stoppage=0;m.owner=side;
 for(const a of m.actors)if(a.role!=='G'){a.x=30;a.y=3+m.skaters(a.side).indexOf(a)*4;}
 const a=m.skaters(side)[0],g=m.actors.find(a=>a.side!==side&&a.role==='G');
 Object.assign(a,{x:side?10:50,y:15,vx:0,vy:0});g.engine31LastRead={x:a.x,y:a.y,time:m.time};Object.assign(g,m.goalieTarget(1-side,a));
 m.puck={x:a.x,y:a.y};m.carrier=a.id;m.lastTouches=[];return {m,a,g};
}
test('vertical travel uses gravity, dissipative ice bounces and finite rest',()=>{
 const rise=puckVertical({z:0,vz:4},4/9.81);assert.ok(Math.abs(rise.z-16/(2*9.81))<1e-9);assert.ok(Math.abs(rise.vz)<1e-9);
 const impact=puckVertical({z:0,vz:4},8/9.81);assert.equal(impact.z,0);assert.ok(Math.abs(impact.vz-4*.28)<1e-9);
 assert.deepEqual(puckVertical({z:1,vz:-2},5),{z:0,vz:0,bounces:2});
 assert.deepEqual(flightVertical({elapsed:1}),{z:0,vz:0,bounces:0},'old flights stay flat');
});
test('an airborne clearance passes over a nearby stick and cannot be possessed until it drops',()=>{
 const {m,a}=shotSetup(),d=m.skaters(1)[0];m.random=()=>0;m.clear(a);const f=m.flight;
 const t=.18,u=t/f.duration;Object.assign(d,{x:f.start.x+(f.end.x-f.start.x)*u,y:f.start.y+(f.end.y-f.start.y)*u});
 m.resolveFlight(t);assert.ok(m.puck.z>.45);assert.equal(m.carrier,null);assert.equal(m.flight,f);
 m.takePossession(d);assert.equal(m.carrier,null,'no teleport from the air onto a blade');
 m.puck.z=.1;m.takePossession(d);assert.equal(m.carrier,d.id);assert.equal(m.puck.z||0,0);
});
test('a saved shot contacts the keeper in front of the goal, records its save and starts its real rebound there',()=>{
 for(const side of [0,1]){
  const {m,a,g}=shotSetup(side);m.random=()=>.5;m.shoot(a);const f=m.flight;f.shot.finishRoll=1;
  const contact={...f.end};m.random=()=>.99;m.resolveFlight(f.duration);
  assert.equal(f.shot.outcome,'save');assert.equal(m.stats[1-side].saves,1);assert.equal(m.stats[side].shots,1);
  assert.ok(side?contact.x>3.5:contact.x<56.5);assert.equal(m.flight.kind,'rebound');
  assert.ok(Math.abs(m.flight.start.x-contact.x)<1e-9);assert.ok(Math.abs(m.flight.start.z-contact.z)<1e-9);
  assert.equal(g.keeperAction.kind,'save');assert.ok(['glove','blocker','stick','butterfly'].includes(g.keeperAction.style));
  assert.ok(m.presentationFrame().effects.some(e=>e.kind==='save'&&e.side===1-side));
 }
});
test('an unbeaten shot is counted only when its continuation crosses the goal line',()=>{
 for(const side of [0,1]){
  const {m,a}=shotSetup(side);m.random=()=>.5;m.shoot(a);const f=m.flight;f.shot.finishRoll=0;
  m.resolveFlight(f.duration);assert.equal(m.score[side],0);assert.equal(m.shots.length,0);assert.equal(m.flight.keeperPassed,true);
  assert.ok(!m.presentationFrame().effects.some(e=>e.kind==='goal'));
  const remaining=m.flight.duration,goal={...m.flight.end};m.resolveFlight(remaining);
  assert.equal(m.score[side],1);assert.equal(m.shots.length,1);assert.ok(Math.abs(m.puck.x-goal.x)<1e-9);assert.ok(Math.abs(m.puck.z-goal.z)<1e-9);
  assert.ok(m.puck.z<1.17);assert.ok(m.presentationFrame().effects.some(e=>e.kind==='goal'&&e.side===side));
 }
});
test('shots over the crossbar stay misses and descend into continuous loose-puck physics',()=>{
 const {m,a}=shotSetup();const rolls=[.99,.99,0,.5];m.random=()=>rolls.shift()??.5;m.shoot(a);const f=m.flight;
 assert.equal(f.shot.miss,'high');m.resolveFlight(f.duration);assert.equal(m.score[0],0);assert.equal(m.stats[0].shots,0);assert.equal(m.shots[0].outcome,'wide');assert.ok(m.puck.z>1.22);
 const z=m.puck.z;m.moveFreePuck(.2);assert.ok(Number.isFinite(m.puck.z)&&m.puck.z!==z);assert.ok(m.puckVelocity);
 for(let i=0;i<100&&m.puckVelocity;i++)m.moveFreePuck(.1);
 assert.equal(m.puck.z,0);assert.equal(m.puckVelocity,null);assert.ok(m.effects.some(e=>e.kind==='board'||e.kind==='ice'));
});
test('height, rebound velocity, save actions and effect IDs resume exactly after serialization',()=>{
 const {m,a}=shotSetup();m.random=()=>.5;m.shoot(a);delete m.random;m.resolveFlight(m.flight.duration*.35);
 const copy=Object.assign(Object.create(Match.prototype),JSON.parse(JSON.stringify(m)));
 // Standalone JSON copies do not reconnect players; compare physical state,
 // while the actual career serializer is covered below.
 for(let i=0;i<14;i++){
  m.wall+=.1;copy.wall+=.1;if(m.flight)m.resolveFlight(.1);else m.moveFreePuck(.1);if(copy.flight)copy.resolveFlight(.1);else copy.moveFreePuck(.1);
  assert.deepEqual(copy.puck,m.puck);assert.deepEqual(copy.puckVelocity,m.puckVelocity);assert.deepEqual(copy.effects,m.effects);assert.equal(copy.rng,m.rng);assert.deepEqual(copy.score,m.score);
 }
});
test('career saves between the keeper and goal line award a single goal and preserve the replay',()=>{
 const {boot}=require('./scripts/career-test-fixture.cjs'),app=boot();
 app.run(`startCareerWithClub('HV71');state.calendar.date=calendarTarget();startMatch();
  globalThis.e=studioEngine();e.started=true;e.stoppage=0;e.time=20;e.wall=20;e.owner=0;
  for(const p of e.actors)if(p.role!=='G'){p.x=30;p.y=3+e.skaters(p.side).indexOf(p)*4;}
  globalThis.shooter=e.skaters(0)[0];Object.assign(shooter,{x:50,y:15,vx:0,vy:0});
  Object.assign(e.actors.find(p=>p.side===1&&p.role==='G'),e.goalieTarget(1,shooter));e.puck={x:50,y:15};e.carrier=shooter.id;e.random=()=>.5;
  e.shoot(shooter);e.flight.shot.finishRoll=0;delete e.random;e.resolveFlight(e.flight.duration);e.tick=2;e.capture();pauseMatch();save();`);
 assert.equal(app.run('e.score[0]'),0);assert.equal(app.run('e.flight.keeperPassed'),true);
 const restored=boot(app.storage.value);const finish=`globalThis.e=studioEngine();e.wall+=.1;e.resolveFlight(e.flight.duration);e.tick=2;e.capture();`;
 app.run(finish);restored.run(finish);
 assert.equal(restored.run('state.live.hv'),1);assert.equal(restored.run("state.live.analysis.events.filter(e=>e.type==='goal'&&e.side==='own').length"),1);
 assert.equal(restored.run('JSON.stringify([e.score,e.puck,e.latestReplay,state.live.analysis.shots])'),app.run('JSON.stringify([e.score,e.puck,e.latestReplay,state.live.analysis.shots])'));
 restored.run('e.resolveFlight(.1)');assert.equal(restored.run('state.live.hv'),1);
});
