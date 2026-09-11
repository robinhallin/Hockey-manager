"use strict";

function matchEngine32Clamp(n,a,b){return Math.max(a,Math.min(b,n));}
function matchEngine32ShotZone(match,a,context={}){
  if(!a)return 'unknown';
  const p=StudioHockey.progress(a.side,a.x),lane=Math.abs((a.y??15)-15),d=context.d??Math.hypot(56.5-p,lane);
  if(p<44)return 'point';
  if(p<49)return lane<7?'high-slot':'point';
  if(d<=6||p>53.5&&lane<5)return 'net-front';
  if(lane<6&&d<=13)return 'slot';
  return 'wide';
}
function matchEngine32SaveType(match,goalie,shot,context={}){
  const zone=context.engine32Zone||context.zone||'wide',traffic=context.traffic??context.screen??0;
  const lateral=Math.abs(context.lateralSpeed||0),rebound=!!context.rebound,oneTimer=!!context.oneTimer;
  if(zone==='net-front'||rebound)return traffic>.35?'body':'pad';
  if(oneTimer||lateral>.55)return 'butterfly';
  if(zone==='point'&&traffic<.2)return 'glove';
  if(zone==='slot')return (shot?.y??15)<15?'blocker':'glove';
  return 'pad';
}
function matchEngine32ReboundControl(match,goalie,context={}){
  const control=match.attribute(goalie,'reboundControl')*.62+match.attribute(goalie,'composure')*.38;
  const chaos=(context.traffic??context.screen??0)*5+(context.oneTimer?2.2:0)+(context.rebound?2.6:0)+(context.deflection?2.8:0);
  return matchEngine32Clamp((control-chaos-8)/10,0,1);
}
function matchEngine32DirectedRebound(match,attack,spot,control,context={}){
  if(!spot)return spot;
  const p=StudioHockey.progress(attack,spot.x),goalward=matchEngine32Clamp(p,48.5,56),side=spot.y<15?-1:1;
  const danger=(context.traffic??context.screen??0)+(context.oneTimer?.22:0)+(context.deflection?.28:0)+(context.rebound?.18:0);
  if(control>.56&&danger<.7){
    const y=matchEngine32Clamp(15+side*(8.5+control*3.5),2.5,27.5);
    return {x:StudioHockey.progress(attack,matchEngine32Clamp(goalward-1.4-control*1.8,49,54.2)),y};
  }
  const pull=matchEngine32Clamp(.34+danger*.22-control*.16,.25,.72);
  return {x:StudioHockey.progress(attack,matchEngine32Clamp(goalward+(53.6-goalward)*pull,50,55.2)),y:matchEngine32Clamp(spot.y+(15-spot.y)*pull,5,25)};
}
function matchEngine32SecondChanceActive(match,a){return !!(a&&a.engine32SecondChanceUntil&&a.engine32SecondChanceUntil>=match.time);}

if(typeof StudioHockey!=="undefined"&&!StudioHockey.Match.prototype.matchEngine32Installed){
  const baseShotContext32=StudioHockey.Match.prototype.shotContext;
  const baseShotModel32=StudioHockey.Match.prototype.shotModel;
  const baseSaveRebound32=StudioHockey.Match.prototype.saveRebound;
  const baseTakePossession32=StudioHockey.Match.prototype.takePossession;
  const baseActionOptions32=StudioHockey.Match.prototype.actionOptions;

  StudioHockey.Match.prototype.shotContext=function(a){
    const context=baseShotContext32.call(this,a),zone=matchEngine32ShotZone(this,a,context);
    const secondChance=matchEngine32SecondChanceActive(this,a);
    return {...context,engine32Zone:zone,secondChance,rebound:context.rebound||secondChance};
  };

  StudioHockey.Match.prototype.shotModel=function(a,context={}){
    const model=baseShotModel32.call(this,a,context),zone=context.engine32Zone||matchEngine32ShotZone(this,a,context);
    let quality=1,goal=1;
    if(zone==='slot'){quality*=1.045;goal*=1.035;}
    else if(zone==='net-front'){quality*=1.03;goal*=1.02;}
    else if(zone==='point'){quality*=.965;goal*=.97;}
    else if(zone==='wide'){quality*=.975;goal*=.98;}
    if(context.oneTimer&&Math.abs(context.lateralSpeed||0)>.45){quality*=1.035;goal*=1.025;}
    if(context.secondChance){quality*=1.055;goal*=1.04;}
    return {...model,quality:model.quality*quality,goalChance:model.goalChance*goal,zone};
  };

  StudioHockey.Match.prototype.saveRebound=function(goalie,f){
    const shot=f?.shot||this.flight?.shot||null,context=shot?.context||{};
    const result=baseSaveRebound32.call(this,goalie,f);
    if(this.rebound?.spot){
      const attack=this.rebound.side,control=matchEngine32ReboundControl(this,goalie,context),before={...this.rebound.spot};
      this.rebound.spot=matchEngine32DirectedRebound(this,attack,before,control,context);
      const saveType=matchEngine32SaveType(this,goalie,shot,context);
      this.rebound.saveType=saveType;this.rebound.control=control;this.rebound.originalSpot=before;
      if(shot){shot.saveType=saveType;shot.reboundControl=control;shot.reboundSpot={...this.rebound.spot};}
    }
    return result;
  };

  StudioHockey.Match.prototype.takePossession=function(a,opts={}){
    const rebound=this.rebound&&this.rebound.spot&&this.time-this.rebound.time<3?{side:this.rebound.side,spot:{...this.rebound.spot},saveType:this.rebound.saveType}:null;
    const result=baseTakePossession32.call(this,a,opts);
    if(rebound&&a&&a.side===rebound.side&&a.role!=='G'&&StudioHockey.distance(a,rebound.spot)<2.35&&!this.battle){
      const owns=this.carrier===a.id||this.owner===a.side;
      if(owns){
        a.engine32SecondChanceUntil=this.time+1.8;
        this.engine32LastSecondChance={time:this.time,side:a.side,playerId:a.id,spot:rebound.spot,saveType:rebound.saveType};
      }
    }
    return result;
  };

  StudioHockey.Match.prototype.actionOptions=function(a){
    const rows=baseActionOptions32.call(this,a),context=this.shotContext(a),zone=context.engine32Zone;
    for(const row of rows){
      if(row.kind==='shoot'){
        if(context.secondChance)row.value+=.075;
        if(zone==='slot')row.value+=.035;
        if(zone==='point'&&context.traffic>.18&&matchEngine31RoleProfile(this,a)==='offensive-defense')row.value+=.04;
        if(zone==='wide'&&!context.oneTimer)row.value-=.025;
        row.shotZone=zone;row.secondChance=!!context.secondChance;
      }
    }
    return rows.sort((x,y)=>y.value-x.value);
  };

  StudioHockey.Match.prototype.matchEngine32Installed=true;
}
