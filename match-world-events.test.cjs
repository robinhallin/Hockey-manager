const assert=require('node:assert/strict');
const {boot}=require('./scripts/career-test-fixture.cjs');
const app=boot(),{run}=app;

assert.equal(run('MatchEventStream.VERSION'),1);

const pure=run(`(()=>{
 const s=MatchEventStream.create({source:'test'});
 MatchEventStream.emit(s,'pp-start',{side:0,seconds:10});
 MatchEventStream.emit(s,'shot',{side:0,seconds:20,playerId:'10',player:'Skytten',outcome:'save'});
 MatchEventStream.emit(s,'shot',{side:0,seconds:30,playerId:'10',player:'Skytten',outcome:'goal',powerPlay:true,assists:[{id:'11',name:'Passaren'}]});
 MatchEventStream.emit(s,'penalty',{side:1,seconds:40,playerId:'20',player:'Utvisad',minutes:2});
 MatchEventStream.addIce(s,0,'10',51.2);
 return MatchEventStream.summary(s);
})()`);
assert.deepEqual(Array.from(pure.score),[1,0]);
assert.deepEqual(Array.from(pure.shots),[2,0]);
assert.deepEqual(Array.from(pure.attempts),[2,0]);
assert.deepEqual(Array.from(pure.saves),[0,1]);
assert.deepEqual(Array.from(pure.pp),[1,0]);
assert.deepEqual(Array.from(pure.ppGoals),[1,0]);
assert.equal(pure.players['0:10'].goals,1);
assert.equal(pure.players['0:11'].assists,1);
assert.equal(pure.players['1:20'].pim,2);
assert.equal(pure.ice['0:10'],51.2);

run('beginCareerSelection();chooseCareerClub("HV71");careerReview();acceptCareer()');
run('(state.calendar.date=state.season.year+"-09-07",launchSeason())');
run('(state.calendar.date=calendarTarget(),createMatch())');
assert.ok(run('Boolean(studioEngine())'));
assert.equal(run('state.live.eventStream.version'),1);
assert.equal(run('state.live.matchEventSummary.score[0]'),0);

run('state.live.running=true');
run('for(let i=0;i<25;i++)studioStep()');
assert.ok(run('Object.values(state.live.eventStream.ice).some(v=>v>0)'));
assert.ok(run('state.live.matchEventSummary.events>=0'));

const penalty=run(`(()=>{
 const e=studioEngine(),a=e.skaters(1)[0];
 e.givePenalty(1,a.player.name,'tripping');
 const types=state.live.eventStream.events.slice(-3).map(x=>x.type);
 return {types,pp:state.live.matchEventSummary.pp[0],pim:state.live.matchEventSummary.players['1:'+a.player.id]?.pim||0};
})()`);
assert.ok(penalty.types.includes('penalty'));
assert.ok(penalty.types.includes('pp-start'));
assert.ok(penalty.pp>=1);
assert.equal(penalty.pim,2);

const background=run(`(()=>{
 const game=state.schedule.find(g=>g.home!==managerClub()&&g.away!==managerClub()&&!g.played)||{home:'Färjestad BK',away:'Luleå HF',round:999};
 const r=rivalSimulate({...game});
 return {version:r.eventStreamVersion,summary:r.eventSummary,reports:r.reports.map(x=>({club:x.club,shots:x.shots,pp:x.pp,ppGoals:x.ppGoals,event:x.eventSummary})),goals:[r.homeGoals,r.awayGoals]};
})()`);
assert.equal(background.version,1);
assert.deepEqual(Array.from(background.summary.score),Array.from(background.goals));
for(let side=0;side<2;side++){
 assert.equal(background.reports[side].shots,background.summary.shots[side]);
 assert.equal(background.reports[side].pp,background.summary.pp[side]);
 assert.equal(background.reports[side].ppGoals,background.summary.ppGoals[side]);
 assert.equal(background.reports[side].event.shots,background.summary.shots[side]);
}

console.log('PASS: MatchWorld event stream is authoritative for live counters, penalties/PP, ice ledger and background reports.');
