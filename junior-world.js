"use strict";

function juniorWorldClubs(league=leagueOf()){
  return Object.keys(state.world?.membership||{}).filter(club=>leagueOf(club)===league).sort((a,b)=>a.localeCompare(b,'sv'));
}
function juniorWorldPairings(league,round){
  const clubs=juniorWorldClubs(league);if(clubs.length<2)return [];
  const list=clubs.length%2?[...clubs,null]:[...clubs],rounds=list.length-1,index=Math.max(0,round-1)%rounds,cycle=Math.floor(Math.max(0,round-1)/rounds);
  let rotated=[...list];
  for(let r=0;r<index;r++)rotated=[rotated[0],rotated.at(-1),...rotated.slice(1,-1)];
  const games=[];
  for(let i=0;i<rotated.length/2;i++){
    let a=rotated[i],b=rotated[rotated.length-1-i];if(!a||!b)continue;
    const swap=((i+index)%2)===1;if(swap)[a,b]=[b,a];if(cycle%2)[a,b]=[b,a];
    games.push({home:a,away:b});
  }
  return games;
}
function ensureJuniorWorld(){
  if(!state.careerStarted||!state.season)return null;
  ensureClubAI();
  if(!state.juniorWorld)state.juniorWorld={version:1,year:state.season.year,results:[],archive:[]};
  const w=state.juniorWorld;
  if(w.year!==state.season.year){w.archive.unshift({year:w.year,results:w.results});w.archive=w.archive.slice(0,6);w.year=state.season.year;w.results=[];}
  return w;
}
function juniorWorldRoster(club){
  if(club===managerClub())return state.juniors?.roster||[];
  return clubAIState(club)?.academy?.roster||[];
}

// Match usage is separate from individual training load; it never changes the senior lineup.
const JUNIOR_MATCH_USAGE={auto:'Normal rotation',priority:'Större matchroll',sheltered:'Begränsad matchroll',rest:'Stå över juniormatch'};
function juniorMatchUsage(p,club=managerClub()){
  return p.academy?.matchUsageClub===club&&Object.hasOwn(JUNIOR_MATCH_USAGE,p.academy.matchUsage)?p.academy.matchUsage:'auto';
}
function juniorSetMatchUsage(id,value){
  const p=state.juniors?.roster.find(p=>samePlayerId(p.id,id));
  if(!p||!managerEmployed()||juniorLocked()||p.academy.loan||p.age>20||!Object.hasOwn(JUNIOR_MATCH_USAGE,value))return;
  p.academy.matchUsage=value;p.academy.matchUsageClub=managerClub();
  juniorNotice(p.name+': '+JUNIOR_MATCH_USAGE[value]+'. Juniortränaren fördelar istiden inom medicinska gränser.');
}
function juniorMatchPlan(club=managerClub(),round=state.round){
  const all=juniorWorldRoster(club),pool=all.filter(p=>p.age<=20&&!p.academy?.loan&&medicalReady(p)&&p.fatigue<80&&juniorMatchUsage(p,club)!=='rest');
  const weight=p=>({priority:1.5,sheltered:.55,auto:1})[juniorMatchUsage(p,club)]||1;
  const seconds=new Map(all.map(p=>[String(p.id),0]));
  // Water-filling conserves the available ice time and respects each player's medical cap.
  const allocate=(players,budget,cap=3600)=>{
    let remaining=budget,active=players.slice();
    while(remaining>0&&active.length){
      const total=active.reduce((n,p)=>n+weight(p),0),share=remaining;
      for(const p of active){const id=String(p.id),room=Math.max(0,Math.min(cap,medicalLimit(p))-(seconds.get(id)||0));
        const grant=Math.min(room,Math.max(1,Math.floor(share*weight(p)/total)),remaining);
        seconds.set(id,(seconds.get(id)||0)+grant);remaining-=grant;
      }
      active=active.filter(p=>(seconds.get(String(p.id))||0)<Math.min(cap,medicalLimit(p)));
    }
    return remaining===0;
  };
  const goalies=pool.filter(p=>p.pos==='MV').sort((a,b)=>weight(b)-weight(a)||a.fatigue-b.fatigue||String(a.id).localeCompare(String(b.id)));
  // Rotate equal-priority keepers; an explicit larger role wins that comparison.
  const best=goalies[0],peers=best?goalies.filter(p=>weight(p)===weight(best)&&Math.abs(p.fatigue-best.fatigue)<10):[];
  const starter=peers.length?peers[(Math.max(1,round)-1)%peers.length]:best;
  const keepers=starter?[starter,...goalies.filter(p=>p!==starter)]:[];
  let goalieLeft=3600;for(const p of keepers){const grant=Math.min(goalieLeft,medicalLimit(p));seconds.set(String(p.id),grant);goalieLeft-=grant;if(!goalieLeft)break;}
  const backs=pool.filter(p=>p.pos==='B'),forwards=pool.filter(p=>!['MV','B'].includes(p.pos));
  const defenseOK=allocate(backs,7200),forwardOK=allocate(forwards,10800);
  const playable=goalies.length>0&&backs.length>=2&&forwards.length>=3&&goalieLeft===0&&defenseOK&&forwardOK;
  if(!playable)for(const id of seconds.keys())seconds.set(id,0);
  return {playable,seconds,starter:starter?.id??null};
}
function juniorMatchPlanControl(p){
  if(isOwnPlayer(p)||p.academy.loan||p.age>20)return '';
  const plan=juniorMatchPlan(),seconds=plan.seconds.get(String(p.id))||0;
  return `<section class="junior-match-plan"><h3>Matchning i juniorlaget</h3><label>Ansvar nästa juniormatch<select aria-label="Juniorens matchroll" onchange="juniorSetMatchUsage('${p.id}',this.value)" ${juniorLocked()?'disabled':''}>${Object.entries(JUNIOR_MATCH_USAGE).map(([key,label])=>`<option value="${key}" ${juniorMatchUsage(p)===key?'selected':''}>${label}</option>`).join('')}</select></label><p>${plan.playable?`Planerad istid med dagens trupp: ${Math.floor(seconds/60)} min ${seconds%60} sek.`:'Truppen kan inte täcka en hel match inom de medicinska gränserna.'} Mer istid ger matchvana men ökar belastningen. Träningsvila och A-lagsuttagning ändras inte.</p></section>`;
}

