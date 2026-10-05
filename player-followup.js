"use strict";
// Calendar reviews complement match-based agreements; dates never break a promise.
function playerFollowupStart(p,topic){
 const old=p.roleFollowup;
 if(old&&!old.closed&&old.club===managerClub())return;
 p.roleFollowup={club:managerClub(),date:state.calendar.date,due:calAdd(state.calendar.date,14),topic,role:p.promisedRole,trust:p.social.trust};
}
function playerFollowupAdvice(p){
 const promises=lockerPlayerPromises(p),games=squadRoleGames(p);
 if(internationalAway(p)||!medicalReady(p)||playerLoan(p))return 'Spelaren är frånvarande. Planera återgången och låt giltig frånvaro pausa matchbedömningen.';
 if(promises.length)return 'Ett löfte gäller redan. Kontrollera matchunderlaget och planera platsen i laget innan du ger nya besked.';
 if(p.social.missed>=2||squadRoleStatus(p).missed)return 'Användningen har inte motsvarat rollen över flera matcher. Förklara uttagningen, ge en konkret chans eller diskutera mindre ansvar.';
 if(games.length<3)return 'För få tillgängliga tävlingsmatcher för att bedöma rollen. Samla underlag innan du drar slutsatser.';
 if(p.social.trust<50||p.happiness<65)return 'Stäm av vad missnöjet gäller. Lyssna först; lova bara ansvar som ryms i laguttagningen.';
 return 'Inget tydligt rollproblem i underlaget. Fortsätt följa användningen över tid.';
}
function playerChanceBlock(p){
 if(!managerEmployed()||state.season.phase==='review')return 'Inget aktivt tränaruppdrag.';
 if(state.live&&!state.live.finished)return 'Samtalet tas mellan matcher.';
 if(playerLoan(p)||internationalAway(p)||!medicalReady(p))return 'Invänta spelarens återkomst.';
 if(lockerPlayerPromises(p).length)return 'Följ upp det befintliga löftet först.';
 if(state.locker.turn-p.social.lastTalk<3)return 'Låt tre matcher gå efter senaste samtalet.';
 return '';
}
function playerChance(id){
 ensureLocker();const p=managerRoster().find(p=>samePlayerId(p.id,id));if(!p||playerChanceBlock(p))return false;
 // Existing contract promise evaluation provides medical exclusions and deduplication.
 rolePromiseAssign(p,p.promisedRole==='Nyckelspelare'?'Nyckelspelare':'Ordinarie');
 p.recruitmentPromise.source='Samtalslöfte';
 const q=p.recruitmentPromise,rule=rolePromiseRule(q);
 const text=`Du får ${rolePromiseTarget(q)} i ${rule.required} av de nästa ${rule.total} tillgängliga tävlingsmatcherna. Din långsiktiga roll ändras inte. Vi stämmer av om två veckor; giltig frånvaro räknas inte som brutet löfte.`;
 p.social.lastTalk=state.locker.turn;p.social.lastResponse=text;
 playerFollowupStart(p,'En konkret chans');socialRemember(p,'En konkret chans',text);socialLog('Överenskommelse med '+p.name,text);save();render();return true;
}
function playerFollowupOpen(id){deskNavigate('locker');lockerOpenDetail('talk',id);}
function playerFollowupClose(id){
 const p=managerRoster().find(p=>samePlayerId(p.id,id)),f=p?.roleFollowup;
 if(!f||f.club!==managerClub()||f.closed||f.due>state.calendar.date||state.live&&!state.live.finished)return false;
 const text=playerFollowupAdvice(p);f.closed=state.calendar.date;f.outcome=text;
 socialRemember(p,'Samtalet följdes upp',text);save();render();return true;
}
function playerFollowupItems(){
 return managerRoster().flatMap(p=>{
  const f=p.roleFollowup,review=f&&f.club===managerClub()&&!f.closed;
  if(!review&&!(p.social?.missed>=2||p.social?.trust<50))return [];
  return [{id:'player-followup:'+p.id,title:p.name+(review?': följ upp samtalet':': assistenten föreslår ett samtal'),detail:playerFollowupAdvice(p),due:review?f.due:null,tag:'Spelarsamtal',area:'locker',owner:'Du',level:review&&f.due<=state.calendar.date?'high':'medium',score:review?80:55,action:{conversationPlayer:p.id}}];
 });
}
function playerFollowupView(p){
 const f=p.roleFollowup,review=f?.club===managerClub()?f:null,block=playerChanceBlock(p);
 const q=rolePromiseTerms(p,p.promisedRole==='Nyckelspelare'?'Nyckelspelare':'Ordinarie');
 return `<section class="lw-panel"><h3>Assistentens råd</h3><p>${trainingSafe(playerFollowupAdvice(p))}</p><p>En konkret chans: ${rolePromiseTarget(q)} i ${q.required} av ${q.total} tillgängliga tävlingsmatcher.</p><button class="btn secondary" onclick="playerChance(${trainingSafe(JSON.stringify(p.id))})" ${block?'disabled':''}>Lova en konkret chans</button>${block?`<p>${trainingSafe(block)}</p>`:''}${review?`<p>${trainingSafe(review.topic)} · ${calText(review.date)}. ${review.closed?'Uppföljt '+calText(review.closed):'Uppföljning '+calText(review.due)}. Kalenderdatumet är en avstämning, inte löftets slutdatum.</p>${!review.closed&&review.due<=state.calendar.date?`<button class="btn secondary" onclick="playerFollowupClose(${trainingSafe(JSON.stringify(p.id))})">Markera samtalet som uppföljt</button><p>Aktiva löften fortsätter följas mot matcherna.</p>`:''}`:''}</section>`;
}
