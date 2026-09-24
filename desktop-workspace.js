"use strict";
// Presentation state only. All edits use the career's existing guarded actions.
const profileWorkspace={tab:'overview'};
function desktopOrder(key,value){
 const allowed={shiftLength:['short','normal','long'],shotChoice:['patient','balanced','shoot']};
 if(allowed[key]){if(!allowed[key].includes(value))return;matchPause();state.tacticalPlan[key]=value;save();render();}
 else {matchPause();if(key==='tactic')setTactic(value);else if(key==='attackStyle')hockeySetStyle(value);else setTacticalSetting(key,value);}
 document.getElementById('desktop-order-'+key)?.focus?.({preventScroll:true});
}
function desktopOrders(){
 const order=(key,label,options,note)=>`<label title="${note}">${label}<select id="desktop-order-${key}" onchange="desktopOrder('${key}',this.value)">${options.map(([v,l])=>`<option value="${v}" ${(key==='tactic'?state.tactic:state.tacticalPlan[key]||(key==='shiftLength'?'normal':key==='shotChoice'?'balanced':''))===v?'selected':''}>${l}</option>`).join('')}</select></label>`;
 return `<aside class="fm-panel fm-orders"><h2>Lagorder</h2>${order('tactic','Mentalitet',[['attack','Offensiv'],['balanced','Balanserad'],['defense','Defensiv']],'Balans mellan anfall och försvar')}${order('attackStyle','Spelidé',Object.entries(HOCKEY_STYLES),'Ställer även in forecheck')}<h3>Med puck</h3>${order('tempo','Speltempo',[['low','Lågt'],['normal','Normalt'],['high','Högt']],'Högt tempo kostar mer ork')}${order('shotChoice','Avslutsval',[['patient','Sök bättre läge'],['balanced','Läs situationen'],['shoot','Skjut oftare']],'Fler skott avslutar uppbyggnaden tidigare')}<h3>Utan puck</h3>${order('forecheck','Forecheck',[['passive','Avvaktande'],['balanced','Balanserad'],['aggressive','Aggressiv']],'Hög press lämnar ytor och kostar ork')}${order('physicality','Fysisk nivå',[['safe','Disciplinerat'],['balanced','Balanserat'],['hard','Hårt']],'Hårt spel ökar utvisningsrisken')}<h3>Bänken</h3>${order('lineUsage','Kedjeanvändning',[['rollFour','Rulla fyra'],['balanced','Balanserad'],['topHeavy','Toppa laget']],'Toppning ger nyckelspelarna fler byten')}${order('shiftLength','Byteslängd',[['short','30 sekunder'],['normal','45 sekunder'],['long','60 sekunder']],'Längre byten belastar samma spelare längre')}<p class="fm-note">${state.tacticalPlan.tempo==='high'||state.tacticalPlan.forecheck==='aggressive'?'Hög belastning. Följ energin och överväg korta byten.':'Kontrollerad belastning. Anpassa pressen efter matchbilden.'}</p></aside>`;
}
function desktopSlot(type,index,label,position){
 const id=type==='goalie'?state.lines.goalie:state.lines[type][index],p=playerById(id),selected=lineupUI.slot?.type===type&&lineupUI.slot?.index===index;
 return `<div class="lineup-slot ${position} ${selected?'selected':''}" tabindex="-1" draggable="${Boolean(p)}" ondragstart="lineupDrag(event,'${type}',${index})" ondragover="event.preventDefault()" ondrop="lineupDrop(event,'${type}',${index})"><span class="fm-shirt">${p?.pos||'+'}</span><button type="button" class="lineup-position" onclick="lineupPickSlot('${type}',${index})" aria-pressed="${selected}" aria-label="${trainingSafe(label+': byt '+(p?.name||'spelare'))}">${label} · Byt</button><strong>${p?playerReference(p.id,p.name):'Vakant'}</strong>${p?positionBadge(p,lineupRole(type,index)):''}</div>`;
}
function desktopRoster(){
 const slot=lineupUI.slot,query=lineupUI.query.toLocaleLowerCase('sv'),selected=slot?(slot.type==='goalie'?state.lines.goalie:state.lines[slot.type][slot.index]):null;
 const pool=managerRoster().filter(p=>(!query||p.name.toLocaleLowerCase('sv').includes(query))&&(!slot||(slot.type==='goalie'?p.pos==='MV':p.pos!=='MV'))).sort((a,b)=>Number(medicalAvailable(b))-Number(medicalAvailable(a))||a.name.localeCompare(b.name,'sv'));
 return `<section class="fm-panel fm-roster" id="lineupCandidates" tabindex="-1"><header><h2>${slot?'Välj till '+StudioHockey.ROLE_NAMES[lineupRole(slot.type,slot.index)]:'Spelarval'}</h2>${slot?'<button class="fm-link" onclick="desktopClearSlot()">Avmarkera</button>':''}</header><label class="fm-search">Sök spelare<input type="search" value="${trainingSafe(lineupUI.query)}" onchange="lineupUI.query=this.value;render()" placeholder="Namn i truppen"></label><div class="fm-table-scroll" tabindex="0" role="region" aria-label="Spelarval och jämförelse"><table class="fm-roster-table"><thead><tr><th>Pos</th><th>Spelare / uttagning</th><th>Förmåga</th><th title="Energi vid nästa matchstart efter slitage">Energi</th><th>Moral</th><th>Välj</th></tr></thead><tbody>${pool.map(p=>{const available=medicalAvailable(p),chosen=samePlayerId(p.id,selected),energy=Math.round(readinessCeiling(p.fatigue));return `<tr class="${chosen?'selected':''} ${available?'':'unavailable'}" draggable="${available}" ondragstart="event.dataTransfer.setData('text/plain','${haEscape(p.id)}')"><td><span class="fm-pos">${p.pos}</span></td><td>${playerReference(p.id,p.name)}<small>${lineupPlayerPlace(p)}</small>${squadCandidateEvidence(p,slot)}</td><td>${slot?positionBadge(p,lineupRole(slot.type,slot.index)):assessmentBadge(p)}</td><td><span class="${energy<80?'fm-amber':'fm-green'}">${energy}%</span></td><td>${Math.round(p.morale??70)}</td><td><button class="fm-assign" onclick="lineupPlace('${haEscape(p.id)}')" aria-label="Välj ${trainingSafe(p.name)}" ${!slot||!available||hockeyChangeBlocked()?'disabled':''}>${chosen?'✓':'+'}</button></td></tr>`;}).join('')||'<tr><td colspan="6">Inga spelare matchar sökningen.</td></tr>'}</tbody></table></div><footer>${slot?'Välj + för att byta in spelaren. En redan uttagen spelare byter plats.':'Välj en plats på isen, eller dra en spelare dit. Klicka på namnet för profil.'}</footer></section>`;
}
function desktopTacticsView(){
 ensureLines();
 const nav=`<nav class="fm-tabs" aria-label="Taktikarbetsyta">${[['even','Fem mot fem'],['special','Powerplay & boxplay'],['squad','Matchtrupp'],['analysis','Samspelsanalys']].map(([key,label])=>`<button aria-pressed="${lineupWorkspace===key}" onclick="lineupWorkspace='${key}';render()">${label}</button>`).join('')}</nav>`;
 if(lineupWorkspace==='special')return nav+specialBoardView();
 if(lineupWorkspace==='squad')return nav+depthBenchView();
 if(lineupWorkspace==='analysis')return nav+chemistryAnalysisView()+readinessSquadView();
 return nav+lineupFourBoards();
}

function desktopAttributes(p){
 const r=playerAssessment(p),fields=p.pos==='MV'?GOALIE_ATTRIBUTES:SKATER_ATTRIBUTES;
 const groups=p.pos==='MV'?[['Målvaktsteknik',['reflexes','reboundControl','handling']],['Speluppfattning',['positioning','composure']],['Rörlighet',['movement']]]:[['Tekniska',['shooting','passing','puckControl','checking','faceoffs']],['Mentala',['vision','positioning','decisions','composure','discipline']],['Fysiska',['skating','acceleration','stamina','strength','workRate']]];
 return `<section class="fm-panel fm-attributes"><header><h2>Attribut</h2><span>1–20 · tränarteamets kunskap</span></header><div>${groups.map(([name,keys])=>`<section><h3>${name}</h3><dl>${keys.map(key=>`<dt>${fields[key]}</dt><dd class="${r.estimated[key]>=14?'fm-green':r.estimated[key]>=10?'fm-amber':''}">${attributeInterval(p,key,r)}</dd>`).join('')}</dl></section>`).join('')}</div><p>Attribut visar egenskaper. Energi, position och samspel påverkar utförandet i match.</p></section>`;
}

function desktopClearSlot(){lineupUI.slot=null;lineupUI.query="";render();}
