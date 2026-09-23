"use strict";

// Saved incoming negotiations share one ledger and the existing transaction paths.
// stage describes who is waiting; status remains compatible with older saves.
function incomingOfferOpen(o){
 return o.status==='pending'&&(o.expiresDate?o.expiresDate>=state.calendar.date:o.expires>=state.recruitment.tick);
}
function marketPlayer(id){return findPlayerAnywhere(id)||(state.juniors?.roster||[]).find(p=>samePlayerId(p.id,id))||aiAcademyPlayers().find(p=>samePlayerId(p.id,id));}
function marketClub(id){
 const club=getPlayerClub(id);if(club)return club;
 if(state.juniors?.roster.some(p=>samePlayerId(p.id,id)))return managerClub();
 return Object.entries(state.clubAI?.clubs||{}).find(([,c])=>c.academy.roster.some(p=>samePlayerId(p.id,id)))?.[0]||null;
}
function marketAcademy(club){return club===managerClub()?state.juniors?.roster:clubAIState(club)?.academy.roster;}
function marketCandidates(){
 const entries=[...Object.entries(state.clubRosters||{}),[WORLD_FREE,state.playerWorld?.freeAgents||[]]];
 for(const club of Object.keys(state.world.membership))entries.push([club,(marketAcademy(club)||[]).filter(p=>p.age>=18&&p.contractYears>0)]);
 return [...new Map(entries.flatMap(([team,players])=>players.map(p=>[String(p.id),{...p,team,player:p}]))).values()];
}
function marketAvailability(p){return p.transferListed?'transfer':p.loanListed?'loan':p.marketPreference==='keep'?'keep':'open';}
function setMarketAvailability(id,value){
 const p=marketPlayer(id);if(!p||marketClub(id)!==managerClub()||playerLoan(p)||loanLocked()||!['open','keep','loan','transfer'].includes(value))return;
 p.marketPreference=value;p.transferListed=value==='transfer';p.loanListed=value==='loan';
 if(value!=='transfer')p.askingPrice=null;
 save();render();
}
function marketAvailabilityView(p){
 if(marketClub(p.id)!==managerClub()||playerLoan(p))return '';
 return `<label>Marknadsstatus<select onchange="setMarketAvailability('${haEscape(p.id)}',this.value)">${recruitOptions({open:'Lyssnar på förslag',keep:'Vill helst behålla',loan:'Tillgänglig för lån',transfer:'Tillgänglig för övergång'},marketAvailability(p))}</select></label><p>Statusen påverkar intresset. Du beslutar om varje försäljning och utlåning.</p>`;
}
function marketCooldown(club,p,kind){
 const deals=[...(state.recruitment?.incoming||[]),...(state.clubAI?.offers||[])];
 return deals.some(o=>o.buyer===club&&samePlayerId(o.playerId,p.id)&&(o.kind||'transfer')===kind&&
  (o.status==='pending'||o.closedDate&&calGap(o.closedDate,state.calendar.date)<21&&o.availability===marketAvailability(p)));
}
function marketInterest(club,p,need,kind){
 const c=clubAIState(club);c.interests??={};const key=String(p.id),old=c.interests[key];
 c.interests[key]={playerId:p.id,name:p.name,seller:marketClub(p.id),kind,needRole:need.role,reason:need.reason,
  first:old?.first||state.calendar.date,last:state.calendar.date,status:'scouting',visits:c.scouting[p.id]?.visits||0};
 c.interests=Object.fromEntries(Object.entries(c.interests).sort((a,b)=>b[1].last.localeCompare(a[1].last)).slice(0,36));
}
function incomingStage(o){return ({offer:'Ditt beslut',counter_wait:'Inväntar andra klubbens svar',club_agreed:'Inväntar spelarens beslut'})[o.stage||'offer']||'Ditt beslut';}
function incomingNotice(o,title){
 recruitReport(title||`Nytt ${o.kind==='loan'?'lånebud':'köpbud'}: ${o.name}`,`${o.buyer}. ${o.reason||o.decisionReason||''} ${o.status==='pending'?incomingStage(o)+'. Svar senast '+calText(o.expiresDate):''}`,{incomingId:o.id});
}
function incomingCreate(club,p,need,kind,terms){
 const r=state.recruitment;if(marketCooldown(club,p,kind)||!aiCanCommit(club,p,terms.fee||0,terms.salary,{years:terms.years}))return false;
 const o={id:r.nextId++,playerId:p.id,name:p.name,buyer:club,seller:managerClub(),kind,...terms,
  stage:'offer',status:'pending',date:state.calendar.date,expiresDate:calAdd(state.calendar.date,7),expires:r.tick+2,
  needRole:need.role,decisionReason:need.reason,reason:'Klubben har lämnat ett formellt bud. Du väljer nästa steg.',
  availability:marketAvailability(p),maxFee:Math.round((terms.fee||0)*(need.missing>0?1.3:1.15)),rounds:0,log:[]};
 o.log.push({date:o.date,by:club,action:'offer',terms:{...terms}});r.incoming.unshift(o);
 r.incoming=r.incoming.filter((x,i)=>x.status==='pending'||i<100);
 incomingNotice(o);return true;
}
function incomingClose(o,status,reason){
 o.kind??='transfer';o.expiresDate??=state.calendar.date;
 o.status=status;o.reason=reason;o.closedDate=state.calendar.date;o.stage='closed';
 o.log??=[];o.log.push({date:o.closedDate,by:'system',action:status,reason});
 const c=clubAIState(o.buyer);if(c?.interests?.[o.playerId])c.interests[o.playerId].status=status;
}
function marketPlayerDecision(p,club,o){
 const w=recruitPlayerWishes(p,club);
 if(o.salary<w.salary)return `Spelaren tackar nej: begär minst ${careerMoney(w.salary)} per år.`;
 if(SQUAD_ROLES.indexOf(o.role)<SQUAD_ROLES.indexOf(w.role))return `Spelaren tackar nej: vill ha rollen ${w.role.toLowerCase()}.`;
 if(o.years<w.minYears||o.years>w.maxYears)return `Spelaren tackar nej: önskar ${w.minYears}–${w.maxYears} avtalsår.`;
 if(w.stretch&&o.role!=='Nyckelspelare'&&o.salary<w.salary*1.15)return 'Spelaren tackar nej: klubbens ambition och den erbjudna rollen motiverar inte flytten.';
 return '';
}
function incomingIssue(o,{player=false}={}){
 const p=marketPlayer(o.playerId);
 if(!p||marketClub(p.id)!==(o.seller||managerClub())||p.futureContract||playerLoan(p)||naActive(p))return 'Spelarens klubbtillhörighet eller avtal har ändrats.';
 if(!calendarWindowOpen()||p.lastTransferDate===state.calendar.date)return 'Övergången kan inte registreras denna dag.';
 if(!medicalReady(p))return 'Spelaren är inte tillgänglig för det aktuella behovet.';
 if(!Number.isFinite(o.salary)||o.salary<0||!Number.isFinite(o.fee)||o.fee<0)return 'Ogiltiga ekonomiska villkor.';
 const need=o.needRole&&aiSquadNeeds(o.buyer).find(n=>n.role===o.needRole);
 if(o.needRole&&(!need||!(need.missing||need.qualityGap||need.futureNeed)))return 'Köparen drar sig ur: behovet är redan täckt.';
 if(!aiCanCommit(o.buyer,p,o.fee,o.salary,{years:o.years}))return 'Köparens finansiering eller trupputrymme räcker inte längre. Ingen betalning har gjorts.';
 if(o.kind==='loan'){
  const result=loanTerms(p,o.seller||managerClub(),o.buyer,{...o,id:null,role:o.loanRole});
  if(!result.terms)return result.reason;
  if(['share','days','recall'].some(k=>result.terms[k]!==o[k])||result.terms.role!==o.loanRole)return 'Lånevillkoren är inte längre genomförbara. Ett nytt förslag krävs.';
 }else{
  if(!recruitCanSell(p,o.seller||managerClub()))return 'Spelaren behövs för truppens minsta täckning.';
  const issue=aiRoleOfferIssue(o.buyer,p,{...o,kind:'transfer'});if(issue)return issue;
  if(player)return marketPlayerDecision(p,o.buyer,o);
 }
 return '';
}
function answerIncomingOffer(id,accept){
 if(!managerCanPlay()||loanLocked())return;
 const o=state.recruitment.incoming.find(o=>o.id===id);if(!o||!incomingOfferOpen(o)||(o.stage||'offer')!=='offer')return;
 o.seller??=managerClub();o.kind??='transfer';o.expiresDate??=calAdd(state.calendar.date,7);
 if(!accept){incomingClose(o,'rejected','Du avvisade budet. Klubben avvaktar innan ett nytt försök.');return recruitMessage(o.reason);}
 const issue=incomingIssue(o);if(issue){incomingClose(o,'rejected',issue);return recruitMessage(issue);}
 o.stage='club_agreed';o.approved=true;o.dueDate=calAdd(state.calendar.date,1);
 o.reason='Klubböverenskommelsen är godkänd. Spelaren och registreringen prövas i morgon. Ingen betalning är gjord.';
 o.log??=[];o.log.push({date:state.calendar.date,by:managerClub(),action:'club_agreed'});recruitMessage(o.reason);
}
function counterIncomingOffer(id,amount,days,role,recall){
 if(!managerCanPlay()||loanLocked())return;
 const o=state.recruitment.incoming.find(o=>o.id===id);if(!o||!incomingOfferOpen(o)||(o.stage||'offer')!=='offer')return;
 if(!marketPlayer(o.playerId)||marketClub(o.playerId)!==(o.seller||managerClub()))return;
 const n=Number(amount);if(!Number.isFinite(n)||n<0)return;
 o.original??={fee:o.fee,share:o.share,days:o.days,loanRole:o.loanRole,recall:o.recall};
 o.maxFee??=Math.round(o.fee*1.2);
 if(o.kind==='loan'){
  days=Number(days);if(![0,.25,.5,.75,1].includes(n)||![28,56,0].includes(days)||!LOAN_ROLES[role]||!['anytime','day28'].includes(recall))return;
  Object.assign(o,{share:n,days,loanRole:role,recall,salary:Math.round(marketPlayer(o.playerId).salary*n)});
 }else o.fee=Math.round(n);
 o.rounds=(o.rounds||0)+1;o.stage='counter_wait';o.dueDate=calAdd(state.calendar.date,2);o.expiresDate=calAdd(state.calendar.date,9);o.expires=state.recruitment.tick+2;
 o.reason='Motbud skickat. Den andra klubben svarar om två dagar.';o.log??=[];
 o.log.push({date:state.calendar.date,by:managerClub(),action:'counter',fee:o.fee,share:o.share,days:o.days,role:o.loanRole,recall:o.recall});recruitMessage(o.reason);
}
function incomingDay(){
 if(!state.recruitment||loanLocked())return;
 for(const o of state.recruitment.incoming){
  if(o.status!=='pending')continue;
  o.seller??=managerClub();o.kind??='transfer';o.stage??='offer';
  o.expiresDate??=calAdd(state.calendar.date,Math.max(0,(o.expires-state.recruitment.tick)*7));
  if(!incomingOfferOpen(o)||!calendarWindowOpen()){incomingClose(o,'expired','Svarstiden eller övergångsfönstret löpte ut.');continue;}
  if(!o.dueDate||o.dueDate>state.calendar.date)continue;
  if(o.stage==='counter_wait'){
   const p=marketPlayer(o.playerId);let issue='';
   if(!p||marketClub(p.id)!==o.seller)issue='Spelaren är inte längre tillgänglig.';
   else if(o.kind==='loan'){
    const result=loanTerms(p,o.seller,o.buyer,{...o,id:null,role:o.loanRole});
    if(!result.terms)issue=result.reason;
    else {Object.assign(o,result.terms,{loanRole:result.terms.role,role:'Rotation',salary:Math.round(p.salary*result.terms.share)});}
   }else if(o.fee>(o.maxFee??o.original.fee*1.2))issue='Klubben drar sig ur: ditt motbud överstiger dess värdering.';
   if(!issue)issue=incomingIssue(o);
   if(issue)incomingClose(o,'rejected',issue);
   else {o.stage='offer';o.dueDate=null;o.expiresDate=calAdd(state.calendar.date,7);o.reason='Klubben har svarat. Granska villkoren och godkänn eller avvisa det nya budet.';o.log.push({date:state.calendar.date,by:o.buyer,action:'response',fee:o.fee,share:o.share});}
   incomingNotice(o,`Svar på motbud: ${o.name}`);
  }else if(o.stage==='club_agreed'&&o.approved){
   const issue=incomingIssue(o,{player:true});if(issue){incomingClose(o,'rejected',issue);incomingNotice(o,`Affären stoppad: ${o.name}`);continue;}
   const p=marketPlayer(o.playerId);
   const done=o.kind==='loan'?loanCompleteOffer({playerId:p.id,name:p.name,owner:o.seller,borrower:o.buyer,days:o.days,share:o.share,role:o.loanRole,recall:o.recall,incomingId:o.id}):transferRecruitPlayer(p,o.seller,o.buyer,o.fee,o.salary,o.years,o.role,o.id);
   incomingClose(o,done?'accepted':'rejected',done?(o.kind==='loan'?'Lånet är registrerat. Du följer matcher, istid och återkomst under Aktiva lån.':'Spelaren accepterade. Övergången och betalningen är registrerade.'):'Slutkontrollen stoppade affären.');
   incomingNotice(o,`${done?'Klar affär':'Affären stoppad'}: ${o.name}`);
  }
 }
}
function marketCloseCompeting(id,kind,acceptedId=null){
 for(const o of state.recruitment.incoming)if(o.id!==acceptedId&&o.status==='pending'&&samePlayerId(o.playerId,id))incomingClose(o,'lost','Spelaren har redan valt en annan affär.');
 for(const d of state.recruitment.deals)if(d.status==='pending'&&samePlayerId(d.playerId,id)){d.status='cancelled';d.reason='Spelarens klubbtillhörighet eller åtagande har ändrats.';}
 for(const o of state.loans?.offers||[])if(['pending','counter'].includes(o.status)&&samePlayerId(o.playerId,id)){o.status='cancelled';o.reason='Spelaren är redan bunden i en annan affär.';}
}

