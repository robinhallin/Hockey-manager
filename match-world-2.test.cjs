const assert=require('node:assert/strict');
const {boot}=require('./scripts/career-test-fixture.cjs');

const app=boot(),{run}=app;

assert.equal(run('MatchWorld2.version'),2);
assert.equal(run('MatchWorld2.decisionVersion'),1);
assert.equal(run('MatchWorld2.specialTeamsVersion'),1);

const initiative=run(`(()=>{
 const home={passing:14,puckControl:13,vision:12,decisions:13,checking:12,strength:12,workRate:13};
 const away={passing:11,puckControl:11,vision:10,decisions:10,checking:10,strength:10,workRate:10};
 const hp={forecheck:'aggressive'},ap={forecheck:'balanced'};
 return [rivalInitiativeChance(home,away,hp,ap,5,5),MatchWorld2.initiativeChance(home,away,hp,ap,5,5)];
})()`);
assert.equal(initiative[0],initiative[1]);
assert.ok(initiative[0]>.5);

assert.ok(run(`MatchWorld2.initiativeChance(
 {passing:17,puckControl:17,vision:16,decisions:16,checking:12,strength:12,workRate:12},
 {passing:9,puckControl:9,vision:9,decisions:9,checking:12,strength:12,workRate:12},
 {forecheck:'balanced'},{forecheck:'balanced'},5,5
)`)>.5);
assert.ok(run(`MatchWorld2.initiativeChance(
 {passing:12,puckControl:12,vision:12,decisions:12,checking:12,strength:12,workRate:12},
 {passing:12,puckControl:12,vision:12,decisions:12,checking:12,strength:12,workRate:12},
 {forecheck:'balanced'},{forecheck:'balanced'},4,5
)`)<.5);

const decisionChecks=run(`(()=>{
 const sniper=MatchWorld2.decisionValues({shooting:18,passing:10,puckControl:12,vision:10,decisions:16,skating:13,strength:11},{style:'attacking'},{distance:7,pressure:.18,progress:49});
 const passer=MatchWorld2.decisionValues({shooting:9,passing:18,puckControl:15,vision:18,decisions:17,skating:14,strength:10},{style:'balanced'},{distance:15,pressure:.45,progress:42});
 const trapped=MatchWorld2.decisionValues({shooting:11,passing:11,puckControl:8,vision:9,decisions:12,skating:10,strength:13},{style:'defensive',forecheck:'balanced'},{distance:40,pressure:.9,progress:10,shortHanded:true});
 return {sniper,passer,trapped};
})()`);
assert.ok(decisionChecks.sniper.shoot>decisionChecks.sniper.pass);
assert.ok(decisionChecks.passer.pass>decisionChecks.passer.shoot);
assert.ok(decisionChecks.trapped.clear>decisionChecks.trapped.carry);
assert.ok(decisionChecks.trapped.clear>0);

const special=run(`(()=>{
 const fresh=MatchWorld2.shiftTarget({base:45,energy:92,tempo:'normal',forecheck:'balanced'});
 const tired=MatchWorld2.shiftTarget({base:45,energy:48,tempo:'high',forecheck:'aggressive'});
 const pk=MatchWorld2.shiftTarget({base:45,energy:72,tempo:'normal',forecheck:'balanced',shortHanded:true});
 const pp=MatchWorld2.shiftTarget({base:45,energy:90,tempo:'normal',forecheck:'balanced',powerPlay:true});
 const edge=MatchWorld2.specialTeamsEdge(
  {passing:17,vision:17,puckControl:16,decisions:16,shooting:15,workRate:13,positioning:13,discipline:13,skating:14},
  {positioning:11,discipline:11,decisions:11,workRate:11,skating:11},'131','box',{attEnergy:88,defEnergy:72,skaterDiff:1});
 const ppUnit=MatchWorld2.specialUnitScore({passing:18,vision:18,shooting:17,puckControl:17,decisions:16},'C','pp');
 const pkUnit=MatchWorld2.specialUnitScore({positioning:17,decisions:17,workRate:18,discipline:18},'C','pk');
 return {fresh,tired,pk,pp,edge,ppUnit,pkUnit};
})()`);
assert.ok(special.tired<special.fresh);
assert.ok(special.pk<special.fresh);
assert.ok(special.pp>=special.fresh);
assert.ok(special.edge>0);
assert.ok(special.ppUnit>15);
assert.ok(special.pkUnit>15);

