"use strict";
// Lossless, synchronous storage fallback. Exported files remain ordinary JSON.
const CAREER_PACK_FORMAT='hockey-manager-lzw16-v3';
const CAREER_RESET_PACK_FORMAT='hockey-manager-lzw16-v2';
const CAREER_LEGACY_PACK_FORMAT='hockey-manager-lzw16-v1';
const careerPackedKeys=new Set();
// One storage interface. The browser keeps its existing keys/format; desktop
// writes the same career JSON through a narrow, sandboxed file bridge.
function careerStorageBackend(){return typeof window!=='undefined'&&window.hockeyDesktop?window.hockeyDesktop.storage:localStorage;}
const careerStorage={getItem:key=>careerStorageBackend().getItem(key),setItem:(key,value)=>careerStorageBackend().setItem(key,value),removeItem:key=>careerStorageBackend().removeItem(key)};
function careerStorageHash(text){let hash=2166136261;for(let i=0;i<text.length;i++){hash^=text.charCodeAt(i);hash=Math.imul(hash,16777619);}return hash>>>0;}
function careerIntern(text){
 const marker='\ue000',tokens=/"(?:\\.|[^"\\])*"/g,counts=new Map();
 for(const [token] of text.matchAll(tokens))if(token.length>=8)counts.set(token,(counts.get(token)||0)+1);
 const dictionary=[...counts].filter(([s,n])=>n>=3&&s.length*(n-1)>n*5+10)
  .sort((a,b)=>(b[0].length-5)*(b[1]-1)-(a[0].length-5)*(a[1]-1)).slice(0,2048).map(([s])=>s);
 const ids=new Map(dictionary.map((s,i)=>[s,i.toString(36)]));
 return {dictionary,text:text.replace(tokens,s=>ids.has(s)?marker+ids.get(s)+';':s.replaceAll(marker,marker+'!'))};
}
function careerExpand(text,dictionary,length){
 if(!Array.isArray(dictionary)||dictionary.length>2048||dictionary.some(s=>typeof s!=='string')||dictionary.reduce((n,s)=>n+s.length,0)>length)throw Error('Ogiltig textordlista i sparfilen.');
 let expanded=0;
 return text.replace(/\ue000(!|[0-9a-z]+;)/g,(_,id)=>{
  const value=id==='!'?'\ue000':dictionary[parseInt(id,36)];
  if(value===undefined||(expanded+=value.length)>length)throw Error('Skadad textordlista i sparfilen.');
  return value;
 });
}
function careerPack(original){
 const interned=careerIntern(original),text=interned.text;
 const dictionary=new Map(),codes=[];let next=256,prefix=null;
 const byte=value=>{
  if(prefix===null){prefix=value;return;}
  const key=prefix*256+value,found=dictionary.get(key);
  if(found!==undefined){prefix=found;return;}
  codes.push(prefix);
  if(next<65535)dictionary.set(key,next++);
  else {codes.push(65535);dictionary.clear();next=256;}
  prefix=value;
 };
 for(let i=0;i<text.length;i++){const c=text.charCodeAt(i);byte(c&255);byte(c>>>8);}
 if(prefix!==null)codes.push(prefix);
 const chunks=[];for(let i=0;i<codes.length;i+=8192)chunks.push(String.fromCharCode(...codes.slice(i,i+8192)));
 return JSON.stringify({format:CAREER_PACK_FORMAT,length:original.length,encodedLength:text.length,dictionary:interned.dictionary,hash:careerStorageHash(original),data:chunks.join('')});
}
function careerUnpack(value){
 const interned=value?.format===CAREER_PACK_FORMAT;
 const resettable=interned||value?.format===CAREER_RESET_PACK_FORMAT;
 if(!resettable&&value?.format!==CAREER_LEGACY_PACK_FORMAT)return value;
 if(!Number.isInteger(value.length)||value.length<0||value.length>32000000||typeof value.data!=='string')throw Error('Ogiltig komprimerad sparfil.');
 const encodedLength=interned?value.encodedLength:value.length;
 if(!Number.isInteger(encodedLength)||encodedLength<0||encodedLength>value.length*2)throw Error('Ogiltig textlängd i sparfilen.');
 const dictionary=Array.from({length:256},(_,i)=>String.fromCharCode(i));let previous='',next=256,bytes=0,low=null;const chunks=[];let chunk='';
 for(let i=0;i<value.data.length;i++){
  const code=value.data.charCodeAt(i);
  // Old saves can use 65535 as data. Only v2 and newer reserve it to reset a full
  // dictionary, so later seasons compress as well as the start of a career.
  if(resettable&&code===65535){dictionary.length=256;previous='';next=256;continue;}
  const entry=dictionary[code]??(code===next&&previous?previous+previous[0]:null);
  if(entry===null||entry===undefined)throw Error('Skadad komprimerad sparfil.');
  bytes+=entry.length;if(bytes>encodedLength*2)throw Error('Felaktig sparfilsstorlek.');
  for(let j=0;j<entry.length;j++){const b=entry.charCodeAt(j);if(low===null)low=b;else{chunk+=String.fromCharCode(low|(b<<8));low=null;if(chunk.length>=8192){chunks.push(chunk);chunk='';}}}
  if(previous&&next<(resettable?65535:65536))dictionary[next++]=previous+entry[0];previous=entry;
 }
 chunks.push(chunk);const encoded=chunks.join('');
 if(low!==null||encoded.length!==encodedLength)throw Error('Sparfilens textlängd stämmer inte.');
 const text=interned?careerExpand(encoded,value.dictionary,value.length):encoded;
 if(text.length!==value.length||careerStorageHash(text)!==value.hash)throw Error('Sparfilens kontrollsumma stämmer inte.');
 return JSON.parse(text);
}
function careerRead(raw){return careerUnpack(JSON.parse(raw));}
function careerStore(key,text){
 // Once this key needs compression, avoid repeated quota failures on every autosave.
 if(careerPackedKeys.has(key)){careerStorage.setItem(key,careerPack(text));return;}
 try{careerStorage.setItem(key,text);}
 catch(error){
  if(!['QuotaExceededError','NS_ERROR_DOM_QUOTA_REACHED'].includes(error?.name)&&error?.code!==22&&error?.code!==1014)throw error;
  const packed=careerPack(text);if(packed.length>=text.length)throw error;
  careerStorage.setItem(key,packed);careerPackedKeys.add(key);
 }
}
// Keep the active save authoritative until both preparations have succeeded.
// A failed backup must never replace the career that will load on refresh.
function careerReplaceStored(text,previousText){
 const backup=careerStorage.getItem(PREVIOUS_CAREER_KEY);
 if(previousText!==null)careerStore(PREVIOUS_CAREER_KEY,previousText);
 try{careerStore(CAREER_SAVE_KEY,text);}
 catch(error){
  if(previousText!==null)try{
   if(backup===null)careerStorage.removeItem(PREVIOUS_CAREER_KEY);
   else careerStorage.setItem(PREVIOUS_CAREER_KEY,backup);
  }catch{error.careerBackupRestoreFailed=true;}
  throw error;
 }
}

