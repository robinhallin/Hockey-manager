'use strict';
// Offline Three.js presentation of authoritative snapshots. All animation is
// seekable; no simulation state or random generator is read for visual effects.
const HockeyBroadcast3D=(()=>{
 function connect(core){
  let current=null;const assets=new Map();
  const ready=()=>typeof HockeyThree!=='undefined'&&typeof HockeyBroadcastAsset!=='undefined';
  const model=kind=>{if(!assets.has(kind))assets.set(kind,HockeyPlayerModel.decode(HockeyBroadcastAsset,kind));return assets.get(kind);};
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function color(T,r,g,b){return new T.Color().setRGB(r,g,b,T.SRGBColorSpace);}
  function geometry(T,data,{art=false,alpha=false}={},reuse){
   const n=data.length/9,p=new Float32Array(n*3),normal=new Float32Array(n*3),col=new Float32Array(n*(alpha?4:3)),uv=new Float32Array(n*2),tint=new T.Color();
   for(let i=0;i<n;i++){
    const at=i*9,x=data[at],y=data[at+1],z=data[at+2];p.set(data.subarray(at,at+3),i*3);normal.set(data.subarray(at+3,at+6),i*3);
    const c=alpha?tint.setRGB(.035,.075,.11,T.SRGBColorSpace):art?tint.setRGB(1,1,1):tint.setRGB(Math.max(0,data[at+6]),Math.max(0,data[at+7]),Math.max(0,data[at+8]),T.SRGBColorSpace);
    col.set([c.r,c.g,c.b],i*(alpha?4:3));if(alpha)col[i*4+3]=Math.max(0,data[at+6]);
    uv[i*2]=art?((x-9)/7%1+1)%1:x/60;uv[i*2+1]=art?clamp((y-(data[at+6]<-1.5?5.75:.25))/(data[at+6]<-1.5?.5:.69),0,1):1-z/30;
   }
   if(reuse&&reuse.attributes.position.count===n){for(const [key,rows] of [['position',p],['normal',normal],['color',col],['uv',uv]]){reuse.attributes[key].array.set(rows);reuse.attributes[key].needsUpdate=true;}return reuse;}
   const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(p,3));g.setAttribute('normal',new T.BufferAttribute(normal,3));g.setAttribute('color',new T.BufferAttribute(col,alpha?4:3));g.setAttribute('uv',new T.BufferAttribute(uv,2));return g;
  }
  function split(data,classify){const groups=new Map();for(let i=0;i<data.length;i+=27){const key=classify(data,i);if(!groups.has(key))groups.set(key,[]);const out=groups.get(key);for(let j=i;j<i+27;j++)out.push(data[j]);}return [...groups].map(([key,rows])=>[key,new Float32Array(rows)]);}
  function texture(c,canvas){const t=new c.T.CanvasTexture(canvas);t.colorSpace=c.T.SRGBColorSpace;t.anisotropy=Math.min(4,c.renderer.capabilities.getMaxAnisotropy());c.textures.add(t);return t;}
  function material(c,options={}){const m=new c.T.MeshStandardMaterial({roughness:.8,vertexColors:true,side:c.T.DoubleSide,...options});c.materials.add(m);return m;}
  function mesh(c,g,m,{cast=false,receive=true,reflection=false}={}){const obj=new c.T.Mesh(g,m);obj.castShadow=cast;obj.receiveShadow=receive;if(reflection)obj.layers.enable(1);c.scene.add(obj);c.geometries.add(g);return obj;}
  function environment(c){
   const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=512;const x=canvas.getContext('2d'),wash=x.createLinearGradient(0,0,0,512);
   wash.addColorStop(0,'#d3e0ea');wash.addColorStop(.32,'#8098ac');wash.addColorStop(.53,'#263443');wash.addColorStop(1,'#8397a5');x.fillStyle=wash;x.fillRect(0,0,1024,512);
   for(let i=0;i<8;i++){x.fillStyle='#fff9eb';x.fillRect(i*128+12,92,92,18);x.fillStyle='#cce0f3';x.fillRect(i*128+30,174,56,9);}
   const source=texture(c,canvas);source.mapping=c.T.EquirectangularReflectionMapping;const pmrem=new c.T.PMREMGenerator(c.renderer);c.environment=pmrem.fromEquirectangular(source);c.scene.environment=c.environment.texture;pmrem.dispose();
  }
  function buildRink(c){
   const T=c.T,rows=core.sceneData.rink(),iceMaterial=new T.MeshPhysicalMaterial({color:0xffffff,roughness:.38,metalness:.02,clearcoat:.32,clearcoatRoughness:.3,envMapIntensity:.35,side:T.DoubleSide});
   c.materials.add(iceMaterial);c.iceMaterial=iceMaterial;
   c.reflectionUniforms={rinkReflection:{value:c.reflection.texture},rinkProjection:{value:new T.Matrix4()},rinkReflectivity:{value:0}};
   iceMaterial.onBeforeCompile=shader=>{
    Object.assign(shader.uniforms,c.reflectionUniforms);
    shader.vertexShader='uniform mat4 rinkProjection;varying vec4 vRinkProjection;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nvRinkProjection=rinkProjection*modelMatrix*vec4(transformed,1.);');
    shader.fragmentShader='uniform sampler2D rinkReflection;uniform float rinkReflectivity;varying vec4 vRinkProjection;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>','vec2 rinkUV=vRinkProjection.xy/vRinkProjection.w;vec4 rinkRef=texture2D(rinkReflection,rinkUV);float rinkValid=step(0.,rinkUV.x)*step(rinkUV.x,1.)*step(0.,rinkUV.y)*step(rinkUV.y,1.);outgoingLight=mix(outgoingLight,rinkRef.rgb,rinkRef.a*rinkReflectivity*rinkValid);\n#include <opaque_fragment>');
   };
   const classify=(a,i)=>{
    if(a[i+6]<-1.5)return 'ribbon';if(a[i+6]<-.5)return 'boards';if(a[i+6]>1)return 'lamps';
    if([i+1,i+10,i+19].every(j=>Math.abs(a[j])<.001))return 'ice';
    if([i,i+9,i+18].every(j=>a[j]>=-.1&&a[j]<=60.1&&a[j+2]>=-.1&&a[j+2]<=30.1&&a[j+1]>=-.1)&&[i+1,i+10,i+19].some(j=>a[j]>.2))return 'casters';
    return 'structure';
   };
   c.boardMaterials=[];c.arenaVertices=rows.length/9;c.shadowCasterVertices=0;
   for(const [key,data] of split(rows,classify)){
    const art=key==='boards'||key==='ribbon';let m=key==='ice'?iceMaterial:key==='lamps'?new T.MeshBasicMaterial({vertexColors:true}):material(c,{roughness:key==='casters'?.52:.83});
    if(key==='ribbon')m=new T.MeshBasicMaterial({color:0xffffff});if(art)c.boardMaterials.push(m);c.materials.add(m);
    const object=mesh(c,geometry(T,data,{art}),m,{cast:key==='casters',reflection:key==='casters'});if(key==='ice')c.ice=object;if(key==='casters')c.shadowCasterVertices+=data.length/9;
   }
   // Glass catches grazing highlights but stays transparent in the match view.
   const panes=core.sceneData.glass(),glassMaterial=new T.MeshPhysicalMaterial({color:'#a4c8df',roughness:.18,metalness:.05,transparent:true,opacity:.09,depthWrite:false,side:T.DoubleSide,envMapIntensity:.7});
   c.materials.add(glassMaterial);c.glass=mesh(c,geometry(T,panes),glassMaterial,{receive:false});c.glass.renderOrder=8;c.glassVertices=panes.length/9;
  }
  function arena(c){
   const g=core.sceneData.geometry(),rgb=hex=>new c.T.Color(hex).convertLinearToSRGB().toArray(),steel=rgb('#455769'),dark=rgb('#142230'),step=rgb('#344758');
   // Upper bowl, exits and a lighting grid frame the open broadcast sightline.
   for(let row=0;row<6;row++){const y=7.5+row*.76,z=-19-row*1.52;g.box(30,y,z,73,.65,1.52,step);}
   g.box(30,12.7,-28.5,79,5,.6,dark);
   for(const end of [-1,1])for(let row=4;row<9;row++){const x=end<0?-3-row*1.6:63+row*1.6;g.box(x,.7+row*.8,15,1.6,.7,28,step);}
   for(const x of [7,30,53]){g.box(x,8.8,-20,2.6,2.8,3.3,rgb('#060e17'));g.box(x,10.25,-18.2,2.2,.25,.1,rgb('#64ba9a'));}
   for(const z of [-16,-25]){
    for(const y of [13.8,14.5])g.rod([-8,y,z],[68,y,z],.10,steel);
    for(let x=-8;x<68;x+=4)g.rod([x,13.8,z],[x+4,14.5,z],.045,steel);
   }
   for(const x of [-9,8,25,42,59,69]){g.rod([x,14.5,-25],[x,14.5,-4],.10,steel);for(const z of [-18,-8]){g.box(x,14.05,z,2.6,.16,1.2,steel);g.box(x,13.95,z,2.2,.07,.85,[1.15,1.15,1.15]);}}
   // Players' benches have seats, transparent backs, staff aisle and gates.
   for(const x of [23,37]){
    g.box(x,.45,-1.75,9,.24,1.4,rgb('#1e354e'));g.box(x,.9,-2.4,9,1.1,.18,rgb('#4d6a83'));
    for(let i=0;i<9;i++)g.box(x-4+i,.69,-1.6,.64,.10,.70,rgb('#658093'));
    for(const edge of [-4.65,4.65])g.box(x+edge,1.05,-1.15,.10,2.1,2.15,rgb('#6e879b'));
   }
   g.box(30,.8,-2,3.4,1.4,1.8,rgb('#1b2c3d'));g.box(30,1.57,-2,3.7,.12,1.95,rgb('#a4b3bb'));
   for(const x of [29.2,30.8])g.box(x,1.8,-2,.5,.35,.10,rgb('#111922'));
   const rows=g.data;c.arenaVertices+=rows.length/9;mesh(c,geometry(c.T,rows),material(c,{roughness:.72}),{receive:false});
   const board=new c.T.BoxGeometry(8,3.1,1.5),scoreMaterial=new c.T.MeshBasicMaterial({color:0xffffff});c.materials.add(scoreMaterial);c.scoreMaterial=scoreMaterial;
   c.scoreboard=mesh(c,board,scoreMaterial,{receive:false});c.scoreboard.position.set(30,10.55,-15.25);
   const rear=new c.T.MeshBasicMaterial({color:'#07131f'});c.materials.add(rear);
   const housing=mesh(c,new c.T.BoxGeometry(8.5,3.55,1.4),rear,{receive:false});housing.position.set(30,10.55,-15.55);
   c.seats=[];
   for(let row=0;row<14;row++)for(let col=0;col<52;col++){
    const x=-2+col*1.25;if([7,10,30,50,53].some(aisle=>Math.abs(x-aisle)<.85))continue;
    c.seats.push({x,y:row<8?1.03+row*.85:8.03+(row-8)*.76,z:row<8?-3-row*1.7:-19-(row-8)*1.52,angle:0});
   }
   for(const end of [-1,1])for(let row=0;row<9;row++)for(let col=0;col<17;col++){
    const z=2+col*1.6;if(Math.abs(z-15)<1.2)continue;c.seats.push({x:end<0?-3-row*1.6:63+row*1.6,y:1.23+row*.8,z,angle:end*Math.PI/2});
   }
   const count=c.seats.length,mat=material(c,{roughness:.96,vertexColors:false});
   c.crowd={body:new c.T.InstancedMesh(new c.T.BoxGeometry(.46,.50,.28),mat,count),head:new c.T.InstancedMesh(new c.T.SphereGeometry(.14,7,5),mat,count),arms:new c.T.InstancedMesh(new c.T.CylinderGeometry(.055,.055,.39,5),mat,count*2)};
   for(const obj of Object.values(c.crowd)){obj.frustumCulled=false;obj.instanceMatrix.setUsage(c.T.DynamicDrawUsage);c.geometries.add(obj.geometry);c.scene.add(obj);}
   c.benchGroup=new c.T.Group();c.scene.add(c.benchGroup);
  }
  function updateCrowd(c,f,options,q){
   const reactions=[0,1].map(side=>Math.round(core.crowdReaction(f,side)*12)/12),key=JSON.stringify([options.teams,options.homeSide,reactions,q.crowdStep]);if(key===c.crowdKey)return;
   const T=c.T,kits=core.kits(options.teams||[]),m=new T.Matrix4(),v=new T.Vector3(),rot=new T.Quaternion(),scale=new T.Vector3(1,1,1);let n=0;
   for(let i=0;i<c.seats.length;i+=q.crowdStep){
    const seat=c.seats[i],side=i%9===0?1-(options.homeSide??0):(options.homeSide??0),react=reactions[side],raise=react*(.55+(i%5)*.08),tint=i%7===0?color(T,.34,.42,.52):i%4===0?color(T,...kits[side].trim):color(T,...kits[side].jersey);
    rot.setFromAxisAngle(new T.Vector3(0,1,0),seat.angle);v.set(seat.x,seat.y+.45+raise*.23,seat.z);scale.set(1,1+(i%3)*.04,1);m.compose(v,rot,scale);c.crowd.body.setMatrixAt(n,m);c.crowd.body.setColorAt(n,tint);
    v.y+=.43;scale.set(1,1.12,1);m.compose(v,rot,scale);c.crowd.head.setMatrixAt(n,m);c.crowd.head.setColorAt(n,color(T,...[[.71,.52,.40],[.85,.70,.58],[.45,.32,.26],[.76,.62,.49]][i%4]));
    for(const edge of [-1,1]){v.set(seat.x+Math.cos(seat.angle)*edge*.30,seat.y+.35+raise*.65,seat.z-Math.sin(seat.angle)*edge*.30);rot.setFromAxisAngle(new T.Vector3(Math.sin(seat.angle),0,Math.cos(seat.angle)),edge*raise*1.9);scale.set(1,1,1);m.compose(v,rot,scale);c.crowd.arms.setMatrixAt(n*2+(edge>0?1:0),m);c.crowd.arms.setColorAt(n*2+(edge>0?1:0),tint);}
    n++;
   }
   for(const [name,obj] of Object.entries(c.crowd)){obj.count=name==='arms'?n*2:n;obj.instanceMatrix.needsUpdate=true;obj.instanceColor.needsUpdate=true;}
   c.crowdKey=key;c.crowdCount=n;c.crowdVertices=Object.values(c.crowd).reduce((total,obj)=>total+obj.geometry.attributes.position.count*obj.count,0);
  }
  function playerGeometry(c,kind,kit){
   const T=c.T,a=model(kind),g=new T.BufferGeometry(),attributes=a.attributes,cols=new Float32Array(a.vertices*3),surface=new Float32Array(a.vertices*2);
   for(let i=0;i<a.vertices;i++){
    const at=i*3,r=attributes.COLOR_0[at],green=attributes.COLOR_0[at+1],b=attributes.COLOR_0[at+2],joint=attributes.JOINTS_0[i*4],fabric=Math.abs(r-green)<1e-5&&Math.abs(green-b)<1e-5;
    const source=fabric&&r>.99?kit.jersey:fabric&&Math.abs(r-.65)<1e-5?kit.trim:[r,green,b],col=color(T,...source);cols.set([col.r,col.g,col.b],at);
    const steel=Math.abs(r-.56)<.001&&Math.abs(green-.65)<.001;surface.set([steel?.24:joint===10?.32:joint>=11?.62:.9,steel?.8:0],i*2);
   }
   for(const [name,array,size] of [['position',attributes.POSITION,3],['normal',attributes.NORMAL,3],['uv',attributes.TEXCOORD_0,2],['skinIndex',attributes.JOINTS_0,4],['skinWeight',attributes.WEIGHTS_0,4],['color',cols,3],['surface',surface,2]])g.setAttribute(name,new T.BufferAttribute(array,size));g.setIndex(new T.BufferAttribute(a.indices,1));c.geometries.add(g);return g;
  }
  function skinShader(shader,bones){
   // Fifteen joints fit vertex uniforms. Avoid sixteen bone-texture reads per
   // vertex on software and integrated GPUs; retain Three's skinning transforms.
   shader.uniforms.hockeyBones={value:bones.map(b=>b.matrixWorld)};
   shader.vertexShader=shader.vertexShader.replace('#include <skinning_pars_vertex>','#ifdef USE_SKINNING\nuniform mat4 bindMatrix;uniform mat4 bindMatrixInverse;uniform mat4 hockeyBones[15];mat4 getBoneMatrix(const in float i){return hockeyBones[int(i)];}\n#endif');
   shader.vertexShader=shader.vertexShader.replace('#include <skinbase_vertex>','#ifdef USE_SKINNING\nmat4 boneMatX=getBoneMatrix(skinIndex.x);mat4 boneMatY=skinWeight.y>0.?getBoneMatrix(skinIndex.y):mat4(0.);mat4 boneMatZ=mat4(0.);mat4 boneMatW=mat4(0.);\n#endif');
  }
  function playerMaterial(c,map,bones){
   const m=material(c,{map,roughness:.86,envMapIntensity:.65,side:c.T.FrontSide});
   m.onBeforeCompile=shader=>{
    skinShader(shader,bones);
    shader.vertexShader='attribute vec2 surface;varying vec2 vEquipment;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvEquipment=surface;');
    shader.fragmentShader='varying vec2 vEquipment;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#ifdef USE_MAP\nif(vMapUv.x>=0.){vec4 ink=texture2D(map,vMapUv);diffuseColor.rgb=mix(diffuseColor.rgb,ink.rgb,ink.a);}\n#endif');
    shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','float roughnessFactor=vEquipment.x;').replace('#include <metalnessmap_fragment>','float metalnessFactor=vEquipment.y;');
   };return m;
  }
  function players(c,f,options){
   const T=c.T,kits=core.kits(options.teams||[]),crests=(options.teams||[]).map(t=>Boolean(typeof matchIceCrest==='function'&&matchIceCrest(t.name))),key=JSON.stringify([f.actors.map(a=>[a.id,a.number,a.name,a.side,HockeyPlayerModel.kind(a)]),kits,crests]);
   if(key===c.playerKey)return;
   for(const p of c.players.values()){c.scene.remove(p.object);p.skeleton.dispose();p.object.geometry.dispose();c.geometries.delete(p.object.geometry);p.material.dispose();c.materials.delete(p.material);p.depthMaterial.dispose();c.materials.delete(p.depthMaterial);p.texture.dispose();c.textures.delete(p.texture);}c.players.clear();
   for(const actor of f.actors){
    const kind=HockeyPlayerModel.kind(actor),g=playerGeometry(c,kind,kits[actor.side]),canvas=HockeyPlayerModel.atlas(document.createElement('canvas'),[{...actor,side:0}],[kits[actor.side]]);
    const map=texture(c,canvas),bones=Array.from({length:15},()=>new T.Bone()),m=playerMaterial(c,map,bones),skeleton=new T.Skeleton(bones,bones.map(()=>new T.Matrix4())),object=new T.SkinnedMesh(g,m);
    const depthMaterial=new T.MeshDepthMaterial();depthMaterial.onBeforeCompile=shader=>skinShader(shader,bones);c.materials.add(depthMaterial);object.customDepthMaterial=depthMaterial;
    object.bind(skeleton,new T.Matrix4());object.frustumCulled=false;object.castShadow=true;object.receiveShadow=true;object.layers.enable(1);c.scene.add(object);
    c.players.set(actor.id,{object,skeleton,material:m,depthMaterial,texture:map,kind});
   }
   c.playerKey=key;c.skinVertices=f.actors.reduce((sum,a)=>sum+model(HockeyPlayerModel.kind(a)).vertices,0);c.textureBuilds++;c.geometryKey=null;
  }
  function updateGeometry(c,f,options){
   const key=JSON.stringify([f.time,f.wall,f.phase,f.carrier,f.puck,f.flight,f.actors,options.teams]);if(key===c.geometryKey)return false;
   const start=performance.now(),poses=new Map(f.actors.map(a=>[a.id,core.pose(f,a)]));
   for(const a of f.actors){const p=c.players.get(a.id),palette=HockeyPlayerModel.palette(poses.get(a.id));for(let i=0;i<15;i++)p.skeleton.bones[i].matrixWorld.fromArray(palette[i]);}
   const data=core.figures(f,options.teams||[],true,poses);
   const retained=new Set();
   for(const [kind,rows] of split(data,(a,i)=>a[i+8]<-.5?'shadow':'equipment')){
    const alpha=kind==='shadow',prior=c.dynamic.find(obj=>obj.userData.kind===kind),g=geometry(c.T,rows,{alpha},prior?.geometry);
    let object=prior;if(prior&&g!==prior.geometry){prior.geometry.dispose();c.geometries.delete(prior.geometry);prior.geometry=g;c.geometries.add(g);}
    if(!object){object=mesh(c,g,alpha?c.contactMaterial:c.equipmentMaterial,{cast:!alpha,reflection:!alpha});object.frustumCulled=false;object.userData.kind=kind;c.dynamic.push(object);}if(alpha)object.renderOrder=2;retained.add(object);
   }
   c.dynamic=c.dynamic.filter(obj=>{if(retained.has(obj))return true;c.scene.remove(obj);obj.geometry.dispose();c.geometries.delete(obj.geometry);return false;});
   // Short-lived ice spray follows actual braking and recorded motion, including seek/replay.
   const positions=[],clock=f.wall??f.time;
   if(c.quality!=='low')for(const a of f.actors){const pose=poses.get(a.id);if(a.role==='G'||pose.brake<.30||pose.speed<1)continue;
    const slot=Math.floor(clock*12);
    for(let i=0;i<12;i++){const age=((clock*12)%1+i/12)/12,side=i%2?1:-1,foot=pose.feet[i%2],spread=Math.sin((slot*13+i*31+(a.number||0))*1.71);positions.push(foot[0]-Math.cos(pose.angle)*pose.speed*age+Math.sin(pose.angle)*spread*.22,.03+Math.sin(age/.09*Math.PI)*.14,foot[2]-Math.sin(pose.angle)*pose.speed*age-Math.cos(pose.angle)*spread*.22+side*.03);}}
   c.spray.geometry.setAttribute('position',new c.T.Float32BufferAttribute(positions,3));c.spray.visible=positions.length>0;c.sprayCount=positions.length/3;
   c.geometryKey=key;c.geometryBuilds++;c.buildMS=performance.now()-start;c.dynamicCount=data.length/9;return true;
  }
  function clubArt(c,options,f){
   const key=JSON.stringify([options.teams,options.homeSide,options.arena,(options.teams||[]).map(t=>Boolean(typeof matchIceCrest==='function'&&matchIceCrest(t.name)))]);
   if(key!==c.artKey){
    const art=core.sceneData.arenaTextures(options.teams,options.homeSide??0,options.arena);
    const replace=(owner,prop,canvas)=>{if(owner[prop]){owner[prop].dispose();c.textures.delete(owner[prop]);}owner[prop]=texture(c,canvas);};
    replace(c,'iceTexture',art.ice);replace(c,'boardTexture',art.board);c.iceMaterial.map=c.iceTexture;c.iceMaterial.needsUpdate=true;
    for(const m of c.boardMaterials){m.map=c.boardTexture;m.needsUpdate=true;}c.artKey=key;c.textureBuilds++;
   }
   const scoreboardKey=JSON.stringify([f.score,Math.floor(f.time),options.teams,options.arena,options.homeSide]);if(c.scoreboardKey!==scoreboardKey){
    const canvas=c.scoreCanvas,x=canvas.getContext('2d'),home=options.homeSide??0,away=1-home,score=[f.score?.[home]||0,f.score?.[away]||0];x.fillStyle='#061523';x.fillRect(0,0,1024,384);x.textAlign='center';x.textBaseline='middle';
    x.fillStyle='#d6ba78';x.font='600 33px Arial';x.fillText((options.arena||'HOCKEY').toUpperCase(),512,48,950);
    x.fillStyle='#f2f7ff';x.font='bold 42px Arial';x.fillText(options.teams?.[home]?.code||options.teams?.[home]?.name||'HEMMA',235,124,390);x.fillText(options.teams?.[away]?.code||options.teams?.[away]?.name||'BORTA',789,124,390);
    x.font='bold 133px Arial';x.fillText(score.join(' – '),512,235);x.fillStyle='#9eafbf';x.font='38px Arial';x.fillText(String(Math.floor(f.time/60)).padStart(2,'0')+':'+String(Math.floor(f.time%60)).padStart(2,'0'),512,344);
    c.scoreTexture.needsUpdate=true;c.scoreboardKey=scoreboardKey;
   }
  }
  function bench(c,f,options){
   const rows=(options.benches||[]).map((team,side)=>team.slice(0,8).map(p=>({...p,side}))).flat(),key=JSON.stringify([rows.map(p=>[p.id,p.side]),options.teams]);if(key===c.benchKey)return;
   while(c.benchGroup.children.length){const obj=c.benchGroup.children[0];c.benchGroup.remove(obj);obj.geometry.dispose();c.geometries.delete(obj.geometry);}
   const kits=core.kits(options.teams||[]),g=core.sceneData.geometry();
   for(let i=0;i<rows.length;i++){const a=rows[i],at=rows.slice(0,i).filter(p=>p.side===a.side).length,x=(a.side?37:23)-3.5+at,kit=kits[a.side];g.ellipsoid([x,1.17,-1.55],[.22,.30,.16],kit.jersey);g.ellipsoid([x,1.63,-1.55],[.16,.18,.15],kit.jersey);g.box(x,.86,-1.28,.36,.14,.55,[.05,.08,.12]);g.rod([x+.25,.7,-1.0],[x+.25,2.0,-1.45],.025,[.10,.13,.17]);}
   for(const side of [0,1])for(const at of [-1,1]){const x=(side?37:23)+at*2.5;g.ellipsoid([x,1.2,-2.75],[.23,.4,.18],[.09,.12,.17]);g.ellipsoid([x,1.76,-2.75],[.13,.17,.13],[.72,.55,.42]);g.rod([x-.12,.05,-2.75],[x-.12,.88,-2.75],.09,[.07,.09,.12]);g.rod([x+.12,.05,-2.75],[x+.12,.88,-2.75],.09,[.07,.09,.12]);}
   if(rows.length){const geo=geometry(c.T,g.data),obj=new c.T.Mesh(geo,c.equipmentMaterial);c.geometries.add(geo);c.benchGroup.add(obj);}c.benchKey=key;c.benchPlayers=rows.length;
  }
  function create(canvas){
   const T=HockeyThree,renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'}),scene=new T.Scene();scene.background=new T.Color('#07121e');scene.fog=new T.Fog('#07121e',60,125);
   renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.03;renderer.shadowMap.enabled=true;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.type=T.PCFShadowMap;
   const c={T,canvas,renderer,scene,camera:new T.PerspectiveCamera(),mirror:new T.PerspectiveCamera(),reflection:new T.WebGLRenderTarget(384,192,{depthBuffer:true}),players:new Map(),textures:new Set(),materials:new Set(),geometries:new Set(),dynamic:[],frames:0,geometryBuilds:0,shadowBuilds:0,reflectionBuilds:0,textureBuilds:0,frameTimes:[],hits:[],quality:'normal'};
   scene.add(new T.HemisphereLight('#d7e7f6','#2b3849',1.65));
   const light=new T.DirectionalLight('#fff5e6',2.8);light.position.set(26,32,11);light.target.position.set(30,0,15);light.castShadow=true;Object.assign(light.shadow.camera,{left:-36,right:36,top:23,bottom:-23,near:1,far:80});light.shadow.bias=-.00035;light.shadow.normalBias=.025;light.shadow.radius=2;scene.add(light,light.target);c.light=light;
   const fill=new T.DirectionalLight('#b4d9ff',.65);fill.position.set(45,17,38);scene.add(fill);for(const l of [light,fill,...scene.children.filter(o=>o.isHemisphereLight)])l.layers.enable(1);
   environment(c);buildRink(c);arena(c);
   c.contactMaterial=new T.MeshBasicMaterial({vertexColors:true,transparent:true,depthWrite:false,side:T.DoubleSide});c.materials.add(c.contactMaterial);c.equipmentMaterial=material(c,{roughness:.57});
   const sprayMaterial=new T.PointsMaterial({color:'#eaf5ff',size:.065,transparent:true,opacity:.52,depthWrite:false});c.materials.add(sprayMaterial);const sprayGeometry=new T.BufferGeometry();sprayGeometry.setAttribute('position',new T.Float32BufferAttribute([],3));c.geometries.add(sprayGeometry);c.spray=new T.Points(sprayGeometry,sprayMaterial);c.spray.frustumCulled=false;scene.add(c.spray);
   c.scoreCanvas=document.createElement('canvas');c.scoreCanvas.width=1024;c.scoreCanvas.height=384;c.scoreTexture=texture(c,c.scoreCanvas);c.scoreMaterial.map=c.scoreTexture;
   c.lost=e=>{e.preventDefault();canvas.dataset.error='Grafiken avbröts. Välj 2D eller försök 3D igen.';};canvas.addEventListener('webglcontextlost',c.lost);return c;
  }
  function dispose(){
   core.dispose();if(!current)return;const c=current;current=null;c.canvas.removeEventListener('webglcontextlost',c.lost);
   for(const p of c.players.values())p.skeleton.dispose();for(const g of c.geometries)g.dispose();for(const m of c.materials)m.dispose();for(const t of c.textures)t.dispose();c.environment.dispose();c.reflection.dispose();c.light.shadow.map?.dispose();c.renderer.dispose();c.renderer.forceContextLoss();
  }
  function cameraView(c,f,options){
   const view=core.cameraFrame(c.canvas.width/c.canvas.height,options.camera,f,c.tracked,options.zoom);c.tracked=view.tracked;
   // The automatic director closes in only after an observed stoppage or in replay.
   const event=(f.effects||[]).filter(e=>e.at<=(f.wall??f.time)&&['goal','save'].includes(e.kind)).at(-1),age=event?(f.wall??f.time)-event.at:Infinity;
   const close=options.camera==='auto'&&f.phase==='stoppage'&&age>.8&&age<3.1?Math.sin((age-.8)/2.3*Math.PI):0;
   if(close){const focus=f.actors.find(a=>event.kind==='save'?a.role==='G'&&a.side===event.side:a.side===event.side&&a.action?.kind==='shot'&&a.action.at<=event.at&&event.at-a.action.at<2)||f.actors.find(a=>a.side===event.side&&a.role!=='G');if(focus){view.target=view.target.map((v,i)=>v+([focus.x,.9,focus.y][i]-v)*close*.75);view.eye=view.eye.map((v,i)=>v+([focus.x+4,4.2,focus.y+9][i]-v)*close*.75);}}
   if(options.replay&&options.camera==='auto'){view.eye[0]+=5;view.eye[1]*=.78;}
   const cam=c.camera;cam.position.fromArray(view.eye);cam.up.set(0,1,0);cam.lookAt(...view.target);cam.aspect=c.canvas.width/c.canvas.height;cam.fov=view.fov*180/Math.PI;cam.near=view.near;cam.far=view.far;cam.updateProjectionMatrix();cam.updateMatrixWorld();c.matrix=new c.T.Matrix4().multiplyMatrices(cam.projectionMatrix,cam.matrixWorldInverse).elements;c.view=view;
  }
  function draw(canvas,frame,before,t,options={}){
   if(!ready())return core.draw(canvas,frame,before,t,options);if(!frame||canvas.dataset.error)return false;
   if(current?.canvas!==canvas){dispose();try{current=create(canvas);}catch(error){canvas.dataset.error='3D kunde inte starta på den här datorn. 2D är fortfarande tillgängligt.';console.warn('3D renderer',error);return false;}}
   const c=current,T=c.T;if(c.renderer.getContext().isContextLost())return false;if(options.suspended&&canvas.dataset.ready==='true'){c.lastDraw=null;return true;}
   const start=performance.now(),q=core.quality(options.quality),rect=canvas.getBoundingClientRect(),dpr=Math.min(q.dpr,globalThis.devicePixelRatio||1)*q.scale,w=Math.max(1,Math.round(rect.width*dpr)),h=Math.max(1,Math.round(rect.height*dpr));
   if(canvas.width!==w||canvas.height!==h)c.renderer.setSize(w,h,false);
   const level=['low','normal','high'].includes(options.quality)?options.quality:'normal',changedQuality=c.quality!==level;c.quality=level;
   if(c.shadowSize!==q.shadowSize){c.light.shadow.map?.dispose();c.light.shadow.map=null;c.light.shadow.mapSize.set(q.shadowSize||512,q.shadowSize||512);c.light.castShadow=Boolean(q.shadowSize);c.shadowSize=q.shadowSize;c.geometryKey=null;}
   const f=options.sampled||core.sample(frame,before,t);cameraView(c,f,options);clubArt(c,options,f);players(c,f,options);updateCrowd(c,f,options,q);bench(c,f,options);const changed=updateGeometry(c,f,options);
   const analysisKey=JSON.stringify(options.analysis||null);if(analysisKey!==c.analysisKey){if(c.analysis){c.scene.remove(c.analysis);c.analysis.geometry.dispose();c.geometries.delete(c.analysis.geometry);}c.analysisCount=0;c.analysis=null;if(options.analysis){const rows=core.analysisGeometry(options.analysis);c.analysisCount=rows.length/9;c.analysis=mesh(c,geometry(T,rows),c.equipmentMaterial,{receive:false});}c.analysisKey=analysisKey;}
   if(changed&&q.shadowSize){c.renderer.shadowMap.needsUpdate=true;c.shadowBuilds++;}
   const cameraKey=Array.from(c.matrix).join(','),reflectionSize=q.level>1?768:384;
   if(q.level>0&&(changed||cameraKey!==c.reflectionCamera||changedQuality)){
    const reflectionHeight=Math.max(128,Math.round(reflectionSize*h/w));if(c.reflection.width!==reflectionSize||c.reflection.height!==reflectionHeight)c.reflection.setSize(reflectionSize,reflectionHeight);
    c.mirror.copy(c.camera);c.mirror.position.y=-c.camera.position.y;c.mirror.up.set(0,-1,0);c.mirror.lookAt(c.view.target[0],-c.view.target[1],c.view.target[2]);c.mirror.layers.set(1);c.mirror.updateMatrixWorld();
    const bias=new T.Matrix4().set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1);c.reflectionUniforms.rinkProjection.value.copy(bias).multiply(c.mirror.projectionMatrix).multiply(c.mirror.matrixWorldInverse);
    const background=c.scene.background;c.scene.background=null;c.renderer.setClearColor(0x000000,0);c.renderer.setRenderTarget(c.reflection);c.renderer.render(c.scene,c.mirror);c.renderer.setRenderTarget(null);c.scene.background=background;c.reflectionBuilds++;c.reflectionCamera=cameraKey;
   }
   c.reflectionUniforms.rinkReflectivity.value=q.level>0?.18:0;
   c.renderer.render(c.scene,c.camera);c.frames++;canvas.dataset.ready='true';
   c.hits=f.actors.map(a=>({id:a.id,name:a.name,number:a.number,...core.project([a.x,1,a.y],c.matrix)}));
   const label=document.getElementById('match-3d-carrier'),carrier=c.hits.find(a=>a.id===f.carrier);if(label){label.hidden=!carrier;if(carrier){label.textContent=(carrier.number?'#'+carrier.number+' ':'')+carrier.name;label.style.left=clamp(carrier.x*100,8,92)+'%';label.style.top=clamp(carrier.y*100-8,8,85)+'%';}}
   const marker=document.getElementById('match-3d-puck');if(marker){const p=core.project([f.puck.x,.1+(f.puck.z||0),f.puck.y],c.matrix);marker.hidden=Boolean(f.puck.heldBy)||options.puckMarker===false||p.x<0||p.x>1||p.y<0||p.y>1;marker.style.left=p.x*100+'%';marker.style.top=p.y*100+'%';}
   c.renderMS=performance.now()-start;if(options.moving&&c.lastDraw!=null&&start-c.lastDraw<1000){c.motionFrames=(c.motionFrames||0)+1;if(c.lastWall!==f.wall)c.motionAdvances=(c.motionAdvances||0)+1;c.frameTimes.push(start-c.lastDraw);if(c.frameTimes.length>180)c.frameTimes.shift();}c.lastDraw=start;c.lastWall=f.wall;return true;
  }
  function diagnostics(){if(!current)return core.diagnostics();const c=current;return {renderer:'three',quality:c.quality,shadowSupported:true,shadowMode:c.shadowSize?'projected':'contact',shadowSize:c.shadowSize,shadowBuilds:c.shadowBuilds,reflectionBuilds:c.reflectionBuilds,textureBuilds:c.textureBuilds,arenaVertices:c.arenaVertices,shadowCasterVertices:c.shadowCasterVertices,glassVertices:c.glassVertices,motionFrames:c.motionFrames||0,motionAdvances:c.motionAdvances||0,width:c.canvas.width,height:c.canvas.height,frames:c.frames,actors:c.hits.length,vertices:c.dynamicCount+c.skinVertices,skinVertices:c.skinVertices,modelActors:c.players.size,rigJoints:15,renderMS:c.renderMS,frameSamples:c.frameTimes.length,frameP95:c.frameTimes.length?[...c.frameTimes].sort((a,b)=>a-b)[Math.floor((c.frameTimes.length-1)*.95)]:null,crowdVertices:c.crowdVertices,crowdInstances:c.crowdCount,benchPlayers:c.benchPlayers||0,analysisVertices:c.analysisCount||0,geometryBuilds:c.geometryBuilds,buildMS:c.buildMS,gpuSkinning:true,sprayParticles:c.sprayCount||0,drawCalls:c.renderer.info.render.calls,error:c.renderer.getContext().getError()};}
  function pick(canvas,x,y){if(!current)return core.pick(canvas,x,y);if(current.canvas!==canvas)return null;const r=canvas.getBoundingClientRect();return current.hits.map(a=>({...a,d:Math.hypot(a.x*r.width-x,a.y*r.height-y)})).filter(a=>a.d<24).sort((a,b)=>a.d-b.d)[0]?.id??null;}
  return {...core,draw,dispose,pick,diagnostics};
 }
 return {connect};
})();
