// Stress diagnostic for ability separation. Not an empirical SHL calibration.
const assert=require('node:assert/strict');
const {Match}=require('./current-match-engine.cjs');
const base=require('../match-lab-rosters');
const PERIODS=6;
function scale(team,delta,name){return {...team,name,players:team.players.map(p=>({...p,attributes:Object.fromEntries(Object.entries(p.attributes).map(([k,v])=>[k,Math.max(1,Math.min(20,v+delta))]))}))};}
const profiles={weak:scale(base[0],-2,'Weak stress profile'),baseline:scale(base[0],0,'Baseline profile'),strong:scale(base[0],2,'Strong stress profile')};
function sample(a,b,periods=PERIODS,seedOffset=0){const totals=[{goals:0,shots:0,attempts:0,quality:0},{goals:0,shots:0,attempts:0,quality:0}];for(let i=1;i<=periods;i++)for(const reverse of [false,true]){const m=new Match(reverse?[b,a]:[a,b],{seed:(i+seedOffset)*1879});let steps=0;while(!m.finished&&steps++<23000)m.step();assert.ok(m.finished,'period must finish');assert.equal(m.shots.filter(s=>s.outcome==='goal').length,m.score[0]+m.score[1]);for(let side=0;side<2;side++){const profileSide=reverse?1-side:side;totals[profileSide].goals+=m.score[side];totals[profileSide].shots+=m.stats[side].shots;totals[profileSide].attempts+=m.stats[side].attempts;totals[profileSide].quality+=m.shots.filter(s=>s.side===side).reduce((n,s)=>n+s.quality,0);}}return totals.map(t=>Object.fromEntries(Object.entries(t).map(([k,v])=>[k,+(v/(periods*2)).toFixed(2)])));}
if(require.main===module){
const cases=[['baseline','baseline'],['strong','baseline'],['baseline','weak'],['strong','weak']],rows={};cases.forEach(([a,b])=>rows[`${a}-${b}`]=sample(profiles[a],profiles[b]));
assert.ok(rows['strong-baseline'][0].quality>rows['strong-baseline'][1].quality,'strong profile should create more shot quality');
assert.ok(rows['baseline-weak'][0].quality>rows['baseline-weak'][1].quality,'baseline should create more shot quality than weak profile');
const warnings=[];for(const [name,sides] of Object.entries(rows))sides.forEach((side,index)=>{if(side.shots>20)warnings.push(`${name} side ${index}: ${side.shots} shots/20m indicates runaway volume`);if(side.shots<6)warnings.push(`${name} side ${index}: ${side.shots} shots/20m indicates suppressed offense`);});
console.log(JSON.stringify({engine:'Match Engine 4 + manager controls; career modifiers excluded',periodsPerMatchup:PERIODS*2,method:'Same roster snapshot with every attribute shifted by -2/0/+2. Same seeds, both rink sides per profile. Stress diagnostic only.',rows,warnings},null,2));

}
module.exports={sample,profiles};
