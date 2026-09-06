const assert=require('node:assert/strict');
const {Match,distance}=require('./match-simulation');
const rosters=require('./match-lab-rosters');
let checks=0;
function test(name,fn){fn();checks++;console.log('OK '+name);}
function setup(){
 const m=new Match(rosters,{scenario:'attack',seed:1007});m.time=20;
 for(const t of m.teams)for(const p of t.players)for(const key of Object.keys(p.attributes))p.attributes[key]=10;
 for(const a of m.actors){a.vx=a.vy=0;if(a.role!=='G'){a.x=a.side?30:35;a.y=3+m.skaters(a.side).indexOf(a)*4;}}
 const a=m.skaters(0)[0],g=m.actors.find(a=>a.side===1&&a.role==='G');
 a.x=50;a.y=15;Object.assign(g,m.goalieTarget(1,a));m.takePossession(a);m.phase='attack';m.phaseTime=5;
 return {m,a,g};
}
function seed(m,i){m.rng=Math.imul(i+1,2654435761)>>>0;}
function sampledShots(key,value,{goalie=false,n=4000}={}){
 const {m,a,g}=setup();(goalie?g:a).player.attributes[key]=value;
 let goals=0,sog=0;
 for(let i=0;i<n;i++){
  seed(m,i);m.carrier=a.id;m.puck={x:a.x,y:a.y};m.stoppage=0;m.lastTouches=[];m.rebound=null;m.battle=null;
  m.shoot(a);const shot=m.flight.shot;m.resolveFlight(10);
  goals+=shot.outcome==='goal';sog+=['goal','save'].includes(shot.outcome);
 }
 return {goals,sog};
}

test('Paired actual shot outcomes reward finishing and real goalkeeper attributes',()=>{
 const weak=sampledShots('shooting',4),strong=sampledShots('shooting',18);
 assert.ok(strong.goals>weak.goals*1.45,JSON.stringify({weak,strong}));assert.ok(strong.sog>weak.sog);
 const keepers={};
 for(const key of ['reflexes','positioning','composure']){
  const low=sampledShots(key,4,{goalie:true}),high=sampledShots(key,18,{goalie:true});
  assert.ok(high.goals<low.goals,`${key}: ${JSON.stringify({low,high})}`);keepers[key]={low:low.goals,high:high.goals};
 }
 console.log('  4,000 identical starting shots per variant:',JSON.stringify({finishing:{weak,strong},goalsAllowed:keepers}));
});

test('Shot geometry, pressure, screens and recovery create distinct chances without consuming randomness',()=>{
 const {m,a,g}=setup(),rng=m.rng;
 const slot=m.shotQuality(a);a.y=27;Object.assign(g,m.goalieTarget(1,a));const corner=m.shotQuality(a);assert.ok(slot>corner*2);
 a.x=42;a.y=15;Object.assign(g,m.goalieTarget(1,a));assert.ok(slot>m.shotQuality(a));
 a.x=50;Object.assign(g,m.goalieTarget(1,a));const open=m.shotModel(a);
 const d=m.skaters(1)[0];d.x=50;d.y=16;assert.ok(m.shotModel(a).goalChance<open.goalChance);
 d.x=30;d.y=3;const teammate=m.skaters(0)[1];teammate.x=54;teammate.y=15;
 const screened=m.shotModel(a);assert.ok(screened.goalChance>open.goalChance);
 teammate.x=35;teammate.y=5;g.y=18;assert.ok(m.shotModel(a).goalChance>open.goalChance);
 a.x=58;assert.equal(m.shotQuality(a),0);assert.equal(m.shoot(a),false);assert.equal(m.rng,rng,'queries and an impossible shot must not roll outcomes');
});

test('A goalie with better movement gets across the crease and reduces the next shot chance',()=>{
 const trial=value=>{
  const {m,a,g}=setup();g.player.attributes.movement=value;g.x=55;g.y=13.5;g.vx=g.vy=0;
  a.y=24;m.puck={x:a.x,y:a.y};
  for(let i=0;i<8;i++){m.targets();m.move(.1);m.puck={x:50,y:24};}
  const origin={...a,x:50,y:24};return {gap:distance(g,m.goalieTarget(1,origin)),quality:m.shotQuality(origin)};
 };
 const slow=trial(3),quick=trial(19);assert.ok(quick.gap<slow.gap);assert.ok(quick.quality<slow.quality,JSON.stringify({slow,quick}));
});

