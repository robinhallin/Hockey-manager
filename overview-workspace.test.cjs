'use strict';
const assert=require('node:assert/strict');
const {boot}=require('./scripts/career-test-fixture.cjs');
const app=boot(undefined,{production:true}),r=app.run;
r("startCareerWithClub('HV71');deskNavigate('home')");
let before=r('JSON.stringify(state)');
const initial=r('overviewWorkspaceView()');
assert.match(initial,/Välj säsongens riktning/);
assert.equal((initial.match(/class="ov-matchup"/g)||[]).length,1);
assert.equal((initial.match(/class="ov-day /g)||[]).length,7);
assert.doesNotMatch(initial,/modern-overview-grid|office-desk-grid|stories-page|press-page/);
assert.equal(r('JSON.stringify(state)'),before,'overview reads do not mutate a career');
assert.equal(r('overviewFixture().arena'),'Husqvarna Garden');
// The venue is based on the fixture, including away friendlies, never hardcoded to HV71.
r('state.calendar.friendlies[0].home=false');
assert.equal(r('overviewFixture().away'),'HV71');assert.equal(r('overviewFixture().home'),r('state.calendar.friendlies[0].opponent'));
r('state.calendar.friendlies[0].home=true');
// Urgent dated offers are sorted and can all be reached; waiting offers are not decisions.
r(`for(let i=0;i<7;i++)state.recruitment.incoming.push({id:990+i,name:'Bud '+i,buyer:'AIK',kind:'loan',stage:'offer',status:'pending',fee:0,expiresDate:calAdd(state.calendar.date,7-i)});
state.recruitment.incoming.push({id:997,name:'Väntande bud',buyer:'AIK',stage:'counter_wait',status:'pending',expiresDate:calAdd(state.calendar.date,8),dueDate:calAdd(state.calendar.date,2)});`);
assert.equal(r("overviewDecisionItems().some(i=>i.action?.deal==='incoming:997')"),false);
assert.equal(r("overviewDecisionItems().filter(i=>i.action?.deal)[0].action.deal"),'incoming:996');
assert.equal(r("overviewDecisionItems().filter(i=>i.action?.deal).length"),7);
assert.match(r('overviewWorkspaceView()'),/Visa alla/);
r('overviewExpandDecisions()');
assert.equal((r('overviewWorkspaceView()').match(/officeOpenDeal\(&quot;incoming:/g)||[]).length,8,'all seven actionable offers plus the waiting link');
r("officeOpenDeal('incoming:996')");assert.equal(r('recruitHub.deal'),'incoming:996');assert.equal(r('recruitHub.affairs'),'open');
r("deskNavigate('home');state.recruitment.incoming=[];globalThis.p=managerRoster().find(p=>p.pos!=='MV');p.fatigue=61;overviewSelectPlayer(p.id)");
assert.equal(r('overviewWatchPlayers()[0].p.id'),r('p.id'));
assert.match(r('overviewPlayerDetail(overviewWatchPlayers())'),/Hög belastning/);
before=r('JSON.stringify(state)');r('overviewWorkspaceView()');assert.equal(r('JSON.stringify(state)'),before);
r('deskOpenPlayer(p.id);deskBack()');assert.equal(r('state.page'),'home');assert.equal(r('overviewUI.player'),r('p.id'));
r("developmentUI.filter='loan';developmentUI.query='ingen';developmentUI.detail=true;overviewOpenDevelopment()");
assert.equal(r('developmentUI.filter'),'all');assert.equal(r('developmentUI.query'),'');assert.equal(r('developmentUI.detail'),false);
// Calendar shortcuts must reset a previous fixture-list subview and select the exact date.
r("matchesUI.calendar='fixtures';officeOpenDay(calAdd(state.calendar.date,4))");assert.equal(r('matchesUI.calendar'),'calendar');assert.equal(r('calendarUI.date'),r('calAdd(state.calendar.date,4)'));
r('save()');const reloaded=boot(app.storage.value,{production:true}).run;
assert.equal(reloaded('state.calendar.date'),r('state.calendar.date'));assert.equal(reloaded(`managerRoster().find(x=>x.id===${JSON.stringify(r('p.id'))})?.fatigue`),r('managerRoster().find(x=>x.id===overviewUI.player)?.fatigue'));
// An active away match displays the away score in the right column; viewing cannot resume it.
const live=boot(),q=live.run;
q("startCareerWithClub('HV71');state.calendar.date=calendarTarget();startMatch();pauseMatch();state.live.hv=2;state.live.opp=4;state.live.venue={home:state.live.opponent,away:'HV71',ownHome:false,arena:'Bortaarena'};deskNavigate('home')");
const liveBefore=q('JSON.stringify(state.live)');const html=q('overviewWorkspaceView()');
assert.match(html,/4 – 2/);assert.match(html,/Matchen är pausad/);assert.match(html,/Till matchen/);
assert.equal(q("overviewDecisionItems().some(i=>i.area==='match')"),false);
assert.equal(q('JSON.stringify(state.live)'),liveBefore);
// Senior development detail must resolve from the senior roster rather than the combined senior+junior overview.
r("globalThis.seniorDev=managerRoster().find(p=>p.pos!=='MV');developmentOpenPlayer(seniorDev.id,'training',true)");
assert.equal(r('developmentUI.detail'),true);assert.equal(r('developmentUI.player'),r('seniorDev.id'));assert.match(r('developmentWorkspaceView()'),/individual-training/);
r("developmentClosePlayer(false);deskNavigate('home')");
// Overview must remain renderable with media enabled and development actions must quote real string IDs.
assert.doesNotThrow(()=>r('overviewWorkspaceView()'));
r("globalThis.devAction=developmentInspector(developmentRows(false).find(x=>x.environment==='A-lag')?.p||managerRoster()[0],false,false)");
assert.match(r('devAction'),/developmentOpenPlayer\(&quot;|developmentOpenPlayer\('/);
// The development inspector preserves the selected player through the real detail route.
r("globalThis.devP=managerRoster()[0];globalThis.devHtml=developmentInspector(devP,false,false);developmentOpenPlayer(devP.id,'training',true)");
assert.equal(r("developmentUI.player"),r("devP.id"));assert.equal(r("developmentUI.detail"),true);assert.match(r("developmentWorkspaceView()"),/individual-training/);r("developmentClosePlayer(false);deskNavigate('home')");
console.log('PASS: compact read-only overview, seven calendar days, away venues and live scores, sorted offers and waiting stages, all decisions accessible, player selection/back, exact development/calendar destinations and reload.');
