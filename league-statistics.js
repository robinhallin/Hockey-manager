"use strict";
// A separate season ledger keeps league, stage and club stints intact after transfers.
// Old results without box scores are not assigned invented player statistics.
const LEAGUE_STAT_FIELDS=['games','goals','assists','shots','pim','seconds','saves','against','shutouts'];
let leagueStatsUI={league:null,stage:'regular',club:'all',view:'points',sort:'points',direction:-1,query:'',minimum:0,year:'current',limit:50};
function ensureLeagueStatistics(){
 if(!state.careerStarted||!state.season)return;
 const year=state.season.year;
 if(!state.leagueStatistics)state.leagueStatistics={version:1,year,rows:{},archives:[],startRound:state.round,missing:{SHL:state.schedule.filter(g=>g.played&&leagueOf(g.home)==='SHL').length,HA:state.schedule.filter(g=>g.played&&leagueOf(g.home)==='HA').length},recorded:{regular:{SHL:0,HA:0},playoffs:{SHL:0,HA:0}}};
 const s=state.leagueStatistics;
 if(s.year!==year){
  s.archives.unshift({year:s.year,rows:s.rows,recorded:s.recorded,missing:s.missing,startRound:s.startRound});s.archives=s.archives.slice(0,2);
  s.year=year;s.rows={};s.recorded={regular:{SHL:0,HA:0},playoffs:{SHL:0,HA:0}};s.missing={SHL:0,HA:0};s.startRound=1;
 }
}
function leagueStatRow(p,club){return {id:p.id,name:p.name,pos:p.pos,club,...Object.fromEntries(LEAGUE_STAT_FIELDS.map(k=>[k,0]))};}
function ensureLeagueLive(){
 const m=state.live;if(!m||m.finished||m.friendly||state.calendar?.active)return null;
 ensureLeagueStatistics();if(!state.leagueStatistics)return null;
 if(!m.leagueBox){
  const game=state.schedule.find(g=>g.round===state.round&&(g.home===managerClub()||g.away===managerClub()));
  if(!game)return null;
  m.leagueBox={year:state.season.year,round:state.round,home:game.home,away:game.away,stage:game.seriesId?'playoffs':'regular',players:{},partial:Boolean(m.minute||m.second||m.period>1),saved:false};
 }
 return m.leagueBox;
}
function leagueLivePlayer(side,id,name){
 const box=ensureLeagueLive();if(!box)return null;
 const club=side==='own'?managerClub():state.live.opponent,p=(state.clubRosters[club]||[]).find(p=>id!==null&&id!==undefined?samePlayerId(p.id,id):p.name===name);
 if(!p)return null;
 const key=club+':'+p.id;return box.players[key]||(box.players[key]=leagueStatRow(p,club));
}
function leagueKeeper(side){
 const m=state.live;if(!m)return null;
 if(side==='own')return m.goaliePulled?null:randomGoalie();
 return m.aiGoaliePulled?null:(state.clubRosters[m.opponent]||[]).filter(p=>p.pos==='MV').sort((a,b)=>matchAttributeRating(b)-matchAttributeRating(a))[0];
}
function leagueTrackIce(ownPlayers,seconds){
 if(!ensureLeagueLive())return;
 for(const p of ownPlayers){const row=leagueLivePlayer('own',p.id);if(row)row.seconds+=Math.max(0,Math.min(seconds,medicalLimit(p)-(state.live.iceTime?.[p.id]||0)));}
 for(const p of rinkOpponentPlayers()){const row=leagueLivePlayer('opponent',p.id);if(row)row.seconds+=seconds;}
}
function leagueTrackShot(side,id,name,outcome){
 if(!['goal','save','rebound'].includes(outcome))return;
 const row=leagueLivePlayer(side,id,name);if(row)row.shots++;
 const other=side==='own'?'opponent':'own',p=leagueKeeper(other);
 if(p){const keeper=leagueLivePlayer(other,p.id);if(keeper)keeper[outcome==='goal'?'against':'saves']++;}
}
function leagueTrackEvent(type,side,id,name){
 const row=leagueLivePlayer(side,id,name);if(!row)return;
 if(type==='goal')row.goals++;
 if(type==='penalty')row.pim+=2;
 if(type==='assist')row.assists++;
}
function leagueCommitRows(game,rows,partial=false,live=false){
 ensureLeagueStatistics();const s=state.leagueStatistics;
 if(!s||!game||game.statsRecorded||!game.played)return;
 const league=leagueOf(game.home),stage=game.seriesId?'playoffs':'regular';
 if(!['SHL','HA'].includes(league))return;
 for(const row of rows){
  if(!row.seconds&&!row.goals&&!row.shots&&!row.pim&&!row.saves&&!row.against)continue;
  row.games=1;
  const conceded=row.club===game.home?game.awayGoals:game.homeGoals;
  // Team shutouts include a tied 0–0 game decided on a shootout; one keeper must play it all.
  const keepers=rows.filter(r=>r.club===row.club&&r.pos==='MV'&&r.seconds>0);
  if(row.pos==='MV'&&keepers.length===1&&!row.against&&!partial&&(conceded===0||game.shootout&&row.goals===0&&rows.filter(r=>r.club!==row.club).reduce((n,r)=>n+r.goals,0)===0))row.shutouts=1;
  const key=JSON.stringify([stage,league,row.club,String(row.id)]),target=s.rows[key]||(s.rows[key]={...leagueStatRow(row,row.club),league,stage,partial:false});
  for(const field of LEAGUE_STAT_FIELDS)target[field]+=row[field]||0;
  target.partial ||= partial;
  const p=(state.clubRosters[row.club]||[]).find(p=>samePlayerId(p.id,row.id));
  if(p){
   // Own skater totals already change in the live engine; opponent and AI totals do not.
   if(!live||row.club!==managerClub())for(const k of ['games','goals','assists','shots','pim'])p[k]=(p[k]||0)+(row[k]||0);
   if(row.pos==='MV'){p.saves=(p.saves||0)+row.saves;p.goalsAgainst=(p.goalsAgainst||0)+row.against;}
  }
 }
 game.statsRecorded=true;game.statsPartial=partial;s.recorded[stage][league]++;
}
function leagueCommitLive(){
 const m=state.live,box=m?.leagueBox;
 if(!m?.finished||m.friendly||!box||box.saved||box.year!==state.season.year)return;
 const game=state.schedule.find(g=>g.round===box.round&&g.home===box.home&&g.away===box.away);
 if(!game?.played)return;
 game.shootout=Boolean(m.analysisShootout);game.overtime=Boolean(m.overtime||m.analysisShootout);game.duration=analysisClock();
 leagueCommitRows(game,Object.values(box.players),box.partial||Boolean(m.analysisAbandoned),true);box.saved=true;
}
function leagueRecordBackground(game){
 if(!game?.played||game.statsRecorded||!state.leagueStatistics)return;
 // Stable independent draws: collecting statistics cannot change later match outcomes.
 let rng=Math.floor(attrSeed(`${state.season.year}:${game.round}:${game.home}:${game.away}:stats`)*4294967296)>>>0;
 const rand=()=>{rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng/4294967296;};
 const pick=(players,kind)=>{
  const weights=players.map(p=>Math.max(1,matchAttributeRating(p,kind)-40)**2),total=weights.reduce((a,b)=>a+b,0);let r=rand()*total;
  return players.find((p,i)=>(r-=weights[i])<=0)||players.at(-1);
 };
 const duration=3600+(game.overtime?30+Math.floor(rand()*270):0);game.duration=duration;
 const boxes={};
 for(const club of [game.home,game.away]){
  const pool=(state.clubRosters[club]||[]).filter(medicalReady),fw=pool.filter(p=>!['B','MV'].includes(p.pos)).sort((a,b)=>matchAttributeRating(b)-matchAttributeRating(a)).slice(0,12),def=pool.filter(p=>p.pos==='B').sort((a,b)=>matchAttributeRating(b,'defense')-matchAttributeRating(a,'defense')).slice(0,6),keepers=pool.filter(p=>p.pos==='MV').sort((a,b)=>matchAttributeRating(b)-matchAttributeRating(a));
  const keeper=keepers[rand()<.2&&keepers.length>1?1:0],skaters=[...fw,...def],rows=skaters.map(p=>leagueStatRow(p,club));
  for(const [group,total] of [[fw,3*duration],[def,2*duration]])group.forEach((p,i)=>{rows.find(r=>samePlayerId(r.id,p.id)).seconds=Math.floor(total/group.length)+(i<total%group.length?1:0);});
  if(keeper)rows.push({...leagueStatRow(keeper,club),seconds:duration});
  boxes[club]={skaters,keeper,rows};
 }
 for(const [club,opponent,goals] of [[game.home,game.away,game.homeGoals],[game.away,game.home,game.awayGoals]]){
  const b=boxes[club],other=boxes[opponent];if(!b.skaters.length)continue;
  const shots=Math.max(goals,20+Math.floor(rand()*21)),row=p=>b.rows.find(r=>samePlayerId(r.id,p.id));
  for(let i=0;i<shots;i++){
   const shooter=pick(b.skaters,'shot');row(shooter).shots++;
   if(i<goals){
    row(shooter).goals++;let eligible=b.skaters.filter(p=>!samePlayerId(p.id,shooter.id));
    for(const chance of [.86,.5]){if(!eligible.length||rand()>chance)break;const assist=pick(eligible,'pass');row(assist).assists++;eligible=eligible.filter(p=>!samePlayerId(p.id,assist.id));}
   }
  }
  const keeper=other.rows.find(r=>r.pos==='MV');if(keeper){keeper.saves=shots-goals;keeper.against=goals;}
  const penalties=Math.floor(rand()*6);for(let i=0;i<penalties;i++)row(pick(b.skaters,'defense')).pim+=2;
 }
 leagueCommitRows(game,Object.values(boxes).flatMap(b=>b.rows));
}
function leagueStatSource(){return leagueStatsUI.year==='current'?state.leagueStatistics:state.leagueStatistics.archives.find(a=>String(a.year)===String(leagueStatsUI.year))||state.leagueStatistics;}
function leagueStatClubs(){return leagueStatsUI.year==='current'?Object.keys(state.world.membership).filter(c=>leagueOf(c)===leagueStatLeague()):[...new Set(Object.values(leagueStatSource().rows).filter(r=>r.league===leagueStatLeague()).map(r=>r.club))].sort((a,b)=>a.localeCompare(b,'sv'));}
function leagueStatLeague(){return leagueStatsUI.league||leagueOf();}
function setLeagueStats(key,value){
 const allowed={league:['SHL','HA'],stage:['regular','playoffs'],view:['points','goals','assists','shots','pim','perGame','goalies'],sort:['points','goals','assists','shots','pim','games','perGame','savePct','gaa','saves','against','shutouts','seconds']};
 if(allowed[key]&&!allowed[key].includes(value))return;
 if(key==='year'){if(value!=='current'&&!state.leagueStatistics.archives.some(a=>String(a.year)===String(value)))return;leagueStatsUI.year=value;leagueStatsUI.club='all';}
 else if(key==='minimum'){leagueStatsUI.minimum=Math.max(0,Math.min(52,Number(value)||0));}
 else if(key==='sort'){leagueStatsUI.direction=leagueStatsUI.sort===value?-leagueStatsUI.direction:['gaa'].includes(value)?1:-1;leagueStatsUI.sort=value;}
 else if(key==='query')leagueStatsUI.query=String(value).slice(0,80);
 else if(key==='club'){if(value!=='all'&&!state.world.membership[value])return;leagueStatsUI.club=value;}
 else if(allowed[key]){leagueStatsUI[key]=value;if(key==='league')leagueStatsUI.club='all';if(key==='view'){leagueStatsUI.sort=value==='goalies'?'savePct':value;leagueStatsUI.direction=-1;}}
 leagueStatsUI.limit=50;
 if(state.live?.running)pauseMatch();render();
}
function leagueStatPlayers(){
 ensureLeagueStatistics();const s=leagueStatSource(),u=leagueStatsUI,league=leagueStatLeague(),rows=Object.values(s.rows).filter(r=>r.league===league&&r.stage===u.stage&&(u.club==='all'||u.club===r.club));
 const merged=new Map();
 for(const r of rows){const key=String(r.id);if(!merged.has(key))merged.set(key,{...leagueStatRow(r,r.club),clubs:[],partial:false});const p=merged.get(key);for(const k of LEAGUE_STAT_FIELDS)p[k]+=r[k];if(!p.clubs.includes(r.club))p.clubs.push(r.club);p.partial ||= r.partial;}
 if(s===state.leagueStatistics)for(const [club,roster] of Object.entries(state.clubRosters))if(leagueOf(club)===league&&(u.club==='all'||u.club===club))for(const p of roster)if(!merged.has(String(p.id)))merged.set(String(p.id),{...leagueStatRow(p,club),clubs:[club],partial:false});
 return [...merged.values()].filter(p=>(u.view==='goalies')===(p.pos==='MV')&&p.games>=u.minimum&&(!u.query||`${p.name} ${p.clubs.join(' ')}`.toLocaleLowerCase('sv').includes(u.query.toLocaleLowerCase('sv')))).map(p=>({...p,points:p.goals+p.assists,perGame:p.games?(p.goals+p.assists)/p.games:null,savePct:p.saves+p.against?p.saves/(p.saves+p.against)*100:null,gaa:p.seconds?p.against*3600/p.seconds:null})).sort((a,b)=>{const x=a[u.sort],y=b[u.sort];if(x===null||y===null)return x===y?a.name.localeCompare(b.name,'sv'):x===null?1:-1;return (x-y)*u.direction||b.games-a.games||b.goals-a.goals||a.name.localeCompare(b.name,'sv');});
}
function leagueStatsOpenPlayer(id){const p=findPlayerAnywhere(id);if(!p)return;if(isOwnPlayer(p))selectPlayer(p.id);else recruitOpen(p.id);}
function leagueStatsClub(club){leagueStatsUI.league=leagueOf(club);leagueStatsUI.year='current';leagueStatsUI.club=club;leagueStatsUI.query='';leagueStatsUI.minimum=0;deskNavigate('leagueStats');}
function leagueStatsFilters(stages=true){const u=leagueStatsUI;return `<div class="league-filters"><label>Liga<select onchange="setLeagueStats('league',this.value)"><option value="SHL" ${leagueStatLeague()==='SHL'?'selected':''}>SHL</option><option value="HA" ${leagueStatLeague()==='HA'?'selected':''}>Hockeyallsvenskan</option></select></label>${stages?`<label>Säsong<select onchange="setLeagueStats('year',this.value)"><option value="current" ${u.year==='current'?'selected':''}>${seasonLabel()}</option>${state.leagueStatistics.archives.map(a=>`<option value="${a.year}" ${String(u.year)===String(a.year)?'selected':''}>${seasonLabel(a.year)}</option>`).join('')}</select></label><label>Tävling<select onchange="setLeagueStats('stage',this.value)"><option value="regular" ${u.stage==='regular'?'selected':''}>Grundserie</option><option value="playoffs" ${u.stage==='playoffs'?'selected':''}>Slutspel & kval</option></select></label><label>Lag<select onchange="setLeagueStats('club',this.value)"><option value="all">Samtliga lag</option>${leagueStatClubs().map(c=>`<option value="${trainingSafe(c)}" ${c===u.club?'selected':''}>${trainingSafe(c)}</option>`).join('')}</select></label><label>Spelare<input type="search" placeholder="Sök spelare" value="${trainingSafe(u.query)}" onchange="setLeagueStats('query',this.value)"></label><label>Minst matcher<select onchange="setLeagueStats('minimum',this.value)">${[0,1,3,5,10,20].map(n=>`<option ${u.minimum===n?'selected':''} value="${n}">${n===0?'Alla spelare':n+' matcher'}</option>`).join('')}</select></label>`:''}</div>`;}
function leagueStatisticsView(){
 ensureLeagueStatistics();const u=leagueStatsUI,s=leagueStatSource(),players=leagueStatPlayers(),goalies=u.view==='goalies',count=s.recorded[u.stage][leagueStatLeague()],missing=s.missing[leagueStatLeague()];
 const columns=goalies?[['games','M'],['seconds','Istid'],['saves','Räddn.'],['against','IM'],['savePct','Räddn. %'],['gaa','GAA'],['shutouts','Nollor']]:[['games','M'],['goals','Mål'],['assists','Assist'],['points','Poäng'],['perGame','P/M'],['shots','Skott'],['pim','Utv. min']];
 const value=(p,key)=>p[key]===null?'—':key==='seconds'?analysisTime(p.seconds):key==='savePct'?p[key].toFixed(1):['gaa','perGame'].includes(key)?p[key].toFixed(2):p[key];
 return `<section class="league-statistics"><header class="daily-heading"><div><span class="career-eyebrow">${seasonLabel(s.year)} · HELA LIGAN</span><h1>Spelarstatistik</h1><p>Följ poängmakarna, framspelarna och målvakterna i samtliga lag.</p></div></header>${leagueStatsFilters()}<nav class="league-stat-tabs" aria-label="Statistiklista">${[['points','Poängliga'],['goals','Målliga'],['assists','Assistliga'],['goalies','Målvakter'],['shots','Skott'],['pim','Utvisningar']].map(([id,label])=>`<button onclick="setLeagueStats('view','${id}')" aria-pressed="${u.view===id}">${label}</button>`).join('')}</nav><div class="league-stat-summary"><span>${players.length} spelare i urvalet</span><span>${count} matcher registrerade i ${u.stage==='regular'?'grundserien':'slutspel och kval'}</span></div>${missing?`<p class="league-data-note">Äldre sparfil: ${missing} tidigare matcher saknar fullständig spelarstatistik. Ligans listor räknar från uppdateringen, omgång ${s.startRound}. Tabellens tidigare resultat finns kvar.</p>`:''}${!count?'<p class="league-data-note">Listorna fylls när matcher avslutas. Samtliga lags spelare finns med från start. Träningsmatcher räknas inte.</p>':''}<div class="league-table-scroll" tabindex="0" role="region" aria-label="Sorterbar spelarstatistik"><table class="league-data-table"><thead><tr><th>#</th><th>Spelare / lag</th><th>Pos.</th>${columns.map(([key,label])=>`<th aria-sort="${u.sort===key?(u.direction<0?'descending':'ascending'):'none'}"><button onclick="setLeagueStats('sort','${key}')">${label}${u.sort===key?(u.direction<0?' ↓':' ↑'):''}</button></th>`).join('')}</tr></thead><tbody>${players.slice(0,u.limit).map((p,i)=>`<tr class="${p.clubs.includes(managerClub())?'league-own':''}"><td>${p.games?i+1:'—'}</td><td><button class="league-player-link" onclick="leagueStatsOpenPlayer('${p.id}')" ${findPlayerAnywhere(p.id)?'':'disabled'}>${trainingSafe(p.name)}</button><small>${trainingSafe(p.clubs.join(' / '))}${p.partial?' · Delvis registrerat':''}</small></td><td>${p.pos}</td>${columns.map(([key])=>`<td class="${u.sort===key?'league-key-stat':''}">${value(p,key)}</td>`).join('')}</tr>`).join('')||`<tr><td colspan="${columns.length+3}">Inga spelare matchar urvalet. Sänk matchgränsen eller ändra lag och sökning.</td></tr>`}</tbody></table></div>${players.length>u.limit?`<button class="btn secondary league-more" onclick="leagueStatsUI.limit+=50;render()">Visa fler · ${Math.min(u.limit,players.length)} av ${players.length}</button>`:''}<p class="league-stat-help">${goalies?'Räddningsprocent = räddningar / skott på mål. GAA = insläppta mål per 60 spelade minuter. Mål i tom kasse belastar ingen målvakt. Nollor kräver en hel, registrerad match för en ensam målvakt.':'P/M = poäng per spelad match. Skott avser skott på mål; ramträffar och blockerade skott ingår inte. Klicka på en kolumn för att sortera.'} Straffläggningens avgörande mål räknas bara i lagresultatet. Grundserie och slutspel hålls isär. Två tidigare säsonger sparas. Kort speltid ger osäkra jämförelser.</p></section>`;
}
function leagueStandingsView(){
 const id=leagueStatLeague(),rows=leagueTable(id),leader=rows[0]?.pts||0,own=rows.find(t=>t.name===managerClub());
 const form=club=>state.schedule.filter(g=>g.played&&!g.seriesId&&(g.home===club||g.away===club)).slice(-5).map(g=>{const win=(g.home===club?g.homeGoals:g.awayGoals)>(g.home===club?g.awayGoals:g.homeGoals);return {text:g.overtime?(win?'ÖV':'ÖF'):win?'V':'F',win,score:`${g.home} ${g.homeGoals}–${g.awayGoals} ${g.away}`};});
 return `<section class="league-standings"><header class="daily-heading"><div><span class="career-eyebrow">${seasonLabel()} · GRUNDSERIE</span><h1>Tabellen</h1><p>Placering, målskillnad och form för hela ligan.</p></div>${deskLink('Spelarstatistik',{page:'leagueStats'})}</header>${leagueStatsFilters(false)}<div class="league-table-highlights"><div><span>Serieledare</span><strong>${rows[0]?.gp?trainingSafe(rows[0].name):'Premiären väntar'}</strong><small>${rows[0]?.gp?leader+' poäng':'Inga matcher spelade'}</small></div><div><span>Spelade matcher</span><strong>${rows.reduce((n,t)=>n+t.gp,0)/2}</strong><small>Av ${state.schedule.filter(g=>!g.seriesId&&leagueOf(g.home)===id).length} i grundserien</small></div><div><span>${own?trainingSafe(managerClub()):'Ligans mål'}</span><strong>${own?own.pts+' poäng':rows.reduce((n,t)=>n+t.gf,0)}</strong><small>${own&&own.gp?'Plats '+(rows.indexOf(own)+1)+' · '+(leader-own.pts)+' poäng till ledaren':'Grundseriens lagresultat'}</small></div></div><div class="league-table-scroll" tabindex="0" role="region" aria-label="Fullständig ligatabell"><table class="league-data-table standings-table"><thead><tr><th>#</th><th>Klubb</th><th title="Spelade matcher">M</th><th title="Segrar under ordinarie tid">V</th><th title="Segrar efter förlängning eller straffar">ÖV</th><th title="Förluster efter förlängning eller straffar">ÖF</th><th>F</th><th>GM</th><th>IM</th><th>+/−</th><th>P/M</th><th>Poäng</th><th>Senaste fem</th></tr></thead><tbody>${rows.map((t,i)=>`<tr class="${t.name===managerClub()?'league-own ':''}${[5,9,11].includes(i)?'league-cut':''}"><td><span class="league-position ${i<6?'direct':i<10?'playin':i>11&&id==='SHL'?'qualifier':''}">${i+1}</span></td><td><button class="league-club-link" onclick="leagueStatsClub('${t.name}')"><span class="league-monogram" style="--club-color:${careerIdentity(t.name).color}">${careerIdentity(t.name).code}</span>${trainingSafe(t.name)}</button></td><td>${t.gp}</td><td>${t.w}</td><td>${t.otw}</td><td>${t.otl}</td><td>${t.l}</td><td>${t.gf}</td><td>${t.ga}</td><td>${t.gf-t.ga>0?'+':''}${t.gf-t.ga}</td><td>${t.gp?(t.pts/t.gp).toFixed(2):'—'}</td><td class="league-key-stat">${t.pts}</td><td><span class="league-form">${form(t.name).map(f=>`<abbr title="${trainingSafe(f.score)}" class="${f.win?'win':'loss'}">${f.text}</abbr>`).join('')||'—'}</span></td></tr>`).join('')}</tbody></table></div><div class="league-table-legend"><span><i class="direct"></i>1–6: kvartsfinal</span><span><i class="playin"></i>7–10: åttondelsfinal</span>${id==='SHL'?'<span><i class="qualifier"></i>13–14: SHL-kval</span>':''}</div><p class="league-stat-help">Vinst ger 3 poäng. Avgörande efter ordinarie tid ger 2–1 poäng. Tabellen avgörs av poäng och målskillnad. Formen visas från äldst till senast. Klicka på en klubb för dess spelarstatistik.</p></section>`;
}
