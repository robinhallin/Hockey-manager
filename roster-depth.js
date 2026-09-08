"use strict";
// A player has one active roster. Ownership and the wage split live in the loan ledger.
function ensureLoans(){
 if(!state.careerStarted)return;
 if(state.loans){state.loans.offers??=[];state.loans.nextOffer??=1;return;}
 state.loans={version:2,nextId:1,nextOffer:1,offers:[],active:[],history:[],external:[],message:'',selected:null};
 for(const [club,roster] of Object.entries(state.clubRosters))for(const p of roster){
  const seed=p.loanStart;if(!seed)continue;delete p.loanStart;
  const loan={id:state.loans.nextId++,playerId:p.id,name:p.name,owner:seed.owner,borrower:club,start:'2026-09-06',until:seed.until,share:1,initial:true,termsEstimated:seed.termsEstimated,source:seed.source,baseline:{games:p.games||0,goals:p.goals||0,assists:p.assists||0},seconds:0,games:0,starts:0,goals:0,assists:0,appearances:[]};
  state.loans.active.push(loan);p.loanId=loan.id;
 }
}
function playerLoan(p){return p?.loanId?state.loans?.active.find(l=>l.id===p.loanId&&samePlayerId(l.playerId,p.id)):null;}
function loanWageCost(club){
 let total=(state.clubRosters[club]||[]).reduce((n,p)=>n+(p.salary||0)*(playerLoan(p)?.share??1),0);
 for(const l of state.loans?.active||[])if(l.owner===club){const p=(state.clubRosters[l.borrower]||[]).find(p=>samePlayerId(p.id,l.playerId));total+=(p?.salary||0)*(1-l.share);}
 total+=(state.clubAI?.clubs[club]?.academy?.roster||[]).filter(p=>p.academy?.seniorContract).reduce((n,p)=>n+p.salary,0);
 return Math.round(total);
}
function loanGroup(p){return p.pos==='MV'?'MV':p.pos==='B'?'B':'F';}
function loanLocked(){return Boolean(state.live&&!state.live.finished);}
function loanNotice(message){state.loans.message=message;save();render();}
function loanFit(p,club){
 const peers=(state.clubRosters[club]||[]).filter(q=>loanGroup(q)===loanGroup(p)&&medicalReady(q));
 const rank=1+peers.filter(q=>matchAttributeRating(q)>matchAttributeRating(p)).length;
 return {rank,interested:rank<=({MV:2,B:7,F:13})[loanGroup(p)],text:p.pos==='MV'?(rank===1?'Utmanar om förstaspaden':'Konkurrerar om starter'):rank<=({B:4,F:6})[loanGroup(p)]?'Konkurrerar om en större roll':'Rotation och konkurrens om istid'};
}
function loanCanLeave(p,club){
 if(!p||playerLoan(p)||p.futureContract||p.contractYears<1||!medicalReady(p))return false;
 if(club!==managerClub()&&positionFit(p,'C')>=.98&&(state.clubRosters[club]||[]).filter(q=>q!==p&&medicalReady(q)&&positionFit(q,'C')>=.98).length<4)return false;
 return (state.clubRosters[club]||[]).filter(q=>q!==p&&loanGroup(q)===loanGroup(p)&&medicalReady(q)).length>=({MV:2,B:6,F:12})[loanGroup(p)];
}
function loanOpen(id){ensureLoans();deskNavigate('transfers','loans');state.loans.selected=id;recruitHub.player=id;recruitHub.panel='loan';save();render();deskBrowserBefore();}
const LOAN_ROLES={starter:'Bärande roll',regular:'Regelbunden speltid',rotation:'Rotation'};
function loanReserved(club,exclude=null){return (state.loans?.offers||[]).filter(o=>o.id!==exclude?.id&&o.borrower===club&&['pending','counter'].includes(o.status)).reduce((n,o)=>n+(findPlayerAnywhere(o.playerId)?.salary||0)*(o.counter?.share??o.share),0);}
function loanTerms(p,owner,borrower,offer){
 const fit=loanFit(p,borrower),young=p.age<=23,group=loanGroup(p);
 if(!loanCanLeave(p,owner))return {reason:'Ägarklubben behöver spelaren eller spelarens avtal/skada hindrar ett lån.'};
 if(!fit.interested)return {reason:'Mottagarklubben ser inte tillräckligt med istid. Spelaren vill ha en tydligare väg in i laget.'};
 const role=fit.rank<=({MV:1,B:4,F:6})[group]?'starter':fit.rank<=({MV:2,B:6,F:10})[group]?'regular':'rotation';
 const social=p.social||{},ambitious=(social.ambition||10)>=14;
 if(young&&role==='rotation'||ambitious&&p.age>=25&&p.promisedRole==='Nyckelspelare'&&leagueOf(borrower)==='HA'&&role!=='starter')return {reason:'Spelaren avböjer: den sportsliga rollen väger inte upp flytten. Sök en klubb med bättre chans till ansvar.'};
 const limit=borrower===managerClub()?wageBudget():state.recruitment.ai[borrower]?.wageLimit||0;
 const recruitReserve=borrower===managerClub()?state.recruitment.deals.filter(d=>d.status==='pending'&&d.kind!=='future').reduce((n,d)=>n+d.salary,0):0;
 const room=limit-(borrower===managerClub()?annualWageCost():loanWageCost(borrower))-loanReserved(borrower,offer)-recruitReserve;
 if(state.clubRosters[borrower].length>=32||borrower!==managerClub()&&clubAIState(borrower)&&!aiRosterHasRoom(aiRosterWithReturns(borrower,[p]))||room<0)return {reason:'Mottagarklubbens trupp eller lönebudget är full.'};
 // The other club has a price, independent of the percentage typed into the form.
 const maxShare=Math.min(role==='starter'?.75:role==='regular'?.5:.25,Math.floor(room/Math.max(1,p.salary)*4)/4);
 const minShare=young?.5:.75;
 const share=owner===managerClub()?Math.min(offer.share,Math.max(0,maxShare)):Math.max(offer.share,minShare);
 if(p.salary*share>room)return {reason:'Klubbarna kan inte enas om lönen inom mottagarens budget.'};
 return {terms:{share,days:young&&offer.days===28?56:offer.days,role,recall:offer.recall==='anytime'&&owner===managerClub()?'day28':offer.recall},reason:owner===managerClub()?`Mottagaren erbjuder ${LOAN_ROLES[role].toLowerCase()} och högst ${maxShare*100} % av lönen. ${young?'En ung spelare behöver minst åtta veckor för att etablera sig.':''}`:`Ägarklubben begär minst ${minShare*100} % löneersättning. Spelaren vill ha en trovärdig roll: ${LOAN_ROLES[role].toLowerCase()}.`};
}
function loanSubmit(id,destination,days,share,role='regular',recall='day28'){
 ensureLoans();const p=findPlayerAnywhere(id),owner=getPlayerClub(id);days=Number(days);share=Number(share);
 if(!managerCanPlay()||loanLocked())return loanNotice('Hantera lån mellan matcher.');
 if(!calendarWindowOpen())return loanNotice('Transferfönstret är stängt för nya lån.');
 if(!p||!state.world.membership[owner]||!state.world.membership[destination]||owner===destination||(owner!==managerClub()&&destination!==managerClub())||![28,56,0].includes(days)||![0,.25,.5,.75,1].includes(share)||!LOAN_ROLES[role]||!['anytime','day28'].includes(recall))return;
 if(state.loans.offers.some(o=>samePlayerId(o.playerId,id)&&['pending','counter'].includes(o.status)))return loanNotice('En låneförhandling pågår redan för spelaren. Hantera svaret nedan.');
 if(!loanCanLeave(p,owner))return loanNotice('Spelaren är inte tillgänglig för lån eller behövs för att behålla tillräcklig täckning.');
 const offer={id:state.loans.nextOffer++,playerId:p.id,name:p.name,owner,borrower:destination,days,share,role,recall,date:state.calendar.date,due:calAdd(state.calendar.date,2),status:'pending'};
 if(destination===managerClub()&&annualWageCost()+p.salary*share+loanReserved(destination)+state.recruitment.deals.filter(d=>d.status==='pending'&&d.kind!=='future').reduce((n,d)=>n+d.salary,0)>wageBudget())return loanNotice('Det erbjudna lånet och dina andra bud överskrider lönebudgeten.');
 state.loans.offers.unshift(offer);state.loans.offers=state.loans.offers.filter((o,i)=>i<60||['pending','counter'].includes(o.status));state.loans.selected=null;state.page='transfers';state.recruitment.tab='deals';recruitHub.deal='loan:'+offer.id;recruitHub.affairs='open';
 loanNotice('Förslaget är skickat till klubben och spelaren. Besked om två kalenderdagar. Spelaren stannar i sin trupp under förhandlingen.');
}
function loanCompleteOffer(o){
 const p=findPlayerAnywhere(o.playerId);if(!p||getPlayerClub(p.id)!==o.owner)return false;
 const feedbackPlan=feedbackBeforeArrival(p,o.borrower);
 const t=o.counter||o,until=t.days?calAdd(state.calendar.date,t.days):`${state.season.year+1}-05-15`;
 const l={id:state.loans.nextId++,playerId:p.id,name:p.name,owner:o.owner,borrower:o.borrower,start:state.calendar.date,until,share:t.share,role:t.role,recall:t.recall,initial:false,termsEstimated:true,baseline:{games:p.games||0,goals:p.goals||0,assists:p.assists||0},seconds:0,games:0,starts:0,goals:0,assists:0,appearances:[]};
 if(o.owner===managerClub())state.scoutReports[String(p.id)]={visits:3,lastObserved:state.calendar.date};
 state.clubRosters[o.owner]=state.clubRosters[o.owner].filter(q=>!samePlayerId(q.id,p.id));state.clubRosters[o.borrower].push(p);p.club=o.borrower;p.loanId=l.id;p.transferListed=false;p.askingPrice=null;
 if(p.recruitmentPromise&&!p.recruitmentPromise.resolved){p.recruitmentPromise.resolved=true;p.recruitmentPromise.result='Utvecklingslån överenskommet';}
 state.loans.active.push(l);o.status='agreed';o.agreedDate=state.calendar.date;p.morale=trainingClamp((p.morale||70)+2);syncManagerRoster();repairMedicalLines();ensureSpecialTeams();
 feedbackArrival(p,feedbackPlan,'loan');
 feedbackNews('loan:'+l.id,o.borrower,'transfer',p.name+' går på lån',o.owner+' → '+o.borrower+' till '+calText(until)+'.');
 if([o.owner,o.borrower].includes(managerClub()))managerMessage(`loan:${l.id}`,`${p.name} går på lån`,`${o.owner} → ${o.borrower} till ${calText(until)}. Löneandel ${t.share*100} %. Roll: ${LOAN_ROLES[t.role]}. Återkallelse ${t.recall==='anytime'?'mellan matcher':'efter 28 dagar'}. Tränarteamet följer upp faktisk speltid.`,'Sportchef',{link:'transfers'});return true;
}
function loanResolveOffer(o,accept=false){
 const p=findPlayerAnywhere(o.playerId);
 if(!p||getPlayerClub(o.playerId)!==o.owner||!calendarWindowOpen()){o.status='rejected';o.reason='Spelaren är inte längre tillgänglig eller transferfönstret har stängt.';return;}
 const result=loanTerms(p,o.owner,o.borrower,{...o,...(o.counter||{})});
 // Exclude this offer's own reservation when rechecking the recipient's budget.
 if(!result.terms){o.status='rejected';o.reason=result.reason;}
 else {
  const current=o.counter||o,changed=['share','days','role','recall'].some(k=>current[k]!==result.terms[k]);
  if(changed||o.status==='counter'&&!accept){o.status='counter';o.counter=result.terms;o.expires=calAdd(state.calendar.date,7);o.reason=result.reason;}
  else{loanCompleteOffer(o);o.reason='Klubbarna och spelaren accepterade samma villkor.';}
 }
 managerMessage(`loan-offer:${o.id}:${o.status}:${state.calendar.date}`,`Lånebesked: ${o.name}`,`${o.status==='counter'?'Motbud – granska de nya villkoren i Lånecentralen. ':o.status==='rejected'?'Avslag. ':''}${o.reason}`,'Sportchef',{link:'transfers'});
}
function loanAnswer(id,accept){
 const o=state.loans?.offers.find(o=>o.id===id);if(!o||!['pending','counter'].includes(o.status)||loanLocked())return;
 if(!accept){o.status='cancelled';return loanNotice('Låneförhandlingen avslutad. Löneutrymmet är frigjort.');}
 if(o.status!=='counter'||o.expires<state.calendar.date)return;
 loanResolveOffer(o,true);loanNotice(o.status==='agreed'?`${o.name} är spelklar på de överenskomna villkoren.`:o.reason);
}
function loanOffersView(){return (state.loans.offers||[]).slice(0,20).map(o=>{const t=o.counter||o;return `<article class="loan-negotiation"><header><h3>${trainingSafe(o.name)}</h3><strong>${({pending:'Inväntar klubb & spelare',counter:'Motbud att ta ställning till',agreed:'Överens',rejected:'Avslag',expired:'Utgånget',cancelled:'Avslutat'})[o.status]}</strong></header><p>${trainingSafe(o.owner)} → ${trainingSafe(o.borrower)}</p>${o.counter?`<p>Ditt förslag: ${o.share*100} % lön · ${o.days?o.days+' dagar':'säsongen ut'} · ${LOAN_ROLES[o.role]}.</p>`:''}<div class="loan-terms"><b>${t.share*100} % lön</b><span>${t.days?t.days+' dagar':'Säsongen ut'}</span><span>${LOAN_ROLES[t.role]}</span><span>Återkallelse ${t.recall==='anytime'?'direkt':'efter 28 dagar'}</span></div><p>${trainingSafe(o.reason||'Svar '+calText(o.due))}</p>${o.status==='counter'?`<p>Gäller till ${calText(o.expires)}.</p><button class="btn" onclick="loanAnswer(${o.id},true)">Acceptera motbudet</button>`:''}${['pending','counter'].includes(o.status)?`<button class="btn secondary" onclick="loanAnswer(${o.id},false)">${o.status==='counter'?'Avböj':'Återkalla förslag'}</button>`:''}</article>`;}).join('');}
function loanReturn(l,reason){
 const p=(state.clubRosters[l.borrower]||[]).find(p=>samePlayerId(p.id,l.playerId));if(!p)return false;
 state.clubRosters[l.borrower]=state.clubRosters[l.borrower].filter(q=>!samePlayerId(q.id,p.id));delete p.loanId;p.club=l.owner;
 if(state.clubRosters[l.owner])state.clubRosters[l.owner].push(p);else state.loans.external.push(p);
 state.loans.active=state.loans.active.filter(q=>q.id!==l.id);state.loans.history.unshift({...l,returned:state.calendar.date,reason});state.loans.history=state.loans.history.slice(0,100);
 if([l.owner,l.borrower].includes(managerClub()))managerMessage(`loan-return:${l.id}`,`${p.name} återvänder till ${l.owner}`,`${reason}. Kontrakt, utveckling och skadehistorik följer med spelaren.`,'Sportchef',{link:'transfers'});
 syncManagerRoster();repairMedicalLines();return true;
}
function loanRecall(id){
 const l=state.loans?.active.find(l=>l.id===id);if(!l||![l.owner,l.borrower].includes(managerClub()))return;
 if(loanLocked())return loanNotice('Återkalla eller avsluta lån mellan matcher.');
 if(l.recall==='day28'&&calGap(l.start,state.calendar.date)<28)return loanNotice('Avtalet tillåter återkallelse först efter 28 dagar.');
 loanReturn(l,l.owner===managerClub()?'Ägarklubben återkallade lånet':'Mottagarklubben avslutade lånet');loanNotice(`${l.name} har återvänt till ${l.owner}.`);
}
function loansDay(){if(!state.loans||loanLocked())return;for(const o of state.loans.offers||[]){if(o.status==='pending'&&o.due<=state.calendar.date)loanResolveOffer(o);else if(o.status==='counter'&&(o.expires<state.calendar.date||!calendarWindowOpen())){o.status='expired';o.reason='Motbudets giltighetstid eller transferfönstret har löpt ut.';}}for(const l of [...state.loans.active])if(state.calendar.date>l.until)loanReturn(l,'Lånet löpte ut');}
function loansNewYear(){if(!state.loans)return;for(const o of state.loans.offers||[])if(['pending','counter'].includes(o.status))o.status='expired';for(const l of [...state.loans.active])loanReturn(l,'Säsongen är avslutad');}
function loansAfterFixture(game,rows){
 if(!state.loans)return;
 const key=`${state.season.year}:${game.stage||state.season.phase}:${game.round}:${game.home}:${game.away}:${game.date||''}`;
 for(const l of state.loans.active){if(![game.home,game.away].includes(l.borrower)||l.appearances.includes(key))continue;l.appearances.push(key);
  const row=rows.find(r=>r.club===l.borrower&&samePlayerId(r.playerId??r.id,l.playerId));loanReviewRole(l,row);if(!row||!row.seconds)continue;
  l.games++;l.seconds+=row.seconds;l.starts+=row.seconds>=1800?1:0;l.goals+=row.goals||0;l.assists+=row.assists||0;l.saves=(l.saves||0)+(row.saves||0);l.against=(l.against||0)+(row.against||0);
 }
}
function loanReviewRole(l,row){
 const p=findPlayerAnywhere(l.playerId);if(!l.role||!p||!medicalReady(p))return;
 l.reviewFixtures=(l.reviewFixtures||0)+1;l.reviewSeconds=(l.reviewSeconds||0)+(row?.seconds||0);
 if(l.reviewFixtures%6)return;
 const threshold=p.pos==='MV'?({starter:1800,regular:1200,rotation:300})[l.role]:({starter:840,regular:600,rotation:240})[l.role];
 const met=l.reviewSeconds/6>=threshold;l.roleReview=met?'Speltiden motsvarar rollen':'Mindre speltid än överenskommet';l.reviewSeconds=0;
 p.morale=trainingClamp((p.morale||70)+(met?2:-4));p.happiness=trainingClamp((p.happiness||70)+(met?1:-3));if(p.social)p.social.trust=trainingClamp(p.social.trust+(met?1:-2));
 if([l.owner,l.borrower].includes(managerClub()))managerMessage(`loan-role:${l.id}:${l.reviewFixtures}`,`Låneuppföljning: ${p.name}`,`${l.roleReview} under sex tillgängliga matcher. ${met?'Spelaren känner att planen håller.':'Spelaren tappar moral. Se över rollen eller diskutera en återgång när avtalet tillåter det.'}`,'Sportchef',{link:'transfers'});
}
function loanProduction(l){const p=findPlayerAnywhere(l.playerId);return p?.pos==='MV'?`${(l.saves||0)+(l.against||0)?((l.saves||0)/((l.saves||0)+(l.against||0))*100).toFixed(1)+' % räddningar':'Inga registrerade skott'} · ${l.seconds?((l.against||0)*3600/l.seconds).toFixed(2):'–'} GAA`:`${l.goals}+${l.assists} poäng`;}
function loanPlayerPanel(p){
 const l=playerLoan(p);if(l)return `<section class="depth-panel"><h2>På lån från ${trainingSafe(l.owner)}</h2><p>Till ${calText(l.until)} · ${l.borrower} betalar ${l.share*100} % av lönen. Ägarklubbens kontrakt behålls. ${l.initial?'Lönefördelningen är ett spelantagande.':''} ${l.initial&&l.termsEstimated?'Exakt slutdatum saknas i underlaget; säsongslån används.':''}</p><button class="btn secondary" onclick="deskNavigate('transfers','loans')">Följ lånet</button></section>`;
 if(state.world?.membership[getPlayerClub(p.id)])return `<section class="depth-panel"><h2>Istid genom lån</h2><p>Jämför konkurrensen hos andra klubbar. Ett lån ger möjlighet till matcher samtidigt som kontraktet stannar hos ägarklubben.</p><button class="btn secondary" onclick="loanOpen('${p.id}')">${isOwnPlayer(p)?'Hitta en låneklubb':'Undersök ett lån'}</button></section>`;
 return '';
}
function loansView(){
 ensureLoans();ensureLines();const s=state.loans,p=findPlayerAnywhere(s.selected),owner=p?getPlayerClub(p.id):null,own=owner===managerClub();
 const active=s.active.filter(l=>[l.owner,l.borrower].includes(managerClub()));
 const candidates=managerRoster().filter(p=>!playerLoan(p));
 const external=Object.entries(state.clubRosters).filter(([club])=>club!==managerClub()&&state.world.membership[club]).flatMap(([club,ps])=>ps.filter(p=>loanCanLeave(p,club)&&loanFit(p,managerClub()).interested).map(p=>({p,club}))).slice(0,24);
 const destinations=p?(own?Object.keys(state.world.membership).filter(c=>c!==owner&&loanFit(p,c).interested).sort((a,b)=>Number(leagueOf(b)==='HA')-Number(leagueOf(a)==='HA')):[managerClub()]):[];
 return `<section class="depth-loans">${deskHistory.length?'<button class="btn secondary" onclick="deskBack(\'transfers\')">← Tillbaka till föregående vy</button>':''}<header><span class="career-eyebrow">UTVECKLING & TRUPPBREDD</span><h2>Lånecentralen</h2><p>Riktiga klubbmatcher, verklig konkurrens om istiden. Klubb, spelare och tränare ska enas om lön, roll och längd. Besked efter två dagar; ett motbud kräver ditt svar.</p></header>${s.message?`<p role="status" class="recruit-notice">${trainingSafe(s.message)}</p>`:''}
 ${p?`<section class="depth-panel"><h3>${trainingSafe(p.name)} · ${trainingSafe(owner)}</h3>${playerLoan(p)?loanPlayerPanel(p):`<p>${p.pos} · ${p.age} år · kontrakt ${p.contractYears} år. Lön ${careerMoney(p.salary)}/år. Avtalet och spelarutvecklingen följer spelaren hem.</p><form class="depth-loan-form" onsubmit="event.preventDefault();loanSubmit('${p.id}',this.elements.destination.value,this.elements.days.value,this.elements.share.value,this.elements.role.value,this.elements.recall.value)"><label>Mottagarklubb<select name="destination">${destinations.map(c=>`<option value="${trainingSafe(c)}">${trainingSafe(c)} · ${leagueOf(c)} · ${loanFit(p,c).text}</option>`).join('')}</select></label><label>Längd<select name="days"><option value="28">Fyra veckor</option><option value="56">Åtta veckor</option><option value="0">Säsongen ut</option></select></label><label>Mottagarens löneandel<select name="share">${[0,.25,.5,.75,1].map(n=>`<option value="${n}" ${n===.5?'selected':''}>${n*100} % · ${careerMoney(p.salary*n)}/år</option>`).join('')}</select></label><label>Planerad roll<select name="role">${Object.entries(LOAN_ROLES).map(([k,v])=>`<option value="${k}" ${k==='regular'?'selected':''}>${v}</option>`).join('')}</select></label><label>Återkallelse<select name="recall"><option value="day28">Tidigast efter 28 dagar</option><option value="anytime">När som helst mellan matcher</option></select></label><button class="btn" ${!destinations.length||!loanCanLeave(p,owner)||loanLocked()?'disabled':''}>Skicka låneförslag</button></form><p>${loanCanLeave(p,owner)?'Rollen är en avsikt som följs upp mot faktisk istid. Klubben kan föreslå andra villkor eller tacka nej.':'Ägarklubben behöver spelaren, eller spelaren är skadad / har ett kommande avtal.'}</p>`}</section>`:''}
 <h3>Förhandlingar</h3>${loanOffersView()||'<p>Inga låneförslag ännu.</p>'}<div class="depth-metrics"><article><strong>${active.filter(l=>l.owner===managerClub()).length}</strong><span>Utlånade</span></article><article><strong>${active.filter(l=>l.borrower===managerClub()).length}</strong><span>Inlånade</span></article></div>
 ${active.map(l=>`<article class="depth-panel"><h3>${trainingSafe(l.name)}</h3><p>${trainingSafe(l.owner)} → ${trainingSafe(l.borrower)} · åter ${calText(calAdd(l.until,1))}</p><p>${l.games} serie-/slutspelsmatcher · ${Math.round(l.seconds/60)} min · ${loanProduction(l)}${l.role?' · '+LOAN_ROLES[l.role]:''}${l.roleReview?' · '+l.roleReview:''} · mottagaren betalar ${l.share*100} %</p><p>${l.initial?'Registrerat lån i startdatabasen. Lönefördelningen är ett spelantagande.':''}${l.initial&&l.termsEstimated?' Exakt lånetid saknas; återgång efter säsongen används.':''}</p><button class="btn secondary" onclick="recruitOpen('${l.playerId}')">Spelarprofil</button> <button class="btn secondary" onclick="loanRecall(${l.id})" ${loanLocked()?'disabled':''}>${l.owner===managerClub()?'Återkalla':'Avsluta lånet'}</button></article>`).join('')||'<p>Inga aktiva lån för din klubb.</p>'}
 <details class="depth-panel"><summary>Låna ut ur din trupp</summary><div class="depth-player-list">${candidates.map(p=>`<button onclick="loanOpen('${p.id}')"><strong>${trainingSafe(p.name)}</strong><span>${p.pos} · ${lineupPlayerPlace(p)} · ${loanCanLeave(p,managerClub())?'Tillgänglig för diskussion':'Behövs / ej tillgänglig'}</span></button>`).join('')}</div></details>
 <details class="depth-panel"><summary>Spelare som kan vara tillgängliga att låna in</summary><p>Sportchefens första urval. Fler spelare kan undersökas genom spelarsökningen.</p><div class="depth-player-list">${external.map(({p,club})=>`<button onclick="loanOpen('${p.id}')"><strong>${trainingSafe(p.name)}</strong><span>${p.pos} · ${trainingSafe(club)}</span></button>`).join('')||'<p>Inga aktuella förslag.</p>'}</div></details>
 <details class="depth-panel"><summary>Avslutade lån</summary>${s.history.filter(l=>[l.owner,l.borrower].includes(managerClub())).map(l=>`<p><strong>${trainingSafe(l.name)}</strong> · ${trainingSafe(l.reason)} · ${l.games} matcher, ${Math.round(l.seconds/60)} minuter</p>`).join('')||'<p>Inga avslutade lån.</p>'}</details></section>`;
}

