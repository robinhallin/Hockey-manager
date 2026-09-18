"use strict";
// Public opinion is a separate, saved observer of completed fixtures. No match RNG.
const PRESS_GROUPS={terrace:'Läktarrösten',results:'Resultatkravet',future:'Framtidstron'};
const pressUI={club:null,tab:'press',selected:null};
function pressClamp(n,min=0,max=100){return Math.max(min,Math.min(max,n));}
function pressKey(g){return JSON.stringify([state.season.year,g.seriesId||'regular',g.round,g.home,g.away]);}
function ensurePress(exclude=null){
 if(!state.careerStarted||!state.season||!state.world)return;
 if(!state.press){state.press={version:1,year:state.season.year,clubs:{},seen:[],nextId:1};pressUI.club=null;pressUI.selected=null;pressUI.tab='press';}
 const w=state.press;
 if(w.year!==state.season.year){w.year=state.season.year;w.seen=[];for(const c of Object.values(w.clubs)){
  if(c.promise){c.promise.status='closed';c.promise.outcome='Säsongen tog slut innan beskedet kunde bedömas.';pressSyncPromise(c,c.promise);c.promise=null;}
  c.recent=[];c.pressure=Math.round(c.pressure*.55+25*.45);c.credibility=Math.round(c.credibility*.8+55*.2);
  for(const k of Object.keys(PRESS_GROUPS))c.fans[k]=Math.round(c.fans[k]*.75+60*.25);
 }}
 for(const club of Object.keys(state.world.membership))if(!w.clubs[club])w.clubs[club]={club,pressure:25,credibility:55,fans:{terrace:60,results:60,future:60},recent:[],editions:[],promise:null};
 // Migration establishes a boundary: old results do not create retrospective reactions.
 if(!w.bootstrapped){w.bootstrapped=true;w.seen=(state.schedule||[]).filter(g=>g.played&&g!==exclude).map(pressKey);}
 for(const c of Object.values(w.clubs))if(c.promise&&(c.club!==managerClub()||!managerEmployed()||!['regular','playoffs'].includes(state.season.phase)||c.promise.playoff!==(state.season.phase==='playoffs'))){
  c.promise.status='closed';c.promise.outcome=c.club!==managerClub()||!managerEmployed()?'Tränaren lämnade uppdraget. Beskedet avslutas utan påföljd.':'Tävlingsfasen avslutades. Beskedet avslutas utan påföljd.';pressSyncPromise(c,c.promise);c.promise=null;
 }
}
function pressSyncPromise(c,p){const source=c.editions.find(e=>e.id===p.source);if(source?.response)source.response.promise={...p};}
function pressClub(club=managerClub()){return state.press?.clubs[club];}
function pressSupport(c){return Math.round(c.fans.terrace*.4+c.fans.results*.35+c.fans.future*.25);}
function pressPressureLabel(n){return n>=75?'Hård granskning':n>=55?'Växande kritik':n>=35?'Frågor att besvara':'Arbetsro';}
function pressMood(n){return n>=75?'Entusiasm':n>=60?'Försiktig optimism':n>=45?'Avvaktande':n>=30?'Besvikelse':'Tålamodet tryter';}
function pressPick(key,values){let h=0;for(const ch of String(key))h=(Math.imul(h,31)+ch.charCodeAt(0))>>>0;return values[h%values.length];}
function pressTarget(club){return (club===managerClub()?state.boardPlan?.offer?.place:null)||rivalsClubState(club)?.target||10;}
function pressSample(g,club,rows,reports,partial){
 const home=g.home===club,opponent=home?g.away:g.home,players=(state.clubRosters[club]||[]),entries=rows.filter(r=>r.club===club),other=rows.filter(r=>r.club===opponent);
 const report=reports.find(r=>r.club===club)||{},target=pressTarget(club),opponentTarget=pressTarget(opponent);
 const gf=home?g.homeGoals:g.awayGoals,ga=home?g.awayGoals:g.homeGoals,playoff=Boolean(g.seriesId),extra=Boolean(g.overtime||g.shootout);
 const points=gf>ga?(extra?2:3):extra?1:0;
 const young=entries.filter(r=>r.pos!=='MV'&&r.seconds>=600&&players.find(p=>samePlayerId(p.id,r.id))?.age<=23).map(r=>({id:String(r.id),name:r.name,minutes:Math.floor(r.seconds/60),points:(r.goals||0)+(r.assists||0)}));
 const star=entries.filter(r=>r.pos!=='MV'&&(r.goals||0)+(r.assists||0)>=2).sort((a,b)=>(b.goals+b.assists)-(a.goals+a.assists)||String(a.id).localeCompare(String(b.id)))[0];
 const keeper=entries.filter(r=>r.pos==='MV'&&(r.saves||0)+(r.against||0)>=25&&r.saves/(r.saves+r.against)>=.94).sort((a,b)=>b.saves-a.saves)[0];
 const regulars=entries.filter(r=>r.pos!=='MV'&&r.seconds>=900).map(r=>({id:String(r.id),name:r.name,points:(r.goals||0)+(r.assists||0)}));
 const identity=careerIdentity(club),derby=careerIdentity(opponent).city===identity.city&&opponent!==club;
 return {key:pressKey(g),year:state.season.year,date:g.date||state.calendar?.date,round:g.round,club,opponent,home,gf,ga,win:gf>ga,playoff,extra,shootout:!!g.shootout,partial:!!partial,points,target,opponentTarget,
 expected:pressClamp(1.5+(opponentTarget-target)*.065+(home?.16:-.16),.65,2.35),
 rank:leagueTable(leagueOf(club)).findIndex(t=>t.name===club)+1,played:team(club)?.gp||0,
 coach:club===managerClub()?(state.managerCareer?.name||'Huvudtränaren'):(report.coachName||rivalsClubState(club)?.coach.name||'Huvudtränaren'),
 coachId:club===managerClub()?`manager:${club}`:(report.coachId||rivalsClubState(club)?.coach.id),derby,
 shots:partial?null:entries.reduce((n,r)=>n+(r.shots||0),0),againstShots:partial?null:other.reduce((n,r)=>n+(r.shots||0),0),
 pp:partial?null:report.pp??null,ppGoals:partial?null:report.ppGoals??null,
 young:partial?[]:young,youngAvailable:young.length>0||players.some(p=>p.pos!=='MV'&&p.age<=23&&medicalReady(p)),
 star:!partial&&star?{name:star.name,id:String(star.id),goals:star.goals||0,assists:star.assists||0}:null,
 keeper:!partial&&keeper?{name:keeper.name,saves:keeper.saves,faced:keeper.saves+keeper.against}:null,regulars:partial?[]:regulars};
}
function pressAssessment(c,s){
 const recent=[...c.recent,s].slice(-5),before=c.recent.slice(-5),wins=recent.filter(m=>m.win).length;
 let streak=0;for(const m of recent.slice().reverse()){if(m.win!==s.win)break;streak++;}
 const deficit=recent.reduce((n,m)=>n+(m.playoff?(m.win?-.65:.65):m.expected-m.points),0)/recent.length;
 const position=!s.playoff&&s.played>=8?pressClamp((s.rank-s.target)*2,-10,16):0;
 const target=pressClamp(28+deficit*27+position+(s.derby&&!s.win?5:0),5,95),pressure=pressClamp(Math.round(c.pressure+(target-c.pressure)*.26),0,100);
 const rebound=s.win&&before.length>=3&&before.slice(-3).filter(m=>!m.win).length>=3;
 const topic=s.playoff?(s.win?'playoffWin':'playoffLoss'):rebound?'rebound':!s.win&&streak>=3?'slump':s.win&&streak>=3?'streak':s.win&&s.target-s.opponentTarget>=5?'upset':!s.win&&s.opponentTarget-s.target>=5?'setback':s.win?'win':'loss';
 return {recent,wins,streak,pressure,topic,deficit};
}
function pressFollowPromise(c,s){
 const p=c.promise;if(!p)return null;
 if(p.year!==s.year||p.playoff!==s.playoff){p.status='closed';p.outcome='En ny tävlingsfas började. Beskedet avslutas utan påföljd.';pressSyncPromise(c,p);c.promise=null;return p;}
 p.attempts++;
 if(p.kind==='youth'&&(s.partial||!s.youngAvailable)){
  if(p.attempts<6){pressSyncPromise(c,p);return null;}
  p.status='closed';p.outcome='För få matcher med spelbara unga och fullständig istid. Ingen påföljd.';pressSyncPromise(c,p);c.promise=null;return p;
 }
 p.played++;p.value+=p.kind==='youth'?(s.young.length?1:0):p.playoff?(s.win?1:0):s.points;
 if(p.played<3&&p.attempts<6){pressSyncPromise(c,p);return null;}
 if(p.played<3){p.status='closed';p.outcome='För få bedömbara matcher. Ingen påföljd.';}
 else{
  const met=p.value>=p.target;p.status=met?'met':'missed';c.credibility=pressClamp(c.credibility+(met?6:-8));
  const group=p.kind==='youth'?'future':'results';c.fans[group]=pressClamp(c.fans[group]+(met?4:-5));c.pressure=pressClamp(c.pressure+(met?-3:4));
  p.outcome=`${met?'Beskedet höll':'Beskedet infriades inte'}: ${p.value}/${p.target} ${p.kind==='youth'?'matcher med ung spelare minst tio minuter':p.playoff?'segrar':'seriepoäng'} på ${p.played} matcher. Trovärdighet ${met?'+6':'−8'}, ${PRESS_GROUPS[group].toLowerCase()} ${met?'+4':'−5'}, medietryck ${met?'−3':'+4'}.`;
 }
 pressSyncPromise(c,p);c.promise=null;return p;
}
function pressNarrative(c,s,a){
 const club=s.club,score=`${club} ${s.gf}–${s.ga} ${s.opponent}`,name=s.coach;
 const titles={
  win:[`${club} får betalt – nästa steg blir kontinuitet`,`En kväll som ger ${name} arbetsro`,`${club} vinner och får något att bygga vidare på`],
  loss:[`Nederlag för ${club} – men en match är ingen trend`,`${name} får frågor efter ${s.gf}–${s.ga}`,`En tung kväll, en längre berättelse för ${club}`],
  streak:[`${a.streak} raka segrar: ${club} gör orden överflödiga`,`${name} har fått resultaten med sig`,`Nu växer tron på ${club}`],
  slump:[`${a.streak} raka förluster – frågorna blir svårare`,`${club} behöver ett svar på isen`,`Tålamodet prövas kring ${name}`],
  rebound:[`Ett svar från ${club} – ännu ingen frisedel`,`Efter motvinden: ${name} får andrum`,`Segern som ${club} behövde`],
  upset:[`${club} fäller ett lag med högre säsongsmål`,`En seger över förväntan för ${name}`,`${club} skriver kvällens överraskning`],
  setback:[`Ett bakslag mot lägre ställda förväntningar`,`${club} tappar mot ett lag man vill hålla bakom sig`,`${name} får förklara ett oväntat nederlag`],
  playoffWin:[`${club} tar en seger i slutspelskampen`,`En viktig slutspelskväll för ${name}`],
  playoffLoss:[`${club} förlorar – nästa svar måste komma på isen`,`Slutspelsförlusten sätter ${name} under lupp`]
 };
 const context=s.playoff?'I slutspel och kval bedöms segrar och förluster, inte seriepoäng.':`Säsongsmålet är topp ${s.target}; motståndarens mål är topp ${s.opponentTarget}. ${s.played>=8?`Efter ${s.played} seriematcher ligger laget på plats ${s.rank}.`:'Serien är fortfarande ung, så tabellplaceringen väger ännu inte in i granskningen.'}`;
 const form=`${a.wins} segrar på de senaste ${a.recent.length} registrerade tävlingsmatcherna. ${a.recent.length<3?'Underlaget är för litet för stora slutsatser.':a.topic==='rebound'?'Segern bryter en förlustsvit, men tidigare problem försvinner inte över en kväll.':a.pressure>=55?'Flera resultat bidrar till kritiken; det handlar om mer än kvällens slutresultat.':'Utvecklingen bedöms över flera matcher.'}`;
 const shots=s.partial?'Detaljstatistiken är ofullständig. Spelarnas insatser och spelövertag bedöms därför inte.':s.shots>s.againstShots+8?`${s.shots}–${s.againstShots} i skott på mål. ${s.win?'Skottövertaget ger stöd åt resultatet.':'Skottövertaget nyanserar förlusten, men visar inte ensamt kvaliteten på lägena.'}`:s.againstShots>s.shots+8?`${s.shots}–${s.againstShots} i skott på mål. ${s.win?'Segern kom trots ett tydligt skottunderläge; det är värt att följa upp.':'Skottunderläget ger tränaren ytterligare något att analysera.'}`:`Skotten slutade ${s.shots}–${s.againstShots}. Inga säkra slutsatser om chanskvaliteten kan dras av skottantalet ensamt.`;
 const pp=a.recent.filter(m=>!m.partial&&Number.isFinite(m.pp)&&Number.isFinite(m.ppGoals)),chances=pp.reduce((n,m)=>n+m.pp,0),goals=pp.reduce((n,m)=>n+m.ppGoals,0);
 const special=chances>=10?`I de ${pp.length} senaste matcherna med komplett PP-underlag: ${goals} mål på ${chances} powerplay. ${goals===0?'Det är en konkret fråga till special teams-träningen.':goals/chances>=.25?'Numerärt överläge har gett utdelning.':'Utdelningen går att följa, men säger inte allt om spelet.'}`:'';
 const star=s.star?`${s.star.name}: ${s.star.goals} mål och ${s.star.assists} assist. ${s.win?'En tydlig poänginsats i segern.':'En individuell ljuspunkt i förlusten.'}`:s.keeper?`${s.keeper.name} räddade ${s.keeper.saves} av ${s.keeper.faced} skott. En stark räddningsinsats även när lagets helhet granskas.`:s.young.length?`${s.young[0].name} fick ${s.young[0].minutes} minuter som ung spelare. Ansvar är verkligt först när det syns i istiden.`:'';
 const drought=s.regulars.find(p=>p.points===0&&c.recent.slice(-3).length===3&&c.recent.slice(-3).every(m=>!m.partial&&m.regulars.some(r=>r.id===p.id&&r.points===0)));
 const scrutiny=drought?`${drought.name} har gått fyra matcher utan poäng med minst 15 minuters istid i varje. Offensiv utdelning kan efterfrågas; poängraden bedömer inte försvarsarbetet.`:'';
 const old=c.recent.at(-1),coachChange=old&&old.coachId!==s.coachId?`Tränarbytet är en del av bakgrunden: resultaten före ${name}s tillträde kan inte läggas på den nya tränaren ensam.`:'';
 return {title:pressPick(s.key+club,titles[a.topic]),lead:`${score}${s.shootout?' efter straffar':s.extra?' efter förlängning':''}. ${s.home?'Hemma':'Borta'}${s.derby?' i ett möte mellan lag från samma stad':''}.`,context,form,shots,special,star,scrutiny,coachChange,
  local:`${name} ${a.pressure>=55?'behöver visa att laget kan förändra utvecklingen':s.win?'får stöd av resultatet':'behöver samla laget inför nästa uppgift'}. ${s.derby?'Ett stadsderby väger extra tungt på läktaren. ':''}${form}`,
  column:a.topic==='rebound'?'En seger är ett steg ut ur motvinden, inte ett kvitto på att allt är löst. Nu blir fortsättningen intressant.':a.topic==='slump'?'Det är lätt att ropa efter förändring. Den svårare frågan är vad tränaren faktiskt ska ändra och hur det ska synas i nästa match.':s.win?'I kväll låter det enkelt från läktaren. Tränarens uppgift är att få samma arbete att hålla även nästa gång.':'En förlust ger alltid fler tvärsäkra analyser än svar. Resultatkravet är rimligt; säkra domar om varje spelare kräver mer underlag.'};
}
function pressFanVoices(c,s,a){
 const pick=values=>pressPick(s.key+s.club,values);
 return [
  {group:'terrace',name:'Alex · på ståplats',text:s.derby?(s.win?'Ett stadsderby vunnet. Den här kvällen lever kvar på läktaren!':'Ett derby känns i magen. Vi är kvar på läktaren, men vi vill se ett svar.'):s.win?pick(['Hes i morgon? Absolut. Ångrar jag mig? Inte en sekund.','Det är kvällar som den här man vill ha med sig till jobbet.','Jag hade redan börjat muttra. Nu går jag hem och nynnar.']):a.streak>=3?'Vi kommer tillbaka. Men just nu behöver tränaren ge oss mer än samma förklaring efter varje match.':pick(['Man kan älska klubben och ändå vara besviken på kvällen.','Halsduken åker inte av för en förlust. Men hemresan blev tystare.','Vi är här nästa gång också. Det betyder inte att vi är nöjda.'])},
  {group:'results',name:'Sam · resultattavlan först',text:a.topic==='rebound'?'Äntligen en seger. Bra. Nu vill jag se att det håller över flera matcher.':a.topic==='slump'?`${a.streak} raka förluster. Jag vill höra vad ${s.coach} tänker förändra.`:s.win&&s.shots!==null&&s.shots+8<s.againstShots?`Jag tar segern alla dagar. Men ${s.shots}–${s.againstShots} i skott gör mig inte lugn inför nästa match.`:s.win?`Seger mot ${s.opponent}. Det är ett resultat att bygga på, men förväntningarna försvinner inte.`:s.extra?'Vi förlorade efter ordinarie tid. Det är surt, men inte samma sak som att vara utspelade.':s.playoff?'I slutspel räcker det inte att vara nära. Nu behöver vi en seger.':s.opponentTarget+5<=s.target?'Förlust mot ett lag med högre mål. Besviken, ja. Tränarbyte på den grunden? Nej.':`Målet är topp ${s.target}. Sådana här resultat gör vägen dit svårare.`},
  {group:'future',name:'Kim · följer nästa generation',text:s.partial?'Jag väntar med att bedöma spelarnas roller tills vi har komplett istid.':s.young.length?`${s.young[0].name} fick ${s.young[0].minutes} minuter. ${s.win?'Seger och verkligt ansvar för en ung spelare – det gillar jag.':'Förlusten svider, men jag uppskattar att unga får riktigt ansvar.'}`:s.star?`${s.star.name} gjorde ${s.star.goals+s.star.assists} poäng. ${s.win?'En spelare att hylla i kväll.':'Jag vill inte att den insatsen försvinner i all kritik mot laget.'}`:s.keeper?`${s.keeper.name}: ${s.keeper.saves} räddningar. Alla insatser syns inte i segerkolumnen.`:s.youngAvailable?'Ingen ung utespelare nådde tio minuter i kväll. Jag vill se en väg in, men inte slänga in någon bara för syns skull.':'Unga behöver vara spelbara för att få en riktig chans. Tålamod behövs också.'}
 ];
}
function pressAfterFixture(g,rows=[],reports=[],partial=false){
 if(!g?.played||g.friendly||!Number.isFinite(g.homeGoals)||!Number.isFinite(g.awayGoals)||g.homeGoals===g.awayGoals||!['SHL','HA'].includes(leagueOf(g.home)))return;
 ensurePress(g);const w=state.press,key=pressKey(g);if(!w||w.seen.includes(key))return;w.seen.push(key);
 for(const club of [g.home,g.away]){
  const c=pressClub(club);if(!c)continue;
  const s=pressSample(g,club,rows,reports,partial),a=pressAssessment(c,s),before={pressure:c.pressure,support:pressSupport(c)};
  c.pressure=a.pressure;
  const surprise=s.playoff?(s.win?1:-1):(s.points-s.expected)/1.5;
  c.fans.terrace=pressClamp(c.fans.terrace+(s.win?2.5:-1.8)*(s.derby?1.5:1)+(.12*(60-c.fans.terrace)));
  c.fans.results=pressClamp(c.fans.results+surprise*3.3+(.1*(55-c.fans.results)));
  if(!s.partial)c.fans.future=pressClamp(c.fans.future+(s.young.length?1.8:s.youngAvailable?-.8:0)+(s.win?.5:-.3)+(.08*(60-c.fans.future)));
  const followup=pressFollowPromise(c,s),article=pressNarrative(c,s,a),voices=pressFanVoices(c,s,a);
  const edition={id:'press-'+w.nextId++,club,year:s.year,date:s.date,sample:s,topic:a.topic,article,voices,pressure:c.pressure,support:pressSupport(c),delta:{pressure:c.pressure-before.pressure,support:pressSupport(c)-before.support},response:null,followup};
  c.recent.push(s);c.recent=c.recent.slice(-12);c.editions.unshift(edition);c.editions=c.editions.slice(0,24);
  if(club===managerClub()&&managerEmployed()&&(c.editions.length===1||followup||before.pressure<55&&c.pressure>=55||['slump','rebound','streak','upset'].includes(a.topic)))managerMessage(`press:${edition.id}`,article.title,`${article.lead}\n${article.form}${followup?'\n'+followup.outcome:''}`,'Press & supportrar',{link:'press'});
 }
}
function pressResponseOptions(e,c){return [
 {id:'calm',label:'Låt arbetet tala',text:'”Vi tar med oss lärdomarna och gör jobbet till nästa match.” Inget mätbart löfte och ingen omedelbar effekt.'},
 {id:'results',label:'Ställ ett tydligt resultatkrav',text:`”Vi ska ta ${e.sample.playoff?'två segrar':'minst fem poäng'} på nästa tre tävlingsmatcher.” Bedöms mot ${e.sample.playoff?'segrar':'seriepoäng'}.`,disabled:!!c.promise},
 {id:'youth',label:'Ge nästa generation ansvar',text:'”En spelbar utespelare som är högst 23 år ska få minst tio minuter i två av nästa tre bedömbara matcher.” Skador och ofullständig istid räknas bort, högst sex matcher följs.',disabled:!!c.promise||!(state.clubRosters[e.club]||[]).some(p=>p.pos!=='MV'&&p.age<=23)}
 ];}
