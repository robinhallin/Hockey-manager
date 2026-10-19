'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
async function checkPersonalMatch(page,out){
 const setup=await page.evaluate(()=>{
  startCareerWithClub('HV71');preseasonConfigure('balanced','manager','rotation','manager','assistant');
  const young=managerRoster().find(p=>p.age<=23&&p.pos==='C'&&medicalReady(p));journeyStart(young.id);
  const story=state.stories.active.find(s=>s.ids.includes(String(young.id)));storiesChoose(story.id,'promote');
  changeLinePlayer('forwards',10,young.id);for(const p of managerRoster())p.fatigue=5;
  const starter=playerById(state.lines.forwards[1]);starter.fatigue=70;deskNavigate('home');
  const d=personalMatchDilemma();return {young:String(young.id),starter:String(starter.id),candidate:String(d.candidate.id),type:d.slot.type,index:d.slot.index,promise:JSON.stringify(story.expectation)};
 });
 assert.equal(setup.candidate,setup.young);
 await page.locator('.personal-match-panel').screenshot({path:path.join(out,'60-personlig-matchhistoria.png')});
 await page.getByRole('button',{name:'Granska assistentens två alternativ →',exact:true}).click();
 await page.locator('.personal-match-dilemma').screenshot({path:path.join(out,'61-uttagning-tva-alternativ.png')});
 await page.getByRole('button',{name:'Behåll nuvarande spelare',exact:true}).click();
 assert.equal(await page.evaluate(s=>String(tacticsId(s.type,s.index)),setup),setup.starter);
 await page.getByRole('button',{name:'Välj ersättaren på platsen',exact:true}).click();
 assert.equal(await page.evaluate(s=>String(tacticsId(s.type,s.index)),setup),setup.young);
 assert.equal(await page.evaluate(()=>state.clubOffice.personalMatch.choice.choice),'rotate');
 await page.evaluate(()=>save());await page.reload();await page.getByRole('button',{name:/FORTSÄTT KARRIÄR/}).click();
 assert.equal(await page.evaluate(()=>state.clubOffice.personalMatch.choice.choice),'rotate');
 await page.evaluate(()=>{
  const f=state.calendar.friendlies.filter(f=>f.club===managerClub()&&!f.played).sort((a,b)=>a.date.localeCompare(b.date))[0];state.calendar.date=f.date;calendarPlayFriendly(f.id);
  let steps=0;while(!state.live.finished&&steps++<65000){if(!state.live.running){while(medicalPending())medicalDecisionAccept();startMatch();}studioStep();}
  if(!state.live.finished)throw Error('Friendly did not finish');render();
 });
 const result=await page.evaluate(id=>{
  const m=state.analysis.matches[0],s=state.stories.active.find(s=>s.ids.includes(id));
  return {friendly:m.friendly,outcome:m.personalOutcome,eligible:s.expectation.eligible,place:m.personalMatch.subjects.find(p=>p.id===id).place};
 },setup.young);
 assert.equal(result.friendly,true);assert.ok(result.outcome);assert.equal(result.eligible,0);assert.equal(result.place,'Kedja 1');
 assert.match(result.outcome.note,/Träningsmatch/);
 await page.locator('.personal-match-result').first().screenshot({path:path.join(out,'62-valets-faktiska-utfall.png')});
 await page.evaluate(()=>{save();deskNavigate('home');});
 await page.locator('.personal-match-panel').screenshot({path:path.join(out,'63-nasta-kapitel.png')});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
 await page.evaluate(()=>save());await page.reload();await page.getByRole('button',{name:/FORTSÄTT KARRIÄR/}).click();
 assert.ok(await page.evaluate(()=>state.analysis.matches[0].personalOutcome));
 assert.ok(await page.evaluate(id=>journeyPlayer(id).events.some(e=>e.title==='Ditt val i träningsmatchen'),setup.young));
}
module.exports={checkPersonalMatch};
