"use strict";

function managerOffice2Ensure(){
  state.office2??={delegation:{training:false,medical:false,scouting:false,contracts:false},lastSeen:{}};
  state.office2.delegation??={training:false,medical:false,scouting:false,contracts:false};
  state.office2.lastSeen??={};
  return state.office2;
}
function managerOffice2Priority(level){return ({critical:100,high:75,medium:50,low:25})[level]||0;}
function managerOffice2Delegated(area){
  if(area==='training'&&state.training?.recoveryOwner==='staff')return true;
  return Boolean(state.office2?.delegation?.[area]);
}
function managerOffice2ToggleDelegation(area){
  if(!['training','medical','scouting','contracts'].includes(area))return;
  const office=managerOffice2Ensure(),next=!managerOffice2Delegated(area);
  office.delegation[area]=next;
  if(area==='training'&&state.training)state.training.recoveryOwner=next?'staff':'manager';
  save();render();
}
function managerOffice2Items(){
  const items=[];
  const add=item=>items.push({owner:'Du',level:'medium',area:'general',requiresDecision:false,...item});
  for(const task of officeDecisions()){
    const must=task.tag==='Beslut'||task.tag==='Affär'||task.tag==='Ekonomi';
    add({id:'decision:'+task.key,title:task.title,detail:task.detail,tag:task.tag,level:must?'critical':'high',score:must?110:80,requiresDecision:must,action:task.key?{deal:task.key}:task.action||null});
  }
  const roster=managerRoster();
  const injured=roster.filter(p=>!medicalReady(p)&&p.health?.injury);
  if(injured.length)add({id:'medical:injured',title:`${injured.length} spelare ej matchklara`,detail:`${injured.slice(0,2).map(p=>p.name).join(', ')}${injured.length>2?' med flera':''} kräver uttagnings- och återgångsplanering.`,tag:'Medicinskt',area:'medical',owner:managerOffice2Delegated('medical')?'Medicinska staben':'Du',level:injured.length>=3?'high':'medium',score:injured.length>=3?76:58,action:{page:'medical'}});
  const tired=roster.filter(p=>medicalReady(p)&&p.fatigue>=35);
  if(tired.length)add({id:'training:fatigue',title:`${tired.length} spelare högt belastade`,detail:'Belastningen kan påverka både träningseffekt och matchprestation inför nästa match.',tag:'Träning',area:'training',owner:managerOffice2Delegated('training')?'Tränarstaben':'Du',level:tired.length>=5?'high':'medium',score:tired.length>=5?74:54,action:{page:'training'}});
  const contracts=roster.filter(contractNeedsDecision);
  if(contracts.length)add({id:'contracts:expiring',title:`${contracts.length} kontrakt behöver plan`,detail:'Avtal på sista året bör prioriteras innan marknadsläget förändras.',tag:'Kontrakt',area:'contracts',owner:managerOffice2Delegated('contracts')?'Sportchef/stab':'Du',level:contracts.length>=4?'high':'medium',score:contracts.length>=4?72:52,action:{page:'squad',tab:'contracts'}});
  const missions=(state.recruitment?.missions||[]).filter(m=>m.status==='active');
  if(missions.length)add({id:'scouting:missions',title:`${missions.length} aktiva scoutuppdrag`,detail:'Staben samlar observationer. Du behöver bara ingripa om prioritering eller mål ändras.',tag:'Scouting',area:'scouting',owner:managerOffice2Delegated('scouting')?'Scoutchef':'Du',level:'low',score:32,action:{page:'transfers',tab:'missions'}});
  const next=deskFixtures().upcoming[0];
  if(next){
    const days=Math.max(0,calGap(state.calendar.date,next.date));
    const score=days===0?92:days===1?84:days<=3?66:40;
    add({id:'match:'+next.date+':'+next.opponent,title:days===0?`Matchdag mot ${next.opponent}`:`${next.opponent} ${days===1?'imorgon':`om ${days} dagar`}`,detail:`${next.venue} · ${next.type}. Säkerställ kedjor, målvakt, special teams och matchplan.`,tag:'Match',area:'match',level:days===0?'critical':days===1?'high':days<=3?'medium':'low',score,action:{page:days<=1?'lines':'opponents'}});
  }
  return items.map(item=>({...item,score:(item.score??managerOffice2Priority(item.level))+(item.requiresDecision?20:0)})).sort((a,b)=>b.score-a.score||a.title.localeCompare(b.title,'sv'));
}
function managerOffice2VisibleItems(){
  const all=managerOffice2Items();
  return all.filter(item=>item.requiresDecision||!managerOffice2Delegated(item.area)||item.level==='critical').slice(0,5);
}
function managerOffice2Action(item){
  if(item.action?.deal)return `officeOpenDeal(${JSON.stringify(item.action.deal)})`;
  return item.action?deskAction(item.action):'';
}
function managerOffice2Row(item,index){
  const action=managerOffice2Action(item),delegated=managerOffice2Delegated(item.area)&&!item.requiresDecision;
  return `<article class="office2-priority" data-level="${item.level}"><div class="office2-rank">${index+1}</div><div class="office2-copy"><div class="office2-meta"><span>${trainingSafe(item.tag)}</span><span>${trainingSafe(item.owner)}</span></div><strong>${trainingSafe(item.title)}</strong><p>${trainingSafe(item.detail)}</p></div><div class="office2-actions">${action?`<button type="button" class="desk-link" onclick="${trainingSafe(action)}">Öppna${deskIcon('arrow')}</button>`:''}${delegated?'<small>Staben hanterar rutinen</small>':''}</div></article>`;
}
function managerOffice2DelegationView(){
  const labels={training:'Träning',medical:'Medicinskt',scouting:'Scouting',contracts:'Kontrakt'};
  return `<div class="office2-delegation"><span>Staben bevakar · ansvar & bevakning</span>${Object.entries(labels).map(([key,label])=>`<button type="button" aria-pressed="${managerOffice2Delegated(key)}" onclick="managerOffice2ToggleDelegation('${key}')">${label}</button>`).join('')}<small>Träning och medicinskt kan utföra försiktiga rutinåtgärder. Scouting och kontrakt bevakas av staben. Beslut som kräver ditt svar visas alltid.</small></div>`;
}
function managerOffice2View(){
  const all=managerOffice2Items(),items=managerOffice2VisibleItems(),must=all.filter(i=>i.requiresDecision).length;
  return `<section class="office2-command" aria-label="Dagens prioriteringar"><header><div><span class="desk-kicker">MANAGER OFFICE 2.0</span><h2>Dagens prioriteringar</h2><p>${must?`${must} ärende${must===1?'':'n'} kräver ditt svar. `:''}Listan rangordnas efter deadline, matchnärhet, medicinsk risk och klubbpåverkan.</p></div><strong>${items.length}</strong></header><div class="office2-list">${items.map(managerOffice2Row).join('')||'<p class="office-empty">Inga prioriterade ärenden just nu.</p>'}</div>${managerOffice2DelegationView()}</section>`;
}

const managerOfficeViewBeforeOffice2=managerOfficeView;
managerOfficeView=function(){
  const html=managerOfficeViewBeforeOffice2();
  const marker='<div class="office-grid">';
  return html.includes(marker)?html.replace(marker,managerOffice2View()+marker):html;
};