// Background chance building consumes the shared decision and special-team
// model while retaining the legacy shot-context shape.
const background=run(`(()=>{
 const args={creation:13,resistance:11,shooterPosition:'F',pp:true,plan:{style:'counter',pp:'131'},opposition:{forecheck:'aggressive',pk:'box'}};
 const decision=MatchWorld2.backgroundDecisionProfile(args);
 const make=()=>{let i=0;const seq=[.21,.61,.33,.47,.72];return ()=>seq[i++%seq.length];};
 const context=MatchWorld2.backgroundShotContext(args,make());
 const rival=rivalShotContext(args,make());
 return {decision,context,rival,keys:Object.keys(context).sort()};
})()`);
assert.equal(JSON.stringify(background.context),JSON.stringify(background.rival));
assert.deepEqual(Array.from(background.keys),['angle','behind','d','lateralSpeed','oneTimer','pressure','rebound','screen']);
assert.ok(Object.values(background.decision).some(v=>Math.abs(v)>0));

run('beginCareerSelection();chooseCareerClub("HV71");careerReview();acceptCareer()');
run('(state.calendar.date=state.season.year+"-09-07",launchSeason())');
run('(state.calendar.date=calendarTarget(),createMatch())');
assert.ok(run('Boolean(studioEngine())'));
run('studioSyncPlans(studioEngine())');
assert.equal(run('studioEngine().worldModel.version'),2);
assert.equal(run('studioEngine().worldModel.decisionVersion'),1);
assert.equal(run('studioEngine().worldModel.specialTeamsVersion'),1);
assert.equal(run('studioEngine().worldModel.profiles.length'),2);
assert.ok(run('studioEngine().worldModel.initiative.every(n=>n>=.25&&n<=.75)'));
assert.ok(run('studioEngine().worldModel.shiftTargets.every(n=>n>=24&&n<=58)'));
assert.ok(run('studioEngine().teams.every(t=>t.worldShiftVersion===1&&t.worldShiftTarget===t.shiftLimit)'));
assert.ok(run(`(()=>{
 const e=studioEngine(),a=e.skaters(e.owner)[0]||e.skaters(0)[0];
 if(!a)return false;
 const rows=e.actionOptions(a);
 return rows.length>0&&rows.every(r=>Number.isFinite(r.worldInitiative)&&Number.isFinite(r.worldDecisionBias)&&Number.isFinite(r.worldSpecialBias)&&r.worldDecisionVersion===1&&r.worldSpecialTeamsVersion===1)&&rows.some(r=>Math.abs(r.worldDecisionBias)>0);
})()`));

// Force a real powerplay. The spatial engine still owns legal actions, but the
// options it exposes must now receive MatchWorld special-team valuation.
const livePP=run(`(()=>{
 const e=studioEngine(),offender=e.skaters(1)[0];if(!offender)return null;
 e.givePenalty(1,offender.player.name,'tripping');studioSyncPlans(e);
 const a=e.skaters(0)[0],rows=a?e.actionOptions(a):[];
 return {pp:e.hasPowerPlay(0),special:e.worldModel.specialTeamsVersion,shift:e.teams[0].shiftLimit,biases:rows.map(r=>[r.kind,r.worldSpecialBias,r.worldSpecialTeamsVersion])};
})()`);
assert.ok(livePP&&livePP.pp);
assert.equal(livePP.special,1);
assert.ok(livePP.shift>=24&&livePP.shift<=58);
assert.ok(livePP.biases.length>0);
assert.ok(livePP.biases.every(r=>Number.isFinite(r[1])&&r[2]===1));
assert.ok(livePP.biases.some(r=>Math.abs(r[1])>0));

console.log('PASS: MatchWorld 2 shares initiative, decisions, special-team valuation and fatigue-aware shift policy across background and live hockey.');
