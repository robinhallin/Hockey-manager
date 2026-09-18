// Shared by the decision preview, training execution and medical exposure.
function trainingEffectiveLoad(p){if(trainingAutoRest(p))return 'rest';return p.trainingReturn?.club===managerClub()&&p.trainingReturn.date<=state.calendar?.date?'normal':p.trainingLoad||'normal';}
function trainingSessionEffect(p,session,load=trainingEffectiveLoad(p),support=null){
 const rest=!medicalCanTrain(p)||load==='rest'||session.type==='recovery';
 const light=!rest&&(load==='light'||session.intensity==='light'||session.type==='matchprep');
 const hard=!rest&&!light&&session.intensity==='hard';
 const fatigue=trainingClamp(p.fatigue+(rest?-25:hard?12:light?-9:2));
 const coach=state.staff.find(s=>s.id===(p.pos==='MV'?'goalie':'assistant'));
 const age=p.age<=23?1.35:p.age<=28?.85:.45;
 const quality=(support?.coaching??coach?.coaching??12)/15*(support?.factor??clubTrainingFactor())*(p.pos==='MV'?(support?.goalieFactor??clubPriorityValue('goalieTraining')):1);
 const points=rest?0:(hard?8:light?3.5:6)*age*quality*Math.max(.25,1-p.fatigue/120)*(.5+Math.min(3,p.attributeGrowth||0)/6);
 return {rest,light,hard,fatigue,points};
}
function setTrainingReturn(id,days){
 const p=managerRoster().find(p=>samePlayerId(p.id,id));days=Number(days);
 if(!p||!state.calendar||!['light','rest'].includes(p.trainingLoad)||![0,1,3,7].includes(days))return;
 if(!days)delete p.trainingReturn;
 else p.trainingReturn={date:calAdd(state.calendar.date,days),club:managerClub(),load:p.trainingLoad,start:state.calendar.date,before:p.fatigue,trained:0,rested:0};
 save();render();
}
function trainingReturnDay(){
 for(const p of managerRoster()){
  const plan=p.trainingReturn;if(!plan)continue;
  // A plan belongs to the club that set it; a transferred player keeps no stale instruction.
  if(plan.club!==managerClub()||plan.load!==p.trainingLoad){delete p.trainingReturn;continue;}
  if(plan.date>state.calendar.date)continue;
  p.trainingLoad='normal';delete p.trainingReturn;
  managerMessage(`training-return:${p.id}:${plan.start}:${plan.date}`,`${p.name}: belastningsplan avslutad`,
   `Planen ${calText(plan.start)}–${calText(calAdd(plan.date,-1))} är avslutad. ${plan.trained} träningspass och ${plan.rested} återhämtningspass. Ork vid start ${Math.round(100-plan.before)} %, nu ${Math.round(100-p.fatigue)} %. Matcher och rehabilitering kan också ha påverkat orken.\nSpelaren följer lagets pass igen. ${medicalCanTrain(p)?'Bedöm ork och nästa match innan du ökar belastningen.':'Den medicinska rehabiliteringen gäller fortfarande; planen friskförklarar inte spelaren.'}`,'Träningsrapport',{playerId:p.id,link:'training'});
 }
}
function trainingPlanRecord(p,session,effect,before,key){
 const plan=p.trainingReturn;
 if(plan&&plan.club===managerClub())plan[effect.rest?'rested':'trained']++;
 const fields=p.pos==='MV'?GOALIE_ATTRIBUTES:SKATER_ATTRIBUTES;
 p.trainingSessions=[{date:state.calendar?.date,type:session.type,before,after:p.fatigue,rest:effect.rest,injured:!medicalCanTrain(p),key,target:effect.rest?'Återhämtning':fields[key]},...(p.trainingSessions||[])].slice(0,56);
}
function developmentReviewStart(id){
 const p=managerRoster().find(p=>samePlayerId(p.id,id));
 if(!p||state.live&&!state.live.finished||p.developmentReview?.club===managerClub()&&calGap(p.developmentReview.date,state.calendar.date)<28)return false;
 p.developmentReview={club:managerClub(),year:state.season.year,date:state.calendar.date,focus:p.developmentFocus,attributes:{...p.attributes},seen:(state.analysis?.matches||[]).map(m=>m.id),sessionsSeen:(p.trainingSessions||[]).map(s=>s.date)};
 save();render();return true;
}
function developmentReviewEvidence(p){
 const plan=p.developmentReview;if(!plan||plan.club!==managerClub())return null;
 const sessions=(p.trainingSessions||[]).filter(s=>s.date>=plan.date&&!plan.sessionsSeen.includes(s.date));
 const matches=analysisCompleteMatches(state.analysis?.matches||[]).filter(m=>m.club===plan.club&&m.date>=plan.date&&!plan.seen.includes(m.id));
 const rows=matches.map(m=>(m.players||[]).find(q=>samePlayerId(q.id,p.id))).filter(Boolean);
 const fields=p.pos==='MV'?GOALIE_ATTRIBUTES:SKATER_ATTRIBUTES;
 const changes=Object.keys(plan.attributes).filter(k=>p.attributes[k]!==plan.attributes[k]).map(k=>`${fields[k]} ${p.attributes[k]-plan.attributes[k]>0?'+':''}${p.attributes[k]-plan.attributes[k]}`);
 return {plan,days:calGap(plan.date,state.calendar.date),sessions,trained:sessions.filter(s=>!s.rest).length,rest:sessions.filter(s=>s.rest&&!s.injured).length,injured:sessions.filter(s=>s.injured).length,games:rows.filter(r=>r.seconds>0).length,seconds:rows.reduce((n,r)=>n+r.seconds,0),changes};
}
function developmentReviewView(p){
 if(!isOwnPlayer(p))return '';
 const e=developmentReviewEvidence(p),action=`developmentReviewStart(${trainingSafe(JSON.stringify(p.id))})`;
 if(!e)return `<section><h4>En plan att följa upp</h4><p>Följ valt fokus, genomförd träning och registrerad matchtid under 28 dagar.</p><button onclick="${action}" ${state.live&&!state.live.finished?'disabled':''}>Starta utvecklingsuppföljning</button></section>`;
 const advice=e.days<14?'Samla mer underlag innan du bedömer utvecklingen.':e.injured>e.trained?'Rehabiliteringen har begränsat träningsarbetet. Prioritera en hållbar återgång.':e.trained<5?'Få genomförda pass. Se över belastning och kalender innan du byter fokus.':e.seconds<600?'Begränsad registrerad matchtid. Överväg mer ansvar, juniorväg eller lån utifrån spelarens nivå.':!e.changes.length?'Arbete är genomfört utan synligt attributsteg. Behåll fokus en period till eller välj en annan rollrelevant färdighet. Potentialen är fortfarande osäker.':'Fortsätt väga utvecklingen mot belastning och spelarens roll.';
 return `<section><h4>Utvecklingsplan · ${calText(e.plan.date)}</h4><p>Utgångsfokus: ${trainingSafe(e.plan.focus)}. Nu: ${trainingSafe(p.developmentFocus)}. ${e.days} av 28 dagar.</p><p>${e.trained} träningspass · ${e.rest} vilopass · ${e.injured} pass hindrade av medicinskt läge. ${e.games} registrerade matcher med istid · ${analysisTime(e.seconds)}.</p><p>${e.changes.length?trainingSafe(e.changes.join(' · ')):'Inga synliga attributsteg under uppföljningen.'}</p><p>${advice}</p><p>Underlaget omfattar sparade pass och kompletta matchrapporter, inte en beräkning av dold potential. Äldre underlag kan ha gallrats. Anpassa fokus och belastning i spelarens träningsval.</p>${e.days>=28?`<button onclick="${action}" ${state.live&&!state.live.finished?'disabled':''}>Starta nästa uppföljning</button>`:''}</section>`;
}
function trainingPlanningPanel(p){
 const t=state.training,session=t.plan[t.day],date=state.calendar?.date;
 const available=session&&t.lockedRound!==state.round&&!(state.live&&!state.live.finished)&&state.calendar?.completedMatchDate!==date;
 const plan=p.trainingReturn;
 const options=[['normal','Lagets pass'],['light','Lätt träning'],['rest','Vila']];
 const base=available?trainingSessionEffect(p,session,'normal').points:0;
 return `<section class="training-decision"><h3>Belastning & återhämtning</h3>${trainingAutoRest(p)?'<p>Staben planerar individuell vila idag. Välj en belastning manuellt om du vill ändra dagens beslut.</p>':''}${available?`<p>Nästa pass: ${TRAINING_SESSIONS[session.type].name} · ${calText(date)}</p><table><thead><tr><th>Alternativ</th><th>Ork efter¹</th><th>Träningsarbete²</th></tr></thead><tbody>${options.map(([value,label])=>{const e=trainingSessionEffect(p,session,value);return `<tr ${p.trainingLoad===value?'class="chosen"':''}><th>${label}${p.trainingLoad===value?' · valt':''}</th><td>${Math.round(100-e.fatigue)} %</td><td>${base?Math.round(e.points/base*100)+' %':'Ingen attributträning'}</td></tr>`;}).join('')}</tbody></table><p class="training-note">¹ Beräknad ork direkt efter passet, före eventuell rehabilitering eller skada. ² Relativt lagets pass för denna spelare. Attribututveckling beror också på utvecklingsutrymme. Vila minskar deltagandet i taktiskt samspel och special teams.</p>`:'<p>Ingen prognos för lagpass under matchdag eller avslutad träningsperiod. Nästa pass visas när dagen går vidare.</p>'}${['light','rest'].includes(p.trainingLoad)?`<label>Återgå till lagets pass<select aria-label="Planera återgång till lagets pass" onchange="setTrainingReturn('${p.id}',this.value)"><option value="0" ${!plan?'selected':''}>När jag ändrar själv</option>${plan?`<option selected disabled>${calText(plan.date)} · planerat</option>`:''}<option value="1">Om en dag</option><option value="3">Om tre dagar</option><option value="7">Om en vecka</option></select></label><p>${plan?`Planerad återgång ${calText(plan.date)}. Du får en uppföljning i inkorgen.`:'Ingen automatisk återgång är planerad.'} Träningsvila ändrar inte matchuttagningen.</p>`:''}${p.trainingSessions?.length?`<details><summary>Senaste individuella pass</summary>${p.trainingSessions.slice(0,5).map(l=>`<p>${l.date?calText(l.date):'Tidigare pass'} · ${trainingSafe(l.target)}<br>Ork ${Math.round(100-l.before)} → ${Math.round(100-l.after)} %</p>`).join('')}</details>`:''}</section>`;
}
