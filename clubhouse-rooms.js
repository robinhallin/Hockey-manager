'use strict';
// Room workstations present the existing career. Only explicit, guarded actions
// call its canonical commands; opening a room never trains, scouts or simulates.
const clubhouseRoomsUI={owner:null,club:null,day:null,token:0,hub:true,opening:false,station:null,date:null,unit:'even'};
const CLUBHOUSE_WORKROOMS={
 office:{area:'office',title:'Tränarkontoret',subtitle:'Dagens beslut börjar vid ditt skrivbord.',image:'office',stations:[['desk','Skrivbordet','briefcase',33,54],['week','Veckoplanen','calendar3',22,24],['visitor','Enskilda samtal','people',76,74]]},
 locker:{area:'team',title:'Omklädningsrummet',subtitle:'Se människorna bakom laguttagningen.',image:'locker',stations:[['team','Spelarplatserna','people',70,42],['talk','Samtal & löften','chat-dots',26,60],['roles','Rolltavlan','clipboard',18,25]]},
 tactics:{area:'tactics',title:'Taktikrummet',subtitle:'Forma femmorna. Följ vad samspelet faktiskt ger.',image:'tactics',stations:[['board','Taktiktavlan','clipboard',30,32],['review','Analysbordet','bar-chart',67,67],['opponent','Motståndsskärmen','search',75,25]]},
 ice:{area:'development',title:'Utvecklingscentret',subtitle:'Knyt träning, återhämtning och matchtid till nästa steg.',image:'development',stations:[['plan','Veckans träning','calendar3',16,26],['medical','Medicinska teamet','heart-pulse',34,67],['academy','Akademin','people',83,60]]},
 recruit:{area:'recruit',title:'Scoutkontoret',subtitle:'Från ett verkligt truppbehov till ett genomtänkt beslut.',image:'recruit',stations:[['needs','Truppbygget','clipboard',28,28],['reports','Scoutens skrivbord','search',40,70],['deals','Förhandlingsbordet','briefcase',72,55]]},
 boardroom:{area:'club',title:'Styrelserummet',subtitle:'Väg ambitionerna mot klubbens faktiska resurser.',image:'boardroom',stations:[['direction','Klubbens riktning','clipboard',22,25],['budget','Budgetbordet','briefcase',50,60],['staff','Stabsmötet','people',78,32]]},
 world:{area:'world',title:'Omvärldsrummet',subtitle:'Följ motstånd, händelser och möjligheter utanför klubben.',image:'world',stations:[['news','Hockeyskärmarna','globe2',28,29],['watch','Bevakningsbordet','search',50,65],['international','Landslag & NHL','people',77,40]]}
};
Object.assign(CLUBHOUSE_ROOMS,{tactics:{name:'Taktikrummet',subtitle:CLUBHOUSE_WORKROOMS.tactics.subtitle,number:'07'}});

