"use strict";

// Editorial club scenarios for the game, not statements about real club finances.
const CAREER_CLUBS = {
  'HV71': {code:'HV71',city:'Jönköping',color:'#efce63',group:'playoff',title:'Tillbaka bland de bästa.',pitch:'Vi vill bygga ett lag som Jönköping kan tro på. Ge våra unga en väg in i laget och gör oss till en slutspelsklubb.',cash:18000000,place:6,youth:2},
  'Brynäs IF': {code:'BIF',city:'Gävle',color:'#efb69a',group:'title',title:'Tradition förpliktigar.',pitch:'Här räcker det inte att delta. Vi vill se ett topplag, men framgången får inte köpas på bekostnad av nästa generation.',cash:22000000,place:4,youth:2},
  'Djurgårdens IF': {code:'DIF',city:'Stockholm',color:'#e99585',group:'build',title:'Bygg något som håller.',pitch:'Ge talangerna ansvar och skapa en hållbar grund. Vi accepterar tålamod på isen, men kräver disciplin utanför den.',cash:13000000,place:10,youth:3,economy:true},
  'Färjestad BK': {code:'FBK',city:'Karlstad',color:'#8ad3aa',group:'title',title:'Trycket är ett privilegium.',pitch:'Vi ger dig resurser att konkurrera i toppen. Du ger oss resultat, en stark trupp och kontroll över kostnaderna.',cash:28000000,place:4,youth:1},
  'Frölunda HC': {code:'FHC',city:'Göteborg',color:'#e9a19b',group:'title',title:'Nästa generation. Samma ambition.',pitch:'Talanger ska bli bärande spelare här. Utveckling och en placering i toppen är två delar av samma uppdrag.',cash:23000000,place:4,youth:3},
  'Linköping HC': {code:'LHC',city:'Linköping',color:'#9fbcec',group:'build',title:'En tydlig riktning framåt.',pitch:'Skapa ordning, håll i pengarna och bygg en identitet. Vi vill se unga spelare växa och laget nå den övre halvan.',cash:12000000,place:10,youth:2,economy:true},
  'Luleå Hockey': {code:'LHF',city:'Luleå',color:'#f0bd75',group:'title',title:'Hela vägen tillsammans.',pitch:'Vi förväntar oss ett lag som är svårt att möta varje kväll. Ta oss till toppen och se till att klubbens framtid får plats.',cash:24000000,place:4,youth:2},
  'Malmö Redhawks': {code:'MIF',city:'Malmö',color:'#ec928b',group:'build',title:'Gör mer av varje krona.',pitch:'Din viktigaste egenskap blir omdöme. Få ordning på lönerna, ge unga chansen och håll oss borta från botten.',cash:10000000,place:12,youth:2,economy:true},
  'Rögle BK': {code:'RBK',city:'Ängelholm',color:'#9bd8aa',group:'playoff',title:'Utveckling med riktning.',pitch:'Vi tror på spelare som kan ta nästa steg. Bygg ett utvecklande lag och säkra en direktplats i slutspelet.',cash:19000000,place:6,youth:3},
  'Skellefteå AIK': {code:'SAIK',city:'Skellefteå',color:'#ecd366',group:'title',title:'Framtiden spelar redan här.',pitch:'Låt unga spelare få verkligt ansvar. Vi vill konkurrera i toppen med en trupp som också blir bättre till nästa år.',cash:22000000,place:4,youth:3},
  'Timrå IK': {code:'TIK',city:'Timrå',color:'#e9a3a4',group:'playoff',title:'Ta nästa steg.',pitch:'Gör oss till ett stabilt slutspelslag. Förädla talangerna och håll tillräckliga marginaler för att kunna agera klokt.',cash:16000000,place:6,youth:2},
  'Växjö Lakers': {code:'VLH',city:'Växjö',color:'#f2b086',group:'title',title:'Detaljerna avgör.',pitch:'Vi förväntar oss genomtänkta beslut och ett lag för toppen. Varje värvning ska rymmas i en långsiktig plan.',cash:24000000,place:4,youth:1},
  'Örebro Hockey': {code:'ÖHK',city:'Örebro',color:'#eaa7a0',group:'build',title:'Sätt en ny standard.',pitch:'Ta kontroll över kostnaderna och gör oss konkurrenskraftiga. Spelare ska utvecklas här, inte bara passera igenom.',cash:12000000,place:10,youth:2,economy:true},
  'Björklöven': {code:'IFB',city:'Umeå',color:'#aedc80',group:'build',title:'Skriv nästa kapitel.',pitch:'Uppdraget börjar med att etablera laget. Vi vill ha en trygg ekonomi, modiga unga spelare och avstånd till botten.',cash:9000000,place:12,youth:2,economy:true}
};

