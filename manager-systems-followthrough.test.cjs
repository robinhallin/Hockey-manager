'use strict';
const assert=require('node:assert/strict');
const {test}=require('node:test');
const {boot}=require('./scripts/career-test-fixture.cjs');
function setup(){const app=boot(undefined,{production:true});app.run("startCareerWithClub('HV71')");return app;}

test('role goals preserve a dated review, migrate both old shapes and survive reload',()=>{
 const app=setup(),r=app.run;
 r("globalThis.p=managerRoster().find(p=>p.pos==='C');developmentReviewStart(p.id);globalThis.original=JSON.stringify(p.developmentReview);setDevelopmentRolePlan(p.id,'creator');developmentOpenPlan(p.id)");
 assert.equal(r('JSON.stringify(p.developmentReview)'),r('original'));
 assert.doesNotThrow(()=>r('developmentWorkspaceView()'));
 assert.equal(r("setDevelopmentRolePlan(p.id,'anchor')"),false,'forward cannot acquire a defender-only plan');
 r("p.developmentReview={club:managerClub(),date:state.calendar.date,baseline:{...p.attributes},rolePlan:'creator'};developmentReviewMigrate(p)");
 assert.equal(r('p.developmentReview.version'),2);
 assert.doesNotThrow(()=>r('developmentReviewEvidence(p)'));
 r('state.calendar.date=p.developmentReview.due;developmentReviewDay();developmentReviewDay();managerAgendaReconcile()');
 assert.equal(r("state.training.messages.filter(m=>m.key.startsWith('development-review:')).length"),1);
 assert.ok(r("managerAgendaItems().some(i=>i.id.startsWith('development:'))"));
 r('developmentReviewStart(p.id);managerAgendaReconcile();save()');
 assert.equal(r("managerAgendaItems().some(i=>i.id.startsWith('development:'))"),false);
 assert.equal(r('p.developmentReviews.length'),1);
 const loaded=boot(app.storage.value,{production:true});
 assert.doesNotThrow(()=>loaded.run('developmentWorkspaceView()'));
 assert.equal(loaded.run('managerRoster().find(p=>p.pos===\'C\').developmentRolePlan'),'creator');
});

test('overview and inbox expose all domain decisions; snoozing cannot hide a deadline',()=>{
 const app=setup(),r=app.run;
 r("inboxFilter('recommendations')");assert.equal(r('inboxUI.filter'),'recommendations');
 r("for(let n=0;n<7;n++)state.recruitment.incoming.push({id:900+n,name:'Bud '+n,buyer:'AIK',kind:'loan',stage:'offer',status:'pending',expiresDate:calAdd(state.calendar.date,7-n)});managerAgendaReconcile();managerOpenAgenda()");
 assert.equal(r('inboxUI.filter'),'agenda');
 assert.equal(r("managerAgendaItems().filter(i=>i.action?.deal?.startsWith('incoming:')).length"),7);
 assert.equal((r('inboxView()').match(/Bud [0-6]/g)||[]).length,7);
 assert.equal(r("managerAgendaSnooze('decision:incoming:900',3)"),false);
 r("globalThis.item=managerAgendaItems().find(i=>i.id==='contracts:expiring');managerAgendaSnooze(item.id,3)");
 assert.equal(r("managerAgendaItems().some(i=>i.id==='contracts:expiring')"),false);
 assert.ok(r("managerAgendaItems(true).some(i=>i.id==='contracts:expiring'&&i.deferred)"));
 r('state.calendar.date=calAdd(state.calendar.date,3)');
 assert.ok(r("managerAgendaItems().some(i=>i.id==='contracts:expiring')"));
 r('state.recruitment.incoming[0].status="rejected";managerAgendaReconcile()');
 assert.ok(r("state.office2.agenda.history.some(i=>i.id==='decision:incoming:900')"));
});

test('mandates agree with training controls and advice never applies an order',()=>{
 const app=setup(),r=app.run;
 r("managerOffice2ToggleDelegation('juniors');managerOffice2ToggleDelegation('lineup')");
 assert.equal(r('state.juniors.assistantOwner'),'assistant');assert.equal(r("staffMode('lineup')"),'advise');
 r("staffSetMode('training','advise');globalThis.before=JSON.stringify({lines:state.lines,plan:state.training.plan,players:managerRoster().map(p=>[p.trainingLoad,p.developmentFocus])});staffMandateDay();staffMandateDay()");
 assert.equal(r('JSON.stringify({lines:state.lines,plan:state.training.plan,players:managerRoster().map(p=>[p.trainingLoad,p.developmentFocus])})'),r('before'));
 assert.equal(r("state.training.messages.filter(m=>m.key.startsWith('staff-advice:HV71:training:')).length"),1);
 assert.equal(r("staffSetMode('contracts','execute')"),false);
 r("assistantSetOwner('junior','manager');assistantSetOwner('senior','assistant');save()");
 assert.equal(r("staffMode('juniors')"),'manual');assert.equal(r("staffMode('training')"),'execute');
 const loaded=boot(app.storage.value,{production:true});assert.equal(loaded.run("staffMode('training')"),'execute');
});

