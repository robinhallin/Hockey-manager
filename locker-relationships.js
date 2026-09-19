"use strict";
// Saved, causal relationship layer. Existing role/trust rules remain authoritative.
function relationshipPlayer(id){return managerRoster().find(p=>samePlayerId(p.id,id));}
function relationshipEvent(title,text){const b=state.relationships;b.events.unshift({date:state.calendar?.date,club:b.club,year:b.year,title,text});b.events=b.events.slice(0,60);}
function relationshipClose(c,status,text){if(c.status==='closed')return;c.status='closed';c.outcome=text;c.closed=state.calendar?.date;c.resolution=status;const b=state.relationships;b.archive.unshift({...c});b.archive=b.archive.slice(0,40);b.cases=b.cases.filter(x=>x.id!==c.id);relationshipEvent(c.name+' · '+text,c.evidence);}
function ensureRelationships(){
 if(!state.careerStarted||!state.locker||!state.season)return;
 const ids=managerRoster().map(p=>String(p.id));
 if(!state.relationships)state.relationships={version:1,club:managerClub(),year:state.season.year,turn:0,seen:[],members:ids,profiles:{},cases:[],archive:[],mentors:[],events:[],pressSeen:[],nextId:1,recent:[]};
 const b=state.relationships;b.phase??=state.season.phase;
 if(b.club!==managerClub()||b.year!==state.season.year||!managerEmployed()||b.phase!==state.season.phase&&state.season.phase==='review'){
  for(const c of [...b.cases])relationshipClose(c,'neutral',b.club!==managerClub()||!managerEmployed()?'Uppdraget avslutades utan ytterligare påföljd.':'Säsongen avslutades utan ytterligare påföljd.');
  for(const m of b.mentors.filter(m=>m.status==='active')){m.status='closed';m.outcome='Uppdraget avslutades utan påföljd.';}
  if(b.club!==managerClub()){b.members=ids;b.profiles={};b.recent=[];}
  b.club=managerClub();b.year=state.season.year;b.seen=[];
 }
 for(const p of managerRoster())if(!b.profiles[p.id])b.profiles[p.id]={talks:[],publicMisses:0,lastShield:-100,lastLeader:-100,settledAt:-100,arrival:b.members.includes(String(p.id))?null:b.turn};
 for(const c of [...b.cases])if(!ids.includes(c.playerId))relationshipClose(c,'neutral','Spelaren lämnade truppen. Uppföljningen avslutas utan påföljd.');
 for(const m of b.mentors.filter(m=>m.status==='active'))if(!ids.includes(m.playerId)||!ids.includes(m.mentorId)){m.status='closed';m.outcome='En deltagare lämnade truppen. Ingen påföljd.';}
 b.phase=state.season.phase;b.members=ids;for(const id of Object.keys(b.profiles))if(!ids.includes(id))delete b.profiles[id];
 b.mentors=b.mentors.filter(m=>m.status==='active').concat(b.mentors.filter(m=>m.status!=='active').slice(0,20));
}
function relationshipProfile(p){return state.relationships?.profiles[p.id];}
function relationshipChange(p,delta,title,text){const before=p.social.trust;p.social.trust=trainingClamp(before+delta);const actual=p.social.trust-before;socialRemember(p,title,text,actual);return actual;}
function relationshipLeaders(){
 return managerRoster().filter(p=>p.social.leadership>=14).map(p=>({p,peers:managerRoster().filter(q=>q!==p&&(socialPair(p.id,q.id)?.bond||0)>=45)})).sort((a,b)=>(b.peers.length*2+b.p.social.leadership)-(a.peers.length*2+a.p.social.leadership)||String(a.p.id).localeCompare(String(b.p.id))).slice(0,3);
}
function relationshipTalk(p,topic,delta,text){
 ensureRelationships();const b=state.relationships,profile=relationshipProfile(p);if(!profile)return {delta,text};
 const recent=profile.talks.filter(t=>b.turn-t.turn<=8),repeat=recent.filter(t=>t.topic===topic).length;
 if(delta>0&&repeat){delta=Math.max(0,delta-repeat*2);text+=' Samma budskap har återkommit. Spelaren vill se handling; effekten av orden avtar.';}
 if(topic==='bench'&&delta>0&&p.social.ambition>=14&&p.social.missed>=2){delta=0;text+=' Ambitionen och den återkommande bristen på istid gör att förklaringen inte räcker.';}
 if(topic==='bench'&&internationalAway(p)){delta=0;text='Landslagsuppdraget är en giltig frånvaro. Vi följer upp din roll när du är hemma.';}
 else if(topic==='bench'&&!medicalReady(p)){delta=0;text='Den medicinska frånvaron behöver hanteras som återhämtning, inte som konkurrens om platsen. Ingen förtroendebelöning för att förklara frånvaron som en petning.';}
 if(delta>0&&profile.publicMisses>=2){delta=Math.min(delta,1);text+=' Tidigare brutna offentliga besked gör spelaren försiktig med nya ord.';}
 profile.talks.push({topic,turn:b.turn,date:state.calendar?.date,delta,text});profile.talks=profile.talks.slice(-12);
 return {delta,text};
}
function relationshipRequired(p){return p.promisedRole==='Nyckelspelare'?900:p.promisedRole==='Ordinarie'?720:0;}
function relationshipAfterMatch(){
 ensureRelationships();const b=state.relationships,m=state.live,key=`${managerClub()}:${state.season?.year}:${state.round}`;
 if(!b||!m?.finished||m.friendly||m.analysisAbandoned||b.seen.includes(key)||!managerEmployed())return;
 b.seen.push(key);b.seen=b.seen.slice(-160);b.turn++;b.recent.push(m.hv>m.opp);b.recent=b.recent.slice(-5);
 const partial=!!m.analysis?.partial;
 for(const p of managerRoster()){
  const profile=relationshipProfile(p),required=relationshipRequired(p),eligible=p.pos!=='MV'&&required>0&&!partial&&!medicalExcused(p,required)&&!playerLoan(p)&&p.trainingLoad!=='rest'&&((m.iceTime?.[p.id]||0)>=required||(p.fatigue||0)<65);
  let c=b.cases.find(c=>c.playerId===String(p.id));
  if(!c&&eligible&&p.social.missed>=2&&b.turn-profile.settledAt>=4){
   c={id:'relation-'+b.nextId++,playerId:String(p.id),name:p.name,club:b.club,year:b.year,status:'open',tension:25,required,role:p.promisedRole,started:b.turn,good:0,eligible:0,attempts:0,heard:false,mediated:false,spread:false,evidence:`${p.name} har fått mindre istid än rollen ${p.promisedRole} i minst två tillgängliga matcher.`};b.cases.push(c);
   relationshipEvent(p.name+' vill förstå sin roll',c.evidence);managerMessage('relationship:'+c.id,p.name+' behöver ett tydligt besked',c.evidence+' Följ situationen i Omklädningsrummet → Relationer.','Omklädningsrum',{link:'locker'});
  }
  if(!c)continue;
  if(c.role!==p.promisedRole){relationshipClose(c,'neutral','Rollen ändrades. Det gamla missnöjet raderas inte ur spelarens journal.');profile.settledAt=b.turn;continue;}
  if(c.started===b.turn)continue;
  c.attempts++;if(eligible){
   const met=(m.iceTime?.[p.id]||0)>=c.required;c.eligible++;c.good=met?c.good+1:0;c.tension=trainingClamp(c.tension+(met?-8:p.social.ambition>=14?9:6));
   c.evidence=`Senast ${Math.floor((m.iceTime?.[p.id]||0)/60)} minuter; rollen kräver ${c.required/60}. ${c.good}/3 raka bedömbara matcher med motsvarande istid.`;
   if(c.good>=3){relationshipClose(c,'reconciled','Tre matcher med rätt ansvar har lugnat konflikten.');profile.settledAt=b.turn;socialRemember(p,'Konflikten börjar lägga sig','Tre bedömbara matcher med istid som motsvarar rollen. Ordinarie rolluppföljning återställer förtroende; ingen dubbel belöning delas ut.');continue;}
  }
  if(c.plan&&c.eligible-c.plan.startEligible>=4&&c.good<3){relationshipChange(p,-2,'Planen gav inte tillräcklig förändring','Fyra bedömbara matcher passerade utan tre raka matcher med utlovat ansvar.');c.plan=null;c.status='open';relationshipEvent(p.name+' väntar fortfarande på förändring',c.evidence);}
  if(!c.spread&&c.tension>=55){
   const witness=relationshipLeaders().find(l=>l.p!==p&&l.peers.some(q=>q===p));
   if(witness){c.spread=true;relationshipChange(witness.p,-1,'En lagkamrats situation väcker frågor',`${p.name}s återkommande rollproblem skapar frågor om ledarskapet. Relationen bygger på registrerat samspel.`);relationshipEvent(witness.p.name+' tar upp en lagkamrats situation',`${p.name} har fortfarande inte fått den istid som rollen innebär. ${witness.p.name} känner spelaren genom återkommande samspel.`);}
  }
  if(c.attempts>=12&&c.eligible<3){relationshipClose(c,'neutral','För få bedömbara matcher. Ärendet avslutas utan påföljd.');profile.settledAt=b.turn;}
 }
 for(const assignment of b.mentors.filter(x=>x.status==='active')){
  assignment.attempts++;const p=relationshipPlayer(assignment.playerId),leader=relationshipPlayer(assignment.mentorId);
  if(!partial&&p&&leader&&!medicalExcused(p,300)&&!medicalExcused(leader,300)){
   assignment.games++;if((m.iceTime?.[p.id]||0)>=300&&(m.iceTime?.[leader.id]||0)>=300)assignment.shared++;
  }
  if(assignment.shared>=3){assignment.status='complete';assignment.outcome='Tre matcher med minst fem minuter för båda. Introduktionen har fått fäste.';const pair=socialPair(p.id,leader.id,true);pair.bond=Math.min(90,pair.bond+3);relationshipChange(p,2,'Faddern hjälpte mig in',`${leader.name} har följt introduktionen under tre matcher. Förtroende +2 och relationen till faddern +3.`);relationshipEvent(p.name+' har kommit in i gruppen',assignment.outcome);}
  else if(assignment.attempts>=8){assignment.status='closed';assignment.outcome='För få gemensamma matchtillfällen. Introduktionen avslutas utan påföljd.';}
 }
 if(b.recent.length>=3&&b.recent.slice(-3).every(w=>!w))for(const {p,peers} of relationshipLeaders().filter(l=>!samePlayerId(l.p.id,state.locker.captainId))){
  const profile=relationshipProfile(p);if(profile.lastLeader>b.turn-4||p.social.trust<65||!peers.length)continue;
  profile.lastLeader=b.turn;const recipients=peers.slice().sort((a,b)=>a.social.trust-b.social.trust).slice(0,3);
  for(const q of recipients)relationshipChange(q,.5,'En ledare stöttar gruppen',`${p.name} bidrar med lugn efter tre förluster. Befintligt samspel gör stödet betydelsefullt.`);
  relationshipEvent(p.name+' håller ihop sin del av gruppen',`Efter tre raka förluster får ${recipients.map(q=>q.name).join(', ')} stöd. Förtroende +0,5 per spelare. Tidigast ett nytt ingripande om fyra matcher.`);
 }
}
function relationshipAction(id,action){
 ensureRelationships();const b=state.relationships,c=b.cases.find(c=>c.id===id),p=c&&relationshipPlayer(c.playerId);
 if(!p||!managerEmployed()||state.live&&!state.live.finished||!['listen','plan','mediate'].includes(action))return;
 if(action==='listen'){
  if(c.heard||state.locker.turn-p.social.lastTalk<3)return;c.heard=true;c.tension=Math.max(0,c.tension-3);p.social.lastTalk=state.locker.turn;
  socialRemember(p,'Tränaren erkänner problemet','Du lyssnar och erkänner skillnaden mellan roll och istid. Spänningen minskar något; inget förtroende återställs innan handlingen förändras.');
 }else if(action==='plan'){
  if(c.plan)return;c.status='following';c.plan={startEligible:c.eligible};socialRemember(p,'En tydlig väg tillbaka',`Tränaren prioriterar rollen: ${c.required/60} minuter i tre raka bedömbara matcher. Fyra bedömbara matcher utan den förändringen ger −2 i förtroende. Medicinska undantag gäller.`);
 }else{
  if(c.mediated)return;const leader=relationshipLeaders().find(l=>l.p!==p&&l.p.social.trust>=50&&(samePlayerId(l.p.id,state.locker.captainId)||l.peers.includes(p)));
  if(!leader)return;c.mediated=true;c.tension=Math.max(0,c.tension-5);socialRemember(p,'Ett samtal med en ledare',`${leader.p.name} hjälper er att förstå varandra. Spänningen minskar med 5; istiden och förtroendet återstår att förändra.`);relationshipEvent(leader.p.name+' medlar',`${p.name}s situation diskuteras. Samtalet avslutar inte rolluppföljningen.`);
 }
 save();render();
}
function relationshipMentors(p){return managerRoster().filter(q=>q!==p&&q.social.leadership>=14&&q.social.trust>=50&&!state.relationships.mentors.some(m=>m.mentorId===String(q.id)&&m.status==='active'));}
function relationshipAssign(playerId,mentorId){
 ensureRelationships();const b=state.relationships,p=relationshipPlayer(playerId),mentor=relationshipPlayer(mentorId);
 if(!p||!mentor||p===mentor||!managerEmployed()||state.season.phase==='review'||state.live&&!state.live.finished||relationshipProfile(p).arrival===null||b.turn-relationshipProfile(p).arrival>8||mentor.social.leadership<14||mentor.social.trust<50||b.mentors.some(m=>m.playerId===String(p.id)||m.mentorId===String(mentor.id)&&m.status==='active'))return;
 b.mentors.unshift({playerId:String(p.id),mentorId:String(mentor.id),name:p.name,mentor:mentor.name,status:'active',shared:0,games:0,attempts:0,club:b.club});socialRemember(p,'En fadder i laget',`${mentor.name} får ansvar för din introduktion. Tre matcher där båda spelar minst fem minuter följs upp, inom högst åtta tävlingsmatcher.`);save();render();
}
function relationshipPublic(e,choice){
 ensureRelationships();const b=state.relationships;if(!b||b.pressSeen.includes(e.id)||e.club!==managerClub())return;b.pressSeen.push(e.id);b.pressSeen=b.pressSeen.slice(-100);
 const reactions=[];
 for(const p of managerRoster()){
  const profile=relationshipProfile(p);let delta=0,text='';
  if(choice==='shield'){
   delta=b.turn-profile.lastShield>=4&&p.social.trust>=45&&(p.social.loyalty>=12||p.social.sensitivity>=14)?1:0;profile.lastShield=b.turn;
   text=delta?'Att tränaren tar ansvar offentligt ger trygghet.':'Spelaren hör stödet men vill se handling. Upprepat försvar ger ingen ny belöning inom fyra matcher.';
  }else if(choice==='results')text=p.social.ambition>=14?'Det offentliga resultatkravet väcker förväntan. Spelaren vill se att orden följs av resultat.':p.social.sensitivity>=14?'Det offentliga resultatkravet ökar förväntningarna. Spelaren behöver tydlighet och trygghet.':'Spelaren väntar på om resultatbeskedet håller.';
  else if(choice==='youth')text=p.age<=23?'Beskedet om unga väcker hopp om riktigt ansvar. Inga minuter är ännu givna.':'Spelaren noterar satsningen på unga. Den egna avtalade rollen gäller fortfarande.';
  else continue;
  relationshipChange(p,delta,'Tränarens offentliga besked',text);if(delta)reactions.push(`${p.name} +${delta}`);
 }
 e.response.internal=`Omklädningsrummet: ${reactions.length?reactions.join(', '):'ingen omedelbar förtroendeförändring; spelarna följer fortsättningen.'}`;
 relationshipEvent('Truppen hör ditt offentliga besked',e.response.internal);
}
function relationshipPublicOutcome(c,p){
 if(!p||!['met','missed'].includes(p.status)||c.club!==managerClub())return;
 ensureRelationships();const b=state.relationships,key='outcome:'+p.source;if(b.pressSeen.includes(key))return;b.pressSeen.push(key);b.pressSeen=b.pressSeen.slice(-100);
 const changes=[];
 for(const player of managerRoster()){
  // A youth pledge concerns young skaters. Veterans do not lose promised roles.
  if(p.kind==='youth'&&(player.age>23||player.pos==='MV'))continue;
  const profile=relationshipProfile(player);profile.publicMisses=p.status==='missed'?Math.min(5,profile.publicMisses+1):Math.max(0,profile.publicMisses-1);
  const delta=p.status==='met'?1:profile.publicMisses>=2?-2:-1;
  const actual=relationshipChange(player,delta,p.status==='met'?'Det offentliga beskedet höll':'Det offentliga beskedet höll inte',`${p.outcome} ${p.status==='missed'?'Upprepade brutna besked gör nya ord mindre övertygande.':'Handling gör beskedet trovärdigt.'}`);changes.push(`${player.name} ${actual>0?'+':''}${actual}`);
 }
 relationshipEvent('Offentligt besked · intern uppföljning',changes.join(' · '));
}
function relationshipView(){
 ensureRelationships();const b=state.relationships,locked=!!(state.live&&!state.live.finished)||state.season.phase==='review',leaders=relationshipLeaders();
 return `<section class="lr-view"><header><h2>Relationer som förändras över tid</h2><p>Istid, tidigare besked och verkligt samspel avgör. Samtal kan minska spänningen; förtroendet kräver handling.</p></header><div class="lr-grid"><section class="lw-panel"><h3>Ledare i gruppen</h3>${leaders.map(({p,peers})=>`<article class="lr-item"><strong>${samePlayerId(p.id,state.locker.captainId)?'C · ':''}${trainingSafe(p.name)}</strong><p>${p.social.trust>=65?'Stöttar ditt ledarskap':p.social.trust<50?'Har egna tvivel':'Avvaktar utvecklingen'} · ${peers.length} etablerade relationer</p><small>${peers.length?trainingSafe(peers.map(q=>q.name).join(', ')):'Inflytandet växer med registrerat samspel.'}</small></article>`).join('')||'<p>Ingen tydlig informell ledare ännu.</p>'}<p>Samspel minst 45/100 ger en etablerad relation. Informella ledare kan stötta högst tre nära lagkamrater efter tre förluster, tidigast var fjärde match. Kaptenens befintliga grupproll gäller separat.</p></section><section class="lw-panel"><h3>Nya i gruppen</h3>${managerRoster().filter(p=>relationshipProfile(p).arrival!==null&&b.turn-relationshipProfile(p).arrival<=8&&!b.mentors.some(m=>m.playerId===String(p.id))).map(p=>`<form class="lr-item" onsubmit="event.preventDefault();relationshipAssign('${p.id}',this.elements.mentor.value)"><strong>${trainingSafe(p.name)}</strong><label>Välj fadder<select name="mentor">${relationshipMentors(p).map(q=>`<option value="${q.id}">${trainingSafe(q.name)}</option>`).join('')}</select></label><button class="btn secondary" ${locked||!relationshipMentors(p).length?'disabled':''}>Ge introduktionsansvar</button></form>`).join('')||'<p>Ingen nytillkommen spelare väntar på en fadder.</p>'}${b.mentors.map(m=>`<article class="lr-item"><strong>${trainingSafe(m.mentor)} → ${trainingSafe(m.name)}</strong><p>${m.status==='active'?`${m.shared}/3 matcher med minst fem minuter för båda · ${m.attempts}/8 matcher passerade.`:trainingSafe(m.outcome)}</p></article>`).join('')}<p>En lyckad introduktion ger +2 i förtroende och +3 i relationen till faddern. Medicinska hinder ursäktas; uteblivna tillfällen ger ingen bestraffning.</p></section></div><section class="lw-panel"><h3>Konflikter & vägen tillbaka</h3>${b.cases.map(c=>`<article class="lr-item"><h4>${trainingSafe(c.name)} · ${c.tension>=55?'Tilltagande konflikt':c.status==='following'?'Planen följs upp':'Frågor om rollen'}</h4><p>${trainingSafe(c.evidence)}</p><p>Spänning ${c.tension}/100. Tre raka bedömbara matcher med minst ${c.required/60} minuter lugnar konflikten. Ordinarie rollregler återställer förtroende.</p><div class="lr-actions"><button class="btn secondary" onclick="relationshipAction('${c.id}','listen')" ${locked||c.heard||state.locker.turn-relationshipPlayer(c.playerId).social.lastTalk<3?'disabled':''}>Erkänn problemet · spänning −3</button><button class="btn secondary" onclick="relationshipAction('${c.id}','plan')" ${locked||c.plan?'disabled':''}>Prioritera rollen · fyra matcher</button><button class="btn secondary" onclick="relationshipAction('${c.id}','mediate')" ${locked||c.mediated||!leaders.some(l=>l.p.id!==relationshipPlayer(c.playerId).id&&l.p.social.trust>=50&&(samePlayerId(l.p.id,state.locker.captainId)||l.peers.some(p=>samePlayerId(p.id,c.playerId))))?'disabled':''}>Be en ledare medla · spänning −5</button></div><small>En prioriterad plan som saknar tre raka matcher med rätt istid efter fyra bedömbara matcher ger −2 i förtroende. Vanliga istidslöften gäller parallellt.</small></article>`).join('')||'<p>Inga pågående rollkonflikter. Äldre matcher skapar inga retroaktiva ärenden.</p>'}</section><details class="lw-panel"><summary>Händelser & tidigare konflikter</summary>${b.events.map(e=>`<article class="lr-item"><small>${trainingSafe(e.date)} · ${trainingSafe(e.club)}</small><h4>${trainingSafe(e.title)}</h4><p>${trainingSafe(e.text)}</p></article>`).join('')||'<p>Nya händelser sparas här.</p>'}${b.archive.map(c=>`<p><strong>${trainingSafe(c.name)}</strong> · ${trainingSafe(c.outcome)}</p>`).join('')}</details></section>`;
}
function relationshipPlayerView(p){
 const profile=relationshipProfile(p),b=state.relationships;if(!profile||!b)return '';
 const c=b.cases.find(c=>c.playerId===String(p.id));
 return `<section class="lr-item"><h3>Det spelaren minns</h3>${c?`<p>${trainingSafe(c.evidence)}</p><button class="lw-link" onclick="lockerSet('tab','relationships')">Följ konflikten →</button>`:''}${profile.publicMisses?`<p>${profile.publicMisses} kvarvarande besvikelser efter offentliga besked. Uppfyllda besked kan gradvis återställa tilliten.</p>`:''}${profile.talks.slice(-3).reverse().map(t=>`<p><small>${trainingSafe(t.date)}</small><br>${trainingSafe(t.text)}</p>`).join('')||'<p>Inga nya individuella samtal registrerade ännu.</p>'}<small>Upprepningar inom åtta tävlingsmatcher ger mindre effekt. Samtal och laguttagning bedöms tillsammans.</small></section>`;
}
