"use strict";

// Match-coaching systems. Loaded before script.js; initialized only after state exists.
function ensureSpecialTeams(){
  ensureLines();ensureSpecialPlans();
  const skaters=managerRoster().filter(p=>p.pos!=="MV"&&medicalAvailable(p));
  const attack=[...skaters].sort((a,b)=>(matchAttributeRating(b,"shot")+matchAttributeRating(b,"pass"))-(matchAttributeRating(a,"shot")+matchAttributeRating(a,"pass")));
  const defense=[...skaters].sort((a,b)=>matchAttributeRating(b,"defense")-matchAttributeRating(a,"defense"));
  if(!state.specialTeams) state.specialTeams={};
  for(const [key,size,pool] of [["pp1",5,attack],["pp2",5,attack],["pk1",4,defense],["pk2",4,defense]]){
    const old=Array.isArray(state.specialTeams[key])?state.specialTeams[key]:[];
    const ids=[];
    for(const id of old){
      const p=skaters.find(p=>samePlayerId(p.id,id));
      if(p&&!ids.some(x=>samePlayerId(x,p.id))) ids.push(p.id);
    }
    const offset=key.endsWith("2")?size:0;
    for(const p of [...pool.slice(offset),...pool]){
      if(ids.length>=size) break;
      if(!ids.some(id=>samePlayerId(id,p.id))) ids.push(p.id);
    }
    state.specialTeams[key]=ids.slice(0,size);
  }
}

function changeSpecialPlayer(key,index,id){
  if(!hockeyAllowChange())return;
  ensureSpecialTeams();
  const unit=state.specialTeams[key];
  const player=managerRoster().find(p=>samePlayerId(p.id,id)&&p.pos!=="MV"&&medicalAvailable(p));
  if(!unit||!player||!Number.isInteger(index)||index<0||index>=unit.length) return;
  if(state.live?.running)pauseMatch();
  const before=tacticalReviewPlan();
  const existing=unit.findIndex(x=>samePlayerId(x,id));
  if(existing>=0) [unit[index],unit[existing]]=[unit[existing],unit[index]];
  else unit[index]=player.id;
  tacticalReviewRecord(before,'Ändrad special teams-enhet');
  save();render();
}

function specialUnitOnIce(){
  const m=state.live;
  if(!m||m.finished) return null;
  if(studioActive()&&!studioEngine().isShortHanded(0)&&!studioEngine().hasPowerPlay(0))return null;
  const own=Math.min(2,m.penaltiesHV.length),other=Math.min(2,m.penaltiesOpp.length);
  if(!own&&!other&&(m.period!==4||isPlayoffMatch())) return null;
  ensureSpecialTeams();
  const unitNumber=(m.rotationIndex||0)%2+1;
  const key=(other>own?"pp":"pk")+unitNumber;
  const count=(m.period===4&&!isPlayoffMatch())?Math.min(5,3+Math.max(0,other-own)):5-own;
  return state.specialTeams[key].map(playerById).filter(Boolean).slice(0,count);
}

function trackIceTime(seconds){
  const m=state.live;if(!m||m.finished||!Number.isFinite(seconds)||seconds<=0)return;
  if(!m.iceTime)m.iceTime={};
  const skaters=[...currentLinePlayers(),...currentDefensePlayers()];
  const goalie=m.goaliePulled?null:randomGoalie();
  const players=[...new Map([...skaters,...(goalie?[goalie]:[])].map(p=>[String(p.id),p])).values()];
  const shared=Math.min(seconds,...players.map(p=>medicalLimit(p)-(m.iceTime[p.id]||0)));
  analysisIce(players,seconds);
  leagueTrackIce(players,seconds);
  updateFatigue(seconds,players,rinkOpponentPlayers());
  trackSocialIce(skaters,Math.max(0,shared));
  for(const p of players)m.iceTime[p.id]=(m.iceTime[p.id]||0)+Math.max(0,Math.min(seconds,medicalLimit(p)-(m.iceTime[p.id]||0)));
  medicalExposure(players,seconds);
}

function matchEnergy(p){
 const e=state.live?.energy?.players?.[String(p.id)];
 return e?.level??readinessCeiling(p.fatigue||0);
}
function matchEnergyPenalty(p){return state.live&&!state.live.finished?(100-matchEnergy(p))/12:0;}
function matchRecover(seconds,key){
 const m=state.live;if(!m||m.finished||!m.energy)return;
 if(!m.energy.breaks)m.energy.breaks=[];
 if(m.energy.breaks.includes(key))return;m.energy.breaks.push(key);
 for(const [id,e] of Object.entries(m.energy.players)){
  const p=findPlayerAnywhere(id);if(!p)continue;
  const fatigue=(p.fatigue||0)+(isOwnPlayer(p)?0:(m.rink?.oppFatigue?.[id]||0));
  e.level=readinessRecover(e.level,seconds,ensurePlayerAttributes(p).stamina||10,readinessCeiling(fatigue),isOwnPlayer(p)?clubPriorityValue('recovery'):1);
  e.shift=0;
 }
}

function coachingNavigate(page){
  if(state.live&&!state.live.finished) pauseMatch();
  deskNavigate(page);
}

function benchLine(index){
  if(studioActive()){pauseMatch();studioQueueUnit("forwards",index);return;}
  if(!hockeyAllowChange())return;
  if(!state.live||state.live.finished||!Number.isInteger(index)||index<0||index>3) return;
  pauseMatch();
  state.live.currentLine=index;
  state.live.shiftSeconds=0;
  addEvent(`Coach skickar in kedja ${index+1}.`,"strategy");
  save();render();
}

function specialTeamsView(){lineupWorkspace='special';return lineupBoardView();}

function benchPanel(){
  const m=state.live;
  if(!m) return '';
  const goalie=randomGoalie();
  const special=specialUnitOnIce();
  return `<section class="bench-strip"><div><small>COACHBÄNKEN · ${m.finished?'SLUTRESULTAT':special?'SPECIAL TEAMS':'FEM MOT FEM'}</small><h2>${m.finished?'Matchrapport':'Ditt nästa drag'}</h2><p>Målvakt: ${goalie?.name||'Ingen vald'}${m.goaliePulled?' · Uttagen':''}</p></div><div class="bench-actions"><button class="btn secondary" onclick="state.analysis.selected=state.live.finished?'latest':'live';coachingNavigate('statistics')">Matchanalys</button><button class="btn secondary" onclick="coachingNavigate('lines')">Ändra laget</button></div>${!m.finished?`<div class="bench-actions">${[0,1,2,3].map(i=>`<button class="btn secondary" onclick="benchLine(${i})">In med kedja ${i+1}</button>`).join('')}<small>Coachval pausar matchen. Tryck Starta för att fortsätta.</small></div>`:''}</section>`;
}

function iceTimeView(){
  const times=state.live?.iceTime||{};
  const rows=managerRoster().filter(p=>times[String(p.id)]>0).sort((a,b)=>times[String(b.id)]-times[String(a.id)]);
  return `<section class="card"><h2>Istid · denna match</h2><p class="muted">Registreras för spelarna som faktiskt är på isen, inklusive PP och PK.</p>${rows.length?rows.map(p=>{const seconds=times[String(p.id)];return `<div class="row"><span>${p.name} · ${p.pos}</span><b>${Math.floor(seconds/60)}:${String(Math.floor(seconds%60)).padStart(2,'0')}</b></div>`;}).join(''):'<p>Istiden börjar räknas vid nedsläpp.</p>'}</section>`;
}
