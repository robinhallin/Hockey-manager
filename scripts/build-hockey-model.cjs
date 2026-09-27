'use strict';
// Original low-poly hockey uniform. Reproducible glTF 2.0 skin, no third-party assets.
const fs=require('node:fs'),path=require('node:path'),root=path.join(__dirname,'..');
const names=['pelvis','chest','armL','forearmL','armR','forearmR','thighL','shinL','thighR','shinR'];
const origins=[[0,.84,0],[0,1.20,0],[0,1.40,-.34],[0,1.03,-.50],[0,1.40,.34],[0,1.03,.50],[-.10,.90,-.18],[.16,.54,-.23],[-.10,.90,.18],[.16,.54,.23]];
const ends=[null,null,origins[3],[.30,.75,-.50],origins[5],[.30,.75,.50],origins[7],[0,.23,-.24],origins[9],[0,.23,.24]];
const parents=[-1,0,1,2,1,4,0,6,0,8],P=[],N=[],UV=[],J=[],W=[],C=[],I=[],dedup=new Map();
const sub=(a,b)=>a.map((n,i)=>n-b[i]),dot=(a,b)=>a.reduce((s,n,i)=>s+n*b[i],0),unit=a=>{const d=Math.hypot(...a)||1;return a.map(n=>n/d);},cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
function basis(i){const y=ends[i]?unit(sub(ends[i],origins[i])):[0,1,0],x=unit(sub([1,0,0],y.map(n=>n*y[0])));return [x,y,cross(x,y)];}
function mat(i){const b=basis(i);return [...b[0],0,...b[1],0,...b[2],0,...origins[i],1];}
function inverse(m){const p=m.slice(12,15);return [m[0],m[4],m[8],0,m[1],m[5],m[9],0,m[2],m[6],m[10],0,-dot(p,[m[0],m[1],m[2]]),-dot(p,[m[4],m[5],m[6]]),-dot(p,[m[8],m[9],m[10]]),1];}
function multiply(a,b){const o=Array(16).fill(0);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];return o;}
function vertex(p,n,uv,j,w,color){const key=[...p,...n,...uv,...j,w,...color].map(v=>v.toFixed(6)).join(',');if(dedup.has(key)){I.push(dedup.get(key));return;}const index=P.length/3;dedup.set(key,index);I.push(index);P.push(...p);N.push(...n);UV.push(...uv);J.push(j[0],j[1],0,0);W.push(w,1-w,0,0);C.push(...color);}
function surface(rows,segments){for(let i=0;i<rows.length-1;i++)for(let j=0;j<segments;j++)for(const [r,k] of [[i,j],[i+1,j],[i+1,j+1],[i,j],[i+1,j+1],[i,j+1]]){const v=rows[r](k/segments);vertex(v.p,v.n,v.uv,v.j,v.w,v.c);}}
const white=[1,1,1],pants=[.08,.12,.19];
// Torso weights cross the waist smoothly instead of detached primitives.
const levels=[[.88,.21,.28],[.97,.22,.29],[1.05,.24,.31],[1.25,.28,.39],[1.43,.23,.35],[1.50,.15,.24]];
surface(levels.map(([h,d,w])=>t=>({p:[Math.cos(t*Math.PI*2)*d,h,Math.sin(t*Math.PI*2)*w],n:unit([Math.cos(t*Math.PI*2)/d,.08,Math.sin(t*Math.PI*2)/w]),uv:[t,(h-.88)/.62],j:[1,0],w:Math.max(0,Math.min(1,(h-.86)/.25)),c:white})),20);
for(const [upper,lower,arm] of [[2,3,true],[4,5,true],[6,7,false],[8,9,false]]){
 const a=origins[upper],b=origins[lower],c=ends[lower];
 const rows=[];
 for(let k=0;k<=8;k++){
  const t=k/8,u=t<.5?t*2:(t-.5)*2,from=t<.5?a:b,to=t<.5?b:c,center=from.map((n,i)=>n+(to[i]-n)*u),axis=unit(sub(to,from)),x=unit(sub([1,0,0],axis.map(n=>n*axis[0]))),z=cross(x,axis);
  const radius=arm?.145-t*.053:.18-t*.06,blend=Math.max(0,Math.min(1,(t-.37)/.26));
  rows.push(s=>{const angle=s*Math.PI*2,n=x.map((v,i)=>v*Math.cos(angle)+z[i]*Math.sin(angle));return {p:center.map((v,i)=>v+n[i]*radius),n,uv:[-1,-1],j:[upper,lower],w:1-blend,c:!arm&&t<.5?pants:t>.70&&t<.85?[.65,.65,.65]:white};});
 }
 surface(rows,12);
}
// Fitted pants bridge both thighs and the bottom of the jersey.
surface([[.69,.20,.28],[.82,.25,.31],[.94,.21,.29]].map(([h,d,w])=>t=>({p:[Math.cos(t*Math.PI*2)*d,h,Math.sin(t*Math.PI*2)*w],n:unit([Math.cos(t*Math.PI*2)/d,0,Math.sin(t*Math.PI*2)/w]),uv:[-1,-1],j:[0,1],w:1,c:pants})),16);
const chunks=[],views=[],accessors=[];let offset=0;
function accessor(values,type,componentType){const Typed=componentType===5123?Uint16Array:Float32Array;let b=Buffer.from(new Typed(values).buffer);const length=b.length;while(b.length%4)b=Buffer.concat([b,Buffer.alloc(1)]);chunks.push(b);views.push({buffer:0,byteOffset:offset,byteLength:length});offset+=b.length;const sizes={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16},item={bufferView:views.length-1,componentType,count:values.length/sizes[type],type};if(values===P){item.min=[0,1,2].map(i=>Math.min(...values.filter((_,j)=>j%3===i)));item.max=[0,1,2].map(i=>Math.max(...values.filter((_,j)=>j%3===i)));}accessors.push(item);return accessors.length-1;}
const attrs={POSITION:accessor(P,'VEC3',5126),NORMAL:accessor(N,'VEC3',5126),TEXCOORD_0:accessor(UV,'VEC2',5126),JOINTS_0:accessor(J,'VEC4',5123),WEIGHTS_0:accessor(W,'VEC4',5126),COLOR_0:accessor(C,'VEC3',5126)};
const indices=accessor(I,'SCALAR',5123);
const bind=accessor(names.flatMap((_,i)=>inverse(mat(i))),'MAT4',5126);
const nodes=names.map((name,i)=>({name,matrix:parents[i]<0?mat(i):multiply(inverse(mat(parents[i])),mat(i)),...(parents.some(p=>p===i)?{children:parents.flatMap((p,j)=>p===i?[j]:[])}:{})}));nodes.push({name:'Hockey uniform',mesh:0,skin:0});
const gltf={asset:{version:'2.0',generator:'Hockey Manager original uniform authoring script',copyright:'Original project asset; no third-party model or animation.'},scene:0,scenes:[{nodes:[0,nodes.length-1]}],nodes,skins:[{skeleton:0,joints:names.map((_,i)=>i),inverseBindMatrices:bind}],meshes:[{primitives:[{attributes:attrs,indices,material:0}]}],materials:[{name:'Club uniform',pbrMetallicRoughness:{baseColorFactor:[1,1,1,1],metallicFactor:0,roughnessFactor:.87},doubleSided:true}],buffers:[{byteLength:offset,uri:'data:application/octet-stream;base64,'+Buffer.concat(chunks).toString('base64')}],bufferViews:views,accessors};
const json=JSON.stringify(gltf);fs.writeFileSync(path.join(root,'assets/models/hockey-uniform.gltf'),json+'\n');fs.writeFileSync(path.join(root,'match-player-asset.js'),"'use strict';\n// Generated by scripts/build-hockey-model.cjs. Offline copy of assets/models/hockey-uniform.gltf.\nconst HockeyPlayerAsset="+json+';\n');
console.log(JSON.stringify({vertices:P.length/3,joints:names.length,bytes:offset}));
