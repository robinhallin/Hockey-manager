"use strict";
// All boards edit the existing lineup model. Back pairs retain their own rotation.
function lineupIce(){return `<svg class="multi-ice" viewBox="0 0 600 380" preserveAspectRatio="none" aria-hidden="true"><rect x="6" y="6" width="588" height="368" rx="70" fill="#cfdfdf" stroke="#789697" stroke-width="4"/><path d="M10 300h580" stroke="#628fba" stroke-width="7"/><path d="M25 62h550" stroke="#b57480" stroke-width="3"/><path d="M272 62V42h56v20" fill="none" stroke="#a85f6c" stroke-width="5"/><g fill="none" stroke="#b57480" stroke-width="2"><circle cx="154" cy="186" r="55"/><circle cx="446" cy="186" r="55"/></g></svg>`;}
function lineupBoardSlot(type,index,label,x,y){
 const id=type==='goalie'?state.lines.goalie:state.lines[type][index],p=playerById(id),selected=lineupUI.slot?.type===type&&lineupUI.slot.index===index;
 return `<div class="multi-player ${selected?'selected':''}" data-lineup-slot="${type}-${index}" ${x==null?'':`style="left:${x}%;top:${y}%"`} draggable="${Boolean(p)&&medicalAvailable(p)&&!hockeyChangeBlocked()}" ondragstart="lineupDrag(event,'${type}',${index})" ondragover="event.preventDefault()" ondrop="lineupDrop(event,'${type}',${index})"><button class="multi-position" aria-pressed="${selected}" onclick="lineupPickSlot('${type}',${index})">${label} · Byt</button><strong>${p?playerReference(p.id,p.name):'Vakant'}</strong><small>${p?`${p.pos} · ${Math.round(readinessCeiling(p.fatigue))} % energi`:'Välj en spelare'}</small>${p?positionBadge(p,lineupRole(type,index)):''}</div>`;
}
function lineupBenchSwap(event,targetId){
 event.preventDefault();const id=event.dataTransfer.getData('text/plain'),p=playerById(id),target=playerById(targetId);
 if(!p||!target||samePlayerId(id,targetId)||!medicalAvailable(p)||!medicalAvailable(target)||!hockeyAllowChange())return;
 const type=samePlayerId(state.lines.goalie,id)?'goalie':state.lines.forwards.some(v=>samePlayerId(v,id))?'forwards':state.lines.defense.some(v=>samePlayerId(v,id))?'defense':null;
 if(!type){const s=depthSelection(),index=s.extras.findIndex(v=>samePlayerId(v,targetId));if(index>=0)depthSet('extra',index,id);else if(samePlayerId(s.backup,targetId))depthSet('backup',0,id);return;}
 if(type==='goalie'?target.pos!=='MV':target.pos==='MV')return;
 if(state.live?.running)pauseMatch();
 const selection=depthSelection(),extras=[...selection.extras],backup=selection.backup;
 if(type==='goalie')changeGoalie(target.id);else changeLinePlayer(type,state.lines[type].findIndex(v=>samePlayerId(v,id)),target.id);
 // Preserve which reserve is exchanged, rather than silently choosing a new one.
 state.matchSelection.extras=extras.map(v=>samePlayerId(v,targetId)?p.id:v);
 state.matchSelection.backup=samePlayerId(backup,targetId)?p.id:backup;
 depthSelection();save();render();
}
function lineupBenchPlayer(p,special=false){
 const available=medicalAvailable(p),selected=special?specialUI:lineupUI.slot;
 return `<article class="bench-player ${available?'':'unavailable'}" data-bench-player="${trainingSafe(p.id)}" draggable="${available&&!hockeyChangeBlocked()}" ondragstart="event.dataTransfer.setData('text/plain',${trainingSafe(JSON.stringify(String(p.id)))});event.dataTransfer.effectAllowed='move'" ${special?'':`ondragover="event.preventDefault()" ondrop="lineupBenchSwap(event,${trainingSafe(JSON.stringify(p.id))})"`}><span class="fm-pos">${p.pos}</span><div><strong>${playerReference(p.id,p.name)}</strong><small>${special?lineupWorkload(p):medicalReady(p)?p.promisedRole:medicalStatus(p)}</small></div><button class="fm-assign" onclick="${special?'specialPlace':'lineupPlace'}(${trainingSafe(JSON.stringify(p.id))})" aria-label="Placera ${trainingSafe(p.name)} på vald plats" ${!available||!selected||hockeyChangeBlocked()?'disabled':''}>Välj</button></article>`;
}
function lineupBenchWorkspace(){
 const s=depthSelection(),main=new Set([...state.lines.forwards,...state.lines.defense,state.lines.goalie].map(String)),locked=Boolean(state.live?.matchSquad&&!state.live.finished);
 const pool=managerRoster().filter(p=>!main.has(String(p.id))),reserves=pool.filter(p=>medicalReady(p)&&(locked?state.live.matchSquad.includes(String(p.id)):[...s.extras,s.backup].some(id=>samePlayerId(id,p.id)))),outside=pool.filter(p=>medicalReady(p)&&!reserves.includes(p)),unavailable=pool.filter(p=>!medicalReady(p));
 return `<section class="multi-bench"><header><h2>Bänk & matchtrupp</h2><p>${locked?'Matchtruppen är låst vid nedsläpp. Uttagna reserver kan bytas in.':'Dra en reserv till isen för att byta plats. Dra en spelare från isen till en reserv för motsatt byte.'}</p></header><div class="bench-groups"><section><h3>Reserver i matchtruppen · ${reserves.length}</h3>${reserves.map(p=>lineupBenchPlayer(p)).join('')||'<p>Inga spelklara reserver.</p>'}</section><section><h3>Utanför matchtruppen · ${outside.length}</h3>${outside.map(p=>lineupBenchPlayer(p)).join('')||'<p>Alla spelklara spelare är uttagna.</p>'}</section></div>${unavailable.length?`<details><summary>Ej tillgängliga · ${unavailable.length}</summary>${unavailable.map(p=>lineupBenchPlayer(p)).join('')}</details>`:''}<details><summary>Välj reservmålvakt och extra utespelare</summary>${depthBenchView()}</details></section>`;
}
function lineupFourBoards(){
 depthSelection();
 return `<section class="multi-lineup"><header class="workspace-heading"><div><span class="desk-kicker">${trainingSafe(managerClub())} · LAGUTTAGNING</span><h1>Fyra kedjor. Hela laget.</h1><p>Dra spelare mellan isarna. Du kan också välja Byt på en plats och sedan Välj vid en spelare. Ändringarna sparas direkt.</p></div></header><details class="multi-orders"><summary>Lagets taktiska instruktioner</summary>${desktopOrders()}</details>${hockeyChangeBlocked()?'<p role="status">Icing: spelarbyten är låsta till nedsläpp.</p>':''}<div class="multi-rinks">${[0,1,2,3].map(n=>`<section class="multi-board" data-board="line${n}"><header><h2>Kedja ${n+1}</h2><span>${n<2?'Nyckelspelare / ordinarie':n===2?'Ordinarie / rotation':'Rotation / bredd'}</span></header><div class="multi-rink" role="group" aria-label="Kedja ${n+1}">${lineupIce()}${['Vänsterforward','Center','Högerforward'].map((label,i)=>lineupBoardSlot('forwards',n*3+i,label,[18,50,82][i],[54,42,54][i])).join('')}</div><footer>${chemistryView(state.lines.forwards.slice(n*3,n*3+3))}</footer></section>`).join('')}</div><section class="multi-defense"><header><h2>Backpar & målvakt</h2><p>Tre backpar roterar separat från de fyra forwardskedjorna.</p></header><div class="back-pairs">${[0,1,2].map(n=>`<section><h3>Backpar ${n+1}</h3><div class="back-slots">${lineupBoardSlot('defense',n*2,'Vänsterback')}${lineupBoardSlot('defense',n*2+1,'Högerback')}</div></section>`).join('')}</div><div class="starting-goalie">${lineupBoardSlot('goalie',0,'Startande målvakt')}</div></section>${lineupBenchWorkspace()}${lineupUI.slot?desktopRoster():''}</section>`;
}
function specialDrag(event,key,index){
 const id=state.specialTeams?.[key]?.[index];if(id==null||!medicalAvailable(playerById(id))||hockeyChangeBlocked()){event.preventDefault();return;}
 event.dataTransfer.setData('text/plain',String(id));event.dataTransfer.setData('application/x-hm-special',JSON.stringify({key,index,id}));event.dataTransfer.effectAllowed='move';
}
function specialDrop(event,key,index){
 event.preventDefault();if(!['pp1','pp2','pk1','pk2'].includes(key)||!Number.isInteger(index)||index<0||index>=(key.startsWith('pp')?5:4))return;
 const id=event.dataTransfer.getData('text/plain'),p=playerById(id);if(!p||p.pos==='MV'||!medicalAvailable(p)||!hockeyAllowChange())return;
 let source;try{source=JSON.parse(event.dataTransfer.getData('application/x-hm-special')||'null');}catch{return;}
 if(!source){specialUI={unit:key,slot:index,query:''};changeSpecialPlayer(key,index,p.id);return;}
 if(!['pp1','pp2','pk1','pk2'].includes(source.key)||!Number.isInteger(source.index)||!samePlayerId(state.specialTeams[source.key]?.[source.index],source.id)||!samePlayerId(source.id,id))return;
 if(source.key===key){specialUI={unit:key,slot:index,query:''};changeSpecialPlayer(key,index,p.id);return;}
 const old=state.specialTeams[key][index];if(old==null||samePlayerId(old,id)||!medicalAvailable(playerById(old)))return;
 if(state.live?.running)pauseMatch();const before=tacticalReviewPlan(),a=[...state.specialTeams[source.key]],b=[...state.specialTeams[key]];
 const place=(unit,at,value)=>{const found=unit.findIndex(v=>samePlayerId(v,value));if(found>=0)[unit[at],unit[found]]=[unit[found],unit[at]];else unit[at]=value;};
 place(a,source.index,old);place(b,index,p.id);
 state.specialTeams[source.key]=a;state.specialTeams[key]=b;specialUI={unit:key,slot:index,query:''};tacticalReviewRecord(before,'Bytt spelare mellan special teams-enheter');save();render();
}
function specialFourBoards(){
 ensureSpecialTeams();
 const units=[['pp1','Powerplay 1'],['pp2','Powerplay 2'],['pk1','Boxplay 1'],['pk2','Boxplay 2']];
 const selectedSlots=SPECIAL_SLOTS[state.specialPlans[specialUI.unit.startsWith('pp')?'pp':'pk']],field=selectedSlots[specialUI.slot]?.[3]||'passing';
 const pool=managerRoster().filter(p=>p.pos!=='MV'&&medicalAvailable(p)&&p.name.toLocaleLowerCase('sv').includes(specialUI.query.toLocaleLowerCase('sv'))).sort((a,b)=>ensurePlayerAttributes(b)[field]-ensurePlayerAttributes(a)[field]);
 return `<section class="multi-lineup special-board"><header class="workspace-heading"><div><span class="desk-kicker">${trainingSafe(managerClub())} · SPECIAL TEAMS</span><h1>Powerplay & boxplay</h1><p>Dra mellan alla fyra isar för att byta spelare. En spelare kan ha flera uppdrag, men bara en plats inom varje enhet.</p></div></header><div class="multi-special-plans">${['pp','pk'].map(kind=>`<label>${kind==='pp'?'Powerplay':'Boxplay'} · uppställning<select onchange="specialPlan('${kind}',this.value)">${Object.entries(SPECIAL_SCHEMES[kind]).map(([key,label])=>`<option value="${key}" ${state.specialPlans[kind]===key?'selected':''}>${label}</option>`).join('')}</select></label>`).join('')}<label>Boxplay · vid puckvinst<select onchange="specialPlan('counter',this.value)"><option value="selective" ${state.specialPlans.counter==='selective'?'selected':''}>Kontra vid tydligt läge</option><option value="safe" ${state.specialPlans.counter==='safe'?'selected':''}>Prioritera rensning</option></select></label></div><div class="multi-rinks">${units.map(([key,label])=>{
  const kind=key.startsWith('pp')?'pp':'pk',slots=SPECIAL_SLOTS[state.specialPlans[kind]];
  return `<section class="multi-board" data-board="${key}"><header><h2>${label}</h2><span>${SPECIAL_SCHEMES[kind][state.specialPlans[kind]]}</span></header><div class="multi-rink special-multi-rink" role="group" aria-label="${label}">${lineupIce()}${slots.map((slot,i)=>{
   const p=playerById(state.specialTeams[key][i]),active=specialUI.unit===key&&specialUI.slot===i;
   const layout={oneThreeOne:[[50,86],[18,54],[50,54],[82,54],[50,21]],umbrella:[[50,86],[18,65],[24,26],[82,65],[76,26]],overload:[[50,86],[18,55],[22,23],[82,52],[56,22]],box:[[23,26],[77,26],[23,72],[77,72]],diamond:[[50,18],[18,49],[82,49],[50,80]]};
   const [x,y]=layout[state.specialPlans[kind]][i];
   return `<div class="multi-player ${active?'selected':''}" id="special-slot-${key}-${i}" data-special-slot="${key}-${i}" tabindex="-1" style="left:${x}%;top:${y}%" draggable="${Boolean(p)&&!hockeyChangeBlocked()}" ondragstart="specialDrag(event,'${key}',${i})" ondragover="event.preventDefault()" ondrop="specialDrop(event,'${key}',${i})"><button class="multi-position" aria-label="${label}: ${slot[2]} · Byt" aria-pressed="${active}" onclick="specialSelect('${key}',${i})">${slot[2]} · Byt</button><strong>${p?playerReference(p.id,p.name):'Vakant'}</strong><small>${p?`${SKATER_ATTRIBUTES[slot[3]]} ${ensurePlayerAttributes(p)[slot[3]]} · ${Math.round(readinessCeiling(p.fatigue))} % energi`:'Välj spelare'}</small></div>`;
  }).join('')}</div></section>`;
 }).join('')}</div><p class="multi-help">Vid dubbelt underläge används enhetens tre första spelare. Flera uppdrag ger fler möjliga byten och större belastning.</p><section class="multi-bench" id="specialCandidates" tabindex="-1"><h2>Välj spelare · ${units.find(([key])=>key===specialUI.unit)?.[1]} · ${selectedSlots[specialUI.slot]?.[2]}</h2><label>Sök spelare<input type="search" value="${trainingSafe(specialUI.query)}" onchange="specialUI.query=this.value;render()"></label><p>Sorterat efter ${SKATER_ATTRIBUTES[field].toLowerCase()}. Dra en spelare till valfri is eller välj till den markerade platsen.</p><div class="special-player-pool">${pool.map(p=>lineupBenchPlayer(p,true)).join('')||'<p>Inga tillgängliga spelare matchar sökningen.</p>'}</div></section>${state.live&&!state.live.finished?tacticalReviewView(tacticalReviewSnapshot()):''}</section>`;
}
