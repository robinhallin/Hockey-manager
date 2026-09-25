'use strict';
// Exercise the real desktop page. Run with Playwright in the primary runtime.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require(require.resolve('playwright',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||process.cwd()]}));
const root=path.resolve(__dirname,'..'),out=process.env.TEAM_SCREENSHOTS||'/tmp/hockey-team';
const server=http.createServer((req,res)=>{const name=new URL(req.url,'http://local').pathname,file=path.resolve(root,'.'+(name==='/'?'/index.html':name));if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.png':'image/png'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{}),args:['--no-sandbox','--single-process','--no-zygote','--use-gl=angle','--use-angle=swiftshader','--in-process-gpu']});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000);
  await page.goto('http://127.0.0.1:'+server.address().port);await page.evaluate(()=>{startCareerWithClub('HV71');deskNavigate('squad')});
  const selected=await page.evaluate(()=>({id:managerRoster().find(p=>p.pos==='B').id,name:managerRoster().find(p=>p.pos==='B').name}));
  const row=()=>page.locator('[data-squad-player="'+selected.id+'"]');
  await row().getByRole('button',{name:selected.name,exact:true}).focus();await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(()=>state.page),'squad');assert.equal(await page.locator('#squad-player-detail').getAttribute('aria-label'),'Vald spelare: '+selected.name);
  for(const [width,height] of [[1440,900],[1920,1080],[1280,720],[1100,800],[800,900],[390,844]]){
   await page.setViewportSize({width,height});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true,'page fits '+width);
   if(width>=1100){const layout=await page.locator('.sw-table-wrap').evaluate(el=>({client:el.clientWidth,scroll:el.scrollWidth}));assert.ok(layout.scroll<=layout.client+2,'all columns fit '+width);const panel=await page.locator('#squad-player-detail').boundingBox(),content=await page.locator('.game-content').boundingBox();assert.ok(panel.y+panel.height<=Math.min(height,content.y+content.height)+2,'player panel visible '+width);}
   await page.screenshot({path:path.join(out,`team-${width}.png`)});
  }
  await page.setViewportSize({width:1440,height:900});
  if(process.env.TEAM_LAYOUT_ONLY){console.log(await page.evaluate(()=>Object.fromEntries(['.game-content','.squad-workspace','.sw-heading','.sw-table-wrap','#squad-player-detail'].map(s=>{const e=document.querySelector(s),r=e.getBoundingClientRect(),c=getComputedStyle(e);return [s,{y:r.y,h:r.height,bottom:r.bottom,client:e.clientHeight,scroll:e.scrollHeight,height:c.height,padding:c.padding,margin:c.margin,display:c.display,align:c.alignItems}]}))));return;}
  // Every visible heading sorts in both directions, without losing the selected player.
  for(const name of ['Truppstatus','Prestation','Snittbetyg','Kontrakt']){
   await page.getByRole('navigation',{name:'Truppens tabellvy'}).getByRole('button',{name,exact:true}).click();
   const count=await page.locator('.sw-table-wrap thead button').count();assert.equal(count,await page.locator('.sw-table-wrap thead th').count());
   for(let i=0;i<count;i++){const button=page.locator('.sw-table-wrap thead button').nth(i);await button.click();const direction=await button.locator('..').getAttribute('aria-sort');await button.click();assert.notEqual(await button.locator('..').getAttribute('aria-sort'),direction);}
   assert.equal(await page.evaluate(()=>squadUI.player),selected.id);
  }
  await page.getByRole('navigation',{name:'Truppens tabellvy'}).getByRole('button',{name:'Truppstatus',exact:true}).click();
  await page.getByLabel('Position',{exact:true}).selectOption('B');
  await page.locator('.sw-filters input').fill('does-not-exist');await page.locator('.sw-filters').getByRole('button',{name:'Sök',exact:true}).click();
  assert.equal(await page.locator('.sw-empty').count(),1);assert.match(await page.locator('#squad-player-detail').innerText(),/ingår inte i aktuellt urval/);
  await page.getByRole('button',{name:'Rensa urval',exact:true}).click();
  await page.locator('.sw-table-wrap').evaluate(el=>{el.scrollTop=380;el.dispatchEvent(new Event('scroll'))});
  const scroll=await page.evaluate(()=>squadUI.scroll);assert.ok(scroll>0);
  await page.getByRole('button',{name:'Öppna spelarprofil',exact:true}).click();assert.equal(await page.evaluate(()=>state.selectedPlayer),selected.id);
  await page.goBack();await page.waitForSelector('.squad-workspace');assert.equal(await page.evaluate(()=>squadUI.player),selected.id);assert.equal(await page.locator('.sw-table-wrap').evaluate(el=>el.scrollTop),scroll);
  // Existing workflows receive the exact selected identity, even with stale filters.
  await page.evaluate(()=>{lockerUI.filter='concerns';lockerUI.tab='promises';lockerUI.player=null});
  await page.locator('.sw-next').getByRole('button',{name:'Samtal',exact:true}).click();assert.equal(await page.evaluate(()=>lockerUI.player),selected.id);assert.equal(await page.evaluate(()=>lockerUI.filter),'all');assert.equal(await page.evaluate(()=>lockerUI.tab),'situation');
  await page.goBack();await page.waitForSelector('.squad-workspace');
  await page.locator('.sw-next').getByRole('button',{name:'Utveckling',exact:true}).click();assert.equal(await page.evaluate(()=>developmentUI.player),selected.id);assert.equal(await page.evaluate(()=>developmentUI.detail),true);
  await page.goBack();await page.waitForSelector('.squad-workspace');
  await page.locator('.sw-next').getByRole('button',{name:/^(Avtal|Granska avtal)$/}).click();assert.equal(await page.evaluate(()=>profileWorkspace.tab),'contract');assert.equal(await page.evaluate(()=>state.selectedPlayer),selected.id);
  await page.goBack();await page.waitForSelector('.squad-workspace');
  await page.locator('.sw-next').getByRole('button',{name:/^(Plats i laget|Se plats i laget)$/}).click();assert.equal(await page.evaluate(()=>state.page),'lines');assert.equal(await page.evaluate(()=>lineupWorkspace),'even');assert.equal(await page.locator('.multi-rinks [data-board]').count(),4);
  await page.getByRole('navigation',{name:'Taktikarbetsyta'}).getByRole('button',{name:'Powerplay & boxplay',exact:true}).click();assert.equal(await page.locator('.multi-rinks [data-board]').count(),4);
  await page.goBack();await page.waitForSelector('.squad-workspace');
  await page.getByRole('button',{name:'Stäng spelaröversikten',exact:true}).click();assert.equal(await page.locator('.sw-player-empty').count(),1);
  // Theme is taken from the actual coached club, with a stable layout.
  await page.evaluate(()=>{startCareerWithClub('Frölunda HC');deskNavigate('squad');squadSelectPlayer(managerRoster()[0].id)});
  assert.equal(await page.locator('.game-shell').getAttribute('data-club'),'Frölunda HC');assert.notEqual(await page.locator('.game-shell').evaluate(el=>getComputedStyle(el).getPropertyValue('--club-primary').trim()),'#093e78');
  await page.screenshot({path:path.join(out,'team-frolunda.png')});
  assert.deepEqual(errors,[]);console.log('PASS: every column sorts, keyboard selection, preserved filters and table scroll, exact profile/contracts/development/conversation/lineup, PP/BP, club theme; 390–1920 px. '+out);
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
