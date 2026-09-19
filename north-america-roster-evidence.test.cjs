const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {boot}=require('./scripts/career-test-fixture.cjs');
function evidence(){const c=vm.createContext({});vm.runInContext(fs.readFileSync('north-america-roster-data.js','utf8'),c);return JSON.parse(vm.runInContext('JSON.stringify(NA_ROSTER_EVIDENCE)',c));}
test('dated evidence covers every current club without inventing missing AHL players',()=>{
 const d=evidence(),a=boot();
 assert.equal(d.version,1);assert.equal(d.season,'2026-27');assert.match(d.checked,/^\d{4}-\d{2}-\d{2}$/);
 for(const league of ['NHL','AHL'])assert.deepEqual(d.teams.filter(t=>t.league===league).map(t=>t.club).sort(),JSON.parse(a.run(`JSON.stringify(nasClubs('${league}').sort())`)));
 for(const t of d.teams){assert.match(t.digest,/^[a-f0-9]{64}$/);assert.equal(t.sourceSeason,d.season);assert.ok(t.source.startsWith(t.league==='NHL'?'https://site.api.espn.com/':'https://lscluster.hockeytech.com/'));assert.equal(new Set(t.players.map(p=>p[0])).size,t.players.length);assert.equal(t.players.length===0,t.kind==='not-published');for(const p of t.players){assert.equal(p.length,6);assert.match(p[0],/^\d+$/);assert.ok(p[1].length>1);assert.ok(['C','B','MV','F','VF','HF'].includes(p[2]));assert.ok(!p[3]||/^\d{4}-\d{2}-\d{2}$/.test(p[3]));}}
 const loc={};for(const t of d.teams)for(const p of t.players)(loc[t.league+':'+p[0]]??=[]).push(t.club);
 assert.deepEqual(d.conflicts,Object.fromEntries(Object.entries(loc).filter(([,v])=>v.length>1)));
 assert.ok(d.teams.filter(t=>t.league==='NHL').every(t=>t.players.length>0));
});
test('search, filters and paging read evidence without changing live career or save size',()=>{
 const a=boot(),r=a.run;r("startCareerWithClub('HV71');state.calendar.date=calendarTarget();startMatch();pauseMatch();deskNavigate('nhl');nhlUI.tab='leagues';nasUI.tab='rosters';render()");const before=r('JSON.stringify(state)');
 r("narSet('club','Toronto Maple Leafs');narSet('query','matthews')");assert.equal(r('narRows().length'),1);assert.equal(r('narRows()[0].name'),'Auston Matthews');assert.match(r('nasView()'),/ännu inte aktiverade/);
 r("narSet('position','MV')");assert.equal(r('narRows().length'),0);
 r("narSet('position','all');narSet('query','');narSet('club','all');narSet('page',1)");assert.equal(r('narUI.page'),1);assert.match(r('narView()'),/Sida 2 av/);
 r("narSet('league','AHL')");assert.equal(r('narUI.page'),0);assert.equal(r('narUI.club'),'all');assert.match(r('narView()'),/äldre trupper|källposter/);
 r("narSet('league','NHL');narSet('query','<img src=x onerror=alert(1)>')");assert.doesNotMatch(r('narView()'),/<img src=x/);assert.equal(r('JSON.stringify(state)'),before);
 r("narSet('query','');narSet('page',99999)");assert.equal(r('narUI.page'),0);assert.equal(r("narNormalize('Émil HÖGLANDER')"),'emil hoglander');
});
test('staff-only AHL response cannot silently become a playing roster',()=>{
 const {execFileSync}=require('node:child_process');
 execFileSync('python3',['-B','-c',`import importlib.util
s=importlib.util.spec_from_file_location('rosters','scripts/import-na-roster-evidence.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
assert m.ahl_players([[{'person_id':'1','role':'Head Coach','name':'Coach'}]]) == []
assert m.ahl_players([{'player_id':'25','name':'Player'},[{'person_id':'1','role':'Coach'}]]) == [{'player_id':'25','name':'Player'}]
`]);
});
