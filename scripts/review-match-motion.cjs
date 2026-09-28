'use strict';
// Reproducible review of the real career match and its recorded replay renderer.
// No scripted passes, shots, movement or forced outcomes. Supply the same save
// to --root checkouts before/after. Offline 30 fps video is NOT an FPS benchmark.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),{spawn}=require('node:child_process');
const args=Object.fromEntries(process.argv.slice(2).map(a=>{const [k,...v]=a.replace(/^--/,'').split('=');return [k,v.join('=')||true];}));
const root=path.resolve(args.root||'.'),out=path.resolve(args.out||'review-motion'),save=fs.readFileSync(args.save,'utf8');
const {chromium}=require(args.playwright||path.join(root,'desktop/node_modules/playwright'));
const seconds=Number(args.seconds||24),fps=30,startWall=Number(args.start||40),quality=args.quality||'normal';
fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{
 const name=new URL(req.url,'http://local').pathname,file=path.resolve(root,'.'+(name==='/'?'/index.html':name));
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end();return;}
 res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,...(args.browser?{executablePath:args.browser}:{}),args:['--no-sandbox',...(args.software?['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']:[])]});
 try{
  const page=await browser.newPage({viewport:{width:1920,height:1080}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(({save,offline})=>{localStorage.setItem('hockey_manager_alpha02',save);if(offline)window.requestAnimationFrame=fn=>{window.reviewDraw=fn;return 1;};},{save,offline:!args.perf});
  await page.goto('http://127.0.0.1:'+server.address().port);
  await page.evaluate(({quality})=>{pauseMatch();resumeCareer();deskNavigate('match');studioVisualMode='3d';studioExpanded3D=true;studioCamera3D='follow';state.live.rink.mode='full';state.live.rink.onIceRate=1;matchPreferences().graphics3d=quality;render();},{quality});
  const initial=await page.evaluate(()=>({rng:studioEngine().rng,time:studioEngine().time,wall:studioEngine().wall,ids:studioEngine().actors.map(a=>a.id)}));
  if(args.perf){
   await page.waitForFunction(()=>document.getElementById('career-ice-3d')?.dataset.ready==='true');
   await page.evaluate(()=>startMatch());await page.waitForTimeout(10000);
   await page.evaluate(()=>{globalThis.reviewIntervals=[];globalThis.reviewActive=true;let last=performance.now();function tick(now){if(!reviewActive)return;reviewIntervals.push(now-last);last=now;requestAnimationFrame(tick);}requestAnimationFrame(tick);});
   for(let i=0;i<seconds;i+=10){await page.waitForTimeout(Math.min(10,seconds-i)*1000);console.log('measured '+Math.min(i+10,seconds)+' s');}
   const performanceResult=await page.evaluate(()=>{reviewActive=false;pauseMatch();const sorted=reviewIntervals.slice().sort((a,b)=>a-b),q=p=>sorted[Math.floor((sorted.length-1)*p)];return {samples:sorted.length,median:q(.5),p95:q(.95),p99:q(.99),max:Math.max(...sorted),over50:sorted.filter(x=>x>50).length,over100:sorted.filter(x=>x>100).length,time:studioEngine().time,wall:studioEngine().wall,diagnostics:Match3D.diagnostics()};});
   fs.writeFileSync(out+'/performance.json',JSON.stringify(performanceResult,null,2));
  }else{
   const recorded=await page.evaluate(({startWall,seconds})=>{
    const e=studioEngine(),frames=[];let last=-1;const shots=[];
    while(e.wall<startWall+seconds+.3&&!state.live.finished){state.live.running=true;studioStep();const f=e.history.at(-1);if(f&&f.wall>=startWall-.001&&f.wall!==last){frames.push(f);last=f.wall;}if(e.lastShot&&shots.at(-1)?.time!==e.lastShot.time)shots.push({...e.lastShot});}
    state.live.running=false;studioReplayState={frames,elapsed:0,paused:true,lastNow:null,analysis:false,rate:1,shot:shots.at(-1)};render();reviewDraw(0);if(!document.getElementById('career-ice-3d')?.dataset.ready)throw Error('Match canvas did not render');
    return {start:frames[0].wall,end:frames.at(-1).wall,count:frames.length,shots:shots.filter(s=>s.time>=frames[0].time),rng:e.rng,score:e.score,stats:e.stats};
   },{startWall,seconds});
   fs.writeFileSync(out+'/recording.json',JSON.stringify(recorded,null,2));
   const ffmpeg=spawn('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','image2pipe','-framerate',String(fps),'-vcodec','mjpeg','-i','pipe:0','-an','-c:v','libx264','-preset','fast','-crf','20','-pix_fmt','yuv420p',out+'/match.mp4'],{stdio:['pipe','inherit','inherit']});
   const done=new Promise((resolve,reject)=>{ffmpeg.on('error',reject);ffmpeg.on('exit',code=>code?reject(Error('ffmpeg '+code)):resolve());});
   for(let i=0;i<seconds*fps;i++){
    await page.evaluate(({at,label})=>{studioReplayState.elapsed=at;studioReplayState.lastNow=null;reviewDraw(at*1000);const title=document.querySelector('.broadcast-view>header strong');if(title)title.textContent=label+' · inspelade matchtillstånd · 1×';},{at:i/fps,label:args.label||'Rörelsegranskning'});
    const bytes=await page.screenshot({type:'jpeg',quality:87});if(!ffmpeg.stdin.write(bytes))await new Promise(r=>ffmpeg.stdin.once('drain',r));
    if(i%(fps*4)===0){fs.writeFileSync(out+'/frame-'+String(i).padStart(4,'0')+'.jpg',bytes);console.log('rendered '+i/fps+' / '+seconds+' s');}
   }
   ffmpeg.stdin.end();await done;
  }
  const environment=await page.evaluate(()=>{const c=document.getElementById('career-ice-3d'),gl=c.getContext('webgl2'),d=gl.getExtension('WEBGL_debug_renderer_info');return {ua:navigator.userAgent,gpu:d?gl.getParameter(d.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),viewport:[innerWidth,innerHeight],canvas:[c.width,c.height],overflow:document.documentElement.scrollHeight>innerHeight,diagnostics:Match3D.diagnostics()};});
  fs.writeFileSync(out+'/environment.json',JSON.stringify({mode:args.perf?'live measurement':'offline replay, not a performance measurement',initial,environment,errors},null,2));
  if(errors.length)throw Error(errors.join('\n'));
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
