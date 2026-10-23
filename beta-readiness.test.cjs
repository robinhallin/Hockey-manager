'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {boot}=require('./scripts/career-test-fixture.cjs');
test('production contract summary excludes loans and blocks renewals without changing a contract',()=>{
 const r=boot(null,{production:true}).run;r("startCareerWithClub('HV71')");
 const count=r('managerRoster().filter(contractNeedsDecision).length');
 assert.match(r('clubContractPlansView()'),new RegExp(count+' avtal behöver en plan'));
 assert.match(r('clubContractPlansView()'),/Granska låneavtal/);
 const before=r('JSON.stringify(managerRoster())');
 assert.equal(r("clubPlanAct(managerRoster().find(p=>playerLoan(p)).id,'renew',clubDecisionContext())"),false);
 assert.equal(r('JSON.stringify(managerRoster())'),before);
});
test('feedback preserves origin before settings, bounds free text and excludes save contents',()=>{
 const r=boot(null,{production:true}).run;r("startCareerWithClub('HV71');state.page='lines';clubhouseUI.room='tactics';clubhouseRoomsUI.station='board';betaCaptureContext();state.page='settings';betaCaptureContext();betaFeedbackSet('steps','a'.repeat(5000));betaFeedbackSet('actual','<script>unsafe</script>')");
 const report=JSON.parse(r('betaReportText()'));
 assert.equal(report.context.page,'lines');assert.equal(report.context.room,'tactics');assert.equal(report.context.station,'board');
 assert.equal(report.steps.length,4000);assert.equal(report.clubRosters,undefined);
 assert.match(r('betaSupportView()'),/&lt;script&gt;unsafe/);
 assert.match(r('betaSupportView()'),/issues\/new\?template=beta-bug.yml/);
});
test('first-week guide is optional, read-only and does not pretend work has been completed',()=>{
 const r=boot(null,{production:true}).run;r("startCareerWithClub('HV71')");
 const before=r('JSON.stringify(state)');
 assert.match(r('betaFirstWeekView()'),/Kontrollera kedjor/);assert.equal(r('JSON.stringify(state)'),before);
 r('betaFirstWeekDismiss()');assert.equal(r('betaFirstWeekView()'),'');assert.equal(r('JSON.stringify(state)'),before);
});
test('release identity and guide use one beta version and current 2D scope',()=>{
 const version=require('./desktop/package.json').version,r=boot().run;
 assert.equal(r('betaBuild().version'),version);assert.equal(r('HOCKEY_BETA_VERSION'),version);
 assert.ok(fs.readFileSync('BETA_GUIDE.md','utf8').startsWith('# Hockey Manager · Beta '+version));
 assert.ok(!fs.readFileSync('BETA_GUIDE.md','utf8').includes('Välj **Matchvy → 3D'));
 assert.match(require('./scripts/build-identity.cjs').identity(process.cwd()).revision,/^[a-f0-9]{40}$/);
});
