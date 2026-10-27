'use strict';
// The room reflects career evidence. The calendar and existing decisions own
// every consequence; reading an initiative never completes it.
Object.assign(clubhouseUI,{officeGuest:null,feedback:null});
let clubhouseLifeOwner=null,clubhousePaceOrigin=null,clubhousePaceFinishBase=null;

function clubhouseLifeSync(){
 if(clubhouseLifeOwner!==state){clubhouseLifeOwner=state;clubhousePaceOrigin=null;clubhouseUI.officeGuest=null;clubhouseUI.feedback=null;if(clubhouseRoomForPage()==='office')clubhouseUI.player=null;}
 const guest=clubhouseUI.officeGuest,p=guest&&clubhousePlayer(guest.playerId);
 if(guest&&(guest.club!==managerClub()||guest.date!==state.calendar.date||!p||!clubhousePresence(p).present)){
  if(clubhouseRoomForPage()==='office'&&samePlayerId(clubhouseUI.player,guest.playerId))clubhouseUI.player=null;
  clubhouseUI.officeGuest=null;
 }
 const feedback=clubhouseUI.feedback;if(feedback&&(feedback.club!==managerClub()||feedback.date!==state.calendar.date))clubhouseUI.feedback=null;
}

function clubhouseLifeRoom(item){
 const a=item.action||{};
 if(a.conversationPlayer!==undefined||a.promisePlayer!==undefined||item.area==='locker'||item.id?.startsWith('relationship:'))return 'locker';
 if(a.developmentPlayer!==undefined||['training','medical','development','juniors'].includes(item.area))return 'ice';
 if(a.deal||['scouting','transfers','recruitment','contracts'].includes(item.area))return 'recruit';
 return clubhouseDestinationRoom(a.page)||(['board','finance','staff'].includes(item.area)?'boardroom':'office');
}
function clubhouseLifeVisitor(){
 const club=managerClub(),date=state.calendar.date,held=clubhouseUI.officeGuest;
 if(clubhouseLifeOwner===state&&held?.club===club&&held.date===date&&samePlayerId(held.playerId,clubhouseUI.player)){
  const p=clubhousePlayer(held.playerId);if(p&&clubhousePresence(p).present)return {...held,name:p.name};
 }
 const candidates=[];
 for(const p of managerRoster()){
  if(!clubhousePresence(p).present||playerLoan(p))continue;
  const request=lockerRequests(p)[0],f=p.roleFollowup,review=f?.club===club&&!f.closed&&f.due<=date;
  const concern=lockerFactors(p).find(i=>['talk','relationships'].includes(i.action));
  if(request)candidates.push({playerId:String(p.id),name:p.name,kind:'request',label:'Ett svar väntar',detail:request.title,messageId:request.id,priority:120});
  else if(review)candidates.push({playerId:String(p.id),name:p.name,kind:'followup',label:'Dags att följa upp',detail:playerFollowupAdvice(p),priority:100});
  else if(concern&&state.locker.turn-p.social.lastTalk>=3)candidates.push({playerId:String(p.id),name:p.name,kind:'conversation',label:'Assistentens samtalsförslag',detail:concern.detail,priority:concern.priority});
 }
 const visitor=candidates.sort((a,b)=>b.priority-a.priority||a.playerId.localeCompare(b.playerId))[0];
 return visitor?{club,date,...visitor}:null;
}
function clubhouseLifeModel(m){
 const session=calendarSession(m.date),pass=TRAINING_SESSIONS[session.type],active=state.live&&!state.live.finished;
 const today=calendarFixtures().find(f=>f.date===m.date),finished=state.calendar.completedMatchDate===m.date;
 const phase=active?'live':finished?'after':today?'match':session.type==='recovery'?'recovery':'training';
 const title={live:'Matchen pågår',after:'Efter slutsignalen',match:'Matchdag',recovery:'En dag för återhämtning',training:pass.name}[phase];
 const agenda=managerAgendaItems().filter(item=>{
  const id=item.action?.conversationPlayer;if(id===undefined||item.requiresDecision)return true;
  // A completed conversation gets time to breathe. Future reviews stay in the
  // full agenda, but do not immediately ask for another meeting in today's room.
  if(item.due&&item.due>m.date)return false;
  const p=clubhousePlayer(id);return Boolean(p)&&(Boolean(item.due)||state.locker.turn-p.social.lastTalk>=3);
 }).map(item=>({...item,room:clubhouseLifeRoom(item)}));
 const counts=Object.fromEntries(Object.keys(CLUBHOUSE_ROOMS).map(room=>[room,agenda.filter(i=>i.room===room).length]));
 const visitor=phase==='live'?null:clubhouseLifeVisitor();
 const last=state.calendar.pace?.last?.club===m.club?state.calendar.pace.last:null;
 return {phase,title,session:session.type,description:pass.description,agenda,counts,visitor,last,
  match:deskNextMatch(deskFixtures().upcoming[0]),
  recent:state.analysis?.matches.find(r=>r.club===m.club&&r.finished&&!r.partial&&!r.abandoned&&r.date<=m.date&&calGap(r.date,m.date)<=3)||null};
}
const clubhouseLifeBaseModel=clubhouseModel;
clubhouseModel=function(){const m=clubhouseLifeBaseModel();m.life=clubhouseLifeModel(m);return m;};

