"use strict";
// Availability mirrors existing domain guards; it never authorizes a blocked mutation.
function deskActionReason(action,id,choice){
 const live=Boolean(state.live&&!state.live.finished),p=id!==undefined?findPlayerAnywhere(id):null;
 const between=['requestScoutReport','openContractNegotiation','submitContractRenewal','submitRecruitOffer','acceptRecruitCounter','loanSubmit','loanAnswer','loanRecall','clubSign','clubSetPolicy','juniorPromote','juniorReturn','juniorLoan','juniorRecall','juniorRelease'];
 if(live&&(between.includes(action)||action==='answerIncomingOffer'&&choice!==false))return 'Avsluta den pågående matchen innan du ändrar avtal, ekonomi eller spelartrupp.';
 if(['openContractNegotiation','submitContractRenewal'].includes(action)){
  if(!p||!isOwnPlayer(p))return 'Spelaren finns inte i din trupp.';
  if(playerLoan(p))return 'Låneavtalet hanteras i lånecentralen; spelarens kontrakt tillhör ägarklubben.';
  if(p.futureContract)return 'Spelaren har redan ett bindande avtal med nästa klubb.';
  if(p.renewalPausedUntil&&p.renewalPausedUntil>state.calendar.date)return `Agenten återupptar diskussionen ${calText(p.renewalPausedUntil)}.`;
 }
 if(action==='toggleTransferStatus'&&p&&playerLoan(p))return 'En lånad spelare kan inte transferlistas. Hantera lånet i lånecentralen.';
 if((action==='submitRecruitOffer'||action==='answerIncomingOffer'&&choice!==false)&&!calendarWindowOpen())return 'Transferfönstret är stängt. Scouting och avtal inför nästa säsong är fortfarande tillgängliga.';
 if(action==='createScoutMission'){
  if(scoutActiveCount()>=clubMissionLimit())return 'Alla scoutuppdrag är upptagna. Invänta en rapport eller avsluta ett uppdrag under Scouting.';
  if(state.money-clubForecast().reserved<clubMissionFee())return `Scoutuppdraget kräver ${money(clubMissionFee())} i ledigt budgetutrymme.`;
  if(!recruitCandidates().some(p=>(state.scoutReports[String(p.id)]?.visits||0)<3&&!scoutPending(p.id)))return 'Inga nya kandidater kan scoutas med dessa filter. Återställ filtren eller invänta pågående rapporter.';
 }
 if(action==='requestScoutReport'&&p){
  if(scoutPending(id))return 'En scoutrapport är redan beställd. Beskedet kommer i inkorgen.';
  if(!scoutNeedsObservation(p))return 'Spelaren har en aktuell rapport. En uppdatering kan beställas efter 60 dagar.';
 }
 if(action==='clubRenew'){
  const staff=state.staff.find(s=>s.id===id);
  if(staff?.expires>clubYear()+1)return 'Personalavtal kan förlängas under den sista avtalssäsongen.';
 }
 if(['lineupPlace','specialPlace'].includes(action)){
  if(hockeyChangeBlocked())return 'Icing: spelarbyten är låsta till nästa nedsläpp.';
  if(action==='lineupPlace'&&!lineupUI.slot)return 'Välj först en position på rinken.';
  if(p&&!medicalAvailable(p))return medicalReady(p)?'Spelaren ingår inte i den låsta matchtruppen.':'Spelaren är inte medicinskt tillgänglig för uttagning.';
 }
 return '';
}
function deskActionFeedback(message){deskActionNotice=message;render();}
let deskActionNotice='';
function deskEnhanceButtons(root){
 if(!root?.querySelectorAll||careerScreen)return;
 const explanations=new Set();
 for(const button of root.querySelectorAll('button')){
  const source=button.getAttribute('onclick')||button.closest?.('form')?.getAttribute('onsubmit')||'';
  // Read a literal handler and its first literal argument; never evaluate handler code.
  const call=source.match(/(?:^|;)\s*(?:event\.preventDefault\(\);\s*)?([\w$]+)\(\s*(?:'([^']*)'|"([^"]*)"|(\d+))?/);
  if(button.getAttribute('onclick')&&!button.hasAttribute('type'))button.setAttribute('type','button');
  if(!call)continue;
  const choice=source.match(/,\s*(true|false)\s*\)/)?.[1];
  const reason=deskActionReason(call[1],call[2]??call[3]??call[4],choice===undefined?undefined:choice==='true');
  if(!reason)continue;
  button.disabled=true;button.title=reason;if(!(call[1]==='lineupPlace'&&!lineupUI.slot))button.setAttribute('aria-describedby','desk-action-explanations');button.setAttribute('data-disabled-reason',reason);if(!(call[1]==='lineupPlace'&&!lineupUI.slot))explanations.add(reason);
 }
 const page=root.querySelector('.desk-page');if(!page)return;
 if(explanations.size){
  const info=document.createElement('details');info.id='desk-action-explanations';info.className='desk-action-explanations';
  info.innerHTML=`<summary>Varför är vissa val låsta?</summary>${[...explanations].map(s=>`<p>${trainingSafe(s)}</p>`).join('')}`;
  page.appendChild(info);
 }
 if(deskActionNotice){const note=document.createElement('p');note.className='desk-action-notice';note.setAttribute('role','status');note.textContent=deskActionNotice;page.insertBefore(note,page.firstChild);}
}
function resetRecruitFilters(){state.recruitment.filters={country:'ALL',profile:'ALL',availability:'all',maxAge:60,maxFee:50000000,query:'',attribute:'',minAttribute:10};queueInterfaceSave();render();}

