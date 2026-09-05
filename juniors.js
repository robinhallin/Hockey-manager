"use strict";
// Fictional academy players and development fixtures, separate from senior league statistics.
const JUNIOR_PATHS={junior:'Juniorlaget',guest:'A-träning + juniormatcher',loan:'Utlånad',senior:'A-laget'};
const JUNIOR_LOANS={local:{name:'Björkdal HC',level:9,minutes:20,coach:11,description:'Fiktiv utvecklingsklubb · större roll, lugnare motstånd'},challenge:{name:'Sjöstad IK',level:12,minutes:15,coach:15,description:'Fiktiv utvecklingsklubb · högre nivå, hårdare konkurrens'}};
function juniorPlayers(){return [...(state.juniors?.roster||[]),...managerRoster().filter(p=>p.academy)];}
function juniorById(id){return juniorPlayers().find(p=>samePlayerId(p.id,id));}
function juniorRoles(p){return p.pos==='MV'?['Målvakt']:p.pos==='B'?['Offensiv back','Defensiv back']:['Målskytt','Spelfördelare','Tvåvägsforward','Checkingforward'];}
function ensureJuniors(){
 if(!state.careerStarted)return;
 if(!state.juniors){
  state.juniors={version:1,year:state.season?.year||2026,nextId:1,roster:[],reports:[],matches:[],intakes:[],lastFixture:null,trainingKeys:[],selected:null,assessor:'assistant',message:'',rng:Math.floor(attrSeed(`${managerClub()}:juniors`)*4294967296)};
  const positions=['MV','MV',...Array(6).fill('B'),...Array(4).fill('C'),...Array(4).fill('VF'),...Array(4).fill('HF')];
  state.juniors.roster=positions.map(pos=>createJunior(pos,false));
  state.juniors.selected=state.juniors.roster[0].id;
  state.juniors.intakes.push({year:state.juniors.year,names:state.juniors.roster.map(p=>p.name),initial:true});
 }
 for(const p of managerRoster().filter(p=>p.academy)){p.academy.path='senior';p.academy.seniorContract=true;}
}
function juniorRoll(){const s=state.juniors;s.rng=(Math.imul(s.rng,1664525)+1013904223)>>>0;return s.rng/4294967296;}
function createJunior(pos,intake){
 const s=state.juniors,n=s.nextId++,id=`junior-${managerClub()}-${s.year}-${n}`;
 const first=['Albin','Vilgot','Noel','Isak','Hugo','Elias','Viktor','Axel','Olle','Melvin','Leo','Arvid','Gustav','Sixten','Anton','Emil'];
 const last=['Berglund','Sjöberg','Lindholm','Nyström','Ek','Hallberg','Fors','Sund','Lindgren','Björk','Hedlund','Sand','Dahl','Nord','Engström','Strand'];
 const p={id,name:`${first[Math.floor(juniorRoll()*first.length)]} ${last[(n+Math.floor(juniorRoll()*last.length))%last.length]}`,pos,age:intake?16:16+Math.floor(juniorRoll()*4),fictional:true,nationality:'SWE',overall:62,potential:80,shooting:62,passing:62,defense:62,physical:62,salary:350000,contractYears:3,value:700000,fatigue:0,morale:65,happiness:70,goals:0,assists:0,shots:0,pim:0,games:0,squadRole:'Breddspelare',promisedRole:'Breddspelare',developmentFocus:'Balanserad',trainingLoad:'normal',trainingProgress:{},health:{load:0,injury:null,clearance:'rest'}};
 ensurePlayerAttributes(p);const roles=juniorRoles(p),role=roles[Math.floor(juniorRoll()*roles.length)],weights=PLAYER_ROLES[role],ceiling={};
 const talent=2+juniorRoll()*6;
 for(const key of Object.keys(p.attributes)){
  p.attributes[key]=Math.max(1,Math.min(15,Math.round(4+juniorRoll()*6+(p.age-16)*.6+(weights[key]?1.5:0))));
  ceiling[key]=Math.min(20,p.attributes[key]+Math.round(talent*(.5+juniorRoll()*.7)));
 }
 p.attributeGrowth=talent;p.trainingBaseline={...p.attributes};
 p.academy={path:'junior',role,mentor:null,ceiling,cursor:0,observations:0,baseline:{...p.attributes},history:[],games:0,seconds:0,goals:0,assists:0,missed:0,intake:s.year,loan:null};
 return p;
}
function juniorNotice(text){state.juniors.message=text;save();render();}
function juniorReport(title,body){const s=state.juniors;s.reports.unshift({year:s.year,round:state.round,title,body});s.reports=s.reports.slice(0,50);managerMessage(`junior:${s.year}:${state.round}:${state.training?.nextMessageId}`,title,body,'Junioransvarig',{link:'juniors'});}
function juniorLocked(){return Boolean(state.live&&!state.live.finished);}
function juniorSelect(id){if(!juniorById(id))return;state.juniors.selected=id;state.page='juniors';save();render();}
function juniorSet(id,key,value){
 const p=juniorById(id);if(!p)return;if(juniorLocked())return juniorNotice('Ändra utvecklingsplaner mellan matcher.');
 if(key==='role'&&juniorRoles(p).includes(value)){p.academy.role=value;p.developmentFocus='Balanserad';}
 else if(key==='mentor'){
  if(value==='')p.academy.mentor=null;
  else{const m=managerRoster().find(q=>samePlayerId(q.id,value));if(!m||m.age<27||m.id===p.id||(m.pos==='MV')!==(p.pos==='MV'))return;
   if(juniorPlayers().filter(q=>q.id!==p.id&&samePlayerId(q.academy.mentor,m.id)).length>=2)return juniorNotice('En mentor kan följa högst två talanger.');p.academy.mentor=m.id;}
 }else if(key==='load'&&['normal','light','rest'].includes(value))p.trainingLoad=value;
 else if(key==='path'&&['junior','guest'].includes(value)&&!isOwnPlayer(p)&&!p.academy.loan)p.academy.path=value;
 else return;
 juniorNotice(`${p.name}: utvecklingsplanen är uppdaterad.`);
}
function juniorPromote(id){
 const p=state.juniors.roster.find(p=>samePlayerId(p.id,id));if(!p)return;
 if(juniorLocked())return juniorNotice('Spelare flyttas mellan trupperna mellan matcher.');
 if(p.academy.loan)return juniorNotice('Återkalla lånet innan spelaren flyttas upp.');
 if(annualWageCost()+(p.academy.seniorContract?0:p.salary)>wageBudget())return juniorNotice('Löneutrymmet räcker inte för uppflyttningen.');
 state.juniors.roster=state.juniors.roster.filter(q=>q.id!==p.id);managerRoster().push(p);p.academy.path='senior';p.academy.seniorContract=true;if(p.contractYears<=0)p.contractYears=3;
 syncManagerRoster();ensureManagementData();ensureMedical();ensureLocker();ensureTrainingData();repairMedicalLines();
 juniorReport(`${p.name} tar steget till A-laget`,`Spelaren får ${careerMoney(p.salary)} per år och ${p.contractYears} års kontrakt. Träningen hjälper, men matchutveckling kräver faktisk istid. Välj plats under Kedjor.`);
 juniorNotice(`${p.name} finns nu i A-truppen.`);
}
function juniorReturn(id){
 const p=managerRoster().find(q=>samePlayerId(q.id,id)&&q.academy);if(!p||p.age>20)return;
 if(state.juniors.roster.length>=30)return juniorNotice('Juniortruppen är full. Frigör en plats innan spelaren återgår.');
 if(juniorLocked())return juniorNotice('Truppbyten görs mellan matcher.');
 const group=q=>p.pos==='MV'?q.pos==='MV':p.pos==='B'?q.pos==='B':!['MV','B'].includes(q.pos),required=p.pos==='MV'?2:p.pos==='B'?6:12;
 if(managerRoster().filter(q=>q.id!==p.id&&group(q)&&medicalReady(q)).length<required)return juniorNotice('A-truppen behöver först en ersättare i positionsgruppen.');
 state.clubRosters[managerClub()]=managerRoster().filter(q=>q.id!==p.id);state.juniors.roster.push(p);p.academy.path='junior';
 syncManagerRoster();repairMedicalLines();juniorNotice(`${p.name} återgår till juniorlaget. A-avtalet behålls och räknas fortsatt i lönebudgeten.`);
}
function juniorLoan(id,destination){
 const p=state.juniors.roster.find(q=>samePlayerId(q.id,id)),offer=JUNIOR_LOANS[destination];if(!p||!offer)return;
 if(juniorLocked())return juniorNotice('Lån hanteras mellan matcher.');
 if(p.academy.loan)return juniorNotice('Spelaren är redan utlånad.');
 if(!medicalReady(p))return juniorNotice('Spelaren behöver återhämta sig innan ett lån kan börja.');
 p.academy.path='loan';p.academy.loan={destination,remaining:8,games:0,seconds:0};
 juniorNotice(`${p.name} lånas till ${offer.name} i åtta matchomgångar. Istiden avgörs av konkurrens och ork; lånet kan återkallas mellan matcher.`);
}
function juniorRecall(id){const p=state.juniors.roster.find(q=>samePlayerId(q.id,id));if(!p?.academy.loan)return;if(juniorLocked())return juniorNotice('Lån återkallas mellan matcher.');p.academy.loan=null;p.academy.path='junior';juniorNotice(`${p.name} är tillbaka från lånet.`);}
function juniorRelease(id){
 const p=state.juniors.roster.find(q=>samePlayerId(q.id,id));if(!p||p.age<=20||juniorLocked())return;
 if(p.academy.loan)return juniorNotice('Återkalla lånet först.');
 const compensation=p.academy.seniorContract?p.salary*p.contractYears:0;if(state.money<compensation)return juniorNotice('Kassan räcker inte för att lösa det återstående A-avtalet.');
 state.money-=compensation;p.contractYears=0;p.academy.seniorContract=false;state.juniors.roster=state.juniors.roster.filter(q=>q.id!==p.id);state.season.freeAgents.push(p);p.academy.mentor=null;
 juniorReport(`${p.name} lämnar juniorverksamheten`,'Spelaren är över junioråldern och har släppts till listan över kontraktslösa spelare.');juniorNotice(`${p.name} har lämnat klubben.`);
}
function juniorTarget(p){const all=Object.keys(PLAYER_ROLES[p.academy.role]).filter(k=>Object.hasOwn(p.attributes,k)),keys=all.filter(k=>p.attributes[k]<p.academy.ceiling[k]);return keys.length?keys[p.academy.cursor%keys.length]:all[0];}
function juniorGrow(p,points,key=juniorTarget(p)){
 if(!medicalCanTrain(p)||p.attributes[key]>=p.academy.ceiling[key])return false;
 return trainingGrowth(p,key,points);
}
function juniorMentor(p){const m=managerRoster().find(q=>samePlayerId(q.id,p.academy.mentor));return m&&m.age>=27&&medicalCanTrain(m)&&m.trainingLoad!=='rest'&&m.fatigue<75&&p.academy.path!=='loan'?m:null;}
function juniorTraining(session,key){
 ensureJuniors();const s=state.juniors;if(s.trainingKeys.includes(key))return;s.trainingKeys.push(key);s.trainingKeys=s.trainingKeys.slice(-240);
 for(const p of juniorPlayers()){
  const a=p.academy;a.observations=Math.min(100,a.observations+1);
  if(isOwnPlayer(p)){
   const mentor=juniorMentor(p);if(mentor&&session.type!=='recovery'&&medicalCanTrain(p)&&p.trainingLoad!=='rest'){juniorGrow(p,1.2*(mentor.social?.leadership||10)/10,p.pos==='MV'?'composure':'workRate');p.morale=Math.min(85,p.morale+.3);}continue;
  }
  if(!medicalCanTrain(p)||p.trainingLoad==='rest'||(a.path==='guest'&&session.type==='recovery')){p.fatigue=Math.max(0,p.fatigue-20);continue;}
  const offer=a.loan?JUNIOR_LOANS[a.loan.destination]:null;
  const coach=offer?.coach||(a.path==='guest'?(state.staff.find(q=>q.id===(p.pos==='MV'?'goalie':'assistant'))?.coaching||13):12);
  const fresh=Math.max(.2,1-p.fatigue/100),age=p.age<=20?1.15:.75;
  juniorGrow(p,5*coach/12*fresh*age*(p.trainingLoad==='light'?.6:1));
  const mentor=juniorMentor(p);if(mentor){juniorGrow(p,1.2*(mentor.social?.leadership||10)/10,p.pos==='MV'?'composure':'workRate');p.morale=Math.min(85,p.morale+.3);}
  p.fatigue=trainingClamp(p.fatigue+(p.trainingLoad==='light'?-12:a.path==='guest'&&session.intensity==='hard'?6:-8));
 }
}
function juniorAppearance(p,seconds,level,opponent){
 const a=p.academy;seconds=Math.max(0,Math.min(seconds,medicalLimit(p)));if(!medicalReady(p))seconds=0;
 const skill=attributeWeighted(p.attributes,PLAYER_ROLES[a.role]),challenge=Math.max(.25,1-Math.abs(skill-level)/12);
 const goals=p.pos==='MV'?0:seconds>0&&juniorRoll()<seconds/4000?1:0,assists=p.pos==='MV'?0:seconds>0&&juniorRoll()<seconds/3000?1:0;
 a.history.unshift({year:state.season.year,round:state.round,opponent,seconds,goals,assists,path:a.path});a.history=a.history.slice(0,16);
 if(seconds>0){a.games++;a.seconds+=seconds;a.goals+=goals;a.assists+=assists;juniorGrow(p,5*Math.min(1.5,seconds/1200)*challenge);a.missed=0;}else a.missed++;
 p.fatigue=trainingClamp(p.fatigue+seconds/180-10);return {id:p.id,name:p.name,seconds,goals,assists};
}
function juniorFixture(key){
 ensureJuniors();const s=state.juniors;if(s.lastFixture===key)return;s.lastFixture=key;
 const home=s.roster.filter(p=>!p.academy.loan&&p.age<=20&&medicalReady(p)&&p.fatigue<80);
 const keepers=home.filter(p=>p.pos==='MV'),backs=home.filter(p=>p.pos==='B'),forwards=home.filter(p=>!['MV','B'].includes(p.pos));
 const playable=keepers.length&&backs.length>=2&&forwards.length>=3,opponent=['Norrvik J20','Sjöängen J20','Bergdala J20','Österhamn J20'][state.round%4];
 const selectedGoalie=keepers.length?keepers[(state.round+s.year)%keepers.length].id:null,rows=[];
 for(const p of s.roster){
  const a=p.academy;
  if(a.loan){const offer=JUNIOR_LOANS[a.loan.destination],quality=attributeWeighted(p.attributes,PLAYER_ROLES[a.role]);
   const minutes=p.pos==='MV'?(juniorRoll()<.55?60:0):Math.round(Math.max(0,Math.min(24,offer.minutes+(quality-offer.level)*1.5-p.fatigue/12+(juniorRoll()-.5)*6)));
   const row=juniorAppearance(p,minutes*60,offer.level,offer.name);a.loan.games+=row.seconds>0?1:0;a.loan.seconds+=row.seconds;a.loan.remaining--;
   if(a.loan.remaining<=0){juniorReport(`${p.name} är tillbaka från lån`,`${offer.name}: ${a.loan.games} matcher och ${Math.round(a.loan.seconds/60)} minuter. Läs utvecklingsrapporten innan nästa steg.`);a.loan=null;a.path='junior';}
  }else{let seconds=0;if(playable&&home.includes(p))seconds=p.pos==='MV'?(p.id===selectedGoalie?3600:0):Math.min(1800,Math.floor((p.pos==='B'?7200/backs.length:10800/forwards.length)));
   rows.push(juniorAppearance(p,seconds,9,opponent));}
 }
 if(playable){const goals=rows.reduce((n,p)=>n+p.goals,0);let assistsLeft=goals*2;
  for(const row of rows){const p=s.roster.find(p=>p.id===row.id),credited=Math.min(row.assists,Math.max(0,2*(goals-row.goals)),assistsLeft);assistsLeft-=credited;p.academy.assists+=credited-row.assists;row.assists=credited;p.academy.history[0].assists=credited;}
  s.matches.unshift({year:s.year,round:state.round,opponent,own:goals,against:Math.floor(juniorRoll()*6),players:rows});s.matches=s.matches.slice(0,16);}
 for(const p of managerRoster().filter(p=>p.academy)){
  const a=p.academy,seconds=state.live?.iceTime?.[p.id]||0;a.observations=Math.min(100,a.observations+2);
  a.history.unshift({year:s.year,round:state.round,opponent:state.live?.opponent||'A-match',seconds,goals:state.live?.analysis?.players?.[p.id]?.goals||0,assists:state.live?.analysis?.players?.[p.id]?.assists||0,path:'senior'});a.history=a.history.slice(0,16);
  if(seconds>=300)a.missed=0;else if(!medicalExcused(p,300))a.missed++;
 }
 if(state.round%4===0||!playable)juniorReport('Talangernas avstämning',`${playable?'Juniorlaget har spelat sin utvecklingsmatch.':'Juniorlaget saknar spelare: minst en målvakt, två backar och tre forwards behövs.'}\n${juniorPlayers().slice().sort((a,b)=>b.academy.missed-a.academy.missed).slice(0,3).map(p=>`${p.name}: ${juniorAdvice(p)}`).join('\n')}`);
}
function juniorNewYear(){
 ensureJuniors();const s=state.juniors,year=state.season.year;if(s.year===year)return;s.year=year;
 for(const p of s.roster){p.age++;p.fatigue=0;if(p.academy.seniorContract){p.contractYears=Math.max(0,p.contractYears-1);if(!p.contractYears)p.academy.seniorContract=false;}if(p.academy.loan){p.academy.loan=null;p.academy.path='junior';}}
 for(const p of juniorPlayers()){p.academy.baseline={...p.attributes};p.academy.games=0;p.academy.seconds=0;p.academy.goals=0;p.academy.assists=0;p.academy.missed=0;}
 const positions=['MV','B','B','C','VF','HF'],incoming=positions.slice(0,Math.max(0,30-s.roster.length)).map(pos=>createJunior(pos,true));s.roster.push(...incoming);
 s.intakes.unshift({year,names:incoming.map(p=>p.name)});s.intakes=s.intakes.slice(0,10);
 juniorReport(`Juniorintag ${seasonLabel(year)}`,`${incoming.length} nya, fiktiva talanger ansluter. ${s.roster.filter(p=>p.age>20).length} spelare har passerat junioråldern och behöver ett beslut om A-lag, lån eller avslut. Truppen har plats för 30 spelare; frigör platser inför nästa intag.`);
}
function juniorAssessment(p){
 const staff=state.staff.find(s=>s.id===state.juniors.assessor)||state.staff[0],a=p.academy,weights=PLAYER_ROLES[a.role];
 const peers=managerRoster().filter(q=>(q.pos==='MV')===(p.pos==='MV'));
 const baseline=peers.reduce((n,q)=>n+attributeWeighted(q.attributes,weights),0)/Math.max(1,peers.length);
 const known=Math.min(.85,.25+a.observations/100),special=staff.specialty===a.role?1:0;
 const error=(1-known)*1.5+(20-staff.ability-special)/15,potError=1+(20-staff.potential-special)/12+(1-known)*2;
 const bias=(attrSeed(`${p.id}:${staff.id}:junior`)-.5)*2;
 const value=attributeWeighted(p.attributes,weights)+bias*error,future=attributeWeighted(a.ceiling,weights)+bias*potError;
 const stars=n=>Math.round(attrClamp(2.5+(n-baseline)*.6,0,5)*2)/2;
 return {staff,current:`${stars(value-error)}–${stars(value+error)} ★`,potential:`${stars(future-potError)}–${stars(future+potError)} ★`,confidence:known<.45?'Låg':known<.7?'Medel':'God',error,potError};
}
function juniorAdvice(p){
 const a=p.academy,changes=Object.keys(p.attributes).filter(k=>p.attributes[k]>(a.baseline[k]||0)),labels=p.pos==='MV'?GOALIE_ATTRIBUTES:SKATER_ATTRIBUTES;
 const trend=changes.length?`Framsteg i ${changes.map(k=>labels[k].toLowerCase()).join(', ')}.`:'Inga hela attributsteg ännu; utveckling tar tid.';
 if(!medicalCanTrain(p))return `Rehabilitering går före utvecklingsplanen. ${trend}`;
 if(p.age>20&&!isOwnPlayer(p)&&!a.loan)return `Över junioråldern: välj A-lag, lån eller avslut. ${trend}`;
 if(p.fatigue>=65)return `Belastningen är hög. Ge utrymme för återhämtning. ${trend}`;
 if(a.missed>=3)return `Begränsad matchtid i ${a.missed} omgångar. Överväg annan miljö eller större roll. ${trend}`;
 if(a.loan)return `Följ faktisk istid hos ${JUNIOR_LOANS[a.loan.destination].name}; den är inte garanterad. ${trend}`;
 return `${trend} Följ ${a.role.toLowerCase()} över flera matcher innan du ändrar planen.`;
}
function juniorEmergency(pos){
 ensureJuniors();const p=state.juniors.roster.find(p=>p.pos===pos&&!p.academy.loan&&medicalReady(p));
 if(p){state.page='juniors';state.juniors.selected=p.id;juniorPromote(p.id);return;}
 state.page='juniors';juniorNotice('Ingen tillgänglig junior på den positionen. Se över juniortruppen eller värva en ersättare.');
}
function juniorsView(){
 ensureJuniors();const s=state.juniors,players=juniorPlayers(),p=juniorById(s.selected)||players[0],loans=s.roster.filter(p=>p.academy.loan);
 return `<section class="junior-page"><header class="daily-heading"><div><span class="career-eyebrow">${trainingSafe(managerClub())} · TALANGUTVECKLING</span><h1>Nästa generation.</h1><p>Välj miljö, utvecklingsroll och rätt stöd för varje spelare.</p></div><button class="btn secondary" onclick="trainingOpen('training')">A-lagets träning</button></header><div class="junior-summary"><div><strong>${s.roster.filter(p=>!p.academy.loan&&p.age<=20).length}</strong><span>I juniorlaget</span></div><div><strong>${loans.length}</strong><span>På lån</span></div><div><strong>${players.filter(isOwnPlayer).length}</strong><span>Uppflyttade</span></div></div>${s.message?`<p class="junior-notice" role="status">${trainingSafe(s.message)}</p>`:''}<div class="junior-layout"><nav class="junior-roster" aria-label="Juniortrupp"><h2>Talangerna</h2>${players.map(q=>`<button class="junior-player ${q.id===p?.id?'selected':''}" onclick="juniorSelect('${q.id}')"><strong>${trainingSafe(q.name)}</strong><span>${q.age} år · ${q.pos} · ${JUNIOR_PATHS[q.academy.path]}</span><small>${q.academy.role}</small></button>`).join('')||'<p>Juniortruppen är tom. Nästa intag kommer vid säsongsskiftet.</p>'}</nav><div>${p?juniorProfile(p):''}</div></div><section class="junior-history"><h2>Juniorlagets utvecklingsmatcher</h2><p>Fiktiva motståndare. En match spelas när ditt A-lag avslutar en match. Juniorpoäng räknas separat från SHL och styrelsens krav på A-lagsistid.</p>${s.matches.slice(0,6).map(m=>`<details><summary>${seasonLabel(m.year)} · Omgång ${m.round} · ${trainingSafe(managerClub())} ${m.own}–${m.against} ${m.opponent}</summary>${m.players.filter(p=>p.seconds).map(p=>`<div class="junior-stat"><span>${trainingSafe(p.name)}</span><span>${Math.floor(p.seconds/60)} min</span><strong>${p.goals}+${p.assists}</strong></div>`).join('')}</details>`).join('')||'<p>Första rapporten kommer efter nästa A-lagsmatch.</p>'}<h2>Junioransvarigs journal</h2>${s.reports.slice(0,8).map(r=>`<article><h3>${trainingSafe(r.title)}</h3><p>${trainingSafe(r.body).replaceAll('\n','<br>')}</p></article>`).join('')||'<p>Här samlas uppföljningar, lånerapporter och nya intag.</p>'}<details><summary>Årliga intag</summary>${s.intakes.map(r=>`<p><strong>${seasonLabel(r.year)}</strong> · ${r.names.map(trainingSafe).join(', ')||'Inga lediga platser vid intaget.'}</p>`).join('')}</details></section></section>`;
}
function juniorProfile(p){
 const a=p.academy,r=juniorAssessment(p),fields=p.pos==='MV'?GOALIE_ATTRIBUTES:SKATER_ATTRIBUTES,mentor=juniorMentor(p),own=isOwnPlayer(p);
 const mentors=managerRoster().filter(q=>q.age>=27&&q.id!==p.id&&(q.pos==='MV')===(p.pos==='MV'));
 return `<article class="junior-profile"><header><span class="career-eyebrow">${p.pos} · ${p.age} ÅR · FIKTIV SPELARE</span><h2>${trainingSafe(p.name)}</h2><p>${JUNIOR_PATHS[a.path]}${a.loan?` · ${JUNIOR_LOANS[a.loan.destination].name} · ${a.loan.remaining} omgångar kvar`:''}</p></header><div class="junior-evaluation"><label>Bedömare<select onchange="state.juniors.assessor=this.value;save();render()">${state.staff.map(q=>`<option value="${q.id}" ${q.id===r.staff.id?'selected':''}>${trainingSafe(q.name)}</option>`).join('')}</select></label><div><span>Förmåga i vald roll</span><strong>${r.current}</strong></div><div><span>Bedömd potential</span><strong>${r.potential}</strong></div><p>${r.confidence} kännedom · ${a.observations} observationer. Stjärnor 0–5 relativt ditt A-lag. Potentialen är osäker och kan bedömas olika av personalen.</p></div><div class="junior-advice"><h3>Junioransvarigs råd</h3><p>${trainingSafe(juniorAdvice(p))}</p></div><h3>Utvecklingsplan</h3><div class="junior-controls"><label>Individuell träning<select onchange="juniorSet('${p.id}','load',this.value)">${[['normal','Normal'],['light','Lätt'],['rest','Vila från träning']].map(([v,label])=>`<option value="${v}" ${p.trainingLoad===v?'selected':''}>${label}</option>`).join('')}</select></label><label>Spelarroll<select onchange="juniorSet('${p.id}','role',this.value)">${juniorRoles(p).map(role=>`<option ${a.role===role?'selected':''}>${role}</option>`).join('')}</select></label><label>Mentor<select onchange="juniorSet('${p.id}','mentor',this.value)"><option value="">Ingen mentor</option>${mentors.map(m=>`<option value="${m.id}" ${samePlayerId(a.mentor,m.id)?'selected':''}>${trainingSafe(m.name)} · ${m.age} år</option>`).join('')}</select></label>${!own&&!a.loan?`<label>Träningsmiljö<select onchange="juniorSet('${p.id}','path',this.value)">${['junior','guest'].map(path=>`<option value="${path}" ${a.path===path?'selected':''}>${JUNIOR_PATHS[path]}</option>`).join('')}</select></label>`:''}</div><p>Mentorskap tränar arbetsvanor eller kyla och stärker tryggheten under genomförda pass. Högst två talanger per mentor. ${mentor?`${trainingSafe(mentor.name)} kan ge stöd.`:a.mentor?'Mentorn är frånvarande eller saknar möjlighet att delta just nu.':'Välj en erfaren spelare som stöd.'} På lån sköter den mottagande klubben träningen.</p><h3>Nästa steg</h3><div class="junior-actions">${own?`<button class="btn secondary" onclick="selectPlayer('${p.id}')">A-lagsprofil</button>${p.age<=20?`<button class="btn secondary" onclick="juniorReturn('${p.id}')">Tillbaka till juniorlaget</button>`:''}`:a.loan?`<button class="btn secondary" onclick="juniorRecall('${p.id}')">Återkalla lån</button>`:`<button class="btn" onclick="juniorPromote('${p.id}')">Flytta upp · ${careerMoney(p.salary)}/år</button>${p.age>20?`<button class="btn secondary" onclick="juniorRelease('${p.id}')">Släpp · ${careerMoney(a.seniorContract?p.salary*p.contractYears:0)}</button>`:''}`}</div>${!own&&!a.loan?`<p>Uppflyttning ger ${p.contractYears||3} års A-avtal. Juniorträning och utvecklingsmatcher ingår i klubbens verksamhet; ett tecknat A-avtal fortsätter belasta lönebudgeten även efter återgång till juniorlaget.</p><div class="junior-loans">${Object.entries(JUNIOR_LOANS).map(([key,offer])=>`<article><h4>${offer.name}</h4><p>${offer.description}. Åtta matchomgångar, inga låneavgifter. ${p.pos==='MV'?'Rotation mellan målvakter.':`Riktmärke ${offer.minutes} min, beroende på konkurrens och ork.`}</p><button class="btn secondary" onclick="juniorLoan('${p.id}','${key}')">Acceptera utvecklingslån</button></article>`).join('')}</div>`:''}<h3>Attribut & utveckling</h3><div class="junior-attributes">${Object.entries(fields).map(([key,label])=>`<div><span>${label}</span><strong>${p.attributes[key]} <small>${p.attributes[key]>a.baseline[key]?`+${p.attributes[key]-a.baseline[key]}`:''}</small></strong></div>`).join('')}</div><p>Egna spelares attribut på skalan 1–20. Förändring sedan säsongens start eller ankomst. Rollplanen påverkar vilka egenskaper som tränas.</p><h3>Senaste matcherna</h3>${a.history.slice(0,6).map(m=>`<div class="junior-stat"><span>${m.opponent}<small>${JUNIOR_PATHS[m.path]}</small></span><span>${Math.floor(m.seconds/60)} min</span><strong>${m.goals}+${m.assists}</strong></div>`).join('')||'<p>Matchvana registreras när matcher spelas.</p>'}</article>`;
}
