const assert=require('node:assert/strict');
const {Match}=require('./match-simulation');const rosters=require('./match-lab-rosters');
function setup(){const m=new Match(rosters,{scenario:'attack',seed:89});const a=m.actor(m.carrier);Object.assign(a,{x:47,y:6});m.puck={x:a.x,y:a.y};for(const [i,d] of m.skaters(1).entries())Object.assign(d,{x:30,y:3+i*5,vx:0,vy:0});for(const [i,b] of m.skaters(0).filter(b=>b!==a).entries())Object.assign(b,{x:42,y:3+i*7});return {m,a};}
{
 const {m,a}=setup(),b=m.skaters(0).find(b=>b.role==='C');Object.assign(b,{x:52,y:16});
 const clear=m.actionOptions(a).find(r=>r.kind==='pass'&&r.to===b.id).value;
 const d=m.skaters(1)[0];Object.assign(d,{x:(a.x+b.x)/2,y:(a.y+b.y)/2});
 const covered=m.actionOptions(a).find(r=>r.kind==='pass'&&r.to===b.id).value;
 assert.ok(clear>covered+.08,'covering the passing lane must reduce its value');
 assert.equal(m.actionOptions(a).some(r=>r.kind==='pass'&&r.to===b.id),true,'a risky pass remains an option rather than becoming impossible');
}
{
 const {m,a}=setup();Object.assign(a,{x:34,y:15});m.puck={x:a.x,y:a.y};m.phase='entry';
 const open=m.skatingLane(a);Object.assign(m.skaters(1)[0],{x:37,y:15});const covered=m.skatingLane(a);
 assert.ok(Math.abs(covered.target.y-15)>0,'a defender in the central lane must change the carrying route');
 assert.ok(covered.value<=open.value);
 const b=m.skaters(0).find(b=>b!==a);Object.assign(b,{x:43,y:9});assert.equal(m.actionOptions(a).some(r=>r.to===b.id),false,'cannot choose a pass to an offside teammate');
}
{
 const {m,a}=setup(),b=m.skaters(0).find(b=>b.role==='C');const anchor={x:52,y:15};
 const first=m.supportTarget(b,a,anchor);for(const d of m.skaters(1))Object.assign(d,{x:first.x,y:first.y});m.time+=1;
 const next=m.supportTarget(b,a,anchor);assert.notDeepEqual(next,first,'support must respond when the previous receiving space becomes occupied');
 assert.ok(next.x>=41&&next.x<=55&&next.y>=3&&next.y<=27);
}
{
 const {m,a}=setup();Object.assign(a,{x:52,y:15});const keeper=m.actors.find(b=>b.side===1&&b.role==='G');Object.assign(keeper,m.goalieTarget(1,a));
 const c=m.shotContext(a),ordinary=m.shotModel(a,{...c,lateralSpeed:0}).goalChance,lateral=m.shotModel(a,{...c,lateralSpeed:20}).goalChance;
 assert.ok(lateral>ordinary,'lateral delivery challenges the goalkeeper');
 m.rebound={side:0,time:m.time,spot:{x:52,y:15}};assert.equal(m.shotContext(a).rebound,true);a.y=27;assert.equal(m.shotContext(a).rebound,false,'a distant player cannot inherit a rebound bonus');
}
{
 const {m,a}=setup(),rng=m.rng;for(let i=0;i<5;i++)m.actionOptions(a);assert.equal(m.rng,rng,'inspecting alternatives does not consume random draws');
 for(let i=0;i<50;i++)m.chooseAction(a);assert.equal(m.decisionAudit.recent.length,30);
 const restored=Object.assign(Object.create(Match.prototype),JSON.parse(JSON.stringify(m)));const own=restored.actor(a.id);assert.deepEqual(restored.chooseAction(own),m.chooseAction(a),'saved decision state resumes deterministically');
}
console.log('PASS: pass interception risk, carrying around pressure, offside, adaptive support, lateral shots, local rebound bonus, read-only analysis, bounded audit and saved decisions.');
{
 const {m,a}=setup(),d=m.skaters(1)[0];m.time=10;m.decision=999;Object.assign(d,{x:a.x+.5,y:a.y});m.random=()=>0;m.move(.1);
 assert.ok(m.battle,'physical contact must not wait for the puck decision timer');assert.equal(m.carrier,null);
}
