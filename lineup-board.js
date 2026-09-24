let lineupWorkspace='even';
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
 if(slot.type==='goalie'?p.pos!=='MV':p.pos==='MV')return;
 if(!hockeyAllowChange())return;
 if(state.live?.running)pauseMatch();
 if(slot.type==='goalie')changeGoalie(p.id);else changeLinePlayer(slot.type,slot.index,p.id);
 const placed=document.querySelector('[data-lineup-slot="'+slot.type+'-'+slot.index+'"]')||document.querySelector('.lineup-slot.selected');
 placed?.focus?.({preventScroll:true});placed?.scrollIntoView?.({block:'nearest',behavior:'smooth'});
}
function lineupPlayerPlace(p){
 if(!medicalReady(p))return 'Skadad / återgång';
 if(p.pos==='MV')return samePlayerId(state.lines.goalie,p.id)?'Startande målvakt':samePlayerId(state.matchSelection?.backup,p.id)?'Reservmålvakt':'Utanför matchtruppen';
 const fw=state.lines.forwards.findIndex(id=>samePlayerId(id,p.id));if(fw>=0)return `Kedja ${Math.floor(fw/3)+1}`;
 const d=state.lines.defense.findIndex(id=>samePlayerId(id,p.id));return d>=0?`Backpar ${Math.floor(d/2)+1}`:state.matchSelection?.extras?.some(id=>samePlayerId(id,p.id))?'Extra utespelare':'Utanför matchtruppen';
}
function lineupSlot(type,index,label,position){
 const id=type==='goalie'?state.lines.goalie:state.lines[type][index],p=playerById(id),selected=lineupUI.slot?.type===type&&lineupUI.slot?.index===index;
 return `<div class="lineup-slot ${position} ${selected?'selected':''} ${!p?'vacant':''}" tabindex="-1"><button type="button" class="lineup-position" aria-pressed="${selected}" onclick="lineupPickSlot('${type}',${index})" aria-label="${trainingSafe(label+(p?': byt '+p.name:': välj spelare'))}">${label} · ${p?'Byt spelare':'Välj spelare'}</button><strong>${p?playerReference(p.id,p.name):'Vakant'}</strong>${p?assessmentBadge(p):'<span class="lineup-plus">+</span>'}<small>${p?`${Math.round(100-(p.fatigue||0))}% beredskap`:'Välj via positionsknappen'}</small></div>`;
}
function lineupRinkView(){
 if(lineupWorkspace==='special')return lineupWorkspaceNav()+specialBoardView();
 if(lineupWorkspace==='squad')return lineupWorkspaceNav()+lineupSquadSummary()+depthBenchView();
 ensureLines();const u=lineupUI,fw=u.line*3,d=u.pair*2,players=state.lines.forwards.slice(fw,fw+3).map(playerById).filter(Boolean),backs=state.lines.defense.slice(d,d+2).map(playerById).filter(Boolean);
 const slot=u.slot,pool=managerRoster().filter(p=>!slot?true:slot.type==='goalie'?p.pos==='MV':slot.type==='defense'?p.pos==='B':!['B','MV'].includes(p.pos));
 const candidates=pool.filter(p=>!u.query||p.name.toLocaleLowerCase('sv').includes(u.query.toLocaleLowerCase('sv'))).sort((a,b)=>Number(medicalAvailable(b))-Number(medicalAvailable(a))||a.name.localeCompare(b.name,'sv'));
 const selectedId=slot?(slot.type==='goalie'?state.lines.goalie:state.lines[slot.type][slot.index]):null;
 return `${lineupWorkspaceNav()}<section class="lineup-page"><header class="daily-heading"><div><span class="career-eyebrow">${trainingSafe(managerClub())} · LAGUTTAGNING</span><h1>Bygg laget på isen</h1><p>Välj kedja och backpar. Tryck på en plats på rinken för att välja eller byta spelare.</p></div></header><div class="lineup-workspace"><section class="lineup-board-panel"><div class="lineup-unit-bar"><div><span>Forwardskedja</span><div class="lineup-switches">${[0,1,2,3].map(n=>`<button data-lineup-unit="line${n}" aria-label="Visa kedja ${n+1}" aria-pressed="${u.line===n}" onclick="lineupSelectUnit('line',${n})">${n+1}</button>`).join('')}</div></div><div><span>Backpar</span><div class="lineup-switches">${[0,1,2].map(n=>`<button data-lineup-unit="pair${n}" aria-label="Visa backpar ${n+1}" aria-pressed="${u.pair===n}" onclick="lineupSelectUnit('pair',${n})">${n+1}</button>`).join('')}</div></div><span class="lineup-direction">Anfall ↑</span></div>
 <div class="lineup-rink" role="group" aria-label="Kedja ${u.line+1}, backpar ${u.pair+1} och startande målvakt"><svg class="lineup-ice" viewBox="0 0 600 610" preserveAspectRatio="none" aria-hidden="true"><rect x="8" y="8" width="584" height="594" rx="85" fill="#e8f0f4" stroke="#91a9b9" stroke-width="6"/><path d="M14 250h572" stroke="#4d84ad" stroke-width="6"/><path d="M14 78h572" stroke="#c47880" stroke-width="3" stroke-dasharray="9 7"/><circle cx="300" cy="78" r="55" fill="none" stroke="#749ab6" stroke-width="2"/><path d="M33 548h534" stroke="#c47880" stroke-width="3"/><circle cx="157" cy="415" r="66" fill="none" stroke="#c78b90" stroke-width="2"/><circle cx="443" cy="415" r="66" fill="none" stroke="#c78b90" stroke-width="2"/><path d="M268 548a32 32 0 0 1 64 0" fill="#b2cedf" stroke="#c47880" stroke-width="2"/><path d="M274 549v20h52v-20" fill="none" stroke="#a65e69" stroke-width="4"/></svg>
 ${lineupSlot('forwards',fw,'Vänsterforward','left-wing')}${lineupSlot('forwards',fw+1,'Center','center')}${lineupSlot('forwards',fw+2,'Högerforward','right-wing')}${lineupSlot('defense',d,'Vänsterback','left-defense')}${lineupSlot('defense',d+1,'Högerback','right-defense')}${lineupSlot('goalie',0,'Målvakt','goalkeeper')}</div>
 <div class="lineup-unit-report"><h2>Kedja ${u.line+1} + backpar ${u.pair+1}</h2><p>${unitAssessment([...players,...backs].map(p=>p.id))}</p><p>Rinkens backpar är en förhandsvisning tillsammans med kedjan. Backparen roterar separat under matchen.</p>${lineupCombinationEvidence("forward",players.map(p=>p.id),"Kedja "+(u.line+1))}${lineupCombinationEvidence("defense",backs.map(p=>p.id),"Backpar "+(u.pair+1))}<small>Senaste fem kompletta tävlingsrapporterna denna säsong. Kort gemensam istid ger osäkert underlag; matchutfallet visar inte vad ett byte skulle ha orsakat.</small>${hockeyChangeBlocked()?'<p class="lineup-warning">Icing: spelarbyten är låsta till nästa nedsläpp.</p>':''}</div></section>
 <aside class="lineup-candidates" id="lineupCandidates" tabindex="-1"><header><span class="career-eyebrow">${slot?'VÄLJ SPELARE':'DINA ALTERNATIV'}</span><h2>${slot?slot.type==='goalie'?'Startande målvakt':slot.type==='defense'?'Backar':'Forwards':'Vem passar här?'}</h2><p>${slot?'Välj en spelare nedan. Om spelaren redan är uttagen byter de två spelarna plats.':'Tryck först på en plats på isen. Jämför roller, attribut och beredskap innan du väljer.'}</p>${slot?`<label>Sök i truppen<input type="search" placeholder="Spelarens namn" value="${trainingSafe(u.query)}" onchange="lineupUI.query=this.value;render()"></label>`:''}</header>${slot?`<div class="lineup-candidate-list">${candidates.map(p=>{const r=playerAssessment(p),ready=medicalAvailable(p),selected=samePlayerId(p.id,selectedId);return `<article class="lineup-candidate ${selected?'selected':''} ${!ready?'unavailable':''}"><h3>${playerReference(p.id,p.name)}</h3><button class="lineup-choose" onclick="lineupPlace('${p.id}')" ${!ready||hockeyChangeBlocked()?'disabled':''} aria-label="${trainingSafe('Välj '+p.name)}"><span><strong>${selected?'Vald på platsen':'Placera här'}</strong><small>${p.pos} · ${lineupPlayerPlace(p)}</small></span><span>${selected?'✓':'+'}</span></button><div class="lineup-player-grades"><span>Förmåga ${assessmentBadge(p)}</span><span>Potential ${assessmentBadge(p,true)}</span></div><p>${r.roles[0].name} · ${Math.round(100-(p.fatigue||0))}% beredskap${ready?'':' · Ej tillgänglig'}</p><p>${lineupWorkload(p)}</p><button class="lineup-profile-link" onclick="selectPlayer('${p.id}')">Attribut & rapport →</button></article>`;}).join('')||'<p>Ingen spelare matchar sökningen.</p>'}</div>`:'<div class="lineup-pick-help"><span aria-hidden="true">↖</span><h3>Börja på rinken</h3><p>Fyra forwardskedjor, tre backpar och ett målvaktsval. Du behöver inte dra spelare; tryck fungerar även på mobilen.</p></div>'}</aside></div>
 <section class="lineup-overview"><h2>Hela uppställningen</h2><div>${[0,1,2,3].map(n=>`<article class="lineup-unit-card ${u.line===n?'selected':''}"><button onclick="lineupSelectUnit('line',${n})">Kedja ${n+1}</button>${state.lines.forwards.slice(n*3,n*3+3).map(id=>`<strong>${playerById(id)?playerReference(id,playerById(id).name):'Vakant'}</strong>`).join('')}</article>`).join('')}${[0,1,2].map(n=>`<article class="lineup-unit-card ${u.pair===n?'selected':''}"><button onclick="lineupSelectUnit('pair',${n})">Backpar ${n+1}</button>${state.lines.defense.slice(n*2,n*2+2).map(id=>`<strong>${playerById(id)?playerReference(id,playerById(id).name):'Vakant'}</strong>`).join('')}</article>`).join('')}</div></section><p class="league-stat-help">Guldstjärnor: förmåga. Blå stjärnor: potential. Ljusa delar visar personalens osäkerhet. Formationerna sparas direkt och används av matchmotorn. Alla coachbyten pausar en pågående match.</p></section>`;
}

