'use strict';
const assert=require('node:assert/strict');
const {headlessCareer}=require('./scripts/headless-career.cjs');
const {boot}=require('./scripts/career-test-fixture.cjs');
const app=headlessCareer(),r=app.run;
r(`startCareerWithClub('HV71');globalThis.pressSeq=10000;
globalThis.pressFixture=(win=true,extra={})=>({home:managerClub(),away:'Brynäs IF',homeGoals:win?3:1,awayGoals:win?1:3,played:true,round:++pressSeq,date:state.calendar.date,...extra});
globalThis.pressPlay=(win=true,extra={},rows=[],reports=[],partial=false)=>{const g=pressFixture(win,extra);pressAfterFixture(g,rows,reports,partial);return g;};`);
assert.equal(r('Object.keys(state.press.clubs).length'),28);
r('globalThis.g=pressPlay(false);globalThis.once=JSON.stringify(state.press);pressAfterFixture(g,[],[])');
assert.equal(r('JSON.stringify(state.press)'),r('once'),'repeated fixture cannot emit or apply a second reaction');
assert.equal(r("pressClub('Brynäs IF').editions[0].sample.win"),true);
assert.equal(r('pressClub().editions.length'),1);
r('pressPlay(false);pressPlay(false)');
assert.equal(r('pressClub().editions[0].topic'),'slump');
const low=r('pressClub().pressure');r('pressPlay(true)');
assert.equal(r('pressClub().editions[0].topic'),'rebound');
assert.ok(r('pressClub().pressure')>=15,'one recovery win cannot erase accumulated scrutiny');
assert.ok(r('pressClub().pressure')<low);
// Identical loss is judged differently when expectations differ; overtime cushions it.
r(`globalThis.s=pressClub().recent.at(-1);globalThis.neutral={recent:[],pressure:25};globalThis.strong={...s,win:false,points:0,expected:2.3,target:2,opponentTarget:12,played:0};globalThis.weak={...strong,expected:.7,target:12,opponentTarget:2};`);
assert.ok(r('pressAssessment(neutral,strong).pressure')>r('pressAssessment(neutral,weak).pressure'));
assert.ok(r('pressAssessment(neutral,{...strong,points:1}).pressure')<r('pressAssessment(neutral,strong).pressure'));
// Facts separate team result, individual achievement, youth opportunity and shot volume.
r(`globalThis.young=managerRoster().find(p=>p.pos!=='MV');young.age=20;globalThis.row={club:managerClub(),id:young.id,name:young.name,pos:young.pos,seconds:900,goals:1,assists:2,shots:30};pressPlay(false,{},[row,{club:'Brynäs IF',id:'other',name:'Motståndare',pos:'C',seconds:900,shots:10}]);`);
assert.equal(r('pressClub().editions[0].sample.star.goals'),1);
assert.match(r('pressClub().editions[0].article.star'),/ljuspunkt i förlusten/);
assert.match(r('pressClub().editions[0].article.shots'),/nyanserar förlusten/);
assert.match(r('pressClub().editions[0].voices[2].text'),/15 minuter/);
r('pressPlay(false,{},[row],[],true)');
assert.equal(r('pressClub().editions[0].sample.star'),null);
assert.equal(r('pressClub().editions[0].article.star'),'');
assert.match(r('pressClub().editions[0].article.shots'),/ofullständig/);
// Qualified four-game point drought, never condemnation of an unmeasured work ethic.
r('for(let i=0;i<4;i++)pressPlay(false,{},[{...row,goals:0,assists:0}])');
assert.match(r('pressClub().editions[0].article.scrutiny'),/fyra matcher utan poäng/);
r('pressPlay(false,{},[{...row,goals:0,assists:0,seconds:200}])');assert.equal(r('pressClub().editions[0].article.scrutiny'),'');
// Special teams require a meaningful denominator; strong goalkeeping and derby labels use evidence.
r("pressClub().recent=[];pressPlay(false,{},[],[{club:managerClub(),pp:4,ppGoals:0}])");assert.equal(r('pressClub().editions[0].article.special'),'');
r("pressPlay(false,{},[],[{club:managerClub(),pp:4,ppGoals:0}]);pressPlay(false,{},[],[{club:managerClub(),pp:4,ppGoals:0}])");assert.match(r('pressClub().editions[0].article.special'),/0 mål på 12 powerplay/);
r("pressPlay(false,{},[{club:managerClub(),id:'keeper',name:'Testmålvakt',pos:'MV',seconds:3600,saves:39,against:1}])");assert.match(r('pressClub().editions[0].article.star'),/39 av 40/);
r("globalThis.derby=pressSample({home:'Djurgårdens IF',away:'AIK',homeGoals:2,awayGoals:1,round:9,date:state.calendar.date},'Djurgårdens IF',[],[],false)");assert.equal(r('derby.derby'),true);
// Statements are once-only, match-locked and persist with actual follow-up after reload.
r("pressRespond(pressClub().editions[0].id,'results');globalThis.pledge=JSON.stringify(state.press);pressRespond(pressClub().editions[0].id,'calm')");
assert.equal(r('JSON.stringify(state.press)'),r('pledge'));
r('pressPlay(true);save()');
const reload=boot(app.storage.value),v=reload.run;
assert.equal(v('pressClub().promise.value'),3);
assert.equal(v('pressClub().editions.find(e=>e.response).response.promise.value'),3);
v(`pressAfterFixture({home:'HV71',away:'Brynäs IF',homeGoals:3,awayGoals:1,played:true,round:20000,date:state.calendar.date},[],[]);pressAfterFixture({home:'HV71',away:'Brynäs IF',homeGoals:0,awayGoals:2,played:true,round:20001,date:state.calendar.date},[],[])`);
assert.equal(v('pressClub().promise'),null);
assert.equal(v('pressClub().editions[0].followup.status'),'met');
assert.equal(v('pressClub().editions.find(e=>e.response).response.promise.status'),'met','serialized promise copy is updated, not abandoned after reload');
assert.equal(v('pressClub().credibility'),r('pressClub().credibility')+6);
// Missing targets have a bounded consequence exactly once.
r('pressPlay(false);pressPlay(false)');assert.equal(r('pressClub().editions[0].followup.status'),'missed');
r("globalThis.cred=pressClub().credibility;pressRespond(pressClub().editions[0].id,'calm');globalThis.calm=JSON.stringify(state.press);pressView();pressDeskView();render()");
assert.equal(r('pressClub().credibility'),r('cred'));
assert.equal(r('JSON.stringify(state.press)'),r('calm'),'rendering is not another day or a random editorial roll');
r("pressPlay(true);state.live={finished:false};pressRespond(pressClub().editions[0].id,'results')");assert.equal(r('pressClub().promise'),null);r('state.live=null');
// Youth pledge excuses partial data, counts genuine minutes, and expires neutrally if unverifiable.
r("pressRespond(pressClub().editions[0].id,'youth');pressPlay(true,{},[row],[],true)");assert.equal(r('pressClub().promise.played'),0);
r('pressPlay(true,{},[row]);pressPlay(true,{},[row]);pressPlay(false,{},[])');
assert.equal(r('pressClub().editions[0].followup.status'),'met');
r("pressRespond(pressClub().editions[0].id,'youth');globalThis.cred=pressClub().credibility;for(let i=0;i<6;i++)pressPlay(false,{},[],[],true)");
assert.equal(r('pressClub().editions[0].followup.status'),'closed');assert.equal(r('pressClub().credibility'),r('cred'));
// Transfer to a new employer and phase transitions do not turn an old pledge into a failure.
r("pressRespond(pressClub().editions[0].id,'results');state.managerClub='Brynäs IF';ensurePress()");
assert.equal(r("pressClub('HV71').promise"),null);
assert.equal(r("pressClub('HV71').editions.find(e=>e.response).response.promise.status"),'closed');
r("state.managerClub='HV71';pressPlay(true);pressRespond(pressClub().editions[0].id,'results');state.season.phase='playoffs';ensurePress()");assert.equal(r('pressClub().promise'),null);
r("pressPlay(true,{seriesId:'series-one'});pressRespond(pressClub().editions[0].id,'results')");assert.equal(r('pressClub().promise.target'),2);
r("pressPlay(true,{seriesId:'series-one'});pressPlay(false,{seriesId:'series-one'});pressPlay(true,{seriesId:'series-one'})");assert.equal(r('pressClub().editions[0].followup.status'),'met');
r("pressRespond(pressClub().editions[0].id,'results');state.season.year++;state.season.phase='preseason';ensurePress()");assert.equal(r('pressClub().promise'),null);assert.equal(r('pressClub().recent.length'),0);
// Archive limits, neutral migration, all clubs and XSS-safe names.
r("state.season.phase='regular';for(let i=0;i<80;i++)pressPlay(i%3!==0)");assert.equal(r('pressClub().editions.length'),24);assert.equal(r('pressClub().recent.length'),12);
assert.ok(r('Object.values(state.press.clubs).every(c=>c.pressure>=0&&c.pressure<=100&&Object.values(c.fans).every(n=>n>=0&&n<=100))'));
r('globalThis.old=state.schedule[0];old.played=true;old.homeGoals=3;old.awayGoals=1;delete state.press;ensurePress();pressAfterFixture(old,[],[])');assert.equal(r('Object.values(state.press.clubs).reduce((n,c)=>n+c.editions.length,0)'),0);
r('globalThis.clean=JSON.stringify(state.press);pressPlay(true,{friendly:true});pressAfterFixture({...pressFixture(),played:false},[],[])');assert.equal(r('JSON.stringify(state.press)'),r('clean'));
r(`state.managerCareer.name='<img src=x onerror=bad()>';pressPlay(false);deskNavigate('press')`);assert.doesNotMatch(r('pressView()'),/<img src=x/);assert.match(r('pressView()'),/&lt;img/);
for(const club of r('Object.keys(state.press.clubs)'))for(const tab of ['press','fans','statements']){r(`pressUI.club=${JSON.stringify(club)};pressUI.tab=${JSON.stringify(tab)}`);assert.doesNotMatch(r('pressView()'),/undefined|NaN/);}
// Genuine background and broadcast settlement both reach the observer, once.
r("startCareerWithClub('HV71');globalThis.bg=state.schedule.find(g=>g.home!==managerClub()&&g.away!==managerClub());leagueBackground(bg)");
assert.equal(r('pressClub(bg.home).editions.length'),1);assert.equal(r('pressClub(bg.away).editions.length'),1);
r('globalThis.clean=JSON.stringify(state.press);leagueRecordBackground(bg)');assert.equal(r('JSON.stringify(state.press)'),r('clean'));
r('state.calendar.date=calendarTarget();createMatch();globalThis.steps=0;while(!state.live.finished&&steps++<65000){if(!state.live.running){while(medicalPending())medicalDecisionAccept();startMatch();}studioStep();}');
assert.equal(r('state.live.finished'),true);assert.equal(r('pressClub().editions.length'),1);
assert.equal(r('pressClub().editions[0].sample.gf'),r('state.live.hv'));assert.equal(r('pressClub().editions[0].sample.ga'),r('state.live.opp'));
r('globalThis.clean=JSON.stringify(state.press);finishAnalysis();render()');assert.equal(r('JSON.stringify(state.press)'),r('clean'));
r('save()');assert.equal(boot(app.storage.value).run('JSON.stringify(state.press)'),r('JSON.stringify(state.press)'));
console.log('PASS: all 28 clubs; live/background parity; causal headlines and distinct fans; pressure inertia; qualified player stories; complete/partial data; persisted public commitments; idempotence; archive bounds; career boundaries; escaped UI.');
