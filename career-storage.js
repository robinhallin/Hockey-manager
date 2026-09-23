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
