"use strict";

// Live board confidence and in-season manager career layer.
// Loaded after manager.js and manager-life-2.js so legacy saves and the existing
// offseason job market remain the foundation of the career system.
(function installManagerCareerPressure(){
  if(typeof ensureManager!=='function'||globalThis.managerCareerPressureInstalled)return;
  globalThis.managerCareerPressureInstalled=true;

  const baseEnsureManager=ensureManager;
  const baseManagerCreateJobs=managerCreateJobs;
  const baseManagerJobWeek=managerJobWeek;
  const baseManagerInterview=managerInterview;
  const baseManagerInterviewAnswer=managerInterviewAnswer;
  const baseManagerAcceptJob=managerAcceptJob;
  const baseManagerView=managerView;
  const baseManagerLifeRisk=typeof managerLifeRisk==='function'?managerLifeRisk:null;

  ensureManager=function(){
    baseEnsureManager();const c=state.managerCareer;if(!c)return;
    c.version=Math.max(2,c.version||1);c.pressure??=null;c.confidenceHistory??=[];c.dismissedAt??=null;c.startGames??=team(managerClub())?.gp||0;
  };

  globalThis.managerPressureBand=function(value=state.managerCareer?.confidence??60){
    return value>=70?{key:'secure',label:'Trygg ställning',detail:'Styrelsen har högt förtroende för ditt arbete.'}:
      value>=50?{key:'stable',label:'Stabilt',detail:'Styrelsen följer utvecklingen men ditt jobb är inte hotat.'}:
      value>=30?{key:'pressure',label:'Under press',detail:'Resultat och verksamhet behöver förbättras.'}:
      value>=15?{key:'danger',label:'Jobbet är hotat',detail:'Styrelsen kräver en tydlig vändning inom kort.'}:
      {key:'critical',label:'Kritiskt',detail:'Styrelsen överväger att avsluta ditt uppdrag.'};
  };
  globalThis.managerRecentMatches=function(limit=5){
    return (state.analysis?.matches||[]).filter(m=>m.club===managerClub()&&!m.friendly&&!m.partial&&!m.abandoned&&Number.isFinite(m.own)&&Number.isFinite(m.against)).slice(0,limit);
  };
  globalThis.managerRecentForm=function(limit=5){
    const rows=managerRecentMatches(limit);if(!rows.length)return {score:50,wins:0,losses:0,games:0};
    let points=0,wins=0,losses=0;for(const m of rows){if(m.own>m.against){points+=3;wins++;}else if(m.own===m.against)points++;else losses++;}
    return {score:Math.round(points/(rows.length*3)*100),wins,losses,games:rows.length};
  };
  globalThis.managerSquadSupport=function(){
    const ps=managerRoster(),h=ps.length?ps.reduce((n,p)=>n+(p.happiness??70),0)/ps.length:65;
    return Math.round(trainingClamp(h*.7+(state.morale??65)*.3,0,100));
  };
  globalThis.managerUltimatumMatches=function(){
    const p=state.managerCareer?.pressure;if(!p?.active)return [];
    const all=(state.analysis?.matches||[]).filter(m=>m.club===p.club&&!m.friendly&&!m.partial&&!m.abandoned&&Number.isFinite(m.own)&&Number.isFinite(m.against));
    return all.slice(0,Math.max(0,all.length-p.startCount));
  };

  function regularJobMarket(){return state.season?.phase==='regular'&&!managerEmployed();}
  function runAsPreseason(fn){
    const phase=state.season.phase;state.season.phase='preseason';
    try{return fn();}finally{state.season.phase=phase;}
  }

  managerCreateJobs=function(){
    if(!regularJobMarket())return baseManagerCreateJobs();
    const before=new Set((state.managerCareer.jobs||[]).map(j=>j.id));
    runAsPreseason(()=>baseManagerCreateJobs());
    for(const j of state.managerCareer.jobs||[])if(!before.has(j.id))j.reason='Klubben gör en förändring under pågående säsong.';
  };
  managerJobWeek=function(){
    const c=state.managerCareer;if(c?.moveYear===clubYear())return managerNotify('Du har redan tillträtt ett nytt jobb den här säsongen.');
    if(!regularJobMarket())return baseManagerJobWeek();
    c.week++;managerCreateJobs();managerNotify(`Jobbmarknaden är uppdaterad. Den pågående säsongen och spelvärlden står kvar medan du söker nästa uppdrag.`);
  };
  managerInterview=function(id){
    if(!regularJobMarket())return baseManagerInterview(id);
    return runAsPreseason(()=>baseManagerInterview(id));
  };
  managerInterviewAnswer=function(answer){
    if(!regularJobMarket())return baseManagerInterviewAnswer(answer);
    return runAsPreseason(()=>baseManagerInterviewAnswer(answer));
  };
  managerAcceptJob=function(){
    if(!regularJobMarket())return baseManagerAcceptJob();
    const phase=state.season.phase,round=state.round,schedule=state.schedule;
    const result=runAsPreseason(()=>baseManagerAcceptJob());
    // The appointment changes employer, not the competition clock.
    state.season.phase=phase;state.round=round;state.schedule=schedule;
    if(managerEmployed()){
      const c=state.managerCareer;c.startGames=team(managerClub())?.gp||0;c.pressure=null;c.dismissedAt=null;
      c.message=`Välkommen till ${managerClub()}. Du tillträder direkt mitt under säsongen; tabell, omgångar, trupper och historik fortsätter utan omstart.`;
      save();render();
    }
    return result;
  };

  globalThis.managerDismiss=function(reason='Styrelsen bedömer att resultaten inte längre motiverar fortsatt förtroende.'){
    ensureManager();const c=state.managerCareer;if(!managerEmployed())return false;
    const club=managerClub();managerStoreClub();if(typeof aiStoreManagedAcademy==='function')aiStoreManagedAcademy(club);
    c.status='unemployed';c.decision='dismissed';c.dismissedAt=state.calendar?.date||null;c.pressure=null;c.moveYear=null;c.interview=null;c.jobs=[];
    c.history.unshift({year:clubYear(),club,kind:'departure',reason});c.history=c.history.slice(0,60);
    c.message=`${club} har avslutat ditt uppdrag. Din karriär fortsätter och jobbmarknaden är öppen.`;
    state.page='manager';managerCreateJobs();
    managerMessage(`manager-dismissed:${clubYear()}:${club}:${c.dismissedAt||'now'}`,'Du har fått sparken',`${reason}\nSlutligt styrelseförtroende: ${c.confidence}/100. Du kan söka ett nytt jobb och fortsätta samma karriär.`,'Din anställning',{link:'manager'});
    save();render();return true;
  };
  globalThis.managerAssessUltimatum=function(){
    const c=state.managerCareer,p=c?.pressure;if(!p?.active||p.club!==managerClub())return false;
    const rows=managerUltimatumMatches();let pts=0;for(const m of rows)pts+=m.own>m.against?3:m.own===m.against?1:0;
    p.points=pts;p.played=rows.length;
    if(c.confidence>=45){c.pressure=null;managerMessage(`manager-pressure-cleared:${clubYear()}:${managerClub()}`,'Styrelsen häver ultimatumet',`Förtroendet har återhämtats till ${c.confidence}/100. Styrelsen anser att utvecklingen har vänt.`,'Din anställning',{link:'manager'});return false;}
    if(rows.length>=p.matches&&pts<p.targetPoints){managerDismiss(`Styrelsens ultimatum misslyckades: ${pts} poäng på ${p.matches} matcher, kravet var ${p.targetPoints}.`);return true;}
    return false;
  };

  managerCheckIn=function(){
    ensureManager();const c=state.managerCareer;if(!managerEmployed()||state.season.phase!=='regular')return;
    if(managerAssessUltimatum()||!managerEmployed())return;
    const played=team(managerClub())?.gp||0,key=`${clubYear()}:${managerClub()}:${played}`;
    if(played-c.startGames<4||(played-c.startGames)%4!==0||c.lastReview===key)return;c.lastReview=key;
    const e=managerEvaluation(),form=managerRecentForm(5),support=managerSquadSupport(),target=Math.round(e.score*.55+form.score*.30+support*.15);
    const before=c.confidence,delta=trainingClamp(Math.round((target-before)*.34),-12,9);c.confidence=trainingClamp(before+delta,5,100);
    const band=managerPressureBand(c.confidence),previousBand=managerPressureBand(before);
    c.confidenceHistory.unshift({date:state.calendar?.date||null,year:clubYear(),club:managerClub(),played,confidence:c.confidence,delta,board:e.score,form:form.score,support});c.confidenceHistory=c.confidenceHistory.slice(0,40);
    let pressureText='';
    if(c.confidence<30&&!c.pressure&&played-c.startGames>=8){
      c.pressure={active:true,club:managerClub(),created:state.calendar?.date||null,startGames:played,startCount:(state.analysis?.matches||[]).filter(m=>m.club===managerClub()&&!m.friendly&&!m.partial&&!m.abandoned).length,matches:5,targetPoints:6,points:0,played:0};
      pressureText=' Styrelsen kräver minst 6 poäng på de kommande 5 spelbara ligamatcherna eller en tydlig återhämtning i förtroendet.';
    }
    if(c.pressure?.active)managerAssessUltimatum();
    if(c.confidence<15&&played-c.startGames>=12){managerDismiss(`Förtroendet har fallit till en kritisk nivå efter ${played-c.startGames} matcher i uppdragets aktuella period. ${e.explanation}`);return;}
    const warning=c.confidence<50,title=c.confidence<30?'Styrelsen ställer ultimatum':warning?'Styrelsen kräver förbättring':c.confidence>=75?'Styrelsen uppskattar ditt arbete':'Avstämning med styrelsen';
    const changeText=delta===0?'oförändrat':`${delta>0?'+':''}${delta}`;
    const text=`${e.explanation}\nForm senaste ${form.games} matcher: ${form.wins} segrar, ${form.losses} förluster. Truppstöd: ${support}/100.\nFörtroende: ${c.confidence}/100 (${changeText}) · ${band.label}.${pressureText}`;
    c.reviews.unshift({key,year:clubYear(),club:managerClub(),confidence:c.confidence,title,text});c.reviews=c.reviews.slice(0,24);
    if(previousBand.key!==band.key||warning||Math.abs(delta)>=5)managerMessage(`manager:${key}`,title,text,'Din anställning',{link:'manager'});
  };

  managerView=function(){
    ensureManager();const realPhase=state.season.phase,emulateRegularMarket=regularJobMarket();
    if(emulateRegularMarket)state.season.phase='preseason';
    let html;try{html=baseManagerView();}finally{state.season.phase=realPhase;}
    const c=state.managerCareer,band=managerPressureBand(c.confidence);
    html=html.replace(`<progress max="100" value="${c.confidence}" aria-label="Styrelseförtroende"></progress>`,`<progress max="100" value="${c.confidence}" aria-label="Styrelseförtroende"></progress><p>${band.label} · ${band.detail}</p>`);
    html=html.replace('Avstämning sker var åttonde grundseriematch. Två säsonger i följd med förtroende under 45 kan avsluta uppdraget. Ett svagt slutår kan också innebära utebliven förlängning. Beslut får effekt vid försäsongen.',`Avstämning sker var fjärde grundseriematch. Resultatmål, de fem senaste matcherna, ekonomi, talangutveckling och truppstöd formar förtroendet. Under 30 kan styrelsen ställa ett femmatchersultimatum; under 15 kan uppdraget avslutas direkt.${c.pressure?.active?`</p><p class="manager-warning">Ultimatum: ${c.pressure.points||0}/${c.pressure.targetPoints} poäng efter ${c.pressure.played||0}/${c.pressure.matches} matcher.`:''}`);
    html=html.replace('Första avstämningen kommer efter åtta nya grundseriematcher.','Första avstämningen kommer efter fyra nya grundseriematcher.');
    if(emulateRegularMarket){
      html=html.replace('Nästa jobbvecka','Uppdatera jobbmarknaden').replace('Intervjua klubben och granska trupp, resurser och förväntningar före beslutet. Ett klubbyte per försäsong.','Intervjua klubben och granska trupp, resurser och förväntningar före beslutet. Världen och den pågående säsongen bevaras vid ett klubbyte.');
    }
    return html;
  };

  if(baseManagerLifeRisk)managerLifeRisk=function(){
    ensureManager();const c=state.managerCareer,band=managerPressureBand(c.confidence);
    if(managerEmployed()&&c.confidence<50)return {label:'Styrelsens förtroende',value:`${c.confidence}/100 · ${band.label}`,detail:c.pressure?.active?`Ultimatum: ${c.pressure.points||0}/${c.pressure.targetPoints} poäng efter ${c.pressure.played||0}/${c.pressure.matches} matcher. Din anställning är dagens viktigaste risk.`:`${band.detail} Nästa styrelseavstämning påverkas av resultat, ekonomi, talangutveckling, form och truppstöd.`,action:{page:'manager'},button:'Min karriär'};
    return baseManagerLifeRisk();
  };
})();
