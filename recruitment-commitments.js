"use strict";
const USAGE_PROMISES={top:{name:'Toppkedja / första backpar',seconds:480,total:6,required:4},pp:{name:'Powerplay',seconds:60,total:6,required:4},pk:{name:'Boxplay',seconds:60,total:6,required:4}};
function usagePromiseValid(p,kind){return !kind||Boolean(p.pos!=='MV'&&USAGE_PROMISES[kind]);}
function scoutingTrackUsage(row,seconds,situation,p,own){
 row.scoutUsage??={even:0,pp:0,pk:0,top:0};
 const kind=['pp','pk'].includes(situation)?situation:'even';row.scoutUsage[kind]+=seconds;
 if(own&&kind==='even'&&p.pos!=='MV'){
  const ids=p.pos==='B'?(state.lines?.defense||[]).slice(0,2):(state.lines?.forwards||[]).slice(0,3);
  if(ids.some(id=>samePlayerId(id,p.id)))row.scoutUsage.top+=seconds;
 }
}
function usagePromiseAssign(p,kind){
 if(p.usagePromise)(p.usagePromiseHistory??=[]).unshift({...p.usagePromise,resolved:true,result:p.usagePromise.result||'Ersatt av nytt avtal'});
 if(p.usagePromiseHistory)p.usagePromiseHistory=p.usagePromiseHistory.slice(0,6);
 delete p.usagePromise;if(!kind||!usagePromiseValid(p,kind))return;
 p.usagePromise={kind,...USAGE_PROMISES[kind],club:managerClub(),agreed:state.calendar.date,games:0,qualified:0,resolved:false,evidence:[]};
}
function usagePromiseFollow(m){
 if(!m?.finished||m.friendly||m.leagueBox?.partial||m.analysisAbandoned)return;
 const key=m.analysis?.id||`${state.season.year}:${state.round}`,rows=Object.values(m.leagueBox?.players||{}).filter(r=>r.club===managerClub());
 for(const p of managerRoster()){
  const q=p.usagePromise;if(!q||q.resolved||q.club!==managerClub()||q.evidence.some(e=>e.key===key)||medicalExcused(p,600)||internationalAway(p))continue;
  // No ledger in an older saved match means no invented usage and no penalty.
  if(!rows.some(r=>r.scoutUsage))continue;
  const own=rows.find(r=>samePlayerId(r.id,p.id)),seconds=own?.scoutUsage?.[q.kind]||0;
  const opportunity=q.kind==='top'||rows.some(r=>(r.scoutUsage?.[q.kind]||0)>=q.seconds);
  if(!opportunity)continue;
  const qualified=seconds>=q.seconds;q.games++;if(qualified)q.qualified++;
  q.evidence.push({key,date:state.calendar.date,opponent:m.opponent,seconds,qualified});
  if(q.games>=q.total){
   const met=q.qualified>=q.required;q.resolved=true;q.result=met?'Uppfyllt':'Brutet';q.ended=state.calendar.date;
   p.happiness=trainingClamp((p.happiness||70)+(met?4:-10),20,100);
   if(p.social){p.social.trust=trainingClamp(p.social.trust+(met?3:-7));socialRemember(p,`${q.name}: ${q.result}`,`${q.qualified} av ${q.total} matcher motsvarade avtalet.`,met?3:-7);}
   managerMessage(`usage-promise:${p.id}:${q.agreed}`,`${p.name}: ${q.name.toLowerCase()} ${met?'infriat':'inte infriat'}`,`${q.qualified} av ${q.total} bedömda matcher. Kravet var ${q.required} matcher med minst ${q.seconds/60} minuter i den utlovade uppgiften. ${met?'Förtroendet stärks.':'Spelaren tappar förtroende och trivsel.'}`,'Sportchefen',{link:'locker',usagePlayer:p.id});
  }
 }
}
function usagePromiseField(p){return p.pos==='MV'?'':`<label>Särskilt användningslöfte<select name="usage" onchange="usagePromisePreview(this.form,'${haEscape(p.id)}')">${recruitOptions({'':'Inget särskilt löfte',...Object.fromEntries(Object.entries(USAGE_PROMISES).map(([k,v])=>[k,v.name]))},'')}</select></label><p>Gäller introduktionens första sex tillgängliga tävlingsmatcher med bedömbart underlag: minst 8 minuter i toppkedjan/första backparet, eller 1 minut i PP/BP, i minst fyra matcher. PP/BP-matcher utan tillräcklig möjlighet räknas inte. Löftet ändrar inte laguttagningen automatiskt.</p><div class="sc-usage-impact" aria-live="polite"></div>`;}
function recruitmentImpact(p,kind){
 const plan=squadPlacementPlan(p),young=[...managerRoster(),...(state.juniors?.roster||[])].filter(q=>!samePlayerId(q.id,p.id)&&q.age<=23&&worldGroup(q)===worldGroup(p));
 const ids=kind==='pp'?[...(state.specialTeams?.pp1||[]),...(state.specialTeams?.pp2||[])]:kind==='pk'?[...(state.specialTeams?.pk1||[]),...(state.specialTeams?.pk2||[])]:p.pos==='B'?(state.lines?.defense||[]).slice(0,2):(state.lines?.forwards||[]).slice(0,3);
 const peers=managerRoster().filter(q=>ids.some(id=>samePlayerId(id,q.id))&&worldGroup(q)===worldGroup(p));
 const promised=managerRoster().filter(q=>q.usagePromise&&!q.usagePromise.resolved&&q.usagePromise.kind===kind);
 return {peers,young,promised,plan};
}
function usagePromisePreview(form,id){
 const p=findPlayerAnywhere(id),out=form.querySelector('.sc-usage-impact'),kind=form.elements.usage?.value;if(!p||!out)return;
 if(!kind){out.textContent='Inget särskilt användningslöfte. Det ordinarie rollåtagandet gäller fortfarande.';return;}
 const x=recruitmentImpact(p,kind);out.textContent=`Konkurrens om uppgiften: ${x.peers.map(p=>p.name).join(', ')||'Ingen nuvarande spelare'}. ${x.promised.length?'Samma uppgift har redan lovats '+x.promised.map(p=>p.name).join(', ')+'. ':''}Juniorvägar att väga in: ${x.young.slice(0,4).map(p=>p.name).join(', ')||'Inga unga alternativ i gruppen'}. Färre minuter för dessa spelare är en risk, inte en automatisk ändring.`;
}
function usagePromiseView(){
 const ps=managerRoster().filter(p=>p.usagePromise);if(!ps.length)return '';
 return `<section class="sc-card"><h2>Löften om uppgift på isen</h2>${ps.map(p=>{const q=p.usagePromise;return `<article><h3>${trainingSafe(p.name)} · ${q.name}</h3><p>${q.resolved?q.result:`${q.qualified}/${q.required} uppfyllda, ${q.total-q.games} bedömda matcher kvar`} · minst ${q.seconds/60} min i uppgiften.</p><details><summary>Matchunderlag</summary>${q.evidence.map(e=>`<p>${calText(e.date)} · ${trainingSafe(e.opponent)} · ${(e.seconds/60).toFixed(1)} min · ${e.qualified?'uppfyllt':'under löftet'}</p>`).join('')||'<p>Inga bedömbara matcher ännu.</p>'}</details></article>`;}).join('')}<p>Medicinsk frånvaro, landslagsfrånvaro, träningsmatcher och saknat underlag förbrukar inte löftets matcher.</p></section>`;
}
