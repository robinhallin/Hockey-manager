// Match fixtures below explicitly set match day; daily progression is tested in daily-manager.test.cjs.
const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const {boot}=require('./scripts/career-test-fixture.cjs');
const app=boot(),{run,get}=app;
assert.doesNotMatch(get('#content').innerHTML,/desk-subnav/);
run('startCareerWithClub("HV71");deskNavigate("home")');
assert.match(get('#content').innerHTML,/Tränarkontoret/);
assert.match(get('#content').innerHTML,/Nästa match/);
assert.match(get('#content').innerHTML,/Återhämtning/);
assert.equal((get('.manager-nav').innerHTML.match(/class="nav-item/g)||[]).length,7);
assert.equal((get('.manager-nav').innerHTML.match(/aria-current="true"/g)||[]).length,1);
// Every primary and secondary route renders while retaining the actual game data.
run('globalThis.before=JSON.stringify([state.calendar.date,state.round,state.money,state.teams,managerRoster().map(p=>[p.id,p.goals,p.assists,p.contractYears,p.fatigue])]);globalThis.routes=DESK_AREAS.flatMap(a=>a.pages.map(p=>p[0])).concat(["inbox","news","settings"])');
for(const page of run('routes')){
  run(`deskNavigate(${JSON.stringify(page)})`);
  assert.ok(get('#content').innerHTML.length>100,page);
  assert.doesNotMatch(get('#content').innerHTML,/undefined|NaN/,page);
}
assert.equal(run('JSON.stringify([state.calendar.date,state.round,state.money,state.teams,managerRoster().map(p=>[p.id,p.goals,p.assists,p.contractYears,p.fatigue])])'),run('before'));
run('selectPlayer(managerRoster()[0].id)');assert.equal(run('deskArea().id'),'team');assert.match(get('#content').innerHTML,/aria-current="page"[^>]*>Trupp/);
run('coachingNavigate("specialTeams")');assert.equal(run('deskArea().id'),'team');
run('state.recruitment.filters.query="test";deskNavigate("transfers","shortlist")');assert.equal(run('state.recruitment.filters.query'),'test');
assert.equal((get('#content').innerHTML.match(/class="desk-subnav"/g)||[]).length,1);assert.doesNotMatch(get('#content').innerHTML,/class="recruit-tabs"/);
for(const tab of run('DESK_RECRUIT_MORE.map(t=>t[0])')){run(`deskNavigate('transfers','${tab}')`);assert.match(get('#content').innerHTML,/aria-current="page"[^>]*>(Affärer|Spelare)/);assert.doesNotMatch(get('#content').innerHTML,/undefined|NaN/);}
run('deskNavigate("scouting")');assert.match(get('#content').innerHTML,/aria-current="page"[^>]*>Scouting/);
run('recruitOpen(state.clubRosters["AIK"][0].id)');assert.equal(run('deskArea().id'),'recruitment');
// Decision and expiring-offer priorities are actionable; no fabricated clean bill of health.
run('managerMessage("desk-test", "Ett samtal", "Vi behöver prata", "Spelare", {decisionType:"role"});state.recruitment.incoming.push({id:999,status:"pending",expires:state.recruitment.tick+2});deskNavigate("home")');
assert.equal(run('deskTasks()[0].title'),'Ett samtal');assert.ok(run('deskTasks().some(t=>t.action.tab==="deals")'));
run('state.recruitment.incoming[0].expires=-1');assert.equal(run('deskTasks().some(t=>t.action.tab==="deals")'),false);
run('state.training.messages.find(m=>m.key==="desk-test").resolved=true;state.recruitment.incoming=[];calendarInitialPreseason();deskNavigate("home")');
assert.match(get('#content').innerHTML,/Forma laget inför premiären/);assert.equal(run('deskFixtures().upcoming.length'),0);
run('calendarBookFriendly("AIK",calAdd(state.calendar.date,3));deskNavigate("home")');assert.match(get('#content').innerHTML,/Nästa träningsmatch/);assert.equal(run('deskFixtures().upcoming[0].opponent'),'AIK');
run('state.season.phase="review";state.season.boardResult=[];deskNavigate("home")');assert.match(get('#content').innerHTML,/Dags att summera säsongen/);assert.equal(run('deskFixtures().upcoming.length'),0);
// Navigation and mobile menu pause a match without changing its clock, score or date.
run('startCareerWithClub("HV71");(!state.live&&(state.calendar.date=calendarTarget()),startMatch());state.live.hv=2;state.live.minute=12;globalThis.matchDate=state.calendar.date;deskNavigate("lines")');
assert.equal(run('state.live.running'),false);assert.equal(run('state.live.hv'),2);assert.equal(run('state.live.minute'),12);assert.equal(run('state.calendar.date'),run('matchDate'));
run('deskNavigate("home")');assert.match(get('#content').innerHTML,/Matchen är pausad/);assert.match(get('#content').innerHTML,/2 – 0/);
run('state.live.running=true;toggleManagerMenu()');assert.equal(run('state.live.running'),false);assert.equal(get('#mobileMenu').attrs['aria-expanded'],'true');assert.equal(get('.game-area').inert,true);
app.events.keydown({key:'Escape',preventDefault(){}});assert.equal(get('.game-area').inert,false);assert.equal(get('#mobileMenu').attrs['aria-expanded'],'false');
run('toggleManagerMenu();deskNavigate("squad")');assert.equal(get('.game-area').inert,false);assert.equal(get('.game-shell').classList.contains('mobile-nav-open'),false);
assert.ok(get('#content').innerHTML.indexOf('class="squad-row"')<get('#content').innerHTML.indexOf('data-desk-fold="contracts"'));
run('deskFolds.iceTime=true;deskNavigate("match");render()');assert.match(get('#content').innerHTML,/data-desk-fold="iceTime" open/);
run('save()');const reload=boot(app.storage.value);assert.equal(reload.run('state.live.minute'),12);assert.equal(reload.run('state.live.hv'),2);assert.equal(reload.run('state.live.running'),false);assert.equal(reload.run('state.calendar.date'),run('matchDate'));
// The dashboard works with every Swedish club, and keeps club identity and fixtures separate.
const clubs=run('Object.keys(state.world.membership)');assert.equal(clubs.length,28);
for(const club of clubs){run(`startCareerWithClub(${JSON.stringify(club)});deskNavigate('home')`);assert.doesNotMatch(get('#content').innerHTML,/undefined|NaN/);assert.equal(run('deskFixtures().upcoming.every(g=>g.opponent!==managerClub())'),true);assert.ok(get('#content').innerHTML.includes(club));}
run('state.managerCareer.status="unemployed";deskNavigate("home")');assert.equal(run('state.page'),'manager');assert.doesNotMatch(get('#content').innerHTML,/Tränarkontoret/);
console.log('PASS: 7 primary areas, all routes and recruitment sections, dashboard for 28 clubs, actionable priorities, preseason/review/paused-match states, navigation isolation, mobile menu and saved match continuity.');
