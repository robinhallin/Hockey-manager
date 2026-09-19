const test=require('node:test'),assert=require('node:assert/strict');
const {boot}=require('./scripts/career-test-fixture.cjs');
function game(){const a=boot();a.run("startCareerWithClub('HV71')");return a;}
function prospect(a){a.run("state.calendar.date='2026-09-13';globalThis.p=state.juniors.roster.find(p=>p.pos==='B');p.age=19;p.nhlDraft={year:2026,club:'Seattle Kraken',round:2,overall:42,expires:'2030-06-30'};for(const k of Object.keys(p.attributes))p.attributes[k]=14;p.health={load:0,injury:null,clearance:'rest'};p.fatigue=0;naSign(naOffer(p,managerClub()));globalThis.l=state.naLeagues.season.leagues.AHL;globalThis.g=l.games.find(g=>g.home===naLocation(p)||g.away===naLocation(p))");}
test('balanced full schedules, real divisions, deterministic dates and no same-day double bookings',()=>{
 const a=game(),r=a.run;
 for(const [league,count] of [['NHL',84],['AHL',72]]){
  r(`globalThis.gs=state.naLeagues.season.leagues.${league}.games`);assert.equal(r('gs.length'),32*count/2);assert.equal(r('new Set(gs.map(g=>g.id)).size'),32*count/2);
  assert.equal(r(`nasClubs('${league}').every(c=>gs.filter(g=>g.home===c).length===${count/2}&&gs.filter(g=>g.away===c).length===${count/2})`),true);
  assert.equal(r(`nasClubs('${league}').every(c=>new Set(gs.filter(g=>g.home===c||g.away===c).map(g=>g.date)).size===${count})`),true);
  assert.equal(r(`JSON.stringify(gs)===JSON.stringify(nasSchedule('${league}',2026))`),true);
 }
 assert.equal(r("Object.values(NAS_DIVISIONS.AHL).flat().every(c=>Object.values(NA_AFFILIATES).includes(c))"),true);
});
test('full seasons produce valid champions, standings and goal/shot/series conservation',()=>{
 const a=game(),r=a.run;r('nasOffseason()');
 for(const [league,games,series] of [['NHL',84,15],['AHL',72,22]]){
  r(`globalThis.l=state.naLeagues.season.leagues.${league}`);assert.equal(r('l.phase'),'complete');assert.ok(r('l.champion'));assert.equal(r('l.series.length'),series);assert.equal(r('l.games.every(g=>g.played)'),true);
  assert.equal(r(`nasTable(l,'${league}').every(r=>r.gp===${games}&&r.gp===r.w+r.l+r.otl&&r.pts===r.w*2+r.otl)`),true);
  assert.equal(r(`nasTable(l,'${league}').reduce((n,r)=>n+r.pts,0)`),r("l.games.filter(g=>g.stage==='regular').reduce((n,g)=>n+2+Number(g.overtime),0)"));
  assert.equal(r("l.games.every(g=>g.hg!==g.ag&&g.hg+g.ag===g.events.length+Number(g.shootout)&&g.shots[0]+g.shots[1]>=g.events.length&&g.events.every(e=>e.time<=g.duration)&&(!g.shootout||g.stage==='regular'))"),true);
  assert.equal(r("l.series.every(s=>s.wins[s.winner]===Math.ceil(s.best/2)&&l.games.filter(g=>g.series===s.id).length<=s.best)"),true);
  const mean=r('l.games.reduce((n,g)=>n+g.hg+g.ag,0)/l.games.length');assert.ok(mean>4&&mean<8);
 }
 const before=r('JSON.stringify(state.naLeagues)');r('nasOffseason()');assert.equal(r('JSON.stringify(state.naLeagues)'),before);
});
test('tracked player gets conserved match stats and workload, deterministic reload and no duplicated day',()=>{
 const a=game(),r=a.run;prospect(a);r('state.calendar.date=g.date;save()');const b=boot(a.storage.value);
 r('nasDay()');b.run('nasDay()');assert.equal(r('JSON.stringify(state.naLeagues)'),b.run('JSON.stringify(state.naLeagues)'));
 assert.equal(r('g.players.filter(q=>q.id===p.id).length'),1);assert.equal(r('p.naSeasons[0].games'),1);assert.ok(r('p.naSeasons[0].seconds')>0);assert.ok(r('p.fatigue')>0);assert.equal(r('managerRoster().some(q=>q.id===p.id)'),false);
 r('globalThis.before=JSON.stringify(state);nasDay();nasPlay(l,g,"AHL",2026)');assert.equal(r('JSON.stringify(state)'),r('before'));
 assert.equal(r('p.naSeasons[0].goals'),r('g.events.filter(e=>e.id===p.id).length'));
 assert.equal(r('naBorrow(p.id)'),false,'cannot play in North America and join Swedish club on same date');
});
test('JVM duty, injury, Swedish loans and arrival date exclude foreign appearances',()=>{
 for(const condition of ["p.internationalDuty={from:g.date,until:calAdd(g.date,5),returned:false}","p.health.injury={remaining:4}","p.naAvailableFrom=calAdd(g.date,1)","p.naContract.assignment='Sweden'"]){const a=game(),r=a.run;prospect(a);r(condition+';nasPlay(l,g,"AHL",2026)');assert.equal(r('g.players.some(q=>q.id===p.id)'),false);assert.equal(r('(p.naSeasons||[]).length'),0);}
});
test('goalkeeper saves plus goals against equal opposition shots; overtime ice budgets conserve',()=>{
 const a=game(),r=a.run;r("globalThis.p=state.juniors.roster.find(p=>p.pos==='MV');p.age=19;p.nhlDraft={year:2026,club:'Boston Bruins',round:1,overall:4,expires:'2030-06-30'};for(const k of Object.keys(p.attributes))p.attributes[k]=18;p.health={load:0,injury:null,clearance:'rest'};state.calendar.date='2026-09-13';naSign(naOffer(p,managerClub()));globalThis.l=state.naLeagues.season.leagues.NHL;globalThis.g=l.games.find(g=>[g.home,g.away].includes('Boston Bruins'));globalThis.result=nasSimulate(g,'NHL',2026)");
 assert.equal(r('result.sides.flatMap(s=>s.rows).find(q=>q.p===p).seconds'),r('result.duration'));
 assert.equal(r('result.sides.every((s,i)=>s.keeper.saves+s.keeper.against===result.shots[1-i])'),true);
 assert.equal(r('result.sides.every(s=>s.skaters.reduce((n,q)=>n+q.seconds,0)===18000+(result.duration-3600)*3)'),true);
});
test('late-save migration starts next year; views preserve state; paused match blocks processing',()=>{
 const a=game(),r=a.run;r("delete state.naLeagues;state.calendar.date='2026-12-10';ensureNASeasons()");assert.equal(r('state.naLeagues.season.year'),2027);
 const before=r('JSON.stringify(state)');r("for(const tab of ['table','games','playoffs','players','history']){nasUI.tab=tab;nasView()}render()");assert.equal(r('JSON.stringify(state)'),before);
 r("state.live={finished:false};globalThis.before=JSON.stringify(state);nasDay();nasOffseason()");assert.equal(r('JSON.stringify(state)'),r('before'));
});
test('real preseason transition completes season before aging, retains player ledger and archives',()=>{
 const a=game(),r=a.run;prospect(a);r("globalThis.age=p.age;state.season.phase='review';state.season.boardResult=[];beginPreseason()");assert.equal(r('p.age'),r('age+1'));assert.equal(r('state.naLeagues.history[0].year'),2026);assert.ok(r('state.naLeagues.history[0].leagues.NHL.champion'));assert.ok(r('state.naLeagues.history[0].leagues.AHL.champion'));assert.equal(r('state.naLeagues.season.year'),2027);assert.ok(r('p.naSeasons.some(s=>s.year===2026&&s.games>0)'));
 r('save()');const b=boot(a.storage.value);assert.equal(b.run('JSON.stringify(state.naLeagues)'),r('JSON.stringify(state.naLeagues)'));
 assert.ok(r('saveExportText().length')<4500000);
 r("nasUI.year='2026';globalThis.before=JSON.stringify(state);globalThis.archived=nasSelectedSeason();nasView()");assert.equal(r('archived.leagues.NHL.games.every(g=>g.played)'),true);assert.equal(r('JSON.stringify(state)'),r('before'));
 b.run("nasUI.year='2026'");assert.equal(b.run('JSON.stringify(nasSelectedSeason())'),r('JSON.stringify(archived)'));
});
