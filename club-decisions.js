'use strict';
// A shared view of real domain decisions. Reading never records a decision,
// advances time, changes a lineup, or creates a contract.
const clubDecisionsUI={filter:'now',player:null,notice:''};
const CLUB_PLAN_INTENTS={retain:'Försök behålla',replace:'Planera ersättare',evaluate:'Utvärdera rollen'};
function clubDecisionStore(create=false){
 const store=state.office2?.decisionWork;
 if(store?.club===managerClub())return store;
 if(!create)return null;
 return managerOffice2Ensure().decisionWork={version:1,club:managerClub(),plans:[],cases:[],lastDate:null};
}
function clubDecisionContext(){return JSON.stringify([managerClub(),state.season?.year,state.calendar?.date]);}
function clubDecisionAllowed(context){return context===clubDecisionContext()&&managerEmployed()&&!clubLocked()&&!dayTransition&&!calendarPaceRun&&!(state.live&&!state.live.finished);}
function clubDecisionCode(name,...args){return trainingSafe(name+'('+args.map(v=>JSON.stringify(v)).join(',')+')');}
function clubDecisionButton(label,name,args=[],primary=false){return `<button type="button" class="cw-button ${primary?'cw-primary':''}" onclick="${clubDecisionCode(name,...args)}">${trainingSafe(label)}</button>`;}
function clubDecisionGroupKey(item){
 const a=item.action||{};
 if(a.deal)return 'deal:'+a.deal;
 if(a.messageId!=null)return 'message:'+a.messageId;
 // Different promises/deadlines retain separate rows inside a player's case.
 const id=a.conversationPlayer??a.promisePlayer??a.developmentPlayer;
 return id!=null?'player:'+id:item.id;
}
function clubDecisionCases(){
 const groups=new Map(),date=state.calendar.date;
 for(const item of managerAgendaItems(true)){
  const key=clubDecisionGroupKey(item),a=item.action||{};
  if(!groups.has(key))groups.set(key,{key,title:item.title,items:[],room:clubhouseLifeRoom(item),score:0,required:false,due:null,playerId:a.conversationPlayer??a.promisePlayer??a.developmentPlayer??null});
  const row=groups.get(key);row.items.push(item);row.score=Math.max(row.score,item.score||0);row.required||=Boolean(item.requiresDecision);
  if(item.due&&(!row.due||item.due<row.due))row.due=item.due;
 }
 return [...groups.values()].map(row=>({...row,phase:row.required||row.due&&row.due<=date?'now':row.items.every(i=>i.monitoring||i.deferred||i.action?.conversationPlayer!=null&&i.due>date)?'waiting':'plan'})).sort((a,b)=>Number(b.required)-Number(a.required)||(a.due||'9999').localeCompare(b.due||'9999')||b.score-a.score||a.key.localeCompare(b.key));
}
function clubDecisionFingerprint(row){return JSON.stringify(row.items.map(i=>[i.id,i.detail,i.due??null]));}
function clubDecisionCapture(){
 if(!state.careerStarted||!managerEmployed())return;
 const store=clubDecisionStore(true),date=state.calendar.date,current=clubDecisionCases();
 for(const plan of store.plans)if(!plan.closed&&plan.year!==state.season.year){plan.closed=date;plan.outcome='Säsongen avslutades. '+clubPlanEvidence(plan).text;}
 for(const row of current){
  let old=store.cases.find(c=>c.key===row.key),signature=clubDecisionFingerprint(row);
  if(!old){
   if(store.cases.length>=80){const index=store.cases.findIndex(c=>c.closed);if(index<0)continue;store.cases.splice(index,1);}
   old={key:row.key,title:row.title,room:row.room,first:date,last:date,closed:null,signature:'',events:[]};store.cases.push(old);
  }
  if(old.signature!==signature||old.closed){old.events.push({date,text:row.items.map(i=>i.detail||i.title).join(' ')});old.events=old.events.slice(-8);old.signature=signature;old.last=date;old.closed=null;old.title=row.title;}
 }
 for(const old of store.cases)if(!old.closed&&!current.some(r=>r.key===old.key)){
  old.closed=date;old.last=date;
  old.events.push({date,text:managerLinkedDecisionOutcome(old.key)||'Underlaget är inte längre aktuellt. Kontrollera spelarens historik eller avtal för det faktiska utfallet.'});old.events=old.events.slice(-8);
 }
 store.lastDate=date;
}
function clubDecisionOpen(){
 clubDecisionsUI.notice='';clubDecisionsUI.filter=clubDecisionCases().some(r=>r.phase==='now')?'now':'plan';deskNavigate('inbox');inboxFilter('agenda');
}
function clubDecisionMessages(){inboxFilter('all');}
function clubDecisionFilter(filter){if(!['now','plan','waiting','history'].includes(filter))return false;clubDecisionsUI.filter=filter;render();return true;}
function clubDecisionChanges(){
 return (clubDecisionStore()?.cases||[]).filter(c=>c.last>=calAdd(state.calendar.date,-7)).sort((a,b)=>b.last.localeCompare(a.last)).slice(0,5);
}
function clubDecisionCaseView(row){
 const stored=clubDecisionStore()?.cases.find(c=>c.key===row.key),date=state.calendar.date;
 return `<article class="cw-case" data-case-key="${trainingSafe(row.key)}"><header><span class="cw-meta">${trainingSafe(CLUBHOUSE_WORKROOMS[row.room]?.title||'Kontoret')} · ${row.required?'Ditt svar krävs':row.phase==='waiting'?'Inväntar uppföljning':'Planering'}${row.due?' · '+(row.due<date?'Förfallen ':'')+calText(row.due):''}</span><h3>${trainingSafe(row.title)}</h3></header>${row.items.map(item=>{const code=managerOffice2Action(item);return `<div class="cw-case-step"><p>${trainingSafe(item.detail||'Granska det aktuella underlaget.')}</p>${managerDecisionGuidance(item)?`<p class="cw-muted">${trainingSafe(managerDecisionGuidance(item))}</p>`:''}${code?`<button type="button" class="cw-button" onclick="${trainingSafe(code)}">${row.playerId!=null?'Öppna spelarens ärende':'Granska och besluta'} →</button>`:''}${!item.requiresDecision&&item.level!=='critical'&&!item.deferred?clubDecisionButton('Påminn om tre dagar','managerAgendaSnooze',[item.id,3]):''}</div>`;}).join('')}${stored?.events.length?`<details class="cw-history"><summary>Ärendets förlopp · ${stored.events.length} avstämningar</summary>${stored.events.map(e=>`<p><time>${calText(e.date)}</time> ${trainingSafe(e.text)}</p>`).join('')}</details>`:''}</article>`;
}
function clubDecisionDailyView(){
 const rows=clubDecisionCases(),filter=clubDecisionsUI.filter,counts=Object.fromEntries(['now','plan','waiting'].map(k=>[k,rows.filter(r=>r.phase===k).length]));
 const history=(clubDecisionStore()?.cases||[]).filter(c=>c.closed).slice().sort((a,b)=>b.closed.localeCompare(a.closed)),changes=clubDecisionChanges();
 const waiting=[...(state.office2?.proposals||[]).filter(p=>p.club===managerClub()&&p.status==='accepted').map(p=>({title:STAFF_MANDATES[p.area]?.name||'Stabsförslag',text:p.outcome||'Godkänt · följs upp efter '+calText(p.target)})),...(state.managerFeedback?.followups||[]).filter(r=>r.club===managerClub()&&r.status==='active').map(r=>({title:r.name,text:`Introduktion: ${r.games}/5 bedömda matcher · ${Math.round(r.seconds/60)} minuter.`}))];
 return `<section class="cw-daily"><header class="cw-heading"><span class="cw-meta">${trainingSafe(managerClub())} · ${calText(state.calendar.date)}</span><h1>Ditt arbete i klubben</h1><p>Besluta, planera och följ upp. Samma ärende följer med mellan rummen.</p>${clubDecisionButton('Rapporter & meddelanden','clubDecisionMessages',[])}</header><nav class="cw-tabs" aria-label="Dagens ärenden">${Object.entries({now:'Behöver besked',plan:'Planera',waiting:'Väntar på',history:'Avslutade'}).map(([key,label])=>`<button type="button" aria-pressed="${filter===key}" onclick="clubDecisionFilter('${key}')">${label} <span>${key==='history'?history.length:counts[key]+(key==='waiting'?waiting.length:0)}</span></button>`).join('')}</nav>${clubDecisionsUI.notice?`<p role="status">${trainingSafe(clubDecisionsUI.notice)}</p>`:''}${filter==='history'?history.map(c=>`<details class="cw-case"><summary>${trainingSafe(c.title)} · ${calText(c.closed)}</summary>${c.events.map(e=>`<p>${calText(e.date)} · ${trainingSafe(e.text)}</p>`).join('')}</details>`).join('')||'<p class="cw-empty">Avslutade ärenden samlas här när kalendern går vidare.</p>':rows.filter(r=>r.phase===filter).map(clubDecisionCaseView).join('')||'<p class="cw-empty">Inga ärenden i detta urval.</p>'}${filter==='waiting'?waiting.map(r=>`<article class="cw-case"><h3>${trainingSafe(r.title)}</h3><p>${trainingSafe(r.text)}</p></article>`).join(''):''}${filter==='now'?`<section class="cw-section"><h2>Sedan senaste dagarna</h2>${changes.length?changes.map(c=>`<p><time>${calText(c.last)}</time> · ${trainingSafe(c.title)}${c.closed?' · avslutat':''}</p>`).join(''):'<p>Förändringar samlas efter genomförda dagar och beslut.</p>'}</section>${calendarPaceView()}`:''}${clubContractPlansView()}</section>`;
}
function clubPlanBaseline(p){return {club:getPlayerClub(p.id)||managerClub(),salary:p.salary||0,years:p.contractYears||0,role:p.promisedRole||'Rotation',trust:Math.round(p.social?.trust||0)};}
function clubPlanSet(id,intent,context){
 if(!Object.hasOwn(CLUB_PLAN_INTENTS,intent)||!clubDecisionAllowed(context))return false;
 const p=managerRoster().find(p=>samePlayerId(p.id,id));if(!p)return false;
 const s=clubDecisionStore(true),old=s.plans.find(r=>r.playerId===String(id)&&r.year===state.season.year&&!r.closed);
 if(old&&old.intent===intent)return false;
 if(s.plans.length>=60){const index=s.plans.findIndex(r=>r.closed);if(index<0)return false;s.plans.splice(index,1);}
 if(old){old.closed=state.calendar.date;old.outcome='Ersatt av en ny plan. Tidigare avstämningar bevaras.';}
 s.plans.unshift({playerId:String(id),name:p.name,year:state.season.year,intent,date:state.calendar.date,due:calAdd(state.calendar.date,28),baseline:clubPlanBaseline(p),closed:null,outcome:null});
 clubDecisionCapture();save();render();return true;
}
function clubPlanEvidence(plan){
 const p=findPlayerAnywhere(plan.playerId),b=plan.baseline;
 if(!p||getPlayerClub(p.id)!==managerClub())return {changed:true,text:p?`${p.name} finns nu i ${getPlayerClub(p.id)||'en annan miljö'}.`:'Spelaren finns inte längre i den registrerade truppen.'};
 const now=clubPlanBaseline(p),changes=[];
 if(now.years!==b.years||now.salary!==b.salary)changes.push(`Avtal ${b.years} → ${now.years} år · årslön ${careerMoney(b.salary)} → ${careerMoney(now.salary)}`);
 if(now.role!==b.role)changes.push(`Roll ${b.role} → ${now.role}`);
 if(p.futureContract)changes.push('Framtida avtal: '+p.futureContract.buyer);
 const games=(p.roleGames||[]).filter(g=>g.club===managerClub()&&g.date>=plan.date);
 return {changed:changes.length>0,text:[...changes,`${games.length} registrerade rollbedömningar sedan planen · förtroende ${b.trust} → ${now.trust}/100.`].join(' ')};
}
function clubPlanReview(id,context){
 if(!clubDecisionAllowed(context))return false;
 const p=clubDecisionStore()?.plans.find(p=>p.playerId===String(id)&&p.year===state.season.year&&!p.closed);if(!p||p.due>state.calendar.date&&!clubPlanEvidence(p).changed)return false;
 p.closed=state.calendar.date;p.outcome=clubPlanEvidence(p).text;clubDecisionCapture();save();render();return true;
}
function clubPlanAct(id,action,context){
 if(!clubDecisionAllowed(context))return false;
 const p=managerRoster().find(p=>samePlayerId(p.id,id));if(!p)return false;
 if(action==='renew'){selectPlayer(p.id);openContractNegotiation(p.id);return true;}
 if(action==='replace')return scoutingReplace(p.id);
 if(action==='talk'){playerFollowupOpen(p.id);return true;}
 if(action==='path'){if(p.academy){deskNavigate('juniors');managerJ20PathSelect(p.id);}else developmentOpenPlan(p.id);return true;}
 return false;
}
function clubContractPriority(p){
 const concern=clubPlayerPromises(p).length,missed=p.social?.missed||0,plan=clubDecisionStore()?.plans.find(r=>r.playerId===String(p.id)&&!r.closed&&r.year===state.season.year);
 return {p,plan,score:(p.futureContract?100:p.contractYears===1?30:0)+(p.promisedRole==='Nyckelspelare'?20:0)+concern*10+Math.min(20,missed*5),reason:p.futureContract?'Framtida klubbval är registrerat':concern?'Aktivt löfte behöver vägas in':missed>=2?'Användningen motsvarar inte rollen':p.contractYears===1?'Sista avtalsåret':p.age<=23?'Väg utveckling mot plats i laget':'Avtal finns'};
}
function clubContractPlansView(){
 const rows=managerRoster().map(clubContractPriority).sort((a,b)=>b.score-a.score||a.p.name.localeCompare(b.p.name,'sv')),context=clubDecisionContext(),plans=clubDecisionStore()?.plans||[];
 return `<details class="cw-section cw-contracts"><summary>Kontraktsplan & nästa års lag · ${rows.filter(r=>r.p.contractYears===1).length} utgående avtal</summary><p>Välj vilka du vill behålla, ersätta eller utvärdera. Planen bokar en avstämning om 28 dagar. Avtal, löften och scoutuppdrag beslutas separat.</p><div class="cw-table"><table><thead><tr><th>Spelare</th><th>Prioritering</th><th>Din plan</th><th>Nästa steg</th></tr></thead><tbody>${rows.map(({p,plan,reason})=>{const id=p.id;return `<tr><th>${playerReference(id,p.name)}<small>${trainingSafe(p.promisedRole||'Rotation')} · ${p.contractYears} år · ${careerMoney(p.salary)}/år</small></th><td>${trainingSafe(reason)}</td><td><label class="cw-sr" for="cw-plan-${trainingSafe(id)}">Plan för ${trainingSafe(p.name)}</label><select id="cw-plan-${trainingSafe(id)}" ${!clubDecisionAllowed(context)?'disabled':''} onchange="clubPlanSet(${trainingSafe(JSON.stringify(id))},this.value,${trainingSafe(JSON.stringify(context))})"><option value="">Välj plan</option>${Object.entries(CLUB_PLAN_INTENTS).map(([value,label])=>`<option value="${value}" ${plan?.intent===value?'selected':''}>${label}</option>`).join('')}</select>${plan?`<small>Avstämning ${calText(plan.due)}</small>`:''}</td><td>${clubDecisionButton(plan?.intent==='replace'?'Granska ersättaruppdrag':plan?.intent==='evaluate'?'Diskutera rollen':'Granska förlängning','clubPlanAct',[id,plan?.intent==='replace'?'replace':plan?.intent==='evaluate'?'talk':'renew',context])}${clubDecisionButton('Konkurrens & provperiod','clubCompetitionOpen',[id])}</td></tr>`;}).join('')}</tbody></table></div>${plans.filter(p=>!p.closed).map(p=>`<article class="cw-plan"><h3>${trainingSafe(p.name)} · ${trainingSafe(CLUB_PLAN_INTENTS[p.intent])}</h3><p>${trainingSafe(clubPlanEvidence(p).text)}</p>${p.due<=state.calendar.date||clubPlanEvidence(p).changed?clubDecisionButton('Avsluta avstämningen','clubPlanReview',[p.playerId,context]):`<small>Nästa avstämning ${calText(p.due)}</small>`}</article>`).join('')}<details><summary>Tidigare planer · ${plans.filter(p=>p.closed).length}</summary>${plans.filter(p=>p.closed).map(p=>`<p>${calText(p.closed)} · ${trainingSafe(p.name)} · ${trainingSafe(CLUB_PLAN_INTENTS[p.intent])}<br>${trainingSafe(p.outcome)}</p>`).join('')}</details></details>`;
}

