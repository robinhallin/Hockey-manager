'use strict';
const assert=require('node:assert/strict');
const {boot}=require('./scripts/career-test-fixture.cjs');
const app=boot(),r=app.run;
r(`startCareerWithClub('HV71');globalThis.p=managerRoster().find(p=>p.pos==='C'&&!playerLoan(p));
 for(const q of managerRoster())q.social.leadership=1;
 p.promisedRole='Nyckelspelare';p.social.ambition=20;p.fatigue=0;p.trainingLoad='normal';
 globalThis.fixture=0;globalThis.playRole=(rank,seconds=600,extra={})=>{
  state.round=++fixture;const usage=[0,0,0,0];if(rank)usage[rank-1]=seconds;
  state.live={finished:true,opponent:'Test',hv:2,opp:1,analysis:{id:'role:'+fixture,roleUsageVersion:1,players:{[p.id]:{roleUsage:usage}}},iceTime:{[p.id]:seconds},...extra};
  afterLockerMatch();return squadRoleEvidence(p);
 };globalThis.initialTrust=p.social.trust;`);
// Both top lines meet a key role at ten minutes; results do not depend on ability rank.
r('for(let i=0;i<8;i++)playRole(i%2+1)');assert.equal(r('p.social.trust'),r('initialTrust'));assert.equal(r('p.social.missed'),0);
r("p.promisedRole='Ordinarie';for(let i=0;i<6;i++)playRole(3,480)");assert.equal(r('p.social.trust'),r('initialTrust'));
r("p.promisedRole='Breddspelare';for(let i=0;i<6;i++)playRole(4,240)");assert.equal(r('p.social.trust'),r('initialTrust'));
// Persistent under-use is a real problem, a single scratched game is not.
r("p.promisedRole='Nyckelspelare';p.roleGames=[];playRole(0,0);playRole(1,600);playRole(2,600)");assert.equal(r('p.social.trust'),r('initialTrust'));
r('for(let i=0;i<6;i++)playRole(4,360)');assert.ok(r('p.social.trust')<r('initialTrust'));assert.ok(r('p.social.roleConcern'));
r('globalThis.lowTrust=p.social.trust;for(let i=0;i<3;i++)playRole(2,600)');assert.equal(r('p.social.roleConcern'),undefined);assert.ok(r('p.social.trust')>=r('lowTrust'));
// Moving a player to line one after the game cannot rewrite recorded responsibility.
r('playRole(4,360);changeLinePlayer("forwards",0,p.id)');assert.equal(r('squadRoleEvidence(p).met'),false);
// Exempt fixtures neither consume the rolling window nor create fresh complaints.
r('globalThis.count=p.roleGames.length;globalThis.trust=p.social.trust;playRole(0,0,{friendly:true});playRole(0,0,{analysis:{partial:true}});playRole(0,0,{analysisAbandoned:true});p.trainingLoad="rest";playRole(0,0);p.trainingLoad="normal";p.health.injury={remaining:2};playRole(0,0);p.health.injury=null;');
assert.equal(r('p.roleGames.length'),r('count'));assert.equal(r('p.social.trust'),r('trust'));
// Role promises use deployment, while a separate minute promise remains numeric.
r("rolePromiseAssign(p,'Nyckelspelare');for(let i=0;i<3;i++){playRole(2,600);followRecruitmentPromises(state.live);}");assert.equal(r('p.recruitmentPromise.result'),'Uppfyllt');assert.equal(r('p.recruitmentPromise.mode'),'placement');
r("state.live=null;p.recruitmentPromise={role:'Nyckelspelare',minutes:15,total:3,required:2,games:1,qualified:0,resolved:false,evidence:[]};delete p.social.rolePolicyVersion;ensureLocker();");
assert.equal(r('p.recruitmentPromise.games'),0);assert.match(r('p.rolePromiseHistory[0].result'),/kedjeplacering/);assert.equal(r('p.recruitmentPromise.mode'),'placement');
// Ratings are numeric, preserve zero, and survive detailed report pruning and reload.
r(`state.analysis.matches=[];state.analysis.history={};globalThis.report=(id,score,extra={})=>({id,year:state.season.year,round:1,date:state.calendar.date,club:managerClub(),opponent:'Test',own:1,against:0,finished:true,shots:[],performance:{club:managerClub(),rows:[{id:p.id,club:managerClub(),score}]},...extra});
 state.analysis.matches=[report('r1',0),report('r2',10),report('friendly',10,{friendly:true}),report('partial',10,{partial:true}),report('old',10,{year:state.season.year-1}),report('elsewhere',10,{club:'AIK'})];archiveMatchSummaries();archiveMatchSummaries();`);
