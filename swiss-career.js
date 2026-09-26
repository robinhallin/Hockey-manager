"use strict";
// Explicit, opt-in National League career; never expand an existing save on load.
function swissClub(name){return SWISS_DATABASE.clubs.find(c=>c.name===name);}
function swissCareer(s=state){return s?.world?.mode==='CH_NL';}
function swissRegisterClubs(){
 for(const c of SWISS_DATABASE.clubs){
  const title=['ZSC Lions','HC Davos','EV Zug','Fribourg-Gottéron'].includes(c.name),build=['HC Ajoie','HC Ambri-Piotta','EHC Kloten'].includes(c.name);
  const cash=title?24000000:build?12000000:18000000,place=title?4:build?10:6,group=title?'title':build?'build':'playoff';
  CLUB_DATA[c.name]={name:c.name,strength:77,style:'balanced',reputation:77,budget:cash,wageBudget:28000000,fans:title?7500:build?4500:6000,boardExpectation:'Bygg en slutspelsklubb'};
  CAREER_CLUBS[c.name]={code:c.code,city:c.name,color:'#e8b5ac',group,title:'Bygg vägen till slutspelet.',pitch:'Utveckla laget, håll ekonomin i balans och utmana om en plats i slutspelet.',cash,place,youth:2,economy:build};
  CLUB_CRESTS[c.name]=c.crest;
 }
}
function swissRoster(name){
 const club=swissClub(name);if(!club)return [];
 return SWISS_DATABASE.players.filter(p=>p.clubId===club.id).map(row=>{
  const model=row.attributes?{attributes:row.attributes,potential:row.potential}:evidenceProfile({...row,stats:row.stats||[]});
  const attributes={...model.attributes},overall=Math.round(45+2.5*Object.values(attributes).reduce((a,b)=>a+b,0)/Object.keys(attributes).length),growth=model.potential.central;
  return {id:row.id,name:row.name,club:name,pos:row.position==='G'?'MV':row.position==='D'?'B':'F',age:haAge(row.birth,SWISS_DATABASE.checked),nationality:row.nationality,fictional:false,attributes,overall,potential:overall+Math.round(growth*2.5),attributeGrowth:growth,developmentForecast:[model.potential.low,model.potential.high],shooting:overall,passing:overall,defense:overall,physical:overall,salary:Math.round(Math.max(180000,(overall-53)*35000)/10000)*10000,value:Math.max(200000,(overall-58)*100000),contractYears:1,goals:0,assists:0,games:0,pim:0,shots:0,morale:70,happiness:70,fatigue:0,form:0,transferListed:false,research:{version:SWISS_DATABASE.version,checked:SWISS_DATABASE.checked,club:name,birth:row.birth,position:row.position,registration:'Ej angivet',source:row.source,stats:JSON.parse(JSON.stringify(row.stats)),swiss:true}};
 });
}
function swissPrepareCareer(s,name){
 if(!swissClub(name))return;
 s.world={version:1,mode:'CH_NL',membership:Object.fromEntries(SWISS_DATABASE.clubs.map(c=>[c.name,'CH_NL'])),tables:null,cups:null,movement:null,history:[],selected:'CH_NL',appliedYear:null};
 s.clubRosters=Object.fromEntries(SWISS_DATABASE.clubs.map(c=>[c.name,swissRoster(c.name)]));
 s.teams=SWISS_DATABASE.clubs.map(c=>({name:c.name,strength:77,style:'balanced',gp:0,w:0,l:0,otw:0,otl:0,pts:0,gf:0,ga:0}));
 s.schedule=createSchedule(s.world.membership);s.playerDatabaseVersion=SWISS_DATABASE.version;
}
function swissRoundDate(round,year){
 const start=`${year}-09-15`,end=`${year+1}-03-01`;
 return round<=52?calAdd(start,Math.round((round-1)*calGap(start,end)/51)):calAdd(end,3+(round-53)*2);
}
function swissRulesText(){return 'National League: 14 klubbar, 52 matcher. Lag 1–6 går direkt till kvartsfinal. 7–8 och 9–10 möts över två matcher på sammanlagda mål; förloraren i 7–8 möter vinnaren i 9–10 om sista platsen. Kvartsfinal, semifinal och final spelas i bäst av sju. Denna betakarriär omfattar endast högstaligan: ingen nedflyttning till Swiss League. Spelschema, kontrakt, ekonomi och transferfönster är spelantaganden; belopp visas i SEK. Importlicenser simuleras inte eftersom registreringsunderlag saknas.';}
function swissAddPlayIn(stage,a,b){
 const names=[a,b].sort((x,y)=>seasonRank(x)-seasonRank(y));
 state.season.series.push({id:`${state.season.year}-CH_NL-${stage}-${state.season.series.length}`,league:'CH_NL',stage,high:names[0],low:names[1],winsHigh:0,winsLow:0,bestOf:2,aggregate:true,games:[],winner:null});
}
function swissStartPlayoffs(){
 const w=state.world,rows=JSON.parse(JSON.stringify(leagueTable('CH_NL')));w.tables={CH_NL:rows};w.cups={CH_NL:{stage:'playin',champion:null}};
 swissAddPlayIn('playin',rows[6].name,rows[7].name);swissAddPlayIn('playin',rows[8].name,rows[9].name);
 state.season.stage='playin';schedulePlayoffDay();return true;
}
function swissAdvanceCups(){
 const w=state.world,cup=w.cups.CH_NL,current=state.season.series.filter(s=>s.stage===cup.stage);
 if(current.length&&current.every(s=>s.winner)){
  if(cup.stage==='playin'){
   cup.firstQualifier=current[0].winner;
   swissAddPlayIn('playinFinal',current[0].winner===current[0].high?current[0].low:current[0].high,current[1].winner);cup.stage='playinFinal';
  }else if(cup.stage==='playinFinal'){
   addSeries('quarter',[...w.tables.CH_NL.slice(0,6).map(t=>t.name),cup.firstQualifier,current[0].winner],'CH_NL');cup.stage='quarter';
  }else if(cup.stage==='final'){
   cup.champion=current[0].winner;state.season.champion=cup.champion;closeSeason();return true;
  }else{const next=cup.stage==='quarter'?'semi':'final';addSeries(next,current.map(s=>s.winner),'CH_NL');cup.stage=next;}
 }
 state.season.stage=cup.stage;schedulePlayoffDay();return true;
}
function aggregateSeries(game){return game?.seriesId?state.season?.series?.find(s=>s.id===game.seriesId&&s.aggregate):null;}
function aggregateOffset(game){
 const s=aggregateSeries(game);if(!s)return 0;
 return s.games.reduce((n,g)=>n+(g.home===game.home?g.homeGoals-g.awayGoals:g.awayGoals-g.homeGoals),0);
}
function aggregateNeedsOvertime(game,h,a){const s=aggregateSeries(game);return s?s.games.length===1&&h-a+aggregateOffset(game)===0:h===a;}
function liveNeedsOvertime(){const g=currentSeasonFixture(),m=state.live;return aggregateNeedsOvertime(g,g?.home===managerClub()?m.hv:m.opp,g?.home===managerClub()?m.opp:m.hv);}
function aggregateRecord(game,h,a){
 const s=aggregateSeries(game);if(!s||game.played||s.winner||s.games.length>=2)return false;
 if(s.games.length===1&&aggregateNeedsOvertime(game,h,a))return false;
 Object.assign(game,{played:true,homeGoals:h,awayGoals:a});s.games.push({home:game.home,away:game.away,homeGoals:h,awayGoals:a});
 s.winsHigh=s.games.reduce((n,g)=>n+(g.home===s.high?g.homeGoals:g.awayGoals),0);s.winsLow=s.games.reduce((n,g)=>n+(g.home===s.low?g.homeGoals:g.awayGoals),0);
 if(s.games.length===2)s.winner=s.winsHigh>s.winsLow?s.high:s.low;
 return true;
}
function seriesFormat(s){return s.aggregate?'Sammanlagda mål · två matcher':`Bäst av ${s.bestOf}`;}
