'use strict';
// A spatial interface over the career's existing decisions and match snapshots.
// No separate clock, rewards, invented conflicts or second match simulation.
const coachJourneyUI={owner:null,club:null,date:null,live:null,slot:null,stage:null,story:null,player:null,benchSet:false};
function coachJourneyEnabled(){return clubhouseAvailable()&&(clubhouseEnabled()||typeof coachWorkspaceEnabled==='function'&&coachWorkspaceEnabled());}
function coachJourneyCurrent(){return coachJourneyUI.owner===state&&coachJourneyUI.club===managerClub()&&coachJourneyUI.date===state.calendar?.date;}
function coachJourneySync(){
 const u=coachJourneyUI,m=state.live;
 if(u.owner!==state||u.club!==managerClub()||u.date!==state.calendar?.date){Object.assign(u,{owner:state,club:managerClub(),date:state.calendar?.date,live:null,slot:null,stage:null,story:null,player:null});}
 if(u.live!==m)u.benchSet=false;
 if(u.live!==m||u.slot!==socialTalkSlot(m)){u.live=m;u.slot=socialTalkSlot(m);u.stage=null;u.player=null;}
 if(u.story&&!coachJourneyStories().some(s=>s.id===u.story))u.story=null;
}
function coachJourneyStories(){return [...(state.stories?.active||[]),...(state.stories?.archive||[])].filter(s=>s.club===managerClub()&&s.year===state.season.year).slice(0,8);}
function coachJourneyCases(){return state.relationships?.club===managerClub()?(state.relationships.cases||[]).filter(c=>c.status!=='closed'&&clubhousePlayer(c.playerId)):[];}
function coachJourneyGroups(){
 const roster=managerRoster(),present=p=>p&&clubhousePresence(p).present,groups=[];
 for(const m of state.relationships?.club===managerClub()?state.relationships.mentors||[]:[]){
  const a=clubhousePlayer(m.playerId),b=clubhousePlayer(m.mentorId);
  if(m.status==='active'&&present(a)&&present(b))groups.push({ids:[String(a.id),String(b.id)],title:'En väg in i laget',detail:`${b.name} är fadder åt ${a.name}. ${m.shared||0}/3 gemensamma matcher med minst fem minuters istid.`});
 }
 const pairs=Object.values(state.locker?.pairs||{}).filter(pair=>pair.bond>=45&&pair.ids.every(id=>present(roster.find(p=>samePlayerId(p.id,id))))).sort((a,b)=>b.bond-a.bond||a.ids.join().localeCompare(b.ids.join()));
 for(const pair of pairs)if(!groups.some(g=>g.ids.some(id=>pair.ids.includes(id)))){const ps=pair.ids.map(clubhousePlayer);groups.push({ids:pair.ids,title:'Samspel som vuxit fram',detail:ps.map(p=>p.name).join(' och ')+`: ${Math.round(pair.bond)}/100 i registrerat samspel.`});if(groups.length>=3)break;}
 return groups.slice(0,3);
}
const coachJourneyVisitor=clubhouseLifeVisitor;
clubhouseLifeVisitor=function(){
 const base=coachJourneyVisitor();if(base&&['request','followup'].includes(base.kind)||clubhouseUI.officeGuest&&samePlayerId(clubhouseUI.officeGuest.playerId,clubhouseUI.player))return base;
 const c=coachJourneyCases().find(c=>{const p=clubhousePlayer(c.playerId);return clubhousePresence(p).present&&(!c.heard||!c.plan);});
 if(c){const p=clubhousePlayer(c.playerId);return {club:managerClub(),date:state.calendar.date,playerId:String(p.id),name:p.name,kind:'relationship',label:'Vill prata om sin plats',detail:c.evidence,caseId:c.id,priority:110};}
 return base;
};
function coachJourneyRelationship(id,action){
 const c=coachJourneyCases().find(c=>c.id===id);if(!c||!clubhouseLifeGuard(c.playerId)||!['listen','plan','mediate'].includes(action))return false;
 relationshipAction(id,action);return true;
}
function coachJourneyStory(id){
 if(!coachJourneyEnabled()||state.live&&!state.live.finished||!coachJourneyStories().some(s=>s.id===id))return false;
 coachJourneySync();coachJourneyUI.story=id;clubhouseUI.briefing=true;clubhouseUI.wardrobe=false;clubhouseUI.player=null;render();return true;
}
function coachJourneyChoose(id,choice){
 const s=coachJourneyStories().find(s=>s.id===id);if(!coachJourneyCurrent()||!coachJourneyEnabled()||!clubhouseIsRoom()||coachJourneyUI.story!==id||!s||s.status!=='decision'||state.live&&!state.live.finished)return false;
 if(choice!=='open'&&!storiesChoices(s).some(c=>c.id===choice))return false;
 storiesChoose(id,choice);return true;
}
function coachJourneyStoryView(s){
 return `<div class="ch-panel-title"><span>EN HISTORIA I DITT LAG</span><h2>${trainingSafe(s.title)}</h2><p>${trainingSafe(storiesNext(s))}</p></div><ol class="cj-chapters">${s.chapters.slice(-5).map(c=>`<li><small>${calText(c.date)}</small><h3>${trainingSafe(c.title)}</h3><p>${trainingSafe(c.text)}</p></li>`).join('')}</ol>${s.status==='decision'?`<h3>Vilket besked ger du?</h3>${storiesChoices(s).map(c=>clubhouseControl(c.label,`coachJourneyChoose(${JSON.stringify(s.id)},${JSON.stringify(c.id)})`,c.detail)).join('')}${clubhouseControl('Låt uttagningen förbli öppen',`coachJourneyChoose(${JSON.stringify(s.id)},'open')`,'Inget nytt löfte. Tidigare överenskommelser gäller.')}`:s.expectation?`<p class="cj-commitment">${trainingSafe(s.expectation.detail)}<br>${s.expectation.qualified||0}/${s.expectation.needed} kvalificerade matcher · ${s.expectation.eligible||0}/${s.expectation.matches} bedömbara.</p>`:''}${clubhouseControl('Granska laguttagningen',"clubhouseOpen('lines')",'Omsätt beskedet i faktisk matchning')}`;
}
const coachJourneyPanel=clubhousePanel;
clubhousePanel=function(m){
 if(coachJourneyUI.owner===state&&coachJourneyUI.story&&clubhouseUI.briefing&&!clubhouseUI.wardrobe){const s=coachJourneyStories().find(s=>s.id===coachJourneyUI.story);if(s)return coachJourneyStoryView(s);}
 let html=coachJourneyPanel(m);const p=clubhousePlayer();if(!p||!['office','locker'].includes(m.room)||clubhouseUI.wardrobe)return html;
 const c=coachJourneyCases().find(c=>samePlayerId(c.playerId,p.id)),group=coachJourneyGroups().find(g=>g.ids.includes(String(p.id))),memory=journeyPlayer(p.id);
 if(c)html+=`<section class="cj-case"><small>ROLLEN OCH VERKLIGHETEN</small><h3>Spelaren vill förstå sitt ansvar</h3><p>${trainingSafe(c.evidence)}</p><p>Spänning ${Math.round(c.tension)}/100 · ${c.good}/3 raka matcher med rätt ansvar</p>${clubhouseControl('Lyssna på problemet',`coachJourneyRelationship(${JSON.stringify(c.id)},'listen')`,'Bekräfta situationen. Istiden återstår att ändra.',c.heard||state.locker.turn-p.social.lastTalk<3?'disabled':'')}${clubhouseControl('Sätt en konkret väg tillbaka',`coachJourneyRelationship(${JSON.stringify(c.id)},'plan')`,'Rätt ansvar i tre raka bedömbara matcher. Fyra utan förändring kostar förtroende.',c.plan?'disabled':'')}${clubhouseControl('Be en betrodd ledare medla',`coachJourneyRelationship(${JSON.stringify(c.id)},'mediate')`,'En kapten eller nära ledare måste ha minst 50 i förtroende.',c.mediated||!relationshipLeaders().some(l=>l.p!==p&&l.p.social.trust>=50&&(samePlayerId(l.p.id,state.locker.captainId)||l.peers.includes(p)))?'disabled':'')}</section>`;
 if(group)html+=`<section class="cj-case"><h3>${trainingSafe(group.title)}</h3><p>${trainingSafe(group.detail)}</p></section>`;
 if(memory?.events.length)html+=`<section class="cj-case"><h3>Det ni bär med er</h3>${memory.events.filter(e=>e.club===m.club).slice(-2).reverse().map(e=>`<p><small>${calText(e.date)}</small><strong>${trainingSafe(e.title)}</strong>${trainingSafe(e.detail)}</p>`).join('')}</section>`;
 for(const s of coachJourneyStories().filter(s=>s.status!=='closed'&&s.ids.some(id=>samePlayerId(id,p.id))))html+=clubhouseControl(s.title,`coachJourneyStory(${JSON.stringify(s.id)})`,storiesNext(s));
 if(p.pos!=='MV'&&!playerLoan(p)&&clubhousePresence(p).present&&!coachJourneyStories().some(s=>s.status!=='closed'&&s.ids.some(id=>samePlayerId(id,p.id))))html+=clubhouseControl('Diskutera en provperiod',`coachJourneyStartStory(${JSON.stringify(String(p.id))})`,'Välj ansvar och följ det mot tävlingsmatcherna.',clubLocked()?'disabled':'');
 return html;
};
function coachJourneyStartStory(id){
 if(!clubhouseLifeGuard(id))return false;
 if(!journeyStart(id))return false;
 const s=coachJourneyStories().find(s=>s.ids.includes(String(id))&&s.type==='breakthrough'&&s.status!=='closed');if(!s)return false;
 clubhouseGo('locker');return coachJourneyStory(s.id);
}
const coachJourneyBriefing=clubhouseBriefing;
clubhouseBriefing=function(){coachJourneyUI.story=null;coachJourneyBriefing();};
const coachJourneyClose=clubhouseCloseMeeting;
clubhouseCloseMeeting=function(){coachJourneyUI.story=null;coachJourneyUI.player=null;ClubhouseScene.focus?.(null);coachJourneyClose();};
const coachJourneySelectPlayer=clubhouseSelect;
clubhouseSelect=function(id){const ok=coachJourneySelectPlayer(id);if(ok){coachJourneyUI.story=null;ClubhouseScene.focus?.(String(id));}return ok;};
function coachJourneyPulse(m){
 const stories=coachJourneyStories().filter(s=>s.status!=='closed'),cases=coachJourneyCases(),groups=coachJourneyGroups(),captain=clubhousePlayer(state.locker.captainId);
 return `<section class="cj-pulse" aria-label="Livet i laget"><small>${m.room==='office'?'BAKOM NÄSTA RESULTAT':'HÄR INNE LEVER LAGET'}</small><h2>${cases.length?'Ord behöver bli handling':stories.length?'Nästa kapitel är ditt':'Människorna bakom tröjorna'}</h2>${m.room==='locker'&&captain?`<button onclick="clubhouseSelect(${trainingSafe(JSON.stringify(String(captain.id)))})"><b>C</b><span>${trainingSafe(captain.name)}<small>Kapten · ${Math.round(captain.social.trust)}/100 i förtroende</small></span><i>↗</i></button>`:''}${cases.slice(0,2).map(c=>`<button onclick="coachJourneyMeet(${trainingSafe(JSON.stringify(c.playerId))})"><b>!</b><span>${trainingSafe(c.name)}<small>${trainingSafe(c.evidence)}</small></span><i>↗</i></button>`).join('')}${stories.slice(0,2).map(s=>`<button onclick="coachJourneyStory(${trainingSafe(JSON.stringify(s.id))})"><b>↳</b><span>${trainingSafe(s.title)}<small>${trainingSafe(storiesNext(s))}</small></span><i>↗</i></button>`).join('')}${m.room==='locker'?groups.slice(0,1).map(g=>`<button onclick="clubhouseSelect(${trainingSafe(JSON.stringify(g.ids[0]))})"><b>○</b><span>${trainingSafe(g.title)}<small>${trainingSafe(g.detail)}</small></span><i>↗</i></button>`).join(''):''}${!stories.length&&!cases.length?`<p>${m.room==='locker'?'Välj en spelare. Lyssna, diskutera ansvar eller följ en provperiod.':'Spelarnas besked och milstolpar följer med genom säsongen.'}</p>`:''}${coachJourneyMatchInvite()}</section>`;
}
function coachJourneyMeet(id){if(!coachJourneyEnabled()||!clubhousePlayer(id))return false;clubhouseGo('locker');return clubhouseSelect(id);}
function coachJourneyMatchInvite(){
 const m=state.live,g=matchBriefFixture();
 if(m&&!m.finished)return clubhouseControl('Till matchlaget','coachJourneyPrepare()','Fortsätt den pågående matchen');
 if(g&&g.date===state.calendar.date&&state.calendar.completedMatchDate!==g.date)return clubhouseControl('Samla matchlaget','coachJourneyPrepare()',g.opponent+' · '+g.kind);
 if(m?.finished&&state.calendar.completedMatchDate===state.calendar.date)return clubhouseControl('Till eftersnacket','coachJourneyPrepare()','Laget och matchrapporten väntar');
 return '';
}
const coachJourneyWorld=clubhouseWorldView;
clubhouseWorldView=function(html){coachJourneySync();const result=coachJourneyWorld(html),m=clubhouseModel();return clubhouseIsRoom()&&['office','locker'].includes(m.room)?result.replace('<footer class="ch-world-bottom"',coachJourneyPulse(m)+'<footer class="ch-world-bottom"'):result;};
const coachJourneyModel=clubhouseModel;
clubhouseModel=function(){const m=coachJourneyModel();m.groups=coachJourneyGroups();m.cases=coachJourneyCases().map(c=>String(c.playerId));return m;};

