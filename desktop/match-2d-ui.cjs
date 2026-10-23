'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
module.exports=async function check2D(page,out,application){
 await page.evaluate(()=>{pauseMatch();render();});
 await page.locator('#career-ice[data-ready="true"]').waitFor();
 assert.equal(await page.locator('#career-ice-3d,#clubhouse-canvas').count(),0);
 assert.equal(await page.getByLabel('3D-kamera',{exact:true}).count(),0);
 const original=await page.evaluate(()=>JSON.stringify([state.live.broadcast,state.live.analysis,state.lines,state.calendar.date]));
 const rendered=await page.locator('#career-ice').evaluate(canvas=>{const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;let filled=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i])filled++;return filled/(pixels.length/4);});
 assert.ok(rendered>.9,'the 2D engine paints the real rink');
 for(const [width,height] of [[1920,1080],[1440,1000],[1366,768]]){
  await application.evaluate(({BrowserWindow},size)=>{const w=BrowserWindow.getAllWindows()[0];w.unmaximize();w.setContentSize(...size);},[width,height]);
  await page.waitForFunction(w=>innerWidth===w,width);
  const boxes=await page.locator('#career-ice,#match-play,.mc-result').evaluateAll(ns=>ns.map(n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};}));
  assert.ok(boxes.every(r=>r.width>0&&r.height>0&&r.x>=0&&r.y>=0&&r.right<=width+2&&r.bottom<=height+2),'rink, scoreboard and controls fit '+width);
  await page.screenshot({path:path.join(out,'2d-match-'+width+'.png'),fullPage:true});
 }
 assert.equal(await page.evaluate(()=>JSON.stringify([state.live.broadcast,state.live.analysis,state.lines,state.calendar.date])),original,'resizing and rendering never simulate');
};
