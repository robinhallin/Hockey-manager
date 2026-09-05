"use strict";
// Fictional operating model. One annual budget is settled over 52 regular fixtures.
const CLUB_ROLES={assistant:'Assisterande tränare',scout:'Chefsscout',goalie:'Målvaktstränare',junior:'Junioransvarig',physio:'Fysioterapeut'};
const CLUB_PRIORITIES={balanced:{name:'Håll marginalerna',cost:0,text:'Ingen extra satsning. Behåll utrymme för värvningar och oväntade utgifter.'},youth:{name:'Talangfabriken',cost:1200000,text:'15 % mer utveckling i klubbens juniorträning. Lån påverkas inte.'},scouting:{name:'Bredare nätverk',cost:900000,text:'Ett extra samtidigt scoutuppdrag och 20 % lägre uppdragsavgift.'},first:{name:'Vässa A-laget',cost:1500000,text:'10 % mer träningsutveckling i A-laget. Vila ger ingen utveckling.'}};
function clubYear(){return state.season?.year||2026;}
function ensureClub(){
 if(!state.careerStarted)return;
 ensureAssessmentData();
 if(!state.clubOffice){
  const fans=CLUB_DATA[managerClub()]?.fans||6500;
  state.clubOffice={version:1,year:clubYear(),opening:state.money,ledger:[],totals:{},settled:[],priority:'balanced',ticket:220,capacity:Math.round(fans*1.2),sponsor:Math.round(annualWageCost()*.6+(leagueOf()==='HA'?2500000:6000000)),operations:leagueOf()==='HA'?4000000:9000000,staffLimit:leagueOf()==='HA'?2600000:3200000,market:[],taken:[],archives:[],message:'',offer:null};
  const existing={assistant:['Erik Lind',600000],scout:['Anna Berg',480000],goalie:['Johan Nyström',420000]};
  for(const s of state.staff){const def=existing[s.id];if(def)Object.assign(s,{name:def[0],personId:s.id,salary:def[1],expires:clubYear()+2,coaching:s.coaching??(s.id==='goalie'?16:s.id==='assistant'?14:8)});}
  state.staff.push({id:'junior',personId:'initial-junior',name:'Sara Holm',ability:12,potential:15,specialty:'Tvåvägsforward',coaching:12,salary:420000,expires:clubYear()+2});
  state.staff.push({id:'physio',personId:'initial-physio',name:'Mikael Ek',ability:10,potential:10,specialty:'Tvåvägsforward',coaching:15,salary:420000,expires:clubYear()+2});
 }
 for(const role of Object.keys(CLUB_ROLES))if(!state.staff.some(s=>s.id===role))state.staff.push(clubInterim(role));
 if(!state.clubOffice.market.length)clubMakeMarket();
 if(state.medical){const s=state.staff.find(s=>s.id==='physio');state.medical.staff.physio=s.name;state.medical.staff.skill=s.coaching;}
}
function clubMakeMarket(){
 const o=state.clubOffice,first=['Elin','Oskar','Maria','Daniel','Emma','Viktor','Sofia','Anton','Karin','Fredrik'],last=['Sjöberg','Lund','Ekström','Björk','Nyberg','Strand','Wallin','Bergman','Holmström','Dahl'];
 o.market=Object.keys(CLUB_ROLES).flatMap((role,r)=>Array.from({length:3},(_,i)=>{
  const seed=k=>attrSeed(`staff:${o.year}:${role}:${i}:${k}`),skill=10+i*3;
  return {personId:`staff-${o.year}-${role}-${i}`,id:role,name:`${first[(r*2+i)%10]} ${last[(r+i+o.year)%10]}`,ability:Math.min(20,skill+Math.floor(seed('a')*3)),potential:Math.min(20,10+Math.floor(seed('p')*10)),coaching:Math.min(20,skill+Math.floor(seed('c')*3)),specialty:role==='goalie'?'Målvakt':['Tvåvägsforward','Spelfördelare','Målskytt','Defensiv back'][Math.floor(seed('s')*4)],salary:240000+i*220000+(role==='assistant'?120000:0),minYears:i===2?2:1};
 }));
}
function clubPost(category,amount,label){
 ensureClub();const o=state.clubOffice;if(!o||!Number.isFinite(amount))return;
 amount=Math.round(amount);state.money+=amount;o.totals[category]=(o.totals[category]||0)+amount;
 o.ledger.unshift({year:clubYear(),round:state.round,category,label,amount,balance:state.money});o.ledger=o.ledger.slice(0,240);
}
function clubStaffCost(){return (state.staff||[]).reduce((n,s)=>n+(s.salary||0),0);}
function clubMissionLimit(){return 2+(state.staff.find(s=>s.id==='scout')?.ability>=16?1:0)+(state.clubOffice?.priority==='scouting'?1:0);}
function clubMissionFee(){return state.clubOffice?.priority==='scouting'?20000:25000;}
function clubTrainingFactor(){return state.clubOffice?.priority==='first'?1.1:1;}
function clubJuniorFactor(){return state.clubOffice?.priority==='youth'?1.15:1;}
function clubGate(playoff=false){
 const o=state.clubOffice,rank=regularTable().findIndex(t=>t.name===managerClub())+1;
 const demand=.9+(8-rank)*.012+(playoff?.12:0)-(o.ticket-220)/700;
 const attendance=Math.round(Math.min(o.capacity,Math.max(0,state.fans||0)*Math.max(.45,Math.min(1.2,demand))));
 return {attendance,revenue:attendance*o.ticket};
}
function clubSettleMatch(){
 ensureClub();const o=state.clubOffice,m=state.live,g=state.schedule.find(g=>g.round===state.round&&(g.home===managerClub()||g.away===managerClub()));
 if(!m?.finished||!g)return;
 const key=`${clubYear()}:${state.round}`;if(o.settled.includes(key))return;o.settled.push(key);
 const home=g.home===managerClub(),gate=clubGate(Boolean(g.seriesId));
 if(home)clubPost('tickets',gate.revenue,`${gate.attendance.toLocaleString('sv-SE')} åskådare × ${o.ticket} kr · ${g.away}`);
 clubPost('matchday',home?-150000:-90000,home?'Arena & matcharrangemang':'Bortaresa & logi');
 if(!g.seriesId){
  clubPost('sponsor',o.sponsor/52,'Sponsor & centrala avtal · 1/52');
  clubPost('players',-annualWageCost()/52,'Spelarlöner · 1/52 av nuvarande årslön');
  clubPost('staff',-clubStaffCost()/52,'Personallöner · 1/52');
  if(managerSalary())clubPost('manager',-managerSalary()/52,'Huvudtränarens lön · 1/52');
  clubPost('operations',-o.operations/52,'Klubbdrift & ungdomsverksamhet · 1/52');
  const p=CLUB_PRIORITIES[o.priority];if(p.cost)clubPost('priority',-p.cost/52,p.name+' · 1/52');
 }
 managerMessage(`finance:${key}`,'Ekonomirapport efter matchen',`${home?`Publikintäkt ${money(gate.revenue)}.`:'Bortamatch: ingen biljettintäkt.'} Kassa: ${money(state.money)}. ${state.money<0?'Kassan är negativ. Försäljningar och lägre kostnader behövs.':'Se återstående säsongsprognos och kostnader under Ekonomi.'}`,'Klubbekonomi',{link:'finance'});
}
function clubForecast(){
 const o=state.clubOffice,remaining=state.schedule.filter(g=>!g.played&&!g.seriesId&&(g.home===managerClub()||g.away===managerClub())),home=remaining.filter(g=>g.home===managerClub()).length;
 // During preseason the old schedule remains; project the next 52-fixture season.
 const preseason=state.season.phase==='preseason',games=preseason?52:remaining.length,homes=preseason?26:home;
 const wage=annualWageCost()+clubStaffCost()+managerSalary(),recurring=o.operations+CLUB_PRIORITIES[o.priority].cost;
 const income=homes*clubGate().revenue+games*o.sponsor/52,cost=games*(wage+recurring)/52+homes*150000+(games-homes)*90000;
 const reserved=(state.recruitment?.deals||[]).filter(d=>d.status==='pending').reduce((n,d)=>n+d.fee,0);
 return {games,homes,income,cost,reserved,cash:Math.round(state.money+income-cost-reserved)};
}
function clubNotice(message){state.clubOffice.message=message;save();render();}
function clubLocked(){return Boolean(state.live&&!state.live.finished);}
function clubSetPolicy(key,value){
 if(!managerCanPlay())return;
 ensureClub();if(clubLocked())return clubNotice('Ändra klubbens plan mellan matcher.');
 if(key==='priority'&&Object.hasOwn(CLUB_PRIORITIES,value)){
  if(CLUB_PRIORITIES[value].cost>CLUB_PRIORITIES[state.clubOffice.priority].cost&&state.money-clubForecast().reserved<=0)return clubNotice('Kassan saknar utrymme för en större satsning.');
  state.clubOffice.priority=value;
 }
 else if(key==='ticket'&&[160,220,280,340].includes(Number(value)))state.clubOffice.ticket=Number(value);
 else return;
 clubNotice('Planen är uppdaterad. Nya priser och kostnader gäller framåt.');
}
function clubBuyout(s){
 if(!s.salary)return 0;
 const regularLeft=state.season.phase==='preseason'?52:state.schedule.filter(g=>!g.played&&!g.seriesId&&(g.home===managerClub()||g.away===managerClub())).length;
 const years=Math.max(0,s.expires-clubYear()-1)+regularLeft/52;
 return Math.round(s.salary*years*.5);
}
function clubOpenOffer(personId){
 ensureClub();const c=state.clubOffice.market.find(c=>c.personId===personId);if(!c||state.clubOffice.taken.includes(personId))return;
 state.clubOffice.offer={type:'hire',personId,salary:c.salary,years:c.minYears};state.page='staff';save();render();clubShowOffer();
}
function clubRenew(role){
 const s=state.staff.find(s=>s.id===role);if(!s?.salary)return;
 if(s.expires>clubYear()+1)return clubNotice('Förlängning öppnas under avtalets sista säsong.');
 state.clubOffice.offer={type:'renew',personId:s.personId,salary:Math.round(s.salary*1.05/10000)*10000,years:2};save();render();clubShowOffer();
}
function clubRelease(role){
 const s=state.staff.find(s=>s.id===role);if(!s?.salary)return;
 state.clubOffice.offer={type:'release',personId:s.personId};save();render();clubShowOffer();
}
function clubShowOffer(){document.querySelector('.club-offer')?.scrollIntoView?.({behavior:'smooth',block:'start'});}
function clubOfferEdit(key,value){
 const d=state.clubOffice.offer;if(!d||!['salary','years'].includes(key)||!Number.isFinite(Number(value)))return;
 d[key]=Number(value);save();
 const c=d.type==='hire'?state.clubOffice.market.find(c=>c.personId===d.personId):state.staff.find(s=>s.personId===d.personId);
 const old=state.staff.find(s=>s.id===c?.id),total=document.querySelector('.club-offer-total');
 if(total&&old)total.textContent=money(clubStaffCost()-old.salary+d.salary);
}
function clubInterim(role){return {id:role,personId:`interim-${role}`,name:`Tillförordnad ${CLUB_ROLES[role].toLowerCase()}`,ability:8,potential:8,coaching:8,specialty:role==='goalie'?'Målvakt':'Tvåvägsforward',salary:0,expires:null};}
function clubSign(){
 if(!managerCanPlay())return;
 ensureClub();const o=state.clubOffice,d=o.offer;if(!d)return;
 if(clubLocked())return clubNotice('Personalbyten görs mellan matcher.');
 const candidate=d.type==='hire'?o.market.find(c=>c.personId===d.personId):state.staff.find(s=>s.personId===d.personId);
 if(!candidate||d.type==='hire'&&o.taken.includes(d.personId))return clubNotice('Kandidaten är inte längre tillgänglig.');
 const old=state.staff.find(s=>s.id===candidate.id);if(!old)return;
 const buyout=d.type==='renew'?0:clubBuyout(old);
 if(d.type==='renew'&&(old.expires>clubYear()+1||clubYear()+d.years<=old.expires))return clubNotice('Förlängningen måste lägga till minst en säsong och göras under sista avtalsåret.');
 if(d.type!=='release'){
  const minimum=d.type==='renew'?Math.round(old.salary*1.05/10000)*10000:candidate.salary;
  if(!Number.isFinite(d.salary)||d.salary<minimum||!Number.isInteger(d.years)||d.years<(candidate.minYears||1)||d.years>3)return clubNotice('Personen accepterar inte villkoren. Uppfyll lönekravet och erbjud 1–3 säsonger.');
  if(clubStaffCost()-old.salary+d.salary>o.staffLimit)return clubNotice('Avtalet överskrider personalbudgeten. Välj en billigare kandidat eller minska andra personalkostnader.');
 }
 const reserved=clubForecast().reserved;
 if(state.money-buyout-reserved<0)return clubNotice('Kassan räcker inte efter reserverade transferbud och avgångsersättning.');
 if(buyout)clubPost('severance',-buyout,`Avgångsersättning · ${old.name}`);
 const replacement=d.type==='release'?clubInterim(old.id):{...candidate,salary:d.salary,expires:clubYear()+d.years};
 state.staff[state.staff.indexOf(old)]=replacement;
 if(d.type==='hire')o.taken.push(candidate.personId);
 o.offer=null;
 managerMessage(`staff:${o.year}:${o.ledger.length}:${candidate.personId}:${replacement.expires}`,d.type==='release'?`${old.name} lämnar klubben`:`${replacement.name} · avtal klart`,`${CLUB_ROLES[old.id]}. ${d.type==='release'?'En tillförordnad tar över med lägre kompetens.':`${money(replacement.salary)}/år, till sommaren ${replacement.expires}.`}`,'Personal',{link:'staff'});
 clubNotice(d.type==='release'?'Avtalet är avslutat. En tillförordnad håller verksamheten igång.':'Avtalet är klart. Kompetensen används nu i klubbens verksamhet.');
}
function clubNewYear(){
 ensureClub();const o=state.clubOffice;if(o.year===clubYear())return;
 o.archives.unshift({year:o.year,opening:o.opening,closing:state.money,totals:{...o.totals}});o.archives=o.archives.slice(0,10);
 o.year=clubYear();o.opening=state.money;o.totals={};o.settled=[];o.taken=[];o.offer=null;
 const expired=[];state.staff=state.staff.map(s=>{if(s.salary&&s.expires<=o.year){expired.push(s.name);return clubInterim(s.id);}return s;});
 const goals=state.season.boardResult||[],met=goals.filter(g=>g.met).length/Math.max(1,goals.length);
 o.sponsor=Math.round(o.sponsor*(.96+.08*met));clubMakeMarket();
 const soon=state.staff.filter(s=>s.salary&&s.expires===o.year+1);
 if(soon.length)managerMessage(`staff-renew:${o.year}`,'Personalavtal går in på sista året',`${soon.map(s=>s.name).join(', ')} kan nu erbjudas förlängning. Annars lämnar de vid nästa försäsong.`,'Personal',{link:'staff'});
 if(expired.length)managerMessage(`staff-expiry:${o.year}`,'Personalavtal har löpt ut',`${expired.join(', ')} har lämnat. Tillförordnade tar över tills du rekryterar ersättare.`,'Personal',{link:'staff'});
}
const CLUB_CATEGORIES={manager:'Huvudtränarens lön',tickets:'Biljetter',matchday:'Match & resor',sponsor:'Sponsor & centrala avtal',players:'Spelarlöner',staff:'Personallöner',operations:'Klubbdrift',priority:'Extra satsning',transfer:'Spelarövergångar',scouting:'Scoutuppdrag',severance:'Avgångsersättning',grant:'Styrelsetilldelning',other:'Övrigt'};
function clubNavigation(page){return `<div class="club-tabs"><button class="btn ${page==='finance'?'':'secondary'}" onclick="trainingOpen('finance')">Ekonomi & plan</button><button class="btn ${page==='staff'?'':'secondary'}" onclick="trainingOpen('staff')">Personal & rekrytering</button></div>`;}
function clubFinanceView(){
 ensureClub();const o=state.clubOffice,f=clubForecast(),priority=CLUB_PRIORITIES[o.priority];
 return `<section class="club-office"><header class="daily-heading"><div><span class="career-eyebrow">KLUBBHUSET · ${seasonLabel()}</span><h1>Bygg med framförhållning.</h1><p>Varje satsning behöver rymmas både i budgeten och i kassan.</p></div>${careerBadge(managerClub(),'large')}</header>${clubNavigation('finance')}<div class="club-metrics"><article><span>Klubbkassa</span><strong>${money(state.money)}</strong></article><article class="${f.cash<0?'club-warning':''}"><span>Prognos efter ${f.games} grundseriematcher</span><strong>${money(f.cash)}</strong></article><article><span>Spelarlöner / budget per år</span><strong>${careerMoney(annualWageCost())} / ${careerMoney(wageBudget())}</strong></article><article><span>Personallöner / budget per år</span><strong>${careerMoney(clubStaffCost())} / ${careerMoney(o.staffLimit)}</strong></article></div><p role="status">${trainingSafe(o.message)}</p><div class="club-columns"><section class="club-panel"><h2>Välj klubbens satsning</h2><p>En satsning åt gången. Kostnaden betalas över grundserien och effekten gäller kommande aktiviteter.</p><div class="club-priorities">${Object.entries(CLUB_PRIORITIES).map(([id,p])=>`<button class="club-priority ${o.priority===id?'selected':''}" aria-pressed="${o.priority===id}" onclick="clubSetPolicy('priority','${id}')"><strong>${p.name}</strong><span>${p.text}</span><b>${p.cost?money(p.cost)+' / säsong':'Ingen extra kostnad'}</b></button>`).join('')}</div></section><section class="club-panel"><h2>Publik & avtal</h2><label>Biljettpris<select onchange="clubSetPolicy('ticket',this.value)">${[160,220,280,340].map(n=>`<option value="${n}" ${o.ticket===n?'selected':''}>${n} kr</option>`).join('')}</select></label><p>Högre pris minskar efterfrågan. Resultat och slutspel påverkar också publiken.</p><div class="row"><span>Beräknad publik nästa hemmamatch</span><b>${clubGate().attendance.toLocaleString('sv-SE')} / ${o.capacity.toLocaleString('sv-SE')}</b></div><div class="row"><span>Sponsor & centrala avtal / år</span><b>${money(o.sponsor)}</b></div><div class="row"><span>Klubbdrift / år</span><b>${money(o.operations)}</b></div><p>Avtalen omprövas inför säsongen utifrån uppfyllda styrelsemål (−4 till +4 %). Arenans kapacitet och beloppen är fiktiva speldata.</p><h3>Återstående prognos</h3><div class="row"><span>Intäkter</span><b>${money(f.income)}</b></div><div class="row"><span>Kostnader</span><b>${money(f.cost)}</b></div><div class="row"><span>Reserverade transferbud</span><b>${money(f.reserved)}</b></div><p>Oförändrad trupp, publiknivå och satsning antas. Framtida slutspel, nya värvningar och styrelsetilldelning ingår inte. Budens framtida löner ingår först när spelaren ansluter.</p></section></div><section class="club-panel"><h2>Pengarna hittills denna säsong</h2><div class="club-totals">${Object.entries(o.totals).map(([k,n])=>`<div><span>${CLUB_CATEGORIES[k]||k}</span><strong>${n>0?'+':''}${money(n)}</strong></div>`).join('')||'<p>Inga nya transaktioner ännu.</p>'}</div><h3>Senaste transaktionerna</h3>${o.ledger.slice(0,35).map(e=>`<div class="club-ledger"><span>${seasonLabel(e.year)} · omg ${e.round}<small>${trainingSafe(e.label)}</small></span><strong class="${e.amount<0?'':'club-income'}">${e.amount>0?'+':''}${money(e.amount)}</strong><span>Kassa ${money(e.balance)}</span></div>`).join('')||'<p>Historiken börjar med den här uppdateringen. Tidigare affärer har inte återskapats.</p>'}<p>Årslöner, drift och sponsoravtal fördelas över 52 grundserieomgångar; de omfattar även försäsong och slutspel. Slutspel ger bara extra matchintäkter och matchkostnader. Tillfälligt minus stoppar nya ekonomiska åtaganden, men avbryter inte karriären.</p>${o.archives.length?`<h3>Tidigare ekonomiår</h3>${o.archives.map(a=>`<div class="row"><span>${seasonLabel(a.year)}</span><b>${money(a.opening)} → ${money(a.closing)}</b></div>`).join('')}`:''}</section></section>`;
}
function clubStaffView(){
 ensureClub();const o=state.clubOffice;
 return `<section class="club-office"><header class="daily-heading"><div><span class="career-eyebrow">DITT TRÄNARTEAM</span><h1>Rätt människor runt laget.</h1><p>Fem roller. Olika styrkor. Ett gemensamt löneutrymme.</p></div><strong>${careerMoney(clubStaffCost())} / ${careerMoney(o.staffLimit)} per år</strong></header>${clubNavigation('staff')}<p role="status">${trainingSafe(o.message)}</p>${clubOfferView()}<div class="club-staff-grid">${state.staff.map(s=>`<article class="club-panel"><span class="career-eyebrow">${CLUB_ROLES[s.id]}</span><h2>${trainingSafe(s.name)}</h2>${clubSkills(s)}<p>${s.salary?`${money(s.salary)}/år · avtal till sommaren ${s.expires}`:'Tillförordnad · ingår i klubbdriften'}</p><div class="club-actions">${s.salary?`<button class="btn secondary" onclick="clubRenew('${s.id}')" ${s.expires>clubYear()+1?'disabled':''}>Förläng avtal</button><button class="btn secondary" onclick="clubRelease('${s.id}')">Granska avslut</button>`:''}</div></article>`).join('')}</div><section class="club-panel"><h2>Lediga kandidater</h2><p>Fiktiv personal. Kompetens 1–20. Lönen är personens lägsta krav. En ny anställning ersätter nuvarande person i rollen; eventuell avgångsersättning visas före beslutet.</p><div class="club-candidates">${o.market.filter(c=>!o.taken.includes(c.personId)).map(c=>`<article><span class="career-eyebrow">${CLUB_ROLES[c.id]}</span><h3>${c.name}</h3>${clubSkills(c)}<p>${money(c.salary)}/år · minst ${c.minYears} säsong${c.minYears>1?'er':''}</p><button class="btn secondary" onclick="clubOpenOffer('${c.personId}')">Förhandla avtal</button></article>`).join('')}</div></section></section>`;
}
function clubSkills(s){
 const impact={assistant:'Leder A-lagets utespelarträning.',goalie:'Leder målvaktsträning och bedömer målvakter.',scout:`Bedömer värvningar. Förmågebedömning 16+ ger ett extra scoutuppdrag.`,junior:'Leder juniorernas träning i den egna klubben.',physio:'Påverkar beredskap och belastningsåterhämtning under rehabilitering.'};
 return `<div class="club-skills"><span>Träning / rehab <b>${s.coaching}/20</b></span><span>Bedöma förmåga <b>${s.ability}/20</b></span><span>Bedöma potential <b>${s.potential}/20</b></span></div><p>${impact[s.id]} Specialisering: ${trainingSafe(s.specialty)}.</p>`;
}
function clubOfferView(){
 const o=state.clubOffice,d=o.offer;if(!d)return '';
 const c=d.type==='hire'?o.market.find(c=>c.personId===d.personId):state.staff.find(s=>s.personId===d.personId);if(!c)return '';
 const old=state.staff.find(s=>s.id===c.id),buyout=d.type==='renew'?0:clubBuyout(old);
 return `<section class="club-offer" aria-label="Granska personalavtal"><span class="career-eyebrow">${d.type==='release'?'AVSLUTA AVTAL':'AVTALSFÖRSLAG'}</span><h2>${c.name}</h2><p>${CLUB_ROLES[c.id]} · ${d.type==='hire'?`ersätter ${old.name}`:d.type==='renew'?'förlängning från nuvarande säsong':'en tillförordnad tar över'}</p>${d.type!=='release'?`<div class="club-actions"><label>Årslön i kronor<input type="number" min="${c.salary}" step="10000" value="${d.salary}" onchange="clubOfferEdit('salary',this.value)"></label><label>Avtalets slut<select onchange="clubOfferEdit('years',this.value)">${[1,2,3].map(y=>`<option value="${y}" ${d.years===y?'selected':''}>Sommaren ${clubYear()+y}</option>`).join('')}</select></label></div><p>Ny total personallön: <span class="club-offer-total">${money(clubStaffCost()-old.salary+d.salary)}</span>/år. Budget: ${money(o.staffLimit)}.</p>`:''}<p>Avgångsersättning nu: <b>${money(buyout)}</b> (hälften av uppskattad återstående lön). ${d.type==='renew'?'Ingen avgångsersättning vid förlängning.':''}</p><div class="club-actions"><button class="btn" onclick="clubSign()">${d.type==='release'?'Avsluta och betala ersättning':'Godkänn avtalet'}</button><button class="btn secondary" onclick="state.clubOffice.offer=null;save();render()">Avbryt</button></div></section>`;
}