// The same slot order is used by this board and the live hockey model.
const SPECIAL_SCHEMES={pp:{oneThreeOne:'1–3–1',umbrella:'Paraply',overload:'Överbelastning'},pk:{box:'Box',diamond:'Diamant'}};
const SPECIAL_SLOTS={
 oneThreeOne:[[69,50,'Spel på blålinjen','passing'],[78,22,'Vänster skytt','shooting'],[82,50,'Bumper','decisions'],[78,78,'Höger skytt','shooting'],[89,50,'Framför mål','strength']],
 umbrella:[[69,50,'Spel på blålinjen','passing'],[73,23,'Vänster blå','shooting'],[85,32,'Returer vänster','positioning'],[73,77,'Höger blå','shooting'],[88,63,'Framför mål','strength']],
 overload:[[69,50,'Spel på blålinjen','passing'],[77,20,'Halvsarg','passing'],[85,31,'Kort passningsspel','puckControl'],[79,77,'Svag sida','shooting'],[91,43,'Mållinje & skymning','strength']],
 box:[[18,35,'Vänster framför mål','positioning'],[18,65,'Höger framför mål','positioning'],[29,35,'Press vänster','workRate'],[29,65,'Press höger','discipline']],
 diamond:[[16,50,'Skyddar målområdet','positioning'],[25,25,'Vänster passningsväg','decisions'],[25,75,'Höger passningsväg','decisions'],[34,50,'Press mot blå','workRate']]
};
let specialUI={unit:'pp1',slot:0,query:''};
function ensureSpecialPlans(){state.specialPlans??={};if(!SPECIAL_SCHEMES.pp[state.specialPlans.pp])state.specialPlans.pp='oneThreeOne';if(!SPECIAL_SCHEMES.pk[state.specialPlans.pk])state.specialPlans.pk='box';if(!['safe','selective'].includes(state.specialPlans.counter))state.specialPlans.counter='selective';}
function specialPlan(kind,value){ensureSpecialPlans();if(kind==='counter'?!['safe','selective'].includes(value):!SPECIAL_SCHEMES[kind]?.[value])return;if(state.live?.running)pauseMatch();const before=tacticalReviewPlan();state.specialPlans[kind]=value;tacticalReviewRecord(before,'Special teams-instruktion');save();render();}
function specialSelect(key,index=0){if(!['pp1','pp2','pk1','pk2'].includes(key))return;ensureSpecialTeams();if(!Number.isInteger(index)||index<0||index>=state.specialTeams[key].length)return;if(state.live?.running)pauseMatch();specialUI={unit:key,slot:index,query:''};render();document.getElementById('specialCandidates')?.focus?.({preventScroll:true});document.getElementById('specialCandidates')?.scrollIntoView?.({block:'nearest',behavior:'smooth'});}
function specialPlace(id){const key=specialUI.unit,index=specialUI.slot;if(state.live?.running)pauseMatch();changeSpecialPlayer(key,index,id);document.getElementById('special-slot-'+key+'-'+index)?.focus?.({preventScroll:true});}
function specialBoardView(){return specialFourBoards();}

function lineupWorkspaceNav(){return `<nav class="lineup-workspace-nav" aria-label="Laguttagning">${[['even','Kedjor & backpar'],['squad','Matchtrupp'],['special','Powerplay & boxplay']].map(([key,label])=>`<button class="btn secondary" aria-pressed="${lineupWorkspace===key}" onclick="lineupWorkspace='${key}';deskNavigate('lines')">${label}</button>`).join('')}</nav>`;}

function lineupSquadSummary(){ensureLines();return '<section class="desk-panel"><h1>Matchtrupp</h1><p>Jämför spelarnas förutsättningar inför laguttagningen. Reserver väljs längre ned.</p></section>'+readinessSquadView();}
