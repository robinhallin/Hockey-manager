"use strict";
// Stable fictional game attributes; these are not claims about real players.
const SKATER_ATTRIBUTES = {skating:'Skridskoåkning',acceleration:'Acceleration',shooting:'Avslut',passing:'Passningar',puckControl:'Puckkontroll',vision:'Spelförståelse',positioning:'Positionering',checking:'Tacklingar',faceoffs:'Tekningar',stamina:'Uthållighet',strength:'Styrka',workRate:'Arbetskapacitet',decisions:'Beslut',composure:'Kyla',discipline:'Disciplin'};
const GOALIE_ATTRIBUTES = {reflexes:'Reflexer',positioning:'Positionering',reboundControl:'Returkontroll',handling:'Plock & stöt',movement:'Sidledsförflyttning',composure:'Kyla'};
const PLAYER_ROLES = {
  'Målskytt':{shooting:4,composure:2,skating:1,puckControl:1,positioning:1},
  'Spelfördelare':{passing:4,vision:3,decisions:2,puckControl:1},
  'Tvåvägsforward':{positioning:3,workRate:3,decisions:2,faceoffs:2,passing:1},
  'Checkingforward':{checking:3,workRate:3,strength:2,discipline:2,stamina:2},
  'Offensiv back':{passing:3,vision:3,skating:2,shooting:2,decisions:1},
  'Defensiv back':{positioning:4,checking:2,decisions:2,discipline:2,strength:1},
  'Målvakt':{reflexes:3,positioning:3,reboundControl:2,handling:2,movement:2,composure:1}
};
function attrClamp(n,lo=1,hi=20){return Math.max(lo,Math.min(hi,n));}
function attrSeed(text){let h=2166136261;for(const c of String(text))h=Math.imul(h^c.charCodeAt(0),16777619);return (h>>>0)/4294967296;}
function ensurePlayerAttributes(p){
  if(!p.attributes)p.attributes={};
  const seed=key=>attrSeed(`${p.id}:${p.name}:${key}`);
  const fields=p.pos==='MV'?GOALIE_ATTRIBUTES:SKATER_ATTRIBUTES;
  let archetype; // Only derive generated defaults when an attribute is actually missing.
  for(const key of Object.keys(fields)){
    if(Number.isFinite(p.attributes[key]))continue;
    archetype??=Math.floor(seed('archetype')*3);
    const source=['shooting','composure'].includes(key)?p.shooting:['passing','vision','puckControl'].includes(key)?p.passing:['positioning','checking','discipline'].includes(key)?p.defense:p.physical;
    let bias=0;
    if(p.pos==='MV')bias=seed('goalie:'+key)*4-2;
    else if(archetype===0)bias=['shooting','composure','acceleration'].includes(key)?2:['positioning','checking'].includes(key)?-2:0;
    else if(archetype===1)bias=['passing','vision','puckControl'].includes(key)?2:['strength','checking'].includes(key)?-2:0;
    else bias=['workRate','positioning','checking','stamina'].includes(key)?2:['shooting','puckControl'].includes(key)?-2:0;
    if(key==='faceoffs')bias+=p.pos==='C'?2:-3;
    p.attributes[key]=attrClamp(Math.round(((source||75)-45)/2.5+(seed(key)-.5)*5+bias));
  }
  if(!Number.isFinite(p.attributeGrowth))p.attributeGrowth=Math.max(0,((p.potential||p.overall)-p.overall)/2.5)+(p.age<=23?seed('growth')*2:0);
  return p.attributes;
}
function ensureAssessmentData(){
  const migrate=state.assessmentVersion!==2;
  state.assessmentVersion=2;
  if(migrate&&Array.isArray(state.news))state.news=state.news.map(n=>typeof n==='string'?n.replace(/har utvecklats och är nu \d+ OVR\./g,'har utvecklat sina attribut genom träningen.'):n);
  if(!state.staff)state.staff=[
    {id:'assistant',name:'Assisterande tränare',ability:15,potential:11,specialty:'Tvåvägsforward'},
    {id:'scout',name:'Chefsscout',ability:13,potential:16,specialty:'Spelfördelare'},
    {id:'goalie',name:'Målvaktstränare',ability:17,potential:12,specialty:'Målvakt'}
  ];
  if(!state.scoutReports)state.scoutReports={};
  if(migrate){
    for(const roster of Object.values(state.clubRosters||{}))for(const p of roster)ensurePlayerAttributes(p);
    // Freeze the legacy displayed basis without inventing an observation date.
    for(const [id,r] of Object.entries(state.scoutReports)){const p=findPlayerAnywhere(id);if(p&&r.visits&&!r.snapshot)Object.assign(r,{snapshot:{...ensurePlayerAttributes(p)},snapshotDate:state.calendar?.date,origin:'legacy'});}
  }
}
function roleWeights(p){return p.pos==='MV'?['Målvakt']:p.pos==='B'?['Offensiv back','Defensiv back']:['Målskytt','Spelfördelare','Tvåvägsforward','Checkingforward'];}
function attributeWeighted(values,weights){let sum=0,total=0;for(const [key,w] of Object.entries(weights)){sum+=(values[key]||10)*w;total+=w;}return sum/total;}
function isOwnPlayer(p){return managerRoster().some(x=>samePlayerId(x.id,p.id));}
function scoutReportAge(r,date=state.calendar?.date){const observed=r?.lastObserved||r?.snapshotDate;return observed&&date?Math.max(0,calGap(observed,date)):0;}
function scoutNeedsObservation(p,date=state.calendar?.date){const r=state.scoutReports[String(p.id)];return !isOwnPlayer(p)&&((r?.visits||0)<3||r?.origin==='legacy'||!r?.snapshot||scoutReportAge(r,date)>=60);}
function scoutRemember(p){return {visits:3,lastObserved:state.calendar.date,snapshotDate:state.calendar.date,snapshot:{...ensurePlayerAttributes(p)},origin:'club'};}
function scoutFreshnessView(p){
 if(isOwnPlayer(p))return '';
 const r=state.scoutReports[String(p.id)];if(!r?.visits)return '<p>Ingen egen observation ännu. Bedömningen är osäker.</p>';
 if(r.origin==='legacy'||!r.snapshot)return '<p>Äldre bedömningsunderlag. Ingen ny observation har gjorts vid uppdateringen; beställ en rapport för aktuell kunskap.</p>';
 const age=scoutReportAge(r);
 return `<p>${r.origin==='club'?'Senast känd i den egna klubben':'Senast observerad'} ${calText(r.lastObserved||r.snapshotDate)} · ${age} dagar sedan. ${age>=60?'Underlaget har åldrats. Osäkerheten ökar; en ny observation kan uppdatera det.':'Attributbedömningen bygger på detta daterade underlag.'}</p>`;
}
function playerAssessment(p){
  ensureAssessmentData();
  const staff=state.staff.find(x=>x.id===state.assessorId)||state.staff[0];
  const own=isOwnPlayer(p),report=state.scoutReports[String(p.id)];
  const visits=report?.visits||0;
  const baseFamiliarity=own?.9:Math.min(.9,.12+visits*.26);
  const familiarity=own?baseFamiliarity:Math.max(.12,baseFamiliarity-Math.min(.5,Math.max(0,scoutReportAge(report)-60)/360));
  const specialized=roleWeights(p).includes(staff.specialty);
  const ability=attrClamp(staff.ability+(specialized?2:0));
  const uncertainty=own?0:(1-familiarity)*4+(20-ability)*.08*(1-familiarity);
  const observationUncertainty=own?0:(1-baseFamiliarity)*4+(20-ability)*.08*(1-baseFamiliarity);
  const attributes=own?ensurePlayerAttributes(p):report?.snapshot||ensurePlayerAttributes(p),estimated={};
  for(const key of Object.keys(attributes))estimated[key]=attrClamp(attributes[key]+(attrSeed(`${p.id}:${staff.personId||staff.id}:${key}`)-.5)*2*observationUncertainty);
  const roles=roleWeights(p).map(name=>({name,value:attributeWeighted(estimated,PLAYER_ROLES[name])})).sort((a,b)=>b.value-a.value);
  const peers=managerRoster().filter(x=>x.pos==='MV'?(p.pos==='MV'):(p.pos!=='MV'));
  const baseline=peers.reduce((sum,x)=>sum+Math.max(...roleWeights(x).map(name=>attributeWeighted(ensurePlayerAttributes(x),PLAYER_ROLES[name]))),0)/Math.max(1,peers.length);
  const stars=value=>Math.round(attrClamp(2.5+(value-baseline)*.65,0,5)*2)/2;
  const judgment=(20-ability)*.045+.12;
  const judged=roles[0].value+(attrSeed(`${p.id}:${staff.personId||staff.id}:judgment`)-.5)*2*judgment;
  const potentialError=(p.age<=23?1.6:.8)+(20-staff.potential)*.1+(1-familiarity)*2;
  const potentialEstimate=Math.max(...roleWeights(p).map(role=>attributeWeighted(ensureDevelopment(p).ceiling,PLAYER_ROLES[role])))+(attrSeed(`${p.id}:${staff.personId||staff.id}:potential`)-.5)*2*potentialError;
  return {staff,own,visits,familiarity,estimated,uncertainty,roles,current:stars(judged),low:stars(judged-uncertainty-judgment),high:stars(judged+uncertainty+judgment),potentialLow:stars(potentialEstimate-potentialError),potentialHigh:stars(potentialEstimate+potentialError)};
}
function starsText(value){const n=Math.max(0,Math.min(5,Math.round(value)));return '★'.repeat(n)+'☆'.repeat(5-n);}
function starRatingHTML(low,high,potential=false,assessor='Personalens bedömning'){
 const lo=attrClamp(Number(low)||0,0,5),hi=Math.max(lo,attrClamp(Number(high)||0,0,5));
 const label=`${potential?'Potential':'Förmåga'}: ${lo===hi?lo:lo+'–'+hi} av 5 stjärnor. ${assessor}. Ljusa stjärnor visar osäkerheten.`;
 return `<span class="assessment-stars star-rating ${potential?'star-potential':'star-ability'}" role="img" aria-label="${trainingSafe(label)}" title="${trainingSafe(label)}">${Array.from({length:5},(_,i)=>`<span class="rating-star" aria-hidden="true"><span class="star-empty">☆</span><span class="star-possible" style="width:${Math.max(0,Math.min(1,hi-i))*100}%">★</span><span class="star-certain" style="width:${Math.max(0,Math.min(1,lo-i))*100}%">★</span></span>`).join('')}</span>`;
}
function assessmentBadge(p,potential=false){const r=playerAssessment(p);return starRatingHTML(potential?r.potentialLow:r.low,potential?r.potentialHigh:r.high,potential,r.staff.name);}
function assessmentShort(p){const r=playerAssessment(p);return `${starsText(r.current)} · ${r.roles[0].name}`;}
function attributeInterval(p,key,r){const center=r.estimated[key],spread=r.uncertainty;const lo=attrClamp(Math.floor(center-spread)),hi=attrClamp(Math.ceil(center+spread));return lo===hi?String(lo):`${lo}–${hi}`;}
function assessmentPanel(p){
  const r=playerAssessment(p),fields=p.pos==='MV'?GOALIE_ATTRIBUTES:SKATER_ATTRIBUTES;
  const ordered=Object.keys(fields).sort((a,b)=>r.estimated[b]-r.estimated[a]);
  const pending=state.scoutReports[String(p.id)]?.dueDate||state.recruitment?.missions.find(m=>m.status==='active'&&m.players.some(id=>samePlayerId(id,p.id)))?.nextDate;
  return `<section class="assessment-panel"><div class="assessment-heading"><div><span class="panel-label">PERSONALENS RAPPORT</span><h2>Så kan ${p.name.split(' ')[0]} användas</h2></div><label>Bedömare<select onchange="state.assessorId=this.value;save();render()">${state.staff.map(s=>`<option value="${s.id}" ${s.id===r.staff.id?'selected':''}>${s.name}</option>`).join('')}</select></label></div>
  <div class="assessment-summary"><div><small>Nuvarande förmåga</small>${assessmentBadge(p)}</div><div><small>Potential</small>${assessmentBadge(p,true)}</div><div><small>Kunskap om spelaren</small><strong>${Math.round(r.familiarity*100)} % · ${r.own?'Tränarteamet':r.familiarity>.8?'Hög':r.familiarity>.4?'Medel':'Låg'}</strong></div></div>
  <p>${r.staff.name} ser främst en <b>${r.roles[0].name.toLowerCase()}</b>. Styrkor: ${fields[ordered[0]].toLowerCase()} och ${fields[ordered[1]].toLowerCase()}. Svagare sida: ${fields[ordered.at(-1)].toLowerCase()}.</p>
  <p class="muted">Guld visar förmåga, blått visar potential. Fyllda stjärnor är den säkrare delen av bedömningen; ljusa stjärnor visar möjlig nivå. Båda jämförs med din trupp. Attribut visas på skalan 1–20.</p>
  <div class="attribute-grid">${Object.keys(fields).map(key=>`<div class="attribute-item"><span>${fields[key]}</span><strong>${attributeInterval(p,key,r)}</strong><div class="attribute-track"><i style="width:${r.estimated[key]*5}%"></i></div></div>`).join('')}</div>
  ${scoutFreshnessView(p)}${haResearchPanel(p)}
  <div class="role-reports">${r.roles.map(role=>`<span><b>${role.name}</b> · ${role.value>=14?'Tydliga styrkor':role.value>=11?'Användbar profil':'Behöver utvecklas'}</span>`).join('')}</div>
  ${!r.own?`<div class="player-actions"><button class="btn" onclick="requestScoutReport('${p.id}')" ${pending||!scoutNeedsObservation(p)?'disabled':''}>${pending?`Nästa rapport ${calText(pending)}`:!scoutNeedsObservation(p)?'Aktuell rapport':`Scouta · ${money(Math.round(clubMissionFee()/3))}`}</button><span>${r.visits} av 3 observationer · rapport efter sju dagar</span></div>`:'<p class="muted">Daglig träning ger exakta attribut. Stjärnorna är fortfarande bedömarens värdering relativt truppen; potentialen är osäker.</p>'}</section>`;
}
// One observation per player and date window, shared by individual and group assignments.
function scoutPending(id){return Boolean(state.scoutReports[String(id)]?.dueDate||state.recruitment?.missions.some(m=>m.status==='active'&&m.players.some(x=>samePlayerId(x,id))));}
function scoutActiveCount(){return (state.recruitment?.missions.filter(m=>m.status==='active').length||0)+Object.values(state.scoutReports).filter(r=>r.dueDate&&!r.missionId).length;}
function requestScoutReport(id,stay=false){
 ensureAssessmentData();ensureCalendar();const p=findPlayerAnywhere(id);if(!p||isOwnPlayer(p)||!managerCanPlay()||loanLocked())return;
 const r=state.scoutReports[String(id)]||(state.scoutReports[String(id)]={visits:0});
 if(scoutPending(id)||!scoutNeedsObservation(p))return;
 const fee=Math.round(clubMissionFee()/3);
 if(scoutActiveCount()>=clubMissionLimit())return recruitMessage('Alla scouter är upptagna. Avsluta ett uppdrag eller invänta en rapport i Scoutcentralen.');
 if(state.money-clubForecast().reserved<fee)return recruitMessage('Klubbkassan räcker inte till observationen.');
 clubPost('scouting',-fee,'Observation · '+p.name);r.dueDate=calAdd(state.calendar.date,7);r.started=state.calendar.date;delete r.dueRound;
 if(!stay)state.page='scouting';save();render();
}
function scoutObserve(id,date){
 const p=findPlayerAnywhere(id),r=state.scoutReports[String(id)]||(state.scoutReports[String(id)]={visits:0});
 if(!p||isOwnPlayer(p)||!scoutNeedsObservation(p,date)||r.lastObserved&&calGap(r.lastObserved,date)<7)return false;
 const refresh=r.visits>=3;
 r.visits=Math.min(3,(r.visits||0)+1);r.lastObserved=date;r.snapshotDate=date;r.snapshot={...ensurePlayerAttributes(p)};r.origin='observation';delete r.dueRound;
 managerMessage(`scout:${id}:${date}`,`${refresh?'Uppdaterad scoutrapport':'Scoutrapport'}: ${p.name}`,`${refresh?'Ny observation uppdaterar det tidigare underlaget.':`Observation ${r.visits} av 3.`} Kunskap ${Math.round(playerAssessment(p).familiarity*100)} %. Läs rollanalysen i Scoutcentralen.`,'Chefsscout',{link:'scouting'});return true;
}
function scoutDay(){
 if(!state.calendar||!state.recruitment)return;const date=state.calendar.date;
 for(const [id,r] of Object.entries(state.scoutReports)){
  if(r.dueRound&&!r.dueDate){r.dueDate=calAdd(date,7);delete r.dueRound;}
  if(r.dueDate&&r.dueDate<=date){scoutObserve(id,date);delete r.dueDate;}
 }
 for(const m of state.recruitment.missions.filter(m=>m.status==='active')){
  if(!m.nextDate)m.nextDate=calAdd(date,7);
  if(m.nextDate>date)continue;
  m.players.forEach(id=>scoutObserve(id,date));m.observations++;m.nextDate=calAdd(date,7);
  if(m.observations>=3){m.status='completed';m.completedDate=date;}
 }
}
function advanceScoutReports(){scoutDay();}
let scoutUI={query:''};
function scoutingView(){return recruitmentHubView("missions");}
function legacyScoutingView(){
 ensureAssessmentData();ensureRecruitment();
 const reports=Object.entries(state.scoutReports).map(([id,r])=>({p:findPlayerAnywhere(id),r})).filter(x=>x.p&&!isOwnPlayer(x.p));
 const pending=reports.filter(x=>x.r.dueDate),done=reports.filter(x=>x.r.visits>0&&(!scoutUI.query||`${x.p.name} ${getPlayerClub(x.p.id)}`.toLocaleLowerCase('sv').includes(scoutUI.query.toLocaleLowerCase('sv')))).sort((a,b)=>(b.r.lastObserved||'').localeCompare(a.r.lastObserved||''));
 const missions=state.recruitment.missions.filter(m=>m.status==='active');
 return `<section class="scout-central"><header class="daily-heading"><div><span class="career-eyebrow">FRÅN BEHOV TILL BESLUT</span><h1>Scoutcentralen</h1><p>Ditt lag känner vi. Nästa värvning lär vi känna, en observation i taget.</p></div><button class="btn" onclick="deskNavigate('transfers','search')">Hitta spelare →</button></header>
 <div class="scout-flow"><article><small>01 · VAD SAKNAS?</small><h2>Truppens behov</h2><p>Egna attribut är exakta. Leta efter egenskaper som kompletterar laget.</p>${recruitmentNeeds().slice(0,3).map(n=>`<button class="scout-need" onclick="recruitSelectProfile('${n.name}')"><b>${n.name}</b><span>${n.priority} →</span></button>`).join('')}</article><article><small>02 · VEM FÖLJER VI?</small><h2>${scoutActiveCount()} / ${clubMissionLimit()} uppdrag</h2><p>Sju dagar per observation. Tre färska observationer ger cirka 90 % kunskap. Efter 60 dagar kan du beställa en uppdatering.</p>${pending.map(({p,r})=>`<div class="scout-queue"><b>${trainingSafe(p.name)}</b><span>${calText(r.dueDate)} · ${r.visits>=3?'uppdatering':'observation '+(r.visits+1)+'/3'}</span></div>`).join('')}${missions.map(m=>`<div class="scout-queue"><b>${m.filters.profile==='ALL'?'Bred sökning':m.filters.profile}</b><span>${m.nextDate?calText(m.nextDate):'Nästa kalendervecka'} · ${m.observations}/3 klara</span><small>${m.players.map(id=>trainingSafe(findPlayerAnywhere(id)?.name||'Lämnat marknaden')).join(' · ')}</small><button class="mc-text-button" onclick="cancelScoutMission(${m.id})">Avsluta uppdrag</button></div>`).join('')}${!pending.length&&!missions.length?'<p>Inga aktiva uppdrag. Öppna en spelare eller scouta tre kandidater från sökningen.</p>':''}</article></div>
 <header class="scout-report-heading"><div><small>03 · DITT BESLUTSUNDERLAG</small><h2>Färdiga observationer</h2></div><button class="btn secondary" onclick="deskNavigate('transfers','shortlist')">Önskelistan</button></header><label class="scout-report-filter">Sök bland rapporter<input type="search" value="${trainingSafe(scoutUI.query)}" onchange="scoutUI.query=this.value;render()" placeholder="Namn eller klubb"></label><div class="scout-report-grid">${done.slice(0,30).map(({p,r})=>{const a=playerAssessment(p);return `<article class="scout-report-card"><span>${trainingSafe(getPlayerClub(p.id))} · ${p.pos} · ${p.age} år</span><h3>${trainingSafe(p.name)}</h3><div>${assessmentBadge(p)} ${assessmentBadge(p,true)}</div><p>${a.roles[0].name} · ${Math.round(a.familiarity*100)} % kunskap</p>${scoutFreshnessView(p)}<progress max="3" value="${r.visits}" aria-label="Observationer för ${trainingSafe(p.name)}"></progress><small>${r.lastObserved?calText(r.lastObserved):'Tidigare rapport'} · ${r.visits}/3 observationer</small><button class="btn secondary" onclick="recruitOpen('${p.id}')">Läs attribut & rollanalys</button></article>`;}).join('')||'<p>Rapporterna samlas här. Du väljer sedan vem som är värd ett kontraktsförslag.</p>'}</div>
 ${done.length>30?'<p>Visar de 30 senaste. Sök på namn eller klubb för att hitta en äldre rapport.</p>':''}<details class="scout-staff"><summary>Bedömarna bakom rapporterna</summary><div class="staff-grid">${state.staff.map(s=>`<article><h3>${s.name}</h3><p>${s.specialty} · förmåga ${s.ability}/20 · potential ${s.potential}/20</p></article>`).join('')}</div><p>Attributkunskap och stjärnbedömning är olika saker. Personalens kompetens och din trupp påverkar värderingen.</p></details></section>`;
}
function matchAttributeRating(p,type='attack'){
  const a=ensurePlayerAttributes(p);
  if(p.pos==='MV')return 45+attributeWeighted(a,PLAYER_ROLES.Målvakt)*2.5;
  const weights=type==='shot'?{shooting:5,composure:2,puckControl:1}:type==='pass'?{passing:4,vision:3,decisions:2}:type==='defense'?{positioning:4,checking:2,decisions:2,discipline:1}:type==='faceoff'?{faceoffs:5,decisions:1,strength:1}:{skating:2,acceleration:1,passing:2,vision:2,shooting:2,puckControl:2,workRate:1,decisions:2};
  return 45+attributeWeighted(a,weights)*2.5;
}
function developAttributes(p){const a=ensurePlayerAttributes(p);const map={Skott:'shooting',Passningar:'passing',Försvar:'positioning',Fysik:'stamina'};const requested=map[p.developmentFocus];const key=requested&&keyIn(a,requested)?requested:Object.keys(a).sort((x,y)=>a[x]-a[y])[0];developmentAdvance(p,key,100);}
function keyIn(a,k){return Object.prototype.hasOwnProperty.call(a,k);}
function unitAssessment(ids){const ps=ids.map(playerById).filter(Boolean);if(!ps.length)return 'Ingen enhet';const avg=key=>Math.round(ps.reduce((n,p)=>n+playerAssessment(p).estimated[key],0)/ps.length);return `Pass ${avg('passing')} · Avslut ${avg('shooting')} · Pos ${avg('positioning')}`;}


