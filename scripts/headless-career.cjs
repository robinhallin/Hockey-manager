'use strict';
// In-process engine for long simulation runs. Fresh-context loading is checked
// separately with career-test-fixture at every checkpoint. No game rules change.
const fs=require('node:fs'),vm=require('node:vm');
function headlessCareer(saved=null,options={}){
 const storage={value:saved,extra:{}},nodes=new Map();
 const node=()=>({innerHTML:'',textContent:'',style:{},scrollTop:0,inert:false,classList:{toggle(){},contains(){return false;}},setAttribute(){},addEventListener(){},focus(){},scrollIntoView(){}});
 const get=k=>{if(!nodes.has(k))nodes.set(k,node());return nodes.get(k);};
 global.localStorage={getItem:k=>k==='hockey_manager_alpha02'?storage.value:storage.extra[k]??null,setItem:(k,v)=>{if(k==='hockey_manager_alpha02')storage.value=v;else storage.extra[k]=v;},removeItem:k=>{if(k==='hockey_manager_alpha02')storage.value=null;else delete storage.extra[k];}};
 global.document={getElementById:get,querySelector:get,querySelectorAll:()=>[],addEventListener(){}};
 global.setTimeout=()=>0;global.clearTimeout=()=>{};
 for(const [,src] of fs.readFileSync('index.html','utf8').matchAll(/<script src="([^?]+)\?[^\"]+"><\/script>/g))vm.runInThisContext(fs.readFileSync(src,'utf8'),{filename:src});
 if(!options.production)vm.runInThisContext(require('./competitive-career-fixture.cjs'));
 return {run:code=>vm.runInThisContext(code),storage};
}
module.exports={headlessCareer};
