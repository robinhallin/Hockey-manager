'use strict';
// Observe complete natural periods. --baseline=<ref> substitutes engine-4 and
// highlight selection only; it never scripts a pass, shot or contact outcome.
const fs=require('fs'),path=require('path'),vm=require('vm'),{execFileSync}=require('child_process');
const root=path.join(__dirname,'..'),baseline=process.argv.find(a=>a.startsWith('--baseline='))?.split('=')[1];
const H=global.StudioHockey=require('../match-simulation'),rosters=require('../match-lab-rosters');
for(const file of ['match-rules-3.js','match-engine-3.js','match-engine-4.js','match-control-integration.js','match-highlights.js']){
 const changed=['match-engine-4.js','match-highlights.js'].includes(file);
 vm.runInThisContext(baseline&&changed?execFileSync('git',['show',baseline+':'+file],{cwd:root,encoding:'utf8'}):fs.readFileSync(path.join(root,file),'utf8'),{filename:file});
}
const Highlights=vm.runInThisContext('MatchHighlights'),result={variant:baseline||'working tree',periods:4,seconds:1200,zoneSeconds:0,crowdedForwardTargetSeconds:0,screenSeconds:0,passes:0,entries:0,attempts:0,shots:0,goals:0,highlightSignals:{}};
for(const seed of [227,228,229,230]){
 const m=new H.Match(rosters,{seed,duration:1200});let last=null;
 while(!m.finished){
  m.step();const c=m.actor(m.carrier);
  if(c&&H.progress(c.side,c.x)>43&&!m.hasPowerPlay(c.side)&&!m.isShortHanded(c.side)&&m.stoppage<=0){
   result.zoneSeconds+=H.STEP;const forwards=m.skaters(c.side).filter(a=>!a.role.endsWith('D')&&a!==c);
   if(forwards.length===2&&H.distance(forwards[0].target,forwards[1].target)<3)result.crowdedForwardTargetSeconds+=H.STEP;
   if(forwards.some(a=>a.netFront?.kind==='screen'))result.screenSeconds+=H.STEP;
  }
  const s=Highlights.select(m,'highlights');if(s&&s.key!==last)result.highlightSignals[s.label]=(result.highlightSignals[s.label]||0)+1;last=s?.key||null;
 }
 for(const s of m.stats){result.passes+=s.passes;result.entries+=s.entries;result.attempts+=s.attempts;result.shots+=s.shots;}result.goals+=m.score[0]+m.score[1];
}
for(const key of ['zoneSeconds','crowdedForwardTargetSeconds','screenSeconds'])result[key]=Math.round(result[key]*10)/10;
console.log(JSON.stringify(result,null,2));
