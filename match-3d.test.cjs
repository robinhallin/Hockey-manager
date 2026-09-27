'use strict';
const assert=require('node:assert/strict'),test=require('node:test'),fs=require('node:fs'),vm=require('node:vm');
const context=vm.createContext({});vm.runInContext(fs.readFileSync('match-3d.js','utf8'),context);const renderer=vm.runInContext('Match3D',context);
test('3D interpolation follows actual player IDs and leaves snapshots unchanged',()=>{
 const previous={time:10,puck:{x:5,y:7},actors:[{id:'a',x:4,y:6},{id:'b',x:20,y:21}]};
 const frame={time:10.2,carrier:'b',puck:{x:9,y:11},actors:[{id:'b',x:22,y:23},{id:'c',x:40,y:15},{id:'a',x:6,y:8}]};
 const original=JSON.stringify([frame,previous]),result=renderer.sample(frame,previous,.5);
 assert.equal(JSON.stringify([frame,previous]),original);assert.equal(result.actors[0].x,21);assert.equal(result.actors[1].x,40);assert.equal(result.actors[2].x,5);assert.equal(result.puck.x,7);assert.equal(result.carrier,'b');assert.equal(result.time,10.1);
});
test('both perspective cameras keep the playable rink inside common desktop surfaces',()=>{
 for(const ratio of [1.3,1.8,2.4])for(const mode of ['tv','overhead'])for(const p of [[3,0,4],[57,0,4],[3,0,26],[57,0,26],[30,0,0],[30,0,30]]){
  const s=renderer.project(p,renderer.camera(ratio,mode));assert.ok(s.x>=0&&s.x<=1&&s.y>=0&&s.y<=1,`${mode} ${ratio} ${p}: ${JSON.stringify(s)}`);
 }
});
test('selecting camera and presentation preserves match engine and career save',()=>{
 const {boot}=require('./scripts/career-test-fixture.cjs'),app=boot();
 app.run("startCareerWithClub('HV71');state.calendar.date=calendarTarget();startMatch();state.page='match';for(let i=0;i<40;i++)studioStep();pauseMatch();");
 const before=app.run('JSON.stringify(state.live)');
 app.run("studioSetVisual('3d');studioSetCamera('overhead');studioSetVisual('2d');");
 assert.equal(app.run('JSON.stringify(state.live)'),before);
 assert.ok(app.run("studioView().includes('3D · test')"));
});

