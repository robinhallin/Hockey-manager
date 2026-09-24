function rolePromiseTerms(p,role,legacy=false){
 if(!legacy&&!['Ordinarie','Nyckelspelare'].includes(role))return null;
 return {mode:p.pos==='MV'||legacy?'minutes':'placement',role,minutes:p.pos==='MV'?30:role==='Nyckelspelare'?15:12,total:!legacy&&p.pos==='MV'?6:3,required:!legacy&&p.pos==='MV'&&role==='Nyckelspelare'?4:2};
}
function rolePromiseRule(q){return {minutes:q.minutes??15,total:q.total??3,required:q.required??2};}
function rolePromiseTarget(q){return q.mode==='placement'?(q.role==='Nyckelspelare'?'ansvar i kedja/backpar 1–2':'ansvar i kedja/backpar 1–3'):`minst ${rolePromiseRule(q).minutes} minuter`;}
function rolePolicyUpgrade(p){
 if(p.social.rolePolicyVersion===2)return;
 p.social.rolePolicyVersion=2;p.social.missed=0;
 if(p.social.roleConcern){socialRemember(p,'Ny rolluppföljning','Den tidigare minutbaserade uppföljningen ersätts av faktisk kedjeplacering. Tidigare händelser och förtroende bevaras.');delete p.social.roleConcern;}
 const c=state.relationships?.cases.find(c=>c.playerId===String(p.id));
 if(c)relationshipClose(c,'neutral','Rollkraven har ändrats till faktisk kedjeplacering. Nytt matchunderlag behövs.');
 const q=p.recruitmentPromise;
 if(q&&!q.resolved&&!q.mode&&p.pos!=='MV'&&['Nyckelspelare','Ordinarie'].includes(q.role)){
  p.rolePromiseHistory=[{...q,resolved:true,result:'Ersatt av uppföljning av kedjeplacering',ended:state.calendar?.date},...(p.rolePromiseHistory||[])].slice(0,8);
  Object.assign(q,{mode:'placement',games:0,qualified:0,evidence:[],lastFixture:null,policyUpdated:state.calendar?.date});
 }
}
function rolePromiseAssign(p,role,legacy=false){
 if(p.recruitmentPromise){const q=p.recruitmentPromise;p.rolePromiseHistory=[{...q,resolved:true,result:q.resolved?q.result:'Ersatt genom nytt avtal',ended:state.calendar.date},...(p.rolePromiseHistory||[])].slice(0,8);}
 const terms=rolePromiseTerms(p,role,legacy);
 if(terms)p.recruitmentPromise={role,...terms,games:0,qualified:0,resolved:false,agreed:state.calendar.date,club:managerClub(),evidence:[]};
 else delete p.recruitmentPromise;
}
function rolePromiseOfferView(p){return `<details class="lw-archive"><summary>Vad innebär rollöftet?</summary><p>${p.pos==='MV'?'Ordinarie: minst 30 minuter i 2 av 6 tillgängliga tävlingsmatcher. Nyckelspelare: minst 30 minuter i 4 av 6.':'Nyckelspelare: kedja/backpar 1–2. Ordinarie: kedja/backpar 1–3. Rätt placering under minst hälften av bytena i lika styrka och minst tre minuters total istid, i 2 av de första 3 tillgängliga tävlingsmatcherna. Även minst 15 respektive 12 minuter genom exempelvis special teams uppfyller rollen.'}</p><p>Rotation och bredd ger inget särskilt introduktionslöfte. Skador och medicinska istidsgränser kan pausa uppföljningen. Avtalet följs i Omklädningsrum → Löften om istid. Separata, uttryckliga minutlöften gäller fortfarande.</p></details>`;}
function rolePromiseEvidence(q){return (q.policyUpdated?`<p>Rolluppföljningen ändrades ${calText(q.policyUpdated)} till faktisk kedjeplacering. En ny bedömningsperiod startades; den tidigare överenskommelsen finns i historiken.</p>`:'')+(q.evidence?.length?`<details><summary>Matchunderlag · ${q.evidence.length}</summary>${q.evidence.map(g=>`<p>${calText(g.date)} · ${trainingSafe(g.opponent||'Tävlingsmatch')}: ${(g.seconds/60).toFixed(1)} min · ${g.qualified?'målet nått':'under målet'}${rolePromiseMatchLink(g)}</p>`).join('')}</details>`:'');}

function rolePromiseMatchLink(g){
 const match=(state.analysis?.matches||[]).find(m=>m.id===g.key);
 if(!match)return ' · Matchrapport saknas';
 return ` · <a href="#match/${encodeURIComponent(String(match.id))}" onclick="${trainingSafe('matchesOpenReport('+JSON.stringify(match.id)+');return false;')}">Öppna matchrapport</a>`;
}
