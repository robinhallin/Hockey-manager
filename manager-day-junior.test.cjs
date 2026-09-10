'use strict';
const assert=require('node:assert/strict');
const {boot}=require('./scripts/career-test-fixture.cjs');
const app=boot(),r=app.run;
r("startCareerWithClub('HV71')");
// The forecast is read-only and agrees with the real training log, including delegation.
r("managerRoster().forEach((p,i)=>p.fatigue=i?20:70);state.training.recoveryOwner='staff';calendarSetSession(state.calendar.date,'type','physical');calendarSetSession(state.calendar.date,'intensity','hard')");
const before=r('JSON.stringify(state)'),preview=r('managerDayPreview()');
assert.equal(r('JSON.stringify(state)'),before);assert.equal(preview.kind,'training');assert.ok(preview.resting>=1);
r('calendarContinue()');
const review=r('state.calendar.dayReview');assert.equal(review.session.trained,preview.trained);assert.equal(review.session.resting,preview.resting);
assert.equal(Math.round(100-review.session.after),preview.after);
assert.match(r('managerDayReviewView()'),/avslutad/);
r('save()');const resumed=boot(app.storage.value);assert.equal(resumed.run('JSON.stringify(state.calendar.dayReview)'),JSON.stringify(review));
assert.ok(r('validateSaveText(saveExportText()).calendar.dayReview'));
r("managerMessage('halt-day','Svara först','Beslut','Spelare',{decisionType:'minutes',playerId:managerRoster()[0].id})");
const day=r('state.calendar.date');r('calendarContinue()');assert.equal(r('state.calendar.date'),day);assert.equal(r('managerDayPreview().kind'),'decision');
r('pendingManagerDecision().resolved=true');
// Planned junior ice time is conserved, role-dependent and does not alter the clock or senior lineup.
r("globalThis.p=state.juniors.roster.find(p=>p.pos==='C');globalThis.juniorDay=state.calendar.date;globalThis.seniorLines=JSON.stringify(state.lines);globalThis.normal=juniorMatchPlan().seconds.get(String(p.id));juniorSetMatchUsage(p.id,'priority')");
assert.ok(r('juniorMatchPlan().seconds.get(String(p.id))>normal'));
assert.equal(r('state.calendar.date'),r('juniorDay'));assert.equal(r('JSON.stringify(state.lines)'),r('seniorLines'));
assert.equal(r('Array.from(juniorMatchPlan().seconds.values()).reduce((n,v)=>n+v,0)'),21600);
r("juniorSetMatchUsage(p.id,'rest');globalThis.progress=JSON.stringify(p.trainingProgress);juniorFixture('real-j20-one')");
assert.equal(r('p.academy.history[0].seconds'),0);assert.equal(r('JSON.stringify(p.trainingProgress)'),r('progress'));
assert.equal(r('p.games'),0);assert.equal(r('p.goals'),0);
assert.equal(r('state.juniors.matches[0].players.reduce((n,p)=>n+p.goals,0)'),r('state.juniors.matches[0].own'));
// Both teams' individual league totals derive from the same result; AI weekly games are not duplicated.
assert.equal(r("state.juniorWorld.results.every(g=>[g.home,g.away].every((club,i)=>juniorWorldRoster(club).reduce((n,p)=>n+(p.academy.leagueStats?.goals||0),0)===(i?g.awayGoals:g.homeGoals)))"),true);
const aiGames=r('aiAcademyPlayers().reduce((n,p)=>n+p.academy.games,0)');
r('juniorWorldSimulateRound(state.round,state.juniors.matches[0])');assert.equal(r('aiAcademyPlayers().reduce((n,p)=>n+p.academy.games,0)'),aiGames);
r("globalThis.club=juniorWorldClubs('SHL').find(c=>c!==managerClub());clubAIState(club).academy.lastMatch=calAdd(state.calendar.date,-8);clubAIState(club).academy.lastDay=calAdd(state.calendar.date,-1);aiAcademyDay(club)");
assert.equal(r('aiAcademyPlayers().reduce((n,p)=>n+p.academy.games,0)'),aiGames);
// Home/away returns are reversed, including the first scheduled return leg.
assert.equal(r("juniorWorldPairings('SHL',1).every(g=>juniorWorldPairings('SHL',14).some(h=>h.home===g.away&&h.away===g.home))"),true);
r('save()');const reloaded=boot(app.storage.value);assert.equal(reloaded.run('juniorMatchUsage(state.juniors.roster.find(p=>p.pos===\'C\'))'),'rest');
// Invalid imported match usage or report shape is rejected before replacing a career.
r("globalThis.bad=JSON.parse(JSON.stringify(state));bad.juniors.roster[0].academy.matchUsage='invalid'");assert.throws(()=>r('validateSaveText(JSON.stringify(bad))'));
r("bad=JSON.parse(JSON.stringify(state));bad.calendar.dayReview.headlines='invalid'");assert.throws(()=>r('validateSaveText(JSON.stringify(bad))'));
console.log('PASS: exact/read-only day preview, real day summary, delegation, decision stop, save/import, junior usage/ice budgets, same AI/team/player ledger, no duplicate weekly games and reversed return fixtures.');
