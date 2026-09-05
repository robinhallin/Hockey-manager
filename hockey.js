"use strict";
const HOCKEY_STYLES={control:'Kontrollerat anfall',counter:'Kontringshockey',pressure:'Hög press'};
function ensureHockey(){const r=state.live?.rink;if(!r)return;if(!r.hockey)r.hockey={version:1,transition:0,loose:null,stops:[],counts:Object.fromEntries(['offside','icing','clear','freeze'].map(k=>[k,{own:0,opponent:0}]))};}
function hockeyStyle(side){return side==='own'?(state.tacticalPlan.attackStyle||'control'):['control','counter','pressure'][Math.floor(attrSeed(`${state.live.opponent}:style`)*3)];}
function hockeySetStyle(value){if(!HOCKEY_STYLES[value])return;if(state.live?.running)pauseMatch();state.tacticalPlan.attackStyle=value;state.tacticalPlan.forecheck=value==='pressure'?'aggressive':value==='counter'?'passive':'balanced';save();render();}
function hockeySpecial(side){const m=state.live,diff=m.penaltiesOpp.length-m.penaltiesHV.length;return diff===0?'even':(side==='own'?diff:-diff)>0?'pp':'pk';}
function hockeyRoles(side){
 const ps=rinkSkaters(side),rank=(a,keys)=>keys.reduce((n,k)=>n+rinkAttribute(a,k),0);
 const sorted=[...ps].sort((a,b)=>(b.pos==='B')-(a.pos==='B')||rank(b,['passing','vision'])-rank(a,['passing','vision']));
 const point=sorted.shift(),front=[...sorted].sort((a,b)=>rank(b,['strength','positioning'])-rank(a,['strength','positioning']))[0];
 return [point,...sorted.filter(a=>a!==front),front].filter(Boolean);
}
function hockeyTargets(){
 const r=state.live.rink,carrier=r.actors.find(a=>a.key===r.carrier);if(!carrier)return {};
 const targets={},side=r.owner,progress=rinkX(side,carrier.x),style=hockeyStyle(side),attack=rinkSkaters(side),defending=rinkOther(side),special=hockeySpecial(side),advance=style==='counter'&&r.hockey.transition>0?17:style==='control'?6:11;
 const put=(a,x,y,duty)=>{targets[a.key]={x:rinkClamp(rinkX(a.side,x),10,90),y:rinkClamp(y,14,86),duty};};
 if(special==='pp'&&progress>=66){
  const order=hockeyRoles(side),slots=order.length>=5?[[69,50,'Spel på blålinjen'],[78,22,'Vänster sida'],[78,78,'Höger sida'],[82,50,'Centralt alternativ'],[89,50,'Framför mål'],[87,68,'Extra anfallare']]:[[69,50,'Spel på blålinjen'],[79,24,'Vänster sida'],[79,76,'Höger sida'],[89,50,'Framför mål']];
  order.forEach((a,i)=>{const slot=slots[Math.min(i,slots.length-1)];put(a,...slot);});
 }else{
  const tempo=side==='own'?(state.tacticalPlan.tempo==='high'?1.3:state.tacticalPlan.tempo==='low'?.75:1):1;
  put(carrier,progress+advance*tempo,50+(carrier.y-50)*.8,'Puckförare');
  const claimed=[];let back=0,forward=0;
  for(const a of attack.filter(a=>a.key!==carrier.key)){
   if(a.pos==='B'){put(a,Math.min(progress-15,64),back++%2?69:31,'Täcker upp');continue;}
   const drive=progress>72&&forward++===0;
   let x=drive?88:progress+(style==='counter'?14:8);
   // Disciplined support waits for the puck at the attacking blue line.
   if(progress<=66&&(rinkAttribute(a,'decisions')>=10||r.frame%11!==0))x=Math.min(x,65);
   const lanes=[22,50,78].map(y=>{const point={x:rinkX(side,x),y};return {y,score:Math.min(...rinkSkaters(defending).map(d=>rinkDistance(d,point)),20)-rinkLaneThreat(carrier,point,rinkSkaters(defending))*6-claimed.reduce((n,v)=>n+(Math.abs(v-y)<15?12:0),0)};}).sort((a,b)=>b.score-a.score);
   const y=drive?50:lanes[0].y;claimed.push(y);put(a,x,y,drive?'Går på mål':'Gör sig spelbar');
  }
 }
 const defenders=rinkSkaters(defending),pk=hockeySpecial(defending)==='pk';
 if(pk&&progress>60){
  const box=defenders.length<=3?[[17,37],[17,63],[28,50]]:[[17,36],[17,64],[29,36],[29,64]];
  [...defenders].sort((a,b)=>(b.pos==='B')-(a.pos==='B')).forEach((a,i)=>{const slot=box[i%box.length];put(a,slot[0],slot[1]+(carrier.y-50)*.12,'Skyddar boxen');});
 }else{
  let back=0,forward=0;const press=rinkPress(defending),retreat=hockeyStyle(defending)==='counter'||(defending==='own'&&state.tactic==='defense');
  for(const a of defenders){
   if(a.pos==='B'){put(a,Math.max(16,100-progress-(retreat?18:12)),back++%2?63:37,'Skyddar målområdet');}
   else{const i=forward++;put(a,100-progress-(retreat?15:i===0?2:8+press*4),rinkClamp(carrier.y+(i===0?0:i%2?15:-15),22,78),i===0?'Pressar puckföraren':'Stänger passningsväg');}
  }
 }
 for(const a of r.actors.filter(a=>a.pos==='MV'))put(a,8,50+(carrier.y-50)*.15,'Följer pucken');
 return targets;
}
function hockeyMoveTeam(){const r=state.live.rink,targets=hockeyTargets();for(const a of r.actors){const t=targets[a.key];if(t){rinkMove(a,t.x,t.y);a.duty=t.duty;}}const carrier=r.actors.find(a=>a.key===r.carrier);if(carrier)r.puck={x:carrier.x,y:carrier.y};}
function hockeyWhistle(type,side,text,x,y=50){
 const r=state.live.rink;r.hockey.icingHold=type==='icing'?{side,ids:r.actors.filter(a=>a.side===side).map(a=>a.id)}:null;r.hockey.counts[type][side]++;r.hockey.stops.unshift({time:analysisClock(),type,side,text});r.hockey.stops=r.hockey.stops.slice(0,40);
 r.restart=true;r.faceoffX=x;r.faceoffY=y;r.lastPass=null;r.hockey.loose=null;rinkSay(text,type,type==='freeze');
}
function hockeyEntry(side,from,to,carrierKey){
 const r=state.live.rink;if(rinkX(side,from.x)>66||rinkX(side,to.x)<=66)return false;
 const early=rinkSkaters(side).find(a=>a.key!==carrierKey&&r.previous.some(p=>p.key===a.key&&rinkX(side,p.x)>66));
 if(!early)return false;
 hockeyWhistle('offside',side,`${early.name} är inne före pucken. Offside.`,rinkX(side,60),to.y<50?28:72);return true;
}
function hockeyClear(actor){
 const r=state.live.rink,side=actor.side,behindRed=rinkX(side,actor.x)<50,pk=hockeySpecial(side)==='pk';
 r.puckVia={x:actor.x,y:actor.y};r.puck={x:rinkX(side,94),y:actor.y<50?18:82};r.carrier=null;r.lastPass=null;
 if(behindRed&&!pk){hockeyWhistle('icing',side,`${actor.name} rensar från egen planhalva hela vägen. Icing.`,rinkX(side,24),actor.y<50?28:72);return;}
 r.hockey.counts.clear[side]++;r.hockey.loose={type:'clear',side};rinkSay(`${actor.name} rensar pucken ur zonen${pk?' i boxplay':''}.`,'clear');
}
function hockeyRecover(){
 const r=state.live.rink,loose=r.hockey.loose||{type:'rebound'};
 const contenders=r.actors.filter(a=>a.pos!=='MV').map(a=>({a,score:rinkDistance(a,r.puck)-rinkAttribute(a,'positioning')*.1})).sort((a,b)=>a.score-b.score);
 for(const {a} of contenders.slice(0,4))rinkMove(a,r.puck.x,r.puck.y);
 const close=contenders.filter(({a})=>rinkDistance(a,r.puck)<=2.5).map(({a})=>({a,score:rinkAttribute(a,'positioning')+rinkAttribute(a,'strength')*.3+rinkRoll()*5})).sort((a,b)=>b.score-a.score);
 if(close[0]){r.hockey.loose=null;rinkLose(close[0].a,`${close[0].a.name} tar hand om ${loose.type==='rebound'?'returen':'den lösa pucken'}.`);}
 else{r.carrier=null;r.hockey.loose=loose;rinkSay('Spelarna jagar den lösa pucken.',loose.type==='rebound'?'rebound':'clear',loose.type==='rebound');}
}
function hockeyKeeperSave(shotSide){
 const r=state.live.rink,side=rinkOther(shotSide),keeper=r.actors.find(a=>a.side===side&&a.pos==='MV');if(!keeper)return;
 r.puck={x:keeper.x,y:keeper.y};const pressure=rinkSkaters(shotSide).some(a=>rinkDistance(a,keeper)<8);
 if(pressure||rinkRoll()<.65){hockeyWhistle('freeze',side,`${keeper.name} fångar och blockerar pucken. Tekning.`,rinkX(side,24),r.puckFrom.y<50?28:72);}
 else{r.owner=side;r.carrier=keeper.key;r.restart=false;rinkSay(`${keeper.name} håller pucken i spel och söker ett uppspel.`,'goalie');}
}
function hockeyDistribute(){
 const r=state.live.rink,keeper=r.actors.find(a=>a.key===r.carrier);if(!keeper){r.restart=true;return;}
 const defenders=rinkSkaters(rinkOther(r.owner)),target=rinkSkaters(r.owner).sort((a,b)=>rinkDistance(keeper,a)+rinkLaneThreat(keeper,a,defenders)*10-rinkDistance(keeper,b)-rinkLaneThreat(keeper,b,defenders)*10)[0];
 if(!target){r.restart=true;return;}
 r.puckVia={x:keeper.x,y:keeper.y};const safe=attrClamp(.8+(rinkAttribute(keeper,'handling')-10)/80-rinkLaneThreat(keeper,target,defenders)*.35,.3,.97);
 if(rinkRoll()<safe){r.carrier=target.key;r.puck={x:target.x,y:target.y};rinkSay(`${keeper.name} spelar ut till ${target.name}.`,'buildup');}
 else{const thief=[...defenders].sort((a,b)=>rinkDistance(a,target)-rinkDistance(b,target))[0];if(thief)rinkLose(thief,`${thief.name} fångar upp målvaktens utspel.`);else r.restart=true;}
}
function hockeyPassScore(actor,target,defenders){
 const r=state.live.rink,special=hockeySpecial(actor.side),style=hockeyStyle(actor.side),progress=rinkX(actor.side,actor.x),ahead=rinkX(actor.side,target.x)-progress;
 const circulation=special==='pp'&&progress>=66?Math.abs(actor.y-target.y)/180+(target.duty==='Centralt alternativ'?.1:0):ahead/(style==='counter'&&r.hockey.transition>0?65:style==='control'?260:140);
 return rinkPassChance(actor,target,defenders)+circulation;
}
function hockeyShotChoice(actor){
 const r=state.live.rink,x=rinkX(actor.side,actor.x),pp=hockeySpecial(actor.side)==='pp',style=hockeyStyle(actor.side);
 if(x<=66)return 0;
 return attrClamp((pp?(r.zoneTicks<3?.12:.38):style==='control'?.24:.34)+(x-70)/160+(r.zoneTicks>7?.3:0),.08,.8);
}
function hockeyPanel(){const r=state.live.rink,h=r.hockey;return `<div class="hockey-match-plan"><label>Spelidé<select onchange="hockeySetStyle(this.value)">${Object.entries(HOCKEY_STYLES).map(([k,t])=>`<option value="${k}" ${hockeyStyle('own')===k?'selected':''}>${t}</option>`).join('')}</select></label><p>${hockeySpecial(r.owner)==='pp'?'Powerplay söker passningar mellan blålinje, sidor och målområde.':hockeyStyle(r.owner)==='counter'&&h.transition>0?'Puckvinst – laget söker en snabb omställning.':`${HOCKEY_STYLES[hockeyStyle(r.owner)]} · ${r.owner==='own'?managerClub():state.live.opponent}`}</p><span>Offside ${h.counts.offside.own}–${h.counts.offside.opponent} · Icing ${h.counts.icing.own}–${h.counts.icing.opponent} · Rensningar ${h.counts.clear.own}–${h.counts.clear.opponent}</span></div>`;}
function hockeyChangeBlocked(side='own'){const r=state.live?.rink;return Boolean(r?.restart&&r.hockey?.icingHold?.side===side);}
function hockeyAllowChange(){if(!hockeyChangeBlocked())return true;state.live.rink.caption='Efter icing får laget inte byta före nedsläpp.';save();render();return false;}
