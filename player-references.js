"use strict";

// Presentation resolver only. Never use an archived identity to authorize a deal.
function playerIdentity(id){
 const active=findPlayerAnywhere(id);
 if(active)return {player:active,active:true,club:getPlayerClub(id)};
 const junior=(state.juniors?.roster||[]).find(p=>samePlayerId(p.id,id));
 if(junior)return {player:junior,active:true,junior:true,club:managerClub()};
 for(const [club,team] of Object.entries(state.clubAI?.clubs||{})){
  const player=(team.academy?.roster||[]).find(p=>samePlayerId(p.id,id));
  if(player)return {player,active:true,restricted:true,club};
 }
 const pool=(state.international?.pool||[]).find(p=>samePlayerId(p.id,id));
 if(pool)return {player:pool,active:true,restricted:true,club:'Internationell juniorpool'};
 const archived=Object.values(state.playerArchive||{}).find(p=>samePlayerId(p.id,id));
 if(archived)return {player:archived,active:false,club:archived.club};
 // Old saves: recover only evidence carrying an ID; never infer identity from names.
 const event=(state.playerWorld?.events||[]).find(p=>samePlayerId(p.id,id));
 if(event)return {player:event,active:false,club:event.club};
 for(const ledger of [state.leagueStatistics,...(state.leagueStatistics?.archives||[])]){
  const row=Object.values(ledger?.rows||{}).find(p=>samePlayerId(p.id,id));
  if(row)return {player:row,active:false,club:row.club};
 }
 for(const match of state.analysis?.matches||[]){
  const row=[...(match.performance?.rows||[]),...(match.players||[])].find(p=>samePlayerId(p.id,id));
  if(row)return {player:{id:row.id,name:row.name,pos:row.pos},active:false,club:row.club||match.club};
 }
 for(const match of state.juniors?.matches||[]){
  const row=(match.players||[]).find(p=>samePlayerId(p.id,id));
  if(row)return {player:{id:row.id,name:row.name,pos:row.pos},active:false,club:match.club||null};
 }
 for(const draft of [state.nhl?.draft,...(state.nhl?.history||[])]){
  const pick=(draft?.picks||[]).find(p=>samePlayerId(p.id,id));
  if(pick)return {player:{id:pick.id,name:pick.name,pos:pick.pos},active:false,club:pick.origin};
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
 return parts.map(part=>typeof part==='string'?trainingSafe(part):part?.playerId!==undefined?playerReference(part.playerId,part.text):trainingSafe(part?.text??'')).join('');
}
function playerMention(p){return {playerId:p.id,text:p.name};}
function playerHeadline(p,suffix){return [playerMention(p),suffix];}
function referencePlainText(parts){return Array.isArray(parts)?parts.map(p=>typeof p==='string'?p:p?.text??'').join(''):String(parts??'');}
function matchEventReference(e){
 if(e.type==='goal')return (e.scorerId!=null?playerReference(e.scorerId,e.scorer||'Målskytt'):playerReferenceText(e.textParts||e.text))+(Number.isFinite(e.own)&&Number.isFinite(e.against)?' · '+e.own+'–'+e.against:'')+(e.assists?.length?' · Assist: '+e.assists.map(p=>playerReference(p.id,p.name)).join(', '):'');
 return playerReferenceText(e.textParts||e.text)+(e.playerId!=null?' · '+playerReference(e.playerId,e.playerName):'');
}
function playerMatchRecords(id){
 return (state.analysis?.matches||[]).filter(m=>m.finished).flatMap(match=>{
  const performance=match.performance?.rows?.find(p=>samePlayerId(p.id,id));
  const row=performance||(match.players||[]).find(p=>samePlayerId(p.id,id));
  return row&&row.seconds>0?[{match,row,performance}]:[];
 });
}
function playerPerformanceView(id){
 const records=playerMatchRecords(id).slice(0,10);
 return '<section class="fm-panel"><h2>Senaste registrerade matcher</h2><p>Högst tio avslutade matcher ur ditt rapportarkiv, inklusive träningsmatcher. Urvalet är inte hela spelarens karriär. Betygen avser respektive match, inte spelarens förmåga eller potential.</p>'+
 (records.length?'<div class="workspace-table"><table><thead><tr><th>Match / rapport</th><th>Representerad klubb</th><th>Sammanhang</th><th>Istid</th><th>Mål + assist</th><th>Skott</th><th>Matchbetyg</th></tr></thead><tbody>'+records.map(({match:m,row:r,performance:p})=>{
  const action='matchesOpenReport('+JSON.stringify(m.id)+');return false;';
  return '<tr><td><a class="player-reference" href="#match/'+encodeURIComponent(m.id)+'" onclick="'+trainingSafe(action)+'">'+trainingSafe(m.club)+' '+m.own+'–'+m.against+' '+trainingSafe(m.opponent)+'</a><small>'+trainingSafe(m.date||String(m.year))+'</small></td><td>'+clubReference(r.club||m.club,{year:m.year})+'</td><td>'+trainingSafe(String(m.year))+' · '+trainingSafe(m.stage||'Tävlingsfas saknas')+(m.partial?' · Delvis registrerad':'')+'</td><td>'+analysisTime(r.seconds)+'</td><td>'+(r.goals??'—')+' + '+(r.assists??'—')+'</td><td>'+(r.shots??'—')+'</td><td>'+performanceStars(p?.stars??null)+'</td></tr>';
 }).join('')+'</tbody></table></div>':'<p>Inga matchrapporter med registrerad istid för den här spelaren.</p>')+'<p>Spelformsspecifik istid saknas i detta underlag; inga PP/BP-minuter uppskattas.</p></section>';
}

function playerJuniorHistoryView(id){
 const records=(state.juniors?.matches||[]).flatMap(m=>{const p=(m.players||[]).find(p=>samePlayerId(p.id,id));return p&&p.seconds>0?[{m,p}]:[];});
 if(!records.length)return '';
 return '<h3>Registrerade juniormatcher</h3><ul>'+records.map(({m,p})=>'<li>'+trainingSafe(m.date||String(m.year??'År saknas'))+' · '+(m.club?clubReference(m.club,{year:m.year}):'Representerad klubb ej registrerad')+' · Mot '+trainingSafe(m.opponent||'Motstånd saknas')+' · '+Math.floor(p.seconds/60)+' min · '+(p.goals??'—')+' mål + '+(p.assists??'—')+' assist</li>').join('')+'</ul>';
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
 const pickEntries=[state.nhl?.draft,...(state.nhl?.history||[])].flatMap(d=>(d?.picks||[]).filter(p=>samePlayerId(p.id,id)).map(p=>[String(p.year)+':'+String(p.overall),p]));
 const picks=[...new Map(pickEntries).values()];
 const draftHistory=picks.length?'<h3>Registrerad NHL-draft</h3><ul>'+picks.map(p=>'<li>'+trainingSafe(String(p.year??'År saknas'))+' · '+trainingSafe(p.club||'Klubb saknas')+' · Val '+trainingSafe(String(p.overall??'saknas'))+' · Från '+trainingSafe(p.origin||'Klubb saknas')+'</li>').join('')+'</ul>':'';
 return `<section class="fm-panel"><h2>Registrerad historik</h2><p>Klubben nedan är den spelaren representerade då. Saknade säsonger och uppgifter fylls inte i efterhand.</p>${draftHistory}${playerJuniorHistoryView(id)}${rows.length?`<div class="workspace-table"><table><thead><tr><th>Säsong</th><th>Liga / fas</th><th>Klubb</th><th>Matcher</th><th>Mål</th><th>Assist</th><th>Istid totalt</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${trainingSafe(String(r.year))}</td><td>${leagueReference(r.league,r.year)} · ${r.stage==='regular'?'Grundserie':r.stage==='playoffs'?'Slutspel / kval':'Ej registrerad'}</td><td>${clubReference(r.club,{year:r.year,league:r.league})}</td><td>${r.games??'—'}</td><td>${r.goals??'—'}</td><td>${r.assists??'—'}</td><td>${Number.isFinite(r.seconds)?Math.round(r.seconds/60)+' min':'—'}</td></tr>`).join('')}</tbody></table></div>`:'<p>Ingen säsongsstatistik registrerad.</p>'}${events.length?`<ul>${events.map(e=>`<li>${e.year} · ${clubReference(e.club,{year:e.year})} · ${trainingSafe(e.reason)}</li>`).join('')}</ul>`:'<p>Inga registrerade händelser.</p>'}</section>`;
}

function historicalPlayerView(id){
 const identity=playerIdentity(id),p=identity?.player;
 if(identity?.junior)return '<article class="fm-profile"><button class="fm-back" onclick="deskBack(\'juniors\')" aria-label="Tillbaka till föregående vy">←</button>'+juniorProfile(p)+'</article>';
 if(identity?.restricted)return '<article class="fm-profile"><button class="fm-back" onclick="deskBack(\'nhl\')" aria-label="Tillbaka till föregående vy">←</button><h1>'+trainingSafe(p.name)+'</h1><p>'+trainingSafe(identity.club)+' · '+trainingSafe(p.pos)+' · '+p.age+' år</p><p>Spelaren finns i juniorvärlden men ingår inte i seniorernas rekryteringsmarknad. Interna attribut, potential, träningsdata och hälsa är inte tillgängliga här.</p>'+playerPerformanceView(id)+playerHistoryView(id)+'</article>';
 return `<article class="fm-profile"><header class="fm-profile-header"><button class="fm-back" onclick="deskBack('leagueStats')" aria-label="Tillbaka till föregående vy">←</button><div><h1>${trainingSafe(p?.name||'Spelaruppgifter saknas')}</h1><p>${p?trainingSafe(p.pos||'Position ej registrerad')+' · Senast registrerad klubb: '+trainingSafe(identity.club||'Saknas'):'Spelar-ID: '+trainingSafe(String(id))}</p></div></header><p>${p?.status==='retire'?'Pensionerad.':p?.status==='inactive'?'Lämnat den bevakade marknaden.':'Ingen aktiv spelarpost finns tillgänglig.'} Aktuell form, hälsa, attribut och avtal är inte tillgängliga. Inga spelaråtgärder kan utföras här.</p>${playerPerformanceView(id)}${playerHistoryView(id)}</article>`;
}

function playerProfileHeader(p,club){
 return `<header class="fm-profile-header"><button class="fm-back" onclick="deskBack('squad')" aria-label="Tillbaka till föregående vy">←</button><div class="fm-player-mark">${trainingSafe(p.pos)}</div><div><small>${clubReference(club)}</small><h1>${trainingSafe(p.name)}</h1><p>${p.age} år · ${trainingSafe(p.nationality||'Nationalitet saknas')}</p></div><div class="fm-profile-rating"><small>Förmåga</small>${assessmentBadge(p)}<small>Potential · stabens prognos</small>${assessmentBadge(p,true)}</div></header>`;
}
function playerLineupContext(id){
 const p=managerRoster().find(q=>samePlayerId(q.id,id));if(!p)return false;
 const forward=state.lines.forwards.findIndex(x=>samePlayerId(x,id)),defense=state.lines.defense.findIndex(x=>samePlayerId(x,id));
 const type=p.pos==='MV'?'goalie':defense>=0?'defense':forward>=0?'forwards':p.pos==='B'?'defense':'forwards';
 const index=type==='goalie'?0:type==='defense'?Math.max(0,defense):forward>=0?forward:p.pos==='C'?1:p.pos==='HF'?2:0;
 deskNavigate('lines');lineupWorkspace='even';lineupUI.slot={type,index};lineupUI.query='';
 if(type==='forwards')lineupUI.line=Math.floor(index/3);
 if(type==='defense')lineupUI.pair=Math.floor(index/2);
 render();deskBrowserBefore();return true;
}
function playerProfileTabs(p){
 const own=isOwnPlayer(p);
 const tabs=[['overview','Översikt'],['attributes','Attribut'],['report','Bedömning'],['performance','Prestation'],['development','Utveckling & hälsa'],['contract','Kontrakt & situation'],['history','Historik'],...(own?[['person','Person & relation']]:[])];
 return `<nav class="fm-tabs" aria-label="Spelarprofil">${tabs.map(([key,label])=>`<button aria-pressed="${profileWorkspace.tab===key}" onclick="profileWorkspace.tab='${key}';render();queueInterfaceSave()">${label}</button>`).join('')}</nav><div class="sc-actions"><button class="btn secondary" onclick="${trainingSafe('scoutingCompare('+JSON.stringify(p.id)+')')}">${scoutDesk.compare.some(id=>samePlayerId(id,p.id))?'Ta bort ur jämförelse':'Jämför spelaren'} (${scoutDesk.compare.length}/4)</button>${own?`<button class="btn secondary" onclick="${trainingSafe('playerLineupContext('+JSON.stringify(p.id)+')')}">Kedjeplats & alternativ</button><button class="btn secondary" onclick="profileWorkspace.tab='development';render()">Ändra individuell träning</button><button class="btn secondary" onclick="profileWorkspace.tab='contract';render()">Roll & kontrakt</button><button class="btn secondary" onclick="${trainingSafe('hubStartLoan('+JSON.stringify(p.id)+')')}">Pröva utlåning</button>`:''}</div>${scoutDesk.compare.length?`<details><summary>Granska jämförelsen (${scoutDesk.compare.length} spelare)</summary>${scoutingComparison()}</details>`:''}`;
}
function externalPlayerProfile(p){
 if(!samePlayerId(recruitHub.player,p.id)){recruitHub.player=p.id;recruitHub.panel=state.transferNegotiation&&samePlayerId(state.transferNegotiation.playerId,p.id)?'transfer':'report';}
 const tab=profileWorkspace.tab;
 let body;
 if(tab==='attributes')body=desktopAttributes(p);
 else if(tab==='history'||tab==='performance')body=(tab==='performance'?playerPerformanceView(p.id):'')+playerHistoryView(p.id);
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
 const pools=[...Object.values(state.clubRosters||{}),state.playerWorld?.freeAgents||[],state.northAmerica?.abroad||[],state.juniors?.roster||[],...Object.values(state.clubAI?.clubs||{}).map(c=>c.academy?.roster||[]),state.international?.pool||[],Object.values(state.playerArchive||{})];
 for(const pool of pools)for(const p of pool)if(!byId.has(String(p.id)))byId.set(String(p.id),p);
 const players=[...byId.values()].filter(p=>String(p.name).toLocaleLowerCase('sv').includes(needle));
 const clubs=Object.keys(state.clubRosters||{}).filter(c=>c.toLocaleLowerCase('sv').includes(needle));
 return {players:players.slice(0,30),clubs:clubs.slice(0,10),total:players.length+clubs.length};
}
function playerSearchView(){
 const query=state.playerSearchQuery||'',results=playerSearchResults(query);
 return `<details class="entity-search" ${query?'open':''}><summary>Sök spelare och klubbar</summary><form onsubmit="event.preventDefault();state.playerSearchQuery=this.elements.entityQuery.value.trim();render();queueInterfaceSave()"><label>Namn <input type="search" name="entityQuery" minlength="2" value="${trainingSafe(query)}" placeholder="Minst två tecken"></label><button class="btn secondary">Sök</button><button type="button" class="btn secondary" onclick="state.playerSearchQuery='';render()">Rensa</button></form>${query?`<div role="status">${results.total} träffar${results.total>results.players.length+results.clubs.length?' · Förfina sökningen för att se fler':''}</div><ul>${results.players.map(p=>{const i=playerIdentity(p.id);return `<li>${playerReference(p.id,p.name)} · ${trainingSafe(p.pos)} · ${p.age??'Ålder saknas'} · ${trainingSafe(i?.club||'Klubb saknas')}${i?.active?'':' · Historisk post'}</li>`;}).join('')}${results.clubs.map(c=>`<li><a class="player-reference" href="#club/${encodeURIComponent(c)}" onclick="${trainingSafe('openClubContext('+JSON.stringify(c)+');return false;')}">${trainingSafe(c)}</a> · Klubb, trupp och matcher</li>`).join('')}</ul>`:''}</details>`;
}

function deskWorkspaceContext(){
 return {calendar:{month:calendarUI.month,date:calendarUI.date},inbox:{...inboxUI},worldLeague:state.world?.selected,
  clubBrowser:state.clubBrowser?{...state.clubBrowser}:null,nhl:{...nhlUI},
  analysis:state.analysis?Object.fromEntries(['selected','window','side','compareA','compareB'].map(key=>[key,state.analysis[key]])):null,
  // Comparison is a working selection, not a filter. Keep edits made inside profiles.
  scout:{list:scoutDesk.list,columns:scoutDesk.columns,horizon:scoutDesk.horizon},
  scrolls:[...document.querySelectorAll('#content [data-scroll-key], #content .rh-table-scroll, #content .league-table-scroll, #content .fm-table-scroll, #content .dv-scroll, #content .lw-scroll, #content .special-candidate-list, #content .lineup-candidate-list, #inbox-message-list')].map((el,index)=>({index,top:el.scrollTop,left:el.scrollLeft||0})),
  drafts:[...document.querySelectorAll('#content form')].map((form,index)=>({index,action:form.getAttribute('onsubmit'),fields:[...form.elements].filter(el=>el.name&&!['password','file','submit','button'].includes(el.type)).map(el=>({name:el.name,type:el.type,value:el.value,checked:el.checked}))}))};
}
function deskRestoreWorkspace(context){
 if(!context)return;
 state.clubBrowser=context.clubBrowser?{...context.clubBrowser}:null;
 Object.assign(nhlUI,context.nhl||{});
 Object.assign(calendarUI,context.calendar||{});calendarUI.calendar=state.calendar;
 Object.assign(inboxUI,context.inbox||{});Object.assign(scoutDesk,context.scout||{});
 if(state.analysis&&context.analysis)Object.assign(state.analysis,context.analysis);
 if(context.worldLeague!==undefined&&state.world)state.world.selected=context.worldLeague;
}
function deskRestoreWorkspaceDOM(context){
 if(!context)return;
 const scrolls=document.querySelectorAll('#content [data-scroll-key], #content .rh-table-scroll, #content .league-table-scroll, #content .fm-table-scroll, #content .dv-scroll, #content .lw-scroll, #content .special-candidate-list, #content .lineup-candidate-list, #inbox-message-list');
 for(const row of context.scrolls||[]){const el=scrolls[row.index];if(el){el.scrollTop=row.top;el.scrollLeft=row.left;}}
 const forms=document.querySelectorAll('#content form');
 for(const draft of context.drafts||[]){const form=forms[draft.index];if(!form||form.getAttribute('onsubmit')!==draft.action)continue;
  for(const field of draft.fields){const el=[...form.elements].find(el=>el.name===field.name&&el.type===field.type);if(el){el.value=field.value;el.checked=field.checked;}}
 }
}
