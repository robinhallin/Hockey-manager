// Derived from saved match events; reading this view never changes the simulation.
function formationEvidence(matches){
 const groups=new Map(),seen=new Set();let excluded=0;
 for(const m of matches){
  if(!analysisComparable(m)){excluded++;continue;}
  if(seen.has(m.id))continue;seen.add(m.id);
  for(const u of m.units||[]){
   if(!['forward','defense','pp','pk'].includes(u.kind)||!u.key||u.seconds<=0)continue;
   if(!groups.has(u.key))groups.set(u.key,{key:u.key,kind:u.kind,names:[...u.names],ids:[...(u.ids||[])],seconds:0,for:0,against:0,games:[]});
   const row=groups.get(u.key);row.seconds+=u.seconds;row.for+=u.dangerFor;row.against+=u.dangerAgainst;
   row.games.push({id:m.id,date:m.date,opponent:m.opponent,seconds:u.seconds,for:u.dangerFor,against:u.dangerAgainst});
  }
 }
 const rows=[...groups.values()].map(row=>{
  const measured=row.games.filter(g=>g.seconds>=60),positive=measured.filter(g=>g.for>g.against).length,negative=measured.filter(g=>g.against>g.for).length;
  const enough=measured.length>=3&&row.seconds>=600;
  const signal=!enough?'Mer underlag behövs':negative/measured.length>=2/3&&row.against>row.for?'Återkommande underskott':positive/measured.length>=2/3&&row.for>row.against?'Återkommande övertag':'Blandat utfall';
  return {...row,measured:measured.length,positive,negative,enough,signal};
 }).sort((a,b)=>b.seconds-a.seconds);
 return {rows,excluded};
}
function formationEvidenceView(matches){
 const {rows,excluded}=formationEvidence(matches),kinds={forward:'Kedja',defense:'Backpar',pp:'Powerplay',pk:'Boxplay'};
 return `<section class="mw-panel"><h2>Återkommer matchbilden?</h2><p>Samma spelare jämförs över flera matcher, oavsett kedjenummer. Minst tre matcher med en minuts gemensamt spel vardera och totalt tio minuter krävs för en signal. Det är ett observationsunderlag, inte ett betyg på spelarna.</p>${excluded?`<p>${excluded} matcher i urvalet saknar komplett jämförbart underlag och ingår inte här.</p>`:''}${rows.length?`<div class="analysis-scroll"><table><thead><tr><th>Kombination</th><th>Matcher / istid</th><th>Farliga lägen för / emot</th><th>Återkommande utfall</th><th>Matchunderlag</th></tr></thead><tbody>${rows.slice(0,12).map(r=>`<tr><td><strong>${kinds[r.kind]}</strong><small>${r.names.map((name,i)=>playerReference(r.ids[i],name)).join(' · ')}</small></td><td>${r.games.length} / ${analysisTime(r.seconds)}</td><td>${r.for} / ${r.against}</td><td>${r.signal}<small>${r.positive} övertag · ${r.negative} underskott av ${r.measured} matcher med minst en minuts istid</small></td><td><details><summary>Visa ${r.games.length} matcher</summary>${r.games.map(g=>`<p><button class="btn secondary" onclick="matchesOpenReport('${trainingSafe(g.id)}')">${g.date?calText(g.date):'Match'} · ${trainingSafe(g.opponent)}</button><br>${analysisTime(g.seconds)} · ${g.for}–${g.against} farliga lägen${g.seconds<60?' · kort speltid':''}</p>`).join('')}</details></td></tr>`).join('')}</tbody></table></div>`:'<p>Inga kompletta formationsrapporter i urvalet ännu.</p>'}<p>De tolv kombinationerna med mest registrerad istid visas. Lika många farliga lägen räknas som neutralt. För PP och PK beskriver signalen chansbalansen, inte enhetens effektivitet. Motstånd, medspelare och matchning kan förklara skillnaderna. PP och PK blandas inte med spel vid lika styrka. Raderna delar laghändelser och får inte summeras till lagtotaler.</p></section>`;
}

// A fixed, explicit sample for selection decisions, independent of analysis filters.
function lineupEvidenceSamples(){
 const seen=new Set();
 return (state.analysis?.matches||[]).filter(m=>m.club===managerClub()&&m.year===state.season?.year&&m.date&&m.date<=state.calendar.date&&analysisComparable(m)).sort((a,b)=>b.date.localeCompare(a.date)).filter(m=>{if(seen.has(m.id))return false;seen.add(m.id);return true;}).slice(0,5);
}
function lineupCombinationEvidence(kind,ids,label){
 const size={forward:3,defense:2,pp:5,pk:4}[kind];
 if(!size||ids.length!==size||ids.some(id=>id==null)||new Set(ids.map(String)).size!==size)return '';
 const samples=lineupEvidenceSamples(),key=JSON.stringify([kind,...ids.map(String).sort()]);
 const row=formationEvidence(samples).rows.find(r=>r.key===key);
 const heading=`<strong>${trainingSafe(label)} · gemensamt spel</strong>`;
 if(!row)return `<p>${heading}<br>Ingen registrerad gemensam istid i de ${samples.length} senaste kompletta tävlingsrapporterna denna säsong.</p>`;
 return `<p>${heading}<br>${row.games.length} av ${samples.length} matcher · ${analysisTime(row.seconds)} · ${row.for}–${row.against} farliga lägen för/emot.<br>${row.signal}. <a href="#match/${encodeURIComponent(String(row.games[0].id))}" onclick="${trainingSafe('matchesOpenReport('+JSON.stringify(row.games[0].id)+');return false;')}">Öppna senaste underlaget</a></p>`;
}
function lineupWorkload(p){
 const labels={pp1:'PP1',pp2:'PP2',pk1:'BP1',pk2:'BP2'};
 const assignments=Object.entries(labels).filter(([key])=>(state.specialTeams?.[key]||[]).some(id=>samePlayerId(id,p.id))).map(([,label])=>label);
 const m=state.live,live=m&&!m.finished;
 const current=live?` · Ork nu ${Math.round(matchEnergy(p))}% · Istid ${analysisTime(m.iceTime?.[p.id]||0)}`:'';
 return `Belastning ${Math.round(p.fatigue||0)}/100 (lägre är bättre)${current} · ${assignments.length?assignments.join(', '):'Inga PP/BP-uppdrag'}`;
}
