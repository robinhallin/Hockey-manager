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
    const swap=((i+index+cycle)%2)===1;if(swap)[a,b]=[b,a];if(cycle%2)[a,b]=[b,a];
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
function juniorWorldStrength(club){
  const roster=juniorWorldRoster(club).filter(p=>p.age<=20&&!p.academy?.loan&&medicalReady(p));
  if(!roster.length)return leagueOf(club)==='SHL'?9.5:8.5;
  const values=roster.map(p=>attributeWeighted(ensurePlayerAttributes(p),PLAYER_ROLES[p.academy?.role]||PLAYER_ROLES[juniorRoles(p)[0]]));
  return values.reduce((n,v)=>n+v,0)/values.length;
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
}
function juniorWorldHistoryRow(p,round){return p?.academy?.history?.find(h=>h.year===state.season.year&&h.round===round&&h.path!=='senior')||null;}
function juniorWorldRetallyManagerMatch(match,opponent,round,targetGoals){
  if(!match)return 0;
  const rows=match.players||[],eligible=rows.filter(row=>row.seconds>0&&juniorById(row.id)?.pos!=='MV');
  for(const row of rows){
    const p=juniorById(row.id),oldGoals=Number(row.goals)||0,oldAssists=Number(row.assists)||0,h=juniorWorldHistoryRow(p,round);
    if(p?.academy){p.academy.goals=Math.max(0,(p.academy.goals||0)-oldGoals);p.academy.assists=Math.max(0,(p.academy.assists||0)-oldAssists);}
    row.goals=0;row.assists=0;
    if(h){h.goals=0;h.assists=0;h.opponent=opponent+' J20';}
  }
  if(!eligible.length)return 0;
  const scoreValue=p=>{const a=ensurePlayerAttributes(p);return (a.shooting||10)*.38+(a.positioning||10)*.25+(a.composure||10)*.2+(a.puckControl||10)*.17;};
  const assistValue=p=>{const a=ensurePlayerAttributes(p);return (a.passing||10)*.45+(a.vision||10)*.35+(a.decisions||10)*.2;};
  for(let goal=0;goal<targetGoals;goal++){
    const ranked=eligible.map(row=>({row,p:juniorById(row.id)})).sort((a,b)=>(scoreValue(b.p)+attrSeed(`j20:${state.season.year}:${round}:g:${goal}:${b.p.id}`)*4)-(scoreValue(a.p)+attrSeed(`j20:${state.season.year}:${round}:g:${goal}:${a.p.id}`)*4));
    const scorer=ranked[0];scorer.row.goals++;scorer.p.academy.goals++;const scorerHistory=juniorWorldHistoryRow(scorer.p,round);if(scorerHistory)scorerHistory.goals++;
    const roll=attrSeed(`j20:${state.season.year}:${round}:assist-count:${goal}`),assistCount=roll<.12?0:roll<.34?1:2;
    const assists=ranked.slice(1).sort((a,b)=>(assistValue(b.p)+attrSeed(`j20:${state.season.year}:${round}:a:${goal}:${b.p.id}`)*3)-(assistValue(a.p)+attrSeed(`j20:${state.season.year}:${round}:a:${goal}:${a.p.id}`)*3)).slice(0,assistCount);
    for(const helper of assists){helper.row.assists++;helper.p.academy.assists++;const h=juniorWorldHistoryRow(helper.p,round);if(h)h.assists++;}
  }
  match.own=targetGoals;return targetGoals;
}
function juniorWorldManagerResult(pair,match,round){
  const league=leagueOf(managerClub()),home=pair.home===managerClub(),opponent=home?pair.away:pair.home,projected=juniorWorldProjectedResult(pair.home,pair.away,round),forfeit=!match;
  let own=home?projected.homeGoals:projected.awayGoals,against=home?projected.awayGoals:projected.homeGoals,overtime=projected.overtime;
  if(forfeit){own=0;against=Math.max(3,against);overtime=false;}
  else own=juniorWorldRetallyManagerMatch(match,opponent,round,own);
  const result=home?{home:managerClub(),away:opponent,homeGoals:own,awayGoals:against,overtime,forfeit}:{home:opponent,away:managerClub(),homeGoals:against,awayGoals:own,overtime,forfeit};
  if(match){match.opponent=opponent;match.own=own;match.against=against;match.overtime=overtime;match.j20=true;}
  juniorWorldRecord(result,league,round);
}
function juniorWorldSimulateRound(round,managerMatch=null){
  const w=ensureJuniorWorld();if(!w||state.season?.phase!=='regular')return;
  for(const league of ['SHL','HA'])for(const pair of juniorWorldPairings(league,round)){
    if(pair.home===managerClub()||pair.away===managerClub()){
      if(league===leagueOf(managerClub())&&!w.results.some(r=>r.key===juniorWorldResultKey(league,round,pair.home,pair.away)))juniorWorldManagerResult(pair,managerMatch,round);
      continue;
    }
    juniorWorldRecord(juniorWorldProjectedResult(pair.home,pair.away,round),league,round);
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
  let round=Math.max(1,state.round||1);while(played.has(round)&&round<60)round++;
  return juniorWorldOpponent(club,round);
}
function juniorWorldView(){
  const league=leagueOf(),table=juniorWorldTable(league),next=state.season?.phase==='regular'?juniorWorldNextOpponent():null,recent=ensureJuniorWorld().results.filter(r=>r.league===league&&(r.home===managerClub()||r.away===managerClub())).slice(-5).reverse();
  const nextText=next?`Nästa: ${trainingSafe(next.opponent)} · ${next.venue} · J20-omgång ${next.round}`:state.season?.phase==='regular'?'Ingen match planerad':'J20-serien fortsätter under grundserien';
  return `<section class="dv-panel junior-world"><header><div><h2>${league} J20 · utvecklingsserie</h2><p class="dv-note">Riktiga seniorklubbar, fiktiva juniorer. Resultat och individuell poängproduktion kommer från samma J20-match och påverkas av akademiernas aktuella nivå.</p></div><span>${nextText}</span></header><div class="junior-world-grid"><div class="dv-scroll"><table><thead><tr><th>#</th><th>Lag</th><th>M</th><th>+/−</th><th>P</th></tr></thead><tbody>${table.map((r,i)=>`<tr class="${r.name===managerClub()?'selected':''}"><td>${i+1}</td><th>${trainingSafe(r.name)} J20</th><td>${r.gp}</td><td>${r.gf-r.ga}</td><td><strong>${r.pts}</strong></td></tr>`).join('')}</tbody></table></div><div class="junior-world-recent"><h3>Dina senaste J20-matcher</h3>${recent.map(g=>{const home=g.home===managerClub(),own=home?g.homeGoals:g.awayGoals,against=home?g.awayGoals:g.homeGoals,opp=home?g.away:g.home;return `<p><strong>${own}–${against}</strong> ${trainingSafe(opp)}${g.overtime?' · OT':''}${g.forfeit?' · ej spelbar trupp':''}</p>`;}).join('')||'<p class="dv-note">Tabellen börjar fyllas när nästa junioromgång spelas.</p>'}</div></div></section>`;
}

const juniorFixtureBeforeWorld=juniorFixture;
juniorFixture=function(key){
  const before=state.juniors?.matches?.length||0,last=state.juniors?.lastFixture;
  juniorFixtureBeforeWorld(key);ensureJuniorWorld();
  if(state.juniors.lastFixture===last||state.season?.phase!=='regular')return;
  const created=(state.juniors.matches?.length||0)>before?state.juniors.matches[0]:null;
  juniorWorldSimulateRound(state.round,created);
};

if(typeof developmentJuniorsView==="function"){
  const developmentJuniorsViewBeforeWorld=developmentJuniorsView;
  developmentJuniorsView=function(){
    ensureJuniorWorld();let html=developmentJuniorsViewBeforeWorld();
    html=html.replace('Juniorlagets matcher spelas efter A-lagets matcher. Motståndarna är fiktiva och statistiken räknas separat.','Under grundserien ingår juniorlagets matcher i klubbarnas J20-utvecklingsserie. Statistik och resultat räknas separat från A-laget; utvecklingsmatcher utanför serien kan förekomma under andra säsongsfaser.');
    const end=html.lastIndexOf('</section>');return end<0?html:html.slice(0,end)+juniorWorldView()+html.slice(end);
  };
}
