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
 if(!c.plans)c.plans={};
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
 for(let i=t.day;i<t.plan.length;i++){const date=calAdd(c.date,i-t.day);if(c.plans[date])t.plan[i]={...c.plans[date]};}
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
 const c=state.calendar,r=state.recruitment;scoutDay();
 for(const d of r.deals.filter(d=>d.status==='pending'&&d.dueDate&&d.dueDate<=c.date))resolveRecruitDeal(d);
 if(c.date>=c.marketDay){
  advanceRecruitment();c.marketDay=calAdd(c.date,7);

 }
 if(c.date===`${state.season.year+1}-02-08`||c.date===`${state.season.year+1}-02-15`)managerMessage(`deadline:${c.date}`,'Transferdeadline närmar sig',`Sista dagen för omedelbara värvningar är 15 februari. Bud tar två kalenderdagar att behandla; en övergång måste vara klar före stängningen. Avtal inför nästa säsong kan fortfarande förhandlas.`,'Sportchefen',{link:'transfers'});
}
function calendarStep(recovered=false){
 const c=state.calendar;if(!c)return;
 if(!recovered){medicalDay();managerRoster().forEach(p=>p.fatigue=Math.max(0,p.fatigue-8));}
 c.date=calAdd(c.date,1);trainingReturnDay();for(const date of Object.keys(c.plans||{}))if(date<calAdd(c.date,-90))delete c.plans[date];loansDay();rivalsDay();aiWorldDay();calendarMarketDay();feedbackDay();
}
function calendarToMatch(){
 ensureCalendar();if(state.calendar.active)return true;
 if(state.calendar.date<calendarTarget())return false;
 return true;
}
function calendarAfterFixture(){
 if(!state.calendar)return;
 // Keep the final whistle, report and team talk on the actual match date.
 state.calendar.completedMatchDate=state.calendar.date;
}
function calendarContinue(){
 if(careerScreen||!state.careerStarted||!managerCanPlay())return;
 ensureCalendar();ensureTrainingData();
 if(state.live&&!state.live.finished){state.page='match';save();render();return;}
 const pending=pendingManagerDecision();if(pending){openManagerMessage(pending.id);return;}
 const c=state.calendar,start=c.date;
 if(c.completedMatchDate===c.date){
  managerRoster().forEach(p=>p.fatigue=Math.max(0,p.fatigue-8));calendarStep(true);delete c.completedMatchDate;state.live=null;
  state.training.calendarKey=null;state.training.day=0;state.training.logs=[];
 }else{
  if(state.season.phase==='review'){state.page='season';save();render();return;}
  if(state.season.phase==='regular'&&enterPlayoffs())return;
  const target=calendarTarget();
  if(c.date>=target){
   const friendly=c.friendlies.find(f=>!f.played&&f.club===managerClub()&&f.date===c.date);
   if(friendly){calendarPlayFriendly(friendly.id);return;}
   if(state.season.phase==='preseason'){state.page='season';save();render();return;}
   if(state.season.phase==='playoffs'&&!currentSeasonFixture()){finishPlayoffDay();state.page='calendar';save();render();return;}
   state.live=null;state.page='match';save();render();return;
  }
  ensureTrainingData();
  if(!runTrainingSession()){
   if(pendingManagerDecision()){openManagerMessage(pendingManagerDecision().id);return;}
   calendarStep();
  }
 }
 state.page='calendar';calendarUI.date=c.date;calendarUI.month=c.date.slice(0,7);
 c.notice=`${calText(start)} är avslutad. Nu planerar du ${calText(c.date)}.`;
 save();render();
}
function calendarWeek(){
 if(state.season.phase!=='preseason')return;
 if(state.live&&!state.live.finished)return calendarNotify('Avsluta träningsmatchen innan kalendern går vidare.');
 calendarContinue();
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
 c.active=null;delete c.stats;calendarAfterFixture();state.training.calendarKey=null;state.training.day=0;state.training.lockedRound=null;
 managerMessage(`friendly:${state.season.year}:${f.id}`,'Träningsmatchen är färdig',`${f.club} ${f.own}–${f.against} ${f.opponent}. Istid, samspel och belastning följer med; resultat och poäng räknas inte i ligan.`,'Tränarteam',{link:'statistics'});
 state.page='match';save();render();
}

function calendarLaunch(){
 ensureCalendar();if(state.calendar.date<`${state.season.year}-09-07`)return false;
 state.training.calendarKey=null;state.training.day=0;return true;
}


