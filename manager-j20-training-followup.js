"use strict";

function managerJ20TrainingProfile(player){
  const role=PLAYER_ROLES[player.academy?.role]||PLAYER_ROLES[juniorRoles(player)[0]];
  return attributeWeighted(ensurePlayerAttributes(player),role);
}
function managerJ20TrainingStore(){
  if(!state.juniors)return {};
  return state.juniors.aTraining??={};
}
function managerJ20TrainingRecord(player,before,session,key){
  if(!player||player.academy?.path!=='guest')return;
  const store=managerJ20TrainingStore(),id=String(player.id),afterProfile=managerJ20TrainingProfile(player);
  const row=store[id]??={playerId:player.id,playerName:player.name,started:state.calendar?.date||null,sessions:0,hardSessions:0,recoverySessions:0,startFatigue:before.fatigue,startProfile:before.profile,lastDate:null,lastKey:null,types:{}};
  row.playerName=player.name;row.sessions++;row.hardSessions+=session?.intensity==='hard'?1:0;row.recoverySessions+=session?.type==='recovery'?1:0;
  row.lastDate=state.calendar?.date||null;row.lastKey=key||null;row.lastFatigue=player.fatigue||0;row.lastProfile=afterProfile;row.profileGain=afterProfile-row.startProfile;row.netFatigue=(player.fatigue||0)-row.startFatigue;
  row.types[session?.type||'unknown']=(row.types[session?.type||'unknown']||0)+1;
  store[id]=row;
}

const managerJ20TrainingBase=juniorTraining;
juniorTraining=function(session,key){
  const guests=(state.juniors?.roster||[]).filter(p=>p.academy?.path==='guest'&&!p.academy?.loan).map(p=>({id:p.id,fatigue:p.fatigue||0,profile:managerJ20TrainingProfile(p)}));
  const result=managerJ20TrainingBase(session,key);
  for(const before of guests){const player=(state.juniors?.roster||[]).find(p=>samePlayerId(p.id,before.id));if(player)managerJ20TrainingRecord(player,before,session,key);}
  return result;
};

function managerJ20TrainingRecommendation(player,row){
  const readiness=managerJ20Readiness(player),gain=row?.profileGain||0,sessions=row?.sessions||0,fatigue=player?.fatigue||0;
  if(fatigue>=75||sessions>=3&&row.netFatigue>=22)return {level:'Sänk belastningen',detail:`Belastningen har blivit för hög under A-träningen. Ork ${Math.round(100-fatigue)} % och ${row.hardSessions||0} hårda pass.`,action:'light',readiness};
  if(sessions>=3&&['A-lagsnära','Aktuell vid truppbehov'].includes(readiness.level)&&fatigue<65)return {level:'Nytt A-lagsbeslut',detail:`${sessions} A-pass genomförda. Profilförändring ${gain>=0?'+':''}${gain.toFixed(2)} och spelaren bedöms ${readiness.level.toLowerCase()}.`,action:'promote',readiness};
  if(sessions>=5&&gain<.15&&readiness.level==='Fortsatt J20-utveckling')return {level:'Mer J20-fokus',detail:`Efter ${sessions} A-pass är utvecklingsprofilen i stort sett oförändrad. Mer match- och träningsansvar i J20 rekommenderas.`,action:'junior',readiness};
  if(sessions>=3)return {level:'Fortsätt A-träning',detail:`${sessions} A-pass är genomförda. Profilförändring ${gain>=0?'+':''}${gain.toFixed(2)} och belastningen är fortfarande hanterbar.`,action:'continue',readiness};
  return {level:'Samlar A-träningsunderlag',detail:`${sessions} A-pass genomförda. Staben vill se minst tre pass innan nästa tydliga rekommendation.`,action:'continue',readiness};
}
function managerJ20TrainingFollowup(){
  const store=state.juniors?.aTraining||{};
  const candidates=(state.juniors?.roster||[]).filter(p=>p.academy?.path==='guest'&&store[String(p.id)]).map(player=>({player,row:store[String(player.id)]})).sort((a,b)=>(b.row.lastDate||'').localeCompare(a.row.lastDate||'')||b.row.sessions-a.row.sessions);
  const entry=candidates[0];if(!entry)return null;
  return {...entry,recommendation:managerJ20TrainingRecommendation(entry.player,entry.row)};
}
function managerJ20TrainingAct(id,action){
  const follow=managerJ20TrainingFollowup();if(!follow||!samePlayerId(follow.player.id,id)||juniorLocked())return false;
  const {player,row}=follow;
  row.decision=action;row.decisionDate=state.calendar?.date||null;
  if(action==='light'){juniorSet(player.id,'load','light');return player.trainingLoad==='light';}
  if(action==='junior'){juniorSet(player.id,'path','junior');return player.academy?.path==='junior';}
  if(action==='promote'){
    juniorPromote(player.id);
    return managerRoster().some(p=>samePlayerId(p.id,id)&&p.academy?.path==='senior');
  }
  if(action==='continue'){save();render();return true;}
  return false;
}
function managerJ20TrainingFollowupView(){
  const follow=managerJ20TrainingFollowup();if(!follow)return '';
  const {player,row,recommendation}=follow,id=JSON.stringify(String(player.id)),gain=row.profileGain||0,warning=['Sänk belastningen','Mer J20-fokus'].includes(recommendation.level),canPromote=recommendation.action==='promote';
  return `<section class="manager-day-preview j20-review" aria-label="A-träningsuppföljning junior"><div><span class="desk-kicker">A-TRÄNING · ${trainingSafe(player.name)}</span><strong>${trainingSafe(recommendation.level)}</strong><p>${row.sessions} A-pass · ${row.hardSessions||0} hårda · ork ${Math.round(100-(player.fatigue||0))} % · profil ${gain>=0?'+':''}${gain.toFixed(2)}.</p><small>${trainingSafe(recommendation.detail)}</small></div><div class="manager-life-actions j20-decision">${deskLink('Öppna juniorlaget',{page:'juniors'})}${warning&&player.trainingLoad!=='light'?`<button class="desk-link" onclick='managerJ20TrainingAct(${id},"light")'>Lättare belastning</button>`:''}${recommendation.action==='junior'?`<button class="desk-link" onclick='managerJ20TrainingAct(${id},"junior")'>Ren J20-träning</button>`:''}${canPromote?`<button class="btn" onclick='managerJ20TrainingAct(${id},"promote")'>Flytta upp</button>`:''}${recommendation.action==='continue'?`<button class="desk-link" onclick='managerJ20TrainingAct(${id},"continue")'>Fortsätt planen</button>`:''}</div></section>`;
}

const managerJ20TrainingMorningBase=managerLifeMorningView;
managerLifeMorningView=function(){return managerJ20TrainingMorningBase()+managerJ20TrainingFollowupView();};
