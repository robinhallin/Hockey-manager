'use strict';
const assert=require('node:assert/strict');
const {boot}=require('./scripts/career-test-fixture.cjs');
const app=boot(),r=app.run;
r('startCareerWithClub("HV71");globalThis.skater=managerRoster().find(p=>p.pos!=="MV");globalThis.keeper=managerRoster().find(p=>p.pos==="MV")');
// Create an actual conversation and answer it through the public action.
r('managerMessage("agenda-test","Istid tack","Kan jag få spela?","Spelarsamtal",{decisionType:"minutes",playerId:skater.id})');
assert.ok(r('managerLifeAgenda().some(x=>x.requiresDecision&&x.action?.messageId===pendingManagerDecision().id)'));
r('answerPlayerConversation(pendingManagerDecision().id,"promise");keeper.promisedRole="Nyckelspelare";rolePromiseAssign(keeper,"Nyckelspelare")');
assert.equal(r('managerLifeAgenda().filter(x=>x.tag==="Löfte").length'),2);
assert.ok(r('managerLifeAgenda().some(x=>x.tag==="Löfte"&&x.detail.includes("6 tillgängliga")&&x.detail.includes("30 minuter"))'));
r('state.training.promises[0].games=2;state.training.promises[0].qualified=0');
assert.equal(r('managerLifeAgenda().find(x=>x.action?.promisePlayer===skater.id).level'),'high');
// One source, no silent truncation and no dependence on window in node fixtures.
assert.equal(r('JSON.stringify(managerLifeAgenda())'),r('JSON.stringify(managerOffice2VisibleItems())'));
r('for(let i=0;i<7;i++)state.recruitment.incoming.push({id:900+i,name:"Bud "+i,buyer:"AIK",fee:100,status:"pending",expires:state.recruitment.tick+2})');
assert.equal(r('managerLifeAgenda().filter(x=>x.requiresDecision&&x.action?.deal).length'),7);
const before=r('JSON.stringify(state)');
for(const panel of ['today','followup','club']){
  r(`officeUI.panel=${JSON.stringify(panel)}`);
  const html=r('managerOfficeView()');
  assert.equal((html.match(/aria-label="Dagens prioriteringar"/g)||[]).length,1,'one list on every office tab');
  assert.ok(!html.includes('manager-agenda-list'),'no second legacy list');
}
assert.equal(r('JSON.stringify(state)'),before,'reading priorities does not advance or alter career');
r('managerOfficeOpenPromise(skater.id)');
assert.equal(r('state.page'),'locker');assert.equal(r('lockerUI.tab'),'promises');
r('save()');const reload=boot(app.storage.value);
assert.equal(reload.run('managerLifeAgenda().filter(x=>x.tag==="Löfte").length'),2);
r('state.training.promises[0].resolved=true;keeper.recruitmentPromise.resolved=true');
assert.equal(r('managerLifeAgenda().filter(x=>x.tag==="Löfte").length'),0);
// A departed player's stale conversation promise cannot become a current task.
r('state.training.promises.push({playerId:"departed",name:"Tidigare spelare",resolved:false})');
assert.equal(r('managerLifeAgenda().filter(x=>x.tag==="Löfte").length'),0);
console.log('PASS: production agenda, conversation/contract promises, match deadlines, reload, all required decisions and a single read-only office list.');
