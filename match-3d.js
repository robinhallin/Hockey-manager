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
 function camera(aspect,mode,puck={x:30,y:15}){
  const target=mode==='follow'?[clamp(puck.x,14,46),0,clamp(puck.y,10,20)]:[30,0,15];
  const eye=mode==='follow'?[target[0],23,target[2]+31]:mode==='overhead'?[30,65,33]:[30,43,58];
  const z=unit(sub(eye,target)),x=unit(cross([0,1,0],z)),y=cross(z,x);
  const view=[x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1];
  // Fit the whole rink even when the coach panels reduce the viewport width.
  const fov=2*Math.atan(Math.max(Math.tan(.61/2),(mode==='follow'?21:36)/(Math.hypot(...sub(eye,target))*aspect))),f=1/Math.tan(fov/2),near=.1,far=180;
  return multiply([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)/(near-far),-1,0,0,2*far*near/(near-far),0],view);
 }
 function project(p,m){const q=[...p,1],v=[0,0,0,0];for(let r=0;r<4;r++)for(let k=0;k<4;k++)v[r]+=m[k*4+r]*q[k];return {x:(v[0]/v[3]+1)/2,y:(1-v[1]/v[3])/2};}
 function sample(frame,before,t){
  t=clamp(t,0,1);const prior=new Map((before?.actors||[]).map(a=>[a.id,a]));
  // Do not sweep across the rink after a faceoff reset or a skipped highlight.
  const continuous=before&&Math.abs(frame.time-before.time)<=.5&&frame.phase===before.phase;
  const pos=(p,q)=>{const blend=continuous&&q&&Math.hypot(p.x-q.x,p.y-q.y)<(p.id!=null?5:18)?t:1;return {...p,x:mix(q?.x??p.x,p.x,blend),y:mix(q?.y??p.y,p.y,blend),...(p.id!=null?{vx:mix(q?.vx??p.vx??0,p.vx||0,blend),vy:mix(q?.vy??p.vy??0,p.vy||0,blend),travelled:mix(q?.travelled??p.travelled??0,p.travelled||0,blend),contact:mix(before?.carrier===p.id?1:0,frame.carrier===p.id?1:0,blend)}:{})};};
  let flight=frame.flight?{...frame.flight}:null;
  if(flight&&continuous&&before.flight?.kind===flight.kind&&before.flight?.from===flight.from&&before.flight?.start.x===flight.start.x&&before.flight?.start.y===flight.start.y)flight.elapsed=mix(before.flight.elapsed??flight.elapsed,flight.elapsed,t);
  return {...frame,time:continuous?mix(before.time,frame.time,t):frame.time,actors:frame.actors.map(a=>pos(a,prior.get(a.id))),puck:pos(frame.puck,before?.puck),flight};
 }
 function pose(frame,a){
  const keeper=a.role==='G',speed=Math.hypot(a.vx||0,a.vy||0),f=frame.flight,puckAngle=Math.atan2(frame.puck.y-a.y,frame.puck.x-a.x);
  const skatingAngle=speed>.12?Math.atan2(a.vy,a.vx):(a.side===0?0:Math.PI);
  const release=f?.from===a.id&&Number.isFinite(f.elapsed)&&f.elapsed<.55&&['shot','pass','intercept'].includes(f.kind)?1-clamp(f.elapsed/.55,0,1):0;
  const contact=a.contact??(frame.carrier===a.id?1:0),angle=keeper?puckAngle:release?turn(skatingAngle,Math.atan2(f.end.y-f.start.y,f.end.x-f.start.x),release*.7):skatingAngle;
  const incoming=keeper&&f?.kind==='shot'&&f.side!==a.side&&Math.abs(f.end.x-a.x)<5;
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
 function geometry(){
  const data=[];
  function tri(a,b,c,col){const n=unit(cross(sub(b,a),sub(c,a)));for(const p of [a,b,c])data.push(...p,...n,...col);}
  function quad(a,b,c,d,col){tri(a,b,c,col);tri(a,c,d,col);}
  function box(x,y,z,w,h,d,col,angle=0){
   const cs=Math.cos(angle),sn=Math.sin(angle),p=(a,b,c)=>[x+a*cs-c*sn,y+b,z+a*sn+c*cs];
   const v=[p(-w/2,-h/2,-d/2),p(w/2,-h/2,-d/2),p(w/2,-h/2,d/2),p(-w/2,-h/2,d/2),p(-w/2,h/2,-d/2),p(w/2,h/2,-d/2),p(w/2,h/2,d/2),p(-w/2,h/2,d/2)];
   for(const f of [[0,3,2,1],[4,5,6,7],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]])quad(...f.map(i=>v[i]),col);
  }
  function rod(a,b,r,col){const axis=unit(sub(b,a)),u=unit(cross(axis,Math.abs(axis[1])>.9?[1,0,0]:[0,1,0])),v=cross(axis,u),point=(p,t)=>p.map((n,i)=>n+r*(Math.cos(t)*u[i]+Math.sin(t)*v[i]));for(let i=0;i<8;i++){const t=i*Math.PI/4,s=(i+1)*Math.PI/4;quad(point(a,t),point(b,t),point(b,s),point(a,s),col);}}
  function ring(x,z,r,width,col,start=0,end=Math.PI*2){for(let i=0;i<64;i++){const a=start+(end-start)*i/64,b=start+(end-start)*(i+1)/64,p=(t,rr)=>[x+Math.cos(t)*rr,.018,z+Math.sin(t)*rr];quad(p(a,r),p(b,r),p(b,r-width),p(a,r-width),col);}}
  function disk(x,y,z,r,col){for(let i=0;i<32;i++)tri([x,y,z],[x+Math.cos(i*Math.PI/16)*r,y,z+Math.sin(i*Math.PI/16)*r],[x+Math.cos((i+1)*Math.PI/16)*r,y,z+Math.sin((i+1)*Math.PI/16)*r],col);}
  return {data,tri,quad,box,rod,ring,disk};
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
  for(let i=0;i<4;i++){g.box(30,.5+i*.8,-3-i*1.6,65,.7,1.4,color(i%2?'#263b53':'#1d3047'));}
  for(const x of [25,35]){g.box(x,.45,-1.2,7,.6,1,blue);g.box(x,.9,-1.6,7,.5,.15,dark);}
  return new Float32Array(g.data);
 }
 function figures(frame,teams){
  const g=geometry(),black=color('#101d2c'),white=color('#e8eef1'),steel=color('#91a9ba');
  for(const a of frame.actors){
   const m=pose(frame,a),{keeper:goalkeeper,angle,point:p,lower,lean,drop}=m;
   const team=teams[a.side]||{},jersey=color(team.primary),trim=color(team.color);
   const box=(f,h,s,w,hh,d,c)=>g.box(...p(f,h,s),w,hh,d,c,angle);
   g.disk(a.x,.03,a.y,goalkeeper?.65:.48,color('#afc4cd'));
   if(a.id===frame.carrier)g.ring(a.x,a.y,.85,.08,trim);
   for(const [i,side] of [-1,1].entries()){
    const foot=m.feet[i],knee=p(.20,.60-lower*.65,side*(.22+drop*.24)),hip=p(-.10,.92-lower,side*.18);
    g.box(...foot,.52,.17,.18,black,angle+(goalkeeper?side*drop*.8:side*Math.max(0,side*m.stride)*.35));
    g.box(foot[0],.045,foot[2],.55,.035,.05,steel,angle);
    g.rod([foot[0],.25,foot[2]],knee,.13,goalkeeper?white:jersey);g.rod(knee,hip,.16,black);
    if(goalkeeper)g.rod([foot[0]+Math.cos(angle)*.12,.23,foot[2]+Math.sin(angle)*.12],knee,.22,white);
   }
   box(lean,1.18-lower,0,.5,.62,.66,jersey);box(lean,.95-lower,0,.52,.11,.68,trim);
   box(lean+.12,1.65-lower,0,.33,.29,.34,color('#d0a58c'));box(lean+.10,1.82-lower,0,.44,.23,.45,goalkeeper?white:jersey);
   box(lean+.34,1.71-lower,0,.025,.10,.34,steel);
   // Hands travel with the shaft; both elbows and knees articulate independently.
   const grip=p(.62,.96-lower*.6,.22),upper=goalkeeper?p(.52,.92-lower,-.51):p(.38,1.13-lower,.08);
   for(const [i,side] of [-1,1].entries()){
    const hand=i?grip:upper,elbow=p(.29,1.09-lower,side*.45);
    g.rod(p(lean,1.41-lower,side*.36),elbow,.13,jersey);g.rod(elbow,hand,.10,jersey);
    g.box(...hand,.22,goalkeeper?.26:.19,goalkeeper?.32:.20,goalkeeper?white:black,angle);
   }
   g.rod(grip,m.blade,.035,black);g.rod(m.blade,[m.blade[0]+Math.cos(angle)*.40,m.blade[1],m.blade[2]+Math.sin(angle)*.40],.055,black);
  }
  if(frame.flight){const start=frame.flight.start,dx=frame.puck.x-start.x,dz=frame.puck.y-start.y,d=Math.hypot(dx,dz),length=Math.min(d,2.3);if(d>.05)g.rod([frame.puck.x-dx/d*length,.045,frame.puck.y-dz/d*length],[frame.puck.x,.045,frame.puck.y],.025,color('#6c8797'));}
  g.disk(frame.puck.x,.04,frame.puck.y,.27,white);g.disk(frame.puck.x,.065,frame.puck.y,.20,black);g.box(frame.puck.x,.09,frame.puck.y,.25,.12,.25,black);
  return new Float32Array(g.data);
 }
 let current=null;
 function dispose(){if(!current)return;const c=current;current=null;c.canvas.removeEventListener('webglcontextlost',c.lost);c.gl.deleteBuffer(c.staticBuffer);c.gl.deleteBuffer(c.dynamicBuffer);c.gl.deleteProgram(c.program);c.gl.getExtension('WEBGL_lose_context')?.loseContext();}
 function create(canvas){
  const gl=canvas.getContext('webgl',{alpha:false,antialias:true});if(!gl)throw Error('3D kunde inte starta på den här datorn. 2D är fortfarande tillgängligt.');
  const shader=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){gl.deleteShader(s);throw Error('3D kunde inte läsa grafikprogrammet.');}return s;};
  const vs=shader(gl.VERTEX_SHADER,'attribute vec3 position;attribute vec3 normal;attribute vec3 color;uniform mat4 camera;varying vec3 tint;void main(){float light=.65+.35*abs(dot(normalize(normal),normalize(vec3(.3,1.,.4))));tint=color*light;gl_Position=camera*vec4(position,1.);}');
  const fs=shader(gl.FRAGMENT_SHADER,'precision mediump float;varying vec3 tint;void main(){gl_FragColor=vec4(tint,1.);}');
  const program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);if(!gl.getProgramParameter(program,gl.LINK_STATUS)){gl.deleteProgram(program);throw Error('3D kunde inte starta grafikprogrammet.');}
  const staticBuffer=gl.createBuffer(),dynamicBuffer=gl.createBuffer(),mesh=rink();gl.bindBuffer(gl.ARRAY_BUFFER,staticBuffer);gl.bufferData(gl.ARRAY_BUFFER,mesh,gl.STATIC_DRAW);
  const lost=e=>{e.preventDefault();canvas.dataset.error='Grafiken avbröts. Välj 2D eller försök 3D igen.';};canvas.addEventListener('webglcontextlost',lost);
  return {canvas,gl,program,staticBuffer,dynamicBuffer,count:mesh.length/9,locations:['position','normal','color'].map(n=>gl.getAttribLocation(program,n)),matrix:gl.getUniformLocation(program,'camera'),lost,hits:[],frames:0};
 }
 function draw(canvas,frame,before,t,options={}){
  if(!frame||canvas.dataset.error)return false;
  if(current?.canvas!==canvas){dispose();try{current=create(canvas);}catch(error){canvas.dataset.error=error.message;return false;}}
  const c=current,gl=c.gl;if(gl.isContextLost())return false;
  const rect=canvas.getBoundingClientRect(),dpr=Math.min(1.5,globalThis.devicePixelRatio||1),w=Math.max(1,Math.round(rect.width*dpr)),h=Math.max(1,Math.round(rect.height*dpr));
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
  gl.viewport(0,0,w,h);gl.clearColor(.035,.065,.105,1);gl.enable(gl.DEPTH_TEST);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(c.program);
  const f=sample(frame,before,t),mat=camera(w/h,options.camera,f.puck);gl.uniformMatrix4fv(c.matrix,false,mat);
  const bind=buffer=>{gl.bindBuffer(gl.ARRAY_BUFFER,buffer);c.locations.forEach((loc,i)=>{gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,3,gl.FLOAT,false,36,i*12);});};
  bind(c.staticBuffer);gl.drawArrays(gl.TRIANGLES,0,c.count);bind(c.dynamicBuffer);const dynamic=figures(f,options.teams||[]);gl.bufferData(gl.ARRAY_BUFFER,dynamic,gl.DYNAMIC_DRAW);gl.drawArrays(gl.TRIANGLES,0,dynamic.length/9);
  c.hits=f.actors.map(a=>({id:a.id,name:a.name,...project([a.x,1,a.y],mat)}));c.frames++;canvas.dataset.ready='true';
  const label=document.getElementById('match-3d-carrier'),carrier=c.hits.find(a=>a.id===f.carrier);
  if(label){label.hidden=!carrier;if(carrier){label.textContent=carrier.name;label.style.left=Math.max(8,Math.min(92,carrier.x*100))+'%';label.style.top=Math.max(8,Math.min(85,carrier.y*100-8))+'%';}}
  return true;
 }
 function pick(canvas,x,y){if(current?.canvas!==canvas)return null;const r=canvas.getBoundingClientRect();return current.hits.map(a=>({...a,d:Math.hypot(a.x*r.width-x,a.y*r.height-y)})).filter(a=>a.d<24).sort((a,b)=>a.d-b.d)[0]?.id??null;}
 return {draw,dispose,pick,sample,pose,camera,project,diagnostics:()=>current?{frames:current.frames,actors:current.hits.length,error:current.gl.getError()}:null};
})();
let studioVisualMode='2d',studioCamera3D='tv';
function studioSetVisual(mode){if(!['2d','3d'].includes(mode))return;Match3D.dispose();studioVisualMode=mode;render();}
function studioSetCamera(mode){if(['tv','overhead','follow'].includes(mode))studioCamera3D=mode;}
function studio3DControls(){return `<div class="match-3d-controls"><label>Matchvy <select aria-label="Matchvy" onchange="studioSetVisual(this.value)"><option value="2d" ${studioVisualMode==='2d'?'selected':''}>2D</option><option value="3d" ${studioVisualMode==='3d'?'selected':''}>3D · test</option></select></label>${studioVisualMode==='3d'?`<label>Kamera <select aria-label="3D-kamera" onchange="studioSetCamera(this.value)"><option value="tv" ${studioCamera3D==='tv'?'selected':''}>TV</option><option value="overhead" ${studioCamera3D==='overhead'?'selected':''}>Överblick</option><option value="follow" ${studioCamera3D==='follow'?'selected':''}>Följ pucken</option></select></label>`:''}</div>`;}