function clubhouseAcceptVisitor(id){
 if(!clubhouseAvailable()||!clubhouseEnabled()||!clubhouseIsRoom()||clubhouseRoomForPage()!=='office'||state.live&&!state.live.finished)return false;
 const visitor=clubhouseLifeVisitor();if(!visitor||!samePlayerId(visitor.playerId,id))return false;
 clubhouseUI.officeGuest=visitor;return clubhouseSelect(id);
}
const clubhouseLifeSelect=clubhouseSelect;
clubhouseSelect=function(id){
 if(clubhouseRoomForPage()==='office'){
  const v=clubhouseLifeVisitor();if(!v||!samePlayerId(v.playerId,id))return false;
  clubhouseUI.officeGuest=v;
 }else if(clubhouseRoomForPage()!=='locker')return false;
 return clubhouseLifeSelect(id);
};
function clubhouseCloseMeeting(){
 clubhouseUI.player=null;clubhouseUI.officeGuest=null;clubhouseUI.wardrobe=false;clubhouseUI.briefing=false;render();
 document.getElementById('ch-day-round')?.focus?.({preventScroll:true});
}
function clubhouseLifeGuard(id){return clubhouseAvailable()&&clubhouseIsRoom()&&['office','locker'].includes(clubhouseRoomForPage())&&(clubhouseRoomForPage()!=='office'||samePlayerId(clubhouseLifeVisitor()?.playerId,id))&&samePlayerId(clubhouseUI.player,id)&&Boolean(clubhousePlayer(id))&&clubhousePresence(clubhousePlayer(id)).present&&!(state.live&&!state.live.finished);}
function clubhouseReviewConversation(id){if(!clubhouseLifeGuard(id))return false;return playerFollowupClose(id);}
function clubhouseReviewPromises(){
 const p=clubhousePlayer();if(!p||!clubhouseAvailable()||!clubhouseIsRoom()||!['office','locker'].includes(clubhouseRoomForPage()))return false;
 const origin={room:clubhouseUI.room,player:p.id,guest:clubhouseUI.officeGuest};
 clubhouseUI.work=true;deskNavigate('locker');clubhouseUI.origin=origin;clubhouseUI.work=true;lockerUI.tab='promises';lockerUI.player=p.id;render();return true;
}
const clubhouseLifeTalk=clubhouseTalk;
clubhouseTalk=function(id,topic){
 if(!clubhouseLifeGuard(id))return false;
 const p=clubhousePlayer(id),before=p.social.trust,ok=clubhouseLifeTalk(id,topic);if(!ok)return false;
 clubhouseUI.feedback={club:managerClub(),date:state.calendar.date,playerId:String(p.id),name:p.name,delta:Math.round((p.social.trust-before)*10)/10,text:p.social.lastResponse};
 render();if(typeof ClubhouseScene!=='undefined')ClubhouseScene.react?.(String(p.id),p.social.trust-before);return true;
};
const clubhouseLifePanel=clubhousePanel;
clubhousePanel=function(m){
 const p=clubhousePlayer();
 if(!clubhouseUI.wardrobe&&p&&['office','locker'].includes(m.room)){
  const requests=lockerRequests(p),promises=lockerPlayerPromises(p),f=p.roleFollowup;
  const review=f?.club===m.club&&!f.closed;
  const extra=`<section class="ch-meeting-followup"><h3>Vad händer efter samtalet?</h3><p>${trainingSafe(playerFollowupAdvice(p))}</p>${requests.map(r=>clubhouseControl('Svara på '+r.title,`openManagerMessage(${JSON.stringify(r.id)})`,'Detta är ett separat beslutsärende.')).join('')}${promises.length?clubhouseControl('Granska '+promises.length+' aktiva löften','clubhouseReviewPromises()','Samtalet ersätter inte avtalad istid.'):''}${review?`<p class="ch-review-date">${f.due<=m.date?'Avstämningen är här':'Nästa avstämning '+calText(f.due)}</p>${f.due<=m.date?clubhouseControl('Följ upp samtalet',`clubhouseReviewConversation(${JSON.stringify(String(p.id))})`,'Registrera genomgången. Aktiva löften fortsätter gälla.'):''}`:''}${(p.social.journal||[]).filter(e=>e.club===m.club).length?`<details class="ch-meeting-memory"><summary>Era senaste händelser</summary>${p.social.journal.filter(e=>e.club===m.club).slice(0,3).map(e=>`<article><small>${calText(e.date)}</small><strong>${trainingSafe(e.title)}</strong><p>${trainingSafe(e.body)}</p></article>`).join('')}</details>`:''}</section>`;
  return `${m.room==='office'?'<div class="ch-meeting-place">ENSKILT SAMTAL · TRÄNARKONTORET</div>':''}${clubhouseLifePanel(m)}${extra}`;
 }
 if(clubhouseUI.briefing&&!clubhouseUI.wardrobe)return clubhouseLifeBriefing(m);
 return clubhouseLifePanel(m);
};
function clubhouseLifeOpen(id){
 if(!clubhouseAvailable()||!clubhouseEnabled())return false;
 const m=clubhouseModel(),item=m.life.agenda.find(i=>i.id===id);if(!item)return false;
 const a=item.action||{};
 if(a.conversationPlayer!==undefined)return playerFollowupOpen(a.conversationPlayer);
 if(a.promisePlayer!==undefined)return managerOfficeOpenPromise(a.promisePlayer);
 if(a.developmentPlayer!==undefined)managerAgendaOpenDevelopment(a.developmentPlayer);
 else if(item.id.startsWith('relationship:'))managerDecisionNavigate('locker','relationships');
 else if(item.id.startsWith('formation:'))managerDecisionNavigate('statistics','trends');
 else if(item.reportId!==undefined)matchesOpenReport(item.reportId);
 else if(a.deal)officeOpenDeal(a.deal);
 else if(a.messageId!==undefined)openManagerMessage(a.messageId);
 else if(a.page)clubhouseOpen(a.page,a.tab);
 else return false;
 if(['home','locker'].includes(state.page)){clubhouseUI.work=true;render();}
 return true;
}
function clubhouseLifeBriefing(m){
 const rows=m.room==='office'?m.life.agenda:m.life.agenda.filter(i=>i.room===m.room);
 return `<div class="ch-panel-title"><span>TRÄNARENS RUNDA · ${calText(m.date)}</span><h2>${m.life.title}</h2><p>${rows.length?rows.length+' aktuella ärenden. Öppna underlaget och välj vad du vill göra.':'Inga prioriterade ärenden här just nu.'}</p></div>${rows.map(i=>`<article class="ch-day-item"><small>${trainingSafe(i.tag||'Uppföljning')} · ${CLUBHOUSE_ROOMS[i.room].name}${i.due?' · '+calText(i.due):''}</small><h3>${trainingSafe(i.title)}</h3><p>${trainingSafe(i.detail)}</p>${clubhouseControl('Öppna underlaget',`clubhouseLifeOpen(${JSON.stringify(i.id)})`,i.requiresDecision?'Ditt svar krävs.':'Granska innan du beslutar.')}</article>`).join('')}<div class="ch-day-program">${clubhouseControl('Dagens program',`officeOpenDay('${m.date}')`,m.life.description)}</div>`;
}
function clubhouseLifeCard(m){
 const life=m.life,top=life.agenda[0],visitor=life.visitor;
 return `<section class="ch-day-card" aria-label="Idag i klubben"><div class="ch-day-phase" data-phase="${life.phase}"><i></i><span>${life.title}</span></div>${visitor?`<button class="ch-visitor-invite" onclick="clubhouseAcceptVisitor(${trainingSafe(JSON.stringify(visitor.playerId))})"><small>${trainingSafe(visitor.label)}</small><strong>${trainingSafe(visitor.name)}</strong><span>Ta emot på kontoret ↗</span></button>`:top?`<button class="ch-day-priority" onclick="clubhouseLifeOpen(${trainingSafe(JSON.stringify(top.id))})"><small>${top.requiresDecision?'DITT SVAR BEHÖVS':'ASSISTENTENS UNDERLAG'}</small><strong>${trainingSafe(top.title)}</strong><span>${trainingSafe(top.tag||'Uppföljning')} ↗</span></button>`:`<p>${trainingSafe(life.description)}</p>`}<button id="ch-day-round" class="ch-day-round" onclick="clubhouseBriefing()">Dagens runda <b>${life.agenda.length}</b><span>→</span></button>${m.fixture?`<button class="ch-day-fixture" onclick="clubhouseOpen('calendar')"><small>${calText(m.fixture.date)} · ${trainingSafe(m.fixture.type)}</small><span>${trainingSafe(m.club)} – ${trainingSafe(m.fixture.opponent)}</span></button>`:''}${clubhouseLifePace(m)}</section>`;
}
function clubhouseLifeFeedback(m){
 const f=clubhouseUI.feedback;if(!f||f.club!==m.club||f.date!==m.date)return '';
 return `<aside class="ch-life-feedback" role="status" aria-label="Samtalets återkoppling"><button aria-label="Stäng återkopplingen" onclick="clubhouseUI.feedback=null;render()">×</button><small>EFTER DITT SAMTAL</small><strong>${trainingSafe(f.name)} <b data-tone="${f.delta>0?'good':f.delta<0?'warning':'neutral'}">Förtroende ${f.delta>0?'+':''}${f.delta}</b></strong><p>${trainingSafe(f.text)}</p><span>${lockerPlayerPromises(clubhousePlayer(f.playerId)||{}).length?'Aktiva löften följs fortfarande mot matcherna.':'Dina handlingar följs vidare i karriären.'}</span></aside>`;
}
function clubhouseLifeInstallPace(){
 if(clubhousePaceFinishBase)return;
 clubhousePaceFinishBase=calendarPaceFinish;
 calendarPaceFinish=function(tx,stop,persist=true){
  const origin=clubhousePaceOrigin?.tx===tx?clubhousePaceOrigin:null,finishing=calendarPaceRun===tx;
  if(origin)clubhousePaceOrigin=null;
  clubhousePaceFinishBase(tx,stop,persist);
  if(origin&&finishing&&persist&&origin.state===state&&origin.club===managerClub()&&clubhouseAvailable()&&clubhouseEnabled())clubhouseGo(origin.room);
 };
}
function clubhouseNextEvent(review=false){
 if(!clubhouseAvailable()||!clubhouseEnabled()||!clubhouseIsRoom())return false;
 clubhouseLifeInstallPace();
 const room=clubhouseRoomForPage();clubhouseUI.feedback=null;clubhouseUI.player=null;clubhouseUI.officeGuest=null;const oldDate=state.calendar.date,started=calendarPaceStart(review===true);
 if(started)clubhousePaceOrigin={tx:calendarPaceRun,state,club:managerClub(),room};
 if(!started&&state.calendar.date===oldDate&&state.calendar.pace?.last?.club===managerClub())clubhouseUI.briefing=true;
 render();return started;
}
function clubhouseLifePace(m){
 const last=m.life.last;if(!last||last.end!==m.date||!['pause','error'].includes(last.stop.kind)&&calendarPaceBoundary()?.key!==last.stop.key)return '';
 return `<section class="ch-life-pace" aria-label="Kalenderns senaste stopp"><small>${last.days?last.days+' dagar senare':'Kalendern stannar här'}</small><strong>${trainingSafe(last.stop.title)}</strong><button onclick="calendarPaceOpen()">Öppna händelsen ↗</button>${!last.stop.urgent&&!['pause','error'].includes(last.stop.kind)?'<button onclick="clubhouseNextEvent(true)">Granskat – fortsätt vidare →</button>':''}</section>`;
}
const clubhouseLifeObjects=clubhouseObjects;
clubhouseObjects=function(room,m){
 const objects=clubhouseLifeObjects(room,m);
 if(room==='office'&&m.life.visitor)objects.push(['visitor',m.life.visitor.name,`clubhouseAcceptVisitor(${JSON.stringify(m.life.visitor.playerId)})`,'Enskilt samtal']);
 return objects;
};
