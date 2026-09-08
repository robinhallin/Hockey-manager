"use strict";
// Fictional coaches in the saved career. Simulation owns results and box scores together.
const RIVAL_STYLES={control:'Kontrollerat anfall',counter:'Kontringshockey',pressure:'Hög press'};
const RIVAL_ROTATIONS={balanced:[0,1,2,0,1,3],rollFour:[0,1,2,3],topHeavy:[0,1,0,2,1,3,0]};
let rivalsSelected=null;
function rivalRandom(key){let n=Math.floor(attrSeed(key)*4294967296)>>>0;return ()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};}
function rivalCoach(club){
 const id=state.rivals.nextCoach++,rand=rivalRandom(`${club}:coach:${id}`);
 const first=['Andreas','Jonas','Martin','Fredrik','Daniel','Patrik','Mikael','Johan','Stefan','Niklas','Henrik','Magnus'];
 const last=['Berglund','Sandell','Lindholm','Ekström','Holmgren','Nyberg','Strandberg','Lundin','Bergman','Sundqvist','Forsell','Nordström'];
 return {id:'coach-'+id,name:first[Math.floor(rand()*first.length)]+' '+last[Math.floor(rand()*last.length)],fictional:true,
  style:Object.keys(RIVAL_STYLES)[Math.floor(rand()*3)],rotation:Object.keys(RIVAL_ROTATIONS)[Math.floor(rand()*3)],youth:rand()>.5,adaptability:8+Math.floor(rand()*10),coaching:9+Math.floor(rand()*9),appointed:state.calendar?.date||null};
}
function ensureRivals(){
 if(!state.careerStarted||!state.season||!state.world||!state.calendar)return;
 if(!state.rivals)state.rivals={version:1,year:state.season.year,managedClub:managerClub(),nextCoach:1,clubs:{},events:[],lastDay:state.calendar.date};
 const w=state.rivals;if(!w.duels)w.duels={};if(!w.nextEvent)w.nextEvent=1;
 for(const club of Object.keys(state.world.membership)){
  if(!w.clubs[club])w.clubs[club]={coach:rivalCoach(club),confidence:65,tenure:0,recent:[],history:[],familiarity:55,changes:0};
  w.clubs[club].target=leagueCareerOffer(careerIdentity(club),club,state.clubRosters).place;
 }
 if(w.year!==state.season.year){
  w.year=state.season.year;w.lastDay=state.calendar.date;
  for(const c of Object.values(w.clubs)){c.recent=[];c.tenure=0;c.confidence=Math.max(50,c.confidence);c.changes=0;c.familiarity=Math.max(35,c.familiarity-10);}
 }
 if(w.managedClub!==managerClub()){
  const old=w.managedClub;w.managedClub=managerClub();
  if(w.clubs[old]){
   w.clubs[old].coach={...w.clubs[old].coach,id:`manager-${state.season.year}:${old}`,name:state.managerCareer?.name||'Huvudtränaren',fictional:false};
   rivalReplaceCoach(old,'Klubben tillsätter en efterträdare när du går vidare.');
  }
  const joined=w.clubs[managerClub()];
  if(joined){joined.history.unshift({...joined.coach,left:state.calendar.date,reason:'Du tog över som huvudtränare.'});joined.history=joined.history.slice(0,12);}
 }
 ensureClubAI();
}
function rivalsClubState(club){return state.rivals?.clubs[club];}
function rivalRandomSkater(club,kind){
 const active=state.live?.opponent===club&&!state.live.finished?rivalLivePlayers():rivalLineup(club).forwards.concat(rivalLineup(club).defense);
 const skaters=active.filter(p=>p.pos!=='MV'),pool=skaters.filter(p=>kind==='forward'?p.pos!=='B':kind==='defense'?p.pos==='B':true);
 const chosen=pool.length?pool:skaters;return chosen[Math.floor(Math.random()*chosen.length)]?.name||club;
}
function rivalPlan(club,opponentName=null){
 const c=rivalsClubState(club);if(!c)return {style:'control',rotation:'balanced',tempo:'normal'};
 const losses=c.recent.slice(-4).filter(g=>g.gf<g.ga).length;
 return aiMatchPlan(club,opponentName,{style:losses>=3&&c.coach.adaptability>=14?(c.coach.style==='pressure'?'control':'pressure'):c.coach.style,
  rotation:c.coach.rotation,tempo:c.coach.style==='pressure'?'high':c.coach.style==='counter'?'low':'normal'});
}
function rivalAttribute(p,key){return attrClamp((ensurePlayerAttributes(p)[key]||10)-(p.fatigue||0)/25,1,20);}
function rivalRating(p,kind='general'){
 const keys=p.pos==='MV'?['reflexes','positioning','reboundControl','movement']:kind==='attack'?['shooting','passing','vision','skating']:kind==='defense'?['positioning','decisions','workRate','discipline']:['passing','shooting','positioning','skating','decisions'];
 return keys.reduce((n,k)=>n+rivalAttribute(p,k),0)/keys.length;
}
function rivalLineup(club,opponentName=null){
 const c=rivalsClubState(club),pool=(state.clubRosters[club]||[]).filter(medicalReady),plan=rivalPlan(club,opponentName);
 const scores=new Map(pool.map(p=>[p,rivalRating(p,p.pos==='B'?'defense':plan.style==='counter'?'defense':'attack')+(p.aiForm||0)*.18+(c?.coach.youth&&p.age<=23?.4:0)])),score=p=>scores.get(p)||0;
 const forwards=pool.filter(p=>!['B','MV'].includes(p.pos)).sort((a,b)=>score(b)-score(a)).slice(0,12);
 const defense=pool.filter(p=>p.pos==='B').sort((a,b)=>score(b)-score(a)).slice(0,6);
 const centers=pool.filter(p=>!['MV','B'].includes(p.pos)&&positionFit(p,'C')>=.98).sort((a,b)=>aiUnitScore(b,'C')-aiUnitScore(a,'C'));
 for(const center of centers.slice(0,4))if(!forwards.includes(center)){const i=forwards.findLastIndex(p=>positionFit(p,'C')<.98);if(i>=0)forwards.splice(i,1,center);}
 const lines=Array.from({length:4},()=>[]),used=new Set();
 centers.filter(p=>forwards.includes(p)).slice(0,4).forEach((p,i)=>{lines[i].push(p);used.add(String(p.id));});
 for(const line of lines){const ranked=forwards.map(p=>({p,value:score(p)+lineChemistry([...line.map(q=>q.id),p.id],club).value*.015})).sort((a,b)=>b.value-a.value);for(const {p} of ranked)if(line.length<3&&!used.has(String(p.id))){line.push(p);used.add(String(p.id));}}
 const keepers=pool.filter(p=>p.pos==='MV').sort((a,b)=>rivalRating(b)-rivalRating(a));
 const keeperScore=p=>rivalRating(p)+(p.aiForm||0)*.25-(c?.recent.slice(-3).filter(g=>samePlayerId(g.keeper,p.id)).length||0)*.65;
 keepers.sort((a,b)=>keeperScore(b)-keeperScore(a));
 const selected=new Set([...forwards,...defense].map(p=>String(p.id)));
 const extras=pool.filter(p=>p.pos!=='MV'&&!selected.has(String(p.id))).sort((a,b)=>score(b)-score(a)).slice(0,2);
 for(const line of lines){const center=line.find(p=>positionFit(p,'C')>=.98)||line[1];if(center){const wings=line.filter(p=>p!==center);line.splice(0,line.length,...[wings[0],center,wings[1]].filter(Boolean));}}
 plan.checkingLine=lines.map((ps,i)=>({i,value:ps.reduce((n,p)=>n+rivalRating(p,'defense'),0)/Math.max(1,ps.length)})).sort((a,b)=>b.value-a.value)[0]?.i||0;
 return {club,plan,forwards:lines.flat(),lines,defense,extras,keepers:keepers.slice(0,2),keeper:keepers[0]||null,...aiSpecialUnits([...forwards,...defense,...extras])};
}
function rivalEvent(club,kind,title,text){
 const w=state.rivals;if(!w)return;
 const item={id:`world-${w.nextEvent++}`,date:state.calendar.date,year:w.year,club,kind,title,text};
 feedbackRivalEvent(item);
 w.events.unshift(item);w.events=w.events.slice(0,80);
 if(leagueOf(club)===leagueOf()&&kind==='coach')managerMessage(`rival:${club}:${rivalsClubState(club).coach.id}`,title,text,'Ligavärlden',{link:'opponents'});
}
function rivalReplaceCoach(club,reason){
 const c=rivalsClubState(club);if(!c||club===managerClub())return;
 const old=c.coach;c.history.unshift({...old,left:state.calendar.date,reason});c.history=c.history.slice(0,12);
 c.coach=rivalCoach(club);c.tenure=0;c.confidence=58;c.familiarity=25;c.changes++;
 rivalEvent(club,'coach',`${club} byter tränare`,`${old.name} lämnar. ${c.coach.name} tar över med ${RIVAL_STYLES[c.coach.style].toLowerCase()}. ${reason}`);
}
function rivalInjury(p,club,rand,source){
 if(p.health?.injury)return;
 if(!p.health)p.health={load:0,injury:null,clearance:'rest'};
 const days=3+Math.floor(rand()*11);
 p.health.injury={name:['Muskelbesvär','Ledbesvär','Kontusionsskada'][Math.floor(rand()*3)],remaining:days,initial:days,readiness:50,source};p.health.clearance='rest';
 rivalEvent(club,'injury',`${p.name} saknas`,`${club} får klara sig utan ${p.name}. Prognosen är ${days} återhämtningsdagar före återgångsträning.`);
}
function rivalGrow(p,points,club){
 if(p.health?.injury)return;
 const a=ensurePlayerAttributes(p),d=ensureDevelopment(p),fields=Object.keys(a).filter(k=>a[k]<d.ceiling[k]);
 if(!fields.length)return;
 if(!fields.includes(p.aiTrainingKey)){const priorities=p.pos==='MV'?['positioning','reflexes','reboundControl','movement']:p.pos==='B'?['positioning','decisions','passing','checking']:rivalPlan(club).style==='counter'?['positioning','decisions','skating','passing']:['shooting','passing','vision','puckControl'];const useful=fields.filter(k=>priorities.includes(k));p.aiTrainingKey=(useful.length?useful:fields).sort((x,y)=>(d.ceiling[y]-a[y])-(d.ceiling[x]-a[x])||a[x]-a[y])[0];}
 const key=p.aiTrainingKey;
 if(!developmentAdvance(p,key,points))return;
 delete p.aiTrainingKey;
 if(p.age<=23)rivalEvent(club,'development',`${p.name} utvecklas`,`${p.age}-åringen i ${club} tar ett steg i ${(p.pos==='MV'?GOALIE_ATTRIBUTES:SKATER_ATTRIBUTES)[key].toLowerCase()} genom träning och matchvana.`);
}
function rivalsDay(){
 ensureRivals();const w=state.rivals;if(!w||w.lastDay===state.calendar.date)return;
 w.lastDay=state.calendar.date;
 for(const [club,c] of Object.entries(w.clubs)){
  if(club===managerClub())continue;
  const today=state.calendar.date,fixture=state.schedule.some(g=>!g.played&&g.date===today&&(g.home===club||g.away===club));
  const tomorrowDate=calAdd(today,1),tomorrow=state.schedule.some(g=>!g.played&&g.date===tomorrowDate&&(g.home===club||g.away===club));
  const rand=rivalRandom(`${today}:${club}:day`);
  c.familiarity=Math.min(85,c.familiarity+1);
  if(!fixture){const l=rivalLineup(club);dynamicsTrain(club,[...l.lines.map(ps=>ps.filter(p=>p.fatigue<55&&medicalCanTrain(p)).map(p=>p.id)),...[0,1,2].map(i=>l.defense.slice(i*2,i*2+2).filter(p=>p.fatigue<55&&medicalCanTrain(p)).map(p=>p.id))],'tactics',today);}
  for(const p of state.clubRosters[club]||[]){
   if(fixture){p.fatigue=Math.max(0,(p.fatigue||0)-12);continue;}
   if(p.health?.injury){p.fatigue=Math.max(0,(p.fatigue||0)-25);continue;}
   const session={type:tomorrow?'matchprep':'skills',intensity:'normal'},load=p.fatigue>=55?'rest':'normal';
   const effect=trainingSessionEffect(p,session,load,{coaching:c.coach.coaching,factor:1,goalieFactor:1});
   p.fatigue=effect.fatigue;
   if(p.health)p.health.load=attrClamp((p.health.load||0)+(effect.rest?0:effect.hard?12:5),0,100);
   if(!effect.rest)rivalGrow(p,effect.points,club);
   if(!effect.rest&&rand()<.0004*medicalRisk(p,effect.hard))rivalInjury(p,club,rand,'träning');
  }
 }
}
function rivalLiveSetup(){
 const m=state.live;if(!m||m.finished||!rivalsClubState(m.opponent))return;
 if(m.aiTeam){aiRepairMatchUnits(m);return;}
 const l=rivalLineup(m.opponent,managerClub()),c=rivalsClubState(m.opponent);
 m.aiTeam={...l.plan,basePlan:{...l.plan},coachId:c.coach.id,coachName:c.coach.name,style:l.plan.style,baseStyle:l.plan.style,rotation:l.plan.rotation,
  forwards:l.forwards.map(p=>p.id),defense:l.defense.map(p=>p.id),extras:l.extras.map(p=>p.id),goalies:l.keepers.map(p=>p.id),keeper:l.keeper?.id??null,timeout:false,adjustment:null};
 aiRepairMatchUnits(m);
}
function rivalPreparationBonus(){
 const m=state.live;if(!m||m.friendly)return 0;
 if(!m.rivalPreparation)m.rivalPreparation={};
 let bonus=0;
 for(const s of state.stories?.active||[]){
  if(s.type!=='coach'||s.status!=='following'||s.opponent!==m.opponent)continue;
  const e=s.expectation;if(!e)continue;
  const met=e.id==='study'?e.sessions>=2:trainingSignature()===e.signature;
  const value=met?(e.id==='study'?.6:.4):0;
  m.rivalPreparation[s.id]={bonus:value,met,applied:Boolean(m.rivalPreparation[s.id]?.applied||value>0),sessions:e.sessions||0};bonus=Math.max(bonus,value);
 }
 return bonus;
}
function rivalLiveKeeper(){
 if(studioActive())return studioKeeper(1);
 rivalLiveSetup();const m=state.live;if(!m||m.aiGoaliePulled)return null;
 const pool=state.clubRosters[m.opponent]||[];
 const available=p=>medicalReady(p)&&(m.leagueBox?.players[m.opponent+':'+p.id]?.seconds||0)<medicalLimit(p);
 let p=pool.find(p=>samePlayerId(p.id,m.aiTeam?.keeper)&&available(p));
 if(!p){p=pool.filter(p=>p.pos==='MV'&&(!m.aiTeam?.goalies||m.aiTeam.goalies.some(id=>samePlayerId(id,p.id)))&&available(p)).sort((a,b)=>rivalRating(b)-rivalRating(a))[0];if(m.aiTeam)m.aiTeam.keeper=p?.id??null;}
 return p||null;
}
function rivalLiveRating(p,kind){
 if(!p)return 40;
 const m=state.live,extra=p.pos==='MV'?(m?.leagueBox?.players[m.opponent+':'+p.id]?.seconds||0)/300:(m?.rink?.oppFatigue?.[p.id]||0);
 return effectiveRating({...p,fatigue:attrClamp((p.fatigue||0)+extra,0,100)},kind);
}
function rivalLivePlayers(){
 rivalLiveSetup();const m=state.live,a=m.aiTeam;if(!a)return [];
 const dressed=new Set([...a.forwards,...a.defense,...(a.extras||[])].map(String));
 const pool=(state.clubRosters[m.opponent]||[]).filter(p=>(p.pos==='MV'||dressed.has(String(p.id)))&&medicalReady(p)&&(m.leagueBox?.players[m.opponent+':'+p.id]?.seconds||0)<medicalLimit(p));
 const penalized=p=>m.penaltiesOpp.some(x=>samePlayerId(x.playerId,p.id)||x.player===p.name||x.name===p.name);
 const ready=pool.filter(p=>p.pos!=='MV'&&!penalized(p));
 const clock=(m.period-1)*1200+m.minute*60+(m.second||0),sequence=aiCoachRotation(a);
 const line=sequence[Math.floor(clock/45)%sequence.length],pair=Math.floor(clock/60)%3;
 const own=Math.min(2,m.penaltiesHV.length),opp=Math.min(2,m.penaltiesOpp.length),ot=m.period===4&&!isPlayoffMatch();
 const count=(ot?Math.min(5,3+Math.max(0,own-opp)):5-opp)+(m.aiGoaliePulled?1:0);
 let ids=[...a.forwards.slice(line*3,line*3+3),...a.defense.slice(pair*2,pair*2+2)];
 if(hockeyChangeBlocked('opponent'))ids=m.rink.hockey.icingHold.ids;
 const preferred=own!==opp?[...ready].sort((a,b)=>rivalRating(b,own>opp?'attack':'defense')-rivalRating(a,own>opp?'attack':'defense')):ids.map(id=>ready.find(p=>samePlayerId(p.id,id))).filter(Boolean);
 const selected=[...new Map([...preferred,...ready].map(p=>[String(p.id),p])).values()].slice(0,count);
 const keeper=rivalLiveKeeper();if(keeper)selected.push(keeper);return selected;
}
function rivalLiveDecision(){
 rivalLiveSetup();const m=state.live,a=m?.aiTeam;if(!a)return;
 const elapsed=(m.period-1)*1200+m.minute*60+m.second,bucket=Math.floor(elapsed/120);if(a.lastDecisionBucket===bucket)return;a.lastDecisionBucket=bucket;
 const e=studioActive()?studioEngine():null;
 const decision=aiCoachDecision(m.opponent,a.basePlan||{style:a.baseStyle,rotation:a.rotation,tempo:'normal'},
  aiObserveMatch(a,{seconds:elapsed,gf:m.opp,ga:m.hv,shots:e?.stats[1].shots||m.shotsOpp||0,againstShots:e?.stats[0].shots||m.shotsHV||0,previous:a,linePoints:[0,1,2,3].map(i=>(a.forwards||[]).slice(i*3,i*3+3).reduce((n,id)=>{const r=m.leagueBox?.players[m.opponent+':'+id];return n+(r?.goals||0)+(r?.assists||0);},0)),energy:(a.forwards||[]).map(id=>(state.clubRosters[m.opponent]||[]).find(p=>samePlayerId(p.id,id))).filter(Boolean).reduce((n,p)=>n+matchEnergy(p),0)/Math.max(1,a.forwards.length),strength:Math.min(2,m.penaltiesHV.length)-Math.min(2,m.penaltiesOpp.length)}));
 if(aiDecisionKey(a)!==aiDecisionKey(decision)){a.adjustment=decision.style;a.coachChanges??=[];a.coachChanges.push({seconds:elapsed,reason:decision.reason,response:decision.response});a.coachChanges=a.coachChanges.slice(-20);addEvent(`${a.coachName}: ${decision.reason} Stabens förslag: ${decision.response}`,'strategy');}
 for(const key of ['style','posture','tempo','forecheck','rotation','shiftLimit','matchup','reason','response','situation','changedAt','hotLine'])a[key]=decision[key];
 if(!a.timeout&&decision.timeout){a.timeout=true;matchRecover(60,'opponent-timeout');addEvent(`${a.coachName} tar timeout och samlar ${m.opponent}.`,'strategy');}
}

