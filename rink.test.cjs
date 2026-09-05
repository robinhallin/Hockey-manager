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
run('startCareerWithClub("HV71");createMatch()');
assert.equal(run('state.live.rink.actors.length'),12);
const before=run('JSON.stringify(state.live.rink)');run('rinkView();render();save()');assert.equal(run('JSON.stringify(state.live.rink)'),before);
run('startMatch();liveStep()');
assert.equal(run('state.live.rink.frame'),1);assert.equal(run('state.live.rink.phase'),'faceoff');
assert.equal(run('state.live.faceoffsHV+state.live.faceoffsOpp'),1);
// Geometry and actual attributes change the pass and shot probabilities.
run('globalThis.r=state.live.rink;globalThis.a=rinkSkaters("own")[0];globalThis.b=rinkSkaters("own")[1];globalThis.d=rinkSkaters("opponent")[0];a.x=30;a.y=50;b.x=70;b.y=50;d.x=50;d.y=50;globalThis.player=rinkPlayer(a);globalThis.receiver=rinkPlayer(b)');
assert.ok(run('rinkLaneThreat(a,b,[d])')>0);
const blocked=run('rinkPassChance(a,b,[d])');run('d.y=90');assert.ok(run('rinkPassChance(a,b,[d])')>blocked);
run('player.attributes.passing=1;player.attributes.vision=1;receiver.attributes.puckControl=1;globalThis.low=rinkPassChance(a,b,[]);player.attributes.passing=20;player.attributes.vision=20;receiver.attributes.puckControl=20');
assert.ok(run('rinkPassChance(a,b,[])')>run('low'));
run('a.x=82;a.y=50;globalThis.slot=rinkShotLocation(a).factor;a.x=65;a.y=85');assert.ok(run('rinkShotLocation(a).factor')<run('slot'));
// A visible shot is the analysis shot, and only the actual recent passer gets an assist.
const random=Math.random;
try {
 Math.random=()=>0;
 run('a.x=82;a.y=50;r.lastPass={id:b.id,to:a.key,frame:r.frame};globalThis.savedRoll=rinkRoll;rinkRoll=()=>.99;rinkTakeShot(a);rinkRoll=savedRoll');
 assert.equal(run('state.live.analysis.shots.at(-1).x'),82);
 assert.equal(run('state.live.analysis.shots.at(-1).y'),50);
 assert.equal(run('state.live.analysis.shots.at(-1).outcome'),'goal');
 assert.equal(run('state.live.analysis.players[b.id].assists'),1);
 assert.equal(run('r.phase'),'goal');
 assert.equal(run('r.puck.x'),92);
}finally{Math.random=random;}
// PP/PK and pulled keepers display and use the real available skaters.
run('state.live.penaltiesOpp=[120];ensureRink()');assert.equal(run('rinkSkaters("opponent").length'),4);
run('state.live.penaltiesHV=[120,120];state.live.penaltiesOpp=[];ensureRink()');assert.equal(run('rinkSkaters("own").length'),3);
run('state.live.penaltiesHV=[];toggleGoalie();trackIceTime(6)');
assert.equal(run('rinkSkaters("own").length'),6);assert.equal(run('state.live.rink.actors.some(a=>a.side==="own"&&a.pos==="MV")'),false);
assert.equal(run('new Set(rinkOwnPlayers().map(p=>p.id)).size'),6);
run('toggleGoalie();state.live.aiGoaliePulled=true;ensureRink()');assert.equal(run('rinkSkaters("opponent").length'),6);
run('state.live.aiGoaliePulled=false;state.live.penaltiesOpp=[120];goalHV(currentLinePlayers()[0])');assert.equal(run('state.live.penaltiesOpp.length'),0);
// Pausing and reload preserve the possession, coordinates and random stream.
run('pauseMatch();save()');const frozen=run('JSON.stringify(state.live.rink)');run('liveStep()');assert.equal(run('JSON.stringify(state.live.rink)'),frozen);
const reload=boot(storage.value);assert.equal(reload.run('JSON.stringify(state.live.rink)'),frozen);
assert.equal(reload.run('state.live.running'),false);
// Full and highlights playback use identical physics and six-second game ticks.
run('startCareerWithClub("Rögle");createMatch();save()');const seedSave=storage.value;
const play=(mode,speed)=>{
 const game=boot(seedSave);let rng=12345;
 try{Math.random=()=>{rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng/4294967296;};
 game.run(`state.live.rink.mode="${mode}";state.live.speed=${speed};startMatch();for(let i=0;i<90;i++){if(!state.live.running)startMatch();liveStep()}`);
 return game.run('JSON.stringify({score:[state.live.hv,state.live.opp],clock:[state.live.minute,state.live.second],shots:state.live.analysis.shots,actors:state.live.rink.actors,puck:state.live.rink.puck,ice:state.live.iceTime})');
 }finally{Math.random=random;}
};
assert.equal(play('full',1),play('highlights',3));
// Saved pre-2D live matches gain a scene without losing the clock or score.
const legacy=JSON.parse(seedSave);delete legacy.live.rink;legacy.live.minute=7;legacy.live.hv=2;
const migrated=boot(JSON.stringify(legacy));assert.equal(migrated.run('state.live.minute'),7);assert.equal(migrated.run('state.live.hv'),2);assert.equal(migrated.run('state.live.rink.actors.length'),12);
for(const club of run('Object.keys(CLUB_DATA)')){
 run(`startCareerWithClub(${JSON.stringify(club)});createMatch();startMatch();for(let i=0;i<12;i++)liveStep()`);
 assert.ok(!/undefined|NaN/.test(run('matchView()')),club);
 assert.ok(run('state.live.rink.actors.every(a=>Number.isFinite(a.x)&&Number.isFinite(a.y)&&a.x>=6&&a.x<=94&&a.y>=10&&a.y<=90)'),club);
}
// Complete spatial match keeps the score, archive and individual ice time coherent.
run('startCareerWithClub("HV71");startMatch();for(let i=0;i<1500&&!state.live.finished;i++){if(!state.live.running)startMatch();liveStep()}');
assert.equal(run('state.live.finished'),true);
assert.equal(run('state.analysis.matches[0].shots.length'),run('state.live.shotsHV+state.live.shotsOpp'));
assert.ok(run('Object.values(state.live.analysis.players).every(p=>p.seconds===(state.live.iceTime[p.id]||0))'));
assert.ok(run('state.live.shotsHV+state.live.shotsOpp')>10);
console.log('PASS: spatial geometry/attributes, shots and assists, real PP/PK/extra skater, pause/reload, playback invariance, legacy migration, 14 club scenes and complete match.');
console.log(run('JSON.stringify({score:[state.live.hv,state.live.opp],shots:[state.live.shotsHV,state.live.shotsOpp],passes:state.live.rink.passes,frames:state.live.rink.frame})'));
// Team preparation contributes to decisions; tired players lose precision.
run('startCareerWithClub("HV71");createMatch();globalThis.a=rinkSkaters("own")[0];globalThis.p=rinkPlayer(a);p.fatigue=0;state.live.rink.teamBonus=0;globalThis.fresh=rinkAttribute(a,"passing");p.fatigue=70');
assert.ok(run('rinkAttribute(a,"passing")')<run('fresh'));
run('p.fatigue=0;state.live.rink.teamBonus=4');assert.ok(run('rinkAttribute(a,"passing")')>=run('fresh'));
// The opponent does not leave its net empty in a blowout; regular OT restores goalies.
run('state.live.period=3;state.live.minute=18;state.live.hv=6;state.live.opp=1;aiDecisions()');assert.equal(run('state.live.aiGoaliePulled'),false);
run('state.live.hv=2;aiDecisions()');assert.equal(run('state.live.aiGoaliePulled'),true);
run('state.live.hv=4;aiDecisions()');assert.equal(run('state.live.aiGoaliePulled'),false);
run('state.live.goaliePulled=true;state.live.aiGoaliePulled=true;startOvertime();ensureRink()');
assert.equal(run('state.live.goaliePulled||state.live.aiGoaliePulled'),false);
assert.equal(run('rinkSkaters("own").length'),3);
assert.equal(run('rinkSkaters("opponent").length'),3);
// A repeated playoff period retains sudden death and never calls the regular shootout.
run('state.season.phase="playoffs";state.season.stage="quarter";currentSeasonFixture().seriesId="rink-ot";currentSeasonFixture().stage="quarter";state.season.series=[{id:"rink-ot",stage:"quarter",high:managerClub(),low:state.live.opponent,winsHigh:0,winsLow:0,games:[],bestOf:7}];state.live.period=4;state.live.minute=19;state.live.second=59;state.live.hv=2;state.live.opp=2;state.live.running=true;overtimeStep()');
assert.equal(run('state.live.minute'),0);assert.equal(run('state.live.overtimePeriods'),2);assert.equal(run('state.live.running'),false);
console.log('PASS: fatigue/preparation, empty-net decisions, OT skaters and playoff period boundary.');
