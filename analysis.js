"use strict";
function ensureAnalysis(){
 if(!state.careerStarted)return;
 if(!state.analysis)state.analysis={version:1,nextId:1,matches:[],selected:'latest',window:'10',side:'all',compareA:null,compareB:null};
 const m=state.live;if(m&&!m.analysis&&!m.finished){
  m.analysis={id:`${state.season?.year||2026}-${state.round}-${state.analysis.nextId++}`,roleUsageVersion:1,taskUsageVersion:1,taskUsagePartial:Boolean(m.minute||m.second||m.period>1||m.shotsHV||m.shotsOpp),shots:[],events:[],flow:[],units:{},players:{},partial:Boolean(m.minute||m.second||m.period>1||m.shotsHV||m.shotsOpp),saved:false,strengthSeconds:{even:0,pp:0,pk:0,ot:0},strengthPartial:Boolean(m.minute||m.second||m.period>1)};
  for(const p of managerRoster())m.analysis.players[String(p.id)]={id:p.id,name:p.name,pos:p.pos,seconds:0,shots:0,goals:0,assists:0,pim:0,startAttributes:{...p.attributes}};
 }
 ensureLeagueLive();
}
function analysisClock(){const m=state.live;return (m.period<=3?(m.period-1)*1200:3600+((m.overtimePeriods||1)-1)*1200)+m.minute*60+m.second;}
function analysisSituation(){const m=state.live;if(m.accountingSituation)return m.accountingSituation;return StudioHockey.penaltyCount(m.penaltiesOpp)>StudioHockey.penaltyCount(m.penaltiesHV)?'pp':StudioHockey.penaltyCount(m.penaltiesHV)>StudioHockey.penaltyCount(m.penaltiesOpp)?'pk':m.period===4&&!isPlayoffMatch()?'ot':'even';}
function analysisUnits(){
 const m=state.live;if(!m)return [];
 const situation=analysisSituation(),skaters=[...currentLinePlayers(),...currentDefensePlayers()];
 if(situation!=='even'){const n=(m.rotationIndex||0)%2+1;return [{kind:situation,label:situation==='ot'?'Förlängning':`${situation.toUpperCase()} ${n}`,players:skaters}];}
 const index=kind=>studioActive()?studioFormationIndex(studioEngine(),0,kind):kind==='forward'?m.currentLine:m.currentDefensePair;
 return ['forward','defense'].map(kind=>{const i=index(kind);return {kind,label:i<0?(kind==='forward'?'Blandade forwards':'Blandade backar'):`${kind==='forward'?'Kedja':'Backpar'} ${i+1}`,players:kind==='forward'?currentLinePlayers():currentDefensePlayers()};});
}
function analysisUnitRecord(unit){
 const a=state.live.analysis,key=JSON.stringify([unit.kind,...unit.players.map(p=>String(p.id)).sort()]);
 if(!a.units[key])a.units[key]={key,kind:unit.kind,label:unit.label,names:unit.players.map(p=>p.name),ids:unit.players.map(p=>p.id),seconds:0,shotsFor:0,shotsAgainst:0,dangerFor:0,dangerAgainst:0,goalsFor:0,goalsAgainst:0};
 return a.units[key];
}
function analysisPlayer(p){const a=state.live.analysis;return a.players[String(p.id)]||(a.players[String(p.id)]={id:p.id,name:p.name,pos:p.pos,seconds:0,shots:0,goals:0,assists:0,pim:0,startAttributes:{...p.attributes}});}
function analysisFlowSnapshot(){
 const m=state.live,a=m?.analysis,r=m?.rink;if(!a||!r?.stats)return;
 a.flow??=[];const time=analysisClock(),last=a.flow.at(-1);if(last&&time-last.time<30)return;
 const copy=s=>Object.fromEntries(['attempts','passes','passAttempts','entries','zone','turnovers','battles','battleWins','dumps','clears'].map(k=>[k,Number(s?.[k]||0)]));
 a.flow.push({time,sides:[copy(r.stats[0]),copy(r.stats[1])]});
 if(a.flow.length>140)a.flow.splice(0,a.flow.length-140);
}
function analysisTaskAssignments(players){
 if(studioActive())return studioTaskAssignments(studioEngine());
 const m=state.live;
 if(analysisSituation()!=='even'||m.goaliePulled||m.aiGoaliePulled||StudioHockey.penaltyCount(m.penaltiesHV)||StudioHockey.penaltyCount(m.penaltiesOpp)||players.filter(p=>p.pos!=='MV').length!==5)return {};
 return Object.fromEntries(players.filter(p=>p.pos!=='MV').flatMap(p=>{
  const di=state.lines.defense.findIndex(id=>samePlayerId(id,p.id)),fi=state.lines.forwards.findIndex(id=>samePlayerId(id,p.id));
  return di>=0?[[String(p.id),playerTask('defense',di)]]:fi>=0?[[String(p.id),playerTask('forwards',fi)]]:[];
 }));
}
function analysisTaskIce(row,key,seconds){
 const def=PLAYER_TASKS[key];if(!def||seconds<=0)return;
 row.taskUsage??={};
 if(!row.taskUsage[key]){
  const values=def.keys.map(k=>row.startAttributes?.[k]);
  row.taskUsage[key]={name:def.name,seconds:0,fit:values.every(Number.isFinite)?values.reduce((n,v)=>n+v,0)/values.length:null};
 }
 row.taskUsage[key].seconds+=seconds;
}
function analysisIce(players,seconds,taskAssignments=null){
 ensureAnalysis();if(!state.live?.analysis||state.live.finished||seconds<=0)return;
 analysisFlowSnapshot();
 const a=state.live.analysis;if(!a.strengthSeconds){a.strengthSeconds={even:0,pp:0,pk:0,ot:0};a.strengthPartial=true;}a.strengthSeconds[analysisSituation()]+=seconds;
 // An unfinished older save starts collecting now, never reconstructing earlier tasks.
 if(!a.taskUsageVersion){a.taskUsageVersion=1;a.taskUsagePartial=true;}
 const tasks=taskAssignments??analysisTaskAssignments(players);
 matchLineExposure(seconds);
 for(const unit of analysisUnits())analysisUnitRecord(unit).seconds+=Math.max(0,Math.min(seconds,...unit.players.map(p=>medicalLimit(p)-(state.live.iceTime?.[p.id]||0))));
 for(const p of players){
  const row=analysisPlayer(p),elapsed=Math.max(0,Math.min(seconds,medicalLimit(p)-(state.live.iceTime?.[p.id]||0)));
  row.seconds+=elapsed;
  if(tasks[String(p.id)])analysisTaskIce(row,tasks[String(p.id)],elapsed);
  // Record the placement at each actual shift, never the lineup at the final whistle.
  if(analysisSituation()==='even'&&p.pos!=='MV'){
   const fi=state.lines.forwards.findIndex(id=>samePlayerId(id,p.id)),di=state.lines.defense.findIndex(id=>samePlayerId(id,p.id));
   const rank=fi>=0?Math.floor(fi/3):di>=0?Math.floor(di/2):-1;
   if(rank>=0){row.roleUsage??=[0,0,0,0];row.roleUsage[rank]+=elapsed;}
  }
 }
}
// Positions are generated by this shot model and modify the same probability used for its outcome.
function shotLocation(dangerous){const x=dangerous?76+Math.random()*14:46+Math.random()*40,y=dangerous?38+Math.random()*24:12+Math.random()*76;return {x,y,factor:Math.max(.8,Math.min(1.15,1+(x-70)/150-Math.abs(y-50)/200))};}
function analysisOnTarget(s){return ['goal','save','rebound'].includes(s.outcome);}
function recordAnalysisShot(side,name,id,dangerous,location,probability,result,override=null){
 ensureAnalysis();const a=state.live?.analysis;if(!a)return;
 const outcome=override||(result<probability?'goal':result<probability+.12?'post':result<probability+.28?'rebound':'save');
 const shot={time:analysisClock(),side,name,id,dangerous:Boolean(dangerous),x:location.x,y:location.y,probability,outcome,situation:analysisSituation()};
 a.shots.push(shot);
 matchLineShot(shot);
 leagueTrackShot(side,id,name,outcome);
 for(const unit of analysisUnits()){const u=analysisUnitRecord(unit);if(analysisOnTarget(shot))u[side==='own'?'shotsFor':'shotsAgainst']++;if(dangerous)u[side==='own'?'dangerFor':'dangerAgainst']++;}
 if(side==='own'){const p=playerById(id);if(p&&analysisOnTarget(shot))analysisPlayer(p).shots++;}
}
function analysisEvent(type,side,text,id=null,details={}){
 ensureAnalysis();const a=state.live?.analysis;if(!a)return;
 if(details.penaltyId&&a.events.some(e=>e.type==='penalty'&&e.penaltyId===details.penaltyId))return;
 const scorer=type==='goal'?findPlayerAnywhere(id):null;
 const subject=id!=null?findPlayerAnywhere(id):null;
 a.events.push({time:analysisClock(),period:state.live.period,clock:gameTime(),type,side,text,situation:analysisSituation(),...(subject?{playerId:subject.id,playerName:subject.name}:{}),...(type==='penalty'?{...details,minutes:details.minutes??2}:{}),...(type==='goal'?{scorerId:id,scorer:scorer?.name||null,assists:[],own:state.live.hv,against:state.live.opp}: {})});
 if(type==="goal"||type==="penalty")leagueTrackEvent(type,side,id,null,details);
 if(type==='goal'){
  for(const unit of analysisUnits())analysisUnitRecord(unit)[side==='own'?'goalsFor':'goalsAgainst']++;
  if(side==='own'){const p=playerById(id);if(p)analysisPlayer(p).goals++;}
 }
 if(type==='penalty'&&side==='own'){const p=playerById(id);if(p)analysisPlayer(p).pim+=details.minutes??2;}
}
function analysisAssist(p){ensureAnalysis();leagueTrackEvent("assist","own",p.id);if(state.live?.analysis)analysisPlayer(p).assists++;}
function analysisSnapshot(){
 const m=state.live,a=m?.analysis;if(!a)return null;
 return {id:a.id,year:state.season?.year||2026,round:state.round,date:state.calendar?.date,friendly:Boolean(m.friendly),club:managerClub(),opponent:m.opponent,home:matchVenue().ownHome,stage:m.friendly?'Träningsmatch':state.season?.phase==='playoffs'?SEASON_STAGES[state.schedule.find(g=>g.round===state.round&&(g.home===managerClub()||g.away===managerClub()))?.stage||state.season.stage]:'Grundserie',own:m.hv,against:m.opp,finished:m.finished,performance:m.performance||null,matchBrief:m.matchBrief?JSON.parse(JSON.stringify(m.matchBrief)):null,tacticalReviews:tacticalReviewSnapshot(),timeoutReports:m.timeoutReports,hockey:m.rink?.hockey?{counts:m.rink.hockey.counts,stops:m.rink.hockey.stops}:null,partial:a.partial,overtime:Boolean(m.overtime||m.analysisShootout||m.period>3),shootout:Boolean(m.analysisShootout),abandoned:Boolean(m.analysisAbandoned),lineMatchups:a.lineMatchups,strengthSeconds:a.strengthSeconds,strengthPartial:a.strengthPartial,shots:a.shots,events:a.events,flow:a.flow||[],units:Object.values(a.units),players:Object.values(a.players).map(p=>{const current=playerById(p.id);return {...p,endAttributes:{...(current?.attributes||p.startAttributes)}};})};
}
function finishAnalysis(){
 ensureAnalysis();leagueCommitLive();finishPerformance();const a=state.live?.analysis;if(!a||a.saved||!state.live.finished)return;
 const snapshot=analysisSnapshot();dynamicsRecordMatch(snapshot);a.saved=true;state.analysis.matches.unshift(JSON.parse(JSON.stringify(snapshot)));trimAnalysisArchive();state.analysis.selected='latest'; storiesAfterMatch(snapshot);coachMatchDone(snapshot);feedbackAfterMatch(snapshot);
 managerMessage(`analysis:${a.id}`,'Matchanalysen är klar',`${snapshot.club} ${snapshot.own}–${snapshot.against} ${snapshot.opponent}. Skott, formationer och spelarnas minuter finns under Statistik & analys.`,'Matchanalytiker',{link:'statistics'});
}
function analysisLiveReport(){
 const id=state.live?.analysis?.id;
 return (id&&state.analysis?.matches?.find(m=>m.id===id))||analysisSnapshot();
}