function pressRespond(id,choice){
 ensurePress();const c=pressClub(),e=c?.editions[0];
 if(!e||e.id!==id||e.response||e.year!==state.season.year||!managerEmployed()||state.live&&!state.live.finished||!['regular','playoffs'].includes(state.season.phase))return;
 if(e.sample.playoff!==(state.season.phase==='playoffs'))return;
 const option=pressResponseOptions(e,c).find(o=>o.id===choice);if(!option||option.disabled)return;
 e.response={choice,label:option.label,date:state.calendar?.date,text:option.text};
 if(choice!=='calm'){
  c.promise={kind:choice,status:'following',year:e.year,playoff:e.sample.playoff,source:e.id,played:0,attempts:0,value:0,target:choice==='youth'||e.sample.playoff?2:5};e.response.promise={...c.promise};
 }
 save();render();
}
function pressSet(key,value){
 if(key==='club'&&state.press?.clubs[value]){pressUI.club=value;pressUI.selected=null;}
 else if(key==='tab'&&['press','fans','statements'].includes(value))pressUI.tab=value;
 else if(key==='selected')pressUI.selected=value;
 else return;render();
}
function pressPromiseView(p){return p?`<div class="press-follow"><strong>${p.status==='following'?'Ditt besked följs upp':'Uppföljning'}</strong><p>${p.status==='following'?`${p.value}/${p.target} ${p.kind==='youth'?'matcher med ung spelare minst tio minuter':p.playoff?'segrar':'seriepoäng'} · ${p.played}/3 bedömbara matcher (${p.attempts}/6 passerade).`:trainingSafe(p.outcome)}</p></div>`:'';}
function pressFansView(c,e){return `<section class="press-fans"><h2>Tre röster, samma klubb</h2><p>Stämningen är en modell av olika perspektiv, inte en opinionsundersökning. ${e?'Rösterna nedan skrevs efter matchen den '+trainingSafe(e.date)+'.':'Röster publiceras efter nästa tävlingsmatch.'}</p><div class="press-fan-grid">${Object.entries(PRESS_GROUPS).map(([k,label])=>`<article><span class="press-eyebrow">${label}</span><h3>${pressMood(c.fans[k])}</h3><progress max="100" value="${Math.round(c.fans[k])}" aria-label="${label}"></progress><strong>${Math.round(c.fans[k])}/100</strong><p>${k==='terrace'?'Lojalitet, segrar och extra känslor i stadsderbyn.':k==='results'?'Utdelning i förhållande till motstånd och säsongsmål.':'Verklig istid för unga och individuella ljuspunkter.'}</p>${e?`<blockquote>”${trainingSafe(e.voices.find(v=>v.group===k)?.text||'')}”<cite>${trainingSafe(e.voices.find(v=>v.group===k)?.name||'')}</cite></blockquote>`:'<p>Första rösterna kommer efter nästa tävlingsmatch.</p>'}</article>`).join('')}</div></section>`;}
function pressArticle(e,c){
 const a=e.article,active=e===c.editions[0]&&c.club===managerClub()&&managerEmployed()&&e.year===state.season.year&&e.sample.playoff===(state.season.phase==='playoffs')&&['regular','playoffs'].includes(state.season.phase);
 return `<article class="press-article"><header><span class="press-eyebrow">Hockeykrönikan · ${trainingSafe(e.date)} · ${seasonLabel(e.year)}</span><h2>${trainingSafe(a.title)}</h2><p class="press-lead">${trainingSafe(a.lead)}</p></header><p>${trainingSafe(a.context)}</p><div class="press-columns"><section><span class="press-eyebrow">Lokalredaktionen · Robin Berg</span><h3>Tränaren under lupp</h3><p>${trainingSafe(a.local)}</p>${a.coachChange?`<p>${trainingSafe(a.coachChange)}</p>`:''}</section><section><span class="press-eyebrow">Isanalysen · Dani Lind</span><h3>Bakom resultatet</h3><p>${trainingSafe(a.shots)}</p>${[a.special,a.star,a.scrutiny].filter(Boolean).map(t=>`<p>${trainingSafe(t)}</p>`).join('')}</section></div><aside class="press-column"><span class="press-eyebrow">Krönika · Charlie Holm</span><p>${trainingSafe(a.column)}</p></aside>${pressPromiseView(e.followup)}<details><summary>Underlaget vid publiceringen</summary><p>${e.sample.partial?'Delvis registrerad match. Endast resultat vägs in.':'Matchresultat, registrerade skott, PP och individuell istid från den avslutade matchen.'} Medietryck ${e.pressure}/100 (${e.delta.pressure>=0?'+':''}${e.delta.pressure}); supporterstöd ${e.support}/100 (${e.delta.support>=0?'+':''}${e.delta.support}).</p><p>Medietrycket bygger på upp till fem matcher, motståndarnas säsongsmål och tabelläge efter minst åtta seriematcher. Skottantal används som underlag i texten, inte som ett mått på vilja eller arbetsinsats.</p></details>${e.response?`<section class="press-response"><h3>Ditt offentliga besked</h3><p>${trainingSafe(e.response.text)}</p>${pressPromiseView(e.response.promise)}</section>`:active?`<section class="press-response"><h3>Vad säger du efter matchen?</h3><p>Du kan lämna ett besked fram till nästa tävlingsmatch. Det går också bra att avstå. Ett löfte följs upp: uppfyllt ger +6 i trovärdighet och +4 hos berörd supportergrupp; missat ger −8 och −5. Medietrycket ändras −3 respektive +4. Styrelsen gör sin egen bedömning.</p><div class="press-choices">${pressResponseOptions(e,c).map(o=>`<button class="btn secondary" onclick="pressRespond('${e.id}','${o.id}')" ${o.disabled||state.live&&!state.live.finished?'disabled':''}><strong>${o.label}</strong><span>${trainingSafe(o.text)}</span></button>`).join('')}</div>${c.promise?'<p>Ett offentligt löfte pågår redan.</p>':''}</section>`:''}</article>`;
}
function pressView(){
 ensurePress();const c=pressClub(pressUI.club)||pressClub(),e=c?.editions.find(e=>e.id===pressUI.selected)||c?.editions[0];if(!c)return '';
 const board=c.club===managerClub()?state.managerCareer?.confidence:rivalsClubState(c.club)?.confidence;
 return `<section class="press-page"><header class="press-heading"><div><span class="desk-kicker">RUNT RINKEN</span><h1>Press & supportrar</h1><p>Resultat blir rubriker. Handling ger orden tyngd.</p></div><label>Klubb<select onchange="pressSet('club',this.value)">${Object.keys(state.press.clubs).map(club=>`<option value="${trainingSafe(club)}" ${club===c.club?'selected':''}>${trainingSafe(club)}</option>`).join('')}</select></label></header><div class="press-metrics"><div><span>Medietryck</span><strong>${c.pressure}/100</strong><small>${pressPressureLabel(c.pressure)}</small></div><div><span>Supporterstöd</span><strong>${pressSupport(c)}/100</strong><small>${pressMood(pressSupport(c))}</small></div><div><span>Offentlig trovärdighet</span><strong>${c.credibility}/100</strong><small>Följer mätbara besked</small></div><div><span>Styrelseförtroende</span><strong>${Math.round(board??60)}/100</strong><small>Styrelsens egen bedömning</small></div></div><nav class="press-tabs" aria-label="Press och supportrar">${[['press','Pressrummet'],['fans','Supporterpanelen'],['statements','Besked & minne']].map(([id,label])=>`<button aria-pressed="${pressUI.tab===id}" onclick="pressSet('tab','${id}')">${label}</button>`).join('')}</nav>${pressUI.tab==='fans'?pressFansView(c,c.editions[0]):pressUI.tab==='statements'?`<section class="press-article"><h2>Ord som följs av matcher</h2>${pressPromiseView(c.promise)}${c.editions.filter(e=>e.response||e.followup).map(e=>`<article class="press-memory"><span>${trainingSafe(e.date)} · ${seasonLabel(e.year)}</span><h3>${trainingSafe(e.response?.label||'Uppföljning')}</h3><p>${trainingSafe(e.response?.text||e.followup?.outcome||'')}</p>${pressPromiseView(e.response?.promise)}</article>`).join('')||'<p>Inga offentliga besked ännu. Efter nästa tävlingsmatch kan du svara i pressrummet.</p>'}</section>`:e?`<div class="press-layout"><nav class="press-archive" aria-label="Tidigare utgåvor">${c.editions.map(row=>`<button aria-current="${row.id===e.id?'true':'false'}" onclick="pressSet('selected','${row.id}')"><small>${trainingSafe(row.date)} · ${row.sample.gf}–${row.sample.ga}</small><strong>${trainingSafe(row.article.title)}</strong><span>${trainingSafe(row.sample.opponent)}</span></button>`).join('')}</nav>${pressArticle(e,c)}</div>`:`<section class="press-empty"><span class="press-eyebrow">FÖRE FÖRSTA RUBRIKEN</span><h2>En säsong att skriva om</h2><p>${trainingSafe(careerIdentity(c.club).pitch)}</p><p>Redaktionerna bevakar nästa tävlingsmatch. Gamla matcher får inga påhittade efterhandsreaktioner.</p><button class="btn secondary" onclick="deskNavigate('calendar')">Se matchkalendern</button></section>`}<footer class="press-footer">Redaktioner, journalister och supporterpersoner är fiktiva i din karriär. Artiklarna bygger på spelets matcher. De senaste 24 utgåvorna per klubb sparas. Medietryck och supporterstöd ändrar inte matchmotorn eller styrelsens beslut direkt.</footer></section>`;
}
function pressDeskView(){
 const c=pressClub();if(!c)return '';const e=c.editions[0];return `<section class="press-desk"><header><div><span class="desk-kicker">OMVÄRLDEN</span><h2>Press & supportrar</h2></div><button class="desk-link" onclick="pressUI.club=null;pressUI.tab='press';deskNavigate('press')">Öppna pressrummet →</button></header><div class="press-desk-grid"><article><span class="press-eyebrow">${pressPressureLabel(c.pressure)} · ${c.pressure}/100</span><h3>${trainingSafe(e?.article.title||'Inför nästa rubrik')}</h3><p>${trainingSafe(e?.article.lead||'Pressen börjar bevaka vid nästa tävlingsmatch.')}</p></article><article><span class="press-eyebrow">Supporterstöd · ${pressSupport(c)}/100</span><h3>${pressMood(pressSupport(c))}</h3><p>${trainingSafe(e?.voices[0].text||'Läktaren väntar på nästa nedsläpp.')}</p><button class="desk-link" onclick="pressUI.club=null;pressUI.tab='fans';deskNavigate('press')">Lyssna på supportrarna →</button></article></div>${pressPromiseView(c.promise)}</section>`;
}
