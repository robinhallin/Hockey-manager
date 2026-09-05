"use strict";

// Presentation only: routes share the existing career state and game actions.
const deskFolds = {iceTime:false,contracts:false};
const DESK_AREAS = [
  {id:'overview',label:'Översikt',icon:'home',pages:[['home','Tränarkontoret']]},
  {id:'team',label:'Laget',icon:'team',pages:[['squad','Trupp'],['lines','Kedjor'],['specialTeams','Powerplay & boxplay'],['tactics','Taktik'],['locker','Omklädningsrum']],details:{player:'squad'}},
  {id:'training',label:'Träning',icon:'training',pages:[['training','Träningsplan'],['juniors','Juniorer'],['medical','Medicinskt team']]},
  {id:'matches',label:'Matcher',icon:'calendar',pages:[['calendar','Kalender'],['match','Matchcenter'],['statistics','Matchanalys']],details:{schedule:'calendar',round:'calendar'}},
  {id:'recruitment',label:'Rekrytering',icon:'search',pages:[['transfers','Spelarsökning'],['scouting','Scoutrapporter']],details:{marketPlayer:'transfers'}},
  {id:'club',label:'Klubben',icon:'club',pages:[['finance','Ekonomi'],['board','Styrelse'],['staff','Personal'],['manager','Min karriär']]},
  {id:'leagues',label:'Ligorna',icon:'trophy',pages:[['leagues','Ligavärlden'],['table','Tabell'],['leagueStats','Spelarstatistik'],['season','Säsong & historik']]}
];
const DESK_RECRUIT_TABS = [['search','Spelarsökning'],['shortlist','Önskelista'],['missions','Scoutuppdrag'],['deals','Förhandlingar']];
const DESK_RECRUIT_MORE = [['free','Kontraktslösa'],['history','Övergångar'],['world','Spelarvärlden']];

