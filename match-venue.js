"use strict";
// Simulation sides remain manager=0 / opponent=1. Venue is presentation metadata.
function matchVenue(m=state.live){
 const own=managerClub(),other=m?.opponent||opponent();
 if(m?.venue&&[m.venue.home,m.venue.away].includes(own))return m.venue;
 const friendly=state.calendar?.friendlies.find(f=>f.id===state.calendar.active)|| (m?.friendly?state.calendar?.friendlies.find(f=>f.club===own&&f.opponent===other&&f.date===state.calendar.date):null);
 const game=friendly?{home:friendly.home===false?other:own,away:friendly.home===false?own:other}:state.schedule.find(g=>g.round===state.round&&(g.home===own||g.away===own));
 const home=game?.home||own,away=game?.away||other;
 return {home,away,ownHome:home===own,arena:clubArena(home)?.name||home};
}
function matchVenueValues(values){return matchVenue().ownHome?values:[...values].reverse();}
function matchVenueScore(){const v=matchVenue(),m=state.live;return v.ownHome?[m.hv,m.opp]:[m.opp,m.hv];}
const matchCrestImages=new Map();
function matchIceCrest(name){
 const src=CLUB_CRESTS[name];if(!src||typeof Image==='undefined')return null;
 if(!matchCrestImages.has(src)){const img=new Image();img.src=src;matchCrestImages.set(src,img);}
 const img=matchCrestImages.get(src);return img.complete&&img.naturalWidth?img:null;
}
