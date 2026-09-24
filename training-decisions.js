"use strict";

// One read-only projection, reused by the calendar, office and actual session.
// It forecasts this pass only; injuries, rehabilitation and matches are separate.
function trainingTeamProjection(session){
 const roster=managerRoster(),rows=roster.filter(p=>!internationalAway(p)).map(p=>({
  player:p,effect:trainingSessionEffect(p,session),before:p.fatigue,
  loadBefore:p.health?.load??0,delegated:trainingAutoRest(p)||Boolean(p.trainingReturn?.delegated&&p.trainingReturn.club===managerClub()&&p.trainingReturn.date>state.calendar.date&&p.trainingLoad==='rest')
 }));
 const trained=rows.filter(r=>!r.effect.rest).length,participation=trained/Math.max(1,roster.length);
 const t=state.training,signature=trainingSignature(),tactical=session.type==='tactics'?9:session.type==='matchprep'?7:session.type==='recovery'?0:2;
 const before={familiarity:t.familiarity[signature]??20,powerplay:t.powerplay,penaltykill:t.penaltykill};
 const after={familiarity:trainingClamp(before.familiarity+tactical*participation,0,90),powerplay:session.type==='powerplay'?trainingClamp(before.powerplay+12*participation,0,90):before.powerplay,penaltykill:session.type==='penaltykill'?trainingClamp(before.penaltykill+12*participation,0,90):before.penaltykill};
 const fatigueBefore=roster.reduce((n,p)=>n+p.fatigue,0)/Math.max(1,roster.length);
 const fatigueAfter=fatigueBefore+rows.reduce((n,r)=>n+r.effect.fatigue-r.before,0)/Math.max(1,roster.length);
 return {rows,trained,resting:rows.length-trained,absent:roster.length-rows.length,signature,before,after,fatigueBefore,fatigueAfter};
}
function trainingPreparationText(before,after){
 return [['familiarity','Matchplansvana'],['powerplay','PP-förberedelse'],['penaltykill','BP-förberedelse']].map(([key,label])=>`${label} ${before[key].toFixed(1)} → ${after[key].toFixed(1)}`).join(' · ');
}
function trainingRecordEvidence(log,projection){
 log.evidence={version:1,club:managerClub(),year:state.season.year,signature:projection.signature,absent:projection.absent,before:projection.before,after:projection.after,
  players:projection.rows.map(({player:p,effect,before,loadBefore,delegated})=>({id:p.id,name:p.name,focus:p.developmentFocus,before,afterSession:effect.fatigue,afterDay:p.fatigue,loadBefore,loadAfter:p.health.load,rest:effect.rest,delegated,injured:Boolean(p.health.injury)}))};
}
function trainingDecisionReport(log){
 const e=log?.evidence;
 if(!e||e.version!==1)return '<p>Individuell belastning och förberedelse före/efter saknas i den äldre rapporten.</p>';
 return `<details class="training-decision"><summary>Belastning, förberedelse & stabens beslut</summary><p>${trainingSafe(e.club)} · ${seasonLabel(e.year)} · ${calText(log.date)}</p><p>${trainingPreparationText(e.before,e.after)}.</p><p>Förberedelse på skalan 0–100 för den matchplan som användes vid passet. Det påverkar matchförutsättningarna, utan att garantera resultat.</p><p>${e.players.filter(p=>p.delegated).length} spelare fick individuell vila av staben. ${e.absent} på landslagsuppdrag deltog inte. Träningsvila ändrar inte laguttagningen.</p><div class="training-decision-scroll" tabindex="0" role="region" aria-label="Registrerad träningsbelastning"><table><thead><tr><th>Spelare</th><th>Genomfört</th><th>Slitage före → efter pass</th><th>Medicinsk belastning före → efter uppföljning</th><th>Nästa beslut</th></tr></thead><tbody>${e.players.map(p=>`<tr><th>${playerReference(p.id,p.name)}</th><td>${p.delegated?'Stabens vila':p.rest?'Återhämtning':'Träning'}${p.injured?' · skadeläge vid uppföljning':''}</td><td>${p.before.toFixed(1)} → ${p.afterSession.toFixed(1)}</td><td>${p.loadBefore.toFixed(1)} → ${p.loadAfter.toFixed(1)}</td><td>${e.club===managerClub()&&managerRoster().some(q=>samePlayerId(q.id,p.id))?`<button type="button" class="desk-link" onclick="developmentOpenPlan(${trainingSafe(JSON.stringify(p.id))})">Träningsplan</button>`:'Spelaren tillhör inte din trupp'}</td></tr>`).join('')}</tbody></table></div><p>Slitage och medicinsk belastning är separata mått på skalan 0–100; lägre betyder mindre belastning. Rehabilitering kan ge ytterligare återhämtning under dagen. Rapporten behåller dåvarande klubb och namn.</p></details>`;
}
function trainingCalendarDecision(date,session){
 const c=state.calendar,t=state.training;
 if(date!==c.date||c.date>=calendarTarget()||c.completedMatchDate===date||state.live&&!state.live.finished||t.lockedRound===state.round||t.day>=trainingDays())return '';
 const projection=trainingTeamProjection(session),next=calendarFixtures().filter(f=>!f.played&&f.date>=date).sort((a,b)=>a.date.localeCompare(b.date));
 const meanEnergy=rows=>rows.reduce((n,r)=>n+readinessCeiling(r.effect.fatigue),0)/Math.max(1,rows.length);
 const options=session.type==='recovery'?[{...session,label:'Valt pass'},{type:'matchprep',intensity:'light',label:'Lätt matchförberedelse'}]:[{...session,label:'Valt pass'},...(session.intensity==='hard'&&!['recovery','matchprep'].includes(session.type)?[{...session,intensity:'light',label:'Samma innehåll, lätt'}]:[]),{type:'recovery',intensity:'light',label:'Återhämtning'}];
 return `<section class="training-decision" aria-label="Beslutsunderlag för dagens träning"><h4>Dagens avvägning</h4><p>${next.length?`Nästa match: ${calText(next[0].date)} mot ${trainingSafe(next[0].opponent)} · ${calGap(date,next[0].date)} dagar kvar. ${next.filter(f=>calGap(date,f.date)<7).length} matcher kommande sju dagar.`:'Ingen kommande match fastställd.'}</p><p>${projection.trained} tränar · ${projection.resting} återhämtar sig · ${projection.absent} på landslagsuppdrag. Dina individuella planer och delegerad vila ingår.</p><div class="training-decision-scroll" tabindex="0" role="region" aria-label="Jämför dagens träningsalternativ"><table><thead><tr><th>Alternativ</th><th>Genomsnittligt slitage efter</th><th>Startenergi¹</th><th>Förberedelse²</th></tr></thead><tbody>${options.map((option,i)=>{const p=i===0?projection:trainingTeamProjection(option);return `<tr><th>${option.label}</th><td>${p.fatigueAfter.toFixed(1)} / 100</td><td>${p.rows.length?meanEnergy(p.rows).toFixed(1)+' %':'Underlag saknas'}</td><td>${trainingPreparationText(p.before,p.after)}</td></tr>`;}).join('')}</tbody></table></div><p>¹ Beräknat direkt efter passet för hemmavarande spelare, före rehabilitering och skador. Startenergi är matchens energitak; slitage är samlad trötthet. ² Skala 0–100. Lätt träning ger mindre individuellt träningsarbete; återhämtning ger inget attributarbete eller ökad förberedelse. Byt pass med valen ovan.</p>${projection.rows.some(r=>r.delegated||r.before>=55)?`<details><summary>Spelare att se över</summary>${projection.rows.filter(r=>r.delegated||r.before>=55).map(r=>`<p>${playerReference(r.player.id,r.player.name)} · ${r.delegated?'staben planerar vila':r.effect.rest?'planerad återhämtning':'tränar enligt din plan'} · slitage ${r.before.toFixed(0)} → ${r.effect.fatigue.toFixed(0)}. <button type="button" class="desk-link" onclick="developmentOpenPlan(${trainingSafe(JSON.stringify(r.player.id))})">Justera individuell plan</button></p>`).join('')}</details>`:''}</section>`;
}
