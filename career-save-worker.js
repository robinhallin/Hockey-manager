'use strict';
// Plain JSON export and the existing lossless browser format stay compatible.
// This worker owns only a structured-cloned snapshot, never the live career.
importScripts('career-storage.js');
self.onmessage=({data})=>{
 const start=performance.now();
 try{
  const text=JSON.stringify(data.state),serialized=performance.now();
  const value=data.pack?careerPack(text):text;
  self.postMessage({id:data.id,value,packed:data.pack,characters:text.length,serializeMS:serialized-start,packMS:performance.now()-serialized});
 }catch(error){self.postMessage({id:data.id,error:error.message,code:error.name});}
};
