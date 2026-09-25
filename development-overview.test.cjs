'use strict';
const assert=require('node:assert/strict');
const {boot}=require('./scripts/career-test-fixture.cjs');
const app=boot(),r=app.run;
r("startCareerWithClub('HV71');deskNavigate('training');globalThis.p=managerRoster().find(p=>p.pos!=='MV');globalThis.j=juniorPlayers()[0]");
assert.doesNotMatch(r('trainingView()'),/dv-detail-view|dv-inspector|individual-training/);
assert.equal(r('new Set(developmentRoster().map(p=>String(p.id))).size'),r('developmentRoster().length'));
assert.ok(r('developmentRoster().some(p=>p.id===j.id)'));
const original=r('JSON.stringify(state)');
for(const junior of [false,true]){
 for(const key of r('Object.keys(DEVELOPMENT_COLUMNS)')){
  r(`developmentSort('${key}',${junior})`);
  const first=Array.from(r(`developmentRows(${junior}).map(row=>({id:row.p.id,value:row['${key}']}))`));
  const direction=r(`developmentUI[developmentKey('direction',${junior})]`);
  for(let i=1;i<first.length;i++){
   if(first[i].value==null)continue;
   assert.notEqual(first[i-1].value,null,`${key}: missing values sort last`);
   const a=first[i-1].value,b=first[i].value;
   assert.ok((typeof a==='number'?a-b:String(a).localeCompare(String(b),'sv',{numeric:true}))*direction<=0,`${key}: displayed values are ordered`);
  }
  r(`developmentSort('${key}',${junior})`);
  assert.equal(r(`developmentUI[developmentKey('direction',${junior})]`),-direction);
 }
}
assert.equal(r('JSON.stringify(state)'),original,'sorting and rendering cannot change the career');
r("p.attributes.shooting=p.trainingBaseline.shooting+2;p.attributes.skating=p.trainingBaseline.skating-1");
assert.equal(r('developmentChange(p).net'),1);assert.equal(r('developmentChange(p).up'),2);assert.equal(r('developmentChange(p).down'),1);
r("developmentSet('filter','senior');developmentSet('query',p.name);developmentSort('age');developmentOpenPlayer(p.id)");
assert.match(r('trainingView()'),/individual-training/);
r("setIndividualLoad(p.id,'rest');developmentClosePlayer()");
assert.equal(r('p.trainingLoad'),'rest');assert.equal(r('developmentUI.query'),r('p.name'));assert.equal(r('developmentRows().length'),1);
r("developmentOpenPlayer(p.id);deskBack()");assert.equal(r('developmentUI.detail'),false);assert.equal(r('developmentUI.query'),r('p.name'));
r("deskNavigate('medical');developmentOpenPlan(p.id)");assert.equal(r('developmentUI.detail'),true);assert.equal(r('developmentUI.query'),'');assert.equal(r('developmentUI.filter'),'all');
r('deskBack()');assert.equal(r('state.page'),'medical');assert.equal(r('developmentUI.query'),r('p.name'));assert.equal(r('developmentUI.filter'),'senior');
r("deskNavigate('juniors')");assert.doesNotMatch(r('juniorsView()'),/dv-detail-view|junior-profile/);
r("juniorSelect(j.id)");assert.equal(r('developmentUI.juniorDetail'),true);assert.match(r('juniorsView()'),/junior-controls/);
r("juniorSet(j.id,'load','light');developmentClosePlayer(true)");assert.equal(r('j.trainingLoad'),'light');assert.doesNotMatch(r('juniorsView()'),/junior-profile/);
r("developmentSet('juniorQuery','no-such-player')");assert.match(r('juniorsView()'),/Inga spelare matchar/);
r("developmentReset(true);developmentReset();deskNavigate('world')");
assert.equal(r('deskArea().id'),'world');assert.match(app.get('#content').innerHTML,/<h1>Världen<\/h1>/);
const worldBefore=r('JSON.stringify(state)');r('worldWorkspaceView()');assert.equal(r('JSON.stringify(state)'),worldBefore);
assert.match(r('worldWorkspaceView()'),/JVM|NHL/);
assert.doesNotMatch(r('matchesCalendarView()'),/landslagsbevakning|nhl-calendar|Följ draftåret/);
for(const page of ['international','nhl']){r(`deskNavigate('${page}')`);assert.equal(r('deskArea().id'),'world');}
r("worldOpenLeague('AHL')");assert.equal(r('nasUI.league'),'AHL');assert.equal(r('nhlUI.tab'),'leagues');assert.equal(r('state.page'),'nhl');
r("deskNavigate('world');save()");const reload=boot(app.storage.value);assert.equal(reload.run('state.page'),'world');reload.run('resumeCareer();deskNavigate("world")');assert.match(reload.get('#content').innerHTML,/<h1>Världen<\/h1>/);
assert.equal(reload.run(`managerRoster().find(p=>String(p.id)===${JSON.stringify(String(r('p.id')))}).trainingLoad`),'rest');
console.log('PASS: complete unique roster, every column sorts both ways, actual growth and decline, explicit details, real plan changes, return context, international routes and save/reload.');
