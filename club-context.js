"use strict";
// Public identity and recorded evidence only; no AI finances or hidden ratings.
function clubReference(club,context={}){
 if(!club)return 'Klubb saknas';
 const known=Object.hasOwn(state.clubRosters||{},club)||Object.hasOwn(CAREER_CLUBS,club);
 if(!known)return trainingSafe(club);
 return `<a class="player-reference" href="#club/${encodeURIComponent(club)}" onclick="${trainingSafe('openClubContext('+JSON.stringify(club)+','+JSON.stringify(context)+');return false;')}">${trainingSafe(club)}</a>`;
}
function openClubContext(club,context={}){
 if(!Object.hasOwn(state.clubRosters||{},club)&&!Object.hasOwn(CAREER_CLUBS,club))return false;
 deskHistorySync();const previous=deskSnapshot();deskBrowserBefore(previous);
 deskHistory.push(previous);if(deskHistory.length>30)deskHistory.shift();
 state.clubBrowser={club,year:context.year??state.season.year,league:context.league||null};
 deskNavigate('clubDetail',undefined,false);deskBrowserAfter();return true;
}
function clubSeasonRows(club,year){
 const source=String(year)===String(state.leagueStatistics.year)?state.leagueStatistics:state.leagueStatistics.archives.find(a=>String(a.year)===String(year));
 return Object.entries(source?.rows||{}).map(([key,row])=>{let context=[];try{context=JSON.parse(key);}catch{}return {stage:context[0],league:context[1],...row};}).filter(r=>r.club===club);
}
function openLeagueContext(league,year,club='all'){
 const current=String(year)===String(state.season.year);
 if(!LEAGUE_NAMES[league]||!current&&!state.leagueStatistics.archives.some(a=>String(a.year)===String(year)))return false;
 deskHistorySync();const previous=deskSnapshot();deskBrowserBefore(previous);deskHistory.push(previous);if(deskHistory.length>30)deskHistory.shift();
 deskNavigate('leagueStats',undefined,false);
 Object.assign(leagueStatsUI,{league,year:current?'current':String(year),club,query:'',minimum:0});
 render();deskBrowserAfter();queueInterfaceSave();return true;
}
function leagueReference(league,year,club='all',label){
 const text=label||LEAGUE_NAMES[league]||'Liga ej registrerad';
 if(!LEAGUE_NAMES[league]||String(year)!==String(state.season.year)&&!state.leagueStatistics.archives.some(a=>String(a.year)===String(year)))return trainingSafe(text);
 return `<a class="player-reference" href="#league/${encodeURIComponent(league)}/${encodeURIComponent(year)}" onclick="${trainingSafe('openLeagueContext('+[league,year,club].map(v=>JSON.stringify(v)).join(',')+');return false;')}">${trainingSafe(text)}</a>`;
}
function matchReportReference(report,label){
 return `<a class="player-reference" href="#match/${encodeURIComponent(report.id)}" onclick="${trainingSafe('matchesOpenReport('+JSON.stringify(report.id)+');return false;')}">${trainingSafe(label||report.own+'–'+report.against)}</a>`;
}
function clubContextView(){
 const c=state.clubBrowser;if(!c)return '<p>Ingen klubb vald.</p>';
 const {club,year}=c,current=String(year)===String(state.season.year),rows=clubSeasonRows(club,year);
 const leagues=current?[state.world.membership[club]].filter(Boolean):[...new Set(rows.map(r=>r.league).filter(Boolean))];
 if(!current&&c.league&&!leagues.includes(c.league))leagues.push(c.league);
 const reports=(state.analysis.matches||[]).filter(m=>m.finished&&String(m.year)===String(year)&&(m.club===club||m.opponent===club));
 const roster=current?(state.clubRosters[club]||[]):[...new Map(rows.map(r=>[String(r.id),r])).values()];
 const fixtures=current?state.schedule.filter(g=>g.home===club||g.away===club):[];
 return `<article class="league-workspace"><header><button class="fm-back" onclick="deskBack('leagues')" aria-label="Tillbaka till föregående vy">←</button><div><h1>${trainingSafe(club)}</h1><p>${seasonLabel(year)} · ${current?'Aktuell klubb':'Historiska registreringar'}</p></div></header><p>${leagues.map(l=>leagueReference(l,year)).join(' · ')||'Ligatillhörighet ej registrerad för säsongen.'}</p><p>${leagues.map(l=>leagueReference(l,year,club,'Klubbens spelarstatistik · '+LEAGUE_NAMES[l])).join(' · ')}</p>${current?(club===managerClub()?deskLink('Arbeta med truppen',{page:'squad'}):`<button class="btn secondary" onclick="${trainingSafe('matchesOpponent('+JSON.stringify(club)+')')}">Motståndsrapport</button>`):'<p>Listan visar spelare med registrerad statistik för klubben denna säsong. Den är inte en fullständig historisk trupp.</p>'}<section class="lg-panel"><h2>${current?'Spelartrupp':'Registrerade spelare'}</h2><div class="lg-scroll" data-scroll-key="club-roster"><table><thead><tr><th>Spelare</th><th>Position</th>${current?'<th>Ålder</th>':''}</tr></thead><tbody>${roster.map(p=>`<tr><th>${playerReference(p.id,p.name)}</th><td>${trainingSafe(p.pos||'Saknas')}</td>${current?`<td>${p.age??'Saknas'}</td>`:''}</tr>`).join('')||'<tr><td>Inga spelaruppgifter finns registrerade.</td></tr>'}</tbody></table></div></section><section class="lg-panel"><h2>Sparade matchrapporter</h2><p>Endast matcher med sparad detaljrapport visas. Resultatet anges i samma ordning som klubbnamnen, oavsett spelplats.</p>${reports.map(m=>`<p>${trainingSafe(m.date)} · ${clubReference(m.club,{year})} – ${clubReference(m.opponent,{year})} · ${matchReportReference(m)}</p>`).join('')||'<p>Inga detaljrapporter finns sparade för denna klubb och säsong.</p>'}</section>${current?`<section class="lg-panel"><h2>Serieschema · ${seasonLabel(year)}</h2><table><thead><tr><th>Datum</th><th>Hemma</th><th>Borta</th><th>Resultat / förberedelse</th></tr></thead><tbody>${fixtures.map(g=>{const report=reports.find(m=>m.date===g.date&&!m.friendly&&[g.home,g.away].includes(m.club)&&[g.home,g.away].includes(m.opponent));return `<tr><td>${trainingSafe(g.date||'Datum saknas')}</td><td>${clubReference(g.home)}</td><td>${clubReference(g.away)}</td><td>${g.played?(report?matchReportReference(report,g.homeGoals+'–'+g.awayGoals):trainingSafe(g.homeGoals+'–'+g.awayGoals)+' · Detaljrapport saknas'):[g.home,g.away].includes(managerClub())?`<button onclick="${trainingSafe('matchesOpenDay('+JSON.stringify(g.date)+')')}">Öppna matchdag</button>`:'Kommande match'}</td></tr>`;}).join('')||'<tr><td>Inga seriematcher registrerade.</td></tr>'}</tbody></table></section>`:''}</article>`;
}
