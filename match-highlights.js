'use strict';
// Read observed hockey facts, never unresolved outcome rolls or match RNG.
const MatchHighlights=(()=>{
 const signal=(key,label,pre=4,tail=3,priority=1)=>({key,label,pre,tail,priority});
 function dangerous(shot){const c=shot?.context||{},q=shot?.quality;return Number.isFinite(q)&&(q>=.12||q>=.07&&(c.rebound&&c.d<9||c.oneTimer&&c.d<12&&c.angle<.8)||q>=.05&&c.d<8&&c.angle<.65&&c.pressure<.25);}
 function select(e,mode,notice){
  if(!e||!['extended','highlights'].includes(mode))return null;
  if(notice&&notice.engine===e&&e.wall-notice.wall>=-1e-7&&e.wall-notice.wall<.25)return notice;
  const shot=e.lastShot;
  if(shot&&Number.isFinite(shot.resolvedAt)&&e.wall-shot.resolvedAt>=-1e-7&&e.wall-shot.resolvedAt<.25){
   const key='result:'+shot.playerId+':'+shot.time;
   if(shot.outcome==='goal')return signal(key,'Mål',5,4,3);
   if(['post','bar'].includes(shot.miss)||['post','bar'].includes(shot.contact?.kind))return signal(key,shot.miss==='bar'||shot.contact?.kind==='bar'?'Ribbträff':'Stolpträff',4,3,2);
   if(dangerous(shot))return signal(key,shot.outcome==='save'?'Räddning på stor chans':'Stor målchans',4,3,2);
  }
  const f=e.flight;
  if(f?.kind==='shot'){
   // Sparse legacy flights lack chance data. Current flights include it.
   if(!f.shot||mode==='extended'||dangerous(f.shot))return signal('shot:'+(f.shot?.playerId||f.from||'legacy')+':'+(f.shot?.time??0),dangerous(f.shot)?'Stor målchans':'Avslut',4,3,dangerous(f.shot)?2:1);
  }
  if(f?.kind==='pass'&&f.start&&f.end&&[0,1].includes(f.side)&&e.delayedOffside!==f.side){
   const from=StudioHockey.progress(f.side,f.start.x),to=StudioHockey.progress(f.side,f.end.x),depth=56.5-to;
   const receiver=e.actor(f.to);
   // A released cross-slot pass is important before a shot exists. Judge its
   // observed route, not its stored success roll or the receiver's next choice.
   if(receiver?.status==='playing'&&from>43&&to>=48&&depth>0&&depth<9&&Math.abs(f.end.y-15)<5&&Math.abs(f.end.y-f.start.y)>=7)
    return signal('slot-pass:'+f.from+':'+f.to+':'+Math.round((e.time-(f.elapsed||0))*1000),'Passning genom slottet',4,3,2);
  }
  const rebound=e.rebound,spot=rebound?.spot,depth=spot?56.5-StudioHockey.progress(rebound.side,spot.x):0;
  const liveRebound=spot&&!f&&(!e.puck||StudioHockey.distance(e.puck,spot)<4)&&
   (typeof e.skaters!=='function'||e.skaters(rebound.side).some(a=>a.status==='playing'&&StudioHockey.distance(a,spot)<5));
  if(spot&&liveRebound&&depth>0&&Math.hypot(depth,spot.y-15)<9&&Math.atan2(Math.abs(spot.y-15),depth)<.9&&e.time-rebound.time<2.5)return signal('rebound:'+rebound.side+':'+rebound.time,'Farlig retur',3,3,2);
  const a=e.actor(e.carrier);if(!a||e.stoppage>0||e.phase==='faceoff')return null;
  const p=StudioHockey.progress(a.side,a.x);if(p<42||p>56.5)return null;
  const q=e.shotQuality(a),c=e.shotContext(a);if(c.behind)return null;
  const openRun=q>=.03&&c.d<14&&c.angle<.65&&c.pressure<.35&&typeof e.skaters==='function'&&!e.skaters(1-a.side).some(b=>{
   const ahead=StudioHockey.progress(a.side,b.x),t=(ahead-p)/(56.5-p);
   return t>0&&t<1&&Math.abs(b.y-(a.y+(15-a.y)*t))<2.3;
  });
  const touch=Number.isFinite(a.controlledAt)?a.controlledAt:(e.presentationReset||0);
  if(openRun)return signal('breakaway:'+a.id+':'+touch,'Friläge',4,3,2);
  if(dangerous({quality:q,context:c}))return signal('chance:'+a.id+':'+touch,'Stor målchans',4,3,2);
  if(mode==='extended'&&q>=.045&&c.angle<1.1)return signal('attack:'+a.id+':'+touch,e.phase==='counter'?'Kontring':'Anfallsläge',3,3);
  const late=(e.time-(e.periodStart||0))>=1080&&e.periodStart>=2400,close=Math.abs(e.score[0]-e.score[1])<=2;
  if((e.threeOnThree||late&&close&&e.teams.some(t=>t.pulled))&&q>=.075&&c.angle<.9)return signal('late:'+a.id+':'+touch,e.threeOnThree?'Chans i förlängningen':'Chans i slutskedet',4,3,2);
  return null;
 }
 function event(e,events){
  const row=events.findLast(x=>['goal','penalty','injury'].includes(x.type));if(!row)return null;
  return {...signal('event:'+row.type+':'+row.time+':'+row.id,{goal:'Mål',penalty:'Utvisning',injury:'Skadehändelse'}[row.type],row.type==='goal'?5:3,row.type==='goal'?4:3,3),engine:e,wall:e.wall};
 }
 function lead(e,seconds,after=-Infinity){
  const rows=e.history||[],latest=rows.at(-1);if(!latest)return null;
  // Bound the build-up at faceoff/period resets and already shown action.
  const frames=rows.filter(f=>f.wall>=Math.max(e.wall-seconds,after)-1e-7&&f.wall<=e.wall+1e-7&&f.reset===latest.reset);
  const duration=frames.length>1?frames.at(-1).wall-frames[0].wall:0;
  return duration>.15?{frames,duration,elapsed:0,lastNow:null}:null;
 }
 return {select,event,lead,dangerous};
})();
