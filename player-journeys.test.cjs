'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {boot}=require('./scripts/career-test-fixture.cjs');
function start(){const a=boot(undefined,{production:true});a.run(`startCareerWithClub('HV71');globalThis.p=journeyCandidates()[0];globalThis.sample=(id,seconds=600,extra={})=>({id,club:managerClub(),year:state.season.year,date:state.calendar.date,opponent:'Frölunda HC',finished:true,own:2,against:1,players:[{id:p.id,seconds,goals:1,assists:0}],units:[],...extra});`);return a;}
test('a chosen preseason journey becomes a measured trial and survives reload',()=>{
 const a=start(),r=a.run;r(`globalThis.role=p.promisedRole;globalThis.cash=state.money;globalThis.lines=JSON.stringify(state.lines);journeyStart(p.id);globalThis.s=state.stories.active.find(s=>s.ids.includes(String(p.id)));globalThis.trust=p.social.trust;storiesChoose(s.id,'promote')`);
 assert.equal(r('s.status'),'following');assert.equal(r('s.expectation.matches'),4);assert.equal(r('p.promisedRole'),r('role'));assert.equal(r('state.money'),r('cash'));assert.equal(r('JSON.stringify(state.lines)'),r('lines'));
 r(`storiesAfterMatch(sample('friendly',900,{friendly:true}));storiesAfterMatch(sample('partial',900,{partial:true}));`);assert.equal(r('s.expectation.eligible'),0);
 r(`save()`);const b=boot(a.storage.value,{production:true}),q=b.run;
 q(`state.season.phase='regular';globalThis.p=managerRoster().find(p=>p.id===${JSON.stringify(r('p.id'))});globalThis.s=state.stories.active.find(s=>s.ids.includes(String(p.id)));globalThis.sample=(id,seconds)=>({id,club:managerClub(),year:state.season.year,date:state.calendar.date,opponent:'Frölunda HC',finished:true,own:2,against:1,players:[{id:p.id,seconds,goals:0,assists:0}],units:[]});for(let i=0;i<4;i++)storiesAfterMatch(sample('trial-'+i,i<3?600:0))`);
 assert.equal(q('s.status'),'closed');assert.equal(q('s.outcome'),'Din satsning blev verklighet');assert.ok(q('p.social.trust')>r('trust'));assert.ok(q(`journeyPlayer(p.id).events.some(e=>e.title==='Ditt besked')`));assert.ok(q(`journeyPlayer(p.id).events.some(e=>e.title==='Din satsning blev verklighet')`));
 const before=q('JSON.stringify([p.social,state.playerJourneys])');q(`storiesAfterMatch(sample('trial-3',0));journeyPlayerView(p);overviewWorkspaceView()`);assert.equal(q('JSON.stringify([p.social,state.playerJourneys])'),before);
 assert.doesNotThrow(()=>q('validateSaveText(saveExportText())'));
});
test('the same trial with too little actual ice time has a different lasting outcome',()=>{
 const {run:r}=start();r(`journeyStart(p.id);globalThis.s=state.stories.active.find(s=>s.ids.includes(String(p.id)));storiesChoose(s.id,'promote');state.season.phase='regular';globalThis.trust=p.social.trust;for(let i=0;i<4;i++)storiesAfterMatch(sample('miss-'+i,60))`);
 assert.equal(r('s.status'),'closed');assert.equal(r('s.outcome'),'Ansvar som ännu inte blev verklighet');assert.ok(r('p.social.trust')<r('trust'));
});
test('milestones use actual complete competitive records and are never replayed',()=>{
 const {run:r}=start();r(`journeyTrack(p);journeyAfterMatch(sample('friendly',600,{friendly:true}));journeyAfterMatch(sample('partial',600,{partial:true}));journeyAfterMatch(sample('abandoned',600,{abandoned:true}));`);
 assert.equal(r('journeyPlayer(p.id).events.length'),0);
 r(`journeyAfterMatch(sample('first'));globalThis.before=JSON.stringify(state.playerJourneys);journeyAfterMatch(sample('first'))`);assert.equal(r('JSON.stringify(state.playerJourneys)'),r('before'));assert.equal(r('journeyPlayer(p.id).events.length'),2);
 r(`p.health.injury={name:'Testskada',remaining:15,initial:15,readiness:40};journeyDay();state.calendar.date=calAdd(state.calendar.date,10);p.health.injury=null;p.health.clearance='full';journeyAfterMatch(sample('return'))`);
 assert.ok(r(`journeyPlayer(p.id).events.some(e=>e.kind==='comeback')`));
});
test('departures and a new employer preserve the coach-owned player timeline',()=>{
 const a=start(),r=a.run;r(`journeyTrack(p);journeyAfterMatch(sample('first'));globalThis.id=p.id;state.clubRosters.HV71=state.clubRosters.HV71.filter(q=>q!==p);state.clubRosters['AIK'].push(p);p.club='AIK';journeyDay();globalThis.length=journeyPlayer(p.id).events.length;state.managerClub='AIK';syncManagerRoster();journeyDay();state.season.year++;journeyDay();save()`);
 assert.equal(r('journeyPlayer(id).events.length'),r('length'));assert.ok(r(`journeyPlayer(id).events.some(e=>e.kind==='departure'&&e.club==='HV71')`));
 const q=boot(a.storage.value,{production:true}).run;assert.equal(q(`journeyPlayer(${JSON.stringify(r('id'))}).events.length`),r('length'));
});
test('old saves migrate quietly, views escape text, invalid memories are rejected',()=>{
 const a=start(),r=a.run;r(`delete state.playerJourneys;ensurePlayerJourneys();globalThis.before=JSON.stringify(state.playerJourneys);journeyOverview();journeyPlayerView(p)`);assert.equal(r('JSON.stringify(state.playerJourneys)'),r('before'));assert.equal(r('Object.keys(state.playerJourneys.players).length'),0);
 r(`journeyEvent(p,'escaped','decision','<img src=x>','<script>bad</script>')`);assert.doesNotMatch(r('journeyPlayerView(p)'),/<img src=x>/);assert.match(r('journeyPlayerView(p)'),/&lt;img/);
 r(`state.playerJourneys.players[String(p.id)].events[0].kind='unknown'`);assert.throws(()=>r('validatePlayerJourneys(state)'),/Ogiltiga spelarresor/);
});
test('real conversations and a signed renewal join the same player history',()=>{
 const a=start(),r=a.run;r(`journeyTrack(p);socialTalk(p.id,'listen');globalThis.count=journeyPlayer(p.id).events.length;socialTalk(p.id,'listen')`);
 assert.equal(r('journeyPlayer(p.id).events.length'),r('count'));assert.ok(r(`journeyPlayer(p.id).events.some(e=>e.title==='Tränaren lyssnar')`));
 r(`p.contractYears=1;state.money=1e9;state.boardPlan.offer.wageLimit=1e9;state.season.nextWageLimit=1e9;openContractNegotiation(p.id);globalThis.w=renewalWishes(p);submitContractRenewal(p.id,w.salary,Math.max(w.minYears,2),w.role)`);
 assert.equal(r('state.contractNegotiation'),null);assert.ok(r(`journeyPlayer(p.id).events.some(e=>e.title==='Ni valde en framtid tillsammans')`));assert.doesNotThrow(()=>r('validateSaveText(saveExportText())'));
});
