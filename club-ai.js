"use strict";

// Persistent club simulation. Financial amounts are game estimates in SEK/year.
// Initialisation never replays matches, spends money or replaces a saved senior.
const AI_PROJECTS={title:'Utmanar om titeln',playoff:'Bygger ett slutspelslag',develop:'Utvecklar och säljer talanger',rebuild:'Bygger om truppen',survive:'Säkrar klubbens framtid'};
const AI_ROLE_DEFS={
 goalie:{label:'Målvakt',kind:'MV',target:2,keys:['reflexes','positioning','reboundControl','movement']},
 defense:{label:'Back',kind:'B',target:7,keys:['positioning','decisions','passing','skating']},
 forward:{label:'Forward',kind:'F',target:13,keys:['shooting','passing','skating','workRate']},
 center:{label:'Center',kind:'F',target:4,keys:['faceoffs','passing','decisions','positioning']},
 scorer:{label:'Målskytt',kind:'F',target:2,keys:['shooting','composure','positioning']},
 creator:{label:'Spelfördelare',kind:'F',target:2,keys:['passing','vision','puckControl']},
 stopper:{label:'Defensiv back',kind:'B',target:2,keys:['positioning','checking','decisions','discipline']}
};
function clubAIState(club){return state.clubAI?.clubs[club];}
function aiRoundMoney(n){return Math.round(n/10000)*10000;}
function aiAcademyPlayers(){return Object.values(state.clubAI?.clubs||{}).flatMap(c=>c.academy?.roster||[]);}
function aiDecision(club,kind,text,key=null){
 const c=clubAIState(club);if(!c)return;
 if(key&&c.decisions.some(d=>d.key===key))return;
 if(['finance','sale'].includes(kind))feedbackNews('ai:'+club+':'+(key||state.calendar.date+':'+text),club,kind,kind==='finance'?'Ekonomirapport: '+club:'Transferlistan: '+club,text);
 c.decisions.unshift({date:state.calendar.date,kind,text,...(key?{key}:{})});c.decisions=c.decisions.slice(0,36);
}
function aiCreateAcademyPlayer(club,pos,age){
 const p=worldProspect(club,pos);p.age=age;p.salary=250000;
 const roles=juniorRoles(p),role=roles[Math.floor(attrSeed(p.id+':role')*roles.length)];
 for(const key of Object.keys(p.attributes))p.attributes[key]=Math.round(5+attrSeed(p.id+':'+key)*5+(age-16)*.7+(PLAYER_ROLES[role][key]?1:0));
 p.attributeGrowth=3+attrSeed(p.id+':ceiling')*5;delete p.developmentModel;
 p.trainingBaseline={...p.attributes};const d=ensureDevelopment(p);
 p.academy={path:'junior',role,mentor:null,ceiling:{...d.ceiling},cursor:0,observations:0,baseline:{...p.attributes},
  history:[],games:0,seconds:0,goals:0,assists:0,missed:0,intake:state.season.year,loan:null,seniorContract:false};
 p.health={load:0,injury:null,clearance:'rest'};return p;
}
function aiFinanceCreate(club){
 const wages=loanWageCost(club),ha=leagueOf(club)==='HA',fans=CLUB_DATA[club]?.fans||(ha?3000:6500);
 const ticket=ha?170:220,capacity=Math.round(fans*1.2),attendance=Math.min(capacity,Math.round(fans*.94));
 const operations=ha?4000000:9000000,staff=ha?1800000:2500000,academy=ha?650000:1000000;
 const sponsor=aiRoundMoney(Math.max(ha?2500000:5000000,wages*1.04+operations+staff+academy+26*240000-attendance*ticket*26));
 return {year:state.season.year,league:leagueOf(club),ticket,capacity,fans,sponsor,operations,staff,academy,
  debt:0,settled:[],totals:{},ledger:[],archives:[],opening:state.recruitment.ai[club]?.cash??0};
}
function ensureClubAI(){
 if(!state.rivals||!state.recruitment||!state.calendar)return;
 state.clubAI??={version:1,year:state.season.year,nextOffer:1,offers:[],clubs:{}};
 for(const club of Object.keys(state.world.membership)){
  if(clubAIState(club))continue;
  const offer=leagueCareerOffer(careerIdentity(club),club,state.clubRosters),seed=k=>attrSeed(club+':director:'+k);
  const project=offer.group==='title'?'title':seed('youth')>.6?'develop':offer.group==='playoff'?'playoff':'rebuild';
  const c=state.clubAI.clubs[club]={project,originalProject:project,projectYear:state.season.year,target:offer.place,
   director:{judgement:10+Math.floor(seed('judgement')*9),patience:8+Math.floor(seed('patience')*11),
    risk:6+Math.floor(seed('risk')*13),network:['SWE','FIN','SUI','GER'][Math.floor(seed('network')*4)]},
   finance:aiFinanceCreate(club),academy:{year:state.season.year,roster:[],lastDay:state.calendar.date,lastMatch:state.calendar.date,intakes:[]},
   memory:{},decisions:[],scouting:{},lastReview:null,lastMarket:null,contractDecisions:{},roleStandards:{}};
  for(const role of ['scorer','creator','stopper']){
   const ps=state.clubRosters[club].filter(p=>aiRoleFits(p,role));
   c.roleStandards[role]=attrClamp(ps.reduce((n,p)=>n+aiRoleValue(p,role),0)/Math.max(1,ps.length)+.65,leagueOf(club)==='HA'?10.5:11.5,17);
  }
  if(club!==managerClub()){
   const positions=['MV','MV','B','B','B','B','C','C','C','VF','VF','HF','HF','HF'];
   c.academy.roster=positions.map((pos,i)=>aiCreateAcademyPlayer(club,pos,16+i%4));
   c.academy.intakes.push({year:state.season.year,count:positions.length,initial:true});
  }
 }
}
function aiFinancialForecast(club){
 const c=clubAIState(club),b=state.recruitment.ai[club];if(!c||!b)return null;
 const f=c.finance,preseason=state.season.phase==='preseason';
 const games=state.schedule.filter(g=>!g.played&&!g.seriesId&&(g.home===club||g.away===club));
 const remaining=preseason?52:games.length,homes=preseason?26:games.filter(g=>g.home===club).length;
 const position=leagueTable(leagueOf(club)).findIndex(t=>t.name===club)+1;
 const demand=attrClamp(.94+(c.target-(position||c.target))*.013,.62,1.1);
 const gate=Math.round(Math.min(f.capacity,f.fans*demand))*f.ticket;
 const reserve=aiMarketReserved(club);
 const yearlyCosts=loanWageCost(club)+f.operations+f.staff+f.academy;
 const income=homes*gate+remaining*f.sponsor/52,cost=remaining*yearlyCosts/52+homes*150000+(remaining-homes)*90000;
 return {remaining,homes,gate,income,cost,yearlyCosts,reserved:reserve.fee,
  cash:Math.round(b.cash+income-cost-reserve.fee-(reserve.salary+loanReserved(club))*remaining/52),wageRoom:b.wageLimit-loanWageCost(club)-reserve.salary-loanReserved(club)};
}
function aiFinancePost(club,category,amount,label){
 const c=clubAIState(club),b=state.recruitment.ai[club];if(!c||!b||!Number.isFinite(amount))return;
 amount=Math.round(amount);b.cash+=amount;const f=c.finance;
 f.totals[category]=(f.totals[category]||0)+amount;
 f.ledger.unshift({date:state.calendar.date,category,amount,label,balance:b.cash});f.ledger=f.ledger.slice(0,36);
}
function aiSettleFixture(club,game){
 const c=clubAIState(club);if(!c||club===managerClub())return;
 const f=c.finance,key=[state.season.year,game.round,game.home,game.away,game.seriesId||'regular'].join(':');
 if(f.settled.includes(key))return;f.settled.push(key);
 const home=game.home===club,forecast=aiFinancialForecast(club);
 if(home)aiFinancePost(club,'tickets',Math.round(forecast.gate*(game.seriesId?1.1:1)),'Matchpublik');
 aiFinancePost(club,'matchday',home?-150000:-90000,home?'Matcharrangemang':'Bortaresa');
 if(!game.seriesId){
  aiFinancePost(club,'sponsor',f.sponsor/52,'Sponsor- och centrala avtal');
  aiFinancePost(club,'wages',-loanWageCost(club)/52,'Spelarlöner');
  aiFinancePost(club,'operations',-(f.operations+f.staff+f.academy)/52,'Personal, drift och akademi');
 }
 // A negative bank balance is debt pressure, never free spending power.
 const b=state.recruitment.ai[club];
 if(b.cash<0)aiDecision(club,'finance','Negativ kassa. Sportchefen prioriterar lägre löner och försäljningar.',`deficit:${state.season.year}`);
}
function aiNewFinancialYear(club){
 const c=clubAIState(club),b=state.recruitment.ai[club];if(!c||!b||c.finance.year===state.season.year)return;
 const f=c.finance,league=leagueOf(club),changed=f.league!==league;
 f.archives.unshift({year:f.year,opening:f.opening,closing:b.cash,totals:{...f.totals},project:c.project});f.archives=f.archives.slice(0,20);
 // Income is anchored to the club, not recalculated upwards when it raises salaries.
 f.sponsor=aiRoundMoney(f.sponsor*(changed?(league==='SHL'?1.4:.7):1.02));
 if(changed){f.fans=Math.round(f.fans*(league==='SHL'?1.15:.85));f.ticket=league==='SHL'?220:170;}
 f.operations=aiRoundMoney(f.operations*1.02);f.staff=aiRoundMoney(f.staff*1.02);
 f.year=state.season.year;f.league=league;f.opening=b.cash;f.totals={};f.settled=[];
 const revenue=Math.min(f.capacity,f.fans*.94)*f.ticket*26+f.sponsor;
 const reserve=Math.max(300000,-b.cash*.25);
 b.wageLimit=aiRoundMoney(Math.max(3000000,revenue-f.operations-f.staff-f.academy-26*240000-reserve));b.year=state.season.year;
 c.contractDecisions={};c.lastReview=null;c.lastMarket=null;
 aiDecision(club,'finance',`Ny lönebudget ${careerMoney(b.wageLimit)}/år utifrån intäkter, drift och ekonomisk marginal.`,`budget:${state.season.year}`);
}
function aiRoleFits(p,role){
 const def=AI_ROLE_DEFS[role];if(!def||worldGroup(p)!==def.kind)return false;
 return role!=='center'||positionFit(p,'C')>=.98;
}
function aiRosterWithReturns(club,extra=[]){
 const returning=(state.loans?.active||[]).filter(l=>l.owner===club).map(l=>findPlayerAnywhere(l.playerId)).filter(Boolean);
 return [...(state.clubRosters[club]||[]),...returning,...extra];
}
function aiRosterHasRoom(players){
 const roster=[...new Map(players.filter(Boolean).map(p=>[String(p.id),p])).values()];
 const vacancies=Object.entries({MV:2,B:6,F:12}).reduce((n,[group,target])=>n+Math.max(0,target-roster.filter(p=>worldGroup(p)===group).length),0);
 // Leave space for the minimum playable positions, even after retirements.
 return roster.length+vacancies<=30;
}
function aiRoleValue(p,role,attributes=ensurePlayerAttributes(p)){
 const keys=AI_ROLE_DEFS[role].keys;return keys.reduce((sum,k)=>sum+(attributes[k]||10),0)/keys.length;
}
function aiSquadNeeds(club){
 const roster=state.clubRosters[club]||[],c=clubAIState(club),threshold=leagueOf(club)==='HA'?10.5:11.5;
 const arrivals=Object.values(state.clubRosters).flat().filter(p=>p.futureContract?.buyer===club&&getPlayerClub(p.id)!==club);
 const returning=(state.loans?.active||[]).filter(l=>l.owner===club).map(l=>findPlayerAnywhere(l.playerId)).filter(Boolean);
 return Object.entries(AI_ROLE_DEFS).map(([role,def])=>{
  const specialist=['scorer','creator','stopper'].includes(role);
  const minimumAbility=specialist?(c?.roleStandards?.[role]||threshold):0;
  const fits=p=>aiRoleFits(p,role)&&(!specialist||aiRoleValue(p,role)>=minimumAbility);
  const all=roster.filter(fits),available=all.filter(medicalReady);
  const secure=all.filter(p=>!playerLoan(p)&&((p.contractYears>1&&!p.futureContract)||p.futureContract?.buyer===club));
  const future=new Set([...secure,...arrivals.filter(fits),...returning.filter(p=>fits(p)&&p.contractYears>1&&!p.futureContract)].map(p=>String(p.id)));
  const old=all.filter(p=>p.age>=(p.pos==='MV'?36:33));
  const target=def.target+(role==='creator'&&rivalsClubState(club)?.coach.style==='control'?1:0);
  const missing=Math.max(0,target-available.length),futureNeed=Math.max(0,target-future.size);
  const temporary=missing>0&&all.length>=target;
  const alternatives=(c?.academy.roster||[]).filter(p=>fits(p)&&medicalReady(p)&&aiRoleValue(p,role)>=threshold-1.5);
  const value=all.reduce((n,p)=>n+matchAttributeRating(p),0)/Math.max(1,all.length);
  const urgent=(role==='goalie'&&available.length===0?100:role==='center'&&available.length===0?70:0);
  const urgency=urgent+missing*(specialist?8:role==='center'?15:12)+futureNeed*3+old.length*1.2+(80-value)*.1;
  return {role,label:def.label,kind:def.kind,target,count:available.length,total:all.length,value,missing,futureNeed,minimumAbility,
   temporary,old:old.length,arrivals:arrivals.filter(fits).length,alternatives:alternatives.map(p=>p.id),urgency,
   reason:missing?`${available.length}/${target} spelklara ${def.label.toLowerCase()}${temporary?' – tillfälligt skadebehov':''}.`:
    futureNeed?`${futureNeed} platser behöver säkras till nästa säsong.`:old.length?'Planerar generationsväxling.':'God täckning.'};
 }).sort((a,b)=>b.urgency-a.urgency||a.role.localeCompare(b.role));
}
function aiPromote(club,p,reason){
 const c=clubAIState(club),b=state.recruitment.ai[club];if(!c||!b||!c.academy.roster.includes(p)||!medicalReady(p))return false;
 const added=p.academy.seniorContract?0:p.salary;
 if(!aiRosterHasRoom(aiRosterWithReturns(club,[p]))||loanWageCost(club)+added+aiMarketReserved(club).salary>b.wageLimit||b.cash<0)return false;
 c.academy.roster=c.academy.roster.filter(q=>q!==p);state.clubRosters[club].push(p);
 p.academy.path='senior';p.academy.seniorContract=true;p.contractYears=Math.max(2,p.contractYears);p.club=club;
 p.aiRoleReview={games:0,seconds:0,missed:0};
 aiDecision(club,'academy',`${p.name} flyttas upp: ${reason}`);
 rivalEvent(club,'development',`${p.name} får chansen`,`${club} flyttar upp ${p.age}-åringen. ${reason}`);return true;
}
function aiReviewClub(club){
 const c=clubAIState(club);if(!c||club===managerClub())return;
 if(c.lastReview&&calGap(c.lastReview,state.calendar.date)<7)return;c.lastReview=state.calendar.date;
 const f=aiFinancialForecast(club),rank=leagueTable(leagueOf(club)).findIndex(t=>t.name===club)+1;
 const previous=c.project;
 if(f.cash<0)c.project='survive';
 else if(state.season.phase==='preseason')c.project=c.originalProject;
 else if((team(club)?.gp||0)>=20&&rank>c.target+4)c.project='rebuild';
 else if(c.project==='survive'&&f.cash>1500000)c.project=c.originalProject;
 if(previous!==c.project)aiDecision(club,'project',`${AI_PROJECTS[c.project]}. ${f.cash<0?'Säsongsprognosen kräver besparingar.':'Styrelsen anpassar planen efter tabelläge och resurser.'}`);
 const needs=aiSquadNeeds(club);c.needs=needs;
 for(const need of needs.filter(n=>n.missing&&n.alternatives.length).slice(0,2)){
  const p=c.academy.roster.filter(p=>need.alternatives.includes(p.id)).sort((a,b)=>aiRoleValue(b,need.role)-aiRoleValue(a,need.role))[0];
  if(p&&aiPromote(club,p,need.reason))break;
 }
 const roster=state.clubRosters[club];
 const candidates=roster.filter(p=>!playerLoan(p)&&!p.futureContract&&recruitCanSell(p,club)).sort((a,b)=>
  (b.salary/Math.max(1,matchAttributeRating(b)))-(a.salary/Math.max(1,matchAttributeRating(a))));
 for(const p of candidates){
  const peers=roster.filter(q=>q!==p&&worldGroup(q)===worldGroup(p));
  const surplus=peers.filter(q=>matchAttributeRating(q)>=matchAttributeRating(p)).length>=({MV:2,B:6,F:10})[worldGroup(p)];
  const unhappy=p.aiRoleReview?.unhappy,financial=f.cash<0;
  if(!(surplus||unhappy||financial)||p.transferListed)continue;
  p.transferListed=true;p.aiListed=true;p.askingPrice=Math.round(calculateTransferPrice(p)*(financial?.82:.95));
  aiDecision(club,'sale',`${p.name} erbjuds andra klubbar: ${financial?'behöver frigöra pengar och lön':unhappy?'vill ha en större roll':'hård konkurrens om istiden'}.`);
  break;
 }
 aiRenewContracts(club,false);
 aiArrangeYouthLoan(club);
}
function aiRenewContracts(club,expiredOnly=false){
 const c=clubAIState(club),b=state.recruitment.ai[club],roster=state.clubRosters[club];if(!c||!b)return false;
 const candidates=roster.filter(p=>p.contractYears<=(expiredOnly?0:1)&&!p.futureContract&&!playerLoan(p))
  .sort((a,b)=>matchAttributeRating(b)-matchAttributeRating(a));
 for(const p of candidates){
  const previous=c.contractDecisions[p.id];
  if(!expiredOnly&&previous?.year===state.season.year&&(previous.status==='renewed'||calGap(previous.date||state.calendar.date,state.calendar.date)<28))continue;
  const peers=roster.filter(q=>q!==p&&worldGroup(q)===worldGroup(p)&&q.contractYears>1&&!q.futureContract);
  const incoming=Object.values(state.clubRosters).flat().filter(q=>q.futureContract?.buyer===club&&worldGroup(q)===worldGroup(p));
  const target=({MV:2,B:7,F:13})[worldGroup(p)],useful=peers.length+incoming.length<target||p.age<=22&&c.project==='develop';
  const unhappy=p.aiRoleReview?.unhappy&&(p.social?.ambition||10)>=12;
  const salary=aiRoundMoney(Math.max(150000,p.salary*(p.age>=33?.94:p.age<=24?1.08:1.03)));
  const limit=loanWageCost(club)-p.salary+salary+aiMarketReserved(club).salary;
  const futureRoom=calendarFutureRoom(club)+(p.contractYears>1?p.salary:0);
  if(useful&&!unhappy&&limit<=b.wageLimit&&salary<=futureRoom&&aiFinancialForecast(club).cash>=0){
   const years=p.age>=33?1:p.age<=23?3:2;p.salary=salary;p.contractYears=expiredOnly?years:years+1;
   c.contractDecisions[p.id]={year:state.season.year,date:state.calendar.date,status:'renewed'};
   worldLog('renew',p,club,`${years} nya år – roll, ålder och löneutrymme vägdes samman`);
   aiDecision(club,'contract',`${p.name} förlänger med ${years} år. ${p.age>=33?'Ett kort avtal begränsar åldersrisken.':'Kontinuitet på en prioriterad position.'}`);
  }else{
   c.contractDecisions[p.id]={year:state.season.year,date:state.calendar.date,status:'leave'};
   if(expiredOnly){state.clubRosters[club]=state.clubRosters[club].filter(q=>q!==p);worldRelease(p,club,unhappy?'Söker mer istid':!useful?'Efterträdare finns i truppen':'Lönekraven ryms inte i klubbens plan');}
  }
 }
 return true;
}
function aiAcademyDay(club){
 const c=clubAIState(club),a=c?.academy;if(!a||club===managerClub()||a.lastDay===state.calendar.date)return;
 a.lastDay=state.calendar.date;
 const match=calGap(a.lastMatch,state.calendar.date)>=7;if(match)a.lastMatch=state.calendar.date;
 const coach=rivalsClubState(club)?.coach.coaching||12;
 for(const p of a.roster){
  p.fatigue=Math.max(0,(p.fatigue||0)-8);if(!medicalCanTrain(p))continue;
  const weights=PLAYER_ROLES[p.academy.role]||PLAYER_ROLES[juniorRoles(p)[0]],keys=Object.keys(weights);
  const key=keys[(p.academy.cursor||0)%keys.length];p.academy.cursor=(p.academy.cursor||0)+1;
  const mentor=(state.clubRosters[club]||[]).filter(q=>q.age>=28&&medicalReady(q)&&worldGroup(q)===worldGroup(p)).sort((x,y)=>rivalRating(y)-rivalRating(x))[0];
  p.academy.mentor=mentor?.id??null;
  developmentAdvance(p,key,(c.project==='develop'?2:1.5)*coach/15);
  if(mentor&&p.academy.cursor%3===0)developmentAdvance(p,p.pos==='MV'?'composure':'decisions',.8);
  if(match&&p.age<=20){
   const seconds=p.pos==='MV'?1800:900;p.academy.games++;p.academy.seconds+=seconds;
   developmentAdvance(p,key,2);p.fatigue+=6;
   p.academy.history.unshift({year:state.season.year,date:state.calendar.date,opponent:'Akademins utvecklingsmatch',path:'junior',seconds,goals:0,assists:0});
   p.academy.history=p.academy.history.slice(0,6);
  }
 }
}
function aiAcademyNewYear(club){
 const c=clubAIState(club),a=c?.academy;if(!a||club===managerClub()||a.year===state.season.year)return;
 a.year=state.season.year;a.lastMatch=state.calendar.date;a.lastDay=state.calendar.date;
 for(const p of [...a.roster]){
  developmentBirthday(p);p.fatigue=0;
  if(p.academy.seniorContract)p.contractYears=Math.max(0,p.contractYears-1);
  if(p.age>20&&!aiPromote(club,p,'Lämnar junioråldern och bedöms redo för seniorhockey.')){
   a.roster=a.roster.filter(q=>q!==p);p.academy.path='senior';p.academy.seniorContract=false;worldRelease(p,club,'Lämnar akademin och söker senioravtal');
  }
 }
 const positions=['MV','B','C','VF','HF'];let count=0;
 for(const pos of positions)if(a.roster.length<18){const p=aiCreateAcademyPlayer(club,pos,16);a.roster.push(p);worldLog('intake',p,club,'Akademins årliga intag');count++;}
 a.intakes.unshift({year:state.season.year,count});a.intakes=a.intakes.slice(0,12);
 aiDecision(club,'academy',`${count} nya 16-åringar ansluter till akademin.`,`intake:${state.season.year}`);
}
function aiAfterPlayerFixture(club,rows,gf,ga){
 const c=clubAIState(club);if(!c||club===managerClub())return;
 for(const p of state.clubRosters[club]||[]){
  if(!medicalReady(p))continue;
  const r=p.aiRoleReview??={games:0,seconds:0,missed:0},row=rows.find(r=>samePlayerId(r.id,p.id));
  r.games++;r.seconds+=row?.seconds||0;r.missed+=(row?.seconds||0)===0?1:0;
  p.morale=attrClamp((p.morale||70)+(gf>ga?.65:-.65),30,90);
  if(r.games%6)continue;
  const role=p.promisedRole||p.squadRole||'Rotation';
  const target=p.pos==='MV'?(role==='Nyckelspelare'?2100:role==='Ordinarie'?1500:600):role==='Nyckelspelare'?900:role==='Ordinarie'?650:role==='Rotation'?360:120;
  const met=r.seconds/6>=target;
  p.happiness=attrClamp((p.happiness||70)+(met?3:-6),20,95);
  r.unhappy=!met&&p.happiness<55;r.lastAverage=Math.round(r.seconds/6);r.seconds=0;
  if(r.unhappy)aiDecision(club,'dressing',`${p.name} vill ha mer ansvar efter sex matcher med för lite istid.`,`${p.id}:role:${state.season.year}:${Math.floor(r.games/12)}`);
  if(met&&p.aiListed&&p.happiness>65&&aiFinancialForecast(club).cash>0){p.transferListed=false;p.askingPrice=null;delete p.aiListed;}
 }
}
function aiWorldDay(){
 ensureClubAI();if(!state.clubAI||loanLocked())return;
 for(const club of Object.keys(state.clubAI.clubs))if(club!==managerClub()){
  aiAcademyDay(club);aiReviewClub(club);
 }
 aiMarketDay();
}
function aiWorldNewYear(){
 ensureClubAI();if(!state.clubAI||state.clubAI.year===state.season.year)return;
 state.clubAI.year=state.season.year;
 for(const o of state.clubAI.offers)if(o.status==='pending'){o.status='expired';o.reason='Säsongen är avslutad.';}
 for(const club of Object.keys(state.clubAI.clubs))if(club!==managerClub())aiNewFinancialYear(club);
 for(const club of Object.keys(state.clubAI.clubs))if(club!==managerClub())aiAcademyNewYear(club);
}
function aiStoreManagedAcademy(club){
 const c=clubAIState(club);if(!c||!state.juniors)return;
 c.academy.roster=state.juniors.roster;c.academy.year=state.season.year;c.academy.lastDay=state.calendar.date;c.academy.lastMatch=state.calendar.date;
 if(state.managerCareer.bank[club])state.managerCareer.bank[club].juniors=null;
 const office=state.clubOffice;
 if(office)Object.assign(c.finance,{year:state.season.year,league:leagueOf(club),opening:state.money,
  sponsor:office.sponsor,operations:office.operations,ticket:office.ticket,capacity:office.capacity,
  fans:state.fans,staff:clubStaffCost(),academy:CLUB_PRIORITIES[office.priority]?.cost||650000,settled:[],totals:{}});
}
function aiTakeManagedAcademy(club){
 const c=clubAIState(club);if(!c)return;
 state.juniors={version:1,year:state.season.year,nextId:1,roster:c.academy.roster,reports:[],matches:[],intakes:[],lastFixture:null,
  trainingKeys:[],selected:c.academy.roster[0]?.id??null,assessor:'assistant',message:'Klubbens befintliga akademi följer med när du tar över.',rng:Math.floor(attrSeed(club+':juniors')*4294967296)};
 c.academy.roster=[];
}
function aiTakeClubFinance(club){
 const c=clubAIState(club),o=state.clubOffice;if(!c||!o)return;
 for(const key of ['sponsor','operations','ticket','capacity'])o[key]=c.finance[key];
 state.fans=c.finance.fans;
}
function aiClubView(club){
 const c=clubAIState(club);if(!c)return '';
 const forecast=aiFinancialForecast(club),b=state.recruitment.ai[club],needs=aiSquadNeeds(club);
 const project=AI_PROJECTS[c.project],academics=c.academy.roster;
 const decisionRows=c.decisions.slice(0,6).map(d=>`<article><time>${calText(d.date)}</time><p>${trainingSafe(d.text)}</p></article>`).join('');
 return `<section class="rival-panel ai-club"><span class="desk-kicker">KLUBBENS RIKTNING</span><h2>${project}</h2><p>Styrelsens mål: topp ${c.target}. ${c.project==='develop'?'Unga spelare och framtida försäljningsvärde prioriteras.':c.project==='survive'?'Ekonomiskt utrymme avgör vilka förstärkningar som är möjliga.':c.project==='rebuild'?'Åldersstruktur, kontrakt och efterträdare väger tungt.':'Truppen byggs för att nå resultat utan att överskrida resurserna.'}</p>
 <div class="ai-summary"><div><small>Kassa</small><strong>${careerMoney(b?.cash||0)}</strong></div><div><small>Säsongsprognos</small><strong>${forecast?careerMoney(forecast.cash):'–'}</strong></div><div><small>Löner / budget</small><strong>${careerMoney(loanWageCost(club))} / ${careerMoney(b?.wageLimit||0)}</strong></div></div>
 <details><summary>Truppplan & kontrakt</summary><p>Rollerna överlappar. Tillgänglighet, utgående avtal, planerade ankomster och egna talanger ingår i bedömningen.</p><div class="ai-needs">${needs.map(n=>`<article><strong>${n.label}</strong><span>${n.count}/${n.target} spelklara</span><p>${trainingSafe(n.reason)} ${n.arrivals?n.arrivals+' framtida ankomster. ':''}${n.alternatives.length?n.alternatives.length+' junioralternativ.':''}</p></article>`).join('')}</div></details>
 <details><summary>Akademi · ${academics.length} spelare</summary><p>Akademispelarna är fiktiva. De tränar, får mentorskap och spelar utvecklingsmatcher. Uppflyttning kräver en plats och löneutrymme.</p><div class="ai-academy">${academics.slice().sort((a,b)=>b.age-a.age).map(p=>`<article><strong>${trainingSafe(p.name)}</strong><span>${p.age} år · ${p.pos}</span><small>${p.academy.games} utvecklingsmatcher · ${Math.round(p.academy.seconds/60)} min</small></article>`).join('')||'<p>Akademin saknar för närvarande spelare.</p>'}</div></details>
 <details><summary>Ekonomins utveckling</summary><p>Publik, sponsoravtal, spelarlöner, personal, drift och akademi bokförs vid spelade matcher.</p>${c.finance.archives.slice(0,5).map(a=>`<p>${seasonLabel(a.year)} · Kassa ${careerMoney(a.opening)} → ${careerMoney(a.closing)}</p>`).join('')}${c.finance.ledger.slice(0,6).map(l=>`<div class="ai-ledger"><span>${trainingSafe(l.label)}</span><strong>${careerMoney(l.amount)}</strong></div>`).join('')}</details>
 <h3>Beslut och följder</h3><div class="ai-decisions">${decisionRows||'<p>Klubbens beslut följs när kalendern går framåt.</p>'}</div></section>`;
}
function validateClubAISave(s,ids){
 const w=s.clubAI;if(!w)return;
 const date=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d));
 if(w.version!==1||!w.clubs||Array.isArray(w.clubs)||!Number.isInteger(w.year)||!Number.isInteger(w.nextOffer)||!Array.isArray(w.offers)||w.offers.length>200)throw Error('Klubbarnas AI-data är felaktiga.');
 // Academies are active ownership, including the current manager's junior roster.
 for(const p of s.juniors?.roster||[]){if(ids.has(String(p.id)))throw Error('En juniorspelare är dubbelregistrerad.');ids.add(String(p.id));}
 for(const [club,c] of Object.entries(w.clubs)){
  const a=c?.academy,f=c?.finance;
  if(!s.clubRosters[club]||!AI_PROJECTS[c.project]||!a||!Array.isArray(a.roster)||a.roster.length>30||!c.memory||!Array.isArray(c.decisions)||c.decisions.length>36||!f||!Array.isArray(f.settled)||f.settled.length>160||!Array.isArray(f.ledger)||f.ledger.length>36||!Array.isArray(f.archives))throw Error('En klubbs plan eller historik är felaktig.');
  for(const key of ['sponsor','operations','staff','academy','ticket','capacity','fans'])if(!Number.isFinite(f[key])||f[key]<0)throw Error('Klubbekonomin innehåller ogiltiga belopp.');
  for(const p of a.roster){
   if(!p||ids.has(String(p.id))||!/^[-\p{L}\p{N} _.:/]+$/u.test(String(p.id))||!['MV','B','C','VF','HF','F'].includes(p.pos)||typeof p.name!=='string'||!Number.isFinite(p.age)||p.age<10||p.age>100||!Number.isFinite(p.salary)||p.salary<0||!Number.isInteger(p.contractYears)||!p.academy||!PLAYER_ROLES[p.academy.role]||!p.attributes||Object.values(p.attributes).some(v=>!Number.isFinite(v)||v<1||v>20))throw Error('Akademins spelardata eller identiteter är felaktiga.');
   ids.add(String(p.id));
  }
  for(const m of Object.values(c.memory))if(!Array.isArray(m.meetings)||m.meetings.length>6)throw Error('Motståndarminnet är felaktigt.');
 }
 const offers=new Set();
 for(const o of w.offers){
  if(!o||!Number.isInteger(o.id)||offers.has(o.id)||!s.clubRosters[o.buyer]||o.buyer===o.seller||!['transfer','future','loan'].includes(o.kind)||!['pending','signed','rejected','lost','expired'].includes(o.status)||!date(o.date)||!date(o.due)||!Number.isFinite(o.fee)||o.fee<0||!Number.isFinite(o.salary)||o.salary<0||!Number.isInteger(o.years)||o.years<0||o.years>5||!AI_ROLE_DEFS[o.needRole])throw Error('En AI-förhandling innehåller ogiltiga villkor.');
  if(o.kind==='loan'&&(![0,.25,.5,.75,1].includes(o.share)||![28,56,0].includes(o.days)||!LOAN_ROLES[o.loanRole]||!['anytime','day28'].includes(o.recall)))throw Error('Ett AI-lån innehåller ogiltiga villkor.');
  offers.add(o.id);
 }
}
