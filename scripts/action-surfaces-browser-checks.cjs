'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
module.exports=async function checkActionSurfaces(page,out){
 await page.setViewportSize({width:1440,height:1000});
 await page.evaluate(()=>{startCareerWithClub('HV71');preseasonConfigure('balanced','manager','rotation','assistant','assistant');clubhouseGo('locker');globalThis.actionA=managerRoster()[3];globalThis.actionB=managerRoster()[6];clubhouseSelect(actionB.id);actionA.social.trust=35;clubDecisionOpen();clubDecisionFilter('plan');});
 const a=await page.evaluate(()=>({id:actionA.id,name:actionA.name,trust:actionA.social.trust})),b=await page.evaluate(()=>({id:actionB.id,name:actionB.name,trust:actionB.social.trust}));
 const baseline=await page.evaluate(()=>JSON.stringify([state.calendar.date,state.money,state.lines,state.training.promises]));
 await page.locator(`.cw-case[data-case-key="player:${a.id}"]`).getByRole('button',{name:'Öppna spelarens ärende →',exact:true}).first().click();
 assert.equal(await page.locator('#clubhouse-person-heading').innerText(),a.name);
 assert.equal(await page.evaluate(()=>clubhousePlayer().id),a.id);
 const portrait=await page.locator('.as-player-hero .sw-portrait').boundingBox(),name=await page.locator('#clubhouse-person-heading').boundingBox();
 assert.ok(portrait.x+portrait.width<=name.x,'portrait never overlaps the named player');
 assert.equal(await page.evaluate(()=>JSON.stringify([state.calendar.date,state.money,state.lines,state.training.promises])),baseline);
 for(const [width,height] of [[1920,1080],[1440,1000],[1366,768],[390,844]]){
  await page.setViewportSize({width,height});
  const panel=page.locator('#clubhouse-panel'),box=await panel.boundingBox();
  assert.ok(box.x>=0&&box.x+box.width<=width+1&&box.y>=0&&box.y+box.height<=height,'conversation fits '+width);
  assert.ok(await panel.evaluate(el=>el.scrollWidth<=el.clientWidth+2),'conversation content fits '+width);
  await page.screenshot({path:path.join(out,'conversation-'+width+'.png')});
 }
 await page.setViewportSize({width:1440,height:1000});
 await page.locator('#clubhouse-panel').getByRole('button',{name:/Hur har du det/}).click();
 assert.ok(await page.evaluate(()=>actionA.social.trust)>a.trust);assert.equal(await page.evaluate(()=>actionB.social.trust),b.trust);
 await page.keyboard.press('Escape');assert.equal(await page.locator('#clubhouse-panel').isVisible(),false);
 // Open a specifically named request while a different player and agenda filter remain selected.
 await page.evaluate(()=>{managerMessage('action-a',actionA.name+' vill prata om sin roll','Jag vill få mer ansvar. Kan du ge mig minst 15 minuters istid i två av de tre kommande matcherna?','Spelarsamtal',{playerId:actionA.id,decisionType:'minutes'});globalThis.actionMessageA=state.training.messages[0];managerMessage('action-b',actionB.name+' vill prata om sin roll','Jag vill ha ett besked om min roll.','Spelarsamtal',{playerId:actionB.id,decisionType:'minutes'});inboxFilter('agenda');clubhouseGo('office');clubhouseBriefing();});
 await page.locator('.ch-day-item').filter({has:page.getByRole('heading',{name:a.name+' vill prata om sin roll',exact:true})}).getByRole('button',{name:/Öppna underlaget/}).click();
 assert.equal(await page.evaluate(()=>state.training.selectedMessage),await page.evaluate(()=>actionMessageA.id));
 assert.equal(await page.locator('#inbox-letter .as-letter-sender strong').innerText(),a.name);assert.equal(await page.evaluate(()=>inboxUI.filter),'all');
 const avatar=await page.locator('.as-letter-sender .player-avatar').boundingBox();assert.ok(avatar.width<=60&&avatar.height<=70,'letter portrait stays inside its frame');
 for(const [width,height] of [[1440,1000],[1366,768],[390,844]]){
  await page.setViewportSize({width,height});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
  assert.ok(await page.locator('#inbox-letter').evaluate(el=>el.scrollWidth<=el.clientWidth+2));
  await page.screenshot({path:path.join(out,'message-'+width+'.png')});
 }
 await page.setViewportSize({width:1440,height:1000});
 await page.getByRole('button',{name:/Jag kan inte lova en större roll/}).click();
 assert.equal(await page.evaluate(()=>Boolean(actionMessageA.resolved)),true);assert.equal(await page.evaluate(()=>Boolean(state.training.messages.find(m=>m.key==='action-b').resolved)),false);
 // Exercise real dialogs rather than styling synthetic examples.
 const cases=[
  ['locker',()=>{clubhouseOpen('locker');clubhouseUI.work=true;lockerOpenDetail('talk',actionA.id);},'#locker-dialog'],
  ['recruitment',()=>{clubhouseGo('recruit');clubhouseOpen('transfers','search');recruitmentOpen('filters');},'#recruitment-dialog'],
  ['development',()=>{clubhouseGo('ice');clubhouseOpen('training');developmentOpenPlayer(actionA.id,'training',true);},'#development-dialog'],
  ['club',()=>{clubhouseGo('boardroom');clubhouseOpen('finance');clubDeskOpen('tickets');},'#club-dialog'],
  ['world',()=>{clubhouseGo('world');clubhouseOpen('international');worldDeskOpen('internationalScope');},'#world-dialog']
 ];
 for(const [name,open,selector] of cases){
  await page.evaluate(open);await page.locator(selector+'[open]').waitFor();
  assert.ok(await page.locator(selector+' .as-heading h2').innerText());
  assert.ok(await page.locator(selector+' .as-heading h2').evaluate(el=>parseFloat(getComputedStyle(el).fontSize)>=22),name+' uses the shared heading scale');
  assert.ok(await page.locator(selector+' .as-heading').evaluate(el=>parseFloat(getComputedStyle(el).paddingLeft)>=20),name+' uses the shared spacing scale');
  for(const [width,height] of [[1440,1000],[390,844]]){
   await page.setViewportSize({width,height});const dialog=page.locator(selector),box=await dialog.boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width+1&&box.y>=0&&box.y+box.height<=height+1,name+' fits '+width);
   assert.ok(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth+2),name+' contents fit '+width);
   await page.screenshot({path:path.join(out,name+'-'+width+'.png')});
  }
  await page.keyboard.press('Escape');assert.equal(await page.locator(selector+'[open]').count(),0);await page.setViewportSize({width:1440,height:1000});
 }
 assert.equal(await page.evaluate(()=>state.calendar.date),JSON.parse(baseline)[0]);
};
