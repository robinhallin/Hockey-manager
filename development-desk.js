"use strict";
// Presentation uses recorded work and staff assessments, never private growth ceilings.
const developmentDialogState={};
function developmentCaptureView(){
 const dialog=document.getElementById('development-dialog');
 if(!dialog?.open){developmentDialogState.title=null;return;}
 developmentDialogState.title=dialog.querySelector('h2')?.textContent;developmentDialogState.scroll=dialog.scrollTop;
 developmentDialogState.focus=Array.from(dialog.querySelectorAll('button,input,select,a,summary')).indexOf(document.activeElement);
}
const DEVELOPMENT_PERIODS={baseline:'Sedan uppföljningens start',30:'Senaste 30 dagarna',90:'Senaste 90 dagarna'};
function developmentPeriodChange(p){
 const baseline=p.academy?.baseline||p.trainingBaseline;
 if(developmentUI.period==='baseline'){
  const delta=developmentChange(p);if(!delta)return null;
  return {...delta,changes:Object.entries(p.attributes||{}).filter(([k,v])=>Number.isFinite(v)&&Number.isFinite(baseline[k])).map(([key,value])=>({key,change:value-baseline[key]})).filter(r=>r.change)};
 }
 const days=Number(developmentUI.period),today=state.calendar?.date,d=p.developmentModel;
 if(![30,90].includes(days)||!today||!d?.historyFrom||d.historyFrom>calAdd(today,-days))return null;
 const start=calAdd(today,-days),totals={};
 for(const row of d.history||[])if(row.date&&row.date>start&&row.date<=today&&Number.isFinite(row.change))totals[row.key]=(totals[row.key]||0)+row.change;
 const changes=Object.entries(totals).map(([key,change])=>({key,change})).filter(r=>r.change);
 return {net:changes.reduce((n,r)=>n+r.change,0),up:changes.reduce((n,r)=>n+Math.max(0,r.change),0),down:changes.reduce((n,r)=>n+Math.max(0,-r.change),0),changes};
}
function developmentIce(p){
 const loan=p.academy?.loan||(!isOwnPlayer(p)&&playerLoan(p));
 if(loan)return {seconds:loan.games>0&&Number.isFinite(loan.seconds)?loan.seconds/loan.games:null,games:loan.games||0,label:'Aktuellt lån'};
 if(isOwnPlayer(p)){const s=squadSeasonStats(p);return {seconds:s.ice,games:s.games,label:s.partial?'A-lag · ofullständigt underlag':'A-lag · serie och slutspel'};}
 const s=managerJ20RecentForm(p,1000);return {seconds:s.games?s.seconds/s.games:null,games:s.games,label:'J20 · innevarande säsong'};
}
function developmentLoad(p){
 if(internationalAway(p))return 'Landslagsuppdrag';
 if(p.health?.injury)return 'Rehab / återgång';
 if(p.academy?.loan||(!isOwnPlayer(p)&&playerLoan(p)))return 'Mottagande klubb';
 const load=isOwnPlayer(p)?trainingEffectiveLoad(p):p.trainingLoad;
 return {normal:'Följ lagets pass',light:'Lätt träning',rest:'Individuell vila'}[load]||'Följ lagets pass';
}
function developmentNext(p){
 if(internationalAway(p))return 'Följ landslagsuppdrag';
 if(p.health?.injury)return 'Följ rehabiliteringen';
 if(p.fatigue>=55||medicalRiskLabel(p)==='Hög')return 'Se över belastningen';
 if(p.academy?.loan||(!isOwnPlayer(p)&&playerLoan(p)))return 'Följ istiden på lån';
 if(p.academy&&!isOwnPlayer(p)){
  if(p.age>20)return 'Beslut om nästa miljö';
  if(p.academy.path==='guest')return 'Följ upp A-träningen';
  const ready=managerJ20Readiness(p).level;
  return ready==='Fortsatt J20-utveckling'?'Fortsätt i J20':'Överväg A-träning';
 }
 const rolePlan=developmentRoleProgress(p);if(rolePlan)return `Följ mål: ${rolePlan.plan.name}`;
 const plan=p.developmentReview;
 return plan?.club===managerClub()?'Följ individuell plan':'Följ träning och istid';
}
function developmentStars(p,potential=false){
 const r=p.academy?juniorAssessment(p):playerAssessment(p);
 return p.academy?(potential?r.potential:r.current):r.known?starRatingHTML(potential?r.potentialLow:r.low,potential?r.potentialHigh:r.high,potential,r.staff.name):'<span class="dd-muted">Ej bedömd</span>';
}
function developmentAction(label,code,cls='dd-link',disabled=false){return `<button type="button" class="${cls}" onclick="${trainingSafe(code)}" ${disabled?'disabled':''}>${label}</button>`;}
function developmentRememberView(){
 const key=state.page==='juniors'?'juniorScroll':state.page==='medical'?'medicalScroll':'scroll',el=document.getElementById('development-scroll');
 if(el)developmentUI[key]=el.scrollTop||0;
}
function developmentRestoreView(){
 const el=document.getElementById('development-scroll'),key=state.page==='juniors'?'juniorScroll':state.page==='medical'?'medicalScroll':'scroll';if(el)el.scrollTop=developmentUI[key]||0;
 const dialog=document.getElementById('development-dialog');if(dialog&&!dialog.open)dialog.showModal?.();
 if(dialog?.open&&developmentDialogState.title===dialog.querySelector('h2')?.textContent){dialog.querySelectorAll('button,input,select,a,summary')[developmentDialogState.focus]?.focus({preventScroll:true});dialog.scrollTop=developmentDialogState.scroll||0;}
}
function developmentFocusSelection(page=state.page){
 const id=page==='juniors'?developmentUI.juniorPlayer:page==='medical'?developmentUI.medical:developmentUI.player;
 document.getElementById('development-player-'+id)?.focus?.({preventScroll:true});
}
function developmentSelect(id,page=state.page){
 const rows=page==='medical'?developmentMedicalRoster():developmentRoster(page==='juniors');if(!rows.some(p=>samePlayerId(p.id,id)))return;
 const visible=page==='medical'?developmentMedicalRows():developmentRows(page==='juniors');
 if(!visible.some(r=>samePlayerId(r.p.id,id))){if(page==='medical'){developmentUI.medicalQuery='';developmentUI.medicalFilter='all';}else for(const [key,value] of Object.entries({query:'',filter:'all',position:'all'}))developmentUI[developmentKey(key,page==='juniors')]=value;}
 developmentRememberView();developmentUI[page==='juniors'?'juniorPlayer':page==='medical'?'medical':'player']=id;
 render();developmentFocusSelection(page);queueInterfaceSave();
}
function developmentDrawer(value){developmentRememberView();developmentUI.drawer=value;render();if(!value)document.getElementById('development-delegation')?.focus?.();queueInterfaceSave();}
function developmentMedicalOpen(id){if(!developmentMedicalRoster().some(p=>samePlayerId(p.id,id)))return;developmentUI.medical=id;developmentRememberView();developmentUI.medicalDetail=true;render();queueInterfaceSave();}
function developmentDialogClose(){
 if(developmentUI.drawer){developmentDrawer(null);return;}
 if(state.page==='medical'){developmentUI.medicalDetail=false;render();developmentFocusSelection();queueInterfaceSave();return;}
 developmentClosePlayer(state.page==='juniors');
}
function developmentDialog(title,body){return `<dialog id="development-dialog" class="dd-dialog" aria-labelledby="development-dialog-title" oncancel="event.preventDefault();developmentDialogClose()"><header><h2 id="development-dialog-title">${trainingSafe(title)}</h2><button type="button" aria-label="Stäng panelen" onclick="developmentDialogClose()">×</button></header><div class="dd-dialog-body">${body}</div></dialog>`;}
function developmentHeader(title,subtitle,stats){return `<header class="dd-heading"><div><span class="dd-eyebrow">${trainingSafe(managerClub())} · ${seasonLabel()}</span><h1>${title}</h1><p>${subtitle}</p></div><div class="dd-heading-mark" aria-hidden="true"><span>↗</span><i></i><i></i><i></i><i></i></div></header><div class="dd-summary">${stats.map(([label,value])=>`<span>${label} <strong>${value}</strong></span>`).join('')}</div>`;}
function developmentTabs(key,values){return `<nav class="dd-tabs" aria-label="Utvecklingsvy">${Object.entries(values).map(([value,label])=>developmentAction(label,`developmentSet('${key}','${value}')`,developmentUI[key]===value?'dd-tab dd-active':'dd-tab')).join('')}</nav>`;}
function developmentFilters(junior=false,medical=false){
 const filterKey=medical?'medicalFilter':developmentKey('filter',junior),queryKey=medical?'medicalQuery':developmentKey('query',junior),positionKey=developmentKey('position',junior);
 const filters=medical?{all:'Alla',attention:'Behöver åtgärd',rehab:'Rehab',high:'Hög belastning'}:junior?{all:'Alla juniorer',u20:'19–20 år',u18:'U18 · högst 18 år',loan:'Utlånade'}:{all:'Hela klubben',senior:'A-laget',junior:'Juniorer',loan:'Utlånade',goalies:'Målvakter',tired:'Hög belastning',rest:'Individuell vila'};
 return `<form class="dv-filters dd-filters" onsubmit="event.preventDefault();developmentSet('${queryKey}',this.elements.query.value)"><label class="dd-search"><span class="dd-sr">Sök spelare</span><input id="development-search" name="query" type="search" placeholder="Sök spelare…" value="${trainingSafe(developmentUI[queryKey])}"></label><button type="submit">Sök</button><label><span class="dd-sr">Urval</span><select id="development-filter" onchange="developmentSet('${filterKey}',this.value)">${Object.entries(filters).map(([v,l])=>`<option value="${v}" ${developmentUI[filterKey]===v?'selected':''}>${l}</option>`).join('')}</select></label>${medical?'':junior?`<label><span class="dd-sr">Position</span><select id="development-position" onchange="developmentSet('${positionKey}',this.value)">${['all','MV','B','C','VF','HF'].map(v=>`<option value="${v}" ${developmentUI[positionKey]===v?'selected':''}>${v==='all'?'Alla positioner':v}</option>`).join('')}</select></label>`:`<label><span class="dd-sr">Utvecklingsperiod</span><select id="development-period" onchange="developmentSet('period',this.value)">${Object.entries(DEVELOPMENT_PERIODS).map(([v,l])=>`<option value="${v}" ${developmentUI.period===v?'selected':''}>${l}</option>`).join('')}</select></label>`}<button type="button" class="dd-reset" onclick="${medical?'developmentMedicalReset()':`developmentReset(${junior})`}">Rensa urval</button></form>`;
}
function developmentSelected(rows,junior=false,medical=false){const id=developmentUI[medical?'medical':junior?'juniorPlayer':'player'];return rows.find(r=>samePlayerId(r.p.id,id))?.p||rows[0]?.p||null;}
function developmentPlayerCell(p,selected,page){return `<th scope="row"><button id="development-player-${trainingSafe(p.id)}" class="dv-player-name" type="button" aria-pressed="${selected?.id===p.id}" onclick="${trainingSafe(`developmentSelect(${JSON.stringify(p.id)},'${page}')`)}">${trainingSafe(p.name)}</button><small>${trainingSafe(p.pos)} · ${p.age} år${p.fictional?' · Akademispelare':''}</small></th>`;}
function developmentTable(junior=false){
 const rows=developmentRows(junior),p=developmentSelected(rows,junior),sort=developmentUI[developmentKey('sort',junior)],direction=developmentUI[developmentKey('direction',junior)];
 const cols=junior?{name:'Spelare',age:'Ålder',environment:'Miljö',potential:'Potential',readiness:'A-lagsberedskap',next:'Nästa steg'}:{name:'Spelare',age:'Ålder',environment:'Lag / miljö',ability:'Nivå',potential:'Potential',change:'Utveckling',ice:'Istid / match',next:'Nästa steg'};
 const table=`<section class="dv-overview dd-roster">${developmentFilters(junior)}<div id="development-scroll" onscroll="developmentUI.${junior?'juniorScroll':'scroll'}=this.scrollTop" class="dv-scroll dd-scroll" tabindex="0" role="region" aria-label="${junior?'Juniorernas':'Truppens'} utveckling"><table class="dd-table ${junior?'dd-junior-table':''}"><caption class="dd-sr">Välj en spelare för uppföljning. Sortera med kolumnrubrikerna.</caption><thead><tr>${Object.entries(cols).map(([k,l])=>`<th scope="col" aria-sort="${sort===k?(direction===1?'ascending':'descending'):'none'}"><button type="button" onclick="developmentSort('${k}',${junior})">${l}<span aria-hidden="true">${sort===k?(direction===1?'↑':'↓'):'↕'}</span></button></th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr data-development-id="${trainingSafe(row.p.id)}" class="${row.p===p?'dd-selected':''}">${developmentPlayerCell(row.p,p,junior?'juniors':'training')}${Object.keys(cols).slice(1).map(k=>{
  let value=trainingSafe(row[k]??'–');
  if(k==='ability'||k==='potential')value=developmentStars(row.p,k==='potential');
  if(k==='change')value=row.delta?`<span class="${row.change>0?'dd-good':row.change<0?'dd-warning':'dd-muted'}">${row.change>0?'↗ +':row.change<0?'↘ ':''}${row.change}</span>`:'<span class="dd-muted" title="Tillräckligt jämförelseunderlag saknas för perioden">–</span>';
  if(k==='ice')value=row.ice==null?'–':`${Math.floor(row.ice/60)}:${String(Math.floor(row.ice%60)).padStart(2,'0')}`;
  return `<td${k==='ice'?` title="${trainingSafe(developmentIce(row.p).label)}"`:''}>${value}</td>`;
 }).join('')}</tr>`).join('')||`<tr><td colspan="${Object.keys(cols).length}" class="dd-empty">Inga spelare matchar urvalet. Rensa urvalet för att visa truppen.</td></tr>`}</tbody></table></div><footer>${rows.length} av ${developmentRoster(junior).length} spelare <span>${junior?'Åldersurval; klubbens juniorlag spelar i J20.':'Utveckling: attributsteg. – betyder att underlag saknas. Istid: aktuell miljö.'}</span></footer></section>`;
 return {table,p,rows};
}
function developmentFollowup(p){
 const e=isOwnPlayer(p)?developmentReviewEvidence(p):null;
 if(e?.plan)return `Uppföljning ${calText(calAdd(e.plan.date,28))} · ${e.trained} träningspass registrerade`;
 if(p.academy?.path==='guest'){const a=state.juniors?.aTraining?.[String(p.id)];return `${a?managerJ20TrainingSessions(a):0} genomförda A-lagspass · följs efter nästa pass`;}
 return 'Ingen daterad individuell uppföljning startad';
}
function developmentInspector(p,junior=false,medical=false){
 if(!p)return '<section class="dd-inspector dd-empty"><h2>Ingen spelare vald</h2><p>Ändra urvalet och välj en spelare i tabellen.</p></section>';
 const id=JSON.stringify(p.id),delta=developmentPeriodChange(p),labels=p.pos==='MV'?GOALIE_ATTRIBUTES:SKATER_ATTRIBUTES,changes=(delta?.changes||[]).slice().sort((a,b)=>Math.abs(b.change)-Math.abs(a.change)).slice(0,3);
 const background=medical?`<h3>Medicinsk bedömning</h3><p>${trainingSafe(p.health?.injury?.name||'Ingen registrerad skada')}</p><small>${developmentMedicalForecast(p)}</small><small>Risk: ${medicalRiskLabel(p)} · Ork ${Math.round(100-(p.fatigue||0))} %</small>`:junior?`<h3>Stabens bedömning</h3><p>${trainingSafe(managerJ20Readiness(p).level)}</p><small>${trainingSafe(developmentEnvironment(p))} · ${developmentIce(p).games||0} registrerade matcher i aktuell miljö</small><small>Bedömning: ${trainingSafe(juniorAssessment(p).staff.name)} · ${juniorAssessment(p).confidence.toLowerCase()} säkerhet</small>`:`<h3>${trainingSafe(DEVELOPMENT_PERIODS[developmentUI.period]||DEVELOPMENT_PERIODS.baseline)}</h3><p>${changes.length?changes.map(r=>`<span class="${r.change>0?'dd-good':'dd-warning'}">${trainingSafe(labels[r.key]||r.key)} ${r.change>0?'+':''}${r.change}</span>`).join(' · '):delta?'Inga hela attributförändringar registrerade.':'Tillräckligt jämförelseunderlag saknas.'}</p><small>${delta?`+${delta.up} ökade / −${delta.down} minskade attributsteg. Potential är stabens uppskattning.`:'Välj uppföljningens start eller följ spelaren tills en hel period har registrerats.'}</small>`;
 const guest=junior&&!isOwnPlayer(p)&&p.academy.path==='junior'&&!p.academy.loan;
 return `<section class="dd-inspector" aria-label="Vald spelare"><div class="dd-identity">${squadPortrait(p)}<div><small>${p.pos} · ${p.age} år · ${trainingSafe(developmentEnvironment(p))}</small><h2>${trainingSafe(p.name)}</h2>${medical?`<p class="${medicalReady(p)?'dd-good':'dd-warning'}">${medicalStatus(p)}</p>`:`<div class="dd-ratings"><span>Nivå ${developmentStars(p)}</span><span>Potential ${developmentStars(p,true)}</span></div>`}</div></div><div class="dd-background">${background}</div><div class="dd-next"><h3>${medical?'Plan & nästa bedömning':junior?'Nästa steg':'Individuell plan'}</h3><p>${trainingSafe(medical?developmentMedicalFollowup(p):junior?developmentNext(p):(developmentRolePlan(p)?.name||p.developmentFocus||'Balanserad')+' · '+developmentLoad(p))}</p>${!medical&&!junior&&developmentRoleProgress(p)?`<small>${trainingSafe(developmentRoleProgress(p).plan.target)} · rollattribut ${developmentRoleProgress(p).average.toFixed(1)}/20 · +${developmentRoleProgress(p).changes} steg sedan planen startade</small>`:''}<small>${trainingSafe(medical?developmentLoad(p):developmentFollowup(p))}</small><div class="dd-actions">${medical?developmentAction(p.health?.injury?'Rehab & återgång':'Se över belastning',`developmentMedicalOpen(${id})`,'dd-primary'):guest?developmentAction('Bjud in till A-träning',`juniorSet(${JSON.stringify(id)},'path','guest')`,'dd-primary',Boolean(state.live&&!state.live.finished)||!medicalCanTrain(p)):developmentAction('Ändra utvecklingsplan',`developmentOpenPlayer(${JSON.stringify(id)},'${junior?'juniors':'training'}')`,'dd-primary')}${guest?developmentAction('Utvecklingsplan',`developmentOpenPlayer(${JSON.stringify(id)},'juniors')`):developmentAction('Spelarprofil →',`selectPlayer(${JSON.stringify(id)})`)}</div></div></section>`;
}
function developmentJuniorAside(players){
 const prospects=players.filter(p=>!isOwnPlayer(p)&&!p.academy.loan).map(p=>({p,ready:managerJ20Readiness(p)}));
 const candidates=prospects.filter(r=>r.ready.level!=='Fortsatt J20-utveckling').sort((a,b)=>Number(b.ready.need?.shortage>0)-Number(a.ready.need?.shortage>0)||a.p.name.localeCompare(b.p.name,'sv')).slice(0,3);
 return `<aside class="dd-aside"><header><h2>Stabens rekommendationer</h2><small>Profil, matchunderlag och A-lagets behov</small></header><div class="dd-aside-content">${candidates.map(({p,ready})=>`<article><small>${trainingSafe(ready.level)}</small><h3>${trainingSafe(p.name)}</h3><p>${trainingSafe(ready.detail)}</p>${developmentAction('Följ spelaren →',`developmentSelect(${JSON.stringify(p.id)},'juniors')`)}</article>`).join('')||'<div class="dd-calm"><span>↗</span><h3>Bygg underlag i J20</h3><p>Ingen tillgänglig bedömning pekar ut en A-lagskandidat just nu. Följ matchtid och utveckling innan nästa steg.</p></div>'}</div><footer>Stjärnorna är bedömningar. A-träning ändrar träningsmiljön; spelaren fortsätter spela J20.</footer></aside>`;
}
function developmentJuniorPath(p){
 if(!p)return '';
 const need=managerJ20SeniorNeed(p),plan=managerJ20PathPlan(p),path=plan?managerJ20PathStatus(p,plan):null;
 return `<div class="dd-path"><strong>Vägen till A-laget</strong><span><small>A-lagets behov</small>${need.shortage?`${need.shortage} spelare saknas i positionsgruppen`:'Ingen numerär brist i positionsgruppen'}</span><span><small>Vald spelare</small>${trainingSafe(p.name)} · ${trainingSafe(developmentEnvironment(p))}</span><span><small>Nästa uppföljning</small>${trainingSafe(path?.next||developmentNext(p))}</span></div>`;
}
function developmentWorkspaceView(){
 ensureTrainingData();ensureJuniors();const all=developmentRoster(),{table,p}=developmentTable(),detail=all.find(p=>samePlayerId(p.id,developmentUI.player));
 return `<section class="development-workspace development-desk">${developmentHeader('Spelarutveckling','Följ spelarnas framsteg och ge varje spelare rätt nästa steg.',[['Spelare',all.length],['Positiv utveckling',all.filter(p=>(developmentPeriodChange(p)?.net??0)>0).length],['Behöver belastningsöversyn',all.filter(p=>p.fatigue>=55||medicalRiskLabel(p)==='Hög').length]])}<div class="dd-toolbar">${developmentTabs('tab',{players:'Spelaröversikt',history:'Genomförda pass'})}<button id="development-delegation" class="dd-link" onclick="developmentDrawer('senior')">Lagträning & delegering →</button></div>${developmentUI.tab==='history'?`<div class="dd-workarea">${developmentHistory()}</div>`:`<div class="dd-main">${table}</div><div class="dd-advice"><strong>Tränarens råd</strong><span>${trainingSafe(trainingAdvice())}</span>${deskLink('Kalender',{page:'calendar'})}</div>${developmentInspector(p)}`}${developmentUI.detail?developmentDialog('Individuell utvecklingsplan',developmentPlayerDetail(detail)):developmentUI.drawer?developmentDialog('Lagträning & delegering',trainingResponsibilityView()):''}</section>`;
}
function developmentJuniorsView(){
 ensureJuniors();const s=state.juniors,all=juniorPlayers(),{table,p}=developmentTable(true),detail=juniorById(s.selected),tab=developmentUI.juniorTab;
 const extra=tab==='history'?developmentJuniorHistory():tab==='lineup'?juniorLineupView():tab==='calendar'?juniorCalendarView():tab==='league'?juniorWorldView():'';
 return `<section class="development-workspace development-desk dd-juniors">${developmentHeader('Juniorer','Rätt miljö, meningsfull istid och en tydlig väg mot A-laget.',[['Talanger',all.length],['Tränar med A-laget',all.filter(p=>p.academy.path==='guest').length],['Utvecklingslån',all.filter(p=>p.academy.loan).length]])}<div class="dd-toolbar">${developmentTabs('juniorTab',{players:'Spelaröversikt',lineup:'Kedjor',calendar:'Kalender',league:'Tabell & statistik',history:'Matcher & rapporter'})}<button id="development-delegation" class="dd-link" onclick="developmentDrawer('junior')">Delegering →</button></div>${s.message?`<p class="dd-notice" role="status">${trainingSafe(s.message)}</p>`:''}${tab==='players'?`<div class="dd-main dd-split">${table}${developmentJuniorAside(all)}</div>${developmentJuniorPath(p)}${developmentInspector(p,true)}`:`<div class="dd-workarea">${extra}</div>`}${developmentUI.juniorDetail?developmentDialog('Juniorens utvecklingsplan',developmentPlayerDetail(detail,true)):developmentUI.drawer?developmentDialog('Juniorträning & delegering',assistantTrainingView('junior')):''}</section>`;
}
function developmentMedicalRoster(){return developmentRoster().filter(p=>isOwnPlayer(p)||(state.juniors?.roster||[]).includes(p)&&!p.academy?.loan);}
function developmentMedicalForecast(p){
 const i=p.health?.injury;
 return !i?'Ingen rehabplan behövs.':i.remaining>0?`Cirka ${Math.max(1,i.remaining-1)}–${i.remaining+2} återhämtningsdagar till återgångsträning.`:`Matchberedskap ${i.readiness} %. ${isOwnPlayer(p)?'Bedöm återgång och matchbelastning.':'Fortsatt återgångsträning tills spelaren är återställd.'}`;
}
function developmentMedicalFollowup(p){return p.health?.injury?'Nästa återhämtningsdag':p.trainingReturn?.club===managerClub()?`Planerad återgång ${calText(p.trainingReturn.date)}`:medicalRiskLabel(p)==='Hög'||p.fatigue>=55?'Nästa lagpass':'Vid förändrad status';}
function developmentMedicalRows(){
 const ui=developmentUI,q=ui.medicalQuery.trim().toLocaleLowerCase('sv'),f=ui.medicalFilter;
 return developmentMedicalRoster().filter(p=>p.name.toLocaleLowerCase('sv').includes(q)&&(f==='all'||f==='rehab'&&p.health?.injury||f==='high'&&(medicalRiskLabel(p)==='Hög'||p.fatigue>=55)||f==='attention'&&(p.health?.injury||medicalRiskLabel(p)==='Hög'||p.fatigue>=55))).map(p=>({p,name:p.name,status:medicalStatus(p),load:p.health?.load||0,training:developmentLoad(p),followup:developmentMedicalFollowup(p)})).sort((a,b)=>{
  const k=ui.medicalSort,order=typeof a[k]==='number'?a[k]-b[k]:String(a[k]).localeCompare(String(b[k]),'sv');return order*ui.medicalDirection||a.name.localeCompare(b.name,'sv');
 });
}
function developmentMedicalSort(key){if(!['name','status','load','training','followup'].includes(key))return;developmentRememberView();developmentUI.medicalDirection=developmentUI.medicalSort===key?-developmentUI.medicalDirection:1;developmentUI.medicalSort=key;render();queueInterfaceSave();}
function developmentMedicalReset(){Object.assign(developmentUI,{medicalQuery:'',medicalFilter:'all',medicalSort:'status',medicalDirection:1,medicalScroll:0});render();queueInterfaceSave();}
function developmentMedicalAside(ps){
 const staff=state.medical.staff,attention=ps.filter(p=>p.health?.injury||medicalRiskLabel(p)==='Hög'||p.fatigue>=55).sort((a,b)=>Number(Boolean(b.health?.injury))-Number(Boolean(a.health?.injury))||medicalRisk(b)-medicalRisk(a)).slice(0,3);
 return `<aside class="dd-aside"><header><h2>Medicinskt team</h2><small>Rehabilitering & återgång till spel</small></header><div class="dd-medical-staff"><span>✚</span><div><strong>${trainingSafe(staff.doctor)}</strong><small>Medicinsk bedömning</small><strong>${trainingSafe(staff.physio)}</strong><small>Rehab & belastning</small></div></div><div class="dd-aside-content"><h3>Behöver uppmärksamhet</h3>${attention.map(p=>`<article><h3>${trainingSafe(p.name)}</h3><p>${trainingSafe(p.health?.injury?.name||'Hög belastningsrisk')} · ${Math.round(100-(p.fatigue||0))} % ork.</p>${developmentAction('Visa bedömning →',`developmentSelect(${JSON.stringify(p.id)},'medical')`)}</article>`).join('')||'<div class="dd-calm"><span>✓</span><h3>Lugnt i rehabrummet</h3><p>Inga skador eller hög belastning registrerade. Fortsätt följa återhämtningen mellan passen.</p></div>'}</div><footer>${deskLink('Se över laguttagningen',{page:'lines'})}</footer></aside>`;
}
function developmentMedicalProgress(p){
 if(!p?.health?.injury)return `<div class="dd-return"><strong>Vägen tillbaka</strong><span>${p?'Ingen pågående rehabilitering för '+trainingSafe(p.name)+'.':'Välj en spelare för att följa återgången.'}</span></div>`;
 const i=p?.health?.injury,stage=!p?-1:!i?3:i.remaining>0?0:p.health.clearance==='rest'?1:2;
 return `<div class="dd-return"><strong>Vägen tillbaka</strong>${['Rehabilitering','Återgångsträning','Bedömd comeback','Återställd'].map((label,n)=>`<span class="${n===stage?'dd-current':n<stage?'dd-done':''}" ${n===stage?'aria-current="step"':''}><i>${n<stage?'✓':n+1}</i>${label}</span>`).join('')}</div>`;
}
function developmentMedicalView(){
 ensureTrainingData();ensureJuniors();ensureMedical();const ps=developmentMedicalRoster(),s=state.medical,rows=developmentMedicalRows(),p=developmentSelected(rows,false,true),detail=ps.find(p=>samePlayerId(p.id,developmentUI.medical))||p;
 const history=`<div class="dd-workarea"><section class="dv-panel"><h2>Medicinska rapporter</h2>${s.history.map(e=>`<details class="dv-report"><summary>Återhämtningsdag ${e.day} · ${e.playerId!=null?playerReference(e.playerId,e.title):trainingSafe(e.title)}</summary><p>${trainingSafe(e.body)}</p></details>`).join('')||'<p>Inga medicinska rapporter ännu.</p>'}</section></div>`;
 const table=`<section class="dv-overview dd-roster">${developmentFilters(false,true)}<div id="development-scroll" onscroll="developmentUI.medicalScroll=this.scrollTop" class="dv-scroll dd-scroll" tabindex="0" role="region" aria-label="Medicinsk spelarstatus"><table class="dd-table dd-medical-table"><thead><tr>${Object.entries({name:'Spelare',status:'Status',load:'Belastning',training:'Träning',followup:'Nästa bedömning'}).map(([k,l])=>`<th scope="col" aria-sort="${developmentUI.medicalSort===k?(developmentUI.medicalDirection===1?'ascending':'descending'):'none'}"><button type="button" onclick="developmentMedicalSort('${k}')">${l}<span aria-hidden="true">${developmentUI.medicalSort===k?(developmentUI.medicalDirection===1?'↑':'↓'):'↕'}</span></button></th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr data-development-id="${trainingSafe(r.p.id)}" class="${r.p===p?'dd-selected':''}">${developmentPlayerCell(r.p,p,'medical')}<td><span class="${!medicalReady(r.p)?'dd-warning':'dd-good'}">${trainingSafe(r.status)}</span></td><td><div class="dd-load"><i style="--load:${Math.max(0,Math.min(100,r.load))}%"></i>${Math.round(r.load)}/100</div><small>Risk: ${medicalRiskLabel(r.p)}</small></td><td>${trainingSafe(r.training)}</td><td>${trainingSafe(r.followup)}</td></tr>`).join('')||'<tr><td colspan="5" class="dd-empty">Inga spelare matchar urvalet.</td></tr>'}</tbody></table></div><footer>${rows.length} av ${ps.length} spelare <span>A-lag och hemmavarande juniorer. Ork, belastning och risk är olika mått.</span></footer></section>`;
 return `<section class="development-workspace development-desk dd-medical">${developmentHeader('Medicinskt team','Följ tillgänglighet, belastning och en hållbar återgång till spel.',[['Matchklara',ps.filter(medicalReady).length+' / '+ps.length],['Skada / återgång',ps.filter(p=>p.health?.injury).length],['Hög belastning',ps.filter(p=>medicalRiskLabel(p)==='Hög'||p.fatigue>=55).length]])}${developmentTabs('medicalTab',{cases:'Spelarstatus',history:'Medicinska rapporter'})}${s.message?`<p class="dd-notice" role="status">${trainingSafe(s.message)}</p>`:''}${state.live&&!state.live.finished&&!medicalMatchReady()?'<div class="dd-notice">För få tillgängliga spelare för att fortsätta matchen. <button onclick="medicalConcede()">Avbryt matchen – registrera förlust</button></div>':''}${developmentUI.medicalTab==='history'?history:`<div class="dd-main dd-split">${table}${developmentMedicalAside(ps)}</div>${developmentMedicalProgress(p)}${developmentInspector(p,false,true)}`}${developmentUI.medicalDetail&&detail?developmentDialog('Rehab & belastning · '+detail.name,`${state.live&&!state.live.finished?'<p class="dd-notice">Pågående match: ändringar görs när matchen är avslutad.</p>':''}<fieldset class="dd-medical-decisions" ${state.live&&!state.live.finished?'disabled':''}>${medicalPlayerPanel(detail)}</fieldset><p>${trainingSafe(developmentMedicalFollowup(detail))}. Prognosen följer karriärens återhämtningsdagar.</p>${developmentAction('Ändra individuell träningsbelastning →',`developmentUI.medicalDetail=false;developmentOpenPlan(${JSON.stringify(detail.id)})`)}`):''}</section>`;
}
