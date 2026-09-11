const assert=require('node:assert/strict');
const {boot}=require('./scripts/career-test-fixture.cjs');

const app=boot(),r=app.run;
r("startCareerWithClub('HV71');state.calendar.date=calendarTarget();startMatch();pauseMatch();globalThis.e=studioEngine();globalThis.s=e.skaters(0).find(a=>a.role==='LD')||e.skaters(0)[0];globalThis.tip=e.skaters(0).find(a=>a!==s&&!a.role.endsWith('D'))||e.skaters(0).find(a=>a!==s);globalThis.g=e.actors.find(a=>a.side===1&&a.role==='G');Object.assign(s,{x:48,y:15});for(const a of e.actors)if(a!==s&&a!==tip&&a!==g&&a.role!=='G')Object.assign(a,{x:a.side===0?42:38,y:a.y<15?3:27});Object.assign(tip,{x:54,y:15});globalThis.screenCtx=e.shotContext(s);globalThis.screenRebound=e.reboundModel(g,screenCtx);Object.assign(tip,{x:52,y:5});globalThis.clearCtx=e.shotContext(s);globalThis.clearRebound=e.reboundModel(g,clearCtx)");
assert.ok(r('screenCtx.traffic')>r('clearCtx.traffic'),'real body in the shooting lane must increase traffic');
assert.ok(r('screenCtx.screen')>r('clearCtx.screen'),'geometric traffic must increase the goalie screen');
assert.ok(r('screenCtx.screeners.some(x=>x.id===tip.id)'),'the actual screening player must be recorded in shot context');
assert.ok(r('screenRebound.freeze')<r('clearRebound.freeze'),'screened shots must be harder to freeze');
assert.ok(r('screenRebound.safe')<r('clearRebound.safe'),'screened shots must create less controlled rebounds');

r("Object.assign(tip,{x:54,y:15});e.puck={x:s.x,y:s.y};e.owner=0;e.carrier=s.id;e.stoppage=0;e.shoot(s);globalThis.trafficShot=e.flight?.shot");
assert.equal(r('trafficShot.context.trafficShot'),true);
assert.equal(r('e.stats[0].trafficShots'),1);

const major=boot(),m=major.run;
m("startCareerWithClub('HV71');state.calendar.date=calendarTarget();startMatch();pauseMatch();globalThis.e=studioEngine();globalThis.off=e.skaters(0)[0];globalThis.pimBefore=studioPlayer(0,off.player.id).pim||0;globalThis.major=e.giveMajorPenalty(0,off.player.name,'boarding')");
assert.equal(m('major.remaining'),300);
assert.equal(m('major.releasable'),false);
assert.equal(m('e.penaltyCount(0)'),1);
assert.equal(m('studioPlayer(0,major.playerId).pim'),m('pimBefore+5'));
const beforeMajorCount=m('e.penaltyList().length');
m('e.goalPenalty(1)');
assert.equal(m('e.penaltyList().length'),beforeMajorCount,'a power-play goal must not cancel a major penalty');

const minor=boot(),n=minor.run;
n("startCareerWithClub('HV71');state.calendar.date=calendarTarget();startMatch();pauseMatch();globalThis.e=studioEngine();globalThis.off=e.skaters(0)[0];e.givePenalty(0,off.player.name,'tripping');globalThis.before=e.penaltyList().length;e.goalPenalty(1)");
assert.equal(n('e.penaltyList().length'),n('before-1'),'a normal minor must still end on a power-play goal');

const misconduct=boot(),q=misconduct.run;
q("startCareerWithClub('HV71');state.calendar.date=calendarTarget();startMatch();pauseMatch();globalThis.e=studioEngine();globalThis.off=e.skaters(0)[0];globalThis.baseStrength=e.strength(0);globalThis.mc=e.giveMisconduct(0,off.player.name,'misconduct')");
assert.equal(q('mc.remaining'),600);
assert.equal(q('mc.affectsStrength'),false);
assert.equal(q('e.penaltyCount(0)'),0);
assert.equal(q('e.strength(0)'),q('baseStrength'),'a misconduct removes the offender but must not make the team short-handed');
assert.equal(q('studioPlayer(0,mc.playerId).pim>=10'),true);

console.log('PASS: Match Engine 3 geometric traffic, screen-sensitive rebound control, major penalties and misconduct preserve shared match accounting.');
