'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
// Also run in the installed Windows application, on its real career match.
async function matchScreenshot(page,file){
 await page.evaluate(()=>{window.matchTestRAF=window.requestAnimationFrame;window.requestAnimationFrame=()=>0});
 try{await page.screenshot({path:file,fullPage:true,timeout:30000});}
 finally{await page.evaluate(()=>{window.requestAnimationFrame=window.matchTestRAF;delete window.matchTestRAF;studioRAF=false;studioMount()});}
}
async function checkMatchView(page){
 const before=await page.evaluate(()=>JSON.stringify([state.live.broadcast,state.live.rink,state.lines,state.tacticalPlan]));
 for(const tab of ['tactics','changes','lineup','stats','players','events','analysis','settings','feedback']){
  await page.locator('#match-tab-'+tab).click();
  assert.equal(await page.locator('#match-tab-'+tab).getAttribute('aria-pressed'),'true');
  assert.equal(await page.locator('.mc-coach-content').getAttribute('data-match-panel'),tab);
 }
 assert.equal(await page.evaluate(()=>JSON.stringify([state.live.broadcast,state.live.rink,state.lines,state.tacticalPlan])),before,'read-only views preserve simulation and orders');
 const id=await page.locator('.mc-on-ice .player-reference').first().getAttribute('data-player-id');
 await page.locator('.mc-on-ice .player-reference').first().click();await page.waitForFunction(()=>state.page==='player');
 await page.locator('.fm-back').click();await page.waitForFunction(()=>state.page==='match');
 assert.equal(await page.locator('.mc-on-ice .player-reference').first().getAttribute('data-player-id'),id);
 assert.equal(await page.evaluate(()=>state.live.running),false);
 await page.locator('#match-tab-tactics').click();
 const scroll=await page.locator('.mc-coach-content').evaluate(el=>{el.scrollTop=180;return el.scrollTop});
 await page.evaluate(()=>render());
 assert.equal(await page.locator('.mc-coach-content').evaluate(el=>el.scrollTop),scroll,'render preserves coach scroll');
 await page.locator('#match-tab-settings').click();
 assert.equal(await page.getByRole('checkbox').count(),4);
 await page.locator('#match-tab-feedback').click();
}
async function checkMatchDecisions(page,out){
 // Real public actions and fixed-step simulation. No generated scores or fake reports.
 await page.locator('#match-tab-tactics').click();await page.locator('#match-plan-pressure').click();
 assert.equal(await page.evaluate(()=>state.tacticalPlan.tempo),'high');
 await page.locator('#match-order-tempo').selectOption('normal');
 assert.equal(await page.evaluate(()=>state.live.running),false);
 await page.locator('#match-tab-settings').click();
 await page.getByRole('checkbox',{name:'Efter mål',exact:true}).check();
 assert.equal(await page.evaluate(()=>matchPreferences().goal),true);
 await page.getByRole('checkbox',{name:'Efter mål',exact:true}).uncheck();
 await page.locator('#match-play').click();await page.waitForFunction(()=>state.live.running);
 const clock=await page.evaluate(()=>studioEngine().time);
 await page.waitForFunction(t=>studioEngine().time>t,clock);
 await page.locator('#match-tab-stats').click();assert.equal(await page.evaluate(()=>state.live.running),true,'statistics can follow live');
 await page.locator('#match-tab-tactics').click();assert.equal(await page.evaluate(()=>state.live.running),false,'coaching pauses');
 // Advance this same game into play to exercise reports, replay and live patches.
 await page.evaluate(()=>{startMatch();for(let i=0;i<2400;i++){if(!state.live.running){while(medicalPending())medicalDecisionAccept();startMatch()}studioStep()}pauseMatch();matchTab('players')});
 const player=page.locator('.mc-coach-content .player-reference').first();await player.click();await page.locator('.fm-back').click();
 assert.equal(await page.locator('#match-tab-players').getAttribute('aria-pressed'),'true');
 await page.locator('#match-tab-events').click();assert.ok(await page.locator('.mc-events time').count()>0);
 await page.locator('#match-tab-analysis').click();assert.equal(await page.locator('.mc-shot-analysis').count(),1);
 if(await page.evaluate(()=>Boolean(studioEngine().latestReplay))){
  await page.getByRole('button',{name:'↺ Senaste avslutet',exact:true}).click();assert.equal(await page.evaluate(()=>state.live.running),false);
  await page.getByRole('button',{name:'Tillbaka till matchen',exact:true}).click();
 }
 for(const mode of await page.evaluate(()=>Object.keys(MATCH_VIEW_MODES))){
  await page.getByRole('combobox',{name:'Matchvisning',exact:true}).selectOption(mode);
  const r=await page.locator('.mc-playback').boundingBox();assert.ok(r.x+r.width<=1367&&r.y+r.height<=769,'playback fits '+mode);
 }
 await page.evaluate(()=>{matchTab('stats');startMatch()});
 await page.locator('.mc-coach-content').evaluate(el=>{el.scrollTop=100});
 const liveScroll=await page.locator('.mc-coach-content').evaluate(el=>el.scrollTop);
 await page.evaluate(()=>{document.activeElement?.blur();studioRefresh()});
 assert.equal(await page.locator('.mc-coach-content').evaluate(el=>el.scrollTop),liveScroll,'live patches preserve scroll');
 await page.evaluate(()=>pauseMatch());
 await page.evaluate(()=>{injurePlayer(playerById(state.lines.defense[0]),'match',5);render()});
 await page.locator('#medical-decision-dialog').waitFor({state:'visible'});
 assert.equal(await page.evaluate(()=>state.live.running),false);
 await page.getByRole('button',{name:'Bekräfta nuvarande uppställning',exact:true}).click();
 await page.locator('#match-tab-changes').click();
 await page.locator('#match-action-timeout').click();assert.equal(await page.evaluate(()=>state.live.timeoutUsed),true);
 await matchScreenshot(page,path.join(out,'match-changes-played.png'));
 // A running save reopens paused with the same engine and accounting state.
 const snapshot=await page.evaluate(()=>{startMatch();clearTimeout(matchTimer);save();return JSON.stringify([state.live.broadcast,state.live.rink,state.live.analysis.shots])});
 await page.reload();await page.waitForFunction(()=>Boolean(state.live));
 assert.equal(await page.evaluate(()=>state.live.running),false);
 assert.equal(await page.evaluate(()=>JSON.stringify([state.live.broadcast,state.live.rink,state.live.analysis.shots]))===snapshot,true,'saved engine and accounting restored unchanged');
 await page.evaluate(()=>{careerScreen=null;deskNavigate('match');matchTab('feedback')});
 await matchScreenshot(page,path.join(out,'match-played.png'));
 await checkMatchReports(page,out);
}
async function checkMatchReports(page,out){
 // Finish the actual simulation and keep final figures and coaching in one workspace.
 await page.evaluate(()=>{let steps=0;while(!state.live.finished&&steps++<65000){if(!state.live.running){while(medicalPending())medicalDecisionAccept();startMatch()}studioStep()}render()});
 assert.equal(await page.evaluate(()=>state.live.finished),true);
 for(const tab of ['feedback','report','stats','players','events','analysis']){
  await page.locator('#match-tab-'+tab).click();
  assert.equal(await page.locator('#content').evaluate(el=>el.scrollHeight<=el.clientHeight+1),true,'finished fits '+tab);
 }
 await page.locator('#match-tab-report').click();
 assert.equal(await page.getByRole('heading',{name:'Tre svar efter matchen',exact:true}).count(),1);
 assert.equal(await page.getByRole('heading',{name:'Spelaruppgifter i matchen',exact:true}).count(),1);
 assert.ok(await page.locator('.performance-tasks tbody tr').count()>0);
 assert.equal(await page.locator('.mc-coach-content').evaluate(el=>el.scrollWidth<=el.clientWidth+1),true,'report stays within the coach panel');
 const frozen=await page.evaluate(()=>JSON.stringify(analysisLiveReport().performance));
 await matchScreenshot(page,path.join(out,'match-finished.png'));
 await page.getByRole('button',{name:'Matchrapport →',exact:true}).click();
 assert.equal(await page.getByRole('heading',{name:'Tre svar efter matchen',exact:true}).count(),1);
 assert.equal(await page.evaluate(()=>analysisSelection().id===state.live.analysis.id),true);
 assert.equal(await page.evaluate(()=>JSON.stringify(analysisSelection().performance)),frozen);
 assert.equal(await page.evaluate(()=>{const ids=[...document.querySelectorAll('.mc-decision-followup[id]')].map(el=>el.id);return new Set(ids).size===ids.length}),true);
 await matchScreenshot(page,path.join(out,'match-archived.png'));
}
module.exports={checkMatchView,checkMatchDecisions,checkMatchReports,matchScreenshot};
