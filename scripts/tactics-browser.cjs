'use strict';
// Exercise the real desktop page. Run with Playwright in the primary runtime.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require(require.resolve('playwright',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||process.cwd()]}));
const root=path.resolve(__dirname,'..'),out=process.env.TACTICS_SCREENSHOTS||'/tmp/hockey-tactics';
const server=http.createServer((req,res)=>{const name=new URL(req.url,'http://local').pathname,file=path.resolve(root,'.'+(name==='/'?'/index.html':name));if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.png':'image/png'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{}),args:['--no-sandbox','--single-process','--no-zygote','--use-gl=angle','--use-angle=swiftshader','--in-process-gpu']});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000);
  await page.goto('http://127.0.0.1:'+server.address().port);await page.evaluate(()=>{startCareerWithClub('HV71');deskNavigate('squad')});
  await page.evaluate(()=>{deskNavigate('lines');document.activeElement?.blur()});
  for(const [width,height] of [[1440,900],[1366,768],[1280,720],[1920,1080],[390,844]]){
   await page.setViewportSize({width,height});
   await page.screenshot({path:path.join(out,`tactics-${width}.png`),fullPage:true});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true,'even width '+width);
   if(width>=1280){const panel=await page.locator('.tw-inspector').boundingBox();assert.ok(panel.y+panel.height<=height-15,'even player panel fits '+width+': '+JSON.stringify(panel));}
   await page.getByRole('navigation',{name:'Taktikarbetsyta'}).getByRole('button',{name:'PP',exact:true}).click();
   await page.screenshot({path:path.join(out,`pp-${width}.png`),fullPage:true});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true,'PP width '+width);
   const builder=await page.locator('.tw-builder').boundingBox(),inspector=await page.locator('.tw-inspector').boundingBox();assert.ok(builder.y+builder.height<inspector.y,'builder clears player panel at '+width);
   const panelBounds=await page.locator('.tw-rink-panel').boundingBox();assert.ok(panelBounds.y+panelBounds.height<inspector.y,'rink panel clears inspector at '+width);
   if(width>=1280){const panel=await page.locator('.tw-inspector').boundingBox();assert.ok(panel.y+panel.height<=height-15,'PP player panel fits '+width+': '+JSON.stringify(panel));}
   await page.getByRole('navigation',{name:'Taktikarbetsyta'}).getByRole('button',{name:'5 mot 5',exact:true}).click();
  }
  await page.setViewportSize({width:1366,height:768});await require('./tactics-browser-checks.cjs').checkTactics(page);
  assert.deepEqual(errors,[]);console.log('PASS: responsive 390–1920 px, visible desktop inspector, drag, keyboard, search, swaps, undo, locks, assistant, all PP/BP schemes and live orders. '+out);
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