// Browsing a month never changes the career clock. Plans are keyed by real career dates.
const calendarUI={month:null,date:null};
function calendarFixtures(){
 return [...state.schedule.filter(g=>g.home===managerClub()||g.away===managerClub()).map(g=>({date:g.date,opponent:g.home===managerClub()?g.away:g.home,venue:g.home===managerClub()?'Hemma':'Borta',played:g.played,result:g.home===managerClub()?`${g.homeGoals}–${g.awayGoals}`:`${g.awayGoals}–${g.homeGoals}`,kind:g.seriesId?SEASON_STAGES[g.stage]:'Liga'})),...state.calendar.friendlies.filter(f=>f.club===managerClub()).map(f=>({date:f.date,opponent:f.opponent,played:f.played,result:`${f.own}–${f.against}`,venue:'Hemma',kind:'Träningsmatch',id:f.id}))];
}
function calendarActionLabel(){
 if(!state.careerStarted)return 'Fortsätt';
 if(state.live&&!state.live.finished)return 'Till pågående match';
 if(pendingManagerDecision())return 'Svara på samtal';
 if(state.calendar?.completedMatchDate===state.calendar?.date)return 'Avsluta matchdagen →';
 if(state.season?.phase==='review')return 'Utvärdera säsongen';
 if(state.calendar?.date>=calendarTarget())return state.season?.phase==='preseason'&&!state.calendar.friendlies.some(f=>!f.played&&f.date===state.calendar.date)?'Till seriepremiären':'Till dagens match';
 return 'Avsluta dagen →';
}
function calendarPick(date){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||calAdd(date,0)!==date)return;
 calendarUI.date=date;calendarUI.month=date.slice(0,7);render();
}
function calendarMonthMove(delta){
 if(![-1,1].includes(delta))return;
 const d=new Date((calendarUI.month||state.calendar.date.slice(0,7))+'-01T12:00:00Z');d.setUTCMonth(d.getUTCMonth()+delta);
 calendarUI.month=d.toISOString().slice(0,7);calendarUI.date=calendarUI.month+'-01';render();
}
function calendarSession(date){
 if(state.calendar.plans[date])return state.calendar.plans[date];
 const t=state.training,index=t.day+calGap(state.calendar.date,date);
 if(index>=t.day&&t.plan[index])return t.plan[index];
 const matches=calendarFixtures();return {type:matches.some(f=>f.date===calAdd(date,1))?'matchprep':matches.some(f=>f.date===calAdd(date,-1))?'recovery':'skills',intensity:'light'};
}
function calendarSetSession(date,key,value){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||calAdd(date,0)!==date||date<state.calendar.date||calGap(state.calendar.date,date)>365||calendarFixtures().some(f=>f.date===date)||date===state.calendar.date&&state.live&&!state.live.finished)return;
 if(key==='type'?!TRAINING_SESSIONS[value]:key!=='intensity'||!['light','normal','hard'].includes(value))return;
 state.calendar.plans[date]={...calendarSession(date),[key]:value};save();render();
}
function calendarAgenda(date){
 const c=state.calendar,today=date===c.date,past=date<c.date,matches=calendarFixtures().filter(f=>f.date===date),log=state.training.history.find(l=>l.date===date),session=calendarSession(date),editable=!past&&!matches.length&&calGap(c.date,date)<=365&&!(today&&state.live&&!state.live.finished);
 const decisions=today?state.training.messages.filter(m=>m.decisionType&&!m.resolved):[],reports=state.training.messages.filter(m=>m.date===date&&!m.decisionType),deals=state.recruitment.deals.filter(d=>d.status==='pending'&&d.dueDate===date);
 return `<aside class="cal-agenda" aria-label="Dagsprogram"><span class="career-eyebrow">${today?'IDAG':past?'TIDIGARE':'PLANERA DAGEN'}</span><h2>${calText(date)}</h2>${matches.map(f=>`<article class="cal-agenda-item match"><span>${f.kind} · ${f.venue}</span><h3>${trainingSafe(f.opponent)}</h3><p>${f.played?`Slutresultat ${f.result} · följ upp insatsen i matchrapporten.`:'Matchdag: kontrollera tillgänglighet, kedjor och matchplan. Inget ordinarie träningspass.'}</p>${matchesFixtureAction(f)}</article>`).join('')}
 ${!matches.length?`<article class="cal-agenda-item"><span>${log?'GENOMFÖRT':past?'TRÄNING':'DAGENS LAGPASS'}</span><h3>${TRAINING_SESSIONS[log?.type||session.type].name}</h3>${editable?`<label>Innehåll<select aria-label="Dagens träningspass" onchange="calendarSetSession('${date}','type',this.value)">${Object.entries(TRAINING_SESSIONS).map(([key,s])=>`<option value="${key}" ${key===session.type?'selected':''}>${s.name}</option>`).join('')}</select></label><label>Belastning<select onchange="calendarSetSession('${date}','intensity',this.value)" ${['recovery','matchprep'].includes(session.type)?'disabled':''}>${[['light','Lätt'],['normal','Normal'],['hard','Hård']].map(([key,label])=>`<option value="${key}" ${(session.type==='recovery'||session.type==='matchprep'?'light':session.intensity)===key?'selected':''}>${label}</option>`).join('')}</select></label><p>${TRAINING_SESSIONS[session.type].description} Passet genomförs när du avslutar denna dag.</p>`:log?`<p>Truppens ork ${Math.round(100-log.before)} → ${Math.round(100-log.after)} %. ${log.trained} tränade, ${log.resting} vilade.</p>`:'<p>Ingen sparad träningsrapport för denna dag.</p>'}</article>`:''}
 ${today&&coachFocus()?`<section class="cal-agenda-item"><h3>Träningsfokus: ${COACH_FOCUSES[coachFocus().key].name}</h3><p>${coachFocus().planned?'Planerat '+calText(coachFocus().planned):'Inget fokuspass planerat ännu.'}</p>${coachFocus().results.length<3?'<button class="btn secondary" onclick="coachPlan()">Planera ett fokuspass</button>':''}</section>`:''}${decisions.map(m=>`<button class="cal-task" onclick="openManagerMessage(${m.id})"><span>SVAR BEHÖVS</span><strong>${trainingSafe(m.title)}</strong><small>Besvara innan dagen går vidare →</small></button>`).join('')}
 ${deals.length?`<p class="cal-agenda-item">${deals.length} transferbesked väntas idag. <button class="mc-text-button" onclick="deskNavigate('transfers','deals')">Öppna förhandlingar →</button></p>`:''}
 ${date===c.marketDay?'<p class="cal-agenda-item">Sportchefens marknadsrapport och nya scoutobservationer väntas idag.</p>':''}
 ${today?`<p class="cal-advice">${trainingSafe(trainingAdvice())}</p><p class="cal-hint">En dag i taget. Rapporterna finns kvar i inkorgen; samtal som kräver svar stoppar tiden.</p>`:''}
 ${reports.length?`<section class="cal-reports"><h3>Dagens rapporter <small>${reports.length}</small></h3>${reports.slice(0,4).map(m=>`<button onclick="openManagerMessage(${m.id})">${trainingSafe(m.title)} <span>${m.read?'Läst':'Oläst'} →</span></button>`).join('')}${reports.length>4?'<button onclick="deskNavigate(\'inbox\')">Visa alla i inkorgen →</button>':''}</section>`:''}</aside>`;
}
function calendarView(){return matchesCalendarView();}
function legacyCalendarView(){
 if(calendarUI.calendar!==state.calendar){calendarUI.calendar=state.calendar;calendarUI.month=null;calendarUI.date=null;}
 const c=state.calendar,month=calendarUI.month||c.date.slice(0,7),selected=calendarUI.date||c.date,first=month+'-01',offset=(new Date(first+'T12:00:00Z').getUTCDay()+6)%7,start=calAdd(first,-offset),fixtures=calendarFixtures(),d=new Date(first+'T12:00:00Z');
 const days=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate(),cells=Math.ceil((offset+days)/7)*7;
 const name=d.toLocaleDateString('sv-SE',{month:'long',year:'numeric',timeZone:'UTC'});
 return `<section class="calendar-page cal-journal"><header class="daily-heading"><div><span class="career-eyebrow">TRÄNARENS KALENDER · ${trainingSafe(managerClub())}</span><h1>En dag. Ett tydligt fokus.</h1><p>Idag ${calText(c.date)} · ${calendarDeadlineText()}</p></div><button class="btn secondary" onclick="deskNavigate('training')">Individuell träning →</button></header>${c.notice?`<p class="cal-notice" role="status">${trainingSafe(c.notice)}</p>`:''}<div class="cal-layout"><section class="cal-month" aria-label="Månadskalender"><header><h2>${name}</h2><nav aria-label="Välj månad"><button aria-label="Föregående månad" onclick="calendarMonthMove(-1)">←</button><button onclick="calendarPick('${c.date}')">Idag</button><button aria-label="Nästa månad" onclick="calendarMonthMove(1)">→</button></nav></header><div class="cal-weekdays" aria-hidden="true">${['Mån','Tis','Ons','Tor','Fre','Lör','Sön'].map(s=>`<span>${s}</span>`).join('')}</div><div class="cal-grid">${Array.from({length:cells},(_,i)=>{const date=calAdd(start,i),f=fixtures.find(f=>f.date===date),log=state.training.history.find(l=>l.date===date),session=calendarSession(date),label=f?`${f.opponent} · ${f.played?f.result:f.kind}`:log?TRAINING_SESSIONS[log.type].name:date>=c.date?TRAINING_SESSIONS[session.type].name:'',markers=state.training.messages.filter(m=>m.date===date&&!m.read).length;return `<button class="cal-day ${date.slice(0,7)!==month?'outside':''} ${f?'fixture':''} ${date===c.date?'today':''} ${date===selected?'selected':''}" aria-pressed="${date===selected}" ${date===c.date?'aria-current="date"':''} aria-label="${trainingSafe(calText(date)+' · '+label+(markers?' · '+markers+' olästa rapporter':''))}" onclick="calendarPick('${date}')"><time datetime="${date}">${Number(date.slice(8))}</time>${f?`<b>${trainingSafe(careerIdentity(f.opponent).code)}</b><small>${f.played?f.result:f.venue}</small>`:`<small>${label}</small>`}${markers?'<span class="cal-dot" aria-hidden="true"></span>':''}</button>`;}).join('')}</div><p class="cal-legend"><span>● Matchdag</span><span>• Olästa rapporter</span><span>Klicka på en dag för dess plan</span></p>${state.season.phase==='preseason'?`<details class="cal-booking"><summary>Boka & hantera träningsmatcher</summary><form class="calendar-booking" onsubmit="event.preventDefault();calendarBookFriendly(this.elements.opponent.value,this.elements.date.value)"><label>Motståndare<select name="opponent">${Object.keys(state.world.membership).filter(n=>n!==managerClub()).map(n=>`<option>${trainingSafe(n)}</option>`).join('')}</select></label><label>Matchdatum<input name="date" type="date" required min="${calAdd(c.date,1)}" max="${state.season.year}-09-09" value="${calAdd(c.date,3)}"></label><button class="btn">Boka match</button></form>${c.friendlies.filter(f=>!f.played&&f.club===managerClub()).map(f=>`<p>${calText(f.date)} · ${trainingSafe(f.opponent)} <button class="btn secondary" onclick="calendarCancelFriendly(${f.id})">Avboka</button></p>`).join('')}</details>`:!c.initialPreseasonUsed&&state.round===1&&!state.teams.some(t=>t.gp)?'<button class="btn secondary" onclick="calendarInitialPreseason()">Börja med försäsong</button>':''}<p class="cal-hint">Speldatum genereras för karriären. Lagpass kan planeras ett år framåt. Individuell vila och fokus ställs in under Träning.</p></section>${calendarAgenda(selected)}</div></section>`;
}
function calendarFutureRoom(club=managerClub()){
 const returning=(state.loans?.active||[]).filter(l=>l.owner===club).map(l=>findPlayerAnywhere(l.playerId)).filter(Boolean);
 const academy=club===managerClub()?(state.juniors?.roster||[]):(clubAIState(club)?.academy.roster||[]);
 const contracted=[...(state.clubRosters[club]||[]).filter(p=>!playerLoan(p)),...returning,...academy.filter(p=>p.academy.seniorContract)];
 const wages=contracted.filter(p=>p.contractYears>1&&!p.futureContract).reduce((n,p)=>n+p.salary,0);
 const committed=Object.values(state.clubRosters).flat().filter(p=>p.futureContract?.buyer===club).reduce((n,p)=>n+p.futureContract.salary,0);
 const pending=state.recruitment.deals.filter(d=>d.status==='pending'&&(d.kind==='future'?d.buyer===club:club===managerClub()&&d.years>1)).reduce((n,d)=>n+d.salary,0);
 return (club===managerClub()?wageBudget():state.recruitment.ai[club]?.wageLimit||0)-wages-committed-pending-aiFutureReserved(club);
}
function submitFutureOffer(id,salary,years,role){
 if(!managerCanPlay())return;
 const p=findPlayerAnywhere(id),seller=getPlayerClub(id),r=state.recruitment;
 if(state.live&&!state.live.finished)return recruitMessage('Avsluta matchen innan du förhandlar nästa avtal.');
 if(!p||playerLoan(p)||isOwnPlayer(p)||p.contractYears!==1||p.futureContract||state.season.phase==='preseason')return recruitMessage('Förhandsavtal gäller spelare i andra klubbar med ett kontraktsår kvar, under pågående säsong.');
 salary=Math.round(Number(salary));years=Number(years);
 if(!Number.isFinite(salary)||salary<=0||!Number.isInteger(years)||years<1||years>5||!SQUAD_ROLES.includes(role))return recruitMessage('Ange giltig lön, roll och avtalslängd.');
 if(r.deals.some(d=>samePlayerId(d.playerId,id)&&['pending','future_signed'].includes(d.status)))return recruitMessage('Ett erbjudande eller framtida avtal finns redan.');
 if(salary>calendarFutureRoom())return recruitMessage('Nästa säsongs beräknade löneutrymme räcker inte.');
 r.deals.unshift({id:r.nextId++,kind:'future',playerId:p.id,name:p.name,buyer:managerClub(),seller,fee:0,salary,years,role,due:r.tick+1,dueDate:calAdd(state.calendar.date,2),joinYear:state.season.year+1,status:'pending',rival:aiCompetitionFor(p,seller,'future')});
 r.tab='deals';state.page='transfers';recruitMessage('Erbjudandet gäller från nästa säsong. Spelaren stannar i nuvarande klubb tills dess. Besked om två kalenderdagar.');
}
function calendarResolveFuture(d){
 const p=findPlayerAnywhere(d.playerId),w=p?recruitPlayerWishes(p,d.buyer):null;
 if(p)d.rival=aiCompetitionFor(p,d.seller,'future')||(d.rival?.aiOfferId?null:d.rival);
 let reason=!p||playerLoan(p)||getPlayerClub(d.playerId)!==d.seller||p.contractYears!==1?'Spelarens kontraktsläge har ändrats.':p.futureContract?'Spelaren har redan valt en klubb.':!w||d.salary<w.salary||SQUAD_ROLES.indexOf(d.role)<SQUAD_ROLES.indexOf(w.role)||d.years<w.minYears||d.years>w.maxYears?'Lön, roll eller avtalslängd motsvarar inte spelarens krav.':calendarFutureRoom(d.buyer)+d.salary<d.salary?'Löneutrymmet för nästa säsong räcker inte längre.':'';
 if(reason){d.status='rejected';d.reason=reason;recruitReport(`Besked om ${d.name}`,reason);return;}
 let buyer=d.buyer,terms=d;
 if(d.rival&&aiCanCommit(d.rival.club,p,0,d.rival.salary,{future:true,years:d.rival.years})&&recruitOfferScore(p,d.rival.club,d.rival)>recruitOfferScore(p,d.buyer,d)+1){buyer=d.rival.club;terms=d.rival;d.status='rejected';d.reason=`Spelaren väljer ${buyer} nästa säsong.`;}
 else {d.status='future_signed';d.reason=`Klart för ${d.joinYear}/${String(d.joinYear+1).slice(-2)}. Spelaren ansluter vid säsongsskiftet.`;}
 p.futureContract={buyer,seller:d.seller,joinYear:d.joinYear,salary:terms.salary,years:terms.years,role:terms.role};
 aiMarkMarketPlayer(p.id,buyer);
 recruitReport(`Framtidsbesked: ${p.name}`,d.reason);
}
function calendarActivateFuture(){
 if(!state.calendar)return;
 for(const p of [...Object.values(state.clubRosters).flat(),...(state.playerWorld?.freeAgents||[])]){
  const f=p.futureContract;if(!f||f.joinYear>state.season.year)continue;
  if(!state.clubRosters[f.buyer])continue;
  const feedbackPlan=feedbackBeforeArrival(p,f.buyer);
  const seller=getPlayerClub(p.id);if(seller===WORLD_FREE)worldRemoveFree(p.id);else state.clubRosters[seller]=state.clubRosters[seller].filter(q=>!samePlayerId(q.id,p.id));
  state.clubRosters[f.buyer].push(p);Object.assign(p,{club:f.buyer,salary:f.salary,contractYears:f.years,squadRole:f.role,promisedRole:f.role,transferListed:false});delete p.futureContract;
  if(f.buyer===managerClub())p.recruitmentPromise={role:f.role,minutes:p.pos==='MV'?30:f.role==='Nyckelspelare'?15:12,games:0,qualified:0,resolved:false};
  state.recruitment.history.unshift({id:state.recruitment.nextId++,year:state.season.year,tick:state.recruitment.tick,name:p.name,playerId:p.id,seller,buyer:f.buyer,fee:0});state.recruitment.history=state.recruitment.history.slice(0,250);
  feedbackArrival(p,feedbackPlan,'future');feedbackNews('future-arrival:'+state.season.year+':'+p.id,f.buyer,'transfer',p.name+' ansluter till '+f.buyer,'Förhandsavtalet träder i kraft. Spelaren kommer från '+seller+'.');
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
