'use strict';
const assert=require('node:assert/strict');
// Shared interaction checks run in Chromium locally and the installed Windows app in CI.
async function checkTactics(page){
 const tab=name=>page.getByRole('navigation',{name:'Taktikarbetsyta'}).getByRole('button',{name,exact:true});
 await tab('5 mot 5').click();
 assert.equal(await page.locator('.tw-line[data-board]').count(),4);
 assert.equal(await page.locator('.tw-pair').count(),3);
 const original=await page.evaluate(()=>({lines:JSON.parse(JSON.stringify(state.lines)),selection:JSON.parse(JSON.stringify(state.matchSelection))}));
 const slot=(type,index)=>page.locator(`[data-lineup-slot="${type}-${index}"]`);
 await slot('forwards',0).dragTo(slot('forwards',9),{sourcePosition:{x:5,y:5},targetPosition:{x:5,y:5}});
 assert.equal(await page.evaluate(()=>state.lines.forwards[9]),original.lines.forwards[0]);
 assert.equal(await page.evaluate(()=>state.lines.forwards[0]),original.lines.forwards[9]);
 await page.getByRole('button',{name:'↶ Ångra',exact:true}).click();
 assert.deepEqual(await page.evaluate(()=>state.lines),original.lines);
 await slot('forwards',0).locator('.tw-pick').focus();await page.keyboard.press('Enter');
 await slot('forwards',9).locator('.tw-pick').focus();await page.keyboard.press('Enter');
 assert.equal(await page.evaluate(()=>state.lines.forwards[9]),original.lines.forwards[0]);
 await page.getByRole('button',{name:'↶ Ångra',exact:true}).click();
 await slot('forwards',0).locator('.multi-position').click();
 await page.locator('#tw-lineup-search').fill('no-such-player');
 assert.match(await page.locator('.tw-candidate-list').innerText(),/Inga spelare/);
 await page.locator('#tw-lineup-search').fill('');
 const reserve=await page.evaluate(()=>playerById(state.matchSelection.extras[0]));
 await page.locator('.tw-candidate[data-candidate-id="'+reserve.id+'"]').getByRole('button',{name:'Välj '+reserve.name,exact:true}).click();
 assert.equal(await page.evaluate(()=>state.lines.forwards[0]),reserve.id);
 assert.ok(await page.evaluate(id=>state.matchSelection.extras.includes(id),original.lines.forwards[0]));
 await page.getByRole('button',{name:'↶ Ångra',exact:true}).click();
 // A click on a name remains in the workspace; profile/back restores the exact selection.
 await slot('forwards',0).locator('.tw-pick').click();
 await page.getByRole('button',{name:'Öppna spelarprofil',exact:true}).click();
 assert.equal(await page.evaluate(()=>state.selectedPlayer),original.lines.forwards[0]);
 await page.goBack();await page.waitForSelector('.tactics-workspace');
 assert.equal(await page.evaluate(()=>lineupUI.player),original.lines.forwards[0]);
 await slot('forwards',9).locator('.tw-lock').click();
 await page.getByRole('button',{name:'Assistenten väljer laget',exact:true}).click();
 assert.equal(await page.evaluate(()=>state.lines.forwards[9]),original.lines.forwards[9]);
 assert.equal(await page.evaluate(()=>new Set([...state.lines.forwards,...state.lines.defense]).size),18);
 await page.getByRole('button',{name:'↶ Ångra',exact:true}).click();
 assert.deepEqual(await page.evaluate(()=>state.lines),original.lines);
 await slot('forwards',9).locator('.tw-lock').click();
 await tab('PP').click();
 assert.equal(await page.locator('.tw-rink[data-board]').count(),1);
 const before=await page.evaluate(()=>state.specialTeams.pp1.slice());
 await page.locator('[data-special-slot="pp1-0"]').dragTo(page.locator('[data-special-slot="pp1-3"]'),{sourcePosition:{x:5,y:5},targetPosition:{x:5,y:5}});
 assert.equal(await page.evaluate(()=>state.specialTeams.pp1[3]),before[0]);
 assert.equal(await page.evaluate(()=>state.specialTeams.pp1[0]),before[3]);
 await page.getByRole('button',{name:'↶ Ångra',exact:true}).click();
 assert.deepEqual(await page.evaluate(()=>state.specialTeams.pp1),before);
 await page.locator('.tw-unit').nth(1).click();assert.equal(await page.evaluate(()=>specialUI.unit),'pp2');
 await page.locator('[data-special-slot="pp2-3"] .tw-pick').click();
 assert.equal(await page.evaluate(()=>specialUI.slot),3);
 const candidate=await page.evaluate(()=>managerRoster().find(p=>p.pos!=='MV'&&medicalAvailable(p)&&!state.specialTeams.pp2.includes(p.id)));
 await page.locator('#tw-special-search').fill(candidate.name);
 await page.locator('[data-candidate-id="'+candidate.id+'"]').getByRole('button',{name:'Välj '+candidate.name,exact:true}).click();
 assert.equal(await page.evaluate(()=>state.specialTeams.pp2[3]),candidate.id);
 await page.getByRole('button',{name:'↶ Ångra',exact:true}).click();
 for(const [name,label,schemes] of [['PP','Powerplay',['oneThreeOne','umbrella','overload']],['BP','Boxplay',['box','diamond']]]){
  await tab(name).click();
  for(const scheme of schemes){
   await page.getByLabel(label+' uppställning',{exact:true}).selectOption(scheme);
   const overlaps=await page.locator('.tw-special-card').evaluateAll(els=>{const slots=els.map(el=>({id:el.id,r:el.getBoundingClientRect()}));return slots.flatMap((a,i)=>slots.slice(i+1).filter(b=>Math.min(a.r.right,b.r.right)>Math.max(a.r.left,b.r.left)+1&&Math.min(a.r.bottom,b.r.bottom)>Math.max(a.r.top,b.r.top)+1).map(b=>a.id+' / '+b.id));});
   assert.deepEqual(overlaps,[],'no overlapping cards in '+scheme);
  }
 }
 await page.getByLabel('Boxplay vid puckvinst',{exact:true}).selectOption('safe');
 assert.equal(await page.evaluate(()=>state.specialPlans.counter),'safe');
 await page.getByRole('button',{name:'Lagorder +',exact:true}).click();
 await page.getByLabel('Speltempo',{exact:true}).selectOption('high');assert.equal(await page.evaluate(()=>state.tacticalPlan.tempo),'high');
 await page.getByRole('button',{name:'↶ Ångra',exact:true}).click();
 assert.notEqual(await page.evaluate(()=>state.tacticalPlan.tempo),'high');
 await page.getByRole('button',{name:'Lagorder −',exact:true}).click();
 assert.ok(await page.locator('#content').evaluate(el=>el.scrollWidth<=el.clientWidth+1),'tactics workspace fits desktop width');
}
module.exports={checkTactics};
