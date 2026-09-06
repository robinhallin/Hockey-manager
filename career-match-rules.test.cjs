const {boot}=require('./scripts/career-test-fixture.cjs');const assert=require('node:assert/strict');
const app=boot(),run=app.run;
function fresh(){run('startCareerWithClub("HV71");state.calendar.date=calendarTarget();startMatch();globalThis.e=studioEngine();studioStep();');}
fresh();run('e.time=3599.9;e.duration=3600;e.periodStart=2400;e.stoppage=0;state.live.period=3;state.live.hv=state.live.opp=0;e.score=[0,0];studioStep();');
assert.equal(run('state.live.period'),4);assert.equal(run('state.live.running'),false);assert.equal(run('e.skaters(0).length'),3);assert.equal(run('e.skaters(1).length'),3);
run('e.givePenalty(1,e.skaters(1)[0].player.name)');assert.equal(run('e.skaters(0).length'),4);assert.equal(run('e.skaters(1).length'),3);
run('e.endPenalty();');assert.equal(run('e.skaters(0).length'),4);assert.equal(run('e.skaters(1).length'),4);
run('e.stop("stoppage","Test");e.changeAtStoppage();');assert.equal(run('e.skaters(0).length'),3);assert.equal(run('e.skaters(1).length'),3);
run('state.live.running=true;e.time=3899.9;e.stoppage=0;studioStep();');
assert.equal(run('state.live.finished'),true);assert.equal(run('Math.abs(state.live.hv-state.live.opp)'),1);assert.ok(run('state.live.analysisShootout'));
console.log('PASS: tied regulation → 3v3 OT, 4v3 powerplay, 4v4 until whistle, then shootout and career finish.');
// Every Swedish club can construct its own real first unit, without fixed HV IDs.
const clubs=run('state.teams.map(t=>t.name)');
for(const club of clubs){run(`startCareerWithClub(${JSON.stringify(club)});state.calendar.date=calendarTarget();startMatch();studioStep();`);
 assert.equal(run('studioEngine().skaters(0).length'),5,club);assert.equal(run('studioKeeper(0).id'),run('state.lines.goalie'),club);
 assert.equal(run('studioEngine().actors.every(a=>a.player&&a.role&&Number.isFinite(a.x))'),true,club);
 assert.equal(run('studioEngine().skaters(0).map(a=>String(a.player.id)).sort().join()'),run('[...state.lines.forwards.slice(0,3),...state.lines.defense.slice(0,2)].map(String).sort().join()'),club);
}
console.log('PASS: selected first line, defense and goalkeeper for all 28 SHL/Allsvenskan clubs.');
// Playoff OT remains 5v5 and continues until a goal, with no shootout.
fresh();run(`state.season.phase='playoffs';globalThis.fixture=state.schedule.find(g=>g.round===state.round&&(g.home===managerClub()||g.away===managerClub()));fixture.seriesId='studio-test';fixture.stage='quarter';
state.season.series=[{id:'studio-test',high:fixture.home,low:fixture.away,winsHigh:0,winsLow:0,bestOf:7,games:[],stage:'quarter'}];
e.time=3599.9;e.duration=3600;e.periodStart=2400;e.stoppage=0;state.live.period=3;e.score=[0,0];state.live.hv=state.live.opp=0;studioStep();`);
assert.equal(run('e.skaters(0).length'),5);assert.equal(run('e.duration'),4800);
run('state.live.running=true;e.time=4799.9;e.stoppage=0;studioStep();');assert.equal(run('state.live.finished'),false);assert.equal(run('state.live.overtimePeriods'),2);assert.equal(run('e.duration'),6000);
console.log('PASS: playoff overtime keeps five skaters and opens another 20-minute period on a tie.');
// Friendlies update reports but never award league points or career scoring totals.
fresh();run(`state.live=null;calendarInitialPreseason();calendarBookFriendly('AIK',calAdd(state.calendar.date,3));globalThis.friendly=state.calendar.friendlies.at(-1);state.calendar.date=friendly.date;calendarPlayFriendly(friendly.id);startMatch();globalThis.standings=JSON.stringify(state.teams);globalThis.totalGoals=managerRoster().reduce((s,p)=>s+(p.goals||0),0);globalThis.e=studioEngine();
e.time=3599.9;e.duration=3600;e.periodStart=2400;e.stoppage=0;state.live.period=3;e.score=[1,0];state.live.hv=1;state.live.opp=0;studioStep();`);
assert.equal(run('state.live.finished'),true);assert.equal(run('friendly.played'),true);assert.equal(run('JSON.stringify(state.teams)'),run('standings'));assert.equal(run('managerRoster().reduce((s,p)=>s+(p.goals||0),0)'),run('totalGoals'));
console.log('PASS: friendly finish uses calendar reporting and leaves league tables and career scoring intact.');
// A PP goal records the real scorer, distinct assists and keeper at impact, before ending PP.
fresh();run(`e.givePenalty(1,e.skaters(1)[0].player.name);e.stoppage=0;e.owner=0;globalThis.shooter=e.skaters(0)[1];globalThis.assisters=e.skaters(0).filter(a=>a!==shooter).slice(0,2);e.lastTouches=assisters.map(a=>({id:a.id,name:a.player.name,time:e.time,y:a.y}));e.puck={x:shooter.x,y:shooter.y};e.shoot(shooter);e.flight.shot.outcome='goal';globalThis.keeper=studioKeeper(1).id;while(e.flight)studioStep();`);
assert.equal(run('state.live.hv'),1);assert.equal(run('state.live.ppGoalsHV'),1);assert.equal(run('e.penalty'),null);
assert.equal(run('state.live.analysis.events.find(x=>x.type==="goal").situation'),'pp');
assert.equal(run('state.live.analysis.events.find(x=>x.type==="goal").assists.length'),2);
assert.equal(run('state.live.leagueBox.players[state.live.opponent+":"+keeper].against'),1);
assert.equal(run('state.live.analysis.shots.length'),1);assert.equal(run('studioPlayer(0,shooter.player.id).goals'),1);
console.log('PASS: PP goal, two assists, actual keeper against and PP expiry are credited exactly once.');
