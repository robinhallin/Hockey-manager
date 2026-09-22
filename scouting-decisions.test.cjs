'use strict';
const assert=require('node:assert/strict');
const {boot}=require('./scripts/career-test-fixture.cjs');
const app=boot(),r=app.run;
r("startCareerWithClub('HV71');globalThis.target=getTransferMarketPlayers().find(p=>p.pos==='C');globalThis.peer=managerRoster().find(p=>p.pos==='C');requestScoutReport(target.id,true);");
r('for(let i=0;i<7;i++)calendarStep(true);advanceScoutReports()');
assert.equal(r('state.scoutReports[target.id].visits'),1);
r("globalThis.message=state.training.messages.find(m=>m.key.startsWith('scout:'+target.id+':'))");
assert.equal(r('message.playerId'),r('target.id'));
assert.match(r('message.body'),/Första bedömningen/);
assert.doesNotMatch(r('message.body'),/Kunskap \d+ %/);
r("profileWorkspace.tab='history';messageOpenContext(message.id)");
assert.equal(r('state.selectedMarketPlayer'),r('target.id'));
assert.equal(r('profileWorkspace.tab'),'overview');
assert.equal(r('recruitHub.panel'),'report');
// A role-specific comparison preserves previous choices and uses the same uncertainty.
r("scoutingComparePair(target.id,peer.id,'Defensiv center')");
assert.equal(r('scoutDesk.compare.length'),2);
assert.equal(r('scoutingOffice().compareProfile'),'Defensiv center');
assert.equal(r('scoutingComparisonRole(target)'),r("(()=>{const a=recruitRoleAssessment(target,'Defensiv center');return a.low+'–'+a.high+'/20 · Defensiv center';})()"));
assert.match(r('scoutingComparisonSource(peer)'),/exakta attribut/);
r("scoutingComparePair(target.id,peer.id,'Defensiv center')");assert.equal(r('scoutDesk.compare.length'),2);
const publicInfo=r('scoutingObservationText(target,"Defensiv center")+scoutingComparison()');
r('for(const key of Object.keys(target.attributes))target.attributes[key]=1');
assert.equal(r('scoutingObservationText(target,"Defensiv center")+scoutingComparison()'),publicInfo,'unobserved attributes cannot leak through a new report view or comparison');
// A fresh, dated observation supplies new information and preserves old evidence.
r('state.calendar.date=calAdd(state.calendar.date,7);scoutObserve(target.id,state.calendar.date)');
assert.match(r('scoutingObservationText(target,"Defensiv center")'),/Jämfört med/);
assert.match(r('scoutingObservationText(target,"Defensiv center")'),/→/);
assert.equal(r('state.scoutReports[target.id].history.length'),1);
assert.notEqual(r('scoutingObservationText(target,"Defensiv center")+scoutingComparison()'),publicInfo);
r('globalThis.before=state.training.messages.length;scoutObserve(target.id,state.calendar.date)');
assert.equal(r('state.training.messages.length'),r('before'),'same-day observation adds no repeated message');
// Same name, different IDs; existing selection survives profile navigation and reload.
r("peer.name=target.name;scoutingCompareRole('Målvakt');");
assert.equal(r('scoutingComparisonRole(target)'),'Annan positionsprofil');
r("scoutingCompareRole('Defensiv center');deskOpenPlayer(peer.id);deskBack();save()");
const b=boot(app.storage.value);
assert.equal(b.run('JSON.stringify(scoutDesk.compare)'),r('JSON.stringify(scoutDesk.compare)'));
assert.equal(b.run('scoutingOffice().compareProfile'),'Defensiv center');
assert.equal(b.run('JSON.stringify(state.scoutReports)'),r('JSON.stringify(state.scoutReports)'));
// Legacy saves migrate only the presentation choice, without inventing observations.
r("delete state.recruitment.scouting.compareProfile;save()");
const legacy=boot(app.storage.value);assert.equal(legacy.run('scoutingOffice().compareProfile'),'ALL');
assert.equal(legacy.run('JSON.stringify(state.scoutReports)'),r('JSON.stringify(state.scoutReports)'));
// A full comparison cannot silently discard another player to make room.
r("globalThis.others=managerRoster().filter(p=>!samePlayerId(p.id,peer.id));scoutingCompare(others[0].id);scoutingCompare(others[1].id);globalThis.selection=JSON.stringify(scoutDesk.compare)");
assert.equal(r("scoutingComparePair(target.id,others[2].id,'Defensiv center')"),false);
assert.equal(r('JSON.stringify(scoutDesk.compare)'),r('selection'));
console.log('PASS: paid request → daily observation → exact inbox player → same-role comparison → new information → profile/back → save/reload and legacy presentation migration; no hidden attribute leak or duplicate message.');
