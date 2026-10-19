'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {boot}=require('./scripts/career-test-fixture.cjs');
function start(){const a=boot(undefined,{production:true});a.run(`startCareerWithClub('HV71');globalThis.p=clubVisionCandidates('youth')[0];globalThis.sample=id=>({id,club:managerClub(),year:state.season.year,date:state.calendar.date,opponent:'Frölunda HC',finished:true,players:[{id:p.id,seconds:600,goals:1,assists:1}]});`);return a;}
test('a selected three-season project preserves money, contracts and actual lineup',()=>{
 const a=start(),r=a.run;r(`globalThis.before=JSON.stringify([state.money,p.salary,p.promisedRole,state.lines]);globalThis.started=clubVisionStart('youth',[p.id],'Vårt HV71')`);
 assert.equal(r('started'),true);assert.equal(r('JSON.stringify([state.money,p.salary,p.promisedRole,state.lines])'),r('before'));assert.equal(r('clubVision().endYear'),2028);
 assert.equal(r(`clubVisionStart('core',[p.id])`),false,'cannot replace an active long-term commitment');
 assert.match(r(`clubVisionImpact({id:'external',name:'Förstärkning',pos:p.pos})`),/Vårt HV71 påverkas/);
 assert.match(r(`clubVisionImpact(p,'departure')`),/En försäljning kan ändra/);
 const before=r('JSON.stringify(clubVision())');r('clubVisionSummary();clubVisionView()');assert.equal(r('JSON.stringify(clubVision())'),before);
 r('save()');assert.equal(boot(a.storage.value,{production:true}).run('clubVision().name'),'Vårt HV71');
});
test('each season measures real exposure once; next years require greater responsibility',()=>{
 const a=start(),r=a.run;r(`clubVisionStart('youth',[p.id]);state.season.phase='regular';globalThis.cash=state.money;globalThis.attributes=JSON.stringify(p.attributes);clubVisionAfterMatch({...sample('friendly'),friendly:true});clubVisionAfterMatch({...sample('partial'),partial:true})`);
 assert.equal(r('clubVisionYear().games'),0);
 for(let year=2026;year<=2028;year++){
  r(`state.season.year=${year};state.calendar.date='${year}-09-10';for(let i=0;i<14;i++){state.calendar.date=calAdd(state.calendar.date,1);clubVisionDay();}for(let i=0;i<24;i++)clubVisionAfterMatch(sample('vision-${year}-'+i));globalThis.before=JSON.stringify(clubVision());clubVisionAfterMatch(sample('vision-${year}-23'))`);
  assert.equal(r('JSON.stringify(clubVision())'),r('before'));
  assert.equal(r('clubVisionTarget()'),[6,12,18][year-2026]);r('clubVisionCloseYear()');
  assert.equal(r('clubVisionYear().result.met'),true);r('clubVisionCloseYear()');assert.equal(r('clubVision().years.length'),year-2025);
 }
 assert.equal(r('clubVision().status'),'complete');assert.equal(r('state.money'),r('cash'));assert.equal(r('JSON.stringify(p.attributes)'),r('attributes'));assert.doesNotThrow(()=>r('validateSaveText(saveExportText())'));
});
test('budget breaches, missing cohort members and unavailable players have distinct outcomes',()=>{
 const {run:r}=start();r(`clubVisionStart('youth',[p.id]);state.season.phase='regular';p.health.injury={remaining:60,initial:60,readiness:20};for(let i=0;i<15;i++)clubVisionAfterMatch(sample('injured-'+i))`);
 assert.equal(r('clubVisionYear().players[String(p.id)].eligible'),0);assert.equal(r('clubVisionYearResult().met'),null);
 r(`p.health.injury=null;state.boardPlan.offer.wageLimit=1;for(let i=0;i<14;i++){state.calendar.date=calAdd(state.calendar.date,1);clubVisionDay();}for(let i=0;i<15;i++)clubVisionAfterMatch(sample('fit-'+i))`);
 assert.equal(r('clubVisionYearResult().met'),false);assert.ok(r(`clubVision().alerts.some(a=>a.key.startsWith('budget:'))`));
 r(`state.clubRosters.HV71=state.clubRosters.HV71.filter(q=>q!==p);state.clubRosters.AIK.push(p);p.club='AIK';journeyDay();clubVisionDay();globalThis.count=clubVision().alerts.length;clubVisionDay()`);
 assert.equal(r('clubVision().alerts.length'),r('count'));assert.ok(r(`clubVision().alerts.some(a=>a.key.includes('departure:'))`));
});
test('projects remain with the employer; nested bank saves receive the same validation',()=>{
 const a=start(),r=a.run;r(`clubVisionStart('youth',[p.id]);globalThis.project=JSON.stringify(clubVision());managerStoreClub()`);
 assert.equal(r('JSON.stringify(state.managerCareer.bank.HV71.clubOffice.vision)'),r('project'));
 r(`state.managerCareer.bank.HV71.clubOffice.vision.players[0].id={bad:true}`);assert.throws(()=>r('validateSaveText(saveExportText())'),/Ogiltigt klubbbygge/);
});
test('old careers need no project and ending at a season boundary preserves the evidence',()=>{
 const {run:r}=start();assert.equal(r('clubVision()'),null);assert.doesNotThrow(()=>r('validateSaveText(saveExportText())'));
 r(`clubVisionStart('youth',[p.id]);state.season.phase='regular'`);assert.equal(r('clubVisionFinish()'),false);
 r(`state.season.phase='preseason';clubVisionFinish();clubVisionArchive()`);assert.equal(r('clubVision()'),null);assert.equal(r('state.clubOffice.visionArchive.length'),1);assert.equal(r('state.clubOffice.visionArchive[0].status'),'ended');
});
test('project outcomes affect the final board assessment and persist through the real season rollover',()=>{
 const a=start(),r=a.run;r(`clubVisionStart('youth',[p.id]);state.season.phase='regular';for(let i=0;i<14;i++){state.calendar.date=calAdd(state.calendar.date,1);clubVisionDay();}for(let i=0;i<12;i++)clubVisionAfterMatch(sample('final-'+i))`);
 assert.equal(r('clubVisionEvaluation(false,50).score'),50);assert.equal(r('clubVisionEvaluation(true,50).score'),55);
 r(`state.boardPlan.offer.wageLimit=1;state.calendar.date=calAdd(state.calendar.date,1);clubVisionDay()`);assert.equal(r('clubVisionEvaluation(true,50).score'),45);
 r(`state.boardPlan.offer.wageLimit=1e9;state.season.boardResult=boardProgress();state.season.standings=leagueTable();state.season.champion=managerClub();closeSeason();globalThis.memory=JSON.stringify(journeyPlayer(p.id));globalThis.project=clubVision().start;beginPreseason()`);
 assert.equal(r('state.season.year'),2027);assert.equal(r('clubVision().start'),r('project'));assert.equal(r('clubVision().years[0].finished'),true);assert.equal(r('JSON.stringify(journeyPlayer(p.id))'),r('memory'));assert.doesNotThrow(()=>r('validateSaveText(saveExportText())'));
});
