"use strict";
// Read-only evidence for the office and reports; actions use the existing systems.
function managerRecentMatches(){return (state.analysis?.matches||[]).filter(m=>coachEligible(m)&&matchBriefMeasures(m));}
function managerDecisionItems(){
 const items=[],add=x=>items.push({owner:'Du',requiresDecision:false,level:'high',area:'general',...x});
 for(const c of state.relationships?.club===managerClub()?state.relationships.cases:[]){
  if(c.status==='closed'||!relationshipPlayer(c.playerId))continue;
  add({id:'relationship:'+c.id,title:c.name+(c.wantsMove?': överväger att lämna':': rollen behöver följas upp'),detail:c.evidence,tag:'Relationer',area:'locker',score:c.wantsMove?98:c.tension>=55?87:73,action:{page:'locker',tab:'relationships'},guidance:c.wantsMove?'Återställ ansvaret eller diskutera en mindre roll. Olöst konflikt höjer lönekravet vid förlängning med 10 %.':'Ge rollen verklig istid, erbjud mindre ansvar eller be en ledare medla. Mer istid åt en spelare minskar andras utrymme.'});
 }
 const recent=managerRecentMatches(),latest=recent[0];
 if(latest)add({id:'learning:'+latest.id,title:'Följ upp matchen mot '+latest.opponent,detail:matchLearningText(latest),tag:'Matchlärdom',area:'match',score:68,action:{page:'statistics'},reportId:latest.id,guidance:'Läs utfallet innan du väljer nästa matchplan. Ett enskilt resultat räcker inte för att bedöma en taktik.'});
 const units=analysisAggregateUnits(recent.slice(0,5).filter(m=>Array.isArray(m.units))).filter(u=>u.kind==='forward'&&u.matches>=3&&u.seconds>=900&&u.dangerAgainst-u.dangerFor>=4).sort((a,b)=>(b.dangerAgainst-b.dangerFor)/b.seconds-(a.dangerAgainst-a.dangerFor)/a.seconds);
 if(units[0]){const u=units[0];add({id:'formation:'+u.key,title:'En forwardskombination släpper till fler lägen',detail:`${(u.names||u.players||[]).filter(x=>typeof x==='string').join(' / ')||u.name||'Registrerad kombination'}: ${u.dangerFor}–${u.dangerAgainst} farliga lägen på ${analysisTime(u.seconds)}, ${u.matches} matcher. Registrerat spel vid lika styrka.`,tag:'Kedjor',area:'match',score:77,action:{page:'statistics'},guidance:'Granska kombinationens motstånd och spelformer före ändring. Byt matchning eller spelare; en ny kombination tappar etablerat samspel.'});}
 return items;
}
function managerDecisionGuidance(item){
 return item.guidance||({medical:'Anpassa uttagningen och följ medicinska begränsningar. En tidig återgång kan öka risken för bakslag.',training:'Välj återhämtning eller minska belastningen. Det ger mindre utrymme för utvecklande träning.',contracts:'Förläng, avvakta eller planera en ersättare. Lön och utlovad roll binder framtida utrymme.',locker:'Fördela istid efter löftet eller diskutera rollen. Andra spelare får mindre utrymme.',match:'Välj uppgift och granska motståndet. Högre press kostar ork; lägre press ger bort pucktid.'})[item.area]||'';
}
function matchLearningText(m){
 const v=matchBriefMeasures(m),goal=MATCH_BRIEF_GOALS[m.matchBrief?.goal];
 if(!v)return 'För lite fullständigt registrerat spel vid lika styrka för en bedömning.';
 return `${goal?'Uppgift: '+goal.name+'. ':''}Farliga lägen vid lika styrka: ${v.own}–${v.against} på ${analysisTime(v.seconds)}. ${(m.tacticalReviews||[]).length} registrerade tränarbeslut.`;
}
function matchDecisionReview(m){
 const rows=(m?.tacticalReviews||[]).slice(-3);
 if(!rows.length)return '';
 const rate=(r,k)=>(r[k]*600/r.seconds).toFixed(1);
 return `<section class="mw-panel"><h3>Från beslut till observation</h3>${rows.map(r=>{const a=r.baseline,b=r.result,enough=!m.partial&&!m.strengthPartial&&!m.abandoned&&!r.partial&&a?.seconds>=300&&b?.seconds>=300;return `<article><h4>${analysisTime(r.time)} · ${trainingSafe(r.label)}</h4><p>${enough?`Farliga lägen per tio minuter lika styrka: skapade ${rate(a,'dangerFor')} → ${rate(b,'dangerFor')}, insläppta ${rate(a,'dangerAgainst')} → ${rate(b,'dangerAgainst')}. Före: ${analysisTime(a.seconds)}. Efter: ${analysisTime(b.seconds)}.`:'Minst fem fullständigt registrerade minuter lika styrka behövs både före och efter beslutet. Ingen effektbedömning ännu.'}</p></article>`;}).join('')}<p>Perioderna avgränsas av tränarbesluten. Motstånd, matchläge och spelare kan förändras samtidigt. Detta är observationer, inte bevis för en taktisk effekt. Fullständiga order finns i beslutsloggen.</p></section>`;
}
function managerMatchLearningView(){
 const m=managerRecentMatches()[0];if(!m)return '<section><h3>Lärdom till nästa match</h3><p>Spela en match med minst tio minuter fullständigt registrerat spel vid lika styrka för att få underlag här.</p></section>';
 const g=matchBriefFixture();
 return `<section class="mw-panel"><h3>Lärdom till nästa match</h3><p>${trainingSafe(calText(m.date))} · ${trainingSafe(m.opponent)}. ${trainingSafe(matchLearningText(m))}</p>${matchDecisionReview(m)}<button class="btn secondary" onclick="matchesOpenReport(${trainingSafe(JSON.stringify(m.id))})">Läs hela matchrapporten</button>${g?`<button class="btn secondary" onclick="matchesOpponent(${trainingSafe(JSON.stringify(g.opponent))})">Förbered ${trainingSafe(g.opponent)}</button>`:''}<p>Nästa plan väljs av dig. Tidigare order ändras inte när du läser uppföljningen.</p></section>`;
}
function relationshipRoleOffer(c,p){
 const role=c.role==='Nyckelspelare'?'Ordinarie':'Rotation';
 const promise=lockerPromises().some(x=>samePlayerId(x.p?.id,p.id)&&!x.q.resolved&&x.source!=='Tidigare avtal'&&(!x.q.club||x.q.club===managerClub()));
 const accepts=p.social.trust>=45&&c.tension<70&&(p.social.ambition<=11||p.age>=32&&p.social.ambition<=14);
 return {role,promise,accepts};
}
function relationshipRoleView(c){
 const p=relationshipPlayer(c.playerId);if(!p)return '';
 const offer=relationshipRoleOffer(c,p),locked=!!(state.live&&!state.live.finished)||state.season.phase==='review';
 return `<section><p>${c.wantsMove?'Spelaren överväger att lämna. Lönekravet vid förlängning är 10 % högre så länge konflikten kvarstår. ':''}${c.roleDiscussion?trainingSafe(c.roleDiscussion.text):offer.promise?'Ett aktivt istidslöfte måste först följas upp. Det kan inte raderas genom ett rollsamtal.':`Diskutera ${offer.role.toLowerCase()}. ${offer.accepts?'Spelaren verkar öppen för mindre ansvar.':'Spelaren verkar tveksam utifrån ambition, förtroende och konflikten.'} Vid accept ändras rollen, men lön och tidigare journal består. Ett avslag ger −1 i förtroende. Ett förslag per konflikt.`}</p><button class="btn secondary" onclick="relationshipDiscussRole(${trainingSafe(JSON.stringify(c.id))})" ${locked||offer.promise||c.roleDiscussion?'disabled':''}>Diskutera mindre ansvar</button></section>`;
}
function relationshipDiscussRole(id){
 ensureRelationships();const b=state.relationships,c=b?.cases.find(c=>c.id===id),p=c&&relationshipPlayer(c.playerId);
 if(!p||!managerEmployed()||state.season.phase==='review'||state.live&&!state.live.finished||c.roleDiscussion||c.role!==p.promisedRole)return;
 const offer=relationshipRoleOffer(c,p);if(offer.promise)return;
 const text=offer.accepts?`Vi är överens om rollen ${offer.role}. Lön och avtalstid ändras inte. Förtroendet behöver fortsatt handling.`:'Spelaren avböjer mindre ansvar. Den tidigare rollen gäller och förtroendet minskar med 1.';
 c.roleDiscussion={date:state.calendar.date,role:offer.role,accepted:offer.accepts,text};
 if(offer.accepts){
  p.promisedRole=offer.role;p.squadRole=offer.role;p.social.missed=0;delete p.social.roleConcern;
  socialRemember(p,'Överenskommelse om ny roll',text);relationshipProfile(p).settledAt=b.turn;
  relationshipClose(c,'new-role',text);
 }else relationshipChange(p,-1,'Avböjer mindre ansvar',text);
 managerMessage('relationship-role:'+c.id,p.name+' · samtal om rollen',text,'Omklädningsrum',{link:'locker'});
 save();render();
}

function managerDecisionNavigate(page,tab){
 if(page==='locker'&&tab==='relationships'){deskNavigate(page);lockerSet('tab',tab);}
 else if(page==='statistics'&&tab==='trends'){deskNavigate(page);matchesSet('analysis',tab);}
}
