const assert=require('node:assert/strict');
const {boot}=require('./scripts/career-test-fixture.cjs');

const app=boot(),r=app.run;
r("startCareerWithClub('HV71');state.calendar.date=calendarTarget();startMatch();pauseMatch();globalThis.e=studioEngine();globalThis.g=e.actors.find(a=>a.side===1&&a.role==='G');globalThis.s=e.skaters(0).find(a=>a.role==='LD')||e.skaters(0)[0];globalThis.f=e.skaters(0).find(a=>!a.role.endsWith('D'))||e.skaters(0)[0]");
assert.equal(r("typeof matchEngine31RoleProfile"),'function');
assert.equal(r("typeof matchEngine31ReboundClaim"),'function');

r("g.engine31LastRead={x:45,y:5,time:e.time-.4};globalThis.t1=e.goalieTarget(1,{x:48,y:25});g.engine31LastRead={x:45,y:25,time:e.time-.4};globalThis.t2=e.goalieTarget(1,{x:48,y:25})");
assert.ok(Math.abs(r('t1.y-t2.y'))>.02,'goalie target must retain lateral tracking lag after a cross-ice change');

r("Object.assign(s,{x:47,y:15});Object.assign(f,{x:54,y:15});e.rebound={side:0,time:e.time,spot:{x:54,y:15}};globalThis.ac=matchEngine31ReboundClaim(e,0,e.rebound.spot);globalThis.dc=matchEngine31ReboundClaim(e,1,e.rebound.spot);e.targets()");
assert.ok(r('ac&&ac.a'),'attacking rebound claimant must exist');
assert.ok(r('dc&&dc.a'),'defensive rebound claimant must exist');
assert.ok(r("ac.a.duty.includes('retur')||ac.a.duty.includes('Kraschar')"),'attacker must actively hunt the rebound');
assert.ok(r("dc.a.duty.includes('Boxar')"),'defender must box out at the rebound spot');

r("globalThis.sp=studioPlayer(0,s.player.id);globalThis.orig={...sp.attributes};globalThis.actorOrig={...s.player.attributes};sp.attributes={...sp.attributes,shooting:20,passing:20,strength:10,checking:9,positioning:16,puckControl:14};s.player.attributes={...s.player.attributes,shooting:20,passing:20,strength:10,checking:9,positioning:16,puckControl:14};globalThis.rp1=matchEngine31RoleProfile(e,s);sp.attributes={...sp.attributes,shooting:8,passing:10,strength:15,checking:17,positioning:16,puckControl:10};s.player.attributes={...s.player.attributes,shooting:8,passing:10,strength:15,checking:17,positioning:16,puckControl:10};globalThis.rp2=matchEngine31RoleProfile(e,s);sp.attributes=orig;s.player.attributes=actorOrig");
assert.equal(r('rp1'),'offensive-defense');
assert.equal(r('rp2'),'defensive-defense');

r("globalThis.a=e.skaters(0).find(x=>!x.role.endsWith('D'));globalThis.ap=studioPlayer(0,a.player.id);globalThis.saved={...ap.attributes};globalThis.actorSaved={...a.player.attributes};ap.attributes={...ap.attributes,shooting:20,passing:8,strength:9,checking:8,positioning:14,puckControl:14};a.player.attributes={...a.player.attributes,shooting:20,passing:8,strength:9,checking:8,positioning:14,puckControl:14};Object.assign(a,{x:51,y:15});e.owner=0;e.carrier=a.id;e.puck={x:a.x,y:a.y};globalThis.sniper=matchEngine31RoleProfile(e,a);globalThis.sniperRows=e.actionOptions(a);ap.attributes={...ap.attributes,shooting:9,passing:20,puckControl:20,strength:9,checking:8,positioning:14};a.player.attributes={...a.player.attributes,shooting:9,passing:20,puckControl:20,strength:9,checking:8,positioning:14};globalThis.playmaker=matchEngine31RoleProfile(e,a);globalThis.playRows=e.actionOptions(a);ap.attributes=saved;a.player.attributes=actorSaved");
assert.equal(r('sniper'),'sniper');
assert.equal(r('playmaker'),'playmaker');
assert.ok(r("Math.max(...sniperRows.filter(x=>x.kind==='shoot').map(x=>x.value),-9)>Math.max(...playRows.filter(x=>x.kind==='shoot').map(x=>x.value),-9)"),'sniper must value the same shot more than a playmaker');
assert.ok(r("Math.max(...playRows.filter(x=>x.kind==='pass').map(x=>x.value),-9)>Math.max(...sniperRows.filter(x=>x.kind==='pass').map(x=>x.value),-9)"),'playmaker must value passing more than a sniper');

console.log('PASS: Match Engine 3.1 goalie recovery, rebound pursuit and role-aware decision values.');
