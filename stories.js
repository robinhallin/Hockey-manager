"use strict";
// Small, persistent story arcs driven by actual competitive matches. No match RNG.
const STORY_TYPES={talent:'Talangens chans',veteran:'Veteranens roll',line:'Kedjan hittar något',rival:'Revanschmötet',coach:'Duellen på tränarbänken'};
const storiesUI={selected:null,archive:false,notice:''};
function storiesPlayer(id){return managerRoster().find(p=>samePlayerId(p.id,id));}
function storiesReady(){return managerEmployed()&&['regular','playoffs'].includes(state.season?.phase);}
function storiesGroup(p){return p.pos==='MV'?'goalie':p.pos==='B'?'defense':'forward';}
function storiesChapter(story,title,text){
 story.chapters.push({date:state.calendar?.date||null,match:state.stories.matchCount,title,text});if(story.chapters.length>16)story.chapters=[story.chapters[0],...story.chapters.slice(-15)];
}
function storiesNotify(story,title,text){
 if(story.club===managerClub()&&story.year===state.season.year)managerMessage(`story:${story.id}:${story.chapters.length}`,title,text,'Säsongshistoria',{link:'stories',storyId:story.id});
}
function storiesClose(story,outcome,text){
 if(story.status==='closed')return;
 story.status='closed';story.outcome=outcome;story.ended=state.calendar?.date;story.expectation=null;
 storiesChapter(story,outcome,text);storiesNotify(story,`${story.title} · ${outcome}`,text);
 const b=state.stories;b.active=b.active.filter(s=>s.id!==story.id);b.archive.unshift(story);b.archive=b.archive.slice(0,40);
 for(const id of story.ids){const key=story.club+':'+id;b.memory.players[key]={title:story.title,outcome,text,year:story.year,date:story.ended};}
 for(const key of Object.keys(b.memory.players).slice(0,-160))delete b.memory.players[key];
 if(['rival','coach'].includes(story.type))b.memory.rivals[story.club+'|'+story.opponent]={outcome,text,year:story.year};
}
function ensureStories(){
 if(!state.careerStarted||!state.season)return;
 if(!state.stories)state.stories={version:1,nextId:1,club:managerClub(),year:state.season.year,matchCount:0,active:[],archive:[],seen:[],recent:[],started:[],lastStart:-10,bootstrapped:false,memory:{players:{},rivals:{}}};
 const b=state.stories;
 if(b.club!==managerClub()||b.year!==state.season.year){
  for(const s of [...b.active])storiesClose(s,b.club!==managerClub()?'Ett nytt uppdrag':'Säsongen tog slut',b.club!==managerClub()?'Du lämnade klubben. Berättelsen bevaras i din karriär, och inga gamla löften belastar den nya truppen.':'Säsongens matcher är färdigspelade. Ett oavslutat löfte bedöms inte som brutet.');
  b.club=managerClub();b.year=state.season.year;b.matchCount=0;b.recent=[];b.started=[];b.lastStart=-10;b.bootstrapped=false;
 }
 for(const s of [...b.active]){
  if(state.season.phase==='review')storiesClose(s,'Säsongen tog slut','Säsongens matcher är färdigspelade. Oavslutade löften avslutas utan avdrag; kapitlen och tidigare följder finns kvar.');
  else if(s.ids.some(id=>!storiesPlayer(id)))storiesClose(s,'Truppen förändrades','En berörd spelare har lämnat A-truppen. Berättelsen avslutas utan ett brutet löfte.');
 }
 if(!b.bootstrapped&&storiesReady()){
  b.bootstrapped=true;
  // Previous saves provide background only. Their matches never award story effects again.
  const old=(state.analysis?.matches||[]).filter(m=>m.club===b.club&&m.year===b.year&&!m.friendly).slice(0,8).reverse();
  b.recent=old.map(storiesSample);b.seen=[...new Set([...b.seen,...old.map(m=>m.id)])].slice(-200);
  const veteran=managerRoster().filter(p=>p.age>=33&&p.contractYears===1&&!p.futureContract&&p.pos!=='MV'&&medicalReady(p)).sort((a,b)=>b.age-a.age)[0];
  if(veteran)storiesCreate('veteran',[veteran.id],`${veteran.name} står inför ett vägskäl`,`${veteran.name} är ${veteran.age} år och inne på sista avtalsåret. Innan ni pratar framtid behöver rollen i laget bli tydlig. Vad vill du faktiskt ge honom på isen?`);
 }
}
function storiesCreate(type,ids,title,text,extra={}){
 const b=state.stories;if(!b||b.active.length>=3||b.active.some(s=>s.type===type)||ids.some(id=>b.active.some(s=>s.ids.some(other=>samePlayerId(id,other)))))return null;
 const key=type+':'+(extra.storyKey||extra.opponent||ids.map(String).sort().join('|'));
 if(b.started.includes(key))return null;
 const story={id:'story-'+b.nextId++,type,ids:ids.map(String),names:ids.map(id=>storiesPlayer(id)?.name||'Tidigare spelare'),club:b.club,year:b.year,title,status:'decision',stage:1,created:state.calendar?.date,decisionAt:b.matchCount,elapsed:0,chapters:[],expectation:null,choices:[],...extra};
 b.active.push(story);b.started.push(key);b.lastStart=b.matchCount;storiesChapter(story,'Det börjar här',text);
 const memory=type==='rival'?b.memory.rivals[b.club+'|'+extra.opponent]:b.memory.players[b.club+':'+ids[0]];
 if(memory)storiesChapter(story,'Det här bär ni med er',`${seasonLabel(memory.year)}: ${memory.outcome}. ${memory.text}`);
 storiesNotify(story,story.title,text+' Läs historien och välj hur du vill gå vidare.');
 return story;
}
function storiesSample(m){return {id:m.id,date:m.date,club:m.club,opponent:m.opponent,own:m.own,against:m.against,partial:!!(m.partial||m.abandoned),players:(m.players||[]).map(p=>({id:String(p.id),seconds:p.seconds||0,goals:p.goals||0,assists:p.assists||0})),units:(m.units||[]).filter(u=>u.kind==='forward').map(u=>({ids:u.ids.map(String),seconds:u.seconds||0,goalsFor:u.goalsFor||0,goalsAgainst:u.goalsAgainst||0}))};}
function storiesNextRival(opponentName){return state.schedule.filter(g=>!g.played&&((g.home===managerClub()&&g.away===opponentName)||(g.away===managerClub()&&g.home===opponentName))).sort((a,b)=>(a.date||'').localeCompare(b.date||'')||a.round-b.round)[0];}
function storiesDetect(sample){
 const b=state.stories;if(!storiesReady()||b.active.length>=3||b.matchCount-b.lastStart<2)return;
 if(rivalStoryDetect())return;
 const ps=managerRoster();
 // A real injury opens a door; candidates are actual young members of the senior squad.
 const injured=ps.filter(p=>p.age>23&&!medicalReady(p)&&p.pos!=='MV').sort((a,b)=>(b.social?.lastMinutes||0)-(a.social?.lastMinutes||0))[0];
 const prospect=injured?ps.filter(p=>p.age<=23&&medicalReady(p)&&storiesGroup(p)===storiesGroup(injured)).sort((a,b)=>a.age-b.age)[0]:null;
 if(prospect&&storiesCreate('talent',[prospect.id],`En dörr öppnas för ${prospect.name}`,`${injured.name} saknas på grund av skada. ${prospect.name}, ${prospect.age} år, finns i din trupp och kan få en större chans. Du bestämmer om möjligheten blir verklig.`,{seniorId:String(injured.id),seniorName:injured.name}))return;
 const young=sample.players.filter(row=>row.seconds>=300&&row.goals+row.assists>0).map(row=>storiesPlayer(row.id)).find(p=>p&&p.age<=23&&p.pos!=='MV'&&medicalReady(p));
 if(young&&storiesCreate('talent',[young.id],`${young.name} har gjort sig hörd`,`${young.name} bidrog med poäng mot ${sample.opponent}. Nu finns chansen att ge ${young.age}-åringen mer ansvar under flera matcher.`))return;
 if(sample.own<sample.against&&(sample.against-sample.own===1)&&storiesNextRival(sample.opponent)){
  if(storiesCreate('rival',[],`Nästa gång mot ${sample.opponent}`,`${sample.own}–${sample.against} mot ${sample.opponent}. En uddamålsförlust som ni får möjlighet att svara på. Vill du göra returmötet till ett uttalat mål för gruppen?`,{opponent:sample.opponent,firstScore:`${sample.own}–${sample.against}`}))return;
 }
 for(const unit of sample.units.filter(u=>u.ids.length===3&&u.seconds>=300&&u.goalsFor>0)){
  const previous=b.recent.slice(0,-1).slice(-2).flatMap(m=>m.units).find(u=>u.ids.length===3&&u.ids.every(id=>unit.ids.includes(id))&&u.seconds>=300&&u.goalsFor>0);
  if(previous&&unit.ids.every(id=>storiesPlayer(id)&&medicalReady(storiesPlayer(id)))&&storiesCreate('line',unit.ids,'Tre spelare börjar hitta varandra',`${unit.ids.map(id=>storiesPlayer(id).name).join(', ')} har varit på isen vid mål framåt tillsammans i två av de senaste tre matcherna. Vill du bygga vidare på deras samspel?`,{nickname:''}))return;
 }
}
function storiesChoices(s){
 if(s.type==='coach')return rivalStoryChoices();
 if(['rival','coach'].includes(s.type))return [{id:'revenge',label:'Vi ska ta revansch',detail:'Ett uttalat resultatmål. Seger stärker lagmoralen med 3; en ny förlust sänker den med 3.',pressure:true},{id:'calm',label:'Fokus på vårt eget spel',detail:'Låt resultatet tala. Seger ger 1 i lagmoral; ett bakslag ger ingen extra förlust.',pressure:false}];
 const matches=s.stage===1?4:3;
 if(s.type==='talent')return [{id:'trust',label:s.stage===1?'Ge en riktig chans':'Fortsätt satsningen',detail:`Minst 8 minuter i ${matches-1} av ${matches} spelbara matcher.`,seconds:480,needed:matches-1,matches},{id:'ease',label:'Väx in i rollen',detail:`Minst 4 minuter i ${matches-2} av ${matches} spelbara matcher.`,seconds:240,needed:matches-2,matches}];
 if(s.type==='veteran')return [{id:'lead',label:'Du ska bära en viktig roll',detail:`Minst 12 minuter i ${matches-1} av ${matches} spelbara matcher.`,seconds:720,needed:matches-1,matches},{id:'rotate',label:'En tydlig rotationsroll',detail:`Minst 6 minuter i ${matches-2} av ${matches} spelbara matcher.`,seconds:360,needed:matches-2,matches}];
 return [{id:'together',label:'Håll ihop kedjan',detail:`Minst 8 minuter tillsammans i ${matches-1} av ${matches} spelbara matcher.`,seconds:480,needed:matches-1,matches},{id:'careful',label:'Bygg vidare försiktigt',detail:`Minst 4 minuter tillsammans i ${matches-2} av ${matches} spelbara matcher.`,seconds:240,needed:matches-2,matches}];
}
function storiesChoose(id,choiceId){
 ensureStories();const s=state.stories.active.find(s=>s.id===id);
 if(!s||s.status!=='decision'||!managerEmployed()||!storiesReady()||state.live&&!state.live.finished)return;
 if(s.ids.some(id=>!storiesPlayer(id))){storiesClose(s,'Truppen förändrades','En berörd spelare har lämnat A-truppen. Berättelsen avslutas utan ett brutet löfte.');save();render();return;}
 if(choiceId==='open'){storiesClose(s,['rival','coach'].includes(s.type)?'Låt matcherna tala':'Uttagningen förblir öppen',['rival','coach'].includes(s.type)?'Du valde att låta nästa möte tala för sig självt, utan ett särskilt resultatlöfte.':'Du valde att inte ge ett särskilt löfte. Konkurrensen om platserna fortsätter.');save();render();return;}
 const choice=storiesChoices(s).find(c=>c.id===choiceId);if(!choice)return;
 s.choices.push({stage:s.stage,id:choiceId,label:choice.label});s.status='following';s.elapsed=0;
 s.expectation={...choice,eligible:0,qualified:0,points:0,goalsFor:0,goalsAgainst:0,...(s.type==='coach'?{sessions:0,signature:trainingSignature()}: {})};
 storiesChapter(s,'Ditt besked',`${choice.label}. ${choice.detail}${['rival','coach'].includes(s.type)?'':' Du sköter laguttagningen; spelarna följer om handlingen motsvarar beskedet.'}`);
 storiesUI.notice='Beskedet är lämnat. Nästa kapitel skrivs av matcherna.';save();render();document.getElementById('story-detail')?.focus?.({preventScroll:true});
}
function storiesNickname(id,name){
 const s=state.stories?.active.find(s=>s.id===id);if(!s||s.type!=='line'||state.live&&!state.live.finished)return;
 const value=String(name).trim().replace(/[\u0000-\u001f]/g,'').slice(0,28);if(!value||value===s.nickname)return;
 s.nickname=value;s.title=value;storiesChapter(s,'Kedjan får ett namn',`Du döper kombinationen till ”${value}”.`);save();render();
}
function storiesEffect(s,delta){
 const changed=[];
 for(const id of s.ids){const p=storiesPlayer(id);if(!p?.social)continue;const before=p.social.trust;p.social.trust=trainingClamp(before+delta);changed.push(`${p.name}: förtroende ${p.social.trust-before>=0?'+':''}${p.social.trust-before}`);}
 return changed.join(' · ');
}
function storiesAdvance(s,sample){
 if(s.ids.some(id=>!storiesPlayer(id))){storiesClose(s,'Truppen förändrades','En berörd spelare har lämnat A-truppen. Inga löften följer med till en annan klubb.');return;}
 if(s.status==='decision'){
  if(state.stories.matchCount-s.decisionAt>=3||(['rival','coach'].includes(s.type)&&sample.opponent===s.opponent))storiesClose(s,'Laget gick vidare','Du lämnade inget besked före nästa avgörande. Matcherna fortsatte utan ett särskilt löfte.');
  return;
 }
 const e=s.expectation;if(!e)return;s.elapsed++;
 if(s.type==='coach'){rivalStoryAdvance(s,sample);return;}
 if(s.type==='rival'){
  if(sample.opponent!==s.opponent){if(s.elapsed%6===3)storiesChapter(s,'På väg mot returen',`${s.elapsed} matcher har passerat sedan ditt besked. Ni har vunnit ${state.stories.recent.slice(-3).filter(m=>m.own>m.against).length} av de senaste tre. ${storiesNextRival(s.opponent)?'Nästa möte med '+s.opponent+' finns kvar i kalendern.':'Ni väntar på om ett nytt möte blir aktuellt.'}`);return;}
  const won=sample.own>sample.against,delta=won?(e.pressure?3:1):e.pressure?-3:0,before=state.morale;
  state.morale=trainingClamp(state.morale+delta,30,100);
  storiesClose(s,won?'Revanschen blev er':'Rivalen vann igen',`${managerClub()} ${sample.own}–${sample.against} ${sample.opponent}. ${won?'Laget lyckades svara på det förra nederlaget.':'Det här blev ännu ett kapitel att bära med sig.'} Ditt budskap var ”${e.label}”. Lagmoral ${state.morale-before>=0?'+':''}${state.morale-before}.`);return;
 }
 const players=s.ids.map(storiesPlayer),excused=players.some(p=>medicalExcused(p,e.seconds)||!medicalReady(p));
 if(excused||sample.partial){
  if(s.elapsed===1||s.elapsed===5)storiesChapter(s,'Planen får vänta',sample.partial?'Matchens istid är ofullständigt registrerad. Den räknas inte när löftet följs upp.':'Skada eller begränsad återgång påverkar en berörd spelare. Matchen räknas inte mot löftet.');
  if(s.elapsed>=10)storiesClose(s,'Omständigheterna ändrades','För få spelbara matcher kunde följas upp. Löftet avslutas utan förtroendeavdrag.');return;
 }
 const row=sample.players.find(p=>p.id===s.ids[0]);
 const seconds=s.type==='line'?sample.units.filter(u=>u.ids.length===3&&u.ids.every(id=>s.ids.includes(id))).reduce((sum,u)=>sum+u.seconds,0):row?.seconds||0;
 e.eligible++;if(seconds>=e.seconds)e.qualified++;
 e.points+=s.type==='line'?sample.players.filter(p=>s.ids.includes(p.id)).reduce((sum,p)=>sum+p.goals+p.assists,0):(row?.goals||0)+(row?.assists||0);
 if(s.type==='line')for(const u of sample.units.filter(u=>u.ids.length===3&&u.ids.every(id=>s.ids.includes(id)))){e.goalsFor+=u.goalsFor;e.goalsAgainst+=u.goalsAgainst;}
 storiesChapter(s,`Match ${e.eligible} av ${e.matches}`,`${sample.opponent}: ${analysisTime(seconds)} ${s.type==='line'?'tillsammans':'istid'}. ${e.qualified} av ${e.needed} utlovade matcher uppnådda.${s.seniorId&&medicalReady(storiesPlayer(s.seniorId))?' '+s.seniorName+' är spelklar igen.':''}`);
 if(e.eligible<e.matches){if(s.elapsed>=10)storiesClose(s,'Omständigheterna ändrades','För få spelbara matcher kunde följas upp. Löftet avslutas utan förtroendeavdrag.');return;}
 const met=e.qualified>=e.needed,effect=storiesEffect(s,met?3:-4);
 const evidence=`${e.qualified} av ${e.needed} utlovade matcher fick tillräcklig istid. ${s.type==='line'?`Mål med kombinationen på isen: ${e.goalsFor}–${e.goalsAgainst}.`:`${e.points} poäng under perioden.`} ${effect}.`;
 if(s.stage===1){
  storiesChapter(s,met?'Du stod för ditt besked':'Orden blev större än handlingen',evidence);
  s.firstHonoured=met;s.stage=2;s.status='decision';s.decisionAt=state.stories.matchCount;s.expectation=null;
  storiesChapter(s,'Vad händer nu?',s.type==='talent'?`${s.names[0]} har fått ett första besked om sin plats i laget. ${s.seniorId&&medicalReady(storiesPlayer(s.seniorId))?s.seniorName+' är tillbaka. ':''}Ska satsningen fortsätta eller bli mer försiktig?`:s.type==='veteran'?`${s.names[0]} har sett vad din plan innebar. Nu behöver ni bestämma rollen i nästa matchblock.`:'Nu finns verkliga matcher att bedöma. Vill du fortsätta hålla ihop kombinationen?');
  storiesNotify(s,`${s.title} · ett nytt besked väntar`,s.chapters.at(-1).text);
 }else storiesClose(s,met?(s.firstHonoured?'Förtroendet fick fäste':'Du återvann förtroendet'):'Ett löfte att minnas',evidence);
}
function storiesAfterMatch(snapshot){
 if(!snapshot||snapshot.friendly||!snapshot.finished)return;ensureStories();const b=state.stories;
 if(!b||snapshot.club!==b.club||snapshot.year!==b.year||b.seen.includes(snapshot.id))return;
 b.seen.push(snapshot.id);b.seen=b.seen.slice(-200);b.matchCount++;
 const sample=storiesSample(snapshot);b.recent.push(sample);b.recent=b.recent.slice(-8);
 for(const s of [...b.active])storiesAdvance(s,sample);
 storiesDetect(sample);
}
function storiesFind(id){return [...(state.stories?.active||[]),...(state.stories?.archive||[])].find(s=>s.id===id);}
function storiesOpen(id){const s=storiesFind(id);storiesUI.selected=s?.id||null;storiesUI.archive=s?s.status==='closed':Boolean(id);storiesUI.notice=id&&!s?'Historien finns inte längre bland de 40 sparade karriärminnena. Spelarnas senaste minnen finns även på deras profilsidor.':'';deskNavigate('stories');}
function storiesFilter(archive){storiesUI.archive=Boolean(archive);storiesUI.selected=null;storiesUI.notice='';render();}
function storiesNext(s){
 if(s.type==='coach'&&s.status==='following'){const e=s.expectation;return e.id==='study'?`${e.sessions||0}/2 träningspass klara · möte med ${s.opponent}`:`Behåll din matchplan · möte med ${s.opponent}`;}
 if(s.status==='closed')return s.outcome;
 if(s.status==='decision')return `Ditt besked väntar · inom ${Math.max(0,3-(state.stories.matchCount-s.decisionAt))} tävlingsmatcher`;
 if(['rival','coach'].includes(s.type)){const g=storiesNextRival(s.opponent);return g?`Nästa avgörande: ${s.opponent} · ${g.date?calText(g.date):'omgång '+g.round}`:'Nästa möte avgör fortsättningen.';}
 const e=s.expectation;return `${e.qualified}/${e.needed} utlovade matcher · ${e.eligible}/${e.matches} spelbara matcher följda`;
}
function storiesDeskView(){
 const b=state.stories;if(!b)return '';const latest=b.archive.find(s=>s.club===managerClub()&&s.year===state.season.year);
 return `<section class="stories-desk"><header><div><span class="story-eyebrow">JUST NU I DIN SÄSONG</span><h2>Säsongens historier</h2></div><button class="desk-link" onclick="storiesOpen(null)">Alla kapitel ${deskIcon('arrow')}</button></header>${b.active.length?`<div class="stories-cards">${b.active.map(s=>`<button class="story-card story-${s.type}" onclick="storiesOpen('${s.id}')"><span class="story-category">${STORY_TYPES[s.type]} · Kapitel ${s.stage}</span><strong>${trainingSafe(s.title)}</strong><span class="story-preview">${trainingSafe(s.chapters.at(-1).text)}</span><small>${trainingSafe(storiesNext(s))}</small></button>`).join('')}</div>`:`<p class="story-empty">${latest?`Senaste kapitlet: ${trainingSafe(latest.outcome)}. Historien finns kvar i din karriär.`:'Nästa historia växer fram ur lagets matcher: en ung spelare som tar chansen, ett jämnt nederlag eller en kedja som börjar leverera.'}</p>`}</section>`;
}
function storiesView(){
 ensureStories();const b=state.stories,list=storiesUI.archive?b.archive:b.active,story=list.find(s=>s.id===storiesUI.selected)||list[0];
 return `<section class="stories-page"><header class="desk-heading"><div><span class="desk-kicker">DIN KARRIÄR HAR ETT MINNE</span><h1>Säsongens historier</h1><p>Besluten blir berättelser när laget kliver ut på isen.</p></div><button class="btn secondary" onclick="deskNavigate('home')">Tränarkontoret</button></header><nav class="stories-tabs" aria-label="Berättelser"><button aria-pressed="${!storiesUI.archive}" onclick="storiesFilter(false)">Pågående · ${b.active.length}</button><button aria-pressed="${storiesUI.archive}" onclick="storiesFilter(true)">Karriärminnen · ${b.archive.length}</button></nav>${storiesUI.notice?`<p class="story-notice" role="status">${trainingSafe(storiesUI.notice)}</p>`:''}${list.length?`<div class="stories-layout"><nav class="stories-list" aria-label="Välj historia">${list.map(s=>`<button class="story-card story-${s.type}" ${s.id===story.id?'aria-current="true"':''} onclick="storiesOpen('${s.id}')"><span class="story-category">${STORY_TYPES[s.type]} · ${seasonLabel(s.year)}</span><strong>${trainingSafe(s.title)}</strong><small>${trainingSafe(s.club)} · ${trainingSafe(storiesNext(s))}</small></button>`).join('')}</nav>${storiesDetail(story)}</div>`:'<div class="story-empty-panel"><h2>Berättelser behöver händelser.</h2><p>Spela vidare. Vi följer verklig istid, resultat, skador och kedjornas samspel. Högst tre historier pågår samtidigt.</p><button class="btn secondary" onclick="deskNavigate(\'calendar\')">Se nästa match</button></div>'}</section>`;
}
function storiesDetail(s){
 const live=state.live&&!state.live.finished,closed=s.status==='closed';
 return `<article class="story-detail story-${s.type}" id="story-detail" tabindex="-1"><header><span class="story-category">${STORY_TYPES[s.type]} · ${trainingSafe(s.club)} · ${seasonLabel(s.year)}</span><h2>${trainingSafe(s.title)}</h2><p>${trainingSafe(storiesNext(s))}</p></header>${s.status==='decision'?`<section class="story-decision"><h3>${s.stage===1?'Vad vill du säga?':'Nästa kapitel ligger hos dig'}</h3>${live?'<p>Ta samtalet mellan matcher. Den pågående matchen är pausad.</p>':''}<div class="story-choices">${storiesChoices(s).map(c=>`<button onclick="storiesChoose('${s.id}','${c.id}')" ${live||!storiesReady()?'disabled':''}><strong>${c.label}</strong><span>${c.detail}</span></button>`).join('')}</div>${!['rival','coach'].includes(s.type)?'<p>Uppfyllt löfte: +3 i förtroende. Brutet löfte: −4. Skador och ofullständig matchdata räknas bort.</p>':''}<button class="story-text-button" onclick="storiesChoose('${s.id}','open')" ${live||!storiesReady()?'disabled':''}>${['rival','coach'].includes(s.type)?'Gör inget särskilt utspel':'Lämna uttagningen öppen – inget löfte'}</button></section>`:''}${s.expectation&&!['rival','coach'].includes(s.type)?`<section class="story-follow"><h3>Det laget väntar på</h3><p>${trainingSafe(s.expectation.detail)}</p><progress max="${s.expectation.needed}" value="${Math.min(s.expectation.needed,s.expectation.qualified)}" aria-label="Uppfyllda matcher"></progress><p>${trainingSafe(storiesNext(s))}</p><small>Sköts i din ordinarie laguttagning. Efter tio matcher avslutas en uppföljning som hindrats av skador utan avdrag.</small></section>`:''}${!closed?`<div class="story-links"><button class="btn secondary" onclick="deskNavigate('lines')">Till laguttagningen</button><button class="btn secondary" onclick="deskNavigate('${['rival','coach'].includes(s.type)?'calendar':'training'}')">${['rival','coach'].includes(s.type)?'Nästa möte':'Planera träningen'}</button>${s.ids.map(id=>storiesPlayer(id)?`<button class="story-text-button" onclick="selectPlayer('${id}')">${trainingSafe(storiesPlayer(id).name)}</button>`:'').join('')}</div>`:''}${s.type==='line'&&!closed?`<form class="story-nickname" onsubmit="event.preventDefault();storiesNickname('${s.id}',this.elements.nickname.value)"><label for="story-nickname">Ge kedjan ett namn<input id="story-nickname" name="nickname" maxlength="28" value="${trainingSafe(s.nickname||'')}" placeholder="Ditt smeknamn" ${live?'disabled':''}></label><button class="btn secondary" ${live?'disabled':''}>Spara namnet</button></form>`:''}<ol class="story-timeline">${[...s.chapters].reverse().map((c,i)=>`<li><span class="story-chapter-date">${c.date?calText(c.date):'Denna säsong'}${i===0?' · SENASTE KAPITLET':''}</span><h3>${trainingSafe(c.title)}</h3><p>${trainingSafe(c.text)}</p></li>`).join('')}</ol></article>`;
}
function storiesPlayerPanel(p){
 const b=state.stories;if(!b)return '';const active=b.active.filter(s=>s.ids.some(id=>samePlayerId(id,p.id))),memory=b.memory.players[managerClub()+':'+p.id];
 if(!active.length&&!memory)return '';
 return `<section class="story-player"><h3>Det ni bär med er</h3>${active.map(s=>`<button class="story-text-button" onclick="storiesOpen('${s.id}')">${trainingSafe(s.title)} →</button><p>${trainingSafe(storiesNext(s))}</p>`).join('')}${memory?`<p><strong>${trainingSafe(memory.outcome)}</strong> · ${seasonLabel(memory.year)}</p><p>${trainingSafe(memory.text)}</p>`:''}</section>`;
}
