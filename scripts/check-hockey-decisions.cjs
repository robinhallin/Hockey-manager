'use strict';
// Natural play, production load order, no prescribed actions or outcomes.
const fs=require('fs'),vm=require('vm'),path=require('path'),{execFileSync}=require('child_process');
const root=path.join(__dirname,'..'),baseline=process.argv.find(a=>a.startsWith('--baseline='))?.split('=')[1];
const H=global.StudioHockey=require('../match-simulation'),rosters=require('../match-lab-rosters');
for(const file of ['match-rules-3.js','match-engine-3.js','match-engine-4.js','match-control-integration.js'])vm.runInThisContext(baseline&&file==='match-engine-4.js'?execFileSync('git',['show',baseline+':'+file],{cwd:root,encoding:'utf8'}):fs.readFileSync(path.join(root,file),'utf8'),{filename:file});
const result={variant:baseline||'working tree',games:8,secondsPerGame:300,rushBackSeconds:0,backTargetBehindThreatSeconds:0,transitionWideSeconds:0,wideBackSeconds:0,patternSeconds:0,coveredPatternTargetSeconds:0,cagePatternTargetSeconds:0,passes:0,entries:0,shots:0,goals:0};
for(let seed=1;seed<=result.games;seed++){
 const m=new H.Match(rosters,{seed:4504+seed*1107,duration:result.secondsPerGame});
 while(!m.finished){
  m.step();const c=m.actor(m.carrier);if(!c||m.stoppage>0)continue;
  const p=H.progress(c.side,c.x);
  if(p>=22&&p<43&&!m.isShortHanded(1-c.side))for(const b of m.skaters(1-c.side).filter(a=>a.role.endsWith('D'))){
   const threat=m.actor(b.markedThreat);if(!threat)continue;result.rushBackSeconds+=H.STEP;
   if(H.progress(c.side,b.target.x)<H.progress(c.side,threat.x))result.backTargetBehindThreatSeconds+=H.STEP;
  }
  const support=m.teams[c.side].transitionSupport;
  if(p<32&&!m.isShortHanded(c.side)&&!m.hasPowerPlay(c.side)&&support?.carrier===c.id){
   const wide=m.actor(support.players?.[1]);
   if(wide&&wide.duty==='Breddar understödet och öppnar nästa passning'){result.transitionWideSeconds+=H.STEP;if(wide.role.endsWith('D'))result.wideBackSeconds+=H.STEP;}
  }
  const plan=m.teams[c.side].attackPattern;
  if(plan?.target){result.patternSeconds+=H.STEP;if(m.pressureAt({...plan.target,side:c.side})>.65)result.coveredPatternTargetSeconds+=H.STEP;if(H.netObstacle(m.puck,plan.target,.04))result.cagePatternTargetSeconds+=H.STEP;}
 }
 for(const s of m.stats){result.passes+=s.passes;result.entries+=s.entries;result.shots+=s.shots;}result.goals+=m.score[0]+m.score[1];
}
for(const key of Object.keys(result))if(key.endsWith('Seconds'))result[key]=Math.round(result[key]*10)/10;
console.log(JSON.stringify(result,null,2));
