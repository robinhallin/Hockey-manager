const assert=require('node:assert/strict');const {boot}=require('./scripts/career-test-fixture.cjs');const a=boot(),r=a.run;
r("startCareerWithClub('HV71');leagueSelect('HA');deskNavigate('table')");assert.equal(r('leagueStatLeague()'),'HA');
r("setLeagueStats('league','SHL');deskNavigate('leagues')");assert.equal(r('state.world.selected'),'SHL');
r("leagueSelect('HA');leagueStatsClub('AIK')");assert.equal(r('leagueStatsUI.club'),'AIK');
r("deskNavigate('leagues');leagueStatsUI.query='zzz';deskNavigate('leagueStats')");assert.equal(r('leagueStatsUI.club'),'all');assert.equal(r('leagueStatsUI.query'),'');assert.equal(r('leagueStatLeague()'),'HA');
r("deskNavigate('home');deskNavigate('table')");assert.equal(r('leagueStatLeague()'),'SHL');
r("developmentUI.tab='history';developmentUI.query='zzz';developmentOpenPlan(managerRoster()[0].id)");assert.equal(r('developmentUI.tab'),'players');assert.equal(r('developmentUI.query'),'');
r("state.analysis.matches.unshift({id:'flow-report',year:state.season.year,club:managerClub(),opponent:'AIK',stage:'Grundserie',finished:true,own:1,against:0,shots:[],events:[],units:[],players:[]});state.training.messages.unshift({id:777,matchId:'flow-report'});matchesUI.analysis='trends';messageOpenContext(777)");assert.equal(r('matchesUI.analysis'),'overview');assert.equal(r('state.analysis.selected'),'flow-report');
console.log('PASS: league context, exact club stats, cleared broad filters, own-club table, medical-to-training selection and exact inbox match report.');
// A real simulated manager week, with all workspaces traversed every day.
r("startCareerWithClub('HV71');ensureLines();calendarSetSession(state.calendar.date,'type','skills');globalThis.plannedPlayer=managerRoster().find(p=>p.pos!=='MV');setIndividualLoad(plannedPlayer.id,'light')");
for(let day=0;day<7;day++){
 const date=r('state.calendar.date');
 r("for(const area of DESK_AREAS)for(const [page] of area.pages)deskNavigate(page)");assert.equal(r('state.calendar.date'),date);
 r("globalThis.pending=pendingManagerDecision();if(pending?.decisionType==='minutes')answerPlayerConversation(pending.id,'honest')");
 assert.equal(r('Boolean(pendingManagerDecision())'),false,'Unresolved manager decision');
 r('calendarContinue()');
 if(r('state.calendar.date')===date){
   r('startMatch();globalThis.steps=0;while(state.live&&!state.live.finished&&steps++<100000){if(!state.live.running){if(!medicalMatchReady()){medicalConcede();break;}while(medicalPending())medicalDecisionAccept();startMatch();}liveStep()}');
   assert.equal(r('state.live.finished'),true);
   r("globalThis.report=state.analysis.matches[0];matchesUI.analysis='players';matchesOpenReport(report.id)");assert.equal(r('matchesUI.analysis'),'overview');assert.equal(r('state.calendar.date'),date);
   r('calendarContinue()');
 }
 assert.equal(r('state.calendar.date'),r(`calAdd('${date}',1)`));
}
assert.equal(r('state.calendar.date'),'2026-09-14');assert.equal(r('state.analysis.matches.filter(m=>m.finished).length'),2);assert.ok(r('state.training.history.length')>=5);assert.equal(r('plannedPlayer.trainingLoad'),'light');
r('save()');const b=boot(a.storage.value);assert.equal(b.run('state.calendar.date'),'2026-09-14');assert.equal(b.run('state.analysis.matches.length'),2);
console.log('PASS: 7-day manager week, all workspace routes daily, real training and 2 full matches, exact debriefs, one-day progression and save/reload.');
