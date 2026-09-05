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
    state.recruitment.ai[club]={cash:12000000,wageLimit:Math.round(wage*1.3),year:recruitmentYear()};
  }
}
function recruitCountry(club){return RECRUIT_CLUBS.find(c=>c[0]===club)?.[1]||'SWE';}
function recruitMessage(text){state.recruitment.message=text;save();render();}
function recruitReport(title,body){const r=state.recruitment;managerMessage(`recruit:${r.nextId++}`,title,body,'Rekrytering',{link:'transfers'});}
function recruitRoleValue(p,profile,estimated=true){const def=RECRUIT_PROFILES[profile];if(!def||!def.positions.includes(p.pos))return 0;return attributeWeighted(estimated?playerAssessment(p).estimated:ensurePlayerAttributes(p),def.weights);}
function recruitmentNeeds(){
 return Object.entries(RECRUIT_PROFILES).map(([name,def])=>{
   const ps=managerRoster().filter(p=>def.positions.includes(p.pos)).map(p=>({p,value:recruitRoleValue(p,name)})).sort((a,b)=>b.value-a.value);
   const capable=ps.filter(x=>x.value>=12),secure=capable.filter(x=>x.p.contractYears>1),need=Math.max(0,def.target-capable.length);
   return {name,need,secure:secure.length,count:capable.length,target:def.target,players:ps.slice(0,3),priority:need?'Förstärk nu':secure.length<def.target?'Planera efterträdare':'God täckning'};
 }).sort((a,b)=>b.need-a.need||a.secure-b.secure);
}
function recruitFee(p){return Math.round((p.askingPrice||calculateTransferPrice(p))*(p.transferListed?.9:1));}
function recruitFilters(){return state.recruitment.filters;}
function setRecruitFilter(key,value){const f=recruitFilters();f[key]=['maxAge','maxFee','minAttribute'].includes(key)?Number(value):String(value);save();render();}
function recruitCandidates(filters=recruitFilters()){
 return getTransferMarketPlayers().filter(p=>(filters.country==='ALL'||recruitCountry(p.team)===filters.country)&&(filters.profile==='ALL'||recruitRoleValue(p,filters.profile)>0)&&p.age<=filters.maxAge&&recruitFee(p)<=filters.maxFee&&(!filters.query||`${p.name} ${p.team}`.toLowerCase().includes(filters.query.toLowerCase()))&&(!filters.attribute||Number(playerAssessment(p).estimated[filters.attribute]||0)>=Number(filters.minAttribute||10))).sort((a,b)=>filters.profile==='ALL'?a.name.localeCompare(b.name,'sv'):recruitRoleValue(b,filters.profile)-recruitRoleValue(a,filters.profile));
}
function recruitSelectProfile(name){recruitFilters().profile=name;state.recruitment.tab='search';state.page='transfers';save();render();}
function recruitOpen(id){state.selectedMarketPlayer=id;state.page='marketPlayer';save();render();}
function toggleRecruitShortlist(id){const r=state.recruitment;if(!findPlayerAnywhere(id))return;r.shortlist=r.shortlist.some(x=>samePlayerId(x,id))?r.shortlist.filter(x=>!samePlayerId(x,id)):[...r.shortlist,id];save();render();}
function createScoutMission(){
 const r=state.recruitment;if(r.missions.filter(m=>m.status==='active').length>=2)return recruitMessage('Chefsscouten kan ansvara för två uppdrag samtidigt.');
 if(state.money<25000)return recruitMessage('Ett scoutuppdrag kostar 25 000 kr.');
 const filters={...r.filters},candidates=recruitCandidates(filters).filter(p=>(state.scoutReports[String(p.id)]?.visits||0)<3).slice(0,3);
 if(!candidates.length)return recruitMessage('Inga spelare matchar sökningen. Bredda land, ålder, budget eller attributkrav.');
 state.money-=25000;
 r.missions.unshift({id:r.nextId++,filters,players:candidates.map(p=>p.id),started:r.tick,observations:0,status:'active'});
 recruitMessage('Uppdraget är startat. Tre observationer görs över tre omgångar eller försäsongsveckor. Kostnad: 25 000 kr.');
}
function cancelScoutMission(id){const m=state.recruitment.missions.find(m=>m.id===id);if(!m||m.status!=='active')return;m.status='cancelled';recruitMessage('Uppdraget avslutat. Tidigare observationer finns kvar.');}
function advanceRecruitmentRound(){
 ensureRecruitment();const r=state.recruitment;if(!r)return;
 const key=`${recruitmentYear()}:${state.round}`;if(r.lastRound===key)return;r.lastRound=key;advanceRecruitment();
}
function recruitmentWeek(){
 if(state.season?.phase!=='preseason')return;
 const r=state.recruitment;r.weeks++;advanceRecruitment();for(let i=0;i<7;i++)medicalDay();
 for(let i=0;i<3;i++)juniorTraining({type:"skills",intensity:"normal"},`${state.season.year}:preseason:${r.weeks}:${i}`);
 // Individual observations use the same offseason time as scout assignments.
 for(const report of Object.values(state.scoutReports))if(report.dueRound){report.visits=Math.min(3,report.visits+1);delete report.dueRound;}
 recruitMessage(`Försäsongsvecka ${r.weeks}: scouter, spelare och klubbar har lämnat nya besked.`);
}
function advanceRecruitment(){
 const r=state.recruitment;r.tick++;
 for(const [club,budget] of Object.entries(r.ai))if(budget.year!==recruitmentYear()){
   budget.year=recruitmentYear();budget.cash+=6000000;budget.wageLimit=Math.round(state.clubRosters[club].reduce((n,p)=>n+p.salary,0)*1.3);
 }
 for(const mission of r.missions.filter(m=>m.status==='active')){
   mission.observations++;
   for(const id of mission.players){const p=findPlayerAnywhere(id);if(!p||isOwnPlayer(p))continue;const report=state.scoutReports[String(id)]||(state.scoutReports[String(id)]={visits:0});
     if(report.observedTick!==r.tick){report.visits=Math.min(3,report.visits+1);report.observedTick=r.tick;delete report.dueRound;}
   }
   if(mission.observations>=3){mission.status='completed';recruitReport('Scoutuppdrag slutfört',`Rapporterna för ${mission.players.map(id=>findPlayerAnywhere(id)?.name).filter(Boolean).join(', ')} är klara. Jämför attribut, roller och osäkerhet i rekryteringscentralen.`);}
 }
 for(const deal of r.deals.filter(d=>d.status==='pending'&&d.due<=r.tick))resolveRecruitDeal(deal);
 r.incoming.filter(o=>o.status==='pending'&&o.expires<r.tick).forEach(o=>o.status='expired');
 if(r.tick%2===0)generateIncomingOffer();
 if(r.tick%3===0)aiRecruitTransfer();
}
function recruitPlayerWishes(p,club=managerClub()){
 const roster=state.clubRosters[club]||[],group=roster.filter(q=>p.pos==='MV'?q.pos==='MV':p.pos==='B'?q.pos==='B':!['MV','B'].includes(q.pos));
 const ability=matchAttributeRating(p),avg=group.reduce((n,q)=>n+matchAttributeRating(q),0)/Math.max(1,group.length);
 const ambition=attrSeed(`${p.id}:ambition`)>.58;
 const level=ability-avg,role=level>2?'Nyckelspelare':level>-3?'Ordinarie':'Rotation';
 const clubStrength=roster.reduce((n,q)=>n+matchAttributeRating(q),0)/Math.max(1,roster.length);
 const stretch=ambition&&ability>clubStrength+5;
 const salary=Math.round(p.salary*(stretch?1.35:1.12)/10000)*10000;
 return {role,salary,minYears:p.age<24?2:1,maxYears:p.age>=32?2:5,priority:ambition?'Sportsliga ambitioner':'Speltid och trygghet',stretch};
}
function recruitCanSell(p,club){const roster=state.clubRosters[club]||[];const group=q=>q.pos==='MV'?'MV':q.pos==='B'?'B':'F';return roster.filter(q=>group(q)===group(p)).length>({MV:2,B:6,F:12})[group(p)];}
function recruitCanAfford(club,p,fee,salary){
 if(club===managerClub())return state.money>=fee&&annualWageCost()+salary<=wageBudget();
 const b=state.recruitment.ai[club];return Boolean(b&&b.cash>=fee&&state.clubRosters[club].reduce((n,q)=>n+q.salary,0)+salary<=b.wageLimit);
}
function recruitWillingToSell(p,club){return recruitCanSell(p,club)&&(p.transferListed||p.contractYears<=1||matchAttributeRating(p)<Math.max(...state.clubRosters[club].map(q=>matchAttributeRating(q)))-2);}
function recruitRival(p,seller){
 if(attrSeed(`${p.id}:${recruitmentYear()}:rival`)>.65)return null;
 const clubs=Object.keys(state.recruitment.ai).filter(c=>c!==seller&&recruitCanAfford(c,p,recruitFee(p),recruitPlayerWishes(p,c).salary));
 if(!clubs.length)return null;
 const club=clubs[Math.floor(attrSeed(`${p.id}:rivalClub`)*clubs.length)],wishes=recruitPlayerWishes(p,club);
 return {club,fee:recruitFee(p),salary:wishes.salary,years:Math.min(3,wishes.maxYears),role:wishes.role};
}
function recruitOfferScore(p,club,offer){
 const w=recruitPlayerWishes(p,club),rank=SQUAD_ROLES.indexOf(offer.role);
 return offer.salary/w.salary*40+(rank-SQUAD_ROLES.indexOf(w.role))*12+(w.stretch?-15:5)+(offer.years>=w.minYears&&offer.years<=w.maxYears?10:-25);
}
function submitRecruitOffer(id,fee,salary,years,role){
 ensureRecruitment();const r=state.recruitment,p=findPlayerAnywhere(id),seller=getPlayerClub(id);
 if(state.live&&!state.live.finished)return recruitMessage('Avsluta matchen innan du skickar ett transferbud.');
 if(!p||!seller||seller===managerClub())return;
 fee=Math.round(Number(fee));salary=Math.round(Number(salary));years=Number(years);
 if(!Number.isFinite(fee)||!Number.isFinite(salary)||fee<=0||salary<=0||!Number.isInteger(years)||years<1||years>5||!SQUAD_ROLES.includes(role))return recruitMessage('Ange giltigt bud, årslön, kontraktslängd och spelarens roll.');
 if(!recruitCanAfford(managerClub(),p,fee,salary))return recruitMessage('Budet ryms inte i din kassa eller lönebudget.');
 if(r.deals.some(d=>samePlayerId(d.playerId,id)&&d.status==='pending'))return recruitMessage('Spelaren överväger redan ditt bud. Du kan återkalla det under Förhandlingar.');
 const previous=r.deals.find(d=>samePlayerId(d.playerId,id)&&d.status==='rejected'&&d.due>r.tick-2);
 if(previous)return recruitMessage('Spelaren och klubben vill avvakta två marknadsomgångar efter avslaget.');
 const reserved=r.deals.filter(d=>d.status==='pending').reduce((n,d)=>({fee:n.fee+d.fee,salary:n.salary+d.salary}),{fee:0,salary:0});
 if(fee+reserved.fee>state.money||salary+reserved.salary+annualWageCost()>wageBudget())return recruitMessage('Dina pågående bud har redan reserverat det återstående transfer- eller löneutrymmet.');
 const deal={id:r.nextId++,playerId:p.id,name:p.name,seller,fee,salary,years,role,status:'pending',due:r.tick+1,rival:recruitRival(p,seller)};
 r.deals.unshift(deal);if(state.transferNegotiation&&samePlayerId(state.transferNegotiation.playerId,id))state.transferNegotiation=null;r.tab='deals';state.page='transfers';recruitMessage('Budet är skickat. Klubben och spelaren svarar efter nästa omgång eller försäsongsvecka.');
}
function cancelRecruitOffer(id){const d=state.recruitment.deals.find(d=>d.id===id);if(d?.status==='pending'){d.status='cancelled';recruitMessage('Budet återkallat. Det reserverade utrymmet är frigjort.');}}
function resolveRecruitDeal(d){
 const p=findPlayerAnywhere(d.playerId);let reason='';
 if(!p||getPlayerClub(d.playerId)!==d.seller)reason='Spelaren har redan lämnat klubben.';
 else if(!recruitWillingToSell(p,d.seller))reason='Klubben vill behålla spelaren: nyckelspelare eller för liten trupp.';
 else if(d.fee<recruitFee(p))reason='Klubben avvisar övergångssumman.';
 else if(!recruitCanAfford(managerClub(),p,d.fee,d.salary))reason='Din kassa eller lönebudget räcker inte längre.';
 else{
   const w=recruitPlayerWishes(p);
   if(d.salary<w.salary)reason=`Spelaren begär minst ${money(w.salary)} per år med tanke på klubbens nivå och sin nuvarande lön.`;
   else if(SQUAD_ROLES.indexOf(d.role)<SQUAD_ROLES.indexOf(w.role))reason=`Spelaren vill ha rollen ${w.role.toLowerCase()}.`;
   else if(d.years<w.minYears||d.years>w.maxYears)reason=`Spelaren önskar ${w.minYears}–${w.maxYears} år.`;
   else if(d.rival&&recruitCanAfford(d.rival.club,p,d.rival.fee,d.rival.salary)&&recruitOfferScore(p,d.rival.club,d.rival)>recruitOfferScore(p,managerClub(),d)+1){
     reason=`Spelaren valde ${d.rival.club}: deras kombination av roll, lön och ambitioner vägde tyngre.`;
     transferRecruitPlayer(p,d.seller,d.rival.club,d.rival.fee,d.rival.salary,d.rival.years,d.rival.role);
   }
 }
 if(reason){d.status='rejected';d.reason=reason;recruitReport(`Besked om ${d.name}`,reason);return;}
 transferRecruitPlayer(p,d.seller,managerClub(),d.fee,d.salary,d.years,d.role);d.status='signed';d.reason='Både klubb och spelare accepterade.';
 recruitReport(`${d.name} är klar`,`${d.name} ansluter från ${d.seller}. Avtal: ${d.years} år, ${money(d.salary)}/år, ${d.role.toLowerCase()}. Rollen följs upp av tränarteamet.`);
}
function transferRecruitPlayer(p,seller,buyer,fee,salary,years,role){
 const r=state.recruitment;if(getPlayerClub(p.id)!==seller||seller===buyer||!recruitCanAfford(buyer,p,fee,salary))return false;
 state.clubRosters[seller]=state.clubRosters[seller].filter(q=>!samePlayerId(q.id,p.id));
 state.clubRosters[buyer].push(p);
 if(buyer===managerClub())state.money-=fee;else r.ai[buyer].cash-=fee;
 if(seller===managerClub())state.money+=fee;else if(r.ai[seller])r.ai[seller].cash+=fee;
 Object.assign(p,{club:buyer,salary,contractYears:years,squadRole:role,promisedRole:role,transferListed:false,askingPrice:null,happiness:78,morale:78,fatigue:0});
 if(buyer===managerClub()&&SQUAD_ROLES.indexOf(role)>=SQUAD_ROLES.indexOf('Ordinarie'))p.recruitmentPromise={role,minutes:p.pos==='MV'?30:role==='Nyckelspelare'?15:12,games:0,qualified:0,resolved:false};
 else delete p.recruitmentPromise;
 r.history.unshift({id:r.nextId++,year:recruitmentYear(),tick:r.tick,name:p.name,playerId:p.id,seller,buyer,fee});r.history=r.history.slice(0,250);
 if(seller===managerClub()||buyer===managerClub()){syncManagerRoster();state.lines=null;state.specialTeams=null;}
 // Rebuild team strength so background results respond to roster changes too.
 for(const club of [seller,buyer]){const t=team(club);if(t)t.strength=Math.round(state.clubRosters[club].reduce((n,q)=>n+matchAttributeRating(q),0)/state.clubRosters[club].length);}
 return true;
}
function generateIncomingOffer(){
 const r=state.recruitment,p=managerRoster().find(p=>p.transferListed&&recruitCanSell(p,managerClub())&&!r.incoming.some(o=>samePlayerId(o.playerId,p.id)&&o.status==='pending'));
 if(!p)return;
 const fee=recruitFee(p),buyer=Object.keys(r.ai).find(c=>recruitCanAfford(c,p,fee,recruitPlayerWishes(p,c).salary));if(!buyer)return;
 const w=recruitPlayerWishes(p,buyer);
 r.incoming.unshift({id:r.nextId++,playerId:p.id,name:p.name,buyer,fee,salary:w.salary,role:w.role,years:Math.min(3,w.maxYears),expires:r.tick+3,status:'pending'});
 recruitReport(`Bud på ${p.name}`,`${buyer} erbjuder ${money(fee)}. Du avgör om spelaren ska säljas. Budet gäller i tre marknadsomgångar.`);
}
function answerIncomingOffer(id,accept){
 const r=state.recruitment,o=r.incoming.find(o=>o.id===id);if(!o||o.status!=='pending')return;
 if(!accept){o.status='rejected';return recruitMessage('Budet avvisat.');}
 if(state.live&&!state.live.finished)return recruitMessage('Avsluta matchen innan du säljer en spelare.');
 const p=managerRoster().find(p=>samePlayerId(p.id,o.playerId));
 if(!p||o.expires<r.tick||!recruitCanSell(p,managerClub())||!transferRecruitPlayer(p,managerClub(),o.buyer,o.fee,o.salary,o.years,o.role)){o.status='expired';return recruitMessage('Affären kan inte genomföras. Kontrollera truppens storlek och köparens ekonomi.');}
 o.status='accepted';recruitMessage(`${p.name} lämnar för ${o.buyer}. ${money(o.fee)} har tillförts kassan.`);
}
function aiRecruitTransfer(){
 const r=state.recruitment,clubs=Object.keys(r.ai),buyer=clubs[Math.floor(r.tick/3-1)%clubs.length];
 const activeTargets=r.deals.filter(d=>d.status==='pending').map(d=>String(d.playerId));
 const roster=state.clubRosters[buyer],groups=['MV','B','F'],group=p=>p.pos==='MV'?'MV':p.pos==='B'?'B':'F';
 const weakest=groups.map(g=>({g,value:roster.filter(p=>group(p)===g).reduce((n,p)=>n+matchAttributeRating(p),0)/Math.max(1,roster.filter(p=>group(p)===g).length)})).sort((a,b)=>a.value-b.value)[0];
 const candidates=getTransferMarketPlayers().filter(p=>p.team!==buyer&&!activeTargets.includes(String(p.id))&&group(p)===weakest.g&&recruitWillingToSell(p,p.team)&&recruitCanAfford(buyer,p,recruitFee(p),recruitPlayerWishes(p,buyer).salary)).sort((a,b)=>matchAttributeRating(b)-matchAttributeRating(a));
 const p=candidates.find(p=>matchAttributeRating(p)>weakest.value+1);if(!p||roster.length>=30)return;
 const actual=findPlayerAnywhere(p.id),w=recruitPlayerWishes(actual,buyer);
 transferRecruitPlayer(actual,p.team,buyer,recruitFee(actual),w.salary,Math.min(3,w.maxYears),w.role);
}

