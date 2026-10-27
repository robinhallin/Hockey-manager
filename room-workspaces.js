'use strict';
// Workstations route to the real tools. This module owns presentation only.
const ROOM_WORK_ROUTES={
 office:{desk:['inbox'],week:['calendar'],visitor:['locker']},
 locker:{team:['squad'],talk:['locker'],roles:['squad','contracts']},
 tactics:{board:['lines'],review:['statistics'],opponent:['opponents']},
 ice:{plan:['calendar'],medical:['medical'],academy:['juniors']},
 recruit:{needs:['transfers','needs'],reports:['transfers','missions'],deals:['transfers','deals']},
 boardroom:{direction:['board'],budget:['finance'],staff:['staffReview']},
 world:{news:['world'],watch:['world','following'],international:['international']}
};
const ROOM_WORK_PAGES={
 office:[['inbox','Inkorg'],['calendar','Kalender'],['season','Säsongsplan'],['settings','Sparfiler & inställningar']],
 locker:[['squad','Spelare & avtal'],['locker','Samtal & löften']],
 tactics:[['lines','Taktiktavlan'],['opponents','Motstånd'],['statistics','Matchanalys']],
 ice:[['calendar','Veckoplan'],['training','Spelarutveckling'],['medical','Medicinskt team'],['juniors','Akademin']],
 recruit:[['transfers','Rekrytering']],
 boardroom:[['board','Klubbens riktning'],['finance','Ekonomi'],['staffReview','Ansvar & uppföljning'],['staff','Personal & avtal'],['manager','Din tränarkarriär']],
 world:[['world','Nyheter & bevakning'],['leagues','Ligor & resultat'],['international','Landslag & JVM'],['nhl','Nordamerika'],['season','Säsong & historik']]
};
const roomWorkUI={owner:null,context:null,token:0,returnStation:null,scroll:null};
function roomWorkSync(){
 const context=JSON.stringify([managerClub(),state.calendar?.date,state.page,clubhouseUI.room,state.page==='transfers'?state.recruitment?.tab:null]);
 if(roomWorkUI.owner!==state||roomWorkUI.context!==context){roomWorkUI.owner=state;roomWorkUI.context=context;roomWorkUI.token++;}
 return roomWorkUI;
}
function roomWorkGuard(token){roomWorkSync();return clubhouseAvailable()&&clubhouseEnabled()&&!dayTransition&&!calendarPaceRun&&Number(token)===roomWorkUI.token;}
function roomWorkLocation(){
 const page=state.page,from=clubhouseUI.room;
 let room=({inbox:'office',settings:'office',squad:'locker',locker:'locker',lines:'tactics',tactics:'tactics',specialTeams:'tactics',opponents:'tactics',statistics:'tactics',training:'ice',juniors:'ice',medical:'ice',transfers:'recruit',scouting:'recruit',marketPlayer:'recruit',board:'boardroom',finance:'boardroom',staff:'boardroom',staffReview:'boardroom',manager:'boardroom',world:'world',leagues:'world',table:'world',leagueStats:'world',clubDetail:'world',news:'world',international:'world',nhl:'world'})[page];
 if(page==='calendar')room=from==='ice'?'ice':'office';
 if(page==='season')room=from==='world'?'world':'office';
 if(page==='locker'&&from==='office'&&clubhouseUI.origin?.station==='visitor')room='office';
 room??=CLUBHOUSE_WORKROOMS[from]?from:'office';
 let station=Object.entries(ROOM_WORK_ROUTES[room]).find(([,route])=>route[0]===page&&(!route[1]||route[1]===(page==='world'?worldWatchUI.filter:state.recruitment?.tab)))?.[0];
 if(page==='transfers')station=['deals','history','loans'].includes(state.recruitment.tab)?'deals':['search','missions','shortlist','world'].includes(state.recruitment.tab)?'reports':'needs';
 if(room==='locker'&&page==='squad'&&squadUI.tab==='contracts')station='roles';
 if(room==='world'&&page==='world')station=worldWatchUI.filter==='following'?'watch':'news';
 station??=room===from&&clubhouseRoomsUI.station||CLUBHOUSE_WORKROOMS[room].stations[0][0];
 if(!ROOM_WORK_ROUTES[room][station])station=CLUBHOUSE_WORKROOMS[room].stations[0][0];
 return {room,station,detail:['player','marketPlayer','clubDetail','news','table','leagueStats'].includes(page)};
}
function roomWorkStart(room,station){
 const route=ROOM_WORK_ROUTES[room]?.[station];if(!route)return false;
 clubhouseRoomsUI.station=station;roomWorkUI.returnStation={room,station};
 if(room==='tactics'&&station==='board')return roomCoachBoardOpen();
 if(room==='tactics'&&station==='opponent'&&matchBriefFixture())return roomCoachMatchStep('brief');
 if(room==='tactics'&&station==='review'&&roomCoachReport())return roomCoachMatchStep('analysis');
 clubhouseUI.player=null;clubhouseUI.officeGuest=null;clubhouseUI.briefing=false;clubhouseUI.wardrobe=false;
 const [page,tab]=route;
 if(page==='world')worldWatchUI.filter=tab==='following'?'following':'all';
 if(page==='squad'){squadUI.tab=station==='roles'?'contracts':'status';squadUI.status='all';}
 const ok=clubhouseRoomsOpen(page,page==='transfers'?tab:undefined);
 if(ok&&room==='office'&&station==='desk'&&typeof clubDecisionOpen==='function'){clubDecisionOpen();}
 if(ok){document.getElementById('rw-work-heading')?.focus?.({preventScroll:true});queueInterfaceSave();}
 return ok;
}
function roomWorkStation(station,token){
 if(!clubhouseRoomsGuard(token)||clubhouseUI.player||clubhouseUI.wardrobe||clubhouseUI.briefing)return false;
 return roomWorkStart(clubhouseRoomsKey(),station);
}
function roomWorkSwitch(room,station,token){
 if(!roomWorkGuard(token)||roomWorkLocation().room!==room||clubhouseIsRoom()||!ROOM_WORK_ROUTES[room]?.[station])return false;
 // Return closes to this workstation, including when the first entry was a deep link.
 clubhouseUI.room=room;clubhouseUI.origin={room,hub:false,station};
 return roomWorkStart(room,station);
}
function roomWorkPage(page,tab,token){
 if(!roomWorkGuard(token))return false;
 const {room}=roomWorkLocation();
 if(!ROOM_WORK_PAGES[room].some(([p])=>p===page))return false;
 if(page==='lines')return roomCoachBoardOpen();
 if(page==='transfers'&&tab&&!DESK_RECRUIT_TABS.concat(DESK_RECRUIT_MORE).some(([t])=>t===tab))return false;
 clubhouseUI.room=room;return clubhouseRoomsOpen(page,tab);
}
function stationRecruitTabs(station){return station==='deals'?['deals','loans','history']:station==='reports'?['search','missions','shortlist','world']:['overview','needs'];}
function roomWorkTabs(location){
 const token=roomWorkUI.token,{room}=location;
 const covered=Object.values(ROOM_WORK_ROUTES[room]).map(route=>route[0]);
 const recruitTabs=stationRecruitTabs(location.station);
 const routes=room==='recruit'?DESK_RECRUIT_TABS.concat(DESK_RECRUIT_MORE).filter(([tab])=>recruitTabs.includes(tab)).map(([tab,label])=>['transfers',label,tab]):ROOM_WORK_PAGES[room].filter(([page])=>!covered.includes(page));
 return `<nav class="rw-feature-tabs" aria-label="Verktyg i ${trainingSafe(CLUBHOUSE_WORKROOMS[room].title.toLowerCase())}">${routes.map(([page,label,tab])=>`<button ${state.page===page&&(!tab||state.recruitment.tab===tab)?'aria-current="page"':''} onclick="${roomCoachCode('roomWorkPage',page,tab??null,token)}">${trainingSafe(label)}</button>`).join('')}</nav>`;
}
function roomWorkSurface(html,m){
 const location=roomWorkLocation(),{room,station,detail}=location,definition=CLUBHOUSE_WORKROOMS[room];
 clubhouseUI.room=room;clubhouseRoomsUI.station=station;roomWorkSync();
 const token=roomWorkUI.token,selected=definition.stations.find(s=>s[0]===station),origin=CLUBHOUSE_WORKROOMS[clubhouseUI.origin?.room]||definition;
 const title=({player:'Spelarprofil',marketPlayer:'Spelarprofil',clubDetail:'Klubbprofil',news:'Nyhetsartikel',table:'Ligatabell',leagueStats:'Spelarstatistik'})[state.page]||ROOM_WORK_PAGES[room].find(([p])=>p===state.page)?.[1]||DESK_DESTINATIONS.find(d=>d[3]===state.page)?.[1]||(detail?'Detaljer & underlag':selected[1]);
 if(state.page==='staffReview')html=html.replace('</header>','</header>'+staffMandatesView());
 const back=detail?`<button onclick="deskBack('${room==='recruit'?'transfers':room==='world'?'leagues':'squad'}')">${clubhouseThemeIcon('arrow-left')}Till arbetet</button>`:'';
 return `<section class="ch-world ct-world rw-world ch-has-work" id="ch-world" data-room="${room}" data-workstation="${station}" style="--ch-club:${trainingSafe(m.color)}" aria-label="Levande klubbhus">${clubhouseThemeHeader(m)}<div class="ct-main rw-main"><img class="rw-environment" src="assets/clubhouse/rooms/${definition.image}.webp" alt="" aria-hidden="true"><section class="ch-work-dialog ct-work rw-workbench" role="region" aria-label="${trainingSafe(title)}" aria-labelledby="rw-work-heading"><header class="rw-heading"><div><span class="rw-eyebrow">${trainingSafe(definition.title)} <span aria-hidden="true">/</span> ${trainingSafe(m.club)}</span><h2 id="rw-work-heading" tabindex="-1">${trainingSafe(title)}</h2></div><nav aria-label="Arbetsytans navigation">${back}<button onclick="clubhouseReturn()" aria-label="← Tillbaka till ${trainingSafe(origin.title.toLowerCase())}">${clubhouseThemeIcon('arrow-left')}Till rummet</button></nav></header><aside class="rw-station-bar" aria-label="Verktygsmeny"><div class="rw-room-identity"><img src="assets/clubhouse/rooms/${definition.image}.webp" alt=""><span>${trainingSafe(definition.title)}</span><small>${trainingSafe(m.club)} · ${trainingSafe(seasonLabel())}</small></div><span class="rw-nav-label">Arbetsstationer</span><nav class="rw-stations" aria-label="Arbetsstationer i ${trainingSafe(definition.title.toLowerCase())}">${definition.stations.map(([key,label,icon])=>`<button ${key===station&&(detail||ROOM_WORK_ROUTES[room][key][0]===state.page)?'aria-current="page"':''} onclick="${roomCoachCode('roomWorkSwitch',room,key,token)}">${clubhouseThemeIcon(icon)}<span>${trainingSafe(label)}</span></button>`).join('')}</nav><div class="rw-tools ${room==='recruit'?'rw-recruit-tools':''}"><span class="rw-nav-label">Fler verktyg</span>${roomWorkTabs(location)}<div class="rw-search">${playerSearchView()}</div></div></aside><div class="ch-work-content rw-content" id="ch-work-content" tabindex="-1"><div class="desk-page" data-area="${deskArea()?.id||'other'}" data-page="${state.page}">${deskLeagueNavigation()}${html}</div></div><footer class="rw-status"><span>${trainingSafe(title)}</span><span>${trainingSafe(calText(m.date))} · ${trainingSafe(seasonLabel())}</span></footer></section>${clubhouseUI.areas?clubhouseThemeAreas():''}</div>${clubhouseThemeFooter(m,true)}</section>`;
}
const roomWorkWorldView=clubhouseWorldView;
clubhouseWorldView=function(html){
 if(clubhouseIsRoom())return roomWorkWorldView(html);
 clubhouseLifeSync();return roomWorkSurface(html,clubhouseModel());
};
const roomWorkReturn=clubhouseReturn;
clubhouseReturn=function(){
 const target=roomWorkUI.returnStation,result=roomWorkReturn();
 if(target&&clubhouseIsRoom()&&clubhouseRoomsKey()===target.room)document.getElementById('room-station-'+target.room+'-'+target.station)?.focus?.({preventScroll:true});
 return result;
};
// A profile opened from the magnets also returns to that exact board through
// the profile's own Back button and browser history, including its comparison.
const roomWorkSnapshot=deskSnapshot;
deskSnapshot=function(){
 const view=roomWorkSnapshot();
 if(clubhouseIsRoom()&&roomCoachUI.owner===state&&(roomCoachUI.board||roomCoachUI.step))view.roomWork={club:managerClub(),date:state.calendar.date,room:clubhouseUI.room,hub:clubhouseRoomsUI.hub,station:clubhouseRoomsUI.station,coaching:{board:roomCoachUI.board,step:roomCoachUI.step,before:roomCoachUI.before,report:roomCoachUI.report}};
 return view;
};
const roomWorkRestore=deskRestore;
deskRestore=function(view){
 const result=roomWorkRestore(view),saved=view?.roomWork;
 if(saved&&saved.club===managerClub()&&saved.date===state.calendar.date&&clubhouseAvailable()&&['home','locker'].includes(state.page)){
  Object.assign(clubhouseUI,{room:saved.room,work:false,player:null,origin:null});clubhouseRoomsSync();
  Object.assign(clubhouseRoomsUI,{hub:saved.hub,station:saved.station});roomCoachSync();Object.assign(roomCoachUI,saved.coaching);render();
 }
 return result;
};
// Keep the outer work scroll while filters, selections and confirmations rerender.
const roomWorkRender=render;
render=function(){
 const before=document.getElementById('ch-work-content');
 const context=JSON.stringify([state.page,state.page==='transfers'?state.recruitment?.tab:null,managerClub()]);
 const position=before&&document.querySelector?.('.rw-workbench')?{top:before.scrollTop,left:before.scrollLeft,context:roomWorkUI.scroll?.context}:null;
 const result=roomWorkRender();
 const next=document.getElementById('ch-work-content');
 if(next&&position&&position.context===context){next.scrollTop=position.top;next.scrollLeft=position.left;}
 roomWorkUI.scroll={context};return result;
};
