'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require(require.resolve('playwright',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||process.cwd()]}));
const root=path.resolve(__dirname,'..'),out=process.env.DEVELOPMENT_SCREENSHOTS||'/tmp/hockey-development';
const server=http.createServer((req,res)=>{const name=new URL(req.url,'http://local').pathname,file=path.resolve(root,'.'+(name==='/'?'/index.html':name));if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.png':'image/png'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{}),args:['--no-sandbox','--single-process','--no-zygote','--use-gl=angle','--use-angle=swiftshader','--in-process-gpu']});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000);
  await page.goto('http://127.0.0.1:'+server.address().port);await page.evaluate(()=>{startCareerWithClub('HV71');deskNavigate('training');document.activeElement?.blur()});
  for(const [width,height] of [[1440,900],[1366,768],[1280,720],[1920,1080],[390,844]]){
   await page.setViewportSize({width,height});
   for(const key of ['training','juniors','medical']){
    await page.evaluate(key=>{deskNavigate(key);document.activeElement?.blur()},key);
    await page.screenshot({path:path.join(out,`development-${key}-${width}.png`),fullPage:true});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true,key+' width '+width);
    if(width>=1280){const panel=await page.locator('.dd-inspector').boundingBox();assert.ok(panel.y+panel.height<=height-15,key+' inspector fits '+width+': '+JSON.stringify(panel));const size=await page.locator('.dd-scroll').evaluate(el=>[el.clientWidth,el.scrollWidth]);assert.ok(size[1]<=size[0]+2,'table fits '+key+' '+width+': '+size);}
   }
  }
  await page.setViewportSize({width:1366,height:768});await require('./development-browser-checks.cjs').checkDevelopment(page);
  assert.deepEqual(errors,[]);console.log('PASS: three development views at 390–1920 px, desktop inspector, row selection, filters, plans, junior training, medical clearance and saved plans. '+out);
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
