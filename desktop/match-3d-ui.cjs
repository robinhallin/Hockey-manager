'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
module.exports=async function check3D(page,out){
 const bounds=await page.locator('#career-ice').boundingBox();
 assert.ok(bounds.height>200&&bounds.width>500,'view controls leave room for the rink');
 const before=await page.evaluate(()=>JSON.stringify(state.live));
 await page.getByLabel('Matchvy',{exact:true}).selectOption('3d');
 await page.waitForFunction(()=>document.getElementById('career-ice-3d')?.dataset.ready==='true');
 assert.deepEqual(await page.evaluate(()=>{const d=Match3D.diagnostics();return {actors:d.actors,error:d.error};}),{actors:await page.evaluate(()=>studioFrame(studioEngine()).actors.length),error:0});
 assert.equal(await page.evaluate(()=>JSON.stringify(state.live)),before,'3D selection does not change a paused match');
 const rig=await page.evaluate(()=>({model:{joints:HockeyPlayerModel.model().joints,vertices:HockeyPlayerModel.model().vertices},graphics:Match3D.diagnostics()}));
 assert.equal(rig.model.joints.length,15);assert.equal(rig.graphics.renderer,'three');assert.equal(rig.graphics.gpuSkinning,true);assert.ok(rig.graphics.skinVertices>25000);assert.equal(rig.graphics.modelActors,rig.graphics.actors);assert.equal(rig.graphics.error,0);
 assert.ok(rig.graphics.textureBuilds>0&&rig.graphics.glassVertices>0,'the arena loads its ice/club textures and glass');
 assert.ok(rig.graphics.shadowCasterVertices>0&&rig.graphics.shadowCasterVertices<rig.graphics.arenaVertices*.35,'seating and ice stay out of the moving shadow pass');
 if(rig.graphics.shadowSupported){assert.equal(rig.graphics.shadowMode,'projected');assert.ok(rig.graphics.shadowSize>=512&&rig.graphics.shadowBuilds>0,'supported GPUs render actual player shadows');}
 require('node:fs').writeFileSync(path.join(out,'3d-rig-result.json'),JSON.stringify(rig,null,2));
 const pixels=await page.evaluate(()=>{
  const canvas=document.getElementById('career-ice-3d');Match3D.draw(canvas,studioFrame(studioEngine()),null,1,{teams:[managerClub(),state.live.opponent].map(name=>({name,...careerIdentity(name)})),camera:studioCamera3D});
  const gl=canvas.getContext('webgl2')||canvas.getContext('webgl'),p=new Uint8Array(canvas.width*canvas.height*4);gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,p);let bright=0;for(let i=0;i<p.length;i+=4)if(p[i]>130&&p[i+1]>130&&p[i+2]>130)bright++;return bright/(canvas.width*canvas.height);
 });
 assert.ok(pixels>.15&&pixels<.9,'3D draws a lit rink rather than an empty canvas: '+pixels);
 await page.screenshot({path:path.join(out,'31-match-3d-tv.png'),fullPage:true});
 await page.getByLabel('3D-kamera').selectOption('overhead');
 await page.waitForFunction(()=>studioCamera3D==='overhead');
 await page.screenshot({path:path.join(out,'32-match-3d-overblick.png'),fullPage:true});
 await require('./playback-ui.cjs')(page,out);
 const soundBefore=await page.evaluate(()=>JSON.stringify(state.live));
 await page.getByRole('button',{name:'Stäng av matchljud',exact:true}).click();
 await page.waitForFunction(()=>!MatchAudio.diagnostics().active);
 await page.getByRole('button',{name:'Slå på matchljud',exact:true}).click();
 await page.waitForFunction(()=>MatchAudio.diagnostics().ready);
 assert.equal(await page.evaluate(()=>JSON.stringify(state.live)),soundBefore,'sound controls do not alter a paused match');
 await page.getByLabel('Matchvisning',{exact:true}).selectOption('full');
 // A real live sequence updates the same engine, then pauses via ordinary control.
 await page.locator('#match-play').click();await page.waitForFunction(()=>state.live.running);
 const started=await page.evaluate(()=>{
  const stream=document.getElementById('career-ice-3d').captureStream(30),chunks=[],type='video/webm;codecs=vp8';
  const recorder=new MediaRecorder(stream,{...(MediaRecorder.isTypeSupported(type)?{mimeType:type}:{}),videoBitsPerSecond:1800000});
  const completed=new Promise(resolve=>{recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};recorder.onstop=async()=>resolve(Array.from(new Uint8Array(await new Blob(chunks).arrayBuffer())));});
  globalThis.liveFlowCapture={stream,recorder,completed};recorder.start();return studioEngine().time;
 });
 await page.waitForFunction(t=>studioEngine().time>t+3,started);
 await page.waitForFunction(()=>MatchAudio.diagnostics().active&&MatchAudio.diagnostics().level>.00001);
 const audible=await page.evaluate(()=>MatchAudio.diagnostics());
 const timings=await page.evaluate(()=>Match3D.diagnostics());assert.ok(timings.frameSamples>0&&timings.frameP95>0);
 assert.ok(timings.motionFrames>15,'live flow has enough rendered frames to inspect');
 assert.ok(timings.motionAdvances/timings.motionFrames>.8,'live interpolation advances on screen frames instead of repeating timer samples: '+JSON.stringify(timings));
 require('node:fs').writeFileSync(path.join(out,'3d-frame-times.json'),JSON.stringify(timings,null,2));
 const liveClip=await page.evaluate(async()=>{const c=globalThis.liveFlowCapture;c.recorder.stop();const bytes=await c.completed;c.stream.getTracks().forEach(t=>t.stop());delete globalThis.liveFlowCapture;return bytes;});
 assert.ok(liveClip.length>1000);require('node:fs').writeFileSync(path.join(out,'46-match-3d-live-flow.webm'),Buffer.from(liveClip));
 await page.locator('#match-play').click();await page.waitForFunction(()=>!state.live.running);
 await page.waitForFunction(()=>!MatchAudio.diagnostics().active&&MatchAudio.diagnostics().voices===0&&MatchAudio.diagnostics().level<.00002);
 // Reach an actual shot in this career, using the real match loop and decisions.
 const shot=await page.evaluate(()=>{
  startMatch();let found=false;
  for(let i=0;i<3500&&!state.live.finished;i++){
   if(!state.live.running){while(medicalPending())medicalDecisionAccept();startMatch();}
   studioStep();const f=studioEngine().flight;
   if(f?.kind==='shot'&&f.elapsed>0&&f.elapsed/f.duration>=.5){found=true;break;}
  }
  pauseMatch();render();return found;
 });
 assert.ok(shot,'production match reaches a travelling shot');
 await page.getByLabel('3D-kamera').selectOption('follow');
 await page.waitForFunction(()=>studioCamera3D==='follow'&&document.getElementById('career-ice-3d')?.dataset.ready==='true');
 const motion=await page.evaluate(()=>{
  const f=studioFrame(studioEngine()),shooter=f.actors.find(a=>a.id===f.flight.from),keeper=f.actors.find(a=>a.role==='G'&&a.side!==f.flight.side);
  const pose=shooter?Match3D.pose(f,shooter):null;
  return {shooter:!!shooter,travelled:f.actors.some(a=>a.travelled>0),release:pose?.release,keeperAngle:keeper?Match3D.pose(f,keeper).angle:null,height:f.puck.z,
   action:shooter?.action?.kind,style:shooter?.action?.style,states:f.actors.filter(a=>a.role!=='G').map(a=>Match3D.pose(f,a).state),
   shaft:pose?Math.hypot(...pose.shaftTop.map((n,i)=>n-pose.heel[i])):null};
 });
 assert.ok(motion.shooter&&motion.travelled&&Number.isFinite(motion.keeperAngle));
 assert.ok(motion.height>0,'the actual travelling shot has simulated height');
 assert.equal(motion.action,'shot');assert.ok(['wrist','slap','one-timer'].includes(motion.style));assert.ok(Math.abs(motion.shaft-1.38)<1e-6);
 require('node:fs').writeFileSync(path.join(out,'3d-motion-result.json'),JSON.stringify(motion,null,2));
 await page.screenshot({path:path.join(out,'33-match-3d-shot-follow.png'),fullPage:true});
 await page.getByLabel('3D-kamera').selectOption('auto');
 await page.waitForFunction(()=>studioCamera3D==='auto');
 await page.screenshot({path:path.join(out,'41-match-3d-automatic.png'),fullPage:true});
 const cameraBefore=await page.evaluate(()=>JSON.stringify(state.live));
 await page.getByLabel('3D-kamera').selectOption('rinkside');
 await page.waitForFunction(()=>studioCamera3D==='rinkside'&&Match3D.diagnostics().reflectionBuilds>0);
 await page.screenshot({path:path.join(out,'47-match-3d-rinkside.png'),fullPage:true});
 assert.equal(await page.evaluate(()=>JSON.stringify(state.live)),cameraBefore,'rinkside camera preserves the paused match');
 await page.getByLabel('3D-kamera').selectOption('follow');

 // Expand the rink through the ordinary control; preserve the exact paused game.
 const compact=await page.locator('#career-ice-3d').boundingBox();
 const focusBefore=await page.evaluate(()=>JSON.stringify(state.live));
 await page.getByRole('button',{name:'Stor rink',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('.md-rink-focus')&&document.getElementById('career-ice-3d')?.dataset.ready==='true');
 const focused=await page.locator('#career-ice-3d').boundingBox();
 assert.ok(focused.width>compact.width*1.4&&focused.height>compact.height*1.3,'expanded rink gains width and height');
 assert.equal(await page.locator('.mc-coach').isVisible(),false);
 for(const selector of ['#match-play','.mc-situation','.match-3d-expand']){
  const b=await page.locator(selector).boundingBox();assert.ok(b&&b.x>=0&&b.y>=0&&b.y+b.height<=768,'essential control stays visible: '+selector);
 }
 assert.equal(await page.evaluate(()=>JSON.stringify(state.live)),focusBefore,'large view preserves live state');
 const graphics=await page.evaluate(()=>{
  const canvas=document.getElementById('career-ice-3d'),f=studioFrame(studioEngine()),options={teams:[managerClub(),state.live.opponent].map(name=>({name,...careerIdentity(name)})),camera:studioCamera3D,zoom:studioZoom3D,puckMarker:studioPuckMarker3D};
  Match3D.draw(canvas,f,null,1,options);const before=Match3D.diagnostics();Match3D.draw(canvas,f,null,1,options);const after=Match3D.diagnostics();
  Match3D.draw(canvas,{...f,time:f.time+5},null,1,{...options,suspended:true});const suspended=Match3D.diagnostics();
  // The match clock can stop at a whistle while observed follow-through advances.
  Match3D.draw(canvas,{...f,wall:f.wall+.1},null,1,options);const recovery=Match3D.diagnostics();
  Match3D.draw(canvas,f,null,1,options);
  return {before,after,suspended,recovery};
 });
 assert.equal(graphics.after.geometryBuilds,graphics.before.geometryBuilds,'paused mesh is reused');assert.equal(graphics.after.error,0);assert.ok(graphics.after.vertices<75000,'GPU player geometry remains bounded');
 assert.equal(graphics.after.shadowBuilds,graphics.before.shadowBuilds,'paused shadows reuse the same depth map');assert.equal(graphics.after.textureBuilds,graphics.before.textureBuilds,'ice wear and club artwork are not regenerated per frame');
 assert.ok(graphics.after.crowdInstances>700&&graphics.after.crowdInstances<1400,'the full crowd uses bounded instances');assert.ok(graphics.after.drawCalls<45,'crowd and arena stay batched');assert.equal(graphics.after.reflectionBuilds,graphics.before.reflectionBuilds,'paused reflections are reused');
 assert.equal(graphics.suspended.frames,graphics.after.frames,'hidden fast-forward does not draw');assert.equal(graphics.suspended.geometryBuilds,graphics.after.geometryBuilds);
 assert.equal(graphics.recovery.geometryBuilds,graphics.after.geometryBuilds+1,'stopped match clock does not freeze recorded follow-through');
 require('node:fs').writeFileSync(path.join(out,'3d-graphics-result.json'),JSON.stringify({compact,focused,graphics},null,2));
 await page.getByRole('button',{name:'Zooma in',exact:true}).click();await page.getByRole('button',{name:'Zooma in',exact:true}).click();
 assert.equal(await page.locator('#match-3d-zoom').innerText(),'120%');
 await page.locator('#match-3d-puck').waitFor({state:'visible'});
 await page.waitForFunction(()=>{
  const c=document.getElementById('career-ice-3d'),r=c.getBoundingClientRect(),puck=studioFrame(studioEngine()).puck,p=Match3D.project([puck.x,.1+(puck.z||0),puck.y],Match3D.camera(r.width/r.height,studioCamera3D,puck,studioZoom3D)),m=document.getElementById('match-3d-puck').getBoundingClientRect();
  return Math.hypot(m.x+m.width/2-r.x-p.x*r.width,m.y+m.height/2-r.y-p.y*r.height)<3;
 });
 await page.getByRole('button',{name:'Markera puck',exact:true}).click();await page.locator('#match-3d-puck').waitFor({state:'hidden'});
 await page.getByRole('button',{name:'Markera puck',exact:true}).click();await page.locator('#match-3d-puck').waitFor({state:'visible'});
 assert.equal(await page.evaluate(()=>JSON.stringify(state.live)),focusBefore,'zoom and marker preserve live state');
 await page.screenshot({path:path.join(out,'35-match-3d-large-rink.png'),fullPage:true});
 await page.getByRole('button',{name:'Återställ zoom',exact:true}).click();assert.equal(await page.locator('#match-3d-zoom').innerText(),'100%');
 await page.getByRole('button',{name:'Visa coachbänken',exact:true}).click();
 await page.locator('.mc-coach').waitFor({state:'visible'});
 await page.getByRole('button',{name:'Stor rink',exact:true}).click();
 await page.waitForFunction(()=>document.getElementById('career-ice-3d')?.dataset.ready==='true');
 // Picking a real player restores the coach panel so the requested task is visible.
 const selected=await page.evaluate(()=>{
  const c=document.getElementById('career-ice-3d'),r=c.getBoundingClientRect(),f=studioFrame(studioEngine()),mat=Match3D.camera(r.width/r.height,studioCamera3D,f.puck);
  return f.actors.filter(a=>a.role==='G').map(a=>{const p=Match3D.project([a.x,1,a.y],mat);return {name:a.name,x:r.x+p.x*r.width,y:r.y+p.y*r.height,inside:p.x>.05&&p.x<.95&&p.y>.1&&p.y<.9};}).find(a=>a.inside);
 });
 assert.ok(selected,'a visible goalkeeper can be inspected');await page.mouse.click(selected.x,selected.y);
 await page.waitForFunction(name=>!studioExpanded3D&&matchDesk.notice.includes(name),selected.name);
 assert.ok(await page.locator('.mc-coach').isVisible());assert.equal(await page.evaluate(()=>state.live.running),false);
 // Complete this very shot to obtain the actual replay buffer.
 await page.evaluate(()=>{
  const oldShot=studioEngine().latestReplay?.shot;startMatch();
  for(let i=0;i<100&&studioEngine().latestReplay?.shot===oldShot;i++)studioStep();
  // Record actual recovery time too; a paused engine supplies no future frames.
  for(let i=0;i<6&&!state.live.finished;i++){if(!state.live.running){while(medicalPending())medicalDecisionAccept();startMatch();}studioStep();}
  pauseMatch();render();
 });
 assert.ok(await page.evaluate(()=>Boolean(studioEngine().latestReplay)));
 const replayBefore=await page.evaluate(()=>JSON.stringify([studioEngine().rng,studioEngine().score,studioEngine().time,state.live.analysis]));
 await page.getByRole('button',{name:'↺ Senaste avslutet',exact:true}).click();
 await page.waitForFunction(()=>Boolean(studioReplayState)&&document.getElementById('career-ice-3d')?.dataset.ready==='true');
 const replayElapsed=await page.evaluate(()=>studioReplayState.elapsed);
 await page.getByLabel('Repristempo',{exact:true}).selectOption('0.5');
 assert.ok(await page.evaluate(()=>Boolean(studioReplayState)),'pace change stays in replay');
 assert.ok(await page.evaluate(()=>studioReplayState.elapsed)>=replayElapsed,'replay does not rewind when changing pace');
 await page.screenshot({path:path.join(out,'34-match-3d-replay.png'),fullPage:true});
 await page.getByRole('button',{name:'Till skottet',exact:true}).click();
 await page.waitForFunction(()=>studioReplayState.paused&&Match3D.diagnostics().analysisVertices>0);
 const tactical=await page.evaluate(()=>{
  const r=studioReplayState,s=studioReplayFrame(performance.now()),f=Match3D.sample(s.frame,s.previous,s.blend),analysis=Match3D.replayAnalysis(r.frames,f);
  return {elapsed:r.elapsed,analysis,diagnostics:Match3D.diagnostics()};
 });
 assert.ok(tactical.analysis.notes.length>0&&tactical.diagnostics.error===0);
 const pausedAt=tactical.elapsed;
 await page.getByRole('button',{name:'Taktiska linjer',exact:true}).click();
 await page.waitForFunction(()=>Match3D.diagnostics().analysisVertices===0);
 assert.equal(await page.evaluate(()=>studioReplayState.elapsed),pausedAt,'pausing freezes replay while switching tactical overlays');
 await page.getByRole('button',{name:'Taktiska linjer',exact:true}).click();
 await page.waitForFunction(()=>Match3D.diagnostics().analysisVertices>0);
 await page.screenshot({path:path.join(out,'39-match-3d-tactical-replay.png'),fullPage:true});
 require('node:fs').writeFileSync(path.join(out,'3d-tactical-result.json'),JSON.stringify(tactical,null,2));
 await page.getByRole('button',{name:'Spela repris',exact:true}).click();
 // The clip comes from the real WebGL canvas and real recorded match frames.
 // It makes the stride/receive/release timing reviewable alongside still images.
 const clip=await page.evaluate(async()=>{
  const canvas=document.getElementById('career-ice-3d'),r=studioReplayState;
  r.elapsed=Math.max(0,studioReplayDuration(r)-2.1);r.lastNow=null;
  const stream=canvas.captureStream(24),chunks=[],type='video/webm;codecs=vp8';
  const recorder=new MediaRecorder(stream,{...(MediaRecorder.isTypeSupported(type)?{mimeType:type}:{}),videoBitsPerSecond:1800000});
  const completed=new Promise(resolve=>{recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};recorder.onstop=async()=>resolve(Array.from(new Uint8Array(await new Blob(chunks).arrayBuffer())));});
  recorder.start();await new Promise(resolve=>setTimeout(resolve,4800));recorder.stop();const bytes=await completed;stream.getTracks().forEach(t=>t.stop());return bytes;
 });
 assert.ok(clip.length>1000,'recorded 3D motion clip is nonempty');require('node:fs').writeFileSync(path.join(out,'37-match-3d-motion.webm'),Buffer.from(clip));
 assert.equal(await page.evaluate(()=>JSON.stringify([studioEngine().rng,studioEngine().score,studioEngine().time,state.live.analysis])),replayBefore,'3D replay does not re-simulate or alter reports');
 await page.getByRole('button',{name:'Tillbaka till matchen',exact:true}).click();
 await page.waitForFunction(()=>!studioReplayState&&document.getElementById('career-ice-3d')?.dataset.ready==='true');
 assert.equal(await page.getByLabel('Tempo på isen',{exact:true}).inputValue(),'1','slow replay does not change live pace');
 // A real save drives the goalkeeper and crowd; do not manufacture a display pose.
 const save=await page.evaluate(()=>{
  startMatch();let keeper=null;
  for(let i=0;i<4500&&!state.live.finished;i++){
   if(!state.live.running){while(medicalPending())medicalDecisionAccept();startMatch();}studioStep();
   const e=studioEngine();keeper=e.actors.find(a=>a.role==='G'&&a.keeperAction?.kind==='save'&&a.keeperAction.at>e.wall-StudioHockey.STEP-1e-7&&a.keeperAction.at<=e.wall+1e-7);
   if(keeper)break;
  }
  if(!keeper)return null;
  const id=keeper.id;for(let i=0;i<3;i++){if(!state.live.running)startMatch();studioStep();}
  pauseMatch();studioExpanded3D=true;studioCamera3D='follow';render();
  const f=studioFrame(studioEngine()),a=f.actors.find(a=>a.id===id),p=Match3D.pose(f,a);
  return {number:a.number,action:a.keeperAction,body:a.keeperBody,pose:{style:p.style,state:p.state,drop:p.drop,recovery:p.recovery},height:f.puck.z||0,crowd:Match3D.crowdReaction(f,a.side)};
 });
 assert.ok(save?.action?.kind==='save');assert.equal(save.pose.state,save.body.mode);assert.equal(save.pose.drop,save.body.drop);assert.ok(save.crowd>0&&save.number>0);
 await page.waitForFunction(()=>document.getElementById('career-ice-3d')?.dataset.ready==='true');
 await page.screenshot({path:path.join(out,'38-match-3d-goalie-save.png'),fullPage:true});
 require('node:fs').writeFileSync(path.join(out,'3d-arena-result.json'),JSON.stringify({audible,paused:await page.evaluate(()=>MatchAudio.diagnostics()),save},null,2));
 const battle=await page.evaluate(()=>{
  startMatch();let found=null;
  for(let i=0;i<3000&&!state.live.finished;i++){
   if(!state.live.running){while(medicalPending())medicalDecisionAccept();startMatch();}studioStep();
   const e=studioEngine();if(e.battle?.type&&e.presentationFrame().actors.some(a=>a.contactAction&&e.wall-a.contactAction.at<.3)){
    const f=e.presentationFrame();found={type:e.battle.type,actors:f.actors.filter(a=>a.contactAction).map(a=>({id:a.id,contact:a.contactAction,pose:Match3D.pose(f,a).state}))};break;
   }
  }
  pauseMatch();render();return found;
 });
 assert.ok(battle&&['check','pin','poke'].includes(battle.type));assert.ok(battle.actors.some(a=>a.pose===battle.type||a.contact.kind===battle.type&&['stumbling','balance-recovery'].includes(a.pose)));
 await page.waitForFunction(()=>document.getElementById('career-ice-3d')?.dataset.ready==='true');
 await page.screenshot({path:path.join(out,'40-match-3d-contact.png'),fullPage:true});
 require('node:fs').writeFileSync(path.join(out,'3d-contact-result.json'),JSON.stringify(battle,null,2));
 const balance=await page.evaluate(()=>{
  startMatch();let found=null;
  for(let i=0;i<3000&&!state.live.finished;i++){
   if(!state.live.running){while(medicalPending())medicalDecisionAccept();startMatch();}studioStep();
   const e=studioEngine(),f=e.presentationFrame(),a=f.actors.find(a=>a.balanceState&&e.wall-a.balanceState.at>.08&&Match3D.pose(f,a).unsteady>.12);
   if(a){const pose=Match3D.pose(f,a);found={actor:a.id,balance:a.balanceState,state:pose.state,unsteady:pose.unsteady};break;}
  }
  pauseMatch();render();return found;
 });
 assert.ok(balance&&balance.state==='stumbling','actual contact drives a visible balance recovery');
 await page.waitForFunction(()=>document.getElementById('career-ice-3d')?.dataset.ready==='true');
 await page.screenshot({path:path.join(out,'43-match-3d-balance.png'),fullPage:true});
 require('node:fs').writeFileSync(path.join(out,'3d-balance-result.json'),JSON.stringify(balance,null,2));
 const support=await page.evaluate(()=>{
  startMatch();let found=null;
  for(let i=0;i<3000&&!state.live.finished;i++){
   if(!state.live.running){while(medicalPending())medicalDecisionAccept();startMatch();}studioStep();
   const e=studioEngine();if(e.battle?.support?.length){const f=e.presentationFrame();found={type:e.battle.type,participants:[e.battle.a,e.battle.b],support:e.battle.support,poses:e.battle.support.map(r=>({id:r.id,state:Match3D.pose(f,f.actors.find(a=>a.id===r.id)).state}))};break;}
  }
  pauseMatch();render();return found;
 });
 assert.ok(support?.support.length>0&&support.support.length<=2);assert.ok(support.poses.every(p=>['support','stumbling','balance-recovery'].includes(p.state)));
 await page.waitForFunction(()=>document.getElementById('career-ice-3d')?.dataset.ready==='true');
 await page.screenshot({path:path.join(out,'44-match-3d-support.png'),fullPage:true});
 require('node:fs').writeFileSync(path.join(out,'3d-support-result.json'),JSON.stringify(support,null,2));
 await page.getByRole('button',{name:'Visa coachbänken',exact:true}).click();
 await page.locator('#match-tab-settings').click();
 const qualityBefore=await page.evaluate(()=>JSON.stringify(state.live)),qualities={};
 for(const quality of ['low','normal','high']){
  await page.getByLabel('3D-grafik',{exact:true}).selectOption(quality);
  await page.waitForFunction(q=>Match3D.diagnostics()?.quality===q&&document.getElementById('career-ice-3d')?.dataset.ready==='true',quality);
  qualities[quality]=await page.evaluate(()=>Match3D.diagnostics());assert.equal(qualities[quality].error,0);assert.equal(qualities[quality].modelActors,qualities[quality].actors);
  assert.equal(await page.evaluate(()=>JSON.stringify(state.live)),qualityBefore,'graphics quality cannot change the live simulation');
  await page.screenshot({path:path.join(out,'45-match-3d-quality-'+quality+'.png'),fullPage:true});
 }
 assert.ok(qualities.low.width<qualities.normal.width);assert.ok(qualities.low.crowdVertices<qualities.normal.crowdVertices);assert.equal(qualities.high.actors,qualities.low.actors);
 assert.equal(qualities.low.shadowSize,0);assert.equal(qualities.low.shadowMode,'contact');
 if(qualities.normal.shadowSupported){assert.ok(qualities.normal.shadowSize>0);assert.ok(qualities.high.shadowSize>qualities.normal.shadowSize);}
 require('node:fs').writeFileSync(path.join(out,'3d-quality-result.json'),JSON.stringify(qualities,null,2));
 await page.getByLabel('3D-grafik',{exact:true}).selectOption('normal');
 await page.locator('#match-tab-analysis').click();
 await page.locator('.mc-recorded-clips summary').click();
 const observationBefore=await page.evaluate(()=>JSON.stringify(state.live));
 await page.locator('.mc-recorded-clips button').first().click();
 await page.getByRole('button',{name:'Till observationen',exact:true}).click();
 await page.waitForFunction(()=>studioReplayState?.clip&&studioReplayState.paused&&Match3D.diagnostics()?.analysisVertices>0);
 const observation=await page.evaluate(()=>({id:studioReplayState.clip.id,kind:studioReplayState.clip.kind,frames:studioReplayState.frames.length,duration:studioReplayDuration(),stateBytes:JSON.stringify(studioEngine().tacticalClips).length,graphics:Match3D.diagnostics()}));
 assert.ok(observation.frames<=30&&observation.duration<=5.5);assert.equal(observation.graphics.error,0);
 assert.equal(await page.evaluate(()=>JSON.stringify(state.live)),observationBefore,'observational replay preserves the entire paused career');
 await page.screenshot({path:path.join(out,'42-match-3d-coach-clip.png'),fullPage:true});
 require('node:fs').writeFileSync(path.join(out,'3d-observation-result.json'),JSON.stringify(observation,null,2));
 await page.getByRole('button',{name:'Tillbaka till matchen',exact:true}).click();
 await page.waitForFunction(()=>!studioReplayState&&document.getElementById('career-ice-3d')?.dataset.ready==='true');
 await page.getByLabel('3D-kamera').selectOption('tv');
 // GPU loss must leave the ongoing career usable with the actual 2D fallback.
 await page.evaluate(()=>document.getElementById('career-ice-3d').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());
 await page.waitForFunction(()=>!document.getElementById('match-3d-error').hidden&&document.getElementById('career-ice').style.visibility==='visible');
 assert.equal(await page.locator('#match-3d-puck').isVisible(),false,'3D marker is hidden in 2D fallback');
 await page.getByLabel('Matchvy',{exact:true}).selectOption('2d');
 await page.getByLabel('Matchvy',{exact:true}).selectOption('3d');
 await page.waitForFunction(()=>document.getElementById('career-ice-3d')?.dataset.ready==='true');
 await page.getByLabel('Matchvy',{exact:true}).selectOption('2d');
 assert.equal(await page.evaluate(()=>Match3D.diagnostics()),null,'GPU resources disposed on returning to 2D');
};
