"use strict";
function assistantSetOwner(group,value,persist=true){
 if(!['senior','junior'].includes(group)||!['manager','assistant'].includes(value))return;
 const data=group==='junior'?state.juniors:state.training;if(!data)return;
 const players=group==='junior'?juniorPlayers().filter(p=>!isOwnPlayer(p)):managerRoster();
 for(const p of players)if(p.trainingFocusManual==null)p.trainingFocusManual=p.developmentFocus!=='Balanserad';
 data.assistantOwner=value;
 if(group==='senior'){data.recoveryOwner=value==='assistant'?'staff':'manager';if(state.office2?.delegation)state.office2.delegation.training=value==='assistant';}
 if(persist){save();render();}
}
function assistantFocus(p){
 const role=p.academy?.role||[...roleWeights(p)].sort((a,b)=>attributeWeighted(p.attributes,PLAYER_ROLES[b])-attributeWeighted(p.attributes,PLAYER_ROLES[a]))[0],weights=PLAYER_ROLES[role]||PLAYER_ROLES[p.pos==='MV'?'Målvakt':'Tvåvägsforward'];
 const options=Object.entries(TRAINING_FOCUSES).filter(([label,key])=>key&&validPlayerFocus(p,label)&&weights[key]);
 options.sort((a,b)=>(weights[b[1]]||0)/(p.attributes[b[1]]+2)-(weights[a[1]]||0)/(p.attributes[a[1]]+2));
 return options[0]?.[0]||'Balanserad';
}
function assistantTeamSession(date){
 const fixtures=calendarFixtures(),soon=fixtures.filter(f=>!f.played&&f.date>=date&&calGap(date,f.date)<=3).length;
 const tired=managerRoster().filter(p=>p.fatigue>=45).length>managerRoster().length/3;
 return fixtures.some(f=>f.date===calAdd(date,1))?{type:'matchprep',intensity:'light'}:tired||fixtures.some(f=>f.played&&f.date===calAdd(date,-1))?{type:'recovery',intensity:'light'}:{type:['skills','physical','tactics','powerplay','penaltykill'][new Date(date+'T12:00:00Z').getUTCDay()%5],intensity:soon>=2?'light':'normal'};
}
function assistantPrepareTraining(){
 assistantReportingEnsure();
 const date=state.calendar.date,t=state.training;
 if(t.assistantOwner==='assistant'){
  if(!state.calendar.plans[date])t.plan[t.day]=assistantTeamSession(date);
  for(const p of managerRoster()){
   if(!p.trainingFocusManual)p.developmentFocus=assistantFocus(p);
   if(trainingAssistantLight(p)){p.trainingLoad='light';p.trainingReturn={date:calAdd(date,1),club:managerClub(),load:'light',start:date,before:p.fatigue,trained:0,rested:0,delegated:true};}
  }
 }
 if(state.juniors?.assistantOwner==='assistant')for(const p of juniorPlayers().filter(p=>!isOwnPlayer(p)&&!p.academy.loan)){
  if(!p.trainingFocusManual)p.developmentFocus=assistantFocus(p);
  if(p.juniorManualLoadDate!==date&&(!p.juniorManualLoad||p.juniorAutoLoad)){
   p.trainingLoad=!medicalCanTrain(p)||p.fatigue>=55?'rest':p.fatigue>=35?'light':'normal';p.juniorAutoLoad=true;
  }
 }
}
function assistantTrainingView(group='senior'){
 const data=group==='junior'?state.juniors:state.training;
 return `<label>${group==='junior'?'Juniorernas träning':'A-lagets träning'}<select aria-label="${group==='junior'?'Ansvar för juniorträning':'Ansvar för A-lagsträning'}" onchange="assistantSetOwner('${group}',this.value)"><option value="manager" ${data?.assistantOwner!=='assistant'?'selected':''}>Jag planerar</option><option value="assistant" ${data?.assistantOwner==='assistant'?'selected':''}>${group==='junior'?'Juniorstaben':'Assisterande'} planerar</option></select></label><p>${group==='junior'?'Individuella fokus och belastning anpassas efter position, utvecklingsroll och ork. Månadsrapport den 1:a. Uttagning, uppflyttning och lån bestämmer du.':'Assisterande anpassar lagpassen efter matchschemat och väljer relevanta individuella fokus. Trötta spelare får lätt träning eller vila. Veckorapport varje söndag.'} Dina egna datumplaner och individuella val gäller före stabens förslag.</p>`;
}
function assistantReportingEnsure(){
 if(!state.training||!state.juniors||!state.calendar)return null;
 let r=state.training.reporting;
 if(!r||r.club!==managerClub())r=state.training.reporting={version:1,club:managerClub(),started:state.calendar.date,weekly:null,monthly:null,juniorBaseline:{},growth:[],juniorSessions:[]};
 for(const p of juniorPlayers())if(!r.juniorBaseline[p.id])r.juniorBaseline[p.id]={name:p.name,attributes:{...p.attributes},games:p.academy.games||0,seconds:p.academy.seconds||0,goals:p.academy.goals||0,assists:p.academy.assists||0};
 return r;
}
function assistantRecordGrowth(p,key){
 const r=assistantReportingEnsure();if(!r)return;
 r.growth.push({date:state.calendar.date,id:p.id,name:p.name,key,value:p.attributes[key],junior:Boolean(p.academy&&!isOwnPlayer(p))});
 r.growth=r.growth.filter(e=>e.date>=calAdd(state.calendar.date,-40));
}
function assistantWeeklyReport(date){
 const r=assistantReportingEnsure();if(!r||r.weekly===date)return;
 const from=calAdd(date,-7),logs=state.training.history.filter(l=>l.date>=from&&l.date<date&&(!l.evidence||l.evidence.club===managerClub()));
 const growth=r.growth.filter(g=>!g.junior&&g.date>=from&&g.date<date),tired=managerRoster().filter(p=>p.fatigue>=45).sort((a,b)=>b.fatigue-a.fatigue);
 const details=logs.flatMap(l=>l.evidence?.players||[]),sessions=Object.entries(TRAINING_SESSIONS).map(([key,v])=>[v.name,logs.filter(l=>l.type===key).length]).filter(([,n])=>n);
 const body=`Veckan ${calText(from)}–${calText(calAdd(date,-1))}\n${logs.length} genomförda lagpass: ${sessions.map(([name,n])=>name+' '+n).join(', ')||'inga registrerade pass'}.\n${details.filter(p=>p.delegated).length} individuella pass med anpassad belastning planerades av staben.\n\nUtveckling\n${growth.map(g=>`${g.name}: ${(SKATER_ATTRIBUTES[g.key]||GOALIE_ATTRIBUTES[g.key]||g.key)} till ${g.value}/20.`).join('\n')||'Inga synliga attributsteg under veckan. Utfört träningsarbete finns kvar i spelarnas utveckling.'}\n\nBelastning och nästa vecka\n${tired.length?tired.slice(0,5).map(p=>`${p.name}: ${Math.round(100-p.fatigue)} % ork. Prioritera ${p.fatigue>=55?'återhämtning':'lätt träning'}.`).join('\n'):'Ingen spelare har hög träningsbelastning just nu.'}\n${state.training.assistantOwner==='assistant'?'Assisterande anpassar nästa pass efter matchschemat och spelarnas ork.':'Du väljer nästa veckas lagpass och individuella planer under Träning.'}`;
 r.weekly=date;managerMessage(`training-week:${r.club}:${date}`,'Veckans träningsrapport',body,'Träningsrapport',{link:'training',date});
}
function assistantMonthlyReport(date){
 const r=assistantReportingEnsure();if(!r||r.monthly===date)return;
 const month=calAdd(date,-1).slice(0,7),sessions=r.juniorSessions.filter(d=>d.startsWith(month));
 const rows=juniorPlayers().map(p=>{const b=r.juniorBaseline[p.id],changes=Object.keys(p.attributes).filter(k=>p.attributes[k]>(b?.attributes[k]??p.attributes[k])).map(k=>`${SKATER_ATTRIBUTES[k]||GOALIE_ATTRIBUTES[k]} +${p.attributes[k]-b.attributes[k]}`);return {p,changes,games:Math.max(0,(p.academy.games||0)-(b?.games||0)),seconds:Math.max(0,(p.academy.seconds||0)-(b?.seconds||0))};}).sort((a,b)=>b.changes.length-a.changes.length||b.seconds-a.seconds);
 const body=`${month} · ${sessions.length} registrerade träningsdagar\n\n${rows.map(({p,changes,games,seconds})=>`${p.name} (${p.pos}, ${p.age} år): ${changes.join(', ')||'inga synliga attributsteg'}. ${games} juniormatcher, ${Math.round(seconds/60)} minuter. Fokus: ${p.developmentFocus}. ${juniorAdvice(p)}`).join('\n')}\n\nRekommendation\n${rows.filter(r=>r.games>=2&&r.changes.length>0).slice(0,3).map(({p})=>`${p.name}: följ upp utvecklingen och överväg A-träning om det finns en passande roll.`).join('\n')||'Fortsätt följa faktisk matchtid och utveckling innan miljön ändras.'}`;
 r.monthly=date;state.juniors.reports.unshift({year:state.season.year,round:state.round,date,title:'Juniorernas månadsrapport · '+month,body});state.juniors.reports=state.juniors.reports.slice(0,50);
 managerMessage(`junior-month:${r.club}:${month}`,'Juniorernas månadsrapport · '+month,body,'Junioransvarig',{link:'juniors',date});
 r.juniorBaseline={};r.juniorSessions=r.juniorSessions.filter(d=>d>=date);assistantReportingEnsure();
}
const assistantCalendarStepBase=calendarStep;
calendarStep=function(recovered=false){
 assistantReportingEnsure();assistantCalendarStepBase(recovered);
 const date=state.calendar.date;
 if(new Date(date+'T12:00:00Z').getUTCDay()===0)assistantWeeklyReport(date);
 if(date.endsWith('-01'))assistantMonthlyReport(date);
};
