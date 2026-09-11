"use strict";

const MatchEventStream=(()=>{
 const VERSION=1;
 const create=(meta={})=>({version:VERSION,meta:{...meta},seq:0,events:[],ice:{},baseline:{score:[0,0],shots:[0,0],attempts:[0,0],saves:[0,0],pp:[0,0],ppGoals:[0,0]}});
 const ensureShape=stream=>{
  if(!stream||typeof stream!=="object")return create();
  stream.version=VERSION;stream.meta??={};stream.seq??=0;stream.events??=[];stream.ice??={};
  stream.baseline??={score:[0,0],shots:[0,0],attempts:[0,0],saves:[0,0],pp:[0,0],ppGoals:[0,0]};
  for(const key of ['score','shots','attempts','saves','pp','ppGoals'])stream.baseline[key]??=[0,0];
  return stream;
 };
 const emit=(stream,type,payload={})=>{
  stream=ensureShape(stream);
  const event={seq:++stream.seq,type,seconds:Number(payload.seconds)||0,side:Number.isFinite(payload.side)?payload.side:null,...payload};
  stream.events.push(event);return event;
 };
 const addIce=(stream,side,playerId,seconds)=>{
  if(!(seconds>0)||playerId==null)return;
  stream=ensureShape(stream);const key=side+':'+playerId;stream.ice[key]=(stream.ice[key]||0)+seconds;
 };
 const summary=stream=>{
  stream=ensureShape(stream);
  const base=stream.baseline||{},out={version:VERSION,score:[...(base.score||[0,0])],shots:[...(base.shots||[0,0])],attempts:[...(base.attempts||[0,0])],saves:[...(base.saves||[0,0])],pp:[...(base.pp||[0,0])],ppGoals:[...(base.ppGoals||[0,0])],players:{},ice:{...stream.ice},events:stream.events.length};
  const player=(side,id,name)=>{const key=side+':'+id;return out.players[key]??=(out.players[key]={side,id,name:name||'',shots:0,goals:0,assists:0,pim:0,ice:out.ice[key]||0});};
  for(const e of stream.events){
   if(e.type==='shot'&&Number.isFinite(e.side)){
    out.attempts[e.side]++;if(['goal','save'].includes(e.outcome))out.shots[e.side]++;
    if(e.outcome==='save')out.saves[1-e.side]++;
    if(e.playerId!=null&&['goal','save'].includes(e.outcome))player(e.side,e.playerId,e.player).shots++;
    if(e.outcome==='goal'){
     out.score[e.side]++;if(e.powerPlay)out.ppGoals[e.side]++;
     if(e.playerId!=null)player(e.side,e.playerId,e.player).goals++;
     for(const a of e.assists||[])if(a?.id!=null)player(e.side,a.id,a.name).assists++;
    }
   }else if(e.type==='pp-start'&&Number.isFinite(e.side))out.pp[e.side]++;
   else if(e.type==='penalty'&&Number.isFinite(e.side)&&e.playerId!=null)player(e.side,e.playerId,e.player).pim+=(e.minutes||2);
   else if(e.type==='assist'&&Number.isFinite(e.side)&&e.playerId!=null)player(e.side,e.playerId,e.player).assists++;
  }
  for(const [key,seconds] of Object.entries(out.ice)){if(out.players[key])out.players[key].ice=seconds;}
  return out;
 };
 const liveStream=(e,reset=false)=>{
  if(typeof state==='undefined'||!state.live)return null;
  if(reset||!state.live.eventStream){
   const existing=reset?null:state.live.eventStream;
   state.live.eventStream=ensureShape(existing||create({source:'live',club:typeof managerClub==='function'?managerClub():null,opponent:state.live.opponent||null}));
   if(!reset&&e&&state.live.eventStream.events.length===0&&e.time>1){
    state.live.eventStream.baseline={score:[...(e.score||[0,0])],shots:[e.stats?.[0]?.shots||0,e.stats?.[1]?.shots||0],attempts:[e.stats?.[0]?.attempts||0,e.stats?.[1]?.attempts||0],saves:[e.stats?.[0]?.saves||0,e.stats?.[1]?.saves||0],pp:[state.live.ppHV||0,state.live.ppOpp||0],ppGoals:[state.live.ppGoalsHV||0,state.live.ppGoalsOpp||0]};
   }
  }
  return state.live.eventStream;
 };
 const syncLive=(e)=>{
  if(typeof state==='undefined'||!state.live?.eventStream)return null;
  const s=summary(state.live.eventStream),m=state.live;
  m.matchEventSummary=s;m.shotsHV=s.shots[0];m.shotsOpp=s.shots[1];m.hv=s.score[0];m.opp=s.score[1];m.ppHV=s.pp[0];m.ppOpp=s.pp[1];m.ppGoalsHV=s.ppGoals[0];m.ppGoalsOpp=s.ppGoals[1];
  if(e){e.eventStreamVersion=VERSION;e.eventSummary=s;}
  return s;
 };
 const backgroundFromResult=(result)=>{
  const stream=create({source:'background'}),reports=result?.reports||[],rows=result?.rows||[];
  const clubBySide=reports.map(r=>r.club);
  for(let side=0;side<2;side++){
   const report=reports[side]||{},teamRows=rows.filter(r=>r.club===clubBySide[side]||r.team===clubBySide[side]);
   for(let i=0;i<(report.pp||0);i++)emit(stream,'pp-start',{side,seconds:0});
   const shotRows=[];for(const r of teamRows)for(let i=0;i<(r.shots||0);i++)shotRows.push(r);
   const goals=[];for(const r of teamRows)for(let i=0;i<(r.goals||0);i++)goals.push(r);
   const assists=[];for(const r of teamRows)for(let i=0;i<(r.assists||0);i++)assists.push(r);
   let goalIndex=0,assistIndex=0;
   for(let i=0;i<(report.shots||0);i++){
    const goal=goalIndex<(side===0?result.homeGoals:result.awayGoals),row=goal?goals[goalIndex++]||shotRows[i]||teamRows[0]:shotRows[i]||teamRows[0];
    const eventAssists=[];
    if(goal){for(let a=0;a<2&&assistIndex<assists.length;a++){const ar=assists[assistIndex++];eventAssists.push({id:ar.id,name:ar.name});}}
    emit(stream,'shot',{side,seconds:0,playerId:row?.id??null,player:row?.name||'',outcome:goal?'goal':'save',powerPlay:goal&&goalIndex<=(report.ppGoals||0),assists:eventAssists});
   }
  }
  for(const r of rows)if((r.seconds||0)>0){const side=clubBySide.indexOf(r.club??r.team);if(side>=0)addIce(stream,side,r.id,r.seconds);}
  return stream;
 };
 return {VERSION,create,ensureShape,emit,addIce,summary,liveStream,syncLive,backgroundFromResult};
})();

