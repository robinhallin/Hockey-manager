'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {boot}=require('./scripts/career-test-fixture.cjs');
test('all missing terms are explained consistently without accepting or changing the offer',()=>{
 const a=boot(),r=a.run;r(`startCareerWithClub('HV71');globalThis.p=state.playerWorld.freeAgents[0];globalThis.w=recruitPlayerWishes(p);globalThis.offer={salary:1,years:0,role:'Breddspelare'};globalThis.before=JSON.stringify(state)`);
 assert.ok(r('recruitmentTermsReview(p,offer).issues.length>=2'));
 assert.match(r('marketPlayerDecision(p,managerClub(),offer)'),/år erbjuds/);
 assert.match(r('recruitmentTermsView(p,offer)'),/Trygghet/);
 assert.equal(r('JSON.stringify(state)'),r('before'));
});
test('outgoing offer history survives counter, acceptance, calendar registration and reload',()=>{
 const a=boot(),r=a.run;r(`startCareerWithClub('HV71');state.money=1e9;state.boardPlan.offer.wageLimit=1e9;globalThis.p=state.playerWorld.freeAgents.find(p=>p.name==='Daniel Brodin');globalThis.w=recruitPlayerWishes(p);submitRecruitOffer(p.id,0,Math.round(w.salary*.8),Math.min(2,w.maxYears),w.role);globalThis.d=state.recruitment.deals[0];state.calendar.date=d.dueDate;resolveRecruitDeal(d)`);
 assert.deepEqual(JSON.parse(r('JSON.stringify(d.negotiationHistory.map(e=>e.event))')),['Bud skickat','Motbud']);
 r('globalThis.original=JSON.stringify(d.negotiationHistory[0]);acceptRecruitCounter(d.id)');
 assert.equal(r('JSON.stringify(d.negotiationHistory[0])'),r('original'));
 assert.match(r("recruitmentNextStep({key:'transfer:'+d.id,status:d.status,d})"),/registrering/);
 r('save()');const b=boot(a.storage.value),s=b.run;s('globalThis.d=state.recruitment.deals[0];state.calendar.date=d.dueDate;resolveRecruitDeal(d)');
 assert.equal(s('d.status'),'signed');assert.equal(s('d.negotiationHistory.at(-1).event'),'Registrerad');
 const count=s('d.negotiationHistory.length');s('resolveRecruitDeal(d)');assert.equal(s('d.negotiationHistory.length'),count);
 assert.doesNotThrow(()=>s('validateSaveText(saveExportText())'));
});
test('next actions distinguish pending loans, active loans, player decisions and future arrivals',()=>{
 const {run:r}=boot();r("startCareerWithClub('HV71')");
 assert.match(r("recruitmentNextStep({key:'loan:1',status:'pending',d:{status:'pending'}})"),/flyttar inte/);
 assert.match(r("recruitmentNextStep({key:'active:1',status:'active',d:{}})"),/återkomstdatum/);
 assert.match(r("recruitmentNextStep({key:'incoming:1',status:'pending',d:{stage:'club_agreed'}})"),/Spelarens beslut/);
 assert.match(r("recruitmentNextStep({key:'transfer:1',status:'pending',d:{kind:'future'}})"),/nästa säsong/);
});
test('future contracts explain every missing term and preserve a dated outcome',()=>{
 const {run:r}=boot();r(`startCareerWithClub('HV71');state.money=1e9;state.boardPlan.offer.wageLimit=1e9;state.season.phase='regular';globalThis.p=state.clubRosters['Luleå Hockey'].find(p=>!playerLoan(p));p.contractYears=1;globalThis.w=recruitPlayerWishes(p);submitFutureOffer(p.id,1,5,'Breddspelare');globalThis.d=state.recruitment.deals[0];state.calendar.date=d.dueDate;calendarResolveFuture(d)`);
 assert.equal(r('d.status'),'rejected');assert.match(r('d.reason'),/minst/);
 assert.equal(r('d.negotiationHistory[0].event'),'Förhandsbud');assert.equal(r('d.negotiationHistory.at(-1).event'),'Avslag');
 assert.equal(r('p.futureContract'),undefined);
});
