function trainingAutoRest(p){return state.training?.recoveryOwner==='staff'&&p.trainingLoad==='normal'&&medicalCanTrain(p)&&p.fatigue>=55&&p.trainingManualDate!==state.calendar?.date;}
function setRecoveryOwner(value){if(!['manager','staff'].includes(value))return;state.training.recoveryOwner=value;save();render();}
function trainingDelegateRecovery(){
 for(const p of managerRoster().filter(trainingAutoRest)){
  p.trainingLoad='rest';p.trainingReturn={date:calAdd(state.calendar.date,1),club:managerClub(),load:'rest',start:state.calendar.date,before:p.fatigue,trained:0,rested:0,delegated:true};
 }
}
function trainingResponsibilityView(){return `<label>Individuell återhämtning<select aria-label="Ansvar för individuell återhämtning" onchange="setRecoveryOwner(this.value)"><option value="manager" ${state.training.recoveryOwner!=='staff'?'selected':''}>Jag planerar</option><option value="staff" ${state.training.recoveryOwner==='staff'?'selected':''}>Staben skyddar slitna spelare</option></select></label><p>Staben ger en dags träningsvila vid högst 45 % ork. Dina egna belastningsplaner gäller först; en manuell ändring gäller hela dagen. Staben ändrar inte matchuttagningen.</p>`;}
