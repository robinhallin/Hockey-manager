'use strict';
// Installed-only checks. Never run against a real user's profile.
const {_electron}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
assert.equal(process.env.CI,'true','Only disposable CI runners may use this test');
assert.ok(process.env.HM_TEST_EXE,'An installed executable is required');
const phase=process.argv[2],out=path.join(__dirname,'test-results');
assert.ok(['clean','baseline','upgrade'].includes(phase));fs.mkdirSync(out,{recursive:true});
const fingerprint=()=>({club:managerClub(),date:state.calendar.date,money:state.money,round:state.round,roster:managerRoster().map(p=>[String(p.id),p.salary,p.contractYears]),lines:state.lines});
(async()=>{
 let app,page;const errors=[];
 try{
  app=await _electron.launch({executablePath:process.env.HM_TEST_EXE,args:[],timeout:60000});page=await app.firstWindow();page.setDefaultTimeout(30000);
  page.on('pageerror',e=>errors.push(e.message));await page.context().setOffline(true);
  await page.waitForFunction(()=>typeof state!=='undefined'&&!!window.hockeyDesktop);
  if(phase==='baseline'){
   assert.equal(await page.evaluate(()=>window.hockeyDesktop.version),'0.1.0-beta.7');
   await page.evaluate(()=>{startCareerWithClub('HV71');state.money+=123;save();});
   fs.writeFileSync(path.join(out,'upgrade-baseline.json'),JSON.stringify(await page.evaluate(fingerprint)));
  }else{
   assert.equal(await page.evaluate(()=>window.hockeyDesktop.version),require('./package.json').version);
   const build=await page.evaluate(()=>betaBuild().revision);assert.equal(build,process.env.GITHUB_SHA);
   if(phase==='upgrade'){
    assert.deepEqual(await page.evaluate(fingerprint),JSON.parse(fs.readFileSync(path.join(out,'upgrade-baseline.json'))));
    assert.equal(await page.evaluate(()=>careerLoadIssue),null);
   }else{
    assert.equal(await page.evaluate(()=>state.careerStarted),false,'clean installation must not reuse a career');
    assert.equal(await page.evaluate(()=>clubhousePreference('mode','coach')),'coach','the current coach view is the default');
    await page.getByRole('button',{name:/Starta ny karriär/}).click();
    await page.locator('.career-club-card').filter({hasText:'HV71'}).click();
    await page.getByRole('button',{name:/Möt styrelsen i HV71/}).click();
    await page.getByRole('button',{name:/Acceptera uppdraget/}).click();
    await page.evaluate(()=>{preseasonConfigure('balanced','manager','rotation','assistant','assistant');deskNavigate('home');});
    await page.getByRole('region',{name:'Kom igång med din första vecka'}).waitFor();
    await page.getByRole('button',{name:'1. Kontrollera kedjor & matchplan →',exact:true}).click();
    await page.evaluate(()=>deskNavigate('settings'));
    await page.getByText('Rapportera ett problem',{exact:true}).click();
    await page.getByLabel('Så återskapar du problemet',{exact:true}).fill('Öppna taktiktavlan och därefter F1.');
    const report=await page.evaluate(()=>JSON.parse(betaReportText()));assert.equal(report.context.page,'lines');assert.match(report.steps,/taktiktavlan/);assert.equal(report.build,build);
    for(const [width,height,zoom] of [[1366,768,1],[1920,1080,1.25],[1920,1080,1.5]]){
     await app.evaluate(({BrowserWindow},s)=>{const w=BrowserWindow.getAllWindows()[0];w.unmaximize();w.setContentSize(s[0],s[1]);w.webContents.setZoomFactor(s[2]);},[width,height,zoom]);
     assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'support form fits native window and zoom');
     await page.screenshot({path:path.join(out,`beta-support-${width}-${zoom}.png`),fullPage:true});
    }
    await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].webContents.setZoomFactor(1));
   }
   assert.deepEqual(errors,[]);
   fs.writeFileSync(path.join(out,`installed-${phase}.json`),JSON.stringify({version:require('./package.json').version,build,installed:true,phase,offline:true,passed:true,errors},null,2));
  }
  const closed=app.waitForEvent('close');await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].close());await closed;app=null;
 }catch(e){if(page)try{await page.screenshot({path:path.join(out,`installed-${phase}-failure.png`),fullPage:true});}catch{}throw e;}
 finally{if(app)await app.evaluate(({app})=>app.exit(1));}
})().catch(e=>{console.error(e);process.exitCode=1;});
