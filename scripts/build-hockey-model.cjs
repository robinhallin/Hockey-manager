'use strict';
// Original articulated hockey models. Reproducible offline glTF 2.0, no external assets.
const fs=require('node:fs'),path=require('node:path'),root=path.join(__dirname,'..');
const detailed=process.argv.includes('--broadcast');
const names=['pelvis','chest','armL','forearmL','armR','forearmR','thighL','shinL','thighR','shinR','head','handL','handR','footL','footR'];
const origins=[[0,.84,0],[0,1.20,0],[0,1.40,-.34],[0,1.03,-.50],[0,1.40,.34],[0,1.03,.50],[-.10,.90,-.18],[.16,.54,-.23],[-.10,.90,.18],[.16,.54,.23],[.02,1.67,0],[.30,.75,-.50],[.30,.75,.50],[0,.23,-.24],[0,.23,.24]];
const ends=[null,null,origins[3],origins[11],origins[5],origins[12],origins[7],origins[13],origins[9],origins[14],null,null,null,null,null];
const parents=[-1,0,1,2,1,4,0,6,0,8,1,3,5,7,9];
const sub=(a,b)=>a.map((n,i)=>n-b[i]),dot=(a,b)=>a.reduce((s,n,i)=>s+n*b[i],0),unit=a=>{const d=Math.hypot(...a)||1;return a.map(n=>n/d);},cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
function basis(i){const y=ends[i]?unit(sub(ends[i],origins[i])):[0,1,0],x=unit(sub([1,0,0],y.map(n=>n*y[0])));return [x,y,cross(x,y)];}
function mat(i){const b=basis(i);return [...b[0],0,...b[1],0,...b[2],0,...origins[i],1];}
function inverse(m){const p=m.slice(12,15);return [m[0],m[4],m[8],0,m[1],m[5],m[9],0,m[2],m[6],m[10],0,-dot(p,[m[0],m[1],m[2]]),-dot(p,[m[4],m[5],m[6]]),-dot(p,[m[8],m[9],m[10]]),1];}
function multiply(a,b){const o=Array(16).fill(0);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];return o;}
const chunks=[],views=[],accessors=[];let offset=0;
function accessor(values,type,componentType){
 const Typed=componentType===5123?Uint16Array:Float32Array;let b=Buffer.from(new Typed(values).buffer);const length=b.length;while(b.length%4)b=Buffer.concat([b,Buffer.alloc(1)]);
 chunks.push(b);views.push({buffer:0,byteOffset:offset,byteLength:length});offset+=b.length;
 const sizes={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16},item={bufferView:views.length-1,componentType,count:values.length/sizes[type],type};
 if(type==='VEC3'){item.min=[0,1,2].map(i=>Math.min(...values.filter((_,j)=>j%3===i)));item.max=[0,1,2].map(i=>Math.max(...values.filter((_,j)=>j%3===i)));}
 accessors.push(item);return accessors.length-1;
}
const jersey=[1,1,1],trim=[.65,.65,.65],black=[.06,.10,.15],white=[.91,.94,.95],steel=[.56,.65,.71],skin=[.79,.66,.53];
const counts=[];
function build(kind){
 const keeper=kind!=='skater',catchSide=kind==='goalieR'?1:-1;
 const P=[],N=[],UV=[],J=[],W=[],C=[],I=[],dedup=new Map();
 function vertex(p,n,uv,j,w,color){
  const key=[...p,...n,...uv,...j,w,...color].map(v=>v.toFixed(6)).join(',');if(dedup.has(key)){I.push(dedup.get(key));return;}
  const index=P.length/3;dedup.set(key,index);I.push(index);P.push(...p);N.push(...n);UV.push(...uv);J.push(j[0],j[1],0,0);W.push(w,1-w,0,0);C.push(...color);
 }
 function surface(rows,segments){for(let i=0;i<rows.length-1;i++)for(let j=0;j<segments;j++)for(const [r,k] of [[i,j],[i+1,j],[i+1,j+1],[i,j],[i+1,j+1],[i,j+1]]){const v=rows[r](k/segments);vertex(v.p,v.n,v.uv||[-1,-1],v.j,v.w??1,v.c);}}
 function quad(a,b,c,d,col,joint){const normal=unit(cross(sub(b,a),sub(c,a)));for(const p of [a,b,c,a,c,d])vertex(p,normal,[-1,-1],[joint,joint],1,col);}
 function box(center,size,col,joint){const p=(a,b,c)=>center.map((v,i)=>v+[a,b,c][i]*size[i]/2),v=[p(-1,-1,-1),p(1,-1,-1),p(1,-1,1),p(-1,-1,1),p(-1,1,-1),p(1,1,-1),p(1,1,1),p(-1,1,1)];for(const f of [[0,3,2,1],[4,5,6,7],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]])quad(...f.map(i=>v[i]),col,joint);}
 function ellipsoid(center,size,col,joint,segments=detailed?20:12,rings=detailed?10:6){
  surface(Array.from({length:rings+1},(_,i)=>t=>{const a=i*Math.PI/rings,b=t*Math.PI*2,n=[Math.sin(a)*Math.cos(b),Math.cos(a),Math.sin(a)*Math.sin(b)];return {p:center.map((v,k)=>v+n[k]*size[k]),n:unit(n.map((v,k)=>v/size[k])),j:[joint,joint],c:col};}),segments);
 }
 function tube(a,b,r,col,joint){const y=unit(sub(b,a)),x=unit(cross(y,Math.abs(y[1])>.9?[1,0,0]:[0,1,0])),z=cross(x,y);surface([a,b].map(p=>t=>{const n=x.map((v,i)=>v*Math.cos(t*Math.PI*2)+z[i]*Math.sin(t*Math.PI*2));return {p:p.map((v,i)=>v+n[i]*r),n,j:[joint,joint],c:col};}),detailed?10:6);}
 const levels=[[.88,.20,.27],[.97,.21,.28],[1.05,.225,.30],[1.25,keeper?.28:.25,keeper?.39:.355],[1.43,.22,.34],[1.50,.14,.22]];
 const cloth=detailed?[[.865,.207,.276],[.905,.222,.285],[.95,.216,.28],[1.01,.23,.292],[1.08,.225,.302],[1.16,.252,.325],[1.25,keeper?.29:.27,keeper?.40:.365],[1.34,.28,.386],[1.41,.237,.358],[1.46,.19,.30],[1.50,.14,.22]]:levels;
 surface(cloth.map(([h,d,w])=>t=>{const a=t*Math.PI*2,fold=detailed?.009*Math.sin(a*9+h*28)*Math.sin((h-.865)/.635*Math.PI):0;return {p:[Math.cos(a)*(d+fold),h,Math.sin(a)*(w+fold)],n:unit([Math.cos(a)/d,.08,Math.sin(a)/w]),uv:[t,detailed?(h-.865)/.635:(h-.88)/.62],j:[1,0],w:Math.max(0,Math.min(1,(h-.86)/.25)),c:jersey};}),detailed?40:24);
 for(const [upper,lower,arm] of [[2,3,true],[4,5,true],[6,7,false],[8,9,false]]){
  const a=origins[upper],b=origins[lower],c=ends[lower],rows=[];
  for(let k=0;k<=(detailed?14:8);k++){
   const t=k/(detailed?14:8),u=t<.5?t*2:(t-.5)*2,from=t<.5?a:b,to=t<.5?b:c,center=from.map((n,i)=>n+(to[i]-n)*u),axis=unit(sub(to,from)),x=unit(sub([1,0,0],axis.map(n=>n*axis[0]))),z=cross(x,axis);
   const radius=arm?(keeper?.163:.145)-t*.053:.18-t*.06,blend=Math.max(0,Math.min(1,(t-.37)/.26));
   rows.push(s=>{const angle=s*Math.PI*2,n=x.map((v,i)=>v*Math.cos(angle)+z[i]*Math.sin(angle));return {p:center.map((v,i)=>v+n[i]*radius),n,uv:detailed&&arm?[.22+(s-.5)*.13,.88-t*.78]:[-1,-1],j:[upper,lower],w:1-blend,c:!arm&&t<.5?black:t>.70&&t<.85?trim:jersey};});
  }
  surface(rows,detailed?20:12);
 }
 // A fitted collar and shoulder panels give the jersey a hockey silhouette
 // without increasing the rig or depending on a licensed equipment texture.
 surface([[1.48,.12,.15],[1.515,.10,.13]].map(([h,d,w])=>t=>({p:[.01+Math.cos(t*Math.PI*2)*d,h,Math.sin(t*Math.PI*2)*w],n:unit([Math.cos(t*Math.PI*2),.3,Math.sin(t*Math.PI*2)]),j:[1,1],c:trim})),12);
 surface([[.69,.20,.28],[.82,.25,.31],[.94,.21,.29]].map(([h,d,w])=>t=>({p:[Math.cos(t*Math.PI*2)*d,h,Math.sin(t*Math.PI*2)*w],n:unit([Math.cos(t*Math.PI*2)/d,0,Math.sin(t*Math.PI*2)/w]),j:[0,1],w:1,c:black})),16);
 ellipsoid([.01,1.55,0],[.085,.14,.09],skin,1);ellipsoid([.045,1.665,0],[.145,.18,.15],skin,10,detailed?28:16,detailed?14:8);
 if(!keeper)for(const side of [-1,1])ellipsoid([.005,1.65,side*.15],[.024,.047,.026],skin,10,8,4);
 ellipsoid([.187,1.648,0],[.036,.045,.032],skin,10,8,4);
 for(const side of [-1,1])quad([.19,1.699,side*.038],[.19,1.699,side*.082],[.19,1.683,side*.082],[.19,1.683,side*.038],black,10);
 quad([.18,1.574,-.039],[.18,1.574,.039],[.18,1.565,.039],[.18,1.565,-.039],[.40,.27,.23],10);
 if(detailed){
  // Cheekbones, jaw, brows, nose bridge and lips remain attached to the head.
  for(const side of [-1,1]){
   ellipsoid([.117,1.612,side*.088],[.050,.062,.052],skin,10,12,6);
   ellipsoid([.160,1.700,side*.064],[.028,.017,.052],skin,10,12,5);
   ellipsoid([.183,1.686,side*.061],[.013,.008,.014],[.12,.18,.20],10,8,4);
  }
  ellipsoid([.176,1.672,0],[.029,.060,.028],skin,10,12,8);
  ellipsoid([.143,1.563,0],[.042,.027,.065],skin,10,12,5);
 }
 const helmet=keeper?white:jersey;
 surface([[1.64,.15,.18],[1.73,.205,.21],[1.82,.20,.205],[1.89,.14,.15],[1.915,.005,.005]].map(([h,d,w])=>t=>({p:[-.015+Math.cos(t*Math.PI*2)*d,h,Math.sin(t*Math.PI*2)*w],n:unit([Math.cos(t*Math.PI*2)/d,.5,Math.sin(t*Math.PI*2)/w]),j:[10,10],c:helmet})),detailed?40:24);
 for(const side of [-1,1]){tube([-.12,1.72,side*.18],[.11,1.52,side*.14],.017,black,10);for(const x of [-.07,.035])box([x,1.894,side*.095],[.065,.012,.035],black,10);}
 if(keeper){
  for(const z of [-.15,0,.15])tube([.23,1.51,z],[.25,1.80,z],.012,steel,10);
  for(const h of [1.54,1.65,1.77])tube([.25,h,-.16],[.25,h,.16],.012,steel,10);
  ellipsoid([.16,1.49,0],[.10,.075,.15],white,10);
 }else for(const side of [-1,1])quad([.218,1.755,0],[.18,1.755,side*.17],[.19,1.707,side*.17],[.235,1.707,0],[.66,.78,.83],10);
 for(const [i,side] of [[0,-1],[1,1]]){
  const foot=origins[13+i],f=(x,y,z)=>[foot[0]+x,foot[1]+y,foot[2]+z];
  // Boot, laces, holder and runner stay attached to one foot joint.
  ellipsoid(f(.015,-.105,0),[.185,.11,.095],black,13+i);box(f(-.10,-.015,0),[.15,.17,.15],black,13+i);box(f(-.09,.068,0),[.14,.025,.17],trim,13+i);
  for(let n=0;n<4;n++)box(f(-.035+n*.045,-.015-n*.012,0),[.014,.012,.11],white,13+i);
  box(f(0,-.185,0),[.35,.036,.06],white,13+i);box(f(0,-.215,0),[.41,.025,.036],steel,13+i);
  const hand=origins[11+i],h=(x,y,z)=>[hand[0]+x,hand[1]+y,hand[2]+z];
  if(!keeper){
   ellipsoid(hand,[.125,.11,.14],black,11+i);box(h(-.035,.092,0),[.14,.04,.20],trim,11+i);
   for(let n=0;n<3;n++)box(h(.065,.04,-.085+n*.085),[.075,.06,.067],jersey,11+i);
   ellipsoid(h(.04,-.03,-side*.125),[.07,.05,.055],black,11+i,8,4);
  }else{
   if(side===catchSide){
    ellipsoid(hand,[.12,.205,.24],white,11+i);ellipsoid(h(.11,0,0),[.022,.135,.17],[.24,.30,.33],11+i);
    for(let n=-2;n<=2;n++)tube(h(.137,-.12,n*.056),h(.137,.12,n*.056),.006,steel,11+i);
    box(h(-.01,-.13,0),[.20,.06,.24],trim,11+i);
   }else{ellipsoid(hand,[.095,.115,.10],black,11+i);box(h(.085,.035,0),[.10,.31,.26],white,11+i);box(h(.141,.035,0),[.012,.20,.17],trim,11+i);}
   const ankle=origins[13+i],knee=origins[7+i*2],up=unit(sub(knee,ankle)),right=[0,0,1],front=[1,0,0];
   const pad=(height,depth,width)=>ankle.map((v,k)=>v+up[k]*height+front[k]*depth+right[k]*width),top=.47,bottom=-.03,half=.18;
   quad(pad(bottom,.235,-half+.025),pad(bottom,.235,half-.025),pad(top,.235,half-.025),pad(top,.235,-half+.025),white,7+i*2);
   for(const side of [-1,1])quad(pad(bottom,.20,side*half),pad(bottom,.235,side*(half-.025)),pad(top,.235,side*(half-.025)),pad(top,.20,side*half),[.80,.85,.87],7+i*2);
   for(const edge of [-half,half])quad(pad(bottom,.02,edge),pad(bottom,.22,edge),pad(top,.22,edge),pad(top,.02,edge),white,7+i*2);
   quad(pad(top,.02,-half),pad(top,.22,-half),pad(top,.22,half),pad(top,.02,half),white,7+i*2);
   for(const y of [.10,.27,.42])quad(pad(y,.24,-half+.025),pad(y,.24,half-.025),pad(y+.022,.24,half-.025),pad(y+.022,.24,-half+.025),trim,7+i*2);
   for(const z of [-.105,.105])tube(pad(bottom,.24,z),pad(top,.24,z),.006,steel,7+i*2);
  }
 }
 if(detailed)for(let i=0;i<I.length;i+=3){const [a,b,c]=I.slice(i,i+3).map(v=>v*3),normal=cross(sub(P.slice(b,b+3),P.slice(a,a+3)),sub(P.slice(c,c+3),P.slice(a,a+3)));if(dot(normal,N.slice(a,a+3))<0)[I[i+1],I[i+2]]=[I[i+2],I[i+1]];}
 counts.push({kind,vertices:P.length/3,triangles:I.length/3});
 return {name:kind,primitives:[{attributes:{POSITION:accessor(P,'VEC3',5126),NORMAL:accessor(N,'VEC3',5126),TEXCOORD_0:accessor(UV,'VEC2',5126),JOINTS_0:accessor(J,'VEC4',5123),WEIGHTS_0:accessor(W,'VEC4',5126),COLOR_0:accessor(C,'VEC3',5126)},indices:accessor(I,'SCALAR',5123),material:0}]};
}
const meshes=['skater','goalie','goalieR'].map(build),bind=accessor(names.flatMap((_,i)=>inverse(mat(i))),'MAT4',5126);
const nodes=names.map((name,i)=>({name,matrix:parents[i]<0?mat(i):multiply(inverse(mat(parents[i])),mat(i)),...(parents.some(p=>p===i)?{children:parents.flatMap((p,j)=>p===i?[j]:[])}:{})}));
for(let i=0;i<meshes.length;i++)nodes.push({name:meshes[i].name,mesh:i,skin:0});
const gltf={asset:{version:'2.0',generator:'Hockey Manager original player authoring script',copyright:'Original project asset; no third-party models or animations.'},scene:0,scenes:meshes.map((m,i)=>({name:m.name,nodes:[0,names.length+i]})),nodes,skins:[{skeleton:0,joints:names.map((_,i)=>i),inverseBindMatrices:bind}],meshes,materials:[{name:'Team and equipment',pbrMetallicRoughness:{baseColorFactor:[1,1,1,1],metallicFactor:0,roughnessFactor:.87},doubleSided:true}],buffers:[{byteLength:offset,uri:'data:application/octet-stream;base64,'+Buffer.concat(chunks).toString('base64')}],bufferViews:views,accessors};
const json=JSON.stringify(gltf),file=detailed?'hockey-broadcast':'hockey-uniform';
fs.writeFileSync(path.join(root,'assets/models/'+file+'.gltf'),json+'\n');
fs.writeFileSync(path.join(root,detailed?'assets/models/hockey-broadcast.js':'match-player-asset.js'),"'use strict';\n// Generated by scripts/build-hockey-model.cjs"+(detailed?' --broadcast':'')+(detailed?". Original offline glTF model.":". Offline copy of assets/models/hockey-uniform.gltf.")+"\nconst "+(detailed?'HockeyBroadcastAsset':'HockeyPlayerAsset')+'='+json+';\n');
console.log(JSON.stringify({models:counts,joints:names.length,bytes:offset}));
