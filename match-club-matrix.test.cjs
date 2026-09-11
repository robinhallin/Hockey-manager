const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {boot}=require('./scripts/career-test-fixture.cjs');
global.StudioHockey=require('./match-simulation');
vm.runInThisContext(fs.readFileSync('match-rules-3.js','utf8'),{filename:'match-rules-3.js'});
const {Match}=StudioHockey;
const app=boot(),r=app.run;
r("startCareerWithClub('HV71')");
const clubs=r("Object.keys(state.world.membership).filter(c=>leagueOf(c)==='SHL')");
function snapshot(club){return JSON.parse(r(`JSON.stringify({name:${JSON.stringify(club)},players:(state.clubRosters[${JSON.stringify(club)}]||[]).filter(medicalReady).map(p=>({id:p.id,name:p.name,pos:p.pos,attributes:{...ensurePlayerAttributes(p)}}))})`));}
function strength(team){const skaters=team.players.filter(p=>p.pos!=='MV');return skaters.reduce((n,p)=>n+Object.values(p.attributes).reduce((a,b)=>a+b,0)/Object.values(p.attributes).length,0)/Math.max(1,skaters.length);}
const ranked=clubs.map(c=>snapshot(c)).sort((a,b)=>strength(a)-strength(b));
const low=ranked[0],mid=ranked[Math.floor(ranked.length/2)],high=ranked.at(-1);
function sample(a,b,offset){const out=[{shots:0,goals:0,quality:0},{shots:0,goals:0,quality:0}];const periods=5;for(let i=0;i<periods;i++){const m=new Match([a,b],{seed:(offset+i+1)*3571});let steps=0;while(!m.finished&&steps++<24000)m.step();assert.ok(m.finished,`${a.name}-${b.name} period must finish`);for(let side=0;side<2;side++){out[side].shots+=m.stats[side].shots;out[side].goals+=m.score[side];out[side].quality+=m.shots.filter(s=>s.side===side).reduce((n,s)=>n+s.quality,0);}}return out.map(x=>({shots:x.shots/periods,goals:x.goals/periods,quality:x.quality/periods}));}
const rows={highMid:sample(high,mid,0),midLow:sample(mid,low,20),highLow:sample(high,low,40)};
for(const [name,sides] of Object.entries(rows))for(const [side,x] of sides.entries()){
 assert.ok(x.shots>=3&&x.shots<=22,`${name} side ${side} shot volume ${x.shots.toFixed(1)} outside broad club envelope`);
 assert.ok(x.goals<=5.5,`${name} side ${side} scoring ${x.goals.toFixed(1)} indicates runaway finishing`);
}
assert.ok(rows.highMid[0].quality>=rows.highMid[1].quality*.75,'top club should not lose its chance-quality signal against a mid club');
assert.ok(rows.midLow[0].quality>=rows.midLow[1].quality*.75,'mid club should retain a chance-quality edge signal against a low club');
console.log('PASS: real SHL roster matrix remains bounded',JSON.stringify({clubs:{low:low.name,mid:mid.name,high:high.name},strength:{low:strength(low),mid:strength(mid),high:strength(high)},rows}));
