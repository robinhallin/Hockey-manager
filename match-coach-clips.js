"use strict";
// Presentation of recorded observations; never rerun a match to explain it.
function matchClipLabel(kind){return ({diagonal:'Genomförd diagonalpassning',turnover:'Pucktapp',support:'Puckförare utan nära fritt understöd',marking:'Passning till en fri spelare i slottet','pp-rotation':'Passning under PP-rotation','pk-press':'BP-press efter missad mottagning'})[kind]||'Matchsekvens';}
function matchClipQuery(key){
 const rows={breakout:[['turnover',0],['support',0]],danger:[['marking',0],['diagonal',1]],'clip-diagonal-even':[['diagonal',1,'even']],'clip-diagonal-pk':[['diagonal',1,'pp']],'clip-support':[['support',0,'even']],'clip-marking':[['marking',0,'even']],'clip-pp-pressure':[['pk-press',1,'pk']]};
 return rows[key]||[];
}
function matchClipButtons(query,start=0,end=Infinity,label='Visa sekvens',limit=2){
 if(!query?.length||!studioActive())return '';
 const clips=(studioEngine().tacticalClips||[]).filter(c=>c.time>=start&&c.time<=end&&query.some(([kind,side,situation])=>kind===c.kind&&side===c.side&&(!situation||c.situation===situation))).slice(-limit).reverse();
 return clips.length?`<div class="mc-clip-links">${clips.map(c=>`<button type="button" class="btn secondary" onclick="studioObservationClip(${c.id})" aria-label="${trainingSafe(label+' · '+matchClipLabel(c.kind)+' · '+analysisTime(c.time))}">${trainingSafe(label)} · ${analysisTime(c.time)}</button>`).join('')}</div>`:'';
}
function matchClipAdvice(e){
 if(!e)return [];
 const rows=(e.tacticalObservations||[]).filter(o=>o.time>=e.time-300&&o.time<=e.time),advice=[];
 const add=(key,kind,side,situation,min,title,suggestion,risk)=>{
  const found=rows.filter(o=>o.kind===kind&&o.side===side&&o.situation===situation);if(found.length<min)return;
  const span=situation==='even'?'lika styrka':side===0?(situation==='pp'?'eget powerplay':'eget boxplay'):(situation==='pp'?'eget boxplay':'eget powerplay');
  advice.push({key,title,evidence:`${found.length} registrerade situationer vid ${span} under de senaste fem spelminuterna. Klippen visar exempel ur det underlaget.`,suggestion,risk,tab:'tactics',action:'Granska taktiken'});
 };
 add('clip-diagonal-even','diagonal',1,'even',3,'Motståndaren hittar diagonalpassningen','Granska täckningen av bortre flanken och vilka spelare som dras mot pucken.','Tätare täckning i mitten kan lämna mer utrymme vid sargen.');
 add('clip-diagonal-pk','diagonal',1,'pp',3,'Diagonalerna går igenom vårt boxplay','Granska boxens förflyttning och om första pressen lämnar passningsvägen öppen.','En mer samlad box ger motståndaren längre tid på flanken.');
 add('clip-support','support',0,'even',2,'Puckföraren saknar nära understöd','Se var medspelarna befinner sig när uppspelet sätts under press. Granska uppspel och rollfördelning.','Närmare understöd kan minska bredden och möjligheten till en snabb omställning.');
 add('clip-marking','marking',0,'even',2,'Fria mottagare i slottet','Granska avståndet mellan mottagaren och den tilldelade försvararen i klippen.','Att skydda slottet tätare kan lämna backarna friare på blålinjen.');
 add('clip-pp-pressure','pk-press',1,'pk',2,'Lösa mottagningar utlöser BP-press','Granska mottagningarna och understödet i powerplayet.','Kortare passningar kan ge bättre kontroll men flyttar boxen mindre.');
 return advice;
}
function studioObservationClip(id){
 const clip=studioEngine()?.tacticalClips?.find(c=>c.id===Number(id));if(!clip?.frames.length)return;
 const returnView=studioReplayState?.returnView||{visual:studioVisualMode,camera:studioCamera3D,expanded:studioExpanded3D};
 pauseMatch();studioVisualMode='3d';studioCamera3D='auto';studioExpanded3D=false;
 studioReplayState={frames:clip.frames,clip,elapsed:0,lastNow:null,rate:studioReplayRate(null),paused:false,analysis:true,returnView};
 render();matchFocus('career-ice-3d');
}
function studioReplayDuration(r=studioReplayState){if(!r?.frames?.length)return 0;const first=r.frames[0],last=r.frames.at(-1);return Math.max(0,Number(((last.wall??last.time)-(first.wall??first.time)).toFixed(6)));}
function matchClipFollowup(row){
 if(!row.clipMatchId||row.clipMatchId!==state.live?.analysis?.id)return '';
 const query=row.clipQuery||row.coachDecision?.clipQuery;if(!query?.length)return '';
 const time=row.clipTime??row.time,end=row.clipEnd??row.end;
 const before=matchClipButtons(query,Math.max(0,time-300),time,'Före beslutet',1),after=matchClipButtons(query,time+.0001,end,'Efter beslutet',1);
 return before||after?`<div class="mc-clip-comparison"><p>Jämför liknande situationer. Klippen är exempel; motstånd och femmor kan skilja sig.</p>${before||'<small>Inget inspelat exempel kvar före beslutet.</small>'}${after||'<small>Ingen motsvarande inspelad situation efter beslutet ännu.</small>'}</div>`:'';
}
let matchClipPending=null;
function matchClipInspect(key){
 const advice=matchEvidenceReport().advice.find(a=>a.key===key),query=matchClipQuery(key);if(!advice||!query.length)return;
 pauseMatch();matchClipPending={match:state.live,time:analysisClock(),query};matchTab(advice.tab);
}
function matchClipCurrentFollowup(){
 const row=tacticalReviewSnapshot().at(-1);return row?.clipQuery&&!row.coachDecision?matchClipFollowup(row):'';
}

function matchClipRecentView(){
 if(!studioActive())return '';
 const clips=studioEngine().tacticalClips||[];if(!clips.length)return '';
 return `<details class="mc-recorded-clips"><summary>Inspelade situationer · ${clips.length}</summary><p>Öppna en sekvens från matchen. Klockan pausas medan du granskar den.</p><div class="mc-clip-links">${[...clips].reverse().map(c=>`<button type="button" class="btn secondary" onclick="studioObservationClip(${c.id})">${analysisTime(c.time)} · ${trainingSafe(matchClipLabel(c.kind))} · ${c.side===0?'Eget lag':'Motståndaren'}</button>`).join('')}</div></details>`;
}
