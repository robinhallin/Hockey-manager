"use strict";
// All boards edit the existing lineup model. Back pairs retain their own rotation.
function lineupIce(){return `<svg class="multi-ice" viewBox="0 0 600 380" preserveAspectRatio="none" aria-hidden="true"><rect x="6" y="6" width="588" height="368" rx="70" fill="#cfdfdf" stroke="#789697" stroke-width="4"/><path d="M10 300h580" stroke="#628fba" stroke-width="7"/><path d="M25 62h550" stroke="#b57480" stroke-width="3"/><path d="M272 62V42h56v20" fill="none" stroke="#a85f6c" stroke-width="5"/><g fill="none" stroke="#b57480" stroke-width="2"><circle cx="154" cy="186" r="55"/><circle cx="446" cy="186" r="55"/></g></svg>`;}
function lineupBoardSlot(type,index,label,x,y){
 const id=type==='goalie'?state.lines.goalie:state.lines[type][index],p=playerById(id),selected=lineupUI.slot?.type===type&&lineupUI.slot.index===index;
 return `<div class="multi-player ${selected?'selected':''}" data-lineup-slot="${type}-${index}" tabindex="-1" ${x==null?'':`style="left:${x}%;top:${y}%"`} draggable="${Boolean(p)&&medicalAvailable(p)&&!hockeyChangeBlocked()}" ondragstart="lineupDrag(event,'${type}',${index})" ondragover="event.preventDefault()" ondrop="lineupDrop(event,'${type}',${index})"><button class="multi-position" aria-pressed="${selected}" onclick="lineupPickSlot('${type}',${index})">${label} · Byt</button><strong>${p?playerReference(p.id,p.name).replace('<a ','<a draggable="false" '):'Vakant'}</strong><small>${p?`${p.pos} · ${Math.round(readinessCeiling(p.fatigue))} % energi`:'Välj en spelare'}</small>${p?positionBadge(p,lineupRole(type,index)):''}</div>`;
}
function lineupBenchSwap(event,targetId){
 event.preventDefault();const id=event.dataTransfer.getData('text/plain'),p=playerById(id),target=playerById(targetId);
 if(!p||!target||samePlayerId(id,targetId)||!medicalAvailable(p)||!medicalAvailable(target)||!hockeyAllowChange())return;
 const type=samePlayerId(state.lines.goalie,id)?'goalie':state.lines.forwards.some(v=>samePlayerId(v,id))?'forwards':state.lines.defense.some(v=>samePlayerId(v,id))?'defense':null;
 if(!type){const s=depthSelection(),index=s.extras.findIndex(v=>samePlayerId(v,targetId));if(index>=0)depthSet('extra',index,id);else if(samePlayerId(s.backup,targetId))depthSet('backup',0,id);return;}
 if(type==='goalie'?target.pos!=='MV':target.pos==='MV')return;
 if(state.live?.running)pauseMatch();
 const selection=depthSelection(),extras=[...selection.extras],backup=selection.backup,undo=tacticsBefore(),historyLength=tacticsHistory.length;
 if(type==='goalie')changeGoalie(target.id);else changeLinePlayer(type,state.lines[type].findIndex(v=>samePlayerId(v,id)),target.id);
 // Preserve which reserve is exchanged, rather than silently choosing a new one.
 state.matchSelection.extras=extras.map(v=>samePlayerId(v,targetId)?p.id:v);
 state.matchSelection.backup=samePlayerId(backup,targetId)?p.id:backup;
 depthSelection();tacticsHistory.length=historyLength;tacticsRemember(undo,'Byte mellan isen och bänken');save();render();
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
function lineupFourBoards(){return tacticsEvenView();}

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
 if(state.live?.running)pauseMatch();const undo=tacticsBefore(),before=tacticalReviewPlan(),a=[...state.specialTeams[source.key]],b=[...state.specialTeams[key]];
 const place=(unit,at,value)=>{const found=unit.findIndex(v=>samePlayerId(v,value));if(found>=0)[unit[at],unit[found]]=[unit[found],unit[at]];else unit[at]=value;};
 place(a,source.index,old);place(b,index,p.id);
 state.specialTeams[source.key]=a;state.specialTeams[key]=b;specialUI={unit:key,slot:index,query:''};tacticalReviewRecord(before,'Bytt spelare mellan special teams-enheter');tacticsRemember(undo,'Byte mellan enheter');save();render();
}
function specialFourBoards(){return `<section class="tactics-workspace">${tacticsSpecialView()}</section>`;}
