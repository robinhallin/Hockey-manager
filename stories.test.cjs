const fs=require('node:fs'),assert=require('node:assert/strict');
const boot=new Function('require',fs.readFileSync('interface.test.cjs','utf8').split('const app=boot(),')[0]+'\nreturn boot;')(require);
function game(club='HV71'){
 const app=boot();app.run(`startCareerWithClub(${JSON.stringify(club)});ensureLines();state.stories.active=[];state.stories.started=[];state.stories.lastStart=-10;globalThis.storySeq=0;globalThis.testPlayer=managerRoster().find(p=>p.pos!=="MV");globalThis.sample=(seconds=600,extra={})=>({id:"test-"+(++storySeq),year:state.season.year,club:managerClub(),opponent:opponent(),date:state.calendar.date,finished:true,own:2,against:1,players:[{id:testPlayer.id,seconds,goals:1,assists:0}],units:[],...extra});`);return app;
}
const app=game(),{run,get}=app;
run('globalThis.s=storiesCreate("talent",[testPlayer.id],"En chans","En verklig möjlighet");storiesOpen(s.id)');
assert.match(get('#content').innerHTML,/Nästa kapitel|Vad vill du säga/);assert.equal(run('deskArea().id'),'overview');
run('globalThis.trust=testPlayer.social.trust;storiesChoose(s.id,"trust");globalThis.choice=JSON.stringify(s);storiesChoose(s.id,"ease")');assert.equal(run('JSON.stringify(s)'),run('choice'));
run('for(let i=0;i<4;i++)storiesAfterMatch(sample(i<3?600:0))');
assert.equal(run('s.stage'),2);assert.equal(run('s.status'),'decision');assert.equal(run('testPlayer.social.trust'),run('trust')+3);assert.equal(run('s.firstHonoured'),true);
run('storiesChoose(s.id,"trust");for(let i=0;i<3;i++)storiesAfterMatch(sample(0))');assert.equal(run('s.status'),'closed');assert.equal(run('testPlayer.social.trust'),run('trust')-1);assert.equal(run('state.stories.archive[0].outcome'),'Ett löfte att minnas');
run('globalThis.after=JSON.stringify([state.stories,testPlayer.social]);storiesAfterMatch({...sample(),id:"test-7"})');assert.equal(run('JSON.stringify([state.stories,testPlayer.social])'),run('after'));
run('save()');const reload=boot(app.storage.value);assert.equal(reload.run('JSON.stringify(state.stories)'),run('JSON.stringify(state.stories)'));assert.equal(reload.run('managerRoster().find(p=>p.id==='+JSON.stringify(run('testPlayer.id'))+').social.trust'),run('testPlayer.social.trust'));
assert.match(run('storiesPlayerPanel(testPlayer)'),/Ett löfte att minnas/);assert.equal(run('state.stories.archive[0].chapters[0].title'),'Det börjar här');
// Medical absence and partial saves never count as a broken promise; ten attempts close neutrally.
const medical=game();medical.run('globalThis.s=storiesCreate("veteran",[testPlayer.id],"Rollen","Utgående avtal");storiesChoose(s.id,"lead");testPlayer.health.injury={remaining:10,initial:10,readiness:40};globalThis.trust=testPlayer.social.trust;for(let i=0;i<10;i++)storiesAfterMatch(sample(0))');
assert.equal(medical.run('s.status'),'closed');assert.equal(medical.run('testPlayer.social.trust'),medical.run('trust'));assert.equal(medical.run('s.outcome'),'Omständigheterna ändrades');
const partial=game();partial.run('globalThis.s=storiesCreate("talent",[testPlayer.id],"Chansen","Matchdata");storiesChoose(s.id,"trust");storiesAfterMatch(sample(0,{partial:true}))');assert.equal(partial.run('s.expectation.eligible'),0);
// Genuine lineup membership and shared ice time, not individual minutes, fulfill a line promise.
const line=game();line.run('globalThis.ids=state.lines.forwards.slice(0,3);globalThis.s=storiesCreate("line",ids,"En kedja","Två målmatcher",{nickname:""});storiesChoose(s.id,"together");for(let i=0;i<4;i++)storiesAfterMatch(sample(900,{units:[{kind:"forward",ids,seconds:i<3?500:0,goalsFor:1,goalsAgainst:0}]}))');assert.equal(line.run('s.firstHonoured'),true);
line.run('storiesNickname(s.id,\'<img src=x onerror=bad()>\');storiesOpen(s.id)');assert.doesNotMatch(line.get('#content').innerHTML,/<img src=x/);assert.match(line.get('#content').innerHTML,/&lt;img/);
// Rival pressure is an actual additional morale consequence only at the opponent's return.
for(const [choice,won,expected] of [['revenge',true,3],['revenge',false,-3],['calm',true,1],['calm',false,0]]){
 const rival=game();rival.run(`globalThis.s=storiesCreate('rival',[],'Returen','En uddamålsförlust',{opponent:'AIK'});storiesChoose(s.id,'${choice}');state.morale=60;storiesAfterMatch(sample(600,{opponent:'Brynäs IF'}))`);assert.equal(rival.run('state.morale'),60);
 rival.run(`storiesAfterMatch(sample(600,{opponent:'AIK',own:${won?3:1},against:${won?1:3}}))`);assert.equal(rival.run('state.morale'),60+expected);assert.equal(rival.run('s.status'),'closed');assert.ok(rival.run('state.stories.memory.rivals[managerClub()+"|AIK"]'));
}
// No actions during a live match, no late/repeated choices, no rewards for decline or expiry.
const guard=game();guard.run('globalThis.s=storiesCreate("talent",[testPlayer.id],"Chansen","Beslut");createMatch();storiesChoose(s.id,"trust")');assert.equal(guard.run('s.status'),'decision');
guard.run('state.live=null;storiesChoose(s.id,"invalid")');assert.equal(guard.run('s.status'),'decision');
guard.run('globalThis.trust=testPlayer.social.trust;for(let i=0;i<3;i++)storiesAfterMatch(sample())');assert.equal(guard.run('s.status'),'closed');assert.equal(guard.run('testPlayer.social.trust'),guard.run('trust'));
// Detection uses actual young participants, close losses with another fixture, injuries and repeated combinations.
const detected=game();detected.run('testPlayer.age=19;storiesAfterMatch(sample());');assert.equal(detected.run('state.stories.active[0].type'),'talent');
const injured=game();injured.run('testPlayer.age=19;globalThis.senior=managerRoster().find(p=>p.id!==testPlayer.id&&storiesGroup(p)===storiesGroup(testPlayer));senior.age=30;senior.health.injury={remaining:5};storiesAfterMatch(sample(0,{players:[]}))');assert.equal(injured.run('state.stories.active[0].type'),'talent');assert.ok(injured.run('state.stories.active[0].seniorId'));
const close=game();close.run('for(const p of managerRoster())p.age=28;storiesAfterMatch(sample(600,{opponent:opponent(),own:1,against:2,players:[]}))');assert.equal(close.run('state.stories.active[0].type'),'rival');
const combo=game();combo.run('for(const p of managerRoster())p.age=28;globalThis.ids=state.lines.forwards.slice(0,3);for(let i=0;i<2;i++)storiesAfterMatch(sample(0,{players:[],units:[{kind:"forward",ids,seconds:600,goalsFor:1,goalsAgainst:0}]}))');assert.equal(combo.run('state.stories.active[0].type'),'line');
// Transfers, club moves and year/review boundaries preserve history without punishing an unavailable roster.
const transfer=game();transfer.run('globalThis.s=storiesCreate("talent",[testPlayer.id],"Chansen","Beslut");storiesChoose(s.id,"trust");state.clubRosters[managerClub()]=managerRoster().filter(p=>p.id!==testPlayer.id);ensureStories()');assert.equal(transfer.run('s.status'),'closed');assert.equal(transfer.run('s.outcome'),'Truppen förändrades');
const years=game();years.run('globalThis.s=storiesCreate("talent",[testPlayer.id],"Chansen","Beslut");storiesChoose(s.id,"trust");globalThis.trust=testPlayer.social.trust;state.season.phase="review";ensureStories()');assert.equal(years.run('s.status'),'closed');assert.equal(years.run('testPlayer.social.trust'),years.run('trust'));
years.run('state.season.year++;state.season.phase="preseason";ensureStories()');assert.equal(years.run('state.stories.archive.length'),1);assert.equal(years.run('state.stories.archive[0].year'),years.run('state.season.year')-1);
const move=game();move.run('globalThis.s=storiesCreate("talent",[testPlayer.id],"Chansen","Beslut");storiesChoose(s.id,"trust");state.managerClub="AIK";ensureStories()');assert.equal(move.run('s.outcome'),'Ett nytt uppdrag');assert.equal(move.run('state.stories.archive[0].club'),'HV71');
// Imported saves remain compatible and do not retroactively process archived matches.
const legacy=game();legacy.run('state.analysis.matches=[sample()];delete state.stories;ensureStories();globalThis.count=state.stories.matchCount;storiesAfterMatch(state.analysis.matches[0])');assert.equal(legacy.run('state.stories.matchCount'),legacy.run('count'));
const friendly=game();friendly.run('globalThis.before=JSON.stringify(state.stories);storiesAfterMatch(sample(900,{friendly:true}))');assert.equal(friendly.run('JSON.stringify(state.stories)'),friendly.run('before'));
// Three concurrent stories maximum; reading pages never advances their time or match randomness.
const cap=game();cap.run('for(let i=0;i<4;i++)storiesCreate(Object.keys(STORY_TYPES)[i],[managerRoster()[i].id],"Historia "+i,"Underlag");globalThis.before=JSON.stringify([state.stories,state.lines,state.calendar]);storiesView();storiesDeskView();render()');assert.equal(cap.run('state.stories.active.length'),3);assert.equal(cap.run('JSON.stringify([state.stories,state.lines,state.calendar])'),cap.run('before'));
// Every Swedish club can enter, follow and display a story using its own player IDs.
const all=game();for(const club of all.run('Object.keys(CLUB_DATA)')){all.run(`startCareerWithClub(${JSON.stringify(club)});deskNavigate('stories')`);assert.equal(all.run('managerClub()'),club);assert.doesNotMatch(all.get('#content').innerHTML,/undefined|NaN/);}
// A full live match reaches the story hook exactly once through the real season pipeline.
const full=game('Rögle BK');full.run('globalThis.s=storiesCreate("talent",[testPlayer.id],"Chansen","Beslut");storiesChoose(s.id,"ease");createMatch();globalThis.steps=0;while(!state.live.finished&&steps++<1600){if(!state.live.running)startMatch();liveStep();}globalThis.count=state.stories.matchCount;finishAnalysis();');assert.equal(full.run('state.live.finished'),true);assert.equal(full.run('state.stories.matchCount'),1);assert.equal(full.run('state.stories.matchCount'),full.run('count'));assert.equal(full.run('state.stories.seen.includes(state.live.analysis.id)'),true);
console.log('PASS: four fact-driven story types, choices and real ice time, lasting trust/morale, stages and deadlines, medical/partial-data exemptions, duplicate/friendly isolation, save migration, 28 clubs, transfer/year/club boundaries, escaped names and complete 2D match.');
