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
  vm.runInContext(fs.readFileSync('calendar.js','utf8'),context);
  vm.runInContext(fs.readFileSync('savefiles.js','utf8'),context);
  vm.runInContext(fs.readFileSync('script.js','utf8'),context);
  return {run:code=>vm.runInContext(code,context),storage};
}
const {run,storage}=boot();run('startCareerWithClub("HV71")');
assert.equal(run('state.calendar.date'),'2026-09-07');
assert.equal(run('state.schedule.every(g=>/^202[67]-/.test(g.date))'),true);
run('globalThis.dateBefore=state.calendar.date;globalThis.historyBefore=state.training.history.length;runTrainingSession()');
assert.equal(run('state.calendar.date'),'2026-09-08');assert.equal(run('state.training.history.length-historyBefore'),1);
run('save();render()');assert.equal(run('state.calendar.date'),'2026-09-08');
const reloaded=boot(storage.value);assert.equal(reloaded.run('state.calendar.date'),'2026-09-08');
// Next event advances planned days and halts at the match, with no automatic fixture result.
run('calendarContinue()');assert.equal(run('state.calendar.date'),'2026-09-10');assert.equal(run('state.page'),'match');assert.equal(run('state.teams.some(t=>t.gp)'),false);
// Deadline applies both at submission and at completion, including incoming sales and free agents.
run('state.live=null;state.calendar.date="2027-02-14";state.money=1000000000;state.boardPlan.offer.wageLimit=1000000000;globalThis.target=state.clubRosters["AIK"].find(p=>p.pos==="B");target.transferListed=true;submitRecruitOffer(target.id,recruitFee(target),recruitPlayerWishes(target).salary*2,2,"Nyckelspelare");globalThis.offer=state.recruitment.deals[0];calendarStep(true);calendarStep(true)');
assert.equal(run('offer.status'),'rejected');assert.match(run('offer.reason'),/stängning/);assert.equal(run('getPlayerClub(target.id)'),'AIK');
run('globalThis.dealCount=state.recruitment.deals.length;submitRecruitOffer(target.id,recruitFee(target),recruitPlayerWishes(target).salary*2,2,"Nyckelspelare")');assert.equal(run('state.recruitment.deals.length'),run('dealCount'));
// Future agreement leaves ownership and current wages intact, then activates exactly once.
run('target.contractYears=1;submitFutureOffer(target.id,recruitPlayerWishes(target).salary*2,2,"Nyckelspelare");globalThis.future=state.recruitment.deals[0];future.rival=null;calendarStep(true);calendarStep(true)');
assert.equal(run('future.status'),'future_signed');assert.equal(run('getPlayerClub(target.id)'),'AIK');assert.equal(run('target.futureContract.buyer'),'HV71');assert.doesNotMatch(run('recruitDealsView()'),/undefined|NaN/);
run('state.season.phase="review";state.season.boardResult=[];beginPreseason()');assert.equal(run('getPlayerClub(target.id)'),'HV71');assert.equal(run('target.contractYears'),2);
run('globalThis.wages=annualWageCost();calendarActivateFuture()');assert.equal(run('annualWageCost()'),run('wages'));
assert.equal(run('Object.values(state.clubRosters).flat().filter(p=>samePlayerId(p.id,target.id)).length'),1);
// A full 2D preseason game keeps season standings and player production intact.
run('startCareerWithClub("HV71");calendarInitialPreseason();calendarBookFriendly("AIK","2026-08-04");globalThis.f=state.calendar.friendlies[0];calendarContinue();if(!state.live)calendarPlayFriendly(f.id);globalThis.table=JSON.stringify(state.teams);globalThis.prod=JSON.stringify(Object.values(state.clubRosters).flat().map(p=>[p.id,p.goals||0,p.assists||0,p.games||0]));startMatch()');
assert.equal(run('state.live.friendly'),true);
run('for(let i=0;i<1800&&!state.live.finished;i++){if(!state.live.running){if(!medicalMatchReady()){medicalConcede();break;}state.live.running=true;}liveStep()}');
assert.equal(run('state.live.finished'),true);assert.equal(run('f.played'),true);
assert.equal(run('JSON.stringify(state.teams)'),run('table'));
assert.equal(run('JSON.stringify(Object.values(state.clubRosters).flat().map(p=>[p.id,p.goals||0,p.assists||0,p.games||0]))'),run('prod'));
assert.equal(run('state.round'),1);assert.equal(run('state.analysis.matches[0].friendly'),true);run('globalThis.afterFriendlyDate=state.calendar.date;state.season.phase="regular";calendarInitialPreseason()');assert.equal(run('state.calendar.date'),run('afterFriendlyDate'));run('state.season.phase="preseason"');
assert.equal(run('analysisSamples().length'),0);assert.ok(run('Object.values(state.live.iceTime).reduce((n,x)=>n+x,0)')>0);
// Back-to-back dates limit preparation. Existing partially played saves preserve result/time.
run('state.season.phase="regular";state.live=null;state.round=2;state.calendar.date="2026-09-11";state.training.calendarKey=null;state.training.day=0;ensureTrainingData()');assert.equal(run('trainingDays()'),1);
run('createMatch();state.live.minute=12;state.live.hv=2;save()');const paused=boot(storage.value);
assert.equal(paused.run('state.live.minute'),12);assert.equal(paused.run('state.live.hv'),2);assert.equal(paused.run('state.live.running'),false);
// Export/import accepts our file, validates before changing state, and rejects injection/bad structure.
const text=run('saveExportText()');assert.equal(run(`validateSaveText(${JSON.stringify(text)}).managerClub`),'HV71');
assert.throws(()=>run('validateSaveText("{}")'));
assert.throws(()=>run(`validateSaveText(${JSON.stringify(text.replace('"HV71"','"<img src=x onerror=alert(1)>"'))})`));
run('saveFilePreview=validateSaveText(saveExportText());applyCareerImport()');assert.equal(run('state.managerClub'),'HV71');assert.equal(run('saveFilePreview'),null);assert.match(run('saveFileNotice'),/inläst/);
const oldSave=run('JSON.stringify(state)');run('saveFilePreview={...JSON.parse(JSON.stringify(state)),schedule:null};applyCareerImport()');assert.equal(run('JSON.stringify(state)'),oldSave);
run('globalThis.originalSet=localStorage.setItem;saveFilePreview=validateSaveText(saveExportText());localStorage.setItem=(k,v)=>{if(k===CAREER_SAVE_KEY)throw Error("quota");originalSet(k,v)};applyCareerImport();localStorage.setItem=originalSet');assert.match(run('saveFileNotice'),/avbröts/);
const empty=boot();empty.run('showSaveFiles()');assert.doesNotMatch(empty.run('saveSettingsView()'),/undefined|NaN/);
console.log('PASS: dates, once-only training, event continuation, deadline boundaries, future arrivals, full 2D friendly/stat isolation, tight schedule, paused reload and safe save import/export.');
