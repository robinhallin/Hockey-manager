"use strict";
function recruitmentDecisionItems(){
 const o=scoutingOffice(),items=[];if(!o)return items;
 const add=x=>items.push({owner:'Du',area:'scouting',level:'medium',score:61,tag:'Rekrytering',requiresDecision:false,...x});
 for(const [id,r] of Object.entries(state.scoutReports||{})){
  const p=findPlayerAnywhere(id);if(!p||isOwnPlayer(p)||!r.lastObserved||calGap(r.lastObserved,state.calendar.date)>14)continue;
  if(o.readReports?.[id]===r.lastObserved)continue;
  add({id:'sc-report:'+id,title:'Ny rapport: '+p.name,detail:`${r.observer?.name||'Staben'} · ${r.visits} observationer. Värdera roll, risk och kostnad innan kontakt eller bud.`,action:{scoutPlayer:id}});
 }
 for(const [id,c] of Object.entries(o.contacts)){
  const p=findPlayerAnywhere(id);if(!p||isOwnPlayer(p)||!scoutingContactKnown(p)||o.readContacts?.[id]===c.date)continue;
  add({id:'sc-contact:'+id,title:'Kontaktbesked: '+p.name,detail:`${c.interest}. Indikerad årslön ${scoutingCash(c.salary)}. Giltigt till ${calText(calAdd(c.date,30))}.`,score:73,action:{scoutPlayer:id,contact:true}});
 }
 for(const p of managerRoster()){
  const q=p.usagePromise;if(!q||q.resolved||q.club!==managerClub())continue;
  const needed=q.required-q.qualified,left=q.total-q.games;if(needed<=0)continue;
  add({id:'usage:'+p.id,title:`${p.name}: ${q.name.toLowerCase()}`,detail:`${needed} fler matcher måste motsvara löftet; ${left} bedömda matcher återstår. Granska uttagningen före nästa match.`,tag:'Löfte',area:'locker',level:left<=needed?'high':'medium',score:left<=needed?87:57,action:{promisePlayer:p.id}});
 }
 for(const d of state.recruitment.deals.filter(d=>d.status==='pending'&&d.rival))add({id:'sc-rival:'+d.id,title:'Konkurrens om '+d.name,detail:`${d.rival.club} finns med i förhandlingen. Jämför erbjudandet och ha ett alternativ redo.`,score:79,action:{deal:'transfer:'+d.id}});
 return items;
}
function scoutingOpenDecision(id,contact=false){
 const p=findPlayerAnywhere(id);if(!p)return;const o=ensureScoutingOffice();
 if(contact){o.readContacts??={};o.readContacts[String(id)]=o.contacts[String(id)]?.date;}
 else {o.readReports??={};o.readReports[String(id)]=state.scoutReports[String(id)]?.lastObserved;}
 recruitOpen(id);if(contact){recruitHub.panel='transfer';render();}save();
}
function managerRecruitmentBriefView(){
 const items=recruitmentDecisionItems().sort((a,b)=>b.score-a.score).slice(0,4);
 return items.length?`<section class="sc-card sc-decisions"><span class="sc-label">REKRYTERING · BESLUT ATT TA</span>${items.map((item,i)=>managerOffice2Row(item,i)).join('')}</section>`:'';
}
function managerDailyBriefView(){
 const r=state.calendar?.dayReview;if(!r||r.club!==managerClub()||r.nextDate!==state.calendar.date)return '';
 const headlines=r.decisionHeadlines||r.headlines||[],world=r.worldNews||[];
 return `<section class="sc-day-brief" aria-label="Dagens besked"><header><span class="sc-label">${calText(r.date)} → ${calText(r.nextDate)}</span><h2>Dagen är genomförd</h2></header><div class="sc-day-columns"><div><h3>Klubben & dina beslut</h3>${headlines.map(m=>`<button class="rh-link" onclick="managerBriefMessage(${Number(m.id)})">${trainingSafe(m.title)} →</button>`).join('')||'<p>Inga nya klubbärenden kräver uppmärksamhet.</p>'}</div><div><h3>Marknaden & serien</h3>${world.map(n=>`<article><b>${trainingSafe(n.title)}</b><p>${trainingSafe(n.body)}</p></article>`).join('')||'<p>Inga nya registrerade marknads- eller ligahändelser under detta dagssteg.</p>'}</div></div><p>${r.reports} nya klubbmeddelanden totalt. ${r.moneyChange?'Kassaförändring: '+scoutingCash(r.moneyChange)+'.':''}</p></section>`;
}
function managerBriefMessage(id){managerCloseBrief();openManagerMessage(id);}
let managerContinueBusy=false;
function managerCloseBrief(){const root=document.getElementById('manager-progress-root');if(root)root.innerHTML='';if(!managerContinueBusy)document.getElementById('continueGame')?.focus();}
function managerContinueWithBriefing(){
 if(managerContinueBusy)return;
 const preview=managerDayPreview();if(!preview||!['training','rest','debrief'].includes(preview.kind)){continueGame();return;}
 const date=state.calendar.date,club=managerClub(),root=document.getElementById('manager-progress-root');
 managerContinueBusy=true;document.getElementById('continueGame').disabled=true;
 if(root)root.innerHTML='<div class="sc-progress" role="status" aria-live="polite"><div><span class="sc-label">DAGEN BEARBETAS</span><h2>Träning, scouting och hockeyvärlden</h2><p>Genomför dagens aktiviteter och sammanställer beskeden…</p></div></div>';
 // Yield once so the browser can paint. This is one calendar action, no artificial timer or extra simulation.
 setTimeout(()=>{
  try{
   if(state.calendar.date!==date||managerClub()!==club||careerScreen){if(root)root.innerHTML='';return;}
   continueGame();
   if(root&&state.calendar.date!==date){root.innerHTML=`<div class="sc-progress" role="dialog" aria-modal="true" aria-label="Dagen genomförd"><div tabindex="-1" id="manager-brief-content">${managerDailyBriefView()}<button id="manager-brief-close" class="btn" onclick="managerCloseBrief()">Till dagens arbete</button></div></div>`;document.getElementById('manager-brief-close')?.focus();}
   else if(root)root.innerHTML='';
  }catch(error){if(root)root.innerHTML='';throw error;}
  finally{managerContinueBusy=false;document.getElementById('continueGame').disabled=false;}
 },0);
}
document.addEventListener('keydown',e=>{const root=document.getElementById('manager-progress-root');if(!root?.innerHTML||managerContinueBusy)return;if(e.key==='Escape'){e.preventDefault();managerCloseBrief();}if(e.key==='Tab'){const controls=root.querySelectorAll?.('button,[href],input,select,[tabindex="0"]');if(!controls?.length)return;const first=controls[0],last=controls[controls.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
