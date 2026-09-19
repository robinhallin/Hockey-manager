"use strict";
// Affiliation snapshot: theahl.com/nhl-affiliations, 2026-09-19. Financial terms are game estimates in SEK.
const NA_AFFILIATES={'Anaheim Ducks':'San Diego Gulls','Boston Bruins':'Providence Bruins','Buffalo Sabres':'Rochester Americans','Calgary Flames':'Calgary Wranglers','Carolina Hurricanes':'Chicago Wolves','Chicago Blackhawks':'Rockford IceHogs','Colorado Avalanche':'Colorado Eagles','Columbus Blue Jackets':'Cleveland Monsters','Dallas Stars':'Texas Stars','Detroit Red Wings':'Grand Rapids Griffins','Edmonton Oilers':'Bakersfield Condors','Florida Panthers':'Charlotte Checkers','Los Angeles Kings':'Ontario Reign','Minnesota Wild':'Iowa Wild','Montréal Canadiens':'Laval Rocket','Nashville Predators':'Milwaukee Admirals','New Jersey Devils':'Utica Comets','New York Islanders':'Hamilton Hammers','New York Rangers':'Hartford Wolf Pack','Ottawa Senators':'Belleville Senators','Philadelphia Flyers':'Lehigh Valley Phantoms','Pittsburgh Penguins':'Wilkes-Barre/Scranton Penguins','San Jose Sharks':'San Jose Barracuda','Seattle Kraken':'Coachella Valley Firebirds','St. Louis Blues':'Springfield Thunderbirds','Tampa Bay Lightning':'Syracuse Crunch','Toronto Maple Leafs':'Toronto Marlies','Utah Mammoth':'Tucson Roadrunners','Vancouver Canucks':'Abbotsford Canucks','Vegas Golden Knights':'Henderson Silver Knights','Washington Capitals':'Hershey Bears','Winnipeg Jets':'Manitoba Moose'};
const naUI={tab:'offers',club:'all'};
function ensureNorthAmerica(){if(!state.nhl)return null;return state.northAmerica??={version:1,year:state.season.year,abroad:[],offers:[],events:[],nextId:1,lastDay:null,lastMarket:null,fees:{},signings:{},offered:{},notice:''};}
function naActive(p){return Boolean(p?.naContract?.status==='active');}
function naFind(id){return internationalPlayers().find(r=>samePlayerId(r.p.id,id))?.p||null;}
function naLocation(p){const c=p.naContract;return c?.assignment==='NHL'?c.team:NA_AFFILIATES[c?.team]||c?.team;}
function naSeasonEnd(){return `${state.season.year+1}-06-30`;}
function naWindow(){const date=state.calendar?.date;return Boolean(date&&calendarWindowOpen()&&date.slice(5)>='07-01'&&date.slice(5)<='09-30');}
function naLocked(){return Boolean(state.live&&!state.live.finished);}
function naAbility(p){return internationalScore({...p,fatigue:0},p.pos==='B'?'creator':'balanced');}
function naPlayers(team){return internationalPlayers().map(r=>r.p).filter(p=>naActive(p)&&(!team||p.naContract.team===team));}
function naBudget(team){const ps=naPlayers(team);return {contracts:ps.length,committed:ps.reduce((n,p)=>n+p.naContract.nhlSalary,0),fees:state.northAmerica?.fees[`${state.season.year}:${team}`]||0};}
function naLog(p,type,text,date=state.calendar.date){const w=state.northAmerica;w.events.unshift({id:w.nextId++,date,type,playerId:p.id,name:p.name,team:p.naContract?.team||null,text});w.events=w.events.slice(0,180);if(p.naContract){p.naContract.events.unshift({date,type,text});p.naContract.events=p.naContract.events.slice(0,16);}}
function naNotice(text,result=false){state.northAmerica.notice=text;save();render();return result;}
function naCanLeave(p,club){
 if(playerLoan(p)||p.academy?.loan||p.futureContract||internationalAway(p)||!medicalReady(p))return false;
 const roster=state.clubRosters[club];if(!roster?.some(q=>samePlayerId(q.id,p.id)))return true;
 if(!state.world.membership[club])return roster.filter(q=>q!==p&&worldGroup(q)===worldGroup(p)).length>({MV:2,B:6,F:12})[worldGroup(p)];
 if(roster.filter(q=>q!==p&&worldGroup(q)===worldGroup(p)&&medicalReady(q)).length<({MV:2,B:6,F:12})[worldGroup(p)])return false;
 return positionFit(p,'C')<.98||roster.filter(q=>q!==p&&medicalReady(q)&&positionFit(q,'C')>=.98).length>=4;
}
function naInterested(p){return Boolean(p.nhlDraft&&!naActive(p)&&p.age>=18&&p.age<=25&&!p.futureContract&&!playerLoan(p)&&!p.academy?.loan&&naAbility(p)>=10.5);}
function naOffer(p,club){
 const w=ensureNorthAmerica();if(!w||!naWindow()||naLocked()||!naInterested(p)||!naCanLeave(p,club)||w.offered[`${state.season.year}:${p.id}`])return null;
 const team=nhlRightsActive(p)?p.nhlDraft.club:NHL_CLUBS[Math.floor(attrSeed(`${p.id}:${state.season.year}:na-free`)*NHL_CLUBS.length)],budget=naBudget(team);
 if(!NA_AFFILIATES[team]||w.signings[`${state.season.year}:${team}`]||budget.contracts>=12||budget.committed+9000000>108000000||w.offers.some(o=>o.team===team&&o.year===state.season.year&&['pending','signed'].includes(o.status)))return null;
 const fee=club===WORLD_FREE||club==='Internationell juniorpool'?0:Math.round(Math.min(3000000,Math.max(250000,(p.salary||350000)*1.5))/10000)*10000;
 if(budget.fees+fee>6000000)return null;
 const o={id:w.nextId++,year:state.season.year,playerId:p.id,name:p.name,origin:club,team,date:state.calendar.date,expires:calAdd(state.calendar.date,14),end:`${state.season.year+(p.age<=21?3:2)}-06-30`,nhlSalary:9000000,ahlSalary:900000,fee,loanback:p.age<=21&&naAbility(p)<14.5,share:.5,status:'pending'};
 w.offered[`${state.season.year}:${p.id}`]=true;w.offers.unshift(o);w.offers=w.offers.filter(o=>o.status==='pending').concat(w.offers.filter(o=>o.status!=='pending').slice(0,96));
 if(nhlOwned(p))managerMessage(`na-offer:${o.id}`,`${o.team} vill skriva med ${p.name}`,`Avtal till ${calText(o.end)}. Förhandlad ersättning ${careerMoney(fee)}. ${o.loanback?'Klubben är även öppen för ett återlån.':'Planerad miljö bedöms efter avtal.'} Ett draftval flyttar inte spelaren; ta ställning till detta konkreta erbjudande.`,'Sportchefen',{link:'nhl'});
 return o;
}
function naDetach(p){
 for(const [club,roster] of Object.entries(state.clubRosters))state.clubRosters[club]=roster.filter(q=>!samePlayerId(q.id,p.id));
 if(state.juniors)state.juniors.roster=state.juniors.roster.filter(q=>!samePlayerId(q.id,p.id));
 for(const c of Object.values(state.clubAI?.clubs||{}))c.academy.roster=c.academy.roster.filter(q=>!samePlayerId(q.id,p.id));
 if(worldIsFree(p.id))worldRemoveFree(p.id);
 state.international.pool=state.international.pool.filter(q=>!samePlayerId(q.id,p.id));
 state.northAmerica.abroad=state.northAmerica.abroad.filter(q=>!samePlayerId(q.id,p.id));
}
function naLoanRoom(p,club,share=.5,existingCost=0){
 const cost=p.naContract?p.naContract.ahlSalary*share:900000*share,own=club===managerClub();
 const used=own?annualWageCost():loanWageCost(club),limit=own?wageBudget():state.recruitment.ai[club]?.wageLimit||0;
 const reserved=loanReserved(club)+state.recruitment.deals.filter(d=>d.status==='pending'&&d.buyer===club&&d.kind!=='future').reduce((n,d)=>n+d.salary,0);
 return (state.clubRosters[club]||[]).filter(q=>!samePlayerId(q.id,p.id)).length<30&&used-existingCost+cost+reserved<=limit;
}
function naAttachLoan(p,club,share=.5){
 const c=p.naContract;c.assignment='Sweden';p.club=club;p.salary=c.ahlSalary;p.contractYears=Math.max(1,Number(c.end.slice(0,4))-state.season.year);
 if(p.academy){p.academy.path='senior';p.academy.seniorContract=false;p.academy.loan=null;}
 state.clubRosters[club].push(p);
 const l={id:state.loans.nextId++,northAmerica:true,playerId:p.id,name:p.name,owner:c.team,borrower:club,start:state.calendar.date,until:naSeasonEnd()<c.end?naSeasonEnd():c.end,share,role:'regular',recall:'day28',baseline:{games:p.games||0,goals:p.goals||0,assists:p.assists||0},seconds:0,games:0,starts:0,goals:0,assists:0,appearances:[]};
 state.loans.active.push(l);p.loanId=l.id;naLog(p,'loan',`Utlånad till ${club} till ${calText(l.until)}. Årlig lönekostnad ${careerMoney(c.ahlSalary*share)}.`);
 if(club===managerClub())managerMessage(`na-loan:${l.id}`,`${p.name} ansluter på lån`,`${c.team} äger kontraktet. Du betalar ${careerMoney(p.salary*share)}/år under lånet. Rollen följs mot faktisk istid. Återgång tidigast efter 28 dagar eller när lånet löper ut.`,'Sportchefen',{link:'nhl'});
}
function naAssignTeam(team,date=state.calendar.date){
 const ps=state.northAmerica.abroad.filter(p=>p.naContract?.team===team&&naActive(p));
 for(const group of ['MV','B','F']){const rows=ps.filter(p=>worldGroup(p)===group).sort((a,b)=>naAbility(b)-naAbility(a)||String(a.id).localeCompare(String(b.id)));
 rows.forEach((p,i)=>{const c=p.naContract,level=naAbility(p)>=14.5&&i<({MV:1,B:2,F:3})[group]?'NHL':'AHL';if(c.assignment!==level){p.naAvailableFrom=calAdd(date,1);c.assignment=level;naLog(p,'assignment',`${level==='NHL'?'Uppflyttning / plats i':'Utvecklingsplacering i'} ${level==='NHL'?team:NA_AFFILIATES[team]}. Bedömning av nuvarande egenskaper och konkurrens i den bevakade gruppen.`,date);if(c.homeClub===managerClub())managerMessage(`na-place:${p.id}:${date}:${level}`,`${p.name}: ${level}`,`Spelaren finns nu hos ${naLocation(p)}. Placeringen grundas på egenskaper och konkurrens. Följ spelad istid och matcher under Ligaspel.`,'Utlandsbevakningen',{link:'nhl'});}p.club=naLocation(p);p.salary=level==='NHL'?c.nhlSalary:c.ahlSalary;});}
}
function naSign(o,mode='move'){
 const p=naFind(o.playerId),w=state.northAmerica;
 if(!p||o.status!=='pending'||!['move','loanback'].includes(mode)||!naWindow()||naLocked()||state.calendar.date>o.expires||!naInterested(p)||!naCanLeave(p,o.origin))return false;
 const actual=internationalPlayers().find(r=>samePlayerId(r.p.id,p.id))?.club;if(actual!==o.origin||nhlRightsActive(p)&&p.nhlDraft.club!==o.team)return false;
 const budget=naBudget(o.team);if(w.signings[`${state.season.year}:${o.team}`]||budget.contracts>=12||budget.committed+o.nhlSalary>108000000||budget.fees+o.fee>6000000)return false;
 const owned=nhlOwned(p),back=mode==='loanback';
 const existingCost=(state.clubRosters[o.origin]||[]).some(q=>q===p)?p.salary:p.academy?.seniorContract?p.salary:0;
 if(back&&(!o.loanback||!state.world.membership[o.origin]||!naLoanRoom(p,o.origin,o.share,existingCost)))return false;
 const beforeSalary=p.salary,years=p.contractYears;
 if(p.nhlPlan?.status==='active')nhlClosePlan(p,'neutral','NHL-avtalet ersätter den tidigare utvecklingsdialogen.');
 naDetach(p);delete p.freeSince;delete p.futureContract;delete p.recruitmentPromise;delete p.loanId;p.transferListed=false;p.askingPrice=null;
 for(const d of state.recruitment.deals)if(samePlayerId(d.playerId,p.id)&&d.status==='pending'){d.status='rejected';d.reason='Spelaren har skrivit ett NHL-avtal.';}
 for(const d of state.recruitment.incoming)if(samePlayerId(d.playerId,p.id)&&d.status==='pending')d.status='expired';
 p.naContract={team:o.team,status:'active',start:state.calendar.date,end:o.end,nhlSalary:o.nhlSalary,ahlSalary:o.ahlSalary,homeClub:o.origin,homeSalary:beforeSalary,previousYears:years,assignment:'pending',events:[],trainingDays:0,lastReport:state.calendar.date};
 p.contractYears=Number(o.end.slice(0,4))-state.season.year;
 if(p.academy){p.academy.path='senior';p.academy.seniorContract=false;}
 w.signings[`${state.season.year}:${o.team}`]=p.id;w.fees[`${state.season.year}:${o.team}`]=budget.fees+o.fee;o.status='signed';o.mode=mode;o.signed=state.calendar.date;w.offers=w.offers.filter(q=>q.status==='pending').concat(w.offers.filter(q=>q.status!=='pending').slice(0,96));
 if(o.origin===managerClub())clubPost('transfer',o.fee,`NHL-övergång · ${p.name}`);else if(clubAIState(o.origin))aiFinancePost(o.origin,'transfer',o.fee,`NHL-övergång · ${p.name}`);else if(state.recruitment.ai[o.origin])state.recruitment.ai[o.origin].cash+=o.fee;
 naLog(p,'signed',`Avtal med ${o.team} till ${calText(o.end)}. Förhandlad klubbersättning ${careerMoney(o.fee)}.`);
 if(back)naAttachLoan(p,o.origin,o.share);else {w.abroad.push(p);naAssignTeam(o.team);}
 if(state.world.membership[o.origin])feedbackNews(`na-sign:${o.id}`,o.origin,'transfer',`${p.name} skriver NHL-avtal`,`${o.team} tar över kontraktet.${back?' Spelaren stannar på ett säsongslån.':' Spelaren lämnar truppen för Nordamerika.'}`);
 if(owned){(state.season.departures??=[]).push(back?`${p.name} (NHL-avtal, återlån)`:p.name);managerMessage(`na-signed:${o.id}`,`${p.name}: NHL-avtalet är klart`,`${o.team} · till ${calText(o.end)}. ${back?'Ett återlån är registrerat.':'Registreringen har flyttats till '+naLocation(p)+'.'} ${careerMoney(o.fee)} har bokförts i klubbkassan.`,'Sportchefen',{link:'nhl'});}
 syncManagerRoster();repairMedicalLines();return true;
}
function naAnswer(id,choice){
 const w=ensureNorthAmerica(),o=w?.offers.find(o=>o.id===Number(id)),p=o&&naFind(o.playerId);
 if(!o||!p||!nhlOwned(p)||!managerEmployed()||naLocked()||o.status!=='pending')return false;
 if(choice==='reject'){o.status='rejected';o.reason='Klubben avböjde.';return naNotice(`${p.name}: erbjudandet avböjdes. Det nuvarande avtalet gäller.`);}
 if(!naSign(o,choice))return naNotice('Erbjudandet kan inte genomföras. Kontrollera giltighetstid, truppbemanning, löneutrymme och spelarens avtal.');
 return naNotice(`${p.name}: övergången och eventuell återlåning är registrerade.`,true);
}
function naBorrow(id){
 const w=ensureNorthAmerica(),p=w?.abroad.find(p=>samePlayerId(p.id,id));
 if(!p||!managerEmployed()||naLocked()||!calendarWindowOpen()||!naActive(p)||p.naContract.assignment!=='AHL'||p.naLastGame===state.calendar.date||p.naContract.end<state.calendar.date||internationalAway(p)||!medicalReady(p)||!loanFit(p,managerClub()).interested)return false;
 if(!naLoanRoom(p,managerClub()))return naNotice('Lånet ryms inte i truppens eller lönebudgetens återstående utrymme.');
 w.abroad=w.abroad.filter(q=>q!==p);naAttachLoan(p,managerClub());syncManagerRoster();repairMedicalLines();save();render();return true;
}
function naReceiveReturn(p,l,reason){
 const w=ensureNorthAmerica();if(!w.abroad.some(q=>samePlayerId(q.id,p.id)))w.abroad.push(p);
 p.naContract.assignment='pending';naLog(p,'return',`Lånet hos ${l.borrower} avslutades: ${reason}.`);naAssignTeam(p.naContract.team);
}
function naExpire(p){
 const c=p.naContract;if(!naActive(p))return;
 const l=playerLoan(p);if(l)loanReturn(l,'NHL-avtalet har löpt ut');
 state.northAmerica.abroad=state.northAmerica.abroad.filter(q=>!samePlayerId(q.id,p.id));
 naLog(p,'expired','NHL-avtalet löpte ut. Spelaren söker nu nytt avtal på den gemensamma marknaden.');
 c.status='expired';p.naHistory=[{...c},...(p.naHistory||[])].slice(0,4);delete p.naContract;
 p.salary=Math.round(Math.min(2500000,Math.max(350000,c.homeSalary||350000,naAbility(p)*60000))/10000)*10000;
 worldRelease(p,naLocation({naContract:c}),'Återvänder från Nordamerika utan avtal');
 if(c.homeClub===managerClub())managerMessage(`na-free:${p.id}:${c.start}`,`${p.name} söker nytt avtal`,`${c.team} har avslutat avtalet. Spelaren finns bland kontraktslösa; återkomsten till Sverige kräver en vanlig förhandling om lön och roll.`,'Utlandsbevakningen',{link:'transfers'});
}
function naNewYear(){
 const w=ensureNorthAmerica();if(!w||w.year===state.season.year)return;w.year=state.season.year;
 for(const p of [...w.abroad]){developmentBirthday(p);p.contractYears=Math.max(0,Number(p.naContract.end.slice(0,4))-state.season.year);if(p.naContract.end<state.calendar.date)naExpire(p);}
 for(const ledger of [w.fees,w.signings,w.offered])for(const key of Object.keys(ledger))if(Number(key.split(':')[0])<state.season.year-1)delete ledger[key];
}
function naDay(){
 const w=ensureNorthAmerica(),date=state.calendar?.date;if(!w||naLocked()||w.lastDay===date)return;w.lastDay=date;naNewYear();
 for(const p of [...naPlayers()])if(p.naContract.end<date)naExpire(p);
 for(const o of w.offers.filter(o=>o.status==='pending')){const p=naFind(o.playerId);if(date>o.expires||!p||naActive(p)||p.futureContract||internationalPlayers().find(r=>samePlayerId(r.p.id,o.playerId))?.club!==o.origin){o.status='expired';o.reason='Giltighetstiden eller spelarens avtalsläge ändrades.';}}
 for(const p of w.abroad){
  if(internationalAway(p,date))continue;const c=p.naContract;
  p.health??={load:0,injury:null,clearance:'rest'};p.fatigue=Math.max(0,(p.fatigue||0)-6);p.health.load=Math.max(0,(p.health.load||0)-4);
  if(p.health.injury){p.health.injury.remaining=Math.max(0,p.health.injury.remaining-1);if(!p.health.injury.remaining){p.health.injury=null;p.health.clearance='rest';}continue;}
  const month=date.slice(5,7);if(month>='09'||month<='04'){const keys=Object.keys(p.attributes),key=keys[Math.floor(attrSeed(`${p.id}:${date}:na-training`)*keys.length)];developmentAdvance(p,key,.7,'Registrerat utvecklingspass i '+c.assignment);c.trainingDays++;}
  if(calGap(c.lastReport,date)>=28){c.lastReport=date;if(c.homeClub===managerClub())managerMessage(`na-report:${p.id}:${date}`,`Utlandsrapport: ${p.name}`,`${naLocation(p)} · ${c.trainingDays} registrerade utvecklingspass sedan avtalets början. ${p.health.injury?'Rehabilitering pågår.':'Tränar med sin placerade grupp.'} ${nasPlayerSummary(p)}`,'Utlandsbevakningen',{link:'nhl'});}
 }
 if(date.slice(8)==='01'||date.slice(8)==='15')for(const team of NHL_CLUBS)naAssignTeam(team,date);
 if(naWindow()&&w.lastMarket!==date.slice(0,7)){w.lastMarket=date.slice(0,7);const rows=internationalPlayers().filter(({p})=>naInterested(p)).sort((a,b)=>naAbility(b.p)-naAbility(a.p)||String(a.p.id).localeCompare(String(b.p.id)));for(const {p,club} of rows){const o=naOffer(p,club);if(o&&!nhlOwned(p))naSign(o,'move');}}
 w.offers=w.offers.filter(o=>o.status==='pending').concat(w.offers.filter(o=>o.status!=='pending').slice(0,96));
}
function naSet(key,value){if(key==='tab'&&['offers','players','network','history'].includes(value)||key==='club'&&(value==='all'||NHL_CLUBS.includes(value))){naUI[key]=value;render();}}
function naOpen(){nhlUI.tab='contracts';deskNavigate('nhl');}
function naContractView(p){const c=p.naContract;if(!c)return '';const l=playerLoan(p);return `<section class="nhl-profile"><h3>NHL-kontrakt · ${trainingSafe(c.team)}</h3><p>Till ${calText(c.end)}. ${l?`På lån hos ${trainingSafe(l.borrower)} · ${careerMoney(c.ahlSalary*l.share)}/år för låneklubben.`:`Placering: ${trainingSafe(naLocation(p))}.`} NHL-lön ${careerMoney(c.nhlSalary)}/år · AHL-lön ${careerMoney(c.ahlSalary)}/år. Beloppen är spelvärden i SEK.</p><button class="desk-link" onclick="naOpen()">Avtal och utlandsbevakning →</button></section>`;}
function naView(){
 const w=ensureNorthAmerica(),ps=naPlayers();if(!w)return '';
 let body='';
 if(naUI.tab==='offers'){const own=w.offers.filter(o=>o.origin===managerClub()).slice(0,20);body=`<section class="mw-panel"><h2>Erbjudanden till din klubb</h2><p>Spelaren flyttar först efter ett godkänt avtal. Ett återlån behåller honom i Sverige med NHL-klubben som kontraktsägare.</p>${own.map(o=>`<article class="na-offer"><h3>${trainingSafe(o.name)} → ${trainingSafe(o.team)}</h3><p>${({pending:'Inväntar ditt beslut',signed:'Avtal registrerat',rejected:'Avböjt',expired:'Utgånget'})[o.status]} · svar senast ${calText(o.expires)}</p><dl><dt>Avtal till</dt><dd>${calText(o.end)}</dd><dt>Ersättning till din klubb</dt><dd>${careerMoney(o.fee)}</dd><dt>NHL / AHL-lön per år</dt><dd>${careerMoney(o.nhlSalary)} / ${careerMoney(o.ahlSalary)}</dd></dl>${o.loanback?`<p>Återlån erbjuds till ${calText(naSeasonEnd())}: din klubb betalar ${careerMoney(o.ahlSalary*o.share)}/år under lånet. Återlånet registreras i A-truppen.</p>`:''}${o.status==='pending'?`<div class="nhl-actions"><button class="btn" onclick="naAnswer(${o.id},'move')" ${naLocked()?'disabled':''}>Acceptera flytten</button>${o.loanback?`<button class="btn secondary" onclick="naAnswer(${o.id},'loanback')" ${naLocked()?'disabled':''}>Acceptera med återlån</button>`:''}<button class="btn secondary" onclick="naAnswer(${o.id},'reject')" ${naLocked()?'disabled':''}>Tacka nej</button></div>`:''}</article>`).join('')||'<p>Inga NHL-erbjudanden ännu. Under juli–september bevakas draftade spelare som är redo för ett utvecklingskontrakt. Gällande svenska avtal och truppbemanning respekteras.</p>'}</section>`;}
 if(naUI.tab==='players')body=`<section class="mw-panel"><h2>Spelare med NHL-avtal</h2><p>Alla spelare nedan har flyttat genom din karriär. Attribut och utveckling följer samma individ. AHL-spelare kan vara tillgängliga för ett svenskt lån om roll, hälsa och lönebudget passar.</p>${ps.filter(p=>naUI.club==='all'||p.naContract.team===naUI.club).map(p=>{const c=p.naContract,l=playerLoan(p),abroad=w.abroad.includes(p);return `<details class="nhl-candidate"><summary><strong>${trainingSafe(p.name)}</strong><span>${p.pos} · ${trainingSafe(l?l.borrower:naLocation(p))} · avtal till ${calText(c.end)}</span></summary><p>Från ${trainingSafe(c.homeClub)}. ${c.trainingDays} utvecklingspass i Nordamerika. ${nasPlayerSummary(p)} Spelarens nuvarande egenskaper och konkurrens avgör NHL/AHL-placeringen.</p>${naContractView(p)}${l?`<p>Lån till ${calText(l.until)} · registrerad istid ${Math.round(l.seconds/60)} minuter över ${l.games} matcher.</p>${l.borrower===managerClub()?`<button class="btn secondary" onclick="loanRecall(${l.id})" ${naLocked()?'disabled':''}>Avsluta lånet enligt avtalet</button>`:''}`:abroad&&c.assignment==='AHL'?`<p>Erbjudet säsongslån: ${careerMoney(c.ahlSalary*.5)}/år i löneandel. Minst 28 dagar före frivillig återgång. ${trainingSafe(loanFit(p,managerClub()).text)}.</p><button class="btn secondary" onclick="naBorrow('${p.id}')" ${naLocked()||!calendarWindowOpen()||!loanFit(p,managerClub()).interested||!medicalReady(p)?'disabled':''}>Acceptera säsongslån</button>`:''}<details><summary>Spelarens utlandshistorik</summary>${c.events.map(e=>`<p>${calText(e.date)} · ${trainingSafe(e.text)}</p>`).join('')}</details></details>`;}).join('')||'<p>Inga registrerade NHL-avtal i urvalet ännu.</p>'}</section>`;
 if(naUI.tab==='network')body=`<section class="mw-panel"><h2>NHL- och AHL-organisationer</h2><p>Verkliga klubbkopplingar enligt AHL:s publicerade lista, kontrollerad 19 september 2026. Antalen gäller endast kontrakt som uppstått i karriären.</p><div class="mw-scroll"><table><thead><tr><th>NHL</th><th>AHL</th><th>Bevakade kontrakt</th><th>NHL / AHL / Sverige</th></tr></thead><tbody>${NHL_CLUBS.map(team=>{const rows=ps.filter(p=>p.naContract.team===team);return `<tr><th>${team}</th><td>${NA_AFFILIATES[team]}</td><td>${rows.length}/12</td><td>${['NHL','AHL','Sweden'].map(a=>rows.filter(p=>p.naContract.assignment===a).length).join(' / ')}</td></tr>`;}).join('')}</tbody></table></div></section>`;
 if(naUI.tab==='history')body=`<section class="mw-panel"><h2>Övergångar och beslut</h2>${w.events.slice(0,80).map(e=>`<article class="na-offer"><strong>${trainingSafe(e.name)}</strong><p>${calText(e.date)} · ${trainingSafe(e.text)}</p></article>`).join('')||'<p>Historiken fylls av avtal, placeringar, lån och kontraktsslut.</p>'}</section>`;
 return `${w.notice?`<p class="nhl-notice" role="status">${trainingSafe(w.notice)}</p>`:''}<nav class="mw-tabs" aria-label="Nordamerika">${[['offers','Erbjudanden'],['players','Utlandsbevakning & lån'],['network','NHL–AHL'],['history','Historik']].map(([id,label])=>`<button onclick="naSet('tab','${id}')" aria-pressed="${naUI.tab===id}">${label}</button>`).join('')}</nav>${naUI.tab==='players'?`<label class="na-filter">NHL-klubb<select onchange="naSet('club',this.value)"><option value="all">Alla klubbar</option>${NHL_CLUBS.map(c=>`<option ${naUI.club===c?'selected':''}>${c}</option>`).join('')}</select></label>`:''}${body}<details class="mw-panel nhl-scope"><summary>Avtalsregler och simuleringens omfattning</summary><p>Detta är utvecklingskontrakt och förhandlade övergångar i spelmodellen, inte en fullständig kopia av NHL:s kollektivavtal. Alla belopp är spelvärden i SEK. Avtal löper två eller tre år; inga waiver-, entry-level-slide-, RFA- eller lönetakregler återges här. Varje NHL-klubb kan göra en ny signing per spelår inom den bevakade gruppen, högst tolv samtidiga avtal och 108 miljoner SEK i garanterat NHL-löneutrymme. Klubbersättning begränsas till sex miljoner per spelår.</p><p>Placering och registrerade träningspass simuleras. Grundserier, slutspel, tabeller och registrerad spelarstatistik finns under Ligaspel. Övriga trupper använder en uttrycklig lagmodell tills verkliga spelardata är inlästa. Vid kontraktsslut återgår spelaren till den vanliga kontraktslösa marknaden, där en svensk klubb kan förhandla om återkomst.</p><p><a href="NORTH-AMERICA.md" target="_blank" rel="noopener noreferrer">Spelmodell och verifierade klubbkopplingar</a></p></details>`;
}
