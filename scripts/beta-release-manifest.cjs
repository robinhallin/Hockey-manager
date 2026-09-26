'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
function manifest({directory,smoke,version,revision,sourceRevision,tree}){
 assert.match(version,/^\d+\.\d+\.\d+-beta\.\d+$/);
 for(const sha of [revision,sourceRevision,tree])assert.match(sha,/^[a-f0-9]{40}$/,'Build provenance must identify tested source');
 assert.equal(smoke.version,version,'Installed application version must match installer');
 assert.equal(smoke.installed,true,'A source Electron run is not an installer test');
 assert.equal(smoke.platform,'win32');assert.deepEqual(smoke.errors,[],'Installed app reported errors');
 assert.ok(Array.isArray(smoke.checks)&&smoke.checks.length>0,'Installed UI checks missing');
 const installers=fs.readdirSync(directory).filter(n=>n.endsWith('Setup.exe'));
 assert.equal(installers.length,1,'Exactly one installer must be tested and delivered');
 const file=installers[0];assert.equal(file,`Hockey-Manager-${version}-Windows-x64-Setup.exe`);
 const bytes=fs.readFileSync(path.join(directory,file));assert.ok(bytes.length,'Empty installer');
 return {version,revision,sourceRevision,tree,platform:'Windows x64',installer:file,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),installedTest:{passed:true,checks:smoke.checks},playableLeagues:['SHL','Hockeyallsvenskan','National League (separate beta career)'],europeanLeagues:'CH_NL playable with documented beta limitations; CZ_ELH and FI_LIIGA preparation-only',codeSigned:false};
}
if(require.main===module){
 const {execFileSync}=require('node:child_process'),directory=path.resolve('dist/beta');
 const data=manifest({directory,smoke:JSON.parse(fs.readFileSync('desktop/test-results/smoke-result.json')),version:require('../desktop/package.json').version,revision:process.env.GITHUB_SHA,sourceRevision:process.env.BETA_SOURCE_SHA,tree:execFileSync('git',['rev-parse','HEAD^{tree}'],{encoding:'utf8'}).trim()});
 fs.writeFileSync(path.join(directory,'BUILD-INFO.json'),JSON.stringify(data,null,2)+'\n');
 fs.writeFileSync('desktop/test-results/build-info.json',JSON.stringify(data,null,2)+'\n');
 if(process.env.GITHUB_OUTPUT)fs.appendFileSync(process.env.GITHUB_OUTPUT,`version=${data.version}\n`);
 fs.writeFileSync(path.join(directory,'SHA256SUMS.txt'),`${data.sha256}  ${data.installer}\n`);
 fs.copyFileSync('BETA_GUIDE.md',path.join(directory,'BETA_GUIDE.md'));
 console.log(JSON.stringify({version:data.version,sourceRevision:data.sourceRevision,sha256:data.sha256,installedChecks:data.installedTest.checks.length}));
}
module.exports={manifest};
