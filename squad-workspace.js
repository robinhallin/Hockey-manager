const squadUI={tab:'status',query:'',position:'all',status:'all',sort:'position',direction:1};
function squadSet(key,value){
  if(!['tab','query','position','status'].includes(key))return;
  squadUI[key]=value;render();queueInterfaceSave();
}
function squadSort(key){squadUI.direction=squadUI.sort===key?-squadUI.direction:1;squadUI.sort=key;render();queueInterfaceSave();}
function squadReset(){Object.assign(squadUI,{query:'',position:'all',status:'all',sort:'position',direction:1});render();queueInterfaceSave();}
function squadValue(p,key){
  if(key==='position')return ({MV:0,B:1,C:2,VF:3,HF:4,F:5}[p.pos]??6);
  if(key==='points')return (p.goals||0)+(p.assists||0);
  if(key==='condition')return Math.max(0,Math.round(100-(p.fatigue||0)));
  if(key==='morale')return Math.round(p.happiness||0);
  return p[key]??0;
}
function squadPlayers(){
  return managerRoster().filter(p=>(squadUI.position==='all'||(squadUI.position==='F'?!['MV','B'].includes(p.pos):p.pos===squadUI.position))&&p.name.toLocaleLowerCase('sv').includes(squadUI.query.toLocaleLowerCase('sv').trim())&&(squadUI.status==='all'||squadUI.status==='unavailable'&&!medicalReady(p)||squadUI.status==='tired'&&medicalReady(p)&&p.fatigue>=35||squadUI.status==='expiring'&&contractNeedsDecision(p)))
    .slice().sort((a,b)=>{const x=squadValue(a,squadUI.sort),y=squadValue(b,squadUI.sort);return (typeof x==='string'?x.localeCompare(String(y),'sv'):x-y)*squadUI.direction||a.name.localeCompare(b.name,'sv');});
}
function squadColumn(key,label){return `<th scope="col" aria-sort="${squadUI.sort===key?(squadUI.direction===1?'ascending':'descending'):'none'}"><button type="button" onclick="squadSort('${key}')">${label}${squadUI.sort===key?(squadUI.direction===1?' ↑':' ↓'):''}</button></th>`;}
function squadWorkspaceView(){
  depthSelection();
  const all=managerRoster(),rows=squadPlayers(),tab=squadUI.tab;
  const option=(values,current)=>Object.entries(values).map(([key,label])=>`<option value="${key}" ${key===current?'selected':''}>${label}</option>`).join('');
  const heads=tab==='contracts'?`${squadColumn('salary','Årslön')}${squadColumn('contractYears','År kvar')}<th>Avtalad roll</th><th>Avtalsläge</th>`:tab==='performance'?`${squadColumn('goals','Mål')}${squadColumn('assists','Assist')}${squadColumn('points','Poäng')}<th>Förmåga</th><th>Potential</th>`:`<th>Lagplacering</th>${squadColumn('condition','Ork %')}${squadColumn('morale','Moral %')}<th>Tillgänglighet</th><th>Förmåga</th>`;
  const cells=p=>tab==='contracts'?`<td>${careerMoney(p.salary)}</td><td>${p.contractYears}</td><td>${trainingSafe(p.promisedRole||p.squadRole||'Ej angiven')}</td><td>${playerLoan(p)?'Inlånad':p.futureContract?'Framtida avtal klart':contractNeedsDecision(p)?'Sista avtalsåret':p.transferListed?'Transferlistad':'Under kontrakt'}</td>`:tab==='performance'?`<td>${p.goals||0}</td><td>${p.assists||0}</td><td><strong>${squadValue(p,'points')}</strong></td><td>${assessmentBadge(p)}</td><td>${assessmentBadge(p,true)}</td>`:`<td>${trainingSafe(lineupPlayerPlace(p))}${playerLoan(p)?'<small>Inlånad</small>':''}</td><td>${squadValue(p,'condition')}</td><td>${squadValue(p,'morale')}</td><td><span class="sw-health ${!medicalReady(p)?'warning':''}">${medicalReady(p)?'Matchklar':'Ej matchklar'}</span></td><td>${assessmentBadge(p)}</td>`;
  return `<section class="squad-workspace"><header class="sw-heading"><div><span class="desk-kicker">${trainingSafe(managerClub())} · ${seasonLabel()}</span><h1>Spelartrupp</h1></div>${deskLink('Taktik & laguttagning',{page:'lines'},'btn secondary')}</header>
  <div class="sw-summary"><span><strong>${all.length}</strong> spelare</span><span><strong>${all.filter(p=>p.pos==='MV').length}</strong> målvakter</span><span><strong>${all.filter(p=>p.pos==='B').length}</strong> backar</span><span><strong>${all.filter(p=>!['MV','B'].includes(p.pos)).length}</strong> forwards</span><span><strong>${all.filter(p=>!medicalReady(p)).length}</strong> ej matchklara</span><span><strong>${careerMoney(wageBudget()-annualWageCost())}</strong> löneutrymme före bud</span></div>
  <div class="sw-toolbar"><nav aria-label="Truppens tabellvy">${Object.entries({status:'Truppstatus',performance:'Prestation',contracts:'Kontrakt'}).map(([key,label])=>`<button type="button" aria-pressed="${tab===key}" onclick="squadSet('tab','${key}')">${label}</button>`).join('')}</nav><span>${rows.length} av ${all.length} spelare</span></div>
  <form class="sw-filters" onsubmit="event.preventDefault();squadSet('query',this.elements.query.value)"><label>Sök spelare<input type="search" name="query" value="${trainingSafe(squadUI.query)}" placeholder="Spelarens namn"></label><button type="submit">Sök</button><label>Position<select onchange="squadSet('position',this.value)">${option({all:'Alla positioner',MV:'Målvakter',B:'Backar',F:'Forwards',C:'Centrar',VF:'Vänsterforwards',HF:'Högerforwards'},squadUI.position)}</select></label><label>Urval<select onchange="squadSet('status',this.value)">${option({all:'Hela truppen',unavailable:'Ej matchklara',tired:'Hög belastning',expiring:'Kontrakt att se över'},squadUI.status)}</select></label><button type="button" onclick="squadReset()">Rensa urval</button></form>
  <div class="sw-table-wrap" role="region" aria-label="Spelartrupp" tabindex="0"><table><thead><tr>${squadColumn('position','Pos')}${squadColumn('name','Spelare')}${squadColumn('age','Ålder')}${heads}</tr></thead><tbody>${rows.map(p=>`<tr><td>${p.pos}</td><th scope="row"><button type="button" onclick="selectPlayer('${p.id}')">${trainingSafe(p.name)}</button></th><td>${p.age}</td>${cells(p)}</tr>`).join('')||'<tr><td colspan="8">Inga spelare matchar urvalet. Ändra filtren eller välj Rensa urval.</td></tr>'}</tbody></table></div>
  <footer>${tab==='contracts'?'Öppna spelarprofilen för avtalsvillkor och kontraktsförhandling. Inlånade spelare hanteras under Rekrytering → Affärer.':tab==='performance'?'Mål, assist och poäng från spelarens sparade säsongsstatistik. Stjärnorna visar stabens bedömning.':'Ork är 100 minus trötthet. Medicinsk matchklarhet visas separat. Öppna spelarprofilen för detaljer och använd Taktik & laguttagning för att ändra kedjor.'}</footer></section>`;
}
