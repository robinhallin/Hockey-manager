'use strict';
const {_electron:electron}=require('playwright'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {spawnSync}=require('node:child_process');
const out=path.join(__dirname,'test-results'),profile=fs.mkdtempSync(path.join(os.tmpdir(),'hm-match-recording-'));
fs.mkdirSync(out,{recursive:true});
(async()=>{
 let application;
 try{
  const staged=spawnSync(process.execPath,[path.join(__dirname,'stage.cjs')],{stdio:'inherit'});if(staged.status!==0)throw Error('staging failed');
  application=await electron.launch({executablePath:require('electron'),args:[__dirname],env:{...process.env,HM_TEST_USER_DATA:profile},timeout:60000});
  const page=await application.firstWindow();page.setDefaultTimeout(30000);
  await page.waitForFunction(()=>typeof state!=='undefined'&&typeof window.hockeyDesktop!=='undefined');
  // Only select the club and calendar start. Production players, decisions,
  // physics and outcomes remain authoritative for the entire recording.
  await page.evaluate(()=>{
   startCareerWithClub('HV71');preseasonConfigure(state.clubOffice.priority,'manager','strongest','assistant','assistant');
   state.calendar.date=calendarTarget();const friendly=state.calendar.friendlies.find(f=>!f.played&&f.club===managerClub()&&f.date===state.calendar.date);
   calendarPlayFriendly(friendly.id);startMatch();pauseMatch();studioSetVisual('3d');render();
  });
  await require('./record-match-flow.cjs')(page,out,application);
 }finally{
  if(application)await application.close();
  fs.rmSync(profile,{recursive:true,force:true});
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
