"use strict";

const CALENDAR_PACE_STOPS={injuries:'Nya skador',affairs:'Besked om affärer',scouting:'Nya scoutrapporter',stories:'Spelarresor',projects:'Klubbprojekt'};
let calendarPaceRun=null;
function calendarPaceSettings(){return state.calendar?.pace||{version:1,match:'eve',stops:Object.fromEntries(Object.keys(CALENDAR_PACE_STOPS).map(k=>[k,true])),reviewed:[],last:null};}
function calendarPaceStore(){return state.calendar.pace??=JSON.parse(JSON.stringify(calendarPaceSettings()));}
function calendarPaceSet(key,value){
 if(calendarPaceRun||!state.careerStarted)return false;const p=calendarPaceStore();
 if(key==='match'&&['eve','day'].includes(value))p.match=value;
 else if(Object.hasOwn(CALENDAR_PACE_STOPS,key)&&typeof value==='boolean')p.stops[key]=value;else return false;
 save();return true;
}
function calendarPaceSignals(){
 const settings=calendarPaceSettings(),rows=[],date=state.calendar.date;
 for(const item of managerAgendaItems())if(item.requiresDecision&&item.due&&calGap(date,item.due)<=1&&item.area!=='match'){
  const a=item.action||{},action=a.messageId!==undefined?{message:a.messageId}:a.deal?{deal:a.deal}:{page:a.page||'inbox'};
  rows.push({key:'deadline:'+item.id+':'+item.due,kind:'decision',title:'Sista svarsdag närmar sig: '+item.title,action,urgent:true});
 }
 for(const row of hubAffairRows()){
  const d=row.d,kind=row.key.split(':')[0],decision=kind==='incoming'?d.status==='pending'&&(!d.stage||d.stage==='offer'):kind==='transfer'?d.status==='pending'&&Boolean(d.counter):kind==='loan'?d.status==='counter':false;
  if(kind==='incoming'&&d.status==='pending'&&d.stage==='replacement_wait'&&d.expiresDate&&calGap(date,d.expiresDate)<=1){rows.push({key:`linked-deadline:${d.id}:${d.expiresDate}`,kind:'affairs',title:'Villkorad försäljning: sista svarsdag för '+row.name,action:{deal:row.key},urgent:true});}
  if(!decision)continue;const due=kind==='incoming'?d.expiresDate:kind==='loan'?d.expires:d.dueDate,urgent=Boolean(due&&calGap(date,due)<=1);
  if(settings.stops.affairs||urgent)rows.push({key:`affair:${row.key}:${d.stage||d.status}:${d.negotiationRounds||d.rounds||0}:${due||''}`,kind:'affairs',title:urgent?'Sista svarsdag närmar sig: '+row.name:'Ett bud behöver bedömas: '+row.name,action:{deal:row.key},urgent});
 }
 for(const o of transferRivalRows()){const d=state.recruitment.deals.find(d=>d.status==='pending'&&d.buyer===managerClub()&&samePlayerId(d.playerId,o.playerId));if(d&&!recruitDealAgreed(d)&&calGap(date,transferRivalDeadline(o))<=1)rows.push({key:`rival-deadline:${o.id}`,kind:'affairs',title:'Rivalen kan snart få besked om '+o.name,action:{deal:'transfer:'+d.id},urgent:true});}
 if(settings.stops.stories)for(const s of state.stories?.active||[])if(s.club===managerClub()&&s.status==='decision')rows.push({key:`story:${s.id}:${s.stage}:${s.decisionAt}`,kind:'stories',title:s.title,action:{story:s.id}});
 if(settings.stops.projects)for(const a of clubVision()?.alerts||[])if(!a.acknowledged)rows.push({key:'project:'+a.key,kind:'projects',title:a.title,action:{page:'board'}});
 if(settings.stops.injuries)for(const p of managerRoster())if(!medicalReady(p)&&p.health?.injury)rows.push({key:`injury:${p.id}:${p.health.injury.started||p.health.injury.date||''}:${p.health.injury.name||''}:${p.health.injury.initial||0}`,kind:'injuries',title:p.name+': ny skadebedömning',action:{medicalPlayer:p.id}});
 if(typeof careerProjectSignals==='function')rows.push(...careerProjectSignals(settings.stops.projects));
 return rows.filter(r=>r.urgent||!settings.reviewed.includes(r.key));
}
function calendarPaceBoundary(){
 const pending=pendingManagerDecision();if(pending)return {key:'required:'+pending.id,kind:'decision',title:pending.title,action:{message:pending.id},urgent:true};
 if(preseasonPlan()?.pending)return {key:'season-plan',kind:'decision',title:'Välj säsongens riktning',action:{page:'season'},urgent:true};
 if(!managerCanPlay()||!managerEmployed())return {key:'employment',kind:'decision',title:'Ditt tränaruppdrag behöver ett besked',action:{page:'manager'},urgent:true};
 if(state.live&&!state.live.finished)return {key:'live',kind:'match',title:'En match pågår',action:{page:'match'},urgent:true};
 if(state.season.phase==='review')return {key:'review',kind:'season',title:'Säsongen är avslutad',action:{page:'season'},urgent:true};
 if(medicalPending())return {key:'medical',kind:'decision',title:'Ett medicinskt beslut väntar',action:{page:'medical'},urgent:true};
 const signals=calendarPaceSignals(),urgent=signals.find(s=>s.urgent);if(urgent)return urgent;
 const target=calendarTarget(),gap=target?calGap(state.calendar.date,target):0,threshold=calendarPaceSettings().match==='eve'?1:0;
 if(gap<=threshold&&state.calendar.completedMatchDate!==state.calendar.date)return {key:'match:'+target,kind:'match',title:gap>0?'Nästa match spelas i morgon – välj trupp och plan':'Matchdag – laget väntar på dig',action:{page:state.season.phase==='preseason'?'season':'lines'},urgent:true};
 return signals[0]||null;
}
function calendarPaceStart(review=false){
 if(calendarPaceRun||dayTransition||careerScreen||!state.careerStarted)return false;
 const settings=calendarPaceStore();
 if(review&&settings.last?.club===managerClub()&&settings.last.stop&&!settings.last.stop.urgent){settings.reviewed=[...new Set([...settings.reviewed,settings.last.stop.key])].slice(-240);}
 const stop=calendarPaceBoundary();
 if(stop){settings.last={club:managerClub(),start:state.calendar.date,end:state.calendar.date,days:0,total:0,messages:[],stop};save();render();return false;}
 const shell=document.querySelector('.game-shell'),tx={state,club:managerClub(),start:state.calendar.date,date:state.calendar.date,page:state.page,days:0,coachHome:typeof coachWorkspaceEnabled==='function'&&coachWorkspaceEnabled()&&state.page==='home',before:new Set(state.training.messages.map(m=>m.id)),messages:[],cancelled:false,shell,inert:Boolean(shell?.inert)};
 calendarPaceRun=tx;if(shell)shell.inert=true;calendarPaceRender();setTimeout(()=>calendarPaceTick(tx),0);return true;
}
function calendarPaceTick(tx){
 if(!tx||calendarPaceRun!==tx)return;
 if(state!==tx.state||managerClub()!==tx.club||careerScreen){calendarPaceDispose();return;}
 if(tx.cancelled||state.calendar.date!==tx.date||state.page!==tx.page){calendarPaceFinish(tx,{key:'paused',kind:'pause',title:'Framflyttningen är pausad',action:{page:'calendar'}});return;}
 const boundary=calendarPaceBoundary();if(boundary){calendarPaceFinish(tx,boundary);return;}
 try{
  const before=state.calendar.date;calendarContinue();tx.date=state.calendar.date;tx.page=state.page;
  if(tx.date===before){calendarPaceFinish(tx,{key:'blocked',kind:'decision',title:'Dagen behöver din uppmärksamhet',action:{page:state.page},urgent:true});return;}
  tx.days++;
  const fresh=state.training.messages.filter(m=>!tx.before.has(m.id));for(const m of fresh){tx.before.add(m.id);tx.messages.push({id:m.id,title:m.title,category:m.category,date:m.date||tx.date});}
  let stop=calendarPaceBoundary();
  if(!stop){const message=fresh.find(m=>calendarPaceSettings().stops.scouting&&['Chefsscout','Scouting','Scoutrapport'].includes(m.category)||calendarPaceSettings().stops.affairs&&['Sportchefen','Rekrytering'].includes(m.category));if(message)stop={key:'message:'+message.id,kind:'report',title:message.title,action:{message:message.id}};}
  if(stop||tx.days>=14){calendarPaceFinish(tx,stop||{key:'limit',kind:'pause',title:'Två veckor har gått – stäm av läget',action:{page:'home'}});return;}
  calendarPaceRender();setTimeout(()=>calendarPaceTick(tx),0);
 }catch(error){
  console.error('Calendar progression stopped',error);
  // Never retry a potentially partially applied day, or persist it as completed.
  calendarPaceFinish(tx,{key:'error',kind:'error',title:'Framflyttningen avbröts. Kontrollera dagens läge innan du fortsätter.',action:{page:'calendar'},urgent:true},false);
 }
}
function calendarPaceFinish(tx,stop,persist=true){
 if(calendarPaceRun!==tx)return;
 calendarPaceStore().last={club:tx.club,start:tx.start,end:state.calendar.date,days:tx.days,total:tx.messages.length,messages:tx.messages.slice(-12),stop};
 if(persist&&tx.coachHome&&typeof coachWorkspaceEnabled==='function'&&coachWorkspaceEnabled()){state.page='home';overviewUI.stories=false;overviewUI.press=false;}
 calendarPaceDispose();if(persist)save();render();
}
function calendarPaceCancel(){if(calendarPaceRun){calendarPaceRun.cancelled=true;calendarPaceTick(calendarPaceRun);}}
function calendarPaceDispose(){const tx=calendarPaceRun;if(tx?.shell)tx.shell.inert=tx.inert;calendarPaceRun=null;const root=document.getElementById('calendar-pace-root');if(root)root.innerHTML='';const button=document.getElementById('continueGame');if(button)button.disabled=Boolean(careerScreen||!state.careerStarted);}
function calendarPaceRender(){
 const tx=calendarPaceRun,root=document.getElementById('calendar-pace-root');if(!tx||!root)return;
 root.innerHTML=`<aside class="calendar-pace-progress" role="status"><span>Följer kalendern · ${tx.days} dagar · ${calText(state.calendar.date)}</span><button type="button" class="btn secondary" onclick="calendarPaceCancel()">Stoppa framflyttning</button></aside>`;
 const next=document.getElementById('continueGame');if(next)next.disabled=true;
}
function calendarPaceOpen(){
 const last=calendarPaceSettings().last,action=last?.club===managerClub()?last.stop?.action:null;if(!action)return;
 if(action.message!==undefined)openManagerMessage(action.message);
 else if(action.deal)officeOpenDeal(action.deal);
 else if(action.story)storiesOpen(action.story);
 else if(action.medicalPlayer!==undefined)overviewOpenMedical(action.medicalPlayer);
 else deskNavigate(action.page);
}
function calendarPaceView(){
 const settings=calendarPaceSettings(),last=settings.last?.club===managerClub()?settings.last:null;
 return `<section class="calendar-pace"><div class="calendar-pace-main"><div><strong>Spela fram till nästa vägval</strong><small>Kalendern sköter vardagen. Du tar över vid dina valda stopp.</small></div><button type="button" class="btn secondary" onclick="calendarPaceStart()" ${calendarPaceRun||dayTransition||!managerEmployed()?'disabled':''}>Till nästa relevanta händelse →</button></div>${last?`<div class="pace-result" role="status"><strong>${trainingSafe(last.stop.title)}</strong><span>${last.days} dagar · ${last.total} nya rapporter · ${calText(last.end)}</span><button type="button" class="desk-link" onclick="calendarPaceOpen()">Öppna underlaget →</button>${!last.stop.urgent&&!['pause','error'].includes(last.stop.kind)?'<button type="button" class="desk-link" onclick="calendarPaceStart(true)">Granskat – fortsätt vidare →</button>':''}${last.messages.length?`<details><summary>Samlad rapport · senaste ${last.messages.length}</summary>${last.messages.map(m=>`<p><small>${calText(m.date)} · ${trainingSafe(m.category)}</small><button type="button" class="desk-link" onclick="openManagerMessage(${Number(m.id)})">${trainingSafe(m.title)}</button></p>`).join('')}</details>`:''}</div>`:''}<details class="pace-preferences"><summary>Välj när kalendern ska stanna</summary><label>Inför matcher<select onchange="calendarPaceSet('match',this.value)"><option value="eve" ${settings.match==='eve'?'selected':''}>Dagen före – förbered laget</option><option value="day" ${settings.match==='day'?'selected':''}>På matchdagen</option></select></label><div>${Object.entries(CALENDAR_PACE_STOPS).map(([key,label])=>`<label><input type="checkbox" ${settings.stops[key]?'checked':''} onchange="calendarPaceSet('${key}',this.checked)">${label}</label>`).join('')}</div><p>Obligatoriska svar, sista svarsdagar, pågående matcher och säsongsslut stoppar alltid. Högst 14 dagar per framflyttning. Rapporterna finns kvar i inkorgen. Knappen Fortsätt flyttar fortfarande en dag i taget.</p></details></section>`;
}
function validateCalendarPace(s){
 const p=s.calendar?.pace;if(!p)return;const str=v=>typeof v==='string'&&v.length<=12000,date=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v));
 const fail=()=>{throw Error('Ogiltiga kalenderinställningar i sparfilen.');};
 if(p.version!==1||!['eve','day'].includes(p.match)||!p.stops||Object.keys(p.stops).length!==Object.keys(CALENDAR_PACE_STOPS).length||Object.keys(CALENDAR_PACE_STOPS).some(k=>typeof p.stops[k]!=='boolean')||!Array.isArray(p.reviewed)||p.reviewed.length>240||p.reviewed.some(k=>!str(k)))fail();
 const r=p.last;if(!r)return;
 if(!str(r.club)||!date(r.start)||!date(r.end)||r.end<r.start||!Number.isInteger(r.days)||r.days<0||r.days>14||!Number.isInteger(r.total)||r.total<0||!Array.isArray(r.messages)||r.messages.length>12||r.messages.length>r.total||!r.stop||!str(r.stop.key)||!str(r.stop.title)||!['decision','match','season','affairs','stories','projects','injuries','report','pause','error'].includes(r.stop.kind)||r.stop.urgent!==undefined&&typeof r.stop.urgent!=='boolean')fail();
 if(!r.stop.action||typeof r.stop.action!=='object'||Array.isArray(r.stop.action)||Object.keys(r.stop.action).some(k=>!['page','message','deal','story','medicalPlayer'].includes(k))||Object.values(r.stop.action).some(v=>!['number','string'].includes(typeof v)))fail();
 for(const m of r.messages)if(!Number.isInteger(m.id)||!str(m.title)||!str(m.category)||!date(m.date))fail();
}

const pacedCalendarView=matchesCalendarView;
matchesCalendarView=function(){return calendarPaceView()+pacedCalendarView();};
