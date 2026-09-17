'use strict';
// Load the shared production engine, in entrypoint order. Career-specific
// adapters are exercised by the career suites, not this standalone sample.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');
global.StudioHockey=require('../match-simulation');
const patches=['match-rules-3.js','match-engine-3.js','match-engine-4.js','match-control-integration.js'];
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const scripts=[...html.matchAll(/<script src="([^?]+)\?/g)].map(m=>m[1]);
const actual=scripts.filter(f=>/^match-(rules-\d+|engine-\d+|control-integration)\.js$/.test(f));
if(JSON.stringify(actual)!==JSON.stringify(patches))throw Error('Update the balance loader to match the production entrypoint order.');
for(const file of patches)vm.runInThisContext(fs.readFileSync(path.join(root,file),'utf8'),{filename:file});
if(!StudioHockey.Match.prototype.matchEngine4PlayerDecisionsInstalled||!StudioHockey.Match.prototype.managerControlsInstalled)throw Error('Current engine patches are missing.');
module.exports=StudioHockey;
