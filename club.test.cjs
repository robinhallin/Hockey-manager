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
  vm.runInContext(fs.readFileSync('hockey.js','utf8'),context);
  vm.runInContext(fs.readFileSync('club.js','utf8'),context);
  vm.runInContext(fs.readFileSync('manager.js','utf8'),context);
  vm.runInContext(fs.readFileSync('script.js','utf8'),context);
  return {run:code=>vm.runInContext(code,context),storage};
}
const {run,storage}=boot();
run('beginCareerSelection();chooseCareerClub("HV71");careerReview();acceptCareer()');
assert.equal(run('state.staff.length'),5);
assert.equal(run('state.clubOffice.market.length'),15);
const originalCash=run('state.money');
const snapshot=run('JSON.stringify(state.clubOffice)');
run('clubFinanceView();clubStaffView();save();render()');
assert.equal(run('state.money'),originalCash);
assert.equal(run('JSON.stringify(state.clubOffice)'),snapshot);
const loaded=boot(storage.value);
assert.equal(loaded.run('state.money'),originalCash);
assert.equal(loaded.run('state.staff.length'),5);
// Hiring requires review, rejects low salary / short term / budget breach, charges once.
run('var candidate=state.clubOffice.market.find(c=>c.id==="assistant"&&c.minYears===2);clubOpenOffer(candidate.personId)');
assert.equal(run('state.money'),originalCash);
run('state.clubOffice.offer.salary=1;clubSign()');
assert.equal(run('state.staff[0].personId'),'assistant');
run('state.clubOffice.offer.salary=candidate.salary;state.clubOffice.offer.years=1;clubSign()');
assert.equal(run('state.staff[0].personId'),'assistant');
run('state.clubOffice.offer.years=2;var limit=state.clubOffice.staffLimit;state.clubOffice.staffLimit=1;clubSign()');
assert.equal(run('state.staff[0].personId'),'assistant');
run('state.clubOffice.staffLimit=limit;var compensation=clubBuyout(state.staff[0]);clubSign()');
assert.equal(run('state.staff[0].personId'),run('candidate.personId'));
assert.equal(run('state.money'),originalCash-run('compensation'));
const hiredCash=run('state.money');run('clubSign()');assert.equal(run('state.money'),hiredCash);
assert.equal(run('state.staff[0].coaching'),run('candidate.coaching'));
// Reserved funds and an unfinished match block staff changes.
run('clubOpenOffer(state.clubOffice.market.find(c=>c.id==="goalie").personId);state.recruitment.deals.push({status:"pending",fee:state.money});clubSign()');
assert.equal(run('state.staff.find(s=>s.id==="goalie").personId'),'goalie');
run('state.recruitment.deals=[];createMatch();clubSign()');
assert.equal(run('state.staff.find(s=>s.id==="goalie").personId'),'goalie');
run('state.live=null;state.clubOffice.offer=null');
// Explicit termination uses a reviewed compensation and retains an interim role.
run('clubRelease("scout");var exitFee=clubBuyout(state.staff.find(s=>s.id==="scout"));var preExit=state.money;clubSign()');
assert.equal(run('state.money'),run('preExit-exitFee'));
assert.equal(run('state.staff.find(s=>s.id==="scout").coaching'),8);
assert.equal(run('state.staff.find(s=>s.id==="scout").salary'),0);
// Policy effects and validity.
run('clubSetPolicy("priority","scouting")');assert.equal(run('clubMissionFee()'),20000);assert.equal(run('clubMissionLimit()'),3);
run('state.staff.find(s=>s.id==="scout").ability=18');assert.equal(run('clubMissionLimit()'),4);
run('clubSetPolicy("priority","first")');assert.equal(run('clubTrainingFactor()'),1.1);
run('clubSetPolicy("priority","youth")');assert.equal(run('clubJuniorFactor()'),1.15);
run('clubSetPolicy("ticket",160);var cheapAttendance=clubGate().attendance;clubSetPolicy("ticket",340)');assert.ok(run('clubGate().attendance')<run('cheapAttendance'));
run('clubSetPolicy("ticket",-1)');assert.equal(run('state.clubOffice.ticket'),340);
// Real entries: away fixtures have no gate, wages and income counted exactly once.
run('var away=state.schedule.find(g=>g.away===managerClub());state.round=away.round;createMatch();state.live.finished=true;var beforeAway=state.money;clubSettleMatch()');
assert.equal(run('state.clubOffice.totals.tickets||0'),0);
assert.equal(run('state.clubOffice.totals.players'),-Math.round(run('annualWageCost()/52')));
const afterAway=run('state.money');run('clubSettleMatch()');assert.equal(run('state.money'),afterAway);
run('var home=state.schedule.find(g=>g.home===managerClub());state.round=home.round;clubSettleMatch()');assert.ok(run('state.clubOffice.totals.tickets')>0);
// Playoffs only incur matchday costs and gates, annual wages are already allocated.
run('var salaries=state.clubOffice.totals.players;state.round=100;state.schedule.push({round:100,home:managerClub(),away:"Rögle BK",seriesId:"test"});clubSettleMatch()');
assert.equal(run('state.clubOffice.totals.players'),run('salaries'));
assert.equal(run('Math.round(state.money-state.clubOffice.opening)'),run('Object.values(state.clubOffice.totals).reduce((n,x)=>n+x,0)'));
// Migration preserves cash and attributes; no retrospective charges.
run('save()');const old=JSON.parse(storage.value);delete old.clubOffice;old.staff=old.staff.filter(s=>["assistant","scout","goalie"].includes(s.id));
const migrated=boot(JSON.stringify(old));assert.equal(migrated.run('state.money'),old.money);assert.equal(migrated.run('state.staff.length'),5);
// Fiscal rollover archives exactly once, expires contracts, preserves cash until grant.
run('state.season.year+=3;var rolloverCash=state.money;clubNewYear();clubNewYear()');
assert.equal(run('state.money'),run('rolloverCash'));assert.equal(run('state.clubOffice.archives.length'),1);
assert.ok(run('state.staff.every(s=>s.salary===0)'));
assert.equal(run('state.clubOffice.market.length'),15);
for(const club of run('Object.keys(CLUB_DATA)')){
 run(`beginCareerSelection();chooseCareerClub(${JSON.stringify(club)});careerReview();acceptCareer()`);
 assert.ok(!/undefined|NaN/.test(run('clubFinanceView()+clubStaffView()')));
 assert.ok(Number.isFinite(run('clubForecast().cash')));
 assert.equal(run('state.staff.length'),5);
}
// Personnel quality changes real development and recovery, not just profile numbers.
run('save()');const baseline=storage.value;
function seniorGain(skill,priority){const b=boot(baseline);return b.run(`
 state.staff.find(s=>s.id==="assistant").coaching=${skill};state.clubOffice.priority="${priority}";
 state.training.day=0;state.training.plan[0]={type:"skills",intensity:"normal"};
 var p=managerRoster().find(p=>p.pos!=="MV");p.fatigue=0;p.trainingProgress={};p.developmentFocus="Skott";p.attributes.shooting=8;
 medicalRoll=()=>1;runTrainingSession();p.trainingProgress.shooting;
 `);}
