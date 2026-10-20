'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
async function checkCoachJourney(page,out){
 await page.setViewportSize({width:1440,height:1000});
 const p=await page.evaluate(()=>{
  startCareerWithClub('HV71');preseasonConfigure('balanced','manager','rotation','manager','assistant');ensureLines();clubhouseGo('locker');
  const p=managerRoster().find(p=>p.pos==='C'&&p.age<=23&&medicalReady(p)&&!playerLoan(p));return {id:String(p.id),name:p.name};
 });
 await page.locator('#clubhouse-canvas[data-room="locker"][data-ready="true"]').waitFor();
 await page.locator(`[data-clubhouse-player="${p.id}"]`).click();
 await page.getByRole('button',{name:/^Diskutera en provperiod/}).click();
 assert.ok(await page.getByRole('heading',{name:'Vilket besked ger du?'}).isVisible());
 await page.getByRole('button',{name:/^Ge en riktig provperiod/}).count().then(async n=>{
  if(n)await page.getByRole('button',{name:/^Ge en riktig provperiod/}).click();
  else{const label=await page.evaluate(()=>storiesChoices(coachJourneyStories().find(s=>s.id===coachJourneyUI.story)).find(c=>c.id==='promote').label);await page.getByRole('button',{name:new RegExp('^'+label)}).click();}
 });
 assert.equal(await page.evaluate(()=>coachJourneyStories().find(s=>s.id===coachJourneyUI.story).status),'following');
 await page.screenshot({path:path.join(out,'80-en-spelarhistoria-i-rummet.png'),fullPage:true});
 await page.getByRole('button',{name:'Stäng spelarens eller rummets panel',exact:true}).click();
 await page.evaluate(()=>clubhouseGo('office'));
 await page.getByRole('button',{name:'Taktiktavlan Kedjor & matchplan',exact:true}).click();
 assert.ok(await page.getByRole('region',{name:'Tränarens taktiktavla'}).isVisible());
 const ids=await page.evaluate(()=>state.lines.forwards.slice(0,2).map(String));
 await page.locator('[data-lineup-slot="forwards-0"] .tw-pick').click();
 await page.locator('[data-lineup-slot="forwards-1"] .tw-pick').click();
 assert.deepEqual(await page.evaluate(()=>state.lines.forwards.slice(0,2).map(String)),ids.slice().reverse());
 await page.getByRole('button',{name:'↶ Ångra',exact:true}).click();assert.deepEqual(await page.evaluate(()=>state.lines.forwards.slice(0,2).map(String)),ids);
 await page.screenshot({path:path.join(out,'81-taktiktavlans-magneter.png'),fullPage:true});
 await page.getByRole('button',{name:'← Tillbaka till tränarkontoret',exact:true}).click();
 await page.evaluate(()=>{state.calendar.date=calendarTarget();clubhouseGo('office');});
 await page.getByRole('button',{name:/^Samla matchlaget/}).click();
 assert.equal(await page.evaluate(()=>state.live.friendly),true);
 await page.locator('#cj-match-room[data-stage="locker"] #clubhouse-canvas[data-ready="true"]').waitFor();
 const original=await page.evaluate(()=>JSON.stringify([state.calendar.date,state.live.broadcast,state.lines]));
 await page.getByRole('button',{name:'Ge stöd',exact:true}).click();
 assert.ok(await page.evaluate(()=>state.live.socialTalks.p1.reactions.length)>15);
 await page.getByRole('combobox',{name:'Följ en spelares reaktion'}).selectOption(p.id);
 assert.ok(await page.locator('.cj-selected-reaction').isVisible());
 await page.screenshot({path:path.join(out,'82-lagsnack-och-individuella-reaktioner.png'),fullPage:true});
 await page.getByRole('button',{name:/^Gå mot isen/}).click();
 await page.locator('#clubhouse-canvas[data-room="tunnel"][data-ready="true"]').waitFor();
 assert.equal(await page.evaluate(()=>ClubhouseScene.diagnostics().room),'tunnel');
 await page.screenshot({path:path.join(out,'83-spelartunneln.png'),fullPage:true});
 assert.equal(await page.evaluate(()=>JSON.stringify([state.calendar.date,state.live.broadcast,state.lines])),original,'presentation and talk never move the match clock or lineup');
 await page.getByRole('button',{name:/^Ta plats i båset/}).click();
 assert.ok(await page.locator('.cj-bench #career-ice-3d').isVisible());
 assert.equal(await page.getByRole('combobox',{name:'3D-kamera'}).inputValue(),'bench');
 await page.waitForFunction(()=>Match3D.diagnostics()?.frames>2);
 for(const [width,height] of [[1440,1000],[1366,768]]){
  await page.setViewportSize({width,height});
  const boxes=await page.locator('#career-ice-3d, #match-play, .mc-result').evaluateAll(ns=>ns.map(n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};}));
  assert.ok(boxes.every(r=>r.width>0&&r.height>0&&r.x>=0&&r.right<=width+2&&r.y>=0&&r.bottom<=height+2),'rink, score and playback stay inside the viewport');
  await page.screenshot({path:path.join(out,`84-tranarbass-${width}.png`),fullPage:true});
 }
 await page.getByRole('button',{name:'▶ Starta matchen',exact:true}).click();
 await page.waitForFunction(()=>analysisClock()>3);
 await page.getByRole('button',{name:'Ⅱ Pausa',exact:true}).click();
 const clock=await page.evaluate(()=>analysisClock());await page.waitForFunction(()=>Match3D.diagnostics()?.frames>5);assert.equal(await page.evaluate(()=>analysisClock()),clock);
 await page.getByRole('navigation',{name:'Matchdagens väg'}).getByRole('button',{name:/Omklädningsrum/}).click();
 assert.equal(await page.getByRole('button',{name:'Ge stöd',exact:true}).count(),0,'midperiod visit cannot repeat the team talk');
 await page.getByRole('button',{name:'Till matchvyn direkt ↗',exact:true}).click();
 await page.evaluate(()=>{
  let n=0;while(!state.live.finished&&n++<65000){if(!state.live.running){while(medicalPending())medicalDecisionAccept();startMatch();}studioStep();}
  if(!state.live.finished)throw Error('Coach journey match failed to finish');render();
 });
 assert.equal(await page.evaluate(()=>coachJourneyStage()),'locker');
 assert.ok(await page.getByRole('heading',{name:'Efter slutsignalen',exact:true}).isVisible());
 await page.getByRole('button',{name:'Beröm insatsen',exact:true}).click();
 await page.screenshot({path:path.join(out,'85-eftersnack-i-omkladningsrummet.png'),fullPage:true});
 await page.getByRole('button',{name:/^Öppna matchrapporten/}).click();assert.equal(await page.evaluate(()=>matchDesk.tab),'report');
 const saved=await page.evaluate(()=>{save();return {opponent:state.live.opponent,talk:state.live.socialTalks.post.kind,story:state.stories.active.find(s=>s.ids.includes(String(coachJourneyUI.player)))?.id};});
 await page.reload();await page.getByRole('button',{name:/FORTSÄTT KARRIÄR/}).click();
 assert.equal(await page.evaluate(()=>state.live.socialTalks.post.kind),saved.talk);
 assert.equal(await page.evaluate(()=>state.live.opponent),saved.opponent);
 await page.evaluate(()=>{clubhouseGo('locker');});await page.setViewportSize({width:390,height:844});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true);
 await page.screenshot({path:path.join(out,'86-levande-lag-mobil.png'),fullPage:true});
 await page.setViewportSize({width:1440,height:1000});
}
module.exports={checkCoachJourney};
