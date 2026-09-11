"use strict";

const matchEngine3Clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function matchEngine3Lane(point,a,b){
  const dx=b.x-a.x,dy=b.y-a.y,len=dx*dx+dy*dy;
  const t=len?Math.max(0,Math.min(1,((point.x-a.x)*dx+(point.y-a.y)*dy)/len)):0;
  const x=a.x+dx*t,y=a.y+dy*t;
  return {t,d:Math.hypot(point.x-x,point.y-y)};
}
function matchEngine3Traffic(match,shooter){
  if(!match||!shooter)return {score:0,count:0,screeners:[]};
  const goal={x:StudioHockey.progress(shooter.side,56.5),y:15};
  const rows=(match.actors||[]).filter(a=>a.id!==shooter.id&&a.role!=='G'&&!['leaving','entering'].includes(a.status)).map(a=>{
    const lane=matchEngine3Lane(a,shooter,goal),progress=StudioHockey.progress(shooter.side,a.x);
    const nearGoal=Math.max(0,1-Math.abs(progress-54)/8),body=Math.max(0,1-lane.d/1.45);
    const same=a.side===shooter.side;
    return {a,...lane,weight:body*nearGoal*(same?1:.72)};
  }).filter(r=>r.t>.2&&r.t<.99&&r.d<1.45&&r.weight>.02).sort((a,b)=>b.weight-a.weight);
  const score=Math.max(0,Math.min(1,rows.reduce((n,r)=>n+r.weight*.62,0)));
  return {score,count:rows.length,screeners:rows.slice(0,3).map(r=>({id:r.a.id,name:r.a.player.name,side:r.a.side,d:r.d,t:r.t}))};
}
function matchEngine3ContactPressure(match,carrier){
  if(!match||!carrier)return {score:0,nearest:null};
  const defenders=match.skaters(1-carrier.side).filter(a=>!['leaving','entering'].includes(a.status)).map(a=>{
    const d=StudioHockey.distance(a,carrier);if(d>3.1)return null;
    const checking=match.attribute(a,'checking'),strength=match.attribute(a,'strength'),work=match.attribute(a,'workRate');
    const relative=Math.hypot((a.vx||0)-(carrier.vx||0),(a.vy||0)-(carrier.vy||0));
    const skill=(checking*.48+strength*.28+work*.24)/20;
    const proximity=matchEngine3Clamp(1-d/3.1,0,1),speed=matchEngine3Clamp(relative/5.5,0,1);
    return {a,d,score:proximity*(.55+skill*.32+speed*.18)};
  }).filter(Boolean).sort((a,b)=>b.score-a.score);
  const best=defenders[0];return {score:matchEngine3Clamp(best?.score||0,0,1),nearest:best?.a||null};
}

