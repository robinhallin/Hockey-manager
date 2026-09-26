"use strict";
// One selection model for the desk, player deep links and the live match.
// Undo contains tactical decisions only, and expires when play or the career advances.
let tacticsHistory=[];
const TACTICS_UNITS=['pp1','pp2','pk1','pk2'];
function tacticsClone(value){return JSON.parse(JSON.stringify(value));}
function tacticsId(type,index){return type==='goalie'?state.lines.goalie:type==='backup'?state.matchSelection?.backup:TACTICS_UNITS.includes(type)?state.specialTeams?.[type]?.[index]:state.lines[type]?.[index];}
function tacticsValidSlot(type,index){return Number.isInteger(index)&&index>=0&&index<(type==='forwards'?12:type==='defense'?6:['goalie','backup'].includes(type)?1:TACTICS_UNITS.includes(type)?(type.startsWith('pp')?5:4):0);}
function tacticsLocks(){
 if(state.tacticsLocks?.club!==managerClub())state.tacticsLocks={club:managerClub(),slots:{}};
 const locks=state.tacticsLocks.slots??={};
 for(const [key,id] of Object.entries(locks)){const [type,index]=key.split('-');if(!tacticsValidSlot(type,Number(index))||!samePlayerId(tacticsId(type,Number(index)),id)||!medicalAvailable(playerById(id)))delete locks[key];}
 return locks;
}
function tacticsSnapshot(){return tacticsClone({lines:state.lines,matchSelection:state.matchSelection,specialTeams:state.specialTeams,specialPlans:state.specialPlans,tactic:state.tactic,tacticalPlan:state.tacticalPlan,tacticsLocks:state.tacticsLocks});}
function tacticsContext(){const m=state.live;return JSON.stringify([managerClub(),state.season?.year,state.calendar?.date,state.round,m?.analysis?.id,m?.finished,m?.period,m?.minute,m?.second,m?.clock,m?.broadcast?.engine?.wall,studioActive()?studioEngine().wall:null]);}
function tacticsBefore(){
 depthSelection();ensureSpecialTeams();tacticsLocks();
 const before=tacticsSnapshot(),context=tacticsContext(),last=tacticsHistory.at(-1);
 if(last&&(last.state!==state||last.live!==state.live||last.context!==context||last.after!==JSON.stringify(before)))tacticsHistory=[];
 return {before,context,state,live:state.live};
}
function tacticsRemember(entry,label){
 tacticsLocks();const after=JSON.stringify(tacticsSnapshot());
 if(JSON.stringify(entry.before)===after)return;
 tacticsHistory.push({...entry,after,label});if(tacticsHistory.length>20)tacticsHistory.shift();
 lineupUI.notice=label+' · sparat';
}
function tacticsCanUndo(){const last=tacticsHistory.at(-1);return Boolean(last&&last.state===state&&last.live===state.live&&last.context===tacticsContext()&&last.after===JSON.stringify(tacticsSnapshot()));}
function tacticsUndo(){
 if(!tacticsCanUndo()||!hockeyAllowChange())return;
 const entry=tacticsHistory.at(-1),b=entry.before;
 const ids=[...b.lines.forwards,...b.lines.defense,b.lines.goalie,...(b.matchSelection?.extras||[]),b.matchSelection?.backup,...Object.values(b.specialTeams||{}).flat()].filter(id=>id!=null);
 if(ids.some(id=>!medicalAvailable(playerById(id)))){lineupUI.notice='Kan inte ångra: en spelare är inte längre tillgänglig.';render();return;}
 if(state.live?.running)pauseMatch();const before=tacticalReviewPlan();
 for(const [key,value] of Object.entries(b))state[key]=tacticsClone(value);
 tacticsHistory.pop();tacticalReviewRecord(before,'Ångrat: '+entry.label);lineupUI.notice='Ångrat: '+entry.label;lineupUI.picker=false;save();render();
}
function tacticsLock(type,index){
 if(!tacticsValidSlot(type,index))return;
 const p=playerById(tacticsId(type,index));if(!p||!medicalAvailable(p))return;
 const entry=tacticsBefore(),key=type+'-'+index,locks=tacticsLocks();
 if(locks[key]!=null)delete locks[key];else locks[key]=p.id;
 tacticsRemember(entry,locks[key]!=null?'Platsen låst för assistenten':'Platsen upplåst');save();render();
}
function tacticsFields(type,index){
 if(TACTICS_UNITS.includes(type)){const field=SPECIAL_SLOTS[state.specialPlans[type.startsWith('pp')?'pp':'pk']][index][3];return [...new Set([field,...(type.startsWith('pp')?['passing','decisions','shooting']:['positioning','discipline','workRate'])])].slice(0,3);}
 return ['goalie','backup'].includes(type)?['reflexes','positioning','reboundControl']:type==='defense'?['positioning','passing','decisions']:index%3===1?['faceoffs','passing','decisions']:['shooting','skating','puckControl'];
}
function tacticsEnergy(p){return Math.round(state.live&&!state.live.finished?matchEnergy(p):readinessCeiling(p.fatigue||0));}
function tacticsScore(p,type,index){const fields=tacticsFields(type,index),a=playerAssessment(p).estimated,fit=TACTICS_UNITS.includes(type)?1:positionFit(p,type==='backup'?'G':lineupRole(type,index));return (fields.reduce((n,k,i)=>n+(a[k]||0)*(i?1:2),0)/4)*fit*(.65+tacticsEnergy(p)*.0035);}
function tacticsAssistant(){
 if(!hockeyAllowChange())return;if(state.live?.running)pauseMatch();
 const entry=tacticsBefore(),review=tacticalReviewPlan(),locks=tacticsLocks(),special=lineupWorkspace==='special',type=special?specialUI.unit:null;
 const slots=special?state.specialTeams[type].map((_,index)=>[type,index]):[...Array.from({length:12},(_,i)=>['forwards',i]),...Array.from({length:6},(_,i)=>['defense',i]),['goalie',0],['backup',0]];
 const used=new Set(slots.filter(([t,i])=>locks[t+'-'+i]!=null).map(([t,i])=>String(locks[t+'-'+i])));
 const pool=managerRoster().filter(medicalAvailable);
 for(const [t,i] of slots){
  if(locks[t+'-'+i]!=null)continue;
  const goalie=['goalie','backup'].includes(t),candidates=pool.filter(p=>!used.has(String(p.id))&&(goalie?p.pos==='MV':p.pos!=='MV'));
  candidates.sort((a,b)=>tacticsScore(b,t,i)-tacticsScore(a,t,i)||a.name.localeCompare(b.name,'sv'));
  const id=candidates[0]?.id??null;if(id!=null)used.add(String(id));
  if(t==='goalie')state.lines.goalie=id;else if(t==='backup')state.matchSelection.backup=id;else if(special)state.specialTeams[t][i]=id;else state.lines[t][i]=id;
 }
 depthSelection();const label=special?'Assistenten valde '+tacticsUnitLabel(type):'Assistenten valde laget';
 tacticalReviewRecord(review,label);tacticsRemember(entry,label);lineupUI.slot=null;lineupUI.picker=false;save();render();
}
function tacticsTab(tab){
 if(!['even','pp','pk','squad','analysis'].includes(tab))return;
 if(tab==='pp'||tab==='pk'){lineupWorkspace='special';if(!specialUI.unit.startsWith(tab))specialUI={unit:tab+'1',slot:0,query:''};}
 else lineupWorkspace=tab;
 lineupUI.picker=false;lineupUI.slot=null;lineupUI.notice='';render();
}
function tacticsPick(type,index,picker=false){
 if(!tacticsValidSlot(type,index))return;
 if(picker){lineupUI.slot={type,index};lineupUI.query='';lineupUI.picker=true;lineupUI.player=tacticsId(type,index);render();document.getElementById('lineupCandidates')?.focus?.({preventScroll:true});return;}
 const from=lineupUI.slot;
 if(from&&!lineupUI.picker&&(from.type!==type||from.index!==index)){
  const id=tacticsId(type,index),source=tacticsId(from.type,from.index),a=playerById(source),b=playerById(id);
  if((a||b)&&(['goalie','backup'].includes(from.type)===['goalie','backup'].includes(type))){lineupUI.slot=b?from:{type,index};lineupUI.player=b?.id??a.id;lineupPlace(lineupUI.player);lineupUI.slot=null;render();return;}
 }
 lineupUI.slot=from?.type===type&&from.index===index?null:{type,index};lineupUI.player=tacticsId(type,index);lineupUI.picker=false;lineupUI.query='';render();
 document.querySelector('[data-lineup-slot="'+type+'-'+index+'"] .tw-pick')?.focus?.({preventScroll:true});
}
function tacticsBackup(id){
 const p=playerById(id);if(!p||p.pos!=='MV'||!medicalAvailable(p)||!hockeyAllowChange())return;
 if(samePlayerId(id,state.lines.goalie)){const reserve=state.matchSelection?.backup;if(reserve!=null)changeGoalie(reserve);return;}
 depthSet('backup',0,id);
}
function tacticsSearch(value,special=false){
 const key=special?'tw-special-search':'tw-lineup-search',previous=document.getElementById(key),start=previous?.selectionStart,end=previous?.selectionEnd;
 const ui=special?specialUI:lineupUI;ui.query=value;render();
 const input=document.getElementById(key);input?.focus?.({preventScroll:true});if(start!=null)input?.setSelectionRange?.(start,end);
}
function tacticsClosePicker(){lineupUI.picker=false;render();document.querySelector('[data-lineup-slot="'+lineupUI.slot?.type+'-'+lineupUI.slot?.index+'"] .tw-pick')?.focus?.({preventScroll:true});}
function tacticsUnitLabel(key){return (key.startsWith('pp')?'PP':'BP')+' '+key.slice(-1);}
function tacticsSlotLabel(type,index){return TACTICS_UNITS.includes(type)?SPECIAL_SLOTS[state.specialPlans[type.startsWith('pp')?'pp':'pk']][index][2]:type==='backup'?'Reservmålvakt':StudioHockey.ROLE_NAMES[lineupRole(type,index)];}
function tacticsLockIcon(locked){return `<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><rect x="5" y="9" width="11" height="8" rx="2" stroke="currentColor" stroke-width="1.4"/><path d="${locked?'M7 9V6a3.5 3.5 0 0 1 7 0v3':'M7 9V6a3.5 3.5 0 0 1 6-2'}" stroke="currentColor" stroke-width="1.4"/></svg>`;}
function tacticsLockButton(type,index,p){const locked=tacticsLocks()[type+'-'+index]!=null;return `<button class="tw-lock" aria-pressed="${locked}" aria-label="${locked?'Lås upp':'Lås'} ${trainingSafe(p?.name||'vakant plats')} för assistenten" title="${locked?'Låst':'Lås platsen'} för assistenten" onclick="tacticsLock('${type}',${index})" ${!p?'disabled':''}>${tacticsLockIcon(locked)}</button>`;}
function tacticsCard(type,index,label){
 const id=tacticsId(type,index),p=playerById(id),selected=lineupUI.slot?.type===type&&lineupUI.slot.index===index;
 return `<article class="tw-card ${selected?'selected':''}" data-lineup-slot="${type}-${index}" tabindex="-1" draggable="${Boolean(p)&&medicalAvailable(p)&&!hockeyChangeBlocked()}" ondragstart="${type==='backup'?`event.dataTransfer.setData('text/plain',${trainingSafe(JSON.stringify(String(id)))});event.dataTransfer.effectAllowed='move'`:`lineupDrag(event,'${type}',${index})`}" ondragover="event.preventDefault()" ondrop="${type==='backup'?`tacticsBackup(event.dataTransfer.getData('text/plain'));event.preventDefault()`:`lineupDrop(event,'${type}',${index})`}"><div class="tw-card-top"><button class="multi-position" onclick="tacticsPick('${type}',${index},true)" aria-label="Byt ${label.toLowerCase()}">${label}<span>Byt</span></button>${tacticsLockButton(type,index,p)}</div><button class="tw-pick" aria-pressed="${selected}" onclick="tacticsPick('${type}',${index})"><strong>${trainingSafe(p?.name||'Vakant')}</strong>${p?`<span class="tw-card-data">${assessmentBadge(p)}<small>${p.pos} · ${tacticsEnergy(p)}%</small></span>`:'<small>Välj spelare</small>'}</button></article>`;
}
function tacticsBench(){
 const s=depthSelection(),main=new Set([...state.lines.forwards,...state.lines.defense,state.lines.goalie,s.backup].map(String)),pool=managerRoster().filter(p=>!main.has(String(p.id))),locked=state.live?.matchSquad&&!state.live.finished;
 const available=pool.filter(medicalReady),reserves=available.filter(p=>locked?state.live.matchSquad.includes(String(p.id)):s.extras.some(id=>samePlayerId(id,p.id))),outside=available.filter(p=>!reserves.includes(p)),unavailable=pool.filter(p=>!medicalReady(p));
 const chip=p=>`<button class="tw-bench-player" data-bench-player="${trainingSafe(p.id)}" draggable="${medicalAvailable(p)&&!hockeyChangeBlocked()}" ondragstart="event.dataTransfer.setData('text/plain',${trainingSafe(JSON.stringify(String(p.id)))});event.dataTransfer.effectAllowed='move'" ondragover="event.preventDefault()" ondrop="lineupBenchSwap(event,${trainingSafe(JSON.stringify(p.id))})" onclick="${lineupUI.slot?`lineupPlace(${trainingSafe(JSON.stringify(p.id))})`:`lineupUI.player=${trainingSafe(JSON.stringify(p.id))};render()`}"><span>${p.pos}</span>${trainingSafe(p.name)}</button>`;
 return `<section class="tw-bench multi-bench" aria-label="Bänk och matchtrupp"><div><h3>Reserver i matchtruppen <small>${reserves.length}</small></h3><div>${reserves.map(chip).join('')||'<span>Inga extra utespelare</span>'}</div></div><div><h3>Utanför matchtruppen <small>${outside.length}</small></h3><div>${outside.map(chip).join('')||'<span>Alla spelklara är uttagna</span>'}</div></div>${unavailable.length?`<details><summary>Ej tillgängliga · ${unavailable.length}</summary>${unavailable.map(p=>`<span>${trainingSafe(p.name)} · ${trainingSafe(medicalStatus(p))}</span>`).join('')}</details>`:''}<button class="tw-link" onclick="tacticsTab('squad')">Hantera reserver →</button></section>`;
}
function tacticsEvenView(){
 depthSelection();return `<div class="tw-board-wrap"><div class="tw-board"><section class="tw-forwards multi-rinks" aria-label="Fyra forwardskedjor"><div class="tw-section-title"><h2>Forwardskedjor</h2><span>Vänster · Center · Höger</span></div>${[0,1,2,3].map(n=>`<div class="tw-line" data-board="line${n}"><span class="tw-line-number">${n+1}<small>Kedja</small></span>${['VF','C','HF'].map((label,i)=>tacticsCard('forwards',n*3+i,label)).join('')}<div class="tw-chemistry" title="${lineChemistry(state.lines.forwards.slice(n*3,n*3+3)).minutes} gemensamma minuter i snitt">${chemistryView(state.lines.forwards.slice(n*3,n*3+3))}${tacticalFitView(state.lines.forwards.slice(n*3,n*3+3),'forwards')}</div></div>`).join('')}</section><section class="tw-defense" aria-label="Backpar och målvakter"><div class="tw-section-title"><h2>Backpar & målvakter</h2><span>Separat rotation</span></div>${[0,1,2].map(n=>`<div class="tw-pair"><span class="tw-line-number">${n+1}<small>Par</small></span>${tacticsCard('defense',n*2,'VB')}${tacticsCard('defense',n*2+1,'HB')}</div>`).join('')}<div class="tw-goalies"><span class="tw-line-number">MV</span>${tacticsCard('goalie',0,'Startar')}${tacticsCard('backup',0,'Reserv')}</div></section></div>${lineupUI.picker&&lineupUI.slot?tacticsCandidates(false):''}</div>${tacticsBench()}${tacticsInspector(false)}`;
}
function tacticsCandidates(special){
 const type=special?specialUI.unit:lineupUI.slot?.type,index=special?specialUI.slot:lineupUI.slot?.index;if(!tacticsValidSlot(type,index))return '';
 const ui=special?specialUI:lineupUI,fields=tacticsFields(type,index),goalie=['goalie','backup'].includes(type),id=tacticsId(type,index),query=ui.query.toLocaleLowerCase('sv');
 const pool=managerRoster().filter(p=>(goalie?p.pos==='MV':p.pos!=='MV')&&p.name.toLocaleLowerCase('sv').includes(query)).sort((a,b)=>Number(medicalAvailable(b))-Number(medicalAvailable(a))||tacticsScore(b,type,index)-tacticsScore(a,type,index)||a.name.localeCompare(b.name,'sv'));
 return `<aside class="tw-candidates ${special?'':'tw-drawer'}" id="${special?'specialCandidates':'lineupCandidates'}" tabindex="-1" aria-label="Spelarval" onkeydown="if(event.key==='Escape'&&!${special})tacticsClosePicker()"><header><div><span class="tw-eyebrow">VÄLJ SPELARE</span><h2>${trainingSafe(tacticsSlotLabel(type,index))}</h2></div>${special?'':`<button class="tw-close" aria-label="Stäng spelarval" onclick="tacticsClosePicker()">×</button>`}</header><label class="tw-search"><span>Sök i truppen</span><input type="search" id="${special?'tw-special-search':'tw-lineup-search'}" placeholder="Sök spelare…" value="${trainingSafe(ui.query)}" oninput="tacticsSearch(this.value,${special})"></label><p class="tw-sort">Sorterat efter roll, ${special?SKATER_ATTRIBUTES[fields[0]].toLowerCase():'positionsvana'} och energi.</p><div class="tw-candidate-list">${pool.map(p=>{
 const chosen=samePlayerId(p.id,id),available=medicalAvailable(p),a=playerAssessment(p),other=special?TACTICS_UNITS.filter(k=>k!==type&&state.specialTeams[k].some(v=>samePlayerId(v,p.id))).map(tacticsUnitLabel):[];
 return `<article class="tw-candidate ${chosen?'selected':''}" data-candidate-id="${trainingSafe(p.id)}" draggable="${available&&!hockeyChangeBlocked()}" ondragstart="event.dataTransfer.setData('text/plain',${trainingSafe(JSON.stringify(String(p.id)))});event.dataTransfer.effectAllowed='move'"><div><strong>${playerReference(p.id,p.name)}</strong><small>${p.pos} · ${lineupPlayerPlace(p)}${other.length?' · '+other.join(', '):''}</small><span class="tw-candidate-attrs">${fields.slice(0,2).map(k=>`<span>${(goalie?GOALIE_ATTRIBUTES:SKATER_ATTRIBUTES)[k]} <b>${attributeInterval(p,k,a)}</b></span>`).join('')}<span>Energi <b>${tacticsEnergy(p)}%</b></span></span>${!available?`<small class="tw-warning">${!medicalReady(p)?trainingSafe(medicalStatus(p)):!depthEligible(p)?'Ej i låst matchtrupp':'Medicinsk istidsgräns nådd'}</small>`:''}</div><button class="tw-choose" onclick="${special?'specialPlace':'lineupPlace'}(${trainingSafe(JSON.stringify(p.id))})" aria-label="Välj ${trainingSafe(p.name)}" ${!available||chosen||hockeyChangeBlocked()?'disabled':''}>${chosen?'Vald':'Välj'}</button></article>`;
 }).join('')||'<p class="tw-empty">Inga spelare matchar sökningen.</p>'}</div><footer>${special?'Flera uppdrag är möjliga. En plats per spelare inom enheten.':'En redan uttagen spelare byter plats med den markerade.'}</footer></aside>`;
}
function tacticsSpecialView(){
 ensureSpecialTeams();if(!TACTICS_UNITS.includes(specialUI.unit))specialUI={unit:'pp1',slot:0,query:''};
 const key=specialUI.unit,kind=key.startsWith('pp')?'pp':'pk',scheme=state.specialPlans[kind],slots=SPECIAL_SLOTS[scheme];if(specialUI.slot>=slots.length)specialUI.slot=0;
 const layout={oneThreeOne:[[50,82],[18,51],[50,51],[82,51],[50,20]],umbrella:[[50,82],[18,60],[25,23],[82,60],[75,23]],overload:[[50,82],[18,53],[22,22],[82,51],[60,22]],box:[[25,29],[75,29],[25,71],[75,71]],diamond:[[50,19],[18,50],[82,50],[50,81]]};
 return `<div class="tw-builder"><aside class="tw-units"><h2>${kind==='pp'?'Powerplay':'Boxplay'}</h2>${[1,2].map(n=>{const unit=kind+n;return `<button class="tw-unit" aria-pressed="${key===unit}" onclick="specialSelect('${unit}',0)"><strong>${tacticsUnitLabel(unit)}</strong><span>${state.specialTeams[unit].map(playerById).filter(Boolean).length} spelare</span><small>${SPECIAL_SCHEMES[kind][scheme]}</small></button>`;}).join('')}<div class="tw-unit-note"><h3>Enhetens uppdrag</h3><p>${kind==='pp'?'Skapa passningsvägar och lägen nära mål.':'Stäng mitten och välj rätt tillfälle att pressa.'}</p><p>${kind==='pk'?'Vid dubbelt underläge används enhetens tre första spelare.':'Båda enheterna roterar i matchen.'}</p></div></aside><section class="tw-rink-panel"><header><div><span class="tw-eyebrow">${kind==='pp'?'NUMERÄRT ÖVERLÄGE':'NUMERÄRT UNDERLÄGE'}</span><h2>${tacticsUnitLabel(key)} <span>· ${SPECIAL_SCHEMES[kind][scheme]}</span></h2></div><label>Uppställning<select aria-label="${kind==='pp'?'Powerplay':'Boxplay'} uppställning" onchange="specialPlan('${kind}',this.value)">${Object.entries(SPECIAL_SCHEMES[kind]).map(([v,label])=>`<option value="${v}" ${scheme===v?'selected':''}>${label}</option>`).join('')}</select></label></header><div class="tw-rink multi-board" data-board="${key}" role="group" aria-label="${tacticsUnitLabel(key)} på isen">${lineupIce()}${slots.map((slot,i)=>{
 const p=playerById(state.specialTeams[key][i]),active=specialUI.slot===i,[x,y]=layout[scheme][i];
 return `<article class="tw-special-card ${active?'selected':''}" id="special-slot-${key}-${i}" data-special-slot="${key}-${i}" tabindex="-1" style="left:${x}%;top:${y}%" draggable="${Boolean(p)&&medicalAvailable(p)&&!hockeyChangeBlocked()}" ondragstart="specialDrag(event,'${key}',${i})" ondragover="event.preventDefault()" ondrop="specialDrop(event,'${key}',${i})"><div class="tw-card-top"><span>${i+1} · ${slot[2]}</span>${tacticsLockButton(key,i,p)}</div><button class="tw-pick" aria-pressed="${active}" onclick="specialSelect('${key}',${i})"><strong>${trainingSafe(p?.name||'Vakant')}</strong><span>${p?assessmentBadge(p):'Välj spelare'}</span></button></article>`;
 }).join('')}</div><footer>${kind==='pk'?`<label>Vid puckvinst<select aria-label="Boxplay vid puckvinst" onchange="specialPlan('counter',this.value)"><option value="selective" ${state.specialPlans.counter==='selective'?'selected':''}>Kontra vid tydligt läge</option><option value="safe" ${state.specialPlans.counter==='safe'?'selected':''}>Prioritera rensning</option></select></label>`:'<span>Välj en roll på isen. Spelarlistan anpassas till rollen.</span>'}</footer></section>${tacticsCandidates(true)}</div>${tacticsInspector(true)}`;
}
function tacticsInspector(special){
 const type=special?specialUI.unit:lineupUI.slot?.type||'forwards',index=special?specialUI.slot:lineupUI.slot?.index||0,p=(special?null:playerById(lineupUI.player))||playerById(tacticsId(type,index));
 if(!p)return '<aside class="tw-inspector tw-empty">Välj en spelare för att se attribut, energi och spelarprofil.</aside>';
 const a=playerAssessment(p),goalie=p.pos==='MV',fields=goalie?tacticsFields('goalie',0):tacticsFields(type==='goalie'||type==='backup'?'forwards':type,index),fit=special?null:positionFit(p,goalie?'G':lineupRole(type,index));
 return `<aside class="tw-inspector" aria-label="Vald spelare: ${trainingSafe(p.name)}"><div class="tw-identity">${squadPortrait(p)}<div><span class="tw-eyebrow">${p.pos} · ${p.age} ÅR · ${trainingSafe(lineupPlayerPlace(p))}</span><h2>${trainingSafe(p.name)}</h2><div class="tw-ratings"><span>${assessmentBadge(p)}<small>Förmåga</small></span><span>${assessmentBadge(p,true)}<small>Potential</small></span></div></div></div><div class="tw-attributes"><h3>${special?'För rollen: '+tacticsSlotLabel(type,index):'Viktiga attribut'}</h3><dl>${fields.map(k=>`<div><dt>${(goalie?GOALIE_ATTRIBUTES:SKATER_ATTRIBUTES)[k]}</dt><dd>${attributeInterval(p,k,a)}</dd></div>`).join('')}</dl></div><div class="tw-advice"><h3>Inför uttagningen</h3><p>${!medicalAvailable(p)?!medicalReady(p)?trainingSafe(medicalStatus(p)):!depthEligible(p)?'Spelaren ingår inte i den låsta matchtruppen.':'Den medicinska istidsgränsen är nådd.':fit!=null&&fit<.8?'Ovan position. Positionsvanan påverkar utförandet i match.':tacticsEnergy(p)<80?'Begränsad energi. Följ belastningen och överväg kortare byten.':special?lineupWorkload(p):`${Math.round(fit*100)} % positionsvana · ${tacticsEnergy(p)} % energi`}</p><button class="tw-profile" aria-label="Öppna spelarprofil" onclick="deskOpenPlayer(${trainingSafe(JSON.stringify(p.id))})">Öppna spelarprofil →</button></div></aside>`;
}
function tacticsWorkspaceView(){
 depthSelection();ensureSpecialTeams();tacticsLocks();
 const special=lineupWorkspace==='special',tab=special?(specialUI.unit.startsWith('pk')?'pk':'pp'):lineupWorkspace,main=['even','pp','pk'].includes(tab),locks=Object.keys(tacticsLocks()).filter(k=>special?k.startsWith(specialUI.unit+'-'):!TACTICS_UNITS.some(u=>k.startsWith(u+'-'))).length;
 return `<section class="tactics-workspace multi-lineup"><header class="tw-heading"><div><span class="tw-eyebrow">${trainingSafe(managerClub())} · LAGET</span><h1>Taktik & laguttagning</h1></div><label>Spelsätt<select aria-label="Spelsätt" onchange="desktopOrder('attackStyle',this.value)">${Object.entries(HOCKEY_STYLES).map(([k,label])=>`<option value="${k}" ${state.tacticalPlan.attackStyle===k?'selected':''}>${label}</option>`).join('')}</select></label></header><div class="tw-navigation"><nav aria-label="Taktikarbetsyta">${[['even','5 mot 5'],['pp','PP'],['pk','BP'],['squad','Matchtrupp'],['analysis','Samspel']].map(([key,label])=>`<button aria-pressed="${tab===key}" onclick="tacticsTab('${key}')">${label}</button>`).join('')}</nav><button class="tw-link" aria-expanded="${Boolean(lineupUI.orders)}" onclick="lineupUI.orders=!lineupUI.orders;render()">Lagorder ${lineupUI.orders?'−':'+'}</button></div>${lineupUI.orders?`<div class="tw-orders">${desktopOrders()}</div>`:''}${main?`<div class="tw-toolbar"><p>${special?'Välj roll på isen · Dra eller välj en spelare':'Dra för att flytta · Klicka på två spelare för att byta'}</p><span class="tw-lock-count">${locks?locks+' låsta platser':'Lås platser att behålla'}</span><button class="tw-assistant" onclick="tacticsAssistant()" title="Väljer efter roll, positionsvana och energi. Låsta platser behålls." ${hockeyChangeBlocked()?'disabled':''}>${special?'Assistenten väljer enheten':'Assistenten väljer laget'}</button><button class="tw-undo" onclick="tacticsUndo()" title="${tacticsCanUndo()?trainingSafe('Ångra: '+tacticsHistory.at(-1).label):'Inget att ångra. Historiken gäller tills matchen eller karriären går vidare.'}" ${!tacticsCanUndo()||hockeyChangeBlocked()?'disabled':''}>↶ Ångra</button></div>`:''}<p class="tw-status ${hockeyChangeBlocked()?'tw-warning':''}" role="status">${hockeyChangeBlocked()?'Icing: spelarbyten är låsta till nedsläpp.':trainingSafe(lineupUI.notice||'Ändringar sparas direkt. Låsta platser behålls när assistenten väljer.')}</p>${tab==='even'?tacticsEvenView():special?tacticsSpecialView():tab==='squad'?depthBenchView():`<div class="tw-toolbar"><p>Följ kedjornas samspel och utfallet över flera matcher.</p><button type="button" class="tw-link" onclick="matchesOpenTrends()">Laganalys →</button></div>`+chemistryAnalysisView()+readinessSquadView()}</section>`;
}
