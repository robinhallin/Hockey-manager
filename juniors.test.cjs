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
run('startCareerWithClub("HV71")');
assert.equal(run('state.juniors.roster.length'),20);
assert.equal(run('new Set(juniorPlayers().map(p=>p.id)).size'),20);
const original=run('JSON.stringify(state.juniors.roster)');run('juniorsView();render();save()');
assert.equal(run('JSON.stringify(state.juniors.roster)'),original);
const reload=boot(storage.value);assert.equal(reload.run('JSON.stringify(state.juniors.roster)'),original);
run('globalThis.p=state.juniors.roster.find(p=>p.pos==="C");state.juniors.selected=p.id;globalThis.base={...p.attributes};globalThis.progress=JSON.stringify(p.trainingProgress)');
run('juniorSet(p.id,"role","Spelfördelare");juniorTraining({type:"skills",intensity:"normal"},"test-pass")');
assert.notEqual(run('JSON.stringify(p.trainingProgress)'),run('progress'));
const progress=run('JSON.stringify(p.trainingProgress)');run('juniorTraining({type:"skills",intensity:"normal"},"test-pass")');assert.equal(run('JSON.stringify(p.trainingProgress)'),progress);
// Coach estimates differ; looking at reports never rerolls hidden development room.
const ceiling=run('JSON.stringify(p.academy.ceiling)');run('state.juniors.assessor="assistant";globalThis.reportA=juniorAssessment(p);state.juniors.assessor="goalie"');
assert.notEqual(run('juniorAssessment(p).potError'),run('reportA.potError'));
assert.equal(run('JSON.stringify(p.academy.ceiling)'),ceiling);
// Mentoring is bounded and needs attendance; loaned youngsters receive no parent mentoring.
run('globalThis.mentor=managerRoster().find(q=>q.age>=27&&q.pos!=="MV");juniorSet(p.id,"mentor",mentor.id)');assert.equal(run('juniorMentor(p).id'),run('mentor.id'));
run('mentor.trainingLoad="rest"');assert.equal(run('juniorMentor(p)'),null);run('mentor.trainingLoad="normal"');
run('globalThis.q=state.juniors.roster.find(q=>q.pos==="VF");globalThis.z=state.juniors.roster.find(q=>q.pos==="HF");juniorSet(q.id,"mentor",mentor.id);juniorSet(z.id,"mentor",mentor.id)');
assert.equal(run('z.academy.mentor'),null);
// Promotion moves the same player once, respects salary budget, and keeps contracts on return.
run('state.boardPlan.offer.wageLimit=annualWageCost();juniorPromote(p.id)');assert.equal(run('isOwnPlayer(p)'),false);
run('state.boardPlan.offer.wageLimit=annualWageCost()+1000000;globalThis.wages=annualWageCost();juniorPromote(p.id)');
assert.equal(run('isOwnPlayer(p)'),true);assert.equal(run('state.juniors.roster.some(q=>q.id===p.id)'),false);
assert.equal(run('annualWageCost()'),run('wages+p.salary'));
run('juniorPromote(p.id);juniorReturn(p.id)');assert.equal(run('isOwnPlayer(p)'),false);assert.equal(run('annualWageCost()'),run('wages+p.salary'));
run('juniorLoan(p.id,"local")');assert.equal(run('juniorMentor(p)'),null);assert.equal(run('managerRoster().some(q=>q.id===p.id)'),false);
const seed=run('state.juniors.rng');run('juniorsView();save()');assert.equal(run('state.juniors.rng'),seed);
run('createMatch();juniorRecall(p.id)');assert.equal(run('p.academy.path'),'loan');
// Completed senior games progress junior fixtures and loans exactly once, without senior points.
run('state.live.hv=3;state.live.opp=1;finishMatch(false)');
assert.equal(run('p.academy.loan.remaining'),7);assert.equal(run('state.juniors.matches.length'),1);
assert.equal(run('p.games'),0);assert.equal(run('p.goals'),0);
const fixture=run('JSON.stringify(state.juniors.matches)');run('juniorFixture("2026:1")');assert.equal(run('JSON.stringify(state.juniors.matches)'),fixture);
run('juniorRecall(p.id)');assert.equal(run('p.academy.path'),'junior');
assert.ok(run('state.juniors.matches.every(m=>m.players.reduce((n,p)=>n+p.goals,0)===m.own)'));
assert.ok(run('state.juniors.matches.every(m=>m.players.reduce((n,p)=>n+p.assists,0)<=m.own*2)'));
// Non-participants and injured players gain no game development. Recovery continues off the senior roster.
run('p.health.injury={remaining:3,readiness:55};p.health.clearance="rest";globalThis.injuredProgress=JSON.stringify(p.trainingProgress);juniorFixture("injury-fixture")');
assert.equal(run('p.academy.history[0].seconds'),0);assert.equal(run('JSON.stringify(p.trainingProgress)'),run('injuredProgress'));
run('medicalDay()');assert.equal(run('p.health.injury.remaining'),2);
// Whole time flow, then annual intake and exact-once aging.
run('p.health.injury=null;state.live=null;runTrainingSession();createMatch();state.live.hv=4;state.live.opp=1;finishMatch(false);globalThis.age=p.age;globalThis.count=state.juniors.roster.length;state.season.year++;juniorNewYear()');
assert.equal(run('p.age'),run('age+1'));assert.equal(run('state.juniors.roster.length'),run('count+6'));
run('juniorNewYear()');assert.equal(run('p.age'),run('age+1'));
run('state.season.year++;juniorNewYear()');assert.equal(run('state.juniors.roster.length'),30);
// Graduates over the age limit cannot quietly keep playing junior games.
run('p.age=21;juniorFixture("age-limit")');assert.equal(run('p.academy.history[0].seconds'),0);
run('save()');const migrated=JSON.parse(storage.value);delete migrated.juniors;
const old=boot(JSON.stringify(migrated));assert.equal(old.run('state.juniors.roster.length'),20);
for(const club of run('Object.keys(CLUB_DATA)')){
 run(`startCareerWithClub(${JSON.stringify(club)});state.page="juniors";render()`);
 assert.ok(!/undefined|NaN|\bOVR\b/.test(run('juniorsView()')),club);
 run('state.juniors.selected=state.juniors.roster.find(p=>p.pos==="MV").id');
 assert.ok(!/undefined|NaN/.test(run('juniorsView()')),club+' goalie');
}
console.log('PASS: junior creation/persistence, plans, uncertain reports, mentors, ownership/budgets, loans, actual participation, injuries, annual intake/aging/cap and 14 club views.');
// A second promotion must not count an existing salary commitment twice.
run('startCareerWithClub("HV71");globalThis.p=state.juniors.roster.find(p=>p.pos==="C");state.boardPlan.offer.wageLimit=annualWageCost()+p.salary;juniorPromote(p.id);juniorReturn(p.id);juniorPromote(p.id)');
assert.equal(run('isOwnPlayer(p)'),true);
const ageBefore=run('p.age');
run('state.season.phase="review";state.season.boardResult=[];beginPreseason()');
assert.equal(run('p.age'),ageBefore+1);
assert.equal(run('p.academy.path'),'senior');
// A benched graduate gets no match training, whereas junior minutes create progress.
run('globalThis.bench=JSON.stringify(p.trainingProgress);grantMatchDevelopment(p,0)');
assert.equal(run('JSON.stringify(p.trainingProgress)'),run('bench'));
run('globalThis.q=state.juniors.roster.find(q=>q.pos==="C");globalThis.beforeJunior=JSON.stringify(q.trainingProgress);juniorAppearance(q,1200,9,"Test J20")');
assert.notEqual(run('JSON.stringify(q.trainingProgress)'),run('beforeJunior'));
run('juniorSet(q.id,"load","rest");globalThis.restProgress=JSON.stringify(q.trainingProgress);juniorTraining({type:"skills",intensity:"normal"},"rest-test")');
assert.equal(run('JSON.stringify(q.trainingProgress)'),run('restProgress'));
// Loan maturity returns ownership once, without adding the player to the senior roster.
run('juniorSet(q.id,"load","normal");juniorLoan(q.id,"challenge");q.academy.loan.remaining=1;juniorFixture("loan-end")');
assert.equal(run('q.academy.path'),'junior');assert.equal(run('q.academy.loan'),null);
assert.equal(run('juniorPlayers().filter(p=>p.id===q.id).length'),1);
console.log('PASS: repeat promotion budget, graduate aging, benched development, rest and loan completion.');
