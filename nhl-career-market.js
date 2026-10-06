"use strict";
// Contract decisions only. Match results and ice time are read, never simulated here.
function naReleaseTerms(p,club=getPlayerClub(p.id),date=state.calendar.date){
 const clause=p.nhlRelease,valid=clause&&clause.club===club&&clause.contractEnd===`${state.season.year+Math.max(1,p.contractYears||1)}-06-30`;
 const currentDraft=p.nhlDraft?.year===Number(date.slice(0,4)),swedish=recruitCountry(club)==='SWE';
 const draftWindow=!swedish||!currentDraft||(date.slice(5)>='07-15'&&date.slice(5)<='08-15');
 if(valid&&date<=clause.until)return {open:draftWindow&&date>=clause.from&&date<=clause.until,automatic:true,fee:clause.fee,until:clause.until,reason:`Avtalad NHL-klausul ${calText(clause.from)}–${calText(clause.until)}. Fast klubbersättning ${careerMoney(clause.fee)}.`};
 return {open:draftWindow&&naWindow(),automatic:false,fee:null,until:null,reason:swedish&&currentDraft?'Årets draftade spelare: 15 juli–15 augusti enligt SIF. Klubbgodkännande och spelarbeslut krävs.':'Ingen avtalad NHL-klausul. Spelmodellen använder förhandlad flytt under juli–september.'};
}
function naOfferWindow(p,o,date=state.calendar.date){const current=naReleaseTerms(p,o.origin,date);return current.open&&(!o.release?.automatic||current.automatic&&current.until===o.release.until&&current.fee===o.fee);}
function naGrantRelease(id,from,until,fee){
 const p=naFind(id);fee=Number(fee);
 if(!p||!nhlOwned(p)||!managerEmployed()||naLocked()||naActive(p)||playerLoan(p)||p.futureContract||p.age<18||p.nhlRelease&&p.nhlRelease.until>=state.calendar.date&&p.nhlRelease.contractEnd===`${state.season.year+Math.max(1,p.contractYears||1)}-06-30`)return false;
 const end=`${state.season.year+Math.max(1,p.contractYears||1)}-06-30`,valid=d=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d))&&new Date(d).toISOString().slice(0,10)===d;
 if(!valid(from)||!valid(until)||from<state.calendar.date||until<from||until>end||!Number.isInteger(fee)||fee<0||fee>3000000)return naNotice('Ange giltiga avtalsdatum inom spelarens kontrakt och 0–3 miljoner SEK i klubbersättning.');
 if(state.northAmerica.offers.some(o=>o.status==='pending'&&samePlayerId(o.playerId,id)))return naNotice('Slutför den pågående NHL-affären innan ett nytt avtalsvillkor läggs till.');
 p.nhlRelease={club:managerClub(),agreed:state.calendar.date,from,until,fee,contractEnd:end};
 naLog(p,'release-clause',`Klubben ger rätt till NHL-flytt inom en avtalad period. ${naReleaseTerms(p).reason}`);
 return naNotice(`${p.name}: klausulen är avtalad. Inom perioden krävs inget nytt klubbveto; spelaren måste fortfarande acceptera NHL-avtalet.`,true);
}
function naReleaseView(p){
 if(naActive(p)||!nhlOwned(p)||p.age<18)return '';
 const terms=naReleaseTerms(p),end=`${state.season.year+Math.max(1,p.contractYears||1)}-06-30`;
 return `<section class="sc-card"><h3>NHL-klausul</h3><p>${trainingSafe(terms.reason)}</p>${p.nhlRelease&&p.nhlRelease.until>=state.calendar.date&&p.nhlRelease.contractEnd===end?'':`<details><summary>Ge spelaren en avtalad NHL-utväg</summary><p>Detta tillägg ger spelaren en rättighet som klubben inte ensidigt tar tillbaka. Ersättningen är ett förhandlat spelvärde, inte SIF:s verkliga avgiftstabell.</p><form onsubmit="event.preventDefault();naGrantRelease('${haEscape(p.id)}',this.elements.from.value,this.elements.until.value,this.elements.fee.value)"><label>Från<input name="from" type="date" min="${state.calendar.date}" max="${end}" value="${state.calendar.date}" required></label><label>Sista flyttdag<input name="until" type="date" min="${state.calendar.date}" max="${end}" value="${end}" required></label><label>Klubbersättning (SEK)<input name="fee" type="number" min="0" max="3000000" step="10000" value="1000000" required></label><button class="btn secondary" type="submit">Avtala NHL-klausulen</button></form></details>`}</section>`;
}
function naUsage(p,year=state.season.year){
 const rows=(p.naSeasons||[]).filter(s=>s.year===year),games=rows.reduce((n,s)=>n+s.games,0),seconds=rows.reduce((n,s)=>n+s.seconds,0),nhl=rows.filter(s=>s.league==='NHL').reduce((n,s)=>n+s.games,0);
 return {year,games,seconds,nhl,points:rows.reduce((n,s)=>n+s.goals+s.assists,0)};
}
function naPlacementScore(p){const u=naUsage(p);return naAbility(p)+(u.games>=5&&p.pos!=='MV'?Math.min(.6,u.points/u.games*.3):0);}
function naReviewDevelopment(p,date){
 const c=p.naContract;if(!c||c.assignment==='Sweden')return;
 const u=naUsage(p),b=c.usageBaseline;
 if(!b||b.year!==u.year){c.usageBaseline={...u,date};return;}
 if(calGap(b.date,date)<28||internationalAway(p)||!medicalReady(p))return;
 const games=u.games-b.games,minutes=games?(u.seconds-b.seconds)/60/games:0,nhl=u.nhl-b.nhl;
 const enough=games>=3,ambition=playerPreferenceProfile(p,c.homeClub).ambition;
 const low=enough&&minutes<(p.pos==='MV'?20:p.pos==='B'?10:8),seekingEurope=enough&&c.assignment==='AHL'&&((p.age>=24&&ambition>=14&&nhl===0)||low);
 c.development={date,games,minutes:Math.round(minutes*10)/10,nhl,seekingEurope,reason:!enough?'För få spelade matcher för att bedöma rollen.':seekingEurope?'Spelaren vill diskutera Europalån efter begränsad NHL-väg eller istid.':low?'Istiden är låg. Organisationen behöver se över utvecklingsmiljön.':'Den faktiska istiden ger en fungerande utvecklingsmiljö.'};
 c.usageBaseline={...u,date};
 if(seekingEurope)naLog(p,'europe-interest',c.development.reason);
}
function naRenewalReserved(team,exclude){return naPlayers(team).filter(p=>!samePlayerId(p.id,exclude)&&['pending','agreed'].includes(p.naContract.renewal?.status)).reduce((n,p)=>n+Math.max(0,p.naContract.renewal.terms.nhlSalary-p.naContract.nhlSalary),0);}
function naRenewalRoom(p,terms){const team=p.naContract.team,b=naBudget(team),r=naReservations(team);return b.committed-p.naContract.nhlSalary+terms.nhlSalary+r.wages+naRenewalReserved(team,p.id)<=NA_MARKET_RULES.wages;}
function naReviewContract(p,date,force=false){
 const c=p.naContract;if(!c||calGap(date,c.end)>60&&!force)return;
 if(!c.renewal){
  const peers=naPlayers(c.team).filter(q=>q!==p&&worldGroup(q)===worldGroup(p)&&naPlacementScore(q)>naPlacementScore(p)),u=naUsage(p),retain=p.age<27&&naAbility(p)>=12;
  const wanted=naAbility(p)>=14&&peers.length<({MV:2,B:4,F:6})[worldGroup(p)];
  const terms={...naTerms({...p,naHistory:[{}]}),fee:0};terms.end=`${Number(c.end.slice(0,4))+terms.years}-06-30`;
  c.renewal={date,dueDate:force?date:calAdd(date,3),status:wanted&&naRenewalRoom(p,terms)?'pending':retain?'retained':'released',terms,reason:wanted?'Klubben erbjuder fortsatt plats utifrån nivå och positionskonkurrens.':retain?'Klubben vill behålla NHL-rätten men erbjuder ingen förlängning.':'Klubben planerar vidare utan spelaren.',evidence:{games:u.games,nhl:u.nhl,peers:peers.length}};
  naLog(p,'contract-review',c.renewal.reason);
 }
 const offer=c.renewal;
 if(offer.status==='pending'&&(force||date>=offer.dueDate)){
  const decision=naPlayerDecision(p,{...offer.terms,origin:c.homeClub},'move');
  offer.status=decision.accepted&&!c.development?.seekingEurope&&naRenewalRoom(p,offer.terms)?'agreed':p.age<27&&naAbility(p)>=12?'retained':'released';
  offer.reason=offer.status==='agreed'?'Spelaren accepterar förlängningen. Nya villkor börjar när nuvarande avtal löper ut.':`Ingen förlängning överenskommen. ${c.development?.seekingEurope?'Spelaren prioriterar en europeisk roll.':decision.reason}`;
  naLog(p,'renewal-decision',offer.reason);
  if(c.homeClub===managerClub())managerMessage(`na-renewal:${p.id}:${c.end}`,`${p.name}: kontraktsbesked`,offer.reason,'Utlandsbevakningen',{link:'nhl'});
 }
}
function naApplyRenewal(p){
 const c=p.naContract;naReviewContract(p,state.calendar.date,true);
 const offer=c.renewal;if(offer.status!=='agreed'||!naRenewalRoom(p,offer.terms))return false;
 const old={...c,status:'expired'};delete old.renewal;p.naHistory=[old,...(p.naHistory||[])].slice(0,4);
 Object.assign(c,{...offer.terms,start:calAdd(c.end,1),events:[],trainingDays:0,lastReport:state.calendar.date});delete c.fee;delete c.years;delete c.renewal;delete c.usageBaseline;
 p.contractYears=Math.max(1,Number(c.end.slice(0,4))-state.season.year);p.salary=c.assignment==='NHL'?c.nhlSalary:c.ahlSalary;
 naLog(p,'renewed',`NHL-avtalet förlängdes till ${calText(c.end)}. Kontraktsägare och spelaridentitet är oförändrade.`);return true;
}
function naWatchReturn(id){
 const p=naFind(id),w=ensureNorthAmerica();if(!p||!w||!managerEmployed()||naLocked()||!p.naContract&&!p.naHistory?.length)return false;
 w.returnWatch??={};const key=managerClub(),list=w.returnWatch[key]??=[];if(list.some(x=>samePlayerId(x,id)))w.returnWatch[key]=list.filter(x=>!samePlayerId(x,id));else {if(list.length>=100)return naNotice('Bevakningslistan rymmer 100 spelare. Ta bort en bevakning först.');list.push(p.id);}
 save();render();return true;
}
function naReturnMarketDay(date){
 const w=state.northAmerica;if(!calendarWindowOpen()||w.lastReturnMarket&&calGap(w.lastReturnMarket,date)<7)return;w.lastReturnMarket=date;
 const candidates=(state.playerWorld?.freeAgents||[]).filter(p=>p.naHistory?.length&&!p.futureContract&&medicalReady(p)).sort((a,b)=>naAbility(b)-naAbility(a)||String(a.id).localeCompare(String(b.id))).slice(0,8);
 for(const p of candidates){
  const watched=w.returnWatch?.[managerClub()]?.some(id=>samePlayerId(id,p.id));
  if(watched)managerMessage(`na-return-watch:${p.id}:${p.freeSince||p.naHistory[0].end}`,`${p.name} är tillgänglig för Europa`,'Bevakningen har fångat kontraktsslutet. Beställ en aktuell scoutrapport och jämför roll och lönekrav; NHL-rättigheter visas separat.','Utlandsbevakningen',{link:'transfers',playerId:p.id});
  const clubs=Object.keys(state.clubAI?.clubs||{}).filter(club=>club!==managerClub()).map(club=>({club,need:aiMarketNeed(club,p)})).filter(r=>r.need&&(r.need.missing>0||r.need.qualityGap>0));
  clubs.sort((a,b)=>(b.need.missing||0)-(a.need.missing||0)||attrSeed(`${p.id}:${a.club}:return`)-attrSeed(`${p.id}:${b.club}:return`));
  let submitted=0;for(const {club,need} of clubs){if(submitted>=2)break;const terms=aiOfferTerms(club,p,need,'transfer');if(aiSubmitMarket(club,p,need,'transfer',terms))submitted++;}
 }
}
