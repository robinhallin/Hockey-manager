// Portraits are presentation data, never part of a save or the simulation RNG.
// Exact source-qualified IDs only: names, clubs and nationality are not identities.
const PLAYER_PORTRAITS = Object.freeze({
 'ep-251447': Object.freeze({src:'assets/portraits/ep-251447.png',kind:'real',name:'Jonathan Ang'}),
 'ep-796339': Object.freeze({src:'assets/portraits/ep-796339.png',kind:'real',name:'Herman Liv'})
});
function playerPortraitRecord(p){
 if(!p || p.id===undefined || p.id===null || p.fictional===true)return null;
 return Object.prototype.hasOwnProperty.call(PLAYER_PORTRAITS,String(p.id))?PLAYER_PORTRAITS[String(p.id)]:null;
}
function playerAvatar(p,compact=false){
 const record=playerPortraitRecord(p),name=trainingSafe(p?.name||'Okänd spelare');
 const label=record?'Tecknad avatar av '+name:'Porträtt saknas för '+name;
 return `<span class="player-avatar${compact?' player-avatar--compact':''}" role="img" aria-label="${label}" title="${label}"><span class="player-avatar-fallback" aria-hidden="true">${trainingSafe((p?.name||'?').split(/\s+/).filter(Boolean).map(x=>Array.from(x)[0]).slice(0,2).join(''))}</span>${record?`<img src="${record.src}" alt="" width="256" height="256" loading="lazy" decoding="async" onerror="this.hidden=true;this.parentElement.setAttribute('aria-label','Porträtt kunde inte laddas');this.parentElement.title='Porträtt kunde inte laddas'">`:''}</span>`;
}
