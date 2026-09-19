"use strict";
// Real club/division names; schedules, untracked depth and competitive strengths are game models.
const NAS_DIVISIONS={NHL:{Atlantic:['Boston Bruins','Buffalo Sabres','Detroit Red Wings','Florida Panthers','Montréal Canadiens','Ottawa Senators','Tampa Bay Lightning','Toronto Maple Leafs'],Metropolitan:['Carolina Hurricanes','Columbus Blue Jackets','New Jersey Devils','New York Islanders','New York Rangers','Philadelphia Flyers','Pittsburgh Penguins','Washington Capitals'],Central:['Chicago Blackhawks','Colorado Avalanche','Dallas Stars','Minnesota Wild','Nashville Predators','St. Louis Blues','Utah Mammoth','Winnipeg Jets'],Pacific:['Anaheim Ducks','Calgary Flames','Edmonton Oilers','Los Angeles Kings','San Jose Sharks','Seattle Kraken','Vancouver Canucks','Vegas Golden Knights']},AHL:{Atlantic:['Charlotte Checkers','Hartford Wolf Pack','Hershey Bears','Lehigh Valley Phantoms','Providence Bruins','Springfield Thunderbirds','Wilkes-Barre/Scranton Penguins'],North:['Belleville Senators','Cleveland Monsters','Hamilton Hammers','Laval Rocket','Rochester Americans','Syracuse Crunch','Toronto Marlies','Utica Comets'],Central:['Chicago Wolves','Grand Rapids Griffins','Iowa Wild','Manitoba Moose','Milwaukee Admirals','Rockford IceHogs','Texas Stars'],Pacific:['Abbotsford Canucks','Bakersfield Condors','Calgary Wranglers','Coachella Valley Firebirds','Colorado Eagles','Henderson Silver Knights','Ontario Reign','San Diego Gulls','San Jose Barracuda','Tucson Roadrunners']}};
const nasUI={league:'NHL',tab:'table',division:'all',club:'all',stage:'regular',year:'current',game:null};
let nasArchiveCache=null;
const NAS_FIELDS=['games','seconds','goals','assists','shots','saves','against'];
function nasClubs(league){return Object.values(NAS_DIVISIONS[league]).flat();}
function nasDivision(league,club){return Object.keys(NAS_DIVISIONS[league]).find(d=>NAS_DIVISIONS[league][d].includes(club));}
function nasConference(league,club){return ['Central','Pacific'].includes(nasDivision(league,club))?'West':'East';}
function nasRoundRobin(clubs){const a=[...clubs],rounds=[];for(let r=0;r<a.length-1;r++){const pairs=[];for(let i=0;i<a.length/2;i++)pairs.push((r+i)%2?[a[a.length-1-i],a[i]]:[a[i],a[a.length-1-i]]);rounds.push(pairs);a.splice(1,0,a.pop());}return rounds;}
function nasSchedule(league,year){
 const clubs=nasClubs(league),rounds=[],reverse=rs=>rs.map(ps=>ps.map(([h,a])=>[a,h]));
 if(league==='NHL'){
  const all=nasRoundRobin(clubs);rounds.push(...all,...reverse(all));
  const divisions=Object.values(NAS_DIVISIONS.NHL).map(nasRoundRobin),extra=Array.from({length:7},(_,i)=>divisions.flatMap(d=>d[i]));rounds.push(...extra,...reverse(extra));
  const ds=Object.values(NAS_DIVISIONS.NHL);for(let r=0;r<8;r++)rounds.push([0,2].flatMap(d=>ds[d].map((h,i)=>r%2?[ds[d+1][(i+r)%8],h]:[h,ds[d+1][(i+r)%8]])));
 }else{
  // Geographic preference with balanced reverse fixtures: 36 home and 36 away, no missing teams.
  const met={},first=[];for(let r=0;r<36;r++){const left=[...clubs].sort((a,b)=>attrSeed(`${year}:${r}:${a}`)-attrSeed(`${year}:${r}:${b}`)),pairs=[];
   while(left.length){const h=left.shift(),score=a=>{const k=[h,a].sort().join('|'),target=nasDivision(league,h)===nasDivision(league,a)?5:nasConference(league,h)===nasConference(league,a)?1.6:.18;return (met[k]||0)/target+attrSeed(`${year}:${r}:${k}`)*.4;};left.sort((a,b)=>score(a)-score(b));const a=left.shift(),k=[h,a].sort().join('|');met[k]=(met[k]||0)+1;pairs.push([h,a]);}first.push(pairs);
  }rounds.push(...first,...reverse(first));
 }
 const order=rounds.map((pairs,i)=>({pairs,key:attrSeed(`${league}:${year}:round:${i}`)})).sort((a,b)=>a.key-b.key),games=[];
 order.forEach(({pairs},round)=>{const date=calAdd(`${year}-10-01`,Math.round(round*195/(order.length-1)));pairs.forEach(([home,away],i)=>games.push({id:`${league}:${year}:r${round+1}:${i}`,date,home,away,stage:'regular',played:false}));});return games;
}
function nasNewSeason(year){return {year,leagues:Object.fromEntries(['NHL','AHL'].map(league=>[league,{games:nasSchedule(league,year),series:[],rows:{},phase:'regular',round:0,champion:null,seeds:{},byes:{}}]))};}
function ensureNASeasons(){
 if(!state.northAmerica||!state.calendar)return null;
 if(!state.naLeagues){const year=state.season.year+(state.calendar.date>`${state.season.year}-10-01`?1:0);state.naLeagues={version:1,season:nasNewSeason(year),history:[],lastDate:state.calendar.date,created:state.calendar.date};}
 return state.naLeagues;
}
function nasTable(l,league,division='all'){
 const rows=nasClubs(league).map(club=>({club,gp:0,w:0,l:0,otl:0,rw:0,row:0,pts:0,gf:0,ga:0})),map=Object.fromEntries(rows.map(r=>[r.club,r]));
 for(const g of l.games)if(g.played&&g.stage==='regular'){const a=map[g.home],b=map[g.away];a.gp++;b.gp++;a.gf+=g.hg;a.ga+=g.ag;b.gf+=g.ag;b.ga+=g.hg;const winner=g.hg>g.ag?a:b,loser=winner===a?b:a;winner.w++;winner.pts+=2;if(!g.overtime)winner.rw++;if(!g.shootout)winner.row++;if(g.overtime){loser.otl++;loser.pts++;}else loser.l++;}
 return rows.filter(r=>division==='all'||nasDivision(league,r.club)===division).sort((a,b)=>b.pts-a.pts||b.rw-a.rw||b.row-a.row||b.w-a.w||(b.gf-b.ga)-(a.gf-a.ga)||b.gf-a.gf||a.club.localeCompare(b.club));
}
function nasDepth(league,club,year){return (league==='NHL'?15.2:12.1)+(attrSeed(`${club}:depth`)-.5)*2+(attrSeed(`${club}:${year}:cycle`)-.5)*.8;}
function nasLineup(league,club,date,year){
 const base=nasDepth(league,club,year),actual=(state.northAmerica?.abroad||[]).filter(p=>naActive(p)&&naLocation(p)===club&&p.naContract.assignment===league&&p.naContract.start<date&&(!p.naAvailableFrom||p.naAvailableFrom<=date)&&p.naContract.end>=date&&!internationalAway(p,date)&&medicalReady(p)&&p.naLastGame!==date&&(p.fatigue||0)<80);
 const group=p=>worldGroup(p),out=[];
 for(const [pos,count,depth] of [['MV',1,2],['B',6,8],['F',12,14]]){
  const candidates=actual.filter(p=>group(p)===pos).map(p=>({p,score:internationalScore(p,pos==='B'?'creator':'balanced')}));
  for(let i=0;i<depth;i++)candidates.push({p:null,score:base+.8-i*(pos==='MV'?.7:.16),slot:i});
  candidates.sort((a,b)=>b.score-a.score||String(a.p?.id??a.slot).localeCompare(String(b.p?.id??b.slot)));
  candidates.slice(0,count).forEach((q,i)=>{const attrs=q.p?{...q.p.attributes}:Object.fromEntries([...MatchWorld2.KEYS,'reflexes','reboundControl','movement','composure'].map(k=>[k,q.score]));
   if(q.p)for(const k of Object.keys(attrs))attrs[k]=Math.max(1,attrs[k]-Math.max(0,(q.p.fatigue||0)-25)*.025);
   out.push({p:q.p,id:q.p?.id??null,name:q.p?.name||'Övriga laget (lagmodell)',pos:q.p?.pos||pos,attributes:attrs,weight:Math.max(.65,1.3-i*.07),seconds:0,goals:0,assists:0,shots:0,saves:0,against:0});
  });
 }return out;
}
function nasIce(rows,seconds,skaters=5){
 for(const pos of ['B','F']){const ps=rows.filter(r=>pos==='B'?r.pos==='B':!['B','MV'].includes(r.pos)),budget=seconds*(skaters===3?(pos==='B'?1:2):(pos==='B'?2:3)),total=ps.reduce((n,r)=>n+r.weight,0);let left=budget;ps.forEach((r,i)=>{const share=i===ps.length-1?left:Math.floor(budget*r.weight/total);r.seconds+=share;left-=share;});}rows.find(r=>r.pos==='MV').seconds+=seconds;
}
function nasSimulate(g,league,year){
 const rand=rivalRandom(g.id+':season-v1'),sides=[g.home,g.away].map(club=>{const rows=nasLineup(league,club,g.date,year),skaters=rows.filter(r=>r.pos!=='MV');return {rows,skaters,keeper:rows.find(r=>r.pos==='MV'),attrs:MatchWorld2.attributes(skaters.map(r=>r.attributes))};});
 const pick=(rows,key)=>{const weights=rows.map(r=>r.weight*Math.max(1,r.attributes[key]||10)),total=weights.reduce((a,b)=>a+b,0);let roll=rand()*total;return rows.find((r,i)=>(roll-=weights[i])<=0)||rows.at(-1);};
 const score=[0,0],shots=[0,0],events=[];let duration=3600,overtime=false,shootout=false;
 const attempt=(side,time)=>{const t=sides[side],o=sides[1-side],shooter=pick(t.skaters,'shooting');const context=MatchWorld2.backgroundShotContext({creation:MatchWorld2.attackScore(t.attrs)+(side===0?.3:0),resistance:MatchWorld2.defenseScore(o.attrs),shooterPosition:shooter.pos,attackAttributes:t.attrs,defenseAttributes:o.attrs,plan:{},opposition:{}},rand);
  const model=StudioHockey.evaluateShot({block:StudioHockey.shotBlockChance(context.coverage??context.pressure,o.attrs),shooter:shooter.attributes,keeper:o.keeper.attributes,context});
  if(StudioHockey.shotFlightOutcome(model,rand(),rand()))return false;
  shots[side]++;shooter.shots++;const goal=StudioHockey.finishShot(model,rand())==='goal';o.keeper[goal?'against':'saves']++;
  if(!goal)return false;score[side]++;shooter.goals++;const assists=[],eligible=t.skaters.filter(r=>r!==shooter);for(let i=0,n=rand()<.75?2:rand()<.8?1:0;i<n;i++){const a=pick(eligible,'passing');assists.push(a);a.assists++;eligible.splice(eligible.indexOf(a),1);}
  events.push({time,side,scorer:shooter.name,id:shooter.id,assists:assists.map(r=>({id:r.id,name:r.name}))});return true;
 };
 for(const t of sides)nasIce(t.rows,3600);
 const chance=MatchWorld2.initiativeChance(sides[0].attrs,sides[1].attrs,{},{});
 for(let i=0;i<96;i++)attempt(rand()<chance?0:1,Math.floor((i+rand())*3600/96));
 if(score[0]===score[1]){
  overtime=true;let elapsed=0,goal=false;const step=g.stage==='regular'?25:30;
  while(!goal&&(g.stage!=='regular'||elapsed<300)){elapsed+=step;goal=attempt(rand()<chance?0:1,3600+elapsed);}
  duration+=elapsed;for(const t of sides)nasIce(t.rows,elapsed,g.stage==='regular'?3:5);
  if(!goal){const result=StudioHockey.resolveShootout(sides.map(t=>({shooters:t.skaters.map(r=>({id:r.id,name:r.name,attributes:r.attributes})),keeper:t.keeper.attributes})),rand);shootout=true;score[result.winner]++;}
 }
 return {hg:score[0],ag:score[1],shots,events,duration,overtime,shootout,sides,rand};
}
function nasPlay(l,g,league,year){
 if(g.played)return;const result=nasSimulate(g,league,year),{sides,rand,...report}=result;delete report.rand;Object.assign(g,report,{played:true});g.players=[];
 for(let side=0;side<2;side++)for(const r of sides[side].rows){if(!r.p)continue;const p=r.p,club=side?g.away:g.home,row={id:p.id,name:p.name,pos:p.pos,club,league,stage:g.stage,games:1,...Object.fromEntries(NAS_FIELDS.filter(k=>k!=='games').map(k=>[k,r[k]]))};g.players.push(row);
  const key=`${league}:${g.stage}:${club}:${p.id}`,entry=l.rows[key]??={...row,...Object.fromEntries(NAS_FIELDS.map(k=>[k,0]))};for(const k of NAS_FIELDS)entry[k]+=row[k];
  p.naSeasons??=[];let history=p.naSeasons.find(s=>s.year===year&&s.league===league&&s.stage===g.stage&&s.club===club);if(!history){history={year,...row,...Object.fromEntries(NAS_FIELDS.map(k=>[k,0]))};p.naSeasons.unshift(history);}for(const k of NAS_FIELDS)history[k]+=row[k];p.naSeasons=p.naSeasons.filter(s=>s.year>=year-5);
  p.naLastGame=g.date;p.health??={load:0,injury:null,clearance:'rest'};p.fatigue=Math.min(95,(p.fatigue||0)+r.seconds/60*(p.pos==='MV'?.32:.9));p.health.load=Math.min(100,(p.health.load||0)+r.seconds/600);
  const keyAttr=p.pos==='MV'?'positioning':p.pos==='B'?'decisions':'skating';developmentAdvance(p,keyAttr,Math.min(1.5,r.seconds/900),'Spelad '+league+'-match');
  if(rand()<.002+p.fatigue*.000035){const days=3+Math.floor(rand()*8);p.health.injury={name:'Kontusionsskada',remaining:days,initial:days,readiness:55,source:league};p.health.clearance='rest';(g.injuries??=[]).push({id:p.id,name:p.name,days});}
  if(p.naContract.homeClub===managerClub()&&!p.naDebut?.[league]){(p.naDebut??={})[league]=g.date;managerMessage(`nas-debut:${p.id}:${league}`,`${p.name} debuterar i ${league}`,`${g.home} ${g.hg}–${g.ag} ${g.away}. ${Math.round(r.seconds/60)} minuter och ${r.goals}+${r.assists}. Matchen och spelarens rad finns under NHL & draft → Ligaspel.`,'Utlandsbevakningen',{link:'nhl'});}
 }
 if(g.series){const s=l.series.find(s=>s.id===g.series),winner=g.hg>g.ag?g.home:g.away;s.wins[winner]++;if(s.wins[winner]>=Math.ceil(s.best/2))s.winner=winner;}
}
function nasAddSeries(l,league,year,round,group,home,away,best,start){const id=`${league}:${year}:s${round}:${l.series.length}`,s={id,round,group,home,away,best,wins:{[home]:0,[away]:0},winner:null,start};l.series.push(s);return s;}
function nasPlayoffRound(l,league,year){
 if(l.champion||l.games.some(g=>g.stage==='regular'&&!g.played)||l.series.some(s=>!s.winner))return;
 const table=nasTable(l,league),rank=club=>table.findIndex(r=>r.club===club),order=clubs=>[...clubs].sort((a,b)=>rank(a)-rank(b)),pair=(clubs,round,group,best,start)=>{for(let i=0;i<clubs.length/2;i++)nasAddSeries(l,league,year,round,group,clubs[i],clubs[clubs.length-1-i],best,`${year+1}-${start}`);};
 if(l.round===0){l.phase='playoffs';l.round=1;
  if(league==='NHL')for(const conf of ['East','West']){const ds=Object.keys(NAS_DIVISIONS.NHL).filter(d=>nasConference(league,NAS_DIVISIONS.NHL[d][0])===conf),tops=ds.map(d=>nasTable(l,league,d).slice(0,3).map(r=>r.club)),qualified=tops.flat(),wild=table.filter(r=>nasConference(league,r.club)===conf&&!qualified.includes(r.club)).slice(0,2).map(r=>r.club),leaders=order(tops.map(t=>t[0]));for(const top of tops){const group=nasDivision(league,top[0]);nasAddSeries(l,league,year,1,group,top[0],wild[leaders[0]===top[0]?1:0],7,`${year+1}-04-20`);nasAddSeries(l,league,year,1,group,top[1],top[2],7,`${year+1}-04-20`);}}
  else for(const [d,clubs] of Object.entries(NAS_DIVISIONS.AHL)){const n=clubs.length>=10?7:clubs.length===8?6:5,ps=nasTable(l,league,d).slice(0,n).map(r=>r.club),bye=8-n;l.seeds[d]=ps;l.byes[d]=ps.slice(0,bye);pair(ps.slice(bye),1,d,3,'04-18');}
 }else{
  const winners=l.series.filter(s=>s.round===l.round).map(s=>({club:s.winner,group:s.group}));
  const finalRound=league==='NHL'?4:5;if(l.round===finalRound){l.champion=winners[0].club;l.phase='complete';return;}
  l.round++;const round=l.round;
  if(league==='NHL'&&round===2)for(const d of Object.keys(NAS_DIVISIONS.NHL))pair(order(winners.filter(w=>w.group===d).map(w=>w.club)),round,d,7,'05-06');
  else if(league==='AHL'&&round<=3)for(const d of Object.keys(NAS_DIVISIONS.AHL))pair(order([...(round===2?l.byes[d]:[]),...winners.filter(w=>w.group===d).map(w=>w.club)]),round,d,5,round===2?'04-26':'05-08');
  else if(round===finalRound-1)for(const conf of ['East','West'])pair(order(winners.filter(w=>nasConference(league,w.club)===conf).map(w=>w.club)),round,conf,7,league==='NHL'?'05-22':'05-20');
  else pair(order(winners.map(w=>w.club)),round,'Final',7,league==='NHL'?'06-07':'06-05');
 }
}
function nasProcess(date){
 const w=state.naLeagues;if(!w||date<`${w.season.year}-10-01`)return;
 for(const league of ['NHL','AHL']){const l=w.season.leagues[league];for(const g of l.games)if(!g.played&&g.date===date)nasPlay(l,g,league,w.season.year);
  nasPlayoffRound(l,league,w.season.year);
  for(const s of l.series.filter(s=>!s.winner&&s.start<=date)){const played=l.games.filter(g=>g.series===s.id).length,due=calAdd(s.start,played*2);if(due!==date)continue;const host=[0,1,4,6].includes(played)?s.home:s.away,guest=host===s.home?s.away:s.home;const g={id:s.id+':g'+(played+1),series:s.id,date,home:host,away:guest,stage:'playoffs',played:false};l.games.push(g);nasPlay(l,g,league,w.season.year);}
  nasPlayoffRound(l,league,w.season.year);
 }
}
function nasRecoverDay(date){for(const p of state.northAmerica?.abroad||[]){if(internationalAway(p,date))continue;p.fatigue=Math.max(0,(p.fatigue||0)-6);p.health??={load:0,injury:null,clearance:'rest'};p.health.load=Math.max(0,(p.health.load||0)-4);if(p.health.injury){p.health.injury.remaining=Math.max(0,p.health.injury.remaining-1);if(!p.health.injury.remaining){p.health.injury=null;p.health.clearance='rest';}}}}
function nasDay(date=state.calendar?.date){
 const w=ensureNASeasons();if(!w||naLocked()||date<w.lastDate)return;
 // Never replay earlier dates using today's player registration. Normal calendar days process once.
 if(w.processed===date)return;nasProcess(date);w.lastDate=date;w.processed=date;
}
function nasOffseason(){
 const w=ensureNASeasons();if(!w||naLocked()||w.season.year!==state.season.year)return;
 const end=`${w.season.year+1}-06-22`;let date=w.processed?calAdd(w.lastDate,1):w.lastDate;
 for(;date<=end;date=calAdd(date,1)){nasRecoverDay(date);nasProcess(date);w.lastDate=date;w.processed=date;}
}
// A structural dictionary stays compressible inside the outer career save. No nested compressed bytes.
function nasArchiveEncode(season){
 const strings=[],ids=new Map(),shapes=[],shapeIds=new Map();
 const encode=v=>{if(v===null)return 'n';if(v===true)return 't';if(v===false)return 'f';if(typeof v==='number')return Number.isInteger(v)&&v>=0&&v<=50000?String.fromCharCode(1024+v):'#'+v+';';if(typeof v==='string'){if(!ids.has(v)){ids.set(v,strings.length);strings.push(v);}return ids.get(v)<4096?String.fromCharCode(57344+ids.get(v)):'^'+ids.get(v).toString(36)+';';}if(Array.isArray(v))return '['+v.length.toString(36)+';'+v.map(encode).join('');const keys=Object.keys(v),signature=JSON.stringify(keys);if(!shapeIds.has(signature)){shapeIds.set(signature,shapes.length);shapes.push(keys);}if(shapes.length>768)throw Error('För många arkivformat');return String.fromCharCode(256+shapeIds.get(signature))+keys.map(k=>encode(v[k])).join('');};
 let stream=encode(season);const tokens=[];for(let n=0;n<64;n++){const counts=new Map();for(let i=0;i<stream.length-2;i++){const key=stream.slice(i,i+3);counts.set(key,(counts.get(key)||0)+1);}let best=null,hits=16;for(const [key,count] of counts)if(count>hits){best=key;hits=count;}if(!best)break;tokens.push(best);stream=stream.split(best).join(String.fromCharCode(61440+n));}const chunks=[];for(let i=0;i<stream.length;i+=100000)chunks.push(stream.slice(i,i+100000));return {strings,shapes,tokens,chunks};
}
function nasArchiveDecode(data){
 let root=data.chunks?data.chunks.join(''):data.root;if((data.tokens?.length||0)>64)throw Error('Ogiltig arkivordlista');for(let i=(data.tokens?.length||0)-1;i>=0;i--){if(typeof data.tokens[i]!=='string'||data.tokens[i].length!==3)throw Error('Ogiltig arkivordlista');root=root.split(String.fromCharCode(61440+i)).join(data.tokens[i]);if(root.length>2000000)throw Error('För stort ligaarkiv');}data={...data,root};
 let nodes=0,at=0;const word=()=>{const end=data.root.indexOf(';',at);if(end<at)throw Error('Ogiltigt arkivfält');const text=data.root.slice(at,end);at=end+1;return text;};
 const decode=(depth=0)=>{if(++nodes>1000000||depth>32||at>=data.root.length)throw Error('Ogiltigt ligaarkiv');const c=data.root[at++],code=c.charCodeAt(0);if(code>=57344&&code<61440){const value=data.strings[code-57344];if(typeof value!=='string')throw Error('Ogiltig arkivtext');return value;}if(code>=1024)return code-1024;if(code>=256){const keys=data.shapes[code-256];if(!keys)throw Error('Ogiltig arkivrad');return Object.fromEntries(keys.map(k=>[k,decode(depth+1)]));}if(c==='n')return null;if(c==='t')return true;if(c==='f')return false;if(c==='#'){const n=Number(word());if(!Number.isFinite(n))throw Error('Ogiltigt arkivtal');return n;}if(c==='^'){const value=data.strings[parseInt(word(),36)];if(typeof value!=='string')throw Error('Ogiltig arkivtext');return value;}if(c==='['){const length=parseInt(word(),36);if(!Number.isInteger(length)||length<0||length>100000)throw Error('Ogiltig arkivlista');return Array.from({length},()=>decode(depth+1));}throw Error('Ogiltig arkivsymbol');};const result=decode();if(at!==data.root.length)throw Error('Överbliven arkivdata');return result;
}
function nasNewYear(){
 const w=ensureNASeasons();if(!w||w.season.year>=state.season.year)return;
 const old=w.season;w.history.unshift({year:old.year,leagues:Object.fromEntries(Object.entries(old.leagues).map(([key,l])=>[key,{champion:l.champion}])),data:nasArchiveEncode(old)});w.history=w.history.slice(0,3);nasArchiveCache=null;w.season=nasNewSeason(state.season.year);w.lastDate=state.calendar.date;w.processed=null;
}
function nasPlayerSummary(p){const rows=(p.naSeasons||[]).filter(r=>r.year===state.season.year),games=rows.reduce((n,r)=>n+r.games,0),goals=rows.reduce((n,r)=>n+r.goals,0),assists=rows.reduce((n,r)=>n+r.assists,0),seconds=rows.reduce((n,r)=>n+r.seconds,0);return games?`${games} NHL/AHL-matcher · ${goals}+${assists} · ${Math.round(seconds/60/games)} min/match`:'Inga registrerade NHL/AHL-matcher denna säsong.';}
function nasSet(key,value){
 if(key==='league'&&['NHL','AHL'].includes(value)){nasUI.league=value;nasUI.division='all';nasUI.club='all';nasUI.game=null;}
 else if(key==='tab'&&['table','games','playoffs','players','history','rosters'].includes(value))nasUI.tab=value;
 else if(key==='division'&&(value==='all'||Object.hasOwn(NAS_DIVISIONS[nasUI.league],value)))nasUI.division=value;
 else if(key==='club'&&(value==='all'||nasClubs(nasUI.league).includes(value)))nasUI.club=value;
 else if(key==='stage'&&['regular','playoffs'].includes(value))nasUI.stage=value;
 else if(key==='year'&&(value==='current'||state.naLeagues?.history.some(s=>String(s.year)===value))){nasUI.year=value;nasUI.game=null;}
 else if(key==='game'){const season=nasSelectedSeason();if(!season?.leagues[nasUI.league].games.some(g=>g.id===value&&g.played))return;nasUI.game=value;nasUI.tab='games';}
 else return;render();
}
function nasSelectedSeason(){const w=state.naLeagues;if(nasUI.year==='current')return w?.season;const item=w?.history.find(s=>String(s.year)===nasUI.year);if(!item)return w?.season;if(!item.data&&!item.packed)return item;if(nasArchiveCache?.item===item)return nasArchiveCache.season;try{const season=item.data?nasArchiveDecode(item.data):careerRead(item.packed);nasArchiveCache={item,season};return season;}catch{return null;}}
function nasOpen(){nhlUI.tab='leagues';deskNavigate('nhl');}
function nasView(){
 const season=nasSelectedSeason();if(!season)return '<p>Det valda ligaarkivet kunde inte läsas. Välj den aktuella säsongen igen via NHL & draft.</p>';const league=nasUI.league,l=season.leagues[league],safe=trainingSafe,finished=l.games.filter(g=>g.played).length;
 const options=(values,selected)=>values.map(([v,label])=>`<option value="${safe(v)}" ${v===selected?'selected':''}>${safe(label)}</option>`).join('');
 const filters=`<div class="nhl-filters"><label>Liga<select onchange="nasSet('league',this.value)">${options(['NHL','AHL'].map(v=>[v,v]),league)}</select></label><label>Säsong<select onchange="nasSet('year',this.value)">${options([['current',state.naLeagues.season.year+'/'+String(state.naLeagues.season.year+1).slice(-2)],...state.naLeagues.history.map(s=>[String(s.year),s.year+'/'+String(s.year+1).slice(-2)])],nasUI.year)}</select></label><label>Klubb<select onchange="nasSet('club',this.value)">${options([['all','Alla klubbar'],...nasClubs(league).map(c=>[c,c])],nasUI.club)}</select></label></div>`;
 const tabs=`<nav class="mw-tabs" aria-label="Nordamerikanskt ligaspel">${[['table','Tabell'],['games','Matcher & rapporter'],['playoffs','Slutspel'],['players','Bevakade spelare'],['history','Mästare'],['rosters','Verkliga spelare']].map(([id,name])=>`<button onclick="nasSet('tab','${id}')" aria-pressed="${nasUI.tab===id}">${name}</button>`).join('')}</nav>`;
 let body='';
 if(nasUI.tab==='rosters')return `${tabs}${narView()}`;
 if(nasUI.tab==='table')body=`<section class="mw-panel"><h2>${league} · Grundserie</h2><label class="na-filter">Division<select onchange="nasSet('division',this.value)">${options([['all','Hela ligan'],...Object.keys(NAS_DIVISIONS[league]).map(d=>[d,d])],nasUI.division)}</select></label><div class="mw-scroll"><table><thead><tr><th>#</th><th>Klubb</th><th>M</th><th>V</th><th>F</th><th>ÖF</th><th>Mål</th><th>P</th></tr></thead><tbody>${nasTable(l,league,nasUI.division).map((r,i)=>`<tr ${r.club===nasUI.club?'class="nas-highlight"':''}><td>${i+1}</td><th>${safe(r.club)}<small>${nasDivision(league,r.club)}</small></th><td>${r.gp}</td><td>${r.w}</td><td>${r.l}</td><td>${r.otl}</td><td>${r.gf}–${r.ga}</td><td><strong>${r.pts}</strong></td></tr>`).join('')}</tbody></table></div><p>Två poäng för seger, en för förlust efter förlängning/straffar. ÖF = övertidsförlust. Vid lika poäng: ordinarie segrar, segrar utan straffar, alla segrar, målskillnad, gjorda mål och klubbnamn. Exakt inbördes tie-break återstår.</p><p>${league==='NHL'?'Tre lag per division och två wild cards per konferens går till slutspel.':'Fem lag från sjulagsdivisionerna, sex från åttalagsdivisionen och sju från Pacific går vidare. Topplagen får frirunda.'}</p></section>`;
 if(nasUI.tab==='games'){
  const games=l.games.filter(g=>nasUI.club==='all'||g.home===nasUI.club||g.away===nasUI.club),upcoming=games.filter(g=>!g.played).slice(0,24),recent=games.filter(g=>g.played).reverse().slice(0,48),chosen=l.games.find(g=>g.id===nasUI.game&&g.played);
  const table=(rows)=>`<div class="mw-scroll"><table><thead><tr><th>Datum</th><th>Hemma</th><th>Resultat</th><th>Borta</th></tr></thead><tbody>${rows.map(g=>`<tr><td>${calText(g.date)}<small>${g.stage==='playoffs'?'Slutspel':'Grundserie'}</small></td><td>${safe(g.home)}</td><td>${g.played?`<button class="desk-link" onclick="nasSet('game','${g.id}')">${g.hg}–${g.ag}${g.shootout?' STR':g.overtime?' ÖT':''}</button>`:'–'}</td><td>${safe(g.away)}</td></tr>`).join('')}</tbody></table></div>`;
  body=`${chosen?nasGameView(chosen):''}<section class="mw-panel"><h2>Kommande matcher</h2>${upcoming.length?table(upcoming):'<p>Inga schemalagda matcher i urvalet. Nästa slutspelsmatch skapas när den föregående är avgjord.</p>'}</section><section class="mw-panel"><h2>Senaste resultat</h2><p>Välj ett resultat för mål, skott och registrerad spelarinsats. Visar högst 48 resultat; välj klubb för att begränsa.</p>${recent.length?table(recent):'<p>Inga matcher spelade ännu.</p>'}</section>`;
 }
 if(nasUI.tab==='playoffs')body=`<section class="mw-panel"><h2>${league==='NHL'?'Stanley Cup':'Calder Cup'} · Slutspel</h2>${l.champion?`<p class="nas-champion">Mästare: ${safe(l.champion)}</p>`:''}${l.series.length?[...new Set(l.series.map(s=>s.round))].map(round=>`<h3>Runda ${round}</h3><div class="nas-series">${l.series.filter(s=>s.round===round&&(nasUI.club==='all'||[s.home,s.away].includes(nasUI.club))).map(s=>`<article class="na-offer"><strong>${safe(s.home)} ${s.wins[s.home]}–${s.wins[s.away]} ${safe(s.away)}</strong><p>${safe(s.group)} · bäst av ${s.best} · ${s.winner?safe(s.winner)+' vidare':'Pågående / start '+calText(s.start)}</p></article>`).join('')||'<p>Ingen serie för vald klubb i denna runda.</p>'}</div>`).join(''):'<p>Slutspelsträdet fylls när grundserien är färdig.</p>'}</section>`;
 if(nasUI.tab==='players'){const rows=Object.values(l.rows).filter(r=>r.stage===nasUI.stage&&(nasUI.club==='all'||r.club===nasUI.club)),skaters=rows.filter(r=>r.pos!=='MV').sort((a,b)=>(b.goals+b.assists)-(a.goals+a.assists)||b.goals-a.goals||a.name.localeCompare(b.name)),keepers=rows.filter(r=>r.pos==='MV').sort((a,b)=>b.games-a.games);
  body=`<section class="mw-panel"><h2>Bevakade spelares insatser</h2><p>Registrerade matcher för karriärens spelare. Detta är inte en fullständig poängliga över verkliga NHL/AHL-trupper. Grundserie, slutspel och klubbperioder hålls isär.</p><label class="na-filter">Tävlingsfas<select onchange="nasSet('stage',this.value)">${options([['regular','Grundserie'],['playoffs','Slutspel']],nasUI.stage)}</select></label><div class="mw-scroll"><table><thead><tr><th>Spelare</th><th>Klubb</th><th>M</th><th>Mål</th><th>Ass</th><th>P</th><th>Min/match</th></tr></thead><tbody>${skaters.map(r=>`<tr><th>${safe(r.name)}</th><td>${safe(r.club)}</td><td>${r.games}</td><td>${r.goals}</td><td>${r.assists}</td><td>${r.goals+r.assists}</td><td>${(r.seconds/60/r.games).toFixed(1)}</td></tr>`).join('')||'<tr><td colspan="7">Inga registrerade utespelarmatcher.</td></tr>'}</tbody></table></div><h3>Målvakter</h3><div class="mw-scroll"><table><thead><tr><th>Spelare</th><th>Klubb</th><th>M</th><th>Räddningar</th><th>Insläppta</th><th>Räddningsprocent</th></tr></thead><tbody>${keepers.map(r=>`<tr><th>${safe(r.name)}</th><td>${safe(r.club)}</td><td>${r.games}</td><td>${r.saves}</td><td>${r.against}</td><td>${r.saves+r.against?(100*r.saves/(r.saves+r.against)).toFixed(1)+' %':'–'}</td></tr>`).join('')||'<tr><td colspan="6">Inga registrerade målvaktsmatcher.</td></tr>'}</tbody></table></div></section>`;
 }
 if(nasUI.tab==='history')body=`<section class="mw-panel"><h2>Mästare i karriären</h2>${[state.naLeagues.season,...state.naLeagues.history].map(s=>`<article class="na-offer"><strong>${s.year}/${String(s.year+1).slice(-2)}</strong><p>Stanley Cup: ${safe(s.leagues.NHL.champion||'Inte avgjord')} · Calder Cup: ${safe(s.leagues.AHL.champion||'Inte avgjord')}</p></article>`).join('')}</section>`;
 return `<p class="nhl-notice">${league} ${season.year}/${String(season.year+1).slice(-2)} · ${finished} spelade matcher · ${l.phase==='complete'?'Säsongen färdig':l.phase==='playoffs'?'Slutspel':state.calendar.date<`${season.year}-10-01`?'Premiär 1 oktober':'Grundserie'}</p>${filters}${tabs}${body}<details class="mw-panel nhl-scope"><summary>Ligor, spelarunderlag och spelregler</summary><p>32 verkliga klubbar i varje liga. NHL spelar 84 matcher per lag, AHL 72 i denna spelmodell. Spelschemat är genererat, inte det officiella matchprogrammet. Lagstyrkan i övriga truppen är en uppskattad lagmodell; inga verkliga spelarnamn eller individuella resultat hittas på för spelare som saknas i databasen. Karriärens registrerade spelare konkurrerar om istiden och påverkar lagets attribut.</p><p>Grundserie: fem minuters förlängning med tre utespelare, därefter straffar. Slutspel: sudden death utan straffar. NHL spelar bäst av sju; AHL bäst av tre, fem, fem, sju och sju. AHL:s kvalplatser anpassas efter de aktuella divisionsstorlekarna i spelmodellen. Fullständiga verkliga trupper och exakt regelbok återstår.</p><p>Äldre sparningar som redan passerat premiären startar ligabevakningen nästa höst, utan efterkonstruerade resultat. Upp till tre avslutade säsonger sparas i ligaarkivet. <a href="NORTH-AMERICA-SEASONS.md" target="_blank" rel="noopener noreferrer">Spelmodell och källor</a></p></details>`;
}
function nasGameView(g){return `<section class="mw-panel"><h2>${trainingSafe(g.home)} ${g.hg}–${g.ag} ${trainingSafe(g.away)}</h2><p>${calText(g.date)} · Skott ${g.shots.join('–')} · ${g.shootout?'Straffavgörande (avgörande lagmål ingår inte i individuell statistik)':g.overtime?'Förlängning':'Ordinarie tid'} · speltid ${Math.floor(g.duration/60)}:${String(g.duration%60).padStart(2,'0')}</p><h3>Mål</h3>${g.events.map(e=>`<p>${Math.floor(e.time/60)}:${String(e.time%60).padStart(2,'0')} · ${trainingSafe(e.side?g.away:g.home)} · ${trainingSafe(e.scorer)}${e.assists.length?' ('+e.assists.map(a=>trainingSafe(a.name)).join(', ')+')':''}</p>`).join('')||'<p>Inga mål under ordinarie tid eller förlängning.</p>'}<h3>Bevakade spelare</h3>${g.players.map(p=>`<p>${trainingSafe(p.name)} · ${trainingSafe(p.club)} · ${Math.round(p.seconds/60)} min · ${p.pos==='MV'?p.saves+' räddningar, '+p.against+' insläppta':p.goals+' mål, '+p.assists+' assist, '+p.shots+' skott'}</p>`).join('')||'<p>Den här matchen spelades helt med lagmodellen.</p>'}${(g.injuries||[]).map(p=>`<p>${trainingSafe(p.name)} skadades · bedömd frånvaro ${p.days} dagar vid matchtillfället.</p>`).join('')}</section>`;}
