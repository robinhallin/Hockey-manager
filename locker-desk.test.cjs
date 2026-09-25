'use strict';
const assert=require('node:assert/strict'),{boot}=require('./scripts/career-test-fixture.cjs');
const app=boot(),r=app.run;
r("startCareerWithClub('HV71');deskNavigate('locker');globalThis.p=managerRoster()[0];globalThis.q=managerRoster()[1]");
assert.equal(r('lockerAttention().length'),0,'no invented conflicts in a new career');
assert.equal(r("lockerRole(p)==='Informell ledare'"),false,'neutral real players are not invented leaders');
const clean=r('JSON.stringify(state)');
for(const tab of ['situation','leadership','relationships','promises','history']){
 r(`lockerSet('tab',${JSON.stringify(tab)});lockerWorkspaceView()`);
 assert.equal(r('JSON.stringify(state)'),clean,'read-only '+tab);
}
r("lockerSet('tab','situation');lockerSearch(p.name,0)");assert.equal(r('lockerRows().length'),1);assert.equal(r('lockerRows()[0].p.id'),r('p.id'));
r("lockerSet('player',q.id);lockerSearch('no-such-name',0)");assert.match(r('lockerInspector()'),/ingår inte i aktuellt urval/);assert.equal(r('lockerSelected().id'),r('q.id'));
r("lockerReset();p.social.trust=33;q.social.trust=88;lockerSort('trust')");assert.equal(r('lockerRows()[0].p.id'),r('q.id'));
r("lockerSort('trust')");assert.equal(r('lockerRows()[0].p.id'),r('p.id'));
r("p.social.missed=2;p.happiness=50;lockerSet('filter','concerns')");assert.equal(r('lockerRows().length'),1);assert.equal(r('lockerAttention()[0].p.id'),r('p.id'));
r("p.recruitmentPromise={minutes:12,games:2,qualified:0,resolved:false};lockerWorkspaceView()");assert.equal(r('lockerFactors(p)[0].kind'),'Löfte');assert.match(r('lockerFactors(p)[0].detail'),/inte längre nås/);
// Deep links clear stale query/group filters and retain exact player identity.
r("lockerUI.group='captain';lockerUI.query='missing';squadUI.player=q.id;squadPlayerAction('talk')");assert.equal(r('lockerRows().length'),r('managerRoster().length'));assert.equal(r('lockerSelected().id'),r('q.id'));
r("lockerOpenDetail('talk',q.id);lockerSet('tab','relationships')");assert.equal(r('lockerUI.detail'),null);assert.equal(r('lockerMainTab()'),'leadership');
r("lockerSet('tab','history')");assert.equal(r('lockerMainTab()'),'promises');
r("lockerOpenDetail('talk','missing')");assert.equal(r('lockerUI.detail'),null);
// A newly agreed conversation promise records its real date and match evidence.
r("startCareerWithClub('HV71');globalThis.p=managerRoster().find(x=>x.pos!=='MV');managerMessage('locker-ui-test','Istid','Kan jag få mer ansvar?','Spelarsamtal',{playerId:p.id,decisionType:'minutes'});globalThis.request=lockerRequests(p)[0];answerPlayerConversation(request.id,'promise');globalThis.promise=state.training.promises.at(-1)");
assert.equal(r('promise.club'),'HV71');assert.equal(r('promise.agreed'),r('state.calendar.date'));assert.equal(r('promise.evidence.length'),0);
r("p.promisedRole='Breddspelare';state.calendar.date=calendarTarget();createMatch();state.live.finished=true;state.live.iceTime={[p.id]:901};afterTrainingMatch();globalThis.evidence=JSON.stringify(promise.evidence);afterTrainingMatch()");
assert.equal(r('promise.evidence.length'),1);assert.equal(r('promise.evidence[0].seconds'),901);assert.equal(r('promise.evidence[0].qualified'),true);assert.equal(r('JSON.stringify(promise.evidence)'),r('evidence'));
r('save()');const loaded=boot(app.storage.value);assert.equal(loaded.run('JSON.stringify(state.training.promises.at(-1).evidence)'),r('evidence'));
assert.match(r('lockerPromiseView()'),/Matchunderlag/);
console.log('PASS: real attention, five legacy routes in three tabs, read-only views, filters/sorting, exact selection, stale links and persisted match evidence.');
