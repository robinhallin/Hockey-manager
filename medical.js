"use strict";
// Abstract game simulation, not real medical estimates or advice.
function ensureMedical(){
 if(!state.careerStarted)return;
 if(!state.medical)state.medical={version:1,day:0,nextId:1,history:[],message:'',rng:Math.floor(attrSeed(`${managerClub()}:medical`)*4294967296),staff:{doctor:'Lagläkare',physio:'Fysioterapeut',skill:15}};
 for(const roster of [...Object.values(state.clubRosters),state.playerWorld?.freeAgents||[],state.juniors?.roster||[]])for(const p of roster)if(!p.health)p.health={load:0,injury:null,clearance:'rest'};
}
function medicalRoll(){const s=state.medical;s.rng=(Math.imul(s.rng,1664525)+1013904223)>>>0;return s.rng/4294967296;}
function medicalReady(p){return Boolean(p&&(!p.health?.injury||(p.health.injury.remaining===0&&p.health.clearance!=='rest')));}
function medicalLimit(p){return p.health?.injury&&p.health.clearance==='limited'?(p.pos==='MV'?1800:600):Infinity;}
function medicalAvailable(p){return medicalReady(p)&&(!state.live||state.live.finished||(state.live.iceTime?.[p.id]||0)<medicalLimit(p));}
function medicalCanTrain(p){return !p.health?.injury;}
function medicalExcused(p,required=900){return Boolean(p.health?.injury||state.live?.medicalInjured?.includes(String(p.id)))&&(state.live?.iceTime?.[p.id]||0)<required;}
function medicalStatus(p){const i=p.health?.injury;if(!i)return 'Spelklar';return i.remaining>2?'Skadad':i.remaining>0?'Rehabilitering':p.health.clearance==='rest'?'Återgångsträning':p.health.clearance==='limited'?'Begränsad comeback':'Full comeback · förhöjd risk';}
function medicalRisk(p,hard=false){const h=p.health||{load:0};return 1+(p.fatigue||0)/45+h.load/60+(hard?1:0)+(h.injury?(h.clearance==='full'?4:2):0);}
function medicalRiskLabel(p){const r=medicalRisk(p);return r>=4?'Hög':r>=2.5?'Förhöjd':'Normal';}
function medicalReport(title,body){const s=state.medical;s.history.unshift({id:s.nextId++,day:s.day,title,body});s.history=s.history.slice(0,70);managerMessage(`medical:${s.nextId}`,title,body,'Medicinskt team',{link:'medical'});}
function medicalNotice(text){state.medical.message=text;save();render();}
function injurePlayer(p,source='match',days=null){
 ensureMedical();if(!p||p.health.injury?.remaining>0)return false;
 const setback=Boolean(p.health.injury),duration=days??(3+Math.floor(medicalRoll()*10));
 p.health.injury={name:setback?'Bakslag i återgången':['Muskelbesvär','Ledbesvär','Kontusionsskada'][Math.floor(medicalRoll()*3)],remaining:duration,initial:duration,readiness:55,source};p.health.clearance='rest';
 if(state.live&&!state.live.finished&&source==='match'){
   if(!state.live.medicalInjured)state.live.medicalInjured=[];state.live.medicalInjured.push(String(p.id));state.live.medicalPauseWanted=true;
   addEvent(`${p.name} måste lämna isen. Medicinska teamet tar över.`,'injury');
 }
 medicalReport(`${p.name}: ${setback?'bakslag':'skaderapport'}`,`${p.health.injury.name}. Preliminärt ${Math.max(1,duration-1)}–${duration+2} återhämtningsdagar till återgångsträning, därefter gradvis comeback. Prognosen följs upp dagligen.`);
 repairMedicalLines();return true;
}
function medicalDay(session=null){
 ensureMedical();const s=state.medical;ensureClub();s.day++;
 for(const p of [...Object.values(state.clubRosters).flat(),...(state.playerWorld?.freeAgents||[]),...(state.juniors?.roster||[])]){
   const h=p.health;
   if(!isOwnPlayer(p)){h.load*=.8;if(h.injury){if(h.injury.remaining>0)h.injury.remaining--;else{h.injury.readiness=Math.min(100,h.injury.readiness+15);if(h.injury.readiness===100){h.injury=null;h.clearance='rest';}}}continue;}
   const rest=Boolean(h.injury)||!session||session.type==='recovery'||p.trainingLoad==='rest',hard=session?.intensity==='hard'&&p.trainingLoad!=='light';
   h.load=trainingClamp(h.load*(.8+(15-s.staff.skill)*.008)+(rest?0:hard?12:5));
   if(h.injury){const i=h.injury;
     if(i.remaining>0){i.remaining--;p.fatigue=Math.max(0,p.fatigue-12);if(i.remaining===0)medicalReport(`${p.name}: återgångsträning`,`${p.name} kan börja återgångsträna. Fortsatt återhämtning är det lugnaste alternativet. Du kan också välja en begränsad comeback under Medicinskt team.`);}
     else{i.readiness=Math.min(100,i.readiness+(rest?15:10)*(.7+s.staff.skill/50));p.fatigue=Math.max(0,p.fatigue-10);
       if(i.readiness===100){h.injury=null;h.clearance='rest';medicalReport(`${p.name} är fullt återställd`,'Spelaren kan träna och spela normalt igen. Håll fortsatt koll på belastningen.');}
     }
   }else if(!rest&&medicalRoll()<.0004*medicalRisk(p,hard)){injurePlayer(p,'träning');}
 }
 repairMedicalLines();
}
function medicalAfterMatch(){
 // One abstract recovery day after the match; direct match play cannot freeze rehab.
 medicalDay();
}
function medicalExposure(players,seconds){
 const m=state.live;if(!m||m.finished||!Number.isFinite(seconds)||seconds<=0)return;
 for(const p of players){
   if(!p.health||p.health.injury?.remaining>0)continue;
   p.health.load=trainingClamp(p.health.load+seconds/240);
   if(medicalRoll()<.00018*seconds/60*medicalRisk(p))injurePlayer(p,'match');
   else if((m.iceTime?.[p.id]||0)>=medicalLimit(p)){
     if(!m.medicalLimited)m.medicalLimited=[];
     if(!m.medicalLimited.includes(String(p.id))){m.medicalLimited.push(String(p.id));m.medicalPauseWanted=true;addEvent(`${p.name} har nått comebackens istidsgräns och vilar resten av matchen.`,'strategy');}
   }
 }
 repairMedicalLines();
}
function repairMedicalLines(){
 if(!state.lines)return;
 for(const [key,size,accept] of [['forwards',12,p=>!['MV','B'].includes(p.pos)],['defense',6,p=>p.pos==='B']]){
   const pool=managerRoster().filter(p=>accept(p)&&medicalAvailable(p)),used=new Set();
   const old=state.lines[key]||[],ids=Array.from({length:size},(_,i)=>{const p=pool.find(p=>samePlayerId(p.id,old[i]));if(!p||used.has(String(p.id)))return null;used.add(String(p.id));return p.id;});
   for(let i=0;i<size;i++)if(ids[i]===null){const p=pool.find(p=>!used.has(String(p.id)));if(p){ids[i]=p.id;used.add(String(p.id));}}
   state.lines[key]=ids;
 }
 const selected=managerRoster().find(p=>samePlayerId(p.id,state.lines.goalie));
 if(!selected||selected.pos!=='MV'||!medicalAvailable(selected))state.lines.goalie=managerRoster().find(p=>p.pos==='MV'&&medicalAvailable(p))?.id??null;
}
function medicalUnit(players,size,position){
 const result=players.filter(medicalAvailable);
 if(result.length>=size)return result.slice(0,size);
 const pool=managerRoster().filter(p=>medicalAvailable(p)&&(position==='B'?p.pos==='B':!['MV','B'].includes(p.pos)));
 for(const p of pool)if(result.length<size&&!result.some(q=>samePlayerId(q.id,p.id)))result.push(p);
 return result;
}
function medicalMatchReady(){const ps=managerRoster().filter(medicalAvailable);return ps.some(p=>p.pos==='MV')&&ps.filter(p=>p.pos==='B').length>=2&&ps.filter(p=>!['MV','B'].includes(p.pos)).length>=3;}
function setMedicalClearance(id,mode){
 const p=managerRoster().find(p=>samePlayerId(p.id,id));if(!p?.health?.injury||p.health.injury.remaining>0||!['rest','limited','full'].includes(mode))return;
 if(state.live&&!state.live.finished)return medicalNotice('Comebackplanen låses under matchen. Justera den mellan matcher.');
 if(mode==='full'&&p.health.injury.readiness<85)return medicalNotice('Full comeback kräver minst 85 % matchberedskap. Välj mer återgångsträning eller begränsad istid.');
 p.health.clearance=mode;repairMedicalLines();medicalNotice(`${p.name}: ${medicalStatus(p)}. ${mode==='limited'?`Högst ${p.pos==='MV'?30:10} minuter per match.`:mode==='full'?'Förhöjd risk för bakslag kvarstår tills spelaren är fullt återställd.':'Spelaren står över matcher tills du ändrar planen eller rehabiliteringen är klar.'}`);
}
function medicalCallUp(pos){
 if(!['MV','B','C','VF','HF'].includes(pos))return;
 if(state.live&&!state.live.finished)return medicalNotice('Juniorer ansluter mellan matcher.');
 const group=p=>pos==='MV'?p.pos==='MV':pos==='B'?p.pos==='B':!['MV','B'].includes(p.pos),limit=pos==='MV'?2:pos==='B'?6:12;
 if(managerRoster().filter(p=>group(p)&&medicalReady(p)).length>=limit)return medicalNotice('Du har redan tillräckligt många tillgängliga spelare i den positionsgruppen.');
 juniorEmergency(pos);
}
function medicalConcede(){
 const m=state.live;if(!m||m.finished||medicalMatchReady())return;
 m.analysisAbandoned=true;analysisEvent('decider','opponent','Matchen avbröts på grund av spelarbrist.');
 m.opp=Math.max(5,m.hv+1,m.opp);addEvent('Matchen avbryts: för få tillgängliga spelare. Förlust registreras.','period');finishMatch(false);
}
function medicalPlayerPanel(p){
 const h=p.health;if(!h)return '';const i=h.injury;
 return `<section class="medical-player-panel"><h3>${medicalStatus(p)}</h3><p>Belastning ${Math.round(h.load)}/100 · Skaderisk: ${medicalRiskLabel(p)}</p>${i?`<p>${i.name} · ${i.remaining>0?`Ungefär ${Math.max(1,i.remaining-1)}–${i.remaining+2} återhämtningsdagar till återgångsträning.`:`Matchberedskap ${i.readiness} %. Fortsatt återgångsträning förbättrar beredskapen.`}</p>${i.remaining===0&&isOwnPlayer(p)?`<div class="medical-actions">${[['rest','Vila vidare'],['limited','Begränsad comeback'],['full','Full comeback']].map(([mode,label])=>`<button class="btn secondary" onclick="setMedicalClearance('${p.id}','${mode}')" ${mode==='full'&&i.readiness<85?'disabled':''}>${label}</button>`).join('')}</div>`:''}`:'<p>Följ ork och belastning. Återhämtning minskar risken men kan inte förhindra alla skador.</p>'}</section>`;
}
function medicalView(){
 ensureMedical();const ps=managerRoster(),injured=ps.filter(p=>p.health.injury),s=state.medical;
 return `<section class="medical-page"><header class="daily-heading"><div><span class="career-eyebrow">MEDICINSKT TEAM</span><h1>Tillbaka till isen.</h1><p>${s.staff.doctor} och ${s.staff.physio} följer belastning, rehabilitering och comeback.</p></div><button class="btn secondary" onclick="trainingOpen('training')">Planera återhämtning</button></header><div class="medical-summary"><div><span>Tillgängliga</span><strong>${ps.filter(medicalReady).length} / ${ps.length}</strong></div><div><span>Skada eller återgång</span><strong>${injured.length}</strong></div><div><span>Hög belastningsrisk</span><strong>${ps.filter(p=>medicalRiskLabel(p)==='Hög').length}</strong></div></div>${s.message?`<p class="medical-notice" role="status">${trainingSafe(s.message)}</p>`:''}<p>Rehabiliteringen går framåt med träningsdagar, matchdagar och försäsongsveckor. Prognoserna är ungefärliga. Spelare i rehabilitering följer ett eget lätt program i stället för lagets hårda pass.</p>${state.live&&!state.live.finished&&!medicalMatchReady()?'<div class="medical-notice"><p>För få tillgängliga spelare för att fortsätta: minst en målvakt, två backar och tre forwards krävs.</p><button class="btn" onclick="medicalConcede()">Avbryt matchen – registrera förlust</button></div>':''}<h2>Skador & comeback</h2>${injured.map(p=>`<article class="medical-case"><header><h3>${trainingSafe(p.name)} · ${p.pos}</h3><button class="btn secondary" onclick="selectPlayer('${p.id}')">Spelarprofil</button></header>${medicalPlayerPanel(p)}</article>`).join('')||'<p>Ingen spelare är skadad eller under återgång just nu.</p>'}<h2>Belastningsöversikt</h2><div class="medical-workload">${[...ps].sort((a,b)=>medicalRisk(b)-medicalRisk(a)).map(p=>`<div><button onclick="selectPlayer('${p.id}')">${trainingSafe(p.name)}</button><span>${Math.round(100-p.fatigue)} % ork</span><span>${Math.round(p.health.load)}/100 belastning</span><strong>${medicalRiskLabel(p)}</strong></div>`).join('')}</div><section class="medical-reserves"><h2>Ge juniorerna chansen</h2><p>Vid färre än två tillgängliga målvakter, sex backar eller tolv forwards kan du flytta upp en tillgänglig spelare ur ditt juniorlag. Avtal och löneutrymme kontrolleras under Juniorer & talanger. Ett kortare lag kan spela, men belastningen fördelas på färre spelare.</p><div class="medical-actions">${['MV','B','C','VF','HF'].map(pos=>`<button class="btn secondary" onclick="medicalCallUp('${pos}')">Flytta upp ${pos}</button>`).join('')}</div><button class="btn secondary" onclick="trainingOpen('lines')">Se över kedjorna</button></section><h2>Medicinska rapporter</h2>${s.history.slice(0,15).map(e=>`<article class="medical-report"><span>Återhämtningsdag ${e.day}</span><h3>${trainingSafe(e.title)}</h3><p>${trainingSafe(e.body)}</p></article>`).join('')||'<p>Här samlas skadebesked och uppföljningar.</p>'}<p class="training-note">Skador, tidsprognoser och risknivåer är förenklade speldata. Systemet gäller din trupp; motståndarnas skador simuleras ännu inte.</p></section>`;
}
