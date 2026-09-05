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
assert.equal(run('careerScreen'),'menu');
assert.equal(run('state.careerStarted'),false);
assert.ok(!run('careerMenuView()').includes('FORTSÄTT KARRIÄR'));
const initial=storage.value;
run('beginCareerSelection()');
assert.equal(storage.value,initial);
assert.equal(run('careerScreen'),'select');
assert.equal((run('careerClubSelectView()').match(/class="career-club-card/g)||[]).length,14);
for(const club of run('Object.keys(CLUB_DATA)')){
  run(`chooseCareerClub(${JSON.stringify(club)});careerReview()`);
  const html=run('careerReviewView()');
  assert.ok(html.includes(club));assert.ok(!/undefined|NaN/.test(html));
  assert.ok(html.includes('EKONOMI'));
  const cash=run('careerOffer(careerChoice,careerDraft.clubRosters).cash');
  const wageLimit=run('careerOffer(careerChoice,careerDraft.clubRosters).wageLimit');
  run('acceptCareer()');
  assert.equal(run('managerClub()'),club);
  assert.equal(run('state.money'),cash);
  assert.equal(run('wageBudget()'),wageLimit);
  assert.equal(run('careerScreen'),null);
  assert.ok(run('state.careerStarted'));
  assert.ok(!/undefined|NaN/.test(run('boardView()')));
  run('beginCareerSelection()');
}
// Browsing another job must not change the active career or save.
run('showCareerMenu();resumeCareer();state.round=7;save()');
const active=JSON.parse(storage.value);
run('beginCareerSelection();chooseCareerClub("HV71");showCareerMenu();resumeCareer()');
assert.equal(run('state.round'),7);assert.equal(run('managerClub()'),active.managerClub);
assert.equal(JSON.parse(storage.value).round,7);
// Accepting creates a recoverable previous career.
run('beginCareerSelection();chooseCareerClub("HV71");careerReview();acceptCareer()');
assert.equal(JSON.parse(storage.extra.hockey_manager_previous_career).round,7);
run('previousCareer()');assert.equal(run('state.round'),7);assert.equal(run('managerClub()'),active.managerClub);
// Old saves resume on the menu with their roster, money and old wage limit.
const old=JSON.parse(storage.value);delete old.careerStarted;delete old.boardPlan;old.page='squad';
const legacy=boot(JSON.stringify(old));
assert.equal(legacy.run('careerScreen'),'menu');assert.equal(legacy.run('state.careerStarted'),true);
legacy.run('resumeCareer()');assert.equal(legacy.run('state.page'),'squad');
assert.equal(legacy.run('state.money'),old.money);
legacy.run('initializeBoardPlan()');assert.equal(legacy.run('wageBudget()'),legacy.run('getClub().wageBudget'));
// Only actual youth ice time counts, and one match cannot be counted twice.
run('careerDraft=null;startCareerWithClub("HV71");createMatch();globalThis.young=managerRoster().find(p=>p.age<=23);state.live.finished=true;state.live.iceTime={[young.id]:299};recordBoardMatch()');
assert.equal(run('Object.keys(state.boardPlan.youthAppearances).length'),0);
run('state.round++;state.live.iceTime[young.id]=300;recordBoardMatch();recordBoardMatch()');
assert.equal(run('state.boardPlan.youthAppearances[String(young.id)].games'),1);
run('save()');const persisted=boot(storage.value);assert.equal(persisted.run('state.careerStarted'),true);assert.equal(persisted.run('Object.values(state.boardPlan.youthAppearances)[0].games'),1);
// Financial goals evaluate the actual finances; league goal uses season-end placement.
run('state.money=0');assert.equal(run('boardProgress().find(g=>g.id==="finance").met'),false);
run('state.money=state.boardPlan.offer.cashFloor;managerRoster().forEach(p=>p.salary=0)');
assert.equal(run('boardProgress().find(g=>g.id==="finance").met'),true);
assert.equal(run('boardProgress().find(g=>g.id==="league").status'),'Ej bedömt');
run('team(managerClub()).gp=52;team(managerClub()).pts=156');
assert.equal(run('boardProgress().find(g=>g.id==="league").status'),'Uppnått');
// Opening the menu safely pauses a live game.
run('careerDraft=null;startCareerWithClub("HV71");startMatch();showCareerMenu()');
assert.equal(run('state.live.running'),false);assert.equal(run('careerScreen'),'menu');
console.log('PASS: 14 career offers, exact budgets, menu/resume, legacy saves, prior-career recovery, real ice-time goals, financial and table objectives.');
