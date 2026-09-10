"use strict";
// Integration seams for the buildless career. Installed before junior-world captures
// juniorFixture. Only these implementations run; there is no second day/AI simulation.
// Keep the legacy modules readable and their unrelated entrypoints unchanged.


function calendarContinue(){
 if(careerScreen||!state.careerStarted||!managerCanPlay())return;
 ensureCalendar();ensureTrainingData();
 if(state.live&&!state.live.finished){state.page='match';save();render();return;}
 const pending=pendingManagerDecision();if(pending){openManagerMessage(pending.id);return;}
 const c=state.calendar,start=c.date,dayBefore=managerDaySnapshot();
 if(c.completedMatchDate===c.date){
  managerRoster().forEach(p=>p.fatigue=Math.max(0,p.fatigue-8));calendarStep(true);delete c.completedMatchDate;state.live=null;
  state.training.calendarKey=null;state.training.day=0;state.training.logs=[];
 }else{
  if(state.season.phase==='review'){state.page='season';save();render();return;}
  if(state.season.phase==='regular'&&enterPlayoffs())return;
  const target=calendarTarget();
  if(c.date>=target){
   const friendly=c.friendlies.find(f=>!f.played&&f.club===managerClub()&&f.date===c.date);
   if(friendly){calendarPlayFriendly(friendly.id);return;}
   if(state.season.phase==='preseason'){state.page='season';save();render();return;}
   if(state.season.phase==='playoffs'&&!currentSeasonFixture()){finishPlayoffDay();state.page='calendar';save();render();return;}
   state.live=null;state.page='match';save();render();return;
  }
  ensureTrainingData();
  if(!runTrainingSession()){
   if(pendingManagerDecision()){openManagerMessage(pendingManagerDecision().id);return;}
   calendarStep();
  }
 }
 state.page='calendar';calendarUI.date=c.date;calendarUI.month=c.date.slice(0,7);
 c.notice=`${calText(start)} är avslutad. Nu planerar du ${calText(c.date)}.`;
 managerDayComplete(dayBefore);
 save();render();
}

function juniorFixture(key){
 ensureJuniors();const s=state.juniors;if(s.lastFixture===key)return;s.lastFixture=key;
 const matchPlan=juniorMatchPlan(),playable=matchPlan.playable,opponent=['Norrvik J20','Sjöängen J20','Bergdala J20','Österhamn J20'][state.round%4];
 const rows=[];
 for(const p of s.roster){
  const a=p.academy;
  if(a.loan){const offer=JUNIOR_LOANS[a.loan.destination],quality=attributeWeighted(p.attributes,PLAYER_ROLES[a.role]);
   const minutes=p.pos==='MV'?(juniorRoll()<.55?60:0):Math.round(Math.max(0,Math.min(24,offer.minutes+(quality-offer.level)*1.5-p.fatigue/12+(juniorRoll()-.5)*6)));
   const row=juniorAppearance(p,minutes*60,offer.level,offer.name);a.loan.games+=row.seconds>0?1:0;a.loan.seconds+=row.seconds;a.loan.remaining--;
   if(a.loan.remaining<=0){juniorReport(`${p.name} är tillbaka från lån`,`${offer.name}: ${a.loan.games} matcher och ${Math.round(a.loan.seconds/60)} minuter. Läs utvecklingsrapporten innan nästa steg.`);a.loan=null;a.path='junior';}
  }else{const seconds=playable?(matchPlan.seconds.get(String(p.id))||0):0;
   rows.push(juniorAppearance(p,seconds,9,opponent));}
 }
 if(playable){const goals=rows.reduce((n,p)=>n+p.goals,0);let assistsLeft=goals*2;
  for(const row of rows){const p=s.roster.find(p=>p.id===row.id),credited=Math.min(row.assists,Math.max(0,2*(goals-row.goals)),assistsLeft);assistsLeft-=credited;p.academy.assists+=credited-row.assists;row.assists=credited;p.academy.history[0].assists=credited;}
  s.matches.unshift({year:s.year,round:state.round,opponent,own:goals,against:Math.floor(juniorRoll()*6),players:rows});s.matches=s.matches.slice(0,16);}
 for(const p of managerRoster().filter(p=>p.academy)){
  const a=p.academy,seconds=state.live?.iceTime?.[p.id]||0;a.observations=Math.min(100,a.observations+2);
  a.history.unshift({year:s.year,round:state.round,opponent:state.live?.opponent||'A-match',seconds,goals:state.live?.analysis?.players?.[p.id]?.goals||0,assists:state.live?.analysis?.players?.[p.id]?.assists||0,path:'senior'});a.history=a.history.slice(0,16);
  if(seconds>=300)a.missed=0;else if(!medicalExcused(p,300))a.missed++;
 }
 if(state.round%4===0||!playable)juniorReport('Talangernas avstämning',`${playable?'Juniorlaget har spelat sin utvecklingsmatch.':'Juniorlaget saknar spelare: minst en målvakt, två backar och tre forwards behövs.'}\n${juniorPlayers().slice().sort((a,b)=>b.academy.missed-a.academy.missed).slice(0,3).map(p=>`${p.name}: ${juniorAdvice(p)}`).join('\n')}`);
}

