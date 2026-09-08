const assert=require('node:assert/strict');
const {boot}=require('./scripts/career-test-fixture.cjs');
const a=boot(),r=a.run,close=(x,y)=>assert.ok(Math.abs(x-y)<1e-8,x+' != '+y);
r("startCareerWithClub('HV71');medicalRoll=()=>.999;state.calendar.date=calendarTarget();startMatch();globalThis.e=studioEngine();globalThis.actor=e.actors.find(a=>a.side===0&&a.role==='LW');globalThis.p=studioPlayer(0,actor.player.id);p.morale=70;e.teamBonus=0");
assert.equal(r('readinessCeiling(0)'),100);assert.equal(r('readinessCeiling(80)'),72);
assert.ok(r("readinessAttribute(12,'passing',70)")<r("readinessAttribute(12,'passing',100)"));
assert.equal(r("readinessAttribute(12,'skating',100,1,50,0)"),r("readinessAttribute(12,'skating',100,1,50,100)"));
assert.ok(r("readinessAttribute(12,'decisions',100,1,50,0)")<r("readinessAttribute(12,'decisions',100,1,50,100)"));
r("globalThis.ids=e.actors.filter(a=>a.side===0&&['LW','C','RW'].includes(a.role)).map(a=>a.player.id);globalThis.chem=lineChemistry(ids).value");
close(r("e.attribute(actor,'passing')"),r("readinessAttribute(actor.player.attributes.passing,'passing',matchEnergy(p),readinessFit(p,'LW'),chem,p.morale)"));
// Same measured effort and tactics give the real live update the shared workload.
r("p.fatigue=0;p.attributes.stamina=10;state.live.energy={players:{[p.id]:{level:100,shift:0,seconds:0}},breaks:[]};state.tacticalPlan.tempo='high';state.tacticalPlan.forecheck='aggressive';state.tacticalPlan.physicality='hard';studioEffort=()=>1;globalThis.load=readinessLoad('high','aggressive','hard');updateFatigue(20,[p],[])");
close(r('matchEnergy(p)'),r('readinessEnergy(100,20,true,10,false,load)'));
close(r('p.fatigue'),r('readinessWork(20,10,false,load)'));
r("globalThis.tired=matchEnergy(p);updateFatigue(20,[],[])");
assert.ok(r('matchEnergy(p)')>r('tired'));
assert.ok(r('matchEnergy(p)')<=r('readinessCeiling(p.fatigue)'));
assert.ok(r("readinessEnergy(100,45,true,18)")>r("readinessEnergy(100,45,true,5)"));
assert.ok(r("readinessEnergy(100,45,true,10,false,readinessLoad('low'))")>r("readinessEnergy(100,45,true,10,false,readinessLoad('high','aggressive'))"));
assert.ok(r("readinessWork(45,18)")<r("readinessWork(45,5)"));
assert.equal(r('readinessRecover(30,1200,10,72)'),72);
r("globalThis.snapshot=JSON.stringify([state.live,state.clubRosters]);readinessSquadView()");
assert.equal(r('JSON.stringify([state.live,state.clubRosters])'),r('snapshot'));
// Background simulation must return workload, without changing real fatigue before commit.
const b=boot(),t=b.run;
t("startCareerWithClub('HV71');globalThis.g=state.schedule.find(g=>g.home!==managerClub()&&g.away!==managerClub());globalThis.before=JSON.stringify(state.clubRosters);globalThis.result=rivalSimulate(g)");
assert.equal(t('JSON.stringify(state.clubRosters)'),t('before'));
assert.ok(t('result.reports.every(r=>Object.values(r.workload).some(x=>x>0))'));
t("globalThis.report=result.reports[0];globalThis.row=result.rows.find(r=>r.club===g.home&&r.pos!=='MV'&&r.seconds>0);globalThis.p=state.clubRosters[g.home].find(p=>String(p.id)===String(row.id));globalThis.expected=p.fatigue+report.workload[p.id];Object.assign(g,{played:true,homeGoals:result.homeGoals,awayGoals:result.awayGoals});rivalAfterFixture(g,result.rows,result.reports)");
close(t('p.fatigue'),t('Math.min(100,expected)'));
t("globalThis.f=p.fatigue;rivalAfterFixture(g,result.rows,result.reports)");
assert.equal(t('p.fatigue'),t('f'));
assert.ok(t('state.rivals.clubs[g.home].recent.every(x=>!x.workload)'));
console.log('PASS: shared live attribute/workload integration, energy recovery cap, stamina/tempo/morale contrasts, read-only preparation and exact once-only AI workload settlement.');
// Live opponent workload reaches the same fixture settlement, rather than minutes/100.
{
 const c=boot(),u=c.run;
 u("startCareerWithClub('HV71');medicalRoll=()=>.999;state.calendar.date=calendarTarget();startMatch();globalThis.m=state.live;globalThis.op=studioPlayers(1,false)[0];globalThis.before=op.fatigue;updateFatigue(20,[],[op]);globalThis.load=m.rink.oppFatigue[op.id];globalThis.g=state.schedule.find(g=>g.round===state.round&&(g.home===managerClub()||g.away===managerClub()));Object.assign(g,{played:true,homeGoals:1,awayGoals:0});m.finished=true;m.running=false;globalThis.row={...leagueStatRow(op,m.opponent),seconds:20};leagueCommitRows(g,[row],false,true)");
 close(u('op.fatigue'),u('before+load'));
 console.log('PASS: live opponent retains measured workload through league finalization.');
}
// Trace the real background attribute calls: prior fatigue limits everyone at kickoff
// and after recovery, rather than the old unconditional 100-energy initialization.
{
 const d=boot(),v=d.run;
 v("startCareerWithClub('HV71');globalThis.g=state.schedule.find(g=>g.home!==managerClub()&&g.away!==managerClub());for(const club of [g.home,g.away])for(const p of state.clubRosters[club])p.fatigue=80;globalThis.originalAttribute=readinessAttribute;globalThis.seen=[];readinessAttribute=(...args)=>{seen.push(args[2]);return originalAttribute(...args)};rivalSimulate(g)");
 assert.ok(v('seen.length')>100);
 assert.ok(v('Math.max(...seen)')<=72+1e-8);
 assert.ok(v('Math.min(...seen)')<70);
 console.log('PASS: prior fatigue constrains actual background attribute calls throughout the fixture.');
}
