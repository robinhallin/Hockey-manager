"use strict";

// Presentation state only. The calendar remains the sole authority for time,
// simulation, decisions and saves. No extra RNG calls or artificial delay.
let dayTransition=null;
function dayTransitionGames(){
 const games=(state.schedule||[]).map(g=>({g,league:leagueName(g.home)||leagueName()}));
 for(const [league,l] of Object.entries(state.naLeagues?.season?.leagues||{}))for(const g of l.games||[])games.push({g,league});
 return games;
}
function dayTransitionGameKey(g,league){return `${league}:${state.season.year}:${g.id??`${g.date}:${g.home}:${g.away}:${g.round}`}`;}
function dayTransitionSnapshot(){
 return {messages:new Set((state.training?.messages||[]).map(m=>m.id)),events:new Set((state.rivals?.events||[]).map(e=>e.id)),
  games:new Set(dayTransitionGames().filter(({g})=>g.played).map(({g,league})=>dayTransitionGameKey(g,league)))};
}
function dayTransitionSummary(before){
 const rows=[];
 for(const m of state.training?.messages||[])if(!before.messages.has(m.id))rows.push({kind:'message',id:m.id,date:m.date,label:m.decisionType&&!m.resolved?'Ditt svar behövs':m.category||'Klubben',title:m.title,detail:m.body||'',required:Boolean(m.decisionType&&!m.resolved)});
 for(const e of state.rivals?.events||[])if(!before.events.has(e.id))rows.push({kind:'world',id:e.id,date:e.date,label:e.club||'Hockeyvärlden',title:e.title,detail:e.text||''});
 for(const {g,league} of dayTransitionGames())if(g.played&&!before.games.has(dayTransitionGameKey(g,league)))rows.push({kind:'result',date:g.date,label:league,title:`${g.home} ${g.homeGoals??g.hg??'–'}–${g.awayGoals??g.ag??'–'} ${g.away}`,detail:'Registrerat matchresultat.'});
 return rows.sort((a,b)=>Number(b.required)-Number(a.required));
}
function dayTransitionStart(){
 if(dayTransition)return false;
 // Navigation and existing decisions happen immediately, without a loading screen.
 if(careerScreen||!state.careerStarted||!managerCanPlay()||state.live&&!state.live.finished||pendingManagerDecision()||state.season.phase==='review'||state.calendar.date>=calendarTarget()){
  // A finished match day must still use the normal one-day debrief path.
  if(!(state.careerStarted&&!careerScreen&&managerCanPlay()&&!pendingManagerDecision()&&state.calendar.completedMatchDate===state.calendar.date)){
   calendarContinue();return false;
  }
 }
 const shell=document.querySelector('.game-shell');
 const tx={state,date:state.calendar.date,club:managerClub(),before:dayTransitionSnapshot(),phase:'working',rows:[],shell,inert:Boolean(shell?.inert)};
 dayTransition=tx;if(shell)shell.inert=true;
 dayTransitionRender();
 // Yield a paint before running the authoritative synchronous calendar step.
 const schedule=()=>setTimeout(()=>dayTransitionRun(tx),0);
 if(typeof requestAnimationFrame==='function')requestAnimationFrame(schedule);else schedule();
 return true;
}
function dayTransitionRun(tx){
 if(dayTransition!==tx)return;
 if(state!==tx.state||state.calendar?.date!==tx.date||managerClub()!==tx.club||careerScreen){dayTransitionDispose();return;}
 try{
  calendarContinue();
  if(state.calendar.date===tx.date){dayTransitionDispose();return;}
  tx.rows=dayTransitionSummary(tx.before);tx.phase='ready';
 }catch(error){
  // A callback is never retried: a failure may occur after some work is saved.
  tx.phase='error';console.error('Day transition failed',error);
 }
 dayTransitionRender();
}
function dayTransitionRender(){
 const tx=dayTransition,root=document.getElementById('day-transition-root');if(!tx||!root)return;
 const busy=tx.phase==='working',failed=tx.phase==='error',pending=pendingManagerDecision();
 const title=busy?'Dagen bearbetas':failed?'Dagssteget avbröts':`${calText(tx.date)} är avslutad`;
 const rows=tx.rows.slice(0,12),safe=trainingSafe;
 root.innerHTML=`<dialog id="day-transition-dialog" class="day-transition" aria-labelledby="day-transition-title" aria-busy="${busy}" oncancel="event.preventDefault();dayTransitionClose()"><header><span class="desk-kicker">${safe(managerClub())} · TRÄNARVARDAGEN</span><h2 id="day-transition-title" tabindex="-1">${safe(title)}</h2><p role="status">${busy?'Träning, klubbärenden och hockeyvärlden uppdateras.':failed?`Aktuellt datum är ${calText(state.calendar.date)}. Kontrollera kalendern och rapporterna innan du fortsätter igen.`:`Nu är det ${calText(state.calendar.date)}. ${pending?'Ett ärende kräver ditt svar innan tiden kan gå vidare.':'Dagens nya underlag är klart.'}`}</p></header>${busy?'<div class="day-transition-progress" aria-hidden="true"></div><p>Du får en sammanfattning när dagen är klar. Ingen extra dag startas automatiskt.</p>':failed?'<p>Steget körs inte om automatiskt. Om ett sparfel visas, exportera karriären via sparinställningarna.</p>':`<div class="day-transition-feed">${rows.map(r=>`<article><small>${safe(r.label)}${r.date?' · '+safe(calText(r.date)):''}</small><h3>${safe(r.title)}</h3>${r.detail?`<p>${safe(r.detail.length>340?r.detail.slice(0,340)+'…':r.detail)}</p>`:''}${r.kind==='message'?`<button type="button" class="btn secondary" onclick="dayTransitionOpen(${safe(JSON.stringify(r.id))})">${r.required?'Besvara ärendet':'Läs rapporten'}</button>`:''}</article>`).join('')||'<p>Inga nya rapporter eller matchresultat registrerades under detta dagssteg.</p>'}</div>${tx.rows.length>12?`<p>${tx.rows.length-12} ytterligare händelser finns i respektive rapportvy.</p>`:''}`}${!busy?`<footer><button type="button" class="btn" onclick="dayTransitionClose()">${pending&&!failed?'Till ärendet':'Till kalendern'}</button>${!failed?'<button type="button" class="btn secondary" onclick="dayTransitionOpen()">Öppna inkorgen</button>':''}</footer>`:''}</dialog>`;
 const dialog=document.getElementById('day-transition-dialog');
 try{if(dialog?.showModal)dialog.showModal();else dialog?.setAttribute('open','');}catch{dialog?.setAttribute('open','');}
 document.getElementById('day-transition-title')?.focus?.();
 const next=document.getElementById('continueGame');if(next)next.disabled=true;
}
function dayTransitionDispose(){
 const tx=dayTransition;if(!tx)return;
 document.getElementById('day-transition-dialog')?.close?.();
 const root=document.getElementById('day-transition-root');if(root)root.innerHTML='';
 if(tx.shell)tx.shell.inert=tx.inert;
 dayTransition=null;
 const next=document.getElementById('continueGame');if(next){next.disabled=Boolean(careerScreen||!state.careerStarted);next.focus?.();}
}
function dayTransitionClose(){
 if(!dayTransition||dayTransition.phase==='working')return false;
 const same=state===dayTransition.state&&!careerScreen,failed=dayTransition.phase==='error';
 dayTransitionDispose();
 if(same&&!failed){const pending=pendingManagerDecision();if(pending)openManagerMessage(pending.id);}
 return true;
}
function dayTransitionOpen(id){
 if(!dayTransition||dayTransition.phase!=='ready')return;
 dayTransitionDispose();
 if(id!==undefined&&(state.training?.messages||[]).some(m=>m.id===id))openManagerMessage(id);else deskNavigate('inbox');
}
