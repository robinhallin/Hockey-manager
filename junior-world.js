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
function juniorWorldManagerResult(pair,match,round){
  const league=leagueOf(managerClub()),home=pair.home===managerClub(),opponent=home?pair.away:pair.home;
  let own=match?.own??0,against=juniorWorldProjectedResult(home?managerClub():opponent,home?opponent:managerClub(),round)[home?'awayGoals':'homeGoals'];
  let overtime=false,forfeit=!match;
  if(forfeit){own=0;against=Math.max(3,against);}
  else if(own===against){overtime=true;const win=attrSeed(`j20:${state.season.year}:${round}:${managerClub()}:shootout`)>=.5;if(win)own++;else against++;}
  const result=home?{home:managerClub(),away:opponent,homeGoals:own,awayGoals:against,overtime,forfeit}:{home:opponent,away:managerClub(),homeGoals:against,awayGoals:own,overtime,forfeit};
  if(match){
    match.opponent=opponent;match.own=own;match.against=against;match.overtime=overtime;match.j20=true;
    for(const row of match.players||[]){const p=juniorById(row.id);if(p?.academy?.history?.[0]&&p.academy.history[0].round===round)p.academy.history[0].opponent=opponent+' J20';}
  }
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
function juniorWorldOpponent(club=managerClub(),round=state.round+1){
  const pair=juniorWorldPairings(leagueOf(club),round).find(g=>g.home===club||g.away===club);if(!pair)return null;
  return {round,opponent:pair.home===club?pair.away:pair.home,venue:pair.home===club?'Hemma':'Borta'};
}
function juniorWorldView(){
  const league=leagueOf(),table=juniorWorldTable(league),next=state.season?.phase==='regular'?juniorWorldOpponent():null,recent=ensureJuniorWorld().results.filter(r=>r.league===league&&(r.home===managerClub()||r.away===managerClub())).slice(-5).reverse();
  const nextText=next?`Nästa: ${trainingSafe(next.opponent)} · ${next.venue}`:state.season?.phase==='regular'?'Ingen match planerad':'J20-serien fortsätter under grundserien';
  return `<section class="dv-panel junior-world"><header><div><h2>${league} J20 · utvecklingsserie</h2><p class="dv-note">Riktiga seniorklubbar, fiktiva juniorer. Resultaten påverkas av akademiernas aktuella spelare och utvecklingsnivå.</p></div><span>${nextText}</span></header><div class="junior-world-grid"><div class="dv-scroll"><table><thead><tr><th>#</th><th>Lag</th><th>M</th><th>+/−</th><th>P</th></tr></thead><tbody>${table.map((r,i)=>`<tr class="${r.name===managerClub()?'selected':''}"><td>${i+1}</td><th>${trainingSafe(r.name)} J20</th><td>${r.gp}</td><td>${r.gf-r.ga}</td><td><strong>${r.pts}</strong></td></tr>`).join('')}</tbody></table></div><div class="junior-world-recent"><h3>Dina senaste J20-matcher</h3>${recent.map(g=>{const home=g.home===managerClub(),own=home?g.homeGoals:g.awayGoals,against=home?g.awayGoals:g.homeGoals,opp=home?g.away:g.home;return `<p><strong>${own}–${against}</strong> ${trainingSafe(opp)}${g.overtime?' · OT/SO':''}${g.forfeit?' · ej spelbar trupp':''}</p>`;}).join('')||'<p class="dv-note">Tabellen börjar fyllas när nästa junioromgång spelas.</p>'}</div></div></section>`;
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