assert.equal(r('playerRatingSummary(p).average'),5);assert.equal(r('playerRatingSummary(p).games'),2);assert.match(r('performanceRating({score:0})'),/>0,0</);assert.match(r('performanceRating({score:10})'),/>10,0</);assert.equal(r('performanceScore({stars:3.5})'),7);assert.equal(r('performanceScore({stars:null})'),null);
r('state.analysis.matches=[];save()');const loaded=boot(app.storage.value);assert.equal(loaded.run(`playerRatingSummary(playerById(${JSON.stringify(r('p.id'))})).average`),5);
r("squadSet('tab','ratings');squadSort('rating')");
const ratingTable=r('squadWorkspaceView()');assert.match(ratingTable,/Snittbetyg/);assert.match(ratingTable,/Bedömda M/);
const ratingRow=ratingTable.match(new RegExp('<tr data-squad-player="'+r('p.id')+'"[^>]*>([\\s\\S]*?)</tr>'))?.[1];
assert.ok(ratingRow,'rated player is present in the table');
assert.match(ratingRow.replace(/<[^>]+>/g,' ').replace(/\s+/g,' '),/\b2 10,0 5,0\b/,'two assessed games, latest 10.0 and average 5.0');
// Four simultaneous lines and one active special-team builder; legacy swap actions remain valid.
r("deskNavigate('stories')");assert.equal(r('state.page'),'home');assert.ok(r('overviewUI.stories'));assert.doesNotMatch(r('deskSubnav()'),/Säsongens historier|Press & supportrar/);
r("deskNavigate('press')");assert.equal(r('state.page'),'home');assert.ok(r('overviewUI.press'));assert.match(r('homeView()'),/stories-page/);assert.match(r('homeView()'),/press-page/);
r("deskNavigate('staffReview')");assert.doesNotMatch(r('staffReviewView()'),/Förstärkningar & löften|Träning & taktik/);assert.match(r('staffReviewView()'),/3 spelklara av 3/);
r("state.live=null;ensureLines();ensureSpecialTeams();globalThis.drop=(id,source)=>({preventDefault(){},dataTransfer:{getData:type=>type==='text/plain'?String(id):source?JSON.stringify(source):''}});");
assert.equal((r('lineupFourBoards()').match(/data-board="line[0-3]"/g)||[]).length,4);assert.equal((r('specialFourBoards()').match(/data-board="(?:pp|pk)[12]"/g)||[]).length,1);
r("globalThis.before=state.lines.forwards.slice();lineupDrop(drop(before[0]),'forwards',9)");assert.equal(r('state.lines.forwards[9]'),r('before[0]'));assert.equal(r('state.lines.forwards[0]'),r('before[9]'));
r("globalThis.reserve=depthSelection().extras[0];globalThis.main=state.lines.forwards[0];lineupBenchSwap(drop(main),reserve)");assert.equal(r('state.lines.forwards[0]'),r('reserve'));assert.ok(r('depthSelection().extras.some(id=>samePlayerId(id,main))'));
r("globalThis.a=state.specialTeams.pp1[0];globalThis.b=state.specialTeams.pp2[0];specialDrop(drop(a,{key:'pp1',index:0,id:a}),'pp2',0)");assert.equal(r('state.specialTeams.pp2[0]'),r('a'));assert.equal(r('state.specialTeams.pp1[0]'),r('b'));
r("globalThis.a=state.specialTeams.pp1[0];specialDrop(drop(a,{key:'pp1',index:0,id:a}),'pk1',0)");assert.equal(r('state.specialTeams.pk1[0]'),r('a'));assert.ok(r('Object.values(state.specialTeams).every(ids=>new Set(ids.map(String)).size===ids.length)'));
r("globalThis.before=JSON.stringify(state.specialTeams);specialDrop(drop(state.lines.goalie),'pp1',0);specialDrop(drop(a,{key:'pp1',index:0,id:'stale'}),'pp2',0);specialDrop(drop(a),'bad',0)");assert.equal(r('JSON.stringify(state.specialTeams)'),r('before'));
assert.doesNotThrow(()=>r('validateSaveText(saveExportText())'));
console.log('PASS: shift-based role expectations, rotation/exemptions, genuine under-use/recovery, role-promise migration, durable numeric ratings, integrated overview and guarded four-rink swaps.');
