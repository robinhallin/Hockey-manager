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
const clubs=run('Object.keys(CLUB_DATA)');
for(const club of clubs){
  run(`startCareerWithClub(${JSON.stringify(club)});ensureSpecialTeams();createMatch();`);
  assert.equal(run('new Set(state.specialTeams.pp1.map(String)).size'),5);
  assert.equal(run('new Set(state.specialTeams.pk1.map(String)).size'),4);
  run('state.lines.goalie=goalies()[1].id');
  assert.equal(run('randomGoalie().id===goalies()[1].id'),true);
  run('state.live.penaltiesOpp=[120]');
  assert.equal(run('[...currentLinePlayers(),...currentDefensePlayers()].length'),5);
  run('state.live.penaltiesHV=[120,120];state.live.penaltiesOpp=[]');
  assert.equal(run('[...currentLinePlayers(),...currentDefensePlayers()].length'),3);
  run('trackIceTime(6)');
  assert.equal(run('Object.values(state.live.iceTime).reduce((a,b)=>a+b,0)'),24);
  run('changeSpecialPlayer("pp1",0,state.specialTeams.pp1[1])');
  assert.equal(run('new Set(state.specialTeams.pp1.map(String)).size'),5);
  run('state.page="specialTeams";render();save()');
}
const reload=boot(storage.value);
assert.equal(reload.run('state.specialTeams.pp1.length'),5);
run('startCareerWithClub("HV71");startMatch()');
run('for(let i=0;i<1500&&!state.live.finished;i++){if(!state.live.running)startMatch();liveStep()}');
assert.equal(run('state.live.finished'),true);
assert.equal(run('state.round'),2);
assert.equal(run('Object.values(state.live.iceTime).every(Number.isFinite)'),true);
console.log('PASS: 14 clubs, PP/PK counts, goalie selection, swaps, ice time, reload and complete match.');
