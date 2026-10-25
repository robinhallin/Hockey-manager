'use strict';
// Actual 2D rendering on CI hardware. Measurements are evidence, not FPS promises.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
module.exports=async function measureMatch(page,out){
 await page.locator('#career-ice').waitFor();
 const before=await page.evaluate(()=>studioEngine().time);
 await page.locator('#match-play').click();
 await page.waitForFunction(()=>state.live.running);
 const sample=await page.evaluate(()=>new Promise(resolve=>{
  const times=[];let last=performance.now(),started=last;
  function frame(now){times.push(now-last);last=now;if(now-started<5000){requestAnimationFrame(frame);return;}
   const sorted=times.slice().sort((a,b)=>a-b);resolve({durationMs:now-started,frames:times.length,meanFrameMs:times.reduce((a,b)=>a+b,0)/times.length,p95FrameMs:sorted[Math.floor(sorted.length*.95)],maxFrameMs:Math.max(...times),gameTime:studioEngine().time,viewport:{width:innerWidth,height:innerHeight,scale:devicePixelRatio}});
  }requestAnimationFrame(frame);
 }));
 await page.evaluate(()=>pauseMatch());
 assert.ok(sample.frames>0&&Number.isFinite(sample.meanFrameMs));
 assert.ok(sample.gameTime>before,'ordinary 2D match advances during measurement');
 fs.writeFileSync(path.join(out,'performance-2d.json'),JSON.stringify({renderer:'2D',version:require('./package.json').version,build:await page.evaluate(()=>betaBuild().revision),platform:os.platform(),release:os.release(),cpu:os.cpus()[0]?.model,memoryGiB:os.totalmem()/1024**3,sample,note:'Five-second CI observation, not a minimum-hardware benchmark.'},null,2));
};
