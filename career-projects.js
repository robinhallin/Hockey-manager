'use strict';
// Saved plans point to existing players, fixtures, scout jobs and negotiations.
// Results are copied only from finished authoritative match reports.
const careerProjectUI={owner:null,notice:''};
function careerProjectMessage(text){careerProjectUI.owner=state;careerProjectUI.notice=text;render();return false;}
function careerProjectNoticeView(){return careerProjectUI.owner===state&&careerProjectUI.notice?`<p class="connected-warning" role="status">${trainingSafe(careerProjectUI.notice)}</p>`:'';}
function preseasonTrials(){const p=preseasonPlan();return (p?.trials||[]).filter(t=>t.club===managerClub()&&t.year===state.season.year);}
function preseasonTrialPlayer(id){return managerRoster().find(p=>samePlayerId(p.id,id));}
function preseasonTrialEditable(){return Boolean(preseasonPlan()&&!preseasonPlan().pending&&state.season.phase==='preseason'&&managerEmployed()&&!(state.live&&!state.live.finished));}
function preseasonTrialCreate(kind,ids){
 if(!preseasonTrialEditable()||!['player','pair','goalies'].includes(kind)||!Array.isArray(ids))return false;
 const ps=[...new Set(ids.map(String))].map(preseasonTrialPlayer),count=kind==='player'?1:2;
 if(ps.length!==count||ps.some(p=>!p||!medicalAvailable(p)||internationalAway(p)||playerLoan(p))||kind==='pair'&&ps.some(p=>p.pos!=='B')||kind==='goalies'&&ps.some(p=>p.pos!=='MV')||kind==='player'&&ps[0].pos==='MV')return careerProjectMessage('Välj olika, tillgängliga spelare i rätt positionsgrupp. Ett backpar består av två backar och ett målvaktstest av två målvakter.');
 const plan=preseasonPlan();plan.trials??=[];
 if(plan.trials.length>=12||plan.trials.some(t=>t.status==='active'&&t.kind===kind&&t.ids.length===ps.length&&t.ids.every(id=>ps.some(p=>samePlayerId(p.id,id)))))return false;
 const id=`test:${plan.year}:${plan.trials.length+1}`;
 careerProjectUI.notice='';plan.trials.push({id,club:managerClub(),year:state.season.year,kind,ids:ps.map(p=>String(p.id)),names:ps.map(p=>p.name),created:state.calendar.date,status:'active',samples:[],decisions:[]});
 for(const p of ps)journeyEvent(p,`preseason-test:${managerClub()}:${id}`,'decision','Ett försäsongstest är planerat','Du följs i ett försäsongsförsök. Ingen tävlingsroll eller utlovad istid ändras.');
 managerMessage(id+':'+managerClub(),'Ett försäsongstest är planerat',ps.map(p=>p.name).join(' och ')+'. Testet följer faktisk istid och prestation. Laguttagning och matchansvar väljer du separat.','Försäsong',{link:'season'});
 save();render();return id;
}
function preseasonTrialPlace(id){
 const t=preseasonTrials().find(t=>t.id===id&&t.status==='active');if(!preseasonTrialEditable()||!t)return false;
 if(state.live?.finished)return careerProjectMessage('Avsluta matchdagen innan du placerar spelare till nästa försök. Matchrapporten och eftersnacket ligger kvar tills dess.');
 const ps=t.ids.map(preseasonTrialPlayer);if(ps.some(p=>!p||!medicalAvailable(p)||internationalAway(p)))return false;
 if(t.kind==='goalies'){
  preseasonPlan().goaliesTrial=t.id;preseasonSettings('assistant','goalies');return true;
 }
 ensureLines();const slots=t.kind==='pair'?[['defense',2],['defense',3]]:[[ps[0].pos==='B'?'defense':'forwards',ps[0].pos==='B'?2:ps[0].pos==='C'?4:ps[0].pos==='HF'?5:3]];
 for(let i=0;i<slots.length;i++){
  const [type,index]=slots[i],from=personalMatchSlot(ps[i]);
  if(positionFit(ps[i],lineupRole(type,index))<.9||state.tacticsLocks?.club===managerClub()&&(state.tacticsLocks.slots?.[type+'-'+index]||from&&state.tacticsLocks.slots?.[from.type+'-'+from.index]))return false;
 }
 // The button explicitly takes responsibility for this selection. No promises,
 // medical exceptions or playing minutes are granted by placing a player.
 preseasonSettings('manager','chemistry');
 for(let i=0;i<slots.length;i++)changeLinePlayer(slots[i][0],slots[i][1],ps[i].id);
 t.decisions.push({kind:'placed',date:state.calendar.date});t.decisions=t.decisions.slice(-16);save();render();return true;
}
function preseasonTrialGoalies(available){
 const plan=preseasonPlan(),t=preseasonTrials().find(t=>t.id===plan?.goaliesTrial&&t.status==='active'&&t.kind==='goalies');
 const all=available.filter(p=>p.pos==='MV'),selected=t&&all.filter(p=>t.ids.some(id=>samePlayerId(id,p.id)));
 return selected?.length?selected:all;
}
function preseasonTrialRecord(f,m){
 const report=(state.analysis?.matches||[]).find(r=>r.finished&&r.friendly&&!r.partial&&!r.abandoned&&r.club===managerClub()&&r.year===state.season.year&&r.date===f.date&&r.opponent===f.opponent);
 if(!report||!m.finished)return;
 const fresh=[];
 for(const t of preseasonTrials()){
  if(t.status!=='active'||t.club!==managerClub()||t.created>f.date||t.samples.some(s=>s.fixtureId===String(f.id)))continue;
  const players=t.ids.map(id=>{
   const r=report.players?.find(p=>samePlayerId(p.id,id)),perf=(report.performance?.rows||m.performance?.rows||[]).find(p=>samePlayerId(p.id,id));
   return {id,seconds:r?.seconds||0,goals:r?.goals||0,assists:r?.assists||0,saves:perf?.saves||0,against:perf?.against||0,grade:perf?performanceScore(perf):null};
  });
  const units=t.kind==='pair'?(report.units||[]).filter(u=>u.kind==='defense'&&t.ids.every(id=>u.ids.some(other=>samePlayerId(id,other)))):[];
  const together=units.reduce((v,u)=>({seconds:v.seconds+(u.seconds||0),for:v.for+(u.dangerFor||0),against:v.against+(u.dangerAgainst||0)}),{seconds:0,for:0,against:0});
  t.samples.push({fixtureId:String(f.id),matchId:String(report.id),date:f.date,opponent:f.opponent,own:f.own,against:f.against,players,together});t.samples=t.samples.slice(-6);
  for(const row of players){const p=preseasonTrialPlayer(row.id);if(p)journeyEvent(p,`preseason-result:${managerClub()}:${t.id}:${f.id}`,'decision','Försäsongstestets matchunderlag',`${f.opponent}: ${analysisTime(row.seconds)} istid, ${row.goals}+${row.assists}. Träningsmatch; tävlingslöften bedöms separat.`,{matchId:String(report.id)});}
  fresh.push(t.names.join(' och ')+': '+players.map(p=>Math.round(p.seconds/60)+' min').join(' / '));
 }
 if(fresh.length)managerMessage(`preseason-test-result:${managerClub()}:${state.season.year}:${f.id}`,'Nytt underlag från försäsongstesterna',fresh.join('. ')+'. Granska faktisk användning och välj vad du vill pröva nästa gång. Tävlingslöften bedöms separat.','Försäsong',{link:'season'});
}
function preseasonTrialDecide(id,kind){
 const t=preseasonTrials().find(t=>t.id===id&&t.status==='active');if(!preseasonTrialEditable()||!t||!['keep','revise','end'].includes(kind)||!t.samples.length)return false;
 if(kind==='keep'&&!t.samples.some(s=>s.players.some(p=>p.seconds>=300)))return false;
 if(t.decisions.at(-1)?.kind===kind&&t.decisions.at(-1)?.date===state.calendar.date)return false;
 t.decisions.push({kind,date:state.calendar.date});t.decisions=t.decisions.slice(-16);if(kind==='end')t.status='closed';
 const label={keep:'Du vill bygga vidare på försäsongsförsöket',revise:'Du vill pröva en annan användning',end:'Försäsongsförsöket avslutades'}[kind];
 for(const playerId of t.ids){const p=preseasonTrialPlayer(playerId);if(p)journeyEvent(p,`preseason-review:${managerClub()}:${t.id}:${state.calendar.date}:${kind}`,'decision',label,'Beslutet bygger på registrerat matchunderlag. Uttagning och faktisk istid avgör nästa försök; inga tävlingsroller eller avtal ändras.');}
 save();render();if(kind==='revise')deskNavigate('lines');return true;
}
function preseasonTrialView(t){
 const safe=trainingSafe,can=preseasonTrialEditable()&&t.status==='active',last=t.decisions.at(-1),labels={placed:'Uppställningen förbereddes',keep:'Du vill bygga vidare på försöket',revise:'Du vill pröva en annan användning',end:'Försöket avslutades'};
 return `<article class="career-project" data-preseason-trial="${safe(t.id)}"><header><div><span class="coach-meta">${t.kind==='pair'?'TESTA ETT BACKPAR':t.kind==='goalies'?'JÄMFÖR MÅLVAKTER':'GE EN SPELARE EN RIKTIG CHANS'} · ${t.status==='active'?'PÅGÅENDE':'AVSLUTAT'}</span><h3>${safe(t.names.join(' och '))}</h3></div><span>${t.samples.length} matcher följda</span></header>${last?`<p>${safe(labels[last.kind])} · ${safe(calText(last.date))}. Det ändrar inga roller eller avtal.</p>`:''}${t.samples.length?t.samples.map(s=>`<details class="trial-match"><summary>${safe(calText(s.date))} · ${safe(s.opponent)} · ${s.own}–${s.against}</summary>${s.players.map((p,i)=>`<p><strong>${safe(t.names[i])}</strong> · ${analysisTime(p.seconds)} istid · ${p.goals}+${p.assists}${p.grade!=null?' · betyg '+performanceNumber(p.grade):''}${t.kind==='goalies'?' · '+p.saves+' räddningar / '+(p.saves+p.against)+' skott':''}${p.seconds===0?' · Inget spelunderlag i denna match':''}</p>`).join('')}${t.kind==='pair'?`<p>${analysisTime(s.together.seconds)} tillsammans · ${s.together.for}–${s.together.against} farliga lägen vid registrerat spel. Kort istid visar ingen säker trend.</p>`:''}<button class="coach-link" onclick="matchesOpenReport('${safe(s.matchId)}')">Granska matchunderlaget →</button></details>`).join(''):'<p>Inget matchunderlag ännu. Försöket registrerar det som faktiskt händer; ett planerat test garanterar ingen istid.</p>'}${can?`<div class="connected-actions"><button class="btn secondary" onclick="preseasonTrialPlace('${safe(t.id)}')">${t.kind==='goalies'?'Låt assistenten rotera de här målvakterna':'Placera i testformationen · jag coachar'}</button>${t.samples.length?`<button class="btn secondary" onclick="preseasonTrialDecide('${safe(t.id)}','keep')" ${t.samples.some(s=>s.players.some(p=>p.seconds>=300))?'':'disabled'}>Bygg vidare på försöket</button><button class="coach-link" onclick="preseasonTrialDecide('${safe(t.id)}','revise')">Pröva annan användning →</button><button class="coach-link" onclick="preseasonTrialDecide('${safe(t.id)}','end')">Avsluta försöket</button>`:''}</div>`:''}</article>`;
}
function preseasonExperimentsView(){
 const plan=preseasonPlan();if(!plan||plan.hasPreseason===false)return '<p>Ingen aktuell försäsong att planera.</p>';
 const roster=managerRoster().filter(p=>medicalAvailable(p)&&!internationalAway(p)&&!playerLoan(p)),options=ps=>ps.map(p=>`<option value="${trainingSafe(p.id)}">${trainingSafe(p.name)} · ${p.age} år</option>`).join('');
 return `<section class="preseason-experiments" aria-label="Försäsongens testplan"><header><span class="coach-meta">LÄR KÄNNA LAGET FÖRE PREMIÄREN</span><h2>Vad vill du pröva?</h2>${careerProjectNoticeView()}<p>Välj en spelare, ett backpar eller två målvakter att följa. Efter varje träningsmatch får du verklig istid och prestation, med samma motor och medicinska begränsningar som tidigare.</p></header>${preseasonTrialEditable()?`<div class="trial-forms"><form onsubmit="event.preventDefault();preseasonTrialCreate('player',[this.elements.player.value])"><h3>Testa en större roll</h3><label>Spelare<select name="player">${options(roster.filter(p=>p.pos!=='MV').sort((a,b)=>a.age-b.age))}</select></label><button class="btn secondary">Planera spelarens test</button></form><form onsubmit="event.preventDefault();preseasonTrialCreate('pair',[this.elements.first.value,this.elements.second.value])"><h3>Pröva ett backpar</h3><label>Första backen<select name="first">${options(roster.filter(p=>p.pos==='B'))}</select></label><label>Andra backen<select name="second">${options(roster.filter(p=>p.pos==='B').slice(1).concat(roster.filter(p=>p.pos==='B').slice(0,1)))}</select></label><button class="btn secondary">Planera backparets test</button></form><form onsubmit="event.preventDefault();preseasonTrialCreate('goalies',[this.elements.first.value,this.elements.second.value])"><h3>Jämför målvakterna</h3><label>Första målvakten<select name="first">${options(roster.filter(p=>p.pos==='MV'))}</select></label><label>Andra målvakten<select name="second">${options(roster.filter(p=>p.pos==='MV').slice(1).concat(roster.filter(p=>p.pos==='MV').slice(0,1)))}</select></label><button class="btn secondary">Planera målvaktstestet</button></form></div>`:''}${preseasonTrials().map(preseasonTrialView).join('')}<p class="connected-note">Matchansvar: ${plan.owner==='assistant'?'assistenten':'du'}. ${PRESEASON_APPROACHES[plan.approach]?.name||''}. Testformationer ändras bara med knappen ovan. Låsta platser och otillgängliga spelare flyttas inte. Enskilda träningsmatcher bevisar inte vem som är bäst.</p><div class="connected-actions"><button class="btn secondary" onclick="deskNavigate('lines')">Välj nästa matchlag</button><button class="coach-link" onclick="deskNavigate('season')">Ansvar, matcher & försäsongsrapport →</button></div>${plan.report?`<details><summary>Assistentens slutrapport</summary><p>${trainingSafe(plan.report).replace(/\n/g,'<br>')}</p></details>`:''}</section>`;
}

