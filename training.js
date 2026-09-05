"use strict";

const TRAINING_SESSIONS = {
  recovery:{name:'Återhämtning',tag:'ÅTERSTÄLL',description:'Återfå ork. Ingen attributträning.',keys:[]},
  skills:{name:'Teknik & avslut',tag:'UTVECKLA',description:'Passningar, puckkontroll och avslut.',keys:['shooting','passing','puckControl']},
  physical:{name:'Skridskor & fysik',tag:'BYGG',description:'Skridskoåkning, uthållighet och arbetskapacitet.',keys:['skating','stamina','workRate']},
  tactics:{name:'Taktiskt samspel',tag:'SPELSÄTT',description:'Beslut, positionering och trygghet i matchplanen.',keys:['decisions','positioning','vision']},
  powerplay:{name:'Powerplay',tag:'SPECIAL TEAMS',description:'Passningsvägar, avslut och förberedelse i överläge.',keys:['passing','shooting','vision']},
  penaltykill:{name:'Boxplay',tag:'SPECIAL TEAMS',description:'Positionering, disciplin och förberedelse i underläge.',keys:['positioning','discipline','workRate']},
  matchprep:{name:'Matchförberedelse',tag:'MATCHDAG −1',description:'Lättare pass med fokus på nästa motståndare och matchplanen.',keys:['decisions','composure']}
};
const TRAINING_FOCUSES = {Balanserad:null,Skott:'shooting',Passningar:'passing',Försvar:'positioning',Fysik:'stamina',Skridskoåkning:'skating',Tekningar:'faceoffs',Spelförståelse:'vision',Disciplin:'discipline',Reflexer:'reflexes',Returkontroll:'reboundControl',Sidled:'movement'};
const TRAINING_PRESETS = {
  balanced:{name:'Balanserad vecka',plan:[['recovery','light'],['skills','normal'],['matchprep','light']]},
  youth:{name:'Utveckla talanger',plan:[['skills','normal'],['physical','normal'],['matchprep','light']]},
  fresh:{name:'Fräscha ben',plan:[['recovery','light'],['tactics','light'],['recovery','light']]},
  special:{name:'Special teams',plan:[['recovery','light'],['powerplay','normal'],['penaltykill','light']]}
};
let trainingPosition='all';
function trainingClamp(n,lo=0,hi=100){return Math.max(lo,Math.min(hi,n));}
function trainingSignature(){return [state.tactic,state.tacticalPlan?.forecheck,state.tacticalPlan?.tempo].join(':');}
function trainingPlan(name='balanced'){return TRAINING_PRESETS[name].plan.map(([type,intensity])=>({type,intensity}));}
function managerMessage(key,title,body,category='Tränarteam',extra={}){
  const t=state.training;if(!t||t.messages.some(m=>m.key===key))return;
  t.messages.unshift({id:t.nextMessageId++,key,title,body,category,round:state.round,day:t.day,read:false,...extra});
  if(t.messages.length>180){const index=t.messages.findLastIndex(m=>m.read&&!m.decisionType);if(index>=0)t.messages.splice(index,1);}
}
function ensureTrainingData(){
  if(!state.careerStarted)return;
  ensureAssessmentData();
  const initial=!state.training;
  if(initial)state.training={version:1,round:state.round,day:0,plan:trainingPlan(),logs:[],history:[],messages:[],nextMessageId:1,selectedMessage:null,promises:[],lastMatchRound:0,matchMinutes:{},familiarity:{[trainingSignature()]:45},powerplay:40,penaltykill:40};
  const t=state.training;
  for(const staff of state.staff)if(!Number.isFinite(staff.coaching))staff.coaching=staff.id==='goalie'?16:staff.id==='assistant'?14:8;
  for(const p of managerRoster()){
    ensurePlayerAttributes(p);
    if(!validPlayerFocus(p,p.developmentFocus))p.developmentFocus='Balanserad';
    if(!p.trainingProgress){p.trainingProgress={};if(p.developmentProgress>0)p.trainingProgress[trainingTarget(p)]=trainingClamp(p.developmentProgress,0,99.9);}
    if(!p.trainingBaseline)p.trainingBaseline={...p.attributes};
    if(!p.trainingLoad)p.trainingLoad='normal';
  }
  if(t.round!==state.round){t.round=state.round;t.day=0;t.logs=[];t.lockedRound=null;}
  if(initial){
    if(state.live&&!state.live.finished&&(state.live.running||state.live.minute>0||state.live.second>0||state.live.period>1)){t.day=3;t.lockedRound=state.round;}
    managerMessage('welcome','Välkommen till tränarvardagen','Mellan omgångarna har du tre träningsdagar. Planera lagets pass och spelarnas individuella fokus. FORTSÄTT genomför nästa pass och lämnar en rapport i inkorgen. Du kan också låta tränarteamet genomföra återstående pass.','Assisterande tränare',{link:'training'});
  }
  if(!t.newsSeen)t.newsSeen=[...(state.news||[])];
  for(const text of (state.news||[]).slice(0,12).reverse()){
    if(typeof text!=='string'||t.newsSeen.includes(text))continue;
    t.newsSeen.unshift(text);
    const transfer=/bud|kontrakt|värv/i.test(text);
    managerMessage(`news:${t.nextMessageId}`,transfer?'Besked från sportchefen':'Nytt från klubben',text,transfer?'Sportchef':'Klubbnyheter',{link:transfer?'transfers':'news'});
  }
  t.newsSeen=t.newsSeen.slice(0,300);
  if(t.briefRound!==state.round){
    t.briefRound=state.round;
    if(opponent()!=='Ingen match'){
      const tired=managerRoster().filter(p=>p.fatigue>=60);
      managerMessage(`brief:${state.round}`,`Planera inför ${opponent()}`,`${tired.length} spelare har mindre än 40 % ork. ${tired.length?'Lägg in återhämtning eller individuell vila innan du höjer belastningen.':'Truppen är redo för en ny träningsperiod.'} Nästa motståndare: ${opponent()}.`,'Veckoplanering',{link:'training'});
      if(state.round>1&&state.round%3===1)createPlayerConversation();
      if(state.round>1&&state.round%4===1&&state.season?.phase==='regular'){
        const goals=boardProgress();
        managerMessage(`board:${state.round}`,'Styrelsens avstämning',goals.map(g=>`${g.title}: ${g.status}. ${g.detail}.`).join('\n'),'Styrelsen',{link:'board'});
      }
    }
  }
}
function currentTrainingFamiliarity(){const t=state.training;return t?(t.familiarity[trainingSignature()]??20):45;}
function trainingMatchBonus(){
  const t=state.training;if(!t)return 0;
  let bonus=(currentTrainingFamiliarity()-45)/25;
  const m=state.live;
  if(m&&m.penaltiesOpp.length>m.penaltiesHV.length)bonus+=(t.powerplay-40)/30;
  if(m&&m.penaltiesHV.length>m.penaltiesOpp.length)bonus+=(t.penaltykill-40)/30;
  return bonus;
}
function trainingOpen(page){if(state.live?.running)pauseMatch();state.page=page;save();render();}
function validPlayerFocus(p,key){return key==='Balanserad'||Boolean(TRAINING_FOCUSES[key]&&Object.hasOwn(ensurePlayerAttributes(p),TRAINING_FOCUSES[key]));}
function focusOptions(p){return Object.keys(TRAINING_FOCUSES).filter(key=>validPlayerFocus(p,key));}
function trainingTarget(p,session='skills'){
  const a=ensurePlayerAttributes(p),focus=TRAINING_FOCUSES[p.developmentFocus];
  if(focus&&Object.hasOwn(a,focus))return focus;
  const keys=p.pos==='MV'?['reflexes','positioning','reboundControl','movement','handling','composure']:TRAINING_SESSIONS[session].keys;
  const available=keys.filter(key=>Object.hasOwn(a,key));
  // A stable rotation avoids turning every balanced player into the same profile.
  return available.length?available[(state.round+state.training.day+Math.floor(attrSeed(p.id)*10))%available.length]:Object.keys(a)[0];
}
function trainingGrowth(p,key,points){
  if(!Number.isFinite(points)||points<=0||!Object.hasOwn(p.attributes,key)||p.attributes[key]>=20)return false;
  p.trainingProgress[key]=(p.trainingProgress[key]||0)+points;
  if(p.trainingProgress[key]<100)return false;
  p.trainingProgress[key]-=100;p.attributes[key]++;p.attributeGrowth=Math.max(0,p.attributeGrowth-.12);
  const label=(p.pos==='MV'?GOALIE_ATTRIBUTES:SKATER_ATTRIBUTES)[key];
  managerMessage(`growth:${p.id}:${key}:${p.attributes[key]}`,`${p.name} tar ett steg framåt`,`${p.name} har utvecklat ${label.toLowerCase()} genom träning och matchvana. Öppna spelarprofilen för tränarteamets aktuella bedömning.`,'Utvecklingsrapport',{playerId:p.id});
  return true;
}
function grantMatchDevelopment(p,seconds){
  if(!state.training||seconds<300)return;
  const key=trainingTarget(p),age=p.age<=23?1.3:p.age<=28?.8:.4;
  trainingGrowth(p,key,2.5*age*Math.min(1.5,seconds/1200));
}
function setTrainingSession(index,key,value){
  ensureTrainingData();const t=state.training;
  if(!t||!Number.isInteger(index)||index<t.day||index>2||t.lockedRound===state.round)return;
  if(key==='type'&&TRAINING_SESSIONS[value])t.plan[index].type=value;
  else if(key==='intensity'&&['light','normal','hard'].includes(value))t.plan[index].intensity=value;
  else return;
  save();render();
}
function applyTrainingPreset(name){
  ensureTrainingData();if(!TRAINING_PRESETS[name]||state.training.lockedRound===state.round)return;
  const plan=trainingPlan(name);for(let i=state.training.day;i<3;i++)state.training.plan[i]=plan[i];
  save();render();
}
function setIndividualLoad(id,value){
  if(!['normal','light','rest'].includes(value))return;
  const p=managerRoster().find(p=>samePlayerId(p.id,id));if(!p)return;
  p.trainingLoad=value;save();render();
}
function pendingManagerDecision(){return state.training?.messages.find(m=>m.decisionType&&!m.resolved);}
function runTrainingSession(){
  ensureTrainingData();const t=state.training;
  if(!t||t.day>=3||t.lockedRound===state.round||state.live?.running||opponent()==='Ingen match'||pendingManagerDecision())return false;
  const session=t.plan[t.day],definition=TRAINING_SESSIONS[session.type];
  let fatigueChange=0,trained=0,resting=0,improvements=0;
  const before=managerRoster().reduce((n,p)=>n+p.fatigue,0)/managerRoster().length;
  for(const p of managerRoster()){
    const previous=p.fatigue;
    if(p.trainingLoad==='rest'||session.type==='recovery'){p.fatigue=Math.max(0,p.fatigue-25);resting++;}
    else{
      const light=p.trainingLoad==='light'||session.intensity==='light'||session.type==='matchprep';
      const hard=session.intensity==='hard'&&!light;
      const load=hard?12:light?-9:2;
      p.fatigue=trainingClamp(p.fatigue+load);
      const coach=state.staff.find(s=>s.id===(p.pos==='MV'?'goalie':'assistant'));
      const age=p.age<=23?1.35:p.age<=28?.85:.45;
      const quality=(coach?.coaching||12)/15;
      const freshness=Math.max(.25,1-previous/120);
      const growthRoom=.5+Math.min(3,p.attributeGrowth||0)/6;
      const points=(hard?8:light?3.5:6)*age*quality*freshness*growthRoom;
      if(trainingGrowth(p,trainingTarget(p,session.type),points))improvements++;
      trained++;
    }
    fatigueChange+=p.fatigue-previous;
  }
  const participation=trained/Math.max(1,managerRoster().length),signature=trainingSignature();
  const tactical=session.type==='tactics'?9:session.type==='matchprep'?7:session.type==='recovery'?0:2;
  t.familiarity[signature]=trainingClamp((t.familiarity[signature]??20)+tactical*participation,0,90);
  if(session.type==='powerplay')t.powerplay=trainingClamp(t.powerplay+12*participation,0,90);
  if(session.type==='penaltykill')t.penaltykill=trainingClamp(t.penaltykill+12*participation,0,90);
  const after=before+fatigueChange/managerRoster().length;
  const log={round:state.round,day:t.day+1,type:session.type,intensity:session.intensity,trained,resting,before,after,improvements};
  t.logs.push(log);t.history.unshift(log);t.history=t.history.slice(0,60);t.day++;
  managerMessage(`session:${state.round}:${t.day}`,`${definition.name} – rapport dag ${t.day}`,`${trained} spelare tränade och ${resting} återhämtade sig. Lagets genomsnittliga ork: ${Math.round(100-before)} % → ${Math.round(100-after)} %.\n${improvements?`${improvements} tydliga attributförbättringar noterades.`:'Utvecklingen byggs gradvis. Ett enskilt pass behöver inte ge ett synligt attributsteg.'}\n${after>=50?'Truppen är sliten. Prioritera återhämtning och se över individuell belastning.':'Tränarteamet rekommenderar att du följer spelarnas ork inför nästa pass.'}`,'Träningsrapport',{link:'training'});
  if(t.day===3)createOpponentBrief();
  return true;
}
function executeTrainingPeriod(){
  ensureTrainingData();
  const pending=pendingManagerDecision();if(pending){openManagerMessage(pending.id);return;}
  while(runTrainingSession()){}
  state.page='inbox';state.training.selectedMessage=state.training.messages[0]?.id;if(state.training.messages[0])state.training.messages[0].read=true;save();render();
}
function managerContinue(){
  if(careerScreen||!state.careerStarted)return;
  ensureTrainingData();
  if(seasonContinue())return;
  if(state.live&&!state.live.finished&&state.training.lockedRound===state.round){state.page='match';save();render();return;}
  const pending=pendingManagerDecision();if(pending){openManagerMessage(pending.id);return;}
  if(opponent()==='Ingen match'){state.page='season';save();render();return;}
  if(runTrainingSession()){state.page='inbox';const report=state.training.messages.find(m=>m.key===`session:${state.round}:${state.training.day}`);state.training.selectedMessage=report?.id;if(report)report.read=true;}
  else{if(state.live?.finished)state.live=null;state.page='match';}
  save();render();
}
function lockTrainingForMatch(){
  ensureTrainingData();const t=state.training;if(!t||t.lockedRound===state.round)return;
  if(t.day<3)managerMessage(`skip:${state.round}`,'Du går direkt till match',`${3-t.day} planerade träningspass genomfördes inte. De ger ingen träningseffekt. Du kan planera nästa period efter matchen.`,'Tränarteam');
  t.lockedRound=state.round;t.day=3;
}
function createOpponentBrief(){
  const name=opponent(),roster=(state.clubRosters[name]||[]).filter(p=>p.pos!=='MV');if(!roster.length)return;
  const reports=roster.map(p=>({p,r:playerAssessment(p)}));
  const avg=key=>reports.reduce((n,{r})=>n+(r.estimated[key]||10),0)/reports.length;
  const strengths=[['passing','passningsspel'],['shooting','avslut'],['checking','fysiskt spel'],['skating','skridskoåkning']].sort((a,b)=>avg(b[0])-avg(a[0]));
  const threat=reports.sort((a,b)=>b.r.current-a.r.current)[0];
  managerMessage(`opponent:${state.round}`,`Inför ${name}`,`Scouternas preliminära bild pekar på ${strengths[0][1]} som en styrka. Håll ett öga på ${threat.p.name}, som bedöms passa som ${threat.r.roles[0].name.toLowerCase()}.\nBedömningen bygger på våra nuvarande observationer och kan vara osäker. Lagets samspel med din matchplan är ${Math.round(currentTrainingFamiliarity())} %. Se över kedjor, special teams och trötta spelare före nedsläpp.`,'Motståndsanalys',{link:'tactics'});
}
function createPlayerConversation(){
  if(pendingManagerDecision())return;
  const t=state.training;
  const candidate=managerRoster().filter(p=>p.pos!=='MV'&&!t.promises.some(v=>samePlayerId(v.playerId,p.id)&&!v.resolved)).sort((a,b)=>(a.happiness||70)-(b.happiness||70)||(t.matchMinutes[a.id]||0)-(t.matchMinutes[b.id]||0)).find(p=>(p.happiness||70)<65||(p.age<=23&&(t.matchMinutes[p.id]||0)<1800));
  if(!candidate)return;
  managerMessage(`talk:${state.round}`,`${candidate.name} vill prata om sin roll`,'Jag vill få mer ansvar. Kan du ge mig minst 15 minuters istid i två av de tre kommande matcherna?','Spelarsamtal',{playerId:candidate.id,decisionType:'minutes'});
}
function answerPlayerConversation(id,answer){
  ensureTrainingData();const t=state.training,m=t.messages.find(x=>x.id===id);
  if(!m||m.resolved||m.decisionType!=='minutes'||!['promise','honest'].includes(answer))return;
  const p=managerRoster().find(p=>samePlayerId(p.id,m.playerId));
  if(!p){m.resolved=true;m.outcome='Spelaren har lämnat klubben.';save();render();return;}
  m.resolved=true;m.read=true;
  if(answer==='promise'){
    t.promises.push({playerId:p.id,name:p.name,startRound:state.round,games:0,qualified:0,resolved:false});
    p.happiness=trainingClamp((p.happiness||70)+5,20,100);
    m.outcome='Du har lovat minst 15 minuter i två av de tre kommande matcherna. Löftet följs upp efter den tredje matchen.';
  }else{p.happiness=trainingClamp((p.happiness||70)-2,20,100);m.outcome='Du har förklarat att konkurrensen avgör laguttagningen. Spelaren är besviken, men du har inte lovat något du inte kan hålla.';}
  save();render();
}
function afterTrainingMatch(){
  ensureTrainingData();const t=state.training,m=state.live;
  if(!t||!m?.finished||t.lastMatchRound===state.round)return;
  t.lastMatchRound=state.round;
  for(const p of managerRoster()){const seconds=m.iceTime?.[p.id]||0;t.matchMinutes[p.id]=(t.matchMinutes[p.id]||0)+seconds;if(p.pos==='MV')p.fatigue=trainingClamp(p.fatigue+seconds/300);}
  for(const promise of t.promises.filter(p=>!p.resolved)){
    const p=managerRoster().find(p=>samePlayerId(p.id,promise.playerId));
    if(!p){promise.resolved=true;promise.result='Spelaren har lämnat klubben';continue;}
    promise.games++;if((m.iceTime?.[p.id]||0)>=900)promise.qualified++;
    if(promise.games>=3){
      const met=promise.qualified>=2;promise.resolved=true;promise.result=met?'Uppfyllt':'Brutet';
      p.happiness=trainingClamp((p.happiness||70)+(met?8:-12),20,100);
      managerMessage(`promise:${p.id}:${promise.startRound}`,`${p.name}: ${met?'löftet är uppfyllt':'ett brutet löfte'}`,`${p.name} fick minst 15 minuter i ${promise.qualified} av tre matcher. ${met?'Spelarens förtroende har stärkts.':'Spelarens trivsel har försämrats efter det brutna löftet.'}`,'Spelarsamtal',{playerId:p.id});
    }
  }
  const signature=trainingSignature();t.familiarity[signature]=trainingClamp((t.familiarity[signature]??20)+3,0,90);t.powerplay=Math.max(20,t.powerplay-3);t.penaltykill=Math.max(20,t.penaltykill-3);
  const used=managerRoster().filter(p=>(m.iceTime?.[p.id]||0)>0).sort((a,b)=>(m.iceTime[b.id]||0)-(m.iceTime[a.id]||0));
  managerMessage(`match:${state.round}`,`${managerClub()} ${m.hv}–${m.opp} ${m.opponent}`,`Skott: ${m.shotsHV}–${m.shotsOpp}. Powerplaymål: ${m.ppGoalsHV}.\n${used.filter(p=>p.pos!=='MV').slice(0,3).map(p=>`${p.name}: ${Math.floor(m.iceTime[p.id]/60)} min, ${Math.round(100-p.fatigue)} % ork kvar.`).join('\n')}\nMatchvana bidrar till utvecklingen för spelare med minst fem minuters istid. Planera återhämtningen innan nästa omgång.`,'Matchrapport',{link:'training'});
  managerRoster().forEach(p=>p.fatigue=Math.max(0,p.fatigue-8));
}
function openManagerMessage(id){
  ensureTrainingData();const message=state.training.messages.find(m=>m.id===id);if(!message)return;
  if(state.live?.running)pauseMatch();message.read=true;state.training.selectedMessage=id;state.page='inbox';save();render();
}
function markManagerInboxRead(){ensureTrainingData();state.training.messages.forEach(m=>{if(!m.decisionType||m.resolved)m.read=true;});save();render();}
function trainingPlayerLink(id){const p=managerRoster().find(p=>samePlayerId(p.id,id));if(p)selectPlayer(p.id);}
function trainingSafe(text){return String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

function trainingPlayerPanel(p){
  ensureTrainingData();const key=trainingTarget(p),fields=p.pos==='MV'?GOALIE_ATTRIBUTES:SKATER_ATTRIBUTES;
  const changes=Object.keys(p.attributes).filter(k=>p.attributes[k]>(p.trainingBaseline[k]||p.attributes[k]));
  return `<div class="individual-training"><div class="training-individual-fields"><label>Individuellt fokus<select onchange="setDevelopmentFocus('${p.id}',this.value)">${focusOptions(p).map(f=>`<option ${p.developmentFocus===f?'selected':''}>${f}</option>`).join('')}</select></label><label>Träningsbelastning<select onchange="setIndividualLoad('${p.id}',this.value)">${[['normal','Följ lagets pass'],['light','Lätt träning'],['rest','Individuell vila']].map(([v,l])=>`<option value="${v}" ${p.trainingLoad===v?'selected':''}>${l}</option>`).join('')}</select></label></div><div class="training-progress-label"><span>Nästa fokus: ${fields[key]}</span><strong>${Math.floor(p.trainingProgress[key]||0)} %</strong></div><progress max="100" value="${p.trainingProgress[key]||0}" aria-label="Utvecklingsarbete inom ${fields[key]}"></progress><p>Framsteg mot nästa attributsteg. Utvecklingstakten beror på ålder, ork och tränarstöd. Individuell vila gäller tills du ändrar den.</p>${changes.length?`<p class="training-growth">Utvecklat sedan uppföljningen började: ${changes.map(k=>`${fields[k]} +${p.attributes[k]-p.trainingBaseline[k]}`).join(', ')}.</p>`:''}</div>`;
}
function trainingAdvice(){
  const t=state.training,roster=managerRoster(),tired=roster.filter(p=>p.fatigue>=60),resting=roster.filter(p=>p.trainingLoad==='rest');
  if(tired.length)return `${tired.length} spelare har under 40 % ork. Överväg återhämtning för laget eller individuell vila. Hårda pass på en sliten trupp ger sämre utveckling.`;
  if(resting.length)return `${resting.length} spelare har individuell vila. De återhämtar sig men deltar inte i attributträningen. Ändra belastningen när de är redo.`;
  if(currentTrainingFamiliarity()<40)return 'Matchplanen är fortfarande ovan för laget. Taktiskt samspel eller matchförberedelse hjälper spelarna att bli tryggare i den.';
  return 'Truppen har utrymme att utvecklas. Varva individuellt arbete med lättare pass inför match och ge talangerna riktig istid.';
}
function trainingView(){
  ensureTrainingData();const t=state.training;
  const roster=managerRoster(),filtered=roster.filter(p=>trainingPosition==='all'||(trainingPosition==='skater'?p.pos!=='MV':p.pos==='MV'));
  const condition=Math.round(roster.reduce((n,p)=>n+100-p.fatigue,0)/roster.length);
  const locked=t.lockedRound===state.round||opponent()==='Ingen match';
  return `<section class="training-page"><header class="daily-heading"><div><span class="career-eyebrow">TRÄNARVARDAG · OMGÅNG ${state.round}</span><h1>Arbetet bakom laget.</h1><p>${opponent()==='Ingen match'?'Grundserien är avslutad.':`Tre träningsdagar inför ${opponent()}. Planera belastningen och utveckla din spelidé.`}</p></div><button class="btn secondary" onclick="trainingOpen('inbox')">Öppna inkorgen</button></header>
  <div class="training-metrics"><div><span>GENOMSNITTLIG ORK</span><strong>${condition}<small>%</small></strong><p>${roster.filter(p=>p.fatigue>=60).length} spelare behöver extra återhämtning</p></div><div><span>SAMSPEL MED MATCHPLANEN</span><strong>${Math.round(currentTrainingFamiliarity())}<small>%</small></strong><p>Taktik och matchvana bygger trygghet</p></div><div><span>SPECIAL TEAMS · FÖRBEREDELSE</span><strong>${Math.round(t.powerplay)}<small> PP / </small>${Math.round(t.penaltykill)}<small> PK</small></strong><p>Skala 0–100 · påverkar special teams</p></div></div>
  <div class="training-layout"><div><section class="training-planner"><div class="daily-section-heading"><div><span class="career-eyebrow">INFÖR NÄSTA MATCH</span><h2>Din träningsplan</h2></div><span>${t.day}/3 pass klara</span></div><div class="training-presets">${Object.entries(TRAINING_PRESETS).map(([id,p])=>`<button ${locked||t.day===3?'disabled':''} onclick="applyTrainingPreset('${id}')">${p.name}</button>`).join('')}</div><div class="training-days">${t.plan.map((session,i)=>{const done=i<t.day,log=t.logs.find(l=>l.day===i+1);return `<article class="training-day ${i===t.day?'current':''} ${done?'completed':''}"><header><span>DAG 0${i+1}</span><b>${log?'✓ GENOMFÖRT':done?'EJ GENOMFÖRT':i===t.day?'NÄSTA PASS':'PLANERAT'}</b></header><label>Innehåll<select ${done||locked?'disabled':''} onchange="setTrainingSession(${i},'type',this.value)">${Object.entries(TRAINING_SESSIONS).map(([id,s])=>`<option value="${id}" ${id===session.type?'selected':''}>${s.name}</option>`).join('')}</select></label><p>${TRAINING_SESSIONS[session.type].description}</p><label>Intensitet<select ${done||locked||session.type==='recovery'||session.type==='matchprep'?'disabled':''} onchange="setTrainingSession(${i},'intensity',this.value)">${[['light','Lätt'],['normal','Normal'],['hard','Hård']].map(([id,label])=>`<option value="${id}" ${(session.type==='recovery'||session.type==='matchprep'?'light':session.intensity)===id?'selected':''}>${label}</option>`).join('')}</select></label>${log?`<div class="session-result">Ork ${Math.round(100-log.before)} → ${Math.round(100-log.after)} %</div>`:''}</article>`;}).join('')}</div><div class="training-plan-actions"><button class="btn" onclick="managerContinue()">${t.day<3&&!locked?'Genomför nästa pass →':'Till nästa händelse →'}</button><button class="btn secondary" ${t.day>=3||locked?'disabled':''} onclick="executeTrainingPeriod()">Låt tränarteamet sköta återstående pass</button></div><p class="training-note">Planen upprepas nästa omgång. Genomförda pass kan inte ändras. Går du direkt till match uteblir återstående träning.</p></section>
  <section class="training-individuals"><div class="daily-section-heading"><div><span class="career-eyebrow">INDIVIDEN I LAGET</span><h2>Utveckling & belastning</h2></div><label>Visa<select onchange="trainingPosition=this.value;render()"><option value="all" ${trainingPosition==='all'?'selected':''}>Hela truppen</option><option value="skater" ${trainingPosition==='skater'?'selected':''}>Utespelare</option><option value="goalie" ${trainingPosition==='goalie'?'selected':''}>Målvakter</option></select></label></div><p class="training-note">Individuell vila gäller tills du ändrar den. Lätt träning begränsar belastningen även om laget tränar hårt.</p><div class="individual-training-list">${filtered.map(p=>`<article class="training-player-row"><div class="training-player-title"><button onclick="trainingPlayerLink('${p.id}')"><strong>${p.name}</strong><span>${p.pos} · ${p.age} år</span></button><span class="player-readiness ${p.fatigue>=60?'tired':''}">${Math.round(100-p.fatigue)} % ork</span></div>${trainingPlayerPanel(p)}</article>`).join('')}</div></section></div>
  <aside class="training-sidebar"><section class="training-coach-note"><span class="career-eyebrow">ASSISTERANDE TRÄNAREN</span><h2>Min rekommendation</h2><p>${trainingAdvice()}</p><div class="row"><span>Isträning</span><strong>${state.staff.find(s=>s.id==='assistant')?.coaching||14}/20</strong></div><div class="row"><span>Målvaktsträning</span><strong>${state.staff.find(s=>s.id==='goalie')?.coaching||16}/20</strong></div></section><section class="training-promises"><span class="career-eyebrow">DITT ORD SPELAR ROLL</span><h2>Löften till spelarna</h2>${t.promises.filter(p=>!p.resolved).length?t.promises.filter(p=>!p.resolved).map(p=>`<article><strong>${p.name}</strong><p>${p.qualified}/2 matcher med minst 15 minuter. ${3-p.games} matcher kvar.</p></article>`).join(''):'<p>Inga aktiva löften. Spelare tar upp sin roll när de behöver mer förtroende.</p>'}</section><section class="training-history"><h2>Senaste passen</h2>${t.history.length?t.history.slice(0,6).map(l=>`<div><span>Omgång ${l.round} · dag ${l.day}</span><strong>${TRAINING_SESSIONS[l.type].name}</strong><p>Ork ${Math.round(100-l.before)} → ${Math.round(100-l.after)} %</p></div>`).join(''):'<p>Rapporterna visas när träningen har börjat.</p>'}</section></aside></div></section>`;
}
function inboxView(){
  ensureTrainingData();const t=state.training,selected=t.messages.find(m=>m.id===t.selectedMessage)||t.messages[0];
  const unread=t.messages.filter(m=>!m.read).length;
  return `<section class="manager-inbox"><header class="daily-heading"><div><span class="career-eyebrow">KLUBBKONTORET</span><h1>Din inkorg.</h1><p>${unread} olästa meddelanden · rapporter, samtal och nästa beslut.</p></div><button class="btn secondary" onclick="markManagerInboxRead()">Markera rapporter som lästa</button></header><div class="inbox-layout"><nav class="inbox-list" aria-label="Meddelanden">${t.messages.map(m=>`<button class="inbox-item ${m.id===selected?.id?'selected':''} ${m.read?'':'unread'}" onclick="openManagerMessage(${m.id})"><span>${m.category}<small>OMG ${m.round}</small></span><strong>${trainingSafe(m.title)}</strong><p>${m.decisionType&&!m.resolved?'Ditt svar behövs':m.read?'Läst':'Oläst'}</p></button>`).join('')}</nav><article class="inbox-letter">${selected?`<header><span class="career-eyebrow">${selected.category} · OMGÅNG ${selected.round}</span><h2>${trainingSafe(selected.title)}</h2></header><div class="message-body">${trainingSafe(selected.body).split('\n').map(line=>`<p>${line}</p>`).join('')}</div>${selected.decisionType==='minutes'&&!selected.resolved?`<section class="manager-decision"><h3>Vad svarar du?</h3><button class="btn" onclick="answerPlayerConversation(${selected.id},'promise')">Jag lovar dig mer istid</button><p>Minst 15 minuter i två av de tre kommande matcherna.</p><button class="btn secondary" onclick="answerPlayerConversation(${selected.id},'honest')">Jag kan inte lova en större roll</button></section>`:''}${selected.outcome?`<div class="manager-outcome">${trainingSafe(selected.outcome)}</div>`:''}<footer>${selected.link?`<button class="btn secondary" onclick="trainingOpen('${selected.link}')">${({training:'Till träningsplanen',board:'Till styrelsen',tactics:'Till matchplanen',scouting:'Till scouting',transfers:'Till transfers',news:'Till klubbnyheterna',season:'Till säsongsöversikten'})[selected.link]||'Öppna'}</button>`:''}${selected.playerId!==undefined?`<button class="btn secondary" onclick="trainingPlayerLink('${selected.playerId}')">Öppna spelarprofil</button>`:''}<button class="btn" onclick="managerContinue()">Fortsätt till nästa händelse →</button></footer>`:'<h2>Inkorgen är tom</h2>'}</article></div></section>`;
}
function dailyOverview(){
  ensureTrainingData();const t=state.training;if(!t)return '';
  const unread=t.messages.filter(m=>!m.read).length,pending=pendingManagerDecision();
  return `<section class="daily-overview"><div><span class="career-eyebrow">NÄSTA PÅ DITT BORD</span><h2>${opponent()==='Ingen match'?'Dags att utvärdera grundserien':pending?'Ett spelarsamtal väntar':t.day<3?`Dag ${t.day+1}: ${TRAINING_SESSIONS[t.plan[t.day].type].name}`:'Laget är framme vid matchdag'}</h2><p>${unread} olästa meddelanden · ${t.day}/3 pass klara · samspel ${Math.round(currentTrainingFamiliarity())} %</p></div><div><button class="btn secondary" onclick="trainingOpen('training')">Planera träningen</button><button class="btn" onclick="trainingOpen('inbox')">Inkorg${unread?` (${unread})`:''} →</button></div></section>`;
}