// These are match performances, independent of scouting, ability and potential.
function performanceGrade(row,partial=false){
 const keeper=row.pos==='MV',faced=(row.saves||0)+(row.against||0);
 if(partial||row.seconds<(keeper?600:180))return {stars:null,reason:partial?'Ofullständigt matchunderlag':'För kort istid för ett rättvist betyg'};
 if(keeper&&faced<5)return {stars:null,reason:'För få skott mot mål för en säker bedömning'};
 let score=3,reason;
 if(keeper){
  // Shrink small shot samples toward a neutral performance, without credit for shootouts.
  score+=((row.saves+10.8)/(faced+12)-.9)*18;
  if(row.against===0&&row.seconds>=3000)score+=.25;
  reason=`${row.saves}/${faced} räddningar (${Math.round(row.saves/faced*100)} %), ${row.against} insläppta, ${analysisTime(row.seconds)} istid`;
 }else{
  const ice=row.evenIce;
  score+=(row.goals||0)*.58+(row.assists||0)*.35+Math.min(.3,(row.shots||0)*.055)-(row.pim||0)*.065;
  if(ice)score+=Math.max(-.65,Math.min(.65,(ice.goalsFor-ice.goalsAgainst)*(row.pos==='B'?.23:.16)+(ice.shotsFor-ice.shotsAgainst)*.024));
  reason=`${row.goals} mål, ${row.assists} assist, ${row.shots} skott på mål, ${row.pim} utvisningsminuter, ${analysisTime(row.seconds)} istid${ice?`; på isen i lika styrka: ${ice.goalsFor}–${ice.goalsAgainst} mål, ${ice.shotsFor}–${ice.shotsAgainst} skott`:''}`;
 }
 const facets=[];
 if(keeper&&row.xGA!=null){const prevented=row.xGA-row.against;score+=Math.max(-.7,Math.min(.7,prevented*.25));facets.push(`Förväntade insläppta: ${row.xGA.toFixed(2)}; mål förhindrade: ${prevented.toFixed(2)}`);}
 if(!keeper&&row.passAttempts!=null){const completion=(row.passes||0)/Math.max(1,row.passAttempts);score+=Math.max(-.3,Math.min(.3,(completion-.72)*1.5));facets.push(`Uppspel: ${row.passes||0}/${row.passAttempts} passningar (${Math.round(completion*100)} %)`);}
 if(!keeper&&(row.battleWins!=null||row.battleLosses!=null)){const net=(row.battleWins||0)-(row.battleLosses||0);score+=Math.max(-.35,Math.min(.35,net*.055));facets.push(`Puckdueller: ${row.battleWins||0} vunna, ${row.battleLosses||0} förlorade`);}
 if(!keeper){score+=Math.min(.3,(row.blocks||0)*.07+(row.hits||0)*.015);if(row.xG!=null)facets.push(`Avslutskvalitet: ${row.xG.toFixed(2)} xG`);if(row.blocks||row.hits)facets.push(`Försvarsarbete: ${row.blocks||0} blockeringar, ${row.hits||0} tacklingar`);}
 reason+=facets.length?' · '+facets.join(' · '):'';
 return {stars:Math.round(Math.max(0,Math.min(5,score))*2)/2,score:Math.round(Math.max(0,Math.min(5,score))*20)/10,facets,reason};
}
function finishPerformance(){
 const m=state.live;if(!m?.finished||m.performance)return;
 const partial=Boolean(m.leagueBox?.partial||m.analysis?.partial||m.analysisAbandoned);
 const rows=Object.values(m.leagueBox?.players||{}).filter(p=>p.seconds>0).map(p=>{const side=p.club===managerClub()?0:1,metrics=m.broadcast?studioEngine().teams[side].players.find(q=>samePlayerId(q.id,p.id))?.matchMetrics||{}:{};const row={...p,...metrics};return {...row,...performanceGrade(row,partial)};});
 m.performance={version:1,date:state.calendar?.date,club:managerClub(),opponent:m.opponent,partial,rows};
 if(m.analysis?.taskUsageVersion===1){
  m.performance.taskUsagePartial=Boolean(partial||m.analysis.taskUsagePartial);
  m.performance.taskRows=performanceTaskSnapshot(m.performance,m.analysis);
 }
 for(const r of rows){const p=findPlayerAnywhere(r.id);if(p)p.lastPerformance={date:m.performance.date,club:r.club,opponent:r.club===managerClub()?m.opponent:managerClub(),score:r.score??null,stars:r.stars,reason:r.reason};}
}
function performanceStars(value){
 return performanceRating({stars:value});
}
function performanceScore(row){return Number.isFinite(row?.score)?Math.max(0,Math.min(10,row.score)):Number.isFinite(row?.stars)?Math.max(0,Math.min(10,row.stars*2)):null;}
function performanceNumber(value){return value==null?'–':value.toFixed(1).replace('.',',');}
function performanceRating(row){const value=performanceScore(row);return value===null?'<span class="performance-unrated">Ej bedömd</span>':`<span class="performance-rating" aria-label="Matchbetyg ${performanceNumber(value)} av 10,0">${performanceNumber(value)}</span>`;}
function playerRatingSummary(p){
 const rows=Object.values(state.analysis?.history||{}).filter(m=>m.year===state.season.year&&m.club===managerClub()&&!m.friendly&&!m.partial&&!m.abandoned).sort((a,b)=>String(a.date).localeCompare(String(b.date))||(a.round||0)-(b.round||0));
 const rated=rows.flatMap(m=>{const r=m.ratings?.find(r=>samePlayerId(r.id,p.id));return Number.isFinite(r?.score)?[{score:r.score,date:m.date,id:m.id}]:[];});
 return {average:rated.length?rated.reduce((sum,r)=>sum+r.score,0)/rated.length:null,games:rated.length,latest:rated.at(-1)||null};
}
function performanceTaskSnapshot(report,analysis){
 return report.rows.filter(r=>r.club===report.club&&r.pos!=='MV').flatMap(r=>
  Object.entries(analysis.players?.[String(r.id)]?.taskUsage||{}).filter(([,t])=>Number.isFinite(t.seconds)&&t.seconds>0).map(([key,t])=>{
   const base=performanceScore(r),rated=!report.taskUsagePartial&&base!==null&&Number.isFinite(t.fit)&&t.seconds>=180;
   const stars=rated?Math.round(Math.max(0,Math.min(5,2.5+(base-5)*.28+(t.fit-10)*.09))*2)/2:null;
   const reason=report.taskUsagePartial?'Uppgiftsunderlaget är delvis registrerat.':t.seconds<180?'Under tre minuter med uppgiften vid fem mot fem.':base===null?'Matchbetyg saknas.':!Number.isFinite(t.fit)?'Rollpassning vid matchstart saknas.':`Matchbetyg ${performanceNumber(base)} · rollpassning vid matchstart ${t.fit.toFixed(1)}/20.`;
   return {id:r.id,name:r.name,key,task:t.name,seconds:t.seconds,stars,fit:t.fit,reason};
  })
 ).sort((a,b)=>(b.stars??-1)-(a.stars??-1)||b.seconds-a.seconds||String(a.name).localeCompare(String(b.name),'sv'));
}
function performanceTaskRows(report){return (report?.taskRows||[]).map(r=>({...r}));}
function performanceTaskView(report){
 const rows=performanceTaskRows(report),heading='<h2>Spelaruppgifter i matchen</h2>';
 if(!Array.isArray(report?.taskRows))return `<section class="performance-tasks">${heading}<p>Den äldre rapporten saknar registrerade spelaruppgifter. Matchens sparade prestationsbetyg visas ovan.</p></section>`;
 if(!rows.length)return `<section class="performance-tasks">${heading}<p>Ingen registrerad tid med en spelaruppgift vid fem mot fem.</p></section>`;
 return `<section class="performance-tasks">${heading}<p>Faktisk istid med varje uppgift vid fem mot fem. Bedömningen på skalan 0,0–10,0 väger samman hela matchens prestationsbetyg och rollpassning vid matchstart. Minst tre minuter med uppgiften krävs.${report.taskUsagePartial?' Uppgifterna registrerades bara under en del av matchen; inga uppgiftsbetyg sätts.':''}</p><div class="mc-table-scroll"><table><thead><tr><th>Spelare</th><th>Uppgift / istid</th><th>Bedömning</th><th>Underlag</th></tr></thead><tbody>${rows.map(r=>`<tr><th>${playerReference(r.id,r.name)}</th><td>${trainingSafe(r.task)}<small>${analysisTime(r.seconds)}</small></td><td>${performanceStars(r.stars)}</td><td>${trainingSafe(r.reason)}</td></tr>`).join('')}</tbody></table></div></section>`;
}
function performanceView(report){
 if(!report)return '<p class="mc-note">Den äldre matchen saknar underlag för prestationsbetyg.</p>';
 const rows=report.rows.filter(r=>r.club===report.club).sort((a,b)=>a.club.localeCompare(b.club)||(performanceScore(b)??-1)-(performanceScore(a)??-1)||b.seconds-a.seconds);
 return `<section class="performance-report"><h2>Matchens spelarinsatser</h2><p>Betyg för just denna match, på skalan 0,0–10,0. Poäng, avslutskvalitet, passningsspel, puckdueller, blockeringar, disciplin och spel i lika styrka vägs ihop. Målvaktens räddningar bedöms även mot skottens kvalitet när sådant underlag finns. Kort istid och små målvaktsunderlag lämnas utan betyg. Förmåga och potential är separata bedömningar.</p><div class="mc-table-scroll"><table><caption>Prestationsbetyg · ${report.date?calText(report.date):'Matchrapport'}</caption><thead><tr><th>Spelare</th><th>Matchbetyg</th><th>Bakom betyget</th></tr></thead><tbody>${rows.map(r=>`<tr><th scope="row">${playerReference(r.id,r.name)} <small>${r.pos}</small></th><td>${performanceRating(r)}</td><td>${trainingSafe(r.reason)}</td></tr>`).join('')||'<tr><td colspan="3">Ingen registrerad istid. Oanvända reserver får inga betyg.</td></tr>'}</tbody></table></div>${performanceTaskView(report)}</section>`;
}
function archiveMatchSummaries(){
 const a=state.analysis;if(!a)return;
 a.history??={};
 for(const m of a.matches)if(m.finished){const summary=a.history[m.id]??={id:m.id,year:m.year,round:m.round,date:m.date,club:m.club,opponent:m.opponent,own:m.own,against:m.against,stage:m.stage,friendly:m.friendly,partial:m.partial,abandoned:m.abandoned,overtime:Boolean(m.overtime||m.shootout||m.strengthSeconds?.ot>0||m.events?.some(e=>e.period>3)),shootout:m.shootout,shots:[0,1].map(i=>(m.shots||[]).filter(s=>s.side===(i?'opponent':'own')&&analysisOnTarget(s)).length)};
  summary.round??=m.round;
  summary.overtime??=Boolean(m.overtime||m.shootout||m.strengthSeconds?.ot>0||m.events?.some(e=>e.period>3));
  if(!summary.ratings&&m.performance&&!m.performance.partial)summary.ratings=m.performance.rows.filter(r=>r.club===m.club&&performanceScore(r)!==null).map(r=>({id:r.id,score:performanceScore(r)}));
 }
}
function careerHistoryView(){
 archiveMatchSummaries();
 const matches=Object.values(state.analysis?.history||{}).filter(m=>!m.friendly&&!m.abandoned);
 const years=[...new Set(matches.map(m=>m.year))].sort((a,b)=>b-a);
 return `<section class="season-archive"><h2>Matchminnen & klubbrekord</h2><p>Resultat och skottsummor bevaras även när detaljerade matchrapporter gallras. Äldre borttagna matcher kan inte återskapas. Fullständig säsongsstatistik finns under Ligorna → Spelarstatistik.</p>${years.map(year=>{const games=matches.filter(m=>m.year===year);return `<details><summary>${seasonLabel(year)} · ${games.length} registrerade tävlingsmatcher</summary>${[...new Set(games.map(m=>m.club))].map(club=>{const own=games.filter(m=>m.club===club),wins=own.filter(m=>m.own>m.against).length,best=[...own].sort((a,b)=>(b.own-b.against)-(a.own-a.against))[0];return `<p><strong>${trainingSafe(club)}</strong> · ${wins} vinster av ${own.length} matcher · ${own.reduce((n,m)=>n+m.own,0)}–${own.reduce((n,m)=>n+m.against,0)} mål. Största målskillnad: ${best.own}–${best.against} mot ${trainingSafe(best.opponent)}.</p>`;}).join('')}${games.map(m=>`<div class="row"><span>${m.date?calText(m.date):''} · ${trainingSafe(m.club)} – ${trainingSafe(m.opponent)}${m.partial?' · delvis registrerade skott':''}</span><strong>${m.own}–${m.against} · skott ${m.shots.join('–')}</strong></div>`).join('')}</details>`;}).join('')||'<p>Matchminnen börjar sparas från dina registrerade matcher.</p>'}</section>`;
}
function trimAnalysisArchive(){
 archiveMatchSummaries();
 const a=state.analysis;a.matches=a.matches.slice(0,80);
 let size=JSON.stringify(a.matches).length;
 while(size>1200000&&a.matches.length>1){size-=JSON.stringify(a.matches.pop()).length+1;}
}
function analysisSelection(){const s=state.analysis;if(s.selected==='live')return analysisLiveReport();return s.matches.find(m=>m.id===s.selected)||s.matches[0]||analysisLiveReport();}
function analysisSamples(){const s=state.analysis,matches=s.matches.filter(m=>m.club===managerClub()&&!m.friendly);return s.window==='season'?matches.filter(m=>m.year===(state.season?.year||2026)):s.window==='all'?matches:matches.slice(0,Number(s.window)||10);}
function analysisRate(n,seconds){return seconds>0?(n*3600/seconds).toFixed(1):'—';}
function analysisTime(seconds){return `${Math.floor(seconds/60)}:${String(Math.floor(seconds%60)).padStart(2,'0')}`;}
function analysisAggregateUnits(matches){const units={};for(const m of matches)for(const u of m.units){if(!units[u.key])units[u.key]={...u,seconds:0,shotsFor:0,shotsAgainst:0,dangerFor:0,dangerAgainst:0,goalsFor:0,goalsAgainst:0,matches:0};const row=units[u.key];row.matches++;for(const k of ['seconds','shotsFor','shotsAgainst','dangerFor','dangerAgainst','goalsFor','goalsAgainst'])row[k]+=u[k];}return Object.values(units).sort((a,b)=>b.seconds-a.seconds);}
function analysisAggregatePlayers(matches){const players={};for(const m of [...matches].reverse())for(const p of m.players){if(!players[p.id])players[p.id]={id:p.id,name:p.name,pos:p.pos,games:0,seconds:0,shots:0,goals:0,assists:0,pim:0,start:p.startAttributes,end:p.endAttributes};const row=players[p.id];if(p.seconds>0)row.games++;for(const key of ['seconds','shots','goals','assists','pim'])row[key]+=key==='shots'?(m.shots||[]).filter(s=>s.side==='own'&&samePlayerId(s.id,p.id)&&analysisOnTarget(s)).length:p[key];row.end=p.endAttributes;}return Object.values(players).filter(p=>p.games).sort((a,b)=>(b.goals+b.assists)-(a.goals+a.assists)||b.seconds-a.seconds);}
function analysisSet(key,value){if(!['selected','window','side','compareA','compareB'].includes(key))return;state.analysis[key]=value;save();render();}
function analysisShotMap(match){
 const shots=match.shots.filter(s=>state.analysis.side==='all'||s.side===state.analysis.side);
 return `<section class="analysis-map"><header><h2>Skottkarta</h2><label>Visa<select onchange="analysisSet('side',this.value)">${[['all','Båda lagen'],['own',match.club],['opponent',match.opponent]].map(([key,label])=>`<option value="${key}" ${state.analysis.side===key?'selected':''}>${trainingSafe(label)}</option>`).join('')}</select></label></header><svg viewBox="0 0 600 320" role="img" aria-label="Registrerade skottlägen, båda lagens anfall åt höger"><rect x="5" y="5" width="590" height="310" rx="65" fill="#e7f1f4" stroke="#617c8b" stroke-width="3"/><path d="M300 5v310 M150 8v304 M440 8v304" stroke="#4e8fbc" stroke-width="3"/><circle cx="300" cy="160" r="45" fill="none" stroke="#b06b73" stroke-width="2"/><path d="M555 115v90h15v-90z" fill="none" stroke="#b94954" stroke-width="3"/>${shots.map(s=>`<circle cx="${s.x*5.7}" cy="${s.y*3.1}" r="${s.outcome==='goal'?7:4}" fill="${s.side==='own'?'#215c4c':'#b54158'}" stroke="${s.outcome==='goal'?'#141f2a':'white'}" stroke-width="${s.outcome==='goal'?2:1}"><title>${analysisTime(s.time)} · ${trainingSafe(s.name)} · ${({goal:'Mål',post:'Ramträff',rebound:'Retur',save:'Räddning',wide:'Utanför',block:'Blockerat'})[s.outcome]}</title></circle>`).join('')}</svg><p>Grönt: ${trainingSafe(match.club)} · Rött: ${trainingSafe(match.opponent)}. Stor punkt med mörk kant: mål. Båda lagens anfall visas åt höger. Skottlägena kommer från spelets avslutsmodell; ramträffar ingår i avsluten.</p><details><summary>Alla registrerade avslut (${shots.length})</summary>${shots.map(s=>`<div class="analysis-event"><span>${analysisTime(s.time)}</span><span>${trainingSafe(s.name)} · ${s.side==='own'?match.club:match.opponent}</span><strong>${({goal:'Mål',post:'Ramträff',rebound:'Retur',save:'Räddning',wide:'Utanför',block:'Blockerat'})[s.outcome]}${s.dangerous?' · farligt läge':''}${s.explanation?`<small>${trainingSafe(s.explanation)}</small>`:''}</strong></div>`).join('')||'<p>Inga registrerade avslut.</p>'}</details></section>`;
}
function analysisUnitTable(units){return units.length?`<div class="analysis-scroll"><table><thead><tr><th>Formation & spelare</th><th>Istid</th><th>Skott för / emot</th><th>Farliga lägen för / emot</th><th>Mål för / emot</th><th>Skott / 60 min</th></tr></thead><tbody>${units.map(u=>`<tr><td><strong>${u.label}</strong><small>${u.names.map((name,index)=>u.ids?.[index]!==undefined?playerReference(u.ids[index],name):trainingSafe(name)).join(' · ')}</small></td><td>${analysisTime(u.seconds)}</td><td>${u.shotsFor} / ${u.shotsAgainst}</td><td>${u.dangerFor} / ${u.dangerAgainst}</td><td>${u.goalsFor} / ${u.goalsAgainst}</td><td>${analysisRate(u.shotsFor,u.seconds)} / ${analysisRate(u.shotsAgainst,u.seconds)}</td></tr>`).join('')}</tbody></table></div>`:'<p>Formationernas statistik börjar registreras när matchen spelas.</p>';}
function analysisComparable(m){return Boolean(m.finished&&!m.partial&&!m.strengthPartial&&!m.abandoned&&!m.friendly);}
function analysisCompleteMatches(matches){const seen=new Set();return matches.filter(m=>{if(!analysisComparable(m)||seen.has(m.id))return false;seen.add(m.id);return true;});}
function analysisAdvice(matches){
 if(!matches.length)return ['Spela en match för att få ett underlag.'];
 const complete=analysisCompleteMatches(matches),units=analysisAggregateUnits(complete),evidence=formationEvidence(complete).rows,advice=[];
 if(complete.length!==matches.length)advice.push(`${matches.length-complete.length} rapporter i urvalet används inte i råden: ofullständiga, avbrutna, ej avslutade, träningsmatcher eller dubbletter.`);
 if(!complete.length)return [...advice,'Inga kompletta tävlingsmatcher att bedöma ännu.'];
 if(complete.length<3)advice.push('Underlaget omfattar färre än tre kompletta matcher. Följ samma formationer över fler matcher innan du ändrar utifrån en trend.');
 const recurring=evidence.filter(u=>u.kind==='forward'&&u.signal==='Återkommande underskott').sort((a,b)=>(b.against-b.for)/b.seconds-(a.against-a.for)/a.seconds),worst=recurring[0];
 if(worst)advice.push(`${worst.names.join(', ')} har släppt till fler farliga lägen än de skapat i ${worst.negative} av ${worst.measured} matcher med minst en minuts gemensam istid. Totalt ${worst.for}–${worst.against} på ${analysisTime(worst.seconds)}. Granska matchunderlaget och rollfördelningen innan du väljer träning eller ändrar kedjan; orsaken är inte fastställd.`);
 const enough=new Set(evidence.filter(u=>u.enough).map(u=>u.key)),regular=units.filter(u=>u.kind==='forward'&&enough.has(u.key));
 const productive=[...regular].sort((a,b)=>b.shotsFor/b.seconds-a.shotsFor/a.seconds)[0];
 if(productive)advice.push(`${productive.names.join(', ')} har flest registrerade skott per 60 minuter bland forwardskombinationer med minst tre kvalificerade matcher och tio minuters underlag: ${analysisRate(productive.shotsFor,productive.seconds)}. Skottmängden säger inte ensam något om kvaliteten.`);
 const pp=units.filter(u=>u.kind==='pp'),ppTime=pp.reduce((n,u)=>n+u.seconds,0),ppGoals=pp.reduce((n,u)=>n+u.goalsFor,0);
 if(ppTime>=600&&!ppGoals)advice.push(`Powerplay har inte gjort mål under ${Math.round(ppTime/60)} registrerade minuter. Jämför enheternas avslut och farliga lägen innan du ändrar spelarna.`);
 if(!worst&&complete.length>=3)advice.push('Ingen forwardskombination har ett tillräckligt återkommande underskott för att pekas ut. Följ matchunderlaget; en enstaka extremmatch räcker inte.');
 return advice;
}
function analysisPlayerTable(players){return players.length?`<div class="analysis-scroll"><table><thead><tr><th>Spelare</th><th>Matcher med istid</th><th>Min / match</th><th>Mål</th><th>Assist</th><th>Skott</th><th>Utvisningsminuter</th></tr></thead><tbody>${players.map(p=>`<tr><td>${playerReference(p.id,p.name)}<small>${p.pos}</small></td><td>${p.games}</td><td>${(p.seconds/60/p.games).toFixed(1)}</td><td>${p.goals}</td><td>${p.assists}</td><td>${p.shots}</td><td>${p.pim}</td></tr>`).join('')}</tbody></table></div>`:'<p>Inga spelarminuter registrerade ännu.</p>';}
function analysisComparison(players,matches){
 const s=state.analysis,a=players.find(p=>String(p.id)===String(s.compareA))||players[0],b=players.find(p=>String(p.id)===String(s.compareB))||players[1];if(!a||!b)return '<p>Två spelare behöver registrerad istid för att kunna jämföras.</p>';
 const select=(key,p)=>`<label>Spelare<select onchange="analysisSet('${key}',this.value)">${players.map(q=>`<option value="${q.id}" ${q.id===p.id?'selected':''}>${trainingSafe(q.name)} · ${q.pos}</option>`).join('')}</select></label>`;
 return `<section class="analysis-comparison"><h2>Spelarjämförelse & utveckling</h2><div class="analysis-compare-picks">${select('compareA',a)}${select('compareB',b)}</div><div class="analysis-compare-grid">${[a,b].map(p=>{const fields=p.pos==='MV'?GOALIE_ATTRIBUTES:SKATER_ATTRIBUTES,changes=Object.keys(p.end).filter(k=>p.start[k]!==undefined&&p.end[k]!==p.start[k]);return `<article><h3>${playerReference(p.id,p.name)}</h3><p>${p.games} matcher · ${(p.seconds/60/p.games).toFixed(1)} min/match · ${p.goals+p.assists} poäng</p><p>Attributförändringar under urvalet: ${changes.map(k=>`${fields[k]} ${p.end[k]-p.start[k]>0?'+':''}${p.end[k]-p.start[k]}`).join(', ')||'Inga registrerade förändringar.'}</p><h4>Senaste fem registrerade matcher</h4>${matches.filter(m=>m.players.some(q=>q.id===p.id&&q.seconds>0)).slice(0,5).map(m=>{const q=m.players.find(q=>q.id===p.id);return `<div class="analysis-event"><span>${trainingSafe(m.opponent)}</span><span>${analysisTime(q.seconds)}</span><strong>${q.goals}+${q.assists}</strong></div>`;}).join('')}</article>`;}).join('')}</div><p>Attributförändringar följer dina egna spelares registrerade värden mellan matcherna. Olika roller och special teams påverkar produktionen; poäng är inte ett allmänt formbetyg.</p></section>`;
}
function statisticsView(){return matchesAnalysisView();}
function legacyStatisticsView(){
 ensureAnalysis();const s=state.analysis,match=analysisSelection(),samples=analysisSamples(),units=analysisAggregateUnits(samples),players=analysisAggregatePlayers(samples);
 return `<section class="analysis-page"><header class="daily-heading"><div><span class="career-eyebrow">MATCHANALYTIKERN</span><h1>Förstå vad som händer.</h1><p>Matchhändelser, verklig istid och spelarna bakom formationerna.</p></div><button class="btn secondary" onclick="trainingOpen('match')">Till matchen</button></header>${coachCycleView()}<section class="analysis-report"><label>Matchrapport<select onchange="analysisSet('selected',this.value)">${state.live?.analysis&&!state.live.finished?`<option value="live" ${s.selected==='live'||!s.matches.length?'selected':''}>Pågående · ${state.live.opponent}</option>`:''}${s.matches.map((m,i)=>`<option value="${m.id}" ${s.selected===m.id||(s.selected==='latest'&&i===0)?'selected':''}>${seasonLabel(m.year)} · ${m.stage} · ${m.club} ${m.own}–${m.against} ${m.opponent}</option>`).join('')}</select></label>${match?`<h2>${trainingSafe(match.club)} ${match.own}–${match.against} ${trainingSafe(match.opponent)}</h2><p>${seasonLabel(match.year)} · ${match.stage} · ${match.finished?'Avslutad':'Pågår'}${match.partial?' · Delvis registrerad statistik':''}${match.shootout?' · Avgörande på straffar (straffarna ingår inte i skottkartan)':''}${match.abandoned?' · Avbruten match; slutresultatet innehåller administrativt tilldelade mål':''}</p><div class="analysis-metrics">${[['Skott på mål',match.shots.filter(s=>s.side==='own'&&analysisOnTarget(s)).length,match.shots.filter(s=>s.side==='opponent'&&analysisOnTarget(s)).length],['Alla skottförsök',match.shots.filter(s=>s.side==='own').length,match.shots.filter(s=>s.side==='opponent').length],['Farliga avslut',match.shots.filter(s=>s.side==='own'&&s.dangerous).length,match.shots.filter(s=>s.side==='opponent'&&s.dangerous).length],['Utvisningar',match.events.filter(e=>e.type==='penalty'&&e.side==='own').length,match.events.filter(e=>e.type==='penalty'&&e.side==='opponent').length]].map(([label,a,b])=>`<div><span>${label}</span><strong>${a} – ${b}</strong></div>`).join('')}</div>${match.hockey?`<p>Offside ${match.hockey.counts.offside.own}–${match.hockey.counts.offside.opponent} · Icing ${match.hockey.counts.icing.own}–${match.hockey.counts.icing.opponent} · Rensningar ${match.hockey.counts.clear.own}–${match.hockey.counts.clear.opponent}</p>`:''}${match.finished?analysisMatchVerdictView(match)+performanceView(match.performance):''}${analysisShotMap(match)}<h2>Mål, utvisningar & avgöranden</h2>${match.events.map(e=>`<div class="analysis-event"><span>${analysisTime(e.time)}</span><strong>${e.type==='goal'?'MÅL':e.type==='penalty'?'UTVISNING':'AVGÖRANDE'}</strong><span>${trainingSafe(e.text)}</span></div>`).join('')||'<p>Inga registrerade händelser.</p>'}<details><summary>Formationer i den här matchen</summary>${analysisUnitTable(match.units)}</details>`:'<div class="analysis-empty"><h2>Statistiken börjar vid nästa nedsläpp</h2><p>Äldre matcher saknar detaljerade händelser och får inga påhittade rapporter. Pågående matcher registreras från uppdateringen.</p></div>'}</section><section><div class="analysis-section-heading"><h2>Trender över flera matcher</h2><label>Underlag<select onchange="analysisSet('window',this.value)">${[['5','Senaste fem'],['10','Senaste tio'],['season','Aktuell säsong'],['all','Alla sparade matcher']].map(([v,label])=>`<option value="${v}" ${s.window===v?'selected':''}>${label}</option>`).join('')}</select></label></div><p>${samples.length} avslutade matcher för ${managerClub()} i urvalet. Enskilda matchrapporter från tidigare klubbar finns kvar i arkivet. Upp till 80 matchrapporter sparas; äldre detaljrapporter rensas tidigare om arkivet blir stort. Resultat och skottsummor bevaras i Säsong & historik. Grundserie och slutspel ingår.</p><div class="analysis-advice"><h2>Assistentens observationer</h2>${analysisAdvice(samples).map(text=>`<p>${trainingSafe(text)}</p>`).join('')}</div><h2>Kedjor & backpar</h2><p>Varje rad följer en faktisk spelarkombination. Forwardskedjan och backparet delar samma laghändelser; summera därför inte raderna till lagtotaler. Kort istid gör siffror per 60 minuter osäkra.</p>${analysisUnitTable(units.filter(u=>['forward','defense'].includes(u.kind)))}<h2>Powerplay, boxplay & förlängning</h2><p>Enheternas minuter och händelser registreras i respektive spelform. Mål från straffläggning ingår inte.</p>${analysisUnitTable(units.filter(u=>!['forward','defense'].includes(u.kind)))}<h2>Spelarstatistik</h2>${analysisPlayerTable(players)}${analysisComparison(players,samples)}</section></section>`;
}


