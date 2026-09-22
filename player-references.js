"use strict";

// Presentation resolver only. Never use an archived identity to authorize a deal.
function playerIdentity(id){
 const active=findPlayerAnywhere(id);
 if(active)return {player:active,active:true,club:getPlayerClub(id)};
 const junior=(state.juniors?.roster||[]).find(p=>samePlayerId(p.id,id));
 if(junior)return {player:junior,active:true,junior:true,club:managerClub()};
 const archived=Object.values(state.playerArchive||{}).find(p=>samePlayerId(p.id,id));
 if(archived)return {player:archived,active:false,club:archived.club};
 // Old saves: recover only evidence carrying an ID; never infer identity from names.
 const event=(state.playerWorld?.events||[]).find(p=>samePlayerId(p.id,id));
 if(event)return {player:event,active:false,club:event.club};
 for(const ledger of [state.leagueStatistics,...(state.leagueStatistics?.archives||[])]){
  const row=Object.values(ledger?.rows||{}).find(p=>samePlayerId(p.id,id));
  if(row)return {player:row,active:false,club:row.club};
 }
 return null;
}

function playerReference(id,label){
 const identity=playerIdentity(id),name=label??identity?.player.name??'Okänd spelare';
 if(id===null||id===undefined)return trainingSafe(name);
 const action=`deskOpenPlayer(${JSON.stringify(id)});return false;`;
 return `<a class="player-reference" href="#player/${encodeURIComponent(String(id))}" data-player-id="${trainingSafe(String(id))}" onclick="${trainingSafe(action)}">${trainingSafe(name)}</a>`;
}

// Structured prose is explicit: [{text:'...'}, {playerId:'...',text:'Name'}].
// Legacy strings stay text. No name matching or generated markup is interpreted.
function playerReferenceText(parts){
 if(!Array.isArray(parts))return trainingSafe(parts??'');
 return parts.map(part=>typeof part==='string'?trainingSafe(part):part.playerId!==undefined?playerReference(part.playerId,part.text):trainingSafe(part.text??'')).join('');
}

