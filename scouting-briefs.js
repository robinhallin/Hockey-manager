"use strict";

function scoutingBrief(profile,placement,maxSalary,maxAge,horizon,person){
 maxSalary=Number(maxSalary);maxAge=Number(maxAge);
 if(!RECRUIT_PROFILES[profile]||!Number.isFinite(maxSalary)||maxSalary<=0||!Number.isInteger(maxAge)||maxAge<18||maxAge>45||!SCOUT_LISTS[horizon]||!scoutingStaff().some(s=>scoutingPerson(s)===person))return;
 const choices=getTransferMarketPlayers().filter(p=>RECRUIT_PROFILES[profile].positions.includes(p.pos)&&p.age<=maxAge&&!scoutPending(p.id)&&!scoutingOffice()?.declined?.[p.id]&&
  scoutingCost(p).low<=maxSalary&&(horizon!=='next'||p.contractYears<=1));
 // Public facts and the club's existing observations only. Unknown ceilings and wages never order discovery.
 choices.sort((a,b)=>Number(playerAssessment(b).known)-Number(playerAssessment(a).known)||
  (playerAssessment(a).known?recruitRoleValue(b,profile)-recruitRoleValue(a,profile):a.age-b.age)||String(a.id).localeCompare(String(b.id)));
 if(!choices.length)return recruitMessage('Inga tillgängliga kandidater matchar uppdraget. Höj löneutrymmet, åldersgränsen eller ändra tidshorisonten.');
 const allowed=['Tredje backparet','Första backparet','Målvaktsersättare','Ordinarie','Utvecklingsspelare'];
 scoutDesk.draft={players:choices.slice(0,3).map(p=>p.id),method:'detail',person,profile,horizon,
  criteria:{profile,placement:allowed.includes(placement)?placement:'Ordinarie',maxSalary,maxAge,horizon}};
 state.recruitment.tab='missions';save();render();
}
function scoutingBriefView(){
 return `<details class="sc-card"><summary>Ge scouten ett behov att lösa</summary><form class="sc-fields" onsubmit="event.preventDefault();scoutingBrief(this.elements.profile.value,this.elements.placement.value,this.elements.maxSalary.value,this.elements.maxAge.value,this.elements.horizon.value,this.elements.person.value)">
 <label>Spelartyp<select name="profile">${recruitOptions(Object.fromEntries(Object.keys(RECRUIT_PROFILES).map(k=>[k,k])),'Defensiv back')}</select></label>
 <label>Tänkt plats<select name="placement">${['Tredje backparet','Första backparet','Målvaktsersättare','Ordinarie','Utvecklingsspelare'].map(k=>`<option>${k}</option>`).join('')}</select></label>
 <label>Högsta årslön (kr)<input name="maxSalary" type="number" min="10000" step="10000" value="1000000" required></label>
 <label>Högsta ålder<input name="maxAge" type="number" min="18" max="45" value="30" required></label>
 <label>Tidshorisont<select name="horizon">${recruitOptions(SCOUT_LISTS,'now')}</select></label>
 <label>Ansvarig scout<select name="person">${scoutingStaff().map(s=>`<option value="${scoutingPerson(s)}">${trainingSafe(s.name)}${scoutingBusy(s)?' · upptagen':''}</option>`).join('')}</select></label>
 <p>Scouten föreslår upp till tre kandidater. Granska kostnad och leveransdatum innan du startar observationerna. Lönekrav behöver bekräftas genom kontakt.</p><button class="btn secondary">Ta fram uppdrag</button></form></details>`;
}
function scoutingBriefResult(p){
 const job=scoutingOffice()?.jobs.find(j=>j.criteria&&j.players.some(id=>samePlayerId(id,p.id)));if(!job)return '';
 const c=job.criteria,cost=scoutingCost(p),fit=recruitRoleAssessment(p,c.profile),over=cost.low>c.maxSalary;
 return `<section class="sc-candidate-next"><h3>Uppdrag: ${trainingSafe(c.profile)}</h3><p>${trainingSafe(c.placement)} · högst ${careerMoney(c.maxSalary)}/år · ${SCOUT_LISTS[c.horizon]}.</p><p>${over?'Kostnadsbedömningen ligger över din budget. Avstå eller ompröva ramen.':cost.high>c.maxSalary?'Löneintervallet överlappar budgetgränsen. Kontakta spelaren innan ett bud.':'Kostnadsunderlaget ryms i löneramen.'} ${fit?`Bedömd rollpassning: ${fit.low}–${fit.high}/20.`:'Rollpassningen är ännu inte observerad.'}</p></section>`;
}
function scoutingDecline(id,reconsider=false){
 const p=findPlayerAnywhere(id),o=ensureScoutingOffice();if(!p||isOwnPlayer(p)||loanLocked())return;
 o.declined??={};if(reconsider)delete o.declined[id];
 else {o.declined[id]={date:state.calendar.date,profile:recruitFilters().profile};state.recruitment.shortlist=state.recruitment.shortlist.filter(x=>!samePlayerId(x,id));delete o.lists[id];}
 save();render();
}
