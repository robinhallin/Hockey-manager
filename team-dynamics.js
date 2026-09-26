"use strict";
// Pair relationships survive line changes; unknown nationalities add no bonus.
function dynamicsClub(club=managerClub()){
 state.teamDynamics??={version:1,clubs:{}};
 return state.teamDynamics.clubs[club]??={pairs:{},lastMatch:null};
}
function dynamicsKey(a,b){return [String(a),String(b)].sort().join('|');}
const positionRoleCache=new WeakMap();
function playerPositions(p){
 const cached=positionRoleCache.get(p);if(cached&&cached.pos===p.pos&&cached.positions===p.positions&&cached.research===p.research?.position&&cached.position===p.position)return cached.roles;
 const raw=[p.pos,...(Array.isArray(p.positions)?p.positions:[]),p.research?.position||'',p.position||''].join('/').toUpperCase();
 const roles=new Set(raw.split(/[^A-ZÅÄÖ]+/).filter(Boolean));
 if(roles.has('D')||roles.has('B')){roles.add('LD');roles.add('RD');}
 if(roles.has('MV')||roles.has('G'))roles.add('G');
 if(roles.has('F')){roles.add('LW');roles.add('RW');}
 if(roles.has('VF'))roles.add('LW');if(roles.has('HF'))roles.add('RW');
 positionRoleCache.set(p,{roles,pos:p.pos,positions:p.positions,research:p.research?.position,position:p.position});return roles;
}
function positionFit(p,role){
 if(!p)return 0;const roles=playerPositions(p);
 if(roles.has(role))return 1;
 if(role==='X')return p.pos==='MV'?0:p.pos==='B'?.62:.97;
 if(role==='G'||p.pos==='MV')return 0;
 const defense=['LD','RD'].includes(role),naturalDefense=p.pos==='B';
 if(defense!==naturalDefense)return .55+Math.min(.1,(p.positionExperience?.[role]||0)/720000);
 if(!defense)return (role==='C'?.84:.94)+Math.min(role==='C'?.10:.04,(p.positionExperience?.[role]||0)/360000);
 return .95;
}
function lineupRole(type,index){return type==='goalie'?'G':type==='defense'?(index%2?'RD':'LD'):['LW','C','RW'][index%3];}
const GOALIE_INSTRUCTIONS={
 balanced:{name:'Balanserad',depth:0,rebound:0,puck:0,text:'Normal positionering och risknivå.'},
 challenge:{name:'Aggressiv vinkel',depth:.55,rebound:-.02,puck:0,text:'Kom längre ut och minska skottvinkeln; känsligare för sidledsspel.'},
 deep:{name:'Djupare positionering',depth:-.45,rebound:.02,puck:0,text:'Spela djupare och ge mer tid för sidledsförflyttningar.'},
 freeze:{name:'Frys returer',depth:0,rebound:.1,puck:-.04,text:'Prioritera kontroll och avblåsning framför snabb omställning.'},
 active:{name:'Aktiv med puck',depth:0,rebound:-.02,puck:.12,text:'Spela pucken oftare bakom mål; högre risk under press.'}
};
function goalieInstruction(){state.tacticalPlan.goalieInstruction??='balanced';return GOALIE_INSTRUCTIONS[state.tacticalPlan.goalieInstruction]?state.tacticalPlan.goalieInstruction:'balanced';}
function setGoalieInstruction(value){if(!GOALIE_INSTRUCTIONS[value]||state.live&&!state.live.finished&&hockeyChangeBlocked())return;state.tacticalPlan.goalieInstruction=value;save();render();}
const PLAYER_TASKS={
 creator:{name:'Spelfördelare',groups:['forwards'],keys:['passing','vision','decisions'],boost:{passing:.045,vision:.05,decisions:.025},text:'Sök puck och skapa nästa passningsalternativ.'},
 carrier:{name:'Pucktransportör',groups:['forwards','defense'],keys:['puckControl','skating','decisions'],boost:{puckControl:.05,skating:.035,decisions:.02},text:'Transportera puck genom press och zoner.'},
 finisher:{name:'Avslutare',groups:['forwards'],keys:['shooting','composure','positioning'],boost:{shooting:.05,composure:.035,positioning:.02},text:'Sök avslutslägen och yta nära mål.'},
 retriever:{name:'Puckvinnare',groups:['forwards'],keys:['workRate','checking','strength'],boost:{workRate:.045,checking:.04,strength:.025},text:'Pressa, återvinn puck och skapa andrachanser.'},
 twoWay:{name:'Tvåvägsansvar',groups:['forwards'],keys:['positioning','decisions','workRate'],boost:{positioning:.04,decisions:.03,workRate:.03},text:'Prioritera balans och understöd i båda riktningar.'},
 firstPass:{name:'Förstapass',groups:['defense'],keys:['passing','vision','decisions'],boost:{passing:.05,vision:.035,decisions:.03},text:'Starta uppspel snabbt med första passningen.'},
 anchor:{name:'Defensivt ankare',groups:['defense'],keys:['positioning','checking','decisions'],boost:{positioning:.05,checking:.04,decisions:.025},text:'Skydda mitten och säkra bakom pucken.'},
 activeD:{name:'Aktiv offensiv back',groups:['defense'],keys:['skating','puckControl','passing'],boost:{skating:.04,puckControl:.035,passing:.035},text:'Följ med anfallet och skapa ett extra passningsalternativ.'}
};
function playerTaskGroup(type){return type==='defense'?'defense':'forwards';}
function ensurePlayerTasks(){state.playerTasks??={forwards:{},defense:{}};return state.playerTasks;}
function playerTask(type,index){
 const group=playerTaskGroup(type),saved=ensurePlayerTasks()[group]?.[index];if(saved&&PLAYER_TASKS[saved]?.groups.includes(group))return saved;
 return group==='defense'?(index%2?'firstPass':'anchor'):(index%3===0?'retriever':index%3===1?'creator':'finisher');
}
function setPlayerTask(type,index,task){
 const group=playerTaskGroup(type);if(state.live&&!state.live.finished&&hockeyChangeBlocked())return;
 if(!PLAYER_TASKS[task]?.groups.includes(group))return;ensurePlayerTasks()[group][index]=task;save();render();
}
function playerTaskForId(id,type,index,side=0){
 if(side!==0)return null;const current=type==='defense'?state.lines.defense[index]:state.lines.forwards[index];return samePlayerId(current,id)?playerTask(type,index):null;
}
function playerTaskFactor(task,key){const b=PLAYER_TASKS[task]?.boost?.[key]||0;return 1+b;}
function playerTaskFit(p,task){const d=PLAYER_TASKS[task];if(!p||!d)return 0;const a=ensurePlayerAttributes(p);return d.keys.reduce((n,k)=>n+(a[k]||10),0)/d.keys.length;}
function playerTaskView(type,index){
 const group=playerTaskGroup(type),task=playerTask(type,index),def=PLAYER_TASKS[task];
 return `<label class="tw-player-task">Uppgift<select aria-label="Spelaruppgift" onchange="setPlayerTask('${group}',${index},this.value)">${Object.entries(PLAYER_TASKS).filter(([,d])=>d.groups.includes(group)).map(([k,d])=>`<option value="${k}" ${k===task?'selected':''}>${d.name}</option>`).join('')}</select><small>${trainingSafe(def.text)}</small></label>`;
}
function positionBadge(p,role){
 const fit=positionFit(p,role),a=playerAssessment(p);
 return `${starRatingHTML(Math.round(Math.max(0,a.low*fit)*10)/10,Math.round(Math.max(0,a.high*fit)*10)/10,false,a.staff.name)}<small class="position-fit ${fit<.8?'unfamiliar':''}">${Math.round(fit*100)} % positionsvana${fit<.8?' · ovan position':''}</small>`;
}
// One explanation and one factor for both engines and all lineup screens.
const CHEMISTRY_ATTRIBUTES=new Set(['passing','vision','positioning','decisions']);
function chemistryFactor(value,key){return CHEMISTRY_ATTRIBUTES.has(key)?1+((value??50)-50)/500:1;}
function lineChemistry(ids,club=managerClub()){
 const roster=state.clubRosters[club]||[],ps=[...new Set(ids.map(String))].map(id=>roster.find(p=>String(p.id)===id)).filter(p=>p&&p.pos!=='MV');
 const d=dynamicsClub(club),parts={base:45,nationality:0,experience:0,training:0,results:0};let total=0,pairs=0,minutes=0;
 for(let i=0;i<ps.length;i++)for(let j=i+1;j<ps.length;j++){
  const a=ps[i],b=ps[j],record=d.pairs[dynamicsKey(a.id,b.id)]||{},nation=p=>p.nationality||p.research?.nationality;
  const shared=nation(a)&&nation(a)===nation(b)?5:0,experience=Math.min(32,(record.seconds||0)/1800),training=Math.min(8,record.training||0),results=record.form||0;
  total+=Math.max(20,Math.min(95,45+shared+experience+training+results));
  parts.nationality+=shared;parts.experience+=experience;parts.training+=training;parts.results+=results;
  minutes+=(record.seconds||0)/60;pairs++;
 }
 if(pairs)for(const k of ['nationality','experience','training','results'])parts[k]/=pairs;
 return {value:pairs?Math.round(total/pairs):50,minutes:pairs?Math.round(minutes/pairs):0,pairs,parts};
}
function chemistryView(ids,club=managerClub()){
 const c=lineChemistry(ids,club);return `<span class="chemistry" title="Gemensam istid, träning och resultat tillsammans. ${c.minutes} gemensamma minuter i snitt.">Kemi <b>${c.value} %</b><meter min="0" max="100" value="${c.value}" aria-label="Kemi ${c.value} procent"></meter></span>`;
}
function playerTacticalProfile(p){
 const a=ensurePlayerAttributes(p),avg=(...ks)=>ks.reduce((n,k)=>n+(a[k]||10),0)/ks.length;
 return {creator:avg('passing','vision','decisions'),carrier:avg('puckControl','skating','decisions'),finisher:avg('shooting','composure','positioning'),retriever:avg('workRate','checking','strength'),defender:avg('positioning','checking','decisions'),support:avg('passing','positioning','workRate')};
}
function lineTacticalFit(ids,type='forwards',club=managerClub()){
 const roster=state.clubRosters[club]||[],ps=ids.map(id=>roster.find(p=>samePlayerId(p.id,id))).filter(Boolean),profiles=ps.map(playerTacticalProfile);
 if(!profiles.length)return {value:50,label:'Saknar underlag',strengths:[],warnings:['Formationen är inte komplett.'],profiles:[]};
 const top=k=>Math.max(...profiles.map(x=>x[k])),avg=k=>profiles.reduce((n,x)=>n+x[k],0)/profiles.length;
 let score=50,strengths=[],warnings=[];
 if(type==='forwards'){
  const needs={creator:top('creator'),carrier:top('carrier'),finisher:top('finisher'),retriever:top('retriever')};
  score=(needs.creator+needs.carrier+needs.finisher+needs.retriever)/4*5;
  if(needs.creator>=14)strengths.push('spelfördelning');else warnings.push('saknar tydlig spelfördelare');
  if(needs.carrier>=14)strengths.push('pucktransport');else warnings.push('svag pucktransport under press');
  if(needs.finisher>=14)strengths.push('avslutshot');else warnings.push('saknar naturlig avslutare');
  if(needs.retriever>=13.5)strengths.push('puckåtervinning');else warnings.push('begränsad puckåtervinning');
  const duplicate=profiles.filter(x=>x.finisher>=14&&x.creator<13&&x.retriever<13).length;
  if(duplicate>=2){score-=7;warnings.push('flera avslutsorienterade spelare konkurrerar om samma uppgift');}
  if(avg('support')<12.5){score-=5;warnings.push('svagt understöd utan puck');}
 }else{
  score=(top('creator')+top('carrier')+avg('defender')+avg('support'))/4*5;
  if(top('creator')>=13.5)strengths.push('förstapass');else warnings.push('svagt förstapass');
  if(top('carrier')>=13.5)strengths.push('pucktransport');else warnings.push('begränsad väg ur press');
  if(avg('defender')>=13)strengths.push('defensiv balans');else warnings.push('sårbart försvarsspel');
  if(profiles.every(x=>x.creator>=14&&x.defender<12.5)){score-=7;warnings.push('båda backarna prioriterar spel med puck framför defensiv säkerhet');}
 }
 score=Math.max(20,Math.min(95,Math.round(score)));
 return {value:score,label:score>=78?'Kompletterar varandra':score>=64?'Fungerande balans':score>=50?'Blandad passform':'Tydliga rollhål',strengths,warnings,profiles};
}
function tacticalFitFactor(fit,key,type='forwards'){
 const v=(fit?.value??50)-50;
 const keys=type==='forwards'?['passing','vision','decisions','positioning','puckControl']:['passing','decisions','positioning'];
 return keys.includes(key)?1+Math.max(-.06,Math.min(.06,v/500)):1;
}
function tacticalFitView(ids,type='forwards',club=managerClub()){
 const f=lineTacticalFit(ids,type,club),detail=[f.strengths.length?'Styrkor: '+f.strengths.join(', '):'',f.warnings.length?'Att bevaka: '+f.warnings.join(', '):''].filter(Boolean).join('. ');
 return `<span class="chemistry tactical-fit" title="${trainingSafe(detail)}">Passform <b>${f.value} %</b><meter min="0" max="100" value="${f.value}" aria-label="Taktisk passform ${f.value} procent"></meter><small>${trainingSafe(f.label)}</small></span>`;
}
function dynamicsTrain(club,units,session,date=state.calendar?.date){
 if(!date||!['tactics','matchprep','powerplay','penaltykill','skills'].includes(session))return;
 const d=dynamicsClub(club);if(d.lastTrainingDate===date)return;d.lastTrainingDate=date;
 const seen=new Set(),roster=state.clubRosters[club]||[];
 for(const ids of units){
  const ps=ids.map(id=>roster.find(p=>samePlayerId(p.id,id))).filter(p=>p&&p.pos!=='MV'&&medicalCanTrain(p)&&p.trainingLoad!=='rest');
  for(let i=0;i<ps.length;i++)for(let j=i+1;j<ps.length;j++){
   const key=dynamicsKey(ps[i].id,ps[j].id);if(seen.has(key))continue;seen.add(key);
   const row=d.pairs[key]??={seconds:0,form:0};row.training=Math.min(8,(row.training||0)+(session==='tactics'?.4:.2));
  }
 }
 dynamicsPrune(club);
}
function dynamicsPrune(club){
 const d=dynamicsClub(club),ids=new Set((state.clubRosters[club]||[]).map(p=>String(p.id)));
 for(const key of Object.keys(d.pairs))if(!key.split('|').every(id=>ids.has(id)))delete d.pairs[key];
}
function dynamicsCommit(club,groups,results={}){
 const d=dynamicsClub(club);
 for(const [key,seconds] of Object.entries(groups||{})){
  if(!Number.isFinite(seconds)||seconds<=0)continue;
  const row=d.pairs[key]??={seconds:0,form:0};
  row.seconds+=seconds*(club===managerClub()?clubProjectFactor('chemistry'):1);
  row.form=Math.max(-10,Math.min(12,row.form*.96+Math.max(-2,Math.min(2,results[key]||0))*.6));
 }
 dynamicsPrune(club);
}
function dynamicsRecordMatch(snapshot){
 const m=state.live;if(!m?.broadcast||m.dynamicsSaved)return;m.dynamicsSaved=true;
 const e=studioEngine();
 for(const side of [0,1]){
  const club=side?m.opponent:managerClub();
  dynamicsCommit(club,e.pairSeconds?.[side],e.pairResults?.[side]);dynamicsClub(club).lastMatch=snapshot.id;
 }
}
function chemistryAnalysisView(){
 const units=[...[0,1,2,3].map(i=>({name:'Kedja '+(i+1),ids:state.lines.forwards.slice(i*3,i*3+3)})),...[0,1,2].map(i=>({name:'Backpar '+(i+1),ids:state.lines.defense.slice(i*2,i*2+2)}))];
 const signed=n=>(n>0?'+':'')+n.toFixed(1);
 return `<details class="chemistry-analysis" ${state.page==='match'?'':'open'}><summary>Analysera formationernas samspel</summary><p>Samma kemi används här, i omklädningsrummet och i matchen. Jämför kontinuitet mot behovet av nya kombinationer.</p><div class="chemistry-table-scroll" tabindex="0" role="region" aria-label="Jämför formationernas kemi"><table><caption>Kemins underlag · före nästa match</caption><thead><tr><th>Formation</th><th>Spelare</th><th>Kemi</th><th>Taktisk passform</th><th>Gemensam istid¹</th><th>Istidsbidrag</th><th>Träningsbidrag</th><th>Resultatbidrag</th><th>Bakgrund²</th><th>Samspelseffekt³</th></tr></thead><tbody>${units.map(u=>{
  const c=lineChemistry(u.ids),type=u.name.startsWith('Kedja')?'forwards':'defense',f=lineTacticalFit(u.ids,type);return `<tr><th scope="row">${u.name}</th><td>${u.ids.map(id=>trainingSafe(playerById(id)?.name||'Vakant')).join(' · ')}</td><td><strong>${c.value}/100</strong></td><td><strong>${f.value}/100</strong><small>${trainingSafe(f.label)}${f.warnings[0]?' · '+trainingSafe(f.warnings[0]):''}</small></td><td>${c.minutes} min</td><td>${signed(c.parts.experience)}</td><td>${signed(c.parts.training)}</td><td>${signed(c.parts.results)}</td><td>${signed(c.parts.base+c.parts.nationality)}</td><td>${signed((chemistryFactor(c.value,'passing')-1)*100)} %</td></tr>`;
 }).join('')}</tbody></table></div><p>Taktisk passform mäter hur formationens egenskaper kompletterar varandra och är separat från kemi. ¹ Genomsnitt per spelarpar. ² Grundvärde 45 och högst +5 för gemensam nationalitet. ³ Påverkar passningar, spelsinne, positionering och beslut; inte alla attribut eller vinstchansen direkt. Värdet avrundas och begränsas till 20–95.</p><p>Träning bygger högst åtta kemipoäng för spelare som faktiskt deltar tillsammans. Resultatbidraget följer mål framåt och bakåt medan paret är på isen. Äldre sparningar behåller sina tidigare värden; träningsbidrag följs från denna uppdatering. En ensam spelare har neutral samspelseffekt.</p></details>`;
}
function lineupBoardPick(type,index){
 const from=lineupUI.slot;
 if(from&&(from.type!==type||from.index!==index)){
  const id=from.type==='goalie'?state.lines.goalie:state.lines[from.type][from.index];
  if(type==='goalie'||from.type==='goalie'){lineupUI.slot=null;lineupBoardPick(type,index);return;}
  lineupUI.slot=null;changeLinePlayer(type,index,id);return;
 }
 if(state.live?.running)pauseMatch();lineupUI.slot={type,index};lineupUI.query='';render();
 document.querySelector('.lineup-name.selected')?.focus?.({preventScroll:true});
}
function lineupDrag(event,type,index){
 const id=type==='goalie'?state.lines.goalie:state.lines[type][index];
 if(!id||hockeyChangeBlocked()){event.preventDefault();return;}
 event.dataTransfer.setData('text/plain',String(id));event.dataTransfer.effectAllowed='move';
}
function lineupDrop(event,type,index){
 event.preventDefault();const p=playerById(event.dataTransfer.getData('text/plain'));if(!p)return;
 if(state.live?.running)pauseMatch();
 if(type==='goalie')changeGoalie(p.id);else changeLinePlayer(type,index,p.id);
}
function lineupBoardCard(type,index){
 const id=type==='goalie'?state.lines.goalie:state.lines[type][index],p=playerById(id),role=lineupRole(type,index);
 return `<button class="lineup-name ${lineupUI.slot?.type===type&&lineupUI.slot?.index===index?'selected':''}" draggable="${Boolean(p)}" ondragstart="lineupDrag(event,'${type}',${index})" ondragover="event.preventDefault()" ondrop="lineupDrop(event,'${type}',${index})" onclick="lineupBoardPick('${type}',${index})"><small>${StudioHockey.ROLE_NAMES[role]}</small><strong>${trainingSafe(p?.name||'Vakant')}</strong>${p?positionBadge(p,role):'<span>Välj spelare</span>'}<small>${p?`${p.pos} · ${Math.round(100-(p.fatigue||0))} % energi`:''}</small></button>`;
}
function lineupBoardView(){
 if(state.page==='lines'||state.page==='tactics')return desktopTacticsView();
 if(lineupWorkspace==='special')return lineupWorkspaceNav()+specialBoardView();
 if(lineupWorkspace==='squad')return lineupWorkspaceNav()+lineupSquadSummary()+depthBenchView();
 ensureLines();const slot=lineupUI.slot;
 const candidates=managerRoster().filter(p=>medicalAvailable(p)&&(slot?.type==='goalie'?p.pos==='MV':p.pos!=='MV')&&(!lineupUI.query||p.name.toLocaleLowerCase('sv').includes(lineupUI.query.toLocaleLowerCase('sv'))));
 const group=(type,n,size)=>{const ids=state.lines[type].slice(n*size,n*size+size);return `<article class="lineup-group"><header><h2>${type==='forwards'?'Kedja':'Backpar'} ${n+1}</h2>${chemistryView(ids)}</header><div class="lineup-name-row ${type}">${ids.map((_,i)=>lineupBoardCard(type,n*size+i)).join('')}</div></article>`;};
 return `${lineupWorkspaceNav()}<section class="lineup-all"><header><h1>Alla kedjor och backpar</h1><p>Dra namn mellan platserna. Med tangentbord: välj en plats med Enter, sedan en annan för att byta. Välj en reserv nedan för att sätta in den på markerad plats.</p></header>${hockeyChangeBlocked()?'<p class="lineup-warning">Icing: byten är låsta till nedsläpp.</p>':''}${chemistryAnalysisView()}<div class="lineup-all-grid"><div>${[0,1,2,3].map(n=>group('forwards',n,3)).join('')}</div><div>${[0,1,2].map(n=>group('defense',n,2)).join('')}<article class="lineup-group"><header><h2>Målvakt</h2></header>${lineupBoardCard('goalie',0)}</article></div></div><section id="lineupCandidates" tabindex="-1" class="lineup-reserves"><header><h2>${slot?'Välj spelare till markerad plats':'Truppen och reserverna'}</h2><button class="btn secondary" onclick="lineupUI.slot=null;render()">Avmarkera</button></header><label>Sök spelare<input type="search" value="${trainingSafe(lineupUI.query)}" onchange="lineupUI.query=this.value;render()"></label><div>${candidates.map(p=>`<button class="lineup-reserve" draggable="true" ondragstart="event.dataTransfer.setData('text/plain','${haEscape(p.id)}')" onclick="lineupPlace('${haEscape(p.id)}')" ${!slot?'aria-disabled="true"':''}><strong>${trainingSafe(p.name)}</strong><small>${p.pos} · ${lineupPlayerPlace(p)}</small>${slot?positionBadge(p,lineupRole(slot.type,slot.index)):assessmentBadge(p)}<small>Potential ${assessmentBadge(p,true)}</small></button>`).join('')}</div></section><p>Kemin följer spelarparen och utvecklas med gemensam träning, istid och resultat. Samma nationalitet ger ett litet tillskott. Stjärnorna på varje plats visar förmågan efter positionsavdrag.</p></section>`;
}
const MATCH_VIEW_MODES={full:'Hela matchen',extended:'Utökade höjdpunkter',highlights:'Viktiga höjdpunkter',commentary:'Endast resultat & kommentarer'};
let studioHighlightWindow=null;
function studioHighlightTrigger(e,m=state.live){
 const mode=m?.rink?.mode;if(mode==='full')return true;if(mode==='commentary')return false;
 if(mode==='extended')return e.focus;
 const carrier=e.actor(e.carrier);
 return e.flight?.kind==='shot'||e.flight?.kind==='rebound'||e.wall<(e.highlightUntil||0)||Boolean(carrier&&StudioHockey.progress(carrier.side,carrier.x)>44&&e.shotQuality(carrier)>.075);
}
function studioHighlightMode(m=state.live){return ['extended','highlights'].includes(m?.rink?.mode);}
function studioHighlightRate(m=state.live){return [.5,1,1.5,2].includes(m?.highlightSpeed)?m.highlightSpeed:1;}
function studioTrackHighlight(e,m=state.live){
 if(!studioHighlightMode(m)){studioHighlightWindow=null;return;}
 if(studioHighlightTrigger(e,m))studioHighlightWindow={engine:e,until:e.wall+6};
}
function studioShouldShow(e,m=state.live){
 return Boolean(studioHighlightTrigger(e,m)||studioHighlightMode(m)&&studioHighlightWindow?.engine===e&&e.wall<studioHighlightWindow.until);
}
function studioPlaybackRate(e,m=state.live){
 if(!studioShouldShow(e,m))return ({1:90,2:150,3:240,4:360}[m.speed]||90);
 return studioHighlightMode(m)?studioHighlightRate(m):({1:4,2:8,3:16,4:32}[m.speed]||4);
}
function setHighlightSpeed(value){
 const m=state.live,rate=Number(value);if(!m||![.5,1,1.5,2].includes(rate))return;
 m.highlightSpeed=rate;if(studioActive())studioRestartClock();clearTimeout(matchTimer);save();render();scheduleTick();
}
function matchPlaybackControls(m=state.live){
 const highlights=studioActive()&&studioHighlightMode(m),commentary=m.rink.mode==='commentary';
 const choices=highlights||commentary?[[1,'90×'],[2,'150×'],[3,'240×'],[4,'360×']]:[[1,'4×'],[2,'8×'],[3,'16×'],[4,'32×']];
 return `${highlights?`<label class="mc-highlight-speed">Höjdpunktstempo<select onchange="setHighlightSpeed(this.value)" aria-label="Höjdpunktstempo">${[[.5,'0,5× · Långsamt'],[1,'1× · Normal'],[1.5,'1,5×'],[2,'2×']].map(([v,label])=>`<option value="${v}" ${studioHighlightRate(m)===v?'selected':''}>${label}</option>`).join('')}</select></label>`:''}<label>${highlights?'Mellan höjdpunkter':commentary?'Simuleringstempo':'Hastighet'}<select onchange="setSpeed(this.value)" aria-label="${highlights?'Tempo mellan höjdpunkter':'Uppspelningshastighet'}">${choices.map(([v,label])=>`<option value="${v}" ${m.speed===v?'selected':''}>${label}</option>`).join('')}</select></label>`;
}
function matchFullscreen(){if(typeof document==='undefined')return;const root=document.documentElement;if(document.fullscreenElement)document.exitFullscreen?.();else root?.requestFullscreen?.().catch(()=>{});}

function validateDynamicsSave(s){
 if(!s.teamDynamics)return;
 const clubs=s.teamDynamics.clubs;
 if(!clubs||typeof clubs!=='object'||Array.isArray(clubs))throw Error('Ogiltigt samspel i sparfilen.');
 for(const club of Object.values(clubs)){
  if(!club?.pairs||typeof club.pairs!=='object'||Array.isArray(club.pairs))throw Error('Ogiltiga spelarpar i sparfilen.');
  for(const row of Object.values(club.pairs)){
   if(!row||typeof row!=='object')throw Error('Ogiltigt spelarpar i sparfilen.');
   for(const [key,min,max] of [['seconds',0,Infinity],['form',-10,12],['training',0,8]]){
    if(row[key]!==undefined&&(!Number.isFinite(row[key])||row[key]<min||row[key]>max))throw Error('Ogiltigt '+key+' för samspel i sparfilen.');
   }
  }
 }
}
