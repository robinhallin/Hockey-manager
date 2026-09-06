// Match fixtures below explicitly set match day; daily progression is tested in daily-manager.test.cjs.
const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
function boot(saved){
  const storage={value:saved,extra:{}},nodes=new Map(),events={};
  const node=()=>{const classes=new Set();return {innerHTML:'',textContent:'',attrs:{},style:{},scrollTop:0,inert:false,
    classList:{toggle(k,value){const on=value??!classes.has(k);if(on)classes.add(k);else classes.delete(k);return on;},contains:k=>classes.has(k)},
    setAttribute(k,v){this.attrs[k]=v;},addEventListener(){},focus(){this.focused=true;}};};
  const get=k=>{if(!nodes.has(k))nodes.set(k,node());return nodes.get(k);};
  const context=vm.createContext({Intl,Math,Date,console,setTimeout:()=>0,clearTimeout(){},
    localStorage:{getItem:k=>k==='hockey_manager_alpha02'?storage.value||null:storage.extra[k]||null,setItem:(k,v)=>{if(k==='hockey_manager_alpha02')storage.value=v;else storage.extra[k]=v;}},
    document:{getElementById:k=>get('#'+k),querySelector:get,querySelectorAll:()=>[],addEventListener:(key,handler)=>events[key]=handler}});
  // Use the actual entrypoint order so this suite also catches missing modules.
  for(const [,src] of fs.readFileSync('index.html','utf8').matchAll(/<script src="([^?]+)\?[^\"]+"><\/script>/g))vm.runInContext(fs.readFileSync(src,'utf8'),context,{filename:src});
  return {run:code=>vm.runInContext(code,context),storage,nodes,get,events};
}
module.exports={boot};
