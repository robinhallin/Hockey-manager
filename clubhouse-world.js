'use strict';
// A continuous place around the existing career, including every work route.
Object.assign(CLUBHOUSE_ROOMS,{
 recruit:{name:'Scoutkontoret',subtitle:'Nästa pusselbit börjar här.',number:'04'},
 boardroom:{name:'Klubbledningen',subtitle:'En riktning som håller över tid.',number:'05'},
 world:{name:'Medierummet',subtitle:'Klubben i en större hockeyvärld.',number:'06'}
});
Object.assign(clubhouseUI,{work:false,briefing:false,areas:false,camera:'close',origin:null});
clubhouseAvailable=function(){return state.careerStarted&&managerEmployed()&&!careerScreen&&state.page!=='clubSelect';};
// Upgrade the old presentation preference once; explicit table mode remains available.
if(typeof window!=='undefined'&&clubhousePreference('generation','')!=='immersive1'){
 clubhouseRemember('generation','immersive1');clubhouseRemember('mode','living');
}
function clubhouseNavigation(page){
 if(clubhouseUI.navigating)return;
 if(page==='home'){clubhouseUI.room='office';clubhouseUI.work=false;clubhouseUI.origin=null;}
 else if(page==='locker'){clubhouseUI.room='locker';clubhouseUI.work=false;clubhouseUI.origin=null;}
 else if(!['match','clubSelect'].includes(page)){
  if(!clubhouseUI.origin)clubhouseUI.origin={room:clubhouseUI.room,player:clubhouseUI.player,guest:clubhouseUI.officeGuest};
  const room=clubhouseDestinationRoom(page);if(room)clubhouseUI.room=room;
 }
 clubhouseUI.areas=false;
}
function clubhouseDestinationRoom(page){
 if(['transfers','scouting','marketPlayer'].includes(page))return 'recruit';
 if(['finance','board','staff','staffReview','manager'].includes(page))return 'boardroom';
 if(['world','international','nhl','leagues','table','leagueStats','season','clubDetail','news','press'].includes(page))return 'world';
 if(['training','juniors','medical'].includes(page))return 'ice';
 return null;
}
clubhouseRoomForPage=function(){return state.page==='locker'?'locker':CLUBHOUSE_ROOMS[clubhouseUI.room]?clubhouseUI.room:'office';};
clubhouseIsRoom=function(){return clubhouseAvailable()&&clubhouseEnabled()&&['home','locker'].includes(state.page)&&!clubhouseUI.work&&!(state.page==='home'&&(overviewUI.stories||overviewUI.press));};
const clubhouseWorldGo=clubhouseGo;
clubhouseGo=function(room){
 if(!Object.hasOwn(CLUBHOUSE_ROOMS,room)||!clubhouseAvailable())return false;
 clubhouseUI.work=false;clubhouseUI.briefing=false;clubhouseUI.areas=false;clubhouseUI.origin=null;
 return clubhouseWorldGo(room);
};
clubhouseWorkView=function(){
 if(!clubhouseAvailable())return;
 clubhouseUI.origin={room:clubhouseUI.room,player:clubhouseUI.player,guest:clubhouseUI.officeGuest};clubhouseUI.work=true;
 render();queueInterfaceSave();document.getElementById('ch-work-content')?.focus?.({preventScroll:true});
};
clubhouseReturn=function(){
 const origin=clubhouseUI.origin||{room:clubhouseUI.room,player:clubhouseUI.player};
 clubhouseGo(origin.room);if(origin.guest){clubhouseUI.officeGuest=origin.guest;clubhouseUI.player=origin.player;}if(['locker','office'].includes(origin.room)&&origin.player!=null&&!clubhouseSelect(origin.player))clubhouseUI.player=null;
 document.getElementById('ch-workspace-toggle')?.focus?.({preventScroll:true});
};
function clubhouseBriefing(){clubhouseUI.briefing=!clubhouseUI.briefing;clubhouseUI.wardrobe=false;clubhouseUI.player=null;clubhouseUI.officeGuest=null;render();}
function clubhouseAreas(){clubhouseUI.areas=!clubhouseUI.areas;render();}
function clubhouseCamera(){clubhouseUI.camera=clubhouseUI.camera==='close'?'overview':'close';if(typeof ClubhouseScene!=='undefined')ClubhouseScene.reframe?.();const b=document.getElementById('ch-camera');if(b)b.setAttribute('aria-pressed',String(clubhouseUI.camera==='close'));}
function clubhouseTableMode(){clubhouseUI.work=false;clubhouseMode(false);}
const clubhouseOldPanel=clubhousePanel;
clubhousePanel=function(m){
 if(clubhouseUI.wardrobe||m.room==='locker'||['office','ice'].includes(m.room))return clubhouseOldPanel(m);
 const controls=m.room==='recruit'?[['Truppplanering','transfers','needs','Behov, kontrakt och ersättare'],['Spelarsök & scouting','transfers','search','Bedöm kandidater och välj ditt nästa uppdrag'],['Bud & förhandlingar','transfers','deals','Dina verkliga affärer och inkommande bud'],['Rapporter & bevakning','transfers','missions','Följ scoutuppdragen']]:m.room==='boardroom'?[['Styrelse & klubbprojekt','board',null,'Mål, riktning och förtroende'],['Ekonomi & kassaflöde','finance',null,careerMoney(state.money)+' i klubbkassan'],['Personal & ansvar','staff',null,'Bygg ditt team runt laget'],['Min tränarkarriär','manager',null,state.managerCareer?.name||'Din tränarroll']]:[['Hockeyvärlden','world',null,'Nyheter, konkurrenter och möjligheter'],['Ligor & resultat','leagues',null,'Följ ligorna och klubbarna'],['Landslag & JVM','international',null,'Uttagningar och juniorhockey'],['NHL & draft','nhl',null,'Nordamerika och nästa steg']];
 return `<div class="ch-panel-title"><span>${m.room==='recruit'?'LAGBYGGET':m.room==='boardroom'?'KLUBBENS FRAMTID':'UTANFÖR VÅRA VÄGGAR'}</span><h2>${CLUBHOUSE_ROOMS[m.room].name}</h2><p>${CLUBHOUSE_ROOMS[m.room].subtitle}</p></div>${controls.map(([name,page,tab,note])=>clubhouseControl(name,`clubhouseOpen('${page}'${tab?`,'${tab}'`:''})`,note)).join('')}`;
};
function clubhouseObjects(room,m){
 const sets={
 office:[['board','Taktiktavlan',"clubhouseOpen('lines')",'Kedjor & matchplan'],['desk','Skrivbordet',"clubhouseOpen('inbox')",`${m.tasks.length} beslutsärenden`],['scout','Scoutkontoret',"clubhouseGo('recruit')",'Spelarsök & affärer'],['cabinet','Klubbledningen',"clubhouseGo('boardroom')",'Mål & resurser'],['door','In till laget',"clubhouseGo('locker')",'Omklädningsrummet'],['coach','Din tränarfigur','clubhouseWardrobe()','Utseende & karriär']],
 locker:[['board','Matchplanen',"clubhouseOpen('lines')",'Gå igenom laguttagningen'],['door','Ut på isen',"clubhouseGo('ice')",'Träningshallen'],['coach','Prata med laget','clubhouseBriefing()','Roller, förtroende & samtal']],
 ice:[['board','Träningsplanen',"clubhouseOpen('training')",'Belastning & utveckling'],['door','Tillbaka till laget',"clubhouseGo('locker')",'Omklädningsrummet'],['coach','Juniorverksamheten',"clubhouseOpen('juniors')",'Framtidens spelare']],
 recruit:[['board','Truppplaneringen',"clubhouseOpen('transfers','needs')",'Var saknas nästa pusselbit?'],['desk','Scoutens rapporter',"clubhouseOpen('transfers','missions')",'Uppdrag & observationer'],['scout','Spelarsök',"clubhouseOpen('transfers','search')",'Hitta din kandidat'],['cabinet','Bud & avtal',"clubhouseOpen('transfers','deals')",'Förhandlingar & beslut'],['door','Till kontoret',"clubhouseGo('office')",'Din vardag']],
 boardroom:[['board','Klubbens riktning',"clubhouseOpen('board')",'Styrelse & klubbprojekt'],['desk','Ekonomin',"clubhouseOpen('finance')",'Budget & kassaflöde'],['scout','Staben',"clubhouseOpen('staff')",'Människorna runt laget'],['cabinet','Ditt uppdrag',"clubhouseOpen('manager')",'Din tränarkarriär'],['door','Till kontoret',"clubhouseGo('office')",'Dagens arbete']],
 world:[['board','Hockeyvärlden',"clubhouseOpen('world')",'Nyheter & bevakning'],['desk','Ligor & resultat',"clubhouseOpen('leagues')",'Klubbarna omkring dig'],['scout','Landslag & JVM',"clubhouseOpen('international')",'Landslagens säsong'],['cabinet','NHL & draft',"clubhouseOpen('nhl')",'Nordamerika'],['door','Till kontoret',"clubhouseGo('office')",'Nästa beslut']]
 };return sets[room]||sets.office;
}
function clubhouseContextLinks(room){
 const sets={office:[['Dagens program','calendar'],['Truppen','squad'],['Matchanalys','statistics']],locker:[['Laguttagning','lines'],['Trupp & kontrakt','squad'],['Löften & ledarskap','lockerWork']],ice:[['Träning','training'],['Juniorer','juniors'],['Medicinskt team','medical']],recruit:[['Truppplanering','transfers','needs'],['Spelarsök','transfers','search'],['Bud & avtal','transfers','deals']],boardroom:[['Styrelse','board'],['Ekonomi','finance'],['Personal','staff']],world:[['Nyheter','world'],['Ligor','leagues'],['Landslag','international']]};
 return (sets[room]||sets.office).map(([name,page,tab])=>`<button onclick="${page==='lockerWork'?'clubhouseWorkView()':`clubhouseOpen('${page}'${tab?`,'${tab}'`:''})`}">${name}</button>`).join('');
}
function clubhouseWorldView(html){
 clubhouseLifeSync();
 if(clubhouseUI.lastClub!==managerClub()){clubhouseUI.player=null;clubhouseUI.lastClub=managerClub();}
 const m=clubhouseModel(),room=CLUBHOUSE_ROOMS[m.room],work=!clubhouseIsRoom(),panel=!work&&(clubhouseUI.briefing||clubhouseUI.wardrobe||['locker','office'].includes(m.room)&&clubhousePlayer());
 const title=DESK_AREAS.flatMap(a=>a.pages).find(d=>d[0]===state.page)?.[1]||DESK_DESTINATIONS.find(d=>d[3]===state.page)?.[1]||room.name;
 const safe=trainingSafe;
 return `<section class="ch-world ${work?'ch-has-work':''} ${panel?'ch-has-panel':''}" id="ch-world" data-room="${m.room}" data-day-phase="${m.life.phase}" style="--ch-club:${m.color}" aria-label="Levande klubbhus">
 <div class="ch-environment" ${work?'inert':''}><div class="ch-stage" id="clubhouse-stage" aria-label="${room.name} i 3D"><canvas id="clubhouse-canvas" aria-hidden="true"></canvas><p id="clubhouse-render-status" class="ch-render-status" role="status">Öppnar klubbhuset…</p><div class="ch-hotspots" id="clubhouse-hotspots">${clubhouseObjects(m.room,m).map(o=>clubhouseHotspot(...o)).join('')}</div></div></div>
 <header class="ch-world-heading" ${work?'inert':''}><span class="ch-world-location">${safe(m.club)} <i></i> ${calText(m.date)}</span><h1>${room.name}</h1><p>${room.subtitle}</p></header>
 <nav class="ch-world-tools" aria-label="Klubbhusets verktyg" ${work?'inert':''}><button onclick="coachWorkspaceEnter()">${deskIcon('arrow')}<span>Tränaröversikten</span></button><button id="ch-camera" aria-pressed="${clubhouseUI.camera==='close'}" onclick="clubhouseCamera()">${deskIcon('search')}<span>Kamera</span></button><button aria-expanded="${Boolean(panel)}" onclick="clubhouseBriefing()">${deskIcon('mail')}<span>Dagens läge</span>${m.tasks.length?`<b>${m.tasks.length}</b>`:''}</button><button onclick="clubhouseWardrobe()">${deskIcon('team')}<span>Din tränare</span></button><button id="ch-workspace-toggle" onclick="clubhouseWorkView()">${deskIcon('menu')}<span>Arbetsvy</span></button><button aria-expanded="${clubhouseUI.areas}" onclick="clubhouseAreas()">${deskIcon('globe')}<span>Alla områden</span></button></nav>
 ${!work&&m.room==='office'?clubhouseLifeCard(m):''}
 ${!work&&m.room==='locker'?`<div class="ch-world-player-search"><label for="clubhouse-player-select">Välj spelare</label><select id="clubhouse-player-select" onchange="clubhouseSelect(this.value)"><option value="">Hitta i hela truppen</option>${m.players.map(p=>`<option value="${safe(p.id)}" ${samePlayerId(p.id,clubhouseUI.player)?'selected':''}>${safe(p.name)} · ${p.pos}${p.presence.present?'':' · '+p.presence.label}</option>`).join('')}</select><span>${m.players.filter(p=>p.presence.present).length} på plats / ${m.players.length}</span></div>`:''}
 <aside class="ch-panel ch-world-panel" id="clubhouse-panel" aria-label="Interaktion i klubbhuset" ${panel?'':'hidden'}><button class="ch-panel-close" aria-label="Stäng spelarens eller rummets panel" onclick="clubhouseCloseMeeting()">×</button>${clubhousePanel(m)}</aside>
 ${clubhouseUI.areas&&!work?`<nav class="ch-all-areas" aria-label="Klubbhusets områden">${DESK_AREAS.map(a=>`<section><h2>${a.label}</h2>${a.pages.map(([page,label])=>`<button onclick="clubhouseOpen('${page}')">${label} ↗</button>`).join('')}</section>`).join('')}<footer><button onclick="clubhouseOpen('settings')">Sparfiler & inställningar</button><button onclick="showCareerMenu()">Huvudmeny</button><button onclick="coachWorkspaceEnter()">Tränaröversikten</button><button onclick="clubhouseTableMode()">Byt till tabelläge</button></footer></nav>`:''}
 ${work?`<section class="ch-work-dialog" role="dialog" aria-modal="true" aria-labelledby="ch-work-title"><header class="ch-work-heading"><div><small>${room.name}</small><h2 id="ch-work-title">${safe(title)}</h2></div><nav aria-label="Klubbhusets arbetsvy"><button aria-label="← Tillbaka till ${room.name.toLowerCase()}" onclick="clubhouseReturn()">← Till rummet</button><button class="ch-work-expand" aria-pressed="false" onclick="this.closest('.ch-work-dialog').classList.toggle('ch-work-wide');this.setAttribute('aria-pressed',this.closest('.ch-work-dialog').classList.contains('ch-work-wide'))">Bredda</button><button aria-label="Stäng arbetsytan" onclick="clubhouseReturn()">×</button></nav></header><div class="ch-work-content" id="ch-work-content" tabindex="-1">${deskFrame(html)}</div></section>`:''}
 <footer class="ch-world-bottom" ${work?'inert':''}><div class="ch-context-actions">${clubhouseContextLinks(m.room)}<button class="ch-next-event" onclick="clubhouseNextEvent()">Nästa händelse →</button><span>Klicka på golvet för att flytta tränaren</span></div><nav class="ch-room-nav" aria-label="Rum i klubbhuset">${Object.entries(CLUBHOUSE_ROOMS).map(([key,r])=>`<button onclick="clubhouseGo('${key}')" aria-current="${key===m.room?'location':'false'}"><small>${r.number}</small><span>${r.name}</span>${m.life.counts[key]?`<em class="ch-room-count" aria-label="${m.life.counts[key]} aktuella ärenden">${m.life.counts[key]}</em>`:''}<b aria-hidden="true">${key===m.room?'●':'→'}</b></button>`).join('')}</nav></footer>
 ${!work?clubhouseLifeFeedback(m):''}
 ${!work&&m.room==='office'&&typeof mediaPromptView==='function'?`<div class="ch-world-media">${mediaPromptView()}</div>`:''}
 </section>`;
}
const clubhouseClassicWrap=clubhouseWrap;
clubhouseWrap=function(html){return clubhouseAvailable()&&clubhouseEnabled()&&state.page!=='match'?clubhouseWorldView(html):clubhouseClassicWrap(html);};
function clubhouseRender(content,html){
 if(typeof coachWorkspaceEnabled==='function'&&coachWorkspaceEnabled()){const old=document.getElementById('clubhouse-stage');content.innerHTML=coachWorkspaceWrap(html);const next=document.getElementById('clubhouse-stage');if(old?.dataset?.sceneKey&&old.dataset.sceneKey===next?.dataset?.sceneKey&&typeof next.replaceWith==='function')next.replaceWith(old);return;}
 const immersive=clubhouseAvailable()&&clubhouseEnabled()&&state.page!=='match';
 const oldStage=typeof window!=='undefined'?document.getElementById('clubhouse-stage'):null;
 const key=immersive?clubhouseSceneKey(clubhouseModel(),clubhouseAppearanceData()):null;
 const preserve=oldStage&&oldStage.dataset?.sceneKey===key&&typeof oldStage.replaceWith==='function';
 content.innerHTML=immersive?clubhouseWrap(html):deskFrame(clubhouseWrap(html));
 const next=typeof window!=='undefined'?document.getElementById('clubhouse-stage'):null;
 if(preserve&&next)next.replaceWith(oldStage);
 if(next&&!preserve&&next.dataset)next.dataset.sceneKey=key;
}
function clubhouseSceneKey(m,a){return JSON.stringify([m.club,m.room,m.date,a,state.lines||null,m.room==='office'?m.life?.visitor?.playerId:null,m.life?.phase,m.life?.session,m.players.map(p=>[p.id,p.number,p.presence.present,p.attention,p.captain])]);}
const clubhouseOriginalSelect=clubhouseSelect;
clubhouseSelect=function(id){const ok=clubhouseOriginalSelect(id);if(ok){const panel=document.getElementById('clubhouse-panel');if(panel){panel.hidden=false;panel.innerHTML=`<button class="ch-panel-close" aria-label="Stäng spelarens panel" onclick="clubhouseCloseMeeting()">×</button>`+panel.innerHTML;}document.getElementById('ch-world')?.classList?.toggle('ch-has-panel',true);document.getElementById('clubhouse-person-heading')?.focus?.({preventScroll:true});}return ok;};
document.addEventListener?.('keydown',event=>{
 const work=document.querySelector?.('.ch-work-dialog');if(!work||!clubhouseEnabled()||!clubhouseAvailable()||document.querySelector('dialog[open]'))return;
 if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation?.();clubhouseReturn();}
 if(event.key==='Tab'){
  const buttons=Array.from(work.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]')).filter(el=>el.getClientRects().length);
  const first=buttons[0],last=buttons.at(-1);if(!first)return;
  if(event.shiftKey&&(document.activeElement===first||!work.contains(document.activeElement))){event.preventDefault();last.focus();}
  else if(!event.shiftKey&&(document.activeElement===last||!work.contains(document.activeElement))){event.preventDefault();first.focus();}
 }
});