if(typeof studioCreate==='function'){
 const baseStudioCreate=studioCreate;
 studioCreate=function(){const result=baseStudioCreate.apply(this,arguments);const e=typeof studioEngine==='function'?studioEngine():null;MatchEventStream.liveStream(e,true);MatchEventStream.syncLive(e);return result;};
}
if(typeof studioRecordShot==='function'){
 const baseStudioRecordShot=studioRecordShot;
 studioRecordShot=function(e,shot,penalty){
  const impact=Array.isArray(penalty)?penalty:penalty?[penalty]:[],beforePP=[Boolean(e?.hasPowerPlay?.(0)),Boolean(e?.hasPowerPlay?.(1))];
  const result=baseStudioRecordShot.apply(this,arguments),stream=MatchEventStream.liveStream(e);
  const side=shot.side,id=String(shot.playerId||'').replace(/^\d+:/,''),powerPlay=Math.min(2,impact.filter(p=>p.side!==side).length)>Math.min(2,impact.filter(p=>p.side===side).length);
  MatchEventStream.emit(stream,'shot',{side,seconds:e?.time||0,playerId:id||null,player:shot.player||'',outcome:shot.outcome,powerPlay,quality:shot.quality||0,assists:(shot.assists||[]).map(a=>({id:String(a.id||'').replace(/^\d+:/,''),name:a.name||''}))});
  const afterPP=[Boolean(e?.hasPowerPlay?.(0)),Boolean(e?.hasPowerPlay?.(1))];for(const s of [0,1])if(!beforePP[s]&&afterPP[s])MatchEventStream.emit(stream,'pp-start',{side:s,seconds:e?.time||0});
  MatchEventStream.syncLive(e);return result;
 };
}
if(typeof studioStep==='function'){
 const baseStudioStep=studioStep;
 studioStep=function(){
  const e=typeof studioEngine==='function'?studioEngine():null,before=e?.time||0,actors=e?(e.accountingActors||e.actors||[]).map(a=>({side:a.side,id:a.player?.id,role:a.role})):[];
  const result=baseStudioStep.apply(this,arguments),after=e?.time||before,seconds=Math.max(0,after-before),stream=e?MatchEventStream.liveStream(e):null;
  if(stream&&seconds>0)for(const a of actors)MatchEventStream.addIce(stream,a.side,a.id,seconds);
  if(e)MatchEventStream.syncLive(e);return result;
 };
}
if(typeof CareerBroadcastMatch!=='undefined'){
 const baseGivePenalty=CareerBroadcastMatch.prototype.givePenalty;
 CareerBroadcastMatch.prototype.givePenalty=function(side,name,kind){
  const before=[Boolean(this.hasPowerPlay?.(0)),Boolean(this.hasPowerPlay?.(1))],offender=this.skaters(side).find(a=>a.player.name===name)||this.skaters(side)[0];
  const result=baseGivePenalty.call(this,side,name,kind),stream=MatchEventStream.liveStream(this);
  MatchEventStream.emit(stream,'penalty',{side,seconds:this.time||0,playerId:offender?.player?.id??null,player:offender?.player?.name||name||'',minutes:2,kind:kind||null});
  const after=[Boolean(this.hasPowerPlay?.(0)),Boolean(this.hasPowerPlay?.(1))];for(const s of [0,1])if(!before[s]&&after[s])MatchEventStream.emit(stream,'pp-start',{side:s,seconds:this.time||0});
  MatchEventStream.syncLive(this);return result;
 };
}
if(typeof studioMirror==='function'){
 const baseStudioMirror=studioMirror;
 studioMirror=function(e){const result=baseStudioMirror.apply(this,arguments);if(e&&typeof state!=='undefined'&&state.live?.eventStream)MatchEventStream.syncLive(e);return result;};
}
if(typeof rivalSimulate==='function'){
 const baseRivalSimulate=rivalSimulate;
 rivalSimulate=function(game){
  const result=baseRivalSimulate.apply(this,arguments),stream=MatchEventStream.backgroundFromResult(result),s=MatchEventStream.summary(stream);
  result.eventStream=stream;result.eventSummary=s;result.eventStreamVersion=MatchEventStream.VERSION;
  (result.reports||[]).forEach((r,side)=>{r.eventStreamVersion=MatchEventStream.VERSION;r.eventSummary={score:s.score[side],shots:s.shots[side],attempts:s.attempts[side],saves:s.saves[side],pp:s.pp[side],ppGoals:s.ppGoals[side]};r.shots=s.shots[side];r.pp=s.pp[side];r.ppGoals=s.ppGoals[side];});
  return result;
 };
}
