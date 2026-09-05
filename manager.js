"use strict";
// The manager travels between clubs; club resources stay with their employer.
const MANAGER_IDENTITIES={balanced:'Lagbyggare',youth:'Talangutvecklare',results:'Resultattränare'};
const MANAGER_CLUB_FIELDS=['staff','clubOffice','juniors','locker','training','medical','scoutReports','lines','specialTeams','tactic','tacticalPlan','fans','morale'];
function ensureManager(){
 if(!state.careerStarted)return;
 if(!state.managerCareer)state.managerCareer={version:1,name:'Huvudtränaren',identity:'balanced',reputation:25,confidence:60,expires:clubYear()+2,salary:600000,status:'employed',badSeasons:0,reviews:[],history:[],jobs:[],interview:null,week:0,lastWeek:0,moveYear:null,bank:{},lastReview:null,seasonReviews:[],joined:clubYear(),startGames:team(managerClub())?.gp||0,message:'',renewal:null,decision:null};
}
function managerEmployed(){return !state.managerCareer||state.managerCareer.status==='employed';}
function managerSalary(){return managerEmployed()?(state.managerCareer?.salary||0):0;}
function managerLabel(){const r=state.managerCareer.reputation;return r>=75?'Etablerat toppnamn':r>=55?'Eftertraktad tränare':r>=35?'Respekterad lagbyggare':'På väg att etablera dig';}
function managerNotify(text){state.managerCareer.message=text;save();render();}
function managerProfile(name,identity){
 ensureManager();if(!Object.hasOwn(MANAGER_IDENTITIES,identity))return;
 state.managerCareer.name=String(name).trim().slice(0,40)||'Huvudtränaren';state.managerCareer.identity=identity;managerNotify('Din tränarprofil är sparad. Identiteten påverkar hur klubbar bedömer din intervju, inte spelarnas attribut.');
}
function managerEvaluation(final=false){
 const goals=final?(state.season.boardResult||boardProgress()):boardProgress();
 const league=goals.find(g=>g.id==='league'),youth=goals.find(g=>g.id==='youth'),finance=goals.find(g=>g.id==='finance');
 const progress=g=>Math.min(1,Math.max(0,g?.progress??(g?.met?1:0)));
 // Youth objectives are season-long. Judge progress against elapsed fixtures at check-ins.
 const elapsed=Math.max(.15,(team(managerClub())?.gp||0)/52);
 const youthScore=youth?Math.min(1,progress(youth)/(final?1:elapsed)):1;
 const result=final?(league?.met?1:progress(league)*.5):progress(league);
 const cash=finance?.met?1:progress(finance)*.65;
 const score=Math.round(100*(.5*result+.2*youthScore+.3*cash));
 return {score,goals,explanation:goals.map(g=>`${g.title}: ${g.status}. ${g.detail}.`).join('\n')};
}
function managerCheckIn(){
 ensureManager();const c=state.managerCareer;if(!managerEmployed()||state.season.phase!=='regular')return;
 const played=team(managerClub())?.gp||0,key=`${clubYear()}:${managerClub()}:${played}`;
 if(played-c.startGames<8||(played-c.startGames)%8!==0||c.lastReview===key)return;c.lastReview=key;
 const e=managerEvaluation();c.confidence=Math.round(c.confidence*.45+e.score*.55);
 const warning=c.confidence<40;
 const title=warning?'Styrelsen kräver förbättring':c.confidence>=75?'Styrelsen uppskattar ditt arbete':'Avstämning med styrelsen';
 c.reviews.unshift({key,year:clubYear(),club:managerClub(),confidence:c.confidence,title,text:e.explanation});c.reviews=c.reviews.slice(0,24);
 managerMessage(`manager:${key}`,title,`${e.explanation}\nFörtroende: ${c.confidence}/100. ${warning?'Två svaga säsongsutvärderingar i följd kan leda till att avtalet avslutas.':'Enskilda förluster avgör inte ditt jobb.'}`,'Din anställning',{link:'manager'});
}
function managerSeasonReview(){
 ensureManager();const c=state.managerCareer,key=`${clubYear()}:${managerClub()}`;
 if(!managerEmployed()||c.seasonReviews.includes(key))return;c.seasonReviews.push(key);c.seasonReviews=c.seasonReviews.slice(-30);
 const e=managerEvaluation(true),champion=state.season.champion===managerClub();
 c.confidence=Math.min(100,e.score+(champion?15:0));c.badSeasons=c.confidence<45?c.badSeasons+1:0;
 const change=Math.round((e.score-50)/7)+(champion?10:0);c.reputation=trainingClamp(c.reputation+change,5,100);
 c.history.unshift({year:clubYear(),club:managerClub(),position:seasonRank(managerClub()),champion,score:c.confidence,reputation:c.reputation,goals:e.goals.filter(g=>g.met).length,total:e.goals.length,kind:'season'});c.history=c.history.slice(0,60);
 c.decision=c.badSeasons>=2?'dismissed':c.expires<=clubYear()+1&&c.confidence<45?'expired':null;
 c.renewal=!c.decision&&c.expires<=clubYear()+1?{expires:clubYear()+3,salary:Math.round(c.salary*(c.confidence>=75?1.12:1.04)/10000)*10000}:null;
 const title=c.decision==='dismissed'?'Styrelsen avslutar ditt uppdrag':c.decision==='expired'?'Ditt tränaravtal förlängs inte':c.renewal?'Styrelsen erbjuder förlängning':'Ditt uppdrag fortsätter';
 const text=`${e.explanation}\nFörtroende ${c.confidence}/100. Rykte ${c.reputation}/100. ${c.decision?'Du lämnar när försäsongen börjar. Jobbmarknaden öppnar då.':c.renewal?'Granska det nya avtalet under Min karriär före nästa säsong.':'Avtalet fortsätter enligt plan.'}`;
 c.reviews.unshift({key,year:clubYear(),club:managerClub(),confidence:c.confidence,title,text});c.reviews=c.reviews.slice(0,24);
 managerMessage(`manager-final:${key}`,title,text,'Din anställning',{link:'manager'});
}
function managerRenew(){
 const c=state.managerCareer;if(!managerEmployed()||!c.renewal||!['review','preseason'].includes(state.season.phase)||c.decision)return;
 c.expires=c.renewal.expires;c.salary=c.renewal.salary;c.renewal=null;managerNotify('Ditt nya tränaravtal är undertecknat. Lönen ingår i klubbens kommande löneutbetalningar.');
}
function managerPreseason(){
 ensureManager();const c=state.managerCareer;c.week=0;c.jobs=[];c.interview=null;
 if(c.decision||c.expires<=clubYear()){
  if(c.renewal&&!c.decision){c.status='awaiting';c.message='Ditt tidigare avtal har löpt ut. Acceptera förlängningen eller sök ett nytt jobb.';}
  else{c.status='unemployed';c.message=c.decision==='dismissed'?'Efter två svaga säsonger har styrelsen avslutat ditt uppdrag.':'Ditt avtal har löpt ut. Du kan nu söka en ny klubb.';}
  c.history.unshift({year:clubYear(),club:managerClub(),kind:'departure',reason:c.message});c.history=c.history.slice(0,60);
 }
 managerCreateJobs();
}
function managerCreateJobs(){
 const c=state.managerCareer;if(state.season.phase!=='preseason')return;
 const clubs=Object.keys(CLUB_DATA).filter(name=>name!==managerClub());
 const ranked=clubs.map(name=>({name,rank:state.season.standings?.findIndex(t=>t.name===name)+1||14}));
 ranked.sort((a,b)=>(b.rank-careerIdentity(b.name).place)-(a.rank-careerIdentity(a.name).place));
 const chosen=[...ranked.slice(0,3),ranked[(3+c.week)%ranked.length]];
 for(const {name,rank} of chosen){
  if(c.jobs.some(j=>j.club===name))continue;
  const group=careerIdentity(name).group,min=group==='title'?50:group==='playoff'?25:5;
  c.jobs.push({id:`${clubYear()}:${name}`,club:name,min,rank,status:'open',reason:rank>careerIdentity(name).place?'Styrelsen söker en ny riktning efter en svag grundserie.':'Klubben söker en tränare inför nästa säsong.'});
 }
}
function managerJobWeek(){
 if(state.season.phase!=='preseason')return;
 const c=state.managerCareer;if(c.moveYear===clubYear())return managerNotify('Du har redan tillträtt ett nytt jobb denna försäsong.');
 c.week++;managerCreateJobs();managerNotify(`Jobbvecka ${c.week}: lediga uppdrag har uppdaterats. Spelarnas ålder och ligasäsongen ändras inte av jobbsökandet.`);
}
function managerJobOffer(name){
 const offer=careerOffer(name,state.clubRosters),bank=state.managerCareer.bank[name],budget=state.recruitment.ai[name];
 offer.cash=budget?.cash??bank?.money??offer.cash;
 offer.wageLimit=budget?.wageLimit??bank?.wageLimit??offer.wageLimit;
 offer.cashFloor=Math.max(0,Math.min(offer.cashFloor,offer.cash));
 return offer;
}
function managerInterview(id){
 const c=state.managerCareer,j=c.jobs.find(j=>j.id===id);
 if(state.season.phase!=='preseason'||!j||j.status!=='open'||c.moveYear===clubYear())return;
 c.interview={id,stage:'questions',answer:c.identity};state.page='manager';save();render();managerShowInterview();
}
function managerInterviewAnswer(answer){
 const c=state.managerCareer,i=c.interview,j=c.jobs.find(j=>j.id===i?.id);
 if(!j||i.stage!=='questions'||!Object.hasOwn(MANAGER_IDENTITIES,answer)||state.season.phase!=='preseason')return;
 const offer=managerJobOffer(j.club),fit=(answer==='youth'&&offer.youth>=2)||(answer==='results'&&offer.group==='title')||(answer==='balanced'&&offer.economy);
 const score=c.reputation+(fit?10:0)+(answer===c.identity?5:0);
 i.answer=answer;
 if(score<j.min){j.status='rejected';i.stage='rejected';i.message=`Klubben efterfrågar mer erfarenhet. Ditt rykte är ${c.reputation}/100. Stärk dina meriter eller sök ett uppdrag med lägre krav.`;}
 else{i.stage='offer';i.offer=offer;i.salary=360000+(offer.group==='title'?360000:offer.group==='playoff'?180000:0)+Math.round(c.reputation*3000/10000)*10000;i.expires=clubYear()+2;}
 save();render();managerShowInterview();
}
function managerShowInterview(){document.querySelector('.manager-interview')?.scrollIntoView?.({behavior:'smooth',block:'start'});}
function managerStoreClub(){
 for(const p of state.training?.promises||[])if(!p.resolved){p.resolved=true;p.result='Tränaren lämnade klubben';}
 for(const p of managerRoster())if(p.recruitmentPromise&&!p.recruitmentPromise.resolved){p.recruitmentPromise.resolved=true;p.recruitmentPromise.result='Tränaren lämnade klubben';}
 const c=state.managerCareer,snapshot={year:clubYear(),money:state.money,wageLimit:wageBudget()};
 for(const field of MANAGER_CLUB_FIELDS)snapshot[field]=state[field]??null;
 snapshot.recruitment={missions:state.recruitment.missions.map(m=>m.status==='active'?{...m,status:'cancelled'}:m),shortlist:[...state.recruitment.shortlist]};
 snapshot.freeAgents=state.season.freeAgents;
 c.bank[managerClub()]=snapshot;
 state.recruitment.ai[managerClub()]={cash:state.money,wageLimit:wageBudget(),year:clubYear()};
 // Outgoing expiring player contracts become AI-managed after the departure.
 for(const p of managerRoster())if(p.contractYears<=0)p.contractYears=2;
}
function managerAcceptJob(){
 ensureManager();const c=state.managerCareer,i=c.interview,j=c.jobs.find(j=>j.id===i?.id);
 if(state.season.phase!=='preseason'||i?.stage!=='offer'||!j||j.status!=='open'||c.moveYear===clubYear()||clubLocked())return;
 if(state.recruitment.deals.some(d=>d.status==='pending'))return managerNotify('Invänta eller återkalla pågående spelarbud innan du byter klubb.');
 const offer=managerJobOffer(j.club);
 // Re-present changed budgets rather than silently accepting different terms.
 if(offer.cash!==i.offer.cash||offer.wageLimit!==i.offer.wageLimit){i.offer=offer;return managerNotify('Klubbens resurser har ändrats. Granska det uppdaterade erbjudandet och acceptera igen.');}
 const old=managerClub();managerStoreClub();
 const saved=c.bank[j.club];delete c.bank[j.club];
 state.managerClub=j.club;state.money=offer.cash;
 for(const field of MANAGER_CLUB_FIELDS)state[field]=saved?.[field]??null;
 state.fans=saved?.fans??CLUB_DATA[j.club].fans;state.morale=saved?.morale??65;
 state.tactic=saved?.tactic||'balanced';state.tacticalPlan=saved?.tacticalPlan||{forecheck:'balanced',tempo:'normal',physicality:'balanced',lineUsage:'balanced'};
 state.live=null;state.lines=null;state.specialTeams=null;state.selectedPlayer=null;state.selectedMarketPlayer=null;state.assessorId='assistant';
 state.boardPlan=null;state.season.nextWageLimit=offer.wageLimit;state.season.grant=0;state.season.freeAgents=saved?.freeAgents||[];state.season.departures=[];delete state.season.boardResult;
 delete state.recruitment.ai[j.club];
 // Assignments and reports belong to the former employer; market history stays global.
 state.recruitment.missions=saved?.recruitment?.missions||[];state.recruitment.shortlist=saved?.recruitment?.shortlist||[];state.recruitment.incoming=[];state.recruitment.message='';state.recruitment.tab='search';
 state.contractNegotiation=null;state.transferNegotiation=null;state.transferOffers=[];
 if(state.training){state.training.promises=[];state.training.messages=[];state.training.selectedMessage=null;}
 if(saved?.juniors&&saved.year<clubYear()){
  for(const p of state.juniors.roster){p.age+=clubYear()-saved.year;p.academy.loan=null;p.academy.path='junior';if(p.academy.seniorContract){p.contractYears=Math.max(0,p.contractYears-(clubYear()-saved.year));if(!p.contractYears)p.academy.seniorContract=false;}}
  state.juniors.year=clubYear();
 }
 if(saved?.staff)state.staff=state.staff.map(s=>s.salary&&s.expires<=clubYear()?clubInterim(s.id):s);
 if(state.clubOffice){state.clubOffice.opening=state.money;state.clubOffice.totals={};state.clubOffice.year=clubYear();state.clubOffice.offer=null;state.clubOffice.settled=[];state.clubOffice.market=[];state.clubOffice.taken=[];}
 syncManagerRoster();ensureManagementData();initializeBoardPlan(offer);ensureAssessmentData();ensureLocker();ensureMedical();ensureTrainingData();ensureJuniors();ensureClub();
 c.status='employed';c.expires=i.expires;c.salary=i.salary;c.confidence=60;c.badSeasons=0;c.decision=null;c.renewal=null;c.joined=clubYear();c.startGames=0;c.lastReview=null;c.moveYear=clubYear();
 c.history.unshift({year:clubYear(),kind:'appointment',club:j.club,from:old,expires:c.expires});c.history=c.history.slice(0,60);j.status='filled';c.interview=null;
 state.news=[`Du har tillträtt som huvudtränare för ${managerClub()}.`,...state.news.slice(0,30)];
 managerNotify(`Välkommen till ${managerClub()}. Världens trupper, attribut, övergångshistorik och dina tidigare säsonger finns kvar.`);
}
function managerAcceptRenewal(){if(!['review','preseason'].includes(state.season.phase))return;const c=state.managerCareer;if(c.status==='awaiting'&&c.renewal&&!c.decision)c.status='employed';managerRenew();}
function managerCanPlay(){ensureManager();if(managerEmployed())return true;state.page='manager';save();render();return false;}
function managerView(){
 ensureManager();const c=state.managerCareer,employed=managerEmployed(),pre=state.season.phase==='preseason';
 return `<section class="manager-page"><header class="daily-heading"><div><span class="career-eyebrow">MIN KARRIÄR · ${seasonLabel()}</span><h1>${trainingSafe(c.name)}</h1><p>${employed?`Huvudtränare · ${managerClub()}`:c.status==='awaiting'?'Avtalsbeslut väntar':'Tillgänglig för nytt uppdrag'}</p></div><span class="career-tag">${managerLabel()}</span></header><div class="manager-summary"><article><span>Rykte</span><strong>${c.reputation}<small>/100</small></strong><p>Resultat, utveckling och ansvar över flera säsonger.</p></article><article><span>${employed?'Styrelsens förtroende':'Senaste förtroendet'}</span><strong>${c.confidence}<small>/100</small></strong><progress max="100" value="${c.confidence}" aria-label="Styrelseförtroende"></progress></article><article><span>Tränaravtal</span><strong>${employed?'Till '+c.expires:'Inget aktivt'}</strong><p>${employed?`${money(c.salary)}/år · betalas av klubben`:'Sök jobb eller granska en eventuell förlängning.'}</p></article></div><p class="manager-notice" role="status">${trainingSafe(c.message)}</p>${c.renewal?`<section class="manager-interview"><h2>Erbjudande från ${managerClub()}</h2><p>Förlängning till sommaren ${c.renewal.expires}. Årslön ${money(c.renewal.salary)}.</p><button class="btn" onclick="managerAcceptRenewal()">Acceptera förlängningen</button></section>`:''}<div class="manager-columns"><section class="club-panel"><h2>Din tränarprofil</h2><form onsubmit="event.preventDefault();managerProfile(this.elements.managerName.value,this.elements.identity.value)"><label>Namn<input name="managerName" maxlength="40" value="${trainingSafe(c.name)}"></label><label>Tränaridentitet<select name="identity">${Object.entries(MANAGER_IDENTITIES).map(([v,n])=>`<option value="${v}" ${c.identity===v?'selected':''}>${n}</option>`).join('')}</select></label><button class="btn secondary">Spara profil</button></form><p>Identiteten används i intervjuer. Ditt rykte tjänar du genom säsongernas resultat – namn eller profilval ger inga extra meriter.</p></section><section class="club-panel"><h2>Så bedöms ditt arbete</h2><p>Resultatmål väger 50 %, talangutveckling 20 % och ekonomi 30 %. Under säsongen bedöms talanger mot hur långt säsongen har gått.</p><p>Avstämning sker var åttonde grundseriematch. Två säsonger i följd med förtroende under 45 kan avsluta uppdraget. Ett svagt slutår kan också innebära utebliven förlängning. Beslut får effekt vid försäsongen.</p>${c.decision?'<p class="manager-warning">Styrelsen har beslutat att du lämnar vid försäsongen.</p>':''}</section></div>${managerInterviewView()}<section class="club-panel"><div class="daily-heading"><div><span class="career-eyebrow">NÄSTA KAPITEL</span><h2>Lediga tränarjobb</h2></div>${pre?'<button class="btn secondary" onclick="managerJobWeek()">Nästa jobbvecka</button>':''}</div><p>${pre?'Intervjua klubben och granska trupp, resurser och förväntningar före beslutet. Ett klubbyte per försäsong.':'Jobbmarknaden öppnar vid försäsongen. Du avslutar säsongen i din nuvarande klubb.'}</p>${pre?`<div class="manager-jobs">${c.jobs.map(j=>`<article><header>${careerBadge(j.club)}<h3>${j.club}</h3></header><p>${j.reason}</p><p>Senaste placering: ${j.rank}. Riktmärke för rykte: ${j.min}/100; en passande intervju kan väga upp.</p><button class="btn secondary" onclick="managerInterview('${j.id}')" ${j.status!=='open'||c.moveYear===clubYear()?'disabled':''}>${j.status==='rejected'?'Avslag':j.status==='filled'?'Tillsatt':'Möt styrelsen'}</button></article>`).join('')}</div>`:''}</section><section class="club-panel"><h2>Styrelsens besked</h2>${c.reviews.map(r=>`<details><summary>${seasonLabel(r.year)} · ${r.club} · ${r.title}</summary><p>${trainingSafe(r.text).replace(/\n/g,'<br>')}</p></details>`).join('')||'<p>Första avstämningen kommer efter åtta nya grundseriematcher.</p>'}</section><section class="club-panel"><h2>Din karriärväg</h2>${c.history.map(h=>`<div class="manager-history"><span>${seasonLabel(h.year)}</span><div><strong>${h.club}</strong><p>${h.kind==='season'?`Plats ${h.position} · ${h.goals}/${h.total} mål uppnådda${h.champion?' · Mästare':''}`:h.kind==='appointment'?`Tillträdde från ${h.from}. Avtal till ${h.expires}.`:trainingSafe(h.reason)}</p></div></div>`).join('')||'<p>Din historia börjar här. Tidigare säsongsarkiv finns kvar under Säsong.</p>'}</section></section>`;
}
function managerInterviewView(){
 const c=state.managerCareer,i=c.interview,j=c.jobs.find(j=>j.id===i?.id);if(!j)return '';
 const offer=i.offer||managerJobOffer(j.club),roster=state.clubRosters[j.club],young=roster.filter(p=>p.age<=23).length,wages=roster.reduce((n,p)=>n+p.salary,0);
 return `<section class="manager-interview"><span class="career-eyebrow">ANSTÄLLNINGSINTERVJU</span><h2>Styrelserummet · ${j.club}</h2><p>”${offer.pitch}”</p><div class="manager-offer-grid"><div><span>Kassa</span><strong>${money(offer.cash)}</strong></div><div><span>Årslöner / budget</span><strong>${careerMoney(wages)} / ${careerMoney(offer.wageLimit)}</strong></div><div><span>Trupp</span><strong>${roster.length} spelare · ${young} högst 23 år</strong></div></div><details><summary>Granska den aktuella truppen</summary>${roster.map(p=>`<div class="row"><span>${trainingSafe(p.name)} · ${p.pos}</span><span>${p.age} år · ${money(p.salary)}/år</span></div>`).join('')}</details>${boardGoalsHTML(careerGoalDefinitions(offer))}${i.stage==='questions'?`<h3>Hur vill du leda klubben?</h3><div class="club-actions">${Object.entries(MANAGER_IDENTITIES).map(([v,n])=>`<button class="btn secondary" onclick="managerInterviewAnswer('${v}')">${n}</button>`).join('')}</div>`:i.stage==='offer'?`<h3>Vi vill erbjuda dig jobbet</h3><p>Avtal till sommaren ${i.expires}. Årslön ${money(i.salary)}. Pengar, personal och akademi följer klubben; du tar med dig din tränarprofil och dina meriter.</p><button class="btn" onclick="managerAcceptJob()">Skriv under och tillträd</button>`:`<p>${trainingSafe(i.message)}</p>`}<button class="btn secondary" onclick="state.managerCareer.interview=null;save();render()">${i.stage==='offer'?'Tacka nej':'Stäng'}</button></section>`;
}
