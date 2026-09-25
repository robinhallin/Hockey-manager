"use strict";
const developmentUI={tab:'players',player:null,detail:false,filter:'all',query:'',sort:'name',direction:1,juniorTab:'players',juniorDetail:false,juniorQuery:'',juniorFilter:'all',juniorSort:'name',juniorDirection:1,medical:null,medicalTab:'cases'};
const DEVELOPMENT_COLUMNS={name:'Spelare',position:'Pos',age:'Ålder',environment:'Miljö',ability:'Förmåga',potential:'Potential',change:'Attribut ±',focus:'Fokus',energy:'Ork'};
function juniorOpenWorkspace(tab='players'){if(!['players','lineup','calendar','league','history'].includes(tab))return;deskNavigate('juniors');developmentUI.juniorTab=tab;developmentUI.juniorDetail=false;render();queueInterfaceSave();}
function developmentSet(key,value){if(!Object.hasOwn(developmentUI,key))return;if(developmentUI[key]!==value)deskClearWorkspaceNotices();developmentUI[key]=value;if(key==='tab')developmentUI.detail=false;if(key==='juniorTab')developmentUI.juniorDetail=false;render();queueInterfaceSave();}
function developmentKey(key,junior=false){return junior?'junior'+key[0].toUpperCase()+key.slice(1):key;}
function developmentSort(key,junior=false){
 if(!Object.hasOwn(DEVELOPMENT_COLUMNS,key))return;
 const sort=developmentKey('sort',junior),direction=developmentKey('direction',junior);
 developmentUI[direction]=developmentUI[sort]===key?-developmentUI[direction]:['ability','potential','change','energy'].includes(key)?-1:1;
 developmentUI[sort]=key;render();queueInterfaceSave();
}
function developmentReset(junior=false){for(const [key,value] of Object.entries({query:'',filter:'all',sort:'name',direction:1}))developmentUI[developmentKey(key,junior)]=value;render();queueInterfaceSave();}
function developmentHeader(title,summary){return `<header class="dv-heading"><div><span class="desk-kicker">${trainingSafe(managerClub())} · ${seasonLabel()}</span><h1>${title}</h1></div></header><div class="dv-summary">${summary}</div>`;}
function developmentTabs(key,values){return `<nav class="dv-tabs" aria-label="Utvecklingsvy">${Object.entries(values).map(([value,label])=>`<button type="button" aria-pressed="${developmentUI[key]===value}" onclick="developmentSet('${key}','${value}')">${label}</button>`).join('')}</nav>`;}
function developmentRoster(junior=false){
 if(junior)return juniorPlayers();
 const loans=(state.loans?.active||[]).filter(l=>l.owner===managerClub()).map(loanPlayer).filter(Boolean);
 return [...new Map([...managerRoster(),...juniorPlayers(),...loans].map(p=>[String(p.id),p])).values()];
}
function developmentEnvironment(p){return p.academy?JUNIOR_PATHS[p.academy.path]||'Juniorlaget':playerLoan(p)?.owner===managerClub()?'Utlånad':'A-laget';}
function developmentPlayers(junior=false){
 const query=developmentUI[developmentKey('query',junior)].toLocaleLowerCase('sv').trim(),filter=developmentUI[developmentKey('filter',junior)];
 return developmentRoster(junior).filter(p=>p.name.toLocaleLowerCase('sv').includes(query)&&(filter==='all'||filter==='senior'&&isOwnPlayer(p)||filter==='junior'&&p.academy&&!isOwnPlayer(p)||filter==='loan'&&(p.academy?.loan||playerLoan(p)?.owner===managerClub())||filter==='goalies'&&p.pos==='MV'||filter==='rest'&&p.trainingLoad==='rest'||filter==='tired'&&p.fatigue>=35));
}
function developmentChange(p){
 const baseline=p.academy?.baseline||p.trainingBaseline;
 if(!baseline)return null;
 const differences=Object.entries(p.attributes||{}).filter(([key,value])=>Number.isFinite(value)&&Number.isFinite(baseline[key])).map(([key,value])=>value-baseline[key]);
 return differences.length?{net:differences.reduce((a,b)=>a+b,0),up:differences.reduce((a,b)=>a+Math.max(0,b),0),down:differences.reduce((a,b)=>a+Math.max(0,-b),0)}:null;
}
function developmentRows(junior=false){
 const rows=developmentPlayers(junior).map(p=>{
  const assessment=p.academy?juniorAssessment(p):playerAssessment(p),change=developmentChange(p);
  return {p,name:p.name,position:p.pos,age:p.age,environment:developmentEnvironment(p),ability:p.academy?assessment.currentValue:assessment.known?assessment.current:null,potential:p.academy?assessment.potentialValue:assessment.known?(assessment.potentialLow+assessment.potentialHigh)/2:null,change:change?.net??null,delta:change,focus:p.developmentFocus||'Balanserad',energy:Math.round(100-(p.fatigue||0)),assessment};
 });
 const key=developmentUI[developmentKey('sort',junior)],direction=developmentUI[developmentKey('direction',junior)];
 return rows.sort((a,b)=>{
  if(a[key]==null&&b[key]!=null)return 1;if(b[key]==null&&a[key]!=null)return -1;
  const order=typeof a[key]==='number'?a[key]-b[key]:String(a[key]??'').localeCompare(String(b[key]??''),'sv',{numeric:true});
  return order*direction||a.name.localeCompare(b.name,'sv')||String(a.p.id).localeCompare(String(b.p.id));
 });
}
function developmentTable(junior=false){
 const rows=developmentRows(junior),sort=developmentUI[developmentKey('sort',junior)],direction=developmentUI[developmentKey('direction',junior)],queryKey=developmentKey('query',junior),filterKey=developmentKey('filter',junior);
 const filters={all:junior?'Alla juniorer':'Hela klubben',...(!junior?{senior:'A-laget',junior:'Juniorer'}:{}),loan:'Utlånade',goalies:'Målvakter',tired:'Hög belastning',rest:'Individuell vila'};
 return `<form class="dv-filters" onsubmit="event.preventDefault();developmentSet('${queryKey}',this.elements.query.value)"><label>Sök spelare<input type="search" name="query" placeholder="Spelarens namn" value="${trainingSafe(developmentUI[queryKey])}"></label><button type="submit">Sök</button><label>Urval<select onchange="developmentSet('${filterKey}',this.value)">${Object.entries(filters).map(([v,label])=>`<option value="${v}" ${developmentUI[filterKey]===v?'selected':''}>${label}</option>`).join('')}</select></label><button type="button" onclick="developmentReset(${junior})">Rensa urval</button><span>${rows.length} av ${developmentRoster(junior).length} spelare</span></form><section class="dv-panel dv-overview"><div class="dv-scroll" tabindex="0" role="region" aria-label="${junior?'Juniorernas':'Truppens'} utveckling"><table><caption class="dv-table-hint">Klicka på ett namn för utvecklingsplan och detaljer. Sortera med kolumnrubrikerna.</caption><thead><tr>${Object.entries(DEVELOPMENT_COLUMNS).map(([key,label])=>`<th scope="col" aria-sort="${sort===key?(direction===1?'ascending':'descending'):'none'}"><button type="button" onclick="developmentSort('${key}',${junior})">${label}<span aria-hidden="true">${sort===key?(direction===1?' ↑':' ↓'):' ↕'}</span></button></th>`).join('')}</tr></thead><tbody>${rows.map(row=>{
  const {p,assessment:r,delta}=row,stars=potential=>p.academy?(potential?r.potential:r.current):r.known?starRatingHTML(potential?r.potentialLow:r.low,potential?r.potentialHigh:r.high,potential,r.staff.name):'Ej bedömd';
  return `<tr data-development-id="${trainingSafe(p.id)}"><th scope="row"><button type="button" class="dv-player-name" onclick="${trainingSafe(`developmentOpenPlayer(${JSON.stringify(p.id)},'${junior?'juniors':'training'}')`)}">${trainingSafe(p.name)}</button></th><td>${trainingSafe(p.pos)}</td><td>${p.age}</td><td>${trainingSafe(row.environment)}</td><td>${stars(false)}</td><td>${stars(true)}</td><td class="dv-change ${delta?.net>0?'dv-positive':delta?.net<0?'dv-negative':''}" title="${delta?`${delta.up} ökade och ${delta.down} minskade attributsteg sedan uppföljningens början`:'Jämförelseunderlag saknas'}">${delta?(delta.net>0?'+':'')+delta.net:'–'}</td><td>${trainingSafe(row.focus)}</td><td class="${row.energy<65?'dv-warning':''}">${row.energy} %</td></tr>`;
 }).join('')||'<tr><td colspan="9">Inga spelare matchar urvalet.</td></tr>'}</tbody></table></div><footer>Attribut ± visar summan av registrerade attributförändringar sedan säsongsstart eller första uppföljning. Stjärnor är stabens bedömning; potentialen är osäker.</footer></section>`;
}
function developmentOpenPlayer(id,page='training'){
 const p=developmentRoster(page==='juniors').find(p=>samePlayerId(p.id,id));if(!p)return;
 deskHistorySync();const previous=deskSnapshot();deskBrowserBefore(previous);deskHistory.push(previous);if(deskHistory.length>30)deskHistory.shift();
 deskNavigate(page,undefined,false);
 if(page==='juniors'){developmentUI.juniorTab='players';developmentUI.juniorDetail=true;state.juniors.selected=p.id;}
 else{developmentUI.tab='players';developmentUI.detail=true;developmentUI.player=p.id;}
 render();deskBrowserAfter();queueInterfaceSave();
}
function developmentClosePlayer(junior=false){developmentUI[junior?'juniorDetail':'detail']=false;render();deskBrowserBefore();queueInterfaceSave();}
function developmentPlayerDetail(p,junior=false){
 const back=`<button type="button" class="dv-back" onclick="developmentClosePlayer(${junior})">← Till truppöversikten</button>`;
 if(!p)return `${back}<p>Spelaren finns inte längre i den här truppen.</p>`;
 const body=p.academy?`<div class="dv-junior-detail">${juniorProfile(p)}</div>`:isOwnPlayer(p)?`<section class="dv-panel dv-player-detail"><header><div><span class="desk-kicker">${p.pos} · ${p.age} år</span><h2>${playerReference(p.id,p.name)}</h2></div><button type="button" class="dv-link" onclick="${trainingSafe(`selectPlayer(${JSON.stringify(p.id)})`)}">Fullständig spelarprofil →</button></header>${trainingPlayerPanel(p)}</section>`:`<section class="dv-panel dv-player-detail"><h2>${playerReference(p.id,p.name)}</h2><p>Utlånad till ${trainingSafe(playerLoan(p)?.borrower||p.club)}. Mottagande klubb sköter träningen.</p>${developmentPanel(p)}</section>`;
 return `<div class="dv-detail-view">${back}${body}</div>`;
}
function developmentHistory(){return `<section class="dv-panel"><header><h2>Genomförda lagpass</h2>${deskLink('Planera i kalendern',{page:'calendar'})}</header><div class="dv-scroll"><table><thead><tr><th>Datum</th><th>Pass</th><th>Deltog</th><th>Vilade</th><th>Ork före → efter</th><th>Attributsteg</th></tr></thead><tbody>${state.training.history.map(l=>`<tr><td>${l.date?calText(l.date):'Omgång '+l.round}</td><th>${TRAINING_SESSIONS[l.type].name}${l.date?`<button type="button" class="desk-link" onclick="matchesOpenDay('${l.date}')">Passrapport →</button>`:''}</th><td>${l.trained}</td><td>${l.resting}</td><td>${Math.round(100-l.before)} → ${Math.round(100-l.after)} %</td><td>${l.improvements||0}</td></tr>`).join('')||'<tr><td colspan="6">Inga lagpass har genomförts ännu. Planera nästa pass i kalendern.</td></tr>'}</tbody></table></div></section>`;}
function developmentWorkspaceView(){
 ensureTrainingData();ensureJuniors();const all=developmentRoster(),p=all.find(p=>samePlayerId(p.id,developmentUI.player));
 const body=developmentUI.tab==='history'?developmentHistory():developmentUI.detail?developmentPlayerDetail(p):developmentTable();
 return `<section class="development-workspace">${developmentHeader('Spelarutveckling',`<span><strong>${all.length}</strong> spelare i uppföljningen</span><span><strong>${all.filter(p=>(developmentChange(p)?.net||0)>0).length}</strong> med positiv utveckling</span><span><strong>${all.filter(p=>p.fatigue>=35).length}</strong> med hög belastning</span>`)}${developmentTabs('tab',{players:'Truppöversikt',history:'Genomförda pass'})}${body}<details class="dv-panel dv-responsibility"><summary>Lagträning & delegering</summary><p>${trainingSafe(trainingAdvice())}</p>${trainingResponsibilityView()}${deskLink('Lagets kalender',{page:'calendar'})}${deskLink('Stabens uppföljning',{page:'staffReview'})}</details></section>`;
}
function developmentJuniorsView(){
 ensureJuniors();const s=state.juniors,players=juniorPlayers(),p=juniorById(s.selected);
 const history=`<section class="dv-panel"><header><h2>Utvecklingsmatcher & rapporter</h2></header><p class="dv-note">J20 spelar på egna datum i kalendern. Matchrapporter och journal hålls åtskilda från A-lagets statistik.</p>${s.matches.slice(0,12).map(m=>`<details class="dv-report"><summary>${seasonLabel(m.year)} · omgång ${m.round} · ${trainingSafe(m.opponent)} · ${m.own}–${m.against}</summary>${m.players.filter(p=>p.seconds).map(p=>`<p>${playerReference(p.id,p.name)} · ${Math.floor(p.seconds/60)} min · ${p.goals}+${p.assists}</p>`).join('')}</details>`).join('')||'<p class="dv-note">Första matchrapporten kommer efter nästa J20-match.</p>'}${s.reports.slice(0,12).map(r=>`<details class="dv-report"><summary>${playerReferenceText(r.titleParts||r.title)}</summary><p>${playerReferenceText(r.bodyParts||r.body)}</p></details>`).join('')}<details class="dv-report"><summary>Årliga intag</summary>${s.intakes.map(r=>`<p>${seasonLabel(r.year)} · ${(r.players?r.players.map(p=>playerReference(p.id,p.name)):r.names.map(trainingSafe)).join(', ')||'Inga lediga platser'}</p>`).join('')}</details></section>`;
 const body=developmentUI.juniorTab==='players'?(developmentUI.juniorDetail?developmentPlayerDetail(p,true):developmentTable(true)):developmentUI.juniorTab==='history'?history:`<div class="dv-junior-workarea">${developmentUI.juniorTab==='lineup'?juniorLineupView():developmentUI.juniorTab==='calendar'?juniorCalendarView():juniorWorldView()}</div>`;
 return `<section class="development-workspace junior-workspace">${developmentHeader('Juniorer',`<span><strong>${players.length}</strong> talanger</span><span><strong>${players.filter(p=>p.academy.loan).length}</strong> på utvecklingslån</span><span><strong>${players.filter(isOwnPlayer).length}</strong> i A-laget</span>`)}${developmentTabs('juniorTab',{players:'Truppöversikt',lineup:'Kedjor',calendar:'Kalender',league:'Tabell & statistik',history:'Matcher & rapporter'})}${s.message?`<p class="dv-notice" role="status">${trainingSafe(s.message)}</p>`:''}${body}<details class="dv-panel dv-responsibility"><summary>Juniorträning & delegering</summary>${assistantTrainingView('junior')}</details></section>`;
}
function developmentMedicalView(){
 ensureMedical();const ps=managerRoster(),s=state.medical,injured=ps.filter(p=>p.health.injury),p=ps.find(p=>samePlayerId(p.id,developmentUI.medical))||injured[0]||ps.slice().sort((a,b)=>medicalRisk(b)-medicalRisk(a))[0];
 const history=`<section class="dv-panel"><header><h2>Medicinska rapporter</h2></header>${s.history.map(e=>`<details class="dv-report"><summary>Dag ${e.day} · ${e.playerId!=null?playerReference(e.playerId,e.title):trainingSafe(e.title)}</summary><p>${trainingSafe(e.body)}</p></details>`).join('')||'<p class="dv-note">Inga medicinska rapporter ännu.</p>'}</section>`;
 return `<section class="development-workspace">${developmentHeader('Medicinskt team',`<span>${ps.filter(medicalReady).length} / ${ps.length} matchklara</span><span>${injured.length} skador eller återgångar</span><span>${ps.filter(p=>medicalRiskLabel(p)==='Hög').length} med hög belastningsrisk</span>`)}<div class="dv-program"><p>${trainingSafe(s.staff.doctor)} och ${trainingSafe(s.staff.physio)} följer rehabilitering och belastning.</p><button type="button" class="desk-link" onclick="developmentOpenPlan('${p?.id||''}')">Planera individuell vila →</button></div>${developmentTabs('medicalTab',{cases:'Tillgänglighet & belastning',history:'Rapporter'})}${s.message?`<p class="dv-notice" role="status">${trainingSafe(s.message)}</p>`:''}${state.live&&!state.live.finished&&!medicalMatchReady()?'<div class="dv-notice"><p>För få tillgängliga spelare för att fortsätta matchen.</p><button type="button" class="btn" onclick="medicalConcede()">Avbryt matchen – registrera förlust</button></div>':''}${developmentUI.medicalTab==='history'?history:`<div class="dv-layout"><section class="dv-panel"><div class="dv-scroll"><table><thead><tr><th>Spelare</th><th>Status</th><th>Ork</th><th>Belastning</th><th>Risk</th></tr></thead><tbody>${ps.slice().sort((a,b)=>Number(Boolean(b.health.injury))-Number(Boolean(a.health.injury))||medicalRisk(b)-medicalRisk(a)).map(q=>`<tr class="${p===q?'selected':''}"><th>${playerReference(q.id,q.name)}<button type="button" aria-pressed="${p===q}" onclick="developmentSet('medical','${q.id}')">Skadebedömning</button></th><td>${medicalReady(q)?'Matchklar':'Ej matchklar'}</td><td>${Math.round(100-q.fatigue)} %</td><td>${Math.round(q.health.load)} / 100</td><td>${medicalRiskLabel(q)}</td></tr>`).join('')}</tbody></table></div><footer>Ork, medicinsk tillgänglighet och belastningsrisk är olika mått. Välj en spelare för prognos och beslut.</footer></section><aside class="dv-inspector">${p?`<h2>${playerReference(p.id,p.name)}</h2>${medicalPlayerPanel(p)}<button type="button" class="dv-link" onclick="selectPlayer('${p.id}')">Fullständig spelarprofil →</button>`:''}<hr><h3>Ersättare vid frånvaro</h3><p>Bedöm en tillgänglig junior och granska avtal och löneutrymme före uppflyttning.</p>${deskLink('Visa juniortruppen',{page:'juniors'})}${deskLink('Se över laguttagningen',{page:'lines'})}</aside></div>`}<p class="dv-note">Rehabilitering följer karriärens dagar och matcher. Prognoser och risknivåer är förenklade speldata.</p></section>`;
}

function developmentOpenPlan(id){developmentOpenPlayer(id,'training');}
