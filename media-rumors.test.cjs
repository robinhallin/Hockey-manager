const test=require('node:test'),assert=require('node:assert/strict');
const {boot}=require('./scripts/career-test-fixture.cjs');
function game(){const a=boot(undefined,{production:true});a.run(`startCareerWithClub('HV71');for(const p of managerRoster())delete p.marketCompetition;globalThis.p=managerRoster()[0];p.marketCompetition={clubs:['AIK','Brynäs IF']};globalThis.key=mediaSituation().key;`);return a;}
for(const choice of ['notForSale','open','private'])test(`${choice}: answered rumor stays closed after rounds and reload`,()=>{
 const a=game(),r=a.run;
 assert.match(r('mediaPromptView()'),/Rykten kring/);
 r(`p.social.trust=60;mediaAnswer(key,'${choice}');globalThis.after=JSON.stringify([p.social,p.marketPreference,state.media]);mediaAnswer(key,'${choice}')`);
 assert.equal(r('JSON.stringify([p.social,p.marketPreference,state.media])'),r('after'));
 assert.equal(r('p.social.trust'),choice==='notForSale'?61:60);
 if(choice!=='private')assert.equal(r('marketAvailability(p)'),choice==='notForSale'?'keep':'open');
 assert.equal(r('mediaPromptView()'),'');
 r('state.round++;render();state.round++;render();save()');
 assert.equal(r('mediaPromptView()'),'');assert.doesNotMatch(a.get('#content').innerHTML,/Rykten kring/);
 const b=boot(a.storage.value,{production:true});assert.equal(b.run('mediaPromptView()'),'');
 b.run('state.round++;render()');assert.equal(b.run('mediaPromptView()'),'');
});
test('old round-based answers migrate once without applying effects again',()=>{
 const a=game(),r=a.run;r(`state.media={answered:['market:'+p.id+':1','market:'+p.id+':2','form:1']};globalThis.trust=p.social.trust;save({normalize:false})`);
 const b=boot(a.storage.value,{production:true});
 assert.equal(b.run('mediaPromptView()'),'');assert.equal(b.run('state.media.answered.length'),2);
 assert.equal(b.run('managerRoster()[0].social.trust'),r('trust'));
 b.run('state.round+=3;save()');const c=boot(b.storage.value,{production:true});assert.equal(c.run('mediaPromptView()'),'');
 c.run('state.season.year++;ensureStories()');assert.match(c.run('mediaPromptView()'),/Rykten kring/);
});
test('answering one player does not hide another player and new seasons/clubs have separate answers',()=>{
 const a=game(),r=a.run;r(`globalThis.q=managerRoster()[1];q.marketCompetition={clubs:['AIK','Brynäs IF']};mediaAnswer(key,'private')`);
 assert.equal(r('mediaSituation().player.id'),r('q.id'));
 r(`mediaAnswer(mediaSituation().key,'private')`);assert.equal(r('mediaPromptView()'),'');
 const key=r('mediaMarketKey(p.id)');r('state.managerClub="AIK"');assert.notEqual(r('mediaMarketKey(p.id)'),key);
 r('state.managerClub="HV71";state.season.year++;ensureStories()');assert.match(r('mediaPromptView()'),/Rykten kring/);
});
test('invalid/stale answers and repeated rendering do not consume or change a rumor',()=>{
 const a=game(),r=a.run;r(`mediaAnswer(key,'invalid');mediaAnswer('stale','private');globalThis.before=JSON.stringify(state);mediaPromptView();mediaPromptView()`);
 assert.equal(r('JSON.stringify(state)'),r('before'));assert.equal(r('state.media.answered.length'),0);assert.match(r('mediaPromptView()'),/Rykten kring/);
});
