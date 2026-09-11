const assert=require('node:assert/strict');
const {boot}=require('./scripts/career-test-fixture.cjs');

const app=boot(),r=app.run;
r("startCareerWithClub('HV71');state.calendar.date=calendarTarget();startMatch();pauseMatch();globalThis.e=studioEngine();globalThis.a=e.skaters(0).find(x=>!x.role.endsWith('D'))||e.skaters(0)[0];globalThis.g=e.actors.find(x=>x.side===1&&x.role==='G')");
assert.equal(r("typeof matchEngine32ShotZone"),'function');
assert.equal(r("typeof matchEngine32SaveType"),'function');
assert.equal(r("typeof matchEngine32DirectedRebound"),'function');
assert.equal(r("e.matchEngine32Installed"),true);

r("Object.assign(a,{x:42,y:15});globalThis.zPoint=matchEngine32ShotZone(e,a,{d:15});Object.assign(a,{x:47,y:15});globalThis.zHigh=matchEngine32ShotZone(e,a,{d:11});Object.assign(a,{x:51,y:15});globalThis.zSlot=matchEngine32ShotZone(e,a,{d:9});Object.assign(a,{x:55,y:15});globalThis.zNet=matchEngine32ShotZone(e,a,{d:4});Object.assign(a,{x:51,y:25});globalThis.zWide=matchEngine32ShotZone(e,a,{d:12})");
assert.equal(r('zPoint'),'point');
assert.equal(r('zHigh'),'high-slot');
assert.equal(r('zSlot'),'slot');
assert.equal(r('zNet'),'net-front');
assert.equal(r('zWide'),'wide');

r("globalThis.controlled=matchEngine32DirectedRebound(e,0,{x:54,y:14},.85,{traffic:.05});globalThis.chaotic=matchEngine32DirectedRebound(e,0,{x:54,y:14},.12,{traffic:.9,oneTimer:true,deflection:true})");
assert.ok(Math.abs(r('controlled.y-15'))>Math.abs(r('chaotic.y-15')),'controlled saves should steer rebounds wider than chaotic saves');
assert.ok(r('chaotic.x>=controlled.x'),'chaotic rebounds should remain at least as dangerous in attacking progress');

r("globalThis.padType=matchEngine32SaveType(e,g,{y:15},{engine32Zone:'net-front',traffic:.5,rebound:true});globalThis.gloveType=matchEngine32SaveType(e,g,{y:20},{engine32Zone:'point',traffic:.05});globalThis.bflyType=matchEngine32SaveType(e,g,{y:15},{engine32Zone:'slot',oneTimer:true,lateralSpeed:.8})");
assert.ok(['pad','body'].includes(r('padType')));
assert.equal(r('gloveType'),'glove');
assert.equal(r('bflyType'),'butterfly');

r("for(const d of e.skaters(1))Object.assign(d,{x:30,y:4});Object.assign(a,{x:54,y:15});e.puck={x:54,y:15};e.owner=null;e.carrier=null;e.battle=null;e.rebound={side:0,time:e.time,spot:{x:54,y:15},saveType:'pad'};e.takePossession(a,{});globalThis.sc=!!e.engine32LastSecondChance&&e.engine32LastSecondChance.playerId===a.id;globalThis.ctx=e.shotContext(a);globalThis.rows=e.actionOptions(a)");
assert.equal(r('sc'),true,'attacker taking the real rebound must create a second-chance state');
assert.equal(r('ctx.secondChance'),true);
assert.ok(r("rows.filter(x=>x.kind==='shoot').some(x=>x.secondChance===true)"),'second chance must flow into the real shot-decision rows');

console.log('PASS: Match Engine 3.2 save types, rebound direction, shot zones and real second chances.');
