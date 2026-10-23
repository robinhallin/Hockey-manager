'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
module.exports=async function checkWorkrooms(page,out){
 const nav=()=>page.getByRole('navigation',{name:'Spelets huvudnavigation',exact:true});
 await page.setViewportSize({width:1440,height:1000});
 await page.evaluate(()=>{startCareerWithClub('HV71');preseasonConfigure('balanced','manager','rotation','assistant','assistant');ensureLines();clubhouseGo('office');});
 const before=await page.evaluate(()=>JSON.stringify([state.calendar,state.money,state.lines,state.training,state.recruitment,managerRoster()]));
 for(const [label,key] of [['Kontoret','office'],['Truppen','locker'],['Taktik','tactics'],['Utveckling','ice'],['Rekrytering','recruit'],['Klubben','boardroom'],['Världen','world']]){
  await nav().getByRole('button',{name:label,exact:true}).click();
  assert.equal(await page.evaluate(()=>clubhouseRoomsKey()),key);
  await page.waitForFunction(()=>{const i=document.querySelector('.cr-environment');return i?.complete&&i.naturalWidth>0;});
  assert.equal(await nav().getByRole('button',{name:label,exact:true}).getAttribute('aria-current'),'page');
  const choices=await page.locator('.cr-side-tabs button').allTextContents();
  for(const name of choices){await page.locator('.cr-side-tabs').getByRole('button',{name:name.trim(),exact:true}).click();assert.ok(await page.locator('.cr-side-body').isVisible());}
  await page.locator('.cr-side-tabs button').first().click();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true);
  await page.screenshot({path:path.join(out,'room-'+key+'-1440.png'),fullPage:true});
 }
 assert.equal(await page.evaluate(()=>JSON.stringify([state.calendar,state.money,state.lines,state.training,state.recruitment,managerRoster()])),before,'room visits and workstations never simulate or award progress');
 await nav().getByRole('button',{name:'Utveckling',exact:true}).click();
 const plan=await page.evaluate(()=>({date:state.calendar.date,next:calAdd(state.calendar.date,1),history:state.training.history.length}));
 await page.getByRole('navigation',{name:'Välj träningsdag'}).getByRole('button').nth(1).click();
 await page.getByLabel('Lagpass i utvecklingscentret',{exact:true}).selectOption('recovery');
 assert.equal(await page.evaluate(date=>calendarSession(date).type,plan.next),'recovery');
 assert.equal(await page.getByLabel('Belastning i utvecklingscentret',{exact:true}).isDisabled(),true);
 assert.equal(await page.evaluate(()=>state.calendar.date),plan.date);assert.equal(await page.evaluate(()=>state.training.history.length),plan.history);
 await nav().getByRole('button',{name:'Världen',exact:true}).click();
 await page.locator('.cr-side-tabs').getByRole('button',{name:'Bevakningsbordet',exact:true}).click();
 const opponent=await page.evaluate(()=>deskFixtures().upcoming[0].opponent);
 await page.getByRole('button',{name:new RegExp('^Följ '+opponent)}).click();
 assert.equal(await page.evaluate(club=>worldWatchStore().clubs.includes(club),opponent),true);
 await nav().getByRole('button',{name:'Taktik',exact:true}).click();
 await page.getByRole('navigation',{name:'Enheter på taktiktavlan'}).getByRole('button',{name:'Powerplay',exact:true}).click();
 await page.getByRole('button',{name:/^Powerplay 2/}).click();
 assert.equal(await page.evaluate(()=>specialUI.unit),'pp2');
 await page.getByRole('button',{name:'Stäng arbetsytan',exact:true}).click();assert.equal(await page.evaluate(()=>clubhouseRoomsKey()),'tactics');
 await nav().getByRole('button',{name:'Truppen',exact:true}).click();
 const player=await page.evaluate(()=>{const p=managerRoster().find(p=>clubhousePresence(p).present);return {id:String(p.id),trust:p.social.trust};});
 await page.getByLabel('Vem vill du träffa?',{exact:true}).selectOption(player.id);
 await page.getByRole('button',{name:/^Hur har du det/}).click();
 assert.ok(await page.evaluate(id=>clubhousePlayer(id).social.trust,player.id)>player.trust);
 assert.equal(await page.getByRole('button',{name:/^Hur har du det/}).isDisabled(),true);
 await page.keyboard.press('Escape');
 await page.evaluate(()=>save());await page.reload();await page.waitForFunction(()=>typeof state!=='undefined'&&state.careerStarted);
 assert.equal(await page.evaluate(date=>calendarSession(date).type,plan.next),'recovery');
 assert.equal(await page.evaluate(club=>worldWatchStore().clubs.includes(club),opponent),true);
 assert.ok(await page.evaluate(id=>managerRoster().find(p=>String(p.id)===id).social.trust,player.id)>player.trust);
 await page.evaluate(()=>resumeCareer());
 for(const [width,height] of [[1920,1080],[1366,768],[390,844]]){
  await page.setViewportSize({width,height});
  await nav().getByRole('button',{name:'Utveckling',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('.cr-environment')?.naturalWidth>0);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true);
  const bounds=await page.locator('.cr-station,.ct-footer').evaluateAll(ns=>ns.map(n=>{const r=n.getBoundingClientRect();return {x:r.x,right:r.right,width:r.width};}));
  assert.ok(bounds.every(r=>r.width>0&&r.x>=-1&&r.right<=width+1),'room stations and permanent navigation fit '+width);
  const labels=await page.locator('.ct-footer>nav button span').evaluateAll(ns=>ns.map(n=>{const r=n.getBoundingClientRect(),p=n.parentElement.getBoundingClientRect();return r.left>=p.left-1&&r.right<=p.right+1;}));
  assert.ok(labels.every(Boolean),'navigation labels stay inside their own buttons');
  await page.screenshot({path:path.join(out,'room-development-'+width+'.png'),fullPage:true});
 }
 await page.setViewportSize({width:1440,height:1000});
};
