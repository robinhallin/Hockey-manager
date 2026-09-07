const {boot}=require('./scripts/career-test-fixture.cjs');
const assert=require('node:assert/strict');
function start(club='HV71'){const app=boot();app.run(`startCareerWithClub(${JSON.stringify(club)});state.calendar.date=calendarTarget();startMatch();state.page='match';`);return app;}
function check(app){
 assert.equal(app.run(`studioEngine().actors.every(a=>Number.isFinite(a.x)&&Number.isFinite(a.y)&&a.player&&a.role)`),true);
 assert.equal(app.run(`new Set(studioEngine().actors.map(a=>a.id)).size===studioEngine().actors.length`),true,'unique actors');
 assert.equal(app.run(`studioEngine().actors.filter(a=>a.side===0).every(a=>state.live.matchSquad.includes(String(a.player.id)))`),true,'only dressed players');
 assert.equal(app.run(`!matchCentreView().match(/undefined|NaN/)`),true,'valid UI');
}
const a=start('Rögle BK');
a.run('for(let i=0;i<1500;i++)studioStep();');check(a);
assert.equal(a.run('state.live.hv'),a.run('studioEngine().score[0]'));
// Save during a real puck flight / unit change and resume the identical simulation.
a.run('for(let i=0;i<5000&&!studioEngine().flight;i++){if(!state.live.running){while(medicalPending())medicalDecisionAccept();startMatch();}studioStep();}save();');
assert.ok(a.run('Boolean(studioEngine().flight)'), 'a puck flight occurs within the simulation budget');
const b=boot(a.storage.value);
assert.equal(b.run('state.live.running'),false);
assert.equal(b.run('studioEngine() instanceof CareerBroadcastMatch'),true);
b.run('startMatch();');
a.run('for(let i=0;i<400;i++)studioStep();');b.run('for(let i=0;i<400;i++)studioStep();');
assert.equal(a.run('JSON.stringify([studioEngine().rng,studioEngine().score,studioEngine().puck,studioEngine().actors.map(a=>[a.id,a.x,a.y]),state.live.analysis.shots])'),b.run('JSON.stringify([studioEngine().rng,studioEngine().score,studioEngine().puck,studioEngine().actors.map(a=>[a.id,a.x,a.y]),state.live.analysis.shots])'));
check(b);console.log('PASS: actual Rögle roster, selected lineup, saved puck flight resumes deterministically without duplicate stats.');
// Selected PP/PK units, penalized player excluded, real return through the penalty gate.
b.run(`globalThis.e=studioEngine();e.endPenalty(true);e.givePenalty(1,e.skaters(1)[0].player.name);`);
assert.deepEqual(b.run('e.skaters(0).map(a=>String(a.player.id)).sort().join()'),b.run('state.specialTeams["pp"+((e.teams[0].specialIndex||0)+1)].map(String).sort().join()'));
assert.equal(b.run('e.skaters(1).length'),4);check(b);
b.run('globalThis.offender=e.penalty.playerId;e.endPenalty();');
assert.equal(b.run('e.skaters(1).find(a=>String(a.player.id)===String(offender)).y'),29);
b.run('e.stop("stoppage","Test");e.givePenalty(0,e.skaters(0)[0].player.name);');
assert.equal(b.run('e.skaters(0).some(a=>String(a.player.id)===String(e.penalty.playerId))'),false);check(b);
b.run('e.endPenalty(true);');
// Goalie changes are committed at a whistle, and the actual keeper gets the saves.
b.run('globalThis.backup=e.teams[0].players.find(p=>p.pos==="MV"&&p.id!==e.teams[0].goalie.id);state.lines.goalie=backup.id;e.stop("stoppage","Test");studioSyncPlans();');
assert.equal(b.run('studioKeeper(0).id'),b.run('backup.id'));
b.run('studioRequestGoalie();');assert.equal(b.run('e.skaters(0).length'),6);assert.equal(b.run('studioKeeper(0)'),null);
b.run('studioRequestGoalie();');assert.equal(b.run('e.skaters(0).length'),5);assert.equal(b.run('studioKeeper(0).id'),b.run('backup.id'));
console.log('PASS: selected special teams, penalized player, penalty-box return, substitute goalie and six skaters.');
// Full uninterrupted periods use the regular career end-of-match path and ledger.
const full=start('HV71');
full.run(`globalThis.initialRound=state.round;globalThis.periods=new Set();globalThis.steps=0;
 while(!state.live.finished&&steps++<65000){periods.add(state.live.period);if(!state.live.running){while(medicalPending())medicalDecisionAccept();startMatch();}studioStep();}
`);
assert.equal(full.run('state.live.finished'),true);check(full);
assert.ok(full.run('periods.has(1)&&periods.has(2)&&periods.has(3)'));
assert.equal(full.run('state.round'),full.run('initialRound+1'));
assert.equal(full.run('state.live.leagueBox.saved'),true);
assert.equal(full.run('state.live.analysis.saved'),true);
assert.equal(full.run('state.live.analysis.events.filter(e=>e.type==="goal"&&e.side==="own").length'),full.run('studioEngine().score[0]'));
assert.equal(full.run('state.live.analysis.events.filter(e=>e.type==="goal"&&e.side==="opponent").length'),full.run('studioEngine().score[1]'));
assert.equal(full.run('Object.values(state.live.leagueBox.players).filter(p=>p.club===managerClub()).reduce((s,p)=>s+p.goals,0)'),full.run('studioEngine().score[0]'));
assert.ok(full.run('Object.values(state.live.iceTime).reduce((s,n)=>s+n,0)>15000'));
full.run('globalThis.recorded=JSON.stringify([state.teams,state.leagueStatistics,state.analysis.matches.length]);finishMatch(false);save();render();');
assert.equal(full.run('JSON.stringify([state.teams,state.leagueStatistics,state.analysis.matches.length])'),full.run('recorded'));
console.log('PASS: full three-period game, standings, both teams player statistics, performance grades and idempotent finish.',full.run('JSON.stringify({score:[state.live.hv,state.live.opp],shots:matchStats().shots,periods:[...periods],steps,saveBytes:JSON.stringify(state).length})'));
// Older saves keep their old match engine, score, clock and player records.
const old=start();old.run('delete state.live.broadcast;state.live.minute=12;state.live.hv=2;save();');const legacy=boot(old.storage.value);
assert.equal(legacy.run('studioActive()'),false);assert.equal(legacy.run('state.live.hv'),2);assert.equal(legacy.run('state.live.minute'),12);
console.log('PASS: unfinished legacy match retains its engine, clock and score.');
