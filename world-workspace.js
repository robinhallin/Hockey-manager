"use strict";
// A home for the existing international simulation. No calendar or game data changes.
function worldOpenLeague(league){
 if(!['NHL','AHL'].includes(league))return;
 nasUI.league=league;nasUI.division='all';nasUI.club='all';nasUI.year='current';nasUI.tab='table';nasUI.game=null;
 nasOpen();
}
function worldWorkspaceView(){
 const season=state.naLeagues?.season;
 const leagues=['NHL','AHL'].map(league=>{
  const data=season?.leagues[league],games=data?.games||[],played=games.filter(g=>g.played).length;
  const next=games.filter(g=>!g.played&&g.date>=state.calendar.date).sort((a,b)=>a.date.localeCompare(b.date))[0];
  return `<article class="mw-panel"><h2>${league}</h2><p>${season?seasonLabel(season.year)+' · ':''}${nasClubs(league).length} klubbar · ${played} spelade matcher</p><p>${data?.champion?'Mästare: '+trainingSafe(data.champion):next?'Nästa matchdag: '+calText(next.date):'Inga kommande matcher inlagda.'}</p><button type="button" class="desk-link" onclick="worldOpenLeague('${league}')">Tabell, matcher & statistik →</button></article>`;
 }).join('');
 return `<section class="matches-workspace world-workspace"><header class="mw-heading"><div><span class="desk-kicker">HOCKEYVÄRLDEN · ${calText(state.calendar.date)}</span><h1>Världen</h1><p>Följ ligor, landslag och dina spelares väg ut i världen.</p></div></header><div class="world-grid">${internationalCalendar()||'<section class="mw-panel"><h2>Landslag & JVM</h2><p>Ingen aktiv turnering just nu.</p>'+deskLink('Landslagsbevakning',{page:'international'})+'</section>'}${nhlCalendar()}${leagues}</div><section class="mw-panel"><h2>Ligorna i Sverige</h2><p>SHL och HockeyAllsvenskan finns samlade under Ligorna.</p>${deskLink('Öppna ligorna',{page:'leagues'})}</section><p class="mw-note">Resultat, tabeller och draftval följer din karriär. De är inte liveresultat från verklig hockey.</p></section>`;
}
