"use strict";

// MatchWorld 2 is the shared hockey layer between the spatial broadcast engine
// and background fixtures. The rink still owns geometry; this layer owns the
// common interpretation of team quality, pressure and opportunity creation.
const MatchWorld2=(()=>{
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 const KEYS=['passing','puckControl','vision','decisions','shooting','skating','positioning','workRate','checking','strength','discipline'];
 const value=(row,key)=>Number.isFinite(row?.[key])?row[key]:10;
 const average=(rows,key)=>rows.length?rows.reduce((n,row)=>n+value(row,key),0)/rows.length:10;
 const attributes=rows=>Object.fromEntries(KEYS.map(key=>[key,average(rows,key)]));
 const controlScore=a=>value(a,'passing')*.35+value(a,'puckControl')*.30+value(a,'vision')*.20+value(a,'decisions')*.15;
 const attackScore=a=>value(a,'shooting')*.24+value(a,'passing')*.20+value(a,'vision')*.16+value(a,'puckControl')*.16+value(a,'skating')*.10+value(a,'decisions')*.14;
 const defenseScore=a=>value(a,'positioning')*.28+value(a,'decisions')*.20+value(a,'workRate')*.18+value(a,'checking')*.16+value(a,'strength')*.10+value(a,'discipline')*.08;
 const transitionScore=a=>value(a,'skating')*.22+value(a,'passing')*.22+value(a,'puckControl')*.22+value(a,'vision')*.16+value(a,'decisions')*.18;
 const pressureChance=(attack,defense)=>{
  const defender={checking:value(attack,'checking'),strength:value(attack,'strength'),workRate:value(attack,'workRate')};
  const carrier={puckControl:value(defense,'puckControl'),strength:value(defense,'strength'),decisions:value(defense,'decisions')};
  return typeof StudioHockey!=="undefined"?StudioHockey.pressureWinChance(defender,carrier):clamp(.24+((defender.checking*.5+defender.strength*.25+defender.workRate*.25)-(carrier.puckControl*.5+carrier.strength*.3+carrier.decisions*.2))*.018,.08,.48);
 };
 function profileFromAttributes(attrs,plan={},count=5,goalie=null){
  const a={...Object.fromEntries(KEYS.map(key=>[key,value(attrs,key)]))};
  return {version:2,count,attrs:a,control:controlScore(a),attack:attackScore(a),defense:defenseScore(a),transition:transitionScore(a),discipline:a.discipline,
   goalie:goalie?{reflexes:value(goalie,'reflexes'),positioning:value(goalie,'positioning'),reboundControl:value(goalie,'reboundControl'),handling:value(goalie,'handling'),movement:value(goalie,'movement'),composure:value(goalie,'composure')}:null,
   plan:{style:plan.style||plan.mentality||'balanced',forecheck:plan.forecheck||'balanced',tempo:plan.tempo||'normal',pp:plan.pp||'131',pk:plan.pk||'box'}};
 }
 function initiativeChance(home,away,homePlan={},awayPlan={},homeCount=5,awayCount=5,{homeIce=true}={}){
  const press=(a,b,plan)=>plan.forecheck==='aggressive'?.015+(pressureChance(a,b)-.24)*.5:0;
  const base=homeIce?.51:.5;
  return clamp(base+(controlScore(home)-controlScore(away))*.015+press(home,away,homePlan)-press(away,home,awayPlan)+(homeCount-awayCount)*.07,.25,.75);
 }
 function backgroundShotContext({creation,resistance,shooterPosition,pp,plan={},opposition={}},rand){
  const edge=clamp((creation-resistance)/20,-.5,.5);
  const counter=plan.style==='counter'&&opposition.forecheck==='aggressive';
  const closeChance=clamp(.30+edge*.4+(pp?.10:0)+(counter?.12:0),.1,.65);
  const close=rand()<closeChance;
  const d=close?3+rand()*6:(shooterPosition==='B'?15:9)+rand()*9;
  const angle=rand()*(close?.65:1.05);
  const pressure=clamp(.42-edge*.4-(pp?.14:0)-(counter?.12:0)+(opposition.forecheck==='aggressive'&&!counter?.08:0),.08,.85);
  const screen=clamp((plan.style==='pressure'?.38:.20)+(pp?.12:0),0,1);
  return {d,angle,pressure,screen,oneTimer:false,rebound:false,behind:false,lateralSpeed:0};
 }
 function liveProfiles(match){
  if(!match)return null;
  const signature=`${match.tick}:${match.actors?.map(a=>`${a.id}:${a.role}:${Math.round((a.player?.energy??100)*10)}`).join('|')}`;
  if(match._matchWorld2Cache?.signature===signature)return match._matchWorld2Cache.value;
  const result=[0,1].map(side=>{
   const skaters=match.skaters(side).filter(a=>!['leaving','entering'].includes(a.status));
   const rows=skaters.map(a=>Object.fromEntries(KEYS.map(key=>[key,match.attribute(a,key)])));
   const goalie=match.actors.find(a=>a.side===side&&a.role==='G');
   const goalieAttrs=goalie?Object.fromEntries(['reflexes','positioning','reboundControl','handling','movement','composure'].map(key=>[key,match.attribute(goalie,key)])):null;
   const team=match.teams[side]||{},plan={style:team.tactics?.mentality||team.plan?.style||'balanced',forecheck:team.forecheck||team.plan?.forecheck||'balanced',tempo:team.tempo||team.plan?.tempo||'normal',pp:team.tactics?.pp||team.plan?.pp||'131',pk:team.tactics?.pk||team.plan?.pk||'box'};
   return profileFromAttributes(attributes(rows),plan,skaters.length,goalieAttrs);
  });
  match._matchWorld2Cache={signature,value:result};return result;
 }
 function liveInitiative(match,side){
  const ps=liveProfiles(match);if(!ps)return .5;
  const own=ps[side],opp=ps[1-side];
  return initiativeChance(own.attrs,opp.attrs,own.plan,opp.plan,own.count,opp.count,{homeIce:false});
 }
 function describe(match){
  const profiles=liveProfiles(match);if(!profiles)return null;
  return {version:2,profiles:profiles.map(p=>({count:p.count,control:+p.control.toFixed(2),attack:+p.attack.toFixed(2),defense:+p.defense.toFixed(2),transition:+p.transition.toFixed(2),discipline:+p.discipline.toFixed(2),plan:p.plan})),initiative:[+liveInitiative(match,0).toFixed(4),+liveInitiative(match,1).toFixed(4)]};
 }
 return {version:2,KEYS,attributes,controlScore,attackScore,defenseScore,transitionScore,profileFromAttributes,initiativeChance,backgroundShotContext,liveProfiles,liveInitiative,describe};
})();

