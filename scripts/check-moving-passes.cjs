'use strict';
// Controlled starting states; the actual engine chooses all subsequent passes,
// shots, interceptions and outcomes. Baseline changes only the core simulator.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),Module=require('node:module');
const {execFileSync}=require('node:child_process'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),ref=process.argv.find(a=>a.startsWith('--baseline='))?.slice(11);
let H;if(ref){const filename=path.join(root,'match-simulation-baseline.cjs'),base=new Module(filename,module);base.filename=filename;base.paths=Module._nodeModulePaths(root);base._compile(execFileSync('git',['show',ref+':match-simulation.js'],{cwd:root,encoding:'utf8'}),filename);H=base.exports;}else H=require('../match-simulation');
global.StudioHockey=H;const rosters=require('../match-lab-rosters');
for(const file of ['match-rules-3.js','match-engine-3.js','match-engine-4.js','match-control-integration.js'])vm.runInThisContext(fs.readFileSync(path.join(root,file),'utf8'),{filename:file});
const totals={sequences:32,secondsEach:60,passAttempts:0,passes:0,shots:0,goals:0,movingReceptions:0,slowedReceptions:0,maxSkaterStep:0},speeds=[];
for(let i=0;i<totals.sequences;i++){
 const side=i%2,mirror=i%4<2?1:-1,m=new H.Match(rosters,{seed:1711+i*1107,duration:60,scenario:'attack'});
 const point=(p,y)=>({x:H.progress(side,p),y:mirror===1?y:30-y});
 const attack={LW:[43,8],C:[51,12],RW:[49,24],LD:[42,7],RD:[43,23]},defense={LW:[42,18],C:[49,15],RW:[47,26],LD:[53,8],RD:[54,22]};
 for(const a of m.skaters(side))Object.assign(a,point(...attack[a.role]),{vx:a.role==='C'?(side?-4:4):0,vy:0});
 for(const a of m.skaters(1-side))Object.assign(a,point(...defense[a.role]),{vx:0,vy:0});
 const c=m.skaters(side).find(a=>a.role==='LW');m.owner=side;m.carrier=c.id;m.puck={x:c.x,y:c.y};m.phase='attack';m.stoppage=0;m.decision=.3;
 const launches=new WeakMap();let steps=0;
 while(!m.finished&&steps++<2000){
  const flight=m.flight,launch=flight&&launches.get(flight),before=m.stats.map(s=>s.passes),old=new Map(m.actors.map(a=>[a.id,{x:a.x,y:a.y,status:a.status}])),stopped=m.stoppage>0;m.step();
  if(flight?.kind==='pass'&&launch?.speed>2&&m.stats[flight.side].passes>before[flight.side]){
   const b=m.actor(flight.to),speed=Math.hypot(b.vx,b.vy);totals.movingReceptions++;speeds.push(speed);if(speed<1)totals.slowedReceptions++;
  }
  if(m.flight?.kind==='pass'&&!launches.has(m.flight)){const b=m.actor(m.flight.to);launches.set(m.flight,{speed:Math.hypot(b.vx,b.vy)});}
  for(const a of m.actors){const p=old.get(a.id);if(a.role!=='G'&&p&&p.status==='playing'&&a.status==='playing'&&!stopped&&!m.stoppage){const d=H.distance(a,p);totals.maxSkaterStep=Math.max(totals.maxSkaterStep,d);assert.ok(d<1.5,'continuous active movement');}}
 }
 assert.ok(m.finished,'sequence finishes');for(const s of m.stats)for(const key of ['passAttempts','passes','shots'])totals[key]+=s[key];totals.goals+=m.score[0]+m.score[1];
}
speeds.sort((a,b)=>a-b);console.log(JSON.stringify({variant:ref||'working tree',...totals,medianMovingReceptionSpeed:speeds.length?speeds[Math.floor(speeds.length/2)]:null},null,2));
