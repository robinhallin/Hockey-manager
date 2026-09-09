const assert=require('node:assert/strict');
const {boot}=require('./scripts/career-test-fixture.cjs');
function game(){const app=boot();app.run('startCareerWithClub("HV71")');return app;}
function identities(app){return app.run('JSON.stringify([...Object.values(state.clubRosters).flat(),...state.playerWorld.freeAgents,...state.loans.external,...state.juniors.roster,...aiAcademyPlayers()].map(p=>String(p.id)).sort())');}

// Migration adds a persistent academy without changing a senior, a score or cash.
{
 const a=game(),r=a.run;
 r('globalThis.before=JSON.stringify([state.clubRosters,state.teams,state.money]);delete state.clubAI;ensureClubAI();');
 assert.equal(r('JSON.stringify([state.clubRosters,state.teams,state.money])'),r('before'));
 assert.equal(r('Object.keys(state.clubAI.clubs).length'),28);
 assert.equal(r('aiAcademyPlayers().length'),27*14);
 r('globalThis.stable=JSON.stringify(state.clubAI);ensureClubAI();rivalsOpen(null);render();render()');
 assert.equal(r('JSON.stringify(state.clubAI)'),r('stable'),'views cannot advance decisions or reroll academy players');
 const ids=identities(a);r('save()');const loaded=boot(a.storage.value);
 assert.equal(identities(loaded),ids);assert.equal(loaded.run('JSON.stringify(state.clubAI)'),r('stable'));
 assert.doesNotThrow(()=>r('validateSaveText(saveExportText())'));
 r('globalThis.bad=JSON.parse(saveExportText());bad.career.clubAI.clubs["Färjestad BK"].academy.roster[0].id=bad.career.clubRosters["HV71"][0].id');
 assert.throws(()=>r('validateSaveText(JSON.stringify(bad))'),/identiteter/);
}

// Positional shortfalls and next-year vacancies are different decisions.
{
 const {run:r}=game();
 r('globalThis.testClub="Färjestad BK";globalThis.natural=aiSquadNeeds(testClub).find(n=>n.role==="center").count;');
 assert.ok(r('natural')>=4);
 r('for(const p of state.clubRosters[testClub].filter(p=>worldGroup(p)==="F")){p.pos="VF";p.positions=[];p.position="LW";if(p.research)p.research={...p.research,position:"LW"};}');
 assert.equal(r('aiSquadNeeds(testClub).find(n=>n.role==="center").count'),0);
 assert.equal(r('aiSquadNeeds(testClub)[0].role'),'center');
 r('for(const p of state.clubRosters[testClub])p.contractYears=1;');
 assert.ok(r('aiSquadNeeds(testClub).find(n=>n.role==="forward").futureNeed')>0);
 r('globalThis.futureBefore=aiSquadNeeds(testClub).find(n=>n.role==="forward").futureNeed;globalThis.arrival=state.clubRosters["Luleå Hockey"].find(p=>worldGroup(p)==="F"&&!playerLoan(p));arrival.futureContract={buyer:testClub,seller:"Luleå Hockey",joinYear:2027,salary:arrival.salary,years:2,role:"Ordinarie"};');
 assert.equal(r('aiSquadNeeds(testClub).find(n=>n.role==="forward").futureNeed'),r('futureBefore-1'));
}

// Graduates cannot fill the final slots needed to replace retired goalkeepers.
{
 const {run:r}=game();
 r(`globalThis.testClub='Färjestad BK';globalThis.roster=state.clubRosters[testClub];
  for(const p of [...roster].filter(p=>p.pos==='MV')){roster.splice(roster.indexOf(p),1);worldRelease(p,testClub,'Controlled retirement vacancies');}
  while(roster.length<28)roster.push(worldProspect(testClub,'VF'));
  state.recruitment.ai[testClub].cash=100000000;state.recruitment.ai[testClub].wageLimit=100000000;
  globalThis.graduate=clubAIState(testClub).academy.roster.find(p=>p.pos==='VF');`);
 assert.equal(r('aiPromote(testClub,graduate,"Seniorålder")'),false);
 assert.equal(r('aiCanCommit(testClub,state.playerWorld.freeAgents.find(p=>worldGroup(p)==="F"),0,250000)'),false);
 r('worldFillClub(testClub)');
 assert.equal(r('roster.length'),30);
 assert.equal(r('roster.filter(p=>p.pos==="MV").length'),2);
}

