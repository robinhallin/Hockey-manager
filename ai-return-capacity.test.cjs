const assert=require('node:assert/strict');const {boot}=require('./scripts/career-test-fixture.cjs');const a=boot(),r=a.run;
r("startCareerWithClub('HV71');globalThis.c='Skellefteå AIK';globalThis.ps=state.clubRosters[c];globalThis.before=aiRosterWithReturns(c).length;globalThis.p=ps.find(p=>p.pos!=='MV');state.clubRosters[c]=ps.filter(q=>q!==p);state.clubRosters['HV71'].push(p);p.club='HV71';state.loans.active.push({id:9999,playerId:p.id,owner:c,borrower:'HV71'});");
assert.equal(r('aiRosterWithReturns(c).length'),r('before'));
r("globalThis.filler=Array.from({length:30-before},(_,i)=>({...p,id:'capacity-'+i}));state.clubRosters[c].push(...filler);globalThis.candidate={...p,id:'capacity-new'};");
assert.equal(r('aiRosterHasRoom(state.clubRosters[c].concat(candidate))'),true);
assert.equal(r('aiRosterHasRoom(aiRosterWithReturns(c,[candidate]))'),false,'returning owned players reserve a roster place');
console.log('PASS: owned loan returns reserve capacity before a replacement is signed or promoted.');
