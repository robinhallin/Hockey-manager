"use strict";

// MatchWorld 2 is the shared hockey layer between the spatial broadcast engine
// and background fixtures. Geometry stays in the rink engine; this layer owns
// common interpretation of team quality, decisions, special teams and shifts.
const MatchWorld2=(()=>{
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 const KEYS=['passing','puckControl','vision','decisions','shooting','skating','positioning','workRate','checking','strength','discipline'];
 const ACTIONS=['shoot','pass','carry','dump','shield','clear'];
 const value=(row,key)=>Number.isFinite(row?.[key])?row[key]:10;
 const average=(rows,key)=>rows.length?rows.reduce((n,row)=>n+value(row,key),0)/rows.length:10;
 const attributes=rows=>Object.fromEntries(KEYS.map(key=>[key,average(rows,key)]));
 const controlScore=a=>value(a,'passing')*.35+value(a,'puckControl')*.30+value(a,'vision')*.20+value(a,'decisions')*.15;
 const attackScore=a=>value(a,'shooting')*.24+value(a,'passing')*.20+value(a,'vision')*.16+value(a,'puckControl')*.16+value(a,'skating')*.10+value(a,'decisions')*.14;
 const defenseScore=a=>value(a,'positioning')*.28+value(a,'decisions')*.20+value(a,'workRate')*.18+value(a,'checking')*.16+value(a,'strength')*.10+value(a,'discipline')*.08;
 const transitionScore=a=>value(a,'skating')*.22+value(a,'passing')*.22+value(a,'puckControl')*.22+value(a,'vision')*.16+value(a,'decisions')*.18;
 const norm=n=>clamp((n-10)/10,-1,1);
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
 function decisionValues(attrs,plan={},context={}){
  const a=attrs||{},style=plan.style||plan.mentality||'balanced',tempo=plan.tempo||'normal';
  const pressure=clamp(Number(context.pressure)||0,0,1),distance=Number.isFinite(context.distance)?context.distance:14;
  const progress=clamp(Number(context.progress)||0,0,60),ownZone=progress<20,offZone=progress>40;
  const rebound=Boolean(context.rebound),oneTimer=Boolean(context.oneTimer),shortHanded=Boolean(context.shortHanded),powerPlay=Boolean(context.powerPlay);
  const shooting=norm(value(a,'shooting')),passing=norm(value(a,'passing')),control=norm(value(a,'puckControl')),vision=norm(value(a,'vision')),decisions=norm(value(a,'decisions')),skating=norm(value(a,'skating')),strength=norm(value(a,'strength'));
  const close=clamp((18-distance)/18,-.5,1),underFire=pressure-.35;
  const attackMentality=style==='attacking'||style==='pressure'?1:style==='counter'?.35:style==='defensive'?-.8:0;
  const fastTempo=tempo==='high'||tempo==='fast'?1:tempo==='low'||tempo==='slow'?-1:0;
  const out={
   shoot:.030*shooting+.018*decisions+.022*close+.018*(rebound?1:0)+.014*(oneTimer?1:0)+.010*attackMentality+.010*(powerPlay?1:0)-.018*Math.max(0,underFire),
   pass:.024*passing+.019*vision+.015*decisions+.012*Math.max(0,underFire)+.008*(powerPlay?1:0)+.006*fastTempo,
   carry:.022*control+.018*skating+.014*decisions-.025*Math.max(0,underFire)+.010*(style==='counter'?1:0)+.006*fastTempo,
   dump:.024*Math.max(0,underFire)+.016*(progress>=18&&progress<=40?1:0)+.014*(plan.forecheck==='aggressive'?1:0)-.015*control-.010*vision,
   shield:.024*Math.max(0,underFire)+.017*strength+.017*control+.010*decisions+.008*(offZone?1:0),
   clear:.036*(ownZone?1:0)+.026*(shortHanded?1:0)+.024*Math.max(0,underFire)+.010*decisions-.010*attackMentality
  };
  for(const key of ACTIONS)out[key]=clamp(out[key],-.06,.07);
  return out;
 }
 function specialUnitScore(attrs,role,kind='even'){
  const keys=kind==='pk'?['positioning','decisions','workRate','discipline']:
   kind==='pp'?['passing','vision','shooting','puckControl','decisions']:
   ['LD','RD'].includes(role)?['positioning','decisions','passing','checking']:
   role==='C'?['passing','vision','decisions','puckControl']:['shooting','skating','puckControl','workRate'];
  return keys.reduce((n,key)=>n+value(attrs,key),0)/keys.length;
 }
 function shiftTarget({base=43,energy=100,tempo='normal',forecheck='balanced',shortHanded=false,powerPlay=false,chasing=false,protecting=false}={}){
  let target=Number.isFinite(base)?base:43;
  if(tempo==='high'||tempo==='fast')target-=3;
  if(tempo==='low'||tempo==='slow')target+=2;
  if(forecheck==='aggressive')target-=3;
  if(shortHanded)target-=5;
  if(powerPlay)target+=1;
  if(chasing)target-=2;
  if(protecting)target+=1;
  if(energy<70)target-=Math.min(10,(70-energy)*.32);
  else if(energy>88)target+=2;
  return Math.round(clamp(target,24,58));
 }
 function specialTeamsEdge(attAttrs,defAttrs,ppPlan='131',pkPlan='box',{attEnergy=100,defEnergy=100,skaterDiff=1}={}){
  const ppKeys=ppPlan==='131'?['passing','vision','puckControl','decisions']:
   ppPlan==='overload'?['passing','puckControl','workRate','shooting']:['shooting','passing','positioning','decisions'];
  const pkKeys=pkPlan==='diamond'?['skating','workRate','decisions','positioning']:['positioning','discipline','decisions','workRate'];
  const avg=(a,keys)=>keys.reduce((n,k)=>n+value(a,k),0)/keys.length;
  const skill=avg(attAttrs,ppKeys)-avg(defAttrs,pkKeys),energy=(attEnergy-defEnergy)/25,manpower=Math.max(0,skaterDiff-1)*.015;
  return clamp(skill*.006+energy*.012+manpower,-.08,.12);
 }
 function specialDecisionBias(match,a){
  const pp=Boolean(match.hasPowerPlay?.(a.side)),pk=Boolean(match.isShortHanded?.(a.side));
  if(!pp&&!pk)return {shoot:0,pass:0,carry:0,dump:0,shield:0,clear:0,edge:0};
  const ps=liveProfiles(match),own=ps?.[a.side],opp=ps?.[1-a.side],attEnergy=liveTeamEnergy(match,a.side),defEnergy=liveTeamEnergy(match,1-a.side);
  const edge=pp&&own&&opp?specialTeamsEdge(own.attrs,opp.attrs,own.plan.pp,opp.plan.pk,{attEnergy,defEnergy,skaterDiff:own.count-opp.count}):0;
  return pp?{shoot:.012+edge*.22,pass:.010+edge*.18,carry:.004+edge*.08,dump:-.010,shield:.004,clear:-.020,edge}:
   {shoot:-.020,pass:-.012,carry:-.010,dump:.016,shield:.008,clear:.030,edge:0};
 }
 function backgroundDecisionProfile({creation=10,resistance=10,shooterPosition='F',pp=false,plan={},opposition={}}={}){
  const edge=clamp((creation-resistance)/20,-.5,.5);
  const pseudo={shooting:10+edge*8+(shooterPosition==='F'?1:0),passing:10+edge*6,vision:10+edge*6,puckControl:10+edge*6,decisions:10+edge*5,skating:10+edge*4,strength:10,positioning:10+edge*3,workRate:10,discipline:10};
  const context={pressure:clamp(.42-edge*.4+(opposition.forecheck==='aggressive'?.08:0),.08,.85),distance:shooterPosition==='B'?17:12,progress:46,powerPlay:Boolean(pp),shortHanded:false,rebound:false,oneTimer:false};
  return decisionValues(pseudo,plan,context);
 }
 function backgroundShotContext(args,rand){
  const {creation,resistance,shooterPosition,pp,plan={},opposition={}}=args;
  const edge=clamp((creation-resistance)/20,-.5,.5),choices=backgroundDecisionProfile(args),counter=plan.style==='counter'&&opposition.forecheck==='aggressive';
  const attackPseudo={passing:creation,vision:creation,puckControl:creation,decisions:creation,shooting:creation,workRate:creation,positioning:creation,discipline:creation,skating:creation};
  const defendPseudo={passing:resistance,vision:resistance,puckControl:resistance,decisions:resistance,shooting:resistance,workRate:resistance,positioning:resistance,discipline:resistance,skating:resistance};
  const special=pp?specialTeamsEdge(attackPseudo,defendPseudo,plan.pp||'131',opposition.pk||'box'):0;
  const closeChance=clamp(.30+edge*.4+(pp?.085:0)+(counter?.12:0)+(choices.carry+choices.pass-choices.dump)*.65+special*.35,.1,.65);
  const close=rand()<closeChance;
  const d=close?3+rand()*6:(shooterPosition==='B'?15:9)+rand()*9;
  const angle=rand()*(close?.65:1.05);
  const pressure=clamp(.42-edge*.4-(pp?.12:0)-(counter?.12:0)+(opposition.forecheck==='aggressive'&&!counter?.08:0)-choices.shield*.35-special*.25,.08,.85);
  const screen=clamp((plan.style==='pressure'?.38:.20)+(pp?.10:0)+choices.shoot*.15+special*.20,0,1);
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
 function liveTeamEnergy(match,side){
  const actors=match?.skaters?.(side)?.filter(a=>!['leaving','entering'].includes(a.status))||[];
  if(!actors.length)return 100;
  return actors.reduce((n,a)=>{
   const p=typeof studioPlayer==='function'?studioPlayer(side,a.player.id):null;
   const e=p&&typeof matchEnergy==='function'?matchEnergy(p):(a.player?.energy??100);
   return n+(Number.isFinite(e)?e:100);
  },0)/actors.length;
 }
 function liveInitiative(match,side){const ps=liveProfiles(match);if(!ps)return .5;const own=ps[side],opp=ps[1-side];return initiativeChance(own.attrs,opp.attrs,own.plan,opp.plan,own.count,opp.count,{homeIce:false});}
 function liveDecisionContext(match,a){
  const shot=match.shotContext(a),p=typeof StudioHockey!=="undefined"?StudioHockey.progress(a.side,a.x):30;
  return {pressure:shot?.pressure||0,distance:shot?.d??14,progress:p,rebound:Boolean(shot?.rebound),oneTimer:Boolean(shot?.oneTimer),powerPlay:Boolean(match.hasPowerPlay?.(a.side)),shortHanded:Boolean(match.isShortHanded?.(a.side))};
 }
 function liveDecisionValues(match,a){
  const attrs=Object.fromEntries(KEYS.map(key=>[key,match.attribute(a,key)]));
  const team=match.teams[a.side]||{},plan={style:team.tactics?.mentality||team.plan?.style||'balanced',forecheck:team.forecheck||team.plan?.forecheck||'balanced',tempo:team.tempo||team.plan?.tempo||'normal'};
  return decisionValues(attrs,plan,liveDecisionContext(match,a));
 }
 function describe(match){
  const profiles=liveProfiles(match);if(!profiles)return null;
  return {version:2,decisionVersion:1,specialTeamsVersion:1,profiles:profiles.map(p=>({count:p.count,control:+p.control.toFixed(2),attack:+p.attack.toFixed(2),defense:+p.defense.toFixed(2),transition:+p.transition.toFixed(2),discipline:+p.discipline.toFixed(2),plan:p.plan})),initiative:[+liveInitiative(match,0).toFixed(4),+liveInitiative(match,1).toFixed(4)],energy:[+liveTeamEnergy(match,0).toFixed(1),+liveTeamEnergy(match,1).toFixed(1)]};
 }
 return {version:2,decisionVersion:1,specialTeamsVersion:1,KEYS,ACTIONS,attributes,controlScore,attackScore,defenseScore,transitionScore,profileFromAttributes,initiativeChance,decisionValues,specialUnitScore,shiftTarget,specialTeamsEdge,specialDecisionBias,backgroundDecisionProfile,backgroundShotContext,liveProfiles,liveTeamEnergy,liveInitiative,liveDecisionContext,liveDecisionValues,describe};
})();

if(typeof rivalInitiativeChance==='function')rivalInitiativeChance=function(home,away,homePlan,awayPlan,homeCount=5,awayCount=5){return MatchWorld2.initiativeChance(home,away,homePlan,awayPlan,homeCount,awayCount);};
if(typeof rivalShotContext==='function')rivalShotContext=function(args,rand){return MatchWorld2.backgroundShotContext(args,rand);};

if(typeof aiUnitScore==='function'){
 const baseAIUnitScore=aiUnitScore;
 aiUnitScore=function(p,role,kind='even'){
  if(!p||!['pp','pk'].includes(kind))return baseAIUnitScore(p,role,kind);
  const attrs=Object.fromEntries(MatchWorld2.KEYS.map(k=>[k,typeof rivalAttribute==='function'?rivalAttribute(p,k):(p.attributes?.[k]||10)]));
  const fit=typeof positionFit==='function'?positionFit(p,role):1;
  return MatchWorld2.specialUnitScore(attrs,role,kind)*fit+(role==='C'?(attrs.faceoffs||10)*.12:0)+(p.aiForm||0)*.12;
 };
}
if(typeof aiMatchPlan==='function'){
 const baseAIMatchPlan=aiMatchPlan;
 aiMatchPlan=function(club,opponentName,base){
  const plan=baseAIMatchPlan(club,opponentName,base);
  plan.shiftLimit=MatchWorld2.shiftTarget({base:plan.shiftLimit||43,energy:100,tempo:plan.tempo,forecheck:plan.forecheck});
  plan.worldShiftVersion=1;return plan;
 };
}
if(typeof aiCoachDecision==='function'){
 const baseAICoachDecision=aiCoachDecision;
 aiCoachDecision=function(club,base,context){
  const decision=baseAICoachDecision(club,base,context);
  decision.shiftLimit=MatchWorld2.shiftTarget({base:decision.shiftLimit||base?.shiftLimit||43,energy:context?.energy??100,tempo:decision.tempo,forecheck:decision.forecheck,shortHanded:(context?.strength||0)<0,powerPlay:(context?.strength||0)>0,chasing:decision.situation==='chase',protecting:decision.situation==='protect'});
  decision.worldShiftVersion=1;return decision;
 };
}

if(typeof CareerBroadcastMatch!=="undefined"){
 const baseActionOptions=CareerBroadcastMatch.prototype.actionOptions;
 CareerBroadcastMatch.prototype.actionOptions=function(a){
  const rows=baseActionOptions.call(this,a),initiative=MatchWorld2.liveInitiative(this,a.side),edge=initiative-.5,values=MatchWorld2.liveDecisionValues(this,a),special=MatchWorld2.specialDecisionBias(this,a);
  for(const row of rows){
   const initiativeScale=row.kind==='shoot'?.018:['pass','carry'].includes(row.kind)?.010:['dump','clear'].includes(row.kind)?-.006:0;
   const initiativeBias=edge*initiativeScale,decisionBias=values[row.kind]||0,specialBias=special[row.kind]||0;
   row.value+=initiativeBias+decisionBias+specialBias;
   row.worldBias=initiativeBias+decisionBias+specialBias;row.worldInitiative=initiative;row.worldDecisionBias=decisionBias;row.worldDecisionVersion=1;row.worldSpecialBias=specialBias;row.worldSpecialTeamsVersion=1;
  }
  return rows.sort((x,y)=>y.value-x.value);
 };
}

if(typeof studioSyncPlans==='function'){
 const baseStudioSyncPlans=studioSyncPlans;
 studioSyncPlans=function(e=studioEngine()){
  const result=baseStudioSyncPlans(e);
  if(e){
   for(const side of [0,1]){
    const t=e.teams[side],energy=MatchWorld2.liveTeamEnergy(e,side),shortHanded=Boolean(e.isShortHanded?.(side)),powerPlay=Boolean(e.hasPowerPlay?.(side));
    t.shiftLimit=MatchWorld2.shiftTarget({base:t.shiftLimit||43,energy,tempo:t.tempo||t.plan?.tempo,forecheck:t.forecheck||t.plan?.forecheck,shortHanded,powerPlay});
    t.worldShiftTarget=t.shiftLimit;t.worldShiftVersion=1;
   }
   e.worldModel=MatchWorld2.describe(e);e.worldModel.shiftTargets=e.teams.map(t=>t.shiftLimit);
  }
  return result;
 };
}
