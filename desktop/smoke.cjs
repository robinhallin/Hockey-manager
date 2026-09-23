'use strict';
// Runs against the actual Electron app, or an NSIS-installed executable in CI.
const {_electron:electron}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {spawnSync}=require('node:child_process');
const out=path.join(__dirname,'test-results');fs.mkdirSync(out,{recursive:true});
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'hm-beta-ui-'));
const executable=process.env.HM_TEST_EXE || require('electron');
const args=process.env.HM_TEST_EXE?[]:[__dirname];
let application,page;const errors=[];let savePath;
async function launch(){
 application=await electron.launch({executablePath:executable,args,env:{...process.env,HM_TEST_USER_DATA:profile},timeout:60000});
 page=await application.firstWindow();page.setDefaultTimeout(30000);page.on('pageerror',error=>errors.push(error.message));
 await page.waitForFunction(()=>typeof state!=='undefined' && typeof window.hockeyDesktop!=='undefined');
 await page.locator('.career-menu').waitFor();
 savePath=path.join(await application.evaluate(({app})=>app.getPath('userData')),'saves','career.json');
}
async function close(){
 const closed=application.waitForEvent('close',{timeout:30000});
 await application.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].close());await closed;application=null;
}
(async()=>{
 try{
  if(!process.env.HM_TEST_EXE)spawnSync(process.execPath,[path.join(__dirname,'stage.cjs')],{stdio:'inherit'});
  await launch();
  const security=await application.evaluate(({BrowserWindow})=>{const p=BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences();return {sandbox:p.sandbox,contextIsolation:p.contextIsolation,nodeIntegration:p.nodeIntegration};});
  assert.deepEqual(security,{sandbox:true,contextIsolation:true,nodeIntegration:false});
  assert.equal(await page.evaluate(()=>typeof require),'undefined');
  await page.getByRole('button',{name:/Starta ny karriär/}).click();
  await page.locator('.career-club-card').filter({hasText:'HV71'}).click();
  await page.getByRole('button',{name:/Möt styrelsen i HV71/}).click();
  await page.getByRole('button',{name:/Acceptera uppdraget/}).click();
  await page.waitForFunction(()=>careerScreen===null && state.careerStarted);
  await page.screenshot({path:path.join(out,'01-klubbkontoret.png'),fullPage:true});
  await page.locator('.manager-nav button').filter({hasText:/Trupp/}).first().click();
  const selectedName=await page.evaluate(()=>managerRoster()[0].name);
  await page.locator('input[name="query"]').fill(selectedName);
  await page.getByRole('button',{name:'Sök',exact:true}).click();
  const link=page.locator('#content .player-reference').first();const id=await link.getAttribute('data-player-id');
  await link.click();await page.waitForFunction(id=>String(state.selectedPlayer)===id,id);
  await page.screenshot({path:path.join(out,'02-spelarprofil.png'),fullPage:true});
  await page.locator('#content button[onclick*="deskBack"]').first().click();
  await page.locator('input[name="query"]').waitFor();assert.equal(await page.locator('input[name="query"]').inputValue(),selectedName);
  // Advance the actual daily engine to the first scheduled fixture, without changing its date.
  await page.evaluate(()=>{for(let i=0;i<10 && state.calendar.date<calendarTarget();i++)calendarContinue();deskNavigate('match');});
  await page.locator('#content button[onclick*="createMatch"]').click();
  await page.locator('#match-play').click();await page.waitForFunction(()=>state.live?.running);
  // Closing a running match must pause and persist it through the real native close handler.
  await page.screenshot({path:path.join(out,'03-match.png'),fullPage:true});
  await close();
  const saved=JSON.parse(JSON.parse(fs.readFileSync(savePath,'utf8')).payload);
  assert.equal(saved.live.running,false);assert.ok(saved.live.broadcast);
  await launch();await page.getByRole('button',{name:/FORTSÄTT KARRIÄR/}).click();
  assert.equal(await page.evaluate(()=>JSON.stringify(state.live)),JSON.stringify(saved.live));
  await page.locator('.settings-item').click();await page.getByText('Spelguide – din första vecka',{exact:true}).click();
  await page.screenshot({path:path.join(out,'04-spelguide.png'),fullPage:true});
  const exported=path.join(out,'exported-career.json');
  await application.evaluate(({session},destination)=>{session.defaultSession.on('will-download',(_event,item)=>item.setSavePath(destination));},exported);
  await page.getByRole('button',{name:'Exportera sparfil',exact:true}).click();
  await page.waitForTimeout(1000);assert.ok(fs.existsSync(exported));
  const old=JSON.parse(fs.readFileSync(exported,'utf8'));assert.equal(old.career.managerClub,'HV71');
  await page.locator('input[type=file]').setInputFiles(exported);
  await page.getByRole('button',{name:'Läs in denna karriär',exact:true}).click();
  assert.equal(await page.evaluate(()=>state.live.running),false);
  await page.getByText('Återställ en automatisk säkerhetskopia',{exact:true}).click();
  await page.getByRole('button',{name:'Granska säkerhetskopia'}).first().click();
  await page.getByRole('button',{name:'Läs in denna karriär',exact:true}).click();
  await page.getByText('Rapportera ett problem',{exact:true}).click();
  const report=await page.evaluate(()=>JSON.parse(betaReportText()));assert.equal(report.version,require('./package.json').version);assert.equal(report.platform,'desktop');
  assert.equal(await page.evaluate(()=>careerSaveError),false);
  await close();
  assert.deepEqual(errors,[],'renderer errors');
  fs.writeFileSync(path.join(out,'smoke-result.json'),JSON.stringify({version:require('./package.json').version,installed:!!process.env.HM_TEST_EXE,platform:process.platform,checks:['native sandbox','new career','filtered squad → profile → same filter','calendar to match','running match → close → disk → restart paused with identical match state','native save export','file import','backup preview and recovery','guide and diagnostic report'],errors},null,2));
  fs.rmSync(exported,{force:true}); // Do not publish test careers in build artifacts.
  console.log('PASS: real Electron UI, disk save/restart, import/export and backup recovery.');
 }catch(error){if(page)try{await page.screenshot({path:path.join(out,'failure.png'),fullPage:true});}catch{}throw error;}
 finally{if(application)try{await application.evaluate(({app})=>app.exit(1));}catch{}}
})().catch(error=>{console.error(error);process.exitCode=1;});
