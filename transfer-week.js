"use strict";

// The existing offers own money, consent and registration. A link only delays consent.
function transferLinkRegistrationIssue(o){
 const r=o.replacement;if(!r||['cancelled','failed'].includes(r.status))return '';
 const d=transferLinkDeal(o),p=marketPlayer(r.playerId);
 return r.status!=='secured'||r.club!==managerClub()||o.seller!==r.club||!d||d.kind==='future'||d.status!=='signed'||d.buyer!==r.club||!samePlayerId(d.playerId,r.playerId)||!p||marketClub(p.id)!==r.club||!medicalReady(p)||playerLoan(p)||p.futureContract||naActive(p)?'Ersättarvillkoret är inte längre uppfyllt. Ingen försäljning eller betalning har genomförts.':'';
}
function transferLinkDeal(o){return state.recruitment?.deals.find(d=>d.id===o.replacement?.dealId);}
function transferLinkCandidates(o){
 const outgoing=marketPlayer(o.playerId);if(!outgoing)return [];
 return state.recruitment.deals.filter(d=>d.status==='pending'&&d.kind!=='future'&&d.buyer===managerClub()&&worldGroup(findPlayerAnywhere(d.playerId)||{})===worldGroup(outgoing)&&!state.recruitment.incoming.some(q=>q!==o&&q.status==='pending'&&q.replacement?.status==='waiting'&&(q.replacement.dealId===d.id||samePlayerId(q.playerId,o.playerId))));
}
function transferLinkOffer(id,dealId){
 if(!managerCanPlay()||loanLocked())return false;
 const o=state.recruitment.incoming.find(o=>o.id===Number(id)),d=o&&transferLinkCandidates(o).find(d=>d.id===Number(dealId));
 if(!o||!d||o.kind==='loan'||!incomingOfferOpen(o)||(o.stage||'offer')!=='offer'||(o.seller||managerClub())!==managerClub()||marketClub(o.playerId)!==managerClub()||!calendarWindowOpen())return false;
 o.seller??=managerClub();o.expiresDate??=calAdd(state.calendar.date,Math.max(0,(o.expires-state.recruitment.tick)*7));
 o.replacement={version:1,club:managerClub(),dealId:d.id,playerId:String(d.playerId),name:d.name,date:state.calendar.date,status:'waiting'};
 o.stage='replacement_wait';o.approved=true;o.dueDate=null;
 o.reason=`Du godkänner försäljning först efter att ${d.name} är registrerad och spelklar i din klubb. Köparens svarstid ${calText(o.expiresDate)} ligger fast. Köpet måste finansieras med dagens pengar.`;
 o.log??=[];o.log.push({date:state.calendar.date,by:managerClub(),action:'replacement_wait',reason:o.reason});
 recruitMessage(o.reason);return true;
}
function transferLinkUndo(id){
 if(!managerCanPlay()||loanLocked())return false;
 const o=state.recruitment.incoming.find(o=>o.id===Number(id));if(!o||!incomingOfferOpen(o)||o.stage!=='replacement_wait'||o.replacement?.club!==managerClub())return false;
 o.replacement.status='cancelled';o.stage='offer';o.approved=false;o.dueDate=null;
 o.reason='Villkoret är borttaget. Försäljningen kräver ett nytt godkännande. Köpbudet finns kvar och hanteras separat.';
 o.log.push({date:state.calendar.date,by:managerClub(),action:'link_cancelled',reason:o.reason});recruitMessage(o.reason);return true;
}
function transferLinkAdvance(o){
 const link=o.replacement,d=transferLinkDeal(o),p=d&&marketPlayer(d.playerId);
 if(!link||link.club!==managerClub()||o.seller!==managerClub()){
  incomingClose(o,'cancelled','Det villkorade godkännandet gäller ett tidigare klubbuppdrag.');return;
 }
 if(!d||d.kind==='future'||d.buyer!==link.club||!samePlayerId(d.playerId,link.playerId)||!['pending','signed'].includes(d.status)||d.status==='signed'&&marketClub(link.playerId)!==link.club){
  link.status='failed';o.stage='offer';o.approved=false;o.dueDate=null;
  o.reason='Ersättarens affär blev inte klar för din klubb. Försäljningen är stoppad och kräver ett nytt beslut. Köparens ursprungliga svarstid gäller fortfarande.';
  o.log.push({date:state.calendar.date,by:'system',action:'link_failed',reason:o.reason});incomingNotice(o,'Ersättaren föll bort: '+o.name);return;
 }
 if(d.status!=='signed'||!p||!medicalReady(p)||playerLoan(p)||p.futureContract||naActive(p))return;
 const issue=incomingIssue(o);if(issue){incomingClose(o,'rejected',issue);incomingNotice(o,'Försäljningen stoppad: '+o.name);return;}
 link.status='secured';o.stage='club_agreed';o.dueDate=calAdd(state.calendar.date,1);
 o.reason=`${d.name} är registrerad och spelklar. Ditt villkor är uppfyllt. Säljarens och köparens läge samt spelarens beslut prövas i morgon. Ingen försäljningsintäkt är bokförd ännu.`;
 o.log.push({date:state.calendar.date,by:'system',action:'replacement_secured',reason:o.reason});incomingNotice(o,'Ersättaren är klar: '+o.name);
}
function transferLinkView(o){
 if(o.kind==='loan'||(o.seller||managerClub())!==managerClub())return '';
 const link=o.replacement,waiting=o.status==='pending'&&o.stage==='replacement_wait',choices=transferLinkCandidates(o),d=transferLinkDeal(o),p=marketPlayer(o.playerId);
 if(waiting)return `<section class="tw-link"><h3>Först ersättaren, sedan försäljningen</h3><p>${trainingSafe(link.name)} → ${trainingSafe(o.name)} till ${trainingSafe(o.buyer)}.</p><p><strong>Senast ${calText(o.expiresDate)}.</strong> ${trainingSafe(d?.status==='signed'?'Köpet är registrerat. Spelklarhet och försäljningsvillkor kontrolleras nästa kalenderdag.':'Köpet inväntar besked. Försäljningen väntar.')}</p>${d?`<dl><dt>Köpets reserverade avgift</dt><dd>${money(d.fee)}</dd><dt>Möjlig försäljningsintäkt</dt><dd>${money(o.fee)} · ej tillgänglig</dd><dt>Löneförändring om båda blir klara</dt><dd>${money(d.salary-(p?.salary||0))}/år</dd></dl><button class="desk-link" onclick="officeOpenDeal('transfer:${d.id}')">Granska ersättarens affär →</button>`:''}<p>Du kan förlora köparen medan du väntar. Ersättaren blir kvar om försäljningen senare faller.</p><button class="btn secondary" onclick="transferLinkUndo(${o.id})">Ta bort villkoret och fatta nytt beslut</button></section>`;
 if(o.status!=='pending'||(o.stage||'offer')!=='offer')return link?`<p>Affärskedja: ${trainingSafe(link.name)} → ${trainingSafe(o.name)}. ${trainingSafe(({secured:'Ersättaren blev klar.',failed:'Ersättaren föll bort.',cancelled:'Villkoret återkallades.',ended:'Köparens bud avslutades.'})[link.status]||'')}</p>`:'';
 return `<details class="tw-link"><summary>Sälj först när ersättaren är klar</summary><p>Ett villkorat godkännande väntar tills ett av dina omedelbara köp i samma positionsgrupp är registrerat och spelklart. Köparens svarstid förlängs inte. Köpet reserverar sin fulla kostnad; en möjlig försäljningsintäkt finansierar inget bud.</p>${choices.length?`<form onsubmit="event.preventDefault();transferLinkOffer(${o.id},this.elements.replacement.value)"><label>Ersättarens pågående köp<select name="replacement">${choices.map(d=>`<option value="${d.id}">${trainingSafe(d.name)} · ${money(d.fee)}</option>`).join('')}</select></label><button class="btn secondary">Godkänn med ersättarvillkor</button></form>`:'<p>Skicka först ett köpbud på en ersättare i samma positionsgrupp. Ett köp kan säkra högst en villkorad försäljning.</p>'}</details>`;
}

