'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {boot}=require('./scripts/career-test-fixture.cjs');
function start(){const a=boot(undefined,{production:true});a.run(`startCareerWithClub('HV71');preseasonConfigure('balanced','manager','rotation','assistant','assistant');globalThis.config=calendarPaceStore();for(const k of Object.keys(config.stops))config.stops[k]=false;globalThis.drain=()=>{let n=0;while(calendarPaceRun&&n++<20)calendarPaceTick(calendarPaceRun);if(n>=20)throw Error('Unbounded calendar');};`);return a;}
test('multi-day progression matches ordinary days and stops before the actual friendly',()=>{
 const a=start(),r=a.run;r('save()');const b=boot(a.storage.value,{production:true}),q=b.run;q('resumeCareer()');
 assert.equal(r('calendarPaceStart()'),true);r('drain()');
 assert.equal(r('state.calendar.date'),'2026-08-06');assert.equal(r('calendarPaceSettings().last.days'),5);assert.equal(r('state.live'),null);
 for(let i=0;i<5;i++)q('calendarContinue()');
 const projection='JSON.stringify([state.calendar.date,state.money,state.training.history,managerRoster().map(p=>[p.id,p.fatigue,p.attributes]),state.round,state.rivals.events,state.recruitment.deals])';assert.deepEqual(JSON.parse(r(projection)),JSON.parse(q(projection)));
 assert.ok(r('calendarPaceSettings().last.total')>0);assert.doesNotThrow(()=>r('validateSaveText(saveExportText())'));
});
test('mandatory decisions and an imminent board deadline cannot be switched off or acknowledged away',()=>{
 const {run:r}=start();r(`managerMessage('required-pace','Svara först','Ett riktigt beslut','Spelare',{decisionType:'role'});globalThis.date=state.calendar.date`);
 assert.equal(r('calendarPaceStart()'),false);assert.equal(r('state.calendar.date'),r('date'));assert.equal(r('calendarPaceStart(true)'),false);
 r(`pendingManagerDecision().resolved=true;globalThis.originalAgenda=managerAgendaItems;managerAgendaItems=()=>[...originalAgenda(),{id:'board:test',title:'Styrelsens erbjudande',requiresDecision:true,due:calAdd(state.calendar.date,1),area:'board',action:{page:'board'}}]`);
 assert.equal(r('calendarPaceStart()'),false);assert.match(r('calendarPaceSettings().last.stop.title'),/Styrelsens erbjudande/);assert.equal(r('state.calendar.date'),r('date'));
});
test('fresh scouting evidence stops once and routines are grouped in a persistent summary',()=>{
 const a=start(),r=a.run;r(`config.stops.scouting=true;globalThis.originalContinue=calendarContinue;calendarContinue=()=>{originalContinue();managerMessage('new-scout','Nytt observationsunderlag','Faktisk rapport','Chefsscout');save()};calendarPaceStart();drain()`);
 assert.equal(r('calendarPaceSettings().last.days'),1);assert.equal(r('calendarPaceSettings().last.stop.title'),'Nytt observationsunderlag');assert.ok(r(`calendarPaceView().includes('Samlad rapport')`));
 r(`calendarContinue=originalContinue;calendarPaceStart(true);drain()`);assert.equal(r('state.calendar.date'),'2026-08-06');
 r('save()');assert.equal(boot(a.storage.value,{production:true}).run('calendarPaceSettings().last.end'),'2026-08-06');
});
test('optional story decisions can be reviewed, but a due offer always stops progression',()=>{
 const {run:r}=start();r(`config.stops.stories=true;globalThis.p=journeyCandidates()[0];journeyStart(p.id);globalThis.date=state.calendar.date`);
 assert.equal(r('calendarPaceStart()'),false);assert.equal(r('calendarPaceSettings().last.stop.kind'),'stories');assert.equal(r('state.calendar.date'),r('date'));
 r(`calendarPaceStart(true);drain()`);assert.ok(r('state.calendar.date')>r('date'));
 r(`state.recruitment.incoming.push({id:991,name:'Viktig spelare',buyer:'AIK',kind:'transfer',status:'pending',stage:'offer',fee:0,expiresDate:calAdd(state.calendar.date,1)});config.stops.affairs=false;globalThis.date=state.calendar.date`);
 assert.equal(r('calendarPaceStart()'),false);assert.equal(r('calendarPaceStart(true)'),false);assert.equal(r('state.calendar.date'),r('date'));
});
test('cancellation, replaced careers and a failing day never replay or start a match',()=>{
 const {run:r}=start();r(`calendarPaceStart();calendarPaceCancel();globalThis.date=state.calendar.date`);assert.equal(r('calendarPaceRun'),null);assert.equal(r('state.calendar.date'),r('date'));
 r(`calendarPaceStart();globalThis.old=calendarPaceRun;startCareerWithClub('AIK');calendarPaceTick(old)`);assert.equal(r('calendarPaceRun'),null);assert.equal(r('state.calendar.date'),'2026-08-01');
 r(`preseasonConfigure('balanced','manager','rotation','assistant','assistant');for(const k of Object.keys(calendarPaceStore().stops))calendarPaceStore().stops[k]=false;globalThis.count=0;calendarContinue=()=>{count++;throw Error('controlled calendar failure')};calendarPaceStart();globalThis.tx=calendarPaceRun;calendarPaceTick(tx);calendarPaceTick(tx)`);
 assert.equal(r('count'),1);assert.equal(r('calendarPaceSettings().last.stop.kind'),'error');assert.equal(r('calendarPaceRun'),null);assert.equal(r('state.live'),null);
});
test('settings and summary reads do not advance time; malformed persisted settings are rejected',()=>{
 const a=start(),r=a.run;r('save()');const before=r('JSON.stringify(state)');r('calendarPaceView();calendarPaceSignals()');assert.equal(r('JSON.stringify(state)'),before);
 r(`managerMessage('club-summary','HV71:s samtal','Beslut','Spelare',{decisionType:'role'});calendarPaceStart();state.managerClub='AIK';globalThis.page=state.page;calendarPaceOpen()`);assert.equal(r('state.page'),r('page'));assert.doesNotMatch(r('calendarPaceView()'),/HV71:s samtal/);
 r(`config.stops.projects='yes'`);assert.throws(()=>r('validateSaveText(saveExportText())'),/Ogiltiga kalenderinställningar/);
});
