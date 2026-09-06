const fs=require('node:fs'),assert=require('node:assert/strict');
const boot=new Function('require',fs.readFileSync('interface.test.cjs','utf8').split('const app=boot(),')[0]+'\nreturn boot;')(require);
const app=boot(),{run:r,get}=app;
r('startCareerWithClub("HV71")');
assert.equal(r('state.playerWorld.freeAgents.length'),4);
assert.equal(r('new Set([...Object.values(state.clubRosters).flat(),...state.playerWorld.freeAgents].map(p=>p.id)).size'),r('Object.values(state.clubRosters).flat().length+4'));
assert.ok(r('state.playerWorld.freeAgents.every(p=>p.contractYears===0&&p.research.stats.some(s=>s.league==="SHL"&&s.season==="25-26"))'));
assert.ok(r('state.playerWorld.freeAgents.every(p=>!p.name.includes("Krüger")&&!p.name.includes("Kopacka"))'));
assert.equal(get('.game-shell').attrs['data-club'],'HV71');assert.match(get('.game-shell').attrs.style,/#093e78/);
for(const club of r('Object.keys(state.world.membership)'))assert.ok(r(`careerIdentity(${JSON.stringify(club)}).primary.startsWith('#')`));
// Daily contact gives exact attributes, but potential and current stars remain judgements.
assert.ok(r('managerRoster().every(p=>{const a=playerAssessment(p);return a.familiarity===.9&&Object.keys(p.attributes).every(k=>attributeInterval(p,k,a)===String(p.attributes[k]));})'));
r('globalThis.p=managerRoster()[0];globalThis.ownAttributes=JSON.stringify(playerAssessment(p).estimated);state.assessorId="scout"');assert.equal(r('JSON.stringify(playerAssessment(p).estimated)'),r('ownAttributes'));
r('globalThis.target=state.playerWorld.freeAgents[0];globalThis.before=playerAssessment(target).uncertainty;globalThis.cash=state.money;requestScoutReport(target.id);requestScoutReport(target.id)');
assert.equal(r('cash-state.money'),r('Math.round(clubMissionFee()/3)'));assert.equal(r('state.scoutReports[target.id].visits'),0);
r('for(let i=0;i<6;i++)calendarStep(true)');assert.equal(r('state.scoutReports[target.id].visits'),0);
r('calendarStep(true);scoutDay();scoutDay()');assert.equal(r('state.scoutReports[target.id].visits'),1);assert.ok(r('playerAssessment(target).uncertainty<before'));
r('for(let visit=0;visit<2;visit++){requestScoutReport(target.id);for(let day=0;day<7;day++)calendarStep(true);}');assert.equal(r('state.scoutReports[target.id].visits'),3);assert.equal(r('playerAssessment(target).familiarity'),.9);
r('save()');let reload=boot(app.storage.value);assert.equal(reload.run('state.scoutReports[state.playerWorld.freeAgents[0].id]?.visits'),3);
// No startup injection into existing worlds and no return of an already signed free agent.
r('globalThis.free=state.playerWorld.freeAgents.find(p=>p.name==="Oula Palve");state.money=100000000;state.boardPlan.offer.wageLimit=100000000;transferRecruitPlayer(free,WORLD_FREE,managerClub(),0,free.salary,2,"Rotation");save()');
reload=boot(app.storage.value);assert.equal(reload.run('state.playerWorld.freeAgents.some(p=>p.name==="Oula Palve")'),false);assert.equal(reload.run('managerRoster().filter(p=>p.name==="Oula Palve").length'),1);
// A loan stays pending, has a genuine wage counteroffer, and cannot be recalled early.
r('startCareerWithClub("HV71");globalThis.keeper=goalies().find(p=>p.name==="Olof Glifford");globalThis.dest=Object.keys(state.world.membership).find(c=>leagueOf(c)==="HA"&&loanFit(keeper,c).rank===1);globalThis.oldWage=annualWageCost();loanSubmit(keeper.id,dest,28,1,"starter","anytime");globalThis.offer=state.loans.offers[0]');
assert.ok(r('dest'));assert.equal(r('getPlayerClub(keeper.id)'),'HV71');assert.equal(r('offer.status'),'pending');
r('calendarStep(true);calendarStep(true)');assert.equal(r('offer.status'),'counter');assert.ok(r('offer.counter.share<1'));assert.equal(r('offer.counter.days'),56);
r('loanAnswer(offer.id,true);globalThis.loan=playerLoan(keeper)');assert.equal(r('offer.status'),'agreed');assert.equal(r('getPlayerClub(keeper.id)'),r('dest'));assert.equal(r('annualWageCost()'),r('oldWage-keeper.salary*loan.share'));
r('loanRecall(loan.id)');assert.equal(r('getPlayerClub(keeper.id)'),r('dest'));
r('globalThis.mood=keeper.morale;for(let i=1;i<=6;i++)loansAfterFixture({home:dest,away:"HV71",round:i,date:state.calendar.date},[])');assert.ok(r('keeper.morale<mood'));assert.match(r('loan.roleReview'),/Mindre/);
r('for(let day=0;day<28;day++)calendarStep(true);loanRecall(loan.id)');assert.equal(r('getPlayerClub(keeper.id)'),'HV71');
assert.equal(r('Object.values(state.clubRosters).flat().filter(p=>p.id===keeper.id).length'),1);
// Player and club refusal are stable, not a fresh die roll when the UI opens again.
r('globalThis.rejectClub=Object.keys(state.world.membership).find(c=>c!==managerClub()&&!loanFit(keeper,c).interested);');
if(r('Boolean(rejectClub)')){r('loanSubmit(keeper.id,rejectClub,56,0);globalThis.rejectOffer=state.loans.offers[0];calendarStep(true);calendarStep(true)');assert.equal(r('rejectOffer.status'),'rejected');assert.equal(r('getPlayerClub(keeper.id)'),'HV71');}
// A renewal cannot be retried indefinitely by closing and reopening its dialog.
r('startCareerWithClub("HV71");globalThis.veteran=managerRoster().find(p=>p.age>=32&&!playerLoan(p));globalThis.w=renewalWishes(veteran);globalThis.oldSalary=veteran.salary;openContractNegotiation(veteran.id);submitContractRenewal(veteran.id,1,2,w.role);cancelContractNegotiation();openContractNegotiation(veteran.id);submitContractRenewal(veteran.id,1,2,w.role);submitContractRenewal(veteran.id,1,2,w.role);openContractNegotiation(veteran.id);submitContractRenewal(veteran.id,w.salary,2,w.role)');
assert.equal(r('veteran.salary'),r('oldSalary'));assert.ok(r('veteran.renewalPausedUntil>state.calendar.date'));
r('for(let i=0;i<7;i++)calendarStep(true);openContractNegotiation(veteran.id);submitContractRenewal(veteran.id,renewalWishes(veteran).salary,5,w.role)');assert.equal(r('veteran.salary'),r('oldSalary'));
// The assigned rink slots drive positions, and a setup needs time and actual passes.
r('startCareerWithClub("HV71");ensureSpecialTeams();specialSelect("pp1",2);globalThis.replacement=managerRoster().find(p=>p.pos!=="MV"&&!state.specialTeams.pp1.includes(p.id));specialPlace(replacement.id);specialPlan("pp","overload");state.calendar.date=calendarTarget();createMatch();state.live.penaltiesOpp=[120];ensureRink();globalThis.rink=state.live.rink;rink.restart=false;rink.owner="own";globalThis.actor=rinkSkaters("own").find(a=>a.id===state.specialTeams.pp1[0]);rink.carrier=actor.key;actor.x=78;actor.y=50;globalThis.targets=hockeyTargets();');
assert.equal(r('hockeyRoles("own")[2].id'),r('replacement.id'));assert.equal(r('targets[hockeyRoles("own")[1].key].duty'),'Halvsarg');assert.equal(r('hockeyShotChoice(actor)'),0);
r('rinkSkaters("own").forEach(a=>Object.assign(a,{x:targets[a.key].x,y:targets[a.key].y}));hockeyUpdatePowerplay();hockeyUpdatePowerplay();rink.hockey.pp.passes=2;');assert.ok(r('hockeyShotChoice(actor)>0'));
r('globalThis.model=JSON.stringify(rink.hockey);rinkView();rinkView();specialBoardView()');assert.equal(r('JSON.stringify(rink.hockey)'),r('model'));
r('state.live.penaltiesOpp=[];state.live.penaltiesHV=[120];ensureRink();specialPlan("counter","safe");actor=rinkSkaters("own")[0];actor.x=25;actor.y=50;rink.owner="own";rink.carrier=actor.key;globalThis.icing=rink.hockey.counts.icing.own;hockeyClear(actor)');assert.equal(r('rink.hockey.counts.icing.own'),r('icing'));assert.equal(r('rink.hockey.pp'),null);
// Mixed, explained reactions reach the actual match squad and have bounded persistent consequences.
r('startCareerWithClub("HV71");state.calendar.date=calendarTarget();createMatch();globalThis.members=socialMatchPlayers();globalThis.a=members[0],b=members[1],c=members[2];a.social.sensitivity=19;a.social.trust=70;b.social.sensitivity=2;b.social.trust=70;c.social.trust=15;teamTalk("support")');
assert.ok(r('state.live.socialTalks.p1.reactions.some(x=>x.effect>0)&&state.live.socialTalks.p1.reactions.some(x=>x.effect===0)&&state.live.socialTalks.p1.reactions.some(x=>x.effect<0)'));
assert.ok(r('state.live.socialTalks.p1.reactions.length<=22'));
r('globalThis.aMood=a.morale;for(let i=0;i<100;i++)socialApplyFeedback(a,1)');assert.ok(r('a.morale-aMood<=4'));
r('save()');reload=boot(app.storage.value);assert.equal(reload.run('state.live.socialTalks.p1.reactions.length'),r('state.live.socialTalks.p1.reactions.length'));
assert.doesNotThrow(()=>r('validateSaveText(saveExportText())'));
for(const view of ['scoutingView()','specialBoardView()','loansView()','recruitDealsView()','teamTalkPanel()'])assert.doesNotMatch(r(view),/undefined|NaN/);
console.log('PASS: sourced free agents, exact own knowledge, dated scouting, persistent offers, loan counters/refusal/wages/role/recall, renewal cooldown, PP roles/setup, PK clearance, mixed bounded feedback and save continuity.');
// Counteroffers are actionable, survive reload, expire and never transfer money twice.
r('startCareerWithClub("HV71");state.money=100000000;state.boardPlan.offer.wageLimit=100000000;globalThis.candidate=state.playerWorld.freeAgents.find(p=>p.name==="Oula Palve");globalThis.wish=recruitPlayerWishes(candidate);globalThis.cash=state.money;submitRecruitOffer(candidate.id,0,Math.round(wish.salary*.8),1,"Rotation");globalThis.deal=state.recruitment.deals[0];deal.rival=null;calendarStep(true);calendarStep(true)');
assert.ok(r('Boolean(deal.counter)'));assert.equal(r('getPlayerClub(candidate.id)'),r('WORLD_FREE'));assert.equal(r('state.money'),r('cash'));assert.ok(r('deskTasks().some(t=>t.action.tab==="deals")'));
r('save()');reload=boot(app.storage.value);assert.ok(reload.run('Boolean(state.recruitment.deals[0].counter)'));
r('acceptRecruitCounter(deal.id);calendarStep(true);globalThis.signedSalary=candidate.salary;calendarStep(true)');assert.equal(r('deal.status'),'signed');assert.equal(r('candidate.salary'),r('signedSalary'));assert.equal(r('managerRoster().filter(p=>p.id===candidate.id).length'),1);
// Incoming loans reserve wages while a negotiation is outstanding; bad imported terms are rejected.
r('startCareerWithClub("AIK");globalThis.borrow=state.clubRosters["HV71"].find(p=>loanCanLeave(p,"HV71")&&loanFit(p,managerClub()).interested&&!loanTerms(p,"HV71",managerClub(),{days:56,share:0,role:"regular",recall:"day28"}).reason?.startsWith("Spelaren avböjer"));loanSubmit(borrow.id,managerClub(),56,0);globalThis.incoming=state.loans.offers[0];calendarStep(true);calendarStep(true)');
assert.equal(r('incoming.status'),'counter');assert.ok(r('incoming.counter.share>0'));assert.ok(r('loanReserved(managerClub())>0'));
r('save()');assert.doesNotThrow(()=>r('validateSaveText(saveExportText())'));r('globalThis.bad=JSON.parse(saveExportText());bad.career.loans.offers[0].counter.share=7');assert.throws(()=>r('validateSaveText(JSON.stringify(bad))'));
r('for(let i=0;i<8;i++)calendarStep(true)');assert.equal(r('incoming.status'),'expired');assert.equal(r('loanReserved(managerClub())'),0);assert.equal(r('getPlayerClub(borrow.id)'),'HV71');
console.log('PASS: recruitment counteroffer and reload/acceptance, incoming loan negotiation and wage reservation, explicit expiry, and invalid loan import rejection.');
