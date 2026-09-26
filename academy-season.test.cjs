'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {boot}=require('./scripts/career-test-fixture.cjs');
function setup(){const a=boot();a.run("startCareerWithClub('HV71');state.money=1e9;state.boardPlan.offer.wageLimit=1e9;globalThis.p=state.juniors.roster.find(p=>p.pos==='B');");return a;}
const data=(a,s)=>JSON.parse(a.run('JSON.stringify('+s+')'));
test('full J20 season survives journal truncation, loans, senior promotion, reload and rollover',()=>{
 const a=setup(),r=a.run;
 r(`for(let round=1;round<=24;round++){state.calendar.date=juniorCalendarDates()[round-1].date;for(const q of state.juniors.roster)q.fatigue=0;juniorCalendarPlayRound(leagueOf(),round,state.calendar.date)}
 p=state.juniors.roster.slice().sort((a,b)=>(b.academy.leagueStats?.games||0)-(a.academy.leagueStats?.games||0)).find(p=>p.pos!=='MV');`);
 assert.equal(r('p.academy.history.length'),16);
 assert.ok(r('p.academy.leagueStats.games')>16);
 assert.equal(r('juniorSeasonRow(p,state.season.year).totals.junior.seconds'),r('p.academy.leagueStats.seconds'));
 assert.equal(r('juniorSeasonRow(p,state.season.year).totals.junior.goals'),r('p.academy.leagueStats.goals'));
 assert.ok(r('juniorSeasonRow(p,state.season.year).seconds>p.academy.history.reduce((n,h)=>n+h.seconds,0)'));
 r("p.fatigue=0;juniorLoan(p.id,'local');state.calendar.date=calAdd(state.calendar.date,4);juniorCalendarLoanAppearance(p,25,state.calendar.date);juniorRecall(p.id);juniorPromote(p.id);state.live={finished:true,iceTime:{[p.id]:1200},analysis:{players:{[p.id]:{goals:1,assists:2}}},opponent:'Testmotstånd'};state.round=30;juniorFixture(state.season.year+':30');juniorFixture(state.season.year+':30');state.live=null");
 assert.equal(r('juniorSeasonRow(p,state.season.year).totals.senior.seconds'),1200);
 assert.ok(r('juniorSeasonRow(p,state.season.year).totals.loan.seconds')>0);
 r('save()');assert.doesNotThrow(()=>r('validateSaveText(saveExportText())'));
 const id=r('p.id'),b=boot(a.storage.value),s=b.run;s(`globalThis.p=findPlayerAnywhere(${JSON.stringify(id)});state.season.phase='review';state.season.boardResult=[];globalThis.oldAge=p.age;globalThis.year=state.season.year;beginPreseason()`);
 const review=data(b,'state.juniors.annualReviews.find(r=>r.year===year)'),row=review.rows.find(p=>p.id===id);
 assert.equal(row.age,s('oldAge'),'report freezes before birthdays');assert.equal(row.totals.senior.seconds,1200);
 assert.equal(row.seconds,Object.values(row.totals).reduce((n,t)=>n+t.seconds,0));assert.equal(row.minutes,row.seconds/60);
 assert.equal(s('juniorSeasonRow(p,state.season.year).seconds'),0,'new season starts empty despite retained recent journal');
 const frozen=s('JSON.stringify(state.juniors.annualReviews)');s('p.attributes.positioning++;juniorAnnualReview(year);render();save()');assert.equal(s('JSON.stringify(state.juniors.annualReviews)'),frozen);
 assert.doesNotThrow(()=>s('validateSaveText(saveExportText())'));
 assert.equal(boot(b.storage.value).run('JSON.stringify(state.juniors.annualReviews)'),frozen);
 s("state.season.phase='regular';state.round=1;state.calendar.date=state.season.year+'-09-10';state.live={finished:true,iceTime:{[p.id]:600},analysis:{players:{[p.id]:{goals:0,assists:0}}},opponent:'Andra säsongen'};juniorFixture(state.season.year+':1');state.live=null;globalThis.nextReview=juniorAnnualReview(state.season.year)");
 assert.equal(s('nextReview.rows.find(q=>q.id===p.id).seconds'),600,'the second season contains only its own appearances');
 assert.equal(s('JSON.stringify(state.juniors.annualReviews.find(r=>r.year===year))'),JSON.stringify(review));

});
test('legacy 750 minutes are preserved with honest unclassified and partial evidence, not reduced to 240',()=>{
 const a=setup(),r=a.run;r("delete p.academy.seasons;delete p.academy.leagueStats;p.academy.seconds=45000;p.academy.games=50;p.academy.history=Array.from({length:16},()=>({year:2025,path:'junior',seconds:900}));ensureJuniors();globalThis.review=juniorAnnualReview(state.season.year)");
 assert.equal(r('review.rows.find(q=>q.id===p.id).minutes'),750);assert.equal(r('review.rows.find(q=>q.id===p.id).totals.unclassified.seconds'),45000);
 assert.equal(r('review.rows.find(q=>q.id===p.id).totals.senior.seconds'),0);assert.equal(r('review.rows.find(q=>q.id===p.id).partial'),true);
 assert.match(r('juniorAnnualReviewsView()'),/Ofullständigt äldre underlag/);
 r('save()');assert.doesNotThrow(()=>r('validateSaveText(saveExportText())'));
});
test('match exposure alone is not a breakthrough; role growth and meaningful repeated usage are required',()=>{
 const a=setup(),r=a.run;r("for(let i=0;i<5;i++)juniorSeasonRecord(p,'junior',{seconds:900,goals:0,assists:0},'controlled:'+i);globalThis.row=juniorSeasonRow(p,state.season.year)");
 assert.equal(r('row.growth'),0);assert.equal(r('juniorAnnualReview().breakthroughs.some(q=>q.id===p.id)'),false);
 // A separate season snapshot with evidence of actual role development.
 const b=setup(),s=b.run;s("globalThis.key=Object.keys(PLAYER_ROLES[p.academy.role])[0];p.attributes[key]+=2;for(let i=0;i<5;i++)juniorSeasonRecord(p,'junior',{seconds:900,goals:0,assists:0},'controlled:'+i)");
 assert.equal(s('juniorAnnualReview().breakthroughs.some(q=>q.id===p.id)'),true);
 const before=s('JSON.stringify(state)');assert.match(s('developmentJuniorHistory()'),/Akademins säsongsrapporter/);assert.equal(s('JSON.stringify(state)'),before,'view is read-only');
});
test('duplicate appearance, corrupt import and preserved legacy annual reports',()=>{
 const a=setup(),r=a.run;r("juniorSeasonRecord(p,'loan',{seconds:600,goals:1,assists:0},'loan:1');juniorSeasonRecord(p,'loan',{seconds:600,goals:1,assists:0},'loan:1')");assert.equal(r('juniorSeasonRow(p,state.season.year).seconds'),600);
 r('p.academy.seasons[0].totals.loan.seconds=-1');assert.throws(()=>r('validateSaveText(saveExportText())'),/säsongssummor/);
 r("p.academy.seasons[0].totals.loan.seconds=600;state.juniors.annualReviews=[{year:2025,total:20,breakthroughs:[],stalled:[],decisions:[]}]");
 assert.match(r('juniorAnnualReviewsView()'),/Äldre rapport/);assert.doesNotThrow(()=>r('validateSaveText(saveExportText())'));
});
