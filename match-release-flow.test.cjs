'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ctx=vm.createContext({});for(const file of ['match-broadcast-motion.js','match-3d.js'])vm.runInContext(fs.readFileSync(file,'utf8'),ctx);
const R=vm.runInContext('Match3D',ctx),distance=(a,b)=>Math.hypot(...a.map((n,i)=>n-b[i]));
const near=(a,b,tolerance=1e-6)=>assert.ok(distance(a,b)<tolerance,`${a} differs from ${b}`);
function fixture(style='wrist',shoots='R',angle=0){
 const hand=shoots==='R'?1:-1,world=(x,y)=>({x:25+Math.cos(angle)*x-Math.sin(angle)*y,y:15+Math.sin(angle)*x+Math.cos(angle)*y});
 const origin={...world(.65,.2*hand),z:0};
 const actor={id:'a',role:'C',side:0,shoots,x:25,y:15,vx:0,vy:0,skateState:{heading:angle},motion:{heading:angle,upperHeading:angle,phase:.3,drive:0},
  action:{kind:style==='pass'?'pass':'shot',style,at:10,origin,target:world(12,0)}};
 return {actor,frame:{time:10,wall:10,carrier:null,puck:origin,actors:[actor]}};
}
test('the hip leads the shoulder turn through either-handed shots and passes',()=>{
 for(const style of ['wrist','slap','one-timer','pass'])for(const shoots of ['L','R']){
  const {actor,frame}=fixture(style,shoots),duration=style==='pass'?.52:.72,rows=[];
  for(let i=0;i<=100;i++){
   const p=R.pose({...frame,wall:10+duration*i/100},actor),axis=p.pelvisPoint(1,0,0).map((n,k)=>n-p.pelvis[k]);
   rows.push({hip:Math.abs(Math.atan2(axis[2],axis[0])),chest:Math.abs(p.torsoAngle)});
  }
  const peak=key=>rows.findIndex(r=>r[key]===Math.max(...rows.map(r=>r[key])));
  assert.ok(Math.max(...rows.map(r=>r.hip))>.04,'the pelvis participates in the release');
  assert.ok(peak('hip')<peak('chest'),'the pelvis cannot wait for the shoulders to finish');
 }
});
test('windup, release and recovery meet continuously at contact without moving the puck or feet',()=>{
 for(const style of ['wrist','slap'])for(const shoots of ['L','R'])for(const angle of [0,Math.PI,.8])for(const controlled of [false,true]){
  const {actor,frame}=fixture(style,shoots,angle);
  actor.action.target={x:25+Math.cos(angle+1.3)*12,y:15+Math.sin(angle+1.3)*12};
  if(controlled)actor.stickControl={lateral:shoots==='R'?.2:-.2,heading:angle};
  const windup={...actor,action:undefined,windup:{at:9.6,duration:.4,style}};
  const loaded=R.pose({...frame,wall:9.8,carrier:actor.id},windup),follow=R.pose({...frame,wall:10.2},actor),hand=shoots==='R'?1:-1;
  assert.ok((loaded.torsoAngle-angle)*hand>0&&(follow.torsoAngle-angle)*hand<0,'the shoulders unwind through contact instead of winding twice in the same direction');
  const before=R.pose({...frame,wall:10-1e-6,carrier:actor.id},windup),contact=R.pose(frame,actor);
  for(const key of ['pelvis','torso','blade','shaftTop'])near(before[key],contact[key],.0001);
  near(contact.blade,[frame.puck.x,.08,frame.puck.y]);
  const neutral=R.pose(frame,{...actor,action:undefined}),finished=R.pose({...frame,wall:10.72},actor);
  for(const key of ['pelvis','torso','blade','shaftTop'])near(neutral[key],finished[key]);
  for(let t=0;t<=.72;t+=.012){
   const p=R.pose({...frame,wall:10+t},actor);
   for(let i=0;i<2;i++){near(p.feet[i],neutral.feet[i]);assert.equal(p.footAngles[i],neutral.footAngles[i]);}
  }
 }
});
test('both hands keep a fixed-length shaft and limbs retain their lengths through the full action',()=>{
 for(const style of ['wrist','slap','one-timer','pass'])for(const shoots of ['L','R'])for(const angle of [0,Math.PI,.8]){
  const {actor,frame}=fixture(style,shoots,angle),saved=JSON.stringify([frame,actor]);
  for(let t=-.4;t<=.8;t+=1/60){
   const a=t<0?{...actor,action:undefined,windup:{at:9.6,duration:.4,style}}:actor;
   const f={...frame,wall:10+t,carrier:t<0?actor.id:null},p=R.pose(f,a);
   assert.ok(Math.abs(distance(p.heel,p.shaftTop)-1.38)<1e-6);
   for(const arm of p.arms){
    assert.ok(Math.abs(distance(arm.shoulder,arm.elbow)-.40)<1e-6);
    assert.ok(Math.abs(distance(arm.elbow,arm.hand)-.42)<1e-6);
    assert.ok(Math.abs(distance(p.heel,arm.hand)+distance(arm.hand,p.shaftTop)-1.38)<1e-6);
   }
   for(const leg of p.legs){assert.ok(Math.abs(distance(leg.hip,leg.knee)-.45)<1e-6);assert.ok(Math.abs(distance(leg.knee,leg.ankle)-.46)<1e-6);}
   assert.equal(JSON.stringify(R.pose(f,a)),JSON.stringify(p),'repeated paused rendering must return the exact pose');
  }
  assert.equal(JSON.stringify([frame,actor]),saved);
 }
});
test('seeking and save/reload reproduce the same release without an advancing animation clock',()=>{
 const {actor,frame}=fixture('slap','L',1.2),at=t=>({...frame,wall:10+t});
 const first=JSON.stringify(R.pose(at(.18),actor));
 for(const t of [.4,.7,0,.3,.18])R.pose(at(t),actor);
 assert.equal(JSON.stringify(R.pose(at(.18),actor)),first);
 const restored=JSON.parse(JSON.stringify({actor,frame:at(.18)}));
 assert.equal(JSON.stringify(R.pose(restored.frame,restored.actor)),first);
 const baseline=R.pose(frame,{...actor,action:undefined}),future=R.pose({...frame,wall:9},actor);
 near(baseline.pelvis,future.pelvis);near(baseline.torso,future.torso);
});
