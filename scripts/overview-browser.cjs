'use strict';
// Run with Playwright available in NODE_PATH or CODEX_PRIMARY_RUNTIME_NODE_MODULES.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require(require.resolve('playwright',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||process.cwd()]}));
const root=path.resolve(__dirname,'..'),out=process.env.OVERVIEW_SCREENSHOTS||'/tmp/hockey-overview';
const server=http.createServer((req,res)=>{const name=new URL(req.url,'http://local').pathname,file=path.resolve(root,'.'+(name==='/'?'/index.html':name));if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.png':'image/png'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{}),args:['--no-sandbox','--single-process','--no-zygote','--use-gl=angle','--use-angle=swiftshader','--in-process-gpu']});
 try{
 const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000);
 await page.goto('http://127.0.0.1:'+server.address().port);await page.evaluate(()=>{startCareerWithClub('HV71');deskNavigate('home')});
 for(const [width,height] of [[1440,900],[1920,1080],[1280,720],[800,900],[390,844]]){
  await page.setViewportSize({width,height});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true,'page fits '+width);
  assert.equal(await page.locator('.ov-day').count(),7);
  await page.locator('.ov-heading h1').click();await page.screenshot({path:path.join(out,`overview-${width}.png`)});
 }
 await page.setViewportSize({width:1440,height:900});
 const first=page.locator('.ov-watch-row').first(),selected=await first.locator('strong').innerText();
 await first.focus();await page.keyboard.press('Enter');
 assert.equal(await page.locator('#overview-player-detail').getAttribute('aria-label'),'Vald spelare: '+selected);
 const bounds=await page.locator('#overview-player-detail').boundingBox();assert.ok(bounds.y>=0&&bounds.y+bounds.height<=900,'player panel visible without scroll');
 await page.screenshot({path:path.join(out,'overview-player.png')});
 await page.getByRole('button',{name:'Öppna spelarprofil',exact:true}).click();assert.equal(await page.evaluate(()=>state.page),'player');
 await page.goBack();await page.waitForSelector('.ov-dashboard');assert.equal(await page.evaluate(()=>overviewUI.player),await page.evaluate(()=>overviewWatchPlayers()[0].p.id));
 await page.getByRole('button',{name:'Stäng spelaröversikten'}).click();assert.equal(await page.locator('#overview-player-detail').count(),0);
 // Exact calendar day, not a stale fixture-list tab.
 await page.evaluate(()=>matchesUI.calendar='fixtures');const day=await page.locator('.ov-day time').nth(4).getAttribute('datetime');await page.locator('.ov-day').nth(4).click();assert.equal(await page.evaluate(()=>calendarUI.date),day);assert.equal(await page.evaluate(()=>matchesUI.calendar),'calendar');
 await page.goBack();await page.waitForSelector('.ov-dashboard');
 // An old player filter/detail must not hijack the whole-roster shortcut.
 await page.evaluate(()=>{developmentUI.detail=true;developmentUI.query='not-a-player';developmentUI.filter='loan'});await page.getByRole('button',{name:'Hela truppen',exact:true}).click();assert.equal(await page.locator('.dv-overview tbody tr[data-development-id]').count(),await page.evaluate(()=>developmentRoster().length));
 await page.goBack();await page.waitForSelector('.ov-dashboard');
 // Correct medical case, even after the reports tab was previously selected.
 await page.evaluate(()=>{globalThis.ovInjured=managerRoster().find(p=>p.pos!=='MV');ovInjured.health.injury={name:'Testskada',remaining:5,initial:5,readiness:40,source:'test'};ovInjured.health.clearance='rest';developmentUI.medicalTab='history';render()});
 await page.locator('.ov-watch-row').first().click();await page.getByRole('button',{name:'Medicinsk plan',exact:true}).click();assert.equal(await page.evaluate(()=>developmentUI.medical),await page.evaluate(()=>ovInjured.id));assert.equal(await page.evaluate(()=>developmentUI.medicalTab),'cases');
 await page.goBack();await page.waitForSelector('.ov-dashboard');await page.getByRole('button',{name:'Stäng spelaröversikten'}).click();
 // Required decisions can all be opened; a waiting counteroffer is outside that list.
 await page.evaluate(()=>{for(let i=0;i<7;i++)state.recruitment.incoming.push({id:900+i,name:'Testbud '+i,buyer:'AIK',kind:'transfer',status:'pending',stage:'offer',expiresDate:calAdd(state.calendar.date,7-i),fee:0});render()});
 await page.getByRole('button',{name:/Visa alla .* ärenden/}).click();assert.equal(await page.locator('.ov-decisions button').filter({hasText:'Granska'}).count(),7);
 await page.locator('.ov-decisions button').filter({hasText:'Granska'}).first().click();assert.equal(await page.evaluate(()=>recruitHub.deal),'incoming:906');
 await page.goBack();await page.waitForSelector('.ov-dashboard');
 // Optional details and their closing controls retain access to the old systems.
 for(const name of ['Uppföljning','Träning & juniorer','Resultat & ekonomi','Ansvar & bevakning']){
  await page.locator('.ov-support-nav').getByRole('button',{name,exact:true}).click();assert.equal(await page.locator('.ov-support').count(),1);await page.locator('.ov-support-nav').getByRole('button',{name,exact:true}).click();assert.equal(await page.locator('.ov-support').count(),0);
 }
 await page.locator('.ov-support-nav').getByRole('button',{name:'Säsongens historier',exact:true}).click();assert.equal(await page.locator('#overview-stories').count(),1);await page.getByRole('button',{name:'Stäng historier',exact:true}).click();
 await page.locator('.ov-support-nav').getByRole('button',{name:'Press & supportrar',exact:true}).click();assert.equal(await page.locator('#overview-press').count(),1);await page.getByRole('button',{name:'Stäng pressrummet',exact:true}).click();
 assert.deepEqual(errors,[]);console.log('PASS: keyboard player panel, profile/back, date selection, complete roster, exact medical case, seven offers, all support panels; 390–1920 px without page overflow. '+out);
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
