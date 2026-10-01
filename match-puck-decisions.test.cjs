'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const H=require('./scripts/current-match-engine.cjs'),rosters=require('./match-lab-rosters');
function setup(side=0){
  const m=new H.Match(rosters,{seed:4604});m.time=m.wall=20;m.stoppage=-.1;m.owner=side;
  for(const a of m.actors)if(a.role!=='G')Object.assign(a,{x:30,y:15,vx:0,vy:0});
  return m;
}
test('board support chooses an arriving forward without awarding a remote touch',()=>{
  for(const side of [0,1]){
    const m=setup(side),p=x=>H.progress(side,x),[a,near,arriving]=m.skaters(side).filter(a=>!a.role.endsWith('D')),d=m.skaters(1-side)[0];
    Object.assign(a,{x:p(49),y:2});Object.assign(d,{x:p(48),y:2});m.puck={x:a.x,y:2};m.carrier=a.id;
    Object.assign(near,{x:p(46.7),y:2,vx:side?4:-4});Object.assign(arriving,{x:p(46.5),y:2,vx:side?-4:4});
    assert.equal(m.startBattle(a,d),true);m.targets();
    assert.match(arriving.duty,/understöd/);assert.doesNotMatch(near.duty,/understöd/);
    assert.ok(m.skaters(side).filter(a=>a.role.endsWith('D')).every(a=>!/understöd.*närkampen/.test(a.duty)));
    m.resolveBattle(.01);assert.equal(m.carrier,null);assert.ok(!m.battle.support.includes(arriving.id));
  }
});
test('dump placement responds to motion and the real tag-up distance in both directions',()=>{
  for(const side of [0,1]){
    const m=setup(side),p=x=>H.progress(side,x),a=m.skaters(side)[0],mates=m.skaters(side).filter(b=>b!==a),opponents=m.skaters(1-side);
    Object.assign(a,{x:p(35),y:15});
    mates.forEach(b=>Object.assign(b,{x:p(39),y:15,vx:0,vy:0}));opponents.forEach(b=>Object.assign(b,{x:p(39),y:15,vx:0,vy:0}));
    mates.forEach(b=>b.vy=4);assert.equal(m.dumpTarget(a).target.y,28);
    mates.forEach(b=>b.vy=-4);assert.equal(m.dumpTarget(a).target.y,2);
    const runner=mates[0];Object.assign(runner,{x:p(58),y:28});
    assert.equal(m.dumpTarget(a).target.y,2,'an offside runner must return to the blue line before contesting the corner');
  }
});
test('a controlled, passed or cleared rebound cannot override current assignments or create a remote battle',()=>{
  const m=setup(),a=m.skaters(0)[0];Object.assign(a,{x:53,y:15});m.puck={x:53,y:15};m.rebound={side:0,time:20,spot:{...m.puck}};
  assert.equal(m.availableRebound(),true);m.carrier=a.id;a.controlledAt=20;
  assert.equal(m.availableRebound(),false);assert.equal(m.shotContext(a).rebound,true);
  m.time=21;assert.equal(m.shotContext(a).rebound,false,'carrying an old recovery does not earn a put-back bonus');
  m.carrier=null;m.flight={kind:'pass',side:0};assert.equal(m.availableRebound(),false);
  m.flight=null;m.puck={x:42,y:5};assert.equal(m.availableRebound(),false);
  m.targets();assert.ok(m.actors.every(a=>!/Jagar returen|Kraschar|Boxar ut/.test(a.duty)));
  m.takePossession(a);assert.equal(m.battle,null);assert.equal(m.carrier,a.id);
});
test('the production target chain assigns one loose rebound pursuer per side and preserves it through reload',()=>{
  for(const side of [0,1]){
    const m=setup(side),p=x=>H.progress(side,x),a=m.skaters(side).find(a=>a.role==='C');
    Object.assign(a,{x:p(53),y:15});m.carrier=null;m.flight=null;m.puck={x:p(54),y:15};m.puckVelocity={x:side?-2:2,y:1};
    m.rebound={side,time:m.time,spot:{...m.puck}};m.targets();
    for(const team of [0,1]){
      const pursuers=m.skaters(team).filter(a=>/Jagar den lösa pucken|Läser puckbanan|Attackerar den faktiska returen|Håller insidan/.test(a.duty));
      assert.equal(pursuers.length,1,'the screen and rebound layers cannot introduce another puck chaser');
    }
    const saved=Object.assign(Object.create(H.Match.prototype),JSON.parse(JSON.stringify(m)));
    saved.targets();assert.deepEqual(saved.actors.map(a=>[a.id,a.target,a.duty]),m.actors.map(a=>[a.id,a.target,a.duty]));
  }
});
