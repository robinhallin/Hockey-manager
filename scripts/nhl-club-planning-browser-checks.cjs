'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
async function checkNHLClubPlanning(page,out){
 const ids=await page.evaluate(()=>{
  startCareerWithClub('HV71');state.calendar.date='2026-08-02';
  const p=managerRoster().find(p=>p.pos==='B');p.age=19;p.nhlDraft={year:2026,club:'Seattle Kraken',expires:'2030-06-30'};
  for(const k of Object.keys(p.attributes))p.attributes[k]=13;
  p.health={load:0,injury:null,clearance:'rest'};playerSocialIdentity(p);p.social.ambition=15;p.social.loyalty=10;
  const candidate=getTransferMarketPlayers().find(q=>q.pos==='B'&&!naActive(q)&&!q.futureContract);state.recruitment.shortlist.push(candidate.id);
  window.clubPlanPlayer=p.id;window.clubPlanCandidate=candidate.id;naOffer(p,managerClub());deskNavigate('transfers','needs');return [String(p.id),String(candidate.id)];
 });
 const risk=page.locator(`[data-nhl-player="${ids[0]}"]`);
 await risk.getByRole('button',{name:'Förbered ersättarplan',exact:true}).click();
 await risk.locator('.na-career-talk summary').click();
 await risk.getByRole('button',{name:'Lova stöd för NHL-flytt',exact:true}).click();
 const plan=page.locator('.na-contingency');await plan.locator('summary').click();
 await plan.getByRole('button',{name:'Värva efter klar avgång',exact:true}).click();
 await plan.locator('summary').click();
 await plan.locator('select[name="candidate"]').selectOption(ids[1]);
 await plan.getByRole('button',{name:'Lägg till kandidat',exact:true}).click();
 await plan.locator('summary').click();
 assert.equal(await plan.getByRole('button',{name:'Granska ersättarbud',exact:true}).isDisabled(),true);
 await page.evaluate(()=>{const o=state.northAmerica.offers.find(o=>samePlayerId(o.playerId,window.clubPlanPlayer));naAnswer(o.id,'move');state.calendar.date=o.dueDate;naDay();deskNavigate('transfers','needs');});
 await plan.locator('summary').click();assert.match(await plan.innerText(),/Avgång klar/);
 assert.equal(await plan.getByRole('button',{name:'Granska ersättarbud',exact:true}).isEnabled(),true);
 assert.equal(await page.evaluate(()=>naFind(window.clubPlanPlayer).nhlCareerTalk.status),'met');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true);
 await page.screenshot({path:path.join(out,'nhl-club-replacement-plan.png'),fullPage:true});
 await plan.getByRole('button',{name:'Granska ersättarbud',exact:true}).click();
 assert.equal(await page.evaluate(()=>String(recruitHub.player)),ids[1]);assert.equal(await page.evaluate(()=>recruitHub.panel),'transfer');
 assert.equal(await page.getByRole('button',{name:'Skicka köpbud',exact:true}).count(),1);
}
module.exports={checkNHLClubPlanning};
