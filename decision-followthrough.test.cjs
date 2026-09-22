'use strict';
const assert=require('node:assert/strict');
const {boot}=require('./scripts/career-test-fixture.cjs');
const app=boot(),r=app.run;
r("startCareerWithClub('HV71');state.money=100000000;getClub().wageBudget=100000000;globalThis.p=state.playerWorld.freeAgents.find(p=>p.pos!=='MV'&&p.pos!=='B');");
// A real recruitment plan survives signing and leads to the intended slot.
r("squadPlacementSave(p.id,4,roleWeights(p)[0]);globalThis.signed=transferRecruitPlayer(p,WORLD_FREE,managerClub(),0,p.salary,2,'Ordinarie')");
assert.equal(r('signed'),true);
assert.match(r('scoutingOverview()'),/Din plan: Kedja 2 · center/);
assert.match(r('scoutingOverview()'),/0\/5 bedömda matcher/);
r('squadOpenPlace(p.id)');
assert.equal(r('lineupUI.slot.index'),4);
assert.equal(r('lineupUI.line'),1);
const previous=r('state.lines.forwards[4]');
r('lineupPlace(p.id)');
assert.equal(r('state.lines.forwards[4]'),r('p.id'));
assert.notEqual(previous,r('p.id'));
assert.match(r('scoutingOverview()'),/Nu: Kedja 2/);
assert.match(r('desktopRoster()'),/Tekningar/);
// Identical names are not used as identity, and contextual navigation is read only.
r("globalThis.other=managerRoster().find(q=>q.id!==p.id&&q.pos!=='MV');other.name=p.name;");
const lines=r('JSON.stringify(state.lines)'),day=r('state.calendar.date');
r('squadOpenPlace(p.id)');
assert.equal(r('state.lines.forwards[lineupUI.slot.index]'),r('p.id'));
assert.equal(r('JSON.stringify(state.lines)'),lines);assert.equal(r('state.calendar.date'),day);
// Existing review, real daily sessions, and the production match simulator.
r('developmentReviewStart(p.id);setIndividualLoad(p.id,"light");');
r('globalThis.days=0;while(state.calendar.date<calendarTarget()&&days++<14)calendarContinue();');
assert.ok(r('days')>0);assert.ok(r('developmentReviewEvidence(p).sessions.length')>0);
r('startMatch();pauseMatch();');
const clock=r('JSON.stringify([state.live.minute,state.live.second,state.live.running])');
r('squadOpenPlace(p.id);developmentReviewView(p);');
assert.equal(r('JSON.stringify([state.live.minute,state.live.second,state.live.running])'),clock);
r('globalThis.steps=0;while(!state.live.finished&&steps++<65000){if(!state.live.running){while(medicalPending())medicalDecisionAccept();startMatch();}studioStep();}');
assert.equal(r('state.live.finished'),true);
assert.equal(r('state.live.analysis.saved'),true);
// First fixture can be preseason; excluded reports must not masquerade as league evidence.
const eligible=r('analysisComparable(state.analysis.matches[0])');
assert.equal(r('developmentReviewEvidence(p).matches.length'),eligible?1:0);
assert.match(r('developmentReviewView(p)'),/Användning före och efter/);
r('save()');const reload=boot(app.storage.value);
assert.equal(reload.run('JSON.stringify(state.lines)'),r('JSON.stringify(state.lines)'));
assert.equal(reload.run('JSON.stringify(state.recruitment.scouting.reviews)'),r('JSON.stringify(state.recruitment.scouting.reviews)'));
// Controlled evidence: exclude future, partial, different club and pre-plan IDs.
r(`globalThis.report=(id,date,seconds=600)=>({id,date,club:managerClub(),year:state.season.year,finished:true,players:[{id:p.id,seconds,goals:1,assists:0}],units:[],shots:[]});
globalThis.start=p.developmentReview.date;
p.developmentReview.seen=['before'];
state.analysis.matches=[report('after',state.calendar.date,900),report('before',start),report('future',calAdd(state.calendar.date,1)),{...report('partial',start),partial:true},{...report('elsewhere',start),club:'Other'}];`);
assert.equal(r('developmentReviewEvidence(p).baseline.length'),1);
assert.equal(r('developmentReviewEvidence(p).matches.length'),1);
assert.match(r('developmentReviewView(p)'),/15.0 min/);
assert.match(r('developmentReviewView(p)'),/#match\/after/);
const snapshot=r('JSON.stringify(state)');r('developmentReviewView(p);scoutingOverview();desktopRoster()');
assert.equal(r('JSON.stringify(state)'),snapshot,'reading evidence must not simulate, send messages or alter instructions');
console.log('PASS: planned signing → correct slot → daily training → real match → evidence → reload; duplicate names, paused match and evidence boundaries. Automated workflow, not visual playtesting.');
