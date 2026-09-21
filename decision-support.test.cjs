'use strict';
const assert=require('node:assert/strict');
const {boot}=require('./scripts/career-test-fixture.cjs');
const app=boot(),r=app.run;
r("startCareerWithClub('HV71');globalThis.p=managerRoster().find(p=>p.pos!=='MV');globalThis.seq=1000;globalThis.relMatch=()=>{state.round=++seq;state.live={finished:true,hv:1,opp:2,iceTime:{},analysis:{partial:false}};relationshipAfterMatch();};p.promisedRole='Ordinarie';p.social.missed=2;p.social.ambition=18;p.fatigue=0;relMatch();globalThis.c=state.relationships.cases[0]");
assert.ok(r("managerDecisionItems().some(i=>i.id==='relationship:'+c.id)"));
r('globalThis.oldSalary=renewalWishes(p).salary;for(let i=0;i<6;i++)relMatch()');
assert.equal(r('c.wantsMove'),true);
assert.ok(r('renewalWishes(p).salary>oldSalary'));
r('state.live=null;globalThis.trust=p.social.trust;relationshipDiscussRole(c.id);relationshipDiscussRole(c.id)');
assert.equal(r('p.social.trust'),r('trust')-1,'one rejection per case');
assert.equal(r('p.promisedRole'),'Ordinarie');
assert.equal(r('c.roleDiscussion.accepted'),false);
r('save()');assert.equal(boot(app.storage.value).run('state.relationships.cases[0].roleDiscussion.accepted'),false);
// Three genuine fulfilled matches close the conflict and remove the premium.
r('for(let i=0;i<3;i++){state.round=++seq;state.live={finished:true,hv:2,opp:1,iceTime:{[p.id]:900},analysis:{partial:false}};relationshipAfterMatch()}');
assert.equal(r('state.relationships.cases.length'),0);
assert.equal(r('renewalWishes(p).salary'),r('Math.round(p.salary*(p.contractYears<=1?1.10:1.04)*(p.social.trust<40?1.10:p.social.trust>=80?.97:1)/10000)*10000'));
// A willing veteran can agree to a smaller role, never erasing an active promise.
r("state.live=null;state.relationships.profiles[p.id].settledAt=-100;p.age=34;p.social.ambition=10;p.social.trust=70;p.social.missed=2;relMatch();c=state.relationships.cases[0];state.live=null;rolePromiseAssign(p,'Ordinarie');relationshipDiscussRole(c.id)");
assert.equal(r('c.roleDiscussion'),undefined);
r("p.recruitmentPromise.resolved=true;globalThis.salary=p.salary;globalThis.trust=p.social.trust;relationshipDiscussRole(c.id)");
assert.equal(r('p.promisedRole'),'Rotation');assert.equal(r('p.salary'),r('salary'));assert.equal(r('p.social.trust'),r('trust'));
assert.equal(r('state.relationships.archive[0].resolution'),'new-role');
assert.equal(r('p.recruitmentPromise.resolved'),true);
// Data quality gates and immutable evidence; readings never alter plans or saves.
r(`globalThis.report={id:'evidence',club:managerClub(),year:state.season.year,date:state.calendar.date,finished:true,opponent:'AIK',units:[],strengthSeconds:{even:1200},shots:[{situation:'even',side:'own',dangerous:true}],tacticalReviews:[{time:600,label:'Högre press',baseline:{seconds:600,dangerFor:2,dangerAgainst:1},result:{seconds:600,dangerFor:4,dangerAgainst:3}}]};state.analysis.matches=[report];globalThis.before=JSON.stringify(state)`);
assert.match(r('matchDecisionReview(report)'),/2.0 → 4.0/);
assert.match(r('matchDecisionReview({...report,partial:true})'),/Ingen effektbedömning/);
assert.match(r('matchDecisionReview({...report,tacticalReviews:[{...report.tacticalReviews[0],result:{seconds:299}}]})'),/Ingen effektbedömning/);
assert.match(r('managerMatchLearningView()'),/Förbered/);
assert.equal(r('JSON.stringify(state)'),r('before'));
assert.equal(r("managerOffice2Action(managerDecisionItems().find(i=>i.reportId))"),'matchesOpenReport("evidence")');
r("state.analysis.matches=[{...report,club:'Wrong club'}]");assert.equal(r('managerRecentMatches().length'),0);
r('state.analysis.matches=[{...report,strengthPartial:true}]');assert.equal(r('managerRecentMatches().length'),0);
// Real forward combination evidence, only after sufficient games and exposure.
r(`state.analysis.matches=[0,1,2].map(i=>({...report,id:'m'+i,units:[{key:'line',kind:'forward',names:['A','B','C'],seconds:400,dangerFor:1,dangerAgainst:3,shotsFor:2,shotsAgainst:4,goalsFor:0,goalsAgainst:0}]}))`);
assert.ok(r("managerDecisionItems().some(i=>i.id==='formation:line')"));
r('state.analysis.matches.pop()');assert.ok(!r("managerDecisionItems().some(i=>i.id==='formation:line')"));
r("state.analysis.matches=[];managerDecisionNavigate('locker','relationships')");assert.equal(r('lockerUI.tab'),'relationships');
r("managerDecisionNavigate('statistics','trends')");assert.equal(r('matchesUI.analysis'),'trends');
// Overflow collapses routine work but all mandatory decisions stay in the main list.
r("for(let i=0;i<7;i++)managerMessage('required-'+i,'Beslut '+i,'Svar krävs','Spelare',{decisionType:'role'});globalThis.html=managerOffice2View()");
assert.equal(r("html.split('<details>')[0].match(/Beslut [0-6]/g).length"),7);
r("state.analysis.matches=[{...report,opponent:'<img src=x>'}];globalThis.clean=JSON.stringify(state);managerOfficeView();managerMatchLearningView()");
assert.equal(r('JSON.stringify(state)'),r('clean'));
assert.doesNotMatch(r('managerMatchLearningView()'),/<img src=x>/);
console.log('PASS: office priorities and exact report routing, exposure gates, read-only learning, persistent role negotiation, active promise protection and consequence recovery.');
