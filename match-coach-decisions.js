"use strict";
// Use existing orders and the existing review ledger: no hidden ability bonuses.
function matchCoachSituation(clock,score,plan){
 if(clock<3000||clock>=3600||!Number.isFinite(score?.own)||!Number.isFinite(score?.against))return null;
 const gap=score.own-score.against;
 if(gap<0&&gap>=-2&&!(plan.tactic==='attack'&&plan.forecheck==='aggressive'&&plan.tempo==='high'))return {key:'chase',title:'Dags att öka risken?',evidence:`Underläge ${score.own}–${score.against} med ${analysisTime(3600-clock)} kvar.`,suggestion:'Jaga kvitteringen med offensiv mentalitet, hög press och högt tempo.',risk:'Spelarna förbrukar mer ork och lämnar större ytor bakom pressen.',tab:'tactics',action:'Granska matchplanen'};
 if(clock>=3120&&gap===1&&!(plan.tactic==='defense'&&plan.forecheck==='passive'&&plan.tempo==='low'))return {key:'protect',title:'En uddamålsledning att försvara',evidence:`Ledning ${score.own}–${score.against} med ${analysisTime(3600-clock)} kvar.`,suggestion:'Skydda ledningen med defensiv mentalitet, avvaktande press och lågt tempo.',risk:'Färre egna anfall kan ge motståndaren mer tid att bygga tryck. Att fortsätta anfalla är också ett rimligt val.',tab:'tactics',action:'Granska matchplanen'};
 return null;
}
function matchCoachOption(advice){
 const plan=state.tacticalPlan||{};
 if(advice.key==='quality'&&plan.shotChoice!=='patient')return {field:'shotChoice',value:'patient',label:'Sök bättre lägen'};
 if(advice.key==='danger'&&plan.forecheck!=='passive')return {field:'forecheck',value:'passive',label:'Sänk forechecken'};
 if(advice.key==='chase')return {plan:'pressure',label:'Jaga kvitteringen'};
 if(advice.key==='protect')return {plan:'protect',label:'Skydda ledningen'};
 return null;
}
function matchCoachCurrent(){
 const rows=tacticalReviewSnapshot(),row=[...rows].reverse().find(r=>r.coachDecision&&!r.coachDecision.reviewed);
 return row?{row,closed:state.live.finished||row!==rows.at(-1)}:null;
}
function matchCoachChoose(key,choice){
 const m=state.live;if(!m||m.finished||!['apply','keep'].includes(choice)||matchCoachCurrent())return;
 // Validate again: a goal or a manual order can make a rendered button stale.
 const advice=matchEvidenceReport().advice.find(a=>a.key===key),option=advice&&matchCoachOption(advice);
 if(!option){matchPause();matchNotice('Matchbilden har ändrats. Läs assistentens aktuella bedömning.');return;}
 matchPause();
 const decision={key,title:advice.title,evidence:advice.evidence,risk:advice.risk,choice,label:choice==='keep'?'Behåll matchplanen':option.label};
 if(choice==='keep'){
  tacticalReviewRecord(tacticalReviewPlan(),decision.label,decision);
  addEvent('Coach behåller matchplanen: '+advice.title,'strategy');
 }else if(option.plan)matchPlan(option.plan,decision);
 else matchOrder(option.field,option.value,decision);
 matchDesk.tab='feedback';
 matchNotice(decision.label+'. Vi följer nästa tre minuter vid lika styrka. Tryck Fortsätt när du är klar.');
 matchFocus('match-coach-followup');
}
function matchCoachReview(){
 const current=matchCoachCurrent();if(!current||(!current.closed&&(current.row.result?.seconds||0)<180))return;
 matchPause();
 const record=state.live.tacticalReviews.find(r=>r.time===current.row.time);
 record.coachDecision.reviewed=true;
 matchDesk.notice='';save();render();matchFocus('match-tab-feedback');
}
function matchCoachOutcome(row,closed=false){
 const before=row.baseline,after=row.result,enough=!row.partial&&before?.seconds>=180&&after?.seconds>=180;
 if(row.partial)return {enough:false,text:'Äldre match med ofullständigt underlag. Ingen säker jämförelse kan göras.'};
 if(!enough)return {enough:false,text:closed?'Uppföljningen avslutades innan tre minuter vid lika styrka fanns på båda sidor om beslutet.':after?.seconds>=180?'Tre minuter spelade. Underlaget före beslutet är för kort för en rättvis jämförelse.':`Följer beslutet · ${analysisTime(Math.floor(after?.seconds||0))} av minst 3:00 vid lika styrka.`};
 const metric=['danger','protect'].includes(row.coachDecision.key)?'dangerAgainst':'dangerFor';
 const delta=after[metric]*600/after.seconds-before[metric]*600/before.seconds;
 return {enough:true,text:Math.abs(delta)<.5?'Ungefär samma takt av farliga lägen.':`${delta<0?'Färre':'Fler'} farliga lägen ${metric==='dangerAgainst'?'bakåt':'framåt'} per spelminut.`};
}
function matchCoachFollowupView(row,closed=false,interactive=false){
 const d=row.coachDecision;if(!d)return '';
 const outcome=matchCoachOutcome(row,closed),metric=(x,key)=>x?.seconds>=180&&!row.partial?(x[key]*600/x.seconds).toFixed(1):'—';
 return `<article class="mc-decision-followup" id="${interactive?'match-coach-followup':'match-coach-report-'+row.time}" tabindex="-1"><strong>${trainingSafe(d.label)} · ${analysisTime(row.time)}</strong><p class="mc-decision-status" role="status">${trainingSafe(outcome.text)}</p><table><caption>Farliga lägen per 10 minuter · lika styrka</caption><thead><tr><th></th><th>Före</th><th>Efter</th></tr></thead><tbody><tr><th>Skapade</th><td>${metric(row.baseline,'dangerFor')}</td><td>${metric(row.result,'dangerFor')}</td></tr><tr><th>Insläppta</th><td>${metric(row.baseline,'dangerAgainst')}</td><td>${metric(row.result,'dangerAgainst')}</td></tr></tbody></table><p class="mc-note">Speltid: ${analysisTime(Math.floor(row.baseline?.seconds||0))} före · ${analysisTime(Math.floor(row.result?.seconds||0))} efter. PP och BP räknas separat.</p><details><summary>Varför beslutet togs</summary><p>${trainingSafe(d.evidence)}</p><p><b>Avvägning:</b> ${trainingSafe(d.risk)}</p><p>Före: sedan föregående registrerade tränarbeslut eller nedsläpp. Efter: fram till nästa beslut eller nu. Motstånd och spelare på isen kan ändras. Siffrorna visar förloppet, inte en bevisad effekt.${d.additionalChanges?' Flera ändringar gjordes vid samma paus.':''}</p></details>${interactive?`<div class="mc-decision-actions">${closed||(row.result?.seconds||0)>=180?'<button type="button" class="btn secondary" onclick="matchCoachReview()">Bedöm matchbilden igen</button>':''}<button type="button" class="mc-text-button" onclick="matchTab('tactics')">Justera taktiken</button></div>`:''}</article>`;
}
function matchCoachAdviceView(advice){
 const option=matchCoachOption(advice);
 return `<article class="mc-decision-advice"><strong>${trainingSafe(advice.title)}</strong><p>${trainingSafe(advice.evidence)}</p><p>${trainingSafe(advice.suggestion)}</p><p class="mc-note"><b>Avvägning:</b> ${trainingSafe(advice.risk)}</p><div class="mc-decision-actions">${option?`<button type="button" class="btn" onclick="matchCoachChoose('${advice.key}','apply')">${option.label}</button><button type="button" class="btn secondary" onclick="matchCoachChoose('${advice.key}','keep')">Behåll planen</button>`:`<button type="button" class="btn secondary" onclick="matchTab('${advice.tab}')">${advice.action}</button>`}</div></article>`;
}
