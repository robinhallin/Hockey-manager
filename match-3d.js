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
 function camera(aspect,mode){
  const eye=mode==='overhead'?[30,65,33]:[30,43,58],target=[30,0,15];
  const z=unit(sub(eye,target)),x=unit(cross([0,1,0],z)),y=cross(z,x);
  const view=[x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1];
  // Fit the whole rink even when the coach panels reduce the viewport width.
  const fov=2*Math.atan(Math.max(Math.tan(.61/2),36/(Math.hypot(...sub(eye,target))*aspect))),f=1/Math.tan(fov/2),near=.1,far=180;
  return multiply([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)/(near-far),-1,0,0,2*far*near/(near-far),0],view);
 }
 function project(p,m){const q=[...p,1],v=[0,0,0,0];for(let r=0;r<4;r++)for(let k=0;k<4;k++)v[r]+=m[k*4+r]*q[k];return {x:(v[0]/v[3]+1)/2,y:(1-v[1]/v[3])/2};}
 function sample(frame,before,t){
  t=Math.max(0,Math.min(1,t));const prior=new Map((before?.actors||[]).map(a=>[a.id,a]));
  const pos=(p,q)=>({...p,x:mix(q?.x??p.x,p.x,t),y:mix(q?.y??p.y,p.y,t)});
  return {...frame,time:mix(before?.time??frame.time,frame.time,t),actors:frame.actors.map(a=>pos(a,prior.get(a.id))),puck:pos(frame.puck,before?.puck)};
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
   const goalkeeper=a.role==='G',speed=Math.hypot(a.vx||0,a.vy||0),angle=goalkeeper?(a.side===0?0:Math.PI):speed>.15?Math.atan2(a.vy,a.vx):(a.side===0?0:Math.PI);
   const team=teams[a.side]||{},jersey=color(team.primary),trim=color(team.color),stride=goalkeeper?0:Math.sin(frame.time*9+Number(String(a.id).replace(/\D/g,'').slice(-2)||0))*.24*Math.min(1,speed/3);
   const p=(forward,height,side)=>[a.x+Math.cos(angle)*forward-Math.sin(angle)*side,height,a.y+Math.sin(angle)*forward+Math.cos(angle)*side];
   const box=(f,h,s,w,hh,d,c)=>g.box(...p(f,h,s),w,hh,d,c,angle);
   g.disk(a.x,.03,a.y,goalkeeper?.65:.48,color('#afc4cd'));
   if(a.id===frame.carrier)g.ring(a.x,a.y,.85,.10,trim);
   for(const side of [-1,1]){
    const step=side*stride;box(step,.17,side*.23,.5,.17,.17,black);box(step,.065,side*.23,.54,.045,.045,steel);
    g.rod(p(step,.28,side*.23),p(-.12,.66,side*.21),.13,goalkeeper?white:jersey);
    g.rod(p(-.12,.66,side*.21),p(0,.96,side*.18),.16,black);
    if(goalkeeper)box(.14,.47,side*.26,.2,.72,.32,white);
   }
   box(0,1.18,0,.5,.64,.65,jersey);box(0,.93,0,.52,.12,.67,trim);
   box(.12,1.65,0,.34,.3,.34,color('#d0a58c'));box(.10,1.82,0,.43,.23,.44,goalkeeper?white:jersey);
   box(.34,1.71,0,.025,.08,.34,steel);
   for(const side of [-1,1]){g.rod(p(.03,1.42,side*.36),p(.32,1.08,side*.46),.13,jersey);g.rod(p(.32,1.08,side*.46),p(.67,.88,side*.27),.10,jersey);box(.68,.88,side*.27,.24,.2,goalkeeper?.3:.2,goalkeeper?white:black);}
   // Blade meets the actual puck for the carrier; possession is never invented.
   const blade=a.id===frame.carrier?[frame.puck.x,.08,frame.puck.y]:p(1.25,.08,.48);
   g.rod(p(.68,.95,.27),blade,.035,black);g.rod(blade,[blade[0]+Math.cos(angle)*.42,.08,blade[2]+Math.sin(angle)*.42],.055,black);
  }
  g.disk(frame.puck.x,.065,frame.puck.y,.20,black);g.box(frame.puck.x,.09,frame.puck.y,.25,.12,.25,black);
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
  const mat=camera(w/h,options.camera),f=sample(frame,before,t);gl.uniformMatrix4fv(c.matrix,false,mat);
  const bind=buffer=>{gl.bindBuffer(gl.ARRAY_BUFFER,buffer);c.locations.forEach((loc,i)=>{gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,3,gl.FLOAT,false,36,i*12);});};
  bind(c.staticBuffer);gl.drawArrays(gl.TRIANGLES,0,c.count);bind(c.dynamicBuffer);const dynamic=figures(f,options.teams||[]);gl.bufferData(gl.ARRAY_BUFFER,dynamic,gl.DYNAMIC_DRAW);gl.drawArrays(gl.TRIANGLES,0,dynamic.length/9);
  c.hits=f.actors.map(a=>({id:a.id,name:a.name,...project([a.x,1,a.y],mat)}));c.frames++;canvas.dataset.ready='true';
  const label=document.getElementById('match-3d-carrier'),carrier=c.hits.find(a=>a.id===f.carrier);
  if(label){label.hidden=!carrier;if(carrier){label.textContent=carrier.name;label.style.left=Math.max(8,Math.min(92,carrier.x*100))+'%';label.style.top=Math.max(8,Math.min(85,carrier.y*100-8))+'%';}}
  return true;
 }
 function pick(canvas,x,y){if(current?.canvas!==canvas)return null;const r=canvas.getBoundingClientRect();return current.hits.map(a=>({...a,d:Math.hypot(a.x*r.width-x,a.y*r.height-y)})).filter(a=>a.d<24).sort((a,b)=>a.d-b.d)[0]?.id??null;}
 return {draw,dispose,pick,sample,camera,project,diagnostics:()=>current?{frames:current.frames,actors:current.hits.length,error:current.gl.getError()}:null};
})();
let studioVisualMode='2d',studioCamera3D='tv';
function studioSetVisual(mode){if(!['2d','3d'].includes(mode))return;Match3D.dispose();studioVisualMode=mode;render();}
function studioSetCamera(mode){if(['tv','overhead'].includes(mode))studioCamera3D=mode;}
function studio3DControls(){return `<div class="match-3d-controls"><label>Matchvy <select aria-label="Matchvy" onchange="studioSetVisual(this.value)"><option value="2d" ${studioVisualMode==='2d'?'selected':''}>2D</option><option value="3d" ${studioVisualMode==='3d'?'selected':''}>3D · test</option></select></label>${studioVisualMode==='3d'?`<label>Kamera <select aria-label="3D-kamera" onchange="studioSetCamera(this.value)"><option value="tv" ${studioCamera3D==='tv'?'selected':''}>TV</option><option value="overhead" ${studioCamera3D==='overhead'?'selected':''}>Överblick</option></select></label>`:''}</div>`;}
