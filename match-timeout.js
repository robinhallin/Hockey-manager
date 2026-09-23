'use strict';
const MATCH_TIMEOUT_SECONDS=30;
function timeoutEnergy(level,stamina,ceiling){return readinessRecover(level,MATCH_TIMEOUT_SECONDS,stamina,ceiling);}
function timeoutOwnPlayers(){
 const m=state.live;if(!m)return [];
 const actors=studioActive()?studioEngine().actors:m.rink?.actors||[];
 const onIce=new Set(actors.filter(a=>(a.side===0||a.side==='own')&&a.role!=='G'&&a.pos!=='MV').map(a=>String(a.player?.id??a.id)));
 return managerRoster().filter(p=>p.pos!=='MV').map(p=>{
  const before=matchEnergy(p),after=timeoutEnergy(before,p.attributes?.stamina||10,readinessCeiling(p.fatigue||0));
  return {id:p.id,name:p.name,before,after,onIce:onIce.has(String(p.id))};
 });
}
function matchTimeoutRecovery(key,side){
 const m=state.live;if(!m||m.finished||m.energy?.breaks?.includes(key))return false;
 const own=timeoutOwnPlayers();m.energy??={version:1,players:{},breaks:[]};m.energy.breaks??=[];
 m.energy.breaks.push(key);
 for(const [team,roster] of [[0,managerRoster()],[1,state.clubRosters[m.opponent]||[]]])for(const p of roster){
  const fatigue=(p.fatigue||0)+(team===1?(m.rink?.oppFatigue?.[p.id]||0):0),ceiling=readinessCeiling(fatigue);
  const e=m.energy.players[p.id]??={level:ceiling,shift:0,seconds:0};
  e.level=timeoutEnergy(e.level,p.attributes?.stamina||10,ceiling);e.shift=0;
 }
 // Rotation and attributes must see the recovery before the next simulation step.
 if(studioActive())for(const t of studioEngine().teams)for(const p of t.players)if(m.energy.players[p.id])p.energy=m.energy.players[p.id].level;
 const rows=own.map(p=>({...p,after:m.energy.players[p.id].level}));
 m.timeoutReports=[...(m.timeoutReports||[]),{key,side,club:side==='own'?managerClub():m.opponent,time:analysisClock(),seconds:MATCH_TIMEOUT_SECONDS,players:rows}];
 return true;
}
function timeoutPlayerTable(rows){
 return `<table><thead><tr><th>Spelare på isen</th><th>Ork före → efter</th></tr></thead><tbody>${rows.filter(p=>p.onIce).map(p=>`<tr><th>${playerReference(p.id,p.name)}</th><td>${p.before.toFixed(1)} → ${p.after.toFixed(1)} %</td></tr>`).join('')}</tbody></table>`;
}
function timeoutDecisionView(){
 const m=state.live;if(!m||m.finished)return '';
 const rows=timeoutOwnPlayers().filter(p=>p.onIce),gain=rows.length?rows.reduce((n,p)=>n+p.after-p.before,0)/rows.length:0;
 const last=m.timeoutReports?.at(-1);
 return `<div class="mc-note"><p>${m.timeoutUsed?'Din timeout är använd.':`En timeout kvar · ${MATCH_TIMEOUT_SECONDS} sekunders återhämtning för båda lagen. ${rows.length?`Utespelarna på isen beräknas få +${gain.toFixed(1)} procentenheter ork i snitt.`:'Ingen femma registrerad på isen ännu.'}`} Säsongsbelastningen minskar inte. Matchklocka och utvisningstid står stilla.</p>${last?`<details><summary>Senaste timeout · ${trainingSafe(last.club)} · ${analysisTime(last.time)}</summary>${timeoutPlayerTable(last.players)}<p>Registrerad återhämtning för dina spelare. Motståndaren fick också vila; detta visar inte att timeouten förbättrade matchresultatet.</p></details>`:''}</div>`;
}
function timeoutReportView(match){
 if(!match.timeoutReports?.length)return '';
 return `<section class="mw-panel"><h2>Timeout & återhämtning</h2>${match.timeoutReports.map(r=>`<details><summary>${trainingSafe(r.club)} · ${analysisTime(r.time)} · ${r.seconds} sekunder</summary>${timeoutPlayerTable(r.players)}</details>`).join('')}<p>Registrerad ork hos dina utespelare på isen. Båda lagen återhämtade sig. Belastning, istid och matchklocka ändrades inte av pausen. Uppgifterna visar återhämtningen, inte en säker effekt på senare mål eller slutresultat.</p></section>`;
}
