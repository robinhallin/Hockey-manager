"use strict";

// Reports observe completed game actions. Reading a report never advances the world.
function ensureManagerFeedback(){
 if(!state.managerFeedback)state.managerFeedback={version:1,nextId:1,news:[],briefs:[],followups:[],coachHistory:[],seenMatches:[],lastDigest:null,lastBrief:null,filter:'all'};
 return state.managerFeedback;
}
function feedbackNews(key,club,kind,title,body){
 if(!state.careerStarted)return;
 const f=ensureManagerFeedback();if(f.news.some(n=>n.key===key))return;
 f.news.unshift({id:f.nextId++,key,club,league:leagueOf(club),year:recruitmentYear(),date:state.calendar.date,kind,title,body});f.news=f.news.slice(0,120);
}
function feedbackRivalEvent(e){
 if(['coach','injury'].includes(e.kind)||e.kind==='development'&&/får chansen|flyttas upp|A-laget/.test(e.title))feedbackNews(e.id,e.club,e.kind,e.title,e.text);
}
function feedbackDay(){
 const f=ensureManagerFeedback(),date=state.calendar.date;
 if(f.club!==managerClub()||f.year!==recruitmentYear()){f.club=managerClub();f.year=recruitmentYear();f.lastBrief=null;f.selectedBrief=null;}
 feedbackCloseDepartures();
 if(!f.lastBrief||date>=calAdd(f.lastBrief,7))feedbackRefresh(true);
 if(f.lastDigest&&date<calAdd(f.lastDigest,7))return;
 const rows=f.news.filter(n=>(!f.lastDigest||n.date>f.lastDigest)&&n.league===leagueOf()).slice(0,4);
 f.lastDigest=date;
 if(rows.length)managerMessage('world-digest:'+date,'Veckans ligarapport',rows.map(n=>n.title+' — '+n.body).join('\n\n'),'Ligavärlden',{link:'news'});
}
function feedbackRoleValue(p,profile){
 if(profile==='Defensiv center'&&!['B','MV'].includes(p.pos)&&positionFit(p,'C')>=.9)return attributeWeighted(playerAssessment(p).estimated,RECRUIT_PROFILES[profile].weights)*positionFit(p,'C');
 return recruitRoleValue(p,profile,true);
}
function feedbackCandidates(profile){
 const threshold=leagueOf()==='HA'?11:12,club=managerClub();
 const rate=p=>feedbackRoleValue(p,profile);
 const rank=players=>players.filter(p=>medicalReady(p)&&rate(p)>=threshold).map(p=>({p,score:rate(p)})).sort((a,b)=>b.score-a.score||String(a.p.id).localeCompare(String(b.p.id)));
 const pending=state.recruitment.deals.filter(d=>d.status==='pending'&&d.kind!=='future');
 const room=wageBudget()-annualWageCost()-loanReserved(club)-pending.reduce((s,d)=>s+(d.salary||0),0),cash=state.money-pending.reduce((s,d)=>s+(d.fee||0),0);
 const youth=rank((state.juniors?.roster||[]).filter(p=>!p.academy?.loan&&(p.academy?.seniorContract?0:p.salary)<=room))[0];
 const market=rank([...Object.entries(state.clubRosters).filter(([c])=>c!==club).flatMap(([,ps])=>ps),...(state.playerWorld?.freeAgents||[])].filter(p=>!playerLoan(p)&&!p.futureContract));
 let loan=null,transfer=null;
 for(const item of market){
  const p=item.p,owner=getPlayerClub(p.id);
  if(!loan&&owner!==WORLD_FREE){const result=loanTerms(p,owner,club,{share:.5,days:56,recall:'day28'});if(result.terms)loan={...item,cost:p.salary*result.terms.share,detail:result.reason};}
  if(!transfer){const w=recruitPlayerWishes(p,club),fee=recruitFee(p);if(w.salary<=room&&fee<=cash&&recruitWillingToSell(p,owner))transfer={...item,cost:w.salary,fee,detail:'Beräknade villkor. Klubben och spelaren måste acceptera en förhandling.'};}
  if(loan&&transfer)break;
 }
 return [{kind:'junior',item:youth},{kind:'loan',item:loan},{kind:'transfer',item:transfer}].map(({kind,item})=>item?{kind,playerId:item.p.id,name:item.p.name,club:getPlayerClub(item.p.id)||club,score:Math.round(item.score*10)/10,cost:item.cost??item.p.salary,fee:item.fee||0,detail:item.detail||'Bedömd nivå räcker. Kontrollera positionsvana och ge spelaren en plats i laget.'}:{kind,reason:'Inget spelklart alternativ når den bedömda nivån inom nuvarande villkor och löneutrymme.'});
}
function feedbackRefresh(notify=false){
 if(!state.careerStarted||state.live&&!state.live.finished)return;
 const f=ensureManagerFeedback(),need=recruitmentNeeds().find(n=>n.need||n.futureNeed);
 const b={id:f.nextId++,club:managerClub(),year:recruitmentYear(),date:state.calendar.date,profile:need?.name||null,need:need?.need||0,futureNeed:need?.futureNeed||0,reasons:need?.reasons||['Truppen har täckning för de bedömda rollerna. Följ skador, kontrakt och spelarnas löften.'],options:need?feedbackCandidates(need.name):[],decision:null};
 f.briefs.unshift(b);f.briefs=f.briefs.slice(0,12);f.lastBrief=b.date;
 if(notify)managerMessage('staff-brief:'+b.id,'Stabens veckoplan: '+(b.profile||'behåll kontinuiteten'),b.reasons.join('\n')+'\nGranska junior, lån och värvning i stabsöversikten.','Tränarteam',{link:'staffReview',feedbackBriefId:b.id});
 if(!notify){save();render();}
}
function feedbackOpenOption(briefId,index){
 const b=ensureManagerFeedback().briefs.find(b=>b.id===briefId),o=b?.options[index];
 if(!b||b.club!==managerClub()||b.year!==recruitmentYear()||!o||o.playerId===undefined)return;
 const p=findPlayerAnywhere(o.playerId)||(state.juniors?.roster||[]).find(p=>samePlayerId(p.id,o.playerId));
 if(!p)return;
 if(o.kind==='junior'&&!(state.juniors?.roster||[]).some(q=>samePlayerId(q.id,p.id))||o.kind!=='junior'&&getPlayerClub(p.id)===managerClub()){feedbackRefresh();return;}
 b.decision={kind:o.kind,playerId:p.id,date:state.calendar.date};
 if(o.kind==='junior'){deskNavigate('juniors');state.juniors.selected=p.id;save();render();}
 else if(o.kind==='loan'){deskNavigate('transfers','loans');loanOpen(p.id);}
 else deskOpenPlayer(p.id,true);
}
function feedbackBeforeArrival(p,buyer){
 if(buyer!==managerClub())return null;
 const needs=recruitmentNeeds().filter(n=>feedbackRoleValue(p,n.name)>0);
 const selected=ensureManagerFeedback().briefs.find(b=>b.club===buyer&&b.year===recruitmentYear()&&samePlayerId(b.decision?.playerId,p.id));
 const n=needs.find(n=>n.name===selected?.profile)||needs.find(n=>n.need||n.futureNeed)||needs[0];
 return n?{profile:n.name,before:n.need,futureBefore:n.futureNeed}:null;
}
function feedbackArrival(p,plan,kind){
 if(!plan)return;
 const f=ensureManagerFeedback();f.followups.unshift({id:f.nextId++,playerId:p.id,name:p.name,club:managerClub(),year:recruitmentYear(),date:state.calendar.date,kind,...plan,games:0,seconds:0,points:0,used:0,excused:0,status:'active',after:plan.before});
 f.followups=f.followups.slice(0,60);
}
function feedbackCloseDepartures(){
 for(const r of ensureManagerFeedback().followups.filter(r=>r.status==='active')){
  if(r.club!==managerClub()||r.year!==recruitmentYear()||!managerRoster().some(p=>samePlayerId(p.id,r.playerId))){r.status='closed';r.result='Avslutad före fem matcher: spelaren, klubben eller säsongen har ändrats.';}
 }
}
function feedbackAfterMatch(m){
 if(!coachEligible(m))return;
 const f=ensureManagerFeedback(),key=m.club+':'+m.year+':'+m.id;if(f.seenMatches.includes(key))return;
 f.seenMatches.push(key);f.seenMatches=f.seenMatches.slice(-240);feedbackCloseDepartures();
 const needs=recruitmentNeeds();
 for(const r of f.followups.filter(r=>r.status==='active')){
  const p=managerRoster().find(p=>samePlayerId(p.id,r.playerId)),row=m.players.find(p=>samePlayerId(p.id,r.playerId));
  const required=p.pos==='MV'?1800:720;
  if(medicalExcused(p,required)||medicalLimit(p)<required){r.excused++;continue;}
  r.games++;r.seconds+=row?.seconds||0;r.points+=(row?.goals||0)+(row?.assists||0);if((row?.seconds||0)>=required)r.used++;
  r.after=needs.find(n=>n.name===r.profile)?.need??r.before;
  if(r.games>=5){r.status='complete';r.result=r.used<3?'Rollen behöver ses över: tillräcklig istid i färre än tre matcher.':r.after<r.before?'Behovet är bättre täckt enligt stabens aktuella bedömning.':r.after===0?'Rollen har täckning enligt stabens aktuella bedömning.':'Det bedömda truppbehovet kvarstår.';
   managerMessage('arrival-review:'+r.id,'Uppföljning: '+r.name,r.result+` ${r.used}/5 matcher med minst ${required/60} minuter. Bedömningen påverkas även av övriga truppen och skador.`,'Tränarteam',{link:'staffReview'});
  }
 }
 for(const row of m.players.filter(p=>(p.goals||0)+(p.assists||0)>=2)){
  const p=managerRoster().find(p=>samePlayerId(p.id,row.id));if(p?.age<=21)feedbackNews('youth:'+m.year+':'+m.id+':'+p.id,m.club,'development',p.name+' visar framfötterna',`${row.goals||0} mål och ${row.assists||0} assist mot ${m.opponent}. En enskild match är ett tidigt tecken, inte ett säkert genombrott.`);
 }
}
function feedbackArchiveCoach(){
 const focus=coachFocus();if(!focus)return;
 const f=ensureManagerFeedback();f.coachHistory.unshift(JSON.parse(JSON.stringify(focus)));f.coachHistory=f.coachHistory.slice(0,16);
}
function feedbackCoachView(f){
 const avg=rows=>rows.length?(rows.reduce((s,r)=>s+r.value,0)/rows.length).toFixed(1):'–';
 return `<article class="feedback-item"><h3>${trainingSafe(COACH_FOCUSES[f.key]?.name||f.key)}</h3><p>${trainingSafe(f.date)} · ${f.results.length}/${f.target||3} matcher · ${f.sessions.length} relevanta träningspass</p><p>Före: ${avg(f.baseline)} per match. Efter: ${avg(f.results)} per match.</p><p class="muted">Litet underlag; motstånd, speltid och matchbild påverkar. Detta visar samvariation, inte en säker taktisk effekt.</p>${deskLink('Granska matchunderlaget',{page:'statistics'})}</article>`;
}
function feedbackBriefView(b){
 if(!b)return '<p>Be staben ta fram ett första underlag.</p>';
 return `<article class="feedback-item"><h2>${trainingSafe(b.profile||'Behåll kontinuiteten')}</h2><p>${trainingSafe(b.date)} · ${trainingSafe(b.club)} · Nu: ${b.need} luckor · Nästa säsong: ${b.futureNeed}</p>${b.reasons.map(r=>`<p>${trainingSafe(r)}</p>`).join('')}<p class="muted">Underlaget gäller datumet ovan. Nivåerna är scoutbedömningar. Uppdatera inför beslut; fönster, hälsa och villkor kontrolleras igen i respektive ärende.</p><div class="feedback-options">${b.options.map((o,i)=>`<section><h3>${({junior:'Egen junior',loan:'Lån',transfer:'Värvning'})[o.kind]}</h3>${o.playerId===undefined?`<p>${trainingSafe(o.reason)}</p>`:`<strong>${trainingSafe(o.name)}</strong><p>Bedömd rollnivå ${o.score}/20 · ${careerMoney(o.cost)}/år${o.fee?' · övergång cirka '+careerMoney(o.fee):''}</p><p>${trainingSafe(o.detail)}</p><button class="btn secondary" onclick="feedbackOpenOption(${b.id},${i})">Granska alternativ</button>`}</section>`).join('')}</div>${b.decision?'<p>Alternativ öppnat för granskning. En genomförd flytt följs upp nedan.</p>':''}</article>`;
}
function staffReviewView(){
 const f=ensureManagerFeedback(),brief=f.selectedBrief?f.briefs.find(b=>b.id===f.selectedBrief):f.briefs.find(b=>b.club===managerClub()&&b.year===recruitmentYear());
 const promises=[...(state.training?.promises||[]).map(p=>({...p,minutes:15})),...managerRoster().filter(p=>p.recruitmentPromise).map(p=>({...p.recruitmentPromise,name:p.name}))];
 return `<section class="card feedback-page"><h1>Stab & uppföljning</h1><p>Från truppbehov till beslut och faktisk speltid.</p><button class="btn" onclick="state.managerFeedback.selectedBrief=null;feedbackRefresh()">Uppdatera stabsunderlaget</button>${f.selectedBrief&&!brief?'<p>Det äldre underlaget finns inte längre i rapportarkivet. Uppdatera för en aktuell bedömning.</p>':feedbackBriefView(brief)}<details><summary>Tidigare stabsunderlag</summary>${f.briefs.filter(b=>b.club===managerClub()).map(b=>`<p><button class="btn secondary" onclick="state.managerFeedback.selectedBrief=${b.id};save();render()">${trainingSafe(b.date)} · ${trainingSafe(b.profile||'Kontinuitet')}</button></p>`).join('')}</details><h2>Genomförda förstärkningar</h2>${f.followups.filter(r=>r.club===managerClub()).map(r=>`<article class="feedback-item"><h3>${trainingSafe(r.name)} · ${trainingSafe(r.profile)}</h3><p>${trainingSafe(r.date)} · ${r.games}/5 matcher · ${Math.round(r.seconds/60)} minuter · ${r.points} poäng · ${r.excused} medicinskt undantagna matcher</p><p>Bedömd lucka vid ankomst: ${r.before}. Vid senaste match: ${r.after}.</p><p>${trainingSafe(r.result||'Uppföljning pågår. Träningsmatcher och ofullständiga matcher räknas inte.')}</p>${deskLink('Se över laguttagningen',{page:'lines'})}</article>`).join('')||'<p>Nya värvningar, lån och uppflyttningar följs här efter genomförd flytt.</p>'}<h2>Speltidslöften</h2>${promises.map(p=>`<article class="feedback-item"><strong>${trainingSafe(p.name)}</strong><p>${p.qualified}/${rolePromiseRule(p).required} matcher med minst ${p.minutes} minuter · ${p.games}/${rolePromiseRule(p).total} bedömda matcher · ${trainingSafe(p.resolved?(p.result||'Avslutat'):'Pågår')}</p></article>`).join('')||'<p>Inga registrerade speltidslöften.</p>'}${deskLink('Spelarnas förtroende',{page:'locker'})}<h2>Tränings- och taktisk uppföljning</h2>${coachFocus()?feedbackCoachView(coachFocus()):'<p>Välj ett mätbart fokus i matchanalysen för att börja följa effekten av arbetet.</p>'}${deskLink('Välj fokus och granska matcher',{page:'statistics'})}<details><summary>Tidigare fokus (${f.coachHistory.length})</summary>${f.coachHistory.filter(c=>c.club===managerClub()).map(feedbackCoachView).join('')}</details><p>${deskLink('Följ säsongens överenskommelser och historier',{page:'stories'})}</p></section>`;
}
function feedbackNewsView(){
 const f=ensureManagerFeedback(),rows=f.news.filter(n=>f.filter==='all'||(f.filter==='own'?n.club===managerClub():n.league===f.filter));
 return `<section class="card feedback-page"><h1>Liganyheter</h1><p>Rapporter från genomförda händelser i din spelvärld.</p><div class="feedback-filters">${[['all','Alla'],['SHL','SHL'],['HA','Hockeyallsvenskan'],['own','Min klubb']].map(([key,label])=>`<button class="btn secondary" aria-pressed="${f.filter===key}" onclick="state.managerFeedback.filter='${key}';save();render()">${label}</button>`).join('')}</div>${rows.map(n=>`<details class="league-news-row"><summary><small>${trainingSafe(n.date)} · ${trainingSafe(n.club)}</small><strong>${trainingSafe(n.title)}</strong></summary><p>${trainingSafe(n.body)}</p></details>`).join('')||'<p>Nya händelser visas när spelvärlden går vidare.</p>'}<details><summary>Klubbens tidigare notiser</summary>${(state.news||[]).map(n=>`<p>${trainingSafe(n)}</p>`).join('')}</details></section>`;
}
function validateManagerFeedbackSave(s){
 const f=s.managerFeedback;if(!f)return;
 const fail=()=>{throw Error('Stabens rapporthistorik är felaktig.');};
 if(f.version!==1||!Number.isInteger(f.nextId)||f.nextId<1||!['all','own','SHL','HA'].includes(f.filter))fail();
 for(const [key,max] of [['news',120],['briefs',12],['followups',60],['coachHistory',16],['seenMatches',240]])if(!Array.isArray(f[key])||f[key].length>max)fail();
 for(const n of f.news)if(!n||!Number.isInteger(n.id)||['key','club','date','title','body'].some(k=>typeof n[k]!=='string'))fail();
 for(const b of f.briefs)if(!b||!Number.isInteger(b.id)||!Array.isArray(b.options)||b.options.length>3||!Array.isArray(b.reasons)||b.reasons.some(r=>typeof r!=='string')||b.options.some(o=>!o||!['junior','loan','transfer'].includes(o.kind)))fail();
 for(const r of f.followups)if(!r||!['active','closed','complete'].includes(r.status)||!RECRUIT_PROFILES[r.profile]||['games','seconds','points','used','excused','before','after'].some(k=>!Number.isFinite(r[k])||r[k]<0)||r.games>5)fail();
 if(f.selectedBrief!=null&&!Number.isInteger(f.selectedBrief))fail();
 for(const b of f.briefs){if(typeof b.club!=='string'||typeof b.date!=='string'||!Number.isInteger(b.year)||['need','futureNeed'].some(k=>!Number.isFinite(b[k])||b[k]<0)||b.profile!==null&&!RECRUIT_PROFILES[b.profile])fail();for(const o of b.options){if(o.playerId!==undefined&&(typeof o.name!=='string'||typeof o.detail!=='string'||['score','cost','fee'].some(k=>!Number.isFinite(o[k])||o[k]<0)))fail();if(o.playerId===undefined&&typeof o.reason!=='string')fail();}}
 for(const r of f.followups)if(!Number.isInteger(r.id)||typeof r.name!=='string'||typeof r.date!=='string'||typeof r.club!=='string'||!Number.isInteger(r.year))fail();
 for(const c of f.coachHistory)if(!c||!COACH_FOCUSES[c.key]||['baseline','results','sessions'].some(k=>!Array.isArray(c[k]))||[...c.baseline,...c.results].some(r=>!r||!Number.isFinite(r.value)))fail();
}
