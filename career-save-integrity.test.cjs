'use strict';
const assert=require('node:assert/strict');
const {test}=require('node:test');
const {boot}=require('./scripts/career-test-fixture.cjs');

test('unreadable and newer saves survive startup, navigation and autosave',()=>{
 for(const raw of ['', '{broken',JSON.stringify({version:'0.2'}),JSON.stringify({version:'99',managerClub:'HV71'}),JSON.stringify({format:'hockey-manager-lzw16-v3',length:10,data:'broken'})]){
  const a=boot(raw),r=a.run;
  assert.equal(a.storage.value,raw,'startup must not replace the unreadable original');
  r('showSaveFiles();showCareerMenu();save();save({normalize:false})');
  assert.equal(a.storage.value,raw);
  assert.match(a.get('#save-status-root').innerHTML,/Originalet har behållits/);
  assert.match(a.get('#save-status-root').innerHTML,/Ladda ner ursprunglig sparning/);
  r("beginCareerSelection();chooseCareerClub('AIK');careerReview();acceptCareer()");
  assert.equal(r('managerClub()'),'AIK');
  assert.equal(r('careerRead(localStorage.getItem(CAREER_SAVE_KEY)).managerClub'),'AIK');
  assert.equal(r('careerLoadIssue'),null,'explicit new career replaces original');
 }
});

test('previous career swap preserves both stored careers on either write failure',()=>{
 const a=boot(),r=a.run;
 r("startCareerWithClub('AIK');globalThis.other=JSON.stringify(state);startCareerWithClub('HV71');careerStore(PREVIOUS_CAREER_KEY,other);globalThis.store=localStorage.setItem;globalThis.primary=localStorage.getItem(CAREER_SAVE_KEY);globalThis.backup=localStorage.getItem(PREVIOUS_CAREER_KEY)");
 for(const failedKey of ['PREVIOUS_CAREER_KEY','CAREER_SAVE_KEY']){
  r(`localStorage.setItem=(k,v)=>{if(k===${failedKey})throw Error('Injected write failure');store(k,v)};previousCareer()`);
  assert.equal(r('managerClub()'),'HV71');
  assert.equal(a.storage.value,r('primary'));
  assert.equal(r('localStorage.getItem(PREVIOUS_CAREER_KEY)'),r('backup'));
  assert.match(r('careerMessage'),/aktiva karriär behålls/);
 }
 r('localStorage.setItem=store;globalThis.draw=render;render=()=>{if(managerClub()==="AIK")throw Error("Invalid target view");draw()};previousCareer()');
 assert.equal(r('managerClub()'),'HV71');assert.equal(a.storage.value,r('primary'));
 r('render=draw;previousCareer()');
 assert.equal(r('managerClub()'),'AIK');
 assert.equal(boot(a.storage.value).run('managerClub()'),'AIK');
 assert.equal(r('previousCareerName()'),'HV71');
 r('previousCareer()');assert.equal(r('managerClub()'),'HV71');
});

test('import handles blocked reads, failed writes and recovery from an unreadable save',()=>{
 const a=boot(),r=a.run;
 r("startCareerWithClub('AIK');globalThis.imported=JSON.stringify(state);startCareerWithClub('HV71');globalThis.original=localStorage.getItem(CAREER_SAVE_KEY);globalThis.reader=localStorage.getItem;globalThis.writer=localStorage.setItem;saveFilePreview=JSON.parse(imported);localStorage.getItem=()=>{throw Error('Blocked storage')}");
 assert.doesNotThrow(()=>r('applyCareerImport()'));
 assert.equal(r('managerClub()'),'HV71');assert.equal(a.storage.value,r('original'));
 r('localStorage.getItem=reader;saveFilePreview=JSON.parse(imported);localStorage.setItem=(k,v)=>{if(k===CAREER_SAVE_KEY)throw Error("Full store");writer(k,v)};applyCareerImport()');
 assert.equal(r('managerClub()'),'HV71');assert.equal(a.storage.value,r('original'));
 assert.equal(r('localStorage.getItem(PREVIOUS_CAREER_KEY)'),null,'failed import restores absence of a prior backup');
 r('localStorage.setItem=writer;globalThis.draw=render;render=()=>{if(managerClub()==="AIK")throw Error("Invalid imported view");draw()};saveFilePreview=JSON.parse(imported);applyCareerImport()');
 assert.equal(r('managerClub()'),'HV71');assert.equal(a.storage.value,r('original'));
 const recovered=boot('{broken');
 recovered.run(`saveFilePreview=validateSaveText(${JSON.stringify(r('imported'))});applyCareerImport()`);
 assert.equal(recovered.run('managerClub()'),'AIK');
 assert.equal(recovered.run('careerLoadIssue'),null);
 assert.equal(boot(recovered.storage.value).run('managerClub()'),'AIK');
});
