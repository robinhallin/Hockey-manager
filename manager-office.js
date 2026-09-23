const officeUI={fixtures:'upcoming'};
function officeFixtureTab(value){if(!['upcoming','recent'].includes(value))return;officeUI.fixtures=value;officeUI.panel='club';render();queueInterfaceSave();}
// The office summarises existing systems; opening it never advances the simulation.
function officeOpenDeal(key){
  deskNavigate('transfers','deals');
  state.recruitment.focusDeal=null;
  state.loans.selected=null;
  const row=hubAffairRows().find(x=>x.key===key);
  recruitHub.affairs=row?.status==='active'?'active':row&&!['pending','counter'].includes(row.status)?'history':'open';
  recruitHub.deal=key;
  render();queueInterfaceSave();
}
function officeOpenDay(date){matchesUI.calendar='calendar';deskNavigate('calendar');calendarPick(date);queueInterfaceSave();}
function officeDecisions(){
  const tasks=deskTasks().filter(t=>['Beslut','Säsong','Ekonomi'].includes(t.tag));
  const r=state.recruitment;
  const add=(key,title,detail)=>tasks.push({key,title,detail,tag:'Affär'});
  (state.loans?.offers||[]).filter(o=>o.status==='counter').forEach(o=>add('loan:'+o.id,o.name||'Låneförhandling','Motbud om lån · granska nya villkor'));
  r.deals.filter(d=>d.status==='pending'&&d.counter).forEach(d=>add('transfer:'+d.id,d.name||'Värvning','Agentens motbud · granska nya villkor'));
  r.incoming.filter(incomingOfferOpen).forEach(d=>add('incoming:'+d.id,d.name||'Inkommande bud',`${d.buyer} · ${d.kind==='loan'?'Lånebud':careerMoney(d.fee||0)} · ${incomingStage(d)}`));
  return tasks;
}
function officeScoutMissions(){
 return [...(state.recruitment?.missions||[]).filter(m=>m.status==='active'&&(!m.club||m.club===managerClub())),...(state.recruitment?.scouting?.jobs||[]).filter(m=>m.status==='active'&&m.club===managerClub()).map(m=>({...m,nextDate:m.next}))];
}
function officeWaiting(){
  const r=state.recruitment||{},missions=officeScoutMissions(),waiting=[];
  for(const m of missions)waiting.push({date:m.nextDate,value:`${missions.length} scoutuppdrag · nästa observation`,detail:m.note||'Scouten arbetar vidare med sitt uppdrag.',tab:'missions'});
  for(const [id,c] of Object.entries(r.scouting?.contacts||{}))if(c.status==='pending'&&(!c.owner||c.owner===managerClub()))waiting.push({date:c.due,playerId:id,value:'Kontaktbesked',detail:'Spelarens och klubbens villkor väntas. Inget avtal är ingånget.',tab:'deals'});
  const deals=(r.deals||[]).filter(d=>d.status==='pending'&&!d.counter);
  for(const d of deals)waiting.push({date:d.dueDate,value:'Värvningssvar',detail:'Agent- eller klubbsvar är utestående.',tab:'deals'});
  const next=waiting.sort((a,b)=>(a.date||'9999').localeCompare(b.date||'9999'))[0];
  if(next)return {label:'Väntar på',value:next.value,detail:(next.date?`Planerat besked ${calText(next.date)}. `:'Datum saknas. ')+next.detail,action:next.playerId?{contactId:next.playerId}:{page:'transfers',tab:next.tab},button:next.tab==='missions'?'Öppna scouting':'Öppna underlaget',tone:'blue'};
  const rehab=managerRoster().filter(p=>!medicalReady(p)&&p.health?.injury);
  if(rehab.length){
    const soonest=rehab.slice().sort((a,b)=>(a.health?.injury?.remaining??999)-(b.health?.injury?.remaining??999))[0],days=soonest?.health?.injury?.remaining;
    return {label:'Väntar på',value:`${rehab.length} i rehab`,detail:Number.isFinite(days)?`${soonest.name}: cirka ${days} dagar till återgångsträning.`:'Medicinska besked följs löpande.',action:{page:'medical'},button:'Medicinsk status',tone:'blue'};
  }
  return {label:'Väntar på',value:'Inget blockerande',detail:'Inga scout-, affärs- eller rehabärenden kräver väntan just nu.',tone:'calm'};
}
function officePulse(tasks,{active,finished,matchday,pass,tired}){
  const decide={label:'Besluta nu',value:tasks.length?`${tasks.length} ${tasks.length===1?'ärende':'ärenden'}`:'Klart',detail:tasks.length?tasks[0].title:'Inga akuta beslut blockerar kalendern.',tone:tasks.length?'amber':'calm'};
  let influence;
  if(active)influence={label:'Påverka idag',value:'Matchen pågår',detail:'Taktik, byten, feedback och målvaktsbeslut påverkar matchbilden direkt.',action:{page:'match'},button:'Till matchen',tone:'green'};
  else if(finished)influence={label:'Påverka idag',value:'Följ upp matchen',detail:'Läs prestation, istid och matchbild innan nästa träningsbeslut.',action:{page:'statistics'},button:'Analysera matchen',tone:'green'};
  else if(matchday)influence={label:'Påverka idag',value:'Matchförberedelser',detail:'Kedjor, målvakt, special teams och matchplan är dagens viktigaste val.',action:{page:'lines'},button:'Förbered laget',tone:'green'};
  else if(tired.length)influence={label:'Påverka idag',value:`${tired.length} högt belastade`,detail:'Justera dagens träningsbelastning och återhämtning före nästa match.',action:{page:'training'},button:'Planera träning',tone:'green'};
  else influence={label:'Påverka idag',value:pass.name,detail:pass.description,action:{page:'training'},button:'Öppna dagens pass',tone:'green'};
  return [decide,influence,officeWaiting()];
}
function officePulseView(items){
  return `<section class="office-pulse" aria-label="Managerveckan">${items.map(item=>`<article class="office-pulse-card" data-tone="${item.tone||'calm'}"><span>${item.label}</span><strong>${trainingSafe(item.value)}</strong><p>${trainingSafe(item.detail)}</p>${item.action?deskLink(item.button,item.action):''}</article>`).join('')}</section>`;
}
function officeDecisionRow(t){
  const action=t.key?`officeOpenDeal(${JSON.stringify(t.key)})`:deskAction(t.action);
  return `<button type="button" class="office-decision" onclick="${trainingSafe(action)}"><span>${t.tag}</span><strong>${trainingSafe(t.title)}</strong><small>${trainingSafe(t.detail)}</small><b aria-hidden="true">→</b></button>`;
}
function officeFixtures(rows,played){
  return rows.length?`<table class="office-table"><thead><tr><th>Datum</th><th>Motstånd</th><th>${played?'Resultat¹':'Spelplats'}</th></tr></thead><tbody>${rows.map(g=>`<tr><td><button type="button" onclick="officeOpenDay('${g.date}')">${calText(g.date)}</button></td><td>${trainingSafe(g.opponent)}<small>${trainingSafe(g.type)}</small></td><td>${played?`${g.own??'–'} – ${g.against??'–'}`:g.venue}</td></tr>`).join('')}</tbody></table>`:`<p class="office-empty">${played?'Inga matcher spelade ännu.':'Inga kommande matcher fastställda.'}</p>`;
}
function managerOfficeView(){
  const fixtures=deskFixtures(),next=deskNextMatch(fixtures.upcoming[0]),tasks=officeDecisions(),c=state.calendar;
  const roster=managerRoster(),unavailable=roster.filter(p=>!medicalReady(p)),tired=roster.filter(p=>medicalReady(p)&&p.fatigue>=35),contracts=roster.filter(contractNeedsDecision);
  const session=calendarSession(c.date),pass=TRAINING_SESSIONS[session.type],finished=c.completedMatchDate===c.date,matchday=calendarFixtures().some(f=>f.date===c.date);
  const today=finished?'Matchdagen är spelad':matchday?'Matchdag':pass.name;
  const active=state.live&&!state.live.finished;
  const daily=active?'Matchen är igång. Se över matchplanen eller återvänd till matchvyn.':finished?'Läs matchrapporten och följ upp lagets prestation.':matchday?'Kontrollera kedjor, målvakt och matchplan inför nedsläpp.':pass.description;
  const table=leagueTable(),index=table.findIndex(t=>t.name===managerClub()),start=Math.max(0,Math.min(index-2,table.length-5)),focus=coachFocus(),pulse=officePulse(tasks,{active,finished,matchday,pass,tired});
  const status=(label,value,detail,action,buttonLabel)=>`<div class="office-status"><span>${label}</span><strong>${value}</strong><small>${trainingSafe(detail)}</small>${deskLink(buttonLabel,action)}</div>`;
  return `<section class="office-overview"><header class="office-heading"><div><span class="desk-kicker">${trainingSafe(managerClub())} · ${seasonLabel()}</span><h1>Tränarkontoret</h1></div><span>${calText(c.date)}</span></header>
  ${officePulseView(pulse)}
  <div class="office-grid">
    <section class="office-match office-next"><span class="desk-kicker">${next.eyebrow}</span><h2>${trainingSafe(next.title)}</h2>${next.score?`<strong class="office-score">${next.score}</strong>`:''}<p>${trainingSafe(next.detail)}</p>${deskLink(next.label,next.action,'btn')}<div class="office-day"><div><strong>Idag · ${today}</strong><p>${trainingSafe(daily)}</p></div><button type="button" onclick="officeOpenDay('${c.date}')">Öppna dagens program →</button></div></section>
    <section class="office-panel office-tasks"><header><h2>Att ta ställning till</h2><span class="office-count">${tasks.length}</span></header><div class="office-decisions">${tasks.map(officeDecisionRow).join('')||'<p class="office-empty">Inga svarsärenden eller akuta åtgärder just nu.</p>'}</div></section>
    <section class="office-panel office-squad"><header><h2>Truppens läge</h2>${deskLink('Öppna truppen',{page:'squad'})}</header><div class="office-status-grid">${status('Tillgängliga',`${roster.length-unavailable.length} / ${roster.length}`,unavailable.length?unavailable.length+' spelare ej matchklara':'Alla är medicinskt matchklara',{page:'medical'},'Medicinsk status')}${status('Hög belastning',tired.length,'Matchklara spelare med minst 35 % trötthet',{page:'training'},'Planera återhämtning')}${status('Kontrakt att se över',contracts.length,'Avtal på sista året',{page:'squad',tab:'contracts'},'Granska kontrakt')}</div></section>
    <section class="office-panel office-calendar"><header><h2>Matcher</h2>${deskLink('Hela kalendern',{page:'calendar'})}</header><nav class="office-fixture-tabs" aria-label="Matcher på översikten">${[['upcoming','Kommande'],['recent','Resultat']].map(([key,label])=>`<button aria-pressed="${officeUI.fixtures===key}" onclick="officeFixtureTab('${key}')">${label}</button>`).join('')}</nav><div class="office-fixtures">${officeUI.fixtures==='recent'?officeFixtures(fixtures.recent,true):officeFixtures(fixtures.upcoming.filter(g=>!active||g.date!==c.date||g.opponent!==state.live.opponent),false)}${officeUI.fixtures==='recent'&&fixtures.recent.length?'<small>¹ Ditt lags mål visas först.</small>':''}</div></section>
    <section class="office-panel office-league"><header><h2>${leagueName()} · grundserien</h2>${deskLink('Hela tabellen',{page:'table'})}</header>${table.some(t=>t.gp)?'':'<p class="office-empty">Premiären väntar. Placeringarna är ännu inte avgjorda.</p>'}<table class="office-table"><thead><tr><th>#</th><th>Lag</th><th>M</th><th>+/−</th><th>P</th></tr></thead><tbody>${table.slice(start,start+5).map((t,i)=>`<tr class="${t.name===managerClub()?'office-own':''}"><td>${table.some(x=>x.gp)?start+i+1:'–'}</td><th scope="row">${trainingSafe(t.name)}</th><td>${t.gp}</td><td>${t.gf-t.ga}</td><td>${t.pts}</td></tr>`).join('')}</tbody></table></section>
    <section class="office-panel office-club"><header><h2>Klubb & planering</h2>${deskLink('Ekonomi',{page:'finance'})}</header><dl class="office-finance"><dt>Klubbkassa</dt><dd>${careerMoney(state.money)}</dd><dt>Löneutrymme före bud</dt><dd>${careerMoney(wageBudget()-annualWageCost())}</dd></dl><div class="office-followup"><strong>${focus?'Aktivt träningsfokus':'Stabens uppföljning'}</strong><p>${focus?`${COACH_FOCUSES[focus.key].name} · ${focus.results.length}/${focus.target||3} matcher följda`:'Följ upp matchplanen och dina beslut med staben.'}</p>${deskLink('Visa råd & uppföljning',{page:'staffReview'})}</div></section>

  </div></section>`;
}

function officeOpenContact(id){
 const p=findPlayerAnywhere(id);if(!p)return;
 deskOpenPlayer(p.id,true);profileWorkspace.tab='contract';recruitHub.panel='transfer';render();deskBrowserBefore();
}
