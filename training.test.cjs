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
  vm.runInContext(fs.readFileSync('script.js','utf8'),context);
  return {run:code=>vm.runInContext(code,context),storage};
}
const {run,storage}=boot();
run('startCareerWithClub("HV71")');
assert.equal(run('state.training.day'),0);
assert.ok(run('state.training.messages.length>=2'));
// Sessions execute once and preserve progress on reload.
run('managerRoster().forEach(p=>p.fatigue=60);managerContinue()');
assert.equal(run('state.training.day'),1);
assert.equal(run('managerRoster()[0].fatigue'),35);
assert.equal(run('state.page'),'inbox');
const reload=boot(storage.value);
assert.equal(reload.run('state.training.day'),1);
assert.equal(reload.run('managerRoster()[0].fatigue'),35);
const oldPlan=run('JSON.stringify(state.training.plan[0])');
run('setTrainingSession(0,"type","physical")');
assert.equal(run('JSON.stringify(state.training.plan[0])'),oldPlan);
run('executeTrainingPeriod()');
assert.equal(run('state.training.day'),3);
const complete=run('JSON.stringify(managerRoster().map(p=>[p.attributes,p.trainingProgress,p.fatigue]))');
run('executeTrainingPeriod();managerContinue()');
assert.equal(run('JSON.stringify(managerRoster().map(p=>[p.attributes,p.trainingProgress,p.fatigue]))'),complete);
assert.equal(run('state.page'),'match');
// A live match cannot be paused to farm training.
run('startMatch();pauseMatch()');assert.equal(run('runTrainingSession()'),false);
// Individual rest gives recovery and zero XP even during hard team training.
run('startCareerWithClub("HV71");globalThis.p=managerRoster().find(p=>p.pos!=="MV");p.fatigue=50;p.trainingLoad="rest";setTrainingSession(0,"type","physical");setTrainingSession(0,"intensity","hard");runTrainingSession()');
assert.equal(run('p.fatigue'),25);assert.equal(run('Object.keys(p.trainingProgress).length'),0);
assert.ok(run('managerRoster().some(x=>x.trainingLoad!=="rest"&&x.fatigue>0)'));
// Real attributes improve at the threshold; assessor output is not the training truth.
run('p.trainingLoad="normal";p.developmentFocus="Skott";p.trainingProgress.shooting=99.9;p.attributes.shooting=12;globalThis.before=matchAttributeRating(p,"shot");setTrainingSession(1,"type","skills");runTrainingSession()');
assert.equal(run('p.attributes.shooting'),13);
assert.ok(run('matchAttributeRating(p,"shot")>before'));
assert.ok(run('state.training.messages.some(m=>m.category==="Utvecklingsrapport")'));
// Goalies train appropriate attributes and an invalid focus is rejected.
run('globalThis.g=goalies()[0];setDevelopmentFocus(g.id,"Reflexer");setDevelopmentFocus(g.id,"Skott")');
assert.equal(run('g.developmentFocus'),'Reflexer');
assert.equal(run('trainingTarget(g)'), 'reflexes');
// Teamwide resting cannot improve tactical readiness.
run('startCareerWithClub("HV71");managerRoster().forEach(p=>p.trainingLoad="rest");setTrainingSession(0,"type","tactics");globalThis.base=currentTrainingFamiliarity();runTrainingSession()');
assert.equal(run('currentTrainingFamiliarity()'),run('base'));
run('managerRoster().forEach(p=>p.trainingLoad="normal");setTrainingSession(1,"type","tactics");runTrainingSession()');
assert.ok(run('currentTrainingFamiliarity()>base'));
// Player conversations are actionable once; promises use actual ice time.
run('state.round=4;managerRoster().forEach(p=>p.happiness=50);ensureTrainingData();globalThis.msg=pendingManagerDecision()');
assert.ok(run('Boolean(msg)'));
const day=run('state.training.day');run('managerContinue()');assert.equal(run('state.training.day'),day);
run('answerPlayerConversation(msg.id,"promise");answerPlayerConversation(msg.id,"promise")');
assert.equal(run('state.training.promises.length'),1);
for(let i=0;i<3;i++){
 run('createMatch();state.live.finished=true;state.live.iceTime={[msg.playerId]:900};afterTrainingMatch();afterTrainingMatch();state.round++;ensureTrainingData()');
}
assert.equal(run('state.training.promises[0].games'),3);
assert.equal(run('state.training.promises[0].result'),'Uppfyllt');
// Minutes below the promise threshold do not qualify.
run('state.round=10;ensureTrainingData();globalThis.msg2=pendingManagerDecision();if(msg2)answerPlayerConversation(msg2.id,"honest");globalThis.v=managerRoster().find(p=>p.pos!=="MV");state.training.promises.push({playerId:v.id,name:v.name,startRound:10,games:0,qualified:0,resolved:false})');
for(let i=0;i<3;i++)run('createMatch();state.live.finished=true;state.live.iceTime={[v.id]:899};afterTrainingMatch();state.round++;ensureTrainingData()');
assert.equal(run('state.training.promises.at(-1).result'),'Brutet');
// Development requires real minutes, not just being dressed.
run('globalThis.x=managerRoster().find(p=>p.pos!=="MV");globalThis.xp=JSON.stringify(x.trainingProgress);grantMatchDevelopment(x,299)');
assert.equal(run('JSON.stringify(x.trainingProgress)'),run('xp'));
// Old careers migrate without changing money, roster or match results.
const old=JSON.parse(storage.value);delete old.training;
const migrated=boot(JSON.stringify(old));
assert.equal(migrated.run('state.money'),old.money);
assert.equal(migrated.run('state.round'),old.round);
assert.equal(migrated.run('managerRoster().length'),old.clubRosters[old.managerClub].length);
for(const club of run('Object.keys(CLUB_DATA)')){
 run(`startCareerWithClub(${JSON.stringify(club)})`);
 for(const view of ['trainingView','inboxView','dailyOverview'])assert.ok(!/undefined|NaN/.test(run(`${view}()`)),`${club}: ${view}`);
}
console.log('PASS: training persistence, once-only sessions, real growth, fatigue, goalkeeper focus, tactics, promises, legacy migration and 14 club views.');

// The complete loop advances three training days, scouting and the actual fixture once.
run('startCareerWithClub("HV71");globalThis.scouted=getTransferMarketPlayers()[0];requestScoutReport(scouted.id);executeTrainingPeriod();managerContinue();startMatch()');
run('for(let i=0;i<1500&&!state.live.finished;i++){if(!state.live.running)startMatch();liveStep()}');
assert.equal(run('state.live.finished'),true);
assert.equal(run('state.round'),2);
assert.equal(run('state.training.day'),0);
assert.equal(run('state.training.lastMatchRound'),1);
assert.ok(run('state.training.messages.some(m=>m.category==="Matchrapport")'));
assert.ok(run('state.training.messages.some(m=>m.category==="Chefsscout")'));
run('state.news.unshift("Ett nytt kontraktsbud väntar.");save()');
assert.ok(run('state.training.messages.some(m=>m.category==="Sportchef")'));
console.log('PASS: complete training → match → scouting → next training period and sport director inbox.');
