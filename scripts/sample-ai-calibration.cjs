'use strict';
const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const dir=process.argv[2],workers=Number(process.argv[3]||4);
if(!dir||!Number.isInteger(workers)||workers<1||workers>8)throw Error('Usage: node scripts/sample-ai-calibration.cjs output-directory [1–8 workers]');
fs.mkdirSync(dir,{recursive:true});
const specs=JSON.parse(fs.readFileSync(path.join(__dirname,'../qa/ai-calibration-specs.json'),'utf8')).filter(s=>!process.argv[4]||s.phase===process.argv[4]).filter(s=>!process.argv[5]||s.id>=Number(process.argv[5])).filter(s=>!process.argv[6]||s.id<Number(process.argv[6])).filter(s=>process.env.RESUME_CALIBRATION!=='1'||!fs.existsSync(path.join(dir,s.id+'.json')));
let next=0;
async function worker(){
 while(next<specs.length){
  const input=specs[next++],spec={...input,output:path.resolve(dir,input.id+'.json')};
  await new Promise((resolve,reject)=>{
   const child=spawn(process.execPath,[path.join(__dirname,'ai-calibration-sample.cjs'),JSON.stringify(spec)],{stdio:'inherit'});
   child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(new Error('Fixture '+spec.id+' failed: '+code)));
  });
 }
}
Promise.all(Array.from({length:workers},worker)).catch(e=>{console.error(e.message);process.exitCode=1;});
