"use strict";

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