// A coaching focus keeps evidence, dated training and subsequent outcomes together.
const COACH_FOCUSES = {
 defense:{name:'Skydda de farliga ytorna',session:'tactics',label:'Farliga lägen emot',lower:true},
 attack:{name:'Skapa bättre avslut',session:'skills',label:'Egna farliga lägen',lower:false},
 discipline:{name:'Spela med disciplin',session:'penaltykill',label:'Egna utvisningar',lower:true}
};
function coachEligible(m){return analysisComparable(m)&&m.club===managerClub()&&m.year===(state.season?.year||2026);}
function coachMeasure(m,key){return key==='discipline'?(m.events||[]).filter(e=>e.type==='penalty'&&e.side==='own').length:(m.shots||[]).filter(s=>s.dangerous&&s.side===(key==='defense'?'opponent':'own')).length;}
function coachEvidence(){return analysisCompleteMatches(state.analysis?.matches||[]).filter(coachEligible).slice(0,state.analysis.coachWindow||3);}
function coachFocus(){const f=state.analysis?.coachFocus;return f&&f.club===managerClub()&&f.year===state.season?.year?f:null;}
function coachAdopt(key,diagnosis=null){
 ensureAnalysis();const matches=coachEvidence();if(!COACH_FOCUSES[key]||!matches.length||state.live&&!state.live.finished)return;
 feedbackArchiveCoach();
 state.analysis.coachFocus={key,club:managerClub(),year:state.season.year,date:state.calendar.date,target:state.analysis.coachWindow||3,baseline:matches.map(m=>({id:m.id,value:coachMeasure(m,key),rates:analysisStrengthSummary(m,key)})),seen:(state.analysis.matches||[]).map(m=>m.id),sessions:[],results:[]};
 if(diagnosis)state.analysis.coachFocus.diagnosis={...diagnosis,baseline:matches.map(m=>coachDiagnosisMeasure(m,diagnosis)),results:[]};
 save();render();
}
function coachPlanSlot(key=coachFocus()?.key){
 const t=state.training,c=state.calendar;
 if(!COACH_FOCUSES[key]||!t||!c||t.lockedRound===state.round||state.live&&!state.live.finished)return null;
 const fixtures=calendarFixtures(),session=coachFocus()?.diagnosis?.session||COACH_FOCUSES[key].session;
 const slots=t.plan.flatMap((p,index)=>{
  if(index<t.day||index>=t.plan.length-1)return [];
  const date=calAdd(c.date,index-t.day),actual=calendarSession(date);
  if(c.completedMatchDate===date||t.history.some(l=>l.date===date)||fixtures.some(g=>g.date===date||g.date===calAdd(date,1)))return [];
  if(['recovery','matchprep'].includes(actual.type))return [];
  // Respect a date-specific manual plan. An already matching pass can be used.
  if(c.plans[date]&&actual.type!==session)return [];
  return [{index,date,type:actual.type,intensity:actual.intensity}];
 });
 return slots.find(s=>s.date===coachFocus()?.planned&&s.type===session)||slots[0]||null;
}
function coachPlan(){
 const f=coachFocus();if(!f||f.results.length>=(f.target||3))return;ensureTrainingData();
 const slot=coachPlanSlot(f.key);
 if(!slot){calendarNotify('Ingen lämplig träningsdag före nästa match. Behåll återhämtning, egna kalenderplaner och matchförberedelse; planera efter matchen.');return;}
 f.planned=slot.date;
 setTrainingSession(slot.index,'type',f.diagnosis?.session||COACH_FOCUSES[f.key].session);
}
function coachTrainingDone(log){const f=coachFocus();if(!f||f.results.length>=(f.target||3)||!log.trained||log.type!==(f.diagnosis?.session||COACH_FOCUSES[f.key].session)||f.sessions.some(s=>s.date===log.date))return;f.sessions.push({date:log.date,trained:log.trained,resting:log.resting});f.sessions=f.sessions.slice(-20);}
function coachMatchDone(m){
 const f=coachFocus();if(!f||!coachEligible(m)||f.results.length>=(f.target||3)||f.seen.includes(m.id)||f.results.some(r=>r.id===m.id))return;
 f.results.push({id:m.id,opponent:m.opponent,value:coachMeasure(m,f.key),rates:analysisStrengthSummary(m,f.key)});
 if(f.diagnosis)f.diagnosis.results.push(coachDiagnosisMeasure(m,f.diagnosis));
 if(f.results.length===(f.target||3))managerMessage('coach-review:'+m.id,'Dags att följa upp ditt träningsfokus',`${f.target||3} matcher är spelade. Jämför utfallet med utgångsläget i tränarens uppföljning. Resultaten påverkas också av motstånd, istid och matchbild.`,'Assisterande tränare',{link:'training'});
}
function coachCycleView(){
 const matches=coachEvidence(),f=coachFocus(),safe=trainingSafe;
 if(!matches.length)return '<section class="coach-cycle"><span class="career-eyebrow">MATCH → TRÄNING → UPPFÖLJNING</span><h2>Tränarens fokus</h2><p>Efter en fullständigt registrerad tävlingsmatch får du ett konkret underlag att arbeta vidare med.</p></section>';
 const avg=(rows)=>rows.reduce((n,r)=>n+r.value,0)/rows.length;
 let content='';
 if(f){const d={...COACH_FOCUSES[f.key],session:f.diagnosis?.session||COACH_FOCUSES[f.key].session},before=avg(f.baseline),after=f.results.length?avg(f.results):null;
 content=`<h3>${d.name}</h3><div class="coach-cycle-metrics"><div><small>UTGÅNGSLÄGE · ${f.baseline.length} MATCHER</small><strong>${before.toFixed(1)}</strong></div><div><small>UPPFÖLJNING · ${f.results.length}/${f.target||3} MATCHER</small><strong>${after===null?'—':after.toFixed(1)}</strong></div><div><small>GENOMFÖRDA RELEVANTA PASS</small><strong>${f.sessions.length}</strong></div></div><p>${d.label} per match. ${after===null?'Nästa tävlingsmatch inleder uppföljningen.':after===before?'Oförändrat snitt.':(d.lower?after<before:after>before)?'Utvecklingen går i önskad riktning.':'Ännu ingen förbättring i underlaget.'} Små underlag; motstånd, matchlängd och spelform påverkar. Detta visar inte att träningen ensam orsakat utfallet.</p>${f.planned?`<p>Planerat pass ${calText(f.planned)}${f.planned>=state.calendar.date&&calendarSession(f.planned).type!==d.session?' · kalendern har ändrats sedan planeringen':''}.</p>`:''}${coachRatesView(f)}${coachDiagnosisView(f)}${f.results.map(r=>`<p>${safe(r.opponent)}: <strong>${r.value}</strong></p>`).join('')}${f.results.length<(f.target||3)?`<button class="btn" onclick="deskNavigate('calendar')">Planera ${d.session==='tactics'?'taktiskt samspel':TRAINING_SESSIONS[d.session].name.toLowerCase()}</button>`:'<p>Uppföljningen är klar. Välj ett nytt fokus när du är redo.</p>'}<button class="btn secondary" onclick="trainingOpen('lines')">Se över formationerna</button>`;
 }
 return `<section class="coach-cycle"><span class="career-eyebrow">MATCH → TRÄNING → UPPFÖLJNING</span><h2>Tränarens fokus</h2>${content}<details ${f?'':'open'}><summary>${f?'Byt fokus och börja en ny uppföljning':'Välj vad laget ska arbeta med'}</summary><label>Matcher per uppföljning<select onchange="state.analysis.coachWindow=Number(this.value);save();render()">${[3,5,10].map(n=>`<option value="${n}" ${(state.analysis.coachWindow||3)===n?'selected':''}>${n} matcher</option>`).join('')}</select></label><p>Valet gäller nästa fokus. Underlag: ${matches.length} senaste fullständiga tävlingsmatcher denna säsong. Ditt val ändrar inga kedjor automatiskt.</p><div class="coach-cycle-options">${Object.entries(COACH_FOCUSES).map(([key,d])=>`<article><h3>${d.name}</h3><p>${d.label}: ${(matches.reduce((n,m)=>n+coachMeasure(m,key),0)/matches.length).toFixed(1)} per match.</p><p>Träning: ${TRAINING_SESSIONS[d.session].name}.</p><button class="btn secondary" onclick="coachAdopt('${key}')">Välj fokus</button></article>`).join('')}</div></details></section>`;
}