function juniorWorldStrength(club){
  const plan=juniorMatchPlan(club),roster=juniorWorldRoster(club).filter(p=>(plan.seconds.get(String(p.id))||0)>0);
  if(!plan.playable)return 0;
  const total=roster.reduce((n,p)=>n+plan.seconds.get(String(p.id)),0);
  return roster.reduce((n,p)=>n+attributeWeighted(ensurePlayerAttributes(p),PLAYER_ROLES[p.academy?.role]||PLAYER_ROLES[juniorRoles(p)[0]])*plan.seconds.get(String(p.id)),0)/Math.max(1,total);
}
function juniorWorldProjectedResult(home,away,round){
  const hs=juniorWorldStrength(home),as=juniorWorldStrength(away),seed=key=>attrSeed(`j20:${state.season.year}:${round}:${home}:${away}:${key}`);
  let hg=Math.max(0,Math.min(8,Math.round(2.7+(hs-as)*.3+(seed('home')-.5)*3.8+.18)));
  let ag=Math.max(0,Math.min(8,Math.round(2.7+(as-hs)*.3+(seed('away')-.5)*3.8)));
  let overtime=false;
  if(hg===ag){overtime=true;if(seed('ot')>=.5)hg++;else ag++;}
  return {home,away,homeGoals:hg,awayGoals:ag,overtime};
}
function juniorWorldResultKey(league,round,home,away){return `${state.season.year}:${league}:${round}:${home}:${away}`;}
function juniorWorldRecord(result,league,round){
  const w=ensureJuniorWorld(),key=juniorWorldResultKey(league,round,result.home,result.away);if(w.results.some(r=>r.key===key))return;
  w.results.push({key,year:state.season.year,league,round,...result,date:state.calendar?.date||null});
  if(w.results.length>900)w.results=w.results.slice(-900);
  return w.results.at(-1);
}
function juniorWorldHistoryRow(p,round){return p?.academy?.history?.find(h=>h.year===state.season.year&&h.round===round&&h.path!=='senior')||null;}
function juniorWorldRetallyManagerMatch(match,opponent,round,targetGoals){
  if(!match)return 0;
  const rows=match.players||[],eligible=rows.filter(row=>{const p=juniorById(row.id);return row.seconds>0&&p&&p.pos!=='MV';});
  for(const row of rows){
    const p=juniorById(row.id),oldGoals=Number(row.goals)||0,oldAssists=Number(row.assists)||0,h=juniorWorldHistoryRow(p,round);
    if(p?.academy){p.academy.goals=Math.max(0,(p.academy.goals||0)-oldGoals);p.academy.assists=Math.max(0,(p.academy.assists||0)-oldAssists);}
    row.goals=0;row.assists=0;
    if(h){h.goals=0;h.assists=0;h.opponent=opponent+' J20';}
  }
  if(!eligible.length)return 0;
  juniorWorldAssignPoints(managerClub(),rows,opponent,round,targetGoals);
  match.own=targetGoals;return targetGoals;
}
function juniorWorldAssignPoints(club,rows,opponent,round,targetGoals){
  const roster=juniorWorldRoster(club),find=id=>roster.find(p=>String(p.id)===String(id));
  const eligible=rows.filter(row=>row.seconds>0&&find(row.id)?.pos!=='MV');
  if(!eligible.length)return;
  const weightedPick=(candidates,key,fields)=>{
    const values=candidates.map(row=>{const p=find(row.id),attrs=ensurePlayerAttributes(p);return {row,weight:Math.max(1,row.seconds)*fields.reduce((n,k)=>n+(attrs[k]||10),0)};});
    let ticket=attrSeed(`j20:${state.season.year}:${club}:${round}:${key}`)*values.reduce((n,v)=>n+v.weight,0);
    for(const v of values){ticket-=v.weight;if(ticket<0)return v.row;}return values.at(-1)?.row;
  };
  for(let goal=0;goal<targetGoals;goal++){
    const scorer=weightedPick(eligible,'goal:'+goal,['shooting','positioning','composure']);
    scorer.goals++;const p=find(scorer.id);p.academy.goals++;const h=juniorWorldHistoryRow(p,round);if(h)h.goals++;
    const roll=attrSeed(`j20:${state.season.year}:${round}:assist-count:${goal}`),count=roll<.12?0:roll<.34?1:2;
    let candidates=eligible.filter(r=>r!==scorer);
    for(let assist=0;assist<count&&candidates.length;assist++){
      const helper=weightedPick(candidates,'assist:'+goal+':'+assist,['passing','vision','decisions']),p=find(helper.id);
      helper.assists++;p.academy.assists++;const h=juniorWorldHistoryRow(p,round);if(h)h.assists++;
      candidates=candidates.filter(r=>r!==helper);
    }
  }
 }
