'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
async function checkAcademySeason(page,out){
 const saved=await page.evaluate(()=>({state:JSON.stringify(state),ui:{...developmentUI}}));
 try{
  // Controlled end-of-season fixture, using the actual J20 simulation and rollover.
  const expected=await page.evaluate(()=>{
   state.season.phase='regular';ensureJuniorCalendar();
   for(let round=1;round<=24;round++){state.calendar.date=juniorCalendarDates()[round-1].date;for(const p of state.juniors.roster)p.fatigue=0;juniorCalendarPlayRound(leagueOf(),round,state.calendar.date)}
   const p=state.juniors.roster.slice().sort((a,b)=>(b.academy.leagueStats?.seconds||0)-(a.academy.leagueStats?.seconds||0))[0],seconds=p.academy.leagueStats.seconds,id=p.id;
   state.season.phase='review';state.season.boardResult=[];beginPreseason();juniorOpenWorkspace('history');
   return {id,minutes:Math.round(seconds/60),year:state.season.year-1,report:JSON.stringify(state.juniors.annualReviews[0])};
  });
  await page.getByRole('heading',{name:'Akademins säsongsrapporter',exact:true}).waitFor();
  await page.locator('.academy-annual > details > summary').first().click();
  assert.equal(await page.locator(`[data-academy-id="${expected.id}"] [data-academy-total]`).innerText(),String(expected.minutes));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true);
  await page.screenshot({path:path.join(out,'academy-season-report.png'),fullPage:true});
  await page.evaluate(()=>save());await page.reload();await page.getByRole('button',{name:/FORTSÄTT KARRIÄR/i}).click();
  assert.equal(await page.evaluate(()=>JSON.stringify(state.juniors.annualReviews[0])),expected.report);
  await page.evaluate(()=>juniorOpenWorkspace('history'));
  await page.locator('.academy-annual > details > summary').first().click();
  assert.equal(await page.locator(`[data-academy-id="${expected.id}"] [data-academy-total]`).innerText(),String(expected.minutes));
 }finally{await page.evaluate(saved=>{state=JSON.parse(saved.state);Object.assign(developmentUI,saved.ui);save();render()},saved);}
}
module.exports={checkAcademySeason};
