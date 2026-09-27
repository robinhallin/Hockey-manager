'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const H=require('./scripts/current-match-engine.cjs'),rosters=require('./match-lab-rosters');
const ctx=vm.createContext({});for(const f of ['match-player-asset.js','match-player-model.js','match-3d.js'])vm.runInContext(fs.readFileSync(f,'utf8'),ctx);
const Model=vm.runInContext('HockeyPlayerModel',ctx),R=vm.runInContext('Match3D',ctx);
function setup(side=0){const m=new H.Match(rosters,{seed:477,scenario:'attack',duration:70});m.time=m.wall=20;m.stoppage=0;m.owner=side;for(const a of m.actors)if(a.role!=='G'){a.x=30;a.y=3+m.skaters(a.side).indexOf(a)*4;}const a=m.skaters(side)[0],g=m.actors.find(a=>a.role==='G'&&a.side!==side);Object.assign(a,{x:H.progress(side,50),y:15,vx:0,vy:0});Object.assign(g,m.goalieTarget(1-side,a));m.puck={x:a.x,y:a.y};m.carrier=a.id;return {m,a,g};}
test('bundled glTF has normalized skin weights and animates attached clothing without changing snapshots',()=>{
 const asset=Model.model();assert.equal(asset.joints.length,15);assert.ok(asset.vertices>500);const source=JSON.parse(fs.readFileSync('assets/models/hockey-uniform.gltf','utf8'));assert.equal(JSON.stringify(source),vm.runInContext('JSON.stringify(HockeyPlayerAsset)',ctx));
 for(let i=0;i<asset.vertices;i++){let sum=0;for(let j=0;j<4;j++){sum+=asset.attributes.WEIGHTS_0[i*4+j];assert.ok(asset.attributes.JOINTS_0[i*4+j]<15);}assert.ok(Math.abs(sum-1)<1e-6);}
 const m=new H.Match(rosters,{scenario:'rush',duration:15,seed:79});let meshes=0;
 while(!m.finished){m.step();if(m.tick%10)continue;const f=m.presentationFrame(),snapshot=JSON.stringify(f),poses=new Map(f.actors.map(a=>[a.id,R.pose(f,a)])),mesh=Model.mesh(f.actors,poses,R.kits([]));assert.ok(mesh.every(Number.isFinite));assert.ok(mesh.length>10000);for(let i=1;i<mesh.length;i+=11)assert.ok(mesh[i]>-.1&&mesh[i]<2.5);assert.equal(JSON.stringify(f),snapshot);meshes++;}
 assert.ok(meshes>10);
});
test('keeper coverage requires contact and respects both rink directions, equipment and out-of-reach shots',()=>{
 for(const side of [0,1]){const {m,a,g}=setup(side);m.random=()=>.5;m.shoot(a);const f=m.flight;assert.equal(f.keeperVersion,2);m.readKeeper(f,.15);g.keeperState.facing=side?0:Math.PI;g.keeperState.drop=1;
  assert.equal(m.keeperContact(g,{x:g.x,y:g.y,z:.06}).style,'stick');assert.equal(m.keeperContact(g,{x:g.x,y:g.y+.65,z:.25}).style,'butterfly');assert.equal(m.keeperContact(g,{x:g.x,y:g.y+2,z:.5}),null);
  g.y=19;m.resolveFlight(f.duration);assert.equal(m.shots.length,0);assert.equal(m.flight.keeperPassed,true);m.resolveFlight(m.flight.duration);assert.equal(m.score[side],1);
 }
});
test('screens slow the actual read; better reflexes and recovery change reach before impact',()=>{
 const trial=(screen,reflex,recovery)=>{const {m,a,g}=setup();g.player.attributes.reflexes=reflex;if(recovery)g.keeperAction={at:m.wall,kind:'save'};m.random=()=>.5;m.shoot(a);if(screen){const body=m.skaters(0)[1];body.x=(a.x+g.x)/2;body.y=(a.y+g.y)/2;}m.readKeeper(m.flight,.14);return g.keeperState;};
 const clear=trial(false,18,false),blocked=trial(true,18,false),slow=trial(false,4,false),tired=trial(false,18,true);
 assert.ok(blocked.seen<clear.seen);assert.ok(Math.abs(clear.glove.z-.88)>Math.abs(blocked.glove.z-.88));assert.ok(Math.abs(clear.glove.z-.88)>Math.abs(slow.glove.z-.88));assert.ok(Math.abs(clear.glove.z-.88)>Math.abs(tired.glove.z-.88));
});
test('a saved in-flight physical read resumes exactly; legacy shots retain their stored outcome',()=>{
 const {m,a}=setup();m.random=()=>.5;m.shoot(a);delete m.random;m.resolveFlight(.05);
 const copy=Object.assign(Object.create(H.Match.prototype),JSON.parse(JSON.stringify(m)));
 for(let i=0;i<20;i++){m.resolveFlight(.03);copy.resolveFlight(.03);assert.deepEqual(copy.puck,m.puck);assert.deepEqual(copy.score,m.score);assert.equal(copy.rng,m.rng);}
 const old=setup();old.m.random=()=>.5;old.m.shoot(old.a);delete old.m.flight.keeperVersion;old.m.flight.shot.finishRoll=0;old.m.resolveFlight(10);assert.equal(old.m.score[0],1);
});
test('attack intentions survive possession within the combination but end on turnover, change and whistle',()=>{
 for(const side of [0,1]){const {m,a}=setup(side);Object.assign(a,{x:H.progress(side,54),y:5});m.puck={x:a.x,y:a.y};m.targets();const plan=m.teams[side].attackPattern;assert.equal(plan.kind,'low-high');const b=m.actor(plan.receiver);m.carrier=b.id;Object.assign(b,{x:H.progress(side,45),y:8});m.puck={x:b.x,y:b.y};m.targets();assert.equal(m.teams[side].attackPattern,plan);assert.equal(plan.stage,1);assert.equal(plan.origin,a.id);m.stop('stoppage','Tekning');assert.equal(m.teams[side].attackPattern,null);
  m.stoppage=0;m.carrier=b.id;m.owner=side;m.teams[side].nextPatternAt=0;m.targets();assert.ok(m.teams[side].attackPattern);m.actors=m.actors.filter(x=>x.id!==m.teams[side].attackPattern.players[1]);m.updateAttackPattern();assert.equal(m.teams[side].attackPattern,null);
 }
});
test('specific coverage changes defenders positions and leaves an exploitable alternative',()=>{
 const {m,a}=setup();Object.assign(a,{x:48,y:6});m.puck={x:a.x,y:a.y};const flank=m.skaters(0)[1];Object.assign(flank,{x:50,y:24});m.targets();const base=m.skaters(1).map(a=>({...a.target}));m.teams[1].coverage='diagonal';m.targets();const guard=m.skaters(1).find(a=>a.duty.includes('diagonalpassningen'));assert.ok(guard);assert.ok(m.skaters(1).some((a,i)=>H.distance(a.target,base[i])>.1));
});
test('automatic camera contains the puck, receiver and shot endpoint and never changes match data',()=>{
 const {m,a}=setup();m.shoot(a);const f=m.presentationFrame(),before=JSON.stringify(f);for(const ratio of [1.3,2.4]){const camera=R.cameraFrame(ratio,'auto',f,null,1.5);for(const p of [f.puck,f.flight.end]){const q=R.project([p.x,.1+(p.z||0),p.y],camera.matrix);assert.ok(q.x>=0&&q.x<=1&&q.y>=0&&q.y<=1);}}assert.equal(JSON.stringify(f),before);
});
test('career coach reacts to observed repeated patterns, transfers coverage and preserves it on save',()=>{
 const {boot}=require('./scripts/career-test-fixture.cjs'),app=boot();app.run(`startCareerWithClub('HV71');state.calendar.date=calendarTarget();startMatch();globalThis.e=studioEngine();globalThis.club=state.live.opponent;rivalsClubState(club).coach.adaptability=18;globalThis.holder={};aiObserveMatch(holder,{seconds:0,shots:0,againstShots:0,flow:{against:{}}});globalThis.obs=aiObserveMatch(holder,{seconds:600,gf:0,ga:0,shots:3,againstShots:3,strength:0,flow:{against:{diagonalPasses:4}}});globalThis.d=aiCoachDecision(club,{style:'control'},obs);`);
 assert.equal(app.run('d.coverage'),'diagonal');app.run('Object.assign(state.live.aiTeam,d);studioSyncPlans(e);pauseMatch();save();');assert.equal(app.run('e.teams[1].coverage'),'diagonal');const loaded=boot(app.storage.value);assert.equal(loaded.run('studioEngine().teams[1].coverage'),'diagonal');
 app.run("rivalsClubState(club).coach.adaptability=5;globalThis.low=aiCoachDecision(club,{style:'control'},obs)");assert.equal(app.run('low.coverage'),'balanced');
});

test('a retreating goalkeeper is evaluated when the puck reaches the moved equipment plane',()=>{
 for(const side of [0,1]){const {m,a,g}=setup(side);g.y=15;m.random=()=>.5;m.shoot(a);const f=m.flight,initial=f.duration;g.x+=side?-.5:.5;m.resolveFlight(initial);assert.equal(m.flight,f);assert.equal(m.shots.length,0);assert.ok(f.duration>initial);m.resolveFlight(f.duration-f.elapsed);assert.equal(f.shot.outcome,'save');assert.equal(m.stats[1-side].saves,1);}
});
