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
run('startCareerWithClub("AIK")');
assert.equal(run('leagueOf()'),'HA');assert.equal(run('state.teams.length'),28);assert.equal(run('state.schedule.length'),728);
assert.equal(run('managerRoster().length'),24);assert.ok(run('managerRoster().every(p=>!p.fictional&&p.research)'));
for(const name of run('Object.keys(CLUB_DATA)')){
 const n=JSON.stringify(name);
 assert.equal(run(`state.schedule.filter(g=>g.home===${n}||g.away===${n}).length`),52);
 assert.equal(run(`state.schedule.filter(g=>g.home===${n}).length`),26);
}
assert.ok(run('state.schedule.every(g=>leagueOf(g.home)===leagueOf(g.away))'));
assert.equal(run('new Set(Object.values(state.clubRosters).flat().map(p=>String(p.id))).size'),run('Object.values(state.clubRosters).flat().length'));
// A full HA match uses the real manager engine and advances both leagues once.
run('startMatch();for(let i=0;i<1500&&!state.live.finished;i++){if(!state.live.running)startMatch();liveStep()}');
assert.ok(run('state.live.finished'));assert.ok(run('state.teams.every(t=>t.gp===1)'));
assert.equal(run('state.analysis.matches[0].club'),'AIK');
assert.ok(!/undefined|NaN/.test(run('tableView()+roundView()+leaguesView()+managerView()')));
// Migrating a midseason old world preserves every old fixture and adds catch-up only in HA.
run('save()');const old=JSON.parse(storage.value);old.managerClub='HV71';old.roster=old.clubRosters.HV71;delete old.world;
const lower=run('ALLSVENSKAN_CLUBS.map(c=>c[0])');old.teams=old.teams.filter(t=>!lower.includes(t.name));old.schedule=old.schedule.filter(g=>!lower.includes(g.home));for(const name of lower){delete old.clubRosters[name];delete old.recruitment.ai[name];}
const originals=JSON.stringify(old.schedule),cash=old.money,round=old.round;
const migrated=boot(JSON.stringify(old));assert.equal(migrated.run('state.money'),cash);assert.equal(migrated.run('state.round'),round);
assert.equal(migrated.run('JSON.stringify(state.schedule.filter(g=>leagueOf(g.home)==="SHL"))'),originals);
assert.ok(migrated.run('leagueTable("HA").every(t=>t.gp===state.round-1)'));
assert.ok(migrated.run('ALLSVENSKAN_CLUBS.every(c=>state.recruitment.ai[c[0]])'));
// Set the own club in the HA top six and HV71 last in SHL; both cups and SHL survival run together.
run('startCareerWithClub("AIK");state.schedule.forEach(g=>{g.played=true;g.homeGoals=2;g.awayGoals=1});for(const id of ["SHL","HA"])leagueTable(id).forEach((t,i)=>{t.gp=52;t.pts=100-i;t.gf=150;t.ga=130});team("AIK").pts=200;team("HV71").pts=0;state.round=53;enterPlayoffs()');
assert.equal(run('state.season.series.length'),5);
assert.equal(run('state.season.series.filter(s=>s.stage==="playout")[0].bestOf'),7);
assert.ok(run('state.world.cups.HA&&state.world.cups.SHL'));
const ownRoster=run('JSON.stringify(managerRoster().map(p=>[p.id,p.attributes]))');
for(let i=0;i<40&&run('state.season.phase')==='playoffs';i++){
 if(run('Boolean(currentSeasonFixture())'))run('createMatch();state.live.hv=5;state.live.opp=1;finishMatch(false)');else run('watchRemainingPlayoffs()');
}
assert.equal(run('state.season.phase'),'review');assert.equal(run('state.world.movement.up'),'AIK');
assert.ok(run('state.world.movement.down'));
assert.equal(run('leagueOf("AIK")'),'HA');
run('var relegated=state.world.movement.down;var salary=managerRoster()[0].salary;var beforeBudget=wageBudget();beginPreseason()');
assert.equal(run('leagueOf("AIK")'),'SHL');assert.equal(run('leagueOf(relegated)'),'HA');
assert.equal(run('Object.values(state.world.membership).filter(v=>v==="SHL").length'),14);
assert.equal(run('Object.values(state.world.membership).filter(v=>v==="HA").length'),14);
assert.equal(run('managerRoster()[0].salary'),run('salary'));
assert.ok(run('wageBudget()')>run('beforeBudget'));
assert.ok(run('state.clubRosters[relegated].some(p=>p.leagueRequest&&p.transferListed)'));
const promotionCash=run('state.money'),sponsor=run('state.clubOffice.sponsor');run('leagueApplyMovement();beginPreseason()');
assert.equal(run('state.money'),promotionCash);assert.equal(run('state.clubOffice.sponsor'),sponsor);
assert.equal(run('state.world.history.length'),1);
run('managerRoster().forEach(p=>p.contractYears=Math.max(1,p.contractYears));launchSeason()');
assert.equal(run('state.schedule.length'),728);
assert.ok(run('state.schedule.filter(g=>g.home==="AIK"||g.away==="AIK").every(g=>leagueOf(g.home)==="SHL"&&leagueOf(g.away)==="SHL")'));
assert.ok(run('state.teams.every(t=>t.gp===0)'));
assert.equal(run('state.boardPlan.offer.place'),12);
// SHL bottom club plays survival itself: never auto-simulate its fixture.
run('startCareerWithClub("HV71");state.schedule.forEach(g=>g.played=true);state.teams.forEach((t,i)=>{t.gp=52;t.pts=100-i});team("HV71").pts=-1;state.round=53;enterPlayoffs();var fixture=JSON.stringify(currentSeasonFixture());watchRemainingPlayoffs()');
assert.equal(run('currentSeasonFixture().stage'),'playout');assert.equal(run('JSON.stringify(currentSeasonFixture())'),run('fixture'));
run('createMatch();state.live.period=4;state.live.minute=5;state.live.hv=1;state.live.opp=1');assert.equal(run('currentLinePlayers().length+currentDefensePlayers().length'),5);
run('state.live.hv=1;state.live.opp=4;finishMatch(false)');assert.equal(run('state.analysis.matches[0].stage'),'SHL-kval');
for(let i=0;i<40&&run('state.season.phase')==='playoffs';i++){
 if(run('Boolean(currentSeasonFixture())'))run('createMatch();state.live.hv=1;state.live.opp=4;finishMatch(false)');else run('watchRemainingPlayoffs()');
}
assert.equal(run('state.world.movement.down'),'HV71');run('beginPreseason()');assert.equal(run('leagueOf()'),'HA');
assert.equal(run('state.clubOffice.operations'),5000000);
run('save()');const reload=boot(storage.value);assert.equal(reload.run('leagueOf()'),'HA');assert.equal(reload.run('state.world.history.length'),1);
assert.ok(!/undefined|NaN/.test(reload.run('leaguesView()+seasonView()')));
// A real legacy playoff save completes under its old bracket, then enables the new world.
run('startCareerWithClub("HV71");state.schedule.forEach(g=>g.played=true);state.teams.forEach((t,i)=>{t.gp=52;t.pts=100-i});team("HV71").pts=200;state.round=53;enterPlayoffs();save()');
const cupOld=JSON.parse(storage.value);delete cupOld.world;
cupOld.teams=cupOld.teams.filter(t=>!lower.includes(t.name));cupOld.schedule=cupOld.schedule.filter(g=>!lower.includes(g.home)&&g.stage!=="playout");cupOld.season.series=cupOld.season.series.filter(s=>s.league==='SHL'&&s.stage!=='playout');
for(const name of lower){delete cupOld.clubRosters[name];delete cupOld.recruitment.ai[name];}
const late=boot(JSON.stringify(cupOld));assert.equal(late.run('state.world.legacyCup'),true);
for(let i=0;i<40&&late.run('state.season.phase')==='playoffs';i++){
 if(late.run('Boolean(currentSeasonFixture())'))late.run('createMatch();state.live.hv=5;state.live.opp=1;finishMatch(false)');else late.run('watchRemainingPlayoffs()');
}
assert.equal(late.run('state.season.phase'),'review');assert.equal(late.run('state.world.movement'),null);
late.run('beginPreseason();managerRoster().forEach(p=>p.contractYears=Math.max(1,p.contractYears));launchSeason()');
assert.equal(late.run('state.world.legacyCup'),false);assert.equal(late.run('state.schedule.length'),728);
console.log('PASS: 28 clubs, 728 fixtures, unique researched rosters, full HA match, midseason and playoff migration, parallel playoffs, own survival/OT, promotion and relegation budgets/reactions, idempotent rollover and save/reload.');
