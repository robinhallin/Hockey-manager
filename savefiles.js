"use strict";
let saveFileNotice='',saveFilePreview=null;
function showSaveFiles(){if(state.live?.running)pauseMatch();careerScreen='files';render();}
function saveExportText(){
 if(state.live?.running)pauseMatch();
 return JSON.stringify({format:'hockey-manager-career',formatVersion:1,exportedAt:new Date().toISOString(),career:state},null,0);
}
function downloadCareer(){
 try{
  const blob=new Blob([saveExportText()],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=`hockey-manager-${managerClub().replace(/[^a-z0-9]/gi,'-')}-${state.season.year}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
  saveFileNotice='Sparfilen är skapad. Spara den i Filer på mobilen eller på datorn.';
 }catch{saveFileNotice='Kunde inte skapa filen. Försök igen med spelet öppet i Safari eller Chrome.';}
 render();
}
function validateSaveText(text){
 if(typeof text!=='string'||text.length>8000000)throw Error('Filen är för stor. Gränsen är 8 MB.');
 const data=JSON.parse(text),s=data.format==='hockey-manager-career'?data.career:data;
 if(data.format&&data.formatVersion!==1)throw Error('Sparfilens formatversion stöds inte.');
 if(!s||s.version!=='0.2'||s.careerStarted!==true||!CLUB_DATA[s.managerClub]||!s.clubRosters||!Array.isArray(s.clubRosters[s.managerClub])||!Array.isArray(s.schedule)||!Array.isArray(s.teams)||!Number.isInteger(s.round)||s.round<1||!Number.isFinite(s.money))throw Error('Filen innehåller ingen giltig Hockey Manager-karriär.');
 const walk=(value,depth=0)=>{
  if(depth>70)throw Error('Sparfilens struktur är för djup.');
  if(typeof value==='number'&&!Number.isFinite(value))throw Error('Ogiltiga tal i sparfilen.');
  if(typeof value==='string'&&(/<\s*[!a-z/]/i.test(value)||value.length>200000))throw Error('Ogiltigt textinnehåll i sparfilen.');
  if(value&&typeof value==='object')for(const [k,v] of Object.entries(value)){if(/^(id|playerId|selectedPlayer|selectedMarketPlayer|personId)$/.test(k)&&typeof v==='string'&&!/^[-\p{L}\p{N} _.:/]+$/u.test(v))throw Error('Ogiltig identitet i sparfilen.');if(['__proto__','prototype','constructor'].includes(k))throw Error('Ogiltig struktur i sparfilen.');walk(v,depth+1);}
 };
 walk(s);
 const ids=new Set();
 for(const [club,roster] of [...Object.entries(s.clubRosters),...(s.playerWorld?[[WORLD_FREE,s.playerWorld.freeAgents]]:[])]){
  if(!/^[\p{L}\p{N} .&/-]+$/u.test(club)||!Array.isArray(roster)||roster.length>(club===WORLD_FREE?1000:200))throw Error('Ogiltig klubb eller trupp.');
  for(const p of roster){
   if(!p||!['MV','B','C','VF','HF','F'].includes(p.pos)||typeof p.name!=='string'||!Number.isFinite(p.age)||p.age<10||p.age>100||!Number.isFinite(p.salary)||p.salary<0||!Number.isInteger(p.contractYears)||!/^[-\p{L}\p{N} _.:/]+$/u.test(String(p.id))||ids.has(String(p.id)))throw Error('Spelardata eller spelaridentiteter är felaktiga.');
   if(p.attributes&&Object.values(p.attributes).some(n=>!Number.isFinite(n)||n<1||n>20))throw Error('Ogiltiga attribut.');
   ids.add(String(p.id));
  }
 }
 if(s.training&&(!Array.isArray(s.training.plan)||s.training.plan.some(p=>!p||!TRAINING_SESSIONS[p.type]||!['light','normal','hard'].includes(p.intensity))||!Array.isArray(s.training.messages)||!Array.isArray(s.training.history)||!Number.isInteger(s.training.day)||s.training.day<0))throw Error('Träningsplanen är felaktig.');
 if(s.season&&!['regular','playoffs','review','preseason'].includes(s.season.phase))throw Error('Ogiltig säsongsfas.');
 for(const g of s.schedule)if(!Number.isInteger(g.round)||g.round<1||!s.clubRosters[g.home]||!s.clubRosters[g.away])throw Error('Spelschemat är felaktigt.');
 if(s.calendar&&(!/^\d{4}-\d{2}-\d{2}$/.test(s.calendar.date)||!Number.isFinite(Date.parse(s.calendar.date))))throw Error('Ogiltigt kalenderdatum.');
 if(s.live)s.live.running=false;
 return s;
}
async function readCareerFile(file){
 saveFilePreview=null;
 try{if(!file) return;if(file.size>8000000)throw Error('Filen är större än 8 MB.');saveFilePreview=validateSaveText(await file.text());saveFileNotice='Kontrollera karriären nedan innan du läser in den.';}
 catch(e){saveFileNotice='Kunde inte läsa filen: '+e.message;}
 render();
}
function applyCareerImport(){
 if(!saveFilePreview)return;
 const old=state,oldScreen=careerScreen;
 const oldRaw=localStorage.getItem(CAREER_SAVE_KEY),oldBackup=localStorage.getItem(PREVIOUS_CAREER_KEY);
 try{
  if(state.live?.running)pauseMatch();
  state=saveFilePreview;syncManagerRoster();ensureManagementData();ensureSeason();ensureAssessmentData();ensureLeagues();ensureRecruitment();ensureCalendar();ensureTrainingData();ensureLocker();ensureMedical();ensureJuniors();ensureClub();ensureManager();
  // Validate the primary views before replacing the device's active save.
  state.page='settings';saveSettingsView();calendarView();
  const encoded=JSON.stringify(state);
  if(old.careerStarted)localStorage.setItem(PREVIOUS_CAREER_KEY,JSON.stringify(old));
  try{localStorage.setItem(CAREER_SAVE_KEY,encoded);}catch(error){if(oldBackup!==null)localStorage.setItem(PREVIOUS_CAREER_KEY,oldBackup);else localStorage.removeItem(PREVIOUS_CAREER_KEY);throw error;}
  careerScreen=null;careerDraft=null;saveFilePreview=null;saveFileNotice='Karriären är inläst.'+(old.careerStarted?' Din tidigare karriär finns kvar som föregående sparning i huvudmenyn.':'');render();
 }catch(e){state=old;careerScreen=oldScreen;saveFileNotice='Importen avbröts. Din nuvarande karriär behålls. '+e.message;saveFilePreview=null;try{if(oldRaw!==null)localStorage.setItem(CAREER_SAVE_KEY,oldRaw);}catch{}render();}
}
function saveSettingsView(){
 return `<section class="calendar-page"><button class="btn secondary" onclick="showCareerMenu()">Till huvudmenyn</button><header class="daily-heading"><div><span class="career-eyebrow">DIN KARRIÄR</span><h1>Sparfiler & inställningar</h1><p>Spelet sparas automatiskt i den här webbläsaren. En exporterad fil fungerar som säkerhetskopia och kan flyttas mellan mobilen och datorn.</p></div></header><div class="calendar-save-grid"><section><h2>Säkerhetskopiera</h2><p>${trainingSafe(managerClub())} · ${seasonLabel()}${state.calendar?` · ${calText(state.calendar.date)}`:''}</p><button class="btn" ${state.careerStarted?'':'disabled'} onclick="downloadCareer()">Exportera sparfil</button><p>På iPhone sparar du JSON-filen i Filer. Öppna sedan spelet på den andra enheten och välj filen där.</p></section><section><h2>Läs in en karriär</h2><label>Välj sparfil<input type="file" accept=".json,application/json" onchange="readCareerFile(this.files[0])"></label><p>Importen ersätter den aktiva karriären efter din granskning. Nuvarande karriär sparas som föregående karriär.</p>${saveFilePreview?`<div class="calendar-import"><strong>${trainingSafe(saveFilePreview.managerClub)} · ${saveFilePreview.season?.year||2026}</strong><p>Omgång ${saveFilePreview.round} · ${careerMoney(saveFilePreview.money)}</p><button class="btn" onclick="applyCareerImport()">Läs in denna karriär</button><button class="btn secondary" onclick="saveFilePreview=null;render()">Avbryt</button></div>`:''}</section></div>${saveFileNotice?`<p role="status">${trainingSafe(saveFileNotice)}</p>`:''}</section>`;
}
