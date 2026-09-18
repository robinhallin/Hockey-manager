'use strict';
// Preserve per-fixture means used by all gates and bootstrap resampling while
// keeping the review artifact small. Individual seeds remain reproducible.
const fs=require('node:fs');
const input=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
function mean(rows){
 const first=rows[0];
 if(typeof first==='number')return rows.reduce((a,b)=>a+b,0)/rows.length;
 if(Array.isArray(first))return first.map((_,i)=>mean(rows.map(r=>r[i])));
 if(first&&typeof first==='object')return Object.fromEntries(Object.keys(first).map(k=>[k,mean(rows.map(r=>r[k]))]));
 if(!rows.every(v=>v===first))throw Error('Inconsistent report identities');
 return first;
}
const result={...input,aggregation:'Per-fixture background means across repeats; live rows are individual matches. Background round seed = spec.seed + repeat*104729.',results:input.results.map(r=>{const {output,...spec}=r.spec;return {...r,spec,background:[mean(r.background)]};})};
fs.writeFileSync(process.argv[3],JSON.stringify(result));
