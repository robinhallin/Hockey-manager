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
 const QUALITY={low:{level:0,scale:.8,dpr:1,crowdStep:2},normal:{level:1,scale:1,dpr:1.5,crowdStep:1},high:{level:2,scale:1,dpr:2,crowdStep:1}};
 const quality=value=>QUALITY[Object.hasOwn(QUALITY,value)?value:'normal'];
 const turn=(a,b,t)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*t;
 function cameraView(aspect,mode,puck={x:30,y:15},zoom=1){
  zoom=Number.isFinite(zoom)?clamp(zoom,.8,1.5):1;
  const tracking=['follow','auto'].includes(mode)?1:clamp((zoom-1)*2,0,1);
  const target=[mix(30,clamp(puck.x,10,50),tracking),0,mix(15,clamp(puck.y,7,23),tracking)];
  const eye=['follow','auto'].includes(mode)?[target[0],23,target[2]+31]:mode==='overhead'?[target[0],65,target[2]+18]:[target[0],43,target[2]+43];
  const z=unit(sub(eye,target)),x=unit(cross([0,1,0],z)),y=cross(z,x);
  const view=[x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1];
  // Fit the whole rink even when the coach panels reduce the viewport width.
  const fov=2*Math.atan(Math.max(Math.tan(.61/2),(['follow','auto'].includes(mode)?21:37.5)/(Math.hypot(...sub(eye,target))*aspect))/zoom),f=1/Math.tan(fov/2),near=.1,far=180;
  return {matrix:multiply([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)/(near-far),-1,0,0,2*far*near/(near-far),0],view),eye};
 }
 function camera(aspect,mode,puck,zoom){return cameraView(aspect,mode,puck,zoom).matrix;}
 function trackPuck(frame,prior){
  const dt=prior?frame.time-prior.time:0,continuous=prior&&dt>=0&&dt<=.5&&prior.phase===frame.phase&&Math.hypot(frame.puck.x-prior.x,frame.puck.y-prior.y)<18;
  const t=continuous?1-Math.exp(-dt/.18):1;
  return {time:frame.time,phase:frame.phase,x:mix(prior?.x??frame.puck.x,frame.puck.x,t),y:mix(prior?.y??frame.puck.y,frame.puck.y,t)};
 }
 function cameraFrame(aspect,mode,frame,prior,zoom){
  let focus=frame.puck,important=[frame.puck];
  if(mode==='auto'){
   important.push(...frame.actors.filter(a=>Math.hypot(a.x-frame.puck.x,a.y-frame.puck.y)<12));
   if(frame.flight){important.push(frame.flight.start,frame.flight.end);}
   const xs=important.map(p=>p.x),ys=important.map(p=>p.y);
   focus={x:(Math.min(...xs)+Math.max(...xs))/2,y:(Math.min(...ys)+Math.max(...ys))/2};
  }
  let tracked=trackPuck({...frame,puck:focus},prior),view=cameraView(aspect,mode,tracked,zoom);
  if(mode==='auto'){
   let fit=zoom||1;
   for(let i=0;i<8&&important.some(p=>{const q=project([p.x,p.id?1:.1+(p.z||0),p.y],view.matrix);return q.x<.06||q.x>.94||q.y<.06||q.y>.94;});i++){fit*=.92;view=cameraView(aspect,mode,tracked,fit);}
  }
  const puck=project([frame.puck.x,.1+(frame.puck.z||0),frame.puck.y],view.matrix);
  // A fast pass or shot must stay visible even while the tracking camera eases.
  if((['follow','auto'].includes(mode)||zoom>1)&&(puck.x<.04||puck.x>.96||puck.y<.04||puck.y>.96)){
   tracked=trackPuck(frame,null);view=cameraView(aspect,mode,tracked,zoom);
  }
  return {...view,tracked};
 }
 function project(p,m){const q=[...p,1],v=[0,0,0,0];for(let r=0;r<4;r++)for(let k=0;k<4;k++)v[r]+=m[k*4+r]*q[k];return {x:(v[0]/v[3]+1)/2,y:(1-v[1]/v[3])/2};}
 function sample(frame,before,t){
  t=clamp(t,0,1);const prior=new Map((before?.actors||[]).map(a=>[a.id,a]));
  // Do not sweep across the rink after a faceoff reset or a skipped highlight.
  const gap=before?(frame.wall??frame.time)-(before.wall??before.time):Infinity;
  const continuous=before&&frame.time>=before.time&&frame.time-before.time<=.5&&frame.phase===before.phase&&gap>=0&&gap<=.5;
  const time=continuous?mix(before.time,frame.time,t):frame.time,wall=continuous?mix(before.wall??before.time,frame.wall??frame.time,t):(frame.wall??frame.time);
  const pos=(p,q)=>{
   const blend=continuous&&q&&Math.hypot(p.x-q.x,p.y-q.y)<(p.id!=null?5:18)?t:1;
   const result={...p,x:mix(q?.x??p.x,p.x,blend),y:mix(q?.y??p.y,p.y,blend)};
   if(p.id==null&&(p.z!=null||q?.z!=null))result.z=mix(q?.z||0,p.z||0,blend);
   if(p.id!=null){
    Object.assign(result,{vx:mix(q?.vx??p.vx??0,p.vx||0,blend),vy:mix(q?.vy??p.vy??0,p.vy||0,blend),travelled:mix(q?.travelled??p.travelled??0,p.travelled||0,blend),contact:mix(before?.carrier===p.id?1:0,frame.carrier===p.id?1:0,blend)});
    if(p.motion){result.motion={...p.motion};if(q?.motion)for(const key of Object.keys(p.motion))result.motion[key]=['heading','travel'].includes(key)?turn(q.motion[key]??p.motion[key],p.motion[key],blend):mix(q.motion[key]??p.motion[key],p.motion[key],blend);}
    // A capture may straddle a release. Never start its follow-through early.
    if(p.action?.at>wall)result.action=q?.action?.at<=wall?q.action:null;
    if(p.keeperState&&q?.keeperState&&p.keeperState.at===q.keeperState.at){result.keeperState={...p.keeperState,drop:mix(q.keeperState.drop,p.keeperState.drop,blend),glove:{lateral:mix(q.keeperState.glove.lateral,p.keeperState.glove.lateral,blend),z:mix(q.keeperState.glove.z,p.keeperState.glove.z,blend)},blocker:{lateral:mix(q.keeperState.blocker.lateral,p.keeperState.blocker.lateral,blend),z:mix(q.keeperState.blocker.z,p.keeperState.blocker.z,blend)}};}else if(p.keeperState?.at>wall)result.keeperState=q?.keeperState||null;
    if(p.keeperAction?.at>wall)result.keeperAction=q?.keeperAction?.at<=wall?q.keeperAction:null;
    if(p.keeperBody){const old=q?.keeperBody;result.keeperBody=p.keeperBody.at>wall?old||null:old?{...p.keeperBody,drop:mix(old.drop,p.keeperBody.drop,blend),load:mix(old.load,p.keeperBody.load,blend),facing:turn(old.facing,p.keeperBody.facing,blend)}:{...p.keeperBody};}
    if(p.balanceState?.at>wall)result.balanceState=q?.balanceState?.at<=wall?q.balanceState:null;
    if(p.contactAction?.at>wall)result.contactAction=q?.contactAction?.at<=wall?q.contactAction:null;
    if(p.windup?.at>wall)result.windup=q?.windup?.at<=wall?q.windup:null;
    if(!p.windup&&q?.windup&&wall<q.windup.at+q.windup.duration)result.windup=q.windup;
    if(p.footPlants)result.footPlants=p.footPlants.map((plant,i)=>{const old=q?.footPlants?.[i];return plant?.at>wall?old||null:plant&&old&&plant.at===old.at?{...plant,x:mix(old.x,plant.x,blend),y:mix(old.y,plant.y,blend)}:plant;});
   }
   return result;
  };
  let flight=frame.flight?{...frame.flight}:null;
  if(flight&&Number.isFinite(flight.elapsed)&&continuous&&before.flight?.kind===flight.kind&&before.flight?.from===flight.from&&before.flight?.start.x===flight.start.x&&before.flight?.start.y===flight.start.y)flight.elapsed=mix(before.flight.elapsed??flight.elapsed,flight.elapsed,t);
  else if(flight&&Number.isFinite(flight.elapsed)&&continuous){
   const started=(frame.wall??frame.time)-flight.elapsed;
   flight=wall+1e-7<started?(before.flight?{...before.flight}:null):{...flight,elapsed:Math.max(0,wall-started)};
  }
  const effects=(frame.effects||[]).filter(e=>e.at<=wall+1e-7);
  return {...frame,time,wall,actors:frame.actors.map(a=>pos(a,prior.get(a.id))),puck:pos(frame.puck,before?.puck),flight,effects};
 }
 const smooth=n=>{n=clamp(n,0,1);return n*n*(3-2*n);};
 const between=(a,b,t)=>a.map((v,i)=>mix(v,b[i],t));
 // A two-bone chain with fixed segment lengths and an explicit bend direction.
 // The pole keeps knees forward and elbows outside the jersey at every yaw.
 function joint(root,end,pole,upper,lower){
  const vector=sub(end,root),length=Math.hypot(...vector),axis=unit(vector),d=clamp(length,.001,upper+lower-.001);
  const bend=sub(pole,root),projection=dot(bend,axis),normal=unit(bend.map((v,i)=>v-axis[i]*projection));
  const along=(upper*upper-lower*lower+d*d)/(2*d),height=Math.sqrt(Math.max(0,upper*upper-along*along));
  return root.map((v,i)=>v+axis[i]*along+normal[i]*height);
 }
 function keeperPose(frame,a){
  const speed=Math.hypot(a.vx||0,a.vy||0),clock=frame.wall??frame.time,action=a.keeperAction;
  const age=action?clock-action.at:Infinity,recordedRecovery=age>=0?1-smooth((age-.18)/1.25):0;
  const f=frame.flight,incoming=f?.kind==='shot'&&[0,1].includes(f.side)&&f.side!==a.side&&Math.abs(f.end.x-a.x)<5;
  const body=a.keeperBody, recovery=incoming?0:body?body.drop:recordedRecovery;
  const physical=a.keeperState&&clock>=a.keeperState.at&&clock-a.keeperState.at<2?a.keeperState:null;
  const approach=incoming?clamp((9-Math.hypot(frame.puck.x-a.x,frame.puck.y-a.y))/7,0,1):0;
  const facing=Math.atan2(frame.puck.y-a.y,frame.puck.x-a.x);
  const angle=body?body.facing:physical?physical.facing:recovery&&action?turn(facing,action.facing,recovery):facing,catchSide=a.shoots==='R'?1:-1;
  const height=incoming?(f.end.z??frame.puck.z??0):0;
  const low=height<.48,style=body?.post?'post':recovery&&action?action.style:low?'butterfly':'ready';
  const drop=body?body.drop:physical?physical.drop*(incoming?1:recovery):Math.max(approach*(low?1:.22),recovery*(['butterfly','stick'].includes(style)?1:.22));
  const lower=.16+drop*.42,lean=.13,phase=(a.travelled||0)*Math.PI/1.1,stride=Math.sin(phase)*Math.min(1,speed/2.5)*(1-drop*.8);
  const reachTarget=recovery&&action?action.contact:incoming?f.end:null;
  const lateral=reachTarget?-(reachTarget.x-a.x)*Math.sin(angle)+(reachTarget.y-a.y)*Math.cos(angle):0;
  const push=body?body.load*.045:physical?0:clamp(lateral*.30,-.35,.35)*Math.max(recovery,approach);
  const point=(forward,h,side)=>[a.x+Math.cos(angle)*forward-Math.sin(angle)*(side+push),h,a.y+Math.sin(angle)*forward+Math.cos(angle)*(side+push)];
  const torso=point(lean,1.21-lower,0),torsoPoint=(f,h,s)=>point(lean+f,torso[1]+h,s);
  const spread=1-Math.abs(body?.load||0)*.30;
  const feet=[-1,1].map(side=>point(-drop*.12,.12,side*(.34+drop*.52*spread)+stride*.06));
  const legs=[-1,1].map((side,i)=>{const hip=point(-.1,.92-lower,side*.18),ankle=[feet[i][0],feet[i][1]+.11,feet[i][2]];return {hip,knee:joint(hip,ankle,point(.65,.5-lower*.4,side*.25),.45,.46),ankle};});
  let glove=point(.48,.98-drop*.26,catchSide*.52),blocker=point(.57,.86-drop*.25,-catchSide*.40),blade=point(.74,.065,-catchSide*.12);
  if(physical&&incoming){glove=point(.4,physical.glove.z,physical.glove.lateral);blocker=point(.4,physical.blocker.z,physical.blocker.lateral);}
  const target=action?[action.contact.x,(action.contact.z||0)+.08,action.contact.y]:null;
  if(target&&recovery&&style==='glove')glove=between(glove,target,recovery);
  if(target&&recovery&&style==='blocker')blocker=between(blocker,target,recovery);
  if(target&&recovery&&style==='stick')blade=between(blade,target,recovery);
  // The catch hand reaches independently; the blocker remains on the shaft.
  const arms=[-1,1].map(side=>{
   const shoulder=torsoPoint(0,.20,side*.35),desired=side===catchSide?glove:blocker,reach=sub(desired,shoulder),length=Math.hypot(...reach);
   const hand=length>.90?shoulder.map((v,i)=>v+reach[i]*.90/length):desired;
   if(side===catchSide)glove=hand;else blocker=hand;
   return {shoulder,elbow:joint(shoulder,hand,torsoPoint(-.10,-.06,side*.65),.45,.47),hand,catching:side===catchSide};
  });
  const shaft=unit(sub(blocker,blade)),shaftTop=blocker.map((v,i)=>v+shaft[i]*.38),tip=point(.79,.065,.36*catchSide);
  if(recovery&&style==='stick')for(let i=0;i<3;i++)tip[i]+=blade[i]-point(.74,.065,-catchSide*.12)[i];
  return {keeper:true,speed,angle,release:0,contact:0,drop,stride,lean,lower,point,feet,legs,arms,glove,blocker,blade,tip,shaftTop,torso,torsoAngle:angle,torsoPoint,
   style,recovery,state:body?.mode|| (recovery?(age<.2?style:'recovering'):approach?(low?'butterfly':'tracking'):speed>.12?'shuffling':'ready')};
 }
 function pose(frame,a){
  if(a.role==='G')return keeperPose(frame,a);
  const keeper=false,speed=Math.hypot(a.vx||0,a.vy||0),f=frame.flight,puckAngle=Math.atan2(frame.puck.y-a.y,frame.puck.x-a.x);
  const skatingAngle=speed>.12?Math.atan2(a.vy,a.vx):(a.side===0?0:Math.PI);
  const clock=frame.wall??frame.time;
  let action=a.action;
  // Older recordings still have enough facts for a modest release animation.
  if(!action&&f?.from===a.id&&Number.isFinite(f.elapsed)&&['shot','pass','intercept','dump','clear'].includes(f.kind))action={kind:f.kind==='intercept'?'pass':f.kind,at:clock-f.elapsed,origin:f.start,target:f.end,style:'wrist'};
  const age=action?clock-action.at:Infinity,shooting=action?.kind==='shot',duration=shooting?.72:.52;
  const release=action&&action.kind!=='receive'&&age>=0&&age<duration?1-smooth(age/duration):0;
  const receiving=action?.kind==='receive'&&age>=0&&age<.45?1-smooth(age/.45):0;
  const contact=a.contact??(frame.carrier===a.id?1:0),physical=a.contactAction;
  const contactAge=physical?clock-physical.at:Infinity,engagement=contactAge>=0?1-smooth(contactAge/1.1):0;
  const windup=a.windup&&clock>=a.windup.at?clamp((clock-a.windup.at)/a.windup.duration,0,1):0;
  const goal=(frame.effects||[]).filter(e=>e.kind==='goal'&&e.side===a.side&&e.at<=clock).at(-1),celebration=goal&&frame.phase==='stoppage'?smooth((clock-goal.at-.65)/.65)*(1-smooth((clock-goal.at-2.4)/1.1)):0;
  const fatigue=clamp((65-(a.energy??100))/50,0,1);
  const b=a.balanceState,unsteady=b&&clock>=b.at?b.level*clamp((b.until-clock)/(b.until-b.at),0,1)*smooth((clock-b.at)/.075):0;
  const motion=a.motion||{},backward=clamp(motion.backward||0,0,1),acceleration=motion.acceleration||0;
  const moving=smooth((speed-.1)/.8),brake=motion.brake??clamp(-acceleration/2.3,0,1)*moving;
  const drive=motion.drive??moving*(a.motion?smooth((acceleration-.15)/2):clamp(speed/3.5,0,1))*(1-brake);
  const curve=motion.curve??clamp((motion.turn||0)/1.6,-1,1)*moving*(1-brake),crossover=Math.abs(curve)*(1-backward*.6);
  const facing=motion.heading??skatingAngle,angle=facing+brake*.45;
  const drop=0;
  const phase=(a.travelled||0)*Math.PI/1.6,stride=Math.sin(phase)*drive;
  const hand=a.shoots==='R'?1:-1;
  const lean=.10+drive*.16+brake*.08+fatigue*.04,lower=moving*.08+brake*.09+receiving*.035+engagement*.055+unsteady*.16;
  // Ease the body anchor back after release; the puck itself is never offset.
  const anchor=Math.max(contact,release),offset=-.65*anchor;
  // While cushioning a reception, anchor the connected body behind the actual
  // contact point. The puck remains exactly where the engine put it.
  const cx=contact?mix(a.x,frame.puck.x,contact):a.x,cy=contact?mix(a.y,frame.puck.y,contact):a.y;
  const point=(forward,height,side)=>{side-=anchor*.18*hand;return [cx+Math.cos(angle)*(forward+offset)-Math.sin(angle)*side,height,cy+Math.sin(angle)*(forward+offset)+Math.cos(angle)*side];};
  const feet=[],footAngles=[],legs=[];
  for(const side of [-1,1]){
   const cycle=Math.sin(phase+(side===1?Math.PI:0)),push=Math.max(0,cycle),recover=Math.max(0,-cycle);
   const outer=side===-Math.sign(curve),crossStep=outer?crossover*recover:0;
   const forward=(-push*.31+recover*.18)*drive*(1-backward*1.6);
   const lateral=side*(.24+push*.30*drive+brake*.12+unsteady*.12)+Math.sign(curve)*crossStep*.47;
   let foot=point(forward,.12+recover*drive*.075+crossStep*.14,lateral);
   const plant=a.footPlants?.[side===-1?0:1];
   if(plant&&drive>.05){const reach=Math.hypot(plant.x-foot[0],plant.y-foot[2]),grip=smooth(cycle/.35)*smooth(drive/.4)*(1-smooth((reach-.2)/.5));foot=between(foot,[plant.x,.12,plant.y],grip);}
   const hip=point(-.10,.90-lower,side*.18),vertical=foot[1]+.11-hip[1],room=Math.sqrt(Math.max(0,.909*.909-vertical*vertical)),horizontal=Math.hypot(foot[0]-hip[0],foot[2]-hip[2]);
   if(horizontal>room){foot=[hip[0]+(foot[0]-hip[0])*room/horizontal,foot[1],hip[2]+(foot[2]-hip[2])*room/horizontal];}
   const ankle=[foot[0],foot[1]+.11,foot[2]];
   const knee=joint(hip,ankle,point(.65,.55-lower,side*.22),.45,.46);
   feet.push(foot);footAngles.push(angle+side*push*drive*.32+backward*side*.18+brake*.95+curve*.18);
   legs.push({hip,knee,ankle});
  }
  const releaseAngle=release?Math.atan2(action.target.y-action.origin.y,action.target.x-action.origin.x):angle;
  const waiting=f?.kind==='pass'&&f.to===a.id&&f.side===a.side;
  const prepare=waiting?clamp((3-Math.hypot(frame.puck.x-a.x,frame.puck.y-a.y))/2,0,1):0;
  const aim=release?releaseAngle:receiving?Math.atan2(action.target.y-a.y,action.target.x-a.x):engagement?Math.atan2(physical.spot.y-a.y,physical.spot.x-a.x):(contact||prepare)&&Math.hypot(frame.puck.x-a.x,frame.puck.y-a.y)>.08?puckAngle:angle;
  const twist=clamp(Math.atan2(Math.sin(aim-angle),Math.cos(aim-angle)),-.65,.65)*(release||Math.max(contact*.5,prepare,receiving,engagement));
  const swing=release?Math.sin(Math.PI*clamp(age/duration,0,1)):0;
  const tackle=engagement&&['check','pin','protect'].includes(physical.kind)?engagement:0;
  const load=Math.sin(Math.PI*windup);
  const torsoAngle=angle+twist-hand*swing*(shooting?.28:.12)-hand*load*.4,roll=-curve*.19+tackle*Math.sin((physical?.direction??angle)-angle)*.16+unsteady*Math.sin((b?.direction??angle)-angle)*.27,pitch=.12+drive*.19+brake*.12+tackle*.12+fatigue*.08+unsteady*.23;
  const bodyWidth=clamp((a.weight||85)/85,.92,1.08),headRise=clamp(((a.height||185)-185)*.003,-.045,.055);
  const torso=point(lean,1.20-lower,curve*.10-Math.sin(phase)*drive*.055);
  const torsoPoint=(forward,height,side)=>{
   side*=bodyWidth;
   const fwd=forward*Math.cos(pitch)+height*Math.sin(pitch),up=height*Math.cos(pitch)-forward*Math.sin(pitch);
   const lateral=side*Math.cos(roll)-up*Math.sin(roll),vertical=up*Math.cos(roll)+side*Math.sin(roll);
   return [torso[0]+fwd*Math.cos(torsoAngle)-lateral*Math.sin(torsoAngle),torso[1]+vertical,torso[2]+fwd*Math.sin(torsoAngle)+lateral*Math.cos(torsoAngle)];
  };
  let blade=point(1.02,.08,.26*hand);
  if(windup){if(contact>.01)blade=[frame.puck.x,.08,frame.puck.y];blade=between(blade,point(a.windup.style==='slap'?-.5:.15,.1+load*(a.windup.style==='slap'?1.05:.2),hand*.5),load);}
  if(prepare){const direction=unit([frame.puck.x-a.x,0,frame.puck.y-a.y]);blade=between(blade,[a.x+direction[0]*.85,.08,a.y+direction[2]*.85],prepare*.8);}
  if(release){
   const power=shooting?(action.style==='slap'?.72:action.style==='one-timer'?.58:.44):.18;
   const follow=[action.origin.x+Math.cos(releaseAngle)*swing*.5+Math.sin(releaseAngle)*hand*swing*.18,.08+swing*power,action.origin.y+Math.sin(releaseAngle)*swing*.5-Math.cos(releaseAngle)*hand*swing*.18];
   blade=between(blade,follow,release);
  }
  if(contact>.01&&!windup&&Math.hypot(frame.puck.x-a.x,frame.puck.y-a.y)<1.7)blade=between(blade,[frame.puck.x,.08,frame.puck.y],contact);
  if(engagement&&!contact&&['poke','block','tip','bobble','support'].includes(physical.kind))blade=between(blade,[physical.spot.x,.08+(physical.spot.z||0),physical.spot.y],engagement);
  if(celebration&&!release){blade=between(blade,point(.75,.8,.26*hand),celebration);}
  // Keep an incoming/outgoing reach inside the skater's actual arm/stick span.
  const root=point(0,0,0),reach=Math.hypot(blade[0]-root[0],blade[2]-root[2]);
  if(reach>1.25){blade[0]=root[0]+(blade[0]-root[0])*1.25/reach;blade[2]=root[2]+(blade[2]-root[2])*1.25/reach;}
  const bladeAngle=turn(angle,releaseAngle,release)+hand*contact*Math.sin(phase*.5)*.24;
  const heel=[blade[0]-Math.cos(bladeAngle)*.18,blade[1],blade[2]-Math.sin(bladeAngle)*.18];
  const tip=[blade[0]+Math.cos(bladeAngle)*.23,blade[1],blade[2]+Math.sin(bladeAngle)*.23];
  const shaftDirection=unit(sub(torsoPoint(.13,.05,-.12*hand),heel)),shaftTop=heel.map((v,i)=>v+shaftDirection[i]*1.38);
  const grips=hand===1?[1.23,.87]:[.87,1.23];
  const arms=[-1,1].map((side,i)=>{
   const shoulder=torsoPoint(0,.20,side*.34),vector=sub(shoulder,heel),along=dot(vector,shaftDirection),perpendicular=Math.max(0,dot(vector,vector)-along*along);
   const span=Math.sqrt(Math.max(0,.819*.819-perpendicular)),length=clamp(grips[i],Math.max(.4,along-span),Math.min(1.36,along+span));
   const hand=heel.map((v,i)=>v+shaftDirection[i]*length);
   return {shoulder,elbow:joint(shoulder,hand,torsoPoint(-.14,-.05,side*.68),.40,.42),hand};
  });
  const state=unsteady>.12?'stumbling':unsteady>.015?'balance-recovery':windup?'windup':engagement?physical.kind:speed<.18?'idle':brake>.45?'braking':backward>.55?'backward':crossover>.35?'crossover':drive<.3?'gliding':'skating';
  return {keeper,speed,angle,release,receiving,prepare,contact,drop,stride,lean,lower,point,feet,blade,footAngles,legs,arms,heel,tip,shaftTop,torso,torsoAngle,torsoPoint,pitch,roll,drive,brake,backward,crossover,state,unsteady,windup,engagement,fatigue,bodyWidth,headRise,celebration,style:action?.style};
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
  function shade(x,z,rx,rz,angle=0){
   for(let layer=0;layer<3;layer++){
    const r=1-layer*.25,c=[.80-layer*.055,.86-layer*.045,.89-layer*.04],cs=Math.cos(angle),sn=Math.sin(angle);
    const p=t=>[x+Math.cos(t)*rx*r*cs-Math.sin(t)*rz*r*sn,.023+layer*.003,z+Math.cos(t)*rx*r*sn+Math.sin(t)*rz*r*cs];
    for(let i=0;i<16;i++)tri([x,.023+layer*.003,z],p(i*Math.PI/8),p((i+1)*Math.PI/8),c);
   }
  }
  function pad(a,b,width,depth,col,angle){
   const u=[-Math.sin(angle),0,Math.cos(angle)],v=unit(cross(unit(sub(b,a)),u));
   const p=(center,s,t)=>center.map((n,i)=>n+u[i]*s*width/2+v[i]*t*depth/2);
   const ends=[a,b].map(c=>[p(c,-1,-1),p(c,1,-1),p(c,1,1),p(c,-1,1)]);
   quad(...ends[0],col);quad(...ends[1],col);
   for(let i=0;i<4;i++)quad(ends[0][i],ends[0][(i+1)%4],ends[1][(i+1)%4],ends[1][i],col);
  }
  function ellipsoid(center,radii,col,angle=0){
   const cs=Math.cos(angle),sn=Math.sin(angle);
   for(const u of sphere){
    const x=u[0]*radii[0],y=u[1]*radii[1],z=u[2]*radii[2],nx=u[0]/radii[0],ny=u[1]/radii[1],nz=u[2]/radii[2],length=Math.hypot(nx,ny,nz)||1;
    vertex(center[0]+x*cs-z*sn,center[1]+y,center[2]+x*sn+z*cs,(nx*cs-nz*sn)/length,ny/length,(nx*sn+nz*cs)/length,col);
   }
  }
  function jersey(center,angle,main,trim,transform){
   const cs=Math.cos(angle),sn=Math.sin(angle),levels=[[-.32,.21,.29],[-.23,.23,.31],[-.15,.24,.32],[.12,.29,.40],[.27,.24,.35],[.32,.16,.25]];
   const point=(row,t)=>transform?transform(Math.cos(t)*row[1],row[0],Math.sin(t)*row[2]):[center[0]+Math.cos(t)*row[1]*cs-Math.sin(t)*row[2]*sn,center[1]+row[0],center[2]+Math.cos(t)*row[1]*sn+Math.sin(t)*row[2]*cs];
   for(let i=0;i<levels.length-1;i++)for(let j=0;j<10;j++){const a=j*Math.PI/5,b=(j+1)*Math.PI/5;quad(point(levels[i],a),point(levels[i+1],a),point(levels[i+1],b),point(levels[i],b),i===1?trim:main);}
   for(let j=0;j<10;j++){const a=j*Math.PI/5,b=(j+1)*Math.PI/5;tri(transform?transform(0,.32,0):[center[0],center[1]+.32,center[2]],point(levels.at(-1),a),point(levels.at(-1),b),main);}
  }
  return {get data(){return data.subarray(0,used);},tri,quad,box,rod,ring,disk,shade,pad,ellipsoid,jersey};
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
 function skater(g,m,kit,uniform=true){
  const black=color('#101d2c'),steel=color('#91a9ba'),{jersey,trim}=kit,p=m.point,u=m.torsoPoint;
  if(!uniform){g.rod(m.heel,m.shaftTop,.032,black);g.rod(between(m.heel,m.shaftTop,.84),m.shaftTop,.037,trim);g.rod(m.heel,m.tip,.05,black);return;}
  for(let i=0;i<2;i++){
   const foot=m.feet[i],leg=m.legs[i],yaw=m.footAngles[i];
   g.box(...foot,.43,.17,.18,black,yaw);
   // Lifted recovery skate and its runner remain one rigid piece.
   g.box(foot[0],foot[1]-.075,foot[2],.47,.028,.048,steel,yaw);
   if(uniform){g.rod(leg.ankle,leg.knee,.12,jersey);g.rod(leg.knee,leg.hip,.155,black);}
   g.rod(between(leg.ankle,leg.knee,.64),between(leg.ankle,leg.knee,.84),.135,trim);
   if(uniform)g.ellipsoid(leg.knee,[.145,.145,.15],jersey,m.angle);
   if(m.brake>.45)for(let j=0;j<3;j++){
    const cs=Math.cos(yaw),sn=Math.sin(yaw),spread=(j+1)*.09*m.brake;
    const x=foot[0]-sn*spread,z=foot[2]+cs*spread;
    g.tri([x,.025,z],[x+cs*.05,.05+j*.035,z+sn*.05],[x-sn*.08,.03,z+cs*.08],color('#eaf6f8'));
   }
  }
  if(uniform){g.ellipsoid(p(-.07,.79-m.lower,0),[.26,.23,.29],black,m.angle);g.jersey(m.torso,m.torsoAngle,jersey,trim,u);}
  g.rod(u(0,.25,0),u(.02,.43,0),.10,color('#caa887'));
  const head=u(.02,.47+m.headRise,0),helmet=u(-.01,.62+m.headRise,0);
  g.ellipsoid(head,[.15,.19,.17],color('#caa887'),m.torsoAngle);
  g.ellipsoid(helmet,[.235,.195,.235],jersey,m.torsoAngle);
  for(const side of [-1,1])g.rod(u(-.10,.43,side*.17),u(.14,.39,side*.17),.023,black);
  g.box(...u(.22,.55,0),.026,.085,.32,steel,m.torsoAngle);
  // Visor rim, helmet ventilation and fabric panels add readable equipment
  // detail without textures, external assets or another draw call per player.
  for(const side of [-1,1]){
   g.quad(u(-.08,.69+m.headRise,side*.18),u(.08,.69+m.headRise,side*.18),u(.10,.66+m.headRise,side*.20),u(-.08,.66+m.headRise,side*.20),black);
   g.quad(u(.275,.52+m.headRise,side*.01),u(.25,.52+m.headRise,side*.15),u(.25,.48+m.headRise,side*.15),u(.275,.48+m.headRise,side*.01),color('#b7d5df'));
   g.quad(u(-.20,.17,side*.32),u(.18,.17,side*.32),u(.20,.13,side*.32),u(-.20,.13,side*.32),trim);
  }
  // Chest and cuffs use the same spine/arm transforms as the jersey.
  g.quad(u(.277,.02,-.08),u(.277,.17,-.08),u(.277,.17,.08),u(.277,.02,.08),trim);
  for(const arm of m.arms){
   if(uniform){g.rod(arm.shoulder,arm.elbow,.13,jersey);g.rod(arm.elbow,arm.hand,.10,jersey);}
   g.rod(between(arm.shoulder,arm.elbow,.16),between(arm.shoulder,arm.elbow,.38),.14,trim);
   g.ellipsoid(arm.hand,[.13,.12,.14],black,m.torsoAngle);
   g.box(arm.hand[0],arm.hand[1]+.09,arm.hand[2],.12,.026,.17,trim,m.torsoAngle);
  }
  g.rod(m.heel,m.shaftTop,.032,black);
  g.rod(between(m.heel,m.shaftTop,.84),m.shaftTop,.037,trim);
  g.rod(m.heel,m.tip,.05,black);
 }
 const digitSegments=['abcdef','bc','abged','abgcd','fgbc','afgcd','afgecd','abc','abcdefg','abcdfg'];
 function jerseyNumber(g,m,number,kit){
  if(!Number.isInteger(number)||number<1||number>99)return;
  const ink=dot(kit.jersey,[.2126,.7152,.0722])>.55?color('#102033'):color('#f6f4e8');
  const paths={a:[[-.06,.12],[.06,.12]],b:[[.065,.115],[.065,.012]],c:[[.065,-.012],[.065,-.115]],d:[[-.06,-.12],[.06,-.12]],e:[[-.065,-.115],[-.065,-.012]],f:[[-.065,.012],[-.065,.115]],g:[[-.06,0],[.06,0]]};
  const digits=String(number);
  for(const [face,scale] of [[-1,1],[1,.65]])for(let i=0;i<digits.length;i++){
   const center=(i-(digits.length-1)/2)*.18*scale;
   for(const key of digitSegments[Number(digits[i])]){
    const [a,b]=paths[key],p=([x,y])=>m.torsoPoint(face*.298,.07+y*scale,-face*(center+x*scale));
    const from=p(a),to=p(b),thick=.011*scale;
    const axis=unit(sub(to,from));
    // A narrow flat strip, drawn just outside the fabric surface.
    const tangent=unit(cross(axis,[Math.cos(m.torsoAngle),0,Math.sin(m.torsoAngle)]));
    g.quad(from.map((v,j)=>v+tangent[j]*thick),to.map((v,j)=>v+tangent[j]*thick),to.map((v,j)=>v-tangent[j]*thick),from.map((v,j)=>v-tangent[j]*thick),ink);
   }
  }
 }
 function goalkeeper(g,m,kit,uniform=true){
  const white=color('#e8eef1'),black=color('#101d2c'),steel=color('#91a9ba'),p=m.point,u=m.torsoPoint;
  if(!uniform){g.rod(m.blade,m.shaftTop,.038,black);g.rod(m.blade,between(m.blade,m.blocker,.67),.06,white);g.rod(m.blade,m.tip,.055,black);return;}
  for(let i=0;i<2;i++){
   const side=i?1:-1,foot=m.feet[i],leg=m.legs[i],angle=m.angle+side*m.drop*1.1;
   g.box(...foot,.48,.17,.19,black,angle);g.box(foot[0],foot[1]-.075,foot[2],.52,.028,.05,steel,angle);
   g.rod(leg.hip,leg.knee,.17,black);g.rod(leg.knee,leg.ankle,.14,kit.jersey);
   const front=v=>[v[0]+Math.cos(m.angle)*.16,v[1],v[2]+Math.sin(m.angle)*.16];
   g.pad(front(leg.ankle),front([leg.knee[0],leg.knee[1]+.13,leg.knee[2]]),.34,.19,white,m.angle);
   g.pad(front(between(leg.ankle,leg.knee,.58)),front(between(leg.ankle,leg.knee,.77)),.35,.20,kit.trim,m.angle);
  }
  g.ellipsoid(p(-.05,.82-m.lower,0),[.28,.22,.32],black,m.angle);g.jersey(m.torso,m.angle,kit.jersey,kit.trim);
  g.rod(u(0,.26,0),u(.05,.43,0),.10,color('#caa887'));
  g.ellipsoid(u(.08,.47,0),[.17,.19,.18],color('#caa887'),m.angle);g.ellipsoid(u(.03,.61,0),[.245,.20,.245],white,m.angle);
  for(const z of [-.15,0,.15])g.rod(u(.27,.35,z),u(.28,.62,z),.014,steel);
  for(const h of [.36,.46,.58])g.rod(u(.28,h,-.17),u(.28,h,.17),.014,steel);
  for(const arm of m.arms){
   g.rod(arm.shoulder,arm.elbow,.145,kit.jersey);g.rod(arm.elbow,arm.hand,.115,kit.jersey);
   g.rod(between(arm.shoulder,arm.elbow,.15),between(arm.shoulder,arm.elbow,.37),.155,kit.trim);
   if(arm.catching){g.ellipsoid(arm.hand,[.13,.21,.25],white,m.angle);g.ellipsoid([arm.hand[0]+Math.cos(m.angle)*.1,arm.hand[1],arm.hand[2]+Math.sin(m.angle)*.1],[.035,.14,.17],color('#bccbd1'),m.angle);}
   else g.box(...arm.hand,.14,.29,.24,white,m.angle);
  }
  g.rod(m.blade,m.shaftTop,.038,black);g.rod(m.blade,between(m.blade,m.blocker,.67),.06,white);g.rod(m.blade,m.tip,.055,black);
 }
 function figures(frame,teams,skinned=false,poses=new Map()){
  const g=geometry(),black=color('#101d2c'),white=color('#e8eef1'),uniforms=kits(teams);
  for(const a of frame.actors){
   const m=poses.get(a.id)||pose(frame,a),kit=uniforms[a.side],shadow=m.point(0,0,0);
   g.shade(shadow[0],shadow[2],m.keeper?.58:.47,m.keeper?.8:.50,m.angle);
   for(const foot of m.feet)g.shade(foot[0],foot[2],.28,.13,m.angle);
   if(a.id===frame.carrier)g.ring(a.x,a.y,.85,.07,kit.trim);
   if(m.keeper)goalkeeper(g,m,kit,!skinned);else skater(g,m,kit,!skinned);
   if(!skinned)jerseyNumber(g,m,a.number,kit);
  }
  const h=.09+(frame.puck.z||0);
  // The ground shadow stays on the ice; the puck, marker and short trail use
  // recorded height. A caught puck is enclosed by the keeper's equipment.
  if(!frame.puck.heldBy){
   g.shade(frame.puck.x,frame.puck.y,.20+(frame.puck.z||0)*.045,.15+(frame.puck.z||0)*.035);
   if(frame.flight){
    const start=frame.flight.start,dx=frame.puck.x-start.x,dz=frame.puck.y-start.y,d=Math.hypot(dx,dz),length=Math.min(d,2.3),fraction=d?length/d:0;
    if(d>.05)g.rod([frame.puck.x-dx*fraction,mix(h,.09+(start.z||0),fraction),frame.puck.y-dz*fraction],[frame.puck.x,h,frame.puck.y],.018,color('#718a98'));
   }
   g.disk(frame.puck.x,h-.025,frame.puck.y,.24,white);g.disk(frame.puck.x,h+.025,frame.puck.y,.18,black);g.box(frame.puck.x,h,frame.puck.y,.22,.05,.22,black);
  }
  return g.data;
 }
 function replayAnalysis(frames,frame,observation=null){
  const clock=frame.wall??frame.time,past=frames.filter(f=>(f.wall??f.time)<=clock+1e-7&&(f.wall??f.time)>=clock-5);
  const latest=predicate=>[...past,frame].reverse().find(predicate),lines=[],rings=[],notes=[];
  const pass=latest(f=>f.flight?.kind==='pass');
  if(pass){lines.push({kind:'pass',points:[pass.flight.start,pass.flight.end]});notes.push('Blå linje: den spelade passningsvägen.');}
  let shot=latest(f=>f.flight?.kind==='shot');
  if(!shot){
   // A close block/save may complete between replay captures. The observed
   // release action still records its real origin and intended shooting lane.
   const release=[...past,frame].flatMap(f=>f.actors).filter(a=>a.action?.kind==='shot'&&a.action.at<=clock&&clock-a.action.at<5).sort((a,b)=>b.action.at-a.action.at)[0];
   if(release)shot={flight:{from:release.id,side:release.side,start:release.action.origin,end:release.action.target}};
  }
  const side=shot?.flight.side??frame.owner;
  const preparing=frame.actors.find(a=>a.windup&&a.windup.at<=clock);
  if(preparing){lines.push({kind:'shot',points:[frame.puck,preparing.windup.target]});notes.unshift('Rött: skytten förbereder avslutet och kan fortfarande störas.');}
  else if(shot)lines.push({kind:'shot',points:[shot.flight.start,shot.flight.end]});
  const keeper=frame.actors.find(a=>a.role==='G'&&a.side!==side);
  if(keeper){
   const trail=past.filter(f=>(f.wall??f.time)>=clock-2.5).map(f=>f.actors.find(a=>a.id===keeper.id)).filter(Boolean);
   trail.push(keeper);const travel=trail.slice(1).reduce((sum,a,i)=>sum+Math.hypot(a.x-trail[i].x,a.y-trail[i].y),0);
   if(travel>.15){lines.push({kind:'keeper',points:trail.map(a=>({x:a.x,y:a.y}))});notes.push('Grönt spår: målvakten har förflyttat sig '+travel.toFixed(1).replace('.',',')+' m.');}
   if(shot){
    const origin=shot.flight.start,dx=keeper.x-origin.x,dy=keeper.y-origin.y,l=dx*dx+dy*dy;
    const screens=frame.actors.filter(a=>a.role!=='G'&&a.id!==shot.flight.from).filter(a=>{
     const t=l?((a.x-origin.x)*dx+(a.y-origin.y)*dy)/l:0;return t>.15&&t<.98&&Math.hypot(a.x-origin.x-dx*t,a.y-origin.y-dy*t)<.9;
    });
    if(screens.length){lines.push({kind:'screen',points:[origin,{x:keeper.x,y:keeper.y}]});screens.forEach(a=>rings.push({kind:'screen',x:a.x,y:a.y}));notes.unshift('Gult: '+screens.map(a=>a.name?.split(' ').at(-1)||'spelare').join(', ')+' står i målvaktens siktlinje.');}
    else notes.unshift('Fri siktlinje mellan skottet och målvakten i detta ögonblick.');
   }
  }
  const contacts=frame.actors.filter(a=>a.contactAction&&clock-a.contactAction.at>=0&&clock-a.contactAction.at<.9);
  for(const a of contacts){const c=a.contactAction;if(['block','tip','check','pin','bobble'].includes(c.kind)){rings.push({kind:'contact',x:c.spot.x,y:c.spot.y});notes.unshift((a.name||'Spelaren')+' · '+({block:'blockerar vid puckkontakten',tip:'styr pucken',check:'fullföljer tacklingen',pin:'låser sargduellen',bobble:'tappar den första mottagningen'})[c.kind]+'.');}}
  if(observation&&clock>=observation.wall){
   const point=observation.spot;
   rings.push({kind:'contact',x:point.x,y:point.y});
   if(observation.from)lines.push({kind:observation.kind==='marking'?'contact':'pass',points:[observation.from,point]});
   for(const id of observation.players||[]){const actor=frame.actors.find(a=>a.id===id);if(actor)rings.push({kind:'contact',x:actor.x,y:actor.y});}
   const text=({diagonal:'Markerat: den genomförda diagonalpassningen.',turnover:'Markerat: puckkontrollen går över till motståndaren.',support:'Vid observationen saknas en nära medspelare med fri passningsväg.',marking:'Markerat: mottagaren har över fyra meter till sin tilldelade försvarare.','pp-rotation':'Markerat: passning under lagets PP-rotation.','pk-press':'Markerat: BP följer upp en misslyckad mottagning med press.'})[observation.kind];if(text)notes.unshift(text);
  }
  if(!notes.length)notes.push('Spola fram till passningen eller skottet för att läsa situationen.');
  return {lines,rings,notes:notes.slice(0,3)};
 }
 function analysisGeometry(analysis){
  const g=geometry(),colors={pass:color('#148ed1'),screen:color('#c58c00'),keeper:color('#15866e'),contact:color('#cf503b'),shot:color('#b54c46')};
  for(const line of analysis?.lines||[])for(let i=1;i<line.points.length;i++){
   const a=line.points[i-1],b=line.points[i];if(Math.hypot(a.x-b.x,a.y-b.y)<.02)continue;
   g.rod([a.x,.09,a.y],[b.x,.09,b.y],.075,colors[line.kind]);
  }
  for(const ring of analysis?.rings||[])g.ring(ring.x,ring.y,.9,.10,colors[ring.kind]);
  return g.data;
 }
 function crowdReaction(frame,side){
  const clock=frame.wall??frame.time;
  const event=(frame.effects||[]).filter(e=>e.at<=clock&&clock-e.at<2.8&&['goal','save','block','miss'].includes(e.kind)).at(-1);
  if(!event)return 0;
  const age=clock-event.at,envelope=smooth(age/.18)*(1-smooth((age-.65)/2.1));
  return event.kind==='goal'?(event.side===side?1:.08)*envelope:['save','block'].includes(event.kind)&&event.side===side?.38*envelope:event.kind==='miss'&&event.side===side?.17*envelope:0;
 }
 function crowd(frame,teams,homeSide=0,step=1){
  const g=geometry(),uniforms=kits(teams),skin=color('#b89c85'),pants=color('#162333');
  for(let row=0;row<5;row++)for(let col=0;col<25;col+=step){
   const x=col*2.5;if(Math.abs(x-30)<1.5||Math.abs(x-10)<1||Math.abs(x-50)<1)continue;
   const i=row*25+col,side=i%7===0?1-homeSide:homeSide,level=crowdReaction(frame,side);
   const lift=level*(.7+(i%4)*.1),y=1.03+row*.85+lift*.20,z=-3-row*1.7,shirt=i%3===0?uniforms[side].trim:uniforms[side].jersey;
   g.box(x,y+.10,z,.55,.34,.38,pants);g.box(x,y+.47,z,.59,.47,.32,shirt);g.box(x,y+.86,z,.30,.32,.29,skin);
   for(const arm of [-1,1]){
    const shoulder=[x+arm*.3,y+.62,z],hand=[x+arm*(.34+lift*.1),y+.3+lift*.98,z+.17];
    g.pad(shoulder,hand,.15,.15,shirt,0);g.box(...hand,.15,.15,.15,skin);
   }
  }
  return g.data;
 }
 let current=null;
 function dispose(){if(!current)return;const c=current;current=null;c.canvas.removeEventListener('webglcontextlost',c.lost);c.gl.deleteBuffer(c.staticBuffer);c.gl.deleteBuffer(c.dynamicBuffer);c.gl.deleteBuffer(c.crowdBuffer);c.gl.deleteBuffer(c.analysisBuffer);c.gl.deleteBuffer(c.skinBuffer);c.gl.deleteBuffer(c.skinIndexBuffer);c.gl.deleteBuffer(c.surfaceBuffer);c.gl.deleteTexture(c.uniformTexture);c.gl.deleteProgram(c.program);c.gl.getExtension('WEBGL_lose_context')?.loseContext();}
 function create(canvas){
  const gl=canvas.getContext('webgl',{alpha:false,antialias:true});if(!gl)throw Error('3D kunde inte starta på den här datorn. 2D är fortfarande tillgängligt.');
  const shader=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){gl.deleteShader(s);throw Error('3D kunde inte läsa grafikprogrammet.');}return s;};
  const vs=shader(gl.VERTEX_SHADER,'attribute vec3 position;attribute vec3 normal;attribute vec3 color;attribute vec2 uv;attribute vec2 surface;uniform mat4 camera;varying vec2 texCoord;varying vec2 material;varying vec3 tint;varying vec3 worldNormal;varying vec3 worldPosition;void main(){texCoord=uv;material=surface;tint=color;worldNormal=normal;worldPosition=position;gl_Position=camera*vec4(position,1.);}');
  const fs=shader(gl.FRAGMENT_SHADER,`precision mediump float;varying vec2 texCoord;varying vec2 material;varying vec3 tint;varying vec3 worldNormal;varying vec3 worldPosition;uniform sampler2D uniformMap;uniform vec3 eye;uniform float shine;uniform float detail;void main(){
   vec3 n=normalize(worldNormal);if(!gl_FrontFacing)n=-n;vec3 key=normalize(vec3(-.4,1.,.35)),fill=normalize(vec3(.6,.5,-.7));
   float diffuse=.55+.35*max(0.,dot(n,key))+.16*max(0.,dot(n,fill));vec3 base=tint;
   if(texCoord.x>=0.){vec4 ink=texture2D(uniformMap,texCoord);base=mix(base,ink.rgb,ink.a);if(detail>.5)base*=.987+.013*sin(texCoord.x*980.);}
   vec3 view=normalize(eye-worldPosition),halfVector=normalize(key+view);float rough=material.x,metal=material.y;
   bool ice=worldPosition.y<.022&&worldPosition.y>=-.002;
   if(ice){rough=.28;if(detail>.5){float scratches=sin(worldPosition.x*83.+sin(worldPosition.z*13.))*sin(worldPosition.z*41.);base*=.993+scratches*.007;}}
   float exponent=mix(8.,100.,1.-rough),spec=pow(max(0.,dot(n,halfVector)),exponent)*(shine+(1.-rough)*.22+metal*.2);
   vec3 specColor=mix(vec3(.83,.91,1.),base,metal),lit=base*diffuse*(1.-metal*.22)+specColor*spec;
   if(detail>.5){vec3 second=normalize(vec3(.55,1.,-.45)+view);lit+=specColor*pow(max(0.,dot(n,second)),exponent)*(.035+(1.-rough)*.09);}
   if(ice&&detail>1.5){
    vec3 r=reflect(-view,n);float t=(15.-worldPosition.y)/max(.08,r.y);vec2 ceiling=worldPosition.xz+r.xz*t;
    vec2 lamp=abs(mod(ceiling+vec2(3.,1.5),vec2(12.,10.))-vec2(6.,5.));
    float reflected=(1.-smoothstep(.7,1.8,lamp.x))*(1.-smoothstep(.22,.75,lamp.y));
    lit+=vec3(.78,.87,1.)*reflected*.10*max(0.,r.y);
   }
   float mist=smoothstep(45.,95.,distance(eye,worldPosition))*.12;gl_FragColor=vec4(mix(lit,vec3(.10,.17,.24),mist),1.);}`);
  const program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);if(!gl.getProgramParameter(program,gl.LINK_STATUS)){gl.deleteProgram(program);throw Error('3D kunde inte starta grafikprogrammet.');}
  const staticBuffer=gl.createBuffer(),dynamicBuffer=gl.createBuffer(),crowdBuffer=gl.createBuffer(),mesh=rink();gl.bindBuffer(gl.ARRAY_BUFFER,staticBuffer);gl.bufferData(gl.ARRAY_BUFFER,mesh,gl.STATIC_DRAW);
  const lost=e=>{e.preventDefault();canvas.dataset.error='Grafiken avbröts. Välj 2D eller försök 3D igen.';};canvas.addEventListener('webglcontextlost',lost);
  const uniformTexture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,uniformTexture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([0,0,0,0]));gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  return {canvas,gl,program,uniformTexture,skinBuffer:gl.createBuffer(),skinIndexBuffer:gl.createBuffer(),surfaceBuffer:gl.createBuffer(),surfaceLocation:gl.getAttribLocation(program,'surface'),skinCount:0,texLocation:gl.getAttribLocation(program,'uv'),staticBuffer,dynamicBuffer,crowdBuffer,analysisBuffer:gl.createBuffer(),count:mesh.length/9,locations:['position','normal','color'].map(n=>gl.getAttribLocation(program,n)),matrix:gl.getUniformLocation(program,'camera'),eye:gl.getUniformLocation(program,'eye'),shine:gl.getUniformLocation(program,'shine'),detail:gl.getUniformLocation(program,'detail'),lost,hits:[],frames:0,geometryBuilds:0,geometryKey:null,dynamicCount:0};
 }
 function draw(canvas,frame,before,t,options={}){
  if(!frame||canvas.dataset.error)return false;
  if(current?.canvas!==canvas){dispose();try{current=create(canvas);}catch(error){canvas.dataset.error=error.message;return false;}}
  const c=current,gl=c.gl;if(gl.isContextLost())return false;
  if(options.suspended&&canvas.dataset.ready==='true'){c.lastDraw=null;return true;}
  const drawStarted=performance.now();
  const q=quality(options.quality);c.quality=Object.hasOwn(QUALITY,options.quality)?options.quality:'normal';
  const rect=canvas.getBoundingClientRect(),dpr=Math.min(q.dpr,globalThis.devicePixelRatio||1)*q.scale,w=Math.max(1,Math.round(rect.width*dpr)),h=Math.max(1,Math.round(rect.height*dpr));
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
  gl.viewport(0,0,w,h);gl.clearColor(.035,.065,.105,1);gl.enable(gl.DEPTH_TEST);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(c.program);
  const f=sample(frame,before,t),view=cameraFrame(w/h,options.camera,f,c.tracked,options.zoom),mat=view.matrix;c.tracked=view.tracked;
  gl.uniformMatrix4fv(c.matrix,false,mat);gl.uniform3fv(c.eye,view.eye);gl.uniform1f(c.detail,q.level);
  const bind=buffer=>{gl.disableVertexAttribArray(c.surfaceLocation);gl.vertexAttrib2f(c.surfaceLocation,.85,0);gl.disableVertexAttribArray(c.texLocation);gl.vertexAttrib2f(c.texLocation,-1,-1);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);c.locations.forEach((loc,i)=>{gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,3,gl.FLOAT,false,36,i*12);});};
  bind(c.staticBuffer);gl.uniform1f(c.shine,.045);gl.drawArrays(gl.TRIANGLES,0,c.count);
  const reactions=[0,1].map(side=>Math.round(crowdReaction(f,side)*15)/15),crowdKey=JSON.stringify([options.teams,options.homeSide,reactions,q.crowdStep]);
  bind(c.crowdBuffer);
  if(crowdKey!==c.crowdKey){const mesh=crowd(f,options.teams||[],options.homeSide??0,q.crowdStep);gl.bufferData(gl.ARRAY_BUFFER,mesh,gl.DYNAMIC_DRAW);c.crowdCount=mesh.length/9;c.crowdKey=crowdKey;}
  gl.drawArrays(gl.TRIANGLES,0,c.crowdCount);bind(c.dynamicBuffer);
  const geometryKey=JSON.stringify([f.time,f.wall,f.phase,f.carrier,f.puck,f.flight,f.actors,options.teams]);
  if(geometryKey!==c.geometryKey){const started=performance.now(),poses=new Map(f.actors.map(a=>[a.id,pose(f,a)])),skinned=typeof HockeyPlayerModel!=='undefined',dynamic=figures(f,options.teams||[],skinned,poses);if(skinned){const skin=HockeyPlayerModel.mesh(f.actors,poses,kits(options.teams||[]));gl.bindBuffer(gl.ARRAY_BUFFER,c.skinBuffer);gl.bufferData(gl.ARRAY_BUFFER,skin,gl.DYNAMIC_DRAW);c.skinCount=skin.length/11;const layout=f.actors.map(HockeyPlayerModel.kind).join(',');if(layout!==c.skinLayout){const indices=HockeyPlayerModel.indices(f.actors);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,c.skinIndexBuffer);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,indices,gl.STATIC_DRAW);c.skinElements=indices.length;c.skinLayout=layout;c.skinActors=f.actors.length;gl.bindBuffer(gl.ARRAY_BUFFER,c.surfaceBuffer);gl.bufferData(gl.ARRAY_BUFFER,HockeyPlayerModel.surfaces(f.actors),gl.STATIC_DRAW);}bind(c.dynamicBuffer);}gl.bufferData(gl.ARRAY_BUFFER,dynamic,gl.DYNAMIC_DRAW);c.dynamicCount=dynamic.length/9;c.geometryKey=geometryKey;c.geometryBuilds++;c.buildMS=performance.now()-started;}
  gl.uniform1f(c.shine,.13);gl.drawArrays(gl.TRIANGLES,0,c.dynamicCount);
  if(c.skinCount){
   const atlasKey=JSON.stringify([f.actors.map(a=>[a.id,a.number,a.name,a.side]),options.teams]);
   if(c.atlasKey!==atlasKey){const atlas=HockeyPlayerModel.atlas(document.createElement('canvas'),f.actors,kits(options.teams||[]));gl.bindTexture(gl.TEXTURE_2D,c.uniformTexture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,atlas);c.atlasKey=atlasKey;}
   gl.bindBuffer(gl.ARRAY_BUFFER,c.skinBuffer);c.locations.forEach((loc,i)=>{gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,3,gl.FLOAT,false,44,i*12);});gl.enableVertexAttribArray(c.texLocation);gl.vertexAttribPointer(c.texLocation,2,gl.FLOAT,false,44,36);gl.bindBuffer(gl.ARRAY_BUFFER,c.surfaceBuffer);gl.enableVertexAttribArray(c.surfaceLocation);gl.vertexAttribPointer(c.surfaceLocation,2,gl.FLOAT,false,8,0);gl.uniform1f(c.shine,.04);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,c.skinIndexBuffer);gl.drawElements(gl.TRIANGLES,c.skinElements,gl.UNSIGNED_SHORT,0);gl.disableVertexAttribArray(c.texLocation);gl.vertexAttrib2f(c.texLocation,-1,-1);
  }
  c.analysisCount=0;
  if(options.analysis){
   bind(c.analysisBuffer);const key=JSON.stringify(options.analysis);
   if(key!==c.analysisKey){const mesh=analysisGeometry(options.analysis);gl.bufferData(gl.ARRAY_BUFFER,mesh,gl.DYNAMIC_DRAW);c.analysisVertices=mesh.length/9;c.analysisKey=key;}
   c.analysisCount=c.analysisVertices;gl.uniform1f(c.shine,0);gl.drawArrays(gl.TRIANGLES,0,c.analysisCount);
  }
  c.hits=f.actors.map(a=>({id:a.id,name:a.name,number:a.number,...project([a.x,1,a.y],mat)}));c.frames++;canvas.dataset.ready='true';
  const label=document.getElementById('match-3d-carrier'),carrier=c.hits.find(a=>a.id===f.carrier);
  if(label){label.hidden=!carrier;if(carrier){label.textContent=(carrier.number?'#'+carrier.number+' ':'')+carrier.name;label.style.left=Math.max(8,Math.min(92,carrier.x*100))+'%';label.style.top=Math.max(8,Math.min(85,carrier.y*100-8))+'%';}}
  const marker=document.getElementById('match-3d-puck');if(marker){const p=project([f.puck.x,.1+(f.puck.z||0),f.puck.y],mat);marker.hidden=Boolean(f.puck.heldBy)||options.puckMarker===false||p.x<0||p.x>1||p.y<0||p.y>1;marker.style.left=p.x*100+'%';marker.style.top=p.y*100+'%';}
  c.renderMS=performance.now()-drawStarted;c.frameTimes??=[];if(c.lastDraw!=null&&drawStarted-c.lastDraw<1000&&c.lastFrameWall!==f.wall){c.frameTimes.push(drawStarted-c.lastDraw);if(c.frameTimes.length>180)c.frameTimes.shift();}c.lastDraw=drawStarted;c.lastFrameWall=f.wall;
  return true;
 }
 function pick(canvas,x,y){if(current?.canvas!==canvas)return null;const r=canvas.getBoundingClientRect();return current.hits.map(a=>({...a,d:Math.hypot(a.x*r.width-x,a.y*r.height-y)})).filter(a=>a.d<24).sort((a,b)=>a.d-b.d)[0]?.id??null;}
 return {draw,dispose,pick,sample,pose,quality,camera,cameraFrame,project,trackPuck,kits,figures,crowd,crowdReaction,replayAnalysis,analysisGeometry,diagnostics:()=>current?{quality:current.quality,width:current.canvas.width,height:current.canvas.height,frames:current.frames,actors:current.hits.length,vertices:current.dynamicCount+current.skinCount,skinVertices:current.skinCount,modelActors:current.skinActors||0,rigJoints:current.skinCount?HockeyPlayerModel.model().joints.length:0,renderMS:current.renderMS,frameSamples:current.frameTimes?.length||0,frameP95:current.frameTimes?.length?[...current.frameTimes].sort((a,b)=>a-b)[Math.floor((current.frameTimes.length-1)*.95)]:null,crowdVertices:current.crowdCount,analysisVertices:current.analysisCount,geometryBuilds:current.geometryBuilds,buildMS:current.buildMS,error:current.gl.getError()}:null};
})();
let studioVisualMode='2d',studioCamera3D='auto',studioExpanded3D=false,studioZoom3D=1,studioPuckMarker3D=true;
function studioSetVisual(mode){if(!['2d','3d'].includes(mode))return;Match3D.dispose();studioVisualMode=mode;render();}
function studioToggleRink(){if(studioVisualMode!=='3d')return;studioExpanded3D=!studioExpanded3D;render();}
function studioSetCamera(mode){if(['tv','overhead','follow','auto'].includes(mode))studioCamera3D=mode;}
function studioSetZoom(value){const n=Number(value);if(!Number.isFinite(n))return;studioZoom3D=Math.max(.8,Math.min(1.5,Math.round(n*10)/10));const label=document.getElementById('match-3d-zoom');if(label)label.textContent=Math.round(studioZoom3D*100)+'%';}
function studioTogglePuck(){studioPuckMarker3D=!studioPuckMarker3D;document.getElementById('match-3d-puck-toggle')?.setAttribute('aria-pressed',String(studioPuckMarker3D));}
function studio3DControls(){return `<div class="match-3d-controls"><label>Matchvy <select aria-label="Matchvy" onchange="studioSetVisual(this.value)"><option value="2d" ${studioVisualMode==='2d'?'selected':''}>2D</option><option value="3d" ${studioVisualMode==='3d'?'selected':''}>3D</option></select></label>${studioAudioControl()}${studioVisualMode==='3d'?`<label>Kamera <select aria-label="3D-kamera" onchange="studioSetCamera(this.value)"><option value="auto" ${studioCamera3D==='auto'?'selected':''}>Matchkamera</option><option value="tv" ${studioCamera3D==='tv'?'selected':''}>TV</option><option value="overhead" ${studioCamera3D==='overhead'?'selected':''}>Överblick</option><option value="follow" ${studioCamera3D==='follow'?'selected':''}>Följ pucken</option></select></label><div class="match-3d-zoom" role="group" aria-label="Kamerazoom"><button type="button" onclick="studioSetZoom(studioZoom3D-.1)" aria-label="Zooma ut">−</button><button type="button" id="match-3d-zoom" onclick="studioSetZoom(1)" aria-label="Återställ zoom">${Math.round(studioZoom3D*100)}%</button><button type="button" onclick="studioSetZoom(studioZoom3D+.1)" aria-label="Zooma in">+</button></div><button type="button" id="match-3d-puck-toggle" onclick="studioTogglePuck()" aria-pressed="${studioPuckMarker3D}">Markera puck</button><button type="button" class="match-3d-expand" onclick="studioToggleRink()" aria-pressed="${studioExpanded3D}">${studioExpanded3D?'Visa coachbänken':'Stor rink'}</button>`:''}</div>`;}

function studioGraphicsQuality(){return ['low','normal','high'].includes(matchPreferences().graphics3d)?matchPreferences().graphics3d:'normal';}
function studioSetGraphics(value){if(!['low','normal','high'].includes(value))return;matchPreferences().graphics3d=value;save();render();}
function studioGraphicsSettings(){return `<section class="mc-playback-settings"><h3>Grafik för 3D-matchen</h3><label>Grafiknivå <select aria-label="3D-grafik" onchange="studioSetGraphics(this.value)">${[['low','Låg'],['normal','Normal'],['high','Hög']].map(([v,label])=>`<option value="${v}" ${studioGraphicsQuality()===v?'selected':''}>${label}</option>`).join('')}</select></label><p>Låg minskar upplösningen och publiken. Normal ger balanserad detaljrikedom. Hög ger skarpare bild på högupplösta skärmar och ljusreflexer i isen.</p><p>Valet sparas och gäller även repriser. Matchens tempo ställer du in separat.</p></section>`;}
