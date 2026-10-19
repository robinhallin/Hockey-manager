'use strict';
// A short real-app flow, separate from full-match UI regression coverage.
const {_electron}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {spawnSync}=require('node:child_process');
const out=path.join(__dirname,'test-results'),profile=fs.mkdtempSync(path.join(os.tmpdir(),'hm-club-build-'));
fs.mkdirSync(out,{recursive:true});
(async()=>{
 let app,page;const errors=[];
 try{
  assert.equal(spawnSync(process.execPath,[path.join(__dirname,'stage.cjs')],{stdio:'inherit'}).status,0);
  app=await _electron.launch({executablePath:require('electron'),args:[__dirname],env:{...process.env,HM_TEST_USER_DATA:profile},timeout:60000});
  page=await app.firstWindow();page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.message));
  await page.waitForFunction(()=>typeof state!=='undefined'&&typeof startCareerWithClub==='function');
  await app.evaluate(({BrowserWindow})=>{const w=BrowserWindow.getAllWindows()[0];w.unmaximize();w.setContentSize(1440,1000);});
  await require('../scripts/club-build-browser-checks.cjs').checkClubBuild(page,out);
  await require('../scripts/transfer-week-browser-checks.cjs').checkTransferWeek(page,out);
  assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(out,'club-build-result.json'),JSON.stringify({passed:true,checks:['project selection and consequence view','preseason trial with real responsibility choice','player memory','five real calendar days with grouped reports','match boundary and unchanged lineup role','disk save and reload','conditional sale through actual UI and calendar','registered replacement before sale','player reaction and persisted conversation'],errors},null,2));
  console.log('PASS: club project, player journey, paced calendar, linked transfers, player reactions and disk reload in the actual Electron app.');
 }catch(error){if(page)try{await page.screenshot({path:path.join(out,'club-build-failure.png'),fullPage:true});}catch{}throw error;}
 finally{if(app)try{await app.evaluate(({app})=>app.exit(0));}catch{}}
})().catch(error=>{console.error(error);process.exitCode=1;});
