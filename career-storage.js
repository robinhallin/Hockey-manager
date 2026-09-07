"use strict";
// Lossless, synchronous storage fallback. Exported files remain ordinary JSON.
const CAREER_PACK_FORMAT='hockey-manager-lzw16-v1';
const careerPackedKeys=new Set();
function careerStorageHash(text){let hash=2166136261;for(let i=0;i<text.length;i++){hash^=text.charCodeAt(i);hash=Math.imul(hash,16777619);}return hash>>>0;}
function careerPack(text){
 const dictionary=new Map(),codes=[];let next=256,prefix=null;
 const byte=value=>{if(prefix===null){prefix=value;return;}const key=prefix*256+value,found=dictionary.get(key);if(found!==undefined){prefix=found;return;}codes.push(prefix);if(next<65536)dictionary.set(key,next++);prefix=value;};
 for(let i=0;i<text.length;i++){const c=text.charCodeAt(i);byte(c&255);byte(c>>>8);}
 if(prefix!==null)codes.push(prefix);
 const chunks=[];for(let i=0;i<codes.length;i+=8192)chunks.push(String.fromCharCode(...codes.slice(i,i+8192)));
 return JSON.stringify({format:CAREER_PACK_FORMAT,length:text.length,hash:careerStorageHash(text),data:chunks.join('')});
}
function careerUnpack(value){
 if(value?.format!==CAREER_PACK_FORMAT)return value;
 if(!Number.isInteger(value.length)||value.length<0||value.length>32000000||typeof value.data!=='string')throw Error('Ogiltig komprimerad sparfil.');
 const dictionary=Array.from({length:256},(_,i)=>String.fromCharCode(i));let previous='',next=256,bytes=0,low=null;const chunks=[];let chunk='';
 for(let i=0;i<value.data.length;i++){
  const code=value.data.charCodeAt(i),entry=dictionary[code]??(code===next&&previous?previous+previous[0]:null);
  if(entry===null||entry===undefined)throw Error('Skadad komprimerad sparfil.');
  bytes+=entry.length;if(bytes>value.length*2)throw Error('Felaktig sparfilsstorlek.');
  for(let j=0;j<entry.length;j++){const b=entry.charCodeAt(j);if(low===null)low=b;else{chunk+=String.fromCharCode(low|(b<<8));low=null;if(chunk.length>=8192){chunks.push(chunk);chunk='';}}}
  if(previous&&next<65536)dictionary[next++]=previous+entry[0];previous=entry;
 }
 chunks.push(chunk);const text=chunks.join('');
 if(low!==null||text.length!==value.length||careerStorageHash(text)!==value.hash)throw Error('Sparfilens kontrollsumma stämmer inte.');
 return JSON.parse(text);
}
function careerRead(raw){return careerUnpack(JSON.parse(raw));}
function careerStore(key,text){
 // Once this key needs compression, avoid repeated quota failures on every autosave.
 if(careerPackedKeys.has(key)){localStorage.setItem(key,careerPack(text));return;}
 try{localStorage.setItem(key,text);}
 catch(error){
  if(!['QuotaExceededError','NS_ERROR_DOM_QUOTA_REACHED'].includes(error?.name)&&error?.code!==22&&error?.code!==1014)throw error;
  const packed=careerPack(text);if(packed.length>=text.length)throw error;
  localStorage.setItem(key,packed);careerPackedKeys.add(key);
 }
}
