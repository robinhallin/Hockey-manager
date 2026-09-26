"use strict";
// Presentation only. Match state, coaching decisions and clocks stay in their adapters.
function matchDeskTabs(){return state.live?.finished?
 [['feedback','Lagsnack'],['report','Prestation'],['stats','Statistik'],['players','Istid'],['events','Händelser'],['analysis','Avslut']]:
 [['feedback','Matchcoach'],['tactics','Taktik'],['changes','Byten'],['lineup','Kedjor'],['settings','Inställningar'],['stats','Statistik'],['players','Istid'],['events','Händelser'],['analysis','Avslut']];}
function matchDeskStats(){const s=matchStats();return [[state.live.analysis?.partial?'Registrerade skott på mål':'Skott på mål',s.shots],['Farliga chanser',s.danger],['Puckinnehav',s.possession,'%'],['Vunna tekningar',s.faceoffs],['Powerplay · mål/försök',s.pp],['Räddningar',s.saves]].map(([label,v,suffix])=>matchStatCard(label,matchVenueValues(v),suffix)).join('');}
function matchDeskEvents(){return `<div class="mc-events">${state.live.events.map(e=>`<p><time>P${e.period||state.live.period} · ${trainingSafe(e.time||'')}</time><span>${matchEventReference(e)}</span></p>`).join('')||'<p>Händelser registreras från nedsläpp.</p>'}</div>`;}
function matchDeskAnalysis(){return studioActive()?`<section class="mc-shot-analysis"><h3>Senaste avslutet</h3><div class="broadcast-shot">${studioShotView()}</div><h3>Spelarens beslut</h3><div class="broadcast-decision broadcast-shot">${studioDecisionView()}</div><p class="mc-note">Följ varför spelaren valde sitt alternativ. Reprisen öppnas under rinken och pausar matchen.</p></section>`:'<p class="mc-note">Detaljerade spelarbeslut saknas i den här äldre matchen. Skott och händelser finns under Statistik och Händelser.</p>';}
function matchDeskContent(){
 const m=state.live,tab=matchDesk.tab;
 if(tab==='report'&&m.finished){const report=analysisLiveReport();return analysisMatchVerdictView(report)+performanceView(report?.performance||m.performance)+(isPlayoffMatch()?seasonMatchPanel():'');}
 if(tab==='stats')return matchDetailedStats()+(isPlayoffMatch()?seasonMatchPanel():'');
 if(tab==='players')return matchPlayersView();
 if(tab==='events')return matchDeskEvents();
 if(tab==='analysis')return matchDeskAnalysis();
 if(m.finished)return matchFeedbackView();
 if(m.running&&!matchReadOnlyTab())return `<div class="mc-follow">${matchEvidenceView()}<p class="mc-note">Öppna ett coachval för att pausa och ändra. Statistik, istid, händelser och avslut kan följas under spel.</p></div>`;
 if(tab==='settings')return matchPreferencesView();
 if(tab==='tactics')return matchOrdersView();
 if(tab==='lineup')return lineupBoardView()+tacticalReviewView(tacticalReviewSnapshot());
 if(tab==='changes')return matchChangesView()+tacticalReviewView(tacticalReviewSnapshot());
 return matchFeedbackView();
}
function matchDeskCoachView(){
 const m=state.live,tabs=matchDeskTabs();if(!tabs.some(([key])=>key===matchDesk.tab))matchDesk.tab='feedback';
 return `<aside class="mc-coach" aria-label="Coachbänken"><header><div><span class="career-eyebrow">${trainingSafe(managerClub())} · COACHBÄNKEN</span><h2>${m.finished?'Efter slutsignalen':m.running?'Följ matchen':'Ditt nästa beslut'}</h2></div><span class="md-coach-state">${m.finished?'Avslutad':m.running?'Spelet pågår':'Matchen pausad'}</span></header><nav class="mc-tabs" aria-label="Coachval">${tabs.map(([key,label])=>`<button id="match-tab-${key}" onclick="matchTab('${key}')" aria-pressed="${matchDesk.tab===key}">${label}</button>`).join('')}</nav><div class="mc-coach-content" data-scroll-key="match-coach" data-match-panel="${matchDesk.tab}" tabindex="0" aria-label="${tabs.find(([key])=>key===matchDesk.tab)[1]}">${matchDesk.notice?`<p class="mc-response" role="status">${trainingSafe(matchDesk.notice)}</p>`:''}${matchDeskContent()}</div><footer>${m.finished?'Matchrapporten samlar lagets prestation och matchens utfall.':'Coachbeslut pausar matchen. Fortsätt med knappen överst.'}</footer></aside>`;
}
function matchDeskIceHeading(){
 const m=state.live,e=studioActive()?studioEngine():null,t=e?.teams[0];
 if(m.finished)return `${trainingSafe(managerClub())} · PÅ ISEN VID SLUTSIGNALEN`;
 return `${trainingSafe(managerClub())} · PÅ ISEN · ${t&&(t.requested||t.change||t.changeQueue.length||t.needsSetup)?'BYTE PÅGÅR':specialUnitOnIce()?'SPECIAL TEAMS':`KEDJA ${(t?.line??m.currentLine)+1} · BACKPAR ${(t?.pair??m.currentDefensePair)+1}`}`;
}
function matchDeskIcePlayers(){
 const players=studioActive()?studioPlayers(0):state.live.rink.actors.filter(a=>a.side==='own').map(a=>playerById(a.id)).filter(Boolean);
 return [...new Map(players.map(p=>[String(p.id),p])).values()].map(p=>{const energy=Math.round(matchEnergy(p));return `<span class="${energy<55?'tired':''}"><small>${trainingSafe(p.pos)} <b>${energy}%</b></small>${playerReference(p.id,p.name)}<progress max="100" value="${energy}" aria-label="${trainingSafe(p.name)}: ${energy} procent matchenergi"></progress></span>`;}).join('');
}
function matchDeskView(){
 const m=state.live,v=matchVenue(),home=careerIdentity(v.home),away=careerIdentity(v.away),score=matchVenueScore();
 const interval=!m.finished&&!m.running&&m.minute===0&&m.second===0&&m.period>1;
 const period=m.period===4?`Förlängning${(m.overtimePeriods||1)>1?' '+m.overtimePeriods:''}`:`Period ${m.period}`;
 const club=(name,identity,side)=>`<div class="mc-club"><span class="mc-badge" style="--club-color:${identity.color}">${clubCrest(name)}</span><strong>${trainingSafe(name)}</strong><small>${side}${name===managerClub()?' · DITT LAG':''}</small></div>`;
 const skaters=side=>studioActive()?studioEngine().skaters(side==='own'?0:1).length:m.rink.actors.filter(a=>a.side===side&&a.pos!=='MV').length;
 return `<div class="mc-page md-workspace ${studioActive()&&studioVisualMode==='3d'&&studioExpanded3D?'md-rink-focus':''} ${m.finished?'mc-finished':'mc-live'}"><nav class="mc-utility" aria-label="Matchvyn"><button onclick="deskNavigate('home')">← Kontoret</button><span>${m.friendly?'TRÄNINGSMATCH':trainingSafe(leagueName())} · ${trainingSafe(calText(state.calendar.date))}</span><button onclick="matchFullscreen()">Helskärm</button></nav>
 <header class="mc-header"><div class="mc-score">${club(v.home,home,'HEMMA')}<div class="mc-result"><span>${m.finished?'SLUTRESULTAT':interval?'PERIODPAUS':m.running?'LIVE':'PAUSAT'}</span><b>${score[0]}<i>–</i>${score[1]}</b><small>${period} · ${gameTime()}</small><small>${trainingSafe(v.arena)}</small></div>${club(v.away,away,'BORTA')}</div><div class="mc-playback ${m.finished?'':'mc-live-controls'}">${m.finished?'<button class="btn" onclick="state.analysis.selected=state.live.analysis?.id||\'latest\';matchesUI.analysis=\'overview\';coachingNavigate(\'statistics\')">Matchrapport →</button><button class="btn secondary" onclick="state.live=null;deskNavigate(\'home\')">Till kontoret</button>':`<button class="btn mc-play" id="match-play" onclick="matchPlay()">${m.running?'Ⅱ Pausa':medicalPending()?'Hantera spelarbesked':interval?'▶ Starta perioden':studioActive()&&!studioEngine().started?'▶ Starta matchen':'▶ Fortsätt'}</button><label>Visning<select onchange="rinkMode(this.value)" aria-label="Matchvisning">${Object.entries(MATCH_VIEW_MODES).map(([key,label])=>`<option value="${key}" ${m.rink.mode===key?'selected':''}>${label}</option>`).join('')}</select></label>${matchPlaybackControls(m)}`}</div></header>
 ${matchScoringView()}<div class="mc-situation"><strong>${skaters('own')} mot ${skaters('opponent')}${hockeySpecial('own')==='pp'?' · Powerplay':hockeySpecial('own')==='pk'?' · Boxplay':''}</strong><span>${matchPenaltyText()}${m.goaliePulled?' · Eget mål tomt':''}${m.aiGoaliePulled?' · Motståndarens mål tomt':''}</span></div>
 <section class="mc-stats" aria-label="Matchstatistik, hemmalaget först">${matchDeskStats()}</section>
 <div class="mc-layout"><div class="mc-ice-column">${studioActive()?studioView():rinkView(true)}<div class="mc-on-ice"><span>${matchDeskIceHeading()}</span><p>${matchDeskIcePlayers()}</p></div></div>${matchCoachView()}</div>
 <div class="md-status" role="status"><span class="md-status-dot ${m.running?'is-running':''}"></span>${m.finished?'Matchen är avslutad. Ge laget ett sista budskap och öppna matchrapporten.':m.running?'Matchen pågår. Spelarna följer din matchplan.':trainingSafe(medicalPending()?'Spelarbesked måste hanteras.':m.pauseReason||'Välj matchplan och prata med laget före nedsläpp.')}<span>${m.finished?'':m.timeoutUsed?'Timeout använd':'1 timeout kvar'}</span></div></div>`;
}
function matchDeskCapture(){const node=document.querySelector('.mc-coach-content');if(node?.dataset?.matchPanel){matchDesk.scroll??={};matchDesk.scroll[node.dataset.matchPanel]=node.scrollTop;}}
function matchDeskRestore(){const node=document.querySelector('.mc-coach-content');if(node?.dataset?.matchPanel)node.scrollTop=matchDesk.scroll?.[node.dataset.matchPanel]||0;}
function matchDeskRefreshPanel(){const node=document.querySelector('.mc-coach-content');if(!node||node.contains?.(document.activeElement))return;const scroll=node.scrollTop;node.innerHTML=matchLivePanel();node.scrollTop=scroll;}
