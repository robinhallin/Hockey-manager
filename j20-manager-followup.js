"use strict";

function managerJ20LatestMatch(){
  const current=state.calendar?.date;if(!current)return null;
  return (state.juniors?.matches||[]).filter(m=>m.j20&&m.date&&m.date<=current).slice().sort((a,b)=>b.date.localeCompare(a.date)||b.round-a.round)[0]||null;
}
function managerJ20Standout(match){
  if(!match)return null;
  const rows=(match.players||[]).filter(r=>r.seconds>0).map(row=>({row,p:juniorById(row.id)})).filter(x=>x.p);
  rows.sort((a,b)=>((b.row.goals||0)*4+(b.row.assists||0)*2+b.row.seconds/1800)-((a.row.goals||0)*4+(a.row.assists||0)*2+a.row.seconds/1800)||a.p.age-b.p.age);
  return rows[0]||null;
}
function managerJ20Form(p){
  const rows=(p?.academy?.history||[]).filter(h=>h.path==='junior'&&h.year===state.season.year&&h.seconds>0).slice(0,5);
  return {games:rows.length,points:rows.reduce((n,h)=>n+(h.goals||0)+(h.assists||0),0),minutes:Math.round(rows.reduce((n,h)=>n+(h.seconds||0),0)/60)};
}
function managerJ20SeniorRadar(p){
  if(!p||p.age>20)return null;
  const group=q=>p.pos==='MV'?q.pos==='MV':p.pos==='B'?q.pos==='B':!['MV','B'].includes(q.pos);
  const seniors=managerRoster().filter(q=>!q.academy&&group(q));if(!seniors.length)return null;
  const value=q=>matchAttributeRating(q),junior=value(p),ordered=seniors.map(value).sort((a,b)=>a-b),replacement=ordered[Math.min(2,ordered.length-1)];
  const gap=+(replacement-junior).toFixed(1),form=managerJ20Form(p);
  if(gap<=.8&&form.games>=2&&form.points>=2)return {level:'ready',text:`${p.name} är nära A-lagets nuvarande breddnivå och har ${form.points} poäng på sina ${form.games} senaste J20-matcher.`};
  if(gap<=1.8&&form.games>=3&&form.points>=3)return {level:'watch',text:`${p.name} närmar sig A-lagets breddnivå. Formen är ${form.points} poäng på ${form.games} J20-matcher.`};
  return null;
}
function managerJ20FollowupView(){
  if(state.season?.phase!=='regular')return '';
  const match=managerJ20LatestMatch();if(!match)return '';
  const age=calGap(match.date,state.calendar.date);if(age<0||age>3)return '';
  const standout=managerJ20Standout(match),row=standout?.row,p=standout?.p,radar=managerJ20SeniorRadar(p),form=managerJ20Form(p);
  const result=`${match.own}–${match.against} ${match.opponent} J20`,outcome=match.own>match.against?'Seger':match.own<match.against?'Förlust':'Oavgjort';
  const detail=p?`${p.name}: ${row.goals||0}+${row.assists||0} på ${Math.round(row.seconds/60)} min. ${form.games>1?`${form.points} poäng på ${form.games} senaste J20-matcher.`:'Första registrerade formnoteringen.'}`:'Ingen individuell matchdata registrerad.';
  return `<section class="manager-day-preview j20-followup" aria-label="J20-uppföljning"><div><span class="desk-kicker">J20 UPPFÖLJNING · ${trainingSafe(outcome.toUpperCase())}</span><strong>${trainingSafe(result)}</strong><p>${trainingSafe(detail)}</p>${radar?`<small><b>A-lagsradar:</b> ${trainingSafe(radar.text)}</small>`:'<small>Juniorstaben följer utvecklingen över flera matcher innan en A-lagsrekommendation ges.</small>'}</div>${deskLink('Öppna juniorrapporten',{page:'juniors'})}</section>`;
}

const managerJ20MorningBase=managerLifeMorningView;
managerLifeMorningView=function(){return managerJ20MorningBase()+managerJ20FollowupView();};
