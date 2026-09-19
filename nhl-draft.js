"use strict";
// NHL names are real; scouting, draft order, dates and rights duration are career-model rules.
const NHL_CLUBS=['Anaheim Ducks','Boston Bruins','Buffalo Sabres','Calgary Flames','Carolina Hurricanes','Chicago Blackhawks','Colorado Avalanche','Columbus Blue Jackets','Dallas Stars','Detroit Red Wings','Edmonton Oilers','Florida Panthers','Los Angeles Kings','Minnesota Wild','Montréal Canadiens','Nashville Predators','New Jersey Devils','New York Islanders','New York Rangers','Ottawa Senators','Philadelphia Flyers','Pittsburgh Penguins','San Jose Sharks','Seattle Kraken','St. Louis Blues','Tampa Bay Lightning','Toronto Maple Leafs','Utah Mammoth','Vancouver Canucks','Vegas Golden Knights','Washington Capitals','Winnipeg Jets'];
const nhlUI={tab:'club',club:'all',query:'',round:'all'};
function nhlDraftDate(year){return `${year}-06-28`;}
function nhlNewEdition(year){return {year,date:nhlDraftDate(year),status:'upcoming',board:[],boardDate:null,picks:[],order:[],skipped:false};}
function ensureNHL(){
 if(!state.careerStarted||!state.calendar||!state.international)return null;
 if(!state.nhl){const date=state.calendar.date,year=Number(date.slice(0,4));state.nhl={version:1,activated:date,draft:nhlNewEdition(date<=nhlDraftDate(year)?year:year+1),history:[],lastDay:null,notice:''};}
 return state.nhl;
}
function nhlFirstYear(p){
 if(p.nhlFirstYear)return p.nhlFirstYear;
 const birth=p.research?.birth||p.birth;
 if(/^\d{4}-\d{2}-\d{2}$/.test(birth||''))return Number(birth.slice(0,4))+18+(birth.slice(5)>'09-15'?1:0);
 return internationalIdentity(p).birthYear+18;
}
function nhlEligible(p,year){
 const first=nhlFirstYear(p);
 // Older real-world draft status is absent from the source database: never silently redraft it.
 return !p.nhlDraft&&Number.isFinite(first)&&year>=first&&year<=first+2&&(p.fictional||first>2026);
}
function nhlRightsActive(p,date=state.calendar?.date){return Boolean(p?.nhlDraft&&date<=p.nhlDraft.expires);}
function nhlOwned(p){return managerRoster().some(q=>samePlayerId(q.id,p.id))||state.juniors?.roster.some(q=>samePlayerId(q.id,p.id));}
function nhlEvidence(p,year){
 const keys=Object.keys(p.attributes||{}),baseline=p.trainingBaseline||p.academy?.baseline||p.attributes||{};
 const trend=keys.reduce((s,k)=>s+Math.max(0,p.attributes[k]-(baseline[k]??p.attributes[k])),0)/Math.max(1,keys.length);
 const records=(p.internationalHistory||[]).filter(h=>h.year>=year-1&&h.games>0);
 const jvm=records.reduce((s,h)=>s+h.games,0),seconds=records.reduce((s,h)=>s+h.seconds,0);
 const exposure=jvm?Math.min(.35,seconds/36000):0;
 const current=internationalScore({...p,fatigue:0},p.pos==='B'?'creator':'balanced');
 return {current,trend,jvm,score:current+Math.min(.7,trend*.35)+Math.max(0,2-(year-nhlFirstYear(p)))*.2+exposure};
}
function nhlBoard(year=state.nhl.draft.year){
 return internationalPlayers().filter(({p})=>nhlEligible(p,year)).map(({p,club})=>{const e=nhlEvidence(p,year);return {id:p.id,name:p.name,pos:p.pos,club,fictional:!!p.fictional,score:e.score+(attrSeed(`${year}:${p.id}:public-scout`)-.5)*1.3,trend:e.trend,jvm:e.jvm,estimated:!p.research?.birth&&!p.birth};}).sort((a,b)=>b.score-a.score||String(a.id).localeCompare(String(b.id))).map((r,i)=>({...r,rank:i+1}));
}
function nhlRange(rank){const low=Math.max(1,Math.ceil((rank-24)/32)),high=Math.ceil((rank+32)/32);return low>7?'Utanför prognosen':high>7?`Runda ${low}–7 / odraftad`:`Runda ${low}–${high}`;}
function nhlScoutReport(date=state.calendar.date){
 const w=ensureNHL(),d=w?.draft;if(!d||d.status!=='upcoming'||date<`${d.year-1}-09-01`)return;
 const window=date>=`${d.year}-05-15`?'final':date>=`${d.year}-01-15`?'winter':'autumn';
 if(d.window===window)return;
 const previous=new Map(d.board.map(r=>[String(r.id),r.rank]));d.board=nhlBoard(d.year).map(r=>({...r,previous:previous.get(String(r.id))||null}));d.boardDate=date;d.window=window;
 const own=d.board.filter(r=>r.club===managerClub());
 if(own.length)managerMessage(`nhl:${d.year}:${window}`,window==='winter'?'Draftbevakning efter JVM':'NHL-scouternas lägesbild',`${own.length} spelare från din klubb finns i det bevakade urvalet. ${own.slice(0,3).map(r=>`${r.name}: ${nhlRange(r.rank)}`).join('. ')}. Prognoserna är osäkra och ger inga garantier.`,'Scoutingavdelningen',{link:'nhl'});
}
function nhlRunDraft(date=state.calendar.date){
 const w=ensureNHL(),d=w?.draft;if(!d||d.status!=='upcoming'||date<d.date||state.live&&!state.live.finished)return false;
 if(w.activated>d.date){d.status='skipped';d.skipped=true;return false;}
 const pool=internationalPlayers().filter(({p})=>nhlEligible(p,d.year));
 const candidates=pool.map(r=>({...r,e:nhlEvidence(r.p,d.year)}));
 // No invented NHL standings: explicit seeded order, unchanged through all seven rounds.
 d.order=[...NHL_CLUBS].sort((a,b)=>attrSeed(`${d.year}:${a}:order`)-attrSeed(`${d.year}:${b}:order`)||a.localeCompare(b));
 const taken=new Set(),needs={};for(const club of NHL_CLUBS)needs[club]={MV:0,B:0,F:0};
 for(let round=1;round<=7;round++)for(const club of d.order){
  const focus=['MV','B','F'][Math.floor(attrSeed(`${club}:${d.year}:focus`)*3)];
  const options=candidates.filter(r=>!taken.has(String(r.p.id))).map(r=>({r,value:r.e.score+(attrSeed(`${club}:${d.year}:${r.p.id}:scout`)-.5)*1.8+(worldGroup(r.p)===focus?.25:0)-needs[club][worldGroup(r.p)]*.3})).sort((a,b)=>b.value-a.value||String(a.r.p.id).localeCompare(String(b.r.p.id)));
  if(!options.length)break;
  const {p,club:origin,e}=options[0].r,pick={id:p.id,name:p.name,pos:p.pos,origin,club,round,overall:(round-1)*32+d.order.indexOf(club)+1,year:d.year,date:d.date,expires:`${d.year+4}-06-30`,fictional:!!p.fictional,reason:`Nuvarande ${p.pos==='MV'?'målvaktsspel':p.pos==='B'?'backspel och puckfördelning':'spelstyrka och speluppfattning'}${e.trend>.25?', dokumenterad utveckling':''}${e.jvm?', JVM-underlag':''}; klubbens positionsbalans och osäkra scoutbedömning.`};
  p.nhlFirstYear=nhlFirstYear(p);p.nhlDraft={...pick};taken.add(String(p.id));needs[club][worldGroup(p)]++;d.picks.push(pick);
 }
 d.status='completed';d.completedAt=date;d.board=[];
 for(const origin of new Set(d.picks.map(r=>r.origin).filter(c=>state.world.membership[c]))){const rows=d.picks.filter(r=>r.origin===origin);feedbackNews(`nhl-draft:${d.year}:${origin}`,origin,'development',`${rows.length} spelare från ${origin} valda i NHL-draften`,rows.map(r=>`${r.name}: ${r.club}, val ${r.overall}`).join('. ')+'. NHL-rättigheter registreras; de svenska klubbavtalen fortsätter gälla.');}
 const own=d.picks.filter(r=>r.origin===managerClub());
 managerMessage(`nhl:${d.year}:results`,own.length?`${own.length} talanger från din klubb draftade`:'NHL-draften är genomförd',`${own.map(r=>`${r.name} → ${r.club} (val ${r.overall})`).join('\n')||'Ingen av klubbens spelare blev vald.'}\nValet ändrar inte klubbavtal, lön eller trupp. Följ upp utvecklingsvägen i NHL & draft.`,'Sportchefen',{link:'nhl',date:d.date});
 for(const n of state.managerFeedback?.news||[])if(n.key.startsWith(`nhl-draft:${d.year}:`))n.date=d.date;
 return true;
}
function nhlNextEdition(date){const w=state.nhl,d=w?.draft;if(!d||date<=d.date||d.status==='upcoming')return;w.history.unshift(d);w.history=w.history.slice(0,6);const year=Number(date.slice(0,4));w.draft=nhlNewEdition(date<=nhlDraftDate(year)?year:year+1);}
function nhlOffseason(){
 const w=ensureNHL();if(!w||state.live&&!state.live.finished)return;
 // The existing season transition jumps to July 1. Resolve June's draft before ages/stats reset.
 const draftYear=state.season.year+1;
 if(w.draft.year===draftYear&&w.draft.status==='upcoming')nhlRunDraft(nhlDraftDate(draftYear));
 for(const {p} of internationalPlayers())if(p.nhlPlan?.status==='active')nhlClosePlan(p,'neutral','Säsongen avslutades innan tillräckligt många bedömbara matcher spelats.');
}
function nhlDay(){
 const w=ensureNHL(),date=state.calendar?.date;if(!w||w.lastDay===date||state.live&&!state.live.finished)return;
 w.lastDay=date;
 if(w.draft.status==='upcoming'&&date>calAdd(w.draft.date,3)){w.draft.status='skipped';w.draft.skipped=true;}
 else if(date>=w.draft.date)nhlRunDraft(date);
 nhlNextEdition(date);nhlScoutReport(date);
 for(const {p} of internationalPlayers()){
  if(p.nhlDraft&&!p.nhlDraft.expiredNotice&&date>p.nhlDraft.expires){p.nhlDraft.expiredNotice=true;if(nhlOwned(p))managerMessage(`nhl-expiry:${p.id}:${p.nhlDraft.year}`,`${p.name}: NHL-rättigheterna har löpt ut`,`${p.nhlDraft.club} har inte längre exklusiva NHL-rättigheter i spelmodellen. Klubbavtalet här påverkas inte.`,'Sportchefen',{link:'nhl'});}
  if(p.nhlPlan?.status==='active'&&(!nhlOwned(p)||p.nhlPlan.club!==managerClub()||!managerEmployed()))nhlClosePlan(p,'neutral','Klubbtillhörigheten eller tränaruppdraget ändrades.');
  else if(p.nhlPlan?.status==='active'&&date>p.nhlPlan.deadline)nhlClosePlan(p,'neutral','För få bedömbara matcher före uppföljningsdatumet. Ingen påföljd.');
 }
}
function nhlSetPlan(id,path){
 const p=internationalPlayers().find(r=>samePlayerId(r.p.id,id))?.p,w=ensureNHL();
 if(!p||!w||!nhlOwned(p)||!nhlRightsActive(p)||!managerEmployed()||state.live&&!state.live.finished||!['senior','junior','open'].includes(path)||p.nhlPlan?.season===state.season.year)return false;
 if(path==='junior'&&(!p.academy||p.age>20||playerLoan(p)||p.academy.loan))return false;
 if(playerLoan(p)||p.academy?.loan)return false;
 const date=state.calendar.date,start=date<`${state.season.year}-09-01`?`${state.season.year}-09-01`:date;
 if(p.nhlPlan){p.nhlPlanHistory??=[];p.nhlPlanHistory.unshift(p.nhlPlan);p.nhlPlanHistory=p.nhlPlanHistory.slice(0,4);}
 p.nhlPlan={season:state.season.year,club:managerClub(),date,deadline:calAdd(start,100),path,status:path==='open'?'open':'active',seen:[],games:0,met:0,seconds:0,targetSeconds:p.pos==='MV'?1800:path==='senior'?480:900,targetGames:p.pos==='MV'?2:4};
 w.notice=path==='open'?`${p.name}: en öppen utvecklingsdialog utan istidslöfte.`:`${p.name}: löftet följs över sex bedömbara ${path==='senior'?'A-lagsmatcher':'J20-matcher'}. Laguttagningen gör du själv.`;
 managerMessage(`nhl-plan:${p.id}:${state.season.year}`,'Utvecklingsdialog efter draften',w.notice,'Junioransvarig',{link:'nhl'});save();render();return true;
}
function nhlClosePlan(p,status,reason){
 const a=p.nhlPlan;if(!a||a.status!=='active')return;
 a.status=status;a.outcome=reason;a.closed=state.calendar.date;
 const delta=status==='met'?3:status==='missed'?-4:0;
 if(delta){p.morale=trainingClamp((p.morale??65)+delta);if(p.social&&nhlOwned(p))relationshipChange(p,delta,'Utvecklingslöftet efter draften',reason);}
 if(a.club===managerClub())managerMessage(`nhl-plan-result:${p.id}:${a.season}`,`${p.name}: utvecklingsplanen följs upp`,`${reason}\n${a.met}/${a.targetGames} matcher nådde istidsmålet (${Math.round(a.targetSeconds/60)} minuter). ${delta?'Spelarens moral och befintliga tränarförtroende påverkas.':'Ingen moral- eller förtroendepåföljd.'}`,'Junioransvarig',{link:'nhl'});
}
function nhlObserveFixture(kind,key,date,club,rows,partial=false){
 if(!state.nhl||partial||club!==managerClub()||!managerEmployed())return;
 for(const {p} of internationalPlayers()){
  const a=p.nhlPlan;if(!a||a.status!=='active'||a.path!==kind||a.club!==club||date<a.date||a.seen.includes(key))continue;
  if(!nhlOwned(p)){nhlClosePlan(p,'neutral','Spelaren har lämnat klubben.');continue;}
  if(date>a.deadline){nhlClosePlan(p,'neutral','För få bedömbara matcher före uppföljningsdatumet.');continue;}
  const seconds=rows.find(r=>samePlayerId(r.id,p.id))?.seconds||0;
  if((seconds<a.targetSeconds&&(internationalAway(p,date)||p.health?.injury||medicalLimit(p)<a.targetSeconds))||playerLoan(p)||p.academy?.loan)continue;
  a.seen.push(key);a.games++;a.seconds+=seconds;if(seconds>=a.targetSeconds)a.met++;
  if(a.games>=6)nhlClosePlan(p,a.met>=a.targetGames?'met':'missed',a.met>=a.targetGames?'Den utlovade matchrollen blev verklighet.':'Den utlovade matchrollen följdes inte av tillräcklig istid.');
 }
}
function nhlSetFilter(key,value){if(!Object.hasOwn(nhlUI,key))return;if(key==='tab'&&!['club','board','results','rights'].includes(value))return;if(key==='club'&&value!=='all'&&!NHL_CLUBS.includes(value))return;if(key==='round'&&!['all','1','2','3','4','5','6','7'].includes(value))return;nhlUI[key]=String(value).slice(0,80);render();}
function nhlPlanView(p){
 const a=p.nhlPlan,locked=state.live&&!state.live.finished;
 if(a?.season===state.season.year)return `<p><strong>${{active:'Pågående istidslöfte',open:'Öppen dialog',met:'Löftet uppfyllt',missed:'Löftet missat',neutral:'Avslutat utan påföljd'}[a.status]}</strong> · ${a.path==='senior'?'A-laget':a.path==='junior'?'J20':'Inget istidslöfte'}</p>${a.path==='open'?'':`<p>${a.games}/6 bedömbara matcher · ${a.met}/${a.targetGames} med minst ${a.targetSeconds/60} minuter. Uppföljning senast ${calText(a.deadline)}.</p>`}${a.outcome?`<p>${trainingSafe(a.outcome)}</p>`:''}`;
 const unavailable=!!playerLoan(p)||!!p.academy?.loan;
 return `<p>Välj ett besked för säsongen. Ett löfte kräver ${p.pos==='MV'?'två matcher med minst 30 minuter':'fyra matcher med minst 8 minuter i A-laget eller 15 minuter i J20'} under sex bedömbara lagmatcher. Skada, medicinsk begränsning och JVM-frånvaro undantas. Uppfyllt ger +3 moral/förtroende, missat −4. Öppen dialog ger ingen bonus eller påföljd.</p><div class="nhl-actions"><button class="btn secondary" onclick="nhlSetPlan('${p.id}','senior')" ${locked||unavailable?'disabled':''}>Lova A-lagsistid</button>${p.academy&&p.age<=20?`<button class="btn secondary" onclick="nhlSetPlan('${p.id}','junior')" ${locked||unavailable?'disabled':''}>Lova J20-istid</button>`:''}<button class="btn secondary" onclick="nhlSetPlan('${p.id}','open')" ${locked||unavailable?'disabled':''}>Håll dialogen öppen</button></div><p>Planen flyttar inte spelaren och ändrar inte kedjorna. Du ansvarar för att skapa plats.</p>`;
}
function nhlProfile(p){
 if(!state.nhl)return '';
 const d=p.nhlDraft;let text;
 if(d)text=`${d.year} · ${d.club} · runda ${d.round}, val ${d.overall}. ${nhlRightsActive(p)?`NHL-rättigheter till ${calText(d.expires)}`:'NHL-rättigheterna har löpt ut'}. Klubbavtalet är separat.`;
 else if(!p.fictional&&nhlFirstYear(p)<=2026)text='Tidigare NHL-draft och rättigheter är inte verifierade i startdatabasen. Spelaren draftas därför inte om av denna modell.';
 else if(nhlEligible(p,state.nhl.draft.year))text=`Bevakas inför draften ${state.nhl.draft.year}. Scoutprognosen är osäker.`;
 else return '';
 return `<section class="nhl-profile"><h3>NHL & draft</h3><p>${trainingSafe(text)}</p><button class="desk-link" onclick="deskNavigate('nhl')">Öppna draftbevakningen →</button></section>`;
}
function nhlCalendar(){const w=state.nhl;if(!w)return '';const own=internationalPlayers().filter(r=>nhlOwned(r.p)&&r.p.nhlPlan?.status==='active').length;return `<section class="mw-panel nhl-calendar"><h2>NHL & draft</h2><p>Draft ${calText(w.draft.date)} · ${own} pågående utvecklingslöften. Junidraften genomförs även när du går vidare till nästa försäsong.</p><button class="desk-link" onclick="deskNavigate('nhl')">Följ draftåret →</button></section>`;}
function nhlView(){
 const w=ensureNHL();if(!w)return '';const d=w.draft,all=internationalPlayers(),board=d.board.length?d.board:nhlBoard(d.year),own=all.filter(r=>nhlOwned(r.p)&&(r.p.nhlDraft||nhlEligible(r.p,d.year))),editions=[d,...w.history].filter(e=>e.status==='completed');
 const tabs=[['club','Din klubbs talanger'],['board','Scoutprognos'],['results','Draftresultat'],['rights','NHL-rättigheter']];
 let body='';
 if(nhlUI.tab==='club')body=`<section class="mw-panel"><h2>Från talang till NHL-intresse</h2><p>Uttagning till JVM kan ge mer scoutunderlag. Faktisk utveckling och spelstyrka väger tyngre än en enstaka turnering.</p>${own.map(({p})=>{const row=board.find(r=>samePlayerId(r.id,p.id)),draft=p.nhlDraft;return `<details class="nhl-candidate"><summary><strong>${trainingSafe(p.name)}</strong><span>${p.pos} · ${draft?`${trainingSafe(draft.club)} · val ${draft.overall}`:row?nhlRange(row.rank):'Utanför prognosen'}</span></summary>${nhlProfile(p)}${draft&&nhlRightsActive(p)?nhlPlanView(p):`<p>${row?.jvm?`${row.jvm} JVM-matcher finns i underlaget.`:'Inget registrerat JVM-underlag ännu.'} ${row?.estimated?'Födelseåret är uppskattat.':''}</p>`}<button class="desk-link" onclick="${p.academy?'juniorSelect':'selectPlayer'}('${p.id}')">Öppna spelarens utveckling →</button></details>`;}).join('')||'<p>Inga draftaktuella talanger eller registrerade draftval i klubben just nu.</p>'}</section>`;
 if(nhlUI.tab==='board')body=`<section class="mw-panel"><h2>Scoutprognos inför ${d.year}</h2><p>${d.boardDate?`Rapport ${calText(d.boardDate)}`:'Inledande bedömning'} · uppdateras under hösten, efter JVM och inför draften. Intervallen överlappar: olika klubbar gör olika bedömningar. Listan omfattar den bevakade spelarvärlden.</p><form class="nhl-filters" onsubmit="event.preventDefault();nhlSetFilter('query',this.elements.query.value)"><label>Sök spelare eller klubb<input name="query" type="search" value="${trainingSafe(nhlUI.query)}"></label><button class="btn secondary">Sök</button></form><div class="mw-scroll"><table><thead><tr><th>Spelare</th><th>Position</th><th>Klubb</th><th>Prognos</th><th>Förändring¹</th><th>JVM-matcher</th></tr></thead><tbody>${board.filter(r=>(r.name+' '+r.club).toLocaleLowerCase('sv').includes(nhlUI.query.toLocaleLowerCase('sv'))).slice(0,100).map(r=>`<tr><th>${trainingSafe(r.name)}${r.fictional?'<small>Fiktiv</small>':''}</th><td>${r.pos}</td><td>${trainingSafe(r.club)}</td><td>${nhlRange(r.rank)}</td><td>${r.previous?`${r.previous-r.rank>0?'+':''}${r.previous-r.rank}`:'–'}</td><td>${r.jvm||'–'}</td></tr>`).join('')||'<tr><td colspan="6">Inga spelare i urvalet.</td></tr>'}</tbody></table></div><p>Visar högst 100 spelare; sök för att begränsa. ¹ Förändring i bedömd placering sedan föregående rapport, inte förändrad potential.</p></section>`;
 if(nhlUI.tab==='results')body=`<section class="mw-panel"><h2>Draftarkiv</h2>${editions.map(e=>`<details class="nhl-edition" ${e===editions[0]?'open':''}><summary>${e.year} · ${e.picks.length} registrerade val</summary><p>Spelgenererad ordning. Ingen verklig NHL-tabell, lotteri eller handel med draftval simuleras i denna etapp.</p><div class="mw-scroll"><table><thead><tr><th>Val</th><th>NHL-klubb</th><th>Spelare</th><th>Från</th><th>Underlag</th></tr></thead><tbody>${e.picks.filter(r=>(nhlUI.club==='all'||r.club===nhlUI.club)&&(nhlUI.round==='all'||r.round===Number(nhlUI.round))).map(r=>`<tr><td>${r.overall} <small>Runda ${r.round}</small></td><td>${trainingSafe(r.club)}</td><th>${trainingSafe(r.name)}<small>${r.pos}${r.fictional?' · Fiktiv':''}</small></th><td>${trainingSafe(r.origin)}</td><td>${trainingSafe(r.reason)}</td></tr>`).join('')||'<tr><td colspan="5">Inga val i urvalet.</td></tr>'}</tbody></table></div></details>`).join('')||`<p>Första draften i denna karriär genomförs ${calText(d.date)}. Spelaren stannar i sin klubb när NHL-rättigheten registreras.</p>`}</section>`;
 if(nhlUI.tab==='rights')body=`<section class="mw-panel"><h2>Rättigheter och klubbavtal</h2><p>NHL-rättigheter ger ensam förhandlingsrätt inom NHL i spelmodellen. De är separata från svenska klubbavtal och följer spelaren vid svenska övergångar. Ingen flytt, lön eller övergångssumma utlöses av själva draftvalet.</p><div class="mw-scroll"><table><thead><tr><th>Spelare</th><th>Nuvarande klubb</th><th>NHL-klubb</th><th>Draft</th><th>Status</th></tr></thead><tbody>${all.filter(({p})=>p.nhlDraft&&(nhlUI.club==='all'||p.nhlDraft.club===nhlUI.club)).map(({p,club})=>`<tr><th>${trainingSafe(p.name)}</th><td>${trainingSafe(club)}</td><td>${trainingSafe(p.nhlDraft.club)}</td><td>${p.nhlDraft.year} · #${p.nhlDraft.overall}</td><td>${nhlRightsActive(p)?`Till ${calText(p.nhlDraft.expires)}`:'Utgången'}</td></tr>`).join('')||'<tr><td colspan="5">Inga registrerade rättigheter i urvalet.</td></tr>'}</tbody></table></div></section>`;
 return `<section class="matches-workspace nhl-page"><header class="mw-heading"><div><span class="desk-kicker">INTERNATIONELL SPELARVÄRLD · NÄSTA STEG</span><h1>NHL & draft</h1><p>Följ intresset. Bygg en utvecklingsväg som håller.</p></div><span>Kommande draft · ${d.year}</span></header>${w.notice?`<p class="nhl-notice" role="status">${trainingSafe(w.notice)}</p>`:''}<nav class="mw-tabs" aria-label="NHL och draft">${tabs.map(([id,label])=>`<button onclick="nhlSetFilter('tab','${id}')" aria-pressed="${nhlUI.tab===id}">${label}</button>`).join('')}</nav>${['rights','results'].includes(nhlUI.tab)?`<div class="nhl-filters"><label>NHL-klubb<select onchange="nhlSetFilter('club',this.value)"><option value="all">Alla klubbar</option>${NHL_CLUBS.map(c=>`<option ${nhlUI.club===c?'selected':''}>${c}</option>`).join('')}</select></label>${nhlUI.tab==='results'?`<label>Runda<select onchange="nhlSetFilter('round',this.value)">${['all','1','2','3','4','5','6','7'].map(v=>`<option value="${v}" ${nhlUI.round===v?'selected':''}>${v==='all'?'Alla rundor':v}</option>`).join('')}</select></label>`:''}</div>`:''}${body}<details class="mw-panel nhl-scope"><summary>Vad simuleras i den här etappen?</summary><p>32 verkliga NHL-klubbnamn; karriärens egna scoutbedömningar och draftval. Sju rundor, maximalt 224 val ur den bevakade spelarvärlden. Draftdatumet 28 juni, ordningen och fyra års rättighetstid är förenklade spelregler. Ingen full NHL-säsong, AHL, NHL-kontrakt eller automatisk Nordamerikaflytt ännu.</p><p>Känd födelsetid använder 18 år senast 15 september; annars används ett uppskattat födelseår. Tre draftår tillåts i modellen. Äldre verkliga spelares befintliga rättigheter saknas i startunderlaget och gissas inte fram. Framtida årskullar och fiktiva talanger kan väljas. En tidigare vald spelare väljs inte igen.</p><p>NHL-klubbarnas behov och rangordning är karriärens bedömningar, inte påståenden om deras verkliga scouter. Dolda potentialtak läses inte av draftmodellen. <a href="NHL-DRAFT.md" target="_blank" rel="noopener noreferrer">Spelmodell och källunderlag</a></p></details></section>`;
}