function aiAcademyDay(club){
 const c=clubAIState(club),a=c?.academy;if(!a||club===managerClub()||a.lastDay===state.calendar.date)return;
 a.lastDay=state.calendar.date;
 const match=state.season.phase!=='regular'&&calGap(a.lastMatch,state.calendar.date)>=7;if(match)a.lastMatch=state.calendar.date;
 const coach=rivalsClubState(club)?.coach.coaching||12;
 for(const p of a.roster){
  p.fatigue=Math.max(0,(p.fatigue||0)-8);if(!medicalCanTrain(p))continue;
  const weights=PLAYER_ROLES[p.academy.role]||PLAYER_ROLES[juniorRoles(p)[0]],keys=Object.keys(weights);
  const key=keys[(p.academy.cursor||0)%keys.length];p.academy.cursor=(p.academy.cursor||0)+1;
  const mentor=(state.clubRosters[club]||[]).filter(q=>q.age>=28&&medicalReady(q)&&worldGroup(q)===worldGroup(p)).sort((x,y)=>rivalRating(y)-rivalRating(x))[0];
  p.academy.mentor=mentor?.id??null;
  developmentAdvance(p,key,(c.project==='develop'?2:1.5)*coach/15);
  if(mentor&&p.academy.cursor%3===0)developmentAdvance(p,p.pos==='MV'?'composure':'decisions',.8);
  if(match&&p.age<=20){
   const seconds=p.pos==='MV'?1800:900;p.academy.games++;p.academy.seconds+=seconds;
   developmentAdvance(p,key,2);p.fatigue+=6;
   p.academy.history.unshift({year:state.season.year,date:state.calendar.date,opponent:'Akademins utvecklingsmatch',path:'junior',seconds,goals:0,assists:0});
   p.academy.history=p.academy.history.slice(0,6);
  }
 }
}

const dayJ20AgendaBase=calendarAgenda;
calendarAgenda=function(date){
 const html=dayJ20AgendaBase(date);
 return date===state.calendar.date?html.replace('<p class="cal-advice">',managerDayPreviewView()+managerDayReviewView()+'<p class="cal-advice">'):html;
};
const dayJ20ProfileBase=juniorProfile;
juniorProfile=function(p){return dayJ20ProfileBase(p).replace('<h3>Utvecklingsplan</h3>',juniorMatchPlanControl(p)+'<h3>Utvecklingsplan</h3>');};
const dayJ20ValidateBase=validateSaveText;
validateSaveText=function(text){
 const s=dayJ20ValidateBase(text);


const review=s.calendar?.dayReview;
 if(review&&(!review||typeof review!=='object'||!/^\d{4}-\d{2}-\d{2}$/.test(review.date)||!/^\d{4}-\d{2}-\d{2}$/.test(review.nextDate)||!Number.isInteger(review.reports)||review.reports<0||!Number.isFinite(review.moneyChange)||!Array.isArray(review.changes)||review.changes.length>3||!Array.isArray(review.headlines)||review.headlines.length>3||review.headlines.some(m=>!m||!Number.isInteger(m.id)||typeof m.title!=='string')||review.changes.some(p=>!p||typeof p.name!=='string'||!Number.isFinite(p.delta))||review.session&&(!TRAINING_SESSIONS[review.session.type]||['trained','resting','before','after','improvements'].some(k=>!Number.isFinite(review.session[k])))))throw Error('Ogiltig dagssummering.');
 for(const p of [...Object.values(s.clubRosters).flat(),...(s.juniors?.roster||[]),...Object.values(s.clubAI?.clubs||{}).flatMap(c=>c.academy?.roster||[])])if(p.academy?.matchUsage!==undefined&&!Object.hasOwn(JUNIOR_MATCH_USAGE,p.academy.matchUsage))throw Error('Ogiltig juniormatchning.');

 return s;
};
