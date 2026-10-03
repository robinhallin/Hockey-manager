"use strict";
const SQUAD_SCENARIO_NAMES={core:'Behåll stommen',youth:'Satsa på juniorerna',quality:'Värva spets'};
const SQUAD_SCENARIO_PLACES={first:'Första kedjan / backparet',second:'Andra kedjan / backparet',third:'Tredje kedjan / backparet',fourth:'Fjärde kedjan',starter:'Förstemålvakt',backup:'Andremålvakt',depth:'Bredd / fortsatt utveckling'};
const squadScenarioUI={selected:null,year:1};
function squadScenarioStore(create=false){
 const o=scoutingOffice();if(!o)return null;
 if(o.scenarios?.club!==managerClub()||o.scenarios?.year!==state.season.year){
  if(!create)return null;o.scenarios={club:managerClub(),year:state.season.year,plans:[],nextId:1};
 }
 return o.scenarios;
}
function squadScenariosNewYear(){
 const o=scoutingOffice(),s=o?.scenarios;if(!s||s.club!==managerClub()||s.year>=state.season.year)return;
 const elapsed=state.season.year-s.year;
 o.scenarioArchive=[JSON.parse(JSON.stringify(s)),...(o.scenarioArchive||[])].slice(0,5);
 s.year=state.season.year;
 for(const plan of s.plans){plan.rows=plan.rows.filter(r=>r.years>elapsed).map(r=>({...r,years:r.years-elapsed}));plan.carried=state.calendar.date;}
}
function squadScenarioPlayer(id){return findPlayerAnywhere(id)||(state.juniors?.roster||[]).find(p=>samePlayerId(p.id,id));}
function squadScenarioRow(p,kind='core'){
 const owned=isOwnPlayer(p)||(state.loans?.active||[]).some(l=>l.owner===managerClub()&&samePlayerId(l.playerId,p.id)),signed=p.futureContract?.buyer===managerClub()?p.futureContract:null,own=owned||Boolean(signed),junior=Boolean(p.academy&&!own),cost=signed?{low:signed.salary,high:signed.salary,feeLow:0,feeHigh:0}:owned?{low:p.salary,high:p.salary,feeLow:0,feeHigh:0}:junior?{low:Math.max(240000,p.salary||0),high:Math.max(360000,p.salary||0),feeLow:0,feeHigh:0}:scoutingCost(p);
 const promised=own?(signed?.role||p.promisedRole):'Ordinarie';
 const place=p.pos==='MV'?(promised==='Nyckelspelare'?'starter':'backup'):kind==='youth'&&p.age<=23?'third':promised==='Nyckelspelare'?'first':promised==='Ordinarie'?'second':'depth';
 return {playerId:p.id,name:p.name,low:cost.low,high:cost.high,feeLow:own||junior?0:cost.feeLow,feeHigh:own||junior?0:cost.feeHigh,years:Math.min(5,Math.max(2,(p.contractYears||1)-1)),role:junior?'Rotation':promised||'Ordinarie',place,assumption:own?'Nuvarande lön; förlängning kan behövas':junior?'Antagen lön vid senioravtal':'Kontaktbesked eller scoutens kostnadsintervall'};
}
function squadScenarioCreate(kind){
 if(!SQUAD_SCENARIO_NAMES[kind]||loanLocked())return false;const store=squadScenarioStore(true);if(store.plans.length>=6)return false;
 let players=managerRoster().filter(p=>!playerLoan(p)).concat((state.loans?.active||[]).filter(l=>l.owner===managerClub()).map(loanPlayer).filter(Boolean),Object.values(state.clubRosters||{}).flat().filter(p=>p.futureContract?.buyer===managerClub()));
 if(kind==='youth')players=players.filter(p=>p.age<32||p.contractYears>1).concat(juniorPlayers().filter(p=>!isOwnPlayer(p)&&!p.academy?.loan&&p.age<=23).slice(0,4));
 if(kind==='quality')players=players.concat(state.recruitment.shortlist.map(squadScenarioPlayer).filter(p=>p&&!isOwnPlayer(p)).slice(0,3));
 const unique=[...new Map(players.map(p=>[String(p.id),p])).values()];
 const plan={id:store.nextId++,kind,name:SQUAD_SCENARIO_NAMES[kind],created:state.calendar.date,rows:unique.map(p=>squadScenarioRow(p,kind))};
 store.plans.push(plan);squadScenarioUI.selected=plan.id;save();render();return true;
}
function squadScenarioSelect(id){squadScenarioUI.selected=Number(id);render();}
function squadScenarioEdit(id,playerId,key,value){
 const plan=squadScenarioStore()?.plans.find(p=>p.id===Number(id)),row=plan?.rows.find(r=>samePlayerId(r.playerId,playerId));if(!row||loanLocked())return false;
 if(key==='remove')plan.rows=plan.rows.filter(r=>r!==row);
 else if(key==='place'&&SQUAD_SCENARIO_PLACES[value]){
  const p=squadScenarioPlayer(playerId);if(!p||p.pos==='MV'&&!['starter','backup','depth'].includes(value)||p.pos!=='MV'&&['starter','backup'].includes(value)||p.pos==='B'&&value==='fourth')return false;row.place=value;
 }else if(key==='role'&&SQUAD_ROLES.includes(value))row.role=value;
 else if(key==='years'&&Number.isInteger(Number(value))&&value>=1&&value<=5)row.years=Number(value);
 else if(key==='salary'&&Number.isFinite(Number(value))&&Number(value)>0&&Number(value)<=50000000){row.low=row.high=Math.round(Number(value));row.assumption='Din antagna årslön; inget avtal har ändrats';}
 else return false;
 save();render();return true;
}
function squadScenarioAdd(id,playerId){
 const plan=squadScenarioStore()?.plans.find(p=>p.id===Number(id)),p=scoutingPlanOptions().find(p=>samePlayerId(p.id,playerId));
 if(!plan||!p||loanLocked()||plan.rows.length>=50||plan.rows.some(r=>samePlayerId(r.playerId,p.id)))return false;
 plan.rows.push(squadScenarioRow(p,plan.kind));save();render();return true;
}
function squadScenarioRemove(id){const s=squadScenarioStore();if(!s||loanLocked())return;s.plans=s.plans.filter(p=>p.id!==Number(id));squadScenarioUI.selected=s.plans[0]?.id||null;save();render();}
function squadScenarioSummary(plan,offset=1){
 const commitments=clubFutureCommitments(offset),rows=plan.rows.filter(r=>r.years>=offset),ids=new Set(rows.map(r=>String(r.playerId)));
 let low=0,high=0,feesLow=0,feesHigh=0;const conflicts=[],groups={MV:0,B:0,F:0},places={},young=[],youngIds=new Set(),renew=[];
 for(const row of rows){
  const p=squadScenarioPlayer(row.playerId),locked=commitments.get(String(row.playerId))||0;
  low+=Math.max(row.low,locked);high+=Math.max(row.high,locked);if(offset===1){feesLow+=row.feeLow;feesHigh+=row.feeHigh;}
  if(!p){conflicts.push(row.name+': inte längre tillgänglig');continue;}
  const group=loanGroup(p);groups[group]++;
  if(!locked)renew.push(p.name);
  if(p.age+offset<=23&&row.place!=='depth'){young.push(p.name);youngIds.add(String(p.id));}
  if(row.place!=='depth'){const key=group+':'+row.place;places[key]=(places[key]||0)+1;}
  if(row.role==='Nyckelspelare'&&!['first','second','starter'].includes(row.place)||row.role==='Ordinarie'&&['fourth','depth'].includes(row.place))conflicts.push(p.name+': planerad plats motsvarar inte rollöftet');
 }
 for(const [place,count] of Object.entries(places)){const group=place.split(':')[0],capacity=group==='MV'?1:group==='B'?2:3;if(count>capacity)conflicts.push(`${SQUAD_SCENARIO_PLACES[place.split(':')[1]]}: ${count} ${group==='F'?'forwards':group==='B'?'backar':'målvakter'} för ${capacity} platser`);}
 const boundOutside=[...commitments].filter(([id])=>!ids.has(id)),bound=boundOutside.reduce((n,[,salary])=>n+salary,0);low+=bound;high+=bound;
 const gaps=Object.entries({MV:2,B:6,F:12}).filter(([g,n])=>groups[g]<n).map(([g,n])=>`${n-groups[g]} ${g==='MV'?'målvakt':g==='B'?'back':'forward'}`);
 const blocked=juniorPlayers().filter(p=>p.age+offset<=23&&!youngIds.has(String(p.id))).map(p=>p.name);
 return {low,high,feesLow,feesHigh,bound,conflicts,gaps,young,blocked,renew,budget:wageBudget(),room:wageBudget()-high,count:rows.length};
}
function squadScenariosView(){
 const store=squadScenarioStore(),plans=store?.plans||[],selected=plans.find(p=>p.id===squadScenarioUI.selected)||plans[0],offset=squadScenarioUI.year;
 const range=(a,b)=>money(a)+(Math.round(a)!==Math.round(b)?'–'+money(b):'');
 let html=`<section class="sc-card squad-scenarios"><h2>Alternativa lagbyggen</h2><p>Jämför tre kommande säsonger. Planerade spelare, löner och roller påverkar inte avtal eller laguttagning.</p><div class="scenario-toolbar">${Object.entries(SQUAD_SCENARIO_NAMES).map(([k,n])=>`<button class="btn secondary" onclick="squadScenarioCreate('${k}')" ${plans.length>=6?'disabled':''}>+ ${n}</button>`).join('')}<label>Jämför säsong<select onchange="squadScenarioUI.year=Number(this.value);render()">${[1,2,3].map(y=>`<option value="${y}" ${offset===y?'selected':''}>${seasonLabel(state.season.year+y)}</option>`).join('')}</select></label></div>`;
 if(!plans.length)return html+'<p>Skapa ett första alternativ. Spelare från bevakningslistan kan läggas till.</p></section>';
 html+=`<div class="scenario-compare">${plans.map(plan=>{const s=squadScenarioSummary(plan,offset);return `<article><button class="desk-link" onclick="squadScenarioSelect(${plan.id})" aria-pressed="${plan===selected}"><h3>${trainingSafe(plan.name)} #${plan.id}</h3></button><dl><dt>Årslöner inkl. bundna avtal</dt><dd>${range(s.low,s.high)}</dd><dt>Löneutrymme, försiktigt räknat</dt><dd>${money(s.room)}</dd><dt>Antagna övergångssummor</dt><dd>${range(s.feesLow,s.feesHigh)}</dd><dt>Unga med planerad plats</dt><dd>${s.young.length}</dd></dl><p>${s.gaps.length?'Saknar: '+s.gaps.join(', '):'Numerär täckning: 2 MV, 6 B och 12 F finns.'}</p><p>${s.conflicts.length} roll- eller platskonflikter · ${s.renew.length} avtal behöver ordnas.</p>${s.bound?`<p>${money(s.bound)} är redan bundet till spelare utanför detta lagbygge. En planerad försäljning frigör inga pengar förrän den genomförs.</p>`:''}</article>`;}).join('')}</div>`;
 const summary=squadScenarioSummary(selected,offset),options=scoutingPlanOptions().filter(p=>!selected.rows.some(r=>samePlayerId(r.playerId,p.id)));
 return html+`<h3>Redigera ${trainingSafe(selected.name)} #${selected.id}</h3><form class="scenario-toolbar" onsubmit="event.preventDefault();squadScenarioAdd(${selected.id},this.elements.player.value)"><label>Spelare / bevakad kandidat<select name="player">${options.map(p=>`<option value="${trainingSafe(p.id)}">${trainingSafe(p.name)} · ${p.pos}</option>`).join('')}</select></label><button class="btn secondary" ${options.length?'':'disabled'}>Lägg till</button></form><div class="scenario-table"><table><thead><tr><th>Spelare</th><th>Planerad plats</th><th>Roll</th><th>Antagen årslön</th><th>Planår</th><th></th></tr></thead><tbody>${selected.rows.map(row=>{const id=trainingSafe(JSON.stringify(row.playerId)),p=squadScenarioPlayer(row.playerId);return `<tr><th>${playerReference(row.playerId,row.name)}</th><td><select aria-label="Plats för ${trainingSafe(row.name)}" onchange="squadScenarioEdit(${selected.id},${id},'place',this.value)">${Object.entries(SQUAD_SCENARIO_PLACES).filter(([k])=>p?.pos==='MV'?['starter','backup','depth'].includes(k):!['starter','backup'].includes(k)&&(p?.pos!=='B'||k!=='fourth')).map(([k,l])=>`<option value="${k}" ${row.place===k?'selected':''}>${l}</option>`).join('')}</select></td><td><select aria-label="Roll för ${trainingSafe(row.name)}" onchange="squadScenarioEdit(${selected.id},${id},'role',this.value)">${recruitOptions(Object.fromEntries(SQUAD_ROLES.map(r=>[r,r])),row.role)}</select></td><td><input type="number" min="1" max="50000000" aria-label="Antagen årslön för ${trainingSafe(row.name)}" value="${Math.round((row.low+row.high)/2)}" onchange="squadScenarioEdit(${selected.id},${id},'salary',this.value)"><small>${range(row.low,row.high)} · ${trainingSafe(row.assumption)}</small></td><td><select aria-label="Planår för ${trainingSafe(row.name)}" onchange="squadScenarioEdit(${selected.id},${id},'years',this.value)">${recruitOptions({1:'1',2:'2',3:'3',4:'4',5:'5'},row.years)}</select></td><td><button class="desk-link" onclick="squadScenarioEdit(${selected.id},${id},'remove','')">Ta bort</button></td></tr>`;}).join('')}</tbody></table></div><p>${summary.conflicts.map(trainingSafe).join(' · ')||'Inga identifierade rollkonflikter i vald säsong.'}</p><details><summary>Juniorernas utrymme</summary><p>Planerad plats: ${summary.young.map(trainingSafe).join(', ')||'ingen'}</p><p>Ingen ordinarie plats vald: ${summary.blocked.map(trainingSafe).join(', ')||'inga övriga juniorer'}. Väg J20, A-träning eller lån mot deras nivå.</p></details><p>Lönebudgeten antas vara oförändrad. Osignerade löner är uppskattningar, inte accepterade erbjudanden. Bundna avtal och pågående bud räknas även om du tar bort spelaren ur planen.</p><button class="desk-link" onclick="squadScenarioRemove(${selected.id})">Ta bort detta alternativ</button></section>`;
}
