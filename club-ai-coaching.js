"use strict";

// Shared decisions for watched fixtures and the lightweight background simulation.
// Decisions depend on observed play, not on the opponent's hidden potential.
function aiUnitScore(p,role,kind='even'){
 if(!p)return 0;
 const keys=kind==='pk'?['positioning','decisions','workRate','discipline']:
  kind==='pp'?['passing','vision','shooting','composure']:
  ['LD','RD'].includes(role)?['positioning','decisions','passing','checking']:
  role==='C'?['passing','vision','faceoffs','decisions']:['shooting','skating','puckControl','workRate'];
 const value=keys.reduce((sum,k)=>sum+rivalAttribute(p,k),0)/keys.length;
 return value*positionFit(p,role)+(role==='C'?rivalAttribute(p,'faceoffs')*.12:0)+(p.aiForm||0)*.12;
}
function aiPickUnit(pool,roles,kind,avoid=[]){
 const used=new Set(),avoided=new Set(avoid.map(String));
 return roles.map(role=>{
  const ranked=pool.filter(p=>p.pos!=='MV'&&!used.has(String(p.id))).map(p=>({p,
   score:aiUnitScore(p,role,kind)-(avoided.has(String(p.id))?5:0)})).sort((a,b)=>b.score-a.score||String(a.p.id).localeCompare(String(b.p.id)));
  // Preserve natural positions in the second unit before reusing a specialist.
  const natural=ranked.filter(({p})=>positionFit(p,role)>=.9),p=(natural.length?natural:ranked)[0]?.p;
  if(p)used.add(String(p.id));return p?.id??null;
 }).filter(id=>id!==null);
}
function aiSpecialUnits(pool){
 const ppRoles=['LD','LW','RW','RD','C'],pkRoles=['LD','RD','C','RW'];
 const pp1=aiPickUnit(pool,ppRoles,'pp'),pk1=aiPickUnit(pool,pkRoles,'pk');
 return {pp1,pp2:aiPickUnit(pool,ppRoles,'pp',pp1),pk1,pk2:aiPickUnit(pool,pkRoles,'pk',pk1)};
}
function aiRepairMatchUnits(m){
 const a=m?.aiTeam;if(!a)return;
 const dressed=new Set([...(a.forwards||[]),...(a.defense||[]),...(a.extras||[])].map(String));
 const pool=(state.clubRosters[m.opponent]||[]).filter(p=>dressed.has(String(p.id))&&medicalReady(p)&&
  (m.leagueBox?.players[m.opponent+':'+p.id]?.seconds||0)<medicalLimit(p));
 const signature=pool.map(p=>String(p.id)).join('|');
 if(a.specialRoster===signature&&a.pp1&&a.pk1)return;
 Object.assign(a,aiSpecialUnits(pool));a.specialRoster=signature;
}
function aiMatchPlan(club,opponentName,base){
 const c=state.clubAI?.clubs[club],coach=rivalsClubState(club)?.coach;
 const plan={...base,posture:'balanced',forecheck:base.style==='pressure'?'aggressive':'balanced',
  pp:coach?.style==='control'?'131':coach?.style==='pressure'?'overload':'umbrella',
  pk:coach?.style==='pressure'?'diamond':'box',shiftLimit:base.tempo==='high'?38:45,matchup:false,reason:'Tränarens grundidé.'};
 const record=c?.memory?.[opponentName],meetings=(record?.meetings||[]).filter(m=>!m.partial&&(m.year===undefined||m.year>=state.season.year-1));
 if((coach?.adaptability||0)>=12&&meetings.length>=2){
  const last=meetings.slice(-3),losses=last.filter(x=>x.gf<x.ga).length;
  if(losses>=2){
   const opponentStyle=last.at(-1).opponentStyle;
   plan.style=opponentStyle==='pressure'?'counter':opponentStyle==='counter'?'control':'pressure';
   plan.forecheck=plan.style==='pressure'?'aggressive':'balanced';
   plan.tempo=plan.style==='pressure'?'high':plan.style==='counter'?'low':'normal';
   plan.matchup=true;
   plan.reason=`Ändrad plan efter ${losses} förluster i de senaste ${last.length} mötena med ${opponentName}.`;
  }else if(last.filter(x=>x.againstShots>x.shots*1.3).length>=2){
   plan.style='counter';plan.tempo='low';plan.forecheck='balanced';plan.matchup=true;
   plan.reason=`Tätare försvar efter återkommande skottövertag för ${opponentName}.`;
  }
 }
 return plan;
}
// Stable personality derived from coach identity also supports older saves.
function aiCoachTraits(club){
 const coach=rivalsClubState(club)?.coach||{},seed=key=>attrSeed(`${coach.id||club}:match:${key}`);
 return {risk:coach.style==='pressure'?0.7:coach.style==='counter'?0.25:0.35+seed('risk')*.3,
  patience:240+Math.floor(seed('patience')*4)*120,adaptability:coach.adaptability||10,youth:Boolean(coach.youth)};
}
// Observations are match-local, bounded and serializable. Only completed time buckets enter the window.
function aiObserveMatch(holder,context){
 const rows=holder.coachObservations??=[];
 if(!rows.length||context.seconds>rows.at(-1).seconds)rows.push({seconds:context.seconds,shots:context.shots,againstShots:context.againstShots});
 while(rows.length>7)rows.shift();
 const first=rows.find(r=>r.seconds>=context.seconds-600)||rows[0];
 return {...context,windowSeconds:context.seconds-first.seconds,recentShots:Math.max(0,context.shots-first.shots),recentAgainst:Math.max(0,context.againstShots-first.againstShots)};
}
function aiCoachDecision(club,base,context){
 const {seconds,gf,ga,shots=0,againstShots=0,energy=100,strength=0,previous}=context,traits=aiCoachTraits(club);
 const adaptive=traits.adaptability>=12,late=seconds>=3000,deficit=ga-gf;
 const chasing=deficit>0&&seconds>=3000-Math.round(traits.risk*360)-(deficit>=2?240:0);
 const protecting=late&&deficit<0;
 const enough=context.windowSeconds>=traits.patience;
 const outplayed=adaptive&&enough&&context.recentAgainst>=context.recentShots*1.6+4;
 let decision={...base,posture:'balanced',tempo:base.tempo||'normal',rotation:base.rotation||'balanced',shiftLimit:base.shiftLimit||43,
  situation:'base',reason:base.reason||'Behåller grundplanen.',response:'Följ skottbild och ork innan du ändrar din plan.'};
 if(chasing)Object.assign(decision,{style:'pressure',posture:'attack',tempo:'high',rotation:'topHeavy',shiftLimit:35,situation:'chase',reason:'Jagar kvittering med mer istid för toppkedjorna.',response:'Överväg säkrare puckspel och behåll ett kontringshot när pressen ökar.'});
 else if(protecting&&traits.risk<.65)Object.assign(decision,{style:'counter',posture:'defense',tempo:'low',situation:'protect',reason:'Försvarar ledningen och sänker risken.',response:'Överväg bredare anfall och trafik framför mål; undvik att forcera passningar genom mitten.'});
 else if(outplayed)Object.assign(decision,{style:'counter',tempo:'low',matchup:true,situation:'pressure',reason:`Svarar på ${context.recentAgainst}–${context.recentShots} i skott under de senaste ${Math.round(context.windowSeconds/60)} minuterna.`,response:'Motståndaren täcker mitten. Överväg tålamod och spel längs kanterna.'});
 if(energy<55&&!(chasing&&seconds>=3360))Object.assign(decision,{tempo:'low',rotation:'rollFour',shiftLimit:30,situation:'rest',reason:'Korta byten och fyra kedjor för att avlasta trötta spelare.',response:'Motståndaren sprider istiden. Överväg att möta reservkedjor med en utvilad offensiv formation.'});
 if(strength<0)Object.assign(decision,{style:'counter',posture:'defense',tempo:'low',shiftLimit:30,situation:'pk',reason:'Prioriterar att stänga mitten i numerärt underläge.',response:'Flytta pucken mellan sidorna och skapa trafik framför målvakten.'});
 else if(strength>0)Object.assign(decision,{style:'control',posture:'attack',tempo:energy<55?'low':'normal',situation:'pp',reason:'Söker etablerat powerplay i stället för att jaga med hela laget.',response:'Håll ihop boxplay och välj pressögonblick; undvik att dras isär.'});
 // A strategic change gets time to work. Score urgency and manpower changes override patience.
 if(previous&&['base','pressure'].includes(decision.situation)&&['base','pressure'].includes(previous.situation)&&seconds-(previous.changedAt||0)<traits.patience){
  for(const key of ['style','posture','tempo','rotation','shiftLimit','matchup','situation','reason','response'])if(previous[key]!==undefined)decision[key]=previous[key];
 }
 decision.reason=decision.reason.replace(/ Ger kedja .*$/, '');
 const scores=context.linePoints||[];
 decision.hotLine=null;
 if(adaptive&&seconds>=600&&energy>=55&&strength===0&&scores.length===4){const best=scores.indexOf(Math.max(...scores));if(scores[best]>=2&&scores[best]>scores[0]&&best>0){decision.hotLine=best;decision.reason+=` Ger kedja ${best+1} fler byten efter dess poängbidrag i matchen.`;}}
 decision.forecheck=decision.style==='pressure'?'aggressive':'balanced';
 decision.timeout=seconds>=3240&&seconds<3600&&deficit>0&&deficit<=3&&strength>=0;
 decision.changedAt=previous&&aiDecisionKey(previous)===aiDecisionKey(decision)?previous.changedAt??seconds:seconds;
 return decision;
}
function aiDecisionKey(d){return [d.style,d.posture,d.tempo,d.rotation,d.situation,d.hotLine??null].join('|');}
function aiCoachRotation(plan){
 const sequence=RIVAL_ROTATIONS[plan.rotation]||RIVAL_ROTATIONS.balanced;
 return Number.isInteger(plan.hotLine)&&plan.hotLine>=1&&plan.hotLine<=3?[plan.hotLine,0,1,plan.hotLine,2,3]:sequence;
}
function aiCoachReport(club){
 const c=rivalsClubState(club),traits=aiCoachTraits(club),live=state.live?.opponent===club?state.live.aiTeam:null;
 const changes=live?.coachChanges||c.recent.at(-1)?.decisions||[];
 return `<section class="rival-panel"><h2>Tränarens matchbeslut</h2><p>${traits.risk>=.65?'Tar tidigt offensiva risker och behåller gärna initiativet i ledning.':'Väntar längre med offensiva risker och skyddar sena ledningar.'} Ger normalt en taktisk ändring ${traits.patience/60} minuter att verka.</p><p>Bedömning utifrån tränarprofil och registrerat spel. Vi känner inte motståndarens nästa beslut.</p>${changes.slice(-5).map(d=>`<article><h3>${Math.floor(d.seconds/60)} min</h3><p>${trainingSafe(d.reason)}</p>${d.response?`<p><strong>Möjligt svar:</strong> ${trainingSafe(d.response)}</p>`:''}</article>`).join('')||'<p>Matchbeslut visas när de har observerats.</p>'}<button class="btn secondary" onclick="deskNavigate('tactics')">Se över vår taktik</button></section>`;
}
function aiRecordMeeting(club,opponentName,game,report,other){
 const c=state.clubAI?.clubs[club];if(!c)return;
 const memory=c.memory[opponentName]??={meetings:[]},home=game.home===club;
 memory.meetings.push({year:state.season.year,date:game.date||state.calendar.date,gf:home?game.homeGoals:game.awayGoals,
  ga:home?game.awayGoals:game.homeGoals,shots:report?.shots||0,againstShots:other?.shots||0,
  style:report?.style||rivalPlan(club).style,opponentStyle:other?.style||
   (opponentName===managerClub()?state.tacticalPlan?.attackStyle:rivalsClubState(opponentName)?.coach.style)||'control',
  coachId:rivalsClubState(club)?.coach.id,partial:Boolean(report?.partial||other?.partial)});
 memory.meetings=memory.meetings.slice(-6);
}

function validateAICoachSave(s){
 const a=s.live?.aiTeam;if(!a)return;
 const bad=()=>{throw Error('Matchtränarens observationer är felaktiga.');};
 if(a.coachObservations!==undefined&&(!Array.isArray(a.coachObservations)||a.coachObservations.length>7||a.coachObservations.some(r=>!r||['seconds','shots','againstShots'].some(k=>!Number.isFinite(r[k])||r[k]<0))))bad();
 if(a.coachChanges!==undefined&&(!Array.isArray(a.coachChanges)||a.coachChanges.length>20||a.coachChanges.some(r=>!r||!Number.isFinite(r.seconds)||r.seconds<0||typeof r.reason!=='string'||typeof r.response!=='string')))bad();
 if(a.hotLine!=null&&(!Number.isInteger(a.hotLine)||a.hotLine<1||a.hotLine>3))bad();
}
