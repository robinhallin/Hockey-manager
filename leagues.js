"use strict";
// Club names follow the published 2026/27 opening round. Resources remain game estimates.
const ALLSVENSKAN_CLUBS=[
 ['AIK','AIK','Stockholm',75,4,4400,'#e7ce67'],['Almtuna IS','AIS','Uppsala',66,12,1600,'#cf8094'],['BIK Karlskoga','BIK','Karlskoga',73,6,2700,'#8dbbea'],['IK Oskarshamn','IKO','Oskarshamn',71,6,2900,'#8bc4e6'],['Kalmar HC','KHC','Kalmar',72,6,2500,'#e99888'],['Leksands IF','LIF','Leksand',76,4,5900,'#abcbe9'],['MoDo Hockey','MODO','Örnsköldsvik',75,4,5200,'#df9290'],['Mora IK','MIK','Mora',71,6,3000,'#ce937d'],['Nybro Vikings','NIF','Nybro',68,10,2300,'#d99985'],['Södertälje SK','SSK','Södertälje',74,4,3900,'#daca89'],['Vimmerby HC','VHC','Vimmerby',65,12,1500,'#ded085'],['Visby/Roma','VR','Visby',65,12,1400,'#b7c9b0'],['Västerås IK','VIK','Västerås',69,10,3100,'#e1d18a'],['Östersunds IK','ÖIK','Östersund',66,12,1700,'#93c79e']
];
const LEAGUE_NAMES={SHL:'SHL',HA:'Hockeyallsvenskan'};
function registerLeagueClubs(){
 for(const [name,code,city,strength,place,fans,color] of ALLSVENSKAN_CLUBS){
  CLUB_DATA[name]={name,strength,style:'balanced',reputation:strength,budget:6000000,wageBudget:18000000,fans,boardExpectation:place<=4?'Utmana om avancemang':place<=6?'Slutspel':'Bygg en stabil klubb'};
  CAREER_CLUBS[name]={code,city,color,group:place<=4?'title':place<=6?'playoff':'build',title:place<=4?'Vägen tillbaka till toppen.':'Bygg för nästa steg.',pitch:place<=4?'Vi vill utmana om avancemang. Bygg ett lag som klarar både pressen och ekonomin.':'Ge talangerna en väg framåt. Vi vill se en hållbar klubb och ett lag som växer tillsammans.',cash:place<=4?9000000:place<=6?6000000:4000000,place,youth:2,economy:place>6};
 }
}
function leagueInitial(){return Object.fromEntries([...TEAM_DATA.map(t=>[t[0],'SHL']),...ALLSVENSKAN_CLUBS.map(t=>[t[0],'HA'])]);}
function leagueOf(name=managerClub()){return state?.world?.membership?.[name]||(ALLSVENSKAN_CLUBS.some(c=>c[0]===name)?'HA':'SHL');}
function leagueName(name=managerClub()){return LEAGUE_NAMES[leagueOf(name)];}
function leagueTeamRows(){return [...TEAM_DATA,...ALLSVENSKAN_CLUBS.map(c=>[c[0],c[3],'balanced'])];}
function leagueTable(id=leagueOf()){return state.teams.filter(t=>leagueOf(t.name)===id).slice().sort((a,b)=>b.pts-a.pts||(b.gf-b.ga)-(a.gf-a.ga));}
function leagueRoster(name,strength){return haRealRoster(name);}
function leagueFictionalRoster(name,strength){
 const first=['Albin','Erik','Oscar','Emil','Viktor','Noah','Axel','Simon','Anton','Elias','Hugo','Filip','Leo','Olle'];
 const last=['Lind','Sjöberg','Berg','Holm','Lund','Nyström','Ek','Dahl','Sund','Strand','Hall','Björk','Fors','Wallin'];
 return Array.from({length:24},(_,i)=>{
  const seed=k=>attrSeed(`ha:${name}:${i}:${k}`),rating=strength-5+Math.floor(seed('rating')*10),age=18+Math.floor(seed('age')*17),pos=i<2?'MV':i<10?'B':['C','VF','HF'][(i-10)%3];
  const p={id:`ha-${name}-${i}`,name:`${first[i%14]} ${last[(i*3+Math.floor(seed('name')*14))%14]}`,fictional:true,club:name,pos,age,nationality:'SWE',overall:rating,potential:rating+(age<24?8:2),shooting:rating,passing:rating,defense:rating,physical:rating,salary:Math.round((180000+(rating-59)*30000)/10000)*10000,value:Math.max(200000,(rating-58)*100000),contractYears:1+i%3,goals:0,assists:0,games:0,pim:0,shots:0,morale:70,happiness:70,fatigue:0,transferListed:false};
  ensurePlayerAttributes(p);return p;
 });
}
function ensureLeagues(){
 if(!state.careerStarted||state.world)return;
 state.world={version:1,membership:leagueInitial(),tables:null,cups:null,movement:null,history:[],selected:leagueOf(),appliedYear:null};
 for(const [name,,,strength] of ALLSVENSKAN_CLUBS){
  if(!state.clubRosters[name])state.clubRosters[name]=state.playerDatabaseVersion?leagueRoster(name,strength):leagueFictionalRoster(name,strength);
  if(state.recruitment&&!state.recruitment.ai[name])state.recruitment.ai[name]={cash:6000000,wageLimit:Math.round(state.clubRosters[name].reduce((n,p)=>n+p.salary,0)*1.3),year:clubYear()};
  if(!team(name))state.teams.push({name,strength,style:'balanced',gp:0,w:0,l:0,otw:0,otl:0,pts:0,gf:0,ga:0});
 }
 const extra=createSchedule(state.world.membership).filter(g=>leagueOf(g.home)==='HA');
 // Catch up only the newly introduced background league, never replay the user's matches.
 const current=state.round,late=state.season?.phase!=='regular';
 for(const g of extra){if(state.schedule.some(x=>x.round===g.round&&x.home===g.home&&x.away===g.away))continue;state.schedule.push(g);if(late||g.round<current)leagueBackground(g);}
 state.world.selected=leagueOf();
 state.world.legacyCup=late;
}
function leagueBackground(g){
 if(g.played)return;const a=team(g.home),b=team(g.away);if(!a||!b)return;
 const roll=k=>attrSeed(`${state.season?.year||2026}:${g.round}:${g.home}:${k}`),delta=(a.strength-b.strength)/25;
 let h=Math.max(0,Math.floor(roll('h')*5+delta)),v=Math.max(0,Math.floor(roll('v')*5-delta)),ot=h===v;if(ot){if(roll('ot')<.53)h++;else v++;}
 Object.assign(g,{played:true,homeGoals:h,awayGoals:v});a.gp++;b.gp++;a.gf+=h;a.ga+=v;b.gf+=v;b.ga+=h;
 const win=h>v?a:b,lose=h>v?b:a;if(ot){win.otw++;lose.otl++;win.pts+=2;lose.pts++;}else{win.w++;lose.l++;win.pts+=3;}
}
function leagueStartPlayoffs(){
 const w=state.world;if(!w||w.legacyCup)return false;
 w.tables={SHL:JSON.parse(JSON.stringify(leagueTable('SHL'))),HA:JSON.parse(JSON.stringify(leagueTable('HA')))};
 w.cups={SHL:{stage:'playin',champion:null},HA:{stage:'playin',champion:null}};w.movement=null;
 for(const id of ['SHL','HA'])addSeries('playin',w.tables[id].slice(6,10).map(t=>t.name),id);
 addSeries('playout',w.tables.SHL.slice(12,14).map(t=>t.name),'SHL');
 state.season.stage='playin';schedulePlayoffDay();return true;
}
function leagueAdvanceCups(){
 const w=state.world;if(!w?.cups)return false;
 for(const id of ['SHL','HA']){
  const cup=w.cups[id];if(cup.champion)continue;
  const current=state.season.series.filter(s=>s.league===id&&s.stage===cup.stage);
  if(!current.length||current.some(s=>!s.winner))continue;
  const winners=current.map(s=>s.winner);
  if(cup.stage==='final'){cup.champion=winners[0];continue;}
  const next=cup.stage==='playin'?'quarter':cup.stage==='quarter'?'semi':'final';
  addSeries(next,cup.stage==='playin'?[...w.tables[id].slice(0,6).map(t=>t.name),...winners]:winners,id);cup.stage=next;
 }
 state.season.stage=w.cups[leagueOf()].stage;
 const out=state.season.series.find(s=>s.stage==='playout');
 if(w.cups.SHL.champion&&w.cups.HA.champion&&out?.winner){
  w.movement={year:clubYear(),up:w.cups.HA.champion,down:out.winner===out.high?out.low:out.high,shlChampion:w.cups.SHL.champion};
  state.season.champion=w.cups[leagueOf()].champion;closeSeason();
 }else schedulePlayoffDay();
 return true;
}
function leagueApplyMovement(){
 const w=state.world,m=w?.movement;if(!m||w.appliedYear===m.year)return;w.appliedYear=m.year;
 w.membership[m.up]='SHL';w.membership[m.down]='HA';w.history.unshift({...m});w.history=w.history.slice(0,30);
 for(const [name,up] of [[m.up,true],[m.down,false]]){
  const factor=up?1.5:.7,ai=state.recruitment?.ai[name];if(ai){ai.wageLimit=Math.round(ai.wageLimit*factor);ai.cash=Math.round(ai.cash*(up?1.2:.85));}
  const stored=state.managerCareer?.bank[name];if(stored?.clubOffice)stored.clubOffice.sponsor=Math.round(stored.clubOffice.sponsor*(up?1.7:.55));
  const reactions=[];
  for(const p of state.clubRosters[name]){
   const ambitious=p.social?.ambition>=14||attrSeed(`${p.id}:ambition`)>.7;
   p.happiness=trainingClamp((p.happiness||70)+(up?8:ambitious?-18:-8),20,100);
   if(up&&p.leagueRequest){delete p.leagueRequest;p.transferListed=false;}
   if(!up&&ambitious){p.transferListed=true;p.leagueRequest={year:clubYear(),reason:'Vill spela på högre nivå efter nedflyttningen'};reactions.push(p.name);}
  }
  if(name===managerClub()){
   state.season.nextWageLimit=Math.round(state.season.nextWageLimit*factor);
   state.clubOffice.sponsor=Math.round(state.clubOffice.sponsor*(up?1.7:.55));state.clubOffice.operations=up?9000000:5000000;
   state.clubOffice.staffLimit=up?3200000:2600000;
   state.fans=Math.round(state.fans*(up?1.15:.85));
   managerMessage(`movement:${m.year}`,up?'Vi spelar i SHL nästa säsong!':'Vi får börja om i Hockeyallsvenskan',`${up?'Avancemanget ger större intäkter och löneutrymme.':'Intäkter och löneutrymme minskar. Befintliga löner gäller fortfarande.'} ${reactions.length?`${reactions.join(', ')} vill söka sig vidare och har satts på transferlistan. Du bestämmer om inkommande bud accepteras.`:''}`,'Ligabyte',{link:'leagues'});
  }
 }
}
function leagueCareerOffer(offer,name,rosters){
 const membership=state?.careerStarted&&rosters===state.clubRosters?leagueOf(name):ALLSVENSKAN_CLUBS.some(c=>c[0]===name)?'HA':'SHL';
 if(membership==='SHL'&&ALLSVENSKAN_CLUBS.some(c=>c[0]===name))return {...offer,group:'build',place:12,title:'Etablera oss på nästa nivå.',youth:2};
 if(membership==='HA'&&TEAM_DATA.some(c=>c[0]===name))return {...offer,group:'title',place:4,title:'Bygg vägen tillbaka.',youth:2};
 return offer;
}
function leagueReset(){if(!state.world)return;state.world.tables=null;state.world.cups=null;state.world.movement=null;state.world.legacyCup=false;state.world.selected=leagueOf();}
function leagueSelect(id){if(!Object.hasOwn(LEAGUE_NAMES,id))return;state.world.selected=id;state.page='leagues';save();render();}
function leaguesView(){
 const w=state.world,id=w.selected||leagueOf(),rows=w.tables?.[id]||leagueTable(id),series=state.season.series.filter(s=>(s.league||leagueOf(s.high))===id);
 return `<section class="league-page"><header class="daily-heading"><div><span class="career-eyebrow">SVENSK HOCKEY · ${seasonLabel()}</span><h1>Två ligor. Nästa nivå.</h1><p>Följ tabellerna, avancemanget och kampen om att stanna kvar.</p></div></header><div class="club-tabs">${Object.entries(LEAGUE_NAMES).map(([key,label])=>`<button class="btn ${id===key?'':'secondary'}" onclick="leagueSelect('${key}')">${label}</button>`).join('')}</div><section class="club-panel"><h2>${LEAGUE_NAMES[id]}</h2>${state.season.phase==='preseason'?`<p>Sluttabell från ${seasonLabel(clubYear()-1)}. Nästa säsongs ligatillhörighet gäller efter ligabytet.</p>`:''}<p>14 lag · 52 matcher per lag. ${id==='SHL'?'Lag 13–14 spelar kval i bäst av sju. Förloraren flyttas ned.':'Slutspelsvinnaren går upp till SHL. Nedflyttning till Hockeyettan ingår inte i denna tvåligavärld.'}</p><div class="league-table">${rows.map((t,i)=>`<div class="${t.name===managerClub()?'league-own':''}"><b>${i+1}</b><span>${careerBadge(t.name)} ${t.name}</span><span>${t.gp} M</span><strong>${t.pts} P</strong></div>`).join('')}</div></section><section class="club-panel"><h2>Slutspel ${id==='SHL'?'& kval':'mot SHL'}</h2><div class="league-series">${series.map(s=>`<article><span>${SEASON_STAGES[s.stage]}</span><h3>${s.high} <b>${s.winsHigh}–${s.winsLow}</b> ${s.low}</h3><p>${s.winner?`${s.winner} vinner serien`:`Bäst av ${s.bestOf}`}</p></article>`).join('')||'<p>Slutspelsträdet öppnas efter grundserien.</p>'}</div>${w.movement?`<p class="league-result"><strong>${w.movement.up}</strong> går upp. <strong>${w.movement.down}</strong> flyttas ned när försäsongen börjar.</p>`:''}</section><section class="club-panel"><h2>Ligabyten genom åren</h2>${w.history.map(h=>`<div class="row"><span>${seasonLabel(h.year)}</span><strong>↑ ${h.up} · ↓ ${h.down}</strong></div>`).join('')||'<p>Första ligabytet avgörs efter en fullständig säsong i tvåligavärlden.</p>'}</section><p>${state.playerDatabaseVersion?'Allsvenskans starttrupper har riktiga spelare, kontrollerade 2026-09-05. Attribut, budgetar och klubbmål är spelbedömningar.':'Din sparade spelvärld behålls. Starta en ny karriär från huvudmenyn för de verkliga allsvenska starttrupperna 2026/27.'} Spelbara ligor: SHL och Hockeyallsvenskan. ${w.legacyCup?'Din pågående gamla slutspelssäsong avslutas enligt det tidigare upplägget; båda ligornas slutspel och ligabyten startar nästa säsong.':''}</p></section>`;
}
