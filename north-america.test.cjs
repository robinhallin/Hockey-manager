const test=require('node:test'),assert=require('node:assert/strict');
const {boot}=require('./scripts/career-test-fixture.cjs');
function game(){const a=boot();a.run("startCareerWithClub('HV71');state.calendar.date='2026-07-02';globalThis.p=state.juniors.roster.find(p=>p.pos==='B');p.age=19;p.nhlDraft={year:2026,club:'Seattle Kraken',round:2,overall:42,expires:'2030-06-30'};for(const k of Object.keys(p.attributes))p.attributes[k]=13;p.health={load:0,injury:null,clearance:'rest'};p.fatigue=0;state.season.nextWageLimit=1000000000;state.boardPlan.offer.wageLimit=1000000000;globalThis.o=naOffer(p,managerClub())");return a;}
test('offers require explicit decisions; move preserves identity, fee once, rights and save',()=>{
 const a=game(),r=a.run;assert.equal(r('o.status'),'pending');assert.equal(r('naActive(p)'),false);
 r('globalThis.cash=state.money;globalThis.id=p.id;globalThis.rights=JSON.stringify(p.nhlDraft)');assert.equal(r("naAnswer(o.id,'move')"),true);
 assert.equal(r('state.money-cash'),r('o.fee'));assert.equal(r('state.northAmerica.abroad[0]===p'),true);assert.equal(r('state.juniors.roster.some(q=>q.id===id)'),false);assert.equal(r('JSON.stringify(p.nhlDraft)'),r('rights'));
 assert.equal(r("naSign(o,'move')"),false);assert.equal(r('state.money-cash'),r('o.fee'));assert.equal(r('getPlayerClub(id)'),'Coachella Valley Firebirds');
 r('save()');const b=boot(a.storage.value);assert.equal(b.run('JSON.stringify(state.northAmerica)'),r('JSON.stringify(state.northAmerica)'));
 assert.equal(b.run('internationalPlayers().filter(r=>r.p.naContract).length'),1);
});
test('loanback charges only agreed wage share, records actual ice time and respects recall date',()=>{
 const a=game(),r=a.run;r('globalThis.wages=annualWageCost();globalThis.oldCost=p.academy.seniorContract?p.salary:0');assert.equal(r("naAnswer(o.id,'loanback')"),true);
 assert.equal(r('managerRoster().filter(q=>q===p).length'),1);assert.equal(r('state.northAmerica.abroad.length'),0);assert.equal(r('annualWageCost()-wages'),r('450000-oldCost'));
 r("globalThis.l=playerLoan(p);globalThis.g={home:managerClub(),away:'AIK',round:1,date:state.calendar.date};loansAfterFixture(g,[{id:p.id,club:managerClub(),seconds:900,goals:1,assists:2}]);loansAfterFixture(g,[{id:p.id,club:managerClub(),seconds:900,goals:1,assists:2}]);loanRecall(l.id)");
 assert.equal(r('l.games'),1);assert.equal(r('l.seconds'),900);assert.equal(r('Boolean(playerLoan(p))'),true);
 r('state.calendar.date=calAdd(l.start,28);loanRecall(l.id)');assert.equal(r('playerLoan(p)'),null);assert.equal(r('state.northAmerica.abroad[0]===p'),true);assert.equal(r('managerRoster().some(q=>q.id===p.id)'),false);assert.equal(r('annualWageCost()'),r('wages-oldCost'));
});
test('budget, medical, future contract, roster minimum and live game protect moves',()=>{
 const a=game(),r=a.run;r("state.live={finished:false};globalThis.before=JSON.stringify(state);naDay();naAnswer(o.id,'move');naBorrow(p.id)");assert.equal(r('JSON.stringify(state)'),r('before'));
 r("state.live=null;p.futureContract={buyer:'AIK'}");assert.equal(r('naSign(o)'),false);r('delete p.futureContract;p.health.injury={remaining:4}');assert.equal(r('naSign(o)'),false);r('p.health.injury=null;state.season.nextWageLimit=1;state.boardPlan.offer.wageLimit=1');assert.equal(r("naSign(o,'loanback')"),false);
 r("globalThis.q=managerRoster().find(q=>q.pos==='MV');state.clubRosters[managerClub()]=managerRoster().filter(p=>p.pos!=='MV'||p===q);syncManagerRoster()");assert.equal(r('naCanLeave(q,managerClub())'),false);
 r('state.northAmerica.fees[`${state.season.year}:${o.team}`]=6000000');assert.equal(r('naSign(o)'),false);
});
test('abroad training is idempotent, skips JVM, assigns NHL by attributes and adds no games',()=>{
 const a=game(),r=a.run;r("naSign(o);globalThis.games=p.games;state.calendar.date='2026-10-01';naDay();globalThis.days=p.naContract.trainingDays;globalThis.before=JSON.stringify(state);naDay()");assert.equal(r('JSON.stringify(state)'),r('before'));assert.equal(r('days'),1);assert.equal(r('p.games'),r('games'));
 r("p.internationalDuty={from:'2026-10-01',until:'2026-10-10',returned:false};state.calendar.date='2026-10-02';naDay()");assert.equal(r('p.naContract.trainingDays'),1);
 r("delete p.internationalDuty;for(const k of Object.keys(p.attributes))p.attributes[k]=18;state.calendar.date='2026-10-15';naDay()");assert.equal(r('p.naContract.assignment'),'NHL');assert.equal(r('p.salary'),9000000);assert.equal(r('p.games'),r('games'));assert.equal(r('naBorrow(p.id)'),false);
});
test('AHL loans fit wage room; active NHL contracts cannot be bought or precontracted',()=>{
 const a=game(),r=a.run;r("naSign(o);state.season.phase='regular';p.contractYears=1;globalThis.deals=state.recruitment.deals.length;submitRecruitOffer(p.id,1000000,900000,2,'Breddspelare');submitFutureOffer(p.id,900000,2,'Breddspelare')");assert.equal(r('state.recruitment.deals.length'),r('deals'));assert.equal(r("transferRecruitPlayer(p,getPlayerClub(p.id),managerClub(),0,900000,2,'Breddspelare')"),false);
 r('state.season.nextWageLimit=1;state.boardPlan.offer.wageLimit=1');assert.equal(r('naBorrow(p.id)'),false);r('state.season.nextWageLimit=1000000000;state.boardPlan.offer.wageLimit=1000000000');assert.equal(r('naBorrow(p.id)'),true);assert.equal(r('playerLoan(p).owner'),'Seattle Kraken');assert.equal(r('naBorrow(p.id)'),false);
});
test('season transition ages returned loanees once; expiry returns same player to Swedish market',()=>{
 const a=game(),r=a.run;r("naSign(o,'loanback');globalThis.age=p.age;state.season.phase='review';state.season.boardResult=[];beginPreseason()");assert.equal(r('p.age'),r('age+1'));assert.equal(r('playerLoan(p)'),null);assert.equal(r('state.northAmerica.abroad.includes(p)'),true);
 r("p.naContract.end='2027-06-30';state.calendar.date='2027-07-02';naDay()");assert.equal(r('naActive(p)'),false);assert.equal(r('worldIsFree(p.id)'),true);assert.equal(r('state.northAmerica.abroad.includes(p)'),false);assert.equal(r('p.naHistory[0].status'),'expired');
 r('state.money=1000000000;state.season.nextWageLimit=1000000000;state.boardPlan.offer.wageLimit=1000000000');assert.equal(r("transferRecruitPlayer(p,WORLD_FREE,managerClub(),0,900000,2,'Breddspelare')"),true);assert.equal(r('managerRoster().filter(q=>q.id===p.id).length'),1);
});
test('annual signing limit survives bounded offer archive; view is read-only',()=>{
 const a=game(),r=a.run;r("naSign(o);state.northAmerica.offers=[];globalThis.q=state.juniors.roster.find(q=>q.pos==='B');q.age=19;q.nhlDraft={...p.nhlDraft};for(const k of Object.keys(q.attributes))q.attributes[k]=13;q.health={load:0,injury:null,clearance:'rest'}");assert.equal(r('naOffer(q,managerClub())'),null);
 const before=r('JSON.stringify(state)');r("for(const tab of ['offers','players','network','history']){naUI.tab=tab;naView()}nhlUI.tab='contracts';nhlView();render()");assert.equal(r('JSON.stringify(state)'),before);assert.equal(r('Object.keys(NA_AFFILIATES).length'),32);assert.equal(r('NHL_CLUBS.every(c=>NA_AFFILIATES[c])'),true);
});
test('actual draft and preseason generate offers without automatically selling manager prospects',()=>{
 const a=boot(),r=a.run;r("startCareerWithClub('HV71');globalThis.p=state.juniors.roster.find(p=>p.pos==='B');p.age=18;p.internationalIdentity={nation:'SWE',birthYear:2008,estimated:false};for(const k of Object.keys(p.attributes))p.attributes[k]=17;state.season.phase='review';state.season.boardResult=[];beginPreseason()");assert.ok(r('p.nhlDraft'));assert.equal(r('state.northAmerica.offers.find(o=>o.playerId===p.id)?.status'),'pending');assert.equal(r('naActive(p)'),false);
});
test('nine seasons retain unique players, bounded ledgers and funded contracts',()=>{
 const a=boot(),r=a.run;r("startCareerWithClub('HV71')");let signed=0;
 for(let i=0;i<9;i++){
  r("state.season.phase='review';state.season.boardResult=[];beginPreseason()");
  signed+=r("state.northAmerica.offers.filter(o=>o.year===state.season.year&&o.status==='signed').length");
  assert.equal(r("NHL_CLUBS.every(c=>{const b=naBudget(c);return b.contracts<=12&&b.committed<=108000000&&b.fees<=6000000})"),true);
  assert.equal(r("(()=>{const rows=[...Object.values(state.clubRosters).flat(),...state.juniors.roster,...Object.entries(state.clubAI.clubs).filter(([c])=>c!==managerClub()).flatMap(([,c])=>c.academy.roster),...state.playerWorld.freeAgents,...state.international.pool,...state.northAmerica.abroad];return new Set(rows.map(p=>String(p.id))).size===rows.length})()"),true);
  assert.ok(r('state.northAmerica.events.length')<=180);assert.ok(r('state.northAmerica.offers.filter(o=>o.status!=="pending").length')<=96);
  assert.ok(r('Object.keys(state.northAmerica.signings).length')<=64);
  assert.ok(r('state.naLeagues.history.length')<=3);
  assert.equal(r('state.naLeagues.history.every(s=>s.leagues.NHL.champion&&s.leagues.AHL.champion)'),true);
  assert.equal(r('naPlayers().every(p=>p.naContract.end>=state.calendar.date)'),true);
 }
 assert.ok(signed>30,'actual AI signings, not empty-state assertions');
});
