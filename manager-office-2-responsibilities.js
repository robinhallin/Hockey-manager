"use strict";

function managerOffice2MedicalStaffPlan(){
  if(staffMode('medical')!=='execute'||!state.careerStarted)return [];
  ensureMedical();
  const changed=[];
  for(const p of managerRoster()){
    const injury=p.health?.injury;
    if(!injury||injury.remaining>0||p.health.clearance!=='rest'||injury.managerPlan?.club===managerClub())continue;
    // The staff may only choose the conservative limited-comeback path.
    // Full comeback remains a manager decision.
    if(injury.readiness>=75&&injury.readiness<100){
      p.health.clearance='limited';
      changed.push(p);
      staffRecord('medical',`${p.name}: begränsad comeback vid ${Math.round(injury.readiness)} % beredskap. Full comeback är fortfarande ditt beslut.`);
      medicalReport(`${p.name}: staben väljer begränsad comeback`, `Matchberedskap ${Math.round(injury.readiness)} %. Högst ${p.pos==='MV'?30:10} minuter per match. Du kan ändra planen under Medicinskt team; dina egna val gäller tills rehabiliteringen är klar.`);
    }
  }
  if(changed.length)repairMedicalLines();
  return changed.map(p=>({id:p.id,name:p.name,clearance:p.health.clearance}));
}

const managerOffice2MedicalDayBase=medicalDay;
medicalDay=function(session=null,sessionEffects=null){
  managerOffice2MedicalDayBase(session,sessionEffects);
  managerOffice2MedicalStaffPlan();
};

function managerOffice2JuniorStaffPlan(){
 if(staffMode('juniors')!=='execute'||!state.juniors)return [];
 const rows=[];for(const p of juniorPlayers()){
  if(p.juniorManualLoad||p.academy?.loan)continue;
  const advice=juniorAdvice(p);if((p.fatigue||0)>=65&&p.trainingLoad!=='light'){p.trainingLoad='light';p.juniorAutoLoad=true;rows.push(p);}
  else if((p.fatigue||0)<=30&&p.trainingLoad==='light'&&p.juniorAutoLoad){p.trainingLoad='normal';p.juniorAutoLoad=false;rows.push(p);}
 }
 if(rows.length)juniorReport('Junioransvarig justerar belastningen',`${rows.length} spelares träningsbelastning har justerats försiktigt efter ork. Lån, uppflyttning och frisläppning kräver fortfarande ditt beslut.`);
 return rows;
}
function managerOffice2LineupSuggestion(){
 if(!managerOffice2Delegated('lineup')||!state.careerStarted)return null;
 const candidates=managerRoster().filter(p=>medicalAvailable(p)),forwards=candidates.filter(p=>p.pos!=='B'&&p.pos!=='MV').sort((a,b)=>matchAttributeRating(b)-matchAttributeRating(a)),defense=candidates.filter(p=>p.pos==='B').sort((a,b)=>matchAttributeRating(b)-matchAttributeRating(a)),goalie=candidates.filter(p=>p.pos==='MV').sort((a,b)=>matchAttributeRating(b)-matchAttributeRating(a))[0];
 return {forwards:forwards.slice(0,12).map(p=>p.id),defense:defense.slice(0,6).map(p=>p.id),goalie:goalie?.id||null,note:'Förslag utifrån tillgänglighet och aktuell spelstyrka. Staben ändrar inte din laguttagning automatiskt.'};
}
function managerOffice2ResponsibilitySummary(){
  return {
    training:staffMode('training')==='advise'?'Assisterande föreslår pass och återhämtning. Du beslutar.':staffMode('training')==='execute'
      ?'Assisterande planerar lagpass, individuella fokus och återhämtning. Veckorapport varje söndag.'
      :'Du styr individuell återhämtning.',
    medical:staffMode('medical')==='advise'?'Medicinska staben föreslår uppföljning. Du beslutar om comeback.':staffMode('medical')==='execute'
      ?'Medicinska staben håller spelaren i rehab och kan välja begränsad comeback när beredskapen är tillräcklig. Full comeback kräver dig.'
      :'Du bestämmer comebacknivå när rehabiliteringen når matchfas.',
    scouting:staffMode('scouting')==='advise'?'Scouten föreslår kartläggning. Du godkänner uppdrag och kostnad.':staffMode('scouting')==='execute'
      ?'Scoutuppdrag fortsätter enligt plan och bara avvikelser behöver lyftas.'
      :'Du följer scoutuppdragen direkt.',
    contracts:managerOffice2Delegated('contracts')?'Staben bevakar utgående avtal, men ekonomiska åtaganden kräver fortfarande ditt beslut.':'Du bevakar utgående avtal själv.',
    juniors:staffMode('juniors')==='advise'?'Junioransvarig föreslår anpassningar. Du beslutar.':staffMode('juniors')==='execute'?'Junioransvarig justerar endast försiktig träningsbelastning. Lån, uppflyttning och avslut kräver dig.':'Du styr juniorernas belastning.',
    lineup:managerOffice2Delegated('lineup')?'Assisterande kan ta fram ett lagförslag, men ändrar inte kedjor eller startmålvakt automatiskt.':'Du ansvarar för laguttagningen.'
  };
}