function playerHistoryView(id){
 const rows=[];
 for(const ledger of [state.leagueStatistics,...(state.leagueStatistics?.archives||[])]){
  for(const [key,row] of Object.entries(ledger?.rows||{})){
   if(!samePlayerId(row.id,id))continue;
   let context=[];try{context=JSON.parse(key);}catch{}
   rows.push({year:ledger.year,stage:context[0],league:context[1],...row});
  }
 }
 const events=(state.playerWorld?.events||[]).filter(e=>samePlayerId(e.id,id));
 return `<section class="fm-panel"><h2>Registrerad historik</h2><p>Klubben nedan är den spelaren representerade då. Saknade säsonger och uppgifter fylls inte i efterhand.</p>${rows.length?`<div class="workspace-table"><table><thead><tr><th>Säsong</th><th>Liga / fas</th><th>Klubb</th><th>Matcher</th><th>Mål</th><th>Assist</th><th>Istid totalt</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${trainingSafe(String(r.year))}</td><td>${trainingSafe(r.league||'Ej registrerad')} · ${r.stage==='regular'?'Grundserie':r.stage==='playoffs'?'Slutspel / kval':'Ej registrerad'}</td><td>${trainingSafe(r.club)}</td><td>${r.games??'—'}</td><td>${r.goals??'—'}</td><td>${r.assists??'—'}</td><td>${Number.isFinite(r.seconds)?Math.round(r.seconds/60)+' min':'—'}</td></tr>`).join('')}</tbody></table></div>`:'<p>Ingen säsongsstatistik registrerad.</p>'}${events.length?`<ul>${events.map(e=>`<li>${e.year} · ${trainingSafe(e.club)} · ${trainingSafe(e.reason)}</li>`).join('')}</ul>`:'<p>Inga registrerade händelser.</p>'}</section>`;
}

function historicalPlayerView(id){
 const identity=playerIdentity(id),p=identity?.player;
 if(identity?.junior)return '<article class="fm-profile"><button class="fm-back" onclick="deskBack(\'juniors\')" aria-label="Tillbaka till föregående vy">←</button>'+juniorProfile(p)+'</article>';
 return `<article class="fm-profile"><header class="fm-profile-header"><button class="fm-back" onclick="deskBack('leagueStats')" aria-label="Tillbaka till föregående vy">←</button><div><h1>${trainingSafe(p?.name||'Spelaruppgifter saknas')}</h1><p>${p?trainingSafe(p.pos||'Position ej registrerad')+' · Senast registrerad klubb: '+trainingSafe(identity.club||'Saknas'):'Spelar-ID: '+trainingSafe(String(id))}</p></div></header><p>${p?.status==='retire'?'Pensionerad.':p?.status==='inactive'?'Lämnat den bevakade marknaden.':'Ingen aktiv spelarpost finns tillgänglig.'} Aktuell form, hälsa, attribut och avtal är inte tillgängliga. Inga spelaråtgärder kan utföras här.</p>${playerHistoryView(id)}</article>`;
}

function playerProfileHeader(p,club){
 return `<header class="fm-profile-header"><button class="fm-back" onclick="deskBack('squad')" aria-label="Tillbaka till föregående vy">←</button><div class="fm-player-mark">${trainingSafe(p.pos)}</div><div><small>${trainingSafe(club||'Klubb saknas')}</small><h1>${trainingSafe(p.name)}</h1><p>${p.age} år · ${trainingSafe(p.nationality||'Nationalitet saknas')}</p></div><div class="fm-profile-rating"><small>Förmåga</small>${assessmentBadge(p)}<small>Potential · stabens prognos</small>${assessmentBadge(p,true)}</div></header>`;
}
function playerProfileTabs(p){
 const own=isOwnPlayer(p);
 const tabs=[['overview','Översikt'],['attributes','Attribut'],['report','Bedömning'],['performance','Prestation'],['development','Utveckling & hälsa'],['contract','Kontrakt & situation'],['history','Historik'],...(own?[['person','Person & relation']]:[])];
 return `<nav class="fm-tabs" aria-label="Spelarprofil">${tabs.map(([key,label])=>`<button aria-pressed="${profileWorkspace.tab===key}" onclick="profileWorkspace.tab='${key}';render();queueInterfaceSave()">${label}</button>`).join('')}</nav><div class="sc-actions"><button class="btn secondary" onclick="${trainingSafe('scoutingCompare('+JSON.stringify(p.id)+')')}">${scoutDesk.compare.some(id=>samePlayerId(id,p.id))?'Ta bort ur jämförelse':'Jämför spelaren'} (${scoutDesk.compare.length}/4)</button>${own?`<button class="btn secondary" onclick="profileWorkspace.tab='development';render()">Ändra individuell träning</button><button class="btn secondary" onclick="profileWorkspace.tab='contract';render()">Roll & kontrakt</button><button class="btn secondary" onclick="${trainingSafe('hubStartLoan('+JSON.stringify(p.id)+')')}">Pröva utlåning</button>`:''}</div>${scoutDesk.compare.length?`<details><summary>Granska jämförelsen (${scoutDesk.compare.length} spelare)</summary>${scoutingComparison()}</details>`:''}`;
}
function externalPlayerProfile(p){
 if(!samePlayerId(recruitHub.player,p.id)){recruitHub.player=p.id;recruitHub.panel=state.transferNegotiation&&samePlayerId(state.transferNegotiation.playerId,p.id)?'transfer':'report';}
 const tab=profileWorkspace.tab;
 let body;
 if(tab==='attributes')body=desktopAttributes(p);
 else if(tab==='history'||tab==='performance')body=playerHistoryView(p.id);
 else if(tab==='development')body='<section class="fm-panel"><h2>Utveckling & hälsa</h2><p>Interna träningsrapporter, fysisk status och rehabiliteringsplaner är inte tillgängliga för externa spelare. Potential är en scoutbedömning, inte en garanterad utveckling.</p></section>'+assessmentPanel(p);
 else if(tab==='report')body=assessmentPanel(p)+scoutingPlayerActions(p);
 else if(tab==='contract')body=hubInspector(p);
 else body=`<div class="rh-full-profile">${desktopAttributes(p)}${hubInspector(p)}</div>`;
 return `<article class="fm-profile recruit-hub">${playerProfileHeader(p,getPlayerClub(p.id))}${playerProfileTabs(p)}${body}</article>`;
}

function playerSearchResults(query){
 const needle=String(query||'').trim().toLocaleLowerCase('sv');
 if(needle.length<2)return {players:[],clubs:[],total:0};
 const byId=new Map();
 const pools=[...Object.values(state.clubRosters||{}),state.playerWorld?.freeAgents||[],state.northAmerica?.abroad||[],state.juniors?.roster||[],Object.values(state.playerArchive||{})];
 for(const pool of pools)for(const p of pool)if(!byId.has(String(p.id)))byId.set(String(p.id),p);
 const players=[...byId.values()].filter(p=>String(p.name).toLocaleLowerCase('sv').includes(needle));
 const clubs=Object.keys(state.clubRosters||{}).filter(c=>c.toLocaleLowerCase('sv').includes(needle));
 return {players:players.slice(0,30),clubs:clubs.slice(0,10),total:players.length+clubs.length};
}
function playerSearchView(){
 const query=state.playerSearchQuery||'',results=playerSearchResults(query);
 return `<details class="entity-search" ${query?'open':''}><summary>Sök spelare och klubbar</summary><form onsubmit="event.preventDefault();state.playerSearchQuery=this.elements.entityQuery.value.trim();render();queueInterfaceSave()"><label>Namn <input type="search" name="entityQuery" minlength="2" value="${trainingSafe(query)}" placeholder="Minst två tecken"></label><button class="btn secondary">Sök</button><button type="button" class="btn secondary" onclick="state.playerSearchQuery='';render()">Rensa</button></form>${query?`<div role="status">${results.total} träffar${results.total>results.players.length+results.clubs.length?' · Förfina sökningen för att se fler':''}</div><ul>${results.players.map(p=>{const i=playerIdentity(p.id);return `<li>${playerReference(p.id,p.name)} · ${trainingSafe(p.pos)} · ${p.age??'Ålder saknas'} · ${trainingSafe(i?.club||'Klubb saknas')}${i?.active?'':' · Historisk post'}</li>`;}).join('')}${results.clubs.map(c=>`<li><a class="player-reference" href="#club/${encodeURIComponent(c)}" onclick="${trainingSafe('leagueStatsClub('+JSON.stringify(c)+');return false;')}">${trainingSafe(c)}</a> · Klubbens spelarstatistik</li>`).join('')}</ul>`:''}</details>`;
}

function deskWorkspaceContext(){
 return {calendar:{month:calendarUI.month,date:calendarUI.date},inbox:{...inboxUI},worldLeague:state.world?.selected,
  analysis:state.analysis?Object.fromEntries(['selected','window','side','compareA','compareB'].map(key=>[key,state.analysis[key]])):null,
  // Comparison is a working selection, not a filter. Keep edits made inside profiles.
  scout:{list:scoutDesk.list,columns:scoutDesk.columns,horizon:scoutDesk.horizon},
  scrolls:[...document.querySelectorAll('#content [data-scroll-key], #content .rh-table-scroll, #content .league-table-scroll, #inbox-message-list')].map((el,index)=>({index,top:el.scrollTop,left:el.scrollLeft||0})),
  drafts:[...document.querySelectorAll('#content form')].map((form,index)=>({index,action:form.getAttribute('onsubmit'),fields:[...form.elements].filter(el=>el.name&&!['password','file','submit','button'].includes(el.type)).map(el=>({name:el.name,type:el.type,value:el.value,checked:el.checked}))}))};
}
function deskRestoreWorkspace(context){
 if(!context)return;
 Object.assign(calendarUI,context.calendar||{});calendarUI.calendar=state.calendar;
 Object.assign(inboxUI,context.inbox||{});Object.assign(scoutDesk,context.scout||{});
 if(state.analysis&&context.analysis)Object.assign(state.analysis,context.analysis);
 if(context.worldLeague!==undefined&&state.world)state.world.selected=context.worldLeague;
}
function deskRestoreWorkspaceDOM(context){
 if(!context)return;
 const scrolls=document.querySelectorAll('#content [data-scroll-key], #content .rh-table-scroll, #content .league-table-scroll, #inbox-message-list');
 for(const row of context.scrolls||[]){const el=scrolls[row.index];if(el){el.scrollTop=row.top;el.scrollLeft=row.left;}}
 const forms=document.querySelectorAll('#content form');
 for(const draft of context.drafts||[]){const form=forms[draft.index];if(!form||form.getAttribute('onsubmit')!==draft.action)continue;
  for(const field of draft.fields){const el=[...form.elements].find(el=>el.name===field.name&&el.type===field.type);if(el){el.value=field.value;el.checked=field.checked;}}
 }
}
