"use strict";
// Career adapter. The shared fixed-step simulation alone decides what happens on the ice.
// Legacy unfinished saves retain their engine; every newly created fixture uses this adapter.
function studioActive(){return Boolean(state.live?.broadcast);}
let studioRosterCache=null;
function studioPlayer(side,id){
 if(studioRosterCache?.match!==state.live)studioRosterCache={match:state.live,maps:[managerRoster(),state.clubRosters[state.live.opponent]||[]].map(ps=>new Map(ps.map(p=>[String(p.id),p])))};
 return studioRosterCache.maps[side].get(String(id));
}
function studioPlayers(side,goalies=true){
 const e=studioEngine();return (e?.accountingActors||e?.actors||[]).filter(a=>a.side===side&&(goalies||a.role!=='G')).map(a=>studioPlayer(side,a.player.id)).filter(Boolean);
}
function studioEffort(side,id){const e=studioEngine(),a=(e.accountingActors||e.actors).find(a=>a.side===(side==='own'?0:1)&&samePlayerId(a.player.id,id));return a&&a.role!=='G'?.8+Math.min(.5,Math.hypot(a.vx,a.vy)/10):1;}
function studioKeeper(side){const a=(studioEngine()?.accountingActors||studioEngine()?.actors||[]).find(a=>a.side===side&&a.role==='G');return a?studioPlayer(side,a.player.id):null;}
class CareerBroadcastMatch extends StudioHockey.Match {
 shiftTime(a){return state.live?.energy?.players?.[String(a.player.id)]?.shift??super.shiftTime(a);}
 unit(side,line=this.teams[side].line,pair=this.teams[side].pair){
  const t=this.teams[side],p=t.plan||{},short=this.isShortHanded(side),pp=this.hasPowerPlay(side);
  const eligible=x=>x.pos!=='MV'&&x.available!==false&&!this.penaltyList().some(p=>p.side===side&&samePlayerId(x.id,p.playerId));
  const pool=t.players.filter(eligible),find=id=>pool.find(x=>samePlayerId(x.id,id));
  const special=(t.specialIndex??line%2)+1;
  let ids=pp?p['pp'+special]:short?p['pk'+special]:null;
  if(!ids)ids=[...(p.forwards||[]).slice(line*3,line*3+3),...(p.defense||[]).slice(pair*2,pair*2+2)];
  let players=[...new Map([...ids.map(find).filter(Boolean),...pool].map(x=>[String(x.id),x])).values()];
  const count=this.strength(side);
  // Respect the rink editor's PP/PK slot order. Normal units keep center and defense roles.
  let roles=pp?['LD','LW','RW','RD','C']:short?['LD','RD','LW','RW']:['LW','C','RW','LD','RD'];
  if(this.threeOnThree){
   if(!pp&&!short){const f=players.filter(x=>x.pos!=='B'),d=players.filter(x=>x.pos==='B');players=[...f.slice(0,2),...d.slice(0,2),...players];players=[...new Map(players.map(x=>[String(x.id),x])).values()];}
   roles=pp?['LD','LW','RW','C','RD']:short?['LD','RD','LW']:['LW','C','LD','RD','RW'];
  }else if(!pp&&!short){
   // The three forward and two defensive slots are the coach's actual roles.
   // Preserve order, including deliberately unfamiliar positions.
   if(count<5){players=[players[0],players[1],players[3],players[4]].filter(Boolean);roles=['LW','C','LD','RD'];}
  }

  let rows=players.slice(0,count).map((player,i)=>({role:roles[i],player}));
  if(t.pulled){const extra=pool.find(x=>!rows.some(r=>r.player===x));if(extra)rows.push({role:'X',player:extra});}
  return rows;
 }
 installUnit(side){
  super.installUnit(side);
  if(this.teams[side].pulled)this.actors=this.actors.filter(a=>a.side!==side||a.role!=='G');
 }
 nextUnit(side){
  const t=this.teams[side],seq=t.rotation||[0,1,2,3];
  if(t.nextLine!=null||t.nextPair!=null||t.nextSpecial!=null){
   if(t.nextLine!=null)t.line=t.nextLine;if(t.nextPair!=null)t.pair=t.nextPair;if(t.nextSpecial!=null)t.specialIndex=t.nextSpecial;
  }else{
   t.rotationIndex=(t.rotationIndex||0)+1;
   const energy=ids=>{const ps=(ids||[]).map(id=>studioPlayer(side,id)).filter(Boolean);return ps.length?ps.reduce((n,p)=>n+matchEnergy(p),0)/ps.length:0;};
   const preferred=seq[t.rotationIndex%seq.length],lineEnergy=i=>energy((t.plan?.forwards||[]).slice(i*3,i*3+3));
   t.line=lineEnergy(preferred)>=50?preferred:[...new Set(seq)].sort((a,b)=>lineEnergy(b)-lineEnergy(a))[0];
   const pair=(t.pair+1)%3,pairEnergy=i=>energy((t.plan?.defense||[]).slice(i*2,i*2+2));
   t.pair=pairEnergy(pair)>=50?pair:[0,1,2].sort((a,b)=>pairEnergy(b)-pairEnergy(a))[0];
   const special=t.rotationIndex%2,key=this.isShortHanded(side)?'pk':'pp';
   t.specialIndex=energy(t.plan?.[key+(special+1)])>=50?special:energy(t.plan?.[key+'1'])>=energy(t.plan?.[key+'2'])?0:1;
  }
  t.nextLine=null;t.nextPair=null;t.nextSpecial=null;
 }
 updateChanges(dt){
  // Reuse the prototype's one-at-a-time bench movement, with the coach's shift duration.
  const offsets=this.teams.map(t=>43-(t.shiftLimit||43));this.teams.forEach((t,i)=>t.shift+=offsets[i]);
  const changing=this.teams.map(t=>Boolean(t.change));
  super.updateChanges(dt);this.teams.forEach((t,i)=>{const reset=changing[i]&&!t.change&&!t.changeQueue.length&&t.shift===0;t.shift=reset?0:Math.max(0,t.shift-offsets[i]);});
 }
 attribute(a,key){
  if(!a)return 10;const p=studioPlayer(a.side,a.player.id),energy=p?matchEnergy(p):a.player.energy;
  const rawFit=p?positionFit(p,a.role||'X'):1,fit=this.penalty&&a.role!=='G'?Math.max(.82,rawFit):rawFit;
  let value=(a.player.attributes[key]||10)*(1-(100-energy)*.0035)*fit;
  if(['passing','vision','positioning','decisions'].includes(key))value*=1+(((['LD','RD'].includes(a.role)?this.teams[a.side].defenseChemistry:this.teams[a.side].chemistry)??50)-50)/500;
  if(a.side===0&&key==='discipline')value+=state.tacticalPlan.physicality==='hard'?-4:state.tacticalPlan.physicality==='safe'?3:0;
  if(a.side===0&&key==='discipline')value+=clubPriorityValue('discipline',0);
  if(a.side===0&&key==='checking')value+=state.tacticalPlan.physicality==='hard'?1:state.tacticalPlan.physicality==='safe'?-.6:0;
  if(a.side===0&&['passing','vision','positioning','faceoffs'].includes(key))value+=(this.teamBonus||0)/4;
  if(p&&['decisions','composure','vision','positioning','passing'].includes(key))value+=playerMoraleBonus(p)*.25+(a.side===0?matchFeedbackBonus([p]):0)*.15;
  return Math.max(1,Math.min(20,value));
 }
 attackTargets(side){
  super.attackTargets(side);const t=this.teams[side];
  if(this.hasPowerPlay(side)&&t.tactics.pp==='overload'&&this.phase==='attack'){
   const slots={LD:[42,15],LW:[47,6],RW:[51,9],RD:[48,24],C:[55,13]};
   for(const a of this.skaters(side)){const slot=slots[a.role]||[52,21];this.assign(a,{x:StudioHockey.progress(side,slot[0]),y:slot[1]},'Överbelastar ena sidan och söker korta passningar');}
  }
  if(this.penalty||this.phase!=='attack')return;
  for(const a of this.skaters(side))if(a.role.endsWith('D')&&a.id!==this.carrier){
   const delta=t.posture==='defense'?-2:t.posture==='attack'?1:0;a.target.x+=side===0?delta:-delta;
  }
 }
 defenseTargets(side){
  super.defenseTargets(side);if(this.penalty||!this.carrier)return;
  const carrier=this.actor(this.carrier);if(!carrier||carrier.side===side)return;
  const t=this.teams[side],nearest=this.skaters(side).filter(a=>!a.role.endsWith('D')).sort((a,b)=>StudioHockey.distance(a,carrier)-StudioHockey.distance(b,carrier))[0];
  if(nearest&&t.forecheck==='aggressive'&&StudioHockey.progress(side,carrier.x)>25)this.assign(nearest,carrier,'Pressar puckföraren; backarna säkrar bakom');
 }
 decide(){
  // Tempo changes the interval between hockey decisions, never the display clock.
  super.decide();const t=this.teams[this.owner];this.decision*=t.tempo==='high'?.88:t.tempo==='low'?1.12:1;
 }
 penaltyList(){
  // Migrate the previous single-penalty save format, retaining its remaining time.
  if(!this.penalties)this.penalties=this.penalty?[this.penalty]:[];
  return this.penalties;
 }
 penaltyCount(side){return Math.min(2,this.penaltyList().filter(p=>p.side===side).length);}
 isShortHanded(side){return this.penaltyCount(side)>this.penaltyCount(1-side);}
 hasPowerPlay(side){return this.isShortHanded(1-side);}
 canGivePenalty(side){return this.skaters(side).length>0;}
 strength(side){
  const own=this.penaltyCount(side),other=this.penaltyCount(1-side);
  const normal=this.threeOnThree?3+Math.max(0,other-own):5-own;
  return this.threeOnThree?Math.max(normal,this.otCounts?.[side]||0):normal;
 }
 syncPenalty(){this.penalty=this.penaltyList()[0]||null;}
 opportunityState(){return {power:[0,1].map(side=>this.hasPowerPlay(side)),active:[0,1].map(side=>this.penaltyList().filter(p=>p.side===side).slice(0,2))};}
 recordOpportunities(before){
  for(const side of [0,1])if(this.hasPowerPlay(side)){
   const added=this.penaltyList().filter(p=>p.side!==side).slice(0,2).filter(p=>!before.active[1-side].includes(p)).length;
   state.live[side===0?'ppHV':'ppOpp']+=added||(!before.power[side]?1:0);
  }
 }
 tickPenalties(dt){
  const before=this.opportunityState();
  const active=[0,1].flatMap(side=>this.penaltyList().filter(p=>p.side===side).slice(0,2));
  for(const p of active)p.remaining-=dt;
  for(const p of active)if(p.remaining<=1e-7)this.endPenalty(false,p,false);
  this.recordOpportunities(before);
 }
 goalPenalty(side){
  if(!this.hasPowerPlay(side))return;
  const first=this.penaltyList().filter(p=>p.side!==side).slice(0,2).sort((a,b)=>a.remaining-b.remaining)[0];
  if(first)this.endPenalty(true,first);
 }
 givePenalty(side,name,kind=null){
  const offender=this.skaters(side).find(a=>a.player.name===name)||this.skaters(side)[0];if(!offender)return;
  const before=this.opportunityState();
  const types=['hakning','tripping','fasthållning','interference','slashing'];
  if(!types.includes(kind))kind=types[Math.floor(this.random()*types.length)];
  const p={side,remaining:120,name:offender.player.name,playerId:offender.player.id,kind};
  this.penaltyList().push(p);this.syncPenalty();this.otCounts=null;
  for(const i of [0,1])this.installUnit(i);
  this.stop('penalty',p.name+' utvisas två minuter för '+kind+'.',{x:side===0?13:47,y:9});
  studioMirror(this);const teamSide=side===0?'own':'opponent';
  this.recordOpportunities(before);
  analysisEvent('penalty',teamSide,p.name+' · 2 minuter · '+kind,p.playerId);
  if(side===0){const player=studioPlayer(side,p.playerId);if(player)player.pim=(player.pim||0)+2;}
 }
 endPenalty(stopped=false,penalty=this.penaltyList()[0],countOpportunity=true){
  if(!penalty)return;const side=penalty.side,offender=penalty.playerId;
  const before=this.opportunityState();
  const previous=[0,1].map(i=>this.strength(i));
  this.penalties=this.penaltyList().filter(p=>p!==penalty);this.syncPenalty();
  if(countOpportunity)this.recordOpportunities(before);
  if(stopped){this.otExpanded=false;this.otCounts=null;for(const i of [0,1])this.installUnit(i);return;}
  if(this.threeOnThree){this.otExpanded=true;this.otCounts=previous.map((n,i)=>Math.min(5,n+(i===side?1:0)));}
  // A queued third penalty starts now; that team must remain three skaters strong.
  const desired=this.strength(side)+(this.teams[side].pulled?1:0);
  const player=this.teams[side].players.find(p=>samePlayerId(p.id,offender)&&p.available!==false);
  const role=['LW','C','RW','LD','RD','X'].find(r=>!this.skaters(side).some(a=>a.role===r));
  if(this.skaters(side).length<desired&&player&&role){const actor=this.makeActor(side,{role,player},{x:30,y:29});actor.status='returning';this.actors.push(actor);}
  this.say('penalty-end',penalty.name+' har avtjänat sin utvisning.',side,true);
 }
 changeAtStoppage(){
  if(this.otExpanded){this.otExpanded=false;this.otCounts=null;for(const side of [0,1])this.installUnit(side);}
  for(const side of [0,1]){
   const t=this.teams[side];
   if(this.icingHold===side)continue;
   if(t.requested||t.shift>32||t.change||t.changeQueue.length||t.needsSetup){
    if(t.requested&&!t.change&&!t.changeQueue.length)this.nextUnit(side);
    else if(t.shift>32&&!t.needsSetup&&!t.change&&!t.changeQueue.length)this.nextUnit(side);
    this.installUnit(side);t.needsSetup=false;
   }
  }
 }
 resolveFlight(dt){
  const f=this.flight,landing=f?.kind==='shot'&&f.elapsed+dt>=f.duration;
  const actors=landing?this.actors.slice():null,penalty=landing?this.penaltyList().map(p=>({...p})):null,shots=this.shots.length;
  super.resolveFlight(dt);
  if(landing&&this.shots.length>shots){
   this.accountingActors=actors;studioRecordShot(this,f.shot,penalty);delete this.accountingActors;
  }
 }
 toJSON(){
  const data={...this,history:[],accountingActors:undefined};
  // Runtime interpolation is reproducible. Keep the last actual replay, not every frame.
  data.teams=this.teams.map(t=>({...t,forwards:t.forwards.map(p=>p.id),defense:t.defense.map(p=>p.id),goalie:t.goalie.id,
   change:t.change?{...t.change,row:{...t.change.row,player:t.change.row.player.id}}:null,
   changeQueue:t.changeQueue.map(r=>({...r,player:r.player.id}))}));
  data.actors=this.actors.map(a=>({...a,player:a.player.id}));return data;
 }
}
function studioEngine(){
 const e=state.live?.broadcast;if(!e)return null;
 if(!(e instanceof CareerBroadcastMatch)){
  Object.setPrototypeOf(e,CareerBroadcastMatch.prototype);
  for(const t of e.teams){const find=id=>t.players.find(p=>samePlayerId(p.id,id));t.forwards=t.forwards.map(find);t.defense=t.defense.map(find);t.goalie=find(t.goalie);
   if(t.change)t.change.row.player=find(t.change.row.player);for(const r of t.changeQueue)r.player=find(r.player);}
  for(const a of e.actors){a.player=e.teams[a.side].players.find(p=>samePlayerId(p.id,a.player));a.shift??=state.live.energy?.players?.[String(a.player.id)]?.shift||0;}
  e.upgrade();e.syncPenalty();e.history=[];e.capture();
 }
 return e;
}
function studioCreate(){
 studioPrevious=null;studioReplayState=null;
 const m=state.live;ensureLines();ensureSpecialTeams();rivalLiveSetup();
 const rosters=[managerClub(),m.opponent].map((club,side)=>{
  const source=side===0?managerRoster():state.clubRosters[club]||[];
  const plan=side===0?{...state.lines,...state.specialTeams}:{...m.aiTeam};
  const allowed=side===1?new Set([...(plan.forwards||[]),...(plan.defense||[]),...(plan.extras||[]),...(plan.goalies||[])].map(String)):null;
  const players=source.filter(p=>medicalReady(p)&&(!allowed||allowed.has(String(p.id)))).map(p=>({id:p.id,name:p.name,pos:p.pos,attributes:{...ensurePlayerAttributes(p)},fatigue:p.fatigue||0}));
  return {name:club,plan,players};
 });
 m.broadcast=new CareerBroadcastMatch(rosters,{seed:Math.floor(attrSeed(`${managerClub()}:${m.opponent}:${state.season.year}:${state.round}:${state.calendar.date}:broadcast`)*4294967296)});
 const e=m.broadcast;studioSyncPlans(e);for(const side of [0,1])e.installUnit(side);e.faceoffPositions();e.history=[];e.capture();studioMirror(e);m.rink.mode='highlights';
}
function studioSyncPlans(e=studioEngine()){
 if(!e)return;const m=state.live;ensureSpecialTeams();
 for(const t of e.teams){
  const side=t.side;for(const p of t.players){const real=studioPlayer(side,p.id);p.available=Boolean(real&&(side===0?medicalAvailable(real):medicalReady(real)&&(m.leagueBox?.players[m.opponent+':'+p.id]?.seconds||0)<medicalLimit(real)));}
  const nextPlan=side===0?{...state.lines,...state.specialTeams}:{...m.aiTeam};
  const signature=JSON.stringify(nextPlan);if(t.planSignature&&t.planSignature!==signature)t.needsSetup=true;t.planSignature=signature;t.plan=nextPlan;
  const plan=state.tacticalPlan||{},style=side===0?(plan.attackStyle||'control'):m.aiTeam?.style;
  t.tactics={mentality:style==='control'||side===0&&plan.shotChoice==='patient'?'control':style==='pressure'||style==='counter'||side===0&&plan.shotChoice==='shoot'?'direct':'balanced',pp:side===0&&['umbrella','overload'].includes(state.specialPlans?.pp)?state.specialPlans.pp:'131',pk:state.specialPlans?.pk==='diamond'&&side===0?'diamond':'box'};
  t.defenseChemistry=lineChemistry((t.plan.defense||[]).slice(t.pair*2,t.pair*2+2),side===0?managerClub():m.opponent).value;
  t.chemistry=lineChemistry((t.plan.forwards||[]).slice(t.line*3,t.line*3+3),side===0?managerClub():m.opponent).value;
  t.posture=side===0?state.tactic:(m.aiTeam?.posture||'balanced');t.tempo=side===0?plan.tempo:(m.aiTeam?.tempo||'normal');t.forecheck=side===0?plan.forecheck:style==='pressure'?'aggressive':'balanced';
  t.safeCounter=side===0&&state.specialPlans?.counter==='safe';
  t.rotation=side===0?(plan.lineUsage==='topHeavy'?[0,1,0,2,0,1,3]:plan.lineUsage==='rollFour'?[0,1,2,3]:[0,1,2,0,1,3]):RIVAL_ROTATIONS[m.aiTeam?.rotation]||[0,1,2,3];
  t.shiftLimit=side===0?(plan.shiftLength==='short'?30:plan.shiftLength==='long'?60:45):43;
  const goalie=t.players.find(p=>p.pos==='MV'&&p.available&&samePlayerId(p.id,side===0?state.lines.goalie:m.aiTeam?.keeper))||t.players.find(p=>p.pos==='MV'&&p.available);
  if(goalie&&t.goalie!==goalie){t.goalie=goalie;t.needsSetup=true;}
  const pulled=side===0?(t.wantPulled??m.goaliePulled):m.aiGoaliePulled;
  if(t.pulled!==Boolean(pulled)){t.pulled=Boolean(pulled);t.needsSetup=true;}
  if(e.actors.some(a=>a.side===side&&a.player.available===false))t.needsSetup=true;
  for(const p of t.players)if(m.energy?.players[p.id])p.energy=m.energy.players[p.id].level;
 }
 // An unavailable participant cannot stay on the ice until a routine shift.
 if(e.actors.some(a=>a.player.available===false)&&e.stoppage<=0)e.stop('stoppage','Spelet stoppas för spelarbyte.',{...e.puck});
 if(e.stoppage>0){e.changeAtStoppage();e.faceoffPositions();}

}
function studioMirror(e=studioEngine()){
 if(!e)return;const m=state.live;
 const r=m.rink||(m.rink={version:2,mode:'highlights',selected:null,oppFatigue:{},teamBonus:0});
 r.actors=(e.accountingActors||e.actors).map(a=>({key:rinkKey(a.side===0?'own':'opponent',a.player),id:a.player.id,name:a.player.name,pos:a.role==='G'?'MV':a.role==='LD'||a.role==='RD'?'B':a.player.pos,side:a.side===0?'own':'opponent',x:a.x/60*100,y:a.y/30*100,duty:a.duty}));
 r.puck={x:e.puck.x/60*100,y:e.puck.y/30*100};r.owner=e.owner===0?'own':'opponent';r.caption=e.caption;r.phase=e.eventType;r.carrier=e.carrier;r.frame=e.tick;r.passes={own:e.stats[0].passes,opponent:e.stats[1].passes};r.possession=e.possession||{own:0,opponent:0};
 r.hockey=r.hockey||{counts:{offside:{own:0,opponent:0},icing:{own:0,opponent:0},clear:{own:0,opponent:0}},icingHold:null,loose:null,stops:[]};
 r.hockey.counts.clear={own:e.stats[0].clears,opponent:e.stats[1].clears};
 m.goaliePulled=!(e.accountingActors||e.actors).some(a=>a.side===0&&a.role==='G');m.aiGoaliePulled=!(e.accountingActors||e.actors).some(a=>a.side===1&&a.role==='G');
 m.shotsHV=e.stats[0].shots;m.shotsOpp=e.stats[1].shots;
 m.faceoffsHV=e.stats[0].faceoffs;m.faceoffsOpp=e.stats[1].faceoffs;
 m.hitsHV=e.stats[0].hits||0;m.hitsOpp=e.stats[1].hits||0;
 m.currentLine=e.teams[0].line;m.currentDefensePair=e.teams[0].pair;m.rotationIndex=e.teams[0].specialIndex||0;m.shiftSeconds=e.teams[0].shift;
 for(const side of [0,1])m[side===0?'penaltiesHV':'penaltiesOpp']=e.penaltyList().filter(p=>p.side===side).map((p,i)=>({player:p.name,playerId:p.playerId,seconds:Math.ceil(p.remaining),kind:p.kind,queued:i>=2}));
 const total=r.possession.own+r.possession.opponent;m.possessionHV=total?Math.round(r.possession.own/total*100):50;
}
function studioRecordShot(e,shot,penalty){
 const local=e.time-(e.periodStart||0);state.live.minute=Math.floor((local+1e-6)/60);state.live.second=Math.floor((local+1e-6)%60);
 const m=state.live,side=shot.side===0?'own':'opponent',id=shot.playerId.slice(2),own=shot.side===0;
 studioMirror(e);
 // A PP goal ends the penalty in the simulation before the ledger is written. Use impact strength.
 const impact=Array.isArray(penalty)?penalty:penalty?[penalty]:[];
 m.penaltiesHV=impact.filter(p=>p.side===0);m.penaltiesOpp=impact.filter(p=>p.side===1);
 if(shot.quality>=.09)m[own?'chancesHV':'chancesOpp']++;
 e.highlightUntil=e.wall+(shot.outcome==='goal'?5:1.5);
 const result=shot.outcome;
 recordAnalysisShot(side,shot.player,id,shot.quality>=.09,{x:StudioHockey.progress(shot.side,shot.x)/60*100,y:shot.y/30*100},shot.quality,result,result);
 const record=m.analysis?.shots.at(-1);if(record&&shot.context){record.shotType=shot.context.type;record.explanation=studioShotReasons(shot).join(' · ');}
 if(own&&['goal','save'].includes(shot.outcome)){const p=studioPlayer(0,id);p.shots=(p.shots||0)+1;}
 if(shot.outcome==='block')m[own?'blocksOpp':'blocksHV']++;
 if(shot.outcome==='goal'){
  e.pairResults??=[{},{}];for(const teamSide of [0,1]){const ps=(e.accountingActors||e.actors).filter(a=>a.side===teamSide&&a.role!=='G');for(let i=0;i<ps.length;i++)for(let j=i+1;j<ps.length;j++){const key=dynamicsKey(ps[i].player.id,ps[j].player.id);e.pairResults[teamSide][key]=(e.pairResults[teamSide][key]||0)+(teamSide===shot.side?1:-1);}}
  m.hv=e.score[0];m.opp=e.score[1];analysisEvent('goal',side,shot.player,id);
  if(own){const p=studioPlayer(0,id);p.goals=(p.goals||0)+1;}
  if(Math.min(2,impact.filter(p=>p.side!==shot.side).length)>Math.min(2,impact.filter(p=>p.side===shot.side).length))m[own?'ppGoalsHV':'ppGoalsOpp']++;
  const seen=new Set([String(id)]);
  for(const a of shot.assists){const aid=a.id.slice(2);if(seen.has(String(aid)))continue;seen.add(String(aid));const p=studioPlayer(shot.side,aid);if(!p)continue;
   if(own){p.assists=(p.assists||0)+1;analysisAssist(p);}else leagueTrackEvent('assist','opponent',p.id,p.name);
  }
 }
 studioMirror(e);
}
function studioStep(){
 const m=state.live,e=studioEngine();if(!e||!m.running||m.finished)return;
 if(!e.started){depthLock();studioSyncPlans(e);for(const side of [0,1])e.installUnit(side);e.faceoffPositions();e.started=true;}
 if(e.tick%10===0)e.teamBonus=attrClamp(trainingMatchBonus()+lockerMatchBonus()+rivalPreparationBonus(),-6,6);
 const before=e.time,actors=e.actors.slice(),situation=analysisSituation();e.step();const seconds=Math.max(0,e.time-before);
 const local=e.time-(e.periodStart||0);m.minute=Math.floor((local+1e-6)/60);m.second=Math.floor((local+1e-6)%60);
 if(seconds>0){
  e.pairSeconds??=[{},{}];
  for(const side of [0,1]){const skaters=actors.filter(a=>a.side===side&&a.role!=='G');for(let i=0;i<skaters.length;i++){const a=skaters[i],p=studioPlayer(side,a.player.id);if(p){p.positionExperience??={};p.positionExperience[a.role]=(p.positionExperience[a.role]||0)+seconds;}for(let j=i+1;j<skaters.length;j++){const key=dynamicsKey(a.player.id,skaters[j].player.id);e.pairSeconds[side][key]=(e.pairSeconds[side][key]||0)+seconds;}}}
  e.accountingActors=actors;m.accountingSituation=situation;studioMirror(e);trackIceTime(seconds);delete m.accountingSituation;delete e.accountingActors;
  e.possession=e.possession||{own:0,opponent:0};e.possession[e.owner===0?'own':'opponent']+=seconds;
 }
 // Drain events once. Reloading cannot award a goal or penalty a second time.
 for(const event of e.events){if(!['pass','loose','shot','finished','change'].includes(event.type))addEvent(event.text,event.type==='goal'?'goal':event.type==='penalty'?'penalty':event.type==='save'?'save':'strategy');if(['offside','icing'].includes(event.type))m.rink.hockey.counts[event.type][event.side===0?'own':'opponent']++;}
 e.events=[];e.shots=[];
 matchApplyAutoPause();
 studioMirror(e);
 if(m.medicalPauseWanted){m.medicalPauseWanted=false;m.running=false;m.pauseReason='Spelarbesked måste hanteras.';studioSyncPlans(e);e.stop('stoppage','Spelet pausas för medicinsk bedömning.',{...e.puck});}
 if(e.tick%10===0){aiDecisions();studioSyncPlans(e);}
 if(m.period===4&&m.hv!==m.opp){e.finished=true;finishMatch(true);return;}
 if(e.finished){
  e.periodStart=e.time;
  if(m.period<3){matchRecover(180,`period:${m.period}`);addEvent(`Period ${m.period} är slut.`,'period');m.period++;m.minute=0;m.second=0;m.running=false;e.duration+=1200;}
  else if(m.period===3){if(m.hv!==m.opp){e.finished=true;finishMatch(false);return;}startOvertime();for(const t of e.teams){t.wantPulled=false;t.pulled=false;}e.threeOnThree=!isPlayoffMatch();e.duration+=e.threeOnThree?300:1200;}
  else if(isPlayoffMatch()){matchRecover(180,`overtime:${m.overtimePeriods||1}`);m.overtimePeriods=(m.overtimePeriods||1)+1;m.minute=0;m.second=0;m.running=false;e.duration+=1200;addEvent('Ny förlängningsperiod väntar.','period');}
  else{shootout();return;}
  matchPeriodPause();e.finished=false;e.stop('stoppage',m.period===4?'Förlängning väntar.':'Periodpaus. Nästa period väntar.');
  studioSyncPlans(e);for(const side of [0,1])e.installUnit(side);e.faceoffPositions();e.history=[];
 }
}
function studioRequestGoalie(){
 const e=studioEngine();if(!e||state.live.finished)return;const t=e.teams[0];t.wantPulled=!(t.wantPulled??t.pulled);studioSyncPlans(e);studioMirror(e);
 addEvent(t.wantPulled?'Målvaktsuttagning begärd till nästa avblåsning.':'Målvakten sätts tillbaka vid nästa avblåsning.','strategy');save();render();
}
function studioQueueUnit(kind,index){
 const e=studioEngine(),t=e?.teams[0];if(!t)return;
 if(kind==='forwards')t.nextLine=index;else if(kind==='defense')t.nextPair=index;else t.nextSpecial=index;
 t.requested=true;
 if(e.stoppage>0){e.nextUnit(0);e.installUnit(0);e.faceoffPositions();}
 studioMirror(e);matchNotice(e.stoppage>0?'Femman är redo för nedsläpp.':'Byte begärt. Spelarna byter vid ett säkert puckläge eller nästa avblåsning.');
}

