'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
global.StudioHockey=require('./match-simulation');
vm.runInThisContext(fs.readFileSync('match-rules-3.js','utf8'));vm.runInThisContext(fs.readFileSync('match-engine-3.js','utf8'));vm.runInThisContext(fs.readFileSync('match-engine-4.js','utf8'));
const rosters=require('./match-lab-rosters'),m=new StudioHockey.Match(rosters,{seed:4504}),carrier=m.skaters(0)[0];m.owner=0;m.carrier=carrier.id;carrier.x=34;carrier.y=9;carrier.vx=3;m.puck={x:34,y:9};m.phase='counter';
const attackers=m.skaters(0).filter(a=>a.id!==carrier.id);attackers.forEach((a,i)=>{a.x=31+i*2;a.y=7+i*4;});m.skaters(1).forEach((a,i)=>{a.x=39+i;a.y=5+i*5;});
m.defenseTargets(1);const forwards=m.skaters(1).filter(a=>!a.role.endsWith('D')),backs=m.skaters(1).filter(a=>a.role.endsWith('D'));
assert.ok(forwards.every(a=>a.duty.includes('Backcheckar')),'all forwards transition from forecheck to backcheck');
assert.ok(forwards.some(a=>a.duty.includes('första sena hotet')),'one forward owns the most dangerous late threat');
assert.ok(!forwards.some(a=>/^F[123]/.test(a.duty)),'forecheck labels disappear once the rush advances');
assert.ok(backs.every(a=>a.duty.includes('gap')),'defencemen retain gap responsibilities during the same transition');
console.log('PASS: forwards backcheck through the middle while defencemen retain gap');
// Test geometry, not just role labels: back targets stay between puck and own
// goal, with the same gap in either direction throughout the neutral-zone rush.
for(const attackingSide of [0,1])for(const progress of [22,30,34,38,42]){
  const game=new StudioHockey.Match(rosters,{seed:4504}),puckCarrier=game.skaters(attackingSide)[0];
  game.owner=attackingSide;game.carrier=puckCarrier.id;
  puckCarrier.x=StudioHockey.progress(attackingSide,progress);puckCarrier.y=9;
  puckCarrier.vx=attackingSide===0?3:-3;
  game.puck={x:puckCarrier.x,y:puckCarrier.y};
  game.defenseTargets(1-attackingSide);
  for(const back of game.skaters(1-attackingSide).filter(a=>a.role.endsWith('D'))){
    const goalSideGap=StudioHockey.progress(attackingSide,back.target.x)-progress;
    assert.ok(goalSideGap>=2.1&&goalSideGap<=5.5,`side ${attackingSide}, progress ${progress}: gap ${goalSideGap} must protect own goal`);
  }
}
// Established-zone defence must retain individual coverage near the threat.
for(const attackingSide of [0,1]){
  const game=new StudioHockey.Match(rosters,{seed:4504}),puckCarrier=game.skaters(attackingSide)[0];
  game.owner=attackingSide;game.carrier=puckCarrier.id;
  for(const a of game.skaters(attackingSide))a.x=StudioHockey.progress(attackingSide,50);
  game.puck={x:puckCarrier.x,y:puckCarrier.y};game.defenseTargets(1-attackingSide);
  assert.ok(game.skaters(1-attackingSide).every(a=>StudioHockey.progress(attackingSide,a.target.x)>=50),'defenders retain goal-side marking in their own zone');
}
console.log('PASS: measured defensive gaps in both directions and established-zone coverage.');
