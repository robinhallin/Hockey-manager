'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {boot}=require('./scripts/career-test-fixture.cjs');
function start(){const a=boot(undefined,{production:true});a.run(`startCareerWithClub('HV71');globalThis.p=managerRoster().find(p=>p.pos!=='MV');p.promisedRole='Ordinarie';p.social.lastTalk=-100;globalThis.b=playerDialogueStore();globalThis.arrive=()=>{const from=Object.keys(state.clubRosters).find(c=>c!==managerClub()&&state.clubRosters[c].some(q=>q.pos===p.pos));const q=state.clubRosters[from].find(q=>q.pos===p.pos);state.clubRosters[from]=state.clubRosters[from].filter(x=>x!==q);q.club=managerClub();state.clubRosters[managerClub()].push(q);syncManagerRoster();ensureLocker();return q;};`);return a;}
test('migration is quiet, arrivals create causal requests, reads and days deduplicate',()=>{
 const a=start(),r=a.run;assert.equal(r('b.requests.length'),0);
 r('globalThis.q=arrive();playerDialogueDay();globalThis.c=b.requests.find(x=>x.playerId===String(p.id));globalThis.count=b.requests.length;globalThis.before=JSON.stringify(b);playerDialogueView(p);managerAgendaItems();lockerConversation(p)');
 assert.equal(r('JSON.stringify(b)'),r('before'));assert.equal(r('c.kind'),'competition');assert.ok(r('c.evidence.includes(q.name)'));
 r('playerDialogueDay()');assert.equal(r('b.requests.length'),r('count'));
 assert.ok(r('managerAgendaItems().some(x=>x.id==="player-dialogue:"+c.id)'));
 r('save()');const loaded=boot(a.storage.value,{production:true});assert.equal(loaded.run('JSON.stringify(playerDialogueStore())'),r('JSON.stringify(b)'));
});
test('answers have one consequence, followup does not erase conflicts or promises',()=>{
 const {run:r}=start();r(`arrive();playerDialogueDay();globalThis.c=b.requests.find(x=>x.playerId===String(p.id));p.social.ambition=18;globalThis.trust=p.social.trust;playerDialogueAnswer(c.id,'firm')`);
 assert.equal(r('p.social.trust'),r('trust')-1);assert.equal(r(`playerDialogueAnswer(c.id,'firm')`),false);assert.equal(r('playerDialogueReview(c.id)'),false);
 r('state.calendar.date=c.due;playerDialogueDay()');assert.equal(r('playerDialogueReview(c.id)'),true);assert.equal(r('c.status'),'reviewed');assert.equal(r('p.social.trust'),r('trust')-1);
});
test('concrete chance reuses match promise evaluation, excludes partial evidence, survives reload',()=>{
 const a=start(),r=a.run;r(`arrive();playerDialogueDay();globalThis.c=b.requests.find(x=>x.playerId===String(p.id));playerDialogueAnswer(c.id,'chance')`);
 assert.equal(r('p.recruitmentPromise.dialogueId'),r('c.id'));assert.equal(r('c.status'),'following');
 r(`state.calendar.date=calAdd(state.calendar.date,30);playerDialogueDay();state.live={finished:true,analysis:{partial:true},iceTime:{[p.id]:0}};followRecruitmentPromises(state.live)`);assert.equal(r('p.recruitmentPromise.games'),0);assert.equal(r('c.status'),'following');
 r(`for(let i=0;i<3;i++){state.round=900+i;state.live={finished:true,analysis:{partial:false,id:'dialogue-'+i},iceTime:{[p.id]:900}};followRecruitmentPromises(state.live);}playerDialogueDay()`);
 assert.equal(r('p.recruitmentPromise.result'),'Uppfyllt');assert.equal(r('c.status'),'met');
 r('globalThis.trust=p.social.trust;playerDialogueDay();save()');assert.equal(r('p.social.trust'),r('trust'));
 assert.equal(boot(a.storage.value,{production:true}).run('playerDialogueStore().requests.find(r=>r.choice==="chance").status'),'met');
});
test('existing promises cannot be overwritten and unsafe actions are blocked',()=>{
 const {run:r}=start();r(`arrive();playerDialogueDay();globalThis.c=b.requests.find(x=>x.playerId===String(p.id));rolePromiseAssign(p,'Ordinarie');globalThis.old=JSON.stringify(p.recruitmentPromise)`);
 assert.equal(r(`playerDialogueAnswer(c.id,'chance')`),false);assert.equal(r('JSON.stringify(p.recruitmentPromise)'),r('old'));
 r('state.live={finished:false}');assert.equal(r(`playerDialogueAnswer(c.id,'explain')`),false);r('state.live=null;state.season.phase="review"');assert.equal(r(`playerDialogueAnswer(c.id,'explain')`),false);
});
test('unanswered captain concern reaches only three established peers, once',()=>{
 const {run:r}=start();r(`state.locker.captainId=p.id;globalThis.peers=managerRoster().filter(q=>q!==p).slice(0,4);for(const q of peers){q.social.trust=60;socialPair(p.id,q.id,true).bond=60;}globalThis.c=playerDialogueCreate(p,'captain','Kaptensbesked','none');state.calendar.date=calAdd(state.calendar.date,14);playerDialogueDay()`);
 assert.equal(r('c.spread.length'),3);assert.equal(r('peers.filter(q=>q.social.trust===59).length'),3);
 r('playerDialogueDay()');assert.equal(r('peers.filter(q=>q.social.trust===59).length'),3);
});
test('actual captain action and close relationships generate requests; departures and season close are neutral',()=>{
 const {run:r}=start();r(`globalThis.oldCaptain=state.locker.captainId;globalThis.next=managerRoster().find(q=>!samePlayerId(q.id,oldCaptain));appointCaptain(next.id,'leadership');playerDialogueDay()`);
 assert.ok(r('b.requests.some(x=>x.kind==="captain"&&x.playerId===String(oldCaptain))'));
 r(`globalThis.leaving=managerRoster().find(q=>q!==p);socialPair(p.id,leaving.id,true).bond=80;state.clubRosters[managerClub()]=managerRoster().filter(q=>q!==leaving);syncManagerRoster();playerDialogueDay()`);
 assert.ok(r('b.requests.some(x=>x.kind==="departure"&&x.playerId===String(p.id))'));
 r(`playerDialogueClose('Säsongen avslutades.');globalThis.trust=p.social.trust;playerDialogueDay()`);
 assert.equal(r('b.requests.some(playerDialogueActive)'),false);assert.equal(r('p.social.trust'),r('trust'));
});
test('save validator rejects malformed nested and banked conversation data',()=>{
 const {run:r}=start();r('arrive();playerDialogueDay();globalThis.copy=JSON.parse(JSON.stringify(b));copy.requests[0].spread=[{}, {}, {}, {}]');assert.throws(()=>r('validatePlayerDialogueSave(copy)'),/Ogiltiga spelarsamtal/);
 assert.throws(()=>r(`validateManagerSystemsSave({managerCareer:{bank:{HV71:{office2:{playerDialogue:copy}}}}})`),/Ogiltiga spelarsamtal/);
});
test('production daily hook detects transfers and escaped names remain text',()=>{
 const {run:r}=start();r(`globalThis.q=arrive();q.name='<img src=x onerror=bad()>';managerSystemsDay();globalThis.c=b.requests.find(x=>x.playerId===String(p.id))`);assert.ok(r('c'));
 assert.doesNotMatch(r('playerDialogueView(p)'),/<img src=x/);assert.match(r('playerDialogueView(p)'),/&lt;img/);
});
test('injury, loan and national team absence pause a conversation promise without penalties',()=>{
 const {run:r}=start();r(`arrive();playerDialogueDay();globalThis.c=b.requests.find(x=>x.playerId===String(p.id));playerDialogueAnswer(c.id,'chance');globalThis.trust=p.social.trust;globalThis.originalLoan=playerLoan,originalAway=internationalAway;`);
 for(const cause of ['injury','loan','national']){
  r(`p.health.injury=${cause==='injury'?"{days:10}":'null'};playerLoan=who=>samePlayerId(who.id,p.id)&&${cause==='loan'}?{owner:managerClub()}:originalLoan(who);internationalAway=who=>samePlayerId(who.id,p.id)&&${cause==='national'}||originalAway(who);state.live={finished:true,analysis:{id:${JSON.stringify(cause)},partial:false},iceTime:{[p.id]:0}};followRecruitmentPromises(state.live);state.calendar.date=calAdd(state.calendar.date,14);playerDialogueDay()`);
  assert.equal(r('p.recruitmentPromise.games'),0);assert.equal(r('c.status'),'following');assert.equal(r('p.social.trust'),r('trust'));
 }
});
test('trusted mediation requires a genuine leader, no free trust, stale arrival cannot be answered',()=>{
 const {run:r}=start();r(`globalThis.q=arrive();playerDialogueDay();globalThis.c=b.requests.find(x=>x.playerId===String(p.id));for(const x of managerRoster())x.social.leadership=5`);
 assert.equal(r(`playerDialogueAnswer(c.id,'leader')`),false);
 r(`q.social.leadership=20;q.social.trust=70;socialPair(q.id,p.id,true).bond=60;globalThis.trust=p.social.trust`);
 assert.equal(r(`playerDialogueAnswer(c.id,'leader')`),true);assert.equal(r('c.mediatorId'),r('String(q.id)'));assert.equal(r('p.social.trust'),r('trust'));
 r(`c.status='pending';state.clubRosters[managerClub()]=managerRoster().filter(x=>x!==q);syncManagerRoster()`);assert.equal(r(`playerDialogueAnswer(c.id,'explain')`),false);r('playerDialogueDay()');assert.equal(r('c.status'),'neutral');
});
test('completed transfer triggers reaction while future contracts and scouting alone do not',()=>{
 const {run:r}=start();r(`globalThis.seller=Object.keys(state.clubRosters).find(c=>c!==managerClub()&&state.clubRosters[c].some(q=>q.pos===p.pos));globalThis.q=state.clubRosters[seller].find(q=>q.pos===p.pos);q.futureContract={buyer:managerClub(),salary:100000,years:1,role:'Ordinarie'};playerDialogueDay()`);
 assert.equal(r('b.requests.length'),0);r('delete q.futureContract');
 assert.equal(r(`transferRecruitPlayer(q,seller,managerClub(),0,100000,1,'Ordinarie')`),true);
 r('managerSystemsDay()');assert.ok(r('b.requests.some(c=>c.playerId===String(p.id)&&c.kind==="competition"&&c.source===String(q.id))'));
});
