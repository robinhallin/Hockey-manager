"use strict";
function recruitRoleCredibility(p,club,role,future=false){
 const group=worldGroup(p),rank=SQUAD_ROLES.indexOf(role),slots=group==='MV'?(rank>=3?1:2):group==='B'?(rank>=3?4:6):(rank>=3?6:9);
 const roster=future?[...(state.clubRosters[club]||[]).filter(q=>q.contractYears>1&&!q.futureContract),...Object.values(state.clubRosters).flat().filter(q=>q.futureContract?.buyer===club),...(state.loans?.active||[]).filter(l=>l.owner===club).map(l=>findPlayerAnywhere(l.playerId)).filter(q=>q&&q.contractYears>1&&!q.futureContract)]:(state.clubRosters[club]||[]);
 const peers=[...new Map(roster.map(q=>[String(q.id),q])).values()].filter(q=>!samePlayerId(q.id,p.id)&&(!playerLoan(q)||future)&&worldGroup(q)===group&&SQUAD_ROLES.indexOf((future?q.futureContract?.role:null)||q.promisedRole||q.squadRole)>=rank);
 const pending=(state.recruitment?.deals||[]).filter(d=>d.status==='pending'&&(future?(d.kind==='future'||d.years>1):d.kind!=='future')&&(d.buyer||managerClub())===club&&!samePlayerId(d.playerId,p.id)&&SQUAD_ROLES.indexOf(d.role)>=rank&&worldGroup(findPlayerAnywhere(d.playerId)||{})===group);
 const excess=rank>=2?Math.max(0,peers.length+pending.length+1-slots):0;
 return {excess,count:peers.length+pending.length,slots,text:excess?`${peers.length+pending.length} andra spelare har samma eller högre ansvar inom ${slots} rimliga platser. Agenten tvivlar på rollöftet; det kräver bättre villkor eller en trovärdigare roll.`:'Rollen ryms numerärt bland nuvarande rollåtaganden. Laguttagningen avgör det faktiska ansvaret.'};
}
function recruitPackageDecision(p,club,offer,w=recruitPlayerWishes(p,club)){
 const identity=w.identity||playerPreferenceProfile(p,club),roleGap=SQUAD_ROLES.indexOf(w.role)-SQUAD_ROLES.indexOf(offer.role),ratio=offer.salary/Math.max(1,w.salary),credibility=recruitRoleCredibility(p,club,offer.role,offer.kind==='future');
 const floor=identity.ambition>=14?.95:identity.loyalty>=14?.85:.9;
 const issues=[];
 if(ratio<floor)issues.push(`Lönen måste vara minst ${Math.round(floor*100)} % av utgångskravet för den här spelaren.`);
 if(offer.years<w.minYears||offer.years>w.maxYears)issues.push(`Spelaren håller fast vid ${w.minYears}–${w.maxYears} år.`);
 if(roleGap>1||roleGap>0&&identity.ambition>=14)issues.push('Spelaren accepterar inte den minskningen av ansvar, även med högre lön.');
 const security=offer.years>=w.minYears&&offer.years<=w.maxYears?Math.min(6,Math.max(0,offer.years-w.minYears)*3)*identity.securityWeight:0;
 const value=(ratio-1)*40*identity.salaryWeight-roleGap*12*identity.roleWeight+security-credibility.excess*4;
 if(!issues.length&&value< -1)issues.push('Helheten kompenserar inte för lägre lön, mindre ansvar eller konkurrensen om rollen.');
 return {accepted:!issues.length,issues,value,credibility,explanation:issues.length?issues.join(' '):'Spelaren accepterar helheten av lön, ansvar och trygghet inom sina personliga gränser.'};
}
function recruitSellerPosition(p,seller){
 if(seller===WORLD_FREE)return {fee:0,text:'Kontraktslös: ingen övergångssumma eller säljande klubb.'};
 const peers=(state.clubRosters[seller]||[]).filter(q=>q!==p&&worldGroup(q)===worldGroup(p)&&medicalReady(q)&&!playerLoan(q));
 const premium=!p.transferListed&&p.contractYears>2?1.1:1;
 return {fee:Math.round(recruitFee(p)*premium),text:`${p.contractYears} kontraktsår kvar. ${peers.length} tillgängliga alternativ i positionsgruppen. ${p.transferListed?'Transferlistningen sänker klubbens pris.':premium>1?'Ett långt avtal ger klubben förhandlingsstyrka: 10 % påslag.':'Klubben utgår från sin värdering.'} ${recruitCanSell(p,seller)?'Minsta truppbredd kan behållas.':'Truppens minsta täckning hindrar en försäljning, oavsett bud.'}`};
}
function recruitmentMonthDay(){
 for(const v of scoutingOffice()?.reviews||[]){
  if(v.club!==managerClub()||v.monthReview||calAdd(v.date,30)>state.calendar.date)continue;
  const p=managerRoster().find(p=>samePlayerId(p.id,v.id));
  const games=p?(p.roleGames||[]).filter(g=>g.club===v.club&&g.date>=v.date&&g.date<=state.calendar.date):[];
  const met=games.filter(g=>g.role===v.role&&g.met).length;
  const text=!p?'Spelaren har lämnat truppen. Uppföljningen avslutas utan ny påföljd.':`${games.length} registrerade bedömbara matcher sedan ankomsten; ${met} med uppfylld ursprunglig roll (${v.role}). ${Math.round(games.reduce((n,g)=>n+g.seconds,0)/60)} minuters istid i underlaget. ${games.length<3?'För lite underlag för en säker slutsats.':p.promisedRole!==v.role?'Rollen har omförhandlats; jämför med det nya avtalet.':p.social.missed>=2?'Användningen motsvarar inte förväntningarna över tid. Ta ett samtal och planera ansvaret.':'Följ fortsatt ansvar och utveckling.'} Spelarens förtroende: ${Math.round(p.social.trust)}/100. ${p.social.lastResponse||'Inget samtal registrerat.'}`;
  v.monthReview={date:state.calendar.date,text,games:games.length,met};
  managerMessage(`arrival-month:${v.club}:${v.id}:${v.date}`,v.name+' · första månaden',text,'Rekrytering',{playerId:v.id,link:'transfers'});
 }
}
function recruitPersonalCounter(p,club,offer,w=recruitPlayerWishes(p,club)){
 const terms={fee:offer.fee,salary:Math.max(offer.salary,w.salary),years:Math.max(w.minYears,Math.min(w.maxYears,offer.years)),role:SQUAD_ROLES.indexOf(offer.role)<SQUAD_ROLES.indexOf(w.role)?w.role:offer.role};
 const result=recruitPackageDecision(p,club,{...terms,kind:offer.kind},w),weight=(w.identity||playerPreferenceProfile(p,club)).salaryWeight;
 if(result.value< -1)terms.salary=Math.ceil((terms.salary+(-result.value)*w.salary/(40*weight))/10000)*10000;
 return terms;
}
