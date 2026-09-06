"use strict";
// Game estimates, not measured scouting grades. See PLAYER_RESEARCH.md.
const HA_LEAGUE_LEVEL={NHL:15.5,QMJHL:8.5,'U16 Region':5,SHL:13,Liiga:12.5,AHL:12.5,DEL:12,NL:13,Czechia:12,HockeyAllsvenskan:10.5,ECHL:9.5,NCAA:9.5,HockeyEttan:8,Mestis:9,ICEHL:10,Norway:9,Denmark:8.5,Slovakia:10,SL:9.5,DEL2:9.5,Czechia2:9,'Ligue Magnus':9,USports:8.5,USHL:7.5,NAHL:6.5,'J20 Nationell':7.5,'U20 Nationell':7.5,'U20 SM-sarja':7.5,'U20 Region':6,'J20 Region':6,'Norway U20':6,'Norway2':6,'Division 2':6,'J18 Nationell':6,'U18 Nationell':6,'J18 Region':5,'U18 Region':5,'Norway U18':5};
function haAge(birth){const d=new Date(birth+'T00:00:00Z'),now=new Date(ALLSVENSKAN_DATABASE.checked+'T00:00:00Z');return now.getUTCFullYear()-d.getUTCFullYear()-(now.getUTCMonth()<d.getUTCMonth()||(now.getUTCMonth()===d.getUTCMonth()&&now.getUTCDate()<d.getUTCDate())?1:0);}
function haAttributeProfile(row){
 const age=haAge(row.birth),goalie=row.position==='G',back=row.position.startsWith('D'),center=row.position.split('/').includes('C');
 // Prior season carries half weight. A handful of appearances cannot dominate a full season.
 const stats=row.stats.filter(s=>s.gp>0&&Number.isFinite(HA_LEAGUE_LEVEL[s.league]));
 const weight=s=>s.gp*(s.season==='25-26'?1:.5),total=stats.reduce((n,s)=>n+weight(s),0);
 const mean=(fn,fallback)=>total?stats.reduce((n,s)=>n+weight(s)*fn(s),0)/total:fallback;
 const level=mean(s=>HA_LEAGUE_LEVEL[s.league],9),experience=Math.min(1,total/65),ageLoss=Math.max(0,age-31)*.18;
 const round=n=>attrClamp(Math.round(n));
 if(goalie){
  const valid=stats.filter(s=>Number.isFinite(s.sv)&&s.sv>=0&&s.sv<=1),n=valid.reduce((v,s)=>v+weight(s),0);
  // Regression toward .900; GP is a proxy because shots faced are unavailable here.
  const sv=(valid.reduce((v,s)=>v+weight(s)*s.sv,0)+.9*20)/(n+20);
  const base=level+attrClamp((sv-.9)*90,-2.5,2.5);
  return {reflexes:round(base+.6-ageLoss*.3),positioning:round(base+experience),reboundControl:round(base-.4),handling:round(base),movement:round(base-.3-ageLoss),composure:round(base+experience*.7)};
 }
 const priorG=back?.07:.2,priorA=back?.18:.25;
 const rate=(key,prior)=>mean(s=>((s[key]??prior*s.gp)+prior*12)/(s.gp+12),prior);
 const goals=rate('goals',priorG),assists=rate('assists',priorA);
 const finishing=attrClamp((goals-priorG)*11,-1.8,4),playmaking=attrClamp((assists-priorA)*9,-1.8,4);
 const body=attrClamp((row.weight-85)/8,-2,2),pim=rate('pim',.5);
 // Position/age/size priors stay modest: points alone do not measure defence or hockey IQ.
 return {skating:round(level+.4-ageLoss),acceleration:round(level+.7-ageLoss),shooting:round(level+finishing),passing:round(level+playmaking),puckControl:round(level+(finishing+playmaking)*.25),vision:round(level+playmaking*.4),positioning:round(level+(back?1.4:.2)+experience*.4),checking:round(level+(back?.7:-.5)+body*.4),faceoffs:round(level+(center?1.3:-2.5)),stamina:round(level+experience*.8-ageLoss*.3),strength:round(level+body),workRate:round(level+.5),decisions:round(level+experience*.7),composure:round(level+experience*.5),discipline:round(level+attrClamp((.5-pim)*1.8,-2,1))};
}
function haPlayer(row,club){
 const attributes=haAttributeProfile(row),age=haAge(row.birth),primary=row.position.split('/')[0];
 const pos=({G:'MV',D:'B',C:'C',LW:'VF',RW:'HF',W:'F',F:'F'})[primary]||'F';
 const values=Object.values(attributes),overall=Math.round(45+2.5*values.reduce((n,v)=>n+v,0)/values.length);
 const growth=age<=20?4:age<=23?2.5:age<=26?1:0;
 const end=row.registration.match(/^(\d{2})\/\d{2}/),contractYears=end?Math.max(1,Number(end[1])-25):1;
 const p={id:row.id,name:row.name,club,pos,age,nationality:row.nationality,fictional:false,attributes,attributeGrowth:growth,overall,potential:overall+Math.round(growth*2.5),shooting:45+2.5*(attributes.shooting||attributes.reflexes),passing:45+2.5*(attributes.passing||attributes.handling),defense:45+2.5*attributes.positioning,physical:45+2.5*(attributes.strength||attributes.movement),salary:Math.round(Math.max(180000,180000+(overall-59)*30000)/10000)*10000,value:Math.max(200000,(overall-58)*100000),contractYears,goals:0,assists:0,games:0,pim:0,shots:0,morale:70,happiness:70,fatigue:0,form:0,transferListed:false,askingPrice:null,loanStart:row.loan?{...row.loan}:null,research:{version:ALLSVENSKAN_DATABASE.version,checked:ALLSVENSKAN_DATABASE.checked,height:row.height,weight:row.weight,shoots:row.shoots,club,source:row.source,birth:row.birth,position:row.position,registration:row.registration,stats:JSON.parse(JSON.stringify(row.stats))}};
 return p;
}
function haRealRoster(club){return ALLSVENSKAN_DATABASE.clubs[club].players.map(row=>haPlayer(row,club));}
function haNameKey(name){return name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');}
function haRemoveStartingDuplicates(rosters){
 // Replace only fresh-career SHL rosters; stable source IDs distinguish namesakes.
 for(const [club,data] of Object.entries(SHL_DATABASE.clubs))rosters[club]=data.players.map(row=>haPlayer(row,club));
 return rosters;
}

function haEscape(value){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function haResearchPanel(p){
 const r=p.research;if(!r)return '';
 const club=ALLSVENSKAN_DATABASE.clubs[r.club]||SHL_DATABASE.clubs[r.club],goalie=p.pos==='MV';
 const rows=r.stats.map(s=>`<tr><td>20${haEscape(s.season.replace('-','/'))}</td><td>${haEscape(s.team)}<small>${haEscape(s.league)}</small></td><td>${s.gp}</td>${goalie?`<td>${Number.isFinite(s.sv)?(s.sv*100).toFixed(1)+' %':'–'}</td><td>${s.gaa??'–'}</td>`:`<td>${s.goals??'–'}</td><td>${s.assists??'–'}</td>`}</tr>`).join('');
 return `<details class="ha-research"><summary>Verklig bakgrund & källor</summary><p>Startdatabas ${ALLSVENSKAN_DATABASE.season} · kontrollerad ${r.checked||'2026-09-05'}. Ursprunglig klubb: ${haEscape(r.club)}. Position: ${haEscape(r.position)}.</p><p>Attribut och potential är spelmodellens uppskattningar. Mål, assist och liganivå påverkar den offensiva profilen; målvakter bedöms även utifrån räddningsprocent. Defensiva, mentala och fysiska egenskaper har större osäkerhet.</p><div class="ha-stats-scroll"><table><caption>Verklig grundseriestatistik – separat från din karriär</caption><thead><tr><th>Säsong</th><th>Lag / liga</th><th>M</th><th>${goalie?'Räddningar':'Mål'}</th><th>${goalie?'GAA':'Assist'}</th></tr></thead><tbody>${rows}</tbody></table></div><p>Löner och marknadsvärden är speluppskattningar. ${r.freeSnapshot?'Ingen registrerad klubb för 2026/27 hittades vid kontrollen. Startdatabasen behandlar spelaren som kontraktslös; senare avtal i din karriär styr det aktuella läget.':r.registration==='Loan'?(playerLoan(p)?'Registrerad som utlånad i källan. Ägarklubb och återgång visas under låneavtalet. Ej publicerade villkor använder angivna spelantaganden.':'Lån enligt den historiska källan. Denna äldre eller senare spelkarriär följer sitt sparade kontrakt; ett historiskt lån återskapas inte automatiskt.'):r.registration==='Junior'?'Upptagen i A-truppen med juniorstatus i källan; ett säsongskontrakt används i spelet.':r.registration==='Ej angivet'?'Kontraktslängd saknas i källan; ett säsongskontrakt används i spelet.':'Kontraktslängden utgår från publicerad slut­säsong. Eventuella optionsår räknas inte som garanterade år.'}</p><p><a href="${haEscape(r.source)}" target="_blank" rel="noopener noreferrer">Spelarprofil och statistik</a>${club?` · <a href="${haEscape(club.source)}" target="_blank" rel="noopener noreferrer">Starttruppens källa</a>`:''} · <a href="PLAYER_RESEARCH.md" target="_blank" rel="noopener noreferrer">Så bedöms attributen</a></p></details>`;
}
