'use strict';
const assert=require('node:assert/strict');
const {Match}=require('./scripts/current-match-engine.cjs');
const rosters=require('./match-lab-rosters');
const speed=m=>m.puckVelocity?Math.hypot(m.puckVelocity.x,m.puckVelocity.y):0;
function loose(puck,velocity,rimPath=null){const m=new Match(rosters,{seed:17});Object.assign(m,{stoppage:0,carrier:null,flight:null,battle:null,puck:{...puck},puckVelocity:{...velocity},rimPath:rimPath?.map(p=>({...p})),icingCandidate:null});return m;}
const scenarios=[['ice',{x:30,y:15},{x:14,y:0},null],['boards',{x:58,y:15},{x:25,y:9},null],['rim',{x:57,y:2},{x:14,y:5},[{x:59,y:5.5},{x:58.7,y:24.5},{x:54,y:29},{x:47,y:28.7}]]];
for(const [label,puck,velocity,path] of scenarios){
 const m=loose(puck,velocity,path),rng=m.rng;let previous=speed(m),steps=0,travel=0;
 while(m.puckVelocity&&steps++<100){const before={...m.puck};m.moveFreePuck(.1);const next=speed(m);assert.ok(next<=previous+1e-8,label+' must never gain energy');previous=next;travel+=Math.hypot(m.puck.x-before.x,m.puck.y-before.y);assert.ok(m.puck.x>=.35&&m.puck.x<=59.65&&m.puck.y>=.35&&m.puck.y<=29.65);}
 assert.ok(steps<100,label+' stops unaided before ten seconds');assert.ok(travel<75,label+' must not circle the rink repeatedly');assert.equal(m.rimPath,null);assert.equal(m.carrier,null,'no player took possession');assert.equal(m.stoppage,0,'no artificial whistle stopped the puck');assert.equal(m.rng,rng,'physics is deterministic');
 const stopped={...m.puck};for(let i=0;i<50;i++)m.moveFreePuck(.1);assert.deepEqual(m.puck,stopped,'stationary puck does not drift or restart');
 console.log(JSON.stringify({label,stopSeconds:steps/10,travel:+travel.toFixed(1)}));
}
// A sharp impact loses normal speed; grazing contact retains forward movement.
const straight=loose({x:59.5,y:15},{x:10,y:0});straight.moveFreePuck(.1);assert.ok(straight.puckVelocity.x<0&&Math.abs(straight.puckVelocity.x)<5);
const grazing=loose({x:30,y:.4},{x:12,y:-2});grazing.moveFreePuck(.1);assert.ok(grazing.puckVelocity.y>0&&grazing.puckVelocity.x>9);
// Waypoints consume remaining travel instead of overshooting and turning back.
const corner=loose({x:58.9,y:5},{x:10,y:0},[{x:59,y:5},{x:59,y:20}]);corner.moveFreePuck(.1);assert.ok(Math.abs(corner.puck.x-59)<1e-8);assert.ok(corner.puck.y>5);assert.ok(Math.abs(corner.puckVelocity.x)<1e-8&&corner.puckVelocity.y>0);
// Splitting the engine timestep and resuming serialized physics retain the path.
const a=loose(...scenarios[2].slice(1)),b=loose(...scenarios[2].slice(1));for(let i=0;i<20;i++){a.moveFreePuck(.1);b.moveFreePuck(.05);b.moveFreePuck(.05);}assert.deepEqual(a.puck,b.puck);assert.deepEqual(a.puckVelocity,b.puckVelocity);
const resumed=loose(a.puck,a.puckVelocity,a.rimPath);for(let i=0;i<20;i++){a.moveFreePuck(.1);resumed.moveFreePuck(.1);}assert.deepEqual(a.puck,resumed.puck);assert.deepEqual(a.puckVelocity,resumed.puckVelocity);
// Icing still triggers at the goal-line crossing, before any rebound.
for(const side of [0,1]){const m=loose({x:side?4:56,y:2},{x:side?-18:18,y:0});m.icingCandidate={side};for(const p of m.skaters(side))p.x=30;m.moveFreePuck(.1);assert.equal(m.icingHold,side);assert.ok(m.stoppage>0);assert.equal(m.puckVelocity,null);}
// Rest is an ordinary loose puck: a nearby player may still recover it.
const pickup=loose({x:30,y:15},{x:.04,y:0});pickup.moveFreePuck(.1);const hunter=pickup.skaters(0)[0];hunter.x=30;hunter.y=15;pickup.step();assert.ok(pickup.carrier||pickup.battle,'stationary puck can be contested');
console.log('PASS: dissipative ice/boards/rims, finite rest without players, stable corner travel, timestep/reload equivalence, icing both directions and stationary pickup.');
