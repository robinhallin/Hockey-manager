"use strict";
// One read model for the overview and inbox. Domain systems own completion.
function managerAgendaItems(includeSnoozed=false){
 if(!state.recruitment||!state.calendar)return [];
 const items=managerOffice2Items().filter(i=>(i.requiresDecision||['critical','high','medium'].includes(i.level))&&!(i.area==='match'&&state.live&&!state.live.finished));
 if(preseasonPlan()?.pending)items.push({id:'season:direction',title:'Välj säsongens riktning',detail:'Sätt mål och bestäm hur träningsmatcherna ska användas.',owner:'Du',tag:'Säsong',requiresDecision:true,score:180,level:'critical',action:{page:'season'}});
 for(const p of managerRoster()){
  const plan=p.developmentReview;if(!plan||plan.club!==managerClub())continue;
  const due=plan.due||calAdd(plan.date,28);if(due>state.calendar.date)continue;
  items.push({id:'development:'+p.id+':'+plan.date,title:p.name+': utvärdera utvecklingsplanen',detail:'Väg genomförd träning, faktisk istid och attributförändring mot målet. Starta nästa period när du har granskat utfallet.',tag:'Utveckling',area:'development',owner:'Du',level:'high',score:78,due,action:{developmentPlayer:p.id}});
 }
 items.push(...playerFollowupItems());
 const snoozed=state.office2?.agenda?.club===managerClub()?state.office2.agenda.snoozed||{}:{};
 const unique=new Map();
 for(const item of items){
  const deal=item.action?.deal;let due=item.due||null;
  if(deal?.startsWith('incoming:'))due=state.recruitment.incoming.find(o=>'incoming:'+o.id===deal)?.expiresDate||null;
  if(deal?.startsWith('transfer:'))due=state.recruitment.deals.find(o=>'transfer:'+o.id===deal)?.dueDate||null;
  if(deal?.startsWith('loan:'))due=state.loans.offers.find(o=>'loan:'+o.id===deal)?.expires||null;
  if(item.area==='match')due=deskFixtures().upcoming[0]?.date||null;
  const until=!item.requiresDecision&&item.level!=='critical'&&snoozed[item.id]?.signature===item.detail?snoozed[item.id].until:null;
  const deferred=until>state.calendar.date&&(!due||due>state.calendar.date);
  if(deferred&&!includeSnoozed)continue;
  unique.set(item.id,{owner:'Du',...item,due,deferred,snoozedUntil:until});
 }
 return [...unique.values()].sort((a,b)=>Number(a.deferred)-Number(b.deferred)||Number(b.requiresDecision)-Number(a.requiresDecision)||(a.due||'9999').localeCompare(b.due||'9999')||b.score-a.score);
}
function managerAgendaStore(){
 const o=managerOffice2Ensure();if(o.agenda?.club!==managerClub())o.agenda={club:managerClub(),snoozed:{},active:{},history:[]};
 return o.agenda;
}
function managerAgendaSnooze(id,days=3){
 const item=managerAgendaItems(true).find(i=>i.id===id);if(!item||item.requiresDecision||item.level==='critical'||![0,1,3,7].includes(Number(days)))return false;
 const a=managerAgendaStore();if(!Number(days))delete a.snoozed[id];else a.snoozed[id]={until:calAdd(state.calendar.date,Number(days)),signature:item.detail};
 save();render();return true;
}
function managerAgendaReconcile(){
 const a=managerAgendaStore(),items=managerAgendaItems(true),next=Object.fromEntries(items.map(i=>[i.id,{title:i.title,date:state.calendar.date}]));
 for(const [id,item] of Object.entries(a.active))if(!next[id]){a.history.unshift({id,title:item.title,date:state.calendar.date,outcome:'Ärendet är inte längre aktuellt enligt underlaget.'});delete a.snoozed[id];}
 a.active=next;a.history=a.history.slice(0,60);
 for(const [id,s] of Object.entries(a.snoozed))if(!next[id]||s.until<=state.calendar.date)delete a.snoozed[id];
}
function managerOpenAgenda(){deskNavigate('inbox');inboxFilter('agenda');}
function managerAgendaOpenDevelopment(id){developmentOpenPlayer(id,'training',true);}
function managerAgendaView(){
 const items=managerAgendaItems(true),history=state.office2?.agenda?.club===managerClub()?state.office2.agenda.history||[]:[];
 return `<section class="manager-inbox manager-agenda"><header class="daily-heading"><div><h1>Din beslutslista</h1><p>Samma ärenden som på översikten. Beslut försvinner när underlaget visar att de är hanterade.</p></div><button class="btn secondary" onclick="inboxFilter('all')">Rapporter & meddelanden</button></header>${items.map((item,i)=>`<section class="agenda-item">${managerOffice2Row(item,i)}<div class="agenda-meta"><span>${item.due?'Senast '+calText(item.due):'Löpande uppföljning'}</span>${item.deferred?`<span>Påminnelse ${calText(item.snoozedUntil)}</span><button class="desk-link" onclick="managerAgendaSnooze(${trainingSafe(JSON.stringify(item.id))},0)">Visa nu</button>`:!item.requiresDecision&&item.level!=='critical'?`<button class="desk-link" onclick="managerAgendaSnooze(${trainingSafe(JSON.stringify(item.id))},3)">Påminn om tre dagar</button>`:''}</div></section>`).join('')||'<p>Inga prioriterade ärenden just nu.</p>'}<details><summary>Avslutade ärenden · ${history.length}</summary>${history.map(h=>`<p><strong>${trainingSafe(h.title)}</strong> · ${calText(h.date)}<br>${trainingSafe(h.outcome)}</p>`).join('')}</details></section>`;
}
function developmentReviewDay(){
 for(const p of managerRoster()){
  developmentReviewMigrate(p);const plan=p.developmentReview;
  if(!plan||plan.club!==managerClub()||plan.notified||plan.due>state.calendar.date)continue;
  const e=developmentReviewEvidence(p);plan.notified=state.calendar.date;
  managerMessage(`development-review:${managerClub()}:${p.id}:${plan.date}`,p.name+': utvecklingsplanen ska följas upp',`${e.trained} träningspass, ${e.games} matcher med istid och ${Math.round(e.seconds/60)} minuter. ${e.changes.join(', ')||'Inga synliga attributsteg.'} Granska utfallet och välj fortsatt plan.`,'Spelarutveckling',{playerId:p.id,link:'training'});
 }
}
function managerSystemsDay(){recruitmentMonthDay();scoutingPruneEvidence();developmentReviewDay();managerAgendaReconcile();staffMandateDay();worldWatchDay();}

