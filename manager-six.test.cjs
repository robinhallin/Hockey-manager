const assert=require('node:assert/strict');
const {boot}=require('./scripts/career-test-fixture.cjs');
const a=boot(),r=a.run;
r(`startCareerWithClub('HV71');state.calendar.date=calendarTarget();startMatch();studioStep();medicalRoll=()=>.999;globalThis.e=studioEngine();`);
r(`e.givePenalty(1,e.skaters(1)[0].player.name,'tripping');e.tickPenalties(15);e.givePenalty(1,e.skaters(1)[0].player.name,'slashing');`);
assert.equal(r('e.skaters(0).length'),5);assert.equal(r('e.skaters(1).length'),3);
assert.equal(r('e.penalties[0].remaining'),105);assert.equal(r('e.penalties[1].remaining'),120);
assert.equal(r('e.actors.some(a=>e.penalties.some(p=>samePlayerId(p.playerId,a.player.id)))'),false);
r('save()');const b=boot(a.storage.value);
assert.equal(b.run('studioEngine().penalties.length'),2);
assert.equal(b.run('studioEngine().penalties[0].remaining'),105);
r('e.goalPenalty(0)');assert.equal(r('e.penalties.length'),1);assert.equal(r('e.penalty.remaining'),120);
assert.equal(r('e.skaters(1).length'),4);
r(`e.givePenalty(0,e.skaters(0)[0].player.name,'fasthållning');`);
assert.equal(r('e.skaters(0).length'),4);assert.equal(r('e.skaters(1).length'),4);
assert.equal(r('specialUnitOnIce()'),null,'equal-strength substitutions use regular formations');
assert.equal(r('e.skaters(0).filter(a=>a.role.endsWith("D")).length'),2);
r('e.goalPenalty(0)');assert.equal(r('e.penalties.length'),2,'equal-strength goal does not release a penalty');
r('globalThis.ppBefore=state.live.ppHV;e.penalties.find(p=>p.side===0).remaining=5;e.tickPenalties(5)');
assert.equal(r('state.live.ppHV'),r('ppBefore+1'),'powerplay starting after four-on-four is counted');
r('e.tickPenalties(120)');assert.equal(r('e.penalties.length'),0);
r(`e.givePenalty(1,e.skaters(1)[0].player.name);e.givePenalty(1,e.skaters(1)[0].player.name);e.givePenalty(1,e.skaters(1)[0].player.name);e.tickPenalties(20);`);
assert.equal(r('e.penalties[2].remaining'),120,'third clock waits');
r('e.endPenalty()');assert.equal(r('e.skaters(1).length'),3,'queued penalty keeps team at three');
r('e.tickPenalties(10)');assert.equal(r('e.penalties[1].remaining'),110);
r('while(e.penalties.length)e.endPenalty(true);e.threeOnThree=true;e.givePenalty(1,e.skaters(1)[0].player.name);e.givePenalty(1,e.skaters(1)[0].player.name);');
assert.equal(r('e.skaters(0).length'),5);assert.equal(r('e.skaters(1).length'),3);
r('e.endPenalty();e.endPenalty();');assert.equal(r('e.skaters(0).length'),5);assert.equal(r('e.skaters(1).length'),5);
r('e.stop("stoppage","Test");e.changeAtStoppage();');assert.equal(r('e.skaters(0).length'),3);
// Migrate a serialized single penalty from the previous engine version.
r(`e.givePenalty(1,e.skaters(1)[0].player.name);delete e.penalties;save();`);
const legacy=boot(a.storage.value);assert.equal(legacy.run('studioEngine().penaltyList().length'),1);
// Read-only panels keep the clock live; coach actions and configured events stop it.
r(`state.live.running=true;matchTab('stats');`);assert.equal(r('state.live.running'),true);
assert.ok(r('matchCoachView()').includes('Alla skottförsök'));
r(`matchTab('tactics')`);assert.equal(r('state.live.running'),false);
r(`setMatchPreference('goal',true);state.live.running=true;addEvent('Testmål','goal');matchApplyAutoPause();`);
assert.equal(r('state.live.running'),false);assert.match(r('state.live.pauseReason'),/mål/);
r(`setMatchPreference('period',false);matchPeriodPause()`);assert.equal(r('state.live.running'),true);
r(`setMatchPreference('stats',true);matchTab('stats')`);assert.equal(r('state.live.running'),false);
// Availability, future arrivals and tactics affect advice without signing anyone.
r(`state.live=null;globalThis.before=recruitmentNeeds();managerRoster().forEach(p=>{p.health.injury={remaining:45};p.health.clearance='rest';});globalThis.after=recruitmentNeeds();`);
assert.ok(r('after.reduce((n,x)=>n+x.need,0)>before.reduce((n,x)=>n+x.need,0)'));
assert.equal(r('after.every(x=>x.count===0)'),true);
r(`state.tacticalPlan.forecheck='aggressive'`);assert.equal(r('recruitmentNeeds().find(x=>x.name==="Checkingforward").target'),4);
// Detailed reports are bounded, compact results and league seasons survive.
r(`state.analysis.matches=Array.from({length:90},(_,i)=>({id:'history-'+i,year:2026,club:'HV71',opponent:'Test',own:2,against:1,finished:true,shots:[],events:[],players:[],units:[]}));trimAnalysisArchive();`);
assert.equal(r('state.analysis.matches.length'),80);assert.equal(r('Object.keys(state.analysis.history).length'),90);
r('trimAnalysisArchive()');assert.equal(r('Object.keys(state.analysis.history).length'),90,'idempotent archive');
r(`for(let i=0;i<5;i++){state.season.year++;ensureLeagueStatistics();}`);assert.equal(r('state.leagueStatistics.archives.length'),5);
// Different exposure times yield equal rates; old reports must not invent denominators.
r(`globalThis.sample={strengthSeconds:{even:1800,pp:120,pk:60,ot:0},shots:[{situation:'even',side:'opponent',dangerous:true}],events:[]};`);
assert.equal(r('analysisStrengthSummary(sample,"defense").even.seconds'),1800);
assert.equal(r('analysisStrengthSummary({...sample,strengthPartial:true},"defense")'),null);
// Browsing does not run normalization or write immediately; one flush persists UI state.
r(`globalThis.calls=0;globalThis.originalSave=save;save=(options)=>{calls++;return originalSave(options);};deskNavigate('home');deskNavigate('squad');deskNavigate('transfers','needs');`);
assert.equal(r('calls'),0);r('flushInterfaceSave()');assert.equal(r('calls'),1);
assert.equal(JSON.parse(a.storage.value).page,'transfers');
console.log('PASS: multiple and queued penalties, overtime, migration, pause preferences, recruitment, permanent history, exposure and coalesced navigation saving.');
