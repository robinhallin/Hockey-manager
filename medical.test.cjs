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
run('startCareerWithClub("HV71");ensureLines();ensureSpecialTeams();globalThis.p=currentLinePlayers()[0]||forwards()[0];globalThis.originalRoll=medicalRoll;medicalRoll=()=>.999');
assert.equal(run('managerRoster().every(p=>p.health&&!p.health.injury)'),true);
// Persistent RNG and medical data do not move just by opening pages.
const day=run('state.medical.day'),rng=run('state.medical.rng');run('render();save();medicalView()');
assert.equal(run('state.medical.day'),day);assert.equal(run('state.medical.rng'),rng);
// Injuries remove the player from every unit and the goalie selection.
run('injurePlayer(p,"träning",3);ensureLines();ensureSpecialTeams()');
assert.equal(run('medicalReady(p)'),false);
assert.equal(run('Object.values(state.specialTeams).flat().some(id=>samePlayerId(id,p.id))'),false);
assert.equal(run('state.lines.forwards.some(id=>samePlayerId(id,p.id))'),false);
run('globalThis.keeper=playerById(state.lines.goalie);injurePlayer(keeper,"träning",3)');
assert.notEqual(run('randomGoalie().id'),run('keeper.id'));
// Injured players follow rehab rather than gaining XP from a hard team session.
run('globalThis.attributesBefore=JSON.stringify(p.attributes);globalThis.progressBefore=JSON.stringify(p.trainingProgress);state.training.plan[0]={type:"physical",intensity:"hard"};runTrainingSession()');
assert.equal(run('p.health.injury.remaining'),2);
assert.equal(run('JSON.stringify(p.attributes)'),run('attributesBefore'));
assert.equal(run('JSON.stringify(p.trainingProgress)'),run('progressBefore'));
run('save()');const reload=boot(storage.value);assert.equal(reload.run(`findPlayerAnywhere(${JSON.stringify(run('p.id'))}).health.injury.remaining`),2);
run('medicalDay();medicalDay()');assert.equal(run('medicalStatus(p)'),'Återgångsträning');assert.equal(run('medicalReady(p)'),false);
// Early full return is rejected. Limited return is capped at exactly ten minutes.
run('setMedicalClearance(p.id,"full")');assert.equal(run('p.health.clearance'),'rest');
run('setMedicalClearance(p.id,"limited");createMatch();changeLinePlayer("forwards",0,p.id);state.live.currentLine=0;state.live.iceTime={[p.id]:590};trackIceTime(15)');
assert.equal(run('state.live.iceTime[p.id]'),600);
assert.equal(run('medicalAvailable(p)'),false);
assert.equal(run('currentLinePlayers().some(q=>q.id===p.id)'),false);
run('setMedicalClearance(p.id,"full")');assert.equal(run('p.health.clearance'),'limited');
// Goalkeeper comeback has its own exact 30-minute cap and replacement.
run('startCareerWithClub("HV71");ensureLines();globalThis.returnGoalie=playerById(state.lines.goalie);injurePlayer(returnGoalie,"träning",1);medicalDay();setMedicalClearance(returnGoalie.id,"limited");createMatch();changeGoalie(returnGoalie.id);state.live.iceTime={[returnGoalie.id]:1795};trackIceTime(15)');
assert.equal(run('state.live.iceTime[returnGoalie.id]'),1800);
assert.notEqual(run('randomGoalie().id'),run('returnGoalie.id'));
// A genuine engine tick can cause an injury, pauses the clock and substitutes eligible players.
run('startCareerWithClub("HV71");startMatch();medicalRoll=()=>0;liveStep()');
assert.equal(run('state.live.running'),false);
assert.ok(run('state.live.medicalInjured.length>0'));
assert.ok(run('state.live.second>0'));
assert.equal(run('[...currentLinePlayers(),...currentDefensePlayers()].every(medicalAvailable)'),true);
assert.equal(run('new Set([...currentLinePlayers(),...currentDefensePlayers()].map(p=>p.id)).size'),5);
run('medicalRoll=()=>.999;goalHV(currentLinePlayers()[0])');
assert.equal(run('managerRoster().filter(p=>state.live.medicalInjured.includes(String(p.id))).every(p=>p.assists===0)'),true);
// Medically excused absence does not burn ordinary or recruitment promises.
run('startCareerWithClub("HV71");globalThis.promised=forwards()[0];injurePlayer(promised,"träning",8);createMatch();state.live.finished=true;state.live.iceTime={};state.training.promises.push({playerId:promised.id,startRound:state.round,games:0,qualified:0,resolved:false});promised.recruitmentPromise={role:"Ordinarie",minutes:12,games:0,qualified:0,resolved:false};globalThis.trust=promised.social.trust;afterTrainingMatch();afterTrainingMatch()');
assert.equal(run('state.training.promises.at(-1).games'),0);
assert.equal(run('promised.recruitmentPromise.games'),0);
assert.equal(run('promised.social.trust'),run('trust'));
assert.equal(run('promised.health.injury.remaining'),7);
// Preseason weeks heal once per day; the medical record survives season changes.
run('state.season.phase="preseason";globalThis.medDay=state.medical.day;recruitmentWeek()');
assert.equal(run('state.medical.day'),run('medDay+7'));assert.equal(run('promised.health.injury.remaining'),0);
run('medicalDay();medicalDay();medicalDay()');assert.equal(run('promised.health.injury'),null);
// Full comeback can suffer a setback and lose clearance.
run('state.live=null;injurePlayer(promised,"träning",1);medicalDay();medicalDay();medicalDay();setMedicalClearance(promised.id,"full");createMatch();changeLinePlayer("forwards",0,promised.id);state.live.currentLine=0;medicalRoll=()=>0;trackIceTime(6)');
assert.equal(run('promised.health.injury.name'),'Bakslag i återgången');assert.equal(run('promised.health.clearance'),'rest');
// All unavailable goalies cannot crash the engine; a loss and junior route remain available.
run('medicalRoll=()=>.999;goalies().forEach(p=>{p.health.injury=null;injurePlayer(p,"träning",8)});startMatch()');assert.equal(run('state.page'),'medical');
run('medicalConcede()');assert.equal(run('state.live.finished'),true);assert.ok(run('state.live.opp>state.live.hv'));
run('globalThis.total=managerRoster().length;medicalCallUp("MV");medicalCallUp("MV");medicalCallUp("MV")');
assert.equal(run('managerRoster().length'),run('total+2'));assert.equal(run('medicalMatchReady()'),true);
// Existing saves migrate without changing fatigue, contracts, attributes or identity.
run('save()');const legacy=JSON.parse(storage.value);delete legacy.medical;for(const roster of Object.values(legacy.clubRosters))for(const p of roster)delete p.health;
const migrated=boot(JSON.stringify(legacy));assert.equal(migrated.run('managerRoster()[0].salary'),legacy.clubRosters.HV71[0].salary);assert.ok(migrated.run('managerRoster().every(p=>p.health)'));
for(const club of run('Object.keys(CLUB_DATA)')){
 run(`startCareerWithClub(${JSON.stringify(club)});ensureLines();globalThis.patient=forwards()[0];injurePlayer(patient,"träning",3)`);
 assert.ok(!/undefined|NaN/.test(run('medicalView()')),club);
 assert.ok(!/undefined|NaN/.test(run('linesView()')),club);
}
console.log('PASS: medical migration, deterministic time, rehab, training exclusion, lineups/goalies/special teams, exact comeback cap, live injury pause, promises, setbacks, preseason, depleted squads and 14-club views.');
