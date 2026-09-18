'use strict';
// Replay frozen career fixtures with independent background seeds. Full snapshots
// stay in the local sampling directory; published evidence contains summaries only.
const fs=require('node:fs'),path=require('node:path');
const dir=process.argv[2],output=process.argv[3],repeats=Number(process.argv[4]||8),phase=process.argv[5]||'train';
if(!dir||!output||!Number.isInteger(repeats)||repeats<1)throw Error('Usage: node scripts/replay-ai-calibration.cjs input-directory output.json [repeats] [train|validation|all]');
const r=require('./headless-career.cjs').headlessCareer().run;
// Optional exact prior Git version, used only for before/after evidence.
const baselineRef=process.argv[6];
if(baselineRef){
 const read=name=>require('node:child_process').execFileSync('git',['show',baselineRef+':'+name],{encoding:'utf8'});
 const world=read('match-world-2.js');
 const boundary=world.indexOf('})();');
 if(boundary<0)throw Error('Baseline world declaration not found');
 r(world.slice(0,boundary+5).replace('const MatchWorld2=','globalThis.calibrationLegacyWorld='));
 r('Object.assign(MatchWorld2,calibrationLegacyWorld)');
 const rivals=read('rivals.js'),start=rivals.indexOf('function rivalSimulate('),end=rivals.indexOf('\nfunction rivalAfterFixture(',start);
 if(start<0||end<0)throw Error('Baseline simulation declaration not found');
 r(rivals.slice(start,end));
 const events=read('match-world-events.js');r(events.slice(events.lastIndexOf("if(typeof rivalSimulate==='function')")));
}

r('aiCoachDecision=(club,base)=>({...base});');
const results=[];
for(const name of fs.readdirSync(dir).filter(n=>/^\d+\.json$/.test(n)).sort((a,b)=>parseInt(a)-parseInt(b))){
 const sample=JSON.parse(fs.readFileSync(path.join(dir,name),'utf8'));
 if(phase!=='all'&&sample.spec.phase!==phase)continue;
 const background=[];
 for(let repeat=0;repeat<repeats;repeat++){
  globalThis.calibrationFixture=JSON.parse(JSON.stringify(sample));
  r(`state=calibrationFixture.initial;globalThis.calibrationLineups=calibrationFixture.lineups;rivalLineup=club=>calibrationLineups.find(l=>l.club===club);globalThis.calibrationResult=rivalSimulate({...calibrationFixture.fixture,round:calibrationFixture.spec.seed+${repeat}*104729},{regulationOnly:true});`);
  background.push(JSON.parse(r('JSON.stringify(calibrationResult.reports.map(x=>({club:x.club,shots:x.shots,goals:x.shotAssessment.goals,attempts:x.attempts,xg:x.attemptXg,strength:x.strengthEvidence})))')));
 }
 const {output:localPath,...spec}=sample.spec;
 results.push({spec,plans:sample.plans,live:sample.live,background});
}
fs.writeFileSync(output,JSON.stringify({repeats,phase,baselineRef,results}));
console.log(JSON.stringify({fixtures:results.length,repeats,phase,output}));