function rivalSimulate(game){
 ensureRivals();const rand=rivalRandom(`${state.season.year}:${game.round}:${game.home}:${game.away}:${game.seriesId||'regular'}:match`);
 const names=[game.home,game.away],sides=names.map(club=>{
  const l=rivalLineup(club,club===game.home?game.away:game.home);
  const players=[...l.forwards,...l.defense,...l.extras,...l.keepers];
  return {l,basePlan:{...l.plan},decisions:[],pairSeconds:{},pairResults:{},rows:new Map(players.map(p=>[String(p.id),leagueStatRow(p,club)])),goals:0,shots:0,pp:0,ppGoals:0,pens:[]};
 });
 // Attributes do not change during a background fixture: snapshot once per player.
 const values=new Map(),energy=new Map(),workload=new Map(),roles=new Map(),specialFit=new Map();
 for(const side of sides)for(const p of [...side.l.forwards,...side.l.defense,...side.l.extras,...side.l.keepers]){
  values.set(p,{...ensurePlayerAttributes(p)});energy.set(p,readinessCeiling(p.fatigue||0));workload.set(p,0);
 }
 const chemistry=new Map(),chemistryCache=new Map();
 const updateChemistry=ice=>{
  for(const side of [0,1])for(const defense of [false,true]){
   const ps=ice[side].filter(p=>(p.pos==='B')===defense),key=names[side]+':'+ps.map(p=>String(p.id)).sort().join('|');
   if(!chemistryCache.has(key))chemistryCache.set(key,lineChemistry(ps.map(p=>p.id),names[side]).value);
   for(const p of ps)chemistry.set(p,chemistryCache.get(key));
  }
 };
 const attribute=(p,k)=>readinessAttribute(values.get(p)?.[k]||10,k,energy.get(p)??readinessCeiling(p.fatigue||0),roles.has(p)?readinessFit(p,roles.get(p),specialFit.get(p)):1,chemistry.get(p)??50,p.morale??70);
 const rating=(p,kind='goalie')=>{
  const keys=kind==='attack'?['shooting','passing','vision','skating']:kind==='defense'?['positioning','decisions','workRate','discipline']:['reflexes','positioning','reboundControl','movement'];
  return keys.reduce((n,k)=>n+attribute(p,k),0)/keys.length;
 };
 const recover=seconds=>{
  for(const side of sides)for(const p of [...side.l.forwards,...side.l.defense,...side.l.extras,...side.l.keepers])
   energy.set(p,readinessRecover(energy.get(p)??100,seconds,values.get(p)?.stamina||10,readinessCeiling((p.fatigue||0)+(workload.get(p)||0))));
 };
 let time=0,overtime=false,shootout=false;
 const weighted=(players,keys)=>{
  if(!players.length)return null;
  const weights=players.map(p=>Math.max(1,keys.reduce((n,k)=>n+attribute(p,k),0))**2);let r=rand()*weights.reduce((n,v)=>n+v,0);
  return players.find((p,i)=>(r-=weights[i])<=0)||players.at(-1);
 };
 const row=(side,p)=>sides[side].rows.get(String(p.id));
 const onIce=side=>{
  const b=sides[side],l=b.l,sequence=aiCoachRotation(l.plan),other=sides[1-side],otherSequence=aiCoachRotation(other.l.plan);
  const shift=Math.max(20,l.plan.shiftLimit||40),opposingShift=Math.max(20,other.l.plan.shiftLimit||40);
  const opposingLine=otherSequence[Math.floor(time/opposingShift)%otherSequence.length];
  const idx=l.plan.matchup&&opposingLine===0?l.plan.checkingLine:sequence[Math.floor(time/shift)%sequence.length],pair=Math.floor(time/60)%3;
  const available=[...l.forwards,...l.defense,...l.extras].filter(p=>!b.pens.some(x=>samePlayerId(x.id,p.id))&&row(side,p).seconds<medicalLimit(p));
  const diff=sides[1-side].pens.length-b.pens.length;
  const count=overtime&&!game.seriesId?Math.min(5,3+Math.max(0,diff)):5-Math.min(2,b.pens.length);
  const special=l[(diff>0?'pp':'pk')+(Math.floor(time/shift)%2+1)]||[];
  let preferred=[...l.lines[idx],...l.defense.slice(pair*2,pair*2+2)];
  if(diff){
   const selected=new Set(),groups=diff>0?['B','F','F','B','F']:['B','B','F','F'];
   preferred=groups.map((group,i)=>{
    const natural=available.filter(p=>worldGroup(p)===group&&!selected.has(p));
    const pool=natural.length?natural:available.filter(p=>!selected.has(p));
    const p=pool.find(p=>samePlayerId(p.id,special[i]))||pool.sort((a,b)=>rating(b,diff>0?'attack':'defense')-rating(a,diff>0?'attack':'defense'))[0];
    if(p)selected.add(p);return p;
   }).filter(Boolean);
  }
  if(overtime&&!game.seriesId&&!diff)preferred=[...l.lines[idx].slice(0,2),...l.defense.slice(pair*2,pair*2+1)];
  const chosen=[...new Map([...preferred,...available].filter(p=>available.includes(p)).map(p=>[String(p.id),p])).values()].slice(0,count);
  const slots=diff>0?['LD','LW','RW','RD','C']:diff<0?['LD','RD','LW','RW']:overtime&&!game.seriesId?['LW','C','LD','RD','RW']:count<5?['LW','C','LD','RD']:['LW','C','RW','LD','RD'];
  chosen.forEach((p,i)=>{roles.set(p,slots[i]||'X');specialFit.set(p,Boolean(b.pens.length+sides[1-side].pens.length));});
  return chosen;
 };
 const attempt=(side,ice,force=false)=>{
  updateChemistry(ice);
  const b=sides[side],other=sides[1-side],players=ice[side],defenders=ice[1-side];
  const shooter=weighted(players,['shooting','composure','positioning']);if(!shooter)return false;
  const pp=players.length>defenders.length,keeper=other.l.keeper;
  b.shots++;row(side,shooter).shots++;
  const finish=(attribute(shooter,'shooting')+attribute(shooter,'composure'))/2,goalie=keeper?rating(keeper):1;
  const chance=attrClamp(.088+(finish-goalie)*.008+(pp?.035:0)+(keeper?0:.55),.025,.7);
  const goal=force||rand()<chance;
  if(keeper)row(1-side,keeper)[goal?'against':'saves']++;
  if(!goal)return false;
  b.goals++;row(side,shooter).goals++;
  for(const team of [0,1])for(let i=0;i<ice[team].length;i++)for(let j=i+1;j<ice[team].length;j++){
   const key=dynamicsKey(ice[team][i].id,ice[team][j].id);sides[team].pairResults[key]=(sides[team].pairResults[key]||0)+(team===side?1:-1);
  }
  if(pp){b.ppGoals++;other.pens.shift();}
  let eligible=players.filter(p=>p!==shooter);
  for(const probability of [.86,.5]){if(!eligible.length||rand()>probability)break;const p=weighted(eligible,['passing','vision']);row(side,p).assists++;eligible=eligible.filter(q=>q!==p);}
  return true;
 };
 const tick=()=>{
  if(time%120===0)for(let side=0;side<2;side++){
   const b=sides[side],other=sides[1-side],decision=aiCoachDecision(names[side],b.basePlan,aiObserveMatch(b,{seconds:time,gf:b.goals,ga:other.goals,shots:b.shots,againstShots:other.shots,previous:b.l.plan,linePoints:[0,1,2,3].map(i=>b.l.forwards.slice(i*3,i*3+3).reduce((n,p)=>{const r=b.rows.get(String(p.id));return n+(r?.goals||0)+(r?.assists||0);},0)),energy:b.l.forwards.reduce((n,p)=>n+(energy.get(p)??100),0)/Math.max(1,b.l.forwards.length),strength:Math.min(2,other.pens.length)-Math.min(2,b.pens.length)}));
   if(aiDecisionKey(decision)!==aiDecisionKey(b.l.plan))b.decisions.push({seconds:time,reason:decision.reason,response:decision.response});
   b.decisions=b.decisions.slice(-20);
   if(decision.timeout&&!b.timeout){b.timeout=true;for(const p of [...b.l.forwards,...b.l.defense,...b.l.extras,...b.l.keepers])energy.set(p,readinessRecover(energy.get(p)??100,60,values.get(p)?.stamina||10,readinessCeiling((p.fatigue||0)+(workload.get(p)||0))));b.decisions.push({seconds:time,reason:'Tar timeout för återhämtning och en sista offensiv.'});}
   b.decisions=b.decisions.slice(-20);b.l.plan=decision;
  }
  const ice=[onIce(0),onIce(1)];updateChemistry(ice);
  for(let side=0;side<2;side++){
   const l=sides[side].l;
   for(const p of [...l.forwards,...l.defense,...l.extras,...l.keepers]){
    const goalie=p.pos==='MV',playing=goalie?p===l.keeper:ice[side].includes(p),stamina=goalie?10:values.get(p)?.stamina||10;
    const load=readinessLoad(l.plan.tempo,l.plan.forecheck),used=playing?20:0;
    workload.set(p,(workload.get(p)||0)+readinessWork(used,stamina,goalie,load));
    energy.set(p,readinessEnergy(energy.get(p)??100,20,playing,stamina,goalie,load,ice[side].length<ice[1-side].length,1,readinessCeiling((p.fatigue||0)+(workload.get(p)||0))));
   }
   if(l.keeper&&row(side,l.keeper).seconds>=medicalLimit(l.keeper))l.keeper=l.keepers.filter(p=>row(side,p).seconds<medicalLimit(p)).sort((a,b)=>rating(b)-rating(a))[0]||null;
   for(const p of ice[side])row(side,p).seconds+=20;
   for(let i=0;i<ice[side].length;i++)for(let j=i+1;j<ice[side].length;j++){const key=dynamicsKey(ice[side][i].id,ice[side][j].id);sides[side].pairSeconds[key]=(sides[side].pairSeconds[key]||0)+20;}
   if(sides[side].l.keeper)row(side,sides[side].l.keeper).seconds+=20;
  }
  time+=20;
  const side=rand()<.51?0:1,b=sides[side],other=sides[1-side];
  const avg=(players,keys)=>players.length?players.reduce((n,p)=>n+keys.reduce((v,k)=>v+attribute(p,k),0)/keys.length,0)/players.length:1;
  const creation=avg(ice[side],['passing','vision','skating']),resistance=avg(ice[1-side],['positioning','decisions','workRate']);
  const pp=ice[side].length>ice[1-side].length;
  const ppKeys=b.l.plan.pp==='131'?['passing','vision','puckControl']:b.l.plan.pp==='overload'?['passing','puckControl','workRate']:['shooting','passing','positioning'];
  const pkKeys=other.l.plan.pk==='diamond'?['skating','workRate','decisions']:['positioning','discipline','decisions'];
  const specialFit=pp?(avg(ice[side],ppKeys)-creation)-(avg(ice[1-side],pkKeys)-resistance):0;
  const tempo=b.l.plan.tempo==='high'?1.12:b.l.plan.tempo==='low'?.91:1;
  const familiarity=(rivalsClubState(names[side])?.familiarity||40)-(rivalsClubState(names[1-side])?.familiarity||40);
  let goal=false;if(rand()<attrClamp((.36+(creation-resistance)*.012+familiarity*.0005+specialFit*.008)*tempo+(pp?.1:0),.15,.66))goal=attempt(side,ice);
  for(let s=0;s<2;s++){
   sides[s].pens=sides[s].pens.map(p=>({...p,left:p.left-20})).filter(p=>p.left>0);
   const risk=avg(ice[s],['discipline']);
   if(sides[s].pens.length<2&&ice[s].length&&rand()<.018*(1+(12-risk)/20)*(sides[s].l.plan.style==='pressure'?1.2:1)){
    const p=ice[s][Math.floor(rand()*ice[s].length)];row(s,p).pim+=2;sides[s].pens.push({id:p.id,left:120});sides[1-s].pp++;
   }
  }
  return goal;
 };
 for(let i=0;i<180;i++){if(i>0&&i%60===0)recover(1200);tick();}
 if(sides[0].goals===sides[1].goals){
  overtime=true;
  for(let i=0;i<(game.seriesId?900:15)&&sides[0].goals===sides[1].goals;i++)tick();
  if(sides[0].goals===sides[1].goals){
   const advantage=((sides[0].l.keeper?rating(sides[0].l.keeper):1)-(sides[1].l.keeper?rating(sides[1].l.keeper):1))*.01;
   const winner=rand()<.5+advantage?0:1;
   if(game.seriesId)attempt(winner,[onIce(0),onIce(1)],true);
   else{shootout=true;sides[winner].goals++;}
  }
 }
 return {homeGoals:sides[0].goals,awayGoals:sides[1].goals,overtime,shootout,duration:time,
  rows:sides.flatMap(b=>[...b.rows.values()]),reports:sides.map((b,i)=>({club:names[i],coachId:rivalsClubState(names[i])?.coach.id,coachName:rivalsClubState(names[i])?.coach.name,style:b.l.plan.style,decisions:b.decisions,keeper:b.l.keeper?.id??null,shots:b.shots,pp:b.pp,ppGoals:b.ppGoals,pairSeconds:b.pairSeconds,pairResults:b.pairResults,workload:Object.fromEntries([...b.rows.keys()].map(id=>{const p=[...b.l.forwards,...b.l.defense,...b.l.extras,...b.l.keepers].find(p=>String(p.id)===id);return [id,workload.get(p)||0];}))}))};
}
function rivalAfterFixture(game,rows,reports,partial=false){
 if(!game||game.rivalsRecorded||!state.rivals)return;game.rivalsRecorded=true;
 if(game.home===managerClub()||game.away===managerClub()){
  const opponent=game.home===managerClub()?game.away:game.home,key=managerClub()+'|'+opponent;
  const meetings=state.rivals.duels[key]||(state.rivals.duels[key]=[]),home=game.home===managerClub();
  meetings.push({date:game.date,year:state.season.year,gf:home?game.homeGoals:game.awayGoals,ga:home?game.awayGoals:game.homeGoals,coachId:reports.find(r=>r.club===opponent)?.coachId||null});
  state.rivals.duels[key]=meetings.slice(-12);
 }
 for(const club of [game.home,game.away]){
  const c=rivalsClubState(club);if(!c)continue;
  const own=club===game.home,gf=own?game.homeGoals:game.awayGoals,ga=own?game.awayGoals:game.homeGoals,report=reports.find(r=>r.club===club)||{};
  if(report.pairSeconds){dynamicsCommit(club,report.pairSeconds,report.pairResults);delete report.pairSeconds;delete report.pairResults;}
  const actualWorkload=report.workload;delete report.workload;
  const entries=rows.filter(r=>r.club===club),keeper=entries.filter(r=>r.pos==='MV').sort((a,b)=>b.seconds-a.seconds)[0];
  const best=entries.filter(r=>r.pos!=='MV').sort((a,b)=>(b.goals+b.assists)-(a.goals+a.assists))[0];
  c.recent.push({date:game.date||state.calendar.date,year:state.season.year,opponent:own?game.away:game.home,gf,ga,partial,...report,keeper:keeper?.id??report.keeper??null,shots:entries.reduce((n,r)=>n+r.shots,0),againstShots:rows.filter(r=>r.club!==club).reduce((n,r)=>n+r.shots,0),star:best&&best.goals+best.assists?{id:best.id,name:best.name,points:best.goals+best.assists}:null});
  c.recent=c.recent.slice(-8);
  aiRecordMeeting(club,own?game.away:game.home,game,{...report,partial,shots:entries.reduce((n,r)=>n+r.shots,0)},
   {...reports.find(r=>r.club!==club),shots:rows.filter(r=>r.club!==club).reduce((n,r)=>n+r.shots,0)});
  if(club===managerClub())continue;
  if(!partial)for(const row of entries){const p=(state.clubRosters[club]||[]).find(p=>samePlayerId(p.id,row.id));if(p?.age<=21&&(row.goals||0)+(row.assists||0)>=3&&p.feedbackBreakoutYear!==state.season.year){p.feedbackBreakoutYear=state.season.year;feedbackNews('breakout:'+p.id+':'+state.season.year,club,'development',p.name+' kliver fram',`${row.goals||0} mål och ${row.assists||0} assist mot ${own?game.away:game.home}. En stark tävlingsmatch av ${p.age}-åringen; följ fortsättningen i ligans spelarstatistik.`);}}
  aiSettleFixture(club,game);
  if(!partial)aiAfterPlayerFixture(club,entries,gf,ga);
  if(report.decisions?.length)aiDecision(club,'tactics',report.decisions.at(-1).reason);
  c.tenure++;c.familiarity=Math.min(85,c.familiarity+2);
  const rand=rivalRandom(`${state.season.year}:${game.round}:${club}:after`);
  for(const r of entries){
   const p=(state.clubRosters[club]||[]).find(p=>samePlayerId(p.id,r.id));if(!p||partial)continue;
   const performance=p.pos==='MV'?(r.saves+r.against?(r.saves/(r.saves+r.against)-.9)*30:0):(r.goals+r.assists-.5);
   p.aiForm=attrClamp((p.aiForm||0)*.65+performance,-3,3);
   p.fatigue=attrClamp((p.fatigue||0)+(Number.isFinite(actualWorkload?.[p.id])?actualWorkload[p.id]:r.seconds/(p.pos==='MV'?300:100)),0,100);
   if(!p.health)p.health={load:0,injury:null,clearance:'rest'};p.health.load=attrClamp(p.health.load+r.seconds/240,0,100);
   if(r.seconds>=300)rivalGrow(p,2.5*(p.age<=23?1.3:.8)*Math.min(1.5,r.seconds/1200),club);
   const risk=.00018*r.seconds/60*(1+p.fatigue/45+p.health.load/60);
   if(rand()<risk)rivalInjury(p,club,rand,'match');
  }
  if(!game.seriesId){
   const rank=leagueTable(leagueOf(club)).findIndex(t=>t.name===club)+1;
   const expectation=attrClamp((rank-c.target)*.18,-1,1.5);
   c.confidence=attrClamp(c.confidence+(gf>ga?3:-4)-expectation,0,100);
   if(c.tenure>=10&&c.recent.slice(-6).filter(g=>g.gf<g.ga).length>=4&&c.confidence<30&&c.changes<2)rivalReplaceCoach(club,`Styrelsen reagerar på resultaten. Laget ligger på plats ${rank}, med mål om topp ${c.target}.`);
  }
 }
}
function rivalBriefText(club){
 const c=rivalsClubState(club);if(!c)return 'Ingen motståndarrapport finns ännu.';
 const games=c.recent.slice(-5),l=rivalLineup(club,managerClub()),out=(state.clubRosters[club]||[]).filter(p=>!medicalReady(p));
 const form=games.length?`${games.filter(g=>g.gf>g.ga).length} segrar på de senaste ${games.length} registrerade matcherna. Mål ${games.reduce((n,g)=>n+g.gf,0)}–${games.reduce((n,g)=>n+g.ga,0)}.`:'Vi har ännu inga matcher att bedöma i den här säsongen.';
 const style=l.plan.style,advice=style==='pressure'?'De söker hög press. Snabba passningar ur egen zon och utvilade puckförare kan hjälpa oss.':style==='counter'?'De söker kontringar. Behåll täckning bakom pucken och undvik att båda backarna går samtidigt.':'De söker kontrollerade anfall. Disciplin i mitten och press på passningsalternativen blir viktiga.';
 return `${c.coach.name} leder ${club}. Förväntad spelidé: ${RIVAL_STYLES[style].toLowerCase()}. ${form}\n${l.keeper?'Trolig målvakt: '+l.keeper.name+'.':'Ingen spelklar målvakt finns just nu.'} ${out.length?out.map(p=>p.name).join(', ')+' saknas.':'Inga kända skadeavbräck.'}\n${advice} ${l.plan.reason}\nPowerplay: ${l.plan.pp}. Boxplay: ${l.plan.pk==='diamond'?'diamant':'box'}.\nUttagningen är en prognos. Tränaren kan ändra planen under matchen.`;
}
function rivalsOpen(club){rivalsSelected=rivalsClubState(club)&&club!==managerClub()?club:null;deskNavigate('opponents');}
function rivalsDeskView(){
 const club=opponent(),c=rivalsClubState(club);if(!c)return '';
 const l=rivalLineup(club),events=state.rivals.events.filter(e=>e.club===club&&e.date>=calAdd(state.calendar.date,-14));
 return `<section class="rival-desk"><div><span class="desk-kicker">INFÖR NÄSTA MOTSTÅND</span><h2>${trainingSafe(club)}</h2><p>${trainingSafe(c.coach.name)} · ${RIVAL_STYLES[l.plan.style]}${c.confidence<35?' · Tränaren är pressad':''}</p>${events.length?`<p class="rival-update">${trainingSafe(events[0].title)}</p>`:''}</div><button class="btn secondary" onclick="rivalsOpen(null)">Läs motståndsrapporten</button></section>`;
}
function rivalFormHTML(games){return games.length?`<div class="rival-form" aria-label="Senaste resultaten">${games.map(g=>`<span class="${g.gf>g.ga?'won':'lost'}" title="${trainingSafe(g.opponent)}: ${g.gf}–${g.ga}">${g.gf>g.ga?'V':'F'}<small>${g.gf}–${g.ga}</small></span>`).join('')}</div>`:'<p class="muted">Resultat följs från att den här uppdateringen börjar användas.</p>';}
function rivalsView(){
 ensureRivals();const clubs=Object.keys(state.rivals.clubs).filter(c=>c!==managerClub());
 const club=clubs.includes(rivalsSelected)?rivalsSelected:clubs.includes(opponent())?opponent():clubs[0],c=rivalsClubState(club),l=rivalLineup(club,managerClub()),recent=c.recent.slice(-5);
 const unavailable=(state.clubRosters[club]||[]).filter(p=>!medicalReady(p)),events=state.rivals.events.filter(e=>leagueOf(e.club)===leagueOf(club)).slice(0,8);
 const meetings=state.rivals.duels[managerClub()+'|'+club]||[],pp=recent.reduce((n,g)=>n+(g.pp||0),0),ppGoals=recent.reduce((n,g)=>n+(g.ppGoals||0),0);
 const leaders=new Map();for(const g of recent)if(g.star){const p=leaders.get(String(g.star.id))||{...g.star,points:0};p.points+=g.star.points;leaders.set(String(p.id),p);}
 const hot=[...leaders.values()].sort((a,b)=>b.points-a.points)[0];
 const pressure=c.confidence<30?'Nära ett tränarbyte':c.confidence<45?'Under press':c.confidence>=75?'Starkt stöd':'Arbetsro';
 return `<section class="rivals-page"><header class="desk-heading"><div><span class="desk-kicker">MATCHFÖRBEREDELSER · ${leagueName(club)}</span><h1>Motståndsrapport</h1><p>Tränaren, laget och det som förändrats sedan sist.</p></div><label>Granska klubb<select onchange="rivalsOpen(this.value)">${['SHL','HA'].map(id=>`<optgroup label="${LEAGUE_NAMES[id]}">${clubs.filter(n=>leagueOf(n)===id).map(n=>`<option value="${trainingSafe(n)}" ${n===club?'selected':''}>${trainingSafe(n)}</option>`).join('')}</optgroup>`).join('')}</select></label></header>
 <section class="rival-identity"><div>${careerBadge(club)}<span class="desk-kicker">${trainingSafe(club)}</span><h2>${trainingSafe(c.coach.name)}</h2><p>Fiktiv tränare i din karriär · Tillträdde ${c.coach.appointed?calText(c.coach.appointed):'vid starten'}</p></div><div><span class="rival-status">${pressure}</span><h3>${RIVAL_STYLES[l.plan.style]}</h3><p>${c.coach.youth?'Ger unga spelare en fördel vid jämna uttagningar.':'Låter prestation och ork avgöra uttagningen.'} ${l.plan.rotation==='topHeavy'?'Ger toppkedjorna mer istid.':l.plan.rotation==='rollFour'?'Rullar fyra kedjor.':'Fördelar istiden med tyngd på de två första kedjorna.'}</p>${l.plan.style!==c.coach.style?'<p class="rival-update">Den svaga formen har fått tränaren att pröva en annan spelidé.</p>':''}</div></section>
 <div class="rival-columns"><section class="rival-panel"><h2>Vad vi behöver förbereda</h2>${c.recruitmentNote?`<p><strong>Sportchefens arbete:</strong> ${trainingSafe(c.recruitmentNote)}</p>`:''}<p>${trainingSafe(rivalBriefText(club)).replace(/\n/g,'</p><p>')}</p><button class="btn secondary" onclick="deskNavigate('training')">Planera träningen</button> <button class="btn secondary" onclick="deskNavigate('tactics')">Se vår matchplan</button></section>
 <section class="rival-panel"><h2>Senaste ${recent.length||'registrerade'} matcherna</h2>${rivalFormHTML(recent)}<div class="rival-numbers"><div><span>Mål</span><strong>${recent.reduce((n,g)=>n+g.gf,0)}–${recent.reduce((n,g)=>n+g.ga,0)}</strong></div><div><span>Skott / match</span><strong>${recent.length?Math.round(recent.reduce((n,g)=>n+g.shots,0)/recent.length):'–'}</strong></div><div><span>Powerplay</span><strong>${pp?Math.round(ppGoals/pp*100)+' %':'–'}</strong><small>${ppGoals} mål / ${pp} lägen</small></div></div>${recent.some(g=>g.partial)?'<p>En del matchdata är ofullständig från en äldre sparning.</p>':''}${hot?`<p><strong>${trainingSafe(hot.name)}</strong> har varit lagets främsta poängspelare i minst en av dessa matcher.</p>`:''}<button class="rival-text-button" onclick="leagueStatsClub('${trainingSafe(club)}')">Hela lagets spelarstatistik →</button></section></div>
 <div class="rival-columns"><section class="rival-panel"><h2>Målvaktsläget</h2>${l.keeper?`<h3>${trainingSafe(l.keeper.name)}</h3><p>Trolig start · ${Math.round(100-(l.keeper.fatigue||0))} % ork</p><p>${c.recent.slice(-3).filter(g=>samePlayerId(g.keeper,l.keeper.id)).length} starter i de senaste tre registrerade matcherna. Tränaren väger förmåga, räddningsform och belastning.</p>`:'<p>Klubben saknar en spelklar målvakt.</p>'}<h3>Skadeavbräck</h3>${unavailable.length?unavailable.map(p=>`<p><strong>${trainingSafe(p.name)}</strong> · ${medicalStatus(p)}${p.health?.injury?.remaining?' · '+p.health.injury.remaining+' dagar till återgångsträning':''}</p>`).join(''):'<p>Alla spelare är medicinskt tillgängliga.</p>'}</section>
 <section class="rival-panel"><h2>Våra möten</h2>${meetings.length?[...meetings].reverse().slice(0,5).map(g=>`<div class="rival-meeting"><span>${g.date?calText(g.date):seasonLabel(g.year)}</span><strong>${managerClub()} ${g.gf}–${g.ga} ${trainingSafe(club)}</strong></div>`).join(''):'<p>Nästa möte blir ert första registrerade kapitel. Historiken följer med mellan säsongerna.</p>'}${c.history.length?`<details><summary>Tidigare tränare</summary>${c.history.map(h=>`<p><strong>${trainingSafe(h.name)}</strong> · ${calText(h.left)}<br>${trainingSafe(h.reason)}</p>`).join('')}</details>`:''}</section></div>
 <details class="rival-panel"><summary>Förväntade kedjor och backpar</summary><p>Prognos utifrån spelklarhet, attribut, form och tränarens prioriteringar.</p>${l.lines.map((line,i)=>`<div class="rival-meeting"><span>Kedja ${i+1}</span><strong>${line.map(p=>trainingSafe(p.name)).join(' · ')||'Ofullständig kedja'}</strong></div>`).join('')}${[0,1,2].map(i=>`<div class="rival-meeting"><span>Backpar ${i+1}</span><strong>${l.defense.slice(i*2,i*2+2).map(p=>trainingSafe(p.name)).join(' · ')||'Ofullständigt backpar'}</strong></div>`).join('')}</details>
 <details class="rival-panel"><summary>Tränarens anpassningar och klubbens långsiktiga plan</summary>${aiCoachReport(club)}${aiClubView(club)}</details>
 <details class="rival-panel"><summary>Nyheter i ${leagueName(club)}</summary><div class="rival-news">${events.map(e=>`<article><span class="desk-kicker">${calText(e.date)} · ${trainingSafe(e.club)}</span><h3>${trainingSafe(e.title)}</h3><p>${trainingSafe(e.text)}</p></article>`).join('')||'<p>Här följer du tränarbyten, skadeavbräck och spelare som utvecklas under säsongen.</p>'}</div></details></section>`;
}
function rivalStoryDetect(){
 const b=state.stories;if(!storiesReady()||!b||b.active.length>=3||b.active.some(s=>s.type==='coach')||b.matchCount-b.lastStart<2)return false;
 const next=state.schedule.filter(g=>!g.played&&(g.home===managerClub()||g.away===managerClub())).sort((a,b)=>a.round-b.round).slice(0,3);
 for(const g of next){
  const club=g.home===managerClub()?g.away:g.home,c=rivalsClubState(club);if(!c)continue;
  const changed=c.history[0]?.left>=calAdd(state.calendar.date,-14);
  const meetings=(state.rivals.duels[managerClub()+'|'+club]||[]).filter(m=>m.coachId===c.coach.id).slice(-2);
  const nemesis=meetings.length===2&&meetings.every(m=>m.gf<m.ga);
  if(!changed&&!nemesis)continue;
  const reason=changed?`${c.coach.name} har tagit över ${club}. Den nya tränarens grundidé är ${RIVAL_STYLES[c.coach.style].toLowerCase()}.`:`${c.coach.name} har vunnit de två senaste mötena med dig. ${club} väntar igen i kalendern.`;
  // A coach identity makes a new appointment a new chapter, even against the same club.
  const s=storiesCreate('coach',[],changed?'En ny röst på andra bänken':'Tränaren du ännu inte knäckt',`${reason} Ska ni lägga träningstid på motståndet eller lita på er egen spelidé?`,{opponent:club,coachId:c.coach.id,coachName:c.coach.name,storyKey:c.coach.id+':'+club,targetDate:g.date});
  if(s)return true;
 }
 return false;
}
function rivalStoryChoices(){
 return [{id:'study',label:'Läs deras nya spel',detail:'Genomför två pass med matchförberedelse eller taktiskt samspel före mötet. Då får laget ett litet extra stöd i passningsspel, positionering och beslut under just den matchen.'},
  {id:'identity',label:'Lita på vår spelidé',detail:'Behåll samma spelsätt, forecheck, tempo och anfallsidé fram till mötet. Kontinuiteten ger ett mindre stöd så länge matchplanen behålls. Du kan fortfarande välja nya spelare.'}];
}
function rivalStoryTraining(session){
 if(!['tactics','matchprep'].includes(session.type))return;
 for(const s of state.stories?.active||[])if(s.type==='coach'&&s.status==='following'&&s.expectation?.id==='study'){
  s.expectation.sessions=Math.min(2,(s.expectation.sessions||0)+1);
  storiesChapter(s,'Arbetet på träningsisen',`${s.expectation.sessions} av 2 förberedande pass genomförda inför ${s.opponent}.`);
 }
}
function rivalStoryAdvance(s,sample){
 if(sample.opponent!==s.opponent){
  if(s.elapsed>=10)storiesClose(s,'Mötet får vänta','Inget möte kunde följas upp inom tio matcher. Inga spelarlöften eller avdrag följer med.');return;
 }
 const prepared=state.live?.rivalPreparation?.[s.id],won=sample.own>sample.against;
 const current=rivalsClubState(s.opponent)?.coach;
 const applied=prepared?.applied;
 storiesClose(s,won?'Du vann mötet':'Ett nytt kapitel i rivaliteten',`${managerClub()} ${sample.own}–${sample.against} ${s.opponent}. ${current?.id!==s.coachId?'Tränarbänken hann förändras igen före mötet. ':''}${sample.partial?'Matchdata är ofullständig. ':''}${applied?'Träningsarbetet eller kontinuiteten gav stöd i matchen.':'Förberedelsevillkoret var inte uppfyllt; inget extra stöd användes.'} Resultatet avgjordes på isen. Mötet finns kvar i motståndsrapporten.`);
}
function rivalRecruitNeeds(club){return aiSquadNeeds(club);}
function rivalScoutMarket(club){return aiScoutClub(club);}
