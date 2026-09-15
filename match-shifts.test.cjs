'use strict';
const assert=require('node:assert/strict');
const {test}=require('node:test');
const {Match,STEP}=require('./match-simulation');
const rosters=require('./match-lab-rosters');
const {boot}=require('./scripts/career-test-fixture.cjs');
function career(){const app=boot();app.run(`startCareerWithClub('HV71');state.calendar.date=calendarTarget();startMatch();medicalRoll=()=>.999;`);return app;}

test('A deep retrieval permits changing; a rush towards our end aborts the outgoing skater',()=>{
 const m=new Match(rosters,{scenario:'change'}),t=m.teams[0];
 const enemy=m.skaters(1)[0];enemy.x=51;enemy.y=20;m.takePossession(enemy);
 t.requested=true;m.updateChanges(STEP);
 assert.ok(t.change,'opponent possession deep in their end is not an automatic change ban');
 const a=m.actor(t.change.id);assert.equal(a.status,'leaving');
 m.updateChanges(STEP);assert.ok(t.change,'deep retrieval does not cancel the outgoing change');
 enemy.x=33;m.puck.x=33;m.updateChanges(STEP);
 assert.equal(t.change,null);assert.equal(a.status,'playing');
 assert.equal(m.skaters(0).length,5);
});

test('The real shift threshold is honoured without modifying the clock',()=>{
 const m=new Match(rosters);m.stoppage=0;m.carrier=null;m.owner=1;m.puck.x=10;
 for(const t of m.teams){t.shiftLimit=30;t.shift=31;}
 m.updateChanges(STEP);assert.ok(m.teams[0].requested);assert.equal(m.teams[0].shift,31);
});

test('Exhausted formations value a real dump for their change, at the cost of possession',()=>{
 const app=career();app.run(`globalThis.e=studioEngine();globalThis.a=e.skaters(0)[0];a.x=35;a.y=10;e.puck={x:35,y:10};e.takePossession(a);updateFatigue(1,studioPlayers(0,false),studioPlayers(1,false));`);
 const before=app.run(`e.actionOptions(a).find(r=>r.kind==='dump').value`);
 app.run(`e.teams[0].requested=true;state.live.energy.players[a.player.id].shift=80;`);
 assert.ok(app.run(`e.actionOptions(a).find(r=>r.kind==='dump').value`)>before+.2);
 assert.match(app.run(`e.actionOptions(a).find(r=>r.kind==='dump').reason`),/byta/);
});

test('Matching follows the actual opponent, readiness and manual override',()=>{
 const app=career();app.run(`globalThis.e=studioEngine();e.stoppage=0;matchSetMatchup('matchupLine','2');matchSetMatchup('matchupTarget','1');e.teams[1].line=1;e.installUnit(1);e.teams[1].line=3;e.teams[0].rotationIndex=0;updateFatigue(1,studioPlayers(0,false),studioPlayers(1,false));e.nextUnit(0);`);
 assert.equal(app.run('e.teams[0].line'),2,'actual line 2, not intended line 4, triggers our checking line');
 app.run(`for(const id of state.lines.forwards.slice(6,9))state.live.energy.players[id].level=35;e.teams[0].rotationIndex=0;e.nextUnit(0);`);
 assert.notEqual(app.run('e.teams[0].line'),2,'tired checking line gets real bench rest');
 app.run(`for(const id of state.lines.forwards.slice(6,9))state.live.energy.players[id].level=95;e.teams[0].line=2;e.installUnit(0);for(const id of state.lines.forwards.slice(6,9))state.live.energy.players[id].shift=80;e.teams[0].rotationIndex=0;e.nextUnit(0);`);
 assert.notEqual(app.run('e.teams[0].line'),2,'cannot keep the checking line on for repeated long shifts');
 app.run(`e.teams[0].nextLine=3;e.nextUnit(0);`);assert.equal(app.run('e.teams[0].line'),3,'explicit bench instruction wins');
 app.run(`e.stoppage=2;e.icingHold=0;const old=e.skaters(0).map(a=>a.id).join();e.teams[0].requested=true;e.changeAtStoppage();globalThis.held=old===e.skaters(0).map(a=>a.id).join();`);
 assert.ok(app.run('held'),'icing forbids replacement');
});

