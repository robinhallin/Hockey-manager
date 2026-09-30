'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ctx=vm.createContext({});for(const f of ['match-broadcast-motion.js','match-3d.js'])vm.runInContext(fs.readFileSync(f,'utf8'),ctx);
const R=vm.runInContext('Match3D',ctx),recorded=require('./test-fixtures/shot-followthrough.json');
const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
function checkGrip(p){
 assert.ok(Math.abs(distance(p.heel,p.shaftTop)-1.38)<1e-6);
 for(const a of p.arms){
  assert.ok(Math.abs(distance(a.shoulder,a.elbow)-.4)<1e-6);
  assert.ok(Math.abs(distance(a.elbow,a.hand)-.42)<1e-6);
  assert.ok(Math.abs(distance(p.heel,a.hand)+distance(a.hand,p.shaftTop)-1.38)<1e-6);
 }
}
test('the recorded wrist shot keeps hands and elbows below the head without changing the blade path',()=>{
 const {frame,expectedBlade}=recorded,saved=JSON.stringify(frame),p=R.pose(frame,frame.actors[0]),head=p.torsoPoint(.02,.47,0)[1];
 assert.ok(Math.max(...p.arms.map(a=>a.hand[1]))<head-.2,'the upper glove must not finish above the helmet');
 assert.ok(Math.max(...p.arms.map(a=>a.elbow[1]))<head-.2,'the elbow stays below the head too');
 assert.ok(distance(p.arms[0].hand,p.arms[1].hand)>=.24,'hands retain a two-handed grip');
 assert.ok(Math.max(...p.arms.map(a=>distance(p.heel,a.hand)))>=1.1,'the top hand cannot slip halfway down the shaft');
 assert.ok(distance(p.blade,expectedBlade)<1e-9);checkGrip(p);
 assert.equal(JSON.stringify(frame),saved);
});
test('both shooting hands retain reachable grips when a turning body limits the follow-through',()=>{
 for(const shoots of ['L','R'])for(const style of ['wrist','slap','one-timer','pass'])for(const heading of [0,.8,2.8,-2.8]){
  const a={id:'s',role:'C',side:0,shoots,x:25,y:15,vx:2,vy:0,skateState:{heading},motion:{heading,upperHeading:heading,drive:.2,phase:.3},
   action:{kind:style==='pass'?'pass':'shot',style,at:10,origin:{x:25.6,y:15.2,z:0},target:{x:40,y:18}}};
  for(const age of [0,.01,.075,.15,.3,.5,.719,.72]){
   const frame={time:10+age,wall:10+age,puck:{x:30,y:16},carrier:null,actors:[a]},p=R.pose(frame,a);
   checkGrip(p);assert.ok(p.arms.flatMap(a=>[...a.hand,...a.elbow]).every(Number.isFinite));
  }
 }
});
test('grip correction is continuous at full tilt and recovery and can seek exactly',()=>{
 const {frame}=recorded,a=frame.actors[0],at=age=>({...frame,wall:a.action.at+age}),original=JSON.stringify([frame,a]);
 for(const age of [.075,.72*.7,.72]){
  const before=R.pose(at(age-1e-6),a),after=R.pose(at(age+1e-6),a);
  for(let i=0;i<2;i++)assert.ok(distance(before.arms[i].hand,after.arms[i].hand)<.002);
 }
 const paused=JSON.stringify(R.pose(frame,a));
 for(const age of [.3,.7,0,.5,.1])R.pose(at(age),a);
 assert.equal(JSON.stringify(R.pose(JSON.parse(JSON.stringify(frame)),JSON.parse(JSON.stringify(a)))),paused);
 assert.equal(JSON.stringify([frame,a]),original);
});
