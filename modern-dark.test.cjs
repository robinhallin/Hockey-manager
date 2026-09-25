const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {boot}=require('./scripts/career-test-fixture.cjs');
test('all Swedish and NHL clubs have local official crests; views stay read-only',()=>{
 const {run,get}=boot();run('startCareerWithClub("HV71");');
 const names=run('[...Object.keys(state.world.membership),...NHL_CLUBS]');
 assert.equal(names.length,60);
 for(const name of names){const file=run('CLUB_CRESTS['+JSON.stringify(name)+']');assert.ok(file,name);assert.ok(fs.existsSync(file),file);const svg=fs.readFileSync(file,'utf8');assert.match(svg,/<svg\b/);assert.doesNotMatch(svg,/<script|onload=/i);}
 const before=run('JSON.stringify(state)');
 const html=run('modernClubHero()+modernOfficeSummary()');
 assert.match(html,/assets\/crests\/hv711_hv71.svg/);
 assert.match(html,/Nästa match/);assert.match(html,/Inga avslutade matchrapporter/);
 assert.equal(run('JSON.stringify(state)'),before);
 assert.match(run('clubCrest("Okänd <klubb>")'),/Okänd &lt;klubb&gt;/);
 assert.match(run('careerBadge("HV71")'),/<img/);
 assert.match(get('#content').innerHTML,/ov-dashboard/);
 assert.match(get('#content').innerHTML,/assets\/crests\/hv711_hv71.svg/);
 run('state.analysis.matches.unshift({id:"old",finished:true,year:2025,club:managerClub(),opponent:"Luleå Hockey",own:2,against:1});');
 assert.doesNotMatch(run('modernOfficeSummary()'),/Invalid Date/);
 assert.match(run('modernOfficeSummary()'),/#match\/old/);
 const index=fs.readFileSync('index.html','utf8');
 assert.ok(index.lastIndexOf('modern-dark.css')>index.lastIndexOf('day-transition.css'));
});
