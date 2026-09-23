'use strict';
// Offline, repeatable generation. Source facts remain separate from estimates.
// --check compares committed artifacts without rewriting them.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const context=vm.createContext({});
vm.runInContext(fs.readFileSync('allsvenskan-data.js','utf8'),context);
vm.runInContext(fs.readFileSync('player-world.js','utf8'),context);
const db=vm.runInContext('[SHL_DATABASE,ALLSVENSKAN_DATABASE]',context);
const rosterPlayers=db.flatMap(d=>Object.entries(d.clubs).flatMap(([club,c])=>c.players.map(p=>({...p,club}))));
const freeAgents=vm.runInContext('WORLD_START_FREE',context).map(p=>({...p,club:'Kontraktslös'}));
const outside=vm.runInContext('ALLSVENSKAN_DATABASE.outside||[]',context).map(e=>({...e.player,club:e.previousClub,status:e.status}));
const players=[...rosterPlayers,...freeAgents,...outside];
const newFree=outside.filter(p=>p.status==='free');
assert.equal(new Set(players.map(p=>p.id)).size,players.length,'duplicate stable identity');
const byId=new Map(players.map(p=>[p.id,p]));
const corrections=JSON.parse(fs.readFileSync('data/player-fact-corrections.json'));
const tables=JSON.parse(fs.readFileSync('data/player-stat-observations.json')).tables;
const generated={version:'se-2026-09-23-rosters1',asOf:'2026-09-23',checked:'2026-09-23',players:{}};
const record=p=>generated.players[p.id]??={birth:p.birth,facts:{},factSources:[],stats:[]};
function measurement(value,unit,kind){
 assert.ok(Number.isFinite(value)&&value>0,'invalid measurement');
 const factors=kind==='weight'?{kg:1,lb:.45359237}:{cm:1,in:2.54};
 assert.ok(Object.hasOwn(factors,unit),'explicit supported unit required');
 const n=Math.round(value*factors[unit]);
 assert.ok(kind==='weight'?n>=45&&n<=140:n>=150&&n<=215,'implausible normalized measurement');
 return n;
}
for(const c of corrections){
 const p=byId.get(c.id);assert.ok(p&&p.birth===c.birth&&p.club===c.club,'correction identity mismatch');
 assert.ok(c.asOf<=generated.asOf,'future correction');
 for(const [k,v] of Object.entries(c.expected))assert.equal(p[k],v,'baseline changed: review correction');
 const out=record(p);
 for(const [k,v] of Object.entries(c.observed))out.facts[k]=measurement(v.value,v.unit,k);
 assert.equal(out.facts.weight,c.confirmedKg,'conversion must agree with metric crosscheck');
 out.factSources.push({source:c.source,checked:c.checked,asOf:c.asOf,fields:Object.keys(c.observed),reason:c.reason});
}
const teams={AIK:'AIK',AIS:'Almtuna IS',BIF:'Brynäs IF',BIK:'BIK Karlskoga',DIF:'Djurgårdens IF',FBK:'Färjestad BK','FRÖ':'Frölunda HC',HV71:'HV71',IFB:'IF Björklöven',IKO:'IK Oskarshamn',Kalm:'Kalmar HC',LHC:'Linköping HC',LHF:'Luleå HF',LIF:'Leksands IF',MIF:'Malmö Redhawks',MIK:'Mora IK',MoDo:'MoDo Hockey',NYB:'Nybro Vikings IF',RBK:'Rögle BK',SKE:'Skellefteå AIK',SSK:'Södertälje SK',TAIF:'Tingsryds AIF',TIK:'Timrå IK',TRO:'IF Troja-Ljungby',VIK:'Västerås IK',VIM:'Vimmerby HC','VÄX':'Växjö Lakers HC','ÖHK':'Örebro HK','ÖST':'Östersunds IK'};
const key=name=>name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const cleanTeam=name=>name.replace(/ "[AC]"$/,'');
const excluded=[],matched=[];
for(const t of tables){
 assert.ok(['24-25','25-26'].includes(t.season)&&t.phase==='regular','only completed pre-start regular seasons');
 let lastName='';
 for(const r of t.rows){
  if(r.Name)lastName=r.Name;
  const name=lastName.split(', ').reverse().join(' '),goalie=t.kind==='goalies',gp=Number(r[goalie?'GPI':'GP']);
  if(!gp||!teams[r.Team])continue; // no appearances or aggregate over several clubs
  const named=players.filter(p=>key(p.name)===key(name)&&(p.position==='G')===goalie);
  const candidates=named.flatMap(p=>p.stats.filter(s=>s.season===t.season&&s.league===t.league&&cleanTeam(s.team)===teams[r.Team]&&s.gp===gp).map(s=>({p,s})));
  if(candidates.length!==1){excluded.push({name,season:t.season,league:t.league,team:r.Team,kind:t.kind,reason:!named.length?'not-in-start-database':'historical-stint-not-uniquely-matched'});continue;}
  const {p,s}=candidates[0];
  // Name is only candidate retrieval. Historical club, season, league, position,
  // appearances and (where available) performance fingerprint must also agree.
  const fingerprint=goalie?Number.isFinite(s.sv)&&Math.abs(s.sv-Number(r['SVS%'])/100)<=.00051:
   t.kind==='scoring'?s.goals===Number(r.G)&&s.assists===Number(r.A):t.kind==='eff'?s.goals===Number(r.G):true;
  if(!fingerprint){excluded.push({id:p.id,name,season:t.season,kind:t.kind,reason:'statistic-conflict'});continue;}
  const dest=record(p),found=dest.stats.find(x=>x.season===s.season&&x.league===s.league&&x.team===s.team);
  const update=found||{season:s.season,league:s.league,team:s.team,gp:s.gp,sources:[]};
  if(!found)dest.stats.push(update);
  if(goalie){
   const [minutes,seconds]=r.MIP.split(':').map(Number);
   Object.assign(update,{shotsAgainst:Number(r.SOG),saves:Number(r.SVS),goalsAgainst:Number(r.GA),iceSeconds:minutes*60+seconds,sv:Number(r.SVS)/Number(r.SOG)});
   assert.equal(update.saves+update.goalsAgainst,update.shotsAgainst,'goalie accounting');
   assert.ok(update.iceSeconds>0&&update.shotsAgainst>0);
  }else if(t.kind==='fo'){
   Object.assign(update,{faceoffAttempts:Number(r.FO),faceoffWins:Number(r.W)});
   assert.equal(Number(r.W)+Number(r.L),Number(r.FO),'faceoff accounting');
  }else if(t.kind==='eff')update.shotsOnGoal=Number(r.SOG);
  update.sources.push({url:t.source,checked:t.checked,kind:t.kind});
  matched.push({id:p.id,birth:p.birth,club:p.club,season:t.season,kind:t.kind});
 }
}
for(const p of players){
 const row={...p,...generated.players[p.id]?.facts};
 assert.ok(row.height===null||row.height>=150&&row.height<=215,p.name+' height');
 assert.ok(row.weight===null||row.weight>=45&&row.weight<=140,p.name+' weight');
}
const coverage={asOf:generated.asOf,checked:generated.checked,players:players.length,
 identityMethod:'Existing stable ID and full DOB retained. Tables attached only after unique name + position + historical club/league/season/GP match, plus goals/assists or rounded SV fingerprint where published. No new identities inferred.',
 factsCorrected:corrections.length,officialRowsMatched:matched.length,officialPlayers:new Set(matched.map(x=>x.id)).size,
 clubs:db.flatMap(d=>Object.keys(d.clubs)).map(club=>{const ps=players.filter(p=>p.club===club),m=matched.filter(x=>x.club===club);return {club,players:ps.length,physicalCorrections:corrections.filter(x=>x.club===club).length,officialPlayers:new Set(m.map(x=>x.id)).size,goaliePlayers:new Set(m.filter(x=>x.kind==='goalies').map(x=>x.id)).size,faceoffPlayers:new Set(m.filter(x=>x.kind==='fo').map(x=>x.id)).size,loanPlayers:ps.filter(p=>p.registration==='Loan').length,juniorRegistrations:ps.filter(p=>p.registration==='Junior').length};}),
 matched,excluded,
 freeAgents:[...freeAgents,...newFree].map(p=>({id:p.id,birth:p.birth,name:p.name,source:p.source,departure:p.departure,checked:'2026-09-23',status:'Existing start assumption retained. Public profile crosschecked; an absent new club does not prove no unannounced agreement exists.'})),
 limits:['New careers start September 23 with a generated schedule. Dated club announcements override cumulative roster pages; see roster-update-2026-09-23.json.', 'Original two-season statistics retained; new official data cover published goalie tables and skater top-25 leader lists only.', 'No skater time-on-ice, shift role, PP/PK usage or tracking measurements imported.', 'Academy teams remain explicitly fictional. Free-agent pool is a documented selection, not every available professional.']};
generated.coverage={rosterPlayers:rosterPlayers.length,freeAgents:freeAgents.length+newFree.length,officialPlayers:coverage.officialPlayers};
const artifacts={
 'player-evidence-data.js':'"use strict";\n// Generated by scripts/build-player-evidence.cjs; edit source observations, not this file.\nconst PLAYER_EVIDENCE_DATA='+JSON.stringify(generated,null,1)+';\n',
 'data/player-evidence-coverage.json':JSON.stringify(coverage,null,2)+'\n'};
if(require.main===module){
 for(const [path,body] of Object.entries(artifacts)){
  if(process.argv.includes('--check'))assert.equal(fs.readFileSync(path,'utf8'),body,path+' is stale');
  else fs.writeFileSync(path,body);
 }
 console.log(JSON.stringify({players:coverage.players,physicalCorrections:coverage.factsCorrected,officialPlayers:coverage.officialPlayers,officialRowsMatched:matched.length,excluded:excluded.length}));
}
module.exports={measurement};
