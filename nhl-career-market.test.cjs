const test=require('node:test'),assert=require('node:assert/strict');
const {boot}=require('./scripts/career-test-fixture.cjs');
function game(){const a=boot(undefined,{production:true});a.run(`startCareerWithClub('HV71');state.calendar.date='2026-08-02';globalThis.p=state.juniors.roster.find(p=>p.pos==='B');p.age=19;p.nhlDraft={year:2026,club:'Seattle Kraken',expires:'2030-06-30'};for(const k of Object.keys(p.attributes))p.attributes[k]=13;p.health={load:0,injury:null,clearance:'rest'};playerSocialIdentity(p);p.social.ambition=15;p.social.loyalty=10;state.season.nextWageLimit=1000000000;state.boardPlan.offer.wageLimit=1000000000;`);return a;}
function sign(a){a.run(`globalThis.o=naOffer(p,managerClub());naAnswer(o.id,'move');state.calendar.date=o.dueDate;naProcessOffers(state.calendar.date)`);assert.equal(a.run('o.status'),'signed');}
test('current-year Swedish draft window is inclusive and independent of ordinary transfer dates',()=>{
 const a=game(),r=a.run;for(const [date,expected] of [['2026-07-14',false],['2026-07-15',true],['2026-08-15',true],['2026-08-16',false]]){r(`state.calendar.date='${date}'`);assert.equal(r('naReleaseTerms(p).open'),expected,date);}
});
test('negotiated clause fixes fee and authorizes player stage without another club decision',()=>{
 const a=game(),r=a.run;assert.equal(r("naGrantRelease(p.id,'2026-08-02','2026-08-15',1000000)"),true);
 r('globalThis.o=naOffer(p,managerClub());globalThis.cash=state.money');assert.equal(r('o.stage'),'player');assert.equal(r('o.fee'),1000000);assert.equal(r('naActive(p)'),false);
 r('state.calendar.date=o.dueDate;naProcessOffers(state.calendar.date)');assert.equal(r('o.status'),'signed');assert.equal(r('state.money-cash'),1000000);assert.equal(r('p.nhlRelease'),undefined);
});
test('clause cannot be backdated, imposed on another club or changed during an offer',()=>{
 const a=game(),r=a.run;assert.equal(r("naGrantRelease(p.id,'2026-08-01','2026-08-15',1000000)"),false);assert.equal(r("naGrantRelease(p.id,'2026-08-02','2026-08-15',-1)"),false);
 r('globalThis.o=naOffer(p,managerClub())');assert.equal(r("naGrantRelease(p.id,'2026-08-02','2026-08-15',1000000)"),false);assert.equal(r('p.nhlRelease'),undefined);
});
test('clause expiry blocks a pending automatic release even if ordinary market is open',()=>{
 const a=game(),r=a.run;r("naGrantRelease(p.id,'2026-08-02','2026-08-03',1000000);globalThis.o=naOffer(p,managerClub());globalThis.cash=state.money;state.calendar.date=o.dueDate;naProcessOffers(state.calendar.date)");assert.equal(r('o.status'),'expired');assert.equal(r('state.money'),r('cash'));
});
test('AI settlement rechecks squad coverage after another departure during deliberation',()=>{
 const a=game(),r=a.run;
 r("globalThis.club='Färjestad BK';state.juniors.roster=state.juniors.roster.filter(q=>q!==p);delete p.academy;state.clubRosters[club].push(p);p.club=club;globalThis.o=naOffer(p,club);naApprove(o,'move')");
 assert.equal(r('o.stage'),'player');
 r("for(const q of state.clubRosters[club].filter(q=>q!==p&&q.pos==='B').slice(5)){state.clubRosters[club]=state.clubRosters[club].filter(x=>x!==q);worldRelease(q,club,'Controlled second departure');}state.calendar.date=o.dueDate;naProcessOffers(state.calendar.date)");
 assert.equal(r('o.status'),'expired');assert.equal(r('getPlayerClub(p.id)'),r('club'));assert.equal(r('naActive(p)'),false);
});
test('NHL extension starts at expiry, preserves identity and only applies once',()=>{
 const a=game(),r=a.run;sign(a);r("p.naContract.end='2027-06-30';state.calendar.date='2027-05-15';for(const k of Object.keys(p.attributes))p.attributes[k]=16;naReviewContract(p,state.calendar.date);globalThis.end=p.naContract.end;state.calendar.date=calAdd(state.calendar.date,3);naReviewContract(p,state.calendar.date)");assert.equal(r('p.naContract.renewal.status'),'agreed');assert.equal(r('p.naContract.end'),r('end'));
 r("state.calendar.date='2027-07-01';naExpire(p);globalThis.after=p.naContract.end;naDay()");assert.equal(r('naActive(p)'),true);assert.equal(r('p.naContract.end'),r('after'));assert.equal(r('state.northAmerica.abroad.filter(q=>q.id===p.id).length'),1);assert.equal(r('p.naHistory.length'),1);
});
test('weak veteran is released while a young prospect can retain NHL-only rights',()=>{
 const a=game(),r=a.run;sign(a);r("p.age=33;p.naContract.end='2026-08-01';naExpire(p)");assert.equal(r('naRights(p).kind'),'free');assert.equal(r('worldIsFree(p.id)'),true);
});
test('recorded minutes cause Europe interest; views and repeated daily review do not invent games',()=>{
 const a=game(),r=a.run;sign(a);r("p.age=26;p.naSeasons=[];naReviewDevelopment(p,state.calendar.date);p.naSeasons=[{year:2026,league:'AHL',games:6,seconds:1800,goals:0,assists:0}];state.calendar.date=calAdd(state.calendar.date,28);naReviewDevelopment(p,state.calendar.date);globalThis.before=JSON.stringify(p)");
 assert.equal(r('p.naContract.development.seekingEurope'),true);assert.equal(r('p.naContract.development.minutes'),5);r('naReviewDevelopment(p,state.calendar.date);naContractView(p)');assert.equal(r('JSON.stringify(p)'),r('before'));
});
test('watch survives reload; free returnee attracts real competing offers under existing budgets',()=>{
 const a=game(),r=a.run;sign(a);r("naWatchReturn(p.id);p.age=29;for(const k of Object.keys(p.attributes))p.attributes[k]=13;p.naContract.end='2026-08-01';naExpire(p);globalThis.id=p.id;globalThis.clubs=Object.keys(state.clubAI.clubs).filter(c=>c!==managerClub()).slice(0,2);for(const club of clubs){state.clubRosters[club]=state.clubRosters[club].filter(q=>q.pos!=='B');state.recruitment.ai[club].cash=1000000000;state.recruitment.ai[club].wageLimit=1000000000;}naReturnMarketDay(state.calendar.date)");
 assert.ok(r('state.clubAI.offers.filter(o=>o.playerId===id&&o.status===\'pending\').length')>=1);assert.equal(r('worldIsFree(id)'),true);r('save()');const b=boot(a.storage.value,{production:true});assert.equal(b.run('state.northAmerica.returnWatch[managerClub()].length'),1);
 const before=r('state.clubAI.offers.length');r('naReturnMarketDay(state.calendar.date)');assert.equal(r('state.clubAI.offers.length'),before);
});