function coachFollowupView(){const f=coachFocus();if(!f)return '<section class="training-coach-note"><h2>Uppföljning</h2><p>Välj ett träningsfokus i matchanalysen efter en tävlingsmatch.</p></section>';const d=COACH_FOCUSES[f.key];return `<section class="coach-cycle"><h2>${d.name}</h2><p>${f.sessions.length} relevanta pass genomförda · ${f.results.length}/${f.target||3} uppföljningsmatcher.</p>${f.results.map(r=>`<p>${trainingSafe(r.opponent)}: ${r.value} · ${d.label.toLowerCase()}</p>`).join('')}<p>Matchbild och motstånd påverkar utfallet.</p><button class="btn secondary" onclick="deskNavigate('statistics')">Granska underlaget</button></section>`;}

function analysisStrengthSummary(m,key){
 if(!m.strengthSeconds||m.strengthPartial||m.partial)return null;
 return Object.fromEntries(['even','pp','pk','ot'].map(situation=>[situation,{seconds:m.strengthSeconds[situation]||0,count:key==='discipline'?(m.events||[]).filter(e=>e.type==='penalty'&&e.side==='own'&&e.situation===situation).length:(m.shots||[]).filter(s=>s.situation===situation&&s.dangerous&&s.side===(key==='defense'?'opponent':'own')).length}]));
}
function coachRatesView(f){
 const sum=(rows,key)=>rows.reduce((a,r)=>{const v=r.rates?.[key];if(v){a.seconds+=v.seconds;a.count+=v.count;a.matches++;}return a;},{seconds:0,count:0,matches:0});
 const cell=v=>v.seconds?`${(v.count*3600/v.seconds).toFixed(1)} · ${analysisTime(v.seconds)}${v.seconds<600?' · kort istid':''}`:'Saknar underlag';
 return `<h4>${COACH_FOCUSES[f.key].label} per 60 minuter</h4><div class="analysis-scroll"><table><thead><tr><th>Spelform</th><th>Före · registrerad tid</th><th>Efter · registrerad tid</th></tr></thead><tbody>${[['even','Lika styrka'],['pp','Powerplay'],['pk','Boxplay'],['ot','Förlängning, lika styrka']].map(([key,label])=>`<tr><th>${label}</th><td>${cell(sum(f.baseline,key))}</td><td>${cell(sum(f.results,key))}</td></tr>`).join('')}</tbody></table></div><p>Matchtid räknas en gång per spelform. Äldre matcher utan fullständig tidsfördelning ingår inte i talen per 60 minuter. Motstånd och små underlag påverkar fortfarande jämförelsen.</p>`;
}

