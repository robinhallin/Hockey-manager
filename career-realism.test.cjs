const assert=require('node:assert/strict');
const {boot}=require('./scripts/career-test-fixture.cjs');
function start(){const app=boot();app.run(`startCareerWithClub('HV71');state.calendar.date=calendarTarget();startMatch();state.page='match';`);return app;}
const current=start();
current.run(`for(let i=0;i<5000&&!studioEngine().battle;i++)studioStep();save();`);
assert.equal(current.run('Boolean(studioEngine().battle)'),true);
const resumed=boot(current.storage.value);resumed.run('startMatch();');
current.run('for(let i=0;i<200;i++)studioStep();');resumed.run('for(let i=0;i<200;i++)studioStep();');
const snapshot='JSON.stringify([studioEngine().rng,studioEngine().battle,studioEngine().stats,studioEngine().actors.map(a=>[a.id,a.x,a.y]),studioEngine().puck,state.live.analysis.shots])';
assert.equal(current.run(snapshot),resumed.run(snapshot));
console.log('PASS: a saved physical puck battle resumes with identical participants, decisions and statistics.');

const old=start();old.run(`for(let i=0;i<5000&&!studioEngine().flight;i++)studioStep();save();`);
const oldData=JSON.parse(old.storage.value),before=JSON.stringify([oldData.live.hv,oldData.live.opp,oldData.live.analysis.shots]),e=oldData.live.broadcast;
delete e.modelVersion;
for(const s of e.stats)for(const key of ['passAttempts','battles','battleWins','hits','blocks','dangerousRebounds','oneTimers','dumps'])delete s[key];
const migrated=boot(JSON.stringify(oldData));
assert.equal(migrated.run('studioEngine().modelVersion'),2);
assert.equal(migrated.run('studioEngine().partialRealism'),true);
assert.equal(migrated.run('JSON.stringify([state.live.hv,state.live.opp,state.live.analysis.shots])'),before);
assert.equal(migrated.run('studioEngine().stats[0].passAttempts+studioEngine().stats[1].passAttempts'),0);
migrated.run('startMatch();for(let i=0;i<1500;i++)studioStep();save();render();');
assert.equal(migrated.run('studioEngine().stats.every(s=>s.passes-(s.priorPasses||0)<=s.passAttempts)'),true);
assert.equal(migrated.run('!matchCentreView().match(/undefined|NaN/)'),true);
assert.equal(migrated.run('matchDetailedStats().includes("registrerats sedan")'),true);
console.log('PASS: a career5 save upgrades additively; pre-update passes do not inflate the new completion percentage.');

const shotApp=start();shotApp.run(`for(let i=0;i<10000&&!studioEngine().lastShot;i++)studioStep();pauseMatch();save();`);
assert.equal(shotApp.run('Boolean(studioEngine().lastShot?.context)'),true);
assert.equal(shotApp.run('state.live.analysis.shots.at(-1).shotType'),shotApp.run('studioEngine().lastShot.context.type'));
assert.equal(shotApp.run('studioShotView().includes(studioEngine().lastShot.player)'),true);
const shotSave=boot(shotApp.storage.value);
assert.equal(shotSave.run('JSON.stringify(studioEngine().lastShot)'),shotApp.run('JSON.stringify(studioEngine().lastShot)'));
assert.equal(shotSave.run('state.live.analysis.shots.length'),shotApp.run('state.live.analysis.shots.length'));
console.log('PASS: resolved shot explanation, actual keeper ledger and last replay survive saving without duplicate attempts.');

const rotation=start();
rotation.run(`var e=studioEngine();state.live.energy={players:Object.fromEntries(managerRoster().map(p=>[String(p.id),{level:85,shift:0,seconds:0}])),breaks:[]};
 e.teams[0].rotation=[0,1,2,3];e.teams[0].rotationIndex=0;
 for(const id of state.lines.forwards.slice(3,6))state.live.energy.players[String(id)].level=5;
 e.nextUnit(0);`);
assert.notEqual(rotation.run('e.teams[0].line'),1,'automatic rotation rests a spent line');
rotation.run('e.teams[0].nextLine=1;e.nextUnit(0);');
assert.equal(rotation.run('e.teams[0].line'),1,'an explicit coach order remains authoritative');
rotation.run(`var skater=e.skaters(0)[0];state.live.energy.players[String(skater.player.id)].shift=95;skater.shift=0;`);
assert.equal(rotation.run('e.shiftTime(skater)'),95,'reinstalling a formation cannot erase an unchanged skater’s actual continuous shift');
const energy=rotation.run(`var ps=studioPlayers(0,false);var p=ps[0];state.live.energy.players[String(p.id)].level=80;updateFatigue(20,ps,[]);var playing=matchEnergy(p);updateFatigue(40,[],[]);JSON.stringify({playing,rested:matchEnergy(p),shift:state.live.energy.players[String(p.id)].shift});`);
const levels=JSON.parse(energy);assert.ok(levels.playing<80);assert.ok(levels.rested>levels.playing);assert.equal(levels.shift,0);
console.log('PASS: automatic rotation rests exhausted lines, manual orders are respected and actual bench time restores energy.');
