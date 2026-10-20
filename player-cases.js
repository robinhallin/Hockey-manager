'use strict';
// A single read model over existing obligations. No new promise or trust ledger.
const playerCaseUI={owner:null,club:null,date:null,id:null,generation:0};
function playerCaseSignature(id){return JSON.stringify([playerCaseUI.generation,managerClub(),state.calendar.date,String(id)]);}
function playerCaseModel(id){
 const p=managerRoster().find(p=>samePlayerId(p.id,id));if(!p)return null;
 const promises=lockerPlayerPromises(p),stories=(state.stories?.active||[]).filter(s=>s.club===managerClub()&&s.ids.some(id=>samePlayerId(id,p.id))),relations=(state.relationships?.club===managerClub()?state.relationships.cases:[]).filter(c=>samePlayerId(c.playerId,p.id)&&c.status!=='closed');
 const followup=p.roleFollowup?.club===managerClub()&&!p.roleFollowup.closed?p.roleFollowup:null;
 const games=(p.roleGames||[]).filter(g=>g.club===managerClub()&&g.date<=state.calendar.date).slice(-5);
 const history=journeyPlayer(p.id)?.events||[];
 return {p,promises,stories,relations,followup,games,history,requests:lockerRequests(p),development:p.developmentReview?.club===managerClub()?p.developmentReview:null,absent:!clubhousePresence(p).present};
}
function playerCaseOpen(id){
 const m=playerCaseModel(id);if(!m||!managerEmployed())return false;
 if(playerCaseUI.owner!==state)playerCaseUI.generation++;
 Object.assign(playerCaseUI,{owner:state,club:managerClub(),date:state.calendar.date,id:String(m.p.id)});
 if(coachWorkspaceEnabled()){
  coachRoomSync();clubhouseUI.player=m.p.id;coachRoomUI.room='locker';coachRoomUI.table=false;coachRoomUI.player=String(m.p.id);coachRoomUI.section='player';deskNavigate('locker');
 }else{deskNavigate('locker');lockerUI.player=m.p.id;lockerUI.detail='case';render();}
 return true;
}
function playerCaseGuard(id,signature){
 return playerCaseUI.owner===state&&playerCaseUI.club===managerClub()&&playerCaseUI.date===state.calendar.date&&String(id)===playerCaseUI.id&&signature===playerCaseSignature(id)&&managerEmployed()&&!(state.live&&!state.live.finished)&&playerCaseModel(id);
}
function playerCaseAction(id,signature,kind,value,choice){
 const m=playerCaseGuard(id,signature);if(!m)return false;
 const p=m.p;
 if(kind==='talk'){
  if(m.absent||state.locker.turn-p.social.lastTalk<3||!['listen','bench','praise','challenge'].includes(value))return false;
  socialTalk(p.id,value);
 }else if(kind==='relation'){
  const c=m.relations.find(c=>c.id===value);if(!c||!['listen','plan','mediate','role'].includes(choice))return false;
  if(choice==='role')relationshipDiscussRole(c.id);else relationshipAction(c.id,choice);
 }else if(kind==='story'){
  const s=m.stories.find(s=>s.id===value&&s.status==='decision');if(!s||!storiesChoices(s).some(c=>c.id===choice))return false;
  storiesChoose(s.id,choice);
 }else if(kind==='followup'){
  if(!m.followup||m.followup.due>state.calendar.date)return false;
  playerFollowupClose(p.id);
 }else if(kind==='chance'){
  if(playerChanceBlock(p))return false;playerChance(p.id);
 }else return false;
 render();return true;
}
function playerCaseButton(m,label,kind,value='',choice=''){return `<button type="button" class="btn secondary" onclick="${trainingSafe(`playerCaseAction(${JSON.stringify(String(m.p.id))},${JSON.stringify(playerCaseSignature(m.p.id))},${JSON.stringify(kind)},${JSON.stringify(value)},${JSON.stringify(choice)})`)}" ${state.live&&!state.live.finished?'disabled':''}>${trainingSafe(label)}</button>`;}
function playerCaseView(id){
 const m=playerCaseModel(id);if(!m)return '<p>Spelaren tillhör inte längre din trupp.</p>';
 const {p}=m,safe=trainingSafe,locked=state.live&&!state.live.finished;
 const request=m.requests.map(r=>`<article class="connected-obligation"><strong>Ditt svar behövs</strong><h3>${safe(r.title)}</h3><button class="btn" onclick="openManagerMessage(${safe(JSON.stringify(r.id))})">Besvara det riktiga ärendet</button></article>`).join('');
 const promises=m.promises.map(({q,source})=>`<article class="connected-obligation"><span class="coach-meta">${safe(source)}</span><h3>${safe(rolePromiseTarget(q))}</h3><p>${safe(rolePromiseProgress(q))}</p></article>`).join('');
 const relations=m.relations.map(c=>`<article class="connected-obligation"><span class="coach-meta">ROLL & FÖRTROENDE</span><h3>${safe(c.status==='following'?'Planen ska bli handling':'Spelaren vill förstå sin roll')}</h3><p>${safe(c.evidence)}</p><p>${c.good||0}/3 raka bedömbara matcher med rätt ansvar. ${c.heard?'Du har lyssnat på problemet.':'Spelaren behöver bli hörd.'}</p><div class="connected-actions">${!c.heard?playerCaseButton(m,'Lyssna på problemet','relation',c.id,'listen'):''}${!c.plan?playerCaseButton(m,'Sätt en konkret väg tillbaka','relation',c.id,'plan'):''}${!c.mediated?playerCaseButton(m,'Be en ledare medla','relation',c.id,'mediate'):''}</div>${relationshipRoleView(c)}</article>`).join('');
 const stories=m.stories.map(s=>`<article class="connected-obligation"><span class="coach-meta">SPELARENS HISTORIA</span><h3>${safe(s.title)}</h3><p>${safe(s.chapters.at(-1)?.text||'')}</p>${s.expectation?`<p>${safe(s.expectation.detail||storiesNext(s))}</p>`:''}${s.status==='decision'?`<div class="connected-story-choices">${storiesChoices(s).map(c=>`<div><h4>${safe(c.label)}</h4><p>${safe(c.detail)}</p>${playerCaseButton(m,c.label,'story',s.id,c.id)}</div>`).join('')}</div>`:`<p>${safe(storiesNext(s))}</p>`}</article>`).join('');
 const followup=m.followup?`<article class="connected-obligation"><span class="coach-meta">NÄSTA AVSTÄMNING</span><h3>${safe(m.followup.topic)}</h3><p>${safe(calText(m.followup.due))} · ${safe(playerFollowupAdvice(p))}</p>${m.followup.due<=state.calendar.date?playerCaseButton(m,'Följ upp samtalet','followup'):'<p>Samtalet är planerat. Kalenderdatumet avslutar inga istidslöften.</p>'}</article>`:'';
 const cooldown=Math.max(0,3-(state.locker.turn-p.social.lastTalk));
 return `<section class="player-case" aria-label="Samlat spelarärende"><header class="player-case-heading">${squadPortrait(p)}<div><span class="coach-meta">SPELAREN · ÖVERENSKOMMELSER · HANDLING</span><h2>${safe(p.name)}</h2><p>${safe(p.promisedRole||p.squadRole||'Roll ej angiven')} · ${safe(clubhousePresence(p).label)} · förtroende ${Math.round(p.social.trust)}/100</p></div></header><section class="connected-obligation"><h3>Det här har du faktiskt gett honom</h3><p>${safe(squadRoleExpectation(p,p.promisedRole||p.squadRole))}</p>${m.games.length?`<div class="case-games">${m.games.map(g=>`<span>${safe(g.date?calText(g.date):'Match')}<b>${Math.round((g.seconds||0)/60)} min</b>${g.met?'Motsvarade rollen':'Motsvarade inte rollen'}</span>`).join('')}</div>`:'<p>Inga bedömbara tävlingsmatcher registrerade ännu. Träningsmatcher kan följas nedan men uppfyller inga tävlingslöften.</p>'}<div class="connected-actions"><button class="btn secondary" onclick="deskNavigate('lines')">Planera platsen i laget</button><button class="coach-link" onclick="deskOpenPlayer(${safe(JSON.stringify(p.id))})">Hela spelarprofilen →</button></div></section>${request}${relations}${promises}${stories}${followup}${!m.requests.length&&!m.relations.length&&!m.promises.length&&!m.stories.length&&!m.followup?'<p class="connected-empty">Inga öppna överenskommelser. Ett samtal kan handla om att lära känna spelaren.</p>':''}<section class="connected-obligation"><h3>Enskilt samtal</h3><p>${safe(playerFollowupAdvice(p))}</p>${locked||m.absent||cooldown?`<p>${locked?'Samtal tas mellan matcher.':m.absent?'Spelaren är frånvarande. Medicinska begränsningar och landslagsuppdrag gäller.':`${cooldown} matcher kvar innan nästa samtal. Låt handling följa orden.`}</p>`:`<div class="connected-actions">${[['listen','Hur har du det?'],['bench','Prata om rollen'],['praise','Uppmärksamma utvecklingen'],['challenge','Ställ krav']].map(([key,label])=>playerCaseButton(m,label,'talk',key)).join('')}${!playerChanceBlock(p)?playerCaseButton(m,'Lova en konkret chans','chance'):''}</div>`}${p.social.lastResponse?`<blockquote>${safe(p.social.lastResponse)}</blockquote>`:''}</section>${m.development?`<section class="connected-obligation"><h3>Utvecklingsplanen</h3><p>Start ${safe(calText(m.development.date))}${m.development.due?' · avstämning '+safe(calText(m.development.due)):''}</p><button class="coach-link" onclick="developmentOpenPlan(${safe(JSON.stringify(p.id))})">Granska utveckling och träning →</button></section>`:''}<details class="connected-obligation"><summary>Journal, matchval och tidigare besked</summary>${journeyPlayerView(p)}${socialJournalView(p)}</details><p class="connected-note">Samma avtal och individuella undantag gäller i alla vyer. Att öppna ärendet uppfyller inget löfte och ändrar inget förtroende.</p></section>`;
}
