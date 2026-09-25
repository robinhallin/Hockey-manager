"use strict";

function managerOffice2Ensure(){
  state.office2??={delegation:{training:false,medical:false,scouting:false,contracts:false},lastSeen:{}};
  state.office2.delegation??={training:false,medical:false,scouting:false,contracts:false};
  state.office2.lastSeen??={};
  return state.office2;
}
function managerOffice2Priority(level){return ({critical:100,high:75,medium:50,low:25})[level]||0;}
function managerOffice2Delegated(area){
  if(area==='training')return state.training?.recoveryOwner==='staff';
  return Boolean(state.office2?.delegation?.[area]);
}
function managerOffice2ToggleDelegation(area){
  if(!['training','medical','scouting','contracts'].includes(area))return;
  const office=managerOffice2Ensure(),next=!managerOffice2Delegated(area);
  office.delegation[area]=next;
  if(area==='training'&&state.training)assistantSetOwner('senior',next?'assistant':'manager',false);
  save();render();
}
function managerOffice2Items(){
  const items=[];
  const add=item=>items.push({owner:'Du',level:'medium',area:'general',requiresDecision:false,...item});
  for(const task of officeDecisions()){
    const must=task.tag==='Beslut'||task.tag==='Affär'||task.tag==='Ekonomi';
    add({id:'decision:'+(task.key||task.action?.messageId||task.action?.page||task.title),title:task.title,detail:task.detail,tag:task.tag,level:must?'critical':'high',score:must?110:80,requiresDecision:must,action:task.key?{deal:task.key}:task.action||null});
  }
  for(const m of state.training?.messages||[])if(m.decisionType&&!m.resolved&&!items.some(i=>i.action?.messageId===m.id))add({id:'decision:'+m.id,title:m.title,detail:m.body||'Ditt svar krävs innan tiden går vidare.',tag:'Beslut',level:'critical',score:110,requiresDecision:true,action:{messageId:m.id}});
  const roster=managerRoster();
  const injured=roster.filter(p=>!medicalReady(p)&&p.health?.injury);
  if(injured.length)add({id:'medical:injured',title:`${injured.length} spelare ej matchklara`,detail:`${injured.slice(0,2).map(p=>p.name).join(', ')}${injured.length>2?' med flera':''} kräver uttagnings- och återgångsplanering.`,tag:'Medicinskt',area:'medical',owner:managerOffice2Delegated('medical')?'Medicinska staben':'Du',level:injured.length>=3?'high':'medium',score:injured.length>=3?76:58,action:{page:'medical'}});
  const tired=roster.filter(p=>medicalReady(p)&&p.fatigue>=35);
  if(tired.length)add({id:'training:fatigue',title:`${tired.length} spelare högt belastade`,detail:'Belastningen kan påverka både träningseffekt och matchprestation inför nästa match.',tag:'Träning',area:'training',owner:managerOffice2Delegated('training')?'Tränarstaben':'Du',level:tired.length>=5?'high':'medium',score:tired.length>=5?74:54,action:{page:'training'}});
  const contracts=roster.filter(contractNeedsDecision);
  if(contracts.length)add({id:'contracts:expiring',title:`${contracts.length} kontrakt behöver plan`,detail:'Avtal på sista året bör prioriteras innan marknadsläget förändras.',tag:'Kontrakt',area:'contracts',owner:managerOffice2Delegated('contracts')?'Sportchef/stab':'Du',level:contracts.length>=4?'high':'medium',score:contracts.length>=4?72:52,action:{page:'squad',tab:'contracts'}});
  const missions=officeScoutMissions();
  if(missions.length)add({id:'scouting:missions',title:`${missions.length} aktiva scoutuppdrag`,detail:'Staben samlar observationer. Du behöver bara ingripa om prioritering eller mål ändras.',tag:'Scouting',area:'scouting',owner:managerOffice2Delegated('scouting')?'Scoutchef':'Du',level:'low',score:32,action:{page:'transfers',tab:'missions'}});
  const promises=lockerPromises().filter(({p,q,source})=>p&&!q.resolved&&source!=='Tidigare avtal'&&(!q.club||q.club===managerClub()));
  for(const {p,q,source} of promises){
    const rule=rolePromiseRule(q),left=Math.max(0,rule.total-(q.games||0)),needed=Math.max(0,rule.required-(q.qualified||0));
    const atRisk=needed>0&&left<=needed;
    add({id:`promise:${source}:${p.id}`,title:`${p.name}: följ upp istidslöftet`,
      detail:`${source} · ${q.qualified||0}/${rule.required} matcher med ${rolePromiseTarget(q)}. ${left} tillgängliga tävlingsmatcher kvar.`,
      tag:'Löfte',area:'locker',level:atRisk?'high':'medium',score:atRisk?86:56,action:{promisePlayer:p.id}});
  }
  const unread=(state.training?.messages||[]).filter(m=>!m.read&&!m.dismissed&&!m.decisionType);
  if(unread.length)add({id:'inbox:unread',title:`${unread.length} olästa rapporter`,detail:unread.slice(0,2).map(m=>m.title).join(' · '),tag:'Rapporter',area:'inbox',level:'low',score:30,action:{page:'inbox'}});
  const next=deskFixtures().upcoming[0];
  if(next){
    const days=Math.max(0,calGap(state.calendar.date,next.date));
    const score=days===0?92:days===1?84:days<=3?66:40;
    add({id:'match:'+next.date+':'+next.opponent,title:days===0?`Matchdag mot ${next.opponent}`:`${next.opponent} ${days===1?'imorgon':`om ${days} dagar`}`,detail:`${next.venue} · ${next.type}. Säkerställ kedjor, målvakt, special teams och matchplan.`,tag:'Match',area:'match',level:days===0?'critical':days===1?'high':days<=3?'medium':'low',score,action:{page:days<=1?'lines':'opponents'}});
  }
  items.push(...managerDecisionItems());
  return items.map(item=>({...item,score:(item.score??managerOffice2Priority(item.level))+(item.requiresDecision?20:0)})).sort((a,b)=>b.score-a.score||a.title.localeCompare(b.title,'sv'));
}
function managerOffice2VisibleItems(){
  const all=managerOffice2Items();
  return all.filter(item=>item.requiresDecision||!managerOffice2Delegated(item.area)||['critical','high'].includes(item.level));
}
function managerOffice2Action(item){
  if(item.id.startsWith('relationship:'))return `managerDecisionNavigate('locker','relationships')`;
  if(item.id.startsWith('formation:'))return `managerDecisionNavigate('statistics','trends')`;
  if(item.reportId!==undefined)return `matchesOpenReport(${JSON.stringify(item.reportId)})`;
  if(item.action?.promisePlayer!==undefined)return `managerOfficeOpenPromise(${JSON.stringify(item.action.promisePlayer)})`;
  if(item.action?.deal)return `officeOpenDeal(${JSON.stringify(item.action.deal)})`;
  return item.action?deskAction(item.action):'';
}
function managerOfficeOpenPromise(playerId){
  deskNavigate('locker');lockerUI.tab='promises';lockerUI.player=playerId;
  render();queueInterfaceSave();
}
function managerOffice2Row(item,index){
  const action=managerOffice2Action(item),guidance=managerDecisionGuidance(item),delegated=managerOffice2Delegated(item.area)&&!item.requiresDecision;
  return `<article class="office2-priority" data-level="${item.level}"><div class="office2-rank">${index+1}</div><div class="office2-copy"><div class="office2-meta"><span>${trainingSafe(item.tag)}</span><span>${trainingSafe(item.owner)}</span></div><strong>${trainingSafe(item.title)}</strong><p>${trainingSafe(item.detail)}</p>${guidance?`<p><strong>Val & avvägning:</strong> ${trainingSafe(guidance)}</p>`:''}</div><div class="office2-actions">${action?`<button type="button" class="desk-link" onclick="${trainingSafe(action)}">Öppna${deskIcon('arrow')}</button>`:''}${delegated?'<small>Staben hanterar rutinen</small>':''}</div></article>`;
}
function managerOffice2DelegationView(){
  const labels={training:'Träning',medical:'Medicinskt',scouting:'Scouting',contracts:'Kontrakt'};
  return `<div class="office2-delegation"><span>Staben bevakar · Ansvar & bevakning</span>${Object.entries(labels).map(([key,label])=>`<button type="button" aria-pressed="${managerOffice2Delegated(key)}" onclick="managerOffice2ToggleDelegation('${key}')">${label}</button>`).join('')}<small>Träning och medicinskt kan utföra försiktiga rutinåtgärder. Scouting och kontrakt bevakas av staben. Beslut som kräver ditt svar och högprioriterade avvikelser visas alltid.</small></div>`;
}
function managerOffice2View(){
  const all=managerOffice2Items(),items=managerOffice2VisibleItems(),must=all.filter(i=>i.requiresDecision).length,primary=items.slice(0,Math.max(5,items.filter(i=>i.requiresDecision).length)),remaining=items.slice(primary.length);
  return `<section class="office2-command" aria-label="Dagens prioriteringar"><header><div><span class="desk-kicker">DAGENS AGENDA</span><h2>Dagens prioriteringar</h2><p>${must?`${must} ärende${must===1?'':'n'} kräver ditt svar. `:''}Listan rangordnas efter deadline, matchnärhet, medicinsk risk och klubbpåverkan.</p></div><strong>${items.length}</strong></header><div class="office2-list">${primary.map(managerOffice2Row).join('')||'<p class="office-empty">Inga prioriterade ärenden just nu.</p>'}</div>${remaining.length?`<details><summary>Övriga ${remaining.length} ärenden</summary>${remaining.map((item,i)=>managerOffice2Row(item,primary.length+i)).join('')}</details>`:''}${managerOffice2DelegationView()}</section>`;
}

