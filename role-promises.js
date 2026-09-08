function rolePromiseTerms(p,role,legacy=false){
 if(!legacy&&!['Ordinarie','Nyckelspelare'].includes(role))return null;
 return {minutes:p.pos==='MV'?30:role==='Nyckelspelare'?15:12,total:!legacy&&p.pos==='MV'?6:3,required:!legacy&&p.pos==='MV'&&role==='Nyckelspelare'?4:2};
}
function rolePromiseRule(q){return {minutes:q.minutes??15,total:q.total??3,required:q.required??2};}
function rolePromiseAssign(p,role,legacy=false){
 if(p.recruitmentPromise){const q=p.recruitmentPromise;p.rolePromiseHistory=[{...q,resolved:true,result:q.resolved?q.result:'Ersatt genom nytt avtal',ended:state.calendar.date},...(p.rolePromiseHistory||[])].slice(0,8);}
 const terms=rolePromiseTerms(p,role,legacy);
 if(terms)p.recruitmentPromise={role,...terms,games:0,qualified:0,resolved:false,agreed:state.calendar.date,club:managerClub(),evidence:[]};
 else delete p.recruitmentPromise;
}
function rolePromiseOfferView(p){return `<details class="lw-archive"><summary>Vad innebär rollöftet?</summary><p>${p.pos==='MV'?'Ordinarie: minst 30 minuter i 2 av 6 tillgängliga tävlingsmatcher. Nyckelspelare: minst 30 minuter i 4 av 6.':'Ordinarie: minst 12 minuter i 2 av 3 tillgängliga tävlingsmatcher. Nyckelspelare: minst 15 minuter i 2 av 3.'}</p><p>Rotation och bredd ger inget särskilt introduktionslöfte. Skador och medicinska istidsgränser kan pausa uppföljningen. Avtalet följs i Omklädningsrum → Löften om istid.</p></details>`;}
function rolePromiseEvidence(q){return q.evidence?.length?`<details><summary>Matchunderlag · ${q.evidence.length}</summary>${q.evidence.map(g=>`<p>${calText(g.date)} · ${trainingSafe(g.opponent||'Tävlingsmatch')}: ${(g.seconds/60).toFixed(1)} min · ${g.qualified?'målet nått':'under målet'}</p>`).join('')}</details>`:'';}
