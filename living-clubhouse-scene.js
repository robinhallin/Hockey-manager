'use strict';
// Offline, cosmetic room renderer. It reads a snapshot; animation never advances
// the calendar, alters attributes, or calls the match engine.
const ClubhouseScene=(()=>{
 let active=null,builds=0;
 const skin={light:0xe6b995,medium:0xb97d56,dark:0x704735},hair={brown:0x49372d,blond:0xcda968,black:0x272329,silver:0x9a9f9e};
 const hash=s=>Array.from(String(s)).reduce((h,c)=>(Math.imul(h,31)+c.charCodeAt(0))>>>0,17);
 function dispose(){
  if(!active)return;const c=active;active=null;
  cancelAnimationFrame(c.frame);c.resize?.disconnect();document.removeEventListener('visibilitychange',c.visibility);c.canvas.removeEventListener('click',c.walk);
  for(const g of c.geometries)g.dispose();for(const m of c.materials.values())m.dispose();for(const t of c.textures)t.dispose();
  c.renderer?.dispose();c.renderer?.forceContextLoss();
 }
 function material(c,color,roughness=.78){const key=String(color)+':'+roughness;if(!c.materials.has(key))c.materials.set(key,new c.T.MeshStandardMaterial({color,roughness}));return c.materials.get(key);}
 function mesh(c,geo,color,parent=c.scene){c.geometries.add(geo);const m=new c.T.Mesh(geo,material(c,color));m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 function shape(c,key,make){if(!c.shapes.has(key))c.shapes.set(key,make());return c.shapes.get(key);}
 function box(c,w,h,d,x,y,z,color,parent){
  const geo=shape(c,`b:${w}:${h}:${d}`,()=>{const g=new c.T.BoxGeometry(w,h,d,2,2,2),p=g.attributes.position,r=Math.min(w,h,d)*.12,v=new c.T.Vector3();for(let i=0;i<p.count;i++){const px=p.getX(i),py=p.getY(i),pz=p.getZ(i),cx=Math.max(-w/2+r,Math.min(w/2-r,px)),cy=Math.max(-h/2+r,Math.min(h/2-r,py)),cz=Math.max(-d/2+r,Math.min(d/2-r,pz));v.set(px-cx,py-cy,pz-cz).normalize().multiplyScalar(r);p.setXYZ(i,cx+v.x,cy+v.y,cz+v.z);}g.computeVertexNormals();return g;});
  const m=mesh(c,geo,color,parent);m.position.set(x,y,z);return m;
 }
 function sphere(c,r,x,y,z,color,parent,sx=1,sy=1,sz=1){const m=mesh(c,shape(c,'s:'+r,()=>new c.T.SphereGeometry(r,20,14)),color,parent);m.position.set(x,y,z);m.scale.set(sx,sy,sz);return m;}
 function cylinder(c,top,bottom,h,x,y,z,color,parent){const m=mesh(c,shape(c,`c:${top}:${bottom}:${h}`,()=>new c.T.CylinderGeometry(top,bottom,h,16)),color,parent);m.position.set(x,y,z);return m;}
 function planeLabel(c,text,w,h,color,bg,x,y,z,parent=c.scene,size=42){
  const canvas=document.createElement('canvas');canvas.width=768;canvas.height=Math.round(768*h/w);const ctx=canvas.getContext('2d');
  ctx.fillStyle=bg;ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle=color;ctx.font=`600 ${size}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,384,canvas.height/2,720);
  const texture=new c.T.CanvasTexture(canvas);texture.colorSpace=c.T.SRGBColorSpace;c.textures.add(texture);
  const mat=new c.T.MeshBasicMaterial({map:texture,side:c.T.DoubleSide});c.materials.set('label:'+c.materials.size,mat);
  const geo=new c.T.PlaneGeometry(w,h);c.geometries.add(geo);const p=new c.T.Mesh(geo,mat);p.position.set(x,y,z);parent.add(p);return p;
 }
 function rinkTexture(c){
  const a=document.createElement('canvas');a.width=1024;a.height=600;const x=a.getContext('2d');x.fillStyle='#c7ded5';x.fillRect(0,0,1024,600);
  x.strokeStyle='#5f827d';x.lineWidth=4;x.beginPath();x.roundRect(30,25,964,550,95);x.stroke();
  for(const px of [345,679]){x.strokeStyle='#528da9';x.lineWidth=9;x.beginPath();x.moveTo(px,35);x.lineTo(px,565);x.stroke();}
  x.strokeStyle='#b27265';x.lineWidth=5;x.beginPath();x.moveTo(512,30);x.lineTo(512,570);x.stroke();
  for(const [cx,cy,r] of [[512,300,66],[180,155,63],[180,445,63],[844,155,63],[844,445,63]]){x.beginPath();x.arc(cx,cy,r,0,Math.PI*2);x.stroke();}
  const positions=[[205,300],[420,180],[420,420],[705,125],[660,300],[705,475]];
  const ids=state.lines?[state.lines.goalie,...state.lines.defense.slice(0,2),...state.lines.forwards.slice(0,3)]:[];
  positions.forEach(([px,py],i)=>{x.fillStyle=i?'#264f5b':'#a56a46';x.beginPath();x.arc(px,py,23,0,Math.PI*2);x.fill();x.fillStyle='#fff';x.textAlign='center';x.font='bold 20px sans-serif';x.fillText(['MV','VB','HB','VF','C','HF'][i],px,py+7);const p=ids[i]!=null?playerById(ids[i]):null;if(p){x.fillStyle='#284647';x.font='600 18px sans-serif';x.fillText(p.name.split(' ').at(-1),px,py+49,160);}});
  x.strokeStyle='#527b69';x.lineWidth=5;x.setLineDash([10,8]);x.beginPath();x.moveTo(445,180);x.quadraticCurveTo(590,100,700,125);x.stroke();x.setLineDash([]);
  const t=new c.T.CanvasTexture(a);t.colorSpace=c.T.SRGBColorSpace;c.textures.add(t);return t;
 }
 function board(c,x,y,z,w=4.5,h=2.5){
  box(c,w+.18,h+.18,.14,x,y,z,0x9b8060);const geo=new c.T.PlaneGeometry(w,h);c.geometries.add(geo);
  const mat=new c.T.MeshBasicMaterial({map:rinkTexture(c)});c.materials.set('board',mat);const m=new c.T.Mesh(geo,mat);m.position.set(x,y,z+.08);c.scene.add(m);
  box(c,w+.15,.07,.23,x,y-h/2-.1,z+.1,0x59685f);for(let i=0;i<3;i++)box(c,.23,.035,.045,x-1+i*.3,y-h/2-.05,z+.16,[0xce695a,0x60829c,0x3b4b46][i]);
 }
 function plant(c,x,z,scale=1){
  const g=new c.T.Group();g.position.set(x,0,z);g.scale.setScalar(scale);c.scene.add(g);cylinder(c,.24,.18,.45,0,.22,0,0xad8a64,g);
  for(let i=0;i<9;i++){const angle=i*2.4;sphere(c,.32,Math.cos(angle)*.22,.65+(i%3)*.24,Math.sin(angle)*.22,0x456956,g,.42,1.6,.7);}
 }
 function chair(c,x,z,rotation=0){const g=new c.T.Group();g.position.set(x,0,z);g.rotation.y=rotation;c.scene.add(g);
  cylinder(c,.43,.43,.13,0,.7,0,0x293f49,g);box(c,.82,.83,.12,0,1.1,-.31,0x314b56,g);cylinder(c,.07,.08,.62,0,.33,0,0x3e4950,g);
  for(let i=0;i<5;i++){const a=i*Math.PI*2/5,b=box(c,.07,.07,.48,Math.sin(a)*.16,.08,Math.cos(a)*.16,0x39444a,g);b.rotation.y=a;}return g;}
 function actor(c,options){
  const {id='coach',coach=false,sitting=false,color=0x1e4165,number='',absent=false}=options;
  const seed=hash(id),g=new c.T.Group(),body=new c.T.Group();g.add(body);
  const complexion=coach?skin[c.appearance.skin]||skin.light:[0xe5b58f,0xd5a07a,0xb98560,0x855c44][seed%4],headHair=coach?hair[c.appearance.hair]||hair.brown:[0x4c392c,0xb99b65,0x2a292a,0x795944][(seed>>>3)%4];
  const suit=coach&&c.appearance.outfit!=='tracksuit',shirt=coach?(suit?0x314653:0x1f4b55):color;
  const torso=box(c,.64,.77,.34,0,1.12,0,shirt,body);box(c,.7,.07,.36,0,.84,0,coach?0x39434c:c.model.color,body);
  if(suit){box(c,.19,.58,.017,0,1.23,.18,0xe8e2cc,body);const tie=box(c,.065,.4,.03,0,1.23,.2,0xb78855,body);tie.rotation.z=.06;}
  else if(coach){box(c,.035,.64,.025,0,1.15,.18,0xa5c7bb,body);}else{planeLabel(c,String(number),.29,.26,'#f1e5bb','#27465c',0,1.17,.181,body,300);}
  cylinder(c,.1,.11,.15,0,1.58,0,complexion,body);
  const head=new c.T.Group();head.position.y=1.87;body.add(head);
  sphere(c,.245,0,0,0,complexion,head,.85,1.06,.9);sphere(c,.248,0,.115,-.035,headHair,head,.87,.65,.89);
  for(const s of [-1,1]){sphere(c,.049,s*.21,-.01,0,complexion,head,.5,1,.7);sphere(c,.022,s*.083,.015,.205,0x263037,head,.85,1,.5);}
  sphere(c,.045,0,-.044,.215,complexion,head,.55,.7,.8);const mouth=box(c,.066,.013,.018,0,-.115,.19,0x875f50,head);
  if(seed%3===0&&!coach)sphere(c,.21,0,-.105,-.005,headHair,head,.88,.35,.97);
  const arms=[],legs=[];for(const s of [-1,1]){
   const arm=new c.T.Group();arm.position.set(s*.39,1.45,0);body.add(arm);cylinder(c,.11,.095,.55,0,-.24,0,shirt,arm);sphere(c,.09,0,-.54,0,complexion,arm);arm.rotation.z=s*.12;arms.push(arm);
   const leg=new c.T.Group();leg.position.set(s*.17,.76,0);body.add(leg);legs.push(leg);
   if(sitting){const thigh=cylinder(c,.115,.105,.4,0,-.05,.17,0x253947,leg);thigh.rotation.x=-Math.PI/2;cylinder(c,.105,.075,.5,0,-.3,.35,0x253947,leg);box(c,.22,.13,.39,0,-.57,.43,0x222d33,leg);}
   else{cylinder(c,.115,.085,.69,0,-.33,0,0x253947,leg);box(c,.22,.13,.37,0,-.7,.07,0x222d33,leg);}
  }
  if(sitting){body.position.y=-.04;arms.forEach((a,i)=>{a.rotation.x=-.65;a.rotation.z=i?.1:-.1;});}
  for(const s of [-1,1]){box(c,.075,.013,.022,s*.083,.063,.208,headHair,head);sphere(c,.009,s*.079,.02,.218,0xe4e5dd,head);}
  if(suit){for(const s of [-1,1]){const lapel=box(c,.095,.43,.035,s*.13,1.29,.19,0x465d69,body);lapel.rotation.z=s*-.27;}for(let i=0;i<2;i++)sphere(c,.014,.06,1.05-i*.12,.185,0xc7b28a,body);}
  else if(!coach){for(const s of [-1,1])box(c,.16,.055,.36,s*.25,1.42,0,0xe7d6a6,body);box(c,.65,.045,.36,0,.91,0,0xe7d6a6,body);}
  const player=c.model.players.find(p=>p.id===String(id));
  g.userData={id,body,head,arms,legs,seed,sitting,absent,torso,mouth,fatigue:player?.fatigue||0,trust:player?.trust??60};c.actors.push(g);c.scene.add(g);return g;
 }
 function shell(c){
  c.scene.background=new c.T.Color(0x182932);c.scene.fog=new c.T.Fog(0x182932,24,43);
  box(c,12.8,.32,9,0,-.22,0,0x3b4b4d);box(c,12.4,.12,8.6,0,-.03,0,0x9b856c);
  for(let i=0;i<18;i++)box(c,.63,.012,8.5,-5.9+i*.69,.035,0,i%3===0?0x968069:i%3===1?0xa58e73:0x9f8b73);
  box(c,12.4,3.6,.17,0,1.8,-4.25,0x425c62);box(c,.17,3.6,8.6,-6.2,1.8,0,0x354f56);
  box(c,12.4,.18,.26,0,.1,-4.13,0x263d45);box(c,.27,.18,8.6,-6.08,.1,0,0x263d45);
  box(c,12.6,.11,.3,0,3.63,-4.2,0xb8b096);box(c,.3,.11,8.7,-6.16,3.63,0,0xb8b096);
  for(let i=0;i<32;i++)box(c,.055,1.04,.05,-6+i*.38,.67,-4.14,0x6e7970);
  box(c,12.1,.025,.04,0,1.24,-4.12,0xc4af80);box(c,12,.025,.04,0,3.42,-4.1,0xe0d4a8);
  const ambient=new c.T.HemisphereLight(0xe2f2ef,0x675544,2.2);c.scene.add(ambient);
  const sun=new c.T.DirectionalLight(c.model.life?.phase==='after'?0xffd3a5:0xffe4bc,c.model.life?.phase==='after'?2.5:3.1);sun.position.set(-3,9,5);sun.castShadow=true;sun.shadow.mapSize.set(1536,1536);sun.shadow.camera.left=-9;sun.shadow.camera.right=9;sun.shadow.camera.top=8;sun.shadow.camera.bottom=-8;sun.shadow.normalBias=.035;c.scene.add(sun);
  const rim=new c.T.DirectionalLight(0x97d5e4,1.2);rim.position.set(5,4,-4);c.scene.add(rim);
 }
 function door(c,x,z,label){
  box(c,1.48,2.73,.18,x,1.36,z,0xb39d7b);box(c,1.28,2.58,.2,x,1.29,z+.025,0x263e47);box(c,1.04,1.32,.04,x,1.76,z+.14,0x6d8d92);box(c,.07,.25,.08,x+.4,1.05,z+.17,0xc4b899);
  planeLabel(c,label,1.18,.25,'#e1ddc5','#263e47',x,2.82,z+.12,c.scene,75);
 }
 function laptop(c,x,y,z,label){
  box(c,.92,.045,.6,x,y,z,0x303f49);const screen=box(c,.92,.61,.045,x,y+.3,z-.26,0x253844);screen.rotation.x=-.13;
  planeLabel(c,label,.8,.46,'#b9e2d7','#172e3b',x,y+.32,z-.21,c.scene,50);
  for(let row=0;row<3;row++)for(let col=0;col<8;col++)box(c,.065,.01,.045,x-.3+col*.085,y+.028,z-.08+row*.075,0x718188);
 }
 function frame(c,title,subtitle,x,y,z,w=1.7,h=1.1){
  box(c,w+.12,h+.12,.09,x,y,z,0xbaa580);planeLabel(c,title,w,h,'#d5d6b8','#24414c',x,y,z+.05,c.scene,65);
  if(subtitle)planeLabel(c,subtitle,w*.9,.18,'#e8dec5','#24414c',x,y-h*.3,z+.056,c.scene,42);
 }
 function lamp(c,x,z){cylinder(c,.23,.23,.04,x,.09,z,0x354750);cylinder(c,.025,.025,2.32,x,1.25,z,0xb9a176);cylinder(c,.27,.4,.42,x,2.45,z,0xd9c99f);cylinder(c,.25,.25,.012,x,2.23,z,0xffedbb);}
 function books(c,x,y,z,count=6){for(let i=0;i<count;i++){const h=.26+(i%3)*.055;box(c,.095,h,.29,x+i*.115,y+h/2,z,[0x426b68,0xb18c5f,0x3c526e,0x986c60][i%4]);box(c,.07,.012,.01,x+i*.115,y+h*.76,z+.15,0xd8ccb0);}}
 function puck(c,x,z){cylinder(c,.065,.065,.035,x,.13,z,0x26333b);}
 function stick(c,x,y,z,rotation=0,parent){const g=new c.T.Group();g.position.set(x,y,z);g.rotation.y=rotation;(parent||c.scene).add(g);const shaft=box(c,.035,1.25,.035,0,.65,0,0x3a444a,g);shaft.rotation.z=-.25;box(c,.28,.065,.045,-.05,.055,0,0xd5bd83,g);box(c,.042,.2,.044,.13,1.16,0,0xe1d4b6,g);return g;}
 function office(c){
  shell(c);board(c,.9,2.02,-4.08,4.6,2.45);door(c,4.73,-4.08,'OMKLÄDNINGSRUM');
  // Window light and a city silhouette on the side wall.
  for(let z=-2.8;z<=-.7;z+=2.05){const w=box(c,.09,2,1.75,-6.07,2.08,z,0x8bb4b7);box(c,.13,.06,1.8,-6,2.06,z,0xe0d9bc);box(c,.13,2.05,.055,-6,2.08,z,0xe0d9bc);}
  box(c,4,.11,2.1,-2.4,.09,1.05,0x526b6b);for(let i=0;i<9;i++)box(c,3.9,.012,.025,-2.4,.15,.1+i*.23,0x6e8380);
  box(c,3.4,.16,1.45,-2.4,1.15,.75,0xb49a73);box(c,.16,1.08,1.25,-3.94,.55,.75,0x394b50);box(c,.16,1.08,1.25,-.86,.55,.75,0x394b50);
  for(let i=0;i<4;i++){const paper=box(c,.46,.013,.57,-3.3+i*.07,1.25+i*.014,.97,0xe8dfc5);paper.rotation.y=-.15+i*.06;}
  cylinder(c,.09,.07,.2,-1.3,1.34,1.02,0xc2b598);cylinder(c,.065,.065,.01,-1.3,1.445,1.02,0x55453d);
  chair(c,-2.4,-.8,0);chair(c,-3.5,2.25,Math.PI+.15);chair(c,-1.8,2.35,Math.PI-.15);
  // Scout's station: folders, pinned reports, a second seat.
  box(c,2.15,1.15,.7,-4.8,.61,-3.65,0x9a805e);box(c,2.35,.1,.88,-4.8,1.22,-3.64,0xb8a17e);
  for(let i=0;i<7;i++)box(c,.12,.44,.36,-5.5+i*.2,1.49,-3.68,[0x647e72,0x344c62,0xb08b5a][i%3]);
  planeLabel(c,'SCOUTING',1.5,.3,'#e7dfc3','#425c62',-4.8,2.45,-4.13,c.scene,95);
  // Club history and a small trophy cabinet.
  box(c,1.8,1.02,.7,4.8,.52,1.4,0x8d765c);box(c,1.95,.09,.83,4.8,1.08,1.4,0xb8a07b);
  for(let i=0;i<3;i++){cylinder(c,.13,.07,.35,4.3+i*.45,1.3,1.4,0xc7ab65);cylinder(c,.17,.17,.05,4.3+i*.45,1.12,1.4,0x34454c);}
  plant(c,-5.55,2.9,1.3);plant(c,5.4,-2.6,.9);
  // Small usable objects make this a working office, not an empty showroom.
  laptop(c,-2.45,1.27,.45,'MATCHPLAN · '+c.model.club.toUpperCase());
  books(c,-5.6,1.28,-3.6,8);lamp(c,-.6,-3.2);frame(c,c.model.club.toUpperCase(),'VÅR IDENTITET',-3.1,2.55,-4.12,1.55,1.05);
  frame(c,String(c.model.date),'TRÄNARENS KALENDER',-4.9,3.1,-4.12,1.6,.55);
  for(let i=0;i<5;i++){box(c,.012,.012,.38,-3.43+i*.055,1.32,1,0x9eaa9f);}
  for(let z=-2.8;z<=-.7;z+=2.05)for(let i=0;i<9;i++)box(c,.14,.022,1.75,-5.98,1.35+i*.18,z,0xa3b5b0);
  const phone=box(c,.18,.035,.33,-1.65,1.26,1,0x24343e);phone.rotation.y=.22;
  const coach=actor(c,{coach:true});coach.position.set(.8,0,1.1);coach.rotation.y=-.2;c.coach=coach;
  c.anchors={board:[1,2,-3.55],desk:[-2.4,1.35,1.3],scout:[-4.8,1.7,-3.5],cabinet:[4.8,1.5,1.5],door:[4.75,1.65,-3.4],coach:[.8,2.45,1.1]};
  const v=c.model.life?.visitor,p=v&&c.model.players.find(p=>p.id===v.playerId&&p.presence.present);
  if(p){const visitor=actor(c,{id:p.id,sitting:true,color:0x254c69,number:p.number});visitor.position.set(-1.8,0,2.35);visitor.rotation.y=Math.PI-.15;c.playerActors.set(p.id,visitor);c.visitor=p.id;c.anchors.visitor=[-1.8,1,2.5];}
 }
 function lockerSeat(c,p,index){
  const back=Math.min(10,c.model.players.length),side=Math.ceil((c.model.players.length-back)/2),left=index>=back&&index<back+side;
  const x=index<back?-4.75+index*(9.5/Math.max(1,back-1)):left?-5.55:5.55,z=index<back?-3.62:-2.65+(index-back-(left?0:side))*(5.8/Math.max(1,side-1)),rotation=index<back?0:left?Math.PI/2:-Math.PI/2;
  const station=new c.T.Group();station.position.set(x,0,z);station.rotation.y=rotation;c.scene.add(station);
  // Each member has a fixed, numbered station. Absent members keep an empty seat.
  box(c,.92,2.3,.38,0,1.18,-.22,0x344e59,station);box(c,.8,1.95,.04,0,1.15,.005,0x46636a,station);box(c,.92,.13,.7,0,.48,.32,0xa78d67,station);
  for(const s of [-1,1]){box(c,.055,2.34,.5,s*.45,1.18,-.1,0x7b8c87,station);box(c,.04,.39,.5,s*.35,.23,.31,0x263d45,station);}
  box(c,.84,.035,.4,0,1.93,-.13,0xc4ac7f,station);sphere(c,.16,0,2.09,-.09,0x243e54,station,1,.72,1);box(c,.13,.035,.15,0,2.06,.09,0xb4c3bc,station);
  planeLabel(c,String(p.number)+' · '+p.name.split(' ').at(-1).toUpperCase(),.8,.22,'#ebdfb5','#263e4a',0,2.36,.04,station,70);
  box(c,.3,.055,.4,.22,.58,.35,0xd6d4c2,station);stick(c,-.35,.05,.08,.1,station);
  if(p.presence.present){const a=actor(c,{id:p.id,sitting:true,color:0x254c69,number:p.number});station.add(a);a.position.set(0,0,.45);a.scale.setScalar(.86);c.playerActors.set(p.id,a);}
  else {box(c,.35,.46,.08,0,1.12,.06,0x778c8d,station);planeLabel(c,p.presence.label,.72,.17,'#c4cecc','#46636a',0,.83,.09,station,50);}
  c.anchors['player-'+p.id]=[x+Math.sin(rotation)*.7,1.86,z+Math.cos(rotation)*.7];
 }
 function locker(c){
  shell(c);planeLabel(c,c.model.club.toUpperCase()+' · TILLSAMMANS',6.7,.44,'#e7d9a7','#425c62',-.9,3.13,-4.14,c.scene,54);
  board(c,-2.2,1.6,2.68,1.55,.88);for(const x of [-2.8,-1.6])box(c,.045,1.1,.045,x,.63,2.65,0x8b9b94);
  c.anchors={board:[-2.2,2.25,2.78],door:[0,3,-3.5],coach:[3.7,2.3,3.3]};
  c.model.players.forEach((p,i)=>lockerSeat(c,p,i));
  const crest=planeLabel(c,c.model.club.toUpperCase(),5.4,2.8,'#c8b888','#244651',0,.09,0,c.scene,100);crest.rotation.x=-Math.PI/2;
  const coach=actor(c,{coach:true});coach.position.set(3.7,0,3.1);coach.rotation.y=-1;c.coach=coach;
  box(c,2.7,.09,.9,-1.3,.85,3,0xa58c68);box(c,.12,.8,.7,-2.4,.4,3,0x354c53);box(c,.12,.8,.7,-.2,.4,3,0x354c53);
  for(let i=0;i<4;i++){cylinder(c,.065,.065,.3,-2+i*.4,1.05,3,0xa2bbb7);cylinder(c,.042,.042,.07,-2+i*.4,1.23,3,0xd4dfc8);}
 }
 function ice(c){
  shell(c);box(c,10.3,.02,6,0,.07,.2,0xd0e6e4);box(c,10.6,.6,.16,0,.35,-2.9,0xe2e6d5);box(c,.16,.6,6,-5.25,.35,.15,0xe2e6d5);
  for(const x of [-1.8,1.8])box(c,.06,.025,5.7,x,.09,.15,0x7da2c2);box(c,.045,.025,5.7,0,.1,.15,0xbc736a);
  const ring=mesh(c,new c.T.CylinderGeometry(.65,.65,.015,40),0xc9dcda);ring.position.set(0,.095,.15);
  cylinder(c,.06,.06,.018,0,.115,.15,0xb97772);board(c,-2.8,2.35,-4.08,3.6,1.65);door(c,4.7,-4.08,'VÄGEN TILL LAGET');
  c.model.players.filter(p=>p.presence.present).slice(0,6).forEach((p,i)=>{const x=-3.2+(i%3)*1.5,z=i<3?-.8:1.25;const a=actor(c,{id:p.id,color:0x38576e,number:p.number});a.scale.setScalar(.7);a.position.set(x,.12,z);a.rotation.y=i%2?-.8:.5;a.userData.drill={x,z,phase:i*1.9};c.skaters.push(a);});
  for(let i=0;i<5;i++)cylinder(c,.015,.11,.25,-3+i*1.4,.23,2.6,0xc58651);
  const coach=actor(c,{coach:true});coach.position.set(4.2,.1,2.4);coach.rotation.y=-1.2;c.coach=coach;
  c.anchors={board:[-2.8,2.6,-3.7],door:[4.7,2.3,-3.45],coach:[4.2,2.7,2.4]};
  for(let i=0;i<7;i++){box(c,.045,1.2,.045,-5+i*1.6,1.15,-2.9,0x7b9396);box(c,1.53,.85,.022,-4.2+i*1.6,1.2,-2.9,0xabc3c2);}
  // Goal frame and individual net cords, rubber walkway and rink-side equipment.
  for(const s of [-1,1]){box(c,.065,.95,.065,3.9,.6,s*.68,0xbd5e52);box(c,.8,.055,.055,4.3,.14,s*.68,0xbd5e52);}
  box(c,.065,.065,1.42,3.9,1.08,0,0xbd5e52);box(c,.065,.065,1.42,4.7,.18,0,0xbd5e52);
  for(let i=0;i<12;i++)box(c,.012,.83,.012,4.68,.58,-.65+i*.12,0xd3dfd7);
  for(let i=0;i<7;i++)box(c,.012,.012,1.4,4.68,.2+i*.13,0,0xd3dfd7);
  box(c,10.2,.03,.7,0,.09,3.65,0x354a50);for(let i=0;i<7;i++)puck(c,-1.4+i*.12,2.2+(i%2)*.16);
  c.actors.filter(a=>a!==c.coach).forEach(a=>{stick(c,.25,0,.15,-.5,a);a.userData.body.rotation.x=.1;});
 }
 function recruit(c){
  shell(c);door(c,4.9,-4.08,'TILL KLUBBHUSET');
  frame(c,'SCOUTING · '+c.model.club.toUpperCase(),'MARKNAD · RAPPORTER · SPELARE',.2,2.5,-4.12,5.8,1.4);
  for(let i=0;i<3;i++){const x=-4.2+i*3.2;box(c,2.5,.14,1.3,x,1.12,-1.5,0xaf9673);for(const s of [-1,1])box(c,.1,1.05,1.1,x+s*1.1,.55,-1.5,0x354b53);laptop(c,x,1.22,-1.6,['SPELARRAPPORTER','REKRYTERING','BEVAKNING'][i]);books(c,x-.9,1.2,-1.8,3);chair(c,x,.1,Math.PI);}
  board(c,-4.1,2.55,-4.03,2.5,1.2);plant(c,5.1,2.4,1.4);lamp(c,-5.4,2.7);box(c,1.7,.84,.65,3,.44,2.5,0x8d765c);books(c,2.4,.9,2.5,8);
  const coach=actor(c,{coach:true});coach.position.set(1.8,0,2.4);c.coach=coach;
  c.anchors={board:[-3.8,2.55,-3.8],desk:[-4.2,1.7,-1.1],scout:[-.8,1.7,-1.1],cabinet:[2.1,1.7,-1.1],door:[4.9,2,-3.6],coach:[1.8,2.5,2.4]};
 }
 function boardroom(c){
  shell(c);door(c,4.9,-4.08,'TILL KLUBBHUSET');frame(c,c.model.club.toUpperCase(),'KLUBBLEDNING · VÅR GEMENSAMMA RIKTNING',-.6,2.6,-4.12,6.6,1.2);
  box(c,7.5,.19,2.2,0,1.05,-.1,0x987950);for(const x of [-2.7,2.7])box(c,.3,1,1.3,x,.52,-.1,0x34474c);
  for(let i=0;i<4;i++){chair(c,-2.7+i*1.8,1.8,0);chair(c,-2.7+i*1.8,-2,Math.PI);cylinder(c,.07,.07,.19,-2.8+i*1.8,1.23,.3,0xd6cdb1);box(c,.45,.014,.5,-2.5+i*1.8,1.16,.1,0xe6dfc6);}
  laptop(c,0,1.17,-.4,'KLUBBENS ÖVERSIKT');plant(c,5,2.5,1.4);plant(c,-5.4,-3.2,1.2);lamp(c,-5.4,2.4);
  const coach=actor(c,{coach:true});coach.position.set(4.3,0,1.9);c.coach=coach;
  c.anchors={desk:[-2.5,1.6,.2],board:[0,2.5,-3.8],scout:[2.4,1.6,.2],cabinet:[4.3,2.5,1.9],door:[4.9,2,-3.6],coach:[4.3,2.5,1.9]};
 }
 function world(c){
  shell(c);door(c,4.9,-4.08,'TILL KLUBBHUSET');
  frame(c,c.model.club.toUpperCase(),'PRESS · RESULTAT · HOCKEYVÄRLDEN',-.8,2.45,-4.06,7.4,1.6);
  for(let row=0;row<2;row++)for(let col=0;col<6;col++)planeLabel(c,c.model.club.toUpperCase(),.95,.22,'#b8c6ba','#304d59',-3.8+col*1.2,row?3.05:1.76,-3.99,c.scene,62);
  box(c,6.4,.15,1.15,-.8,1.08,-2.2,0xa68c68);for(const x of [-2.7,1.1])box(c,.14,1,1,x,.53,-2.2,0x374b54);chair(c,-.8,-3.15,0);
  for(const x of [-2,-.8,.4]){cylinder(c,.13,.13,.025,x,1.18,-1.97,0x263943);const mic=cylinder(c,.022,.022,.3,x,1.33,-1.97,0x899997);mic.rotation.x=.3;sphere(c,.065,x,1.49,-2.01,0x273b44);}
  for(const x of [-3,2.6]){const camera=box(c,.5,.3,.35,x,1.7,1.6,0x273840);cylinder(c,.07,.12,1.4,x,.8,1.6,0x657b7e);for(const s of [-1,1]){const leg=box(c,.055,1.4,.055,x+s*.22,.68,1.6,0x546b70);leg.rotation.z=s*-.3;}cylinder(c,.13,.13,.2,x,1.7,1.35,0x718b8c).rotation.x=Math.PI/2;}
  const coach=actor(c,{coach:true});coach.position.set(.5,0,.1);c.coach=coach;plant(c,5.3,2.5,1.3);
  c.anchors={board:[-.8,2.8,-3.8],desk:[-.8,1.8,-1.9],scout:[-3,2,1.6],cabinet:[2.6,2,1.6],door:[4.9,2,-3.6],coach:[.5,2.5,.1]};
 }
 function playerButtons(c){
  if(c.model.room!=='locker')return;
  const root=document.getElementById('clubhouse-hotspots');
  for(const p of c.model.players){
   const button=document.createElement('button');button.type='button';button.className='ch-hotspot ch-player'+(!p.presence.present?' ch-absent':'')+(p.attention?' ch-needs-attention':'');button.dataset.chAnchor='player-'+p.id;button.dataset.clubhousePlayer=p.id;
   button.setAttribute('aria-label',p.name+' · '+(p.presence.present?p.attention||p.mood.text:p.presence.label));button.setAttribute('aria-pressed',String(samePlayerId(p.id,clubhouseUI.player)));
   const name=document.createElement('strong');name.textContent=String(p.number);const small=document.createElement('small');small.textContent=p.name+' · '+(p.presence.present?(p.captain?'C · ':'')+p.pos:p.presence.label);
   const span=document.createElement('span');span.append(name,small);const dot=document.createElement('span');dot.className='ch-dot';dot.setAttribute('aria-hidden','true');button.append(dot,span);button.addEventListener('click',()=>clubhouseSelect(p.id));root?.append(button);
  }
 }
 function project(c){
  const rect=c.canvas.getBoundingClientRect();c.camera.aspect=rect.width/Math.max(1,rect.height);c.camera.updateProjectionMatrix();
  const portrait=c.camera.aspect<1,wide=typeof clubhouseUI!=='undefined'&&clubhouseUI.camera==='overview',lockerRoom=c.model.room==='locker';
  c.camera.fov=portrait?49:32;c.camera.position.set(portrait?0:lockerRoom?1:8,portrait?24:lockerRoom?7.8:6.7,portrait?14:lockerRoom?12.8:10.5);if(wide)c.camera.position.multiplyScalar(1.18);c.camera.lookAt(0,1,-.1);c.camera.updateProjectionMatrix();c.camera.updateMatrixWorld();
  c.renderer.setSize(Math.max(1,rect.width),Math.max(1,rect.height),false);
  for(const b of document.querySelectorAll('[data-ch-anchor]')){const pos=c.anchors[b.dataset.chAnchor];if(!pos)continue;const v=new c.T.Vector3(...pos).project(c.camera),pad=Math.min(24,Math.max(5,b.offsetWidth/Math.max(1,rect.width)*50));b.style.left=Math.max(pad,Math.min(100-pad,50+v.x*50))+'%';b.style.top=Math.max(16,Math.min(86,50-v.y*50))+'%';}
 }
 function loop(c,now){
  if(active!==c)return;
  if(!c.canvas.isConnected){dispose();return;}
  if(document.hidden){c.frame=0;return;}
  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if(now-c.drawn>(reduced?250:1000/30)){
   const dt=Math.min(.1,(now-(c.drawn||now))/1000),time=now/1000;
   for(const a of c.actors){const d=a.userData;
    d.body.rotation.x=d.sitting&&d.fatigue>=35?.09:0;d.head.rotation.x=d.fatigue>=50?.08:0;
    if(!reduced){d.body.rotation.z=Math.sin(time*1.2+d.seed)*.012;d.head.rotation.y=Math.sin(time*.5+d.seed)*.09;d.arms[0].rotation.x=(d.sitting?-.65:0)+Math.sin(time+d.seed)*.025;
     if(d.gesture){const elapsed=(now-d.gesture.start)/1000;if(elapsed>2.2){delete d.gesture;d.arms[1].rotation.x=d.sitting?-.65:0;}else{d.head.rotation.x+=Math.sin(elapsed*8)*(d.gesture.delta>=0?.11:.045);d.head.rotation.y+=d.gesture.delta<0?Math.sin(elapsed*6)*.12:0;d.arms[1].rotation.x=(d.sitting?-.65:0)-Math.sin(elapsed/2.2*Math.PI)*.4;}}
     if(d.drill&&c.model.life?.session!=='recovery'&&!['after','live'].includes(c.model.life?.phase)){const phase=time*.5+d.drill.phase;a.position.x=d.drill.x+Math.cos(phase)*.55;a.position.z=d.drill.z+Math.sin(phase)*.45;a.rotation.y=Math.atan2(-Math.sin(phase)*.55,Math.cos(phase)*.45);d.body.rotation.x=.14;d.body.rotation.z=Math.cos(phase)*.06;d.legs.forEach((leg,i)=>leg.rotation.z=Math.sin(time*2.6+i*Math.PI)*.14);c.moving=true;}
    }
   }
   if(c.target){const d=c.target.clone().sub(c.coach.position),distance=d.length();if(distance>.06){const step=Math.min(distance,dt*2.1);c.coach.position.add(d.normalize().multiplyScalar(step));c.coach.rotation.y=Math.atan2(d.x,d.z);if(!reduced){c.coach.userData.body.position.y=Math.sin(time*13)*.025;c.coach.userData.arms.forEach((a,i)=>a.rotation.x=Math.sin(time*9+i*Math.PI)*.3);c.coach.userData.legs.forEach((a,i)=>a.rotation.x=Math.sin(time*9+i*Math.PI)*-.35);}}else{c.target=c.waypoints?.shift()||null;c.coach.userData.body.position.y=0;c.coach.userData.legs.forEach(a=>a.rotation.x=0);c.coach.userData.arms.forEach(a=>a.rotation.x=0);}}
   const coachButton=document.querySelector('[data-ch-anchor="coach"]');if(coachButton&&c.coach){const v=c.coach.position.clone();v.y+=2.5;v.project(c.camera);coachButton.style.left=(50+v.x*50)+'%';coachButton.style.top=(50-v.y*50)+'%';}
   if((c.target||c.moving)&&c.frames%8===0)c.renderer.shadowMap.needsUpdate=true;
   c.renderer.render(c.scene,c.camera);c.drawn=now;c.canvas.dataset.frames=String(++c.frames);
  }
  c.frame=requestAnimationFrame(t=>loop(c,t));
 }
 function fallback(error){
  const status=document.getElementById('clubhouse-render-status');if(status){status.textContent='3D stöds inte här. Alla rum och handlingar går fortfarande att använda.';status.classList.add('ch-fallback-message');}
  document.getElementById('clubhouse-stage')?.classList.add('ch-fallback');
  const root=document.getElementById('clubhouse-hotspots');if(clubhouseRoomForPage()==='locker'&&root){for(const p of managerRoster()){const b=document.createElement('button');b.className='ch-hotspot';b.textContent=p.name;b.addEventListener('click',()=>clubhouseSelect(p.id));root.append(b);}}
  if(error)console.warn('Klubbhusets 3D kunde inte startas:',error.message);
 }
 function mount(canvas,model,appearance){
  const key=typeof clubhouseSceneKey==='function'?clubhouseSceneKey(model,appearance):null;
  if(active?.canvas===canvas&&key&&active.key===key){active.model=model;for(const actor of active.actors){const p=model.players.find(p=>p.id===String(actor.userData.id));if(p){actor.userData.fatigue=p.fatigue;actor.userData.trust=p.trust;}}project(active);return;}
  dispose();if(typeof HockeyThree==='undefined'){fallback();return;}
  let c;
  try{
   const T=HockeyThree;c={T,canvas,model,appearance,key,build:++builds,scene:new T.Scene(),camera:new T.PerspectiveCamera(36,1,.1,80),materials:new Map(),shapes:new Map(),geometries:new Set(),textures:new Set(),actors:[],skaters:[],anchors:{},playerActors:new Map(),frame:0,frames:0,drawn:0};active=c;
   c.renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'low-power'});c.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));c.renderer.outputColorSpace=T.SRGBColorSpace;c.renderer.toneMapping=T.ACESFilmicToneMapping;c.renderer.toneMappingExposure=1.05;c.renderer.shadowMap.enabled=true;c.renderer.shadowMap.type=T.PCFSoftShadowMap;c.renderer.shadowMap.autoUpdate=false;c.renderer.shadowMap.needsUpdate=true;
   c.camera.position.set(model.room==='locker'?2.7:11.2,model.room==='locker'?11:9.4,model.room==='locker'?18.5:14.9);c.camera.lookAt(0,1,-.1);
   ({locker,ice,recruit,boardroom,world}[model.room]||office)(c);playerButtons(c);
   c.scene.updateMatrixWorld(true);c.camera.updateMatrixWorld();project(c);c.resize=new ResizeObserver(()=>project(c));c.resize.observe(canvas);
   c.visibility=()=>{if(!document.hidden&&!c.frame&&active===c){c.last=0;c.frame=requestAnimationFrame(t=>loop(c,t));}};document.addEventListener('visibilitychange',c.visibility);
   // Click on free floor to move your actual coach figure. Objects remain buttons.
   c.walk=e=>{const r=canvas.getBoundingClientRect(),nx=(e.clientX-r.left)/r.width*2-1,ny=-(e.clientY-r.top)/r.height*2+1;
    const a=new T.Vector3(nx,ny,.5).unproject(c.camera),d=a.sub(c.camera.position).normalize(),distance=-c.camera.position.y/d.y,point=c.camera.position.clone().add(d.multiplyScalar(distance));
    point.x=Math.max(model.room==='locker'?-3.8:-4.9,Math.min(model.room==='locker'?3.8:5,point.x));point.z=Math.max(model.room==='locker'?-1.8:-2.5,Math.min(3.5,point.z));
    if(model.room==='office'&&point.x<-.5&&point.z>-.3&&point.z<2.4)point.x=-.35;
    if(model.room==='boardroom'&&Math.abs(point.x)<3.9&&point.z> -1.7&&point.z<1.4)point.z=1.65;
    if(model.room==='recruit'&&point.z<-.5)point.z=.5;
    point.y=model.room==='ice'?.1:0;c.waypoints=[];c.target=point;
   };canvas.addEventListener('click',c.walk);
   const status=document.getElementById('clubhouse-render-status');if(status)status.hidden=true;canvas.dataset.ready='true';canvas.dataset.room=model.room;c.frame=requestAnimationFrame(t=>loop(c,t));
  }catch(error){dispose();fallback(error);}
 }
 function select(id){const c=active;if(!c)return;const actor=c.playerActors.get(id);if(actor){for(const p of c.playerActors.values())p.userData.torso.material=material(c,p===actor?0x537f86:0x254c69);const pos=actor.getWorldPosition(new c.T.Vector3());c.waypoints=[];c.target=new c.T.Vector3(Math.max(-3.8,Math.min(3.8,pos.x)),0,Math.max(-1.8,Math.min(2.8,pos.z+1.1)));if(c.model.room==='office'){c.waypoints=[new c.T.Vector3(-.6,0,3.15)];c.target=new c.T.Vector3(.25,0,2.8);}}}
 function react(id,delta){const a=active?.playerActors.get(String(id));if(a)a.userData.gesture={start:performance.now(),delta};}
 function reframe(){if(active){project(active);active.renderer.render(active.scene,active.camera);}}
 function diagnostics(){return active?{room:active.model.room,build:active.build,actors:active.actors.length,players:active.playerActors.size,visitor:active.visitor||null,phase:active.model.life?.phase,skaters:active.skaters.map(a=>({id:a.userData.id,x:a.position.x,z:a.position.z})),frames:active.frames,geometries:active.geometries.size,materials:active.materials.size,drawCalls:active.renderer.info.render.calls}:null;}
 return {mount,dispose,select,react,reframe,diagnostics};
})();
