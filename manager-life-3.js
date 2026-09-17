"use strict";

// Manager Life 3: turn existing career state into a short, actionable daily agenda.
(function(){
  function urgencyScore(row){return ({critical:100,high:75,medium:50,low:25})[row.urgency]||0;}
  function item(kind,title,detail,urgency,page,reason){return {kind,title,detail,urgency,page,reason};}
  window.managerLifeAgenda=function(){
    const rows=[],roster=managerRoster(),date=state.calendar?.date;
    const unavailable=roster.filter(p=>!medicalReady(p));
    if(unavailable.length)rows.push(item('medical',`${unavailable.length} spelare ej matchklara`,unavailable.slice(0,3).map(p=>p.name).join(', '),'critical','medical','Tillgänglighet påverkar dagens uttagning och belastning.'));
    const tired=roster.filter(p=>medicalReady(p)&&Number(p.fatigue)>=35).sort((a,b)=>b.fatigue-a.fatigue);
    if(tired.length)rows.push(item('load',`${tired.length} spelare behöver belastningsbeslut`,`${tired[0].name} har högst registrerad trötthet (${Math.round(tired[0].fatigue)}).`,'high','training','Återhämtning idag påverkar kommande tränings- och matchberedskap.'));
    const pending=typeof pendingManagerDecision==='function'?pendingManagerDecision():null;
    if(pending)rows.push(item('conversation',pending.title||'Spelarsamtal väntar',pending.detail||'Ett beslut blockerar fortsatt kalenderflöde.','critical','inbox','Kalendern väntar på ditt svar.'));
    const promises=(state.rolePromises?.items||state.promises||[]).filter(p=>!p.resolved&&!p.completed);
    const due=promises.filter(p=>!p.deadline||!date||p.deadline<=date||calGap(date,p.deadline)<=7);
    if(due.length)rows.push(item('promise',`${due.length} löften behöver följas upp`,'Speltid och roller bör stämmas av innan förtroendet påverkas.','high','locker','Aktiva löften ska följas över tid, inte glömmas efter dialogen.'));
    const next=typeof deskFixtures==='function'?deskFixtures().upcoming?.[0]:null;
    if(next?.date){const days=calGap(date,next.date);if(days<=2)rows.push(item('match',`${next.opponent} ${days===0?'idag':days===1?'imorgon':`om ${days} dagar`}`,`${next.venue||''}${next.type?' · '+next.type:''}`,'high','opponents','Nästa match ligger nära och bör påverka dagens prioritering.'));}
    const unread=(state.training?.messages||[]).filter(m=>m&&!m.read&&!m.dismissed);
    if(unread.length)rows.push(item('inbox',`${unread.length} olästa rapporter`,unread.slice(0,2).map(m=>m.title).filter(Boolean).join(' · '),'medium','inbox','Nya rapporter kan innehålla beslut eller förändrad information.'));
    return rows.sort((a,b)=>urgencyScore(b)-urgencyScore(a)).slice(0,5);
  };
  window.managerLifeAgendaView=function(){
    const rows=managerLifeAgenda();if(!rows.length)return '<section class="manager-agenda"><span class="desk-kicker">DAGENS AGENDA</span><strong>Inga akuta beslut</strong><p>Du kan arbeta långsiktigt med trupp, utveckling eller scouting.</p></section>';
    return `<section class="manager-agenda" aria-label="Dagens prioriteringar"><div class="manager-agenda-head"><span class="desk-kicker">DAGENS AGENDA</span><strong>${rows.length} prioriteringar</strong><small>Sorterat efter vad som kräver beslut först.</small></div><div class="manager-agenda-list">${rows.map((r,i)=>`<button type="button" class="manager-agenda-row urgency-${r.urgency}" onclick="deskNavigate('${r.page}')"><span class="manager-agenda-rank">${i+1}</span><span><b>${trainingSafe(r.title)}</b><small>${trainingSafe(r.detail)}</small><em>${trainingSafe(r.reason)}</em></span><span aria-hidden="true">→</span></button>`).join('')}</div></section>`;
  };
  if(typeof managerLifeMorningView==='function'){
    const previous=managerLifeMorningView;
    window.managerLifeMorningView=function(){return managerLifeAgendaView()+previous();};
  }
})();
