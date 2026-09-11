const assert=require('node:assert/strict');
const {bootLegacy:boot}=require('./scripts/career-test-fixture.cjs');
const {run}=boot();
run('beginCareerSelection();chooseCareerClub("HV71");careerReview();acceptCareer()');
run(`state.season.phase='regular';state.managerCareer.startGames=0;state.managerCareer.confidence=35;state.managerCareer.lastReview=null;
  managerEvaluation=()=>({score:5,goals:[],explanation:'Styrelsen ser tydliga brister.'});
  state.morale=40;for(const p of managerRoster())p.happiness=40;
  state.analysis.matches=[];
  for(let i=0;i<5;i++)state.analysis.matches.push({id:'old-'+i,club:managerClub(),own:1,against:4,friendly:false,partial:false,abandoned:false});
  team(managerClub()).gp=8;managerCheckIn();`);
assert.ok(run('state.managerCareer.confidence')<30,'poor performance should move confidence into danger');
assert.equal(run('state.managerCareer.pressure.active'),true,'danger should create an ultimatum');
assert.equal(run('state.managerCareer.pressure.targetPoints'),6);
assert.ok(run('managerView()').includes('Ultimatum'));
assert.ok(run('managerLifeRisk().value').includes('Jobbet är hotat'));

// The ultimatum is assessed after exactly five new results, not only at four-game board check-ins.
run(`for(let i=0;i<5;i++)state.analysis.matches.unshift({id:'ult-'+i,club:managerClub(),own:0,against:3,friendly:false,partial:false,abandoned:false});
 team(managerClub()).gp=13;managerCheckIn();`);
assert.equal(run('state.managerCareer.status'),'unemployed');
assert.equal(run('state.managerCareer.decision'),'dismissed');
assert.ok(run('state.managerCareer.jobs.length')>0,'job market should open during the regular season');
assert.equal(run('state.season.phase'),'regular');
assert.equal(run('managerCanPlay()'),false,'unemployed manager cannot advance the club');

// A new appointment continues the same live season and schedule.
run(`state.managerCareer.reputation=100;var target=state.managerCareer.jobs.find(j=>j.status==='open');var oldClub=managerClub();var oldRound=state.round;var oldSchedule=JSON.stringify(state.schedule);managerInterview(target.id);managerInterviewAnswer(state.managerCareer.identity);`);
assert.equal(run('state.managerCareer.interview.stage'),'offer');
run('var destination=target.club;var destinationGp=team(destination)?.gp||0;managerAcceptJob()');
assert.equal(run('state.managerCareer.status'),'employed');
assert.equal(run('managerClub()'),run('destination'));
assert.notEqual(run('managerClub()'),run('oldClub'));
assert.equal(run('state.season.phase'),'regular');
assert.equal(run('state.round'),run('oldRound'));
assert.equal(run('JSON.stringify(state.schedule)'),run('oldSchedule'));
assert.equal(run('state.managerCareer.startGames'),run('destinationGp'));
assert.equal(run('state.managerCareer.pressure'),null);
assert.equal(run('state.managerCareer.confidence'),60);
assert.ok(run('state.managerCareer.history.some(h=>h.kind==="departure")'));
assert.ok(run('state.managerCareer.history.some(h=>h.kind==="appointment")'));
console.log('PASS: live board pressure, five-match ultimatum, in-season dismissal and same-save job change.');
