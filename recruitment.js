"use strict";

// Fictional international clubs and players, separate from playable leagues.
const RECRUIT_COUNTRIES={ALL:'Alla länder',SWE:'Sverige',FIN:'Finland',SUI:'Schweiz',GER:'Tyskland'};
const RECRUIT_CLUBS=[['Åbo Skärgård HC','FIN'],['Tammerfors Norr HC','FIN'],['Alpenstadt HC','SUI'],['Lac Bleu HC','SUI'],['Rhein Adler HC','GER'],['Isar Wölfe HC','GER']];
const RECRUIT_PROFILES={
  'Defensiv center':{positions:['C'],weights:PLAYER_ROLES['Tvåvägsforward'],target:2},
  'Målskytt':{positions:['C','VF','HF'],weights:PLAYER_ROLES['Målskytt'],target:3},
  'Spelfördelare':{positions:['C','VF','HF'],weights:PLAYER_ROLES['Spelfördelare'],target:2},
  'Checkingforward':{positions:['C','VF','HF'],weights:PLAYER_ROLES['Checkingforward'],target:3},
  'Powerplayback':{positions:['B'],weights:PLAYER_ROLES['Offensiv back'],target:2},
  'Defensiv back':{positions:['B'],weights:PLAYER_ROLES['Defensiv back'],target:3},
  'Målvakt':{positions:['MV'],weights:PLAYER_ROLES['Målvakt'],target:2}
};
function recruitmentYear(){return state.season?.year||2026;}
function ensureRecruitment(){
  if(!state.careerStarted)return;
  ensureSeason();ensurePlayerWorld();
  if(state.recruitment)return;
  state.recruitment={version:1,tick:0,lastRound:`${recruitmentYear()}:${state.round}`,shortlist:[],missions:[],deals:[],incoming:[],history:[],nextId:1,filters:{country:'ALL',profile:'ALL',maxAge:40,maxFee:50000000,query:'',attribute:'',minAttribute:10},tab:'search',ai:{},weeks:0};
  const first={FIN:['Eero','Mikko','Joonas','Oskari','Antti','Aleksi','Ville','Lauri'],SUI:['Luca','Noah','Nico','Jan','Sandro','Marc','Joel','Dario'],GER:['Leon','Moritz','Felix','Lukas','Tim','Max','Jonas','Florian']};
  const last={FIN:['Koskela','Laakso','Salonen','Kivinen','Rantala','Niemelä','Lehtola','Aalto'],SUI:['Keller','Meier','Steiner','Baumann','Frei','Huber','Graf','Brunner'],GER:['Weber','Fischer','Wagner','Koch','Braun','Richter','Wolf','Hartmann']};
  RECRUIT_CLUBS.forEach(([club,country],ci)=>{
    if(state.clubRosters[club])return;
    state.clubRosters[club]=Array.from({length:26},(_,i)=>{
      const seed=k=>attrSeed(`international:${ci}:${i}:${k}`),rating=66+Math.floor(seed('rating')*18),age=18+Math.floor(seed('age')*17);
      const pos=i<3?'MV':i<11?'B':['C','VF','HF'][(i-11)%3];
      const p={id:`intl-${ci}-${i}`,name:`${first[country][i%8]} ${last[country][(Math.floor(i/8)+ci*3+i)%8]}`,nationality:country,fictional:true,club,pos,age,overall:rating,potential:rating+(age<24?8:2),shooting:rating,passing:rating,defense:rating,physical:rating,salary:Math.round((400000+(rating-65)*75000)/10000)*10000,value:Math.round((600000+(rating-65)*180000)*(age<24?1.2:.8)),contractYears:1+i%3,goals:0,assists:0,games:0,pim:0,shots:0,morale:70,happiness:70,fatigue:0,transferListed:i%5===0};
      ensurePlayerAttributes(p);return p;
    });
  });
  ensureManagementData();
  state.recruitment.history=(state.transferOffers||[]).filter(o=>o.status==='completed').map(o=>({id:state.recruitment.nextId++,year:recruitmentYear(),tick:0,name:o.playerName,playerId:o.playerId,seller:o.sellingClub,buyer:o.buyingClub,fee:o.amount}));
  for(const club of Object.keys(state.clubRosters))if(club!==managerClub()){
    const wage=state.clubRosters[club].reduce((sum,p)=>sum+p.salary,0);
    state.recruitment.ai[club]={cash:leagueOf(club)==='HA'?6000000:12000000,wageLimit:Math.round(wage*1.3),year:recruitmentYear()};
  }
}
function recruitCountry(club){return RECRUIT_CLUBS.find(c=>c[0]===club)?.[1]||'SWE';}
function recruitMessage(text){state.recruitment.message=text;save();render();}
function recruitReport(title,body,extra={}){const r=state.recruitment;managerMessage(`recruit:${r.nextId++}`,title,body,'Rekrytering',{link:'transfers',...extra});}
function recruitRoleValue(p,profile,estimated=true){const def=RECRUIT_PROFILES[profile];if(!def||!def.positions.includes(p.pos))return 0;return attributeWeighted(estimated?playerAssessment(p).estimated:ensurePlayerAttributes(p),def.weights);}
function recruitmentNeeds(){
 const club=managerClub(),plan=state.tacticalPlan||{},roster=managerRoster();
 const threshold=leagueOf()==='HA'?11:12;
 return Object.entries(RECRUIT_PROFILES).map(([name,def])=>{
  const target=def.target+((name==='Checkingforward'&&plan.forecheck==='aggressive'||name==='Spelfördelare'&&plan.attackStyle==='control'||name==='Defensiv back'&&state.tactic==='defense')?1:0);
  const eligible=p=>def.positions.includes(p.pos)||(name==='Defensiv center'&&!['B','MV'].includes(p.pos)&&positionFit(p,'C')>=.9);
  const value=p=>attributeWeighted(playerAssessment(p).estimated,def.weights)*(name==='Defensiv center'?positionFit(p,'C'):1);
  const ps=roster.filter(eligible).map(p=>({p,value:value(p)})).sort((a,b)=>b.value-a.value);
  const capable=ps.filter(x=>x.value>=threshold),available=capable.filter(x=>medicalReady(x.p));
  const absent=capable.filter(x=>!medicalReady(x.p)),secure=capable.filter(x=>!playerLoan(x.p)&&((x.p.contractYears>1&&!x.p.futureContract)||(x.p.futureContract?.buyer===club)));
  const arrivals=[...Object.values(state.clubRosters),state.playerWorld?.freeAgents||[]].flat().filter(p=>p.futureContract?.buyer===club&&!roster.some(q=>samePlayerId(p.id,q.id))&&p.futureContract.joinYear<=recruitmentYear()+1&&eligible(p)&&value(p)>=threshold);
  const returning=(state.loans?.active||[]).filter(l=>l.owner===club).map(l=>findPlayerAnywhere(l.playerId)).filter(p=>p&&p.contractYears>1&&!p.futureContract&&eligible(p)&&value(p)>=threshold);
  const youth=(state.juniors?.roster||[]).filter(p=>medicalReady(p)&&eligible(p)&&value(p)>=threshold);
  const need=Math.max(0,target-available.length),futureNeed=Math.max(0,target-secure.length-arrivals.length-returning.length);
  const temporary=need>0&&capable.length>=target&&absent.length>0;
  const priority=need?(youth.length?'Pröva junior':temporary?'Överväg lån':'Förstärk nu'):futureNeed?'Planera efterträdare':'God täckning';
  const reasons=[`${available.length} spelklara av ${target} önskade för din matchplan.`];
  if(absent.length)reasons.push(`${absent.length} saknas: ${absent.map(x=>x.p.name+' ('+(x.p.health?.injury?.remaining||0)+' dagar till återgångsträning)').join(', ')}.`);
  if(youth.length)reasons.push(`Junioralternativ: ${youth.map(p=>p.name).join(', ')}. Bedömd nivå räcker; jämför positionsvana och ork före uppflyttning.`);
  if(returning.length)reasons.push(`${returning.length} egna spelare på lån räknas in i nästa säsongs täckning.`);
  if(arrivals.length)reasons.push(`${arrivals.length} redan kontrakterade förstärkningar till nästa säsong.`);
  if(temporary)reasons.push('Luckan beror på frånvaro. Jämför ett lån med återstående rehabiliteringstid.');
  if(futureNeed)reasons.push(`${futureNeed} roller behöver säkras inför nästa säsong.`);
  return {name,need,futureNeed,secure:secure.length, count:available.length,target,players:ps.slice(0,3),priority,reasons,temporary,juniors:youth.map(p=>p.id),arrivals:arrivals.map(p=>p.id)};
 }).sort((a,b)=>b.need-a.need||b.futureNeed-a.futureNeed);
}
function recruitFee(p){if(worldIsFree(p.id))return 0;return Math.round((p.askingPrice||calculateTransferPrice(p))*(p.transferListed?.9:1));}
function recruitFilters(){return state.recruitment.filters;}
function setRecruitFilter(key,value){recruitHub.page=0;const f=recruitFilters();f[key]=['maxAge','maxFee','minAttribute'].includes(key)?Number(value):String(value);queueInterfaceSave();render();}
function recruitAttributeMatches(p,filters){
 if(!filters.attribute)return true;
 const a=playerAssessment(p),center=a.estimated[filters.attribute];
 if(!Number.isFinite(center))return false;
 const bounds=assessmentBounds(center,a.uncertainty),mode=filters.attributeMode||'estimate';
 const value=mode==='possible'?bounds.high:mode==='supported'?bounds.low:center;
 return value>=Number(filters.minAttribute||10);
}
function recruitRoleAssessment(p,profile){
 const center=recruitRoleValue(p,profile);if(!center)return null;
 return {center,...assessmentBounds(center,playerAssessment(p).uncertainty)};
}
function recruitCandidates(filters=recruitFilters()){
 const roleValues=new Map(),roleValue=p=>{if(!roleValues.has(p.id))roleValues.set(p.id,recruitRoleValue(p,filters.profile));return roleValues.get(p.id);};
 return getTransferMarketPlayers().filter(p=>(filters.availability!=='free'||worldIsFree(p.id))&&(filters.country==='ALL'||(worldIsFree(p.id)?p.nationality:recruitCountry(p.team))===filters.country)&&(filters.profile==='ALL'||roleValue(p)>0)&&p.age<=filters.maxAge&&recruitFee(p)<=filters.maxFee&&(!filters.query||`${p.name} ${p.team}`.toLowerCase().includes(filters.query.toLowerCase()))&&recruitAttributeMatches(p,filters)).sort((a,b)=>filters.profile==='ALL'?a.name.localeCompare(b.name,'sv'):roleValue(b)-roleValue(a));
}
function recruitSelectProfile(name){if(!RECRUIT_PROFILES[name])return;deskNavigate('transfers','search');recruitFilters().profile=name;save();render();deskBrowserBefore();}
function recruitOpen(id){deskOpenPlayer(id,true);}
function toggleRecruitShortlist(id){const r=state.recruitment;if(!findPlayerAnywhere(id))return;r.shortlist=r.shortlist.some(x=>samePlayerId(x,id))?r.shortlist.filter(x=>!samePlayerId(x,id)):[...r.shortlist,id];save();render();}
function createScoutMission(candidateIds){
 if(!managerCanPlay())return;
 const r=state.recruitment;if(scoutActiveCount()>=clubMissionLimit())return recruitMessage(`Tränarteamet kan ansvara för ${clubMissionLimit()} uppdrag samtidigt.`);
 if(state.money-clubForecast().reserved<clubMissionFee())return recruitMessage(`Ett scoutuppdrag kostar ${money(clubMissionFee())}.`);
 const filters={...r.filters},candidates=recruitCandidates(filters).filter(p=>(!Array.isArray(candidateIds)||candidateIds.some(id=>samePlayerId(id,p.id)))&&(state.scoutReports[String(p.id)]?.visits||0)<3&&!scoutPending(p.id)).slice(0,3);
 if(!candidates.length)return recruitMessage('Inga spelare matchar sökningen. Bredda land, ålder, budget eller attributkrav.');
 clubPost('scouting',-clubMissionFee(),'Scoutuppdrag · tre kandidater');
 r.missions.unshift({id:r.nextId++,filters,players:candidates.map(p=>p.id),started:r.tick,startDate:state.calendar.date,nextDate:calAdd(state.calendar.date,7),observations:0,status:'active'});
 recruitMessage(`Uppdraget är startat. Tre observationer görs över tre kalenderveckor. Kostnad: ${money(clubMissionFee())}.`);
}
function cancelScoutMission(id){const m=state.recruitment.missions.find(m=>m.id===id);if(!m||m.status!=='active')return;m.status='cancelled';recruitMessage('Uppdraget avslutat. Tidigare observationer finns kvar.');}
function advanceRecruitmentRound(){
 ensureRecruitment();const r=state.recruitment;if(!r)return;
 scoutDay();
}
function recruitmentWeek(){calendarWeek();}
function advanceRecruitment(){
 const r=state.recruitment;r.tick++;
 for(const [club,budget] of Object.entries(r.ai))if(budget.year!==recruitmentYear()){
   if(clubAIState(club)){aiNewFinancialYear(club);continue;}
   budget.year=recruitmentYear();budget.cash+=6000000;budget.wageLimit=Math.round(state.clubRosters[club].reduce((n,p)=>n+p.salary,0)*1.3);
 }
 scoutDay();
 for(const deal of r.deals.filter(d=>d.status==='pending'&&(d.dueDate?d.dueDate<=state.calendar.date:d.due<=r.tick)))resolveRecruitDeal(deal);
 r.incoming.filter(o=>o.status==='pending'&&o.expires<r.tick).forEach(o=>o.status='expired');
 aiRecruitTransfer();
}
function recruitPlayerWishes(p,club=managerClub()){
 const roster=state.clubRosters[club]||[],group=roster.filter(q=>p.pos==='MV'?q.pos==='MV':p.pos==='B'?q.pos==='B':!['MV','B'].includes(q.pos));
 const snapshot=aiMarketSnapshot?.clubs.get(club);
 const ability=aiMarketSnapshot?.ratings.get(String(p.id))??matchAttributeRating(p),avg=snapshot?.groupMean[worldGroup(p)]??group.reduce((n,q)=>n+matchAttributeRating(q),0)/Math.max(1,group.length);
 const ambition=attrSeed(`${p.id}:ambition`)>.58;
 const level=ability-avg,role=level>2?'Nyckelspelare':level>-3?'Ordinarie':'Rotation';
 const clubStrength=snapshot?.strength??roster.reduce((n,q)=>n+matchAttributeRating(q),0)/Math.max(1,roster.length);
 const relegationStep=state.world?.membership?.[aiMarketSnapshot?.owners.get(String(p.id))??getPlayerClub(p.id)]==='SHL'&&leagueOf(club)==='HA';
 const stretch=ambition&&(ability>clubStrength+5||relegationStep);
 const salary=Math.round(p.salary*(stretch?1.35:1.12)/10000)*10000;
 return {role,salary,minYears:p.age<24?2:1,maxYears:p.age>=32?2:5,priority:ambition?'Sportsliga ambitioner':'Speltid och trygghet',stretch};
}
function recruitCanSell(p,club){
 if(p.futureContract||playerLoan(p))return false;if(club===WORLD_FREE)return true;
 const roster=state.clubRosters[club]||[],group=q=>q.pos==='MV'?'MV':q.pos==='B'?'B':'F';
 if(roster.filter(q=>group(q)===group(p)).length<=({MV:2,B:6,F:12})[group(p)])return false;
 if(club!==managerClub()&&positionFit(p,'C')>=.98&&roster.filter(q=>q!==p&&medicalReady(q)&&positionFit(q,'C')>=.98).length<4)return false;
 return true;
}
function recruitCanAfford(club,p,fee,salary){
 if(club===managerClub())return state.money>=fee&&annualWageCost()+salary<=wageBudget();
 return aiCanCommit(club,p,fee,salary);
}
function recruitWillingToSell(p,club){if(club===WORLD_FREE)return true;return recruitCanSell(p,club)&&(p.transferListed||p.contractYears<=1||(aiMarketSnapshot?.ratings.get(String(p.id))??matchAttributeRating(p))<(aiMarketSnapshot?.clubs.get(club)?.max??Math.max(...state.clubRosters[club].map(q=>matchAttributeRating(q))))-2);}
function recruitRival(p,seller){
 return aiCompetitionFor(p,seller);
}
function recruitOfferScore(p,club,offer){
 const w=recruitPlayerWishes(p,club),rank=SQUAD_ROLES.indexOf(offer.role);
 return offer.salary/w.salary*40+(rank-SQUAD_ROLES.indexOf(w.role))*12+(w.stretch?-15:5)+(offer.years>=w.minYears&&offer.years<=w.maxYears?10:-25);
}
function submitRecruitOffer(id,fee,salary,years,role){
 if(!managerCanPlay())return;
 if(!calendarWindowOpen())return recruitMessage('Transferfönstret är stängt. Du kan scouta och förhandla avtal inför nästa säsong.');
 ensureRecruitment();const r=state.recruitment,p=findPlayerAnywhere(id),seller=getPlayerClub(id);
 if(state.live&&!state.live.finished)return recruitMessage('Avsluta matchen innan du skickar ett transferbud.');
 if(!p||!seller||seller===managerClub())return;
 fee=Math.round(Number(fee));salary=Math.round(Number(salary));years=Number(years);
 if(!Number.isFinite(fee)||!Number.isFinite(salary)||(worldIsFree(id)?fee!==0:fee<=0)||salary<=0||!Number.isInteger(years)||years<1||years>5||!SQUAD_ROLES.includes(role))return recruitMessage('Ange giltigt bud, årslön, kontraktslängd och spelarens roll.');
 if(!recruitCanAfford(managerClub(),p,fee,salary))return recruitMessage('Budet ryms inte i din kassa eller lönebudget.');
 if(r.deals.some(d=>samePlayerId(d.playerId,id)&&d.status==='pending'))return recruitMessage('Spelaren överväger redan ditt bud. Du kan återkalla det under Förhandlingar.');
 const previous=r.deals.find(d=>samePlayerId(d.playerId,id)&&d.status==='rejected'&&d.due>r.tick-2);
 if(previous)return recruitMessage('Spelaren och klubben vill avvakta två marknadsomgångar efter avslaget.');
 const reserved=r.deals.filter(d=>d.status==='pending'&&d.kind!=='future').reduce((n,d)=>({fee:n.fee+d.fee,salary:n.salary+d.salary}),{fee:0,salary:0});
 if(fee+reserved.fee>state.money||salary+reserved.salary+annualWageCost()+loanReserved(managerClub())>wageBudget())return recruitMessage('Dina pågående bud har redan reserverat det återstående transfer- eller löneutrymmet.');
 const deal={dueDate:state.calendar?calAdd(state.calendar.date,2):null,id:r.nextId++,playerId:p.id,name:p.name,seller,fee,salary,years,role,status:'pending',due:r.tick+1,rival:recruitRival(p,seller)};
 r.deals.unshift(deal);if(state.transferNegotiation&&samePlayerId(state.transferNegotiation.playerId,id))state.transferNegotiation=null;r.tab='deals';state.page='transfers';recruitMessage('Budet är skickat. Klubben och spelaren svarar om två kalenderdagar.');
}
function cancelRecruitOffer(id){const d=state.recruitment.deals.find(d=>d.id===id);if(d?.status==='pending'){d.status='cancelled';recruitMessage('Budet återkallat. Det reserverade utrymmet är frigjort.');}}
function resolveRecruitDeal(d){
 if(d.kind==='future'){calendarResolveFuture(d);return;}
 if(d.counter){if(d.dueDate<=state.calendar.date){d.status='rejected';d.reason='Motbudet löpte ut utan svar.';delete d.counter;}return;}
 if(!calendarWindowOpen()){d.status='rejected';d.reason='Övergången hann inte bli klar före transferfönstrets stängning.';recruitReport(`Besked om ${d.name}`,d.reason);return;}
 const p=findPlayerAnywhere(d.playerId);let reason='';
 if(p)d.rival=aiCompetitionFor(p,d.seller)||(d.rival?.aiOfferId?null:d.rival);
 if(!p||getPlayerClub(d.playerId)!==d.seller)reason='Spelaren har redan lämnat klubben.';
 else if(!recruitWillingToSell(p,d.seller))reason='Klubben vill behålla spelaren: nyckelspelare eller för liten trupp.';
 else if(d.fee<recruitFee(p))reason='Klubben avvisar övergångssumman.';
 else if(!recruitCanAfford(managerClub(),p,d.fee,d.salary))reason='Din kassa eller lönebudget räcker inte längre.';
 else{
   const w=recruitPlayerWishes(p);
   if(d.salary<w.salary)reason=`Spelaren begär minst ${money(w.salary)} per år med tanke på klubbens nivå och sin nuvarande lön.`;
   else if(SQUAD_ROLES.indexOf(d.role)<SQUAD_ROLES.indexOf(w.role))reason=`Spelaren vill ha rollen ${w.role.toLowerCase()}.`;
   else if(d.years<w.minYears||d.years>w.maxYears)reason=`Spelaren önskar ${w.minYears}–${w.maxYears} år.`;
   else if(d.rival&&aiCanCommit(d.rival.club,p,d.rival.fee,d.rival.salary,{years:d.rival.years})&&recruitOfferScore(p,d.rival.club,d.rival)>recruitOfferScore(p,managerClub(),d)+1){
     if(transferRecruitPlayer(p,d.seller,d.rival.club,d.rival.fee,d.rival.salary,d.rival.years,d.rival.role))reason=`Spelaren valde ${d.rival.club}: deras kombination av roll, lön och ambitioner vägde tyngre.`;
   }
 }
 if(reason&&p&&getPlayerClub(p.id)===d.seller&&recruitWillingToSell(p,d.seller)&&!d.negotiationRounds&&d.salary>=recruitPlayerWishes(p).salary*.65&&d.fee>=recruitFee(p)*.65&&recruitCanAfford(managerClub(),p,d.fee,d.salary)){
  const w=recruitPlayerWishes(p);d.original={fee:d.fee,salary:d.salary,years:d.years,role:d.role};d.counter={fee:Math.max(d.fee,recruitFee(p)),salary:Math.max(d.salary,w.salary),years:Math.max(w.minYears,Math.min(w.maxYears,d.years)),role:SQUAD_ROLES.indexOf(d.role)<SQUAD_ROLES.indexOf(w.role)?w.role:d.role};Object.assign(d,d.counter);d.dueDate=calAdd(state.calendar.date,7);d.reason=reason+' Klubben och agenten lämnar ett motbud som gäller i sju dagar.';recruitReport(`Motbud: ${d.name}`,d.reason,{dealId:d.id});return;
 }
 if(reason){d.status='rejected';d.reason=reason;recruitReport(`Besked om ${d.name}`,reason,{dealId:d.id});return;}
 if(!transferRecruitPlayer(p,d.seller,managerClub(),d.fee,d.salary,d.years,d.role)){d.status='rejected';d.reason='Övergången kunde inte registreras. Spelarens situation eller budgeten har ändrats.';return;}d.status='signed';d.reason='Både klubb och spelare accepterade.';
 recruitReport(`${d.name} är klar`,`${d.name} ansluter från ${d.seller}. Avtal: ${d.years} år, ${money(d.salary)}/år, ${d.role.toLowerCase()}. Rollen följs upp av tränarteamet.`);
}
function acceptRecruitCounter(id){
 const d=state.recruitment.deals.find(d=>d.id===id);if(!d||d.status!=='pending'||!d.counter||loanLocked()||d.dueDate<state.calendar.date)return;
 const p=findPlayerAnywhere(d.playerId);if(!p)return;
 const others=state.recruitment.deals.filter(q=>q!==d&&q.status==='pending'&&q.kind!=='future');
 if(d.fee+others.reduce((n,q)=>n+q.fee,0)>state.money||annualWageCost()+d.salary+others.reduce((n,q)=>n+q.salary,0)+loanReserved(managerClub())>wageBudget())return recruitMessage('Motbudet ryms inte tillsammans med dina andra åtaganden. Frigör budget eller avböj.');
 delete d.counter;d.negotiationRounds=1;d.dueDate=calAdd(state.calendar.date,1);d.due=state.recruitment.tick+1;d.reason='Motbudet accepterat. Slutlig registrering i morgon.';recruitMessage(d.reason);
}
function transferRecruitPlayer(p,seller,buyer,fee,salary,years,role){
 if(!calendarWindowOpen()||p.futureContract)return false;
 const r=state.recruitment;if(playerLoan(p)||getPlayerClub(p.id)!==seller||seller===buyer||!recruitCanAfford(buyer,p,fee,salary))return false;
 if(buyer!==managerClub()&&!aiCanCommit(buyer,p,fee,salary,{years}))return false;
 const feedbackPlan=feedbackBeforeArrival(p,buyer);
 if(seller===managerClub())state.scoutReports[String(p.id)]=scoutRemember(p);
 if(seller===WORLD_FREE){worldRemoveFree(p.id);}else state.clubRosters[seller]=state.clubRosters[seller].filter(q=>!samePlayerId(q.id,p.id));
 state.clubRosters[buyer].push(p);
 if(buyer===managerClub())clubPost('transfer',-fee,'Värvning · '+p.name);else if(clubAIState(buyer))aiFinancePost(buyer,'transfer',-fee,'Värvning · '+p.name);else r.ai[buyer].cash-=fee;
 if(seller===managerClub())clubPost('transfer',fee,'Försäljning · '+p.name);else if(clubAIState(seller))aiFinancePost(seller,'transfer',fee,'Försäljning · '+p.name);else if(r.ai[seller])r.ai[seller].cash+=fee;
 delete p.freeSince;delete p.previousClub;
 Object.assign(p,{club:buyer,salary,contractYears:years,squadRole:role,promisedRole:role,transferListed:false,askingPrice:null,happiness:78,morale:78});
 delete p.aiListed;delete p.aiRoleReview;aiMarkMarketPlayer(p.id,buyer);
 if(buyer===managerClub())rolePromiseAssign(p,role);else delete p.recruitmentPromise;
 r.history.unshift({id:r.nextId++,year:recruitmentYear(),tick:r.tick,name:p.name,playerId:p.id,seller,buyer,fee});
 if(seller===managerClub()||buyer===managerClub()){syncManagerRoster();repairMedicalLines();ensureSpecialTeams();}
 feedbackArrival(p,feedbackPlan,'transfer');
 feedbackNews('transfer:'+r.history[0].id,buyer,'transfer',p.name+' klar för '+buyer,seller+' → '+buyer+'. Övergångssumma: '+careerMoney(fee)+'.');
 // Rebuild team strength so background results respond to roster changes too.
 for(const club of [seller,buyer]){const t=team(club);if(t)t.strength=Math.round(state.clubRosters[club].reduce((n,q)=>n+matchAttributeRating(q),0)/state.clubRosters[club].length);}
 return true;
}
function generateIncomingOffer(){
 if(!calendarWindowOpen())return;
 const r=state.recruitment,p=managerRoster().find(p=>p.transferListed&&recruitCanSell(p,managerClub())&&!r.incoming.some(o=>samePlayerId(o.playerId,p.id)&&o.status==='pending'));
 if(!p)return;
 const fee=recruitFee(p),buyer=Object.keys(r.ai).find(c=>rivalRecruitNeeds(c).some(n=>(n.missing||n.futureNeed)&&aiRoleFits(p,n.role))&&recruitCanAfford(c,p,fee,recruitPlayerWishes(p,c).salary));if(!buyer)return;
 const w=recruitPlayerWishes(p,buyer);
 r.incoming.unshift({id:r.nextId++,playerId:p.id,name:p.name,buyer,fee,salary:w.salary,role:w.role,years:Math.min(3,w.maxYears),expires:r.tick+3,status:'pending'});
 recruitReport(`Bud på ${p.name}`,`${buyer} erbjuder ${money(fee)}. Du avgör om spelaren ska säljas. Budet gäller i tre marknadsomgångar.`);
}
function answerIncomingOffer(id,accept){
 if(!managerCanPlay())return;
 const r=state.recruitment,o=r.incoming.find(o=>o.id===id);if(!o||o.status!=='pending')return;
 if(accept&&!calendarWindowOpen())return recruitMessage('Transferfönstret är stängt. Försäljningen kan inte genomföras nu.');
 if(!accept){o.status='rejected';return recruitMessage('Budet avvisat.');}
 if(state.live&&!state.live.finished)return recruitMessage('Avsluta matchen innan du säljer en spelare.');
 const p=managerRoster().find(p=>samePlayerId(p.id,o.playerId));
 if(!p||o.expires<r.tick||!recruitCanSell(p,managerClub())||!transferRecruitPlayer(p,managerClub(),o.buyer,o.fee,o.salary,o.years,o.role)){o.status='expired';return recruitMessage('Affären kan inte genomföras. Kontrollera truppens storlek och köparens ekonomi.');}
 o.status='accepted';recruitMessage(`${p.name} lämnar för ${o.buyer}. ${money(o.fee)} har tillförts kassan.`);
}
function aiRecruitTransfer(){
 if(!calendarWindowOpen()||state.live&&!state.live.finished)return;
 ensureRivals();aiMarketDay();
}

