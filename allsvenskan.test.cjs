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
const {run,storage}=boot();
const rows=run('Object.values(ALLSVENSKAN_DATABASE.clubs).flatMap(c=>c.players)');
assert.equal(rows.length,325);assert.equal(new Set(rows.map(p=>p.id)).size,325);
assert.equal(run('Object.keys(ALLSVENSKAN_DATABASE.clubs).length'),14);
for(const p of rows){
 assert.match(p.source,/^https:\/\/www.eliteprospects.com\/player\/\d+\//);
 assert.ok(p.stats.length>0&&p.stats.length<=6,p.name);
 assert.ok(p.stats.every(s=>s.gp>0&&['24-25','25-26'].includes(s.season)),p.name);
 assert.ok(p.stats.every(s=>run(`Number.isFinite(HA_LEAGUE_LEVEL[${JSON.stringify(s.league)}])`)),p.name);
}
// Facts are separate from simulated stats; every new club can field full units.
for(const club of run('Object.keys(CLUB_DATA)')){
 run(`startCareerWithClub(${JSON.stringify(club)});ensureLines();ensureSpecialTeams()`);
 assert.ok(run('goalies().length>=2&&defenders().length>=6&&forwards().length>=12'),club);
 assert.equal(run('state.lines.forwards.length'),12);assert.equal(run('state.lines.defense.length'),6);
 assert.ok(run('state.lines.forwards.every(id=>playerById(id))&&state.lines.defense.every(id=>playerById(id))&&!!playerById(state.lines.goalie)'),club);
 if(run('leagueOf()')!=='HA')continue;
 assert.ok(run('managerRoster().every(p=>!p.fictional&&p.research&&p.games===0&&p.goals===0&&p.assists===0)'),club);
 assert.ok(run('managerRoster().every(p=>Object.values(p.attributes).every(v=>Number.isInteger(v)&&v>=1&&v<=20))'),club);
 assert.ok(run('managerRoster().every(p=>Object.keys(p.attributes).length===(p.pos==="MV"?6:15))'),club);
 assert.ok(run('managerRoster().every(p=>p.contractYears>=1&&p.contractYears<=4&&p.age>=16&&p.age<=45)'),club);
 for(const html of run('[squadView(),linesView(),specialTeamsView(),...managerRoster().map(p=>assessmentPanel(p))]'))assert.ok(!/undefined|NaN|\bOVR\b/.test(html),club);
}
run('startCareerWithClub("AIK");globalThis.pooley=managerRoster().find(p=>p.name==="Scott Pooley");globalThis.gronlund=managerRoster().find(p=>p.name==="Anders Grönlund")');
assert.ok(run('pooley.attributes.shooting>gronlund.attributes.shooting'));
assert.ok(run('gronlund.attributes.positioning>pooley.attributes.positioning'));
assert.equal(run('pooley.research.stats.find(s=>s.season==="25-26").goals'),27);
assert.equal(run('pooley.research.stats.find(s=>s.season==="25-26").assists'),32);
assert.equal(run('Object.values(state.clubRosters).flat().filter(p=>p.name==="Jhonas Enroth").length'),1);
assert.equal(run('Object.values(state.clubRosters).flat().filter(p=>p.name==="Anton Olsson").length'),2); // different people
assert.equal(run('Object.values(state.clubRosters).flat().filter(p=>p.name==="Nathan Staios").length'),0);
// Same evidence produces same attributes regardless of name/ID; level matters.
run('globalThis.row=ALLSVENSKAN_DATABASE.clubs.AIK.players.find(p=>p.name==="Scott Pooley");globalThis.copy=JSON.parse(JSON.stringify(row));copy.name="Different";copy.id="different"');
assert.equal(run('JSON.stringify(haAttributeProfile(row))'),run('JSON.stringify(haAttributeProfile(copy))'));
run('copy.stats=copy.stats.map(s=>({...s,league:"SHL"}))');
assert.ok(run('haAttributeProfile(copy).shooting>haAttributeProfile(row).shooting'));
// A poor one-game goalie sample is retained and shrunk, not silently discarded.
run('globalThis.gSample={birth:"2000-01-01",position:"G",stats:[{season:"25-26",league:"HockeyAllsvenskan",gp:1,sv:.5}]};globalThis.poor=haAttributeProfile(gSample).reflexes;gSample.stats[0].sv=.9');
assert.ok(run('poor<haAttributeProfile(gSample).reflexes&&poor>=8'));
// Training changes live attributes, never the source or another new career.
run('globalThis.initial=pooley.attributes.shooting;pooley.attributes.shooting++;pooley.games=3;pooley.goals=2;globalThis.fresh=haRealRoster("AIK").find(p=>p.id===pooley.id)');
assert.equal(run('fresh.attributes.shooting'),run('initial'));
assert.equal(run('fresh.games'),0);
// Real transfers retain source history and trained attributes across reload.
run('state.money=1e9;state.boardPlan.offer.wageLimit=1e9;globalThis.target=state.clubRosters["BIK Karlskoga"].find(p=>p.name==="Eero Teräväinen");globalThis.sourceBefore=JSON.stringify(target.research);globalThis.signed=transferRecruitPlayer(target,"BIK Karlskoga","AIK",100000,900000,2,"Ordinarie");save()');
assert.ok(run('signed'));
const restored=boot(storage.value);
assert.equal(restored.run('getPlayerClub("ep-277055")'),'AIK');
assert.equal(restored.run('JSON.stringify(findPlayerAnywhere("ep-277055").research)'),run('sourceBefore'));
assert.equal(restored.run('findPlayerAnywhere("ep-135388").attributes.shooting'),run('initial+1'));
assert.equal(restored.run('findPlayerAnywhere("ep-135388").goals'),2);
assert.equal(restored.run('Object.values(state.clubRosters).flat().filter(p=>p.id==="ep-277055").length'),1);
// Old fictional worlds retain identities, training, contracts and a moved player.
run('startCareerWithClub("AIK");delete state.playerDatabaseVersion;for(const [club,,,strength] of ALLSVENSKAN_CLUBS)state.clubRosters[club]=leagueFictionalRoster(club,strength);syncManagerRoster();state.lines=null;state.specialTeams=null;globalThis.legacyPlayer=state.clubRosters.AIK.pop();legacyPlayer.club="HV71";legacyPlayer.salary=1234567;legacyPlayer.goals=9;legacyPlayer.attributes.shooting=18;state.clubRosters.HV71.push(legacyPlayer);save()');
const before=JSON.parse(storage.value),old=boot(storage.value),id=run('legacyPlayer.id');
assert.equal(old.run(`getPlayerClub(${JSON.stringify(id)})`),'HV71');
assert.equal(old.run(`findPlayerAnywhere(${JSON.stringify(id)}).salary`),1234567);
assert.equal(old.run(`findPlayerAnywhere(${JSON.stringify(id)}).goals`),9);
assert.equal(old.run(`findPlayerAnywhere(${JSON.stringify(id)}).attributes.shooting`),18);
assert.equal(old.run('state.clubRosters.AIK.length'),before.clubRosters.AIK.length);
assert.ok(old.run('state.clubRosters.AIK.every(p=>p.fictional)'));
assert.ok(old.run('leaguesView().includes("ny karriär")'));
// A save predating HA gets the compatible old complement, not duplicate real players.
const ancient=JSON.parse(storage.value);delete ancient.world;
for(const club of run('ALLSVENSKAN_CLUBS.map(c=>c[0])'))delete ancient.clubRosters[club];
ancient.managerClub='HV71';ancient.roster=ancient.clubRosters.HV71;
const migrated=boot(JSON.stringify(ancient));
assert.ok(migrated.run('state.clubRosters.AIK.every(p=>p.fictional)'));
assert.equal(migrated.run(`getPlayerClub(${JSON.stringify(id)})`),'HV71');
console.log('PASS: 325 sourced players, 14 HA clubs, all 28 lineups, role and league calibration, separate real stats, no new identity collisions, transfers/training/reload and untouched legacy careers.');
