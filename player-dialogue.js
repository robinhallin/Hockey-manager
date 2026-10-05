"use strict";
// Conversations observe club decisions. Existing role promises own match evaluation.
function playerDialogueStore(){return state.office2?.playerDialogue||null;}
function playerDialogueSnapshot(){return managerRoster().map(p=>({id:String(p.id),name:p.name,pos:p.pos,role:p.promisedRole||p.squadRole||'Rotation'}));}
function playerDialogueSeed(){
 if(!state.careerStarted||!state.locker||!state.season)return;
 managerOffice2Ensure();
 if(!state.office2.playerDialogue)state.office2.playerDialogue={club:managerClub(),year:state.season.year,nextId:1,roster:playerDialogueSnapshot(),captain:state.locker.captainId===null?null:String(state.locker.captainId),requests:[]};
}
function playerDialogueActive(r){return ['pending','following'].includes(r.status);}
function playerDialogueCurrent(r){return r.kind==='competition'?Boolean(relationshipPlayer(r.source)):r.kind==='role'?Boolean(state.relationships?.cases.some(c=>c.id===r.source)):true;}
function playerDialogueClose(reason){for(const r of playerDialogueStore()?.requests||[])if(playerDialogueActive(r)){r.status='neutral';r.outcome=reason;r.closed=state.calendar.date;}}
function playerDialogueCreate(p,kind,evidence,source){
 const b=playerDialogueStore();if(!b||!p||b.requests.some(r=>r.playerId===String(p.id)&&r.kind===kind&&playerDialogueActive(r)))return;
 const r={id:b.nextId++,playerId:String(p.id),name:p.name,kind,source:String(source),date:state.calendar.date,due:calAdd(state.calendar.date,7),status:'pending',evidence,role:p.promisedRole||p.squadRole||'Rotation',spread:[],outcome:''};
 b.requests.unshift(r);b.requests=b.requests.filter(playerDialogueActive).concat(b.requests.filter(r=>!playerDialogueActive(r)).slice(0,60));
 managerMessage('player-dialogue:'+b.club+':'+r.id,p.name+' vill prata',evidence+' Ta samtalet i omklädningsrummet.','Omklädningsrum',{playerId:p.id,link:'locker'});
 return r;
}
function playerDialoguePromise(p,r){return [p.recruitmentPromise,...(p.rolePromiseHistory||[])].find(q=>q?.dialogueId===r.id&&q.club===managerClub());}
function playerDialogueDay(){
 playerDialogueSeed();const b=playerDialogueStore();if(!b)return;
 if(b.club!==managerClub()||b.year!==state.season.year||!managerEmployed()||state.season.phase==='review'){
  playerDialogueClose('Uppdraget eller säsongen avslutades. Ingen ytterligare påföljd.');b.club=managerClub();b.year=state.season.year;b.roster=playerDialogueSnapshot();b.captain=state.locker.captainId===null?null:String(state.locker.captainId);return;
 }
 const roster=managerRoster(),now=playerDialogueSnapshot(),old=new Map(b.roster.map(p=>[p.id,p]));
 for(const arrival of now.filter(p=>!old.has(p.id))){
  const p=relationshipPlayer(arrival.id);if(playerLoan(p)?.owner===managerClub())continue;
  const peers=roster.filter(q=>old.has(String(q.id))&&q.pos===p.pos&&!playerLoan(q)&&['Ordinarie','Nyckelspelare'].includes(q.promisedRole));
  for(const q of peers)playerDialogueCreate(q,'competition',`${p.name} har anslutit på din position (${p.pos}). Din avtalade roll är ${q.promisedRole}. Värvningen ändrar inte ditt avtal eller något befintligt löfte.`,p.id);
  // A player outside the crowded position can welcome a concrete reinforcement.
  const leader=relationshipLeaders().find(l=>l.p!==p&&l.p.pos!==p.pos&&l.p.social.trust>=65);
  if(leader)relationshipEvent(leader.p.name+' välkomnar förstärkningen',`${p.name} har anslutit. ${leader.p.name} ser fler alternativ för laget; ingen automatisk förtroendebelöning.`);
 }
 for(const departed of b.roster.filter(p=>!now.some(q=>q.id===p.id))){
  const peer=roster.filter(p=>(socialPair(p.id,departed.id)?.bond||0)>=45).sort((a,b)=>(socialPair(b.id,departed.id)?.bond||0)-(socialPair(a.id,departed.id)?.bond||0))[0];
  if(peer)playerDialogueCreate(peer,'departure',`${departed.name} har lämnat den aktiva truppen. Ni hade etablerat samspel. Du vill veta hur laget ska gå vidare.`,departed.id);
 }
 const captain=state.locker.captainId===null?null:String(state.locker.captainId);
 if(b.captain!==captain){const previous=relationshipPlayer(b.captain);if(previous)playerDialogueCreate(previous,'captain','Kaptensuppdraget har gått vidare. Spelaren vill prata om sitt fortsatta ansvar i gruppen.',captain||'none');}
 b.roster=now;b.captain=captain;
 for(const c of state.relationships?.cases||[]){const p=relationshipPlayer(c.playerId);if(p&&!b.requests.some(r=>r.kind==='role'&&r.source===c.id))playerDialogueCreate(p,'role',c.evidence,c.id);}
 for(const r of b.requests.filter(playerDialogueActive)){
  const p=relationshipPlayer(r.playerId);
  if(!p){r.status='neutral';r.outcome='Spelaren lämnade truppen. Samtalet avslutas utan påföljd.';r.closed=state.calendar.date;continue;}
  if(r.status==='pending'&&!playerDialogueCurrent(r)){r.status='neutral';r.outcome='Situationen som utlöste samtalet är inte längre aktuell.';r.closed=state.calendar.date;continue;}
  if(r.status==='following'&&r.choice==='chance'){
   const q=playerDialoguePromise(p,r);
   if(q?.resolved||!q){r.status=q?.result==='Uppfyllt'?'met':q?.result==='Brutet'?'missed':'neutral';r.outcome=q?.result||'Överenskommelsen är inte längre aktiv. Ingen ytterligare påföljd.';r.closed=state.calendar.date;}
  }else if(r.status==='following'&&r.due<=state.calendar.date&&!r.notified){
   r.notified=state.calendar.date;managerMessage('player-dialogue-review:'+b.club+':'+r.id,p.name+': dags att följa upp samtalet',playerFollowupAdvice(p),'Omklädningsrum',{playerId:p.id,link:'locker'});
  }
  if(r.status==='pending'&&!r.escalated&&calGap(r.date,state.calendar.date)>=14&&!playerLoan(p)&&!internationalAway(p)&&medicalReady(p)){
   r.escalated=true;
   const leader=samePlayerId(p.id,state.locker.captainId)||relationshipLeaders().some(l=>l.p===p),limit=leader?3:1;
   const peers=roster.filter(q=>q!==p&&(socialPair(p.id,q.id)?.bond||0)>=45).sort((a,b)=>(socialPair(p.id,b.id)?.bond||0)-(socialPair(p.id,a.id)?.bond||0)).slice(0,limit);
   for(const q of peers){relationshipChange(q,-1,'Ett obesvarat samtal väcker frågor',`${p.name} har väntat minst två veckor på besked. Ert registrerade samspel gör frågan betydelsefull.`);r.spread.push(String(q.id));}
   if(peers.length)relationshipEvent('Gruppen väntar på ett besked',`${p.name}s obesvarade samtal påverkar ${peers.map(q=>q.name).join(', ')}. Förtroende −1, en gång per ärende.`);
  }
 }
}
function playerDialogueBlock(p){return !managerEmployed()||state.season.phase==='review'?'Inget aktivt tränaruppdrag.':state.live&&!state.live.finished?'Samtalet tas mellan matcher.':playerLoan(p)||internationalAway(p)||!medicalReady(p)?'Invänta spelarens återkomst.':'';}
function playerDialogueAnswer(id,choice){
 const b=playerDialogueStore(),r=b?.requests.find(r=>r.id===Number(id)),p=r&&relationshipPlayer(r.playerId);
 if(!p||b.club!==managerClub()||b.year!==state.season.year||r.status!=='pending'||!playerDialogueCurrent(r)||playerDialogueBlock(p)||!['explain','firm','chance','leader'].includes(choice))return false;
 let text='';
 if(choice==='chance'){
  if(playerChanceBlock(p)||!['role','competition'].includes(r.kind))return false;
  // Link before the public action saves, then let its existing evaluator own rewards.
  if(!playerChance(p.id))return false;p.recruitmentPromise.dialogueId=r.id;
  text=p.social.lastResponse;
 }else if(choice==='leader'){
  const leader=relationshipLeaders().find(l=>l.p!==p&&l.p.social.trust>=65&&(samePlayerId(l.p.id,state.locker.captainId)||l.peers.includes(p)));
  if(!leader)return false;r.mediatorId=String(leader.p.id);
  text=`${leader.p.name} deltar i samtalet och hjälper till att förklara din fortsatta roll. Vi följer upp om två veckor. Samtalet ändrar inga löften eller istidskrav.`;
 }else if(choice==='firm'){
  text=`Jag står fast vid beslutet. Din avtalade roll (${p.promisedRole||p.squadRole}) och befintliga löften gäller. Vi följer upp om två veckor.`;
  const delta=p.social.ambition>=14||p.social.trust<50?-1:0;relationshipChange(p,delta,'Tränaren står fast',text+(delta?' Spelaren är besviken; förtroende −1.':' Spelaren accepterar beskedet men inväntar handling.'));
 }else text=`${r.kind==='captain'?'Kaptensbindeln har bytt ägare; din erfarenhet behövs fortfarande i gruppen.':r.kind==='departure'?'Vi behöver fördela ansvaret efter förändringen.':'Konkurrensen avgör uttagningen; din avtalade roll gäller fortfarande.'} ${squadRoleExpectation(p)} Vi stämmer av om två veckor. Detta ger inget nytt istidslöfte.`;
 r.choice=choice;r.answered=state.calendar.date;r.due=calAdd(state.calendar.date,14);r.status='following';r.response=text;
 if(choice!=='chance'&&choice!=='firm')socialRemember(p,'Samtal om '+({role:'rollen',competition:'konkurrensen',captain:'kaptensansvaret',departure:'truppförändringen'}[r.kind]),text);
 p.social.lastResponse=text;managerAgendaReconcile();save();render();return true;
}
function playerDialogueReview(id){
 const b=playerDialogueStore(),r=b?.requests.find(r=>r.id===Number(id)),p=r&&relationshipPlayer(r.playerId);
 if(!p||b.club!==managerClub()||b.year!==state.season.year||r.status!=='following'||r.choice==='chance'||r.due>state.calendar.date||playerDialogueBlock(p))return false;
 r.status='reviewed';r.closed=state.calendar.date;r.outcome=playerFollowupAdvice(p);
 socialRemember(p,'Samtalet följdes upp',r.outcome+' Avstämningen avslutar inte befintliga löften eller rollkonflikter.');managerAgendaReconcile();save();render();return true;
}
function playerDialogueItems(){const b=playerDialogueStore();return b?.club===managerClub()?b.requests.filter(playerDialogueActive).map(r=>({id:'player-dialogue:'+r.id,title:r.name+(r.status==='pending'?': vill ha ett besked':': följ upp överenskommelsen'),detail:r.evidence,due:r.due,tag:'Spelarsamtal',area:'locker',owner:'Du',level:'high',score:85,requiresDecision:r.status==='pending',action:{conversationPlayer:r.playerId}})):[];}
function playerDialogueView(p){
 const b=playerDialogueStore();if(!b||b.club!==managerClub())return '';
 return b.requests.filter(r=>samePlayerId(r.playerId,p.id)).slice(0,8).map(r=>{
  const block=playerDialogueBlock(p)||(r.status==='pending'&&!playerDialogueCurrent(r)?'Situationen är inte längre aktuell.':''),q=playerDialoguePromise(p,r),safe=trainingSafe;
  return `<section class="lw-panel"><h3>${({competition:'En ny konkurrent',departure:'En lagkamrat lämnar',captain:'Förändrat kaptensansvar',role:'Min roll i laget'})[r.kind]}</h3><p>${safe(r.evidence)}</p><small>${calText(r.date)} · ${r.status==='pending'?'Önskat besked '+calText(r.due):r.status==='following'?'Avstämning '+calText(r.due):'Avslutat '+calText(r.closed)}</small>${r.response?`<p><strong>Ditt besked:</strong> ${safe(r.response)}</p>`:''}${r.status==='pending'?`<div class="lw-talks">${[['explain','Förklara fortsatt ansvar'],['firm','Stå fast vid beslutet'],['leader','Ta hjälp av en betrodd ledare'],...(['role','competition'].includes(r.kind)?[['chance','Lova en konkret chans']]:[])].map(([key,label])=>{const reason=block||(key==='chance'?playerChanceBlock(p):key==='leader'&&!relationshipLeaders().some(l=>l.p!==p&&l.p.social.trust>=65&&(samePlayerId(l.p.id,state.locker.captainId)||l.peers.includes(p)))?'Ingen tillgänglig betrodd ledare.':'');return `<div><button onclick="playerDialogueAnswer(${r.id},'${key}')" ${reason?'disabled':''}>${label}</button>${reason?`<small>${safe(reason)}</small>`:''}</div>`;}).join('')}</div><p>Att stå fast kan ge −1 i förtroende vid hög ambition eller lågt förtroende. Ett obesvarat samtal kan efter 14 dagar påverka nära lagkamrater en gång: högst tre för en ledare, annars en.</p>`:''}${q?`<p>${safe(rolePromiseProgress(q))}</p>${rolePromiseEvidence(q)}${!q.resolved&&(playerLoan(p)||internationalAway(p)||!medicalReady(p))?'<p>Frånvaro pausar matchbedömningen. Kalenderdatumet bryter inte löftet.</p>':''}`:''}${r.status==='following'&&r.choice!=='chance'?`<p>${safe(playerFollowupAdvice(p))}</p><button onclick="playerDialogueReview(${r.id})" ${block||r.due>state.calendar.date?'disabled':''}>Följ upp samtalet</button>`:''}${r.outcome?`<p>${safe(r.outcome)}</p>`:''}${r.spread.length?`<p>Frågan har berört ${r.spread.map(id=>playerReference(id,relationshipPlayer(id)?.name||'Tidigare lagkamrat')).join(', ')}.</p>`:''}</section>`;
 }).join('');
}
function validatePlayerDialogueSave(b){
 if(!b)return;const date=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d)),str=s=>typeof s==='string'&&s.length<12000;
 const fail=()=>{throw Error('Ogiltiga spelarsamtal.');};
 if(!str(b.club)||!Number.isInteger(b.year)||!Number.isInteger(b.nextId)||b.nextId<1||!Array.isArray(b.roster)||b.roster.length>200||!Array.isArray(b.requests)||b.requests.length>260||b.captain!==null&&!str(b.captain))fail();
 if(b.roster.some(p=>!p||!['id','name','pos','role'].every(k=>str(p[k]))))fail();
 const ids=new Set();for(const r of b.requests){if(!r||!Number.isInteger(r.id)||r.id<1||r.id>=b.nextId||ids.has(r.id)||!['playerId','name','source','evidence','role','outcome'].every(k=>str(r[k]))||!['competition','departure','captain','role'].includes(r.kind)||!['pending','following','met','missed','neutral','reviewed'].includes(r.status)||!date(r.date)||!date(r.due)||r.closed&&!date(r.closed)||r.answered&&!date(r.answered)||r.notified&&!date(r.notified)||r.choice&&!['explain','firm','chance','leader'].includes(r.choice)||r.response&&!str(r.response)||!Array.isArray(r.spread)||r.spread.length>3||r.spread.some(id=>!str(id)))fail();ids.add(r.id);}
}
