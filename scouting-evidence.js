"use strict";
function scoutingPruneEvidence(date=state.calendar?.date){
 if(!date)return;
 const cutoff=calAdd(date,-35),rosters=[...Object.values(state.clubRosters||{}),state.playerWorld?.freeAgents||[],state.loans?.external||[],state.juniors?.roster||[],...Object.values(state.clubAI?.clubs||{}).map(c=>c.academy?.roster||[])];
 for(const roster of rosters)for(const p of roster){
  if(!Array.isArray(p.scoutingGames))continue;
  const recent=p.scoutingGames.filter(g=>g.date>=cutoff).slice(-8);
  if(!recent.length)delete p.scoutingGames;else if(recent.length!==p.scoutingGames.length)p.scoutingGames=recent;
 }
}
// Save only the evidence produced by the statistics ledger. The simulation and
// its results are unchanged; discarded box scores become a bounded scout source.
function scoutingRecordFixture(game,rows,partial=false){
 if(partial||!game?.played)return;
 const date=game.date||state.calendar?.date,key=`${state.season.year}:${game.seriesId||'regular'}:${game.round}:${game.home}:${game.away}`;
 for(const row of rows){
  if(!(row.seconds>0))continue;
  const p=state.clubRosters[row.club]?.find(p=>samePlayerId(p.id,row.id));if(!p)continue;
  const games=p.scoutingGames||[];if(games.some(g=>g.key===key))continue;
  // The scout context uses five recent appearances. Eight leave room between
  // weekly visits without duplicating twenty box-score sources for every player.
  // Delivered reports keep their own frozen source ledger and assessment.
  p.scoutingGames=[...games,{key,date,club:row.club,seconds:row.seconds,opponent:row.club===game.home?game.away:game.home}].slice(-8);
 }
}
function scoutingRecordedGames(p,date=state.calendar.date){
 const club=getPlayerClub(p.id),games=[...(p.roleGames||[]),...(p.scoutingGames||[])].filter(g=>g.club===club&&g.date&&g.date<=date&&calGap(g.date,date)<=35);
 // The same appearance can also exist in the manager's role ledger.
 return [...new Map(games.map(g=>[g.date+':'+(g.opponent||''),g])).values()].sort((a,b)=>a.date.localeCompare(b.date));
}
// Evidence keys describe recorded work, never a timer or a changed hidden rating.
function scoutingFreshEvidence(p,date=state.calendar.date){
 const report=state.scoutReports[String(p.id)],used=new Set(report?.evidenceKeys||[]),club=getPlayerClub(p.id),fresh=[];
 const recent=d=>typeof d==='string'&&d<=date&&calGap(d,date)<=35;
 for(const g of scoutingRecordedGames(p,date)){
  if(g.club!==club||!recent(g.date)||!(g.seconds>0))continue;
  const key='match:'+p.id+':'+(g.key||[g.club,g.date,g.opponent||'',g.year||''].join(':'));
  if(!used.has(key))fresh.push({key,type:'match',date:g.date,club,seconds:g.seconds,label:`Matchunderlag ${calText(g.date)} · ${Math.round(g.seconds/60)} minuter`});
 }
 for(const s of p.trainingSessions||[]){
  if(!recent(s.date)||s.rest||s.injured||report?.lastObserved&&s.date<=report.lastObserved)continue;
  const key='training:'+p.id+':'+s.date+':'+(s.key||s.type||'');
  if(!used.has(key))fresh.push({key,type:'training',date:s.date,club,seconds:0,label:`Registrerat träningspass ${calText(s.date)} · ${s.target||s.type||'individuell träning'}`});
 }
 // Old reports have no source ledger. Their old snapshots remain valid, but are
 // not relabelled as new observations after migration.
 const valid=fresh.filter(e=>!report?.lastObserved||e.date>report.lastObserved);
 if(valid.length)return valid.sort((a,b)=>b.date.localeCompare(a.date));
 if(!report?.visits&&!report?.snapshot&&!used.has('background:'+p.id))return [{key:'background:'+p.id,type:'background',date,club,seconds:0,label:'Första bakgrundskartläggning · inget färskt match- eller träningsunderlag'}];
 return [];
}
function scoutingEvidenceView(p){
 const r=state.scoutReports[String(p.id)];if(!r?.visits)return '';
 const sources=r.observationSources||[];
 return `<section class="sc-evidence"><h3>Vad bygger bedömningen på?</h3>${sources.length?sources.slice(0,6).map(e=>`<p><strong>${calText(e.observed)} · ${{match:'Match',training:'Träning',background:'Bakgrundskontroll'}[e.type]||'Underlag'}</strong><br>${trainingSafe(e.label)}</p>`).join(''):'<p>Äldre bedömning: källan registrerades inte i denna sparversion.</p>'}${r.waitingForEvidence?'<p>Nytt underlag saknas. Bedömningen blir inte säkrare av att tiden går.</p>':''}<p>Varje registrerad match eller träningsdag används en gång. Bedömning och potential förblir osäkra.</p></section>`;
}
