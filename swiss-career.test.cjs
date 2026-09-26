'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {boot}=require('./scripts/career-test-fixture.cjs');
function start(){const a=boot(null,{production:true});a.run("startCareerWithClub('EHC Kloten')");return a;}
test('Swiss onboarding is opt-in, complete enough to field each club and survives export/reload',()=>{
 require('node:child_process').execFileSync(process.execPath,['scripts/build-swiss-data.cjs','--check']);
 const a=start(),r=a.run;
 assert.ok(!/undefined|NaN/.test(r('leagueStatisticsView()')));
 assert.equal(r('state.teams.length'),14);assert.equal(r('state.schedule.length'),364);
 assert.equal(r('state.calendar.date'),'2026-08-01');assert.equal(r('state.calendar.friendlies.length'),5);
 assert.ok(r("SWISS_DATABASE.clubs.every(c=>{const ps=state.clubRosters[c.name];return ps.filter(p=>p.pos==='MV').length>=2&&ps.filter(p=>p.pos==='B').length>=6&&ps.filter(p=>p.pos==='F').length>=12;})"));
 assert.equal(r("Object.values(state.clubRosters).flat().some(p=>p.id==='nationalleague:345020')"),false);
 assert.equal(r("managerRoster().find(p=>p.name==='Reto Berra').club"),'EHC Kloten');
 assert.ok(r('Object.values(state.clubRosters).flat().some(p=>p.nationality===null)'));
 assert.ok(r("state.schedule.every(g=>g.date===swissRoundDate(g.round,2026))"));
 assert.equal(r('state.schedule[0].date'),'2026-09-15');assert.equal(r('state.schedule.at(-1).date'),'2027-03-01');
 r('save()');assert.doesNotThrow(()=>r('validateSaveText(saveExportText())'));
 const b=boot(a.storage.value,{production:true});assert.equal(b.run('JSON.stringify(state.schedule)'),r('JSON.stringify(state.schedule)'));
 assert.equal(b.run('JSON.stringify(state.world)'),r('JSON.stringify(state.world)'));
 r("careerDraft=null;startCareerWithClub('HV71')");assert.equal(r('state.teams.length'),28);assert.equal(r('state.schedule.length'),728);
});
test('two-legged play-in accepts draws, aggregate victory and second chance before best-of-seven',()=>{
 const {run:r}=start();r("state.season.phase='regular';state.schedule.forEach(g=>{g.played=true;g.homeGoals=2;g.awayGoals=1});state.round=53;enterPlayoffs()");
 assert.equal(r('state.season.series.length'),2);
 assert.ok(r('state.season.series.every(s=>s.aggregate&&s.bestOf===2)'));
 r('globalThis.g=state.schedule.find(g=>g.seriesId);globalThis.s=aggregateSeries(g)');
 assert.equal(r('g.home===s.high'),true);
 assert.equal(r('aggregateNeedsOvertime(g,0,0)'),false);
 assert.equal(r('recordSeriesGame(g,4,1)'),true);
 assert.equal(r('recordSeriesGame(g,4,1)'),false);
 r('state.round++;schedulePlayoffDay();g=state.schedule.find(g=>g.seriesId===s.id&&!g.played)');
 assert.equal(r('g.home===s.low'),true);
 assert.equal(r('aggregateNeedsOvertime(g,3,0)'),true);
 assert.equal(r('recordSeriesGame(g,3,0)'),false);
 assert.equal(r('recordSeriesGame(g,2,0)'),true);assert.equal(r('s.winner===s.high'),true);
 // The second game can be won by the eliminated team. Goals, not game wins, decide.
 r("globalThis.other=state.season.series[1];for(let i=0;i<2;i++){const x={seriesId:other.id,home:i?other.low:other.high,away:i?other.high:other.low};recordSeriesGame(x,i?0:1,0)}swissAdvanceCups()");
 assert.equal(r('state.world.cups.CH_NL.stage'),'playinFinal');
 assert.equal(r('state.season.series.at(-1).aggregate'),true);
 r("globalThis.last=state.season.series.at(-1);for(let i=0;i<2;i++)recordSeriesGame({seriesId:last.id,home:i?last.low:last.high,away:i?last.high:last.low},i?0:1,0);swissAdvanceCups()");
 assert.equal(r('state.season.series.filter(s=>s.stage==="quarter").length'),4);
 assert.ok(r('state.season.series.filter(s=>s.stage==="quarter").every(s=>s.bestOf===7&&!s.aggregate)'));
});
test('Swiss background match commits real rows and statistics only once',()=>{
 const {run:r}=start();r('globalThis.g=state.schedule[0];leagueBackground(g)');
 assert.equal(r('state.teams.reduce((n,t)=>n+t.pts,0)'),3);
 assert.equal(r('state.leagueStatistics.recorded.regular.CH_NL'),1);
 const before=r('JSON.stringify(state.teams)');r('leagueBackground(g)');assert.equal(r('JSON.stringify(state.teams)'),before);
 assert.ok(r('Object.values(state.leagueStatistics.rows).length>30'));
 assert.ok(!/undefined|NaN/.test(r('tableView()+leaguesView()+seasonView()')));
});
