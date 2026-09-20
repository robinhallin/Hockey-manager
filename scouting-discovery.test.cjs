const assert=require('node:assert/strict');
const {boot}=require('./scripts/career-test-fixture.cjs');
const app=boot(),r=app.run;
r("startCareerWithClub('HV71');globalThis.staff=scoutingPerson(scoutingStaff()[0]);globalThis.cash=state.money");
assert.equal(r("scoutingSearchStart(staff,'Defensiv center','HA',18,35,2000000,4,'next')"),true);
r('globalThis.job=scoutingOffice().jobs[0]');
assert.equal(r('cash-state.money'),r('job.fee'));
assert.equal(r('job.players.length'),3);
assert.equal(r("job.players.every(id=>scoutingLeague(findPlayerAnywhere(id))==='HA'&&findPlayerAnywhere(id).pos==='C')"),true);
r("globalThis.before=JSON.stringify(scoutingSearchCandidates({...job,seen:[],players:[]}).map(p=>p.id));globalThis.hidden=getTransferMarketPlayers().filter(p=>scoutingLeague(p)==='HA').map(p=>findPlayerAnywhere(p.id)).map(p=>({p,attrs:{...p.attributes},salary:p.salary,value:p.value}));for(const {p} of hidden){for(const k in p.attributes)p.attributes[k]=20;p.salary=99999999;p.value=99999999;}");
assert.equal(r('JSON.stringify(scoutingSearchCandidates({...job,seen:[],players:[]}).map(p=>p.id))'),r('before'));
r('for(const x of hidden){x.p.attributes=x.attrs;x.p.salary=x.salary;x.p.value=x.value;}globalThis.paid=state.money');
r("scoutingSearchStart(staff,'Defensiv center','HA',18,35,2000000,4,'next')");assert.equal(r('state.money'),r('paid'),'occupied scout cannot incur a second charge');
// Actual background simulation feeds the same statistics commit used in a normal career.
r(`globalThis.date=calAdd(job.start,3);globalThis.targets=[...job.players];
for(const id of targets){const club=getPlayerClub(id);const g=state.schedule.find(g=>!g.played&&g.round===1&&(g.home===club||g.away===club));if(g){g.date=date;leagueBackground(g);}}
globalThis.recorded=targets.filter(id=>scoutingOffice().matchEvidence?.[String(id)]?.length);`);
assert.ok(r('recorded.length')>0,'played target has real match evidence');
r('globalThis.pid=recorded[0];globalThis.p=findPlayerAnywhere(pid);globalThis.e=scoutingOffice().matchEvidence[String(pid)][0];globalThis.captured=e.snapshot.faceoffs;p.attributes.faceoffs=1;state.calendar.date=job.next;scoutDay()');
assert.equal(r('state.scoutReports[String(pid)].snapshot.faceoffs'),r('captured'),'delivery reads the match snapshot, not today’s private attribute');
assert.equal(r('state.scoutReports[String(pid)].matchHistory[0].snapshot'),undefined,'public evidence contains no raw attribute snapshot');
assert.ok(r('job.discoveries.length')>0);assert.equal(r('job.steps'),1);
r('scoutDay()');assert.equal(r('job.steps'),1);
assert.match(r('scoutingMatchEvidenceView(p)'),/Observerade matcher/);
assert.doesNotMatch(r('scoutingAssignments()+scoutingMatchEvidenceView(p)'),/undefined|NaN/);
r('save()');const saved=boot(app.storage.value),s=saved.run;
assert.equal(s('scoutingOffice().jobs[0].steps'),1);
assert.ok(s('scoutingOffice().jobs[0].discoveries.length')>0);
s('globalThis.j=scoutingOffice().jobs[0];globalThis.cash=state.money;scoutingCancel(j.id)');
assert.equal(s('state.money-cash'),s('Math.round(j.fee*3/4*.7)'));
s('globalThis.once=state.money;scoutingCancel(j.id)');assert.equal(s('state.money'),s('once'));
// New detailed assignments cannot invent matches from an elapsed timer.
s("globalThis.p=getTransferMarketPlayers().find(p=>scoutingLeague(p)==='SHL'&&!scoutPending(p.id));scoutingDraft([p.id]);scoutingStart();globalThis.j=scoutingOffice().jobs[0];state.calendar.date=j.next;scoutDay()");
assert.equal(s('j.steps'),0);assert.match(s('j.note'),/Inväntar/);
// Fact-based day summary and direct report action, without a second day advance.
r("globalThis.beforeDay=managerDaySnapshot();calendarStep(true);managerMessage('sc-contact:test','Kontaktbesked test','Faktiskt besked','Sportchefen');feedbackNews('test-world','HV71','transfer','Registrerad affär','Avtal undertecknat.');managerDayComplete(beforeDay)");
assert.match(r('managerDailyBriefView()'),/Kontaktbesked test/);assert.match(r('managerDailyBriefView()'),/Registrerad affär/);
r('globalThis.day=state.calendar.date;globalThis.stateBefore=JSON.stringify(state);managerDailyBriefView();managerOffice2Items()');assert.equal(r('JSON.stringify(state)'),r('stateBefore'));
assert.ok(r('recruitmentDecisionItems().some(i=>i.id==="sc-report:"+pid)'));
r('scoutingOpenDecision(pid)');assert.equal(r('recruitmentDecisionItems().some(i=>i.id==="sc-report:"+pid)'),false);assert.equal(r('state.calendar.date'),r('day'));
console.log('PASS: public discovery, staff capacity, real simulated fixture evidence, frozen delivery, no fabricated observations, refunds, persistence and decision feed.');

const clickApp=boot(),c=clickApp.run;c("startCareerWithClub('HV71');globalThis.dateBefore=state.calendar.date;globalThis.timers=[];setTimeout=fn=>{timers.push(fn);return timers.length;};managerContinueWithBriefing();managerContinueWithBriefing()");
assert.equal(c('managerContinueBusy'),true);assert.equal(c('timers.length'),1);c('timers.shift()()');assert.equal(c('calGap(dateBefore,state.calendar.date)'),1);assert.equal(c('managerContinueBusy'),false);assert.match(clickApp.get('#manager-progress-root').innerHTML,/Dagen är genomförd/);c('managerCloseBrief()');assert.equal(clickApp.get('#manager-progress-root').innerHTML,'');
console.log('PASS: double-click executes exactly one calendar step and the completion briefing closes without advancing time.');