// The actual board remains responsible for IDs, swaps, medical restrictions,
// special teams, saving and undo. The room changes its presentation only.
const coachJourneyTactics=tacticsWorkspaceView;
tacticsWorkspaceView=function(){
 const dilemma=personalMatchDilemmaView(),html=coachJourneyTactics();if(!coachJourneyEnabled())return html;
 const board=dilemma&&html.startsWith(dilemma)?html.slice(dilemma.length):html;
 return `<section class="cj-tactic-board" aria-label="Tränarens taktiktavla"><div class="cj-board-caption"><span>DIN TAKTIKTAVLA</span><p>Flytta magneterna · välj roller · följ samspel och ork</p></div>${board}${dilemma&&board!==html?`<details class="cj-board-dilemma"><summary>Assistentens uttagningsförslag</summary>${dilemma}</details>`:''}</section>`;
};

function coachJourneyPrepare(){
 if(!coachJourneyEnabled())return false;
 const g=matchBriefFixture();
 if((!state.live||state.live.finished&&state.calendar.completedMatchDate!==state.calendar.date)&&(!g||g.date!==state.calendar.date||pendingManagerDecision()))return false;
 if(!state.live||state.live.finished&&state.calendar.completedMatchDate!==state.calendar.date){
  const before=state.live;
  if(g.kind==='Träningsmatch')calendarPlayFriendly(g.id);else createMatch();
  if(state.live===before)return false;
 }
 if(!state.live)return false;
 coachJourneySync();coachJourneyUI.stage=state.live.finished?'locker':state.live.running||state.live.socialStarted?.[socialTalkSlot()]?'bench':'locker';deskNavigate('match');return true;
}
function coachJourneyStage(){
 coachJourneySync();const m=state.live;if(!coachJourneyEnabled()||state.page!=='match'||!m)return null;
 if(m.running)return 'bench';
 if(!coachJourneyUI.stage)coachJourneyUI.stage=canTeamTalk()?'locker':'bench';
 return coachJourneyUI.stage;
}
function coachJourneyMove(stage){
 if(!coachJourneyEnabled()||state.page!=='match'||!state.live||!['locker','tunnel','bench'].includes(stage))return false;
 if(stage==='tunnel'&&!coachJourneyCanEnterTunnel())return false;
 if(stage==='locker'&&state.live.running)pauseMatch('Du samlar dig hos laget.');
 coachJourneySync();coachJourneyUI.stage=stage;coachJourneyUI.player=null;
 if(stage==='bench'&&!coachJourneyUI.benchSet){coachJourneyUI.benchSet=true;studioVisualMode='3d';studioCamera3D='bench';studioExpanded3D=false;}
 render();return true;
}
function coachJourneyCanEnterTunnel(){const m=state.live;return Boolean(m&&!m.finished&&!m.running&&!m.socialStarted?.[socialTalkSlot()]&&m.minute===0&&m.second===0);}
function coachJourneySelect(id){
 if(!['locker','tunnel'].includes(coachJourneyStage()))return false;
 const p=clubhousePlayer(id);if(!p||!clubhousePresence(p).present)return false;
 coachJourneyUI.player=String(p.id);render();ClubhouseScene.focus?.(String(p.id));return true;
}
function coachJourneyMatchModel(){
 const m=clubhouseModel(),stage=coachJourneyStage();m.room=stage==='tunnel'?'tunnel':'locker';m.matchRoom=true;m.matchPlayers=socialMatchPlayers().map(p=>String(p.id));m.reactions=state.live.socialTalks?.[socialTalkSlot()]?.reactions||[];return m;
}
function coachJourneyRoute(stage){return `<nav class="cj-route" aria-label="Matchdagens väg">${[['locker','Omklädningsrum'],['tunnel','Spelartunnel'],['bench','Tränarbåset']].map(([key,label],i)=>`<button aria-current="${stage===key?'step':'false'}" onclick="coachJourneyMove('${key}')" ${key==='tunnel'&&!coachJourneyCanEnterTunnel()?'disabled':''}><small>0${i+1}</small>${label}<span>→</span></button>`).join('')}</nav>`;}
function coachJourneyRoomView(stage){
 const m=state.live,v=matchVenue(),p=clubhousePlayer(coachJourneyUI.player),report=m.socialTalks?.[socialTalkSlot()],re=p&&report?.reactions.find(r=>samePlayerId(r.id,p.id));
 return `<section class="cj-match-room ch-world" id="cj-match-room" data-stage="${stage}" style="--ch-club:${careerIdentity(managerClub()).color}" aria-label="Matchdag i klubbhuset"><div class="ch-environment"><div class="ch-stage" id="clubhouse-stage"><canvas id="clubhouse-canvas" aria-hidden="true"></canvas><p id="clubhouse-render-status" role="status">Laget gör sig redo…</p><div class="ch-hotspots" id="clubhouse-hotspots"></div></div></div><header class="ch-world-heading"><span class="ch-world-location">${trainingSafe(managerClub())} · ${calText(state.calendar.date)}</span><h1>${stage==='tunnel'?'Nu går vi ut.':m.finished?'Efter slutsignalen':m.period>1?'Tillbaka hos laget':'Innan dörren öppnas'}</h1><p>${trainingSafe(v.home)} ${m.finished?matchVenueScore().join(' – '):'–'} ${trainingSafe(v.away)} · ${trainingSafe(v.arena)}</p></header><aside class="cj-match-talk"><small>${m.finished?'EFTERSNACKET':stage==='tunnel'?'PÅ VÄG MOT ISEN':'DITT LAG. DINA ORD.'}</small>${stage==='tunnel'?`<h2>${trainingSafe(managerClub())}</h2><p>Matchplanen är satt. Nästa beslut tar du från båset.</p><p>${report?report.reactions.filter(r=>r.effect>0).length+' spelare tog till sig ditt budskap.':'Du valde att låta förberedelserna tala.'}</p>${personalMatchPreviewView()}${clubhouseControl('Ta plats i båset',"coachJourneyMove('bench')",'Matchen startar när du väljer nedsläpp.')}`:teamTalkPanel()+clubhouseControl(m.finished?'Öppna matchrapporten':coachJourneyCanEnterTunnel()?'Gå mot isen':'Tillbaka till båset',m.finished?"coachJourneyReport()":coachJourneyCanEnterTunnel()?"coachJourneyMove('tunnel')":"coachJourneyMove('bench')",m.finished?'Prestation, faktisk istid och dina besluts följder':'Du kan gå vidare utan lagsnack.')}<label class="cj-reaction-picker">Följ en spelares reaktion<select aria-label="Följ en spelares reaktion" onchange="coachJourneySelect(this.value)"><option value="">Välj spelare</option>${socialMatchPlayers().map(q=>`<option value="${trainingSafe(q.id)}" ${samePlayerId(q.id,p?.id)?'selected':''}>${trainingSafe(q.name)}</option>`).join('')}</select></label>${p?`<section class="cj-selected-reaction">${squadPortrait(p)}<h3>${trainingSafe(p.name)}</h3><p>${trainingSafe(lineupPlayerPlace(p))} · ${tacticsEnergy(p)}% energi</p><p>${trainingSafe(re?re.reason:lockerFactors(p)[0]?.detail||'Redo att ta sin uppgift.')}</p><strong>${re?re.effect>0?'Tog till sig budskapet':re.effect<0?'Budskapet landade fel':'Neutral reaktion':socialPersonality(p)}</strong></section>`:''}<button class="cj-subtle" onclick="coachJourneyMove('bench')">${m.finished?'Till matchunderlaget':'Till matchvyn direkt'} ↗</button><button class="cj-subtle" onclick="deskNavigate('home')">Till kontoret</button></aside>${coachJourneyRoute(stage)}</section>`;
}
function coachJourneyReport(){if(!state.live?.finished||!coachJourneyEnabled())return false;coachJourneyUI.stage='bench';matchDesk.tab='report';render();return true;}
const coachJourneyMatchView=matchDeskView;
matchDeskView=function(){const stage=coachJourneyStage();if(stage&&stage!=='bench')return coachJourneyRoomView(stage);const html=coachJourneyMatchView();return stage?html.replace('mc-page md-workspace','mc-page md-workspace cj-bench').replace('<nav class="mc-utility"',coachJourneyRoute('bench')+'<nav class="mc-utility"'):html;};
const coachJourneyMount=clubhouseMount;
clubhouseMount=function(){
 const stage=coachJourneyStage(),canvas=document.getElementById('clubhouse-canvas');
 if(['locker','tunnel'].includes(stage)&&canvas&&typeof canvas.getContext==='function'){ClubhouseScene.mount(canvas,coachJourneyMatchModel(),clubhouseAppearanceData());return;}
 coachJourneyMount();
};
