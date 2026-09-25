'use strict';
const assert=require('node:assert/strict');
async function checkDevelopment(page){
 const saved=await page.evaluate(()=>JSON.stringify(state));
 const ui=await page.evaluate(()=>({...developmentUI}));
 try{
  await page.evaluate(()=>{state.clubBrowser=null;deskNavigate('training');developmentUI.detail=false;developmentUI.drawer=null;developmentUI.tab='players';developmentReset();render()});
  const p=await page.evaluate(()=>{const p=managerRoster().find(p=>p.pos==='B'&&!p.academy);return {id:p.id,name:p.name}});
  await page.getByRole('combobox',{name:'Urval',exact:true}).selectOption('senior');
  await page.getByRole('searchbox',{name:'Sök spelare',exact:true}).fill(p.name);
  await page.locator('.dd-filters').getByRole('button',{name:'Sök',exact:true}).click();
  await page.locator('.dv-player-name').click();
  assert.equal(await page.locator('.dd-inspector h2').innerText(),p.name);
  assert.equal(await page.locator('dialog').count(),0);
  await page.getByRole('button',{name:'Ändra utvecklingsplan',exact:true}).click();
  assert.equal(await page.locator('#development-dialog').evaluate(el=>el.open),true);
  await page.getByRole('combobox',{name:'Träningsbelastning',exact:true}).selectOption('light');
  assert.equal(await page.evaluate(id=>managerRoster().find(p=>p.id===id).trainingLoad,p.id),'light');
  assert.equal(await page.locator('#development-dialog').evaluate(el=>el.contains(document.activeElement)),true);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#development-dialog').count(),0);
  assert.equal(await page.locator('#development-search').inputValue(),p.name);
  assert.equal(await page.evaluate(()=>document.activeElement?.className),'dv-player-name');
  await page.getByRole('button',{name:'Spelarprofil →',exact:true}).click();
  await page.evaluate(()=>deskBack());
  assert.equal(await page.locator('#development-search').inputValue(),p.name);
  await page.getByRole('combobox',{name:'Utvecklingsperiod',exact:true}).selectOption('30');
  assert.match(await page.locator('.dd-inspector').innerText(),/jämförelseunderlag saknas/);
  await page.getByRole('button',{name:'Rensa urval',exact:true}).click();
  await page.evaluate(()=>deskNavigate('juniors'));
  await page.getByRole('combobox',{name:'Urval',exact:true}).selectOption('u18');
  assert.equal(await page.evaluate(()=>developmentRows(true).every(r=>r.p.age<=18)),true);
  const junior=await page.evaluate(()=>developmentRows(true).find(r=>!isOwnPlayer(r.p)&&r.p.academy.path==='junior'&&!r.p.academy.loan)?.p.id);
  assert.ok(junior);await page.locator('#development-player-'+junior).click();
  await page.getByRole('button',{name:'Bjud in till A-träning',exact:true}).click();
  assert.equal(await page.evaluate(id=>juniorById(id).academy.path,junior),'guest');
  await page.getByRole('button',{name:'Ändra utvecklingsplan',exact:true}).click();
  await page.getByRole('combobox',{name:'Individuell träning',exact:true}).selectOption('light');
  await page.keyboard.press('Escape');
  await page.evaluate(id=>{const p=managerRoster().find(p=>p.id===id);p.health.injury={name:'Knäskada',remaining:0,initial:5,readiness:70,source:'Träning'};p.health.clearance='rest';deskNavigate('medical');developmentUI.medicalDetail=false;developmentMedicalReset();developmentSelect(id,'medical')},p.id);
  await page.getByRole('combobox',{name:'Urval',exact:true}).selectOption('rehab');
  await page.getByRole('button',{name:'Rehab & återgång',exact:true}).click();
  assert.equal(await page.getByRole('button',{name:'Full comeback',exact:true}).isDisabled(),true);
  await page.getByRole('button',{name:'Begränsad comeback',exact:true}).click();
  assert.equal(await page.evaluate(id=>managerRoster().find(p=>p.id===id).health.clearance,p.id),'limited');
  await page.keyboard.press('Escape');
  assert.match(await page.locator('.dd-inspector').innerText(),/Begränsad comeback/);
  await page.evaluate(()=>save());
  // Windows smoke shares its existing page; reboot is covered in the VM persistence suite.
  await page.evaluate(()=>deskNavigate('juniors'));
  assert.equal(await page.evaluate(id=>juniorById(id).trainingLoad,junior),'light');
  await page.getByRole('button',{name:'Kalender',exact:true}).click();
  assert.ok(await page.locator('.dd-workarea').innerText());
 }finally{
  await page.evaluate(({saved,ui})=>{state=JSON.parse(saved);Object.assign(developmentUI,ui);developmentUI.detail=false;developmentUI.juniorDetail=false;developmentUI.medicalDetail=false;developmentUI.drawer=null;render();save()}, {saved,ui});
 }
}
module.exports={checkDevelopment};
