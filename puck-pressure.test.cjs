'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Match,distance,progress}=require('./match-simulation'),rosters=require('./match-lab-rosters');
function setup(side=0){const m=new Match(rosters,{scenario:'attack',seed:912});const a=m.skaters(side)[0];m.time=20;for(const [i,b] of m.skaters(side).entries())Object.assign(b,{x:progress(side,32),y:4+i*5,vx:0,vy:0});for(const [i,d] of m.skaters(1-side).entries())Object.assign(d,{x:progress(side,52),y:3+i*5,vx:0,vy:0});Object.assign(a,{x:progress(side,35),y:8});m.takePossession(a);m.phase='entry';return {m,a};}
test('shielding moves away from pressure, stays inside boards and cannot create offside',()=>{
 for(const side of [0,1]){
  const {m,a}=setup(side),d=m.skaters(1-side)[0];Object.assign(d,{x:a.x+(side?-1:1)*1.1,y:a.y});
  const row=m.actionOptions(a).find(r=>r.kind==='shield');assert.ok(row);assert.ok(distance(row.target,d)>distance(a,d));assert.ok(distance(a,row.target)>.5&&distance(a,row.target)<1.5);
  m.chooseAction=()=>row;m.canGivePenalty=()=>false;m.battleChance=()=>0;m.decide();assert.deepEqual(a.carryPlan.target,row.target);m.targets();assert.deepEqual(a.target,row.target);
  Object.assign(a,{x:progress(side,39.7),y:1.1});m.skaters(side)[1].x=progress(side,43);const target=m.shieldTarget(a);
  assert.ok(target.y>=1.1&&target.y<=28.9);assert.ok(progress(side,target.x)<=39.5);
 }
});
test('dump selects the less defended corner with real chasing support, mirrored for both teams',()=>{
 for(const side of [0,1]){
  const {m,a}=setup(side);a.y=5;m.puck={x:a.x,y:a.y};
  for(const b of m.skaters(side).filter(b=>b!==a))Object.assign(b,{x:progress(side,38),y:27});
  for(const d of m.skaters(1-side))Object.assign(d,{x:progress(side,54),y:2});
  const rng=m.rng,choice=m.dumpTarget(a);assert.equal(choice.target.y,28);assert.equal(choice.far,true);assert.equal(m.rng,rng);
  const row=m.actionOptions(a).find(r=>r.kind==='dump');assert.equal(row.target.y,28);assert.match(row.reason,/bortre/);
  assert.equal(m.dump(a),true);assert.equal(m.flight.end.y,28);assert.equal(m.flight.side,side);
 }
});
test('safe reset behind blue gains value only when it provides an escape from actual pressure',()=>{
 const {m,a}=setup();a.x=45;const b=m.skaters(0)[1];Object.assign(b,{x:38,y:20});m.puck={x:a.x,y:a.y};m.phase='attack';
 let carrierPressure=0,receiverPressure=.1;m.pressureAt=x=>x.id===a.id?carrierPressure:x.id===b.id?receiverPressure:0;m.passChance=()=>.9;
 const row=()=>m.actionOptions(a).find(r=>r.kind==='pass'&&r.to===b.id);
 const unforced=row();carrierPressure=.7;const escape=row();assert.ok(escape.value>unforced.value+.1);assert.match(escape.reason,/ta sig ur pressen/);
 receiverPressure=.8;assert.ok(row().value<escape.value-.1);assert.doesNotMatch(row().reason,/ta sig ur pressen/);
});
test('production dump continues around the boards from the chosen corner, including reload',()=>{
 const {boot}=require('./scripts/career-test-fixture.cjs'),app=boot();
 app.run(`startCareerWithClub('HV71');state.calendar.date=calendarTarget();startMatch();pauseMatch();globalThis.e=studioEngine();e.stoppage=0;globalThis.a=e.skaters(0)[0];Object.assign(a,{x:35,y:5});for(const b of e.skaters(0).filter(b=>b!==a))Object.assign(b,{x:38,y:27});for(const d of e.skaters(1))Object.assign(d,{x:54,y:2});e.takePossession(a);e.dump(a);save();`);
 assert.equal(app.run('e.flight.dumpLane'),'high');assert.equal(app.run('e.flight.end.y'),28);
 const saved=boot(app.storage.value);saved.run('globalThis.e=studioEngine();e.resolveFlight(e.flight.duration);');app.run('e.resolveFlight(e.flight.duration);');
 assert.equal(app.run('JSON.stringify(e.rimPath)'),saved.run('JSON.stringify(e.rimPath)'));assert.equal(app.run('e.rimPath[0].y'),24.5);
 assert.equal(app.run('e.rng'),saved.run('e.rng'));
});
