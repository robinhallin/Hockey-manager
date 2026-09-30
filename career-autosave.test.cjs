'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {boot}=require('./scripts/career-test-fixture.cjs');
function setup(){const a=boot();a.run(`startCareerWithClub('HV71');globalThis.workers=[];globalThis.Worker=class{
 constructor(url){this.url=url;workers.push(this);}postMessage(data){this.data=JSON.parse(JSON.stringify(data));}terminate(){this.terminated=true;}
};careerAutosave.cancelled=0;careerRequestAutosave();careerAutosave.timer=null;careerStartAutosave();`);return a;}
test('a periodic save snapshots asynchronously; explicit save defeats a stale worker response',async()=>{
 const a=setup(),r=a.run,saved=a.storage.value;
 assert.equal(r('careerAutosave.busy'),true);assert.equal(a.storage.value,saved);assert.equal(r('workers[0].url'),'career-save-worker.js');
 r('state.money+=123;save();globalThis.current=localStorage.getItem(CAREER_SAVE_KEY)');
 await r('workers[0].onmessage({data:{id:workers[0].data.id,value:JSON.stringify(workers[0].data.state)}})');
 assert.equal(a.storage.value,r('current'));assert.equal(r('workers[0].terminated'),true);assert.equal(r('careerAutosave.busy'),false);
});
test('busy requests coalesce and the next snapshot contains the latest career',async()=>{
 const a=setup(),r=a.run;r('state.money+=456;careerRequestAutosave();careerRequestAutosave()');
 assert.equal(r('workers.length'),1);assert.equal(r('careerAutosave.again'),true);
 await r('workers[0].onmessage({data:{id:workers[0].data.id,value:JSON.stringify(workers[0].data.state),packed:false,serializeMS:8,packMS:0,characters:100}})');
 assert.equal(r('careerAutosave.completed'),1);assert.equal(r('careerAutosave.timer!==null'),true);
 r('careerAutosave.timer=null;careerStartAutosave()');assert.equal(r('workers[0].data.state.money'),r('state.money'));
});
test('a failed background write keeps the previous save and reports a recoverable error',async()=>{
 const a=setup(),r=a.run,saved=a.storage.value;r(`localStorage.setItem=()=>{const e=Error('blocked');e.name='SecurityError';throw e;}`);
 await r('workers[0].onmessage({data:{id:workers[0].data.id,value:"{}",serializeMS:0,packMS:0}})');
 assert.equal(a.storage.value,saved);assert.equal(r('careerSaveError'),true);assert.equal(r('careerSaveErrorCode'),'SecurityError');assert.equal(r('careerAutosave.busy'),false);
});
test('native asynchronous acknowledgement cannot replace a later manual-save status',async()=>{
 const a=setup(),r=a.run;r(`globalThis.disk='old';globalThis.ack=null;globalThis.window={hockeyDesktop:{storage:{getItem:()=>disk,setItem:(_k,v)=>{disk=v;},setItemAsync:(_k,_v)=>new Promise(resolve=>ack=resolve)}}};`);
 const pending=r('workers[0].onmessage({data:{id:workers[0].data.id,value:JSON.stringify(workers[0].data.state),serializeMS:0,packMS:0}})');
 r('state.money+=789;save();globalThis.manual=disk;careerSaveError=true;ack()');await pending;
 assert.equal(r('disk'),r('manual'));assert.equal(r('careerSaveError'),true,'old completion cannot clear a newer error');
});
test('the real worker preserves all JSON and the existing compressed format without live-state access',()=>{
 const a=boot(),r=a.run;r("startCareerWithClub('HV71');state.calendar.date=calendarTarget();startMatch();for(let i=0;i<30;i++)studioStep()");
 const snapshot=JSON.parse(r('JSON.stringify(state)')),messages=[],context=vm.createContext({performance:{now:()=>0},self:{postMessage:d=>messages.push(d)}});
 context.importScripts=file=>vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});
 vm.runInContext(fs.readFileSync('career-save-worker.js','utf8'),context);context.data={id:7,state:snapshot,pack:true};vm.runInContext('self.onmessage({data})',context);
 assert.equal(messages[0].id,7);assert.equal(messages[0].packed,true);assert.deepEqual(JSON.parse(r(`JSON.stringify(careerRead(${JSON.stringify(messages[0].value)}))`)),snapshot);
});
