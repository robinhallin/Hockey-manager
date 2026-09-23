"use strict";
// Pure, deterministic start estimates. No career state, RNG, rendering or network.
// Parameters are conservative game priors, not fitted biological/scouting facts.
const PLAYER_EVIDENCE_MODEL={version:'se-evidence-2',asOf:'2026-09-23',checked:'2026-09-23',seasonWeights:{'25-26':1,'24-25':.5}};
function evidenceStats(row){
 return (row.stats||[]).filter(s=>s.gp>0&&Number.isFinite(HA_LEAGUE_LEVEL[s.league])&&Object.hasOwn(PLAYER_EVIDENCE_MODEL.seasonWeights,s.season));
}
function evidenceGroups(row){
 const groups=new Map();
 for(const s of evidenceStats(row)){
  const key=s.season+':'+s.league;
  if(!groups.has(key))groups.set(key,{season:s.season,league:s.league,gp:0,goals:0,assists:0,goalGames:0,assistGames:0,faceoffWins:0,faceoffAttempts:0});
  const g=groups.get(key);g.gp+=s.gp;
  if(Number.isFinite(s.goals)){g.goals+=s.goals;g.goalGames+=s.gp;}
  if(Number.isFinite(s.assists)){g.assists+=s.assists;g.assistGames+=s.gp;}
  if(Number.isFinite(s.faceoffAttempts)&&s.faceoffAttempts>0&&Number.isFinite(s.faceoffWins)){g.faceoffAttempts+=s.faceoffAttempts;g.faceoffWins+=s.faceoffWins;}
 }
 return [...groups.values()];
}
function evidencePotential(row){
 const age=haAge(row.birth),groups=evidenceGroups(row),w=s=>s.gp*PLAYER_EVIDENCE_MODEL.seasonWeights[s.season];
 const total=groups.reduce((n,s)=>n+w(s),0),level=total?groups.reduce((n,s)=>n+w(s)*HA_LEAGUE_LEVEL[s.league],0)/total:9;
 const seasonLevel=season=>{const ss=groups.filter(s=>s.season===season),gp=ss.reduce((n,s)=>n+s.gp,0);return {gp,value:gp?ss.reduce((n,s)=>n+s.gp*HA_LEAGUE_LEVEL[s.league],0)/gp:level};};
 const recent=seasonLevel('25-26'),previous=seasonLevel('24-25');
 // A demonstrated move up a level can inform a young player's projection. Sparse
 // evidence widens scenarios; it does not impose a negative personality or ceiling.
 const trajectory=recent.gp>=15&&previous.gp>=15?attrClamp((recent.value-previous.value)*.18,-.4,.4):0;
 const ageRoom=age<=20?3.5:age<=23?2.5:age<=26?1.2:age<=29?.5:0;
 const established=age<=23?attrClamp((level-(age<=20?8:10))*.2,-.5,.7):0;
 const central=Math.round(Math.max(0,ageRoom+established+(age<=26?trajectory:0))*10)/10;
 const uncertainty=age<=23?(total<20?2.2:total<55?1.7:1.2):age<=26?.8:.4;
 return {central,low:Math.max(0,Math.round((central-uncertainty)*10)/10),high:Math.round((central+uncertainty)*10)/10,
  basis:recent.gp>=15&&previous.gp>=15?'age-level-two-seasons':'age-level-limited-sample',weightedGames:Math.round(total*10)/10};
}
function evidenceProfile(row){
 const age=haAge(row.birth),goalie=row.position==='G',back=row.position.startsWith('D'),center=row.position.split('/').includes('C');
 const stats=evidenceStats(row),groups=evidenceGroups(row),recency=s=>PLAYER_EVIDENCE_MODEL.seasonWeights[s.season];
 const total=stats.reduce((n,s)=>n+s.gp*recency(s),0);
 const level=total?stats.reduce((n,s)=>n+s.gp*recency(s)*HA_LEAGUE_LEVEL[s.league],0)/total:9;
 const experience=Math.min(1,total/65),ageLoss=Math.max(0,age-31)*.18,round=n=>attrClamp(Math.round(n));
 const evidence={},attributes={};
 const put=(key,value,kind='position-level-prior',sample=0)=>{
  attributes[key]=round(value);
  const threshold=kind==='save-volume-estimate'?600:kind==='faceoff-results'?200:40;
  const unmeasured=['position-level-prior','save-appearance-proxy'].includes(kind);
  evidence[key]={kind,sample,unit:kind==='save-volume-estimate'?'shots':kind==='faceoff-results'?'weighted-faceoffs':'weighted-games',uncertainty:unmeasured||sample<threshold?'high':'moderate'};
 };
 if(goalie){
  let signal=0,mass=0,shots=0,proxyGames=0;
  for(const s of stats){
   let confidence,sv;
   if(Number.isFinite(s.shotsAgainst)&&s.shotsAgainst>0&&Number.isFinite(s.saves)){
    sv=s.saves/s.shotsAgainst;confidence=s.shotsAgainst/600;shots+=s.shotsAgainst;
   }else if(Number.isFinite(s.sv)&&s.sv>=0&&s.sv<=1){
    sv=s.sv;confidence=s.gp/30;proxyGames+=s.gp;
   }else continue;
   // 600 shots or 30 proxy appearances represent one prior's worth of evidence.
   // Proxy appearances deliberately carry less confidence; no shots are invented.
   signal+=confidence*recency(s)*(sv-.9);mass+=confidence*recency(s);
  }
  const stop=attrClamp(signal/(1+mass)*90,-2.5,2.5);
  put('reflexes',level+.6-ageLoss*.3+stop,shots?'save-volume-estimate':'save-appearance-proxy',shots||proxyGames);
  put('positioning',level+experience+stop*.35,shots?'save-volume-estimate':'save-appearance-proxy',shots||proxyGames);
  // Save percentage cannot identify handling, rebounds, movement or temperament.
  put('reboundControl',level-.4);put('handling',level);put('movement',level-.3-ageLoss);put('composure',level+experience*.7);
 }else{
  const priorG=back?.07:.2,priorA=back?.18:.25;
  const production=(key,games,prior)=>{
   const valid=groups.filter(s=>s[games]>0),count=valid.reduce((n,s)=>n+s[games]*recency(s),0);
   // Pool split club stints before adding the prior once per league-season.
   const rate=count?valid.reduce((n,s)=>n+s[games]*recency(s)*(s[key]+prior*12)/(s[games]+12),0)/count:prior;
   return {rate,count};
  };
  const goals=production('goals','goalGames',priorG),assists=production('assists','assistGames',priorA);
  put('skating',level+.4-ageLoss);put('acceleration',level+.7-ageLoss);
  put('shooting',level+attrClamp((goals.rate-priorG)*11,-1.8,4),'goals-per-game',goals.count);
  put('passing',level+attrClamp((assists.rate-priorA)*9,-1.8,4),'assists-per-game',assists.count);
  put('puckControl',level);put('vision',level);
  put('positioning',level+(back?1.4:.2)+experience*.4);put('checking',level+(back?.7:-.5));
  const fo=groups.reduce((a,s)=>({wins:a.wins+s.faceoffWins*recency(s),attempts:a.attempts+s.faceoffAttempts*recency(s)}),{wins:0,attempts:0});
  const faceoffBase=level+(center?1.3:-2.5);
  put('faceoffs',fo.attempts?level+1.3+attrClamp(((fo.wins+100)/(fo.attempts+200)-.5)*20,-3,3):faceoffBase,fo.attempts?'faceoff-results':'position-level-prior',fo.attempts);
  put('stamina',level+experience*.8-ageLoss*.3);put('strength',level);put('workRate',level+.5);
  put('decisions',level+experience*.7);put('composure',level+experience*.5);put('discipline',level);
 }
 return {attributes,evidence,potential:evidencePotential(row),version:PLAYER_EVIDENCE_MODEL.version};
}
function evidenceStartingRow(row){
 const patch=PLAYER_EVIDENCE_DATA.players[row.id];
 // Stable source ID plus full birth date guard a correction. Never attach by name.
 if(!patch||patch.birth!==row.birth)return {...row,stats:(row.stats||[]).map(s=>({...s}))};
 return {...row,...patch.facts,stats:(row.stats||[]).map(s=>{
  const update=patch.stats.find(x=>x.season===s.season&&x.league===s.league&&x.team===s.team&&x.gp===s.gp);
  return update?{...s,...update}: {...s};
 })};
}
// Save schema 2 identifies this frozen method/date definition. Keep it when future
// models are introduced. Avoid repeating definitions and derived samples 684 times.
function evidenceSavedModel(research){return research?.model===3?{version:'se-evidence-2',asOf:'2026-09-23',checked:'2026-09-23'}:research?.model===2?{version:'se-evidence-2',asOf:'2026-09-07',checked:'2026-09-23'}:null;}
const EVIDENCE_SOURCE_ROOT='https://stats.swehockey.se/Players/Statistics/';
function evidenceSourceURL(source){return typeof source==='string'?EVIDENCE_SOURCE_ROOT+source:source.url;}
function evidenceSavedStats(stats){
 return stats.map(s=>{
  const row=JSON.parse(JSON.stringify(s));
  if(row.sources)row.sources=row.sources.map(source=>{
   // Lossless URL-prefix/date interning for this dated batch only. Preserve any
   // other source verbatim so unknown or later metadata cannot be relabelled.
   return source.checked==='2026-09-23'&&source.url?.startsWith(EVIDENCE_SOURCE_ROOT)?source.url.slice(EVIDENCE_SOURCE_ROOT.length):source;
  });
  return row;
 });
}