function officePanelTab(panel){if(!['today','followup','club'].includes(panel))return;officeUI.panel=panel;render();queueInterfaceSave();}
function officeTodayView(){
  const waiting=officeWaiting();
  return `<div class="office-today">${daySummaryView()}${managerWeekView()}${managerDayPreviewView()}<section class="office-waiting"><h3>Väntar på</h3><strong>${trainingSafe(waiting.value)}</strong><p>${trainingSafe(waiting.detail)}</p>${waiting.action?deskLink(waiting.button,waiting.action):''}</section>${managerJ20BriefView()}${managerJ20ReviewView()}</div>`;
}
function officeFollowupView(){
  return `${managerMatchLearningView()}${managerWeekFollowupView()}${managerWeekFocusView()}${deskLink('Stab & uppföljning',{page:'staffReview'})}`;
}
function officeClubView(){
  const fixtures=deskFixtures(),table=leagueTable(),index=table.findIndex(t=>t.name===managerClub()),start=Math.max(0,index-2);
  return `<section class="office-club-view"><h2>Matcher</h2><nav class="office-fixture-tabs" aria-label="Matcher på översikten">${[['upcoming','Kommande'],['recent','Resultat']].map(([key,label])=>`<button type="button" aria-pressed="${officeUI.fixtures===key}" onclick="officeFixtureTab('${key}')">${label}</button>`).join('')}</nav>${officeFixtures(officeUI.fixtures==='recent'?fixtures.recent:fixtures.upcoming,officeUI.fixtures==='recent')}<h2>${leagueName()} · grundserien</h2><table class="office-table"><thead><tr><th>#</th><th>Lag</th><th>M</th><th>P</th></tr></thead><tbody>${table.slice(start,start+5).map((t,i)=>`<tr><td>${t.gp?start+i+1:'–'}</td><th>${trainingSafe(t.name)}</th><td>${t.gp}</td><td>${t.pts}</td></tr>`).join('')}</tbody></table>${deskLink('Hela tabellen',{page:'table'})}<dl class="office-finance"><dt>Klubbkassa</dt><dd>${careerMoney(state.money)}</dd><dt>Löneutrymme före bud</dt><dd>${careerMoney(wageBudget()-annualWageCost())}</dd></dl>${deskLink('Ekonomi',{page:'finance'})}</section>`;
}
managerOfficeView=function(){return overviewDashboardView();};
