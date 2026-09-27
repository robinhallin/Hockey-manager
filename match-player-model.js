'use strict';
// Small glTF 2.0 skin reader for the bundled original model. Decoding happens
// once; animation comes only from recorded hockey poses, never simulation RNG.
const HockeyPlayerModel=(()=>{
 const sub=(a,b)=>a.map((v,i)=>v-b[i]),dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),unit=a=>{const d=Math.hypot(...a)||1;return a.map(v=>v/d);},cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
 function multiply(a,b){const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];return o;}
 function decode(gltf,kind='skater'){
  if(gltf.asset?.version!=='2.0'||gltf.buffers.length!==1||gltf.skins.length!==1)throw Error('Unsupported hockey model');
  const encoded=gltf.buffers[0].uri.split(',')[1],abc='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',bytes=new Uint8Array(gltf.buffers[0].byteLength);let bits=0,value=0,index=0;
  for(const char of encoded){const n=abc.indexOf(char);if(n<0)continue;value=(value<<6)|n;bits+=6;if(bits>=8){bits-=8;bytes[index++]=(value>>bits)&255;}}
  if(index!==bytes.length)throw Error('Truncated hockey model');
  const read=id=>{const a=gltf.accessors[id],v=gltf.bufferViews[a.bufferView],size={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16}[a.type],Typed=a.componentType===5123?Uint16Array:a.componentType===5126?Float32Array:null;if(!Typed||!size)throw Error('Unsupported model accessor');const start=(v.byteOffset||0)+(a.byteOffset||0),end=start+a.count*size*Typed.BYTES_PER_ELEMENT;if(end>bytes.length)throw Error('Model accessor out of bounds');return new Typed(bytes.buffer.slice(start,end));};
  const p=(gltf.meshes.find(m=>m.name===kind)||gltf.meshes[0]).primitives[0],attributes=Object.fromEntries(Object.entries(p.attributes).map(([k,id])=>[k,read(id)]));
  return {attributes,indices:read(p.indices),bind:read(gltf.skins[0].inverseBindMatrices),joints:gltf.skins[0].joints.map(id=>gltf.nodes[id].name),vertices:attributes.POSITION.length/3};
 }
 const loaded=new Map();
 function kind(a){return a.role==='G'?(a.shoots==='R'?'goalieR':'goalie'):'skater';}
 function model(type='skater'){if(!loaded.has(type))loaded.set(type,decode(HockeyPlayerAsset,type));return loaded.get(type);}
 function atlasRows(actors){return 2**Math.ceil(Math.log2(Math.max(1,actors.length)));}
 function matrix(origin,x,y,z){return [...x,0,...y,0,...z,0,...origin,1];}
 function frame(a,b,forward){const y=unit(sub(b,a)),x=unit(sub(forward,y.map(v=>v*dot(forward,y))));return matrix(a,x,y,cross(x,y));}
 function palette(m){
  const forward=[Math.cos(m.torsoAngle),0,Math.sin(m.torsoAngle)],p=m.point,u=m.torsoPoint;
  const base=p(0,.84-m.lower,0),pelvis=matrix(base,[Math.cos(m.angle),0,Math.sin(m.angle)],[0,1,0],[-Math.sin(m.angle),0,Math.cos(m.angle)]);
  const chest=matrix(m.torso,sub(u(1,0,0),m.torso),sub(u(0,1,0),m.torso),sub(u(0,0,1),m.torso));
  const yaw=(p,angle)=>matrix(p,[Math.cos(angle),0,Math.sin(angle)],[0,1,0],[-Math.sin(angle),0,Math.cos(angle)]);
  const head=matrix(u(.02,.47+(m.headRise||0),0),sub(u(1,0,0),m.torso),sub(u(0,1,0),m.torso),sub(u(0,0,1),m.torso));
  return [pelvis,chest,...m.arms.flatMap(a=>[frame(a.shoulder,a.elbow,forward),frame(a.elbow,a.hand,forward)]),...m.legs.flatMap(l=>[frame(l.hip,l.knee,forward),frame(l.knee,l.ankle,forward)]),head,...m.arms.map(a=>yaw(a.hand,m.torsoAngle)),...m.legs.map((l,i)=>yaw(l.ankle,m.footAngles?.[i]??m.angle+(i?1:-1)*m.drop*1.1))].map((p,i)=>multiply(p,model().bind.subarray(i*16,i*16+16)));
 }
 function mesh(actors,poses,kits){
  const out=new Float32Array(actors.reduce((sum,a)=>sum+model(kind(a)).vertices,0)*11),height=atlasRows(actors);let n=0;
  actors.forEach((actor,row)=>{
   const asset=model(kind(actor)),a=asset.attributes;
   const matrices=palette(poses.get(actor.id)),kit=kits[actor.side],positions=new Float32Array(asset.vertices*6);
   for(let i=0;i<asset.vertices;i++)for(let joint=0;joint<4;joint++){
    const weight=a.WEIGHTS_0[i*4+joint];if(!weight)continue;const m=matrices[a.JOINTS_0[i*4+joint]],p=i*3;
    for(let axis=0;axis<3;axis++){
     positions[i*6+axis]+=weight*(m[axis]*a.POSITION[p]+m[4+axis]*a.POSITION[p+1]+m[8+axis]*a.POSITION[p+2]+m[12+axis]);
     positions[i*6+3+axis]+=weight*(m[axis]*a.NORMAL[p]+m[4+axis]*a.NORMAL[p+1]+m[8+axis]*a.NORMAL[p+2]);
    }
   }
   for(let i=0;i<asset.vertices;i++){
    for(let k=0;k<6;k++)out[n++]=positions[i*6+k];
    const c=a.COLOR_0.subarray(i*3,i*3+3),fabric=Math.abs(c[0]-c[1])<1e-5&&Math.abs(c[1]-c[2])<1e-5,source=fabric&&c[0]>.99?kit.jersey:fabric&&Math.abs(c[0]-.65)<1e-5?kit.trim:c;
    for(let k=0;k<3;k++)out[n++]=source[k];
    const u=a.TEXCOORD_0[i*2],v=a.TEXCOORD_0[i*2+1];out[n++]=u;out[n++]=u<0?-1:(row+1-v)/height;
   }
  });return out;
 }
 function atlas(canvas,actors,kits){
  canvas.width=1024;canvas.height=atlasRows(actors)*64;const c=canvas.getContext('2d');c.clearRect(0,0,canvas.width,canvas.height);
  actors.forEach((a,row)=>{
   const top=row*64,kit=kits[a.side],light=dot(kit.jersey,[.2126,.7152,.0722])>.55;
   c.fillStyle=light?'#102033':'#fff9e9';c.textAlign='center';c.textBaseline='middle';c.font='bold 39px Arial';
   const num=Number.isInteger(a.number)?String(a.number):'';c.fillText(num,512,top+36);c.font='bold 22px Arial';c.fillText(num,18,top+35);c.fillText(num,1006,top+35);
   c.font='bold 11px Arial';c.fillText((a.name||'').split(' ').at(-1).toUpperCase(),512,top+9,215);
  });return canvas;
 }
 function indices(actors){const assets=actors.map(a=>model(kind(a))),out=new Uint16Array(assets.reduce((sum,a)=>sum+a.indices.length,0));let vertex=0,index=0;for(const a of assets){for(const i of a.indices)out[index++]=vertex+i;vertex+=a.vertices;}return out;}
 return {decode,model,kind,palette,mesh,atlas,indices};
})();
