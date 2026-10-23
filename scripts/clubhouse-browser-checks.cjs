'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
const nav=page=>page.getByRole('navigation',{name:'Spelets huvudnavigation',exact:true});
async function checkClubhouse(page,out){
 await page.setViewportSize({width:1440,height:1000});
 await page.evaluate(()=>{startCareerWithClub('HV71');preseasonConfigure('balanced','manager','rotation','assistant','assistant');ensureLines();clubhouseGo('office');});
 await page.locator('.ct-interior').waitFor();
 assert.equal(await page.locator('#clubhouse-canvas,#career-ice-3d').count(),0);
 assert.equal(await page.getByRole('button',{name:'Utforska i 3D',exact:true}).count(),0);
 const before=await page.evaluate(()=>JSON.stringify([state.calendar.date,state.money,state.lines,managerRoster().map(p=>[p.id,p.promisedRole])]));
 for(const [label,pageName] of [['Truppen','locker'],['Taktik','tactics'],['Utveckling','ice'],['Rekrytering','recruit'],['Klubben','boardroom'],['Världen','world']]){
  await nav(page).getByRole('button',{name:label,exact:true}).click();
  assert.equal(await page.evaluate(()=>clubhouseRoomsKey()),pageName);
  await page.locator('.cr-environment').waitFor();
  assert.equal(await page.locator('.ct-work').count(),0);
  assert.equal(await nav(page).getByRole('button',{name:label,exact:true}).getAttribute('aria-current'),'page');
  assert.equal(await page.evaluate(()=>document.querySelector('.ct-footer').inert),false);
 }
 assert.equal(await page.evaluate(()=>JSON.stringify([state.calendar.date,state.money,state.lines,managerRoster().map(p=>[p.id,p.promisedRole])])),before,'all work areas read the same career');
 await nav(page).getByRole('button',{name:'Truppen',exact:true}).click();
 const player=await page.evaluate(()=>{const p=managerRoster().find(p=>clubhousePresence(p).present);return {id:String(p.id),name:p.name,trust:p.social.trust};});
 await page.getByLabel('Vem vill du träffa?',{exact:true}).selectOption(player.id);
 await page.getByRole('button',{name:/^Hur har du det/}).click();
 assert.ok(await page.evaluate(id=>clubhousePlayer(id).social.trust,player.id)>player.trust);
 assert.equal(await page.getByRole('button',{name:/^Hur har du det/}).isDisabled(),true);
 assert.equal(await page.locator('.ct-footer').evaluate(el=>el.inert),true,'only a real meeting blocks the rest of the interface');
 await page.screenshot({path:path.join(out,'70-integrerat-klubbhus-samtal.png'),fullPage:true});
 await page.keyboard.press('Escape');
 assert.equal(await nav(page).getByRole('button',{name:'Truppen',exact:true}).isEnabled(),true);
}
async function checkClubhouseLife(page,out){
 await page.evaluate(()=>{startCareerWithClub('HV71');preseasonConfigure('balanced','manager','rotation','assistant','assistant');clubhouseGo('office');const p=managerRoster().find(p=>clubhousePresence(p).present);p.social.trust=42;render();});
 const visitor=await page.evaluate(()=>({id:clubhouseLifeVisitor().playerId,date:state.calendar.date,trust:clubhousePlayer(clubhouseLifeVisitor().playerId).social.trust}));
 await page.locator('.ct-agenda-bottom').getByRole('button',{name:/^Ta samtalet/}).click();
 await page.getByRole('button',{name:/^Hur har du det/}).click();
 assert.ok(await page.evaluate(id=>clubhousePlayer(id).social.trust,visitor.id)>visitor.trust);
 assert.equal(await page.evaluate(()=>state.calendar.date),visitor.date);
 await page.keyboard.press('Escape');
 const pending=await page.evaluate(()=>{managerMessage('clubhouse-required','Besvara spelarens roll','Ett verkligt besked behövs.','Spelaren',{decisionType:'role'});render();return {id:pendingManagerDecision().id,date:state.calendar.date};});
 await page.locator('.ct-continue').click();
 assert.equal(await page.evaluate(()=>pendingManagerDecision().id),pending.id);
 assert.equal(await page.evaluate(()=>state.calendar.date),pending.date);
 assert.equal(await page.evaluate(()=>dayTransition),null);
 await page.screenshot({path:path.join(out,'71-klubbhus-verkligt-beslut.png'),fullPage:true});
}
async function checkClubhouseTheme(page,out){
 await page.setViewportSize({width:1440,height:1000});
 await page.evaluate(()=>{startCareerWithClub('HV71');preseasonConfigure('balanced','manager','rotation','assistant','assistant');clubhouseGo('office');});
 await page.waitForFunction(()=>[...document.querySelectorAll('.ct-world img')].every(i=>i.complete&&i.naturalWidth>0));
 await page.screenshot({path:path.join(out,'95-klubbhustema.png'),fullPage:true});
 await nav(page).getByRole('button',{name:'Rekrytering',exact:true}).click();
 await page.getByRole('button',{name:/^Hitta kandidater/}).click();
 await page.getByRole('navigation',{name:'Rekryteringsarbetet'}).getByRole('button',{name:'Spelarsök',exact:true}).click();
 const candidates=await page.locator('.rd-scroll').boundingBox();assert.ok(candidates.height>=240,'candidate list keeps usable height');
 assert.ok(await page.locator('.rd-scroll tbody tr').count()>0);
 await page.screenshot({path:path.join(out,'96-rekrytering-i-klubbhuset.png'),fullPage:true});
 await page.keyboard.press('Escape');assert.equal(await page.locator('.ct-work').count(),0);
 await page.setViewportSize({width:390,height:844});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true);
 await page.screenshot({path:path.join(out,'97-klubbhustema-smal-skarm.png'),fullPage:true});
 await page.setViewportSize({width:1440,height:1000});
}
module.exports={checkClubhouse,checkClubhouseLife,checkClubhouseTheme};