test('skating uses real travelled distance; paused/stationary poses do not pedal',()=>{
 const actor={id:'s',role:'C',side:0,x:30,y:15,vx:3,vy:0,travelled:1};
 const frame={time:10,puck:{x:30,y:15},carrier:'s',actors:[actor]};
 const a=renderer.pose(frame,actor),b=renderer.pose({...frame,time:999},actor);
 assert.equal(JSON.stringify(a.feet),JSON.stringify(b.feet));assert.equal(a.blade[0],30);assert.equal(a.blade[2],15);
 assert.notEqual(JSON.stringify(a.feet),JSON.stringify(renderer.pose(frame,{...actor,travelled:1.8}).feet));
 const stopped=renderer.pose(frame,{...actor,vx:0,vy:0});assert.equal(stopped.stride,0);
});
test('keeper tracks actual puck and blocks only an approaching opposing shot',()=>{
 const a={id:'g',role:'G',side:1,x:54.5,y:15,vx:0,vy:0};
 const frame={time:10,puck:{x:51,y:13},carrier:null,actors:[a],flight:{kind:'shot',side:0,from:'s',start:{x:43,y:13},end:{x:56.5,y:15},elapsed:.3,duration:.5}};
 const p=renderer.pose(frame,a);assert.equal(p.angle,Math.atan2(-2,-3.5));assert.ok(p.drop>0);
 assert.equal(renderer.pose({...frame,flight:{...frame.flight,kind:'pass'}},a).drop,0);
 assert.equal(renderer.pose({...frame,flight:{...frame.flight,side:1}},a).drop,0);
 assert.equal(renderer.pose({...frame,puck:{x:30,y:15}},a).drop,0);
});
test('release follows observed passer/shooter identity and does not animate a teammate',()=>{
 const a={id:'s',role:'C',side:0,x:30,y:15,vx:0,vy:0};
 const frame={time:10,puck:{x:35,y:15},carrier:null,flight:{kind:'shot',from:'s',side:0,start:{x:30,y:15},end:{x:56.5,y:15},elapsed:.1,duration:1}};
 assert.ok(renderer.pose(frame,a).release>0);assert.equal(renderer.pose(frame,{...a,id:'other'}).release,0);
 assert.equal(renderer.pose({...frame,flight:{...frame.flight,elapsed:.8}},a).release,0);
});
test('faceoff resets and skipped highlights do not interpolate across the rink',()=>{
 const old={time:10,phase:'stoppage',puck:{x:56,y:15},actors:[{id:'a',x:56,y:15}]};
 const next={time:10,phase:'faceoff',puck:{x:30,y:15},actors:[{id:'a',x:30,y:15}]};
 assert.equal(renderer.sample(next,old,.1).puck.x,30);assert.equal(renderer.sample(next,old,.1).actors[0].x,30);
 for(const x of [0,30,60])for(const y of [0,15,30])for(const ratio of [1.3,2.4,3.2]){const p=renderer.project([x,0,y],renderer.camera(ratio,'follow',{x,y}));assert.ok(p.x>0&&p.x<1&&p.y>0&&p.y<1);}
});
test('live and replay snapshots expose identical motion facts without hidden shot rolls',()=>{
 const {Match}=require('./match-simulation'),rosters=require('./match-lab-rosters');const m=new Match(rosters,{scenario:'attack'});
 for(let i=0;i<40;i++)m.step();const a=m.actors.find(a=>a.side===0&&a.role!=='G');
 m.shoot(a);const frame=m.presentationFrame();assert.ok(frame.flight);assert.equal(frame.flight.from,a.id);assert.equal(frame.flight.elapsed,0);
 assert.equal('shot' in frame.flight,false);assert.equal('outcome' in frame.flight,false);assert.equal('finishRoll' in frame.flight,false);
 m.tick=2;m.capture();assert.deepEqual(m.snapshot(),frame);assert.ok(m.actors.some(a=>a.travelled>0));
 const saved=JSON.stringify(m),copy=Object.assign(Object.create(Match.prototype),JSON.parse(saved));assert.deepEqual(copy.presentationFrame(),frame);
});

test('older replay frames without motion/flight metadata stay finite and do not invent actions',()=>{
 const f={time:10,phase:'attack',puck:{x:53,y:15},actors:[{id:'g',role:'G',side:1,x:54,y:15}],flight:{kind:'shot',start:{x:40,y:15},end:{x:56.5,y:15}}};
 const sampled=renderer.sample({...f,time:10.2},f,.5),p=renderer.pose(sampled,sampled.actors[0]);
 assert.equal(sampled.flight.elapsed,undefined);assert.equal(p.drop,0);assert.equal(p.release,0);
 assert.ok(p.feet.flat().concat(p.blade).every(Number.isFinite));
});

