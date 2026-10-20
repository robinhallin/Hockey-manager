'use strict';
// One career shell, physical rooms, and one contextual work panel. Domain
// workspaces remain full-sized and return here without changing presentation.
const coachRoomUI={owner:null,club:null,date:null,room:'office',section:null,player:null,table:false,selected:null};
const COACH_ROOM_SECTIONS={today:'Dagens läge',week:'Din tränarvecka',agenda:'Aktuella ärenden',preseason:'Försäsongens testplan',project:'Ditt klubbbygge',reports:'Samlade rapporter',player:'Samlat spelarärende',coach:'Din tränare'};
function coachRoomSync(){
 if(coachRoomUI.owner!==state||coachRoomUI.club!==managerClub()||coachRoomUI.date!==state.calendar.date){Object.assign(coachRoomUI,{owner:state,club:managerClub(),date:state.calendar.date,room:coachRoomUI.owner===state&&coachRoomUI.club===managerClub()?coachRoomUI.room:'office',section:null,player:null,table:false,selected:null});}
 coachWorkspaceSync();
}
function coachRoomEnabled(){if(!coachWorkspaceEnabled())return false;coachRoomSync();return state.page==='locker'&&!coachRoomUI.table;}
function coachRoomOpen(room){
 if(!coachWorkspaceEnabled()||!Object.hasOwn(CLUBHOUSE_ROOMS,room))return false;
 coachRoomSync();Object.assign(coachRoomUI,{room,section:null,player:null,table:false,selected:null});clubhouseUI.room=room;clubhouseUI.player=null;
 overviewUI.stories=false;overviewUI.press=false;deskNavigate(room==='locker'?'locker':'home');return true;
}
function coachOfficeOpen(section){
 if(!coachWorkspaceEnabled()||!Object.hasOwn(COACH_ROOM_SECTIONS,section)||section==='player'&&!playerCaseModel(coachRoomUI.player))return false;
 coachRoomSync();coachRoomUI.section=section;overviewUI.stories=false;overviewUI.press=false;if(!['home','locker'].includes(state.page)){coachRoomUI.room='office';deskNavigate('home');}else render();document.getElementById('coach-office-panel-title')?.focus?.({preventScroll:true});return true;
}
function coachOfficeClose(){coachRoomUI.section=null;render();document.getElementById('coach-office-work')?.focus?.({preventScroll:true});}
function coachRoomSelect(id){if(!coachWorkspaceEnabled()||!playerCaseModel(id))return false;return playerCaseOpen(id);}
function coachRoomTable(){if(!coachWorkspaceEnabled())return false;coachRoomSync();coachRoomUI.table=true;deskNavigate('locker');return true;}
function coachRoomHome(){if(typeof coachRoomUI!=='undefined'){coachRoomSync();Object.assign(coachRoomUI,{room:'office',section:null,table:false,player:null});clubhouseUI.room='office';}}
function coachReportGroups(){
 const groups=new Map();
 for(const m of state.training?.messages||[]){
  if(m.dismissed)continue;const category=m.category||'Klubben';
  if(!groups.has(category))groups.set(category,{category,rows:[],unread:0,required:0});
  const g=groups.get(category);g.rows.push(m);if(!m.read)g.unread++;if(m.decisionType&&!m.resolved)g.required++;
 }
 return [...groups.values()].sort((a,b)=>b.required-a.required||b.unread-a.unread||a.category.localeCompare(b.category,'sv'));
}
function coachReportRead(category){
 if(!coachWorkspaceEnabled())return false;const g=coachReportGroups().find(g=>g.category===category);if(!g)return false;
 // An acknowledgment never answers a decision, archives an obligation or
 // affects another category. The complete message journal is retained.
 for(const m of g.rows)if(!m.decisionType&&managerMessagePriority(m)==='information')m.read=true;
 save();render();return true;
}
function coachReportsView(){
 return `<section class="coach-reports"><h2>Det som har förändrats</h2><p>Obligatoriska svar ligger först. Rutinrapporter samlas efter ämne; alla besked finns kvar i inkorgen.</p>${coachReportGroups().map(g=>`<details class="report-group" ${g.required?'open':''}><summary>${trainingSafe(g.category)} · ${g.required?g.required+' svar behövs · ':''}${g.unread} olästa / ${g.rows.length} rapporter</summary>${g.rows.slice(0,20).map(m=>`<article><small>${trainingSafe(m.date?calText(m.date):'Rapport')} · ${m.decisionType&&!m.resolved?'Ditt svar behövs':managerMessagePriority(m)==='information'?'Information':'Underlag att bedöma'}</small><button class="coach-link" onclick="openManagerMessage(${trainingSafe(JSON.stringify(m.id))})">${trainingSafe(m.title)} →</button></article>`).join('')}${g.rows.some(m=>!m.read&&!m.decisionType&&managerMessagePriority(m)==='information')?`<button class="btn secondary" onclick="coachReportRead(${trainingSafe(JSON.stringify(g.category))})">Markera gruppens rutininfo som läst</button>`:''}${g.rows.length>20?'<p>Äldre rapporter finns kvar i inkorgen.</p>':''}</details>`).join('')}<button class="coach-link" onclick="deskNavigate('inbox')">Öppna hela inkorgen →</button></section>`;
}
function coachPaceStart(review=false){
 if(!coachWorkspaceEnabled()||dayTransition||calendarPaceRun)return false;
 const blocker=coachBlocker();if(blocker){coachContinue();return false;}
 if(state.live&&!state.live.finished||state.calendar.completedMatchDate===state.calendar.date||calendarFixtures().some(g=>g.date===state.calendar.date&&!g.played)){coachContinue();return false;}
 const started=calendarPaceStart(review===true);if(!started)render();return started;
}
function coachPaceView(){
 const last=calendarPaceSettings().last,valid=last?.club===managerClub()&&last.end===state.calendar.date;
 return `<section class="coach-room-pace"><button type="button" class="btn" id="coach-next-choice" onclick="coachPaceStart()" ${dayTransition||calendarPaceRun?'disabled':''}>Till nästa vägval →</button><button class="coach-link" onclick="coachContinue()">${trainingSafe(coachContinueLabel())} · en dag i taget</button>${valid?`<p role="status"><strong>${trainingSafe(last.stop.title)}</strong><br>${last.days} dagar · ${last.total} nya rapporter</p><button class="coach-link" onclick="calendarPaceOpen()">Öppna vägvalet →</button>${!last.stop.urgent&&!['pause','error'].includes(last.stop.kind)?'<button class="coach-link" onclick="coachPaceStart(true)">Granskat – fortsätt vidare →</button>':''}`:''}</section>`;
}
function coachPriority(){
 const blocker=coachBlocker();if(blocker)return {title:blocker.title,detail:blocker.detail,action:'coachContinue()',label:blocker.label};
 const m=state.live;if(m&&!m.finished)return {title:'Laget väntar vid isen',detail:deskNextMatch().detail,action:"deskNavigate('match')",label:'Till matchen'};
 const report=(state.analysis?.matches||[]).find(m=>m.finished&&!m.partial&&!m.abandoned&&m.club===managerClub());
 if(state.calendar.completedMatchDate===state.calendar.date&&report)return {title:`${report.own}–${report.against} mot ${report.opponent}`,detail:'Matchen är spelad. Granska användning och dina beslut innan du avslutar matchdagen.',action:"coachOfficeOpen('today')",label:'Följ upp matchen'};
 const fixture=deskFixtures().upcoming[0];
 if(fixture?.date===state.calendar.date)return {title:'Matchdag mot '+fixture.opponent,detail:'Kontrollera kedjor, målvakt och matchplan. Matchen startar på dagens datum.',action:"deskNavigate('lines')",label:'Förbered matchlaget'};
 const top=coachAgendaGroups().filter(g=>!g.future).flatMap(g=>g.items).find(i=>i.id!=='contracts:expiring'&&(i.requiresDecision||i.level==='critical'||['locker','medical'].includes(i.area)));
 if(top)return {title:top.title,detail:top.detail,action:coachAgendaAction(top),label:'Granska situationen'};
 const story=(state.stories?.active||[]).find(s=>s.club===managerClub()&&s.status==='decision');if(story)return {title:story.title,detail:story.chapters.at(-1)?.text||'Ett tidigare händelseförlopp har skapat ett vägval.',action:story.ids.length&&playerCaseModel(story.ids[0])?`playerCaseOpen(${JSON.stringify(story.ids[0])})`:"deskNavigate('stories')",label:'Ta ställning till situationen'};
 const preseason=preseasonPlan();if(state.season.phase==='preseason'&&preseason){
  const left=state.calendar.friendlies.filter(f=>f.club===managerClub()&&!f.played).length,tests=preseasonTrials().filter(t=>t.status==='active').length;
  return {title:left?`${left} träningsmatcher att lära känna laget`: 'Välj vad du tar med till premiären',detail:tests?`${tests} försäsongstester pågår. Granska faktisk användning och bestäm vad du vill prova härnäst.`:'Välj en spelare, ett backpar eller två målvakter att följa genom försäsongen.',action:"coachOfficeOpen('preseason')",label:tests?'Följ försäsongstesterna':'Planera ett riktigt test'};
 }
 const learned=coachAgendaGroups().flatMap(g=>g.items).find(i=>i.id.startsWith('learning:')||i.id.startsWith('formation:'));
 if(learned)return {title:learned.title,detail:learned.detail,action:managerOffice2Action(learned),label:'Granska matchunderlaget'};
 const vision=clubVision();return {title:vision?.status==='active'?vision.name:'Vilket lag vill du bygga?',detail:vision?CLUB_VISIONS[vision.kind].pitch:'Välj riktning, bedöm spelarnas roller och håll ihop ditt lagbygge över flera säsonger.',action:"coachOfficeOpen('project')",label:vision?'Följ klubbbygget':'Välj klubbens riktning'};
}
function coachTodayView(){
 const report=(state.analysis?.matches||[]).find(m=>m.finished&&!m.partial&&!m.abandoned&&m.club===managerClub());
 return `<section class="coach-today"><h2>Ditt arbete och nästa match</h2>${personalMatchOverview()}${report?`<section class="connected-obligation"><h3>Senaste matchen · ${trainingSafe(report.opponent)}</h3><p>${trainingSafe(calText(report.date))} · ${report.own}–${report.against}</p><button class="btn secondary" onclick="matchesOpenReport(${trainingSafe(JSON.stringify(report.id))})">Granska matchrapporten</button></section>`:''}${managerMatchLearningView()}<section class="connected-obligation">${coachFocusView()}</section>${daySummaryView()}<details><summary>Kalenderns stopp och samlade rapporter</summary>${calendarPaceView()}</details></section>`;
}
function coachAppearanceView(){
 const a=clubhouseAppearanceData();return `<h2>${trainingSafe(state.managerCareer?.name||'Din tränare')}</h2><p>Din figur följer dig genom klubbens rum och matchdagen.</p>${[['skin','Hudton',[['light','Ljus'],['medium','Mellan'],['dark','Mörk']]],['hair','Hår',[['brown','Brunt'],['blond','Blont'],['black','Svart'],['silver','Grått']]],['outfit','Klädsel',[['suit','Kostym'],['tracksuit','Träningsoverall']]]].map(([key,label,values])=>`<fieldset class="ch-appearance"><legend>${label}</legend>${values.map(([value,text])=>`<button aria-pressed="${a[key]===value}" onclick="clubhouseAppearance('${key}','${value}')">${text}</button>`).join('')}</fieldset>`).join('')}<button class="coach-link" onclick="deskNavigate('manager')">Din tränarkarriär →</button>`;
}
function coachRoomPanel(){
 const section=coachRoomUI.section;if(!section)return '';
 const body=section==='week'?coachDayPlanView():section==='agenda'?coachAgendaView():section==='preseason'?preseasonExperimentsView():section==='project'?clubVisionView():section==='reports'?coachReportsView():section==='player'?playerCaseView(coachRoomUI.player):section==='coach'?coachAppearanceView():coachTodayView();
 return `<section class="coach-office-panel" aria-label="${COACH_ROOM_SECTIONS[section]}" data-section="${section}"><header><h2 id="coach-office-panel-title" tabindex="-1">${COACH_ROOM_SECTIONS[section]}</h2><button type="button" aria-label="Stäng arbetsytan i rummet" onclick="coachOfficeClose()">×</button></header><div class="coach-office-panel-body">${body}</div></section>`;
}
function coachRoomModel(room){const m=clubhouseModel();m.room=room;m.coachRoom=true;return m;}
function coachRoomView(room='office'){
 coachRoomSync();coachRoomUI.room=room;const m=coachRoomModel(room),safe=trainingSafe,priority=coachPriority(),next=deskNextMatch(deskFixtures().upcoming[0]),visitor=room==='office'?clubhouseLifeVisitor():null,roster=managerRoster(),agenda=coachAgendaGroups(),active=agenda.filter(g=>!g.future).length;
 const doors={office:[['board','Taktiktavlan',"deskNavigate('lines')",'Kedjor & matchplan'],['desk','Veckans arbete',"coachOfficeOpen('week')",'Planera, genomför, följ upp'],['scout','Scoutkontoret',"coachRoomOpen('recruit')",'Lagbygge & riktiga affärer'],['cabinet','Klubbens riktning',"coachOfficeOpen('project')",'Ditt långsiktiga bygge'],['door','In till laget',"coachRoomOpen('locker')",'Spelarna & deras situation'],['coach','Din tränare',"coachOfficeOpen('coach')",'Figur & karriär']],locker:[['board','Taktiktavlan',"deskNavigate('lines')",'Planera det ansvar du lovat'],['door','Ut på isen',"coachRoomOpen('ice')",'Träning & utveckling'],['coach','Alla spelare',"coachRoomTable()",'Truppens relationer i listvy']],ice:[['board','Träningsplanen',"deskNavigate('training')",'Belastning & individuell utveckling'],['door','Tillbaka till laget',"coachRoomOpen('locker')",'Omklädningsrummet'],['coach','Försäsongens tester',"coachOfficeOpen('preseason')",'Vad lär vi oss av laget?']],recruit:[['board','Lagets uppdrag',"deskNavigate('transfers','needs')",'Behov → scouting → registrering'],['desk','Scoutuppdragen',"deskNavigate('transfers','missions')",'Observationer & osäkerhet'],['scout','Spelarsök',"deskNavigate('transfers','search')",'Hitta rätt kandidat'],['cabinet','Bud & avtal',"deskNavigate('transfers','deals')",'Dina faktiska förhandlingar'],['door','Tränarkontoret',"coachRoomOpen('office')",'Dagens vägval']]};
 const objects=doors[room]||doors.office,roomTitle=CLUBHOUSE_ROOMS[room]?.name||'Tränarkontoret',section=coachRoomUI.section;
 const brief=room==='locker'?`<span class="coach-meta">MÄNNISKORNA BAKOM TRÖJORNA</span><h2>Välj en spelare</h2><p>Klicka på spelaren i rummet eller välj i listan. Roll, löften, samtal och verklig användning öppnas tillsammans.</p><label>Hitta en spelare<select aria-label="Välj spelare i rummet" onchange="coachRoomSelect(this.value)"><option value="">Hela truppen</option>${roster.map(p=>`<option value="${safe(p.id)}">${safe(p.name)} · ${safe(p.pos)}</option>`).join('')}</select></label><button class="coach-link" onclick="coachRoomTable()">Alla spelare, ledarskap & relationer →</button>`:`<span class="coach-meta">${state.season.phase==='preseason'?'LÄR KÄNNA DITT LAG':'DITT NÄSTA VÄGVAL'}</span><h2>${safe(priority.title)}</h2><p>${safe(priority.detail)}</p><button class="coach-link" onclick="${safe(priority.action)}">${safe(priority.label)} →</button>${visitor?`<button class="coach-room-visitor" onclick="playerCaseOpen(${safe(JSON.stringify(visitor.playerId))})"><small>${safe(visitor.label)}</small><strong>${safe(visitor.name)}</strong><span>Ta samtalet och granska hela situationen →</span></button>`:''}<div class="coach-room-next"><small>${safe(next.eyebrow)}</small><strong>${safe(next.title)}</strong><p>${safe(next.detail)}</p></div>${coachPaceView()}`;
 return `<section class="coach-room ch-world ${section?'coach-room-has-panel':''}" id="coach-room" data-room="${room}" style="--ch-club:${m.color}" aria-label="${safe(roomTitle)}"><div class="ch-environment"><div class="ch-stage" id="clubhouse-stage" data-scene-key="${safe(clubhouseSceneKey(m,clubhouseAppearanceData()))}"><canvas id="clubhouse-canvas" aria-hidden="true"></canvas><p id="clubhouse-render-status" class="ch-render-status" role="status">Öppnar ${safe(roomTitle.toLowerCase())}…</p><div class="ch-hotspots" id="clubhouse-hotspots">${objects.map(o=>clubhouseHotspot(...o)).join('')}</div></div></div><header class="coach-room-heading"><span class="coach-meta">${safe(managerClub())} · ${safe(calText(state.calendar.date))}</span><h1>${safe(roomTitle)}</h1><p>${safe(CLUBHOUSE_ROOMS[room]?.subtitle||'')}</p></header><nav class="coach-room-tools" aria-label="Rummets verktyg"><button id="coach-office-work" onclick="coachOfficeOpen('agenda')">Ärenden <b>${active}</b></button><button onclick="coachOfficeOpen('reports')">Rapporter</button><button onclick="clubhouseCamera()">Kamera</button></nav>${!section?`<aside class="coach-room-brief" aria-label="Läget i klubben">${brief}</aside>`:''}${coachRoomPanel()}<footer class="coach-room-footer"><nav aria-label="Rum i klubben">${[['office','Kontoret'],['locker','Laget'],['ice','Träningshallen']].map(([key,label])=>`<button onclick="coachRoomOpen('${key}')" aria-current="${room===key?'location':'false'}">${label}</button>`).join('')}</nav><nav aria-label="Arbetet i klubben"><button onclick="coachOfficeOpen('week')">Veckoplan</button>${preseasonPlan()?.hasPreseason!==false?'<button onclick="coachOfficeOpen(\'preseason\')">Försäsongstester</button>':''}<button onclick="coachOfficeOpen('project')">Klubbbygget</button><button onclick="coachOfficeOpen('today')">Match & uppföljning</button></nav></footer></section>`;
}
function coachConnectedHomeView(){
 coachRoomSync();if(overviewUI.stories||overviewUI.press)return `<button class="coach-link" onclick="coachHome()">← Till tränarkontoret</button>${overviewUI.stories?storiesView():pressView()}`;
 return coachRoomView(coachRoomUI.room==='locker'?'office':coachRoomUI.room);
}
function coachRoomMount(){
 if(!coachWorkspaceEnabled()||!['home','locker'].includes(state.page)||state.page==='locker'&&coachRoomUI.table||state.page==='home'&&(overviewUI.stories||overviewUI.press))return false;
 const canvas=document.getElementById('clubhouse-canvas');if(!canvas||typeof canvas.getContext!=='function')return false;
 const room=state.page==='locker'?'locker':coachRoomUI.room,m=coachRoomModel(room);ClubhouseScene.mount(canvas,m,clubhouseAppearanceData());
 if(coachRoomUI.player&&coachRoomUI.selected!==coachRoomUI.player){coachRoomUI.selected=coachRoomUI.player;ClubhouseScene.select(String(coachRoomUI.player));}
 return true;
}
function connectedMatchOverview(){
 const m=state.live,plan=state.tacticalPlan||{},last=tacticalReviewSnapshot().at(-1);
 return `<section class="connected-match-plan"><span class="coach-meta">LAGET FÖLJER DINA ORDER</span><h3>${trainingSafe(({control:'Kontrollerat anfall',counter:'Omställningar',direct:'Rakt anfallsspel'})[plan.attackStyle]||({attack:'Offensivt',balanced:'Balanserat',defense:'Defensivt'})[state.tactic]||'Din matchplan')}</h3><p>Press: ${trainingSafe(({aggressive:'Hög',balanced:'Medel',passive:'Avvaktande'})[plan.forecheck]||plan.forecheck||'Standard')} · tempo: ${trainingSafe(({low:'Lågt',normal:'Normalt',high:'Högt'})[plan.tempo]||plan.tempo||'Standard')} · byten: ${trainingSafe(({short:'Korta',normal:'Normala',long:'Långa'})[plan.shiftLength]||plan.shiftLength||'Normala')}</p>${last?`<p>Senaste order: ${trainingSafe(last.label)} · ${analysisTime(last.time)}. Utfallet följs i matchunderlaget.</p>`:''}<div class="connected-match-shortcuts"><button class="btn secondary" onclick="matchTab('changes')">Välj nästa formation</button><button class="btn secondary" onclick="matchTab('tactics')">Ändra matchplanen</button></div></section>${matchFeedbackView()}`;
}
function connectedMatchTabs(tabs){
 const primary=state.live.finished?['feedback','report','stats']:['feedback','changes','tactics'];
 const button=([key,label])=>`<button id="match-tab-${key}" onclick="matchTab('${key}')" aria-pressed="${matchDesk.tab===key}">${key==='feedback'&&!state.live.finished?'Överblick':label}</button>`;
 return `<nav class="mc-tabs connected-match-primary" aria-label="Coachval">${tabs.filter(([key])=>primary.includes(key)).map(button).join('')}</nav><details class="connected-match-more" ${primary.includes(matchDesk.tab)?'':'open'}><summary>Underlag & verktyg${primary.includes(matchDesk.tab)?'':' · '+trainingSafe(tabs.find(([key])=>key===matchDesk.tab)?.[1]||'')}</summary><nav class="mc-tabs" aria-label="Fler matchverktyg">${tabs.filter(([key])=>!primary.includes(key)).map(button).join('')}</nav></details>`;
}
document.addEventListener?.('keydown',event=>{if(event.key==='Escape'&&coachWorkspaceEnabled()&&coachRoomUI.section&&!document.querySelector('dialog[open]')?.open){event.preventDefault();coachOfficeClose();}});
