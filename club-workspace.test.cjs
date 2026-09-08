const assert=require('node:assert/strict');const {boot}=require('./scripts/career-test-fixture.cjs');const {run:r}=boot();
r("startCareerWithClub('HV71');clubFinanceView();clubStaffView();boardView();managerView()");const before=r('JSON.stringify(state)');r('clubFinanceView();clubStaffView();boardView();managerView()');assert.equal(r('JSON.stringify(state)'),before);
r("clubWorkspaceSet('finance','ledger')");assert.match(r('clubFinanceView()'),/Senaste transaktionerna/);assert.doesNotMatch(r('clubFinanceView()'),/Välj klubbens satsning/);
r("clubWorkspaceSet('finance','policy')");assert.match(r('clubFinanceView()'),/Välj klubbens satsning/);
r("clubWorkspaceSet('staff','candidates');clubWorkspaceSet('role','scout');globalThis.c=state.clubOffice.market.find(c=>c.id==='scout'&&!state.clubOffice.taken.includes(c.personId));clubOpenOffer(c.personId)");assert.equal(r('state.clubOffice.offer.personId'),r('c.personId'));assert.equal(r('state.money'),JSON.parse(before).money);assert.match(r('clubStaffView()'),/Granska personalavtal/);
r("clubWorkspaceSet('manager','history')");assert.match(r('managerView()'),/Styrelsens besked/);assert.doesNotMatch(r('managerView()'),/Spara profil/);
r("clubWorkspaceSet('manager','jobs')");assert.match(r('managerView()'),/Lediga tränarjobb/);
console.log('PASS: read-only club views, separate policies/ledger, exact staff offer without payment and manager tabs.');
