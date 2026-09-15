"use strict";
// One mutually exclusive cell per actual 5v5 moment. Mixed changes remain mixed;
// choosing a line on the bench cannot award it ice time or chances.
function matchLineCell(){
 const m=state.live,e=studioActive()?studioEngine():null;
 if(!e||!m.analysis||analysisSituation()!=='even')return null;
 const actors=e.accountingActors||e.actors;
 if([0,1].some(side=>actors.filter(a=>a.side===side&&a.role!=='G').length!==5||!actors.some(a=>a.side===side&&a.role==='G')))return null;
 const own=studioFormationIndex(e,0),opponent=studioFormationIndex(e,1),key=own+':'+opponent;
 const ledger=m.analysis.lineMatchups??={version:1,startedAt:Math.max(0,analysisClock()),cells:{}};
 return ledger.cells[key]??={own,opponent,seconds:0,shotsFor:0,shotsAgainst:0,dangerFor:0,dangerAgainst:0,goalsFor:0,goalsAgainst:0};
}
function matchLineExposure(seconds){const row=matchLineCell();if(row)row.seconds+=seconds;}
function matchLineShot(shot){
 const row=matchLineCell();if(!row)return;
 const suffix=shot.side==='own'?'For':'Against';
 if(analysisOnTarget(shot))row['shots'+suffix]++;
 if(shot.dangerous)row['danger'+suffix]++;
 if(shot.outcome==='goal')row['goals'+suffix]++;
}
function matchLineRows(ledger){
 const cells=Object.values(ledger?.cells||{}),keys=['seconds','shotsFor','shotsAgainst','dangerFor','dangerAgainst','goalsFor','goalsAgainst'];
 return [0,1,2,3,-1].map(index=>{
  const rows=cells.filter(r=>r.own===index),total={index,...Object.fromEntries(keys.map(k=>[k,rows.reduce((n,r)=>n+(r[k]||0),0)]))};
  total.opposition=rows.filter(r=>r.seconds>0).sort((a,b)=>b.seconds-a.seconds);
  return total;
 });
}
function matchLineName(index){return index<0?'Blandat byte':'Kedja '+(index+1);}
function matchLineTable(ledger,live=false){
 if(!ledger)return '<p class="mc-note">Kedjemöten registreras från nästa spelade fem-mot-fem-sekvens. Äldre rapporter saknar detta underlag.</p>';
 const rows=matchLineRows(ledger),e=live?studioEngine():null;
 return `<div class="mc-table-scroll mc-line-table"><table><caption>Fem mot fem · våra siffror först</caption><thead><tr><th>Kedja</th><th>Istid</th><th>Skott</th><th>Farliga</th><th>Mål</th><th>${live?'Ork nu':'Mest mot'}</th></tr></thead><tbody>${rows.map(r=>{
  const ps=live&&r.index>=0?state.lines.forwards.slice(r.index*3,r.index*3+3).map(playerById).filter(Boolean):[];
  const on=e&&r.index>=0&&studioFormationIndex(e,0)===r.index;
  return `<tr${on?' class="is-on-ice"':''}><th scope="row" title="${trainingSafe(ps.map(p=>p.name).join(', '))}">${matchLineName(r.index)}${on?' · isen':''}</th><td>${analysisTime(r.seconds)}</td><td>${r.shotsFor}–${r.shotsAgainst}</td><td>${r.dangerFor}–${r.dangerAgainst}</td><td>${r.goalsFor}–${r.goalsAgainst}</td><td>${live?(ps.length?Math.round(ps.reduce((n,p)=>n+matchEnergy(p),0)/ps.length)+' %':'—'):(r.opposition.length?matchLineName(r.opposition[0].opponent):'—')}</td></tr>`;
 }).join('')}</tbody></table></div><p class="mc-note">Hela kedjor och blandade byten räknas var för sig. PP, PK och tomt mål är exkluderade.${ledger.startedAt>=1?' Registrerat från '+analysisTime(ledger.startedAt)+'.':''}</p>`;
}
function matchSetMatchup(key,value){
 if(!state.live||state.live.finished||!['matchupLine','matchupTarget'].includes(key)||!['0','1','2','3',...(key==='matchupLine'?['none']:[])].includes(value))return;
 matchPause();const before=tacticalReviewPlan();state.tacticalPlan[key]=value;
 tacticalReviewRecord(before,'Kedjematchning');studioSyncPlans();
 matchNotice(value==='none'?'Fri rotation vald. Kedjeanvändningen styr bytena.':'Matchningen är sparad. Gäller nästa lämpliga byte vid fem mot fem; ork och tillgänglighet går först.');
}
function matchChangesMode(mode){if(!['units','matchup'].includes(mode))return;matchDesk.changesMode=mode;if(mode==='units')matchPause();matchDesk.notice='';render();}
function matchChangesTabs(){return `<nav class="mc-coach-modes" aria-label="Byten och kedjematchning">${[['units','Byt formation'],['matchup','Matchning & utfall']].map(([key,label])=>`<button type="button" aria-pressed="${(matchDesk.changesMode||'units')===key}" onclick="matchChangesMode('${key}')">${label}</button>`).join('')}</nav>`;}
function matchLineView(){
 const m=state.live,e=studioEngine(),plan=state.tacticalPlan,ledger=m.analysis?.lineMatchups;
 if(!e)return '<p class="mc-note">Den här äldre matchen använder tidigare byteslogik. Kedjematchning finns från nästa match.</p>';
 const select=(key,label,none)=>`<label>${label}<select aria-label="${label}" onchange="matchSetMatchup('${key}',this.value)">${(none?[['none','Fri rotation']]:[]).concat([0,1,2,3].map(i=>[String(i),'Kedja '+(i+1)])).map(([v,label])=>`<option value="${v}" ${(plan[key]||(none?'none':'0'))===v?'selected':''}>${label}</option>`).join('')}</select></label>`;
 const matching=['0','1','2','3'].includes(plan.matchupLine);
 return `<div class="mc-matchup-controls">${select('matchupLine','Vår matchningskedja',true)}${select('matchupTarget','Mot deras kedja',false)}</div><p class="mc-note">${matching?'Matchningen prioriteras när kedjan är redo; andra får färre byten.':'Fri rotation.'} Hemmalaget väljer sist.</p>${matchLineTable(ledger,true)}<p class="mc-note" role="status">${trainingSafe(matchDesk.notice||e.teams[0].matchupReason||'Matchningen prövas vid nästa byte.')}</p>`;
}
function matchLineReport(match){
 return `${matchesTabs('formations',{matchups:'Kedjemöten',players:'Spelarkombinationer'})}<section class="mw-panel"><h2>${matchesUI.formations==='players'?'Formationer i vald match':'Kedjornas matchbild'}</h2>${matchesUI.formations==='players'?analysisUnitTable(match.units):matchLineTable(match.lineMatchups)+`<div class="mc-line-grid">${matchLineRows(match.lineMatchups).filter(r=>r.opposition.length&&r.index>=0).map(r=>`<section><h3>${matchLineName(r.index)} · motstånd</h3><table><thead><tr><th>Kedja</th><th>Tid</th><th>Skott</th><th>Farliga</th></tr></thead><tbody>${r.opposition.map(c=>`<tr><th>${matchLineName(c.opponent)}</th><td>${analysisTime(c.seconds)}</td><td>${c.shotsFor}–${c.shotsAgainst}</td><td>${c.dangerFor}–${c.dangerAgainst}</td></tr>`).join('')}</tbody></table></section>`).join('')}</div><p class="mc-note">Kedjenumret följer uppställningen vid varje händelse. Byter du spelare kan samma kedjenummer omfatta flera kombinationer. Kort istid ger osäkert underlag; resultatet bevisar inte effekten av matchningen.</p>`}</section>`;
}
