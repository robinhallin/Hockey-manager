'use strict';
// Snapshot interpolation and recorded tactical evidence shared by the 2D live view,
// highlights and replays. No renderer, GPU, simulation writes or random stream.
const MatchPresentation=(()=>{
 const mix=(a,b,t)=>a+(b-a)*t;
 const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
 const turn=(a,b,t)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*t;
 function sample(frame,before,t){
  t=clamp(t,0,1);const prior=new Map((before?.actors||[]).map(a=>[a.id,a]));
  // Do not sweep across the rink after a faceoff reset or a skipped highlight.
  const gap=before?(frame.wall??frame.time)-(before.wall??before.time):Infinity;
  const continuous=before&&before.reset===frame.reset&&frame.time>=before.time&&frame.time-before.time<=.5&&!(frame.phase==='faceoff'&&before.phase!=='faceoff')&&gap>=0&&gap<=.5;
  const time=continuous?mix(before.time,frame.time,t):frame.time,wall=continuous?mix(before.wall??before.time,frame.wall??frame.time,t):(frame.wall??frame.time);
  const handoff=frame.actors.filter(a=>a.id===before?.carrier||a.id===frame.carrier).flatMap(a=>[a.action,a.contactAction]).filter(a=>a&&a.at>(before?.wall??before?.time??-Infinity)+1e-7);
  const handoffAt=Math.min(frame.wall??frame.time,...handoff.map(a=>a.at));
  const holder=continuous&&Object.hasOwn(before,'carrier')&&before.carrier!==frame.carrier&&wall<handoffAt-1e-7?before.carrier:frame.carrier;
  const pos=(p,q)=>{
   const blend=continuous&&q&&Math.hypot(p.x-q.x,p.y-q.y)<(p.id!=null?5:18)?t:1;
   const result={...p,x:mix(q?.x??p.x,p.x,blend),y:mix(q?.y??p.y,p.y,blend)};
   if(p.id==null&&(p.z!=null||q?.z!=null))result.z=mix(q?.z||0,p.z||0,blend);
   if(p.id!=null){
    Object.assign(result,{vx:mix(q?.vx??p.vx??0,p.vx||0,blend),vy:mix(q?.vy??p.vy??0,p.vy||0,blend),travelled:mix(q?.travelled??p.travelled??0,p.travelled||0,blend),contact:holder===p.id?1:0});
    if(p.motion){result.motion={...p.motion};if(q?.motion)for(const key of Object.keys(p.motion))result.motion[key]=key==='stopSide'?p.motion[key]:['heading','travel','upperHeading','gazeHeading'].includes(key)?turn(q.motion[key]??p.motion[key],p.motion[key],blend):mix(q.motion[key]??p.motion[key],p.motion[key],blend);}
    if(p.stickControl&&q?.stickControl){result.stickControl={...p.stickControl};for(const k of ['forward','lateral'])result.stickControl[k]=mix(q.stickControl[k],p.stickControl[k],blend);result.stickControl.heading=turn(q.stickControl.heading,p.stickControl.heading,blend);}
    if(p.netFront?.at>wall)result.netFront=q?.netFront?.at<=wall?q.netFront:null;
    // A capture may straddle a release. Never start its follow-through early.
    if(p.action?.at>wall)result.action=q?.action?.at<=wall?q.action:null;
    if(p.keeperState&&q?.keeperState&&p.keeperState.at===q.keeperState.at){result.keeperState={...p.keeperState,drop:mix(q.keeperState.drop,p.keeperState.drop,blend),glove:{lateral:mix(q.keeperState.glove.lateral,p.keeperState.glove.lateral,blend),z:mix(q.keeperState.glove.z,p.keeperState.glove.z,blend)},blocker:{lateral:mix(q.keeperState.blocker.lateral,p.keeperState.blocker.lateral,blend),z:mix(q.keeperState.blocker.z,p.keeperState.blocker.z,blend)}};}else if(p.keeperState?.at>wall)result.keeperState=q?.keeperState||null;
    if(p.keeperAction?.at>wall)result.keeperAction=q?.keeperAction?.at<=wall?q.keeperAction:null;
    if(p.keeperBody){const old=q?.keeperBody;result.keeperBody=p.keeperBody.at>wall?old||null:old?{...p.keeperBody,drop:mix(old.drop,p.keeperBody.drop,blend),load:mix(old.load,p.keeperBody.load,blend),facing:turn(old.facing,p.keeperBody.facing,blend)}:{...p.keeperBody};}
    if(p.balanceState?.at>wall)result.balanceState=q?.balanceState?.at<=wall?q.balanceState:null;
    if(p.contactAction?.at>wall)result.contactAction=q?.contactAction?.at<=wall?q.contactAction:null;
    if(p.windup?.at>wall)result.windup=q?.windup?.at<=wall?q.windup:null;
    if(!p.windup&&q?.windup&&wall<q.windup.at+q.windup.duration)result.windup=q.windup;
    if(p.footPlants)result.footPlants=p.footPlants.map((plant,i)=>{const old=q?.footPlants?.[i];return plant?.at>wall?old||null:plant&&old&&plant.at===old.at?{...plant,x:mix(old.x,plant.x,blend),y:mix(old.y,plant.y,blend),...(Number.isFinite(plant.angle)?{angle:turn(old.angle??plant.angle,plant.angle,blend)}:{})}:plant;});
   }
   return result;
  };
  let flight=frame.flight?{...frame.flight}:null;
  if(flight&&Number.isFinite(flight.elapsed)&&continuous&&before.flight?.kind===flight.kind&&before.flight?.from===flight.from&&before.flight?.start.x===flight.start.x&&before.flight?.start.y===flight.start.y)flight.elapsed=mix(before.flight.elapsed??flight.elapsed,flight.elapsed,t);
  else if(flight&&Number.isFinite(flight.elapsed)&&continuous){
   const started=(frame.wall??frame.time)-flight.elapsed;
   flight=wall+1e-7<started?(before.flight?{...before.flight}:null):{...flight,elapsed:Math.max(0,wall-started)};
  }
  const effects=(frame.effects||[]).filter(e=>e.at<=wall+1e-7);
  let puck=pos(frame.puck,before?.puck);
  // Resolve the recorded polyline through a save, post or board contact.
  // Interpolating only the two tick endpoints cuts through the obstacle and
  // can entirely hide a short incoming shot before its rebound.
  const path=continuous?frame.puckPath:null;
  if(path?.length&&wall>=path[0].at-1e-7){
   let index=0;while(index+1<path.length&&path[index+1].at<=wall+1e-7)index++;
   const a=path[index],b=path[Math.min(index+1,path.length-1)],span=b.at-a.at,u=span>1e-7?clamp((wall-a.at)/span,0,1):1;
   puck={...puck,x:mix(a.x,b.x,u),y:mix(a.y,b.y,u),z:mix(a.z||0,b.z||0,u)};
  }
  const transitions=frame.actors.flatMap(a=>[a.action,a.keeperAction,a.contactAction]).filter(a=>a&&a.at>(before?.wall??-Infinity)+1e-7),contactAt=Math.min(frame.wall??frame.time,...transitions.map(a=>a.at));
  if(continuous&&wall<contactAt-1e-7&&Number.isFinite(before.flight?.duration)&&Number.isFinite(before.flight?.elapsed))flight={...before.flight,elapsed:Math.min(before.flight.duration,(before.flight.elapsed||0)+wall-(before.wall??before.time))};
  const goal=(frame.effects||[]).find(e=>e.kind==='goal'&&e.at>(before?.wall??-Infinity)+1e-7),score=continuous&&goal&&wall<goal.at?before.score:frame.score;
  const board=continuous&&wall<(goal?.at??frame.wall??frame.time)-1e-7?before:frame;
  return {...frame,time,wall,score,strength:board.strength,penalties:board.penalties,carrier:holder,actors:frame.actors.map(a=>pos(a,prior.get(a.id))),puck,flight,effects};
 }
 function replayAnalysis(frames,frame,observation=null){
  const clock=frame.wall??frame.time,past=frames.filter(f=>(f.wall??f.time)<=clock+1e-7&&(f.wall??f.time)>=clock-5);
  const latest=predicate=>[...past,frame].reverse().find(predicate),lines=[],rings=[],notes=[];
  const pass=latest(f=>f.flight?.kind==='pass');
  if(pass){lines.push({kind:'pass',points:[pass.flight.start,pass.flight.end]});notes.push('Blå linje: den spelade passningsvägen.');}
  let shot=latest(f=>f.flight?.kind==='shot');
  if(!shot){
   // A close block/save may complete between replay captures. The observed
   // release action still records its real origin and intended shooting lane.
   const release=[...past,frame].flatMap(f=>f.actors).filter(a=>a.action?.kind==='shot'&&a.action.at<=clock&&clock-a.action.at<5).sort((a,b)=>b.action.at-a.action.at)[0];
   if(release)shot={flight:{from:release.id,side:release.side,start:release.action.origin,end:release.action.target}};
  }
  const side=shot?.flight.side??frame.owner;
  const preparing=frame.actors.find(a=>a.windup&&a.windup.at<=clock);
  if(preparing){lines.push({kind:'shot',points:[frame.puck,preparing.windup.target]});notes.unshift('Rött: skytten förbereder avslutet och kan fortfarande störas.');}
  else if(shot)lines.push({kind:'shot',points:[shot.flight.start,shot.flight.end]});
  const keeper=frame.actors.find(a=>a.role==='G'&&a.side!==side);
  if(keeper){
   const trail=past.filter(f=>(f.wall??f.time)>=clock-2.5).map(f=>f.actors.find(a=>a.id===keeper.id)).filter(Boolean);
   trail.push(keeper);const travel=trail.slice(1).reduce((sum,a,i)=>sum+Math.hypot(a.x-trail[i].x,a.y-trail[i].y),0);
   if(travel>.15){lines.push({kind:'keeper',points:trail.map(a=>({x:a.x,y:a.y}))});notes.push('Grönt spår: målvakten har förflyttat sig '+travel.toFixed(1).replace('.',',')+' m.');}
   if(shot){
    const origin=shot.flight.start,dx=keeper.x-origin.x,dy=keeper.y-origin.y,l=dx*dx+dy*dy;
    const screens=frame.actors.filter(a=>a.role!=='G'&&a.id!==shot.flight.from).filter(a=>{
     const t=l?((a.x-origin.x)*dx+(a.y-origin.y)*dy)/l:0;return t>.15&&t<.98&&Math.hypot(a.x-origin.x-dx*t,a.y-origin.y-dy*t)<.9;
    });
    if(screens.length){lines.push({kind:'screen',points:[origin,{x:keeper.x,y:keeper.y}]});screens.forEach(a=>rings.push({kind:'screen',x:a.x,y:a.y}));notes.unshift('Gult: '+screens.map(a=>a.name?.split(' ').at(-1)||'spelare').join(', ')+' står i målvaktens siktlinje.');}
    else notes.unshift('Fri siktlinje mellan skottet och målvakten i detta ögonblick.');
   }
  }
  const contacts=frame.actors.filter(a=>a.contactAction&&clock-a.contactAction.at>=0&&clock-a.contactAction.at<.9);
  for(const a of contacts){const c=a.contactAction;if(['block','tip','check','pin','bobble'].includes(c.kind)){rings.push({kind:'contact',x:c.spot.x,y:c.spot.y});notes.unshift((a.name||'Spelaren')+' · '+({block:'blockerar vid puckkontakten',tip:'styr pucken',check:'fullföljer tacklingen',pin:'låser sargduellen',bobble:'tappar den första mottagningen'})[c.kind]+'.');}}
  if(observation&&clock>=observation.wall){
   const point=observation.spot;
   rings.push({kind:'contact',x:point.x,y:point.y});
   if(observation.from)lines.push({kind:observation.kind==='marking'?'contact':'pass',points:[observation.from,point]});
   for(const id of observation.players||[]){const actor=frame.actors.find(a=>a.id===id);if(actor)rings.push({kind:'contact',x:actor.x,y:actor.y});}
   const text=({diagonal:'Markerat: den genomförda diagonalpassningen.',turnover:'Markerat: puckkontrollen går över till motståndaren.',support:'Vid observationen saknas en nära medspelare med fri passningsväg.',marking:'Markerat: mottagaren har över fyra meter till sin tilldelade försvarare.','pp-rotation':'Markerat: passning under lagets PP-rotation.','pk-press':'Markerat: BP följer upp en misslyckad mottagning med press.'})[observation.kind];if(text)notes.unshift(text);
  }
  if(!notes.length)notes.push('Spola fram till passningen eller skottet för att läsa situationen.');
  return {lines,rings,notes:notes.slice(0,3)};
 }
 return {sample,replayAnalysis};
})();
