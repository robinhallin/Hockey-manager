"use strict";

function managerLifePreviousDay(){
  const date=calAdd(state.calendar.date,-1);
  const match=(state.analysis?.matches||[]).find(m=>m.date===date&&m.club===managerClub()&&!m.partial&&!m.abandoned);
  if(match){
    const own=Number.isFinite(match.own)?match.own:'–',against=Number.isFinite(match.against)?match.against:'–';
    const result=`${managerClub()} ${own}–${against} ${match.opponent||'motståndare'}`;
    return {label:'Senast',value:result,detail:'Matchen är arkiverad. Följ upp istid, formationer och matchbild innan nästa beslut.',action:{page:'statistics'},button:'Matchanalys'};
  }
  const log=(state.training?.history||[]).find(l=>l.date===date);
  if(log){
    const pass=TRAINING_SESSIONS[log.type]?.name||'Träningspass',condition=n=>Number.isFinite(n)?`${Math.round(100-n)} %`:'–';
    return {label:'Senast',value:pass,detail:`${Number.isFinite(log.trained)?log.trained:0} tränade · ${Number.isFinite(log.resting)?log.resting:0} vilade · lagets ork ${condition(log.before)} → ${condition(log.after)}.`,action:{page:'training'},button:'Utveckling'};
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
function managerLifeAction(item){return item.action?deskLink(item.button,item.action):'';}
function managerLifeMorningView(){
  const risk=managerLifeRisk(),previous=managerLifePreviousDay();
  return `<section class="manager-life-brief" aria-label="Morgonmöte"><div class="manager-life-title"><span class="desk-kicker">MORGONMÖTE</span><strong>${trainingSafe(risk.label)} · ${trainingSafe(risk.value)}</strong></div><div class="manager-life-copy"><p>${trainingSafe(risk.detail)}</p><small><b>${trainingSafe(previous.label)}:</b> ${trainingSafe(previous.value)} · ${trainingSafe(previous.detail)}</small></div><div class="manager-life-actions">${managerLifeAction(risk)}${managerLifeAction(previous)}</div></section>`;
}

const managerOfficeViewBeforeLife2=managerOfficeView;
managerOfficeView=function(){
  const html=managerOfficeViewBeforeLife2();
  const marker='<div class="office-grid">';
  return html.includes(marker)?html.replace(marker,managerLifeMorningView()+marker):html;
};
