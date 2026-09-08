const assert=require('node:assert/strict');const {boot}=require('./scripts/career-test-fixture.cjs');const app=boot(),r=app.run;
r("startCareerWithClub('HV71');ensureLines();globalThis.id=managerRoster()[0].id");
// Returning from a secondary workflow preserves the profile tab and editor state.
r("deskNavigate('lines');lineupSelectUnit('line',2);lineupPickSlot('forwards',6);lineupUI.query='test';selectPlayer(id);profileWorkspace.tab='contract';loanOpen(id);deskBack()");
assert.equal(r('state.page'),'player');assert.equal(r('profileWorkspace.tab'),'contract');
r('deskBack()');assert.equal(r('lineupUI.line'),2);assert.equal(r('lineupUI.slot.index'),6);assert.equal(r('lineupUI.query'),'test');
r("lineupWorkspace='analysis';deskNavigate('tactics')");assert.equal(r('state.page'),'lines');assert.equal(r('lineupWorkspace'),'even');
r('deskBack()');assert.equal(r('lineupWorkspace'),'analysis');
r("deskNavigate('specialTeams');deskNavigate('tactics');deskBack()");assert.equal(r('lineupWorkspace'),'special');
r("deskNavigate('transfers','needs');recruitFilters().query='zzz';recruitSelectProfile('Målskytt');deskBack()");assert.equal(r('state.recruitment.tab'),'needs');assert.equal(r('recruitFilters().query'),'zzz');
r("deskNavigate('transfers','reports')");assert.equal(r('state.recruitment.tab'),'missions');
r("resetRecruitFilters()");assert.equal(r('recruitFilters().query'),'');assert.equal(r('recruitFilters().availability'),'all');assert.equal(r('recruitFilters().profile'),'ALL');
r("document.getElementById('recruit-query').value='zzzxxyy';applyRecruitSearch()");assert.equal(r('recruitCandidates().length'),0);assert.match(r("deskActionReason('createScoutMission')"),/Inga nya kandidater/);r('resetRecruitFilters()');
assert.equal(r("deskActionReason('openContractNegotiation',id)"),'');
r("state.calendar.date=calendarTarget();startMatch();pauseMatch()");
assert.match(r("deskActionReason('openContractNegotiation',id)"),/Avsluta/);
assert.equal(r("deskActionReason('answerIncomingOffer',1,false)"),'','rejecting a sale remains possible during a match');
assert.match(r("deskActionReason('answerIncomingOffer',1,true)"),/Avsluta/);
r('openContractNegotiation(id)');assert.match(r('deskActionNotice'),/Avsluta/);
r("globalThis.oldTactic=state.tactic;setTactic('invalid')");assert.equal(r('state.tactic'),r('oldTactic'));
// Every button handler in all primary areas, recruitment tabs, profiles and match tabs exists.
let checked=0;
const audit=()=>{const html=app.get('#content').innerHTML;for(const match of html.matchAll(/<button\b([^>]*?)>([\s\S]*?)<\/button>/g)){checked++;const on=match[1].match(/onclick="([^"]*)"/)?.[1];if(!on)continue;for(const call of on.matchAll(/(?<![\w.])([A-Za-z_$][\w$]*)\(/g)){if(['if','function'].includes(call[1]))continue;assert.equal(r(`typeof ${call[1]}`),'function',`${r('state.page')}: missing ${call[1]}`);}}};
for(const page of JSON.parse(r("JSON.stringify(DESK_AREAS.flatMap(a=>a.pages.map(x=>x[0])).concat(['inbox','settings']))"))) {r(`deskNavigate('${page}')`);audit();}
for(const tab of ['needs','search','missions','shortlist','deals','loans','history','world']){r(`deskNavigate('transfers','${tab}')`);audit();}
for(const tab of ['even','special','squad','analysis']){r(`lineupWorkspace='${tab}';deskNavigate('lines')`);audit();}
for(const [page,key,tabs] of [['training','tab',['players','history']],['juniors','juniorTab',['players','history']],['medical','medicalTab',['cases','history']]]){r(`deskNavigate('${page}')`);for(const tab of tabs){r(`developmentSet('${key}','${tab}')`);audit();}}
r("deskNavigate('statistics')");for(const tab of ['overview','shots','events','units','trends','players']){r(`matchesSet('analysis','${tab}')`);audit();}
r("deskNavigate('calendar');matchesSet('calendar','fixtures')");audit();
r('selectPlayer(id)');for(const tab of ['overview','contract','development','report']){r(`profileWorkspace.tab='${tab}';render()`);audit();}
r("deskNavigate('match')");for(const tab of ['feedback','tactics','changes','lineup','stats','players','events']){r(`matchTab('${tab}')`);audit();}
assert.ok(checked>900);console.log(`PASS: ${checked} rendered buttons audited; route aliases, editor/profile return, filter reset, action reasons and allowed rejection verified.`);