function deskIcon(name){
  const paths={home:'M3 10 12 3l9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z',team:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8m8-7a4 4 0 0 1 0 8',training:'M12 3v3m0 12v3M3 12h3m12 0h3M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8',calendar:'M4 5h16v16H4Zm3-3v6m10-6v6M4 11h16m-12 4h2m4 0h2',search:'M21 21l-5-5M10.5 3a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15',club:'M3 21h18M5 21V9h14v12M3 9l9-6 9 6M9 13v4m6-4v4',trophy:'M8 3h8v7a4 4 0 0 1-8 0ZM8 5H4v3a4 4 0 0 0 4 4m8-7h4v3a4 4 0 0 1-4 4m-4 2v6m-4 1h8',mail:'M3 5h18v14H3Zm0 1 9 7 9-7',menu:'M4 6h16M4 12h16M4 18h16',arrow:'M5 12h14m-5-5 5 5-5 5',settings:'M4 7h16M4 17h16M8 4v6m8 4v6'};
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]||paths.arrow}"/></svg>`;
}
function deskArea(page=state.page){return DESK_AREAS.find(a=>a.pages.some(([p])=>p===page)||a.details?.[page]);}
function deskNavigate(page,tab){
  if(!DESK_AREAS.some(a=>a.pages.some(([p])=>p===page)||a.details?.[page])&&!['inbox','news','settings'].includes(page))return;
  if(state.live?.running)pauseMatch();
  if(tab&&page==='transfers'&&[...DESK_RECRUIT_TABS,...DESK_RECRUIT_MORE].some(([t])=>t===tab))state.recruitment.tab=tab;
  state.page=page;save();render();
  const content=document.getElementById('content');
  if(content){content.scrollTop=0;content.focus?.({preventScroll:true});}
  // On phones the document is the scroll container, on desktop it is #content.
  if(typeof window!=='undefined'&&window.matchMedia?.('(max-width: 760px)').matches)window.scrollTo?.({top:0,behavior:'instant'});
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
    const tab=state.page==='scouting'?'reports':state.recruitment.tab;
    const extra=DESK_RECRUIT_MORE.find(([id])=>id===tab),more=Boolean(extra||tab==='reports');
    return `<nav class="desk-subnav" aria-label="Rekrytering">${DESK_RECRUIT_TABS.map(([id,label])=>`<button ${tab===id?'aria-current="page"':''} onclick="deskNavigate('transfers','${id}')">${label}</button>`).join('')}<details class="desk-more ${more?'selected':''}"><summary>${extra?extra[1]:tab==='reports'?'Scoutrapporter':'Mer'}</summary><div>${deskLink('Scoutrapporter',{page:'scouting'})}${DESK_RECRUIT_MORE.map(([id,label])=>deskLink(label,{page:'transfers',tab:id})).join('')}</div></details></nav>`;
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
  const next=document.getElementById('continueGame');if(next){next.disabled=Boolean(careerScreen||!state.careerStarted);next.title='Gå till nästa händelse, match eller beslut';}
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
  const offers=r.incoming.filter(o=>o.status==='pending'&&o.expires>=r.tick);
  if(offers.length)tasks.push({title:`${offers.length} bud på dina spelare`,detail:'Granska villkoren och välj om klubben ska sälja.',action:{page:'transfers',tab:'deals'},tag:'Bud',tone:'amber'});
  if(state.season.phase==='review')tasks.push({title:'Säsongen ska utvärderas',detail:'Läs styrelsens besked och förbered nästa säsong.',action:{page:'season'},tag:'Säsong',tone:'amber'});
  const unavailable=roster.filter(p=>!medicalReady(p));
  if(unavailable.length)tasks.push({title:`${unavailable.length} spelare saknas till match`,detail:unavailable.slice(0,2).map(p=>p.name).join(', ')+(unavailable.length>2?' med flera.':'.'),action:{page:'medical'},tag:'Medicinskt',tone:'amber'});
  const wageRoom=wageBudget()-annualWageCost();
  if(wageRoom<0||state.money<0)tasks.push({title:'Ekonomin behöver åtgärdas',detail:wageRoom<0?'Lönekostnaden överstiger styrelsens lönebudget.':'Klubbkassan är negativ.',action:{page:'finance'},tag:'Ekonomi',tone:'amber'});
  const tired=roster.filter(p=>medicalReady(p)&&p.fatigue>=35);
  if(tired.length)tasks.push({title:`${tired.length} spelare har hög belastning`,detail:'Se över återhämtning och planera kommande pass.',action:{page:'training'},tag:'Träning',tone:'blue'});
  const expiring=roster.filter(p=>p.contractYears<=1&&!p.futureContract);
  if(expiring.length)tasks.push({title:`${expiring.length} kontrakt på sista året`,detail:'Ta ställning till vilka spelare du vill behålla.',action:{page:'squad'},tag:'Trupp',tone:'blue'});
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
  const roster=managerRoster(),fixtures=deskFixtures(),next=deskNextMatch(fixtures.upcoming[0]),tasks=deskTasks(),club=managerClub();
  const standings=leagueTable(),position=standings.findIndex(t=>t.name===club)+1,own=standings.find(t=>t.name===club),available=roster.filter(medicalReady).length;
  const readiness=roster.length?Math.round(roster.reduce((n,p)=>n+100-(p.fatigue||0),0)/roster.length):0;
  const goals=boardProgress(),training=state.training,session=training.plan[training.day],type=session?TRAINING_SESSIONS[session.type]:null;
  const metrics=[{label:leagueName(),value:own?.gp?`${position}${position<3?':a':':e'} plats`:'Ej startad',detail:own?.gp?`${own.pts} poäng · ${own.gp} matcher`:'Tabellen väntar på premiären',page:'table'},
    {label:'Tillgängliga spelare',value:`${available} / ${roster.length}`,detail:`${roster.length-available} otillgängliga`,page:'medical'},
    {label:'Fysisk beredskap',value:`${readiness}%`,detail:'Truppens genomsnitt efter belastning',page:'training'},
    {label:'Klubbkassa',value:careerMoney(state.money),detail:`${careerMoney(wageBudget()-annualWageCost())} i löneutrymme / år`,page:'finance'}];
  return `<section class="manager-desk">
    <header class="desk-heading"><div><span class="desk-kicker">${trainingSafe(club)} · ${seasonLabel()}</span><h1>Tränarkontoret</h1><p>Din dag, laget och besluten som väntar.</p></div><span class="desk-phase">${({regular:'Grundserie',playoffs:'Slutspel',review:'Säsongsavslutning',preseason:'Försäsong'})[state.season.phase]||'Karriär'}</span></header>
    <div class="desk-main-grid">
      <article class="desk-fixture-hero"><div class="desk-fixture-top"><span class="desk-kicker">${next.eyebrow}</span><span class="desk-club-monogram" style="--club-color:${careerIdentity(club).color}">${trainingSafe(careerIdentity(club).code)}</span></div><h2>${trainingSafe(next.title)}</h2>${next.score?`<strong class="desk-live-score">${next.score}</strong>`:''}<p>${trainingSafe(next.detail)}</p><div class="desk-fixture-bottom">${deskLink(next.label,next.action,'desk-primary')}<span>Fortsätt i toppraden för nästa händelse.</span></div></article>
      <section class="desk-panel desk-agenda"><header><h2>Att ta ställning till</h2><span class="desk-total">${tasks.length}</span></header>${tasks.length?`<div class="desk-task-list">${tasks.slice(0,3).map(t=>`<button class="desk-task" onclick="${trainingSafe(deskAction(t.action))}"><span class="desk-task-tag ${t.tone}">${t.tag}</span><strong>${trainingSafe(t.title)}</strong><span>${trainingSafe(t.detail)}</span>${deskIcon('arrow')}</button>`).join('')}</div>${tasks.length>3?`<details class="desk-extra-tasks"><summary>${tasks.length-3} fler att följa upp</summary>${tasks.slice(3).map(t=>deskLink(t.title,t.action)).join('')}</details>`:''}`:'<div class="desk-clear"><span aria-hidden="true">✓</span><h3>Utrymme att förbereda laget</h3><p>Inga prioriterade åtgärder just nu. Se över kedjorna och träningsplanen inför nästa match.</p></div>'}</section>
    </div>
    <section class="desk-metrics" aria-label="Läget i klubben">${metrics.map(m=>`<button onclick="deskNavigate('${m.page}')"><span>${m.label}</span><strong>${m.value}</strong><small>${m.detail}</small></button>`).join('')}</section>
    <div class="desk-bottom-grid">
      <section class="desk-panel"><header><h2>Matchveckan</h2>${deskLink('Kalender',{page:'calendar'})}</header>${fixtures.upcoming.length?fixtures.upcoming.map(g=>`<div class="desk-fixture-row"><time datetime="${g.date}">${new Date(g.date+'T12:00:00Z').toLocaleDateString('sv-SE',{day:'numeric',month:'short',timeZone:'UTC'})}</time><div><strong>${trainingSafe(g.opponent)}</strong><span>${g.venue} · ${g.type}</span></div><span aria-hidden="true">→</span></div>`).join(''):'<p class="desk-empty">Inga kommande matcher är bokade ännu.</p>'}${fixtures.recent.length?`<h3 class="desk-small-heading">Senaste resultaten</h3>${fixtures.recent.map(g=>`<div class="desk-result"><span>${trainingSafe(g.opponent)}<small>${calText(g.date)} · ${g.venue}</small></span><strong class="${g.own>g.against?'won':g.own<g.against?'lost':''}">${g.own}–${g.against}</strong></div>`).join('')}`:''}</section>
      <section class="desk-panel"><header><h2>Träningsplanen</h2>${deskLink('Planera',{page:'training'})}</header><div class="desk-training-summary"><span class="desk-kicker">${session?'Nästa planerade pass':'Inför nästa steg'}</span><h3>${trainingSafe(type?.name||type?.label||'Matchförberedelser')}</h3><p>${session?`${trainingDays()-training.day} planerade pass återstår före nästa matchdag.`:'Passen inför nästa match är genomförda. Laguttagningen ligger hos dig.'}</p></div><div class="desk-training-footer"><span>Belastning i truppen</span><strong>${roster.filter(p=>p.fatigue>=35).length} spelare med hög belastning</strong><p>Fysisk beredskap, skador och matchroller bör vägas ihop när du väljer laget.</p></div></section>
      <section class="desk-panel"><header><h2>Styrelsens uppdrag</h2>${deskLink('Visa',{page:'board'})}</header><div class="desk-board-list">${goals.map(g=>`<article><div><strong>${trainingSafe(g.title)}</strong><span class="${g.met?'on-track':''}">${g.status}</span></div><progress max="1" value="${Math.max(0,Math.min(1,g.progress))}" aria-label="${trainingSafe(g.title)}"></progress><p>${trainingSafe(g.detail)}</p></article>`).join('')}</div></section>
    </div>
  </section>`;
}
