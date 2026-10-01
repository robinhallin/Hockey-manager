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
 await page.getByLabel('Matchljud',{exact:true}).selectOption('0.65');
 assert.equal(await page.evaluate(()=>studioAudioPreferences().volume),.65);
 assert.equal(await page.getByLabel('Simuleringstempo',{exact:true}).inputValue(),'3');
 await page.getByLabel('Matchvisning',{exact:true}).selectOption('highlights');
 assert.equal(await page.getByLabel('Tempo på isen',{exact:true}).inputValue(),'2');
 await page.waitForFunction(()=>document.getElementById('career-ice-3d')?.dataset.ready==='true');
 await page.screenshot({path:path.join(out,'36-match-playback-settings.png'),fullPage:true});
 await page.getByLabel('Tempo på isen',{exact:true}).selectOption('1');
 await page.locator('#match-tab-feedback').click();
 assert.equal(await ledger(),before,'presentation controls preserve the match and tactics');
 assert.equal(await page.evaluate(()=>state.live.running),false);
 // The ordinary game chooses the event. Its buffered build-up must be shown
 // before continuing the same authoritative simulation, including pause.
 await page.locator('#match-play').click();
 await page.waitForFunction(()=>studioHighlightWindow?.lead&&studioHighlightWindow.lead.duration-studioHighlightWindow.lead.elapsed>1.5);
 const held=await page.evaluate(()=>studioEngine().wall);
 await page.waitForTimeout(200);
 assert.equal(await page.evaluate(()=>studioEngine().wall),held,'build-up holds the simulation clock');
 assert.match(await page.locator('.broadcast-view>header strong').innerText(),/UPPBYGGNAD/);
 await page.locator('#match-play').click();await page.waitForFunction(()=>!state.live.running);
 const leadAt=await page.evaluate(()=>studioHighlightWindow.lead.elapsed);
 await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>studioHighlightWindow.lead.elapsed),leadAt,'pause holds the build-up playhead');
 const board=await page.evaluate(()=>studioRecordedScoreboard(studioHighlightShownFrame(),matchVenue().ownHome?0:1));
 assert.equal((await page.locator('.mc-result>b').innerText()).replace(/\s/g,''),board.score.join('–'));
 await page.screenshot({path:path.join(out,'54-highlight-build-up.png'),fullPage:true});
 await page.locator('#match-play').click();await page.waitForFunction(()=>!studioHighlightWindow?.lead);
 await page.locator('#match-play').click();await page.waitForFunction(()=>!state.live.running);
};
