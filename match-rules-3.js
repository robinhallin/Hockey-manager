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
function matchRule3ApplyDeflection(match,shooter){
  const flight=match.flight,shot=flight?.shot;
  if(!shot||shot.outcome!==null||shot.context?.deflection)return false;
  const row=matchRule3DeflectionCandidates(match,shooter,flight)[0];if(!row)return false;
  const tip=row.a,chance=Math.max(.08,Math.min(.34,.045+match.attribute(tip,'positioning')*.008+match.attribute(tip,'puckControl')*.004-row.d*.04));
  if(match.random()>=chance)return false;
  const original={id:shooter.id,name:shooter.player.name,y:shooter.y,time:match.time};
  const goal={x:StudioHockey.progress(tip.side,56.5),y:15},forward=56.5-StudioHockey.progress(tip.side,tip.x),d=StudioHockey.distance(tip,goal);
  shot.originalShooter={id:original.id,name:original.name};
  shot.player=tip.player.name;shot.playerId=tip.id;shot.role=tip.role;shot.x=tip.x;shot.y=tip.y;
  shot.context={...shot.context,type:'Styrning',deflection:true,d,angle:Math.atan2(Math.abs(tip.y-15),Math.max(.1,forward)),pressure:match.pressureAt(tip),oneTimer:false,rebound:false,behind:forward<=0};
  shot.onTargetChance=Math.min(.94,(shot.onTargetChance||.6)+.04);
  const assists=[original,...(shot.assists||[])],seen=new Set([String(tip.id)]);
  shot.assists=assists.filter(a=>{const id=String(a.id);if(seen.has(id))return false;seen.add(id);return true;}).slice(0,2);
  match.stats[tip.side].deflections=(match.stats[tip.side].deflections||0)+1;match.playerEvent(tip,'deflections');
  match.say('deflection',tip.player.name+' får klubban på skottet framför mål.',tip.side,true,{originalShooter:original.name});
  return true;
}

if(typeof StudioHockey!=="undefined"&&!StudioHockey.Match.prototype.matchRules3Installed){
  const baseShoot=StudioHockey.Match.prototype.shoot;
  StudioHockey.Match.prototype.shoot=function(a){
    const started=baseShoot.call(this,a);
    if(started)matchRule3ApplyDeflection(this,a);
    return started;
  };
  StudioHockey.Match.prototype.matchRules3Installed=true;
}
