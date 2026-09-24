function squadRoleGames(p){return (p.roleGames||[]).filter(g=>g.club===managerClub()&&g.year===state.season.year).slice(-6);}
function squadRoleExpectation(p,role=p.promisedRole){
 if(p.pos==='MV')return role==='Nyckelspelare'?'Minst 4 starter om 30 minuter på 6 tillgängliga matcher':role==='Ordinarie'?'Minst 2 starter om 30 minuter på 6 tillgängliga matcher':'Reservmålvakt utan startkrav';
 const placement=role==='Nyckelspelare'?(p.pos==='B'?'backpar 1–2':'kedja 1–2'):role==='Ordinarie'?(p.pos==='B'?'backpar 1–3':'kedja 2–3 eller högre'):(p.pos==='B'?'något av de tre backparen':'kedja 4 eller högre');
 return `${placement[0].toUpperCase()+placement.slice(1)} · ${role==='Nyckelspelare'||role==='Ordinarie'?'4':role==='Rotation'?'3':'2'} av 6 tillgängliga matcher`;
}
function squadRoleEvidence(p,m=state.live,role=p.promisedRole){
 const seconds=m?.iceTime?.[p.id]||0,minimum=p.pos==='MV'?1800:180;
 if(!m||m.friendly||m.analysis?.partial||m.leagueBox?.partial||m.analysisAbandoned||playerLoan(p)||medicalExcused(p,minimum)||p.trainingLoad==='rest')return null;
 if(p.pos==='MV')return {seconds,met:seconds>=1800,role};
 const usage=m.analysis?.players?.[String(p.id)]?.roleUsage;
 const total=(usage||[]).reduce((n,s)=>n+s,0),rank=role==='Nyckelspelare'?2:role==='Ordinarie'?3:4;
 // A substantial special-teams role also counts. A token shift in a top line does not.
 const substantial=seconds>=(role==='Nyckelspelare'?900:role==='Ordinarie'?720:480);
 if(!m.analysis?.roleUsageVersion&&seconds>0&&!substantial)return null;
 const met=substantial||(seconds>=180&&total>=120&&usage.slice(0,rank).reduce((n,s)=>n+s,0)>=total*.5);
 return {seconds,role,met,usage:usage?[...usage]:null};
}
function squadRoleStatus(p){
 const games=squadRoleGames(p).filter(g=>g.role===p.promisedRole&&typeof g.met==='boolean'),required=p.promisedRole==='Nyckelspelare'||p.promisedRole==='Ordinarie'?4:p.promisedRole==='Rotation'?3:2;
 const target=Math.ceil(required*Math.min(6,games.length)/6),met=games.filter(g=>g.met).length;
 return {games:games.length,met,target,missed:games.length>=3&&met<target};
}
function squadRecordRole(p,m){
 const evidence=squadRoleEvidence(p,m);if(!evidence)return;
 const key=m.analysis?.id||`${state.season.year}:${state.round}`;
 if((p.roleGames||[]).some(g=>g.key===key))return;
 p.roleGames=[...(p.roleGames||[]),{key,club:managerClub(),year:state.season.year,date:state.calendar.date,...evidence}].slice(-18);
}
function squadGoalieTarget(p){return p.promisedRole==='Nyckelspelare'?4:p.promisedRole==='Ordinarie'?2:0;}
function squadGoalieMissed(p){
 if(playerLoan(p))return false;
 const games=squadRoleGames(p),target=squadGoalieTarget(p);
 return target>0&&games.length>=6&&games.filter(g=>g.seconds>=1800).length<target;
}
function squadRoleBlock(p){
 if(playerLoan(p))return 'Lånerollen följs i låneavtalet. Ägarklubbens roll kan inte ändras här.';
 if(state.live&&!state.live.finished)return 'Rollsamtal tas mellan matcher.';
 if(lockerPromises().some(x=>x.p===p&&!x.q.resolved))return 'Det aktiva istidslöftet måste följas upp först.';
 if(state.locker.turn-(p.roleTalkTurn??-10)<3)return 'Låt tre matcher gå innan nästa rollsamtal.';
 if(squadRoleGames(p).length<3)return 'Minst tre tillgängliga tävlingsmatcher behövs som underlag.';
 return '';
}
function squadDiscussRole(id,role){
 const p=managerRoster().find(p=>samePlayerId(p.id,id));if(!p||!SQUAD_ROLES.includes(role)||SQUAD_ROLES.indexOf(role)>=SQUAD_ROLES.indexOf(p.promisedRole)||squadRoleBlock(p))return;
 const games=squadRoleGames(p),minutes=games.reduce((n,g)=>n+g.seconds,0)/games.length/60;
 const accepts=(p.age>=32||p.social.ambition<=11)&&p.social.trust>=45&&minutes<(p.pos==='MV'?30:12);
 p.roleTalkTurn=state.locker.turn;
 const previous=p.promisedRole;
 if(accepts){p.promisedRole=role;p.squadRole=role;p.social.missed=0;}
 else p.social.trust=trainingClamp(p.social.trust-2);
 const text=accepts?`${p.name} accepterar ${role.toLowerCase()} efter samtalet. Lön och kontraktstid behålls.`:`${p.name} vill behålla rollen ${previous.toLowerCase()}. Ambition, förtroende och faktisk istid vägdes in. Förtroende −2.`;
 p.roleHistory=[{date:state.calendar.date,club:managerClub(),previous,proposed:role,accepted:accepts},...(p.roleHistory||[])].slice(0,16);
 p.social.lastResponse=text;socialLog('Samtal om rollen: '+p.name,text);lockerNotice(text);
}
function squadRolePanel(p){
 const games=squadRoleGames(p),minutes=games.length?(games.reduce((n,g)=>n+g.seconds,0)/games.length/60).toFixed(1):null,block=squadRoleBlock(p);
 const roles=SQUAD_ROLES.filter(role=>SQUAD_ROLES.indexOf(role)<SQUAD_ROLES.indexOf(p.promisedRole));
 return `<details class="lw-archive"><summary>Roll & faktisk istid</summary><p><strong>${trainingSafe(p.promisedRole)}</strong>: ${squadRoleExpectation(p)}.</p><p>Rätt placering ska gälla under minst hälften av spelarens byten i lika styrka, med minst tre minuters total istid. Stort ansvar i special teams räknas också. Skador, landslag och planerad vila undantas. En enstaka petning utlöser inget missnöje.</p><p>${games.length} tillgängliga tävlingsmatcher. ${minutes===null?'Underlaget byggs efter matcherna.':`Snitt ${minutes} min. ${p.pos==='MV'?games.filter(g=>g.seconds>=1800).length+' matcher med minst 30 minuter.':''}`}</p>${p.pos==='MV'?'<p>Löpande förväntan: nyckelmålvakt minst 4 av 6 matcher med 30 minuter, ordinarie minst 2 av 6. Rotation och bredd har inget startkrav. Ett uttryckligt kontraktslöfte följs separat.</p>':''}${roles.length?`<form onsubmit="event.preventDefault();squadDiscussRole('${p.id}',this.elements.role.value)"><label>Diskutera mindre ansvar<select name="role">${roles.map(role=>`<option>${role}</option>`).join('')}</select></label><button type="submit" ${block?'disabled':''}>Föreslå ny roll</button></form><p>${block||'Spelaren kan tacka nej. Ålder, ambition, förtroende och faktisk istid påverkar svaret. Lön och avtalstid ändras inte.'}</p>`:''}${(p.roleHistory||[]).slice(0,3).map(h=>`<p>${calText(h.date)} · ${trainingSafe(h.club)}: ${trainingSafe(h.proposed)}, ${h.accepted?'överens':'avböjt'}.</p>`).join('')}</details>`;
}
function squadArrivalView(p){
 const peers=managerRoster().filter(q=>!samePlayerId(q.id,p.id)&&worldGroup(q)===worldGroup(p)),ready=peers.filter(medicalReady),slots=p.pos==='MV'?2:p.pos==='B'?6:12;
 const commitments=peers.filter(q=>SQUAD_ROLES.indexOf(q.promisedRole)>=2),young=peers.filter(q=>q.age<=23);
 return `<details class="rh-arrival"><summary>Konsekvenser för truppen</summary><p>${ready.length} spelklara ${p.pos==='MV'?'målvakter':p.pos==='B'?'backar':'forwards'} konkurrerar redan om ${slots} ordinarie matchplatser. Värvningen tillför ytterligare en konkurrent.</p><p>${commitments.length} spelare i gruppen har utlovats ordinarie roll eller nyckelroll. ${young.length} är högst 23 år.</p><p>${commitments.length?'Befintliga rollåtaganden: '+commitments.map(q=>playerReference(q.id,q.name)).join(', ')+'.':'Inga ordinarie roller är utlovade i gruppen.'}</p><p>Kedjorna behålls när spelaren ansluter. Du avgör vem som får plats; befintliga löften gäller fortfarande.</p></details>${squadPlacementView(p)}`;
}
function squadPlacementSlots(p){
 const type=p.pos==='MV'?'goalie':p.pos==='B'?'defense':'forwards';
 return Array.from({length:type==='goalie'?1:type==='defense'?6:12},(_,index)=>({type,index,
  label:type==='goalie'?'Startande målvakt':type==='defense'?`Backpar ${Math.floor(index/2)+1} · ${index%2?'höger':'vänster'}`:`Kedja ${Math.floor(index/3)+1} · ${['vänster','center','höger'][index%3]}`}));
}
function squadPlacementPlan(p){return (state.recruitment?.placementPlans||[]).find(x=>samePlayerId(x.playerId,p.id)&&x.club===managerClub()&&x.year===state.season.year);}
function squadPlacementSave(id,index,role){
 const p=findPlayerAnywhere(id);index=Number(index);
 if(!p||isOwnPlayer(p)||state.live&&!state.live.finished||!Number.isInteger(index)||!roleWeights(p).includes(role))return false;
 const slot=squadPlacementSlots(p)[index];if(!slot)return false;
 if(!state.lines)ensureLines();
 const displaced=slot.type==='goalie'?state.lines.goalie:state.lines[slot.type][slot.index];
 const plans=(state.recruitment.placementPlans||[]).filter(x=>!(samePlayerId(x.playerId,p.id)&&x.club===managerClub()));
 state.recruitment.placementPlans=[{playerId:p.id,club:managerClub(),year:state.season.year,date:state.calendar.date,...slot,role,displaced},...plans].slice(0,60);
 save();render();return true;
}
function squadPlacementView(p){
 if(isOwnPlayer(p))return '';
 if(!state.lines)ensureLines();
 const slots=squadPlacementSlots(p),plan=squadPlacementPlan(p),slot=slots.find(s=>s.index===plan?.index)||slots[0],role=roleWeights(p).includes(plan?.role)?plan.role:roleWeights(p)[0];
 const currentId=slot.type==='goalie'?state.lines.goalie:state.lines[slot.type][slot.index],displaced=playerById(currentId);
 const ids=slot.type==='goalie'?[]:state.lines[slot.type].slice(Math.floor(slot.index/(slot.type==='defense'?2:3))*(slot.type==='defense'?2:3),Math.floor(slot.index/(slot.type==='defense'?2:3))*(slot.type==='defense'?2:3)+(slot.type==='defense'?2:3)).filter(id=>!samePlayerId(id,currentId));
 const peers=ids.map(playerById).filter(Boolean),assessment=playerAssessment(p),score=attributeWeighted(assessment.estimated,PLAYER_ROLES[role]);
 const currentScore=displaced?attributeWeighted(playerAssessment(displaced).estimated,PLAYER_ROLES[role]):null;
 const natural=playerPositions(p).has(slot.type==='goalie'?'G':slot.type==='defense'?['LD','RD'][slot.index%2]:['LW','C','RW'][slot.index%3]);
 const risk=displaced&&(SQUAD_ROLES.indexOf(displaced.promisedRole)>=2||lockerPromises().some(x=>samePlayerId(x.p.id,displaced.id)&&!x.q.resolved));
 const junior=displaced?.age<=23?`${displaced.name}, ${displaced.age} år, förlorar den planerade platsen. Välj annan istid eller en utvecklingsväg innan värvningen.`:'';
 const safeId=trainingSafe(JSON.stringify(p.id));
 return `<section class="training-coach-note squad-placement"><h3>Prova värvningen i laget</h3><form onsubmit="event.preventDefault();squadPlacementSave(${safeId},this.elements.slot.value,this.elements.role.value)"><label>Planerad plats<select name="slot">${slots.map((s,i)=>`<option value="${i}" ${s.index===slot.index?'selected':''}>${s.label}</option>`).join('')}</select></label><label>Uppgift<select name="role">${roleWeights(p).map(r=>`<option ${r===role?'selected':''}>${r}</option>`).join('')}</select></label><button class="btn" ${state.live&&!state.live.finished?'disabled':''}>Spara och jämför planen</button></form><p>${plan?`Plan sparad ${calText(plan.date)}`:'Förhandsvisning – ingen plan sparad'} · ${slot.label} · ${role}.</p><p>Bedömd rollförmåga ${Math.max(1,score-assessment.uncertainty).toFixed(1)}–${Math.min(20,score+assessment.uncertainty).toFixed(1)} / 20. ${assessment.visits?'Bygger på scoutingrapporten; äldre observationer ökar osäkerheten.':'Ingen färdig scoutingrapport; osäker uppskattning.'}</p><p>${currentScore!==null?`Nuvarande spelare i samma uppgift: ${currentScore.toFixed(1)} / 20. `:''}${natural?'Kandidaten har stöd för positionen i sin positionsprofil.':'Positionen är ovan för kandidaten. Väg rollförmågan mot positionsanpassningen.'}</p><p>${displaced?`Tar platsen från ${playerReference(displaced.id,displaced.name)} (${trainingSafe(displaced.promisedRole||'ingen avtalad roll')}).`:'Platsen är ledig.'}${risk?' Befintligt rollåtagande riskeras; det ändras inte av planen.':''}</p>${junior?`<p>${trainingSafe(junior)}</p>`:''}<p>${peers.length?'Planerade medspelare: '+peers.map(q=>playerReference(q.id,q.name)).join(', ')+'.':'Målvaktsvalet påverkar fördelningen av starter.'}</p>${plan&&!samePlayerId(plan.displaced,currentId)?'<p>Uttagningen har ändrats sedan planen sparades. Jämförelsen ovan använder den aktuella uppställningen.</p>':''}<p>Planen ändrar inte laguttagning, avtal eller kemi. Samspel måste byggas genom gemensam träning och matcher.</p></section>`;
}

