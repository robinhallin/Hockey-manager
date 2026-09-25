'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require(require.resolve('playwright',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||process.cwd()]}));
const root=path.resolve(__dirname,'..'),out=process.env.MATCH_SCREENSHOTS||'/tmp/hockey-match';
const server=http.createServer((req,res)=>{const name=new URL(req.url,'http://local').pathname,file=path.resolve(root,'.'+(name==='/'?'/index.html':name));if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.png':'image/png'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{}),args:['--no-sandbox','--single-process','--no-zygote','--use-gl=angle','--use-angle=swiftshader','--in-process-gpu']});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000);
  await page.goto('http://127.0.0.1:'+server.address().port);await page.evaluate(()=>{startCareerWithClub('HV71');state.calendar.date=calendarTarget();calendarPlayFriendly(state.calendar.friendlies.find(f=>!f.played&&f.date===state.calendar.date).id);deskNavigate('match');document.activeElement?.blur()});

  for(const [width,height] of process.env.MATCH_CHECKS_ONLY?[]:[[1440,900],[1366,768],[1280,720],[1920,1080],[390,844]]){
   await page.setViewportSize({width,height});
   for(const tab of ['feedback','tactics','changes','lineup','stats','players','events','analysis','settings']){
    await page.evaluate(tab=>{matchTab(tab);document.activeElement?.blur()},tab);
    if(tab==='feedback'||width===1366&&['tactics','changes','lineup'].includes(tab))await require('./match-browser-checks.cjs').matchScreenshot(page,path.join(out,`match-${tab}-${width}.png`));
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true,tab+' width '+width);
    if(width>=1280){
     for(const selector of ['.md-workspace','#career-ice','.mc-playback','.mc-coach','.mc-on-ice','.md-status']){
      const r=await page.locator(selector).boundingBox();assert.ok(r&&r.width>0&&r.height>0&&r.x>=0&&r.y>=0&&r.x+r.width<=width+1&&r.y+r.height<=height+1,selector+' fits '+tab+' '+width+': '+JSON.stringify(r));
     }
     assert.equal(await page.locator('#content').evaluate(el=>el.scrollHeight<=el.clientHeight+1),true,'no page scroll '+tab+' '+width);
    }
   }
  }
  await page.setViewportSize({width:1366,height:768});await require('./match-browser-checks.cjs').checkMatchView(page);
  if(!process.env.MATCH_LAYOUT_ONLY)await require('./match-browser-checks.cjs').checkMatchDecisions(page,out);
  assert.deepEqual(errors,[]);console.log('PASS: match workspace geometry and interactions. '+out);
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
