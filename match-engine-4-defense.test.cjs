'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
global.StudioHockey=require('./match-simulation');
vm.runInThisContext(fs.readFileSync('match-rules-3.js','utf8'));
vm.runInThisContext(fs.readFileSync('match-engine-3.js','utf8'));
vm.runInThisContext(fs.readFileSync('match-engine-4.js','utf8'));
const rosters=require('./match-lab-rosters');
const m=new StudioHockey.Match(rosters,{seed:4404}),carrier=m.skaters(0)[0];
m.owner=0;m.carrier=carrier.id;carrier.x=22;carrier.y=7;m.puck={x:22,y:7};m.phase='breakout';
for(const a of m.skaters(1)){a.x=32+(a.role.endsWith('D')?4:0);a.y=a.role==='LW'?7:a.role==='RW'?23:15;}
m.defenseTargets(1);
const defenders=m.skaters(1),forwards=defenders.filter(a=>!a.role.endsWith('D')),backs=defenders.filter(a=>a.role.endsWith('D'));
assert.ok(forwards.some(a=>a.duty.includes('F1 styr')),'one forward owns F1 pressure');
assert.ok(forwards.some(a=>a.duty.includes('F2 stänger')),'a second forward denies the first outlet');
assert.ok(forwards.some(a=>a.duty.includes('F3 ligger')),'a third forward remains above the puck');
assert.ok(backs.every(a=>a.duty.includes('gap')),'both defencemen hold gap instead of joining F1');
const duties=forwards.map(a=>a.duty);assert.equal(new Set(duties.filter(d=>/^F[123]/.test(d))).size,3,'forecheck roles stay distinct');
console.log('PASS: Match Engine 4 uses F1/F2/F3 structure and defensive gap control');