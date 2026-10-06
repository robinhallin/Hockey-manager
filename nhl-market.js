"use strict";
// A European-career market, not a playable NHL front office or a full CBA implementation.
// All financial limits below are explicit game-balancing values in SEK.
const NA_MARKET_RULES=Object.freeze({version:2,contracts:12,wages:108000000,fees:6000000,decisionDays:3});
function naRights(p,date=state.calendar?.date){
 if(naActive(p))return {team:p.naContract.team,kind:'contract',until:p.naContract.end};
 if(p.naRights)return p.naRights.team&&date<=p.naRights.until?{team:p.naRights.team,kind:'retained',until:p.naRights.until}:{team:null,kind:'free',until:null};
 if(nhlRightsActive(p,date))return {team:p.nhlDraft.club,kind:'draft',until:p.nhlDraft.expires};
 return {team:null,kind:'free',until:null};
}
function naTerms(p){
 const entry=!(p.naHistory?.length)&&p.age<=24,years=entry?(p.age<=21?3:p.age<=23?2:1):(p.age>=32?1:2);
 const ability=naAbility(p),type=entry?'entry':ability>=15?'one-way':'two-way';
 const nhlSalary=entry?Math.round((7500000+Math.max(0,Math.min(3,ability-11))*500000)/10000)*10000:Math.round(Math.max(9000000,(ability-10)*2400000)/10000)*10000;
 return {contractType:type,years,nhlSalary,ahlSalary:type==='one-way'?nhlSalary:Math.round((650000+Math.max(0,ability-11)*125000)/10000)*10000,end:`${state.season.year+years}-06-30`};
}
function naChooseTeam(p){
 const rights=naRights(p);if(rights.team)return rights.team;
 const counts=new Map(NHL_CLUBS.map(t=>[t,{total:0,peers:0}]));
 for(const q of naPlayers()){const row=counts.get(q.naContract.team);if(row){row.total++;if(worldGroup(q)===worldGroup(p))row.peers++;}}
 for(const o of state.northAmerica.offers)if(o.status==='pending'){const row=counts.get(o.team);if(row)row.total++;}
 return NHL_CLUBS.map(team=>({team,...counts.get(team),score:naAbility(p)-counts.get(team).peers*1.2+attrSeed(`${team}:${p.id}:market`)*2}))
  .filter(t=>t.total<NA_MARKET_RULES.contracts).sort((a,b)=>b.score-a.score||a.team.localeCompare(b.team))[0]?.team||null;
}
function naReservations(team,exclude){
 const offers=(state.northAmerica?.offers||[]).filter(o=>o.team===team&&o.id!==exclude&&o.status==='pending');
 return {contracts:offers.length,wages:offers.reduce((n,o)=>n+o.nhlSalary,0),fees:offers.reduce((n,o)=>n+o.fee,0)};
}
function naFunded(team,terms,exclude){
 const b=naBudget(team),r=naReservations(team,exclude);
 return b.contracts+r.contracts<NA_MARKET_RULES.contracts&&b.committed+r.wages+naRenewalReserved(team)+terms.nhlSalary<=NA_MARKET_RULES.wages&&b.fees+r.fees+terms.fee<=NA_MARKET_RULES.fees;
}
function naPlayerDecision(p,o,mode){
 const identity=playerPreferenceProfile(p,o.origin),ambition=identity.ambition??10,loyalty=identity.loyalty??10;
 const expected=naAbility(p)>=14.5?'NHL':'AHL',back=mode==='loanback';
 const reasons=[];let score=ambition*.6-loyalty*.25+3;
 if(back){score+=p.age<=21?5:-5;reasons.push('Återlånet vägs mot utveckling och viljan att flytta nu.');}
 else if(expected==='NHL'){score+=6;reasons.push('En konkurrenskraftig chans till NHL väger tungt.');}
 else {score+=p.age<=23?3:-8;reasons.push(p.age<=23?'AHL erbjuder en utvecklingsväg.':'En etablerad spelare kräver starkare skäl för att välja AHL.');}
 const pay=back?o.ahlSalary:expected==='NHL'?o.nhlSalary:o.ahlSalary;
 if(pay<(p.salary||0)*.8){score-=5;reasons.push('Den sannolika lönen innebär en tydlig sänkning.');}
 if(p.age>=30&&!back&&expected==='AHL')score-=4;
 return {accepted:score>=3,score,expected,reason:reasons.join(' ')};
}
function naApprove(o,mode){
 if(!o||o.status!=='pending'||o.stage==='player'||!['move','loanback'].includes(mode)||naLocked()||state.calendar.date>o.expires)return false;
 const p=naFind(o.playerId);if(!p||!naOfferWindow(p,o)||!naInterested(p)||!naCanLeave(p,o.origin)||mode==='loanback'&&!o.loanback)return false;
 if(!o.release?.automatic&&!nhlOwned(p)&&mode==='move'&&naDepartureRisk(p,o.origin))return false;
 const existingCost=(state.clubRosters[o.origin]||[]).includes(p)||p.academy?.seniorContract?p.salary:0;
 if(mode==='loanback'&&(!state.world.membership[o.origin]||!naLoanRoom(p,o.origin,o.share,existingCost)))return false;
 if(internationalPlayers().find(r=>samePlayerId(r.p.id,p.id))?.club!==o.origin)return false;
 const rights=naRights(p);if(rights.team&&rights.team!==o.team||!naFunded(o.team,o,o.id))return false;
 o.stage='player';o.mode=mode;o.dueDate=calAdd(state.calendar.date,NA_MARKET_RULES.decisionDays);
 o.expires=o.expires<o.dueDate?o.dueDate:o.expires;
 naLog(p,'club-agreed',`${o.team}: klubben har godkänt ${mode==='loanback'?'återlån':'flytt'}. Spelaren och agenten tar ställning ${calText(o.dueDate)}.`);
 return true;
}
function naLoanReserved(club){return (state.northAmerica?.loanRequests||[]).filter(o=>o.status==='pending'&&o.borrower===club).reduce((n,o)=>n+(o.salary||0),0);}
function naProcessOffers(date){
 if(naLocked())return;
 for(const o of state.northAmerica.offers.filter(o=>o.status==='pending'&&o.stage==='player'&&o.dueDate<=date)){
  const p=naFind(o.playerId);if(!p){o.status='expired';o.reason='Spelaren saknas.';continue;}
  const decision=naPlayerDecision(p,o,o.mode);o.playerDecision={...decision,date};
  if(!decision.accepted){o.status='rejected';o.reason='Spelaren avböjde. '+decision.reason;naLog(p,'player-declined',o.reason);}
  else if(!naSign(o,o.mode)){o.status='expired';o.reason='Avtalet kunde inte registreras: rättigheter, fönster, trupp eller budget har ändrats.';}
  if(o.status!=='signed'&&o.origin===managerClub())managerMessage(`na-decision:${o.id}`,`${p.name}: NHL-besked`,o.reason,'Sportchefen',{link:'transfers'});
 }
}
function naLoanDecision(p,club){
 const c=p.naContract,peers=naPlayers(c.team).filter(q=>q!==p&&worldGroup(q)===worldGroup(p));
 const nhlReady=naAbility(p)>=14.5,covered=peers.some(q=>naAbility(q)>=naAbility(p));
 if(nhlReady&&!covered)return {accepted:false,reason:'NHL-klubben behöver spelaren som närmaste uppflyttningsalternativ.'};
 if(!loanFit(p,club).interested)return {accepted:false,reason:'Spelaren ser inte rätt roll eller utvecklingsmiljö hos klubben.'};
 return {accepted:true,reason:c.development?.seekingEurope?'Spelaren önskar Europalån och NHL-klubben godkänner utvecklingsmiljön.':'NHL-klubben godkänner utvecklingsmiljön och spelaren accepterar rollen.'};
}
function naProcessLoans(date){
 if(naLocked())return;
 const w=state.northAmerica;
 for(const o of w.loanRequests.filter(o=>o.status==='pending'&&o.dueDate<=date)){
  const p=w.abroad.find(q=>samePlayerId(q.id,o.playerId));
  o.status='rejected';
  if(o.borrower!==managerClub()||!managerEmployed()){o.reason='Klubbuppdraget har ändrats.';continue;}
  if(!p||!naActive(p)||p.naContract.team!==o.owner||p.naContract.assignment!=='AHL'||p.naContract.end<date||!calendarWindowOpen()||internationalAway(p)||!medicalReady(p)||p.naLastGame===date){o.reason='Registrering, tillgänglighet eller övergångsfönster har ändrats.';}
  else {const decision=naLoanDecision(p,o.borrower);o.reason=decision.reason;
   if(decision.accepted&&naLoanRoom(p,o.borrower,o.share)){w.abroad=w.abroad.filter(q=>q!==p);naAttachLoan(p,o.borrower,o.share);syncManagerRoster();repairMedicalLines();o.status='signed';}
   else if(decision.accepted)o.reason='Trupp- eller löneutrymmet räcker inte längre.';
  }
  managerMessage(`na-loan-decision:${o.id}`,`${o.name}: besked om NHL-lån`,o.status==='signed'?'Säsongslånet är registrerat.':o.reason,'Sportchefen',{link:'transfers'});
 }
 w.loanRequests=w.loanRequests.filter(o=>o.status==='pending').concat(w.loanRequests.filter(o=>o.status!=='pending').slice(0,48));
}
function naCancelLoan(id){
 if(naLocked()||!managerEmployed())return false;
 const o=state.northAmerica?.loanRequests?.find(o=>o.id===Number(id)&&o.borrower===managerClub()&&o.status==='pending');
 if(!o)return false;o.status='cancelled';o.reason='Du drog tillbaka förfrågan.';
 return naNotice(`${o.name}: låneförfrågan är återtagen och löneutrymmet frigjort.`,true);
}
function naRightsAtExpiry(p,c){
 // Deliberately a retained-rights game model, not an assertion of legal RFA eligibility.
 const retained=c.renewal?c.renewal.status==='retained':p.age<27&&naAbility(p)>=12;
 p.naRights={team:retained?c.team:null,kind:retained?'retained':'free',until:`${state.season.year+1}-06-30`,reason:retained?'NHL-klubben behåller förhandlingsrätten i spelmodellen. Ett europeiskt avtal är tillåtet.':'NHL-klubben släpper rättigheterna i spelmodellen.'};
}
function naStatusView(p){
 const rights=naRights(p),c=p.naContract,origin=getPlayerClub(p.id),o=state.northAmerica?.offers.find(o=>samePlayerId(o.playerId,p.id)&&o.status==='pending');
 const blocked=c?'Köp blockerat av NHL-avtal. Pröva lån eller invänta kontraktsslut.':o?'Ett NHL-erbjudande pågår. Ingen flytt är klar.':rights.team?'NHL-rättigheten begränsar NHL-valet, inte ett europeiskt kontrakt.':'Ingen aktiv NHL-rättighet registrerad.';
 return `<section class="sc-card na-status"><h3>NHL · avtalsläge</h3><dl><dt>Registrerad hos</dt><dd>${trainingSafe(origin||'Ingen klubb')}</dd><dt>NHL-rättighet</dt><dd>${trainingSafe(rights.team||'Fri NHL-marknad')}${rights.until?' · till '+calText(rights.until):''}</dd><dt>Kontraktsägare</dt><dd>${trainingSafe(c?.team||origin||'Ingen')}</dd></dl><p>${blocked}</p>${c?`<p>${({'entry':'Entry-level','one-way':'Envägsavtal','two-way':'Tvåvägsavtal'})[c.contractType]||'Äldre utvecklingsavtal'} · ${trainingSafe(c.assignmentReason||'Placering bedöms efter avtal.')}</p>`:''}${o?`<p>${o.stage==='player'?'Spelaren och agenten lämnar besked '+calText(o.dueDate):'Klubbens beslut väntar'}.</p>`:''}<button class="rd-link" onclick="naOpen()">Granska NHL-affärer →</button>${naReleaseView(p)}</section>`;
}
function naRecruitmentView(){
 const w=state.northAmerica;if(!w)return '';
 const offers=w.offers.filter(o=>o.origin===managerClub()&&o.status==='pending'),loans=(w.loanRequests||[]).filter(o=>o.borrower===managerClub()).slice(0,8);
 const returns=(state.playerWorld?.freeAgents||[]).filter(p=>p.naHistory?.length).slice(0,8);
 return `<details class="sc-card na-market-desk"><summary>NHL · ${offers.length} pågående affärer · ${loans.filter(o=>o.status==='pending').length} låneförfrågningar · ${returns.length} återvändare</summary><div><p>${offers.length} pågående utlandsaffärer. Klubbeslut, spelarbeslut och registrering är separata steg.</p>${offers.map(o=>`<p>${playerReference(o.playerId,o.name)} · ${trainingSafe(o.team)} · ${o.stage==='player'?'Spelarbesked '+calText(o.dueDate):'Ditt beslut senast '+calText(o.expires)} · ${careerMoney(o.fee)} i möjlig ersättning</p>`).join('')}${loans.map(o=>`<p>${playerReference(o.playerId,o.name)} · låneförfrågan: ${o.status==='pending'?'besked '+calText(o.dueDate):o.status==='signed'?'registrerat lån':trainingSafe(o.reason)}${o.status==='pending'?` <button class="rd-link" onclick="naCancelLoan(${o.id})">Dra tillbaka</button>`:''}</p>`).join('')}<button class="rd-link" onclick="naOpen()">Hantera NHL-affärer och lån →</button>${returns.length?`<h3>Återvändare utan klubbavtal</h3>${returns.map(p=>`<p>${playerReference(p.id,p.name)} · ${(state.clubAI?.offers||[]).filter(o=>o.status==='pending'&&samePlayerId(o.playerId,p.id)).length} konkurrerande bud · ${trainingSafe(naRights(p).team?'NHL-rättigheter hos '+naRights(p).team:'Fri NHL-marknad')} · <button class="rd-link" onclick="recruitOpen('${haEscape(p.id)}')">Scouting och kontraktsförhandling →</button></p>`).join('')}`:''}<small>Rättigheter och ekonomiska ramar följer den dokumenterade spelmodellen, inte hela NHL:s kollektivavtal.</small></div></details>`;
}
