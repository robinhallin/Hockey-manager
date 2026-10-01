'use strict';
// Natural seeded play, identical rosters/start states; never prescribe actions.
// --baseline=<ref> substitutes only the changed engine-4 layer, in production order.
const fs=require('fs'),vm=require('vm'),path=require('path'),{execFileSync}=require('child_process');
const root=path.join(__dirname,'..'),baseline=process.argv.find(a=>a.startsWith('--baseline='))?.split('=')[1];
const H=global.StudioHockey=require('../match-simulation'),rosters=require('../match-lab-rosters');
for(const file of ['match-rules-3.js','match-engine-3.js','match-engine-4.js','match-control-integration.js'])vm.runInThisContext(baseline&&file==='match-engine-4.js'?execFileSync('git',['show',baseline+':'+file],{cwd:root,encoding:'utf8'}):fs.readFileSync(path.join(root,file),'utf8'),{filename:file});
const result={variant:baseline||'working tree',games:8,secondsPerGame:180,attempts:0,passes:0,entries:0,shots:0,goals:0,rushSamples:0,collapsedBackSamples:0,uncoveredRushSamples:0,openCentralAttempts:0,supportRoleSwaps:0,passAndGoSeconds:0};
for(let seed=1;seed<=result.games;seed++){
 const m=new H.Match(rosters,{seed:4504+seed*1107,duration:result.secondsPerGame});let lastShot=null,support=null;
 while(!m.finished){
  m.step();const carrier=m.actor(m.carrier),p=carrier?H.progress(carrier.side,carrier.x):0;
  if(carrier&&p>=30&&p<43&&m.stoppage<=0&&!m.isShortHanded(1-carrier.side)){
   const backs=m.skaters(1-carrier.side).filter(a=>a.role.endsWith('D'));
   const runner=m.skaters(carrier.side).filter(a=>a!==carrier&&H.progress(carrier.side,a.x)>=p-5&&Math.abs(a.y-carrier.y)>9);
   if(backs.length===2&&runner.length){result.rushSamples++;if(Math.abs(backs[0].target.y-backs[1].target.y)<4)result.collapsedBackSamples++;if(!backs.some(a=>H.progress(carrier.side,a.x)>p))result.uncoveredRushSamples++;}
  }
  if(carrier&&p>=20&&p<32&&m.stoppage<=0){
   const low=m.skaters(carrier.side).find(a=>a.duty==='Ger nära understöd bakom pressen'),wide=m.skaters(carrier.side).find(a=>a.duty==='Breddar understödet och öppnar nästa passning');
   if(low&&wide){const next={carrier:carrier.id,low:low.id,wide:wide.id};if(support?.carrier===next.carrier&&support.low===next.wide&&support.wide===next.low)result.supportRoleSwaps++;support=next;}else support=null;
  }else support=null;
  result.passAndGoSeconds+=m.skaters(m.owner).filter(a=>a.duty?.startsWith('Fortsätter åkningen efter passningen')).length*H.STEP;
  const shot=m.flight?.kind==='shot'?m.flight.shot:null,key=shot?shot.playerId+':'+shot.time:null;
  if(shot&&key!==lastShot){lastShot=key;if(shot.context?.d<14&&shot.context.angle<.7&&shot.context.pressure<.2)result.openCentralAttempts++;}
 }
 for(const s of m.stats){result.attempts+=s.passAttempts;result.passes+=s.passes;result.entries+=s.entries;result.shots+=s.shots;}result.goals+=m.score[0]+m.score[1];
}
result.passAndGoSeconds=Math.round(result.passAndGoSeconds*10)/10;
console.log(JSON.stringify(result,null,2));
