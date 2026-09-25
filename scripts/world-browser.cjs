'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require(require.resolve('playwright',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||process.cwd()]}));
const root=path.resolve(__dirname,'..'),out=process.env.WORLD_SCREENSHOTS||'/tmp/hockey-world';
const server=http.createServer((req,res)=>{const name=new URL(req.url,'http://local').pathname,file=path.resolve(root,'.'+(name==='/'?'/index.html':name));if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.png':'image/png'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{}),args:['--no-sandbox','--single-process','--no-zygote','--use-gl=angle','--use-angle=swiftshader','--in-process-gpu']});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000);
  await page.goto('http://127.0.0.1:'+server.address().port);await page.evaluate(()=>{startCareerWithClub('HV71');deskNavigate('world');document.activeElement?.blur()});
  for(const [width,height] of process.env.WORLD_CHECKS_ONLY?[]:[[1440,900],[1366,768],[1280,720],[1920,1080],[390,844]]){
   await page.setViewportSize({width,height});
   for(const [key,tab] of [['world','overview'],['international','club'],['international','nation'],['international','tournament'],['international','history'],['nhl','club'],['nhl','board'],['nhl','results'],['nhl','rights'],['nhl','contracts'],['nhl','leagues']]){
    await page.evaluate(([key,tab])=>{worldUI.drawer=null;if(key==='international')worldUI.international=tab;if(key==='nhl')nhlUI.tab=tab;deskNavigate(key);document.activeElement?.blur()},[key,tab]);
    await page.screenshot({path:path.join(out,`world-${key}-${tab}-${width}.png`),fullPage:true});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true,key+' '+tab+' width '+width);
    if(width>=1280){
     const panel=await page.locator('.world-desk').boundingBox();assert.ok(panel.y+panel.height<=height-10,key+' desktop fits '+width+': '+JSON.stringify(panel));
     if(await page.locator('.wd-scroll').count()){const size=await page.locator('.wd-scroll').first().evaluate(el=>[el.clientWidth,el.scrollWidth]);assert.ok(size[1]<=size[0]+2,'table fits '+key+' '+tab+' '+width+': '+size);}
    }
   }
  }
  await page.setViewportSize({width:1366,height:768});await require('./world-browser-checks.cjs').checkWorld(page);
  await require('./world-browser-checks.cjs').checkWorldDecisions(page);assert.deepEqual(errors,[]);console.log('PASS: '+(process.env.WORLD_CHECKS_ONLY?'World interactions':'World views at 390–1920 px')+', filters, profile/back navigation, JVM/NHL reports and staged decisions. '+out);
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