// Only periodic match saves use this queue. Explicit save, pause, import and
// close retain their synchronous contract and invalidate every older snapshot.
const careerAutosave={worker:null,id:0,timer:null,busy:false,again:false,disabled:false,completed:0,cancelled:0,fallbacks:0,last:null};
function careerCancelAutosave(){
 careerAutosave.id++;careerAutosave.again=false;careerAutosave.busy=false;
 if(careerAutosave.timer!==null)clearTimeout(careerAutosave.timer);
 careerAutosave.timer=null;
 if(careerAutosave.worker)careerAutosave.worker.terminate();careerAutosave.worker=null;
 careerAutosave.cancelled++;
}
function careerAutosaveSample(name,value){
 if(typeof performanceProfile==='undefined'||!Number.isFinite(value))return;
 const samples=performanceProfile.samples[name]??=[];samples.push(value);if(samples.length>30)samples.shift();
}
function careerAutosaveDiagnostics(){return {busy:careerAutosave.busy,queued:careerAutosave.timer!==null||careerAutosave.again,worker:!!careerAutosave.worker,completed:careerAutosave.completed,cancelled:careerAutosave.cancelled,fallbacks:careerAutosave.fallbacks,last:careerAutosave.last};}
function careerRequestAutosave(){
 if(careerLoadIssue)return false;
 if(careerAutosave.busy){careerAutosave.again=true;return true;}
 if(careerAutosave.timer!==null)return true;
 careerAutosave.timer=setTimeout(()=>{careerAutosave.timer=null;careerStartAutosave();},0);
 return true;
}
function careerStartAutosave(){
 if(careerLoadIssue)return;
 if(typeof Worker==='undefined'||careerAutosave.disabled){careerAutosave.fallbacks++;save({normalize:false});return;}
 const id=++careerAutosave.id,career=state,started=performanceNow();careerAutosave.busy=true;
 const finish=(ok,code='')=>{
  if(id!==careerAutosave.id||state!==career)return;
  careerAutosave.busy=false;careerSaveError=!ok;careerSaveErrorCode=code;
  if(ok)careerAutosave.completed++;renderSaveStatus();
  if(careerAutosave.again){careerAutosave.again=false;careerRequestAutosave();}
 };
 try{
  if(!careerAutosave.worker)careerAutosave.worker=new Worker('career-save-worker.js');
  const worker=careerAutosave.worker;
  worker.onerror=()=>{
   if(id!==careerAutosave.id)return;
   careerAutosave.disabled=true;worker.terminate();careerAutosave.worker=null;careerAutosave.busy=false;
   // Unsupported workers retain the old persistence path outside the RAF task.
   careerAutosave.fallbacks++;save({normalize:false});
  };
  worker.onmessage=async({data})=>{
   if(data.id!==careerAutosave.id||state!==career)return;
   if(data.error){finish(false,data.code);return;}
   const startWrite=performanceNow();
   try{
    const backend=careerStorageBackend();
    if(typeof backend.setItemAsync==='function')await backend.setItemAsync(CAREER_SAVE_KEY,data.value);
    else backend.setItem(CAREER_SAVE_KEY,data.value);
    if(id!==careerAutosave.id||state!==career)return;
    if(data.packed)careerPackedKeys.add(CAREER_SAVE_KEY);
    const writeMS=performanceNow()-startWrite;
    careerAutosaveSample('autosaveSerialize',data.serializeMS);careerAutosaveSample('autosavePack',data.packMS);careerAutosaveSample('autosaveWrite',writeMS);
    careerAutosave.last={serializeMS:data.serializeMS,packMS:data.packMS,writeMS,characters:data.characters,packed:data.packed};
    finish(true);
   }catch(error){finish(false,error.name);}
  };
  worker.postMessage({id,state:career,pack:!(typeof window!=='undefined'&&window.hockeyDesktop)});
  careerAutosaveSample('autosaveSnapshot',performanceNow()-started);
 }catch(error){careerAutosave.disabled=true;careerCancelAutosave();careerAutosave.fallbacks++;save({normalize:false});}
}