// PP/PK use natural defensive slots, including a penalty to a selected specialist.
{
 const {run:r}=game();
 for(const club of r('Object.keys(state.world.membership)')){
  r(`globalThis.selection=rivalLineup(${JSON.stringify(club)});globalThis.pool=state.clubRosters[${JSON.stringify(club)}];`);
  for(const key of ['pp1','pp2','pk1','pk2']){
   assert.equal(r(`new Set(selection.${key}.map(String)).size`),key.startsWith('pp')?5:4);
   assert.equal(r(`selection.${key}.every(id=>pool.some(p=>samePlayerId(id,p.id)&&medicalReady(p)))`),true);
   assert.equal(r(`selection.${key}.slice(0,${key.startsWith('pk')?2:1}).every(id=>pool.find(p=>samePlayerId(id,p.id)).pos==='B')`),true);
  }
 }
 r('state.calendar.date=calendarTarget();startMatch();globalThis.e=studioEngine();e.givePenalty(1,e.skaters(1)[4].player.name);');
 assert.equal(r('e.unit(1).filter(a=>["LD","RD"].includes(a.role)).every(a=>a.player.pos==="B")'),true);
 assert.equal(r('e.unit(1).some(a=>e.penalties.some(p=>samePlayerId(p.playerId,a.player.id)))'),false);
 r('while(e.penalties.length)e.endPenalty(true);e.givePenalty(0,e.skaters(0)[0].player.name);');
 assert.equal(r('e.unit(1).length'),5);
 r('globalThis.savedAI=JSON.stringify(state.live.aiTeam);save()');
}

// Opponent history changes the next plan; identical context gives the same coaching decision.
{
 const {run:r}=game();
 r('globalThis.testClub="Färjestad BK";rivalsClubState(testClub).coach.style="control";rivalsClubState(testClub).coach.adaptability=18;globalThis.initial=rivalPlan(testClub,"HV71").style;clubAIState(testClub).memory.HV71={meetings:[{gf:1,ga:4,shots:18,againstShots:36,opponentStyle:"pressure"},{gf:2,ga:5,shots:20,againstShots:34,opponentStyle:"pressure"}]};');
 assert.equal(r('initial'),'control');assert.equal(r('rivalPlan(testClub,"HV71").style'),'counter');
 assert.equal(r('rivalPlan(testClub,"HV71").matchup'),true);
 r('globalThis.base=rivalPlan(testClub,"HV71");globalThis.context={seconds:3300,gf:1,ga:3,shots:20,againstShots:32};globalThis.decision=aiCoachDecision(testClub,base,context);');
 assert.equal(r('decision.rotation'),'topHeavy');assert.equal(r('decision.posture'),'attack');assert.equal(r('decision.timeout'),true);
 assert.equal(r('JSON.stringify(aiCoachDecision(testClub,base,context))'),r('JSON.stringify(decision)'));
 assert.equal(r('aiCoachDecision(testClub,base,{seconds:3300,gf:3,ga:1}).posture'),'defense');
}

// Played games pay salaries and receive revenue once. Raising salaries cannot create income.
{
 const a=game(),r=a.run;
 r('globalThis.fixture=state.schedule.find(g=>g.home!==managerClub()&&g.away!==managerClub());globalThis.testClub=fixture.home;globalThis.bank=state.recruitment.ai[testClub].cash;leagueBackground(fixture);');
 assert.notEqual(r('state.recruitment.ai[testClub].cash'),r('bank'));
 assert.ok(r('clubAIState(testClub).finance.totals.wages')<0);assert.ok(r('clubAIState(testClub).finance.totals.tickets')>0);
 r('globalThis.settled=JSON.stringify(state.clubAI);globalThis.balance=state.recruitment.ai[testClub].cash;leagueBackground(fixture);aiSettleFixture(testClub,fixture);');
 assert.equal(r('JSON.stringify(state.clubAI)'),r('settled'));assert.equal(r('state.recruitment.ai[testClub].cash'),r('balance'));
 r('globalThis.sponsor=clubAIState(testClub).finance.sponsor;for(const p of state.clubRosters[testClub])p.salary*=3;state.season.year++;state.season.phase="preseason";aiNewFinancialYear(testClub);');
 assert.equal(r('state.recruitment.ai[testClub].cash'),r('balance'),'new year has no automatic cash grant');
 assert.ok(r('clubAIState(testClub).finance.sponsor')<=r('sponsor*1.03'));
 assert.ok(r('loanWageCost(testClub)>state.recruitment.ai[testClub].wageLimit'));
 r('aiReviewClub(testClub)');assert.equal(r('clubAIState(testClub).project'),'survive');
 assert.ok(r('state.clubRosters[testClub].some(p=>p.aiListed)'));
}

