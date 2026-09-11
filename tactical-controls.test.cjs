'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
global.StudioHockey=require('./match-simulation');
vm.runInThisContext(fs.readFileSync('match-rules-3.js','utf8'),{filename:'match-rules-3.js'});
vm.runInThisContext(fs.readFileSync('match-engine-3.js','utf8'),{filename:'match-engine-3.js'});
vm.runInThisContext(fs.readFileSync('match-control-integration.js','utf8'),{filename:'match-control-integration.js'});
const rosters=require('./match-lab-rosters');
const {Match}=StudioHockey;
assert.equal(Match.prototype.matchEngine31Installed,true);
assert.equal(Match.prototype.managerControlsInstalled,true);

function attack(shotChoice){
  const m=new Match(rosters,{seed:7717}),a=m.skaters(0).find(x=>x.role!=='G');
  m.owner=0;m.carrier=a.id;a.x=47;a.y=15;m.puck={x:a.x,y:a.y};a.controlledAt=m.time-2;
  m.teams[0].tactics.mentality='control';m.teams[0].tactics.shotChoice=shotChoice;
  return m.actionOptions(a);
}
const patient=attack('patient').find(x=>x.kind==='shoot'),shoot=attack('shoot').find(x=>x.kind==='shoot');
assert.ok(patient&&shoot);
assert.ok(shoot.value>patient.value+.12,'shot choice must remain independent of controlled style');

function pk(safeCounter){
  const m=new Match(rosters,{seed:9911}),a=m.skaters(0).find(x=>x.role!=='G');
  m.owner=0;m.carrier=a.id;a.x=36;a.y=15;m.puck={x:a.x,y:a.y};a.controlledAt=m.time-2;
  m.penalty={side:0,remaining:80};m.teams[0].safeCounter=safeCounter;
  return m.actionOptions(a);
}
const selective=pk(false),safe=pk(true),clear=safe.find(x=>x.kind==='clear');
assert.ok(!selective.find(x=>x.kind==='clear'));
assert.ok(clear&&clear.value>.7,'safe PK must create a strong clearing option');
assert.ok(safe.find(x=>x.kind==='carry').value<selective.find(x=>x.kind==='carry').value);

const integration=fs.readFileSync('match-control-integration.js','utf8'),css=fs.readFileSync('match-control-integration.css','utf8'),html=fs.readFileSync('index.html','utf8');
assert.match(integration,/officeOpenDay/);assert.match(integration,/Öppna dagens pass/);
assert.match(css,/mc-live \.mc-messages>\.mc-choice small\{display:none\}/);
assert.ok(html.indexOf('match-control-integration.js')>html.indexOf('match-engine-3.js'));
console.log('PASS: scan findings are wired into the current match engine and desktop UI');
