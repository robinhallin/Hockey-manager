'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const test=require('node:test');

// Focused module tests: run the production J20 wrapper, retally and table.
// The dependency fixture models juniorFixture's capped 16-report buffer;
// this does not replace a full career/match-engine integration test.
function boot(saved){
 const players=['C','VF','HF','MV'].map((pos,i)=>({id:'junior-'+i,name:'Junior '+i,pos,age:18,goals:0,assists:0,
  attributes:{shooting:10,positioning:10,composure:10,puckControl:10,passing:10,vision:10,decisions:10},
  academy:{role:'test',goals:0,assists:0,history:[]}}));
 const state=saved?JSON.parse(saved):{careerStarted:true,season:{year:2026,phase:'regular'},round:1,
  calendar:{date:'2026-09-10'},world:{membership:{HV71:'SHL',Farjestad:'SHL',AIK:'HA',Modo:'HA'}},
  juniors:{roster:players,matches:[],lastFixture:null}};
 const c={state,playable:true,managerClub:()=> 'HV71',leagueOf:club=>state.world.membership[club||'HV71'],
  ensureJuniors(){},ensureClubAI(){},clubAIState:()=>({academy:{roster:[]}}),
  medicalReady:()=>true,PLAYER_ROLES:{test:{shooting:1}},juniorRoles:()=>['test'],
  attributeWeighted:a=>a.shooting,ensurePlayerAttributes:p=>p.attributes,attrSeed:()=>.5,
  juniorById:id=>state.juniors.roster.find(p=>p.id===id)};
 c.juniorFixture=key=>{
  const s=state.juniors;if(s.lastFixture===key)return;s.lastFixture=key;
  if(!c.playable)return;
  const rows=s.roster.map(p=>{
   const goals=p.pos==='C'?1:0,assists=p.pos==='VF'?1:0;
   p.academy.goals+=goals;p.academy.assists+=assists;
   p.academy.history.unshift({year:state.season.year,round:state.round,path:'junior',opponent:'Legacy opponent',goals,assists});
   p.academy.history=p.academy.history.slice(0,16);
   return {id:p.id,name:p.name,seconds:900,goals,assists};
  });
  s.matches.unshift({year:state.season.year,round:state.round,opponent:'Legacy opponent',own:1,against:2,players:rows});
  s.matches=s.matches.slice(0,16);
 };
 vm.createContext(c);
 vm.runInContext(fs.readFileSync(path.join(__dirname,'junior-world.js'),'utf8'),c,{filename:'junior-world.js'});
 return c;
}
function play(c,round){c.state.round=round;c.state.calendar.date=`2026-10-${String((round-1)%28+1).padStart(2,'0')}`;c.juniorFixture('fixture:'+round);}
function managerResult(c,round){return c.state.juniorWorld.results.find(g=>g.round===round&&(g.home==='HV71'||g.away==='HV71'));}
function ownGoals(g){return g.home==='HV71'?g.homeGoals:g.awayGoals;}

test('a full report buffer never turns the 17th or later played game into a forfeit',()=>{
 const c=boot();
 for(let round=1;round<=52;round++){
  play(c,round);
  assert.equal(managerResult(c,round).forfeit,false,'played round '+round+' must not be forfeited');
  assert.equal(c.state.juniors.matches.length,Math.min(round,16));
  assert.equal(c.state.juniors.matches[0].j20,true);
 }
 assert.equal(c.juniorWorldTable('SHL').find(r=>r.name==='HV71').gp,52);
});
test('report, table and individual goals agree beyond the archive limit',()=>{
 const c=boot();for(let round=1;round<=20;round++)play(c,round);
 const result=managerResult(c,20),report=c.state.juniors.matches[0];
 assert.equal(report.own,ownGoals(result));
 assert.equal(report.players.reduce((n,p)=>n+p.goals,0),report.own);
 const table=c.juniorWorldTable('SHL').find(r=>r.name==='HV71');
 assert.equal(c.state.juniors.roster.reduce((n,p)=>n+p.academy.goals,0),table.gf);
 assert.equal(c.state.juniors.roster.reduce((n,p)=>n+p.goals+p.assists,0),0,'senior totals stay separate');
});
test('repeating a fixture key changes neither results nor player accounting',()=>{
 const c=boot();for(let round=1;round<=17;round++)play(c,round);
 const before=JSON.stringify(c.state);c.juniorFixture('fixture:17');
 assert.equal(JSON.stringify(c.state),before);
});
test('an unplayable squad still forfeits instead of reusing the last report',()=>{
 const c=boot();for(let round=1;round<=16;round++)play(c,round);
 const reportBefore=JSON.stringify(c.state.juniors.matches[0]);c.playable=false;play(c,17);
 assert.equal(managerResult(c,17).forfeit,true);
 assert.equal(JSON.stringify(c.state.juniors.matches[0]),reportBefore);
});
test('a full buffer after JSON save/reload accepts the next report',()=>{
 const c=boot();for(let round=1;round<=16;round++)play(c,round);
 const restored=boot(JSON.stringify(c.state));play(restored,17);
 assert.equal(managerResult(restored,17).forfeit,false);
 assert.equal(restored.state.juniors.matches.length,16);
});
test('no J20 league result is added outside the regular season',()=>{
 const c=boot();play(c,1);const results=JSON.stringify(c.state.juniorWorld.results);
 c.state.season.phase='preseason';play(c,2);
 assert.equal(JSON.stringify(c.state.juniorWorld.results),results);
});
