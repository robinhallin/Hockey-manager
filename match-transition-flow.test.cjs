'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const H=require('./scripts/current-match-engine.cjs'),rosters=require('./match-lab-rosters');
function setup(side=0,p=34){
 const m=new H.Match(rosters,{seed:4504}),point=(x,y)=>({x:H.progress(side,x),y});
 const attack={LW:[p,7],C:[p-3,15],RW:[p-1,25],LD:[p-9,8],RD:[p-10,23]};
 const defense={LW:[p-8,6],C:[p-7,15],RW:[p-8,24],LD:[p+4,11],RD:[p+4,20]};
 for(const a of m.skaters(side))Object.assign(a,point(...attack[a.role]),{vx:(side? -1:1)*3,vy:0});
 for(const a of m.skaters(1-side))Object.assign(a,point(...defense[a.role]),{vx:0,vy:0});
 const c=m.skaters(side).find(a=>a.role==='LW');m.owner=side;m.carrier=c.id;m.puck={x:c.x,y:c.y};m.stoppage=0;m.phase='counter';
 return {m,c,point};
}
test('rush defence separates the puck lane and weak-side runner in either direction',()=>{
 for(const side of [0,1]){
  const {m,c}=setup(side),before=JSON.stringify([m.rng,m.actors.map(a=>[a.id,a.x,a.y])]);m.defenseTargets(1-side);
  const backs=m.skaters(1-side).filter(a=>a.role.endsWith('D')),strong=backs.find(a=>a.markedThreat===c.id),weak=backs.find(a=>a!==strong);
  const runner=m.skaters(side).find(a=>a.role==='RW');
  assert.equal(weak.markedThreat,runner.id);assert.ok(weak.target.y-strong.target.y>9,'backs do not collapse onto the puck side');
  for(const b of backs)assert.ok(H.progress(side,b.target.x)>H.progress(side,c.x),'both backs keep their goal side');
  assert.equal(JSON.stringify([m.rng,m.actors.map(a=>[a.id,a.x,a.y])]),before,'planning neither draws RNG nor relocates players');
 }
});
test('one backchecker provides inside pressure while others cover distinct late threats',()=>{
 for(const side of [0,1]){
  const {m,c}=setup(side);m.defenseTargets(1-side);
  const forwards=m.skaters(1-side).filter(a=>!a.role.endsWith('D')),chaser=forwards.find(a=>a.duty.includes('press bakifrån'));
  assert.ok(chaser);assert.equal(chaser.markedThreat,c.id);assert.ok(chaser.target.y>c.y&&chaser.target.y<15,'return path closes from the inside');
  const guards=forwards.filter(a=>a!==chaser),backMarks=m.skaters(1-side).filter(a=>a.role.endsWith('D')).map(a=>a.markedThreat);
  assert.equal(new Set(guards.map(a=>a.markedThreat)).size,guards.length);
  for(const a of guards){const threat=m.actor(a.markedThreat);assert.ok(threat);assert.ok(!backMarks.includes(threat.id));assert.ok(H.progress(side,a.target.x)>H.progress(side,threat.x));}
  const held=m.teams[1-side].backcheckLead;chaser.x+=side? .15:-.15;m.defenseTargets(1-side);assert.equal(m.teams[1-side].backcheckLead,held,'small geometry changes do not swap the chaser');
 }
});
test('transition support retains separate jobs through read latency and rereads a substantially closer outlet',()=>{
 const {m,c,point}=setup(0,26);Object.assign(c,point(26,15));m.puck={x:c.x,y:c.y};
 const forwards=m.skaters(0).filter(a=>a!==c&&!a.role.endsWith('D'));
 Object.assign(forwards[0],point(24,9));Object.assign(forwards[1],point(24.1,21));
 m.collectiveTargets();const first={...m.teams[0].transitionSupport,players:[...m.teams[0].transitionSupport.players]};
 forwards[1].x+=.3;m.time=first.until-.01;m.collectiveTargets();assert.deepEqual(m.teams[0].transitionSupport.players,first.players);
 const back=m.skaters(0).find(a=>a.role==='RD');Object.assign(back,point(25,15));m.time=first.until+.01;m.collectiveTargets();
 assert.ok(m.teams[0].transitionSupport.players.includes(back.id));assert.equal(new Set(m.teams[0].transitionSupport.players).size,2);
 const ids=[...m.teams[0].transitionSupport.players];m.actor(ids[0]).status='leaving';m.collectiveTargets();assert.ok(!m.teams[0].transitionSupport.players.includes(ids[0]),'leaving players are replaced immediately');
});
test('a moving forward continues after a real pass, but offside, pressure and special teams take priority',()=>{
 for(const side of [0,1]){
  const {m,c,point}=setup(side,27),passer=m.skaters(side).find(a=>a.role==='C');Object.assign(passer,point(24,15));
  for(const a of m.skaters(1-side))Object.assign(a,point(45,3));
  m.wall=10;passer.presentationAction={kind:'pass',at:9.6};m.collectiveTargets();
  assert.match(passer.duty,/Fortsätter åkningen/);assert.ok(H.progress(side,passer.target.x)>H.progress(side,passer.x));
  Object.assign(passer,point(37,15));m.collectiveTargets();assert.ok(H.progress(side,passer.target.x)<=37.5,'pass-and-go never cuts the blue-line brake');
  Object.assign(m.skaters(side).find(a=>a.role==='RW'),point(42,23));m.collectiveTargets();assert.doesNotMatch(passer.duty,/Fortsätter åkningen/);
  m.hasPowerPlay=()=>true;m.collectiveTargets();assert.doesNotMatch(passer.duty,/Fortsätter åkningen/);
  m.hasPowerPlay=()=>false;Object.assign(m.skaters(side).find(a=>a.role==='RW'),point(33,23));Object.assign(m.skaters(1-side)[0],{x:passer.x,y:passer.y+.1});m.collectiveTargets();assert.doesNotMatch(passer.duty,/Fortsätter åkningen/);
 }
});
test('saved support assignments resume the same engine decisions and reject malformed plans',()=>{
 const {boot}=require('./scripts/career-test-fixture.cjs'),app=boot();
 app.run("startCareerWithClub('HV71');state.calendar.date=calendarTarget();startMatch();pauseMatch();globalThis.e=studioEngine();e.stoppage=0;e.phase='entry';globalThis.c=e.skaters(0).find(a=>a.role==='C');e.owner=0;e.carrier=c.id;c.x=26;c.y=15;e.puck={x:26,y:15};e.targets();save();validateSaveText(localStorage.getItem('hockey_manager_alpha02'));");
 assert.ok(app.run('e.teams[0].transitionSupport.players.length===2'));
 const loaded=boot(app.storage.value),steps="globalThis.e=studioEngine();for(let i=0;i<40;i++)e.step();JSON.stringify([e.rng,e.time,e.puck,e.carrier,e.score,e.teams.map(t=>[t.transitionSupport,t.backcheckLead]),e.actors.map(a=>[a.id,a.x,a.y])])";
 assert.equal(loaded.run(steps),app.run(steps));
 assert.throws(()=>app.run("globalThis.bad=JSON.parse(localStorage.getItem('hockey_manager_alpha02'));bad.live.broadcast.teams[0].transitionSupport.players[1]=bad.live.broadcast.teams[0].transitionSupport.players[0];validateSaveText(JSON.stringify(bad));"));
});