test('Home bench sees the away formation declared first',()=>{
 const app=career();
 const order=app.run(`(()=>{const e=studioEngine(),seen=[],base=e.installUnit;e.installUnit=function(s){seen.push(s);return base.call(this,s)};e.teams.forEach(t=>{t.requested=true;t.shift=50});e.changeAtStoppage();return JSON.stringify(seen)})()`);
 const home=app.run(`state.schedule.find(g=>g.round===state.round&&(g.home===managerClub()||g.away===managerClub())).home===managerClub()?0:1`);
 assert.deepEqual(JSON.parse(order),[1-home,home]);
});

test('Formation exposure and goals use actual skaters, distinguish mixed changes and survive saving',()=>{
 const app=career();app.run(`globalThis.e=studioEngine();for(const side of [0,1]){e.teams[side].line=0;e.installUnit(side);}state.live.penaltiesHV=[];state.live.penaltiesOpp=[];e.penalty=null;e.penalties=[];delete state.live.analysis.lineMatchups;matchLineExposure(60);matchLineShot({side:'own',outcome:'goal',dangerous:true});e.teams[0].line=2;matchLineExposure(30);globalThis.old=e.skaters(0).find(a=>a.role==='LW');e.actors=e.actors.filter(a=>a!==old);e.actors.push(e.makeActor(0,e.unit(0,2)[0],{x:30,y:10}));matchLineExposure(20);matchLineShot({side:'opponent',outcome:'save',dangerous:false});`);
 const rows=JSON.parse(app.run(`JSON.stringify(matchLineRows(state.live.analysis.lineMatchups))`));
 assert.equal(rows[0].seconds,90);assert.equal(rows[0].goalsFor,1);assert.equal(rows[2].seconds,0);assert.equal(rows[4].seconds,20);assert.equal(rows[4].shotsAgainst,1);
 app.run(`e.actors=e.actors.filter(a=>!(a.side===0&&a.role==='G'));matchLineExposure(40);`);
 assert.equal(app.run(`matchLineRows(state.live.analysis.lineMatchups).reduce((n,r)=>n+r.seconds,0)`),110,'empty net is not 5v5');
 app.run(`matchSetMatchup('matchupLine','2');save();`);
 const reload=boot(app.storage.value);assert.equal(reload.run('state.tacticalPlan.matchupLine'),'2');
 assert.deepEqual(JSON.parse(reload.run('JSON.stringify(analysisSnapshot().lineMatchups)')),JSON.parse(app.run('JSON.stringify(state.live.analysis.lineMatchups)')));
 app.run(`state.live.finished=true;finishAnalysis();`);
 assert.equal(app.run(`state.analysis.matches[0].lineMatchups.cells['0:0'].goalsFor`),1);
 assert.match(app.run(`matchLineReport(state.analysis.matches[0])`),/Kedjornas matchbild/);
});

test('Changing a matchup pauses safely; following its table does not advance the clock',()=>{
 const app=career();app.run(`state.live.running=true;matchSetMatchup('matchupLine','3');`);
 assert.equal(app.run('state.live.running'),false);
 const before=app.run('JSON.stringify(state.live.broadcast)');
 app.run(`matchDesk.tab='changes';matchChangesMode('matchup');matchLivePanel();matchChangesView();`);
 assert.equal(app.run('matchReadOnlyTab()'),true);assert.equal(app.run('JSON.stringify(state.live.broadcast)'),before);
 assert.match(app.run('matchChangesView()'),/Vår matchningskedja/);
});

test('A pending bench exchange resumes with the same players, puck and recorded exposure',()=>{
 const app=career();app.run(`globalThis.e=studioEngine();e.started=true;e.stoppage=0;e.pendingFaceoff=false;const rows=e.unit(0,1,1),out=e.skaters(0).find(a=>a.role===rows[0].role);out.x=27;out.y=1.1;out.status='leaving';e.teams[0].line=1;e.teams[0].pair=1;e.teams[0].change={stage:'out',id:out.id,row:rows[0],gate:27};e.teams[0].changeQueue=rows.slice(1);const carrier=e.skaters(0).find(a=>a!==out);carrier.x=48;carrier.y=15;e.takePossession(carrier);save();`);
 const reload=boot(app.storage.value);
 for(const a of [app,reload])a.run(`medicalRoll=()=>.999;startMatch();for(let i=0;i<250;i++)studioStep();`);
 const snapshot=`JSON.stringify([studioEngine().rng,studioEngine().puck,studioEngine().actors.map(a=>[a.id,a.x,a.y,a.status]),state.live.analysis.lineMatchups])`;
 assert.equal(app.run(snapshot),reload.run(snapshot));
 assert.equal(reload.run(`new Set(studioEngine().actors.map(a=>a.side+':'+a.player.id)).size`),reload.run('studioEngine().actors.length'));
});
