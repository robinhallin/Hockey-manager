"use strict";
// International identity and U20 competition are independent of club registration.
const INT_NATIONS={SWE:'Sverige',CAN:'Kanada',USA:'USA',FIN:'Finland',CZE:'Tjeckien',SVK:'Slovakien',SUI:'Schweiz',GER:'Tyskland',LAT:'Lettland',NOR:'Norge'};
const INT_NAMES={
 SWE:[['Albin','Elias','Hugo','Noel','Axel','Viktor'],['Berg','Lind','Sund','Ekström','Dahl','Forsberg']],
 CAN:[['Owen','Noah','Liam','Ethan','Logan','Nathan'],['Campbell','Wilson','Roy','Martin','Tremblay','Clarke']],
 USA:[['Jack','Cole','Ryan','Luke','Dylan','Tyler'],['Miller','Johnson','Hayes','Walker','Reed','Brooks']],
 FIN:[['Eero','Oskari','Aleksi','Ville','Mikko','Antti'],['Laakso','Koskinen','Salonen','Rantala','Aalto','Kivinen']],
 CZE:[['Jakub','Jan','Tomas','Adam','Pavel','Lukas'],['Novak','Svoboda','Dvorak','Prochazka','Kral','Vesely']],
 SVK:[['Matej','Martin','Filip','Samuel','Michal','Peter'],['Kovac','Horvath','Varga','Benco','Toth','Urban']],
 SUI:[['Luca','Nico','Jan','Noah','Lars','Joel'],['Meier','Keller','Frei','Huber','Graf','Moser']],
 GER:[['Leon','Moritz','Lukas','Felix','Paul','Max'],['Weber','Fischer','Koch','Braun','Wagner','Wolf']],
 LAT:[['Janis','Rihards','Roberts','Arturs','Gustavs','Emils'],['Ozols','Berzins','Kalnins','Liepa','Liepins','Vitols']],
 NOR:[['Mathias','Emil','Sander','Oliver','Henrik','Tobias'],['Hansen','Olsen','Larsen','Berg','Nilsen','Dahl']]
};
function internationalAway(p,date=state.calendar?.date){const d=p?.internationalDuty;return Boolean(d&&!d.returned&&date>=d.from&&date<d.until);}
function internationalFit(p){return Boolean(p&&!p.health?.injury&&(p.fatigue||0)<80);}
function internationalPlayers(){
 const rows=[...Object.entries(state.clubRosters||{}).flatMap(([club,ps])=>ps.map(p=>({p,club}))),...(state.juniors?.roster||[]).map(p=>({p,club:managerClub()})),...Object.entries(state.clubAI?.clubs||{}).flatMap(([club,c])=>(club===managerClub()?[]:c.academy?.roster||[]).map(p=>({p,club}))),...(state.playerWorld?.freeAgents||[]).map(p=>({p,club:WORLD_FREE})),...(state.international?.pool||[]).map(p=>({p,club:'Internationell juniorpool'}))];
 return [...new Map(rows.map(r=>[String(r.p.id),r])).values()];
}
function internationalIdentity(p){
 if(p.internationalIdentity)return p.internationalIdentity;
 const birth=p.research?.birth||p.birth,known=/^\d{4}-\d{2}-\d{2}$/.test(birth||'');
 const nation={SE:'SWE',FI:'FIN',CA:'CAN',US:'USA',CZ:'CZE',SK:'SVK',CH:'SUI',DE:'GER',LV:'LAT',NO:'NOR'}[p.nationality]||p.nationality;
 return {nation,birthYear:known?Number(birth.slice(0,4)):state.season.year-Number(p.age),estimated:!known};
}
function internationalEligible(p,year){const i=internationalIdentity(p);return Boolean(INT_NATIONS[i.nation]&&Number.isFinite(i.birthYear)&&i.birthYear>=year-20&&i.birthYear<=year-16);}
function internationalMakePlayer(nation,pos,index,year,age=16){
 const id=`int-${nation}-${year}-${index}`,r=k=>attrSeed(id+':'+k),names=INT_NAMES[nation];
 const p={id,name:names[0][Math.floor(r('first')*names[0].length)]+' '+names[1][Math.floor(r('last')*names[1].length)],nationality:nation,pos,age,fictional:true,club:'Internationell juniorpool',internationalOrigin:true,internationalIdentity:{nation,birthYear:year-age,estimated:false},fatigue:0,morale:65,happiness:65,goals:0,assists:0,games:0,shots:0,pim:0,salary:350000,contractYears:0,value:500000,overall:65,potential:80,attributeGrowth:2+r('growth')*4,health:{load:0,injury:null,clearance:'rest'}};
 ensurePlayerAttributes(p);const base={CAN:9,USA:9,SWE:8,FIN:8,CZE:8,SVK:7,SUI:7,GER:7,LAT:6,NOR:6}[nation];
 for(const key of Object.keys(p.attributes))p.attributes[key]=Math.round(Math.min(16,base+r(key)*4+(age-16)*.45));
 p.trainingBaseline={...p.attributes};return p;
}
function ensureInternational(){
 if(!state.careerStarted||!state.season||!state.calendar)return null;
 const year=state.season.year;
 if(!state.international)state.international={version:1,year,pool:[],archive:[],nextId:1,selected:'SWE',lastDay:null,created:state.calendar.date,tournament:null};
 const w=state.international;
 if(w.year!==year){
  if(w.tournament)w.archive.unshift({year:w.tournament.year,medals:w.tournament.medals||[],skipped:w.tournament.skipped,results:w.tournament.games.filter(g=>g.played).map(({date,home,away,hg,ag,stage})=>({date,home,away,hg,ag,stage}))});
  w.archive=w.archive.slice(0,6);w.tournament=null;
  const elapsed=Math.max(0,year-w.year);w.year=year;
  for(const p of w.pool){p.age+=elapsed;for(const key of Object.keys(p.attributes))p.attributes[key]=Math.min(18,p.attributes[key]+Math.min(elapsed,3)*.25);}
  const leaving=w.pool.filter(p=>p.age>20);w.pool=w.pool.filter(p=>p.age<=20);
  for(const p of leaving){if(p.age>24)continue;p.club=WORLD_FREE;p.previousClub='Internationell juniorpool';p.freeSince=year;if(!worldIsFree(p.id))state.playerWorld.freeAgents.push(p);}
 }
 for(const nation of Object.keys(INT_NATIONS))for(const [pos,count] of [['MV',4],['B',10],['C',6],['VF',6],['HF',6]]){
  const n=w.pool.filter(p=>p.nationality===nation&&p.pos===pos).length;
  for(let i=n;i<count;i++)w.pool.push(internationalMakePlayer(nation,pos,w.nextId++,year,w.created===state.calendar.date?16+(i%4):16));
 }
 // Anchor estimated birth years once, so transfers and season birthdays cannot change eligibility.
 for(const {p} of internationalPlayers())if(!p.internationalIdentity)p.internationalIdentity=internationalIdentity(p);
 if(!w.tournament)w.tournament={year:year+1,status:'upcoming',skipped:state.calendar.date>`${year}-12-15`,announced:false,departed:false,returned:false,rosters:{},games:[],groups:[],reports:[],medals:[]};
 return w;
}
function internationalScore(p,role='balanced'){
 const a=p.attributes||{},avg=keys=>keys.reduce((n,k)=>n+(a[k]||8),0)/keys.length;
 const ability=p.pos==='MV'?avg(['reflexes','positioning','reboundControl','composure']):role==='defense'?avg(['positioning','decisions','checking','discipline']):role==='creator'?avg(['passing','vision','decisions','puckControl']):role==='scorer'?avg(['shooting','skating','composure','puckControl']):avg(['skating','positioning','decisions','workRate']);
 const games=p.games||p.academy?.games||0,points=p.games?(p.goals||0)+(p.assists||0):(p.academy?.goals||0)+(p.academy?.assists||0);
 const form=p.pos==='MV'?Math.max(-.4,Math.min(.4,(p.aiForm||0)*.04)):Math.min(.6,games>=3?points/games*.3:0);
 return ability+form-Math.max(0,(p.fatigue||0)-30)*.025;
}
function internationalCandidates(nation){return internationalPlayers().filter(({p})=>internationalEligible(p,state.international.tournament.year)&&internationalIdentity(p).nation===nation);}
function internationalSelect(){
 const w=ensureInternational(),t=w?.tournament;if(!t||t.skipped||t.announced)return;
 t.announced=true;t.status='selected';
 for(const nation of Object.keys(INT_NATIONS)){
  const pool=internationalCandidates(nation).filter(({p})=>internationalFit(p)),chosen=[];
  const take=(count,filter,role)=>{const rows=pool.filter(r=>filter(r.p)&&!chosen.some(c=>samePlayerId(c.id,r.p.id))).sort((a,b)=>internationalScore(b.p,role)-internationalScore(a.p,role)||String(a.p.id).localeCompare(String(b.p.id))).slice(0,count);for(const {p,club} of rows)chosen.push({id:p.id,name:p.name,club,pos:p.pos,fictional:Boolean(p.fictional),role,score:internationalScore(p,role),reason:role==='defense'?'Positionering, beslut och defensivt ansvar':role==='creator'?'Passningar, spelsinne och puckkontroll':role==='scorer'?'Avslut, skridskoåkning och kyla':'Rollbalans, nuvarande förmåga och belastning',games:0,seconds:0,goals:0,assists:0,shots:0,saves:0,against:0,injured:false});};
  take(3,p=>p.pos==='MV','balanced');take(4,p=>p.pos==='B','defense');take(4,p=>p.pos==='B','creator');take(4,p=>p.pos==='C','balanced');take(5,p=>!['MV','B'].includes(p.pos),'scorer');take(5,p=>!['MV','B'].includes(p.pos),'creator');
  t.rosters[nation]=chosen;
 }
 const own=Object.entries(t.rosters).flatMap(([nation,rs])=>rs.filter(r=>r.club===managerClub()).map(r=>`${r.name} (${INT_NATIONS[nation]})`));
 managerMessage(`jvm:${t.year}:selection`,own.length?'JVM-uttagningen: '+own.length+' från din klubb':'JVM-trupperna är uttagna',`${own.join(', ')||'Ingen spelare från din klubb togs ut denna gång.'}\nSamling 20 december, återkomst 6 januari. Uttagningen väger nuvarande egenskaper, position, registrerad produktion och belastning. Se konkurrensen och planera ersättare.`,'Landslagsbevakningen',{link:'international'});
}
function internationalSchedule(t){
 const order=[...new Set([...(state.international.archive[0]?.medals||[]),...Object.keys(INT_NATIONS)])];
 t.groups=[[order[0],order[3],order[4],order[7],order[8]],[order[1],order[2],order[5],order[6],order[9]]];
 const dates=['12-26','12-27','12-29','12-30','12-31'];
 t.groups.forEach((group,gi)=>{let list=[...group,null];for(let round=0;round<5;round++){
  for(let i=0;i<3;i++){const a=list[i],b=list[5-i];if(a&&b)t.games.push({id:`${t.year}:group:${gi}:${round}:${i}`,date:`${t.year-1}-${dates[round]}`,home:round%2?a:b,away:round%2?b:a,stage:'Gruppspel',group:gi,played:false});}
  list=[list[0],list.at(-1),...list.slice(1,-1)];
 }});
 t.games.sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id));
}
function internationalDepart(){
 const w=state.international,t=w.tournament;if(!t.announced||t.departed)return;
 const map=new Map(internationalPlayers().map(r=>[String(r.p.id),r]));
 for(const [nation,roster] of Object.entries(t.rosters))for(let i=0;i<roster.length;i++){
  let entry=roster[i],p=map.get(String(entry.id))?.p;
  if(!internationalFit(p)){
   const reserve=internationalCandidates(nation).filter(r=>internationalFit(r.p)&&worldGroup(r.p)===(entry.pos==='MV'?'MV':entry.pos==='B'?'B':'F')&&!roster.some(e=>samePlayerId(e.id,r.p.id))).sort((a,b)=>internationalScore(b.p,entry.role)-internationalScore(a.p,entry.role))[0];
   if(reserve){entry=roster[i]={...entry,id:reserve.p.id,name:reserve.p.name,club:reserve.club,pos:reserve.p.pos,fictional:Boolean(reserve.p.fictional),reason:'Reserv inkallad efter medicinskt återbud',score:internationalScore(reserve.p,entry.role)};p=reserve.p;}else{entry.withdrawn=true;continue;}
  }
  p.internationalDuty={year:t.year,nation,from:`${t.year-1}-12-20`,until:`${t.year}-01-06`,returned:false};
 }
 t.departed=true;t.status='camp';internationalSchedule(t);repairMedicalLines();ensureSpecialTeams();
 const own=internationalPlayers().filter(({p,club})=>club===managerClub()&&internationalAway(p));
 managerMessage(`jvm:${t.year}:depart`,'JVM-samlingen börjar',`${own.map(r=>r.p.name).join(', ')||'Ingen spelare från din klubb'} är på landslagsuppdrag. Uttagna spelare deltar inte i klubbträning eller klubblagsmatcher. Ordinarie kontrakt och klubbtillhörighet består. Se över kedjor och special teams.`,'Landslagsbevakningen',{link:'international'});
}
function internationalStandings(t,group){
 const rows=group.map(nation=>({nation,gp:0,pts:0,gf:0,ga:0})),by=Object.fromEntries(rows.map(r=>[r.nation,r]));
 for(const g of t.games.filter(g=>g.played&&g.stage==='Gruppspel'&&by[g.home]&&by[g.away])){const a=by[g.home],b=by[g.away];a.gp++;b.gp++;a.gf+=g.hg;a.ga+=g.ag;b.gf+=g.ag;b.ga+=g.hg;const winner=g.hg>g.ag?a:b,loser=winner===a?b:a;winner.pts+=g.overtime||g.shootout?2:3;if(g.overtime||g.shootout)loser.pts++;}
 return rows.sort((a,b)=>b.pts-a.pts||(b.gf-b.ga)-(a.gf-a.ga)||b.gf-a.gf||a.nation.localeCompare(b.nation));
}
function internationalPlay(g){
 const w=state.international,t=w.tournament;if(g.played)return;
 const map=new Map(internationalPlayers().map(r=>[String(r.p.id),r.p]));let seed=Math.floor(attrSeed(g.id)*4294967296);const roll=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const teams=[g.home,g.away].map(nation=>{
  const entries=t.rosters[nation].filter(r=>!r.withdrawn&&internationalFit(map.get(String(r.id)))).sort((a,b)=>internationalScore(map.get(String(b.id)),b.role)-internationalScore(map.get(String(a.id)),a.role)||String(a.id).localeCompare(String(b.id)));
  const keeper=entries.find(r=>r.pos==='MV'),skaters=[...entries.filter(r=>r.pos==='B').slice(0,6),...entries.filter(r=>!['MV','B'].includes(r.pos)).slice(0,12)];
  const players=[...(keeper?[keeper]:[]),...skaters].map(e=>({id:e.id,name:e.name,pos:e.pos,seconds:0,goals:0,assists:0,shots:0,saves:0,against:0}));
  if(keeper)players[0].seconds=3600;
  for(const [group,budget] of [['B',7200],['F',10800]]){
   const ps=players.filter(r=>group==='B'?r.pos==='B':!['B','MV'].includes(r.pos));
   const weight=r=>{const p=map.get(String(r.id)),entry=entries.find(e=>samePlayerId(e.id,r.id));return Math.max(.65,Math.min(1.4,1+(internationalScore(p,entry.role)-10)*.08-(p.fatigue||0)*.002));};
   let remaining=budget,active=ps.slice();
   while(remaining>0&&active.length){const total=active.reduce((n,r)=>n+weight(r),0),share=remaining;for(const r of active){const grant=Math.min(3600-r.seconds,remaining,Math.max(1,Math.floor(share*weight(r)/total)));r.seconds+=grant;remaining-=grant;}active=active.filter(r=>r.seconds<3600);}
  }
  return {nation,players,keeper,attack:skaters.length?skaters.reduce((n,e)=>n+internationalScore(map.get(String(e.id)),e.role),0)/skaters.length:5};
 });
 g.players=teams.map(team=>team.players);g.events=[];g.injuries=[];g.hg=0;g.ag=0;g.shots=[0,0];
 if(teams.some(team=>!team.keeper||team.players.filter(p=>p.pos==='B').length<2||team.players.filter(p=>!['B','MV'].includes(p.pos)).length<3)){g.administrative=true;g.hg=teams[0].players.length>=teams[1].players.length?5:0;g.ag=g.hg?0:5;g.played=true;g.players=[[],[]];return;}
 const attempt=(side,time)=>{const team=teams[side],other=teams[1-side],skaters=team.players.filter(p=>p.pos!=='MV'),weights=skaters.map(p=>p.seconds*(map.get(String(p.id)).attributes.shooting||8));let pick=roll()*weights.reduce((a,b)=>a+b,0),shooter=skaters.at(-1);for(let i=0;i<weights.length;i++){pick-=weights[i];if(pick<=0){shooter=skaters[i];break;}}
  g.shots[side]++;shooter.shots++;const keeper=other.players.find(p=>p.pos==='MV'),keeperP=map.get(String(keeper.id));
  const chance=Math.max(.045,Math.min(.17,.085+(team.attack-internationalScore(keeperP))*.009));
  if(roll()<chance){shooter.goals++;keeper.against++;if(side===0)g.hg++;else g.ag++;
   const assists=skaters.filter(p=>p!==shooter);const selected=[];for(let n=0;n<(roll()<.7?2:1)&&assists.length;n++){const i=Math.floor(roll()*assists.length);selected.push(assists.splice(i,1)[0]);}selected.forEach(p=>p.assists++);
   g.events.push({time,side,scorer:shooter.name,scorerId:shooter.id,assists:selected.map(p=>p.name)});return true;
  }keeper.saves++;return false;
 };
 for(let side=0;side<2;side++){const count=Math.max(15,Math.min(45,Math.round(27+(teams[side].attack-teams[1-side].attack)*2+(roll()-.5)*12)));for(let i=0;i<count;i++)attempt(side,Math.floor((i+roll())*3600/count));}
 if(g.hg===g.ag){g.overtime=true;const extra=g.stage==='Gruppspel'?300:600;let elapsed=extra,goal=false;for(let n=0;n<12&&!goal;n++){const time=Math.floor((n+1)*extra/12);goal=attempt(n%2,3600+time);if(goal)elapsed=time;}
  for(const team of teams){const ps=team.players.filter(p=>p.pos!=='MV');ps.forEach((p,i)=>p.seconds+=Math.floor(elapsed*3/ps.length)+(i<(elapsed*3)%ps.length?1:0));team.players.find(p=>p.pos==='MV').seconds+=elapsed;}
  if(!goal){g.shootout=true;if(roll()<.5)g.hg++;else g.ag++;}
 }
 g.events.sort((a,b)=>a.time-b.time);g.played=true;
 for(let side=0;side<2;side++)for(const row of g.players[side]){const entry=t.rosters[teams[side].nation].find(e=>samePlayerId(e.id,row.id)),p=map.get(String(row.id));entry.games++;for(const k of ['seconds','goals','assists','shots','saves','against'])entry[k]+=row[k];
  p.fatigue=Math.min(95,(p.fatigue||0)+row.seconds/60*(p.pos==='MV'?.35:.85));p.health.load=Math.min(100,(p.health.load||0)+row.seconds/600);
  if(roll()<.001+(p.fatigue||0)*.00004){const days=3+Math.floor(roll()*5);p.health.injury={name:'Kontusionsskada',remaining:days,initial:days,readiness:55,source:'JVM'};p.health.clearance='rest';entry.injured=true;g.injuries.push({id:p.id,name:p.name,days});}
 }
 const own=g.players.flat().filter(r=>internationalPlayers().some(x=>samePlayerId(x.p.id,r.id)&&x.club===managerClub()));
 if(own.length)managerMessage(`jvm:${g.id}`,`${INT_NATIONS[g.home]} ${g.hg}–${g.ag} ${INT_NATIONS[g.away]}`,`${g.stage}${g.shootout?' · straffavgörande':g.overtime?' · förlängning':''}\n${own.map(r=>`${r.name}: ${Math.round(r.seconds/60)} min, ${r.goals}+${r.assists}`).join('\n')}\nFölj turneringen och spelarnas belastning i landslagsrummet.`,'Landslagsbevakningen',{link:'international'});
}
function internationalBracket(){
 const t=state.international.tournament,add=(id,date,home,away,stage)=>t.games.push({id:t.year+':'+id,date:t.year+'-'+date,home,away,stage,played:false});
 if(!t.quarters&&t.games.filter(g=>g.stage==='Gruppspel').length===20&&t.games.filter(g=>g.stage==='Gruppspel').every(g=>g.played)){
  t.quarters=true;const [a,b]=t.groups.map(group=>internationalStandings(t,group));for(let i=0;i<4;i++)add('q'+i,'01-02',a[i].nation,b[3-i].nation,'Kvartsfinal');add('placement','01-02',a[4].nation,b[4].nation,'Plats 9–10');
 }
 const q=t.games.filter(g=>g.stage==='Kvartsfinal'),winner=g=>g.hg>g.ag?g.home:g.away,loser=g=>g.hg>g.ag?g.away:g.home;
 if(!t.semis&&q.length===4&&q.every(g=>g.played)){t.semis=true;add('s0','01-04',winner(q[0]),winner(q[3]),'Semifinal');add('s1','01-04',winner(q[1]),winner(q[2]),'Semifinal');}
 const s=t.games.filter(g=>g.stage==='Semifinal');if(!t.finals&&s.length===2&&s.every(g=>g.played)){t.finals=true;add('bronze','01-05',loser(s[0]),loser(s[1]),'Bronsmatch');add('gold','01-05',winner(s[0]),winner(s[1]),'Final');}
 const gold=t.games.find(g=>g.stage==='Final'&&g.played),bronze=t.games.find(g=>g.stage==='Bronsmatch'&&g.played);if(gold&&bronze){t.medals=[winner(gold),loser(gold),winner(bronze)];t.status='finished';}
}
function internationalReturn(){
 const t=state.international.tournament;if(!t.departed||t.returned)return;t.returned=true;
 for(const {p,club} of internationalPlayers())if(p.internationalDuty?.year===t.year&&!p.internationalDuty.returned){
  p.internationalDuty.returned=true;const nation=p.internationalDuty.nation,e=t.rosters[nation]?.find(e=>samePlayerId(e.id,p.id));if(!e)continue;
  const medal=t.medals.indexOf(nation),record={year:t.year,nation,games:e.games,seconds:e.seconds,goals:e.goals,assists:e.assists,medal:medal<0?null:['Guld','Silver','Brons'][medal],club,returnDate:state.calendar.date,fatigue:p.fatigue,injured:Boolean(p.health?.injury)};
  p.internationalHistory=[record,...(p.internationalHistory||[])].slice(0,8);
  if(e.games>0)p.morale=Math.min(100,(p.morale||65)+(medal===0?2:1));
  if(club===managerClub())managerMessage(`jvm:${t.year}:return:${p.id}`,`${p.name} är tillbaka från JVM`,`${INT_NATIONS[nation]}${record.medal?' · '+record.medal:''}. ${e.games} matcher, ${Math.round(e.seconds/60)} minuter och ${e.goals}+${e.assists}.\nOrk ${Math.round(100-p.fatigue)} %. ${record.injured?'Medicinsk uppföljning behövs.':'Bedöm återhämtning och rollen i klubblaget.'} Landslagsuppdraget ger ingen automatisk attributökning.`,'Landslagsbevakningen',{link:'international',playerId:p.id});
 }
 repairMedicalLines();
}
function internationalPrepare(){
 if(state.live&&!state.live.finished)return;
 const w=ensureInternational(),t=w?.tournament,date=state.calendar?.date;if(!t||t.skipped)return;
 if(date>=`${t.year-1}-12-15`&&!t.announced)internationalSelect();
 if(date>=`${t.year-1}-12-20`&&!t.departed)internationalDepart();
 if(date>=`${t.year}-01-06`&&t.departed)internationalReturn();
}
function internationalProcess(date=state.calendar?.date){
 const w=ensureInternational();if(!w||date!==state.calendar.date||w.lastDay===date||state.live&&!state.live.finished)return;
 internationalPrepare();w.lastDay=date;const t=w.tournament;if(t.skipped||!t.departed||t.returned)return;
 for(const {p} of internationalPlayers())if(internationalAway(p,date)){
  p.fatigue=Math.max(0,(p.fatigue||0)-8);p.health??={load:0,injury:null,clearance:'rest'};p.health.load=(p.health.load||0)*.8;
  if(p.health.injury){if(p.health.injury.remaining>0)p.health.injury.remaining--;else{p.health.injury.readiness=Math.min(100,(p.health.injury.readiness||55)+15);if(p.health.injury.readiness===100)p.health.injury=null;}}
 }
 for(const g of t.games.filter(g=>!g.played&&g.date===date))internationalPlay(g);
 internationalBracket();if(t.games.some(g=>g.played)&&!t.medals.length)t.status='playing';
}
function internationalRecovery(id){
 const p=managerRoster().find(p=>samePlayerId(p.id,id)),r=p?.internationalHistory?.[0];
 if(!p||!r||r.club!==managerClub()||r.returnDate>state.calendar.date||calGap(r.returnDate,state.calendar.date)>7||internationalAway(p)||state.live&&!state.live.finished||r.followup)return;
 r.followup='recovery';setIndividualLoad(id,'rest');setTrainingReturn(id,3);
}
function internationalProfile(p){
 const duty=p.internationalDuty,history=p.internationalHistory||[];if(!duty&&!history.length)return '';
 return `<section class="mw-panel"><h2>Landslagskarriär</h2>${internationalAway(p)?`<p>På JVM-uppdrag med ${INT_NATIONS[duty.nation]} till ${calText(calAdd(duty.until,-1))}. Tillbaka ${calText(duty.until)}.</p>`:''}${history.map(r=>`<p>JVM ${r.year} · ${INT_NATIONS[r.nation]} · ${r.games} matcher · ${Math.round(r.seconds/60)} minuter · ${r.goals}+${r.assists}${r.medal?' · '+r.medal:''}</p>`).join('')}<button class="btn secondary" onclick="deskNavigate('international')">Följ landslaget</button></section>`;
}
function internationalView(){
 const w=ensureInternational(),t=w.tournament,nation=INT_NATIONS[w.selected]?w.selected:'SWE',safe=trainingSafe,entries=t.rosters[nation]||[];
 const own=internationalPlayers().filter(r=>r.club===managerClub()&&(internationalEligible(r.p,t.year)||r.p.internationalHistory?.[0]?.year===t.year));
 const stat=(r)=>`${r.games} matcher · ${Math.round(r.seconds/60)} min · ${r.goals}+${r.assists}`;
 return `<section class="matches-workspace international-page"><header class="mw-heading"><div><span class="desk-kicker">INTERNATIONELL SPELARVÄRLD</span><h1>Landslag & JVM ${t.year}</h1><p>Uttagning 15 december · samling 20 december · matcher 26 december–5 januari · återkomst 6 januari</p></div><label>Landslag<select onchange="state.international.selected=this.value;save();render()">${Object.entries(INT_NATIONS).map(([k,v])=>`<option value="${k}" ${k===nation?'selected':''}>${v}</option>`).join('')}</select></label></header>
 <section class="mw-panel"><h2>Talangerna i din klubb</h2>${t.skipped?'<p>Den här sparningen började bevaka JVM efter uttagningsdatumet. Ingen turnering eller frånvaro skapas i efterhand. Nästa säsong följs från början.</p>':''}${own.map(({p})=>{const d=p.internationalDuty,e=Object.values(t.rosters).flat().find(e=>samePlayerId(e.id,p.id)),r=p.internationalHistory?.[0];return `<details class="international-candidate"${e?' open':''}><summary>${safe(p.name)} · ${INT_NATIONS[internationalIdentity(p).nation]||safe(p.nationality||'')} · ${p.pos}${internationalAway(p)?' · På JVM':e?' · Uttagen':''}</summary><p>${internationalAway(p)?'På landslagsuppdrag':e?.withdrawn?'Återbud':e?'Uttagen':t.announced?'Utanför truppen':'Aktuell åldersklass · uttagningen är öppen'} · ${p.pos} · ${Math.round(100-p.fatigue)} % ork${internationalIdentity(p).estimated?' · födelseår uppskattat från sparad ålder':''}</p>${e?`<p>${safe(e.reason)}. ${stat(e)}.</p>`:'<p>Nuvarande egenskaper, position, konkurrens och registrerad form vägs samman. Potential garanterar ingen plats.</p>'}${r?.year===t.year?`<p>Hemma igen: ${stat(r)}${r.medal?' · '+r.medal:''}.</p>${isOwnPlayer(p)&&!r.followup&&calGap(r.returnDate,state.calendar.date)<=7?`<button class="btn secondary" onclick="internationalRecovery('${safe(String(p.id))}')">Ersätt träningsplanen med tre dagars vila</button>`:''}`:''}</details>`;}).join('')||'<p>Ingen spelare i aktuell JVM-årskull i din klubb.</p>'}<button class="btn secondary" onclick="deskNavigate('lines')">Planera ersättare i kedjorna</button> <button class="btn secondary" onclick="deskNavigate('training')">Bedöm träning och återhämtning</button></section>
 ${t.medals.length?`<section class="mw-result"><h2>${INT_NATIONS[t.medals[0]]} vinner JVM</h2><p>Silver: ${INT_NATIONS[t.medals[1]]} · Brons: ${INT_NATIONS[t.medals[2]]}</p></section>`:''}
 <section class="mw-panel"><h2>${INT_NATIONS[nation]} · ${entries.length?entries.length+' uttagna':'Uttagningen återstår'}</h2><div class="mw-scroll"><table><thead><tr><th>Spelare</th><th>Position</th><th>Klubb / bakgrund</th><th>Matcher</th><th>Minuter</th><th>Mål</th><th>Assist</th></tr></thead><tbody>${entries.map(e=>`<tr><th>${safe(e.name)}${e.withdrawn?' · återbud':''}${e.fictional?' · fiktiv':''}</th><td>${e.pos}</td><td>${safe(e.club)}</td><td>${e.games}</td><td>${Math.round(e.seconds/60)}</td><td>${e.goals}</td><td>${e.assists}</td></tr>`).join('')}</tbody></table></div></section>
 ${t.groups.map((group,i)=>`<section class="mw-panel"><h2>Grupp ${i?'B':'A'}</h2><table><thead><tr><th>Lag</th><th>Matcher</th><th>Poäng</th><th>Mål</th></tr></thead><tbody>${internationalStandings(t,group).map(r=>`<tr><th>${INT_NATIONS[r.nation]}</th><td>${r.gp}</td><td>${r.pts}</td><td>${r.gf}–${r.ga}</td></tr>`).join('')}</tbody></table></section>`).join('')}
 <section class="mw-panel"><h2>Matcher & rapporter</h2>${t.games.map(g=>`<details><summary>${calText(g.date)} · ${g.stage} · ${INT_NATIONS[g.home]} ${g.played?g.hg+'–'+g.ag:'–'} ${INT_NATIONS[g.away]}${g.shootout?' · straffar':g.overtime?' · förlängning':''}</summary>${g.played?`<p>${g.administrative?'Administrativt resultat: otillräcklig matchtrupp.':`Skott på mål ${g.shots[0]}–${g.shots[1]}. ${(g.injuries||[]).length?'Skador: '+g.injuries.map(p=>safe(p.name)).join(', ')+'. ':''}Straffavgörandet ingår inte i spelarpoängen.`}</p>${(g.players||[]).map((ps,i)=>`<h3>${INT_NATIONS[i?g.away:g.home]}</h3>${ps.map(r=>`<p>${safe(r.name)}: ${Math.round(r.seconds/60)} min · ${r.goals}+${r.assists}${r.pos==='MV'?' · '+r.saves+' räddningar':''}</p>`).join('')}`).join('')}`:'<p>Rapporten skapas när matchdagen avslutas.</p>'}</details>`).join('')||'<p>Spelschemat publiceras vid samlingen.</p>'}</section>
 <details class="mw-panel"><summary>Spelvärldens omfattning och uttagningsunderlag</summary><p>Detta är din karriärs simulerade JVM med tio landslag. Grupper, matchdagar, åldersgränser (födelseår ${t.year-20}–${t.year-16}) och skiljeregler är spelmodellens upplägg, inte en verifierad kopia av det officiella årets turnering. Lika grupppoäng skiljs på målskillnad, gjorda mål och landskod. Plats 9–10 avgörs utan divisionsbyte i denna etapp.</p><p>Befintliga spelaridentiteter återanvänds. Övriga landslag kompletteras från en uttryckligen fiktiv internationell juniorpool. Poolen åldras och spelare över 20 går vidare till den vanliga kontraktslösa marknaden. NHL, draft, AHL, europeiska ligasäsonger och seniorlandslag är nästa etapper.</p><p>Matchrapporterna kommer från en separat sammanfattad landslagssimulering med spelarattribut, målvakter, roller, belastning, skador och registrerade händelser. Klubbens poängliga och matchmotor ändras inte av landslagsstatistiken.</p><p>${internationalCandidates(nation).length} kandidater i ${INT_NATIONS[nation]} inom den bevakade spelarvärlden. Uttagningen prioriterar rollbalans och nuvarande spelstyrka; okända födelsedatum markeras som uppskattade.</p></details>
 ${w.archive.length?`<section class="mw-panel"><h2>Tidigare turneringar</h2>${w.archive.map(a=>`<p>JVM ${a.year}: ${a.medals?.length?INT_NATIONS[a.medals[0]]+' · guld':'Ingen komplett turnering registrerad'}</p>`).join('')}</section>`:''}</section>`;
}

function internationalCalendar(){
 const t=state.international?.tournament;if(!t||t.skipped)return '';
 const own=internationalPlayers().filter(({p,club})=>club===managerClub()&&internationalAway(p));
 const next=t.games.filter(g=>!g.played&&g.date>=state.calendar.date).sort((a,b)=>a.date.localeCompare(b.date))[0];
 return `<section class="mw-panel"><h2>JVM ${t.year} · landslagsbevakning</h2><p>${own.length?own.map(r=>trainingSafe(r.p.name)).join(', ')+' är på landslagsuppdrag. Återkomst 6 januari.':t.returned?'Landslagsspelarna är hemma. Följ upp belastning och roll.':'Uttagning 15 december · samling 20 december.'}${next?' Nästa turneringsdag: '+calText(next.date)+'.':''}</p><button class="btn secondary" onclick="deskNavigate('international')">Följ talangerna och JVM</button></section>`;
}
