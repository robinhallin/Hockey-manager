"use strict";
// A selection changes presentation only. Career decisions use the existing actions.
const squadUI={tab:'status',query:'',position:'all',status:'all',sort:'position',direction:1,player:null,scroll:0};
const SQUAD_VIEWS={status:'Truppstatus',performance:'Prestation',ratings:'Snittbetyg',contracts:'Kontrakt'};
const SQUAD_COLUMNS={name:'Spelare',position:'Pos',age:'Ålder',ability:'Förmåga',potential:'Potential',change:'Attribut ±',condition:'Ork',morale:'Moral',availability:'Status',games:'M',goals:'Mål',assists:'Assist',points:'Poäng',ice:'Istid / M',rating:'Snittbetyg',ratedGames:'Bedömda M',latest:'Senaste betyg',latestDate:'Senast bedömd',salary:'Årslön',contractYears:'År kvar',role:'Avtalad roll',contract:'Avtalsläge'};
const SQUAD_VIEW_COLUMNS={
 status:['name','position','age','ability','potential','change','condition','morale','availability'],
 performance:['name','position','games','goals','assists','points','ice','rating'],
 ratings:['name','position','ratedGames','latest','rating','latestDate'],
 contracts:['name','position','age','salary','contractYears','role','contract']
};
function squadSet(key,value){
 const choices={tab:Object.keys(SQUAD_VIEWS),position:['all','MV','B','F','C','VF','HF'],status:['all','ready','unavailable','tired','expiring']};
 if(key!=='query'&&!choices[key]?.includes(value))return;
 if(key==='query')value=String(value).slice(0,100);
 squadUI[key]=value;squadUI.scroll=0;
 if(key==='tab'&&!SQUAD_VIEW_COLUMNS[value].includes(squadUI.sort))squadUI.sort='position';
 render();queueInterfaceSave();
}
function squadSort(key){if(!Object.hasOwn(SQUAD_COLUMNS,key))return;squadUI.direction=squadUI.sort===key?-squadUI.direction:1;squadUI.sort=key;squadUI.scroll=0;render();queueInterfaceSave();}
function squadReset(){Object.assign(squadUI,{query:'',position:'all',status:'all',sort:'position',direction:1,scroll:0});render();queueInterfaceSave();}
function squadSelectPlayer(id){
 if(id!==null&&!managerRoster().some(p=>samePlayerId(p.id,id)))return;
 const previous=squadUI.player,table=document.getElementById('squad-table-scroll');squadUI.scroll=table?.scrollTop||0;squadUI.player=id;render();
 if(id!==null)squadKeepSelectionVisible();queueInterfaceSave();
 if(id!==null){const panel=document.getElementById('squad-player-detail');panel?.focus?.({preventScroll:true});if(typeof window!=='undefined'&&window.innerWidth<1100)panel?.scrollIntoView?.({block:'nearest'});}
 else document.getElementById('squad-player-'+previous)?.focus?.({preventScroll:true});
}
function squadKeepSelectionVisible(){
 const table=document.getElementById('squad-table-scroll'),button=document.getElementById('squad-player-'+squadUI.player);
 if(!table?.getBoundingClientRect||!button?.getBoundingClientRect)return;
 const area=table.getBoundingClientRect(),row=button.getBoundingClientRect(),top=area.top+(table.querySelector('thead')?.getBoundingClientRect().height||36);
 if(row.top<top)table.scrollTop-=top-row.top+6;
 else if(row.bottom>area.bottom-10)table.scrollTop+=row.bottom-area.bottom+16;
 squadUI.scroll=table.scrollTop;
}
function squadRestoreView(){const table=document.getElementById('squad-table-scroll');if(table)table.scrollTop=squadUI.scroll||0;}
function squadSelected(){return managerRoster().find(p=>samePlayerId(p.id,squadUI.player))||null;}
function squadPlayerAction(action){
 const p=squadSelected();if(!p)return;
 if(action==='profile'||action==='contract'){deskOpenPlayer(p.id);if(action==='contract'){profileWorkspace.tab='contract';render();queueInterfaceSave();}}
 else if(action==='place'){ensureLines();squadOpenPlace(p.id);}
 else if(action==='training')developmentOpenPlayer(p.id,'training',true);
 else if(action==='medical'){deskNavigate('medical');developmentUI.medicalTab='cases';developmentSet('medical',p.id);}
 else if(action==='talk'){deskNavigate('locker');Object.assign(lockerUI,{tab:'situation',filter:'all',query:'',group:'all',detail:null,scroll:0,player:p.id});render();queueInterfaceSave();}
}
function squadAvailability(p){return internationalAway(p)?'Landslagsuppdrag':p.health?.injury?medicalStatus(p):medicalReady(p)?'Matchklar':'Ej matchklar';}
function squadContract(p){return playerLoan(p)?'Inlånad':p.futureContract?'Framtida avtal klart':contractNeedsDecision(p)?'Sista avtalsåret':p.transferListed?'Transferlistad':'Under kontrakt';}
function squadPlace(p){
 if(internationalAway(p))return 'På landslagsuppdrag';
 if(!medicalReady(p))return 'Ej matchklar';
 if(!state.lines)return 'Ej uttagen';
 return lineupPlayerPlace(p);
}
function squadSeasonStats(p){
 const ledger=state.leagueStatistics;
 const rows=ledger?.year===state.season.year?Object.values(ledger.rows||{}).filter(r=>r.club===managerClub()&&samePlayerId(r.id,p.id)&&['regular','playoffs'].includes(r.stage)):[];
 if(!rows.length)return {games:null,goals:null,assists:null,points:null,ice:null,partial:false};
 const sum=key=>rows.reduce((n,r)=>n+(r[key]||0),0),games=sum('games');
 return {games,goals:sum('goals'),assists:sum('assists'),points:sum('goals')+sum('assists'),ice:games?sum('seconds')/games:null,partial:rows.some(r=>r.partial)};
}
function squadRow(p){
 const assessment=playerAssessment(p),ratings=playerRatingSummary(p),delta=developmentChange(p);
 return {p,name:p.name,position:({MV:0,B:1,C:2,VF:3,HF:4,F:5}[p.pos]??6),age:p.age,
 ability:assessment.known?assessment.current:null,potential:assessment.known?(assessment.potentialLow+assessment.potentialHigh)/2:null,assessment,delta,change:delta?.net??null,
 condition:Math.max(0,Math.min(100,Math.round(100-(p.fatigue||0)))),morale:Number.isFinite(p.morale)?Math.round(p.morale):null,
 availability:squadAvailability(p),salary:p.salary??null,contractYears:p.contractYears??null,role:p.promisedRole||p.squadRole||'Ej angiven',contract:squadContract(p),
 ...squadSeasonStats(p),rating:ratings.average,ratedGames:ratings.games,latest:ratings.latest?.score??null,latestDate:ratings.latest?.date??null};
}
function squadValue(p,key){return squadRow(p)[key]??null;}
function squadRows(){
 const query=String(squadUI.query||'').toLocaleLowerCase('sv').trim();
 return managerRoster().filter(p=>(squadUI.position==='all'||(squadUI.position==='F'?!['MV','B'].includes(p.pos):p.pos===squadUI.position))&&p.name.toLocaleLowerCase('sv').includes(query)&&(squadUI.status==='all'||squadUI.status==='ready'&&medicalReady(p)||squadUI.status==='unavailable'&&!medicalReady(p)||squadUI.status==='tired'&&p.fatigue>=35||squadUI.status==='expiring'&&contractNeedsDecision(p)))
 .map(squadRow).sort((a,b)=>{const x=a[squadUI.sort],y=b[squadUI.sort];if(x==null||y==null)return x==null&&y!=null?1:y==null&&x!=null?-1:a.name.localeCompare(b.name,'sv');return (typeof x==='number'?x-y:String(x).localeCompare(String(y),'sv',{numeric:true}))*squadUI.direction||a.name.localeCompare(b.name,'sv')||String(a.p.id).localeCompare(String(b.p.id));});
}
function squadPlayers(){return squadRows().map(r=>r.p);}
function squadColumn(key,label=SQUAD_COLUMNS[key]){return `<th scope="col" aria-sort="${squadUI.sort===key?(squadUI.direction===1?'ascending':'descending'):'none'}"><button type="button" onclick="squadSort('${key}')">${label}<span aria-hidden="true">${squadUI.sort===key?(squadUI.direction===1?'↑':'↓'):'↕'}</span></button></th>`;}
function squadStars(row,potential=false){const r=row.assessment;return r.known?starRatingHTML(potential?r.potentialLow:r.low,potential?r.potentialHigh:r.high,potential,r.staff.name):'<span class="sw-muted">Ej bedömd</span>';}
function squadCell(row,key){
 const p=row.p,value=row[key],safe=trainingSafe;
 if(key==='name')return `<th scope="row"><button type="button" id="squad-player-${safe(p.id)}" class="sw-player-name" aria-pressed="${samePlayerId(squadUI.player,p.id)}" aria-controls="squad-player-detail" onclick="${safe(`squadSelectPlayer(${JSON.stringify(p.id)})`)}">${safe(p.name)}</button><small>${safe(squadPlace(p))}${playerLoan(p)?' · Inlånad':''}</small></th>`;
 if(key==='position')return `<td><span class="sw-position">${safe(p.pos)}</span></td>`;
 if(key==='ability'||key==='potential')return `<td>${squadStars(row,key==='potential')}</td>`;
 if(key==='change')return `<td class="sw-change ${value>0?'sw-positive':value<0?'sw-negative':''}" title="${row.delta?row.delta.up+' ökade och '+row.delta.down+' minskade attributsteg sedan uppföljningens början':'Jämförelseunderlag saknas'}">${value==null?'–':(value>0?'+':'')+value}</td>`;
 if(key==='condition')return `<td><span class="sw-energy ${value<65?'sw-warning':''}"><i aria-hidden="true" style="--sw-energy:${value}%"></i>${value} %</span></td>`;
 if(key==='morale')return `<td class="${value<50?'sw-warning':''}">${value==null?'–':value+' %'}</td>`;
 if(key==='availability')return `<td><span class="sw-health ${!medicalReady(p)||p.health?.injury?'sw-warning':''}">${safe(value)}</span></td>`;
 if(['rating','latest'].includes(key))return `<td class="sw-rating">${performanceNumber(value)}</td>`;
 if(key==='salary')return `<td>${value==null?'–':careerMoney(value)}</td>`;
 if(key==='latestDate')return `<td>${value?calText(value):'–'}</td>`;
 if(key==='ice')return `<td title="Registrerad tävlingsistid per match för klubben denna säsong${row.partial?' · ofullständigt underlag':''}">${value==null?'–':analysisTime(value)}${row.partial?' *':''}</td>`;
 return `<td>${value==null?'–':safe(value)}${['games','goals','assists','points'].includes(key)&&row.partial?' *':''}</td>`;
}
function squadPlayerAdvice(p,tab){
 if(tab==='contracts')return {title:squadContract(p),text:playerLoan(p)?'Granska låneavtalets villkor och återstående tid.':'Väg avtalad roll och lönekostnad mot platsen i nästa säsongs trupp.',action:'contract',label:'Granska avtal'};
 if(internationalAway(p))return {title:'På landslagsuppdrag',text:'Spelaren är inte tillgänglig för klubben. Planera vem som täcker platsen under uppdraget.',action:'place',label:'Se plats i laget'};
 if(p.health?.injury)return {title:squadAvailability(p),text:'Läs prognosen och eventuell begränsning av istiden innan du planerar nästa match.',action:'medical',label:'Medicinsk plan'};
 if((p.fatigue||0)>=35)return {title:'Hög belastning',text:`${Math.round(100-p.fatigue)} % ork. Väg återhämtning mot nästa träningspass och match.`,action:'training',label:'Planera återhämtning'};
 if(lockerConcerns(p).length||lockerRequests(p).length)return {title:'Följ upp spelarens situation',text:[...lockerConcerns(p),...(lockerRequests(p).length?['Spelarsamtal väntar på svar']:[])].join(' · '),action:'talk',label:'Öppna spelarsamtal'};
 if(contractNeedsDecision(p))return {title:'Avtal på sista året',text:'Ta ställning till spelarens framtida roll innan du erbjuder ett nytt avtal.',action:'contract',label:'Granska avtal'};
 if((developmentChange(p)?.net||0)!==0)return {title:'Följ utvecklingen',text:'Attributen har förändrats. Se utvecklingsplan och faktisk istid innan du ändrar rollen.',action:'training',label:'Se utvecklingsplan'};
 return {title:squadPlace(p),text:`Avtalad roll: ${p.promisedRole||p.squadRole||'Ej angiven'}. Jämför rollen med laguttagning och kommande belastning.`,action:'place',label:'Se plats i laget'};
}
function squadPortrait(p){return `<div class="sw-portrait" aria-hidden="true"><svg viewBox="0 0 120 140" fill="none"><path d="M28 33c0-24 64-24 64 0v14H28Z" fill="#455663"/><path d="M37 43h46v19c0 25-46 25-46 0Z" fill="#75838c"/><path d="m39 79-26 14-9 47h112l-9-47-26-14-21 17Z" fill="var(--club-primary,#274459)"/><path d="m39 79 21 17 21-17M12 116h25m46 0h25" stroke="var(--sw-accent)" stroke-width="5"/><path d="M32 46h56" stroke="#a2adb5" stroke-width="3"/></svg>${clubCrest(managerClub(),'small')}<span class="sw-portrait-label">${trainingSafe(p.pos)}</span></div>`;}
function squadPlayerPanel(rows,tab){
 const p=squadSelected();
 if(!p)return `<aside class="sw-player-empty" id="squad-player-detail"><span>${deskIcon('team')}</span><div><strong>Välj en spelare i tabellen</strong><p>Se bedömning, utveckling och nästa steg här.</p></div><small>Sortera med kolumnrubrikerna · Klicka på ett namn eller använd Tab och Enter</small></aside>`;
 const row=rows.find(r=>samePlayerId(r.p.id,p.id))||squadRow(p),advice=squadPlayerAdvice(p,tab),labels=p.pos==='MV'?GOALIE_ATTRIBUTES:SKATER_ATTRIBUTES;
 const baseline=p.academy?.baseline||p.trainingBaseline;
 const changes=Object.entries(p.attributes||{}).filter(([key,value])=>Number.isFinite(baseline?.[key])&&Number.isFinite(value)&&value!==baseline[key]).map(([key,value])=>({key,value:value-baseline[key]})).sort((a,b)=>Math.abs(b.value)-Math.abs(a.value)||a.key.localeCompare(b.key)).slice(0,3);
 return `<aside class="sw-player-detail" id="squad-player-detail" tabindex="-1" aria-label="Vald spelare: ${trainingSafe(p.name)}"><div class="sw-identity">${squadPortrait(p)}<div><small>${p.age} år · ${trainingSafe(p.pos)} · ${trainingSafe(squadPlace(p))}</small><h2>${trainingSafe(p.name)}</h2><div class="sw-player-stars"><span>${squadStars(row)}<small>Förmåga</small></span><span>${squadStars(row,true)}<small>Potential · bedömning</small></span></div>${!rows.some(r=>r.p===p)?'<p class="sw-filter-note">Vald spelare ingår inte i aktuellt urval.</p>':''}</div></div><div class="sw-progress"><h3>Utveckling</h3>${changes.length?`<dl>${changes.map(c=>`<div><dt>${trainingSafe(labels[c.key]||c.key)}</dt><dd class="${c.value>0?'sw-positive':'sw-negative'}">${c.value>0?'+':''}${c.value}</dd></div>`).join('')}</dl>`:`<p>${row.delta?'Inga registrerade attributförändringar.':'Jämförelseunderlag saknas.'}</p>`}<small>Sedan uppföljningens början${changes.length?' · största förändringarna':''}</small></div><div class="sw-next"><h3>Nästa steg</h3><strong>${trainingSafe(advice.title)}</strong><p>${trainingSafe(advice.text)}</p><div class="sw-player-actions"><button type="button" class="sw-primary" onclick="squadPlayerAction('profile')">Öppna spelarprofil ${deskIcon('arrow')}</button><button type="button" class="sw-link" onclick="squadPlayerAction('${advice.action}')">${advice.label} ${deskIcon('arrow')}</button></div><nav aria-label="Åtgärder för vald spelare">${[['place','Plats i laget'],['training','Utveckling'],['talk','Samtal'],['contract','Avtal']].filter(([a])=>a!==advice.action).map(([action,label])=>`<button type="button" onclick="squadPlayerAction('${action}')">${label}</button>`).join('')}</nav></div><button type="button" class="sw-close" aria-label="Stäng spelaröversikten" onclick="squadSelectPlayer(null)">×</button></aside>`;
}
function squadWorkspaceView(){
 const all=managerRoster(),rows=squadRows(),tab=Object.hasOwn(SQUAD_VIEWS,squadUI.tab)?squadUI.tab:'status',columns=SQUAD_VIEW_COLUMNS[tab],ready=all.filter(medicalReady).length;
 const option=(values,current)=>Object.entries(values).map(([key,label])=>`<option value="${key}" ${key===current?'selected':''}>${label}</option>`).join('');
 const notes={status:'Stjärnor är stabens bedömning; ljusa delar visar osäkerhet. Attribut ± jämför med säsongsstart eller första uppföljning. Ork är 100 minus trötthet; matchstartens energi beräknas separat. Moral är spelarens matchmoral, inte trivseln i klubben.',performance:'Registrerad tävlingsstatistik för din klubb denna säsong, grundserie och slutspel. Träningsmatcher och poäng för tidigare klubbar ingår inte. Saknat underlag visas som –; * betyder ofullständigt underlag. Istid / M är registrerad istid delad med registrerade matcher.',ratings:'Snittbetyg: 0,0–10,0 i bedömda tävlingsmatcher för klubben denna säsong. Träningsmatcher, ofullständiga matcher och för kort istid räknas inte. Saknat underlag visas som –. Äldre bevarade matchbetyg ingår.',contracts:'Årslön och återstående avtalsår enligt sparat avtal. Rollen är vad spelaren har blivit lovad. Välj spelare och Granska avtal för villkor och förhandling; inlån hanteras i Rekrytering → Affärer.'};
 return `<section class="squad-workspace"><header class="sw-heading"><div class="sw-heading-club">${clubCrest(managerClub())}<div><span class="sw-eyebrow">${trainingSafe(managerClub())} · ${seasonLabel()}</span><h1>Spelartrupp</h1><p>Hela laget. Nästa beslut.</p></div></div><div class="sw-heading-meta"><strong>${ready}<span> / ${all.length}</span></strong><span>matchklara</span><small>${all.filter(p=>p.pos==='MV').length} MV · ${all.filter(p=>p.pos==='B').length} B · ${all.filter(p=>!['MV','B'].includes(p.pos)).length} F</small></div></header>
 <div class="sw-toolbar"><nav aria-label="Truppens tabellvy">${Object.entries(SQUAD_VIEWS).map(([key,label])=>`<button type="button" aria-pressed="${tab===key}" onclick="squadSet('tab','${key}')">${label}</button>`).join('')}</nav><span>${rows.length} av ${all.length} spelare</span></div>
 <form class="sw-filters" onsubmit="event.preventDefault();squadSet('query',this.elements.query.value)"><label class="sw-search">Sök spelare<input type="search" name="query" value="${trainingSafe(squadUI.query)}" placeholder="Spelarens namn"></label><button type="submit">Sök</button><label>Position<select aria-label="Position" onchange="squadSet('position',this.value)">${option({all:'Alla positioner',MV:'Målvakter',B:'Backar',F:'Forwards',C:'Centrar',VF:'Vänsterforwards',HF:'Högerforwards'},squadUI.position)}</select></label><label>Urval<select aria-label="Urval" onchange="squadSet('status',this.value)">${option({all:'Hela truppen',ready:'Matchklara',unavailable:'Ej matchklara',tired:'Hög belastning',expiring:'Kontrakt att se över'},squadUI.status)}</select></label><button type="button" class="sw-reset" onclick="squadReset()">Rensa urval</button>${tab==='contracts'?`<span class="sw-budget">Löneutrymme före bud <strong>${careerMoney(wageBudget()-annualWageCost())}</strong></span>`:''}</form>
 <div class="sw-table-wrap" id="squad-table-scroll" role="region" aria-label="Spelartrupp" tabindex="0" onscroll="squadUI.scroll=this.scrollTop"><table data-squad-view="${tab}"><thead><tr>${columns.map(key=>squadColumn(key)).join('')}</tr></thead><tbody>${rows.map(row=>`<tr data-squad-player="${trainingSafe(row.p.id)}" class="${samePlayerId(squadUI.player,row.p.id)?'sw-selected':''}">${columns.map(key=>squadCell(row,key)).join('')}</tr>`).join('')||`<tr><td colspan="${columns.length}" class="sw-empty">Inga spelare matchar urvalet. Ändra filtren eller välj Rensa urval.</td></tr>`}</tbody></table></div>
 <details class="sw-table-help"><summary>Så läser du ${tab==='status'?'truppstatus':tab==='ratings'?'matchbetygen':tab==='performance'?'statistiken':'avtalen'}</summary><p>${notes[tab]}</p></details>${squadPlayerPanel(rows,tab)}</section>`;
}
