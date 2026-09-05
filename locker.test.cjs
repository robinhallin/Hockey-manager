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
  vm.runInContext(fs.readFileSync('script.js','utf8'),context);
  return {run:code=>vm.runInContext(code,context),storage};
}
const {run,storage}=boot();
run('startCareerWithClub("HV71");ensureLines();globalThis.p=managerRoster().find(p=>p.pos!=="MV");globalThis.q=managerRoster().find(x=>x.pos!=="MV"&&x.id!==p.id)');
assert.ok(run('Boolean(state.locker.captainId)'));
assert.equal(run('Object.values(state.clubRosters).flat().every(p=>p.social&&p.social.trust===60)'),true);
const traits=run('JSON.stringify(p.social)');run('ensureLocker();render();save()');assert.equal(run('JSON.stringify(p.social)'),traits);
const reload=boot(storage.value);assert.equal(reload.run('JSON.stringify(managerRoster().find(p=>p.pos!=="MV").social)'),traits);
// Actual simultaneous ice time develops only the active skater pairs.
run('createMatch();globalThis.active=[...currentLinePlayers(),...currentDefensePlayers()];globalThis.a=active[0];globalThis.b=active[1];globalThis.unused=managerRoster().find(p=>p.pos!=="MV"&&!active.includes(p));trackIceTime(60)');
assert.equal(run('socialPair(a.id,b.id).seconds'),60);
assert.equal(run('socialPair(a.id,unused.id)'),undefined);
assert.ok(run('socialChemistry(active)>30'));
// Rested players do not receive training chemistry; repeated sessions are locked.
run('state.live=null;managerRoster().forEach(p=>p.trainingLoad="rest");globalThis.bond=socialPair(a.id,b.id).bond;state.training.plan[0]={type:"tactics",intensity:"normal"};runTrainingSession()');
assert.equal(run('socialPair(a.id,b.id).bond'),run('bond'));
run('managerRoster().forEach(p=>p.trainingLoad="normal");state.training.plan[1]={type:"tactics",intensity:"normal"};runTrainingSession()');
assert.ok(run('socialPair(a.id,b.id).bond>bond'));
// Team talks are once per real pause and react differently to personalities.
run('createMatch();a.social.sensitivity=20;b.social.sensitivity=1;teamTalk("support");globalThis.talk=JSON.stringify(state.live.socialTalks);globalThis.trust=a.social.trust;teamTalk("demand")');
assert.equal(run('JSON.stringify(state.live.socialTalks)'),run('talk'));assert.equal(run('a.social.trust'),run('trust'));
assert.ok(run('state.live.socialTalks.p1.reactions.find(x=>x.id===a.id).effect>state.live.socialTalks.p1.reactions.find(x=>x.id===b.id).effect'));
run('startMatch();pauseMatch()');assert.equal(run('canTeamTalk()'),false);
// Reach an actual intermission via the match engine, without shooting randomness.
run('state.live.minute=19;state.live.second=59;state.live.running=true;liveStep()');
assert.equal(run('state.live.period'),2);assert.equal(run('canTeamTalk()'),true);
run('state.live.hv=0;state.live.opp=2;teamTalk("praise")');
assert.equal(run('state.live.socialTalks.p2.reactions.every(x=>x.effect<0)'),true);
assert.ok(Math.abs(run('lockerMatchBonus()'))<=2);
run('state.live.finished=true;state.live.running=false;teamTalk("focus");globalThis.post=JSON.stringify(state.live.socialTalks.post);teamTalk("support")');
assert.equal(run('JSON.stringify(state.live.socialTalks.post)'),run('post'));assert.equal(run('lockerMatchBonus()'),0);
// Individual talks need evidence and cannot be farmed through repeat clicks/reloads.
run('state.live=null;p.social.lastTalk=-10;globalThis.before=p.social.trust;socialTalk(p.id,"praise")');
assert.equal(run('p.social.trust'),run('before-1'));
run('socialTalk(p.id,"listen")');assert.equal(run('p.social.trust'),run('before-1'));
run('state.locker.turn+=3;p.attributes.shooting++;socialTalk(p.id,"praise")');assert.ok(run('p.social.trust>before-1'));
// Changing the captain has consequences and a five-match cooldown.
run('globalThis.old=managerRoster().find(p=>samePlayerId(p.id,state.locker.captainId));globalThis.next=managerRoster().find(p=>p.id!==old.id);globalThis.oldTrust=old.social.trust;appointCaptain(next.id,"leadership")');
assert.equal(run('state.locker.captainId'),run('next.id'));assert.equal(run('old.social.trust'),run('oldTrust-4'));
run('appointCaptain(old.id,"rotation")');assert.equal(run('state.locker.captainId'),run('next.id'));
// Broken promises change trust once, even if match finalisation is repeated.
run('createMatch();state.live.finished=true;state.live.iceTime={};p.promisedRole="Breddspelare";state.training.promises.push({playerId:p.id,name:p.name,startRound:state.round,games:2,qualified:0,resolved:false});globalThis.promiseTrust=p.social.trust;afterTrainingMatch();globalThis.afterTrust=p.social.trust;afterTrainingMatch()');
assert.equal(run('p.social.trust'),run('afterTrust'));assert.ok(run('p.social.trust<=promiseTrust-7'));
assert.equal(run('state.training.promises.at(-1).lockerReviewed'),true);
// Departure of a captain leaves an explicit vacancy and retains other players' trust.
run('globalThis.capId=state.locker.captainId;state.clubRosters[managerClub()]=managerRoster().filter(p=>!samePlayerId(p.id,capId));syncManagerRoster();ensureLocker()');
assert.equal(run('state.locker.captainId'),null);
// Migration and all club screens remain valid without visible overall ratings.
const legacy=JSON.parse(storage.value);delete legacy.locker;
for(const roster of Object.values(legacy.clubRosters))for(const p of roster)delete p.social;
const migrated=boot(JSON.stringify(legacy));assert.ok(migrated.run('state.locker&&managerRoster().every(p=>p.social)'));
for(const club of run('Object.keys(CLUB_DATA)')){
 run(`startCareerWithClub(${JSON.stringify(club)});ensureLines();createMatch()`);
 for(const view of ['lockerView()','teamTalkPanel()','lockerPlayerPanel(managerRoster()[0])'])assert.ok(!/\bOVR\b|undefined|NaN/.test(run(view)),club+view);
}
console.log('PASS: personalities/migration, ice-time chemistry, training/rest, evidence-based talks, captain consequences, promises, real intermission, talk cooldowns, bounded match impact and 14-club views.');
