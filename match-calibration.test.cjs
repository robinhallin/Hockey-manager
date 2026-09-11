'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
global.StudioHockey=require('./match-simulation');
vm.runInThisContext(fs.readFileSync('match-rules-3.js','utf8'),{filename:'match-rules-3.js'});
vm.runInThisContext(fs.readFileSync('match-engine-3.js','utf8'),{filename:'match-engine-3.js'});
const rosters=require('./match-lab-rosters');
const {Match}=StudioHockey;

// Stable descriptive tuning sample. It protects the intended game envelope, not real SHL claims.
const periods=24,totals={goals:0,shots:0,attempts:0};
for(let i=1;i<=periods;i++){
  const m=new Match(rosters,{seed:i*1107});let steps=0;
  while(!m.finished&&steps++<24000)m.step();
  assert.equal(m.finished,true,'period '+i+' must finish');
  totals.goals+=m.score[0]+m.score[1];
  for(const s of m.stats){totals.shots+=s.shots;totals.attempts+=s.attempts;}
  assert.equal(m.shots.filter(s=>s.outcome==='goal').length,m.score[0]+m.score[1]);
}
const divisor=periods*2/3; // per team per 60 minutes
const per60={goals:totals.goals/divisor,shots:totals.shots/divisor,attempts:totals.attempts/divisor};
const savePct=1-totals.goals/totals.shots;
assert.ok(per60.shots>=24&&per60.shots<=34,`shot volume ${per60.shots.toFixed(2)} outside tuning envelope`);
assert.ok(per60.attempts>=40&&per60.attempts<=60,`attempt volume ${per60.attempts.toFixed(2)} outside tuning envelope`);
assert.ok(per60.goals>=1.8&&per60.goals<=3.8,`scoring ${per60.goals.toFixed(2)} outside tuning envelope`);
assert.ok(savePct>=.88&&savePct<=.94,`save percentage ${(savePct*100).toFixed(2)} outside tuning envelope`);

// Compression narrows compounding without flattening the ordering of player ability.
const low=matchCalibrationAttribute(6),mid=matchCalibrationAttribute(10),high=matchCalibrationAttribute(18);
assert.ok(low<mid&&mid<high);assert.ok(high-mid<8&&mid-low<4.1);
console.log('PASS: calibrated Match Engine 3 envelope',JSON.stringify({per60,savePct:+(savePct*100).toFixed(2)}));