function followRecruitmentPromises(m){
 for(const p of managerRoster()){
   const promise=p.recruitmentPromise;if(!promise||promise.resolved)continue;
   if(medicalExcused(p,promise.minutes*60))continue;
   promise.games++;if((m.iceTime?.[p.id]||0)>=promise.minutes*60)promise.qualified++;
   if(promise.games>=3){promise.resolved=true;const met=promise.qualified>=2;p.happiness=trainingClamp(p.happiness+(met?5:-12),20,100);
     recruitReport(`${p.name}: uppföljning av rollen`,`${promise.role}: minst ${promise.minutes} minuter i två av tre matcher. Utfallet blev ${promise.qualified} matcher. ${met?'Spelaren är nöjd med förtroendet.':'Spelaren är besviken över sin speltid.'}`);
   }
 }
}
function recruitTab(tab){if(!['search','missions','shortlist','deals','history'].includes(tab))return;state.recruitment.tab=tab;state.page='transfers';save();render();}
function recruitOptions(options,value){return Object.entries(options).map(([key,label])=>`<option value="${trainingSafe(key)}" ${String(key)===String(value)?'selected':''}>${trainingSafe(label)}</option>`).join('');}
function recruitmentView(){
 ensureRecruitment();const r=state.recruitment,f=r.filters,pending=r.deals.filter(d=>d.status==='pending'),incoming=r.incoming.filter(d=>d.status==='pending');
 return `<section class="recruitment-page"><header class="daily-heading"><div><span class="career-eyebrow">SPORTCHEFENS ARBETSBORD</span><h1>Bygg nästa lag.</h1><p>Rätt egenskaper. Rätt roll. Ett avtal som håller.</p></div><button class="btn secondary" onclick="trainingOpen('scouting')">Tränarteam & rapporter</button></header>
 <div class="recruit-finances"><div><span>Kassa</span><strong>${careerMoney(state.money)}</strong></div><div><span>Ledigt löneutrymme / år</span><strong>${careerMoney(wageBudget()-annualWageCost())}</strong></div><div><span>Reserverat i bud</span><strong>${careerMoney(pending.reduce((n,d)=>n+d.fee,0))}</strong></div><div><span>Marknadsomgång</span><strong>${r.tick}</strong></div></div>
 <details class="recruit-needs" ${r.tab==='search'?'open':''}><summary>Tränarteamets truppanalys</summary><p>Bedömning av rollernas attribut och kontraktsläge. En spelare kan täcka flera roller. Jämför själv i spelarprofilen.</p><div class="recruit-needs-grid">${recruitmentNeeds().map(n=>`<button class="need-card ${n.need?'urgent':''}" onclick="recruitSelectProfile('${n.name}')"><span>${n.priority}</span><strong>${n.name}</strong><b>${n.count} / ${n.target} användbara</b><small>${n.players.map(x=>trainingSafe(x.p.name)).join(' · ')||'Ingen spelare i positionen'}</small></button>`).join('')}</div></details>
 <nav class="recruit-tabs" aria-label="Rekrytering">${[['search','Spelarsökning'],['missions','Scoutuppdrag'],['shortlist',`Önskelista (${r.shortlist.length})`],['deals',`Förhandlingar (${pending.length+incoming.length})`],['history','Övergångar']].map(([key,label])=>`<button aria-current="${r.tab===key?'page':'false'}" onclick="recruitTab('${key}')">${label}</button>`).join('')}</nav>
 ${r.message?`<p class="recruit-notice" role="status">${trainingSafe(r.message)}</p>`:''}
 ${state.season?.phase==='preseason'?`<div class="recruit-clock"><span>Försäsongsvecka ${r.weeks}. Nästa vecka ger nya rapporter och budbesked.</span><button class="btn" onclick="recruitmentWeek()">Gå en vecka framåt</button></div>`:'<p class="recruit-clock">Scoutrapporter och budbesked kommer efter nästa spelade omgång. Att öppna sidan eller ladda om går inte tiden framåt.</p>'}
 ${r.tab==='search'?recruitSearchView():r.tab==='missions'?recruitMissionsView():r.tab==='shortlist'?recruitPlayerRows(r.shortlist.map(findPlayerAnywhere).filter(p=>p&&!isOwnPlayer(p))):r.tab==='deals'?recruitDealsView():recruitHistoryView()}
 <p class="training-note">Utlandsmarknaden innehåller fiktiva spelare i sex fiktiva klubbar i Finland, Schweiz och Tyskland. Ligor och matcher där är ännu inte spelbara.</p></section>`;
}
function recruitSearchView(){
 const f=recruitFilters(),players=recruitCandidates();
 return `<section><div class="recruit-filters"><label>Sök namn eller klubb<input type="search" value="${trainingSafe(f.query)}" onchange="setRecruitFilter('query',this.value)" placeholder="Spelare eller klubb"></label><label>Marknad<select onchange="setRecruitFilter('country',this.value)">${recruitOptions(RECRUIT_COUNTRIES,f.country)}</select></label><label>Spelarprofil<select onchange="setRecruitFilter('profile',this.value)">${recruitOptions({ALL:'Alla roller',...Object.fromEntries(Object.keys(RECRUIT_PROFILES).map(k=>[k,k]))},f.profile)}</select></label><label>Högsta ålder<input type="number" min="18" max="60" value="${f.maxAge}" onchange="setRecruitFilter('maxAge',this.value)"></label><label>Högsta övergångssumma<input type="number" min="0" step="100000" value="${f.maxFee}" onchange="setRecruitFilter('maxFee',this.value)"></label><label>Viktigt attribut<select onchange="setRecruitFilter('attribute',this.value)">${recruitOptions({'':'Inget särskilt',...SKATER_ATTRIBUTES,...GOALIE_ATTRIBUTES},f.attribute||'')}</select></label><label>Lägsta bedömda attribut<input type="number" min="1" max="20" value="${f.minAttribute||10}" onchange="setRecruitFilter('minAttribute',this.value)"></label></div><div class="recruit-search-actions"><p>${players.length} spelare matchar. Filtrering och rangordning använder personalens osäkra attributbedömning.</p><button class="btn" onclick="createScoutMission()">Scouta tre kandidater · 25 000 kr</button></div>${recruitPlayerRows(players.slice(0,50))}${players.length>50?'<p>Visar de första 50. Begränsa sökningen för att hitta fler profiler.</p>':''}</section>`;
}
function recruitPlayerRows(players){
 const r=state.recruitment;
 return players.length?`<div class="recruit-players">${players.map(p=>{
   const report=playerAssessment(p),club=getPlayerClub(p.id),listed=r.shortlist.some(id=>samePlayerId(id,p.id));
   return `<article class="recruit-player"><button class="recruit-identity" onclick="recruitOpen('${p.id}')"><strong>${trainingSafe(p.name)}</strong><span>${p.pos} · ${p.age} år · ${trainingSafe(club)} · ${RECRUIT_COUNTRIES[recruitCountry(club)]}</span></button><div><span>Förmåga / potential</span><strong>${assessmentBadge(p)} / ${assessmentBadge(p,true)}</strong><small>${report.roles[0].name} · ${report.visits}/3 observationer</small></div><div><span>Klubbens prisnivå</span><strong>${careerMoney(recruitFee(p))}</strong><small>${p.transferListed?'Transferlistad':recruitWillingToSell(p,club)?'Kan diskuteras':'Klubben vill behålla'}</small></div><button class="btn secondary" aria-pressed="${listed}" onclick="toggleRecruitShortlist('${p.id}')">${listed?'Ta bort':'Bevaka'}</button></article>`;
 }).join('')}</div>`:'<div class="recruit-empty"><h2>Inga spelare här ännu</h2><p>Justera sökningen eller lägg till spelare från spelarprofilen.</p></div>';
}
function recruitMissionsView(){
 const r=state.recruitment;
 return `<section><h2>Chefsscoutens uppdrag</h2><p>Två samtidiga uppdrag. Varje uppdrag kostar 25 000 kr och omfattar upp till tre spelare. Välj sökkrav under Spelarsökning.</p>${r.missions.map(m=>`<article class="recruit-mission"><header><h3>${m.filters.profile==='ALL'?'Bred sökning':m.filters.profile} · ${RECRUIT_COUNTRIES[m.filters.country]}</h3><span>${m.status==='active'?'Pågår':m.status==='completed'?'Rapport klar':'Avslutat'}</span></header><p>Högst ${m.filters.maxAge} år · ${careerMoney(m.filters.maxFee)} · ${m.observations}/3 observationstillfällen</p><progress max="3" value="${m.observations}" aria-label="Observationstillfällen"></progress>${recruitPlayerRows(m.players.map(findPlayerAnywhere).filter(p=>p&&!isOwnPlayer(p)))}${m.status==='active'?`<button class="btn secondary" onclick="cancelScoutMission(${m.id})">Avsluta uppdrag</button>`:''}</article>`).join('')||'<p>Inga uppdrag startade ännu.</p>'}</section>`;
}
function recruitDealsView(){
 const r=state.recruitment;
 return `<section>${state.transferNegotiation&&findPlayerAnywhere(state.transferNegotiation.playerId)&&!isOwnPlayer(findPlayerAnywhere(state.transferNegotiation.playerId))?`<div class="recruit-notice"><p>Du har en tidigare påbörjad kontraktsdiskussion. Granska villkoren innan du skickar ett nytt erbjudande.</p><button class="btn" onclick="recruitOpen('${state.transferNegotiation.playerId}')">Fortsätt diskussionen</button></div>`:''}<h2>Bud på dina spelare</h2><p>Transferlista spelare i deras profiler för att bjuda in andra klubbar. Ditt godkännande krävs för varje försäljning.</p>${r.incoming.filter(o=>o.status==='pending').map(o=>`<article class="recruit-deal"><h3>${o.name} → ${o.buyer}</h3><p>${careerMoney(o.fee)} · ${o.expires-r.tick} marknadsomgångar kvar</p><button class="btn" onclick="answerIncomingOffer(${o.id},true)">Acceptera försäljning</button><button class="btn secondary" onclick="answerIncomingOffer(${o.id},false)">Avvisa</button></article>`).join('')||'<p>Inga inkommande bud.</p>'}<h2>Dina förhandlingar</h2>${r.deals.slice(0,30).map(d=>`<article class="recruit-deal"><header><h3>${d.name}</h3><strong>${({pending:'Inväntar besked',signed:'Klar',rejected:'Avslag',cancelled:'Återkallat'})[d.status]}</strong></header><p>${careerMoney(d.fee)} · ${careerMoney(d.salary)}/år · ${d.years} år · ${d.role}</p>${d.rival?`<p class="recruit-rival">Konkurrerande erbjudande: ${d.rival.club} · ${careerMoney(d.rival.salary)}/år · ${d.rival.role}. Spelaren väger även klubbens ambitioner.</p>`:''}<p>${trainingSafe(d.reason||'Svar efter nästa spelade omgång eller försäsongsvecka.')}</p>${d.status==='pending'?`<button class="btn secondary" onclick="cancelRecruitOffer(${d.id})">Återkalla bud</button>`:''}<button class="btn secondary" onclick="${getPlayerClub(d.playerId)===managerClub()?`selectPlayer('${d.playerId}')`:`recruitOpen('${d.playerId}')`}">Spelarprofil</button></article>`).join('')||'<p>Inga bud skickade ännu. Öppna en spelare för att diskutera ett avtal.</p>'}</section>`;
}
function recruitHistoryView(){return `<section><h2>Marknadens övergångar</h2><p>Klubbarna söker förstärkningar utifrån truppens svagare positioner och sin budget.</p>${state.recruitment.history.map(h=>`<article class="recruit-history"><div><strong>${trainingSafe(h.name)}</strong><span>${seasonLabel(h.year)} · marknadsomgång ${h.tick}</span></div><p>${trainingSafe(h.seller)} → ${trainingSafe(h.buyer)}</p><b>${careerMoney(h.fee)}</b></article>`).join('')||'<p>Inga genomförda övergångar ännu.</p>'}</section>`;}
function recruitmentPlayerView(){
 ensureRecruitment();const p=findPlayerAnywhere(state.selectedMarketPlayer);if(!p)return '<section class="recruit-empty"><h2>Spelaren finns inte kvar</h2><button class="btn" onclick="recruitTab(\'search\')">Till rekrytering</button></section>';
 if(isOwnPlayer(p))return `<section class="recruit-empty"><h2>${trainingSafe(p.name)} spelar nu i din klubb</h2><button class="btn" onclick="selectPlayer('${p.id}')">Öppna spelarprofilen</button></section>`;
 const club=getPlayerClub(p.id),w=recruitPlayerWishes(p),r=state.recruitment,legacy=state.transferNegotiation&&samePlayerId(state.transferNegotiation.playerId,p.id)?state.transferNegotiation:null;
 return `<section class="recruitment-page"><button class="btn secondary" onclick="recruitTab('search')">← Rekrytering</button><header class="daily-heading"><div><span class="career-eyebrow">${trainingSafe(club)} · ${RECRUIT_COUNTRIES[recruitCountry(club)]}${p.fictional?' · FIKTIV SPELARE':''}</span><h1>${trainingSafe(p.name)}</h1><p>${p.pos} · ${p.age} år · ${p.contractYears} år kvar på avtalet</p></div><button class="btn secondary" onclick="toggleRecruitShortlist('${p.id}')">${r.shortlist.some(id=>samePlayerId(id,p.id))?'Ta bort från önskelistan':'Lägg till i önskelistan'}</button></header>${assessmentPanel(p)}${medicalPlayerPanel(p)}
 <section class="recruit-negotiation"><div><span class="career-eyebrow">SPELARENS REPRESENTANT</span><h2>Vad krävs för en övergång?</h2><p>${recruitWillingToSell(p,club)?'Klubben är öppen för en diskussion.':'Klubben vill behålla spelaren med tanke på truppens kvalitet eller storlek.'}</p><dl><dt>Klubbens prisnivå</dt><dd>${careerMoney(recruitFee(p))}</dd><dt>Önskad årslön</dt><dd>${careerMoney(w.salary)}</dd><dt>Önskad roll</dt><dd>${w.role}</dd><dt>Avtalslängd</dt><dd>${w.minYears}–${w.maxYears} år</dd><dt>Prioriterar</dt><dd>${w.priority}</dd></dl><p>${w.stretch?'Spelaren ser din klubbs sportsliga nivå som ett steg nedåt och vill kompenseras i lön.':'Klubbens nivå är intressant, men roll och lön behöver stämma.'}</p><p>Ordinarie och nyckelspelare följs upp under de tre första matcherna. Målvakter behöver 30 minuter, övriga 12 respektive 15 minuter i minst två matcher.</p></div>
 <form onsubmit="event.preventDefault();submitRecruitOffer('${p.id}',this.elements.fee.value,this.elements.salary.value,this.elements.years.value,this.elements.role.value)"><h2>Ditt erbjudande</h2>${r.message?`<p role="status">${trainingSafe(r.message)}</p>`:''}<label>Övergångssumma<input name="fee" type="number" min="1" step="1" required value="${legacy?.transferFee||recruitFee(p)}"></label><label>Årslön<input name="salary" type="number" min="1" step="1" required value="${legacy?.salaryDemand||w.salary}"></label><label>År<select name="years">${recruitOptions({1:'1 år',2:'2 år',3:'3 år',4:'4 år',5:'5 år'},Math.min(3,w.maxYears))}</select></label><label>Roll i laget<select name="role">${recruitOptions(Object.fromEntries(SQUAD_ROLES.map(k=>[k,k])),w.role)}</select></label><button class="btn" type="submit" ${r.deals.some(d=>samePlayerId(d.playerId,p.id)&&d.status==='pending')?'disabled':''}>Skicka erbjudande</button><p>Budet reserverar transfer- och löneutrymme. Besked kommer efter nästa omgång eller försäsongsvecka.</p></form></section></section>`;
}
