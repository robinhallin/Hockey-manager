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
 const o=managerOffice2Ensure(),date=state.calendar.date;o.adviceDates??={};staffProposalFollowup();
 for(const area of Object.keys(STAFF_MANDATES)){
  if(staffMode(area)!=='advise')continue;
  const key=managerClub()+':'+area,last=o.adviceDates[key];if(last&&calGap(last,date)<7)continue;
  let text='';
  if(area==='training'){const target=calAdd(date,1),s=assistantTeamSession(target);text=`Förslag för ${calText(target)}: ${TRAINING_SESSIONS[s.type].name}, ${s.intensity==='light'?'lätt':s.intensity==='hard'?'hård':'normal'} belastning.`;}
  if(area==='juniors')text=juniorPlayers().filter(p=>p.fatigue>=35).map(p=>p.name+': överväg lättare belastning').join('. ');
  if(area==='medical')text=managerRoster().filter(p=>p.health?.injury).map(p=>p.name+': granska beredskap och rehabiliteringsplan').join('. ');
  if(area==='contracts')text=managerRoster().filter(contractNeedsDecision).map(p=>p.name+': planera förlängning eller ersättare').join('. ');
  if(area==='scouting'){const need=recruitmentNeeds().find(n=>n.need||n.futureNeed);if(need)text=`Kartlägg ${need.name.toLowerCase()} för ${need.need?'aktuell täckning':'nästa säsong'}. Granska interna alternativ och uppdragskostnaden.`;}
  if(area==='lineup'){const suggestion=managerOffice2LineupSuggestion();if(suggestion)text=suggestion.note+' Målvaktsalternativ: '+(findPlayerAnywhere(suggestion.goalie)?.name||'saknas')+'. Utespelare: '+[...suggestion.forwards,...suggestion.defense].map(id=>findPlayerAnywhere(id)?.name).filter(Boolean).join(', ')+'.';}
  o.adviceDates[key]=date;if(!text)continue;
  staffProposalCreate(area,text);staffRecord(area,text);managerMessage(`staff-advice:${key}:${date}`,STAFF_MANDATES[area].name+': stabens förslag',text+' Hantera rådet under Ansvar & mandat.','Tränarteam',{priority:area==='medical'||area==='contracts'?'high':'normal',link:'staffReview'});
 }
}
function staffMandatesView(){
 const activity=(state.office2?.activity||[]).filter(e=>e.club===managerClub());
 return `<section class="staff-mandates"><h2>Ansvar & mandat</h2><div class="staff-mandate-grid">${Object.entries(STAFF_MANDATES).map(([area,d])=>`<article><label>${d.name}<select aria-label="Ansvar för ${d.name}" onchange="staffSetMode('${area}',this.value)">${[['manual','Jag bestämmer'],['advise','Staben föreslår'],...(d.automatic?[['execute','Staben genomför inom mandat']]:[])].map(([v,l])=>`<option value="${v}" ${staffMode(area)===v?'selected':''}>${l}</option>`).join('')}</select></label><p>${d.detail}</p>${area==='scouting'?`<p>Månadsbudget: ${money(scoutingOffice()?.delegation.monthly||0)}. <button class="desk-link" onclick="deskNavigate('transfers','missions')">Ändra scoutbudget</button></p>`:''}</article>`).join('')}</div><details><summary>Stabens åtgärder & förslag · ${activity.length}</summary>${activity.slice(0,30).map(e=>`<p><strong>${calText(e.date)} · ${STAFF_MANDATES[e.area]?.name||'Staben'}</strong><br>${trainingSafe(e.text)}</p>`).join('')||'<p>Åtgärder visas när staben har arbetat.</p>'}</details></section>`;
}