// Contextual navigation only: choosing an alternative still uses lineupPlace.
function squadOpenPlace(id){
 const p=managerRoster().find(p=>samePlayerId(p.id,id));if(!p)return false;
 const slots=squadPlacementSlots(p),plan=squadPlacementPlan(p);
 const slot=slots.find(s=>samePlayerId(s.type==='goalie'?state.lines.goalie:state.lines[s.type][s.index],p.id))||slots.find(s=>s.type===plan?.type&&s.index===plan.index)||slots[0];
 deskNavigate('lines');lineupWorkspace='even';
 if(slot){if(slot.type==='forwards')lineupUI.line=Math.floor(slot.index/3);if(slot.type==='defense')lineupUI.pair=Math.floor(slot.index/2);lineupPickSlot(slot.type,slot.index);}
 else {lineupUI.slot=null;lineupUI.query=p.name;render();}
 queueInterfaceSave();return true;
}
function squadCandidateEvidence(p,slot){
 if(!isOwnPlayer(p))return '';
 const role=slot?lineupRole(slot.type,slot.index):null;
 const keys=p.pos==='MV'?['reflexes','reboundControl','positioning']:role==='C'?['faceoffs','passing','decisions']:['LD','RD'].includes(role)?['positioning','checking','passing']:['skating','puckControl','shooting'];
 const labels=p.pos==='MV'?GOALIE_ATTRIBUTES:SKATER_ATTRIBUTES;
 const games=squadRoleGames(p),minutes=games.length?(games.reduce((n,g)=>n+g.seconds,0)/60/games.length).toFixed(1):null;
 return `<small>${keys.map(k=>`${trainingSafe(labels[k])} ${p.attributes[k]??'–'}`).join(' · ')}</small><small>${trainingSafe(p.promisedRole||'Ingen avtalad roll')} · ${minutes===null?'Inget registrerat istidsunderlag':`${minutes} min/match · ${games.length} tillgängliga tävlingsmatcher`}</small>`;
}
function squadArrivalFollowup(v){
 const p=managerRoster().find(p=>samePlayerId(p.id,v.id));
 const follow=(state.managerFeedback?.followups||[]).find(r=>r.club===v.club&&samePlayerId(r.playerId,v.id)&&r.date===v.date);
 const plan=v.plan;
 return `<article><h3>${playerReference(v.id,v.name)}</h3><p>${trainingSafe(v.date)} · avtalad roll: ${trainingSafe(v.role)} · ${careerMoney(v.salary)}/år.</p>${plan?`<p>Din plan: ${trainingSafe(plan.label)} · ${trainingSafe(plan.role)}.</p>`:''}${p?`<p>Nu: ${trainingSafe(lineupPlayerPlace(p))}. ${trainingSafe(medicalStatus(p))} · ${Math.round(readinessCeiling(p.fatigue))} % startenergi om matchen börjar nu.</p>`:'<p>Spelaren tillhör inte längre din aktuella trupp.</p>'}${follow?`<p>${follow.games}/5 bedömda matcher · ${analysisTime(follow.seconds)} istid · ${follow.points} poäng · ${follow.excused} medicinskt undantagna matcher. ${trainingSafe(follow.result||'Underlaget byggs fortfarande.')}</p>`:'<p>Ingen registrerad introduktionsuppföljning finns för denna ankomst.</p>'}<p>${v.done?trainingSafe(v.outcome):`Scoutbedömningen följs upp ${calText(calAdd(v.date,42))}. Kort istid räcker inte för att avgöra om värvningen lyckats.`}</p>${p?`<button class="rh-link" onclick="squadOpenPlace(${trainingSafe(JSON.stringify(p.id))})">Granska plats och konkurrens →</button>`:''}</article>`;
}