if(typeof StudioHockey!=="undefined"&&!StudioHockey.Match.prototype.matchEngine3Installed){
  const baseContext=StudioHockey.Match.prototype.shotContext;
  const baseRebound=StudioHockey.Match.prototype.reboundModel;
  const baseShoot=StudioHockey.Match.prototype.shoot;
  const baseBattleChance=StudioHockey.Match.prototype.battleChance;
  const baseBattleStrength=StudioHockey.Match.prototype.battleStrength;
  const baseStartBattle=StudioHockey.Match.prototype.startBattle;
  StudioHockey.Match.prototype.shotContext=function(a){
    const context=baseContext.call(this,a),traffic=matchEngine3Traffic(this,a),contact=matchEngine3ContactPressure(this,a);
    const screen=Math.max((context.screen||0)*.35,traffic.score);
    return {...context,screen,traffic:traffic.score,trafficCount:traffic.count,screeners:traffic.screeners,contactPressure:contact.score,pressure:Math.max(context.pressure||0,contact.score*.9)};
  };
  StudioHockey.Match.prototype.reboundModel=function(goalie,context={}){
    const model=baseRebound.call(this,goalie,context),traffic=context.traffic??context.screen??0;
    const chaos=Math.min(.24,traffic*.16+(context.oneTimer?.035:0)+(context.rebound?.025:0));
    return {freeze:Math.max(.18,model.freeze-chaos),safe:Math.max(.14,model.safe-chaos*.72)};
  };
  StudioHockey.Match.prototype.battleChance=function(defender,carrier){
    const base=baseBattleChance.call(this,defender,carrier),relative=Math.hypot((defender.vx||0)-(carrier.vx||0),(defender.vy||0)-(carrier.vy||0));
    const board=this.puck.y<4||this.puck.y>26||this.puck.x<3||this.puck.x>57;
    const leverage=(this.attribute(defender,'checking')+this.attribute(defender,'strength')-this.attribute(carrier,'puckControl')-this.attribute(carrier,'strength'))*.004;
    return matchEngine3Clamp(base+matchEngine3Clamp((relative-1.5)*.018,0,.08)+(board?.025:0)+leverage,.06,.62);
  };
  StudioHockey.Match.prototype.battleStrength=function(a){
    const base=baseBattleStrength.call(this,a),speed=Math.hypot(a.vx||0,a.vy||0),board=this.battle?.boards;
    return base+Math.min(2.2,speed*.36)+(board?this.attribute(a,'strength')*.035:0);
  };
  StudioHockey.Match.prototype.startBattle=function(a,b){
    const relative=a&&b?Math.hypot((a.vx||0)-(b.vx||0),(a.vy||0)-(b.vy||0)):0,started=baseStartBattle.call(this,a,b);
    if(started&&this.battle){
      this.battle.impact=relative;
      if(relative>3.4){a.contactImpactUntil=b.contactImpactUntil=this.time+2.2;this.say('contact',(a.player.name+' och '+b.player.name.split(' ').at(-1)+' går in hårt i närkampen.'),a.side,relative>4.5);}
    }
    return started;
  };
  StudioHockey.Match.prototype.shoot=function(a){
    const started=baseShoot.call(this,a);
    const shot=this.flight?.shot;
    if(started&&shot?.context?.traffic>.12){
      this.stats[a.side].trafficShots=(this.stats[a.side].trafficShots||0)+1;
      shot.context.trafficShot=true;
    }
    return started;
  };
  StudioHockey.Match.prototype.matchEngine3Installed=true;
}

function matchEngine3PenaltyOffender(match,side,name){
  return match.skaters(side).find(a=>a.player.name===name)||match.skaters(side)[0]||null;
}
function matchEngine3AddPenalty(match,side,name,{kind='boarding',minutes=5,affectsStrength=true,releasable=false,label=null}={}){
  const offender=matchEngine3PenaltyOffender(match,side,name);if(!offender)return false;
  const before=match.opportunityState?.();
  const p={side,remaining:minutes*60,name:offender.player.name,playerId:offender.player.id,kind,minutes,affectsStrength,releasable,label:label||kind};
  match.penaltyList().push(p);match.syncPenalty();match.otCounts=null;
  for(const i of [0,1])match.installUnit(i);
  match.stop('penalty',p.name+' utvisas '+minutes+' minuter för '+p.label+'.',{x:side===0?13:47,y:9});
  if(typeof studioMirror==='function')studioMirror(match);
  if(before&&typeof match.recordOpportunities==='function')match.recordOpportunities(before);
  if(typeof analysisEvent==='function')analysisEvent('penalty',side===0?'own':'opponent',p.name+' · '+minutes+' minuter · '+p.label,p.playerId);
  if(side===0&&typeof studioPlayer==='function'){
    const player=studioPlayer(side,p.playerId);if(player)player.pim=(player.pim||0)+minutes;
  }
  return p;
}

