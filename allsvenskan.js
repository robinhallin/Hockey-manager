"use strict";
// Game estimates, not measured scouting grades. See PLAYER_RESEARCH.md.
const HA_LEAGUE_LEVEL={NHL:15.5,QMJHL:8.5,'U16 Region':5,SHL:13,Liiga:12.5,AHL:12.5,DEL:12,NL:13,Czechia:12,HockeyAllsvenskan:10.5,ECHL:9.5,NCAA:9.5,HockeyEttan:8,Mestis:9,ICEHL:10,Norway:9,Denmark:8.5,Slovakia:10,SL:9.5,DEL2:9.5,Czechia2:9,'Ligue Magnus':9,USports:8.5,USHL:7.5,NAHL:6.5,'J20 Nationell':7.5,'U20 Nationell':7.5,'U20 SM-sarja':7.5,'U20 Region':6,'J20 Region':6,'Norway U20':6,'Norway2':6,'Division 2':6,'J18 Nationell':6,'U18 Nationell':6,'J18 Region':5,'U18 Region':5,'Norway U18':5};
function haClubName(club){return club==='Luleå HF'?'Luleå Hockey':club;}
function haAge(birth,asOf=ALLSVENSKAN_DATABASE.asOf||PLAYER_EVIDENCE_MODEL.asOf){const d=new Date(birth+'T00:00:00Z'),now=new Date(asOf+'T00:00:00Z');return now.getUTCFullYear()-d.getUTCFullYear()-(now.getUTCMonth()<d.getUTCMonth()||(now.getUTCMonth()===d.getUTCMonth()&&now.getUTCDate()<d.getUTCDate())?1:0);}
function haAttributeProfile(row){return evidenceProfile(row).attributes;}
function haPlayer(row,club){
 row=evidenceStartingRow(row);
 const model=evidenceProfile(row),attributes=model.attributes,age=haAge(row.birth),primary=row.position.split('/')[0];
 const pos=({G:'MV',D:'B',C:'C',LW:'VF',RW:'HF',W:'F',F:'F'})[primary]||'F';
 const values=Object.values(attributes),overall=Math.round(45+2.5*values.reduce((n,v)=>n+v,0)/values.length);
 const growth=model.potential.central;
 const end=row.registration.match(/^(\d{2})\/\d{2}/),contractYears=end?Math.max(1,Number(end[1])-25):1;
 const p={id:row.id,name:row.name,club,pos,age,nationality:row.nationality,fictional:false,attributes,developmentForecast:[model.potential.low,model.potential.high],attributeGrowth:growth,overall,potential:overall+Math.round(growth*2.5),shooting:45+2.5*(attributes.shooting||attributes.reflexes),passing:45+2.5*(attributes.passing||attributes.handling),defense:45+2.5*attributes.positioning,physical:45+2.5*(attributes.strength||attributes.movement),salary:Math.round(Math.max(180000,180000+(overall-59)*30000)/10000)*10000,value:Math.max(200000,(overall-58)*100000),contractYears,goals:0,assists:0,games:0,pim:0,shots:0,morale:70,happiness:70,fatigue:0,form:0,transferListed:false,askingPrice:null,loanStart:row.loan?{...row.loan,owner:haClubName(row.loan.owner)}:null,research:{version:ALLSVENSKAN_DATABASE.version,checked:ALLSVENSKAN_DATABASE.checked,model:3,height:row.height,weight:row.weight,shoots:row.shoots,club,source:row.source,birth:row.birth,position:row.position,registration:row.registration,stats:evidenceSavedStats(row.stats)}};
 return p;
}
function haRealRoster(club){return ALLSVENSKAN_DATABASE.clubs[club].players.map(row=>haPlayer(row,club));}
function haNameKey(name){return name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');}
function haRemoveStartingDuplicates(rosters){
 // Replace only fresh-career SHL rosters; stable source IDs distinguish namesakes.
 for(const [club,data] of Object.entries(SHL_DATABASE.clubs))rosters[haClubName(club)]=data.players.map(row=>haPlayer(row,haClubName(club)));
 return rosters;
}

// Repair the accidentally separate source club once. A paused match keeps its exact
// participants until the final whistle; the next save then consolidates the club.
function haRepairClubIdentity(s){
 if(!s?.clubRosters||s.live&&!s.live.finished)return;
 const alias='Luleå HF',club='Luleå Hockey',ghost=s.clubRosters[alias];
 if(!ghost){
  for(const l of [...(s.loans?.active||[]),...(s.loans?.offers||[])]){l.owner=haClubName(l.owner);l.borrower=haClubName(l.borrower);}
  return;
 }
 const rosters=Object.values(s.clubRosters),free=s.playerWorld?.freeAgents||[];
 const people=[...rosters.flat(),...free];
 const sourceRows=[...Object.values(SHL_DATABASE.clubs),...Object.values(ALLSVENSKAN_DATABASE.clubs)].flatMap(c=>c.players);
 const legacyName=p=>haNameKey(p.name==='Caper Juustovaara Karlsson'?'Casper Juustovaara Karlsson':p.name);
 const replacements=new Map(),removed=new Set(),archive=[];
 for(const row of sourceRows){
  const sourced=people.find(p=>String(p.id)===row.id);
  const legacy=people.find(p=>String(p.id).startsWith(club+'-')&&legacyName(p)===haNameKey(row.name));
  if(!sourced||!legacy||sourceRows.filter(q=>haNameKey(q.name)===haNameKey(row.name)).length!==1)continue;
  // A sourced player already signed elsewhere keeps that transfer. Otherwise keep
  // the established career player, including trained attributes and his contract.
  const keep=ghost.includes(sourced)?legacy:sourced,drop=keep===legacy?sourced:legacy;
  replacements.set(String(drop.id),String(keep.id));removed.add(drop);
  archive.push(JSON.parse(JSON.stringify(drop)));
  if(keep===legacy){
   keep.name=sourced.name;
   if(!keep.research&&sourced.research)keep.research=JSON.parse(JSON.stringify(sourced.research));
  }
 }
 // Historical match reports remain as recorded; old IDs can still resolve through
 // aliases. Only current selections and pending business are redirected below.
 const redirect=value=>{
  if(typeof value==='string')return value===alias?club:replacements.get(value)||value;
  if(Array.isArray(value))return value.map(redirect);
  if(value&&typeof value==='object')for(const key of Object.keys(value))value[key]=redirect(value[key]);
  return value;
 };
 for(const [name,ps] of Object.entries(s.clubRosters))s.clubRosters[name]=ps.filter(p=>!removed.has(p));
 s.clubRosters[club]=[...(s.clubRosters[club]||[]),...s.clubRosters[alias]];
 delete s.clubRosters[alias];
 for(const ps of Object.values(s.clubRosters))for(const p of ps){p.club=haClubName(p.club);if(p.loanStart)p.loanStart.owner=haClubName(p.loanStart.owner);if(p.futureContract)redirect(p.futureContract);}
 if(s.playerWorld)s.playerWorld.freeAgents=free.filter(p=>!removed.has(p));
 for(const key of ['lines','specialTeams','matchSelection','selectedPlayer','selectedMarketPlayer','contractNegotiation','transferNegotiation'])if(s[key]!==undefined)s[key]=redirect(s[key]);
 if(s.recruitment){
  for(const key of ['deals','incoming','shortlist','missions'])if(s.recruitment[key])s.recruitment[key]=redirect(s.recruitment[key]);
  delete s.recruitment.ai?.[alias];
 }
 if(s.loans)for(const key of ['active','offers','selected'])if(s.loans[key])s.loans[key]=redirect(s.loans[key]);
 s.playerIdentityAliases={...s.playerIdentityAliases,...Object.fromEntries(replacements)};
 s.clubIdentityRepair={version:1,removedPlayers:archive};
 if(s.clubRosters[s.managerClub])s.roster=s.clubRosters[s.managerClub];
}

function haEscape(value){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function haResearchPanel(p){
 const r=p.research;if(!r)return '';
 const savedModel=evidenceSavedModel(r);
 const club=ALLSVENSKAN_DATABASE.clubs[r.club]||SHL_DATABASE.clubs[r.club]||SHL_DATABASE.clubs[Object.keys(SHL_DATABASE.clubs).find(c=>haClubName(c)===r.club)],goalie=p.pos==='MV';
 const rows=r.stats.map(s=>`<tr><td>20${haEscape(s.season.replace('-','/'))}</td><td>${haEscape(s.team)}<small>${haEscape(s.league)}</small></td><td>${s.gp}</td>${goalie?`<td>${Number.isFinite(s.sv)?(s.sv*100).toFixed(1)+' %':'–'}</td><td>${s.shotsAgainst??'Saknas'}</td><td>${s.iceSeconds?Math.floor(s.iceSeconds/60)+':'+String(s.iceSeconds%60).padStart(2,'0'):'Saknas'}</td>`:`<td>${s.goals??'–'}</td><td>${s.assists??'–'}</td><td>${s.faceoffAttempts?`${s.faceoffWins}/${s.faceoffAttempts}`:'Saknas'}</td>`}</tr>`).join('')||'<tr><td colspan="6">Verifierad historisk statistik saknas i underlaget.</td></tr>';
 const official=[...new Set(r.stats.flatMap(s=>(s.sources||[]).map(evidenceSourceURL)))];
 const labels=goalie?GOALIE_ATTRIBUTES:SKATER_ATTRIBUTES;
 const observed=goalie?['reflexes','positioning']:['shooting','passing',...(r.stats.some(s=>s.faceoffAttempts>0)?['faceoffs']:[])];
 const uncertain=Object.keys(labels).filter(key=>!observed.includes(key)).map(key=>labels[key]);
 const method=savedModel?`Modell granskad ${haEscape(savedModel.checked)}. Attribut är speluppskattningar, inte uppmätta verklighetsbetyg. ${goalie?'Räddningsprocent vägs med registrerade skottvolymer där de finns. Övriga säsonger använder en osäkrare matchproxy. Returkontroll och rörelseteknik kan inte utläsas ur räddningsprocent.':'Mål och assist stödjer uppskattningar av avslut respektive passningar. Registrerade tekningar används när underlag finns. Istid och användning i special teams saknas; inga värden per 60 minuter konstrueras.'} Osäkra positions- och ligabaserade antaganden: ${uncertain.map(haEscape).join(', ')}. Databasens osäkerhet är separat från vad din scout känner till.`:'Den sparade karriärens äldre attributmodell behålls. Nyare databasbedömningar skriver inte över spelarens utveckling.';
 return `<details class="ha-research"><summary>Verklig bakgrund & källor</summary><p>Startdatabas ${ALLSVENSKAN_DATABASE.season} · truppunderlag ${r.asOf||savedModel?.asOf||r.checked||'2026-09-05'}. Ursprungskälla kontrollerad ${r.checked||'Okänt'}. Ursprunglig klubb: ${haEscape(r.club)}. Position: ${haEscape(r.position)}.</p><p>${method}</p><p>Längd: ${r.height?haEscape(r.height)+' cm':'Okänd'} · vikt: ${r.weight?haEscape(r.weight)+' kg':'Okänd'}. ${r.model?'Storlek ger ingen automatisk styrkebonus.':'Äldre modellvärden bevaras i denna karriär.'}</p><div class="ha-stats-scroll"><table><caption>Verklig grundseriestatistik – separat från din karriär</caption><thead><tr><th>Säsong</th><th>Lag / liga</th><th>M</th><th>${goalie?'Räddningsprocent':'Mål'}</th><th>${goalie?'Skott emot':'Assist'}</th><th>${goalie?'Istid (min:sek)':'Vunna / tekningar'}</th></tr></thead><tbody>${rows}</tbody></table></div><p>Löner och marknadsvärden är speluppskattningar. ${r.freeSnapshot?'Ingen registrerad klubb för 2026/27 hittades vid kontrollen. Startdatabasen behandlar spelaren som kontraktslös; senare avtal i din karriär styr det aktuella läget.':r.registration==='Loan'?(playerLoan(p)?'Registrerad som utlånad i källan. Ägarklubb och återgång visas under låneavtalet. Ej publicerade villkor använder angivna spelantaganden.':'Lån enligt den historiska källan. Denna äldre eller senare spelkarriär följer sitt sparade kontrakt; ett historiskt lån återskapas inte automatiskt.'):r.registration==='Junior'?'Upptagen i A-truppen med juniorstatus i källan; ett säsongskontrakt används i spelet.':r.registration==='Ej angivet'?'Kontraktslängd saknas i källan; ett säsongskontrakt används i spelet.':'Kontraktslängden utgår från publicerad slut­säsong. Eventuella optionsår räknas inte som garanterade år.'}</p><p><a href="${haEscape(r.source)}" target="_blank" rel="noopener noreferrer">Spelarprofil och statistik</a>${club?` · <a href="${haEscape(club.source)}" target="_blank" rel="noopener noreferrer">Starttruppens källa</a>`:''} · <a href="PLAYER_RESEARCH.md" target="_blank" rel="noopener noreferrer">Så bedöms attributen</a>${official.length?` · ${official.map((url,i)=>`<a href="${haEscape(url)}" target="_blank" rel="noopener noreferrer">Förbundsstatistik ${i+1}</a>`).join(' · ')}`:''}</p></details>`;
}
