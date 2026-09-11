"use strict";

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

if(typeof StudioHockey!=="undefined"&&!StudioHockey.Match.prototype.matchEngine3Installed){
  const baseContext=StudioHockey.Match.prototype.shotContext;
  const baseRebound=StudioHockey.Match.prototype.reboundModel;
  const baseShoot=StudioHockey.Match.prototype.shoot;
  StudioHockey.Match.prototype.shotContext=function(a){
    const context=baseContext.call(this,a),traffic=matchEngine3Traffic(this,a);
    const screen=Math.max((context.screen||0)*.35,traffic.score);
    return {...context,screen,traffic:traffic.score,trafficCount:traffic.count,screeners:traffic.screeners};
  };
  StudioHockey.Match.prototype.reboundModel=function(goalie,context={}){
    const model=baseRebound.call(this,goalie,context),traffic=context.traffic??context.screen??0;
    const chaos=Math.min(.24,traffic*.16+(context.oneTimer?.035:0)+(context.rebound?.025:0));
    return {freeze:Math.max(.18,model.freeze-chaos),safe:Math.max(.14,model.safe-chaos*.72)};
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
  CareerBroadcastMatch.prototype.matchEngine3PenaltiesInstalled=true;
}
