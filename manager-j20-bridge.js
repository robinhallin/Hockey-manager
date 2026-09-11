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
function managerJ20RecentForm(player,limit=5){
  if(!player)return {games:0,goals:0,assists:0,seconds:0,points:0};
  const rows=(state.juniors?.matches||[]).filter(m=>m?.j20&&m.year===state.season?.year&&m.date<=state.calendar?.date).slice(0,limit).flatMap(m=>(m.players||[]).filter(r=>String(r.id)===String(player.id)));
  return rows.reduce((o,r)=>({games:o.games+(r.seconds>0?1:0),goals:o.goals+(r.goals||0),assists:o.assists+(r.assists||0),seconds:o.seconds+(r.seconds||0),points:o.points+(r.goals||0)+(r.assists||0)}),{games:0,goals:0,assists:0,seconds:0,points:0});
}
function managerJ20Group(player){return player?.pos==='MV'?'goalie':player?.pos==='B'?'defense':'forward';}
function managerJ20SeniorNeed(player){
  const group=managerJ20Group(player),sameGroup=p=>group==='goalie'?p.pos==='MV':group==='defense'?p.pos==='B':!['MV','B'].includes(p.pos),required={goalie:2,defense:6,forward:12}[group];
  const all=managerRoster().filter(sameGroup),available=all.filter(medicalReady);
  return {group,required,total:all.length,available:available.length,shortage:Math.max(0,required-available.length),players:available};
}
function managerJ20Readiness(player){
  if(!player)return {level:'Följ vidare',detail:'Ingen junior har spelat tillräckligt för en bedömning ännu.'};
  const need=managerJ20SeniorNeed(player),seniors=need.players;
  const role=PLAYER_ROLES[player.academy?.role]||PLAYER_ROLES[juniorRoles(player)[0]],junior=attributeWeighted(ensurePlayerAttributes(player),role);
  const floor=seniors.length?Math.min(...seniors.map(p=>attributeWeighted(ensurePlayerAttributes(p),role))):junior+2;
  const gap=junior-floor,form=managerJ20RecentForm(player),ppg=form.games?form.points/form.games:0;
  if(need.shortage>0&&gap>=-2)return {level:'Aktuell vid truppbehov',detail:`A-laget saknar ${need.shortage} spelbar${need.shortage>1?'a':''} ${need.group==='goalie'?'målvakt':need.group==='defense'?'back':'forward'}${need.shortage>1?'ar':''}. J20-form: ${form.points} poäng på ${form.games} matcher.`,need};
  if(gap>=0&&form.games>=2)return {level:'A-lagsnära',detail:`Attributprofilen är i nivå med A-lagets nedre skikt. J20-form: ${form.points} poäng på ${form.games} matcher.`,need};
  if(gap>=-1.25||form.games>=3&&ppg>=1)return {level:'Knackar på dörren',detail:`Spelaren närmar sig A-laget genom profil eller form. J20-form: ${form.points} poäng på ${form.games} matcher.`,need};
  return {level:'Fortsatt J20-utveckling',detail:`Spelaren behöver fortfarande mer utveckling innan A-lagsnivån är ett naturligt nästa steg. J20-form: ${form.points} poäng på ${form.games} matcher.`,need};
}
function managerJ20Review(){
  const match=managerJ20Latest();if(!match)return null;
  const rows=(match.players||[]).filter(r=>r.seconds>0),ranked=rows.map(row=>({row,p:juniorById(row.id)})).filter(x=>x.p).sort((a,b)=>managerJ20ProspectScore(b.p,b.row)-managerJ20ProspectScore(a.p,a.row));
  const best=ranked[0]||null,readiness=managerJ20Readiness(best?.p),form=managerJ20RecentForm(best?.p),win=match.own>match.against,draw=match.own===match.against;
  return {match,best:best?.p||null,bestRow:best?.row||null,readiness,form,resultLabel:draw?'Oavgjort':win?'Seger':'Förlust'};
}
function managerJ20DecisionKey(review){return review?.best&&review?.match?`${review.match.year}:${review.match.date}:${review.best.id}`:'';}
function managerJ20Decision(review=managerJ20Review()){
  const key=managerJ20DecisionKey(review);return key?state.juniors?.managerDecisions?.[key]||null:null;
}
function managerJ20DecisionLabel(action){return action==='promote'?'Flyttad till A-laget':action==='guest'?'A-träning + J20':action==='monitor'?'Följ vidare':'Beslut registrerat';}
function managerJ20Remember(review,action){
  if(!review?.best||!review?.match)return null;
  const key=managerJ20DecisionKey(review),store=state.juniors.managerDecisions??={};
  store[key]={action,playerId:review.best.id,playerName:review.best.name,matchDate:review.match.date,decisionDate:state.calendar.date,readiness:review.readiness.level,formGames:review.form.games,formPoints:review.form.points};
  const keys=Object.keys(store);while(keys.length>60)delete store[keys.shift()];
  return store[key];
}
function managerJ20Act(id,action,matchDate){
  const review=managerJ20Review();if(!review?.best||!samePlayerId(review.best.id,id)||review.match.date!==matchDate)return false;
  const p=state.juniors.roster.find(q=>samePlayerId(q.id,id));
  if(action==='promote'){
    if(!p||juniorLocked()||p.academy?.loan)return false;
    juniorPromote(p.id);
    const promoted=managerRoster().find(q=>samePlayerId(q.id,id)&&q.academy?.path==='senior');
    if(!promoted)return false;
    managerJ20Remember(review,'promote');save();render();return true;
  }
  if(action==='guest'){
    if(!p||juniorLocked()||p.academy?.loan)return false;
    p.academy.path='guest';managerJ20Remember(review,'guest');
    juniorReport(`${p.name} får A-träning`,`Spelaren tränar med A-laget men spelar fortsatt J20. Nästa J20-rapport följer om nivån, formen och A-lagsbehovet förändras.`);
    juniorNotice(`${p.name} går in i A-träning men tillhör fortsatt J20.`);return true;
  }
  if(action==='monitor'){
    managerJ20Remember(review,'monitor');
    managerMessage(`j20-monitor:${review.match.date}:${review.best.id}`,'Följ junioren vidare',`${review.best.name} stannar i J20. Tränarstaben återkommer efter nästa spelade J20-match med en ny bedömning.`,'Junioransvarig',{link:'juniors'});
    save();render();return true;
  }
  return false;
}
function managerJ20DecisionView(review){
  const decision=managerJ20Decision(review),best=review.best;if(!best)return '';
  if(decision)return `<div class="manager-life-actions j20-decision"><span><b>Managerbeslut:</b> ${trainingSafe(managerJ20DecisionLabel(decision.action))} · ${calText(decision.decisionDate)}</span>${deskLink('Öppna juniorlaget',{page:'juniors'})}</div>`;
  const stillJunior=state.juniors?.roster?.some(p=>samePlayerId(p.id,best.id));
  if(!stillJunior)return `<div class="manager-life-actions j20-decision"><span>Spelaren tillhör redan A-truppen.</span>${deskLink('Öppna truppen',{page:'squad'})}</div>`;
  const id=JSON.stringify(String(best.id)),date=JSON.stringify(review.match.date),canPromote=review.readiness.level!=='Fortsatt J20-utveckling';
  return `<div class="manager-life-actions j20-decision"><button class="desk-link" onclick='juniorSelect(${id})'>Granska spelaren</button>${best.academy?.path==='guest'?'':`<button class="desk-link" onclick='managerJ20Act(${id},"guest",${date})'>A-träning</button>`}${canPromote?`<button class="btn" onclick='managerJ20Act(${id},"promote",${date})'>Flytta upp till A-laget</button>`:''}<button class="desk-link" onclick='managerJ20Act(${id},"monitor",${date})'>Följ vidare</button></div>`;
}
function managerJ20ReviewView(){
  if(state.season?.phase!=='regular')return '';
  const review=managerJ20Review();if(!review)return '';
  const {match,best,bestRow,readiness,form}=review,age=best?` · ${best.age} år`:'';
  return `<section class="manager-day-preview j20-review" aria-label="Senaste J20-rapport"><div><span class="desk-kicker">J20 SENAST · ${calText(match.date)}</span><strong>${managerClub()} J20 ${match.own}–${match.against} ${trainingSafe(match.opponent)} J20</strong><p>${best?`Matchens utvecklingssignal: <b>${trainingSafe(best.name)}</b>${age} · ${bestRow.goals||0} mål · ${bestRow.assists||0} assist · ${Math.round((bestRow.seconds||0)/60)} min. ${trainingSafe(readiness.level)}.`:'Ingen individuell utvecklingssignal registrerad.'}</p>${best?`<small>${trainingSafe(readiness.detail)}${form.games>1?` Senaste ${form.games}: ${form.goals}+${form.assists}.`:''}</small>`:''}</div>${managerJ20DecisionView(review)}</section>`;
}

const managerJ20MorningBase=managerLifeMorningView;
managerLifeMorningView=function(){return managerJ20MorningBase()+managerJ20ReviewView();};
