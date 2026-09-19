const test=require('node:test'),assert=require('node:assert/strict');
const {boot}=require('./scripts/career-test-fixture.cjs');
function game(){const a=boot();a.run("startCareerWithClub('HV71')");return a;}
function ownDraft(a){a.run("state.season.phase='review';state.season.boardResult=[];beginPreseason();globalThis.p=state.juniors.roster.find(p=>p.pos==='B');p.nhlDraft={year:2027,club:'Seattle Kraken',round:2,overall:42,expires:'2031-06-30'};state.calendar.date='2027-09-12';state.season.year=2027;p.fatigue=0;p.health={load:0,injury:null,clearance:'rest'}");}
test('draft cohort boundaries, unknown historical status and read-only views',()=>{
 const a=game(),r=a.run;
 assert.equal(r("nhlFirstYear({research:{birth:'2009-09-15'}})"),2027);
 assert.equal(r("nhlFirstYear({research:{birth:'2009-09-16'}})"),2028);
 assert.equal(r("nhlEligible({research:{birth:'2008-06-01'}},2027)"),false);
 assert.equal(r("nhlEligible({research:{birth:'2009-09-15'}},2027)"),true);
 assert.equal(r("nhlEligible({fictional:true,age:18,nationality:'SWE'},2029)"),false);
 const before=r('JSON.stringify(state)');r("for(const tab of ['club','board','results','rights']){nhlUI.tab=tab;nhlView()}nhlCalendar();nhlProfile(managerRoster()[0]);render();render()");assert.equal(r('JSON.stringify(state)'),before);
 r("state.calendar.date='2028-07-10';delete state.nhl;ensureNHL();nhlDay()");assert.equal(r('state.nhl.draft.year'),2029);assert.equal(r('state.nhl.history.length'),0);assert.equal(r('internationalPlayers().some(r=>r.p.nhlDraft)'),false);
});
test('scouting uses observed development/JVM, not hidden ceiling or potential; reports freeze',()=>{
 const a=game(),r=a.run;r('globalThis.p=state.juniors.roster[0];globalThis.score=nhlEvidence(p,2027).score;p.potential=999;p.overall=999;p.attributeGrowth=999;p.academy.ceiling=Object.fromEntries(Object.keys(p.attributes).map(k=>[k,99]))');assert.equal(r('nhlEvidence(p,2027).score'),r('score'));
 r('p.internationalHistory=[{year:2027,games:6,seconds:7200}]');assert.ok(r('nhlEvidence(p,2027).score')>r('score'));
 r("nhlScoutReport();globalThis.board=JSON.stringify(state.nhl.draft.board);p.attributes.positioning+=1;nhlScoutReport()");assert.equal(r('JSON.stringify(state.nhl.draft.board)'),r('board'));
 r("state.calendar.date='2027-01-15';nhlScoutReport()");assert.equal(r('state.nhl.draft.window'),'winter');assert.ok(r('state.nhl.draft.board.some(r=>r.previous)'));
});
test('seven rounds, unique rights, reproducible reload, no contracts/stat changes or rerolls',()=>{
 const a=game(),r=a.run;r("globalThis.before=JSON.stringify(internationalPlayers().map(({p,club})=>[p.id,club,p.salary,p.contractYears,p.attributes,p.goals,p.assists,p.games]));save()");const b=boot(a.storage.value);
 r("state.calendar.date='2027-06-28';nhlDay()");b.run("state.calendar.date='2027-06-28';nhlDay()");
 assert.equal(r('state.nhl.draft.picks.length'),224);assert.equal(r('new Set(state.nhl.draft.picks.map(p=>p.id)).size'),224);assert.equal(r('new Set(state.nhl.draft.picks.map(p=>p.overall)).size'),224);assert.equal(r('NHL_CLUBS.every(c=>state.nhl.draft.picks.filter(p=>p.club===c).length===7)'),true);
 assert.equal(r('JSON.stringify(state.nhl.draft.picks)'),b.run('JSON.stringify(state.nhl.draft.picks)'));
 assert.equal(r('JSON.stringify(internationalPlayers().map(({p,club})=>[p.id,club,p.salary,p.contractYears,p.attributes,p.goals,p.assists,p.games]))'),r('before'));
 const stable=r('JSON.stringify(state)');r('nhlDay();nhlRunDraft();save()');assert.equal(r('JSON.stringify(state)'),stable);
 const loaded=boot(a.storage.value);assert.equal(loaded.run('JSON.stringify(state.nhl)'),r('JSON.stringify(state.nhl)'));
 r("state.calendar.date='2031-07-01';nhlDay()");assert.equal(r("internationalPlayers().some(r=>r.p.nhlDraft?.year===2027&&nhlRightsActive(r.p))"),false);assert.equal(r('state.nhl.draft.year'),2032);
 assert.equal(r('internationalPlayers().filter(r=>r.p.nhlDraft).some(r=>nhlEligible(r.p,2032))'),false);
});
test('actual preseason transition resolves June draft before birthdays and retains rights across years',()=>{
 const a=game(),r=a.run;r("globalThis.p=state.juniors.roster.find(p=>p.pos==='B');p.age=19;p.internationalIdentity={nation:'SWE',birthYear:2007,estimated:false};for(const k of Object.keys(p.attributes))p.attributes[k]=20;state.season.phase='review';state.season.boardResult=[];beginPreseason()");
 assert.equal(r('p.nhlDraft.year'),2027);assert.equal(r('p.age'),20);assert.equal(r('state.nhl.history[0].year'),2027);assert.equal(r('state.nhl.draft.year'),2028);assert.equal(r('state.nhl.history[0].picks.some(r=>r.id===p.id)'),true);
 r("globalThis.rights=JSON.stringify(p.nhlDraft);state.season.phase='review';beginPreseason()");assert.equal(r('JSON.stringify(p.nhlDraft)'),r('rights'));assert.equal(r('state.nhl.history.length'),2);
});
test('development promises count real J20 fixtures once, forgive absence and reward only after delivery',()=>{
 const a=game(),r=a.run;ownDraft(a);r("globalThis.morale=p.morale;nhlSetPlan(p.id,'junior')");assert.equal(r('p.morale'),r('morale'));assert.equal(r("nhlSetPlan(p.id,'open')"),false);
 r("p.internationalDuty={from:'2027-09-01',until:'2027-10-01',returned:false};nhlObserveFixture('junior','absent',state.calendar.date,managerClub(),[]);delete p.internationalDuty;p.health.injury={remaining:3};nhlObserveFixture('junior','injured',state.calendar.date,managerClub(),[]);p.health.injury=null");assert.equal(r('p.nhlPlan.games'),0);
 r("globalThis.pair=juniorWorldPairings(leagueOf(),1)?.find(x=>x.home===managerClub()||x.away===managerClub())");
 // Exercise the actual report seam; the lineup determines seconds, not the test.
 r("globalThis.forecast=juniorWorldProjectedResult(pair.home,pair.away,1);juniorCalendarManagerReport(pair,1,state.calendar.date,forecast)");assert.equal(r('p.nhlPlan.games'),1);
 const seconds=r('p.nhlPlan.seconds');assert.equal(seconds,r('state.juniors.matches[0].players.find(q=>q.id===p.id).seconds'));
 r("for(let i=2;i<=6;i++)nhlObserveFixture('junior','j20-test:'+i,state.calendar.date,managerClub(),[{id:p.id,seconds:1000}]);nhlObserveFixture('junior','j20-test:6',state.calendar.date,managerClub(),[{id:p.id,seconds:1000}])");assert.equal(r('p.nhlPlan.games'),6);assert.equal(r('p.nhlPlan.status'),'met');assert.equal(r('p.morale'),r('morale')+3);
 r("nhlClosePlan(p,'met','duplicate')");assert.equal(r('p.morale'),r('morale')+3);
});
test('senior fixture seam, healthy omission, partial exclusion, failed promise and neutral departure',()=>{
 const a=game(),r=a.run;ownDraft(a);r("nhlSetPlan(p.id,'senior');globalThis.morale=p.morale;globalThis.g={round:1,date:state.calendar.date,home:managerClub(),away:'Örebro Hockey',played:true,homeGoals:0,awayGoals:1};leagueCommitRows(g,[],true);globalThis.g2={...g,statsRecorded:false,round:2};leagueCommitRows(g2,[])");assert.equal(r('p.nhlPlan.games'),1);
 r("for(let i=0;i<5;i++)nhlObserveFixture('senior','empty:'+i,state.calendar.date,managerClub(),[])");assert.equal(r('p.nhlPlan.status'),'missed');assert.equal(r('p.morale'),r('morale')-4);
 r("p.nhlPlan.season=2026;nhlSetPlan(p.id,'senior');globalThis.morale=p.morale;state.juniors.roster=state.juniors.roster.filter(q=>q!==p);state.clubRosters.AIK.push(p);nhlDay()");assert.equal(r('p.nhlPlan.status'),'neutral');assert.equal(r('p.morale'),r('morale'));assert.equal(r('p.nhlDraft.club'),'Seattle Kraken');
});
test('real transfer carries rights; old pending drafts are skipped; live matches block decisions',()=>{
 const a=game(),r=a.run;r("globalThis.p=state.clubRosters.AIK[4];p.nhlDraft={year:2026,club:'Utah Mammoth',overall:50,round:2,expires:'2030-06-30'};globalThis.rights=JSON.stringify(p.nhlDraft);state.money=1000000000;state.season.nextWageLimit=1000000000");
 assert.equal(r("transferRecruitPlayer(p,'AIK',managerClub(),100000,p.salary,2,'Breddspelare')"),true);assert.equal(r('JSON.stringify(p.nhlDraft)'),r('rights'));assert.equal(r('managerRoster().filter(q=>q.id===p.id).length'),1);
 r("state.live={finished:false};globalThis.before=JSON.stringify(state);nhlDay();nhlRunDraft('2027-06-28');nhlSetPlan(p.id,'senior')");assert.equal(r('JSON.stringify(state)'),r('before'));
 r("state.live=null;state.calendar.date='2030-08-01';nhlDay()");assert.equal(r('state.nhl.history[0].skipped'),true);assert.equal(r('state.nhl.history[0].picks.length'),0);assert.equal(r('state.nhl.draft.year'),2031);
});
test('insufficient evidence and manager changes close neutrally; open dialogue has no reward',()=>{
 const a=game(),r=a.run;ownDraft(a);r("globalThis.morale=p.morale;nhlSetPlan(p.id,'open')");assert.equal(r('p.nhlPlan.status'),'open');assert.equal(r('p.morale'),r('morale'));
 r("p.nhlPlan.season=2026;nhlSetPlan(p.id,'senior');state.calendar.date=calAdd(p.nhlPlan.deadline,1);nhlDay()");assert.equal(r('p.nhlPlan.status'),'neutral');assert.equal(r('p.morale'),r('morale'));
});
