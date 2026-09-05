"use strict";
let lineupUI={line:0,pair:0,slot:null,query:''};
function lineupSelectUnit(kind,index){
 if(!['line','pair'].includes(kind)||!Number.isInteger(index)||index<0||index>=(kind==='line'?4:3))return;
 if(state.live?.running)pauseMatch();lineupUI[kind]=index;lineupUI.slot=null;lineupUI.query='';render();
 document.querySelector('[data-lineup-unit="'+kind+index+'"]')?.focus?.({preventScroll:true});
}
function lineupPickSlot(type,index){
 if(!['forwards','defense','goalie'].includes(type))return;
 if(state.live?.running)pauseMatch();lineupUI.slot={type,index};lineupUI.query='';render();
 const panel=document.getElementById('lineupCandidates');panel?.focus?.({preventScroll:true});panel?.scrollIntoView?.({block:'nearest',behavior:'smooth'});
}
function lineupPlace(id){
 const slot=lineupUI.slot,p=playerById(id);if(!slot||!p||!medicalAvailable(p))return;
 if(slot.type==='goalie'&&p.pos!=='MV'||slot.type==='defense'&&p.pos!=='B'||slot.type==='forwards'&&['B','MV'].includes(p.pos))return;
 if(!hockeyAllowChange())return;
 if(state.live?.running)pauseMatch();
 if(slot.type==='goalie')changeGoalie(p.id);else changeLinePlayer(slot.type,slot.index,p.id);
 document.querySelector('.lineup-slot.selected')?.focus?.({preventScroll:true});
 document.querySelector('.lineup-rink')?.scrollIntoView?.({block:'nearest',behavior:'smooth'});
}
function lineupPlayerPlace(p){
 if(p.pos==='MV')return samePlayerId(state.lines.goalie,p.id)?'Startande målvakt':'Reservmålvakt';
 const fw=state.lines.forwards.findIndex(id=>samePlayerId(id,p.id));if(fw>=0)return `Kedja ${Math.floor(fw/3)+1}`;
 const d=state.lines.defense.findIndex(id=>samePlayerId(id,p.id));return d>=0?`Backpar ${Math.floor(d/2)+1}`:'Utanför uppställningen';
}
function lineupSlot(type,index,label,position){
 const id=type==='goalie'?state.lines.goalie:state.lines[type][index],p=playerById(id),selected=lineupUI.slot?.type===type&&lineupUI.slot?.index===index;
 return `<button class="lineup-slot ${position} ${selected?'selected':''} ${!p?'vacant':''}" aria-pressed="${selected}" onclick="lineupPickSlot('${type}',${index})" aria-label="${trainingSafe(label+(p?': '+p.name:': välj spelare'))}"><span class="lineup-position">${label}</span><strong>${p?trainingSafe(p.name):'Välj spelare'}</strong>${p?assessmentBadge(p):'<span class="lineup-plus">+</span>'}<small>${p?`${Math.round(100-(p.fatigue||0))}% beredskap`:'Tryck på platsen'}</small></button>`;
}
function lineupBoardView(){
 ensureLines();const u=lineupUI,fw=u.line*3,d=u.pair*2,players=state.lines.forwards.slice(fw,fw+3).map(playerById).filter(Boolean),backs=state.lines.defense.slice(d,d+2).map(playerById).filter(Boolean);
 const slot=u.slot,pool=managerRoster().filter(p=>!slot?true:slot.type==='goalie'?p.pos==='MV':slot.type==='defense'?p.pos==='B':!['B','MV'].includes(p.pos));
 const candidates=pool.filter(p=>!u.query||p.name.toLocaleLowerCase('sv').includes(u.query.toLocaleLowerCase('sv'))).sort((a,b)=>Number(medicalAvailable(b))-Number(medicalAvailable(a))||a.name.localeCompare(b.name,'sv'));
 const selectedId=slot?(slot.type==='goalie'?state.lines.goalie:state.lines[slot.type][slot.index]):null;
 return `<section class="lineup-page"><header class="daily-heading"><div><span class="career-eyebrow">${trainingSafe(managerClub())} · LAGUTTAGNING</span><h1>Bygg laget på isen</h1><p>Välj kedja och backpar. Tryck på en plats på rinken för att välja eller byta spelare.</p></div></header><div class="lineup-workspace"><section class="lineup-board-panel"><div class="lineup-unit-bar"><div><span>Forwardskedja</span><div class="lineup-switches">${[0,1,2,3].map(n=>`<button data-lineup-unit="line${n}" aria-label="Visa kedja ${n+1}" aria-pressed="${u.line===n}" onclick="lineupSelectUnit('line',${n})">${n+1}</button>`).join('')}</div></div><div><span>Backpar</span><div class="lineup-switches">${[0,1,2].map(n=>`<button data-lineup-unit="pair${n}" aria-label="Visa backpar ${n+1}" aria-pressed="${u.pair===n}" onclick="lineupSelectUnit('pair',${n})">${n+1}</button>`).join('')}</div></div><span class="lineup-direction">Anfall ↑</span></div>
 <div class="lineup-rink" role="group" aria-label="Kedja ${u.line+1}, backpar ${u.pair+1} och startande målvakt"><svg class="lineup-ice" viewBox="0 0 600 610" preserveAspectRatio="none" aria-hidden="true"><rect x="8" y="8" width="584" height="594" rx="85" fill="#e8f0f4" stroke="#91a9b9" stroke-width="6"/><path d="M14 250h572" stroke="#4d84ad" stroke-width="6"/><path d="M14 78h572" stroke="#c47880" stroke-width="3" stroke-dasharray="9 7"/><circle cx="300" cy="78" r="55" fill="none" stroke="#749ab6" stroke-width="2"/><path d="M33 548h534" stroke="#c47880" stroke-width="3"/><circle cx="157" cy="415" r="66" fill="none" stroke="#c78b90" stroke-width="2"/><circle cx="443" cy="415" r="66" fill="none" stroke="#c78b90" stroke-width="2"/><path d="M268 548a32 32 0 0 1 64 0" fill="#b2cedf" stroke="#c47880" stroke-width="2"/><path d="M274 549v20h52v-20" fill="none" stroke="#a65e69" stroke-width="4"/></svg>
 ${lineupSlot('forwards',fw,'Vänsterforward','left-wing')}${lineupSlot('forwards',fw+1,'Center','center')}${lineupSlot('forwards',fw+2,'Högerforward','right-wing')}${lineupSlot('defense',d,'Vänsterback','left-defense')}${lineupSlot('defense',d+1,'Högerback','right-defense')}${lineupSlot('goalie',0,'Målvakt','goalkeeper')}</div>
 <div class="lineup-unit-report"><h2>Kedja ${u.line+1} + backpar ${u.pair+1}</h2><p>${unitAssessment([...players,...backs].map(p=>p.id))}</p><p>Rinkens backpar är en förhandsvisning tillsammans med kedjan. Backparen roterar separat under matchen.</p>${hockeyChangeBlocked()?'<p class="lineup-warning">Icing: spelarbyten är låsta till nästa nedsläpp.</p>':''}</div></section>
 <aside class="lineup-candidates" id="lineupCandidates" tabindex="-1"><header><span class="career-eyebrow">${slot?'VÄLJ SPELARE':'DINA ALTERNATIV'}</span><h2>${slot?slot.type==='goalie'?'Startande målvakt':slot.type==='defense'?'Backar':'Forwards':'Vem passar här?'}</h2><p>${slot?'Välj en spelare nedan. Om spelaren redan är uttagen byter de två spelarna plats.':'Tryck först på en plats på isen. Jämför roller, attribut och beredskap innan du väljer.'}</p>${slot?`<label>Sök i truppen<input type="search" placeholder="Spelarens namn" value="${trainingSafe(u.query)}" onchange="lineupUI.query=this.value;render()"></label>`:''}</header>${slot?`<div class="lineup-candidate-list">${candidates.map(p=>{const r=playerAssessment(p),ready=medicalAvailable(p),selected=samePlayerId(p.id,selectedId);return `<article class="lineup-candidate ${selected?'selected':''} ${!ready?'unavailable':''}"><button class="lineup-choose" onclick="lineupPlace('${p.id}')" ${!ready||hockeyChangeBlocked()?'disabled':''} aria-label="${trainingSafe('Välj '+p.name)}"><span><strong>${trainingSafe(p.name)}</strong><small>${p.pos} · ${lineupPlayerPlace(p)}</small></span><span>${selected?'✓':'+'}</span></button><div class="lineup-player-grades"><span>Förmåga ${assessmentBadge(p)}</span><span>Potential ${assessmentBadge(p,true)}</span></div><p>${r.roles[0].name} · ${Math.round(100-(p.fatigue||0))}% beredskap${ready?'':' · Ej tillgänglig'}</p><button class="lineup-profile-link" onclick="selectPlayer('${p.id}')">Attribut & rapport →</button></article>`;}).join('')||'<p>Ingen spelare matchar sökningen.</p>'}</div>`:'<div class="lineup-pick-help"><span aria-hidden="true">↖</span><h3>Börja på rinken</h3><p>Fyra forwardskedjor, tre backpar och ett målvaktsval. Du behöver inte dra spelare; tryck fungerar även på mobilen.</p></div>'}</aside></div>
 <section class="lineup-overview"><h2>Hela uppställningen</h2><div>${[0,1,2,3].map(n=>`<button class="${u.line===n?'selected':''}" onclick="lineupSelectUnit('line',${n})"><span>Kedja ${n+1}</span>${state.lines.forwards.slice(n*3,n*3+3).map(id=>`<strong>${trainingSafe(playerById(id)?.name||'Vakant')}</strong>`).join('')}</button>`).join('')}${[0,1,2].map(n=>`<button class="${u.pair===n?'selected':''}" onclick="lineupSelectUnit('pair',${n})"><span>Backpar ${n+1}</span>${state.lines.defense.slice(n*2,n*2+2).map(id=>`<strong>${trainingSafe(playerById(id)?.name||'Vakant')}</strong>`).join('')}</button>`).join('')}</div></section><p class="league-stat-help">Guldstjärnor: förmåga. Blå stjärnor: potential. Ljusa delar visar personalens osäkerhet. Formationerna sparas direkt och används av matchmotorn. Alla coachbyten pausar en pågående match.</p></section>`;
}
