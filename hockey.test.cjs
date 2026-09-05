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
  vm.runInContext(fs.readFileSync('leagues.js','utf8'),context);
  vm.runInContext(fs.readFileSync('script.js','utf8'),context);
  return {run:code=>vm.runInContext(code,context),storage};
}


const {run,storage}=boot();
run('startCareerWithClub("HV71");createMatch();globalThis.r=state.live.rink;r.owner="own";globalThis.a=rinkSkaters("own")[0];r.carrier=a.key;state.live.penaltiesOpp=[120];ensureRink();a=rinkSkaters("own")[0];r.carrier=a.key;a.x=78;a.y=45;globalThis.targets=hockeyTargets()');
const duties=run('Object.values(targets).map(t=>t.duty)');
assert.ok(duties.includes('Spel på blålinjen'));assert.ok(duties.includes('Framför mål'));assert.ok(duties.includes('Centralt alternativ'));
assert.equal(run('rinkSkaters("opponent").filter(p=>targets[p.key].duty==="Skyddar boxen").length'),4);
assert.ok(run('rinkSkaters("opponent").every(p=>rinkX("opponent",targets[p.key].x)<=30)'));
run('state.live.penaltiesOpp=[120,120];ensureRink();targets=hockeyTargets()');assert.equal(run('rinkSkaters("opponent").filter(p=>targets[p.key].duty==="Skyddar boxen").length'),3);
// Zone entry checks actual pre-entry positions, on either side of the rink.
run('state.live.penaltiesOpp=[];ensureRink();a=rinkSkaters("own")[0];globalThis.b=rinkSkaters("own")[1];r.previous=r.actors.map(p=>({key:p.key,x:50,y:50}));r.previous.find(p=>p.key===b.key).x=70');
assert.equal(run('hockeyEntry("own",{x:64,y:50},{x:68,y:50},a.key)'),true);
assert.equal(run('r.hockey.counts.offside.own'),1);assert.equal(run('r.faceoffX'),60);
run('r.previous.forEach(p=>p.x=50)');assert.equal(run('hockeyEntry("own",{x:64,y:50},{x:68,y:50},a.key)'),false);
run('a=rinkSkaters("opponent")[0];b=rinkSkaters("opponent")[1];r.previous.find(p=>p.key===b.key).x=30');
assert.equal(run('hockeyEntry("opponent",{x:36,y:50},{x:32,y:50},a.key)'),true);assert.equal(run('r.faceoffX'),40);
// Icing returns play to the offending team's end and disallows its lineup change.
run('a=rinkSkaters("own")[0];a.x=25;a.y=25;r.owner="own";r.carrier=a.key;hockeyClear(a)');
assert.equal(run('r.phase'),'icing');assert.equal(run('r.faceoffX'),24);
const line=run('state.live.currentLine');run('benchLine((state.live.currentLine+1)%4);rotateUnits()');assert.equal(run('state.live.currentLine'),line);
run('rinkFaceoff()');assert.equal(run('hockeyChangeBlocked()'),false);
// Clearing in boxplay is not icing and creates a loose puck, not instant possession.
run('state.live.penaltiesHV=[120];ensureRink();a=rinkSkaters("own")[0];a.x=20;a.y=25;r.owner="own";r.carrier=a.key;r.restart=false;hockeyClear(a)');
assert.equal(run('r.phase'),'clear');assert.equal(run('r.hockey.counts.icing.own'),1);assert.equal(run('r.hockey.counts.clear.own'),1);assert.equal(run('r.carrier'),null);
run('r.actors.filter(a=>a.pos!=="MV").forEach(a=>{a.x=20;a.y=50});hockeyRecover()');assert.equal(run('r.carrier'),null);
run('globalThis.chaser=rinkSkaters("own")[0];chaser.x=r.puck.x;chaser.y=r.puck.y;hockeyRecover()');assert.equal(run('r.carrier'),run('chaser.key'));
// Goalkeepers freeze under pressure; an unpressured keeper can play out.
run('state.live.penaltiesHV=[];ensureRink();globalThis.g=r.actors.find(a=>a.side==="opponent"&&a.pos==="MV");a=rinkSkaters("own")[0];a.x=g.x;a.y=g.y;hockeyKeeperSave("own")');
assert.equal(run('r.phase'),'freeze');assert.equal(run('r.hockey.counts.freeze.opponent'),1);
run('rinkSkaters("own").forEach(a=>{a.x=30;a.y=50});globalThis.realRoll=rinkRoll;rinkRoll=()=>.99;hockeyKeeperSave("own");rinkRoll=realRoll');assert.equal(run('r.phase'),'goalie');
run('rinkRoll=()=>0;hockeyDistribute();rinkRoll=realRoll');assert.equal(run('r.actors.find(a=>a.key===r.carrier).pos==="MV"'),false);
// Styles change movement targets and coaching pauses without altering already-played data.
run('r.owner="own";a=rinkSkaters("own")[0];a.x=45;a.y=50;r.carrier=a.key;r.hockey.transition=3;hockeySetStyle("control");globalThis.control=hockeyTargets()[a.key].x;hockeySetStyle("counter")');
assert.ok(run('hockeyTargets()[a.key].x')>run('control'));
run('state.live.running=true;hockeySetStyle("pressure")');assert.equal(run('state.live.running'),false);assert.equal(run('state.tacticalPlan.forecheck'),'aggressive');
const original=run('JSON.stringify(r.hockey)');run('rinkView();save();render()');assert.equal(run('JSON.stringify(r.hockey)'),original);
const reload=boot(storage.value);assert.equal(reload.run('JSON.stringify(state.live.rink.hockey)'),original);
const legacy=JSON.parse(storage.value);delete legacy.live.rink.hockey;
assert.ok(boot(JSON.stringify(legacy)).run('state.live.rink.hockey.counts'));
// An empty-net miss is never a fictional goalkeeper save.
const random=Math.random;try{Math.random=()=>.99;run('state.live.aiGoaliePulled=true;ensureRink();a=rinkSkaters("own")[0];rinkTakeShot(a)');assert.equal(run('state.live.analysis.shots.at(-1).outcome'),'wide');assert.ok(!/undefined|NaN/.test(run('statisticsView()')));}finally{Math.random=random;}
for(const club of run('Object.keys(CLUB_DATA)')){run(`startCareerWithClub(${JSON.stringify(club)});createMatch();state.live.penaltiesOpp=[120];ensureRink()`);assert.ok(!/undefined|NaN/.test(run('matchView()')),club);}
console.log('PASS: PP/PK roles, positional offside, icing/no-change/PK exemption, real loose-puck recovery, goalie control, styles, persistence/migration and 14 clubs.');
