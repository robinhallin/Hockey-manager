"use strict";
// Positions in rink coordinates (0–100). The model owns possession; rendering never rolls outcomes.
let rinkSyncBusy=false;
const RINK_LABELS={faceoff:'Tekning',buildup:'Uppspel',carry:'Pucktransport',pass:'Passning',turnover:'Puckvinst',shot:'Avslut',goal:'MÅL',save:'Räddning',post:'Ramträff',rebound:'Retur',block:'Blockerat skott',penalty:'Utvisning',offside:'Offside',icing:'Icing',clear:'Rensning',freeze:'Blockerad puck',goalie:'Målvaktsutspel',wide:'Utanför'};
function rinkOther(side){return side==='own'?'opponent':'own';}
function rinkX(side,x){return side==='own'?x:100-x;}
function rinkKey(side,p){return `${side}:${p.id}`;}
function rinkPlayer(actor){return actor?.side==='own'?playerById(actor.id):(state.clubRosters[state.live.opponent]||[]).find(p=>samePlayerId(p.id,actor?.id));}
function rinkAttribute(actor,key){
 const p=rinkPlayer(actor);if(!p)return 10;
 const fatigue=actor.side==='own'?p.fatigue:(state.live.rink.oppFatigue?.[p.id]||0);
 const teamwork=actor.side==='own'&&['passing','vision','decisions','positioning','faceoffs'].includes(key)?(state.live.rink.teamBonus||0)/4:0;
 return attrClamp((ensurePlayerAttributes(p)[key]||10)-fatigue/25+teamwork,1,20);
}
function rinkClamp(n,min=6,max=94){return Math.max(min,Math.min(max,n));}
function rinkDistance(a,b){return Math.hypot((a.x-b.x)*.6,(a.y-b.y)*.3);}
function rinkRoll(){const r=state.live.rink;r.rng=(Math.imul(r.rng,1664525)+1013904223)>>>0;return r.rng/4294967296;}
function rinkSkaters(side){return state.live.rink.actors.filter(a=>a.side===side&&a.pos!=='MV');}
function rinkOpponentPlayers(){
 const m=state.live,pool=state.clubRosters[m.opponent]||[],rotation=m.rotationIndex||0;
 if(hockeyChangeBlocked('opponent'))return m.rink.hockey.icingHold.ids.map(id=>pool.find(p=>samePlayerId(p.id,id))).filter(Boolean);
 const skaters=pool.filter(p=>p.pos!=='MV'),fw=skaters.filter(p=>p.pos!=='B'),backs=skaters.filter(p=>p.pos==='B');
 const own=Math.min(2,m.penaltiesHV.length),opp=Math.min(2,m.penaltiesOpp.length),ot=m.period===4&&!isPlayoffMatch();
 const count=(ot?Math.min(5,3+Math.max(0,own-opp)):5-opp)+(m.aiGoaliePulled?1:0);
 const rotate=(ps,n)=>ps.length?[...ps.slice((rotation*n)%ps.length),...ps.slice(0,(rotation*n)%ps.length)]:[];
 const preferred=own>opp?[...skaters].sort((a,b)=>matchAttributeRating(b,'shot')-matchAttributeRating(a,'shot')):[...rotate(fw,3).slice(0,Math.max(1,count-2)),...rotate(backs,2).slice(0,2),...skaters];
 const players=[...new Map(preferred.map(p=>[String(p.id),p])).values()].slice(0,count);
 if(!m.aiGoaliePulled){const keeper=pool.filter(p=>p.pos==='MV').sort((a,b)=>matchAttributeRating(b)-matchAttributeRating(a))[0];if(keeper)players.push(keeper);}
 return players;
}
function rinkExtraForward(forwards,special=null){
 const m=state.live;if(!m?.goaliePulled)return forwards;
 const defenders=special||medicalUnit(state.lines.defense.slice(m.currentDefensePair*2,m.currentDefensePair*2+2).map(playerById).filter(Boolean),2,'B');
 const used=[...forwards,...defenders];const extra=managerRoster().filter(p=>p.pos!=='MV'&&medicalAvailable(p)&&!used.some(q=>samePlayerId(q.id,p.id))).sort((a,b)=>matchAttributeRating(b,'shot')-matchAttributeRating(a,'shot'))[0];
 return extra?[...forwards,extra]:forwards;
}
function rinkOwnPlayers(){const players=[...currentLinePlayers(),...currentDefensePlayers()];if(!state.live.goaliePulled){const p=randomGoalie();if(p)players.push(p);}return [...new Map(players.map(p=>[String(p.id),p])).values()];}
function ensureRink(){
 const m=state.live;if(!m||!state.careerStarted)return;
 if(!m.rink)m.rink={version:1,actors:[],puck:{x:50,y:50},owner:'own',carrier:null,phase:'faceoff',restart:true,faceoffX:50,frame:0,period:m.period,ot:m.overtimePeriods||1,rng:Math.floor(attrSeed(`${managerClub()}:${m.opponent}:${state.season?.year}:${state.round}:rink`)*4294967296),mode:'full',selected:null,caption:'Nedsläpp väntar.',hot:false,previous:[],puckFrom:{x:50,y:50},puckVia:null,at:0,duration:0,hold:0,zoneTicks:0,possession:{own:0,opponent:0},passes:{own:0,opponent:0},teamBonus:0,oppFatigue:{},lastPass:null};
 ensureHockey();
 if(!m.finished)rinkSync();
}
function rinkSync(){
 const m=state.live,r=m?.rink;if(!r||rinkSyncBusy)return;rinkSyncBusy=true;
 try{
  const old=r.actors,actors=[],borrowed=new Set();
  for(const [side,players] of [['own',rinkOwnPlayers()],['opponent',rinkOpponentPlayers()]]){
   let skater=0;const pool=side==='own'?managerRoster():state.clubRosters[m.opponent]||[];
   for(const p of players){const key=rinkKey(side,p),prior=old.find(a=>a.key===key),goalie=p.pos==='MV';
    const row={key,id:p.id,name:p.name,pos:p.pos,side,number:pool.findIndex(q=>samePlayerId(q.id,p.id))+1,x:rinkX(side,goalie?8:p.pos==='B'?30:45),y:goalie?50:[25,50,75,35,65,50][skater++%6]};const inherited=prior||old.find(a=>a.side===side&&a.pos===p.pos&&!borrowed.has(a.key)&&!players.some(q=>rinkKey(side,q)===a.key));
    if(inherited)borrowed.add(inherited.key);actors.push(inherited?{...row,x:inherited.x,y:inherited.y}:row);
   }
  }
  r.actors=actors;
  if(!actors.some(a=>a.key===r.carrier)&&r.phase!=='rebound'&&!r.hockey?.loose){
   const candidates=actors.filter(a=>a.side===r.owner&&a.pos!=='MV').sort((a,b)=>rinkDistance(a,r.puck)-rinkDistance(b,r.puck));
   r.carrier=candidates[0]?.key||null;r.lastPass=null;
   if(candidates[0]&&!r.restart){candidates[0].x=r.puck.x;candidates[0].y=r.puck.y;}
  }
 }finally{rinkSyncBusy=false;}
}
function rinkDelay(){const m=state.live,base=m?.speed===3?300:m?.speed===2?700:1400;return m?.rink?.mode==='highlights'&&!m.rink.hot?100:base*(m?.rink?.phase==='goal'?1.5:m?.rink?.hot?1.12:1);}
function rinkMode(value){if(!state.live||!['full','highlights'].includes(value))return;ensureRink();state.live.rink.mode=value;clearTimeout(matchTimer);save();render();scheduleTick();}
function rinkSelect(key){ensureRink();state.live.rink.selected=key;pauseMatch();}
function rinkSay(text,phase,hot=false){const r=state.live.rink;r.caption=text;r.phase=phase;r.hot=hot;addEvent(text,phase==='goal'?'goal':['shot','save','post','rebound','block'].includes(phase)?'shot':phase==='penalty'?'penalty':'chance');}
function rinkBeginFrame(){const r=state.live.rink;r.previous=r.actors.map(a=>({key:a.key,x:a.x,y:a.y}));r.puckFrom={...r.puck};r.puckVia=null;r.frame++;r.at=Date.now();r.hold=0;r.teamBonus=attrClamp(trainingMatchBonus()+lockerMatchBonus(),-6,6);}
function rinkEndFrame(){
 const r=state.live.rink;r.hockey.transition=Math.max(0,r.hockey.transition-1);r.duration=Math.max(80,rinkDelay()*.88);if(!r.oppFatigue)r.oppFatigue={};
 const onIce=rinkSkaters('opponent');
 for(const p of (state.clubRosters[state.live.opponent]||[]).filter(p=>p.pos!=='MV'))r.oppFatigue[p.id]=attrClamp((r.oppFatigue[p.id]||0)+(onIce.some(a=>samePlayerId(a.id,p.id))?1.2*(1.4-ensurePlayerAttributes(p).stamina/25):-.8),0,100);
}
function rinkFaceoff(){
 const m=state.live,r=m.rink;
 const centers=['own','opponent'].map(side=>rinkSkaters(side).sort((a,b)=>rinkAttribute(b,'faceoffs')-rinkAttribute(a,'faceoffs'))[0]);
 if(!centers[0]||!centers[1])return;
 const ownWin=rinkRoll()<attrClamp(.5+(rinkAttribute(centers[0],'faceoffs')-rinkAttribute(centers[1],'faceoffs'))/50,.2,.8),side=ownWin?'own':'opponent',winner=centers[ownWin?0:1];
 r.owner=side;r.carrier=winner.key;r.zoneTicks=0;r.lastPass=null;r.restart=false;r.hockey.loose=null;r.hockey.icingHold=null;
 for(const teamSide of ['own','opponent']){let i=0;for(const a of r.actors.filter(a=>a.side===teamSide)){
  if(a.pos==='MV'){a.x=rinkX(teamSide,8);a.y=50;continue;}
  const d=teamSide==='own'?1:-1;a.x=rinkClamp(r.faceoffX-d*(a.pos==='B'?19:5));a.y=rinkClamp((r.faceoffY||50)+([25,50,75,33,67,50][i++%6]-50)*.7,14,86);
 }}
 winner.x=rinkClamp(r.faceoffX+(ownWin?2:-2));winner.y=r.faceoffY||50;r.puck={x:winner.x,y:winner.y};
 if(ownWin)m.faceoffsHV++;else m.faceoffsOpp++;
 rinkSay(`${winner.name} vinner tekningen.`, 'faceoff');
}
function rinkPress(side){return side==='own'?(state.tacticalPlan?.forecheck==='aggressive'?1:state.tacticalPlan?.forecheck==='passive'?0:.5):.5;}
function rinkMove(actor,x,y){const distance=rinkDistance(actor,{x,y}),max=3.5+rinkAttribute(actor,actor.pos==='MV'?'movement':'skating')*.24,ratio=distance?Math.min(1,max/distance):1;actor.x=rinkClamp(actor.x+(x-actor.x)*ratio);actor.y=rinkClamp(actor.y+(y-actor.y)*ratio,10,90);}
function rinkMoveTeam(){hockeyMoveTeam();}

