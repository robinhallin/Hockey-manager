"use strict";

function managerOffice2StaffLogEnsure(){
  const office=managerOffice2Ensure();
  office.staffLog??=[];
  return office.staffLog;
}
function managerOffice2StaffLogAdd(area,title,detail,key=''){
  if(!state.careerStarted)return false;
  const log=managerOffice2StaffLogEnsure(),date=state.calendar?.date||'';
  const signature=`${date}:${area}:${key||title}`;
  if(log.some(entry=>entry.signature===signature))return false;
  log.unshift({signature,date,area,title,detail});
  if(log.length>40)log.length=40;
  return true;
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

function managerOffice2MedicalStaffPlan(){
  if(!managerOffice2Delegated('medical')||!state.careerStarted)return [];
  ensureMedical();
  const changed=[];
  for(const p of managerRoster()){
    const injury=p.health?.injury;
    if(!injury||injury.remaining>0||p.health.clearance!=='rest')continue;
    // The staff may only choose the conservative limited-comeback path.
    // Full comeback remains a manager decision.
    if(injury.readiness>=75&&injury.readiness<100){
      p.health.clearance='limited';
      changed.push(p);
      managerOffice2StaffLogAdd('medical',`${p.name} sattes på begränsad comeback`,'Medicinska staben bedömde att matchfas kunde inledas med begränsad istid. Full comeback kräver fortfarande ditt beslut.',`limited:${p.id}`);
    }
  }
  if(changed.length)repairMedicalLines();
  return changed.map(p=>({id:p.id,name:p.name,clearance:p.health.clearance}));
}

const managerOffice2MedicalDayBase=medicalDay;
medicalDay=function(session=null){
  managerOffice2MedicalDayBase(session);
  managerOffice2MedicalStaffPlan();
};

function managerOffice2ResponsibilitySummary(){
  return {
    training:managerOffice2Delegated('training')
      ?'Tränarstaben skyddar automatiskt spelare med mycket låg ork enligt den befintliga återhämtningspolicyn.'
      :'Du styr individuell återhämtning.',
    medical:managerOffice2Delegated('medical')
      ?'Medicinska staben håller spelaren i rehab och kan välja begränsad comeback när beredskapen är tillräcklig. Full comeback kräver dig.'
      :'Du bestämmer comebacknivå när rehabiliteringen når matchfas.',
    scouting:managerOffice2Delegated('scouting')
      ?'Scoutuppdrag fortsätter enligt plan och bara avvikelser behöver lyftas.'
      :'Du följer scoutuppdragen direkt.',
    contracts:managerOffice2Delegated('contracts')
      ?'Staben bevakar utgående avtal, men ekonomiska åtaganden kräver fortfarande ditt beslut.'
      :'Du bevakar utgående avtal själv.'
  };
}

function managerOffice2StaffLogView(){
  const log=managerOffice2StaffLogEnsure().slice(0,6);
  return `<div class="office2-delegation office2-staff-history"><span>Stabens senaste åtgärder</span>${log.length?`<details><summary>${log.length} registrerade åtgärder</summary>${log.map(entry=>`<p><strong>${trainingSafe(managerOffice2StaffAreaLabel(entry.area))} · ${trainingSafe(entry.date)}</strong><br>${trainingSafe(entry.title)} — ${trainingSafe(entry.detail)}</p>`).join('')}</details>`:'<small>Inga delegerade rutinåtgärder är registrerade ännu.</small>'}</div>`;
}

const managerOffice2ViewBeforeResponsibilityLog=managerOffice2View;
managerOffice2View=function(){
  const html=managerOffice2ViewBeforeResponsibilityLog();
  const marker='</section>',at=html.lastIndexOf(marker);
  return at<0?html:html.slice(0,at)+managerOffice2StaffLogView()+html.slice(at);
};