if(typeof CareerBroadcastMatch!=="undefined"&&!CareerBroadcastMatch.prototype.matchEngine3PenaltiesInstalled){
  const baseGivePenalty=CareerBroadcastMatch.prototype.givePenalty;
  CareerBroadcastMatch.prototype.penaltyCount=function(side){
    return Math.min(2,this.penaltyList().filter(p=>p.side===side&&p.affectsStrength!==false).length);
  };
  CareerBroadcastMatch.prototype.goalPenalty=function(side){
    if(!this.hasPowerPlay(side))return;
    const first=this.penaltyList().filter(p=>p.side!==side&&p.affectsStrength!==false&&p.releasable!==false).slice(0,2).sort((a,b)=>a.remaining-b.remaining)[0];
    if(first)this.endPenalty(true,first);
  };
  CareerBroadcastMatch.prototype.giveMajorPenalty=function(side,name,kind='boarding'){
    const labels={boarding:'boarding','checking-from-behind':'checking bakifrån',fighting:'slagsmål',kneeing:'knätackling'};
    return matchEngine3AddPenalty(this,side,name,{kind,minutes:5,affectsStrength:true,releasable:false,label:labels[kind]||kind});
  };
  CareerBroadcastMatch.prototype.giveMisconduct=function(side,name,kind='misconduct'){
    const labels={misconduct:'misconduct','abuse-of-officials':'olämpligt uppträdande mot domare'};
    return matchEngine3AddPenalty(this,side,name,{kind,minutes:10,affectsStrength:false,releasable:false,label:labels[kind]||kind});
  };
  CareerBroadcastMatch.prototype.givePenalty=function(side,name,kind=null){
    if(kind)return baseGivePenalty.call(this,side,name,kind);
    const offender=matchEngine3PenaltyOffender(this,side,name);
    if(offender){
      const carrier=this.actor(this.carrier),relative=carrier?Math.hypot((offender.vx||0)-(carrier.vx||0),(offender.vy||0)-(carrier.vy||0)):0;
      const discipline=this.attribute(offender,'discipline'),reckless=matchEngine3Clamp((13-discipline)*.008+Math.max(0,relative-3)*.012,0,.08);
      if(this.random()<reckless){const kinds=['boarding','checking-from-behind','kneeing'];return this.giveMajorPenalty(side,name,kinds[Math.floor(this.random()*kinds.length)]);}
    }
    return baseGivePenalty.call(this,side,name,null);
  };
  CareerBroadcastMatch.prototype.matchEngine3PenaltiesInstalled=true;
}

function matchEngine31RoleProfile(match,a){
  if(!a||a.role==='G')return 'goalie';
  const shoot=match.attribute(a,'shooting'),passing=match.attribute(a,'passing'),strength=match.attribute(a,'strength'),checking=match.attribute(a,'checking'),position=match.attribute(a,'positioning'),control=match.attribute(a,'puckControl');
  if(a.role==='LD'||a.role==='RD')return shoot+passing>=29?'offensive-defense':'defensive-defense';
  if(shoot>=15&&shoot>=passing+1)return 'sniper';
  if(strength+checking>=29&&position>=12)return 'power-forward';
  if(passing+control>=30)return 'playmaker';
  return 'two-way-forward';
}
function matchEngine31ReboundClaim(match,side,spot){
  const rows=match.skaters(side).filter(a=>!['leaving','entering'].includes(a.status)).map(a=>{
    const d=StudioHockey.distance(a,spot),role=matchEngine31RoleProfile(match,a),inside=matchEngine3Clamp(1-d/7,0,1);
    const positioning=match.attribute(a,'positioning')/20,work=match.attribute(a,'workRate')/20,strength=match.attribute(a,'strength')/20;
    const roleBonus=role==='power-forward'?.14:role==='sniper'?.07:role==='defensive-defense'?-.03:0;
    return {a,d,score:inside*.48+positioning*.24+work*.18+strength*.10+roleBonus};
  }).sort((a,b)=>b.score-a.score);
  return rows[0]||null;
}

