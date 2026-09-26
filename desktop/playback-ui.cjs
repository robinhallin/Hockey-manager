'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
module.exports=async function checkPlayback(page,out){
 const ledger=()=>page.evaluate(()=>JSON.stringify([studioEngine().rng,studioEngine().score,studioEngine().time,state.live.analysis,state.tacticalPlan]));
 const before=await ledger(),fast=await page.evaluate(()=>state.live.speed);
 for(const mode of ['full','extended','highlights']){
  await page.getByLabel('Matchvisning',{exact:true}).selectOption(mode);
  await page.getByLabel('Tempo på isen',{exact:true}).selectOption('2');
  assert.equal(await page.evaluate(()=>studioOnIceRate()),2);
  assert.equal(await page.evaluate(()=>state.live.speed),fast,'visible pace does not change fast-forward');
  assert.equal(await page.locator('.mc-playback select').count(),2,'one mode and one pace control');
  assert.match(await page.locator('.mc-playback-hint').innerText(),/1× = verklig spelfart/);
 }
 await page.getByLabel('Matchvisning',{exact:true}).selectOption('commentary');
 await page.getByLabel('Simuleringstempo',{exact:true}).selectOption('4');
 await page.locator('#broadcast-overview').waitFor({state:'visible'});
 assert.match(await page.locator('#broadcast-overview-title').innerText(),/Simulering pausad/);
 assert.equal(await page.getByLabel('Tempo på isen',{exact:true}).count(),0);
 assert.equal(await page.evaluate(()=>studioOnIceRate()),2);
 await page.locator('#match-tab-settings').click();
 await page.getByLabel('Snabbspolning mellan höjdpunkter',{exact:true}).selectOption('3');
 assert.equal(await page.getByLabel('Simuleringstempo',{exact:true}).inputValue(),'3');
 await page.getByLabel('Matchvisning',{exact:true}).selectOption('highlights');
 assert.equal(await page.getByLabel('Tempo på isen',{exact:true}).inputValue(),'2');
 await page.screenshot({path:path.join(out,'36-match-playback-settings.png'),fullPage:true});
 await page.getByLabel('Tempo på isen',{exact:true}).selectOption('1');
 await page.locator('#match-tab-feedback').click();
 assert.equal(await ledger(),before,'presentation controls preserve the match and tactics');
 assert.equal(await page.evaluate(()=>state.live.running),false);
};