// Up to 20 skaters and two goalkeepers. Selection locks at the first start.
function depthEligible(p){return !p||!state.live?.matchSquad||state.live.finished||!isOwnPlayer(p)||state.live.matchSquad.includes(String(p.id));}
function depthSelection(){
 ensureLines();if(!state.matchSelection||state.matchSelection.club!==managerClub())state.matchSelection={club:managerClub(),extras:[],backup:null};
 const s=state.matchSelection,used=new Set([...state.lines.forwards,...state.lines.defense,state.lines.goalie].map(String));
 const extras=managerRoster().filter(p=>p.pos!=='MV'&&!used.has(String(p.id))&&medicalAvailable(p));
 s.extras=s.extras.filter(id=>extras.some(p=>samePlayerId(p.id,id))).slice(0,2);
 for(const p of extras)if(s.extras.length<2&&!s.extras.some(id=>samePlayerId(id,p.id)))s.extras.push(p.id);
 const goalies=managerRoster().filter(p=>p.pos==='MV'&&!used.has(String(p.id))&&medicalAvailable(p));
 if(!goalies.some(p=>samePlayerId(p.id,s.backup)))s.backup=goalies[0]?.id??null;
 return s;
}
function depthSet(kind,index,id){
 if(state.live?.matchSquad&&!state.live.finished)return;
 const s=depthSelection(),p=playerById(id);if(!p||!medicalReady(p))return;
 if(kind==='backup'&&p.pos==='MV'&&!samePlayerId(id,state.lines.goalie))s.backup=p.id;
 else if(kind==='extra'&&[0,1].includes(index)&&p.pos!=='MV'&&![...state.lines.forwards,...state.lines.defense].some(v=>samePlayerId(v,id))){const other=s.extras.findIndex(v=>samePlayerId(v,id));if(other>=0)[s.extras[index],s.extras[other]]=[s.extras[other],s.extras[index]];else s.extras[index]=p.id;}
 save();render();
}
function depthLock(){
 if(!state.live||state.live.finished||state.live.matchSquad)return;
 const s=depthSelection(),elapsed=(state.live.period-1)*1200+(state.live.minute||0)*60+(state.live.second||0);
 // A match already under way in an older save keeps its historical eligibility.
 state.live.legacySquad=elapsed>0;
 const ids=elapsed>0?managerRoster().map(p=>p.id):[...state.lines.forwards,...state.lines.defense,...s.extras,state.lines.goalie,s.backup];
 state.live.matchSquad=[...new Set(ids.filter(id=>id!=null).map(String))];ensureSpecialTeams();
}
function depthBenchView(){
 const s=depthSelection(),locked=Boolean(state.live?.matchSquad&&!state.live.finished),main=new Set([...state.lines.forwards,...state.lines.defense,state.lines.goalie].map(String));
 const pool=managerRoster().filter(p=>!main.has(String(p.id))&&medicalReady(p));
 const bench=locked?pool.filter(p=>state.live.matchSquad.includes(String(p.id))):[...s.extras,s.backup].map(playerById).filter(Boolean);
 const scratched=managerRoster().filter(p=>medicalReady(p)&&!main.has(String(p.id))&&!bench.includes(p));
 return `<section class="depth-panel"><header><span class="career-eyebrow">MATCHTRUPPEN</span><h2>Bänk & konkurrens</h2><p>Fyra kedjor, tre backpar, två extra utespelare och två målvakter. Uttagningen låses vid första nedsläpp.</p></header>${locked?`<p>${state.live?.legacySquad?'Påbörjad match från äldre sparning: tidigare spelarbehörighet behålls till slutsignalen.':'Matchtruppen är låst.'} Använd rinken eller coachpanelen för att sätta in en uttagen reserv.</p><div class="depth-chips">${bench.map(p=>`<span>${trainingSafe(p.name)} · ${p.pos}</span>`).join('')||'<span>Ingen spelklar reserv</span>'}</div>`:`<div class="depth-loan-form">${[0,1].map(i=>`<label>Extra utespelare ${i+1}<select onchange="depthSet('extra',${i},this.value)">${lineOptions(pool.filter(p=>p.pos!=='MV'),s.extras[i]??null)}</select></label>`).join('')}<label>Reservmålvakt<select onchange="depthSet('backup',0,this.value)">${lineOptions(pool.filter(p=>p.pos==='MV'),s.backup)}</select></label></div>`}<h3>Står utanför matchtruppen · ${scratched.length}</h3><div class="depth-chips">${scratched.map(p=>`<button onclick="selectPlayer('${p.id}')">${trainingSafe(p.name)} · ${p.pos}</button>`).join('')||'<span>Alla spelklara spelare har en plats.</span>'}</div><p>Skadade: ${managerRoster().filter(p=>!medicalReady(p)).map(p=>trainingSafe(p.name)).join(', ')||'Ingen'}. Istid och dagsform följs på spelarprofilen.</p><button class="btn secondary" onclick="deskNavigate('transfers','loans')">Planera lån & istid</button></section>`;
}
function rosterDatabaseNotice(){return state.playerDatabaseVersion===ALLSVENSKAN_DATABASE.version?'':`<aside class="depth-panel"><strong>Ny spelargrund · 680 verkliga spelare</strong><p>Din karriär behåller sina trupper, värvningar och utveckling. Starta en ny karriär för de granskade trupperna 2026/27. Nuvarande karriär sparas som föregående karriär när den nya startas.</p><button class="btn secondary" onclick="beginCareerSelection()">Granska en ny karriär</button></aside>`;}