test('scouting consumes new dated sources once and does not complete three visits on a timer',()=>{
 const app=setup(),r=app.run;
 r("globalThis.p=getTransferMarketPlayers().find(p=>p.pos==='C'&&medicalReady(p)&&!p.futureContract&&!naActive(p));p=findPlayerAnywhere(p.id);p.roleGames=[];scoutingDraft([p.id]);scoutingStart();globalThis.job=scoutingOffice().jobs[0];state.calendar.date=job.next;scoutingDay();globalThis.first=playerAssessment(p).uncertainty");
 assert.equal(r('job.steps'),1);assert.equal(r('state.scoutReports[p.id].observationSources[0].type'),'background');
 r('state.calendar.date=job.next;scoutingDay()');
 assert.equal(r('job.steps'),1);assert.equal(r('playerAssessment(p).uncertainty'),r('first'));
 r("p.roleGames=[{key:'actual-1',club:getPlayerClub(p.id),date:calAdd(state.calendar.date,1),seconds:1000}];state.calendar.date=job.next;scoutingDay()");
 assert.equal(r('job.steps'),2);
 r('state.calendar.date=job.next;scoutingDay()');assert.equal(r('job.steps'),2,'same match cannot be consumed twice');
 r("p.roleGames.push({key:'actual-2',club:getPlayerClub(p.id),date:calAdd(state.calendar.date,1),seconds:1200});state.calendar.date=job.next;scoutingDay();save()");
 assert.equal(r('job.status'),'completed');assert.equal(r('state.scoutReports[p.id].visits'),3);
 const loaded=boot(app.storage.value,{production:true});assert.equal(loaded.run('state.scoutReports['+JSON.stringify(r('p.id'))+'].evidenceKeys.length'),3);
 r('globalThis.snapshot=JSON.stringify(state.scoutReports[p.id]);scoutingReport(p)');assert.equal(r('JSON.stringify(state.scoutReports[p.id])'),r('snapshot'));
});

test('scouting records actual league appearances once, including opposing clubs',()=>{
 const app=setup(),r=app.run;
 r("globalThis.game=state.schedule.find(g=>g.home!==managerClub()&&g.away!==managerClub());state.calendar.date=game.date;leagueBackground(game);globalThis.p=state.clubRosters[game.home].find(p=>p.scoutingGames?.length);globalThis.appearances=p.scoutingGames.length");
 assert.ok(r('scoutingFreshEvidence(p).some(e=>e.type===\'match\'&&e.seconds>0)'));
 r('leagueRecordBackground(game);leagueBackground(game)');assert.equal(r('p.scoutingGames.length'),r('appearances'));
 r('scoutObserve(p.id,state.calendar.date);state.calendar.date=calAdd(state.calendar.date,7)');
 assert.equal(r('scoutingFreshEvidence(p).length'),0,'elapsed time never creates a new source');
 r('save()');const loaded=boot(app.storage.value,{production:true});
 assert.equal(loaded.run('findPlayerAnywhere('+JSON.stringify(r('p.id'))+').scoutingGames.length'),1);
});

test('alternative squads remain hypothetical and retain binding wages outside the plan',()=>{
 const app=setup(),r=app.run;
 r("globalThis.actual=JSON.stringify({money:state.money,lines:state.lines,roster:managerRoster()});squadScenarioCreate('core');squadScenarioCreate('youth');squadScenarioCreate('quality')");
 assert.equal(r('JSON.stringify({money:state.money,lines:state.lines,roster:managerRoster()})'),r('actual'));
 r("globalThis.plan=squadScenarioStore().plans[0];globalThis.row=plan.rows.find(r=>squadScenarioPlayer(r.playerId).contractYears>1);globalThis.salary=clubFutureCommitments(1).get(String(row.playerId));squadScenarioEdit(plan.id,row.playerId,'remove','')");
 assert.ok(r('squadScenarioSummary(plan,1).bound>=salary'));
 r("globalThis.forward=plan.rows.find(r=>loanGroup(squadScenarioPlayer(r.playerId))==='F');squadScenarioEdit(plan.id,forward.playerId,'role','Nyckelspelare');squadScenarioEdit(plan.id,forward.playerId,'place','fourth')");
 assert.ok(r('squadScenarioSummary(plan,1).conflicts.length>0'));
 assert.equal(r("squadScenarioEdit(plan.id,forward.playerId,'salary',-1)"),false);
 r('save()');const loaded=boot(app.storage.value,{production:true});assert.equal(loaded.run('squadScenarioStore().plans.length'),3);
 assert.doesNotThrow(()=>loaded.run('squadScenariosView()'));
 r('state.season.year++;squadScenariosNewYear();squadScenariosNewYear()');
 assert.equal(r('squadScenarioStore().plans.length'),3);assert.equal(r('scoutingOffice().scenarioArchive.length'),1);
 assert.equal(r('squadScenarioStore().plans[0].rows[0].years'),1);
});