// Ordinary temporary transfers (TB 4:4), no implicit dual registration/dispensation.
function loanRegistrationTerms(p,owner,borrower,days){
 if(!calendarWindowOpen()||!state.world.membership[owner]||!state.world.membership[borrower]||p.contractYears<1)return {reason:'Lånet kan inte registreras i dessa klubbar eller på detta datum.'};
 const deadline=`${state.season.year+1}-02-15`,requested=days?calAdd(state.calendar.date,days):deadline;
 const until=requested<deadline?requested:deadline;
 if(until<=state.calendar.date)return {reason:'Det finns ingen låneperiod kvar före övergångsdeadline.'};
 return {until,registration:'temporary',termNote:'Tidsbegränsad övergång. Automatisk återgång senast 15 februari. Ingen dubbelregistrering.'};
}

function marketMoney(value){return Math.round(value||0).toLocaleString('sv-SE')+' kr';}
function incomingDealView(o){
 const p=marketPlayer(o.playerId),loan=o.kind==='loan',active=incomingOfferOpen(o),decision=active&&(o.stage||'offer')==='offer';
 const registration=p&&loan?loanRegistrationTerms(p,o.seller||managerClub(),o.buyer,o.days):null;
 const terms=loan?`<dt>Mottagarens löneandel</dt><dd>${o.share*100} % · ${marketMoney(o.salary)}/år</dd><dt>Din kvarvarande lön</dt><dd>${marketMoney((p?.salary||0)*(1-o.share))}/år</dd><dt>Period</dt><dd>${o.days?o.days+' dagar':'Till deadline'}${registration?.until?' · åter '+calText(registration.until):''}</dd><dt>Roll</dt><dd>${LOAN_ROLES[o.loanRole]}</dd><dt>Återkallelse</dt><dd>${o.recall==='day28'?'Efter 28 dagar inom övergångsfönstret':'Inom övergångsfönstret'}</dd>`:
 `<dt>Ersättning till din klubb</dt><dd>${marketMoney(o.fee)}</dd><dt>Erbjuden lön</dt><dd>${marketMoney(o.salary)}/år</dd><dt>Avtal och roll</dt><dd>${o.years} år · ${o.role}</dd><dt>Köparens totala avtalsåtagande</dt><dd>${marketMoney(o.fee+o.salary*o.years)}</dd><dt>Din lönebesparing</dt><dd>${marketMoney(p?.salary||0)}/år</dd>`;
 const counter=loan?`<label>Mottagarens löneandel<select name="amount">${recruitOptions({0:'0 %',.25:'25 %',.5:'50 %',.75:'75 %',1:'100 %'},o.share)}</select></label><label>Period<select name="days">${recruitOptions({28:'28 dagar',56:'56 dagar',0:'Till deadline'},o.days)}</select></label><label>Roll<select name="role">${recruitOptions(LOAN_ROLES,o.loanRole)}</select></label><label>Återkallelse<select name="recall">${recruitOptions({day28:'Efter 28 dagar',anytime:'Inom fönstret'},o.recall)}</select></label>`:`<label>Ersättning (kr)<input name="amount" type="number" min="0" step="10000" value="${Math.round(o.fee*1.1/10000)*10000}" required></label>`;
 return `<small>${loan?'Inkommande lånebud':'Inkommande köpbud'} · ${active?incomingStage(o):HUB_STATUS[o.status]||o.status}</small><h2>${playerReference(o.playerId,o.name)}</h2><h3>${trainingSafe(o.buyer)}</h3><p><b>Sportsligt motiv:</b> ${trainingSafe(o.decisionReason||'Klubben söker förstärkning till sin trupp.')}</p><dl>${terms}<dt>Bonusar</dt><dd>Inga avtalade</dd></dl><p>${trainingSafe(o.reason||'Klubben väntar på ditt beslut.')}</p>${active?`<p><b>Svar senast:</b> ${o.expiresDate?calText(o.expiresDate):o.expires-state.recruitment.tick+' marknadsomgångar'}${o.dueDate?' · Nästa besked '+calText(o.dueDate):''}</p>`:''}
 ${decision?`<button class="btn" onclick="answerIncomingOffer(${o.id},true)">Godkänn klubböverenskommelsen</button><button class="btn secondary" onclick="answerIncomingOffer(${o.id},false)">Avvisa</button><details><summary>Lämna motbud</summary><form class="sc-fields" onsubmit="event.preventDefault();counterIncomingOffer(${o.id},this.elements.amount.value,${loan?'this.elements.days.value,this.elements.role.value,this.elements.recall.value':"0,'',''"})">${counter}<button class="btn secondary">Skicka motbud</button></form></details>`:''}
 ${loan?'<p>Spelaren förblir kontrakterad hos dig. Matcher, belastning och utveckling följs hos mottagaren.</p>':''}<details><summary>Förhandlingshistorik</summary>${(o.log||[]).map(x=>`<p>${calText(x.date)} · ${trainingSafe(x.by)} · ${trainingSafe(({offer:'Bud',counter:'Motbud',response:'Svar',club_agreed:'Klubböverenskommelse',accepted:'Genomförd',rejected:'Avvisad',lost:'Annan affär',expired:'Utgången'})[x.action]||x.action)}${x.fee!==undefined?' · '+marketMoney(x.fee):''}${x.share!==undefined?' · '+x.share*100+' % lön':''}</p>`).join('')}</details>`;
}
function marketInterestView(){
 const rows=Object.entries(state.clubAI?.clubs||{}).flatMap(([club,c])=>Object.values(c.interests||{}).filter(i=>i.seller===managerClub()&&calGap(i.last,state.calendar.date)<=30&&marketClub(i.playerId)===managerClub()&&!state.recruitment.incoming.some(o=>incomingOfferOpen(o)&&o.buyer===club&&samePlayerId(o.playerId,i.playerId))).map(i=>({...i,club})));
 return `<details class="sc-card"><summary>Intresse för dina spelare (${rows.length})</summary><p>Observerat intresse är ännu inget formellt bud. Klubbar kan avvakta eller välja en annan spelare.</p>${rows.slice(0,15).map(i=>`<p>${playerReference(i.playerId,i.name)} · ${trainingSafe(i.club)} · ${i.kind==='loan'?'undersöker lån':'bevakar'}<small>${trainingSafe(i.reason)}</small></p>`).join('')||'<p>Inget aktuellt intresse rapporterat.</p>'}</details>`;
}