// Role competition uses actual selection and explicit promises; the preview
// exposes tradeoffs without pretending that a future match is already played.
function clubPlayerPromises(p){return lockerPlayerPromises(p).filter(r=>!r.q.club||r.q.club===managerClub());}
function clubCompetition(p){
 const group=worldGroup(p),roster=managerRoster().filter(q=>worldGroup(q)===group),ids=group==='MV'?[state.lines?.goalie]:group==='B'?state.lines?.defense||[]:state.lines?.forwards||[];
 const peers=roster.filter(q=>!samePlayerId(q.id,p.id)).map(q=>({p:q,selected:ids.some(id=>samePlayerId(id,q.id)),promises:clubPlayerPromises(q).length,role:q.promisedRole||'Rotation'}));
 return {group,capacity:group==='MV'?1:group==='B'?6:12,selected:ids.some(id=>samePlayerId(id,p.id)),peers,juniors:juniorPlayers().filter(q=>!samePlayerId(q.id,p.id)&&worldGroup(q)===group&&!isOwnPlayer(q)&&!q.academy?.loan).slice(0,3)};
}
function clubTrialTradeoff(p){
 const c=clubCompetition(p);
 if(p.pos==='MV'){
  const peers=c.peers.filter(r=>medicalReady(r.p)),starts=peers.reduce((n,r)=>n+(r.role==='Nyckelspelare'?4:r.role==='Ordinarie'?2:0),3);
  return `Provperioden tar minst tre av sex matcher med minst 30 minuters istid. ${peers.map(r=>r.p.name+' ('+r.role.toLowerCase()+')').join(', ')||'Ingen annan spelklar målvakt'}. Med deras löpande rollförväntningar motsvarar planeringen ${starts} startandelar på sex matcher. ${starts>6?'Åtagandena konkurrerar om samma starter. Diskutera fördelningen innan du lämnar ett nytt besked.':'Granska även de individuella löftena innan du bestämmer fördelningen.'}`;
 }
 const selected=c.peers.filter(r=>r.selected),promised=c.peers.filter(r=>r.promises);
 return `${selected.length} andra är uttagna i samma positionsgrupp. ${promised.length} har aktiva löften. ${!c.selected?'För att ge en verklig chans behöver någon i den aktuella uppställningen lämna utrymme.':'Mer ansvar behöver rymmas tillsammans med övriga spelare.'} ${c.juniors.length?'Även '+c.juniors.map(p=>p.name).join(', ')+' söker en väg till seniorlaget.':''}`;
}
function clubCompetitionView(p){
 if(!p)return '';const c=clubCompetition(p),ctx=clubDecisionContext(),stories=(state.stories?.active||[]).filter(s=>s.club===managerClub()&&s.ids.includes(String(p.id)));
 return `<section class="cw-section cw-competition" id="cw-player-${trainingSafe(p.id)}" tabindex="-1"><h3>Platsen i laget · ${trainingSafe(p.name)}</h3><p>${c.selected?'Med i den aktuella grunduppställningen.':'Utanför den aktuella grunduppställningen.'} ${c.peers.filter(r=>medicalReady(r.p)).length} andra spelklara konkurrerar om ${c.capacity} ${c.group==='MV'?'startplats':'platser'} i positionsgruppen.</p><div class="cw-competition-grid">${c.peers.filter(r=>c.group==='MV'||r.promises||r.role==='Nyckelspelare'||r.selected).slice(0,5).map(r=>`<article><strong>${playerReference(r.p.id,r.p.name)}</strong><small>${trainingSafe(r.role)} · ${r.selected?'uttagen':'utanför'}</small><p>${r.promises?r.promises+' aktiva löften':r.p.social?.missed>=2?'Rollförväntningen behöver följas upp':'Löpande rollförväntningar gäller'}</p></article>`).join('')}</div>${c.juniors.length?`<p>Juniorer i samma grupp: ${c.juniors.map(q=>playerReference(q.id,q.name)).join(', ')}. Deras nästa steg behöver vägas mot utrymmet i seniorlaget.</p>`:''}${stories.map(s=>`<p><strong>${trainingSafe(s.title)}</strong> · ${trainingSafe(storiesNext(s))} ${clubDecisionButton('Följ satsningen','storiesOpen',[s.id])}</p>`).join('')}<details><summary>Planera en satsning och se alternativen</summary><p>${p.pos==='MV'?'En provperiod: minst 30 minuter i tre av sex tillgängliga tävlingsmatcher.':'En provperiod: minst åtta minuter i tre av fyra tillgängliga tävlingsmatcher.'} Skador, landslag och ofullständiga matcher undantas. Du ändrar själv uttagningen.</p>${clubDecisionButton('Diskutera provperiod','clubTrialStart',[p.id,ctx],true)}${clubDecisionButton('Granska utvecklingsvägen','clubPlanAct',[p.id,'path',ctx])}</details></section>`;
}
function clubTrialStart(id,context){
 if(!clubDecisionAllowed(context))return false;
 const p=managerRoster().find(p=>samePlayerId(p.id,id));if(!p||!medicalReady(p)||playerLoan(p)||internationalAway(p))return false;
 ensureStories();const existing=state.stories.active.find(s=>s.ids.includes(String(p.id)));
 if(existing){storiesOpen(existing.id);return true;}
 const story=storiesCreate('breakthrough',[p.id],p.name+': din satsning','Ni diskuterar en provperiod. Befintliga avtal och löften gäller samtidigt. Du väljer ett besked och fördelar sedan ansvaret i laguttagningen.',{storyKey:'chosen:'+p.id+':'+state.stories.matchCount});
 if(!story){clubDecisionsUI.notice='Tre historier pågår redan, eller en satsning av denna typ behöver följas upp först.';render();return false;}
 story.competitionContext={date:state.calendar.date,text:clubTrialTradeoff(p)};
 storiesChapter(story,'Vilka påverkas av satsningen?',story.competitionContext.text);
 journeyTrack(p);storiesOpen(story.id);save();return true;
}
function clubSelectionView(){
 const roster=managerRoster(),rows=roster.map(p=>({p,c:clubCompetition(p),promises:clubPlayerPromises(p)})).filter(r=>r.promises.length||r.p.promisedRole==='Nyckelspelare'&&!r.c.selected||r.p.age<=23&&r.c.selected).sort((a,b)=>b.promises.length-a.promises.length||a.p.age-b.p.age);
 return `<details class="cw-section"><summary>Uttagningens avvägningar · ${rows.length} spelare att följa</summary><p>En plats åt en spelare minskar utrymmet för andra. Uttagningen är en plan; rollöften bedöms efter faktisk matchanvändning.</p>${rows.slice(0,6).map(({p,c,promises})=>`<article class="cw-plan"><strong>${playerReference(p.id,p.name)}</strong><p>${trainingSafe(p.promisedRole||'Rotation')} · ${c.selected?'uttagen':'utanför grunduppställningen'}${promises.length?' · '+promises.length+' aktiva löften':''}.</p>${promises.map(({q})=>`<small>${trainingSafe(q.mode?rolePromiseTarget(q):q.role||'Kontrollera löftets krav i omklädningsrummet')}</small>`).join('')}${clubDecisionButton('Se konkurrens & utvecklingsväg','clubCompetitionOpen',[p.id])}</article>`).join('')||'<p>Inga särskilda avvägningar flaggas i den aktuella uttagningen.</p>'}</details>`;
}
function clubCompetitionOpen(id){const p=managerRoster().find(p=>samePlayerId(p.id,id));if(!p)return false;clubDecisionsUI.player=String(id);deskNavigate('squad');squadUI.tab='status';squadUI.player=p.id;render();const section=document.getElementById('cw-player-'+p.id);section?.focus?.({preventScroll:true});section?.scrollIntoView?.({block:'start'});return true;}
function clubRoomInsight(room){
 const ctx=clubDecisionContext(),cases=clubDecisionCases().filter(c=>c.room===room),plans=(clubDecisionStore()?.plans||[]).filter(p=>!p.closed),roster=managerRoster();
 const link=(label,page,tab)=>clubDecisionButton(label,'clubRoomNavigate',[page,tab??null]);
 let body='';
 if(room==='office'){
  const all=clubDecisionCases(),now=all.filter(r=>r.phase==='now'),planning=all.filter(r=>r.phase==='plan');
  body=`<div class="cw-stats"><span><b>${now.length}</b> Behöver besked</span><span><b>${planning.length}</b> Att planera</span><span><b>${plans.length}</b> Aktiva truppplaner</span></div><p>${now[0]?trainingSafe(now[0].title):'Inga obligatoriska besked just nu. Välj en planeringsfråga eller låt kalendern gå till nästa vägval.'}</p>${clubDecisionButton('Dagens arbete & uppföljning','clubDecisionOpen',[],true)}${clubDecisionButton('Till nästa vägval','calendarPaceStart',[])}`;
 }else if(room==='locker')body=`<p>${roster.filter(p=>(p.social?.missed||0)>=2).length} spelare har återkommande rollavvikelser. ${roster.reduce((n,p)=>n+clubPlayerPromises(p).length,0)} aktiva löften följs mot matcherna.</p>${link('Roller, konkurrens & planer','squad')}${link('Samtal & relationer','locker')}`;
 else if(room==='tactics')body=`<p>Uttagningen möter befintliga rollöften och nästa utvecklingssteg. Granska vilka som får chansen och vilka som tappar ansvar.</p>${link('Granska uttagningens avvägningar','lines')}`;
 else if(room==='ice'){
  const paths=managerJ20PathPlayers().map(p=>({p,plan:managerJ20PathPlan(p)})).filter(r=>r.plan).map(r=>({...r,status:managerJ20PathStatus(r.p,r.plan)})).filter(r=>r.status&&!r.status.complete);
  body=paths.slice(0,2).map(r=>`<p><strong>${trainingSafe(r.p.name)}</strong> · ${trainingSafe(r.status.next)}<br><small>${trainingSafe(r.status.reason)}</small></p>`).join('')||'<p>Väg träningsarbete och återhämtning mot faktisk istid. En seniorplats behöver rymmas i laguttagningen.</p>';
  body+=link('Utvecklingsvägar & seniorutrymme','juniors');
 }else if(room==='recruit')body=`<p>${roster.filter(contractNeedsDecision).length} avtal behöver en plan. Börja med befintliga spelare och interna alternativ innan du binder lön och roller.</p>${clubDecisionButton('Prioritera avtalen','clubDecisionOpen',[],true)}${link('Behov, kvalitet & ersättare','transfers','needs')}`;
 else if(room==='boardroom'){
  const b=managerRecruitmentBudget(),forecast=clubForecast();
  body=`<p>Efter reserverade spelarbud: <strong>${careerMoney(b.wageRoom)}/år</strong> i löneutrymme. Prognos om tolv månader: <strong>${careerMoney(forecast.cash)}</strong>.</p><p>${forecast.cash<0?'Nya åtaganden behöver vägas mot underskottet.':'Väg utrymmet för dagens trupp mot nästa säsongs öppna platser.'}</p>${link('Pröva åtaganden i kassaflödet','finance')}${link('Stabens mandat & nästa avstämning','staffReview')}`;
 }else if(room==='world'){
  const events=worldHockeyNews(25),opportunities=events.filter(e=>worldNewsOpportunities(e).length);
  body=`<p>${opportunities.length} registrerade klubbhändelser ger möjliga scoutspår. Det är förändrad konkurrens att undersöka, inte bekräftad säljavsikt.</p>${clubDecisionButton('Visa relevanta möjligheter','clubWorldOpportunities',[])}`;
 }
 return `<section class="cw-room-insight"><span class="cw-meta">${room==='office'?'DIN KLUBBVARDAG':'BESLUT SOM HÄNGER IHOP'}</span>${body}${room!=='office'&&cases.length?`<small>${cases.length} ärenden i området · ${cases.filter(c=>c.phase==='now').length} behöver besked</small>`:''}</section>`;
}
function clubRoomNavigate(page,tab){if(page==='lines')return roomCoachBoardOpen();deskNavigate(page,tab||undefined);return true;}
function clubWorldOpportunities(){worldWatchUI.filter='opportunities';deskNavigate('world');return true;}

