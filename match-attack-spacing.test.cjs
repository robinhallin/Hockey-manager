'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const H=require('./scripts/current-match-engine.cjs'),rosters=require('./match-lab-rosters');
test('a low-high combination retains a net-front screen and separates its next runner in either direction',()=>{
 for(const side of [0,1]){
  const m=new H.Match(rosters,{seed:227}),point=(x,y)=>({x:H.progress(side,x),y});m.time=m.wall=33;m.phase='attack';m.stoppage=-.01;m.owner=side;
  const actors=m.skaters(side),carrier=actors.find(a=>a.role==='RW'),center=actors.find(a=>a.role==='C'),wing=actors.find(a=>a.role==='LW');
  for(const a of actors)Object.assign(a,point(a.role.endsWith('D')?44:53,a.role==='C'?17:24),{vx:0,vy:0});Object.assign(carrier,point(54,25));m.carrier=carrier.id;m.puck={x:carrier.x,y:carrier.y};
  // The left wing is closer to the next slot than the existing center screen.
  Object.assign(wing,point(53,15));Object.assign(center,point(52,18));for(const a of m.skaters(1-side))Object.assign(a,point(30,3));
  const ledger=JSON.stringify([m.rng,m.actors.map(a=>[a.id,a.x,a.y])]);m.targets();const plan=m.teams[side].attackPattern;
  assert.equal(plan.kind,'low-high');assert.equal(plan.runner,wing.id);assert.ok(H.distance(wing.target,center.target)>=3.2,'screen and next runner use distinct lanes');
  const screen=actors.find(a=>a.netFront?.kind==='screen');assert.ok(screen,'active play with a fractional expired stoppage retains a real screen');
  assert.ok(H.progress(side,screen.target.x)>53,'the net-front option is retained');assert.ok(H.progress(side,wing.target.x)<=54.2);
  assert.equal(JSON.stringify([m.rng,m.actors.map(a=>[a.id,a.x,a.y])]),ledger);
  const target={...plan.runnerTarget};m.time+=.1;m.targets();assert.deepEqual(plan.runnerTarget,target,'the route is held until the next hockey read');
  for(const a of actors)delete a.netFront;carrier.controlledAt=m.time;m.netFrontTargets();assert.ok(!actors.some(a=>a.netFront),'a new task is read before the screen begins');
  m.time+=1;m.netFrontTargets();assert.ok(actors.some(a=>a.netFront?.kind==='screen'));
 }
});
test('a saved runner route hydrates through the career serializer and resumes exact decisions',()=>{
 const {boot}=require('./scripts/career-test-fixture.cjs'),app=boot();
 app.run("startCareerWithClub('HV71');state.calendar.date=calendarTarget();startMatch();pauseMatch();globalThis.e=studioEngine();e.time=e.wall=33;e.stoppage=-.01;e.phase='attack';e.owner=0;globalThis.c=e.skaters(0).find(a=>a.role==='RW');e.carrier=c.id;c.x=54;c.y=25;e.puck={x:54,y:25};for(const a of e.skaters(0))if(a!==c){a.x=a.role.endsWith('D')?44:53;a.y=a.role==='C'?17:15}for(const a of e.skaters(1)){a.x=30;a.y=3}e.targets();save();validateSaveText(localStorage.getItem('hockey_manager_alpha02'));");
 assert.ok(app.run('e.teams[0].attackPattern.runnerTarget'));
 const loaded=boot(app.storage.value),steps="globalThis.e=studioEngine();for(let i=0;i<40;i++)e.step();JSON.stringify([e.rng,e.time,e.puck,e.score,e.teams.map(t=>t.attackPattern),e.actors.map(a=>[a.x,a.y,a.target,a.netFront])])";
 assert.equal(loaded.run(steps),app.run(steps));
 assert.throws(()=>app.run("globalThis.bad=JSON.parse(localStorage.getItem('hockey_manager_alpha02'));bad.live.broadcast.teams[0].attackPattern.runnerTarget.y=31;validateSaveText(JSON.stringify(bad))"));
});
