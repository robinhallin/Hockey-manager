'use strict';
// Room work uses the same selection, proposals, calendar and match reports as
// the career. UI state is disposable; decisions stay in their domain records.
const roomCoachUI={owner:null,context:null,token:0,board:false,step:null,initiative:null,before:null,report:null};
function roomCoachContext(){return JSON.stringify([managerClub(),state.calendar?.date,state.season?.year,clubhouseUI.room,state.page]);}
function roomCoachSync(){
 const u=roomCoachUI,context=roomCoachContext();
 if(u.owner!==state||u.context!==context){Object.assign(u,{owner:state,context,token:u.token+1,board:false,step:null,initiative:null,before:null,report:null});}
}
function roomCoachGuard(token){return clubhouseAvailable()&&clubhouseEnabled()&&!dayTransition&&!calendarPaceRun&&roomCoachUI.owner===state&&roomCoachUI.context===roomCoachContext()&&Number(token)===roomCoachUI.token&&!clubhouseUI.player&&!clubhouseUI.wardrobe;}
function roomCoachCode(name,...args){return trainingSafe(clubhouseRoomsCode(name,...args));}
function roomCoachButton(label,name,args=[],detail='',primary=false,disabled=false){return clubhouseRoomsButton(label,clubhouseRoomsCode(name,...args),detail,primary,disabled);}
function roomCoachReport(){
 const rows=(state.analysis?.matches||[]).filter(m=>m.club===managerClub()&&m.year===state.season.year&&m.finished&&!m.partial&&!m.abandoned&&m.date<=state.calendar.date).slice().sort((a,b)=>b.date.localeCompare(a.date));
 return rows.find(m=>String(m.id)===roomCoachUI.report)||rows[0]||null;
}
function roomCoachActor(area){const role=({training:'assistant',lineup:'assistant',juniors:'junior',medical:'physio',scouting:'scout'})[area];return state.staff?.find(s=>s.id===role)?.name||({contracts:'Sportchefen',board:'Styrelsen'})[area]||'Tränarteamet';}
function roomCoachInitiatives(){
 const room=clubhouseRoomsKey(),rows=[],today=state.calendar.date;
 for(const p of state.office2?.proposals||[]){
  if(p.club!==managerClub()||p.status!=='pending'||p.target<today||p.area==='training'&&p.target===today)continue;
  const destination=({training:'ice',juniors:'ice',medical:'ice',lineup:'tactics',scouting:'recruit',contracts:'recruit'})[p.area];
  if(room!=='office'&&room!=='hub'&&room!==destination&&room!=='boardroom')continue;
  rows.push({id:'staff:'+p.id,actor:roomCoachActor(p.area),title:STAFF_MANDATES[p.area]?.name||'Stabens förslag',detail:p.text,kind:'staff',proposal:p,room:destination||'boardroom',due:p.target,score:80,signature:JSON.stringify([p.id,p.status,p.text,p.snapshot,p.target,staffProposalSnapshot(p.area,p.target)])});
 }
 const m=clubhouseModel();
 for(const a of m.life.agenda){
  if(a.area==='match'||a.id==='season:direction')continue;
  if(room!=='office'&&room!=='hub'&&a.room!==room)continue;
  if(a.due>today&&!a.requiresDecision)continue;
  const id=a.action?.conversationPlayer??a.action?.promisePlayer,player=id!=null?clubhousePlayer(id):null;
  if(player&&!clubhousePresence(player).present)continue;
  if(player&&!a.requiresDecision&&!a.due&&state.locker.turn-player.social.lastTalk<3)continue;
  rows.push({id:'agenda:'+a.id,actor:player?.name||(a.owner==='Du'?roomCoachActor(a.area):a.owner||roomCoachActor(a.area)),title:a.title,detail:a.detail,kind:'agenda',agenda:a,room:a.room,score:a.score||50,due:a.due,required:a.requiresDecision,signature:JSON.stringify([a.id,a.detail,a.due,a.action,player?.social.lastTalk,player?.roleFollowup?.closed])});
 }
 const d=['office','hub','tactics'].includes(room)&&(!state.live||state.live.finished)?personalMatchDilemma():null;
 if(d&&['office','hub','tactics'].includes(room))rows.push({id:'selection:'+matchBriefKey(matchBriefFixture()),actor:roomCoachActor('lineup'),title:'Ett vägval i laguttagningen',detail:d.reason,kind:'selection',dilemma:d,room:'tactics',score:95,signature:d.signature});
 return rows.sort((a,b)=>Number(b.required||false)-Number(a.required||false)||(b.score-a.score)||a.id.localeCompare(b.id));
}
function roomCoachInitiativeOpen(id,token,signature){
 if(!roomCoachGuard(token)||!clubhouseIsRoom())return false;
 const row=roomCoachInitiatives().find(r=>r.id===id&&r.signature===signature);if(!row)return false;
 roomCoachUI.initiative=id;roomCoachUI.board=false;render();return true;
}
function roomCoachInitiativeAct(id,action,token,signature){
 if(!roomCoachGuard(token)||!clubhouseIsRoom())return false;
 const row=roomCoachInitiatives().find(r=>r.id===id&&r.signature===signature);if(!row)return false;
 if(action==='open'){
  if(row.kind==='agenda')return clubhouseLifeOpen(row.agenda.id);
  if(row.kind==='staff')return staffProposalAnswer(row.proposal.id,'adjust');
  return roomCoachBoardOpen(token);
 }
 if(state.live&&!state.live.finished)return false;
 if(row.kind==='staff'&&['accept','decline'].includes(action))return staffProposalAnswer(row.proposal.id,action);
 if(row.kind==='selection'&&['stay','rotate'].includes(action))return personalMatchChoose(action,row.signature);
 if(row.kind==='agenda'&&action==='later')return managerAgendaSnooze(row.agenda.id,3);
 return false;
}
function roomCoachHistory(){
 const staff=(state.office2?.proposals||[]).filter(p=>p.club===managerClub()&&['accepted','declined','followed'].includes(p.status)).slice(0,3).map(p=>({title:roomCoachActor(p.area),date:p.decided||p.date,text:p.outcome||({accepted:'Godkänt. Utfallet följs när den planerade dagen har genomförts.',declined:'Du avböjde förslaget.'})[p.status]}));
 const players=managerRoster().filter(p=>p.roleFollowup?.club===managerClub()).map(p=>({title:p.name,date:p.roleFollowup.closed||p.roleFollowup.date,text:p.roleFollowup.closed?p.roleFollowup.outcome:playerFollowupAdvice(p)+' Nästa avstämning '+calText(p.roleFollowup.due)+'.'}));
 return [...staff,...players].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,3);
}
function roomCoachInitiativeView(row){
 const token=roomCoachUI.token,act=(label,action,primary=false)=>roomCoachButton(label,'roomCoachInitiativeAct',[row.id,action,token,row.signature],'',primary,action!=='open'&&Boolean(state.live&&!state.live.finished));
 let buttons=act(row.kind==='agenda'&&row.agenda.action?.conversationPlayer!=null?'Ta samtalet':'Granska underlaget','open',true);
 if(row.kind==='staff')buttons=(['training','juniors'].includes(row.proposal.area)?act('Godkänn förslaget','accept',true):'')+buttons+act('Avböj förslaget','decline');
 if(row.kind==='selection')buttons=act('Behåll nuvarande spelare','stay')+act('Välj ersättaren på platsen','rotate',true)+act('Arbeta vidare vid tavlan','open');
 if(row.kind==='agenda'&&!row.required&&row.agenda.level!=='critical')buttons+=act('Påminn om tre dagar','later');
 return `<section class="rc-meeting" aria-label="Initiativ från ${trainingSafe(row.actor)}"><span class="ct-eyebrow">${trainingSafe(row.actor)} SÖKER DIG</span><h2>${trainingSafe(row.title)}</h2><p>${trainingSafe(row.detail)}</p>${row.due?`<p class="rc-due">${row.required?'Svar behövs senast':'Uppföljning / giltighet'} ${calText(row.due)}</p>`:''}${row.kind==='selection'?`<p>${row.dilemma.other?'Spelarna byter plats i uppställningen.':'Ersättaren tar den ordinarie platsen. Granska även reserver och special teams.'} Befintliga löften gäller; inget nytt löfte skapas.</p>`:''}${buttons}<p class="cr-explanation">Ditt besked följs upp genom träningen, matcherna och nästa avstämning.</p></section>`;
}
function roomCoachInitiativesView(){
 const token=roomCoachUI.token,rows=roomCoachInitiatives(),selected=rows.find(r=>r.id===roomCoachUI.initiative);
 if(selected)return roomCoachButton('Till rummets arbete','roomCoachDismiss',[token])+roomCoachInitiativeView(selected);
 const history=roomCoachHistory();
 return `${rows.length?`<section class="rc-initiatives" aria-label="Spelare och stab söker dig"><h2>Söker dig i dag</h2>${rows.slice(0,2).map(r=>roomCoachButton(r.actor,'roomCoachInitiativeOpen',[r.id,token,r.signature],r.title)).join('')}</section>`:''}${history.length?`<details class="rc-followups"><summary>Beslut och uppföljning</summary>${history.map(h=>`<article><small>${calText(h.date)}</small><strong>${trainingSafe(h.title)}</strong><p>${trainingSafe(h.text)}</p></article>`).join('')}</details>`:''}`;
}
function roomCoachDismiss(token){if(!roomCoachGuard(token))return false;roomCoachUI.initiative=null;render();return true;}
function roomCoachBoardOpen(token){
 roomCoachSync();if(!roomCoachGuard(token??roomCoachUI.token))return false;
 if(state.live?.running)pauseMatch();
 clubhouseRoomsVisit('tactics');roomCoachSync();
 ensureLines();depthSelection();ensureSpecialTeams();tacticsLocks();
 clubhouseRoomsUI.station='board';roomCoachUI.board=true;roomCoachUI.initiative=null;roomCoachUI.before=tacticsSnapshot();roomCoachUI.step='lineup';render();return true;
}
function roomCoachBoardUnit(kind,index,token){
 if(!clubhouseRoomsGuard(token,'tactics'))return false;
 if(!['line','pair','pp','pk'].includes(kind)||!Number.isInteger(index)||index<0||index>=(kind==='line'?4:kind==='pair'?3:2))return false;
 if(!roomCoachBoardOpen())return false;
 if(kind==='pp'||kind==='pk'){lineupWorkspace='special';specialUI={unit:kind+(index+1),slot:0,query:''};}
 else{lineupWorkspace='even';lineupUI[kind]=index;lineupUI.slot={type:kind==='line'?'forwards':'defense',index:index*(kind==='line'?3:2)};lineupUI.player=tacticsId(lineupUI.slot.type,lineupUI.slot.index);lineupUI.picker=false;}
 render();return true;
}
function roomCoachBoardClose(token){if(!roomCoachGuard(token))return false;roomCoachUI.board=false;roomCoachUI.step=null;render();return true;}
function roomCoachChanges(){
 const b=roomCoachUI.before;if(!b)return '';
 const rows=[];
 for(const [type,count] of [['forwards',12],['defense',6],['goalie',1],['backup',1],...TACTICS_UNITS.map(k=>[k,k.startsWith('pp')?5:4])])for(let i=0;i<count;i++){
  const before=type==='goalie'?b.lines.goalie:type==='backup'?b.matchSelection?.backup:TACTICS_UNITS.includes(type)?b.specialTeams?.[type]?.[i]:b.lines[type]?.[i],now=tacticsId(type,i);
  if(!samePlayerId(before,now))rows.push({label:TACTICS_UNITS.includes(type)?tacticsUnitLabel(type)+' · '+(i+1):type==='forwards'?'Kedja '+(Math.floor(i/3)+1)+' · '+['VF','C','HF'][i%3]:type==='defense'?'Backpar '+(Math.floor(i/2)+1)+' · '+(i%2?'HB':'VB'):type==='goalie'?'Startande målvakt':'Reservmålvakt',before:playerById(before)?.name||'Vakant',now:playerById(now)?.name||'Vakant'});
 }
 return `<section class="rc-changes"><h2>Ändrat vid tavlan</h2>${rows.length?`<p>${rows.length} platser ändrade sedan du satte dig här.</p>${rows.slice(0,8).map(r=>`<article><strong>${trainingSafe(r.label)}</strong><span>${trainingSafe(r.before)} → ${trainingSafe(r.now)}</span></article>`).join('')}`:'<p>Uttagningen är oförändrad sedan du satte dig här.</p>'}<p>Ändringar sparas direkt. Ångra återställer det senaste giltiga taktiska beslutet.</p></section>`;
}
function roomCoachMatchStep(step,token){
 roomCoachSync();if(!roomCoachGuard(token??roomCoachUI.token)||!['brief','lineup','locker','analysis'].includes(step))return false;
 if(step==='locker'){
  const g=matchBriefFixture();if(!state.live||state.live.finished&&state.calendar.completedMatchDate!==state.calendar.date){if(!g||g.date!==state.calendar.date)return false;}
  const blocker=(!state.live||state.live.finished&&state.calendar.completedMatchDate!==state.calendar.date)&&coachBlocker();if(blocker){if(blocker.kind==='message')openManagerMessage(blocker.id);else clubhouseRoomsOpen('season');return false;}
  return coachJourneyPrepare();
 }
 if(step==='lineup')return roomCoachBoardOpen();
 if(step==='analysis'){
  const report=roomCoachReport();if(!report)return false;
  if(state.live&&!state.live.finished)return false;
  clubhouseRoomsVisit('tactics');roomCoachSync();clubhouseRoomsUI.station='review';roomCoachUI.report=String(report.id);roomCoachUI.board=false;roomCoachUI.initiative=null;roomCoachUI.step='analysis';render();return true;
 }
 if(state.live&&!state.live.finished)return false;
 if(!matchBriefFixture())return false;
 clubhouseRoomsVisit('tactics');roomCoachSync();clubhouseRoomsUI.station='opponent';roomCoachUI.board=false;roomCoachUI.initiative=null;roomCoachUI.step='brief';render();return true;
}
function roomCoachChooseBrief(goal,key,token){if(!roomCoachGuard(token)||roomCoachUI.step!=='brief'||key!==matchBriefKey(matchBriefFixture())||state.live&&!state.live.finished||!MATCH_BRIEF_GOALS[goal])return false;matchBriefChoose(goal);return true;}
function roomCoachMatchCard(){
 const token=roomCoachUI.token,g=matchBriefFixture(),active=state.live&&!state.live.finished,report=roomCoachReport(),after=report&&calGap(report.date,state.calendar.date)<=3;
 if(active)return roomCoachButton('Fortsätt den pågående matchen','roomCoachMatchStep',['locker',token],state.live.opponent,true);
 let html='';
 if(g)html=roomCoachButton(state.matchBrief?.key===matchBriefKey(g)?'Fortsätt matchförberedelserna':'Förbered nästa match','roomCoachMatchStep',['brief',token],g.opponent+' · '+calText(g.date),g.date===state.calendar.date);
 if(after)html+=roomCoachButton('Följ upp senaste matchen','roomCoachMatchStep',['analysis',token],report.opponent+' · '+report.own+'–'+report.against);
 return html?`<section class="rc-match-card" aria-label="Din matchdag">${html}</section>`:'';
}
function roomCoachRoute(){
 const t=roomCoachUI.token,step=roomCoachUI.step,active=state.live&&!state.live.finished,canMeet=active||state.live?.finished&&state.calendar.completedMatchDate===state.calendar.date||matchBriefFixture()?.date===state.calendar.date;
 return `<nav class="rc-route" aria-label="Förbered matchdagen">${[['brief','1 · Motstånd'],['lineup','2 · Uttagning'],['locker','3 · Lagsnack'],['analysis','Efteranalys']].map(([id,label])=>`<button aria-current="${step===id?'step':'false'}" onclick="${roomCoachCode('roomCoachMatchStep',id,t)}" ${id==='brief'&&active||id==='locker'&&!canMeet||id==='analysis'&&(!roomCoachReport()||active)?'disabled':''}>${label}</button>`).join('')}</nav>`;
}
function roomCoachBriefView(){
 const g=matchBriefFixture();if(!g)return clubhouseRoomsEmpty('Ingen kommande match.');
 const scout=matchBriefScout(g.opponent),brief=state.matchBrief?.key===matchBriefKey(g)?state.matchBrief:null,t=roomCoachUI.token;
 return `<section class="rc-brief"><span class="ct-eyebrow">MOTSTÅNDARBRIEF · ${calText(g.date)}</span><h1>Uppgiften mot ${trainingSafe(g.opponent)}</h1><p>${scout.count} fullständiga säsongsrapporter · ${scout.ppGoals} PP-mål på ${scout.pp} lägen (${scout.ppMatches} PP-rapporter).</p><p>${scout.pp<10?'För lite underlag för ett stabilt powerplaymönster.':'Utfallet beskriver de registrerade matcherna.'} Bedöm uppgiften tillsammans med lagets ork och tillgänglighet.</p><div class="rc-brief-options">${Object.entries(MATCH_BRIEF_GOALS).map(([key,d])=>`<article data-brief-goal="${key}" class="${brief?.goal===key?'selected':''}"><h2>${trainingSafe(d.name)}</h2><p>${trainingSafe(d.risk)}</p>${roomCoachButton(brief?.goal===key?'Vald matchuppgift':'Välj uppgiften','roomCoachChooseBrief',[key,matchBriefKey(g),t],'',brief?.goal===key)}</article>`).join('')}</div><p>Valet sparar en matchbrief. De tre ändrade uppgifterna sätter de befintliga matchorderna; kontinuitet behåller din plan. Du kan gå vidare med nuvarande order.</p>${roomCoachButton('Till laguttagningen','roomCoachMatchStep',['lineup',t],'Granska kedjor, målvakt, PP och BP',true)}</section>`;
}
function roomCoachAnalysisView(){
 const r=roomCoachReport();if(!r)return clubhouseRoomsEmpty('Ingen färdig matchrapport att följa upp.');
 return `<section class="rc-analysis"><span class="ct-eyebrow">ANALYSBORDET · ${calText(r.date)}</span><h1>${trainingSafe(r.club)} ${r.own}–${r.against} ${trainingSafe(r.opponent)}</h1><p>${r.friendly?'Träningsmatch. Istid och belastning följs; tävlingslöften bedöms inte här.':'Tävlingsmatch · faktisk istid och matchhändelser.'}</p>${personalMatchOutcomeView(r)||clubhouseRoomsEmpty('Ingen personlig uttagningsberättelse registrerades före nedsläpp.')}${matchBriefReport(r)||clubhouseRoomsEmpty('Ingen matchbrief registrerades före nedsläpp. Nästa match kan du välja vad laget ska arbeta med.')}<details open><summary>Formationernas faktiska utfall</summary>${formationEvidenceView([r])}</details>${roomCoachButton('Nästa steg vid taktiktavlan','roomCoachBoardOpen',[roomCoachUI.token],'Väg utfallet mot flera matcher före nästa ändring',true)}${roomCoachButton('Öppna hela matchrapporten','matchesOpenReport',[String(r.id)])}</section>`;
}
const roomCoachBaseScene=clubhouseRoomsScene;
clubhouseRoomsScene=function(m){
 roomCoachSync();const key=clubhouseRoomsKey(),working=key==='tactics'&&(roomCoachUI.board&&(!clubhouseRoomsUI.station||clubhouseRoomsUI.station==='board')||['brief','analysis'].includes(roomCoachUI.step));
 if(working&&clubhouseIsRoom())return `<div class="ct-scene cr-scene rc-scene" aria-label="Arbete i taktikrummet"><img class="cr-environment" src="assets/clubhouse/rooms/tactics.webp" alt="Taktikrummet i klubbhuset"><header class="rc-work-header"><span>${clubhouseThemeIcon('clipboard')} VID TAVLAN · ${trainingSafe(managerClub())}</span><button onclick="${roomCoachCode('roomCoachBoardClose',roomCoachUI.token)}">Lämna arbetsbordet</button></header><section class="rc-work-surface" role="region" aria-label="${roomCoachUI.board?'Taktiktavlan i rummet':roomCoachUI.step==='brief'?'Motståndarbrief i rummet':'Efteranalys i rummet'}">${roomCoachRoute()}${roomCoachUI.board?tacticsWorkspaceView():roomCoachUI.step==='brief'?roomCoachBriefView():roomCoachAnalysisView()}</section></div>`;
 let html=roomCoachBaseScene(m);if(!html||!clubhouseIsRoom())return html;
 const row=roomCoachInitiatives()[0];
 if(row)html=html.replace('<div class="cr-room-caption">',`<button class="rc-person-call" aria-label="${trainingSafe(row.actor+' söker dig: '+row.title)}" onclick="${roomCoachCode('roomCoachInitiativeOpen',row.id,roomCoachUI.token,row.signature)}">${clubhouseThemeIcon('chat-dots')}<span><strong>${trainingSafe(row.actor)}</strong><small>${trainingSafe(row.title)}</small></span></button><div class="cr-room-caption">`);
 return html;
};
const roomCoachBasePanel=clubhouseRoomsPanel;
clubhouseRoomsPanel=function(m){
 roomCoachSync();if(clubhouseUI.wardrobe||clubhouseUI.briefing||clubhousePlayer())return roomCoachBasePanel(m);
 const selected=roomCoachInitiatives().some(r=>r.id===roomCoachUI.initiative),working=clubhouseRoomsKey()==='tactics'&&(roomCoachUI.board||roomCoachUI.step==='brief'||roomCoachUI.step==='analysis');
 if(selected||working)return `<aside class="cr-side-panel rc-work-aside" aria-label="Stöd vid arbetsbordet"><header><span class="ct-eyebrow">DITT BESLUT. DITT LAG.</span><h2>${selected?'Ett möte i rummet':roomCoachUI.board?'Vid taktiktavlan':roomCoachUI.step==='brief'?'Inför nästa nedsläpp':'Från match till nästa steg'}</h2><p>${selected?'Rådet utgår från det aktuella underlaget.':'Väg ork, roller och samspel inför nästa match.'}</p></header><div class="cr-side-body">${selected?'':roomCoachMatchCard()}${roomCoachUI.board?roomCoachChanges():''}${roomCoachInitiativesView()}${working?roomCoachButton('Samla matchlaget','roomCoachMatchStep',['locker',roomCoachUI.token],state.live&&!state.live.finished?'Återvänd till matchen':matchBriefFixture()?.date===state.calendar.date?'Lagsnack och 2D-match':'Tillgängligt på matchdagen',true,!(state.live&&!state.live.finished||state.live?.finished&&state.calendar.completedMatchDate===state.calendar.date||matchBriefFixture()?.date===state.calendar.date)):''}</div></aside>`;
 let html=roomCoachBasePanel(m);
 if(clubhouseRoomsKey()==='hub')return html;
 return html.replace('<div class="cr-side-body">','<div class="cr-side-body">'+roomCoachMatchCard()+roomCoachInitiativesView()+(clubhouseRoomsKey()==='boardroom'&&clubhouseRoomsUI.station==='staff'?roomCoachMandatesView():''));
};
const roomCoachContinue=clubhouseThemeContinue;
clubhouseThemeContinue=function(){
 roomCoachSync();const g=matchBriefFixture();
 if(!coachBlocker()&&clubhouseAvailable()&&clubhouseEnabled()&&g?.date===state.calendar.date&&(!state.live||state.live.finished)&&state.calendar.completedMatchDate!==state.calendar.date)return roomCoachMatchStep('brief');
 return roomCoachContinue();
};
const roomCoachMatchRoom=coachJourneyRoomView;
coachJourneyRoomView=function(stage){
 let html=roomCoachMatchRoom(stage).replace('src="assets/clubhouse/interior.webp"','src="assets/clubhouse/rooms/locker.webp"').replace('onclick="clubhouseOpen(\'lines\')"','onclick="roomCoachBoardOpen()"');
 if(state.live?.finished)html=html.replace('<aside class="cj-match-talk">','<aside class="cj-match-talk">'+roomCoachButton('Till analysbordet','roomCoachMatchStep',['analysis'],'Följ briefen och den faktiska istiden',true));
 return html;
};
const roomCoachMatchRoute=coachJourneyRoute;
coachJourneyRoute=function(stage){return roomCoachMatchRoute(stage).replace('</nav>',`<button onclick="roomCoachMatchStep('analysis')" ${state.live?.finished?'':'disabled'}>Analysbordet</button></nav>`);};

