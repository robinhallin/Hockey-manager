"use strict";

// Coach-owned memories travel with the career. Match reports own the evidence.
function ensurePlayerJourneys(){
 if(!state.careerStarted||!state.calendar)return;
 state.playerJourneys??={version:1,club:managerClub(),roster:managerRoster().map(p=>String(p.id)),captain:state.locker?.captainId==null?null:String(state.locker.captainId),players:{},seen:[]};
}
function journeyPlayer(id){return state.playerJourneys?.players[String(id)]||null;}
function journeyTrack(p){
 ensurePlayerJourneys();const b=state.playerJourneys,key=String(p.id);
 if(!b.players[key]){
  // Keep active players and their stories; prune only the oldest inactive memory.
  const keys=Object.keys(b.players);
  if(keys.length>=200){const old=keys.filter(id=>!b.roster.includes(id)).sort((a,c)=>(b.players[a].events.at(-1)?.date||'').localeCompare(b.players[c].events.at(-1)?.date||''))[0];if(!old)return null;delete b.players[old];}
  b.players[key]={id:key,name:p.name,events:[],clubs:{}};
 }
 return b.players[key];
}
function journeyEvent(p,key,kind,title,detail,extra={}){
 const row=journeyTrack(p);if(!row||row.events.some(e=>e.key===key))return false;
 row.name=p.name;
 row.events.push({key,kind,title,detail,club:managerClub(),year:state.season.year,date:state.calendar.date,...extra});
 row.events=row.events.slice(-40);return true;
}
function journeyStoryChapter(s,title,text){
 for(const id of s.ids){const old=journeyPlayer(id),p=storiesPlayer(id)||findPlayerAnywhere(id)||(old?{id,name:old.name}:null);if(!p)continue;
  journeyEvent(p,`story:${s.id}:${state.stories.matchCount}:${title}`,'decision',title,text,{storyId:s.id,club:s.club,year:s.year});
 }
}
function journeyConversation(p,title,body){
 if(!journeyPlayer(p.id)&&!['Utsedd till lagkapten','Lämnar kaptensuppdraget','En fadder i laget'].includes(title))return;
 journeyEvent(p,`conversation:${managerClub()}:${state.calendar.date}:${state.locker.turn}:${title}`,'decision',title,body);
}
function journeyDay(){
 if(!managerEmployed())return;ensurePlayerJourneys();const b=state.playerJourneys;if(!b)return;
 const roster=managerRoster(),ids=roster.map(p=>String(p.id)),captain=state.locker.captainId==null?null:String(state.locker.captainId);
 if(b.club!==managerClub()){b.club=managerClub();b.roster=ids;b.captain=captain;return;}
 for(const p of roster){
  const old=journeyPlayer(p.id);
  if(!b.roster.includes(String(p.id)))journeyEvent(p,`arrival:${managerClub()}:${state.calendar.date}`,'arrival',playerLoan(p)?'Ett nytt kapitel på lån':'Vägen in i laget',`${p.name} anslöt till din A-trupp. Du bestämmer hur mycket ansvar han får.`);
  if(!medicalReady(p)&&(old||p.age<=23)){
   const row=journeyTrack(p),c=row&&(row.clubs[managerClub()]??={games:0,goals:0});if(c&&!c.absent)c.absent=state.calendar.date;
  }
 }
 for(const id of b.roster.filter(id=>!ids.includes(id))){
  const row=journeyPlayer(id);if(!row)continue;
  const club=getPlayerClub(id),p=findPlayerAnywhere(id)||{id,name:row.name};
  journeyEvent(p,`departure:${managerClub()}:${state.calendar.date}`,'departure','Våra vägar skiljs åt',club&&club!==managerClub()?`${p.name} lämnade din aktiva trupp för ${club}. Era tidigare beslut och milstolpar finns kvar.`:`${p.name} lämnade din aktiva trupp. Era tidigare kapitel finns kvar.`);
 }
 if(captain!==b.captain&&captain!==null){const p=roster.find(p=>samePlayerId(p.id,captain));if(p)journeyEvent(p,`captain:${managerClub()}:${state.calendar.date}:${captain}`,'captain','Du gav honom kaptensansvaret','Ett nytt ansvar i gruppen. Spelarens tidigare roll och löften gäller fortfarande.');}
 b.roster=ids;b.captain=captain;
}
function journeyAfterMatch(m){
 if(!m?.finished||m.friendly||m.partial||m.abandoned||m.club!==managerClub())return;
 ensurePlayerJourneys();const b=state.playerJourneys,key=`${m.club}:${m.year}:${m.id}`;if(b.seen.includes(key))return;
 b.seen.push(key);b.seen=b.seen.slice(-240);
 for(const result of m.players||[]){
  if(!(result.seconds>0))continue;const p=managerRoster().find(p=>samePlayerId(p.id,result.id));if(!p)continue;
  // Follow chosen protagonists and young players, rather than reporting every veteran.
  if(p.age>23&&!journeyPlayer(p.id))continue;
  const row=journeyTrack(p);if(!row)continue;const c=row.clubs[m.club]??={games:0,goals:0};
  if(!c.games)journeyEvent(p,`debut:${m.club}`,'debut','Första tävlingsmatchen vi följer tillsammans',`${analysisTime(result.seconds)} mot ${m.opponent}. Historiken börjar med det underlag som registreras under din ledning.`,{matchId:String(m.id)});
  if(!c.goals&&result.goals>0)journeyEvent(p,`goal:${m.club}`,'goal','Första målet i vår gemensamma historia',`${result.goals} mål mot ${m.opponent}. ${row.events.some(e=>e.kind==='decision')?'Du gav honom ett besked. Nu finns ett nytt ögonblick att bära med sig.':'En milstolpe från en faktiskt spelad tävlingsmatch.'}`,{matchId:String(m.id)});
  if(c.absent&&medicalReady(p)){
   if(calGap(c.absent,m.date||state.calendar.date)>=7)journeyEvent(p,`return:${m.club}:${c.absent}`,'comeback','Tillbaka på isen',`${analysisTime(result.seconds)} mot ${m.opponent}, efter frånvaro registrerad ${calText(c.absent)}.`,{matchId:String(m.id)});
   delete c.absent;
  }
  c.games++;c.goals+=result.goals||0;
 }
}
function journeyStart(id){
 if(!managerEmployed()||clubLocked()||!['preseason','regular','playoffs'].includes(state.season.phase))return false;
 const p=managerRoster().find(p=>samePlayerId(p.id,id));if(!p||p.pos==='MV'||!medicalReady(p)||playerLoan(p)||internationalAway(p))return false;
 ensureStories();if(state.stories.active.some(s=>s.ids.some(id=>samePlayerId(id,p.id))))return false;
 const s=storiesCreate('breakthrough',[p.id],`${p.name}: din satsning`,`${p.name} får en konkret provperiod om du väljer att öka ansvaret. Den följs mot faktisk tävlingsistid. Kontraktsrollen och andra löften gäller samtidigt.`,{storyKey:`chosen:${p.id}:${state.stories.matchCount}`});
 if(!s)return false;storiesUI.selected=s.id;storiesUI.archive=false;overviewUI.stories=true;state.page='home';save();render();return true;
}
function journeyCandidates(){return managerRoster().filter(p=>p.pos!=='MV'&&medicalReady(p)&&!playerLoan(p)&&!internationalAway(p)).slice().sort((a,b)=>a.age-b.age||a.name.localeCompare(b.name,'sv'));}
function journeyPlayerView(p){
 const row=journeyPlayer(p.id);if(!row?.events.length)return '';
 return `<section class="journey-memory"><h3>Vår gemensamma historia</h3><p>Dina besked och registrerade milstolpar följer med genom säsonger och klubbbyten.</p><ol>${row.events.slice().reverse().map(e=>`<li><small>${calText(e.date)} · ${trainingSafe(e.club)}</small><strong>${trainingSafe(e.title)}</strong><p>${trainingSafe(e.detail)}</p>${e.matchId?`<button type="button" class="desk-link" onclick="${trainingSafe(`matchesOpenReport(${JSON.stringify(e.matchId)})`)}">Matchunderlag →</button>`:''}</li>`).join('')}</ol></section>`;
}
function journeyOverview(){
 const b=state.stories,active=(b?.club===managerClub()?b.active:[]).filter(s=>s.ids.length),candidates=journeyCandidates();
 const events=Object.values(state.playerJourneys?.players||{}).flatMap(p=>p.events.filter(e=>e.club===managerClub()&&e.kind!=='decision').map(e=>({p,e}))).sort((a,b)=>b.e.date.localeCompare(a.e.date)).slice(0,1);
 return `<section class="build-panel journey-overview"><header><span class="desk-kicker">PERSONERNA I DITT LAG</span><h2>Spelare du satsar på</h2></header>${active.slice(0,2).map(s=>`<button type="button" class="build-story" onclick="storiesOpen('${s.id}')"><strong>${trainingSafe(s.title)}</strong><span>${trainingSafe(storiesNext(s))}</span></button>`).join('')||'<p>Välj en spelare vars väg in i en större roll du vill följa.</p>'}${events.map(({p,e})=>`<p class="journey-moment"><strong>${trainingSafe(e.title)}</strong> · ${playerReference(p.id,p.name)}<small>${calText(e.date)} · ${trainingSafe(e.detail)}</small></p>`).join('')}<details><summary>Starta en spelarresa</summary><form onsubmit="event.preventDefault();journeyStart(this.elements.player.value)"><label>Spelare att satsa på<select name="player">${candidates.map(p=>`<option value="${trainingSafe(p.id)}">${trainingSafe(p.name)} · ${p.age} år</option>`).join('')}</select></label><button class="btn secondary" ${!candidates.length||clubLocked()||!managerEmployed()?'disabled':''}>Diskutera en provperiod</button></form><small>Provperioden följer tävlingsmatcher. Du fördelar själv istiden i laguttagningen.</small></details></section>`;
}
function validatePlayerJourneys(s){
 const b=s.playerJourneys;if(!b)return;
 const object=v=>v&&typeof v==='object'&&!Array.isArray(v),date=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v)),text=v=>typeof v==='string'&&v.length<=12000;
 const fail=()=>{throw Error('Ogiltiga spelarresor i sparfilen.');};
 if(b.version!==1||!text(b.club)||!Array.isArray(b.roster)||b.roster.length>200||b.roster.some(id=>!text(id))||b.captain!==null&&!text(b.captain)||!object(b.players)||Object.keys(b.players).length>200||!Array.isArray(b.seen)||b.seen.length>240||b.seen.some(k=>!text(k)))fail();
 for(const [id,p] of Object.entries(b.players)){
  if(!object(p)||p.id!==id||!text(p.name)||!object(p.clubs)||Object.keys(p.clubs).length>100||!Array.isArray(p.events)||p.events.length>40)fail();
  const seen=new Set();for(const e of p.events){if(!object(e)||!['decision','arrival','departure','captain','debut','goal','comeback'].includes(e.kind)||!date(e.date)||!Number.isInteger(e.year)||['key','club','title','detail'].some(k=>!text(e[k]))||seen.has(e.key)||e.matchId!==undefined&&!text(e.matchId)||e.storyId!==undefined&&!text(e.storyId))fail();seen.add(e.key);}
  for(const c of Object.values(p.clubs))if(!object(c)||['games','goals'].some(k=>!Number.isInteger(c[k])||c[k]<0)||c.absent!==undefined&&!date(c.absent))fail();
 }
}
