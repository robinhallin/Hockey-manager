// Descriptive tuning sample, not a claim of a calibrated real-world hockey model.
const assert=require('node:assert/strict');
const {Match}=require('../match-simulation');
const rosters=require('../match-lab-rosters');
const periods=24,totals={goals:0,shots:0,attempts:0,blocks:0,hits:0,penalties:0,passes:0,passAttempts:0,quality:0},types={};
for(let i=1;i<=periods;i++){
 const m=new Match(rosters,{seed:i*1107});let steps=0;
 while(!m.finished&&steps++<23000)m.step();assert.ok(m.finished,'period '+i+' must finish');
 totals.goals+=m.score[0]+m.score[1];totals.penalties+=m.events.filter(e=>e.type==='penalty').length;
 for(const s of m.stats)for(const key of ['shots','attempts','blocks','hits','passes','passAttempts'])totals[key]+=s[key];
 for(const shot of m.shots){assert.ok(Number.isFinite(shot.quality));types[shot.context.type]=(types[shot.context.type]||0)+1;totals.quality+=shot.quality;}
 assert.equal(m.shots.filter(s=>s.outcome==='goal').length,m.score[0]+m.score[1]);
}
const perTeamPer60=Object.fromEntries(Object.entries(totals).map(([k,v])=>[k,+(v/(periods*2/3)).toFixed(2)]));
console.log(JSON.stringify({periods,seedRule:'i * 1107, i=1..24',perTeamPer60,shotTypes:types,savePct:+(100*(1-totals.goals/totals.shots)).toFixed(2)},null,2));
