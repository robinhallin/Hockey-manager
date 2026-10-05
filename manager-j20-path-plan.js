"use strict";

const J20_PATH_PACES={
  careful:{label:'Försiktig väg',formGames:5,formPpg:.8,aSessions:5,maxFatigue:60,seniorGames:5,seniorMinutes:8},
  balanced:{label:'Balanserad väg',formGames:4,formPpg:.75,aSessions:3,maxFatigue:68,seniorGames:3,seniorMinutes:7},
  fast:{label:'Snabb väg',formGames:3,formPpg:.6,aSessions:2,maxFatigue:72,seniorGames:2,seniorMinutes:5}
};
function managerJ20PathStore(){if(!state.juniors)return {};return state.juniors.pathPlans??={};}
function managerJ20PathPlayers(){return [...new Map([...juniorPlayers(),...managerRoster().filter(p=>p.academy),...(state.loans?.active||[]).filter(l=>l.owner===managerClub()).map(loanPlayer).filter(p=>p?.academy)].map(p=>[String(p.id),p])).values()];}
let managerJ20PathSelected=null;
function managerJ20PathPlayer(id){return managerJ20PathPlayers().find(p=>samePlayerId(p.id,id))||null;}
function managerJ20PathSelect(id){managerJ20PathSelected=id;render();}
function managerJ20PathLoan(player){
 const real=playerLoan(player);if(real&&real.owner===managerClub())return {kind:'Klubblån',destination:real.borrower,games:real.games||0,seconds:real.seconds||0,until:real.until,review:loanDevelopmentReview(real)};
 const loan=player.academy?.loan;return loan?{kind:'Utvecklingslån',destination:JUNIOR_LOANS[loan.destination]?.name||loan.destination,games:loan.games||0,seconds:loan.seconds||0,remaining:loan.remaining}:null;
}
function managerJ20PathSet(id,pace='balanced'){
  const player=managerJ20PathPlayer(id),config=J20_PATH_PACES[pace];if(!player||!config||juniorLocked())return false;
  const store=managerJ20PathStore(),old=store[String(player.id)]||{};
  store[String(player.id)]={...old,playerId:player.id,playerName:player.name,pace,createdDate:old.createdDate||state.calendar?.date||null,updatedDate:state.calendar?.date||null,target:'senior-role'};
  managerMessage(`j20-path:${player.id}:${state.calendar?.date}`,'Utvecklingsväg satt',`${player.name}: ${config.label}. Staben följer J20-form, A-träning, belastning och faktisk A-lagsistid mot samma plan.`,'Junioransvarig',{link:'juniors'});
  save();render();return true;
}
function managerJ20PathPlan(player){return state.juniors?.pathPlans?.[String(player?.id)]||null;}
function managerJ20PathSeniorStats(player){
  const decision=managerSeniorProspectDecision(player);if(!decision)return {games:0,seconds:0,goals:0,assists:0,avgMinutes:0,debut:null,teamGames:0};
  const matches=(state.analysis?.matches||[]).filter(m=>m.finished&&!m.abandoned&&m.club===managerClub()&&m.date>=decision.decisionDate).sort((a,b)=>a.date.localeCompare(b.date));
  const rows=matches.map(match=>({match,row:(match.players||[]).find(r=>samePlayerId(r.id,player.id))})).filter(x=>x.row?.seconds>0);
  const totals=rows.reduce((o,x)=>({games:o.games+1,seconds:o.seconds+(x.row.seconds||0),goals:o.goals+(x.row.goals||0),assists:o.assists+(x.row.assists||0)}),{games:0,seconds:0,goals:0,assists:0});
  return {...totals,avgMinutes:totals.games?totals.seconds/60/totals.games:0,debut:rows[0]?.match?.date||null,teamGames:matches.length};
}
function managerJ20PathEvidence(player){
  const form=managerJ20RecentForm(player,5),training=state.juniors?.aTraining?.[String(player.id)]||null,senior=managerJ20PathSeniorStats(player),readiness=player.academy?.path==='senior'?null:managerJ20Readiness(player);
  return {form,training,senior,readiness,loan:managerJ20PathLoan(player),fatigue:player.fatigue||0,path:player.academy?.path||'junior'};
}
function managerJ20PathMatchEvidence(player,form,cfg){
  const minutes=form.games?form.seconds/60/form.games:0,goalie=player.pos==='MV',defender=player.pos==='B';
  // The J20 simulation records ice time, goals and assists, not reliable save/defence rates.
  // Use meaningful exposure for defensive roles; never invent unrecorded performance.
  const target=goalie?30:10,ppg=form.games?form.points/form.games:0;
  return {done:form.games>=cfg.formGames&&(goalie||defender?minutes>=target:ppg>=cfg.formPpg),detail:`${form.games}/${cfg.formGames} matcher · ${goalie||defender?`${minutes.toFixed(1)}/${target} min i snitt · ${goalie?'målvaktsunderlag':'backunderlag'}`:`${ppg.toFixed(2)}/${cfg.formPpg} p/match`}`};
}
function managerJ20PathStatus(player,plan=managerJ20PathPlan(player)){
  if(!player||!plan)return null;const cfg=J20_PATH_PACES[plan.pace]||J20_PATH_PACES.balanced,e=managerJ20PathEvidence(player);
  const promoted=Boolean(managerSeniorProspectDecision(player))||e.path==='senior';
  const matchEvidence=managerJ20PathMatchEvidence(player,e.form,cfg),trainingSessions=managerJ20TrainingSessions(e.training),seniorMinutes=player.pos==='MV'?30:cfg.seniorMinutes;
  const milestones=[
    {key:'j20',label:'J20-underlag',done:promoted||matchEvidence.done,detail:matchEvidence.detail},
    {key:'training',label:'A-träningsunderlag',done:promoted||trainingSessions>=cfg.aSessions,detail:`${trainingSessions}/${cfg.aSessions} deltagna A-pass · ork ${Math.round(100-e.fatigue)} %`},
    {key:'trial',label:'A-lagsprov',done:e.senior.games>=cfg.seniorGames,detail:`${e.senior.games}/${cfg.seniorGames} matcher · ${Math.round(e.senior.seconds/60)} min`},
    {key:'role',label:'Etablering',done:e.senior.games>=cfg.seniorGames&&e.senior.avgMinutes>=seniorMinutes,detail:`${e.senior.avgMinutes.toFixed(1)}/${seniorMinutes.toFixed(1)} min i snitt`}
  ];
  let next='Fortsätt samla underlag',reason='Planen följer spelarens faktiska utveckling.';
  if(e.fatigue>cfg.maxFatigue){next='Sänk belastningen';reason=`Belastningen ligger över planens gräns (${Math.round(e.fatigue)} > ${cfg.maxFatigue}).`;}
  else if(e.path==='junior'&&!milestones[0].done){next='Bygg J20-form';reason='J20-underlaget är ännu inte stabilt nog för nästa steg i den valda planen.';}
  else if(e.path==='junior'&&milestones[0].done){next='Ge A-träning';reason='J20-milstolpen är klar. Nästa kontrollerade steg är A-träning.';}
  else if(e.path==='guest'&&!milestones[1].done){next='Fortsätt A-träning';reason='Samla fler A-pass innan nytt truppbeslut.';}
  else if(e.path==='guest'&&milestones[1].done&&e.readiness?.level==='Fortsatt J20-utveckling'){next='Åter till J20-fokus';reason='A-träningsunderlaget är klart men seniorberedskapen har inte följt med.';}
  else if(e.path==='guest'&&milestones[1].done){next='Pröva A-laget';reason=`A-träningsmilstolpen är klar och bedömningen är ${e.readiness?.level||'positiv'}.`;}
  else if(e.path==='senior'&&!milestones[2].done){next='Ge faktisk A-lagsistid';reason='Uppflyttningen behöver följas av riktiga seniorframträdanden.';}
  else if(e.path==='senior'&&!milestones[3].done){next='Bygg en hållbar seniorroll';reason='A-lagsprovet är genomfört, men istiden är ännu under etableringsmålet.';}
  else if(e.path==='senior'&&milestones[3].done){next='Etablerad enligt planen';reason='Samtliga planmål är uppnådda med faktisk senioristid.';}
  const competition=managerRoster().filter(p=>!samePlayerId(p.id,player.id)&&loanGroup(p)===loanGroup(player)&&medicalReady(p)).length;
  if(e.loan){next='Följ lånets faktiska istid';reason=`${e.loan.kind}: ${e.loan.destination}. ${e.loan.games} matcher · ${e.loan.games?(e.loan.seconds/60/e.loan.games).toFixed(1):'0.0'} min/match. ${e.loan.until?'Till '+calText(e.loan.until):e.loan.remaining+' matchomgångar kvar'}. Låneistid räknas inte som A-lagsprov i moderklubben.`;milestones.push({key:'loan',label:'Låneuppföljning',done:false,detail:e.loan.games?'Utvärdera roll och istid före återkomst':'Inget matchunderlag ännu'});}
  else if(e.path==='senior'&&!milestones[3].done)reason+=` ${competition} tillgängliga spelare konkurrerar i samma positionsgrupp. Överväg lån om faktisk istid saknas.`;
  if(e.loan?.review)reason+=' '+e.loan.review;
  return {player,plan,cfg,e,milestones,next,reason,competition,complete:!e.loan&&milestones.every(m=>m.done)};
}
function managerJ20PathCandidate(){
  const training=managerJ20TrainingFollowup()?.player,senior=managerSeniorProspectFollowup()?.player,review=managerJ20Review()?.best;
  return managerJ20PathPlayer(managerJ20PathSelected)||training||senior||review||managerJ20PathPlayers()[0]||null;
}
function managerJ20PathMarkPromotion(player,plan){
  const store=state.juniors.managerDecisions??={},date=state.calendar?.date||null,key=`path-promote:${date}:${player.id}`,form=managerJ20RecentForm(player);
  store[key]={action:'promote',playerId:player.id,playerName:player.name,matchDate:null,decisionDate:date,readiness:'Utvecklingsplan',formGames:form.games,formPoints:form.points,pathPace:plan.pace};
  plan.promotedDate=date;plan.updatedDate=date;
}
function managerJ20PathAction(id,action){
  const player=managerJ20PathPlayer(id),status=managerJ20PathStatus(player);if(!player||!status||juniorLocked()||status.e.loan)return false;
  if(action==='guest'&&player.academy?.path==='junior'){player.academy.path='guest';save();render();return true;}
  if(action==='junior'&&player.academy?.path==='guest'){player.academy.path='junior';save();render();return true;}
  if(action==='light'){if(juniorById(id))juniorSet(id,'load','light');else setIndividualLoad(id,'light');return true;}
  if(action==='promote'&&player.academy?.path==='guest'){
    const plan=managerJ20PathPlan(player);juniorPromote(player.id);
    const promoted=managerRoster().find(p=>samePlayerId(p.id,id)&&p.academy?.path==='senior');
    if(!promoted)return false;if(plan)managerJ20PathMarkPromotion(promoted,plan);save();render();return true;
  }
  return false;
}
function managerJ20PathView(){
  const player=managerJ20PathCandidate();if(!player)return '';
  const plan=managerJ20PathPlan(player),id=JSON.stringify(String(player.id));
  if(!plan)return `<section class="manager-day-preview j20-review" aria-label="Utvecklingsväg junior"><div><span class="desk-kicker">UTVECKLINGSVÄG · ${trainingSafe(player.name)}</span><strong>Sätt en långsiktig plan</strong><p>Välj hur försiktigt klubben ska flytta spelaren från J20 mot A-laget. Planen använder bara verklig form, träning, belastning och A-lagsistid.</p></div><div class="manager-life-actions j20-decision"><button class="desk-link" onclick='managerJ20PathSet(${id},"careful")'>Försiktig</button><button class="btn" onclick='managerJ20PathSet(${id},"balanced")'>Balanserad</button><button class="desk-link" onclick='managerJ20PathSet(${id},"fast")'>Snabb</button></div></section>`;
  const s=managerJ20PathStatus(player,plan),pace=J20_PATH_PACES[plan.pace]||J20_PATH_PACES.balanced;
  const milestones=s.milestones.map(m=>`<span class="${m.done?'done':'pending'}"><b>${m.done?'✓':'○'} ${trainingSafe(m.label)}</b><small>${trainingSafe(m.detail)}</small></span>`).join('');
  let action='';if(s.next==='Sänk belastningen'&&player.trainingLoad!=='light')action=`<button class="desk-link" onclick='managerJ20PathAction(${id},"light")'>Lättare belastning</button>`;else if(s.next==='Ge A-träning')action=`<button class="btn" onclick='managerJ20PathAction(${id},"guest")'>Starta A-träning</button>`;else if(s.next==='Åter till J20-fokus')action=`<button class="desk-link" onclick='managerJ20PathAction(${id},"junior")'>Till J20-fokus</button>`;else if(s.next==='Pröva A-laget')action=`<button class="btn" onclick='managerJ20PathAction(${id},"promote")'>Flytta upp</button>`;
  if(s.e.loan)action+=`<button class="desk-link" onclick="deskNavigate('${s.e.loan.kind==='Klubblån'?'transfers':'juniors'}'${s.e.loan.kind==='Klubblån'?",'loans'":''})">Granska lånet</button>`;
  else if(s.e.path==='senior'&&!s.complete)action+=`<button class="desk-link" onclick='loanOpen(${id})'>Jämför lånealternativ</button>`;
  return `<section class="manager-day-preview j20-review j20-path" aria-label="Utvecklingsväg junior"><div><span class="desk-kicker">UTVECKLINGSVÄG · ${trainingSafe(player.name)} · ${trainingSafe(pace.label)}</span><strong>${trainingSafe(s.next)}</strong><p>${trainingSafe(s.reason)}</p><div class="j20-path-milestones">${milestones}</div></div><div class="manager-life-actions j20-decision">${action}<button class="desk-link" onclick='managerJ20PathSet(${id},"careful")'>Försiktig</button><button class="desk-link" onclick='managerJ20PathSet(${id},"balanced")'>Balanserad</button><button class="desk-link" onclick='managerJ20PathSet(${id},"fast")'>Snabb</button></div></section>`;
}

const managerJ20PathMorningBase=managerLifeMorningView;
managerLifeMorningView=function(){const selected=managerJ20PathCandidate();return managerJ20PathMorningBase()+`<label>Följ utvecklingsväg <select aria-label="Spelare i utvecklingsplan" onchange="managerJ20PathSelect(this.value)">${managerJ20PathPlayers().map(p=>`<option value="${trainingSafe(String(p.id))}" ${samePlayerId(p.id,selected?.id)?'selected':''}>${trainingSafe(p.name)}${managerJ20PathLoan(p)?' · utlånad':''}</option>`).join('')}</select></label>`+managerJ20PathView();};