if(typeof StudioHockey!=="undefined"&&!StudioHockey.Match.prototype.matchEngine31Installed){
  const baseGoalieTarget31=StudioHockey.Match.prototype.goalieTarget;
  const baseTargets31=StudioHockey.Match.prototype.targets;
  const baseActionOptions31=StudioHockey.Match.prototype.actionOptions;
  const baseSaveRebound31=StudioHockey.Match.prototype.saveRebound;
  const baseTakePossession31=StudioHockey.Match.prototype.takePossession;
  StudioHockey.Match.prototype.goalieTarget=function(side,puck=this.puck){
    const target=baseGoalieTarget31.call(this,side,puck),goalie=this.actors.find(a=>a.side===side&&a.role==='G');if(!goalie)return target;
    const source=this.flight?.kind==='shot'?this.flight.start:puck,last=goalie.engine31LastRead||{x:source.x,y:source.y,time:this.time};
    const lateral=Math.abs((source.y??15)-(last.y??15)),dt=Math.max(.1,this.time-(last.time??this.time));
    const movement=this.attribute(goalie,'movement'),recovery=this.attribute(goalie,'reboundControl')*.5+this.attribute(goalie,'composure')*.5;
    const lag=matchEngine3Clamp(lateral/10-movement*.018,0,.7),reboundLag=this.rebound&&this.time-this.rebound.time<1.8?matchEngine3Clamp((20-recovery)*.018,0,.28):0;
    goalie.engine31LastRead={x:source.x,y:source.y,time:this.time};
    const ownGoal=StudioHockey.progress(side,4.4),dir=side===0?1:-1;
    return {x:matchEngine3Clamp(target.x-dir*(lag+reboundLag),1,59),y:matchEngine3Clamp(target.y+(last.y-source.y)*(lag*.18),1,29)};
  };
  StudioHockey.Match.prototype.targets=function(){
    baseTargets31.call(this);
    if(!this.rebound?.spot||this.time-this.rebound.time>3)return;
    const attack=this.rebound.side,spot=this.rebound.spot,att=matchEngine31ReboundClaim(this,attack,spot),def=matchEngine31ReboundClaim(this,1-attack,spot);
    if(att?.a)this.assign(att.a,spot,matchEngine31RoleProfile(this,att.a)==='power-forward'?'Kraschar mot mål för returen':'Jagar returen framför mål');
    if(def?.a)this.assign(def.a,{x:spot.x+(def.a.side===0?-.45:.45),y:spot.y},'Boxar ut framför mål och skyddar returen');
  };
  StudioHockey.Match.prototype.actionOptions=function(a){
    const rows=baseActionOptions31.call(this,a),role=matchEngine31RoleProfile(this,a),context=this.shotContext(a),p=StudioHockey.progress(a.side,a.x);
    for(const row of rows){
      if(row.kind==='shoot'){
        if(role==='sniper')row.value+=context.d<16?.09:.04;
        if(role==='offensive-defense')row.value+=(p>40&&p<48&&context.traffic>.15)?.07:-.015;
        if(role==='power-forward')row.value+=context.d<8||context.rebound?.10:-.025;
        if(role==='playmaker'&&context.d>7)row.value-=.045;
        if(role==='defensive-defense')row.value-=.055;
        row.roleProfile=role;
      }
      if(row.kind==='pass'&&role==='playmaker')row.value+=.055;
      if(row.kind==='carry'&&role==='power-forward'&&context.pressure>.25)row.value+=.025;
    }
    return rows.sort((x,y)=>y.value-x.value);
  };
  StudioHockey.Match.prototype.saveRebound=function(goalie,f){
    baseSaveRebound31.call(this,goalie,f);
    if(this.rebound?.spot){
      const attack=this.rebound.side,att=matchEngine31ReboundClaim(this,attack,this.rebound.spot),def=matchEngine31ReboundClaim(this,1-attack,this.rebound.spot);
      this.rebound.attackClaim=att?{id:att.a.id,score:att.score}:null;this.rebound.defenseClaim=def?{id:def.a.id,score:def.score}:null;
    }
  };
  StudioHockey.Match.prototype.takePossession=function(a,opts){
    if(this.rebound?.spot&&a&&this.time-this.rebound.time<3&&StudioHockey.distance(a,this.rebound.spot)<2.1){
      const other=matchEngine31ReboundClaim(this,1-a.side,this.rebound.spot);
      if(other?.a&&other.d<2.2&&a.role!=='G'&&this.random()<.42){
        this.startBattle(a,other.a);return;
      }
    }
    return baseTakePossession31.call(this,a,opts);
  };
  StudioHockey.Match.prototype.matchEngine31Installed=true;
}
