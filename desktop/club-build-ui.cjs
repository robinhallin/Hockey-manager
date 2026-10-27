'use strict';
// A short real-app flow, separate from full-match UI regression coverage.
const {_electron}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {spawnSync}=require('node:child_process');
const out=path.join(__dirname,'test-results'),profile=fs.mkdtempSync(path.join(os.tmpdir(),'hm-club-build-'));
fs.mkdirSync(out,{recursive:true});
(async()=>{
 let app,page;const errors=[];
 try{
  if(!process.env.HM_TEST_EXE)assert.equal(spawnSync(process.execPath,[path.join(__dirname,'stage.cjs')],{stdio:'inherit'}).status,0);
  app=await _electron.launch({executablePath:process.env.HM_TEST_EXE||require('electron'),args:process.env.HM_TEST_EXE?[]:[__dirname],env:{...process.env,HM_TEST_USER_DATA:profile},timeout:60000});
  page=await app.firstWindow();await page.context().setOffline(true);page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.message));
  await page.waitForFunction(()=>typeof state!=='undefined'&&typeof startCareerWithClub==='function');
  await app.evaluate(({BrowserWindow})=>{const w=BrowserWindow.getAllWindows()[0];if(!w.isVisible())return new Promise(resolve=>w.once('show',resolve));});
  await app.evaluate(({BrowserWindow})=>{const w=BrowserWindow.getAllWindows()[0];w.unmaximize();w.setContentSize(1440,1000);});
  // Keep the established analytical-workspace coverage explicit, then exercise
  // the integrated clubhouse and 2D match experience through its own real buttons below.
  await page.evaluate(()=>clubhouseRemember('mode','classic'));
  await require('../scripts/club-build-browser-checks.cjs').checkClubBuild(page,out);
  await require('../scripts/transfer-week-browser-checks.cjs').checkTransferWeek(page,out);
  await require('../scripts/personal-match-browser-checks.cjs').checkPersonalMatch(page,out);
  await require('../scripts/clubhouse-browser-checks.cjs').checkClubhouse(page,out);
  await require('../scripts/clubhouse-browser-checks.cjs').checkClubhouseLife(page,out);
  await require('../scripts/clubhouse-browser-checks.cjs').checkClubhouseTheme(page,out);
  await require('../scripts/room-browser-checks.cjs')(page,out);
  await require('../scripts/room-coaching-browser-checks.cjs')(page,out);
  await require('../scripts/room-workspaces-browser-checks.cjs')(page,out);
  await require('../scripts/club-decisions-browser-checks.cjs')(page,out);
  await require('../scripts/action-surfaces-browser-checks.cjs')(page,out);
  await require('../scripts/coach-journey-browser-checks.cjs').checkCoachJourney(page,out);
  await require('../scripts/coach-workspace-browser-checks.cjs').checkCoachWorkspace(page,out);
  assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(out,'club-build-result.json'),JSON.stringify({passed:true,version:require('./package.json').version,build:await page.evaluate(()=>betaBuild().revision),installed:!!process.env.HM_TEST_EXE,offline:true,checks:['seven rooms and every workstation','room coaching and workspace controls','daily decisions and persisted plans','coach workspace navigation and complete friendly','offline bundled room assets','project selection and consequence view','preseason trial with real responsibility choice','player memory','five real calendar days with grouped reports','match boundary and unchanged lineup role','disk save and reload','conditional sale through actual UI and calendar','registered replacement before sale','player reaction and persisted conversation','personal match preview and both actual lineup choices','a complete actual friendly and frozen outcome','player memory after disk reload'],errors},null,2));
  console.log('PASS: club project, player journey, paced calendar, linked transfers, player reactions and disk reload in the actual Electron app.');
 }catch(error){if(page)try{await page.screenshot({path:path.join(out,'club-build-failure.png'),fullPage:true});}catch{}throw error;}
 finally{if(app)try{await app.evaluate(({app})=>app.exit(0));}catch{}}
})().catch(error=>{console.error(error);process.exitCode=1;});
