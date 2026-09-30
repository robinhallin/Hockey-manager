'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const H=require('./scripts/current-match-engine.cjs'),rosters=require('./match-lab-rosters');
function setup(side=0,y=6,role='LD'){
  const m=new H.Match(rosters,{seed:4504}),point=(p,y)=>({x:H.progress(side,p),y});
  const positions={LD:[9,y],RD:[10,15],C:[13,15],LW:[17,4],RW:[22,26]};
  for(const a of m.skaters(side))Object.assign(a,point(...positions[a.role]));
  for(const [i,a] of m.skaters(1-side).entries())Object.assign(a,point(28+i,3+i*5));
  const c=m.skaters(side).find(a=>a.role===role);Object.assign(c,point(9,y));
  m.owner=side;m.carrier=c.id;m.puck={x:c.x,y:c.y};m.phase='breakout';
  return {m,c,point};
}
test('production targets separate low D, center curl, board outlet and weak-side stretch in both directions',()=>{
  for(const side of [0,1])for(const y of [6,24])for(const role of ['LD','RD']){
    const {m,c}=setup(side,y,role),before=m.skaters(side).map(a=>[a.id,a.x,a.y]);m.targets();
    const mates=m.skaters(side).filter(a=>a!==c),back=mates.find(a=>a.role.endsWith('D')),center=mates.find(a=>a.role==='C');
    assert.ok(H.progress(side,back.target.x)<9,'back partner stays below the carrier');
    assert.ok(H.progress(side,center.target.x)>9&&H.progress(side,center.target.x)<17,'center stays close enough for first pass');
    const wings=mates.filter(a=>['LW','RW'].includes(a.role));
    assert.ok(wings.some(a=>y<15?a.target.y<6:a.target.y>24),'one winger provides board outlet');
    assert.ok(wings.some(a=>y<15?a.target.y>22:a.target.y<8),'weak-side winger keeps width');
    assert.ok(wings.some(a=>H.progress(side,a.target.x)>20),'weak side stretches instead of collapsing to the puck');
    for(const a of mates)for(const b of mates)if(a!==b)assert.ok(H.distance(a.target,b.target)>4,'distinct passing lanes');
    assert.deepEqual(m.skaters(side).map(a=>[a.id,a.x,a.y]),before,'target planning never teleports players');
    for(const a of mates)assert.equal(H.netObstacle(a,a.target,.34),null,'initial support paths do not cross the goal cage');
  }
});
test('safe backward outlet competes with forward passes, but pressure closes that outlet',()=>{
  const {m,c,point}=setup(),back=m.skaters(0).find(a=>a.role==='RD');Object.assign(back,point(5,11));
  const open=m.passingOptions(c).find(row=>row.b===back).score;
  Object.assign(m.skaters(1)[0],point(5,11.5));
  const covered=m.passingOptions(c).find(row=>row.b===back).score;
  assert.ok(open>covered+.2,'receiver pressure removes safe-release bonus and lowers pass value');
});
test('first-pass evaluation does not select a route through either net',()=>{
  for(const side of [0,1]){
    const {m,c,point}=setup(side),back=m.skaters(side).find(a=>a.role==='RD');
    Object.assign(c,point(2.7,12));m.puck={x:c.x,y:c.y};Object.assign(back,point(2.7,18));
    assert.ok(H.netObstacle(m.puck,back,.04));assert.ok(!m.passingOptions(c).some(row=>row.b===back));
    Object.assign(back,point(6,11));assert.ok(m.passingOptions(c).some(row=>row.b===back),'legal release around cage remains available');
  }
});
test('deep breakout preserves counterattack risk/reward and excludes special teams',()=>{
  const {m}=setup();m.targets();const wing=m.skaters(0).find(a=>a.duty.includes('sträcker'));
  const cautious=H.progress(0,wing.target.x);m.teams[0].attackStyle='counter';m.targets();
  assert.ok(H.progress(0,wing.target.x)>cautious+4,'counterattack stretches farther but does not force a pass');
  m.hasPowerPlay=()=>true;m.targets();assert.ok(!m.skaters(0).some(a=>a.duty.includes('lågt backunderstöd')),'PP keeps existing formation logic');
});
test('support rereads local pressure after player read latency without a cross-rink target flip',()=>{
  const {m,c}=setup(),a=m.skaters(0).find(a=>a.role==='C'),anchor={x:13,y:12};
  const first={...m.breakoutSupportTarget(a,c,anchor)},until=a.supportPlan.until;
  Object.assign(m.skaters(1)[0],first);
  assert.deepEqual(m.breakoutSupportTarget(a,c,anchor),first,'no perfect instantaneous read');
  m.time=until+.01;const next=m.breakoutSupportTarget(a,c,anchor);
  assert.notDeepEqual(next,first,'receiver adjusts to newly closed space');
  assert.ok(H.distance(next,anchor)<=2.01,'adjustment retains role and is locally reachable');
});
test('career save preserves the breakout read and resumes the same decisions',()=>{
  const {boot}=require('./scripts/career-test-fixture.cjs'),app=boot();
  app.run("startCareerWithClub('HV71');state.calendar.date=calendarTarget();startMatch();pauseMatch();globalThis.e=studioEngine();e.stoppage=0;e.phase='breakout';globalThis.a=e.skaters(0).find(a=>a.role==='LD');for(const p of e.skaters(0)){const q={LD:[9,6],RD:[10,12],C:[13,15],LW:[17,4],RW:[22,25]}[p.role];Object.assign(p,{x:q[0],y:q[1],vx:0,vy:0});}e.owner=0;e.carrier=a.id;e.puck={x:a.x,y:a.y};e.targets();save();validateSaveText(localStorage.getItem('hockey_manager_alpha02'));");
  assert.ok(app.run('e.skaters(0).filter(a=>a.supportPlan?.breakout).length===4'));
  const loaded=boot(app.storage.value),steps="globalThis.e=studioEngine();for(let i=0;i<30;i++)e.step();JSON.stringify([e.rng,e.time,e.puck,e.carrier,e.score,e.actors.map(a=>[a.id,a.x,a.y,a.supportPlan])])";
  assert.equal(loaded.run(steps),app.run(steps));
  assert.throws(()=>app.run("globalThis.bad=JSON.parse(localStorage.getItem('hockey_manager_alpha02'));bad.live.broadcast.actors.find(a=>a.supportPlan?.breakout).supportPlan.anchor.x=-1;validateSaveText(JSON.stringify(bad));"));
});
