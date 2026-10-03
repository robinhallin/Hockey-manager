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
