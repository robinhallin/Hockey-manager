"use strict";

// Contract facts only: a shortlist entry or a planned lineup is never a signing.
function squadNextSeason(){
 const club=managerClub(),current=managerRoster(),seniors=(state.juniors?.roster||[]).filter(p=>p.academy?.seniorContract),loans=state.loans?.active||[];
 const ownedLoans=loans.filter(l=>l.owner===club).map(loanPlayer).filter(Boolean);
 const universe=[...current,...seniors,...ownedLoans,...Object.values(state.clubRosters||{}).flat(),...(state.playerWorld?.freeAgents||[]),...(state.loans?.external||[])];
 const unique=[...new Map(universe.map(p=>[String(p.id),p])).values()];
 const rows=unique.flatMap(p=>{
  const loan=playerLoan(p),owned=loan?loan.owner===club:[...current,...seniors].some(q=>samePlayerId(q.id,p.id)),signed=p.futureContract?.buyer===club;
  if(!owned&&!signed&&!current.some(q=>samePlayerId(q.id,p.id)))return [];
  const secured=signed||owned&&p.contractYears>1&&!p.futureContract;
  const status=signed?'Klar för nästa säsong':loan&&loan.owner!==club?'Inlånad · återgår':p.futureContract?'Klar för annan klubb':!secured?'Utgående avtal':loan?'Återvänder från lån':'Stannar';
  return [{p,secured:Boolean(secured),status,salary:signed?p.futureContract.salary:p.salary,role:signed?p.futureContract.role:p.promisedRole}];
 });
 const groups=Object.entries({MV:['Målvakter',2],B:['Backar',6],F:['Forwards',12]}).map(([key,[name,target]])=>{
  const players=rows.filter(r=>r.secured&&worldGroup(r.p)===key);
  return {key,name,target,players,missing:Math.max(0,target-players.length)};
 });
 return {rows,groups,room:calendarFutureRoom(),reserved:state.recruitment.deals.filter(d=>d.status==='pending'&&(d.kind==='future'||d.years>1)&&(!d.buyer||d.buyer===club)).reduce((n,d)=>n+d.salary,0)};
}
function squadNextSeasonView(){
 const s=squadNextSeason();
 return `<section class="sc-card"><h2>Avtal inför nästa säsong</h2><p>${s.rows.filter(r=>r.secured).length} säkrade spelare · ${scoutingCash(s.room)} kvar i prognostiserat löneutrymme. Pågående bud reserverar ${scoutingCash(s.reserved)} och är redan avräknade. Budgeten bygger på dagens nivå.</p><p>${s.groups.map(g=>`${g.name}: ${g.players.length}/${g.target}${g.missing?' · '+g.missing+' öppna platser':' · grundbemanning säkrad'}`).join(' · ')}</p><p>Rollöften och kvalitet behöver också granskas. Juniorer och osignerade kandidater räknas först när ett senioravtal eller en övergång är klar.</p><details><summary>Visa spelare, roller och ersättaruppdrag</summary><div class="workspace-table"><table><thead><tr><th>Spelare</th><th>Avtalsläge</th><th>Roll</th><th>Årslön nästa säsong</th><th>Nästa steg</th></tr></thead><tbody>${s.rows.map(r=>`<tr><td>${playerReference(r.p.id,r.p.name)}</td><td>${r.status}</td><td>${trainingSafe(r.role||'Ej bestämd')}</td><td>${r.secured?scoutingCash(r.salary):'Ej säkrad'}</td><td>${!r.secured?`<button class="rh-link" onclick="scoutingReplace('${haEscape(r.p.id)}')">Scouta ersättare</button>`:'Avtal finns'}</td></tr>`).join('')}</tbody></table></div></details></section>`;
}
function scoutingReplacement(id,chosenProfile=null){
 const row=squadNextSeason().rows.find(r=>samePlayerId(r.p.id,id));if(!row)return null;
 const p=row.p,profile=chosenProfile||(p.pos==='MV'?'Målvakt':p.pos==='B'?'Defensiv back':p.pos==='C'?'Spelfördelare':'Målskytt');
 return {replacementId:p.id,replacementName:p.name,position:p.pos,profile,replacementLevel:attributeWeighted(ensurePlayerAttributes(p),RECRUIT_PROFILES[profile].weights)};
}
function scoutingReplace(id){
 if(loanLocked()||!managerCanPlay())return false;
 const replacement=scoutingReplacement(id);if(!replacement)return false;
 const room=Math.max(0,calendarFutureRoom()),p=findPlayerAnywhere(id);if(room<10000){recruitMessage('Nästa säsongs löneutrymme är slut. Frigör utrymme innan ett ersättaruppdrag beställs.');return false;}
 const criteria={...replacement,placement:p?.promisedRole==='Nyckelspelare'?'Nyckelspelare':'Ordinarie',maxSalary:Math.floor(Math.min(room,Math.max(250000,p?.salary||0))/10000)*10000,maxAge:32,horizon:'next',league:'ALL',targetRole:p?.promisedRole==='Nyckelspelare'?'key':'regular',confidence:'possible'};
 const person=scoutingPerson(scoutingStaff().find(s=>!scoutingBusy(s))||scoutingStaff()[0]);
 scoutDesk.draft={players:[],method:'detail',person,profile:criteria.profile,horizon:'next',criteria};
 deskNavigate('transfers','missions');return true;
}
function scoutingReplacementFit(p,c){
 if(c.position&&p.pos!==c.position)return null;
 const fit=scoutingPlacementAssessment(p,c.profile,c.placement,c.targetRole,c.horizon);if(!fit)return null;
 // A replacement must also reach the departing player's observed role level.
 const threshold=Math.max(fit.threshold,Number(c.replacementLevel)||0);
 return {...fit,threshold,possible:fit.high>=threshold,supported:fit.known&&fit.center>=threshold};
}
function loanDestinationAssessment(p,club){
 const fit=loanFit(p,club),peers=(state.clubRosters[club]||[]).filter(q=>!samePlayerId(q.id,p.id)&&loanGroup(q)===loanGroup(p));
 const returning=(state.loans?.active||[]).filter(l=>l.owner===club).map(loanPlayer).filter(q=>q&&!samePlayerId(q.id,p.id)&&loanGroup(q)===loanGroup(p));
 const all=[...new Map([...peers,...returning].map(q=>[String(q.id),q])).values()];
 const fullRank=1+all.filter(q=>matchAttributeRating(q)>matchAttributeRating(p)).length,limit=({MV:2,B:6,F:10})[loanGroup(p)];
 const terms=loanTerms(p,getPlayerClub(p.id),club,{id:null,days:56,share:.5,role:'regular',recall:'day28'});
 const sustainable=fullRank<=limit;
 return {club,rank:fit.rank,fullRank,sustainable,available:Boolean(terms.terms),terms:terms.terms,score:(terms.terms?100:0)+(sustainable?20:0)-fullRank,
  text:`Bedömd plats ${fit.rank} bland spelklara; ${fullRank} när skadade och utlånade alternativ återkommer. ${sustainable?'Regelbunden speltid har stöd i konkurrensbilden.':'Risk att speltiden minskar när konkurrenter återkommer.'} ${terms.reason} Bedömningen är ingen garanti.`};
}
function loanDestinationView(p,clubs){
 const rows=clubs.map(c=>loanDestinationAssessment(p,c)).sort((a,b)=>b.score-a.score);
 return `<details class="sc-card"><summary>Jämför låneklubbar · konkurrens och villkor</summary>${rows.slice(0,8).map(r=>`<article><h4>${trainingSafe(r.club)} · ${leagueOf(r.club)}</h4><p>${trainingSafe(r.text)}</p>${r.terms?`<p>${LOAN_ROLES[r.terms.role]} · mottagaren betalar ${r.terms.share*100} % av lönen.</p>`:''}</article>`).join('')||'<p>Inga klubbar att jämföra.</p>'}<p>Visar upp till åtta alternativ, sorterade efter genomförbara villkor och konkurrens. Slutliga villkor prövas när du skickar ditt förslag.</p></details>`;
}
function loanDevelopmentReview(l){
 const p=loanPlayer(l),age=calGap(l.start,state.calendar.date),base=l.developmentBaseline;
 const current=p&&matchAttributeRating(p),change=base&&Number.isFinite(current)?current-base.rating:null;
 const avg=l.games?Math.round(l.seconds/l.games/60):0;
 return `${l.external?'Matchunderlag saknas i mottagarens liga.':`${l.games||0} spelade matcher, ${avg} minuter per spelad match. ${l.roleReview||'Ännu ingen fullständig rolluppföljning.'}`} ${change===null?'Utvecklingsmätning saknas för äldre lån.':`Förändring i attributnivå sedan ankomst: ${change>=0?'+':''}${change.toFixed(2)}/20. Förändringen kan även bero på ålder, träning och skador.`} ${!l.external&&age>=28&&!(l.games>0)?'Inga registrerade framträdanden: kontrollera skador och mottagarens matchschema innan du bedömer lånet.':l.roleReview==='Mindre speltid än överenskommet'?'Överväg återkallelse när avtalet tillåter det.':'Följ fortsatt speltid och utveckling.'}`;
}
function loanDevelopmentDay(){
 for(const l of state.loans?.active||[]){
  if(![l.owner,l.borrower].includes(managerClub()))continue;
  const month=Math.floor(calGap(l.start,state.calendar.date)/28);if(month<1||month<=(l.developmentReview?.month||0))continue;
  l.developmentReview={month,date:state.calendar.date,text:loanDevelopmentReview(l)};
  managerMessage(`loan-development:${l.id}:${month}`,`${l.name} · utvecklingslån`,l.developmentReview.text,'Sportchef',{link:'transfers',playerId:l.playerId});
 }
}
function aiPurchasePlan(club,p,need,terms){
 const b=state.recruitment.ai[club],reserved=aiMarketReserved(club,p.id),forecast=aiFinancialForecast(club);
 const value=recruitSellerPosition(p,marketClub(p.id)).fee;
 const premium=need.missing>0?1.3:need.qualityGap>0?1.15:1;
 const maxFee=Math.max(0,Math.floor(Math.min(value*premium,b.cash-reserved.fee,forecast.cash+(aiMarketReserved(club).fee-reserved.fee)-terms.salary*forecast.remaining/52)));
 return {maxFee,text:`${need.reason} ${need.missing>0?'Prioriterar aktuell bemanning.':need.qualityGap>0?'Söker en kvalitetsförstärkning.':'Planerar för kommande avtalsavgångar.'} ${terms.years||0} avtalsår · ${terms.role}. Budet prövas mot kassa, löneutrymme och befintliga rollöften. ${p.age<=23?'Spelarens ålder passar ett långsiktigt lagbygge.':''} ${naReturnPreference(p,club).text}`};
}
