"use strict";

function matchRule3Lane(point,a,b){
  const dx=b.x-a.x,dy=b.y-a.y,len=dx*dx+dy*dy,t=len?Math.max(0,Math.min(1,((point.x-a.x)*dx+(point.y-a.y)*dy)/len)):0;
  const x=a.x+dx*t,y=a.y+dy*t;
  return {t,d:Math.hypot(point.x-x,point.y-y)};
}
function matchRule3DeflectionCandidates(match,shooter,flight){
  if(!match||!shooter||!flight?.shot)return [];
  return match.skaters(shooter.side).filter(a=>a.id!==shooter.id&&!['leaving','entering'].includes(a.status)).map(a=>({a,...matchRule3Lane(a,flight.start,flight.end)})).filter(row=>{
    const p=StudioHockey.progress(shooter.side,row.a.x);
    return p>49&&p<57.5&&row.t>.25&&row.t<.96&&row.d<1.05&&StudioHockey.distance(row.a,shooter)>2;
  }).sort((x,y)=>x.d-y.d||StudioHockey.progress(shooter.side,y.a.x)-StudioHockey.progress(shooter.side,x.a.x));
}
function matchRule3PrepareDeflection(match,shooter){
  const flight=match.flight,shot=flight?.shot;if(!shot||shot.outcome!==null||shot.context?.deflection)return false;
  const row=matchRule3DeflectionCandidates(match,shooter,flight)[0];if(!row)return false;
  flight.deflectionCandidate={id:row.a.id,t:row.t,chance:Math.max(.08,Math.min(.34,.045+match.attribute(row.a,'positioning')*.008+match.attribute(row.a,'puckControl')*.004-row.d*.04)),shooterId:shooter.id,shooterName:shooter.player.name};
  return true;
}
function matchRule3ApplyDeflection(match,candidate){
  const flight=match.flight,shot=flight?.shot;if(!candidate||!shot||flight.deflectionResolved||shot.outcome!==null||shot.context?.deflection)return false;
  flight.deflectionResolved=true;
  const tip=match.actor(candidate.id),shooter=match.actor(candidate.shooterId);if(!tip||!shooter||tip.side!==shooter.side||['leaving','entering'].includes(tip.status))return false;
  const crossing={x:flight.start.x+(flight.end.x-flight.start.x)*candidate.t,y:flight.start.y+(flight.end.y-flight.start.y)*candidate.t};
  if(StudioHockey.distance(tip,crossing)>1.35||match.random()>=candidate.chance)return false;
  const original={id:shooter.id,name:candidate.shooterName||shooter.player.name,y:shooter.y,time:match.time},tipContext=match.shotContext(tip);
  shot.originalShooter={id:original.id,name:original.name};
  shot.player=tip.player.name;shot.playerId=tip.id;shot.role=tip.role;shot.x=tip.x;shot.y=tip.y;
  shot.context={...tipContext,type:'Styrning',deflection:true,oneTimer:false,rebound:false,lateralSpeed:0};
  shot.onTargetChance=Math.min(.94,(shot.onTargetChance||.6)+.04);
  const assists=[original,...(shot.assists||[])],seen=new Set([String(tip.id)]);
  shot.assists=assists.filter(a=>{const id=String(a.id);if(seen.has(id))return false;seen.add(id);return true;}).slice(0,2);
  match.stats[tip.side].deflections=(match.stats[tip.side].deflections||0)+1;match.playerEvent(tip,'deflections');
  match.say('deflection',tip.player.name+' får klubban på skottet framför mål.',tip.side,true,{originalShooter:original.name});
  return true;
}

if(typeof StudioHockey!=="undefined"&&!StudioHockey.Match.prototype.matchRules3Installed){
  const baseShoot=StudioHockey.Match.prototype.shoot,baseResolveFlight=StudioHockey.Match.prototype.resolveFlight;
  StudioHockey.Match.prototype.shoot=function(a){
    const started=baseShoot.call(this,a);if(started)matchRule3PrepareDeflection(this,a);return started;
  };
  StudioHockey.Match.prototype.resolveFlight=function(dt){
    const f=this.flight;
    if(f?.kind==='shot'&&f.deflectionCandidate&&!f.deflectionResolved){
      const next=Math.min(1,(f.elapsed+dt)/Math.max(.001,f.duration));
      if(next>=f.deflectionCandidate.t)matchRule3ApplyDeflection(this,f.deflectionCandidate);
    }
    return baseResolveFlight.call(this,dt);
  };
  StudioHockey.Match.prototype.matchRules3Installed=true;
}

// Match calibration v2: keep attributes meaningful, but reduce compounding across
// speed, possession, decisions and finishing. The same rules apply to the lab and
// career broadcast; presentation speed never changes these values.
function matchCalibrationAttribute(value){return 10+(value-10)*.88;}
if(typeof StudioHockey!=="undefined"&&!StudioHockey.Match.prototype.matchCalibration2Installed){
  const baseAttribute=StudioHockey.Match.prototype.attribute,baseShotModel=StudioHockey.Match.prototype.shotModel;
  StudioHockey.Match.prototype.attribute=function(a,key){return matchCalibrationAttribute(baseAttribute.call(this,a,key));};
  StudioHockey.Match.prototype.readDelay=function(a){
    const reading=this.attribute(a,'decisions')*.4+this.attribute(a,'vision')*.25+this.attribute(a,'puckControl')*.35;
    return Math.max(.42,Math.min(1.35,1.15-reading*.03+this.pressureAt(a)*(20-this.attribute(a,'composure'))*.016));
  };
  StudioHockey.Match.prototype.shotModel=function(a,context){
    const model=baseShotModel.call(this,a,context);
    return {...model,goalChance:model.goalChance*.75,quality:model.quality*.75};
  };
  StudioHockey.Match.prototype.matchCalibration2Installed=true;
}
if(typeof CareerBroadcastMatch!=="undefined"&&!CareerBroadcastMatch.prototype.matchCalibration2Installed){
  const careerAttribute=CareerBroadcastMatch.prototype.attribute;
  CareerBroadcastMatch.prototype.attribute=function(a,key){return matchCalibrationAttribute(careerAttribute.call(this,a,key));};
  CareerBroadcastMatch.prototype.matchCalibration2Installed=true;
}
