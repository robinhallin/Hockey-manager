'use strict';
const assert=require('node:assert/strict'),test=require('node:test'),fs=require('node:fs'),vm=require('node:vm');
const context=vm.createContext({});vm.runInContext(fs.readFileSync('match-3d.js','utf8'),context);const renderer=vm.runInContext('Match3D',context);
test('3D interpolation follows actual player IDs and leaves snapshots unchanged',()=>{
 const previous={time:10,puck:{x:5,y:7},actors:[{id:'a',x:4,y:6},{id:'b',x:20,y:21}]};
 const frame={time:11,carrier:'b',puck:{x:9,y:11},actors:[{id:'b',x:22,y:23},{id:'c',x:40,y:15},{id:'a',x:8,y:10}]};
 const original=JSON.stringify([frame,previous]),result=renderer.sample(frame,previous,.5);
 assert.equal(JSON.stringify([frame,previous]),original);assert.equal(result.actors[0].x,21);assert.equal(result.actors[1].x,40);assert.equal(result.actors[2].x,6);assert.equal(result.puck.x,7);assert.equal(result.carrier,'b');assert.equal(result.time,10.5);
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
