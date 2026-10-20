'use strict';
// One presentation over the existing career. The calendar and domain actions
// remain the only writers of time, player progress, decisions and results.
const coachWorkspaceUI={owner:null,club:null,today:null,date:null,filter:'now',followup:false};
const COACH_WORKSPACES=[
 {id:'today',label:'Idag',page:'home',pages:[['home','Tränaröversikt'],['calendar','Kalender'],['season','Säsongsplan']]},
 {id:'team',label:'Truppen',page:'squad',pages:[['squad','Spelare & avtal'],['locker','Samtal & relationer'],['training','Träning'],['juniors','Akademin'],['medical','Medicinskt']]},
 {id:'tactics',label:'Taktik',page:'lines',pages:[['lines','Kedjor & matchplan'],['statistics','Matchanalys'],['opponents','Motstånd']]},
 {id:'recruit',label:'Rekrytering',page:'transfers',pages:[['transfers','Marknad & scouting']]},
 {id:'club',label:'Klubben',page:'board',pages:[['board','Styrelsen'],['finance','Ekonomi'],['staff','Staben'],['staffReview','Stabens uppföljning'],['manager','Din karriär']]},
 {id:'world',label:'Världen',page:'world',pages:[['world','Nyheter'],['leagues','Ligor'],['international','Landslag'],['nhl','Nordamerika']]}
];
function coachWorkspaceEnabled(){return typeof window!=='undefined'&&state.careerStarted&&managerEmployed()&&!careerScreen&&state.page!=='clubSelect'&&clubhousePreference('mode','coach')==='coach';}
function coachWorkspaceSync(){
 const u=coachWorkspaceUI;
 if(u.owner!==state||u.club!==managerClub()||u.today!==state.calendar.date){Object.assign(u,{owner:state,club:managerClub(),today:state.calendar.date,date:state.calendar.date,filter:'now',followup:false});}
}
function coachWorkspaceEnter(){
 if(!clubhouseAvailable())return false;
 clubhouseRemember('mode','coach');clubhouseUI.work=false;clubhouseUI.areas=false;clubhouseUI.player=null;
 overviewUI.stories=false;overviewUI.press=false;deskNavigate('home');return true;
}
function coachHome(){if(typeof coachRoomHome==='function')coachRoomHome();overviewUI.stories=false;overviewUI.press=false;deskNavigate('home');}
function coachSelectDay(date){
 if(!coachWorkspaceEnabled()||!managerWeekDays().some(d=>d.date===date))return false;
 coachWorkspaceSync();coachWorkspaceUI.date=date;render();return true;
}
function coachAgendaFilter(filter){if(!['now','later','all'].includes(filter)||!coachWorkspaceEnabled())return false;coachWorkspaceSync();coachWorkspaceUI.filter=filter;render();return true;}
function coachFollowup(){if(!coachWorkspaceEnabled())return false;coachWorkspaceSync();coachWorkspaceUI.followup=!coachWorkspaceUI.followup;render();return true;}
function coachAgendaGroups(){
 const groups=new Map(),today=state.calendar.date;
 for(const item of managerAgendaItems(true)){
  // These reports have dedicated context in the match and week panels.
  if(item.id.startsWith('match:'))continue;
  const action=item.action||{},future=item.deferred||action.conversationPlayer!==undefined&&item.due>today;
  // Only identical entity actions are grouped. Different promises, deadlines
  // and all individual source rows remain available inside their group.
  const key=action.messageId!==undefined?'message:'+action.messageId:action.deal?'deal:'+action.deal:item.id;
  if(!groups.has(key))groups.set(key,{key,items:[],future:Boolean(future)});
  const group=groups.get(key);group.items.push(item);group.future=group.future&&Boolean(future);
 }
 return [...groups.values()];
}
function coachBlocker(){
 const pending=pendingManagerDecision();
 if(pending)return {kind:'message',title:pending.title,detail:'Ditt svar behövs innan nästa dagssteg.',label:'Besvara ärendet',id:pending.id};
 if(preseasonPlan()?.pending)return {kind:'season',title:'Sätt riktningen för säsongen',detail:'Välj mål, roller och ansvar innan du börjar arbeta med laget.',label:'Välj säsongsplan'};
 if(state.season.phase==='review')return {kind:'season',title:'Summera säsongen',detail:'Granska styrelsens bedömning och planera nästa säsong.',label:'Öppna säsongsrapporten'};
 return null;
}
function coachContinueLabel(){
 const blocker=coachBlocker();if(blocker)return blocker.label;
 if(state.live&&!state.live.finished)return 'Fortsätt matchen';
 if(state.calendar.completedMatchDate===state.calendar.date)return 'Avsluta matchdagen';
 return calendarFixtures().some(g=>g.date===state.calendar.date&&!g.played)?'Till dagens match':'Avsluta dagen';
}
function coachContinue(){
 if(!coachWorkspaceEnabled()||dayTransition||calendarPaceRun)return false;
 const blocker=coachBlocker();
 if(blocker){if(blocker.kind==='message')openManagerMessage(blocker.id);else deskNavigate('season');return false;}
 if(state.live&&!state.live.finished){deskNavigate('match');return true;}
 const fixture=calendarFixtures().find(g=>g.date===state.calendar.date&&!g.played);
 if(fixture&&state.calendar.completedMatchDate!==state.calendar.date){
  // Uses the same friendly delegation, medical checks and engine as before.
  if(fixture.kind==='Träningsmatch')calendarPlayFriendly(fixture.id);
  else{createMatch();if(state.live)deskNavigate('match');}
  return Boolean(state.live);
 }
 coachHome();return dayTransitionStart();
}
function coachAgendaAction(item){
 const id=item.action?.conversationPlayer??item.action?.promisePlayer;if(id!==undefined)return `playerCaseOpen(${JSON.stringify(String(id))})`;
 if(item.id.startsWith('relationship:')){const c=state.relationships?.cases.find(c=>'relationship:'+c.id===item.id);if(c)return `playerCaseOpen(${JSON.stringify(c.playerId)})`;}
 return managerOffice2Action(item);
}
function coachAgendaRow(item){
 const action=coachAgendaAction(item),safe=trainingSafe;
 return `<article class="coach-agenda-row" data-agenda-id="${safe(item.id)}"><div><span class="coach-meta">${safe(item.tag||'Att följa')} · ${safe(item.owner||'Du')}${item.due?' · '+safe(calText(item.due)):''}${item.deferred?' · uppskjutet till '+safe(calText(item.snoozedUntil)):''}</span><h3>${safe(item.title)}</h3><p>${safe(item.detail||'')}</p></div>${action?`<button type="button" class="coach-link" onclick="${safe(action)}">Granska →</button>`:''}${!item.requiresDecision&&item.level!=='critical'&&(!item.due||item.due>calAdd(state.calendar.date,7))&&!item.deferred?`<button type="button" class="coach-link coach-snooze" onclick="managerAgendaSnooze(${safe(JSON.stringify(item.id))},7)">Påminn om 7 dagar</button>`:''}</article>`;
}
function coachAgendaView(){
 const u=coachWorkspaceUI,groups=coachAgendaGroups(),now=groups.filter(g=>!g.future).length,later=groups.length-now;
 const visible=groups.filter(g=>u.filter==='all'||(u.filter==='later'?g.future:!g.future));
 return `<section class="coach-card coach-agenda" aria-label="Aktuella ärenden"><header class="coach-section-heading"><div><span class="coach-meta">DINA BESLUT</span><h2>Att ta ställning till</h2></div><span class="coach-count">${now}</span></header><nav class="coach-filters" aria-label="Filtrera ärenden">${[['now','Aktuellt',now],['later','Senare',later],['all','Alla',groups.length]].map(([key,label,n])=>`<button type="button" aria-pressed="${u.filter===key}" onclick="coachAgendaFilter('${key}')">${label} <span>${n}</span></button>`).join('')}</nav>${visible.map(g=>g.items.length===1?coachAgendaRow(g.items[0]):`<details class="coach-agenda-group"><summary>${trainingSafe(g.items[0].title)} · ${g.items.length} underlag</summary>${g.items.map(coachAgendaRow).join('')}</details>`).join('')||`<div class="coach-empty"><strong>${u.filter==='later'?'Inget uppskjutet just nu.':'Du har utrymme att arbeta med laget.'}</strong><p>${u.filter==='later'?'Framtida samtal och uppskjutna ärenden visas här.':'Planera träningen, träffa spelarna eller förbered nästa match.'}</p></div>`}</section>`;
}
function coachDayDetail(day){
 const date=day.date,today=date===state.calendar.date,log=state.training.history.find(h=>h.date===date),session=calendarSession(date),definition=TRAINING_SESSIONS[log?.type||session.type],safe=trainingSafe;
 if(day.games.length)return `<div class="coach-day-program"><span class="coach-meta">${safe(calText(date))} · MATCHDAG</span>${day.games.map(g=>`<h3>${safe(g.opponent)}</h3><p>${safe(g.kind)} · ${safe(g.venue)} · ${g.played?'Spelad '+safe(g.result):'Ingen ordinarie lagträning. Förbered kedjor, målvakt och matchplan.'}</p>${matchesFixtureAction(g)}`).join('')}<button type="button" class="coach-link" onclick="deskNavigate('lines')">Arbeta med matchplanen →</button></div>`;
 const editable=!log&&date>=state.calendar.date&&!(today&&state.live&&!state.live.finished);
 return `<div class="coach-day-program"><span class="coach-meta">${safe(calText(date))} · ${log?'GENOMFÖRT':today?'DAGENS LAGPASS':'PLANERAT LAGPASS'}</span><h3>${safe(definition.name)}</h3><p>${safe(definition.description)}</p>${editable?`<div class="coach-plan-controls"><label>Innehåll<select aria-label="Dagens träningspass" onchange="calendarSetSession('${date}','type',this.value)">${Object.entries(TRAINING_SESSIONS).map(([key,d])=>`<option value="${key}" ${key===session.type?'selected':''}>${safe(d.name)}</option>`).join('')}</select></label><label>Belastning<select aria-label="Träningspassets belastning" onchange="calendarSetSession('${date}','intensity',this.value)" ${['recovery','matchprep'].includes(session.type)?'disabled':''}>${[['light','Lätt'],['normal','Normal'],['hard','Hård']].map(([key,label])=>`<option value="${key}" ${(session.type==='recovery'||session.type==='matchprep'?'light':session.intensity)===key?'selected':''}>${label}</option>`).join('')}</select></label></div><p class="coach-plan-note">Passet genomförs när du avslutar ${today?'dagen':'den här dagen'}. Individuell vila och stabsansvar gäller fortfarande.</p>${today?`<details class="coach-training-evidence"><summary>Jämför belastning och träningsnytta</summary>${trainingCalendarDecision(date,session)}</details>`:''}`:log?`<p>${log.trained} tränade · ${log.resting} vilade · genomsnittligt slitage ${log.before.toFixed(1)} → ${log.after.toFixed(1)}.</p>${trainingDecisionReport(log)}`:'<p>Ingen sparad träningsrapport för dagen.</p>'}<button type="button" class="coach-link" onclick="deskNavigate('training')">Individuell träning & ansvar →</button></div>`;
}
function coachDayPlanView(){
 const u=coachWorkspaceUI,days=managerWeekDays(),selected=days.find(d=>d.date===u.date)||days[0];
 return `<section class="coach-card coach-week" aria-label="Din tränarvecka"><header class="coach-section-heading"><div><span class="coach-meta">PLANERA → GENOMFÖR → FÖLJ UPP</span><h2>Din tränarvecka</h2></div><button type="button" class="coach-link" onclick="officeOpenDay('${selected.date}')">Hela kalendern ↗</button></header><nav class="coach-days" aria-label="Välj dag i veckan">${days.map((d,i)=>`<button type="button" data-date="${d.date}" data-kind="${d.games.length?'match':'training'}" aria-pressed="${d.date===selected.date}" ${i===0?'aria-current="date"':''} onclick="coachSelectDay('${d.date}')"><time datetime="${d.date}">${i===0?'Idag':new Date(d.date+'T12:00:00Z').toLocaleDateString('sv-SE',{weekday:'short',day:'numeric',timeZone:'UTC'})}</time><strong>${trainingSafe(d.games.length?d.games.map(g=>g.opponent).join(' / '):TRAINING_SESSIONS[d.type]?.name||'Planering')}</strong><span>${d.games.length?d.games.every(g=>g.played)?'Spelad':'Match':d.done?'Genomfört':'Planerat'}</span></button>`).join('')}</nav><div class="coach-day-detail" data-selected-date="${selected.date}">${coachDayDetail(selected)}</div></section>`;
}
function coachFocusView(){
 const f=coachFocus(),suggestion=managerWeekRecommendation(),safe=trainingSafe;
 if(f)return `<span class="coach-meta">ETT ARBETE ÖVER TID</span><h2>${safe(COACH_FOCUSES[f.key].name)}</h2><p>${f.sessions.length} relevanta pass genomförda · ${f.results.length}/${f.target||3} matcher följda.</p><div class="coach-progress" role="progressbar" aria-label="Matcher följda" aria-valuemin="0" aria-valuemax="${Math.max(f.target||3,f.results.length)}" aria-valuenow="${f.results.length}"><i style="width:${Math.min(100,100*f.results.length/(f.target||3))}%"></i></div><button type="button" class="coach-link" onclick="coachFollowup()">${coachWorkspaceUI.followup?'Stäng uppföljningen':'Granska arbete & utfall'} →</button>${coachWorkspaceUI.followup?managerWeekFollowupView():''}<button type="button" class="coach-link" onclick="coachPlan()">Planera nästa fokuspass →</button>`;
 if(!suggestion)return '<span class="coach-meta">ETT ARBETE ÖVER TID</span><h2>Lär känna laget</h2><p>Matchanalysen bygger på faktiskt spelade matcher. Börja med roller, träning och samtal; välj ett gemensamt fokus när du har underlag.</p><button type="button" class="coach-link" onclick="deskNavigate(\'locker\')">Träffa laget →</button>';
 return `<span class="coach-meta">STABENS FÖRSLAG · ${suggestion.count} MATCHER</span><h2>${safe(COACH_FOCUSES[suggestion.key].name)}</h2><p>${safe(suggestion.detail)}</p><button type="button" class="coach-link" onclick="${safe(`managerWeekAdopt(${JSON.stringify(suggestion.key)},${JSON.stringify(suggestion.evidenceId)})`)}">Välj och följ detta fokus →</button>`;
}
function coachHomeView(){
 if(typeof coachConnectedHomeView==='function')return coachConnectedHomeView();
 coachWorkspaceSync();const safe=trainingSafe;
 if(overviewUI.stories||overviewUI.press)return `<button type="button" class="coach-link" onclick="coachHome()">← Till tränaröversikten</button>${overviewUI.stories?storiesView():pressView()}`;
 const blocker=coachBlocker(),next=deskNextMatch(deskFixtures().upcoming[0]),roster=managerRoster(),ready=roster.filter(medicalReady).length,tired=roster.filter(p=>medicalReady(p)&&p.fatigue>=35).length;
 const post=state.calendar.completedMatchDate===state.calendar.date,live=state.live&&!state.live.finished,waiting=officeWaiting();
 const report=(state.analysis?.matches||[]).find(m=>m.finished&&m.club===managerClub()&&!m.partial&&!m.abandoned);
 const hero=blocker||{title:post?'Ta med dig lärdomarna.':live?'Laget väntar vid isen.':'Ge laget en riktning.',detail:post?'Granska matchen och följ upp dina beslut innan du avslutar matchdagen.':live?next.detail:'Välj vad ni ska arbeta med idag. Tiden går vidare när du avslutar dagen.'};
 return `<div class="coach-home"><section class="coach-hero"><div><span class="coach-meta">TRÄNARKONTORET · ${safe(calText(state.calendar.date))}</span><h1>${safe(hero.title)}</h1><p>${safe(hero.detail)}</p><div class="coach-hero-actions"><button type="button" class="btn" onclick="coachContinue()">${safe(coachContinueLabel())} →</button><button type="button" class="coach-link" onclick="clubhouseGo('office')">Besök klubbhuset ↗</button></div></div><div class="coach-rink-mark" aria-hidden="true"><i></i><b></b><em>VECKANS ARBETE<br>FORMAR NÄSTA MATCH</em></div></section>${daySummaryView()}<div class="coach-home-grid"><div class="coach-main-column">${coachDayPlanView()}${coachAgendaView()}</div><aside class="coach-side-column" aria-label="Laget och uppföljningen"><section class="coach-card coach-next"><span class="coach-meta">${safe(next.eyebrow)}</span><h2>${safe(next.title)}</h2>${next.score?`<strong class="coach-score">${safe(next.score)}</strong>`:''}<p>${safe(next.detail)}</p><div class="coach-readiness"><span><b>${ready}/${roster.length}</b> matchklara</span><span><b>${tired}</b> högt belastade</span></div><div class="coach-shortcuts"><button type="button" class="coach-link" onclick="deskNavigate('lines')">Taktiktavlan →</button><button type="button" class="coach-link" onclick="clubhouseGo('locker')">Omklädningsrummet ↗</button></div></section><section class="coach-card coach-focus">${coachFocusView()}</section>${report?`<section class="coach-card"><span class="coach-meta">SENASTE MATCHENS UNDERLAG</span><h2>${safe(report.opponent)}</h2><p>${safe(calText(report.date))}${report.friendly?' · Träningsmatch':''}</p><button type="button" class="coach-link" onclick="${safe(`matchesOpenReport(${JSON.stringify(report.id)})`)}">Granska matchrapporten →</button></section>`:''}${waiting?`<section class="coach-card coach-waiting"><span class="coach-meta">PÅGÅENDE ARBETE</span><h2>${safe(waiting.label)}</h2><p><strong>${safe(waiting.value)}</strong></p><p>${safe(waiting.detail)}</p>${waiting.action?`<button type="button" class="coach-link" onclick="${safe(deskAction(waiting.action))}">${safe(waiting.button||'Öppna')} →</button>`:''}</section>`:''}<section class="coach-card coach-archive"><span class="coach-meta">KLUBBENS MINNE</span><button type="button" class="coach-link" onclick="deskNavigate('stories')">Spelarhistorier →</button><button type="button" class="coach-link" onclick="deskNavigate('press')">Press & supportrar →</button><button type="button" class="coach-link" onclick="deskNavigate('staffReview')">Stabens uppföljning →</button></section></aside></div></div>`;
}
function coachRecruitNavigation(){
 const tab=state.page==='marketPlayer'?'search':state.recruitment.tab,active=['loans','history'].includes(tab)?'deals':['world','free','missions','shortlist'].includes(tab)?'search':tab;
 return `<nav class="coach-secondary" aria-label="Rekrytering">${DESK_RECRUIT_TABS.map(([id,label])=>`<button type="button" ${active===id?'aria-current="page"':''} onclick="deskNavigate('transfers','${id}')">${label}</button>`).join('')}</nav>`;
}
function coachWorkspaceWrap(html){
 if(state.page==='match')return `<div class="desk-page" data-area="overview" data-page="match">${html}</div>`;
 const group=COACH_WORKSPACES.find(a=>a.pages.some(([p])=>p===state.page))||(['player','marketPlayer','specialTeams','tactics'].includes(state.page)?COACH_WORKSPACES[state.page==='player'?1:state.page==='marketPlayer'?3:2]:['news','table','leagueStats','clubDetail'].includes(state.page)?COACH_WORKSPACES[5]:null);
 const unread=(state.training?.messages||[]).filter(m=>!m.read&&!m.dismissed).length,safe=trainingSafe,groups=typeof coachReportGroups==='function'?coachReportGroups():[],required=groups.reduce((n,g)=>n+g.required,0),inboxLabel=required?required+' svar':groups.filter(g=>g.unread).length+' ämnen';
 return `<section id="coach-workspace" data-workspace="${group?.id||state.page}"><header class="coach-header"><button type="button" class="coach-brand" onclick="coachHome()" aria-label="Till tränaröversikten"><span class="coach-monogram">HM</span><span><strong>${safe(managerClub())}</strong><small>HOCKEY MANAGER · ${seasonLabel()}</small></span></button><div class="coach-header-actions"><time datetime="${state.calendar.date}">${safe(calText(state.calendar.date))}</time>${playerSearchView()}<button type="button" class="coach-inbox" onclick="coachOfficeOpen('reports')" title="${unread} olästa rapporter, samlade efter ämne">Inkorg${unread?` <b>${safe(inboxLabel)}</b>`:''}</button><button type="button" class="coach-link coach-settings" aria-label="Sparfiler och inställningar" onclick="deskNavigate('settings')">${deskIcon('settings')}</button><button type="button" id="coach-continue" class="btn coach-continue" onclick="coachContinue()">${safe(coachContinueLabel())} →</button></div></header><nav class="coach-primary" aria-label="Spelets arbetsytor">${COACH_WORKSPACES.map(a=>`<button type="button" ${a===group?'aria-current="page"':''} onclick="${a.id==='today'?'coachHome()':`deskNavigate('${a.page}')`}">${a.label}</button>`).join('')}</nav>${group?.id==='recruit'?coachRecruitNavigation():group&&state.page!=='home'?`<nav class="coach-secondary" aria-label="${group.label}">${group.pages.map(([p,label])=>`<button type="button" ${state.page===p?'aria-current="page"':''} onclick="deskNavigate('${p}')">${label}</button>`).join('')}</nav>`:''}<div class="coach-page" data-page="${safe(state.page)}">${state.page==='home'?html:`<div class="desk-page" data-area="${deskArea()?.id||'other'}" data-page="${safe(state.page)}">${html}</div>`}</div></section>`;
}
// Upgrade the default once. Subsequent explicit room/classic selections persist.
if(typeof window!=='undefined'&&clubhousePreference('coach-workspace-version','')!=='1'){
 clubhouseRemember('mode','coach');clubhouseRemember('coach-workspace-version','1');
}
