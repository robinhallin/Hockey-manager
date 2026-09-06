const assert=require('node:assert/strict');
const fs=require('node:fs');
const {Match,STEP,distance,progress}=require('./match-simulation');
const rosters=require('./match-lab-rosters');
let checks=0;
function test(name,fn){fn();checks++;console.log('OK '+name);}
function finish(m){let ticks=0;while(!m.finished&&ticks++<20000)m.step();assert.ok(m.finished,'period must finish');return m;}

test('A whole period preserves player counts, puck ownership, bounded motion and the event ledger',()=>{
  for(const scenario of ['period','attack','rush','pp','pk','change']){
    const m=new Match(rosters,{scenario});let previous=m.actors.map(a=>({...a})),lastPhase=m.phase;
    while(!m.finished){
      const beforePenalty=Boolean(m.penalty),wasStopped=m.stoppage>0,oldEvents=m.events.length;m.step();
      assert.equal(new Set(m.actors.map(a=>a.id)).size,m.actors.length);
      for(const side of [0,1]){
        assert.equal(m.skaters(side).length,m.penalty?.side===side?4:5);
        assert.equal(m.actors.filter(a=>a.side===side&&a.role==='G').length,1);
      }
      if(m.carrier){const carrier=m.actor(m.carrier);assert.ok(carrier,'the puck carrier cannot disappear on a change');assert.equal(carrier.side,m.owner);assert.ok(distance(carrier,m.puck)<.001);}
      assert.ok(Number.isFinite(m.puck.x)&&Number.isFinite(m.puck.y));
      for(const a of m.actors){
        assert.ok(Number.isFinite(a.x)&&Number.isFinite(a.y)&&a.x>=1&&a.x<=59&&a.y>=.6&&a.y<=29.4);
        const before=previous.find(p=>p.id===a.id);
        if(before&&!wasStopped&&m.stoppage<=0&&beforePenalty===Boolean(m.penalty))assert.ok(distance(a,before)<.72,'normal movement cannot teleport: '+a.player.name);
        if(!before&&!wasStopped&&m.stoppage<=0&&beforePenalty===Boolean(m.penalty))assert.ok(a.y<1.5,'incoming replacement enters at the actual bench gate');
      }
      if(m.events.slice(oldEvents).some(e=>e.type==='shot')&&m.penalty?.side!==m.owner&&m.penalty){
        const c=m.flight.shot.context,open=c.d<11&&c.angle<.6&&c.pressure<.45;
        assert.ok(c.oneTimer||c.rebound||open||m.attackPasses>=2&&m.setupTime>1.2,'PP establishes its shape unless a genuine immediate chance is available');
      }
      previous=m.actors.map(a=>({...a}));lastPhase=m.phase;
    }
    assert.equal(m.time,1200);
    for(const side of [0,1]){
      const shots=m.shots.filter(s=>s.side===side);
      assert.equal(m.score[side],shots.filter(s=>s.outcome==='goal').length);
      assert.equal(m.stats[side].attempts,shots.length);
      assert.equal(m.stats[side].shots,shots.filter(s=>['goal','save'].includes(s.outcome)).length);
      assert.equal(m.stats[1-side].saves,shots.filter(s=>s.outcome==='save').length);
    }
    assert.ok(m.events.some(e=>e.type==='change'),scenario+' exercises real changes');
    assert.ok(m.latestReplay.frames.length>2);
    assert.ok(m.latestReplay.frames.at(-1).time>=m.latestReplay.shot.time);
  }
});

test('The same fixed-step inputs produce the same match independent of rendering and snapshots',()=>{
  const a=new Match(rosters,{seed:901,duration:240}),b=new Match(rosters,{seed:901,duration:240});
  while(!a.finished){a.step();a.snapshot();a.snapshot();b.step();}
  assert.deepEqual(a.events,b.events);assert.deepEqual(a.score,b.score);assert.deepEqual(a.shots,b.shots);
  const at=a.time,rng=a.rng;for(let i=0;i<100;i++)a.snapshot();assert.equal(a.time,at);assert.equal(a.rng,rng);
});

test('An established attack starts with actual defensive coverage; a counter has exactly two advanced forwards',()=>{
  const a=new Match(rosters,{scenario:'attack'});
  assert.equal(a.skaters(1).length,5);
  assert.ok(a.skaters(1).every(d=>d.x>40));
  assert.ok(a.skaters(1).filter(d=>d.role.endsWith('D')).every(d=>d.x>50));
  const b=new Match(rosters,{scenario:'rush'});
  assert.equal(b.skaters(0).filter(p=>p.x>30).length,2);
  assert.equal(b.skaters(1).filter(p=>p.x>30).length,1);
});

