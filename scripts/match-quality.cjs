const path=require('node:path');
const {Match}=require(path.resolve(process.argv[2]||'match-simulation.js'));
const rosters=require('../match-lab-rosters');
const count=Number(process.argv[3]||12),rows=[],offset=Number(process.argv[4]||0);
for(let seed=1;seed<=count;seed++){
 const m=new Match(rosters,{seed:(seed+offset)*997,duration:1200});let samples=0,held=0,loose=0,travel=0;
 while(!m.finished){m.step();if(m.stoppage<=0){samples++;held+=!!m.carrier;loose+=!m.carrier&&!m.flight;travel+=!!m.flight;}}
 rows.push({seed:(seed+offset)*997,goals:m.score.reduce((a,b)=>a+b,0),shots:m.stats.reduce((a,b)=>a+b.shots,0),attempts:m.shots.length,passes:m.stats.reduce((a,b)=>a+b.passes,0),entries:m.stats.reduce((a,b)=>a+b.entries,0),offside:m.events.filter(e=>e.type==='offside').length,xG:m.shots.reduce((n,s)=>n+s.quality,0),held:held/samples,loose:loose/samples,travel:travel/samples,decisions:m.decisionAudit?.counts||null});
}
const means=Object.fromEntries(Object.keys(rows[0]).filter(k=>!['seed','decisions'].includes(k)).map(k=>[k,rows.reduce((n,r)=>n+r[k],0)/count]));
console.log(JSON.stringify({periods:count,durationSeconds:1200,seedOffset:offset,seedRule:'(i + offset) * 997',means,rows},null,2));