// Derived only from the selected report. No inferred hidden ratings or invented
// causes; legacy/partial reports cannot support a complete explanation.
function analysisKeyFactors(m){
 if(!m?.finished||m.partial||m.abandoned||!Array.isArray(m.shots)||!Array.isArray(m.events))return null;
 const shots=m.shots||[],events=m.events||[],onTarget=side=>shots.filter(s=>s.side===side&&analysisOnTarget(s)).length;
 const strengths=['even','pp','pk','ot'].map(kind=>{const rows=shots.filter(s=>s.situation===kind);return {kind,seconds:m.strengthPartial?null:m.strengthSeconds?.[kind]??null,goals:['own','opponent'].map(side=>rows.filter(s=>s.side===side&&s.outcome==='goal').length),shots:['own','opponent'].map(side=>rows.filter(s=>s.side===side&&analysisOnTarget(s)).length),danger:['own','opponent'].map(side=>rows.filter(s=>s.side===side&&s.dangerous).length)};});
 const units=(m.units||[]).filter(u=>u.kind==='forward'&&u.seconds>=300).map(u=>({...u,netDanger:(u.dangerFor||0)-(u.dangerAgainst||0)})).sort((a,b)=>a.netDanger-b.netDanger);
 const winner=Math.sign(m.own-m.against);let own=0,against=0,decisive=null;
 for(const event of events.filter(e=>e.type==='goal')){const before=own-against;if(event.side==='own')own++;else if(event.side==='opponent')against++;else continue;if(winner&&Math.sign(own-against)===winner&&Math.sign(before)!==winner)decisive=event;}
 // Administrative/shootout goals are not attributed to ordinary play.
 if(m.shootout||own!==m.own||against!==m.against||!Number.isFinite(decisive?.time))decisive=null;
 const saves=['own','opponent'].map(side=>{const rows=shots.filter(s=>s.side!==(side)&&['own','opponent'].includes(s.side)&&analysisOnTarget(s));return {faced:rows.length,saves:rows.filter(s=>s.outcome!=='goal').length};});
 return {strengths,units:units.length>1?[units[0],units.at(-1)]:units,decisive,saves,onTarget:[onTarget('own'),onTarget('opponent')]};
}
function analysisMatchVerdict(m){
 const r=analysisKeyFactors(m);if(!r)return null;const even=r.strengths.find(x=>x.kind==='even'),pp=r.strengths.find(x=>x.kind==='pp'),pk=r.strengths.find(x=>x.kind==='pk'),candidates=[];
 if(even?.danger) candidates.push({weight:Math.abs(even.danger[0]-even.danger[1])*2,label:'Farliga lägen vid lika styrka',text:`${even.danger[0]}–${even.danger[1]} farliga avslut vid lika styrka.`});
 if(even?.shots)candidates.push({weight:Math.abs(even.shots[0]-even.shots[1]),label:'Skottbild vid lika styrka',text:`${even.shots[0]}–${even.shots[1]} skott på mål vid lika styrka.`});
 if(pp?.goals?.[0]||pk?.goals?.[1])candidates.push({weight:3+(pp?.goals?.[0]||0)+(pk?.goals?.[1]||0),label:'Special teams',text:`Powerplay ${pp?.goals?.[0]||0} mål · insläppta i boxplay ${pk?.goals?.[1]||0}.`});
 const factor=candidates.filter(c=>c.weight>0).sort((a,b)=>b.weight-a.weight)[0]||{label:'Jämn matchbild',text:'Inget enskilt registrerat område sticker ut tydligt.'},best=[...(m.units||[])].filter(u=>u.kind==='forward'&&u.seconds>=300).sort((a,b)=>((b.dangerFor||0)-(b.dangerAgainst||0))-((a.dangerFor||0)-(a.dangerAgainst||0)))[0],reviews=(m.tacticalReviews||[]).filter(x=>x.coachDecision);
 return {factor,best,decision:reviews.at(-1)||null};
}
function analysisMatchVerdictView(m){
 const v=analysisMatchVerdict(m);if(!v)return '';
 const d=v.decision,followup=d?`<p>${trainingSafe(d.coachDecision.label)} · ${analysisTime(d.time)}${d.coachDecision.choice==='keep'?' · Behöll planen':''}</p><p>${trainingSafe(matchCoachOutcome(d,true).text)}</p><p class="mw-note">Förloppet visar inte en bevisad effekt av beslutet.${d.coachDecision.additionalChanges?' Flera ändringar gjordes vid samma paus.':''}</p>`:'<p>Inget tränarbeslut med före-/efterunderlag registrerades.</p>';
 return `<section class="mw-panel mw-verdict"><h2>Tre svar efter matchen</h2><article><strong>Varför såg matchen ut så här?</strong><p>${trainingSafe(v.factor.label)} · ${trainingSafe(v.factor.text)} Detta är registrerat underlag, inte bevisad orsak.</p></article><article><strong>Vilken formation stack ut?</strong><p>${v.best?`${trainingSafe(v.best.label)} · ${trainingSafe((v.best.names||[]).join(' / '))} · ${v.best.dangerFor||0}–${v.best.dangerAgainst||0} farliga lägen på ${analysisTime(Math.round(v.best.seconds))}.`:'Ingen forwardskedja nådde fem minuters registrerat underlag.'}</p></article><article><strong>Vad hände efter ditt senaste tränarbeslut?</strong>${followup}</article></section>`;
}
function analysisKeyFactorsView(m){
 if(!m?.finished)return '';
 const report=analysisKeyFactors(m);
 if(!report)return '<section class="mw-panel"><h2>Matchens viktigaste underlag</h2><p>Rapporten är ofullständig eller matchen avbruten. Ingen sammanfattning av avgörande situationer görs.</p></section>';
 const names={even:'Lika styrka',pp:'Vårt powerplay',pk:'Vårt boxplay',ot:'Förlängning, lika styrka'};
 const rows=report.strengths.filter(r=>r.seconds>0||r.shots.some(Boolean)||r.goals.some(Boolean));
 return `<section class="mw-panel"><h2>Matchens viktigaste underlag</h2><p>${report.decisive?`Ledningen som höll kom vid ${analysisTime(report.decisive.time)}: ${trainingSafe(report.decisive.text)}.`:m.shootout?'Straffläggningen avgjorde. Den redovisas separat från spelets skott och formationer.':'Se målens ordning under Händelser. Underlaget pekar inte ut ett enskilt avgörande.'}</p><table><thead><tr><th>Spelform</th><th>Tid</th><th>Mål</th><th>Skott på mål</th><th>Farliga avslut</th></tr></thead><tbody>${rows.map(r=>`<tr><th>${names[r.kind]}</th><td>${r.seconds===null?'Saknas':analysisTime(Math.round(r.seconds))}</td><td>${r.goals.join('–')}</td><td>${r.shots.join('–')}</td><td>${r.danger.join('–')}</td></tr>`).join('')}</tbody></table><p>Ditt lag visas först. Powerplay och boxplay skiljs från lika styrka; farliga avslut är registrerade lägen, inte garanterade mål.</p><h3>Målvaktsspelet</h3><p>${trainingSafe(m.club)}: ${report.saves[0].saves}/${report.saves[0].faced} räddningar. ${trainingSafe(m.opponent)}: ${report.saves[1].saves}/${report.saves[1].faced} räddningar. Antalet räddningar säger inte ensamt hur svåra skotten var.</p>${report.units.length?`<h3>Kedjor att granska</h3>${report.units.map(u=>`<p><b>${trainingSafe(u.label)}</b> · ${trainingSafe((u.names||[]).join(' / '))}<br>${analysisTime(Math.round(u.seconds))} vid lika styrka · ${u.goalsFor||0}–${u.goalsAgainst||0} mål · ${u.dangerFor||0}–${u.dangerAgainst||0} farliga avslut.</p>`).join('')}<p>Visar ytterlägen i registrerad chansskillnad bland kedjor med minst fem minuter. Kontrollera motstånd och istid under Formationer innan du ändrar matchningen. Kedjor och backpar delar händelser och ska inte summeras.</p>`:'<p>Ingen forwardskombination har fem minuters registrerad istid ännu. Ingen kedja pekas ut.</p>'}<p>${m.tacticalReviews?.length?'Dina taktiska ändringar följs separat nedan med före- och efterunderlag.':'Inga taktiska ändringar med före- och efterunderlag är registrerade.'} Detta beskriver matchförloppet; en enskild match bevisar inte varför en taktik fungerade.</p></section>`;
}
