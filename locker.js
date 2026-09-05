"use strict";

// Fictional personalities for the game, not assessments of the real people.
function ensureLocker(){
 if(!state.careerStarted)return;
 const initial=!state.locker;
 if(initial)state.locker={version:1,turn:0,captainId:null,captainChanged:-10,pairs:{},log:[],lastMatch:null,talkHistory:[]};
 for(const roster of Object.values(state.clubRosters))for(const p of roster)if(!p.social){
   const trait=key=>1+Math.floor(attrSeed(`${p.id}:personality:${key}`)*20);
   p.social={ambition:trait('ambition'),loyalty:trait('loyalty'),sensitivity:trait('sensitivity'),leadership:trait('leadership'),trust:60,lastTalk:-10,missed:0,lastMinutes:null,praisedGrowth:socialGrowth(p),lastResponse:''};
 }
 if(initial)state.locker.captainId=[...managerRoster()].sort((a,b)=>b.social.leadership-a.social.leadership||b.age-a.age)[0]?.id??null;
 else if(!managerRoster().some(p=>samePlayerId(p.id,state.locker.captainId)))state.locker.captainId=null;
}
function socialGrowth(p){return Object.values(p.attributes||{}).reduce((sum,n)=>sum+n,0);}
function socialPersonality(p){const s=p.social;return [s.ambition>=14?'Ambitiös':s.ambition<=7?'Tålmodig':'Målmedveten',s.loyalty>=14?'Lojal':s.loyalty<=7?'Självständig':'Lagorienterad',s.sensitivity>=14?'Behöver trygghet':s.sensitivity<=7?'Tål raka besked':'Lyhörd'].join(' · ');}
function socialTrustText(n){return n>=75?'Starkt förtroende':n>=50?'Gott förtroende':n>=30?'Tveksam till ledarskapet':'Lågt förtroende';}
function socialPairKey(a,b){return JSON.stringify([String(a),String(b)].sort());}
function socialPair(a,b,create=false){const key=socialPairKey(a,b),r=state.locker.pairs;if(create&&!r[key])r[key]={ids:[String(a),String(b)],bond:30,seconds:0};return r[key];}
function socialPairs(players,fn){const ids=[...new Set(players.filter(Boolean).filter(p=>p.pos!=='MV').map(p=>String(p.id)))];for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++)fn(ids[i],ids[j]);}
function socialChemistry(players){let sum=0,count=0;socialPairs(players,(a,b)=>{sum+=socialPair(a,b)?.bond??30;count++;});return count?sum/count:30;}
function trackSocialIce(players,seconds){
 if(!state.locker||!Number.isFinite(seconds)||seconds<=0)return;
 socialPairs(players,(a,b)=>{const pair=socialPair(a,b,true);pair.seconds+=seconds;pair.bond=Math.min(90,pair.bond+seconds/1800);});
}
function trainSocialPairs(session){
 ensureLocker();if(!state.locker||!['tactics','matchprep','powerplay','penaltykill','skills'].includes(session.type))return;
 ensureLines();
 let units=Array.from({length:4},(_,i)=>state.lines.forwards.slice(i*3,i*3+3));
 units.push(...Array.from({length:3},(_,i)=>state.lines.defense.slice(i*2,i*2+2)));
 if(session.type==='powerplay'||session.type==='penaltykill'){ensureSpecialTeams();units=Object.entries(state.specialTeams).filter(([key])=>key.startsWith(session.type==='powerplay'?'pp':'pk')).map(([,ids])=>ids);}
 const seen=new Set();
 for(const ids of units){const players=ids.map(playerById).filter(p=>p&&p.trainingLoad!=='rest');socialPairs(players,(a,b)=>{const key=socialPairKey(a,b);if(seen.has(key))return;seen.add(key);const pair=socialPair(a,b,true);pair.bond=Math.min(90,pair.bond+(session.type==='tactics'?.8:.4));});}
}
function socialLog(title,body){const r=state.locker;r.log.unshift({turn:r.turn,year:state.season?.year||2026,title,body});r.log=r.log.slice(0,60);managerMessage(`locker:${r.turn}:${r.log.length}:${title}`,title,body,'Omklädningsrum',{link:'locker'});}
function lockerNotice(text){state.locker.message=text;save();render();}
function appointCaptain(id,reason='leadership'){
 ensureLocker();const r=state.locker,p=managerRoster().find(p=>samePlayerId(p.id,id));
 if(!p||samePlayerId(id,r.captainId)||!['leadership','generation','rotation'].includes(reason))return;
 if(state.live&&!state.live.finished)return lockerNotice('Kaptensbytet görs mellan matcher.');
 if(r.captainId!==null&&r.turn-r.captainChanged<5)return lockerNotice('Ge ledargruppen fem matcher innan nästa kaptensbyte.');
 const previous=managerRoster().find(p=>samePlayerId(p.id,r.captainId));
 if(previous){previous.social.trust=trainingClamp(previous.social.trust-(reason==='generation'&&previous.age>=30?1:4));
   for(const q of managerRoster())if(q.id!==p.id&&q.id!==previous.id&&(socialPair(q.id,previous.id)?.bond||0)>=50)q.social.trust=trainingClamp(q.social.trust-1);
 }
 r.captainId=p.id;r.captainChanged=r.turn;p.social.trust=trainingClamp(p.social.trust+2);
 const why={leadership:'Du lyfter fram spelarens ledarskap.',generation:'Du förklarar att laget går in i en generationsväxling.',rotation:'Du vill fördela ansvaret på ett nytt sätt.'}[reason];
 socialLog(`${p.name} utses till kapten`,`${why} ${previous?`${previous.name} lämnar uppdraget och ${reason==='generation'&&previous.age>=30?'accepterar förklaringen, men är besviken.':'tappar en del förtroende för beslutet.'}`:'Laget har fått en ny representant.'}`);
 lockerNotice('Kaptensvalet är meddelat till truppen.');
}
function socialTalk(id,topic){
 ensureLocker();const r=state.locker,p=managerRoster().find(p=>samePlayerId(p.id,id));if(!p||!['praise','bench','listen','challenge'].includes(topic))return;
 if(state.live&&!state.live.finished)return lockerNotice('Ta det individuella samtalet mellan matcher.');
 const s=p.social;if(r.turn-s.lastTalk<3)return lockerNotice(`${p.name} behöver tid att se handling bakom samtalet. Nästa individuella samtal är möjligt efter tre matcher.`);
 let delta=0,text='';
 if(topic==='praise'){
   const growth=socialGrowth(p)-s.praisedGrowth;
   if(growth>0){delta=s.loyalty>=14?4:3;text='Berömmet är konkret: spelaren har utvecklat sina attribut och uppskattar att du har sett arbetet.';s.praisedGrowth=socialGrowth(p);}
   else{delta=-1;text='Spelaren ser ingen ny utveckling som förklarar berömmet och uppfattar det som tomma ord.';}
 }else if(topic==='bench'){
   if(s.lastMinutes!==null&&s.lastMinutes<12){delta=s.loyalty>=12?3:1;text='Du förklarar konkurrensen och laguttagningen utan att lova mer istid. Spelaren uppskattar beskedet, men vill visa att hen förtjänar en större roll.';}
   else{delta=-1;text='Spelaren förstår inte varför du tar upp en petning när den senaste matchen inte visar något sådant.';}
 }else if(topic==='listen'){
   delta=p.happiness<65||s.trust<50?3:1;text=p.happiness<65?'Spelaren berättar om missnöjet med sin situation. Att du lyssnar stärker förtroendet, men ersätter inte utlovad speltid.':'Ni stämmer av spelarens situation. Samtalet är lugnt och förtroendet stärks något.';
 }else{
   const fair=s.lastMinutes!==null&&s.lastMinutes>=12&&p.fatigue<65;
   delta=fair&&s.ambition>=12&&s.sensitivity<=12?3:-3;
   text=delta>0?'Spelaren svarar på din tydliga utmaning och vill ta mer ansvar.':'Kraven landar illa. Spelaren behöver trygghet, återhämtning eller en faktisk chans att visa sig.';
 }
 s.trust=trainingClamp(s.trust+delta);s.lastTalk=r.turn;s.lastResponse=text;
 socialLog(`Samtal med ${p.name}`,`${text} Förtroende ${delta>0?'+':''}${delta}.`);lockerNotice(`${p.name}: ${text}`);
}
function afterLockerMatch(){
 ensureLocker();const r=state.locker,m=state.live,key=`${state.season?.year||2026}:${state.round}`;
 if(!m?.finished||r.lastMatch===key)return;r.lastMatch=key;r.turn++;
 for(const p of managerRoster()){
   const s=p.social,seconds=m.iceTime?.[p.id]||0,expected=p.pos==='MV'?1800:p.promisedRole==='Nyckelspelare'?900:p.promisedRole==='Ordinarie'?720:0;
   s.lastMinutes=seconds/60;
   const missed=expected>0&&seconds<expected&&p.fatigue<65&&p.trainingLoad!=='rest';s.missed=missed?s.missed+1:0;
   if(s.missed>=2){s.trust=trainingClamp(s.trust-(s.ambition>=14?3:1));if(s.missed===2)socialLog(`${p.name} undrar över sin roll`,`${p.name} har fått mindre istid än sin utlovade roll i två matcher. Ett ärligt samtal kan hjälpa, men laguttagningen behöver också motsvara dina besked.`);}
   for(const promise of [...(state.training?.promises||[]).filter(q=>samePlayerId(q.playerId,p.id)),...(p.recruitmentPromise?[p.recruitmentPromise]:[])]){
     if(!promise.resolved||promise.lockerReviewed)continue;promise.lockerReviewed=true;
     const neutral=promise.result&&!['Uppfyllt','Brutet'].includes(promise.result);
     if(!neutral){const met=promise.qualified>=2;s.trust=trainingClamp(s.trust+(met?4:-8));socialLog(`${p.name}: förtroende efter löftet`,met?'Du höll löftet om istid. Förtroendet stärks.':'Löftet om istid höll inte. Spelaren tappar förtroende.');}
   }
 }
 const captain=managerRoster().find(p=>samePlayerId(p.id,r.captainId));
 if(captain&&captain.social.leadership>=14){const effect=captain.social.trust>=65?1:captain.social.trust<35?-1:0;
   for(const p of managerRoster())if(p!==captain)p.social.trust=trainingClamp(p.social.trust+effect);
   if(effect&&r.turn%3===0)socialLog('Kaptenens röst i gruppen',effect>0?`${captain.name} hjälper laget att behålla förtroendet för ditt arbete.`:`${captain.name}s tveksamhet till ditt ledarskap påverkar gruppen.`);
 }
}
function socialTalkSlot(m=state.live){return m?.finished?'post':m?.period===4?`ot${m.overtimePeriods||1}`:`p${m?.period||1}`;}
function canTeamTalk(){const m=state.live;if(!m||m.running)return false;const slot=socialTalkSlot(m);return !m.socialTalks?.[slot]&&(m.finished||(!m.socialStarted?.[slot]&&m.minute===0&&m.second===0));}
function markSocialPeriodStarted(){const m=state.live;if(!m)return;if(!m.socialStarted)m.socialStarted={};m.socialStarted[socialTalkSlot(m)]=true;}
function teamTalk(kind){
 ensureLocker();if(!['support','demand','praise','focus'].includes(kind)||!canTeamTalk())return;
 const m=state.live,r=state.locker,slot=socialTalkSlot(),lead=m.hv-m.opp,pre=slot==='p1';
 const repeated=r.talkHistory.slice(-3).filter(k=>k===kind).length,scale=1-repeated*.15;
 const reactions=managerRoster().map(p=>{
   const s=p.social;let effect=0,reason='';
   if(kind==='support'){effect=s.sensitivity>=12?1:.35;reason=s.sensitivity>=12?'Känner större trygghet':'Uppskattar stödet';}
   if(kind==='demand'){effect=(pre||lead<0)&&s.ambition>=12&&s.sensitivity<=12?1:-.8;reason=effect>0?'Svarar på utmaningen':'Känner onödig press';}
   if(kind==='praise'){effect=!pre&&lead>0?.8:-.7;reason=effect>0?'Stolt över insatsen':'Tycker inte berömmet stämmer med matchen';}
   if(kind==='focus'){effect=.25;reason='Tar till sig de lugna instruktionerna';}
   effect*=scale;s.trust=trainingClamp(s.trust+(effect>.5?1:effect<-.5?-1:0));return {id:p.id,name:p.name,effect,reason};
 });
 if(!m.socialTalks)m.socialTalks={};m.socialTalks[slot]={kind,reactions};r.talkHistory.push(kind);r.talkHistory=r.talkHistory.slice(-10);
 if(m.finished)socialLog('Samtalet efter slutsignalen',`${reactions.filter(x=>x.effect>0).length} spelare tog emot budskapet positivt och ${reactions.filter(x=>x.effect<0).length} reagerade negativt.`);
 save();render();
}
function lockerMatchBonus(){
 if(!state.locker||!state.live||state.live.finished)return 0;
 const players=[...currentLinePlayers(),...currentDefensePlayers()];if(!players.length)return 0;
 const trust=players.reduce((n,p)=>n+(p.social?.trust??60),0)/players.length;
 const talk=state.live.socialTalks?.[socialTalkSlot()]?.reactions||[];
 const response=players.reduce((n,p)=>n+(talk.find(x=>samePlayerId(x.id,p.id))?.effect||0),0)/players.length;
 return Math.max(-2,Math.min(2,(socialChemistry(players)-30)/50+(trust-60)/60+response));
}
function teamTalkPanel(){
 const m=state.live;if(!m)return '';const report=m.socialTalks?.[socialTalkSlot()],available=canTeamTalk();
 return `<section class="locker-talk"><div><span class="career-eyebrow">${m.finished?'EFTER MATCHEN':m.period===1?'FÖRE NEDSLÄPP':'PERIODSNACK'}</span><h2>Vad vill du säga till laget?</h2><p>${available?'Välj ett budskap. Spelarna reagerar utifrån personlighet och matchbild.':report?'Spelarna har hört ditt budskap.':'Nästa lagsnack kan hållas vid periodpausen.'}</p></div>${available?`<div class="locker-actions">${[['support','Ge stöd'],['demand','Kräv mer'],['praise','Beröm insatsen'],['focus','Lugna och fokusera']].map(([k,label])=>`<button class="btn secondary" onclick="teamTalk('${k}')">${label}</button>`).join('')}</div>`:''}${report?`<details><summary>${report.reactions.filter(x=>x.effect>0).length} positiva · ${report.reactions.filter(x=>x.effect<0).length} negativa reaktioner</summary>${report.reactions.map(x=>`<div class="locker-reaction"><span>${trainingSafe(x.name)}</span><span>${x.reason}</span></div>`).join('')}</details>`:''}<p class="training-note">Ett budskap per paus. Upprepade budskap får mindre effekt. Motivation gäller den aktuella perioden; attribut och taktik väger tyngre än lagsnack.</p></section>`;
}
function lockerPlayerPanel(p){
 ensureLocker();const s=p.social;if(!s)return '';const partners=managerRoster().filter(q=>q.pos!=='MV'&&!samePlayerId(q.id,p.id)).map(q=>({p:q,pair:socialPair(p.id,q.id)})).filter(x=>x.pair).sort((a,b)=>b.pair.bond-a.pair.bond).slice(0,2);
 return `<section class="locker-player-panel">${state.locker.message?`<p role="status">${trainingSafe(state.locker.message)}</p>`:''}<h3>${samePlayerId(p.id,state.locker.captainId)?'C · ':''}${socialTrustText(s.trust)}</h3><p>${socialPersonality(p)} · Ledarskap: ${s.leadership>=15?'Tongivande':s.leadership>=9?'Tar ansvar':'Följer gruppen'}</p><p>Förtroende ${Math.round(s.trust)}/100${s.lastMinutes!==null?` · Senaste matchen: ${Math.floor(s.lastMinutes)} min`:''}</p>${partners.length?`<p>Mest samspel med ${partners.map(x=>`${trainingSafe(x.p.name)} (${Math.round(x.pair.bond)}/100)`).join(' och ')}.</p>`:''}<div class="locker-actions">${[['praise','Beröm utveckling'],['bench','Förklara petning'],['listen','Lyssna på spelaren'],['challenge','Utmana spelaren']].map(([key,label])=>`<button class="btn secondary" onclick="socialTalk('${p.id}','${key}')" ${state.locker.turn-s.lastTalk<3?'disabled':''}>${label}</button>`).join('')}</div>${s.lastResponse?`<p class="locker-response">${trainingSafe(s.lastResponse)}</p>`:''}</section>`;
}
function lockerView(){
 ensureLocker();ensureLines();const r=state.locker,roster=managerRoster(),captain=roster.find(p=>samePlayerId(p.id,r.captainId)),trust=roster.reduce((n,p)=>n+p.social.trust,0)/Math.max(1,roster.length);
 const units=[...Array.from({length:4},(_,i)=>({name:`Kedja ${i+1}`,players:state.lines.forwards.slice(i*3,i*3+3).map(playerById).filter(Boolean)})),...Array.from({length:3},(_,i)=>({name:`Backpar ${i+1}`,players:state.lines.defense.slice(i*2,i*2+2).map(playerById).filter(Boolean)}))];
 return `<section class="locker-page"><header class="daily-heading"><div><span class="career-eyebrow">MÄNNISKORNA BAKOM RESULTATEN</span><h1>Omklädningsrummet.</h1><p>Förtroende byggs av vad du säger och vad du sedan gör.</p></div><button class="btn secondary" onclick="trainingOpen('lines')">Till laguttagningen</button></header><div class="locker-leadership"><div><span>Lagets förtroende</span><h2>${Math.round(trust)}/100</h2><p>${socialTrustText(trust)}</p></div><form onsubmit="event.preventDefault();appointCaptain(this.elements.captain.value,this.elements.reason.value)"><h2>${captain?`C · ${trainingSafe(captain.name)}`:'Välj en ny kapten'}</h2><label>Kapten<select name="captain">${[...roster].sort((a,b)=>b.social.leadership-a.social.leadership).map(p=>`<option value="${p.id}" ${samePlayerId(p.id,r.captainId)?'selected':''}>${trainingSafe(p.name)} · ${p.social.leadership>=15?'Tongivande':p.social.leadership>=9?'Tar ansvar':'Följer gruppen'}</option>`).join('')}</select></label><label>Förklaring<select name="reason"><option value="leadership">Lyfta ledarskapet</option><option value="generation">Generationsväxling</option><option value="rotation">Fördela ansvaret</option></select></label><button class="btn" type="submit">Utse kapten</button><p>En tongivande kapten förmedlar sitt förtroende eller sin tveksamhet till gruppen. Fem matcher mellan kaptensbyten.</p></form></div>${r.message?`<p class="locker-response" role="status">${trainingSafe(r.message)}</p>`:''}<h2>Kedjekemi</h2><div class="locker-units">${units.map(u=>`<article><span>${u.name}</span><h3>${Math.round(socialChemistry(u.players))}/100</h3><progress max="100" value="${socialChemistry(u.players)}" aria-label="Samspel ${u.name}"></progress><p>${u.players.map(p=>trainingSafe(p.name)).join(' · ')}</p></article>`).join('')}</div><p>Gemensamma träningspass och faktisk tid tillsammans på isen bygger samspel. En ny kombination behöver lära känna varandra.</p><h2>Spelarnas situation</h2><div class="locker-roster">${[...roster].sort((a,b)=>a.social.trust-b.social.trust).map(p=>`<details><summary><strong>${samePlayerId(p.id,r.captainId)?'C · ':''}${trainingSafe(p.name)}</strong><span>${p.pos} · ${socialTrustText(p.social.trust)}</span></summary>${lockerPlayerPanel(p)}</details>`).join('')}</div><h2>Händelser i gruppen</h2>${r.log.slice(0,15).map(e=>`<article class="locker-event"><span>${seasonLabel(e.year)} · match ${e.turn}</span><h3>${trainingSafe(e.title)}</h3><p>${trainingSafe(e.body)}</p></article>`).join('')||'<p>Här samlas samtal, kaptensbyten och uppföljningar.</p>'}<p class="training-note">Personligheterna är fiktiva speldata, inte bedömningar av verkliga personer. Förtroende och samspel sparas mellan säsongerna.</p></section>`;
}
