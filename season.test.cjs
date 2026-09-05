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
  vm.runInContext(fs.readFileSync('script.js','utf8'),context);
  return {run:code=>vm.runInContext(code,context),storage};
}
const {run,storage}=boot();
function endRegular(club,rank){
 run(`startCareerWithClub(${JSON.stringify(club)});state.schedule.forEach(g=>{g.played=true;g.homeGoals=2;g.awayGoals=1});state.teams.forEach((t,i)=>{t.gp=52;t.pts=100-i;t.gf=150;t.ga=130});globalThis.other=state.teams.filter(t=>t.name!==managerClub()).sort((a,b)=>b.pts-a.pts);team(managerClub()).pts=${rank}===1?200:${rank}===14?0:(other[${rank}-2].pts-.5);state.round=53;enterPlayoffs()`);
}
endRegular('HV71',7);
assert.equal(run('state.season.phase'),'playoffs');
assert.equal(run('state.season.series.length'),2);
assert.equal(run('state.season.series[0].high'),'HV71');
assert.equal(run('currentSeasonFixture().away'),'HV71');
const fixture=run('JSON.stringify(currentSeasonFixture())');run('watchRemainingPlayoffs()');
assert.equal(run('JSON.stringify(currentSeasonFixture())'),fixture);
const table=run('JSON.stringify(state.teams.map(({strength,...standing})=>standing))');
run('createMatch();state.live.hv=4;state.live.opp=1;finishMatch(false)');
assert.equal(run('JSON.stringify(state.teams.map(({strength,...standing})=>standing))'),table);
assert.equal(run('state.season.series[0].winsHigh'),1);
assert.equal(run('state.analysis.matches[0].stage'),'Åttondelsfinal');
assert.equal(run('state.analysis.matches[0].own'),4);
assert.equal(run('currentSeasonFixture().home'),'HV71');
run('save()');const reload=boot(storage.value);
assert.equal(reload.run('state.season.series[0].winsHigh'),1);
// Win each manager game; simulate only other teams between stages.
for(let i=0;i<40&&run('state.season.phase')==='playoffs';i++){
 if(run('Boolean(currentSeasonFixture())'))run('createMatch();state.live.hv=5;state.live.opp=1;finishMatch(false)');
 else run('watchRemainingPlayoffs()');
}
assert.equal(run('state.season.champion'),'HV71');
assert.equal(run('state.season.phase'),'review');
assert.equal(run('state.season.archive.length'),1);
assert.equal(run('JSON.stringify(state.teams.map(({strength,...standing})=>standing))'),table);
assert.equal(run('state.season.series.filter(s=>s.stage==="quarter").length'),4);
assert.equal(run('state.season.series.filter(s=>s.stage==="semi").length'),2);
const archive=run('JSON.stringify(state.season.archive)');
const originalId=run('managerRoster()[0].id');const age=run('managerRoster()[0].age');run('managerRoster()[0].contractYears=1;beginPreseason()');
assert.equal(run(`managerRoster().find(p=>samePlayerId(p.id,${JSON.stringify(originalId)})).age`),age+1);
assert.equal(run('managerRoster()[0].contractYears'),0);
assert.equal(run('seasonLabel()'),'2027/28');
const cash=run('state.money');run('beginPreseason()');assert.equal(run('state.money'),cash);
run('launchSeason()');assert.equal(run('state.season.phase'),'preseason');
run('globalThis.expired=managerRoster().find(p=>p.contractYears===0);releaseExpiredPlayer(expired.id);signSeasonFreeAgent(expired.id)');
assert.equal(run('managerRoster().find(p=>samePlayerId(p.id,expired.id)).contractYears'),2);
run('managerRoster().forEach(p=>{if(p.contractYears===0)p.contractYears=2});launchSeason()');
assert.equal(run('state.season.phase'),'regular');
assert.equal(run('state.round'),1);
assert.equal(run('state.schedule.length'),364);
assert.equal(run('state.teams.every(t=>t.gp===0&&t.pts===0)'),true);
assert.equal(run('JSON.stringify(state.season.archive)'),archive);
assert.equal(run(`managerRoster().find(p=>samePlayerId(p.id,${JSON.stringify(originalId)})).age`),age+1);
assert.ok(run('Boolean(state.training)&&Boolean(state.boardPlan)'));
// The final regular fixture transitions through the real finish/continue path.
run('state.schedule.forEach(g=>{g.played=g.round<52;g.homeGoals=g.played?2:null;g.awayGoals=g.played?1:null});state.teams.forEach((t,i)=>{t.gp=51;t.pts=100-i});state.round=52;state.live=null;createMatch();state.live.hv=3;state.live.opp=1;finishMatch(false)');
assert.equal(run('state.round'),53);
assert.equal(run('state.schedule.every(g=>g.played)'),true);
run('managerContinue()');assert.equal(run('state.season.phase'),'playoffs');
for(let i=0;i<40&&run('state.season.phase')==='playoffs';i++){
 if(run('Boolean(currentSeasonFixture())'))run('createMatch();state.live.hv=1;state.live.opp=4;finishMatch(false)');
 else run('watchRemainingPlayoffs()');
}
assert.equal(run('state.season.archive.length'),2);
assert.equal(run('state.season.archive[0].year'),2027);
assert.equal(run('JSON.stringify(state.season.archive.slice(1))'),archive);
// No-playoff teams can finish a season too.
endRegular('Björklöven',14);run('watchRemainingPlayoffs()');
assert.equal(run('state.season.phase'),'review');
assert.ok(run('state.season.champion'));
// A top-six seed waits for the preliminary round, then gets a quarterfinal.
endRegular('Rögle BK',1);run('watchRemainingPlayoffs()');
assert.equal(run('state.season.stage'),'quarter');assert.ok(run('Boolean(currentSeasonFixture())'));
// Sudden death continues beyond five minutes and uses five skaters.
run('createMatch();state.live.period=4;state.live.minute=5;state.live.hv=1;state.live.opp=1');
assert.equal(run('currentLinePlayers().length+currentDefensePlayers().length'),5);
run('globalThis.originalAttack=simulateAttack;simulateAttack=()=>{};state.live.running=true;overtimeStep()');
assert.equal(run('state.live.finished'),false);
assert.equal(run('state.live.period'),4);
run('state.live.minute=19;state.live.second=59;overtimeStep()');
assert.equal(run('state.live.minute'),0);
assert.equal(run('state.live.running'),false);
assert.equal(run('state.live.overtimePeriods'),2);
assert.equal(run('Object.values(state.live.iceTime).every(Number.isFinite)'),true);
run('simulateAttack=originalAttack');
// Views, frozen goals and migration at a completed old season.
assert.ok(!/undefined|NaN/.test(run('seasonView()')));
run('state.money=0');assert.equal(run('JSON.stringify(boardProgress())'),run('JSON.stringify(state.season.boardResult)'));
const legacy=JSON.parse(storage.value);delete legacy.season;
const migrated=boot(JSON.stringify(legacy));assert.equal(migrated.run('state.season.year'),2026);
console.log('PASS: all playoff stages, home advantage, no manager auto-simulation, frozen league table/goals, save/reload, champion, contract expiry, year rollover and excluded teams.');