test('Handling freezes more saves; rebound control directs more actual rebounds away from the slot',()=>{
 function trial(key,value){
  const {m,a,g}=setup();g.player.attributes[key]=value;let freezes=0,danger=0;
  for(let i=0;i<3000;i++){
   seed(m,i);m.stoppage=0;m.puck={x:56.5,y:15};m.flight=null;
   m.saveRebound(g,{side:0,start:{x:50,y:15},shot:{playerId:a.id,player:a.player.name,context:m.shotContext(a)}});
   freezes+=m.stoppage>0;if(m.flight&&m.flight.end.y>9&&m.flight.end.y<21)danger++;
  }
  return {freezes,danger};
 }
 const handsLow=trial('handling',3),handsHigh=trial('handling',19),controlLow=trial('reboundControl',3),controlHigh=trial('reboundControl',19);
 assert.ok(handsHigh.freezes>handsLow.freezes);assert.ok(controlHigh.danger<controlLow.danger*.6);
 const {m,a,g}=setup();m.random=()=>.99;m.puck={x:56.5,y:15};
 m.saveRebound(g,{side:0,start:{x:50,y:15},shot:{playerId:a.id,player:a.player.name,context:m.shotContext(a)}});
 const start={...m.puck};assert.ok(m.flight);assert.equal(distance(start,m.puck),0);
 m.resolveFlight(.1);assert.ok(distance(start,m.puck)<=1.01,'the return puck must travel from the save, not teleport');
});

test('Vision and decisions improve selection over the same passing opportunities',()=>{
 const {m,a}=setup();a.x=44;a.y=7;m.puck={x:a.x,y:a.y};
 const mates=m.skaters(0).filter(b=>b!==a);[[50,14],[48,25],[43,24],[42,18]].forEach(([x,y],i)=>Object.assign(mates[i],{x,y}));
 const d=m.skaters(1)[0];d.x=46;d.y=15;
 function choices(value){a.player.attributes.vision=a.player.attributes.decisions=value;let sum=0;
  for(let i=0;i<2000;i++){seed(m,i);sum+=m.choosePass(a).score;}return sum/2000;
 }
 const low=choices(3),high=choices(19);assert.ok(high>low+.025,JSON.stringify({low,high}));
 a.player.attributes.decisions=3;const hesitant=m.readDelay(a);a.player.attributes.decisions=19;assert.ok(m.readDelay(a)<hesitant);
});

test('Passing, control and composure affect actual completion under pressure',()=>{
 const {m,a}=setup(),b=m.skaters(0)[1],d=m.skaters(1)[0];a.x=44;a.y=6;b.x=50;b.y=24;d.x=44;d.y=7;
 function outcomes(key,value,receiver=false){(receiver?b:a).player.attributes[key]=value;let made=0;
  for(let i=0;i<2000;i++){seed(m,i);m.carrier=a.id;m.puck={x:a.x,y:a.y};m.pass(a,b);made+=m.flight.success;}return made;
 }
 for(const [key,receiver] of [['passing',false],['puckControl',true],['composure',false]]){
  const low=outcomes(key,3,receiver),high=outcomes(key,19,receiver);assert.ok(high>low,`${key}: ${low} -> ${high}`);
  (receiver?b:a).player.attributes[key]=10;
 }
});

test('Strength, work rate, checking and puck control win contested possessions',()=>{
 const {m,a}=setup(),b=m.skaters(1)[0];a.x=48;a.y=3;b.x=49;b.y=3;
 function wins(key,value){a.player.attributes[key]=value;let won=0;
  for(let i=0;i<2000;i++){
   seed(m,i);m.time=20;m.puck={x:a.x,y:a.y};m.carrier=a.id;m.owner=0;
   m.startBattle(a,b);assert.ok(m.battle);assert.equal(m.carrier,null);m.resolveBattle(2);won+=m.carrier===a.id;
  }
  return won;
 }
 for(const key of ['strength','workRate','checking','puckControl']){
  const low=wins(key,3),high=wins(key,19);assert.ok(high>low,`${key}: ${low} -> ${high}`);a.player.attributes[key]=10;
 }
 assert.equal(m.stats[0].battleWins+m.stats[1].battleWins,m.stats[0].battles);
});

