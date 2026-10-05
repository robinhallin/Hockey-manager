"use strict";
// Shared explanations for the existing decision rules. Reading never negotiates.
function recruitmentTermsReview(p,offer,club=managerClub(),w=recruitPlayerWishes(p,club)){
 const rows=[
  {key:'salary',label:'Årslön',met:offer.salary>=w.salary,text:`${money(offer.salary)}/år erbjuds; spelaren begär minst ${money(w.salary)}/år.`},
  {key:'role',label:'Ansvar',met:SQUAD_ROLES.indexOf(offer.role)>=SQUAD_ROLES.indexOf(w.role),text:`${offer.role} erbjuds; önskemålet är ${w.role}.`},
  {key:'years',label:'Trygghet',met:offer.years>=w.minYears&&offer.years<=w.maxYears,text:`${offer.years} år erbjuds; önskemålet är ${w.minYears}–${w.maxYears} år.`}
 ];
 return {priority:w.priority,rows,issues:rows.filter(r=>!r.met).map(r=>r.text),ambition:w.stretch?'Klubbens sportsliga nivå är ett steg ned relativt spelarens ambition. Det höjer lönekravet och gör konkurrerande erbjudanden mer attraktiva.':'Klubbens sportsliga nivå ger inget särskilt ambitionspåslag.'};
}
function recruitmentTermsView(p,offer,{renewal=false,club=managerClub()}={}){
 const w=renewal?renewalWishes(p):recruitPlayerWishes(p,club),r=recruitmentTermsReview(p,offer,club,w);
 return `<section class="sc-card"><h3>Spelarens prioriteringar</h3><p>${trainingSafe(recruitPackageDecision(p,club,offer,w).explanation)}</p><p>${trainingSafe(r.priority)}. ${trainingSafe(r.ambition)}</p>${trainingSafe(recruitRoleCredibility(p,club,offer.role).text)}${r.rows.map(x=>`<p><strong>${x.label} · ${x.met?'Motsvarar önskemålet':'Behöver diskuteras'}</strong><br>${trainingSafe(x.text)}</p>`).join('')}<p>Agenten kan kompromissa om helheten i ett motbud. Klubbens pris, finansiering och registrering bedöms separat. En uppfylld önskelista är ingen garanti mot konkurrerande bud.</p></section>`;
}
function recruitmentRecord(d,event,text){
 const entry={date:state.calendar.date,event,text,terms:recruitDealTerms(d)};
 const last=d.negotiationHistory?.at(-1);
 if(last&&last.date===entry.date&&last.event===event&&last.text===text&&JSON.stringify(last.terms)===JSON.stringify(entry.terms))return;
 d.negotiationHistory=[...(d.negotiationHistory||[]),entry].slice(-16);
}
function recruitmentHistoryView(d){return `<details><summary>Förhandlingshistorik</summary>${(d.negotiationHistory||[]).map(e=>`<p><strong>${calText(e.date)} · ${trainingSafe(e.event)}</strong><br>${trainingSafe(e.text)}<br>${money(e.terms.fee)} i övergångssumma · ${money(e.terms.salary)}/år · ${e.terms.years} år · ${trainingSafe(e.terms.role)}</p>`).join('')||'<p>Äldre affär: tidigare förhandlingssteg saknar registrerad historik.</p>'}</details>`;}
function recruitmentNextStep(row){
 const d=row.d,kind=row.key.split(':')[0];
 if(!['pending','counter','active'].includes(row.status))return 'Affären är avslutad. Läs utfallet och kontrollera truppplanen innan nästa beslut.';
 if(kind==='active')return 'Följ faktisk istid och utveckling hos låneklubben. Kontrollera återkomstdatum och återkallelsevillkor.';
 if(kind==='incoming')return d.stage==='club_agreed'?'Klubbarna är överens. Spelarens beslut och slutlig finansiering återstår; ingen övergång är klar ännu.':d.stage==='counter_wait'?'Ditt motbud är skickat. Vänta på köparens svar.':'Bedöm tappad truppbredd och lönebesparing innan du godkänner, kontrar eller avvisar.';
 if(kind==='loan')return d.status==='counter'?'Jämför löneandel, ansvar, längd och återkallelse med ditt förslag. Acceptera eller avböj före sista svarsdag.':'Klubb och spelare bedömer lånet. En skickad förfrågan flyttar inte spelaren.';
 if(d.counter)return 'Jämför agentens krav med din budget och tänkta laguttagning. Acceptera, revidera eller återkalla före sista svarsdag.';
 if(recruitDealAgreed(d))return 'Villkoren är accepterade. Invänta registrering; budget, klubbtillhörighet och transferfönster kontrolleras igen.';
 return d.kind==='future'?'Spelaren bedömer ett avtal till nästa säsong. En överenskommelse ger ingen omedelbar förstärkning.':'Säljande klubb bedömer priset och spelaren bedömer villkoren. Budgeten är reserverad, men ingen betalning har gjorts.';
}
