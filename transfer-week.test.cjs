'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {boot}=require('./scripts/career-test-fixture.cjs');
function setup(){
 const a=boot(null,{production:true}),r=a.run;
 r(`startCareerWithClub('HV71');preseasonConfigure('balanced','manager','rotation','assistant','assistant');
 state.money=100000000;state.boardPlan.offer.wageLimit=100000000;state.season.nextWageLimit=100000000;
 globalThis.owner=managerClub(),buyer='AIK',p=managerRoster().filter(p=>p.pos==='MV')[2];
 p.age=28;p.salary=250000;p.contractYears=3;for(const k in p.attributes)p.attributes[k]=15;
 globalThis.vacancy=club=>{for(const q of [...state.clubRosters[club]].filter(p=>p.pos==='MV')){state.clubRosters[club]=state.clubRosters[club].filter(p=>p!==q);worldRelease(q,club,'Controlled vacancy');}state.recruitment.ai[club].cash=100000000;state.recruitment.ai[club].wageLimit=100000000;};vacancy(buyer);
 globalThis.need=aiSquadNeeds(buyer).find(n=>n.role==='goalie'),w=recruitPlayerWishes(p,buyer);
 aiSubmitMarket(buyer,p,need,'transfer',{fee:recruitFee(p),salary:w.salary*2,years:2,role:'Nyckelspelare'});globalThis.o=state.recruitment.incoming[0];
 globalThis.replacement=state.clubRosters[RECRUIT_CLUBS[0][0]][0];replacement.age=28;replacement.transferListed=true;
 globalThis.rw=recruitPlayerWishes(replacement);submitRecruitOffer(replacement.id,recruitSellerPosition(replacement,getPlayerClub(replacement.id)).fee,rw.salary*2,2,rw.role);globalThis.d=state.recruitment.deals[0];
 globalThis.cash=state.money,bank=state.recruitment.ai[buyer].cash;
 globalThis.day=()=>{state.calendar.date=calAdd(state.calendar.date,1);calendarMarketDay();};`);
 assert.ok(r('o'));assert.equal(r('d.status'),'pending');return a;
}
test('conditional sale survives disk reload and registers only after the real purchase; books each fee once',()=>{
 const a=setup(),r=a.run;r('transferLinkOffer(o.id,d.id);globalThis.deadline=o.expiresDate;globalThis.reserved=managerRecruitmentBudget().fees;incomingDay();save()');
 assert.equal(r('o.stage'),'replacement_wait');assert.equal(r('getPlayerClub(p.id)'),'HV71');assert.equal(r('state.money'),r('cash'));assert.equal(r('managerRecruitmentBudget().fees'),r('d.fee'));
 assert.match(r('incomingDealView(o)'),/Först ersättaren/);assert.doesNotMatch(r('incomingDealView(o)'),/onclick="answerIncomingOffer/);assert.doesNotThrow(()=>r('validateSaveText(saveExportText())'));
 const q=boot(a.storage.value,{production:true}).run;q('globalThis.o=state.recruitment.incoming[0],d=state.recruitment.deals[0],p=marketPlayer(o.playerId);state.calendar.date=d.dueDate;calendarMarketDay();');
 assert.equal(q('d.status'),'signed');assert.equal(q('o.stage'),'club_agreed');assert.equal(q('o.replacement.status'),'secured');assert.equal(q('getPlayerClub(p.id)'),'HV71');assert.equal(q('state.money'),r('cash-d.fee'));assert.equal(q('o.expiresDate'),r('deadline'));
 q('state.calendar.date=o.dueDate;incomingDay();incomingDay()');assert.equal(q('o.status'),'accepted');assert.equal(q('getPlayerClub(p.id)'),'AIK');assert.equal(q('state.money'),r('cash-d.fee+o.fee'));assert.equal(q("state.recruitment.ai['AIK'].cash"),r('bank-o.fee'));
 assert.equal(q('state.recruitment.history.filter(h=>h.playerId===p.id).length'),1);assert.doesNotThrow(()=>q('validateSaveText(saveExportText())'));
});
test('a cancelled purchase releases the sale back to an explicit decision and never spends projected income',()=>{
 const {run:r}=setup();r('transferLinkOffer(o.id,d.id);cancelRecruitOffer(d.id);incomingDay()');assert.equal(r('o.stage'),'offer');assert.equal(r('o.approved'),false);assert.equal(r('o.replacement.status'),'failed');assert.equal(r('getPlayerClub(p.id)'),'HV71');assert.equal(r('state.money'),r('cash'));
 r('state.money=0;globalThis.fees=managerRecruitmentBudget().fees;submitRecruitOffer(replacement.id,1,rw.salary,2,rw.role)');assert.equal(r('state.recruitment.deals.length'),1);assert.equal(r('managerRecruitmentBudget().fees'),0);
});
test('waiting retains the original deadline, and the calendar must stop before a conditional offer expires',()=>{
 const {run:r}=setup();r('transferLinkOffer(o.id,d.id);state.calendar.date=calAdd(o.expiresDate,-1);calendarPaceSet("affairs",false)');assert.ok(r('calendarPaceSignals().some(s=>s.key.startsWith("linked-deadline:")&&s.urgent)'));
 r('state.calendar.date=calAdd(o.expiresDate,1);incomingDay()');assert.equal(r('o.status'),'expired');assert.equal(r('o.replacement.status'),'ended');assert.equal(r('getPlayerClub(p.id)'),'HV71');assert.equal(r('state.money'),r('cash'));assert.doesNotThrow(()=>r('validateSaveText(saveExportText())'));
});
test('replacement injury and buyer funding changes are rechecked after securing the replacement',()=>{
 for(const change of ["replacement.health.injury={name:'Skada',remaining:10,initial:10,readiness:30}","state.recruitment.ai[buyer].cash=0"]){
  const {run:r}=setup();r('transferLinkOffer(o.id,d.id);state.calendar.date=d.dueDate;calendarMarketDay();'+change+';state.calendar.date=o.dueDate;incomingDay()');
  assert.equal(r('o.status'),'rejected',change);assert.equal(r('getPlayerClub(p.id)'),'HV71');assert.equal(r('state.money'),r('cash-d.fee'));assert.equal(r('getPlayerClub(replacement.id)'),'HV71');
 }
});
test('unlinking is reversible, duplicate chains and mismatched positions are rejected, views are read-only',()=>{
 const {run:r}=setup();r('transferLinkOffer(o.id,d.id);globalThis.before=JSON.stringify([state.recruitment,state.clubOffice,state.playerJourneys]);transferWeekView();incomingDealView(o)');assert.equal(r('JSON.stringify([state.recruitment,state.clubOffice,state.playerJourneys])'),r('before'));
 r('globalThis.second={...o,id:state.recruitment.nextId++,stage:"offer",approved:false};delete second.replacement;state.recruitment.incoming.push(second)');assert.equal(r('transferLinkOffer(second.id,d.id)'),false);
 assert.equal(r('transferLinkUndo(o.id)'),true);assert.equal(r('o.approved'),false);assert.equal(r('d.status'),'pending');assert.equal(r('transferLinkUndo(o.id)'),false);
 r('replacement.pos="B"');assert.equal(r('transferLinkOffer(o.id,d.id)'),false);
 r('replacement.pos="MV";transferLinkOffer(o.id,d.id);o.replacement.dealId=999999');assert.throws(()=>r('validateSaveText(saveExportText())'),/affärskedja/);
});
function race(){const a=setup(),r=a.run;r(`answerIncomingOffer(o.id,false);cancelRecruitOffer(d.id);globalThis.w=recruitPlayerWishes(replacement);submitRecruitOffer(replacement.id,recruitSellerPosition(replacement,getPlayerClub(replacement.id)).fee,Math.round(w.salary*.8),2,w.role);d=state.recruitment.deals[0];
 globalThis.aw=recruitPlayerWishes(replacement,buyer);aiSubmitMarket(buyer,replacement,need,'transfer',{fee:recruitSellerPosition(replacement,getPlayerClub(replacement.id)).fee,salary:aw.salary*2,years:2,role:'Nyckelspelare'});globalThis.rival=state.clubAI.offers.find(o=>o.buyer===buyer&&o.playerId===replacement.id&&o.status==='pending');`);assert.ok(r('rival'));return a;}
test('a real funded rival gets a decision after five days when a counter remains unsigned',()=>{
 const {run:r}=race();r('state.calendar.date=d.dueDate;resolveRecruitDeal(d);aiResolveMarket()');assert.ok(r('d.counter'));assert.equal(r('rival.status'),'pending');assert.match(r('transferWeekView()'),/Rivalernas faktiska bud/);
 r('state.calendar.date=calAdd(transferRivalDeadline(rival),-1);calendarPaceSet("affairs",false)');assert.ok(r('calendarPaceSignals().some(s=>s.key.startsWith("rival-deadline:")&&s.urgent)'));
 r('state.calendar.date=transferRivalDeadline(rival);aiResolveMarket()');assert.equal(r('getPlayerClub(replacement.id)'),'AIK');assert.equal(r('rival.status'),'signed');assert.equal(r('d.status'),'cancelled');assert.equal(r('state.money'),r('cash'));
});
test('an accepted counter protects exact terms from a rival and an unfunded rival walks away',()=>{
 const {run:r}=race();r('state.calendar.date=d.dueDate;resolveRecruitDeal(d);acceptRecruitCounter(d.id);state.calendar.date=transferRivalDeadline(rival);aiResolveMarket()');assert.equal(r('rival.status'),'pending');assert.ok(r('recruitDealAgreed(d)'));r('resolveRecruitDeal(d)');assert.equal(r('d.status'),'signed');assert.equal(r('getPlayerClub(replacement.id)'),'HV71');
 const {run:q}=race();q('cancelRecruitOffer(d.id);state.recruitment.ai[buyer].cash=0;state.calendar.date=rival.due;aiResolveMarket()');assert.equal(q('rival.status'),'rejected');assert.equal(q('clubAIState(buyer).lastMarket'),null);
});
test('an actual signing raises a question about an existing trial; explanations preserve measured promises and persist',()=>{
 const a=setup(),r=a.run;r(`cancelRecruitOffer(d.id);answerIncomingOffer(o.id,false);globalThis.young=managerRoster().find(p=>p.age<=23&&!['MV','B'].includes(p.pos));journeyStart(young.id);globalThis.story=state.stories.active.find(s=>s.ids.includes(String(young.id)));storiesChoose(story.id,'promote');
 globalThis.free=state.playerWorld.freeAgents.find(p=>p.name==='Daniel Brodin'),w=recruitPlayerWishes(free);submitRecruitOffer(free.id,0,w.salary*2,Math.min(2,w.maxYears),w.role);d=state.recruitment.deals[0];globalThis.expected=JSON.stringify(story.expectation),trust=young.social.trust;state.calendar.date=d.dueDate;calendarMarketDay();globalThis.reaction=state.clubOffice.transferWeek.reactions.find(r=>r.playerId===String(young.id));`);
 assert.equal(r('d.status'),'signed');assert.ok(r('reaction'));assert.equal(r('reaction.kind'),'competition');assert.equal(r('young.social.trust'),r('trust-1'));assert.equal(r('JSON.stringify(story.expectation)'),r('expected'));assert.match(r('reaction.body'),/provperiod/);assert.match(r('transferReactionsView()'),/Stå fast vid tidigare besked/);
 r('globalThis.count=state.clubOffice.transferWeek.reactions.length;resolveRecruitDeal(d);transferReactionAnswer(reaction.id,"commitment");transferReactionAnswer(reaction.id,"commitment");save()');assert.equal(r('state.clubOffice.transferWeek.reactions.length'),r('count'));assert.equal(r('young.social.trust'),r('trust-1'));assert.equal(r('JSON.stringify(story.expectation)'),r('expected'));assert.ok(r('journeyPlayer(young.id).events.some(e=>e.title==="Samtal efter transferbeslutet")'));assert.doesNotThrow(()=>r('validateSaveText(saveExportText())'));
 const q=boot(a.storage.value,{production:true}).run;assert.ok(q('state.clubOffice.transferWeek.reactions.some(r=>r.response==="commitment")'));
});
test('old saves migrate quietly, banked clubs validate, and pending replacement conditions never transfer to a new employer',()=>{
 const {run:r}=setup();r('transferWeekView()');assert.equal(r('state.clubOffice.transferWeek'),undefined);
 r('transferLinkOffer(o.id,d.id);state.managerClub="AIK";syncManagerRoster();incomingDay()');assert.equal(r('o.status'),'cancelled');assert.equal(r('getPlayerClub(p.id)'),'HV71');
 r('state.managerCareer.bank.HV71={clubOffice:{transferWeek:{version:2,nextId:1,reactions:[]}}}');assert.throws(()=>r('validateTransferWeek(state)'),/transfervecka/);
});

test('a late manager offer still receives its promised first response before a rival can settle',()=>{
 const {run:r}=race();r('d.dueDate=calAdd(transferRivalDeadline(rival),1);state.calendar.date=transferRivalDeadline(rival);aiResolveMarket()');assert.equal(r('rival.status'),'pending');assert.equal(r('d.status'),'pending');assert.notEqual(r('getPlayerClub(replacement.id)'),'AIK');
 r('state.calendar.date=d.dueDate;aiResolveMarket()');assert.equal(r('rival.status'),'pending');
});
