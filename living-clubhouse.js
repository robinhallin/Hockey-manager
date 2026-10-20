'use strict';
// The clubhouse is a presentation of the current career, never another simulation.
const clubhouseUI={room:'office',player:null,section:'today',wardrobe:false,notice:'',lastClub:null};
const CLUBHOUSE_ROOMS={office:{name:'Tränarkontoret',subtitle:'Din plats. Ditt lag. Dina beslut.',number:'01'},locker:{name:'Omklädningsrummet',subtitle:'Människorna bakom matchtröjorna.',number:'02'},ice:{name:'Träningshallen',subtitle:'Här tar nästa match form.',number:'03'}};
function clubhousePreference(key,fallback){try{return localStorage.getItem('hm-clubhouse-'+key)||fallback;}catch{return fallback;}}
function clubhouseRemember(key,value){try{localStorage.setItem('hm-clubhouse-'+key,value);}catch{/* A private browser can still play. */}}
function clubhouseEnabled(){return typeof window!=='undefined'&&clubhousePreference('mode','coach')==='living';}
function clubhouseAvailable(){return state.careerStarted&&managerEmployed()&&!careerScreen&&!['clubSelect','clubDetail'].includes(state.page);}
function clubhouseMode(living){clubhouseRemember('mode',living?'living':'classic');clubhouseUI.notice='';render();}
function clubhouseRoomForPage(){return state.page==='locker'?'locker':clubhouseUI.room==='ice'?'ice':'office';}
function clubhouseIsRoom(){return clubhouseAvailable()&&clubhouseEnabled()&&['home','locker'].includes(state.page)&&!(state.page==='home'&&(overviewUI.stories||overviewUI.press));}
function clubhousePlayer(id=clubhouseUI.player){return managerRoster().find(p=>samePlayerId(p.id,id))||null;}
function clubhousePresence(p){
 if(internationalAway(p))return {present:false,label:'På landslagsuppdrag'};
 if(p.health?.injury)return {present:false,label:'Hos medicinska teamet'};
 return {present:true,label:'I omklädningsrummet'};
}
function clubhouseModel(){
 const room=clubhouseRoomForPage(),roster=managerRoster(),fixture=deskFixtures().upcoming[0],tasks=officeDecisions();
 return {room,club:managerClub(),date:state.calendar.date,coach:state.managerCareer?.name||'Huvudtränaren',color:careerIdentity(managerClub()).color,
  fixture:fixture?{opponent:fixture.opponent,date:fixture.date,type:fixture.type}:null,tasks,
  players:roster.map(p=>({id:String(p.id),name:p.name,pos:p.pos,number:p.number||p.jersey||roster.indexOf(p)+1,age:p.age,mood:lockerMood(p),trust:Math.round(p.social.trust),fatigue:Math.round(p.fatigue||0),presence:clubhousePresence(p),attention:lockerFactors(p)[0]?.text||'',captain:samePlayerId(p.id,state.locker.captainId)}))};
}
function clubhouseGo(room){
 if(!Object.hasOwn(CLUBHOUSE_ROOMS,room)||!clubhouseAvailable())return false;
 clubhouseUI.room=room;clubhouseUI.player=null;clubhouseUI.notice='';clubhouseUI.section='today';clubhouseUI.wardrobe=false;
 overviewUI.stories=false;overviewUI.press=false;clubhouseRemember('mode','living');
 clubhouseUI.navigating=true;try{deskNavigate(room==='locker'?'locker':'home');}finally{clubhouseUI.navigating=false;}return true;
}
function clubhouseOpen(page,tab){
 if(!clubhouseAvailable())return false;
 clubhouseUI.wardrobe=false;clubhouseUI.notice='';deskNavigate(page,tab);return true;
}
function clubhouseSelect(id){
 const p=clubhousePlayer(id);if(!p||!clubhouseIsRoom())return false;
 clubhouseUI.player=p.id;clubhouseUI.wardrobe=false;clubhouseUI.notice='';
 // Updating the conversation panel keeps the room and its actor animation alive.
 const panel=document.getElementById('clubhouse-panel');if(panel)panel.innerHTML=clubhousePanel(clubhouseModel());
 if(typeof ClubhouseScene!=='undefined')ClubhouseScene.select(String(p.id));
 document.querySelectorAll?.('[data-clubhouse-player]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.clubhousePlayer===String(p.id))));
 const heading=document.getElementById('clubhouse-person-heading');heading?.focus?.({preventScroll:true});return true;
}
function clubhouseTalk(id,topic){
 const p=clubhousePlayer(id);if(!p||!clubhouseAvailable()||!clubhouseIsRoom()||!samePlayerId(p.id,clubhouseUI.player)||!['listen','bench','praise','challenge'].includes(topic))return false;
 if(!clubhousePresence(p).present){clubhouseUI.notice='Spelaren är inte på plats. Följ situationen via spelarprofilen eller det medicinska teamet.';render();return false;}
 if(state.live&&!state.live.finished||state.locker.turn-p.social.lastTalk<3)return false;
 socialTalk(p.id,topic);return true;
}
function clubhouseWardrobe(){clubhouseUI.player=null;clubhouseUI.wardrobe=!clubhouseUI.wardrobe;render();}
function clubhouseAppearance(key,value){
 const choices={skin:['light','medium','dark'],hair:['brown','blond','black','silver'],outfit:['suit','tracksuit']};
 if(!choices[key]?.includes(value))return false;clubhouseRemember(key,value);render();return true;
}
function clubhouseAppearanceData(){return {skin:clubhousePreference('skin','light'),hair:clubhousePreference('hair','brown'),outfit:clubhousePreference('outfit','suit')};}
function clubhouseControl(label,action,detail='',extra=''){return `<button type="button" class="ch-action" onclick="${trainingSafe(action)}" ${extra}><span>${trainingSafe(label)}</span>${detail?`<small>${trainingSafe(detail)}</small>`:''}<b aria-hidden="true">↗</b></button>`;}
function clubhousePanel(m){
 if(clubhouseUI.wardrobe){const a=clubhouseAppearanceData();return `<div class="ch-panel-title"><span>DIN TRÄNARFIGUR</span><h2>${trainingSafe(m.coach)}</h2><p>Du följer med mellan klubbens rum.</p></div>${[['skin','Hudton',[['light','Ljus'],['medium','Mellan'],['dark','Mörk']]],['hair','Hår',[['brown','Brunt'],['blond','Blont'],['black','Svart'],['silver','Grått']]],['outfit','Klädsel',[['suit','Kostym'],['tracksuit','Träningsoverall']]]].map(([key,label,options])=>`<fieldset class="ch-appearance"><legend>${label}</legend>${options.map(([value,text])=>`<button aria-pressed="${a[key]===value}" onclick="clubhouseAppearance('${key}','${value}')">${text}</button>`).join('')}</fieldset>`).join('')}${clubhouseControl('Min tränarkarriär',"clubhouseOpen('manager')",'Namn, identitet och ditt uppdrag')}`;}
 const p=clubhousePlayer();
 if(['locker','office'].includes(m.room)&&p){
  const status=clubhousePresence(p),presence={...status,label:m.room==='office'&&status.present?'På ditt kontor':status.label},left=Math.max(0,3-(state.locker.turn-p.social.lastTalk)),live=state.live&&!state.live.finished,blocked=!presence.present||live||left>0;
  const factors=lockerFactors(p),promises=lockerPlayerPromises(p),trust=Math.round(p.social.trust);
  return `<div class="ch-person">${squadPortrait(p)}<small>${trainingSafe(p.pos)} · ${p.age} år · ${trainingSafe(lockerRole(p))}</small><h2 id="clubhouse-person-heading" tabindex="-1">${trainingSafe(p.name)}</h2><p>${trainingSafe(presence.label)}</p></div><div class="ch-meters"><span>Förtroende <b>${trust}/100</b><i style="--fill:${trust}%"></i></span><span>Trivsel <b>${Math.round(p.happiness??70)}/100</b><i style="--fill:${Math.round(p.happiness??70)}%"></i></span></div><p class="ch-context">${trainingSafe(factors[0]?.detail||'Inga noterade problem. Du kan stämma av hur spelaren upplever sin situation.')}</p><div class="ch-facts"><span>${trainingSafe(p.promisedRole||p.squadRole||'Roll ej angiven')}</span><span>${promises.length} aktiva löften</span><span>${p.social.lastMinutes===null?'Ingen match ännu':p.social.lastMinutes.toFixed(1)+' min senast'}</span></div>${blocked?`<p class="ch-notice">${!presence.present?'Spelaren är inte på plats.':live?'Enskilda samtal tas mellan matcher.':`${left} matcher kvar innan nästa samtal. Låt handling följa dina ord.`}</p>`:''}<h3>Vad vill du säga?</h3><div class="ch-conversations">${[['listen','Hur har du det?','Lyssna utan att lova mer istid.'],['bench','Låt oss prata om din roll','Förklara den faktiska uttagningen.'],['praise','Jag har sett din utveckling',socialGrowth(p)>p.social.praisedGrowth?'Ny attribututveckling finns.':'Inget nytt utvecklingsunderlag.'],['challenge','Jag behöver mer av dig','Ett krav kan också landa fel.']].map(([key,label,detail])=>clubhouseControl(label,`clubhouseTalk(${JSON.stringify(String(p.id))},'${key}')`,detail,blocked?'disabled':'')).join('')}</div>${p.social.lastResponse?`<blockquote class="ch-response"><small>SENASTE SAMTALET</small><p>${trainingSafe(p.social.lastResponse)}</p></blockquote>`:''}${clubhouseControl('Spelarprofil & hela historien',`clubhouseOpenPlayer(${JSON.stringify(String(p.id))})`)}${clubhouseControl('Granska löften och relationer',"clubhouseWorkView()")}`;
 }
 if(m.room==='locker'){
  const attention=lockerAttention();return `<div class="ch-panel-title"><span>LAGET BAKOM DIG</span><h2>Ta plats hos laget</h2><p>Klicka på en spelare i rummet för ett enskilt samtal.</p></div><div class="ch-pulse"><strong>${m.players.filter(p=>p.presence.present).length}<small>på plats</small></strong><strong>${attention.length}<small>att följa upp</small></strong></div><h3>Börja här</h3>${attention.slice(0,3).map(({p,items})=>clubhouseControl(p.name,`clubhouseSelect(${JSON.stringify(String(p.id))})`,items[0].text)).join('')||'<p class="ch-context">Inga noterade problem i gruppen. Ta ett lugnt samtal eller förbered nästa match.</p>'}${clubhouseControl('Till taktiktavlan',"clubhouseOpen('lines')",'Roller, kedjor och faktisk istid')}${clubhouseControl('Löften, ledarskap & relationer',"clubhouseWorkView()")}`;
 }
 if(m.room==='ice')return `<div class="ch-panel-title"><span>FRÅN IDÉ TILL SPEL</span><h2>Forma nästa prestation</h2><p>Planera arbetet, följ belastningen och ge unga en väg in i laget. Figurerna visar matchklara spelare; träningen följer ditt kalenderprogram.</p></div>${clubhouseControl('Planera träningen',"clubhouseOpen('training')",TRAINING_SESSIONS[calendarSession(m.date).type].name)}${clubhouseControl('Kedjor & special teams',"clubhouseOpen('lines')",'Öppna din riktiga laguttagning')}${clubhouseControl('Juniorerna',"clubhouseOpen('juniors')",'Utveckling, faddrar och A-lagschanser')}${clubhouseControl('Medicinska teamet',"clubhouseOpen('medical')",`${m.players.filter(p=>p.presence.label==='Hos medicinska teamet').length} spelare i behandling`)}${clubhouseControl('Assistentens uppföljning',"clubhouseOpen('staffReview')")}`;
 const focus=personalMatchFocus();
 return `<div class="ch-panel-title"><span>VÄLKOMMEN TILL JOBBET</span><h2>${trainingSafe(m.coach==='Huvudtränaren'?'Ditt lag väntar.':m.coach.split(' ')[0]+', ditt lag väntar.')}</h2><p>${m.fixture?`${calText(m.fixture.date)} · ${trainingSafe(m.fixture.opponent)}`:'Planera nästa steg i klubbens säsong.'}</p></div>${focus?`<article class="ch-story"><span>MÄNNISKAN I NÄSTA MATCH</span><h3>${trainingSafe(focus.title)}</h3><p>${trainingSafe(focus.detail||focus.text||'Följ spelarens väg och låt dina beslut få betydelse.')}</p>${clubhouseControl('Följ matchhistorien',"clubhouseWorkView()")}</article>`:''}<h3>${m.tasks.length?'På ditt skrivbord':'Dagens möjligheter'}</h3>${m.tasks.slice(0,3).map(t=>clubhouseControl(t.title,t.key?`officeOpenDeal(${JSON.stringify(t.key)})`:deskAction(t.action),t.detail)).join('')||clubhouseControl('Sätt tonen för dagen',"clubhouseGo('locker')",'Gå in och prata med laget')}${clubhouseControl('Dagens program',`officeOpenDay('${m.date}')`,'Träning, match och nästa händelse')}${clubhouseControl('Assistentens två uttagningsalternativ',"clubhouseOpen('lines')",'Granska laget på taktiktavlan')}`;
}
function clubhouseOpenPlayer(id){const p=clubhousePlayer(id);if(!p)return false;deskOpenPlayer(p.id);return true;}
function clubhouseWorkView(){clubhouseMode(false);}
function clubhouseReturn(){clubhouseGo(clubhouseUI.room);}
function clubhouseStrip(){const label='← Tillbaka till '+(CLUBHOUSE_ROOMS[clubhouseUI.room]?.name.toLowerCase()||'kontoret');return `<nav class="ch-return" aria-label="Klubbhusets arbetsvy"><button aria-label="${trainingSafe(label)}" onclick="clubhouseReturn()">${trainingSafe(label)}</button><span>KLUBBHUSET / ARBETSVY</span><button onclick="clubhouseGo('office')">Tränarkontoret</button></nav>`;}
function clubhouseHotspot(id,label,action,detail,kind='object'){return `<button type="button" class="ch-hotspot ch-${kind}" data-ch-anchor="${id}" onclick="${trainingSafe(action)}"><span class="ch-dot" aria-hidden="true"></span><span><strong>${trainingSafe(label)}</strong>${detail?`<small>${trainingSafe(detail)}</small>`:''}</span></button>`;}
function clubhouseView(){
 if(clubhouseUI.lastClub!==managerClub()){clubhouseUI.player=null;clubhouseUI.lastClub=managerClub();}
 const m=clubhouseModel(),room=CLUBHOUSE_ROOMS[m.room];clubhouseUI.room=m.room;
 const objects=m.room==='office'?[
  ['board','Taktiktavlan',"clubhouseOpen('lines')",'Kedjor & matchplan'],['desk','Skrivbordet',"clubhouseOpen('inbox')",`${m.tasks.length} beslutsärenden`],['scout','Scoutinghörnan',"clubhouseOpen('transfers')",'Bygg nästa lag'],['cabinet','Klubbledningen',"clubhouseOpen('board')",'Ekonomi & långsiktig riktning'],['door','In till laget',"clubhouseGo('locker')",'Omklädningsrummet'],['coach','Din tränarfigur','clubhouseWardrobe()','Utseende & karriär']
 ]:m.room==='locker'?[
  ['board','Matchplanen',"clubhouseOpen('lines')",'Gå igenom laguttagningen'],['door','Ut på isen',"clubhouseGo('ice')",'Träningshallen'],['coach','Till kontoret',"clubhouseGo('office')",'Ditt nästa beslut']
 ]:[['board','Träningsplanen',"clubhouseOpen('training')",'Belastning & utveckling'],['door','Tillbaka till laget',"clubhouseGo('locker')",'Omklädningsrummet'],['coach','Juniorverksamheten',"clubhouseOpen('juniors')",'Framtidens spelare']];
 return `<section class="clubhouse" aria-label="Levande klubbhus" style="--ch-club:${m.color}"><header class="ch-heading"><div><span class="ch-eyebrow">${trainingSafe(m.club)} <i></i> ${calText(m.date)}</span><h1>${room.name}<span>${room.number}</span></h1><p>${room.subtitle}</p></div><div class="ch-view-actions"><button onclick="clubhouseWardrobe()">Din tränare</button><button onclick="clubhouseWorkView()">Arbetsvy ↗</button></div></header><div class="ch-layout"><div class="ch-stage-wrap"><div class="ch-stage" id="clubhouse-stage" aria-label="${room.name} i 3D"><canvas id="clubhouse-canvas" aria-hidden="true"></canvas><div class="ch-stage-caption"><span class="ch-live-dot"></span><span>${m.room==='locker'?`${m.players.filter(p=>p.presence.present).length} spelare på plats`:m.room==='ice'?'Ditt arbete börjar här':'En ny dag i klubben'}</span></div><p class="ch-render-status" id="clubhouse-render-status" role="status">Öppnar klubbhuset…</p><div class="ch-hotspots" id="clubhouse-hotspots">${objects.map(o=>clubhouseHotspot(...o)).join('')}</div><div class="ch-scene-hint">Klicka på en plats för att gå dit · ${m.room==='locker'?'välj en spelare för att prata':'utforska rummet'}</div></div><nav class="ch-room-nav" aria-label="Rum i klubbhuset">${Object.entries(CLUBHOUSE_ROOMS).map(([key,r])=>`<button onclick="clubhouseGo('${key}')" aria-current="${key===m.room?'location':'false'}"><small>${r.number}</small><span>${r.name}</span><b aria-hidden="true">${key===m.room?'●':'→'}</b></button>`).join('')}</nav>${m.room==='locker'?`<div class="ch-roster-bar"><label for="clubhouse-player-select">Hitta en spelare</label><select id="clubhouse-player-select" onchange="clubhouseSelect(this.value)"><option value="">Välj i hela truppen</option>${m.players.map(p=>`<option value="${trainingSafe(p.id)}" ${samePlayerId(p.id,clubhouseUI.player)?'selected':''}>${trainingSafe(p.name)} · ${p.pos}${p.presence.present?'':' · '+p.presence.label}</option>`).join('')}</select><span>Alla ${m.players.length} spelare har en egen plats.</span></div>`:`<div class="ch-quick-links">${[['squad','Truppen'],['world','Världen'],['finance','Ekonomi'],['staff','Staben'],['statistics','Matchanalys']].map(([page,label])=>`<button onclick="clubhouseOpen('${page}')">${label} ↗</button>`).join('')}</div>`}</div><aside class="ch-panel" id="clubhouse-panel" aria-label="Interaktion i klubbhuset">${clubhousePanel(m)}</aside></div>${typeof mediaPromptView==='function'?mediaPromptView():''}${m.room==='office'?`<div class="ch-day-controls">${calendarPaceView()}</div>`:''}</section>`;
}
function clubhouseWrap(html){
 if(!clubhouseAvailable())return html;
 // The match owns the complete viewport, including the finished-match report.
 // Its existing back navigation already returns to the manager's office.
 if(state.page==='match')return html;
 if(clubhouseIsRoom())return clubhouseView();
 return `${clubhouseStrip()}${html}`;
}
function clubhouseMount(){
 if(typeof window==='undefined'||typeof ClubhouseScene==='undefined')return;
 const canvas=document.getElementById('clubhouse-canvas');
 if(!canvas||typeof canvas.getContext!=='function'){ClubhouseScene.dispose();return;}
 ClubhouseScene.mount(canvas,clubhouseModel(),clubhouseAppearanceData());
}
