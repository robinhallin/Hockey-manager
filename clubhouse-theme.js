'use strict';
// Option 3: one clubhouse around the existing career. This file owns only
// presentation; all decisions, dates, money and match actions use domain APIs.
const clubhouseThemeUI={scene:'illustrated'};
const CLUBHOUSE_THEME_AREAS=[
 {id:'office',label:'Kontoret',icon:'briefcase',page:'home',pages:[['home','Klubbhuset'],['inbox','Inkorg'],['calendar','Kalender'],['season','Säsongsplan']]},
 {id:'team',label:'Truppen',icon:'people',page:'squad',pages:[['squad','Spelare & avtal'],['locker','Samtal & relationer']]},
 {id:'tactics',label:'Taktik',icon:'clipboard',page:'lines',pages:[['lines','Kedjor & matchplan'],['opponents','Motstånd'],['statistics','Matchanalys']]},
 {id:'development',label:'Utveckling',icon:'calendar3',page:'training',pages:[['training','Spelarutveckling & träning'],['juniors','Akademin'],['medical','Medicinskt']]},
 {id:'recruit',label:'Rekrytering',icon:'search',page:'transfers',pages:[['transfers','Behov, scouting & affärer']]},
 {id:'club',label:'Klubben',icon:'building',page:'board',pages:[['board','Styrelsen'],['finance','Ekonomi'],['staff','Staben'],['staffReview','Uppföljning'],['manager','Din karriär']]},
 {id:'world',label:'Världen',icon:'globe2',page:'world',pages:[['world','Nyheter'],['leagues','Ligor'],['international','Landslag'],['nhl','Nordamerika']]}
];
function clubhouseThemeArea(){return CLUBHOUSE_THEME_AREAS.find(a=>a.pages.some(([page])=>page===state.page))||CLUBHOUSE_THEME_AREAS.find(a=>a.id===({locker:'team',ice:'development',boardroom:'club'}[clubhouseUI.room]||clubhouseUI.room))||CLUBHOUSE_THEME_AREAS[0];}
function clubhouseThemeNavigate(page){
 if(!clubhouseAvailable())return false;
 if(page==='home')return clubhouseGo('office');
 const area=CLUBHOUSE_THEME_AREAS.find(a=>a.pages.some(([key])=>key===page));
 if(!area)return false;
 clubhouseUI.origin=null;clubhouseUI.player=null;clubhouseUI.officeGuest=null;clubhouseUI.briefing=false;
 clubhouseUI.room=({team:'locker',tactics:'office',development:'ice',club:'boardroom'}[area.id]||area.id);
 return clubhouseOpen(page);
}
function clubhouseThemeIcon(name){return `<img class="ct-icon" src="assets/icons/${name}.svg" alt="" width="20" height="20">`;}
function clubhouseThemeScene(scene){
 if(scene!=='illustrated'||!clubhouseAvailable())return false;
 clubhouseThemeUI.scene=scene;clubhouseRemember('scene',scene);render();return true;
}
function clubhouseThemeContinue(){
 if(!clubhouseAvailable()||!clubhouseEnabled()||dayTransition||calendarPaceRun)return false;
 const blocker=coachBlocker();
 if(blocker){if(blocker.kind==='message')openManagerMessage(blocker.id);else clubhouseOpen('season');return false;}
 if(state.live&&!state.live.finished){deskNavigate('match');return true;}
 if(state.calendar.completedMatchDate!==state.calendar.date&&calendarFixtures().some(f=>f.date===state.calendar.date&&!f.played))return coachJourneyPrepare();
 clubhouseGo('office');return dayTransitionStart();
}
function clubhouseThemeHeader(m){
 return `<header class="ct-header"><button class="ct-brand" onclick="clubhouseGo('office')" aria-label="Till klubbhuset"><strong>HOCKEY MANAGER <em>${HOCKEY_BETA_VERSION}</em></strong></button><div class="ct-club">${clubCrest(m.club)}<span>${trainingSafe(m.club)}</span></div><time datetime="${m.date}">${trainingSafe(calText(m.date))}</time><div class="ct-header-tools"><button class="ct-icon-button" onclick="clubhouseOpen('inbox')" aria-label="Inkorg">${clubhouseThemeIcon('envelope')}</button><button class="ct-icon-button" onclick="clubhouseOpen('settings')" aria-label="Sparfiler och inställningar">${clubhouseThemeIcon('gear')}</button><button class="ct-primary ct-continue" onclick="clubhouseThemeContinue()" ${dayTransition||calendarPaceRun?'disabled':''}>${trainingSafe(coachContinueLabel())}${clubhouseThemeIcon('arrow-right')}</button></div></header>`;
}
function clubhouseThemeFooter(m,work){
 const active=clubhouseThemeArea();
 return `<footer class="ct-footer"><button class="ct-coach" onclick="clubhouseThemeNavigate('manager')"><img src="assets/clubhouse/coach.webp" alt="Din tränarfigur" width="56" height="56"><span><strong>${trainingSafe(m.coach)}</strong><small>Huvudtränare · ${trainingSafe(m.club)}</small></span></button><nav aria-label="Spelets huvudnavigation">${CLUBHOUSE_THEME_AREAS.map(a=>`<button onclick="clubhouseThemeNavigate('${a.page}')" ${active===a?'aria-current="page"':''}>${clubhouseThemeIcon(a.icon)}<span>${a.label}</span></button>`).join('')}</nav><button class="ct-icon-button ct-areas-toggle" onclick="clubhouseAreas()" aria-label="Alla områden" aria-expanded="${clubhouseUI.areas}">${clubhouseThemeIcon('grid-3x3-gap')}</button></footer>`;
}
function clubhouseThemePriority(m){
 const blocker=coachBlocker(),visitor=m.life.visitor,first=m.life.agenda[0],safe=trainingSafe;
 if(blocker)return {title:blocker.title,detail:blocker.detail,label:blocker.label,action:'clubhouseThemeContinue()'};
 if(visitor)return {title:visitor.label,detail:visitor.name+' · '+visitor.detail,label:'Ta samtalet',action:`clubhouseAcceptVisitor(${JSON.stringify(visitor.playerId)})`};
 if(first)return {title:first.title,detail:first.detail,label:'Öppna underlaget',action:`clubhouseLifeOpen(${JSON.stringify(first.id)})`};
 return {title:'Lär känna ditt lag',detail:'Träffa spelarna och lyssna på hur de ser på sin roll.',label:'Till omklädningsrummet',action:"clubhouseGo('locker')"};
}
function clubhouseThemeAgenda(m){
 const p=clubhouseThemePriority(m),safe=trainingSafe,training=TRAINING_SESSIONS[calendarSession(m.date).type];
 const active=state.live&&!state.live.finished,post=state.calendar.completedMatchDate===m.date;
 return `<aside class="ct-agenda" aria-label="Din tränardag"><span class="ct-eyebrow">${safe(m.club)} · ${safe(seasonLabel())}</span><h1>Din tränardag</h1>${betaFirstWeekView()?`<button class="ct-text-button" onclick="coachWorkspaceEnter()">Kom igång: din första vecka ${clubhouseThemeIcon('arrow-right')}</button>`:''}<ol class="ct-timeline"><li class="ct-now"><small>NU</small><button onclick="${safe(p.action)}"><strong>${safe(p.title)}</strong><span>${safe(p.detail)}</span></button></li><li><small>${post?'EFTER MATCHEN':active?'PÅGÅR':'DAGENS PROGRAM'}</small><button onclick="clubhouseOpen('${active?'match':post?'statistics':'training'}')"><strong>${safe(post?'Matchanalys & återhämtning':active?'Laget är på isen':training.name)}</strong><span>${safe(post?'Följ upp vad matchen gav.':active?'Återvänd till tränarbåset.':training.description)}</span></button></li><li><small>${m.fixture?safe(calText(m.fixture.date)):'NÄSTA STEG'}</small><button onclick="clubhouseOpen('calendar')"><strong>${m.fixture?safe(m.fixture.opponent):'Planera nästa steg'}</strong><span>${m.fixture?safe(m.fixture.type):'Kalender, träning och kommande matcher.'}</span></button></li></ol><button id="ch-day-round" class="ct-text-button" onclick="clubhouseBriefing()">Hela dagens runda <span>${m.life.agenda.length} ${m.life.agenda.length===1?'ärende':'ärenden'}</span>${clubhouseThemeIcon('arrow-right')}</button><div class="ct-agenda-bottom"><p>Dina beslut följs genom roller, utveckling och resultat.</p><button class="ct-primary" onclick="${safe(p.action)}">${safe(p.label)}${clubhouseThemeIcon('arrow-right')}</button>${clubhouseLifePace(m)}</div></aside>`;
}
function clubhouseThemeRoomPanel(m){
 if(clubhouseUI.wardrobe||clubhouseUI.briefing||clubhousePlayer())return '<aside class="ct-agenda" aria-hidden="true"></aside>';
 if(m.room==='office')return clubhouseThemeAgenda(m);
 return `<aside class="ct-agenda ct-room-actions" aria-label="${trainingSafe(CLUBHOUSE_ROOMS[m.room].name)}"><span class="ct-eyebrow">DIN PLATS I KLUBBEN</span>${m.room==='locker'?`<h1>Omklädningsrummet</h1><label for="clubhouse-player-select">Vem vill du träffa?</label><select id="clubhouse-player-select" onchange="if(this.value)clubhouseSelect(this.value)"><option value="">Välj en spelare</option>${m.players.map(p=>`<option value="${trainingSafe(p.id)}" ${samePlayerId(p.id,clubhouseUI.player)?'selected':''}>${trainingSafe(p.name)} · ${p.pos}${p.presence.present?'':' · '+trainingSafe(p.presence.label)}</option>`).join('')}</select>`:''}${clubhousePanel(m)}${m.room==='locker'?clubhouseControl('Hela truppen & avtal',"clubhouseOpen('squad')",'Roller, kontrakt och nästa steg'):''}<button class="ct-text-button" onclick="clubhouseBriefing()">Dagens underlag${clubhouseThemeIcon('arrow-right')}</button></aside>`;
}
function clubhouseThemeAreas(){
 return `<nav class="ct-areas" aria-label="Klubbhusets områden"><header><h2>Alla områden</h2><button class="ct-icon-button" onclick="clubhouseAreas()" aria-label="Stäng alla områden">${clubhouseThemeIcon('x-lg')}</button></header><div>${DESK_AREAS.map(a=>`<section><h3>${a.label}</h3>${a.pages.map(([page,label])=>`<button onclick="clubhouseOpen('${page}')">${trainingSafe(label)}${clubhouseThemeIcon('arrow-right')}</button>`).join('')}</section>`).join('')}</div><footer><button onclick="coachWorkspaceEnter()">Tränaröversikten</button><button onclick="showCareerMenu()">Huvudmeny</button><button onclick="clubhouseOpen('settings')">Sparfiler & inställningar</button></footer></nav>`;
}
function clubhouseThemeRecruitmentTabs(){
 return `<nav class="ct-work-secondary" aria-label="Rekryteringsarbetet">${[['overview','Översikt'],['needs','Truppplanering'],['search','Spelarsök'],['missions','Scoutuppdrag'],['shortlist','Bevakning'],['deals','Bud & avtal'],['loans','Lån']].map(([key,label])=>`<button ${state.recruitment.tab===key?'aria-current="page"':''} onclick="clubhouseOpen('transfers','${key}')">${label}</button>`).join('')}</nav>`;
}
function clubhouseThemeWork(html,m){
 const group=CLUBHOUSE_THEME_AREAS.find(a=>a.pages.some(([p])=>p===state.page));
 const title=group?.pages.find(([p])=>p===state.page)?.[1]||DESK_AREAS.flatMap(a=>a.pages).find(([p])=>p===state.page)?.[1]||'Arbetsvy';
 return `<section class="ch-work-dialog ct-work" role="region" aria-labelledby="ch-work-title"><header class="ch-work-heading"><div><small>${trainingSafe(CLUBHOUSE_ROOMS[m.room].name)}</small><h2 id="ch-work-title">${trainingSafe(title)}</h2></div><nav aria-label="Klubbhusets arbetsvy"><button onclick="clubhouseReturn()" aria-label="← Tillbaka till ${trainingSafe(CLUBHOUSE_ROOMS[m.room].name.toLowerCase())}">${clubhouseThemeIcon('arrow-left')}Till rummet</button><button class="ch-work-expand" aria-pressed="false" onclick="this.closest('.ch-work-dialog').classList.toggle('ch-work-wide');this.setAttribute('aria-pressed',this.closest('.ch-work-dialog').classList.contains('ch-work-wide'))">Bredda</button><button class="ct-icon-button" onclick="clubhouseReturn()" aria-label="Stäng arbetsytan">${clubhouseThemeIcon('x-lg')}</button></nav></header>${group?.id==='recruit'?clubhouseThemeRecruitmentTabs():group?`<nav class="ct-work-secondary" aria-label="${trainingSafe(group.label)}">${group.pages.map(([page,label])=>`<button ${state.page===page?'aria-current="page"':''} onclick="clubhouseOpen('${page}')">${trainingSafe(label)}</button>`).join('')}</nav>`:''}<div class="ch-work-content" id="ch-work-content" tabindex="-1">${deskFrame(html)}</div></section>`;
}
const clubhouseThemeBasePanel=clubhousePanel;
clubhousePanel=function(m){
 if(clubhouseUI.wardrobe)return `<div class="ch-panel-title"><span>DIN TRÄNARPROFIL</span><h2>${trainingSafe(m.coach)}</h2><p>Huvudtränare i ${trainingSafe(m.club)}. Ditt förtroende och dina uppdrag följer karriärens faktiska resultat och beslut.</p></div><img class="ct-profile-portrait" src="assets/clubhouse/coach.webp" alt="Din tränarfigur">${clubhouseControl('Karriär & förtroende',"clubhouseOpen('manager')",'Din historik och ditt nuvarande uppdrag')}${clubhouseControl('Staben omkring dig',"clubhouseOpen('staff')",'Ansvar, kompetens och delegering')}`;
 const html=clubhouseThemeBasePanel(m);
 return clubhouseThemeUI.scene==='illustrated'?html.replace('Klicka på en spelare i rummet för ett enskilt samtal.','Välj en spelare i listan för ett enskilt samtal.'):html;
};
clubhouseWorldView=function(html){
 clubhouseLifeSync();
 if(clubhouseUI.lastClub!==managerClub()){clubhouseUI.player=null;clubhouseUI.lastClub=managerClub();}
 const m=clubhouseModel(),work=!clubhouseIsRoom(),panel=!work&&(clubhouseUI.briefing||clubhouseUI.wardrobe||Boolean(clubhousePlayer()));
 const priority=clubhouseThemePriority(m),safe=trainingSafe;
 const roomScene=typeof clubhouseRoomsScene==='function'?clubhouseRoomsScene(m):'';
 return `<section class="ch-world ct-world ${work?'ch-has-work':''} ${panel?'ch-has-panel':''}" id="ch-world" data-room="${m.room}" data-day-phase="${m.life.phase}" style="--ch-club:${safe(m.color)}" aria-label="Levande klubbhus">${clubhouseThemeHeader(m)}<div class="ct-main">${roomScene||`<div class="ct-scene" aria-label="Klubbhusets överblick" ${work?'inert':''}><img class="ct-interior" src="assets/clubhouse/interior.webp" alt="Klubbhuset med tränarkontor, omklädningsrum och träningsis" fetchpriority="high"><div class="ct-scene-tools"><button onclick="clubhouseOpen('calendar')">${clubhouseThemeIcon('calendar3')}Kalender</button><button onclick="clubhouseOpen('lines')">${clubhouseThemeIcon('clipboard')}Taktiktavlan</button></div><button class="ct-place ct-office" onclick="clubhouseRoomsVisit('office')">Kontoret${clubhouseThemeIcon('arrow-right')}</button><button class="ct-place ct-locker" onclick="clubhouseGo('locker')">Omklädningsrum${clubhouseThemeIcon('arrow-right')}</button><button class="ct-place ct-ice" onclick="clubhouseGo('ice')">Träningsis${clubhouseThemeIcon('arrow-right')}</button>${m.room==='office'?`<div class="ct-scene-invitation"><span>${safe(priority.title)}</span><button class="ct-primary" onclick="${safe(priority.action)}">${safe(priority.label)}${clubhouseThemeIcon('arrow-right')}</button></div>`:''}<div class="ct-location"><span>${m.room==='office'?'VÄLKOMMEN TILL JOBBET':'I KLUBBHUSET'}</span><strong>${safe(CLUBHOUSE_ROOMS[m.room].name)}</strong></div></div>`}<div class="ct-side" ${work?'inert':''}>${typeof clubhouseRoomsPanel==='function'?clubhouseRoomsPanel(m):clubhouseThemeRoomPanel(m)}</div>${!work&&panel?`<aside class="ch-panel ch-world-panel ct-meeting" id="clubhouse-panel" aria-label="Interaktion i klubbhuset"><button class="ct-icon-button ch-panel-close" aria-label="Stäng spelarens eller rummets panel" onclick="clubhouseCloseMeeting()">${clubhouseThemeIcon('x-lg')}</button>${clubhousePanel(m)}</aside>`:`<aside class="ch-panel ch-world-panel ct-meeting" id="clubhouse-panel" hidden></aside>`}${work?clubhouseThemeWork(html,m):''}${clubhouseUI.areas?clubhouseThemeAreas():''}</div>${clubhouseThemeFooter(m,work)}${!work?clubhouseLifeFeedback(m):''}${!work&&m.room==='office'&&typeof mediaPromptView==='function'?`<div class="ct-media">${mediaPromptView()}</div>`:''}</section>`;
};
// Room selection updates the existing conversation panel without rebuilding
// the scene. The empty panel above is intentional for this fast path.
const clubhouseThemeSelect=clubhouseSelect;
clubhouseSelect=function(id){
 const ok=clubhouseThemeSelect(id);
 if(ok&&document.getElementById('ch-world')?.classList?.contains('ct-world')){render();document.getElementById('clubhouse-person-heading')?.focus?.({preventScroll:true});}
 return ok;
};
const clubhouseThemeCloseMeeting=clubhouseCloseMeeting;
clubhouseCloseMeeting=function(){clubhouseThemeCloseMeeting();document.getElementById('clubhouse-player-select')?.focus?.({preventScroll:true});};
const clubhouseThemeMount=clubhouseMount;
clubhouseMount=function(){
 clubhouseThemeMount();
 const theme=document.querySelector?.('.ct-world');
 if(theme&&typeof theme.querySelector==='function'){
  const panel=theme.querySelector('.ct-meeting:not([hidden])'),work=theme.querySelector('.ct-work');
  const modal=panel;
  if(modal){modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');}
  for(const selector of ['.ct-header','.ct-footer','.ct-scene','.ct-side']){const node=theme.querySelector(selector);if(node)node.inert=Boolean(modal||work&&['.ct-scene','.ct-side'].includes(selector));}
 }

};
document.addEventListener?.('keydown',event=>{
 const theme=document.querySelector?.('.ct-world'),panel=theme?.querySelector?.('.ct-meeting:not([hidden])');
 if(!panel?.querySelectorAll)return;
 if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation?.();clubhouseCloseMeeting();return;}
 if(event.key==='Tab'){
  const buttons=Array.from(panel.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),[tabindex="0"]')).filter(el=>el.getClientRects().length);
  const first=buttons[0],last=buttons.at(-1);if(!first)return;
  if(event.shiftKey&&(document.activeElement===first||!panel.contains(document.activeElement))){event.preventDefault();last.focus();}
  else if(!event.shiftKey&&(document.activeElement===last||!panel.contains(document.activeElement))){event.preventDefault();first.focus();}
 }
});
// One presentation migration only. No career fields or save version changes.
if(typeof window!=='undefined'&&clubhousePreference('theme-version','')!=='4'){
 clubhouseRemember('theme-version','4');clubhouseRemember('mode','living');clubhouseRemember('scene','illustrated');
}
