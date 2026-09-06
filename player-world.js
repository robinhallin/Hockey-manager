"use strict";
// Career simulation rules, not predictions about the real people in the database.
const WORLD_FREE='Kontraktslös';
// Public profiles and departure notices checked 2026-09-06; no registered 2026/27 club found.
// A database snapshot, not a guarantee that an unannounced real-world agreement does not exist.
const WORLD_START_FREE=[
 {id:'ep-10051',name:'Daniel Brodin',birth:'1990-02-09',position:'RW',nationality:'SWE',height:186,weight:85,shoots:'R',previousClub:'Björklöven',source:'https://www.eliteprospects.com/player/10051/daniel-brodin',departure:'https://www.bjorkloven.com/article/6j3atjc-2e4ad/view',stats:[{season:'25-26',team:'Djurgårdens IF',league:'SHL',gp:24,goals:1,assists:0,pim:0},{season:'25-26',team:'IF Björklöven',league:'HockeyAllsvenskan',gp:17,goals:1,assists:3,pim:14},{season:'24-25',team:'Djurgårdens IF',league:'HockeyAllsvenskan',gp:38,goals:5,assists:6,pim:45}]},
 {id:'ep-142238',name:'Oliver Kylington',birth:'1997-05-19',position:'D',nationality:'SWE',height:183,weight:83,shoots:'L',previousClub:'Djurgårdens IF',source:'https://www.eliteprospects.com/player/142238/oliver-kylington',departure:'https://www.difhockey.se/article/eoyatcg-1lead/view',stats:[{season:'25-26',team:'Djurgårdens IF',league:'SHL',gp:25,goals:2,assists:6,pim:10},{season:'24-25',team:'Colorado Avalanche',league:'NHL',gp:13,goals:1,assists:3,pim:4},{season:'24-25',team:'Anaheim Ducks',league:'NHL',gp:6,goals:0,assists:1,pim:4}]},
 {id:'ep-43555',name:'Oula Palve',birth:'1992-02-19',position:'C',nationality:'FIN',height:183,weight:83,shoots:'L',previousClub:'Djurgårdens IF',source:'https://www.eliteprospects.com/player/43555/oula-palve',departure:'https://www.difhockey.se/article/eoyatcg-1lead/view',stats:[{season:'25-26',team:'Djurgårdens IF',league:'SHL',gp:18,goals:3,assists:7,pim:12},{season:'25-26',team:'EHC Kloten',league:'NL',gp:16,goals:1,assists:4,pim:6},{season:'24-25',team:'HC Ajoie',league:'NL',gp:32,goals:2,assists:17,pim:10},{season:'24-25',team:'Genève-Servette HC',league:'NL',gp:9,goals:1,assists:5,pim:8}]},
 {id:'ep-155712',name:'Collin Delia',birth:'1994-06-20',position:'G',nationality:'USA',height:188,weight:91,shoots:'L',previousClub:'Kalmar HC',source:'https://www.eliteprospects.com/player/155712/collin-delia',departure:'https://www.instagram.com/p/DXMYka7iIzA/',stats:[{season:'25-26',team:'Brynäs IF',league:'SHL',gp:6,sv:.791,gaa:3.87},{season:'25-26',team:'Kalmar HC',league:'HockeyAllsvenskan',gp:2,sv:.932,gaa:1.50},{season:'24-25',team:'Bakersfield Condors',league:'AHL',gp:28,sv:.906,gaa:2.76}]}
];
function worldStartingFree(){return WORLD_START_FREE.map(row=>{const p=haPlayer({...row,registration:'Kontraktslös'},row.previousClub);Object.assign(p,{club:WORLD_FREE,previousClub:row.previousClub,contractYears:0,freeSince:2026});p.research.checked='2026-09-06';p.research.departure=row.departure;p.research.freeSnapshot=true;return p;});}
function ensurePlayerWorld(){
 if(!state.careerStarted)return;
 if(!state.playerWorld){
  const employed=new Set(Object.values(state.clubRosters).flat().map(p=>String(p.id)));
  const pools=[...(state.seedFreeAgents?worldStartingFree():[]),...(state.season?.freeAgents||[]),...Object.values(state.managerCareer?.bank||{}).flatMap(c=>c.freeAgents||[])];
  const unique=new Map(pools.filter(p=>!employed.has(String(p.id))).map(p=>[String(p.id),p]));
  state.playerWorld={version:1,year:state.season.year,freeAgents:[...unique.values()],events:[],summaries:[],nextId:1};
  for(const p of state.playerWorld.freeAgents){p.club=WORLD_FREE;p.contractYears=0;p.freeSince=state.season.year;}
  for(const c of Object.values(state.managerCareer?.bank||{}))delete c.freeAgents;
 }
 delete state.seedFreeAgents;state.season.freeAgents=state.playerWorld.freeAgents;
}
function worldIsFree(id){return Boolean(state.playerWorld?.freeAgents.some(p=>samePlayerId(p.id,id)));}
function worldGroup(p){return p.pos==='MV'?'MV':p.pos==='B'?'B':'F';}
function worldLog(type,p,club,reason){
 const w=state.playerWorld;if(w.countYear===state.season.year)w.counts[type]=(w.counts[type]||0)+1;w.events.unshift({year:state.season.year,type,id:p.id,name:p.name,pos:p.pos,age:p.age,club,reason});w.events=w.events.slice(0,700);
}
function worldRemoveFree(id){const w=state.playerWorld;w.freeAgents=w.freeAgents.filter(p=>!samePlayerId(p.id,id));state.season.freeAgents=w.freeAgents;}
function worldRelease(p,club,reason){
 ensurePlayerWorld();if(worldIsFree(p.id))return;
 p.club=WORLD_FREE;p.contractYears=0;p.freeSince=state.season.year;p.previousClub=club;p.transferListed=false;delete p.recruitmentPromise;
 state.playerWorld.freeAgents.push(p);worldLog('release',p,club,reason);
}
function worldRetires(p){
 const start=p.pos==='MV'?38:36;
 if(p.age<start)return false;
 return p.age>=44||attrSeed(`${p.id}:${state.season.year}:retirement`)<Math.min(.85,.08+(p.age-start)*.12);
}
function worldRetire(p,club,type='retire'){
 worldLog(type,p,club,type==='retire'?'Avslutar spelarkarriären':'Tre säsonger utan avtal – lämnar den bevakade marknaden');
 for(const d of state.recruitment.deals)if(samePlayerId(d.playerId,p.id)&&['pending','future_signed'].includes(d.status)){d.status='rejected';d.reason='Spelaren har lämnat marknaden.';}
 state.recruitment.incoming.forEach(o=>{if(samePlayerId(o.playerId,p.id)&&o.status==='pending')o.status='expired';});
 if(club===managerClub()){
  state.season.departures.push(p.name);
  managerMessage(`retire:${state.season.year}:${p.id}`,`${p.name} avslutar karriären`,'Spelaren lämnar truppen vid säsongsskiftet. Se över kedjor och rekryteringsbehov. Beslutet gäller denna spelkarriär.','Spelarvärlden',{link:'transfers'});
 }
}
function worldAIContracts(club){
 const roster=state.clubRosters[club],budget=state.recruitment.ai[club];if(!roster||!budget)return;
 const retained=roster.filter(p=>p.contractYears>0);let wage=retained.reduce((n,p)=>n+p.salary,0);
 const candidates=roster.filter(p=>p.contractYears<=0).sort((a,b)=>matchAttributeRating(b)-matchAttributeRating(a));
 for(const p of candidates){
  const peers=retained.filter(q=>worldGroup(q)===worldGroup(p)),target={MV:2,B:7,F:13}[worldGroup(p)];
  const desired=Math.round(p.salary*(p.age>=33?.88:p.age<25?1.08:1)/10000)*10000;
  const useful=peers.length<target||(p.age<=23&&retained.length<25);
  const seeksChange=peers.length>=({MV:2,B:6,F:12}[worldGroup(p)])&&attrSeed(`${p.id}:${state.season.year}:move`)<.18;
  if(useful&&!seeksChange&&wage+desired<=budget.wageLimit){
   p.salary=Math.max(150000,desired);p.contractYears=p.age>=33?1:p.age<=23?3:2;wage+=p.salary;retained.push(p);
   worldLog('renew',p,club,`${p.contractYears} års avtal · behov på positionen och utrymme i lönebudgeten`);
  }else worldRelease(p,club,seeksChange?'Spelaren söker en ny utmaning':!useful?'Klubben prioriterar andra spelare på positionen':'Lönekraven ryms inte i klubbens budget');
 }
 state.clubRosters[club]=retained;
}
function worldProspect(club,pos){
 const w=state.playerWorld,id=`world-${state.season.year}-${w.nextId++}`,country=recruitCountry(club),roll=k=>attrSeed(`${id}:${club}:${k}`);
 const names={SWE:[['Albin','Hugo','Elias','Olle','Viktor','Noel','Axel','Arvid'],['Berg','Lindholm','Nyström','Sund','Ek','Dahl','Strand','Fors']],FIN:[['Eero','Mikko','Ville','Antti','Oskari','Aleksi'],['Koskela','Laakso','Salonen','Kivinen','Aalto','Rantala']],SUI:[['Luca','Noah','Nico','Jan'],['Keller','Meier','Frei','Huber']],GER:[['Leon','Moritz','Felix','Lukas'],['Weber','Fischer','Koch','Braun']]};
 const [first,last]=names[country]||names.SWE;
 const p={id,name:`${first[Math.floor(roll('first')*first.length)]} ${last[Math.floor(roll('last')*last.length)]}`,pos,club,age:18+Math.floor(roll('age')*3),fictional:true,nationality:country,salary:250000,contractYears:3,value:500000,overall:65,potential:80,goals:0,assists:0,shots:0,pim:0,games:0,fatigue:0,morale:70,happiness:70,squadRole:'Breddspelare',promisedRole:'Breddspelare',transferListed:false,worldOrigin:{club,year:state.season.year}};
 ensurePlayerAttributes(p);const base=leagueOf(club)==='HA'?7:8;
 for(const key of Object.keys(p.attributes))p.attributes[key]=Math.round(base+roll(key)*5);
 p.attributeGrowth=2+roll('growth')*4;p.trainingBaseline={...p.attributes};
 return p;
}
function worldFillClub(club){
 const roster=state.clubRosters[club],budget=state.recruitment.ai[club];if(!roster||!budget)return;
 for(const [group,target] of Object.entries({MV:2,B:6,F:12}))while(roster.filter(p=>worldGroup(p)===group).length<target){
  const wage=roster.reduce((n,p)=>n+p.salary,0);
  const options=state.playerWorld.freeAgents.filter(p=>worldGroup(p)===group&&p.previousClub!==club&&!state.recruitment.deals.some(d=>samePlayerId(d.playerId,p.id)&&d.status==='pending'));
  options.sort((a,b)=>matchAttributeRating(b)-matchAttributeRating(a));
  const candidate=options.find(p=>wage+recruitPlayerWishes(p,club).salary<=budget.wageLimit);
  if(candidate){const wishes=recruitPlayerWishes(candidate,club);if(transferRecruitPlayer(candidate,WORLD_FREE,club,0,wishes.salary,Math.min(2,wishes.maxYears),wishes.role))continue;}
  const pos=group==='F'?['C','VF','HF'][roster.filter(p=>worldGroup(p)==='F').length%3]:group;
  const p=worldProspect(club,pos);roster.push(p);worldLog('intake',p,club,'Fiktiv akademispelare får chansen när seniortruppen saknar täckning');
  // Academy registration preserves a playable squad even for a financially troubled AI club.
 }
}
function playerWorldNewYear(){
 ensurePlayerWorld();const w=state.playerWorld,year=state.season.year;if(w.year>=year)return;
 w.year=year;w.countYear=year;w.counts={};
 // Club-roster ages were advanced by beginPreseason; free agents need their own step.
 for(const p of [...w.freeAgents]){p.age++;if(worldRetires(p)||year-p.freeSince>=3){worldRetire(p,WORLD_FREE,worldRetires(p)?'retire':'exit');worldRemoveFree(p.id);}}
 for(const [club,roster] of Object.entries(state.clubRosters)){
  state.clubRosters[club]=roster.filter(p=>{if(!worldRetires(p))return true;worldRetire(p,club);return false;});
  // AI player development now accrues through actual calendar days and appearances.

 }
 calendarActivateFuture();
 // All clubs decide before any replacement hiring, so the shared pool is available to everyone.
 for(const club of Object.keys(state.recruitment.ai))worldAIContracts(club);
 for(const club of Object.keys(state.recruitment.ai)){
  worldFillClub(club);
  const roster=state.clubRosters[club];
  for(let i=0;i<2;i++){
   const pos=['MV','B','C','VF','HF'][Math.floor(attrSeed(`${club}:${year}:${i}:intake`)*5)],p=worldProspect(club,pos);
   if(roster.length<26&&roster.reduce((n,p)=>n+p.salary,0)+p.salary<=state.recruitment.ai[club].wageLimit){roster.push(p);worldLog('intake',p,club,'Fiktiv talang får sitt första senioravtal');}
   else {worldRelease(p,club,'Fiktiv akademitalang söker sitt första senioravtal');}
  }
 }
 for(const t of state.teams){const ps=state.clubRosters[t.name];if(ps?.length)t.strength=Math.round(ps.reduce((n,p)=>n+matchAttributeRating(p),0)/ps.length);}
 syncManagerRoster();state.lines=null;state.specialTeams=null;
 const summary={year,retired:w.counts.retire||0,released:w.counts.release||0,renewed:w.counts.renew||0,intake:w.counts.intake||0,free:w.freeAgents.length};
 w.summaries.unshift(summary);w.summaries=w.summaries.slice(0,20);
 managerMessage(`world:${year}`,'Spelarvärlden inför nästa säsong',`${summary.retired} pensioneringar, ${summary.released} släppta spelare och ${summary.intake} nya seniorer. ${summary.free} spelare söker kontrakt. Se Kontraktslösa och Spelarvärlden under Rekrytering.`,'Sportchefen',{link:'transfers'});
}
function worldFreeView(){
 ensurePlayerWorld();const f=recruitFilters(),players=recruitCandidates({...f,maxFee:0}).filter(p=>worldIsFree(p.id));
 return `<section><h2>Kontraktslösa</h2><p>Förhandla direkt med spelaren. Ingen övergångssumma, men lön, roll och konkurrerande erbjudanden avgör. Aktuella sökfilter gäller även här. Nya karriärer börjar med fyra verkliga namn från det kontrollerade starturvalet 6 september 2026.</p><p><a href="FREE_AGENT_RESEARCH.md" target="_blank" rel="noopener noreferrer">Starturval & källor</a></p><button class="btn secondary" onclick="recruitTab('search')">Ändra sökfilter</button>${recruitPlayerRows(players.slice(0,60))}${players.length>60?'<p>Visar 60 spelare. Begränsa sökningen för att hitta fler.</p>':''}</section>`;
}
function worldEventFilter(value){if(!['all','retire','release','renew','intake','exit'].includes(value))return;state.playerWorld.filter=value;save();render();}
function playerWorldView(){
 ensurePlayerWorld();const w=state.playerWorld,filter=w.filter||'all',labels={retire:'Avslutar karriären',release:'Söker kontrakt',renew:'Förlänger',intake:'Ny talang',exit:'Lämnar marknaden'};
 return `<section><h2>Spelarvärlden</h2><p>Vid säsongsskiftet tar klubbarna ställning till utgående avtal. Veteraner kan avsluta karriären och fiktiva talanger kommer fram. Besluten är händelser i din karriär, inte verkliga nyheter.</p><div class="recruit-finances">${w.summaries.slice(0,3).map(s=>`<div><span>${seasonLabel(s.year)}</span><strong>${s.retired} pensioneringar</strong><span>${s.renewed} förlängningar · ${s.intake} nya seniorer</span></div>`).join('')}</div><label>Visa händelser <select onchange="worldEventFilter(this.value)">${recruitOptions({all:'Alla händelser',...labels},filter)}</select></label>${w.events.filter(e=>filter==='all'||e.type===filter).slice(0,100).map(e=>`<article class="recruit-history"><div><strong>${trainingSafe(e.name)}</strong><span>${e.pos} · ${e.age} år · ${seasonLabel(e.year)}</span></div><p>${trainingSafe(e.club)}<br>${trainingSafe(e.reason)}</p><b>${labels[e.type]}</b></article>`).join('')||'<p>Inga händelser att visa. Årskrönikan fylls på vid säsongsskiftet.</p>'}</section>`;
}
