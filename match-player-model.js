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
  const head=yaw(u(.02,.47+(m.headRise||0),0),m.headAngle??m.torsoAngle),shaft=unit(sub(m.shaftTop,m.heel||m.blade));
  const hands=m.arms.map(a=>a.catching?yaw(a.hand,m.torsoAngle):frame(a.hand,a.hand.map((v,i)=>v+shaft[i]),forward));
  return [pelvis,chest,...m.arms.flatMap(a=>[frame(a.shoulder,a.elbow,forward),frame(a.elbow,a.hand,forward)]),...m.legs.flatMap(l=>[frame(l.hip,l.knee,forward),frame(l.knee,l.ankle,forward)]),head,...hands,...m.legs.map((l,i)=>yaw(l.ankle,m.footAngles?.[i]??m.angle+(i?1:-1)*m.drop*1.1))].map((p,i)=>multiply(p,model().bind.subarray(i*16,i*16+16)));
 }
 function mesh(actors,poses,kits,reuse){
  const size=actors.reduce((sum,a)=>sum+model(kind(a)).vertices,0)*11,out=reuse?.length===size?reuse:new Float32Array(size),height=atlasRows(actors);let n=0;
  actors.forEach((actor,row)=>{
   const asset=model(kind(actor)),a=asset.attributes;
   const matrices=palette(poses.get(actor.id)),kit=kits[actor.side];
   for(let i=0;i<asset.vertices;i++){
    const p=i*3,px=a.POSITION[p],py=a.POSITION[p+1],pz=a.POSITION[p+2],nx=a.NORMAL[p],ny=a.NORMAL[p+1],nz=a.NORMAL[p+2];
    let x=0,y=0,z=0,rx=0,ry=0,rz=0;
    for(let j=0;j<4;j++){const weight=a.WEIGHTS_0[i*4+j];if(!weight)continue;const m=matrices[a.JOINTS_0[i*4+j]];
     x+=weight*(m[0]*px+m[4]*py+m[8]*pz+m[12]);y+=weight*(m[1]*px+m[5]*py+m[9]*pz+m[13]);z+=weight*(m[2]*px+m[6]*py+m[10]*pz+m[14]);
     rx+=weight*(m[0]*nx+m[4]*ny+m[8]*nz);ry+=weight*(m[1]*nx+m[5]*ny+m[9]*nz);rz+=weight*(m[2]*nx+m[6]*ny+m[10]*nz);
    }
    out[n++]=x;out[n++]=y;out[n++]=z;out[n++]=rx;out[n++]=ry;out[n++]=rz;
    const r=a.COLOR_0[p],g=a.COLOR_0[p+1],b=a.COLOR_0[p+2],fabric=Math.abs(r-g)<1e-5&&Math.abs(g-b)<1e-5,source=fabric&&r>.99?kit.jersey:fabric&&Math.abs(r-.65)<1e-5?kit.trim:null;
    out[n++]=source?source[0]:r;out[n++]=source?source[1]:g;out[n++]=source?source[2]:b;
    const u=a.TEXCOORD_0[i*2],v=a.TEXCOORD_0[i*2+1];out[n++]=u;out[n++]=u<0?-1:(row+1-v)/height;
   }
  });return out;
 }
 function atlas(canvas,actors,kits){
  canvas.width=1024;canvas.height=atlasRows(actors)*128;const c=canvas.getContext('2d');c.clearRect(0,0,canvas.width,canvas.height);
  const css=a=>'rgb('+a.map(v=>Math.round(v*255)).join(',')+')';
  actors.forEach((a,row)=>{
   const top=row*128,kit=kits[a.side],light=dot(kit.jersey,[.2126,.7152,.0722])>.55,ink=light?'#132539':'#fffaf0';
   c.save();c.beginPath();c.rect(0,top,1024,128);c.clip();
   c.fillStyle=css(kit.trim);c.fillRect(0,top+100,1024,13);c.fillRect(0,top+4,1024,5);
   c.fillStyle=ink;c.globalAlpha=.82;c.fillRect(0,top+96,1024,3);c.fillRect(0,top+115,1024,2);c.globalAlpha=1;
   c.fillStyle='rgba(6,16,29,.16)';c.fillRect(244,top+8,4,88);c.fillRect(776,top+8,4,88);
   c.fillStyle=ink;c.strokeStyle=css(kit.jersey);c.lineJoin='round';c.lineWidth=3;c.textAlign='center';c.textBaseline='middle';
   const num=Number.isInteger(a.number)?String(a.number):'';c.font='900 74px Arial';c.strokeText(num,512,top+69);c.fillText(num,512,top+69);
   c.font='bold 15px Arial';c.fillText((a.name||'').split(' ').at(-1).toUpperCase(),512,top+20,240);
   c.font='bold 24px Arial';c.fillText(num,218,top+25);c.fillText(num,806,top+25);
   const crest=typeof matchIceCrest==='function'?matchIceCrest(kit.name):null;
   for(const x of [0,1024]){
    if(crest)c.drawImage(crest,x-80,top+25,160,66);
    else{c.font='900 36px Arial';c.fillText(kit.code||kit.name||'',x,top+60,190);}
   }
   c.restore();
  });return canvas;
 }
 function indices(actors){const assets=actors.map(a=>model(kind(a))),out=new Uint16Array(assets.reduce((sum,a)=>sum+a.indices.length,0));let vertex=0,index=0;for(const a of assets){for(const i of a.indices)out[index++]=vertex+i;vertex+=a.vertices;}return out;}
 // Equipment identity is derived once from the original bind mesh, never
 // from club colors or the posed world height. Preserve the compact asset.
 function surfaces(actors){
  const out=new Float32Array(actors.reduce((sum,a)=>sum+model(kind(a)).vertices,0)*2);let n=0;
  for(const actor of actors){const a=model(kind(actor)).attributes;
   for(let i=0;i<a.POSITION.length/3;i++){
    const c=Array.from(a.COLOR_0.subarray(i*3,i*3+3)),joint=a.JOINTS_0[i*4];
    const is=color=>c.every((v,k)=>Math.abs(v-color[k])<.001);
    let rough=.9,metal=0;
    if(is([.56,.65,.71])){rough=.24;metal=.82;}
    else if(is([.66,.78,.83]))rough=.13;
    else if(is([.79,.66,.53]))rough=.68;
    else if(joint===10)rough=.25;
    else if(joint===11||joint===12)rough=actor.role==='G'?.52:.65;
    else if(joint>=13)rough=.72;
    else if(actor.role==='G'&&(joint===7||joint===9))rough=.5;
    out[n++]=rough;out[n++]=metal;
   }
  }return out;
 }
 return {decode,model,kind,palette,mesh,atlas,indices,surfaces};
})();
