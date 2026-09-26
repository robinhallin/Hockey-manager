"use strict";
const overviewUI={stories:false,press:false,player:null,decisions:false};
function overviewToggle(section,open){
 if(!['stories','press'].includes(section))return;
 overviewUI[section]=open??!overviewUI[section];render();queueInterfaceSave();
 document.getElementById('overview-'+section)?.scrollIntoView?.({block:'start',behavior:'smooth'});
}
function overviewWorkspaceView(){
 return managerDeskView()+`<div class="ov-community">${overviewUI.stories?`<section id="overview-stories" class="overview-section"><button class="btn secondary" onclick="overviewToggle('stories',false)">Stäng historier</button>${storiesView()}</section>`:''}${overviewUI.press?`<section id="overview-press" class="overview-section"><button class="btn secondary" onclick="overviewToggle('press',false)">Stäng pressrummet</button>${pressView()}</section>`:''}</div>`;
}
function staffFollowupView(){
 const f=ensureManagerFeedback(),items=managerOffice2Items().filter(x=>x.requiresDecision||['critical','high','medium'].includes(x.level));
 const coverage=recruitmentCoverage(),arrivals=f.followups.filter(r=>r.club===managerClub()&&r.year===state.season.year),active=arrivals.filter(r=>r.status==='active'),closed=arrivals.filter(r=>r.status!=='active');
 const promises=lockerPromises().filter(({p,q})=>p&&!q.resolved&&(!q.club||q.club===managerClub()));
 const focus=coachFocus(),missions=officeScoutMissions();
 const nextObservation=missions.map(m=>m.nextDate).filter(Boolean).sort()[0],nextMatch=deskFixtures().upcoming[0];
 const arrival=r=>`<article class="staff-followup"><h3>${playerReference(r.playerId,r.name)}</h3><p>${r.games}/5 bedömda matcher · ${Math.round(r.seconds/60)} minuter · ${r.points} poäng</p><p>${trainingSafe(r.result||'Assisterande tränaren följer introduktionen. Nästa avstämning efter nästa fullständiga tävlingsmatch.')}</p>${r.excused?`<small>${r.excused} matcher undantagna av medicinska skäl.</small>`:''}${deskLink('Se spelarens plats',{page:'lines'})}</article>`;
 return `<section class="staff-workspace staff-concrete"><header class="workspace-heading"><div><span class="desk-kicker">${trainingSafe(managerClub())} · ${calText(state.calendar.date)}</span><h1>Stab & uppföljning</h1><p>Vad behöver beslutas, vem följer frågan och när får du ett nytt underlag?</p></div></header>
 <section class="staff-section"><h2>Dina nästa beslut <span>${items.length}</span></h2>${items.map((item,i)=>managerOffice2Row(item,i)).join('')||'<p class="staff-empty">Inga frågor kräver ett beslut just nu. Staben fortsätter sitt arbete fram till nästa avstämning.</p>'}</section>
 <section class="staff-section"><h2>Truppens täckning just nu</h2><p>Sportchefen räknar spelare och tillgänglighet. Bedömd kvalitet skapar ingen antalsbrist.</p><div class="staff-coverage">${coverage.map(c=>`<article><h3>${c.name}</h3><strong>${c.count} spelklara av ${c.total}</strong><p>Riktmärke ${c.target}. ${c.need?`${c.need} platser saknar spelklar täckning${c.temporary?' på grund av tillfällig frånvaro':''}.`:'Ingen antalsbrist.'}</p><small>Nästa säsong: ${c.future.length} säkrade · ${c.futureNeed} platser att planera.</small>${c.need?deskLink('Planera täckningen',{page:'transfers',tab:'needs'}):c.futureNeed?`<button class="desk-link" onclick="scoutingOpenContracts('${c.profile}')">Se över avtalen →</button>`:deskLink('Granska truppen',{page:'squad'})}</article>`).join('')}</div></section>
 <section class="staff-section"><h2>Pågående uppföljning</h2><div class="staff-followup-grid"><article class="staff-followup"><span class="desk-kicker">SCOUTCHEFEN</span><h3>${missions.length} scoutuppdrag</h3><p>${missions.length?(nextObservation?`Nästa observation: ${calText(nextObservation)}. Därefter uppdateras spelarens rapport.`:'Rapportdatum saknas för det äldre uppdraget. Granska scoutplanen.'):'Inga uppdrag pågår. Skapa ett uppdrag när du har ett konkret behov.'}</p>${deskLink('Öppna scoutplanen',{page:'transfers',tab:'missions'})}</article><article class="staff-followup"><span class="desk-kicker">ASSISTERANDE TRÄNAREN</span><h3>${promises.length} aktiva roll- och istidslöften</h3><p>${promises.length?`${promises.slice(0,3).map(({p})=>trainingSafe(p.name)).join(', ')}${promises.length>3?' med flera':''}. ${nextMatch?.date?'Nästa möjliga avstämning: '+calText(nextMatch.date)+'.':'Nästa avstämning efter en tillgänglig tävlingsmatch.'} Se krav och återstående matcher i omklädningsrummet.`:'Inga aktiva löften behöver följas upp. Löpande rollförväntningar bedöms efter faktisk användning.'}</p><button class="desk-link" onclick="deskNavigate('locker');lockerSet('tab','promises')">Se löften och matchunderlag →</button></article></div>${active.length?`<h3>Introduktion i laget · ${active.length}</h3><div class="staff-followup-grid">${active.map(arrival).join('')}</div>`:''}${focus?`<details><summary>Matchanalytikerns aktiva fokus</summary>${feedbackCoachView(focus)}${deskLink('Granska matchunderlaget',{page:'statistics'})}</details>`:'<p>Inget särskilt analysfokus pågår. Välj ett först när matchunderlaget visar något du vill följa.</p>'}</section>
 <details class="staff-section"><summary>Avslutad uppföljning · ${closed.length}</summary>${closed.map(arrival).join('')||'<p>Avslutade introduktioner visas här.</p>'}${f.coachHistory.filter(c=>c.club===managerClub()).map(feedbackCoachView).join('')}</details></section>`;
}

