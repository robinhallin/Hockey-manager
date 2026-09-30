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
 return {cycle,body,advance,action,names:Object.freeze(Object.keys(clips))};
})();
if(typeof module!=='undefined')module.exports=HockeyMotion;
