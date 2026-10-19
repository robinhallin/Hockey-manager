"use strict";

const CLUB_VISIONS={
 youth:{name:'Nästa generation',pitch:'Bygg laget kring unga spelare som får ett växande ansvar under tre säsonger.',cost:'En värvning på samma position kan blockera vägen. Unga behöver verklig istid även när resultaten pressar dig.'},
 core:{name:'En stomme att tro på',pitch:'Bygg kontinuitet kring utvalda bärande spelare under tre säsonger.',cost:'Förlängningar binder lön och platser. Ett bra försäljningsbud kan stå i konflikt med stommen.'},
 push:{name:'Sista stora satsningen',pitch:'Ge en erfaren stomme två säsonger att nå en topp fyra-placering i grundserien.',cost:'Erfarenhet kostar lön och tar plats från nästa generation. Åldrande och utgående avtal gör tiden viktig.'}
};
function clubVision(){return state.clubOffice?.vision||null;}
function clubVisionCandidates(kind){return managerRoster().filter(p=>!playerLoan(p)&&(kind==='youth'?p.age<=23:kind==='push'?p.age>=30:true)).slice().sort((a,b)=>kind==='youth'?a.age-b.age:kind==='push'?b.age-a.age:a.name.localeCompare(b.name,'sv'));}
function clubVisionLocked(){return !managerEmployed()||clubLocked()||!['preseason','regular'].includes(state.season.phase);}
function clubVisionStart(kind,ids,name=''){
 if(!Object.hasOwn(CLUB_VISIONS,kind)||!Array.isArray(ids)||clubVisionLocked()||clubVision()?.status==='active')return false;
 const selected=[...new Set(ids.map(String))].filter(Boolean),pool=clubVisionCandidates(kind);
 if(!selected.length||selected.length>3||selected.some(id=>!pool.some(p=>samePlayerId(p.id,id))))return false;
 const players=selected.map(id=>pool.find(p=>samePlayerId(p.id,id))),years=kind==='push'?2:3;
 state.clubOffice.vision={version:1,kind,club:managerClub(),name:String(name).trim().replace(/[<>]/g,'').slice(0,60)||CLUB_VISIONS[kind].name,start:state.calendar.date,startYear:state.season.year,endYear:state.season.year+years-1,status:'active',players:players.map(p=>({id:String(p.id),name:p.name,age:p.age,pos:p.pos})),years:[],seen:[],alerts:[],reviewed:[],baseline:{wages:annualWageCost(),wageLimit:wageBudget()},closed:null};
 for(const p of players)journeyEvent(p,`vision:${managerClub()}:${state.season.year}:${kind}`,'decision','Du är en del av klubbbygget',`${CLUB_VISIONS[kind].name}: ${CLUB_VISIONS[kind].pitch} Detta ändrar inte ditt kontrakt eller befintliga löften.`);
 clubVisionYear(true);save();render();return true;
}
function clubVisionYear(create=false){
 const v=clubVision();if(!v)return null;
 let row=v.years.find(y=>y.year===state.season.year);
 if(!row&&create&&v.status==='active'&&state.season.year<=v.endYear){row={year:state.season.year,games:0,players:Object.fromEntries(v.players.map(p=>[p.id,{eligible:0,qualified:0,seconds:0,points:0}])),days:0,overBudget:0,lastDate:null,finished:false};v.years.push(row);}
 return row||null;
}
function clubVisionTarget(v=clubVision()){return v?.kind==='youth'?[6,12,18][Math.min(2,Math.max(0,state.season.year-v.startYear))]:12;}
function clubVisionAlert(key,title,detail){
 const v=clubVision();if(!v||v.alerts.some(a=>a.key===key))return;
 v.alerts.push({key,title,detail,date:state.calendar.date,acknowledged:false});v.alerts=v.alerts.slice(-30);
 managerMessage(`vision:${v.start}:${key}`,title,detail,'Klubbbygget',{link:'board'});
}
function clubVisionDay(){
 const v=clubVision();if(!v||v.status!=='active'||v.club!==managerClub()||!managerEmployed())return;
 if(state.season.year>v.endYear){v.status='complete';v.closed=state.calendar.date;return;}
 const y=clubVisionYear(true);if(!y||y.finished)return;
 if(y.lastDate!==state.calendar.date){y.lastDate=state.calendar.date;y.days++;if(annualWageCost()>wageBudget())y.overBudget++;}
 for(const ref of v.players){const p=managerRoster().find(p=>samePlayerId(p.id,ref.id));
  if(!p)clubVisionAlert(`departure:${y.year}:${ref.id}`,`${ref.name} saknas i ditt klubbbygge`,`${ref.name} är inte längre i din aktiva trupp. Granska hur ${v.name} ska fortsätta. Spelarens tidigare bidrag finns kvar.`);
 }
 if(y.overBudget>=7)clubVisionAlert(`budget:${y.year}`,'Klubbbygget behöver ekonomiskt utrymme',`Lönekostnaden har legat över ramen under ${y.overBudget} registrerade dagar. Budgetkrav och redan ingångna avtal gäller fortfarande.`);
}
function clubVisionAfterMatch(m){
 const v=clubVision();if(!v||v.status!=='active'||m?.club!==v.club||!m.finished||m.friendly||m.partial||m.abandoned||m.year!==state.season.year||m.year>v.endYear)return;
 const key=`${m.year}:${m.id}`;if(v.seen.includes(key))return;v.seen.push(key);v.seen=v.seen.slice(-240);
 const y=clubVisionYear(true);if(!y||y.finished)return;y.games++;
 for(const ref of v.players){
  const p=managerRoster().find(p=>samePlayerId(p.id,ref.id)),r=(m.players||[]).find(p=>samePlayerId(p.id,ref.id)),seconds=ref.pos==='MV'?1800:v.kind==='youth'?480:720;
  if(!p||playerLoan(p)||internationalAway(p)||medicalExcused(p,seconds)||medicalLimit(p)<seconds)continue;
  const evidence=y.players[ref.id];evidence.eligible++;evidence.seconds+=r?.seconds||0;evidence.points+=(r?.goals||0)+(r?.assists||0);if((r?.seconds||0)>=seconds)evidence.qualified++;
 }
 if(y.games===6)clubVisionAlert(`checkpoint:${y.year}`,'Första avstämningen av ditt klubbbygge',`${v.name}: sex registrerade tävlingsmatcher. Se vilka som fått ansvar och hur det påverkar vägen framåt.`);
}
function clubVisionYearResult(){
 const v=clubVision(),y=clubVisionYear();if(!v||!y)return null;
 const target=clubVisionTarget(v),needed=Math.min(2,v.players.length),qualified=v.players.filter(p=>y.players[p.id].qualified>=target).length;
 const available=v.players.filter(p=>y.players[p.id].eligible>=target).length,retained=v.players.filter(ref=>managerRoster().some(p=>samePlayerId(p.id,ref.id))).length;
 const rank=seasonRank(managerClub()),sport=v.kind==='push'?rank>0&&rank<=4:qualified>=needed&&(v.kind!=='core'||retained===v.players.length);
 const enough=y.games>=12&&(v.kind==='push'||available>=needed),economic=y.days>=14?y.overBudget===0:null;
 return {target,needed,qualified,retained,available,rank,enough,economic,met:enough?sport&&economic===true:null};
}
function clubVisionEvaluation(final,base){
 const v=clubVision(),r=final&&v?.status==='active'&&v.club===managerClub()?clubVisionYearResult():null;
 if(!r?.enough||r.economic===null)return {score:base,text:''};
 return {score:Math.round(base*.9+(r.met?10:0)),text:`Klubbbygget ${v.name}: årets etapp ${r.met?'uppnådd':'inte uppnådd'}. Projektet väger 10 % i denna säsongsbedömning.`};
}
function clubVisionCloseYear(){
 const v=clubVision(),y=clubVisionYear();if(!v||v.status!=='active'||!y||y.finished)return;
 const result=clubVisionYearResult();Object.assign(y,{finished:true,result,date:state.calendar.date});
 const text=result.met===null?'För få tillgängliga matcher för en slutbedömning.':result.met?'Årets etappmål nåddes med lönekostnaden inom ramen.':'Årets etappmål nåddes inte. Granska istid, truppförändringar och ekonomiska prioriteringar.';
 y.outcome=text;clubVisionAlert(`season:${y.year}`,`${v.name}: årets kapitel`,text);
 if(state.season.year>=v.endYear){v.status='complete';v.closed=state.calendar.date;}
}
function clubVisionAcknowledge(key){
 const v=clubVision(),a=v?.alerts.find(a=>a.key===key);if(!a||a.acknowledged||clubLocked()||!managerEmployed())return false;
 a.acknowledged=true;save();render();return true;
}
function clubVisionFinish(){
 const v=clubVision();if(!v||v.status!=='active'||!['review','preseason'].includes(state.season.phase)||clubLocked()||!managerEmployed())return false;
 v.status='ended';v.closed=state.calendar.date;save();render();return true;
}
function clubVisionArchive(){
 const v=clubVision();if(!v||v.status==='active'||clubVisionLocked())return false;
 state.clubOffice.visionArchive=[v,...(state.clubOffice.visionArchive||[])].slice(0,8);delete state.clubOffice.vision;save();render();return true;
}
function clubVisionOpen(){deskNavigate('board');document.getElementById('club-vision')?.scrollIntoView?.({block:'start',behavior:'smooth'});}
function clubVisionImpact(p,mode='arrival'){
 const v=clubVision();if(!v||v.status!=='active'||!p)return '';
 const refs=mode==='departure'?v.players.filter(r=>samePlayerId(r.id,p.id)):v.players.filter(r=>!samePlayerId(r.id,p.id)&&worldGroup(r)===worldGroup(p));if(!refs.length)return '';
 return `<aside class="vision-impact"><strong>${trainingSafe(v.name)} påverkas</strong><p>${mode==='departure'?`${trainingSafe(p.name)} är en av dem du valt att bygga kring. En försäljning kan ändra projektets förutsättningar.`:`${trainingSafe(p.name)} konkurrerar om istid med ${refs.map(r=>playerReference(r.id,r.name)).join(', ')} i ditt klubbbygge.`}</p><button type="button" class="desk-link" onclick="clubVisionOpen()">Granska projektet →</button></aside>`;
}
function clubVisionSummary(){
 const v=clubVision();
 if(!v)return `<section class="build-panel"><span class="desk-kicker">DITT LÅNGSIKTIGA LAGBYGGE</span><h2>Vilket lag vill du lämna efter dig?</h2><p>Välj ett klubbprojekt och vilka spelare du vill bygga kring. Följ vad dina beslut faktiskt leder till.</p><button type="button" class="btn secondary" onclick="clubVisionOpen()">Välj ditt klubbprojekt</button></section>`;
 const y=clubVisionYear(),target=clubVisionTarget(v),alert=v.alerts.find(a=>!a.acknowledged);
 return `<section class="build-panel"><span class="desk-kicker">DITT KLUBBBYGGE · ${seasonLabel(v.startYear)}–${seasonLabel(v.endYear)}</span><h2>${trainingSafe(v.name)}</h2><p>${CLUB_VISIONS[v.kind].pitch}</p><div class="vision-players">${v.players.map(p=>`<span>${playerReference(p.id,p.name)} <small>${y?.players[p.id]?.qualified||0}/${target} matcher med ansvar</small></span>`).join('')}</div>${alert?`<p class="vision-alert">${trainingSafe(alert.title)}</p>`:''}<button type="button" class="desk-link" onclick="clubVisionOpen()">${v.status==='active'?'Följ projektet och nästa vägval':'Se projektets utfall'} →</button></section>`;
}
function clubVisionView(){
 const v=clubVision(),archive=state.clubOffice?.visionArchive||[];
 const history=rows=>rows.map(y=>`<p><strong>${seasonLabel(y.year)}</strong> · ${trainingSafe(y.outcome||`${y.games} registrerade tävlingsmatcher, pågående etapp.`)}</p>`).join('');
 if(!v)return `<section id="club-vision" class="build-workspace"><span class="desk-kicker">DINA VAL GENOM FLERA SÄSONGER</span><h2>Bygg ett lag som blir ditt</h2><p>Välj 1–3 spelare att bygga kring. Projektet följer faktisk istid, truppkontinuitet och lönekostnad. När underlaget räcker väger projektets årsutfall 10 % i styrelsens säsongsbedömning. Säsongens verksamhetssatsning och ordinarie mål gäller samtidigt.</p><div class="vision-options">${Object.entries(CLUB_VISIONS).map(([kind,d])=>{const players=clubVisionCandidates(kind);return `<article><h3>${d.name}</h3><p>${d.pitch}</p><p><strong>Det svåra:</strong> ${d.cost}</p><form onsubmit="event.preventDefault();clubVisionStart('${kind}',[this.elements.first.value,this.elements.second.value,this.elements.third.value].filter(Boolean),this.elements.projectName.value)"><label>Projektnamn<input name="projectName" maxlength="60" placeholder="${d.name}"></label>${['first','second','third'].map((field,i)=>`<label>${i?'Ytterligare spelare (valfritt)':'Spelare att bygga kring'}<select name="${field}">${i?'<option value="">Välj senare</option>':''}${players.map(p=>`<option value="${trainingSafe(p.id)}">${trainingSafe(p.name)} · ${p.age} år · ${p.pos}</option>`).join('')}</select></label>`).join('')}<button class="btn secondary" ${!players.length||clubVisionLocked()?'disabled':''}>Starta ${d.name.toLocaleLowerCase('sv')}</button></form></article>`;}).join('')}</div>${archive.length?`<details><summary>Tidigare klubbbyggen · ${archive.length}</summary>${archive.map(v=>`<h3>${trainingSafe(v.name)}</h3>${history(v.years)}`).join('')}</details>`:''}</section>`;
 const y=clubVisionYear(),target=clubVisionTarget(v),alerts=v.alerts.filter(a=>!a.acknowledged);
 return `<section id="club-vision" class="build-workspace"><span class="desk-kicker">DITT KLUBBBYGGE · ${v.status==='active'?'PÅGÅENDE':v.status==='ended'?'AVSLUTAT':'FÄRDIGT'}</span><h2>${trainingSafe(v.name)}</h2><p>${CLUB_VISIONS[v.kind].pitch}</p><p><strong>Det svåra:</strong> ${CLUB_VISIONS[v.kind].cost}</p><p>Projektperiod ${seasonLabel(v.startYear)} till ${seasonLabel(v.endYear)}. ${v.kind==='push'?'Mål: topp fyra i grundserien och löner inom budget. Spelarnas istid visas som underlag.':`Årets mål: minst ${Math.min(2,v.players.length)} utvalda spelare med ${target} tävlingsmatcher med minst ${v.kind==='youth'?8:12} minuter (målvakter 30 minuter). ${v.kind==='core'?'Hela den utvalda stommen ska också vara kvar. ':''}Löner inom budget.`} Minst 12 registrerade matcher krävs för slutbedömning; giltig frånvaro räknas bort från spelarnas möjligheter. Budgeten bedöms efter minst 14 observerade dagar.</p><div class="vision-players">${v.players.map(p=>{const r=y?.players[p.id];return `<article><h3>${playerReference(p.id,p.name)}</h3><p>${r?.qualified||0}/${target} matcher med ansvar · ${r?.eligible||0} tillgängliga · ${Math.round((r?.seconds||0)/60)} minuter.</p><button type="button" class="desk-link" onclick="${trainingSafe(`deskOpenPlayer(${JSON.stringify(p.id)})`)}">Bedöm rollen →</button></article>`;}).join('')}</div><p>${y?.games||0} tävlingsmatcher registrerade. ${y?.overBudget||0} av ${y?.days||0} observerade dagar över lönebudgeten.</p>${alerts.map(a=>`<article class="vision-impact"><h3>${trainingSafe(a.title)}</h3><p>${trainingSafe(a.detail)}</p><button type="button" class="desk-link" onclick="${trainingSafe(`clubVisionAcknowledge(${JSON.stringify(a.key)})`)}" ${clubLocked()||!managerEmployed()?'disabled':''}>Jag har granskat vägvalet</button></article>`).join('')}<details><summary>Projektets säsonger och utfall</summary>${history(v.years)}</details><p>När underlaget räcker väger årets projektutfall 10 % i styrelsens säsongsbedömning. Du fördelar själv istiden och förhandlar avtalen. Ett avslutat projekt behåller sina tidigare resultat.</p>${v.status!=='active'?`<button type="button" class="btn secondary" onclick="clubVisionArchive()" ${clubVisionLocked()?'disabled':''}>Bevara projektet och välj ett nytt</button>`:['review','preseason'].includes(state.season.phase)?'<button type="button" class="desk-link" onclick="clubVisionFinish()">Avsluta projektet och bevara utfallet</button>':''}</section>`;
}
function validateClubVisionOffice(o){
 const object=v=>v&&typeof v==='object'&&!Array.isArray(v),date=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v)),str=v=>typeof v==='string'&&v.length<=12000,number=v=>Number.isInteger(v)&&v>=0;
 const fail=()=>{throw Error('Ogiltigt klubbbygge i sparfilen.');};
 if(o?.visionArchive&&(!Array.isArray(o.visionArchive)||o.visionArchive.length>8||o.visionArchive.some(v=>!object(v))))fail();
 for(const v of [o?.vision,...(o?.visionArchive||[])].filter(Boolean)){
  if(!object(v)||v.version!==1||!Object.hasOwn(CLUB_VISIONS,v.kind)||!str(v.club)||!str(v.name)||!date(v.start)||!Number.isInteger(v.startYear)||v.endYear!==v.startYear+(v.kind==='push'?1:2)||!['active','ended','complete'].includes(v.status)||v.closed!==null&&!date(v.closed)||!Array.isArray(v.players)||v.players.length<1||v.players.length>3||v.players.some(p=>!object(p))||new Set(v.players.map(p=>p.id)).size!==v.players.length||!Array.isArray(v.years)||v.years.length>3||!Array.isArray(v.seen)||v.seen.length>240||v.seen.some(k=>!str(k))||!Array.isArray(v.alerts)||v.alerts.length>30||!Array.isArray(v.reviewed)||!object(v.baseline)||!Number.isFinite(v.baseline.wages)||!Number.isFinite(v.baseline.wageLimit))fail();
  for(const p of v.players)if(!object(p)||!str(p.id)||!str(p.name)||!Number.isFinite(p.age)||!['MV','B','C','VF','HF','F'].includes(p.pos))fail();
  const years=new Set();for(const y of v.years){if(!object(y)||!Number.isInteger(y.year)||y.year<v.startYear||y.year>v.endYear||years.has(y.year)||!number(y.games)||!number(y.days)||!number(y.overBudget)||y.overBudget>y.days||y.lastDate!==null&&!date(y.lastDate)||typeof y.finished!=='boolean'||!object(y.players)||Object.keys(y.players).length!==v.players.length)fail();years.add(y.year);for(const p of v.players){const r=y.players[p.id];if(!object(r)||['eligible','qualified','seconds','points'].some(k=>!Number.isFinite(r[k])||r[k]<0)||!Number.isInteger(r.eligible)||!Number.isInteger(r.qualified)||r.qualified>r.eligible||r.eligible>y.games)fail();}if(y.finished&&(!date(y.date)||!str(y.outcome)||!object(y.result)||![true,false,null].includes(y.result.met)))fail();}
  for(const a of v.alerts)if(!object(a)||['key','title','detail'].some(k=>!str(a[k]))||!date(a.date)||typeof a.acknowledged!=='boolean')fail();
 }
}

const visionBoardView=clubDeskBoard;
clubDeskBoard=function(){return visionBoardView()+clubVisionView();};
const visionPreseasonView=preseasonPlanningView;
preseasonPlanningView=function(){return visionPreseasonView()+clubVisionView();};
const visionImpactView=squadDecisionImpactView;
squadDecisionImpactView=function(p,mode='arrival',role='Ordinarie'){return visionImpactView(p,mode,role)+clubVisionImpact(p,mode);};
