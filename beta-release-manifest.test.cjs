'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {manifest}=require('./scripts/beta-release-manifest.cjs');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'hm-release-'));
try{
 const version='0.1.0-beta.4',file=`Hockey-Manager-${version}-Windows-x64-Setup.exe`;
 fs.writeFileSync(path.join(dir,file),'test fixture bytes');
 const args={directory:dir,version,revision:'a'.repeat(40),sourceRevision:'b'.repeat(40),tree:'c'.repeat(40),smoke:{version,installed:true,platform:'win32',checks:['save and reload'],errors:[]}};
 const result=manifest(args);assert.equal(result.bytes,18);assert.match(result.sha256,/^[a-f0-9]{64}$/);assert.equal(result.sourceRevision,args.sourceRevision);
 assert.throws(()=>manifest({...args,smoke:{...args.smoke,installed:false}}),/installer test/);
 assert.throws(()=>manifest({...args,smoke:{...args.smoke,errors:['failure']}}),/errors/);
 assert.throws(()=>manifest({...args,smoke:{...args.smoke,version:'0.1.0-beta.3'}}),/version/);
 assert.throws(()=>manifest({...args,sourceRevision:'main'}),/provenance/);
 fs.writeFileSync(path.join(dir,'old-Setup.exe'),'old');assert.throws(()=>manifest(args),/Exactly one/);
}finally{fs.rmSync(dir,{recursive:true,force:true});}
console.log('PASS: installed Windows evidence, exact version, one installer, source revision and checksum gate');
