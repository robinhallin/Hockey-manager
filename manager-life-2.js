"use strict";

function managerLifePreviousDay(){
  const current=state.calendar.date;
  const match=(state.analysis?.matches||[]).filter(m=>m.date&&m.date<=current&&m.club===managerClub()&&!m.partial&&!m.abandoned).sort((a,b)=>b.date.localeCompare(a.date))[0]||null;
  const log=(state.training?.history||[]).filter(l=>l.date&&l.date<=current).sort((a,b)=>b.date.localeCompare(a.date))[0]||null;
  const latestDate=[match?.date,log?.date].filter(Boolean).sort().at(-1);
  if(match&&match.date===latestDate){
    const own=Number.isFinite(match.own)?match.own:'–',against=Number.isFinite(match.against)?match.against:'–';
    const result=`${managerClub()} ${own}–${against} ${match.opponent||'motståndare'}`;
    return {label:`Senast · ${calText(match.date)}`,value:result,detail:'Matchen är arkiverad. Följ upp istid, formationer och matchbild innan nästa beslut.',matchId:match.id,action:{page:'statistics'},button:'Matchanalys'};
  }
  if(log&&log.date===latestDate){
    const pass=TRAINING_SESSIONS[log.type]?.name||'Träningspass',condition=n=>Number.isFinite(n)?`${Math.round(100-n)} %`:'–';
    return {label:`Senast · ${calText(log.date)}`,value:pass,detail:`${Number.isFinite(log.trained)?log.trained:0} tränade · ${Number.isFinite(log.resting)?log.resting:0} vilade · lagets ork ${condition(log.before)} → ${condition(log.after)}.`,action:{page:'training'},button:'Utveckling'};
  }
  return {label:'Senast',value:'Ingen avslutad aktivitet',detail:'När en träningsdag eller match är färdig visas utfallet här.'};
}
function managerLifeRisk(){
  const roster=managerRoster(),unavailable=roster.filter(p=>!medicalReady(p)),tired=roster.filter(p=>medicalReady(p)&&p.fatigue>=35);
  if(unavailable.length)return {label:'Största risk',value:`${unavailable.length} ej matchklara`,detail:`${unavailable.slice(0,2).map(p=>p.name).join(', ')}${unavailable.length>2?' med flera':''}. Planera uttagning och återgång utan att överbelasta truppen.`,action:{page:'medical'},button:'Medicinsk status'};
  if(tired.length)return {label:'Största risk',value:`${tired.length} högt belastade`,detail:'Belastningen kan slå mot både träningseffekt och matchprestation. Se vilka som behöver lättare arbete eller vila.',action:{page:'training'},button:'Återhämtning'};
  const next=deskFixtures().upcoming[0],days=next?.date?calGap(state.calendar.date,next.date):null;
  if(next)return {label:'Nästa kontrollpunkt',value:`${next.opponent} ${days===0?'idag':days===1?'imorgon':`om ${days} dagar`}`,detail:`${next.venue} · ${next.type}. Använd de kommande passen för att förbereda matchplanen.`,action:{page:'opponents'},button:'Motståndsrapport'};
  return {label:'Nästa kontrollpunkt',value:'Ingen match fastställd',detail:'Fokusera på trupp, utveckling och långsiktig planering tills nästa match är satt.',action:{page:'squad'},button:'Truppen'};
}
function managerLifeAction(item){
  if(item.matchId)return `<button type="button" class="desk-link" onclick="${trainingSafe('matchesOpenReport('+JSON.stringify(item.matchId)+')')}">${trainingSafe(item.button)}${deskIcon('arrow')}</button>`;
  return item.action?deskLink(item.button,item.action):'';
}
function managerLifeMorningView(){
  const risk=managerLifeRisk(),previous=managerLifePreviousDay();
  return `<section class="manager-life-brief" aria-label="Morgonmöte"><div class="manager-life-title"><span class="desk-kicker">MORGONMÖTE</span><strong>${trainingSafe(risk.label)} · ${trainingSafe(risk.value)}</strong></div><div class="manager-life-copy"><p>${trainingSafe(risk.detail)}</p><small><b>${trainingSafe(previous.label)}:</b> ${trainingSafe(previous.value)} · ${trainingSafe(previous.detail)}</small></div><div class="manager-life-actions">${managerLifeAction(risk)}${managerLifeAction(previous)}</div></section>${managerDayPreviewView()}${managerDayReviewView()}`;
}

const managerOfficeViewBeforeLife2=managerOfficeView;
managerOfficeView=function(){
  const html=managerOfficeViewBeforeLife2();
  const marker='<div class="office-grid">';
  return html.includes(marker)?html.replace(marker,managerLifeMorningView()+marker):html;
};

