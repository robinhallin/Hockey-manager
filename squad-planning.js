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
 return `<details class="rh-arrival"><summary>Konsekvenser för truppen</summary><p>${ready.length} spelklara ${p.pos==='MV'?'målvakter':p.pos==='B'?'backar':'forwards'} konkurrerar redan om ${slots} ordinarie matchplatser. Värvningen tillför ytterligare en konkurrent.</p><p>${commitments.length} spelare i gruppen har utlovats ordinarie roll eller nyckelroll. ${young.length} är högst 23 år.</p><p>${commitments.length?'Befintliga rollåtaganden: '+commitments.map(q=>trainingSafe(q.name)).join(', ')+'.':'Inga ordinarie roller är utlovade i gruppen.'}</p><p>Kedjorna behålls när spelaren ansluter. Du avgör vem som får plats; befintliga löften gäller fortfarande.</p></details>`;
}
