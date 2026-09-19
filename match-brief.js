"use strict";
// A dated brief records real orders and evidence; it never adds ability bonuses.
const MATCH_BRIEF_GOALS={
 defense:{name:'Stäng de farliga ytorna',plan:'protect',shotChoice:'balanced',risk:'Lägre press ger motståndaren mer pucktid och kan minska våra egna chanser.'},
 attack:{name:'Skapa bättre chanser',plan:'control',shotChoice:'patient',risk:'Tålamod kan kosta avslut och öka risken för pucktapp.'},
 pressure:{name:'Flytta spelet framåt',plan:'pressure',shotChoice:'balanced',risk:'Hög press och högt tempo kostar ork och öppnar ytor bakom laget.'}
};
function matchBriefFixture(){return calendarFixtures().filter(g=>!g.played&&g.date>=state.calendar.date).sort((a,b)=>a.date.localeCompare(b.date))[0]||null;}
function matchBriefKey(g){return g?[managerClub(),state.season.year,g.date,g.opponent,g.kind,g.venue].join('|'):null;}
function matchBriefMeasures(m){
 const seconds=m?.strengthSeconds?.even;
 if(m?.partial||m?.strengthPartial||m?.abandoned||!Number.isFinite(seconds)||seconds<600)return null;
 const shots=(m.shots||[]).filter(s=>s.situation==='even'&&s.dangerous);
 return {seconds,own:shots.filter(s=>s.side==='own').length,against:shots.filter(s=>s.side==='opponent').length};
}
function matchBriefBaseline(){
 const rows=(state.analysis?.matches||[]).filter(m=>coachEligible(m)&&matchBriefMeasures(m)).slice(0,5);
 return {count:rows.length,ids:rows.map(m=>m.id),...rows.reduce((out,m)=>{const v=matchBriefMeasures(m);for(const k of ['seconds','own','against'])out[k]+=v[k];return out;},{seconds:0,own:0,against:0})};
}
function matchBriefScout(club){
 const recent=(state.rivals?.clubs?.[club]?.recent||[]).filter(g=>g.year===state.season.year&&!g.partial).slice(-5);
 const known=recent.filter(g=>Number.isFinite(g.pp)&&Number.isFinite(g.ppGoals));
 const meetings=(state.analysis?.matches||[]).filter(m=>coachEligible(m)&&!m.strengthPartial&&m.opponent===club&&m.lineMatchups).slice(0,3);
 const rows=meetings.flatMap(m=>Object.values(m.lineMatchups.cells||{})).filter(r=>r.opponent>=0);
 const lines=[0,1,2,3].map(i=>rows.filter(r=>r.opponent===i).reduce((o,r)=>({line:i,seconds:o.seconds+r.seconds,danger:o.danger+r.dangerAgainst}),{line:i,seconds:0,danger:0}));
 return {count:recent.length,ppMatches:known.length,pp:known.reduce((n,g)=>n+g.pp,0),ppGoals:known.reduce((n,g)=>n+g.ppGoals,0),lines};
}
function matchBriefChoose(key){
 const def=MATCH_BRIEF_GOALS[key],g=matchBriefFixture();if(!def||!g||state.live&&!state.live.finished)return;
 const p=MATCH_PLANS[def.plan];state.tactic=p.tactic;
 for(const field of ['attackStyle','forecheck','tempo'])state.tacticalPlan[field]=p[field];
 state.tacticalPlan.shotChoice=def.shotChoice;
 state.matchBrief={version:1,key:matchBriefKey(g),club:managerClub(),year:state.season.year,date:g.date,opponent:g.opponent,goal:key,baseline:matchBriefBaseline(),scout:matchBriefScout(g.opponent),orders:{tactic:state.tactic,...state.tacticalPlan}};
 save();render();
}
function matchBriefMatchup(field,value){
 const b=state.matchBrief;if(state.live&&!state.live.finished||!b||b.key!==matchBriefKey(matchBriefFixture()))return;
 if(!['matchupLine','matchupTarget'].includes(field)||!['0','1','2','3',...(field==='matchupLine'?['none']:[])].includes(value))return;
 state.tacticalPlan[field]=value;b.orders[field]=value;save();render();
}
function matchBriefCapture(opp){
 const b=state.matchBrief,g=matchBriefFixture();
 if(!b||!MATCH_BRIEF_GOALS[b.goal]||b.key!==matchBriefKey(g)||b.date!==state.calendar.date||b.opponent!==opp)return null;
 return JSON.parse(JSON.stringify({...b,startOrders:{tactic:state.tactic,...state.tacticalPlan}}));
}
function matchBriefOrdersChanged(b){return Object.entries(b.orders||{}).some(([k,v])=>JSON.stringify(v)!==JSON.stringify((b.startOrders||{})[k]));}
function matchBriefView(club){
 const g=matchBriefFixture();if(!g||g.opponent!==club)return '';
 const active=state.live&&!state.live.finished,b=active?state.live.matchBrief:state.matchBrief?.key===matchBriefKey(g)?state.matchBrief:null;
 const scout=matchBriefScout(club),last=(state.analysis?.matches||[]).find(m=>coachEligible(m)&&m.opponent===club&&m.matchBrief);
 const lineText=scout.lines.filter(r=>r.seconds>=600).map(r=>`Kedja ${r.line+1}: ${r.danger} farliga lägen på ${analysisTime(r.seconds)} registrerad tid mot oss`).join(' · ');
 const select=(field,label,none)=>`<label>${label}<select onchange="matchBriefMatchup('${field}',this.value)">${[...(none?['none']:[]),'0','1','2','3'].map(v=>`<option value="${v}" ${String(state.tacticalPlan[field]??(none?'none':'0'))===v?'selected':''}>${v==='none'?'Fri rotation':'Kedja '+(Number(v)+1)}</option>`).join('')}</select></label>`;
 return `<section class="rival-panel"><span class="desk-kicker">MATCHBRIEF · ${calText(g.date)}</span><h2>Vår uppgift mot ${trainingSafe(club)}</h2><p>Antal fullständiga säsongsrapporter: ${scout.count}. Powerplay: ${scout.ppGoals} mål på ${scout.pp} lägen. Antal PP-rapporter: ${scout.ppMatches}. ${scout.pp<10?'För få lägen för att kalla det ett stabilt mönster.':'Utfallet beskriver perioden, inte en säker prognos.'}</p><p>${lineText||'För lite registrerad kedjetid från våra tidigare möten för att rangordna deras anfallskedjor.'} Kedjenummer kan avse andra spelare i nästa möte; kontrollera den förväntade uppställningen nedan.</p>${b?`<h3>Vald uppgift: ${MATCH_BRIEF_GOALS[b.goal].name}</h3><p>${MATCH_BRIEF_GOALS[b.goal].risk}</p><p>Jämförelseunderlag fryst vid valet: ${b.baseline.count} matcher. Farliga lägen vid lika styrka följs åt båda håll.</p>`:active?'<p>Ingen brief valdes före den här matchen. Nästa match kan du förbereda här.</p>':'<p>Välj en uppgift. Valet ändrar lagets riktiga taktik och avslutsval; fysisk nivå och rotation behåller dina inställningar.</p>'}${active?`<p>Matchen pågår. Justera order och kedjematchning i matchcentret.${b?' Den ursprungliga briefen ligger kvar för uppföljning.':''}</p>`:`<div class="coach-cycle-options">${Object.entries(MATCH_BRIEF_GOALS).map(([k,d])=>`<article><h3>${d.name}</h3><p>${MATCH_PLANS[d.plan].note} ${d.risk}</p><button class="btn secondary" onclick="matchBriefChoose('${k}')">Välj ${d.name.toLowerCase()}</button></article>`).join('')}</div>${b?`<h3>Kedjematchning vid lika styrka</h3>${select('matchupLine','Vår matchningskedja',true)}${select('matchupTarget','Mot deras kedja',false)}<p>Prioriterar den valda kedjan när den är redo. Övriga kedjor får färre byten; hemmalaget väljer sist.</p>`:''}`}${last?`<details><summary>Lärdom från förra mötet</summary>${matchBriefReport(last,false)}</details>`:''}</section>`;
}
function matchBriefReport(m,training=true){
 const b=m?.matchBrief,def=MATCH_BRIEF_GOALS[b?.goal];if(!def)return '';
 const v=matchBriefMeasures(m),base=b.baseline;
 const rate=(r,k)=>(r[k]*600/r.seconds).toFixed(1);
 const comparison=v?`Farliga lägen per 10 minuter lika styrka: vi ${rate(v,'own')}, motståndaren ${rate(v,'against')}. Registrerad tid ${analysisTime(v.seconds)}.${base?.count>=3&&base.seconds>=1800?` Före matchen (${base.count} matcher): vi ${rate(base,'own')}, motståndaren ${rate(base,'against')}.`:' Minst tre tidigare matcher krävs för en jämförelse med utgångsläget.'}`:'Minst tio minuter fullständigt registrerat spel vid lika styrka krävs för uppföljning.';
 const metric=b.goal==='defense'?'against':'own',riskMetric=metric==='own'?'against':'own';
 const comparable=v&&base?.count>=3&&base.seconds>=1800;
 const change=comparable?(v[metric]/v.seconds-base[metric]/base.seconds)*600:0;
 const riskChange=comparable?(v[riskMetric]/v.seconds-base[riskMetric]/base.seconds)*600:0;
 const observation=!comparable?'Vi samlar underlag för att bedöma uppgiften.':Math.abs(change)<0.5?'Ingen tydlig skillnad mot utgångsläget ännu.':(metric==='against'?change<0:change>0)?'Utfallet går i uppgiftens riktning.':'Utfallet går emot uppgiften. Granska assistentens observationer och formationerna innan du ändrar.';
 const risk=comparable&&(metric==='against'?riskChange<-.5:riskChange>.5)?' Samtidigt syns planens risk i lägesbalansen åt andra hållet.':'';
 const target=String(b.orders.matchupTarget??'0'),own=String(b.orders.matchupLine),cell=m.lineMatchups?.cells?.[own+':'+target];
 const focus=b.goal==='pressure'?'attack':b.goal;
 return `<section class="mw-panel"><h3>${m.finished?'Matchbriefens utfall':'Assistenten följer matchbriefen'} · ${def.name}</h3><p>${comparison}</p><p>${observation}${risk} En halv farlig chans per tio minuter används som observationsgräns, inte som statistisk säkerhet.</p><p>Planens risk: ${def.risk}</p>${['0','1','2','3'].includes(own)?`<p>Planerad matchning: vår kedja ${Number(own)+1} mot deras ${Number(target)+1}. Registrerad tid tillsammans: ${analysisTime(cell?.seconds||0)}. ${cell?.seconds>=600?`${cell.dangerFor}–${cell.dangerAgainst} farliga lägen.`:'För kort underlag för en bedömning.'}</p>`:''}<p>${matchBriefOrdersChanged(b)?'Order ändrades mellan planval och nedsläpp. ':''}${(m.tacticalReviews||[]).length?'Taktiska beslut under matchen finns i beslutsloggen. ':''}Motstånd, matchläge och spelare påverkar utfallet. Siffrorna bevisar inte att planen orsakade resultatet.</p>${training&&m.finished&&coachEligible(m)?`<p>Arbeta vidare med ${COACH_FOCUSES[focus].name.toLowerCase()}. Välj fokus och därefter en lämplig träningsdag i tränarens uppföljning.</p><button class="btn secondary" onclick="coachAdopt('${focus}')">${coachFocus()?'Ersätt aktuellt träningsfokus':'Välj träningsfokus'}</button>`:''}</section>`;
}
function matchBriefLive(){const m=state.live;if(!m?.matchBrief)return '';return matchBriefReport({...m.analysis,matchBrief:m.matchBrief,tacticalReviews:tacticalReviewSnapshot(),finished:false},false);}