test('Losing possession cancels the outgoing change; replacing a skater does not vacate the whole formation',()=>{
  const m=new Match(rosters,{scenario:'change'});m.teams[0].requested=true;
  // Move the nearest marker just far enough away to make this a genuinely safe change.
  const carrier=m.actor(m.carrier);for(const a of m.skaters(1))if(distance(a,carrier)<3){a.y=15;a.x=54;}
  m.updateChanges(STEP);assert.ok(m.teams[0].change);
  const outgoing=m.actor(m.teams[0].change.id),others=m.skaters(0).filter(a=>a!==outgoing).map(a=>a.id);
  assert.equal(outgoing.status,'leaving');assert.equal(m.skaters(0).length,5);
  m.takePossession(m.skaters(1)[0],{turnover:true});m.updateChanges(STEP);
  assert.equal(outgoing.status,'playing');assert.equal(m.teams[0].change,null);
  assert.ok(others.every(id=>m.actor(id)));assert.equal(m.skaters(0).length,5);
});

test('The boxplay team clears a controlled puck and the fifth player returns from the penalty gate',()=>{
  const m=new Match(rosters,{scenario:'pk'}),pk=m.skaters(0)[0];pk.x=12;pk.y=10;m.takePossession(pk);m.decide();
  assert.equal(m.flight.kind,'clear');assert.equal(m.carrier,null);
  assert.equal(m.stats[0].clears,progress(0,m.flight.end.x)>40?1:0,'only a clearance that leaves the zone counts as successful');
  m.penalty.remaining=.05;m.step();assert.equal(m.penalty,null);assert.equal(m.skaters(0).length,5);
  const returning=m.skaters(0).find(a=>a.status==='returning');assert.ok(returning);assert.ok(returning.y>28);
});

test('Attributes, passing lanes and PP/PK instructions change hockey decisions and shape',()=>{
  const m=new Match(rosters,{scenario:'pp'}),a=m.skaters(0)[0],b=m.skaters(0)[1];
  a.x=43;a.y=6;b.x=48;b.y=24;
  for(const d of m.skaters(1)){d.x=55;d.y=15;}
  const open=m.passChance(a,b),marker=m.skaters(1)[0];marker.x=45.5;marker.y=15;
  assert.ok(m.passChance(a,b)<open);
  a.player.attributes.passing=1;const low=m.passChance(a,b);a.player.attributes.passing=20;assert.ok(m.passChance(a,b)>low);
  const shooter=m.skaters(0).find(p=>p.role==='C');shooter.x=51;shooter.y=15;shooter.player.attributes.shooting=1;const weak=m.shotQuality(shooter);shooter.player.attributes.shooting=20;assert.ok(m.shotQuality(shooter)>weak);
  m.targets();const before=m.skaters(0).map(a=>({...a.target}));m.setTactics(0,{pp:'umbrella'});m.targets();assert.notDeepEqual(m.skaters(0).map(a=>a.target),before);
  const defense=m.skaters(1).map(a=>({...a.target}));m.setTactics(1,{pk:'diamond'});m.targets();assert.notDeepEqual(m.skaters(1).map(a=>a.target),defense);
  const direct=new Match(rosters,{seed:911,duration:240}),control=new Match(rosters,{seed:911,duration:240});
  direct.setTactics(0,{mentality:'direct'});control.setTactics(0,{mentality:'control'});
  finish(direct);finish(control);assert.notDeepEqual(direct.shots,control.shots);
});

test('Replay frames are immutable, data snapshots are untouched, and the prototype has no career writes',()=>{
  const original=JSON.stringify(rosters),m=new Match(rosters,{scenario:'pp',duration:120});
  while(!m.latestReplay)m.step();const replay=m.latestReplay,originalReplay=JSON.stringify(replay);for(let i=0;i<50;i++)m.step();
  assert.equal(JSON.stringify(replay),originalReplay);assert.equal(JSON.stringify(rosters),original);
  for(const file of ['match-simulation.js','match-lab.js'])assert.doesNotMatch(fs.readFileSync(file,'utf8'),/localStorage|sessionStorage|indexedDB/);
  for(const [,file] of fs.readFileSync('match-lab.html','utf8').matchAll(/(?:src|href)="([^"?]+)(?:\?[^\"]*)?"/g))assert.ok(fs.existsSync(file),file+' must exist');
});

test('A blocked passing lane gives possession to its actual interceptor, and zone entry respects offside',()=>{
  const m=new Match(rosters,{scenario:'attack'}),a=m.skaters(0)[0],b=m.skaters(0)[1],defender=m.skaters(1)[0];
  for(const d of m.skaters(1)){d.x=56;d.y=28;}
  a.x=43;a.y=5;b.x=50;b.y=22;b.vx=0;b.vy=0;defender.x=46.5;defender.y=13.5;
  m.carrier=a.id;m.puck={x:a.x,y:a.y};m.random=()=>.999;m.pass(a,b);
  assert.equal(m.flight.kind,'intercept');assert.equal(m.flight.to,defender.id);
  m.resolveFlight(5);assert.equal(m.carrier,defender.id);assert.equal(m.owner,1);
  const offside=new Match(rosters,{scenario:'rush'}),carrier=offside.actor(offside.carrier),early=offside.skaters(0).find(p=>p.id!==carrier.id);
  carrier.x=39.98;carrier.vx=4;carrier.y=7;early.x=45;early.y=25;offside.puck={x:carrier.x,y:carrier.y};
  offside.step();assert.ok(offside.events.some(e=>e.type==='offside'));assert.equal(offside.carrier,null);
});
console.log(checks+' match studio checks passed');
