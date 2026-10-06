"use strict";
// One destination catalog for search and contextual help; all actions use existing routes.
const navigationUI={searchOpen:null};
const DESK_DESTINATIONS=[
 ['home','Tränarkontoret','Översikt, aktuella beslut och nästa match','home'],
 ['agenda','Beslutslista','Inkorg, prioriteringar, svar och uppföljning','inbox'],
 ['calendar','Kalender','Schema, träningsmatcher, matcher och dagar','calendar'],
 ['squad','Trupp','Laget, spelare, roller och statistik','squad'],
 ['contracts','Utgående kontrakt','Förlängningar, avtal och framtida trupp','squad','contracts'],
 ['lines','Taktik & laguttagning','Kedjor, backpar, målvakter, PP, BP och lagorder','lines'],
 ['locker','Omklädningsrum','Spelarsamtal, löften, kaptener och förtroende','locker'],
 ['training','Spelarutveckling','Träning, träningsplan, återhämtning och utveckling','training'],
 ['juniors','Juniorer','Akademi, J20 och vägen till A-laget','juniors'],
 ['medical','Medicinskt team','Skador, rehabilitering och belastning','medical'],
 ['needs','Truppplanering','Rekryteringsbehov, ersättare, nästa säsong','transfers','needs'],
 ['search','Sök spelare','Rekrytering, värvningar, transfers, kontraktslösa','transfers','search'],
 ['missions','Scoutkontoret','Scouting, uppdrag och rapporter','transfers','missions'],
 ['shortlist','Rapporter & bevakning','Kandidater, bedömning och kortlista','transfers','shortlist'],
 ['deals','Bud & avtal','Förhandling, övergång, köp och försäljning','transfers','deals'],
 ['loans','Aktiva lån','Utlåning, inlåning och återkallelse','transfers','deals'],
 ['finance','Ekonomi','Budget, kassaflöde, biljettpris och lön','finance'],
 ['board','Styrelse','Styrelsedialog, mål, förtroende och resurser','board'],
 ['staff','Personal','Anställa, scouter, tränare och fysioterapeut','staff'],
 ['staffReview','Stab & uppföljning','Delegering, ansvar och stabsförslag','staffReview'],
 ['manager','Min karriär','Tränarprofil, klubbjobb och anställning','manager'],
 ['world','Nyheter & bevakning','Hockeyvärlden, liganyheter och möjligheter','world'],
 ['leagues','Ligor & resultat','Klubbar, slutspel, kval och uppflyttning','leagues'],
 ['table','Tabell','Ligatabell, placering och poäng','table'],
 ['leagueStats','Ligans spelarstatistik','Poängliga, mål, assist och betyg','leagueStats'],
 ['international','Landslag & JVM','Landslag, junior-VM och uttagning','international'],
 ['nhl','NHL & draft','Nordamerika, AHL, draft och rättigheter','nhl'],
 ['season','Säsong & historik','Utvärdering, säsongsbyte, meriter och arkiv','season'],
 ['settings','Sparfiler & inställningar','Spara, ladda, exportera och importera karriär','settings']
];
function deskFindResults(query){
 const normalize=s=>String(s).toLocaleLowerCase('sv').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
 const words=normalize(query).trim().split(/\s+/).filter(Boolean);if(!words.length)return [];
 return DESK_DESTINATIONS.filter(r=>words.every(w=>normalize(r[1]+' '+r[2]).includes(w))).slice(0,8);
}
function deskFindOpen(key){
 const d=DESK_DESTINATIONS.find(d=>d[0]===key);if(!d)return false;
 navigationUI.searchOpen=false;
 if(key==='agenda')managerOpenAgenda();
 else{deskNavigate(d[3],d[4]);if(['loans','deals'].includes(key)){recruitHub.affairs=key==='loans'?'active':'open';state.recruitment.focusDeal=null;render();queueInterfaceSave();}}
 deskBrowserBefore();return true;
}
function deskExternalProfileTab(key){
 if(!['overview','report','performance','contract'].includes(key))return false;
 const p=findPlayerAnywhere(state.selectedMarketPlayer);if(!p||isOwnPlayer(p))return false;
 profileWorkspace.tab=key;
 if(key==='contract'&&recruitHub.panel==='report')recruitHub.panel=playerLoan(p)?'loan':'transfer';
 render();queueInterfaceSave();return true;
}
function deskSearchSubmit(form){state.playerSearchQuery=String(form.elements.entityQuery.value).trim().slice(0,100);navigationUI.searchOpen=true;render();queueInterfaceSave();document.getElementById('desk-search-input')?.focus?.();}
function deskSearchClose(){navigationUI.searchOpen=false;const el=document.querySelector('.entity-search');if(el){el.open=false;el.querySelector?.('summary')?.focus?.();}}
function deskSearchFocus(){
 if(careerScreen||!state.careerStarted||document.querySelector('dialog[open]')?.open)return false;
 const el=document.querySelector('.entity-search');if(!el)return false;
 navigationUI.searchOpen=true;el.open=true;document.getElementById('desk-search-input')?.focus?.();return true;
}
document.addEventListener('keydown',event=>{
 if((event.ctrlKey||event.metaKey)&&String(event.key).toLowerCase()==='k'){if(deskSearchFocus())event.preventDefault();}
 if(event.key==='Escape'&&document.querySelector('.entity-search')?.open&&!document.querySelector('dialog[open]')?.open){deskSearchClose();event.preventDefault();}
});
function deskLocationView(area=deskArea()){
 const page=state.page,parent=area?.details?.[page]||page,detail={player:'Spelarprofil',marketPlayer:'Spelarprofil',clubDetail:'Klubbprofil',table:'Tabell',leagueStats:'Spelarstatistik',news:'Liganyheter',statistics:'Laganalys',opponents:'Motståndare',schedule:'Matcher',round:'Omgång',match:'Match'};
 const label=detail[page]||area?.pages.find(([id])=>id===parent)?.[1]||({inbox:'Inkorg',settings:'Sparfiler & inställningar'}[page])||'Hockey Manager';
 if(page==='match')return `<span>${trainingSafe(area?.label||label)}</span><small>${state.calendar?calText(state.calendar.date):''}</small>`;
 return `${deskHistory.length&&!['player','marketPlayer'].includes(page)?'<button class="desk-return" onclick="deskBack()" aria-label="Tillbaka i navigationen" title="Tillbaka till föregående vy">←</button>':''}<span class="desk-location"><small>${trainingSafe(area?.label||'Hockey Manager')}</small><span>${trainingSafe(label)}</span></span>`;
}
function deskLeagueNavigation(){
 if(!['leagues','table','leagueStats','clubDetail'].includes(state.page))return '';
 const tabs=[['clubs','Klubbar'],['table','Tabell'],['leagueStats','Spelarstatistik'],['playoffs','Slutspel & kval'],['history','Ligabyten']],active=state.page==='leagues'?leagueWorkspaceUI.tab:state.page;
 return `<nav class="desk-context-nav" aria-label="Ligor och resultat">${tabs.map(([key,label])=>`<button onclick="${['table','leagueStats'].includes(key)?`deskNavigate('${key}')`:`deskLeagueOpen('${key}')`}" ${active===key?'aria-current="page"':''}>${label}</button>`).join('')}</nav>`;
}
function deskLeagueOpen(tab){if(!['clubs','playoffs','history'].includes(tab))return;deskNavigate('leagues');leagueWorkspaceTab(tab);deskBrowserBefore();}
function deskSearchSuggestions(){
 const page=state.page;
 const keys=['transfers','marketPlayer'].includes(page)?['needs','missions','deals','finance']:['squad','player','lines','locker'].includes(page)?['lines','locker','medical','contracts']:['training','juniors','medical'].includes(page)?['training','juniors','medical','staffReview']:['finance','board','staff','staffReview','manager'].includes(page)?['finance','board','staff','staffReview']:['agenda','calendar','search','table'];
 return keys.map(key=>DESK_DESTINATIONS.find(d=>d[0]===key)).filter(Boolean);
}
function deskDestinationView(rows){return `<ul class="desk-destinations">${rows.map(d=>`<li><button onclick="deskFindOpen('${d[0]}')"><strong>${trainingSafe(d[1])}</strong><small>${trainingSafe(d[2])}</small></button></li>`).join('')}</ul>`;}
