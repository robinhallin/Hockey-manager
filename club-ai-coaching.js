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
 const record=c?.memory?.[opponentName],meetings=record?.meetings||[];
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
function aiCoachDecision(club,base,context){
 const {seconds,gf,ga,shots=0,againstShots=0}=context,coach=rivalsClubState(club)?.coach;
 const late=seconds>=3000,adaptive=(coach?.adaptability||10)>=12;
 const outplayed=seconds>=600&&againstShots>shots*1.6+4;
 const chasing=late&&gf<ga,protecting=late&&gf>ga;
 const style=chasing?'pressure':protecting?'counter':adaptive&&outplayed?'counter':base.style;
 return {...base,style,posture:chasing?'attack':protecting?'defense':'balanced',
  tempo:chasing?'high':protecting?'low':adaptive&&outplayed?'low':base.tempo||'normal',
  forecheck:style==='pressure'?'aggressive':'balanced',
  rotation:chasing?'topHeavy':protecting?'balanced':base.rotation,
  shiftLimit:chasing?35:base.shiftLimit||43,
  matchup:Boolean(base.matchup||adaptive&&outplayed),
  timeout:seconds>=3240&&seconds<3600&&gf<ga&&ga-gf<=3,
  reason:chasing?'Jagar kvittering med mer istid för toppkedjorna.':protecting?'Försvarar ledningen och sänker risken.':adaptive&&outplayed?'Täcker mitten och söker kontringar efter motståndarens tryck.':base.reason};
}
function aiRecordMeeting(club,opponentName,game,report,other){
 const c=state.clubAI?.clubs[club];if(!c)return;
 const memory=c.memory[opponentName]??={meetings:[]},home=game.home===club;
 memory.meetings.push({year:state.season.year,date:game.date||state.calendar.date,gf:home?game.homeGoals:game.awayGoals,
  ga:home?game.awayGoals:game.homeGoals,shots:report?.shots||0,againstShots:other?.shots||0,
  style:report?.style||rivalPlan(club).style,opponentStyle:other?.style||
   (opponentName===managerClub()?state.tacticalPlan?.attackStyle:rivalsClubState(opponentName)?.coach.style)||'control',
  coachId:rivalsClubState(club)?.coach.id});
 memory.meetings=memory.meetings.slice(-6);
}