test('Skating, acceleration, work rate and stamina act on movement and energy',()=>{
 function travel(key,value){
  const {m}=setup(),a=m.skaters(1)[0];a.x=20;a.y=15;a.vx=a.vy=0;a.target={x:45,y:15};a.player.attributes[key]=value;
  for(let i=0;i<20;i++)m.move(.1);return a.x;
 }
 for(const key of ['skating','acceleration','workRate'])assert.ok(travel(key,19)>travel(key,3),key);
 function energy(value){const {m,a}=setup();a.player.attributes.stamina=value;m.decide=()=>{};for(let i=0;i<250;i++)m.step();return a.player.energy;}
 assert.ok(energy(19)>energy(3));
});

test('Positioning and work rate block shots on the actual lane, including close pressure',()=>{
 const {m,a}=setup(),d=m.skaters(1)[0];a.x=43;a.y=15;d.x=44;d.y=15;
 const open=m.shotModel(a).block;d.y=23;assert.ok(m.shotModel(a).block<open);d.y=15;
 for(const key of ['positioning','workRate']){d.player.attributes[key]=3;const low=m.shotModel(a).block;d.player.attributes[key]=19;assert.ok(m.shotModel(a).block>low);}
 m.random=()=>0;m.puck={x:a.x,y:a.y};m.shoot(a);assert.equal(m.flight.shot.outcome,'block');assert.equal(m.flight.shot.blockerId,d.id);
 assert.equal(m.flight.end.x,d.x);m.resolveFlight(10);assert.equal(m.stats[1].blocks,1);
});

test('Discipline reduces called penalties in the same repeated close defensive challenges',()=>{
 function penalties(value){
  const {m,a}=setup(),d=m.skaters(1)[0];d.x=a.x+1;d.y=a.y;d.player.attributes.discipline=value;let count=0;
  m.givePenalty=()=>count++;m.startBattle=()=>false;
  for(let i=0;i<5000;i++){seed(m,i);m.carrier=a.id;m.owner=0;m.flight=null;m.puck={x:a.x,y:a.y};m.decide();}
  return count;
 }
 assert.ok(penalties(19)<penalties(3)*.4);
});

test('PP takes an open immediate shot, while a crowded blue-line carrier circulates the puck',()=>{
 const {m,a,g}=setup();m.penalty={side:1,remaining:100,name:'Test'};m.attackPasses=0;m.setupTime=0;m.phaseTime=0;
 a.x=52;a.y=15;Object.assign(g,m.goalieTarget(1,a));m.puck={x:a.x,y:a.y};m.random=()=>0;
 m.decide();assert.equal(m.flight.kind,'shot');assert.equal(m.attackPasses,0);
 m.flight=null;m.carrier=a.id;a.x=42;a.y=6;m.puck={x:a.x,y:a.y};m.decide();assert.notEqual(m.flight?.kind,'shot');
});

test('An old travelling shot retains its decided outcome during an additive save upgrade',()=>{
 const {m,a}=setup();m.shoot(a);m.flight.shot.outcome='goal';delete m.flight.shot.liveResolution;
 delete m.modelVersion;delete m.stats[0].battles;const rng=m.rng;m.upgrade();assert.equal(m.rng,rng);assert.equal(m.stats[0].battles,0);assert.ok(m.partialRealism);
 m.resolveFlight(10);assert.equal(m.score[0],1);assert.equal(m.shots.length,1);assert.equal(m.lastShot.outcome,'goal');
});
test('A replacement clears the bench gate without waiting forever for a moving assignment',()=>{
 const {m,a}=setup(),t=m.teams[0];a.x=27;a.y=5;a.target={x:54,y:24};a.status='entering';
 t.change={stage:'in',id:a.id,gate:27,row:{role:a.role,player:a.player}};
 t.changeQueue=m.unit(0,1,1);const identities=m.actors.map(a=>a.id).sort();
 m.updateChanges(.1);assert.equal(t.change,null);assert.equal(a.status,'playing');
 assert.deepEqual(m.actors.map(a=>a.id).sort(),identities,'clearing a queue cannot invent or remove a player');
 const old=m.skaters(0)[1];old.shift=85;t.shift=0;t.changeQueue=[];t.requested=false;m.carrier=null;m.flight=null;
 m.updateChanges(.1);assert.equal(t.requested,true,'old remaining skaters need a change even when a recent replacement reset the unit timer');
});
console.log(checks+' hockey realism checks passed');