function rinkLaneThreat(from,to,defenders){
 const ax=from.x*.6,ay=from.y*.3,bx=to.x*.6,by=to.y*.3,dx=bx-ax,dy=by-ay,length=dx*dx+dy*dy;
 let threat=0;
 for(const d of defenders){const px=d.x*.6,py=d.y*.3,t=length?((px-ax)*dx+(py-ay)*dy)/length:0;if(t<=.08||t>=.95)continue;
  const distance=Math.hypot(px-(ax+t*dx),py-(ay+t*dy));threat=Math.max(threat,Math.max(0,1-distance/5)*(rinkAttribute(d,'positioning')/20));}
 return threat;
}
function rinkPassChance(from,to,defenders){return attrClamp(.76+(rinkAttribute(from,'passing')+rinkAttribute(from,'vision')+rinkAttribute(to,'puckControl')-30)/110-rinkDistance(from,to)/120-rinkLaneThreat(from,to,defenders)*.45,.2,.96);}
function rinkLose(defender,text){const r=state.live.rink;r.hockey.transition=r.owner!==defender.side?3:r.hockey.transition;r.owner=defender.side;r.carrier=defender.key;r.lastPass=null;r.zoneTicks=0;r.puck={x:defender.x,y:defender.y};rinkSay(text,'turnover',rinkX(defender.side,defender.x)>65);}
function rinkShotLocation(actor){const x=rinkX(actor.side,actor.x),y=actor.y,distance=rinkDistance({x,y},{x:92,y:50});return {x,y,factor:attrClamp(1.3-distance/32-Math.abs(y-50)/120,.25,1.25)};}
function rinkTakeShot(actor){
 const m=state.live,r=m.rink,side=actor.side,location=rinkShotLocation(actor),defenders=rinkSkaters(rinkOther(side)),dangerous=location.x>=74&&Math.abs(location.y-50)<20;
 const goal={x:rinkX(side,92),y:50},threat=rinkLaneThreat(actor,goal,defenders);
 r.puckVia={x:actor.x,y:actor.y};
 if(rinkRoll()<threat*.23){const blocker=[...defenders].sort((a,b)=>rinkLaneThreat(actor,goal,[b])-rinkLaneThreat(actor,goal,[a]))[0];
  if(blocker){if(side==='own')m.blocksOpp++;else m.blocksHV++;r.puck={x:blocker.x,y:blocker.y};r.hockey.transition=3;r.owner=blocker.side;r.carrier=blocker.key;r.lastPass=null;r.zoneTicks=0;rinkSay(`${blocker.name} blockerar ${actor.name}s skott.`,'block',true);return;}
 }
 if(dangerous){if(side==='own')m.chancesHV++;else m.chancesOpp++;}
 const recent=r.lastPass&&r.lastPass.to===actor.key&&r.frame-r.lastPass.frame<=3?r.lastPass:null;
 const context={location,suppressRebound:true,assistId:recent?.id??null};
 if(side==='own')hvShot(rinkPlayer(actor),dangerous,context);else opponentShot(dangerous,actor.name,context);
 const shot=m.analysis.shots.at(-1),outcome=shot.outcome;r.puck={...goal};r.phase=outcome;r.hot=true;r.lastPass=null;
 r.caption=m.events[0]?.text||`${actor.name} avslutar.`;
 if(outcome==='goal'){r.restart=true;r.faceoffX=50;r.faceoffY=50;}
 else if(outcome==='save'){hockeyKeeperSave(side);}
 else if(outcome==='wide'){r.puck={x:rinkX(side,94),y:actor.y<50?18:82};r.carrier=null;r.hockey.loose={type:'wide',side};}
 else {r.phase='rebound';r.puck={x:rinkX(side,84),y:rinkClamp(50+(rinkRoll()-.5)*26,18,82)};r.carrier=null;r.hockey.loose={type:'rebound',side};r.caption=outcome==='post'?`${actor.name} träffar ramen – pucken är lös!`:`Retur efter ${actor.name}s avslut!`;}
}
function rinkStep(){
 ensureRink();const m=state.live,r=m?.rink;if(!r||m.finished||!m.running)return;
 if(r.period!==m.period||r.ot!==(m.overtimePeriods||1)){r.period=m.period;r.ot=m.overtimePeriods||1;r.restart=true;r.faceoffX=50;r.faceoffY=50;}
 rinkBeginFrame();
 if(r.restart){rinkFaceoff();rinkEndFrame();return;}
 if(r.hockey.loose||r.phase==='rebound'){hockeyRecover();rinkEndFrame();return;}
 if(r.phase==='goalie'){hockeyDistribute();rinkEndFrame();return;}
 const puckBefore={...r.puck},carrierBefore=r.carrier;
 rinkMoveTeam();const actor=r.actors.find(a=>a.key===r.carrier);if(!actor){r.restart=true;rinkEndFrame();return;}
 if(hockeyEntry(r.owner,puckBefore,r.puck,carrierBefore)){rinkEndFrame();return;}
 r.possession[r.owner]+=6;m.possessionHV=Math.round(100*r.possession.own/Math.max(1,r.possession.own+r.possession.opponent));
 const defenders=rinkSkaters(rinkOther(r.owner)),nearest=[...defenders].sort((a,b)=>rinkDistance(a,actor)-rinkDistance(b,actor))[0];
 const progress=rinkX(r.owner,actor.x);if(progress>65)r.zoneTicks++;else r.zoneTicks=0;
 if(rinkRoll()<.018){simulatePenalty();r.caption=m.events[0].text;r.phase='penalty';r.hot=true;r.restart=true;r.faceoffX=progress>65?rinkX(r.owner,76):50;rinkSync();rinkEndFrame();return;}
 const press=rinkPress(rinkOther(r.owner)),steal=nearest?attrClamp(.045+(rinkAttribute(nearest,'checking')-rinkAttribute(actor,'puckControl'))/110+press*.04,.015,.24):0;
 if(nearest&&rinkDistance(nearest,actor)<7&&rinkRoll()<steal){if(nearest.side==='own')m.hitsHV++;else m.hitsOpp++;rinkLose(nearest,`${nearest.name} pressar ${actor.name} och vinner pucken.`);rinkEndFrame();return;}
 if(progress<45&&nearest&&rinkDistance(nearest,actor)<10&&rinkRoll()<(hockeySpecial(r.owner)==='pk'?.75:hockeyStyle(r.owner)==='counter'?.18:.06)){hockeyClear(actor);rinkEndFrame();return;}
 if(rinkRoll()<hockeyShotChoice(actor)){rinkTakeShot(actor);rinkEndFrame();return;}
 const options=rinkSkaters(r.owner).filter(a=>a.key!==actor.key).map(a=>({a,score:hockeyPassScore(actor,a,defenders)+rinkRoll()*.12})).sort((a,b)=>b.score-a.score);
 if(options.length&&rinkRoll()<(hockeySpecial(r.owner)==='pp'?.85:hockeyStyle(r.owner)==='control'?.78:.62)){const target=options[0].a;r.puckVia={x:actor.x,y:actor.y};
  if(rinkRoll()<rinkPassChance(actor,target,defenders)){if(hockeyEntry(r.owner,actor,target,actor.key)){rinkEndFrame();return;}r.carrier=target.key;r.puck={x:target.x,y:target.y};r.passes[r.owner]++;r.lastPass={from:actor.key,id:actor.id,to:target.key,frame:r.frame};rinkSay(`${actor.name} hittar ${target.name} med en passning.`,'pass',progress>68);}
  else if(nearest)rinkLose(nearest,`${nearest.name} läser passningen från ${actor.name} och bryter.`);
 }else rinkSay(`${actor.name} ${progress>66?'etablerar spel i anfallszonen':progress>40?'tar pucken genom mittzonen':'startar uppspelet'}.`,progress>40?'carry':'buildup',progress>68);
 rinkEndFrame();
}
function rinkActorStyle(actor,previous,duration,elapsed){return `--from-x:${previous.x}%;--from-y:${previous.y}%;--to-x:${actor.x}%;--to-y:${actor.y}%;--motion:${duration}ms;--elapsed:-${elapsed}ms;left:${actor.x}%;top:${actor.y}%;`;}
function rinkView(compact=false){
 ensureRink();const m=state.live,r=m.rink;if(!r)return '';
 const own=careerIdentity(managerClub()),other=careerIdentity(m.opponent),duration=r.duration||1,elapsed=m.running?Math.min(duration,Math.max(0,Date.now()-r.at)):duration;
 const selected=r.actors.find(a=>a.key===r.selected),skaters=side=>r.actors.filter(a=>a.side===side&&a.pos!=='MV').length;
 const actorList=r.actors.map(a=>{const from=r.previous.find(p=>p.key===a.key)||a;return `<button class="rink-player ${a.side} ${a.pos==='MV'?'keeper':''} ${a.key===r.carrier?'carrier':''}" style="${rinkActorStyle(a,from,duration,elapsed)}" onclick="rinkSelect('${a.key}')" aria-label="${trainingSafe(a.name)}, ${a.side==='own'?managerClub():m.opponent}, ${a.pos}"><span>${a.number}</span><small>${trainingSafe(a.name.split(' ').at(-1))}</small></button>`;}).join('');
 const puckStyle=rinkActorStyle(r.puck,r.puckFrom||r.puck,duration,elapsed)+`--via-x:${(r.puckVia||r.puckFrom||r.puck).x}%;--via-y:${(r.puckVia||r.puckFrom||r.puck).y}%;`;
 return `<section class="rink-view" style="--own-kit:${own.color};--opp-kit:${other.color}">${compact?'':`<div class="rink-toolbar"><div><span class="rink-live-label">${m.finished?'SLUT':m.running?'MATCHEN PÅGÅR':'PAUSAT'}</span><strong>${skaters('own')} mot ${skaters('opponent')}${m.goaliePulled?' · Eget mål tomt':''}${m.aiGoaliePulled?' · Motståndarmålet tomt':''}</strong></div><div class="rink-playback"><label>Följ<select onchange="rinkMode(this.value)"><option value="full" ${r.mode==='full'?'selected':''}>Hela matchen</option><option value="highlights" ${r.mode==='highlights'?'selected':''}>Höjdpunkter</option></select></label><label>Tempo<select onchange="setSpeed(this.value)">${[[1,'Normal'],[2,'Snabb'],[3,'Mycket snabb']].map(([v,t])=>`<option value="${v}" ${m.speed===v?'selected':''}>${t}</option>`).join('')}</select></label></div></div>`}<div class="rink-surface" aria-label="2D-rink. Ditt lag anfaller åt höger."><svg class="rink-markings" viewBox="0 0 1000 500" preserveAspectRatio="none" role="img" aria-label="Ishockeyrink med mål, blålinjer och tekningscirklar"><rect x="8" y="8" width="984" height="484" rx="95" fill="#edf4f7" stroke="#9cb3c2" stroke-width="6"/><path d="M340 12v476 M660 12v476" stroke="#3372a5" stroke-width="7"/><path d="M500 12v476" stroke="#c04e59" stroke-width="4" stroke-dasharray="10 7"/><path d="M80 38v424 M920 38v424" stroke="#bc5662" stroke-width="3"/><circle cx="500" cy="250" r="64" fill="none" stroke="#3372a5" stroke-width="3"/>${[235,765].map(x=>[140,360].map(y=>`<circle cx="${x}" cy="${y}" r="59" fill="none" stroke="#bc5662" stroke-width="2"/><circle cx="${x}" cy="${y}" r="5" fill="#bc5662"/>`).join('')).join('')}<path d="M80 218a32 32 0 0 1 0 64 M920 218a32 32 0 0 0 0 64" fill="#b9d6e9" stroke="#bc5662" stroke-width="2"/><path d="M80 227H58v46h22 M920 227h22v46h-22" fill="none" stroke="#9e3546" stroke-width="5"/><circle cx="500" cy="250" r="5" fill="#3372a5"/></svg><span class="rink-ice-name">${own.code}</span>${actorList}<span class="rink-puck" style="${puckStyle}" aria-hidden="true"></span>${r.phase==='goal'?'<span class="rink-goal-label">MÅL</span>':''}</div><div class="rink-commentary" role="status"><strong>${RINK_LABELS[r.phase]||'Spel'}</strong><span>${trainingSafe(r.caption)}</span></div>${compact?'':`${hockeyPanel()}<div class="rink-quick-actions"><button class="btn" onclick="${m.running?'pauseMatch()':'startMatch()'}" ${m.finished?'disabled':''}>${m.running?'Pausa':'Spela'}</button><button class="btn secondary" onclick="coachingNavigate('tactics')">Matchplan</button><button class="btn secondary" onclick="coachingNavigate('lines')">Byt spelare</button><button class="btn secondary" onclick="useTimeout()" ${m.finished||m.timeoutUsed?'disabled':''}>Timeout</button><button class="btn secondary" onclick="toggleGoalie()" ${m.finished?'disabled':''}>${m.goaliePulled?'Sätt in målvakt':'Ta ut målvakt'}</button></div>`}${selected?`<div class="rink-selection"><strong>${trainingSafe(selected.name)}</strong><span>${selected.pos} · ${selected.side==='own'?managerClub():m.opponent} · ${selected.duty||'På isen'}</span><p>Matchen pausas när du väljer en spelare.</p></div>`:''}${compact?'':`<details class="rink-lineups"><summary>Spelarna på isen & matchbild</summary><div>${['own','opponent'].map(side=>`<section><h3>${side==='own'?managerClub():m.opponent}</h3>${r.actors.filter(a=>a.side===side).map(a=>`<button onclick="rinkSelect('${a.key}')"><b>${a.number}</b> ${trainingSafe(a.name)} <small>${a.pos}</small></button>`).join('')}</section>`).join('')}</div><p>Puckinnehav ${m.possessionHV}–${100-m.possessionHV} % · Lyckade passningar ${r.passes.own}–${r.passes.opponent}.</p><p>Ditt lag anfaller alltid åt höger i denna vy. Höjdpunkter spelar upp lugna sekvenser snabbare. Alla händelser och all istid simuleras i båda lägena.</p></details>`}</section>`;
}
