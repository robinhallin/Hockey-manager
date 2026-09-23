'use strict';
// Run with Playwright and CHROMIUM_EXECUTABLE supplied by the local test environment.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=process.env.MARKET_SCREENSHOTS||'/tmp/hockey-market-ui';
const {chromium}=require(require.resolve('playwright',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||root]}));
const server=http.createServer((req,res)=>{
 const name=decodeURIComponent(new URL(req.url,'http://local').pathname),file=path.resolve(root,'.'+(name==='/'?'/index.html':name));
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end();return;}
 res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream');
 res.end(fs.readFileSync(file));
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{}),args:['--no-sandbox','--single-process','--no-zygote','--use-gl=angle','--use-angle=swiftshader','--in-process-gpu']});
 try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port);
 await page.evaluate(()=>{
  startCareerWithClub('HV71');globalThis.testPlayer=managerRoster().filter(p=>p.pos==='MV')[2];const p=testPlayer;
  p.age=20;p.salary=250000;p.contractYears=3;for(const k in p.attributes)p.attributes[k]=15;
  const buyer='AIK';for(const g of [...state.clubRosters[buyer]].filter(p=>p.pos==='MV')){state.clubRosters[buyer]=state.clubRosters[buyer].filter(p=>p!==g);worldRelease(g,buyer,'Browser fixture');}
  state.recruitment.ai[buyer].cash=100000000;state.recruitment.ai[buyer].wageLimit=100000000;
  clubAIState(buyer).scouting[p.id]={visits:3,snapshot:{...p.attributes},date:state.calendar.date};
  aiScoutClub(buyer,[{...p,team:managerClub()}]);officeOpenDeal('incoming:'+state.recruitment.incoming[0].id);
 });
 const offerId=await page.evaluate(()=>state.recruitment.incoming[0].id);page.setDefaultTimeout(8000);
 await page.getByText('Lämna motbud',{exact:true}).click();
 await page.locator('select[name="amount"]').selectOption('0.75');
 await page.getByRole('button',{name:'Skicka motbud',exact:true}).click();
 assert.equal(await page.evaluate(id=>state.recruitment.incoming.find(o=>o.id===id).stage,offerId),'counter_wait');
 await page.reload();await page.getByRole('button',{name:/Fortsätt karriär/i}).click();
 await page.evaluate(id=>{state.calendar.date=calAdd(state.calendar.date,2);calendarMarketDay();officeOpenDeal('incoming:'+id);},offerId);
 await page.screenshot({path:path.join(out,'counter-response.png'),fullPage:true});
 assert.equal(await page.locator('select[name="amount"]').inputValue(),'0.75');
 await page.screenshot({path:path.join(out,'incoming-loan.png'),fullPage:true});
 await page.getByRole('button',{name:'Godkänn klubböverenskommelsen',exact:true}).click();
 assert.equal(await page.evaluate(id=>state.recruitment.incoming.find(o=>o.id===id).stage,offerId),'club_agreed');
 assert.equal(await page.evaluate(id=>getPlayerClub(state.recruitment.incoming.find(o=>o.id===id).playerId),offerId),'HV71');
 await page.reload();await page.getByRole('button',{name:/Fortsätt karriär/i}).click();await page.evaluate(()=>{state.calendar.date=calAdd(state.calendar.date,1);calendarMarketDay();recruitHub.affairs='active';deskNavigate('transfers','deals');});
 assert.equal(await page.evaluate(id=>state.recruitment.incoming.find(o=>o.id===id).status,offerId),'accepted');
 assert.ok((await page.locator('#content').innerText()).includes('Aktivt lån'));
 await page.screenshot({path:path.join(out,'active-loan.png'),fullPage:true});
 // The player link opens the actual profile, not another negotiation record.
 const playerName=await page.evaluate(id=>state.recruitment.incoming.find(o=>o.id===id).name,offerId);
 await page.locator('#content').getByRole('link',{name:playerName,exact:true}).first().click();
 assert.notEqual(await page.evaluate(()=>state.page),'transfers');
 await page.evaluate(()=>deskNavigate('transfers','missions'));
 await page.getByText('Ge scouten ett behov att lösa',{exact:true}).click();
 await page.locator('select[name="profile"]').selectOption('Defensiv back');
 await page.locator('input[name="maxSalary"]').fill('1200000');
 await page.getByRole('button',{name:'Ta fram uppdrag',exact:true}).click();
 await page.screenshot({path:path.join(out,'scout-brief.png'),fullPage:true});
 await page.getByRole('button',{name:/Starta uppdrag/}).click();
 assert.equal(await page.evaluate(()=>scoutingOffice().jobs[0].criteria.maxSalary),1200000);
 await page.reload();await page.getByRole('button',{name:/Fortsätt karriär/i}).click();assert.equal(await page.evaluate(()=>scoutingOffice().jobs[0].criteria.placement),'Tredje backparet');
 for(const width of [1440,1280]){
  await page.setViewportSize({width,height:900});
  for(const tab of ['overview','needs','missions','deals']){
   await page.evaluate(tab=>deskNavigate('transfers',tab),tab);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true,tab+' horizontal overflow at '+width);
  }
 }
 assert.deepEqual(errors,[]);console.log('PASS: real Chromium clicks for loan counter, reload, explicit approval, player stage, active loan, player profile, criterion brief, persisted mission and 1280/1440 layouts. Screenshots: '+out);
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
