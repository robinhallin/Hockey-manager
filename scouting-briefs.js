"use strict";

const SCOUT_PLACEMENTS={
 'Nyckelspelare':{rank:6},'Ordinarie':{rank:9},'Rotationsspelare':{rank:12},'Breddspelare':{rank:14},
 'Första kedjan':{group:'F',rank:3},'Andra kedjan':{group:'F',rank:6},'Tredje kedjan':{group:'F',rank:9},'Fjärde kedjan':{group:'F',rank:12},
 'Första backparet':{group:'B',rank:2},'Andra backparet':{group:'B',rank:4},'Tredje backparet':{group:'B',rank:6},'Reservback':{group:'B',rank:8},
 'Förstemålvakt':{group:'MV',rank:1},'Målvaktsersättare':{group:'MV',rank:2},'Tredjemålvakt':{group:'MV',rank:3},'Utvecklingsspelare':{rank:null}
};
const SCOUT_TARGET_ROLES={all:'Alla tänkta roller',key:'Nyckelspelare · topp två',regular:'Ordinarie · andra/tredje',depth:'Bredd · fjärde/reserv',young:'Utvecklingsspelare · högst 23 år'};
function scoutingPlacementAssessment(p,profile,placement='Ordinarie',targetRole='all'){
 const def=SCOUT_PLACEMENTS[placement];if(!def)return null;
 const group=p.pos==='MV'?'MV':p.pos==='B'?'B':'F';if(def.group&&def.group!==group||targetRole==='young'&&p.age>23||placement==='Utvecklingsspelare'&&p.age>23)return null;
 const fit=recruitRoleAssessment(p,profile),known=playerAssessment(p).known;if(!fit)return null;
 const peers=managerRoster().filter(q=>(q.pos==='MV'?'MV':q.pos==='B'?'B':'F')===group).map(q=>attributeWeighted(ensurePlayerAttributes(q),RECRUIT_PROFILES[profile].weights)).sort((a,b)=>b-a);
 const roleRank=targetRole==='key'?({MV:1,B:4,F:6})[group]:targetRole==='regular'?({MV:2,B:6,F:9})[group]:null;
 const placeRank=def.group?def.rank:placement==='Nyckelspelare'?({MV:1,B:4,F:6})[group]:placement==='Ordinarie'?({MV:2,B:6,F:9})[group]:def.rank;
 const rank=roleRank&&placeRank?Math.min(roleRank,placeRank):roleRank||placeRank;
 const threshold=rank?peers[Math.min(rank,peers.length)-1]||0:0;
 return {known,...fit,threshold,rank,possible:!rank||fit.high>=threshold,supported:known&&(!rank||fit.center>=threshold)};
}
function scoutingBriefCandidates(c){
 return getTransferMarketPlayers().filter(p=>{
  if(!RECRUIT_PROFILES[c.profile]?.positions.includes(p.pos)||p.age>c.maxAge||scoutPending(p.id)||scoutingOffice()?.declined?.[p.id]||scoutingCost(p).low>c.maxSalary||c.horizon==='next'&&p.contractYears>1||c.league!=='ALL'&&scoutingLeague(p)!==c.league)return false;
  const fit=scoutingPlacementAssessment(p,c.profile,c.placement,c.targetRole);return fit&&fit[c.confidence==='supported'?'supported':'possible'];
 }).sort((a,b)=>Number(playerAssessment(b).known)-Number(playerAssessment(a).known)||recruitRoleValue(b,c.profile)-recruitRoleValue(a,c.profile)||String(a.id).localeCompare(String(b.id)));
}
function scoutingBrief(profile,placement,maxSalary,maxAge,horizon,person,league='ALL',targetRole='all',confidence='possible'){
 maxSalary=Number(maxSalary);maxAge=Number(maxAge);
 if(!RECRUIT_PROFILES[profile]||!SCOUT_PLACEMENTS[placement]||!SCOUT_TARGET_ROLES[targetRole]||!['possible','supported'].includes(confidence)||!Number.isFinite(maxSalary)||maxSalary<=0||!Number.isInteger(maxAge)||maxAge<18||maxAge>45||!SCOUT_LISTS[horizon]||!scoutingStaff().some(s=>scoutingPerson(s)===person))return;
 scoutDesk.draft=null;
 const criteria={profile,placement,maxSalary,maxAge,horizon,league,targetRole,confidence},choices=scoutingBriefCandidates(criteria);
 if(!choices.length)return recruitMessage('Inga kandidater matchar hela uppdraget. Ändra liga, tänkt plats eller löneram, eller välj att även kartlägga osäkra möjligheter.');
 scoutDesk.draft={players:choices.slice(0,3).map(p=>p.id),method:'detail',person,profile,horizon,criteria};
 state.recruitment.tab='missions';save();render();
}
function scoutingBriefView(){
 const c=scoutDesk.draft?.criteria||{profile:'Målskytt',league:leagueOf(),placement:'Ordinarie',targetRole:'all',confidence:'possible',maxSalary:1000000,maxAge:30,horizon:'now'};
 const person=scoutDesk.draft?.person||scoutingPerson(scoutingStaff().find(s=>!scoutingBusy(s))||scoutingStaff()[0]);
 const leagues=[...new Set(getTransferMarketPlayers().map(scoutingLeague))].filter(Boolean).sort();
 return `<section class="sc-card"><h3>Ge scouten ett konkret uppdrag</h3><form class="sc-fields" onsubmit="event.preventDefault();scoutingBrief(this.elements.profile.value,this.elements.placement.value,this.elements.maxSalary.value,this.elements.maxAge.value,this.elements.horizon.value,this.elements.person.value,this.elements.league.value,this.elements.targetRole.value,this.elements.confidence.value)">
 <label>Spelartyp<select name="profile">${recruitOptions(Object.fromEntries(Object.keys(RECRUIT_PROFILES).map(k=>[k,k])),c.profile)}</select></label>
 <label>Liga<select name="league">${recruitOptions({ALL:'Alla ligor',...Object.fromEntries(leagues.map(k=>[k,k]))},c.league)}</select></label>
 <label>Tänkt plats<select name="placement">${recruitOptions(Object.fromEntries(Object.keys(SCOUT_PLACEMENTS).map(k=>[k,k])),c.placement)}</select></label>
 <label>Bedömd trupproll<select name="targetRole">${recruitOptions(SCOUT_TARGET_ROLES,c.targetRole)}</select></label>
 <label>Underlag<select name="confidence"><option value="possible" ${c.confidence==='possible'?'selected':''}>Kartlägg även osäkra möjligheter</option><option value="supported" ${c.confidence==='supported'?'selected':''}>Kräv observerad nivå för rollen</option></select></label>
 <label>Högsta årslön (kr)<input name="maxSalary" type="number" min="10000" step="10000" value="${c.maxSalary}" required></label>
 <label>Högsta ålder<input name="maxAge" type="number" min="18" max="45" value="${c.maxAge}" required></label>
 <label>Tidshorisont<select name="horizon">${recruitOptions(SCOUT_LISTS,c.horizon)}</select></label>
 <label>Ansvarig scout<select name="person">${scoutingStaff().map(s=>`<option value="${scoutingPerson(s)}" ${scoutingPerson(s)===person?'selected':''}>${trainingSafe(s.name)}${scoutingBusy(s)?' · upptagen':''}</option>`).join('')}</select></label>
 <p>Alla villkor gäller samtidigt. Rollen bedöms mot konkurrensen i din egen trupp. En osäker möjlighet behöver observeras innan du lovar speltid. Granska upp till tre kandidater, kostnad och datum innan uppdraget startar.</p><button class="btn secondary">Ta fram uppdrag</button></form></section>`;
}
function scoutingBriefCriteriaText(c){return `${c.league||'Alla ligor'} · ${c.placement} · ${SCOUT_TARGET_ROLES[c.targetRole]||'Alla roller'} · ${c.confidence==='supported'?'observerad nivå krävs':'osäkra möjligheter ingår'}`;}
function scoutingBriefResult(p){
 const job=scoutingOffice()?.jobs.find(j=>j.criteria&&j.players.some(id=>samePlayerId(id,p.id)));if(!job)return '';
 const c=job.criteria,cost=scoutingCost(p),fit=scoutingPlacementAssessment(p,c.profile,c.placement,c.targetRole||'all'),over=cost.low>c.maxSalary;
 return `<section class="sc-candidate-next"><h3>Uppdrag: ${trainingSafe(c.profile)}</h3><p>${trainingSafe(scoutingBriefCriteriaText(c))} · högst ${careerMoney(c.maxSalary)}/år · ${SCOUT_LISTS[c.horizon]}.</p><p>${over?'Kostnadsbedömningen ligger över din budget.':cost.high>c.maxSalary?'Löneintervallet överlappar budgetgränsen. Kontakta spelaren före bud.':'Kostnadsunderlaget ryms i löneramen.'} ${fit?`Bedömd rollpassning: ${fit.low}–${fit.high}/20. ${fit.supported&&fit.known?'Observerad nivå ger stöd för den tänkta platsen.':fit.possible?'Möjlig roll, men ytterligare observationer behövs.':'Senaste bedömningen når inte konkurrensen för den tänkta platsen.'}`:'Position eller ålder passar inte den tänkta platsen.'}</p></section>`;
}
function scoutingDecline(id,reconsider=false){
 const p=findPlayerAnywhere(id),o=ensureScoutingOffice();if(!p||isOwnPlayer(p)||loanLocked())return;
 o.declined??={};if(reconsider)delete o.declined[id];
 else {o.declined[id]={date:state.calendar.date,profile:recruitFilters().profile};state.recruitment.shortlist=state.recruitment.shortlist.filter(x=>!samePlayerId(x,id));delete o.lists[id];}
 save();render();
}
