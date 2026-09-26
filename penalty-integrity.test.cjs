'use strict';
const assert=require('node:assert/strict');
const {boot}=require('./scripts/career-test-fixture.cjs');
function fresh(){const app=boot();app.run("startCareerWithClub('HV71');state.calendar.date=calendarTarget();startMatch();pauseMatch();globalThis.e=studioEngine();medicalRoll=()=>.999;");return app;}
// Every kind and side uses the same accepted record in all accounting paths.
for(const side of [0,1])for(const [method,minutes] of [['givePenalty',2],['giveMajorPenalty',5],['giveMisconduct',10]]){
 const app=fresh(),r=app.run;
 r(`globalThis.off=e.skaters(${side})[0];globalThis.club=e.teams[${side}].name;globalThis.p=e.${method}(${side},{playerId:off.player.id},${JSON.stringify(minutes===2?'tripping':minutes===5?'boarding':'misconduct')});`);
 assert.equal(r('p.minutes'),minutes);
 assert.equal(r(`state.live.matchEventSummary.players[${side}+':'+p.playerId].pim`),minutes);
 assert.equal(r('state.live.leagueBox.players[club+":"+p.playerId].pim'),minutes);
 assert.equal(r('state.live.analysis.events.at(-1).minutes'),minutes);
 if(side===0){assert.equal(r('studioPlayer(0,p.playerId).pim'),minutes);assert.equal(r('state.live.analysis.players[p.playerId].pim'),minutes);}
 assert.equal(r(`e.strength(${side})`),minutes===10?5:4);
 assert.equal(r('analysisSituation()'),minutes===10?'even':side===0?'pk':'pp');
 assert.equal(r(`state.live.matchEventSummary.pp[${1-side}]`),minutes===10?0:1);
 assert.equal(r('e.actors.some(a=>a.player.id===p.playerId)'),false,'offender cannot be selected while serving');
 assert.match(r('matchPenaltyText()'),/#player\//);
 const once=r('JSON.stringify([state.live.eventStream,state.live.analysis,state.live.leagueBox,e.rng])');
 r(`studioRecordPenalty(e,p);analysisEvent('penalty',${side===0?"'own'":"'opponent'"},'duplicate',p.playerId,StudioHockey.penaltyDetails(p));render();matchPenaltyText();`);
 assert.equal(r('JSON.stringify([state.live.eventStream,state.live.analysis,state.live.leagueBox,e.rng])'),once);
 r('save()');const loaded=boot(app.storage.value),s=loaded.run;
 s('resumeCareer();globalThis.e=studioEngine();globalThis.p=e.penaltyList()[0];studioRecordPenalty(e,p)');
 assert.equal(s('JSON.stringify([state.live.eventStream,state.live.analysis,state.live.leagueBox,e.rng])'),once);
 assert.equal(s('validateSaveText(saveExportText()).live.broadcast.penalties[0].remaining'),minutes*60);
 // A personal penalty must expire without temporarily adding an overtime skater.
 if(minutes===10){s('e.threeOnThree=true;for(const side of [0,1])e.installUnit(side);e.tickPenalties(600);studioMirror(e)');assert.equal(s('e.strength(0)'),3);assert.equal(s('e.strength(1)'),3);assert.equal(s('e.otExpanded||false'),false);}
}
// Name compatibility is deliberately unambiguous. The core command uses ID.
const app=fresh(),r=app.run;
r(`globalThis.a=e.skaters(0)[0];globalThis.b=e.skaters(0)[1];a.player.name=b.player.name='Samma Namn';studioPlayer(0,a.player.id).name=studioPlayer(0,b.player.id).name='Samma Namn';globalThis.before=JSON.stringify(state);`);
assert.equal(r("e.givePenalty(0,'Samma Namn','tripping')"),false);
assert.equal(r('e.givePenalty(0,{playerId:"saknas"},"tripping")'),false);
assert.equal(r('JSON.stringify(state)'),r('before'),'rejected commands do not advance RNG or create events');
r('globalThis.p=e.givePenalty(0,{playerId:b.player.id},"tripping");startMatch();studioStep();pauseMatch()');
assert.equal(r('p.playerId'),r('b.player.id'));assert.equal(r('studioPlayer(0,a.player.id).pim'),0);
assert.equal(r('state.live.events.find(x=>x.penaltyId===p.id).playerId'),r('b.player.id'));
assert.match(r('matchEventReference(state.live.events.find(x=>x.penaltyId===p.id))'),new RegExp('#player/'+encodeURIComponent(r('b.player.id'))));
const paused=r('JSON.stringify([e.time,e.rng,state.live.eventStream])');r('deskOpenPlayer(p.playerId);deskBack()');
assert.equal(r('state.live.running'),false);assert.equal(r('JSON.stringify([e.time,e.rng,state.live.eventStream])'),paused);
// Two majors plus a queued minor: a goal cannot release the unstarted minor.
const q=fresh(),s=q.run;
s(`globalThis.mc=e.giveMisconduct(0,{playerId:e.skaters(0)[0].player.id});globalThis.m1=e.giveMajorPenalty(0,{playerId:e.skaters(0)[0].player.id});globalThis.m2=e.giveMajorPenalty(0,{playerId:e.skaters(0)[0].player.id});globalThis.minor=e.givePenalty(0,{playerId:e.skaters(0)[0].player.id},'tripping');e.goalPenalty(1);`);
assert.equal(s('e.penaltyList().includes(minor)'),true);
assert.equal(s('state.live.matchEventSummary.pp[1]'),2);
assert.equal(s('state.live.penaltiesHV.find(p=>p.id===minor.id).queued'),true);
s('e.tickPenalties(30);studioMirror(e)');
assert.equal(s('mc.remaining'),570);assert.equal(s('m1.remaining'),270);assert.equal(s('m2.remaining'),270);assert.equal(s('minor.remaining'),120);
s('e.endPenalty(false,m1);studioMirror(e)');
assert.equal(s('state.live.matchEventSummary.pp[1]'),3,'newly active queued penalty is a recorded opportunity');
assert.equal(s('e.strength(0)'),3);assert.equal(s('state.live.penaltiesHV.find(p=>p.id===minor.id).queued'),false);
s('e.tickPenalties(1);e.goalPenalty(1);studioMirror(e)');
assert.equal(s('e.penaltyList().includes(minor)'),false);assert.equal(s('e.penaltyList().includes(m2)'),true);assert.equal(s('e.penaltyList().includes(mc)'),true);
assert.equal(s('e.strength(0)'),4);
// Existing in-progress records with no schema keep their recorded remaining time.
r('save()');const legacy=JSON.parse(app.storage.value),oldPenalty=legacy.live.broadcast.penalties[0];
for(const key of ['id','version','sequence','type','minutes','affectsStrength','releasable','seconds'])delete oldPenalty[key];
delete legacy.live.broadcast.penaltySequence;
for(const event of legacy.live.eventStream.events)delete event.penaltyId;
for(const event of legacy.live.analysis.events)delete event.penaltyId;
const old=boot(JSON.stringify(legacy)),o=old.run;
o('resumeCareer();globalThis.e=studioEngine();globalThis.before=e.penaltyList()[0].remaining;globalThis.count=state.live.eventStream.events.length;e.tickPenalties(1);save()');
assert.equal(o('e.penaltyList()[0].remaining'),o('before-1'));
assert.equal(o('state.live.eventStream.events.length'),o('count'),'legacy loading does not fabricate a second penalty');
// New schema corruption is rejected instead of silently resetting a career.
s('save()');const bad=JSON.parse(q.storage.value);bad.live.broadcast.penalties[0].minutes=2;
assert.throws(()=>s('validateSaveText('+JSON.stringify(JSON.stringify(bad))+')'),/Matchens spelarbeslut/);
assert.deepEqual(run("JSON.stringify(StudioHockey.strengthState([{side:0,affectsStrength:true},{side:0,affectsStrength:true}],false))"),JSON.stringify([3,5]));
assert.deepEqual(run("JSON.stringify(StudioHockey.strengthState([{side:0,affectsStrength:true},{side:1,affectsStrength:true}],false))"),JSON.stringify([4,4]));
assert.deepEqual(run("JSON.stringify(StudioHockey.strengthState([{side:0,affectsStrength:true},{side:0,affectsStrength:true},{side:0,affectsStrength:true}],false))"),JSON.stringify([3,5]));
console.log('PASS: ID-safe penalties, exact 2/5/10-minute ledgers, correct personal/queued penalties and PP opportunities, idempotence, clickable events, paused profile navigation, reload and legacy compatibility.');