function followRecruitmentPromises(m){
 if(!m?.finished||m.friendly)return;
 const key=m.analysis?.id||`${state.season.year}:${state.round}`;
 for(const p of managerRoster()){
   const q=p.recruitmentPromise;if(!q||q.resolved||q.lastFixture===key||q.evidence?.some(g=>g.key===key))continue;
   const rule=rolePromiseRule(q);if(medicalExcused(p,rule.minutes*60))continue;
   const seconds=m.iceTime?.[p.id]||0,qualified=seconds>=rule.minutes*60;
   q.lastFixture=key;q.games++;if(qualified)q.qualified++;
   q.evidence=[...(q.evidence||[]),{key,date:state.calendar.date,opponent:m.opponent,seconds,qualified}].slice(-6);
   if(q.games>=rule.total){q.resolved=true;const met=q.qualified>=rule.required;q.result=met?'Uppfyllt':'Brutet';p.happiness=trainingClamp(p.happiness+(met?5:-12),20,100);
     recruitReport(`${p.name}: uppföljning av rollen`,`${q.role}: minst ${rule.minutes} minuter i ${rule.required} av ${rule.total} tillgängliga tävlingsmatcher. Utfallet blev ${q.qualified} matcher. ${met?'Spelaren är nöjd med förtroendet.':'Spelaren är besviken över sin speltid.'}`);
   }
 }
}
function recruitTab(tab){if(!['needs','search','missions','shortlist','deals','history','free','world','loans','reports'].includes(tab))return;deskNavigate('transfers',tab);}
function recruitOptions(options,value){return Object.entries(options).map(([key,label])=>`<option value="${trainingSafe(key)}" ${String(key)===String(value)?'selected':''}>${trainingSafe(label)}</option>`).join('');}
function recruitmentView(){return recruitmentHubView();}
function legacyRecruitmentView(){
 ensureRecruitment();if(state.recruitment.tab==='missions')return scoutingView();const r=state.recruitment,f=r.filters,pending=r.deals.filter(d=>d.status==='pending'),incoming=r.incoming.filter(d=>d.status==='pending');
 return `<section class="recruitment-page"><header class="daily-heading"><div><span class="career-eyebrow">SPORTCHEFENS ARBETSBORD</span><h1>Rekrytering</h1><p>Hitta rätt egenskaper och bygg truppen långsiktigt.</p></div></header>
 <div class="recruit-finances"><div><span>Kassa</span><strong>${careerMoney(state.money)}</strong></div><div><span>Ledigt löneutrymme / år</span><strong>${careerMoney(wageBudget()-annualWageCost())}</strong></div><div><span>Reserverat i bud</span><strong>${careerMoney(pending.reduce((n,d)=>n+d.fee,0))}</strong></div><div><span>Marknadsomgång</span><strong>${r.tick}</strong></div></div>
 ${r.tab==='needs'?`<section class="recruit-needs"><h2>Tränarteamets truppanalys</h2><p>Råden väger samman matchplan, bedömd nivå, positionsvana, skador, juniorer och avtal inför nästa säsong. Samma spelare kan passa flera roller; antalen ska inte summeras till truppstorlek.</p><div class="recruit-needs-grid">${recruitmentNeeds().map(n=>`<button class="need-card ${n.need?'urgent':''}" onclick="recruitSelectProfile('${n.name}')"><span>${n.priority}</span><strong>${n.name}</strong><b>${n.count} / ${n.target} användbara</b><small>${n.players.map(x=>trainingSafe(x.p.name)).join(' · ')||'Ingen spelare i positionen'}</small><small>${n.reasons.map(trainingSafe).join(' ')}</small></button>`).join('')}</div></section>`:''}
 ${r.message?`<p class="recruit-notice" role="status">${trainingSafe(r.message)}</p>`:''}
 ${state.season?.phase==='preseason'?`<div class="recruit-clock"><span>Nya rapporter och budbesked följer kalenderdagarna. Nästa marknadsrapport: ${calText(state.calendar.marketDay)}.</span><button class="btn" onclick="deskNavigate('calendar')">Till dagens program</button></div>`:'<p class="recruit-clock">Scoutrapporter och budbesked kommer när du fortsätter i kalendern.</p>'}
 ${r.tab==='needs'?'':r.tab==='loans'?loansView():r.tab==='search'?recruitSearchView():r.tab==='missions'?recruitMissionsView():r.tab==='shortlist'?recruitPlayerRows(r.shortlist.map(findPlayerAnywhere).filter(p=>p&&!isOwnPlayer(p))):r.tab==='deals'?recruitDealsView():r.tab==='free'?worldFreeView():r.tab==='world'?playerWorldView():recruitHistoryView()}
 <p class="training-note">Utlandsmarknaden innehåller fiktiva spelare i sex fiktiva klubbar i Finland, Schweiz och Tyskland. Ligor och matcher där är ännu inte spelbara.</p></section>`;
}
function recruitSearchView(){
 const f=recruitFilters(),players=recruitCandidates();
 return `<section><div class="recruit-filters"><label>Avtalsstatus<select onchange="setRecruitFilter('availability',this.value)"><option value="all" ${f.availability!=='free'?'selected':''}>Alla spelare</option><option value="free" ${f.availability==='free'?'selected':''}>Kontraktslösa</option></select></label><label>Sök namn eller klubb<input id="recruit-query" onkeydown="if(event.key==='Enter'){event.preventDefault();applyRecruitSearch()}" type="search" value="${trainingSafe(f.query)}" onchange="setRecruitFilter('query',this.value)" placeholder="Spelare eller klubb"></label><label>Marknad<select onchange="setRecruitFilter('country',this.value)">${recruitOptions(RECRUIT_COUNTRIES,f.country)}</select></label><label>Spelarprofil<select onchange="setRecruitFilter('profile',this.value)">${recruitOptions({ALL:'Alla roller',...Object.fromEntries(Object.keys(RECRUIT_PROFILES).map(k=>[k,k]))},f.profile)}</select></label><label>Högsta ålder<input type="number" min="18" max="60" value="${f.maxAge}" onchange="setRecruitFilter('maxAge',this.value)"></label><label>Högsta övergångssumma<input type="number" min="0" step="100000" value="${f.maxFee}" onchange="setRecruitFilter('maxFee',this.value)"></label><label>Viktigt attribut<select onchange="setRecruitFilter('attribute',this.value)">${recruitOptions({'':'Inget särskilt',...SKATER_ATTRIBUTES,...GOALIE_ATTRIBUTES},f.attribute||'')}</select></label><label>Lägsta bedömda attribut<input type="number" min="1" max="20" value="${f.minAttribute||10}" onchange="setRecruitFilter('minAttribute',this.value)"></label></div><div class="recruit-search-actions"><button class="btn" onclick="applyRecruitSearch()">Sök spelare</button><button class="btn secondary" onclick="resetRecruitFilters()">Återställ sökfilter</button><p>${players.length} spelare matchar. Filtrering och rangordning använder personalens osäkra attributbedömning.</p><button class="btn" onclick="createScoutMission()">Starta scoutuppdrag · ${money(clubMissionFee())}</button></div>${recruitPlayerRows(players.slice(0,50))}${players.length>50?'<p>Visar de första 50. Begränsa sökningen för att hitta fler profiler.</p>':''}</section>`;
}
function recruitPlayerRows(players){
 const r=state.recruitment;
 return players.length?`<div class="recruit-players">${players.map(p=>{
   const report=playerAssessment(p),club=getPlayerClub(p.id),listed=r.shortlist.some(id=>samePlayerId(id,p.id));
   return `<article class="recruit-player"><button class="recruit-identity" onclick="recruitOpen('${p.id}')"><strong>${trainingSafe(p.name)}</strong><span>${p.pos} · ${p.age} år · ${trainingSafe(club)} · ${RECRUIT_COUNTRIES[worldIsFree(p.id)?p.nationality:recruitCountry(club)]||p.nationality||'Sverige'}</span></button><div><span>Förmåga / potential</span><strong>${assessmentBadge(p)} / ${assessmentBadge(p,true)}</strong><small>${report.roles[0].name} · ${report.visits}/3 observationer</small></div><div><span>Klubbens prisnivå</span><strong>${careerMoney(recruitFee(p))}</strong><small>${worldIsFree(p.id)?'Ingen övergångssumma':p.transferListed?'Transferlistad':recruitWillingToSell(p,club)?'Kan diskuteras':'Klubben vill behålla'}</small></div><button class="btn secondary" aria-pressed="${listed}" onclick="toggleRecruitShortlist('${p.id}')">${listed?'Ta bort från önskelistan':'Lägg till i önskelistan'}</button></article>`;
 }).join('')}</div>`:'<div class="recruit-empty"><h2>Inga spelare här ännu</h2><p>Justera sökningen eller lägg till spelare från spelarprofilen.</p></div>';
}
function recruitMissionsView(){return scoutingView();}
function recruitDealsView(){
 const r=state.recruitment;
 return `<section>${state.transferNegotiation&&findPlayerAnywhere(state.transferNegotiation.playerId)&&!isOwnPlayer(findPlayerAnywhere(state.transferNegotiation.playerId))?`<div class="recruit-notice"><p>Du har en tidigare påbörjad kontraktsdiskussion. Granska villkoren innan du skickar ett nytt erbjudande.</p><button class="btn" onclick="recruitOpen('${state.transferNegotiation.playerId}')">Fortsätt diskussionen</button></div>`:''}<h2>Bud på dina spelare</h2><p>Transferlista spelare i deras profiler för att bjuda in andra klubbar. Ditt godkännande krävs för varje försäljning.</p>${r.incoming.filter(o=>o.status==='pending').map(o=>`<article class="recruit-deal"><h3>${o.name} → ${o.buyer}</h3><p>${careerMoney(o.fee)} · ${o.expires-r.tick} marknadsomgångar kvar</p><button class="btn" onclick="answerIncomingOffer(${o.id},true)">Acceptera försäljning</button><button class="btn secondary" onclick="answerIncomingOffer(${o.id},false)">Avvisa</button></article>`).join('')||'<p>Inga inkommande bud.</p>'}<h2>Dina förhandlingar</h2>${r.focusDeal?'<button class="btn secondary" onclick="state.recruitment.focusDeal=null;render()">Visa alla förhandlingar</button>':''}${r.deals.filter(d=>!r.focusDeal||d.id===r.focusDeal).slice(0,30).map(d=>`<article class="recruit-deal"><header><h3>${d.name}</h3><strong>${d.counter?'Motbud':({pending:'Inväntar besked',signed:'Klar',future_signed:'Klar till nästa säsong',rejected:'Avslag',cancelled:'Återkallat'})[d.status]}</strong></header><p>${d.kind==='future'?`Ansluter ${seasonLabel(d.joinYear)} · `:''}${careerMoney(d.fee)} · ${careerMoney(d.salary)}/år · ${d.years} år · ${d.role}</p>${d.rival?`<p class="recruit-rival">Konkurrerande erbjudande: ${d.rival.club} · ${careerMoney(d.rival.salary)}/år · ${d.rival.role}. Spelaren väger även klubbens ambitioner.</p>`:''}<p>${trainingSafe(d.reason||'Svar när kalendern går framåt.')}</p>${d.counter?`<p>Ditt ursprungliga förslag: ${careerMoney(d.original.fee)} · ${careerMoney(d.original.salary)}/år · ${d.original.years} år · ${d.original.role}. Svar senast ${calText(d.dueDate)}.</p><button class="btn" onclick="acceptRecruitCounter(${d.id})">Acceptera motbud</button>`:''}${d.status==='pending'?`<button class="btn secondary" onclick="cancelRecruitOffer(${d.id})">Återkalla bud</button>`:''}<button class="btn secondary" onclick="${getPlayerClub(d.playerId)===managerClub()?`selectPlayer('${d.playerId}')`:`recruitOpen('${d.playerId}')`}">Spelarprofil</button></article>`).join('')||'<p>Inga bud skickade ännu. Öppna en spelare för att diskutera ett avtal.</p>'}</section>`;
}
function recruitHistoryView(){return `<section><h2>Marknadens övergångar</h2><p>Klubbarna söker förstärkningar utifrån truppens svagare positioner och sin budget.</p>${state.recruitment.history.map(h=>`<article class="recruit-history"><div><strong>${trainingSafe(h.name)}</strong><span>${seasonLabel(h.year)} · marknadsomgång ${h.tick}</span></div><p>${trainingSafe(h.seller)} → ${trainingSafe(h.buyer)}</p><b>${careerMoney(h.fee)}</b></article>`).join('')||'<p>Inga genomförda övergångar ännu.</p>'}</section>`;}
function recruitmentPlayerView(){return recruitHubPlayerView();}
function legacyRecruitmentPlayerView(){
 ensureRecruitment();const p=findPlayerAnywhere(state.selectedMarketPlayer);if(!p)return '<section class="recruit-empty"><h2>Spelaren finns inte kvar</h2><button class="btn" onclick="recruitTab(\'search\')">Till rekrytering</button></section>';
 if(isOwnPlayer(p))return `<section class="recruit-empty"><h2>${trainingSafe(p.name)} spelar nu i din klubb</h2><button class="btn" onclick="selectPlayer('${p.id}')">Öppna spelarprofilen</button></section>`;
 if(playerLoan(p))return `<section class="recruitment-page"><button class="btn secondary" onclick="deskNavigate('transfers','loans')">← Lånecentralen</button><h1>${trainingSafe(p.name)}</h1>${assessmentPanel(p)}${loanPlayerPanel(p)}${medicalPlayerPanel(p)}</section>`;
 const club=getPlayerClub(p.id),w=recruitPlayerWishes(p),r=state.recruitment,legacy=state.transferNegotiation&&samePlayerId(state.transferNegotiation.playerId,p.id)?state.transferNegotiation:null;
 return `<section class="recruitment-page"><button class="btn secondary" onclick="deskBack('transfers')">← Tillbaka</button><header class="daily-heading"><div><span class="career-eyebrow">${trainingSafe(club)} · ${RECRUIT_COUNTRIES[worldIsFree(p.id)?p.nationality:recruitCountry(club)]||p.nationality||'Sverige'}${p.fictional?' · FIKTIV SPELARE':''}</span><h1>${trainingSafe(p.name)}</h1><p>${p.pos} · ${p.age} år · ${p.contractYears} år kvar på avtalet</p></div><button class="btn secondary" onclick="toggleRecruitShortlist('${p.id}')">${r.shortlist.some(id=>samePlayerId(id,p.id))?'Ta bort från önskelistan':'Lägg till i önskelistan'}</button></header>${assessmentPanel(p)}${loanPlayerPanel(p)}${medicalPlayerPanel(p)}${calendarFuturePanel(p)}
 <section class="recruit-negotiation"><div><span class="career-eyebrow">SPELARENS REPRESENTANT</span><h2>Vad krävs för en övergång?</h2><p>${worldIsFree(p.id)?'Spelaren är kontraktslös. Förhandla direkt om lön, roll och avtal.':recruitWillingToSell(p,club)?'Klubben är öppen för en diskussion.':'Klubben vill behålla spelaren med tanke på truppens kvalitet eller storlek.'}</p><dl><dt>Klubbens prisnivå</dt><dd>${careerMoney(recruitFee(p))}</dd><dt>Önskad årslön</dt><dd>${careerMoney(w.salary)}</dd><dt>Önskad roll</dt><dd>${w.role}</dd><dt>Avtalslängd</dt><dd>${w.minYears}–${w.maxYears} år</dd><dt>Prioriterar</dt><dd>${w.priority}</dd></dl><p>${w.stretch?'Spelaren ser din klubbs sportsliga nivå som ett steg nedåt och vill kompenseras i lön.':'Klubbens nivå är intressant, men roll och lön behöver stämma.'}</p><p>Ordinarie och nyckelspelare följs upp under de tre första matcherna. Målvakter behöver 30 minuter, övriga 12 respektive 15 minuter i minst två matcher.</p></div>
 <form onsubmit="event.preventDefault();submitRecruitOffer('${p.id}',this.elements.fee.value,this.elements.salary.value,this.elements.years.value,this.elements.role.value)"><h2>Ditt erbjudande · anslut direkt</h2><p>${calendarDeadlineText()}</p>${r.message?`<p role="status">${trainingSafe(r.message)}</p>`:''}<label>Övergångssumma<input name="fee" type="number" min="${worldIsFree(p.id)?0:1}" ${worldIsFree(p.id)?'readonly':''} step="1" required value="${legacy?.transferFee||recruitFee(p)}"></label><label>Årslön<input name="salary" type="number" min="1" step="1" required value="${legacy?.salaryDemand||w.salary}"></label><label>År<select name="years">${recruitOptions({1:'1 år',2:'2 år',3:'3 år',4:'4 år',5:'5 år'},Math.min(3,w.maxYears))}</select></label><label>Roll i laget<select name="role">${recruitOptions(Object.fromEntries(SQUAD_ROLES.map(k=>[k,k])),w.role)}</select></label><button class="btn" type="submit" ${r.deals.some(d=>samePlayerId(d.playerId,p.id)&&d.status==='pending')?'disabled':''}>Skicka erbjudande</button><p>Budet reserverar transfer- och löneutrymme. Besked kommer om två kalenderdagar.</p></form></section></section>`;
}
