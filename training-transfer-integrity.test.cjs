'use strict';
const assert=require('node:assert/strict');
const {boot}=require('./scripts/career-test-fixture.cjs');
const a=boot(),r=a.run;
r("startCareerWithClub('HV71');globalThis.p=state.playerWorld.freeAgents.find(p=>p.name==='Oula Palve');globalThis.w=recruitPlayerWishes(p);p.trainingLoad='rest';p.trainingReturn={club:'AIK',load:'rest',date:calAdd(state.calendar.date,7)};p.fatigue=38;globalThis.attributesBefore=JSON.stringify(p.attributes);submitRecruitOffer(p.id,0,w.salary,2,w.role);globalThis.d=state.recruitment.deals[0];state.calendar.date=d.dueDate;resolveRecruitDeal(d)");
assert.equal(r('d.status'),'signed');assert.equal(r('getPlayerClub(p.id)'),'HV71');
assert.equal(r('p.trainingLoad'),'normal');assert.equal(r('p.trainingReturn'),undefined);
assert.equal(r('p.fatigue'),38);assert.equal(r('JSON.stringify(p.attributes)'),r('attributesBefore'));
r('globalThis.moneyAfter=state.money;globalThis.historyAfter=state.recruitment.history.length;resolveRecruitDeal(d);save()');
assert.equal(r('state.money'),r('moneyAfter'));assert.equal(r('state.recruitment.history.length'),r('historyAfter'));
assert.equal(r('d.status'),'signed','repeated resolution cannot rewrite a completed deal as rejected');
// Old saved plans from another club must not strand a returning player on rest.
r("p.trainingLoad='rest';p.trainingReturn={club:'AIK',load:'rest',date:calAdd(state.calendar.date,7)};p.health.injury={name:'Kontusionsskada',remaining:3,readiness:55,initial:3,source:'träning'};save()");
const b=boot(a.storage.value),q=b.run;
q('resumeCareer();trainingReturnDay()');
assert.equal(q('findPlayerAnywhere('+JSON.stringify(r('p.id'))+').trainingLoad'),'normal');
assert.equal(q('findPlayerAnywhere('+JSON.stringify(r('p.id'))+').health.injury.remaining'),3,'changing employer instructions never clears rehab');
// Loan return clears the borrower's load instruction while preserving identity and injury.
r("globalThis.l=state.loans.active.find(l=>l.borrower===managerClub());globalThis.borrowed=findPlayerAnywhere(l.playerId);depthSelection();state.specialTeams.pp1[0]=borrowed.id;state.matchSelection.extras=[borrowed.id];borrowed.trainingLoad='rest';borrowed.trainingReturn={club:managerClub(),load:'rest',date:calAdd(state.calendar.date,7)};borrowed.health.injury={name:'Ledbesvär',remaining:4};globalThis.id=borrowed.id;loanReturn(l,'Test av återgång')");
assert.equal(r('borrowed.trainingLoad'),'normal');assert.equal(r('borrowed.trainingReturn'),undefined);
assert.equal(r('borrowed.health.injury.remaining'),4);
assert.equal(r('[...Object.values(state.clubRosters).flat(),...state.loans.external,...state.northAmerica.abroad].filter(p=>p.id===id).length'),1);
assert.equal(r('[...state.lines.forwards,...state.lines.defense,...Object.values(state.specialTeams).filter(Array.isArray).flat(),...state.matchSelection.extras].includes(id)'),false);
console.log('PASS: real transfer, once-only registration, stale-plan migration, loan return, lineup repair and preserved player development/rehab.');
