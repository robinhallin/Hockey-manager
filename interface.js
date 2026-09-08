"use strict";

// Presentation only: routes share the existing career state and game actions.
const deskFolds = {iceTime:false,contracts:false};
const DESK_AREAS = [
  {id:'overview',label:'Översikt',icon:'home',pages:[['home','Tränarkontoret'],['staffReview','Stab & uppföljning'],['stories','Säsongens historier']]},
  {id:'team',label:'Laget',icon:'team',pages:[['squad','Trupp'],['lines','Taktik & laguttagning'],['locker','Omklädningsrum']],details:{player:'squad',specialTeams:'lines',tactics:'lines'}},
  {id:'training',label:'Utveckling',icon:'training',pages:[['training','Spelarutveckling'],['juniors','Juniorer'],['medical','Medicinskt team']]},
  {id:'matches',label:'Matcher',icon:'calendar',pages:[['calendar','Kalender'],['match','Matchcenter'],['opponents','Motståndsrapport'],['statistics','Matchanalys']],details:{schedule:'calendar',round:'calendar'}},
  {id:'recruitment',label:'Rekrytering',icon:'search',pages:[['transfers','Rekrytering']],details:{marketPlayer:'transfers',scouting:'transfers'}},
  {id:'club',label:'Klubben',icon:'club',pages:[['finance','Ekonomi'],['board','Styrelse'],['staff','Personal'],['manager','Min karriär']]},
  {id:'leagues',label:'Ligorna',icon:'trophy',pages:[['leagues','Ligavärlden'],['news','Liganyheter'],['table','Tabell'],['leagueStats','Spelarstatistik'],['season','Säsong & historik']]}
];
const DESK_RECRUIT_TABS = [['needs','Behov'],['search','Sökning'],['missions','Scouting'],['shortlist','Önskelista'],['deals','Förhandlingar']];
const DESK_RECRUIT_MORE = [['loans','Lånecentralen'],['history','Övergångar'],['world','Spelarvärlden']];

