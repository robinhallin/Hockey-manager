'use strict';
const assert=require('node:assert/strict');
const {boot}=require('./scripts/career-test-fixture.cjs');
const app=boot(),r=app.run;
r("startCareerWithClub('HV71');deskNavigate('lines');tacticsWorkspaceView();globalThis.initial=tacticsSnapshot();");
const json=code=>JSON.parse(r('JSON.stringify('+code+')'));
// Both keyboard selection and candidate placement perform real, reversible swaps.
r("tacticsPick('forwards',0);tacticsPick('forwards',9)");
assert.equal(r('state.lines.forwards[9]'),r('initial.lines.forwards[0]'));
assert.equal(r('state.lines.forwards[0]'),r('initial.lines.forwards[9]'));
assert.equal(r('tacticsCanUndo()'),true);
r('tacticsUndo()');assert.deepEqual(json('tacticsSnapshot()'),json('initial'));
r("lineupPickSlot('forwards',0);lineupPlace(state.matchSelection.extras[0])");
assert.equal(r('state.lines.forwards[0]'),r('initial.matchSelection.extras[0]'));
assert.ok(r('state.matchSelection.extras.includes(initial.lines.forwards[0])'));
r('tacticsUndo()');assert.deepEqual(json('tacticsSnapshot()'),json('initial'));
r("tacticsPick('goalie',0);tacticsPick('backup',0)");
assert.equal(r('state.lines.goalie'),r('initial.matchSelection.backup'));
assert.equal(r('state.matchSelection.backup'),r('initial.lines.goalie'));
r('tacticsUndo()');assert.deepEqual(json('tacticsSnapshot()'),json('initial'));
// Locks survive save/reload. Assistant fills the remaining slots with unique, eligible players.
r("tacticsLock('forwards',9);tacticsLock('defense',5);tacticsLock('goalie',0);tacticsLock('backup',0);globalThis.locked=tacticsSnapshot();tacticsAssistant()");
for(const code of ['state.lines.forwards[9]===initial.lines.forwards[9]','state.lines.defense[5]===initial.lines.defense[5]','state.lines.goalie===initial.lines.goalie','state.matchSelection.backup===initial.matchSelection.backup','new Set([...state.lines.forwards,...state.lines.defense,state.lines.goalie,state.matchSelection.backup]).size===20'])assert.ok(r(code),code);
assert.ok(r('state.lines.defense.every(id=>playerById(id).pos===\'B\')'),'assistant reserves natural defenders for the back pairs');
assert.ok(r('state.lines.forwards.every(id=>![\'B\',\'MV\'].includes(playerById(id).pos))'));
r('tacticsUndo()');assert.deepEqual(json('tacticsSnapshot()'),json('locked'));
r('save()');const loaded=boot(app.storage.value);assert.equal(loaded.run('Object.keys(tacticsLocks()).length'),4);assert.equal(loaded.run('tacticsCanUndo()'),false);
// Special teams: role-sensitive choices, one place per unit, no spill into another unit.
r("tacticsTab('pp');specialSelect('pp2',3);tacticsLock('pp2',3);globalThis.specialBefore=tacticsSnapshot();tacticsAssistant()");
assert.equal(r('state.specialTeams.pp2[3]'),r('specialBefore.specialTeams.pp2[3]'));
assert.deepEqual(json('state.specialTeams.pp1'),json('specialBefore.specialTeams.pp1'));
assert.equal(r('new Set(state.specialTeams.pp2).size'),5);
r('tacticsUndo()');assert.deepEqual(json('tacticsSnapshot()'),json('specialBefore'));
r("specialPlan('pp','umbrella');desktopOrder('attackStyle','pressure')");
assert.equal(r('state.tacticalPlan.forecheck'),'aggressive');
r('tacticsUndo()');assert.equal(r('state.specialPlans.pp'),'umbrella');
r('tacticsUndo()');assert.deepEqual(json('tacticsSnapshot()'),json('specialBefore'));
r("globalThis.selectedId=state.specialTeams.pp2[3];deskOpenPlayer(selectedId);deskBack('lines')");
assert.equal(r('specialUI.unit'),'pp2');assert.equal(r('specialUI.slot'),3);
r("specialPlace(state.specialTeams.pp2[0])");assert.equal(r('state.specialTeams.pp2[0]'),r('selectedId'));
r('tacticsUndo()');assert.deepEqual(json('tacticsSnapshot()'),json('specialBefore'));
// A new injury invalidates old undo, and injured players are never picked by the assistant.
r("globalThis.injured=playerById(state.specialTeams.pp2[0]);injured.health.injury={remaining:3};tacticsWorkspaceView()");
assert.equal(r('tacticsCanUndo()'),false);r('tacticsAssistant()');assert.ok(r('!state.specialTeams.pp2.includes(injured.id)'));
r("injured.health.injury=null;tacticsTab('even');state.calendar.date=calendarTarget();startMatch();pauseMatch();depthLock();globalThis.clock=analysisClock();globalThis.beforeMatch=tacticsSnapshot();");
// Match squad, icing and medical limits apply to drag, clicks, bulk selection and undo.
r("globalThis.outside=managerRoster().find(p=>!state.live.matchSquad.includes(String(p.id))&&p.pos!=='MV');lineupPickSlot('forwards',0);if(outside)lineupPlace(outside.id)");
assert.deepEqual(json('state.lines'),json('beforeMatch.lines'));
r("studioEngine().icingHold=0;studioEngine().stoppage=5;globalThis.icing=tacticsSnapshot();tacticsAssistant();lineupPlace(state.lines.forwards[3]);tacticsUndo()");
assert.deepEqual(json('tacticsSnapshot()'),json('icing'));
r("studioEngine().icingHold=null;studioEngine().stoppage=0;lineupPlace(state.lines.forwards[3]);tacticsUndo()");
assert.deepEqual(json('tacticsSnapshot()'),json('icing'));assert.equal(r('analysisClock()'),r('clock'));
r("tacticsAssistant()");assert.ok(r('[...state.lines.forwards,...state.lines.defense,state.lines.goalie,state.matchSelection.backup].every(id=>state.live.matchSquad.includes(String(id)))'));
assert.equal(r('analysisClock()'),r('clock'));
r("changeLinePlayer('forwards',0,state.lines.forwards[3]);startMatch();studioStep();pauseMatch()");
assert.equal(r('tacticsCanUndo()'),false,'play advancing invalidates undo');
r("globalThis.afterPlay=tacticsSnapshot();tacticsUndo()");assert.deepEqual(json('tacticsSnapshot()'),json('afterPlay'));
assert.doesNotThrow(()=>r('validateSaveText(saveExportText())'));
console.log('PASS: click/reserve/goalie swaps, scoped undo, persisted locks, assistant eligibility and uniqueness, PP/BP units, order history, profile return and live guards.');