let studioLastPulse=0,studioAccumulator=0,studioLastPaint=0,studioLastSave=0,studioPrevious=null,studioReplayState=null,studioRAF=false,studioCanvas=null;
function studioRestartClock(){studioLastPulse=Date.now();studioAccumulator=0;studioReplayState=null;studioSyncPlans();}
function studioPulse(){
 const m=state.live,e=studioEngine();if(!e||!m.running||m.finished)return;
 const now=Date.now(),real=Math.min(.1,Math.max(0,(now-studioLastPulse)/1000));studioLastPulse=now;
 studioAccumulator=Math.min(60,studioAccumulator+real*studioPlaybackRate(e,m));
 const goals=m.hv+m.opp,period=m.period,budget=Date.now();
 for(let i=0;studioAccumulator>=StudioHockey.STEP&&i<600&&m.running&&!m.finished&&Date.now()-budget<24;i++){
  const focus=studioShouldShow(e,m);studioPrevious=studioFrame(e);studioStep();studioAccumulator-=StudioHockey.STEP;
  if(!focus&&studioShouldShow(e,m)&&m.rink.mode!=='full'){studioAccumulator=0;break;}
 }
 if(goals!==m.hv+m.opp||period!==m.period||!m.running){render();studioLastPaint=now;}
 else if(now-studioLastPaint>500){studioRefresh();studioLastPaint=now;}
 if(now-studioLastSave>5000||!m.running){save();studioLastSave=now;}
 if(m.running&&!m.finished)matchTimer=setTimeout(studioPulse,50);
}
function studioFrame(e){return {time:e.time,phase:e.phase,eventType:e.eventType,caption:e.caption,puck:{...e.puck},carrier:e.carrier,owner:e.owner,actors:e.actors.map(a=>({id:a.id,side:a.side,role:a.role,name:a.player.name,x:a.x,y:a.y,vx:a.vx,vy:a.vy,duty:a.duty,status:a.status})),flight:e.flight?{kind:e.flight.kind,start:{...e.flight.start},end:{...e.flight.end}}:null};}
function studioShotReasons(shot){
 const c=shot.context;if(!c)return [];
 const reasons=[];
 if(c.oneTimer)reasons.push('Sidledspassning och direktskott');else if(c.rebound)reasons.push('Avslut på en lös retur');else reasons.push(c.type);
 if(c.screen>.3)reasons.push('Skymd sikt');
 if(c.pressure>.5)reasons.push('Hård press på skytten');else if(c.angle>.85)reasons.push('Snäv skottvinkel');else if(c.d<8)reasons.push('Nära mål');
 if(shot.alignment>.3)reasons.push('Målvakten hann inte täcka vinkeln');
 return reasons.slice(0,3);
}
function studioShotView(){
 const e=studioEngine(),shot=studioReplayState?e.latestReplay?.shot:e.lastShot;
 if(!shot?.context)return '<span class="broadcast-shot-label">SENASTE AVSLUTET</span><p>Här förklaras skottläget efter avslutet.</p>';
 const outcome=({goal:'Mål',save:'Räddning',block:'Blockerat',wide:'Utanför'})[shot.outcome]||'Avslut';
 return `<div><span class="broadcast-shot-label">${studioReplayState?'REPRIS':'SENASTE AVSLUTET'}</span><strong>${trainingSafe(shot.player)} <small>· ${trainingSafe(e.teams[shot.side].name)}</small></strong></div><b class="broadcast-shot-outcome ${shot.outcome==='goal'?'is-goal':''}">${outcome}</b><p>${studioShotReasons(shot).map(trainingSafe).join(' · ')}</p>`;
}
function studioView(){
 const e=studioEngine(),m=state.live,t=e.teams[0];
 const changing=t.requested||t.change||t.changeQueue.length||t.needsSetup;
 return `<section class="broadcast-view"><header><div><span class="broadcast-dot"></span><strong>${studioReplayState?'REPRIS · MATCHEN PAUSAD':m.finished?'SLUTSIGNAL':m.running?'MATCHSÄNDNING':'PAUSAT · COACHA LAGET'}</strong></div><span>${changing?'Byte begärt · inväntar säkert läge':StudioHockey.PHASES[e.phase]}</span></header><div class="broadcast-surface"><canvas id="career-ice" width="1200" height="650" role="img" aria-label="Matchsändning. ${trainingSafe(managerClub())} anfaller åt höger. Namn och istid finns under rinken."></canvas><div id="broadcast-overview" class="broadcast-overview" hidden><span>MATCHEN FORTSÄTTER</span><h3 id="broadcast-overview-title"></h3><p>Nästa farliga sekvens visas på rinken.</p><strong>${matchStats().shots[0]} – ${matchStats().shots[1]} <small>skott på mål</small></strong></div></div><div class="broadcast-caption" role="status"><strong id="broadcast-phase">${StudioHockey.PHASES[e.phase]}</strong><span id="broadcast-caption">${trainingSafe(e.caption)}</span></div><div class="broadcast-shot" aria-label="Analys av senaste avslutet">${studioShotView()}</div><footer><span>${MATCH_VIEW_MODES[m.rink.mode]||'Matchsändning'} · välj visning och hastighet ovan. Klicka på en spelare för att pausa och läsa uppgiften.</span><button class="btn secondary" onclick="${studioReplayState?'studioExitReplay()':'studioReplay()'}" ${!e.latestReplay?'disabled':''}>${studioReplayState?'Tillbaka till matchen':'↺ Senaste avslutet'}</button></footer></section>`;
}
function studioReplay(){const e=studioEngine();if(!e?.latestReplay)return;pauseMatch();studioReplayState={frames:e.latestReplay.frames,started:0};render();}
function studioExitReplay(){studioReplayState=null;render();}
function studioMount(){
 if(typeof requestAnimationFrame!=='function'||studioRAF)return;studioRAF=true;
 const draw=now=>{
  if(!studioActive()||state.page!=='match'){studioRAF=false;return;}
  const canvas=document.getElementById('career-ice'),e=studioEngine(),m=state.live;
  if(!canvas?.getContext){studioRAF=false;return;}
  if(canvas!==studioCanvas){studioCanvas=canvas;canvas.addEventListener('click',event=>{
   if(studioReplayState)return;const rect=canvas.getBoundingClientRect(),fit=Math.min(rect.width/1200,rect.height/650),x=(event.clientX-rect.left-(rect.width-1200*fit)/2)/fit,y=(event.clientY-rect.top-(rect.height-650*fit)/2)/fit,scale=1112/60;
   const point={x:(x-44)/scale,y:(y-(650-30*scale)/2)/scale};const a=e.actors.find(a=>StudioHockey.distance(a,point)<1.6);
  if(a){pauseMatch();matchNotice(a.player.name+' · '+a.duty+'. '+(a.role==='G'?'Förflyttning, positionering och reflexer avgör räddningen; puckhantering och returkontroll avgör vad som händer sedan.':a.role.endsWith('D')?'Positionering och beslut styr täckningen. Tacklingar, styrka och arbetskapacitet hjälper i puckduellerna.':'Spelförståelse och beslut hjälper spelaren välja. Passningar, puckkontroll och skott avgör utförandet.'));}
  });}
  let frame=studioFrame(e),previous=studioPrevious,blend=m.running?Math.min(1,studioAccumulator/StudioHockey.STEP):1;
  if(studioReplayState){const r=studioReplayState;if(!r.started)r.started=now;const elapsed=(now-r.started)/1000,index=Math.min(r.frames.length-1,Math.floor(elapsed/.2));frame=r.frames[Math.min(index+1,r.frames.length-1)];previous=r.frames[index];blend=index===r.frames.length-1?1:(elapsed%.2)/.2;}
  if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)blend=1;
  const teams=[managerClub(),m.opponent].map(name=>({name,...careerIdentity(name)}));MatchBroadcastRenderer.draw(canvas,frame,previous,blend,{teams});
  const overview=document.getElementById('broadcast-overview');if(overview){overview.hidden=Boolean(studioReplayState)||!m.running||studioShouldShow(e,m);document.getElementById('broadcast-overview-title').textContent=e.teams[e.owner].name+' söker nästa öppning';}
  document.getElementById('broadcast-phase').textContent=studioReplayState?'REPRIS · '+analysisTime(frame.time):StudioHockey.PHASES[e.phase];
  document.getElementById('broadcast-caption').textContent=frame.caption;
  requestAnimationFrame(draw);
 };requestAnimationFrame(draw);
}
if(typeof window!=='undefined'){
 window.addEventListener('pagehide',()=>{if(studioActive()&&state.live.running){state.live.running=false;state.live.pauseReason='Matchen sparades när du lämnade spelet.';save();}});
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&studioActive()&&state.live.running)pauseMatch('Spelet hamnade i bakgrunden.');});
}

