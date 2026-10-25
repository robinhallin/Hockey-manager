'use strict';
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
function identity(root){
 const version=JSON.parse(fs.readFileSync(path.join(root,'desktop/package.json'))).version;
 const revision=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
 if(!/^[a-f0-9]{40}$/.test(revision))throw Error('Missing build revision');
 return {version,revision};
}
function writeIdentity(root,out){const data=identity(root);fs.writeFileSync(path.join(out,'build-info.js'),`'use strict';\nglobalThis.HOCKEY_BUILD=Object.freeze(${JSON.stringify(data)});\n`);return data;}
module.exports={identity,writeIdentity};
