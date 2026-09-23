'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),out=path.join(__dirname,'game');
fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out,{recursive:true});
for(const name of fs.readdirSync(root))if(name==='index.html' || /\.(js|css)$/.test(name))fs.copyFileSync(path.join(root,name),path.join(out,name));
fs.cpSync(path.join(root,'assets'),path.join(out,'assets'),{recursive:true});
// Stage only the runtime. No tests, dependency tree, user saves or repository metadata.
console.log('Staged offline game: '+fs.readdirSync(out).length+' root files.');
