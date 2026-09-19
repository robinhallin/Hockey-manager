'use strict';
const assert=require('node:assert/strict');
const {headlessCareer}=require('./scripts/headless-career.cjs'),{boot}=require('./scripts/career-test-fixture.cjs');
const app=headlessCareer(),r=app.run;
r(`startCareerWithClub('HV71');globalThis.p=managerRoster().find(p=>p.pos!=='MV');globalThis.q=managerRoster().find(x=>x!==p&&x.pos!=='MV');globalThis.seq=1000;
globalThis.relMatch=(seconds=0,extra={})=>{state.round=++seq;state.live={finished:true,hv:0,opp:2,iceTime:{[p.id]:seconds},analysis:{partial:false},...extra};relationshipAfterMatch();};
p.promisedRole='Ordinarie';p.social.missed=2;p.social.ambition=18;`);
assert.equal(r('state.relationships.cases.length'),0,'migration never invents historical conflicts');
r('relMatch();globalThis.c=state.relationships.cases[0];globalThis.once=JSON.stringify(state.relationships);relationshipAfterMatch()');assert.equal(r('JSON.stringify(state.relationships)'),r('once'));
assert.equal(r('c.required'),720);
r("relationshipAction(c.id,'listen');globalThis.t=c.tension;relationshipAction(c.id,'listen')");assert.equal(r('c.tension'),r('t'));
r("relationshipAction(c.id,'plan');relMatch(900);save()");
const loaded=boot(app.storage.value);assert.equal(loaded.run('state.relationships.cases[0].good'),1);
loaded.run(`globalThis.p=managerRoster().find(p=>p.id===${JSON.stringify(r('p.id'))});for(let i=0;i<2;i++){state.round++;state.live={finished:true,hv:2,opp:1,iceTime:{[p.id]:900},analysis:{partial:false}};relationshipAfterMatch();}`);
assert.equal(loaded.run('state.relationships.cases.length'),0);assert.equal(loaded.run('state.relationships.archive[0].resolution'),'reconciled');
// No immediate magic trust recovery; the existing role system owns that reward.
r('globalThis.trust=p.social.trust;relMatch(900);relMatch(900)');assert.equal(r('state.relationships.cases.length'),0);assert.equal(r('p.social.trust'),r('trust'));
// Qualified failure after four games, while partial data/injury do not run the clock.
r("state.relationships.profiles[p.id].settledAt=-100;relMatch();globalThis.c=state.relationships.cases[0];relationshipAction(c.id,'plan');globalThis.trust=p.social.trust;relMatch(0,{analysis:{partial:true}})");assert.equal(r('c.eligible'),0);
r('for(let i=0;i<4;i++)relMatch(0)');assert.equal(r('p.social.trust'),r('trust')-2);assert.equal(r('c.plan'),null);
// A trusted, genuinely connected leader can mediate once; no fabricated friendship.
r('q.social.leadership=20;q.social.trust=70;socialPair(q.id,p.id,true).bond=60;state.locker.captainId=q.id;globalThis.t=c.tension');
r("relationshipAction(c.id,'mediate');relationshipAction(c.id,'mediate')");assert.equal(r('c.tension'),r('t')-5);
r('relMatch();relMatch()');assert.equal(r('c.spread'),true);
// Repeated talk and individual traits change the same base conversation, not a second reward.
r("state.live=null;state.locker.turn+=3;p.social.lastTalk=-100;p.social.lastMinutes=5;p.social.loyalty=20;globalThis.trust=p.social.trust;socialTalk(p.id,'bench')");assert.equal(r('p.social.trust'),r('trust'),'ambitious overlooked player needs action');
r("globalThis.first=relationshipTalk(q,'listen',3,'Besked');globalThis.second=relationshipTalk(q,'listen',3,'Besked')");assert.ok(r('second.delta')<r('first.delta'));
// New arrivals can receive a real mentor assignment, completed only by participation.
r("globalThis.newcomer=state.clubRosters['Brynäs IF'].find(x=>x.pos!=='MV');state.clubRosters['Brynäs IF']=state.clubRosters['Brynäs IF'].filter(x=>x!==newcomer);state.clubRosters[managerClub()].push(newcomer);newcomer.club=managerClub();ensureRelationships();relationshipAssign(newcomer.id,q.id)");
assert.equal(r('state.relationships.mentors[0].status'),'active');
r('globalThis.trust=newcomer.social.trust;globalThis.mentorBond=socialPair(newcomer.id,q.id)?.bond||30;for(let i=0;i<3;i++)relMatch(900,{iceTime:{[newcomer.id]:600,[q.id]:600,[p.id]:900}})');
assert.equal(r('state.relationships.mentors[0].status'),'complete');assert.equal(r('newcomer.social.trust'),r('trust')+2);assert.equal(r('socialPair(newcomer.id,q.id).bond'),r('mentorBond')+3);
r('relationshipAssign(newcomer.id,q.id)');assert.equal(r('state.relationships.mentors.length'),1);
// Public protection, result/youth pledges and repeated broken statements.
r(`state.live=null;p.social.trust=60;p.social.loyalty=18;globalThis.ed={id:'public-test',club:managerClub(),response:{}};relationshipPublic(ed,'shield');globalThis.trust=p.social.trust;relationshipPublic(ed,'shield');`);
assert.equal(r('p.social.trust'),61);
r(`relationshipPublic({id:'public-test2',club:managerClub(),response:{}},'shield')`);assert.equal(r('p.social.trust'),r('trust'));
r(`globalThis.out={status:'missed',source:'one',kind:'results',outcome:'Fem poäng uteblev.'};relationshipPublicOutcome(pressClub(),out);globalThis.trust=p.social.trust;relationshipPublicOutcome(pressClub(),out);`);assert.equal(r('p.social.trust'),r('trust'));
r("relationshipPublicOutcome(pressClub(),{...out,source:'two'})");assert.equal(r('p.social.trust'),r('trust')-2);
r("p.age=35;globalThis.trust=p.social.trust;relationshipPublicOutcome(pressClub(),{...out,source:'youth',kind:'youth'})");assert.equal(r('p.social.trust'),r('trust'));
// UI and reads never advance memory. All names are escaped.
r("p.name='<img src=x onerror=bad()>';state.relationships.cases=[];state.relationships.profiles[p.id].settledAt=-100;relMatch();state.live=null;globalThis.clean=JSON.stringify(state.relationships);relationshipView();render();");assert.equal(r('JSON.stringify(state.relationships)'),r('clean'));assert.doesNotMatch(r('relationshipView()'),/<img src=x/);
r('globalThis.turn=state.relationships.turn;relMatch(0,{friendly:true});relMatch(0,{analysisAbandoned:true})');assert.equal(r('state.relationships.turn'),r('turn'));
r('state.live=null;state.season.year++;ensureRelationships()');assert.equal(r('state.relationships.cases.length'),0);assert.ok(r('state.relationships.archive.length>0'));
r("state.managerClub='Brynäs IF';ensureRelationships()");assert.equal(r('state.relationships.club'),'Brynäs IF');assert.equal(r('state.relationships.cases.length'),0);
// Informal support reaches only established peers, with a four-match cooldown.
r("startCareerWithClub('HV71');p=managerRoster()[0];q=managerRoster()[1];for(const x of managerRoster()){x.social.leadership=5;x.social.trust=70;x.social.missed=0;x.promisedRole='Breddspelare';}q.social.leadership=20;state.locker.captainId=managerRoster()[2].id;socialPair(q.id,p.id,true).bond=60;globalThis.trust=p.social.trust;for(let i=0;i<3;i++)relMatch(900)");assert.equal(r('p.social.trust'),r('trust')+.5);
r('for(let i=0;i<3;i++)relMatch(900)');assert.equal(r('p.social.trust'),r('trust')+.5);
r('relMatch(900)');assert.equal(r('p.social.trust'),r('trust')+1);
for(const club of r('Object.keys(CLUB_DATA)')){r(`startCareerWithClub(${JSON.stringify(club)});lockerUI.tab='relationships';deskNavigate('locker')`);assert.doesNotMatch(r('relationshipView()'),/undefined|NaN/);}
// Genuine production after-locker hook, not just a standalone observer call.
r("startCareerWithClub('HV71');state.calendar.date=calendarTarget();createMatch();state.live.finished=true;afterLockerMatch();globalThis.once=JSON.stringify(state.relationships);afterLockerMatch()");assert.equal(r('state.relationships.turn'),1);assert.equal(r('JSON.stringify(state.relationships)'),r('once'));
r('save()');assert.equal(boot(app.storage.value).run('JSON.stringify(state.relationships)'),r('JSON.stringify(state.relationships)'));
console.log('PASS: causal conflicts, action-based reconciliation, bounded repeated dialogue, influence and mediation, arrival mentors, public statement reactions, idempotence, reload, career boundaries and all 28 clubs.');
