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
  vm.runInContext(fs.readFileSync('interface.js','utf8'),context);
  vm.runInContext(fs.readFileSync('league-statistics.js','utf8'),context);
  vm.runInContext(fs.readFileSync('lineup-board.js','utf8'),context);
  vm.runInContext(fs.readFileSync('match-centre.js','utf8'),context);
  vm.runInContext(fs.readFileSync('script.js','utf8'),context);
  return {run:code=>vm.runInContext(code,context),storage};
}
const {run,storage}=boot();
run('startCareerWithClub("HV71");ensurePlayerWorld()');
const original=run('JSON.stringify(state.clubRosters)');
run('save();render();ensurePlayerWorld()');assert.equal(run('JSON.stringify(state.clubRosters)'),original);
// Release, lookup, scouting, negotiations and budget reservation all share one identity.
run('globalThis.p=managerRoster()[4];p.contractYears=0;state.season.phase="preseason";state.calendar.date="2026-08-01";state.calendar.marketDay="2026-08-08";state.season.departures=[];releaseExpiredPlayer(p.id);state.money=100000000;state.season.nextWageLimit=100000000');
assert.equal(run('getPlayerClub(p.id)'), 'Kontraktslös');
assert.equal(run('findPlayerAnywhere(p.id)===p'),true);
assert.equal(run('getTransferMarketPlayers().filter(q=>samePlayerId(q.id,p.id)).length'),1);
assert.equal(run('recruitFee(p)'),0);
run('requestScoutReport(p.id);recruitmentWeek()');
assert.equal(run('state.scoutReports[String(p.id)].visits'),1);
run('submitRecruitOffer(p.id,1,recruitPlayerWishes(p).salary,2,"Nyckelspelare")');assert.equal(run('state.recruitment.deals.length'),0);
run('submitRecruitOffer(p.id,0,recruitPlayerWishes(p).salary*2,2,"Nyckelspelare");state.recruitment.deals[0].rival=null;globalThis.cash=state.money;calendarStep(true);calendarStep(true)');
assert.equal(run('state.recruitment.deals[0].status'),'signed');assert.equal(run('state.money'),run('cash'));
assert.equal(run('getPlayerClub(p.id)'),'HV71');assert.equal(run('worldIsFree(p.id)'),false);
// Reload/migration merges old club-specific pools once, retaining attributes and IDs.
run('globalThis.legacy=JSON.parse(JSON.stringify(state));delete legacy.playerWorld;legacy.season.freeAgents=[{...p,id:"legacy-free",club:"HV71",contractYears:0}];legacy.managerCareer.bank.Test={freeAgents:[{...p,id:"legacy-free"},{...p,id:"bank-free"}]}');
const legacy=boot(run('JSON.stringify(legacy)'));legacy.run('ensurePlayerWorld();save()');
assert.equal(legacy.run('state.playerWorld.freeAgents.length'),2);
assert.equal(legacy.run('state.playerWorld.freeAgents.find(p=>p.id==="legacy-free").attributes.shooting'),run('p.attributes.shooting'));
const reload=boot(legacy.storage.value);reload.run('ensurePlayerWorld()');assert.equal(reload.run('state.playerWorld.freeAgents.length'),2);
// Retirement, contract choices and replenishment at the real preseason entrypoint.
run('globalThis.veteran=managerRoster()[0];veteran.age=43;globalThis.aiClub="AIK";state.clubRosters[aiClub].forEach((p,i)=>{p.contractYears=1;if(i<3)p.age=43});state.season.phase="review";state.season.boardResult=[];beginPreseason()');
assert.equal(run('findPlayerAnywhere(veteran.id)'),null);
assert.equal(run('state.playerWorld.events.some(e=>samePlayerId(e.id,veteran.id)&&e.type==="retire")'),true);
assert.equal(run('state.playerWorld.summaries.length'),1);
assert.ok(run('state.playerWorld.summaries[0].renewed')>0);
assert.ok(run('state.playerWorld.summaries[0].released')>0);
assert.ok(run('state.playerWorld.summaries[0].intake')>0);
run('globalThis.snapshot=JSON.stringify(state.playerWorld);playerWorldNewYear();beginPreseason();save()');
assert.equal(run('JSON.stringify(state.playerWorld)'),run('snapshot'));
function integrity(){
 assert.equal(run('Object.values(state.recruitment.ai).every(b=>Number.isFinite(b.cash)&&Number.isFinite(b.wageLimit))'),true);
 assert.equal(run('Object.keys(state.recruitment.ai).every(c=>{const r=state.clubRosters[c];return r.filter(p=>p.pos==="MV").length>=2&&r.filter(p=>p.pos==="B").length>=6&&r.filter(p=>worldGroup(p)==="F").length>=12&&r.length<=30&&r.every(p=>p.contractYears>0)})'),true);
 assert.equal(run('(()=>{const ps=[...Object.values(state.clubRosters).flat(),...state.playerWorld.freeAgents];return ps.length===new Set(ps.map(p=>String(p.id))).size&&ps.every(p=>Object.values(p.attributes).every(n=>Number.isFinite(n)&&n>=1&&n<=20))})()'),true);
}
integrity();
// Ten offseason transitions: aging never repeats, market stays bounded, AI squads survive.
for(let i=0;i<10;i++){
 run('state.season.phase="review";state.season.boardResult=[];beginPreseason()');integrity();
 assert.ok(run('state.playerWorld.events.length')<=700);
 assert.ok(run('state.playerWorld.freeAgents.length')<500);
}
assert.ok(run('state.playerWorld.summaries.reduce((n,s)=>n+s.retired,0)')>20);
assert.equal(run('Object.values(state.clubRosters).flat().some(p=>p.age>=44)'),false);
run('save()');const saved=boot(storage.value);saved.run('ensurePlayerWorld()');
assert.equal(saved.run('state.playerWorld.freeAgents.length'),run('state.playerWorld.freeAgents.length'));
assert.equal(saved.run('state.season.freeAgents===state.playerWorld.freeAgents'),true);
// Injured free agents recover with world time, including generated players without prior health.
run('globalThis.free=state.playerWorld.freeAgents[0];delete free.health;ensureMedical();free.health.injury={remaining:1,readiness:50};medicalDay()');assert.equal(run('free.health.injury.remaining'),0);
for(const tab of ['free','world']){run(`recruitTab('${tab}')`);assert.doesNotMatch(run('recruitmentView()'),/NaN|undefined/);}
console.log('PASS: legacy global pool, free transfers/scouting/reservations, retirement, contract decisions, AI intakes, 11 years of unique playable rosters, recovery, reload and views.');
