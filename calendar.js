"use strict";
// Generated career dates. This is not the published SHL/HA fixture list.
const CAL_DAY=86400000;
function calAdd(date,n){return new Date(Date.parse(date+'T12:00:00Z')+n*CAL_DAY).toISOString().slice(0,10);}
function calGap(a,b){return Math.round((Date.parse(b+'T12:00:00Z')-Date.parse(a+'T12:00:00Z'))/CAL_DAY);}
function calText(date){return new Date(date+'T12:00:00Z').toLocaleDateString('sv-SE',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});}
function calRoundDate(round,year=state.season.year){
 let day=`${year}-09-10`;for(let i=1;i<Math.min(round,53);i++)day=calAdd(day,[2,3,2,5,4,3,5][(i-1)%7]);
 return round<=52?day:calAdd(day,3+(round-53)*2);
}
function ensureCalendar(){
 if(!state.careerStarted)return;
 const s=state.season;if(!s)return;
 if(!state.calendar){
  const fixtureDate=calRoundDate(state.round,s.year),remaining=Math.max(0,3-(state.training?.day||0));
  const date=s.phase==='preseason'?`${s.year}-07-01`:s.phase==='review'?calRoundDate(Math.max(53,state.round),s.year):state.live&&!state.live.finished?fixtureDate:calAdd(fixtureDate,-remaining);
  state.calendar={initialPreseasonUsed:s.phase!=='regular'||state.round>1||state.teams.some(t=>t.gp),version:1,year:s.year,date,marketDay:calAdd(date,7),friendlies:[],nextId:1,futureHistory:[],notice:'',lastTraining:null};
 }
 const c=state.calendar;
 if(c.year!==s.year){c.initialPreseasonUsed=true;c.year=s.year;c.date=`${s.year}-07-01`;c.marketDay=calAdd(c.date,7);c.friendlies=[];c.active=null;c.lastTraining=null;}
 for(const g of state.schedule)if(!g.date)g.date=calRoundDate(g.round,s.year);
}
function calendarTarget(){
 const c=state.calendar;if(!c)return null;
 if(c.active)return c.friendlies.find(f=>f.id===c.active)?.date;
 if(state.season.phase==='preseason')return c.friendlies.filter(f=>!f.played&&f.club===managerClub()).sort((a,b)=>a.date.localeCompare(b.date))[0]?.date||`${state.season.year}-09-10`;
 return currentSeasonFixture()?.date||calRoundDate(state.round);
}
function calendarTrainingPlan(t){
 if(!state.calendar)return;
 const c=state.calendar,key=`${state.season.year}:${state.season.phase}:${state.round}:${c.active||''}`;
 if(t.calendarKey!==key||t.day>=t.plan.length&&state.season.phase==='preseason'&&c.date<calendarTarget()){
  const count=Math.max(0,Math.min(7,calGap(c.date,calendarTarget()||c.date)));
  const done=t.calendarKey?0:t.day;if(t.calendarKey)t.logs=[];
  t.plan=Array.from({length:count+done},(_,i)=>t.plan[i]||{type:i===count+done-1?'matchprep':i%3===0?'recovery':'skills',intensity:'normal'});
  t.day=done;t.calendarKey=key;t.lockedRound=state.live&&!state.live.finished?state.round:null;
 }
}
function trainingDays(){return state.training?.plan.length??3;}
function calendarWindowOpen(){
 if(!state.calendar)return true;
 const date=state.calendar.date,year=state.season.year;
 return date>=`${year}-05-16`&&date<=`${year+1}-02-15`;
}
function calendarDeadlineText(){return calendarWindowOpen()?`Öppet till 15 feb ${state.season.year+1}`:'Stängt för omedelbara värvningar';}
function calendarNotify(message){state.calendar.notice=message;save();render();}
function calendarMarketDay(){
 const c=state.calendar,r=state.recruitment;
 for(const d of r.deals.filter(d=>d.status==='pending'&&d.dueDate&&d.dueDate<=c.date))resolveRecruitDeal(d);
 if(c.date>=c.marketDay){
  advanceRecruitment();c.marketDay=calAdd(c.date,7);
  for(const [id,report] of Object.entries(state.scoutReports))if(report.dueRound&&report.observedTick!==r.tick){report.visits=Math.min(3,(report.visits||0)+1);report.observedTick=r.tick;delete report.dueRound;const p=findPlayerAnywhere(id);if(p)managerMessage(`scout:${id}:${report.visits}`,`Scoutrapport: ${p.name}`,`Observation ${report.visits} av 3 är klar.`,'Chefsscout',{link:'scouting'});}
 }
 if(c.date===`${state.season.year+1}-02-08`||c.date===`${state.season.year+1}-02-15`)managerMessage(`deadline:${c.date}`,'Transferdeadline närmar sig',`Sista dagen för omedelbara värvningar är 15 februari. Bud tar två kalenderdagar att behandla; en övergång måste vara klar före stängningen. Avtal inför nästa säsong kan fortfarande förhandlas.`,'Sportchefen',{link:'transfers'});
}
function calendarStep(recovered=false){
 const c=state.calendar;if(!c)return;
 if(!recovered){medicalDay();managerRoster().forEach(p=>p.fatigue=Math.max(0,p.fatigue-8));}
 c.date=calAdd(c.date,1);calendarMarketDay();
}
function calendarToMatch(){
 ensureCalendar();if(state.calendar.active)return;
 const target=calendarTarget();let guard=0;
 while(target&&state.calendar.date<target&&guard++<220)calendarStep();
}
function calendarAfterFixture(){
 if(!state.calendar)return;
 // afterTrainingMatch already provided the match day's rehabilitation.
 calendarStep(true);
}
function calendarContinue(limit=14){
 if(careerScreen||!state.careerStarted||!managerCanPlay())return;
 ensureCalendar();ensureTrainingData();
 if(state.live&&!state.live.finished){state.page='match';save();render();return;}
 if(['review','playoffs'].includes(state.season.phase)&&seasonContinue())return;
 const pending=pendingManagerDecision();if(pending){openManagerMessage(pending.id);return;}
 const c=state.calendar,start=c.date;
 for(let i=0;i<limit;i++){
  const target=calendarTarget();
  if(c.date>=target){
   const friendly=c.friendlies.find(f=>!f.played&&f.club===managerClub()&&f.date===c.date);
   if(friendly){calendarPlayFriendly(friendly.id);return;}
   if(state.season.phase==='preseason'){state.page='season';break;}
   state.live=null;state.page='match';break;
  }
  const pendingBefore=state.recruitment.deals.filter(d=>d.status==='pending').length,marketBefore=state.recruitment.tick;
  ensureTrainingData();
  if(!runTrainingSession()){
   if(pendingManagerDecision()){openManagerMessage(pendingManagerDecision().id);return;}
   calendarStep();
  }
  if(state.recruitment.tick!==marketBefore||state.recruitment.deals.filter(d=>d.status==='pending').length!==pendingBefore||c.date.endsWith('-02-15')){state.page='inbox';break;}
 }
 if(state.page==='inbox'){const message=state.training.messages[0];state.training.selectedMessage=message?.id;if(message)message.read=true;}
 c.notice=`${calText(start)} → ${calText(c.date)}. Planerade pass och återhämtning har genomförts.`;
 save();render();
}
function calendarWeek(){
 if(state.season.phase!=='preseason')return;
 if(state.live&&!state.live.finished)return calendarNotify('Avsluta träningsmatchen innan kalendern går vidare.');
 state.recruitment.weeks++;calendarContinue(7);
}
function calendarInitialPreseason(){
 if(state.calendar.initialPreseasonUsed||state.season.phase!=='regular'||state.round!==1||state.teams.some(t=>t.gp)||state.live&&!state.live.finished)return;
 state.calendar.initialPreseasonUsed=true;state.season.phase='preseason';state.season.grant=0;state.season.departures=[];state.season.nextWageLimit=wageBudget();
 state.calendar.date=`${state.season.year}-08-01`;state.calendar.marketDay=calAdd(state.calendar.date,7);state.training.calendarKey=null;state.training.day=0;state.live=null;
 state.page='calendar';save();render();
}
function calendarBookFriendly(opponentName,date){
 const c=state.calendar;
 if(state.season.phase!=='preseason'||state.live&&!state.live.finished)return calendarNotify('Träningsmatcher bokas mellan matcher under försäsongen.');
 if(!state.world.membership[opponentName]||opponentName===managerClub()||!/^\d{4}-\d{2}-\d{2}$/.test(date)||(!Number.isFinite(Date.parse(date))||calAdd(date,0)!==date)||date<=c.date||date>=`${state.season.year}-09-10`)return calendarNotify('Välj en annan klubb och ett ledigt datum före seriepremiären.');
 if(c.friendlies.filter(f=>f.club===managerClub()).length>=6||c.friendlies.some(f=>f.club===managerClub()&&Math.abs(calGap(f.date,date))<2))return calendarNotify('Högst sex träningsmatcher och minst två dagar mellan matcherna.');
 c.friendlies.push({id:c.nextId++,club:managerClub(),opponent:opponentName,date,played:false});state.training.calendarKey=null;state.training.day=0;
 calendarNotify(`Träningsmatch mot ${opponentName} bokad ${calText(date)}.`);
}
function calendarCancelFriendly(id){const c=state.calendar,f=c.friendlies.find(f=>f.id===id);if(!f||f.played||c.active===id||f.club!==managerClub())return;c.friendlies=c.friendlies.filter(f=>f.id!==id);state.training.calendarKey=null;state.training.day=0;save();render();}
function calendarPlayFriendly(id){
 const c=state.calendar,f=c.friendlies.find(f=>f.id===id);if(!f||f.played||f.club!==managerClub()||c.date!==f.date||state.season.phase!=='preseason'||state.live&&!state.live.finished)return;
 if(!medicalMatchReady()){state.page='medical';save();render();return;}
 c.active=id;c.stats=Object.fromEntries([...(state.clubRosters[managerClub()]||[]),...(state.clubRosters[f.opponent]||[])].map(p=>[p.id,Object.fromEntries(['goals','assists','shots','pim','games','saves','goalsAgainst'].map(k=>[k,p[k]||0]))]));
 state.live=null;createMatch();if(state.live){state.live.friendly=true;state.training.lockedRound=state.round;state.page='match';save();render();}
}
function calendarFinishFriendly(){
 const c=state.calendar,m=state.live,f=c.friendlies.find(f=>f.id===c.active);if(!m||m.finished||!f)return;
 m.running=false;m.finished=true;clearTimeout(matchTimer);f.played=true;f.own=m.hv;f.against=m.opp;
 for(const [id,stats] of Object.entries(c.stats||{})){const p=findPlayerAnywhere(id);if(p)Object.assign(p,stats);}
 for(const p of managerRoster())grantMatchDevelopment(p,m.iceTime?.[p.id]||0);
 medicalAfterMatch();finishAnalysis();
 c.active=null;delete c.stats;calendarStep(true);state.training.calendarKey=null;state.training.day=0;state.training.lockedRound=null;
 managerMessage(`friendly:${state.season.year}:${f.id}`,'Träningsmatchen är färdig',`${f.club} ${f.own}–${f.against} ${f.opponent}. Istid, samspel och belastning följer med; resultat och poäng räknas inte i ligan.`,'Tränarteam',{link:'statistics'});
 state.page='calendar';save();render();
}
function calendarView(){
 const c=state.calendar,pre=state.season.phase==='preseason',fixtures=state.schedule.filter(g=>g.home===managerClub()||g.away===managerClub());
 const events=[...fixtures.map(g=>({date:g.date,label:`${g.home} – ${g.away}`,played:g.played,result:g.played?`${g.homeGoals}–${g.awayGoals}`:'Matchdag'})),...c.friendlies.filter(f=>f.club===managerClub()).map(f=>({date:f.date,label:`Träningsmatch · ${f.opponent}`,played:f.played,result:f.played?`${f.own}–${f.against}`:'Bokad'}))].filter(e=>e.date>=calAdd(c.date,-7)).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,16);
 return `<section class="calendar-page"><header class="daily-heading"><div><span class="career-eyebrow">DIN HOCKEYVARDAG</span><h1>${calText(c.date)}</h1><p>${calendarDeadlineText()} · Nästa marknadsrapport ${calText(c.marketDay)}</p></div></header>${c.notice?`<p role="status">${trainingSafe(c.notice)}</p>`:''}<p>Tränarteamet genomför din träningsplan mellan besluten. Kalendern stannar vid matchdag, budbesked, veckorapport eller ett spelarsamtal.</p><button class="btn secondary" onclick="trainingOpen('training')">Planera passen</button>${!c.initialPreseasonUsed&&state.season.phase==='regular'&&state.round===1&&!state.teams.some(t=>t.gp)?'<button class="btn secondary" onclick="calendarInitialPreseason()">Börja med försäsong</button>':''}${pre?`<form class="calendar-booking" onsubmit="event.preventDefault();calendarBookFriendly(this.elements.opponent.value,this.elements.date.value)"><h2>Boka träningsmatch</h2><label>Motståndare<select name="opponent">${Object.keys(state.world.membership).filter(n=>n!==managerClub()).map(n=>`<option>${trainingSafe(n)}</option>`).join('')}</select></label><label>Matchdatum<input name="date" type="date" required min="${calAdd(c.date,1)}" max="${state.season.year}-09-09" value="${calAdd(c.date,3)}"></label><button class="btn">Boka match</button></form>${c.friendlies.filter(f=>!f.played&&f.club===managerClub()).map(f=>`<div class="calendar-fixture"><span>${calText(f.date)} · ${trainingSafe(f.opponent)}</span><button class="btn secondary" onclick="calendarCancelFriendly(${f.id})">Avboka</button>${f.date===c.date?`<button class="btn" onclick="calendarPlayFriendly(${f.id})">Spela</button>`:''}</div>`).join('')}`:''}<h2>Kommande matcher</h2>${events.map(e=>`<article class="calendar-fixture"><time datetime="${e.date}">${calText(e.date)}</time><strong>${trainingSafe(e.label)}</strong><span>${e.result}</span></article>`).join('')||'<p>Premiären är den 10 september. Förbered truppen under Säsong.</p>'}<p class="training-note">Datumen är genererade för din karriär. Transferfönstret använder 16 maj–15 februari som förenklad spelregel. Ekonomins årslöner fördelas fortsatt över grundseriens 52 matcher.</p></section>`;
}
function calendarLaunch(){
 ensureCalendar();const start=`${state.season.year}-09-07`;let guard=0;
 while(state.calendar.date<start&&guard++<220)calendarStep();
 state.training.calendarKey=null;state.training.day=0;
}
function calendarFutureRoom(club=managerClub()){
 const wages=(state.clubRosters[club]||[]).filter(p=>p.contractYears>1&&!p.futureContract).reduce((n,p)=>n+p.salary,0);
 const committed=Object.values(state.clubRosters).flat().filter(p=>p.futureContract?.buyer===club).reduce((n,p)=>n+p.futureContract.salary,0);
 const pending=state.recruitment.deals.filter(d=>d.status==='pending'&&(d.kind==='future'?d.buyer===club:club===managerClub()&&d.years>1)).reduce((n,d)=>n+d.salary,0);
 return (club===managerClub()?wageBudget():state.recruitment.ai[club]?.wageLimit||0)-wages-committed-pending;
}
function submitFutureOffer(id,salary,years,role){
 if(!managerCanPlay())return;
 const p=findPlayerAnywhere(id),seller=getPlayerClub(id),r=state.recruitment;
 if(state.live&&!state.live.finished)return recruitMessage('Avsluta matchen innan du förhandlar nästa avtal.');
 if(!p||isOwnPlayer(p)||p.contractYears!==1||p.futureContract||state.season.phase==='preseason')return recruitMessage('Förhandsavtal gäller spelare i andra klubbar med ett kontraktsår kvar, under pågående säsong.');
 salary=Math.round(Number(salary));years=Number(years);
 if(!Number.isFinite(salary)||salary<=0||!Number.isInteger(years)||years<1||years>5||!SQUAD_ROLES.includes(role))return recruitMessage('Ange giltig lön, roll och avtalslängd.');
 if(r.deals.some(d=>samePlayerId(d.playerId,id)&&['pending','future_signed'].includes(d.status)))return recruitMessage('Ett erbjudande eller framtida avtal finns redan.');
 if(salary>calendarFutureRoom())return recruitMessage('Nästa säsongs beräknade löneutrymme räcker inte.');
 r.deals.unshift({id:r.nextId++,kind:'future',playerId:p.id,name:p.name,buyer:managerClub(),seller,fee:0,salary,years,role,due:r.tick+1,dueDate:calAdd(state.calendar.date,2),joinYear:state.season.year+1,status:'pending',rival:recruitRival(p,seller)});
 r.tab='deals';state.page='transfers';recruitMessage('Erbjudandet gäller från nästa säsong. Spelaren stannar i nuvarande klubb tills dess. Besked om två kalenderdagar.');
}
function calendarResolveFuture(d){
 const p=findPlayerAnywhere(d.playerId),w=p?recruitPlayerWishes(p,d.buyer):null;
 let reason=!p||getPlayerClub(d.playerId)!==d.seller||p.contractYears!==1?'Spelarens kontraktsläge har ändrats.':p.futureContract?'Spelaren har redan valt en klubb.':!w||d.salary<w.salary||SQUAD_ROLES.indexOf(d.role)<SQUAD_ROLES.indexOf(w.role)||d.years<w.minYears||d.years>w.maxYears?'Lön, roll eller avtalslängd motsvarar inte spelarens krav.':calendarFutureRoom(d.buyer)+d.salary<d.salary?'Löneutrymmet för nästa säsong räcker inte längre.':'';
 if(reason){d.status='rejected';d.reason=reason;recruitReport(`Besked om ${d.name}`,reason);return;}
 let buyer=d.buyer,terms=d;
 if(d.rival&&calendarFutureRoom(d.rival.club)>=d.rival.salary&&recruitOfferScore(p,d.rival.club,d.rival)>recruitOfferScore(p,d.buyer,d)+1){buyer=d.rival.club;terms=d.rival;d.status='rejected';d.reason=`Spelaren väljer ${buyer} nästa säsong.`;}
 else {d.status='future_signed';d.reason=`Klart för ${d.joinYear}/${String(d.joinYear+1).slice(-2)}. Spelaren ansluter vid säsongsskiftet.`;}
 p.futureContract={buyer,seller:d.seller,joinYear:d.joinYear,salary:terms.salary,years:terms.years,role:terms.role};
 recruitReport(`Framtidsbesked: ${p.name}`,d.reason);
}
function calendarActivateFuture(){
 if(!state.calendar)return;
 for(const p of [...Object.values(state.clubRosters).flat(),...(state.playerWorld?.freeAgents||[])]){
  const f=p.futureContract;if(!f||f.joinYear>state.season.year)continue;
  if(!state.clubRosters[f.buyer])continue;
  const seller=getPlayerClub(p.id);if(seller===WORLD_FREE)worldRemoveFree(p.id);else state.clubRosters[seller]=state.clubRosters[seller].filter(q=>!samePlayerId(q.id,p.id));
  state.clubRosters[f.buyer].push(p);Object.assign(p,{club:f.buyer,salary:f.salary,contractYears:f.years,squadRole:f.role,promisedRole:f.role,transferListed:false});delete p.futureContract;
  if(f.buyer===managerClub())p.recruitmentPromise={role:f.role,minutes:p.pos==='MV'?30:f.role==='Nyckelspelare'?15:12,games:0,qualified:0,resolved:false};
  state.recruitment.history.unshift({id:state.recruitment.nextId++,year:state.season.year,tick:state.recruitment.tick,name:p.name,playerId:p.id,seller,buyer:f.buyer,fee:0});state.recruitment.history=state.recruitment.history.slice(0,250);
  for(const d of state.recruitment.deals)if(samePlayerId(d.playerId,p.id)&&d.status==='future_signed'){d.status='signed';d.reason='Spelaren har anslutit enligt förhandsavtalet.';}
  if(f.buyer===managerClub()||seller===managerClub())managerMessage(`future:${state.season.year}:${p.id}`,`${p.name}: förhandsavtalet träder i kraft`,`${seller} → ${f.buyer}. Det avtalade löneåtagandet gäller även om nästa säsongs budget har ändrats.`,'Sportchefen',{link:'transfers'});
 }
}
function calendarFuturePanel(p){
 if(p.futureContract)return `<section class="calendar-future"><h2>Nästa säsong</h2><p>Avtal med ${trainingSafe(p.futureContract.buyer)} från ${seasonLabel(p.futureContract.joinYear)}. Spelaren stannar i sin nuvarande klubb fram till säsongsskiftet.</p></section>`;
 if(p.contractYears!==1||isOwnPlayer(p)||state.season.phase==='preseason')return '';
 const w=recruitPlayerWishes(p);
 return `<details class="calendar-future"><summary>Värva till nästa säsong</summary><p>Ingen övergångssumma. Beräknat ledigt löneutrymme: ${careerMoney(calendarFutureRoom())}/år. Prognosen utgår från dagens lönebudget. Avtalet är bindande även om budgeten senare minskar.</p><form onsubmit="event.preventDefault();submitFutureOffer('${p.id}',this.elements.salary.value,this.elements.years.value,this.elements.role.value)"><label>Årslön<input name="salary" type="number" min="1" step="1" required value="${w.salary}"></label><label>Avtalslängd<select name="years">${recruitOptions({1:'1 år',2:'2 år',3:'3 år',4:'4 år',5:'5 år'},Math.min(2,w.maxYears))}</select></label><label>Spelarens roll<select name="role">${recruitOptions(Object.fromEntries(SQUAD_ROLES.map(r=>[r,r])),w.role)}</select></label><button class="btn">Erbjud avtal inför nästa säsong</button></form></details>`;
}