test('rounded models have finite geometry and a bounded mesh budget for a real on-ice unit',()=>{
 const {Match}=require('./match-simulation'),rosters=require('./match-lab-rosters'),m=new Match(rosters,{scenario:'attack'});
 for(let i=0;i<20;i++)m.step();const frame=m.presentationFrame(),snapshot=JSON.stringify(frame);
 const mesh=renderer.figures(frame,[{primary:'#18294a',color:'#dfc34c'},{primary:'#16472b',color:'#eeeeee'}]);
 assert.ok(mesh.length/9>12000&&mesh.length/9<50000,'bounded dynamic vertex count: '+mesh.length/9);
 assert.ok(mesh.every(Number.isFinite));assert.equal(JSON.stringify(frame),snapshot);
 for(let i=0;i<mesh.length;i+=9)assert.ok(mesh[i+1]>=-.001&&mesh[i+1]<2.5,'vertices remain near player height');
});
test('puck height and observed save actions interpolate without exposing a future save or crowd response',()=>{
 const a={id:'g',side:1,role:'G',x:55,y:15,vx:0,vy:0},before={time:10,wall:10,phase:'attack',puck:{x:52,y:15,z:.2},actors:[a],effects:[]};
 const next={...before,time:10.2,wall:10.2,puck:{x:54,y:15,z:.8},actors:[{...a,keeperAction:{kind:'save',style:'glove',at:10.15,contact:{x:54,y:15,z:.8},origin:{x:55,y:15},facing:Math.PI}}],effects:[{id:1,kind:'save',side:1,at:10.15}]};
 const sample=renderer.sample(next,before,.5);assert.equal(sample.puck.z,.5);assert.equal(sample.actors[0].keeperAction,null);assert.equal(sample.effects.length,0);assert.equal(renderer.crowdReaction(sample,1),0);
 const after=renderer.sample(next,before,1);assert.equal(after.actors[0].keeperAction.kind,'save');assert.equal(after.effects.length,1);
});
test('keeper glove, blocker, butterfly and stick saves recover from actual contact while pause freezes the pose',()=>{
 const {Match}=require('./match-simulation'),rosters=require('./match-lab-rosters'),seen=new Set();
 for(const placement of [.005,.20,.65,.85]){
  const m=new Match(rosters,{scenario:'attack'});m.time=m.wall=20;m.stoppage=0;
  for(const a of m.actors)if(a.role!=='G'){a.x=30;a.y=2;}
  const a=m.skaters(0)[0],g=m.actors.find(a=>a.side===1&&a.role==='G');Object.assign(a,{x:50,y:15});Object.assign(g,m.goalieTarget(1,a));m.puck={x:50,y:15};m.carrier=a.id;
  const rolls=[.99,m.shotModel(a).onTarget*placement,1];m.random=()=>rolls.shift()??0;m.shoot(a);m.resolveFlight(m.flight.duration);
  const frame=m.presentationFrame(),keeper=frame.actors.find(a=>a.id===g.id),pose=renderer.pose(frame,keeper);seen.add(pose.style);
  assert.equal(keeper.keeperAction.kind,'save');assert.equal(JSON.stringify(renderer.pose(frame,keeper)),JSON.stringify(pose));
  const recovery=renderer.pose({...frame,wall:20.8},keeper);assert.equal(recovery.state,'recovering');assert.ok(recovery.recovery<pose.recovery);
  const done=renderer.pose({...frame,wall:22},keeper);assert.equal(done.recovery,0);assert.equal(done.drop,0);
  for(const arm of pose.arms){assert.ok(arm.hand.every(Number.isFinite));assert.ok(separation(arm.shoulder,arm.hand)<=.901);}
  const mesh=renderer.figures(frame,[]);assert.ok(mesh.every(Number.isFinite));for(let i=1;i<mesh.length;i+=9)assert.ok(mesh[i]>=-.001,'keeper equipment remains above the ice');
 }
 for(const style of ['stick','butterfly','glove','blocker'])assert.ok(seen.has(style),style);
});
test('fans react to recorded events for their own team and old frames remain quiet',()=>{
 const f={time:10,wall:10,effects:[{id:1,kind:'goal',side:1,at:9.7}]},snapshot=JSON.stringify(f);
 assert.ok(renderer.crowdReaction(f,1)>renderer.crowdReaction(f,0)*5);assert.equal(renderer.crowdReaction({...f,wall:9},1),0);assert.equal(renderer.crowdReaction({...f,wall:13},1),0);
 assert.equal(renderer.crowdReaction({time:10,eventType:'goal'},1),0,'a retained caption never invents a new cheer');
 const teams=[{primary:'#113366',color:'#ddbd55'},{primary:'#aa2222',color:'#eeeeee'}],home=renderer.crowd(f,teams,0),away=renderer.crowd(f,teams,1);
 assert.ok(home.every(Number.isFinite)&&home.length/9<30000);assert.notDeepEqual(home,away);assert.equal(JSON.stringify(f),snapshot);
});
test('similar club colors receive distinguishable kit colors, including two light kits',()=>{
 for(const pair of [['#132940','#14314b'],['#eeeeee','#f1f0ef']]){
  const kits=renderer.kits(pair.map(primary=>({primary,color:'#d7b853'})));
  const contrast=Math.hypot(...kits[0].jersey.map((v,i)=>v-kits[1].jersey[i]));assert.ok(contrast>.8);
 }
});
test('large-rink mode keeps match state untouched and is limited to active 3D presentation',()=>{
 const {boot}=require('./scripts/career-test-fixture.cjs'),app=boot();app.run("startCareerWithClub('HV71');state.calendar.date=calendarTarget();startMatch();pauseMatch();state.page='match';studioSetVisual('3d');");
 const stateBefore=app.run('JSON.stringify(state.live)');app.run('studioToggleRink();');
 assert.ok(app.run("matchDeskView().includes('md-rink-focus')"));assert.ok(app.run("studio3DControls().includes('Visa coachbänken')"));
 assert.equal(app.run('JSON.stringify(state.live)'),stateBefore);
 app.run("studioSetVisual('2d');");assert.equal(app.run("matchDeskView().includes('md-rink-focus')"),false);
});
test('tracking eases in simulation time, freezes at pause and resets at discontinuities',()=>{
 const first={time:10,phase:'attack',puck:{x:30,y:15}},prior=renderer.trackPuck(first,null);
 const next={time:10.1,phase:'attack',puck:{x:34,y:16}},snapshot=JSON.stringify([next,prior]),tracked=renderer.trackPuck(next,prior);
 assert.ok(tracked.x>30&&tracked.x<34);assert.equal(JSON.stringify([next,prior]),snapshot);
 assert.equal(renderer.trackPuck(next,tracked).x,tracked.x,'paused focus does not drift');
 assert.equal(renderer.trackPuck({...next,time:20},tracked).x,34,'skip resets camera');
 assert.equal(renderer.trackPuck({...next,time:9},tracked).x,34,'replay rewind resets camera');
 assert.equal(renderer.trackPuck({...next,phase:'faceoff'},tracked).x,34,'faceoff resets camera');
});
test('zoom and tracking keep the actual puck visible through fast changes and at every board',()=>{
 for(const mode of ['tv','overhead','follow'])for(const zoom of [.8,1,1.2,1.5])for(const ratio of [1.3,1.8,2.4,3.2]){
  let prior=null,time=0;
  for(const x of [0,15,60,45,30,3.5,56.5])for(const y of [0,15,30,7,23]){
   const frame={time:time+=.1,phase:'attack',puck:{x,y}},view=renderer.cameraFrame(ratio,mode,frame,prior,zoom);prior=view.tracked;
   const p=renderer.project([x,.1,y],view.matrix);assert.ok(p.x>0&&p.x<1&&p.y>0&&p.y<1,JSON.stringify({mode,zoom,ratio,x,y,p}));
  }
 }
});
test('zoom and puck visibility controls preserve live and replay state',()=>{
 const {boot}=require('./scripts/career-test-fixture.cjs'),app=boot();
 app.run("startCareerWithClub('HV71');state.calendar.date=calendarTarget();startMatch();pauseMatch();studioSetVisual('3d');studioReplayState={frames:[studioFrame(studioEngine())],elapsed:0,lastNow:null};");
 const before=app.run('JSON.stringify([state.live,studioReplayState])');
 app.run('studioSetZoom(9);studioTogglePuck();');assert.equal(app.run('studioZoom3D'),1.5);assert.equal(app.run('studioPuckMarker3D'),false);
 app.run('studioSetZoom(NaN);');assert.equal(app.run('studioZoom3D'),1.5);
 app.run('studioSetZoom(-5);');assert.equal(app.run('studioZoom3D'),.8);
 app.run('studioSetZoom(1);studioTogglePuck();');assert.equal(app.run('JSON.stringify([state.live,studioReplayState])'),before);
});

