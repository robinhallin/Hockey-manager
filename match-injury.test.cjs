const assert=require('node:assert/strict');
const {boot,bootLegacy}=require('./scripts/career-test-fixture.cjs');
for(const make of [boot,bootLegacy]){
 const a=make(),r=a.run;
 r(`startCareerWithClub('HV71');state.calendar.date=calendarTarget();medicalRoll=()=>.999;startMatch();globalThis.hurt=playerById(state.lines.defense[0]);globalThis.reserve=managerRoster().find(p=>p.pos==='B'&&medicalAvailable(p)&&!state.lines.defense.some(id=>samePlayerId(id,p.id)));globalThis.specialBefore=[...state.specialTeams.pp1];state.specialTeams.pp1[0]=hurt.id;injurePlayer(hurt,'match',5);liveStep();render();`);
 assert.equal(r('state.live.running'),false);
 assert.ok(a.get('#medical-decision-root').innerHTML.includes('är skadad'));
 assert.ok(a.get('#medical-decision-root').innerHTML.includes('Sätt in vald spelare'));
 assert.equal(r('medicalPending().slots[0].index'),0);
 const clock=r('JSON.stringify([state.live.minute,state.live.second])');
 r('startMatch();liveStep()');assert.equal(r('JSON.stringify([state.live.minute,state.live.second])'),clock);
 assert.equal(r('state.live.running'),false);
 r(`medicalDecisionEdit('tactics')`);assert.equal(r('state.page'),'lines');assert.equal(r('lineupWorkspace'),'even');assert.ok(a.get('#medical-decision-root').innerHTML.includes('Tillbaka till skaderutan'));
 r('save()');const b=make(a.storage.value);assert.equal(b.run('Boolean(medicalPending())'),true);b.run('resumeCareer();startMatch()');assert.equal(b.run('state.live.running'),false);assert.ok(b.get('#medical-decision-root').innerHTML.includes('är skadad'));
 // Reject an undressed/unknown player without consuming the decision.
 r(`medicalDecisionAccept('not-in-match')`);assert.equal(r('Boolean(medicalPending())'),true);
 r('medicalDecisionAccept(reserve.id)');assert.equal(r('state.lines.defense[0]===reserve.id'),true);assert.equal(r('state.specialTeams.pp1.includes(reserve.id)'),true);assert.equal(r('new Set(state.lines.defense.filter(Boolean)).size===state.lines.defense.filter(Boolean).length'),true);
 assert.equal(r('medicalPending()'),undefined);assert.equal(r('state.live.running'),false);
 r('startMatch();liveStep()');assert.equal(r('state.live.running'),true);
 // Multiple incidents require separate decisions, including the goalkeeper.
 r(`globalThis.keeper=playerById(state.lines.goalie);injurePlayer(keeper,'match',3);injurePlayer(playerById(state.lines.forwards[0]),'match',3);liveStep();render()`);
 assert.equal(r('state.live.medicalDecisions.length'),2);assert.equal(r('medicalPending().pos'),'MV');
 r('medicalDecisionAccept(medicalDecisionCandidates(medicalPending())[0].id);startMatch()');assert.equal(r('state.live.medicalDecisions.length'),1);assert.equal(r('state.live.running'),false);
 r('medicalDecisionAccept();startMatch()');assert.equal(r('state.live.running'),true);assert.equal(r('medicalAvailable(playerById(state.lines.goalie))'),true);
 // Reaching a comeback limit uses the same visible decision flow.
 r(`pauseMatch();globalThis.limited=managerRoster().find(p=>!["B","MV"].includes(p.pos)&&medicalAvailable(p));limited.health.injury={name:'Muskelbesvär',remaining:0,readiness:70};limited.health.clearance='limited';state.live.iceTime??={};state.live.iceTime[limited.id]=600;medicalExposure([limited],1);render()`);
 assert.equal(r('medicalPending().reason'),'limit');assert.ok(a.get('#medical-decision-root').innerHTML.includes('måste vila'));
 r('medicalDecisionAccept();state.live.finished=true;render()');assert.equal(a.get('#medical-decision-root').innerHTML,'');
}
console.log('PASS: broadcast and legacy injury decisions, frozen clock, saved pending decision, bench/special units, invalid selection, goalkeeper, multiple injuries and comeback limits.');
// Exercise injuries raised inside broadcast ice-time accounting, not just a
// manually inserted incident between simulation steps.
const live=boot();
live.run(`startCareerWithClub('HV71');state.calendar.date=calendarTarget();startMatch();medicalRoll=()=>0;for(let i=0;i<100&&state.live.running;i++)studioStep();render()`);
assert.equal(live.run('state.live.running'),false);
assert.ok(live.run('state.live.medicalDecisions.length')>0);
assert.equal(live.run('studioEngine().actors.filter(a=>a.side===0).every(a=>medicalAvailable(studioPlayer(0,a.player.id)))'),true);
assert.ok(live.get('#medical-decision-root').innerHTML.includes('är skadad'));
console.log('PASS: injury during broadcast accounting pauses safely and removes unavailable actors.');
