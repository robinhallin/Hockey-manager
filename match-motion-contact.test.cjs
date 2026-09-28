'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const H=require('./scripts/current-match-engine.cjs'),rosters=require('./match-lab-rosters'),Motion=require('./match-broadcast-motion');
const context=vm.createContext({});
for(const file of ['match-broadcast-motion.js','match-3d.js'])vm.runInContext(fs.readFileSync(file,'utf8'),context);
const R=vm.runInContext('Match3D',context);

test('a board bounce is visible at its actual contact time, not the chord between ticks',()=>{
 const m=new H.Match(rosters,{seed:912});m.wall=m.time=10;m.stoppage=0;m.carrier=null;m.flight=null;m.puckPath=[];
 m.puck={x:30,y:.4,z:0};m.puckVelocity={x:0,y:-20,z:0};m.recordPuckPoint(m.wall);
 const before=m.presentationFrame();m.wall+=H.STEP;m.moveFreePuck(H.STEP);const frame=m.presentationFrame();
 const hit=m.effects.find(e=>e.kind==='board');assert.ok(hit.at>before.wall&&hit.at<frame.wall);
 const fraction=(hit.at-before.wall)/H.STEP,shown=R.sample(frame,before,fraction);
 assert.ok(Math.abs(shown.puck.y-hit.y)<.005,'rendered puck reaches the recorded board contact');
 const chord=before.puck.y+(frame.puck.y-before.puck.y)*fraction;
 assert.ok(chord-shown.puck.y>.15,'endpoint interpolation would miss this bounce');
 assert.ok(!R.sample(frame,before,fraction/2).effects.some(e=>e.kind==='board'),'sound/effect does not start before impact');
 assert.ok(frame.puck.y>hit.y&&m.puckVelocity.y>0,'the remaining tick follows the rebound');
 assert.equal(m._contactWall,undefined,'substep timestamp cannot leak into a later action');
});

test('a pass handoff changes the carrier and both stick contacts at the recorded reception',()=>{
 const a={id:'a',role:'C',side:0,x:20,y:15},b={id:'b',role:'LW',side:0,x:25,y:15};
 const before={wall:10,time:10,reset:1,carrier:'a',actors:[a,b],puck:{x:20,y:15}};
 const frame={...before,wall:10.1,time:10.1,carrier:'b',actors:[a,{...b,action:{kind:'receive',at:10.07,origin:{x:24,y:15},target:{x:20,y:15}}},{id:'c',x:40,y:8,contactAction:{kind:'protect',at:10.01}}],puck:{x:24,y:15}};
 for(const [alpha,holder] of [[.3,'a'],[.9,'b']]){
  const shown=R.sample(frame,before,alpha);assert.equal(shown.carrier,holder);
  assert.deepEqual(Array.from(shown.actors.filter(a=>a.contact).map(a=>a.id)),[holder]);
 }
});

test('sustained skating has pushes, braking settles into glide and stopped skates cannot advance',()=>{
 let moving,coasting;
 for(let i=0;i<25;i++){
  moving=Motion.advance(moving,{speed:5,acceleration:0,turn:0,distance:.5,dt:.1});
  coasting=Motion.advance(coasting,{speed:5,acceleration:-.5,turn:0,distance:.5,dt:.1});
 }
 assert.ok(moving.drive>.3&&coasting.drive<.01);
 const stop=Motion.advance(moving,{speed:0,acceleration:0,turn:0,distance:0,dt:10});
 assert.equal(stop.phase,moving.phase);assert.ok(stop.drive<.001);
 const recover=[],loaded=[];
 for(let phase=0;phase<1;phase+=.025){const foot=Motion.cycle(0,-1,{...moving,phase});(foot.lift>.04?recover:loaded).push(foot.load);}
 assert.ok(recover.length&&Math.max(...recover)<.15&&Math.max(...loaded)===1,'raised return skate cannot claim an ice plant');
});

test('new gait and contact recordings survive a save without changing hockey decisions',()=>{
 const m=new H.Match(rosters,{seed:912,scenario:'rush'});for(let i=0;i<120;i++)m.step();
 const copy=Object.assign(Object.create(H.Match.prototype),JSON.parse(JSON.stringify(m)));
 for(const a of copy.actors)a.player=copy.teams[a.side].players.find(p=>p.id===a.player.id);
 for(let i=0;i<180;i++){m.step();copy.step();}
 assert.deepEqual(copy.score,m.score);assert.equal(copy.rng,m.rng);assert.deepEqual(copy.stats,m.stats);
 assert.equal(JSON.stringify(copy.presentationFrame()),JSON.stringify(m.presentationFrame()));
 assert.ok(m.history.every((f,i,a)=>!i||Math.abs(f.wall-a[i-1].wall-.1)<1e-6),'short actions are captured every simulation tick');
 const saved=JSON.stringify(m);for(let i=0;i<30;i++){const shown=R.sample(m.history.at(-1),m.history.at(-2),i/30);for(const a of shown.actors)R.pose(shown,a);}
 assert.equal(JSON.stringify(m),saved,'frame rate and repeated rendering cannot mutate the authoritative match');
});

test('foreground rendering hitches retain elapsed time and the same fixed-step result',()=>{
 const app=require('./scripts/career-test-fixture.cjs').boot();
 app.run("startCareerWithClub('HV71');state.calendar.date=calendarTarget();startMatch();pauseMatch();globalThis.initial=JSON.stringify(state);globalThis.realNow=Date.now;globalThis.clock=100000;Date.now=()=>clock;");
 const run=interval=>app.run(`state=JSON.parse(initial);state.live.rink.mode='full';state.live.rink.onIceRate=1;globalThis.clock=100000;studioRestartClock();state.live.running=true;studioLastSave=clock;for(let i=0;i<5000/${interval};i++){clock+=${interval};studioPulse(true);}JSON.stringify({tick:studioEngine().tick,rng:studioEngine().rng,score:studioEngine().score,stats:studioEngine().stats,puck:studioEngine().puck})`);
 const smooth=run(20),hitches=run(250);assert.equal(hitches,smooth);assert.ok(JSON.parse(hitches).tick>=49,'five real seconds cannot shrink to two seconds at 4 fps');
 app.run('Date.now=realNow');
});

test('replay scoreboard uses the recorded period, strength and venue order',()=>{
 const app=require('./scripts/career-test-fixture.cjs').boot();
 const board=JSON.parse(app.run("JSON.stringify(studioRecordedScoreboard({time:1241,period:2,periodStart:1200,score:[2,1],strength:[4,5],penalties:[{name:'Spelare',remaining:37}],actors:[]},1))"));
 assert.deepEqual(board.score,[1,2]);assert.equal(board.clock,'Period 2 · 0:41');assert.equal(board.strength,'4 mot 5 · Boxplay');assert.equal(board.penalties,'Spelare 0:37');
 const before={time:10,wall:10,phase:'attack',reset:1,score:[0,0],carrier:null,puck:{x:56,y:15},actors:[],strength:[5,4],penalties:[{remaining:10}]};
 const frame={...before,time:10.1,wall:10.1,score:[1,0],strength:[5,5],penalties:[],puck:{x:56.5,y:15},effects:[{kind:'goal',at:10.08}]};
 const early=R.sample(frame,before,.5),goal=R.sample(frame,before,.9);
 assert.deepEqual(Array.from(early.score),[0,0]);assert.deepEqual(Array.from(early.strength),[5,4]);assert.deepEqual(Array.from(goal.score),[1,0]);assert.deepEqual(Array.from(goal.strength),[5,5]);
});
