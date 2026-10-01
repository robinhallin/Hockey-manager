'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {boot}=require('./scripts/career-test-fixture.cjs');
const app=boot(),r=app.run;
r("startCareerWithClub('HV71');state.calendar.date=calendarTarget();startMatch();pauseMatch();globalThis.e=studioEngine();globalThis.m=state.live;");
function probe(){r("globalThis.h={wall:20,time:500,phase:'attack',focus:true,highlightUntil:99,carrier:null,flight:null,actor:()=>null,score:[0,0],teams:[{},{}],shotQuality:()=>.01,shotContext:()=>({d:20,angle:1.2}),history:[]};");}
test('key highlights reject routine shots and generic focus; extended coverage includes attempts',()=>{
 probe();r("h.flight={kind:'shot',shot:{quality:.02,time:500,playerId:'0:a',context:{d:22,angle:.8}}}");
 assert.equal(r("MatchHighlights.select(h,'highlights')"),null);assert.equal(r("MatchHighlights.select(h,'extended').label"),'Avslut');
 r('h.flight.shot.quality=.16');assert.equal(r("MatchHighlights.select(h,'highlights').label"),'Stor målchans');
 r('h.flight=null');for(const phase of ['attack','counter','faceoff','stoppage']){r(`h.phase='${phase}'`);assert.equal(r("MatchHighlights.select(h,'extended')"),null);}
});
test('every observed goal and post matters; hidden outcomes and old results do not select a clip',()=>{
 probe();r("h.flight={kind:'shot',shot:{quality:.01,time:500,get outcome(){throw Error('hidden outcome read')}}}");assert.equal(r("MatchHighlights.select(h,'highlights')"),null);
 r("h.flight=null;h.lastShot={quality:.01,outcome:'goal',resolvedAt:20,time:500,playerId:'0:a'}");assert.equal(r("MatchHighlights.select(h,'highlights').label"),'Mål');
 r("h.lastShot.outcome='wide';h.lastShot.miss='post'");assert.equal(r("MatchHighlights.select(h,'highlights').label"),'Stolpträff');
 r("h.lastShot.miss='bar'");assert.equal(r("MatchHighlights.select(h,'highlights').label"),'Ribbträff');
 r('h.wall=21');assert.equal(r("MatchHighlights.select(h,'highlights')"),null);
});
test('a dangerous slot rebound counts; a safe rebound to the boards and ordinary save do not',()=>{
 probe();r("h.lastShot={quality:.025,outcome:'save',time:500,resolvedAt:20,context:{d:24}};h.rebound={side:0,time:500,spot:{x:57,y:28}}");assert.equal(r("MatchHighlights.select(h,'highlights')"),null);
 r('h.rebound.spot={x:52,y:15}');assert.equal(r("MatchHighlights.select(h,'highlights').label"),'Farlig retur');
 for(const side of [0,1]){r(`h.rebound=null;h.lastShot=null;h.carrier='a';h.actor=()=>({id:'a',side:${side},x:${side?8:52},y:15});h.shotQuality=()=>.15;h.shotContext=()=>({d:4.5,angle:.2});`);assert.equal(r("MatchHighlights.select(h,'highlights').label"),'Stor målchans');}
});
test('penalties and injury notices survive the event drain without displaying an entire powerplay',()=>{
 probe();for(const type of ['penalty','injury']){r(`globalThis.notice=MatchHighlights.event(h,[{type:'icing',time:499},{type:'${type}',time:500,id:1}]);`);assert.ok(r("MatchHighlights.select(h,'highlights',notice)"));r('h.wall+=1');assert.equal(r("MatchHighlights.select(h,'highlights',notice)"),null);r('h.wall=20');}
 assert.equal(r("MatchHighlights.event(h,[{type:'offside'},{type:'icing'},{type:'entry'},{type:'clear'},{type:'turnover'}])"),null);
});
test('a clear breakaway matters in either direction even with a modest shooter; a defender in the lane excludes it',()=>{
 for(const side of [0,1]){
  probe();r(`h.carrier='a';h.actor=()=>({id:'a',side:${side},x:${side?15:45},y:15});h.shotQuality=()=>.04;h.shotContext=()=>({d:11.5,angle:.2,pressure:.1});h.skaters=()=>[{x:${side?10:50},y:15}];`);
  assert.equal(r("MatchHighlights.select(h,'highlights')"),null);
  r(`h.skaters=()=>[{x:${side?10:50},y:28}]`);assert.equal(r("MatchHighlights.select(h,'highlights').label"),'Friläge');
 }
});
test('repeated danger does not continually renew a tail; a new shot extends the same sequence',()=>{
 probe();r("m.rink.mode='highlights';studioHighlightWindow=null;h.flight={kind:'shot',shot:{quality:.2,time:500,playerId:'0:a'}};studioTrackHighlight(h,m);globalThis.until=studioHighlightWindow.until;");
 for(let i=0;i<35;i++)r('h.wall+=.1;studioTrackHighlight(h,m)');assert.equal(r('studioHighlightWindow.until'),r('until'));assert.equal(r('studioShouldShow(h,m)'),false);
 r('h.flight.shot.time++;studioTrackHighlight(h,m)');assert.equal(r('studioShouldShow(h,m)'),true);
 const before=r('JSON.stringify(h)');for(let i=0;i<10;i++)r('studioHighlightTrigger(h,m);studioShouldShow(h,m);studioPlaybackRate(h,m)');assert.equal(r('JSON.stringify(h)'),before);
});
test('build-up uses existing frames, holds the authoritative clock, respects pause and rejoins without fast-forward debt',()=>{
 r("m.rink.mode='highlights';m.running=true;m.finished=false;m.onIceSpeed=1;studioReplayState=null;studioHighlightWindow=null;e.wall=8;e.time=8;e.carrier=null;e.flight={kind:'shot',shot:{quality:.2,time:8,playerId:'0:a'}};e.lastShot=null;e.history=Array.from({length:81},(_,i)=>({...studioFrame(e),wall:i/10,time:i/10,reset:1,score:[0,0]}));studioTrackHighlight(e,m);globalThis.ledger=JSON.stringify([e.rng,e.wall,e.time,e.score,m.analysis,m.energy]);globalThis.virtualNow=100000;Date=class extends Date{static now(){return virtualNow}};studioLastPulse=virtualNow;studioLastSave=virtualNow;studioLastPaint=virtualNow;virtualNow+=50;studioPulse();");
 assert.equal(r('studioHighlightWindow.lead.duration'),4);assert.equal(r('e.wall'),8);assert.equal(r('studioAccumulator'),0);
 r('studioHighlightFrame(1000);studioHighlightFrame(2000)');assert.equal(r('studioHighlightWindow.lead.elapsed'),1);
 r('m.running=false;studioHighlightFrame(9000)');assert.equal(r('studioHighlightWindow.lead.elapsed'),1);
 r('m.running=true;studioRestartClock(true);studioHighlightFrame(9500);studioHighlightFrame(10000)');assert.equal(r('studioHighlightWindow.lead.elapsed'),1.5);
 r('studioHighlightFrame(12500)');assert.equal(r('studioHighlightWindow.lead'),null);assert.equal(r('JSON.stringify([e.rng,e.wall,e.time,e.score,m.analysis,m.energy])'),r('ledger'));
 r('virtualNow+=50;studioPulse()');assert.ok(r('e.wall')<=8.11,'presentation catch-up must not discharge skipped-time debt');
});
test('a replayed lead-in hides a computed goal until its actual frame, without editing the ledger',()=>{
 r("m.running=true;m.rink.mode='highlights';studioHighlightWindow=null;e.wall=20;e.time=20;e.flight=null;e.carrier=null;e.lastShot={outcome:'goal',quality:.01,time:20,resolvedAt:20,playerId:'0:a'};e.history=Array.from({length:51},(_,i)=>({...studioFrame(e),wall:15+i/10,time:15+i/10,reset:2,score:[i===50?1:0,0]}));m.analysis.events=[{type:'goal',time:20,text:'DO-NOT-SPOIL',scorer:'DO-NOT-SPOIL',own:1,against:0}];studioTrackHighlight(e,m);");
 assert.deepEqual(JSON.parse(r('JSON.stringify(studioHighlightShownFrame().score)')),[0,0]);assert.doesNotMatch(r('matchScoringView()'),/DO-NOT-SPOIL/);
 const ledger=r('JSON.stringify(m.analysis.events)');r('studioHighlightWindow.lead.elapsed=5');assert.match(r('matchScoringView()'),/DO-NOT-SPOIL/);assert.equal(r('JSON.stringify(m.analysis.events)'),ledger);
});
test('pre-roll respects a faceoff boundary and does not revisit previously displayed frames',()=>{
 r("e.wall=20;e.history=Array.from({length:61},(_,i)=>({...studioFrame(e),wall:14+i/10,time:14+i/10,reset:i<40?1:2}));");
 assert.equal(r('MatchHighlights.lead(e,5).frames[0].wall'),18);assert.equal(r('MatchHighlights.lead(e,5,19).frames[0].wall'),19);
 r("rinkMode('full')");assert.equal(r('studioHighlightWindow'),null);assert.equal(r('studioShouldShow(e,m)'),true);r("rinkMode('commentary')");assert.equal(r('studioShouldShow(e,m)'),false);
});
