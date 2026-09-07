const assert=require('node:assert/strict');
const {boot}=require('./scripts/career-test-fixture.cjs');
const app=boot(),r=app.run;
r(`startCareerWithClub('HV71');medicalRoll=()=>.999;ensureLines();ensureSpecialTeams();globalThis.f=playerById(state.lines.forwards[0]);globalThis.d=playerById(state.lines.defense[0]);`);
assert.ok(r('positionFit(d,"LW")')<.7);
assert.ok(r('positionFit({pos:"C"},"LW")')>.9);
assert.equal(r('positionFit({pos:"F",research:{position:"C/RW"}},"C")'),1);
r('changeLinePlayer("forwards",0,d.id);ensureLines()');
assert.equal(r('state.lines.forwards[0]===d.id&&state.lines.defense[0]===f.id'),true);
assert.equal(r('new Set([...state.lines.forwards,...state.lines.defense]).size'),18);
r('save()');const loaded=boot(app.storage.value);assert.equal(loaded.run('state.lines.forwards[0]'),r('d.id'));
assert.ok(r('lineupBoardView()').includes('Kedja 4'));assert.ok(r('lineupBoardView()').includes('ondrop='));assert.ok(r('lineupBoardView()').includes('Kemi'));
const initial=r('lineChemistry(state.lines.forwards.slice(0,3)).value');
r(`globalThis.ids=state.lines.forwards.slice(0,3);for(let i=0;i<3;i++)for(let j=i+1;j<3;j++)dynamicsClub().pairs[dynamicsKey(ids[i],ids[j])]={seconds:36000,form:4};`);
assert.ok(r('lineChemistry(ids).value')>initial);
// Shared nationality is a small, transparent contribution; it never overrides role suitability.
r(`globalThis.p1=playerById(ids[0]);globalThis.p2=playerById(ids[1]);p1.nationality='Sweden';p2.nationality='Sweden';globalThis.shared=lineChemistry(ids.slice(0,2)).value;p2.nationality='Finland';`);
assert.equal(r('shared-lineChemistry(ids.slice(0,2)).value'),5);
r(`globalThis.choice=clubPriorityChoices().find(k=>k!=='balanced');clubSetPolicy('priority',choice);globalThis.locked=state.clubOffice.priority;clubSetPolicy('priority','balanced')`);
assert.equal(r('state.clubOffice.priority'),r('locked'));
r('globalThis.oldChoices=clubPriorityChoices().join();state.season.year++;clubNewYear()');assert.equal(r('state.clubOffice.priorityLockedYear'),null);assert.notEqual(r('clubPriorityChoices().join()'),r('oldChoices'));
// Real actor roles preserve the editor's order, including an out-of-position defender.
r("state.calendar.date=calendarTarget();startMatch();globalThis.e=studioEngine();");
assert.equal(r('e.unit(0,0,0)[0].player.id'),r('d.id'));assert.equal(r('e.unit(0,0,0)[0].role'),'LW');
assert.ok(r('e.attribute(e.actors.find(a=>a.player.id===d.id),"passing")')<r('d.attributes.passing'));
for(const mode of ['full','extended','highlights','commentary']){r(`rinkMode('${mode}')`);assert.equal(r('state.live.rink.mode'),mode);}
r('state.live.rink.mode="commentary";state.live.speed=1;globalThis.slow=studioPlaybackRate(e);state.live.speed=4');assert.ok(r('studioPlaybackRate(e)')>r('slow'));
r('state.live.rink.mode="full"');assert.equal(r('studioShouldShow(e)'),true);
r('state.live.rink.mode="highlights";e.flight=null;e.highlightUntil=0;e.carrier=null;e.phase="attack"');assert.equal(r('studioShouldShow(e)'),false,'an attack alone is no longer a key highlight');
r('pauseMatch();matchTab("stats")');assert.equal(r('matchDesk.tab'),'stats');assert.ok(r('matchCentreView()').includes('Alla skottförsök'));
// Continuous puck travel, boards and an icing call at the actual goal-line crossing.
r(`e.carrier=null;e.flight=null;e.puck={x:30,y:15};e.puckVelocity={x:14,y:0};e.stoppage=0;e.moveFreePuck(.1)`);
assert.ok(r('e.puck.x')>31);assert.ok(r('e.puckVelocity.x')>13);
r(`e.puck={x:59.5,y:15};e.puckVelocity={x:10,y:0};e.moveFreePuck(.1)`);assert.ok(r('e.puckVelocity.x')<0);
r(`e.stoppage=0;e.puck={x:56,y:2};e.puckVelocity={x:18,y:0};e.icingCandidate={side:0};for(const a of e.skaters(0))a.x=20;e.moveFreePuck(.1)`);
assert.equal(r('e.eventType'),'icing');assert.equal(r('e.icingHold'),0);assert.equal(r('hockeyChangeBlocked()'),true);
// Deep grades distinguish puck distribution and defensive work at identical point totals.
r(`globalThis.base={pos:'B',seconds:1200,shots:2,goals:0,assists:0,pim:0};globalThis.good=performanceGrade({...base,passes:25,passAttempts:28,battleWins:8,battleLosses:1,blocks:3,hits:2,xG:.15});globalThis.bad=performanceGrade({...base,passes:12,passAttempts:28,battleWins:1,battleLosses:8,blocks:0,hits:0,xG:.15});`);
assert.ok(r('good.score')>r('bad.score'));assert.ok(r('good.reason').includes('Puckdueller'));
assert.equal(r(`performanceView({club:managerClub(),rows:[{name:'OWN',club:managerClub(),seconds:900,stars:3,reason:'test'},{name:'OPPONENT-HIDDEN',club:'Other',seconds:900,stars:3,reason:'test'}]}).includes('OPPONENT-HIDDEN')`),false);
console.log('PASS: saved positional swaps, role-based engine penalty, persistent chemistry, nationality, season priority lock/reset, view modes and speeds, fixed panels, puck momentum/boards/icing and deeper own-team grades.');
const physics=boot(),q=physics.run;
q(`startCareerWithClub('HV71');state.calendar.date=calendarTarget();startMatch();pauseMatch();globalThis.e=studioEngine();e.stoppage=0;globalThis.a=e.skaters(0)[0];a.x=35;a.y=2;for(const b of e.skaters(0).slice(1))b.x=30;for(const b of e.skaters(1)){b.x=20;b.y=15;}e.takePossession(a);e.dump(a);e.resolveFlight(e.flight.duration);globalThis.startY=e.puck.y;for(let i=0;i<25;i++)e.moveFreePuck(.1);`);
assert.ok(q('e.puck.y')>q('startY')+10,'a dump rims behind the net toward the opposite side');
q(`e.stoppage=0;e.rimPath=null;e.puckVelocity=null;a.x=35;a.y=8;for(const b of e.skaters(0).slice(1))b.x=30;e.takePossession(a);globalThis.early=e.skaters(0)[1];early.x=43;e.dump(a);`);
assert.equal(q('e.delayedOffside'),0);
q('e.takePossession(early)');assert.equal(q('e.eventType'),'offside');
q(`e.stoppage=0;e.penalty={side:0,remaining:50};a.x=12;a.y=3;for(const b of e.skaters(0).slice(1))b.x=20;e.takePossession(a);e.random=()=>.5;e.clear(a);e.resolveFlight(e.flight.duration)`);
assert.notEqual(q('e.eventType'),'icing','a shorthanded clearance is exempt');
// A missed shot is an attempt, not a shot on target in any report.
q(`e.penalty=null;e.stoppage=0;globalThis.p=studioPlayer(0,a.player.id);globalThis.shot={player:p.name,playerId:'0:'+p.id,side:0,x:49,y:15,quality:.1,outcome:'wide',assists:[]};e.stats[0].attempts++;studioRecordShot(e,shot,null);globalThis.missed=matchStats().shots[0];e.stats[0].attempts++;e.stats[0].shots++;studioRecordShot(e,{...shot,outcome:'save'},null);`);
assert.equal(q('matchStats().shots[0]'),q('missed+1'));assert.equal(q('state.live.shotsHV'),q('matchStats().shots[0]'));assert.equal(q('state.live.analysis.players[p.id].shots'),1);
assert.ok(q('statisticsView()').includes('Skott på mål'));assert.ok(q('statisticsView()').includes('Alla skottförsök'));
console.log('PASS: dump rims to the far side, delayed offside, shorthanded icing exemption and consistent attempt/on-target reporting.');
