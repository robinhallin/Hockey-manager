'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
// Real route/return and overflow checks for the shared tool frame. Called offline
// in Electron CI, after the original room and named-conversation regressions.
module.exports=async function checkWorkbench(page,out){
 await page.setViewportSize({width:1440,height:1000});
 await page.evaluate(()=>{startCareerWithClub('HV71');preseasonConfigure('balanced','manager','rotation','manager','assistant');ensureLines();depthSelection();ensureSpecialTeams();tacticsWorkspaceView();clubhouseGo('office');});
 const before=await page.evaluate(()=>JSON.stringify([state.calendar.date,state.money,state.training.history,state.lines,state.specialTeams]));
 const rooms=await page.evaluate(()=>Object.entries(ROOM_WORK_PAGES));
 for(const [room,pages] of rooms){
  for(const [route,title] of pages){
   await page.evaluate(({room,route})=>{clubhouseRoomsVisit(room);clubhouseRoomsOpen(route);},{room,route});
   assert.equal(await page.locator('#rw-work-heading').innerText(),title,route+' names the actual page');
   assert.equal(await page.locator('.rw-station-bar[aria-label="Verktygsmeny"]').count(),1);
   const tools=page.locator('.rw-feature-tabs [aria-current="page"]');
   if(await tools.count()&&route!=='transfers')assert.equal(await page.locator('.rw-stations [aria-current="page"]').count(),0,route+' does not highlight an unrelated station');
   // Tab buttons only change presentation. No action/contract buttons are clicked.
   const tabs=page.locator('.rw-content :is(.sw-toolbar nav,.dd-tabs,.ld-tabs,.cw-tabs,.wd-tabs,.desk-context-nav) button');
   const labels=await tabs.allTextContents();
   for(const label of labels){
    const tab=page.locator('.rw-content :is(.sw-toolbar nav,.dd-tabs,.ld-tabs,.cw-tabs,.wd-tabs,.desk-context-nav)').getByRole('button',{name:label.trim(),exact:true});
    if(await tab.count()===1&&await tab.isEnabled()){await tab.click();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true,route+'/'+label);}
   }
  }
 }
 assert.equal(await page.evaluate(()=>JSON.stringify([state.calendar.date,state.money,state.training.history,state.lines,state.specialTeams])),before,'the complete tool tour is read-only');
 const cases=[['locker','squad'],['office','calendar'],['office','settings'],['ice','training'],['ice','medical'],['ice','juniors'],['recruit','transfers'],['boardroom','finance'],['boardroom','staff'],['world','international'],['world','leagues']];
 for(const [width,height] of [[1920,1080],[1366,768],[390,844]]){
  await page.setViewportSize({width,height});
  for(const [room,route] of cases){
   await page.evaluate(({room,route})=>{clubhouseRoomsVisit(room);clubhouseRoomsOpen(route);},{room,route});
   const content=page.locator('.rw-content');
   assert.equal(await content.evaluate(e=>e.scrollWidth<=e.clientWidth+2),true,route+' has no hidden horizontal page overflow at '+width);
   const frame=await page.locator('.rw-workbench').boundingBox();assert.ok(frame&&frame.x>=0&&frame.x+frame.width<=width+1&&frame.height>=300,route+' frame fits '+width);
   assert.ok(await content.evaluate(e=>e.clientHeight>=200),route+' retains reading space');
   assert.ok(await page.locator('.rw-content input,.rw-content select').evaluateAll(es=>es.filter(e=>e.offsetParent!==null&&!['checkbox','radio','range','color'].includes(e.type)).every(e=>e.getBoundingClientRect().height>=34)),route+' controls remain usable');
   await page.screenshot({path:path.join(out,'workbench-'+route+'-'+width+'.png')});
  }
 }
 await page.setViewportSize({width:1440,height:1000});
 await page.evaluate(()=>{clubhouseRoomsVisit('locker');clubhouseRoomsOpen('squad');});
 const name=await page.evaluate(()=>managerRoster()[0].name);
 await page.locator('.sw-player-name').filter({hasText:name}).click();
 await page.getByRole('button',{name:'Öppna spelarprofil',exact:true}).click();
 assert.equal(await page.locator('#profile-section-world').count(),1);
 assert.ok(await page.locator('#profile-section-overview').isVisible());
 assert.equal(await page.locator('#profile-section-world').getAttribute('open'),null,'background does not displace current player information');
 await page.getByRole('button',{name:'Till arbetet',exact:true}).click();
 assert.equal(await page.evaluate(()=>state.page),'squad');
};
