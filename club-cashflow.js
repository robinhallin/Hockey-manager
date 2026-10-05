"use strict";
// Accrue the actual daily rates; post cash at month boundaries. Migration starts
// today and never recharges the old match-based ledger.
function clubCashflowEnsure(){
 const o=state.clubOffice,date=state.calendar?.date;if(!o||!date)return null;
 if(!o.cashflow||o.cashflow.club!==managerClub())o.cashflow={version:1,club:managerClub(),started:date,lastDate:date,accrued:{},months:[],migration:'Från detta datum bokförs fasta intäkter och kostnader månadsvis. Äldre matchbokföring består.'};
 const f=o.cashflow;
 if(f.lastDate>date&&f.started===f.lastDate&&!f.months.length&&!Object.keys(f.accrued).length){f.started=date;f.lastDate=date;}
 return f;
}
function clubAnnualRates(){
 const o=state.clubOffice;return {players:-annualWageCost(),staff:-clubStaffCost(),manager:-managerSalary(),operations:-o.operations*clubProjectFactor('operations'),priority:-CLUB_PRIORITIES[o.priority].cost,sponsor:o.sponsor*clubProjectFactor('sponsor')};
}
function clubMonthEnd(date){const d=new Date(date+'T12:00:00Z');return new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,1,12)).toISOString().slice(0,10);}
function clubMonthDays(date){return calGap(date.slice(0,7)+'-01',clubMonthEnd(date));}
function clubCashflowFlush(date){
 const f=state.clubOffice?.cashflow;if(!f||!Object.keys(f.accrued).length)return;
 const totals={};for(const [key,amount] of Object.entries(f.accrued)){const rounded=Math.round(amount);totals[key]=rounded;if(rounded)clubPost(key,rounded,`${CLUB_CATEGORIES[key]} · månadsavräkning ${date}`,date);}
 f.months.unshift({date,totals,balance:state.money});f.months=f.months.slice(0,36);f.accrued={};
 managerMessage(`finance-month:${managerClub()}:${date}`,'Månadens ekonomi',`${calText(date)}: löner, drift och sponsoravtal har bokförts. Förändring ${money(Object.values(totals).reduce((n,v)=>n+v,0))}. Klubbkassa ${money(state.money)}. Granska kommande betalningar och kontraktsåtaganden.`,'Klubbekonomi',{link:'finance',date});
}
function clubCashflowAccrue(to,rates=clubAnnualRates()){
 const f=clubCashflowEnsure();if(!f||to<=f.lastDate)return;
 // Normal progression is one day. Summer can skip several months, using the
 // rates that applied before contracts and staff roll over.
 let cursor=f.lastDate;while(cursor<to){
  const boundary=clubMonthEnd(cursor),end=to<boundary?to:boundary,fraction=calGap(cursor,end)/clubMonthDays(cursor)/12;
  for(const [key,annual] of Object.entries(rates))f.accrued[key]=(f.accrued[key]||0)+annual*fraction;
  cursor=end;f.lastDate=end;if(end===boundary)clubCashflowFlush(end);
 }
}
function clubFutureCommitments(offset=1){
 const club=managerClub(),year=state.season.year+offset,totals=new Map(),add=(id,salary)=>totals.set(String(id),Math.max(totals.get(String(id))||0,Number(salary)||0));
 const returning=(state.loans?.active||[]).filter(l=>l.owner===club).map(loanPlayer).filter(Boolean);
 const own=[...managerRoster().filter(p=>!playerLoan(p)),...returning,...(state.juniors?.roster||[]).filter(p=>p.academy?.seniorContract)];
 for(const p of own){const f=p.futureContract;if(p.contractYears>offset&&(!f||year<(f.joinYear||state.season.year+1)))add(p.id,p.salary);}
 for(const p of Object.values(state.clubRosters||{}).flat()){
  const f=p.futureContract;if(f?.buyer===club&&year>=(f.joinYear||state.season.year+1)&&year<(f.joinYear||state.season.year+1)+f.years)add(p.id,f.salary);
 }
 for(const d of state.recruitment?.deals||[]){
  if(d.status!=='pending'||d.buyer&&d.buyer!==club)continue;
  const start=d.kind==='future'?(d.joinYear||state.season.year+1):state.season.year;
  if(year>=start&&year<start+d.years)add(d.playerId,d.salary);
 }
 return totals;
}
function clubCashflowProjection(months=12){
 const rates=clubAnnualRates(),f=state.clubOffice.cashflow,date=state.calendar.date,accrued={...(f?.accrued||{})},rows=[];
 let cursor=date,balance=state.money-managerRecruitmentBudget().fees;
 for(let i=0;i<months;i++){
  const end=clubMonthEnd(cursor),fraction=calGap(cursor,end)/clubMonthDays(cursor)/12;
  const entries=Object.fromEntries(Object.entries(rates).map(([k,v])=>[k,Math.round(v*fraction+(i===0?(accrued[k]||0):0))]));
  // Only dated, already scheduled fixtures are included. No imaginary playoff gate.
  const games=state.schedule.filter(g=>!g.played&&g.date>=cursor&&g.date<end&&(g.home===managerClub()||g.away===managerClub()));
  const gates=games.filter(g=>g.home===managerClub()).reduce((n,g)=>n+clubGate(Boolean(g.seriesId)).revenue,0);
  const matchCosts=games.reduce((n,g)=>n+(g.home===managerClub()?150000:90000),0);
  const fixedIncome=Object.values(entries).filter(n=>n>0).reduce((n,v)=>n+v,0),fixedCost=-Object.values(entries).filter(n=>n<0).reduce((n,v)=>n+v,0);
  const income=fixedIncome+gates,cost=fixedCost+matchCosts;balance+=income-cost;
  rows.push({month:cursor.slice(0,7),due:end,income,cost,gates,matchCosts,players:-entries.players,net:income-cost,balance,entries,games:games.length});cursor=end;
 }
 return rows;
}
function clubCalendarForecast(){
 const remaining=state.schedule.filter(g=>!g.played&&!g.seriesId&&(g.home===managerClub()||g.away===managerClub())),games=state.season.phase==='preseason'?52:remaining.length,homes=state.season.phase==='preseason'?26:remaining.filter(g=>g.home===managerClub()).length;
 const rows=clubCashflowProjection(12),reserved=managerRecruitmentBudget().fees;
 return {games,homes,income:rows.reduce((n,r)=>n+r.income,0),cost:rows.reduce((n,r)=>n+r.cost,0),reserved,cash:rows.at(-1).balance,calendar:true,months:rows};
}
function clubFutureForecast(){
 const o=state.clubOffice;return [1,2,3].map(offset=>{
  const year=state.season.year+offset,players=[...clubFutureCommitments(offset).values()].reduce((n,v)=>n+v,0),staff=state.staff.filter(s=>s.expires>year).reduce((n,s)=>n+(s.salary||0),0),manager=managerEmployed()&&state.managerCareer.expires>year?managerSalary():0;
  const sponsor=o.sponsor*clubProjectFactor('sponsor'),operations=o.operations*clubProjectFactor('operations'),wageRoom=wageBudget()-players;
  return {year,players,staff,manager,sponsor,operations,wageRoom,fixedNet:sponsor-operations-players-staff-manager};
 });
}
function clubCashflowView(){
 const rows=clubCashflowProjection(),future=clubFutureForecast(),f=state.clubOffice.cashflow;
 return `<section class="cd-panel cashflow-panel"><header><div><h2>Kassaflöde månad för månad</h2><p>Löner och fasta avtal tjänas in dagligen och betalas vid månadsskiftet. Matchintäkter och resor bokförs efter match.</p></div></header><div class="scenario-table"><table class="cd-table"><thead><tr><th>Månad</th><th>Intäkter</th><th>Kostnader</th><th>Varav spelarlöner</th><th>Netto</th><th>Kassa efter månaden</th></tr></thead><tbody>${rows.map(r=>`<tr><th>${r.month}<small>${r.games} schemalagda matcher</small></th><td>${money(r.income)}</td><td>${money(r.cost)}</td><td>${money(r.players)}</td><td>${money(r.net)}</td><td class="${r.balance<0?'cd-warning':''}">${money(r.balance)}</td></tr>`).join('')}</tbody></table></div><p>Prognos vid oförändrad trupp, fasta avtal och publiknivå. Reserverade köpbud dras från startkassan. Budens löner ingår först när de blir avtal; lönereservationer visas separat. Endast redan schemalagda matcher ger biljettintäkter. Nya värvningar, förlängningar, styrelsetilldelningar och framtida slutspel kan ändra utfallet.</p><h3>Bundet i kommande säsonger</h3><div class="scenario-table"><table class="cd-table"><thead><tr><th>Säsong</th><th>Spelare & reserverade bud</th><th>Personal & tränare</th><th>Löneutrymme</th><th>Fasta intäkter minus kända kostnader</th></tr></thead><tbody>${future.map(r=>`<tr><th>${seasonLabel(r.year)}</th><td>${money(r.players)}</td><td>${money(r.staff+r.manager)}</td><td>${money(r.wageRoom)}</td><td>${money(r.fixedNet)}</td></tr>`).join('')}</tbody></table></div><p>Detta visar kända åtaganden, inte kostnaden för en komplett framtida trupp. Utgående avtal och ersättare behöver planeras. Dagens lönebudget, sponsorintäkter och drift antas bestå; inga framtida biljettintäkter eller bonusar antas.</p>${f?`<p>Bokföringsmodellen gäller från ${calText(f.started)}. Tidigare bokförda belopp påverkas inte.</p><details><summary>Genomförda månadsavräkningar · ${f.months.length}</summary>${f.months.map(m=>`<p>${calText(m.date)} · ${money(Object.values(m.totals).reduce((n,v)=>n+v,0))} · kassa ${money(m.balance)}</p>`).join('')}</details>`:''}</section>`;
}

