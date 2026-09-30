'use strict';
// Native desktop measurement of the ordinary match clock. No frame-rate gate:
// CI hardware is recorded, not presented as the player's reference computer.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
module.exports=async function measureMatch(page,out,application){
 await require('./record-match-flow.cjs')(page,out,application);
 const bounds=await application.evaluate(({BrowserWindow})=>{const w=BrowserWindow.getAllWindows()[0],size=w.getContentSize();w.setContentSize(1920,1080);return size;});
 await page.waitForFunction(()=>innerWidth===1920&&innerHeight===1080);
 const settings=await page.evaluate(()=>{
  pauseMatch();const saved={camera:studioCamera3D,expanded:studioExpanded3D,mode:state.live.rink.mode,rate:state.live.onIceSpeed,speed:state.live.speed,quality:studioGraphicsQuality()};
  studioCamera3D='follow';studioExpanded3D=true;state.live.rink.mode='full';state.live.onIceSpeed=1;state.live.speed=1;matchPreferences().graphics3d='normal';render();return saved;
 });
 const results={platform:os.platform(),release:os.release(),cpu:os.cpus()[0]?.model,logicalCpus:os.cpus().length,memoryGiB:os.totalmem()/1024**3,measurements:[]};
 for(const [quality,seconds] of [['normal',60],['low',20]]){
  await page.evaluate(q=>{matchPreferences().graphics3d=q;render();startMatch();},quality);
  await page.waitForTimeout(10000);
  await page.evaluate(()=>{
   globalThis.performanceReview={running:true,intervals:[],started:performance.now(),time:studioEngine().time,wall:studioEngine().wall};let last;
   function frame(now){const r=performanceReview;if(!r.running)return;if(state.live.running&&!studioReplayState){if(last!=null)r.intervals.push(now-last);last=now;}else last=null;requestAnimationFrame(frame);}requestAnimationFrame(frame);
  });
  for(let i=0;i<seconds;i+=10)await page.waitForTimeout(Math.min(10,seconds-i)*1000);
  const result=await page.evaluate(()=>{
   const r=performanceReview;r.running=false;const rows=r.intervals.slice().sort((a,b)=>a-b),at=p=>rows[Math.floor((rows.length-1)*p)],canvas=document.getElementById('career-ice-3d'),gl=canvas.getContext('webgl2'),info=gl.getExtension('WEBGL_debug_renderer_info');
   return {elapsedMS:performance.now()-r.started,timeAdvance:studioEngine().time-r.time,wallAdvance:studioEngine().wall-r.wall,samples:rows.length,median:at(.5),p95:at(.95),p99:at(.99),max:rows.at(-1),over50:rows.filter(n=>n>50).length,over100:rows.filter(n=>n>100).length,viewport:[innerWidth,innerHeight],canvas:[canvas.width,canvas.height],gpu:info?gl.getParameter(info.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),ua:navigator.userAgent,overflow:document.documentElement.scrollHeight>innerHeight,diagnostics:Match3D.diagnostics(),autosave:typeof careerAutosaveDiagnostics==='function'?careerAutosaveDiagnostics():null};
  });
  assert.ok(result.samples>15&&result.timeAdvance>5,'measurement contains actual live play');assert.equal(result.diagnostics.error,0);assert.equal(result.overflow,false);
  results.measurements.push({quality,...result});await page.evaluate(()=>pauseMatch());
  fs.writeFileSync(path.join(out,'3d-performance-1080.json'),JSON.stringify(results,null,2));
 }
 await page.evaluate(s=>{studioCamera3D=s.camera;studioExpanded3D=s.expanded;state.live.rink.mode=s.mode;state.live.onIceSpeed=s.rate;state.live.speed=s.speed;matchPreferences().graphics3d=s.quality;render();},settings);
 await application.evaluate(({BrowserWindow},size)=>BrowserWindow.getAllWindows()[0].setContentSize(...size),bounds);
 await page.waitForFunction(size=>innerWidth===size[0]&&innerHeight===size[1],bounds);
};