function juniorWorldLeagueRows(club,round,opponent,rows){
  for(const row of rows){
    const p=juniorWorldRoster(club).find(p=>String(p.id)===String(row.id));if(!p?.academy||!row.seconds)continue;
    const a=p.academy;
    if(!a.leagueStats||a.leagueStats.year!==state.season.year)a.leagueStats={year:state.season.year,games:0,seconds:0,goals:0,assists:0};
    const l=a.leagueStats;l.games++;l.seconds+=row.seconds;l.goals+=row.goals||0;l.assists+=row.assists||0;
  }
}
function juniorWorldAIReport(club,opponent,round,goals){
  const plan=juniorMatchPlan(club,round),roster=juniorWorldRoster(club),rows=[];
  if(!plan.playable)return;
  for(const p of roster){
    const seconds=plan.seconds.get(String(p.id))||0;if(!seconds)continue;
    const a=p.academy;a.games=(a.games||0)+1;a.seconds=(a.seconds||0)+seconds;a.observations=Math.min(100,(a.observations||0)+1);
    a.history.unshift({year:state.season.year,round,date:state.calendar.date,opponent:opponent+' J20',path:'junior',seconds,goals:0,assists:0});a.history=a.history.slice(0,16);
    const row={id:p.id,name:p.name,seconds,goals:0,assists:0};rows.push(row);
    // Same development entry point and real exposure; no old weekly match is also awarded.
    if(medicalCanTrain(p))developmentAdvance(p,juniorTarget(p),2*Math.min(2,seconds/900));p.fatigue=trainingClamp(p.fatigue+seconds/180);
  }
  juniorWorldAssignPoints(club,rows,opponent,round,goals);juniorWorldLeagueRows(club,round,opponent,rows);
}
function juniorWorldScoringView(league){
  const rows=juniorWorldClubs(league).flatMap(club=>juniorWorldRoster(club).map(p=>({p,club,stats:p.academy?.leagueStats}))).filter(r=>r.stats?.year===state.season.year&&r.stats.games).sort((a,b)=>(b.stats.goals+b.stats.assists)-(a.stats.goals+a.stats.assists)||b.stats.goals-a.stats.goals).slice(0,12);
  return `<details class="dv-report"><summary>J20-poängliga · registrerade juniormatcher</summary><p class="dv-note">Statistik börjar samlas med den här uppdateringen. Äldre mål och matcher återskapas inte.</p><table><thead><tr><th>Spelare</th><th>Klubb</th><th>M</th><th>Mål</th><th>Ass</th><th>Poäng</th></tr></thead><tbody>${rows.map(({p,club,stats:l})=>`<tr><th>${trainingSafe(p.name)}</th><td>${trainingSafe(club)}</td><td>${l.games}</td><td>${l.goals}</td><td>${l.assists}</td><td>${l.goals+l.assists}</td></tr>`).join('')||'<tr><td colspan="6">Ingen registrerad seriematch ännu.</td></tr>'}</tbody></table></details>`;
}