function clubhouseRoomsSync(){
 const u=clubhouseRoomsUI,club=managerClub(),day=state.calendar?.date;
 if(u.owner!==state||u.club!==club){u.owner=state;u.club=club;u.day=day;u.token++;u.hub=true;u.station=null;u.date=null;u.unit='even';}
 if(u.day!==day){u.day=day;u.token++;u.station=null;u.date=null;}
}
function clubhouseRoomsKey(){clubhouseRoomsSync();return clubhouseUI.room==='office'&&clubhouseRoomsUI.hub?'hub':CLUBHOUSE_WORKROOMS[clubhouseUI.room]?clubhouseUI.room:'office';}
function clubhouseRoomsGuard(token,room){
 return clubhouseAvailable()&&clubhouseEnabled()&&clubhouseIsRoom()&&!dayTransition&&!calendarPaceRun&&
 clubhouseRoomsUI.owner===state&&clubhouseRoomsUI.club===managerClub()&&clubhouseRoomsUI.day===state.calendar.date&&
 Number(token)===clubhouseRoomsUI.token&&(!room||clubhouseRoomsKey()===room);
}
function clubhouseRoomsCode(name,...args){return name+'('+args.map(a=>JSON.stringify(a)).join(',')+')';}
function clubhouseRoomsButton(label,code,detail='',primary=false,disabled=false){return `<button type="button" class="cr-action ${primary?'cr-primary':''}" onclick="${trainingSafe(code)}" ${disabled?'disabled':''}><span><strong>${trainingSafe(label)}</strong>${detail?`<small>${trainingSafe(detail)}</small>`:''}</span>${clubhouseThemeIcon('arrow-right')}</button>`;}
function clubhouseRoomsOpen(page,tab,token){
 if(token!==undefined&&!clubhouseRoomsGuard(token))return false;
 if(!clubhouseAvailable())return false;
 const origin={room:clubhouseUI.room,player:clubhouseUI.player,guest:clubhouseUI.officeGuest,hub:clubhouseRoomsUI.hub,station:clubhouseRoomsUI.station};
 clubhouseUI.work=true;clubhouseUI.navigating=true;
 try{clubhouseOpen(page,tab);}finally{clubhouseUI.navigating=false;}
 clubhouseUI.origin=origin;clubhouseUI.work=true;render();return true;
}
const clubhouseRoomsBaseGo=clubhouseGo;
clubhouseGo=function(room){
 clubhouseRoomsSync();
 if(!clubhouseAvailable()||!Object.hasOwn(CLUBHOUSE_ROOMS,room))return false;
 clubhouseRoomsUI.hub=room==='office'&&!clubhouseRoomsUI.opening;clubhouseRoomsUI.station=null;
 return clubhouseRoomsBaseGo(room);
};
function clubhouseRoomsVisit(room){
 clubhouseRoomsSync();if(!Object.hasOwn(CLUBHOUSE_WORKROOMS,room)||!clubhouseAvailable())return false;
 clubhouseRoomsUI.opening=true;
 try{return clubhouseGo(room);}finally{clubhouseRoomsUI.opening=false;}
}
const clubhouseRoomsBaseNavigation=clubhouseNavigation;
clubhouseNavigation=function(page){
 const origin=!clubhouseUI.navigating&&clubhouseIsRoom()?{hub:clubhouseRoomsUI.hub,station:clubhouseRoomsUI.station}:null;
 clubhouseRoomsBaseNavigation(page);
 if(origin&&clubhouseUI.origin)Object.assign(clubhouseUI.origin,origin);
};
const clubhouseRoomsBaseReturn=clubhouseReturn;
clubhouseReturn=function(){
 const origin=clubhouseUI.origin,hub=origin?.hub;
 const result=clubhouseRoomsBaseReturn();
 if(hub!==undefined){clubhouseRoomsUI.hub=hub;clubhouseRoomsUI.station=origin.station||null;render();}
 return result;
};
const clubhouseRoomsBaseArea=clubhouseThemeArea;
clubhouseThemeArea=function(){
 if(clubhouseIsRoom())return CLUBHOUSE_THEME_AREAS.find(a=>a.id===(CLUBHOUSE_WORKROOMS[clubhouseRoomsKey()]?.area||'office'))||CLUBHOUSE_THEME_AREAS[0];
 return clubhouseRoomsBaseArea();
};
clubhouseThemeNavigate=function(page){
 if(!clubhouseAvailable())return false;
 const area=CLUBHOUSE_THEME_AREAS.find(a=>a.page===page);
 if(area)return clubhouseRoomsVisit(({office:'office',team:'locker',tactics:'tactics',development:'ice',recruit:'recruit',club:'boardroom',world:'world'})[area.id]);
 return clubhouseRoomsOpen(page);
};
function clubhouseRoomsStation(key,token){
 if(!clubhouseRoomsGuard(token))return false;
 const room=CLUBHOUSE_WORKROOMS[clubhouseRoomsKey()];if(!room?.stations.some(s=>s[0]===key))return false;
 clubhouseRoomsUI.station=key;render();return true;
}
function clubhouseRoomsDay(date,token){
 if(!clubhouseRoomsGuard(token,'ice')||!/^\d{4}-\d{2}-\d{2}$/.test(date)||calGap(state.calendar.date,date)<0||calGap(state.calendar.date,date)>6)return false;
 clubhouseRoomsUI.date=date;render();return true;
}
function clubhouseRoomsSession(date,key,value,token){
 if(!clubhouseRoomsGuard(token,'ice')||date!==(clubhouseRoomsUI.date||state.calendar.date)||calGap(state.calendar.date,date)<0||calGap(state.calendar.date,date)>6)return false;
 if(calendarFixtures().some(f=>f.date===date)||!['type','intensity'].includes(key)||key==='type'&&!TRAINING_SESSIONS[value]||key==='intensity'&&!['light','normal','hard'].includes(value))return false;
 if(key==='intensity'&&['recovery','matchprep'].includes(calendarSession(date).type))return false;
 calendarSetSession(date,key,value);return true;
}
function clubhouseRoomsUnit(unit,token){if(!clubhouseRoomsGuard(token,'tactics')||!['even','pp','pk'].includes(unit))return false;clubhouseRoomsUI.unit=unit;render();return true;}
function clubhouseRoomsTalk(id,token){const p=managerRoster().find(p=>samePlayerId(p.id,id));if(!clubhouseRoomsGuard(token,'locker')||!p||!clubhousePresence(p).present)return false;return clubhouseSelect(id);}
function clubhouseRoomsProfile(id,token){
 if(!clubhouseRoomsGuard(token)||!managerRoster().some(p=>samePlayerId(p.id,id)))return false;
 clubhouseRoomsOpen('squad',undefined,token);deskOpenPlayer(id);return true;
}
function clubhouseRoomsFollow(club,token){if(!clubhouseRoomsGuard(token,'world')||club===managerClub()||!state.clubRosters[club])return false;return worldWatchToggle('club',club);}
function clubhouseRoomsLine(kind,index,token){
 if(!clubhouseRoomsGuard(token,'tactics')||!['line','pair','pp','pk'].includes(kind)||!Number.isInteger(index)||index<0||index>=(kind==='line'?4:kind==='pair'?3:2))return false;
 clubhouseRoomsOpen('lines',undefined,token);
 if(kind==='line'||kind==='pair'){lineupWorkspace='even';lineupSelectUnit(kind,index);}else{lineupWorkspace='special';specialUI.unit=(kind==='pp'?'pp':'pk')+(index+1);specialUI.slot=null;render();}
 return true;
}
function clubhouseRoomsPlayer(p,detail,code){return `<button class="cr-person" onclick="${trainingSafe(code)}">${playerAvatar(p,true)}<span><strong>${trainingSafe(p.name)}</strong><small>${trainingSafe(detail)}</small></span>${clubhouseThemeIcon('arrow-right')}</button>`;}
function clubhouseRoomsSection(title,body){return `<section class="cr-section"><h2>${trainingSafe(title)}</h2>${body}</section>`;}
function clubhouseRoomsEmpty(text){return `<p class="cr-empty">${trainingSafe(text)}</p>`;}
function clubhouseRoomsStats(rows){return `<dl class="cr-stats">${rows.map(([label,value])=>`<div><dt>${trainingSafe(label)}</dt><dd>${trainingSafe(value)}</dd></div>`).join('')}</dl>`;}
function clubhouseRoomsData(m){
 const roster=managerRoster(),token=clubhouseRoomsUI.token,room=clubhouseRoomsKey();
 const concerns=roster.map(p=>({p,factors:lockerFactors(p),promises:lockerPlayerPromises(p)})).sort((a,b)=>(b.factors[0]?.priority||0)-(a.factors[0]?.priority||0)||a.p.name.localeCompare(b.p.name,'sv'));
 const injuries=roster.filter(p=>p.health?.injury),risk=roster.filter(p=>!p.health?.injury&&medicalRiskLabel(p)==='Hög');
 const agenda=m.life.agenda.filter(a=>a.room===room);
 return {roster,token,room,concerns,injuries,risk,agenda};
}
function clubhouseRoomsScene(m){
 const key=clubhouseRoomsKey();if(key==='hub')return '';
 const room=CLUBHOUSE_WORKROOMS[key],token=clubhouseRoomsUI.token,selected=clubhouseRoomsUI.station||room.stations[0][0];
 return `<div class="ct-scene cr-scene" aria-label="${trainingSafe(room.title)}" ${!clubhouseIsRoom()?'inert':''}><img class="cr-environment" src="assets/clubhouse/rooms/${room.image}.webp" alt="${trainingSafe(room.title)} i klubbhuset" fetchpriority="high"><div class="cr-room-tools"><button onclick="clubhouseGo('office')">${clubhouseThemeIcon('arrow-left')}Klubbhuset</button><span>${trainingSafe(m.club)} · ${trainingSafe(calText(m.date))}</span></div><nav class="cr-stations" aria-label="Arbetsstationer i ${trainingSafe(room.title.toLowerCase())}">${room.stations.map(([id,label,icon,x,y])=>`<button class="cr-station" style="--cr-x:${x}%;--cr-y:${y}%" aria-pressed="${id===selected}" onclick="${trainingSafe(clubhouseRoomsCode('clubhouseRoomsStation',id,token))}">${clubhouseThemeIcon(icon)}<span>${trainingSafe(label)}</span></button>`).join('')}</nav><div class="cr-room-caption"><span>DIN PLATS I KLUBBEN</span><h1>${trainingSafe(room.title)}</h1><p>${trainingSafe(room.subtitle)}</p></div></div>`;
}
function clubhouseRoomsPanel(m){
 const key=clubhouseRoomsKey();if(key==='hub')return clubhouseThemeRoomPanel(m);
 if(clubhouseUI.wardrobe||clubhouseUI.briefing||clubhousePlayer())return '<aside class="cr-side-panel" aria-hidden="true"></aside>';
 const room=CLUBHOUSE_WORKROOMS[key],data=clubhouseRoomsData(m),station=room.stations.find(s=>s[0]===clubhouseRoomsUI.station)||room.stations[0],token=data.token;
 const open=(label,page,tab,detail='',primary=false)=>clubhouseRoomsButton(label,clubhouseRoomsCode('clubhouseRoomsOpen',page,tab??null,token),detail,primary);
 let body='';
 if(key==='office'){
  if(station[0]==='week')body=clubhouseRoomsSection('Nästa dagar',Array.from({length:4},(_,i)=>{const date=calAdd(m.date,i),fixture=calendarFixtures().find(f=>f.date===date);return `<article class="cr-note"><small>${trainingSafe(calText(date))}</small><strong>${trainingSafe(fixture?fixture.opponent:TRAINING_SESSIONS[calendarSession(date).type].name)}</strong><p>${fixture?'Matchdag':trainingSafe(TRAINING_SESSIONS[calendarSession(date).type].description)}</p></article>`;}).join(''))+clubhouseRoomsButton('Planera i utvecklingscentret',"clubhouseRoomsVisit('ice')",'Välj pass och belastning direkt vid veckotavlan',true);
  else if(station[0]==='visitor')body=clubhouseRoomsSection('Vem behöver dig?',m.life.visitor?clubhouseRoomsButton(m.life.visitor.name,clubhouseRoomsCode('clubhouseAcceptVisitor',m.life.visitor.playerId),m.life.visitor.detail,true):clubhouseRoomsEmpty('Ingen spelare väntar på kontoret just nu.'))+clubhouseRoomsButton('Träffa hela laget',"clubhouseRoomsVisit('locker')",'Spelarnas roller, löften och relationer');
  else body=clubhouseRoomsStats([['Svar som krävs',m.tasks.length],['Nästa match',m.fixture?calText(m.fixture.date):'Ej bokad']])+clubhouseRoomsSection('På ditt skrivbord',m.life.agenda.slice(0,4).map(a=>clubhouseRoomsButton(a.title,clubhouseRoomsCode('clubhouseLifeOpen',a.id),a.detail)).join('')||clubhouseRoomsEmpty('Inga aktuella ärenden. Dagens program finns på veckotavlan.'))+open('Öppna inkorgen','inbox',null,'Alla beslut och rapporter',true);
 }
 if(key==='locker'){
  const needing=data.concerns.filter(r=>r.factors.length||r.promises.length);
  body=clubhouseRoomsStats([['På plats',data.roster.filter(p=>clubhousePresence(p).present).length+'/'+data.roster.length],['Aktiva löften',data.concerns.reduce((n,r)=>n+r.promises.length,0)]]);
  if(station[0]==='roles')body+=clubhouseRoomsSection('Roller att följa upp',data.concerns.slice(0,4).map(({p,promises})=>clubhouseRoomsPlayer(p,(p.promisedRole||'Truppspelare')+(promises.length?' · '+promises.length+' löften':''),clubhouseRoomsCode('clubhouseRoomsProfile',p.id,token))).join(''))+open('Roller, avtal & användning','squad',null,'Jämför förväntningarna med verklig matchtid',true);
  else{
   const rows=station[0]==='talk'?needing.slice(0,5):data.concerns.slice(0,5);
   body+=clubhouseRoomsSection(station[0]==='talk'?'Assistentens samtalsunderlag':'Spelare att träffa',rows.map(({p,factors,promises})=>{const present=clubhousePresence(p).present;return clubhouseRoomsPlayer(p,present?(factors[0]?.text||p.promisedRole||'Spelare i truppen')+(promises.length?' · '+promises.length+' löften':''):clubhousePresence(p).label,clubhouseRoomsCode(present?'clubhouseRoomsTalk':'clubhouseRoomsProfile',p.id,token));}).join('')||clubhouseRoomsEmpty('Inga aktuella samtalsärenden. Träffa spelarna vid deras platser.'));
   body+=`<label class="cr-field">Vem vill du träffa?<select id="clubhouse-player-select" aria-label="Vem vill du träffa?" onchange="if(this.value)clubhouseRoomsTalk(this.value,${token})"><option value="">Välj i hela truppen</option>${data.roster.filter(p=>clubhousePresence(p).present).map(p=>`<option value="${trainingSafe(p.id)}">${trainingSafe(p.name)} · ${trainingSafe(p.pos)}</option>`).join('')}</select></label>`+open('Hela truppen & avtal','squad',null,'Spelare, roller och kontrakt');
  }
 }
 if(key==='tactics'){
  if(station[0]==='opponent')body=clubhouseRoomsSection('Nästa uppgift',m.fixture?`<article class="cr-note"><small>${trainingSafe(calText(m.fixture.date))} · ${trainingSafe(m.fixture.type)}</small><strong>${trainingSafe(m.fixture.opponent)}</strong><p>Utgå från scoutrapporten och välj matchplan innan du ändrar kedjorna.</p></article>`:clubhouseRoomsEmpty('Ingen kommande match i det aktuella schemat.'))+open('Motståndarens underlag','opponents',null,'Scoutrapport och förutsättningar',true);
  else if(station[0]==='review'){
   const samples=lineupEvidenceSamples(),evidence=formationEvidence(samples).rows.slice(0,3);
   body=clubhouseRoomsStats([['Tävlingsrapporter',samples.length],['Urval','Senaste 5']])+clubhouseRoomsSection('Gemensamt spel',evidence.map(r=>`<article class="cr-note"><strong>${trainingSafe(r.names.join(' · '))}</strong><small>${r.games.length} matcher · ${analysisTime(r.seconds)}</small><p>${trainingSafe(r.signal)}</p></article>`).join('')||clubhouseRoomsEmpty('Inga kompletta tävlingsrapporter ännu. Underlaget byggs av faktisk gemensam istid.'))+open('Öppna matchanalysen','statistics',null,'Se händelserna bakom bedömningen',true);
  }else{
   const unit=clubhouseRoomsUI.unit,groups=unit==='even'?[...Array.from({length:4},(_,i)=>({kind:'line',i,label:'Kedja '+(i+1),ids:state.lines?.forwards?.slice(i*3,i*3+3)||[]})),...Array.from({length:3},(_,i)=>({kind:'pair',i,label:'Backpar '+(i+1),ids:state.lines?.defense?.slice(i*2,i*2+2)||[]}))]:Array.from({length:2},(_,i)=>({kind:unit,i,label:(unit==='pp'?'Powerplay ':'Boxplay ')+(i+1),ids:state.specialTeams?.[(unit==='pp'?'pp':'pk')+(i+1)]||[]}));
   body=`<nav class="cr-tabs" aria-label="Enheter på taktiktavlan">${[['even','5 mot 5'],['pp','Powerplay'],['pk','Boxplay']].map(([id,label])=>`<button aria-pressed="${unit===id}" onclick="clubhouseRoomsUnit('${id}',${token})">${label}</button>`).join('')}</nav>`+clubhouseRoomsSection('Din aktuella uttagning',groups.map(g=>clubhouseRoomsButton(g.label,clubhouseRoomsCode('roomCoachBoardUnit',g.kind,g.i,token),g.ids.length?g.ids.map(id=>data.roster.find(p=>samePlayerId(p.id,id))?.name||'Ledig plats').join(' · '):'Ingen enhet vald ännu')).join(''))+clubhouseRoomsButton('Arbeta vid taktiktavlan','roomCoachBoardOpen()','Flytta magneter, välj spelare och ångra direkt här',true);
  }
 }
 if(key==='ice'){
  if(station[0]==='medical')body=clubhouseRoomsStats([['Skadade',data.injuries.length],['Hög risk',data.risk.length]])+clubhouseRoomsSection('Medicinsk uppföljning',[...data.injuries,...data.risk].slice(0,4).map(p=>clubhouseRoomsPlayer(p,p.health?.injury?medicalStatus(p):'Hög skaderisk · granska belastningen',clubhouseRoomsCode('clubhouseRoomsProfile',p.id,token))).join('')||clubhouseRoomsEmpty('Inga skadade eller högriskklassade spelare i A-truppen.'))+open('Medicinska teamets bedömning','medical',null,'Tillgänglighet, återgång och individuell belastning',true);
  else if(station[0]==='academy'){
   const players=(state.juniors?.roster||[]).filter(p=>!p.academy?.loan).slice().sort((a,b)=>a.age-b.age).slice(0,3);
   body=clubhouseRoomsSection('Spelarnas nästa steg',players.map(p=>`<article class="cr-note"><strong>${trainingSafe(p.name)}</strong><small>${p.age} år · ${trainingSafe(p.pos)}</small><p>${trainingSafe(developmentNext(p))}</p></article>`).join('')||clubhouseRoomsEmpty('Ingen aktiv juniortrupp i klubben.'))+open('Akademin & utvecklingsvägar','juniors',null,'Bedöm träningsmiljö, seniorchanser och lån',true);
  }else{
   const date=clubhouseRoomsUI.date||m.date,session=calendarSession(date),fixture=calendarFixtures().find(f=>f.date===date),controlled=state.training.assistantOwner==='assistant';
   body=`<nav class="cr-days" aria-label="Välj träningsdag">${Array.from({length:7},(_,i)=>{const day=calAdd(m.date,i);return `<button aria-pressed="${day===date}" onclick="clubhouseRoomsDay('${day}',${token})"><small>${new Date(day+'T12:00:00Z').toLocaleDateString('sv-SE',{weekday:'short',timeZone:'UTC'})}</small><strong>${Number(day.slice(-2))}</strong></button>`;}).join('')}</nav>`;
   body+=clubhouseRoomsSection(calText(date),fixture?`<article class="cr-note"><strong>${trainingSafe(fixture.opponent)}</strong><p>Matchdag. Inget vanligt lagpass planeras ovanpå matchen.</p></article>`:`<label class="cr-field">Lagpass<select aria-label="Lagpass i utvecklingscentret" onchange="clubhouseRoomsSession('${date}','type',this.value,${token})">${Object.entries(TRAINING_SESSIONS).map(([id,s])=>`<option value="${id}" ${id===session.type?'selected':''}>${trainingSafe(s.name)}</option>`).join('')}</select></label><label class="cr-field">Belastning<select aria-label="Belastning i utvecklingscentret" onchange="clubhouseRoomsSession('${date}','intensity',this.value,${token})" ${['recovery','matchprep'].includes(session.type)?'disabled':''}>${[['light','Lätt'],['normal','Normal'],['hard','Hård']].map(([id,label])=>`<option value="${id}" ${(session.type==='recovery'||session.type==='matchprep'?'light':session.intensity)===id?'selected':''}>${label}</option>`).join('')}</select></label><p class="cr-explanation">${trainingSafe(TRAINING_SESSIONS[session.type].description)} Passet genomförs när dagen avslutas.${controlled?' Ditt val gäller som undantag till assistentens plan.':''}</p>`)+open('Spelarutveckling & individuella planer','training',null,'Följ träning, matchtid och utvecklingssamtal');
  }
 }
 if(key==='recruit'){
  const budget=managerRecruitmentBudget(),jobs=(scoutingOffice()?.jobs||[]).filter(j=>j.status==='active'),deals=hubAffairRows().filter(r=>['pending','counter'].includes(r.status));
  body=clubhouseRoomsStats([['Löneutrymme',careerMoney(budget.wageRoom)],['Scoutuppdrag',jobs.length]]);
  if(station[0]==='deals')body+=clubhouseRoomsSection('På förhandlingsbordet',deals.slice(0,4).map(r=>clubhouseRoomsButton(r.name,clubhouseRoomsCode('officeOpenDeal',r.key),r.d.dueDate?'Besked '+calText(r.d.dueDate):'Granska status, villkor och nästa steg')).join('')||clubhouseRoomsEmpty('Inga pågående affärer. Ett bud skapas först när du själv går vidare med en kandidat.'))+open('Bud, avtal & inkommande förfrågningar','transfers','deals','Granska konsekvenserna före ditt besked',true);
  else if(station[0]==='reports')body+=clubhouseRoomsSection('Scouting som pågår',jobs.slice(0,3).map(j=>`<article class="cr-note"><strong>${trainingSafe(SCOUT_METHODS[j.method]?.name||'Scoutuppdrag')}</strong><small>${trainingSafe(j.observer?.name||'Ansvarig scout')} · nästa observation ${trainingSafe(calText(j.next))}</small><p>${trainingSafe(j.players.map(id=>findPlayerAnywhere(id)?.name||'Spelare').join(' · '))}</p></article>`).join('')||clubhouseRoomsEmpty('Inga aktiva scoutuppdrag. Utgå från ett truppbehov innan du beställer observationer.'))+open('Planera scoutuppdrag','transfers','missions','Se kostnad, omfattning och ansvarig scout',true)+open('Bevakade kandidater & rapporter','transfers','shortlist','Bedöm underlaget innan du förhandlar');
  else body+=clubhouseRoomsSection('Behoven först',recruitmentPriorities().map(n=>`<article class="cr-note"><strong>${trainingSafe(n.label||n.name)}</strong><small>${trainingSafe(n.name)}</small><p>${n.need?n.count+' spelklara, riktmärke '+n.target+'. Pröva de interna alternativen.':n.futureNeed?n.secure+' säkrade till nästa säsong, riktmärke '+n.target+'. Se över förlängningar.':'Granska kvalitet och rollpassning före en förstärkning.'}</p></article>`).join('')||clubhouseRoomsEmpty('Inget prioriterat truppbehov just nu.'))+open('Truppplanering & interna alternativ','transfers','needs','Avtal, rollbehov och möjliga ersättare',true)+open('Hitta kandidater','transfers','search','Sök i den verkliga spelardatabasen');
 }
 if(key==='boardroom'){
  const budget=managerRecruitmentBudget(),vision=clubVision(),confidence=Math.round(state.managerCareer?.confidence||0);
  body=clubhouseRoomsStats([['Styrelsens förtroende',confidence+'/100'],['Klubbkassa',careerMoney(state.money)]]);
  if(station[0]==='budget')body+=clubhouseRoomsSection('Utrymmet efter åtaganden',clubhouseRoomsStats([['Tillgänglig kassa',careerMoney(budget.availableCash)],['Löneutrymme / år',careerMoney(budget.wageRoom)],['Nästa säsong / år',careerMoney(budget.futureRoom)]]))+open('Kassaflöde & prognos','finance',null,'Väg nya åtaganden mot befintliga avtal',true);
  else if(station[0]==='staff')body+=clubhouseRoomsSection('Människorna runt laget',(state.staff||[]).slice(0,5).map(p=>`<article class="cr-note"><strong>${trainingSafe(p.name)}</strong><small>${trainingSafe(({assistant:'Assisterande tränare',scout:'Scout',goalie:'Målvaktstränare',junior:'Junioransvarig',physio:'Fysioterapeut'})[p.id]||p.specialty||'Stab')}</small><p>${careerMoney(p.salary||0)}/år · avtal till ${p.expires}</p></article>`).join(''))+open('Stab, kompetens & ansvar','staff',null,'Granska ansvar innan du delegerar',true)+open('Följ upp stabens arbete','staffReview');
  else body+=clubhouseRoomsSection('Det långsiktiga uppdraget',`<article class="cr-note"><strong>${trainingSafe(vision?.name||'Ditt klubbprojekt')}</strong><p>${vision?'Följ projektets riktning, utvalda spelare och verkliga utfall i styrelseunderlaget.':'Välj en riktning tillsammans med styrelsen och vilka spelare du vill bygga kring.'}</p></article>`)+open('Mål, styrelse & klubbprojekt','board',null,'Besluten följs genom karriärens utfall',true)+open('Din tränarkarriär & förtroende','manager');
 }
 if(key==='world'){
  const following=worldWatchStore(),news=worldHockeyNews(20),next=m.fixture?.opponent;
  body=clubhouseRoomsStats([['Klubbar du följer',following?.clubs.length||0],['Spelare du följer',following?.players.length||0]]);
  if(station[0]==='watch')body+=clubhouseRoomsSection('Din bevakning',(following?.clubs||[]).slice(0,4).map(club=>clubhouseRoomsButton(club,clubhouseRoomsCode('clubhouseRoomsFollow',club,token),'Följs · klicka för att sluta följa')).join('')||clubhouseRoomsEmpty('Du följer inga klubbar ännu. Bevaka nästa motståndare för relevanta händelser i inkorgen.'))+(next&&state.clubRosters[next]&&!following?.clubs.includes(next)?clubhouseRoomsButton('Följ '+next,clubhouseRoomsCode('clubhouseRoomsFollow',next,token),'Nästa motståndare · nya relevanta händelser till inkorgen',true):'')+open('Alla nyheter & bevakningar','world');
  else if(station[0]==='international')body+=clubhouseRoomsSection('Hockey utanför klubben',clubhouseRoomsEmpty('Uttagningar, turneringar, draft och spelaravtal följer den sparade spelvärldens kalender.'))+open('Landslag & JVM','international',null,'Uttagningar, resultat och spelarbelastning',true)+open('Nordamerika & draft','nhl',null,'Rättigheter och avtal är separata steg')+open('Ligor, tabeller & klubbar','leagues');
  else body+=clubhouseRoomsSection('Senast i din spelvärld',news.slice(0,4).map(e=>`<article class="cr-note"><small>${trainingSafe(calText(e.date))} · ${trainingSafe(e.club||e.source||'Hockeyvärlden')}</small><strong>${trainingSafe(referencePlainText(e.title))}</strong><p>${trainingSafe(referencePlainText(e.text||''))}</p></article>`).join('')||clubhouseRoomsEmpty('Inga registrerade nyheter ännu. Händelser skapas när karriären går framåt.'))+open('Öppna nyhetsflödet','world',null,'Nyheter, klubbförändringar och möjliga scoutspår',true);
 }
 const tasks=data.agenda.slice(0,2);
 if(tasks.length&&key!=='office')body+=`<details class="cr-room-cases"><summary>${tasks.length} aktuella ärenden i rummet</summary>${tasks.map(a=>clubhouseRoomsButton(a.title,clubhouseRoomsCode('clubhouseLifeOpen',a.id),a.detail)).join('')}</details>`;
 return `<aside class="cr-side-panel" aria-label="Arbete i ${trainingSafe(room.title.toLowerCase())}"><header><span class="ct-eyebrow">${trainingSafe(m.club)} · ${trainingSafe(seasonLabel())}</span><h2>${trainingSafe(station[1])}</h2><p>${trainingSafe(room.subtitle)}</p></header><nav class="cr-side-tabs" aria-label="Arbetsstationer">${room.stations.map(s=>`<button aria-pressed="${station[0]===s[0]}" onclick="clubhouseRoomsStation('${s[0]}',${token})">${clubhouseThemeIcon(s[2])}<span>${trainingSafe(s[1])}</span></button>`).join('')}</nav><div class="cr-side-body">${body}</div><footer>Rummet visar ditt lag och dina pågående ärenden.</footer></aside>`;
}
