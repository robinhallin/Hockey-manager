'use strict';
// Record an uninterrupted ordinary 1x match for visual review, separately
// from frame-time measurements so encoding does not taint the benchmark.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
module.exports=async function recordMatchFlow(page,out,application){
 const bounds=await application.evaluate(({BrowserWindow})=>{const w=BrowserWindow.getAllWindows()[0],size=w.getContentSize();w.unmaximize();w.setContentSize(1280,960);return size;});
 await page.waitForFunction(()=>innerWidth===1280&&innerHeight===960);
 const settings=await page.evaluate(()=>{
  pauseMatch();const saved={camera:studioCamera3D,expanded:studioExpanded3D,zoom:studioZoom3D,mode:state.live.rink.mode,rate:state.live.onIceSpeed,speed:state.live.speed,quality:studioGraphicsQuality()};
  studioCamera3D='follow';studioExpanded3D=true;studioSetZoom(1.5);state.live.rink.mode='full';state.live.onIceSpeed=1;state.live.speed=1;matchPreferences().graphics3d='low';render();return saved;
 });
 await page.evaluate(()=>startMatch());
 await page.waitForFunction(()=>state.live.running&&document.getElementById('career-ice-3d')?.dataset.ready==='true');
 const started=await page.evaluate(()=>{
  const canvas=document.getElementById('career-ice-3d'),stream=canvas.captureStream(30),chunks=[],type='video/webm;codecs=vp8';
  const recorder=new MediaRecorder(stream,{...(MediaRecorder.isTypeSupported(type)?{mimeType:type}:{}),videoBitsPerSecond:5000000});
  const completed=new Promise(resolve=>{recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};recorder.onstop=async()=>resolve(Array.from(new Uint8Array(await new Blob(chunks).arrayBuffer())));});
  globalThis.matchFlowRecording={stream,recorder,completed};recorder.start();return {time:studioEngine().time,wall:studioEngine().wall};
 });
 for(let i=0;i<6;i++)await page.waitForTimeout(10000);
 const result=await page.evaluate(async()=>{
  const c=globalThis.matchFlowRecording;c.recorder.stop();const bytes=await c.completed;c.stream.getTracks().forEach(t=>t.stop());delete globalThis.matchFlowRecording;
  const end={time:studioEngine().time,wall:studioEngine().wall,pace:state.live.onIceSpeed,mode:state.live.rink.mode};pauseMatch();return {bytes,end};
 });
 fs.writeFileSync(path.join(out,'48-match-3d-live-minute.webm'),Buffer.from(result.bytes));
 fs.writeFileSync(path.join(out,'48-match-3d-live-minute.json'),JSON.stringify({started,end:result.end,quality:'low',zoom:1.5,viewport:[1280,960]},null,2));
 assert.ok(result.bytes.length>100000&&result.end.wall-started.wall>50,'recording contains a minute of ordinary match flow');assert.equal(result.end.pace,1);assert.equal(result.end.mode,'full');
 await page.evaluate(s=>{studioCamera3D=s.camera;studioExpanded3D=s.expanded;studioSetZoom(s.zoom);state.live.rink.mode=s.mode;state.live.onIceSpeed=s.rate;state.live.speed=s.speed;matchPreferences().graphics3d=s.quality;render();},settings);
 await application.evaluate(({BrowserWindow},size)=>BrowserWindow.getAllWindows()[0].setContentSize(...size),bounds);
 await page.waitForFunction(size=>innerWidth===size[0]&&innerHeight===size[1],bounds);
};
