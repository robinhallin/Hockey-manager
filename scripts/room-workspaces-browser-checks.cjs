'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
module.exports=async function checkUnifiedWorkspaces(page,out){
 const nav=()=>page.getByRole('navigation',{name:'Spelets huvudnavigation',exact:true});
 await page.setViewportSize({width:1440,height:1000});
 await page.evaluate(()=>{startCareerWithClub('HV71');preseasonConfigure('balanced','manager','rotation','manager','assistant');ensureLines();depthSelection();ensureSpecialTeams();tacticsWorkspaceView();clubhouseGo('office');});
 const before=await page.evaluate(()=>JSON.stringify([state.calendar.date,state.money,state.live,state.training.history,state.lines,state.specialTeams]));
 for(const [label,room] of [['Kontoret','office'],['Truppen','locker'],['Taktik','tactics'],['Utveckling','ice'],['Rekrytering','recruit'],['Klubben','boardroom'],['Världen','world']]){
  await nav().getByRole('button',{name:label,exact:true}).click();
  const stations=await page.evaluate(room=>CLUBHOUSE_WORKROOMS[room].stations.map(s=>s[0]),room);
  for(const station of stations){
   await page.locator('#room-station-'+room+'-'+station).click();
   assert.equal(await page.locator('.rw-workbench,.rc-work-surface').count(),1,'one click opens '+room+'/'+station);
   assert.equal(await page.locator('.ct-footer').evaluate(e=>e.inert),false);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true);
   if(await page.locator('.rw-workbench').count()){
    assert.ok(await page.locator('#rw-work-heading').evaluate(e=>e===document.activeElement),'workstation takes keyboard focus');
    await page.screenshot({path:path.join(out,'workstation-'+room+'-'+station+'.png'),fullPage:true});
    await page.keyboard.press('Escape');
   }else await page.getByRole('button',{name:'Lämna arbetsbordet',exact:true}).click();
   assert.equal(await page.evaluate(()=>clubhouseIsRoom()),true);assert.equal(await page.evaluate(()=>clubhouseRoomsKey()),room);
  }
 }
 assert.equal(await page.evaluate(()=>JSON.stringify([state.calendar.date,state.money,state.live,state.training.history,state.lines,state.specialTeams])),before,'opening all 21 tools never advances the career');
 // Exercise retained sorting and filters in the new shell, with a real profile return.
 await nav().getByRole('button',{name:'Truppen',exact:true}).click();await page.locator('#room-station-locker-team').click();
 const roster=await page.locator('#squad-table-scroll').boundingBox();assert.ok(roster.height>=240);
 await page.getByRole('columnheader',{name:/^Spelare/}).getByRole('button').click();
 const player=await page.evaluate(()=>managerRoster()[0].name);
 await page.locator('.rw-content').getByRole('searchbox').fill(player);
 await page.locator('.rw-content').getByRole('button',{name:'Sök',exact:true}).click();
 assert.ok(await page.locator('#squad-table-scroll tbody tr').count()<=2);
 await page.locator('#squad-table-scroll tbody button.sw-player-name').first().click();
 await page.getByRole('button',{name:/^Öppna spelarprofil/}).click();
 assert.equal(await page.evaluate(()=>state.page),'player');await page.getByRole('button',{name:'Till arbetet',exact:true}).click();
 assert.equal(await page.evaluate(()=>state.page),'squad');assert.equal(await page.evaluate(()=>squadUI.query),player);
 // Check the complete legacy tool family at representative desktop/mobile widths.
 for(const [width,height] of [[1920,1080],[1366,768],[390,844]]){
  await page.setViewportSize({width,height});
  for(const [label,room,station,scroll] of [['Utveckling','ice','medical','.dd-scroll'],['Rekrytering','recruit','needs',null],['Klubben','boardroom','budget','.cd-scroll'],['Världen','world','international','.wd-scroll']]){
   await nav().getByRole('button',{name:label,exact:true}).click();await page.locator('#room-station-'+room+'-'+station).click();
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true,room+' fits '+width);
   const box=await page.locator('.rw-workbench').boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width+1&&box.height>300);
   if(scroll&&await page.locator(scroll).count())assert.ok((await page.locator(scroll).first().boundingBox()).height>=240,room+' has readable list space');
   await page.screenshot({path:path.join(out,'workstation-'+room+'-'+width+'.png'),fullPage:true});
  }
 }
 await page.setViewportSize({width:1440,height:1000});
};
