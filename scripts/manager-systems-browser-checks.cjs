'use strict';
const assert=require('node:assert/strict');
async function checkManagerSystems(page){
 await page.evaluate(()=>{startCareerWithClub('HV71');deskNavigate('home');overviewSupport('staff')});
 await page.getByRole('combobox',{name:'Ansvar för A-lagets träning',exact:true}).selectOption('advise');
 assert.equal(await page.evaluate(()=>staffMode('training')),'advise');
 await page.getByRole('combobox',{name:'Ansvar för Juniorernas träning',exact:true}).selectOption('execute');
 assert.equal(await page.evaluate(()=>state.juniors.assistantOwner),'assistant');
 await page.evaluate(()=>managerOpenAgenda());
 await page.getByRole('heading',{name:'Ditt arbete i klubben',exact:true}).waitFor();
 await page.getByRole('button',{name:/^Planera [0-9]/}).click();
 const reminder=page.getByRole('button',{name:'Påminn om tre dagar',exact:true}).first();
 if(await reminder.count()){await reminder.click();await page.getByRole('button',{name:/^Väntar på [0-9]/}).click();await page.getByRole('button',{name:'Visa nu',exact:true}).first().click();}
 await page.evaluate(()=>{const p=managerRoster().find(p=>p.pos==='C');setDevelopmentRolePlan(p.id,'creator');developmentOpenPlan(p.id)});
 assert.equal(await page.evaluate(()=>managerRoster().find(p=>p.pos==='C').developmentReview.version),2);
 await page.evaluate(()=>deskNavigate('transfers','needs'));
 await page.getByText('Jämför alternativa lagbyggen',{exact:true}).click();
 const cash=await page.evaluate(()=>state.money);
 for(const name of ['+ Behåll stommen','+ Satsa på juniorerna','+ Värva spets'])await page.getByRole('button',{name,exact:true}).click();
 const salary=page.getByRole('spinbutton',{name:/Antagen årslön för/}).first();await salary.fill('1234567');await salary.press('Tab');
 assert.equal(await page.evaluate(()=>squadScenarioStore().plans.at(-1).rows[0].low),1234567);
 assert.equal(await page.evaluate(()=>state.money),cash);
 await page.getByRole('combobox',{name:'Jämför säsong',exact:true}).selectOption('3');
 await page.evaluate(()=>deskNavigate('finance'));
 await page.getByRole('button',{name:'Kassaflöde & framtid',exact:true}).click();
 assert.equal(await page.locator('.cashflow-panel table').first().locator('tbody tr').count(),12);
 await page.evaluate(()=>deskNavigate('world'));
 await page.getByRole('combobox',{name:'Följ klubb',exact:true}).selectOption('Färjestad BK');
 await page.getByRole('button',{name:'Följ klubben',exact:true}).click();
 await page.getByRole('button',{name:'Min bevakning',exact:true}).click();
 assert.ok(await page.evaluate(()=>worldWatchStore().clubs.includes('Färjestad BK')));
 await page.evaluate(()=>save());await page.reload();await page.getByRole('button',{name:/FORTSÄTT KARRIÄR/}).click();
 assert.equal(await page.evaluate(()=>squadScenarioStore().plans.length),3);
 assert.equal(await page.evaluate(()=>staffMode('training')),'advise');
 assert.ok(await page.evaluate(()=>worldWatchStore().clubs.includes('Färjestad BK')));
}
module.exports={checkManagerSystems};
