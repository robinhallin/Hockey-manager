"use strict";
// Shared player constraints. Spatial effort and event generation remain engine-specific.
const READINESS_MENTAL=new Set(['decisions','composure','vision','positioning','passing']);
function readinessCeiling(fatigue=0){return Math.max(0,100-Math.max(0,Math.min(100,fatigue))*.35);}
function readinessLoad(tempo='normal',forecheck='balanced',physicality='normal'){
 return (tempo==='high'?1.22:tempo==='low'?.84:1)*(forecheck==='aggressive'?1.12:1)*(physicality==='hard'?1.06:1);
}
function readinessWork(seconds,stamina=10,goalie=false,load=1){return Math.max(0,seconds)*(goalie?.005:.014)*load*(1.4-stamina/25);}
function readinessEnergy(level,seconds,playing,stamina=10,goalie=false,load=1,pk=false,effort=1,ceiling=100){
 if(playing)return Math.max(0,level-Math.max(0,seconds)*.48*load*(1.45-stamina/25)*(goalie?.025:1)*(pk&&!goalie?1.12:1)*effort);
 // One-second subdivisions avoid giving the coarse engine a different recovery curve.
 let left=Math.max(0,seconds);
 while(left>0){const dt=Math.min(1,left);level=Math.min(ceiling,level+dt*(.2+Math.max(0,80-level)*.006)*(.7+stamina/25));left-=dt;}
 return level;
}
function readinessRecover(level,seconds,stamina=10,ceiling=100,bonus=1){return Math.min(ceiling,level+Math.max(0,seconds)*.18*bonus*(.7+stamina/25));}
function readinessFit(p,role,special=false){const fit=positionFit(p,role);return special&&role!=='G'?Math.max(.82,fit):fit;}
function readinessAttribute(base,key,energy=100,fit=1,chemistry=50,morale=70,extra=0){
 const mental=READINESS_MENTAL.has(key)?Math.max(-1.5,Math.min(1,(morale-70)/30))*.25:0;
 return Math.max(1,Math.min(20,base*(1-(100-Math.max(0,Math.min(100,energy)))*.0035)*fit*chemistryFactor(chemistry,key)+mental+extra));
}
function readinessSquadView(){
 const selected=new Map();
 for(const [type,ids] of [['forwards',state.lines.forwards],['defense',state.lines.defense],['goalie',[state.lines.goalie]]])ids.forEach((id,i)=>selected.set(String(id),lineupRole(type,i)));
 return `<section class="chemistry-analysis"><h2 style="padding:0 16px">Beredskap & laguttagning</h2><p>Startenergi om matchen börjar nu, före ytterligare vila. Jämför slitage och positionsvana innan du tar ut laget. Moral påverkar mentala egenskaper; den gör inte spelaren snabbare.</p><div class="chemistry-table-scroll" tabindex="0" role="region" aria-label="Jämför spelarnas matchberedskap"><table><thead><tr><th>Spelare</th><th>Planerad plats</th><th>Medicinskt</th><th>Slitage</th><th>Startenergi</th><th>Positionsvana</th><th>Moral</th><th>Exempel: grund → anpassat¹</th></tr></thead><tbody>${managerRoster().map(p=>{
 const role=selected.get(String(p.id)),energy=readinessCeiling(p.fatigue||0),key=p.pos==='MV'?'reflexes':'passing',base=ensurePlayerAttributes(p)[key],fit=role?readinessFit(p,role):1;
 return `<tr><th scope="row">${trainingSafe(p.name)}</th><td>${role?(StudioHockey.ROLE_NAMES[role]||role):'Utanför startformationerna'}</td><td>${trainingSafe(medicalStatus(p))}</td><td>${Math.round(p.fatigue||0)}/100</td><td>${energy.toFixed(0)} %</td><td>${role?Math.round(fit*100)+' %':'—'}</td><td>${Math.round(p.morale??70)}/100</td><td>${p.pos==='MV'?'Reflexer':'Passningar'} ${base} → ${readinessAttribute(base,key,energy,fit,50,p.morale??70).toFixed(1)}</td></tr>`;
 }).join('')}</tbody></table></div><p>¹ Exemplet isolerar energi, positionsvana och moral. Kemi, matchplan och tränarbudskap tillkommer i matchen. Medicinska begränsningar gäller även när energin är hög. Positionsvana visas för ordinarie formation; special teams bedöms separat. Slitage begränsar hur mycket spelaren kan återhämta på bänken.</p></section>`;
}