// Background fixtures and the broadcast engine now read the same opportunity
// functions. These wrappers preserve the existing balance except for a tiny
// shared-model tie breaker when live decisions are otherwise very close.
if(typeof rivalInitiativeChance==='function'){
 rivalInitiativeChance=function(home,away,homePlan,awayPlan,homeCount=5,awayCount=5){return MatchWorld2.initiativeChance(home,away,homePlan,awayPlan,homeCount,awayCount);};
}
if(typeof rivalShotContext==='function'){
 rivalShotContext=function(args,rand){return MatchWorld2.backgroundShotContext(args,rand);};
}

if(typeof CareerBroadcastMatch!=="undefined"){
 const baseActionOptions=CareerBroadcastMatch.prototype.actionOptions;
 CareerBroadcastMatch.prototype.actionOptions=function(a){
  const rows=baseActionOptions.call(this,a),initiative=MatchWorld2.liveInitiative(this,a.side),edge=initiative-.5;
  for(const row of rows){
   const scale=row.kind==='shoot'?.032:['pass','carry'].includes(row.kind)?.018:['dump','clear'].includes(row.kind)?-.010:0;
   const bias=edge*scale;row.value+=bias;row.worldBias=bias;row.worldInitiative=initiative;
  }
  return rows.sort((x,y)=>y.value-x.value);
 };
}

if(typeof studioSyncPlans==='function'){
 const baseStudioSyncPlans=studioSyncPlans;
 studioSyncPlans=function(e=studioEngine()){
  const result=baseStudioSyncPlans(e);
  if(e)e.worldModel=MatchWorld2.describe(e);
  return result;
 };
}