function deskIcon(name){
  const paths={home:'M3 10 12 3l9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z',team:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8m8-7a4 4 0 0 1 0 8',training:'M12 3v3m0 12v3M3 12h3m12 0h3M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8',calendar:'M4 5h16v16H4Zm3-3v6m10-6v6M4 11h16m-12 4h2m4 0h2',search:'M21 21l-5-5M10.5 3a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15',club:'M3 21h18M5 21V9h14v12M3 9l9-6 9 6M9 13v4m6-4v4',trophy:'M8 3h8v7a4 4 0 0 1-8 0ZM8 5H4v3a4 4 0 0 0 4 4m8-7h4v3a4 4 0 0 1-4 4m-4 2v6m-4 1h8',mail:'M3 5h18v14H3Zm0 1 9 7 9-7',menu:'M4 6h16M4 12h16M4 18h16',arrow:'M5 12h14m-5-5 5 5-5 5',settings:'M4 7h16M4 17h16M8 4v6m8 4v6'};
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]||paths.arrow}"/></svg>`;
}
function deskArea(page=state.page){return DESK_AREAS.find(a=>a.pages.some(([p])=>p===page)||a.details?.[page]);}
const deskHistory=[];
let deskHistoryOwner=null;
let deskSaveTimer=null,deskSaveOwner=null,deskBrowserToken=null,deskBrowserIndex=0;
function queueInterfaceSave(){
 clearTimeout(deskSaveTimer);deskSaveOwner=state;
 deskSaveTimer=setTimeout(()=>{deskSaveTimer=null;if(deskSaveOwner===state){deskBrowserBefore();save({normalize:false});}deskSaveOwner=null;},700);
}
function flushInterfaceSave(){
 if(deskSaveOwner===state){clearTimeout(deskSaveTimer);deskSaveTimer=null;deskSaveOwner=null;save({normalize:false});}
}
function deskHistorySync(){
 if(deskHistoryOwner!==state){
  deskHistory.length=0;deskHistoryOwner=state;deskBrowserIndex=0;
  deskBrowserToken=String(Date.now())+':'+Math.random();
  if(typeof window!=='undefined'&&window.history?.replaceState)window.history.replaceState({hm:deskBrowserToken,index:0,view:deskSnapshot()},'');
 }
}
function deskBrowserBefore(view=deskSnapshot()){
 if(typeof window!=='undefined'&&window.history?.replaceState)window.history.replaceState({hm:deskBrowserToken,index:deskBrowserIndex,view},'');
}
function deskBrowserAfter(){
 if(typeof window!=='undefined'&&window.history?.pushState)window.history.pushState({hm:deskBrowserToken,index:++deskBrowserIndex,view:deskSnapshot()},'');
}
function deskRestore(previous){
 if(state.managerFeedback){state.managerFeedback.selectedBrief=previous.feedbackBrief;state.managerFeedback.filter=previous.feedbackFilter||'all';}
 state.selectedPlayer=previous.player;state.selectedMarketPlayer=previous.market;lineupWorkspace=previous.lineup;
 if(previous.filters)state.recruitment.filters={...previous.filters};
 deskNavigate(previous.page,previous.tab,false);inboxUI.detail=previous.inboxDetail;render();
 const content=document.getElementById('content');if(content)content.scrollTop=previous.scroll;
 if(typeof window!=='undefined')window.scrollTo?.({top:previous.windowScroll||0,behavior:'instant'});
}
if(typeof window!=='undefined'){
 window.addEventListener('popstate',event=>{
  if(event.state?.hm!==deskBrowserToken||deskHistoryOwner!==state)return;
  deskBrowserIndex=event.state.index;deskRestore(event.state.view);
 });
 window.addEventListener('pagehide',flushInterfaceSave);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)flushInterfaceSave();});
}
function deskSnapshot(){return {feedbackBrief:state.managerFeedback?.selectedBrief,feedbackFilter:state.managerFeedback?.filter,page:state.page,tab:state.recruitment?.tab,player:state.selectedPlayer,market:state.selectedMarketPlayer,lineup:lineupWorkspace,filters:state.recruitment?{...state.recruitment.filters}:null,scroll:document.getElementById('content')?.scrollTop||0,windowScroll:typeof window!=='undefined'?window.scrollY:0,inboxDetail:inboxUI.detail};}
function deskNavigate(page,tab,record=true){
 deskHistorySync();
 if(page==='specialTeams'){page='lines';lineupWorkspace='special';}
 if(page==='scouting'){page='transfers';tab='missions';}
 if(page==='transfers'&&tab==='free'){tab='search';recruitFilters().availability='free';}
 if(!DESK_AREAS.some(a=>a.pages.some(([p])=>p===page)||a.details?.[page])&&!['inbox','news','settings'].includes(page))return;
 if(state.live?.running)pauseMatch('Du lämnade matchvyn.');
 const browserPush=record&&(page!==state.page||tab&&tab!==state.recruitment?.tab);
 if(browserPush)deskBrowserBefore();
 if(record&&(page!==state.page||tab&&tab!==state.recruitment?.tab)){deskHistory.push(deskSnapshot());if(deskHistory.length>30)deskHistory.shift();}
 if(tab&&page==='transfers'&&[...DESK_RECRUIT_TABS,...DESK_RECRUIT_MORE].some(([t])=>t===tab))state.recruitment.tab=tab;
 if(page==='squad'&&tab==='contracts')deskFolds.contracts=true;
 if(page==='inbox'&&state.page!=='inbox')inboxUI.detail=false;
 state.page=page;queueInterfaceSave();render();
 const content=document.getElementById('content');if(content){content.scrollTop=0;content.focus?.({preventScroll:true});}
 if(typeof window!=='undefined')window.scrollTo?.({top:0,behavior:'instant'});
 if(page==='squad'&&tab==='contracts')document.getElementById('squad-contracts')?.scrollIntoView?.({block:'start'});
 if(browserPush)deskBrowserAfter();
}
function deskBack(fallback='home'){
 deskHistorySync();
 if(typeof window!=='undefined'&&window.history?.back&&deskBrowserIndex>0){window.history.back();return;}
 const previous=deskHistory.pop();if(!previous){deskNavigate(fallback,undefined,false);return;}
 deskRestore(previous);
}
function deskOpenPlayer(id,market=false){
 if(!market)profileWorkspace.tab='overview';
 deskHistorySync();
 const old=deskSnapshot();deskBrowserBefore(old);if(market)state.selectedMarketPlayer=id;else state.selectedPlayer=id;
 deskHistory.push(old);if(deskHistory.length>30)deskHistory.shift();deskNavigate(market?'marketPlayer':'player',undefined,false);deskBrowserAfter();
}
function deskAction(action){return action.messageId!==undefined?`openManagerMessage(${JSON.stringify(action.messageId)})`:`deskNavigate(${JSON.stringify(action.page)}${action.tab?','+JSON.stringify(action.tab):''})`;}
function deskLink(label,action,cls='desk-link'){return `<button class="${cls}" onclick="${trainingSafe(deskAction(action))}">${trainingSafe(label)}${deskIcon('arrow')}</button>`;}
function deskPrimaryNav(){
  const area=deskArea();
  return DESK_AREAS.map(a=>`<button class="nav-item ${area?.id===a.id?'active':''}" ${area?.id===a.id?'aria-current="true"':''} onclick="deskNavigate('${a.pages[0][0]}')"><span class="nav-icon">${deskIcon(a.icon)}</span><span>${a.label}</span></button>`).join('');
}
function deskSubnav(){
  const area=deskArea(),page=area?.details?.[state.page]||state.page;
  if(area?.id==='recruitment'){
    const tab=state.page==='scouting'?'missions':state.recruitment.tab;
    const extra=DESK_RECRUIT_MORE.find(([id])=>id===tab),more=Boolean(extra||tab==='reports');
    return `<nav class="desk-subnav" aria-label="Rekrytering">${DESK_RECRUIT_TABS.map(([id,label])=>`<button ${tab===id?'aria-current="page"':''} onclick="deskNavigate('transfers','${id}')">${label}</button>`).join('')}<details class="desk-more ${more?'selected':''}"><summary>${extra?extra[1]:tab==='reports'?'Scoutrapporter':'Mer'}</summary><div>${DESK_RECRUIT_MORE.map(([id,label])=>deskLink(label,{page:'transfers',tab:id})).join('')}</div></details></nav>`;
  }
  const pages=area?.pages||(['inbox','news'].includes(page)?[['inbox','Inkorg'],['news','Nyheter']]:[]);
  if(pages.length<2)return '';
  return `<nav class="desk-subnav" aria-label="${area?.label||'Meddelanden'}">${pages.map(([id,label])=>`<button ${page===id?'aria-current="page"':''} onclick="deskNavigate('${id}')">${label}</button>`).join('')}</nav>`;
}
function deskFrame(html){return careerScreen||state.page==='clubSelect'?html:`<div class="desk-page" data-area="${deskArea()?.id||'other'}">${deskSubnav()}${html}</div>`;}
function deskCloseMenu(restoreFocus=false){
  document.querySelector('.game-shell')?.classList.toggle('mobile-nav-open',false);
  document.getElementById('mobileMenu')?.setAttribute?.('aria-expanded','false');
  const area=document.querySelector('.game-area');if(area)area.inert=false;
  if(restoreFocus)document.getElementById('mobileMenu')?.focus?.();
}
function deskToggleMenu(){
  if(state.live?.running)pauseMatch();
  const open=document.querySelector('.game-shell')?.classList.toggle('mobile-nav-open');
  document.getElementById('mobileMenu')?.setAttribute?.('aria-expanded',String(Boolean(open)));
  const area=document.querySelector('.game-area');if(area)area.inert=Boolean(open);
  if(open)document.querySelector('.manager-nav button')?.focus?.();
}
document.addEventListener?.('keydown',event=>{
  if(!document.querySelector('.game-shell')?.classList.contains?.('mobile-nav-open'))return;
  if(event.key==='Escape'){deskCloseMenu(true);event.preventDefault();}
  if(event.key==='Tab'){
    const buttons=document.querySelector('.sidebar')?.querySelectorAll?.('button:not([disabled]), a[href]');
    if(!buttons?.length)return;
    const first=buttons[0],last=buttons[buttons.length-1];
    if(event.shiftKey&&document.activeElement===first){last.focus();event.preventDefault();}
    else if(!event.shiftKey&&document.activeElement===last){first.focus();event.preventDefault();}
  }
});
if(typeof window!=='undefined')window.matchMedia?.('(min-width: 761px)').addEventListener?.('change',event=>{if(event.matches)deskCloseMenu();});

