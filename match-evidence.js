"use strict";
// Read-only observations. Never draw randomness or change the simulation.
function matchFlowEvidence(analysis,start,clock){
 const rows=(analysis?.flow||[]).filter(r=>Number.isFinite(r.time)&&r.time<=clock);
 if(rows.length<2)return null;
 const first=[...rows].reverse().find(r=>r.time<=start)||rows[0],last=rows.at(-1);
 if(!first||!last||last.time-first.time<120)return null;
 const delta=(side,key)=>Math.max(0,Number(last.sides?.[side]?.[key]||0)-Number(first.sides?.[side]?.[key]||0));
 const side=i=>({attempts:delta(i,'attempts'),passes:delta(i,'passes'),passAttempts:delta(i,'passAttempts'),entries:delta(i,'entries'),zone:delta(i,'zone'),turnovers:delta(i,'turnovers'),battles:delta(i,'battles'),battleWins:delta(i,'battleWins'),dumps:delta(i,'dumps'),clears:delta(i,'clears')});
 return {seconds:last.time-first.time,own:side(0),against:side(1)};
}
function matchFlowAdvice(flow){
 if(!flow)return [];
 const o=flow.own,a=flow.against,rows=[],pct=(n,d)=>d?Math.round(n/d*100):0;
 if(o.turnovers>=4&&o.turnovers>=a.turnovers+2)rows.push({key:'breakout',title:'Pucktappen bromsar vårt spel',evidence:`${o.turnovers} pucktapp mot ${a.turnovers} under de senaste ${analysisTime(flow.seconds)}. Vi har samtidigt ${o.entries} registrerade zoninträden.`,suggestion:'Granska uppspelen: sänk tempot för puckföraren eller ge bättre understöd i formationen innan du kräver mer risk.',risk:'Lägre tempo kan göra laget lättare att sätta press på. Pucktappen visar problemet, inte att tempot ensamt orsakar det.',tab:'tactics',action:'Granska uppspel och tempo'});
 if(o.entries+2<a.entries&&a.entries>=5)rows.push({key:'entries',title:'Motståndaren tar sig in i zon oftare',evidence:`Zoninträden ${o.entries}–${a.entries} under ${analysisTime(flow.seconds)}.`,suggestion:'Granska forecheck, neutralzonspositioner och vilka femmor som varit på isen. Välj om ni ska störa tidigare eller skydda blålinjen bättre.',risk:'Hårdare press kan stoppa uppspel tidigare men öppnar yta bakom första pressen.',tab:'tactics',action:'Granska försvarsspelet'});
 if(o.battles>=6&&pct(o.battleWins,o.battles)<=35)rows.push({key:'battles',title:'Vi förlorar för många puckdueller',evidence:`${o.battleWins} vunna av ${o.battles} registrerade dueller (${pct(o.battleWins,o.battles)} %).`,suggestion:'Granska vilka spelare som används i de utsatta femmorna. Mer fysisk nivå är ett alternativ, men kan också ge fler utvisningar.',risk:'Ett aggressivare närkampsspel ökar belastning och utvisningsrisk. Ett kort underlag kan påverkas av vilka spelare och motståndare som varit på isen.',tab:'lineup',action:'Granska formationerna'});
 return rows;
}
function matchCoachEvidence(analysis,clock,players=[],plan={}){
 const start=Math.max(0,clock-300),shots=(analysis?.shots||[]).filter(s=>Number.isFinite(s.time)&&s.time>=start&&s.time<=clock);
 const even=shots.filter(s=>s.situation==='even'),own=even.filter(s=>s.side==='own'),against=even.filter(s=>s.side==='opponent');
 const danger=rows=>rows.filter(s=>s.dangerous===true).length,advice=[];
 const tired=players.filter(p=>Number.isFinite(p.energy)&&p.energy<55);
 const flow=matchFlowEvidence(analysis,start,clock);advice.push(...matchFlowAdvice(flow));
 if(players.length>=3){
  const ids=players.map(p=>p.id).filter(id=>id!=null),forwards=ids.filter(id=>playerById(id)?.pos!=='B'),defense=ids.filter(id=>playerById(id)?.pos==='B');
  for(const [type,group,label] of [['forwards',forwards,'forwardskedjan'],['defense',defense,'backparet']]){
   const fit=lineTacticalFit(group,type);if(group.length>=(type==='forwards'?3:2)&&fit.value<55)advice.push({key:'linefit-'+type,title:'Formationen har tydliga rollhål',players:group.map(id=>playerById(id)).filter(Boolean).map(p=>({id:p.id,name:p.name})),evidence:`Den aktiva ${label} har ${fit.value} % taktisk passform. ${fit.warnings.slice(0,2).join('. ')}.`,suggestion:'Överväg en spelare som kompletterar formationens saknade uppgift. Kemin kan fortfarande vara hög – detta är en separat bedömning av rollbalansen.',risk:'Ett byte kan förbättra rollbalansen men försämra kemi, positionsvana eller individuell kvalitet.',tab:'lineup',action:'Granska formationen'});
  }
 }
 if(tired.length>=2)advice.push({key:'energy',players:tired,title:'Den aktiva formationen är sliten',evidence:tired.length+' spelare i den aktiva formationen har under 55 % energi.',suggestion:'Överväg en utvilad formation och kortare byten. Kontrollera först om icing eller special teams begränsar bytet.',risk:'Mer rotation ger också mindre istid till dina främsta spelare.',tab:'changes',action:'Granska byten'});
 if(!analysis?.partial&&!analysis?.strengthPartial&&clock>=180&&against.length>=5&&danger(against)>=3&&danger(against)>=danger(own)+2)advice.push({key:'danger',title:'Motståndaren kommer till farliga lägen',evidence:'Lika styrka: '+danger(against)+' farliga avslut på '+against.length+' skottförsök mot våra '+danger(own)+' på '+own.length+'.',suggestion:'Se över pressen och det defensiva ansvaret. En mer avvaktande forecheck kan hjälpa laget att hålla ihop.',risk:'Lägre press ger motståndaren mer tid med pucken. Underlaget visar lägena, inte att pressen ensam orsakat dem.',tab:'tactics',action:'Granska taktiken'});
 if(!analysis?.partial&&!analysis?.strengthPartial&&clock>=180&&own.length>=6&&danger(own)<=1)advice.push({key:'quality',title:'Många försök, få farliga lägen',evidence:'Lika styrka: '+own.length+' skottförsök, varav '+danger(own)+' farliga.',suggestion:'Överväg att söka bättre lägen i avslutsvalet. Kontrollera också att kedjan har passningsskicklighet och spelsinne.',risk:'Mer tålamod kan ge färre avslut och fler pucktapp. Dåliga skottlägen bevisar inte att ett enskilt taktiskt val är fel.',tab:'tactics',action:'Granska avslutsval'});
 const penalties=(analysis?.events||[]).filter(e=>e.type==='penalty'&&e.side==='own'&&Number.isFinite(e.time)&&e.time>=start&&e.time<=clock);
 if(!analysis?.partial&&penalties.length>=2)advice.push({key:'discipline',players:[...new Map(penalties.filter(e=>e.playerId!=null&&e.playerName).map(e=>[String(e.playerId),{id:e.playerId,name:e.playerName}])).values()],title:'Utvisningarna stör matchplanen',evidence:penalties.length+' egna utvisningar under perioden som granskas.',suggestion:'Överväg en mer disciplinerad fysisk nivå och granska vilka spelare som tar utvisningarna.',risk:'Försiktigare spel kan minska trycket i närkamperna. Två utvisningar kan fortfarande vara tillfälligheter.',tab:'tactics',action:'Granska fysisk nivå'});
 for(const row of advice){
  if(row.key==='danger'&&plan.forecheck==='passive')Object.assign(row,{suggestion:'Pressen är redan avvaktande. Granska formationernas försvarsegenskaper och positionsvana innan du ändrar pressen igen.',tab:'lineup',action:'Granska formationerna'});
  if(row.key==='quality'&&plan.shotChoice==='patient')Object.assign(row,{suggestion:'Ni söker redan bättre lägen. Granska kedjornas passningar, spelsinne och samspel innan du ändrar avslutsvalet igen.',tab:'lineup',action:'Granska formationerna'});
  if(row.key==='discipline'&&plan.physicality==='safe')Object.assign(row,{suggestion:'Laget spelar redan disciplinerat. Granska vilka spelare som tar utvisningarna och deras disciplin innan du ändrar den fysiska nivån igen.',tab:'events',action:'Granska utvisningarna'});
 }
 return {clock,start,flow,advice:advice.slice(0,2),note:analysis?.partial?'Matchen har delvis registrerade data. Inga taktiska slutsatser dras från skottsiffrorna.':clock<180?'Vi samlar underlag. Vänta med stora taktiska slutsatser från de första minuterna.':!advice.length?'Inget tydligt återkommande problem i det senaste underlaget. Följ matchbilden innan du ändrar.':'Observationer, inte säkra orsaksförklaringar. Skottanalysen gäller enbart lika styrka; powerplay och boxplay blandas inte in.'};
}
function matchEvidenceReport(){
 const m=state.live;
 const ps=m&&!m.finished?(studioActive()?studioPlayers(0,false):[...currentLinePlayers(),...currentDefensePlayers()]):[];
 const report=matchCoachEvidence(m?.analysis,m?analysisClock():0,[...new Map(ps.map(p=>[String(p.id),p])).values()].map(p=>({id:p.id,name:p.name,energy:matchEnergy(p)})),state.tacticalPlan||{});
 const situation=m&&!m.finished&&matchCoachSituation(report.clock,{own:m.hv,against:m.opp},{...state.tacticalPlan,tactic:state.tactic});
 if(situation)report.advice=[situation,...report.advice].slice(0,2);
 return report;
}
function matchEvidenceBody(){
 const current=matchCoachCurrent();
 if(current)return matchBriefLive()+matchCoachFollowupView(current.row,current.closed,!state.live.finished);
 const report=matchEvidenceReport();
 return `${matchBriefLive()}<p class="mc-note">${analysisTime(report.start)}–${analysisTime(report.clock)} spelad matchtid · assistentens bedömning</p>${report.advice[0]?matchCoachAdviceView(report.advice[0]):''}${report.advice.slice(1).map(a=>`<details class="mc-other-observations"><summary>Ytterligare observation · ${trainingSafe(a.title)}</summary>${matchCoachAdviceView(a)}</details>`).join('')}<p class="mc-note">${trainingSafe(report.note)}</p>`;
}
function matchEvidenceView(){
 if(state.live?.finished){const last=[...tacticalReviewSnapshot()].reverse().find(r=>r.coachDecision);return last?`<section class="mc-evidence"><h3>Ditt senaste matchbeslut</h3>${matchCoachFollowupView(last,true)}</section>`:'';}
 return `<section class="mc-evidence" aria-label="Assistentens matchobservationer"><h3>Assistentens observationer</h3><div class="mc-evidence-body">${matchEvidenceBody()}</div></section>`;
}
function matchEvidencePatch(){
 const node=document.querySelector('.mc-evidence-body');if(!node||node.contains?.(document.activeElement))return;
 const bucket=Math.floor(analysisClock()/30);if(node.evidenceBucket===bucket)return;
 node.evidenceBucket=bucket;node.innerHTML=matchEvidenceBody();
}
