const assert=require('node:assert/strict');const {boot}=require('./scripts/career-test-fixture.cjs');
const app=boot(),r=app.run;r("startCareerWithClub('HV71');globalThis.p=managerRoster().find(p=>p.pos==='C'&&medicalReady(p));usagePromiseAssign(p,'pp');globalThis.happy=p.happiness;globalThis.trust=p.social.trust");
r(`globalThis.play=(key,seconds,opportunity=180)=>{const m={finished:true,opponent:'AIK',analysis:{id:key},leagueBox:{players:{a:{id:p.id,club:managerClub(),scoutUsage:{pp:seconds}},b:{id:'mate',club:managerClub(),scoutUsage:{pp:opportunity}}}}};usagePromiseFollow(m);};play('no-powerplay',0,0)`);
assert.equal(r('p.usagePromise.games'),0,'no PP opportunity is not a broken promise');
r("for(let i=0;i<6;i++)play('pp:'+i,i<4?70:0);play('pp:5',0)");assert.equal(r('p.usagePromise.result'),'Uppfyllt');assert.equal(r('p.usagePromise.games'),6);assert.equal(r('p.happiness'),r('Math.min(100,happy+4)'));
r("usagePromiseAssign(p,'pk');globalThis.happy=p.happiness;globalThis.trust=p.social.trust;for(let i=0;i<6;i++)usagePromiseFollow({finished:true,opponent:'AIK',analysis:{id:'pk:'+i},leagueBox:{players:{a:{id:p.id,club:managerClub(),scoutUsage:{pk:0}},b:{id:'mate',club:managerClub(),scoutUsage:{pk:120}}}}})");
assert.equal(r('p.usagePromise.result'),'Brutet');assert.equal(r('p.happiness'),r('happy-10'));assert.equal(r('p.social.trust'),r('trust-7'));
r("usagePromiseAssign(p,'top');usagePromiseFollow({finished:true,analysis:{id:'legacy'},iceTime:{[p.id]:1800}})");assert.equal(r('p.usagePromise.games'),0,'missing old ledger is not zero usage');
r("globalThis.row={};ensureLines();state.lines.forwards[0]=p.id;scoutingTrackUsage(row,480,'even',p,true);scoutingTrackUsage(row,65,'pp',p,true)");assert.equal(r('row.scoutUsage.top'),480);assert.equal(r('row.scoutUsage.pp'),65);
r("usagePromiseFollow({finished:true,analysis:{id:'top1'},opponent:'AIK',leagueBox:{players:{a:{id:p.id,club:managerClub(),scoutUsage:row.scoutUsage}}}})");assert.equal(r('p.usagePromise.qualified'),1);
r("globalThis.before=JSON.stringify(state);usagePromiseView();recruitmentImpact(p,'pp')");assert.equal(r('JSON.stringify(state)'),r('before'));
r('save()');const loaded=boot(app.storage.value);assert.equal(loaded.run('managerRoster().find(p=>p.usagePromise?.kind==="top").usagePromise.qualified'),1);
// A real transfer and a future arrival preserve their accepted special-team terms.
r("state.money=100000000;state.wageBudget=1000000000;globalThis.q=getTransferMarketPlayers().find(p=>p.pos==='C'&&!playerLoan(p)&&!p.futureContract&&!naActive(p));globalThis.seller=getPlayerClub(q.id);globalThis.ok=transferRecruitPlayer(q,seller,managerClub(),0,200000,2,'Rotation','pp')");assert.equal(r('ok'),true);assert.equal(r('q.usagePromise.kind'),'pp');
r("globalThis.f=findPlayerAnywhere(getTransferMarketPlayers().find(p=>p.pos==='B'&&!playerLoan(p)&&!p.futureContract&&!naActive(p)).id);f.futureContract={buyer:managerClub(),salary:200000,years:2,role:'Rotation',usage:'pk',rolePromiseVersion:2,joinYear:state.season.year};calendarActivateFuture()");assert.equal(r('f.usagePromise.kind'),'pk');
assert.match(r('hubTransferForm(getTransferMarketPlayers().find(p=>p.pos===\'C\'))'),/Särskilt användningslöfte/);
console.log('PASS: actual usage, opportunity and legacy exclusions, morale/trust once, persistence, transfer/future terms and preview.');