// Overview read models only. Selections are presentation state, never career actions.
function overviewButton(label,action,cls='ov-link',extra=''){
 return `<button type="button" class="${cls}" onclick="${trainingSafe(action)}" ${extra}>${trainingSafe(label)}${deskIcon('arrow')}</button>`;
}
function overviewSelectPlayer(id){
 const previous=overviewUI.player;
 overviewUI.player=id!==null&&developmentRoster().some(p=>samePlayerId(p.id,id))?id:null;
 render();queueInterfaceSave();
 if(overviewUI.player!==null){const panel=document.getElementById('overview-player-detail');panel?.focus?.({preventScroll:true});if(typeof window!=='undefined'&&window.innerWidth<1100)panel?.scrollIntoView?.({block:'nearest'});}
 else document.getElementById('overview-watch-'+previous)?.focus?.({preventScroll:true});
}
function overviewExpandDecisions(){overviewUI.decisions=!overviewUI.decisions;render();queueInterfaceSave();document.getElementById('overview-more-decisions')?.focus?.({preventScroll:true});}
function overviewSupport(panel){
 if(!['today','followup','club','staff','day'].includes(panel))return;
 officeUI.panel=officeUI.panel===panel?'today':panel;render();queueInterfaceSave();
 document.getElementById('overview-support-'+panel)?.focus?.({preventScroll:true});
}
function overviewDecisionItems(){
 const items=managerOffice2VisibleItems().filter(item=>(item.requiresDecision||['critical','high','medium'].includes(item.level))&&!(item.area==='match'&&state.live&&!state.live.finished));
 if(preseasonPlan()?.pending)items.unshift({id:'season:direction',title:'Välj säsongens riktning',detail:'Sätt mål och bestäm hur assisterande ska använda träningsmatcherna.',tag:'Säsong',requiresDecision:true,score:160,level:'critical',action:{page:'season'}});
 return items.map(item=>{
  let due=null;
  if(item.action?.deal?.startsWith('incoming:'))due=state.recruitment.incoming.find(o=>'incoming:'+o.id===item.action.deal)?.expiresDate;
  if(item.area==='match')due=deskFixtures().upcoming[0]?.date;
  return {...item,due};
 }).sort((a,b)=>Number(b.requiresDecision)-Number(a.requiresDecision)||(a.due||'9999').localeCompare(b.due||'9999')||b.score-a.score);
}
function overviewDeadline(item){
 if(item.due){const days=calGap(state.calendar.date,item.due);return days<=0?'I dag':days===1?'I morgon':new Date(item.due+'T12:00:00Z').toLocaleDateString('sv-SE',{day:'numeric',month:'short',timeZone:'UTC'});}
 return item.requiresDecision?'Ditt svar':item.area==='training'?'I dag':'Att följa';
}
function overviewDecisionsView(items){
 const visible=items.slice(0,3);
 const label=item=>item.action?.deal?'Granska':item.action?.messageId!==undefined?'Svara':item.area==='training'?'Justera':item.area==='match'?'Välj trupp':'Öppna';
 return `<section class="ov-panel ov-decisions" aria-label="Dagens prioriteringar"><header><h2>Beslut som väntar <span class="ov-count">${items.length}</span></h2><span class="ov-muted">${items.filter(x=>x.requiresDecision).length} kräver svar</span></header><div class="ov-decision-list">${visible.map(item=>{
 const action=managerOffice2Action(item),icon=item.action?.deal?'arrow':({training:'training',match:'team',medical:'training',contracts:'club',locker:'team'})[item.area]||'mail';
 return `<article class="ov-decision" data-level="${item.level}"><span class="ov-decision-icon">${deskIcon(icon)}</span><div class="ov-decision-copy"><strong>${trainingSafe(item.title)}</strong><p title="${trainingSafe(item.detail)}">${trainingSafe(item.detail)}</p></div><span class="ov-due">${trainingSafe(overviewDeadline(item))}</span>${action?overviewButton(label(item),action):''}</article>`;
 }).join('')||'<div class="ov-empty"><strong>Du är i fas.</strong><p>Inga prioriterade ärenden just nu. Planera veckan eller fortsätt till nästa dag.</p></div>'}</div>${items.length>3?`<p class="ov-more">${items.length-3} ytterligare ärenden finns i inkorgen. ${overviewButton('Öppna inkorgen',"trainingOpen('inbox')")}</p>`:''}</section>`;
}
function overviewFixture(){
 const next=deskFixtures().upcoming[0],live=state.live&&!state.live.finished?state.live:null;
 if(live)return {...matchVenue(live),date:state.calendar.date,opponent:live.opponent,live,type:live.friendly?'Träningsmatch':leagueName()};
 if(!next)return null;
 const friendly=state.calendar.friendlies.find(f=>f.club===managerClub()&&!f.played&&f.date===next.date&&f.opponent===next.opponent);
 const ownHome=friendly?friendly.home!==false:next.venue==='Hemma';
 const home=ownHome?managerClub():next.opponent,away=ownHome?next.opponent:managerClub();
 return {...next,home,away,ownHome,arena:clubArena(home)?.name||home};
}
function overviewMatchView(fixture){
 const next=deskNextMatch(deskFixtures().upcoming[0]),opposition=!fixture?.live&&fixture?managerWeekOpponent(fixture):null;
 const title=fixture?.live?next.eyebrow:fixture?.type==='Träningsmatch'?'Nästa träningsmatch':'Nästa match';
 const gap=fixture?calGap(state.calendar.date,fixture.date):null;
 const caption=fixture?`${fixture.type} · ${gap===0?'I dag':gap===1?'I morgon':new Date(fixture.date+'T12:00:00Z').toLocaleDateString('sv-SE',{weekday:'short',day:'numeric',month:'short',timeZone:'UTC'})}`:'Säsongsplanering';
 const values=fixture?.live?(fixture.ownHome?[fixture.live.hv,fixture.live.opp]:[fixture.live.opp,fixture.live.hv]):null;
 const score=values?values.join(' – '):'–';
 return `<section class="ov-panel ov-match"><header><h2>${trainingSafe(title)}</h2><span class="ov-muted">${trainingSafe(caption)}</span></header>${fixture?`<div class="ov-matchup"><div>${clubCrest(fixture.home)}<strong>${trainingSafe(fixture.home)}</strong><small>HEMMA</small></div><div class="ov-versus ${values?'ov-score':''}">${score}</div><div>${clubCrest(fixture.away)}<strong>${trainingSafe(fixture.away)}</strong><small>BORTA</small></div></div><div class="ov-venue">${trainingSafe(fixture.arena)}${fixture.live?` · Period ${fixture.live.period} · ${fixture.live.minute}:${String(fixture.live.second||0).padStart(2,'0')}`:''}</div>`:`<div class="ov-empty"><strong>${trainingSafe(next.title)}</strong><p>${trainingSafe(next.detail)}</p></div>`}<div class="ov-match-bottom">${opposition?`<p class="ov-match-advice">${trainingSafe(opposition.advice)}</p>`:''}<div class="ov-match-actions">${overviewButton(next.label,deskAction(next.action),'ov-primary')}${opposition?overviewButton('Motståndsrapport',`rivalsOpen(${JSON.stringify(fixture.opponent)})`):''}</div></div></section>`;
}
function overviewWeekView(){
 const days=managerWeekDays();
 return `<section class="ov-panel ov-week"><header><h2>Kommande sju dagar</h2>${overviewButton('Öppna kalender',`officeOpenDay('${state.calendar.date}')`)}</header><nav aria-label="Kommande sju dagar" class="ov-days">${days.map((d,i)=>{
 const isMatch=d.games.length>0,g=d.games[0],date=new Date(d.date+'T12:00:00Z');
 const name=isMatch?d.games.map(g=>g.opponent).join(' / '):TRAINING_SESSIONS[d.type]?.name||'Planering';
 const detail=isMatch?d.games.every(g=>g.played)?'Spelad':g.venue||'Matchdag':d.done?'Genomfört':i===0?'I dag':'Planerat';
 return `<button type="button" class="ov-day ${isMatch?'ov-day-match':''}" ${i===0?'aria-current="date"':''} onclick="officeOpenDay('${d.date}')"><time datetime="${d.date}">${date.toLocaleDateString('sv-SE',{weekday:'short',day:'numeric',timeZone:'UTC'})}</time><span class="ov-day-icon">${isMatch?clubCrest(g.opponent,'small'):deskIcon(d.type==='recovery'||d.type==='rest'?'training':'calendar')}</span><strong>${trainingSafe(name)}</strong><small>${trainingSafe(detail)}</small></button>`;
 }).join('')}</nav></section>`;
}
function overviewWatchPlayers(){
 return developmentRoster().map(p=>{
  const change=developmentChange(p),injury=p.health?.injury,ready=medicalReady(p),energy=Math.round(100-(p.fatigue||0));
  if(injury&&!ready)return {p,score:100+(injury.remaining||0),tone:'negative',signal:'Ej matchklar',reason:injury.name||'Rehabilitering pågår',advice:'Granska rehabilitering och uttagning före comeback.',action:isOwnPlayer(p)?`overviewOpenMedical(${JSON.stringify(p.id)})`:`developmentOpenPlayer(${JSON.stringify(p.id)},'training',true)`,button:isOwnPlayer(p)?'Medicinsk plan':'Se utvecklingsplan'};
  if((p.fatigue||0)>=35)return {p,score:70+(p.fatigue||0)/10,tone:'warning',signal:'Hög belastning',reason:`${energy} % ork · behov av återhämtning`,advice:'Väg återhämtning mot träning och nästa match.',action:`developmentOpenPlayer(${JSON.stringify(p.id)},'training',true)`,button:'Planera återhämtning'};
  if(change?.net>0)return {p,score:45+Math.min(20,change.net),tone:'positive',signal:'Utvecklas',reason:`+${change.net} attributsteg sedan uppföljningens början`,advice:'Följ prestation och faktisk istid innan du förändrar spelarens roll.',action:`developmentOpenPlayer(${JSON.stringify(p.id)},'training',true)`,button:'Se utvecklingen'};
  if(change?.net<0)return {p,score:55+Math.min(10,-change.net),tone:'warning',signal:'Tapp i attribut',reason:`${change.net} attributsteg sedan uppföljningens början`,advice:'Se över utvecklingsplan, belastning och spelarens roll.',action:`developmentOpenPlayer(${JSON.stringify(p.id)},'training',true)`,button:'Se utvecklingen'};
  if(contractNeedsDecision(p)&&isOwnPlayer(p))return {p,score:30,tone:'neutral',signal:'Utgående avtal',reason:'Kontrakt på sista året',advice:'Bedöm platsen i nästa säsongs trupp innan du förhandlar.',action:`selectPlayer(${JSON.stringify(p.id)});profileWorkspace.tab='contract';render()`,button:'Granska kontrakt'};
  return null;
 }).filter(Boolean).sort((a,b)=>b.score-a.score||a.p.name.localeCompare(b.p.name,'sv')).slice(0,4);
}
function overviewWatchView(rows){
 return `<section class="ov-panel ov-watch"><header><h2>Spelare att följa</h2>${overviewButton('Hela truppen','overviewOpenDevelopment()')}</header><div class="ov-watch-list">${rows.map(row=>`<button type="button" id="overview-watch-${trainingSafe(row.p.id)}" class="ov-watch-row" aria-pressed="${samePlayerId(overviewUI.player,row.p.id)}" aria-controls="overview-player-detail" onclick="${trainingSafe(`overviewSelectPlayer(${JSON.stringify(row.p.id)})`)}"><span><strong>${trainingSafe(row.p.name)}</strong><small>${trainingSafe(row.p.pos)} · ${row.p.age} år · ${trainingSafe(developmentEnvironment(row.p))}</small></span><span class="ov-signal" data-tone="${row.tone}">${row.signal}</span><span class="ov-watch-reason">${trainingSafe(row.reason)}</span>${deskIcon('arrow')}</button>`).join('')||'<div class="ov-empty"><strong>Inga tydliga avvikelser just nu.</strong><p>Spelare lyfts här vid hög belastning, skada, attributförändring eller utgående avtal.</p></div>'}</div></section>`;
}
function overviewPlayerDetail(rows){
 if(overviewUI.player==null)return '';
 const p=developmentRoster().find(p=>samePlayerId(p.id,overviewUI.player));if(!p)return '';
 const row=rows.find(r=>samePlayerId(r.p.id,p.id));
 const r=p.academy?juniorAssessment(p):playerAssessment(p);
 const stars=potential=>p.academy?(potential?r.potential:r.current):r.known?starRatingHTML(potential?r.potentialLow:r.low,potential?r.potentialHigh:r.high,potential,r.staff.name):'Ej bedömd';
 const initial=p.name.split(' ').map(s=>s[0]).slice(0,2).join('');
 return `<aside class="ov-player-detail" id="overview-player-detail" tabindex="-1" aria-label="Vald spelare: ${trainingSafe(p.name)}"><div class="ov-player-identity"><span class="ov-monogram" aria-hidden="true">${trainingSafe(initial)}</span><div><h2>${trainingSafe(p.name)}</h2><p>${p.age} år · ${trainingSafe(p.pos)} · ${trainingSafe(developmentEnvironment(p))}</p><div class="ov-player-stars"><span>${stars(false)}<small>Nivå</small></span><span>${stars(true)}<small>Potential · bedömning</small></span></div></div></div><div class="ov-player-reason"><h3>Varför han visas</h3><strong>${trainingSafe(row?.signal||'Vald spelare')}</strong><p>${trainingSafe(row?.reason||'Läget har förändrats. Öppna profilen för aktuellt underlag.')}</p></div><div class="ov-player-advice"><h3>Nästa steg</h3><p>${trainingSafe(row?.advice||'Följ spelarens roll och utveckling.')}</p><div>${overviewButton('Öppna spelarprofil',`deskOpenPlayer(${JSON.stringify(p.id)})`,'ov-primary')}${row?overviewButton(row.button,row.action):''}</div></div><button type="button" class="ov-close" aria-label="Stäng spelaröversikten" onclick="overviewSelectPlayer(null)">×</button></aside>`;
}
function overviewTableView(){
 const table=leagueTable(),index=table.findIndex(t=>t.name===managerClub()),start=Math.max(0,Math.min(index-2,table.length-5)),played=table.some(t=>t.gp>0);
 return `<section class="ov-panel ov-table"><header><h2>Läget i ${trainingSafe(leagueName())}</h2>${overviewButton('Hela tabellen',"deskNavigate('table')")}</header><table><caption>${played?'Grundserien':'Grundserien har inte börjat'}</caption><thead><tr><th scope="col">Plats</th><th scope="col">Lag</th><th scope="col" title="Spelade matcher">M</th><th scope="col" title="Poäng">P</th></tr></thead><tbody>${table.slice(start,start+5).map((t,i)=>`<tr class="${t.name===managerClub()?'ov-own':''}"><td>${played?start+i+1:'–'}</td><th scope="row">${clubReference(t.name)}</th><td>${t.gp}</td><td>${t.pts}</td></tr>`).join('')}</tbody></table></section>`;
}
function overviewDashboardView(){
 const items=overviewDecisionItems(),fixture=overviewFixture(),watch=overviewWatchPlayers(),roster=managerRoster(),ready=roster.filter(medicalReady).length;
 const waiting=officeWaiting(),panel=officeUI.panel||'today',gap=fixture?calGap(state.calendar.date,fixture.date):null;
 const daily=fixture?.live?deskNextMatch().eyebrow:gap===0?'Matchdag':gap===1?'Match i morgon':gap!==null?`Nästa match om ${gap} dagar`:'Planera nästa steg';
 return `<section class="ov-dashboard">${typeof mediaPromptView==='function'?mediaPromptView():''}<header class="ov-heading"><div><span class="ov-eyebrow">${trainingSafe(managerClub())} · ${seasonLabel()}</span><h1>Översikt</h1><p>${trainingSafe(daily)} · ${items.length?`${items.length} ${items.length===1?'ärende':'ärenden'} att ta ställning till`:'Inga prioriterade ärenden'}</p></div><div class="ov-heading-action">${overviewButton('Öppna dagens program',`officeOpenDay('${state.calendar.date}')`)}</div></header><div class="ov-grid">${overviewMatchView(fixture)}${overviewDecisionsView(items)}${overviewWatchView(watch)}${overviewWeekView()}${overviewTableView()}</div>${overviewPlayerDetail(watch)}<footer class="ov-status" aria-label="Truppens läge"><span><strong>${ready}/${roster.length}</strong> matchklara</span>${overviewButton('Medicinsk status',"deskNavigate('medical')")}<span class="ov-status-wait"><b>Väntar på</b> ${trainingSafe(waiting.value)}</span>${waiting.action?overviewButton(waiting.button,waiting.action.deal?`officeOpenDeal(${JSON.stringify(waiting.action.deal)})`:deskAction(waiting.action)):''}<span class="ov-status-money">Klubbkassa <strong>${careerMoney(state.money)}</strong></span></footer><details class="ov-support-fold"><summary>Fördjupning & uppföljning</summary><nav class="ov-support-nav" aria-label="Fördjupning på översikten">${[['followup','Uppföljning'],['day','Träning & juniorer'],['club','Resultat & ekonomi'],['staff','Ansvar & bevakning']].map(([key,label])=>`<button type="button" id="overview-support-${key}" aria-expanded="${panel===key}" onclick="overviewSupport('${key}')">${label}</button>`).join('')}<button type="button" aria-expanded="${Boolean(overviewUI.stories)}" onclick="overviewToggle('stories')">Säsongens historier</button><button type="button" aria-expanded="${Boolean(overviewUI.press)}" onclick="overviewToggle('press')">Press & supportrar</button></nav>${panel!=='today'?`<section class="ov-support">${panel==='followup'?officeFollowupView():panel==='club'?officeClubView():panel==='day'?overviewDailyDetailsView():managerOffice2DelegationView()}</section>`:''}</details></section>`;
}

function overviewOpenDevelopment(){deskNavigate('training');Object.assign(developmentUI,{tab:'players',detail:false,query:'',filter:'all'});render();queueInterfaceSave();}

function overviewDailyDetailsView(){return managerLifeMorningView()+managerJ20BriefView()+managerJ20ReviewView();}

function overviewOpenMedical(id){deskNavigate('medical');developmentUI.medicalTab='cases';developmentSet('medical',id);}
