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
  vm.runInContext(fs.readFileSync('allsvenskan-data.js','utf8'),context);
  vm.runInContext(fs.readFileSync('allsvenskan.js','utf8'),context);
  vm.runInContext(fs.readFileSync('leagues.js','utf8'),context);
  vm.runInContext(fs.readFileSync('player-world.js','utf8'),context);
  vm.runInContext(fs.readFileSync('script.js','utf8'),context);
  return {run:code=>vm.runInContext(code,context),storage};
}
const {run,storage}=boot();
run('beginCareerSelection();chooseCareerClub("HV71");careerReview();acceptCareer()');
assert.equal(run('state.managerCareer.status'),'employed');
assert.equal(run('managerSalary()'),600000);
const cash=run('state.money');run('managerView();save()');assert.equal(run('state.money'),cash);
const old=JSON.parse(storage.value);delete old.managerCareer;
const migrated=boot(JSON.stringify(old));assert.equal(migrated.run('state.money'),cash);assert.equal(migrated.run('state.managerCareer.history.length'),0);
run('managerProfile("<Robin>","youth")');assert.ok(run('managerView()').includes('&lt;Robin&gt;'));assert.equal(run('state.managerCareer.reputation'),25);
// Check-ins cannot be accelerated by opening screens or calling twice.
run('team(managerClub()).gp=8;managerCheckIn();var reviews=state.managerCareer.reviews.length;managerCheckIn();managerView()');
assert.equal(run('state.managerCareer.reviews.length'),run('reviews'));
// Two genuinely poor full-season reviews end the job at the offseason boundary.
run('state.season.boardResult=[{id:"league",met:false,progress:0,status:"Ej uppnått",title:"Resultat",detail:"Plats 14"},{id:"youth",met:false,progress:0,status:"Ej uppnått",title:"Talanger",detail:"Ingen istid"},{id:"finance",met:false,progress:0,status:"Ej uppnått",title:"Ekonomi",detail:"Underskott"}];state.season.standings=regularTable();state.season.champion="Rögle BK";managerSeasonReview();managerSeasonReview()');
assert.equal(run('state.managerCareer.badSeasons'),1);
assert.equal(run('state.managerCareer.decision'),null);
run('state.season.year++;managerSeasonReview()');assert.equal(run('state.managerCareer.decision'),'dismissed');
assert.equal(run('state.managerCareer.status'),'employed');
run('state.season.year++;state.season.phase="preseason";managerPreseason()');assert.equal(run('state.managerCareer.status'),'unemployed');
run('launchSeason();createMatch()');assert.equal(run('state.season.phase'),'preseason');assert.equal(run('state.live'),null);
const joblessCash=run('state.money');run('clubOpenOffer(state.clubOffice.market[0].personId);clubSign()');assert.equal(run('state.money'),joblessCash);
assert.equal(run('managerSalary()'),0);
// Rejections persist; advancing weeks eventually exposes a reachable building job.
run('state.managerCareer.reputation=5;for(let i=0;i<13;i++)managerJobWeek();var top=state.managerCareer.jobs.find(j=>j.min===50);managerInterview(top.id);managerInterviewAnswer("youth")');
assert.equal(run('state.managerCareer.interview.stage'),'rejected');
run('var target=state.managerCareer.jobs.find(j=>j.min===5);managerInterview(target.id);managerInterviewAnswer("balanced")');
assert.equal(run('state.managerCareer.interview.stage'),'offer');
// Preview is read-only, resources must be re-reviewed after a budget change.
const previousClub=run('managerClub()');run('var destination=target.club;var ids=state.clubRosters[destination].map(p=>p.id).join();var attrs=JSON.stringify(state.clubRosters[destination].map(p=>p.attributes));var academyIds=state.juniors.roster.map(p=>p.id).join();var oldCash=state.money;state.recruitment.ai[destination].cash+=1;managerAcceptJob()');
assert.equal(run('managerClub()'),previousClub);
// Pending transfers block movement; acceptance moves no players or player attributes.
run('state.recruitment.deals.push({status:"pending",fee:1});managerAcceptJob()');assert.equal(run('managerClub()'),previousClub);
run('state.recruitment.deals=[];var offerCash=state.managerCareer.interview.offer.cash;var oldSchedule=JSON.stringify(state.schedule);managerAcceptJob()');
assert.equal(run('managerClub()'),run('destination'));
assert.equal(run('state.money'),run('offerCash'));
assert.equal(run('state.clubRosters[destination].map(p=>p.id).join()'),run('ids'));
assert.equal(run('JSON.stringify(state.clubRosters[destination].map(p=>p.attributes))'),run('attrs'));
assert.equal(run('JSON.stringify(state.schedule)'),run('oldSchedule'));
assert.equal(run('state.managerCareer.bank["HV71"].juniors.roster.map(p=>p.id).join()'),run('academyIds'));
assert.equal(run('state.recruitment.ai["HV71"].cash'),run('oldCash'));
assert.ok(run('state.juniors.roster.every(p=>!state.managerCareer.bank["HV71"].juniors.roster.some(q=>q.id===p.id))'));
assert.equal(run('state.managerCareer.status'),'employed');
assert.ok(run('boardProgress().find(g=>g.id==="league").status')==='Ej bedömt');
assert.equal(run('state.managerCareer.name'),'<Robin>');
const movedCash=run('state.money');run('managerAcceptJob();managerJobWeek()');assert.equal(run('state.money'),movedCash);
assert.ok(run('state.managerCareer.message').includes('redan tillträtt'));
run('save()');const reload=boot(storage.value);assert.equal(reload.run('managerClub()'),run('destination'));assert.equal(reload.run('state.managerCareer.history.length'),run('state.managerCareer.history.length'));
// Contract renewal can be accepted during review or after expiration, before playing.
run('state.managerCareer.renewal={expires:clubYear()+3,salary:720000};state.managerCareer.decision=null;state.managerCareer.expires=clubYear();state.managerCareer.status="awaiting";managerAcceptRenewal()');
assert.equal(run('state.managerCareer.status'),'employed');assert.equal(run('managerSalary()'),720000);
assert.equal(run('state.managerCareer.expires'),run('clubYear()+3'));
// A return to an old club uses its live AI cash and its own academy, not a fresh budget.
run('state.season.year++;state.managerCareer.moveYear=null;state.managerCareer.jobs=[{id:"return",club:"HV71",min:5,status:"open",rank:14,reason:"Klubben söker ny tränare."}];state.recruitment.ai["HV71"].cash=1234567;managerInterview("return");managerInterviewAnswer("youth");managerAcceptJob()');
assert.equal(run('managerClub()'),'HV71');assert.equal(run('state.money'),1234567);
assert.equal(run('state.juniors.roster.map(p=>p.id).join()'),run('academyIds'));
assert.equal(run('state.staff.length'),5);
assert.ok(!/undefined|NaN/.test(run('managerView()+clubFinanceView()+clubStaffView()')));
// Start the new season and play the new employer's actual fixture through the engine.
run('for(const p of managerRoster())p.contractYears=Math.max(1,p.contractYears);launchSeason()');assert.equal(run('state.season.phase'),'regular');
assert.equal(run('state.managerCareer.startGames'),0);
run('startMatch();for(let i=0;i<1500&&!state.live.finished;i++){if(!state.live.running)startMatch();liveStep()}');assert.ok(run('state.live.finished'));
assert.ok(run('state.clubOffice.totals.manager')<0);
assert.equal(run('state.analysis.matches[0].club'),'HV71');
console.log('PASS: manager migration, check-ins, warnings/dismissal, unemployment guards, interviews, persistent world/club resources, return, renewal, save/reload and full match after job change.');
