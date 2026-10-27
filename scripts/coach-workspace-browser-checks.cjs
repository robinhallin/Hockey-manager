'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
async function checkCoachWorkspace(page,out){
 await page.setViewportSize({width:1440,height:1000});
 await page.evaluate(()=>{clubhouseThemeUI.scene='illustrated';clubhouseRemember('scene','illustrated');startCareerWithClub('HV71');preseasonConfigure('balanced','manager','rotation','assistant','assistant');coachWorkspaceEnter();});
 await page.getByRole('heading',{name:'Din tränarvecka',exact:true}).waitFor();
 assert.equal(await page.locator('.sidebar').isVisible(),false);
 assert.equal(await page.getByRole('navigation',{name:'Spelets arbetsytor'}).count(),1);
 assert.equal(await page.locator('.desk-subnav,.ch-work-dialog,#ch-world').count(),0);
 for(const [width,height] of [[1920,1080],[1440,1000],[1366,768],[390,844]]){
  await page.setViewportSize({width,height});
  assert.ok(await page.locator('#coach-workspace').evaluate(el=>document.documentElement.scrollWidth<=window.innerWidth+2),'the workspace fits '+width);
  await page.screenshot({path:path.join(out,`90-tranaroversikt-${width}.png`),fullPage:true});
 }
 await page.setViewportSize({width:1440,height:1000});
 await page.keyboard.press('Control+k');
 await page.getByRole('searchbox',{name:'Spelare, klubb eller funktion'}).fill('budget');
 await page.locator('.desk-search-body').getByRole('button',{name:'Sök',exact:true}).click();
 assert.ok(await page.locator('.desk-search-body').isVisible());
 await page.getByRole('button',{name:'Stäng sökningen',exact:true}).click();
 const before=await page.evaluate(()=>JSON.stringify(state));
 const future=await page.evaluate(()=>calAdd(state.calendar.date,3));
 await page.locator(`.coach-days [data-date="${future}"]`).click();
 assert.equal(await page.evaluate(()=>JSON.stringify(state)),before,'selecting a future day is read only');
 await page.locator('.coach-day-detail').getByRole('combobox',{name:'Dagens träningspass'}).selectOption('powerplay');
 assert.equal(await page.evaluate(d=>state.calendar.plans[d].type,future),'powerplay');
 assert.equal(await page.evaluate(d=>state.training.history.some(h=>h.date===d),future),false);
 await page.screenshot({path:path.join(out,'91-planera-veckan.png'),fullPage:true});
 // Exercise all main surfaces through the same visible navigation, not the old shell.
 for(const [label,pageName] of [['Truppen','squad'],['Taktik','lines'],['Rekrytering','transfers'],['Klubben','board'],['Världen','world'],['Idag','home']]){
  await page.getByRole('navigation',{name:'Spelets arbetsytor'}).getByRole('button',{name:label,exact:true}).click();
  assert.equal(await page.evaluate(()=>state.page),pageName);
  assert.equal(await page.locator('#coach-workspace').count(),1);
  assert.equal(await page.locator('.sidebar').isVisible(),false);
  if(pageName==='lines')await page.screenshot({path:path.join(out,'92-taktik-i-samma-spel.png'),fullPage:true});
 }
 // The six actual preseason days stop at the registered fixture.
 const start=await page.evaluate(()=>state.calendar.date);
 for(let i=0;i<6;i++){
  const date=await page.evaluate(()=>state.calendar.date);
  await page.locator('.coach-header .coach-continue').click();
  await page.waitForFunction(d=>!dayTransition&&state.calendar.date!==d,date,{timeout:60000});
  assert.equal(await page.evaluate(()=>state.page),'home');
  assert.equal(await page.evaluate(d=>state.calendar.date===calAdd(d,1),date),true);
 }
 assert.equal(await page.evaluate(()=>state.calendar.date),'2026-08-07');
 assert.equal(await page.evaluate(d=>state.training.history.filter(h=>h.date>=d&&h.date<state.calendar.date).length,start),6);
 assert.equal(await page.evaluate(d=>state.training.history.find(h=>h.date===d).type,future),'powerplay');
 await page.screenshot({path:path.join(out,'93-riktigt-genomford-vecka.png'),fullPage:true});
 await page.locator('.coach-header .coach-continue').click();
 await page.locator('#cj-match-room[data-stage="locker"] .ct-matchroom-art').waitFor();
 assert.equal(await page.evaluate(()=>state.live.friendly),true);
 const matchDate=await page.evaluate(()=>state.calendar.date);
 await page.getByRole('button',{name:'Ge stöd',exact:true}).click();
 await page.getByRole('button',{name:/^Till matchbänken/}).click();
 assert.ok(await page.locator('#career-ice').isVisible());
 await page.screenshot({path:path.join(out,'94-fran-vecka-till-match.png'),fullPage:true});
 // Finish through the authoritative engine, including its real medical stops.
 await page.evaluate(()=>{let steps=0;while(!state.live.finished&&steps++<65000){if(!state.live.running){while(medicalPending())medicalDecisionAccept();startMatch();}studioStep();}if(!state.live.finished)throw Error('Friendly did not finish');render();});
 assert.equal(await page.evaluate(()=>state.calendar.date),matchDate);
 assert.equal(await page.evaluate(()=>state.calendar.completedMatchDate),matchDate);
 await page.evaluate(()=>coachHome());
 assert.ok(await page.getByRole('button',{name:'Granska matchrapporten →',exact:true}).isVisible());
 await page.screenshot({path:path.join(out,'95-uppfoljning-pa-kontoret.png'),fullPage:true});
 await page.getByRole('button',{name:'Granska matchrapporten →',exact:true}).click();
 assert.equal(await page.evaluate(()=>state.page),'statistics');
 await page.getByRole('navigation',{name:'Spelets arbetsytor'}).getByRole('button',{name:'Idag',exact:true}).click();
 await page.locator('.coach-header .coach-continue').click();
 await page.waitForFunction(d=>!dayTransition&&state.calendar.date!==d,matchDate,{timeout:60000});
 assert.equal(await page.evaluate(()=>state.page),'home');
 const saved=await page.evaluate(()=>{save();return {date:state.calendar.date,history:state.training.history.length,matches:state.analysis.matches.length};});
 await page.reload();await page.getByRole('button',{name:/FORTSÄTT KARRIÄR/}).click();
 assert.deepEqual(await page.evaluate(()=>({date:state.calendar.date,history:state.training.history.length,matches:state.analysis.matches.length})),saved);
 assert.equal(await page.locator('#coach-workspace').count(),1);
 await page.getByRole('button',{name:'Besök klubbhuset ↗',exact:true}).click();
 await page.locator('.ct-interior').waitFor();
 assert.equal(await page.getByRole('button',{name:'Utforska i 3D',exact:true}).count(),0);
 // Retain the old workspace save path without exposing another visual mode.
 await page.evaluate(()=>coachWorkspaceEnter());
 assert.equal(await page.evaluate(()=>state.page),'home');assert.equal(await page.locator('#coach-workspace').count(),1);
 // Required answers route to the same source message and never consume a day.
 const pending=await page.evaluate(()=>{managerMessage('coach-browser-required','Ditt verkliga svar','Du måste svara.','Spelare',{decisionType:'role'});render();return {id:pendingManagerDecision().id,date:state.calendar.date};});
 await page.locator('.coach-header .coach-continue').click();
 assert.equal(await page.evaluate(()=>pendingManagerDecision().id),pending.id);
 assert.equal(await page.evaluate(()=>state.calendar.date),pending.date);
 assert.equal(await page.evaluate(()=>state.training.selectedMessage),pending.id);
 assert.equal(await page.evaluate(()=>dayTransition),null);
 await page.evaluate(()=>{clubhouseThemeUI.scene='illustrated';clubhouseRemember('scene','illustrated');});
 console.log('PASS: coherent workspace, six actual days, planned training, complete friendly, real report, saved reload, optional rooms and mandatory answers.');
}
module.exports={checkCoachWorkspace};
