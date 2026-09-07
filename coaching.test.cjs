// Match fixtures below explicitly set match day; daily progression is tested in daily-manager.test.cjs.
const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
// Legacy saved matches remain supported; current broadcast coverage is in career-match suites.
const {bootLegacy:boot}=require('./scripts/career-test-fixture.cjs');
const {run,storage}=boot();
const clubs=run('Object.keys(CLUB_DATA)');
for(const club of clubs){
  run(`startCareerWithClub(${JSON.stringify(club)});ensureSpecialTeams();(state.calendar.date=calendarTarget(),createMatch());`);
  assert.equal(run('new Set(state.specialTeams.pp1.map(String)).size'),5);
  assert.equal(run('new Set(state.specialTeams.pk1.map(String)).size'),4);
  run('state.lines.goalie=goalies()[1].id');
  assert.equal(run('randomGoalie().id===goalies()[1].id'),true);
  run('state.live.penaltiesOpp=[120]');
  assert.equal(run('[...currentLinePlayers(),...currentDefensePlayers()].length'),5);
  run('state.live.penaltiesHV=[120,120];state.live.penaltiesOpp=[]');
  assert.equal(run('[...currentLinePlayers(),...currentDefensePlayers()].length'),3);
  run('trackIceTime(6)');
  assert.equal(run('Object.values(state.live.iceTime).reduce((a,b)=>a+b,0)'),24);
  run('changeSpecialPlayer("pp1",0,state.specialTeams.pp1[1])');
  assert.equal(run('new Set(state.specialTeams.pp1.map(String)).size'),5);
  run('state.page="specialTeams";render();save()');
}
const reload=boot(storage.value);
assert.equal(reload.run('state.specialTeams.pp1.length'),5);
run('startCareerWithClub("HV71");(!state.live&&(state.calendar.date=calendarTarget()),startMatch())');
run('for(let i=0;i<1500&&!state.live.finished;i++){if(!state.live.running)(!state.live&&(state.calendar.date=calendarTarget()),startMatch());liveStep()}');
assert.equal(run('state.live.finished'),true);
assert.equal(run('state.round'),2);
assert.equal(run('Object.values(state.live.iceTime).every(Number.isFinite)'),true);
console.log('PASS: 14 clubs, PP/PK counts, goalie selection, swaps, ice time, reload and complete match.');
