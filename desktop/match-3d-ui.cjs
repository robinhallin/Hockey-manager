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
 const pixels=await page.evaluate(()=>{
  const canvas=document.getElementById('career-ice-3d');Match3D.draw(canvas,studioFrame(studioEngine()),null,1,{teams:[managerClub(),state.live.opponent].map(c=>careerIdentity(c)),camera:studioCamera3D});
  const gl=canvas.getContext('webgl'),p=new Uint8Array(canvas.width*canvas.height*4);gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,p);let bright=0;for(let i=0;i<p.length;i+=4)if(p[i]>130&&p[i+1]>130&&p[i+2]>130)bright++;return bright/(canvas.width*canvas.height);
 });
 assert.ok(pixels>.15&&pixels<.9,'3D draws a lit rink rather than an empty canvas: '+pixels);
 await page.screenshot({path:path.join(out,'31-match-3d-tv.png'),fullPage:true});
 await page.getByLabel('3D-kamera').selectOption('overhead');
 await page.waitForFunction(()=>studioCamera3D==='overhead');
 await page.screenshot({path:path.join(out,'32-match-3d-overblick.png'),fullPage:true});
 await require('./playback-ui.cjs')(page,out);
 // A real live sequence updates the same engine, then pauses via ordinary control.
 await page.locator('#match-play').click();await page.waitForFunction(()=>state.live.running);
 const started=await page.evaluate(()=>studioEngine().time);
 await page.waitForFunction(t=>studioEngine().time>t+3,started);
 await page.locator('#match-play').click();await page.waitForFunction(()=>!state.live.running);
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
  return {shooter:!!shooter,travelled:f.actors.some(a=>a.travelled>0),release:shooter?Match3D.pose(f,shooter).release:null,keeperAngle:keeper?Match3D.pose(f,keeper).angle:null};
 });
 assert.ok(motion.shooter&&motion.travelled&&Number.isFinite(motion.keeperAngle));
 await page.screenshot({path:path.join(out,'33-match-3d-shot-follow.png'),fullPage:true});
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
  const canvas=document.getElementById('career-ice-3d'),f=studioFrame(studioEngine()),options={teams:[managerClub(),state.live.opponent].map(c=>careerIdentity(c)),camera:studioCamera3D,zoom:studioZoom3D,puckMarker:studioPuckMarker3D};
  Match3D.draw(canvas,f,null,1,options);const before=Match3D.diagnostics();Match3D.draw(canvas,f,null,1,options);const after=Match3D.diagnostics();
  Match3D.draw(canvas,{...f,time:f.time+5},null,1,{...options,suspended:true});const suspended=Match3D.diagnostics();
  return {before,after,suspended};
 });
 assert.equal(graphics.after.geometryBuilds,graphics.before.geometryBuilds,'paused mesh is reused');assert.equal(graphics.after.error,0);assert.ok(graphics.after.vertices<50000);
 assert.equal(graphics.suspended.frames,graphics.after.frames,'hidden fast-forward does not draw');assert.equal(graphics.suspended.geometryBuilds,graphics.after.geometryBuilds);
 require('node:fs').writeFileSync(path.join(out,'3d-graphics-result.json'),JSON.stringify({compact,focused,graphics},null,2));
 await page.getByRole('button',{name:'Zooma in',exact:true}).click();await page.getByRole('button',{name:'Zooma in',exact:true}).click();
 assert.equal(await page.locator('#match-3d-zoom').innerText(),'120%');
 await page.locator('#match-3d-puck').waitFor({state:'visible'});
 await page.waitForFunction(()=>{
  const c=document.getElementById('career-ice-3d'),r=c.getBoundingClientRect(),puck=studioFrame(studioEngine()).puck,p=Match3D.project([puck.x,.1,puck.y],Match3D.camera(r.width/r.height,studioCamera3D,puck,studioZoom3D)),m=document.getElementById('match-3d-puck').getBoundingClientRect();
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
  const oldReplay=studioEngine().latestReplay;startMatch();
  for(let i=0;i<100&&studioEngine().latestReplay===oldReplay;i++)studioStep();
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
 assert.equal(await page.evaluate(()=>JSON.stringify([studioEngine().rng,studioEngine().score,studioEngine().time,state.live.analysis])),replayBefore,'3D replay does not re-simulate or alter reports');
 await page.getByRole('button',{name:'Tillbaka till matchen',exact:true}).click();
 await page.waitForFunction(()=>!studioReplayState&&document.getElementById('career-ice-3d')?.dataset.ready==='true');
 await page.getByLabel('Tempo på isen',{exact:true}).selectOption('1');
 await page.getByLabel('3D-kamera').selectOption('tv');
 // GPU loss must leave the ongoing career usable with the actual 2D fallback.
 await page.evaluate(()=>document.getElementById('career-ice-3d').getContext('webgl').getExtension('WEBGL_lose_context').loseContext());
 await page.waitForFunction(()=>!document.getElementById('match-3d-error').hidden&&document.getElementById('career-ice').style.visibility==='visible');
 assert.equal(await page.locator('#match-3d-puck').isVisible(),false,'3D marker is hidden in 2D fallback');
 await page.getByLabel('Matchvy',{exact:true}).selectOption('2d');
 await page.getByLabel('Matchvy',{exact:true}).selectOption('3d');
 await page.waitForFunction(()=>document.getElementById('career-ice-3d')?.dataset.ready==='true');
 await page.getByLabel('Matchvy',{exact:true}).selectOption('2d');
 assert.equal(await page.evaluate(()=>Match3D.diagnostics()),null,'GPU resources disposed on returning to 2D');
};
