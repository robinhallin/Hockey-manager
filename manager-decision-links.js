"use strict";
// Shared read models connect existing domain actions; no simulation or automatic offers.
function managerLinkedDecisionItems(){
 const date=state.calendar.date,club=managerClub();
 const proposals=(state.office2?.proposals||[]).filter(p=>p.club===club&&p.status==='pending'&&p.target>=date&&!(p.area==='training'&&p.target===date)).map(p=>({id:'staff-proposal:'+p.id,title:STAFF_MANDATES[p.area].name+': ta ställning',detail:p.text,due:p.target,owner:'Du',tag:'Stabsförslag',area:p.area,requiresDecision:true,level:p.target===date?'high':'medium',score:75,action:{page:'staffReview'}}));
 const next=(state.office2?.seasonActions||[]).filter(p=>p.club===club&&!p.closed).map(p=>({id:'season-action:'+p.id,title:p.title,detail:p.next,owner:'Du',tag:'Från säsongsutvärdering',area:p.area,level:'medium',score:60,action:{page:'season'}}));
 return [...proposals,...next,...boardDialogueItems()];
}
function managerLinkedDecisionOutcome(id){
 if(id.startsWith('board-dialogue:'))return boardDialogueStore()?.requests.find(r=>'board-dialogue:'+r.id===id&&r.club===managerClub())?.outcome;
 const p=(state.office2?.proposals||[]).find(p=>'staff-proposal:'+p.id===id&&p.club===managerClub());
 if(p)return p.outcome||({accepted:'Godkänt. Staben följer upp genomförandet.',declined:'Avböjt av tränaren.',expired:'Förslaget har löpt ut.',replaced:'Ersatt av nyare förslag.',followed:'Uppföljt.'}[p.status]);
 const a=(state.office2?.seasonActions||[]).find(p=>'season-action:'+p.id===id&&p.club===managerClub());return a?.closed?'Granskat av tränaren. Inga avtal eller truppändringar genomfördes automatiskt.':null;
}
function clubDecisionIssue(plan){
 if(plan.end<=state.calendar.date)return 'Planperioden har avslutats.';
 const p=squadScenarioPlayer(plan.playerId);if(!p)return 'Spelaren är inte längre tillgänglig.';
 if(playerLoan(p)||p.futureContract||(state.recruitment?.deals||[]).some(d=>d.status==='pending'&&samePlayerId(d.playerId,p.id)))return 'Avtalsläget har ändrats: lån, framtida avtal eller pågående bud. Uppdatera antagandet.';
 if(plan.baseline&&plan.baseline!==clubDecisionBaseline(p))return 'Klubb eller kontraktsvillkor har ändrats. Uppdatera antagandet.';
 if(!plan.baseline&&!clubDecisionCandidates().some(p=>samePlayerId(p.id,plan.playerId)))return 'Äldre antagande behöver bekräftas i det aktuella urvalet.';
 return '';
}
function clubDecisionBaseline(p){return JSON.stringify([getPlayerClub(p.id),p.salary||0,p.contractYears||0,p.promisedRole||null]);}
function clubDecisionDraft(id){
 const plan=state.clubOffice.decisionContracts?.find(p=>samePlayerId(p.playerId,id));
 if(!plan||clubDecisionIssue(plan)||clubLocked()||!managerEmployed())return false;
 // Future-start assumptions must never silently become immediate contracts.
 const p=squadScenarioPlayer(id),future=plan.start>state.calendar.date,years=Math.max(1,Math.min(5,Number(plan.end.slice(0,4))-state.season.year-(future?1:0)));
 if(future&&(isOwnPlayer(p)||p.contractYears!==1||naActive(p)||state.season.phase==='preseason'||plan.fee!==0||plan.start!==`${state.season.year+1}-08-01`)){clubNotice('Framtida start kan bara öppnas som förhandsavtal för en extern spelare med ett år kvar, utan avgift, under pågående säsong. Planen behålls oförändrad.');return false;}
 if(isOwnPlayer(p)){
  if(p.renewalDraft)return clubNotice('Det finns redan ett förlängningsutkast. Granska eller avbryt det först.');
  selectPlayer(p.id);openContractNegotiation(p.id);if(!samePlayerId(state.contractNegotiation?.playerId,p.id))return false;
  p.renewalDraft={club:managerClub(),salary:String(plan.salary),years:String(years),role:p.promisedRole||'Rotation'};
 }else{
  if(state.transferNegotiation)return clubNotice('Ett köpbud är redan öppet. Granska eller avsluta utkastet först.');
  state.transferNegotiation={playerId:p.id,transferFee:worldIsFree(p.id)?0:plan.fee,salaryDemand:plan.salary,years,kind:future?'future':'immediate'};
  deskNavigate('transfers','search');state.recruitment.filters={country:'ALL',profile:'ALL',availability:'all',maxAge:60,maxFee:1000000000,query:p.name,attribute:'',minAttribute:0};recruitHub.market='all';recruitHub.page=0;recruitHub.player=p.id;recruitHub.drawer='player';recruitHub.panel=future?'future':'transfer';
 }
 save();render();return true;
}
function clubDecisionWorkflowView(){
 return `<section class="cd-panel"><h3>Från plan till förhandling</h3><p>Prognosen räknas från dagens kassa. Ett passerat, osignerat startdatum flyttas till i dag i beräkningen; engångsavgiften ligger då i första månaden. Inga historiska kostnader bokförs. Slutdatumet behålls.</p>${(state.clubOffice.decisionContracts||[]).map(p=>{const issue=clubDecisionIssue(p);return `<p>${playerReference(p.playerId,p.name)} · ${trainingSafe(issue||'Aktivt antagande')}${!issue?` <button class="desk-link" onclick='clubDecisionDraft(${trainingSafe(JSON.stringify(p.playerId))})'>Öppna avtalsutkast</button>`:''}</p>`;}).join('')}<p>Utkast reserverar inga pengar. Granska roll, registrering och startvillkor innan du skickar något. Förhandsavtal öppnas bara när den planerade starten och befintliga registreringsregler tillåter det.</p></section>`;
}
function squadDecisionImpact(p,mode='arrival',role='Ordinarie'){
 const group=worldGroup(p),depart=mode==='departure',peers=managerRoster().filter(q=>!samePlayerId(q.id,p.id)&&worldGroup(q)===group),ready=peers.filter(medicalReady),target=group==='MV'?2:group==='B'?6:12;
 const juniors=managerJ20PathPlayers().filter(q=>!samePlayerId(q.id,p.id)&&worldGroup(q)===group&&!isOwnPlayer(q)&&!managerJ20PathLoan(q));
 const placement=!depart?squadPlacementPlan(p):null,displaced=placement?managerRoster().find(q=>samePlayerId(q.id,placement.displaced)):null;
 return {depart,ready:ready.length,target,placement,displaced,peers:peers.map(q=>({p:q,promises:lockerPlayerPromises(q).length,role:q.promisedRole||'Rotation',affected:depart||SQUAD_ROLES.indexOf(role)>=SQUAD_ROLES.indexOf(q.promisedRole||'Rotation')})),juniors};
}
function squadDecisionImpactView(p,mode='arrival',role='Ordinarie'){
 if(!p)return '';const s=squadDecisionImpact(p,mode,role);
 return `<section class="sc-card"><h3>Vilka påverkas i din trupp?</h3><p>${s.depart?`Om ${trainingSafe(p.name)} lämnar återstår ${s.ready} tillgängliga spelare i positionsgruppen, jämfört med riktmärket ${s.target}. ${s.ready<s.target?'Täckningen behöver lösas före beslut.':'Antalet räcker; kvalitet och roller behöver ändå granskas.'}`:`${trainingSafe(p.name)} konkurrerar om ${trainingSafe(role.toLowerCase())} ansvar. Detta är en konsekvensbedömning, inte ett automatiskt byte av kedjor eller löften.`}</p>${s.displaced?`<p>Tänkt plats: ${trainingSafe(s.placement.label||s.placement.type)}. ${playerReference(s.displaced.id,s.displaced.name)} står på platsen i din sparade truppplan. Planen ändrar inte uttagningen.</p>`:''}${s.peers.filter(r=>r.affected||r.promises).map(r=>`<p>${playerReference(r.p.id,r.p.name)} · ${trainingSafe(r.role)}${r.promises?' · '+r.promises+' aktiva löften att skydda':''} · ${s.depart?'möjlighet till mer ansvar':'konkurrensen behöver följas upp'}</p>`).join('')||'<p>Ingen tydlig rollkonflikt i den nuvarande gruppen.</p>'}<p>Juniorvägar: ${s.juniors.map(q=>playerReference(q.id,q.name)).join(', ')||'Ingen aktuell junior i samma positionsgrupp'}. ${s.depart?'En öppning är inte samma sak som att junioren är redo.':'Granska beredskap och alternativ istid innan en plats blockeras.'}</p></section>`;
}
function seasonDecisionRows(){
 const rows=[],club=managerClub(),year=state.season.year;
 const add=(id,title,evidence,next,area,playerId=null)=>rows.push({id:`${year}:${id}`,club,year,title,evidence,next,area,playerId});
 for(const r of state.managerFeedback?.followups||[])if(r.club===club&&r.year===year)add('arrival:'+r.id,'Värvning: '+r.name,`${r.profile}: ursprunglig brist ${r.before}, senaste bedömning ${r.after}. ${r.games} bedömda matcher, ${Math.round(r.seconds/60)} minuter. ${r.result||'Introduktionen är inte slutbedömd.'}`,r.status==='complete'&&r.used>=3?'':'Granska roll och fortsatt användning.','transfers',r.playerId);
 for(const p of managerJ20PathPlayers()){const plan=managerJ20PathPlan(p),s=plan&&managerJ20PathStatus(p,plan);if(s)add('junior:'+p.id,'Utvecklingsväg: '+p.name,`${J20_PATH_PACES[plan.pace]?.label||'Balanserad väg'}. ${s.next}. ${s.reason}`,s.complete?'':'Följ utvecklingsvägen och välj nästa steg.','juniors',p.id);}
 for(const l of [...(state.loans?.active||[]),...(state.loans?.history||[])])if(l.owner===club&&(l.returned||l.until||'')>=`${year}-08-01`)add('loan:'+l.id,'Lån: '+l.name,`Avtalad roll: ${LOAN_ROLES[l.role]||'Äldre lån, roll saknas'}. ${l.developmentReview?.text||loanDevelopmentReview(l)}`,l.returned?'Bedöm rollen efter återkomsten.':'Följ istiden och planera återkomsten.','transfers',l.playerId);
 for(const s of state.staff||[])add('staff:'+s.personId,'Personal: '+s.name,`${CLUB_ROLES[s.id]} · ${money(s.salary||0)}/år. Träning ${s.coaching}/20, bedömning ${s.ability}/20. Individuellt effektmål saknas; resultat tillskrivs inte personen automatiskt.`,s.expires&&s.expires<=year+1?'Granska utgående personalavtal.':'','staff');
 const project=clubProjectState();add('project',CLUB_PRIORITIES[project.id]?.name||'Klubbprojekt',`Registrerad mognad: ${project.maturity||0} %. Ingen isolerad mätning av projektets resultat finns.`,'Välj nästa säsongs inriktning utifrån ekonomi och truppbehov.','board');
 for(const r of boardDialogueStore()?.requests||[])if(r.club===club&&r.year===year)add('board:'+r.id,'Styrelsedialog: '+BOARD_REQUESTS[r.kind].name,`${r.evidence} ${r.outcome||'Ingen slutbedömning.'}`,['pending','offered','active'].includes(r.status)?'Granska styrelsens villkor och nästa avstämning.':'','board');
 return rows.slice(0,100);
}
function seasonDecisionCarry(year){
 if(clubLocked()||!managerEmployed())return false;const record=state.season.archive.find(r=>r.year===Number(year)&&r.club===managerClub());if(!record?.decisions)return false;
 const o=managerOffice2Ensure();o.seasonActions??=[];
 for(const r of record.decisions.filter(r=>r.next)){if(o.seasonActions.length<100&&!o.seasonActions.some(a=>a.club===r.club&&(a.id===r.id||!a.closed&&a.id.split(':').slice(1).join(':')===r.id.split(':').slice(1).join(':'))))o.seasonActions.push({...r,carried:state.calendar.date,closed:null});}
 managerAgendaReconcile();save();render();return true;
}
function seasonDecisionClose(id){const a=state.office2?.seasonActions?.find(a=>a.id===id&&a.club===managerClub());if(!a||a.closed||clubLocked()||!managerEmployed())return false;a.closed=state.calendar.date;managerAgendaReconcile();save();render();return true;}
function seasonDecisionView(){
 const record=state.season.archive.find(r=>r.club===managerClub()&&r.decisions),rows=record?.decisions||[],actions=(state.office2?.seasonActions||[]).filter(a=>a.club===managerClub()&&!a.closed);
 if(!rows.length&&!actions.length)return '';
 return `<section class="season-review"><h2>Beslutens utfall & nästa säsong</h2><p>Fakta jämförs med sparade mål där underlag finns. Saknade mål och ofullständiga perioder bedöms inte som misslyckanden.</p><details><summary>Sparat beslutsunderlag · ${record?seasonLabel(record.year):''}</summary>${rows.map(r=>`<article><h3>${trainingSafe(r.title)}</h3><p>${trainingSafe(r.evidence)}</p><p>${trainingSafe(r.next||'Ingen öppen uppföljning i detta underlag.')}</p></article>`).join('')}${rows.length?`<button class="btn" onclick="seasonDecisionCarry(${record.year})">För över öppna frågor till beslutslistan</button>`:''}</details><p>Högst 100 överförda frågor sparas; befintliga frågor tas aldrig bort vid ny överföring.</p><h3>Överförda frågor · ${actions.length}</h3>${actions.map(a=>`<p>${trainingSafe(a.title)} · ${trainingSafe(a.next)} <button class="desk-link" onclick="deskNavigate('${a.area}')">Granska</button><button class="desk-link" onclick='seasonDecisionClose(${trainingSafe(JSON.stringify(a.id))})'>Markera granskat</button></p>`).join('')}</section>`;
}
const decisionFinanceView=clubCashflowView;
clubCashflowView=function(){return decisionFinanceView()+clubDecisionWorkflowView();};
const decisionTransferForm=hubTransferForm;
hubTransferForm=function(p){return decisionTransferForm(p)+squadDecisionImpactView(p,'arrival',scoutingContactKnown(p)?.role||'Rotation');};
const decisionLoanForm=hubLoanForm;
hubLoanForm=function(p){return decisionLoanForm(p)+squadDecisionImpactView(p,isOwnPlayer(p)?'departure':'arrival');};
const decisionIncomingView=incomingDealView;
incomingDealView=function(o){return decisionIncomingView(o)+squadDecisionImpactView(marketPlayer(o.playerId),'departure');};
const decisionSeasonView=seasonView;
seasonView=function(){return decisionSeasonView()+seasonDecisionView();};
