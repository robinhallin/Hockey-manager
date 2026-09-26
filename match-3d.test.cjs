'use strict';
const assert=require('node:assert/strict'),test=require('node:test'),fs=require('node:fs'),vm=require('node:vm');
const context=vm.createContext({});vm.runInContext(fs.readFileSync('match-3d.js','utf8'),context);const renderer=vm.runInContext('Match3D',context);
test('3D interpolation follows actual player IDs and leaves snapshots unchanged',()=>{
 const previous={time:10,puck:{x:5,y:7},actors:[{id:'a',x:4,y:6},{id:'b',x:20,y:21}]};
 const frame={time:10.2,carrier:'b',puck:{x:9,y:11},actors:[{id:'b',x:22,y:23},{id:'c',x:40,y:15},{id:'a',x:6,y:8}]};
 const original=JSON.stringify([frame,previous]),result=renderer.sample(frame,previous,.5);
 assert.equal(JSON.stringify([frame,previous]),original);assert.equal(result.actors[0].x,21);assert.equal(result.actors[1].x,40);assert.equal(result.actors[2].x,5);assert.equal(result.puck.x,7);assert.equal(result.carrier,'b');assert.equal(result.time,10.1);
});
test('both perspective cameras keep the playable rink inside common desktop surfaces',()=>{
 for(const ratio of [1.3,1.8,2.4])for(const mode of ['tv','overhead'])for(const p of [[3,0,4],[57,0,4],[3,0,26],[57,0,26],[30,0,0],[30,0,30]]){
  const s=renderer.project(p,renderer.camera(ratio,mode));assert.ok(s.x>=0&&s.x<=1&&s.y>=0&&s.y<=1,`${mode} ${ratio} ${p}: ${JSON.stringify(s)}`);
 }
});
test('selecting camera and presentation preserves match engine and career save',()=>{
 const {boot}=require('./scripts/career-test-fixture.cjs'),app=boot();
 app.run("startCareerWithClub('HV71');state.calendar.date=calendarTarget();startMatch();state.page='match';for(let i=0;i<40;i++)studioStep();pauseMatch();");
 const before=app.run('JSON.stringify(state.live)');
 app.run("studioSetVisual('3d');studioSetCamera('overhead');studioSetVisual('2d');");
 assert.equal(app.run('JSON.stringify(state.live)'),before);
 assert.ok(app.run("studioView().includes('3D · test')"));
});

test('skating uses real travelled distance; paused/stationary poses do not pedal',()=>{
 const actor={id:'s',role:'C',side:0,x:30,y:15,vx:3,vy:0,travelled:1};
 const frame={time:10,puck:{x:30,y:15},carrier:'s',actors:[actor]};
 const a=renderer.pose(frame,actor),b=renderer.pose({...frame,time:999},actor);
 assert.equal(JSON.stringify(a.feet),JSON.stringify(b.feet));assert.equal(a.blade[0],30);assert.equal(a.blade[2],15);
 assert.notEqual(JSON.stringify(a.feet),JSON.stringify(renderer.pose(frame,{...actor,travelled:1.8}).feet));
 const stopped=renderer.pose(frame,{...actor,vx:0,vy:0});assert.equal(stopped.stride,0);
});
test('keeper tracks actual puck and blocks only an approaching opposing shot',()=>{
 const a={id:'g',role:'G',side:1,x:54.5,y:15,vx:0,vy:0};
 const frame={time:10,puck:{x:51,y:13},carrier:null,actors:[a],flight:{kind:'shot',side:0,from:'s',start:{x:43,y:13},end:{x:56.5,y:15},elapsed:.3,duration:.5}};
 const p=renderer.pose(frame,a);assert.equal(p.angle,Math.atan2(-2,-3.5));assert.ok(p.drop>0);
 assert.equal(renderer.pose({...frame,flight:{...frame.flight,kind:'pass'}},a).drop,0);
 assert.equal(renderer.pose({...frame,flight:{...frame.flight,side:1}},a).drop,0);
 assert.equal(renderer.pose({...frame,puck:{x:30,y:15}},a).drop,0);
});
test('release follows observed passer/shooter identity and does not animate a teammate',()=>{
 const a={id:'s',role:'C',side:0,x:30,y:15,vx:0,vy:0};
 const frame={time:10,puck:{x:35,y:15},carrier:null,flight:{kind:'shot',from:'s',side:0,start:{x:30,y:15},end:{x:56.5,y:15},elapsed:.1,duration:1}};
 assert.ok(renderer.pose(frame,a).release>0);assert.equal(renderer.pose(frame,{...a,id:'other'}).release,0);
 assert.equal(renderer.pose({...frame,flight:{...frame.flight,elapsed:.8}},a).release,0);
});
test('faceoff resets and skipped highlights do not interpolate across the rink',()=>{
 const old={time:10,phase:'stoppage',puck:{x:56,y:15},actors:[{id:'a',x:56,y:15}]};
 const next={time:10,phase:'faceoff',puck:{x:30,y:15},actors:[{id:'a',x:30,y:15}]};
 assert.equal(renderer.sample(next,old,.1).puck.x,30);assert.equal(renderer.sample(next,old,.1).actors[0].x,30);
 for(const x of [0,30,60])for(const y of [0,15,30])for(const ratio of [1.3,2.4,3.2]){const p=renderer.project([x,0,y],renderer.camera(ratio,'follow',{x,y}));assert.ok(p.x>0&&p.x<1&&p.y>0&&p.y<1);}
});
test('live and replay snapshots expose identical motion facts without hidden shot rolls',()=>{
 const {Match}=require('./match-simulation'),rosters=require('./match-lab-rosters');const m=new Match(rosters,{scenario:'attack'});
 for(let i=0;i<40;i++)m.step();const a=m.actors.find(a=>a.side===0&&a.role!=='G');
 m.shoot(a);const frame=m.presentationFrame();assert.ok(frame.flight);assert.equal(frame.flight.from,a.id);assert.equal(frame.flight.elapsed,0);
 assert.equal('shot' in frame.flight,false);assert.equal('outcome' in frame.flight,false);assert.equal('finishRoll' in frame.flight,false);
 m.tick=2;m.capture();assert.deepEqual(m.snapshot(),frame);assert.ok(m.actors.some(a=>a.travelled>0));
 const saved=JSON.stringify(m),copy=Object.assign(Object.create(Match.prototype),JSON.parse(saved));assert.deepEqual(copy.presentationFrame(),frame);
});
