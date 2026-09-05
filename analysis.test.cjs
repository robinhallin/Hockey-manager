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
run('startCareerWithClub("HV71");createMatch();trackIceTime(60)');
assert.equal(run('state.live.analysis.partial'),false);
assert.equal(run('Object.values(state.live.analysis.players).reduce((n,p)=>n+p.seconds,0)'),360);
assert.equal(run('Object.values(state.live.analysis.units).length'),2);
const random=Math.random;
try {
 Math.random=()=>.99;
 run('hvShot(currentLinePlayers()[0],true);opponentShot(false,"Testspelare")');
 assert.equal(run('state.live.analysis.shots.length'),2);
 assert.equal(run('state.live.analysis.shots[0].outcome'),'save');
 Math.random=()=>0;
 run('hvShot(currentLinePlayers()[0],true)');
 assert.equal(run('state.live.analysis.shots[2].outcome'),'goal');
 assert.equal(run('Object.values(state.live.analysis.players).reduce((n,p)=>n+p.goals,0)'),1);
 assert.equal(run('Object.values(state.live.analysis.players).reduce((n,p)=>n+p.assists,0)'),1);
 run('state.live.penaltiesOpp=[120];trackIceTime(60);hvShot(currentLinePlayers()[0],true)');
 assert.equal(run('state.live.analysis.shots.at(-1).situation'),'pp');
 assert.equal(run('Object.values(state.live.analysis.units).find(u=>u.kind==="pp").goalsFor'),1);
 run('state.live.penaltiesOpp=[];state.live.currentLine=1;trackIceTime(30)');
 assert.equal(run('Object.values(state.live.analysis.units).filter(u=>u.kind==="forward").length'),2);
 // Rebounds produce a second actual attempt; a missed rebound is a save.
 run('globalThis.originalLocation=shotLocation;shotLocation=()=>({x:80,y:50,factor:1});globalThis.originalEffective=effectiveRating;effectiveRating=()=>75');
 const values=[.3,.1,.5,.99];Math.random=()=>values.shift()??.99;
 const before=run('state.live.shotsHV');
 run('hvShot(currentLinePlayers()[0],false)');
 assert.equal(run('state.live.shotsHV'),before+2);
 assert.equal(run('state.live.analysis.shots.at(-2).outcome'),'rebound');
 assert.equal(run('state.live.analysis.shots.at(-1).outcome'),'save');
 run('shotLocation=originalLocation;effectiveRating=originalEffective');
}finally{Math.random=random;}
assert.equal(run('state.live.analysis.shots.filter(s=>s.side==="own").length'),run('state.live.shotsHV'));
assert.equal(run('state.live.analysis.shots.filter(s=>s.side==="opponent").length'),run('state.live.shotsOpp'));
run('finishMatch(false)');
assert.equal(run('state.analysis.matches.length'),1);
assert.equal(run('state.analysis.matches[0].round'),1);
const archived=run('JSON.stringify(state.analysis.matches[0])');
run('finishAnalysis();state.live.analysis.shots[0].x=0;save()');
assert.equal(run('JSON.stringify(state.analysis.matches[0])'),archived);
assert.equal(run('state.analysis.matches.length'),1);
const reload=boot(storage.value);
assert.equal(reload.run('JSON.stringify(state.analysis.matches[0])'),archived);
assert.ok(!/undefined|NaN|\bOVR\b/.test(reload.run('statisticsView()')));
run('state.season.year++;state.analysis.window="season"');assert.equal(run('analysisSamples().length'),0);
// A pre-update save records only subsequent events, explicitly marked partial.
run('startCareerWithClub("Rögle");createMatch();state.live.minute=5;state.live.shotsHV=2;save()');
const legacy=JSON.parse(storage.value);delete legacy.analysis;delete legacy.live.analysis;
const migrated=boot(JSON.stringify(legacy));
assert.equal(migrated.run('state.live.analysis.partial'),true);
assert.equal(migrated.run('state.live.analysis.shots.length'),0);
for(const club of run('Object.keys(CLUB_DATA)')){
 run(`startCareerWithClub(${JSON.stringify(club)});createMatch();trackIceTime(15);hvShot(currentLinePlayers()[0],true);state.analysis.selected="live"`);
 assert.ok(!/undefined|NaN|\bOVR\b/.test(run('statisticsView()')),club);
}
// A whole engine-driven game must balance shot and minute ledgers.
run('startCareerWithClub("HV71");startMatch();for(let i=0;i<1500&&!state.live.finished;i++){if(!state.live.running)startMatch();liveStep()}');
assert.equal(run('state.live.finished'),true);
assert.equal(run('state.analysis.matches.length'),1);
assert.equal(run('state.analysis.matches[0].shots.length'),run('state.live.shotsHV+state.live.shotsOpp'));
assert.ok(run('Object.values(state.live.analysis.players).every(p=>p.seconds===(state.live.iceTime[p.id]||0))'));
assert.ok(!/undefined|NaN/.test(run('statisticsView()')));
console.log('PASS: shot outcomes and rebounds, goals/assists, real unit minutes, PP, archive/reload, partial migration, 14 clubs and complete match.');

// Penalties and shootouts retain their own semantics, without invented shot totals.
run('startCareerWithClub("HV71");createMatch();state.live.penaltiesHV=[120];trackIceTime(30)');
assert.equal(run('Object.values(state.live.analysis.units)[0].kind'),'pk');
try{Math.random=()=>0;run('simulatePenalty()');}finally{Math.random=random;}
assert.equal(run('state.live.analysis.events.at(-1).type'),'penalty');
assert.equal(run('Object.values(state.live.analysis.players).reduce((n,p)=>n+p.pim,0)'),2);
run('state.live.period=4;state.live.minute=5;state.live.second=0');
let toss=0;
try{Math.random=()=>toss++%2===0?0:.99;run('shootout()');}finally{Math.random=random;}
assert.equal(run('state.analysis.matches[0].shootout'),true);
assert.equal(run('state.analysis.matches[0].shots.length'),0);
assert.equal(run('state.analysis.matches[0].events.filter(e=>e.type==="decider").length'),1);
// The cap preserves the latest 80 real reports when the next match is archived.
run('state.analysis.matches=Array.from({length:80},(_,i)=>({...state.analysis.matches[0],players:[],events:[],units:[],shots:[],id:"old"+i}));createMatch();goalHV(currentLinePlayers()[0]);finishMatch(false)');
assert.equal(run('state.analysis.matches.length'),80);
assert.equal(run('state.analysis.matches.at(-1).id'),'old78');
console.log('PASS: PK, penalties, shootout exclusion and bounded archive.');

run('state.analysis.matches=Array.from({length:80},(_,i)=>({id:i,payload:"x".repeat(20000)}));trimAnalysisArchive()');
assert.ok(run('JSON.stringify(state.analysis.matches).length')<=1200000);
assert.equal(run('state.analysis.matches[0].id'),0);
console.log('PASS: archive storage budget retains newest reports.');
