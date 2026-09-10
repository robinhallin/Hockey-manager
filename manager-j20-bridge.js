"use strict";

function managerJ20Latest(){
  const rows=(state.juniors?.matches||[]).filter(m=>m?.j20&&m.year===state.season?.year&&m.date&&m.date<=state.calendar?.date);
  return rows.sort((a,b)=>b.date.localeCompare(a.date)||b.round-a.round)[0]||null;
}
function managerJ20ProspectScore(player,row){
  const attrs=ensurePlayerAttributes(player),role=PLAYER_ROLES[player.academy?.role]||PLAYER_ROLES[juniorRoles(player)[0]];
  const quality=attributeWeighted(attrs,role),production=(row?.goals||0)*1.4+(row?.assists||0)*.8,minutes=(row?.seconds||0)/60;
  return quality+production+Math.min(2,minutes/15)+(player.age<=18?.8:player.age===19?.4:0)-Math.max(0,(player.fatigue||0)-45)*.03;
}
function managerJ20Readiness(player){
  if(!player)return {level:'Följ vidare',detail:'Ingen junior har spelat tillräckligt för en bedömning ännu.'};
  const group=player.pos==='MV'?'goalie':player.pos==='B'?'defense':'forward';
  const seniors=managerRoster().filter(p=>!p.academy&&worldGroup(p)===group&&medicalReady(p));
  const role=PLAYER_ROLES[player.academy?.role]||PLAYER_ROLES[juniorRoles(player)[0]],junior=attributeWeighted(ensurePlayerAttributes(player),role);
  const floor=seniors.length?Math.min(...seniors.map(p=>attributeWeighted(ensurePlayerAttributes(p),role))):junior+2;
  const gap=junior-floor;
  if(gap>=0)return {level:'A-lagsnära',detail:'Attributprofilen är redan i nivå med den svagaste tillgängliga A-lagsspelaren i samma rollgrupp.'};
  if(gap>=-1.25)return {level:'Knackar på dörren',detail:'Profilen ligger nära A-lagets lägsta nivå. Nästa steg bör avgöras av form, rollbehov och matchbelastning.'};
  return {level:'Fortsatt J20-utveckling',detail:'Spelaren behöver fortfarande mer utveckling innan A-lagsnivån är ett naturligt nästa steg.'};
}
function managerJ20Review(){
  const match=managerJ20Latest();if(!match)return null;
  const rows=(match.players||[]).filter(r=>r.seconds>0),ranked=rows.map(row=>({row,p:juniorById(row.id)})).filter(x=>x.p).sort((a,b)=>managerJ20ProspectScore(b.p,b.row)-managerJ20ProspectScore(a.p,a.row));
  const best=ranked[0]||null,readiness=managerJ20Readiness(best?.p),win=match.own>match.against,draw=match.own===match.against;
  return {match,best:best?.p||null,bestRow:best?.row||null,readiness,resultLabel:draw?'Oavgjort':win?'Seger':'Förlust'};
}
function managerJ20ReviewView(){
  if(state.season?.phase!=='regular')return '';
  const review=managerJ20Review();if(!review)return '';
  const {match,best,bestRow,readiness}=review,age=best?` · ${best.age} år`:'';
  return `<section class="manager-day-preview j20-review" aria-label="Senaste J20-rapport"><div><span class="desk-kicker">J20 SENAST · ${calText(match.date)}</span><strong>${managerClub()} J20 ${match.own}–${match.against} ${trainingSafe(match.opponent)} J20</strong><p>${best?`Matchens utvecklingssignal: <b>${trainingSafe(best.name)}</b>${age} · ${bestRow.goals||0} mål · ${bestRow.assists||0} assist · ${Math.round((bestRow.seconds||0)/60)} min. ${trainingSafe(readiness.level)}.`:'Ingen individuell utvecklingssignal registrerad.'}</p>${best?`<small>${trainingSafe(readiness.detail)}</small>`:''}</div>${deskLink('Öppna juniorlaget',{page:'juniors'})}</section>`;
}

const managerJ20MorningBase=managerLifeMorningView;
managerLifeMorningView=function(){return managerJ20MorningBase()+managerJ20ReviewView();};