// Rivals use their real offers and affordability checks. They wait five days for
// an unsigned manager negotiation, but never overturn an accepted agreement.
function transferRivalDeadline(o){return calAdd(o.date,5);}
function transferRivalRows(){
 const relevant=id=>state.recruitment.shortlist.some(x=>samePlayerId(x,id))||state.recruitment.deals.some(d=>d.status==='pending'&&d.buyer===managerClub()&&samePlayerId(d.playerId,id));
 return (state.clubAI?.offers||[]).filter(o=>o.kind==='transfer'&&o.buyer!==managerClub()&&o.seller!==managerClub()&&relevant(o.playerId)&&o.status==='pending'&&!aiValidateOffer(o));
}
function transferRivalSettled(d,o){
 d.reason=`${o.buyer} kom överens med ${o.name} medan dina villkor fortfarande var osignerade. Ditt reserverade utrymme är frigjort.`;
 recruitmentRecord(d,'Rivalen hann före',d.reason);recruitReport('Rivalen säkrade '+o.name,d.reason,{dealId:d.id});
}
function transferWeekDay(){
 if(!managerEmployed()||loanLocked())return;
 for(const o of transferRivalRows()){
  const d=state.recruitment.deals.find(d=>samePlayerId(d.playerId,o.playerId)&&d.status==='pending'&&d.buyer===managerClub());
  if(!d)continue;
  managerMessage(`transfer-rival:${managerClub()}:${o.id}`,`Ett riktigt rivalbud på ${o.name}`,`${o.buyer} har lämnat ett finansierat bud. ${o.reason} Om din förhandling fortfarande saknar accepterade villkor ${calText(transferRivalDeadline(o))} kan spelaren välja rivalen. Ett accepterat motbud prövas enligt din överenskommelse.`,'Sportchefen',{link:'transfers',dealId:d.id});
 }
}

