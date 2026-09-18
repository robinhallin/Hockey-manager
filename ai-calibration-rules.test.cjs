'use strict';
const assert=require('node:assert/strict');
const hockey=require('./match-simulation.js');
const a=n=>({shooting:n,puckControl:n,composure:n,reflexes:n,positioning:n,movement:n});
assert.equal(hockey.shootoutChance(a(10),a(10)),.30);
assert.ok(hockey.shootoutChance(a(16),a(10))>hockey.shootoutChance(a(6),a(10)));
assert.ok(hockey.shootoutChance(a(10),a(16))<hockey.shootoutChance(a(10),a(6)));
const team=n=>({shooters:Array.from({length:8},(_,i)=>({id:i,name:'P'+i,attributes:a(n)})),keeper:a(n)});
const rng=seed=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
let wins=0,strongWins=0;
for(let i=1;i<=2000;i++){
 const result=hockey.resolveShootout([team(10),team(10)],rng(i*8311));wins+=result.winner===0;
 assert.notEqual(result.score[0],result.score[1]);
 for(const side of [0,1])assert.equal(result.attempts.filter(s=>s.side===side&&s.goal).length,result.score[side]);
 strongWins+=hockey.resolveShootout([team(16),team(6)],rng(i*8311)).winner===0;
}
assert.ok(wins>900&&wins<1100,'equal teams have no manager/home shootout bonus');
assert.ok(strongWins>1500,'shooters and keepers must influence the contest');
assert.deepEqual(hockey.resolveShootout([team(10),team(10)],rng(123)),hockey.resolveShootout([team(10),team(10)],rng(123)));
assert.ok(hockey.resolveShootout([team(10),team(10)],()=>0).attempts.length<=212,'pathological RNG must terminate');
const r=require('./scripts/headless-career.cjs').headlessCareer().run;
assert.equal(r('AI_CALIBRATION.trainingFixtures.length'),174);
assert.ok(r("MatchWorld2.backgroundAttemptRate({pp:true,creation:18,resistance:4,plan:{style:'counter',shotChoice:'shoot'}})>1"),'PP is not capped at one attempt per tick');
assert.equal(r('MatchWorld2.backgroundAttemptCount(1.4,()=>.3)'),2);
assert.equal(r('MatchWorld2.backgroundAttemptCount(1.4,()=>.5)'),1);
assert.equal(r('MatchWorld2.backgroundAttemptCount(NaN,()=>0)'),0);
assert.equal(r('MatchWorld2.backgroundAttemptCount(0,()=>0)'),0);
r("startCareerWithClub('HV71');globalThis.initial=JSON.stringify(state);globalThis.so=0;globalThis.ot=0;globalThis.playoff=0;");
for(let i=0;i<90;i++){
 r(`state=JSON.parse(initial);globalThis.g={...state.schedule[${i%60}],round:${i+700}};if(${i>=60})g.seriesId='calibration-playoff';globalThis.result=rivalSimulate(g);if(result.shootout)so++;if(result.overtime)ot++;if(g.seriesId&&result.overtime)playoff++;`);
 assert.ok(r('result.homeGoals!==result.awayGoals'));
 assert.equal(r('result.eventStream.events.some(e=>e.type===\'shot\'&&e.forced)'),false,'no fabricated playoff goal');
 assert.equal(r('result.eventStream.events.filter(e=>e.type===\'shot\'&&e.seconds>3600&&e.outcome===\'goal\').length<=1'),true,'sudden death ends immediately');
 assert.equal(r('!g.seriesId||!result.shootout'),true);
 assert.equal(r("(()=>{const events=result.eventStream.events,decisive=events.findIndex(e=>e.type==='shot'&&e.seconds>3600&&e.outcome==='goal');return decisive<0||decisive===events.length-1;})()"),true,'nothing happens after the winning overtime goal');
 assert.equal(r('result.rows.reduce((n,p)=>n+p.goals,0)+(result.shootout?1:0)===result.homeGoals+result.awayGoals'),true,'shootout decider stays outside skater totals');
 assert.equal(r('result.reports.every((p,side)=>p.attempts===result.eventSummary.attempts[side]&&p.shots===result.eventSummary.shots[side])'),true);
}
assert.ok(r('so>0&&ot>0&&playoff>0'),'cohort must exercise shootouts and both overtime formats');
console.log('PASS: calibration rates, symmetric skill-based shootouts, seeded replay, bounded resolver, native ledgers and sudden-death termination.',{equalTeamWins:wins,strongTeamWins:strongWins,cohort:JSON.parse(r('JSON.stringify({so,ot,playoff})'))});
// Old non-spatial matches must restore goalkeepers for the shootout, even if
// a keeper was pulled at the end of regulation. No ordinary stats are invented.
r("startCareerWithClub('HV71');state.calendar.date=calendarTarget();createMatch();state.live.period=4;state.live.minute=5;state.live.goaliePulled=true;globalThis.shootoutBase=StudioHockey.resolveShootout;globalThis.shootoutKeepers=null;StudioHockey.resolveShootout=(teams,rand)=>{shootoutKeepers=teams.map(t=>Boolean(t.keeper));return shootoutBase(teams,rand);};finishMatch=()=>{state.live.finished=true;};shootout();");
assert.equal(r('JSON.stringify(shootoutKeepers)'),'[true,true]');
assert.equal(r('state.live.analysisShootout'),true);
assert.equal(r('state.live.analysis.shots.length'),0);
console.log('PASS: legacy shootout restores both keepers without adding regulation shots.');