function validateManagerSystemsSave(s){
 const object=v=>v&&typeof v==='object'&&!Array.isArray(v),date=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d)),array=(v,max)=>Array.isArray(v)&&v.length<=max;
 const fail=()=>{throw Error('Ogiltiga utvecklingsplaner, mandat eller ekonomiska uppföljningar.');};
 const office=o=>{
  if(!o)return;
  if(o.mandates&&(!object(o.mandates)||Object.entries(o.mandates).some(([area,mode])=>!STAFF_MANDATES[area]||!['manual','advise','execute'].includes(mode)||mode==='execute'&&!STAFF_MANDATES[area].automatic)))fail();
  if(o.activity&&!array(o.activity,80))fail();
  if(o.proposals){
   if(!array(o.proposals,60))fail();
   for(const p of o.proposals){
    if(!object(p)||typeof p.id!=='string'||typeof p.club!=='string'||!STAFF_MANDATES[p.area]||typeof p.text!=='string'||typeof p.snapshot!=='string'||!date(p.date)||!date(p.target)||!['pending','accepted','declined','expired','replaced','followed'].includes(p.status))fail();
    if(p.area==='training'&&(!TRAINING_SESSIONS[p.session?.type]||!['light','normal','hard'].includes(p.session?.intensity)))fail();
    if(p.area==='juniors'){let rows;try{rows=JSON.parse(p.snapshot);}catch{fail();}if(!array(rows,100)||rows.some(r=>!Array.isArray(r)||r.length!==3||!['string','number'].includes(typeof r[0])||!['normal','light','rest'].includes(r[1])))fail();}
   }
  }
  if(o.agenda&&(!object(o.agenda.snoozed)||!object(o.agenda.active)||!array(o.agenda.history,60)))fail();
 };
 const finance=o=>{
  if(Array.isArray(o?.market))for(const p of o.market){const profile=p.marketProfile;if(profile&&(!object(profile)||!date(profile.available)||profile.project!==null&&!CLUB_PRIORITIES[profile.project]))fail();}
  if(o?.decisionContracts){
   if(!array(o.decisionContracts,8))fail();const ids=new Set();
   for(const p of o.decisionContracts){if(!object(p)||!['string','number'].includes(typeof p.playerId)||ids.has(String(p.playerId))||typeof p.name!=='string'||!date(p.start)||!date(p.end)||p.end<=p.start||['salary','fee'].some(k=>!Number.isFinite(p[k])||p[k]<0||p[k]>1e9))fail();ids.add(String(p.playerId));}
  }
  const f=o?.cashflow;if(!f)return;
  if(f.version!==1||!date(f.started)||!date(f.lastDate)||!object(f.accrued)||!array(f.months,36))fail();
  const totals=t=>object(t)&&Object.entries(t).every(([k,v])=>Object.hasOwn(CLUB_CATEGORIES,k)&&Number.isFinite(v));
  if(!totals(f.accrued)||f.months.some(m=>!date(m.date)||!totals(m.totals)||!Number.isFinite(m.balance)))fail();
 };
 const scenarios=o=>{
  if(!o)return;
  if(!Number.isInteger(o.year)||!Number.isInteger(o.nextId)||!array(o.plans,6))fail();
  for(const p of o.plans){
   if(!Number.isInteger(p.id)||typeof p.name!=='string'||!array(p.rows,50))fail();
   const ids=new Set();for(const r of p.rows){
    if(!['string','number'].includes(typeof r.playerId)||ids.has(String(r.playerId))||!Number.isInteger(r.years)||r.years<1||r.years>5||!SQUAD_SCENARIO_PLACES[r.place]||!SQUAD_ROLES.includes(r.role)||['low','high','feeLow','feeHigh'].some(k=>!Number.isFinite(r[k])||r[k]<0)||r.low>r.high||r.feeLow>r.feeHigh)fail();
    ids.add(String(r.playerId));
   }
  }
 };
 for(const data of [s,...Object.values(s.managerCareer?.bank||{})]){office(data.office2);finance(data.clubOffice);scenarios(data.recruitment?.scouting?.scenarios);}
 if(s.worldWatch){
  if(s.worldWatch.version!==1||!object(s.worldWatch.clubs))fail();
  for(const w of Object.values(s.worldWatch.clubs))if(!date(w.since)||!array(w.players,50)||!array(w.clubs,50)||!array(w.seen,300)||!array(w.events,100))fail();
 }
 for(const p of [...Object.values(s.clubRosters||{}).flat(),...(s.juniors?.roster||[])]){
  if(p.scoutingGames&&(!array(p.scoutingGames,20)||p.scoutingGames.some(g=>!date(g.date)||!Number.isFinite(g.seconds)||g.seconds<=0)))fail();
  const f=p.roleFollowup;if(f&&(!object(f)||typeof f.club!=='string'||!date(f.date)||!date(f.due)||typeof f.topic!=='string'||!Number.isFinite(f.trust)||f.closed&&!date(f.closed)))fail();
  const d=p.developmentReview;if(d?.version===2&&(!date(d.date)||!date(d.due)||!object(d.attributes)||!Array.isArray(d.seen)||!Array.isArray(d.sessionsSeen)))fail();
 }
}
