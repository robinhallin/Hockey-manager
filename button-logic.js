"use strict";
// Availability mirrors existing domain guards; it never authorizes a blocked mutation.
function deskActionReason(action,id,choice){
 const live=Boolean(state.live&&!state.live.finished),p=id!==undefined?findPlayerAnywhere(id):null;
 const between=['openContractNegotiation','submitContractRenewal','submitRecruitOffer','acceptRecruitCounter','loanSubmit','loanAnswer','loanRecall','clubSign','clubSetPolicy','juniorPromote','juniorReturn','juniorLoan','juniorRecall','juniorRelease'];
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
  if((state.scoutReports[String(id)]?.visits||0)>=3)return 'Spelaren är redan grundligt scoutad med tre observationer.';
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
  page.insertBefore(info,page.querySelector('.desk-subnav')?.nextSibling||page.firstChild);
 }
 if(deskActionNotice){const note=document.createElement('p');note.className='desk-action-notice';note.setAttribute('role','status');note.textContent=deskActionNotice;page.insertBefore(note,page.firstChild);}
}
function resetRecruitFilters(){state.recruitment.filters={country:'ALL',profile:'ALL',availability:'all',maxAge:60,maxFee:50000000,query:'',attribute:'',minAttribute:10};queueInterfaceSave();render();}

function applyRecruitSearch(){const input=document.getElementById('recruit-query');if(input)setRecruitFilter('query',input.value);}
