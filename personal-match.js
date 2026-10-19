"use strict";

// One personal thread follows the actual fixture, selection and finished report.
function personalMatchFixture(){return matchBriefFixture();}
function personalMatchConfig(g=personalMatchFixture()){const c=state.clubOffice?.personalMatch;return c?.key===matchBriefKey(g)&&c.club===managerClub()?c:null;}
function personalMatchCandidates(g=personalMatchFixture()){
 if(!g)return [];const rows=[],club=managerClub(),date=state.calendar.date;
 const add=(p,kind,title,detail,priority)=>{if(p&&!rows.some(r=>samePlayerId(r.playerId,p.id)))rows.push({playerId:String(p.id),name:p.name,kind,title,detail,priority,own:getPlayerClub(p.id)===club});};
 for(const s of state.stories?.active||[])if(s.club===club&&s.type==='breakthrough'&&s.status==='following'){
  const p=playerById(s.ids[0]);if(p)add(p,'trial','Din satsning får nästa kapitel',`${p.name}: ${s.expectation?.detail||'Din provperiod följs mot faktisk tävlingsistid.'}`,100);
 }
 for(const h of state.recruitment?.history||[]){
  if(h.buyer!==club||!h.date||h.date>date||calGap(h.date,date)>30)continue;const p=playerById(h.playerId);if(!p)continue;
  const played=(state.analysis?.matches||[]).some(m=>m.club===club&&m.date>=h.date&&!m.friendly&&m.finished&&!m.partial&&!m.abandoned&&m.players?.some(q=>samePlayerId(q.id,p.id)&&q.seconds>0));
  if(!played)add(p,'arrival',g.kind==='Träningsmatch'?'Ett nyförvärv ska hitta sin plats':'Första tävlingsmatchen efter värvningen',`${p.name} anslöt från ${h.seller} den ${calText(h.date)}. Nästa plats i laget väljer du.`,90);
 }
 for(const p of managerRoster()){
  const absent=journeyPlayer(p.id)?.clubs[club]?.absent;
  if(absent&&medicalReady(p)&&calGap(absent,date)>=7)add(p,'comeback','Vägen tillbaka till isen',`${p.name} har haft registrerad frånvaro sedan ${calText(absent)}. ${medicalStatus(p)}; medicinska begränsningar gäller.`,80);
  const q=p.recruitmentPromise;if(q&&!q.resolved&&(!q.club||q.club===club))add(p,'promise','Ett tidigare besked följer med',`${p.name}: ${q.role}, ${rolePromiseTarget(q)}. Det befintliga löftet följs i tävlingsmatcherna.`,60);
 }
 for(const h of state.recruitment?.history||[]){if(h.seller!==club||h.buyer!==g.opponent||getPlayerClub(h.playerId)!==g.opponent)continue;add(findPlayerAnywhere(h.playerId),'reunion','Ett återseende på andra sidan',`${h.name} tillhör nu ${g.opponent}. Ni möts som motståndare; hans uttagning är ännu inte bekräftad.`,70);}
 return rows.sort((a,b)=>b.priority-a.priority||a.playerId.localeCompare(b.playerId)).slice(0,8);
}
function personalMatchFocus(g=personalMatchFixture()){
 const rows=personalMatchCandidates(g),c=personalMatchConfig(g);return rows.find(r=>r.playerId===c?.playerId)||rows[0]||null;
}
function personalMatchSetFocus(id){
 const g=personalMatchFixture();if(!managerCanPlay()||loanLocked()||!g||!personalMatchCandidates(g).some(r=>samePlayerId(r.playerId,id)))return false;
 const c=personalMatchConfig(g);state.clubOffice.personalMatch={version:1,key:matchBriefKey(g),club:managerClub(),playerId:String(id),choice:c?.choice||null};save();render();return true;
}
function personalMatchSlot(p){
 if(samePlayerId(state.lines?.goalie,p.id))return {type:'goalie',index:0};
 for(const type of ['forwards','defense']){const index=state.lines?.[type]?.findIndex(id=>samePlayerId(id,p.id));if(index>=0)return {type,index};}return null;
}
function personalMatchLocked(p,slot){return state.tacticsLocks?.club===managerClub()&&slot&&samePlayerId(state.tacticsLocks.slots?.[slot.type+'-'+slot.index],p.id);}
function personalMatchLineKey(){return JSON.stringify([state.lines,state.matchSelection?.extras||[],state.matchSelection?.backup??null]);}
function personalMatchDilemma(g=personalMatchFixture()){
 if(!g||loanLocked()||!state.lines)return null;
 const selected=[...state.lines.forwards,...state.lines.defense,state.lines.goalie].map(playerById).filter(Boolean),pool=managerRoster().filter(p=>medicalReady(p)&&!p.health?.injury),protagonists=personalMatchCandidates(g).filter(r=>r.own);
 const choices=[];
 for(const p of selected){
  const slot=personalMatchSlot(p);if(!slot||!medicalReady(p)||p.health?.injury||personalMatchLocked(p,slot))continue;
  const role=slot.type==='goalie'?'G':lineupRole(slot.type,slot.index),tired=(p.fatigue||0)>=35;
  for(const q of pool){
   const other=personalMatchSlot(q);if(samePlayerId(q.id,p.id)||worldGroup(q)!==worldGroup(p)||personalMatchLocked(q,other)||positionFit(q,role)<.9)continue;
   if(other&&(other.type!==slot.type||other.index<=slot.index))continue;
   const trial=protagonists.find(r=>r.playerId===String(q.id)&&r.kind==='trial'),fresh=(q.fatigue||0)<(p.fatigue||0)-15;
   if(!(tired&&fresh)&&!(trial&&p.pos!=='MV'&&slot.index<(slot.type==='forwards'?9:4)))continue;
   const reason=tired&&fresh?`${p.name} har ${Math.round(p.fatigue||0)}/100 slitage. ${q.name} har ${Math.round(q.fatigue||0)}/100 och kan ta ${tacticsSlotLabel(slot.type,slot.index).toLowerCase()}.`:`${q.name} har en pågående provperiod men står lägre i uppställningen. ${p.name} har platsen i ${tacticsSlotLabel(slot.type,slot.index).toLowerCase()}.`;
   choices.push({starter:p,candidate:q,slot,other,reason,tired:tired&&fresh,score:(tired&&fresh?100+(p.fatigue||0):40)+(trial?30:0)+(q.age<=23?5:0)});
  }
 }
 choices.sort((a,b)=>b.score-a.score||String(a.candidate.id).localeCompare(String(b.candidate.id))||a.slot.index-b.slot.index);
 const d=choices[0];if(!d)return null;
 d.signature=JSON.stringify([matchBriefKey(g),personalMatchLineKey(),d.starter.id,d.candidate.id,d.starter.fatigue||0,d.candidate.fatigue||0,state.tacticsLocks?.slots||{},personalMatchCandidates(g).map(r=>[r.playerId,r.kind,r.detail])]);return d;
}
function personalMatchChoose(choice,signature){
 if(!['stay','rotate'].includes(choice)||!managerCanPlay()||loanLocked())return false;
 const g=personalMatchFixture(),d=personalMatchDilemma(g);if(!d||signature!==d.signature)return false;
 const c=personalMatchConfig(g),before=personalMatchLineKey();
 if(choice==='rotate'){
  if(d.slot.type==='goalie')changeGoalie(d.candidate.id);else changeLinePlayer(d.slot.type,d.slot.index,d.candidate.id);
  if(!samePlayerId(tacticsId(d.slot.type,d.slot.index),d.candidate.id))return false;
 }
 const label=choice==='stay'?`Behåll ${d.starter.name} på platsen`:`Ge ${d.candidate.name} platsen`;
 state.clubOffice.personalMatch={version:1,key:matchBriefKey(g),club:managerClub(),playerId:c?.playerId||personalMatchFocus(g)?.playerId||null,choice:{choice,label,date:state.calendar.date,starterId:String(d.starter.id),starter:d.starter.name,candidateId:String(d.candidate.id),candidate:d.candidate.name,type:d.slot.type,index:d.slot.index,reason:d.reason,before,after:personalMatchLineKey()}};
 for(const p of [d.starter,d.candidate])journeyEvent(p,`selection:${matchBriefKey(g)}:${choice}:${d.starter.id}:${d.candidate.id}`,'decision','Ditt uttagningsval',`${label} inför ${g.opponent} den ${calText(g.date)}. Uppställningen kan ändras före nedsläpp; faktisk istid följs efter matchen.`);
 save();render();return true;
}
function personalMatchCapture(opponent){
 const g=personalMatchFixture();if(!g||g.date!==state.calendar.date||g.opponent!==opponent)return null;
 const focus=personalMatchFocus(g),c=personalMatchConfig(g);if(!focus&&!c?.choice)return null;
 const ids=[...(focus?.own?[focus.playerId]:[]),...(c?.choice?[c.choice.starterId,c.choice.candidateId]:[])],subjects=[];
 for(const id of [...new Set(ids)]){
  const p=playerById(id);if(!p)continue;journeyTrack(p);
  const s=state.stories?.active.find(s=>s.club===managerClub()&&s.type==='breakthrough'&&s.status==='following'&&s.ids.some(id=>samePlayerId(id,p.id)));
  subjects.push({id:String(p.id),name:p.name,pos:p.pos,place:lineupPlayerPlace(p),fatigue:Math.round(p.fatigue||0),energy:Math.round(readinessCeiling(p.fatigue||0)),firstGoal:!(journeyPlayer(p.id)?.clubs[managerClub()]?.goals)&&!(state.analysis?.matches||[]).some(m=>m.club===managerClub()&&m.finished&&!m.friendly&&!m.partial&&!m.abandoned&&m.players?.some(r=>samePlayerId(r.id,p.id)&&r.goals>0)),trialSeconds:s?.expectation?.seconds||null});
 }
 return JSON.parse(JSON.stringify({version:1,key:matchBriefKey(g),club:managerClub(),year:state.season.year,date:g.date,opponent,focus,choice:c?.choice?{...c.choice,changed:c.choice.after!==personalMatchLineKey()}:null,subjects}));
}
function personalMatchAfter(m){
 const p=m.personalMatch;if(!p||p.club!==m.club||p.year!==m.year||p.date!==m.date||p.opponent!==m.opponent||!m.finished||m.partial||m.abandoned)return;
 const rows=[];
 for(const s of p.subjects){
  const r=m.players?.find(r=>samePlayerId(r.id,s.id));if(!r){rows.push({playerId:s.id,name:s.name,text:'Spelarens individuella matchunderlag saknas.'});continue;}
  let text=`${s.place} vid nedsläpp. ${r.seconds>0?analysisTime(r.seconds)+' registrerad istid':'Ingen registrerad istid'}. ${r.goals||0} mål och ${r.assists||0} assist.`;
  if(!m.friendly&&s.firstGoal&&(r.goals||0)>0)text+=' Första registrerade målet i er gemensamma historia.';
  if(!m.friendly&&s.trialSeconds){const current=playerById(s.id),excused=current&&medicalExcused(current,s.trialSeconds);text+=excused&&r.seconds<s.trialSeconds?' Medicinsk frånvaro pausar bedömningen.':r.seconds>=s.trialSeconds?' Den här matchen nådde provperiodens minutgräns. Hela provperioden följs separat.':'Den här matchen nådde inte provperiodens minutgräns. Hela provperioden följs separat.';}
  rows.push({playerId:s.id,name:s.name,text});
  const current=playerById(s.id);if(current)journeyEvent(current,`personal-result:${m.club}:${m.year}:${m.id}`,'decision',m.friendly?'Ditt val i träningsmatchen':'Ditt val mötte matchen',text,{matchId:String(m.id)});
 }
 const choice=p.choice,headline=choice?choice.label:p.focus?.title||'Din matchberättelse';
 m.personalOutcome={version:1,title:headline,detail:choice?(choice.changed?'Uppställningen ändrades efter ditt val. Nedsläppsplacering och faktisk istid visas nedan.':choice.choice==='rotate'?`${choice.candidate} fick den valda platsen vid nedsläpp. Matchens faktiska användning följer nedan.`:`Du behöll ${choice.starter} på den valda platsen vid nedsläpp.`):p.focus?.detail||'',rows};
 if(m.friendly)m.personalOutcome.note='Träningsmatch: produktionen hör till denna match. Tävlingslöften och tävlingsmilstolpar bedöms inte här.';
 if(p.focus?.kind==='reunion')m.personalOutcome.note=`Ni mötte ${m.opponent}, där ${p.focus.name} numera spelar. Hans deltagande bedöms inte utan individuellt motståndarunderlag.`;
}
function personalMatchOutcomeView(m){
 const o=m?.personalOutcome;if(!o||m.club!==managerClub()||m.partial||m.abandoned)return '';
 return `<section class="personal-match-result" aria-label="Ditt val och matchens utfall"><span class="desk-kicker">${m.friendly?'TRÄNINGSMATCH':'EFTER MATCHEN'} · ${calText(m.date)}</span><h3>${trainingSafe(o.title)}</h3><p>${trainingSafe(m.club)} ${m.own}–${m.against} ${trainingSafe(m.opponent)}</p><p>${trainingSafe(o.detail)}</p>${o.rows.map(r=>`<p><strong>${playerReference(r.playerId,r.name)}</strong><br>${trainingSafe(r.text)}</p>`).join('')}${o.note?`<p class="pm-note">${trainingSafe(o.note)}</p>`:''}<button class="desk-link" onclick="matchesOpenReport(${trainingSafe(JSON.stringify(String(m.id)))})">Matchunderlag →</button></section>`;
}
function personalMatchPreviewView(){
 const live=state.live&&!state.live.finished?state.live:null,g=personalMatchFixture(),focus=live?.personalMatch?.focus||personalMatchFocus(g);if(!focus)return '';
 const rows=personalMatchCandidates(g);
 return `<section class="personal-match-preview"><span class="desk-kicker">${live?'MATCHEN PÅGÅR':'INFÖR '+calText(g.date)} · ${trainingSafe(live?.opponent||g.opponent)}</span><h3>${trainingSafe(focus.title)}</h3><p>${playerReference(focus.playerId,focus.name)}</p><p>${trainingSafe(focus.detail)}</p>${!live&&rows.length>1?`<details><summary>Välj vem du vill följa</summary><label>Matchens personliga historia<select onchange="personalMatchSetFocus(this.value)">${rows.map(r=>`<option value="${trainingSafe(r.playerId)}" ${r.playerId===focus.playerId?'selected':''}>${trainingSafe(r.name)} · ${trainingSafe(r.title)}</option>`).join('')}</select></label></details>`:''}${!live?'<button class="desk-link" onclick="deskNavigate(\'lines\')">Till laguttagningen →</button>':''}</section>`;
}
function personalMatchDilemmaView(){
 const g=personalMatchFixture();if(!g||loanLocked())return '';
 const c=personalMatchConfig(g),d=personalMatchDilemma(g),selection=c?.choice;
 const prior=selection?`<p class="pm-chosen" role="status">Ditt senaste val: <strong>${trainingSafe(selection.label)}</strong>. ${selection.after!==personalMatchLineKey()?'Uppställningen har ändrats sedan dess.':''}</p>`:'';
 if(!d)return selection?`<section class="personal-match-dilemma"><h3>Ditt val inför ${trainingSafe(g.opponent)}</h3>${prior}<p>Justera vidare i uppställningen om du vill. Befintliga roller och löften gäller.</p></section>`:'';
 const risk=p=>{const c=transferCommitment(p);return c?c.text:'Inget aktivt individuellt löfte i underlaget.';},energy=p=>Math.round(readinessCeiling(p.fatigue||0));
 return `<section class="personal-match-dilemma" aria-label="Assistentens två uttagningsalternativ"><span class="desk-kicker">ASSISTENTENS VÄGVAL · ${calText(g.date)}</span><h3>${d.tired?'Orken eller kontinuiteten?':'När ska satsningen få plats?'}</h3><p>${trainingSafe(d.reason)}</p>${prior}<div class="pm-options"><article><h4>Behåll ${playerReference(d.starter.id,d.starter.name)}</h4><p>Bedömd nivå ${assessmentBadge(d.starter)}</p><p>${energy(d.starter)} % startenergi om matchen börjar nu · ${trainingSafe(d.starter.promisedRole||'Rotation')}.</p><p>${trainingSafe(risk(d.starter))}</p><p>${d.tired?'Spelaren behåller sin plats men tar med sig slitaget in i matchen.':'Du behåller uppställningen. Provperioden måste fortfarande rymmas i kommande uttagningar.'}</p><button class="btn secondary" onclick="personalMatchChoose('stay',${trainingSafe(JSON.stringify(d.signature))})">Behåll nuvarande spelare</button></article><article><h4>Ge ${playerReference(d.candidate.id,d.candidate.name)} chansen</h4><p>Bedömd nivå ${assessmentBadge(d.candidate)}</p><p>${energy(d.candidate)} % startenergi om matchen börjar nu · ${trainingSafe(d.candidate.promisedRole||'Rotation')}.</p><p>${trainingSafe(risk(d.candidate))}</p><p>${d.other?'Spelarna byter plats i ordinarie formationer; båda kan fortfarande spela.':'Ersättaren tar platsen i ordinarie formation. Den tidigare spelaren kan fortfarande vara uttagen som reserv eller i special teams.'} Samspel och konkurrens förändras.</p><button class="btn secondary" onclick="personalMatchChoose('rotate',${trainingSafe(JSON.stringify(d.signature))})">Välj ersättaren på platsen</button></article></div><p class="pm-note">Valet ändrar uppställningen och ger inga nya löften. Energin kan ändras före matchdagen. Reserver och special teams granskar du i laguttagningen.</p></section>`;
}
function personalMatchOverview(){
 const last=state.analysis?.matches.find(m=>m.club===managerClub()&&m.personalOutcome),recent=last&&calGap(last.date,state.calendar.date)>=0&&calGap(last.date,state.calendar.date)<=7?last:null,preview=personalMatchPreviewView();
 if(!preview&&!recent)return '';
 return `<section class="personal-match-panel build-panel" aria-label="Din personliga matchberättelse"><header><h2>Din match har en historia</h2></header>${recent?personalMatchOutcomeView(recent):''}${preview}${!loanLocked()&&personalMatchDilemma(personalMatchFixture())?'<button class="btn secondary" onclick="deskNavigate(\'lines\')">Granska assistentens två alternativ →</button>':''}</section>`;
}
function validatePersonalMatch(s){
 const object=v=>v&&typeof v==='object'&&!Array.isArray(v),str=v=>typeof v==='string'&&v.length<=12000,date=v=>str(v)&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v)),fail=()=>{throw Error('Ogiltig personlig matchberättelse i sparfilen.');};
 const choice=c=>{if(!object(c)||!['stay','rotate'].includes(c.choice)||!['forwards','defense','goalie'].includes(c.type)||!Number.isInteger(c.index)||c.index<0||c.index>=(c.type==='forwards'?12:c.type==='defense'?6:1)||!date(c.date)||['label','starterId','starter','candidateId','candidate','reason','before','after'].some(k=>!str(c[k])))fail();};
 const config=o=>{const c=o?.personalMatch;if(!c)return;if(!object(c)||c.version!==1||!str(c.key)||!str(c.club)||c.playerId!==null&&!str(c.playerId))fail();if(c.choice)choice(c.choice);};
 config(s.clubOffice);for(const b of Object.values(s.managerCareer?.bank||{}))config(b.clubOffice);
 for(const m of [s.live,...(s.analysis?.matches||[])].filter(Boolean)){
  const p=m.personalMatch;if(!p){if(m.personalOutcome)fail();continue;}
  if(!object(p)||p.version!==1||!str(p.key)||!str(p.club)||!str(p.opponent)||!Number.isInteger(p.year)||!date(p.date)||!Array.isArray(p.subjects)||p.subjects.length>3)fail();
  if(p.focus&&(!object(p.focus)||['playerId','name','title','detail'].some(k=>!str(p.focus[k]))||!['trial','arrival','comeback','promise','reunion'].includes(p.focus.kind)||typeof p.focus.own!=='boolean'))fail();
  if(p.choice){choice(p.choice);if(typeof p.choice.changed!=='boolean')fail();}
  const ids=new Set();for(const r of p.subjects){if(!object(r)||['id','name','pos','place'].some(k=>!str(r[k]))||ids.has(r.id)||!Number.isFinite(r.energy)||r.energy<0||r.energy>100||!Number.isFinite(r.fatigue)||r.fatigue<0||r.fatigue>100||typeof r.firstGoal!=='boolean'||r.trialSeconds!==null&&(!Number.isFinite(r.trialSeconds)||r.trialSeconds<=0||r.trialSeconds>3600))fail();ids.add(r.id);}
  const o=m.personalOutcome;if(o&&(!object(o)||o.version!==1||!str(o.title)||!str(o.detail)||o.note!==undefined&&!str(o.note)||!Array.isArray(o.rows)||o.rows.length>3||o.rows.some(r=>!object(r)||['playerId','name','text'].some(k=>!str(r[k])))))fail();
 }
}
const personalMatchTactics=tacticsWorkspaceView;
tacticsWorkspaceView=function(){return personalMatchDilemmaView()+personalMatchTactics();};
const personalMatchVerdict=analysisMatchVerdictView;
analysisMatchVerdictView=function(m){return personalMatchOutcomeView(m)+personalMatchVerdict(m);};

const personalMatchFeedback=matchFeedbackView;
matchFeedbackView=function(){return (state.live?.finished?personalMatchOutcomeView(analysisLiveReport()):'')+personalMatchFeedback();};
