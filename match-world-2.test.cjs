const assert=require('node:assert/strict');
const {boot}=require('./scripts/career-test-fixture.cjs');

const app=boot(),{run}=app;

assert.equal(run('MatchWorld2.version'),2);
assert.equal(run('MatchWorld2.decisionVersion'),1);

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

// Background chance building must consume the shared decision profile while
// retaining the legacy shot-context shape.
const background=run(`(()=>{
 const args={creation:13,resistance:11,shooterPosition:'F',pp:true,plan:{style:'counter'},opposition:{forecheck:'aggressive'}};
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
assert.equal(run('studioEngine().worldModel.profiles.length'),2);
assert.ok(run('studioEngine().worldModel.initiative.every(n=>n>=.25&&n<=.75)'));
assert.ok(run(`(()=>{
 const e=studioEngine(),a=e.skaters(e.owner)[0]||e.skaters(0)[0];
 if(!a)return false;
 const rows=e.actionOptions(a);
 return rows.length>0&&rows.every(r=>Number.isFinite(r.worldInitiative)&&Number.isFinite(r.worldDecisionBias)&&r.worldDecisionVersion===1)&&rows.some(r=>Math.abs(r.worldDecisionBias)>0);
})()`));

console.log('PASS: MatchWorld 2 shares initiative, chance building and context-aware player decision valuation across background and live hockey.');
