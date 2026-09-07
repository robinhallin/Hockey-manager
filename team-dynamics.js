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
function positionBadge(p,role){
 const fit=positionFit(p,role),a=playerAssessment(p);
 return `${starRatingHTML(Math.round(Math.max(0,a.low*fit)*10)/10,Math.round(Math.max(0,a.high*fit)*10)/10,false,a.staff.name)}<small class="position-fit ${fit<.8?'unfamiliar':''}">${Math.round(fit*100)} % positionsvana${fit<.8?' · ovan position':''}</small>`;
}
function lineChemistry(ids,club=managerClub()){
 const ps=ids.map(id=>(state.clubRosters[club]||[]).find(p=>samePlayerId(p.id,id))).filter(Boolean),d=dynamicsClub(club);let total=0,pairs=0,minutes=0;
 for(let i=0;i<ps.length;i++)for(let j=i+1;j<ps.length;j++){
  const a=ps[i],b=ps[j],record=d.pairs[dynamicsKey(a.id,b.id)]||{},nation=p=>p.nationality||p.research?.nationality;
  const shared=Boolean(nation(a)&&nation(a)===nation(b));
  total+=Math.max(20,Math.min(95,45+(shared?5:0)+Math.min(32,(record.seconds||0)/1800)+(record.form||0)));
  minutes+=(record.seconds||0)/60;pairs++;
 }
 return {value:pairs?Math.round(total/pairs):0,minutes:pairs?Math.round(minutes/pairs):0};
}
function chemistryView(ids,club=managerClub()){
 const c=lineChemistry(ids,club);return `<span class="chemistry" title="Gemensam istid, resultat tillsammans och ett litet tillskott för gemensam nationalitet. ${c.minutes} gemensamma minuter i snitt.">Kemi <b>${c.value} %</b><meter min="0" max="100" value="${c.value}" aria-label="Kemi ${c.value} procent"></meter></span>`;
}
function dynamicsRecordMatch(snapshot){
 const m=state.live;if(!m?.broadcast||m.dynamicsSaved)return;m.dynamicsSaved=true;
 const e=studioEngine();
 for(const side of [0,1]){
  const club=side?m.opponent:managerClub(),d=dynamicsClub(club),groups=e.pairSeconds?.[side]||{};
  for(const [key,seconds] of Object.entries(groups)){
   const row=d.pairs[key]??={seconds:0,form:0};row.seconds+=seconds*(club===managerClub()?clubPriorityValue('chemistry'):1);
   const results=e.pairResults?.[side]?.[key]||0;
   row.form=Math.max(-10,Math.min(12,row.form*.96+Math.max(-2,Math.min(2,results))*.6));
  }
  // Retain only relationships between current teammates to bound save size.
  const ids=new Set((state.clubRosters[club]||[]).map(p=>String(p.id)));
  for(const key of Object.keys(d.pairs))if(!key.split('|').every(id=>ids.has(id)))delete d.pairs[key];
  d.lastMatch=snapshot.id;
 }
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
 if(lineupWorkspace==='special')return lineupWorkspaceNav()+specialBoardView();
 if(lineupWorkspace==='squad')return lineupWorkspaceNav()+lineupSquadSummary()+depthBenchView();
 ensureLines();const slot=lineupUI.slot;
 const candidates=managerRoster().filter(p=>medicalAvailable(p)&&(slot?.type==='goalie'?p.pos==='MV':p.pos!=='MV')&&(!lineupUI.query||p.name.toLocaleLowerCase('sv').includes(lineupUI.query.toLocaleLowerCase('sv'))));
 const group=(type,n,size)=>{const ids=state.lines[type].slice(n*size,n*size+size);return `<article class="lineup-group"><header><h2>${type==='forwards'?'Kedja':'Backpar'} ${n+1}</h2>${chemistryView(ids)}</header><div class="lineup-name-row ${type}">${ids.map((_,i)=>lineupBoardCard(type,n*size+i)).join('')}</div></article>`;};
 return `${lineupWorkspaceNav()}<section class="lineup-all"><header><h1>Alla kedjor och backpar</h1><p>Dra namn mellan platserna. På mobil eller med tangentbord: välj en plats, sedan en annan för att byta. Välj en reserv nedan för att sätta in den på markerad plats.</p></header>${hockeyChangeBlocked()?'<p class="lineup-warning">Icing: byten är låsta till nedsläpp.</p>':''}<div class="lineup-all-grid"><div>${[0,1,2,3].map(n=>group('forwards',n,3)).join('')}</div><div>${[0,1,2].map(n=>group('defense',n,2)).join('')}<article class="lineup-group"><header><h2>Målvakt</h2></header>${lineupBoardCard('goalie',0)}</article></div></div><section id="lineupCandidates" tabindex="-1" class="lineup-reserves"><header><h2>${slot?'Välj spelare till markerad plats':'Truppen och reserverna'}</h2><button class="btn secondary" onclick="lineupUI.slot=null;render()">Avmarkera</button></header><label>Sök spelare<input type="search" value="${trainingSafe(lineupUI.query)}" onchange="lineupUI.query=this.value;render()"></label><div>${candidates.map(p=>`<button class="lineup-reserve" draggable="true" ondragstart="event.dataTransfer.setData('text/plain','${haEscape(p.id)}')" onclick="lineupPlace('${haEscape(p.id)}')" ${!slot?'aria-disabled="true"':''}><strong>${trainingSafe(p.name)}</strong><small>${p.pos} · ${lineupPlayerPlace(p)}</small>${slot?positionBadge(p,lineupRole(slot.type,slot.index)):assessmentBadge(p)}<small>Potential ${assessmentBadge(p,true)}</small></button>`).join('')}</div></section><p>Kemin följer spelarnas relationer och utvecklas med gemensam istid och resultat. Samma nationalitet ger ett litet tillskott. Stjärnorna på varje plats visar förmågan efter positionsavdrag.</p></section>`;
}
const MATCH_VIEW_MODES={full:'Hela matchen',extended:'Utökade höjdpunkter',highlights:'Viktiga höjdpunkter',commentary:'Endast resultat & kommentarer'};
function studioShouldShow(e,m=state.live){
 const mode=m?.rink?.mode;if(mode==='full')return true;if(mode==='commentary')return false;
 if(mode==='extended')return e.focus;
 const carrier=e.actor(e.carrier);
 return e.flight?.kind==='shot'||e.flight?.kind==='rebound'||e.wall<(e.highlightUntil||0)||Boolean(carrier&&StudioHockey.progress(carrier.side,carrier.x)>44&&e.shotQuality(carrier)>.075);
}
function studioPlaybackRate(e,m=state.live){return studioShouldShow(e,m)?({1:4,2:8,3:16,4:32}[m.speed]||8):({1:90,2:150,3:240,4:360}[m.speed]||150);}
function matchFullscreen(){const root=document.querySelector('.game-shell');if(typeof document==='undefined')return;if(document.fullscreenElement)document.exitFullscreen?.();else root?.requestFullscreen?.().catch(()=>{});}
