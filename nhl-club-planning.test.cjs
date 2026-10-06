const test=require('node:test'),assert=require('node:assert/strict');
const {boot}=require('./scripts/career-test-fixture.cjs');
function game(){const a=boot(undefined,{production:true});a.run(`startCareerWithClub('HV71');state.calendar.date='2026-08-02';globalThis.p=managerRoster().find(p=>p.pos==='B');p.age=19;p.nhlDraft={year:2026,club:'Seattle Kraken',expires:'2030-06-30'};for(const k of Object.keys(p.attributes))p.attributes[k]=13;p.health={load:0,injury:null,clearance:'rest'};playerSocialIdentity(p);p.social.ambition=15;p.social.loyalty=10;p.social.trust=60;globalThis.candidate=getTransferMarketPlayers().find(q=>q.pos==='B'&&!naActive(q)&&!q.futureContract);state.money=1000000000;state.season.nextWageLimit=1000000000;`);return a;}
function sign(a,mode='move'){a.run(`globalThis.o=naOffer(p,managerClub());naAnswer(o.id,'${mode}');state.calendar.date=o.dueDate;naDay()`);assert.equal(a.run('o.status'),'signed');}
test('risk is explained from current lineup and availability, never counted as income or a departure',()=>{
 const a=game(),r=a.run;r('ensureLines();state.lines.defense[0]=p.id;globalThis.cash=state.money;globalThis.roster=managerRoster().length;globalThis.budget=JSON.stringify(managerRecruitmentBudget());globalThis.risk=naClubRisk(p)');
 assert.equal(r('risk.level'),'Bevaka NHL-rättighet');assert.equal(r('risk.possibleWage'),r('p.salary'));assert.ok(r('risk.units.length')>0);
 r('naSetClubPlan(p.id,"after");naClubPlanningView()');assert.equal(r('state.money'),r('cash'));assert.equal(r('managerRoster().length'),r('roster'));assert.equal(r('JSON.stringify(managerRecruitmentBudget())'),r('budget'));
});
test('contingency keeps candidates through reload, blocks early negotiation and activates only after settlement',()=>{
 const a=game(),r=a.run;r('naSetClubPlan(p.id,"after");naPlanCandidate(p.id,candidate.id);globalThis.id=p.id;globalThis.cid=candidate.id;save()');
 const b=boot(a.storage.value,{production:true});assert.equal(b.run('naClubPlans()[0].candidates.length'),1);assert.equal(r('naPlanOpenCandidate(p.id,candidate.id)'),false);
 r('globalThis.o=naOffer(p,managerClub());naAnswer(o.id,"move");naClubPlanningDay()');assert.equal(r('naPlanStatus(naClubPlan(p.id))'),'Invänta klar avgång');
 r('state.calendar.date=o.dueDate;naDay()');assert.equal(r('o.status'),'signed');assert.equal(r('naPlanStatus(naClubPlan(id))'),'Avgång klar');assert.equal(r('naPlanOpenCandidate(id,cid)'),true);assert.equal(r('recruitHub.panel'),'transfer');assert.equal(r('recruitHub.drawer'),'player');assert.match(r('recruitmentDeskView()'),/Skicka köpbud/);
 r('globalThis.before=JSON.stringify(state);naClubPlanningView();naClubPlanningDay()');assert.equal(r('JSON.stringify(state)'),r('before'));
});
test('registered loanback does not activate an immediate replacement purchase',()=>{
 const a=game(),r=a.run;r('naSetClubPlan(p.id,"after");naPlanCandidate(p.id,candidate.id);globalThis.id=p.id');sign(a,'loanback');
 assert.equal(r('naPlanStatus(naClubPlan(id))'),'Återlån · ingen omedelbar lucka');assert.equal(r('naPlanOpenCandidate(id,candidate.id)'),false);
});
test('scout brief stays linked after edits, costs only real scouting and survives save/reload',()=>{
 const a=game(),r=a.run;r('naSetClubPlan(p.id,"watch");naPlanScout(p.id);globalThis.id=p.id;globalThis.cash=state.money;globalThis.d=scoutDesk.draft;scoutingBrief(d.profile,d.criteria.placement,10000000,32,d.horizon,d.person)');
 assert.equal(r('scoutDesk.draft.criteria.nhlPlanId'),r('id'));assert.equal(r('state.money'),r('cash'));
 r('scoutDesk.draft.players=[candidate.id];scoutingStart()');assert.equal(r('scoutingOffice().jobs[0].criteria.nhlPlanId'),r('id'));assert.ok(r('state.money<cash'));
 r('save()');const b=boot(a.storage.value,{production:true});assert.equal(b.run('scoutingOffice().jobs[0].criteria.nhlPlanId'),r('id'));
});
test('support promise is fulfilled by approval, not by forcing the player to move; repeat action is inert',()=>{
 const a=game(),r=a.run;assert.equal(r('naCareerTalk(p.id,"support")'),true);assert.equal(r('naCareerTalk(p.id,"listen")'),false);
 r('globalThis.o=naOffer(p,managerClub());naAnswer(o.id,"move")');assert.equal(r('p.nhlCareerTalk.status'),'met');assert.equal(r('p.social.trust'),62);assert.equal(r('naActive(p)'),false);
 r('naAnswer(o.id,"move");naCareerDecision(p,o,"move")');assert.equal(r('p.social.trust'),62);
});
test('broken NHL promise affects trust once; nonviable offer and elapsed date are not broken promises',()=>{
 const a=game(),r=a.run;r('naCareerTalk(p.id,"support");globalThis.o=naOffer(p,managerClub());naAnswer(o.id,"reject")');assert.equal(r('p.social.trust'),54);assert.equal(r('p.nhlCareerTalk.status'),'missed');r('naAnswer(o.id,"reject")');assert.equal(r('p.social.trust'),54);
 const b=game(),s=b.run;s('naCareerTalk(p.id,"support");globalThis.o=naOffer(p,managerClub());p.health.injury={remaining:10};naAnswer(o.id,"reject")');assert.equal(s('p.social.trust'),60);s("state.calendar.date='2026-08-16';naClubPlanningDay()");assert.equal(s('p.nhlCareerTalk.status'),'neutral');assert.equal(s('p.social.trust'),60);
});
test('listening and repeated views never farm trust; live match and wrong club block writes',()=>{
 const a=game(),r=a.run;r('naCareerTalk(p.id,"listen");globalThis.before=JSON.stringify(state);naCareerTalkView(p);naClubPlanningView();naCareerTalk(p.id,"listen")');assert.equal(r('JSON.stringify(state)'),r('before'));
 r('state.live={finished:false}');assert.equal(r('naSetClubPlan(p.id,"watch")'),false);assert.equal(r('naCareerTalk(candidate.id,"support")'),false);
});
test('return preference reads only recorded home-club relationship and cannot overpower large salary differences',()=>{
 const a=game(),r=a.run;r('p.social.trust=84');sign(a);r("p.age=29;for(const k of Object.keys(p.attributes))p.attributes[k]=13;p.naContract.end='2026-08-01';naExpire(p)");
 assert.ok(r('naReturnPreference(p,"HV71").score')>0);assert.equal(r('naReturnPreference(p,"Färjestad BK").score'),0);
 r('globalThis.w=recruitPlayerWishes(p);globalThis.offer={salary:w.salary,years:2,role:w.role};globalThis.good=recruitOfferScore(p,managerClub(),offer);p.naHistory[0].homeRelation.trust=36;globalThis.bad=recruitOfferScore(p,managerClub(),offer)');assert.ok(r('good>bad'));assert.ok(r('recruitOfferScore(p,managerClub(),{...offer,salary:offer.salary*2})>good'));
 r('delete p.naHistory[0].homeRelation;p.social.journal=[]');assert.equal(r('naReturnPreference(p,managerClub()).score'),0);assert.match(r('naReturnChoiceView(p)'),/underlag om relationen saknas/);
});
test('planning renders player links without leaking or mutating hidden scouting knowledge',()=>{
 const a=game(),r=a.run;r('naSetClubPlan(p.id,"watch");naPlanCandidate(p.id,candidate.id);globalThis.before=JSON.stringify(state)');const html=r('naClubPlanningView()');assert.match(html,/data-player-id/);assert.doesNotMatch(html,/undefined|NaN/);assert.equal(r('JSON.stringify(state)'),r('before'));
});
test('a strained return relationship can reject a marginal package but cannot remove salary or role floors',()=>{
 const a=game(),r=a.run;
 r("p.naHistory=[{homeClub:managerClub(),homeRelation:{recorded:true,trust:24}}];state.clubRosters[managerClub()]=managerRoster().filter(q=>q!==p);worldRelease(p,managerClub(),'Controlled returnee');globalThis.w=recruitPlayerWishes(p);globalThis.offer={salary:w.salary,years:w.minYears,role:w.role};globalThis.result=recruitPackageDecision(p,managerClub(),offer)");
 assert.equal(r('result.accepted'),false);assert.match(r('result.explanation'),/ansträngd/);
 r('p.naHistory[0].homeRelation.trust=100');assert.equal(r('recruitPackageDecision(p,managerClub(),{...offer,salary:w.salary*.5}).accepted'),false);
});
