'use strict';
// Controlled starting positions, never prescribed actions or outcomes. Both
// variants load every production patch in index order; --baseline uses HEAD's
// engine-4 layer only, so an uncommitted change can be compared honestly.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {execFileSync}=require('node:child_process'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),baselineArg=process.argv.find(a=>a==='--baseline'||a.startsWith('--baseline='));
const baseline=Boolean(baselineArg),baselineRef=baselineArg?.split('=')[1]||'HEAD';
const H=global.StudioHockey=require('../match-simulation'),rosters=require('../match-lab-rosters');
for(const file of ['match-rules-3.js','match-engine-3.js','match-engine-4.js','match-control-integration.js']){
  const code=baseline&&file==='match-engine-4.js'?execFileSync('git',['show',baselineRef+':'+file],{cwd:root,encoding:'utf8'}):fs.readFileSync(path.join(root,file),'utf8');
  vm.runInThisContext(code,{filename:file});
}
const totals={sample:32,secondsPerSequence:60,passAttempts:0,passes:0,entries:0,shots:0,goals:0,deepTicks:0,nearTeammateSeconds:0,firstPassRoles:{},maxSkaterStep:0};
const started=performance.now();
for(let i=0;i<totals.sample;i++){
  const side=i%2,lane=i%4<2?1:-1,m=new H.Match(rosters,{seed:4504+i*1107,duration:60});
  const point=(p,y)=>({x:H.progress(side,p),y:lane===1?y:30-y});
  const positions={LD:[9,6],RD:[10,12],C:[13,15],LW:[17,4],RW:[22,25]};
  const opponents={LW:[12,8],C:[19,12],RW:[25,18],LD:[29,9],RD:[30,23]};
  for(const a of m.skaters(side))Object.assign(a,point(...positions[a.role]),{vx:0,vy:0});
  for(const a of m.skaters(1-side))Object.assign(a,point(...opponents[a.role]),{vx:0,vy:0});
  const carrier=m.skaters(side).find(a=>a.role==='LD');
  m.owner=side;m.carrier=carrier.id;m.puck={x:carrier.x,y:carrier.y};m.stoppage=0;m.phase='breakout';m.decision=.3;
  m.history=[];m.capture();let firstPass=false,steps=0;
  while(!m.finished&&steps++<2000){
    const before=new Map(m.actors.map(a=>[a.id,{x:a.x,y:a.y,status:a.status}])),wasStopped=m.stoppage>0;m.step();
    for(const a of m.skaters(side)){
      const old=before.get(a.id);if(old&&!wasStopped&&a.status==='playing'&&old.status==='playing'&&m.stoppage<=0){
        const d=H.distance(a,old);totals.maxSkaterStep=Math.max(totals.maxSkaterStep,d);
        assert.ok(d<1.5,'active skater movement remains continuous');
      }
    }
    const c=m.actor(m.carrier);
    if(c&&c.side===side&&c.role.endsWith('D')&&H.progress(side,c.x)<20&&m.stoppage<=0){
      totals.deepTicks++;totals.nearTeammateSeconds+=m.skaters(side).filter(a=>a.id!==c.id&&H.distance(a,c)<4).length*H.STEP;
    }
    if(!firstPass&&m.flight?.kind==='pass'&&m.flight.side===side){
      const role=m.actor(m.flight.to)?.role||'unknown';totals.firstPassRoles[role]=(totals.firstPassRoles[role]||0)+1;firstPass=true;
    }
  }
  assert.ok(m.finished,'sequence finishes without deadlock');
  for(const s of m.stats){for(const k of ['passAttempts','passes','entries','shots'])totals[k]+=s[k];}
  totals.goals+=m.score[0]+m.score[1];
}
console.log(JSON.stringify({variant:baseline?baselineRef+' engine-4 baseline':'working tree',...totals,nearMatesPerDeepTick:totals.deepTicks?totals.nearTeammateSeconds/(totals.deepTicks*H.STEP):0,cpuElapsedMs:Math.round(performance.now()-started)},null,2));
