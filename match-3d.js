'use strict';
// Read-only WebGL presentation. All coordinates, time and puck possession come
// from the same snapshots as 2D/replays; this module never advances simulation.
const Match3D = (() => {
 const mix=(a,b,t)=>a+(b-a)*t;
 const sub=(a,b)=>a.map((v,i)=>v-b[i]);
 const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
 const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
 const unit=a=>{const n=Math.hypot(...a)||1;return a.map(v=>v/n);};
 function multiply(a,b){const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];return o;}
 const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
 const turn=(a,b,t)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*t;
 function cameraView(aspect,mode,puck={x:30,y:15},zoom=1){
  zoom=Number.isFinite(zoom)?clamp(zoom,.8,1.5):1;
  const tracking=mode==='follow'?1:clamp((zoom-1)*2,0,1);
  const target=[mix(30,clamp(puck.x,10,50),tracking),0,mix(15,clamp(puck.y,7,23),tracking)];
  const eye=mode==='follow'?[target[0],23,target[2]+31]:mode==='overhead'?[target[0],65,target[2]+18]:[target[0],43,target[2]+43];
  const z=unit(sub(eye,target)),x=unit(cross([0,1,0],z)),y=cross(z,x);
  const view=[x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1];
  // Fit the whole rink even when the coach panels reduce the viewport width.
  const fov=2*Math.atan(Math.max(Math.tan(.61/2),(mode==='follow'?21:37.5)/(Math.hypot(...sub(eye,target))*aspect))/zoom),f=1/Math.tan(fov/2),near=.1,far=180;
  return {matrix:multiply([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)/(near-far),-1,0,0,2*far*near/(near-far),0],view),eye};
 }
 function camera(aspect,mode,puck,zoom){return cameraView(aspect,mode,puck,zoom).matrix;}
 function trackPuck(frame,prior){
  const dt=prior?frame.time-prior.time:0,continuous=prior&&dt>=0&&dt<=.5&&prior.phase===frame.phase&&Math.hypot(frame.puck.x-prior.x,frame.puck.y-prior.y)<18;
  const t=continuous?1-Math.exp(-dt/.18):1;
  return {time:frame.time,phase:frame.phase,x:mix(prior?.x??frame.puck.x,frame.puck.x,t),y:mix(prior?.y??frame.puck.y,frame.puck.y,t)};
 }
 function cameraFrame(aspect,mode,frame,prior,zoom){
  let tracked=trackPuck(frame,prior),view=cameraView(aspect,mode,tracked,zoom);
  const puck=project([frame.puck.x,.1,frame.puck.y],view.matrix);
  // A fast pass or shot must stay visible even while the tracking camera eases.
  if((mode==='follow'||zoom>1)&&(puck.x<.04||puck.x>.96||puck.y<.04||puck.y>.96)){
   tracked=trackPuck(frame,null);view=cameraView(aspect,mode,tracked,zoom);
  }
  return {...view,tracked};
 }
 function project(p,m){const q=[...p,1],v=[0,0,0,0];for(let r=0;r<4;r++)for(let k=0;k<4;k++)v[r]+=m[k*4+r]*q[k];return {x:(v[0]/v[3]+1)/2,y:(1-v[1]/v[3])/2};}
 function sample(frame,before,t){
  t=clamp(t,0,1);const prior=new Map((before?.actors||[]).map(a=>[a.id,a]));
  // Do not sweep across the rink after a faceoff reset or a skipped highlight.
  const continuous=before&&Math.abs(frame.time-before.time)<=.5&&frame.phase===before.phase;
  const pos=(p,q)=>{const blend=continuous&&q&&Math.hypot(p.x-q.x,p.y-q.y)<(p.id!=null?5:18)?t:1;return {...p,x:mix(q?.x??p.x,p.x,blend),y:mix(q?.y??p.y,p.y,blend),...(p.id!=null?{vx:mix(q?.vx??p.vx??0,p.vx||0,blend),vy:mix(q?.vy??p.vy??0,p.vy||0,blend),travelled:mix(q?.travelled??p.travelled??0,p.travelled||0,blend),contact:mix(before?.carrier===p.id?1:0,frame.carrier===p.id?1:0,blend)}:{})};};
  let flight=frame.flight?{...frame.flight}:null;
  if(flight&&Number.isFinite(flight.elapsed)&&continuous&&before.flight?.kind===flight.kind&&before.flight?.from===flight.from&&before.flight?.start.x===flight.start.x&&before.flight?.start.y===flight.start.y)flight.elapsed=mix(before.flight.elapsed??flight.elapsed,flight.elapsed,t);
  return {...frame,time:continuous?mix(before.time,frame.time,t):frame.time,actors:frame.actors.map(a=>pos(a,prior.get(a.id))),puck:pos(frame.puck,before?.puck),flight};
 }
 function pose(frame,a){
  const keeper=a.role==='G',speed=Math.hypot(a.vx||0,a.vy||0),f=frame.flight,puckAngle=Math.atan2(frame.puck.y-a.y,frame.puck.x-a.x);
  const skatingAngle=speed>.12?Math.atan2(a.vy,a.vx):(a.side===0?0:Math.PI);
  const release=f?.from===a.id&&Number.isFinite(f.elapsed)&&f.elapsed<.55&&['shot','pass','intercept'].includes(f.kind)?1-clamp(f.elapsed/.55,0,1):0;
  const contact=a.contact??(frame.carrier===a.id?1:0),angle=keeper?puckAngle:release?turn(skatingAngle,Math.atan2(f.end.y-f.start.y,f.end.x-f.start.x),release*.7):skatingAngle;
  const incoming=keeper&&f?.kind==='shot'&&[0,1].includes(f.side)&&f.side!==a.side&&Math.abs(f.end.x-a.x)<5;
  // A low blocking attempt follows the approaching shot, not its hidden result.
  const drop=incoming?clamp((9-Math.hypot(frame.puck.x-a.x,frame.puck.y-a.y))/7,0,1):0;
  const phase=(a.travelled||0)*Math.PI/1.6,drive=Math.min(1,speed/3.5),stride=Math.sin(phase)*drive;
  const lean=keeper?.12:.12+drive*.17,lower=keeper?.18+drop*.5:drive*.09;
  const offset=keeper?0:-.58*contact;
  const point=(forward,height,side)=>[a.x+Math.cos(angle)*(forward+offset)-Math.sin(angle)*side,height,a.y+Math.sin(angle)*(forward+offset)+Math.cos(angle)*side];
  const feet=[-1,1].map(side=>{const push=Math.max(0,side*stride),recover=Math.max(0,-side*stride);return keeper?point(0,.12,side*(.34+drop*.38)+stride*.06):point(-push*.32+recover*.12,.12+recover*.06,side*(.23+push*.38));});
  let blade=point(1.1+release*.35,.08+release*(f?.kind==='shot'?.48:.12),.3);
  // Keep the stick at plausible length when receiving or losing possession.
  if(contact>.01&&Math.hypot(frame.puck.x-a.x,frame.puck.y-a.y)<1.7)blade=blade.map((v,i)=>mix(v,[frame.puck.x,.08,frame.puck.y][i],contact));
  if(keeper)blade=point(.65,.06,0);
  return {keeper,speed,angle,release,contact,drop,stride,lean,lower,point,feet,blade};
 }
 const color=hex=>{const h=/^#[\da-f]{6}$/i.test(hex)?hex:'#264663';return [1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255);};
 function kits(teams){
  const rows=[0,1].map(i=>({jersey:color(teams[i]?.primary),trim:color(teams[i]?.color)}));
  if(Math.hypot(...sub(rows[0].jersey,rows[1].jersey))<.42){
   const light=dot(rows[0].jersey,[.2126,.7152,.0722]);
   rows[1]={jersey:color(light>.65?'#243951':'#f2f0e8'),trim:rows[1].jersey};
  }
  return rows;
 }
 // Reuse a small unit sphere; transform vertices without per-vertex arrays.
 const sphere=[];
 for(let i=0;i<6;i++)for(let j=0;j<10;j++){
  const v=(t,p)=>[Math.sin(t)*Math.cos(p),Math.cos(t),Math.sin(t)*Math.sin(p)],t=i*Math.PI/6,p=j*Math.PI/5,a=v(t,p),b=v(t,p+Math.PI/5),c=v(t+Math.PI/6,p+Math.PI/5),d=v(t+Math.PI/6,p);
  sphere.push(...(i===0?[a,c,d]:i===5?[a,b,c]:[a,b,c,a,c,d]));
 }
 function geometry(){
  let data=new Float32Array(450000),used=0;
  function vertex(x,y,z,nx,ny,nz,col){
   if(used+9>data.length){const grown=new Float32Array(data.length*2);grown.set(data);data=grown;}
   data[used++]=x;data[used++]=y;data[used++]=z;data[used++]=nx;data[used++]=ny;data[used++]=nz;data[used++]=col[0];data[used++]=col[1];data[used++]=col[2];
  }
  function tri(a,b,c,col){
   const ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2];
   let nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;const length=Math.hypot(nx,ny,nz)||1;nx/=length;ny/=length;nz/=length;
   for(const p of [a,b,c])vertex(p[0],p[1],p[2],nx,ny,nz,col);
  }
  function quad(a,b,c,d,col){tri(a,b,c,col);tri(a,c,d,col);}
  function box(x,y,z,w,h,d,col,angle=0){
   const cs=Math.cos(angle),sn=Math.sin(angle),p=(a,b,c)=>[x+a*cs-c*sn,y+b,z+a*sn+c*cs];
   const v=[p(-w/2,-h/2,-d/2),p(w/2,-h/2,-d/2),p(w/2,-h/2,d/2),p(-w/2,-h/2,d/2),p(-w/2,h/2,-d/2),p(w/2,h/2,-d/2),p(w/2,h/2,d/2),p(-w/2,h/2,d/2)];
   for(const f of [[0,3,2,1],[4,5,6,7],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]])quad(...f.map(i=>v[i]),col);
  }
  function rod(a,b,r,col){const axis=unit(sub(b,a)),u=unit(cross(axis,Math.abs(axis[1])>.9?[1,0,0]:[0,1,0])),v=cross(axis,u),point=(p,t)=>p.map((n,i)=>n+r*(Math.cos(t)*u[i]+Math.sin(t)*v[i]));for(let i=0;i<8;i++){const t=i*Math.PI/4,s=(i+1)*Math.PI/4;quad(point(a,t),point(b,t),point(b,s),point(a,s),col);}}
  function ring(x,z,r,width,col,start=0,end=Math.PI*2){for(let i=0;i<64;i++){const a=start+(end-start)*i/64,b=start+(end-start)*(i+1)/64,p=(t,rr)=>[x+Math.cos(t)*rr,.018,z+Math.sin(t)*rr];quad(p(a,r),p(b,r),p(b,r-width),p(a,r-width),col);}}
  function disk(x,y,z,r,col){for(let i=0;i<32;i++)tri([x,y,z],[x+Math.cos(i*Math.PI/16)*r,y,z+Math.sin(i*Math.PI/16)*r],[x+Math.cos((i+1)*Math.PI/16)*r,y,z+Math.sin((i+1)*Math.PI/16)*r],col);}
  function ellipsoid(center,radii,col,angle=0){
   const cs=Math.cos(angle),sn=Math.sin(angle);
   for(const u of sphere){
    const x=u[0]*radii[0],y=u[1]*radii[1],z=u[2]*radii[2],nx=u[0]/radii[0],ny=u[1]/radii[1],nz=u[2]/radii[2],length=Math.hypot(nx,ny,nz)||1;
    vertex(center[0]+x*cs-z*sn,center[1]+y,center[2]+x*sn+z*cs,(nx*cs-nz*sn)/length,ny/length,(nx*sn+nz*cs)/length,col);
   }
  }
  function jersey(center,angle,main,trim){
   const cs=Math.cos(angle),sn=Math.sin(angle),levels=[[-.32,.21,.29],[-.23,.23,.31],[-.15,.24,.32],[.12,.29,.40],[.27,.24,.35],[.32,.16,.25]];
   const point=(row,t)=>[center[0]+Math.cos(t)*row[1]*cs-Math.sin(t)*row[2]*sn,center[1]+row[0],center[2]+Math.cos(t)*row[1]*sn+Math.sin(t)*row[2]*cs];
   for(let i=0;i<levels.length-1;i++)for(let j=0;j<10;j++){const a=j*Math.PI/5,b=(j+1)*Math.PI/5;quad(point(levels[i],a),point(levels[i+1],a),point(levels[i+1],b),point(levels[i],b),i===1?trim:main);}
   for(let j=0;j<10;j++){const a=j*Math.PI/5,b=(j+1)*Math.PI/5;tri([center[0],center[1]+.32,center[2]],point(levels.at(-1),a),point(levels.at(-1),b),main);}
  }
  return {get data(){return data.subarray(0,used);},tri,quad,box,rod,ring,disk,ellipsoid,jersey};
 }
 function rink(){
  const g=geometry(),ice=color('#e3edf1'),red=color('#b84c62'),blue=color('#3574a3'),white=color('#e5eaf0'),dark=color('#142337');
  g.box(30,-.45,15,78,.5,48,dark);
  // Rounded ice and matching boards, in the engine's 60 × 30 coordinate space.
  const points=[];for(const [x,z,start] of [[52,8,-Math.PI/2],[52,22,0],[8,22,Math.PI/2],[8,8,Math.PI]])for(let i=0;i<=16;i++){const a=start+i*Math.PI/32;points.push([x+8*Math.cos(a),0,z+8*Math.sin(a)]);}
  for(let i=0;i<points.length;i++){
   const a=points[i],b=points[(i+1)%points.length];g.tri([30,0,15],a,b,ice);
   g.quad(a,b,[b[0],1.05,b[2]],[a[0],1.05,a[2]],white);
   g.rod([a[0],1.08,a[2]],[b[0],1.08,b[2]],.07,blue);
   g.quad([a[0],.02,a[2]],[b[0],.02,b[2]],[b[0],.18,b[2]],[a[0],.18,a[2]],color('#e0b23d'));
   // Far-side glass only: no opaque glass blocking the broadcast camera.
   if(a[2]<15){g.rod([a[0],1.1,a[2]],[a[0],2.5,a[2]],.022,color('#819daa'));g.rod([a[0],2.5,a[2]],[b[0],2.5,b[2]],.025,color('#819daa'));}
  }
  for(const [x,w,c] of [[20,.3,blue],[40,.3,blue],[30,.16,red],[3.5,.12,red],[56.5,.12,red]])g.box(x,.012,15,w,.01,x<4||x>56?18:30,c);
  g.ring(30,15,4.5,.09,blue);g.disk(30,.025,15,.18,blue);
  for(const x of [13,47])for(const z of [9,21]){g.ring(x,z,4.5,.07,red);g.disk(x,.025,z,.18,red);}
  for(const x of [23,37])for(const z of [9,21])g.disk(x,.025,z,.16,red);
  for(const x of [3.5,56.5]){
   const dir=x<30?1:-1,back=x-dir*1.25;
   for(let i=0;i<32;i++){const a=-Math.PI/2+i*Math.PI/32,b=a+Math.PI/32;g.tri([x,.025,15],[x+dir*Math.cos(a)*1.8,.025,15+Math.sin(a)*1.8],[x+dir*Math.cos(b)*1.8,.025,15+Math.sin(b)*1.8],color('#9ecddd'));}
   for(const z of [14.08,15.92]){g.rod([x,0,z],[x,1.22,z],.05,red);g.rod([x,1.22,z],[back,.9,z],.04,red);g.rod([back,0,z],[back,.9,z],.04,red);}
   g.rod([x,1.22,14.08],[x,1.22,15.92],.05,red);
   for(let i=0;i<=10;i++){const z=14.08+i*1.84/10;g.rod([back,0,z],[back,.9,z],.012,white);g.rod([back,.9,z],[x,1.22,z],.012,white);}
   for(let i=0;i<=6;i++){const h=i*.15;g.rod([back,h,14.08],[back,h,15.92],.012,white);}
  }
  for(let i=0;i<5;i++){
   const height=.5+i*.85,z=-3-i*1.7;g.box(30,height,z,65,.65,1.5,color('#182b3d'));
   for(let x=0;x<=60;x+=1.25){if(Math.abs(x-30)<1.5||Math.abs(x-10)<1||Math.abs(x-50)<1)continue;const seat=color((Math.floor(x/1.25)+i)%7===0?'#51657a':'#2c4762');g.box(x,height+.48,z,.80,.18,.75,seat);g.box(x,height+.82,z-.35,.80,.62,.12,seat);}
  }
  // End stands establish arena depth without introducing fake on-ice actors.
  for(const x of [-3,63])for(let row=0;row<3;row++)g.box(x+(x<0?-1:1)*row*1.6,.7+row*.8,15,1.4,.7,26,color(row%2?'#203850':'#29415a'));
  for(const x of [25,35]){g.box(x,.45,-1.2,7,.6,1,blue);g.box(x,.9,-1.6,7,.5,.15,dark);}
  return g.data;
 }
 function figures(frame,teams){
  const g=geometry(),black=color('#101d2c'),white=color('#e8eef1'),steel=color('#91a9ba'),uniforms=kits(teams);
  for(const a of frame.actors){
   const m=pose(frame,a),{keeper:goalkeeper,angle,point:p,lower,lean,drop}=m;
   const {jersey,trim}=uniforms[a.side];
   const box=(f,h,s,w,hh,d,c)=>g.box(...p(f,h,s),w,hh,d,c,angle);
   g.disk(a.x,.022,a.y,goalkeeper?.8:.62,color('#c0d3db'));g.disk(a.x,.028,a.y,goalkeeper?.59:.42,color('#a5becb'));
   if(a.id===frame.carrier)g.ring(a.x,a.y,.85,.08,trim);
   for(const [i,side] of [-1,1].entries()){
    const foot=m.feet[i],knee=p(.20,.60-lower*.65,side*(.22+drop*.24)),hip=p(-.10,.92-lower,side*.18);
    g.box(...foot,.52,.17,.18,black,angle+(goalkeeper?side*drop*.8:side*Math.max(0,side*m.stride)*.35));
    g.box(foot[0],.045,foot[2],.55,.035,.05,steel,angle);
    g.rod([foot[0],.25,foot[2]],knee,.13,goalkeeper?white:jersey);g.rod(knee,hip,.16,black);
    if(goalkeeper){g.rod([foot[0]+Math.cos(angle)*.12,.23,foot[2]+Math.sin(angle)*.12],knee,.22,white);g.box(knee[0]+Math.cos(angle)*.2,knee[1],knee[2]+Math.sin(angle)*.2,.08,.13,.30,trim,angle);}else g.rod(p(.18,.51-lower*.6,side*.24),p(.19,.59-lower*.6,side*.24),.145,trim);
   }
   box(-.05,.84-lower,0,.38,.25,.47,black);g.jersey(p(lean,1.21-lower,0),angle,jersey,trim);
   g.ellipsoid(p(lean+.12,1.64-lower,0),[.15,.19,.17],color('#caa887'),angle);
   g.ellipsoid(p(lean+.08,1.80-lower,0),[.235,.195,.235],goalkeeper?white:jersey,angle);
   box(lean+.11,1.65-lower,-.20,.30,.05,.035,black);box(lean+.11,1.65-lower,.20,.30,.05,.035,black);
   box(lean+.30,1.73-lower,0,.025,.075,.31,steel);
   if(goalkeeper){for(const z of [-.14,0,.14])g.rod(p(lean+.32,1.50-lower,z),p(lean+.34,1.77-lower,z),.014,steel);for(const h of [1.52,1.63,1.75])g.rod(p(lean+.33,h-lower,-.17),p(lean+.33,h-lower,.17),.014,steel);}
   // A chest panel and sleeve cuffs keep kit identity readable from both sides.
   box(lean+.275,1.28-lower,0,.022,.15,.16,trim);
   // Hands travel with the shaft; both elbows and knees articulate independently.
   const grip=p(.62,.96-lower*.6,.22),upper=goalkeeper?p(.52,.92-lower,-.51):p(.38,1.13-lower,.08);
   for(const [i,side] of [-1,1].entries()){
    const hand=i?grip:upper,elbow=p(.29,1.09-lower,side*.45);
    g.rod(p(lean,1.41-lower,side*.36),elbow,.13,jersey);g.rod(elbow,hand,.10,jersey);
    g.ellipsoid(hand,goalkeeper?[.15,.16,.21]:[.13,.12,.14],goalkeeper?white:black,angle);g.rod(p(lean,1.41-lower,side*.36),p(lean+.10,1.30-lower,side*.39),.14,trim);
   }
   g.rod(grip,m.blade,.035,black);g.rod(m.blade,[m.blade[0]+Math.cos(angle)*.40,m.blade[1],m.blade[2]+Math.sin(angle)*.40],.055,black);
  }
  if(frame.flight){const start=frame.flight.start,dx=frame.puck.x-start.x,dz=frame.puck.y-start.y,d=Math.hypot(dx,dz),length=Math.min(d,2.3);if(d>.05)g.rod([frame.puck.x-dx/d*length,.045,frame.puck.y-dz/d*length],[frame.puck.x,.045,frame.puck.y],.025,color('#6c8797'));}
  g.disk(frame.puck.x,.04,frame.puck.y,.27,white);g.disk(frame.puck.x,.065,frame.puck.y,.20,black);g.box(frame.puck.x,.09,frame.puck.y,.25,.12,.25,black);
  return g.data;
 }
 let current=null;
 function dispose(){if(!current)return;const c=current;current=null;c.canvas.removeEventListener('webglcontextlost',c.lost);c.gl.deleteBuffer(c.staticBuffer);c.gl.deleteBuffer(c.dynamicBuffer);c.gl.deleteProgram(c.program);c.gl.getExtension('WEBGL_lose_context')?.loseContext();}
 function create(canvas){
  const gl=canvas.getContext('webgl',{alpha:false,antialias:true});if(!gl)throw Error('3D kunde inte starta på den här datorn. 2D är fortfarande tillgängligt.');
  const shader=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){gl.deleteShader(s);throw Error('3D kunde inte läsa grafikprogrammet.');}return s;};
  const vs=shader(gl.VERTEX_SHADER,'attribute vec3 position;attribute vec3 normal;attribute vec3 color;uniform mat4 camera;varying vec3 tint;varying vec3 worldNormal;varying vec3 worldPosition;void main(){tint=color;worldNormal=normal;worldPosition=position;gl_Position=camera*vec4(position,1.);}');
  const fs=shader(gl.FRAGMENT_SHADER,'precision mediump float;varying vec3 tint;varying vec3 worldNormal;varying vec3 worldPosition;uniform vec3 eye;uniform float shine;void main(){vec3 n=normalize(worldNormal);if(!gl_FrontFacing)n=-n;vec3 key=normalize(vec3(-.4,1.,.35));vec3 fill=normalize(vec3(.6,.5,-.7));float diffuse=.55+.35*max(0.,dot(n,key))+.16*max(0.,dot(n,fill));vec3 halfVector=normalize(key+normalize(eye-worldPosition));float highlight=pow(max(0.,dot(n,halfVector)),24.)*shine;vec3 lit=tint*diffuse+vec3(.83,.91,1.)*highlight;float mist=smoothstep(45.,95.,distance(eye,worldPosition))*.12;gl_FragColor=vec4(mix(lit,vec3(.10,.17,.24),mist),1.);}');
  const program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);if(!gl.getProgramParameter(program,gl.LINK_STATUS)){gl.deleteProgram(program);throw Error('3D kunde inte starta grafikprogrammet.');}
  const staticBuffer=gl.createBuffer(),dynamicBuffer=gl.createBuffer(),mesh=rink();gl.bindBuffer(gl.ARRAY_BUFFER,staticBuffer);gl.bufferData(gl.ARRAY_BUFFER,mesh,gl.STATIC_DRAW);
  const lost=e=>{e.preventDefault();canvas.dataset.error='Grafiken avbröts. Välj 2D eller försök 3D igen.';};canvas.addEventListener('webglcontextlost',lost);
  return {canvas,gl,program,staticBuffer,dynamicBuffer,count:mesh.length/9,locations:['position','normal','color'].map(n=>gl.getAttribLocation(program,n)),matrix:gl.getUniformLocation(program,'camera'),eye:gl.getUniformLocation(program,'eye'),shine:gl.getUniformLocation(program,'shine'),lost,hits:[],frames:0,geometryBuilds:0,geometryKey:null,dynamicCount:0};
 }
 function draw(canvas,frame,before,t,options={}){
  if(!frame||canvas.dataset.error)return false;
  if(current?.canvas!==canvas){dispose();try{current=create(canvas);}catch(error){canvas.dataset.error=error.message;return false;}}
  const c=current,gl=c.gl;if(gl.isContextLost())return false;
  if(options.suspended&&canvas.dataset.ready==='true')return true;
  const rect=canvas.getBoundingClientRect(),dpr=Math.min(1.5,globalThis.devicePixelRatio||1),w=Math.max(1,Math.round(rect.width*dpr)),h=Math.max(1,Math.round(rect.height*dpr));
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
  gl.viewport(0,0,w,h);gl.clearColor(.035,.065,.105,1);gl.enable(gl.DEPTH_TEST);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(c.program);
  const f=sample(frame,before,t),view=cameraFrame(w/h,options.camera,f,c.tracked,options.zoom),mat=view.matrix;c.tracked=view.tracked;
  gl.uniformMatrix4fv(c.matrix,false,mat);gl.uniform3fv(c.eye,view.eye);
  const bind=buffer=>{gl.bindBuffer(gl.ARRAY_BUFFER,buffer);c.locations.forEach((loc,i)=>{gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,3,gl.FLOAT,false,36,i*12);});};
  bind(c.staticBuffer);gl.uniform1f(c.shine,.045);gl.drawArrays(gl.TRIANGLES,0,c.count);bind(c.dynamicBuffer);
  const geometryKey=JSON.stringify([f.time,f.phase,f.carrier,f.puck,f.flight,f.actors,options.teams]);
  if(geometryKey!==c.geometryKey){const started=performance.now(),dynamic=figures(f,options.teams||[]);gl.bufferData(gl.ARRAY_BUFFER,dynamic,gl.DYNAMIC_DRAW);c.dynamicCount=dynamic.length/9;c.geometryKey=geometryKey;c.geometryBuilds++;c.buildMS=performance.now()-started;}
  gl.uniform1f(c.shine,.13);gl.drawArrays(gl.TRIANGLES,0,c.dynamicCount);
  c.hits=f.actors.map(a=>({id:a.id,name:a.name,...project([a.x,1,a.y],mat)}));c.frames++;canvas.dataset.ready='true';
  const label=document.getElementById('match-3d-carrier'),carrier=c.hits.find(a=>a.id===f.carrier);
  if(label){label.hidden=!carrier;if(carrier){label.textContent=carrier.name;label.style.left=Math.max(8,Math.min(92,carrier.x*100))+'%';label.style.top=Math.max(8,Math.min(85,carrier.y*100-8))+'%';}}
  const marker=document.getElementById('match-3d-puck');if(marker){const p=project([f.puck.x,.1,f.puck.y],mat);marker.hidden=options.puckMarker===false||p.x<0||p.x>1||p.y<0||p.y>1;marker.style.left=p.x*100+'%';marker.style.top=p.y*100+'%';}
  return true;
 }
 function pick(canvas,x,y){if(current?.canvas!==canvas)return null;const r=canvas.getBoundingClientRect();return current.hits.map(a=>({...a,d:Math.hypot(a.x*r.width-x,a.y*r.height-y)})).filter(a=>a.d<24).sort((a,b)=>a.d-b.d)[0]?.id??null;}
 return {draw,dispose,pick,sample,pose,camera,cameraFrame,project,trackPuck,kits,figures,diagnostics:()=>current?{frames:current.frames,actors:current.hits.length,vertices:current.dynamicCount,geometryBuilds:current.geometryBuilds,buildMS:current.buildMS,error:current.gl.getError()}:null};
})();
let studioVisualMode='2d',studioCamera3D='tv',studioExpanded3D=false,studioZoom3D=1,studioPuckMarker3D=true;
function studioSetVisual(mode){if(!['2d','3d'].includes(mode))return;Match3D.dispose();studioVisualMode=mode;render();}
function studioToggleRink(){if(studioVisualMode!=='3d')return;studioExpanded3D=!studioExpanded3D;render();}
function studioSetCamera(mode){if(['tv','overhead','follow'].includes(mode))studioCamera3D=mode;}
function studioSetZoom(value){const n=Number(value);if(!Number.isFinite(n))return;studioZoom3D=Math.max(.8,Math.min(1.5,Math.round(n*10)/10));const label=document.getElementById('match-3d-zoom');if(label)label.textContent=Math.round(studioZoom3D*100)+'%';}
function studioTogglePuck(){studioPuckMarker3D=!studioPuckMarker3D;document.getElementById('match-3d-puck-toggle')?.setAttribute('aria-pressed',String(studioPuckMarker3D));}
function studio3DControls(){return `<div class="match-3d-controls"><label>Matchvy <select aria-label="Matchvy" onchange="studioSetVisual(this.value)"><option value="2d" ${studioVisualMode==='2d'?'selected':''}>2D</option><option value="3d" ${studioVisualMode==='3d'?'selected':''}>3D · test</option></select></label>${studioVisualMode==='3d'?`<label>Kamera <select aria-label="3D-kamera" onchange="studioSetCamera(this.value)"><option value="tv" ${studioCamera3D==='tv'?'selected':''}>TV</option><option value="overhead" ${studioCamera3D==='overhead'?'selected':''}>Överblick</option><option value="follow" ${studioCamera3D==='follow'?'selected':''}>Följ pucken</option></select></label><div class="match-3d-zoom" role="group" aria-label="Kamerazoom"><button type="button" onclick="studioSetZoom(studioZoom3D-.1)" aria-label="Zooma ut">−</button><button type="button" id="match-3d-zoom" onclick="studioSetZoom(1)" aria-label="Återställ zoom">${Math.round(studioZoom3D*100)}%</button><button type="button" onclick="studioSetZoom(studioZoom3D+.1)" aria-label="Zooma in">+</button></div><button type="button" id="match-3d-puck-toggle" onclick="studioTogglePuck()" aria-pressed="${studioPuckMarker3D}">Markera puck</button><button type="button" class="match-3d-expand" onclick="studioToggleRink()" aria-pressed="${studioExpanded3D}">${studioExpanded3D?'Visa coachbänken':'Stor rink'}</button>`:''}</div>`;}
