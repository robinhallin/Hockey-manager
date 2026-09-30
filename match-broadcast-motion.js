'use strict';
// Original hockey movement curves. Sampled from recorded distance/action time;
// no advancing mixer clock, simulated outcomes or presentation-only movement.
const HockeyMotion=(()=>{
 const clips={
  skate:[[0,.23,0,.23],[.18,.09,0,.30],[.46,-.36,0,.57],[.62,-.25,.10,.45],[.82,.11,.14,.18],[1,.23,0,.23]],
  backward:[[0,-.16,0,.27],[.22,.04,0,.35],[.47,.31,0,.54],[.67,.15,.065,.39],[.85,-.13,.09,.22],[1,-.16,0,.27]],
  crossover:[[0,.21,0,.24],[.24,.04,0,.30],[.47,-.30,0,.48],[.68,-.08,.14,-.06],[.85,.21,.16,-.10],[1,.21,0,.24]],
  // Authored pelvis keys: fore/aft, lateral load, compression, yaw, roll.
  // The load passes over the supporting skate before the recovering leg lands.
  weight:[[0,0,0,.050,0,0],[.12,.005,-.070,.055,-.040,.025],[.30,-.018,-.110,.010,.055,.035],[.46,0,-.025,.045,.020,0],[.50,0,0,.050,0,0],[.62,.005,.070,.055,.040,-.025],[.80,-.018,.110,.010,-.055,-.035],[.96,0,.025,.045,-.020,0],[1,0,0,.050,0,0]],
  wrist:[[0,0],[.14,.66],[.36,1],[.64,.63],[1,0]],
  slap:[[0,0],[.17,.91],[.34,1],[.58,.62],[1,0]],
  'one-timer':[[0,0],[.10,.90],[.25,1],[.62,.54],[1,0]],
  pass:[[0,0],[.20,.73],[.42,1],[.72,.44],[1,0]],
  transfer:[[0,0],[.10,.86],[.20,1],[.46,.66],[.72,.20],[1,0]],
  windup:[[0,0],[.20,.30],[.48,1],[.68,.84],[.88,.20],[1,0]]
 };
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);},mix=(a,b,t)=>a+(b-a)*t;
 function at(name,time){
  const rows=clips[name],t=Math.max(0,Math.min(1,time));let i=1;while(i<rows.length-1&&t>rows[i][0])i++;
  const a=rows[i-1],b=rows[i],u=smooth((t-a[0])/(b[0]-a[0]));return a.slice(1).map((v,k)=>mix(v,b[k+1],u));
 }
 function cycle(distance,side,{drive=0,backward=0,curve=0,brake=0,start=0,stopSide=1,pivot=0,bank=0,phase=distance/3.2}={}){
  const t=((phase+(side>0?.5:0))%1+1)%1,forward=at('skate',t),reverse=at('backward',t),cross=at('crossover',t);
  const crossing=side===-Math.sign(curve)?Math.abs(curve)*(1-backward*.65):0;
  const v=forward.map((n,i)=>mix(mix(n,reverse[i],backward),cross[i],crossing));
  const lift=v[1]*drive*(1-pivot*.55),load=1-smooth(lift/.045),extension=smooth(t/.46)*(1-smooth((t-.46)/.22));
  return {forward:v[0]*drive*(1-start*.28),lift,lateral:side*(.24+(v[2]-.24)*drive+brake*.12+pivot*.045),load,
   edge:side*(extension*.32+start*.22)*drive*(1-backward*1.65)+curve*.18+stopSide*brake*.95+side*pivot*.55,
   roll:-bank*(1-brake*.5)+side*.11*drive*extension+stopSide*brake*.12,
   pitch:-Math.sin(Math.PI*clamp((t-.52)/.48,0,1))*.26*drive*(1-pivot*.55)};
 }
 function body(distance,{phase=distance/3.2,drive=0,brake=0,start=0,turn=0,backward=0}={},speed=0,fatigue=0){
  const moving=smooth((speed-.1)/.8),w=at('weight',((phase%1)+1)%1),bank=clamp(Math.atan(speed*turn/9.81),-.42,.42)*(1-brake);
  drive*=moving;start*=moving;
  return {forward:w[0]*drive-brake*.055,lateral:w[1]*drive+bank*.12,
   lower:moving*.075+drive*.055+w[2]*drive+start*.035+brake*.10,
   lean:.10+drive*.10+start*.045-brake*.02+fatigue*.03,
   pitch:.12+drive*.18+start*.10+fatigue*.08-brake*.015,
   yaw:w[3]*drive-bank*.10,roll:w[4]*drive-bank*.5,pelvisPitch:.025+drive*.045-brake*.02,
   torsoRoll:-bank-w[4]*drive*.3,bank,pivot:moving*4*backward*(1-backward)};
 }
 // Both the fixed-step foot contact recorder and the render rig use this phase.
 // Distance advances it; pausing, seeking or changing FPS cannot advance a skate.
 function advance(previous,{speed,acceleration,turn,distance,height=185,energy=100,dt,phaseOffset=0,preferredSide=1}){
  const moving=smooth((speed-.1)/.8),brake=clamp(-acceleration/2.3,0,1)*moving;
  const effort=clamp((acceleration-.12)/2,0,1);
  // Sustained speed still requires occasional pushes against drag. A coasting
  // player with negative acceleration settles into a genuine two-foot glide.
  const maintenance=smooth((speed-1.2)/2.4)*.55*smooth((acceleration+.35)/.35);
  const drive=moving*Math.max(effort,maintenance)*(1-brake);
  const start=effort*(1-smooth((speed-.4)/2.8))*moving;
  const ease=1-Math.exp(-dt/.16),fatigue=clamp((70-energy)/55,0,1);
  const stride=clamp((2.25+speed*.24)*(height/185)*(1-fatigue*.12)*(1-start*.5),.95,3.7);
  const stopSide=previous?.brake>.02?(previous.stopSide||preferredSide):Math.abs(turn)>.15?Math.sign(turn):(previous?.stopSide||preferredSide);
  return {phase:(previous?.phase??phaseOffset)+Math.max(0,distance)/stride,start:mix(previous?.start||0,start,ease),stopSide,
   drive:mix(previous?.drive||0,drive,ease),brake:mix(previous?.brake||0,brake,ease),
   curve:mix(previous?.curve||0,clamp(turn/1.6,-1,1)*moving*(1-brake),ease)};
 }
 function action(name,t){return at(clips[name]?name:'pass',t)[0];}
 // The hips lead the shoulders through an observed release. All channels
 // return to neutral at either end, including the windup/contact boundary.
 // These offsets articulate the rig around its recorded root and skate plants.
 function delivery(style,load=0,progress=1){
  const strength=style==='slap'?1:style==='one-timer'?.85:style==='wrist'?.7:.3;
  const hip=action('transfer',progress)*strength,follow=action(style,progress)*strength,coil=load*strength;
  return {forward:.07*hip-.045*coil,lower:.035*coil-.022*hip,yaw:-.18*hip+.08*coil,
   chest:.10*follow-.05*coil,pitch:.13*follow+.07*coil,roll:.055*follow,
   shoulder:.055*follow,elbow:.09*follow,grip:.13*Math.max(follow,coil)};
 }
 // Upper-body counter-swing follows the same distance clock as the legs.
 // Holding/receiving a puck suppresses the free swing, leaving hands on shaft.
 function upper(phase,drive,occupied=0,backward=0){
  const wave=Math.sin(phase*Math.PI*2),counter=Math.sin(phase*Math.PI*2+.55);
  const free=drive*(1-smooth(occupied))*(1-backward*.45);
  return {yaw:wave*free*.085,shoulder:counter*free*.035,elbow:wave*free*.09,grip:counter*free*.045,stick:wave*free*.075};
 }
 function joint(root,end,pole,upper,lower){
  const v=end.map((n,i)=>n-root[i]),length=Math.hypot(...v)||1,axis=v.map(n=>n/length),d=clamp(length,.001,upper+lower-.001);
  const bend=pole.map((n,i)=>n-root[i]),projection=bend.reduce((s,n,i)=>s+n*axis[i],0),normal=bend.map((n,i)=>n-axis[i]*projection),size=Math.hypot(...normal)||1;
  const along=(upper*upper-lower*lower+d*d)/(2*d),height=Math.sqrt(Math.max(0,upper*upper-along*along));
  return root.map((n,i)=>n+axis[i]*along+normal[i]/size*height);
 }
 // Local coordinates: forward, height above ice, lateral. This equipment
 // envelope is shared by the simulation and renderer, including arm reach.
 function keeper({drop=0,load=0,catchSide=-1,glove,blocker}={}){
  drop=clamp(drop,0,1);const lower=.16+drop*.42,spread=1-Math.abs(load)*.30,torso=[.13,1.21-lower,0];
  const hands={},arms=[];
  for(const side of [-1,1]){
   const key=side===catchSide?'glove':'blocker',read=key==='glove'?glove:blocker;
   const shoulder=[.13,torso[1]+.20,side*.35],desired=read?[.4,read.z,read.lateral]:key==='glove'?[.48,.98-drop*.26,catchSide*.52]:[.57,.86-drop*.25,-catchSide*.40];
   const reach=desired.map((n,i)=>n-shoulder[i]),length=Math.hypot(...reach),hand=length>.90?shoulder.map((n,i)=>n+reach[i]*.90/length):desired;
   hands[key]=hand;arms.push({shoulder,hand,elbow:joint(shoulder,hand,[.03,torso[1]-.06,side*.65],.45,.47),catching:key==='glove'});
  }
  const feet=[-1,1].map(side=>[-drop*.12,.12,side*(.34+drop*.52*spread)]);
  const legs=feet.map((foot,i)=>{const side=i?1:-1,hip=[-.1,.92-lower,side*.18],ankle=[foot[0],foot[1]+.11,foot[2]];return {hip,ankle,knee:joint(hip,ankle,[.65,.5-lower*.4,side*.25],.45,.46)};});
  const pads=legs.map(l=>({center:l.knee.map((n,i)=>(n+l.ankle[i])/2),width:.19+drop*.18*spread,top:.61-drop*.12}));
  return {lower,torso,feet,legs,arms,...hands,blade:[.74,.065,-catchSide*.12],pads,bodyBottom:.50-drop*.27,bodyTop:1.48-drop*.40};
 }
 return {cycle,body,advance,action,delivery,upper,keeper,names:Object.freeze(Object.keys(clips))};
})();
if(typeof module!=='undefined')module.exports=HockeyMotion;
