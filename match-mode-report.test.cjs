'use strict';
const assert=require('node:assert/strict');
const {summarize}=require('./scripts/match-mode-report.cjs');
const team=(club,shots,seconds=3600)=>({club,shots,goals:2,xg:2.5,strength:[{kind:'even',seconds,shots,attempts:shots+10,xg:2.5,goals:2},{kind:'pp',seconds:0,shots:0,attempts:0,xg:0,goals:0},{kind:'pk',seconds:0,shots:0,attempts:0,xg:0,goals:0}]});
const rows=Array.from({length:12},(_,i)=>({scenario:'pressure',venue:'away',sample:i+1,live:[team('A',30+i),team('B',46+i)],background:[team('B',34+i),team('A',30+i)]}));
const report=summarize(rows),own=report.groups['A / away / pressure / manager'],other=report.groups['A / away / pressure / opponent'];
assert.equal(own.metrics.shots.liveMinusBackground,0,'pair by club, not home/away array index');
assert.deepEqual(own.metrics.shots.bootstrap95,[0,0]);
assert.equal(other.metrics.shots.liveMinusBackground,12);
assert.equal(report.calibrationPassed,false,'a completed simulation is not a passed calibration');
assert.equal(report.warnings.length,1);assert.deepEqual(other.metrics.shots.bootstrap95,[12,12]);
assert.equal(own.strength.pp.live.shotsPer60,null,'zero exposure is not evidence of a zero rate');
assert.equal(own.strength.even.live.shotsPer60,35.5);
const sparse=summarize(rows.slice(0,1));assert.equal(sparse.groups['A / away / pressure / manager'].metrics.shots.bootstrap95,null,'one fixture cannot estimate sampling uncertainty');
assert.throws(()=>summarize([]));
assert.throws(()=>summarize([rows[0],rows[0]]),/Duplicate fixture/);
assert.throws(()=>summarize([{...rows[0],live:[team('A',1),team('B',30)]}]),/Goals/);
assert.throws(()=>summarize([{...rows[0],background:[team('C',30),team('B',20)]}]),/club/);
assert.throws(()=>summarize([{...rows[0],live:[{...team('A',30),xg:NaN},team('B',30)]}]),/Finite/);
const mixed=summarize([...rows,...rows.map(r=>({...r,venue:'home'}))]);assert.equal(Object.keys(mixed.groups).length,4,'home and away stay separate');
console.log('PASS: fixture-paired uncertainty, club identity, sparse exposure, validity and calibration failure reporting');

const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawnSync}=require('node:child_process');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'match-mode-report-'));
try{
 const file=path.join(dir,'sample.jsonl');fs.writeFileSync(file,rows.map(r=>JSON.stringify(r)).join('\n'));
 const result=spawnSync(process.execPath,['scripts/match-mode-report.cjs',file],{encoding:'utf8'});
 assert.equal(result.status,1,'failed calibration propagates to the command exit code');
 assert.equal(JSON.parse(result.stdout).calibrationPassed,false);
}finally{fs.rmSync(dir,{recursive:true,force:true});}
