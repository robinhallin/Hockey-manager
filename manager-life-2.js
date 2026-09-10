"use strict";

function managerLifePreviousDay(){
  const date=calAdd(state.calendar.date,-1);
  const match=(state.analysis?.matches||[]).find(m=>m.date===date&&m.club===managerClub()&&!m.partial&&!m.abandoned);
  if(match){
    const own=Number.isFinite(match.own)?match.own:'–',against=Number.isFinite(match.against)?match.against:'–';
    const result=`${managerClub()} ${own}–${against} ${match.opponent||'motståndare'}`;
    return {label:'Gårdagen',value:result,detail:'Matchen är arkiverad. Följ upp istid, formationer och matchbild innan nästa beslut.',action:{page:'statistics'},button:'Öppna matchanalys'};
  }
  const log=(state.training?.history||[]).find(l=>l.date===date);
  if(log){
    const pass=TRAINING_SESSIONS[log.type]?.name||'Träningspass',condition=n=>Number.isFinite(n)?`${Math.round(100-n)} %`:'–';
    return {label:'Gårdagen',value:pass,detail:`${Number.isFinite(log.trained)?log.trained:0} tränade · ${Number.isFinite(log.resting)?log.resting:0} vilade · lagets ork ${condition(log.before)} → ${condition(log.after)}.`,action:{page:'training'},button:'Se utveckling'};
  }
  return {label:'Gårdagen',value:'Ingen avslutad aktivitet',detail:'När en träningsdag eller match är färdig visas utfallet här.'};
}
function managerLifePriority(tasks,context){
  if(context.active)return {label:'Dagens huvuduppgift',value:'Coacha matchen',detail:'Matchen är igång. Taktik, byten och feedback är det som kan påverka mest nu.',action:{page:'match'},button:'Till matchen'};
  if(tasks.length){
    const t=tasks[0];
    return {label:'Dagens huvuduppgift',value:t.title,detail:t.detail,action:t.key?null:t.action,onclick:t.key?`officeOpenDeal(${JSON.stringify(t.key)})`:null,button:'Ta beslut'};
  }
  if(context.matchday)return {label:'Dagens huvuduppgift',value:'Gör laget klart för match',detail:'Kontrollera kedjor, målvakt, special teams och belastning före nedsläpp.',action:{page:'lines'},button:'Förbered laget'};
  return {label:'Dagens huvuduppgift',value:context.pass.name,detail:context.pass.description,action:{page:'training'},button:'Öppna spelarutveckling'};
}
function managerLifeRisk(context){
  if(context.unavailable.length)return {label:'Största risk',value:`${context.unavailable.length} ej matchklara`,detail:`${context.unavailable.slice(0,2).map(p=>p.name).join(', ')}${context.unavailable.length>2?' med flera':''}. Planera uttagning och återgång utan att överbelasta truppen.`,action:{page:'medical'},button:'Medicinsk status'};
  if(context.tired.length)return {label:'Största risk',value:`${context.tired.length} högt belastade`,detail:'Belastningen kan slå mot både träningseffekt och matchprestation. Se vilka som behöver lättare arbete eller vila.',action:{page:'training'},button:'Planera återhämtning'};
  const next=context.nextFixture,days=next?.date?calGap(state.calendar.date,next.date):null;
  if(next)return {label:'Nästa kontrollpunkt',value:`${next.opponent} ${days===0?'idag':days===1?'imorgon':`om ${days} dagar`}`,detail:`${next.venue} · ${next.type}. Använd de kommande passen för att förbereda matchplanen.`,action:{page:'opponents'},button:'Motståndsrapport'};
  return {label:'Nästa kontrollpunkt',value:'Ingen match fastställd',detail:'Fokusera på trupp, utveckling och långsiktig planering tills nästa match är satt.',action:{page:'squad'},button:'Öppna truppen'};
}
function managerLifeAction(item){
  if(item.onclick)return `<button type="button" class="desk-link" onclick="${trainingSafe(item.onclick)}">${trainingSafe(item.button)}${deskIcon('arrow')}</button>`;
  return item.action?deskLink(item.button,item.action):'';
}
function managerLifeMorningView(){
  const tasks=officeDecisions(),roster=managerRoster(),fixtures=deskFixtures(),session=calendarSession(state.calendar.date),pass=TRAINING_SESSIONS[session.type]||TRAINING_SESSIONS.skills;
  const context={active:Boolean(state.live&&!state.live.finished),matchday:calendarFixtures().some(f=>f.date===state.calendar.date),pass,
    unavailable:roster.filter(p=>!medicalReady(p)),tired:roster.filter(p=>medicalReady(p)&&p.fatigue>=35),nextFixture:fixtures.upcoming[0]};
  const items=[managerLifePriority(tasks,context),managerLifeRisk(context),managerLifePreviousDay()];
  return `<section class="office-panel manager-life-brief" aria-label="Morgonmöte"><header><div><h2>Morgonmöte</h2><small>Vad behöver du göra, vad kan gå fel och vad hände senast?</small></div></header><div class="office-status-grid">${items.map(item=>`<article class="office-status"><span>${trainingSafe(item.label)}</span><strong>${trainingSafe(item.value)}</strong><small>${trainingSafe(item.detail)}</small>${managerLifeAction(item)}</article>`).join('')}</div></section>`;
}

const managerOfficeViewBeforeLife2=managerOfficeView;
managerOfficeView=function(){
  const html=managerOfficeViewBeforeLife2();
  const marker='<div class="office-grid">';
  return html.includes(marker)?html.replace(marker,managerLifeMorningView()+marker):html;
};
