const assert=require('node:assert/strict');
const {boot}=require('./scripts/career-test-fixture.cjs');

const app=boot(),{run}=app;

assert.equal(run('MatchWorld2.version'),2);

// Background fixtures must call the shared initiative model with the same numbers.
const initiative=run(`(()=>{
 const home={passing:14,puckControl:13,vision:12,decisions:13,checking:12,strength:12,workRate:13};
 const away={passing:11,puckControl:11,vision:10,decisions:10,checking:10,strength:10,workRate:10};
 const hp={forecheck:'aggressive'},ap={forecheck:'balanced'};
 return [rivalInitiativeChance(home,away,hp,ap,5,5),MatchWorld2.initiativeChance(home,away,hp,ap,5,5)];
})()`);
assert.equal(initiative[0],initiative[1]);
assert.ok(initiative[0]>.5);

// The shared model must react to control quality and manpower in the expected direction.
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

// Background chance context is no longer a separate formula. Serialize inside
// the VM so realm-specific Object prototypes cannot affect the assertion.
const contexts=run(`(()=>{
 const args={creation:13,resistance:11,shooterPosition:'F',pp:true,plan:{style:'counter'},opposition:{forecheck:'aggressive'}};
 const make=()=>{let i=0;const seq=[.21,.61,.33,.47,.72];return ()=>seq[i++%seq.length];};
 return [JSON.stringify(rivalShotContext(args,make())),JSON.stringify(MatchWorld2.backgroundShotContext(args,make()))];
})()`);
assert.equal(contexts[0],contexts[1]);

// A real career broadcast must expose the same world profile and use it in decisions.
run('beginCareerSelection();chooseCareerClub("HV71");careerReview();acceptCareer()');
run('(state.calendar.date=state.season.year+"-09-07",launchSeason())');
run('(state.calendar.date=calendarTarget(),createMatch())');
assert.ok(run('Boolean(studioEngine())'));
run('studioSyncPlans(studioEngine())');
assert.equal(run('studioEngine().worldModel.version'),2);
assert.equal(run('studioEngine().worldModel.profiles.length'),2);
assert.ok(run('studioEngine().worldModel.initiative.every(n=>n>=.25&&n<=.75)'));
assert.ok(run(`(()=>{
 const e=studioEngine(),a=e.skaters(e.owner)[0]||e.skaters(0)[0];
 if(!a)return false;
 const rows=e.actionOptions(a);
 return rows.length>0&&rows.every(r=>Number.isFinite(r.worldInitiative))&&rows.some(r=>Number.isFinite(r.worldBias));
})()`));

console.log('PASS: MatchWorld 2 shares initiative and background chance context while live decisions consume the same world profile.');
