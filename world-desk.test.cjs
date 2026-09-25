'use strict';
const assert=require('node:assert/strict');
const {boot}=require('./scripts/career-test-fixture.cjs');
const a=boot(undefined,{production:true}),r=a.run;
r("startCareerWithClub('HV71');deskNavigate('world');globalThis.before=JSON.stringify(state)");
for(const page of ['world','international','nhl'])for(const tab of page==='international'?['club','nation','tournament','history']:page==='nhl'?['club','board','results','rights','contracts','leagues']:['overview']){
 r(`state.page='${page}';${page==='international'?`worldUI.international='${tab}'`:page==='nhl'?`nhlUI.tab='${tab}'`:''}`);
 const html=r(page==='international'?'internationalView()':page==='nhl'?'nhlView()':'worldWorkspaceView()');assert.doesNotMatch(html,/undefined|NaN/);
}
r("state.page='world'");assert.equal(r('JSON.stringify(state)'),r('before'),'viewing all world screens leaves career data unchanged');
assert.equal(r('worldDeskMilestones().every(m=>m.date>=state.calendar.date)'),true);
r("nhlUI.tab='board';nhlUI.query='no such hockey player';worldUI.position='MV'");assert.equal(r('worldDeskDraftRows().length'),0);
r("nhlUI.query='';worldUI.position='all';worldUI.draftPage=2;nasUI.league='AHL';nasUI.club=nasClubs('AHL')[2];naUI.tab='network';state.international.selected='FIN';globalThis.snapshot=deskSnapshot();worldUI.draftPage=0;nasUI.league='NHL';naUI.tab='offers';state.international.selected='SWE';deskRestore(snapshot)");
assert.equal(r('worldUI.draftPage'),2);assert.equal(r('nasUI.league'),'AHL');assert.equal(r('naUI.tab'),'network');assert.equal(r('state.international.selected'),'FIN');
r("state.calendar.date='2026-12-15';internationalPrepare();state.calendar.date='2026-12-20';internationalPrepare();for(let date='2026-12-20';date<='2027-01-06';date=calAdd(date,1)){state.calendar.date=date;internationalPrepare();internationalProcess(date)};state.page='international';worldUI.international='tournament';globalThis.game=state.international.tournament.games.find(g=>g.played&&!g.administrative);globalThis.before=JSON.stringify(state);worldDeskOpen('internationalGame',game.id)");
assert.match(r('worldDeskDialog()'),/Skott på mål/);assert.match(r('worldDeskDialog()'),/data-player-id/);r('worldDeskClose()');assert.equal(r('JSON.stringify(state)'),r('before'),'reports and close are read-only');
r("state.page='nhl';nhlUI.tab='club';globalThis.p=state.juniors.roster.find(p=>p.pos==='B');p.nhlDraft={year:2027,club:'Seattle Kraken',round:2,overall:40,expires:'2031-06-30'};globalThis.morale=p.morale;worldDeskOpen('plan',p.id);worldUI.plan='junior'");
assert.equal(r('p.nhlPlan'),undefined);assert.match(r('worldDeskDialog()'),/Bekräfta beslutet/);r('worldDeskClose()');assert.equal(r('p.nhlPlan'),undefined);
r("worldDeskOpen('plan',p.id);worldUI.plan='junior';worldDeskConfirm()");assert.equal(r('p.nhlPlan.path'),'junior');assert.equal(r('p.nhlPlan.status'),'active');assert.equal(r('p.morale'),r('morale'),'promise itself gives no reward');
r("worldDeskOpen('plan',p.id)");assert.doesNotMatch(r('worldDeskDialog()'),/Bekräfta beslutet/);r("worldDeskClose();save()");const b=boot(a.storage.value,{production:true});assert.equal(b.run('state.juniors.roster.find(p=>p.pos==="B").nhlPlan.path'),'junior');
r("state.page='international';worldUI.international='club';internationalView();worldUI.international='nation';internationalView();worldUI.international='history';internationalView()");
console.log('PASS: read-only world views, truthful calendar, restored filters, actual JVM reports and one-time saved development promises.');