// Saved, private development profiles. Never expose ceilings as scouting facts.
function ensureDevelopment(p){
 const a=ensurePlayerAttributes(p);
 if(!p.developmentModel){
  const seed=k=>attrSeed(`${p.id}:development:${k}`),ceiling={};
  const room=Math.max(0,Number(p.attributeGrowth)||0);
  for(const [key,value] of Object.entries(a))ceiling[key]=Math.max(value,Math.min(20,p.academy?.ceiling?.[key]??value+Math.round(room*(.35+seed(key)*.65))));
  p.developmentModel={version:1,ceiling,pace:.75+seed('pace')*.5,peakOffset:Math.floor(seed('peak')*5)-2,decline:{},history:[],lastBirthday:state.season?.year||2026};
 }
 return p.developmentModel;
}
function developmentPhysical(key){return ['skating','acceleration','stamina','strength','checking','movement','reflexes'].includes(key);}
function developmentPeak(p,key){return (developmentPhysical(key)?(p.pos==='MV'?32:29):['decisions','vision','positioning','composure','discipline'].includes(key)?36:33)+ensureDevelopment(p).peakOffset;}
function developmentRate(p,key){
 const d=ensureDevelopment(p),room=d.ceiling[key]-p.attributes[key];if(room<=0)return 0;
 const peak=developmentPeak(p,key),age=p.age;
 const ageFactor=age<22?1.15:age<=peak?1:Math.max(.08,1-(age-peak)*.15);
 // Approaching the final attainable step is slower; no rerolls on reload.
 return d.pace*ageFactor*(room>=3?1:room===2?.65:.35);
}
function developmentAdvance(p,key,points){
 const d=ensureDevelopment(p);
 if(!Number.isFinite(points)||points<=0||!Object.hasOwn(d.ceiling,key)||p.health?.injury)return false;
 if(!p.trainingProgress)p.trainingProgress={};
 if(p.attributes[key]>=d.ceiling[key]){p.trainingProgress[key]=0;return false;}
 p.trainingProgress[key]=Math.min(199,(p.trainingProgress[key]||0)+points*developmentRate(p,key));
 if(p.trainingProgress[key]<100)return false;
 p.trainingProgress[key]-=100;p.attributes[key]++;
 if(p.attributes[key]>=d.ceiling[key])p.trainingProgress[key]=0;
 p.attributeGrowth=Math.max(0,p.attributeGrowth-.12);
 developmentRecord(p,key,1,'Träning och matchvana');return true;
}
function developmentRecord(p,key,change,reason){
 const d=ensureDevelopment(p);d.history.unshift({year:state.season?.year||2026,date:state.calendar?.date||null,key,change,reason});d.history=d.history.slice(0,24);
}
function developmentBirthday(p){
 const d=ensureDevelopment(p),year=state.season.year;if(d.lastBirthday>=year)return;
 d.lastBirthday=year;p.age++;
 for(const key of Object.keys(p.attributes)){
  const years=p.age-developmentPeak(p,key);if(years<=0)continue;
  const physical=developmentPhysical(key),resilience=(p.attributes.stamina||p.attributes.composure||10)/20;
  const loss=Math.min(1.6,(physical?.22:.1)*years)*(1.15-resilience*.3);
  d.decline[key]=(d.decline[key]||0)+loss;
  const steps=Math.min(p.attributes[key]-1,Math.floor(d.decline[key]));
  if(steps>0){p.attributes[key]-=steps;d.decline[key]-=steps;developmentRecord(p,key,-steps,'Åldrande');}
 }
}
function developmentPanel(p){
 const d=ensureDevelopment(p),labels=p.pos==='MV'?GOALIE_ATTRIBUTES:SKATER_ATTRIBUTES;
 const history=d.history.slice(0,5);
 return `<div class="training-coach-note"><strong>Spelarens utveckling</strong><p>Utveckling sker i olika takt och kan plana ut. Ork, tränarstöd, matchvana och ålder påverkar. Personalens potentialstjärnor är en osäker bedömning.</p>${history.length?history.map(h=>`<p>${h.date?calText(h.date):seasonLabel(h.year)} · ${labels[h.key]} ${h.change>0?'+':''}${h.change} · ${h.reason}</p>`).join(''):'<p>Inga nya attributförändringar registrerade ännu.</p>'}</div>`;
}
