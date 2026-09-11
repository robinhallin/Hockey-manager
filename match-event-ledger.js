"use strict";

// MatchWorld 2 · Etapp D
// One canonical ledger sits between simulation and presentation. The rink engine
// still decides what happens; full match, highlights, reports and fast-forward
// only read/filter the events that already happened.
const MatchEventLedger=(()=>{
 const VERSION=1,ON_GOAL=new Set(['goal','save','rebound']);
 const fresh=(source='studio')=>({version:VERSION,source,nextId:1,events:[],ice:{own:{},opponent:{}},createdAt:Date.now(),partial:false});
 const sideName=side=>side===0||side==='own'?'own':'opponent';
 function ensure(match=state.live,{reset=false,source='studio'}={}){
  if(!match)return null;
  if(reset||!match.eventLedger||match.eventLedger.version!==VERSION)match.eventLedger=fresh(source);
  return match.eventLedger;
 }
 function append(match,event){
  const ledger=ensure(match);if(!ledger)return null;
  const item={id:`me-${ledger.nextId++}`,seq:ledger.events.length+1,...event};
  ledger.events.push(item);return item;
 }
 function shot(match,engine,record,penalties=[]){
  if(!match||!record)return null;
  const side=sideName(record.side),playerId=String(record.playerId||'').replace(/^\d:/,''),period=match.period||1;
  const ownPens=(penalties||[]).filter(p=>p.side===record.side).length,oppPens=(penalties||[]).filter(p=>p.side!==record.side).length;
  return append(match,{type:'shot',time:Number(engine?.time)||0,period,clock:typeof gameTime==='function'?gameTime():null,side,playerId,player:record.player||null,
   outcome:record.outcome||'wide',quality:Number(record.quality)||0,x:Number(record.x)||0,y:Number(record.y)||0,
   powerPlay:oppPens>ownPens,strength:[Math.max(3,5-ownPens),Math.max(3,5-oppPens)],
   assists:(record.assists||[]).map(a=>({id:String(a.id||'').replace(/^\d:/,''),name:a.name||null}))});
 }
 function penalty(match,engine,{side,playerId=null,name=null,kind=null,minutes=2}={}){
  return append(match,{type:'penalty',time:Number(engine?.time)||0,period:match?.period||1,clock:typeof gameTime==='function'?gameTime():null,side:sideName(side),playerId:playerId==null?null:String(playerId),player:name,kind,minutes});
 }
 function addIce(match,actors,seconds){
  const ledger=ensure(match);if(!ledger||!Number.isFinite(seconds)||seconds<=0)return;
  for(const a of actors||[]){if(a.role==='G')continue;const side=sideName(a.side),id=String(a.player?.id??a.playerId??'');if(!id)continue;ledger.ice[side][id]=(ledger.ice[side][id]||0)+seconds;}
 }
 function summary(input){
  const ledger=input?.events?input:input?.eventLedger;if(!ledger)return null;
  const events=ledger.events||[],shots=events.filter(e=>e.type==='shot'),forSide=side=>shots.filter(e=>e.side===side),onGoal=e=>ON_GOAL.has(e.outcome),saved=e=>e.outcome==='save'||e.outcome==='rebound';
  const own=forSide('own'),opp=forSide('opponent');
  const goals=[own.filter(e=>e.outcome==='goal').length,opp.filter(e=>e.outcome==='goal').length];
  return {version:VERSION,source:ledger.source,events:events.length,
   goals,shots:[own.filter(onGoal).length,opp.filter(onGoal).length],attempts:[own.length,opp.length],
   saves:[opp.filter(saved).length,own.filter(saved).length],blocks:[own.filter(e=>e.outcome==='block').length,opp.filter(e=>e.outcome==='block').length],
   danger:[own.filter(e=>e.quality>=.09).length,opp.filter(e=>e.quality>=.09).length],
   ppGoals:[own.filter(e=>e.outcome==='goal'&&e.powerPlay).length,opp.filter(e=>e.outcome==='goal'&&e.powerPlay).length],ice:ledger.ice};
 }
 function presentation(input,mode='full'){
  const ledger=input?.events?input:input?.eventLedger;if(!ledger)return [];
  const rows=ledger.events||[];if(mode==='full')return rows.slice();
  if(mode==='extended')return rows.filter(e=>e.type==='goal'||e.type==='penalty'||e.type==='shot'&&(e.quality>=.06||ON_GOAL.has(e.outcome)));
  if(mode==='highlights')return rows.filter(e=>e.type==='goal'||e.type==='penalty'||e.type==='shot'&&(e.outcome==='goal'||e.quality>=.09));
  return rows.slice();
 }
 function aggregateBackground(result,game){
  const reports=result?.reports||[],home=reports.find(r=>r.club===game?.home)||{},away=reports.find(r=>r.club===game?.away)||{};
  const ledger=fresh('background');ledger.aggregate={
   goals:[result?.homeGoals||0,result?.awayGoals||0],shots:[home.shots||0,away.shots||0],pp:[home.pp||0,away.pp||0],ppGoals:[home.ppGoals||0,away.ppGoals||0],duration:result?.duration||0,overtime:Boolean(result?.overtime),shootout:Boolean(result?.shootout)};
  // Background fixtures do not invent a fake chronology. The aggregate is the
  // canonical event result until the background engine emits individual events.
  ledger.events.push({id:'me-1',seq:1,type:'final',time:result?.duration||0,side:null,...ledger.aggregate});ledger.nextId=2;
  return ledger;
 }
 function validate(match){
  const ledger=match?.eventLedger;if(!ledger)return true;if(ledger.version!==VERSION||!Array.isArray(ledger.events))return false;
  let seq=0;for(const e of ledger.events){if(e.seq!==++seq||typeof e.type!=='string'||!Number.isFinite(e.time)||e.time<0)return false;if(e.type==='shot'&&!['own','opponent'].includes(e.side))return false;}
  return true;
 }
 return {VERSION,fresh,ensure,append,shot,penalty,addIce,summary,presentation,aggregateBackground,validate};
})();

