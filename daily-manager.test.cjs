const fs=require('node:fs'),assert=require('node:assert/strict');
const {boot}=require('./scripts/career-test-fixture.cjs');
const app=boot(),{run,get}=app;
run('startCareerWithClub("HV71");deskNavigate("calendar")');
assert.equal(run('state.calendar.date'),'2026-09-07');
assert.match(get('#content').innerHTML,/Månadskalender/);
assert.equal((get('#content').innerHTML.match(/class="cal-day /g)||[]).length,35);
run('globalThis.dateBefore=state.calendar.date;calendarMonthMove(1);calendarPick("2026-09-09");calendarSetSession("2026-09-09","type","penaltykill");createMatch()');
assert.equal(run('state.calendar.date'),run('dateBefore'));assert.equal(run('state.live'),null);assert.equal(run('state.page'),'calendar');
run('calendarContinue(14)');assert.equal(run('state.calendar.date'),'2026-09-08');assert.equal(run('state.training.history.length'),1);
assert.equal(run('state.training.messages.find(m=>m.category==="Träningsrapport").read'),false);
run('save();render();render()');const resumed=boot(app.storage.value);
assert.equal(resumed.run('state.calendar.date'),'2026-09-08');assert.equal(resumed.run('state.calendar.plans["2026-09-09"].type'),'penaltykill');
run('calendarContinue();calendarContinue()');assert.equal(run('state.calendar.date'),'2026-09-10');assert.equal(run('state.training.history.length'),3);
assert.equal(run('state.training.history[0].type'),'penaltykill');
run('calendarContinue();startMatch();globalThis.planHistory=state.training.history.length;pauseMatch();calendarContinue()');
assert.equal(run('state.calendar.date'),'2026-09-10');assert.equal(run('state.page'),'match');assert.equal(run('runTrainingSession()'),false);assert.equal(run('state.training.history.length'),run('planHistory'));
run('globalThis.steps=0;while(!state.live.finished&&steps++<100000){if(!state.live.running){if(!medicalMatchReady()){medicalConcede();break;}while(medicalPending())medicalDecisionAccept();startMatch();}liveStep()}');
assert.equal(run('state.live.finished'),true);assert.equal(run('state.calendar.date'),'2026-09-10');assert.equal(run('state.calendar.completedMatchDate'),'2026-09-10');assert.equal(run('state.round'),2);
assert.ok(run('state.analysis.matches[0].performance.rows.length')>0);
assert.equal(run('state.analysis.matches[0].performance.date'),'2026-09-10');
assert.match(run('matchCentreView()'),/Matchens spelarinsatser/);
run('globalThis.grades=JSON.stringify(state.analysis.matches[0].performance);managerRoster()[0].attributes.shooting=20;render();finishPerformance();finishAnalysis()');
assert.equal(run('JSON.stringify(state.analysis.matches[0].performance)'),run('grades'));
run('calendarContinue()');assert.equal(run('state.calendar.date'),'2026-09-11');assert.equal(run('state.live'),null);assert.equal(run('state.page'),'calendar');
assert.equal(run('state.training.history.length'),3);
run('calendarContinue()');assert.equal(run('state.calendar.date'),'2026-09-12');assert.equal(run('state.training.history.length'),4);
// Decisions block the next date, but opening and answering never advances it.
run('managerMessage("daily-decision","Din roll","Ett samtal","Spelare",{decisionType:"minutes",playerId:managerRoster()[0].id});globalThis.blockedDate=state.calendar.date;calendarContinue()');
assert.equal(run('state.calendar.date'),run('blockedDate'));assert.equal(run('state.page'),'inbox');assert.equal(run('inboxUI.detail'),true);
run('answerPlayerConversation(state.training.selectedMessage,"honest");inboxBack()');assert.equal(run('state.calendar.date'),run('blockedDate'));
// Independent list/detail panels preserve list position and provide actionable filters.
get('#inbox-message-list').scrollTop=390;
run('openManagerMessage(state.training.messages.at(-1).id)');assert.equal(get('#inbox-message-list').scrollTop,390);assert.equal(get('#inbox-letter').focused,true);
get('#inbox-message-list').scrollTop=570;
run('openManagerMessage(state.training.messages[0].id);inboxBack()');assert.equal(get('#inbox-message-list').scrollTop,570);
run('inboxFilter("decisions")');assert.match(get('#content').innerHTML,/Inga meddelanden i detta urval/);
assert.doesNotMatch(get('#content').innerHTML,/Fortsätt till nästa händelse/);
// Model fatigue by time and by the actual individual, not by render or substitution calls.
const energy=boot(),r=energy.run;
r('startCareerWithClub("HV71");state.calendar.date=calendarTarget();createMatch();globalThis.a=currentLinePlayers()[0],b=currentLinePlayers()[1];a.attributes.stamina=5;b.attributes.stamina=19;globalThis.bench=managerRoster().find(p=>p.pos!=="MV"&&!currentLinePlayers().includes(p)&&!currentDefensePlayers().includes(p));medicalExposure=()=>{};save()');
const chunks=boot(energy.storage.value);chunks.run('medicalExposure=()=>{};for(let i=0;i<15;i++)trackIceTime(3)');r('trackIceTime(45)');
assert.ok(r('matchEnergy(a)')<r('matchEnergy(b)'));
assert.ok(Math.abs(r('matchEnergy(a)')-chunks.run('matchEnergy(playerById('+JSON.stringify(r('a.id'))+'))'))<1e-8);
assert.equal(r('bench.fatigue'),0);assert.ok(r('a.fatigue')>0);assert.ok(r('matchEnergy(randomGoalie())')>95);
r('globalThis.e=JSON.stringify(state.live.energy);matchUnit("forwards",1);matchUnit("forwards",0);pauseMatch();setSpeed(3);render();updateFatigue()');
assert.equal(r('JSON.stringify(state.live.energy)'),r('e'));
r('globalThis.beforeBench=matchEnergy(a),loadBefore=a.fatigue;matchUnit("forwards",1);trackIceTime(60)');
assert.ok(r('matchEnergy(a)')>r('beforeBench'));assert.equal(r('a.fatigue'),r('loadBefore'));
r('matchRecover(180,"test-break");globalThis.afterBreak=JSON.stringify(state.live.energy);matchRecover(180,"test-break")');
assert.equal(r('JSON.stringify(state.live.energy)'),r('afterBreak'));
r('save()');const energyReload=boot(energy.storage.value);assert.equal(energyReload.run('JSON.stringify(state.live.energy)'),r('JSON.stringify(state.live.energy)'));
assert.equal(r('Object.values(state.live.energy.players).every(e=>Number.isFinite(e.level)&&e.level>=0&&e.level<=100)'),true);
// Goal records expose the same assists that were credited in the box score.
r('globalThis.scorer=currentLinePlayers()[0],helper=currentLinePlayers()[1];goalHV(scorer,{assistId:helper.id});globalThis.other=rinkOpponentPlayers().filter(p=>p.pos!=="MV");goalOpponent(other[0].name,{assistId:other[1].id})');
assert.equal(r('state.live.analysis.events.filter(e=>e.type==="goal")[0].assists[0].id'),r('helper.id'));
assert.equal(r('state.live.analysis.events.filter(e=>e.type==="goal")[1].assists[0].id'),r('other[1].id'));
assert.match(r('matchScoringView()'),new RegExp(r('helper.name')));assert.match(r('matchScoringView()'),new RegExp(r('other[1].name')));
r('goalHV(scorer,{assistId:null});state.live.analysisShootout=true;analysisEvent("decider","own","Straffavgörande")');
assert.equal(r('state.live.analysis.events.filter(e=>e.type==="goal").at(-1).assists.length'),0);
assert.match(r('matchScoringView()'),/Utan assist/);assert.match(r('matchScoringView()'),/Alla 3 mål/);assert.match(r('matchScoringView()'),/inte som ett spelarmål/);
// Tactical instructions change the simulated duration and shooting decision; feedback cannot stack.
r('matchOrder("shiftLength","short");matchOrder("shotChoice","patient");globalThis.actor=state.live.rink.actors.find(a=>a.side==="own"&&a.pos!=="MV");actor.x=80;globalThis.patient=hockeyShotChoice(actor);matchOrder("shotChoice","shoot")');
assert.equal(r('matchShiftLength()'),30);assert.ok(r('hockeyShotChoice(actor)')>r('patient'));
r('state.live.minute=5;markSocialPeriodStarted();matchTarget("ice");matchFeedback("compete");globalThis.feedback=JSON.stringify(state.live.benchFeedback);matchFeedback("discipline")');
assert.equal(r('JSON.stringify(state.live.benchFeedback)'),r('feedback'));
// Ratings distinguish performance, position and the quality of the available evidence.
const neutral={pos:'C',seconds:900,goals:0,assists:0,shots:1,pim:0};
const grade=(row,partial=false)=>r(`performanceGrade(${JSON.stringify(row)},${partial})`);
assert.ok(grade({...neutral,goals:2,assists:1}).stars>grade(neutral).stars);
assert.ok(grade({...neutral,pos:'B',evenIce:{shotsFor:2,shotsAgainst:12,goalsFor:0,goalsAgainst:2}}).stars<grade(neutral).stars);
assert.equal(grade({...neutral,seconds:0}).stars,null);assert.equal(grade(neutral,true).stars,null);
assert.ok(grade({pos:'MV',seconds:3600,saves:30,against:0}).stars>grade({pos:'MV',seconds:3600,saves:20,against:5}).stars);
assert.equal(grade({pos:'MV',seconds:90,saves:2,against:0}).stars,null);
assert.equal(grade({...neutral,goals:20}).stars,5);
// Leap-month browsing, old-save migration and every club's daily agenda remain independent of simulation.
run('calendarPick("2028-02-01")');assert.equal((run('calendarView()').match(/class="cal-day /g)||[]).length,35);assert.match(run('calendarView()'),/2028-02-29/);
const legacy=JSON.parse(app.storage.value);delete legacy.calendar.plans;const migrated=boot(JSON.stringify(legacy));assert.equal(migrated.run('state.calendar.date'),legacy.calendar.date);assert.equal(migrated.run('managerRoster().length'),legacy.clubRosters.HV71.length);
for(const club of run('Object.keys(state.world.membership)')){run(`startCareerWithClub(${JSON.stringify(club)});deskNavigate('calendar')`);assert.doesNotMatch(get('#content').innerHTML,/undefined|NaN/);}
// Preseason launch and a friendly cannot silently consume several dates.
const pre=boot(),pr=pre.run;
pr('startCareerWithClub("HV71");calendarInitialPreseason();launchSeason()');
assert.equal(pr('state.calendar.date'),'2026-08-01');assert.equal(pr('state.season.phase'),'preseason');
pr('calendarBookFriendly("AIK","2026-08-04");calendarContinue()');assert.equal(pr('state.calendar.date'),'2026-08-02');assert.equal(pr('state.live'),null);
pr('calendarContinue();calendarContinue();calendarContinue();startMatch();trackIceTime(60);calendarFinishFriendly()');
assert.equal(pr('state.calendar.date'),'2026-08-04');assert.equal(pr('state.live.finished'),true);assert.equal(pr('state.live.performance.date'),'2026-08-04');
pr('calendarContinue()');assert.equal(pr('state.calendar.date'),'2026-08-05');assert.equal(pr('state.training.day'),0);
const imported=JSON.parse(pr('saveExportText()')); // Validate the exported wrapper through the real import API.
assert.ok(imported);assert.equal(pr('validateSaveText(saveExportText()).calendar.date'),'2026-08-05');
pr('globalThis.badPlan=JSON.parse(JSON.stringify(state));badPlan.calendar.plans["2026-08-07"]={type:"invalid",intensity:"normal"}');
assert.throws(()=>pr('validateSaveText(JSON.stringify(badPlan))'));
console.log('PASS: exact daily flow, monthly planning, no match-date skipping, dated reports, full-match debrief/grades, inbox panels/scroll/filters, per-player timed energy/recovery, tactical effects, goal assists, old saves and all 28 clubs.');
