"use strict";
const PRESEASON_APPROACHES={
 youth:{name:'Testa unga talanger',text:'Unga i A-truppen prioriteras i kedjorna. Fyra kedjor får jämn matchning.'},
 strongest:{name:'Kör starkaste laget',text:'De bästa tillgängliga spelarna och förstamålvakten prioriteras.'},
 rotation:{name:'Ge hela truppen chansen',text:'Spelare med minst försäsongsistid prioriteras. Målvakterna turas om.'},
 chemistry:{name:'Bygg samspel',text:'Behåll dina kedjor och backpar när spelarna är matchklara.'},
 goalies:{name:'Jämför målvakterna',text:'Stark utespelartrupp och roterande målvakter ger ett jämförbart underlag.'}
};
function preseasonPlan(){const p=state.preseasonCoach;return p?.club===managerClub()&&p.year===state.season.year?p:null;}
function preseasonStart(initial=false){
 ensureSeason();ensureCalendar();ensureClub();
 if(!managerEmployed()){state.preseasonCoach=null;state.page='manager';return;}
 const s=state.season,c=state.calendar;
 if(initial){s.phase='preseason';s.grant=0;s.departures=[];s.nextWageLimit=wageBudget();c.date=`${s.year}-08-01`;}
 const preparing=s.phase==='preseason'&&c.date<=`${s.year}-09-09`;
 if(preparing){state.seasonCalendar='august';c.initialPreseasonUsed=true;c.marketDay=calAdd(c.date,7);c.active=null;}
 state.training.calendarKey=null;state.training.day=0;state.live=null;
 // Only new seasons are dated afresh. Existing careers are never rewound on load.
 if(initial)for(const g of state.schedule)g.date=calRoundDate(g.round,s.year);
 const peers=Object.keys(state.world.membership).filter(n=>n!==managerClub()).sort((a,b)=>Number(leagueOf(b)===leagueOf())-Number(leagueOf(a)===leagueOf())||a.localeCompare(b,'sv'));
 const dates=[6,13,20,27,34].map(n=>calAdd(`${s.year}-08-01`,n));
 const fixtures=c.friendlies.filter(f=>f.club===managerClub());
 if(preparing&&!fixtures.length)for(let i=0;i<dates.length;i++)if(dates[i]>=c.date)c.friendlies.push({id:c.nextId++,club:managerClub(),opponent:peers[(i*3)%peers.length],date:dates[i],home:i%2===0,played:false,scheduled:true});
 state.preseasonCoach={version:1,club:managerClub(),year:s.year,pending:true,hasPreseason:preparing,owner:'manager',approach:'rotation',matches:[],reported:false};
 state.page='season';
 const content=document.getElementById('content');if(content)content.scrollTop=0;
 if(typeof window!=='undefined')window.scrollTo?.({top:0,behavior:'instant'});
}
function preseasonConfigure(priority,owner,approach,trainingOwner,juniorOwner){
 const p=preseasonPlan();if(!p||state.live&&!state.live.finished||!['manager','assistant'].includes(owner)||!PRESEASON_APPROACHES[approach])return;
 if(state.clubOffice.priorityLockedYear!==clubYear()){
  clubSetPolicy('priority',priority);
  if(state.clubOffice.priorityLockedYear!==clubYear())return;
 }
 p.owner=owner;p.approach=approach;p.pending=false;
 assistantSetOwner('senior',trainingOwner,false);assistantSetOwner('junior',juniorOwner,false);
 state.page='calendar';save();render();
}
function preseasonSettings(owner,approach){
 const p=preseasonPlan();if(!p||state.live&&!state.live.finished||!['manager','assistant'].includes(owner)||!PRESEASON_APPROACHES[approach])return;
 p.owner=owner;p.approach=approach;save();render();
}
function preseasonPlanningView(){
 const p=preseasonPlan(),o=state.clubOffice,fixtures=state.calendar.friendlies.filter(f=>f.club===managerClub());
 return `<section class="season-planning"><span class="career-eyebrow">${trainingSafe(managerClub())} · ${seasonLabel()} · ${calText(state.calendar.date)}</span><h1>Välj riktning för säsongen</h1><p>Bestäm klubbens satsning och hur tränarteamet ska förbereda laget. Du kan ändra ansvar och matchinriktning senare under Säsong.</p><form onsubmit="event.preventDefault();preseasonConfigure(this.elements.priority.value,this.elements.owner.value,this.elements.approach.value,this.elements.trainingOwner.value,this.elements.juniorOwner.value)"><fieldset><legend>Säsongens satsning</legend><p>Satsningen låses för säsongen. Kostnaden fördelas över grundserien.</p><div class="season-priorities">${clubPriorityChoices().map(k=>{const v=CLUB_PRIORITIES[k];return `<label><input type="radio" name="priority" value="${k}" ${o.priority===k?'checked':''} ${o.priorityLockedYear===clubYear()?'disabled':''}><strong>${v.name}</strong><span>${v.text}</span><b>${v.cost?careerMoney(v.cost)+' / säsong':'Ingen extra kostnad'}</b></label>`;}).join('')}</div></fieldset>${p.hasPreseason===false?'<input type="hidden" name="owner" value="manager"><input type="hidden" name="approach" value="rotation"><p>Du tillträder under en pågående säsong. Matchschema och datum fortsätter där de är.</p>':preseasonResponsibilityFields(p)}<fieldset><legend>Träning & uppföljning</legend><label>A-lagets träning<select name="trainingOwner"><option value="manager">Jag planerar</option><option value="assistant" selected>Assisterande planerar lagpass och individuella fokus</option></select></label><label>Juniorernas träning<select name="juniorOwner"><option value="manager">Jag planerar</option><option value="assistant" selected>Juniorstaben anpassar träningen</option></select></label><p>Veckorapport varje söndag. Juniorernas månadsrapport kommer den 1:a. Skador och viktiga beslut meddelas direkt.</p></fieldset>${p.hasPreseason===false?'':`<h2>Försäsongens matcher</h2>${preseasonFixtureList(fixtures)}`}<p role="status">${trainingSafe(o.message||'')}</p><button class="btn">Bekräfta säsongsplanen →</button></form></section>`;
}
function preseasonResponsibilityFields(p){return `<fieldset><legend>Träningsmatcherna</legend><label>Matchansvar<select name="owner"><option value="manager" ${p.owner==='manager'?'selected':''}>Jag coachar matcherna</option><option value="assistant" ${p.owner==='assistant'?'selected':''}>Assisterande sköter matcherna utan matchvisning</option></select></label><label>Inriktning<select name="approach">${Object.entries(PRESEASON_APPROACHES).map(([k,v])=>`<option value="${k}" ${p.approach===k?'selected':''}>${v.name}</option>`).join('')}</select></label>${Object.values(PRESEASON_APPROACHES).map(v=>`<p><strong>${v.name}:</strong> ${v.text}</p>`).join('')}</fieldset>`;}
function preseasonFixtureList(fixtures){return `<ul class="preseason-fixtures">${fixtures.map(f=>`<li><time>${calText(f.date)}</time><strong>${trainingSafe(f.opponent)}</strong><span>${f.home===false?'Borta':'Hemma'} · ${f.played?`${f.own}–${f.against}`:'Träningsmatch'}</span></li>`).join('')}</ul>`;}
function preseasonDeskView(){const p=preseasonPlan();if(!p||p.hasPreseason===false)return '';return `<section class="season-planning"><h2>Assisterandens försäsong</h2>${p.report?`<div class="assistant-report">${trainingSafe(p.report).replace(/\n/g,'<br>')}</div>`:`<p>${p.matches.length} av ${state.calendar.friendlies.filter(f=>f.club===managerClub()).length} matcher genomförda. Samlad spelar- och målvaktsrapport kommer efter sista matchen.</p>`}<form onsubmit="event.preventDefault();preseasonSettings(this.elements.owner.value,this.elements.approach.value)">${preseasonResponsibilityFields(p)}<button class="btn secondary">Spara matchansvaret</button></form>${preseasonFixtureList(state.calendar.friendlies.filter(f=>f.club===managerClub()))}</section>`;}
function preseasonUsage(id){return (preseasonPlan()?.matches||[]).reduce((n,m)=>n+(m.players.find(r=>samePlayerId(r.id,id))?.seconds||0),0);}
function preseasonSelectTeam(){
 const plan=preseasonPlan();if(!plan)return;
 ensureLines();const available=managerRoster().filter(p=>medicalAvailable(p)&&!internationalAway(p));
 const quality=p=>matchAttributeRating(p),score=p=>quality(p)+(plan.approach==='youth'&&p.age<=23?30:0)-(plan.approach==='rotation'?preseasonUsage(p.id)/120:0)-p.fatigue*.12;
 const choose=(roles,pool)=>{const used=new Set();return roles.map(role=>{const candidates=pool.filter(p=>!used.has(String(p.id))).sort((a,b)=>(positionFit(b,role)>=.9?100:0)+score(b)-(positionFit(a,role)>=.9?100:0)-score(a));const p=candidates[0];if(p)used.add(String(p.id));return p?.id;}).filter(id=>id!=null);};
 if(plan.approach!=='chemistry'){
  state.lines.forwards=choose(Array(4).fill(['LW','C','RW']).flat(),available.filter(p=>!['MV','B'].includes(p.pos)));
  state.lines.defense=choose(Array(3).fill(['LD','RD']).flat(),available.filter(p=>p.pos==='B'));
 }
 const keepers=available.filter(p=>p.pos==='MV').sort((a,b)=>['rotation','goalies','youth'].includes(plan.approach)?preseasonUsage(a.id)-preseasonUsage(b.id)||quality(b)-quality(a):quality(b)-quality(a));
 if(plan.approach!=='chemistry'&&keepers.length)state.lines.goalie=keepers[0].id;
 repairMedicalLines();state.specialTeams=null;ensureSpecialTeams();
 state.tacticalPlan.lineUsage=plan.approach==='strongest'?'topHeavy':'rollFour';
}
let preseasonTimer=null,preseasonBusy=false,preseasonPaint=0;
function preseasonDelegateMatch(id){
 const p=preseasonPlan();if(!p||p.owner!=='assistant'||preseasonBusy)return;
 if(!state.live||state.live.finished){preseasonSelectTeam();calendarPlayFriendly(id,true);}
 if(!state.live?.friendly||state.live.finished)return;
 state.live.delegatedFriendly=true;state.page='season';save();render();preseasonRunChunk();
}
function preseasonSimulationStep(){
 const m=state.live;if(!m?.delegatedFriendly||m.finished)return false;
 while(medicalPending())medicalDecisionAccept();
 if(!medicalMatchReady()){m.running=false;state.page='medical';return false;}
 if(state.training.lockedRound!==state.round)lockTrainingForMatch();m.running=true;studioStep();
 return !m.finished;
}
function preseasonRunChunk(){
 if(preseasonBusy)return;clearTimeout(preseasonTimer);preseasonBusy=true;
 const match=state.live;
 try{const started=Date.now();for(let i=0;i<3000&&Date.now()-started<150&&state.live===match;i++)if(!preseasonSimulationStep())break;}
 finally{preseasonBusy=false;}
 if(state.live!==match)return;
 if(!match)return;state.page='season';if(match.finished||Date.now()-preseasonPaint>1200){preseasonPaint=Date.now();save();render();}
 if(!match.finished&&!medicalMatchReady()){state.page='medical';save();render();return;}
 if(!match.finished)preseasonTimer=setTimeout(preseasonRunChunk,0);
}
function preseasonProgressView(){const m=state.live;return `<section class="season-planning"><h1>Assisterande coachar träningsmatchen</h1><p>${trainingSafe(managerClub())} – ${trainingSafe(m.opponent)} · ${PRESEASON_APPROACHES[preseasonPlan()?.approach]?.name||'Försäsong'}</p><p>Period ${m.period} · ${gameTime()} · ${m.hv}–${m.opp}</p><p>Matchens istid, prestationer och belastning registreras till försäsongsrapporten.</p><button class="btn" onclick="preseasonRunChunk()">Fortsätt simuleringen</button></section>`;}
function preseasonRecordMatch(f,m){
 const p=preseasonPlan();if(!p||p.matches.some(r=>r.id===f.id))return;
 const players=(m.performance?.rows||[]).filter(r=>r.club===managerClub()&&r.seconds>0).map(r=>({id:r.id,name:r.name,pos:r.pos,age:findPlayerAnywhere(r.id)?.age,seconds:r.seconds,goals:r.goals||0,assists:r.assists||0,saves:r.saves||0,against:r.against||0,score:performanceScore(r)}));
 p.matches.push({id:f.id,date:f.date,opponent:f.opponent,own:f.own,against:f.against,players});
 preseasonBuildReport();
}
function preseasonBuildReport(){
 const p=preseasonPlan();
 if(!p||!p.matches.length||state.calendar.friendlies.some(g=>g.club===managerClub()&&!g.played)||p.reported)return;
 const rows=new Map();for(const game of p.matches)for(const r of game.players){const a=rows.get(String(r.id))||{...r,games:0,seconds:0,goals:0,assists:0,saves:0,against:0,grades:[]};for(const k of ['seconds','goals','assists','saves','against'])a[k]+=r[k]||0;a.games++;if(r.score!=null)a.grades.push(r.score);rows.set(String(r.id),a);}
 const all=[...rows.values()].map(r=>({...r,average:r.grades.length?r.grades.reduce((a,b)=>a+b,0)/r.grades.length:null}));
 const skaters=all.filter(r=>r.pos!=='MV').sort((a,b)=>(b.average??-1)-(a.average??-1)||b.goals+b.assists-a.goals-a.assists);
 const describe=r=>`${r.name}: ${r.games} matcher, ${Math.round(r.seconds/60)} minuter, ${r.goals}+${r.assists}, snittbetyg ${performanceNumber(r.average)}.`;
 const young=skaters.filter(r=>r.age<=23),keepers=all.filter(r=>r.pos==='MV').sort((a,b)=>(b.saves/Math.max(1,b.saves+b.against))-(a.saves/Math.max(1,a.saves+a.against)));
 p.report=`Assisterandens försäsongsrapport · ${p.matches.length} träningsmatcher\n\nSpelare som stack ut\n${skaters.slice(0,3).map(describe).join('\n')||'Inget registrerat spelarunderlag.'}\n\nUnga att följa\n${young.slice(0,3).map(r=>describe(r)+' '+(r.games>=2&&r.seconds>=1200&&r.average>=6?'Rekommendation: ge fortsatt speltid i serieinledningen.':'Underlaget är begränsat; ge ytterligare chans före beslut om större roll.')).join('\n')||'Ingen spelare under 24 år registrerade istid. Ge en ung spelare en chans för att få ett underlag.'}\n\nMålvakterna\n${keepers.map(r=>`${r.name}: ${r.games} matcher, ${Math.round(r.seconds/60)} minuter, ${r.saves} räddningar på ${r.saves+r.against} skott (${r.saves+r.against?(100*r.saves/(r.saves+r.against)).toFixed(1).replace('.',',')+' %':'inget skottunderlag'}).`).join('\n')||'Inget målvaktsunderlag.'}\n${keepers[0]&&keepers[0].saves+keepers[0].against>=20?keepers[0].name+' hade högst räddningsandel bland de testade målvakterna. Väg även in motstånd och speltid.':'För få skott för en säker målvaktsrekommendation.'}\n\nNästa steg\nKontrollera återhämtning, välj premiärlag och följ de unga som förtjänat fortsatt förtroende. Träningsmatcher är ett litet underlag och räknas inte i seriestatistiken.`;
 p.reported=true;managerMessage(`preseason-summary:${p.club}:${p.year}`,'Assisterandens försäsongsrapport',p.report,'Assisterande tränare',{link:'season'});
}
