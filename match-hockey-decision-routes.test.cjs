'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const H=require('./scripts/current-match-engine.cjs'),rosters=require('./match-lab-rosters');
const point=(side,x,y)=>({x:H.progress(side,x),y});
test('a forward supplies the next wide outlet while a supporting back retains depth',()=>{
 for(const side of [0,1])for(const oneForward of [false,true]){
  const m=new H.Match(rosters,{seed:227}),c=m.skaters(side).find(a=>a.role==='C');
  m.owner=side;m.carrier=c.id;m.phase='breakout';Object.assign(c,point(side,26,15));m.puck={x:c.x,y:c.y};
  for(const a of m.skaters(side))if(a!==c)Object.assign(a,point(side,a.role.endsWith('D')?25:18,a.role==='LD'?14:a.role==='RD'?17:a.role==='LW'?5:25));
  if(oneForward){m.skaters(side).find(a=>a.role==='RW').status='leaving';Object.assign(m.skaters(side).find(a=>a.role==='LW'),point(side,26.1,15));}
  for(const a of m.skaters(1-side))Object.assign(a,point(side,50,3));
  const before=JSON.stringify([m.rng,m.actors.map(a=>[a.x,a.y])]);m.collectiveTargets();
  const [low,wide]=m.teams[side].transitionSupport.players.map(id=>m.actor(id));
  assert.ok(low.role.endsWith('D'));assert.ok(!wide.role.endsWith('D'),'forward supplies width even when both backs are nearer');
  assert.ok(H.progress(side,low.target.x)<26);assert.ok(H.progress(side,wide.target.x)>26);
  assert.equal(JSON.stringify([m.rng,m.actors.map(a=>[a.x,a.y])]),before);
 }
});
test('active F2 covers the observed outlet lane deep in the zone and F3 stays above it',()=>{
 for(const side of [0,1])for(const style of ['balanced','aggressive']){
  const m=new H.Match(rosters,{seed:227}),c=m.skaters(side).find(a=>a.role==='LD'),outlet=m.skaters(side).find(a=>a.role==='RD');
  m.owner=side;m.carrier=c.id;Object.assign(c,point(side,7,5));Object.assign(outlet,point(side,9,16));m.puck={x:c.x,y:c.y};
  for(const a of m.skaters(side))if(a!==c&&a!==outlet)Object.assign(a,point(side,27,25));
  m.teams[1-side].forecheck=style;m.defenseTargets(1-side);
  const f2=m.skaters(1-side).find(a=>a.duty.startsWith('F2')),f3=m.skaters(1-side).find(a=>a.duty.startsWith('F3'));
  // The target must be on the actual pass segment, not pinned at x=47
  // when a first pass happens deep in the offensive zone.
  const dx=outlet.x-c.x,dy=outlet.y-c.y,t=((f2.target.x-c.x)*dx+(f2.target.y-c.y)*dy)/(dx*dx+dy*dy);
  assert.ok(t>0&&t<1);assert.ok(H.distance(f2.target,{x:c.x+t*dx,y:c.y+t*dy})<1);
  assert.ok(H.progress(1-side,f3.target.x)<H.progress(1-side,f2.target.x),'F3 protects the high middle');
 }
});
test('the weak-side back protects a runner ahead of the puck without dragging the strong back off his gap',()=>{
 for(const side of [0,1]){
  const m=new H.Match(rosters,{seed:227}),c=m.skaters(side).find(a=>a.role==='LW'),runner=m.skaters(side).find(a=>a.role==='RW');
  m.owner=side;m.carrier=c.id;Object.assign(c,point(side,34,6),{vx:side?-3:3});m.puck={x:c.x,y:c.y};
  for(const a of m.skaters(side))if(a!==c)Object.assign(a,point(side,a===runner?41:25,a===runner?24:15));
  for(const a of m.skaters(1-side))Object.assign(a,point(side,a.role.endsWith('D')?39:29,a.role==='LD'?8:21));
  m.defenseTargets(1-side);const backs=m.skaters(1-side).filter(a=>a.role.endsWith('D')),strong=backs.find(a=>a.markedThreat===c.id),weak=backs.find(a=>a.markedThreat===runner.id);
  assert.ok(strong&&weak);assert.ok(H.progress(side,strong.target.x)>34&&H.progress(side,strong.target.x)<40);
  assert.ok(H.progress(side,weak.target.x)>41,'the target remains between the assigned runner and goal');assert.ok(weak.target.y>strong.target.y+8);
 }
});
test('attack routes read pressure at the destination rather than only at the current receiver',()=>{
 for(const side of [0,1]){
  const m=new H.Match(rosters,{seed:227}),c=m.skaters(side).find(a=>a.role==='RW'),receiver=m.skaters(side).find(a=>a.role==='C');
  m.owner=side;m.carrier=c.id;Object.assign(c,point(side,49,5));m.puck={x:c.x,y:c.y};Object.assign(receiver,point(side,53,9));
  for(const a of m.skaters(side))if(a!==c&&a!==receiver)a.status='leaving';
  for(const a of m.skaters(1-side))Object.assign(a,point(side,25,3));
  const open=m.patternRoute(c);assert.equal(open.kind,'cycle');const defender=m.skaters(1-side)[0];Object.assign(defender,open.target);
  assert.equal(m.pressureAt(receiver),0,'receiver is still free at the current position');assert.equal(m.laneRisk(c,open.target),0,'endpoint pressure is excluded from the pass-segment calculation');
  const ledger=JSON.stringify([m.rng,m.actors.map(a=>[a.x,a.y])]),closed=m.patternRoute(c);
  assert.notDeepEqual(closed.target,open.target);assert.ok(m.pressureAt({...closed.target,side})<.65);
  assert.equal(JSON.stringify([m.rng,m.actors.map(a=>[a.x,a.y])]),ledger);
 }
});
test('a covered attack destination is reread after the existing plan latency',()=>{
 for(const side of [0,1]){
  const m=new H.Match(rosters,{seed:227}),c=m.skaters(side).find(a=>a.role==='RW');
  m.owner=side;m.carrier=c.id;m.time=m.wall=33;m.stoppage=0;m.phase='attack';Object.assign(c,point(side,49,5));m.puck={x:c.x,y:c.y};
  for(const a of m.skaters(side))if(a!==c)Object.assign(a,point(side,a.role.endsWith('D')?44:53,a.role==='LD'?8:a.role==='RD'?22:9));
  for(const a of m.skaters(1-side))Object.assign(a,point(side,25,3));
  m.updateAttackPattern();const plan=m.teams[side].attackPattern,target={...plan.target};Object.assign(m.skaters(1-side)[0],target);
  m.time=plan.readAt-.01;m.updateAttackPattern();assert.deepEqual(plan.target,target,'no instantaneous perfect read');
  m.time=plan.readAt+.01;m.updateAttackPattern();assert.notDeepEqual(plan.target,target);assert.ok(m.pressureAt({...plan.target,side})<.65);
 }
});