function validateMarketSave(s){
 const r=s.recruitment;if(!r)return;
 const ids=new Set(),date=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d));
 for(const o of r.incoming||[]){
  if(!o.stage)continue; // Legacy records acquire stages only when the market advances.
  if(!Number.isInteger(o.id)||ids.has(o.id)||!['offer','counter_wait','club_agreed','closed'].includes(o.stage)||!['pending','accepted','rejected','expired','lost','cancelled'].includes(o.status)||!date(o.expiresDate)||!Number.isFinite(o.fee)||o.fee<0||!Number.isFinite(o.salary)||o.salary<0||!s.clubRosters[o.buyer]||o.stage==='club_agreed'&&!o.approved||['counter_wait','club_agreed'].includes(o.stage)&&!date(o.dueDate))throw Error('Ett inkommande bud innehåller ogiltiga villkor eller saknar godkännande.');
  if(o.kind==='loan'&&(![0,.25,.5,.75,1].includes(o.share)||![0,28,56].includes(o.days)||!LOAN_ROLES[o.loanRole]||!['day28','anytime'].includes(o.recall)))throw Error('Det inkommande lånebudet är felaktigt.');
  ids.add(o.id);
 }
 for(const j of r.scouting?.jobs||[])if(j.criteria&&(!Number.isFinite(j.criteria.maxSalary)||j.criteria.maxSalary<=0||!RECRUIT_PROFILES[j.criteria.profile]||!SCOUT_LISTS[j.criteria.horizon]))throw Error('Scoutuppdragets kriterier är felaktiga.');
}