function deskRefreshShell(){
  document.querySelector('.game-shell')?.classList.toggle('match-mode',state.page==='match'&&!careerScreen);
  const nav=document.querySelector('.manager-nav');if(nav)nav.innerHTML=deskPrimaryNav();
  const date=document.querySelector('.season-info strong');if(date)date.textContent=state.calendar?calText(state.calendar.date):seasonLabel();
  const season=document.querySelector('.season-info span');if(season)season.textContent=seasonLabel();
  const section=document.querySelector('.current-section');
  const area=deskArea();if(section)section.innerHTML=`<span>${area?.label||({inbox:'Inkorg',news:'Nyheter',settings:'Sparfiler & inställningar'}[state.page]||'Hockey Manager')}</span>${state.calendar?`<small>${calText(state.calendar.date)}</small>`:''}`;
  const unread=state.training?.messages.filter(m=>!m.read).length||0,mail=document.getElementById('deskInbox');
  if(mail){mail.innerHTML=`${deskIcon('mail')}<span class="desk-inbox-label">Inkorg</span>${unread?`<span class="desk-count">${unread>99?'99+':unread}</span>`:''}`;mail.setAttribute?.('aria-label',`Inkorg, ${unread} olästa meddelanden`);mail.setAttribute?.('aria-current',state.page==='inbox'?'page':'false');}
  const menu=document.getElementById('mobileMenu');if(menu)menu.innerHTML=deskIcon('menu')+'<span>Meny</span>';
  const next=document.getElementById('continueGame');if(next){next.disabled=Boolean(careerScreen||!state.careerStarted);next.textContent=calendarActionLabel();next.title=state.calendar?`${calText(state.calendar.date)} · ${calendarActionLabel()}`:'Fortsätt';}
}