function juniorWorldManagerResult(pair,match,round,projected=null){
  const league=leagueOf(managerClub()),home=pair.home===managerClub(),opponent=home?pair.away:pair.home,forecast=projected||juniorWorldProjectedResult(pair.home,pair.away,round),forfeit=!match;
  let own=home?forecast.homeGoals:forecast.awayGoals,against=home?forecast.awayGoals:forecast.homeGoals,overtime=forecast.overtime;
  if(forfeit){own=0;against=Math.max(3,against);overtime=false;}
  else own=juniorWorldRetallyManagerMatch(match,opponent,round,own);
  const result=home?{home:managerClub(),away:opponent,homeGoals:own,awayGoals:against,overtime,forfeit}:{home:opponent,away:managerClub(),homeGoals:against,awayGoals:own,overtime,forfeit};
  if(match){match.opponent=opponent;match.own=own;match.against=against;match.overtime=overtime;match.j20=true;}
  if(juniorWorldRecord(result,league,round)){
    if(match)juniorWorldLeagueRows(managerClub(),round,opponent,match.players||[]);
    if(!forfeit)juniorWorldAIReport(opponent,managerClub(),round,against);
  }
}
function juniorWorldSimulateRound(round,managerMatch=null,managerProjection=null){
  const w=ensureJuniorWorld();if(!w||state.season?.phase!=='regular')return;
  for(const league of ['SHL','HA'])for(const pair of juniorWorldPairings(league,round)){
    if(pair.home===managerClub()||pair.away===managerClub()){
      if(league===leagueOf(managerClub())&&!w.results.some(r=>r.key===juniorWorldResultKey(league,round,pair.home,pair.away)))juniorWorldManagerResult(pair,managerMatch,round,managerProjection);
      continue;
    }
    const forecast=juniorWorldProjectedResult(pair.home,pair.away,round);
    if(juniorWorldRecord(forecast,league,round)){
      juniorWorldAIReport(pair.home,pair.away,round,forecast.homeGoals);
      juniorWorldAIReport(pair.away,pair.home,round,forecast.awayGoals);
    }
  }
}
function juniorWorldTable(league=leagueOf()){
  const rows=juniorWorldClubs(league).map(name=>({name,gp:0,w:0,l:0,otw:0,otl:0,gf:0,ga:0,pts:0})),map=new Map(rows.map(r=>[r.name,r]));
  for(const g of ensureJuniorWorld().results.filter(r=>r.league===league&&r.year===state.season.year)){
    const h=map.get(g.home),a=map.get(g.away);if(!h||!a)continue;h.gp++;a.gp++;h.gf+=g.homeGoals;h.ga+=g.awayGoals;a.gf+=g.awayGoals;a.ga+=g.homeGoals;
    const homeWin=g.homeGoals>g.awayGoals,winner=homeWin?h:a,loser=homeWin?a:h;winner.w++;loser.l++;
    if(g.overtime){winner.otw++;loser.otl++;winner.pts+=2;loser.pts+=1;}else winner.pts+=3;
  }
  return rows.sort((a,b)=>b.pts-a.pts||(b.gf-b.ga)-(a.gf-a.ga)||b.gf-a.gf||a.name.localeCompare(b.name,'sv'));
}
function juniorWorldOpponent(club=managerClub(),round=state.round){
  const pair=juniorWorldPairings(leagueOf(club),round).find(g=>g.home===club||g.away===club);if(!pair)return null;
  return {round,opponent:pair.home===club?pair.away:pair.home,venue:pair.home===club?'Hemma':'Borta'};
}
function juniorWorldNextOpponent(club=managerClub()){
  const league=leagueOf(club),w=ensureJuniorWorld(),played=new Set(w.results.filter(r=>r.year===state.season.year&&r.league===league&&(r.home===club||r.away===club)).map(r=>r.round));
  let round=Math.max(1,state.round||1);const limit=(juniorWorldClubs(league).length-1)*4;
  while(played.has(round)&&round<=limit)round++;
  return round<=limit?juniorWorldOpponent(club,round):null;
}
function juniorWorldView(){
  const league=leagueOf(),table=juniorWorldTable(league),next=state.season?.phase==='regular'?juniorWorldNextOpponent():null,recent=ensureJuniorWorld().results.filter(r=>r.league===league&&(r.home===managerClub()||r.away===managerClub())).slice(-5).reverse();
  const nextText=next?`Nästa: ${trainingSafe(next.opponent)} · ${next.venue} · J20-omgång ${next.round}`:state.season?.phase==='regular'?'Ingen match planerad':'J20-serien fortsätter under grundserien';
  return `<section class="dv-panel junior-world"><header><div><h2>${league} J20 · utvecklingsserie</h2><p class="dv-note">Spelets egen utvecklingsserie, inte det officiella J20-seriesystemet. Riktiga seniorklubbar, fiktiva juniorer. Resultat och individuell poängproduktion kommer från samma J20-match och påverkas av akademiernas nivå vid matchstart.</p></div><span>${nextText}</span></header><div class="junior-world-grid"><div class="dv-scroll"><table><thead><tr><th>#</th><th>Lag</th><th>M</th><th>+/−</th><th>P</th></tr></thead><tbody>${table.map((r,i)=>`<tr class="${r.name===managerClub()?'selected':''}"><td>${i+1}</td><th>${trainingSafe(r.name)} J20</th><td>${r.gp}</td><td>${r.gf-r.ga}</td><td><strong>${r.pts}</strong></td></tr>`).join('')}</tbody></table></div><div class="junior-world-recent"><h3>Dina senaste J20-matcher</h3>${recent.map(g=>{const home=g.home===managerClub(),own=home?g.homeGoals:g.awayGoals,against=home?g.awayGoals:g.homeGoals,opp=home?g.away:g.home;return `<p><strong>${own}–${against}</strong> ${trainingSafe(opp)}${g.overtime?' · OT':''}${g.forfeit?' · ej spelbar trupp':''}</p>`;}).join('')||'<p class="dv-note">Tabellen börjar fyllas när nästa junioromgång spelas.</p>'}</div></div>${juniorWorldScoringView(league)}</section>`;
}

