'use strict';
// Controlled full-regulation comparison. Only the test harness freezes coaching
// and injuries; production lineup, energy, geometry and event rules still run.
const assert=require('node:assert/strict');
const {headlessCareer}=require('./headless-career.cjs');
const r=headlessCareer().run;
const club=process.env.MATCH_CLUB||'HV71';
const away=process.env.MATCH_VENUE==='away';
const samples=Number(process.env.MATCH_SAMPLES||4);
const scenarios=(process.env.MATCH_SCENARIOS||'balanced,patient,shoot,pressure,counter').split(',');
assert.ok(Number.isInteger(samples)&&samples>0);
assert.ok(scenarios.every(s=>['balanced','patient','shoot','pressure','counter'].includes(s)),'Unknown match scenario');
r("startCareerWithClub("+JSON.stringify(club)+");globalThis.auditInitial=JSON.stringify(state);globalThis.originalLineup=rivalLineup;globalThis.originalCoach=aiCoachDecision;medicalExposure=()=>{};aiDecisions=()=>{};simulateOtherGames=()=>{};");
assert.equal(r('managerClub()'),club,'Sampling club must exist');
const results=[];
for(const scenario of scenarios)for(let sample=0;sample<samples;sample++){
 const seed=710031+sample*1107;
 r(`state=JSON.parse(auditInitial);{const fixture=state.schedule.find(g=>g.round===state.round&&(g.home===managerClub()||g.away===managerClub()));if((fixture.home===managerClub())===${away})[fixture.home,fixture.away]=[fixture.away,fixture.home];}rivalLineup=originalLineup;aiCoachDecision=originalCoach;state.calendar.date=calendarTarget();ensureLines();ensureSpecialTeams();state.tacticalPlan.shotChoice=${JSON.stringify(['patient','shoot'].includes(scenario)?scenario:'balanced')};state.tacticalPlan.attackStyle=${JSON.stringify(['pressure','counter'].includes(scenario)?scenario:'control')};state.tacticalPlan.forecheck=${JSON.stringify(scenario==='pressure'?'aggressive':'balanced')};state.tacticalPlan.tempo=${JSON.stringify(scenario==='pressure'?'high':'normal')};startMatch();pauseMatch();globalThis.e=studioEngine();e.rng=${seed};globalThis.fixture=state.schedule.find(g=>g.round===state.round&&(g.home===managerClub()||g.away===managerClub()));globalThis.locked=e.teams.map((t,side)=>{const source=side===0?managerRoster():state.clubRosters[state.live.opponent],find=id=>source.find(p=>samePlayerId(p.id,id)),plan=side===0?{style:state.tacticalPlan.attackStyle,posture:state.tactic,forecheck:state.tacticalPlan.forecheck,tempo:state.tacticalPlan.tempo,shotChoice:state.tacticalPlan.shotChoice,physicality:state.tacticalPlan.physicality,rotation:state.tacticalPlan.lineUsage,shiftLimit:t.shiftLimit,pp:t.tactics.pp,pk:t.tactics.pk,counter:state.specialPlans.counter}:{...state.live.aiTeam};const forwards=t.plan.forwards.map(find).filter(Boolean),defense=t.plan.defense.map(find).filter(Boolean),keepers=[find(t.goalie.id)].filter(Boolean),selected=new Set([...forwards,...defense,...keepers].map(p=>p.id));return {club:t.name,plan,forwards,defense,lines:Array.from({length:4},(_,i)=>forwards.slice(i*3,i*3+3)),keepers,keeper:keepers[0],extras:t.players.map(p=>find(p.id)).filter(p=>p&&p.pos!=='MV'&&!selected.has(p.id)),...Object.fromEntries(['pp1','pp2','pk1','pk2'].map(k=>[k,t.plan[k]]))};});globalThis.lockedState=JSON.stringify(state);aiCoachDecision=(club,base)=>({...base});rivalLineup=club=>locked.find(l=>l.club===club);globalThis.bg=rivalSimulate({...fixture,round:${sample+1}},{regulationOnly:true});`);
 assert.equal(r('bg.duration'),3600,'background regulation only');
 const background=JSON.parse(r("JSON.stringify(bg.reports.map(x=>({club:x.club,shots:x.shots,goals:x.shotAssessment.goals,xgOnTarget:x.shotAssessment.expectedGoals,attempts:x.attempts,xg:x.attemptXg,strength:x.strengthEvidence})))"));
 r(`state=JSON.parse(lockedState);globalThis.e=studioEngine();e.rng=${seed};globalThis.steps=0;while(e.time<3600&&!state.live.finished&&steps++<100000){state.live.running=true;studioStep();}globalThis.auditMatch=state.live.analysis;`);
 assert.ok(r('e.time>=3600'),'full regulation completed');
 const live=JSON.parse(r("JSON.stringify([0,1].map(side=>{const shots=auditMatch.shots.filter(s=>s.side===(side===0?'own':'opponent'));return {club:e.teams[side].name,shots:shots.filter(analysisOnTarget).length,goals:shots.filter(s=>s.outcome==='goal').length,xg:shots.reduce((n,s)=>n+s.probability,0),strength:['even','pp','pk'].map(kind=>{const ownKind=side===0||kind==='even'?kind:kind==='pp'?'pk':'pp',ss=shots.filter(s=>s.situation===ownKind);return {kind,seconds:auditMatch.strengthSeconds?.[ownKind]||0,attempts:ss.length,shots:ss.filter(analysisOnTarget).length,goals:ss.filter(s=>s.outcome==='goal').length,xg:ss.reduce((n,s)=>n+s.probability,0)};})};}))"));
 const row={scenario,venue:away?'away':'home',sample:sample+1,liveSeed:seed,live,background};results.push(row);console.log(JSON.stringify(row));
}
const report=require('./match-mode-report.cjs').summarize(results);
console.log(JSON.stringify(report));
process.exitCode=report.calibrationPassed?0:1;
