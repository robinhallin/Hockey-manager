// Match fixtures below explicitly set match day; daily progression is tested in daily-manager.test.cjs.
const fs=require('node:fs'),assert=require('node:assert/strict');
const {boot}=require('./scripts/career-test-fixture.cjs');
function game(club='HV71'){const app=boot();app.run(`startCareerWithClub(${JSON.stringify(club)})`);return app;}
const app=game(),{run,get}=app;
assert.equal(run('Object.keys(state.rivals.clubs).length'),28);
run('globalThis.clean=JSON.stringify([state.calendar,state.clubRosters,state.rivals,state.schedule]);rivalsOpen(null);render();render()');
assert.equal(run('JSON.stringify([state.calendar,state.clubRosters,state.rivals,state.schedule])'),run('clean'));
assert.match(get('#content').innerHTML,/Motståndsrapport/);assert.doesNotMatch(get('#content').innerHTML,/undefined|NaN/);
// All clubs use a legal, unique selection and keep medically unavailable players off the ice.
const clubs=run('Object.keys(state.rivals.clubs)');
for(const club of clubs){
 run(`startCareerWithClub(${JSON.stringify(club)});(!state.live&&(state.calendar.date=calendarTarget()),startMatch());globalThis.enemy=state.live.opponent;globalThis.keeper=rivalLiveKeeper();globalThis.skater=rinkOpponentPlayers().find(p=>p.pos!=='MV');keeper.health.injury={remaining:7};skater.health.injury={remaining:7};rinkSync()`);
 assert.equal(run('rinkOpponentPlayers().some(p=>!medicalReady(p))'),false,club);
 assert.equal(run('rinkOpponentPlayers().length'),6,club);
 assert.equal(run('new Set(rinkOpponentPlayers().map(p=>String(p.id))).size'),6);
 assert.notEqual(run('leagueKeeper("opponent").id'),run('keeper.id'));
 run('globalThis.line=JSON.stringify(rinkOpponentPlayers().map(p=>p.id));state.live.rotationIndex+=7;state.live.currentLine=3');
 assert.equal(run('JSON.stringify(rinkOpponentPlayers().map(p=>p.id))'),run('line'));
}
// A limited comeback is capped, and actual shot probability uses the selected keeper.
run('startCareerWithClub("HV71");(!state.live&&(state.calendar.date=calendarTarget()),startMatch());globalThis.limited=rivalLiveKeeper();limited.health.injury={remaining:0};limited.health.clearance="limited";leagueLivePlayer("opponent",limited.id).seconds=1800;rinkSync()');
assert.notEqual(run('rivalLiveKeeper().id'),run('limited.id'));
run('globalThis.k=rivalLiveKeeper();globalThis.shooter=currentLinePlayers()[0];globalThis.context={location:{x:85,y:50,factor:1},suppressRebound:true};for(const v of Object.keys(k.attributes))k.attributes[v]=1;hvShot(shooter,true,context);globalThis.lowKeeper=state.live.analysis.shots.at(-1).probability;for(const v of Object.keys(k.attributes))k.attributes[v]=20;hvShot(shooter,true,context)');
assert.ok(run('state.live.analysis.shots.at(-1).probability')<run('lowKeeper'));
run('globalThis.enemyShooter=rinkOpponentPlayers().find(p=>p.pos!=="MV");for(const k of Object.keys(enemyShooter.attributes))enemyShooter.attributes[k]=1;opponentShot(true,enemyShooter.name,context);globalThis.lowShooter=state.live.analysis.shots.at(-1).probability;for(const k of Object.keys(enemyShooter.attributes))enemyShooter.attributes[k]=20;opponentShot(true,enemyShooter.name,context)');
assert.ok(run('state.live.analysis.shots.at(-1).probability')>run('lowShooter'));
// Form and fatigue can move a backup into the starting role.
run('startCareerWithClub("HV71");globalThis.club=opponent();globalThis.keepers=state.clubRosters[club].filter(p=>p.pos==="MV");keepers.forEach(p=>{for(const k of Object.keys(p.attributes))p.attributes[k]=12;p.fatigue=0;p.aiForm=0;});rivalsClubState(club).recent=Array.from({length:3},()=>({keeper:keepers[0].id}));keepers[0].fatigue=70');
assert.equal(run('rivalLineup(club).keeper.id'),run('keepers[1].id'));
// One simulated event stream supplies the score, shooting, goalkeeper and participation totals.
run('startCareerWithClub("HV71");globalThis.fixture=state.schedule.find(g=>g.home!==managerClub()&&g.away!==managerClub());globalThis.result=rivalSimulate(fixture);globalThis.again=rivalSimulate(fixture)');
assert.equal(run('JSON.stringify(result)'),run('JSON.stringify(again)'));
for(const side of ['home','away']){
 const other=side==='home'?'away':'home';
 assert.equal(run(`result.rows.filter(r=>r.club===fixture.${side}).reduce((n,r)=>n+r.goals,0)`),run(`result.${side}Goals-(result.shootout&&result.${side}Goals>result.${other}Goals?1:0)`));
 assert.equal(run(`result.rows.filter(r=>r.club===fixture.${side}&&r.pos==='MV').reduce((n,r)=>n+r.saves+r.against,0)`),run(`result.rows.filter(r=>r.club===fixture.${other}).reduce((n,r)=>n+r.shots,0)`));
 assert.equal(run(`result.rows.filter(r=>r.club===fixture.${side}&&r.pos==='MV').reduce((n,r)=>n+r.seconds,0)`),run('result.duration'));
}
assert.equal(run('result.rows.every(r=>r.seconds>=0&&r.seconds<=result.duration&&r.shots>=r.goals)'),true);
run('globalThis.oldStrength=team(fixture.home).strength;globalThis.before=result.homeGoals;for(const p of state.clubRosters[fixture.home])for(const k of Object.keys(p.attributes))p.attributes[k]=1;for(const p of state.clubRosters[fixture.away])for(const k of Object.keys(p.attributes))p.attributes[k]=20;globalThis.weak=rivalSimulate(fixture)');
assert.equal(run('team(fixture.home).strength'),run('oldStrength'));assert.notEqual(run('JSON.stringify(weak)'),run('JSON.stringify(result)'));
run('leagueBackground(fixture);globalThis.once=JSON.stringify([state.rivals,state.teams,state.leagueStatistics,state.clubRosters]);leagueBackground(fixture);leagueRecordBackground(fixture)');
assert.equal(run('JSON.stringify([state.rivals,state.teams,state.leagueStatistics,state.clubRosters])'),run('once'));
assert.equal(run('fixture.rivalRows'),undefined);assert.equal(run('rivalsClubState(fixture.home).recent.length'),1);
assert.ok(run('state.clubRosters[fixture.home].some(p=>p.fatigue>0)'));
// Repeated bad results cause an appointment, then the new coach gets a proper grace period.
run('globalThis.c=rivalsClubState(fixture.home);globalThis.oldCoach=c.coach.id;c.confidence=26;c.tenure=10;c.recent=Array.from({length:6},()=>({gf:0,ga:3}));rivalAfterFixture({...fixture,rivalsRecorded:false,homeGoals:0,awayGoals:3},[],[])');
assert.notEqual(run('c.coach.id'),run('oldCoach'));assert.equal(run('c.tenure'),0);assert.equal(run('c.history[0].id'),run('oldCoach'));
run('globalThis.newCoach=c.coach.id;rivalAfterFixture({...fixture,rivalsRecorded:false,homeGoals:0,awayGoals:3},[],[])');assert.equal(run('c.coach.id'),run('newCoach'));
// Daily work advances once per date and develops players during the season.
run('startCareerWithClub("HV71");globalThis.prospect=state.clubRosters[opponent()].find(p=>p.pos!=="MV");prospect.age=19;prospect.attributeGrowth=5;delete prospect.developmentModel;ensureDevelopment(prospect);globalThis.attributesBefore=JSON.stringify(prospect.attributes);for(let i=0;i<50;i++){medicalDay();state.calendar.date=calAdd(state.calendar.date,1);rivalsDay();}globalThis.daily=JSON.stringify([state.rivals,state.clubRosters]);rivalsDay()');
assert.equal(run('JSON.stringify([state.rivals,state.clubRosters])'),run('daily'));assert.notEqual(run('JSON.stringify(prospect.attributes)'),run('attributesBefore'));
// Tactical adjustments and a timeout apply once and survive a saved match.
run('startCareerWithClub("HV71");(!state.live&&(state.calendar.date=calendarTarget()),startMatch());state.live.period=3;state.live.minute=15;state.live.hv=3;state.live.opp=1;aiDecisions();globalThis.count=state.live.events.length;aiDecisions()');
assert.equal(run('state.live.aiTeam.style'),'pressure');assert.equal(run('state.live.aiTeam.timeout'),true);assert.equal(run('state.live.events.length'),run('count'));
run('save()');const reload=boot(app.storage.value);assert.equal(reload.run('JSON.stringify(state.live.aiTeam)'),run('JSON.stringify(state.live.aiTeam)'));
// Existing careers migrate without replaying results, and new saves round-trip through file validation.
run('state.live=null;delete state.rivals;globalThis.legacy=JSON.stringify(state);globalThis.totals=JSON.stringify(state.teams)');
const legacy=boot(run('legacy'));assert.equal(legacy.run('JSON.stringify(state.teams)'),run('totals'));assert.equal(legacy.run('Object.keys(state.rivals.clubs).length'),28);assert.equal(legacy.run('Object.values(state.rivals.clubs).every(c=>c.recent.length===0)'),true);
assert.equal(legacy.run('validateSaveText(saveExportText()).rivals.version'),1);
// New-coach stories require real preparation or a retained plan, never a free result reward.
const story=game(),s=story.run;
s('state.stories.active=[];state.stories.started=[];state.stories.lastStart=-10;rivalReplaceCoach(opponent(),"Resultaten räcker inte.");rivalStoryDetect();globalThis.arc=state.stories.active.find(s=>s.type==="coach");storiesChoose(arc.id,"study")');
assert.equal(s('arc.expectation.sessions'),0);
s('state.training.plan=[{type:"tactics",intensity:"light"},{type:"matchprep",intensity:"light"},{type:"recovery",intensity:"light"}];state.training.day=0;runTrainingSession();runTrainingSession()');
assert.equal(s('arc.expectation.sessions'),2);
s('(!state.live&&(state.calendar.date=calendarTarget()),startMatch())');assert.equal(s('rivalPreparationBonus()'),.6);
s('state.live.opponent="Not our target"');assert.equal(s('rivalPreparationBonus()'),0);
s('state.live.opponent=arc.opponent;rivalPreparationBonus();globalThis.sample={id:"coach-story",year:state.season.year,club:managerClub(),opponent:arc.opponent,date:state.calendar.date,finished:true,own:2,against:1,players:[],units:[]};storiesAfterMatch(sample)');
assert.equal(s('arc.status'),'closed');assert.equal(s('rivalPreparationBonus()'),0);assert.equal(s('state.stories.memory.rivals[managerClub()+"|"+arc.opponent].outcome'),'Du vann mötet');
// A full live fixture commits the opponent's real participation and world history once.
const full=game('AIK');full.run('(!state.live&&(state.calendar.date=calendarTarget()),startMatch());globalThis.guard=0;while(!state.live.finished&&guard++<100000){state.live.running=true;liveStep();}');
assert.equal(full.run('state.live.finished'),true);assert.equal(full.run('state.rivals.duels[managerClub()+"|"+state.live.opponent].length'),1);assert.ok(full.run('rivalsClubState(state.live.opponent).recent.length')>0);
full.run('globalThis.done=JSON.stringify(state.rivals);finishAnalysis();finishMatch(false)');assert.equal(full.run('JSON.stringify(state.rivals)'),full.run('done'));
console.log('PASS: 28 clubs, injury-aware independent lineups, goalie rotation, coherent box scores, attribute-driven results, daily growth, coaching changes, live adaptations, stories, legacy saves and full live fixture.');
