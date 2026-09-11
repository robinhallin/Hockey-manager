"use strict";

const managerJ20PathActionBase=managerJ20PathAction;
managerJ20PathAction=function(id,action){
  const player=managerJ20PathPlayer(id),plan=managerJ20PathPlan(player),result=managerJ20PathActionBase(id,action);
  if(result&&action==='promote'&&player&&plan){
    const store=state.juniors.managerDecisions??={},date=state.calendar?.date||null,key=`path-promote:${date}:${player.id}`;
    store[key]={action:'promote',playerId:player.id,playerName:player.name,matchDate:null,decisionDate:date,readiness:'Utvecklingsplan',formGames:managerJ20RecentForm(player).games,formPoints:managerJ20RecentForm(player).points,pathPace:plan.pace};
    plan.promotedDate=date;plan.updatedDate=date;
    save();render();
  }
  return result;
};
