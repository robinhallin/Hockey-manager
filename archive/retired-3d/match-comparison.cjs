'use strict';
// Comparable sequences and timings from the actual before/after applications.
// A fixed initial career is used; the production engine chooses every action.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{spawnSync,spawn}=require('node:child_process');
const {_electron:electron}=require('playwright'),{CareerDiskStore}=require('./storage.cjs');
const root=path.resolve(__dirname,'..'),before=process.env.HM_MATCH_BEFORE_ROOT,out=path.join(__dirname,'test-results','comparison');
if(!before)throw Error('HM_MATCH_BEFORE_ROOT is required for the measured baseline.');
fs.mkdirSync(out,{recursive:true});
// Generate one normal match with the baseline career adapter, retaining its seed,
// roster and IDs. No forced pass, shot, save, result or actor movement is used.
process.chdir(before);const fixture=require(path.join(before,'scripts/career-test-fixture.cjs')).boot();
fixture.run("startCareerWithClub('HV71');state.calendar.date=calendarTarget();startMatch();pauseMatch();save();");
const initial=fixture.run('JSON.stringify(state)');process.chdir(root);
async function launch(source){
 const stage=spawnSync(process.execPath,[path.join(source,'desktop/stage.cjs')],{stdio:'inherit'});assert.equal(stage.status,0);
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'hm-body-compare-'));new CareerDiskStore(path.join(profile,'saves')).setItem('hockey_manager_alpha02',initial);
 const app=await electron.launch({executablePath:require('electron'),args:[path.join(source,'desktop')],env:{...process.env,HM_TEST_USER_DATA:profile},timeout:60000});
 const page=await app.firstWindow();page.setDefaultTimeout(60000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.waitForFunction(()=>typeof state!=='undefined'&&!!state.live);
 await app.evaluate(({BrowserWindow})=>{const w=BrowserWindow.getAllWindows()[0];w.unmaximize();w.setContentSize(1920,1080);});
 await page.waitForFunction(()=>innerWidth===1920&&innerHeight===1080);
 return {app,page,errors};
}
async function prepare(page,camera='follow'){
 await page.evaluate(({initial,camera})=>{saveFilePreview=validateSaveText(initial);applyCareerImport();resumeCareer();pauseMatch();deskNavigate('match');studioVisualMode='3d';studioExpanded3D=true;studioCamera3D=camera;state.live.rink.mode='full';state.live.onIceSpeed=1;state.live.speed=1;matchPreferences().graphics3d='normal';render();},{initial,camera});
}
async function measure(page){
 await prepare(page);await page.evaluate(()=>startMatch());await page.waitForTimeout(10000);
 await page.evaluate(()=>{globalThis.comparePerf={active:true,rows:[],start:performance.now(),wall:studioEngine().wall};let last;function tick(now){if(!comparePerf.active)return;if(state.live.running){if(last!=null)comparePerf.rows.push(now-last);last=now;}else last=null;requestAnimationFrame(tick);}requestAnimationFrame(tick);});
 for(let i=0;i<4;i++)await page.waitForTimeout(10000);
 const result=await page.evaluate(()=>{const p=comparePerf;p.active=false;const rows=p.rows.slice().sort((a,b)=>a-b),at=n=>rows[Math.floor((rows.length-1)*n)],c=document.getElementById('career-ice-3d'),gl=c.getContext('webgl2'),info=gl.getExtension('WEBGL_debug_renderer_info');return {elapsedMS:performance.now()-p.start,wallAdvance:studioEngine().wall-p.wall,samples:rows.length,median:at(.5),p95:at(.95),p99:at(.99),max:rows.at(-1),over50:rows.filter(n=>n>50).length,over100:rows.filter(n=>n>100).length,viewport:[innerWidth,innerHeight],canvas:[c.width,c.height],gpu:info?gl.getParameter(info.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),ua:navigator.userAgent,diagnostics:Match3D.diagnostics(),autosave:typeof careerAutosaveDiagnostics==='function'?careerAutosaveDiagnostics():null,saveTiming:performanceSummary('save'),autosaveTiming:Object.fromEntries(['autosaveSnapshot','autosaveSerialize','autosavePack','autosaveWrite'].map(k=>[k,performanceSummary(k)]))};});
 assert.ok(result.samples>30&&result.wallAdvance>10);assert.equal(result.diagnostics.error,0);await page.evaluate(()=>pauseMatch());return result;
}
async function record(page,label,camera,seconds,start=40){
 await page.addInitScript(()=>{window.requestAnimationFrame=fn=>{window.reviewDraw=fn;return 1;};});await page.reload();await page.waitForFunction(()=>typeof state!=='undefined');await prepare(page,camera);
 const folder=path.join(out,label+'-'+camera);fs.mkdirSync(folder,{recursive:true});
 const recorded=await page.evaluate(({start,seconds})=>{
  const e=studioEngine(),frames=[],shots=[];let last=-1;
  while(e.wall<start+seconds+.3&&!state.live.finished){if(medicalPending())medicalDecisionAccept();state.live.running=true;studioStep();const f=e.history.at(-1);if(f&&f.wall>=start-.001&&f.wall!==last){frames.push(f);last=f.wall;}if(e.lastShot&&shots.at(-1)?.time!==e.lastShot.time)shots.push({...e.lastShot});}
  state.live.running=false;studioReplayState={frames,elapsed:0,paused:true,lastNow:null,analysis:false,rate:1,shot:shots.at(-1)};render();reviewDraw(0);
  return {start:frames[0]?.wall,end:frames.at(-1)?.wall,count:frames.length,rng:e.rng,score:e.score,shots,stats:e.stats};
 },{start,seconds});assert.ok(recorded.count>=seconds*9);fs.writeFileSync(path.join(folder,'recording.json'),JSON.stringify(recorded,null,2));
 const encoder=spawn('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','image2pipe','-framerate','30','-vcodec','mjpeg','-i','pipe:0','-an','-c:v','libx264','-preset','fast','-crf','20','-pix_fmt','yuv420p',path.join(folder,'match.mp4')],{stdio:['pipe','inherit','inherit']});
 const done=new Promise((resolve,reject)=>{encoder.on('error',reject);encoder.on('exit',code=>code?reject(Error('ffmpeg '+code)):resolve());});
 for(let i=0;i<seconds*30;i++){
  await page.evaluate(at=>{studioReplayState.elapsed=at;studioReplayState.lastNow=null;reviewDraw(at*1000);},i/30);
  const image=await page.screenshot({type:'jpeg',quality:87});if(!encoder.stdin.write(image))await new Promise(r=>encoder.stdin.once('drain',r));
  if(i%30===0)fs.writeFileSync(path.join(folder,'frame-'+String(i).padStart(4,'0')+'.jpg'),image);
  if(i%120===0)console.log(label+' '+camera+': '+i/30+'/'+seconds+' seconds of recorded states');
 }
 encoder.stdin.end();await done;assert.equal(await page.evaluate(()=>Match3D.diagnostics().error),0);
}
(async()=>{
 const results={baseline:'6d7a343df161717a7a7dfe5aa50dc4490f013999',platform:os.platform(),os:os.release(),cpu:os.cpus()[0]?.model,logicalCpus:os.cpus().length,memoryGiB:os.totalmem()/1024**3,video:'Offline 30 fps recorded states, silent; not real-time FPS.',measurements:[]};
 for(const [label,source] of [['before',before],['after',root]]){
  const {app,page,errors}=await launch(source);
  try{
   const measurement=await measure(page);if(label==='after'){assert.ok(measurement.autosave.completed>=2,'actual native worker autosaves completed');assert.equal(measurement.autosave.fallbacks,0,'worker path must work in the production protocol');}
   results.measurements.push({label,...measurement});fs.writeFileSync(path.join(out,'performance.json'),JSON.stringify(results,null,2));
   await record(page,label,'rinkside',12);if(label==='after')await record(page,label,'follow',24);
   assert.deepEqual(errors,[]);
  }finally{await app.close();}
 }
})().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
