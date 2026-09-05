const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const node=()=>({innerHTML:'',textContent:'',classList:{toggle(){}},addEventListener(){}});
function boot(saved){
  const storage={value:saved,extra:{}};
  const context=vm.createContext({Intl,Math,Date,console,setTimeout:()=>0,clearTimeout(){},
    localStorage:{getItem:k=>k==='hockey_manager_alpha02'?storage.value||null:storage.extra[k]||null,setItem:(k,v)=>{if(k==='hockey_manager_alpha02')storage.value=v;else storage.extra[k]=v;}},
    document:{getElementById:()=>node(),querySelector:()=>node(),querySelectorAll:()=>[]}});
  vm.runInContext(fs.readFileSync('season.js','utf8'),context);
  vm.runInContext(fs.readFileSync('training.js','utf8'),context);
  vm.runInContext(fs.readFileSync('career.js','utf8'),context);
  vm.runInContext(fs.readFileSync('attributes.js','utf8'),context);
  vm.runInContext(fs.readFileSync('recruitment.js','utf8'),context);
  vm.runInContext(fs.readFileSync('locker.js','utf8'),context);
  vm.runInContext(fs.readFileSync('medical.js','utf8'),context);
  vm.runInContext(fs.readFileSync('coaching.js','utf8'),context);
  vm.runInContext(fs.readFileSync('analysis.js','utf8'),context);
  vm.runInContext(fs.readFileSync('juniors.js','utf8'),context);
  vm.runInContext(fs.readFileSync('rink.js','utf8'),context);
  vm.runInContext(fs.readFileSync('script.js','utf8'),context);
  return {run:code=>vm.runInContext(code,context),storage};
}
const {run,storage}=boot();
run('startCareerWithClub("HV71");state.money=1000000000;state.boardPlan.offer.wageLimit=1000000000');
assert.equal(run('RECRUIT_CLUBS.length'),6);
assert.equal(run('RECRUIT_CLUBS.reduce((n,[c])=>n+state.clubRosters[c].length,0)'),156);
assert.equal(run('new Set(Object.values(state.clubRosters).flat().map(p=>String(p.id))).size'),run('Object.values(state.clubRosters).flat().length'));
const allPlayers=run('Object.values(state.clubRosters).flat().length');
run('ensureRecruitment();save();render()');assert.equal(run('Object.values(state.clubRosters).flat().length'),allPlayers);
// Scouting spends once, follows filters, advances with actual time and survives reload.
run('state.recruitment.filters={country:"FIN",profile:"Defensiv center",maxAge:40,maxFee:50000000,query:""};globalThis.cashBefore=state.money;createScoutMission();globalThis.mission=state.recruitment.missions[0]');
assert.equal(run('cashBefore-state.money'),25000);
assert.equal(run('mission.players.every(id=>findPlayerAnywhere(id).pos==="C"&&recruitCountry(getPlayerClub(id))==="FIN")'),true);
run('save();render();advanceScoutReports()');assert.equal(run('mission.observations'),0);
run('requestScoutReport(mission.players[0]);state.round++;advanceScoutReports()');
assert.equal(run('state.scoutReports[String(mission.players[0])].visits'),1); // no double observation
run('save()');const restored=boot(storage.value);assert.equal(restored.run('state.recruitment.missions[0].observations'),1);
run('state.round++;advanceScoutReports();state.round++;advanceScoutReports()');
assert.equal(run('mission.status'),'completed');
assert.equal(run('mission.players.every(id=>state.scoutReports[String(id)].visits===3)'),true);
// Contract process waits for time, enforces terms and transfers a single player atomically.
run('globalThis.target=state.clubRosters[RECRUIT_CLUBS[0][0]][5];target.transferListed=true;globalThis.source=getPlayerClub(target.id);globalThis.fee=recruitFee(target);globalThis.salary=recruitPlayerWishes(target).salary*2;globalThis.beforeCash=state.money;globalThis.beforeSellerCash=state.recruitment.ai[source].cash;submitRecruitOffer(target.id,fee,salary,2,"Nyckelspelare")');
assert.equal(run('state.recruitment.deals[0].status'),'pending');assert.equal(run('getPlayerClub(target.id)'),run('source'));
run('submitRecruitOffer(target.id,fee,salary,2,"Nyckelspelare")');assert.equal(run('state.recruitment.deals.filter(d=>d.status==="pending").length'),1);
run('state.round++;advanceScoutReports()');
assert.equal(run('state.recruitment.deals[0].status'),'signed');
assert.equal(run('getPlayerClub(target.id)'),'HV71');assert.equal(run('state.money'),run('beforeCash-fee'));
assert.equal(run('state.recruitment.ai[source].cash'),run('beforeSellerCash+fee'));
assert.equal(run('Object.values(state.clubRosters).flat().filter(p=>samePlayerId(p.id,target.id)).length'),1);
assert.equal(run('target.promisedRole'),'Nyckelspelare');
assert.equal(run('target.recruitmentPromise.minutes'),15);
const signedCash=run('state.money');run('advanceScoutReports()');assert.equal(run('state.money'),signedCash);
// Promised role is checked against actual minutes once per completed match.
run('globalThis.happy=target.happiness;createMatch();state.live.finished=true;state.live.iceTime={[target.id]:0};afterTrainingMatch();afterTrainingMatch()');
assert.equal(run('target.recruitmentPromise.games'),1);
run('for(let i=0;i<2;i++){state.round++;state.live=null;createMatch();state.live.finished=true;state.live.iceTime={[target.id]:0};afterTrainingMatch()}state.live=null');
assert.equal(run('target.recruitmentPromise.resolved'),true);
assert.equal(run('target.happiness'),run('happy-12'));
// A weak salary offer fails; no fee deducted and the reason is explicit.
run('globalThis.reject=state.clubRosters[RECRUIT_CLUBS[1][0]][5];reject.transferListed=true;globalThis.rejectCash=state.money;submitRecruitOffer(reject.id,recruitFee(reject),1,2,"Nyckelspelare");state.round++;advanceScoutReports()');
assert.equal(run('state.recruitment.deals[0].status'),'rejected');assert.match(run('state.recruitment.deals[0].reason'),/minst/);
assert.equal(run('state.money'),run('rejectCash'));
// A rival can win a player for better overall conditions, and must pay.
run('globalThis.rivalTarget=state.clubRosters[RECRUIT_CLUBS[2][0]][5];rivalTarget.transferListed=true;globalThis.w=recruitPlayerWishes(rivalTarget);submitRecruitOffer(rivalTarget.id,recruitFee(rivalTarget),w.salary,2,w.role);globalThis.deal=state.recruitment.deals[0];globalThis.rivalClub=Object.keys(state.recruitment.ai).find(c=>c!==deal.seller);state.recruitment.ai[rivalClub].cash=100000000;state.recruitment.ai[rivalClub].wageLimit=100000000;deal.rival={club:rivalClub,fee:deal.fee,salary:w.salary*3,years:2,role:"Nyckelspelare"};globalThis.rivalCash=state.recruitment.ai[rivalClub].cash;state.round++;advanceScoutReports()');
assert.equal(run('deal.status'),'rejected');assert.equal(run('getPlayerClub(rivalTarget.id)'),run('rivalClub'));
assert.equal(run('state.recruitment.ai[rivalClub].cash'),run('rivalCash-deal.fee'));
// Budget cap and pending reservations reject impossible offers without mutation.
run('globalThis.budgetTarget=state.clubRosters[RECRUIT_CLUBS[3][0]][5];budgetTarget.transferListed=true;state.boardPlan.offer.wageLimit=annualWageCost();globalThis.count=state.recruitment.deals.length;submitRecruitOffer(budgetTarget.id,recruitFee(budgetTarget),1000000,2,"Nyckelspelare")');
assert.equal(run('state.recruitment.deals.length'),run('count'));
run('state.boardPlan.offer.wageLimit=1000000000;state.money=100;submitRecruitOffer(budgetTarget.id,recruitFee(budgetTarget),1000000,2,"Nyckelspelare")');
assert.equal(run('state.recruitment.deals.length'),run('count'));
// Own player sales require a decision, protect squad size and cannot mutate a live team.
run('state.money=1000000000;target.transferListed=true;generateIncomingOffer();globalThis.incoming=state.recruitment.incoming.find(o=>samePlayerId(o.playerId,target.id));createMatch();answerIncomingOffer(incoming.id,true)');
assert.equal(run('getPlayerClub(target.id)'),'HV71');
run('state.live=null;globalThis.saleCash=state.money;answerIncomingOffer(incoming.id,true)');
assert.equal(run('incoming.status'),'accepted');assert.equal(run('state.money'),run('saleCash+incoming.fee'));
run('answerIncomingOffer(incoming.id,true)');assert.equal(run('state.money'),run('saleCash+incoming.fee'));
// Autonomous transfers conserve player ownership and respect minimum roster sizes.
run('globalThis.historyBefore=state.recruitment.history.length;for(let i=0;i<30;i++){state.round++;advanceScoutReports()}');
assert.ok(run('state.recruitment.history.length>historyBefore'));
assert.equal(run('new Set(Object.values(state.clubRosters).flat().map(p=>String(p.id))).size'),allPlayers);
assert.equal(run('Object.values(state.clubRosters).every(ps=>ps.filter(p=>p.pos==="MV").length>=2&&ps.filter(p=>p.pos==="B").length>=6&&ps.filter(p=>!["MV","B"].includes(p.pos)).length>=12)'),true);
// Offseason weeks advance work and bids; ordinary pages never advance time.
run('state.season.phase="preseason";state.season.nextWageLimit=1000000000;globalThis.tick=state.recruitment.tick;recruitmentWeek()');
assert.equal(run('state.recruitment.tick'),run('tick+1'));
const tick=run('state.recruitment.tick');run('save();render()');assert.equal(run('state.recruitment.tick'),tick);
run('save()');const reload=boot(storage.value);assert.equal(reload.run('state.recruitment.tick'),tick);
assert.equal(reload.run('state.recruitment.history.length'),run('state.recruitment.history.length'));
// Existing careers preserve their transfer records and pending contract discussion.
const legacy=JSON.parse(storage.value);delete legacy.recruitment;
legacy.transferOffers=[{status:'completed',playerName:'Legacy Player',playerId:'legacy-player',sellingClub:'Brynäs IF',buyingClub:'HV71',amount:1200000}];
const legacyPlayer=legacy.clubRosters['Lac Bleu HC'][0];
legacy.transferNegotiation={playerId:legacyPlayer.id,transferFee:1500000,salaryDemand:900000};
legacy.selectedMarketPlayer=legacyPlayer.id;
const migrated=boot(JSON.stringify(legacy));
assert.equal(migrated.run('state.recruitment.history[0].fee'),1200000);
assert.equal(migrated.run('Object.values(state.clubRosters).flat().length'),allPlayers);
assert.ok(migrated.run('recruitDealsView().includes("Fortsätt diskussionen")'));
assert.ok(migrated.run('recruitmentPlayerView().includes("1500000")'));
// Pending offers reserve room; cancellation releases it and season launch waits for decisions.
run('globalThis.reserveTarget=state.clubRosters[RECRUIT_CLUBS[4][0]][5];reserveTarget.transferListed=true;state.money=recruitFee(reserveTarget)+1000;state.season.nextWageLimit=1000000000;submitRecruitOffer(reserveTarget.id,recruitFee(reserveTarget),recruitPlayerWishes(reserveTarget).salary,2,"Nyckelspelare");globalThis.pendingCount=state.recruitment.deals.length;globalThis.reserveOther=state.clubRosters[RECRUIT_CLUBS[5][0]][5];submitRecruitOffer(reserveOther.id,1001,1000000,2,"Nyckelspelare")');
assert.equal(run('state.recruitment.deals.length'),run('pendingCount'));
run('launchSeason()');assert.equal(run('state.season.phase'),'preseason');
run('cancelRecruitOffer(state.recruitment.deals[0].id)');assert.equal(run('state.recruitment.deals[0].status'),'cancelled');
// Every club and all working views render without leaking the old overall statistic.
for(const club of run('Object.keys(CLUB_DATA)')){
 run(`startCareerWithClub(${JSON.stringify(club)});state.selectedMarketPlayer=getTransferMarketPlayers()[0].id`);
 for(const tab of ['search','missions','shortlist','deals','history']){
  run(`state.recruitment.tab=${JSON.stringify(tab)}`);assert.ok(!/\bOVR\b|undefined|NaN/.test(run('recruitmentView()')),club+tab);
 }
 assert.ok(!/\bOVR\b|undefined|NaN/.test(run('recruitmentPlayerView()')));
}
console.log('PASS: international market, unique ownership, scouting missions, time/reload, player terms, rivals, budgets, explicit sales, AI transfers, offseason and 14-club views.');
