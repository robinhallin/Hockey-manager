function squadRoleGames(p){return (p.roleGames||[]).filter(g=>g.club===managerClub()&&g.year===state.season.year).slice(-6);}
function squadRecordRole(p,m){
 if(m.friendly||medicalExcused(p,p.pos==='MV'?1800:720))return;
 const key=m.analysis?.id||`${state.season.year}:${state.round}`;
 if((p.roleGames||[]).some(g=>g.key===key))return;
 p.roleGames=[...(p.roleGames||[]),{key,club:managerClub(),year:state.season.year,date:state.calendar.date,seconds:m.iceTime?.[p.id]||0}].slice(-18);
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
 return `<details class="lw-archive"><summary>Roll & faktisk istid</summary><p>${games.length} tillgängliga tävlingsmatcher. ${minutes===null?'Underlaget byggs efter matcherna.':`Snitt ${minutes} min. ${p.pos==='MV'?games.filter(g=>g.seconds>=1800).length+' matcher med minst 30 minuter.':''}`}</p>${p.pos==='MV'?'<p>Löpande förväntan: nyckelmålvakt minst 4 av 6 matcher med 30 minuter, ordinarie minst 2 av 6. Rotation och bredd har inget startkrav. Ett uttryckligt kontraktslöfte följs separat.</p>':''}${roles.length?`<form onsubmit="event.preventDefault();squadDiscussRole('${p.id}',this.elements.role.value)"><label>Diskutera mindre ansvar<select name="role">${roles.map(role=>`<option>${role}</option>`).join('')}</select></label><button type="submit" ${block?'disabled':''}>Föreslå ny roll</button></form><p>${block||'Spelaren kan tacka nej. Ålder, ambition, förtroende och faktisk istid påverkar svaret. Lön och avtalstid ändras inte.'}</p>`:''}${(p.roleHistory||[]).slice(0,3).map(h=>`<p>${calText(h.date)} · ${trainingSafe(h.club)}: ${trainingSafe(h.proposed)}, ${h.accepted?'överens':'avböjt'}.</p>`).join('')}</details>`;
}
function squadArrivalView(p){
 const peers=managerRoster().filter(q=>!samePlayerId(q.id,p.id)&&worldGroup(q)===worldGroup(p)),ready=peers.filter(medicalReady),slots=p.pos==='MV'?2:p.pos==='B'?6:12;
 const commitments=peers.filter(q=>SQUAD_ROLES.indexOf(q.promisedRole)>=2),young=peers.filter(q=>q.age<=23);
 return `<details class="rh-arrival"><summary>Konsekvenser för truppen</summary><p>${ready.length} spelklara ${p.pos==='MV'?'målvakter':p.pos==='B'?'backar':'forwards'} konkurrerar redan om ${slots} ordinarie matchplatser. Värvningen tillför ytterligare en konkurrent.</p><p>${commitments.length} spelare i gruppen har utlovats ordinarie roll eller nyckelroll. ${young.length} är högst 23 år.</p><p>${commitments.length?'Befintliga rollåtaganden: '+commitments.map(q=>trainingSafe(q.name)).join(', ')+'.':'Inga ordinarie roller är utlovade i gruppen.'}</p><p>Kedjorna behålls när spelaren ansluter. Du avgör vem som får plats; befintliga löften gäller fortfarande.</p></details>${squadPlacementView(p)}`;
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
 const displaced=slot.type==='goalie'?state.lines.goalie:state.lines[slot.type][slot.index];
 const plans=(state.recruitment.placementPlans||[]).filter(x=>!(samePlayerId(x.playerId,p.id)&&x.club===managerClub()));
 state.recruitment.placementPlans=[{playerId:p.id,club:managerClub(),year:state.season.year,date:state.calendar.date,...slot,role,displaced},...plans].slice(0,60);
 save();render();return true;
}
function squadPlacementView(p){
 if(isOwnPlayer(p)||!state.lines)return '';
 const slots=squadPlacementSlots(p),plan=squadPlacementPlan(p),slot=slots.find(s=>s.index===plan?.index)||slots[0],role=roleWeights(p).includes(plan?.role)?plan.role:roleWeights(p)[0];
 const currentId=slot.type==='goalie'?state.lines.goalie:state.lines[slot.type][slot.index],displaced=playerById(currentId);
 const ids=slot.type==='goalie'?[]:state.lines[slot.type].slice(Math.floor(slot.index/(slot.type==='defense'?2:3))*(slot.type==='defense'?2:3),Math.floor(slot.index/(slot.type==='defense'?2:3))*(slot.type==='defense'?2:3)+(slot.type==='defense'?2:3)).filter(id=>!samePlayerId(id,currentId));
 const peers=ids.map(playerById).filter(Boolean),assessment=playerAssessment(p),score=attributeWeighted(assessment.estimated,PLAYER_ROLES[role]);
 const currentScore=displaced?attributeWeighted(playerAssessment(displaced).estimated,PLAYER_ROLES[role]):null;
 const natural=playerPositions(p).has(slot.type==='goalie'?'G':slot.type==='defense'?['LD','RD'][slot.index%2]:['LW','C','RW'][slot.index%3]);
 const risk=displaced&&(SQUAD_ROLES.indexOf(displaced.promisedRole)>=2||lockerPromises().some(x=>samePlayerId(x.p.id,displaced.id)&&!x.q.resolved));
 const junior=displaced?.age<=23?`${displaced.name}, ${displaced.age} år, förlorar den planerade platsen. Välj annan istid eller en utvecklingsväg innan värvningen.`:'';
 const safeId=trainingSafe(JSON.stringify(p.id));
 return `<section class="training-coach-note squad-placement"><h3>Prova värvningen i laget</h3><form onsubmit="event.preventDefault();squadPlacementSave(${safeId},this.elements.slot.value,this.elements.role.value)"><label>Planerad plats<select name="slot">${slots.map((s,i)=>`<option value="${i}" ${s.index===slot.index?'selected':''}>${s.label}</option>`).join('')}</select></label><label>Uppgift<select name="role">${roleWeights(p).map(r=>`<option ${r===role?'selected':''}>${r}</option>`).join('')}</select></label><button ${state.live&&!state.live.finished?'disabled':''}>Spara och jämför planen</button></form><p>${plan?`Plan sparad ${calText(plan.date)}`:'Förhandsvisning – ingen plan sparad'} · ${slot.label} · ${role}.</p><p>Bedömd rollförmåga ${Math.max(1,score-assessment.uncertainty).toFixed(1)}–${Math.min(20,score+assessment.uncertainty).toFixed(1)} / 20. ${assessment.visits?'Bygger på scoutingrapporten; äldre observationer ökar osäkerheten.':'Ingen färdig scoutingrapport; osäker uppskattning.'}</p><p>${currentScore!==null?`Nuvarande spelare i samma uppgift: ${currentScore.toFixed(1)} / 20. `:''}${natural?'Kandidaten har stöd för positionen i sin positionsprofil.':'Positionen är ovan för kandidaten. Väg rollförmågan mot positionsanpassningen.'}</p><p>${displaced?`Tar platsen från ${trainingSafe(displaced.name)} (${trainingSafe(displaced.promisedRole||'ingen avtalad roll')}).`:'Platsen är ledig.'}${risk?' Befintligt rollåtagande riskeras; det ändras inte av planen.':''}</p>${junior?`<p>${trainingSafe(junior)}</p>`:''}<p>${peers.length?'Planerade medspelare: '+peers.map(q=>trainingSafe(q.name)).join(', ')+'.':'Målvaktsvalet påverkar fördelningen av starter.'}</p>${plan&&!samePlayerId(plan.displaced,currentId)?'<p>Uttagningen har ändrats sedan planen sparades. Jämförelsen ovan använder den aktuella uppställningen.</p>':''}<p>Planen ändrar inte laguttagning, avtal eller kemi. Samspel måste byggas genom gemensam träning och matcher.</p></section>`;
}
