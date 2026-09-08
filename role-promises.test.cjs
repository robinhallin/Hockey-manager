const assert=require('node:assert/strict');
const {boot}=require('./scripts/career-test-fixture.cjs');
const a=boot(),r=a.run;r(`startCareerWithClub('HV71');globalThis.p=managerRoster().find(p=>p.pos==='MV'&&!playerLoan(p));globalThis.assign=role=>{p.promisedRole=role;p.squadRole=role;rolePromiseAssign(p,role);};globalThis.play=(n,seconds)=>{state.round=n;globalThis.m={finished:true,opponent:'AIK',analysis:{id:'promise:'+n},iceTime:{[p.id]:seconds}};followRecruitmentPromises(m);};`);
r(`assign('Ordinarie');globalThis.initial=p.happiness;play(1,1800);play(2,0);play(3,0)`);
assert.equal(r('p.recruitmentPromise.resolved'),false);
r('play(4,1800);play(5,0);play(6,0)');assert.equal(r('p.recruitmentPromise.result'),'Uppfyllt');assert.equal(r('p.happiness'),r('Math.min(100,initial+5)'));
r('globalThis.completed=JSON.stringify(p.recruitmentPromise);play(6,0)');assert.equal(r('JSON.stringify(p.recruitmentPromise)'),r('completed'));
// A key goalie needs four qualifying appearances, not two.
r("assign('Nyckelspelare');for(let i=7;i<=12;i++)play(i,i<=9?1800:0)");assert.equal(r('p.recruitmentPromise.result'),'Brutet');
r('globalThis.trust=p.social.trust;state.live=m;afterLockerMatch()');assert.ok(r('p.social.trust<=trust-8'));
assert.equal(r('p.recruitmentPromise.lockerReviewed'),true);r('state.live=null');
// Legacy contracts keep their already agreed 2-of-3 rule.
r("p.recruitmentPromise={role:'Ordinarie',minutes:30,games:1,qualified:1,resolved:false};play(13,1800);play(14,0)");assert.equal(r('p.recruitmentPromise.result'),'Uppfyllt');assert.equal(r('p.recruitmentPromise.games'),3);
// Friendly games, medical absence and duplicated fixture calls cannot consume the window.
r("assign('Ordinarie');m={finished:true,friendly:true,analysis:{id:'friendly'},iceTime:{}};followRecruitmentPromises(m);injurePlayer(p,'träning',8);play(15,0)");assert.equal(r('p.recruitmentPromise.games'),0);
r("p.health.injury=null;p.health.clearance='ready';play(16,1800);play(17,0);play(16,1800)");assert.equal(r('p.recruitmentPromise.games'),2);assert.equal(r('p.recruitmentPromise.evidence.length'),2);
r("globalThis.before=JSON.stringify(state);lockerPromiseView()");assert.equal(r('JSON.stringify(state)'),r('before'));
assert.match(r('lockerPromiseView()'),/2 av 6 matcher/);assert.match(r('lockerPromiseView()'),/Matchunderlag/);
assert.doesNotThrow(()=>r('validateSaveText(saveExportText())'));r('save()');const b=boot(a.storage.value);assert.equal(b.run('JSON.stringify(managerRoster().find(x=>x.id==='+JSON.stringify(r('p.id'))+').recruitmentPromise)'),r('JSON.stringify(p.recruitmentPromise)'));
assert.doesNotThrow(()=>b.run('validateSaveText(saveExportText())'));
// Accepted smaller roles archive the old agreement rather than erasing its history.
r("assign('Rotation')");assert.equal(r('p.recruitmentPromise'),undefined);assert.equal(r('p.rolePromiseHistory[0].result'),'Ersatt genom nytt avtal');
// Existing signed future contracts keep old rules; new ones carry their version through activation.
for(const version of [undefined,2]){const x=boot(),t=x.run;t(`startCareerWithClub('HV71');globalThis.q=Object.values(state.clubRosters).flat().find(p=>p.pos==='MV'&&!isOwnPlayer(p)&&!playerLoan(p));q.futureContract={buyer:managerClub(),salary:q.salary,years:2,role:'Ordinarie',joinYear:state.season.year${version?',rolePromiseVersion:2':''}};calendarActivateFuture()`);assert.equal(t('rolePromiseRule(q.recruitmentPromise).total'),version?6:3);}
assert.match(r('rolePromiseOfferView(p)'),/4 av 6/);
console.log('PASS: new goalie role windows, actual happiness/trust, legacy terms, medical/friendly exclusions, fixture idempotence, visible evidence, archived agreements, future-contract compatibility and save/reload.');
// A real accepted renewal uses the new terms without changing salary negotiation rules.
r(`state.live=null;state.boardPlan.offer.wageLimit=1e9;openContractNegotiation(p.id);globalThis.w=renewalWishes(p);submitContractRenewal(p.id,w.salary,w.minYears,'Nyckelspelare');`);
assert.equal(r('state.contractNegotiation'),null);assert.equal(r('p.recruitmentPromise.required'),4);assert.equal(r('p.recruitmentPromise.total'),6);assert.equal(r('p.salary'),r('w.salary'));
// A stale conversation cannot stack a second guarantee over an active agreement.
r(`globalThis.f=managerRoster().find(x=>x.pos!=='MV'&&!playerLoan(x));rolePromiseAssign(f,'Ordinarie');managerMessage('overlap-test','Samtal','Istid','Spelarsamtal',{playerId:f.id,decisionType:'minutes'});globalThis.msg=state.training.messages.find(m=>m.key==='overlap-test');globalThis.count=state.training.promises.length;answerPlayerConversation(msg.id,'promise');`);
assert.equal(r('state.training.promises.length'),r('count'));assert.equal(r('msg.resolved'),false);
r("answerPlayerConversation(msg.id,'honest')");assert.equal(r('msg.resolved'),true);
console.log('PASS: accepted renewal applies goalkeeper terms; a stale conversation cannot stack guarantees and still permits an honest answer.');

assert.match(r('staffReviewView()'),/4 matcher med minst 30 minuter/);assert.match(r('staffReviewView()'),/6 bedömda matcher/);