function staffProposalSnapshot(area,date){
 if(area==='training')return JSON.stringify(state.calendar.plans?.[date]||null);
 if(area==='juniors')return JSON.stringify(juniorPlayers().filter(p=>p.fatigue>=35&&!p.academy?.loan&&!playerLoan(p)).map(p=>[p.id,p.trainingLoad||'normal',p.juniorManualLoadDate||null]));
 return '';
}
function staffProposalCreate(area,text){
 const o=managerOffice2Ensure(),date=state.calendar.date,target=calAdd(date,['training','juniors'].includes(area)?1:7);o.proposals??=[];
 for(const p of o.proposals)if(p.club===managerClub()&&p.area===area&&p.status==='pending')p.status='replaced';
 o.proposals.unshift({id:`${managerClub()}:${area}:${date}`,club:managerClub(),area,text,date,target,status:'pending',snapshot:staffProposalSnapshot(area,target),session:area==='training'?assistantTeamSession(target):null});
 o.proposals=o.proposals.slice(0,60);
}
function staffProposalFollowup(){
 for(const p of state.office2?.proposals||[]){
  if(p.club!==managerClub())continue;
  if(p.status==='pending'&&(state.calendar.date>p.target||p.area==='training'&&state.calendar.date===p.target)){p.status='expired';p.outcome='Förslaget löpte ut utan ändring.';}
  if(p.status==='accepted'&&state.calendar.date>p.target){p.status='followed';p.outcome=p.area==='training'?(JSON.stringify(state.calendar.plans?.[p.target])===JSON.stringify(p.session)?'Det godkända passet låg kvar i kalendern. Effekten följs i träningsrapporten.':'Kalenderpasset ändrades efter beslutet. Se träningsrapporten.'):'Belastningen sänktes vid beslutet. Följ aktuell ork och utveckling i juniorvyn.';}
 }
}
function staffProposalAnswer(id,action){
 const p=state.office2?.proposals?.find(p=>p.id===id&&p.club===managerClub());
 if(!p||p.status!=='pending'||!['accept','decline','adjust'].includes(action)||juniorLocked()||!managerEmployed())return false;
 if(state.calendar.date>p.target||p.snapshot!==staffProposalSnapshot(p.area,p.target)){p.status='expired';p.outcome='Underlaget har ändrats. Granska ett nytt förslag.';save();render();return false;}
 if(action==='adjust'){deskNavigate(({training:'training',juniors:'juniors',medical:'medical',contracts:'squad',scouting:'transfers',lineup:'lines'})[p.area]);return true;}
 if(action==='accept'){
  if(p.area==='training'){
   if(state.calendar.date>=p.target||!TRAINING_SESSIONS[p.session?.type]||!['light','normal','hard'].includes(p.session.intensity))return false;
   state.calendar.plans[p.target]={...p.session};
   const index=state.training.day+calGap(state.calendar.date,p.target);if(index<trainingDays())state.training.plan[index]={...p.session};
  }else if(p.area==='juniors'){
   for(const [id] of JSON.parse(p.snapshot)){const player=juniorById(id);if(player){player.trainingLoad=player.fatigue>=55?'rest':'light';player.juniorManualLoad=true;player.juniorAutoLoad=false;player.juniorManualLoadDate=state.calendar.date;}}
  }else return false;
 }
 p.status=action==='accept'?'accepted':'declined';p.decided=state.calendar.date;staffRecord(p.area,`${action==='accept'?'Godkänt':'Avböjt'}: ${p.text}`);managerAgendaReconcile();save();render();return true;
}
function staffProposalsView(){
 const rows=(state.office2?.proposals||[]).filter(p=>p.club===managerClub()).slice(0,12);
 return `<section class="cd-panel"><h2>Förslag att ta ställning till</h2>${rows.map(p=>{const id=trainingSafe(JSON.stringify(p.id)),pending=p.status==='pending'&&state.calendar.date<=p.target;return `<article><h3>${STAFF_MANDATES[p.area]?.name||'Staben'} · ${calText(p.date)}</h3><p>${trainingSafe(p.text)}</p>${pending?`${['training','juniors'].includes(p.area)?`<button class="btn" onclick='staffProposalAnswer(${id},"accept")'>Godkänn</button>`:''}<button class="desk-link" onclick='staffProposalAnswer(${id},"adjust")'>Granska / justera</button><button class="desk-link" onclick='staffProposalAnswer(${id},"decline")'>Avböj</button><small> Gäller till ${calText(p.target)}. Ekonomiska avtal och medicinska beslut granskas i respektive vy.</small>`:`<p>${trainingSafe(p.outcome||({accepted:'Godkänt · inväntar uppföljning',declined:'Avböjt',replaced:'Ersatt av nyare förslag',followed:'Uppföljt'}[p.status]||'Utgånget'))}</p>`}</article>`;}).join('')||'<p>Här visas råd när staben har fått mandat att föreslå.</p>'}</section>`;
}
const staffMandatesBaseView=staffMandatesView;
staffMandatesView=function(){return staffMandatesBaseView()+staffProposalsView();};
