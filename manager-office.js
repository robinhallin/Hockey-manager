// The office summarises existing systems; opening it never advances the simulation.
function officeOpenDeal(key){
  deskNavigate('transfers','deals');
  state.recruitment.focusDeal=null;
  state.loans.selected=null;
  recruitHub.affairs='open';
  recruitHub.deal=key;
  render();queueInterfaceSave();
}
function officeOpenDay(date){deskNavigate('calendar');calendarPick(date);queueInterfaceSave();}
function officeDecisions(){
  const tasks=deskTasks().filter(t=>['Beslut','Säsong','Ekonomi'].includes(t.tag));
  const r=state.recruitment;
  const add=(key,title,detail)=>tasks.push({key,title,detail,tag:'Affär'});
  (state.loans?.offers||[]).filter(o=>o.status==='counter').forEach(o=>add('loan:'+o.id,o.name||'Låneförhandling','Motbud om lån · granska nya villkor'));
  r.deals.filter(d=>d.status==='pending'&&d.counter).forEach(d=>add('transfer:'+d.id,d.name||'Värvning','Agentens motbud · granska nya villkor'));
  r.incoming.filter(d=>d.status==='pending'&&d.expires>=r.tick).forEach(d=>add('incoming:'+d.id,d.name||'Försäljningsbud',`${d.buyer||'En klubb'} erbjuder ${careerMoney(d.fee||0)}`));
  return tasks;
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
  const daily=finished?'Läs matchrapporten och följ upp lagets prestation.':matchday?'Kontrollera kedjor, målvakt och matchplan inför nedsläpp.':pass.description;
  const table=leagueTable(),index=table.findIndex(t=>t.name===managerClub()),start=Math.max(0,Math.min(index-2,table.length-5)),focus=coachFocus();
  const status=(label,value,detail,action)=>`<div class="office-status"><span>${label}</span><strong>${value}</strong><small>${trainingSafe(detail)}</small>${deskLink('Visa →',action)}</div>`;
  return `<section class="office-overview"><header class="office-heading"><div><span class="desk-kicker">${trainingSafe(managerClub())} · ${seasonLabel()}</span><h1>Tränarkontoret</h1></div><span>${calText(c.date)}</span></header>
  <div class="office-grid"><div class="office-main">
    <section class="office-match"><span class="desk-kicker">${next.eyebrow}</span><h2>${trainingSafe(next.title)}</h2>${next.score?`<strong class="office-score">${next.score}</strong>`:''}<p>${trainingSafe(next.detail)}</p>${deskLink(next.label,next.action,'btn')}<div class="office-day"><div><strong>Idag · ${today}</strong><p>${trainingSafe(daily)}</p></div><button type="button" onclick="officeOpenDay('${c.date}')">Öppna dagens program →</button></div></section>
    <section class="office-panel"><header><h2>Truppens läge</h2>${deskLink('Öppna truppen →',{page:'squad'})}</header><div class="office-status-grid">${status('Tillgängliga',`${roster.length-unavailable.length} / ${roster.length}`,unavailable.length?unavailable.length+' spelare ej matchklara':'Alla är medicinskt matchklara',{page:'medical'})}${status('Hög belastning',tired.length,'Matchklara spelare med minst 35 % trötthet',{page:'training'})}${status('Kontrakt att se över',contracts.length,'Avtal på sista året',{page:'squad',tab:'contracts'})}</div></section>
    <section class="office-panel"><header><h2>Matcher</h2>${deskLink('Hela kalendern →',{page:'calendar'})}</header><div class="office-fixtures"><div><h3>Kommande</h3>${officeFixtures(fixtures.upcoming,false)}</div><div><h3>Senast spelade</h3>${officeFixtures(fixtures.recent,true)}${fixtures.recent.length?'<small>¹ Ditt lags mål visas först.</small>':''}</div></div></section>
  </div><aside class="office-side">
    <section class="office-panel"><header><h2>Att ta ställning till</h2><span class="office-count">${tasks.length}</span></header><div class="office-decisions">${tasks.map(officeDecisionRow).join('')||'<p class="office-empty">Inga svarsärenden eller akuta åtgärder just nu.</p>'}</div></section>
    <section class="office-panel"><header><h2>${leagueName()} · grundserien</h2>${deskLink('Hela tabellen →',{page:'table'})}</header>${table.some(t=>t.gp)?'':'<p class="office-empty">Premiären väntar. Placeringarna är ännu inte avgjorda.</p>'}<table class="office-table"><thead><tr><th>#</th><th>Lag</th><th>M</th><th>+/−</th><th>P</th></tr></thead><tbody>${table.slice(start,start+5).map((t,i)=>`<tr class="${t.name===managerClub()?'office-own':''}"><td>${table.some(x=>x.gp)?start+i+1:'–'}</td><th scope="row">${trainingSafe(t.name)}</th><td>${t.gp}</td><td>${t.gf-t.ga}</td><td>${t.pts}</td></tr>`).join('')}</tbody></table></section>
    <section class="office-panel"><header><h2>Klubb & planering</h2>${deskLink('Ekonomi →',{page:'finance'})}</header><dl class="office-finance"><dt>Klubbkassa</dt><dd>${careerMoney(state.money)}</dd><dt>Löneutrymme före bud</dt><dd>${careerMoney(wageBudget()-annualWageCost())}</dd></dl><div class="office-followup"><strong>${focus?'Aktivt träningsfokus':'Stabens uppföljning'}</strong><p>${focus?`${COACH_FOCUSES[focus.key].name} · ${focus.results.length}/${focus.target||3} matcher följda`:'Följ upp matchplanen och dina beslut med staben.'}</p>${deskLink('Visa råd & uppföljning →',{page:'staffReview'})}</div></section>
  </aside></div></section>`;
}
