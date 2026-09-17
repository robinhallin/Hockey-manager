"use strict";

// Bridge the existing persistent Stories system into Manager Life 3. No second
// narrative engine: story choices and outcomes remain owned by stories.js.
(function(){
  if(typeof managerLifeAgenda!=='function')return;
  const base=managerLifeAgenda;
  window.managerLifeAgenda=function(){
    const rows=base(),stories=state.stories?.active||[];
    const decisions=stories.filter(s=>s.status==='decision');
    const following=stories.filter(s=>s.status==='following');
    if(decisions.length){const s=decisions[0];rows.unshift({kind:'story',title:s.title,detail:'En pågående säsongshistoria väntar på ditt besked.',urgency:'critical',page:'stories',reason:'Ditt besked skapar ett löfte som följs upp av kommande matcher.'});}
    else if(following.length){const s=following[0],e=s.expectation||{};rows.push({kind:'story',title:`Följ upp: ${s.title}`,detail:e.matches?`${e.qualified||0} av ${e.needed||0} mål uppfyllda efter ${e.eligible||0} spelbara matcher.`:'Historien fortsätter genom verkliga matchresultat.',urgency:'medium',page:'stories',reason:'Tidigare managerbeslut ska vara synliga tills de får ett faktiskt utfall.'});}
    const rank={critical:100,high:75,medium:50,low:25};return rows.sort((a,b)=>(rank[b.urgency]||0)-(rank[a.urgency]||0)).slice(0,5);
  };
})();