// Keep live controls mounted. Replacing the whole page can interrupt a pointer/touch gesture.
function studioRefresh(){
 if(state.page!=='match')return;const m=state.live,e=studioEngine(),s=matchStats();
 const set=(selector,html)=>{const node=document.querySelector(selector);if(node)node.innerHTML=html;};
 set('.mc-result small',`${m.period===4?'Förlängning':'Period '+m.period} · ${gameTime()}`);
 set('.mc-result>span',m.running?'LIVE':'PAUSAT');
 if(m.running&&matchReadOnlyTab())set('.mc-coach-content',matchLivePanel());
 set('.mc-stats',matchStatCard('Skott på mål',s.shots)+matchStatCard('Farliga chanser',s.danger)+matchStatCard('Puckinnehav',s.possession,'%')+matchStatCard('Vunna tekningar',s.faceoffs)+matchStatCard('Powerplay · mål/försök',s.pp)+matchStatCard('Räddningar',s.saves));
 set('.mc-situation strong',`${e.skaters(0).length} mot ${e.skaters(1).length}${e.isShortHanded(0)?' · Boxplay':e.hasPowerPlay(0)?' · Powerplay':''}`);
 set('.mc-situation>span',`${matchPenaltyText()}${m.goaliePulled?' · Eget mål tomt':''}${m.aiGoaliePulled?' · Motståndarens mål tomt':''}`);
 const t=e.teams[0],changing=t.requested||t.change||t.changeQueue.length||t.needsSetup;
 set('.broadcast-view>header strong','MATCHSÄNDNING');set('.broadcast-view>header>span',changing?'Byte begärt · inväntar säkert läge':StudioHockey.PHASES[e.phase]);
 set('.mc-on-ice>span',`PÅ ISEN · ${changing?'BYTE PÅGÅR':e.penalty?'SPECIAL TEAMS':'KEDJA '+(t.line+1)+' · BACKPAR '+(t.pair+1)}`);
 set('.mc-on-ice>p',studioPlayers(0,false).map(p=>`<span class="${matchEnergy(p)<55?'tired':''}">${trainingSafe(p.name.split(' ').at(-1))} <small>${Math.round(matchEnergy(p))}% energi</small></span>`).join(''));
 set('.broadcast-overview>strong',`${s.shots[0]} – ${s.shots[1]} <small>skott på mål</small>`);
 set('.broadcast-shot',studioShotView());
 const replay=document.querySelector('.broadcast-view footer button');if(replay)replay.disabled=!e.latestReplay;
 const details=[...document.querySelectorAll('.mc-details')];
 for(const [i,node] of details.entries())if(node.open){
  const summary=node.querySelector('summary').outerHTML;
  node.innerHTML=summary+(i===0?matchDetailedStats():i===1?matchPlayersView():`<div class="mc-events">${m.events.map(event=>`<p><time>P${event.period} · ${event.time}</time><span>${trainingSafe(event.text)}</span></p>`).join('')}</div>`);
 }
}
