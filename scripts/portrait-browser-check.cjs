// Optional local browser smoke test: CHROMIUM_PATH=/path/to/chromium node scripts/portrait-browser-check.cjs
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require(require.resolve('playwright',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||path.resolve('desktop/node_modules')]}));
const root=path.resolve('.');
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]==='/'?'/index.html':req.url.split('?')[0]));
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
 try{const data=fs.readFileSync(file);res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png'})[path.extname(file)]||'application/octet-stream');res.end(data);}catch{res.writeHead(404);res.end();}
});
(async()=>{
 let browser;
 try{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader']});
  const page=await browser.newPage({viewport:{width:1366,height:900}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.evaluate(()=>{startCareerWithClub('HV71');deskOpenPlayer('ep-796339');});
  const loaded=await page.evaluate(async()=>{
   const rows=Object.entries(PLAYER_PORTRAITS).map(([id,p])=>({id,src:p.src}));
   return Promise.all(rows.map(async p=>{const img=new Image();img.src=p.src;await img.decode();return {id:p.id,width:img.naturalWidth};}));
  });
  assert.ok(loaded.length>=52);assert.ok(loaded.every(p=>p.width===384));
  const avatar=page.locator('.fm-profile-header .player-avatar img');
  await avatar.waitFor();
  await page.waitForFunction(()=>document.querySelector('.fm-profile-header .player-avatar img')?.naturalWidth>0);
  await page.screenshot({path:process.env.PORTRAIT_SCREENSHOT||'/tmp/hockey-portrait-check.png'});
  await page.evaluate(()=>{const img=document.querySelector('.fm-profile-header .player-avatar img');img.src='assets/portraits/missing-test.png';});
  await page.waitForFunction(()=>document.querySelector('.fm-profile-header .player-avatar img')?.hidden);
  assert.match(await page.locator('.fm-profile-header .player-avatar').getAttribute('aria-label'),/kunde inte laddas/);
  await page.evaluate(()=>deskOpenPlayer('ep-3682'));
  await page.waitForFunction(()=>document.querySelector('.fm-profile-header .player-avatar img')?.naturalWidth>0);
  assert.match(await page.locator('.fm-profile-header .player-avatar').getAttribute('aria-label'),/Nicklas Bäckström/);
  assert.deepEqual(errors,[]);console.log(`PASS: ${loaded.length} portraits load, HV71 and Brynäs profiles render, missing file falls back, no page errors`);
 }finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
