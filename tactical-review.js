// Observations of actual recorded play; this module never advances the match.
function tacticalReviewLineup(){
 const slot=id=>({id:id==null?null:String(id),name:playerById(id)?.name||'Vakant'});
 return {forwards:(state.lines?.forwards||[]).map(slot),defense:(state.lines?.defense||[]).map(slot),goalie:slot(state.lines?.goalie)};
}
function tacticalReviewPlan(){return {tactic:state.tactic,...state.tacticalPlan,lineup:tacticalReviewLineup(),special:specialReviewPlan()};}
function tacticalReviewLineupChanges(before,after){
 if(!before||!after)return [];
 const rows=[];
 for(const [key,size,label] of [['forwards',3,'Kedja'],['defense',2,'Backpar']]){
  const a=before[key]||[],b=after[key]||[];
  for(let i=0;i<Math.max(a.length,b.length);i+=size){
   const old=a.slice(i,i+size),next=b.slice(i,i+size);
   if(JSON.stringify(old.map(p=>p.id))!==JSON.stringify(next.map(p=>p.id)))rows.push(`${label} ${i/size+1}: ${old.map(p=>p.name).join(' / ')} → ${next.map(p=>p.name).join(' / ')}`);
  }
 }
 if(before.goalie?.id!==after.goalie?.id)rows.push(`Målvakt: ${before.goalie?.name||'Vakant'} → ${after.goalie?.name||'Vakant'}`);
 return rows;
}
function tacticalReviewTotals(situation='even'){
 const a=state.live?.analysis,shots=(a?.shots||[]).filter(s=>s.situation===situation);
 return {seconds:a?.strengthSeconds?.[situation]||0,for:shots.filter(s=>s.side==='own').length,against:shots.filter(s=>s.side==='opponent').length,dangerFor:shots.filter(s=>s.side==='own'&&s.dangerous).length,dangerAgainst:shots.filter(s=>s.side==='opponent'&&s.dangerous).length};
}
function tacticalReviewDelta(end,start={}){return Object.fromEntries(Object.keys(end).map(k=>[k,Math.max(0,end[k]-(start[k]||0))]));}
function tacticalReviewRecord(before,label){
 const m=state.live,after=tacticalReviewPlan();
 if(!m?.analysis||m.finished||JSON.stringify(before)===JSON.stringify(after))return;
 const history=m.tacticalReviews||(m.tacticalReviews=[]),totals=tacticalReviewTotals(),specialTotals=specialReviewTotals(),last=history.at(-1),time=analysisClock();
 // Changes made at the same stoppage form one decision, not several zero-second samples.
 if(last&&last.time===time){if(!last.before.lineup&&before.lineup)last.before.lineup=before.lineup;if(!last.before.special)last.before.special=before.special;if(!last.specialTotals){last.specialTotals=specialTotals;last.specialBaseline=null;}last.after=after;last.label='Flera tränarbeslut';return;}
 if(last){last.result=tacticalReviewDelta(totals,last.totals);last.specialResult=last.specialTotals?specialReviewDelta(specialTotals,last.specialTotals):null;last.end=time;}
 history.push({time,label,before,after,totals,specialTotals,specialBaseline:last&&!last.specialTotals?null:specialReviewDelta(specialTotals,last?.specialTotals),baseline:tacticalReviewDelta(totals,last?.totals),partial:Boolean(m.analysis.partial||m.analysis.strengthPartial)});
 if(history.length>24)history.shift();
}
function tacticalReviewSnapshot(){
 const rows=state.live?.tacticalReviews||[],totals=tacticalReviewTotals(),specialTotals=specialReviewTotals();
 return rows.map((r,i)=>({...r,specialResult:i===rows.length-1&&r.specialTotals?specialReviewDelta(specialTotals,r.specialTotals):r.specialResult,result:i===rows.length-1?tacticalReviewDelta(totals,r.totals):r.result,end:i===rows.length-1?analysisClock():r.end}));
}
function tacticalReviewView(rows){
 if(!rows?.length)return '';
 const labels={tactic:'Mentalitet',attackStyle:'Spelidé',forecheck:'Forecheck',tempo:'Tempo',physicality:'Fysisk nivå',shiftLength:'Byteslängd',shotChoice:'Avslutsval',lineUsage:'Kedjeanvändning'};
 const values={attack:'Offensiv',defense:'Defensiv',balanced:'Balanserad',passive:'Avvaktande',aggressive:'Aggressiv',low:'Lågt',normal:'Normalt',high:'Högt',safe:'Disciplinerat',hard:'Hårt',short:'30 sek',long:'60 sek',patient:'Sök bättre läge',shoot:'Skjut oftare',rollFour:'Rulla fyra',topHeavy:'Toppa laget',...HOCKEY_STYLES};
 const cell=(x)=>`${analysisTime(Math.round(x.seconds))} · ${x.for}–${x.against} försök · ${x.dangerFor}–${x.dangerAgainst} farliga`;
 const rate=(x,key)=>(x[key]*600/x.seconds).toFixed(1);
 return `<details class="mc-tactical-review"><summary>Dina taktiska ändringar · ${rows.length}</summary><p>Grundjämförelsen visar spel vid lika styrka. Ändrade special teams får separata underlag nedan. Dina siffror visas först. Före avser spelet sedan föregående registrerade ändring, efter avser spelet fram till nästa ändring eller nu.</p>${rows.slice(-6).reverse().map(r=>{const a=r.baseline,b=r.result||{seconds:0,for:0,against:0,dangerFor:0,dangerAgainst:0},enough=!r.partial&&a.seconds>=180&&b.seconds>=180;return `<article><h4>${analysisTime(r.time)} · ${trainingSafe(r.label)}</h4><p>${Object.keys(labels).filter(k=>r.before[k]!==r.after[k]).map(k=>`${labels[k]}: ${trainingSafe(values[r.before[k]]||r.before[k]||'Standard')} → ${trainingSafe(values[r.after[k]]||r.after[k]||'Standard')}`).join('<br>')}${tacticalReviewLineupChanges(r.before.lineup,r.after.lineup).map(x=>`<br>${trainingSafe(x)}`).join('')}</p><p><b>Före:</b> ${cell(a)}<br><b>Efter:</b> ${cell(b)}</p>${enough?`<p>Farliga lägen per 10 minuter: skapade ${rate(a,'dangerFor')} → ${rate(b,'dangerFor')}, insläppta ${rate(a,'dangerAgainst')} → ${rate(b,'dangerAgainst')}.</p>`:`<p>${r.partial?'Delvis registrerad match.':'Minst tre minuter vid lika styrka behövs på båda sidor om ändringen.'} Underlaget räcker inte för en jämförelse av takten.</p>`}${specialReviewView(r)}</article>`;}).join('')}<p>Detta visar ett förlopp, inte en säker effekt av beslutet. En ändrad uppställning är din plan; spelarna måste också få istid. Grundjämförelsens siffror gäller hela laget vid lika styrka; PP och PK redovisas separat. Formationernas egen istid och resultat finns i matchanalysens formationsvy. Motståndets ändringar, spelarna på isen och slumpen påverkar också. De sex senaste ändringarna visas.</p></details>`;
}

