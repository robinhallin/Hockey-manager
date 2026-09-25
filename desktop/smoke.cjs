'use strict';
// Runs against the actual Electron app, or an NSIS-installed executable in CI.
const {_electron:electron}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {spawnSync}=require('node:child_process');
const out=path.join(__dirname,'test-results');fs.mkdirSync(out,{recursive:true});
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'hm-beta-ui-'));
const executable=process.env.HM_TEST_EXE || require('electron');
const args=process.env.HM_TEST_EXE?[]:[__dirname];
let application,page;const errors=[];let savePath;
async function launch(){
 application=await electron.launch({executablePath:executable,args,env:{...process.env,HM_TEST_USER_DATA:profile},timeout:60000});
 page=await application.firstWindow();page.setDefaultTimeout(30000);page.on('pageerror',error=>errors.push(error.message));
 await page.waitForFunction(()=>typeof state!=='undefined' && typeof window.hockeyDesktop!=='undefined');
 await page.evaluate(()=>{window.hmDragEvents=[];for(const name of ['dragstart','drop','dragend'])document.addEventListener(name,e=>window.hmDragEvents.push({name,target:e.target.closest('[data-lineup-slot],[data-special-slot]')?.outerHTML.slice(0,180),data:e.dataTransfer?.getData('text/plain')}));});
 await page.locator('.career-menu').waitFor();
 savePath=path.join(await application.evaluate(({app})=>app.getPath('userData')),'saves','career.json');
}
async function close(){
 const closed=application.waitForEvent('close',{timeout:30000});
 await application.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].close());await closed;application=null;
}
(async()=>{
 try{
  if(!process.env.HM_TEST_EXE)spawnSync(process.execPath,[path.join(__dirname,'stage.cjs')],{stdio:'inherit'});
  await launch();
  // Hosted Windows desktops can be only 1024px wide. Exercise the real
  // desktop layout using native window bounds instead of that host default.
  await application.evaluate(({BrowserWindow})=>{const w=BrowserWindow.getAllWindows()[0];w.unmaximize();w.setContentSize(1366,900);});
  await page.waitForFunction(()=>innerWidth===1366 && innerHeight===900);
  const security=await application.evaluate(({BrowserWindow})=>{const p=BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences();return {sandbox:p.sandbox,contextIsolation:p.contextIsolation,nodeIntegration:p.nodeIntegration};});
  assert.deepEqual(security,{sandbox:true,contextIsolation:true,nodeIntegration:false});
  assert.equal(await page.evaluate(()=>typeof require),'undefined');
  await page.getByRole('button',{name:/Starta ny karriär/}).click();
  await page.locator('.career-club-card').filter({hasText:'HV71'}).click();
  await page.getByRole('button',{name:/Möt styrelsen i HV71/}).click();
  await page.getByRole('button',{name:/Acceptera uppdraget/}).click();
  await page.waitForFunction(()=>careerScreen===null && state.careerStarted);
  await page.getByRole('heading',{name:'Välj riktning för säsongen',exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>state.calendar.date),'2026-08-01');
  assert.equal(await page.evaluate(()=>state.calendar.friendlies.length),5);
  assert.ok((await page.getByRole('heading',{name:'Välj riktning för säsongen',exact:true}).boundingBox()).y<250,'season direction opens at the top');
  await page.screenshot({path:path.join(out,'00-sasongsplan.png'),fullPage:true});
  await page.locator('.season-planning select[name="owner"]').selectOption('manager');
  await page.locator('.season-planning select[name="approach"]').selectOption('youth');
  await page.getByRole('button',{name:/Bekräfta säsongsplanen/}).click();
  assert.equal(await page.evaluate(()=>state.training.assistantOwner),'assistant');
  assert.equal(await page.evaluate(()=>state.juniors.assistantOwner),'assistant');

  await require('./development-ui.cjs')(page,out);
  await page.screenshot({path:path.join(out,'01-klubbkontoret.png'),fullPage:true});
  await page.getByRole('navigation',{name:'Spelets huvudområden'}).getByRole('button',{name:'Laget',exact:true}).click();
  const selected=await page.evaluate(()=>({name:managerRoster()[0].name,id:String(managerRoster()[0].id)}));
  const selectedName=selected.name,id=selected.id;
  await page.locator('.sw-filters input[name="query"]').fill(selectedName);
  await page.locator('.sw-filters').getByRole('button',{name:'Sök',exact:true}).click();
  const link=page.getByRole('region',{name:'Spelartrupp',exact:true}).getByRole('button',{name:selectedName,exact:true});
  await link.click();await page.waitForFunction(id=>String(state.selectedPlayer)===id,id);
  await page.screenshot({path:path.join(out,'02-spelarprofil.png'),fullPage:true});
  await page.locator('#content button[onclick*="deskBack"]').first().click();
  await page.locator('input[name="query"]').waitFor();assert.equal(await page.locator('input[name="query"]').inputValue(),selectedName);
  await page.getByRole('button',{name:'Snittbetyg',exact:true}).first().click();
  assert.match(await page.locator('.squad-workspace').innerText(),/0,0–10,0/);
  await page.getByRole('navigation',{name:'Spelets huvudområden'}).getByRole('button',{name:'Översikt',exact:true}).click();
  assert.equal(await page.locator('.desk-subnav button').count(),2);
  await page.locator('button[onclick="storiesOpen(null)"]').click();
  assert.equal(await page.evaluate(()=>state.page),'home');await page.locator('#overview-stories .stories-page').waitFor();
  await page.getByRole('button',{name:'Stäng historier',exact:true}).click();
  await page.getByRole('button',{name:'Lyssna på supportrarna →',exact:true}).click();
  assert.equal(await page.evaluate(()=>state.page),'home');await page.locator('#overview-press .press-fans').waitFor();
  await page.getByRole('button',{name:'Stäng pressrummet',exact:true}).click();
  await page.getByRole('button',{name:'Stab & uppföljning',exact:true}).click();
  assert.match(await page.locator('.staff-coverage').innerText(),/3 spelklara av 3/);
  assert.equal(await page.locator('.staff-concrete .workspace-tabs').count(),0);
  const staffFont=await page.locator('.staff-concrete h1').evaluate(el=>getComputedStyle(el).fontFamily);
  await page.screenshot({path:path.join(out,'08-stab.png'),fullPage:true});
  await page.getByRole('navigation',{name:'Spelets huvudområden'}).getByRole('button',{name:'Laget',exact:true}).click();
  await page.locator('.desk-subnav').getByRole('button',{name:'Taktik & laguttagning',exact:true}).click();
  assert.equal(await page.locator('.multi-rinks [data-board]').count(),4);
  const originalLineup=await page.evaluate(()=>state.lines.forwards.slice());
  await page.locator('.multi-rinks').scrollIntoViewIfNeeded();
  await page.locator('[data-lineup-slot="forwards-0"]').dragTo(page.locator('[data-lineup-slot="forwards-9"]'),{sourcePosition:{x:5,y:5},targetPosition:{x:5,y:5}});
  assert.equal(await page.evaluate(()=>state.lines.forwards[9]),originalLineup[0]);
  assert.equal(await page.evaluate(()=>state.lines.forwards[0]),originalLineup[9]);
  assert.equal(await page.locator('.multi-lineup h1').evaluate(el=>getComputedStyle(el).fontFamily),staffFont);
  assert.match(await page.locator('.multi-bench').innerText(),/Reserver i matchtruppen/);
  assert.match(await page.locator('.multi-bench').innerText(),/Utanför matchtruppen/);
  // The keyboard/click path reaches the same guarded swap as dragging.
  await page.locator('[data-lineup-slot="forwards-0"] .multi-position').click();
  const candidate=page.locator('.fm-roster-table tr').filter({has:page.locator('[data-player-id="'+originalLineup[0]+'"]')});
  await candidate.getByRole('button',{name:/Välj /}).click();
  assert.equal(await page.evaluate(()=>state.lines.forwards[0]),originalLineup[0]);
  await page.locator('.multi-lineup h1').scrollIntoViewIfNeeded();
  await page.screenshot({path:path.join(out,'09-fyra-kedjor.png'),fullPage:true});
  await page.getByRole('navigation',{name:'Taktikarbetsyta'}).getByRole('button',{name:'Powerplay & boxplay',exact:true}).click();
  assert.equal(await page.locator('.multi-rinks [data-board]').count(),4);
  const specialBefore=await page.evaluate(()=>({a:state.specialTeams.pp1[0],b:state.specialTeams.pp2[0]}));
  await page.locator('[data-special-slot="pp1-0"]').dragTo(page.locator('[data-special-slot="pp2-0"]'),{sourcePosition:{x:5,y:5},targetPosition:{x:5,y:5}});
  assert.equal(await page.evaluate(()=>state.specialTeams.pp1[0]),specialBefore.b);
  assert.equal(await page.evaluate(()=>state.specialTeams.pp2[0]),specialBefore.a);
  for(const [pp,pk] of [['oneThreeOne','box'],['umbrella','diamond'],['overload','box']]){
   await page.locator('select[onchange="specialPlan(\'pp\',this.value)"]').selectOption(pp);
   await page.locator('select[onchange="specialPlan(\'pk\',this.value)"]').selectOption(pk);
   const overlaps=await page.locator('.multi-board').evaluateAll(boards=>boards.flatMap(board=>{
    const slots=[...board.querySelectorAll('.multi-player')].map(el=>({id:el.id,r:el.getBoundingClientRect()}));
    return slots.flatMap((a,i)=>slots.slice(i+1).filter(b=>Math.min(a.r.right,b.r.right)>Math.max(a.r.left,b.r.left)+1&&Math.min(a.r.bottom,b.r.bottom)>Math.max(a.r.top,b.r.top)+1).map(b=>a.id+' / '+b.id));
   }));assert.deepEqual(overlaps,[],'special-team player cards must not overlap');
  }
  await page.locator('.multi-lineup h1').scrollIntoViewIfNeeded();
  await page.screenshot({path:path.join(out,'10-special-teams.png'),fullPage:true});
  const lineupLayout=await page.locator('#content').evaluate(el=>({width:el.scrollWidth,client:el.clientWidth}));
  assert.ok(lineupLayout.width<=lineupLayout.client+1,'four-rink layout fits the desktop width');
  await page.getByRole('navigation',{name:'Spelets huvudområden'}).getByRole('button',{name:'Rekrytering',exact:true}).click();
  const recruitmentNav=page.getByRole('navigation',{name:'Rekrytering',exact:true});
  await recruitmentNav.getByRole('button',{name:'Översikt',exact:true}).click();
  const goalieCard=page.locator('.sc-coverage [data-position="Målvakt"]');
  assert.match(await goalieCard.innerText(),/3 i truppen · 3 spelklara/);
  assert.match(await goalieCard.innerText(),/Ingen antalsbrist/);
  await page.screenshot({path:path.join(out,'05-rekrytering.png'),fullPage:true});
  await recruitmentNav.getByRole('button',{name:'Truppbehov',exact:true}).click();
  await goalieCard.getByText('Visa spelare och avtal',{exact:true}).click();
  assert.match(await goalieCard.innerText(),/Olof Glifford/);
  assert.match(await goalieCard.innerText(),/Herman Liv/);
  assert.match(await goalieCard.innerText(),/Felix Sandström/);
  await page.getByRole('button',{name:'Se truppens kontrakt',exact:true}).first().click();
  assert.equal(await page.evaluate(()=>squadUI.tab),'contracts');
  assert.equal(await page.locator('.sw-filters input[name="query"]').inputValue(),'');
  assert.equal(await page.evaluate(()=>squadUI.position),'B');
  await page.getByRole('navigation',{name:'Spelets huvudområden'}).getByRole('button',{name:'Rekrytering',exact:true}).click();
  await recruitmentNav.getByRole('button',{name:'Sök spelare',exact:true}).click();
  assert.equal(await page.locator('.rh-advanced').evaluate(el=>el.open),false);
  const candidateId=await page.evaluate(()=>String(recruitHub.player));
  await page.getByRole('region',{name:'Nästa steg för spelaren'}).getByRole('button',{name:'Beställ scoutrapport',exact:true}).click();
  await page.locator('.sc-brief').waitFor();
  await page.locator('.sc-brief select[onchange*="method"]').selectOption('screen');
  const scoutingBefore=await page.evaluate(()=>({cash:state.money,fee:scoutingQuote(scoutDesk.draft.players,scoutDesk.draft.method,scoutDesk.draft.person).fee}));
  await page.locator('.sc-brief').getByRole('button',{name:/Starta uppdrag/}).click();
  assert.equal(await page.evaluate(()=>state.money),scoutingBefore.cash-scoutingBefore.fee);
  assert.equal(await page.evaluate(id=>scoutPending(id),candidateId),true);
  await page.locator('.sc-fields select[name="profile"]').selectOption('Målskytt');
  await page.locator('.sc-fields select[name="league"]').selectOption('SHL');
  await page.locator('.sc-fields select[name="placement"]').selectOption('Andra kedjan');
  await page.locator('.sc-fields select[name="targetRole"]').selectOption('key');
  await page.locator('.sc-fields input[name="maxSalary"]').fill('5000000');
  await page.getByRole('button',{name:'Ta fram uppdrag',exact:true}).click();
  assert.equal(await page.evaluate(()=>scoutDesk.draft.criteria.targetRole),'key');
  assert.equal(await page.evaluate(()=>scoutDesk.draft.criteria.league),'SHL');
  assert.equal(await page.locator('.sc-fields select[name="targetRole"]').inputValue(),'key');
  await page.screenshot({path:path.join(out,'06-scouting.png'),fullPage:true});
  await recruitmentNav.getByRole('button',{name:'Sök spelare',exact:true}).click();
  await page.screenshot({path:path.join(out,'07-spelarsokning.png'),fullPage:true});
  const searchLayout=await page.locator('.recruit-hub').evaluate(el=>({width:el.scrollWidth,client:el.clientWidth}));
  assert.ok(searchLayout.width<=searchLayout.client+1,'recruitment does not overflow horizontally');
  // Use the same daily controls as a tester, including the transition layer.
  for(let day=0;day<10 && await page.evaluate(()=>state.calendar.date<calendarTarget());day++){
   const before=await page.evaluate(()=>state.calendar.date);
   await page.locator('#continueGame').click();
   await page.waitForFunction(before=>state.calendar.date!==before && dayTransition===null,before);
  }
  assert.equal(await page.evaluate(()=>state.calendar.date),await page.evaluate(()=>calendarTarget()));
  await page.locator('#continueGame').click();
  if(!await page.evaluate(()=>Boolean(state.live)))await page.locator('#content button[onclick*="createMatch"]').click();
  await page.locator('#match-play').click();await page.waitForFunction(()=>state.live?.running);
  await page.waitForFunction(()=>studioEngine().time>0);
  await page.locator('#match-play').click();await page.waitForFunction(()=>!state.live.running);
  await page.waitForFunction(()=>Boolean(matchIceCrest(matchVenue().home)?.naturalWidth));
  assert.equal(await page.locator('.mc-club strong').first().textContent(),await page.evaluate(()=>matchVenue().home));
  assert.match(await page.locator('.mc-result').innerText(),/Husqvarna Garden/);
  // Fullscreen must work in the installed application, then restore the
  // desktop size before checking that rink and controls fit without scrolling.
  await page.getByRole('button',{name:'Helskärm',exact:true}).click();
  await page.waitForFunction(()=>Boolean(document.fullscreenElement));
  await page.getByRole('button',{name:'Helskärm',exact:true}).click();
  await page.waitForFunction(()=>!document.fullscreenElement);
  await application.evaluate(({BrowserWindow})=>{const w=BrowserWindow.getAllWindows()[0];w.unmaximize();w.setContentSize(1366,768);});
  await page.waitForFunction(()=>innerWidth===1366 && innerHeight===768);
  const layout=await page.evaluate(()=>{
   const rect=selector=>{const r=document.querySelector(selector).getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
   return {viewport:{width:innerWidth,height:innerHeight},rink:rect('#career-ice'),controls:rect('.mc-playback')};
  });
  for(const [name,rect] of Object.entries({rink:layout.rink,controls:layout.controls})){
   assert.ok(rect.width>0 && rect.height>0 && rect.x>=0 && rect.y>=0 && rect.right<=layout.viewport.width+1 && rect.bottom<=layout.viewport.height+1,name+' fits the desktop viewport');
  }
  fs.writeFileSync(path.join(out,'layout-result.json'),JSON.stringify(layout,null,2));
  await page.locator('#match-play').click();await page.waitForFunction(()=>state.live.running);
  // Closing a running match must pause and persist it through the real native close handler.
  await page.screenshot({path:path.join(out,'03-match.png'),fullPage:true});
  await close();
  const saved=JSON.parse(JSON.parse(fs.readFileSync(savePath,'utf8')).payload);
  assert.equal(saved.live.running,false);assert.ok(saved.live.broadcast);
  await launch();await page.getByRole('button',{name:/FORTSÄTT KARRIÄR/}).click();
  assert.equal(await page.evaluate(()=>JSON.stringify(state.live)),JSON.stringify(saved.live));
  await page.locator('.settings-item').click();await page.getByText('Spelguide – din första vecka',{exact:true}).click();
  await page.screenshot({path:path.join(out,'04-spelguide.png'),fullPage:true});
  const exported=path.join(out,'exported-career.json');
  await application.evaluate(({session},destination)=>{session.defaultSession.on('will-download',(_event,item)=>item.setSavePath(destination));},exported);
  await page.getByRole('button',{name:'Exportera sparfil',exact:true}).click();
  await page.waitForTimeout(1000);assert.ok(fs.existsSync(exported));
  const old=JSON.parse(fs.readFileSync(exported,'utf8'));assert.equal(old.career.managerClub,'HV71');
  await page.locator('input[type=file]').setInputFiles(exported);
  await page.getByRole('button',{name:'Läs in denna karriär',exact:true}).click();
  assert.equal(await page.evaluate(()=>state.live.running),false);
  await page.getByText('Återställ en automatisk säkerhetskopia',{exact:true}).click();
  await page.getByRole('button',{name:'Granska säkerhetskopia'}).first().click();
  await page.getByRole('button',{name:'Läs in denna karriär',exact:true}).click();
  await page.getByText('Rapportera ett problem',{exact:true}).click();
  const report=await page.evaluate(()=>JSON.parse(betaReportText()));assert.equal(report.version,require('./package.json').version);assert.equal(report.platform,'desktop');
  assert.equal(await page.evaluate(()=>careerSaveError),false);
  await close();
  assert.deepEqual(errors,[],'renderer errors');
  fs.writeFileSync(path.join(out,'smoke-result.json'),JSON.stringify({version:require('./package.json').version,installed:!!process.env.HM_TEST_EXE,platform:process.platform,checks:['August 1 onboarding and five booked friendlies','assistant responsibilities saved','specific SHL scorer/key-player scouting brief','home team first and actual ice crest loaded','overview embeds stories and press','concrete staff follow-up and consistent font','four simultaneous line rinks with actual drag and click swaps','four simultaneous special-team rinks with cross-unit dragging and no card overlap for any scheme','numeric average-rating squad view','HV71: three ready goalies and no headcount shortage','recruitment depth explains named players and contracts','scouting request and exact charge via installed controls','search advanced filters collapsed and no horizontal overflow','native sandbox','new career','filtered squad → profile → same filter','daily continue control to match','match clock advances and pause/resume works','fullscreen entry/exit','rink and controls visible at 1366x768','running match → close → disk → restart paused with identical match state','native save export','file import','backup preview and recovery','guide and diagnostic report'],errors},null,2));
  fs.rmSync(exported,{force:true}); // Do not publish test careers in build artifacts.
  console.log('PASS: real Electron UI, disk save/restart, import/export and backup recovery.');
 }catch(error){if(page)try{fs.writeFileSync(path.join(out,'drag-debug.json'),JSON.stringify(await page.evaluate(()=>({events:window.hmDragEvents,lines:state.lines,specialTeams:state.specialTeams})),null,2));await page.screenshot({path:path.join(out,'failure.png'),fullPage:true});}catch{}throw error;}
 finally{if(application)try{await application.evaluate(({app})=>app.exit(1));}catch{}}
})().catch(error=>{console.error(error);process.exitCode=1;});
