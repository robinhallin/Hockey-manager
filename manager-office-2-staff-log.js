"use strict";

function managerOffice2StaffLogEnsure(){
  const office=managerOffice2Ensure();
  office.staffLog??=[];
  return office.staffLog;
}
function managerOffice2StaffLogAdd(area,title,detail,key=''){
  if(!state.careerStarted)return;
  const log=managerOffice2StaffLogEnsure();
  const date=state.calendar?.date||'';
  const signature=`${date}:${area}:${key||title}`;
  if(log.some(entry=>entry.signature===signature))return;
  log.unshift({signature,date,area,title,detail});
  if(log.length>40)log.length=40;
}
function managerOffice2StaffAreaLabel(area){return ({training:'Träning',medical:'Medicinskt',scouting:'Scouting',contracts:'Kontrakt'})[area]||'Stab';}

const managerOffice2TrainingDelegateRecoveryBase=trainingDelegateRecovery;
trainingDelegateRecovery=function(){
  const before=new Map(managerRoster().map(p=>[String(p.id),p.trainingLoad]));
  managerOffice2TrainingDelegateRecoveryBase();
  if(!managerOffice2Delegated('training'))return;
  for(const p of managerRoster()){
    if(before.get(String(p.id))==='normal'&&p.trainingLoad==='rest'&&p.trainingReturn?.delegated){
      managerOffice2StaffLogAdd('training',`${p.name} fick återhämtningsdag`,'Tränarstaben reagerade på låg ork och ersatte dagens normala belastning med vila.',`rest:${p.id}`);
    }
  }
};

const managerOffice2MedicalStaffPlanLoggedBase=managerOffice2MedicalStaffPlan;
managerOffice2MedicalStaffPlan=function(){
  const changed=managerOffice2MedicalStaffPlanLoggedBase();
  for(const item of changed){
    managerOffice2StaffLogAdd('medical',`${item.name} sattes på begränsad comeback`,'Medicinska staben bedömde att matchfas kunde inledas med begränsad istid. Full comeback kräver fortfarande ditt beslut.',`limited:${item.id}`);
  }
  return changed;
};

function managerOffice2StaffLogView(){
  const log=managerOffice2StaffLogEnsure().slice(0,6);
  return `<section class="office2-staff-log" aria-label="Stabens senaste åtgärder"><header><div><span class="desk-kicker">STABENS ARBETE</span><h3>Vad har staben gjort?</h3></div><strong>${log.length}</strong></header>${log.length?`<div class="office2-staff-log-list">${log.map(entry=>`<article><div><span>${trainingSafe(managerOffice2StaffAreaLabel(entry.area))}</span><time>${trainingSafe(entry.date)}</time></div><strong>${trainingSafe(entry.title)}</strong><p>${trainingSafe(entry.detail)}</p></article>`).join('')}</div>`:'<p class="office-empty">Inga delegerade rutinåtgärder är registrerade ännu.</p>'}</section>`;
}

const managerOffice2ViewBeforeStaffLog=managerOffice2View;
managerOffice2View=function(){
  const html=managerOffice2ViewBeforeStaffLog();
  const marker='</section>';
  const at=html.lastIndexOf(marker);
  return at<0?html:html.slice(0,at)+managerOffice2StaffLogView()+html.slice(at);
};
