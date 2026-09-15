'use strict';
const assert=require('node:assert/strict');
const {boot}=require('./scripts/career-test-fixture.cjs');
const app=boot(),r=app.run;
r("startCareerWithClub('HV71')");
// Both entry points agree, including explicit manual ownership and save/reload.
r("managerOffice2ToggleDelegation('training');setRecoveryOwner('manager');save()");
assert.equal(r("managerOffice2Delegated('training')"),false);
assert.equal(boot(app.storage.value).run("managerOffice2Delegated('training')"),false);
r("managerOffice2ToggleDelegation('training')");
assert.equal(r("state.training.recoveryOwner"),'staff');
// A manual medical plan remains authoritative throughout this injury, not only today.
r("globalThis.p=managerRoster()[0];p.health.injury={name:'Test',remaining:0,initial:4,readiness:60};p.health.clearance='rest';managerOffice2ToggleDelegation('medical');setMedicalClearance(p.id,'rest');medicalDay();save()");
assert.equal(r('p.health.clearance'),'rest');
const reload=boot(app.storage.value);reload.run('medicalDay()');
assert.equal(reload.run('managerRoster()[0].health.clearance'),'rest');
assert.equal(reload.run('medicalReady(managerRoster()[0])'),false);
reload.run('medicalDay()');assert.equal(reload.run('medicalReady(managerRoster()[0])'),true,'fully healed players return normally');
r("p.health.injury={name:'Another injury',remaining:0,initial:4,readiness:75};p.health.clearance='rest';managerOffice2MedicalStaffPlan()");
assert.equal(r('p.health.clearance'),'limited','new injuries do not inherit old manual plans');
assert.ok(r("state.medical.history.some(x=>x.title.includes('staben väljer'))"));
// Every reply-required offer has a reachable action even above the former five-row limit.
r("state.recruitment.incoming=Array.from({length:7},(_,i)=>({id:900+i,name:'Bud '+i,buyer:'AIK',fee:10000,status:'pending',expires:state.recruitment.tick+2}))");
assert.equal(r('managerOffice2VisibleItems().filter(x=>x.requiresDecision).length'),7);
for(let i=0;i<7;i++)assert.ok(r(`managerOffice2View().includes('incoming:${900+i}')`));
// Ice-hockey league points, not three points for every win / zero for every loss.
r("state.analysis.matches=[];state.analysis.history={};state.managerCareer.confidence=25;state.managerCareer.pressure={active:true,club:managerClub(),resultTracking:1,afterId:null,created:'2026-09-01',matches:5,targetPoints:6};state.analysis.matches=[{own:3,against:1},{own:1,against:2,shootout:true},{own:1,against:2,overtime:true},{own:1,against:2,shootout:true},{own:0,against:3}].map((m,i)=>({...m,id:'result-'+i,club:managerClub(),date:'2026-09-'+(10+i),year:2026,round:i+1,finished:true,shots:[]}));");
assert.equal(r('managerUltimatumMatches().reduce((n,m)=>n+managerResultPoints(m),0)'),6);
assert.equal(r('managerAssessUltimatum()'),false);
assert.equal(r('state.managerCareer.status'),'employed');
assert.equal(r('state.managerCareer.pressure'),null,'a met ultimatum closes');
assert.equal(r('managerResultPoints({own:3,against:2,overtime:true})'),2);
// A board check on the same match cannot replace the ultimatum just met.
r("state.managerCareer.lastUltimatumMet=null;team(managerClub()).gp=12;state.managerCareer.startGames=0;state.managerCareer.confidence=5;state.managerCareer.pressure={active:true,club:managerClub(),resultTracking:1,afterId:null,created:'2026-09-01',matches:5,targetPoints:6};managerCheckIn()");
assert.equal(r('state.managerCareer.status'),'employed');
assert.equal(r('state.managerCareer.pressure'),null);
// Existing legacy summaries recover OT metadata while a detailed report still exists.
r("state.analysis.history={'result-2':{...state.analysis.matches[2]}};delete state.analysis.history['result-2'].overtime;archiveMatchSummaries()");
assert.equal(r("state.analysis.history['result-2'].overtime"),true);
// A full archive keeps counting new results; save/reload never counts one twice.
r("state.analysis.matches=Array.from({length:80},(_,i)=>({id:'old-'+i,club:managerClub(),date:'2026-09-01',year:2026,round:i,finished:true,own:1,against:2,shots:[]}));state.analysis.history={};trimAnalysisArchive();state.managerCareer.pressure={active:true,club:managerClub(),resultTracking:1,afterId:managerLeagueResults()[0].id,created:'2026-09-01',matches:5,targetPoints:6};for(let i=0;i<5;i++){state.analysis.matches.unshift({id:'new-'+i,club:managerClub(),date:'2026-09-'+(10+i),year:2026,round:81+i,finished:true,own:0,against:3,shots:[]});trimAnalysisArchive();}");
assert.equal(r('state.analysis.matches.length'),80);
assert.equal(r('managerUltimatumMatches().length'),5);
r('save()');assert.equal(boot(app.storage.value).run('managerUltimatumMatches().length'),5);
// Legacy ultimatums with a creation date also survive pruning.
r("delete state.managerCareer.pressure.resultTracking;state.managerCareer.pressure.startCount=80");
assert.equal(r('managerUltimatumMatches().length'),5);
console.log('PASS: cross-view ownership, medical authority/reload/recovery, all reply actions, real league points and archive-safe ultimatums.');
