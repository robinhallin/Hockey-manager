"use strict";
// Public discovery and recorded fixture evidence are separate from private ability.
SCOUT_METHODS.discovery={name:'Löpande kartläggning',days:7,steps:6,factor:1,quality:.65};
function scoutingSearchCandidates(j){
 return getTransferMarketPlayers().filter(p=>!isOwnPlayer(p)&&['SHL','HA'].includes(scoutingLeague(p))&&
  (j.filters.league==='ALL'||scoutingLeague(p)===j.filters.league)&&p.age>=j.filters.minAge&&p.age<=j.filters.maxAge&&
  (j.profile==='ALL'||RECRUIT_PROFILES[j.profile].positions.includes(p.pos))&&
  scoutingCost(p).low<=j.filters.maxSalary&&!j.seen.some(id=>samePlayerId(id,p.id))&&!scoutPending(p.id))
  .sort((a,b)=>attrSeed(`${j.id}:${j.steps}:${a.id}:discovery`)-attrSeed(`${j.id}:${j.steps}:${b.id}:discovery`)).slice(0,3);
}
function scoutingSearchStart(person,profile,league,minAge,maxAge,maxSalary,weeks,horizon){
 const o=ensureScoutingOffice(),s=scoutingStaff().find(s=>scoutingPerson(s)===String(person));
 minAge=Number(minAge);maxAge=Number(maxAge);maxSalary=Number(maxSalary);weeks=Number(weeks);
 if(!o||!s||!managerCanPlay()||loanLocked()||!['ALL','SHL','HA'].includes(league)||!['now','next','youth'].includes(horizon)||
  !(profile==='ALL'||RECRUIT_PROFILES[profile])||![4,8,12].includes(weeks)||![minAge,maxAge,maxSalary].every(Number.isFinite)||minAge<15||maxAge>50||minAge>maxAge||maxSalary<100000)return false;
 const fee=Math.round(clubMissionFee()/3)*weeks;
 if(scoutingBusy(s)||scoutActiveCount()>=clubMissionLimit()||state.money-clubForecast().reserved<fee)return recruitMessage('Uppdraget ryms inte i scoutkapaciteten eller klubbkassan.');
 const date=state.calendar.date,j={id:o.nextId++,club:managerClub(),person:scoutingPerson(s),observer:{...s},method:'discovery',profile,horizon,
  filters:{league,minAge,maxAge,maxSalary},start:date,end:calAdd(date,weeks*7),next:calAdd(date,7),interval:7,totalSteps:weeks,steps:0,fee,
  regions:['SWE'],knowledge:scoutingCoverage(s,'SWE'),status:'active',players:[],seen:[],discoveries:[],evidenceVersion:1};
 j.players=scoutingSearchCandidates(j).map(p=>p.id);j.seen.push(...j.players);
 clubPost('scouting',-fee,`Löpande kartläggning · ${s.name}`);o.jobs.unshift(j);o.jobs=o.jobs.filter(x=>x.status==='active').concat(o.jobs.filter(x=>x.status!=='active').slice(0,60));
 save();render();return true;
}
function scoutingCaptureFixture(game,rows,reports,partial){
 const o=scoutingOffice();if(!o)return;
 const date=game.date||state.calendar.date,key=`${state.season.year}:${game.seriesId||'regular'}:${game.round}:${game.home}:${game.away}`;
 const wanted=new Set(o.jobs.filter(j=>j.status==='active'&&j.club===managerClub()&&j.start<=date).flatMap(j=>j.players).map(String));
 if(!wanted.size)return;o.matchEvidence??={};
 for(const row of rows){
  if(!wanted.has(String(row.id))||!row.seconds)continue;
  const p=findPlayerAnywhere(row.id);if(!p)continue;
  const previous=o.matchEvidence[String(p.id)]||[];if(previous.some(v=>v.key===key))continue;
  const report=reports.find(r=>r.club===row.club),opponent=row.club===game.home?game.away:game.home;
  const peers=rows.filter(r=>r.club===row.club&&r.id!==row.id&&r.pos!=='MV'&&r.seconds>0).sort((a,b)=>
   (report?.pairSeconds?.[dynamicsKey(row.id,b.id)]||0)-(report?.pairSeconds?.[dynamicsKey(row.id,a.id)]||0));
  const mates=peers.filter(r=>(report?.pairSeconds?.[dynamicsKey(row.id,r.id)]||0)>=60).slice(0,3).map(r=>({name:r.name,seconds:report.pairSeconds[dynamicsKey(row.id,r.id)]}));
  o.matchEvidence[String(p.id)]=[{key,date,club:row.club,opponent,league:leagueOf(row.club),partial:Boolean(partial),
   seconds:row.seconds,goals:row.goals||0,assists:row.assists||0,shots:row.shots||0,pim:row.pim||0,saves:row.saves||0,against:row.against||0,
   usage:row.scoutUsage?{...row.scoutUsage}:null,evenIce:row.evenIce?{...row.evenIce}:null,mates,
   // Captured once at the fixture, never re-read at report delivery.
   snapshot:{...ensurePlayerAttributes(p)}} ,...previous].slice(0,6);
 }
 for(const id of Object.keys(o.matchEvidence))if(!wanted.has(id)&&!o.matchEvidence[id].some(v=>calGap(v.date,state.calendar.date)<=60))delete o.matchEvidence[id];
}
function scoutingFixtureFor(p,j){
 const last=state.scoutReports[String(p.id)]?.lastObserved;
 return (scoutingOffice()?.matchEvidence?.[String(p.id)]||[]).find(e=>e.club===getPlayerClub(p.id)&&e.date>=j.start&&e.date<=state.calendar.date&&(!last||calGap(last,e.date)>=7));
}
function scoutingObserveJob(p,j){
 const e=scoutingFixtureFor(p,j),m=SCOUT_METHODS[j.method];
 if(!e){
  if(j.evidenceVersion&& !worldIsFree(p.id))return false;
  return scoutObserve(p.id,state.calendar.date,{observer:j.observer,quality:m.quality*.55,focus:j.method,force:true,job:j.id,source:'Tränings-/bakgrundsunderlag, ingen registrerad match'});
 }
 const quality=m.quality*(.8+j.knowledge/500)*Math.min(1,.35+e.seconds/(p.pos==='MV'?5400:1800))*(e.partial?.6:1);
 return scoutObserve(p.id,e.date,{observer:j.observer,quality,focus:j.method,force:true,job:j.id,snapshot:e.snapshot,evidence:e,source:'Registrerad tävlingsmatch'});
}
function scoutingDiscoveryDay(j){
 if(j.club!==managerClub()||!scoutingStaff().some(s=>scoutingPerson(s)===j.person)){scoutingClose(j,'cancelled','Uppdragets scout eller klubb har ändrats.');return;}
 let found=0;
 for(const id of j.players){const p=findPlayerAnywhere(id);if(!p||isOwnPlayer(p))continue;
  if(scoutingObserveJob(p,j)){
   const a=playerAssessment(p),fit=j.profile==='ALL'?null:recruitRoleAssessment(p,j.profile),cost=scoutingCost(p),status=cost.low>j.filters.maxSalary?'Över budgetindikationen':fit&&fit.high<11?'Svagt stöd för rollen':'Värd fördjupning';
   j.discoveries.unshift({id:p.id,name:p.name,date:state.calendar.date,status,reason:`${a.visits} observationer. ${fit?`Rollintervall ${fit.low}–${fit.high}/20. `:''}Lön ${scoutingCash(cost.low)}–${scoutingCash(cost.high)}${cost.known?'':' (obekräftad)'}.`});
   if(status==='Värd fördjupning')scoutingListQuiet(p,j.horizon);found++;
  }
 }
 j.steps++;j.note=`${j.seen.length} kandidater kartlagda; ${j.discoveries.length} med matchunderlag. ${found?'Nya rapporter levererade.':'Inget nytt matchunderlag för veckans urval.'}`;
 managerMessage(`sc-discovery:${j.id}:${j.steps}`,`Scoutavstämning: ${j.profile==='ALL'?'öppen kartläggning':j.profile}`,j.note+' Även svaga eller för dyra alternativ finns i uppdragets historik.','Chefsscout',{link:'transfers',scoutJob:j.id});
 if(j.steps>=j.totalSteps){j.status='completed';j.ended=state.calendar.date;return;}
 // Retain unobserved candidates for a second week, then broaden the search.
 const retain=j.players.filter(id=>!j.discoveries.some(d=>samePlayerId(d.id,id))&&!j.previous?.some(x=>samePlayerId(x,id))).slice(0,2);
 j.previous=[...j.players];const next=scoutingSearchCandidates(j).map(p=>p.id);j.players=[...retain,...next].slice(0,3);j.seen.push(...j.players.filter(id=>!j.seen.some(x=>samePlayerId(x,id))));
 j.next=calAdd(state.calendar.date,7);const key=j.person+':SWE';scoutingOffice().coverage[key]=Math.min(30,(scoutingOffice().coverage[key]||0)+1);
}
function scoutingMatchEvidenceView(p){
 const r=state.scoutReports[String(p.id)],evidence=r?.matchHistory||[];if(!evidence.length)return r?.source?`<p class="sc-note">Källa: ${trainingSafe(r.source)}.</p>`:'';
 return `<details class="sc-evidence" open><summary>Observerade matcher · ${evidence.length}</summary>${evidence.map(e=>`<article><b>${calText(e.date)} · ${trainingSafe(e.club)}–${trainingSafe(e.opponent)}</b><p>${e.league==='HA'?'HockeyAllsvenskan':'SHL'} · ${(e.seconds/60).toFixed(1)} min · ${p.pos==='MV'?`${e.saves} räddningar, ${e.against} insläppta`:`${e.goals}+${e.assists}, ${e.shots} skott, ${e.pim} utvisningsminuter`}.</p><p>${e.usage?`PP ${(e.usage.pp/60).toFixed(1)} min · BP ${(e.usage.pk/60).toFixed(1)} min. `:'Special teams-istid saknas i detta äldre underlag. '}${e.evenIce?`Skott med spelaren på isen vid lika styrka: ${e.evenIce.shotsFor}–${e.evenIce.shotsAgainst}.`:'Ingen separat defensiv händelselogg: poäng räcker inte för en defensiv slutsats.'}</p>${e.mates.length?`<p>Registrerad samspeltid: ${e.mates.map(m=>trainingSafe(m.name)+' '+(m.seconds/60).toFixed(1)+' min').join(' · ')}.</p>`:''}<small>${e.partial?'Delvis registrerad match; lägre tillförlitlighet. ':''}${e.seconds<600?'Kort istid begränsar slutsatserna. ':''}Omgivning och lagets spel påverkar utfallet. Attributen bedöms separat; poäng omvandlas inte till SHL-förmåga.</small></article>`).join('')}</details>`;
}
function scoutingDiscoveryForm(){
 const profile=recruitFilters().profile||'ALL';return `<details class="sc-card"><summary>Ge scouten ett löpande sökuppdrag</summary><p>Scouten väljer upp till tre nya kandidater per vecka utifrån offentliga fakta och tillgängliga bedömningar. Matcher i karriärens SHL och HockeyAllsvenskan ger observationer. Utanför tävlingssäsongen kan matchunderlag saknas.</p><form class="sc-fields" onsubmit="event.preventDefault();scoutingSearchStart(this.elements.person.value,this.elements.profile.value,this.elements.league.value,this.elements.minAge.value,this.elements.maxAge.value,this.elements.salary.value,this.elements.weeks.value,this.elements.horizon.value)"><label>Ansvarig scout<select name="person">${scoutingStaff().map(s=>`<option value="${scoutingPerson(s)}" ${scoutingBusy(s)?'disabled':''}>${trainingSafe(s.name)}${scoutingBusy(s)?' · upptagen':''}</option>`).join('')}</select></label><label>Sök roll<select name="profile">${recruitOptions({ALL:'Öppen kartläggning',...Object.fromEntries(Object.keys(RECRUIT_PROFILES).map(k=>[k,k]))},profile)}</select></label><label>Bevakningsliga<select name="league">${recruitOptions({ALL:'Sverige · båda ligorna',SHL:'SHL',HA:'HockeyAllsvenskan'},'ALL')}</select></label><label>Ålder från<input name="minAge" type="number" min="15" max="50" value="18" required></label><label>Ålder till<input name="maxAge" type="number" min="15" max="50" value="28" required></label><label>Högsta årslön, kr<input name="salary" type="number" min="100000" step="10000" value="1000000" required></label><label>Uppdragsperiod<select name="weeks">${recruitOptions(Object.fromEntries([4,8,12].map(n=>[n,`${n} veckor · ${scoutingCash(Math.round(clubMissionFee()/3)*n)}`])),4)}</select></label><label>Behovet gäller<select name="horizon">${recruitOptions(SCOUT_LISTS,'next')}</select></label><button class="btn">Starta löpande kartläggning</button></form><p>Hela uppdragskostnaden dras vid start. Lönevillkor är uppskattningar tills kontakt tagits. Ett uppdrag upptar en scoutplats; ej utfört arbete återbetalas till 70 % vid avbrott.</p></details>`;
}
function scoutingDiscoveryResults(){return (scoutingOffice()?.jobs||[]).filter(j=>j.method==='discovery').slice(0,8).map(j=>`<details class="sc-card"><summary>${trainingSafe(j.profile)} · ${j.discoveries.length} kandidater med underlag · ${calText(j.start)}–${calText(j.end)}</summary><p>${j.filters.league==='ALL'?'SHL & HockeyAllsvenskan':j.filters.league} · ${j.filters.minAge}–${j.filters.maxAge} år · högst ${scoutingCash(j.filters.maxSalary)}/år · ${trainingSafe(j.observer.name)}</p>${j.discoveries.map(d=>`<article><button class="rh-link" onclick="recruitOpen('${haEscape(d.id)}')">${trainingSafe(d.name)}</button><b> · ${d.status}</b><p>${trainingSafe(d.reason)}</p></article>`).join('')||'<p>Inga observerade kandidater ännu. Scouten arbetar med det aktuella urvalet.</p>'}</details>`).join('');}

function scoutingNeedAssignment(profile){if(!RECRUIT_PROFILES[profile])return;state.recruitment.filters.profile=profile;deskNavigate('transfers','missions');}