assert.ok(seniorGain(20,'balanced')>seniorGain(8,'balanced'));
assert.ok(seniorGain(14,'first')>seniorGain(14,'balanced'));
function juniorGain(skill,priority){const b=boot(baseline);return b.run(`
 state.staff.find(s=>s.id==="junior").coaching=${skill};state.clubOffice.priority="${priority}";
 var p=state.juniors.roster[0];p.fatigue=0;p.trainingProgress={};
 for(const k of Object.keys(p.attributes)){p.attributes[k]=8;p.academy.ceiling[k]=20;}
 juniorTraining({type:"skills",intensity:"normal"},"test-actual-coach");Object.values(p.trainingProgress).reduce((n,v)=>n+v,0);
 `);}
assert.ok(juniorGain(20,'balanced')>juniorGain(8,'balanced'));
assert.ok(juniorGain(12,'youth')>juniorGain(12,'balanced'));
function rehabGain(skill){const b=boot(baseline);return b.run(`
 state.staff.find(s=>s.id==="physio").coaching=${skill};var p=managerRoster()[0];
 p.health.injury={name:"Återgång",remaining:0,readiness:55};medicalDay();p.health.injury.readiness;
 `);}
assert.ok(rehabGain(20)>rehabGain(8));
// A renewal must extend the contract and cannot charge severance.
run('var assistant=state.staff.find(s=>s.id==="assistant");assistant.expires=clubYear()+1;clubRenew("assistant");var renewalCash=state.money;state.clubOffice.offer.years=1;clubSign()');
assert.equal(run('assistant.expires'),run('clubYear()+1'));
run('state.clubOffice.offer.years=2;clubSign()');
assert.equal(run('state.staff.find(s=>s.id==="assistant").expires'),run('clubYear()+2'));
assert.equal(run('state.money'),run('renewalCash'));
console.log('PASS: club finance, home/away and playoffs, ledgers, migration, personnel contracts and renewal, real training/rehab effects, priorities, rollover and 14 club views.');
