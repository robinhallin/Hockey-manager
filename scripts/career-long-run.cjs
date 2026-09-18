'use strict';
// Long-run background career: real calendar, finances, market, contracts and
// job decisions. Only rendering and per-click autosave are suppressed; a real
// save/load checkpoint is required every season. This is not a UI playthrough.
const assert=require('node:assert/strict');
const {boot}=require('./career-test-fixture.cjs');
const seasons=Number(process.env.CAREER_SEASONS||6);
assert.ok(Number.isInteger(seasons)&&seasons>=1&&seasons<=20);
const {headlessCareer}=require('./headless-career.cjs');
const resume=process.env.CAREER_RESUME?require('node:fs').readFileSync(process.env.CAREER_RESUME,'utf8'):null;
let app=headlessCareer(resume),r=app.run;
if(!resume)r("startCareerWithClub('HV71')");
const initialYear=r('state.season.year');
const quiet=()=>r(`globalThis.checkpointSave=save;save=()=>{};render=()=>{};
 globalThis.soakStore=localStorage.setItem;localStorage.setItem=(key,value)=>{
  if(value.length*2>5*1024*1024){const error=new Error('Test browser quota');error.name='QuotaExceededError';throw error;}
  soakStore(key,value);
 };`);
quiet();
const reports=[];
for(let year=0;year<seasons;year++){
 assert.equal(r('state.season.year'),initialYear+year,'Every completed season must advance exactly one year');
 if(year||r('state.season.phase')==='preseason'){
  // Accept offered jobs/renewals through the same public actions as a player.
  r(`if(!managerEmployed()){
   managerAcceptRenewal();
   for(let week=0;week<12&&!managerEmployed();week++){
    for(const j of [...state.managerCareer.jobs].filter(j=>j.status==='open').sort((a,b)=>a.min-b.min)){
     managerInterview(j.id);managerInterviewAnswer(state.managerCareer.identity);managerAcceptJob();if(managerEmployed())break;
    }
    if(!managerEmployed())managerJobWeek();
   }
  }`);
  assert.ok(r('managerEmployed()'),'No attainable job after twelve search weeks');
  // Renew at actual demands if affordable; otherwise release expired players.
  r(`for(const p of [...managerRoster()].filter(p=>p.contractYears<=0)){
   const w=renewalWishes(p);openContractNegotiation(p.id);submitContractRenewal(p.id,w.salary,w.minYears,w.role);
   if(p.contractYears<=0)releaseExpiredPlayer(p.id);
  }`);
  // Fill real vacancies using academy players, then affordable free agents.
  for(let day=0;day<140;day++){
   r(`for(const [group,target,pos] of [['MV',2,'MV'],['B',6,'B'],['F',12,'C']]){
    let missing=target-managerRoster().filter(p=>worldGroup(p)===group).length;
    for(const p of [...state.juniors.roster].filter(p=>worldGroup(p)===group&&!p.academy.loan)){
     if(missing<=0)break;const before=managerRoster().length;juniorPromote(p.id);missing-=managerRoster().length-before;
    }
    const pending=state.recruitment.deals.filter(d=>d.status==='pending'&&worldGroup(findPlayerAnywhere(d.playerId)||{})===group).length;
    if(missing>pending){
     const candidates=state.playerWorld.freeAgents.filter(p=>worldGroup(p)===group).sort((a,b)=>recruitPlayerWishes(a).salary-recruitPlayerWishes(b).salary);
     for(const p of candidates){const w=recruitPlayerWishes(p);const before=state.recruitment.deals.length;submitRecruitOffer(p.id,0,w.salary,w.minYears,w.role);if(state.recruitment.deals.length>before)break;}
    }
   }
   for(const d of state.recruitment.deals.filter(d=>d.status==='pending'&&d.counter))cancelRecruitOffer(d.id);
   if(state.calendar.date>=state.season.year+'-09-07')launchSeason();`);
   if(r('state.season.phase')==='regular')break;
   r('calendarStep()');
  }
  assert.equal(r('state.season.phase'),'regular',r('state.season.message'));
 }
 r(`for(state.round=1;state.round<=52;state.round++){
  {let days=0;while(state.calendar.date<calendarTarget()){if(++days>400)throw Error('Calendar failed to reach next fixture');calendarStep();}}
  for(const g of state.schedule.filter(g=>g.round===state.round)){
   leagueBackground(g);
   if(g.home===managerClub()||g.away===managerClub()){
    const old=state.live;state.live={finished:true};clubSettleMatch();state.live=old;
   }
  }
  calendarAfterFixture();if(state.round%13===0)console.log(JSON.stringify({progress:state.season.year,round:state.round,date:state.calendar.date}));
 }`);
 assert.equal(r('state.schedule.filter(g=>g.played&&g.statsRecorded).length'),728);
 assert.equal(r('state.teams.reduce((n,t)=>n+t.pts,0)'),2184);
 assert.equal(r('state.teams.reduce((n,t)=>n+t.gf,0)'),r('state.teams.reduce((n,t)=>n+t.ga,0)'));
 r(`enterPlayoffs();globalThis.turns=0;while(state.season.phase==='playoffs'&&turns++<100){{let days=0;while(state.calendar.date<calendarTarget()){if(++days>400)throw Error('Calendar failed to reach next fixture');calendarStep();}}for(const g of state.schedule.filter(g=>g.round===state.round&&g.seriesId&&!g.played))simulatePlayoffGame(g);finishPlayoffDay();}`);
 assert.equal(r('state.season.phase'),'review');
 const report=JSON.parse(r(`JSON.stringify({year:state.season.year,managerClub:managerClub(),status:state.managerCareer.status,decision:state.managerCareer.decision,clubs:Object.keys(state.clubRosters).map(club=>{
  const ps=state.clubRosters[club],cash=club===managerClub()?state.money:state.recruitment.ai[club]?.cash;
  return {club,cash,wages:loanWageCost(club),players:ps.length,youth:ps.filter(p=>p.age<=23).length,age:ps.reduce((n,p)=>n+p.age,0)/ps.length,strength:ps.reduce((n,p)=>n+matchAttributeRating(p),0)/ps.length,points:team(club)?.pts||0};
 }),transfers:state.recruitment.history.filter(h=>h.year===state.season.year).length})`));
 assert.ok(report.clubs.every(c=>Number.isFinite(c.cash)&&Number.isFinite(c.wages)&&c.players>=18),JSON.stringify(report));
 assert.equal(r('Object.entries(state.clubAI.clubs).filter(([c])=>c!==managerClub()).every(([club,c])=>state.recruitment.ai[club].cash===c.finance.opening+Object.values(c.finance.totals).reduce((n,v)=>n+v,0))'),true);
 r('managerRenew();beginPreseason();checkpointSave()');
 assert.ok(r('JSON.stringify(careerRead(localStorage.getItem("hockey_manager_alpha02")))')===r('JSON.stringify(state)'),'Checkpoint must save the current career, not leave an older one after quota failure');
 assert.doesNotThrow(()=>r('validateSaveText(saveExportText())'));
 const saved=app.storage.value;if(process.env.CAREER_CHECKPOINT)require('node:fs').writeFileSync(process.env.CAREER_CHECKPOINT,saved);const restored=boot(saved);const restoredState=restored.run('JSON.stringify(state)');r('state=JSON.parse('+JSON.stringify(restoredState)+')');
 const identities=r('[...Object.values(state.clubRosters).flat(),...state.playerWorld.freeAgents,...state.loans.external,...state.juniors.roster,...aiAcademyPlayers()].map(p=>String(p.id))');
 assert.equal(new Set(identities).size,identities.length);
 assert.ok(r('Object.values(state.clubRosters).flat().every(p=>Object.values(p.attributes).every(n=>Number.isFinite(n)&&n>=1&&n<=20))'));
 report.savedBytes=saved.length*2;assert.ok(report.savedBytes<5*1024*1024);
 reports.push(report);console.log(JSON.stringify({checkpoint:year+1,...report}));
}
console.log(JSON.stringify({passed:true,initialYear,seasons:reports.length,scope:'Background career, real contracts/jobs, no protected employment or contract extension; no browser UI',reports}));
