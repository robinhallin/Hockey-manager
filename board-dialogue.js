"use strict";
// Board permissions never create cash. Investments use the existing ledger.
const BOARD_REQUESTS={wages:{name:'Större spelarbudget',amounts:[500000,1000000],days:28},staff:{name:'Större personalbudget',amounts:[150000,300000],days:28},project:{name:'Utveckla klubbens pågående satsning',amounts:[250000,500000],days:90}};
const BOARD_ARGUMENTS={coverage:'Lös dokumenterad truppbrist',retention:'Behåll spelare med utgående avtal',expertise:'Höj kompetensen i staben',development:'Bygg klubbens långsiktiga utveckling'};
function boardDialogueStore(create=false){
 const o=create?managerOffice2Ensure():state.office2;if(!o)return null;
 if(!o.boardDialogue&&create)o.boardDialogue={nextId:1,requests:[]};
 return o.boardDialogue||null;
}
function boardDialogueEvidence(kind,argument){
 const needs=recruitmentCoverage(),shortage=needs.reduce((n,r)=>n+(r.need||0),0),expiring=managerRoster().filter(p=>p.contractYears<=1&&!p.futureContract).length;
 const weak=state.staff.filter(s=>(s.id==='scout'?s.ability:s.coaching)<14),project=state.clubOffice.priority,projectReady=project!=='balanced'&&state.clubOffice.priorityLockedYear===clubYear()&&(state.clubOffice.projects?.[project]?.maturity||0)<100;
 const valid=kind==='wages'?(argument==='coverage'&&shortage>0||argument==='retention'&&expiring>0):kind==='staff'?argument==='expertise'&&weak.length>0:argument==='development'&&projectReady;
 return {valid,project,text:kind==='wages'?`${shortage} obemannade platser enligt täckningsanalysen; ${expiring} utgående spelarkontrakt.`:kind==='staff'?`Kompetens under 14/20 i relevant huvudområde: ${weak.map(s=>s.name).join(', ')||'ingen'}.`:`Aktiv satsning: ${CLUB_PRIORITIES[project]?.name||project}. Mognad ${state.clubOffice.projects?.[project]?.maturity||0} %. En investering får inte byta den låsta säsongsinriktningen.`};
}
function boardDialogueCapacity(kind,amount){
 const cash=state.money-managerRecruitmentBudget().fees,floor=Math.round(annualWageCost()/12),projected=Math.min(...clubCashflowProjection(3).map(r=>r.balance));
 const buffer=kind==='project'?amount:amount/4;
 return {cash,floor,projected,okay:cash-buffer>=floor&&projected-buffer>=floor};
}
function boardDialogueNotice(text){clubNotice(text);return false;}
function boardDialogueRequest(kind,amount,argument){
 amount=Number(amount);if(!state.careerStarted||!BOARD_REQUESTS[kind]?.amounts.includes(amount)||!BOARD_ARGUMENTS[argument]||!managerEmployed()||clubLocked()||state.season.phase==='review')return false;
 const store=boardDialogueStore(true);if(!store)return false;
 const same=store.requests.filter(r=>r.club===managerClub()&&r.kind===kind),date=state.calendar.date;
 if(store.requests.some(r=>r.club===managerClub()&&['pending','offered','active'].includes(r.status)))return boardDialogueNotice('Avsluta det pågående styrelseärendet innan du begär nya resurser.');
 if(same.some(r=>r.granted&&r.year===state.season.year))return boardDialogueNotice('Den här resursramen har redan höjts under säsongen.');
 if(same.some(r=>calGap(r.date,date)<30))return boardDialogueNotice('Styrelsen vill se minst 30 dagar mellan likadana resursbegäranden.');
 const evidence=boardDialogueEvidence(kind,argument),base=kind==='wages'?wageBudget():kind==='staff'?state.clubOffice.staffLimit:state.clubOffice.projects?.[evidence.project]?.maturity||0;
 const r={id:store.nextId++,club:managerClub(),year:state.season.year,kind,argument,requested:amount,date,due:calAdd(date,2),status:'pending',evidence:evidence.text,project:evidence.project,base,offered:0,granted:false,observations:0,breaches:0};
 store.requests.unshift(r);store.requests=store.requests.slice(0,60);
 managerMessage(`board-request:${r.club}:${r.id}`,'Resursbegäran skickad',`${BOARD_REQUESTS[kind].name}: ${money(amount)}. ${evidence.text} Styrelsen svarar ${calText(r.due)}. Inga resurser är beviljade ännu.`,'Styrelsen',{link:'board'});
 managerAgendaReconcile();save();render();return true;
}
function boardDialogueResolve(r){
 const e=boardDialogueEvidence(r.kind,r.argument),confidence=state.managerCareer.confidence;
 const amount=confidence<65?Math.round(r.requested/2):r.requested,capacity=boardDialogueCapacity(r.kind,amount);
 const reason=!e.valid?'Motiveringen stöds inte av klubbens aktuella behov.':r.kind==='project'&&e.project!==r.project?'Klubbens satsning har ändrats.':state.managerCareer.pressure?.active?'Ett aktivt ultimatum måste hanteras först.':confidence<45?'Styrelsens förtroende är för lågt för ett nytt åtagande.':!capacity.okay?'Kassa och tremånadersprognos lämnar inte en månads spelarlöner i säkerhetsmarginal efter satsningen.':'';
 r.evidence=e.text;
 if(reason){r.status='rejected';r.outcome=reason;}
 else{r.status='offered';r.offered=amount;r.base=r.kind==='wages'?wageBudget():r.kind==='staff'?state.clubOffice.staffLimit:state.clubOffice.projects?.[r.project]?.maturity||0;r.expires=calAdd(state.calendar.date,7);r.floor=capacity.floor;r.outcome=amount<r.requested?'Styrelsen erbjuder en mindre ram med samma uppföljningskrav.':'Styrelsen är beredd att godkänna begäran på följande villkor.';}
 managerMessage(`board-response:${r.club}:${r.id}`,'Styrelsens svar: '+BOARD_REQUESTS[r.kind].name,r.outcome+' Öppna styrelsedialogen för underlag och villkor.','Styrelsen',{priority:r.status==='offered'?'high':'normal',link:'board'});
}
function boardDialogueWithdraw(id){
 const r=boardDialogueStore()?.requests.find(r=>r.id===Number(id)&&r.club===managerClub());
 if(!r||r.status!=='pending'||!managerEmployed()||clubLocked())return false;
 r.status='declined';r.outcome='Du återkallade begäran före styrelsens beslut. Inga resurser ändrades.';managerAgendaReconcile();save();render();return true;
}
function boardDialogueAnswer(id,accept){
 const r=boardDialogueStore()?.requests.find(r=>r.id===Number(id)&&r.club===managerClub());
 if(!r||r.status!=='offered'||typeof accept!=='boolean'||!managerEmployed()||clubLocked()||state.season.phase==='review')return false;
 if(r.year!==state.season.year||state.calendar.date>r.expires){r.status='expired';r.outcome='Svarstiden eller säsongen har löpt ut.';save();render();return false;}
 if(!accept){r.status='declined';r.outcome='Du avböjde villkoren. Budget och kassa är oförändrade.';managerAgendaReconcile();save();render();return true;}
 const evidence=boardDialogueEvidence(r.kind,r.argument),base=r.kind==='wages'?wageBudget():r.kind==='staff'?state.clubOffice.staffLimit:state.clubOffice.projects?.[r.project]?.maturity||0;
 if(!evidence.valid||evidence.project!==r.project&&r.kind==='project'||base!==r.base||state.managerCareer.pressure?.active||state.managerCareer.confidence<45||!boardDialogueCapacity(r.kind,r.offered).okay)return boardDialogueNotice('Underlaget har ändrats. Avböj eller invänta ny ekonomisk marginal; det gamla erbjudandet kan inte verkställas nu.');
 if(r.kind==='wages'){state.boardPlan.offer.wageLimit=base+r.offered;state.season.nextWageLimit=base+r.offered;}
 else if(r.kind==='staff')state.clubOffice.staffLimit=base+r.offered;
 else clubPost('priority',-r.offered,'Styrelsebeslut · '+CLUB_PRIORITIES[r.project].name);
 r.status='active';r.granted=true;r.accepted=state.calendar.date;r.review=calAdd(r.accepted,BOARD_REQUESTS[r.kind].days);r.observations=0;r.breaches=0;r.lastObserved=null;r.gain=r.kind==='project'?Math.round(20*r.offered/500000):0;
 r.outcome=r.kind==='project'?'Investeringen är bokförd. Mognad tillkommer först vid godkänd uppföljning.':'Den årliga budgetramen är höjd. Ingen kontant tilldelning och inget nytt avtal har skapats.';
 managerAgendaReconcile();save();render();return true;
}
function boardDialogueDay(){
 if(!managerEmployed())return;const date=state.calendar.date;
 for(const r of boardDialogueStore()?.requests||[]){
  if(r.club!==managerClub())continue;
  if(['pending','offered','active'].includes(r.status)&&r.year!==state.season.year){r.status='closed';r.outcome='Säsongen avslutades före fullständig uppföljning. Ingen förtroendepåföljd.';continue;}
  if(r.status==='pending'&&date>=r.due)boardDialogueResolve(r);
  if(r.status==='offered'&&date>r.expires){r.status='expired';r.outcome='Du lämnade inget svar inom sju dagar. Ingen resursändring genomfördes.';}
  if(r.status!=='active'||date<=r.accepted)continue;
  if(r.lastObserved!==date){r.lastObserved=date;r.observations++;const cash=state.money-managerRecruitmentBudget().fees,over=r.kind==='staff'?clubStaffCost()>state.clubOffice.staffLimit:annualWageCost()>wageBudget();if(cash<r.floor||over||r.kind==='project'&&state.clubOffice.priority!==r.project)r.breaches++;}
  if(date<r.review)continue;
  const sufficient=r.observations>=(r.kind==='project'?30:14),met=sufficient&&r.breaches===0;
  r.status=!sufficient?'closed':met?'met':'missed';r.completed=date;
  if(sufficient)state.managerCareer.confidence=Math.max(0,Math.min(100,state.managerCareer.confidence+(met?2:-3)));
  if(met&&r.kind==='project'){const p=state.clubOffice.projects?.[r.project];if(p)p.maturity=Math.min(100,(p.maturity||0)+r.gain);}
  r.outcome=!sufficient?'För få observerade kalenderdagar för slutbedömning. Ingen förtroendeförändring eller projektbonus.':`${r.breaches} av ${r.observations} observerade dagar bröt mot villkoren. Förtroende ${met?'+2':'−3'}.${met&&r.kind==='project'?' Projektmognad +'+r.gain+' procentenheter (högst 100 %).':''} Befintliga avtal rivs inte upp.`;
  managerMessage(`board-review:${r.club}:${r.id}`,'Uppföljning av styrelsebeslut',BOARD_REQUESTS[r.kind].name+': '+r.outcome,'Styrelsen',{link:'board'});
 }
}
function boardDialogueClose(reason){for(const r of boardDialogueStore()?.requests||[])if(r.club===managerClub()&&['pending','offered','active'].includes(r.status)){r.status='closed';r.outcome=reason+' Ingen förtroendepåföljd eller ytterligare resursändring.';}}
function boardDialogueItems(){return (boardDialogueStore()?.requests||[]).filter(r=>r.club===managerClub()&&['pending','offered','active'].includes(r.status)).map(r=>({id:'board-dialogue:'+r.id,title:BOARD_REQUESTS[r.kind].name,detail:r.status==='pending'?'Styrelsen prövar din begäran.':r.status==='offered'?r.outcome:'Accepterade villkor följs upp dagligen.',owner:r.status==='offered'?'Du':'Styrelsen',tag:'Styrelsedialog',area:'board',due:r.status==='pending'?r.due:r.status==='offered'?r.expires:r.review,requiresDecision:r.status==='offered',level:r.status==='offered'?'high':'medium',score:75,action:{page:'board'}}));}
function boardDialogueView(){
 const rows=(boardDialogueStore()?.requests||[]).filter(r=>r.club===managerClub()),disabled=!managerEmployed()||clubLocked()||state.season.phase==='review';
 return `<section class="cd-panel"><h2>Dialog om klubbens resurser</h2><p>Begär en större årlig budgetram eller investera i den låsta klubbstrategin. Styrelsen prövar behov, förtroende, reserverade bud och tre månaders kassaflöde. Budgetutrymme är inte pengar i kassan.</p><details><summary>Klubbens underlag just nu</summary>${Object.entries(BOARD_REQUESTS).map(([k,v])=>`<p><strong>${v.name}</strong>: ${trainingSafe(boardDialogueEvidence(k,({wages:'retention',staff:'expertise',project:'development'})[k]).text)}</p>`).join('')}</details><form class="decision-contract-form" onsubmit="event.preventDefault();boardDialogueRequest(this.elements.kind.value,Number(this.elements.scale.value)*Number(this.elements.kind.selectedOptions[0].dataset.unit),this.elements.argument.value)"><label>Resurs<select name="kind" onchange="this.form.elements.argument.value=({wages:'coverage',staff:'expertise',project:'development'})[this.value]">${Object.entries(BOARD_REQUESTS).map(([k,v])=>`<option value="${k}" data-unit="${v.amounts[0]}">${v.name} · ${money(v.amounts[0])} per steg</option>`).join('')}</select></label><label>Omfattning<select name="scale"><option value="1">Ett steg</option><option value="2">Två steg</option></select></label><label>Motivering<select name="argument">${Object.entries(BOARD_ARGUMENTS).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></label><button class="btn" ${disabled?'disabled':''}>Skicka begäran · svar om två dagar</button></form><p>Ett pågående ärende i taget, minst 30 dagar mellan likadana begäranden och högst en beviljad höjning per resurstyp och säsong.</p>${rows.map(r=>`<article><h3>${BOARD_REQUESTS[r.kind].name} · ${calText(r.date)} · ${trainingSafe(({pending:'Under prövning',offered:'Erbjudande',active:'Under uppföljning',met:'Villkor uppfyllda',missed:'Villkor inte uppfyllda',rejected:'Avslag',declined:'Avböjt',closed:'Avslutat',expired:'Utgånget'})[r.status])}</h3><p>${BOARD_ARGUMENTS[r.argument]} · begärt ${money(r.requested)}${r.offered?' · erbjudet '+money(r.offered):''}</p><p>${trainingSafe(r.evidence)}</p><p>${trainingSafe(r.outcome||'Inväntar styrelsens bedömning.')}</p>${['offered','active'].includes(r.status)?`<p>Motkrav: minst ${money(r.floor)} i kassa efter reserverade köpbud och håll lönekostnaden inom ${r.kind==='staff'?'personalbudgeten':'spelarbudgeten'} under ${BOARD_REQUESTS[r.kind].days} dagar.${r.kind==='project'?` Behåll satsningen ${CLUB_PRIORITIES[r.project].name}. ${money(r.offered)} dras direkt vid acceptans. Godkänd uppföljning ger ${Math.round(20*r.offered/500000)} procentenheter mognad, inte garanterade sportsliga resultat.`:' Endast den årliga ramen ändras vid acceptans; löner kostar först när avtal finns.'} Vid säsongsslut eller klubbbyte avslutas ofullständig uppföljning utan bonus eller förtroendepåföljd. En genomförd investering återbetalas inte. Godkänt ger +2 i förtroende, brutna villkor −3. Minst ${r.kind==='project'?30:14} observerade dagar krävs.</p>`:''}${r.status==='pending'?`<button class="desk-link" onclick="boardDialogueWithdraw(${r.id})" ${disabled?'disabled':''}>Återkalla begäran</button>`:''}${r.status==='offered'?`<p>Svara senast ${calText(r.expires)}.</p><button class="btn" onclick="boardDialogueAnswer(${r.id},true)" ${disabled?'disabled':''}>Acceptera villkoren</button><button class="desk-link" onclick="boardDialogueAnswer(${r.id},false)" ${disabled?'disabled':''}>Avböj</button>`:r.status==='active'?`<p>Avstämning ${calText(r.review)} · ${r.observations} observerade dagar, ${r.breaches} avvikelser.</p>`:''}</article>`).join('')||'<p>Inga begäranden har skickats. Förhandsvisningen ändrar varken budget eller ekonomi.</p>'}</section>`;
}
function validateBoardDialogueSave(store){
 const fail=()=>{throw Error('Ogiltig styrelsedialog i sparfilen.');},date=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d));
 if(!store||!Number.isInteger(store.nextId)||store.nextId<1||!Array.isArray(store.requests)||store.requests.length>60)fail();
 const ids=new Set();for(const r of store.requests){
  if(!r||!Number.isInteger(r.id)||r.id<1||r.id>=store.nextId||ids.has(r.id)||typeof r.club!=='string'||!Number.isInteger(r.year)||!BOARD_REQUESTS[r.kind]||!BOARD_ARGUMENTS[r.argument]||!BOARD_REQUESTS[r.kind].amounts.includes(r.requested)||!date(r.date)||!date(r.due)||r.due<r.date||!['pending','offered','rejected','declined','active','met','missed','closed','expired'].includes(r.status)||typeof r.evidence!=='string'||r.evidence.length>12000||r.outcome!==undefined&&(typeof r.outcome!=='string'||r.outcome.length>12000)||!CLUB_PRIORITIES[r.project]||!Number.isFinite(r.base)||r.base<0||!Number.isFinite(r.offered)||r.offered<0||r.offered>r.requested||typeof r.granted!=='boolean'||!Number.isInteger(r.observations)||r.observations<0||!Number.isInteger(r.breaches)||r.breaches<0||r.breaches>r.observations)fail();
  ids.add(r.id);for(const k of ['expires','accepted','review','lastObserved','completed'])if(r[k]!=null&&!date(r[k]))fail();
  if(['offered','active','met','missed'].includes(r.status)&&(!(r.offered>0)||!Number.isFinite(r.floor)||r.floor<0||!date(r.expires)))fail();
  if(r.granted&&(!date(r.accepted)||!date(r.review)||r.review<r.accepted||!Number.isFinite(r.gain)||r.gain<0||r.gain>20))fail();
  if(['active','met','missed'].includes(r.status)&&!r.granted)fail();
 }
}
const boardDialogueBaseView=clubDeskBoard;
clubDeskBoard=function(){return boardDialogueBaseView()+boardDialogueView();};