// Validate active and archived club state before initial load or import.

const clubDepthValidate=validateManagerSystemsSave;
validateManagerSystemsSave=function(s){
 clubDepthValidate(s);
 const text=v=>typeof v==='string'&&v.length<=12000,date=v=>text(v)&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v));
 const fail=()=>{throw Error('Ogiltig truppplan eller ärendehistorik.');};
 for(const data of [s,...Object.values(s.managerCareer?.bank||{})]){
  const d=data.office2?.decisionWork;if(!d)continue;
  if(d.version!==1||!text(d.club)||!Array.isArray(d.plans)||d.plans.length>60||!Array.isArray(d.cases)||d.cases.length>80||d.lastDate!==null&&!date(d.lastDate))fail();
  for(const p of d.plans)if(!p||!text(p.playerId)||!text(p.name)||!Number.isInteger(p.year)||!Object.hasOwn(CLUB_PLAN_INTENTS,p.intent)||!date(p.date)||!date(p.due)||p.closed!==null&&!date(p.closed)||p.outcome!==null&&!text(p.outcome)||!p.baseline||!text(p.baseline.club)||!text(p.baseline.role)||['salary','years','trust'].some(k=>!Number.isFinite(p.baseline[k])||p.baseline[k]<0))fail();
  for(const c of d.cases)if(!c||!text(c.key)||!text(c.title)||!['office','locker','tactics','ice','recruit','boardroom','world'].includes(c.room)||!date(c.first)||!date(c.last)||c.closed!==null&&!date(c.closed)||!text(c.signature)||!Array.isArray(c.events)||c.events.length>8||c.events.some(e=>!e||!date(e.date)||!text(e.text)))fail();
 }
};
