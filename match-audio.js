'use strict';
// Original synthesized rink sounds. The mixer reads observed snapshots only;
// it never calls the engine, owns a match timer or consumes match randomness.
const MatchAudio=(()=>{
 let ctx=null,master=null,analyser=null,noise=null,crowd=null,skates=null,source=null,cursor=null,active=false,played=0,lastKind=null,error=null;
 const voices=new Set(),clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 const gain=(param,value)=>{param.cancelScheduledValues(ctx.currentTime);param.setTargetAtTime(value,ctx.currentTime,.025);};
 function noiseSource(frequency,type='bandpass'){
  const input=ctx.createBufferSource(),filter=ctx.createBiquadFilter();input.buffer=noise;filter.type=type;filter.frequency.value=frequency;filter.Q.value=.5;input.connect(filter);return {input,filter};
 }
 function bed(frequency){const n=noiseSource(frequency),volume=ctx.createGain();volume.gain.value=0;n.filter.connect(volume);volume.connect(master);n.input.loop=true;n.input.start();return volume;}
 async function unlock(){
  try{
   if(!ctx){
    const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Audio)return false;
    ctx=new Audio();master=ctx.createGain();master.gain.value=0;
    analyser=ctx.createAnalyser?.();if(analyser){analyser.fftSize=256;master.connect(analyser);analyser.connect(ctx.destination);}else master.connect(ctx.destination);
    noise=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate);const samples=noise.getChannelData(0);let seed=19871;
    for(let i=0;i<samples.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;samples[i]=seed/2147483648-1;}
    crowd=bed(540);skates=bed(2400);
   }
   if(ctx.state==='suspended')await ctx.resume();return ctx.state==='running';
  }catch(e){error=e.message;return false;}
 }
 function silence(){
  active=false;cursor=null;
  if(ctx&&master)gain(master.gain,0);
  for(const v of voices){try{v.stop();}catch{} }voices.clear();
 }
 function burst(kind,strength=1,pan=0,delay=0){
  if(!ctx||ctx.state!=='running'||voices.size>=20)return;
  const profiles={stick:[1550,.09,.18],board:[210,.26,.38],ice:[2100,.055,.075],save:[430,.19,.20],block:[330,.15,.22],goal:[690,2.3,.23],miss:[620,.65,.06],whistle:[1900,.18,.035]};
  const p=profiles[kind];if(!p)return;
  const [frequency,duration,level]=p,start=ctx.currentTime+delay,amp=ctx.createGain();amp.gain.setValueAtTime(0,start);amp.gain.linearRampToValueAtTime(level*strength,start+(kind==='goal'?.18:.008));amp.gain.exponentialRampToValueAtTime(.0001,start+duration);
  let input,filter=null;
  if(kind==='whistle'){input=ctx.createOscillator();input.type='sine';input.frequency.setValueAtTime(frequency,start);input.frequency.linearRampToValueAtTime(frequency+180,start+.06);input.connect(amp);}
  else {const n=noiseSource(frequency,kind==='board'?'lowpass':'bandpass');({input,filter}=n);filter.connect(amp);}
  const stereo=ctx.createStereoPanner?.();if(stereo){stereo.pan.value=pan;amp.connect(stereo);stereo.connect(master);}else amp.connect(master);
  voices.add(input);input.onended=()=>{voices.delete(input);input.disconnect();filter?.disconnect();amp.disconnect();stereo?.disconnect();};input.start(start);input.stop(start+duration+.02);
 }
 function update(frame,options={}){
  const clock=frame.wall??frame.time,volume=Number.isFinite(options.volume)?clamp(options.volume,0,1):.35;
  const enabled=Boolean(options.active&&volume>0&&ctx?.state==='running');
  if(!enabled){silence();source=options.source;return;}
  const continuous=active&&source===options.source&&cursor!=null&&clock>=cursor&&clock-cursor<=.65;
  source=options.source;active=true;
  gain(master.gain,volume);
  const speed=frame.actors.filter(a=>a.role!=='G').reduce((s,a)=>s+Math.hypot(a.vx||0,a.vy||0),0)/Math.max(1,frame.actors.length);
  gain(crowd.gain,.022);gain(skates.gain,frame.phase==='stoppage'||frame.phase==='faceoff'?0:clamp(speed/5,0,1)*.035);
  if(continuous)for(const event of frame.effects||[]){
   if(event.at<=cursor+1e-7||event.at>clock+1e-7)continue;
   const home=event.side===(options.homeSide??0),reaction=['goal','save','block','miss'].includes(event.kind);
   burst(event.kind,(event.strength??1)*(reaction&&!home?.45:1),clamp((event.x-30)/60,-.5,.5));played++;lastKind=event.kind;
  }
  cursor=clock;
 }
 function diagnostics(){let level=0;if(analyser){const samples=new Float32Array(analyser.fftSize);analyser.getFloatTimeDomainData(samples);level=Math.sqrt(samples.reduce((s,n)=>s+n*n,0)/samples.length);}return {ready:ctx?.state==='running',active,played,lastKind,voices:voices.size,level,error};}
 return {unlock,update,silence,diagnostics};
})();
function studioAudioPreferences(){const p=state.matchAudio;return {volume:Number.isFinite(p?.volume)?Math.max(0,Math.min(1,p.volume)):.35,muted:Boolean(p?.muted)};}
function studioAudioVolume(value){const n=Number(value);if(!Number.isFinite(n))return;state.matchAudio={volume:Math.max(0,Math.min(1,n)),muted:n<=0};if(n>0)MatchAudio.unlock();else MatchAudio.silence();save();render();}
function studioToggleAudio(){const p=studioAudioPreferences();state.matchAudio={volume:p.volume||.35,muted:!p.muted&&p.volume>0};if(state.matchAudio.muted)MatchAudio.silence();else MatchAudio.unlock();save();render();}
function studioAudioControl(){const p=studioAudioPreferences(),on=!p.muted&&p.volume>0;return `<button type="button" id="match-audio-toggle" onclick="studioToggleAudio()" aria-label="${on?'Stäng av':'Slå på'} matchljud" aria-pressed="${on}">Ljud ${on?'på':'av'}</button>`;}
function studioAudioSettings(){const p=studioAudioPreferences(),value=p.muted?0:p.volume;return `<section class="mc-playback-settings"><h3>Ljud i arenan</h3><label>Matchljud <select aria-label="Matchljud" onchange="studioAudioVolume(this.value)">${[[0,'Av'],[.15,'Lågt'],[.35,'Normalt'],[.65,'Högt']].map(([v,label])=>`<option value="${v}" ${Math.abs(value-v)<.01?'selected':''}>${label}</option>`).join('')}</select></label><p>Skridskor, klubba, puck mot sarg och publik följer spelet som visas. Ljudet tystnar vid paus, snabbspolning och när du lämnar matchen.</p></section>`;}
if(typeof document!=='undefined'){
 const unlock=()=>{if(typeof studioActive==='function'&&studioActive()&&state.page==='match'){const p=studioAudioPreferences();if(!p.muted&&p.volume>0)MatchAudio.unlock();}};
 document.addEventListener('pointerdown',unlock,{passive:true});document.addEventListener('keydown',unlock,{passive:true});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)MatchAudio.silence();});
}
if(typeof module!=='undefined')module.exports=MatchAudio;
