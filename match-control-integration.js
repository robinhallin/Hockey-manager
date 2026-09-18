"use strict";

// Connect manager-facing tactical controls to the current Match Engine 3 stack.
// This file loads after match-engine-3.js so it adjusts the final action values,
// rather than duplicating or bypassing the underlying hockey model.
(function installMatchControlIntegration(){
  if(typeof StudioHockey==='undefined'||StudioHockey.Match.prototype.managerControlsInstalled)return;
  const proto=StudioHockey.Match.prototype;
  const baseActionOptions=proto.actionOptions;
  const baseSetTactics=proto.setTactics;

  proto.setTactics=function(side,plan={}){
    baseSetTactics.call(this,side,plan);
    const team=this.teams?.[side];if(!team)return;
    if(['patient','balanced','shoot'].includes(plan.shotChoice))team.tactics.shotChoice=plan.shotChoice;
    if(typeof plan.safeCounter==='boolean')team.safeCounter=plan.safeCounter;
  };

  proto.actionOptions=function(actor){
    const rows=baseActionOptions.call(this,actor),team=this.teams?.[actor?.side];
    if(!team||!actor)return rows;
    const shotChoice=team.tactics?.shotChoice||'balanced';
    const shotBias=StudioHockey.shotTacticalBias({mentality:'balanced',shotChoice});
    const shortHanded=this.isShortHanded(actor.side),safePk=shortHanded&&team.safeCounter;
    const progress=StudioHockey.progress(actor.side,actor.x),pressure=this.pressureAt(actor);

    for(const row of rows){
      if(row.kind==='shoot')row.value+=shotBias;
      if(safePk&&row.kind==='carry')row.value-=.12;
      if(safePk&&row.kind==='pass')row.value-=.11;
      // A tired unit can deliberately surrender possession beyond the centre
      // line to reach its bench. This is still a real, contestable puck flight.
      if(row.kind==='dump'&&(team.requested||team.changeQueue?.length)&&this.skaters(actor.side).some(a=>this.shiftTime(a)>(team.shiftLimit||43))){
        row.value+=.22;row.reason='Lägger pucken djupt så att den trötta formationen kan byta';
      }
    }
    if(safePk&&progress<40){
      const existing=rows.find(row=>row.kind==='clear');
      if(existing){existing.value=Math.max(existing.value,.72+pressure*.15);existing.reason='Följer boxplayordern och prioriterar en säker rensning';}
      else rows.push({kind:'clear',value:.72+pressure*.15,reason:'Följer boxplayordern och prioriterar en säker rensning'});
    }
    return rows.sort((a,b)=>b.value-a.value);
  };

  proto.managerControlsInstalled=true;
})();

// Keep playing style and shot choice independent in career matches.
if(typeof studioSyncPlans==='function'){
  const baseStudioSyncPlans=studioSyncPlans;
  studioSyncPlans=function(e=studioEngine()){
    const result=baseStudioSyncPlans(e);if(!e)return result;
    const plan=state.tacticalPlan||{};
    for(const team of e.teams||[]){
      const own=team.side===0,current=own?plan:state.live.aiTeam||{};
      const style=(own?current.attackStyle:current.style)||'control';
      team.tactics.mentality=style==='control'?'control':style==='pressure'||style==='counter'?'direct':'balanced';
      team.tactics.shotChoice=current.shotChoice||'balanced';
      team.safeCounter=own?state.specialPlans?.counter==='safe':current.counter==='safe';
    }
    return result;
  };
}

// Date-targeted office actions open the actual calendar day instead of the
// generic individual-training workspace.
if(typeof deskAction==='function'){
  const baseDeskAction=deskAction;
  deskAction=function(action){return action?.date?`officeOpenDay(${JSON.stringify(action.date)})`:baseDeskAction(action);};
}
if(typeof officePulse==='function'){
  const baseOfficePulse=officePulse;
  officePulse=function(tasks,context){
    const rows=baseOfficePulse(tasks,context);
    const today=rows.find(row=>row?.button==='Öppna dagens pass');
    if(today)today.action={date:state.calendar.date};
    return rows;
  };
}
