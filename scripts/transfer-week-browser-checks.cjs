'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
async function checkTransferWeek(page,out){
 await page.evaluate(()=>{
  startCareerWithClub('HV71');preseasonConfigure('balanced','manager','rotation','assistant','assistant');
  state.money=100000000;state.boardPlan.offer.wageLimit=100000000;state.season.nextWageLimit=100000000;
  const buyer='AIK',p=managerRoster().filter(p=>p.pos==='MV')[2];p.salary=250000;p.contractYears=3;p.age=28;for(const k in p.attributes)p.attributes[k]=15;
  for(const q of [...state.clubRosters[buyer]].filter(p=>p.pos==='MV')){state.clubRosters[buyer]=state.clubRosters[buyer].filter(p=>p!==q);worldRelease(q,buyer,'Controlled UI vacancy');}
  state.recruitment.ai[buyer].cash=100000000;state.recruitment.ai[buyer].wageLimit=100000000;
  const need=aiSquadNeeds(buyer).find(n=>n.role==='goalie'),w=recruitPlayerWishes(p,buyer);
  if(!aiSubmitMarket(buyer,p,need,'transfer',{fee:recruitFee(p),salary:w.salary*2,years:2,role:'Nyckelspelare'}))throw Error('No real incoming offer');
  const replacement=state.clubRosters[RECRUIT_CLUBS[0][0]][0];replacement.age=28;replacement.transferListed=true;
  const rw=recruitPlayerWishes(replacement);submitRecruitOffer(replacement.id,recruitSellerPosition(replacement,getPlayerClub(replacement.id)).fee,rw.salary*2,2,rw.role);
  officeOpenDeal('incoming:'+state.recruitment.incoming[0].id);
 });
 await page.locator('details.tw-link summary').click();
 await page.getByRole('button',{name:'Godkänn med ersättarvillkor',exact:true}).click();
 assert.equal(await page.evaluate(()=>state.recruitment.incoming[0].stage),'replacement_wait');
 await page.locator('section.tw-link').screenshot({path:path.join(out,'50-affarskedja.png')});
 await page.locator('.transfer-week').screenshot({path:path.join(out,'51-transfervecka.png')});
 await page.evaluate(()=>save());await page.reload();await page.getByRole('button',{name:/FORTSÄTT KARRIÄR/}).click();
 assert.equal(await page.evaluate(()=>state.recruitment.incoming[0].stage),'replacement_wait');
 await page.evaluate(()=>{calendarStep(true);calendarStep(true);});
 assert.equal(await page.evaluate(()=>state.recruitment.deals[0].status),'signed');
 assert.equal(await page.evaluate(()=>state.recruitment.incoming[0].stage),'club_agreed');
 assert.equal(await page.evaluate(()=>marketClub(state.recruitment.incoming[0].playerId)),'HV71');
 await page.evaluate(()=>calendarStep(true));
 assert.equal(await page.evaluate(()=>state.recruitment.incoming[0].status),'accepted');
 assert.equal(await page.evaluate(()=>marketClub(state.recruitment.incoming[0].playerId)),'AIK');
 await page.evaluate(()=>{
  const young=managerRoster().find(p=>p.age<=23&&!['MV','B'].includes(p.pos));journeyStart(young.id);
  const story=state.stories.active.find(s=>s.ids.includes(String(young.id)));storiesChoose(story.id,'promote');
  const free=state.playerWorld.freeAgents.find(p=>p.name==='Daniel Brodin'),w=recruitPlayerWishes(free);
  submitRecruitOffer(free.id,0,w.salary*2,Math.min(2,w.maxYears),w.role);calendarStep(true);calendarStep(true);deskNavigate('transfers','deals');
 });
 const reaction=page.locator('.tw-reactions article').filter({has:page.getByRole('button',{name:'Stå fast vid tidigare besked',exact:true})}).first();
 await reaction.screenshot({path:path.join(out,'52-spelarreaktion.png')});
 const id=await page.evaluate(()=>state.clubOffice.transferWeek.reactions.find(r=>r.kind==='competition'&&r.status==='open').id);
 await reaction.getByRole('button',{name:'Stå fast vid tidigare besked',exact:true}).click();
 assert.equal(await page.evaluate(id=>state.clubOffice.transferWeek.reactions.find(r=>r.id===id).response,id),'commitment');
 await page.evaluate(()=>save());await page.reload();await page.getByRole('button',{name:/FORTSÄTT KARRIÄR/}).click();
 assert.equal(await page.evaluate(id=>state.clubOffice.transferWeek.reactions.find(r=>r.id===id).response,id),'commitment');
 await page.evaluate(()=>deskNavigate('transfers','deals'));
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
 await page.screenshot({path:path.join(out,'53-transferkontoret.png'),fullPage:true});
}
module.exports={checkTransferWeek};