function applyRecruitSearch(){const input=document.getElementById('recruit-query');if(input)setRecruitFilter('query',input.value);}

// Navigation simplification: keep deep tools available contextually, but remove duplicate top-level routes.
DESK_AREAS.splice(0,DESK_AREAS.length,
  {id:'overview',label:'Översikt',icon:'home',pages:[['home','Tränarkontoret']],details:{staffReview:'home',stories:'home'}},
  {id:'team',label:'Laget',icon:'team',pages:[['squad','Trupp'],['lines','Taktik & laguttagning'],['locker','Omklädningsrum']],details:{player:'squad',specialTeams:'lines',tactics:'lines'}},
  {id:'training',label:'Utveckling',icon:'training',pages:[['training','Spelarutveckling'],['juniors','Juniorer'],['medical','Medicinskt team']]},
  {id:'matches',label:'Matcher',icon:'calendar',pages:[['calendar','Kalender'],['statistics','Matchanalys']],details:{match:'calendar',opponents:'calendar',schedule:'calendar',round:'calendar'}},
  {id:'recruitment',label:'Rekrytering',icon:'search',pages:[['transfers','Rekrytering']],details:{marketPlayer:'transfers',scouting:'transfers'}},
  {id:'club',label:'Klubben',icon:'club',pages:[['finance','Ekonomi'],['board','Styrelse'],['staff','Personal'],['manager','Min karriär']]},
  {id:'leagues',label:'Ligorna',icon:'trophy',pages:[['leagues','Ligavärlden'],['table','Tabell'],['leagueStats','Spelarstatistik']],details:{news:'leagues',season:'leagues'}}
);
DESK_RECRUIT_TABS.splice(0,DESK_RECRUIT_TABS.length,['needs','Planering'],['search','Spelare & scouting'],['deals','Affärer']);

const deskAreaMemory={};
let deskAreaMemoryOwner=null;
function deskAreaMemoryReset(){if(deskAreaMemoryOwner!==state){for(const key of Object.keys(deskAreaMemory))delete deskAreaMemory[key];deskAreaMemoryOwner=state;}}
function deskRememberArea(){
  deskAreaMemoryReset();
  const area=deskArea();if(!area)return;
  const canonical=area.details?.[state.page]||state.page;
  if(!area.pages.some(([page])=>page===canonical))return;
  deskAreaMemory[area.id]={page:canonical,tab:area.id==='recruitment'?state.recruitment?.tab:undefined};
}
const deskNavigateBeforeSimplification=deskNavigate;
deskNavigate=function(page,tab,record=true){
  const result=deskNavigateBeforeSimplification(page,tab,record);
  deskRememberArea();
  return result;
};
function deskPrimaryNav(){
  deskRememberArea();
  const area=deskArea();
  return DESK_AREAS.map(a=>{
    const target=deskAreaMemory[a.id]||{page:a.pages[0][0]};
    const tab=target.tab?','+JSON.stringify(target.tab):'';
    return `<button class="nav-item ${area?.id===a.id?'active':''}" ${area?.id===a.id?'aria-current="true"':''} onclick="deskNavigate(${JSON.stringify(target.page)}${tab})"><span class="nav-icon">${deskIcon(a.icon)}</span><span>${a.label}</span></button>`;
  }).join('');
}
function deskSubnav(){
  const area=deskArea(),page=area?.details?.[state.page]||state.page;
  if(area?.id==='recruitment'){
    const tab=state.page==='scouting'?'missions':state.recruitment.tab;
    const active=['loans','history'].includes(tab)?'deals':['missions','shortlist','world','free'].includes(tab)?'search':tab;
    return `<nav class="desk-subnav" aria-label="Rekrytering">${DESK_RECRUIT_TABS.map(([id,label])=>`<button ${active===id?'aria-current="page"':''} onclick="deskNavigate('transfers','${id}')">${label}</button>`).join('')}</nav>`;
  }
  const pages=area?.pages||(['inbox','news'].includes(page)?[['inbox','Inkorg'],['news','Nyheter']]:[]);
  if(pages.length<2)return '';
  return `<nav class="desk-subnav" aria-label="${area?.label||'Meddelanden'}">${pages.map(([id,label])=>`<button ${page===id?'aria-current="page"':''} onclick="deskNavigate('${id}')">${label}</button>`).join('')}</nav>`;
}
