const fs=require('node:fs'),assert=require('node:assert/strict');
const boot=new Function('require',fs.readFileSync('interface.test.cjs','utf8').split('const app=boot(),')[0]+'\nreturn boot;')(require);
const app=boot(),{run,get}=app;
run('startCareerWithClub("AIK");deskNavigate("match")');
assert.match(get('#content').innerHTML,/mc-prematch/);
run('matchPlan("counter")');assert.equal(run('state.tacticalPlan.attackStyle'),'counter');
run('createMatch();deskNavigate("match")');
let html=get('#content').innerHTML;
assert.equal((html.match(/id="match-play"/g)||[]).length,1);
assert.doesNotMatch(html,/rink-quick-actions|rink-playback|hockey-match-plan|bench-strip|rink-match-details/);
assert.ok(get('.game-shell').classList.contains('match-mode'));
assert.match(html,/Skott på mål/);assert.match(html,/Räddningar/);
run('startMatch();liveStep();globalThis.clock=analysisClock();globalThis.score=state.live.hv+":"+state.live.opp;matchTab("tactics")');
assert.equal(run('state.live.running'),false);assert.equal(run('analysisClock()'),run('clock'));assert.equal(run('state.live.hv+":"+state.live.opp'),run('score'));
assert.equal(get('#match-tab-tactics').focused,true);
run('state.tacticalPlan.physicality="safe";state.tacticalPlan.lineUsage="rollFour";matchPlan("pressure")');
assert.equal(run('state.tactic'),'attack');assert.equal(run('state.tacticalPlan.forecheck'),'aggressive');assert.equal(run('state.tacticalPlan.tempo'),'high');assert.equal(run('state.tacticalPlan.physicality'),'safe');assert.equal(run('state.tacticalPlan.lineUsage'),'rollFour');
run('matchOrder("attackStyle","counter")');assert.equal(run('state.tacticalPlan.forecheck'),'passive');
run('matchOrder("tempo","low");globalThis.plan=JSON.stringify(state.tacticalPlan);matchOrder("tempo","invalid");matchPlan("invalid")');assert.equal(run('JSON.stringify(state.tacticalPlan)'),run('plan'));
// Rink actors, medical/position guards and icing use the same real line selections.
run('matchTab("changes");matchUnit("forwards",3);matchUnit("defense",2)');assert.equal(run('state.live.currentLine'),3);assert.equal(run('state.live.currentDefensePair'),2);assert.equal(run('state.live.shiftSeconds'),0);
assert.equal(run('currentLinePlayers().every(p=>state.live.rink.actors.some(a=>a.side==="own"&&samePlayerId(a.id,p.id)))'),true);
run('globalThis.newPlayer=state.lines.forwards[0];matchReplace("forwards",9,newPlayer)');assert.equal(run('String(state.lines.forwards[9])'),run('String(newPlayer)'));assert.equal(run('new Set(state.lines.forwards.map(String)).size'),12);
run('globalThis.lines=JSON.stringify(state.lines);matchReplace("forwards",9,state.lines.goalie)');assert.equal(run('JSON.stringify(state.lines)'),run('lines'));
run('hockeyWhistle("icing","own","Icing",18);matchUnit("forwards",0);matchReplace("forwards",9,state.lines.forwards[1]);matchAction("goalie")');assert.equal(run('state.live.currentLine'),3);assert.equal(run('JSON.stringify(state.lines)'),run('lines'));assert.equal(run('Boolean(state.live.goaliePulled)'),false);assert.match(get('#content').innerHTML,/laget får inte byta/);
run('state.live.rink.restart=false;state.live.rink.hockey.icingHold=null;state.live.penaltiesOpp=[120];matchUnit("special",1)');assert.equal(run('state.live.rotationIndex%2'),1);assert.equal(run('specialUnitOnIce().every(p=>state.specialTeams.pp2.some(id=>samePlayerId(id,p.id)))'),true);
run('matchUnit("forwards",0)');assert.equal(run('state.live.currentLine'),3);
run('matchAction("goalie")');assert.equal(run('state.live.goaliePulled'),true);assert.equal(run('rinkSkaters("own").length'),6);
run('matchAction("goalie");matchReplace("goalie",0,goalies().find(p=>!samePlayerId(p.id,state.lines.goalie)).id)');assert.equal(run('state.live.rink.actors.find(a=>a.side==="own"&&a.pos==="MV").id'),run('randomGoalie().id'));
run('matchAction("timeout");globalThis.momentum=state.live.momentum;matchAction("timeout")');assert.equal(run('state.live.timeoutUsed'),true);assert.equal(run('state.live.momentum'),run('momentum'));
// Feedback is targeted, context-dependent, short-lived, cannot stack, and survives reload.
run('state.live.penaltiesOpp=[];state.live.minute=5;state.live.second=0;state.live.opp=2;state.live.hv=0;globalThis.p=currentLinePlayers()[0];p.social.ambition=18;p.social.sensitivity=5;matchTarget("player:"+p.id);matchFeedback("demand")');
assert.equal(run('state.live.benchFeedback.history[0].reactions.length'),1);assert.ok(run('matchFeedbackBonus([p])')>0);assert.equal(run('matchFeedbackBonus(currentLinePlayers().filter(q=>q.id!==p.id))'),0);
assert.equal(run('state.live.running'),false);assert.equal(run('analysisClock()'),300);
run('globalThis.feedback=JSON.stringify(state.live.benchFeedback);matchTarget("team");matchFeedback("praise")');assert.equal(run('JSON.stringify(state.live.benchFeedback)'),run('feedback'));
run('state.live.minute=7');assert.equal(run('matchFeedbackBonus([p])'),0);assert.equal(run('matchFeedbackWait()'),60);
run('state.live.minute=8;matchFeedback("praise")');assert.ok(run('state.live.benchFeedback.history[0].reactions.every(r=>r.effect<0)'));
run('save()');const reload=boot(app.storage.value);assert.equal(reload.run('JSON.stringify(state.live.benchFeedback)'),run('JSON.stringify(state.live.benchFeedback)'));assert.equal(reload.run('state.live.running'),false);
run('state.live.period=2;state.live.minute=0');assert.equal(run('matchFeedbackBonus([p])'),0);
run('state.live.finished=true;globalThis.feedback=JSON.stringify(state.live.benchFeedback);matchFeedback("calm");matchPlan("pressure");render()');assert.equal(run('JSON.stringify(state.live.benchFeedback)'),run('feedback'));assert.doesNotMatch(get('#content').innerHTML,/id="match-play"/);assert.match(get('#content').innerHTML,/EFTER MATCHEN/);
run('deskNavigate("home")');assert.equal(get('.game-shell').classList.contains('match-mode'),false);
// Actual on-target events exclude posts and wide shots. Read-only renders do not move time or RNG.
run('startCareerWithClub("HV71");createMatch();state.live.analysis.shots=[{side:"own",outcome:"goal"},{side:"own",outcome:"post"},{side:"own",outcome:"wide"},{side:"own",outcome:"rebound"},{side:"opponent",outcome:"save"}];globalThis.snapshot=JSON.stringify([state.live.rink,state.lines,state.calendar.date]);render();render()');
assert.equal(run('JSON.stringify(matchStats().shots)'),'[2,1]');assert.equal(run('JSON.stringify(matchStats().saves)'),'[1,1]');assert.equal(run('JSON.stringify([state.live.rink,state.lines,state.calendar.date])'),run('snapshot'));
for(const club of run('Object.keys(state.world.membership)')){
 run(`startCareerWithClub(${JSON.stringify(club)});createMatch();deskNavigate('match');matchTab('changes')`);assert.equal(run('managerClub()'),club);assert.doesNotMatch(get('#content').innerHTML,/undefined|NaN/);
 run('state.live.penaltiesHV=[120,120];matchTab("changes")');assert.doesNotMatch(get('#content').innerHTML,/undefined|NaN/);
}
// A complete 2D match with real mid-game coaching and final ledger/season progression.
run('startCareerWithClub("Rögle BK");createMatch();globalThis.steps=0;while(!state.live.finished&&steps++<1600){if(!state.live.running)startMatch();if(steps%70===0){matchTab("tactics");matchPlan(steps%140?"pressure":"protect");matchTarget("ice");matchFeedback("support");startMatch();}liveStep();}');
assert.equal(run('state.live.finished'),true);assert.ok(run('steps')<1600);assert.equal(run('state.live.analysis.saved'),true);assert.equal(run('state.live.leagueBox.saved'),true);assert.match(run('matchPlayersView()'),/Rögle/);assert.match(run('matchPlayersView()'),new RegExp(run('state.live.opponent')));
const friendly=boot();friendly.run('startCareerWithClub("HV71");calendarInitialPreseason();calendarBookFriendly("AIK",calAdd(state.calendar.date,3));calendarContinue();startMatch();trackIceTime(60)');assert.equal(friendly.run('state.live.leagueBox.friendly'),true);assert.ok(friendly.run('Object.values(state.live.leagueBox.players).some(p=>p.club==="AIK"&&p.seconds>0)'));friendly.run('calendarFinishFriendly()');assert.equal(friendly.run('Object.keys(state.leagueStatistics.rows).length'),0);
console.log('PASS: unified controls, 28 clubs, tactical effects, targeted feedback/cooldown/reload, legal substitutions, special teams, goalies, timeout, real live statistics and full 2D match.');
