"use strict";

// Read-only market snapshot, scoped to collecting intentions. It is cleared before
// the first transfer, so cached ownership/ratings can never survive a transaction.
let aiMarketSnapshot=null;
function aiMarketSnapshotForDay(){
 const ratings=new Map(),clubs=new Map(),owners=new Map();
 for(const [club,roster] of [...Object.entries(state.clubRosters),[WORLD_FREE,state.playerWorld.freeAgents]]){
  const groups={MV:[],B:[],F:[]};let sum=0,max=0;
  for(const p of roster){const value=matchAttributeRating(p);ratings.set(String(p.id),value);owners.set(String(p.id),club);groups[worldGroup(p)].push(value);sum+=value;max=Math.max(max,value);}
  clubs.set(club,{strength:sum/Math.max(1,roster.length),max,groupMean:Object.fromEntries(Object.entries(groups).map(([key,values])=>[key,values.reduce((n,v)=>n+v,0)/Math.max(1,values.length)]))});
 }
 return {ratings,clubs,owners};
}

function aiMarketReserved(club,excludePlayer=null){
 const same=o=>excludePlayer!=null&&samePlayerId(o.playerId,excludePlayer);
 const incoming=(state.recruitment?.incoming||[]).filter(o=>o.expires>=state.recruitment.tick);
 return [...(state.clubAI?.offers||[]),...incoming].filter(o=>o.buyer===club&&o.status==='pending'&&o.kind!=='future'&&!same(o))
  .reduce((n,o)=>({fee:n.fee+(o.fee||0),salary:n.salary+o.salary}),{fee:0,salary:0});
}
function aiFutureReserved(club,excludePlayer=null){
 const incoming=(state.recruitment?.incoming||[]).filter(o=>o.expires>=state.recruitment.tick);
 return [...(state.clubAI?.offers||[]),...incoming].filter(o=>o.buyer===club&&o.status==='pending'&&(o.kind==='future'||o.kind!=='loan'&&o.years>1)&&
  !(excludePlayer!=null&&samePlayerId(o.playerId,excludePlayer))).reduce((n,o)=>n+o.salary,0);
}
function aiCommittedRoster(club,p,{future=false}={}){
 const incoming=(state.recruitment?.incoming||[]).filter(o=>o.expires>=state.recruitment.tick);
 const pending=[...(state.clubAI?.offers||[]),...incoming].filter(o=>o.buyer===club&&o.status==='pending'&&
  (future?(o.kind==='future'||o.kind!=='loan'&&o.years>1):o.kind!=='future'));
 const reserved=pending.map(o=>findPlayerAnywhere(o.playerId));
 if(!future){
  const loans=(state.loans?.offers||[]).filter(o=>o.borrower===club&&['pending','counter'].includes(o.status))
   .map(o=>findPlayerAnywhere(o.playerId));
  return aiRosterWithReturns(club,[p,...reserved,...loans]);
 }
 const secured=(state.clubRosters[club]||[]).filter(q=>!playerLoan(q)&&q.contractYears>1&&!q.futureContract);
 // Loans owned by this club return to its contracted squad; borrowed players do not.
 const returning=(state.loans?.active||[]).filter(l=>l.owner===club).map(l=>findPlayerAnywhere(l.playerId))
  .filter(q=>q&&q.contractYears>1&&!q.futureContract);
 const arrivals=[...Object.values(state.clubRosters).flat(),...(state.playerWorld?.freeAgents||[])]
  .filter(q=>q.futureContract?.buyer===club);
 return [...secured,...returning,...arrivals,p,...reserved];
}
function aiCanCommit(club,p,fee,salary,{future=false,years=0}={}){
 const b=state.recruitment.ai[club];if(!b||!p||!Number.isFinite(fee)||!Number.isFinite(salary))return false;
 if((future||years>1)&&salary>calendarFutureRoom(club)+aiFutureReserved(club)-aiFutureReserved(club,p.id))return false;
 if((future||years>1)&&!aiRosterHasRoom(aiCommittedRoster(club,p,{future:true})))return false;
 if(future)return !clubAIState(club)||aiFinancialForecast(club).cash>=0;
 const reserved=aiMarketReserved(club,p.id);
 if(!aiRosterHasRoom(aiCommittedRoster(club,p))||b.cash<fee+reserved.fee||loanWageCost(club)+salary+reserved.salary+loanReserved(club)>b.wageLimit)return false;
 const c=clubAIState(club);if(!c)return true;
 const forecast=aiFinancialForecast(club),remaining=forecast.remaining/52;
 // Keep at least a fortnight of running costs; avoid committing a projected deficit.
 const reserve=Math.min(1200000,forecast.yearlyCosts/26);
 const allReserved=aiMarketReserved(club);
 return b.cash-fee-reserved.fee>=Math.min(reserve,Math.max(0,b.cash*.08))&&
  forecast.cash+(allReserved.fee-reserved.fee)+(allReserved.salary-reserved.salary)*remaining-fee-salary*remaining>=0;
}
function aiScoutEstimate(club,p,role){
 const c=clubAIState(club),r=c?.scouting[p.id],visits=r?.visits||0;
 const uncertainty=Math.max(.35,3.4-(c?.director.judgement||12)*.075-visits*.9);
 const attrs=ensurePlayerAttributes(p),estimated=Object.fromEntries(Object.entries(attrs).map(([k,v])=>
  [k,attrClamp(v+(attrSeed(`${club}:${p.id}:${k}:observation`)-.5)*uncertainty*2,1,20)]));
 return aiRoleValue(p,role,estimated);
}
function aiMarketNeed(club,p){
 return aiSquadNeeds(club).find(n=>aiRoleFits(p,n.role)&&(n.missing>0||n.futureNeed>0));
}
function aiOfferTerms(club,p,need,kind='transfer'){
 const c=clubAIState(club),w=recruitPlayerWishes(p,club),youth=p.age<=23;
 const stretch=need.missing>0&&c.director.risk>=14?1.04:1;
 const salary=aiRoundMoney(w.salary*stretch),years=p.age>=32?Math.min(2,w.maxYears):
  youth&&['develop','rebuild'].includes(c.project)?Math.min(4,w.maxYears):Math.min(3,w.maxYears);
 return {salary,years:Math.max(w.minYears,years),role:w.role,fee:kind==='future'?0:recruitFee(p)};
}
function aiSubmitMarket(club,p,need,kind,terms){
 const w=state.clubAI,c=clubAIState(club),seller=getPlayerClub(p.id);
 if(w.offers.some(o=>o.status==='pending'&&o.buyer===club&&samePlayerId(o.playerId,p.id)))return false;
 if(kind==='transfer'&&seller===managerClub()){
  const r=state.recruitment;if(r.incoming.some(o=>o.status==='pending'&&o.buyer===club&&samePlayerId(o.playerId,p.id)))return false;
  r.incoming.unshift({id:r.nextId++,playerId:p.id,name:p.name,buyer:club,...terms,expires:r.tick+3,status:'pending'});
  recruitReport(`Bud på ${p.name}`,`${club} erbjuder ${careerMoney(terms.fee)}. Sportchefen söker ${need.label.toLowerCase()}: ${need.reason} Du avgör om budet accepteras.`);
  aiDecision(club,'market',`Lämnar bud på ${p.name} i ${seller}: ${need.reason}`);return true;
 }
 const offer={id:w.nextOffer++,playerId:p.id,name:p.name,buyer:club,seller,kind,...terms,decisionReason:need.reason,
  needRole:need.role,date:state.calendar.date,due:calAdd(state.calendar.date,seller===managerClub()?7:2),status:'pending',reason:need.reason};
 w.offers.push(offer);
 aiDecision(club,'market',`${kind==='future'?'Erbjuder nästa avtal till':kind==='loan'?'Förhandlar om lån av':'Lämnar bud på'} ${p.name}: ${need.reason}`);
 if(seller===managerClub())managerMessage(`ai-future:${offer.id}`,`${club} kontaktar ${p.name}`,`Spelarens avtal löper ut. ${club} erbjuder ett avtal från nästa säsong. Besked väntas ${calText(offer.due)}. En egen förlängning kan säkra spelaren innan dess.`,'Sportchefen',{link:'contracts'});
 c.lastOffer=state.calendar.date;return true;
}
function aiScoutClub(club,candidates=null){
 const c=clubAIState(club),b=state.recruitment.ai[club];if(!c||!b||club===managerClub()||loanLocked())return;
 if(c.lastMarket===state.calendar.date)return;
 const needs=aiSquadNeeds(club),need=needs.find(n=>n.missing>0&&!n.shortTerm)||needs.find(n=>!n.missing&&n.futureNeed>0);
 if(!need){const waiting=needs.find(n=>n.shortTerm),rc=rivalsClubState(club);if(waiting&&rc)rc.recruitmentNote=waiting.reason;return;}
 const deadline=calGap(state.calendar.date,`${state.season.year+1}-02-15`),emergency=need.role==='goalie'&&need.count===0;
 const interval=emergency?1:deadline>=0&&deadline<=14?3:c.project==='survive'?7:7+Math.floor(c.director.patience/7);
 if(c.lastMarket&&calGap(c.lastMarket,state.calendar.date)<interval)return;c.lastMarket=state.calendar.date;
 // One negotiation per club keeps commitments and emergency priorities readable.
 if(state.clubAI.offers.some(o=>o.buyer===club&&o.status==='pending')||state.recruitment.incoming.some(o=>o.buyer===club&&o.status==='pending'&&o.expires>=state.recruitment.tick))return;
 const future=!need.missing&&need.futureNeed>0;
 if(future&&(state.season.phase==='preseason'||state.calendar.date<`${state.season.year+1}-01-01`))return;
 if(!future&&!calendarWindowOpen())return;
 const market=candidates||getTransferMarketPlayers();
 const forecast=aiFinancialForecast(club),reserved=aiMarketReserved(club),futureRoom=calendarFutureRoom(club);
 const maxSalary=b.wageLimit-loanWageCost(club)-reserved.salary-loanReserved(club);
 const shortlist=[];
 for(const candidate of market){
  const p=candidate,seller=candidate.team;
  if(!p||seller===club||!aiRoleFits(p,need.role)||p.futureContract||playerLoan(p)||!medicalReady(p))continue;
  if(future&&p.contractYears!==1)continue;
  const known=country=>country==='SWE'||country===c.director.network;
  if(!known(p.nationality||recruitCountry(seller))&&!c.scouting[p.id]&&attrSeed(`${club}:${p.id}:network`)>.2)continue;
  let kind=future?'future':'transfer',terms=aiOfferTerms(club,p,need,kind);
  if(!future&&need.temporary&&seller!==WORLD_FREE&&seller!==managerClub()&&loanCanLeave(p,seller)){
   const result=loanTerms(p,seller,club,{id:null,days:need.returnDays!==null&&need.returnDays<=28?28:56,share:.5,role:'regular',recall:'day28'});
   if(result.terms){kind='loan';terms={fee:0,salary:Math.round(p.salary*result.terms.share),years:0,role:'Rotation',...result.terms,loanRole:result.terms.role};}
  }
  if(kind==='transfer'&&!recruitWillingToSell(p,seller))continue;
  if(future?terms.salary>futureRoom:terms.salary>maxSalary||terms.fee+reserved.fee>b.cash||forecast.cash-terms.fee-terms.salary*forecast.remaining/52<0)continue;
  const estimate=aiScoutEstimate(club,p,need.role),own=(state.clubRosters[club]||[]).filter(q=>aiRoleFits(q,need.role));
  if(estimate<need.minimumAbility)continue;
  const current=own.reduce((n,q)=>n+aiRoleValue(q,need.role),0)/Math.max(1,own.length);
  if(!emergency&&estimate<Math.max(leagueOf(club)==='HA'?8:9,current-(need.missing?2:0)))continue;
  const ageFit=(c.project==='develop'||c.project==='rebuild')?(24-p.age)*.1:c.project==='title'&&p.age>=23&&p.age<=31?.5:0;
  const score=estimate+ageFit-terms.fee/4000000-terms.salary/12000000+(kind==='loan'&&need.temporary?1:0);
  shortlist.push({p,kind,terms,score});
 }
 shortlist.sort((a,b)=>b.score-a.score||String(a.p.id).localeCompare(String(b.p.id)));
 for(const candidate of shortlist.slice(0,3)){
  const report=c.scouting[candidate.p.id]??={visits:0};
  if(report.date!==state.calendar.date){report.visits=Math.min(3,report.visits+1);report.date=state.calendar.date;report.role=need.role;}
 }
 const selected=shortlist.find(x=>(c.scouting[x.p.id]?.visits||0)>=(emergency?1:2)&&aiCanCommit(club,x.p,x.terms.fee,x.terms.salary,{future,years:x.terms.years}));
 const rc=rivalsClubState(club);
 if(selected){
  aiSubmitMarket(club,selected.p,need,selected.kind,selected.terms);
  if(rc)rc.recruitmentNote=`Förhandlar om ${selected.p.name}: ${need.reason}`;
 }else if(rc)rc.recruitmentNote=shortlist.length?`Observerar ${shortlist.slice(0,3).map(x=>x.p.name).join(', ')}. ${need.reason}`:`Avvaktar: inget lämpligt alternativ ryms i planen. ${need.reason}`;
 c.scouting=Object.fromEntries(Object.entries(c.scouting).sort((a,b)=>b[1].date.localeCompare(a[1].date)).slice(0,36));
}
function aiValidateOffer(o){
 const p=findPlayerAnywhere(o.playerId);
 if(!p||getPlayerClub(p.id)!==o.seller||p.futureContract||playerLoan(p))return 'Spelarens situation har ändrats.';
 if(o.kind!=='future'&&!medicalReady(p))return 'Spelaren är inte längre spelklar för det aktuella behovet.';
 if(o.kind==='future'?(p.contractYears!==1||o.joinYear&&o.joinYear<=state.season.year):!calendarWindowOpen())return 'Avtalsläget eller transferfönstret hindrar affären.';
 const need=aiSquadNeeds(o.buyer).find(n=>n.role===o.needRole);
 if(!need||(o.kind==='future'?need.futureNeed===0:need.missing===0))return 'Behovet är redan täckt.';
 if(o.kind!=='future'&&need.shortTerm)return 'Kort skadefrånvaro kan täckas av den befintliga truppen.';
 if(o.kind==='transfer'&&(!recruitWillingToSell(p,o.seller)||o.fee<recruitFee(p)))return 'Säljaren accepterar inte villkoren.';
 if(!aiCanCommit(o.buyer,p,o.fee,o.salary,{future:o.kind==='future',years:o.years}))return 'Klubbens trupp- eller budgetutrymme räcker inte längre.';
 if(o.kind!=='loan'){
  const wishes=recruitPlayerWishes(p,o.buyer);
  if(o.salary<wishes.salary||o.years<wishes.minYears||o.years>wishes.maxYears||SQUAD_ROLES.indexOf(o.role)<SQUAD_ROLES.indexOf(wishes.role))return 'Spelaren accepterar inte rollen eller avtalet.';
 }
 return '';
}
function aiCompetitionFor(p,seller,kind='transfer'){
 return (state.clubAI?.offers||[]).filter(o=>o.status==='pending'&&o.kind===kind&&samePlayerId(o.playerId,p.id)&&o.seller===seller&&!aiValidateOffer(o))
  .map(o=>({club:o.buyer,fee:o.fee,salary:o.salary,years:o.years,role:o.role,aiOfferId:o.id}))
  .sort((a,b)=>recruitOfferScore(p,b.club,b)-recruitOfferScore(p,a.club,a)||a.club.localeCompare(b.club))[0]||null;
}
function aiMarkMarketPlayer(id,buyer){
 for(const o of state.clubAI?.offers||[])if(o.status==='pending'&&samePlayerId(o.playerId,id)){
  o.status=o.buyer===buyer?'signed':'lost';o.reason=o.buyer===buyer?'Klubb och spelare accepterade.':`Spelaren valde ${buyer}.`;
 }
}
function aiResolveMarket(){
 const w=state.clubAI;if(!w||loanLocked())return;
 const due=w.offers.filter(o=>o.status==='pending'&&o.due<=state.calendar.date);
 const players=[...new Set(due.map(o=>String(o.playerId)))].sort();
 for(const id of players){
  const offers=w.offers.filter(o=>o.status==='pending'&&samePlayerId(o.playerId,id));
  // User negotiations receive their promised response before the shared auction settles.
  if(state.recruitment.deals.some(d=>samePlayerId(d.playerId,id)&&d.status==='pending'))continue;
  const valid=[];
  for(const o of offers){const reason=aiValidateOffer(o);if(reason){o.status='rejected';o.reason=reason;}else valid.push(o);}
  const p=findPlayerAnywhere(id);if(!p||!valid.length)continue;
  valid.sort((a,b)=>{
   const score=o=>o.kind==='loan'?50+loanFit(p,o.buyer).rank*-2:recruitOfferScore(p,o.buyer,o);
   return score(b)-score(a)||attrSeed(`${id}:${a.buyer}:choice`)-attrSeed(`${id}:${b.buyer}:choice`);
  });
  const o=valid[0];let signed=false;
  if(o.kind==='future'){
   p.futureContract={buyer:o.buyer,seller:o.seller,joinYear:state.season.year+1,salary:o.salary,years:o.years,role:o.role};signed=true;
   if(o.seller===managerClub())managerMessage(`ai-future-signed:${o.id}`,`${p.name} väljer ${o.buyer}`,`Spelaren lämnar när det nuvarande avtalet löper ut. Planera en efterträdare inför nästa säsong.`,'Sportchefen',{link:'transfers'});
  }else if(o.kind==='loan'){
   const result=loanTerms(p,o.seller,o.buyer,{id:null,days:o.days,share:o.share,role:o.loanRole,recall:o.recall});
   if(result.terms&&result.terms.share===o.share)signed=loanCompleteOffer({playerId:p.id,name:p.name,owner:o.seller,borrower:o.buyer,...result.terms});
  }else signed=transferRecruitPlayer(p,o.seller,o.buyer,o.fee,o.salary,o.years,o.role);
  if(!signed){o.status='rejected';o.reason='Affären klarade inte den slutliga kontrollen.';continue;}
  aiMarkMarketPlayer(p.id,o.buyer);
  const text=`${o.kind==='future'?'Säkrar nästa säsong med':o.kind==='loan'?'Lånar':'Värvar'} ${p.name} från ${o.seller}. ${o.decisionReason}`;
  if(o.kind==='future')feedbackNews('future-sign:'+o.id,o.buyer,'transfer',p.name+' skriver förhandsavtal',text);
  aiDecision(o.buyer,'market',text);rivalEvent(o.buyer,'transfer',`${o.buyer}: ${p.name}`,text);
 }
 w.offers=w.offers.filter(o=>o.status==='pending'||calGap(o.date,state.calendar.date)<=90).slice(-160);
}
function aiMarketDay(){
 const w=state.clubAI;if(!w||w.lastMarketDay===state.calendar.date||loanLocked())return;
 w.lastMarketDay=state.calendar.date;
 const candidates=getTransferMarketPlayers();
 // Collect all clubs' intentions first. Club object order cannot win an auction.
 aiMarketSnapshot=aiMarketSnapshotForDay();
 try{for(const club of Object.keys(w.clubs).sort())if(club!==managerClub())aiScoutClub(club,candidates);}
 finally{aiMarketSnapshot=null;}
 aiResolveMarket();
}
function aiArrangeYouthLoan(owner){
 if(!calendarWindowOpen()||loanLocked())return;
 const c=clubAIState(owner);if(!c)return;
 const candidates=(state.clubRosters[owner]||[]).filter(p=>p.age<=23&&loanCanLeave(p,owner)&&
  (p.aiRoleReview?.games||0)>=6&&(p.aiRoleReview?.lastAverage||0)<(p.pos==='MV'?1200:420)&&
  !state.clubAI.offers.some(o=>o.status==='pending'&&samePlayerId(o.playerId,p.id)));
 for(const p of candidates.slice(0,2)){
  const destinations=Object.keys(state.clubAI.clubs).filter(club=>club!==owner&&club!==managerClub())
   .map(club=>({club,fit:loanFit(p,club),need:aiSquadNeeds(club).find(n=>n.missing>0&&aiRoleFits(p,n.role))}))
   .filter(x=>x.need&&x.fit.interested).sort((a,b)=>a.fit.rank-b.fit.rank||b.need.urgency-a.need.urgency);
  for(const {club,need} of destinations){
   if(state.clubAI.offers.some(o=>o.buyer===club&&o.status==='pending'))continue;
   const result=loanTerms(p,owner,club,{id:null,days:56,share:.5,role:'regular',recall:'day28'});
   if(!result.terms||result.terms.role==='rotation')continue;
   const salary=Math.round(p.salary*result.terms.share);if(!aiCanCommit(club,p,0,salary))continue;
   if(aiSubmitMarket(club,p,need,'loan',{fee:0,salary,years:0,...result.terms,loanRole:result.terms.role})){
    aiDecision(owner,'loan',`Söker regelbunden seniortid för ${p.name} genom lån till ${club}.`);return;
   }
  }
 }
}