const juniorFixtureBeforeWorld=juniorFixture;
juniorFixture=function(key){
  ensureJuniors();ensureJuniorWorld();
  const round=state.round,before=state.juniors?.matches?.[0]||null,last=state.juniors?.lastFixture,pair=state.season?.phase==='regular'?juniorWorldPairings(leagueOf(),round).find(g=>g.home===managerClub()||g.away===managerClub()):null;
  const projection=pair?juniorWorldProjectedResult(pair.home,pair.away,round):null;
  juniorFixtureBeforeWorld(key);
  if(state.juniors.lastFixture===last||state.season?.phase!=='regular')return;
  // The report buffer is capped at 16: compare the newest record, not its length.
  const latest=state.juniors.matches?.[0]||null,created=latest!==before?latest:null;
  juniorWorldSimulateRound(round,created,projection);
};

if(typeof developmentJuniorsView==="function"){
  const developmentJuniorsViewBeforeWorld=developmentJuniorsView;
  developmentJuniorsView=function(){
    ensureJuniorWorld();let html=developmentJuniorsViewBeforeWorld();
    html=html.replace('Juniorlagets matcher spelas efter A-lagets matcher. Motståndarna är fiktiva och statistiken räknas separat.','Under grundserien ingår juniorlagets matcher i klubbarnas J20-utvecklingsserie. Statistik och resultat räknas separat från A-laget; utvecklingsmatcher utanför serien kan förekomma under andra säsongsfaser.');
    const end=html.lastIndexOf('</section>');return end<0?html:html.slice(0,end)+juniorWorldView()+html.slice(end);
  };
}
