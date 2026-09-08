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
 p.trainingSessions=[{date:state.calendar?.date,type:session.type,before,after:p.fatigue,rest:effect.rest,target:effect.rest?'Återhämtning':fields[key]},...(p.trainingSessions||[])].slice(0,12);
}
function trainingPlanningPanel(p){
 const t=state.training,session=t.plan[t.day],date=state.calendar?.date;
 const available=session&&t.lockedRound!==state.round&&!(state.live&&!state.live.finished)&&state.calendar?.completedMatchDate!==date;
 const plan=p.trainingReturn;
 const options=[['normal','Lagets pass'],['light','Lätt träning'],['rest','Vila']];
 const base=available?trainingSessionEffect(p,session,'normal').points:0;
 return `<section class="training-decision"><h3>Belastning & återhämtning</h3>${trainingAutoRest(p)?'<p>Staben planerar individuell vila idag. Välj en belastning manuellt om du vill ändra dagens beslut.</p>':''}${available?`<p>Nästa pass: ${TRAINING_SESSIONS[session.type].name} · ${calText(date)}</p><table><thead><tr><th>Alternativ</th><th>Ork efter¹</th><th>Träningsarbete²</th></tr></thead><tbody>${options.map(([value,label])=>{const e=trainingSessionEffect(p,session,value);return `<tr ${p.trainingLoad===value?'class="chosen"':''}><th>${label}${p.trainingLoad===value?' · valt':''}</th><td>${Math.round(100-e.fatigue)} %</td><td>${base?Math.round(e.points/base*100)+' %':'Ingen attributträning'}</td></tr>`;}).join('')}</tbody></table><p class="training-note">¹ Beräknad ork direkt efter passet, före eventuell rehabilitering eller skada. ² Relativt lagets pass för denna spelare. Attribututveckling beror också på utvecklingsutrymme. Vila minskar deltagandet i taktiskt samspel och special teams.</p>`:'<p>Ingen prognos för lagpass under matchdag eller avslutad träningsperiod. Nästa pass visas när dagen går vidare.</p>'}${['light','rest'].includes(p.trainingLoad)?`<label>Återgå till lagets pass<select aria-label="Planera återgång till lagets pass" onchange="setTrainingReturn('${p.id}',this.value)"><option value="0" ${!plan?'selected':''}>När jag ändrar själv</option>${plan?`<option selected disabled>${calText(plan.date)} · planerat</option>`:''}<option value="1">Om en dag</option><option value="3">Om tre dagar</option><option value="7">Om en vecka</option></select></label><p>${plan?`Planerad återgång ${calText(plan.date)}. Du får en uppföljning i inkorgen.`:'Ingen automatisk återgång är planerad.'} Träningsvila ändrar inte matchuttagningen.</p>`:''}${p.trainingSessions?.length?`<details><summary>Senaste individuella pass</summary>${p.trainingSessions.slice(0,5).map(l=>`<p>${l.date?calText(l.date):'Tidigare pass'} · ${trainingSafe(l.target)}<br>Ork ${Math.round(100-l.before)} → ${Math.round(100-l.after)} %</p>`).join('')}</details>`:''}</section>`;
}
