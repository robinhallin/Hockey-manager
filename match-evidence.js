"use strict";
// Read-only observations. Never draw randomness or change the simulation.
function matchCoachEvidence(analysis,clock,players=[],plan={}){
 const start=Math.max(0,clock-300),shots=(analysis?.shots||[]).filter(s=>Number.isFinite(s.time)&&s.time>=start&&s.time<=clock);
 const even=shots.filter(s=>s.situation==='even'),own=even.filter(s=>s.side==='own'),against=even.filter(s=>s.side==='opponent');
 const danger=rows=>rows.filter(s=>s.dangerous===true).length,advice=[];
 const tired=players.filter(p=>Number.isFinite(p.energy)&&p.energy<55);
 if(tired.length>=2)advice.push({key:'energy',title:'Den aktiva formationen är sliten',evidence:tired.map(p=>p.name+' '+Math.round(p.energy)+' %').join(' · '),suggestion:'Överväg en utvilad formation och kortare byten. Kontrollera först om icing eller special teams begränsar bytet.',risk:'Mer rotation ger också mindre istid till dina främsta spelare.',tab:'changes',action:'Granska byten'});
 if(!analysis?.partial&&clock>=180&&against.length>=5&&danger(against)>=3&&danger(against)>=danger(own)+2)advice.push({key:'danger',title:'Motståndaren kommer till farliga lägen',evidence:'Lika styrka: '+danger(against)+' farliga avslut på '+against.length+' skottförsök mot våra '+danger(own)+' på '+own.length+'.',suggestion:'Se över pressen och det defensiva ansvaret. En mer avvaktande forecheck kan hjälpa laget att hålla ihop.',risk:'Lägre press ger motståndaren mer tid med pucken. Underlaget visar lägena, inte att pressen ensam orsakat dem.',tab:'tactics',action:'Granska taktiken'});
 if(!analysis?.partial&&clock>=180&&own.length>=6&&danger(own)<=1)advice.push({key:'quality',title:'Många försök, få farliga lägen',evidence:'Lika styrka: '+own.length+' skottförsök, varav '+danger(own)+' farliga.',suggestion:'Överväg att söka bättre lägen i avslutsvalet. Kontrollera också att kedjan har passningsskicklighet och spelsinne.',risk:'Mer tålamod kan ge färre avslut och fler pucktapp. Dåliga skottlägen bevisar inte att ett enskilt taktiskt val är fel.',tab:'tactics',action:'Granska avslutsval'});
 const penalties=(analysis?.events||[]).filter(e=>e.type==='penalty'&&e.side==='own'&&Number.isFinite(e.time)&&e.time>=start&&e.time<=clock);
 if(!analysis?.partial&&penalties.length>=2)advice.push({key:'discipline',title:'Utvisningarna stör matchplanen',evidence:penalties.length+' egna utvisningar under perioden som granskas.',suggestion:'Överväg en mer disciplinerad fysisk nivå och granska vilka spelare som tar utvisningarna.',risk:'Försiktigare spel kan minska trycket i närkamperna. Två utvisningar kan fortfarande vara tillfälligheter.',tab:'tactics',action:'Granska fysisk nivå'});
 for(const row of advice){
  if(row.key==='danger'&&plan.forecheck==='passive')Object.assign(row,{suggestion:'Pressen är redan avvaktande. Granska formationernas försvarsegenskaper och positionsvana innan du ändrar pressen igen.',tab:'lineup',action:'Granska formationerna'});
  if(row.key==='quality'&&plan.shotChoice==='patient')Object.assign(row,{suggestion:'Ni söker redan bättre lägen. Granska kedjornas passningar, spelsinne och samspel innan du ändrar avslutsvalet igen.',tab:'lineup',action:'Granska formationerna'});
  if(row.key==='discipline'&&plan.physicality==='safe')Object.assign(row,{suggestion:'Laget spelar redan disciplinerat. Granska vilka spelare som tar utvisningarna och deras disciplin innan du ändrar den fysiska nivån igen.',tab:'events',action:'Granska utvisningarna'});
 }
 return {clock,start,advice:advice.slice(0,2),note:analysis?.partial?'Matchen har delvis registrerade data. Inga taktiska slutsatser dras från skottsiffrorna.':clock<180?'Vi samlar underlag. Vänta med stora taktiska slutsatser från de första minuterna.':!advice.length?'Inget tydligt återkommande problem i det senaste underlaget. Följ matchbilden innan du ändrar.':'Observationer, inte säkra orsaksförklaringar. Skottanalysen gäller enbart lika styrka; powerplay och boxplay blandas inte in.'};
}
function matchEvidenceReport(){
 const m=state.live;
 const ps=m&&!m.finished?(studioActive()?studioPlayers(0,false):[...currentLinePlayers(),...currentDefensePlayers()]):[];
 return matchCoachEvidence(m?.analysis,analysisClock(),[...new Map(ps.map(p=>[String(p.id),p])).values()].map(p=>({name:p.name,energy:matchEnergy(p)})),state.tacticalPlan||{});
}
function matchEvidenceBody(){
 const report=matchEvidenceReport();
 return `<p class="mc-note">${analysisTime(report.start)}–${analysisTime(report.clock)} spelad matchtid</p>${report.advice.map(a=>`<article><strong>${trainingSafe(a.title)}</strong><p>${trainingSafe(a.evidence)}</p><p>${trainingSafe(a.suggestion)}</p><p class="mc-note"><b>Avvägning:</b> ${trainingSafe(a.risk)}</p><button class="btn secondary" onclick="matchTab('${a.tab}')">${a.action}</button></article>`).join('')}<p class="mc-note">${trainingSafe(report.note)}</p>`;
}
function matchEvidenceView(){return state.live?.finished?'':`<section class="mc-evidence" aria-label="Assistentens matchobservationer"><h3>Assistentens observationer</h3><div class="mc-evidence-body">${matchEvidenceBody()}</div></section>`;}
function matchEvidencePatch(){
 const node=document.querySelector('.mc-evidence-body');if(!node||node.contains?.(document.activeElement))return;
 const bucket=Math.floor(analysisClock()/30);if(node.evidenceBucket===bucket)return;
 node.evidenceBucket=bucket;node.innerHTML=matchEvidenceBody();
}
