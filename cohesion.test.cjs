const assert=require('node:assert/strict');
const {boot}=require('./scripts/career-test-fixture.cjs');
const app=boot(),r=app.run;
r(`startCareerWithClub('HV71');globalThis.p=managerRoster().find(p=>p.pos==='MV');p.promisedRole='Rotation';`);
for(let i=0;i<6;i++)r(`squadRecordRole(p,{analysis:{id:'role-${i}'},iceTime:{}})`);
assert.equal(r('squadRoleGames(p).length'),6);
assert.equal(r('squadGoalieMissed(p)'),false,'Backup goalies need not start every match');
r(`p.promisedRole='Ordinarie'`);assert.equal(r('squadGoalieMissed(p)'),true);
r(`p.roleGames[0].seconds=1800;p.roleGames[1].seconds=3600;`);assert.equal(r('squadGoalieMissed(p)'),false);
r(`p.promisedRole='Nyckelspelare'`);assert.equal(r('squadGoalieMissed(p)'),true);
const count=r('p.roleGames.length');r(`squadRecordRole(p,{analysis:{id:'role-5'},iceTime:{}})`);assert.equal(r('p.roleGames.length'),count);
r(`p.age=35;p.social.ambition=8;p.social.trust=70;globalThis.salary=p.salary;globalThis.years=p.contractYears;p.recruitmentPromise={resolved:false};squadDiscussRole(p.id,'Rotation');`);
assert.equal(r('p.promisedRole'),'Nyckelspelare','Existing promises cannot be erased by a role talk');
r(`p.recruitmentPromise.resolved=true;squadDiscussRole(p.id,'Rotation');`);
assert.equal(r('p.promisedRole'),'Rotation');assert.equal(r('p.salary'),r('salary'));assert.equal(r('p.contractYears'),r('years'));
assert.equal(r('p.roleHistory.length'),1);
r(`squadDiscussRole(p.id,'Breddspelare');`);assert.equal(r('p.roleHistory.length'),1,'Talk cooldown is enforced');
r('save()');assert.equal(boot(app.storage.value).run(`managerRoster().find(p=>p.pos==='MV').roleHistory.length`),1);
r(`state.loans.active.push({id:999,playerId:p.id,borrower:managerClub()});p.loanId=999;`);
assert.ok(r('squadRoleBlock(p).includes("Lånerollen")'));
r('state.loans.active.pop();delete p.loanId;');
// A real acquisition preserves the trainer's formation and the incoming player's workload.
r(`ensureLines();ensureSpecialTeams();state.money=1000000000;state.boardPlan.offer.wageLimit=1000000000;globalThis.lines=JSON.stringify(state.lines);globalThis.special=JSON.stringify(state.specialTeams);globalThis.target=state.playerWorld.freeAgents[0];target.fatigue=57;`);
assert.equal(r(`transferRecruitPlayer(target,WORLD_FREE,managerClub(),0,target.salary,2,'Rotation')`),true);
assert.equal(r('target.fatigue'),57);assert.equal(r('JSON.stringify(state.lines)'),r('lines'));assert.equal(r('JSON.stringify(state.specialTeams)'),r('special'));
assert.ok(r('squadArrivalView(target).includes("Befintliga rollåtaganden")'));
// Delegation performs a real rest session; manual decisions take priority.
const auto=boot(),s=auto.run;s(`startCareerWithClub('HV71');globalThis.p=managerRoster()[0];p.fatigue=60;setRecoveryOwner('staff');setTrainingSession(0,'type','skills');setTrainingSession(0,'intensity','hard');managerContinue();`);
assert.equal(s('p.trainingSessions[0].rest'),true);assert.equal(s('p.fatigue'),35);assert.equal(s('p.trainingLoad'),'normal');
s(`p.fatigue=60;setIndividualLoad(p.id,'normal');setTrainingSession(state.training.day,'type','skills');setTrainingSession(state.training.day,'intensity','hard');managerContinue();`);
assert.equal(s('p.trainingSessions[0].rest'),false);assert.equal(s('p.fatigue'),72);
// Opponents must also pay the energy cost of training, and rest produces no growth.
const ai=boot(),a=ai.run;a(`startCareerWithClub('HV71');globalThis.ps=state.clubRosters['Brynäs IF'];globalThis.tired=ps[0],fresh=ps[1];tired.fatigue=60;fresh.fatigue=20;tired.health.injury=null;fresh.health.injury=null;globalThis.progress=JSON.stringify(tired.trainingProgress);state.rivals.lastDay=null;rivalsDay();`);
assert.equal(a('tired.fatigue'),35);assert.equal(a('fresh.fatigue'),22);assert.equal(a('JSON.stringify(tired.trainingProgress)'),a('progress'));
const after=a('JSON.stringify([tired.fatigue,fresh.fatigue])');a('rivalsDay()');assert.equal(a('JSON.stringify([tired.fatigue,fresh.fatigue])'),after,'Background training runs once per day');
console.log('PASS: role promises, goalie rotation, negotiated role/cooldown/persistence, acquisition continuity, delegated recovery/manual priority and AI training costs.');
