'use strict';
// Same starting states and seeds, autonomous production decisions. Baseline
// replaces only engine-4, whose target arbitration is the subsystem changed.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {execFileSync}=require('node:child_process'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),ref=process.argv.find(a=>a.startsWith('--baseline='))?.slice(11);
const H=global.StudioHockey=require('../match-simulation'),rosters=require('../match-lab-rosters');
for(const file of ['match-rules-3.js','match-engine-3.js','match-engine-4.js','match-control-integration.js']){
  vm.runInThisContext(ref&&file==='match-engine-4.js'?execFileSync('git',['show',ref+':'+file],{cwd:root,encoding:'utf8'}):fs.readFileSync(path.join(root,file),'utf8'),{filename:file});
}
const totals={sequences:32,secondsEach:60,routeTicks:0,receiverScreenConflictTicks:0,screenTicks:0,duplicateScreenTicks:0,wrongMarkerTicks:0,passes:0,shots:0,goals:0,maxSkaterStep:0};
for(let i=0;i<totals.sequences;i++){
  const side=i%2,mirror=i%4<2?1:-1,m=new H.Match(rosters,{seed:771+i*1107,duration:60,scenario:'attack'});
  const point=(p,y)=>({x:H.progress(side,p),y:mirror===1?y:30-y});
  const attack={LW:[50,5],C:[54,15],RW:[52,18],LD:[43,8],RD:[43,23]},defense={LW:[45,9],C:[49,13],RW:[46,24],LD:[54,16],RD:[52,7]};
  for(const a of m.skaters(side))Object.assign(a,point(...attack[a.role]),{vx:0,vy:0});
  for(const a of m.skaters(1-side))Object.assign(a,point(...defense[a.role]),{vx:0,vy:0});
  const c=m.skaters(side).find(a=>a.role==='LW');m.owner=side;m.carrier=c.id;m.puck={x:c.x,y:c.y};m.phase='attack';m.stoppage=0;m.decision=.3;
  let steps=0;
  while(!m.finished&&steps++<2000){
    const before=new Map(m.actors.map(a=>[a.id,{x:a.x,y:a.y,status:a.status}])),stopped=m.stoppage>0;m.step();
    for(const a of m.actors){const old=before.get(a.id);if(a.role!=='G'&&old&&!stopped&&m.stoppage<=0&&old.status==='playing'&&a.status==='playing'){
      const d=H.distance(a,old);totals.maxSkaterStep=Math.max(totals.maxSkaterStep,d);assert.ok(d<1.5,'no active-play teleport');
    }}
    if(m.stoppage||m.battle)continue;
    for(const team of m.teams){
      const plan=team.attackPattern;
      if(plan?.holder===m.carrier&&plan.until>m.time){totals.routeTicks++;if(m.actor(plan.receiver)?.netFront?.kind==='screen')totals.receiverScreenConflictTicks++;}
      const screens=m.skaters(team.side).filter(a=>a.netFront?.kind==='screen'&&a.netFront.until>m.time);
      if(screens.length)totals.screenTicks++;if(screens.length>1)totals.duplicateScreenTicks++;
    }
    for(const a of m.actors)if(a.netFront?.kind==='boxout'&&a.netFront.until>m.time&&a.markedThreat&&a.markedThreat!==a.netFront.opponent&&!m.isShortHanded(a.side))totals.wrongMarkerTicks++;
  }
  assert.ok(m.finished,'sequence finishes');for(const s of m.stats){totals.passes+=s.passes;totals.shots+=s.shots;}totals.goals+=m.score[0]+m.score[1];
}
console.log(JSON.stringify({variant:ref||'working tree',...totals},null,2));
if(!ref){assert.equal(totals.receiverScreenConflictTicks,0);assert.equal(totals.duplicateScreenTicks,0);assert.equal(totals.wrongMarkerTicks,0);}
