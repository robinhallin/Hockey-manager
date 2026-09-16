'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
global.StudioHockey=require('./match-simulation');
vm.runInThisContext(fs.readFileSync('match-rules-3.js','utf8'),{filename:'match-rules-3.js'});
vm.runInThisContext(fs.readFileSync('match-engine-3.js','utf8'),{filename:'match-engine-3.js'});
vm.runInThisContext(fs.readFileSync('match-engine-4.js','utf8'),{filename:'match-engine-4.js'});
const rosters=require('./match-lab-rosters');

function value(rows,kind){return Math.max(-99,...rows.filter(r=>r.kind===kind).map(r=>r.value));}
function profile(kind,attrs){
  const m=new StudioHockey.Match(rosters,{seed:4104}),a=m.skaters(0).find(p=>p.role==='C')||m.skaters(0)[0];
  a.x=kind==='shoot'?49:34;a.y=15;m.puck={x:a.x,y:a.y};m.owner=0;m.carrier=a.id;
  Object.assign(a.player.attributes,attrs);
  return value(m.actionOptions(a),kind);
}

assert.ok(profile('pass',{passing:19,vision:19,decisions:18,composure:17})>profile('pass',{passing:6,vision:6,decisions:7,composure:7}),'elite passer should value a viable pass more');
assert.ok(profile('carry',{puckControl:19,skating:18,decisions:18})>profile('carry',{puckControl:6,skating:7,decisions:7}),'strong puck carrier should value a viable carry more');
assert.ok(profile('shoot',{shooting:19,composure:18,decisions:16})>profile('shoot',{shooting:6,composure:7,decisions:9}),'finisher should value an available shot more');

const m=new StudioHockey.Match(rosters,{seed:4105}),a=m.skaters(0)[0];a.x=34;a.y=15;m.puck={x:a.x,y:a.y};m.owner=0;m.carrier=a.id;
const tagged=m.actionOptions(a).filter(r=>['pass','carry','dump','shield'].includes(r.kind));
assert.ok(tagged.length&&tagged.every(r=>r.identityReason),'decision audit options expose the relevant skill explanation');
console.log('PASS: Match Engine 4 player identity affects puck decisions');