// Reactions describe changed opportunities, not fabricated broken match promises.
function transferCommitment(p){
 const s=state.stories?.active.find(s=>s.club===managerClub()&&s.status==='following'&&s.type==='breakthrough'&&s.ids.some(id=>samePlayerId(id,p.id)));
 if(s)return {text:`Du gav en provperiod: ${s.expectation?.detail||'ökat ansvar som följs i tävlingsmatcher.'}`,trial:true};
 const q=p.recruitmentPromise;if(q&&!q.resolved&&(!q.club||q.club===managerClub()))return {text:`Ditt tidigare rollöfte: ${q.role}, ${rolePromiseTarget(q)}.`,trial:false};
 if(lockerPlayerPromises(p).length)return {text:'Du har ett aktivt individuellt löfte som fortfarande följs i matcherna.',trial:false};
 return null;
}
function transferWeekBefore(p,seller,buyer,role){
 if(!managerEmployed()||![seller,buyer].includes(managerClub()))return [];
 const arrival=buyer===managerClub(),group=worldGroup(p),rows=[];
 for(const q of managerRoster()){
  if(samePlayerId(q.id,p.id)||worldGroup(q)!==group)continue;
  const prior=transferCommitment(q);if(!prior)continue;
  if(arrival&&SQUAD_ROLES.indexOf(role)<SQUAD_ROLES.indexOf(q.promisedRole||'Rotation')&&!prior.trial)continue;
  rows.push({playerId:String(q.id),name:q.name,kind:arrival?'competition':'opening',prior:prior.text,trial:prior.trial});
 }
 rows.sort((a,b)=>Number(b.trial)-Number(a.trial)||a.playerId.localeCompare(b.playerId));
 const own=seller===managerClub()&&transferCommitment(p);
 if(own)rows.unshift({playerId:String(p.id),name:p.name,kind:'departure',prior:own.text,trial:own.trial});
 return rows.slice(0,3);
}
function transferWeekStore(){
 return state.clubOffice.transferWeek??={version:1,nextId:1,reactions:[]};
}
function transferWeekAfter(p,seller,buyer,context){
 if(!context?.length)return;
 const b=transferWeekStore(),club=managerClub(),transaction=state.recruitment.history[0].id;
 for(const r of context){
  if(b.reactions.some(q=>q.transaction===transaction&&q.playerId===r.playerId))continue;
  const q=marketPlayer(r.playerId);if(!q)continue;playerSocialIdentity(q);journeyTrack(q);
  const body=r.kind==='competition'?`${p.name} har värvats i din positionsgrupp. ${r.prior} Du vill veta hur det beskedet ska rymmas i den nya konkurrensen. Löftet är ännu inte bedömt som brutet.`:r.kind==='opening'?`${p.name} har lämnat för ${buyer}. ${r.prior} Det finns en öppning, men speltiden är ännu inte fördelad.`:`Du har sålt spelaren till ${buyer}. ${r.prior} Den gemensamma provperioden kan inte fortsätta i din trupp; den bedöms inte som missad istid.`;
  const row={id:b.nextId++,transaction,club,playerId:r.playerId,name:q.name,otherId:String(p.id),other:p.name,kind:r.kind,prior:r.prior,trial:r.trial,date:state.calendar.date,body,status:r.kind==='departure'?'closed':'open',response:null};
  b.reactions.push(row);
  relationshipChange(q,r.kind==='competition'?-1:0,r.kind==='competition'?'Ny konkurrens väcker frågor':r.kind==='opening'?'En plats öppnas i laget':'En övergång efter ditt tidigare besked',body);
  managerMessage(`transfer-reaction:${club}:${transaction}:${r.playerId}`,`${q.name}: ${r.kind==='competition'?'hur blir det med mitt besked?':r.kind==='opening'?'är det min tur nu?':'vår gemensamma väg ändras'}`,body,'Omklädningsrum',{link:'transfers',playerId:q.id});
 }
 // Retain at most 60 desk questions; full player journals retain the memories.
 while(b.reactions.length>60){const i=b.reactions.findIndex(r=>r.status==='closed');if(i<0){b.reactions.shift();break;}b.reactions.splice(i,1);}
}
function transferReactionCommitment(r){const p=marketPlayer(r.playerId),c=p&&transferCommitment(p);return c?.text===r.prior;}
function transferReactionAnswer(id,choice){
 if(!managerCanPlay()||loanLocked()||!['competition','commitment'].includes(choice))return false;
 const r=state.clubOffice.transferWeek?.reactions.find(r=>r.id===Number(id)&&r.club===managerClub()&&r.status==='open'),p=r&&managerRoster().find(p=>samePlayerId(p.id,r.playerId));if(!r||!p)return false;
 if(choice==='commitment'&&!transferReactionCommitment(r))return false;
 r.status='closed';r.response=choice;
 const text=choice==='commitment'?`Du står fast vid det tidigare beskedet och granskar uttagningen. ${r.prior} Befintlig uppföljning fortsätter; inga nya löften eller extra förtroendepoäng delas ut.`:'Du förklarar att konkurrensen är öppen och att en ledig plats måste förtjänas. Befintliga avtal och löften gäller fortfarande och följs mot faktisk istid.';
 socialRemember(p,'Samtal efter transferbeslutet',text);save();render();return true;
}
function transferReactionsView(){
 const rows=state.clubOffice?.transferWeek?.reactions.filter(r=>r.club===managerClub()&&r.status==='open'&&marketClub(r.playerId)===managerClub())||[];
 return rows.length?`<section class="tw-reactions"><h3>Spelarna minns dina besked</h3>${rows.slice().reverse().map(r=>`<article><strong>${playerReference(r.playerId,r.name)}</strong><p>${trainingSafe(r.body)}</p><button class="btn secondary" onclick="transferReactionAnswer(${r.id},'competition')">Förklara konkurrensen</button>${transferReactionCommitment(r)?`<button class="btn secondary" onclick="transferReactionAnswer(${r.id},'commitment')">Stå fast vid tidigare besked</button>`:''}<button class="desk-link" onclick="deskNavigate('lines')">Granska uttagningen →</button></article>`).join('')}</section>`:'';
}
function transferWeekView(){
 const date=state.calendar.date,club=managerClub(),b=managerRecruitmentBudget(),links=state.recruitment.incoming.filter(o=>o.status==='pending'&&o.stage==='replacement_wait'&&o.seller===club),rivals=transferRivalRows();
 const recent=state.recruitment.history.filter(h=>[h.buyer,h.seller].includes(club)&&h.date&&calGap(h.date,date)>=0&&calGap(h.date,date)<=7).slice(0,5);
 const due=hubAffairRows().filter(row=>row.status==='pending'&&(row.d.buyer===club||row.d.seller===club)).map(row=>({...row,due:row.key.startsWith('incoming:')?row.d.expiresDate:row.d.dueDate})).filter(row=>row.due&&row.due>=date&&calGap(date,row.due)<=7).sort((a,b)=>a.due.localeCompare(b.due)).slice(0,5);
 return `<section class="transfer-week sc-card" aria-label="Din transfervecka"><header><div><span class="desk-kicker">NÄSTA SJU DAGAR</span><h2>Din transfervecka</h2></div><span>${calText(date)} – ${calText(calAdd(date,7))}</span></header><div class="tw-finance"><p><strong>${money(b.availableCash)}</strong><small>Kassa efter reserverade köp</small></p><p><strong>${money(b.wageRoom)}/år</strong><small>Löneutrymme efter bud och lån</small></p><p><strong>${links.length}</strong><small>Försäljningar väntar på ersättare</small></p></div>${due.length?`<details open><summary>Besked och sista svarsdagar</summary>${due.map(row=>`<p><button class="desk-link" onclick="officeOpenDeal('${row.key}')">${trainingSafe(row.name)} →</button> · ${calText(row.due)} · ${trainingSafe(row.key.startsWith('incoming:')?'Sista svarsdag':row.d.counter?'Svara på motbud':recruitDealAgreed(row.d)?'Registrering':'Besked')}</p>`).join('')}</details>`:'<p>Inga daterade budbesked de närmaste sju dagarna. Starta från spelarsökningen eller ett inkommande bud.</p>'}${rivals.length?`<details open><summary>Rivalernas faktiska bud (${rivals.length})</summary>${rivals.slice(0,6).map(o=>`<p>${playerReference(o.playerId,o.name)} · <strong>${trainingSafe(o.buyer)}</strong><br>${trainingSafe(o.reason)}<br>Rivalens bud behandlas tidigast ${calText(o.due)}. En osignerad förhandling hos dig kan förlora spelaren från ${calText(transferRivalDeadline(o))}.</p>`).join('')}</details>`:''}${recent.length?`<details><summary>Veckans genomförda övergångar</summary>${recent.map(h=>`<p>${calText(h.date)} · ${trainingSafe(h.name)} · ${trainingSafe(h.seller)} → ${trainingSafe(h.buyer)} · ${money(h.fee)}</p>`).join('')}</details>`:''}${transferReactionsView()}</section>`;
}
function validateTransferWeek(s){
 const date=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v)),str=v=>typeof v==='string'&&v.length<=12000,object=v=>v&&typeof v==='object'&&!Array.isArray(v),fail=()=>{throw Error('Ogiltig transfervecka eller affärskedja i sparfilen.');};
 const linked=new Set(),outgoing=new Set();
 for(const o of s.recruitment?.incoming||[]){
  const r=o.replacement;if(o.stage==='replacement_wait'&&!r)fail();if(!r)continue;
  if(!object(r)||r.version!==1||!Number.isInteger(r.dealId)||!str(r.playerId)||!str(r.name)||!str(r.club)||!date(r.date)||!['waiting','secured','failed','cancelled','ended'].includes(r.status)||r.club!==o.seller)fail();
  if(o.stage==='replacement_wait'||o.status==='pending'&&r.status==='secured'){
   const d=s.recruitment.deals.find(d=>d.id===r.dealId);
   if(o.status!=='pending'||o.stage==='replacement_wait'&&r.status!=='waiting'||r.status==='secured'&&o.stage!=='club_agreed'||!o.approved||o.kind==='loan'||!d||d.kind==='future'||d.buyer!==r.club||!samePlayerId(d.playerId,r.playerId)||linked.has(r.dealId)||outgoing.has(String(o.playerId)))fail();linked.add(r.dealId);outgoing.add(String(o.playerId));
  }
 }
 const check=o=>{
  const b=o?.transferWeek;if(!b)return;
  if(!object(b)||b.version!==1||!Number.isInteger(b.nextId)||b.nextId<1||!Array.isArray(b.reactions)||b.reactions.length>60)fail();
  const ids=new Set();for(const r of b.reactions){if(!object(r)||!Number.isInteger(r.id)||r.id<1||r.id>=b.nextId||ids.has(r.id)||!Number.isInteger(r.transaction)||!['competition','opening','departure'].includes(r.kind)||!['open','closed'].includes(r.status)||!['competition','commitment',null].includes(r.response)||typeof r.trial!=='boolean'||!date(r.date)||['club','playerId','name','otherId','other','prior','body'].some(k=>!str(r[k])))fail();ids.add(r.id);}
 };
 check(s.clubOffice);for(const bank of Object.values(s.managerCareer?.bank||{}))check(bank.clubOffice);
}
const transferWeekIncomingView=incomingDealView;
incomingDealView=function(o){return transferWeekIncomingView(o)+transferLinkView(o);};
const transferWeekAffairs=hubAffairs;
hubAffairs=function(tab){return transferWeekView()+transferWeekAffairs(tab);};

const transferWeekAgenda=managerLinkedDecisionItems;
managerLinkedDecisionItems=function(){return [...transferWeekAgenda(),...(state.clubOffice?.transferWeek?.reactions||[]).filter(r=>r.club===managerClub()&&r.status==='open'&&marketClub(r.playerId)===managerClub()).map(r=>({id:'transfer-reaction:'+r.id,title:r.name+': följ upp ditt transferbeslut',detail:r.body,owner:'Du',tag:'Omklädningsrum',area:'transfers',requiresDecision:false,level:'high',score:78,action:{page:'transfers',tab:'deals'}}))];};