const separation=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
test('recorded skating and stick actions cannot change decisions, physics or the random stream',()=>{
 const {Match}=require('./match-simulation'),rosters=require('./match-lab-rosters');
 const facts=m=>({rng:m.rng,score:m.score,events:m.events,stats:m.stats,puck:m.puck,carrier:m.carrier,shots:m.shots,
  actors:m.actors.map(a=>({id:a.id,x:a.x,y:a.y,vx:a.vx,vy:a.vy,energy:a.player.energy,travelled:a.travelled}))});
 for(const scenario of ['attack','rush','pp','pk','period']){
  const shown=new Match(rosters,{seed:227,scenario,duration:25}),plain=new Match(rosters,{seed:227,scenario,duration:25});
  plain.recordMotion=()=>{};plain.recordAction=()=>{};
  while(!shown.finished){shown.step();plain.step();assert.deepEqual(facts(shown),facts(plain));}
 }
});
test('retreating defenders face the play; acceleration, glide and stops use distinct stances',()=>{
 const {Match}=require('./match-simulation'),m=new Match(require('./match-lab-rosters'),{scenario:'rush'}),a=m.skaters(1)[0];
 Object.assign(a,{x:49,y:15,vx:3,vy:0,travelled:1,status:'playing'});m.owner=0;m.puck={x:43,y:15};
 for(let i=0;i<20;i++)m.recordMotion(a,3,0,.1);
 const f=m.presentationFrame(),actor=f.actors.find(x=>x.id===a.id),back=renderer.pose(f,actor);
 assert.equal(back.state,'backward');assert.ok(Math.cos(back.angle)*a.vx<0,'chest faces against retreat velocity');
 const base={...actor,motion:{...actor.motion,heading:0,backward:0,turn:0}};
 const drive=renderer.pose(f,{...base,motion:{...base.motion,acceleration:2.5}}),glide=renderer.pose(f,{...base,motion:{...base.motion,acceleration:0}}),stop=renderer.pose(f,{...base,motion:{...base.motion,acceleration:-3}});
 assert.equal(drive.state,'skating');assert.equal(glide.state,'gliding');assert.equal(stop.state,'braking');
 assert.ok(drive.drive>glide.drive*2);assert.ok(stop.footAngles.every(angle=>Math.abs(angle)>1),'both blades turn across movement to brake');
 const still=renderer.pose(f,{...base,vx:0,vy:0});assert.equal(still.stride,0);assert.ok(still.feet.every(p=>p[1]===.12));
 const next=renderer.pose({...f,time:f.time+20,wall:f.wall+20},base);assert.deepEqual(next.feet,renderer.pose(f,base).feet,'glide never uses wall-clock pedalling');
});
test('joint lengths and two-handed stick grip hold through real skating, passes and both shot hands',()=>{
 const {Match}=require('./match-simulation'),m=new Match(require('./match-lab-rosters'),{seed:227,scenario:'rush',duration:40});
 const states=new Set();let poses=0;
 while(!m.finished){
  m.step();if(m.tick%3)continue;const frame=m.presentationFrame();
  for(const a of frame.actors.filter(a=>a.role!=='G'))for(const shoots of ['L','R']){
   const p=renderer.pose(frame,{...a,shoots});states.add(p.state);poses++;
   for(const leg of p.legs){assert.ok(Math.abs(separation(leg.hip,leg.knee)-.45)<1e-6);assert.ok(Math.abs(separation(leg.knee,leg.ankle)-.46)<1e-6);}
   for(const arm of p.arms){
    assert.ok(Math.abs(separation(arm.shoulder,arm.elbow)-.4)<1e-6);assert.ok(Math.abs(separation(arm.elbow,arm.hand)-.42)<1e-6);
    assert.ok(Math.abs(separation(p.heel,arm.hand)+separation(arm.hand,p.shaftTop)-1.38)<1e-6,'gloves stay on the straight shaft');
   }
   assert.ok(Math.abs(separation(p.heel,p.shaftTop)-1.38)<1e-6);assert.ok(p.feet.every(foot=>foot[1]>=.12));
   if(a.id===frame.carrier)assert.ok(separation(p.blade,[frame.puck.x,.08,frame.puck.y])<1e-6,'carried puck stays on the blade');
  }
 }
 assert.ok(poses>1000);for(const state of ['skating','gliding','backward','braking','crossover'])assert.ok(states.has(state),state+' occurs in a real sequence');
});
test('pass receivers prepare only for the incoming puck and actual control records the catch',()=>{
 const {Match}=require('./match-simulation'),m=new Match(require('./match-lab-rosters'),{scenario:'attack'});
 const a=m.skaters(0)[0],b=m.skaters(0)[1];Object.assign(a,{x:44,y:15,vx:0,vy:0});Object.assign(b,{x:47,y:15,vx:0,vy:0});
 m.puck={x:a.x,y:a.y};m.carrier=a.id;m.passChance=()=>1;assert.ok(m.pass(a,b));
 m.wall+=.1;m.resolveFlight(.1);const f=m.presentationFrame(),receiver=f.actors.find(x=>x.id===b.id);
 assert.ok(renderer.pose(f,receiver).prepare>0);assert.equal(renderer.pose(f,{...receiver,id:'unrelated'}).prepare,0);
 m.wall+=.2;m.resolveFlight(.2);const received=m.presentationFrame(),actor=received.actors.find(x=>x.id===b.id);
 assert.equal(received.carrier,b.id);assert.equal(actor.action.kind,'receive');assert.ok(renderer.pose(received,actor).receiving>0);
 assert.equal(received.actors.find(x=>x.id===a.id).action.kind,'pass','passer completes release after flight ends');
});
test('release continues after a short shot resolves and uses recorded wrist/slap/one-timer style',()=>{
 const a={id:'s',side:0,role:'C',x:44,y:15,vx:0,vy:0,action:{kind:'shot',at:9.9,origin:{x:44,y:15},target:{x:56.5,y:15},style:'wrist'}};
 const frame={time:10,wall:10.1,phase:'stoppage',carrier:null,puck:{x:56.5,y:15},flight:null};
 const wrist=renderer.pose(frame,a),slap=renderer.pose(frame,{...a,action:{...a.action,style:'slap'}}),direct=renderer.pose(frame,{...a,action:{...a.action,style:'one-timer'}});
 assert.ok(wrist.release>0);assert.ok(slap.blade[1]>direct.blade[1]&&direct.blade[1]>wrist.blade[1]);
 assert.deepEqual(renderer.pose(frame,a).blade,wrist.blade,'pausing freezes follow-through');
 assert.equal(renderer.pose({...frame,wall:11},a).release,0,'stoppage wall time completes action even with the match clock frozen');
});
test('interpolation wraps facing through pi and waits for the recorded release timestamp',()=>{
 const a={id:'s',side:0,role:'C',x:30,y:15,vx:-3,vy:0,travelled:1,motion:{heading:3.10,travel:3.10,backward:0,turn:.1,acceleration:0}};
 const before={time:10,wall:10,phase:'attack',carrier:'s',puck:{x:30,y:15},actors:[a],flight:null};
 const frame={...before,time:10.2,wall:10.2,carrier:null,puck:{x:31,y:15},actors:[{...a,motion:{...a.motion,heading:-3.10,travel:-3.10},action:{kind:'pass',at:10.1,origin:{x:30,y:15},target:{x:40,y:15}}}],flight:{kind:'pass',from:'s',to:'r',side:0,start:{x:30,y:15},end:{x:40,y:15},elapsed:.1,duration:.6}};
 const early=renderer.sample(frame,before,.2),middle=renderer.sample(frame,before,.5);
 assert.equal(early.flight,null);assert.equal(renderer.pose(early,early.actors[0]).release,0);
 assert.ok(Math.abs(middle.actors[0].motion.heading)>3,'rotation takes the short route');
 assert.ok(renderer.pose(middle,middle.actors[0]).release>.9);
});
test('replay keeps observed recovery frames immutable and motion survives save/reload',()=>{
 const {Match}=require('./match-simulation'),m=new Match(require('./match-lab-rosters'),{scenario:'attack',duration:60});
 while(!m.latestReplay)m.step();const first=m.latestReplay,original=JSON.stringify(first),ended=first.frames.at(-1).wall;
 for(let i=0;i<4;i++)m.step();
 assert.equal(JSON.stringify(first),original);assert.equal(m.latestReplay.shot,first.shot);assert.ok(m.latestReplay.frames.at(-1).wall>ended);
 assert.ok(m.latestReplay.frames.length<=70);assert.ok(m.latestReplay.frames.every(f=>f.wall<=m.wall),'no unobserved future frames');
 const restored=Object.assign(Object.create(Match.prototype),JSON.parse(JSON.stringify(m))),savedFrame=restored.presentationFrame(),frame=m.presentationFrame();
 assert.deepEqual(savedFrame,frame);
 for(let i=0;i<frame.actors.length;i++)assert.equal(JSON.stringify(renderer.pose(frame,frame.actors[i])),JSON.stringify(renderer.pose(savedFrame,savedFrame.actors[i])));
 const snapshot=m.presentationFrame(),actor=snapshot.actors.find(a=>a.motion);actor.motion.heading=999;
 assert.notEqual(m.actor(actor.id).motion.heading,999,'live snapshots are detached from actors');
 m.faceoffPositions();assert.ok(m.actors.every(a=>!a.motion&&!a.presentationAction),'faceoff reset clears old poses');
});
test('loading a career during shot recovery preserves the exact paused match and replay',()=>{
 const {boot}=require('./scripts/career-test-fixture.cjs'),app=boot();
 app.run("startCareerWithClub('HV71');state.calendar.date=calendarTarget();startMatch();state.page='match';for(let i=0;i<5000&&!studioEngine().latestReplay;i++){if(!state.live.running){while(medicalPending())medicalDecisionAccept();startMatch();}studioStep();}pauseMatch();save();");
 assert.ok(app.run('Boolean(studioEngine().latestReplay)&&studioEngine().replayTailUntil>studioEngine().wall'));
 const digest=text=>require('node:crypto').createHash('sha256').update(text).digest('hex');
 const before=digest(app.run('JSON.stringify(state.live)')),reloaded=boot(app.storage.value);
 assert.equal(digest(reloaded.run('JSON.stringify(state.live)')),before,'hydration must not append a duplicate recovery frame');
});
