'use strict';
const HOCKEY_BETA_VERSION='0.1.0-beta.8';
const betaErrors=[];
const betaFeedback={steps:'',expected:'',actual:''};
let betaOrigin=null,betaIntroOpen=false;
function betaCaptureContext(){
 if(state.page==='settings'||careerScreen==='files')return;
 betaOrigin={page:state.page,room:typeof clubhouseUI==='undefined'?null:clubhouseUI.room,station:typeof clubhouseRoomsUI==='undefined'?null:clubhouseRoomsUI.station,date:state.calendar?.date};
}
function betaFeedbackSet(key,value){if(Object.hasOwn(betaFeedback,key))betaFeedback[key]=String(value).slice(0,4000);}
function betaBuild(){return globalThis.HOCKEY_BUILD||{version:HOCKEY_BETA_VERSION,revision:'development'};}
const desktopBridge=()=>typeof window!=='undefined'?window.hockeyDesktop:null;
function betaDownload(text,name,type='application/json') {
 const url=URL.createObjectURL(new Blob([text],{type})), a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function betaPerformanceReport(){
 const names=['render','save','nextDay','nextDayAborted','aiMarket','autosaveSnapshot','autosaveSerialize','autosavePack','autosaveWrite'];
 return {unit:'ms',sampleWindow:30,metrics:Object.fromEntries(names.map(name=>[name,performanceSummary(name)]))};
}
function betaReportText() {
 return JSON.stringify({game:'Hockey Manager',version:HOCKEY_BETA_VERSION,build:betaBuild().revision,platform:desktopBridge()?'desktop':'browser',reportedAt:new Date().toISOString(),club:managerClub(),date:state.calendar?.date,page:state.page,context:betaOrigin,viewport:typeof window==='undefined'?null:{width:window.innerWidth,height:window.innerHeight,scale:window.devicePixelRatio},round:state.round,season:state.season?.year,match:state.live?{finished:!!state.live.finished,running:!!state.live.running}:null,saveFailed:careerSaveError,loadFailed:!!careerLoadIssue,performance:betaPerformanceReport(),errors:betaErrors,...betaFeedback},null,2);
}
function downloadBetaReport(){betaDownload(betaReportText(),'Hockey-Manager-'+HOCKEY_BETA_VERSION+'-felrapport.json');}
function betaFirstWeekOpen(){betaIntroOpen=true;if(clubhouseAvailable())clubhouseOpen('settings');else showSaveFiles();const guide=document.getElementById('beta-first-week');guide?.scrollIntoView({block:'start'});guide?.focus({preventScroll:true});}
function betaFirstWeekView(){
 const year=state.season?.year,date=state.calendar?.date,key='beta-first-week:'+managerClub()+':'+year;
 if(!state.careerStarted||!date||date<year+'-08-01'||date>year+'-08-08'||clubhousePreference(key,'show')==='hidden')return '';
 return `<section id="beta-first-week" tabindex="-1" class="beta-first-week" aria-label="Kom igång med din första vecka"><span class="coach-meta">DIN FÖRSTA VECKA</span><h2>Från laguttagning till uppföljning</h2><p>En kort väg genom spelet. Du väljer själv när du är klar; att öppna en vy ändrar inte laget.</p><ol><li><button class="btn secondary" onclick="deskNavigate('lines')">1. Kontrollera kedjor & matchplan →</button><p>Kontrollera spelklara spelare, målvakt och special teams.</p></li><li><button class="coach-link" onclick="deskNavigate('training')">2. Planera träningen →</button><p>Väg utveckling mot återhämtning inför nästa match.</p></li><li><button class="coach-link" onclick="deskNavigate('calendar')">3. Se vägen till första matchen →</button><p>Avsluta dagen för att föra kalendern framåt. Svara först på ärenden som kräver besked.</p></li><li><button class="coach-link" onclick="deskNavigate('match')">4. Följ upp matchen →</button><p>Efter slutsignalen: läs rapporten, granska istid och välj vad ni ska arbeta vidare med.</p></li></ol><button class="coach-link" onclick="betaFirstWeekDismiss()">Dölj introduktionen</button><p>Spelguiden finns alltid under Sparfiler & inställningar (F1 på Windows).</p></section>`;
}
function betaFirstWeekDismiss(){clubhouseRemember('beta-first-week:'+managerClub()+':'+state.season.year,'hidden');render();}
function betaBackupPreview(id) {
 saveFilePreview=null;
 try{saveFilePreview=validateSaveText(desktopBridge().readBackup(id));saveFileNotice='Säkerhetskopian är läst. Kontrollera klubb och omgång, välj sedan Läs in denna karriär.';}
 catch(error){saveFileNotice='Säkerhetskopian kunde inte läsas: '+error.message;}
 render();
}
async function betaOpenSaveFolder(){const error=await desktopBridge().openSaveFolder();if(error){saveFileNotice='Sparmappen kunde inte öppnas: '+error;render();}}
function betaSupportView() {
 let backups=[],backupError='';
 if(desktopBridge())try{backups=desktopBridge().backups();}catch(error){backupError=error.message;}
 return `<section class="beta-support"><h2>Hockey Manager · Beta ${HOCKEY_BETA_VERSION}</h2>${betaIntroOpen?betaFirstWeekView():''}<p>Bygge: <code>${trainingSafe(betaBuild().revision)}</code></p><p>Desktopbeta för SHL, Hockeyallsvenskan och en separat schweizisk National League-karriär. Nya karriärers trupper är daterade 23 september 2026. Befintliga karriärer behåller sin spelvärld.</p>
 <details><summary>Spelguide – din första vecka</summary><ol><li>Välj klubb och läs styrelsens uppdrag. Kassa och lönebudget är olika begränsningar.</li><li>På kontoret ser du dagens program, nästa match och aktuella frågor. Rumsmenyn leder till resten av klubben. Klicka på en spelare för att granska roll, form och tillgänglighet.</li><li>Gå till Taktik och öppna taktiktavlan: välj spelare till platserna och kontrollera skador och belastning. Egna spelares attribut är kända; externa spelare behöver scoutas.</li><li>Gå till Utveckling och anpassa träningen till matchschemat. Hårdare träning kostar återhämtning; vila ger ingen garanterad formtopp.</li><li>Avsluta dagen/Fortsätt driver kalendern framåt. Inför matchen kan du ändra laguttagning och taktik. Pausa matchen när du behöver fatta beslut.</li><li>Följ upp matchrapport, istid och belastning innan du ändrar igen. En enskild match räcker sällan för att bedöma en spelare.</li></ol><p>${desktopBridge()?'F1 öppnar den här sidan och pausar en pågående match. Ctrl+S sparar. F11 växlar helskärm. Ctrl+0 återställer zoom.':'Sparfiler & inställningar finns i sidomenyn.'}</p></details>
 <details><summary>Flytta din befintliga karriär till Windows-betan</summary><ol><li>Öppna det tidigare spelet i samma webbläsare där du spelat.</li><li>Välj Sparfiler & inställningar → Exportera sparfil.</li><li>Välj JSON-filen under Läs in en karriär här. Granska klubben och bekräfta importen.</li></ol><p>Originalet i webbläsaren finns kvar. Återupptagna matcher startar pausade.</p></details>
 ${desktopBridge()?`<details><summary>Återställ en automatisk säkerhetskopia</summary><p>Den senaste föregående sparningen och upp till fem äldre kontrollpunkter per sparplats behålls. Kontrollpunkter tas vid första ändringen efter start och därefter högst var tionde minut. Välj och granska innan du ersätter karriären.</p><button class="btn secondary" onclick="betaOpenSaveFolder()">Öppna sparmappen</button>${backupError?`<p role="alert">${trainingSafe(backupError)}</p>`:backups.length?`<ul>${backups.map(b=>`<li>${trainingSafe(b.club)} · ${trainingSafe(b.date)} · omgång ${b.round} · sparad ${trainingSafe(b.savedAt)} <button class="btn secondary" onclick="betaBackupPreview('${haEscape(b.id)}')">Granska säkerhetskopia</button></li>`).join('')}</ul>`:'<p>Inga säkerhetskopior ännu. De skapas när en tidigare sparning ersätts.</p>'}</details>`:''}
 <details><summary>Rapportera ett problem</summary><p>Beskriv problemet nedan och exportera rapporten. Öppna sedan <a href="https://github.com/robinhallin/Hockey-manager/issues/new?template=beta-bug.yml" target="_blank" rel="noopener noreferrer">betans felrapportering på GitHub</a> (konto krävs) och bifoga filen. Rapporteringen är offentlig: dela inte personuppgifter. Sparfil delas bara om du själv väljer det. Inget skickas automatiskt.</p><div class="beta-feedback">${Object.entries({steps:"Så återskapar du problemet",expected:"Förväntat resultat",actual:"Vad hände i stället?"}).map(([key,label])=>`<label>${label}<textarea rows="3" maxlength="4000" oninput="betaFeedbackSet(\'${key}\',this.value)">${trainingSafe(betaFeedback[key])}</textarea></label>`).join('')}</div><button class="btn secondary" onclick="downloadBetaReport()">Exportera felrapport</button><p>Rapporten innehåller betaversion, exakt bygge, klubb, speldatum, ursprunglig vy/rum/station, skärmstorlek, dina beskrivningar, registrerade fel och sammanfattade prestandamätningar. Den innehåller inte spelarvärden eller din fullständiga sparfil.</p></details>
 <details><summary>Betans omfattning och begränsningar</summary><p>Spelbara karriärer finns i de 28 svenska seniorklubbarna och i en separat schweizisk National League med 14 klubbar. ${swissRulesText()} Tjeckien och Finland är förberedda datapaket och ännu inte spelbara ligor. Spelschemat är simulerat och attribut, ekonomi och utvecklingsprognoser är spelmodeller. Juniorer och den nordamerikanska spelvärlden är inte en fullständigt verifierad verklig truppdatabas. Balans och spelglädje behöver återkoppling från provspelning.</p><p>Windows-paketet är avsett för 64-bitars Windows 10/11. Den första privata betan saknar kodsignering och automatisk uppdatering. Installera kommande version över den gamla; sparmappen ligger separat. Exportera gärna en egen kopia före uppdatering.</p></details></section>`;
}
if(typeof window!=='undefined') {
 window.addEventListener?.('error',event=>{betaErrors.push({type:'script',file:String(event.filename||'').split('/').pop(),line:event.lineno||0});if(betaErrors.length>10)betaErrors.shift();});
 window.addEventListener?.('unhandledrejection',()=>{betaErrors.push({type:'promise'});if(betaErrors.length>10)betaErrors.shift();});
 desktopBridge()?.onClose(()=>{
   let ok=false;
   try{if(state.live?.running)pauseMatch();ok=careerLoadIssue?false:!state.careerStarted||save();}catch{ok=false;}
   desktopBridge().closeReady(ok);
 });
}
