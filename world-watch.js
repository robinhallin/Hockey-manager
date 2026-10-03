"use strict";
const worldWatchUI={filter:'all'};
function worldWatchStore(create=false){
 const all=state.worldWatch?.clubs,existing=all?.[managerClub()];if(existing||!create)return existing||null;
 state.worldWatch??={version:1,clubs:{}};
 return state.worldWatch.clubs[managerClub()]={since:state.calendar.date,players:[],clubs:[],seen:worldHockeyNews(100).map(e=>e.key),events:[]};
}
function worldWatchToggle(kind,id){
 if(!['player','club'].includes(kind)||kind==='player'&&!playerIdentity(id)||kind==='club'&&!state.clubRosters[id])return false;
 const w=worldWatchStore(true),list=kind==='player'?w.players:w.clubs,key=String(id),index=list.indexOf(key);
 if(index>=0)list.splice(index,1);else if(list.length<50)list.push(key);else return false;
 save();render();return true;
}
function worldWatchPlayerButton(p){const following=worldWatchStore()?.players.includes(String(p.id));return `<button class="btn secondary" aria-pressed="${Boolean(following)}" onclick="worldWatchToggle('player',${trainingSafe(JSON.stringify(p.id))})">${following?'Sluta följa i Världen':'Följ spelaren i Världen'}</button>`;}
function worldWatchRelevant(e,w=worldWatchStore()){
 return Boolean(w&&(w.clubs.includes(e.club)||(e.playerIds||[]).some(id=>w.players.includes(String(id)))));
}
function worldNewsOpportunities(e){
 if(!/transfer|loan|arrival|sign/i.test(e.kind||''))return [];
 const arrivals=(e.playerIds||[]).map(findPlayerAnywhere).filter(p=>p&&getPlayerClub(p.id)===e.club),groups=new Set(arrivals.map(loanGroup));
 if(!groups.size||e.club===managerClub())return [];
 return (state.clubRosters[e.club]||[]).filter(p=>!arrivals.includes(p)&&groups.has(loanGroup(p))&&!isOwnPlayer(p)&&!playerLoan(p)&&!p.futureContract).map(p=>{
  const games=scoutingRecordedGames(p).filter(g=>g.club===e.club),minutes=games.length?games.reduce((n,g)=>n+(g.seconds||0),0)/games.length/60:null;
  return {p,games:games.length,minutes,listed:Boolean(p.transferListed||p.loanListed)};
 }).filter(r=>r.listed||r.games>=3&&r.minutes<10).sort((a,b)=>Number(b.listed)-Number(a.listed)||(a.minutes??99)-(b.minutes??99)).slice(0,2);
}
function worldNewsScout(id){const p=findPlayerAnywhere(id);if(!p||isOwnPlayer(p))return;scoutingDraft([p.id]);}
function worldWatchDay(){
 const w=worldWatchStore();if(!w)return;
 const events=worldHockeyNews(100),seen=new Set(w.seen),fresh=events.filter(e=>!seen.has(e.key)&&e.date>=w.since&&worldWatchRelevant(e,w));
 w.seen=[...new Set([...events.map(e=>e.key),...w.seen])].slice(0,300);
 if(!fresh.length)return;
 w.events=[...fresh,...w.events].filter((e,i,a)=>a.findIndex(x=>x.key===e.key)===i).slice(0,100);
 managerMessage(`world-watch:${managerClub()}:${state.calendar.date}`,`${fresh.length} nya händelser i din bevakning`,fresh.slice(0,5).map(e=>`${e.club||'Hockeyvärlden'}: ${referencePlainText(e.title)}`).join('\n')+'\nÖppna Världen för underlag, spelarprofiler och möjliga scoutuppdrag.','Chefsscout',{link:'world'});
}
function worldWatchNewsView(){
 const w=worldWatchStore(),all=[...worldHockeyNews(100),...(w?.events||[])].filter((e,i,a)=>a.findIndex(x=>x.key===e.key)===i).sort((a,b)=>b.date.localeCompare(a.date));
 const filtered=all.filter(e=>worldWatchUI.filter==='following'?worldWatchRelevant(e,w):worldWatchUI.filter==='opportunities'?worldNewsOpportunities(e).length:true),rows=filtered.slice(0,40);
 const clubs=Object.keys(state.clubRosters).filter(c=>c!==managerClub()).sort((a,b)=>a.localeCompare(b,'sv'));
 const controls=`<div class="world-watch-controls"><nav class="wd-tabs" aria-label="Världsnyheter">${Object.entries({all:'Senaste nytt',following:'Min bevakning',opportunities:'Möjliga nästa steg'}).map(([key,label])=>`<button aria-pressed="${worldWatchUI.filter===key}" onclick="worldWatchUI.filter='${key}';render()">${label}</button>`).join('')}</nav><form onsubmit="event.preventDefault();worldWatchToggle('club',this.elements.club.value)"><label>Följ klubb<select name="club">${clubs.map(c=>`<option value="${trainingSafe(c)}">${trainingSafe(c)}${w?.clubs.includes(c)?' · följs':''}</option>`).join('')}</select></label><button class="btn secondary">Följ / sluta följa</button></form><details><summary>Din bevakning · ${(w?.players.length||0)+(w?.clubs.length||0)}</summary>${(w?.clubs||[]).map(c=>`<p>${clubReference(c)} <button class="desk-link" onclick="worldWatchToggle('club',${trainingSafe(JSON.stringify(c))})">Sluta följa</button></p>`).join('')}${(w?.players||[]).map(id=>`<p>${playerReference(id)} <button class="desk-link" onclick="worldWatchToggle('player',${trainingSafe(JSON.stringify(id))})">Sluta följa</button></p>`).join('')}<p>Spelare kan följas från sin rapport i Rekrytering. Nya relevanta händelser sammanfattas i inkorgen.</p></details></div>`;
 return worldDeskPanel('Senaste från hockeyvärlden',controls+rows.map(e=>{
  const opportunities=worldNewsOpportunities(e);
  return `<article class="wd-news"><span class="wd-kicker">${calText(e.date)} · ${trainingSafe(e.club||e.source)}${worldWatchRelevant(e,w)?' · BEVAKAD':''}</span><h3>${playerReferenceText(e.title)}</h3><p>${playerReferenceText(e.text||'')}</p>${(e.playerIds||[]).map(id=>{const p=findPlayerAnywhere(id);return p?worldWatchPlayerButton(p):'';}).join('')}${opportunities.length?`<div class="world-opportunity"><strong>Förändrad konkurrens – värt att undersöka</strong>${opportunities.map(r=>`<p>${playerReference(r.p.id,r.p.name)}: ${r.listed?'listad för övergång eller lån':`${r.minutes.toFixed(1)} min/match i ${r.games} registrerade matcher`}. Samma positionsgrupp som spelaren i nyheten. Det bevisar inte att klubben vill sälja.</p><button class="btn secondary" onclick="worldNewsScout(${trainingSafe(JSON.stringify(r.p.id))})" ${scoutPending(r.p.id)?'disabled':''}>${scoutPending(r.p.id)?'Bevakning pågår':'Granska scoutuppdrag'}</button>`).join('')}</div>`:''}</article>`;
 }).join('')+(rows.length?'':'<p>Inga händelser i detta urval. Bevakningen bygger på händelser som faktiskt inträffar i karriären.</p>'),'Händelser och möjligheter ur din sparade karriär.','','Visar '+rows.length+' av '+filtered.length+' tillgängliga händelser.');
}
