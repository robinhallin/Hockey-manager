'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {CareerDiskStore}=require('./desktop/storage.cjs');
const {resourcePath,trustedPage}=require('./desktop/protocol.cjs');
const {boot}=require('./scripts/career-test-fixture.cjs');
const KEY='hockey_manager_alpha02';
function setup(t,io=fs,clock){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'hm-beta-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));return new CareerDiskStore(dir,io,clock);}
const sample=n=>JSON.stringify({version:'0.2',teams:[{name:'HV71'}],clubRosters:{HV71:[]},round:n,money:123,managerClub:'HV71',calendar:{date:'2026-09-23'}});
test('atomic saves survive write failure and expose verified, bounded recovery points',t=>{
 let fail=false,now=2000000000000;
 const io=Object.create(fs);io.renameSync=(from,to)=>{if(fail&&path.basename(to)==='career.json')throw Error('Disk full');fs.renameSync(from,to);};
 const store=setup(t,io,()=>now);
 store.setItem(KEY,sample(1));fail=true;
 assert.throws(()=>store.setItem(KEY,sample(2)),/Disk full/);assert.equal(store.getItem(KEY),sample(1));
 fail=false;for(let i=2;i<=10;i++){now+=600001;store.setItem(KEY,sample(i));}
 assert.equal(store.listBackups().length,6);assert.equal(store.getItem(KEY),sample(10));
 const previous=store.listBackups().find(b=>b.id.endsWith('latest.json'));assert.equal(JSON.parse(store.readBackup(previous.id)).round,9);
 assert.throws(()=>store.readBackup('../career.json'));assert.throws(()=>store.getItem('../outside'));assert.throws(()=>store.setItem(KEY,'{}'));
 assert.ok(!fs.readdirSync(store.directory).some(n=>n.endsWith('.tmp')));
 const raw=fs.readFileSync(store.file(KEY),'utf8').replace('"sha256":"','"sha256":"broken');fs.writeFileSync(store.file(KEY),raw);
 assert.throws(()=>store.getItem(KEY),/kontrollsumma/);assert.equal(fs.readFileSync(store.file(KEY),'utf8'),raw);
 store.setItem(KEY,store.readBackup(previous.id));
 assert.equal(JSON.parse(store.getItem(KEY)).round,9);assert.equal(fs.readFileSync(path.join(store.directory,fs.readdirSync(store.directory).find(n=>n.includes('-damaged-'))),'utf8'),raw);
});
test('desktop bridge round-trips a real old browser save, paused match, backup import and close',t=>{
 const legacy=boot();legacy.run("startCareerWithClub('AIK');state.calendar.date=calendarTarget();startMatch();pauseMatch();save()");
 const store=setup(t);let closed=null,close;
 const window={addEventListener(){},matchMedia:()=>({matches:false,addEventListener(){}}),hockeyDesktop:{storage:store,version:'0.1.0-beta.1',backups:()=>store.listBackups(),readBackup:id=>store.readBackup(id),onClose:fn=>{close=fn;},closeReady:ok=>{closed=ok;}}};
 const desktop=boot(null,{window}),r=desktop.run;
 r(`saveFilePreview=validateSaveText(${JSON.stringify(legacy.run('saveExportText()'))});applyCareerImport()`);
 assert.equal(r('managerClub()'),'AIK');assert.equal(r('state.live.running'),false);
 assert.equal(desktop.storage.value,null,'desktop must not write browser storage');
 const live=r('JSON.stringify(state.live)');r('save()');
 const restarted=boot(null,{window});assert.equal(restarted.run('JSON.stringify(state.live)'),live);
 restarted.run('state.money+=1000;save()');assert.ok(store.listBackups().length);
 const id=store.listBackups()[0].id;
 restarted.run(`betaBackupPreview(${JSON.stringify(id)})`);assert.equal(restarted.run('saveFilePreview.managerClub'),'AIK');
 restarted.run('applyCareerImport()');assert.equal(restarted.run('state.money'),legacy.run('state.money'));
 close();assert.equal(closed,true);assert.equal(JSON.parse(store.getItem(KEY)).live.running,false);
 const backend=window.hockeyDesktop.storage;window.hockeyDesktop.storage={...backend,getItem:()=>null,setItem:()=>{throw Error('No disk');}};
 close();assert.equal(closed,false,'failed close save must keep window open');
});
test('app resources and navigation cannot escape the game directory; version labels agree',()=>{
 assert.equal(trustedPage('hockey://app/index.html#player/123'),true);assert.equal(trustedPage('https://app/index.html'),false);
 assert.throws(()=>resourcePath('/game','hockey://app/%2e%2e%2fsecret.json'));
 assert.throws(()=>resourcePath('/game','hockey://app/%5c..%5csecret.json'));
 assert.throws(()=>resourcePath('/game','https://app/index.html'));
 assert.throws(()=>resourcePath('/game','hockey://app/main.cjs'));
 assert.equal(resourcePath('/game','hockey://app/assets/crests/a.svg?v=1').file,path.resolve('/game/assets/crests/a.svg'));
 const version=require('./desktop/package.json').version;
 assert.ok(fs.readFileSync('index.html','utf8').includes('content="'+version+'"'));assert.ok(fs.readFileSync('beta-support.js','utf8').includes("VERSION='"+version+"'"));
});


test('beta diagnostics expose bounded timing summaries without career data',()=>{
 const r=boot().run;
 r("performanceProfile.samples.nextDay=[12,18];performanceProfile.samples.nextDayAborted=[7]");
 const report=JSON.parse(r('betaReportText()'));
 assert.deepEqual(report.performance.metrics.nextDay,{count:2,last:18,avg:15,max:18});
 assert.equal(report.performance.metrics.nextDayAborted.count,1);
 assert.equal(report.performance.sampleWindow,30);assert.equal(report.performance.unit,'ms');
 assert.equal(report.clubRosters,undefined);assert.equal(report.roster,undefined);
 assert.match(r('betaSupportView()'),/ännu inte spelbara/);
});
