"use strict";

// Read models only: the office uses the same reports, calendar and coaching
// focus as the actual simulation. Viewing a week never creates a new task.
function managerWeekRecommendation(){
 const matches=coachEvidence().filter(m=>!m.date||m.date<=state.calendar.date);
 if(!matches.length)return null;
 const diagnosis=managerWeekDiagnosis(matches);
 if(diagnosis)return {key:diagnosis.key,detail:diagnosis.detail,count:matches.length,evidenceId:matches[0].id,diagnosis};
 const average=key=>matches.reduce((n,m)=>n+coachMeasure(m,key),0)/matches.length;
 const attack=average('attack'),defense=average('defense'),penalties=average('discipline');
 const key=penalties>=3?'discipline':defense>attack?'defense':'attack';
 const detail=key==='discipline'?`${penalties.toFixed(1)} egna utvisningar per match. Arbeta med disciplin och positionering i boxplay.`:
  key==='defense'?`${defense.toFixed(1)} farliga lägen emot mot ${attack.toFixed(1)} skapade per match. Prioritera positionering och samspel.`:
  `${attack.toFixed(1)} egna farliga lägen per match. Bygg vidare på passningsspel och avslut; det är ett utvecklingsförslag, inte ett konstaterat fel.`;
 return {key,detail,count:matches.length,evidenceId:matches[0].id};
}
function managerWeekAdopt(key,evidenceId){
 const suggestion=managerWeekRecommendation(),focus=coachFocus();
 if(state.live&&!state.live.finished||focus&&focus.results.length<(focus.target||3))return false;
 if(!suggestion||suggestion.key!==key||suggestion.evidenceId!==evidenceId)return false;
 coachAdopt(key,suggestion.diagnosis||null);
 return coachFocus()?.key===key;
}
function managerWeekDiagnosis(matches){
 const recurring=formationEvidence(matches).rows.filter(r=>['forward','defense'].includes(r.kind)&&r.signal==='Återkommande underskott')
  .sort((a,b)=>(b.against-b.for)/b.seconds-(a.against-a.for)/a.seconds)[0];
 if(recurring)return {key:'defense',scope:'unit',unitKey:recurring.key,label:recurring.names.join(' · '),
  detail:`${recurring.kind==='forward'?'Kedjan':'Backparet'} ${recurring.names.join(', ')}: ${recurring.for}–${recurring.against} farliga lägen på ${analysisTime(recurring.seconds)}, underskott i ${recurring.negative} av ${recurring.measured} matcher. Granska rollfördelningen och träna positionering. Matchning och motstånd kan också förklara utfallet.`};
 const pp=matches.flatMap(m=>(m.units||[]).filter(u=>u.kind==='pp'));
 const seconds=pp.reduce((n,u)=>n+u.seconds,0),danger=pp.reduce((n,u)=>n+u.dangerFor,0);
 if(matches.filter(m=>(m.units||[]).some(u=>u.kind==='pp'&&u.seconds>=60)).length>=3&&seconds>=600&&danger===0)
  return {key:'attack',scope:'strength',strength:'pp',session:'powerplay',label:'Powerplay',detail:`Powerplay har inte skapat ett registrerat farligt läge under ${analysisTime(seconds)}. Se över passningsalternativ och avslutsroller och planera ett powerplaypass. Underlaget visar utfallet, inte orsaken.`};
 return null;
}
function coachDiagnosisMeasure(m,d){
 const units=(m.units||[]).filter(u=>d.scope==='unit'?u.key===d.unitKey:u.kind===d.strength);
 return {id:m.id,opponent:m.opponent,seconds:units.reduce((n,u)=>n+u.seconds,0),for:units.reduce((n,u)=>n+u.dangerFor,0),against:units.reduce((n,u)=>n+u.dangerAgainst,0)};
}
function coachDiagnosisView(f){
 if(!f?.diagnosis)return '';
 const total=rows=>rows.reduce((a,r)=>({seconds:a.seconds+r.seconds,for:a.for+r.for,against:a.against+r.against}),{seconds:0,for:0,against:0});
 const before=total(f.diagnosis.baseline),after=total(f.diagnosis.results);
 const cell=r=>r.seconds?`${analysisTime(r.seconds)} · ${r.for}–${r.against} · ${analysisRate(r.for,r.seconds)} / ${analysisRate(r.against,r.seconds)} per 60 min`:'Ingen registrerad istid';
 return `<section class="training-coach-note"><h3>Följ samma problem: ${trainingSafe(f.diagnosis.label)}</h3><p>${trainingSafe(f.diagnosis.detail)}</p><p>Före: ${cell(before)}</p><p>Efter: ${cell(after)}</p><p>Farliga lägen för/emot. En ändrad kombination räknas inte som noll insläppta lägen. Kort istid och olika motstånd begränsar jämförelsen.</p></section>`;
}
function managerWeekDays(){
 const fixtures=calendarFixtures();
 return Array.from({length:7},(_,i)=>{
  const date=calAdd(state.calendar.date,i),games=fixtures.filter(g=>g.date===date),session=calendarSession(date);
  const log=state.training?.history?.find(l=>l.date===date);
  return {date,games,type:log?.type||session.type,done:Boolean(log||date===state.calendar.completedMatchDate)};
 });
}
function managerWeekOpponent(next=deskFixtures().upcoming[0]){
 if(!next)return null;
 const club=state.rivals?.clubs?.[next.opponent];
 const games=(club?.recent||[]).filter(g=>g.year===state.season.year&&g.date<=state.calendar.date&&!g.partial).slice(-5);
 // A new coach's identity takes precedence over the former coach's reports.
 const observed=games.filter(g=>g.coachId===club?.coach?.id&&RIVAL_STYLES[g.style]).at(-1);
 const style=observed?.style||club?.coach?.style;
 const advice={
  pressure:'Förbered förstapasset och välj utvilade puckförare. Se över uppspel och kedjornas belastning.',
  counter:'Behåll täckning bakom pucken. Se över risknivån i anfallen och backarnas roller.',
  control:'Skydda mitten och stäng passningsalternativen. Se över forecheck och defensiv positionering.'
 }[style]||'Underlaget är tunt. Utgå från er egen spelidé och kontrollera matchklar trupp.';
 return {next,style,observed,games,advice};
}
function managerWeekButton(label,action){return `<button type="button" class="desk-link" onclick="${trainingSafe(action)}">${trainingSafe(label)} ${deskIcon('arrow')}</button>`;}
function managerWeekFocusView(){
 const f=coachFocus(),suggestion=managerWeekRecommendation();
 if(f){
  const definition={...COACH_FOCUSES[f.key],session:f.diagnosis?.session||COACH_FOCUSES[f.key].session},complete=f.results.length>=(f.target||3),slot=complete?null:coachPlanSlot(f.key);
  const planned=slot?.date===f.planned&&slot?.type===definition.session;
  return `<article class="manager-week-focus"><span class="desk-kicker">${complete?'DAGS ATT UTVÄRDERA':'VECKANS ARBETE'}</span><h3>${trainingSafe(definition.name)}</h3><p>${f.sessions.length} genomförda relevanta pass · ${f.results.length}/${f.target||3} matcher följda.</p>${complete?'<p>Uppföljningen är klar. Granska utfallet innan du väljer nästa fokus.</p>':`<p>${planned?`Fokuspass i kalendern: ${calText(f.planned)}.`:slot?`Nästa lämpliga pass: ${calText(slot.date)} · ${TRAINING_SESSIONS[definition.session].name}.`:'Inget ledigt fokuspass före nästa match. Återhämtning, egna kalenderplaner och matchförberedelser behålls.'}</p>`}<div class="manager-week-actions">${!complete&&!planned&&slot?managerWeekButton('Planera fokuspasset','coachPlan()'):''}${managerWeekButton('Se uppföljningen',"officePanelTab('followup')")}</div></article>`;
 }
 if(!suggestion)return '<article class="manager-week-focus"><span class="desk-kicker">BYGG ETT UNDERLAG</span><h3>Lär känna laget</h3><p>Efter första fullständigt registrerade tävlingsmatchen föreslår staben ett träningsfokus. Planera dagens pass och lär känna spelarnas roller under tiden.</p></article>';
 return `<article class="manager-week-focus"><span class="desk-kicker">STABENS FÖRSLAG · ${suggestion.count} MATCHER</span><h3>${trainingSafe(COACH_FOCUSES[suggestion.key].name)}</h3><p>${trainingSafe(suggestion.detail)}${suggestion.count<3?' Litet underlag; en enstaka match visar ingen trend.':''}</p><p>Följ nästa ${state.analysis.coachWindow||3} tävlingsmatcher. Träningspass väljer du i nästa steg.</p><div class="manager-week-actions">${state.live&&!state.live.finished?'<span>Välj fokus efter pågående match.</span>':managerWeekButton('Välj detta fokus',`managerWeekAdopt(${JSON.stringify(suggestion.key)},${JSON.stringify(suggestion.evidenceId)})`)}${managerWeekButton('Granska andra fokus',"deskNavigate('statistics')")}</div></article>`;
}
function managerWeekView(){
 const next=deskNextMatch(deskFixtures().upcoming[0]),opposition=managerWeekOpponent();
 const tired=managerRoster().filter(p=>medicalReady(p)&&p.fatigue>=35).sort((a,b)=>b.fatigue-a.fatigue);
 const days=managerWeekDays();
 return `<section class="manager-week" aria-label="Din spelvecka"><header><span class="desk-kicker">DIN SPELVECKA · ${trainingSafe(next.eyebrow)}</span><h2>${trainingSafe(next.title)}</h2>${next.score?`<strong class="office-live-score">${trainingSafe(next.score)}</strong>`:''}<p>${trainingSafe(next.detail)}</p>${deskLink(next.label,next.action)}</header><nav class="manager-week-days" aria-label="Kommande sju dagar">${days.map((d,i)=>`<button type="button" ${i===0?'aria-current="date"':''} data-kind="${d.games.length?'match':d.type}" onclick="officeOpenDay('${d.date}')"><time datetime="${d.date}">${i===0?'Idag':new Date(d.date+'T12:00:00Z').toLocaleDateString('sv-SE',{weekday:'short',day:'numeric',timeZone:'UTC'})}</time><strong>${trainingSafe(d.games.length?d.games.map(g=>g.opponent).join(' / '):TRAINING_SESSIONS[d.type]?.name||'Planering')}</strong><small>${d.games.length?d.games.every(g=>g.played)?'Spelad':'Matchdag':d.done?'Genomfört':'Planerat'}</small></button>`).join('')}</nav>${managerWeekFocusView()}${tired.length?`<article class="manager-week-load"><h3>Ork före nästa match</h3><p>${tired.slice(0,3).map(p=>`${playerReference(p.id,p.name)} ${Math.round(100-p.fatigue)} % <button type="button" class="desk-link" onclick="squadOpenPlace(${trainingSafe(JSON.stringify(p.id))})">Bedöm alternativ</button>`).join(' · ')}${tired.length>3?` · ytterligare ${tired.length-3} högt belastade`:''}.</p><p>${managerOffice2Delegated('training')?'Staben ansvarar för individuell återhämtning.':'Väg återhämtning mot träningsarbete och matchuttagning.'}</p>${deskLink('Bedöm individuell belastning',{page:'training'})}</article>`:''}${opposition?`<details class="manager-week-opponent" ${calGap(state.calendar.date,opposition.next.date)<=1?'open':''}><summary>Inför ${trainingSafe(opposition.next.opponent)}</summary><p>${RIVAL_STYLES[opposition.style]?`${opposition.observed?'Senast observerad spelidé':'Tränarens grundprofil'}: ${trainingSafe(RIVAL_STYLES[opposition.style])}. `:''}${opposition.games.length?`${opposition.games.filter(g=>g.gf>g.ga).length} segrar på ${opposition.games.length} registrerade matcher.`:'Inga fullständiga matcher registrerade denna säsong.'}</p><p>${trainingSafe(opposition.advice)}</p><small>En förberedelse inför mötet. Motståndaren kan ändra planen.</small><div class="manager-week-actions">${managerWeekButton('Läs motståndsrapporten',`rivalsOpen(${JSON.stringify(opposition.next.opponent)})`)}${deskLink('Arbeta med matchplanen',{page:'tactics'})}</div></details>`:'<p>Ingen nästa match är fastställd. Veckan visar lagets planerade träning.</p>'}</section>`;
}
function managerWeekFollowupView(){
 const f=coachFocus();
 if(!f)return `<section class="manager-week"><h2>Från beslut till uppföljning</h2><p>Välj ett träningsfokus i stabens förslag nedan. Genomförda pass och efterföljande tävlingsmatcher följs här.</p>${managerWeekButton('Till spelveckan',"officePanelTab('today')")}</section>`;
 const d=COACH_FOCUSES[f.key],avg=rows=>rows.length?(rows.reduce((n,r)=>n+r.value,0)/rows.length).toFixed(1):'–';
 const complete=f.results.length>=(f.target||3),suggestion=managerWeekRecommendation();
 return `<section class="manager-week manager-week-followup"><span class="desk-kicker">DITT BESLUT · ${calText(f.date)}</span><h2>${trainingSafe(d.name)}</h2><p>${f.results.length}/${f.target||3} matcher följda · ${f.sessions.length} relevanta pass genomförda.</p><dl class="manager-week-metrics"><div><dt>Före · ${f.baseline.length} matcher</dt><dd>${avg(f.baseline)}</dd></div><div><dt>Efter · ${f.results.length} matcher</dt><dd>${avg(f.results)}</dd></div></dl><p>${trainingSafe(d.label)} per match. ${!f.sessions.length?'Inget relevant träningspass är registrerat ännu. ':''}Motstånd, matchlängd och matchbild påverkar; skillnaden bevisar inte en träningseffekt.</p><details><summary>Genomfört arbete och matchunderlag</summary>${f.sessions.map(s=>`<p>${calText(s.date)} · ${s.trained} tränade, ${s.resting||0} vilade.</p>`).join('')}${f.results.map(r=>`<p>${trainingSafe(r.opponent)} · ${r.value} ${trainingSafe(d.label.toLowerCase())}</p>`).join('')}${coachRatesView(f)}</details>${coachDiagnosisView(f)}<div class="manager-week-actions">${complete&&suggestion?managerWeekButton('Starta ny uppföljning: '+COACH_FOCUSES[suggestion.key].name,`managerWeekAdopt(${JSON.stringify(suggestion.key)},${JSON.stringify(suggestion.evidenceId)})`):managerWeekButton('Till veckans plan',"officePanelTab('today')")}${deskLink('Öppna matchanalysen',{page:'statistics'})}</div></section>`;
}
