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
  const archetype=Math.floor(seed('archetype')*3);
  for(const key of Object.keys(fields)){
    if(Number.isFinite(p.attributes[key]))continue;
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
  const migrate=state.assessmentVersion!==1;
  state.assessmentVersion=1;
  if(migrate&&Array.isArray(state.news))state.news=state.news.map(n=>typeof n==='string'?n.replace(/har utvecklats och är nu \d+ OVR\./g,'har utvecklat sina attribut genom träningen.'):n);
  if(!state.staff)state.staff=[
    {id:'assistant',name:'Assisterande tränare',ability:15,potential:11,specialty:'Tvåvägsforward'},
    {id:'scout',name:'Chefsscout',ability:13,potential:16,specialty:'Spelfördelare'},
    {id:'goalie',name:'Målvaktstränare',ability:17,potential:12,specialty:'Målvakt'}
  ];
  if(!state.scoutReports)state.scoutReports={};
  if(migrate)for(const roster of Object.values(state.clubRosters||{}))for(const p of roster)ensurePlayerAttributes(p);
}
function roleWeights(p){return p.pos==='MV'?['Målvakt']:p.pos==='B'?['Offensiv back','Defensiv back']:['Målskytt','Spelfördelare','Tvåvägsforward','Checkingforward'];}
function attributeWeighted(values,weights){let sum=0,total=0;for(const [key,w] of Object.entries(weights)){sum+=(values[key]||10)*w;total+=w;}return sum/total;}
function isOwnPlayer(p){return managerRoster().some(x=>samePlayerId(x.id,p.id));}
function playerAssessment(p){
  ensureAssessmentData();
  const staff=state.staff.find(x=>x.id===state.assessorId)||state.staff[0];
  const own=isOwnPlayer(p),report=state.scoutReports[String(p.id)];
  const visits=report?.visits||0;
  const familiarity=own?.9:Math.min(.86,.12+visits*.24);
  const specialized=roleWeights(p).includes(staff.specialty);
  const ability=attrClamp(staff.ability+(specialized?2:0));
  const uncertainty=(1-familiarity)*4+(20-ability)*.08;
  const attributes=ensurePlayerAttributes(p),estimated={};
  for(const key of Object.keys(attributes))estimated[key]=attrClamp(attributes[key]+(attrSeed(`${p.id}:${staff.personId||staff.id}:${key}`)-.5)*2*uncertainty);
  const roles=roleWeights(p).map(name=>({name,value:attributeWeighted(estimated,PLAYER_ROLES[name])})).sort((a,b)=>b.value-a.value);
  const peers=managerRoster().filter(x=>x.pos==='MV'?(p.pos==='MV'):(p.pos!=='MV'));
  const baseline=peers.reduce((sum,x)=>sum+Math.max(...roleWeights(x).map(name=>attributeWeighted(ensurePlayerAttributes(x),PLAYER_ROLES[name]))),0)/Math.max(1,peers.length);
  const stars=value=>Math.round(attrClamp(2.5+(value-baseline)*.65,0,5)*2)/2;
  const potentialError=(p.age<=23?1.6:.8)+(20-staff.potential)*.1+(1-familiarity)*2;
  const potentialEstimate=roles[0].value+p.attributeGrowth+(attrSeed(`${p.id}:${staff.personId||staff.id}:potential`)-.5)*2*potentialError;
  return {staff,own,visits,familiarity,estimated,uncertainty,roles,current:stars(roles[0].value),low:stars(roles[0].value-uncertainty),high:stars(roles[0].value+uncertainty),potentialLow:stars(potentialEstimate-potentialError),potentialHigh:stars(potentialEstimate+potentialError)};
}
function starsText(value){return '★'.repeat(Math.floor(value))+(value%1?'½':'')+'☆'.repeat(5-Math.ceil(value));}
function assessmentBadge(p,potential=false){const r=playerAssessment(p);const lo=potential?r.potentialLow:r.low,hi=potential?r.potentialHigh:r.high;return `<span class="assessment-stars" title="${r.staff.name}: ${lo}–${hi} av 5, relativt din trupp">${lo===hi?starsText(lo):`${lo}–${hi} ★`}</span>`;}
function assessmentShort(p){const r=playerAssessment(p);return `${r.low}–${r.high} ★ · ${r.roles[0].name}`;}
function attributeInterval(p,key,r){const center=r.estimated[key],spread=r.uncertainty;const lo=attrClamp(Math.floor(center-spread)),hi=attrClamp(Math.ceil(center+spread));return lo===hi?String(lo):`${lo}–${hi}`;}
function assessmentPanel(p){
  const r=playerAssessment(p),fields=p.pos==='MV'?GOALIE_ATTRIBUTES:SKATER_ATTRIBUTES;
  const ordered=Object.keys(fields).sort((a,b)=>r.estimated[b]-r.estimated[a]);
  const pending=state.scoutReports[String(p.id)]?.dueRound;
  return `<section class="assessment-panel"><div class="assessment-heading"><div><span class="panel-label">PERSONALENS RAPPORT</span><h2>Så kan ${p.name.split(' ')[0]} användas</h2></div><label>Bedömare<select onchange="state.assessorId=this.value;save();render()">${state.staff.map(s=>`<option value="${s.id}" ${s.id===r.staff.id?'selected':''}>${s.name}</option>`).join('')}</select></label></div>
  <div class="assessment-summary"><div><small>Nuvarande förmåga</small>${assessmentBadge(p)}</div><div><small>Potential</small>${assessmentBadge(p,true)}</div><div><small>Rapportens säkerhet</small><strong>${r.familiarity>.8?'Hög':r.familiarity>.4?'Medel':'Låg'}</strong></div></div>
  <p>${r.staff.name} ser främst en <b>${r.roles[0].name.toLowerCase()}</b>. Styrkor: ${fields[ordered[0]].toLowerCase()} och ${fields[ordered[1]].toLowerCase()}. Svagare sida: ${fields[ordered.at(-1)].toLowerCase()}.</p>
  <p class="muted">Stjärnorna jämförs med din trupp. Attribut visas på skalan 1–20 som bedömda intervall. Potential är en osäker prognos.</p>
  <div class="attribute-grid">${Object.keys(fields).map(key=>`<div class="attribute-item"><span>${fields[key]}</span><strong>${attributeInterval(p,key,r)}</strong><div class="attribute-track"><i style="width:${r.estimated[key]*5}%"></i></div></div>`).join('')}</div>
  <div class="role-reports">${r.roles.map(role=>`<span><b>${role.name}</b> · ${role.value>=14?'Tydliga styrkor':role.value>=11?'Användbar profil':'Behöver utvecklas'}</span>`).join('')}</div>
  ${!r.own?`<div class="player-actions"><button class="btn" onclick="requestScoutReport('${p.id}')" ${pending||r.visits>=3?'disabled':''}>${pending?(state.season?.phase==='preseason'?'Rapport nästa försäsongsvecka':`Rapport efter omgång ${pending-1}`):r.visits>=3?'Grundligt scoutad':'Beställ scoutobservation'}</button><span>${r.visits} av 3 observationer</span></div>`:'<p class="muted">Tränarteamet känner spelaren genom den dagliga träningen.</p>'}</section>`;
}
function requestScoutReport(id){
  ensureAssessmentData();const p=findPlayerAnywhere(id);if(!p||isOwnPlayer(p))return;
  const r=state.scoutReports[String(id)]||(state.scoutReports[String(id)]={visits:0});
  if(r.dueRound||r.visits>=3)return;
  r.dueRound=state.round+1;save();render();
}
function advanceScoutReports(){
  ensureAssessmentData();
  for(const [id,r] of Object.entries(state.scoutReports))if(r.dueRound&&r.dueRound<=state.round){r.visits=Math.min(3,r.visits+1);r.observedTick=(state.recruitment?.tick||0)+1;delete r.dueRound;const p=findPlayerAnywhere(id);if(p){state.news.unshift(`Scoutrapport klar: ${p.name}. Observation ${r.visits} av 3 – öppna Scouting.`);managerMessage(`scout:${id}:${r.visits}`,`Scoutrapport: ${p.name}`,`Observation ${r.visits} av 3 är klar. Rapportens säkerhet har förbättrats. Öppna Scouting för att läsa bedömningen.`, 'Chefsscout',{link:'scouting'});}}
  advanceRecruitmentRound();
}
function scoutingView(){
  ensureAssessmentData();
  const reports=Object.entries(state.scoutReports).map(([id,r])=>({p:findPlayerAnywhere(id),r})).filter(x=>x.p&&!isOwnPlayer(x.p));
  return `<section class="bench-hub"><span class="panel-label">SCOUTING & TRÄNARTEAM</span><h1>Ditt beslutsunderlag</h1><p>Personalens kompetens och kunskap om spelaren påverkar rapporten. Observationer blir klara efter nästa omgång eller försäsongsvecka.</p><div class="staff-grid">${state.staff.map(s=>`<article class="unit-card"><h2>${s.name}</h2><p>Specialisering: ${s.specialty}</p><div class="row"><span>Bedöma förmåga</span><b>${s.ability}/20</b></div><div class="row"><span>Bedöma potential</span><b>${s.potential}/20</b></div></article>`).join('')}</div><h2>Bevakade spelare</h2>${reports.length?reports.map(({p,r})=>`<button class="scout-report-row" onclick="state.selectedMarketPlayer='${p.id}';state.page='marketPlayer';render()"><strong>${p.name}</strong><span>${assessmentShort(p)}</span><span>${r.dueRound?'Observation pågår':`${r.visits} observationer klara`}</span></button>`).join(''):'<p>Öppna en spelare på transfermarknaden och beställ din första observation.</p>'}<button class="btn" onclick="state.page='transfers';render()">Till rekryteringscentralen</button></section>`;
}
function matchAttributeRating(p,type='attack'){
  const a=ensurePlayerAttributes(p);
  if(p.pos==='MV')return 45+attributeWeighted(a,PLAYER_ROLES.Målvakt)*2.5;
  const weights=type==='shot'?{shooting:5,composure:2,puckControl:1}:type==='pass'?{passing:4,vision:3,decisions:2}:type==='defense'?{positioning:4,checking:2,decisions:2,discipline:1}:type==='faceoff'?{faceoffs:5,decisions:1,strength:1}:{skating:2,acceleration:1,passing:2,vision:2,shooting:2,puckControl:2,workRate:1,decisions:2};
  return 45+attributeWeighted(a,weights)*2.5;
}
function developAttributes(p){const a=ensurePlayerAttributes(p);const map={Skott:'shooting',Passningar:'passing',Försvar:'positioning',Fysik:'stamina'};const requested=map[p.developmentFocus];const key=requested&&keyIn(a,requested)?requested:Object.keys(a).sort((x,y)=>a[x]-a[y])[0];a[key]=Math.min(20,a[key]+1);p.attributeGrowth=Math.max(0,p.attributeGrowth-.15);}
function keyIn(a,k){return Object.prototype.hasOwnProperty.call(a,k);}
function unitAssessment(ids){const ps=ids.map(playerById).filter(Boolean);if(!ps.length)return 'Ingen enhet';const avg=key=>Math.round(ps.reduce((n,p)=>n+playerAssessment(p).estimated[key],0)/ps.length);return `Pass ${avg('passing')} · Avslut ${avg('shooting')} · Pos ${avg('positioning')}`;}
