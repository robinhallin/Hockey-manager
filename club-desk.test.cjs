'use strict';
const assert=require('node:assert/strict');
const {boot}=require('./scripts/career-test-fixture.cjs');
const app=boot(undefined,{production:true}),r=app.run;
r("startCareerWithClub('HV71');deskNavigate('finance')");
for(const priority of ['balanced','commercial','local','efficiency','first']){
 r(`state.clubOffice.priority='${priority}'`);
 assert.ok(r('Math.abs(clubDeskFinanceRows().reduce((sum,row)=>sum+row.remaining,0)-(clubForecast().income-clubForecast().cost))<.01'),'breakdown matches forecast with '+priority);
}
r("state.clubOffice.priority='balanced';globalThis.before=JSON.stringify(state);globalThis.ticket=state.clubOffice.ticket;clubGate(false,340)");
assert.equal(r('JSON.stringify(state)'),r('before'),'ticket preview leaves the simulation untouched');
assert.ok(r('clubGate(false,160).attendance>clubGate(false,340).attendance'));
r("globalThis.baseline=clubForecast().cash;state.recruitment.deals.push({id:9001,status:'pending',fee:123456,salary:50000,years:2});");
assert.equal(r('baseline-clubForecast().cash'),123456,'reservations reduce cash forecast once');
assert.equal(r("clubDeskFinanceRows().some(row=>row.id==='transfer')"),false,'unpaid bids are not booked spending');
r("state.recruitment.deals=[];clubWorkspaceSet('finance','policy');clubDeskPick('policy',clubPriorityChoices().find(p=>p!=='balanced'))");
assert.equal(r('state.clubOffice.priority'),'balanced','selecting a policy never commits it');
r("deskNavigate('staff');globalThis.s=state.staff[2];globalThis.cash=state.money;clubDeskPick('staffPerson',s.personId)");
assert.equal(r('state.clubOffice.offer'),null);assert.equal(r('state.money'),r('cash'));
r("clubUI.staff='candidates';clubUI.role='scout';clubUI.query='';clubDeskStaffSort('coaching');globalThis.candidate=clubDeskStaffRows()[0];clubOpenOffer(candidate.personId)");
assert.equal(r('state.money'),r('cash'));assert.match(r('clubDeskStaff()'),/Granska personalavtal/);
r('clubDeskClose()');assert.equal(r('state.clubOffice.offer'),null);assert.equal(r('state.money'),r('cash'));
r("clubOpenOffer(candidate.personId);globalThis.fee=clubBuyout(state.staff.find(s=>s.id===candidate.id));clubSign()");
assert.equal(r('state.money'),r('cash-fee'));assert.equal(r('clubUI.staff'),'team');assert.equal(r('clubUI.staffPerson'),r('candidate.personId'));
r('clubSign()');assert.equal(r('state.money'),r('cash-fee'),'no duplicate severance');
r("state.season.phase='regular';state.managerCareer.status='unemployed';clubUI.manager='jobs';managerCreateJobs();globalThis.current=JSON.stringify(state);managerView()");
assert.equal(r('JSON.stringify(state)'),r('current'),'in-season job rendering is read-only and never emulates another phase');
assert.match(r('managerView()'),/Lediga tränarjobb/);
r("state.managerCareer.status='employed';state.managerCareer.pressure={active:true,points:3,targetPoints:6,played:2,matches:5,club:managerClub()};deskNavigate('board')");
assert.match(r('clubBoardWorkspace()'),/Ultimatum/);
r("save()");const loaded=boot(app.storage.value);assert.equal(loaded.run('state.staff.find(s=>s.id==="scout").personId'),r('candidate.personId'));
for(const page of ['finance','staff','board','manager']){r(`deskNavigate('${page}')`);assert.doesNotMatch(r('clubDeskFinance()+clubDeskStaff()+clubDeskBoard()+clubDeskManager()'),/undefined|NaN/);}
console.log('PASS: exact forecast components, read-only previews and selection, one-time staff signing, saved contracts and live career rendering.');
