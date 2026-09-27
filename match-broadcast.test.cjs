'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
let T;test.before(async()=>{T=await import('three');});
const H=require('./scripts/current-match-engine.cjs'),rosters=require('./match-lab-rosters');
const context=vm.createContext({});
for(const file of ['match-player-asset.js','assets/models/hockey-broadcast.js','match-player-model.js','match-broadcast-motion.js','match-3d.js'])vm.runInContext(fs.readFileSync(file,'utf8'),context);
const {Model,Motion,R,asset}=vm.runInContext('({Model:HockeyPlayerModel,Motion:HockeyMotion,R:Match3D,asset:HockeyBroadcastAsset})',context);

test('detailed offline models retain the shared bind pose, normalized weights and a bounded GPU budget',()=>{
 const source=JSON.parse(fs.readFileSync('assets/models/hockey-broadcast.gltf','utf8'));
 assert.equal(JSON.stringify(source),JSON.stringify(asset));
 for(const kind of ['skater','goalie','goalieR','skaterLod','goalieLod','goalieRLod']){
  const model=Model.decode(source,kind),base=Model.model(kind.replace(/Lod$/,''));
  assert.deepEqual(model.bind,base.bind);assert.deepEqual(Array.from(model.joints),Array.from(base.joints));
  assert.ok(model.vertices>(kind.endsWith('Lod')?2000:4500)&&model.vertices<5500);assert.ok(model.indices.every(i=>i<model.vertices));
  for(const attribute of Object.values(model.attributes))assert.ok(attribute.every(Number.isFinite));
  for(let i=0;i<model.vertices;i++){
   const weights=model.attributes.WEIGHTS_0.subarray(i*4,i*4+4);
   assert.ok(Math.abs(weights.reduce((n,w)=>n+w,0)-1)<1e-6);assert.ok(weights.every(w=>w>=0&&w<=1));assert.equal(weights[2]+weights[3],0,'compact GPU palette uses two influences');
   assert.ok(model.attributes.JOINTS_0.subarray(i*4,i*4+4).every(j=>j<15));
  }
 }
});

test('Three skinning agrees with the recorded hockey skeleton during skating, releases and goalkeeper motion',()=>{
 const match=new H.Match(rosters,{seed:912,scenario:'attack'}),models=new Map();
 for(const kind of ['skater','goalie','goalieR']){
  const a=Model.decode(asset,kind),g=new T.BufferGeometry();
  for(const [name,key,size] of [['position','POSITION',3],['skinIndex','JOINTS_0',4],['skinWeight','WEIGHTS_0',4]])g.setAttribute(name,new T.BufferAttribute(a.attributes[key],size));
  const bones=Array.from({length:15},()=>new T.Bone()),skeleton=new T.Skeleton(bones,bones.map(()=>new T.Matrix4())),mesh=new T.SkinnedMesh(g,new T.MeshBasicMaterial());
  mesh.bind(skeleton,new T.Matrix4());models.set(kind,{a,skeleton,mesh});
 }
 let moving=0,release=0;
 for(let step=0;step<900;step++){
  match.step();if(step%30)continue;
  const frame=match.presentationFrame(),before=JSON.stringify(match);
  for(const actor of frame.actors){
   const pose=R.pose(frame,actor),palette=Model.palette(pose),{a,skeleton,mesh}=models.get(Model.kind(actor));
   moving+=pose.speed>1?1:0;release+=pose.release>0?1:0;
   for(let j=0;j<15;j++)skeleton.bones[j].matrixWorld.fromArray(palette[j]);skeleton.update();
   for(let i=0;i<a.vertices;i+=29){
    const actual=mesh.getVertexPosition(i,new T.Vector3()),expected=new T.Vector3(),local=new T.Vector3().fromArray(a.attributes.POSITION,i*3);
    for(let j=0;j<4;j++){const w=a.attributes.WEIGHTS_0[i*4+j];if(w)expected.addScaledVector(local.clone().applyMatrix4(new T.Matrix4().fromArray(palette[a.attributes.JOINTS_0[i*4+j]])),w);}
    assert.ok(actual.distanceTo(expected)<1e-5);assert.ok(actual.toArray().every(Number.isFinite));
    assert.ok(Math.hypot(actual.x-actor.x,actual.z-actor.y)<3,'skin stays attached to its observed player');
    assert.ok(actual.y>-.22&&actual.y<2.8,'skin stays in the playable vertical envelope');
   }
  }
  assert.equal(JSON.stringify(match),before,'presentation does not alter outcomes or RNG');
 }
 assert.ok(moving>30&&release>0,'test covers moving players and observed releases');
});

test('authored movement loops blend continuously and can seek without an animation clock',()=>{
 for(const side of [-1,1])for(const backward of [0,.5,1])for(const curve of [-1,0,1]){
  const options={drive:.9,backward,curve,brake:.1},start=Motion.cycle(0,side,options),end=Motion.cycle(3.2,side,options),near=Motion.cycle(3.2-1e-6,side,options);
  assert.deepEqual(start,end);
  for(const key of Object.keys(start))assert.ok(Math.abs(start[key]-near[key])<1e-4);
  assert.deepEqual(Motion.cycle(1.7,side,options),Motion.cycle(1.7,side,options));
 }
 for(const name of ['wrist','slap','one-timer','pass','windup']){
  assert.equal(Motion.action(name,0),0);assert.equal(Motion.action(name,1),0);
  for(let t=0;t<1;t+=.02)assert.ok(Motion.action(name,t)>=0&&Motion.action(name,t)<=1);
 }
 assert.notEqual(Motion.action('slap',.14),Motion.action('wrist',.14));
});
