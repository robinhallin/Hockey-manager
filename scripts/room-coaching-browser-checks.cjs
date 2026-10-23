'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
module.exports=async function checkRoomCoaching(page,out){
 await page.setViewportSize({width:1440,height:1000});
 await page.evaluate(()=>{startCareerWithClub('HV71');preseasonConfigure('balanced','manager','rotation','manager','assistant');ensureLines();depthSelection();ensureSpecialTeams();clubhouseRoomsVisit('tactics');});
 const before=await page.evaluate(()=>({date:state.calendar.date,money:state.money,lines:JSON.stringify(state.lines),pp:JSON.stringify(state.specialTeams.pp1)}));
 await page.getByRole('button',{name:/^Arbeta vid taktiktavlan/}).click();
 assert.equal(await page.locator('.ct-work').count(),0);assert.equal(await page.evaluate(()=>state.page),'home');
 await page.getByRole('region',{name:'Taktiktavlan i rummet',exact:true}).waitFor();
 const slot=i=>page.locator('[data-lineup-slot="forwards-'+i+'"]');
 const first=await page.evaluate(()=>state.lines.forwards[0]);
 await slot(0).locator('.tw-pick').click();await slot(9).locator('.tw-pick').click();
 assert.equal(await page.evaluate(()=>state.lines.forwards[9]),first);assert.match(await page.locator('.rc-changes').innerText(),/2 platser ändrade/);
 await page.getByRole('button',{name:'↶ Ångra',exact:true}).click();assert.equal(await page.evaluate(()=>JSON.stringify(state.lines)),before.lines);
 await slot(0).dragTo(slot(3),{sourcePosition:{x:5,y:5},targetPosition:{x:5,y:5}});assert.equal(await page.evaluate(()=>state.lines.forwards[3]),first);
 await page.getByRole('button',{name:'↶ Ångra',exact:true}).click();
 await page.getByRole('navigation',{name:'Taktikarbetsyta'}).getByRole('button',{name:'PP',exact:true}).click();
 await page.locator('[data-special-slot="pp1-0"]').dragTo(page.locator('[data-special-slot="pp1-3"]'),{sourcePosition:{x:5,y:5},targetPosition:{x:5,y:5}});
 assert.notEqual(await page.evaluate(()=>JSON.stringify(state.specialTeams.pp1)),before.pp);await page.getByRole('button',{name:'↶ Ångra',exact:true}).click();assert.equal(await page.evaluate(()=>JSON.stringify(state.specialTeams.pp1)),before.pp);
 for(const [width,height] of [[1920,1080],[1366,768],[390,844]]){
  await page.setViewportSize({width,height});
  for(const label of ['5 mot 5','PP','BP']){
   await page.getByRole('navigation',{name:'Taktikarbetsyta'}).getByRole('button',{name:label,exact:true}).click();
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true);
   const bounds=await page.locator('.rc-work-surface,.ct-footer').evaluateAll(ns=>ns.map(n=>{const r=n.getBoundingClientRect();return {x:r.x,right:r.right,width:r.width};}));assert.ok(bounds.every(r=>r.width>0&&r.x>=0&&r.right<=width+2),'work surface and navigation fit '+width);
   const collision=await page.locator('.tw-special-card').evaluateAll(ns=>{const rs=ns.map(n=>n.getBoundingClientRect());return rs.some((a,i)=>rs.slice(i+1).some(b=>Math.min(a.right,b.right)>Math.max(a.left,b.left)+1&&Math.min(a.bottom,b.bottom)>Math.max(a.top,b.top)+1));});assert.equal(collision,false,'special teams magnets do not overlap');
   await page.screenshot({path:path.join(out,'room-coaching-'+label.replaceAll(' ','')+'-'+width+'.png'),fullPage:true});
  }
 }
 assert.equal(await page.evaluate(()=>state.calendar.date),before.date);assert.equal(await page.evaluate(()=>state.money),before.money);
 await page.setViewportSize({width:1440,height:1000});
 await page.getByRole('navigation',{name:'Spelets huvudnavigation',exact:true}).getByRole('button',{name:'Klubben',exact:true}).click();
 await page.locator('.cr-side-tabs').getByRole('button',{name:'Stabsmötet',exact:true}).click();
 await page.getByText('Ansvar & initiativ från staben',{exact:true}).click();
 await page.getByLabel('Stabsansvar för A-lagets träning',{exact:true}).selectOption('advise');
 assert.equal(await page.evaluate(()=>staffMode('training')),'advise');
 await page.getByRole('navigation',{name:'Spelets huvudnavigation',exact:true}).getByRole('button',{name:'Kontoret',exact:true}).click();
 await page.locator('.ct-continue').click();await page.waitForFunction(date=>state.calendar.date!==date&&!dayTransition,before.date);
 const proposal=await page.evaluate(()=>{const p=state.office2.proposals.find(p=>p.area==='training'&&p.status==='pending');return {id:p.id,target:p.target,session:JSON.stringify(p.session)};});
 await page.getByRole('navigation',{name:'Spelets huvudnavigation',exact:true}).getByRole('button',{name:'Utveckling',exact:true}).click();
 await page.locator('.rc-initiatives').getByRole('button').filter({hasText:'A-lagets träning'}).click();
 assert.equal(await page.evaluate(()=>state.office2.proposals[0].status),'pending');
 await page.getByRole('button',{name:'Godkänn förslaget',exact:true}).click();assert.equal(await page.evaluate(()=>state.office2.proposals[0].status),'accepted');
 await page.getByText('Beslut och uppföljning',{exact:true}).click();assert.match(await page.locator('.rc-followups').innerText(),/Godkänt/);
 await page.screenshot({path:path.join(out,'room-coaching-staff-followup.png'),fullPage:true});
 await page.reload();await page.getByRole('button',{name:/^FORTSÄTT KARRIÄR/}).click();
 assert.equal(await page.evaluate(id=>state.office2.proposals.find(p=>p.id===id).status,proposal.id),'accepted');assert.equal(await page.evaluate(date=>JSON.stringify(state.calendar.plans[date]),proposal.target),proposal.session);
};
