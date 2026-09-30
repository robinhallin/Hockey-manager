'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const H=require('./scripts/current-match-engine.cjs'),rosters=require('./match-lab-rosters');
function setup(side=0){
  const m=new H.Match(rosters,{seed:711,scenario:'attack'}),point=(p,y)=>({x:H.progress(side,p),y});
  m.time=m.wall=20;m.stoppage=0;m.phase='attack';m.owner=side;
  const spots={LW:[50,5],C:[54,15],RW:[52,18],LD:[43,8],RD:[43,23]};
  for(const a of m.skaters(side))Object.assign(a,point(...spots[a.role]),{vx:0,vy:0});
  for(const [i,a] of m.skaters(1-side).entries())Object.assign(a,point(45+i,3+i*5),{vx:0,vy:0});
  const carrier=m.skaters(side).find(a=>a.role==='LW'),receiver=m.skaters(side).find(a=>a.role==='C'),runner=m.skaters(side).find(a=>a.role==='RW');
  m.carrier=carrier.id;m.puck={x:carrier.x,y:carrier.y};
  m.teams[side].attackPattern={version:2,at:20,until:34,stage:0,holder:carrier.id,origin:carrier.id,players:m.skaters(side).map(a=>a.id),strength:5,readAt:20.8,kind:'cycle',receiver:receiver.id,runner:runner.id,target:point(57.2,11),lane:-1,risk:0};
  return {m,carrier,receiver,runner,point};
}
test('production target chain retains the low outlet while a distinct forward screens, in both directions',()=>{
  for(const side of [0,1]){
    const {m,receiver,runner}=setup(side),before=m.actors.map(a=>[a.id,a.x,a.y]);m.targets();
    assert.deepEqual(receiver.target,m.teams[side].attackPattern.target,'screening cannot cancel the cycle route');
    assert.equal(receiver.netFront,undefined);assert.equal(runner.netFront.kind,'screen');
    assert.ok(H.distance(receiver.target,runner.target)>4,'outlet and screen occupy separate useful spaces');
    assert.deepEqual(m.actors.map(a=>[a.id,a.x,a.y]),before,'planning does not move bodies');
  }
});
test('net-front coverage cannot steal another defender’s threat or the puck carrier',()=>{
  for(const side of [0,1]){
    const {m,carrier,receiver,runner,point}=setup(side),[wrong,correct]=m.skaters(1-side);
    Object.assign(wrong,point(52.3,18));wrong.markedThreat=carrier.id;wrong.target=point(49,5);
    Object.assign(correct,point(53,18));correct.markedThreat=runner.id;
    const previous={...wrong.target};m.netFrontTargets();
    assert.deepEqual(wrong.target,previous);assert.equal(wrong.netFront,undefined);
    assert.equal(correct.netFront.opponent,runner.id);assert.equal(runner.netFront.opponent,correct.id);
    correct.markedThreat=receiver.id;const protectedTarget={...correct.target};m.netFrontTargets();
    assert.deepEqual(correct.target,protectedTarget);assert.equal(correct.netFront,undefined);
    assert.equal(runner.netFront.opponent,null,'no remote or duplicate box-out invented');
  }
});
test('small changes in distance do not swap the screen, but a new receiving task releases it immediately',()=>{
  const {m,receiver,runner,point}=setup();m.teams[0].attackPattern=null;
  Object.assign(receiver,point(54,14));Object.assign(runner,point(54,16.1));m.netFrontTargets();
  assert.equal(receiver.netFront.kind,'screen');Object.assign(runner,point(54,15));m.netFrontTargets();
  assert.equal(receiver.netFront.kind,'screen');assert.equal(runner.netFront,undefined,'no oscillating role hand-off');
  m.flight={kind:'pass',side:0,to:receiver.id};m.netFrontTargets();
  assert.equal(receiver.netFront,undefined,'reception has priority at the same simulation tick');
  assert.equal(runner.netFront.kind,'screen');
  m.stoppage=1;m.netFrontTargets();assert.ok(m.actors.every(a=>!a.netFront),'stoppage releases physical holds');
});
test('an available rebound can be attacked after the passing route ends without persisting a stale screen',()=>{
  const {m,receiver,runner,point}=setup();m.targets();m.carrier=null;m.flight=null;
  m.rebound={side:0,time:m.time,spot:point(53,17)};m.puck={...m.rebound.spot};m.netFrontTargets();
  const pursuers=m.skaters(0).filter(a=>a.netFront?.kind==='rebound');assert.equal(pursuers.length,1);
  assert.deepEqual(pursuers[0].target,m.puck);assert.ok(![receiver,runner].some(a=>a.netFront?.kind==='screen'));
  m.time+=3;m.netFrontTargets();assert.ok(m.actors.every(a=>!a.netFront),'expired rebound does not leave a phantom tie-up');
});