// Player/report deep links return to the same working table and comparison.
const roomCoachNavigation=clubhouseNavigation;
clubhouseNavigation=function(page){
 const working=roomCoachUI.owner===state&&clubhouseIsRoom()&&(roomCoachUI.board||roomCoachUI.step)?{board:roomCoachUI.board,step:roomCoachUI.step,before:roomCoachUI.before,report:roomCoachUI.report}:null;
 roomCoachNavigation(page);
 if(working&&clubhouseUI.origin)clubhouseUI.origin.coaching=working;
};
const roomCoachReturn=clubhouseReturn;
clubhouseReturn=function(){
 const working=clubhouseUI.origin?.coaching;
 const result=roomCoachReturn();
 if(working&&clubhouseIsRoom()&&clubhouseRoomsKey()==='tactics'){roomCoachSync();Object.assign(roomCoachUI,working);render();}
 return result;
};

function roomCoachMandatesView(){
 const token=roomCoachUI.token,active=Boolean(state.live&&!state.live.finished);
 return `<details class="rc-followups rc-mandates"><summary>Ansvar & initiativ från staben</summary><p>Välj om du vill ha råd eller delegera genomförandet. Ett råd ändrar inget förrän du själv tar ställning.</p>${Object.entries(STAFF_MANDATES).map(([area,d])=>`<label class="cr-field">${trainingSafe(d.name)}<select aria-label="Stabsansvar för ${trainingSafe(d.name)}" onchange="${roomCoachCode('roomCoachMandate',area,'MODE',staffMode(area),token).replace('&quot;MODE&quot;','this.value')}" ${active?'disabled':''}>${[['manual','Jag bestämmer'],['advise','Staben föreslår'],...(d.automatic?[['execute','Staben genomför inom mandat']]:[])].map(([value,label])=>`<option value="${value}" ${staffMode(area)===value?'selected':''}>${label}</option>`).join('')}</select><small>${trainingSafe(d.detail)}</small></label>`).join('')}</details>`;
}
function roomCoachMandate(area,mode,previous,token){
 if(!roomCoachGuard(token)||!clubhouseIsRoom()||clubhouseRoomsKey()!=='boardroom'||clubhouseRoomsUI.station!=='staff'||!STAFF_MANDATES[area]||staffMode(area)!==previous)return false;
 return staffSetMode(area,mode);
}
