const assert=require('node:assert/strict');
const {boot}=require('./scripts/career-test-fixture.cjs');

const app=boot(),{run}=app;
assert.equal(run('MatchEventLedger.VERSION'),1);

const pure=run(`(()=>{
 const m={period:1};MatchEventLedger.ensure(m,{reset:true});
 MatchEventLedger.append(m,{type:'shot',time:10,period:1,side:'own',playerId:'1',player:'A',outcome:'save',quality:.05,powerPlay:false});
 MatchEventLedger.append(m,{type:'shot',time:20,period:1,side:'own',playerId:'2',player:'B',outcome:'goal',quality:.2,powerPlay:true,assists:[{id:'1',name:'A'}]});
 MatchEventLedger.append(m,{type:'shot',time:30,period:1,side:'opponent',playerId:'3',player:'C',outcome:'block',quality:.03,powerPlay:false});
 MatchEventLedger.append(m,{type:'penalty',time:35,period:1,side:'opponent',playerId:'3',player:'C',minutes:2});
 return {summary:MatchEventLedger.summary(m),full:MatchEventLedger.presentation(m,'full').map(e=>e.id),extended:MatchEventLedger.presentation(m,'extended').map(e=>e.id),highlights:MatchEventLedger.presentation(m,'highlights').map(e=>e.id),valid:MatchEventLedger.validate(m)};
})()`);
assert.equal(pure.valid,true);
assert.deepEqual(Array.from(pure.summary.goals),[1,0]);
assert.deepEqual(Array.from(pure.summary.shots),[2,0]);
assert.deepEqual(Array.from(pure.summary.saves),[0,1]);
assert.deepEqual(Array.from(pure.summary.blocks),[0,1]);
assert.deepEqual(Array.from(pure.summary.danger),[1,0]);
assert.deepEqual(Array.from(pure.summary.ppGoals),[1,0]);
assert.equal(pure.full.length,4);
assert.ok(pure.extended.length<pure.full.length);
assert.ok(pure.highlights.length<=pure.extended.length);
assert.ok(pure.highlights.every(id=>pure.full.includes(id)));

const background=run(`(()=>{
 const game={home:'A',away:'B'};
 const result={homeGoals:3,awayGoals:2,duration:3700,overtime:true,shootout:false,reports:[{club:'A',shots:31,pp:4,ppGoals:1},{club:'B',shots:27,pp:3,ppGoals:0}]};
 const ledger=MatchEventLedger.aggregateBackground(result,game);
 return {source:ledger.source,aggregate:ledger.aggregate,summary:MatchEventLedger.summary(ledger),event:ledger.events[0],valid:MatchEventLedger.validate({eventLedger:ledger})};
})()`);
assert.equal(background.source,'background');
assert.deepEqual(Array.from(background.aggregate.goals),[3,2]);
assert.deepEqual(Array.from(background.aggregate.shots),[31,27]);
assert.deepEqual(Array.from(background.aggregate.pp),[4,3]);
assert.deepEqual(Array.from(background.aggregate.ppGoals),[1,0]);
assert.deepEqual(Array.from(background.summary.goals),[3,2]);
assert.deepEqual(Array.from(background.summary.shots),[31,27]);
assert.deepEqual(Array.from(background.summary.pp),[4,3]);
assert.deepEqual(Array.from(background.summary.ppGoals),[1,0]);
assert.equal(background.summary.aggregate,true);
assert.equal(background.event.type,'final');
assert.equal(background.valid,true);

run('beginCareerSelection();chooseCareerClub("HV71");careerReview();acceptCareer()');
run('(state.calendar.date=state.season.year+"-09-07",launchSeason())');
run('(state.calendar.date=calendarTarget(),createMatch())');
assert.equal(run('state.live.eventLedger.version'),1);
assert.equal(run('state.live.eventLedger.source'),'studio');
assert.equal(run('state.live.eventLedger.events.length'),0);

// A real penalty from the live spatial engine must land in the same ledger.
const penalty=run(`(()=>{
 const e=studioEngine(),offender=e.skaters(1)[0];
 e.givePenalty(1,offender.player.name,'tripping');
 return state.live.eventLedger.events.at(-1);
})()`);
assert.equal(penalty.type,'penalty');
assert.equal(penalty.side,'opponent');
assert.equal(penalty.kind,'tripping');

// The live statistics projection reads the ledger, not a separately rolled result.
const projected=run(`(()=>{
 const m=state.live,e=studioEngine();
 MatchEventLedger.shot(m,e,{side:0,playerId:'0:test',player:'Testare',outcome:'save',quality:.04,x:50,y:15,assists:[]},[]);
 MatchEventLedger.shot(m,e,{side:0,playerId:'0:test',player:'Testare',outcome:'goal',quality:.15,x:54,y:15,assists:[]},[]);
 MatchEventLedger.shot(m,e,{side:1,playerId:'1:test',player:'Motståndare',outcome:'save',quality:.03,x:6,y:15,assists:[]},[]);
 return {stats:matchStats(),summary:matchEventSummary(),full:matchPresentationEvents('full').length,highlights:matchPresentationEvents('highlights').length};
})()`);
assert.deepEqual(Array.from(projected.stats.shots),[2,1]);
assert.deepEqual(Array.from(projected.stats.saves),[1,1]);
assert.deepEqual(Array.from(projected.summary.goals),[1,0]);
assert.ok(projected.highlights<projected.full);

// Fast presentation modes are filters only: switching view cannot add, remove or reroll events.
const stable=run(`(()=>{
 const before=JSON.stringify(state.live.eventLedger.events),ids={};
 for(const mode of ['full','extended','highlights'])ids[mode]=matchPresentationEvents(mode).map(e=>e.id);
 return {before,after:JSON.stringify(state.live.eventLedger.events),ids};
})()`);
assert.equal(stable.before,stable.after);
assert.ok(stable.ids.highlights.every(id=>stable.ids.full.includes(id)));
assert.ok(stable.ids.extended.every(id=>stable.ids.full.includes(id)));

assert.equal(run('MatchEventLedger.validate(state.live)'),true);
console.log('PASS: MatchWorld 2 Etapp D uses one event ledger for live statistics, presentation modes and background result aggregates.');