// Live adapter: write the same physical shot that already updated the spatial
// engine into the canonical ledger. No extra random draw is introduced here.
if(typeof studioCreate==='function'){
 const baseStudioCreate=studioCreate;
 studioCreate=function(){const result=baseStudioCreate();MatchEventLedger.ensure(state.live,{reset:true,source:'studio'});return result;};
}
if(typeof studioRecordShot==='function'){
 const baseStudioRecordShot=studioRecordShot;
 studioRecordShot=function(engine,record,penalties){const result=baseStudioRecordShot(engine,record,penalties);MatchEventLedger.shot(state.live,engine,record,penalties);return result;};
}
if(typeof studioStep==='function'){
 const baseStudioStep=studioStep;
 studioStep=function(){
  const engine=typeof studioEngine==='function'?studioEngine():null,before=Number(engine?.time)||0,actors=engine?.actors?.map(a=>({side:a.side,role:a.role,player:{id:a.player?.id}}))||[];
  const result=baseStudioStep(),after=Number(engine?.time)||before;MatchEventLedger.addIce(state.live,actors,Math.max(0,after-before));return result;
 };
}
if(typeof CareerBroadcastMatch!=='undefined'&&!CareerBroadcastMatch.prototype._eventLedgerPenalty){
 const basePenalty=CareerBroadcastMatch.prototype.givePenalty;
 CareerBroadcastMatch.prototype.givePenalty=function(side,name,kind=null){
  const before=this.penaltyList?.().length||0,result=basePenalty.call(this,side,name,kind),list=this.penaltyList?.()||[];
  if(list.length>before){const p=list.at(-1);MatchEventLedger.penalty(state.live,this,{side:p.side,playerId:p.playerId,name:p.name,kind:p.kind});}
  return result;
 };
 CareerBroadcastMatch.prototype._eventLedgerPenalty=true;
}

// Statistics and presentation become projections of the ledger. Legacy values
// remain fallbacks for old/partial saves, so existing careers keep working.
if(typeof matchStats==='function'){
 const baseMatchStats=matchStats;
 matchStats=function(){
  const legacy=baseMatchStats(),ledger=state.live?.eventLedger,s=ledger&&ledger.source==='studio'?MatchEventLedger.summary(ledger):null;
  if(!s||!ledger.events.length)return legacy;
  return {...legacy,shots:s.shots,saves:s.saves,danger:s.danger};
 };
}
function matchPresentationEvents(mode=state.live?.rink?.mode||'full'){return MatchEventLedger.presentation(state.live,mode);}
function matchEventSummary(){return MatchEventLedger.summary(state.live);}

// Background adapter exposes the exact result/box-score aggregate through the
// same ledger contract. It deliberately does not fabricate scorer chronology.
if(typeof rivalSimulate==='function'){
 const baseRivalSimulate=rivalSimulate;
 rivalSimulate=function(game){const result=baseRivalSimulate(game);result.eventLedger=MatchEventLedger.aggregateBackground(result,game);return result;};
}

if(typeof validateSpatialMatchSave==='function'){
 const baseValidateSpatial=validateSpatialMatchSave;
 validateSpatialMatchSave=function(s){baseValidateSpatial(s);if(s.live?.eventLedger&&!MatchEventLedger.validate(s.live))throw Error('Matchens händelselogg är felaktig.');};
}
