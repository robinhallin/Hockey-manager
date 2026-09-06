"use strict";
(() => {
  const $=id=>document.getElementById(id),canvas=$('ice'),ctx=canvas.getContext('2d');
  const names={LW:'VF',C:'C',RW:'HF',LD:'VB',RD:'HB',G:'MV'};
  const labels={faceoff:'TEKNING',entry:'ZONINTRÄDE',pass:'PASSNING',turnover:'PUCKVINST',shot:'AVSLUT',save:'RÄDDNING',rebound:'RETUR',goal:'MÅL',wide:'UTANFÖR',block:'BLOCKERAT',clear:'RENSNING',loose:'LÖS PUCK',penalty:'UTVISNING','penalty-end':'FULLTALIGT',change:'SPELARBYTE',bench:'FRÅN BÄNKEN',scenario:'MATCHLÄGE',finished:'PERIODPAUS',stoppage:'AVBLÅSNING',offside:'OFFSIDE'};
  const time=n=>Math.floor(n/60).toString().padStart(2,'0')+':'+Math.floor(n%60).toString().padStart(2,'0');
  const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let match=new StudioHockey.Match(MATCH_LAB_ROSTERS),running=false,last=0,accumulator=0,lastUI=0,previous=null,replay=null;
  let highlighted=false,heldFocus=0,selected=null,announcement='',uiEventCount=-1;
  const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const initialSeed=710031;
  // A constant simulation step makes coverage, display refresh rate and playback speed outcome-neutral.
  function animate(now){
    const real=last?Math.min(.1,(now-last)/1000):0;last=now;
    if(replay){
      if(running)replay.elapsed+=real;
      const frames=replay.frames,index=Math.min(frames.length-1,Math.floor(replay.elapsed/.2));
      const next=frames[Math.min(index+1,frames.length-1)];draw(next,frames[index],(replay.elapsed%.2)/.2);
      $('clock').textContent=time(frames[index].time);
      $('commentary').textContent=frames[index].caption;$('event-label').textContent=labels[frames[index].eventType]||'REPRIS';
      if(index===frames.length-1){replay=null;running=false;announcement='';$('replay-label').hidden=true;updateUI();}
    }else{
      if(running&&!match.finished){
        const coverage=$('coverage').value,tempo=Number($('speed').value);
        accumulator+=real*tempo*(coverage==='broadcast'&&!match.focus?12:1);
        let steps=0;
        while(accumulator>=StudioHockey.STEP&&steps++<40){
          const focused=match.focus;previous=renderFrame();match.step();accumulator-=StudioHockey.STEP;
          // As soon as an entry/turnover begins a highlight, stop accelerated processing.
          if(!focused&&match.focus&&coverage==='broadcast'){accumulator=0;heldFocus=now+2200;break;}
          if(match.finished){running=false;accumulator=0;break;}
        }
      }
      highlighted=$('coverage').value==='full'||!running||match.focus||now<heldFocus;
      const overview=!highlighted&&!match.finished;
      $('between-play').hidden=!overview;
      draw(renderFrame(),previous,reducedMotion?1:Math.min(1,accumulator/StudioHockey.STEP));
    }
    if(now-lastUI>160){updateUI();lastUI=now;}
    requestAnimationFrame(animate);
  }
  function renderFrame(){return {time:match.time,phase:match.phase,puck:{...match.puck},carrier:match.carrier,owner:match.owner,actors:match.actors.map(a=>({id:a.id,side:a.side,role:a.role,name:a.player.name,x:a.x,y:a.y,vx:a.vx,vy:a.vy,duty:a.duty,status:a.status})),flight:match.flight?{kind:match.flight.kind,start:{...match.flight.start},end:{...match.flight.end}}:null};}
  function updateUI(){
    $('play').textContent=replay?(running?'Pausa reprisen':'Fortsätt reprisen'):match.finished?'Perioden är slut':running?'Pausa':match.time>0?'Fortsätt spela':'Starta perioden';
    $('play').disabled=match.finished&&!replay;
    $('match-status').textContent=replay?'REPRIS · MATCHEN PAUSAD':match.finished?'PERIODPAUS':running?'LIVE FRÅN HUSQVARNA GARDEN':match.time>0?'PAUSAT':'REDO FÖR NEDSLÄPP';
    $('score').innerHTML=match.score[0]+' <em>–</em> '+match.score[1];if(!replay)$('clock').textContent=time(match.time);
    $('phase-label').textContent=replay?'SENASTE AVSLUTET':StudioHockey.PHASES[match.phase].toUpperCase();
    $('strength').textContent=match.penalty?(match.penalty.side===0?'4 MOT 5':'5 MOT 4')+' · '+time(match.penalty.remaining):'5 MOT 5';
    $('event-label').textContent=labels[match.eventType]||'MATCHEN';
    const latest=match.caption;
    if(!replay&&latest!==announcement){$('commentary').textContent=latest;announcement=latest;}
    const goal=match.goals.at(-1);
    if(goal){$('goal-credit').className='scored';$('goal-credit').textContent=time(goal.time)+' · '+goal.player+(goal.assists.length?' · Assist: '+goal.assists.map(a=>a.name).join(', '):' · Utan assist');}
    else{$('goal-credit').className='';$('goal-credit').textContent='Husqvarna Garden · En fristående testperiod på 20 minuter';}
    const a=match.stats[0],b=match.stats[1];
    $('stats').innerHTML=[['Skott på mål',a.shots,b.shots],['Avslut totalt',a.attempts,b.attempts],['Tekningar',a.faceoffs,b.faceoffs],['Anfallszon',time(a.zone),time(b.zone)]].map(([title,h,v])=>`<div class="stat"><span>${title}</span><strong>${h}<em>–</em>${v}</strong></div>`).join('');
    const buckets=match.pressure.slice(-12);while(buckets.length<12)buckets.unshift({home:0,away:0});
    $('pressure-chart').innerHTML=buckets.map(p=>`<div class="pressure-column" title="Anfallszonstid: HV ${p.home.toFixed(1)} s, FBK ${p.away.toFixed(1)} s"><i class="home-pressure" style="height:${p.home/10*48}%"></i><i class="away-pressure" style="height:${p.away/10*48}%"></i></div>`).join('');
    $('overview-title').textContent=match.phase==='clear'?'Pucken rensas ur zonen':match.phase==='loose'?'Lagen arbetar för nästa puckvinst':match.teams[match.owner].name+' bygger nästa anfall';
    $('overview-copy').textContent=match.owner===0?'HV söker en väg genom mittzonen. Nästa farliga anfall visas på rinken.':'Vi håller ihop laget och försöker styra deras uppspel mot sargen.';
    $('overview-pressure').textContent='Skott '+a.shots+' – '+b.shots+' · Period 1';
    updateAdvice();
    const home=match.teams[0],change=home.change?.stage==='out'?'En spelare går av':home.change?.stage==='in'?'Ersättaren går in':home.requested||home.changeQueue.length?'Inväntar säkert byte':'Kedja '+(home.line+1);
    $('change-status').textContent=change;
    $('change-line').disabled=match.finished||Boolean(home.requested||home.changeQueue.length||home.change)||Boolean(replay);
    $('change-line').textContent=home.requested||home.changeQueue.length||home.change?'Byte begärt':'Begär nästa femma';
    $('on-ice').innerHTML=match.actors.filter(a=>a.side===0).sort((a,b)=>['LW','C','RW','LD','RD','G'].indexOf(a.role)-['LW','C','RW','LD','RD','G'].indexOf(b.role)).map(a=>`<div class="skater-row" title="${escape(a.duty)}"><span class="skater-role">${names[a.role]}</span><span class="skater-name">${escape(a.player.name)}</span><span class="skater-data">${Math.round(a.player.energy)} %</span><span class="energy-track"><i style="width:${a.player.energy}%;background:${a.player.energy<60?'#ed9d60':'#e4c652'}"></i></span></div>`).join('');
    $('replay').disabled=!match.latestReplay||Boolean(replay);
    $('replay').textContent=replay?'Repris pågår':'Visa senaste avslutet';
    $('apply-tactics').disabled=match.finished||Boolean(replay);
    if(uiEventCount!==match.events.length){
      const events=match.events.filter(e=>!['pass','loose'].includes(e.type)).slice(-14).reverse();
      $('events').innerHTML=events.length?events.map(e=>`<li class="${e.type==='goal'?'goal':''}"><time>${time(e.time)}</time><span>${escape(e.text)}</span></li>`).join(''):'<li>Perioden har inte startat.</li>';
      uiEventCount=match.events.length;
    }
  }
  function updateAdvice(){
    let text=match.advice;
    if(match.finished)text='Perioden är färdig. Jämför skott och anfallszonstid, eller spela om ett läge med andra instruktioner.';
    else if(match.penalty?.side===0)text='Håll boxen och skydda mitten. Vid puckvinst söker vi en säker rensning; en kontring kräver en fri väg.';
    else if(match.penalty)text=match.attackPasses<2?'Låt powerplayet ställa upp. Vi behöver flytta pucken och få isär deras box.':'Nu har vi flyttat pucken. Leta efter spel in i slottet eller ett skott genom trafik.';
    else if(match.teams[0].requested&&match.owner!==0)text='Byte begärt, men vi försvarar. Femman stannar tills puckläget är säkrare eller spelet blåses av.';
    else if(match.teams[0].change)text='Vi byter en spelare i taget. Övriga håller sina uppgifter tills ersättaren är på plats.';
    else if(match.phase==='counter')text=match.owner===0?'Snabb omställning. Sök den fria spelaren innan deras backcheck hinner hem.':'Jobba hem på insidan. Närmaste back styr pucken, övriga följer löpningarna.';
    else if(match.phase==='attack'&&match.owner===1)text='De har etablerat spel. Se vem som täcker slottet och vem som pressar puckföraren.';
    else if(match.phase==='attack')text=match.teams[0].tactics.mentality==='direct'?'Vi söker tidigare avslut. Backarna stannar bakom anfallet och säkrar hemåt.':'Sök en öppen passningsväg. En täckt spelare behöver flytta sig innan pucken kan gå in.';
    $('assistant').textContent=text;
  }
  function draw(frame,before,t){MatchBroadcastRenderer.draw(canvas,{...frame,eventType:frame.eventType||match.eventType},before,t,{selected,arena:'HUSQVARNA GARDEN'});}
  $('play').addEventListener('click',()=>{running=!running;last=0;updateUI();});
  $('coverage').addEventListener('change',()=>{accumulator=0;previous=null;updateUI();});
  $('speed').addEventListener('change',()=>{accumulator=0;});
  $('tactics').addEventListener('change',()=>{if(running&&!replay){running=false;updateUI();}$('tactic-note').textContent='Matchen är pausad. Ge instruktioner när du är klar.';});
  $('tactics').addEventListener('submit',e=>{e.preventDefault();if(match.finished||replay)return;running=false;match.setTactics(0,{mentality:$('mentality').value,pp:$('powerplay').value,pk:$('penaltykill').value});$('tactic-note').textContent='Instruktionerna gäller nu. Fortsätt när du är redo.';$('tactic-note').className='changed';updateUI();});
  $('change-line').addEventListener('click',()=>{match.requestChange(0);updateUI();});
  $('replay').addEventListener('click',()=>{if(!match.latestReplay)return;replay={frames:match.latestReplay.frames,elapsed:0};running=true;accumulator=0;$('between-play').hidden=true;$('replay-label').hidden=false;updateUI();});
  $('restart').addEventListener('click',()=>{
    running=false;replay=null;match=new StudioHockey.Match(MATCH_LAB_ROSTERS,{seed:initialSeed,scenario:$('scenario').value});
    previous=null;accumulator=0;heldFocus=0;selected=null;announcement='';uiEventCount=-1;
    $('replay-label').hidden=true;$('mentality').value='balanced';$('powerplay').value='131';$('penaltykill').value='box';
    $('tactic-note').className='';$('tactic-note').textContent='Pausa när du vill hinna läsa spelet.';
    updateUI();$('play').focus();$('studio').scrollIntoView({behavior:reducedMotion?'instant':'smooth',block:'start'});
  });
  canvas.addEventListener('click',e=>{
    const rect=canvas.getBoundingClientRect(),drawWidth=Math.min(rect.width,rect.height*1200/650),drawHeight=drawWidth*650/1200;
    const px=(e.clientX-rect.left-(rect.width-drawWidth)/2)/drawWidth*1200,py=(e.clientY-rect.top-(rect.height-drawHeight)/2)/drawHeight*650;
    const scale=1112/60,p={x:(px-44)/scale,y:(py-(650-30*scale)/2)/scale};
    const a=match.actors.find(a=>StudioHockey.distance(a,p)<1.6);
    if(a){selected=a.id;running=false;match.advice=a.player.name+': '+a.duty+'.';updateUI();$('assistant').textContent=match.advice;}
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden){running=false;last=0;updateUI();}});
  document.addEventListener('keydown',e=>{if(e.code==='Space'&&!['INPUT','SELECT','BUTTON','TEXTAREA'].includes(e.target.tagName)){e.preventDefault();if(!match.finished||replay){running=!running;updateUI();}}});
  updateUI();requestAnimationFrame(animate);
})();
