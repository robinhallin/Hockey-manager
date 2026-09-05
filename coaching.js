"use strict";

// Match-coaching systems. Loaded before script.js; initialized only after state exists.
function ensureSpecialTeams(){
  ensureLines();
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
  ensureSpecialTeams();
  const unit=state.specialTeams[key];
  const player=managerRoster().find(p=>samePlayerId(p.id,id)&&p.pos!=="MV"&&medicalAvailable(p));
  if(!unit||!player||!Number.isInteger(index)||index<0||index>=unit.length) return;
  const existing=unit.findIndex(x=>samePlayerId(x,id));
  if(existing>=0) [unit[index],unit[existing]]=[unit[existing],unit[index]];
  else unit[index]=player.id;
  save();render();
}

function specialUnitOnIce(){
  const m=state.live;
  if(!m||m.finished) return null;
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
  trackSocialIce(skaters,Math.max(0,shared));
  for(const p of players)m.iceTime[p.id]=(m.iceTime[p.id]||0)+Math.max(0,Math.min(seconds,medicalLimit(p)-(m.iceTime[p.id]||0)));
  medicalExposure(players,seconds);
}

function coachingNavigate(page){
  if(state.live&&!state.live.finished) pauseMatch();
  state.page=page;save();render();
}

function benchLine(index){
  if(!state.live||state.live.finished||!Number.isInteger(index)||index<0||index>3) return;
  pauseMatch();
  state.live.currentLine=index;
  state.live.shiftSeconds=0;
  addEvent(`Coach skickar in kedja ${index+1}.`,"strategy");
  save();render();
}

function specialTeamsView(){
  ensureSpecialTeams();
  const pool=managerRoster().filter(p=>p.pos!=="MV"&&medicalAvailable(p));
  return `<section class="bench-hub"><div class="bench-heading"><div><span>SPECIAL TEAMS</span><h1>De avgörande minuterna</h1><p>Välj dina egna formationer. De två enheterna växlar vid byten i matchen.</p></div><button class="btn secondary" onclick="coachingNavigate('match')">Till matchen</button></div>
    <div class="units-grid">${Object.entries(state.specialTeams).map(([key,ids])=>{
      const power=key.startsWith("pp");
      const players=ids.map(playerById).filter(Boolean);
      return `<article class="unit-card ${power?'unit-attack':'unit-defense'}"><header><div><small>${power?'NUMERÄRT ÖVERLÄGE':'NUMERÄRT UNDERLÄGE'}</small><h2>${power?'Powerplay':'Boxplay'} ${key.slice(-1)}</h2></div><strong>${unitAssessment(ids)}<small>${power?'ANFALL':'FÖRSVAR'}</small></strong></header><p>${power?'Fem valfria utespelare. Prioritera skott och passningar.':'Fyra utespelare. Prioritera försvar. Vid dubbla utvisningar används de tre första.'}</p>${ids.map((id,i)=>`<label><span>${i+1}</span><select aria-label="${key} spelare ${i+1}" onchange="changeSpecialPlayer('${key}',${i},this.value)">${lineOptions(pool,id)}</select></label>`).join('')}</article>`;
    }).join('')}</div><p class="muted">Spelare kan ingå i flera enheter, men aldrig dubbelt i samma enhet. Istiden visas på matchsidan.</p></section>`;
}

function benchPanel(){
  const m=state.live;
  if(!m) return '';
  const goalie=randomGoalie();
  const special=specialUnitOnIce();
  return `<section class="bench-strip"><div><small>COACHBÄNKEN · ${m.finished?'SLUTRESULTAT':special?'SPECIAL TEAMS':'FEM MOT FEM'}</small><h2>${m.finished?'Matchrapport':'Ditt nästa drag'}</h2><p>Målvakt: ${goalie?.name||'Ingen vald'}${m.goaliePulled?' · Uttagen':''}</p></div><div class="bench-actions"><button class="btn secondary" onclick="coachingNavigate('tactics')">Matchplan</button><button class="btn secondary" onclick="coachingNavigate('specialTeams')">PP / PK</button><button class="btn secondary" onclick="coachingNavigate('lines')">Kedjor & målvakt</button></div>${!m.finished?`<div class="bench-actions">${[0,1,2,3].map(i=>`<button class="btn secondary" onclick="benchLine(${i})">In med kedja ${i+1}</button>`).join('')}<small>Coachval pausar matchen. Tryck Starta för att fortsätta.</small></div>`:''}</section>`;
}

function iceTimeView(){
  const times=state.live?.iceTime||{};
  const rows=managerRoster().filter(p=>times[String(p.id)]>0).sort((a,b)=>times[String(b.id)]-times[String(a.id)]);
  return `<section class="card"><h2>Istid · denna match</h2><p class="muted">Registreras för spelarna som faktiskt är på isen, inklusive PP och PK.</p>${rows.length?rows.map(p=>{const seconds=times[String(p.id)];return `<div class="row"><span>${p.name} · ${p.pos}</span><b>${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}</b></div>`;}).join(''):'<p>Istiden börjar räknas vid nedsläpp.</p>'}</section>`;
}
