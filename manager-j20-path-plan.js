"use strict";

const J20_PATH_PACES={
  careful:{label:'Försiktig väg',formGames:5,formPpg:.8,aSessions:5,maxFatigue:60,seniorGames:5,seniorMinutes:8},
  balanced:{label:'Balanserad väg',formGames:4,formPpg:.75,aSessions:3,maxFatigue:68,seniorGames:3,seniorMinutes:7},
  fast:{label:'Snabb väg',formGames:3,formPpg:.6,aSessions:2,maxFatigue:72,seniorGames:2,seniorMinutes:5}
};
function managerJ20PathStore(){if(!state.juniors)return {};return state.juniors.pathPlans??={};}
function managerJ20PathPlayer(id){return juniorById(id)||managerRoster().find(p=>samePlayerId(p.id,id)&&p.academy)||null;}
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
  return {form,training,senior,readiness,fatigue:player.fatigue||0,path:player.academy?.path||'junior'};
}
function managerJ20PathStatus(player,plan=managerJ20PathPlan(player)){
  if(!player||!plan)return null;const cfg=J20_PATH_PACES[plan.pace]||J20_PATH_PACES.balanced,e=managerJ20PathEvidence(player),ppg=e.form.games?e.form.points/e.form.games:0;
  const promoted=Boolean(managerSeniorProspectDecision(player))||e.path==='senior';
  const milestones=[
    {key:'j20',label:'J20-underlag',done:promoted||e.form.games>=cfg.formGames&&ppg>=cfg.formPpg,detail:`${e.form.games}/${cfg.formGames} matcher · ${ppg.toFixed(2)}/${cfg.formPpg.toFixed(2)} p/match`},
    {key:'training',label:'A-träningsunderlag',done:promoted||(e.training?.sessions||0)>=cfg.aSessions,detail:`${e.training?.sessions||0}/${cfg.aSessions} A-pass · ork ${Math.round(100-e.fatigue)} %`},
    {key:'trial',label:'A-lagsprov',done:e.senior.games>=cfg.seniorGames,detail:`${e.senior.games}/${cfg.seniorGames} matcher · ${Math.round(e.senior.seconds/60)} min`},
    {key:'role',label:'Etablering',done:e.senior.games>=cfg.seniorGames&&e.senior.avgMinutes>=cfg.seniorMinutes,detail:`${e.senior.avgMinutes.toFixed(1)}/${cfg.seniorMinutes.toFixed(1)} min i snitt`}
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
  return {player,plan,cfg,e,milestones,next,reason,complete:milestones.every(m=>m.done)};
}
function managerJ20PathCandidate(){
  const training=managerJ20TrainingFollowup()?.player,senior=managerSeniorProspectFollowup()?.player,review=managerJ20Review()?.best;
  return training||senior||review||null;
}
function managerJ20PathMarkPromotion(player,plan){
  const store=state.juniors.managerDecisions??={},date=state.calendar?.date||null,key=`path-promote:${date}:${player.id}`,form=managerJ20RecentForm(player);
  store[key]={action:'promote',playerId:player.id,playerName:player.name,matchDate:null,decisionDate:date,readiness:'Utvecklingsplan',formGames:form.games,formPoints:form.points,pathPace:plan.pace};
  plan.promotedDate=date;plan.updatedDate=date;
}
function managerJ20PathAction(id,action){
  const player=managerJ20PathPlayer(id),status=managerJ20PathStatus(player);if(!player||!status||juniorLocked())return false;
  if(action==='guest'&&player.academy?.path==='junior'){player.academy.path='guest';save();render();return true;}
  if(action==='junior'&&player.academy?.path==='guest'){player.academy.path='junior';save();render();return true;}
  if(action==='light'){player.trainingLoad='light';save();render();return true;}
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
  return `<section class="manager-day-preview j20-review j20-path" aria-label="Utvecklingsväg junior"><div><span class="desk-kicker">UTVECKLINGSVÄG · ${trainingSafe(player.name)} · ${trainingSafe(pace.label)}</span><strong>${trainingSafe(s.next)}</strong><p>${trainingSafe(s.reason)}</p><div class="j20-path-milestones">${milestones}</div></div><div class="manager-life-actions j20-decision">${action}<button class="desk-link" onclick='managerJ20PathSet(${id},"careful")'>Försiktig</button><button class="desk-link" onclick='managerJ20PathSet(${id},"balanced")'>Balanserad</button><button class="desk-link" onclick='managerJ20PathSet(${id},"fast")'>Snabb</button></div></section>`;
}

const managerJ20PathMorningBase=managerLifeMorningView;
managerLifeMorningView=function(){return managerJ20PathMorningBase()+managerJ20PathView();};
