'use strict';
const assert=require('node:assert/strict');
const {boot}=require('./scripts/career-test-fixture.cjs');
const a=boot(),r=a.run;
r("startCareerWithClub('HV71');state.calendar.date=calendarTarget();startMatch();pauseMatch();globalThis.e=studioEngine();globalThis.m=state.live;m.rink.mode='highlights';m.speed=4;e.flight={kind:'shot'}");
assert.equal(r('studioPlaybackRate(e,m)'),1,'old saves use normal visible speed even when fast-forward was maximal');
for(const speed of [.5,1,1.5,2]){r(`setHighlightSpeed(${speed})`);assert.equal(r('studioPlaybackRate(e,m)'),speed);assert.equal(r('m.speed'),4);}
r('setHighlightSpeed(32)');assert.equal(r('m.onIceSpeed'),2);
r('setHighlightSpeed(1);save()');assert.equal(boot(a.storage.value).run('state.live.onIceSpeed'),1);
assert.match(r('matchPlaybackControls(m)'),/Tempo på isen/);assert.match(r('matchPlaybackControls(m)'),/1× = verklig spelfart/);assert.doesNotMatch(r('matchPlaybackControls(m)'),/setSpeed|90×/);
// A short danger signal holds the visible sequence for six simulation seconds.
r('studioTrackHighlight(e,m);e.flight=null;e.carrier=null;e.highlightUntil=0;globalThis.until=studioHighlightWindow.until;e.wall=until-1');
assert.equal(r('studioShouldShow(e,m)'),true);
r('globalThis.before=JSON.stringify(e);for(let i=0;i<20;i++){studioShouldShow(e,m);studioPlaybackRate(e,m)}');assert.equal(r('JSON.stringify(e)'),r('before'),'presentation reads do not alter engine or RNG');
r('e.wall=until');assert.equal(r('studioShouldShow(e,m)'),false);assert.equal(r('studioPlaybackRate(e,m)'),360);
r("m.rink.mode='extended';e.focus=true;studioTrackHighlight(e,m)");assert.equal(r('studioPlaybackRate(e,m)'),1);
r("m.rink.mode='commentary'");assert.equal(r('studioShouldShow(e,m)'),false);assert.equal(r('studioPlaybackRate(e,m)'),360);
r("m.rink.mode='full'");assert.equal(r('studioPlaybackRate(e,m)'),1,'normal full-match speed is also real time');
// Each visible speed means the same thing in all three rink modes.
for(const speed of [.5,1,1.5,2,4,8])for(const mode of ['full','extended','highlights']){
 r(`m.rink.mode='${mode}';e.flight={kind:'shot'};setOnIceSpeed(${speed})`);assert.equal(r('studioPlaybackRate(e,m)'),speed);assert.equal(r('m.speed'),4);
}
r('setOnIceSpeed(NaN);setOnIceSpeed(360)');assert.equal(r('m.onIceSpeed'),8);
// Legacy highlight preferences survive; the old full-match index is never mistaken for a visible multiplier.
r('delete m.onIceSpeed;m.highlightSpeed=.5');assert.equal(r('studioOnIceRate(m)'),.5);r('delete m.highlightSpeed;setOnIceSpeed(1)');
assert.match(r('matchPlaybackSettings()'),/Snabbspolning mellan höjdpunkter/);
// Changing replay pace retains the same frames and playhead, without advancing the actual match.
r('studioReplayState={frames:Array.from({length:51},(_,i)=>({...studioFrame(e),time:i*.2})),elapsed:0,lastNow:null};globalThis.ledger=JSON.stringify([e.rng,e.score,e.time,m.analysis]);studioReplayFrame(1000);studioReplayFrame(1500);');
assert.equal(r('studioReplayState.elapsed'),.5);
r('setOnIceSpeed(.5);studioReplayFrame(1600);');assert.equal(r('studioReplayState.elapsed'),.5);
r('studioReplayFrame(3600);');assert.equal(r('studioReplayState.elapsed'),1.5);
assert.equal(r('JSON.stringify([e.rng,e.score,e.time,m.analysis])'),r('ledger'));assert.equal(r('m.running'),false);
assert.match(r('matchPlaybackControls(m)'),/Repristempo/);
r('studioExitReplay();setOnIceSpeed(1);');
// Real production timer with deterministic wall time and a controlled engine step.
r(`globalThis.virtualNow=100000;Date=class extends Date{static now(){return virtualNow}};globalThis.originalStep=studioStep;globalThis.steps=0;globalThis.showAt=1;studioStep=()=>{steps++;e.wall+=StudioHockey.STEP;e.time+=StudioHockey.STEP;if(steps===showAt)e.flight={kind:'shot'};};m.running=true;m.finished=false;m.rink.mode='highlights';e.flight=null;e.carrier=null;e.highlightUntil=0;studioRestartClock();studioLastSave=virtualNow;studioLastPaint=virtualNow;virtualNow+=50;studioPulse()`);
assert.equal(r('steps'),1,'fast-forward yields immediately when a highlight starts');
assert.equal(r('studioAccumulator'),0,'no fast-forward debt enters the visible sequence');
r('globalThis.startWall=e.wall;showAt=-1;for(let i=0;i<20;i++){virtualNow+=50;studioPulse()}');
assert.ok(Math.abs(r('e.wall-startWall')-1)<.11,'one real second gives one simulation second at normal highlight speed');
r('studioAccumulator=40;rinkMode("extended")');assert.equal(r('studioAccumulator'),0);
r('studioAccumulator=40;setHighlightSpeed(.5)');assert.equal(r('studioAccumulator'),0);
r('m.running=false;globalThis.stopped=e.wall;virtualNow+=50000;studioPulse()');assert.equal(r('e.wall'),r('stopped'));
for(const rate of [1,2,4]){
 r(`m.running=true;m.rink.mode='full';setOnIceSpeed(${rate});globalThis.startFull=e.wall;for(let i=0;i<20;i++){virtualNow+=50;studioPulse()}`);
 assert.ok(Math.abs(r('e.wall-startFull')-rate)<.11,rate+'x full-match pace follows the real production clock');
}
r('studioStep=originalStep');
// Playback choices persist on disk and are used when the next match is created.
r('m.running=false;setOnIceSpeed(2);setSpeed(3);rinkMode("extended");save();');
const restored=boot(a.storage.value);
assert.equal(restored.run('studioOnIceRate()'),2);assert.equal(restored.run('studioFastChoice()'),3);
restored.run('state.live=null;createMatch();');
assert.equal(restored.run('state.live.rink.mode'),'extended');assert.equal(restored.run('studioOnIceRate()'),2);assert.equal(restored.run('studioFastChoice()'),3);
console.log('PASS: independent visible pacing, safe old-save default, persistence, readable tails, pure observations, actual timer transition, mode/speed reset and paused clock.');