function recruitProjectStore(create=false){
 const o=scoutingOffice();if(!o)return null;
 if(o.projects?.club!==managerClub()){if(!create)return null;o.projects={club:managerClub(),nextId:1,items:[]};}
 return o.projects;
}
function recruitProjectCreate(profile,replacementId,horizon,maxSalary,maxFee,deadline){
 maxSalary=Number(maxSalary);maxFee=Number(maxFee);
 const p=replacementId?managerRoster().find(p=>samePlayerId(p.id,replacementId)):null;
 if(loanLocked()||!managerEmployed()||!RECRUIT_PROFILES[profile]||!['now','next'].includes(horizon)||replacementId&&!p||!Number.isFinite(maxSalary)||maxSalary<=0||maxSalary>50000000||!Number.isFinite(maxFee)||maxFee<0||maxFee>100000000||!/^\d{4}-\d{2}-\d{2}$/.test(deadline)||calAdd(deadline,0)!==deadline||deadline<state.calendar.date||calGap(state.calendar.date,deadline)>730)return false;
 if(p&&!RECRUIT_PROFILES[profile].positions.includes(p.pos))return careerProjectMessage('Den valda profilen passar inte spelarens position. Välj en profil i samma positionsgrupp eller ett behov utan namngiven ersättare.');
 const store=recruitProjectStore(true);store.items=store.items.filter(p=>p.status==='active').concat(store.items.filter(p=>p.status==='closed').slice(0,60));if(store.items.filter(p=>p.status==='active').length>=8)return false;
 const project={id:`recruit:${state.season.year}:${store.nextId++}`,club:managerClub(),year:state.season.year,profile,replacementId:p?String(p.id):null,replacementName:p?.name||null,horizon,maxSalary,maxFee,deadline,created:state.calendar.date,status:'active',candidates:[],internal:null};
 careerProjectUI.notice='';store.items.unshift(project);save();render();return project.id;
}
function recruitProject(id){return recruitProjectStore()?.items.find(p=>p.id===id&&p.club===managerClub())||null;}
function recruitProjectCandidate(id,playerId){
 const p=recruitProject(id),candidate=findPlayerAnywhere(playerId);if(!p||p.status!=='active'||loanLocked()||!candidate||isOwnPlayer(candidate)||!RECRUIT_PROFILES[p.profile].positions.includes(candidate.pos)||p.candidates.length>=4||p.candidates.some(c=>samePlayerId(c.id,playerId)))return false;
 p.candidates.push({id:String(candidate.id),name:candidate.name,date:state.calendar.date});save();render();return true;
}
function recruitProjectBrief(id,person){
 const p=recruitProject(id);if(!p||p.status!=='active'||loanLocked()||!scoutingStaff().some(s=>scoutingPerson(s)===person))return false;
 // Build the real scout draft. Starting it is a separate, priced confirmation.
 scoutDesk.draft=null;scoutingBrief(p.profile,'Ordinarie',p.maxSalary,45,p.horizon,person,'ALL','all','possible',p.replacementId||'');
 const d=scoutDesk.draft;if(!d)return false;
 d.players=d.players.filter(id=>{const q=findPlayerAnywhere(id);return q&&scoutingCost(q).feeLow<=p.maxFee;});
 d.criteria={...d.criteria,projectId:p.id,maxFee:p.maxFee};
 if(!d.players.length){render();return false;}
 for(const id of d.players)if(p.candidates.length<4&&!p.candidates.some(c=>samePlayerId(c.id,id))){const q=findPlayerAnywhere(id);p.candidates.push({id:String(id),name:q.name,date:state.calendar.date});}
 save();render();return true;
}
function recruitProjectInternal(id,playerId){
 const p=recruitProject(id),q=managerRoster().find(q=>samePlayerId(q.id,playerId))||juniorPlayers().find(q=>samePlayerId(q.id,playerId));
 if(!p||p.status!=='active'||loanLocked()||!q||!RECRUIT_PROFILES[p.profile].positions.includes(q.pos)||playerLoan(q)||internationalAway(q)||!medicalAvailable(q))return false;
 p.internal={id:String(q.id),name:q.name,date:state.calendar.date};save();render();return true;
}
function recruitProjectClose(id){const p=recruitProject(id);if(!p||p.status!=='active'||loanLocked())return false;p.status='closed';save();render();return true;}
function recruitProjectProgress(p){
 const ids=p.candidates.map(c=>c.id),deals=(state.recruitment.deals||[]).filter(d=>(d.buyer||managerClub())===managerClub()&&ids.some(id=>samePlayerId(id,d.playerId))&&(!d.date||d.date>=p.created));
 const registered=p.candidates.map(c=>findPlayerAnywhere(c.id)).filter(q=>q&&isOwnPlayer(q));
 const future=p.candidates.map(c=>findPlayerAnywhere(c.id)).filter(q=>q?.futureContract?.buyer===managerClub());
 const jobs=(scoutingOffice()?.jobs||[]).filter(j=>j.club===managerClub()&&j.criteria?.projectId===p.id);
 const pending=deals.filter(d=>d.status==='pending');
 return {deals,jobs,registered,future,pending,label:registered.length?'Spelare registrerad':future.length?'Framtida avtal klart':pending.length?'Förhandling pågår':jobs.some(j=>j.status==='active')?'Scouten arbetar':jobs.length?'Scoutunderlag levererat':p.internal?'Intern lösning planerad':p.candidates.length?'Kandidater att bedöma':'Behovet är formulerat'};
}
function recruitProjectView(p){
 const safe=trainingSafe,progress=recruitProjectProgress(p),profile=RECRUIT_PROFILES[p.profile],internal=[...managerRoster(),...juniorPlayers()].filter(q=>profile.positions.includes(q.pos)&&!samePlayerId(q.id,p.replacementId)&&!playerLoan(q)),external=state.recruitment.shortlist.map(findPlayerAnywhere).filter(q=>q&&!isOwnPlayer(q)&&profile.positions.includes(q.pos)&&!p.candidates.some(c=>samePlayerId(c.id,q.id)));
 return `<article class="career-project" data-recruit-project="${safe(p.id)}"><header><div><span class="coach-meta">${safe(progress.label)} · ${p.status==='closed'?'ARKIVERAT':p.horizon==='next'?'NÄSTA SÄSONG':'AKTUELLT LAGBYGGE'}</span><h3>${p.replacementName?'Ersätt '+safe(p.replacementName):safe(p.profile)}</h3></div><span>${safe(calText(p.deadline))}</span></header><p>Profil: ${safe(p.profile)} · högst ${money(p.maxSalary)} i årslön och ${money(p.maxFee)} i övergångssumma. Ramarna är en plan; ingen kassa eller lönebudget reserveras.</p>${p.internal?`<p>Intern plan: ${playerReference(p.internal.id,p.internal.name)}. Uttagning, eventuellt senioravtal och utvecklingsväg behöver fortfarande beslutas.</p>`:''}${progress.registered.length?`<p>${progress.registered.map(q=>playerReference(q.id,q.name)).join(', ')} finns nu i truppen. Följ faktisk roll och istid efter ankomsten.</p>`:''}<div class="project-pipeline">${['Behov','Scouting','Förhandling','Registrering'].map((s,i)=>`<span data-reached="${i===0||i===1&&progress.jobs.length>0||i===2&&progress.deals.length>0||i===3&&progress.registered.length>0}">${s}</span>`).join('')}</div>${p.candidates.map(c=>{const q=findPlayerAnywhere(c.id),cost=q&&scoutingCost(q),d=progress.pending.find(d=>samePlayerId(d.playerId,c.id));return `<details><summary>${safe(c.name)}${q&&isOwnPlayer(q)?' · i truppen':d?' · pågående bud':''}</summary>${q?`<p>${scoutingMoneyRange(q,'salary')} i bedömd årslön · ${scoutingMoneyRange(q,'fee')} i övergång. ${cost.known?'Kontaktbesked finns.':'Kostnader och intresse är ännu osäkra.'}</p>${!isOwnPlayer(q)&&(cost.low>p.maxSalary||cost.feeLow>p.maxFee)?'<p class="connected-warning">Nuvarande kostnadsunderlag ligger över projektets ram. Bedöm om planen ska ändras före ett bud.</p>':''}<button class="coach-link" onclick="deskOpenPlayer('${safe(c.id)}',true)">Granska kandidat & villkor →</button>${d?`<button class="coach-link" onclick="officeOpenDeal('transfer:${d.id}')">Öppna den riktiga förhandlingen →</button>`:''}${squadDecisionImpactView(q,'arrival')}${clubVisionImpact(q,'arrival')}`:'<p>Aktivt spelarunderlag saknas. Tidigare kandidatval ligger kvar i projektjournalen.</p>'}</details>`;}).join('')}${p.status==='active'?`<div class="project-forms"><form onsubmit="event.preventDefault();recruitProjectBrief('${safe(p.id)}',this.elements.scout.value)"><label>Ansvarig scout<select name="scout">${scoutingStaff().map(s=>`<option value="${safe(scoutingPerson(s))}" ${scoutingBusy(s)?'disabled':''}>${safe(s.name)}${scoutingBusy(s)?' · upptagen':''}</option>`).join('')}</select></label><button class="btn secondary">Förbered ett riktigt scoutuppdrag</button><small>Pris och kapacitet granskas i nästa steg. Ingen avgift betalas här.</small></form><form onsubmit="event.preventDefault();recruitProjectCandidate('${safe(p.id)}',this.elements.candidate.value)"><label>Knyt en bevakad kandidat<select name="candidate">${external.map(q=>`<option value="${safe(q.id)}">${safe(q.name)}</option>`).join('')}</select></label><button class="btn secondary" ${external.length?'':'disabled'}>Lägg till kandidaten</button><button type="button" class="coach-link" onclick="deskNavigate('transfers','search')">Sök fler spelare →</button></form><form onsubmit="event.preventDefault();recruitProjectInternal('${safe(p.id)}',this.elements.internal.value)"><label>Bedöm en intern lösning<select name="internal">${internal.map(q=>`<option value="${safe(q.id)}">${safe(q.name)} · ${q.age} år${isOwnPlayer(q)?' · A-truppen':' · junior'}</option>`).join('')}</select></label><button class="btn secondary" ${internal.length?'':'disabled'}>Planera den interna vägen</button></form></div><button class="coach-link" onclick="recruitProjectClose('${safe(p.id)}')">Arkivera planeringen</button>`:''}</article>`;
}
function recruitProjectsView(){
 const safe=trainingSafe,projects=recruitProjectStore()?.items||[],roster=managerRoster().filter(p=>!playerLoan(p));
 return `<section class="recruit-projects" aria-label="Ditt lagbygge"><header><span class="coach-meta">BEHOV → ALTERNATIV → FÖRHANDLING → PLATS I LAGET</span><h2>Ett uppdrag för laget</h2>${careerProjectNoticeView()}<p>Följ samma behov från intern lösning och scoutuppdrag till faktiskt avtal och registrering.</p></header><details class="project-create" ${projects.some(p=>p.status==='active')?'':'open'}><summary>Formulera ett rekryteringsuppdrag</summary><form onsubmit="event.preventDefault();recruitProjectCreate(this.elements.profile.value,this.elements.replacement.value,this.elements.horizon.value,this.elements.salary.value,this.elements.fee.value,this.elements.deadline.value)"><label>Spelarprofil<select name="profile">${Object.keys(RECRUIT_PROFILES).map(k=>`<option>${safe(k)}</option>`).join('')}</select></label><label>Vem kan behöva ersättas?<select name="replacement"><option value="">Ett nytt behov utan namngiven ersättare</option>${roster.map(p=>`<option value="${safe(p.id)}">${safe(p.name)} · ${p.pos} · ${p.contractYears} kontraktsår</option>`).join('')}</select></label><label>Tidshorisont<select name="horizon"><option value="now">Nuvarande lag</option><option value="next">Nästa säsong</option></select></label><label>Högsta årslön<input name="salary" type="number" min="1" max="50000000" value="1000000" required></label><label>Högsta övergångssumma<input name="fee" type="number" min="0" max="100000000" value="1500000" required></label><label>Behovet ska bedömas senast<input name="deadline" type="date" min="${state.calendar.date}" value="${calAdd(state.calendar.date,30)}" required></label><button class="btn secondary" ${loanLocked()?'disabled':''}>Skapa lagets uppdrag</button></form></details>${projects.filter(p=>p.status==='active').map(recruitProjectView).join('')}${projects.some(p=>p.status==='closed')?`<details><summary>Arkiverade rekryteringsuppdrag</summary>${projects.filter(p=>p.status==='closed').map(recruitProjectView).join('')}</details>`:''}</section>`;
}
function validateCareerProjects(s){
 const obj=v=>v&&typeof v==='object'&&!Array.isArray(v),str=v=>typeof v==='string'&&v.length<12000,date=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v,num=v=>Number.isFinite(v)&&v>=0,fail=()=>{throw Error('Ogiltiga försäsongstester eller rekryteringsuppdrag.');};
 for(const c of [s,...Object.values(s.managerCareer?.bank||{})]){
  const tests=c.preseasonCoach?.trials;if(tests!==undefined){
   if(!Array.isArray(tests)||tests.length>12)fail();const ids=new Set();
   for(const t of tests){if(!obj(t)||!str(t.id)||ids.has(t.id)||!str(t.club)||t.club!==c.preseasonCoach.club||!Number.isInteger(t.year)||t.year!==c.preseasonCoach.year||!['player','pair','goalies'].includes(t.kind)||!['active','closed'].includes(t.status)||!date(t.created)||!Array.isArray(t.ids)||t.ids.length!==(t.kind==='player'?1:2)||new Set(t.ids).size!==t.ids.length||t.ids.some(id=>!str(id))||!Array.isArray(t.names)||t.names.length!==t.ids.length||t.names.some(n=>!str(n))||!Array.isArray(t.samples)||t.samples.length>6||!Array.isArray(t.decisions)||t.decisions.length>16)fail();ids.add(t.id);
    if(t.decisions.some(d=>!obj(d)||!date(d.date)||!['placed','keep','revise','end'].includes(d.kind)))fail();const seen=new Set();
    for(const m of t.samples){if(!obj(m)||!str(m.fixtureId)||seen.has(m.fixtureId)||!str(m.matchId)||!date(m.date)||m.date<t.created||!str(m.opponent)||!num(m.own)||!num(m.against)||!Array.isArray(m.players)||m.players.length!==t.ids.length||!obj(m.together)||['seconds','for','against'].some(k=>!num(m.together[k])))fail();seen.add(m.fixtureId);for(const p of m.players)if(!obj(p)||!t.ids.includes(p.id)||['seconds','goals','assists','saves','against'].some(k=>!num(p[k]))||p.grade!==null&&(!num(p.grade)||p.grade>10))fail();}
   }
  }
  const projects=c.recruitment?.scouting?.projects;if(projects!==undefined){
   if(!obj(projects)||!str(projects.club)||!Number.isInteger(projects.nextId)||projects.nextId<1||!Array.isArray(projects.items)||projects.items.length>80)fail();const ids=new Set();
   for(const p of projects.items){if(!obj(p)||!str(p.id)||ids.has(p.id)||p.club!==projects.club||!Number.isInteger(p.year)||!RECRUIT_PROFILES[p.profile]||!['now','next'].includes(p.horizon)||!['active','closed'].includes(p.status)||!num(p.maxSalary)||p.maxSalary<=0||p.maxSalary>50000000||!num(p.maxFee)||p.maxFee>100000000||!date(p.created)||!date(p.deadline)||p.deadline<p.created||p.replacementId!==null&&!str(p.replacementId)||p.replacementName!==null&&!str(p.replacementName)||!Array.isArray(p.candidates)||p.candidates.length>4||new Set(p.candidates.map(c=>c.id)).size!==p.candidates.length||p.candidates.some(c=>!obj(c)||!str(c.id)||!str(c.name)||!date(c.date))||p.internal!==null&&(!obj(p.internal)||!str(p.internal.id)||!str(p.internal.name)||!date(p.internal.date)))fail();ids.add(p.id);}
  }
 }
}
function careerProjectAgendaItems(){
 const rows=[];
 for(const p of recruitProjectStore()?.items||[]){
  if(p.status!=='active')continue;const progress=recruitProjectProgress(p),near=calGap(state.calendar.date,p.deadline)<=3;
  rows.push({id:'recruit-project:'+p.id,title:(p.replacementName?'Ersätt '+p.replacementName:p.profile)+': '+progress.label.toLocaleLowerCase('sv'),detail:`${money(p.maxSalary)} i årslön · ${money(p.maxFee)} i övergång. Bedöm senast ${calText(p.deadline)}. ${p.internal?'En intern väg är planerad; uttagning och eventuellt avtal återstår.':'Följ samma behov genom scoutunderlag, förhandling och registrering.'}`,tag:'Lagbygget',area:'recruitment',owner:'Du',due:p.deadline,level:near?'high':'medium',score:near?82:58,action:{page:'transfers',tab:'needs'}});
 }
 for(const t of preseasonTrials()){
  const sample=t.samples.at(-1),decision=t.decisions.filter(d=>['keep','revise','end'].includes(d.kind)).at(-1);
  if(t.status!=='active'||!sample||decision&&decision.date>=sample.date)continue;
  rows.push({id:'preseason-test:'+t.id+':'+sample.fixtureId,title:t.names.join(' och ')+': bedöm försäsongstestet',detail:`Senast ${calText(sample.date)} mot ${sample.opponent}: ${sample.players.map(p=>analysisTime(p.seconds)).join(' / ')} faktisk istid. Välj vad du vill pröva nästa gång.`,tag:'Försäsongstest',area:'training',owner:'Du',level:'high',score:74,action:{page:'season'}});
 }
 return rows;
}
function careerProjectSignals(includeOptional=true){
 const rows=[];
 for(const p of recruitProjectStore()?.items||[]){
  if(p.status!=='active'||p.internal)continue;const progress=recruitProjectProgress(p);
  if(!progress.registered.length&&!progress.future.length&&calGap(state.calendar.date,p.deadline)<=1)rows.push({key:'recruit-project-deadline:'+p.id,kind:'projects',title:'Dags att bedöma lagbygget: '+(p.replacementName||p.profile),action:{page:'transfers'},urgent:true});
 }
 if(includeOptional)for(const item of careerProjectAgendaItems().filter(i=>i.id.startsWith('preseason-test:')))rows.push({key:item.id,kind:'projects',title:item.title,action:{page:'season'}});
 return rows;
}
