// Portraits are presentation data, never part of a save or the simulation RNG.
// Exact source-qualified IDs only: names, clubs and nationality are not identities.
const PLAYER_PORTRAITS = Object.freeze({
 'ep-6020': Object.freeze({src:'assets/portraits/ep-6020.png',kind:'real',name:"Calle Järnkrok"}),
 'ep-278859': Object.freeze({src:'assets/portraits/ep-278859.png',kind:'real',name:"Jaret Anderson-Dolan"}),
 'ep-3682': Object.freeze({src:'assets/portraits/ep-3682.png',kind:'real',name:"Nicklas Bäckström"}),
 'ep-11173': Object.freeze({src:'assets/portraits/ep-11173.png',kind:'real',name:"Simon Bertilsson"}),
 'ep-142236': Object.freeze({src:'assets/portraits/ep-142236.png',kind:'real',name:"Erik Källgren"}),
 'ep-146700': Object.freeze({src:'assets/portraits/ep-146700.png',kind:'real',name:"Linus Ölund"}),
 'ep-213464': Object.freeze({src:'assets/portraits/ep-213464.png',kind:'real',name:"Julien Gauthier"}),
 'ep-227531': Object.freeze({src:'assets/portraits/ep-227531.png',kind:'real',name:"Johannes Kinnvall"}),
 'ep-246070': Object.freeze({src:'assets/portraits/ep-246070.png',kind:'real',name:"Axel Jonsson-Fjällby"}),
 'ep-247945': Object.freeze({src:'assets/portraits/ep-247945.png',kind:'real',name:"Kieffer Bellows"}),
 'ep-27397': Object.freeze({src:'assets/portraits/ep-27397.png',kind:'real',name:"Robert Hägg"}),
 'ep-312328': Object.freeze({src:'assets/portraits/ep-312328.png',kind:'real',name:"Bobby Trivigno"}),
 'ep-313354': Object.freeze({src:'assets/portraits/ep-313354.png',kind:'real',name:"Axel Andersson"}),
 'ep-33201': Object.freeze({src:'assets/portraits/ep-33201.png',kind:'real',name:"Christian Djoos"}),
 'ep-344235': Object.freeze({src:'assets/portraits/ep-344235.png',kind:'real',name:"Mattias Norlinder"}),
 'ep-375833': Object.freeze({src:'assets/portraits/ep-375833.png',kind:'real',name:"Axel Rindell"}),
 'ep-381263': Object.freeze({src:'assets/portraits/ep-381263.png',kind:'real',name:"Magnus Chrona"}),
 'ep-6562': Object.freeze({src:'assets/portraits/ep-6562.png',kind:'real',name:"Jakob Silfverberg"}),
 'ep-7084': Object.freeze({src:'assets/portraits/ep-7084.png',kind:'real',name:"Anton Rödin"}),
 'ep-797476': Object.freeze({src:'assets/portraits/ep-797476.png',kind:'real',name:"Milton Gästrin"}),
 'ep-801290': Object.freeze({src:'assets/portraits/ep-801290.png',kind:'real',name:"Gustav Hillström"}),
 'ep-855201': Object.freeze({src:'assets/portraits/ep-855201.png',kind:'real',name:"Victor Johansson"}),
 'ep-86181': Object.freeze({src:'assets/portraits/ep-86181.png',kind:'real',name:"Oskar Lindblom"}),
 'ep-9009': Object.freeze({src:'assets/portraits/ep-9009.png',kind:'real',name:"Johan Larsson"}),
 'ep-871865': Object.freeze({src:'assets/portraits/ep-871865.png',kind:'real',name:"Karl Annborn"}),
 'ep-397011': Object.freeze({src:'assets/portraits/ep-397011.png',kind:'real',name:"Santeri Hatakka"}),
 'ep-427906': Object.freeze({src:'assets/portraits/ep-427906.png',kind:'real',name:"Jan Mysak"}),
 'ep-381306': Object.freeze({src:'assets/portraits/ep-381306.png',kind:'real',name:"William Ignberg Nilsson"}),
 'ep-886275': Object.freeze({src:'assets/portraits/ep-886275.png',kind:'real',name:"Malte Gustafsson"}),
 'ep-650466': Object.freeze({src:'assets/portraits/ep-650466.png',kind:'real',name:"Olof Glifford"}),
 'ep-647763': Object.freeze({src:'assets/portraits/ep-647763.png',kind:'real',name:"Hugo Fransson"}),
 'ep-146703': Object.freeze({src:'assets/portraits/ep-146703.png',kind:'real',name:"Felix Sandström"}),
 'ep-487621': Object.freeze({src:'assets/portraits/ep-487621.png',kind:'real',name:"Lucas Lagerberg Hoen"}),
 'ep-585832': Object.freeze({src:'assets/portraits/ep-585832.png',kind:'real',name:"Martin Johnsen"}),
 'ep-259121': Object.freeze({src:'assets/portraits/ep-259121.png',kind:'real',name:"Nikola Pasic"}),
 'ep-236358': Object.freeze({src:'assets/portraits/ep-236358.png',kind:'real',name:"Lukas Rousek"}),
 'ep-284816': Object.freeze({src:'assets/portraits/ep-284816.png',kind:'real',name:"Aleksi Heponiemi"}),
 'ep-200913': Object.freeze({src:'assets/portraits/ep-200913.png',kind:'real',name:"Riley Woods"}),
 'ep-203936': Object.freeze({src:'assets/portraits/ep-203936.png',kind:'real',name:"Oskar Stål Lyrenäs"}),
 'ep-242668': Object.freeze({src:'assets/portraits/ep-242668.png',kind:'real',name:"Linus Lindström"}),
 'ep-118779': Object.freeze({src:'assets/portraits/ep-118779.png',kind:'real',name:"Hampus Eriksson"}),
 'ep-86064': Object.freeze({src:'assets/portraits/ep-86064.png',kind:'real',name:"Victor Laz"}),
 'ep-139080': Object.freeze({src:'assets/portraits/ep-139080.png',kind:'real',name:"Olle Alsing"}),
 'ep-86135': Object.freeze({src:'assets/portraits/ep-86135.png',kind:'real',name:"Niklas Hansson"}),
 'ep-113322': Object.freeze({src:'assets/portraits/ep-113322.png',kind:'real',name:"Justin Kloos"}),
 'ep-85683': Object.freeze({src:'assets/portraits/ep-85683.png',kind:'real',name:"Andreas Borgman"}),
 'ep-353521': Object.freeze({src:'assets/portraits/ep-353521.png',kind:'real',name:"Mike Hardman"}),
 'ep-249755': Object.freeze({src:'assets/portraits/ep-249755.png',kind:'real',name:"Pavol Regenda"}),
 'ep-217795': Object.freeze({src:'assets/portraits/ep-217795.png',kind:'real',name:"Markuss Komuls"}),
 'ep-871864': Object.freeze({src:'assets/portraits/ep-871864.png',kind:'real',name:"Noel Skarby"}),
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
