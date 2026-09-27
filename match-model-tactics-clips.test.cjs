'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const H=require('./scripts/current-match-engine.cjs'),rosters=require('./match-lab-rosters');
const context=vm.createContext({});for(const name of ['match-player-asset.js','match-player-model.js','match-broadcast-motion.js','match-3d.js'])vm.runInContext(fs.readFileSync(name,'utf8'),context);
const Model=vm.runInContext('HockeyPlayerModel',context),R=vm.runInContext('Match3D',context);
function setup(side=0){
 const m=new H.Match(rosters,{seed:912,scenario:'attack'});m.time=m.wall=20;m.stoppage=0;m.owner=side;m.battle=null;m.flight=null;
 for(const team of m.teams){team.attackPattern=null;team.nextPatternAt=0;team.specialPlay=null;}
 for(const a of m.actors){a.vx=a.vy=0;if(a.role!=='G')Object.assign(a,{x:H.progress(side,30),y:3+m.skaters(a.side).indexOf(a)*5});}
 const a=m.skaters(side)[0];Object.assign(a,{x:H.progress(side,54),y:6});m.carrier=a.id;m.puck={x:a.x,y:a.y};
 return {m,a};
}
test('all equipped models share valid weights and include a complete, articulated goalkeeper for either hand',()=>{
 const source=JSON.parse(fs.readFileSync('assets/models/hockey-uniform.gltf','utf8'));
 assert.equal(source.meshes.length,3);assert.equal(source.scenes.length,3);
 for(const kind of ['skater','goalie','goalieR']){
  const asset=Model.model(kind);assert.equal(asset.joints.length,15);assert.ok(asset.vertices<2400);
  for(let i=0;i<asset.vertices;i++){let sum=0;for(let j=0;j<4;j++){sum+=asset.attributes.WEIGHTS_0[i*4+j];assert.ok(asset.attributes.JOINTS_0[i*4+j]<15);}assert.ok(Math.abs(sum-1)<1e-6);}
  assert.ok(asset.indices.every(i=>i<asset.vertices));
 }
 const {m}=setup();
 for(const a of m.actors.filter(a=>a.role==='G')){a.player.shoots=a.side?'R':'L';a.keeperState={at:m.wall,drop:1,facing:a.side?Math.PI:0,glove:{lateral:a.side?.7:-.7,z:.48},blocker:{lateral:a.side?-.6:.6,z:.65}};}
 m.flight={kind:'shot',side:0,start:{x:50,y:15},end:{x:54,y:15,z:.1},elapsed:.1,duration:.3};
 const f=m.presentationFrame(),saved=JSON.stringify(f),poses=new Map(f.actors.map(a=>[a.id,R.pose(f,a)]));
 const mesh=Model.mesh(f.actors,poses,R.kits([])),indices=Model.indices(f.actors),vertices=f.actors.reduce((n,a)=>n+Model.model(Model.kind(a)).vertices,0);
 assert.equal(mesh.length,vertices*11);assert.ok(indices.every(i=>i<vertices));assert.ok(mesh.every(Number.isFinite));
 for(let i=1;i<mesh.length;i+=11)assert.ok(mesh[i]>-.08&&mesh[i]<2.5,'equipment stays above the ice through butterfly');
 assert.equal(JSON.stringify(f),saved);assert.ok(R.figures(f,[],true,poses).length/9+vertices<50000);
});
test('a check disrupts balance, acceleration and decisions, then recovers without rerolling the hit',()=>{
 const trial=(ability,shield)=>{
  const {m,a}=setup(),d=m.skaters(1)[0];Object.assign(a,{x:44,y:15});Object.assign(d,{x:42.9,y:15,vx:5});m.puck={x:44,y:15};
  a.player.attributes.strength=a.player.attributes.skating=ability;if(shield)a.shieldUntil=30;
  m.startBattle(a,d);return {m,a,d};
 };
 const weak=trial(5,false),strong=trial(18,true);assert.equal(weak.m.battle.type,'check');assert.ok(weak.m.balanceLevel(weak.a)>strong.m.balanceLevel(strong.a));
 const {m,a}=weak;m.battle=null;m.carrier=a.id;m.chooseAction=()=>{throw Error('cannot choose while off balance');};const rng=m.rng;m.decide();assert.equal(m.rng,rng);assert.ok(a.duty.includes('balansen'));
 m.carrier=null;delete a.recoverUntil;a.target={x:50,y:15};const balance={...a.balanceState},clean=JSON.parse(JSON.stringify(a));delete clean.balanceState;
 m.actors=[a];m.move(.1);const shaken=a.vx;Object.assign(a,clean);delete a.balanceState;m.move(.1);assert.ok(a.vx>shaken);
 Object.assign(a,clean);a.balanceState=balance;
 m.wall=20.15;const frame=m.presentationFrame(),pose=R.pose(frame,frame.actors[0]);assert.ok(pose.unsteady>0);assert.equal(pose.state,'stumbling');assert.equal(JSON.stringify(pose),JSON.stringify(R.pose(frame,frame.actors[0])));
 const future={...frame,wall:21.1};assert.equal(R.pose(future,frame.actors[0]).unsteady,0);
});
test('an attack rereads a closed lane and can continue beyond the original two passes',()=>{
 for(const side of [0,1]){
  const {m,a}=setup(side);m.targets();const plan=m.teams[side].attackPattern,first=m.actor(plan.receiver);assert.ok(plan);
  const alternate=m.skaters(side).find(p=>p!==a&&!p.role.endsWith('D'));Object.assign(alternate,{x:H.progress(side,51),y:24});
  for(const d of m.skaters(1-side)){Object.assign(d,{x:(a.x+first.x)/2,y:(a.y+first.y)/2});d.player.attributes.positioning=d.player.attributes.decisions=20;}
  m.time+=1;m.wall+=1;m.targets();assert.equal(m.teams[side].attackPattern,plan);assert.notEqual(plan.receiver,first.id);
  for(let i=0;i<4;i++){const receiver=m.actor(plan.receiver);m.carrier=receiver.id;Object.assign(receiver,{x:H.progress(side,49+i),y:i%2?22:8});m.puck={x:receiver.x,y:receiver.y};m.time+=.5;m.wall+=.5;m.targets();assert.equal(m.teams[side].attackPattern,plan);}
  assert.equal(plan.stage,4);m.owner=1-side;m.carrier=m.skaters(1-side)[0].id;m.updateAttackPattern();assert.equal(m.teams[side].attackPattern,null);
 }
});
test('PP rotates off the puck, keeps its screen, and BP reacts to a visible failed reception with distinct duties',()=>{
 const {m}=setup();m.penalty={side:1,remaining:100};m.installUnit(1);m.owner=0;
 const carrier=m.skaters(0).find(a=>a.role==='LW'),weak=m.skaters(0).find(a=>a.role==='RD'),bumper=m.skaters(0).find(a=>a.role==='RW'),screen=m.skaters(0).find(a=>a.role==='C');
 Object.assign(carrier,{x:48,y:6});Object.assign(weak,{x:48,y:24});Object.assign(bumper,{x:50,y:15});m.carrier=carrier.id;m.puck={x:48,y:6};
 const defenders=m.skaters(1);Object.assign(defenders[0],{x:48,y:15});m.teams[0].attackPattern=null;m.teams[0].nextSpecialAt=0;m.phase='attack';m.targets();
 assert.equal(m.teams[0].specialPlay.kind,'flank-swap');assert.ok(weak.duty.includes('PP byter plats'));assert.ok(bumper.duty.includes('PP byter plats'));assert.ok(screen.target.x>=53,'net-front screen is retained');
 for(const d of defenders.filter(d=>!d.role.endsWith('D')))Object.assign(d,{x:47,y:d.role==='LW'?9:17});
 m.recordContact(carrier,'bobble',m.puck,.7);m.carrier=null;m.flight=null;m.wall+=.5;m.time+=.5;m.targets();
 const press=m.teams[1].specialPlay;assert.equal(press.kind,'press');assert.equal(defenders.filter(a=>a.duty.startsWith('BP pressar')).length,1);assert.equal(defenders.filter(a=>a.duty.startsWith('BP stänger')).length,1);
 assert.ok(defenders.filter(a=>a.role.endsWith('D')).every(a=>!a.duty.startsWith('BP pressar')));
 m.time+=2;m.wall+=2;m.targets();assert.notEqual(m.teams[1].specialPlay?.kind,'press');
 m.penalty=null;m.targets();assert.equal(m.teams[0].specialPlay,null);
});
test('clips retain real events, stay bounded and do not reveal an observation before its recorded time',()=>{
 const {m,a}=setup();m.history=[];m.tick=0;m.capture();const b=m.skaters(0)[1];Object.assign(b,{x:50,y:24});m.random=()=>0;m.pass(a,b);m.resolveFlight(2);assert.equal(m.carrier,b.id);
 const clip=m.tacticalClips.find(c=>c.kind==='diagonal');assert.ok(clip);assert.deepEqual(clip.players,[a.id,b.id]);const original=JSON.stringify(clip);
 for(let i=0;i<10;i++){m.tick+=2;m.wall+=.2;m.capture();}assert.equal(JSON.stringify(clip),original,'held replay objects never change');
 const f=clip.frames.at(-1);const early={...f,wall:clip.wall-.01};assert.ok(!R.replayAnalysis(clip.frames,early,clip).notes.some(n=>n.startsWith('Markerat: den genomförda')));
 assert.ok(R.replayAnalysis(clip.frames,f,clip).notes.some(n=>n.startsWith('Markerat: den genomförda')));
 for(let i=0;i<30;i++){m.time+=5;m.wall+=5;m.observeTactic('support',i%2,{players:[a.id]});}assert.ok(m.tacticalClips.length<=6);assert.ok(m.tacticalClips.every(c=>c.frames.length<=30));
});
test('career saves resume new physical/tactical state and real clips open through the coach without changing the match',()=>{
 const {boot}=require('./scripts/career-test-fixture.cjs'),app=boot();
 app.run("startCareerWithClub('HV71');state.calendar.date=calendarTarget();startMatch();for(let i=0;i<1100;i++){if(!state.live.running){while(medicalPending())medicalDecisionAccept();startMatch();}studioStep();}pauseMatch();save();");
 assert.ok(app.run('studioEngine().tacticalClips.length>0'));assert.ok(app.run('JSON.stringify(state.live.broadcast.tacticalClips).length<1400000'));
 app.run('validateSaveText(localStorage.getItem("hockey_manager_alpha02"))');
 const restored=boot(app.storage.value),sequence="globalThis.e=studioEngine();for(let i=0;i<12;i++)e.step();JSON.stringify([e.time,e.rng,e.puck,e.carrier,e.score,e.teams.map(t=>[t.attackPattern,t.specialPlay]),e.actors.map(a=>a.balanceState)])";
 assert.equal(restored.run(sequence),app.run(sequence));
 app.run('pauseMatch();globalThis.before=JSON.stringify(state.live);globalThis.clip=studioEngine().tacticalClips.at(-1);studioObservationClip(clip.id);studioReplayMoment();studioSeekReplay(999);studioPauseReplay();studioReplayFrame(1000);studioReplayFrame(1500);');
 assert.equal(app.run('JSON.stringify(state.live)'),app.run('before'));assert.equal(app.run('studioVisualMode'),'3d');assert.ok(app.run("studioView().includes('Till observationen')"));
 app.run('studioExitReplay()');assert.equal(app.run('studioReplayState'),null);
 assert.throws(()=>app.run('globalThis.bad=JSON.parse(localStorage.getItem("hockey_manager_alpha02"));bad.live.broadcast.tacticalClips[0].frames[0].puck.x=999;validateSaveText(JSON.stringify(bad))'));
});
test('coach links use the correct side and strength and follow a manual tactical change',()=>{
 const {boot}=require('./scripts/career-test-fixture.cjs'),app=boot();
 app.run("startCareerWithClub('HV71');state.calendar.date=calendarTarget();startMatch();pauseMatch();globalThis.e=studioEngine();e.time=e.wall=20;e.stoppage=0;for(let i=0;i<3;i++){e.time+=10;e.wall+=10;e.observeTactic('diagonal',1,{players:[e.skaters(1)[0].id]});}studioMirror(e);globalThis.advice=matchEvidenceReport().advice.find(a=>a.key==='clip-diagonal-even');");
 assert.ok(app.run('Boolean(advice)'));assert.ok(app.run("matchCoachAdviceView(advice).includes('studioObservationClip')"));
 app.run("matchClipInspect('clip-diagonal-even');matchOrder('forecheck','passive');");
 assert.ok(app.run('state.live.tacticalReviews.at(-1).clipQuery.length'));assert.ok(app.run("matchClipCurrentFollowup().includes('Före beslutet')"));
 app.run("e.time+=10;e.wall+=10;e.observeTactic('diagonal',1,{players:[]});studioMirror(e);");assert.ok(app.run("matchClipCurrentFollowup().includes('Efter beslutet')"));
 const currentId=app.run('state.live.analysis.id');app.run("state.live.analysis.id='another-fixture'");assert.equal(app.run('matchClipCurrentFollowup()'),'');app.run('state.live.analysis.id='+JSON.stringify(currentId));
 app.run("for(const row of e.tacticalObservations)row.situation='pp'");assert.equal(app.run("matchClipAdvice(e).some(a=>a.key==='clip-diagonal-even')"),false);assert.equal(app.run("matchClipAdvice(e).some(a=>a.key==='clip-diagonal-pk')"),true);
});

test('observation recording does not change outcomes and a faceoff win is not a puck loss',()=>{
 const a=new H.Match(rosters,{seed:851,duration:80}),b=new H.Match(rosters,{seed:851,duration:80});b.observeTactic=()=>{};
 const facts=m=>JSON.stringify([m.rng,m.score,m.puck,m.carrier,m.stats,m.actors.map(a=>[a.id,a.x,a.y,a.vx,a.vy,a.player.energy])]);
 for(let i=0;i<850&&!a.finished;i++){a.step();b.step();assert.equal(facts(a),facts(b));}
 assert.ok(a.tacticalObservations?.length>0);
 const m=new H.Match(rosters,{seed:1});m.phase='faceoff';m.owner=0;m.carrier=null;m.flight=null;m.takePossession(m.skaters(1)[0]);assert.ok(!m.tacticalObservations?.some(o=>o.kind==='turnover'));
});
