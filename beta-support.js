'use strict';
const HOCKEY_BETA_VERSION='0.1.0-beta.1';
const betaErrors=[];
const desktopBridge=()=>typeof window!=='undefined'?window.hockeyDesktop:null;
function betaDownload(text,name,type='application/json') {
 const url=URL.createObjectURL(new Blob([text],{type})), a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function betaReportText() {
 return JSON.stringify({game:'Hockey Manager',version:HOCKEY_BETA_VERSION,platform:desktopBridge()?'desktop':'browser',reportedAt:new Date().toISOString(),club:managerClub(),date:state.calendar?.date,page:state.page,round:state.round,season:state.season?.year,match:state.live?{finished:!!state.live.finished,running:!!state.live.running}:null,saveFailed:careerSaveError,loadFailed:!!careerLoadIssue,errors:betaErrors,steps:'Beskriv vad du gjorde, vad du förväntade dig och vad som hände.'},null,2);
}
function downloadBetaReport(){betaDownload(betaReportText(),'Hockey-Manager-'+HOCKEY_BETA_VERSION+'-felrapport.json');}
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
 return `<section class="beta-support"><h2>Hockey Manager · Beta ${HOCKEY_BETA_VERSION}</h2><p>Desktopbeta för SHL och Hockeyallsvenskan. Nya karriärers trupper är daterade 23 september 2026. Befintliga karriärer behåller sin spelvärld.</p>
 <details><summary>Spelguide – din första vecka</summary><ol><li>Välj klubb och läs styrelsens uppdrag. Kassa och lönebudget är olika begränsningar.</li><li>På översikten ser du nästa match och aktuella frågor. Klicka på en spelare för att granska roll, form och tillgänglighet.</li><li>Öppna Trupp och kedjor: välj spelare till platserna och kontrollera skador och belastning. Egna spelares attribut är kända; externa spelare behöver scoutas.</li><li>Anpassa träningen till matchschemat. Hårdare träning kostar återhämtning; vila ger ingen garanterad formtopp.</li><li>Fortsätt driver kalendern framåt. Inför matchen kan du ändra laguttagning och taktik. Pausa matchen när du behöver fatta beslut.</li><li>Följ upp matchrapport, istid och belastning innan du ändrar igen. En enskild match räcker sällan för att bedöma en spelare.</li></ol><p>${desktopBridge()?'F1 öppnar den här sidan och pausar en pågående match. Ctrl+S sparar. F11 växlar helskärm. Ctrl+0 återställer zoom.':'Sparfiler & inställningar finns i sidomenyn.'}</p></details>
 <details><summary>Flytta din befintliga karriär till Windows-betan</summary><ol><li>Öppna det tidigare spelet i samma webbläsare där du spelat.</li><li>Välj Sparfiler & inställningar → Exportera sparfil.</li><li>Välj JSON-filen under Läs in en karriär här. Granska klubben och bekräfta importen.</li></ol><p>Originalet i webbläsaren finns kvar. Återupptagna matcher startar pausade.</p></details>
 ${desktopBridge()?`<details><summary>Återställ en automatisk säkerhetskopia</summary><p>Den senaste föregående sparningen och upp till fem äldre kontrollpunkter per sparplats behålls. Kontrollpunkter tas vid första ändringen efter start och därefter högst var tionde minut. Välj och granska innan du ersätter karriären.</p><button class="btn secondary" onclick="betaOpenSaveFolder()">Öppna sparmappen</button>${backupError?`<p role="alert">${trainingSafe(backupError)}</p>`:backups.length?`<ul>${backups.map(b=>`<li>${trainingSafe(b.club)} · ${trainingSafe(b.date)} · omgång ${b.round} · sparad ${trainingSafe(b.savedAt)} <button class="btn secondary" onclick="betaBackupPreview('${haEscape(b.id)}')">Granska säkerhetskopia</button></li>`).join('')}</ul>`:'<p>Inga säkerhetskopior ännu. De skapas när en tidigare sparning ersätts.</p>'}</details>`:''}
 <details><summary>Rapportera ett problem</summary><p>Skriv stegen som utlöste problemet, vad du förväntade dig och vad som hände. Bifoga gärna en skärmbild och den här felrapporten till projektägaren. Vid problem i en viss karriär kan du även exportera sparfilen separat. Inget skickas automatiskt.</p><button class="btn secondary" onclick="downloadBetaReport()">Exportera felrapport</button><p>Rapporten innehåller betaversion, klubb, speldatum, aktuell vy och registrerade fel. Den innehåller inte spelarvärden eller din fullständiga sparfil.</p></details>
 <details><summary>Betans omfattning och begränsningar</summary><p>Fokus är befintliga karriärer i de 28 svenska seniorklubbarna. Spelschemat är simulerat och attribut, ekonomi och utvecklingsprognoser är spelmodeller. Juniorer och den nordamerikanska spelvärlden är inte en fullständigt verifierad verklig truppdatabas. Balans och spelglädje behöver återkoppling från provspelning.</p><p>Windows-paketet är avsett för 64-bitars Windows 10/11. Den första privata betan saknar kodsignering och automatisk uppdatering. Installera kommande version över den gamla; sparmappen ligger separat. Exportera gärna en egen kopia före uppdatering.</p></details></section>`;
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