// What-if contracts never modify the ledger, reservations or the player's contract.
function clubDecisionCandidates(){return [...new Map([...managerRoster(),...(state.recruitment?.shortlist||[]).map(squadScenarioPlayer).filter(Boolean)].filter(p=>!playerLoan(p)&&!p.futureContract&&!(state.recruitment?.deals||[]).some(d=>d.status==='pending'&&samePlayerId(d.playerId,p.id))).map(p=>[String(p.id),p])).values()];}
function clubDecisionAdd(id,salary,fee,start,years){
 const p=clubDecisionCandidates().find(p=>samePlayerId(p.id,id));salary=Number(salary);fee=Number(fee);years=Number(years);
 if(!p||clubLocked()||![salary,fee].every(n=>Number.isFinite(n)&&n>=0&&n<=1e9)||!Number.isInteger(years)||years<1||years>5||!['now','summer'].includes(start))return false;
 const o=state.clubOffice,rows=o.decisionContracts??=[];if(rows.length>=8&&!rows.some(r=>samePlayerId(r.playerId,id)))return false;
 const date=start==='now'?state.calendar.date:`${state.season.year+1}-08-01`;
 o.decisionContracts=rows.filter(r=>!samePlayerId(r.playerId,id));o.decisionContracts.push({playerId:p.id,name:p.name,salary,fee:isOwnPlayer(p)?0:fee,start:date,end:`${state.season.year+years+(start==='summer'?1:0)}-08-01`});save();render();return true;
}
function clubDecisionRemove(id){if(clubLocked())return;state.clubOffice.decisionContracts=(state.clubOffice.decisionContracts||[]).filter(r=>!samePlayerId(r.playerId,id));save();render();}
function clubDecisionProjection(months=12){
 const base=clubCashflowProjection(months),current=-clubAnnualRates().players,futures=new Map(),today=state.calendar.date;
 const commitments=year=>{const offset=year-state.season.year;if(!futures.has(offset))futures.set(offset,clubFutureCommitments(offset));return futures.get(offset);};
 const plans=(state.clubOffice.decisionContracts||[]).filter(r=>clubDecisionCandidates().some(p=>samePlayerId(p.id,r.playerId))&&r.start>=today);
 let balance=state.money-managerRecruitmentBudget().fees,scenarioBalance=balance,cursor=today;
 return base.map(row=>{
  let wages=cursor===today?-(state.clubOffice.cashflow?.accrued?.players||0):0,delta=0,fees=0;
  for(let date=cursor;date<row.due;date=calAdd(date,1)){
   const year=Number(date.slice(0,4))-(date.slice(5)<'08-01'?1:0),offset=Math.max(0,year-state.season.year),known=offset?commitments(year):null;
   wages+=(known?[...known.values()].reduce((sum,n)=>sum+n,0):current)/12/clubMonthDays(date);
   for(const plan of plans){if(date===plan.start)fees+=plan.fee;if(date<plan.start||date>=plan.end)continue;
    const p=squadScenarioPlayer(plan.playerId),old=known?(known.get(String(plan.playerId))||0):(isOwnPlayer(p)?p.salary||0:0);
    delta+=(plan.salary-old)/12/clubMonthDays(date);
   }
  }
  wages=Math.round(wages);delta=Math.round(delta);const net=row.net+row.players-wages;balance+=net;scenarioBalance+=net-delta-fees;cursor=row.due;
  return {...row,knownPlayers:wages,decisionWages:delta,decisionFees:fees,knownBalance:balance,scenarioBalance,difference:scenarioBalance-balance};
 });
}
function clubDecisionView(){
 const candidates=clubDecisionCandidates(),plans=state.clubOffice.decisionContracts||[],rows=clubDecisionProjection(18),end=rows.at(-1),min=Math.min(...rows.map(r=>r.scenarioBalance));
 return `<section class="cd-panel"><h2>Testa ett avtalsbeslut</h2><p>Jämför kända kontrakt med tänkta förlängningar och värvningar från kortlistan. Inga avtal skrivs och inga pengar dras. Spelare med lån, framtida avtal eller pågående bud hanteras i respektive flöde.</p><form class="decision-contract-form" onsubmit="event.preventDefault();clubDecisionAdd(this.elements.player.value,this.elements.salary.value,this.elements.fee.value,this.elements.start.value,this.elements.years.value)"><label>Spelare <select name="player">${candidates.map(p=>`<option value="${trainingSafe(String(p.id))}">${trainingSafe(p.name)} · ${isOwnPlayer(p)?'egen spelare':'kortlistad'}</option>`).join('')}</select></label><label>Årslön <input name="salary" type="number" min="0" max="1000000000" required value="600000"></label><label>Övergångssumma (0 för egen spelare) <input name="fee" type="number" min="0" max="1000000000" value="0" required></label><label>Start <select name="start"><option value="now">Nu</option><option value="summer">1 augusti nästa säsong</option></select></label><label>År <input name="years" type="number" min="1" max="5" value="2" required></label><button class="btn">Lägg till / ersätt antagande</button></form>${plans.map(p=>`<p>${trainingSafe(p.name)} · ${money(p.salary)}/år · ${calText(p.start)}–${calText(p.end)} · avgift ${money(p.fee)} ${p.start<state.calendar.date?'· startdatum passerat, uppdatera antagandet':''}<button class="desk-link" onclick='clubDecisionRemove(${trainingSafe(JSON.stringify(p.playerId))})'>Ta bort</button></p>`).join('')}<p>Lägsta beräknade månadskassa: <strong>${money(min)}</strong>. Skillnad efter 18 månader: ${money(end.difference)}.</p><div class="scenario-table"><table class="cd-table"><thead><tr><th>Månad</th><th>Kassa · kända avtal</th><th>Ändrad lönekostnad</th><th>Engångsavgift</th><th>Kassa · scenario</th></tr></thead><tbody>${rows.map(r=>`<tr><th>${r.month}</th><td>${money(r.knownBalance)}</td><td>${money(r.decisionWages)}</td><td>${money(r.decisionFees)}</td><td class="${r.scenarioBalance<0?'cd-warning':''}">${money(r.scenarioBalance)}</td></tr>`).join('')}</tbody></table></div><p>Spelarlöner byter till kända framtida åtaganden 1 augusti, inklusive reserverade bud. Ett antagande ersätter spelarens kända lön under den valda perioden; avgiften tas endast på startdagen. Övriga fasta kostnader och intäkter följer dagens kassaflödesprognos. Saknade ersättare, nya lån och oschemalagda matcher antas inte. Antaganden med passerad start eller ändrad avtalsstatus räknas inte och behöver uppdateras.</p></section>`;
}
const clubCashflowBaseView=clubCashflowView;
clubCashflowView=function(){return clubCashflowBaseView()+clubDecisionView();};
