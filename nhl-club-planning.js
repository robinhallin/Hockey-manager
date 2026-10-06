"use strict";
// Contingencies are not contracts. Views read facts; only actions/calendar save decisions.
function naClubRisk(p){
 if(!nhlOwned(p)||naActive(p)||p.futureContract||playerLoan(p)||p.age<18)return null;
 const offer=state.northAmerica?.offers.find(o=>samePlayerId(o.playerId,p.id)&&o.origin===managerClub()&&o.status==='pending');
 const clause=p.nhlRelease?.club===managerClub()&&p.nhlRelease.until>=state.calendar.date&&p.nhlRelease.contractEnd===`${state.season.year+Math.max(1,p.contractYears||1)}-06-30`;
 const rights=naRights(p),interested=naInterested(p);
 if(!offer&&!clause&&!(interested&&rights.team))return null;
 const terms=naReleaseTerms(p),group=worldGroup(p),roster=managerRoster(),senior=roster.some(q=>samePlayerId(q.id,p.id));
 const peers=roster.filter(q=>!samePlayerId(q.id,p.id)&&worldGroup(q)===group&&medicalReady(q)&&!internationalAway(q)&&!playerLoan(q));
 const units=[];for(const [key,size,label] of [['forwards',3,'Kedja'],['defense',2,'Backpar']]){const i=(state.lines?.[key]||[]).findIndex(id=>samePlayerId(id,p.id));if(i>=0)units.push(`${label} ${Math.floor(i/size)+1}`);}
 for(const [key,ids] of Object.entries(state.specialTeams||{}))if(Array.isArray(ids)&&ids.some(id=>samePlayerId(id,p.id)))units.push(key.toUpperCase());
 return {p,offer,terms,level:offer?'Konkret erbjudande':clause?'Avtalad NHL-utväg':'Bevaka NHL-rättighet',senior,peers:peers.length,missing:senior?Math.max(0,({MV:2,B:6,F:12})[group]-peers.length):0,units,
  possibleWage:senior?p.salary:0,when:offer?`Besked ${calText(offer.dueDate||offer.expires)}`:clause?`${calText(p.nhlRelease.from)}–${calText(p.nhlRelease.until)}`:'Ingen avtalad avgång',loanback:offer?.mode==='loanback'};
}
function naClubPlans(){return (state.northAmerica?.clubPlans||[]).filter(a=>a.club===managerClub());}
function naClubPlan(id){return naClubPlans().find(a=>samePlayerId(a.playerId,id)&&!a.closed);}
function naPlanStatus(a){
 const p=naFind(a.playerId),offer=state.northAmerica?.offers.find(o=>o.id===a.offerId);
 if(a.closed)return 'Avslutad';
 if(a.candidates.some(id=>getPlayerClub(id)===a.club))return 'Ersättare värvad';
 if(p&&naActive(p)&&p.naContract.homeClub===a.club)return playerLoan(p)?.borrower===a.club?'Återlån · ingen omedelbar lucka':'Avgång klar';
 if(offer?.status==='signed')return offer.mode==='loanback'?'Återlån · ingen omedelbar lucka':'Avgång klar';
 if(!p||!nhlOwned(p))return 'Spelaren har lämnat · granska planen';
 if(offer&&['rejected','expired'].includes(offer.status))return 'Affären föll · fortsatt bevakning';
 return a.mode==='after'?'Invänta klar avgång':'Bevaka tills vidare';
}
function naSetClubPlan(id,mode){
 if(naLocked()||!managerEmployed()||!['watch','after','close'].includes(mode))return false;
 const old=naClubPlan(id),p=naFind(id),risk=p&&naClubRisk(p);
 if(mode==='close'){if(!old)return false;old.closed=state.calendar.date;save();render();return true;}
 if(!risk&&!old)return false;
 const w=ensureNorthAmerica();w.clubPlans??=[];
 if(old)old.mode=mode;
 else {if(naClubPlans().filter(a=>!a.closed).length>=40)return false;w.clubPlans.unshift({club:managerClub(),playerId:p.id,name:p.name,date:state.calendar.date,mode,candidates:[],offerId:risk.offer?.id||null,position:p.pos,profile:p.pos==='MV'?'Målvakt':p.pos==='B'?'Defensiv back':p.pos==='C'?'Spelfördelare':'Målskytt',role:p.promisedRole||'Ordinarie',salary:p.salary||250000});}
 w.clubPlans=w.clubPlans.filter(a=>!a.closed).concat(w.clubPlans.filter(a=>a.closed).slice(0,40));save();render();return true;
}
function naPlanScout(id){
 const a=naClubPlan(id);if(!a||naLocked()||!managerEmployed())return false;
 const staff=scoutingStaff().find(s=>!scoutingBusy(s))||scoutingStaff()[0];if(!staff)return false;
 const criteria={profile:a.profile,placement:a.role==='Nyckelspelare'?'Nyckelspelare':'Ordinarie',targetRole:a.role==='Nyckelspelare'?'key':'regular',maxSalary:Math.max(10000,a.salary),maxAge:32,horizon:'now',league:'ALL',confidence:'possible',position:a.position,nhlPlanId:a.playerId};
 const players=scoutingBriefCandidates(criteria).slice(0,3).map(p=>p.id);
 scoutDesk.draft={players,method:'detail',person:scoutingPerson(staff),profile:a.profile,horizon:'now',criteria};deskNavigate('transfers','missions');return true;
}
function naPlanCandidate(id,candidate){
 const a=naClubPlan(id),p=naFind(candidate);if(!a||!p||naLocked()||!managerEmployed()||nhlOwned(p)||naActive(p)||worldGroup(p)!==(a.position==='MV'?'MV':a.position==='B'?'B':'F'))return false;
 if(a.candidates.some(x=>samePlayerId(x,p.id)))a.candidates=a.candidates.filter(x=>!samePlayerId(x,p.id));else {if(a.candidates.length>=8)return false;a.candidates.push(p.id);}
 save();render();return true;
}
function naPlanOpenCandidate(id,candidate){
 const a=naClubPlan(id),p=naFind(candidate);if(!a||!p||naLocked()||!managerEmployed()||!a.candidates.some(x=>samePlayerId(x,p.id))||a.mode!=='after'||naPlanStatus(a)!=='Avgång klar')return false;
 if(naActive(p)||playerLoan(p)||getPlayerClub(p.id)===managerClub()||p.futureContract)return naNotice('Kandidatens avtalsläge har ändrats. Välj en annan ersättare.');
 hubPick(p.id);hubPanel('transfer');deskNavigate('transfers','search');return true;
}
function naClubPlanningDay(){
 if(naLocked()||!managerEmployed())return;
 for(const a of naClubPlans().filter(a=>!a.closed)){
  const p=naFind(a.playerId),risk=p&&naClubRisk(p);if(risk?.offer)a.offerId=risk.offer.id;
  const status=naPlanStatus(a);if(a.lastStatus===status)continue;a.lastStatus=status;
  if(['Avgång klar','Ersättare värvad','Återlån · ingen omedelbar lucka','Affären föll · fortsatt bevakning'].includes(status))managerMessage(`na-plan:${a.playerId}:${a.date}:${status}`,`${a.name}: ${status}`,'Granska ersättarplanen under Truppplanering. Planen gör inga automatiska värvningar och bokför inga framtida intäkter.','Sportchefen',{link:'transfers'});
 }
 for(const {p} of internationalPlayers()){
  const d=p.nhlCareerTalk;if(d?.status==='active'&&(d.until<state.calendar.date||d.club!==managerClub()||!nhlOwned(p))){d.status='neutral';d.outcome='Perioden eller klubbtillhörigheten ändrades utan ett bedömt klubbeslut. Ingen påföljd.';}
 }
}
function naCareerTalk(id,choice){
 const p=naFind(id),old=p?.nhlCareerTalk;
 if(!p||p.age<18||!nhlOwned(p)||naActive(p)||naLocked()||!managerEmployed()||!['listen','support','loanback'].includes(choice)||old?.status==='active'||old?.club===managerClub()&&calGap(old.date,state.calendar.date)<28)return false;
 const terms=naReleaseTerms(p),year=state.calendar.date.slice(0,4),until=terms.until||(p.nhlDraft?.year===Number(year)&&recruitCountry(managerClub())==='SWE'?`${year}-08-15`:`${year}-09-30`);
 if(choice!=='listen'&&until<state.calendar.date)return false;
 if(old)p.nhlCareerTalkHistory=[old,...(p.nhlCareerTalkHistory||[])].slice(0,4);
 p.nhlCareerTalk={club:managerClub(),date:state.calendar.date,until,choice,status:choice==='listen'?'open':'active',outcome:choice==='listen'?'Ambitionen är noterad. Inget flytt-, istids- eller klausullöfte har givits.':choice==='support'?'Klubben lovar att godkänna en genomförbar NHL-flytt under perioden. Spelaren avgör om avtalet accepteras.':'Klubben lovar att begära återlån när ett genomförbart NHL-erbjudande med återlån finns. NHL-klubben och spelaren måste också godkänna.'};
 playerSocialIdentity(p);socialRemember(p,'NHL-samtal',p.nhlCareerTalk.outcome);save();render();return true;
}
function naCareerDecision(p,o,choice){
 if(o.clubReaction||o.origin!==managerClub())return;
 const d=p.nhlCareerTalk,promise=d?.club===o.origin&&d.status==='active'&&state.calendar.date<=d.until;
 // Do not punish a club for refusing a move that cannot legally/financially settle.
 const rights=naRights(p),existingCost=(state.clubRosters[o.origin]||[]).includes(p)||p.academy?.seniorContract?p.salary:0;const possible=state.calendar.date<=o.expires&&(!rights.team||rights.team===o.team)&&naOfferWindow(p,o)&&naCanLeave(p,o.origin)&&naFunded(o.team,o,o.id)&&(!promise||d.choice!=='loanback'||naLoanRoom(p,o.origin,o.share,existingCost));
 const relevant=promise&&(d.choice==='support'||d.choice==='loanback'&&o.loanback);
 const met=relevant&&(d.choice==='support'&&choice!=='reject'||d.choice==='loanback'&&choice==='loanback');
 const broken=relevant&&possible&&!met&&!o.release?.automatic;
 const delta=met?2:broken?-6:choice==='reject'&&possible&&(p.social?.ambition||10)>=14?-2:0;
 const text=met?'Klubben höll sitt NHL-löfte. Spelarens och NHL-klubbens slutliga beslut återstår.':broken?'NHL-löftet bröts i klubbens beslut. Spelaren tappar förtroende.':delta?'Spelaren är besviken på att en genomförbar NHL-möjlighet nekades.':'Klubbens besked har registrerats utan förtroendepåföljd.';
 o.clubReaction={date:state.calendar.date,delta,text};playerSocialIdentity(p);if(delta)relationshipChange(p,delta,'NHL-besked',text);else socialRemember(p,'NHL-besked',text);
 if(relevant&&possible&&(met||broken)){d.status=met?'met':'missed';d.outcome=text;}
}
function naDepartureRelation(p,club){
 const rows=(p.social?.journal||[]).filter(e=>e.club===club);
 return {club,date:state.calendar.date,trust:club===managerClub()?(p.social?.trust??60):Math.max(0,Math.min(100,60+rows.reduce((n,e)=>n+(e.change||0),0))),recorded:club===managerClub()||rows.length>0};
}
function naReturnPreference(p,club){
 const history=(p.naHistory||[]).find(c=>c.homeClub===club);if(!history||getPlayerClub(p.id)===club)return {score:0,text:''};
 const relation=history.homeRelation,rows=(p.social?.journal||[]).filter(e=>e.club===club);
 const known=relation?.recorded||rows.length>0,trust=relation?.recorded?relation.trust:60+rows.reduce((n,e)=>n+(e.change||0),0);
 const score=known?Math.max(-12,Math.min(12,(trust-60)/4+((p.social?.loyalty||10)-10)*.3)):0;
 return {score,text:known?`Tidigare relation med ${club}: ${score>1?'positiv':score< -1?'ansträngd':'neutral'}. Lön, trovärdig roll, avtalslängd och konkurrerande bud vägs fortfarande in.`:`Tidigare klubb ${club}, men underlag om relationen saknas. Ingen hemvändarbonus antas.`};
}
function naReturnChoiceView(p){
 if(!p.naHistory?.length||naActive(p))return '';
 const r=naReturnPreference(p,managerClub()),offers=(state.clubAI?.offers||[]).filter(o=>samePlayerId(o.playerId,p.id)&&o.status==='pending');
 return `<section class="sc-card"><h3>Återvändarens klubbval</h3><p>${trainingSafe(r.text||'Ingen registrerad tidigare relation med din klubb. Vanliga krav på lön och roll gäller.')}</p><p>${offers.length} konkurrerande bud. En hemkomst är inget automatiskt förstahandsval.</p></section>`;
}
function naCareerTalkView(p){
 if(!nhlOwned(p)||naActive(p)||p.age<18)return '';
 const d=p.nhlCareerTalk,own=d?.club===managerClub(),blocked=naLocked()||own&&(d.status==='active'||calGap(d.date,state.calendar.date)<28);
 return `<details class="sc-card na-career-talk"><summary>NHL-ambition och klubbens besked</summary>${own?`<p>${trainingSafe(d.outcome)} · ${d.status==='active'?'Gäller till '+calText(d.until):trainingSafe(d.status)}</p>`:''}<p>Att lyssna ger ingen förtroendebonus. Ett klubblöfte bedöms mot klubbens beslut om ett genomförbart erbjudande, inte mot om tredje part accepterar. Avtalade klausuler gäller alltid.</p><div class="nhl-actions">${[['listen','Lyssna utan löfte'],['support','Lova stöd för NHL-flytt'],['loanback','Lova att begära återlån']].map(([key,label])=>`<button class="btn secondary" onclick="naCareerTalk('${haEscape(p.id)}','${key}')" ${blocked?'disabled':''}>${label}</button>`).join('')}</div><p>Aktiva löften måste följas upp; nya samtal tidigast efter 28 dagar.</p></details>`;
}
function naClubPlanningView(){
 const risks=[...managerRoster(),...(state.juniors?.roster||[])].filter((p,i,all)=>all.findIndex(q=>samePlayerId(q.id,p.id))===i).map(naClubRisk).filter(Boolean),plans=naClubPlans().filter(a=>!a.closed);
 const known=[...new Set([...(state.recruitment?.shortlist||[]),...(scoutingOffice()?.jobs||[]).flatMap(j=>j.players)])].map(naFind).filter(p=>p&&!nhlOwned(p)&&!naActive(p));
 return `<section class="sc-card na-club-planning"><h2>Planera för NHL-tapp</h2><p>Risk är inte en klar avgång. Dagens bemanning och budget ändras först av ett registrerat avtal. Kandidater bokas aldrig automatiskt.</p>${risks.map(r=>`<article data-nhl-player="${haEscape(r.p.id)}"><h3>${playerReference(r.p.id,r.p.name)} · ${r.level}</h3><p>${r.when} · ${r.terms.open?'Flyttfönster öppet':'Flytt kan inte registreras i dag'}. ${r.loanback?'Återlån planeras – räkna inte bort spelaren.':''}</p><p>${r.senior?`${r.peers} spelklara alternativ i positionsgruppen utan spelaren; ${r.missing} under grundbemanning. ${trainingSafe(r.units.join(', ')||'Ingen aktuell enhet')}. Möjligt frigjord årslön vid ren avgång: ${careerMoney(r.possibleWage)}, inte disponibel ännu.`:'Junior: ingen ordinarie seniorplats eller seniorlön räknas bort.'}</p>${!naClubPlan(r.p.id)?`<button class="btn secondary" onclick="naSetClubPlan('${haEscape(r.p.id)}','watch')">Förbered ersättarplan</button>`:''}${naCareerTalkView(r.p)}</article>`).join('')||'<p>Inga konkreta NHL-erbjudanden, aktiva klausuler eller aktuella rättighetsrisker i din trupp.</p>'}${plans.map(a=>{const status=naPlanStatus(a),ids=[...new Set([...a.candidates,...(scoutingOffice()?.jobs||[]).filter(j=>samePlayerId(j.criteria?.nhlPlanId,a.playerId)).flatMap(j=>j.players)])],options=known.filter(p=>worldGroup(p)===(a.position==='MV'?'MV':a.position==='B'?'B':'F'));return `<details class="na-contingency"><summary>${trainingSafe(a.name)} · ${status}</summary><p>${a.mode==='watch'?'Bevaka tills vidare':'Förhandla först när avgången är klar'} · ${a.candidates.length}/8 valda kandidater. Scoutlönen är ett söktak, ingen reserverad eller frigjord budget.</p><button class="btn secondary" onclick="naPlanScout('${haEscape(a.playerId)}')">Förbered scoutuppdrag</button><button class="btn secondary" onclick="naSetClubPlan('${haEscape(a.playerId)}','${a.mode==='watch'?'after':'watch'}')">${a.mode==='watch'?'Värva efter klar avgång':'Återgå till bevakning'}</button><form onsubmit="event.preventDefault();naPlanCandidate('${haEscape(a.playerId)}',this.elements.candidate.value)"><label>Kandidat från bevakning/scouting<select name="candidate">${options.filter(p=>!a.candidates.some(id=>samePlayerId(id,p.id))).map(p=>`<option value="${haEscape(p.id)}">${trainingSafe(p.name)}</option>`).join('')}</select></label><button class="btn secondary">Lägg till kandidat</button></form>${ids.map(naFind).filter(Boolean).map(p=>`<p>${playerReference(p.id,p.name)} · ${trainingSafe(getPlayerClub(p.id))} ${a.candidates.some(id=>samePlayerId(id,p.id))?`<button class="rh-link" onclick="naPlanCandidate('${haEscape(a.playerId)}','${haEscape(p.id)}')">Ta bort</button><button class="btn secondary" onclick="naPlanOpenCandidate('${haEscape(a.playerId)}','${haEscape(p.id)}')" ${a.mode==='after'&&status==='Avgång klar'?'':'disabled'}>Granska ersättarbud</button>`:`<button class="rh-link" onclick="naPlanCandidate('${haEscape(a.playerId)}','${haEscape(p.id)}')">Välj kandidat</button>`}</p>`).join('')}<button class="rh-link" onclick="naSetClubPlan('${haEscape(a.playerId)}','close')">Avsluta planen</button></details>`;}).join('')}</section>`;
}
