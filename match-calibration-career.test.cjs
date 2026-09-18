'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const {boot}=require('./scripts/career-test-fixture.cjs');
const app=boot(),r=app.run;
r("startCareerWithClub('HV71');state.calendar.date=calendarTarget();startMatch();pauseMatch();globalThis.e=studioEngine();globalThis.a=e.skaters(0)[0];globalThis.raw=JSON.stringify(a.player.attributes);globalThis.rng=e.rng");
// Stub only the readiness calculation to prove the real career override passes
// through the shared curve exactly once, independent of chemistry and morale.
r('globalThis.originalReadiness=readinessAttribute;readinessAttribute=()=>17.4');
assert.equal(r("e.attribute(a,'passing')"),r('matchCalibrationAttribute(17.4)'));
assert.equal(r('JSON.stringify(a.player.attributes)'),r('raw'));
assert.equal(r('e.rng'),r('rng'));
r('globalThis.installedAttribute=CareerBroadcastMatch.prototype.attribute');
r(fs.readFileSync('match-rules-3.js','utf8'));
assert.equal(r('CareerBroadcastMatch.prototype.attribute===installedAttribute'),true,'reloading rules must not stack calibration');
assert.equal(r("e.attribute(a,'passing')"),r('matchCalibrationAttribute(17.4)'));
r('readinessAttribute=originalReadiness;save()');
const restored=boot(app.storage.value);
assert.equal(restored.run("studioEngine().attribute(studioEngine().skaters(0)[0],'passing')"),r("e.attribute(a,'passing')"),'saved career retains effective attributes');
// Standalone and career both apply the same curve after their own readiness.
assert.equal(r("StudioHockey.Match.prototype.attribute.call(e,{player:{attributes:{passing:16},energy:80}},'passing')"),r('matchCalibrationAttribute(16*(1-20*.0035))'));
console.log('PASS: actual career calibration exactly once, reload guard, shared curve, immutable ratings/RNG and save restoration.');
