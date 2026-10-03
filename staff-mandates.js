"use strict";
const STAFF_MANDATES={
 training:{name:'A-lagets träning',automatic:true,detail:'Planerar pass, individuella fokus och försiktig återhämtning. Dina manuella val gäller först.'},
 juniors:{name:'Juniorernas träning',automatic:true,detail:'Planerar fokus och belastning. Uppflyttning, lån och avtal beslutar du om.'},
 medical:{name:'Medicinskt',automatic:true,detail:'Kan välja begränsad comeback efter rehabilitering. Full comeback kräver ditt beslut.'},
 scouting:{name:'Scouting',automatic:true,detail:'Kan starta kartläggning inom scoutkontorets månadsbudget. Värvningar kräver ditt beslut.'},
 contracts:{name:'Kontrakt',automatic:false,detail:'Bevakar utgående avtal och föreslår åtgärder. Du godkänner alla ekonomiska åtaganden.'},
 lineup:{name:'Laguttagning',automatic:false,detail:'Tar fram tillgängliga alternativ. Du väljer kedjor, backpar och målvakt.'}
};
function staffMode(area){
 const configured=state.office2?.mandates?.[area];if(configured)return configured;
 if(area==='training')return state.training?.assistantOwner==='assistant'||state.training?.recoveryOwner==='staff'?'execute':'manual';
 if(area==='juniors')return state.juniors?.assistantOwner==='assistant'||state.office2?.delegation?.juniors?'execute':'manual';
 if(area==='scouting'&&scoutingOffice()?.delegation.enabled)return 'execute';
 return state.office2?.delegation?.[area]?(area==='medical'?'execute':'advise'):'manual';
}
function staffRecord(area,text){
 const o=managerOffice2Ensure();o.activity??=[];
 o.activity.unshift({club:managerClub(),date:state.calendar.date,area,text});o.activity=o.activity.slice(0,80);
}
function staffSetMode(area,mode){
 const def=STAFF_MANDATES[area];if(!def||!['manual','advise','execute'].includes(mode)||mode==='execute'&&!def.automatic||state.live&&!state.live.finished)return false;
 const o=managerOffice2Ensure();o.mandates??={};o.mandates[area]=mode;o.delegation[area]=mode!=='manual';
 if(area==='training'||area==='juniors')assistantSetOwner(area==='training'?'senior':'junior',mode==='execute'?'assistant':'manager',false);
 if(area==='scouting'){const d=ensureScoutingOffice().delegation;d.enabled=mode==='execute';}
 // assistantSetOwner keeps the legacy controls in sync; retain advice as a distinct mode.
 o.mandates[area]=mode;o.delegation[area]=mode!=='manual';staffRecord(area,`${def.name}: ${mode==='execute'?'staben genomför inom mandat':mode==='advise'?'staben föreslår':'du bestämmer'}.`);
 save();render();return true;
}
function staffMandateDay(){
 const o=managerOffice2Ensure(),date=state.calendar.date;o.adviceDates??={};
 for(const area of Object.keys(STAFF_MANDATES)){
  if(staffMode(area)!=='advise')continue;
  const key=managerClub()+':'+area,last=o.adviceDates[key];if(last&&calGap(last,date)<7)continue;
  let text='';
  if(area==='training'){const s=assistantTeamSession(date);text=`Förslag för ${calText(date)}: ${TRAINING_SESSIONS[s.type].name}, ${s.intensity==='light'?'lätt':s.intensity==='hard'?'hård':'normal'} belastning. Granska kalendern innan du beslutar.`;}
  if(area==='juniors')text=juniorPlayers().filter(p=>p.fatigue>=35).map(p=>p.name+': överväg lättare belastning').join('. ');
  if(area==='medical')text=managerRoster().filter(p=>p.health?.injury).map(p=>p.name+': granska beredskap och rehabiliteringsplan').join('. ');
  if(area==='contracts')text=managerRoster().filter(contractNeedsDecision).map(p=>p.name+': planera förlängning eller ersättare').join('. ');
  if(area==='scouting'){const need=recruitmentNeeds().find(n=>n.need||n.futureNeed);if(need)text=`Kartlägg ${need.name.toLowerCase()} för ${need.need?'aktuell täckning':'nästa säsong'}. Granska interna alternativ och uppdragskostnaden.`;}
  if(area==='lineup'){const suggestion=managerOffice2LineupSuggestion();if(suggestion)text=suggestion.note+' Målvaktsalternativ: '+(findPlayerAnywhere(suggestion.goalie)?.name||'saknas')+'. Utespelare: '+[...suggestion.forwards,...suggestion.defense].map(id=>findPlayerAnywhere(id)?.name).filter(Boolean).join(', ')+'.';}
  o.adviceDates[key]=date;if(!text)continue;
  staffRecord(area,text);managerMessage(`staff-advice:${key}:${date}`,STAFF_MANDATES[area].name+': stabens förslag',text,'Tränarteam',{priority:'high',link:({juniors:'juniors',training:'training',medical:'medical',contracts:'squad',scouting:'transfers',lineup:'lines'})[area]});
 }
}
function staffMandatesView(){
 const activity=(state.office2?.activity||[]).filter(e=>e.club===managerClub());
 return `<section class="staff-mandates"><h2>Ansvar & mandat</h2><div class="staff-mandate-grid">${Object.entries(STAFF_MANDATES).map(([area,d])=>`<article><label>${d.name}<select aria-label="Ansvar för ${d.name}" onchange="staffSetMode('${area}',this.value)">${[['manual','Jag bestämmer'],['advise','Staben föreslår'],...(d.automatic?[['execute','Staben genomför inom mandat']]:[])].map(([v,l])=>`<option value="${v}" ${staffMode(area)===v?'selected':''}>${l}</option>`).join('')}</select></label><p>${d.detail}</p>${area==='scouting'?`<p>Månadsbudget: ${money(scoutingOffice()?.delegation.monthly||0)}. <button class="desk-link" onclick="deskNavigate('transfers','missions')">Ändra scoutbudget</button></p>`:''}</article>`).join('')}</div><details><summary>Stabens åtgärder & förslag · ${activity.length}</summary>${activity.slice(0,30).map(e=>`<p><strong>${calText(e.date)} · ${STAFF_MANDATES[e.area]?.name||'Staben'}</strong><br>${trainingSafe(e.text)}</p>`).join('')||'<p>Åtgärder visas när staben har arbetat.</p>'}</details></section>`;
}
