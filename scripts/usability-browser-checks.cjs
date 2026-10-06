'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
async function checkUsability(page,out){
 await page.evaluate(()=>{startCareerWithClub('HV71');deskNavigate('home');ensureLines();});
 assert.equal(await page.locator('.manager-nav>.nav-item').count(),6);
 const before=await page.evaluate(()=>JSON.stringify([state.money,state.calendar.date,state.recruitment.deals,state.lines]));
 await page.keyboard.press('Control+k');await page.locator('#desk-search-input').fill('budget');
 await page.locator('.entity-search').getByRole('button',{name:'Sök',exact:true}).click();
 await page.locator('.desk-destinations').getByRole('button',{name:/^Ekonomi/}).click();
 assert.equal(await page.evaluate(()=>state.page),'finance');assert.equal(await page.locator('.entity-search[open]').count(),0);
 await page.getByRole('button',{name:'Tillbaka i navigationen',exact:true}).click();await page.waitForFunction(()=>state.page==='home');
 await page.keyboard.press('Control+k');await page.keyboard.press('Escape');assert.equal(await page.locator('.entity-search[open]').count(),0);
 await page.evaluate(()=>deskNavigate('leagues'));
 await page.getByRole('navigation',{name:'Ligor och resultat',exact:true}).getByRole('button',{name:'Slutspel & kval',exact:true}).click();
 assert.equal(await page.evaluate(()=>leagueWorkspaceUI.tab),'playoffs');
 await page.getByRole('navigation',{name:'Ligor och resultat',exact:true}).getByRole('button',{name:'Tabell',exact:true}).click();
 assert.equal(await page.evaluate(()=>state.page),'table');
 await page.evaluate(()=>deskOpenPlayer(state.playerWorld.freeAgents[0].id));
 assert.equal(await page.getByRole('navigation',{name:'Spelarprofil',exact:true}).getByRole('button').count(),4);
 await page.getByRole('button',{name:'Avtal & värvning',exact:true}).click();
 assert.equal(await page.evaluate(()=>recruitHub.panel),'transfer');
 assert.equal(await page.evaluate(()=>JSON.stringify([state.money,state.calendar.date,state.recruitment.deals,state.lines])),before);
 // Capture every main management screen; assertions catch clipped global navigation.
 for(const route of ['home','squad','lines','locker','training','juniors','medical','transfers','finance','board','staff','staffReview','manager','world','leagues','international','nhl','season']){
  await page.evaluate(route=>{navigationUI.searchOpen=false;deskNavigate(route);document.activeElement?.blur();},route);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),route+' fits viewport');
  const buttons=await page.locator('.desk-tools>.desk-subnav button').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {x:r.x,right:r.right,y:r.y,bottom:r.bottom};}));
  assert.ok(buttons.every(r=>r.x>=0&&r.right<=1368),route+' tabs visible');
  await page.screenshot({path:path.join(out,'usability-'+route+'.png'),fullPage:true});
 }
 await page.evaluate(()=>deskNavigate('home'));await page.keyboard.press('Control+k');
 await page.screenshot({path:path.join(out,'usability-search.png'),fullPage:true});await page.keyboard.press('Escape');
}
module.exports={checkUsability};
