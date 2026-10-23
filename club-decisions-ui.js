'use strict';
// Integrate after room modules; core and save validation load before startup.

const clubDepthAgendaView=managerAgendaView;
managerAgendaView=function(){return clubDecisionDailyView();};
const clubDepthOverview=overviewWorkspaceView;
overviewWorkspaceView=function(){return overviewUI.stories?storiesView():clubDepthOverview();};
const clubDepthSystemsDay=managerSystemsDay;
managerSystemsDay=function(){const result=clubDepthSystemsDay();clubDecisionCapture();return result;};
const clubDepthCases=managerLinkedDecisionItems;
managerLinkedDecisionItems=function(){
 const items=clubDepthCases();
 for(const p of clubDecisionStore()?.plans||[])if(!p.closed&&(p.due<=state.calendar.date||clubPlanEvidence(p).changed))items.push({id:'club-plan:'+p.playerId,title:p.name+': följ upp truppplanen',detail:clubPlanEvidence(p).text,due:p.due,owner:'Du',tag:'Truppplan',area:'contracts',level:'high',score:82,action:{page:'inbox'}});
 for(const s of state.stories?.active||[])if(s.club===managerClub()&&s.year===state.season.year)items.push({id:'club-story:'+s.id,title:s.title,detail:storiesNext(s),owner:'Du',tag:'Satsning & historia',area:'locker',level:'medium',score:s.status==='decision'?79:55,monitoring:s.status==='following',action:{storyId:s.id,page:'stories'}});
 return items;
};
const clubDepthOfficeAction=managerOffice2Action;
managerOffice2Action=function(item){return item.id.startsWith('club-plan:')?'clubDecisionOpen()':item.action?.storyId?'storiesOpen('+JSON.stringify(item.action.storyId)+')':clubDepthOfficeAction(item);};
const clubDepthDecisionOutcome=managerLinkedDecisionOutcome;
managerLinkedDecisionOutcome=function(id){
 if(id.startsWith('club-story:')){const s=storiesFind(id.slice(11));if(s?.status==='closed')return s.outcome+'. '+(s.chapters.at(-1)?.text||'');}
 if(id.startsWith('club-plan:')){const p=clubDecisionStore()?.plans.find(p=>p.playerId===id.slice(10)&&p.closed);if(p)return p.outcome;}
 return clubDepthDecisionOutcome(id);
};
const clubDepthSquad=squadWorkspaceView;
squadWorkspaceView=function(){const html=clubDepthSquad(),p=squadSelected();return html+(p?clubCompetitionView(p):clubSelectionView())+clubContractPlansView();};
const clubDepthSquadPanel=squadPlayerPanel;
squadPlayerPanel=function(rows,tab){const html=clubDepthSquadPanel(rows,tab),p=squadSelected();return p?html.replace('<nav aria-label="Åtgärder för vald spelare">','<nav aria-label="Åtgärder för vald spelare">'+clubDecisionButton('Konkurrens & provperiod','clubCompetitionOpen',[p.id])):html;};
const clubDepthTactics=tacticsWorkspaceView;
tacticsWorkspaceView=function(){return clubDepthTactics()+clubSelectionView();};
const clubDepthInspector=developmentInspector;
developmentInspector=function(p,junior=false,medical=false){return clubDepthInspector(p,junior,medical)+(!medical&&p&&isOwnPlayer(p)?clubCompetitionView(p):'');};
const clubDepthImpact=squadDecisionImpactView;
squadDecisionImpactView=function(p,...args){return clubDepthImpact(p,...args)+(p?`<details class="cw-section"><summary>Nuvarande uttagning och juniorernas utrymme</summary>${clubCompetitionView(p)}</details>`:'');};
const clubDepthStoryDetail=storiesDetail;
storiesDetail=function(story){
 const html=clubDepthStoryDetail(story),p=storiesPlayer(story.ids[0]);
 if(!p||story.type!=='breakthrough'||story.status!=='decision')return html;
 return html.replace('<section class="story-decision">',`<section class="cw-section"><h3>Innan du lämnar beskedet</h3><p>${trainingSafe(clubTrialTradeoff(p))}</p><p>Provperioden ändrar inte någon annans avtal. Konkurrerande löften behöver hanteras genom verklig uttagning eller ett samtal.</p></section><section class="story-decision">`);
};
const clubDepthRoomPanel=clubhouseRoomsPanel;
clubhouseRoomsPanel=function(m){
 let html=clubDepthRoomPanel(m),room=clubhouseRoomsKey();
 if(!CLUBHOUSE_WORKROOMS[room]||clubhouseUI.player||clubhouseUI.wardrobe||clubhouseUI.briefing||roomCoachUI.initiative||roomCoachUI.board||roomCoachUI.step)return html;
 if(room==='office'&&(!clubhouseRoomsUI.station||clubhouseRoomsUI.station==='desk')){
  // The daily workspace owns the queue; don't repeat the same contract case
  // in the room's visitor call, initiatives and desk list.
  const start=html.indexOf('<div class="cr-side-body">'),end=html.lastIndexOf('</div><footer>');
  if(start>=0&&end>start)return html.slice(0,start)+'<div class="cr-side-body">'+roomCoachMatchCard()+clubRoomInsight(room)+roomCoachHistory().map(h=>`<p class="cw-muted">${trainingSafe(h.title)} · ${trainingSafe(h.text)}</p>`).join('')+html.slice(end);
 }
 return html.replace('<div class="cr-side-body">','<div class="cr-side-body">'+clubRoomInsight(room));
};
// Keep an expanded plan and the edited control through a same-page rerender.
// This is disposable presentation state, never a second career save.
const clubDepthRender=render;
let clubDepthRenderContext=null;
render=function(){
 const selector='details.cw-contracts, .cw-competition > details',key=el=>el.className+'|'+(el.querySelector('summary')?.textContent||'').split(' · ')[0];
 const opened=Array.from(document.querySelectorAll(selector)).filter(el=>el.open).map(key),focus=document.activeElement?.id,context=JSON.stringify([state.page,managerClub(),state.calendar?.date]);
 const restore=clubDepthRenderContext===context,result=clubDepthRender();
 if(restore&&context===JSON.stringify([state.page,managerClub(),state.calendar?.date])){
  for(const el of document.querySelectorAll(selector))if(opened.includes(key(el)))el.open=true;
  if(focus?.startsWith('cw-plan-'))document.getElementById(focus)?.focus?.({preventScroll:true});
 }
 clubDepthRenderContext=JSON.stringify([state.page,managerClub(),state.calendar?.date]);
 return result;
};

