"use strict";
const developmentUI={tab:'players',player:null,detail:false,filter:'all',query:'',sort:'name',direction:1,juniorTab:'players',juniorDetail:false,juniorQuery:'',juniorFilter:'all',juniorSort:'name',juniorDirection:1,medical:null,medicalTab:'cases',period:'baseline',position:'all',scroll:0,juniorPlayer:null,juniorPosition:'all',juniorScroll:0,medicalQuery:'',medicalFilter:'all',medicalSort:'status',medicalDirection:1,medicalScroll:0,medicalDetail:false,drawer:null};
const DEVELOPMENT_COLUMNS={name:'Spelare',position:'Pos',age:'Ålder',environment:'Miljö',ability:'Förmåga',potential:'Potential',change:'Attribut ±',focus:'Fokus',energy:'Ork',ice:'Istid / match',next:'Nästa steg',readiness:'A-lagsberedskap'};
function juniorOpenWorkspace(tab='players'){if(!['players','lineup','calendar','league','history'].includes(tab))return;deskNavigate('juniors');developmentUI.juniorTab=tab;developmentUI.juniorDetail=false;render();queueInterfaceSave();}
function developmentSet(key,value){developmentRememberView();if(!Object.hasOwn(developmentUI,key))return;if(developmentUI[key]!==value)deskClearWorkspaceNotices();developmentUI[key]=value;if(key==='tab')developmentUI.detail=false;if(key==='juniorTab')developmentUI.juniorDetail=false;render();queueInterfaceSave();}
function developmentKey(key,junior=false){return junior?'junior'+key[0].toUpperCase()+key.slice(1):key;}
function developmentSort(key,junior=false){
 developmentRememberView();
 if(!Object.hasOwn(DEVELOPMENT_COLUMNS,key))return;
 const sort=developmentKey('sort',junior),direction=developmentKey('direction',junior);
 developmentUI[direction]=developmentUI[sort]===key?-developmentUI[direction]:['ability','potential','change','energy'].includes(key)?-1:1;
 developmentUI[sort]=key;render();queueInterfaceSave();
}
function developmentReset(junior=false){for(const [key,value] of Object.entries({query:'',filter:'all',position:'all',sort:'name',direction:1,scroll:0}))developmentUI[developmentKey(key,junior)]=value;render();queueInterfaceSave();}
function developmentRoster(junior=false){
 if(junior)return juniorPlayers();
 const loans=(state.loans?.active||[]).filter(l=>l.owner===managerClub()).map(loanPlayer).filter(Boolean);
 return [...new Map([...managerRoster(),...juniorPlayers(),...loans].map(p=>[String(p.id),p])).values()];
}
function developmentEnvironment(p){return p.academy?JUNIOR_PATHS[p.academy.path]||'Juniorlaget':playerLoan(p)?.owner===managerClub()?'Utlånad':'A-laget';}
function developmentPlayers(junior=false){
 const query=developmentUI[developmentKey('query',junior)].toLocaleLowerCase('sv').trim(),filter=developmentUI[developmentKey('filter',junior)];
 return developmentRoster(junior).filter(p=> (developmentUI[developmentKey('position',junior)]==='all'||p.pos===developmentUI[developmentKey('position',junior)])&&p.name.toLocaleLowerCase('sv').includes(query)&&(filter==='all'||filter==='senior'&&isOwnPlayer(p)||filter==='junior'&&p.academy&&!isOwnPlayer(p)||filter==='loan'&&(p.academy?.loan||playerLoan(p)?.owner===managerClub())||filter==='u18'&&p.age<=18||filter==='u20'&&p.age>18&&p.age<=20||filter==='goalies'&&p.pos==='MV'||filter==='rest'&&p.trainingLoad==='rest'||filter==='tired'&&(p.fatigue>=55||medicalRiskLabel(p)==='Hög')));
}
function developmentChange(p){
 const baseline=p.academy?.baseline||p.trainingBaseline;
 if(!baseline)return null;
 const differences=Object.entries(p.attributes||{}).filter(([key,value])=>Number.isFinite(value)&&Number.isFinite(baseline[key])).map(([key,value])=>value-baseline[key]);
 return differences.length?{net:differences.reduce((a,b)=>a+b,0),up:differences.reduce((a,b)=>a+Math.max(0,b),0),down:differences.reduce((a,b)=>a+Math.max(0,-b),0)}:null;
}
function developmentRows(junior=false){
 const rows=developmentPlayers(junior).map(p=>{
  const assessment=p.academy?juniorAssessment(p):playerAssessment(p),change=developmentPeriodChange(p);
  return {p,name:p.name,position:p.pos,age:p.age,environment:developmentEnvironment(p),ability:p.academy?assessment.currentValue:assessment.known?assessment.current:null,potential:p.academy?assessment.potentialValue:assessment.known?(assessment.potentialLow+assessment.potentialHigh)/2:null,change:change?.net??null,delta:change,focus:p.developmentFocus||'Balanserad',energy:Math.round(100-(p.fatigue||0)),assessment,ice:developmentIce(p).seconds,next:developmentNext(p),readiness:p.academy?managerJ20Readiness(p).level:null};
 });
 const key=developmentUI[developmentKey('sort',junior)],direction=developmentUI[developmentKey('direction',junior)];
 return rows.sort((a,b)=>{
  if(a[key]==null&&b[key]!=null)return 1;if(b[key]==null&&a[key]!=null)return -1;
  const order=typeof a[key]==='number'?a[key]-b[key]:String(a[key]??'').localeCompare(String(b[key]??''),'sv',{numeric:true});
  return order*direction||a.name.localeCompare(b.name,'sv')||String(a.p.id).localeCompare(String(b.p.id));
 });
}
function developmentOpenPlayer(id,page='training',resetOverview=false){
 developmentRememberView();
 const p=developmentRoster(page==='juniors').find(p=>samePlayerId(p.id,id));if(!p)return;
 deskHistorySync();const previous=deskSnapshot();deskBrowserBefore(previous);deskHistory.push(previous);if(deskHistory.length>30)deskHistory.shift();
 deskNavigate(page,undefined,false);
 if(page==='juniors'){developmentUI.juniorTab='players';developmentUI.juniorDetail=true;developmentUI.juniorPlayer=p.id;state.juniors.selected=p.id;}
 else{developmentUI.tab='players';developmentUI.detail=true;developmentUI.player=p.id;if(resetOverview){developmentUI.query='';developmentUI.filter='all';developmentUI.position='all';developmentUI.scroll=0;}}
 render();deskBrowserAfter();queueInterfaceSave();
}
function developmentClosePlayer(junior=false){developmentRememberView();developmentUI[junior?'juniorDetail':'detail']=false;render();deskBrowserBefore();developmentFocusSelection(junior?'juniors':'training');queueInterfaceSave();}
function developmentPlayerDetail(p,junior=false){
 const back=`<button type="button" class="dv-back" onclick="developmentClosePlayer(${junior})">← Till truppöversikten</button>`;
 if(!p)return `${back}<p>Spelaren finns inte längre i den här truppen.</p>`;
 const body=p.academy?`<div class="dv-junior-detail">${juniorProfile(p)}</div>`:isOwnPlayer(p)?`<section class="dv-panel dv-player-detail"><header><div><span class="desk-kicker">${p.pos} · ${p.age} år</span><h2>${playerReference(p.id,p.name)}</h2></div><button type="button" class="dv-link" onclick="${trainingSafe(`selectPlayer(${JSON.stringify(p.id)})`)}">Fullständig spelarprofil →</button></header>${trainingPlayerPanel(p)}</section>`:`<section class="dv-panel dv-player-detail"><h2>${playerReference(p.id,p.name)}</h2><p>Utlånad till ${trainingSafe(playerLoan(p)?.borrower||p.club)}. Mottagande klubb sköter träningen.</p>${developmentPanel(p)}</section>`;
 return `<div class="dv-detail-view">${back}${body}</div>`;
}
function developmentHistory(){return `<section class="dv-panel"><header><h2>Genomförda lagpass</h2>${deskLink('Planera i kalendern',{page:'calendar'})}</header><div class="dv-scroll"><table><thead><tr><th>Datum</th><th>Pass</th><th>Deltog</th><th>Vilade</th><th>Ork före → efter</th><th>Attributsteg</th></tr></thead><tbody>${state.training.history.map(l=>`<tr><td>${l.date?calText(l.date):'Omgång '+l.round}</td><th>${TRAINING_SESSIONS[l.type].name}${l.date?`<button type="button" class="desk-link" onclick="matchesOpenDay('${l.date}')">Passrapport →</button>`:''}</th><td>${l.trained}</td><td>${l.resting}</td><td>${Math.round(100-l.before)} → ${Math.round(100-l.after)} %</td><td>${l.improvements||0}</td></tr>`).join('')||'<tr><td colspan="6">Inga lagpass har genomförts ännu. Planera nästa pass i kalendern.</td></tr>'}</tbody></table></div></section>`;}
function developmentJuniorHistory(){const s=state.juniors;return `<section class="dv-panel"><header><h2>Utvecklingsmatcher & rapporter</h2></header><p class="dv-note">J20 spelar på egna datum i kalendern. Matchrapporter och journal hålls åtskilda från A-lagets statistik.</p>${s.matches.slice(0,12).map(m=>`<details class="dv-report"><summary>${seasonLabel(m.year)} · omgång ${m.round} · ${trainingSafe(m.opponent)} · ${m.own}–${m.against}</summary>${m.players.filter(p=>p.seconds).map(p=>`<p>${playerReference(p.id,p.name)} · ${Math.floor(p.seconds/60)} min · ${p.goals}+${p.assists}</p>`).join('')}</details>`).join('')||'<p class="dv-note">Första matchrapporten kommer efter nästa J20-match.</p>'}${s.reports.slice(0,12).map(r=>`<details class="dv-report"><summary>${playerReferenceText(r.titleParts||r.title)}</summary><p>${playerReferenceText(r.bodyParts||r.body)}</p></details>`).join('')}<details class="dv-report"><summary>Årliga intag</summary>${s.intakes.map(r=>`<p>${seasonLabel(r.year)} · ${(r.players?r.players.map(p=>playerReference(p.id,p.name)):r.names.map(trainingSafe)).join(', ')||'Inga lediga platser'}</p>`).join('')}</details></section>`;
}

function developmentOpenPlan(id){developmentOpenPlayer(id,'training',true);}