test('calendar accounting is daily prorated, monthly, idempotent and migration does not backcharge',()=>{
 const app=setup(),r=app.run;
 r('globalThis.cash=state.money;globalThis.rates=clubAnnualRates();state.calendar.date="2026-08-16";clubCashflowAccrue(state.calendar.date,rates)');
 assert.equal(r('state.money'),r('cash'),'no cash payment before month boundary');
 r('globalThis.rates2={...rates,players:rates.players*2};state.calendar.date="2026-09-01";clubCashflowAccrue(state.calendar.date,rates2);globalThis.after=state.money;clubCashflowAccrue(state.calendar.date,rates2)');
 assert.equal(r('state.money'),r('after'));
 assert.equal(r('state.clubOffice.totals.players'),r('Math.round(rates.players*15/31/12+rates2.players*16/31/12)'));
 assert.equal(r('state.clubOffice.cashflow.months.length'),1);
 assert.equal(r('state.clubOffice.ledger[0].date'),'2026-09-01');
 r('globalThis.snapshot=JSON.stringify(state);clubCashflowView();clubForecast()');assert.equal(r('JSON.stringify(state)'),r('snapshot'));
 r('save()');const saved=JSON.parse(app.storage.value);delete saved.clubOffice.cashflow;
 const loaded=boot(JSON.stringify(saved),{production:true});assert.equal(loaded.run('state.money'),saved.money);assert.equal(loaded.run('state.clubOffice.cashflow.lastDate'),saved.calendar.date);
 loaded.run('save()');assert.ok(loaded.run('validateSaveText(saveExportText())'));
 r('globalThis.beforeSummer=state.money;clubCashflowAccrue("2027-08-01",rates2);ensureClub();globalThis.afterSummer=state.money;clubCashflowAccrue("2027-08-01",rates2)');
 assert.equal(r('state.money'),r('afterSummer'),'summer settlement cannot be replayed before the calendar is moved');
 assert.equal(r('state.clubOffice.cashflow.lastDate'),'2027-08-01');
 const malformed=JSON.parse(app.storage.value);malformed.clubOffice.cashflow.accrued.players='invalid';
 assert.throws(()=>r('validateSaveText('+JSON.stringify(JSON.stringify(malformed))+')'),/Ogiltiga/);
});

test('world follows stable identities, preserves story bodies and offers a real scout draft',()=>{
 const app=setup(),r=app.run;
 r("globalThis.club='Färjestad BK';globalThis.arrival=state.clubRosters[club].find(p=>p.pos==='C');globalThis.peer=state.clubRosters[club].find(p=>p!==arrival&&loanGroup(p)==='F');peer.transferListed=true;worldWatchToggle('club',club);feedbackNews('watch-fixture',club,'transfer',playerHeadline(arrival,' ansluter'),[playerMention(arrival),' får en ny roll.']);worldWatchDay();worldWatchDay()");
 assert.ok(r("worldHockeyNews(100).some(e=>referencePlainText(e.text).includes('får en ny roll'))"));
 assert.equal(r('worldWatchStore().events.length'),1);
 assert.equal(r("state.training.messages.filter(m=>m.key.startsWith('world-watch:')).length"),1);
 r("globalThis.e=worldWatchStore().events[0];globalThis.moneyBefore=state.money;worldNewsScout(peer.id)");
 assert.ok(r('scoutDesk.draft.players.some(id=>samePlayerId(id,peer.id))'));
 assert.equal(r('state.money'),r('moneyBefore'),'opening a concrete quote never buys a mission');
 assert.ok(r('worldNewsOpportunities(e).some(row=>row.p.id===peer.id)'));
 r('globalThis.before=JSON.stringify(state);worldWatchNewsView()');assert.equal(r('JSON.stringify(state)'),r('before'));
 r('save()');const loaded=boot(app.storage.value,{production:true});assert.ok(loaded.run("worldWatchStore().clubs.includes('Färjestad BK')"));
});