// Clubs negotiate over a shared player; the best offer wins without duplicate ownership.
{
 const a=game(),r=a.run;
 r(`globalThis.buyers=['Färjestad BK','Luleå Hockey'];
  for(const club of buyers){
   const forwards=state.clubRosters[club].filter(p=>worldGroup(p)==='F');
   for(const p of forwards.slice(12)){state.clubRosters[club]=state.clubRosters[club].filter(q=>q!==p);worldRelease(p,club,'Test fixture: transfer-listed surplus');}
   state.recruitment.ai[club].cash=100000000;state.recruitment.ai[club].wageLimit=100000000;
  }
  globalThis.target=state.playerWorld.freeAgents.find(p=>p.name==='Oula Palve');
  for(const key of Object.keys(target.attributes))target.attributes[key]=18; // Both clubs can credibly offer the tested key role.
  globalThis.wishes=recruitPlayerWishes(target,buyers[0]);
  globalThis.needA=aiSquadNeeds(buyers[0]).find(n=>n.role==='forward');
  globalThis.needB=aiSquadNeeds(buyers[1]).find(n=>n.role==='forward');
  aiSubmitMarket(buyers[0],target,needA,'transfer',{fee:0,salary:wishes.salary*1.2,years:2,role:'Nyckelspelare'});
  aiSubmitMarket(buyers[1],target,needB,'transfer',{fee:0,salary:wishes.salary*1.6,years:2,role:'Nyckelspelare'});`);
 const ids=identities(a);
 assert.equal(r('getPlayerClub(target.id)'),'Kontraktslös');
 assert.ok(r('aiMarketReserved(buyers[0]).salary')>0);
 r('state.calendar.date=calAdd(state.calendar.date,2);aiResolveMarket();');
 assert.equal(r('getPlayerClub(target.id)'),r('buyers[1]'));
 assert.equal(r('state.clubAI.offers.filter(o=>o.status==="signed").length'),1);
 assert.equal(r('state.clubAI.offers.filter(o=>o.status==="lost").length'),1);
 assert.equal(identities(a),ids);assert.equal(r('aiMarketReserved(buyers[0]).salary'),0);
 r('globalThis.history=state.recruitment.history.length;aiResolveMarket()');assert.equal(r('state.recruitment.history.length'),r('history'));
 r('save()');assert.equal(identities(boot(a.storage.value)),ids);
 assert.doesNotThrow(()=>r('validateSaveText(saveExportText())'));
}

// Actual playing time affects AI morale, transfer availability and academy progress.
{
 const {run:r}=game();
 r('globalThis.testClub="Färjestad BK";globalThis.reserve=state.clubRosters[testClub].find(p=>p.pos==="B"&&!playerLoan(p));reserve.promisedRole="Nyckelspelare";reserve.happiness=60;globalThis.mood=reserve.morale;for(let i=0;i<12;i++)aiAfterPlayerFixture(testClub,[],1,3);');
 assert.equal(r('reserve.aiRoleReview.unhappy'),true);assert.ok(r('reserve.morale<mood'));
 r('aiReviewClub(testClub)');assert.ok(r('clubAIState(testClub).decisions.some(d=>d.kind==="dressing")'));
 r('globalThis.prospect=clubAIState(testClub).academy.roster[0];globalThis.games=prospect.academy.games;globalThis.trainingBefore=JSON.stringify([prospect.attributes,prospect.trainingProgress]);for(let i=0;i<14;i++){state.calendar.date=calAdd(state.calendar.date,1);aiAcademyDay(testClub)}');
 assert.equal(r('prospect.academy.games'),r('games+2'));
 assert.notEqual(r('JSON.stringify([prospect.attributes,prospect.trainingProgress])'),r('trainingBefore'));
 r('globalThis.progress=JSON.stringify(clubAIState(testClub).academy);aiAcademyDay(testClub)');
 assert.equal(r('JSON.stringify(clubAIState(testClub).academy)'),r('progress'));
}
console.log('PASS: club AI migration, read-only views, unique academies, slot-safe special teams, future squad needs, tactical memory, economic pressure, competitive contracts, role reactions and dated academy development.');
