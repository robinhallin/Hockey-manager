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
run('startCareerWithClub("HV71")');
// Old saves migrate once, preserve identity, contracts and formations.
const legacy=JSON.parse(storage.value);
for(const roster of Object.values(legacy.clubRosters))for(const p of roster){delete p.attributes;delete p.attributeGrowth;}
delete legacy.assessmentVersion;delete legacy.staff;delete legacy.scoutReports;
const migrated=boot(JSON.stringify(legacy));
assert.equal(migrated.run('managerRoster()[0].salary'),legacy.clubRosters.HV71[0].salary);
assert.equal(migrated.run('Object.keys(managerRoster()[0].attributes).length'),6);
assert.equal(migrated.run('Object.keys(managerRoster().find(p=>p.pos!=="MV").attributes).length'),15);
run('globalThis.target=getTransferMarketPlayers()[0];globalThis.first=playerAssessment(target);requestScoutReport(target.id);requestScoutReport(target.id)');
assert.equal(run('state.scoutReports[String(target.id)].visits'),0);
assert.equal(run('state.scoutReports[String(target.id)].dueRound'),2);
run('advanceScoutReports()');assert.equal(run('state.scoutReports[String(target.id)].visits'),0);
run('state.round++;advanceScoutReports()');
assert.equal(run('state.scoutReports[String(target.id)].visits'),1);
assert.ok(run('playerAssessment(target).uncertainty<first.uncertainty'));
run('globalThis.before=matchAttributeRating(target);state.assessorId="goalie";globalThis.other=playerAssessment(target)');
assert.equal(run('matchAttributeRating(target)'),run('before'));
assert.notEqual(run('JSON.stringify(first.estimated)'),run('JSON.stringify(other.estimated)'));
run('save()');const reload=boot(storage.value);
assert.equal(reload.run(`state.scoutReports[${JSON.stringify(run('String(target.id)'))}].visits`),1);
assert.equal(reload.run('JSON.stringify(managerRoster()[0].attributes)'),run('JSON.stringify(managerRoster()[0].attributes)'));
// Same legacy overall, different role strengths and real match effects.
run('globalThis.p=managerRoster().find(p=>p.pos!=="MV");globalThis.q=JSON.parse(JSON.stringify(p));p.attributes.shooting=20;q.attributes.shooting=1');
assert.ok(run('matchAttributeRating(p,"shot")>matchAttributeRating(q,"shot")+20'));
run('globalThis.keeper=goalies()[0];globalThis.old=matchAttributeRating(keeper);keeper.attributes.reflexes=1');
assert.ok(run('matchAttributeRating(keeper)<old'));
// Every view renders for each club, no visible overall or exact potential.
for(const club of run('Object.keys(CLUB_DATA)')){
  run(`startCareerWithClub(${JSON.stringify(club)});ensureLines();state.selectedPlayer=managerRoster()[0].id;state.selectedMarketPlayer=getTransferMarketPlayers()[0].id`);
  for(const view of ['squadView','linesView','specialTeamsView','transfersView','marketPlayerView','scoutingView']){
    const html=run(`${view}()`);assert.ok(!/\bOVR\b|undefined|NaN/.test(html),`${club}: ${view}`);
  }
  run('selectPlayer(managerRoster()[0].id)');assert.ok(run('playerView().includes("PERSONALENS RAPPORT")'));
}
console.log('PASS: legacy migration, attribute persistence, scouting timing, assessor uncertainty, match effects and views for 14 clubs.');
