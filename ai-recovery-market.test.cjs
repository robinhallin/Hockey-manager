const assert=require('node:assert/strict');const {boot}=require('./scripts/career-test-fixture.cjs');const app=boot(),r=app.run;
r(`startCareerWithClub('HV71');globalThis.club='Färjestad BK';globalThis.keepers=state.clubRosters[club].filter(p=>p.pos==='MV');
 globalThis.injure=(p,days)=>{p.health.injury={remaining:days,readiness:55,initial:days,name:'Testskada'};p.health.clearance='rest';};
 keepers.slice(1).forEach(p=>injure(p,4));globalThis.need=()=>aiSquadNeeds(club).find(n=>n.role==='goalie');`);
assert.equal(r('need().shortTerm'),true);assert.equal(r('need().returnDays'),7,'includes actual readiness recovery days');
r(`globalThis.market=getTransferMarketPlayers().filter(p=>p.pos==='MV'&&p.team!==club);aiScoutClub(club,market);`);
assert.equal(r('state.clubAI.offers.some(o=>o.buyer===club&&o.needRole===\'goalie\')'),false,'short backup absence does not trigger a keeper purchase');
r(`globalThis.p=state.playerWorld.freeAgents.find(p=>p.pos==='MV');
 globalThis.offer={buyer:club,seller:getPlayerClub(p.id),playerId:p.id,needRole:'goalie',kind:'transfer',fee:0,salary:p.salary,years:2,role:'Nyckelspelare'};`);
assert.equal(r('aiValidateOffer(offer)'),'Kort skadefrånvaro kan täckas av den befintliga truppen.','pending spending is rechecked');
r('keepers.slice(1).forEach(p=>p.health.injury.readiness=100)');assert.equal(r('need().returnDays'),5,'medical clearance requires the next recovery step');
r('keepers.slice(1).forEach(p=>injure(p,30))');assert.equal(r('need().shortTerm'),false);assert.equal(r('need().returnDays'),33);
r('keepers.forEach(p=>injure(p,4))');assert.equal(r('need().shortTerm'),false,'no fit goalkeeper remains an emergency');
r('keepers[0].health.injury=null;keepers.slice(1).forEach(p=>injure(p,4));save()');
const loaded=boot(app.storage.value);assert.equal(loaded.run("aiSquadNeeds('Färjestad BK').find(n=>n.role==='goalie').returnDays"),7);
// Advance the actual medical system: the forecast matches the return, without accelerating healing.
r('for(let i=0;i<6;i++)medicalDay();');assert.ok(r('keepers.slice(1).every(p=>!medicalReady(p))'));
r('medicalDay()');assert.ok(r('keepers.every(medicalReady)'));assert.equal(r('need().missing'),0);
console.log('PASS: medical return forecast, short-gap market restraint, pending validation, long injury and emergency exceptions, persistence and actual healing.');
