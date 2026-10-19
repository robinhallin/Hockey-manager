'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {boot}=require('./scripts/career-test-fixture.cjs');
function setup(production=false){
 const a=boot(null,{production}),r=a.run;r(`startCareerWithClub('HV71');${production?"preseasonConfigure('balanced','manager','rotation','manager','assistant');":''}
 globalThis.young=managerRoster().find(p=>p.age<=23&&p.pos==='C'&&medicalReady(p));
 journeyStart(young.id);globalThis.story=state.stories.active.find(s=>s.ids.includes(String(young.id)));storiesChoose(story.id,'promote');
 changeLinePlayer('forwards',10,young.id);for(const p of managerRoster())p.fatigue=5;
 globalThis.veteran=playerById(state.lines.forwards[1]);veteran.fatigue=70;
 globalThis.d=personalMatchDilemma(),cash=state.money,promise=JSON.stringify(story.expectation),roles=JSON.stringify(managerRoster().map(p=>[p.id,p.promisedRole,p.recruitmentPromise]));`);
 assert.ok(r('d'));assert.equal(r('d.candidate.id'),r('young.id'));return a;
}
function matchSample(r,extra=''){
 r(`state.calendar.date=calendarTarget();globalThis.capture=personalMatchCapture(personalMatchFixture().opponent);globalThis.sample={id:'personal-1',club:managerClub(),year:state.season.year,date:state.calendar.date,opponent:capture.opponent,finished:true,friendly:false,partial:false,abandoned:false,own:3,against:1,personalMatch:capture,players:capture.subjects.map(p=>({id:p.id,name:p.name,seconds:p.id===String(young.id)?720:240,goals:p.id===String(young.id)?1:0,assists:0})),shots:[],events:[],units:[],${extra}};`);
}
test('views use the real trial and a concrete pair without changing time, money, promises or lineup',()=>{
 const {run:r}=setup();r('globalThis.before=JSON.stringify([state.lines,state.matchSelection,state.clubOffice,state.playerJourneys,state.calendar,state.money]);personalMatchOverview();personalMatchDilemmaView();personalMatchPreviewView()');assert.equal(r('JSON.stringify([state.lines,state.matchSelection,state.clubOffice,state.playerJourneys,state.calendar,state.money])'),r('before'));
 assert.equal(r('personalMatchFocus().kind'),'trial');assert.match(r('personalMatchDilemmaView()'),/Assistentens två uttagningsalternativ/);assert.match(r('personalMatchDilemmaView()'),/70\/100 slitage/);assert.equal(r('JSON.stringify(story.expectation)'),r('promise'));
});
test('both choices are explicit, use actual lineup changes, survive reload, and add no promise or bonus',()=>{
 const a=setup(),r=a.run;r('globalThis.lines=JSON.stringify(state.lines);personalMatchChoose("stay",d.signature)');assert.equal(r('JSON.stringify(state.lines)'),r('lines'));assert.equal(r('state.clubOffice.personalMatch.choice.choice'),'stay');
 r('d=personalMatchDilemma();personalMatchChoose("rotate",d.signature);save()');assert.equal(r('state.lines.forwards[1]'),r('young.id'));assert.equal(r('state.lines.forwards[10]'),r('veteran.id'));assert.equal(r('state.money'),r('cash'));assert.equal(r('JSON.stringify(story.expectation)'),r('promise'));assert.equal(r('JSON.stringify(managerRoster().map(p=>[p.id,p.promisedRole,p.recruitmentPromise]))'),r('roles'));
 assert.doesNotThrow(()=>r('validateSaveText(saveExportText())'));const q=boot(a.storage.value).run;assert.equal(q('state.clubOffice.personalMatch.choice.choice'),'rotate');assert.equal(q('state.lines.forwards[1]'),r('young.id'));
});
test('stale proposals, locked places, unavailable players and a live match cannot be overwritten',()=>{
 const {run:r}=setup();r('veteran.fatigue=69');assert.equal(r('personalMatchChoose("rotate",d.signature)'),false);
 r('veteran.fatigue=70;tacticsLock("forwards",1)');assert.ok(r('!personalMatchDilemma()||personalMatchDilemma().starter.id!==veteran.id'));assert.equal(r('personalMatchChoose("rotate",d.signature)'),false);
 r('tacticsLock("forwards",1);young.health.injury={name:"Skada",remaining:8,initial:8,readiness:30}');assert.ok(r('!personalMatchDilemma()||personalMatchDilemma().candidate.id!==young.id'));
 r('young.health.injury=null;d=personalMatchDilemma();state.calendar.date=calendarTarget();startMatch()');assert.equal(r('personalMatchChoose("rotate",d.signature)'),false);
});
test('kickoff freezes actual placement after late manual changes, not an earlier proposed lineup',()=>{
 const {run:r}=setup();r('personalMatchChoose("rotate",d.signature);state.calendar.date=calendarTarget();createMatch();changeLinePlayer("forwards",10,young.id);depthLock()');
 assert.equal(r('state.live.personalMatch.choice.changed'),true);assert.equal(r('state.live.personalMatch.subjects.find(p=>p.id===String(young.id)).place'),'Kedja 4');
 r('globalThis.frozen=JSON.stringify(state.live.personalMatch);state.live.minute=4;depthLock()');assert.equal(r('JSON.stringify(state.live.personalMatch)'),r('frozen'));assert.doesNotThrow(()=>r('validateSaveText(saveExportText())'));
});
test('after-match reports use actual ice and production, preserve the trial and do not claim a causal effect',()=>{
 const {run:r}=setup();r('personalMatchChoose("rotate",d.signature)');matchSample(r);r('personalMatchAfter(sample)');
 assert.match(r('sample.personalOutcome.rows.find(p=>p.playerId===String(young.id)).text'),/12:00/);assert.match(r('sample.personalOutcome.rows.find(p=>p.playerId===String(young.id)).text'),/1 mål/);assert.match(r('sample.personalOutcome.rows.find(p=>p.playerId===String(young.id)).text'),/Första registrerade målet/);assert.match(r('sample.personalOutcome.rows.find(p=>p.playerId===String(young.id)).text'),/nådde provperiodens minutgräns/);assert.equal(r('JSON.stringify(story.expectation)'),r('promise'));
 r('globalThis.before=JSON.stringify([sample,state.playerJourneys]);personalMatchOutcomeView(sample);personalMatchOutcomeView(sample)');assert.equal(r('JSON.stringify([sample,state.playerJourneys])'),r('before'));
 r('sample.players.find(p=>p.id===String(young.id)).seconds=0;sample.players.find(p=>p.id===String(young.id)).goals=0;personalMatchAfter(sample)');assert.match(r('sample.personalOutcome.rows.find(p=>p.playerId===String(young.id)).text'),/Ingen registrerad istid/);assert.match(r('sample.personalOutcome.rows.find(p=>p.playerId===String(young.id)).text'),/nådde inte/);
});
test('friendlies, medical exclusions, partial records and missing player rows remain distinct',()=>{
 const {run:r}=setup();matchSample(r,'friendly:true');r('personalMatchAfter(sample)');assert.match(r('sample.personalOutcome.note'),/Träningsmatch/);assert.doesNotMatch(r('JSON.stringify(sample.personalOutcome)'),/Första registrerade målet|nådde provperiodens/);
 r('sample.friendly=false;sample.partial=true;delete sample.personalOutcome;personalMatchAfter(sample)');assert.equal(r('sample.personalOutcome'),undefined);
 r('sample.partial=false;sample.abandoned=true;personalMatchAfter(sample)');assert.equal(r('sample.personalOutcome'),undefined);
 r('sample.abandoned=false;sample.players=[];personalMatchAfter(sample)');assert.match(r('sample.personalOutcome.rows[0].text'),/underlag saknas/);
 r('sample.players=[{id:young.id,seconds:120,goals:0,assists:0}];young.health.injury={name:"Skada",remaining:10};personalMatchAfter(sample)');assert.match(r('sample.personalOutcome.rows.find(p=>p.playerId===String(young.id)).text'),/Medicinsk frånvaro/);
});
test('a real full competitive match archives one frozen result and keeps it after save/reload',()=>{
 const a=setup(),r=a.run;r(`personalMatchChoose('rotate',d.signature);state.calendar.date=calendarTarget();startMatch();state.page='match';globalThis.steps=0;
 while(!state.live.finished&&steps++<65000){if(!state.live.running){while(medicalPending())medicalDecisionAccept();startMatch();}studioStep();}
 globalThis.report=state.analysis.matches[0];globalThis.result=JSON.stringify(report.personalOutcome);finishAnalysis();save();`);
 assert.equal(r('state.live.finished'),true);assert.ok(r('report.personalOutcome'));assert.ok(r('report.personalMatch.subjects.some(p=>p.id===String(young.id))'));assert.match(r('matchFeedbackView()'),/Ditt val och matchens utfall/);assert.equal(r('JSON.stringify(report.personalOutcome)'),r('result'));assert.doesNotThrow(()=>r('validateSaveText(saveExportText())'));
 const q=boot(a.storage.value).run;assert.equal(q('JSON.stringify(state.analysis.matches[0].personalOutcome)'),r('result'));assert.equal(q('state.analysis.matches.filter(m=>m.id===state.analysis.matches[0].id).length'),1);
});
test('old saves have no invented outcome, departed players stop being candidates, and saved snapshots validate in club banks',()=>{
 const {run:r}=setup();r('globalThis.s=state.clubOffice.personalMatch;');assert.equal(r('s'),undefined);assert.equal(r('personalMatchOutcomeView({club:managerClub()})'),'');
 r('personalMatchSetFocus(young.id);globalThis.c=state.clubOffice.personalMatch;globalThis.oldKey=c.key;state.calendar.date=calAdd(calendarTarget(),1)');assert.equal(r('personalMatchConfig()'),null);
 r('state.managerCareer.bank.HV71={clubOffice:{personalMatch:{...c,version:2}}}');assert.throws(()=>r('validatePersonalMatch(state)'),/matchberättelse/);
});
test('recent signings, comebacks and reunions use dated ownership and medical facts',()=>{
 const {run:r}=setup(true);r(`storiesClose(story,'Avslutad','Kontrollerat slut på provperioden');state.money=1e8;state.boardPlan.offer.wageLimit=1e8;state.season.nextWageLimit=1e8;
 globalThis.p=state.playerWorld.freeAgents.find(p=>p.name==='Daniel Brodin'),w=recruitPlayerWishes(p);submitRecruitOffer(p.id,0,w.salary*2,Math.min(2,w.maxYears),w.role);globalThis.deal=state.recruitment.deals[0];state.calendar.date=deal.dueDate;resolveRecruitDeal(deal);`);
 assert.equal(r('deal.status'),'signed');assert.ok(r('personalMatchCandidates().some(r=>r.kind==="arrival"&&r.playerId===String(p.id))'));assert.doesNotMatch(r('personalMatchCandidates().find(r=>r.kind==="arrival").title'),/tävlingsmatch/);
 r(`globalThis.memory=journeyTrack(young);memory.clubs[managerClub()]={games:2,goals:0,absent:calAdd(state.calendar.date,-9)};`);assert.ok(r('personalMatchCandidates().some(r=>r.kind==="comeback"&&r.playerId===String(young.id))'));
 r(`globalThis.g=personalMatchFixture(),former=managerRoster().filter(p=>p.pos==='MV')[2];state.clubRosters[managerClub()]=managerRoster().filter(p=>p!==former);state.clubRosters[g.opponent].push(former);former.club=g.opponent;
 state.recruitment.history.unshift({id:state.recruitment.nextId++,date:state.calendar.date,name:former.name,playerId:former.id,seller:managerClub(),buyer:g.opponent,fee:100000});personalMatchSetFocus(former.id);state.calendar.date=g.date;
 globalThis.reunion=personalMatchCapture(g.opponent),report={id:'reunion',club:managerClub(),year:state.season.year,date:g.date,opponent:g.opponent,finished:true,own:1,against:0,personalMatch:reunion,players:[]};personalMatchAfter(report);`);
 assert.equal(r('reunion.focus.kind'),'reunion');assert.equal(r('reunion.focus.own'),false);assert.match(r('report.personalOutcome.note'),/deltagande bedöms inte/);
});
test('a tired goalkeeper can be replaced through the ordinary goalie selection, and quiet squads need no dilemma',()=>{
 const {run:r}=setup();r(`storiesClose(story,'Avslutad','Kontrollerat slut');for(const p of managerRoster())p.fatigue=5;`);assert.equal(r('personalMatchDilemma()'),null);
 r(`globalThis.keeper=playerById(state.lines.goalie);keeper.fatigue=75;d=personalMatchDilemma();globalThis.candidate=d.candidate.id;personalMatchChoose('rotate',d.signature)`);assert.equal(r('d.slot.type'),'goalie');assert.equal(r('state.lines.goalie'),r('candidate'));assert.equal(r('state.matchSelection.backup'),r('keeper.id'));assert.doesNotThrow(()=>r('validateSaveText(saveExportText())'));
});

test('a first match with a legacy role promise can start before any lineup exists',()=>{
 const {run:r}=boot();r(`startCareerWithClub('HV71');globalThis.p=managerRoster()[0];p.recruitmentPromise={minutes:12,games:2,qualified:1,resolved:false};globalThis.before=JSON.stringify(state.lines);state.calendar.date=calendarTarget();`);
 assert.equal(r('state.lines'),undefined);assert.equal(r('personalMatchCapture(personalMatchFixture().opponent)'),null);assert.equal(r('JSON.stringify(state.lines)'),r('before'));assert.doesNotMatch(r('personalMatchPreviewView()'),/undefined/);
 r('startMatch()');assert.ok(r('state.live'));assert.ok(r('state.live.matchSquad'));assert.ok(r('state.live.personalMatch'));assert.equal(r('state.live.personalMatch.focus.playerId'),r('String(p.id)'));assert.doesNotThrow(()=>r('validateSaveText(saveExportText())'));
});
