const assert=require('node:assert/strict');const {boot}=require('./scripts/career-test-fixture.cjs');const app=boot(),r=app.run;
r("startCareerWithClub('HV71');deskNavigate('transfers','search')");
assert.equal(r('(deskSubnav().match(/<button/g)||[]).length'),3);assert.ok(r("deskSubnav().includes('Planering')&&deskSubnav().includes('Spelare & scouting')&&deskSubnav().includes('Affärer')"));assert.ok(!r('deskSubnav()').includes('desk-more'));
r("globalThis.list=hubCandidates('search');hubPick(list[3].id);globalThis.chosen=recruitHub.player;hubPanel('transfer')");assert.equal(r('state.page'),'transfers');assert.ok(r('recruitmentView()').includes('Skicka köpbud'));
r('recruitOpen(chosen);deskBack()');assert.equal(r('recruitHub.player'),r('chosen'));assert.equal(r('recruitHub.panel'),'transfer');
r("toggleRecruitShortlist(chosen);deskNavigate('transfers','shortlist')");assert.equal(r("hubCandidates('shortlist').length"),1);r("recruitHub.market='own';recruitFilters().query='zzzz'");assert.equal(r("hubCandidates('shortlist').length"),1,'wishlist is independent of search filters');r("resetRecruitFilters();recruitHub.market='all'");
r("deskNavigate('transfers','search');hubMarket('loan');globalThis.loanIds=hubScoutIds();globalThis.moneyBefore=state.money;createScoutMission(loanIds)");
assert.equal(r('state.recruitment.missions[0].players.every(id=>loanIds.some(x=>samePlayerId(x,id)))'),true);assert.equal(r('moneyBefore-state.money'),r('clubMissionFee()'));
r("globalThis.target=hubCandidates('search').find(p=>!scoutPending(p.id));globalThis.cashBefore=state.money;requestScoutReport(target.id,true)");assert.equal(r('state.page'),'transfers');assert.ok(r('scoutPending(target.id)'));assert.equal(r('cashBefore-state.money'),r('Math.round(clubMissionFee()/3)'));
r("recruitHub.market='all';deskNavigate('transfers','missions')");assert.ok(r("hubCandidates('missions').some(p=>samePlayerId(p.id,target.id))"));assert.ok(r("deskSubnav().includes('aria-current=\"page\"')&&deskSubnav().includes('Spelare & scouting')"));
// Both transfer and loan records feed one decision table, retaining real action paths.
r("state.recruitment.deals.push({id:900,playerId:target.id,name:target.name,status:'pending',fee:100,salary:200,years:2,role:'Rotation'});state.loans.offers.push({id:901,playerId:target.id,name:target.name,status:'counter',owner:getPlayerClub(target.id),borrower:managerClub(),share:.5,days:28,role:'regular',recall:'day28',counter:{share:.75,days:56,role:'regular',recall:'day28'}});deskNavigate('transfers','deals')");
assert.ok(r("hubAffairRows().some(x=>x.key==='transfer:900')"));assert.ok(r("hubAffairRows().some(x=>x.key==='loan:901')"));
assert.ok(r("hubDealDetail(hubAffairRows().find(x=>x.key==='loan:901')).includes('loanAnswer(901,true)')"));
r("cancelRecruitOffer(900)");assert.equal(r('state.recruitment.deals.at(-1).status'),'cancelled');
r('save()');const loaded=boot(app.storage.value);assert.ok(loaded.run('state.loans.offers.some(x=>x.id===901)'));
for(const tab of ['needs','search','missions','shortlist','deals','loans','history','world']){r(`deskNavigate('transfers','${tab}')`);assert.doesNotMatch(r('recruitmentView()'),/undefined|NaN/);}
r("globalThis.own=managerRoster()[0].id;loanOpen(own)");assert.equal(r('state.recruitment.tab'),'search');assert.equal(r('recruitHub.panel'),'loan');assert.equal(r('recruitHub.player'),r('own'));
console.log('PASS: simplified primary recruitment navigation, in-place player decisions, hidden deep routes, scoped scout spending and persistent transfer/loan decisions.');