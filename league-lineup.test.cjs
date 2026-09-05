const fs=require('node:fs'),assert=require('node:assert/strict');
const boot=new Function('require',fs.readFileSync('interface.test.cjs','utf8').split('const app=boot(),')[0]+'\nreturn boot;')(require);
const app=boot(),{run,get}=app;
run('startCareerWithClub("HV71")');
// Deterministic box scores for all AI teams, without consuming the match RNG.
run('globalThis.g=state.schedule.find(g=>g.home!==managerClub()&&g.away!==managerClub());g.played=true;g.homeGoals=4;g.awayGoals=2;globalThis.randomBefore=Math.random;Math.random=()=>{throw Error("Statistics consumed game RNG")};leagueRecordBackground(g);Math.random=randomBefore');
assert.equal(run('g.statsRecorded'),true);
assert.equal(run('Object.values(state.leagueStatistics.rows).filter(r=>r.club===g.home).reduce((n,r)=>n+r.goals,0)'),4);
assert.equal(run('Object.values(state.leagueStatistics.rows).filter(r=>r.club===g.away).reduce((n,r)=>n+r.goals,0)'),2);
assert.equal(run('Object.values(state.leagueStatistics.rows).filter(r=>r.club===g.home).reduce((n,r)=>n+r.seconds,0)'),6*3600);
run('globalThis.home=Object.values(state.leagueStatistics.rows).filter(r=>r.club===g.home);globalThis.away=Object.values(state.leagueStatistics.rows).filter(r=>r.club===g.away)');
assert.equal(run('home.find(r=>r.pos==="MV").saves+home.find(r=>r.pos==="MV").against'),run('away.reduce((n,r)=>n+r.shots,0)'));
assert.ok(run('home.reduce((n,r)=>n+r.assists,0)')<=8);
run('globalThis.once=JSON.stringify([state.leagueStatistics,state.clubRosters]);leagueRecordBackground(g)');assert.equal(run('JSON.stringify([state.leagueStatistics,state.clubRosters])'),run('once'));
// A live save records both teams, misses are excluded, empty-net goals do not hurt the keeper.
run('startCareerWithClub("HV71");startMatch();globalThis.ownShooter=currentLinePlayers()[0];globalThis.enemy=state.clubRosters[state.live.opponent].filter(p=>p.pos!=="MV");globalThis.firstKeeper=randomGoalie();trackIceTime(60);globalThis.shotloc={x:80,y:50,factor:1};recordAnalysisShot("own",ownShooter.name,ownShooter.id,false,shotloc,.1,.2,"post");recordAnalysisShot("own",ownShooter.name,ownShooter.id,false,shotloc,.1,.8,"save")');
assert.equal(run('state.live.leagueBox.players[managerClub()+":"+ownShooter.id].shots'),1);
run('recordAnalysisShot("opponent",enemy[0].name,null,false,shotloc,.1,0,"goal");goalOpponent(enemy[0].name,{assistId:enemy[1].id});state.live.goaliePulled=true;recordAnalysisShot("opponent",enemy[0].name,null,false,shotloc,.1,0,"goal");goalOpponent(enemy[0].name,{assistId:enemy[1].id});trackIceTime(60)');
assert.equal(run('state.live.leagueBox.players[managerClub()+":"+firstKeeper.id].against'),1);
assert.equal(run('state.live.leagueBox.players[managerClub()+":"+firstKeeper.id].seconds'),60);
assert.equal(run('state.live.leagueBox.players[state.live.opponent+":"+enemy[1].id].assists'),2);
run('state.live.analysisAbandoned=true;finishMatch(false)');
assert.equal(run('state.leagueStatistics.recorded.regular.SHL'),7);assert.equal(run('state.leagueStatistics.recorded.regular.HA'),7);
assert.equal(run('new Set(Object.values(state.leagueStatistics.rows).map(r=>r.club)).size'),28);
assert.equal(run('Object.values(state.leagueStatistics.rows).find(r=>r.id===firstKeeper.id).partial'),true);
assert.equal(run('Object.values(state.leagueStatistics.rows).find(r=>r.id===firstKeeper.id).shutouts'),0);
run('globalThis.saved=JSON.stringify(state.leagueStatistics);finishAnalysis();state.schedule.filter(g=>g.played).forEach(leagueRecordBackground);save();render()');assert.equal(run('JSON.stringify(state.leagueStatistics)'),run('saved'));
const reload=boot(app.storage.value);assert.equal(reload.run('JSON.stringify(state.leagueStatistics)'),run('saved'));
assert.equal(run('validateSaveText(saveExportText()).leagueStatistics.version'),1);
// Filters and sorting include every club, different stages and keeper rate denominators.
for(const league of ['SHL','HA'])for(const view of ['points','goals','assists','shots','pim','goalies']){
 run(`deskNavigate('leagueStats');setLeagueStats('league','${league}');setLeagueStats('view','${view}')`);
 assert.doesNotMatch(get('#content').innerHTML,/undefined|NaN|Infinity/);
 assert.ok(run('leagueStatPlayers().length')>20);
 if(view==='goalies')assert.equal(run('leagueStatPlayers().every(p=>p.gaa===null||p.gaa===p.against*3600/p.seconds)'),true);
}
run('setLeagueStats("league","SHL");setLeagueStats("view","assists");setLeagueStats("minimum",1)');
assert.equal(run('leagueStatPlayers().every(p=>p.games>=1)'),true);
assert.equal(run('leagueStatPlayers().every((p,i,a)=>!i||a[i-1].assists>=p.assists)'),true);
run('setLeagueStats("stage","playoffs");setLeagueStats("minimum",1)');assert.equal(run('leagueStatPlayers().length'),0);
run('setLeagueStats("stage","regular");leagueStatsClub("HV71")');assert.equal(run('leagueStatPlayers().every(p=>p.clubs.includes("HV71"))'),true);
// Recorded club stints stay with their actual club even after moving the player.
run('globalThis.statPlayer=state.clubRosters[g.home]?.find(p=>p.pos!=="MV")||state.clubRosters["AIK"].find(p=>p.pos!=="MV");globalThis.seller=getPlayerClub(statPlayer.id);globalThis.statsBefore=JSON.stringify(state.leagueStatistics.rows);transferRecruitPlayer(statPlayer,seller,"HV71",0,statPlayer.salary,2,"Ordinarie")');
assert.equal(run('JSON.stringify(state.leagueStatistics.rows)'),run('statsBefore'));
// Archives are readable and reset new-season totals without modifying the old snapshot.
run('globalThis.oldYear=state.season.year;state.season.year++;ensureLeagueStatistics();setLeagueStats("year",String(oldYear));setLeagueStats("league","SHL");setLeagueStats("club","all");setLeagueStats("minimum",1)');
assert.ok(run('leagueStatPlayers().length')>0);assert.equal(run('Object.keys(state.leagueStatistics.rows).length'),0);assert.match(get('#content').innerHTML,/2026\/27/);
run('setLeagueStats("year","current")');assert.equal(run('leagueStatPlayers().length'),0);
// Upgrading an old ongoing career does not invent missing historical records.
const old=boot();old.run('startCareerWithClub("HV71");simulateOtherGames();startMatch();state.live.minute=12;delete state.leagueStatistics;delete state.live.leagueBox;globalThis.legacy=JSON.stringify(state)');
const migrated=boot(old.run('legacy'));assert.ok(migrated.run('state.leagueStatistics.missing.HA')>0);assert.equal(migrated.run('Object.keys(state.leagueStatistics.rows).length'),0);assert.equal(migrated.run('state.live.leagueBox.partial'),true);assert.equal(migrated.run('state.live.minute'),12);
// A real full match conserves recorded goals, registered minutes and once-only ledger writes.
const full=boot();full.run('startCareerWithClub("AIK");startMatch();for(let n=0;n<1900&&!state.live.finished;n++){if(!state.live.running){if(!medicalMatchReady()){medicalConcede();break;}state.live.running=true;}liveStep()}');
assert.equal(full.run('state.live.finished'),true);assert.equal(full.run('state.leagueStatistics.recorded.regular.HA'),7);
if(!full.run('state.live.analysisAbandoned'))assert.equal(full.run('Object.values(state.live.leagueBox.players).reduce((n,p)=>n+p.goals,0)'),full.run('state.live.hv+state.live.opp-(state.live.analysisShootout?1:0)'));
assert.equal(full.run('Object.values(state.live.leagueBox.players).filter(p=>p.club===managerClub()).reduce((n,p)=>n+p.seconds,0)'),full.run('Object.values(state.live.iceTime).reduce((n,s)=>n+s,0)'));
// A playoff box score uses its own competition and never changes regular-season totals.
const cup=boot();cup.run('startCareerWithClub("HV71");globalThis.pg=state.schedule.find(g=>g.home!==managerClub()&&g.away!==managerClub());pg.seriesId="test-cup";pg.stage="quarter";state.season.series.push({id:"test-cup",high:pg.home,low:pg.away,winsHigh:0,winsLow:0,bestOf:7,games:[]});simulatePlayoffGame(pg)');
assert.equal(cup.run('state.leagueStatistics.recorded.playoffs[leagueOf(pg.home)]'),1);assert.equal(cup.run('state.leagueStatistics.recorded.regular[leagueOf(pg.home)]'),0);
// Shootout deciding goals are never charged to keepers or individual goal scorers.
const so=boot();so.run('startCareerWithClub("HV71");startMatch();globalThis.goalie=leagueKeeper("own"),enemyGoalie=leagueKeeper("opponent");leagueLivePlayer("own",goalie.id).seconds=3900;leagueLivePlayer("opponent",enemyGoalie.id).seconds=3900;state.live.period=4;state.live.minute=5;state.live.second=0;shootout()');
assert.equal(so.run('Object.values(state.live.leagueBox.players).reduce((n,r)=>n+r.goals+r.against,0)'),0);
assert.equal(so.run('Object.values(state.leagueStatistics.rows).filter(r=>samePlayerId(r.id,goalie.id)||samePlayerId(r.id,enemyGoalie.id)).every(r=>r.shutouts===1)'),true);
// Exhibition games cannot leak goals, goalie data or appearances into either league ledger.
const friendly=boot();friendly.run('startCareerWithClub("HV71");calendarInitialPreseason();calendarBookFriendly("AIK",calAdd(state.calendar.date,3));calendarContinue();startMatch();trackIceTime(60);globalThis.p=currentLinePlayers()[0];recordAnalysisShot("own",p.name,p.id,true,{x:80,y:50,factor:1},1,0,"goal");goalHV(p);calendarFinishFriendly()');
assert.equal(friendly.run('Object.keys(state.leagueStatistics.rows).length'),0);assert.equal(friendly.run('state.leagueStatistics.recorded.regular.SHL'),0);
// Rink selection: all positions, swapping, injured exclusions, goalie validation and icing guard.
run('startCareerWithClub("HV71");deskNavigate("lines");globalThis.originalLines=JSON.stringify(state.lines);lineupSelectUnit("line",2);lineupSelectUnit("pair",1)');
assert.equal(run('JSON.stringify(state.lines)'),run('originalLines'));assert.equal((get('#content').innerHTML.match(/class="lineup-slot /g)||[]).length,6);
run('lineupPickSlot("forwards",6);globalThis.a=state.lines.forwards[6];globalThis.b=state.lines.forwards[0];lineupPlace(b)');assert.equal(run('state.lines.forwards[6]'),run('b'));assert.equal(run('state.lines.forwards[0]'),run('a'));assert.equal(run('new Set(state.lines.forwards.map(String)).size'),12);
run('globalThis.validLines=JSON.stringify(state.lines);lineupPlace(state.lines.defense[0]);changeLinePlayer("forwards",0,state.lines.defense[0]);changeGoalie(state.lines.forwards[0]);changeLinePlayer("forwards",99,state.lines.forwards[0])');assert.equal(run('JSON.stringify(state.lines)'),run('validLines'));
run('lineupPickSlot("goalie",0);globalThis.backup=goalies().find(p=>!samePlayerId(p.id,state.lines.goalie));lineupPlace(backup.id)');assert.equal(run('String(state.lines.goalie)'),run('String(backup.id)'));
run('startMatch();state.live.rink.restart=true;state.live.rink.hockey.icingHold={side:"own",ids:rinkOwnPlayers().map(p=>p.id)};globalThis.blockedLines=JSON.stringify(state.lines);lineupPickSlot("forwards",0);lineupPlace(state.lines.forwards[1])');assert.equal(run('JSON.stringify(state.lines)'),run('blockedLines'));
run('state.live.rink.hockey.icingHold=null;save()');const formation=boot(app.storage.value);assert.equal(formation.run('JSON.stringify(state.lines)'),run('JSON.stringify(state.lines)'));
const rating=run('starRatingHTML(1.5,3.5,true,"Testscout")');assert.equal((rating.match(/class="rating-star"/g)||[]).length,5);assert.match(rating,/star-potential/);assert.match(rating,/width:50%/);assert.doesNotMatch(rating.replace(/<[^>]+>/g,''),/[0-9½]/);
for(const club of run('Object.keys(state.world.membership)')){run(`startCareerWithClub(${JSON.stringify(club)});deskNavigate('lines');lineupPickSlot('forwards',0)`);assert.doesNotMatch(get('#content').innerHTML,/undefined|NaN/);assert.match(get('#content').innerHTML,/star-potential/);}
console.log('PASS: league box-score conservation, AI RNG independence, all 28 teams, live/empty-net goalie accounting, stage filters and sorting, transfers, archives, legacy saves, full 2D match, 28 rink lineups, swaps/icing/goalies and coloured half-star uncertainty.');