// Pure preview: the same session-effect function is used by actual training.
// It is a forecast of this session, not a promise about injuries or the whole day.
function managerDayPreview(){
  const c=state.calendar,live=state.live,pending=pendingManagerDecision();
  if(!c)return null;
  if(live&&!live.finished)return {kind:'match',title:live.running?'Match pågår':'Matchen är pausad',detail:'Fortsätt tar dig tillbaka till matchen. Ingen kalenderdag förbrukas.'};
  if(pending)return {kind:'decision',title:'Ditt svar behövs',detail:pending.title+' · Kalendern går inte vidare innan samtalet är besvarat.'};
  if(c.completedMatchDate===c.date)return {kind:'debrief',title:'Avsluta matchdagen',detail:'Matchen är redan spelad. Nästa steg ger återhämtning och flyttar kalendern en dag, utan ett extra träningspass.'};
  if(state.season.phase==='review')return {kind:'season',title:'Utvärdera säsongen',detail:'Fortsätt öppnar säsongsrapporten. Kalendern flyttas inte.'};
  if(c.date>=calendarTarget())return {kind:'matchday',title:'Förbered nedsläpp',detail:'Fortsätt öppnar dagens match eller säsongsval. Inget lagpass genomförs.'};
  const session=calendarSession(c.date),definition=TRAINING_SESSIONS[session.type];
  const t=state.training;
  if(!definition||!t||t.day>=trainingDays()||t.lockedRound===state.round||(opponent()==='Ingen match'&&state.season.phase!=='preseason'))return {kind:'rest',title:'Återhämtningsdag',detail:'Ingen lagträning är schemalagd i den aktuella perioden. Kalendern går en dag framåt.'};
  const players=managerRoster(),effects=players.map(p=>trainingSessionEffect(p,session));
  const trained=effects.filter(e=>!e.rest).length,resting=effects.length-trained;
  const mean=rows=>rows.reduce((n,v)=>n+v,0)/Math.max(1,rows.length);
  const before=Math.round(mean(players.map(p=>100-p.fatigue))),after=Math.round(mean(effects.map(e=>100-e.fatigue)));
  const intensity=['recovery','matchprep'].includes(session.type)?'light':session.intensity;
  return {kind:'training',date:c.date,session:{...session},title:definition.name,trained,resting,before,after,
    detail:`${({light:'Lätt',normal:'Normal',hard:'Hård'})[intensity]} belastning · ${trained} tränar, ${resting} återhämtar sig · beräknad ork ${before} → ${after} %.`};
}
function managerDayPreviewView(){
  const preview=managerDayPreview();if(!preview)return '';
  return `<section class="manager-day-preview" aria-label="Nästa fortsättningssteg"><div><span class="desk-kicker">NÄR DU TRYCKER FORTSÄTT</span><strong>${trainingSafe(preview.title)}</strong><p>${trainingSafe(preview.detail)}</p>${preview.kind==='training'?'<small>Orkprognos direkt efter passet. Skador och övriga dagsbesked kan ändra utfallet.</small>':''}</div>${preview.kind==='training'?`<button type="button" class="desk-link" onclick="officeOpenDay('${state.calendar.date}')">Ändra dagens pass${deskIcon('arrow')}</button>`:''}</section>`;
}
function managerDaySnapshot(){
  return {date:state.calendar.date,club:managerClub(),messages:new Set((state.training?.messages||[]).map(m=>m.id)),
    money:state.money,fatigue:managerRoster().map(p=>({id:String(p.id),fatigue:p.fatigue})),
    matchId:(state.analysis?.matches||[]).find(m=>m.club===managerClub()&&m.date===state.calendar.date)?.id||null};
}
function managerDayComplete(before){
  if(!before||before.date===state.calendar.date||before.club!==managerClub())return;
  const log=(state.training?.history||[]).find(l=>l.date===before.date),messages=(state.training?.messages||[]).filter(m=>!before.messages.has(m.id));
  // Store a bounded summary of what actually ran. No fabricated explanation of causation.
  state.calendar.dayReview={club:before.club,date:before.date,nextDate:state.calendar.date,
    session:log?{type:log.type,trained:log.trained,resting:log.resting,before:log.before,after:log.after,improvements:log.improvements||0}:null,
    matchId:before.matchId,moneyChange:Math.round(state.money-before.money),
    reports:messages.length,headlines:messages.slice(0,3).map(m=>({id:m.id,title:m.title})),
    changes:managerRoster().map(p=>{const previous=before.fatigue.find(r=>r.id===String(p.id));return previous?{name:p.name,delta:Math.round(previous.fatigue-p.fatigue)}:null;}).filter(r=>r&&Math.abs(r.delta)>=1).sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta)).slice(0,3)};
}
function managerDayReviewView(){
  const r=state.calendar?.dayReview;if(!r||r.club!==managerClub()||r.nextDate!==state.calendar.date||!Array.isArray(r.changes)||!Array.isArray(r.headlines))return '';
  const s=r.session,title=s?TRAINING_SESSIONS[s.type]?.name:r.matchId?'Matchdag':'Återhämtning & klubbdag';
  return `<details class="manager-day-review"><summary>${calText(r.date)} avslutad · ${trainingSafe(title||'Klubbdag')} · ${r.reports} nya besked</summary>${s?`<p>${s.trained} tränade och ${s.resting} återhämtade sig. Ork efter lagpasset: ${Math.round(100-s.before)} → ${Math.round(100-s.after)} %. ${s.improvements} hela attributsteg.</p>`:'<p>Inget extra lagpass genomfördes.</p>'}${r.moneyChange?`<p>Klubbkassans förändring under dagssteget: ${careerMoney(r.moneyChange)}.</p>`:''}${r.changes.length?`<p>Största förändringarna i ork under hela dagen: ${r.changes.map(p=>trainingSafe(p.name)+' '+(p.delta>0?'+':'')+p.delta).join(' · ')} procentenheter.</p>`:''}${r.headlines.map(m=>`<button type="button" class="desk-link" onclick="${trainingSafe('openManagerMessage('+JSON.stringify(m.id)+')')}">${trainingSafe(m.title)} →</button>`).join('')}${r.matchId?managerLifeAction({matchId:r.matchId,button:'Öppna matchrapporten'}):''}<small>Summeringen visar faktiska förändringar, inte att en enskild order orsakade dem.</small></details>`;
}