function deskFixtures(){
  const club=managerClub(),phase=state.season.phase;
  const games=state.schedule.filter(g=>g.home===club||g.away===club).map(g=>({date:g.date,played:g.played,opponent:g.home===club?g.away:g.home,venue:g.home===club?'Hemma':'Borta',own:g.home===club?g.homeGoals:g.awayGoals,against:g.home===club?g.awayGoals:g.homeGoals,type:g.stage?'Slutspel':leagueName(),round:g.round}));
  const friendlies=(state.calendar?.friendlies||[]).filter(f=>f.club===club).map(f=>({...f,type:'Träningsmatch',venue:'Träningsmatch'}));
  const all=[...games,...friendlies];
  return {
    upcoming:all.filter(g=>!g.played&&g.date>=state.calendar.date&&(phase!=='review')&&(phase!=='preseason'||g.type==='Träningsmatch')).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,3),
    recent:all.filter(g=>g.played).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,3)
  };
}
function deskTasks(){
  const tasks=[],roster=managerRoster(),pending=pendingManagerDecision(),r=state.recruitment;
  if(pending)tasks.push({title:pending.title,detail:'Ett samtal behöver ditt svar innan kalendern kan gå vidare.',action:{messageId:pending.id},tag:'Beslut',tone:'amber'});
  const loanReplies=(state.loans?.offers||[]).filter(o=>o.status==='counter');
  if(loanReplies.length)tasks.push({title:`${loanReplies.length} motbud om lån`,detail:'Klubb och spelare föreslår nya villkor. Ditt svar behövs inom sju dagar.',action:{page:'transfers',tab:'loans'},tag:'Låneavtal',tone:'amber'});
  const counters=r.deals.filter(d=>d.status==='pending'&&d.counter);if(counters.length)tasks.push({title:`${counters.length} motbud om värvningar`,detail:'Granska agentens förslag innan giltighetstiden går ut.',action:{page:'transfers',tab:'deals'},tag:'Avtal',tone:'amber'});
  const offers=r.incoming.filter(o=>o.status==='pending'&&o.expires>=r.tick);
  if(offers.length)tasks.push({title:`${offers.length} bud på dina spelare`,detail:'Granska villkoren och välj om klubben ska sälja.',action:{page:'transfers',tab:'deals'},tag:'Bud',tone:'amber'});
  if(state.season.phase==='review')tasks.push({title:'Säsongen ska utvärderas',detail:'Läs styrelsens besked och förbered nästa säsong.',action:{page:'season'},tag:'Säsong',tone:'amber'});
  const unavailable=roster.filter(p=>!medicalReady(p));
  if(unavailable.length)tasks.push({title:`${unavailable.length} spelare saknas till match`,detail:unavailable.slice(0,2).map(p=>p.name).join(', ')+(unavailable.length>2?' med flera.':'.'),action:{page:'medical'},tag:'Medicinskt',tone:'amber'});
  const wageRoom=wageBudget()-annualWageCost();
  if(wageRoom<0||state.money<0)tasks.push({title:'Ekonomin behöver åtgärdas',detail:wageRoom<0?'Lönekostnaden överstiger styrelsens lönebudget.':'Klubbkassan är negativ.',action:{page:'finance'},tag:'Ekonomi',tone:'amber'});
  const tired=roster.filter(p=>medicalReady(p)&&p.fatigue>=35);
  if(tired.length)tasks.push({title:`${tired.length} spelare har hög belastning`,detail:'Se över återhämtning och planera kommande pass.',action:{page:'training'},tag:'Träning',tone:'blue'});
  const expiring=roster.filter(contractNeedsDecision);
  if(expiring.length)tasks.push({title:`${expiring.length} kontrakt på sista året`,detail:'Ta ställning till vilka spelare du vill behålla.',action:{page:'squad',tab:'contracts'},tag:'Trupp',tone:'blue'});
  return tasks;
}
function deskNextMatch(next){
  const live=state.live,active=live&&!live.finished,phase=state.season.phase;
  if(active)return {eyebrow:live.running?'Match pågår':'Matchen är pausad',title:`${managerClub()} – ${live.opponent}`,detail:`Period ${live.period} · ${live.minute}:${String(live.second||0).padStart(2,'0')} · ${live.friendly?'Träningsmatch':leagueName()}`,score:`${live.hv} – ${live.opp}`,action:{page:'match'},label:'Till matchen'};
  if(phase==='review')return {eyebrow:'Säsongsavslutning',title:'Dags att summera säsongen',detail:'Styrelsens utvärdering och planeringen inför nästa år väntar.',action:{page:'season'},label:'Öppna säsongsrapporten'};
  if(next)return {eyebrow:next.type==='Träningsmatch'?'Nästa träningsmatch':'Nästa match',title:`${managerClub()} – ${next.opponent}`,detail:`${calText(next.date)} · ${next.venue} · ${next.type}`,action:{page:'lines'},label:'Förbered laget'};
  if(phase==='preseason')return {eyebrow:'Försäsong',title:'Forma laget inför premiären',detail:'Boka träningsmatcher och ge laget tid att hitta samspelet.',action:{page:'calendar'},label:'Planera försäsongen'};
  return {eyebrow:phase==='playoffs'?'Slutspel':'Spelschema',title:'Inväntar nästa match',detail:'Följ säsongens avgörande och se när nästa omgång är klar.',action:{page:'season'},label:'Följ säsongen'};
}
function managerDeskView(){
 const fixtures=deskFixtures(),next=deskNextMatch(fixtures.upcoming[0]),tasks=deskTasks(),c=state.calendar;
 return `<section class="manager-desk coherent-desk"><header class="desk-heading"><div><span class="desk-kicker">${trainingSafe(managerClub())} · ${seasonLabel()}</span><h1>Tränarkontoret</h1></div><span>${calText(c.date)}</span></header><div class="desk-workflow">
 <section class="desk-panel"><span class="desk-kicker">IDAG</span><h2>${c.completedMatchDate===c.date?'Följ upp dagens match':calendarFixtures().some(f=>f.date===c.date)?'Matchdag':TRAINING_SESSIONS[calendarSession(c.date).type].name}</h2><p>${trainingSafe(trainingAdvice())}</p>${deskLink('Öppna dagens program',{page:'calendar'},'btn')}</section>
 <section class="desk-panel"><span class="desk-kicker">BESLUT SOM VÄNTAR · ${tasks.length}</span><h2>Att ta ställning till</h2>${tasks.length?tasks.slice(0,3).map(t=>`<button class="desk-task" onclick="${trainingSafe(deskAction(t.action))}"><span>${t.tag}</span><strong>${trainingSafe(t.title)}</strong><small>${trainingSafe(t.detail)}</small></button>`).join(''):'<p>Inga prioriterade beslut just nu.</p>'}${tasks.length>3?`<details><summary>${tasks.length-3} fler ärenden</summary>${tasks.slice(3).map(t=>deskLink(t.title,t.action)).join('')}</details>`:''}</section>
 <section class="desk-panel"><span class="desk-kicker">${next.eyebrow}</span><h2>${trainingSafe(next.title)}</h2>${next.score?`<strong class="desk-live-score">${next.score}</strong>`:''}<p>${trainingSafe(next.detail)}</p>${next.action.page==='calendar'?'':deskLink(next.label,next.action,'btn secondary')}</section></div>
 <p class="desk-panel">${deskLink('Stabens råd och uppföljning av dina beslut',{page:'staffReview'})} · ${deskLink('Liganyheter',{page:'news'})}</p><details class="desk-panel desk-context"><summary>Laget, motståndet och säsongens historier</summary>${coachFocus()?`<p>Träningsfokus: ${COACH_FOCUSES[coachFocus().key].name} · ${coachFocus().results.length}/${coachFocus().target||3} matcher. ${deskLink('Visa uppföljning',{page:'training'})}</p>`:''}${rivalsDeskView()}${storiesDeskView()}<p>Kassa: ${careerMoney(state.money)} · Återstående löneutrymme: ${careerMoney(wageBudget()-annualWageCost())}</p></details></section>`;
}
