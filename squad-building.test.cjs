const test=require('node:test'),assert=require('node:assert/strict');
const {boot}=require('./scripts/career-test-fixture.cjs');
const career=()=>{const app=boot();app.run("startCareerWithClub('HV71')");return app;};
test('future roster separates owned returns, borrowed players, departures and arrivals without changing cash',()=>{
 const {run:r}=career();r(`globalThis.cash=state.money;globalThis.ps=managerRoster().filter(p=>!playerLoan(p));globalThis.stay=ps[0];stay.contractYears=3;globalThis.leaver=ps[1];leaver.contractYears=3;leaver.futureContract={buyer:'Luleå Hockey',salary:900000,role:'Ordinarie'};globalThis.exp=ps[2];exp.contractYears=1;globalThis.arr=state.clubRosters['Luleå Hockey'].find(p=>!playerLoan(p));arr.futureContract={buyer:'HV71',salary:750000,role:'Ordinarie'};globalThis.ret=ps[3];ret.contractYears=3;state.clubRosters.HV71=state.clubRosters.HV71.filter(p=>p!==ret);state.clubRosters['Luleå Hockey'].push(ret);ret.club='Luleå Hockey';ret.loanId=9999;state.loans.active.push({id:9999,owner:'HV71',borrower:'Luleå Hockey',playerId:ret.id});syncManagerRoster();globalThis.rows=squadNextSeason().rows`);
 assert.equal(r('rows.find(r=>r.p.id===stay.id).secured'),true);
 assert.equal(r('rows.find(r=>r.p.id===leaver.id).secured'),false);
 assert.equal(r('rows.find(r=>r.p.id===exp.id).secured'),false);
 assert.equal(r('rows.find(r=>r.p.id===arr.id).salary'),750000);
 assert.equal(r('rows.filter(r=>r.p.id===ret.id&&r.secured).length'),1);
 assert.equal(r('state.money'),r('cash'));
 assert.match(r('squadNextSeasonView()'),/Scouta ersättare/);
});
test('replacement brief carries need, budget and position into saved scouting job',()=>{
 const app=career(),r=app.run;r(`globalThis.p=managerRoster().find(p=>p.pos==='C'&&!playerLoan(p));p.contractYears=1;globalThis.cash=state.money;scoutingReplace(p.id);globalThis.c=scoutDesk.draft.criteria;globalThis.scout=scoutDesk.draft.person`);
 assert.equal(r('c.position'),'C');assert.equal(r('c.horizon'),'next');assert.ok(r('c.maxSalary<=calendarFutureRoom()'));
 assert.equal(r('state.money'),r('cash'));
 // Make a real free-agent candidate observable enough to reach the replacement threshold.
 r(`globalThis.target=state.playerWorld.freeAgents.find(p=>p.pos==='C');target.attributes=Object.fromEntries(Object.keys(ensurePlayerAttributes(target)).map(k=>[k,19]));state.scoutReports[String(target.id)]=scoutRemember(target);scoutingBrief(c.profile,c.placement,c.maxSalary,45,'next',scout,'ALL',c.targetRole,'possible',p.id)`);
 assert.ok(r('scoutDesk.draft.players.length>0'));
 assert.ok(r('scoutDesk.draft.players.every(id=>findPlayerAnywhere(id).pos===c.position)'));
 assert.equal(r('scoutingStart()'),true);r('save()');
 const loaded=boot(app.storage.value);assert.equal(loaded.run('scoutingOffice().jobs[0].criteria.replacementId'),r('p.id'));
 assert.match(r('scoutingBriefCriteriaText(scoutingOffice().jobs[0].criteria)'),/Ersättare till/);
});
test('loan destination comparison includes injured competition and excludes the player himself',()=>{
 const {run:r}=career();r(`globalThis.p=managerRoster().find(p=>p.pos==='MV');globalThis.club='Luleå Hockey';globalThis.peers=state.clubRosters[club].filter(p=>p.pos==='MV');for(const q of peers){q.attributes=Object.fromEntries(Object.keys(ensurePlayerAttributes(q)).map(k=>[k,20]));injurePlayer(q,'träning',10);}p.attributes=Object.fromEntries(Object.keys(ensurePlayerAttributes(p)).map(k=>[k,1]));globalThis.a=loanDestinationAssessment(p,club)`);
 assert.equal(r('a.rank'),1);assert.ok(r('a.fullRank>a.rank'));
 assert.match(r('a.text'),/återkommer/);
 assert.doesNotMatch(r('loanDestinationView(p,[club])'),/NaN|undefined/);
});
test('monthly loan review persists once, measures evidence and does not award extra growth',()=>{
 const app=career(),r=app.run;r(`globalThis.p=state.clubRosters['Luleå Hockey'][4];globalThis.l={id:9999,playerId:p.id,name:p.name,owner:'HV71',borrower:'Luleå Hockey',start:state.calendar.date,until:calAdd(state.calendar.date,56),games:3,seconds:1800,role:'regular',share:.5,appearances:[],developmentBaseline:{date:state.calendar.date,rating:matchAttributeRating(p)}};state.loans.active.push(l);p.loanId=l.id;globalThis.before=JSON.stringify(p.attributes);state.calendar.date=calAdd(state.calendar.date,28);loanDevelopmentDay();globalThis.first=JSON.stringify(l.developmentReview);loanDevelopmentDay()`);
 assert.equal(r('JSON.stringify(l.developmentReview)'),r('first'));
 assert.equal(r('JSON.stringify(p.attributes)'),r('before'));
 assert.match(r('l.developmentReview.text'),/10 minuter/);r('save()');
 const loaded=boot(app.storage.value);assert.equal(loaded.run('state.loans.active.find(l=>l.id===9999).developmentReview.month'),1);
});
test('AI price ceiling is tied to need and funding and generated terms satisfy personal demands',()=>{
 const {run:r}=career();r(`globalThis.club='Luleå Hockey';globalThis.p=state.playerWorld.freeAgents.find(p=>p.pos==='C');globalThis.need={role:'center',reason:'Behöver en center',missing:1,qualityGap:0};globalThis.t=aiOfferTerms(club,p,need);globalThis.plan=aiPurchasePlan(club,p,need,t)`);
 assert.equal(r('recruitPackageDecision(p,club,t).accepted'),true);
 assert.equal(r('plan.maxFee'),0);assert.match(r('plan.text'),/aktuell bemanning/);
 r(`globalThis.q=managerRoster().find(p=>p.pos==='C');globalThis.offer={salary:500000,years:2,role:'Ordinarie'};state.recruitment.ai[club].cash=100000;globalThis.limit=aiPurchasePlan(club,q,need,offer).maxFee`);
 assert.ok(r('limit>=0&&limit<=100000'));
});
