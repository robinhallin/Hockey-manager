const test=require('node:test'),assert=require('node:assert/strict');
const {boot}=require('./scripts/career-test-fixture.cjs');
test('personal limits allow compensation but reject buying away ambitious role demands',()=>{
 const {run:r}=boot();r(`startCareerWithClub('HV71');globalThis.p=state.playerWorld.freeAgents[0];globalThis.w={salary:1000000,role:'Ordinarie',minYears:1,maxYears:4,identity:{ambition:10,loyalty:15,salaryWeight:1,roleWeight:1,securityWeight:1}}`);
 assert.equal(r("recruitPackageDecision(p,'test',{salary:900000,years:3,role:'Ordinarie'},w).accepted"),true);
 assert.equal(r("recruitPackageDecision(p,'test',{salary:800000,years:4,role:'Nyckelspelare'},w).accepted"),false);
 assert.equal(r("recruitPackageDecision(p,'test',{salary:1400000,years:1,role:'Rotation'},w).accepted"),true);
 r('w.identity.ambition=16');
 assert.equal(r("recruitPackageDecision(p,'test',{salary:2000000,years:1,role:'Rotation'},w).accepted"),false);
 assert.equal(r("recruitPackageDecision(p,'test',{salary:2000000,years:5,role:'Ordinarie'},w).accepted"),false);
});
test('role promises include competing bids without counting this player twice',()=>{
 const {run:r}=boot();r(`startCareerWithClub('HV71');globalThis.p=state.playerWorld.freeAgents.find(p=>p.pos==='MV');state.clubRosters.HV71.filter(p=>p.pos==='MV').forEach(p=>p.promisedRole='Nyckelspelare');globalThis.before=recruitRoleCredibility(p,'HV71','Nyckelspelare').count;state.recruitment.deals.push({playerId:p.id,buyer:'HV71',status:'pending',role:'Nyckelspelare'})`);
 assert.equal(r("recruitRoleCredibility(p,'HV71','Nyckelspelare').count"),r('before'));
 assert.ok(r("recruitRoleCredibility(p,'HV71','Nyckelspelare').excess>0"));
});
test('seller explains listing, long contract and alternatives; free players have no fee',()=>{
 const {run:r}=boot();r(`startCareerWithClub('HV71');globalThis.p=state.clubRosters['Luleå Hockey'][5];p.contractYears=4;p.transferListed=false;globalThis.price=recruitFee(p)`);
 assert.equal(r("recruitSellerPosition(p,'Luleå Hockey').fee"),r('Math.round(price*1.1)'));
 r('p.transferListed=true');assert.equal(r("recruitSellerPosition(p,'Luleå Hockey').fee"),r('recruitFee(p)'));
 assert.equal(r('recruitSellerPosition(p,WORLD_FREE).fee'),0);
});
test('one-month review persists evidence and sends once without changing trust',()=>{
 const a=boot(),r=a.run;r(`startCareerWithClub('HV71');globalThis.p=managerRoster().find(p=>!playerLoan(p));scoutingArrival(p,0,p.salary,2,p.promisedRole);globalThis.v=scoutingOffice().reviews[0];globalThis.trust=p.social.trust;recruitmentMonthDay()`);
 assert.equal(r('v.monthReview'),undefined);
 r('state.calendar.date=calAdd(v.date,30);recruitmentMonthDay();globalThis.snapshot=JSON.stringify(v.monthReview);recruitmentMonthDay()');
 assert.equal(r('JSON.stringify(v.monthReview)'),r('snapshot'));assert.equal(r('p.social.trust'),r('trust'));assert.match(r('v.monthReview.text'),/För lite underlag/);
 r('save()');const b=boot(a.storage.value);assert.equal(b.run('JSON.stringify(scoutingOffice().reviews[0].monthReview)'),r('snapshot'));
 assert.doesNotThrow(()=>r('validateSaveText(saveExportText())'));
});
test('a real lower-salary package can be signed when term security compensates',()=>{
 const {run:r}=boot();r(`startCareerWithClub('HV71');state.money=1e9;state.boardPlan.offer.wageLimit=1e9;globalThis.p=state.playerWorld.freeAgents.find(p=>p.age<30);managerRoster().filter(q=>worldGroup(q)===worldGroup(p)).forEach(q=>q.promisedRole='Rotation');globalThis.w=recruitPlayerWishes(p);globalThis.salary=Math.ceil(w.salary*.96);submitRecruitOffer(p.id,0,salary,w.maxYears,w.role);globalThis.d=state.recruitment.deals[0];state.calendar.date=d.dueDate;resolveRecruitDeal(d)`);
 assert.equal(r('d.status'),'signed');assert.equal(r('p.salary'),r('salary'));assert.ok(r('salary<w.salary'));
});
test('future role credibility excludes expiring contracts and includes signed arrivals',()=>{
 const {run:r}=boot();r(`startCareerWithClub('HV71');globalThis.p=state.playerWorld.freeAgents.find(p=>p.pos==='MV');state.clubRosters.HV71.filter(p=>p.pos==='MV').forEach(p=>{p.contractYears=1;p.promisedRole='Nyckelspelare';});globalThis.q=state.clubRosters['Luleå Hockey'].find(p=>p.pos==='MV');q.futureContract={buyer:'HV71',role:'Nyckelspelare',salary:q.salary,years:2}`);
 assert.equal(r("recruitRoleCredibility(p,'HV71','Nyckelspelare',true).count"),1);
});
