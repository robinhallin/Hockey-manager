'use strict';
const assert=require('node:assert/strict');
const {Match}=require('./current-match-engine.cjs');
const rosters=require('../match-lab-rosters');
const totals={games:0,decisions:[{},{}],shots:[0,0],goals:[0,0]};
for(let seed=1;seed<=24;seed++){
 const m=new Match(rosters,{seed:seed*4409});let steps=0;
 while(!m.finished&&steps++<24000)m.step();
 assert.ok(m.finished,`period ${seed} must finish`);
 totals.games++;for(const side of [0,1]){totals.shots[side]+=m.stats[side].shots;totals.goals[side]+=m.score[side];}
 for(const [kind,count] of Object.entries(m.decisionAudit?.counts||{}))totals.decisions[0][kind]=(totals.decisions[0][kind]||0)+count;
}
console.log(JSON.stringify(totals,null,2));