function specialReviewPlan(){
 const units=Object.fromEntries(['pp1','pp2','pk1','pk2'].map(k=>[k,(state.specialTeams?.[k]||[]).map(id=>({id:String(id),name:playerById(id)?.name||'Vakant'}))]));
 return {plans:{...state.specialPlans},units};
}
function specialReviewTotals(){return {pp:tacticalReviewTotals('pp'),pk:tacticalReviewTotals('pk')};}
function specialReviewDelta(end,start={}){return Object.fromEntries(['pp','pk'].map(k=>[k,tacticalReviewDelta(end[k],start?.[k])]));}
function specialReviewView(r){
 const a=r.before.special,b=r.after.special;if(!a||!b)return '';
 return ['pp','pk'].map(kind=>{
  const changes=[];
  for(const k of kind==='pp'?['pp']:['pk','counter'])if(a.plans[k]!==b.plans[k]){
   const names=k==='counter'?{safe:'Säkra hemåt',selective:'Välj kontringsläge'}:SPECIAL_SCHEMES[k];
   changes.push(`${k==='counter'?'Kontringar':'Spelsystem'}: ${names[a.plans[k]]||'Standard'} → ${names[b.plans[k]]||'Standard'}`);
  }
  for(const k of [kind+'1',kind+'2'])if(JSON.stringify(a.units[k]?.map(p=>p.id))!==JSON.stringify(b.units[k]?.map(p=>p.id)))changes.push(`${k.toUpperCase()}: ${(a.units[k]||[]).map(p=>p.name).join(' / ')} → ${(b.units[k]||[]).map(p=>p.name).join(' / ')}`);
  if(!changes.length)return '';
  const before=r.specialBaseline?.[kind],after=r.specialResult?.[kind],cell=x=>x?`${analysisTime(Math.round(x.seconds))} · ${x.for}–${x.against} försök · ${x.dangerFor}–${x.dangerAgainst} farliga`:'Underlag saknas';
  const enough=!r.partial&&before?.seconds>=180&&after?.seconds>=180;
  return `<section><h4>${kind==='pp'?'Powerplay':'Boxplay'} · separat underlag</h4><p>${changes.map(trainingSafe).join('<br>')}</p><p>Före: ${cell(before)}<br>Efter: ${cell(after)}</p>${enough?`<p>Farliga lägen per 10 minuter i denna spelform: skapade ${(before.dangerFor*600/before.seconds).toFixed(1)} → ${(after.dangerFor*600/after.seconds).toFixed(1)}, insläppta ${(before.dangerAgainst*600/before.seconds).toFixed(1)} → ${(after.dangerAgainst*600/after.seconds).toFixed(1)}.</p>`:'<p>Minst tre minuter i denna spelform behövs före och efter. Ingen jämförelse av takten ännu.</p>'}<p>Hela lagets spel i ${kind==='pp'?'numerärt överläge':'numerärt underläge'}, båda enheterna sammanräknade. Antal spelare och motstånd varierar; detta bevisar inte effekten av ändringen.</p></section>`;
 }).join('');
}
