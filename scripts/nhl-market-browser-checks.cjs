'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
async function checkNHLMarket(page,out){
 await page.evaluate(()=>{
  startCareerWithClub('HV71');state.calendar.date='2026-08-02';
  const p=state.juniors.roster.find(p=>p.pos==='B');p.age=19;
  p.nhlDraft={year:2026,club:'Seattle Kraken',expires:'2030-06-30'};
  for(const k of Object.keys(p.attributes))p.attributes[k]=13;
  p.health={load:0,injury:null,clearance:'rest'};playerSocialIdentity(p);p.social.ambition=15;
  const o=naOffer(p,managerClub());window.naSmokeOffer=o.id;window.naSmokeCash=state.money;
  deskNavigate('transfers','deals');
 });
 await page.locator('.na-market-desk summary').click();
 await page.getByRole('button',{name:'Hantera NHL-affärer och lån →',exact:true}).click();
 await page.getByRole('button',{name:'Godkänn för spelarbeslut',exact:true}).click();
 // The confirmation uses the same shared world drawer as other world actions.
 await page.getByRole('dialog').getByRole('button',{name:/Bekräfta/}).click();
 assert.equal(await page.evaluate(()=>state.northAmerica.offers.find(o=>o.id===window.naSmokeOffer).stage),'player');
 assert.equal(await page.evaluate(()=>state.money===window.naSmokeCash),true);
 assert.equal(await page.getByRole('button',{name:'Godkänn för spelarbeslut',exact:true}).count(),0);
 await page.evaluate(()=>{const o=state.northAmerica.offers.find(o=>o.id===window.naSmokeOffer);state.calendar.date=o.dueDate;naDay();render();});
 assert.equal(await page.evaluate(()=>state.northAmerica.offers.find(o=>o.id===window.naSmokeOffer).status),'signed');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true);
 await page.screenshot({path:path.join(out,'nhl-market-settlement.png'),fullPage:true});
 await page.evaluate(()=>deskNavigate('transfers','deals'));
 await page.locator('.na-market-desk summary').click();
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true);
 await page.screenshot({path:path.join(out,'nhl-market-recruitment.png'),fullPage:true});
}
module.exports={checkNHLMarket};
