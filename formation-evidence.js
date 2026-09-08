// Derived from saved match events; reading this view never changes the simulation.
function formationEvidence(matches){
 const groups=new Map(),seen=new Set();let excluded=0;
 for(const m of matches){
  if(!analysisComparable(m)){excluded++;continue;}
  if(seen.has(m.id))continue;seen.add(m.id);
  for(const u of m.units||[]){
   if(!['forward','defense','pp','pk'].includes(u.kind)||!u.key||u.seconds<=0)continue;
   if(!groups.has(u.key))groups.set(u.key,{key:u.key,kind:u.kind,names:[...u.names],seconds:0,for:0,against:0,games:[]});
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
 return `<section class="mw-panel"><h2>Återkommer matchbilden?</h2><p>Samma spelare jämförs över flera matcher, oavsett kedjenummer. Minst tre matcher med en minuts gemensamt spel vardera och totalt tio minuter krävs för en signal. Det är ett observationsunderlag, inte ett betyg på spelarna.</p>${excluded?`<p>${excluded} matcher i urvalet saknar komplett jämförbart underlag och ingår inte här.</p>`:''}${rows.length?`<div class="analysis-scroll"><table><thead><tr><th>Kombination</th><th>Matcher / istid</th><th>Farliga lägen för / emot</th><th>Återkommande utfall</th><th>Matchunderlag</th></tr></thead><tbody>${rows.slice(0,12).map(r=>`<tr><td><strong>${kinds[r.kind]}</strong><small>${r.names.map(trainingSafe).join(' · ')}</small></td><td>${r.games.length} / ${analysisTime(r.seconds)}</td><td>${r.for} / ${r.against}</td><td>${r.signal}<small>${r.positive} övertag · ${r.negative} underskott av ${r.measured} matcher med minst en minuts istid</small></td><td><details><summary>Visa ${r.games.length} matcher</summary>${r.games.map(g=>`<p><button class="btn secondary" onclick="matchesOpenReport('${trainingSafe(g.id)}')">${g.date?calText(g.date):'Match'} · ${trainingSafe(g.opponent)}</button><br>${analysisTime(g.seconds)} · ${g.for}–${g.against} farliga lägen${g.seconds<60?' · kort speltid':''}</p>`).join('')}</details></td></tr>`).join('')}</tbody></table></div>`:'<p>Inga kompletta formationsrapporter i urvalet ännu.</p>'}<p>De tolv kombinationerna med mest registrerad istid visas. Lika många farliga lägen räknas som neutralt. För PP och PK beskriver signalen chansbalansen, inte enhetens effektivitet. Motstånd, medspelare och matchning kan förklara skillnaderna. PP och PK blandas inte med spel vid lika styrka. Raderna delar laghändelser och får inte summeras till lagtotaler.</p></section>`;
}
