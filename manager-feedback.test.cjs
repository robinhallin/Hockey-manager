const assert=require('node:assert/strict');
const {boot}=require('./scripts/career-test-fixture.cjs');
const a=boot(),r=a.run;r("startCareerWithClub('HV71')");
// Observing the desk neither moves time nor makes offers; explicit briefing uses estimates.
const date=r('state.calendar.date'),money=r('state.money');
r('staffReviewView();feedbackNewsView();feedbackRefresh();');
assert.equal(r('state.calendar.date'),date);assert.equal(r('state.money'),money);
assert.equal(r('state.recruitment.deals.length'),0);
assert.equal(r('state.managerFeedback.briefs.length'),1);
assert.equal(r('state.managerFeedback.briefs[0].options.every(o=>o.playerId===undefined||o.score>=12)'),true);
r("feedbackNews('test','HV71','transfer','Verklig flytt','Bekräftad');feedbackNews('test','HV71','transfer','Dubblett','Fel');");
assert.equal(r("state.managerFeedback.news.filter(n=>n.key==='test').length"),1);
r("feedbackDay();feedbackDay()");
assert.equal(r("state.training.messages.filter(m=>m.key==='world-digest:'+state.calendar.date).length"),1);
r("feedbackRefresh(true);globalThis.brief=state.managerFeedback.briefs[0];messageOpenContext(state.training.messages.find(m=>m.feedbackBriefId===brief.id).id)");
assert.equal(r('state.page'),'staffReview');assert.equal(r('state.managerFeedback.selectedBrief'),r('brief.id'));
r("document.getElementById('content').scrollTop=300;deskNavigate('calendar');deskBack()");
assert.equal(r('state.managerFeedback.selectedBrief'),r('brief.id'));assert.equal(r("document.getElementById('content').scrollTop"),300);
// Promotion hooks the real movement; repeated rendering does not invent acquisitions.
r("globalThis.youth=state.juniors.roster.find(p=>p.pos!=='MV');state.money=1000000000;getClub().wageBudget=1000000000;");
r("juniorPromote(youth.id)");assert.equal(r("state.managerFeedback.followups.length"),1);assert.equal(r("state.managerFeedback.followups[0].kind"),"junior");r("state.managerFeedback.followups=[]");
// Direct observed arrival permits controlled full/partial/medical match evidence.
r("globalThis.p=managerRoster().find(p=>p.pos!=='MV');feedbackArrival(p,{profile:'Målskytt',before:2,futureBefore:2},'transfer');globalThis.makeReport=id=>({id,club:managerClub(),year:state.season.year,finished:true,players:[{id:p.id,seconds:900,goals:1,assists:0}],shots:[],events:[],opponent:'Test'});");
r("feedbackAfterMatch({...makeReport('friendly'),friendly:true});feedbackAfterMatch({...makeReport('partial'),partial:true})");
assert.equal(r('state.managerFeedback.followups[0].games'),0);
r("feedbackAfterMatch(makeReport('one'));feedbackAfterMatch(makeReport('one'))");assert.equal(r('state.managerFeedback.followups[0].games'),1);
r("p.health={injury:{remaining:10},clearance:'rest'};feedbackAfterMatch(makeReport('injured'));delete p.health.injury;");
assert.equal(r('state.managerFeedback.followups[0].games'),1);assert.equal(r('state.managerFeedback.followups[0].excused'),1);
r("for(let i=2;i<=5;i++)feedbackAfterMatch(makeReport('game'+i));");
assert.equal(r('state.managerFeedback.followups[0].status'),'complete');assert.equal(r('state.managerFeedback.followups[0].points'),5);
r("feedbackAfterMatch(makeReport('game6'))");assert.equal(r('state.managerFeedback.followups[0].games'),5);
// Historical focus survives a new focus; closed season records do not penalize the player.
r("state.analysis.matches.unshift(makeReport('baseline'));coachAdopt('defense');coachAdopt('attack')");
assert.equal(r('state.managerFeedback.coachHistory.length'),1);
r("feedbackArrival(p,{profile:'Målskytt',before:1,futureBefore:1},'loan');state.managerFeedback.followups[0].year--;feedbackCloseDepartures()");assert.equal(r('state.managerFeedback.followups[0].status'),'closed');
r('validateManagerFeedbackSave(state);save()');const b=boot(a.storage.value);assert.equal(b.run('state.managerFeedback.followups[0].status'),'closed');
assert.throws(()=>b.run("state.managerFeedback.followups[0].games=-1;validateManagerFeedbackSave(state)"));
// Old saves initialize an empty archive rather than recreating historical outcomes.
r('delete state.managerFeedback;ensureManagerFeedback()');assert.equal(r('state.managerFeedback.followups.length'),0);
console.log('PASS: observational advice, actual news dedup/digest, inbox/back context, full-match evidence, medical exceptions, focus archive, season closure, migration and validation.');
// Real acquisition hooks and an unavailable shortlist option never spend money on inspection.
const c=boot(),q=c.run;q("startCareerWithClub('HV71');state.money=100000000;getClub().wageBudget=100000000;globalThis.free=state.playerWorld.freeAgents[0];globalThis.signed=transferRecruitPlayer(free,WORLD_FREE,managerClub(),0,free.salary,2,'Ordinarie')");
assert.equal(q('signed'),true);assert.equal(q('state.managerFeedback.followups[0].playerId'),q('free.id'));
assert.equal(q("state.managerFeedback.news.some(n=>n.kind==='transfer'&&n.title.includes(free.name))"),true);
q("feedbackRefresh();globalThis.advice=state.managerFeedback.briefs[0];globalThis.optionIndex=advice.options.findIndex(o=>o.playerId!==undefined);");
if(q('optionIndex')>=0){const cash=q('state.money'),count=q('managerRoster().length');q('feedbackOpenOption(advice.id,optionIndex)');assert.equal(q('state.money'),cash);assert.equal(q('managerRoster().length'),count);}
q("feedbackNews('escape','HV71','injury','<img src=x onerror=alert(1)>','Text');");assert.equal(q("feedbackNewsView().includes('<img src=x')"),false);
console.log('PASS: actual signed transfer starts a review; opening an option makes no financial or roster change; headlines escape markup.');
