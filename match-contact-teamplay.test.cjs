'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const H=require('./scripts/current-match-engine.cjs'),rosters=require('./match-lab-rosters');
function setup(side=0){
 const m=new H.Match(rosters,{seed:377,scenario:'attack'});m.time=m.wall=20;m.stoppage=0;m.owner=side;
 for(const a of m.actors){a.vx=a.vy=0;if(a.role!=='G')Object.assign(a,{x:30,y:2});}
 const a=m.skaters(side)[0],d=m.skaters(1-side)[0];Object.assign(a,{x:H.progress(side,44),y:15});m.puck={x:a.x,y:a.y};m.carrier=a.id;
 const g=m.actors.find(a=>a.side!==side&&a.role==='G');Object.assign(g,m.goalieTarget(1-side,a));
 return {m,a,d,g};
}
function flatShot(m,a){m.random=()=>.5;m.shoot(a);const f=m.flight;f.contactRoll=0;f.vertical={z:0,vz:0};f.end.y=15;f.end.z=0;if(f.goalLine){f.goalLine.y=15;f.goalLine.z=0;}return f;}
test('swept contacts catch a fast crossing and reject parallel separation',()=>{
 assert.equal(H.sweepContact({x:0,y:0},{x:10,y:0},{x:5,y:0},{x:5,y:0},1),.4);
 assert.equal(H.sweepContact({x:0,y:0},{x:10,y:0},{x:5,y:2},{x:5,y:2},1),null);
 assert.ok(H.sweepContact({x:0,y:0},{x:10,y:0},{x:5,y:3},{x:5,y:-3},.35)!=null);
});
test('blocks are resolved on the travelled lane, in both directions, and a defender can leave it',()=>{
 for(const side of [0,1]){
  const {m,a,d}=setup(side);const f=flatShot(m,a);assert.equal(f.shot.blockerId,null);assert.equal(m.stats[1-side].blocks,0);
  Object.assign(d,{x:H.progress(side,46),y:15});m.resolveFlight(.1);
  assert.equal(m.stats[1-side].blocks,1);assert.equal(m.shots.length,1);assert.equal(m.lastShot.blockerId,d.id);
  assert.ok(H.distance(m.puck,d)<=.851);assert.equal(d.contactAction.kind,'block');assert.ok(m.puckVelocity);
  m.resolveFlight(1);assert.equal(m.stats[1-side].blocks,1);
  const left=setup(side);Object.assign(left.d,{x:H.progress(side,46),y:15});flatShot(left.m,left.a);left.d.y=23;
  left.m.resolveFlight(3);assert.notEqual(left.m.lastShot.outcome,'block');
 }
});
test('a fast moving defender crosses the puck between ticks; high pucks clear a reaching stick',()=>{
 const {m,a,d}=setup();flatShot(m,a);Object.assign(d,{x:45.2,y:13.5,sweepStart:{x:45.2,y:16.5,at:m.time}});
 m.resolveFlight(.1);assert.equal(m.stats[1].blocks,1);
 const high=setup();const f=flatShot(high.m,high.a);f.vertical={z:1.8,vz:0};Object.assign(high.d,{x:45.3,y:15.5});
 high.m.resolveFlight(.1);assert.equal(high.m.flight,f);assert.equal(high.m.stats[1].blocks,0);
});
test('post and crossbar impacts reflect and cannot award a goal',()=>{
 for(const side of [0,1]){
  const {m,a}=setup(side);const f=flatShot(m,a);f.goalLine=null;f.end={x:H.progress(side,56.5),y:15.92,z:0};f.shot.outcome='goal';
  m.resolveFlight(2);assert.equal(m.score[side],0);assert.equal(m.lastShot.miss,'post');assert.ok(m.effects.some(e=>e.kind==='post'));
  assert.ok(m.puckVelocity.x*(side?1:-1)>0,'normal component reverses at the post');
 }
 const bar=H.goalFrameContact({x:56,y:15,z:1.21},{x:57,y:15,z:1.21});assert.equal(bar.kind,'bar');
 assert.equal(H.goalFrameContact({x:56,y:15,z:.5},{x:57,y:15,z:.5}),null);
});
test('a receiver must meet the puck and can cushion, bobble or miss the same incoming pass',()=>{
 const outcomes=[];
 for(const roll of [0,.965,.999]){
  const {m,a}=setup(),to=m.skaters(0)[1];Object.assign(to,{x:49,y:15});m.random=()=>0;m.pass(a,to);m.random=()=>roll;
  const start={...m.puck};m.resolveFlight(2);outcomes.push(m.carrier===to.id?'clean':to.contactAction.kind);
  assert.ok(H.distance(m.puck,start)>3);assert.ok(H.distance(m.puck,to)>.5,'receiving does not teleport the puck to the body');
  if(m.carrier){const contact={...m.puck};m.move(.1);assert.ok(H.distance(m.puck,to)<H.distance(contact,to),'control cushions the puck over time');}
  else{assert.ok(m.puckVelocity);assert.ok(to.pickupAfter>m.time);}
 }
 assert.deepEqual(outcomes,['clean','bobble','miss']);
 const {m,a}=setup(),to=m.skaters(0)[1];Object.assign(to,{x:49,y:15});m.random=()=>0;m.pass(a,to);to.y=24;m.resolveFlight(2);
 assert.equal(m.carrier,null);assert.equal(m.stats[0].passes,0);assert.ok(m.puckVelocity);
});
test('reception quality responds to control, pressure, height and relative puck speed',()=>{
 const good=H.receptionModel({control:18,composure:16,pressure:0,speed:12}),bad=H.receptionModel({control:5,composure:6,pressure:.8,speed:27,height:.35});
 assert.ok(good.clean>bad.clean+.25);assert.ok(bad.bobble>good.bobble);
});
test('board pins, closing checks and stick pokes have distinct physics and recoveries',()=>{
 const {m,a,d}=setup();Object.assign(a,{x:49,y:3});Object.assign(d,{x:48,y:3});m.puck={x:49,y:3};m.startBattle(a,d);
 assert.equal(m.battle.type,'pin');assert.equal(d.contactAction.kind,'pin');assert.equal(a.contactAction.kind,'protect');
 const check=setup();Object.assign(check.d,{x:42.8,y:15,vx:4});check.m.startBattle(check.a,check.d);
 assert.equal(check.m.battle.type,'check');assert.equal(check.m.stats[1].hits,1);assert.ok(check.a.recoverUntil>check.m.time);
 const poke=setup();Object.assign(poke.d,{x:42.2,y:15,vx:3});poke.m.startBattle(poke.a,poke.d);assert.equal(poke.m.battle.type,'poke');poke.m.resolveBattle(3);
 assert.equal(poke.m.carrier,null);assert.ok(poke.m.puckVelocity);assert.equal(poke.m.phase,'loose');
});
test('shot preparation is a real intervention window and resumes from a saved state',()=>{
 const {m,a,d}=setup();m.chooseAction=()=>({kind:'shoot',reason:'Skott'});m.decide();assert.ok(a.shotPreparation);assert.equal(m.flight,null);
 const saved=JSON.parse(JSON.stringify(m));assert.ok(saved.actors.find(x=>x.id===a.id).shotPreparation);
 Object.assign(d,{x:a.x-1,y:a.y,vx:4});m.startBattle(a,d);assert.equal(a.shotPreparation,undefined);assert.equal(m.shots.length,0);
 const app=require('./scripts/career-test-fixture.cjs').boot();
 app.run("startCareerWithClub('HV71');state.calendar.date=calendarTarget();startMatch();pauseMatch();globalThis.e=studioEngine();e.stoppage=0;e.time=e.wall=20;globalThis.a=e.skaters(0)[0];for(const p of e.actors)if(p.role!=='G')Object.assign(p,{x:30,y:3,vx:0,vy:0});Object.assign(a,{x:49,y:15});e.owner=0;e.carrier=a.id;e.puck={x:49,y:15};e.chooseAction=()=>({kind:'shoot',reason:'Skott'});e.decide();delete e.chooseAction;save();");
 const restored=require('./scripts/career-test-fixture.cjs').boot(app.storage.value);
 const finish="globalThis.e=studioEngine();for(let i=0;i<6;i++)e.step();JSON.stringify([e.rng,e.puck,e.flight,e.shots,e.score])";
 assert.equal(restored.run(finish),app.run(finish));
});
test('an early career block enters the shot ledger exactly once',()=>{
 const app=require('./scripts/career-test-fixture.cjs').boot();
 app.run("startCareerWithClub('HV71');state.calendar.date=calendarTarget();startMatch();pauseMatch();globalThis.e=studioEngine();e.stoppage=0;e.time=e.wall=20;for(const p of e.actors)if(p.role!=='G')Object.assign(p,{x:30,y:2,vx:0,vy:0});globalThis.a=e.skaters(0)[0];globalThis.d=e.skaters(1)[0];Object.assign(a,{x:44,y:15});e.puck={x:44,y:15};e.carrier=a.id;e.owner=0;e.random=()=>0;e.shoot(a);Object.assign(d,{x:45.5,y:15});globalThis.before=state.live.analysis.shots.length;globalThis.full=e.flight.duration;e.resolveFlight(.1);");
 assert.ok(app.run('full>.1'));assert.equal(app.run('state.live.analysis.shots.length-before'),1);assert.equal(app.run('e.stats[1].blocks'),1);
 app.run('e.resolveFlight(.1)');assert.equal(app.run('state.live.analysis.shots.length-before'),1);
});
test('support triangles stay onside and forecheck choices change actual pressure distance',()=>{
 for(const side of [0,1]){
  const {m,a}=setup(side);Object.assign(a,{x:H.progress(side,22),y:8});m.puck={x:a.x,y:a.y};m.phase='breakout';
  m.targets();const support=m.skaters(side).filter(a=>/understöd/.test(a.duty));assert.equal(support.length,2);
  assert.ok(H.distance(support[0].target,support[1].target)>3);assert.ok(support.every(a=>H.progress(side,a.target.x)<40));
  const defending=1-side;m.teams[defending].forecheck='passive';m.defenseTargets(defending);const f1=m.actor(m.teams[defending].forecheckLead),passive=H.distance(a,f1.target);
  m.teams[defending].forecheck='aggressive';m.defenseTargets(defending);assert.ok(H.distance(a,f1.target)<passive-2);
  const marks=m.skaters(defending).map(a=>a.markedThreat);assert.equal(new Set(marks).size,marks.length,'each defender owns a distinct threat');
 }
});
test('fatigue slows recovery and special teams retain distinct shapes and coverage',()=>{
 const {m,a}=setup(),b=m.skaters(0)[1];Object.assign(a,{x:10,y:5,vx:0,vy:0,target:{x:25,y:5}});Object.assign(b,{x:10,y:25,vx:0,vy:0,target:{x:25,y:25}});m.carrier=null;
 for(const key of ['skating','acceleration'])a.player.attributes[key]=b.player.attributes[key]=10;a.player.energy=100;b.player.energy=30;
 for(let i=0;i<20;i++)m.move(.1);assert.ok(a.x>b.x+.1);
 const special=setup();special.m.penalty={side:1,remaining:100};special.m.installUnit(1);special.m.phase='attack';special.a.y=6;special.m.skaters(0).find(a=>a.role==='RD').y=24;special.m.puck={x:special.a.x,y:6};special.m.targets();
 assert.ok(special.m.skaters(0).some(a=>a.duty.includes('diagonalpassningen')));assert.ok(special.m.skaters(1).some(a=>a.duty.includes('täcker bakom pressen')));
});
