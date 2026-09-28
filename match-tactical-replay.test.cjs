'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const context=vm.createContext({});vm.runInContext(fs.readFileSync('match-3d.js','utf8'),context);const R=vm.runInContext('Match3D',context);
function scene(wall=10){return {time:wall,wall,phase:'attack',owner:0,carrier:null,puck:{x:49,y:15},actors:[
 {id:'s',name:'Skytt',side:0,role:'LW',x:46,y:15,vx:0,vy:0},
 {id:'screen',name:'Skymmande spelare',side:0,role:'C',x:52,y:15,vx:0,vy:0},
 {id:'g',name:'Målvakt',side:1,role:'G',x:55,y:15,vx:0,vy:0}],
 flight:{kind:'shot',side:0,from:'s',start:{x:46,y:15},end:{x:55,y:15},elapsed:.1,duration:.4}};}
test('tactical overlays use observed passing lanes, screens and actual goalie travel',()=>{
 const before=scene(9.6);before.flight={kind:'pass',from:'screen',to:'s',side:0,start:{x:48,y:24},end:{x:46,y:15}};before.actors[2].y=17;
 const now=scene(),frames=[before,now],saved=JSON.stringify(frames),a=R.replayAnalysis(frames,now);
 assert.ok(a.lines.some(l=>l.kind==='pass'));assert.ok(a.lines.some(l=>l.kind==='keeper'));assert.ok(a.rings.some(r=>r.kind==='screen'&&r.x===52));assert.ok(a.notes.some(n=>n.includes('2,0 m')));
 const mesh=R.analysisGeometry(a);assert.ok(mesh.length>0&&mesh.every(Number.isFinite));assert.ok(mesh.length/9<5000);assert.equal(JSON.stringify(frames),saved);
});
test('future contact frames do not leak into a paused tactical replay',()=>{
 const now=scene(),future=scene(10.2);future.actors[0].contactAction={kind:'block',at:10.2,spot:{x:49,y:15,z:.3}};
 const a=R.replayAnalysis([now,future],now);assert.ok(!a.rings.some(r=>r.kind==='contact'));assert.ok(!a.notes.some(n=>n.includes('blockerar')));
 const later=R.replayAnalysis([now,future],future);assert.ok(later.rings.some(r=>r.kind==='contact'));
 const interpolated=R.sample(future,now,.25);assert.equal(interpolated.actors[0].contactAction,null);
 const legacy=R.replayAnalysis([{time:0,owner:0,puck:{x:30,y:15},actors:[]}],{time:0,owner:0,puck:{x:30,y:15},actors:[]});assert.ok(legacy.notes.length);assert.equal(legacy.lines.length,0);
});
test('replay pause, seeking, shot jump and overlays never advance or change the saved match',()=>{
 const {boot}=require('./scripts/career-test-fixture.cjs'),app=boot();app.run("startCareerWithClub('HV71');state.calendar.date=calendarTarget();startMatch();for(let i=0;i<5000&&!studioEngine().latestReplay;i++){if(!state.live.running){while(medicalPending())medicalDecisionAccept();startMatch();}studioStep();}pauseMatch();studioReplay();");
 const before=app.run('JSON.stringify(state.live)');app.run('studioPauseReplay();studioReplayFrame(1000);studioReplayFrame(3000);');assert.equal(app.run('studioReplayState.elapsed'),0);
 app.run('studioReplayMoment()');assert.ok(app.run('studioReplayState.paused'));assert.ok(app.run('studioReplayState.elapsed')>0);
 app.run('studioSeekReplay(999)');assert.equal(app.run('studioReplayState.elapsed'),app.run('Number((studioReplayState.frames.at(-1).wall-studioReplayState.frames[0].wall).toFixed(6))'));
 assert.equal(app.run('studioReplayPlayLabel()'),'Spela igen');app.run('studioPauseReplay()');assert.equal(app.run('studioReplayState.elapsed'),0);assert.equal(app.run('studioReplayState.paused'),false);
 app.run('studioToggleReplayAnalysis()');assert.equal(app.run('studioReplayState.analysis'),false);
 app.run('studioSeekReplay(-1);studioPauseReplay();studioReplayFrame(5000);studioReplayFrame(5500)');assert.ok(app.run('studioReplayState.elapsed')>0);
 assert.equal(app.run('JSON.stringify(state.live)'),before);assert.ok(app.run("studioView().includes('Reprisförlopp')"));
});
test('a shot completed between captures still has its recorded release lane',()=>{
 const f=scene();f.flight=null;f.actors[0].action={kind:'shot',at:9.95,origin:{x:46,y:15},target:{x:54.5,y:15},style:'wrist'};
 const analysis=R.replayAnalysis([f],f);assert.ok(analysis.lines.some(l=>l.kind==='shot'));assert.ok(R.analysisGeometry(analysis).length>0);
});
test('windup and physical contacts produce connected, paused poses with finite equipment',()=>{
 for(const kind of ['check','pin','poke','protect','block','tip','bobble','recover']){
  const f=scene(),a=f.actors[0];a.contactAction={kind,at:9.8,spot:{x:46.65,y:15.3,z:kind==='tip'?.6:0},direction:.4,strength:.8};a.weight=100;a.height=198;
  const p=R.pose(f,a);assert.equal(p.state,kind);assert.equal(JSON.stringify(R.pose(f,a)),JSON.stringify(p));assert.ok(p.blade.every(Number.isFinite));
  const mesh=R.figures(f,[{primary:'#102438',color:'#e4c75b'},{primary:'#244b36',color:'#ffffff'}]);assert.ok(mesh.every(Number.isFinite));
 }
 const f=scene(),a=f.actors[0];f.carrier=a.id;f.puck={x:a.x,y:a.y};a.windup={at:9.8,duration:.32,style:'slap',target:{x:56.5,y:15}};
 const p=R.pose(f,a);assert.equal(p.state,'windup');assert.ok(p.blade[1]>.2);assert.equal(JSON.stringify(R.pose(f,a)),JSON.stringify(p));
 const small=R.pose(f,{...a,height:175,weight:75}),large=R.pose(f,{...a,height:198,weight:100});assert.ok(large.headRise>small.headRise);assert.ok(large.bodyWidth>small.bodyWidth);
});
