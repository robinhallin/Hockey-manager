const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ctx=vm.createContext({trainingSafe:s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;')});
vm.runInContext(fs.readFileSync('player-portraits.js','utf8'),ctx);
const run=s=>vm.runInContext(s,ctx);
test('Färjestad has 23 distinct exact-ID portraits with Samuel Eriksson explicitly pending',()=>{
 const app=require('./scripts/career-test-fixture.cjs').boot(undefined,{production:true});
 app.run("startCareerWithClub('Färjestad BK')");
 const rows=app.run("managerRoster().map(p=>({id:p.id,src:playerPortraitRecord(p)?.src}))");
 assert.equal(rows.length,24);
 assert.deepEqual(Array.from(rows.filter(p=>!p.src),p=>p.id),['ep-806192']);
 const ready=Array.from(rows).filter(p=>p.src);
 assert.equal(new Set(ready.map(p=>p.src)).size,23);
 const manifest=JSON.parse(fs.readFileSync('assets/portraits/farjestad-production.json','utf8'));
 assert.deepEqual(manifest.map(p=>p.id).sort(),ready.map(p=>p.id).sort());
 for(const row of manifest){
  assert.equal(run(`playerPortraitRecord({id:${JSON.stringify(row.id)}}).src`),row.asset);
  assert.ok(row.source.startsWith('https://'));
 }
});
test('the complete starting Frölunda roster has distinct exact-ID assets',()=>{
 const app=require('./scripts/career-test-fixture.cjs').boot(undefined,{production:true});
 app.run("startCareerWithClub('Frölunda HC')");
 const rows=app.run("managerRoster().map(p=>({id:p.id,src:playerPortraitRecord(p)?.src}))");
 assert.equal(rows.length,26);
 assert.ok(rows.every(p=>p.src),JSON.stringify(rows.filter(p=>!p.src)));
 assert.equal(new Set(rows.map(p=>p.src)).size,26);
 const manifest=JSON.parse(fs.readFileSync('assets/portraits/frolunda-production.json','utf8'));
 assert.deepEqual(manifest.map(p=>p.id).sort(),Array.from(rows,p=>p.id).sort());
 for(const row of manifest){
  assert.equal(run(`playerPortraitRecord({id:${JSON.stringify(row.id)}}).src`),row.asset);
  assert.ok(row.source.startsWith('https://'));
 }
});
test('exact ID selects portrait, never name or club',()=>{
 assert.equal(run("playerPortraitRecord({id:'ep-251447'}).name"),'Jonathan Ang');
 assert.equal(run("playerPortraitRecord({id:'other',name:'Jonathan Ang'})"),null);
 assert.equal(run("playerPortraitRecord({id:'ep-251447',fictional:true})"),null);
 assert.equal(run("playerPortraitRecord({id:'__proto__'})"),null);
 assert.equal(run("playerPortraitRecord(null)"),null);
 assert.equal(run("playerAvatar({id:'ep-796339',name:'Herman Liv',club:'HV71'})"),run("playerAvatar({id:'ep-796339',name:'Herman Liv',club:'Luleå'})"));
});
test('all registered portraits ship as local PNGs',()=>{
 for(const src of run('Object.values(PLAYER_PORTRAITS).map(x=>x.src)')){
  assert.ok(src.startsWith('assets/portraits/'));
  assert.equal(fs.readFileSync(src).subarray(1,4).toString(),'PNG');
 }
});
test('missing or fictional identities get an honest accessible placeholder',()=>{
 const html=run("playerAvatar({id:'new-junior',name:'Test Junior',fictional:true})");
 assert.match(html,/Porträtt saknas/);assert.doesNotMatch(html,/<img/);
 assert.match(run("playerAvatar({id:'ep-796339',name:'Herman Liv'})"),/onerror=.*this.hidden=true/);
 assert.doesNotMatch(run("playerAvatar({name:'<img onerror=x>'})"),/<img/);
});
test('rendering does not alter a player or consume randomness',()=>{
 run("Math.random=()=>{throw Error('Unexpected randomness')}; var p={id:'ep-796339',name:'Herman Liv'};var before=JSON.stringify(p)");
 assert.equal(run('playerAvatar(p)'),run('playerAvatar(p)'));
 assert.equal(run('JSON.stringify(p)'),run('before'));
});
test('the complete starting HV71 roster has distinct exact-ID assets',()=>{
 const app=require('./scripts/career-test-fixture.cjs').boot(undefined,{production:true});
 app.run("startCareerWithClub('HV71')");
 const rows=app.run("managerRoster().map(p=>({id:p.id,src:playerPortraitRecord(p)?.src}))");
 assert.equal(rows.length,28);
 assert.ok(rows.every(p=>p.src),JSON.stringify(rows.filter(p=>!p.src)));
 assert.equal(new Set(rows.map(p=>p.src)).size,28);
 const manifest=JSON.parse(fs.readFileSync('assets/portraits/hv71-production.json','utf8'));
 assert.equal(manifest.length,26);
 for(const row of manifest){
  assert.equal(run(`playerPortraitRecord({id:${JSON.stringify(row.id)}}).src`),row.asset);
  assert.ok(row.source.startsWith('https://'));
 }
});
test('the complete starting Brynäs roster has distinct exact-ID assets',()=>{
 const app=require('./scripts/career-test-fixture.cjs').boot(undefined,{production:true});
 app.run("startCareerWithClub('Brynäs IF')");
 const rows=app.run("managerRoster().map(p=>({id:p.id,src:playerPortraitRecord(p)?.src}))");
 assert.equal(rows.length,24);
 assert.ok(rows.every(p=>p.src),JSON.stringify(rows.filter(p=>!p.src)));
 assert.equal(new Set(rows.map(p=>p.src)).size,24);
 const manifest=JSON.parse(fs.readFileSync('assets/portraits/brynas-production.json','utf8'));
 assert.deepEqual(manifest.map(p=>p.id).sort(),Array.from(rows,p=>p.id).sort());
 for(const row of manifest){
  assert.equal(run(`playerPortraitRecord({id:${JSON.stringify(row.id)}}).src`),row.asset);
  assert.ok(row.source.startsWith('https://'));
 }
});
