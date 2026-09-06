// Rebuild the isolated prototype's data from the game's existing researched attributes.
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
process.chdir(path.join(__dirname, '..'));
const element = () => ({innerHTML:'', textContent:'', style:{}, classList:{toggle(){}}, setAttribute(){}, addEventListener(){}});
const context = vm.createContext({Intl, Math, Date, console, setTimeout:()=>0, clearTimeout(){},
  localStorage:{getItem:()=>null, setItem(){}},
  document:{getElementById:element, querySelector:element, querySelectorAll:()=>[], addEventListener(){}}});
for (const [, src] of fs.readFileSync('index.html','utf8').matchAll(/<script src="([^?]+)\?[^\"]+"><\/script>/g)) {
  vm.runInContext(fs.readFileSync(src,'utf8'), context, {filename:src});
}
const data = vm.runInContext(`['HV71','Färjestad BK'].map(name=>({name,code:careerIdentity(name).code,
  primary:careerIdentity(name).primary,accent:careerIdentity(name).color,
  players:state.clubRosters[name].map(p=>({id:String(p.id),name:p.name,pos:p.pos,attributes:{...ensurePlayerAttributes(p)}}))}))`, context);
fs.writeFileSync('match-lab-rosters.js', '"use strict";\n// Snapshot of existing game data. Simulation attributes, not measured real-world ratings.\nconst MATCH_LAB_ROSTERS = '+JSON.stringify(data,null,2)+';\nif(typeof module!=="undefined")module.exports=MATCH_LAB_ROSTERS;\n');
console.log('Exported '+data.map(t=>t.name+': '+t.players.length).join(', '));
