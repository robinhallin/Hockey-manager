const test=require('node:test');
const assert=require('node:assert/strict');
const {boot}=require('./scripts/career-test-fixture.cjs');
function decode(s){return s.replaceAll('&quot;','"').replaceAll('&#39;',"'").replaceAll('&#039;',"'").replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&amp;','&');}
function clickName(app,id){
 const anchor=[...app.get('#content').innerHTML.matchAll(/<a\b[^>]*>/g)].map(x=>x[0]).find(tag=>tag.includes('data-player-id="'+id+'"'));
 assert.ok(anchor,'The rendered view must contain the exact player reference');
 app.run(decode(anchor.match(/onclick="([^"]*)"/)[1]).replace('return false;',''));
}
test('rendered lineup names open profiles without selecting players, including PP/BP',()=>{
 const app=boot(),{run,get}=app;
 run('startCareerWithClub("HV71");deskNavigate("lines");lineupPickSlot("forwards",1);globalThis.id=state.lines.forwards[1];globalThis.linesBefore=JSON.stringify(state.lines);');
 assert.doesNotMatch(run('lineupRinkView()'),/<button\b[^>]*>(?:(?!<\/button>)[\s\S])*<a\b/);
 clickName(app,run('id'));
 assert.equal(run('state.selectedPlayer'),run('id'));
 assert.equal(run('state.page'),'player');
 assert.equal(run('JSON.stringify(state.lines)'),run('linesBefore'));
 run('deskBack();');
 assert.equal(run('lineupUI.slot.index'),1);
 assert.equal(run('state.page'),'lines');
 run('globalThis.replacement=managerRoster().find(p=>p.pos==="C"&&p.id!==id);lineupPlace(replacement.id);');
 assert.equal(run('state.lines.forwards[1]'),run('replacement.id'));
 run('lineupWorkspace="special";render();globalThis.specialBefore=JSON.stringify(state.specialTeams);globalThis.specialId=state.specialTeams.pp1[0];');
 assert.doesNotMatch(get('#content').innerHTML,/<button\b[^>]*>(?:(?!<\/button>)[\s\S])*<a\b/);
 clickName(app,run('specialId'));
 run('deskBack();');
 assert.equal(run('lineupWorkspace'),'special');
 assert.equal(run('JSON.stringify(state.specialTeams)'),run('specialBefore'));
});

test('junior and dressing-room references retain IDs, plain legacy fields and saves',()=>{
 const app=boot(),{run,get}=app;
 run('startCareerWithClub("HV71");globalThis.a=managerRoster()[0];globalThis.b=managerRoster()[1];b.name=a.name;socialLog(playerHeadline(a," följs upp"),[playerMention(b)," deltar också."]);deskNavigate("locker");lockerUI.tab="history";render();');
 assert.ok(get('#content').innerHTML.includes('data-player-id="'+run('a.id')+'"'));
 assert.ok(get('#content').innerHTML.includes('data-player-id="'+run('b.id')+'"'));
 assert.equal(run('typeof state.locker.log[0].title'),'string');
 clickName(app,run('b.id'));
 assert.equal(run('state.selectedPlayer'),run('b.id'));
 run('deskBack();globalThis.j=state.juniors.roster[0];juniorReport(playerHeadline(j," får uppföljning"),[playerMention(j)," har tränat."]);deskNavigate("juniors");developmentUI.juniorTab="history";render();');
 clickName(app,run('j.id'));
 assert.equal(run('state.selectedPlayer'),run('j.id'));
 assert.match(get('#content').innerHTML,/Utvecklingsplan/);
 run('deskBack();');
 assert.equal(run('developmentUI.juniorTab'),'history');
 run('juniorReport("Äldre rapport", "Namn utan identifierare");save();');
 const loaded=boot(app.storage.value);
 assert.equal(loaded.run('state.juniors.reports[1].titleParts[0].playerId'),run('j.id'));
 assert.equal(loaded.run('state.locker.log[0].bodyParts[0].playerId'),run('b.id'));
 run('state.juniors.matches.unshift({players:[{id:"old-junior",name:"Historisk junior",seconds:600}]});');
 assert.equal(run('playerIdentity("old-junior").player.name'),'Historisk junior');
 assert.equal(run('playerIdentity("old-junior").active'),false);
 assert.equal(run('playerIdentity("old-junior").club'),null);
 assert.match(run('historicalPlayerView("old-junior")'),/Registrerade juniormatcher/);
 assert.match(run('historicalPlayerView("old-junior")'),/Representerad klubb ej registrerad/);
 assert.match(run('historicalPlayerView("old-junior")'),/10 min/);
 run('assistantReportingEnsure();ensureJuniorCalendar();juniorCalendarPlayRound(leagueOf(),4,juniorCalendarDates()[3].date);assistantMonthlyReport("2026-10-01");');
 assert.equal(run('state.juniors.matches[0].club'),run('managerClub()'));
 assert.ok(run('state.juniors.reports[0].bodyParts.some(p=>p?.playerId!=null)'));
 assert.equal(run('typeof state.juniors.reports[0].body'),'string');
});