let careerScreen = 'menu';
let careerDraft = null;
let careerChoice = 'HV71';
let careerFilter = 'all';
let careerMessage = '';
const CAREER_SAVE_KEY = 'hockey_manager_alpha02';
const PREVIOUS_CAREER_KEY = 'hockey_manager_previous_career';

function careerIdentity(name){return CAREER_CLUBS[name]||CAREER_CLUBS.HV71;}
function careerMoney(value){return `${(value/1000000).toLocaleString('sv-SE',{maximumFractionDigits:1})} mkr`;}
function careerGroup(group){return {title:'Titelutmanare',playoff:'Slutspelsjakt',build:'Byggprojekt'}[group];}
function careerBadge(name,size=''){const c=careerIdentity(name);return `<span class="career-badge ${size}" style="--club-color:${c.color}">${c.code}</span>`;}
function careerOffer(name,rosters){
  const c=careerIdentity(name),roster=rosters[name]||[];
  const wages=roster.reduce((n,p)=>n+(p.salary||0),0);
  const youth=roster.filter(p=>p.age<=23).length;
  return {...c,name,wages,wageLimit:Math.round(wages*(c.economy?.95:1.12)/10000)*10000,youthCount:Math.min(c.youth,youth),youthGames:12,cashFloor:Math.round(c.cash*(c.economy?.5:.2))};
}
function careerGoalDefinitions(offer){
  return [
    {id:'league',category:'RESULTAT',title:offer.place===4?'Etablera oss i toppen':offer.place===6?'Ta en direktplats i slutspelet':'Bygg trygghet i tabellen',text:`Avsluta grundserien på plats ${offer.place} eller bättre.`,priority:'Avgörande'},
    ...(offer.youthCount?[{id:'youth',category:'UTVECKLING',title:'Ge talangerna verklig istid',text:`${offer.youthCount} spelare, högst 23 år vid första observationen, ska spela minst ${offer.youthGames} matcher med minst fem minuters istid.`,priority:'Viktigt'}]:[]),
    {id:'finance',category:'EKONOMI',title:offer.economy?'Få ordning på ekonomin':'Behåll ekonomiskt handlingsutrymme',text:`Håll årslönerna inom ${careerMoney(offer.wageLimit)} och ha minst ${careerMoney(offer.cashFloor)} kvar i klubbkassan vid grundseriens slut.`,priority:offer.economy?'Avgörande':'Viktigt'}
  ];
}
function initializeBoardPlan(offer=null){
  if(state.boardPlan)return;
  const chosen=offer||careerOffer(managerClub(),state.clubRosters);
  // Older careers keep their existing financial room and start observation now.
  if(!offer){chosen.wageLimit=getClub()?.wageBudget||chosen.wageLimit;chosen.cashFloor=Math.max(0,Math.min(chosen.cashFloor,state.money));}
  const total=state.schedule.filter(g=>g.home===managerClub()||g.away===managerClub()).length;
  const played=team(managerClub())?.gp||0;
  chosen.youthGames=Math.min(12,Math.max(1,total-played));
  state.boardPlan={version:1,club:managerClub(),offer:chosen,startPlayed:played,youthAppearances:{},lastRecordedRound:0};
}
function recordBoardMatch(){
  initializeBoardPlan();
  const b=state.boardPlan,m=state.live;
  if(!m?.finished||b.lastRecordedRound===state.round)return;
  for(const p of managerRoster()){
    const entry=b.youthAppearances[String(p.id)];
    if((entry||p.age<=23)&&(m.iceTime?.[String(p.id)]||0)>=300){
      b.youthAppearances[String(p.id)]={name:p.name,games:(entry?.games||0)+1};
    }
  }
  b.lastRecordedRound=state.round;
}
function boardProgress(){
  initializeBoardPlan();
  const b=state.boardPlan,offer=b.offer;
  const table=[...state.teams].sort((a,z)=>z.pts-a.pts||(z.gf-z.ga)-(a.gf-a.ga));
  const own=team(managerClub()),played=own?.gp||0;
  const total=state.schedule.filter(g=>g.home===managerClub()||g.away===managerClub()).length;
  const ended=played>=total;
  const position=table.findIndex(t=>t.name===managerClub())+1;
  const youngsters=Object.values(b.youthAppearances).sort((a,z)=>z.games-a.games);
  const qualified=youngsters.filter(p=>p.games>=offer.youthGames).length;
  const youthProgress=youngsters.slice(0,offer.youthCount).reduce((sum,p)=>sum+Math.min(p.games,offer.youthGames),0)/Math.max(1,offer.youthCount*offer.youthGames);
  const wages=annualWageCost(),cash=state.money;
  const finances=wages<=offer.wageLimit&&cash>=offer.cashFloor;
  return careerGoalDefinitions(offer).map(g=>{
    const met=g.id==='league'?played>0&&position<=offer.place:g.id==='youth'?qualified>=offer.youthCount:finances;
    const progress=g.id==='league'?(played?Math.min(1,offer.place/position):0):g.id==='youth'?youthProgress:((wages<=offer.wageLimit?1:offer.wageLimit/Math.max(1,wages))+(cash>=offer.cashFloor?1:Math.max(0,cash)/Math.max(1,offer.cashFloor)))/2;
    const detail=g.id==='league'?(played?`Plats ${position} · ${played} av ${total} matcher`:'Säsongen har inte börjat'):g.id==='youth'?`${qualified} av ${offer.youthCount} spelare klara · ${offer.youthGames} matcher per spelare`:`Löner ${careerMoney(wages)} / ${careerMoney(offer.wageLimit)} · Kassa ${careerMoney(cash)}`;
    const status=ended?(met?'Uppnått':'Ej uppnått'):g.id==='league'&&!played?'Ej bedömt':g.id==='youth'?(met?'Uppnått':'Pågår'):met?'På rätt väg':'Behöver förbättras';
    return {...g,progress,detail,status,met,ended};
  });
}
function boardGoalsHTML(goals,tracked=false){return `<div class="board-goals">${goals.map((g,i)=>`<article class="board-goal"><div class="board-goal-number">0${i+1}</div><div class="board-goal-body"><div class="board-goal-meta"><span>${g.category}</span><span>${g.priority}</span></div><h3>${g.title}</h3><p>${g.text}</p>${tracked?`<div class="goal-status ${g.met?'goal-positive':''}"><strong>${g.status}</strong><span>${g.detail}</span></div><progress max="1" value="${g.progress}" aria-label="Utveckling mot målet: ${g.title}"></progress>`:''}</div></article>`).join('')}</div>`;}
function boardView(){
  const goals=boardProgress(),c=careerIdentity(managerClub());
  const youngsters=Object.values(state.boardPlan.youthAppearances).sort((a,b)=>b.games-a.games);
  return `<section class="board-page"><header class="career-page-heading"><div><span class="career-eyebrow">KLUBBLEDNING · 2026/27</span><h1>Styrelsens uppdrag</h1><p>Det här kom ni överens om. Resultat och ekonomi utvärderas vid grundseriens slut.</p></div>${careerBadge(managerClub(),'large')}</header><div class="board-letter"><span class="career-eyebrow">FRÅN STYRELSERUMMET</span><h2>${c.title}</h2><p>”${c.pitch}”</p><span class="letter-signature">Styrelsen · ${managerClub()}</span></div>${boardGoalsHTML(goals,true)}<section class="board-youth"><h2>Talanger som fått förtroende</h2><p>En match räknas först vid minst fem minuters registrerad istid, även i powerplay och boxplay.</p>${youngsters.length?youngsters.map(p=>`<div class="row"><span>${p.name}</span><strong>${p.games} / ${state.boardPlan.offer.youthGames} matcher</strong></div>`).join(''):'<p class="muted">Ingen spelare har nått fem minuters istid i en avslutad match ännu.</p>'}</section></section>`;
}
function boardOverview(){
  const goals=boardProgress();
  return `<section class="board-overview"><div><span class="career-eyebrow">DITT UPPDRAG</span><h2>Styrelsen följer ditt arbete</h2></div><div class="board-overview-goals">${goals.map(g=>`<div><span>${g.category}</span><strong>${g.status}</strong></div>`).join('')}</div><button class="btn secondary" onclick="state.page='board';render()">Se styrelsens mål →</button></section>`;
}
function beginCareerSelection(){
  if(state.live?.running)pauseMatch();
  careerDraft=newState();careerChoice=managerClub();careerFilter='all';careerScreen='select';careerMessage='';render();
}
function chooseCareerClub(name){if(!CLUB_DATA[name])return;const offset=document.querySelector('.career-club-grid')?.scrollLeft||0;careerChoice=name;render();const grid=document.querySelector('.career-club-grid');if(grid)grid.scrollLeft=offset;}
function setCareerFilter(value){if(!['all','title','playoff','build'].includes(value))return;careerFilter=value;if(value!=='all'&&careerIdentity(careerChoice).group!==value)careerChoice=Object.keys(CLUB_DATA).find(name=>careerIdentity(name).group===value);render();}
function showCareerMenu(){if(state.live?.running)pauseMatch();careerScreen='menu';careerMessage='';render();}
function resumeCareer(){if(!state.careerStarted)return;careerScreen=null;if(['clubSelect','menu'].includes(state.page))state.page='home';render();}
function careerReview(){if(!careerDraft||!CLUB_DATA[careerChoice])return;careerScreen='review';render();}
function acceptCareer(){
  if(careerScreen!=='review'||!careerDraft||!CLUB_DATA[careerChoice])return;
  if(state.careerStarted){
    try{localStorage.setItem(PREVIOUS_CAREER_KEY,JSON.stringify(state));}
    catch{careerMessage='Det gick inte att bevara din nuvarande karriär. Frigör utrymme i webbläsaren och försök igen.';render();return;}
  }
  startCareerWithClub(careerChoice);
}
function previousCareer(){
  try{
    const previous=JSON.parse(localStorage.getItem(PREVIOUS_CAREER_KEY));
    if(!previous||previous.version!=='0.2'||!previous.clubRosters||!CLUB_DATA[previous.managerClub])return;
    if(state.live?.running)pauseMatch();
    const current=JSON.stringify(state);
    localStorage.setItem(CAREER_SAVE_KEY,JSON.stringify(previous));
    localStorage.setItem(PREVIOUS_CAREER_KEY,current);
    state=previous;state.careerStarted=true;if(state.live)state.live.running=false;
    syncManagerRoster();ensureManagementData();careerDraft=null;careerScreen=null;state.page='home';save();render();
  }catch{careerMessage='Den föregående karriären kunde inte öppnas. Din nuvarande karriär är kvar.';render();}
}
function previousCareerName(){try{const p=JSON.parse(localStorage.getItem(PREVIOUS_CAREER_KEY));return p?.careerStarted&&CLUB_DATA[p.managerClub]?p.managerClub:null;}catch{return null;}}
function careerHeader(step=''){return `<header class="career-top"><button class="career-wordmark" onclick="showCareerMenu()" aria-label="Hockey Manager huvudmeny"><b>HM<span>26</span></b><span>HOCKEY<br>MANAGER</span></button>${step?`<nav class="career-steps" aria-label="Karriärstart"><span class="${step==='select'?'current':''}">01 <b>Välj klubb</b></span><span class="${step==='review'?'current':''}">02 <b>Ditt uppdrag</b></span></nav>`:'<span class="career-season">SÄSONG 2026/27</span>'}${step?'<button class="career-text-button" onclick="showCareerMenu()">Till huvudmenyn</button>':''}</header>`;}
function careerMenuView(){
  const previous=previousCareerName();
  return `<section class="career-menu">${careerHeader()}<div class="career-menu-body"><div class="career-menu-copy"><span class="career-eyebrow">SVENSK HOCKEY. DITT NÄSTA KAPITEL.</span><h1>DITT LAG.<br>DINA <em>BESLUT.</em></h1><p>Från första laguttagningen till den sista slutsignalen. Bygg laget du tror på.</p><div class="career-menu-actions">${state.careerStarted?`<button class="career-resume" onclick="resumeCareer()"><span><small>FORTSÄTT KARRIÄR</small><strong>${managerClub()}</strong><span>Omgång ${state.round} · ${state.live&&!state.live.finished?'Match pausad':'Klubbkontoret'}</span></span><b aria-hidden="true">↗</b></button>`:''}<button class="career-primary" onclick="beginCareerSelection()">Starta ny karriär <span aria-hidden="true">→</span></button>${previous?`<button class="career-text-button previous-career" onclick="previousCareer()">Öppna föregående karriär · ${previous}</button>`:''}</div>${careerMessage?`<p role="alert">${careerMessage}</p>`:''}</div><div class="arena-caption"><span>01 / FÖRE NEDSLÄPP</span><p>Allt börjar<br>med ett beslut.</p></div></div><footer class="career-menu-footer"><span>14 KLUBBAR <i>•</i> 52 OMGÅNGAR <i>•</i> DIN IDENTITET</span><span>HOCKEY MANAGER / ALPHA</span></footer></section>`;
}
function careerClubSelectView(){
  if(!careerDraft)careerDraft=newState();
  const offer=careerOffer(careerChoice,careerDraft.clubRosters);
  const clubs=Object.keys(CLUB_DATA).filter(name=>careerFilter==='all'||careerIdentity(name).group===careerFilter);
  return `<section class="career-selection">${careerHeader('select')}<div class="career-select-heading"><span class="career-eyebrow">ETT NYTT JOBB. ETT NYTT ANSVAR.</span><h1>Välj din klubb.</h1><p>Olika resurser. Olika förväntningar. Samma dröm om att vinna.</p></div><div class="career-selection-layout"><section class="career-club-list" aria-label="Tillgängliga klubbar"><div class="career-filters">${[['all','Alla klubbar'],['title','Titelstrid'],['playoff','Slutspel'],['build','Byggprojekt']].map(([id,label])=>`<button class="${careerFilter===id?'active':''}" aria-pressed="${careerFilter===id}" onclick="setCareerFilter('${id}')">${label}</button>`).join('')}</div><div class="career-club-grid">${clubs.map(name=>{const c=careerIdentity(name);return `<button class="career-club-card ${name===careerChoice?'selected':''}" style="--club-color:${c.color}" aria-pressed="${name===careerChoice}" onclick="chooseCareerClub('${name}')">${careerBadge(name)}<span><strong>${name}</strong><small>${c.city}</small><span>${careerGroup(c.group)}</span></span><b class="club-selected-mark" aria-hidden="true">${name===careerChoice?'✓':'↗'}</b></button>`;}).join('')}</div></section><section class="career-club-brief" style="--club-color:${offer.color}" aria-label="Klubbens uppdrag"><div class="club-brief-hero"><div><span class="career-eyebrow">${offer.city.toUpperCase()} · SHL</span><h2>${offer.name}</h2><span class="career-tag">${careerGroup(offer.group)}</span></div>${careerBadge(offer.name,'large')}</div><div class="club-brief-content"><h3>${offer.title}</h3><p class="club-pitch">”${offer.pitch}”</p><div class="career-finances"><div><span>Klubbkassa vid start</span><strong>${careerMoney(offer.cash)}</strong></div><div><span>Lönebudget / år</span><strong>${careerMoney(offer.wageLimit)}</strong></div></div><div class="brief-section-title"><h3>Styrelsens förväntningar</h3><span>2026/27</span></div>${boardGoalsHTML(careerGoalDefinitions(offer))}<button class="career-primary" onclick="careerReview()">Möt styrelsen i ${offer.name} <span aria-hidden="true">→</span></button><p class="career-scenario-note">Klubbarnas mål och resurser är utformade för spelets karriärläge.</p></div></section></div></section>`;
}
function careerReviewView(){
  if(!careerDraft)return careerMenuView();
  const offer=careerOffer(careerChoice,careerDraft.clubRosters);
  return `<section class="career-review">${careerHeader('review')}<div class="career-contract"><div class="contract-heading"><div><span class="career-eyebrow">ERBJUDANDE OM HUVUDTRÄNARJOBBET</span><h1>Välkommen till<br>${offer.name}.</h1><p>Styrelsens uppdrag · säsongen 2026/27</p></div>${careerBadge(offer.name,'large')}</div><div class="board-letter"><span class="career-eyebrow">DET HÄR TROR VI PÅ</span><h2>${offer.title}</h2><p>”${offer.pitch}”</p><span class="letter-signature">Styrelsen · ${offer.name}</span></div>${boardGoalsHTML(careerGoalDefinitions(offer))}<div class="career-contract-footer"><p>${state.careerStarted?`Din karriär med ${managerClub()} bevaras som föregående karriär. Du kan öppna den från huvudmenyn.`:'När du accepterar börjar din första dag på klubbkontoret.'}</p><div><button class="career-text-button" onclick="careerScreen='select';render()">← Byt klubb</button><button class="career-primary" onclick="acceptCareer()">Acceptera uppdraget <span aria-hidden="true">→</span></button></div>${careerMessage?`<p role="alert">${careerMessage}</p>`:''}</div></div></section>`;
}
function applyCareerShell(){
  const shell=document.querySelector('.game-shell');
  shell?.classList.toggle('career-mode',Boolean(careerScreen));
  shell?.classList.toggle('mobile-nav-open',false);
  document.getElementById('mobileMenu')?.setAttribute?.('aria-expanded','false');
}
function toggleManagerMenu(){
  if(state.live?.running)pauseMatch();
  const shell=document.querySelector('.game-shell');
  const open=shell?.classList.toggle('mobile-nav-open');
  document.getElementById('mobileMenu')?.setAttribute?.('aria-expanded',String(Boolean(open)));
}
