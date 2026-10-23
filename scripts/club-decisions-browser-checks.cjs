'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
module.exports=async function checkClubDecisions(page,out){
 await page.setViewportSize({width:1440,height:1000});
 await page.evaluate(()=>{startCareerWithClub('HV71');preseasonConfigure('balanced','manager','rotation','manager','assistant');ensureLines();depthSelection();ensureSpecialTeams();clubhouseRoomsVisit('office');});
 const before=await page.evaluate(()=>JSON.stringify([state.calendar.date,state.money,state.lines,state.specialTeams]));
 const nav=()=>page.getByRole('navigation',{name:'Spelets huvudnavigation',exact:true});
 for(const [label,room] of [['Kontoret','office'],['Truppen','locker'],['Taktik','tactics'],['Utveckling','ice'],['Rekrytering','recruit'],['Klubben','boardroom'],['Världen','world']]){
  await nav().getByRole('button',{name:label,exact:true}).click();
  assert.equal(await page.locator('.cw-room-insight').count(),1,'shared decision insight in '+room);
 }
 assert.equal(await page.evaluate(()=>JSON.stringify([state.calendar.date,state.money,state.lines,state.specialTeams])),before);
 await nav().getByRole('button',{name:'Kontoret',exact:true}).click();
 await page.getByRole('button',{name:'Dagens arbete & uppföljning',exact:true}).click();
 await page.getByRole('heading',{name:'Ditt arbete i klubben',exact:true}).waitFor();
 assert.equal(await page.getByRole('navigation',{name:'Dagens ärenden'}).getByRole('button').count(),4);
 await page.locator('.cw-contracts > summary').click();
 const row=page.locator('.cw-table tbody tr').filter({hasText:'Herman Liv'});
 await row.getByRole('combobox').selectOption('retain');
 assert.equal(await page.evaluate(()=>clubDecisionStore().plans.filter(p=>!p.closed).length),1);
 // A rerender keeps the user's expanded planning table and its focus target.
 assert.equal(await page.locator('.cw-contracts').evaluate(el=>el.open),true);
 assert.equal(await page.evaluate(()=>JSON.stringify([state.calendar.date,state.money,state.lines,state.specialTeams])),before);
 await page.reload();await page.getByRole('button',{name:/FORTSÄTT KARRIÄR HV71/}).click();
 assert.equal(await page.evaluate(()=>clubDecisionStore().plans.find(p=>p.name==='Herman Liv').intent),'retain');
 await page.evaluate(()=>clubDecisionOpen());
 await page.locator('.cw-contracts > summary').click();
 await page.locator('.cw-table tbody tr').filter({hasText:'Herman Liv'}).getByRole('button',{name:'Konkurrens & provperiod',exact:true}).click();
 await page.locator('.cw-competition > details > summary').click();
 await page.locator('.cw-competition').getByRole('button',{name:'Diskutera provperiod',exact:true}).click();
 await page.getByRole('button',{name:/^Ge en målvaktsperiod/}).click();
 assert.equal(await page.evaluate(()=>state.stories.active.find(s=>s.type==='breakthrough').expectation.matches),6);
 assert.equal(await page.evaluate(()=>JSON.stringify([state.calendar.date,state.money,state.lines,state.specialTeams])),before);
 await page.getByRole('button',{name:'Inkorg',exact:true}).click();
 await page.evaluate(()=>clubDecisionOpen());
 await page.getByRole('button',{name:/^Väntar på/}).click();
 assert.match(await page.locator('.cw-daily').innerText(),/Herman Liv/);
 for(const [width,height] of [[1920,1080],[1366,768],[390,844]]){
  await page.setViewportSize({width,height});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true,'daily workspace fits '+width);
  await page.screenshot({path:path.join(out,'club-decisions-'+width+'.png'),fullPage:true});
 }
 await page.setViewportSize({width:1440,height:1000});
 await nav().getByRole('button',{name:'Utveckling',exact:true}).click();
 await page.locator('#room-station-ice-medical').click();
 const reset=page.getByRole('button',{name:'Rensa urval',exact:true});if(await reset.count())await reset.click();
 await page.getByRole('heading',{name:'Inget kräver en medicinsk åtgärd',exact:true}).waitFor();
 await page.getByRole('button',{name:'Visa hela spelarstatusen',exact:true}).click();
 assert.equal(await page.getByRole('combobox',{name:'Urval',exact:true}).inputValue(),'all');
 await page.screenshot({path:path.join(out,'club-medical-status.png'),fullPage:true});
};
