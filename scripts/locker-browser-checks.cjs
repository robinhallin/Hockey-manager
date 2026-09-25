'use strict';
const assert=require('node:assert/strict');
// Shared by the local browser runner and the installed Windows desktop smoke test.
async function checkLocker(page){
 await page.evaluate(()=>{ensureLines();depthSelection();state.clubBrowser=null;deskNavigate('locker');lockerReset();lockerSet('tab','situation')});
 const tab=name=>page.getByRole('navigation',{name:'Omklädningsrummets vyer'}).getByRole('button',{name,exact:true});
 const original=await page.evaluate(()=>JSON.stringify(state));
 const roster=await page.evaluate(()=>managerRoster().map(p=>({id:p.id,name:p.name}))),p=roster.at(-1);
 await page.getByRole('searchbox',{name:'Sök i omklädningsrummet'}).fill(p.name);
 assert.equal(await page.locator('[data-locker-player]').count(),1);
 await page.locator('[data-locker-player="'+p.id+'"]').getByRole('button').click();
 assert.equal(await page.evaluate(()=>lockerUI.player),p.id);
 await page.getByRole('searchbox',{name:'Sök i omklädningsrummet'}).fill('no-such-player');
 assert.match(await page.locator('.ld-inspector').innerText(),/ingår inte i aktuellt urval/);
 assert.match(await page.locator('.ld-roster').innerText(),/Inga spelare/);
 await page.getByRole('button',{name:'Återställ',exact:true}).click();
 await page.locator('#locker-sort-name').click();
 const ascending=await page.locator('[data-locker-player] th strong').allTextContents();
 await page.locator('#locker-sort-name').click();
 assert.deepEqual(await page.locator('[data-locker-player] th strong').allTextContents(),ascending.reverse());
 await page.getByRole('combobox',{name:'Roll i gruppen'}).selectOption('captain');
 assert.equal(await page.locator('[data-locker-player]').count(),1);
 await page.getByRole('button',{name:'Återställ',exact:true}).click();
 const scroller=page.locator('#locker-scroll');await scroller.evaluate(el=>{el.scrollTop=130;el.dispatchEvent(new Event('scroll'))});
 const scroll=await scroller.evaluate(el=>el.scrollTop);
 await page.getByRole('button',{name:'Spelarprofil →',exact:true}).click();
 assert.equal(await page.evaluate(()=>state.selectedPlayer),p.id);
 await page.goBack();await page.waitForSelector('.locker-desk');
 assert.equal(await page.evaluate(()=>lockerUI.player),p.id);
 assert.equal(await page.locator('#locker-scroll').evaluate(el=>el.scrollTop),scroll);
 await tab('Roller & ledarskap').click();
 await page.getByRole('button',{name:'Relationer & faddrar',exact:true}).click();
 assert.match(await page.locator('.ld-content').innerText(),/Nya i gruppen/);
 await tab('Löften & samtal').click();
 await page.getByRole('button',{name:'Samtal & beslut',exact:true}).click();
 await tab('Läget i gruppen').click();
 // Presentation must not change any career data (navigation metadata is UI-only).
 assert.deepEqual(await page.evaluate(()=>{const s=JSON.parse(JSON.stringify(state));delete s.page;delete s.selectedPlayer;return s}),(()=>{const s=JSON.parse(original);delete s.page;delete s.selectedPlayer;return s})());
 await page.getByRole('button',{name:'Prata med spelaren',exact:true}).click();
 await page.locator('#locker-dialog[open]').waitFor();
 await page.keyboard.press('Escape');
 assert.equal(await page.locator('#locker-dialog').count(),0);
 assert.equal(await page.evaluate(()=>document.activeElement.id),'locker-talk');
 // Exercise a genuine conversation and its anti-repeat guard, then restore the
 // career so this helper can run inside the wider desktop smoke scenario.
 const saved=await page.evaluate(()=>JSON.stringify(state));
 await page.evaluate(id=>{const p=managerRoster().find(p=>p.id===id);state.live=null;p.social.trust=40;p.social.lastTalk=-100;p.social.missed=0;render()},p.id);
 await page.getByRole('button',{name:'Prata med spelaren',exact:true}).click();
 await page.locator('#locker-dialog').getByRole('button',{name:'Lyssna på spelaren',exact:true}).click();
 assert.equal(await page.evaluate(id=>managerRoster().find(p=>p.id===id).social.trust,p.id),43);
 assert.equal(await page.locator('#locker-dialog').getByRole('button',{name:'Lyssna på spelaren',exact:true}).isDisabled(),true);
 assert.match(await page.locator('#locker-dialog').innerText(),/3 matcher kvar/);
 await page.getByRole('button',{name:'Stäng dialogen',exact:true}).click();
 assert.match(await page.locator('.ld-notice').innerText(),/./);
 await tab('Löften & samtal').click();await page.getByRole('button',{name:'Samtal & beslut',exact:true}).click();
 assert.match(await page.locator('.ld-history').innerText(),new RegExp(p.name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));

 await page.evaluate(id=>{const p=managerRoster().find(p=>p.id===id);managerMessage('locker-browser-promise','En fråga om rollen','Kan jag få mer istid?','Spelarsamtal',{playerId:p.id,decisionType:'minutes'});lockerSet('tab','situation')},p.id);
 await page.locator('.ld-attention').getByRole('button',{name:'Svara på samtalet →',exact:true}).click();
 assert.equal(await page.evaluate(()=>state.page),'inbox');
 await page.getByRole('button',{name:'Jag lovar dig mer istid',exact:true}).click();
 await page.evaluate(()=>deskNavigate('locker'));
 await tab('Löften & samtal').click();
 assert.match(await page.locator('.ld-content').innerText(),/minst 15 minuter/);
 await page.locator('.ld-attention').getByRole('button',{name:'Följ upp löftet →',exact:true}).click();
 assert.match(await page.locator('#locker-dialog').innerText(),/3 matcher/);
 await page.getByRole('button',{name:'Stäng dialogen',exact:true}).click();
 await tab('Roller & ledarskap').click();await page.getByRole('button',{name:'Utse kapten',exact:true}).click();
 const captainId=await page.evaluate(()=>state.locker.captainId),newCaptain=roster.find(x=>x.id!==captainId);
 await page.locator('#locker-dialog select[name=captain]').selectOption(String(newCaptain.id));
 await page.locator('#locker-dialog').getByRole('button',{name:'Utse kapten',exact:true}).click();
 assert.equal(await page.evaluate(()=>state.locker.captainId),newCaptain.id);
 assert.equal(await page.locator('#locker-dialog').getByRole('button',{name:'Utse kapten',exact:true}).isDisabled(),true);
 await page.getByRole('button',{name:'Stäng dialogen',exact:true}).click();
 await page.evaluate(saved=>{state=JSON.parse(saved);lockerUI.detail=null;lockerUI.tab='situation';lockerReset();save()},saved);
}
module.exports={checkLocker};
