"use strict";

// Match controls live here; the rink remains the same simulation and renderer.
const matchDesk={tab:'feedback',target:'team',notice:'',details:false,events:false,pauseSettings:false,match:null};
const MATCH_MESSAGES={
 support:['Jag tror på er','Ge trygghet, särskilt till spelare som känner press.'],
 demand:['Höj nivån','Utmana laget. Kan sporra ambitiösa spelare men öka pressen.'],
 calm:['Behåll lugnet','Sänk stressen. Passar när matchen står och väger.'],
 praise:['Bra jobbat','Bekräfta en bra matchbild. Omotiverat beröm kan slå fel.'],
 reset:['Släpp misstaget','Hjälp spelarna vidare efter ett baklängesmål.'],
 focus:['Nästa byte','Samla koncentrationen kring nästa uppgift.'],
 discipline:['Håll er ur utvisningsbåset','Påminn om disciplin efter en utvisning.'],
 compete:['Vinn nästa duell','Utmana arbetsviljan. Slitna spelare kan känna sig överkörda.'],
 patient:['Ha tålamod med pucken','Ge trygghet att fatta nästa beslut utan att forcera.'],
 responsibility:['Kliv fram och led','Ansvar kan stärka ledare men pressa osäkra spelare.'],
 simplify:['Gör det enkla','Tydliga ramar hjälper slitna eller osäkra spelare.'],
 freedom:['Våga skapa själv','Ge spelskickliga spelare frihet; alla trivs inte utan ramar.'],
 protect:['Ta ansvar hemåt','Bekräfta det defensiva jobbet när ni leder.']
};
const MATCH_PLANS={
 control:{label:'Ta kontroll',note:'Balanserat spel, lugn puckbehandling och normal belastning.',tactic:'balanced',attackStyle:'control',forecheck:'balanced',tempo:'normal'},
 pressure:{label:'Jaga mål',note:'Offensiv, hög press och högt tempo. Kostar ork och lämnar ytor.',tactic:'attack',attackStyle:'pressure',forecheck:'aggressive',tempo:'high'},
 counter:{label:'Ställ om',note:'Avvakta med pressen och sök snabba kontringar vid puckvinst.',tactic:'balanced',attackStyle:'counter',forecheck:'passive',tempo:'high'},
 protect:{label:'Skydda ledningen',note:'Defensivt, låg press och lågt tempo. Färre egna anfall.',tactic:'defense',attackStyle:'counter',forecheck:'passive',tempo:'low'}
};
function matchFocus(id){document.getElementById(id)?.focus?.({preventScroll:true});}
function matchPause(){if(state.live?.running)pauseMatch('Du gör ett tränarbeslut.');}
function matchTab(tab){if(!['feedback','tactics','changes','lineup','stats','players','events'].includes(tab))return;matchDesk.tab=tab;matchDesk.notice='';if(!['stats','players','events'].includes(tab)||matchPreferences().stats)matchPause();render();matchFocus('match-tab-'+tab);}
function matchPlay(){const m=state.live;if(!m||m.finished)return;matchDesk.notice='';if(m.running)pauseMatch();else startMatch();matchFocus('match-play');}
function matchNotice(text){matchDesk.notice=text;save();render();}
function matchPlan(key){
 const plan=MATCH_PLANS[key];if(!plan||state.live?.finished)return;matchPause();
 const before=tacticalReviewPlan();
 state.tactic=plan.tactic;for(const field of ['attackStyle','forecheck','tempo'])state.tacticalPlan[field]=plan[field];
 if(state.live)addEvent(`Matchplan: ${plan.label}. ${plan.note}`,'strategy');
 tacticalReviewRecord(before,plan.label);
 matchNotice(plan.label+' vald. Fysisk nivå och kedjeanvändning behåller dina val.');matchFocus('match-plan-'+key);
}
function matchOrder(key,value){
 if(state.live?.finished)return;
 const choices={shiftLength:['short','normal','long'],shotChoice:['patient','balanced','shoot'],tactic:['attack','balanced','defense'],attackStyle:Object.keys(HOCKEY_STYLES),forecheck:['passive','balanced','aggressive'],tempo:['low','normal','high'],physicality:['safe','balanced','hard'],lineUsage:['rollFour','balanced','topHeavy']};
 if(!choices[key]?.includes(value))return;matchPause();const before=tacticalReviewPlan();
 if(['shiftLength','shotChoice'].includes(key)){state.tacticalPlan[key]=value;addEvent(`Lagorder: ${key==='shiftLength'?'byteslängd':'avslutsval'} justerad.`,'strategy');}
 else if(key==='tactic')setTactic(value);else if(key==='attackStyle')hockeySetStyle(value);else setTacticalSetting(key,value);
 tacticalReviewRecord(before,'Lagorder');
 matchNotice('Lagordern är uppdaterad. Fortsätt matchen när du är klar.');matchFocus('match-order-'+key);
}
function matchFeedbackPlayers(target=matchDesk.target){
 const skaters=socialMatchPlayers().filter(p=>p.pos!=='MV');
 if(target==='team')return skaters;
 if(target==='ice'){const ids=[...currentLinePlayers(),...currentDefensePlayers()].map(p=>String(p.id));return skaters.filter(p=>ids.includes(String(p.id)));}
 if(target.startsWith('player:'))return skaters.filter(p=>samePlayerId(p.id,target.slice(7)));
 return [];
}
function matchFeedbackWait(){const m=state.live;return Math.max(0,(m?.benchFeedback?.nextAt||0)-(m?analysisClock():0));}
function matchFeedbackReaction(kind,p){return socialFeedbackReaction(kind,p);}
function matchFeedback(kind){
 const m=state.live;if(!m||m.finished||!MATCH_MESSAGES[kind]||matchFeedbackWait()>0||(!m.socialStarted?.[socialTalkSlot()]&&m.minute===0&&m.second===0))return;
 const players=matchFeedbackPlayers();if(!players.length)return;matchPause();ensureLocker();
 const previous=m.benchFeedback?.history||[],scale=Math.max(.4,1-previous.slice(0,3).filter(x=>x.kind===kind).length*.2);
 const report={kind,time:analysisClock(),slot:socialTalkSlot(),target:matchDesk.target==='team'?'Alla utespelare':matchDesk.target==='ice'?'Femman på isen':players[0].name,
 reactions:players.map(p=>{const [effect,reason]=matchFeedbackReaction(kind,p);return {id:p.id,name:p.name,effect:effect*scale,reason,...socialApplyFeedback(p,effect*scale)};})};
 m.benchFeedback={nextAt:report.time+180,history:[report,...previous].slice(0,16)};
 addEvent(`Från bänken till ${report.target}: ”${MATCH_MESSAGES[kind][0]}”.`,'strategy');
 matchNotice('Budskapet är framfört. Se spelarnas reaktioner nedan.');matchFocus('match-feedback-report');
}
function matchFeedbackBonus(players){
 const m=state.live,report=m?.benchFeedback?.history?.[0];
 if(!report||m.finished||report.slot!==socialTalkSlot()||analysisClock()>=report.time+120||!players.length)return 0;
 return players.reduce((sum,p)=>sum+(report.reactions.find(r=>samePlayerId(r.id,p.id))?.effect||0),0)/players.length;
}
function matchTarget(value){if(value!=='team'&&value!=='ice'&&!matchFeedbackPlayers(value).length)return;matchPause();matchDesk.target=value;render();matchFocus('match-feedback-target');}
function matchAction(action){
 const m=state.live;if(!m||m.finished||!['timeout','goalie'].includes(action))return;matchPause();
 if(action==='timeout'){if(m.timeoutUsed)return;useTimeout();matchNotice('Timeout tagen. Ge laget ett budskap eller justera matchplanen.');}
 else {if(!hockeyAllowChange())return;toggleGoalie();if(studioActive()){matchNotice('Målvaktsändringen genomförs vid avblåsning.');return;}matchNotice(m.goaliePulled?'Målvakten är uttagen. Ni spelar med extra utespelare.':'Målvakten är tillbaka i målet.');}
 matchFocus('match-action-'+action);
}
function matchUnit(kind,index){
 const m=state.live;if(!m||m.finished||!Number.isInteger(index))return;
 if(!['forwards','defense','special'].includes(kind)||index<0||index>=(kind==='forwards'?4:kind==='defense'?3:2))return;
 if((kind==='special')!==Boolean(specialUnitOnIce()))return;
 matchPause();if(!hockeyAllowChange())return;
 if(studioActive()){studioQueueUnit(kind,index);return;}
 if(kind==='forwards')m.currentLine=index;else if(kind==='defense')m.currentDefensePair=index;else m.rotationIndex=(Math.floor((m.rotationIndex||0)/2)*2)+index;
 m.shiftSeconds=0;addEvent(`Coach skickar in ${kind==='forwards'?'kedja':kind==='defense'?'backpar':'special teams-enhet'} ${index+1}.`,'strategy');
 matchNotice('Bytet är klart. Rinken visar den nya uppställningen.');matchFocus('match-unit-'+kind+'-'+index);
}
function matchReplace(kind,index,id){
 if(!state.live||state.live.finished)return;matchPause();if(!hockeyAllowChange())return;
 if(kind==='goalie')changeGoalie(id);else if(['forwards','defense'].includes(kind))changeLinePlayer(kind,index,id);else if(['pp1','pp2','pk1','pk2'].includes(kind))changeSpecialPlayer(kind,index,id);else return;
 matchNotice('Laguppställningen är uppdaterad.');matchFocus('match-player-'+kind+'-'+index);
}
function matchMore(key,open){if(['details','events'].includes(key))matchDesk[key]=open;}
function matchStats(){
 const m=state.live,shots=m.analysis?.shots||[],keepers=Object.values(m.leagueBox?.players||{}).filter(p=>p.pos==='MV'),count=(side,fn)=>shots.filter(s=>s.side===side&&fn(s)).length;
 const onGoal=s=>['goal','save','rebound'].includes(s.outcome),save=s=>['save','rebound'].includes(s.outcome);
 return {shots:[count('own',onGoal),count('opponent',onGoal)],saves:keepers.length&&!m.leagueBox.partial?[managerClub(),m.opponent].map(club=>keepers.filter(p=>p.club===club).reduce((sum,p)=>sum+p.saves,0)):[count('opponent',save),count('own',save)],
 danger:[m.chancesHV,m.chancesOpp],possession:m.rink?.possession?.own+m.rink?.possession?.opponent>0?[m.possessionHV,100-m.possessionHV]:['—','—'],
 faceoffs:[m.faceoffsHV,m.faceoffsOpp],pp:[`${m.ppGoalsHV}/${m.ppHV}`,`${m.ppGoalsOpp}/${m.ppOpp}`]};
}
function matchShiftLength(){return ({short:30,normal:45,long:60})[state.tacticalPlan?.shiftLength]||45;}
function matchScoringView(){
 const goals=(state.live.analysis?.events||[]).filter(e=>e.type==='goal');
 return `<section class="mc-scorers" aria-label="Målskyttar och assist">${goals.map(e=>`<span title="${!e.scorer?'Äldre mål: assistuppgift saknas':e.assists?.length?'Assist: '+e.assists.map(p=>trainingSafe(p.name)).join(', '):'Utan assist'}"><time>${e.period?'P'+e.period+' '+e.clock:analysisTime(e.time)}</time> <b>${e.own??''}–${e.against??''} ${trainingSafe(e.scorer||e.text)}</b>${e.assists?.length?' ('+e.assists.map(p=>trainingSafe(p.name)).join(', ')+')':''}</span>`).join(' · ')||'<span>Inga mål ännu</span>'}${state.live.analysisShootout?'<span title="Avgörandet räknas inte som ett spelarmål"> · Straffavgörande</span>':''}</section>`;
}

function matchStatCard(label,values,suffix=''){return `<div class="mc-stat"><span>${label}</span><strong><b>${values[0]}${suffix}</b><i>–</i><b>${values[1]}${suffix}</b></strong></div>`;}
function matchOrdersView(){
 const select=(key,label,options,note)=>`<label class="mc-order" for="match-order-${key}"><span>${label}<small>${note}</small></span><select id="match-order-${key}" onchange="matchOrder('${key}',this.value)">${options.map(([value,text])=>`<option value="${value}" ${(key==='tactic'?state.tactic:state.tacticalPlan[key]||(key==='shiftLength'?'normal':key==='shotChoice'?'balanced':''))===value?'selected':''}>${text}</option>`).join('')}</select></label>`;
 return `<div class="mc-presets">${Object.entries(MATCH_PLANS).map(([key,p])=>`<button id="match-plan-${key}" class="mc-choice" onclick="matchPlan('${key}')" title="${p.note}"><b>${p.label}</b><small>${p.note}</small></button>`).join('')}</div><div class="mc-orders">
<fieldset class="mc-order-group"><legend>Spelidé</legend>
 ${select('tactic','Mentalitet',[['attack','Offensiv'],['balanced','Balanserad'],['defense','Defensiv']],'Balansen mellan anfall och försvar.')}
 ${select('attackStyle','Spelidé',Object.entries(HOCKEY_STYLES),'Ställer även in forecheck. Finjustera nedan.')}</fieldset>
<fieldset class="mc-order-group"><legend>Med puck</legend>
 ${select('tempo','Speltempo',[['low','Lågt'],['normal','Normalt'],['high','Högt']],'Högre tempo ger tryck och trötthet.')}
 ${select('shotChoice','Avslutsval',[['patient','Sök ett bättre läge'],['balanced','Läs situationen'],['shoot','Skjut oftare']],'Fler skott kan ge returer men avslutar uppbyggnaden tidigare.')}</fieldset>
<fieldset class="mc-order-group"><legend>Utan puck</legend>
 ${select('forecheck','Forecheck',[['passive','Avvaktande'],['balanced','Balanserad'],['aggressive','Aggressiv']],'Hög press kostar mer ork.')}
 ${select('physicality','Fysisk nivå',[['safe','Disciplinerat'],['balanced','Balanserat'],['hard','Hårt']],'Hårt spel ökar utvisningsrisken.')}</fieldset>
<fieldset class="mc-order-group"><legend>Matchning & byten</legend>
 ${select('lineUsage','Kedjeanvändning',[['rollFour','Rulla fyra'],['balanced','Balanserad'],['topHeavy','Toppa laget']],'Toppning ger nyckelspelarna fler byten.')}
 ${select('shiftLength','Byteslängd',[['short','30 sek · korta byten'],['normal','45 sek · normalt'],['long','60 sek · långa byten']],'Korta byten håller energin uppe; långa byten belastar samma femma längre.')}</fieldset></div>${tacticalReviewView(tacticalReviewSnapshot())}`;
}
function matchFeedbackChoices(extra,wait){return Object.entries(MATCH_MESSAGES).filter((_,i)=>extra?i>=6:i<6).map(([key,[label,note]])=>`<button class="mc-choice" onclick="matchFeedback('${key}')" ${wait?'disabled':''}><b>${label}</b><small>${note}</small></button>`).join('');}
function matchFeedbackView(){
 const m=state.live,report=m.benchFeedback?.history?.[0],wait=matchFeedbackWait();
 if(m.finished||(!m.socialStarted?.[socialTalkSlot()]&&m.minute===0&&m.second===0))return matchEvidenceView()+teamTalkPanel();
 if(!matchFeedbackPlayers().length)matchDesk.target='team';
 return `${matchEvidenceView()}${m.finished?'':`<h3>Din röst från bänken</h3><p class="mc-note">Rikta ett kort budskap till laget, femman eller en spelare.</p><label class="mc-target" for="match-feedback-target">Vem vill du nå?<select id="match-feedback-target" onchange="matchTarget(this.value)">${[['team','Alla utespelare'],['ice','Femman på isen'],...socialMatchPlayers().filter(p=>p.pos!=='MV').map(p=>['player:'+p.id,p.name])].map(([v,label])=>`<option value="${v}" ${matchDesk.target===v?'selected':''}>${trainingSafe(label)}</option>`).join('')}</select></label><div class="mc-messages">${matchFeedbackChoices(false,wait)}</div><details class="mc-extra-feedback"><summary>Fler budskap · speluppgifter och ansvar</summary><div class="mc-messages">${matchFeedbackChoices(true,wait)}</div></details><p class="mc-note">${wait?`Låt budskapet landa. Nästa rop om ${analysisTime(wait)} matchtid.`:'Ett rop var tredje matchminut. Reaktionen varar i två minuter, längst till periodslut. Upprepning minskar effekten. Moral och förtroende påverkas försiktigt och sparas.'}</p>`}
 ${report?`<div class="mc-response" id="match-feedback-report" tabindex="-1"><strong>${trainingSafe(MATCH_MESSAGES[report.kind]?.[0]||'Budskap')} · ${trainingSafe(report.target)}</strong><span>${report.slot===socialTalkSlot()&&analysisClock()<report.time+120&&!m.finished?'Aktivt budskap':'Budskapet har klingat av'} · ${report.reactions.filter(r=>r.effect>0).length} positiva · ${report.reactions.filter(r=>r.effect<0).length} negativa · ${report.reactions.filter(r=>r.effect===0).length} neutrala</span><details><summary>Spelarnas reaktioner</summary>${report.reactions.map(r=>`<p><b>${trainingSafe(r.name)}</b><span>${trainingSafe(r.reason)}${r.morale?` · moral ${r.morale>0?'+':''}${r.morale}`:''}</span></p>`).join('')}</details></div>`:''}`;
}
function matchChangesView(){
 const m=state.live,special=specialUnitOnIce(),blocked=hockeyChangeBlocked(),skaters=managerRoster().filter(p=>p.pos!=='MV'&&medicalAvailable(p));
 const select=(kind,index,id,pool,label)=>`<label class="mc-player-pick">${label}<select id="match-player-${kind}-${index}" onchange="matchReplace('${kind}',${index},this.value)" ${blocked?'disabled':''}>${lineOptions(pool,id)}</select></label>`;
 const unit=(kind,i,ids,current)=>{const ps=ids.map(playerById).filter(Boolean);return `<button id="match-unit-${kind}-${i}" class="mc-unit ${current?'active':''}" aria-pressed="${current}" onclick="matchUnit('${kind}',${i})" ${blocked?'disabled':''}><b>${kind==='forwards'?'Kedja':kind==='defense'?'Backpar':'Enhet'} ${i+1}${current?(studioActive()?' · vald':' · på isen'):''}</b><span>${ps.map(p=>trainingSafe(p.name.split(' ').at(-1))).join(' · ')}</span><small>Energi ${ps.length?Math.round(ps.reduce((n,p)=>n+matchEnergy(p),0)/ps.length):0}% · belastning ${ps.length?Math.round(ps.reduce((n,p)=>n+p.fatigue,0)/ps.length):0}%<progress max="100" value="${ps.length?ps.reduce((n,p)=>n+matchEnergy(p),0)/ps.length:0}" aria-label="Formationens matchenergi"></progress></small></button>`;};
 const key=(Math.min(2,m.penaltiesOpp.length)>Math.min(2,m.penaltiesHV.length)?'pp':'pk')+((m.rotationIndex||0)%2+1);
 return `${blocked?'<p class="mc-warning" role="status">Icing: laget får inte byta före nedsläpp.</p>':''}<h3>${special?'Special teams':'Skicka in nästa formation'}</h3><p class="mc-note">Energi återhämtas under faktisk bänktid. Belastningen följer med efter matchen. Rotation tar över efter nästa byte.</p>${special?`<div class="mc-units">${[0,1].map(i=>unit('special',i,state.specialTeams[key.slice(0,2)+(i+1)],i===(m.rotationIndex||0)%2)).join('')}</div>`:`<div class="mc-units">${[0,1,2,3].map(i=>unit('forwards',i,state.lines.forwards.slice(i*3,i*3+3),i===m.currentLine)).join('')}</div><div class="mc-units mc-pairs">${[0,1,2].map(i=>unit('defense',i,state.lines.defense.slice(i*2,i*2+2),i===m.currentDefensePair)).join('')}</div>`}
 <h3>Ändra spelare i vald formation</h3><div class="mc-player-picks">${special?state.specialTeams[key].map((id,i)=>select(key,i,id,skaters,`${key.toUpperCase()} · plats ${i+1}`)).join(''):state.lines.forwards.slice(m.currentLine*3,m.currentLine*3+3).map((id,i)=>select('forwards',m.currentLine*3+i,id,skaters,['Vänsterforward','Center','Högerforward'][i])).join('')+state.lines.defense.slice(m.currentDefensePair*2,m.currentDefensePair*2+2).map((id,i)=>select('defense',m.currentDefensePair*2+i,id,skaters,`Back ${i+1}`)).join('')}
 ${select('goalie',0,state.lines.goalie,goalies().filter(medicalAvailable),'Målvakt')}</div><div class="mc-bench-actions"><button id="match-action-timeout" class="btn secondary" onclick="matchAction('timeout')" ${m.timeoutUsed?'disabled':''}>${m.timeoutUsed?'Timeout använd':'Ta timeout'}</button><button id="match-action-goalie" class="btn secondary" onclick="matchAction('goalie')" ${blocked?'disabled':''}>${m.goaliePulled?'Sätt in målvakten':'Ta ut målvakten'}</button></div><p class="mc-note">${m.goaliePulled?'Tomt mål: extra utespelare på isen.':'Timeout ger återhämtning. Uttagen målvakt ger en extra utespelare men lämnar målet tomt.'}</p><button class="mc-text-button" onclick="matchTab('lineup')">Öppna hela laguttagningen →</button>`;
}
function matchCoachView(){
 const m=state.live;
 return `<aside class="mc-coach" aria-label="Coachbänken"><header><span class="career-eyebrow">COACHBÄNKEN</span><h2>${m.finished?'Samla laget':'Ditt nästa beslut'}</h2><p>${m.finished?'Matchen är slut. Summera insatsen med spelarna.':m.running?'Statistik, istid och logg kan följas under spel. Tränarbeslut pausar matchen.':medicalPending()?medicalPending().name+' kan inte fortsätta. Hantera spelarbeskedet innan matchen startas.':trainingSafe(m.pauseReason||'Matchen är pausad.')+' Gör dina ändringar och tryck Fortsätt.'}</p></header>${m.finished?'':`<nav class="mc-tabs" aria-label="Coachval">${[['feedback','Feedback'],['tactics','Taktik'],['changes','Byten'],['lineup','Kedjor'],['stats','Statistik'],['players','Istid'],['events','Logg']].map(([key,label])=>`<button id="match-tab-${key}" onclick="matchTab('${key}')" aria-pressed="${matchDesk.tab===key}">${label}</button>`).join('')}</nav>`}<div class="mc-coach-content">${matchDesk.notice?`<p class="mc-response" role="status">${trainingSafe(matchDesk.notice)}</p>`:''}${m.running&&!matchReadOnlyTab()?`<div class="mc-follow">${matchEvidenceView()}<span>FÖLJ MATCHEN</span><h3>${HOCKEY_STYLES[hockeyStyle('own')]}</h3><p>${({attack:'Offensiv',balanced:'Balanserad',defense:'Defensiv'})[state.tactic]} · ${({low:'Lågt',normal:'Normalt',high:'Högt'})[state.tacticalPlan.tempo]} speltempo</p><p>Spelarna följer dina order. Öppna Feedback, Taktik eller Byten när du vill ingripa.</p>${m.benchFeedback?.history?.[0]?`<p>Senaste rop: ${trainingSafe(MATCH_MESSAGES[m.benchFeedback.history[0].kind]?.[0]||'Budskap')}</p>`:''}</div>`:m.finished||matchDesk.tab==='feedback'?matchFeedbackView():matchDesk.tab==='tactics'?matchOrdersView():matchDesk.tab==='stats'?matchDetailedStats():matchDesk.tab==='players'?matchPlayersView():matchDesk.tab==='events'?`<div class="mc-events">${m.events.map(e=>`<p>${trainingSafe(e.text)}</p>`).join('')}</div>`:matchDesk.tab==='lineup'?lineupBoardView():matchChangesView()}${!m.finished&&['changes','lineup'].includes(matchDesk.tab)?tacticalReviewView(tacticalReviewSnapshot()):''}</div></aside>`;
}
function matchDetailedStats(){
 const m=state.live,s=matchStats(),counts=m.rink?.hockey?.counts;
 const rows=[['Skott på mål',...s.shots],['Alla skottförsök',...['own','opponent'].map(side=>(m.analysis?.shots||[]).filter(s=>s.side===side).length)],['Räddningar',...s.saves],['Farliga chanser',...s.danger],['Vunna tekningar',...s.faceoffs],['Tacklingar',m.hitsHV,m.hitsOpp],['PP-mål / tillfällen',...s.pp],['Lyckade passningar',m.rink?.passes.own||0,m.rink?.passes.opponent||0],...['offside','icing'].map(k=>[k==='offside'?'Offside':'Icing',counts?.[k].own||0,counts?.[k].opponent||0])];
 if(studioActive()){
  const stats=studioEngine().stats;
  rows.splice(8,0,['Passningsprocent',...stats.map(t=>t.passAttempts?Math.round((t.passes-(t.priorPasses||0))/t.passAttempts*100)+' %':'—')],['Vunna puckdueller',...stats.map(t=>`${t.battleWins||0} / ${t.battles||0}`)],['Blockerade skott',...stats.map(t=>t.blocks||0)],['Direktskott',...stats.map(t=>t.oneTimers||0)],['Farliga returer släppta',...stats.map(t=>t.dangerousRebounds||0)]);
 }
 return `<div class="mc-table-scroll"><table><caption>Båda lagens matchstatistik</caption><thead><tr><th scope="col">Statistik</th><th scope="col">${trainingSafe(managerClub())}</th><th scope="col">${trainingSafe(m.opponent)}</th></tr></thead><tbody>${rows.map(([label,a,b])=>`<tr><th scope="row">${label}</th><td>${a}</td><td>${b}</td></tr>`).join('')}</tbody></table></div>${studioActive()&&studioEngine().partialRealism?`<p class="mc-note">Passningsprocent, puckdueller och returstatistik har registrerats sedan ${analysisTime(studioEngine().realismStartedAt||0)} spelad matchtid.</p>`:''}${m.analysis?.partial?'<p class="mc-note">Skott på mål och räddningar gäller den registrerade delen av denna äldre match.</p>':''}`;
}
function matchPlayersView(){
 const m=state.live,rows=Object.values(m.leagueBox?.players||{}).filter(p=>p.seconds>0).sort((a,b)=>b.seconds-a.seconds);
 return `<div class="mc-table-scroll"><table><caption>Spelare · båda lagen · denna match</caption><thead><tr><th>Spelare</th><th>Lag</th><th>Istid</th><th>Mål</th><th>Assist</th><th>Skott</th><th>Räddningar</th></tr></thead><tbody>${rows.map(p=>`<tr><th scope="row">${trainingSafe(p.name)} <small>${p.pos}</small></th><td>${trainingSafe(p.club)}</td><td>${analysisTime(p.seconds)}</td><td>${p.goals}</td><td>${p.assists}</td><td>${p.shots}</td><td>${p.pos==='MV'?p.saves:'—'}</td></tr>`).join('')||'<tr><td colspan="7">Registreras från nedsläpp.</td></tr>'}</tbody></table></div>`;
}
function matchCentreView(){
 const m=state.live;if(!m)return `<section class="mc-prematch"><span class="career-eyebrow">NÄSTA MATCH</span><h1>${trainingSafe(managerClub())} <span>–</span> ${trainingSafe(opponent())}</h1><p>Förbered matchplanen. Före nedsläpp kan du prata med laget och välja formationer.</p><button class="btn" onclick="matchDesk.notice='';createMatch()">Till matchen →</button><h2>Matchplan</h2><p class="workspace-note">Välj en startplan eller justera lagorder. Ändringar gäller lagets matchplan och sparas direkt.</p>${matchOrdersView()}</section>`;
 if(matchDesk.match!==m){matchDesk.match=m;matchDesk.notice='';matchDesk.tab='feedback';matchDesk.target='team';}
 ensureRink();const s=matchStats(),own=careerIdentity(managerClub()),opp=careerIdentity(m.opponent),skaters=side=>m.rink.actors.filter(a=>a.side===side&&a.pos!=='MV').length;
 const period=m.period===4?`Förlängning${(m.overtimePeriods||1)>1?' '+m.overtimePeriods:''}`:`Period ${m.period}`;
 const interval=!m.finished&&!m.running&&m.minute===0&&m.second===0&&m.period>1;
 const penalties=[...m.penaltiesHV.map(t=>[managerClub(),t]),...m.penaltiesOpp.map(t=>[m.opponent,t])];
 return `<div class="mc-page ${m.finished?'mc-finished':'mc-live'}"><nav class="mc-utility"><button onclick="deskNavigate('home')">← Kontoret</button><button onclick="matchFullscreen()">Helskärm</button></nav><header class="mc-header"><div class="mc-score"><div class="mc-club"><span class="mc-badge" style="--club-color:${own.color}">${own.code}</span><strong>${trainingSafe(managerClub())}</strong></div><div class="mc-result"><span>${m.finished?'SLUTRESULTAT':interval?'PERIODPAUS':m.running?'LIVE':'PAUSAT'}</span><b>${m.hv}<i>–</i>${m.opp}</b><small>${period} · ${gameTime()}</small></div><div class="mc-club"><span class="mc-badge" style="--club-color:${opp.color}">${opp.code}</span><strong>${trainingSafe(m.opponent)}</strong></div></div><div class="mc-playback ${m.finished?'':'mc-live-controls'}">${m.finished?'<button class="btn" onclick="state.analysis.selected=\'latest\';coachingNavigate(\'statistics\')">Matchrapport →</button><button class="btn secondary" onclick="state.live=null;deskNavigate(\'home\')">Till kontoret</button>':`<button class="btn mc-play" id="match-play" onclick="matchPlay()">${m.running?'Ⅱ Pausa':medicalPending()?'Hantera spelarbesked':interval?'▶ Starta perioden':studioActive()&&!studioEngine().started?'▶ Starta matchen':'▶ Fortsätt'}</button><label>Visning<select onchange="rinkMode(this.value)" aria-label="Matchvisning">${Object.entries(MATCH_VIEW_MODES).map(([v,label])=>`<option value="${v}" ${m.rink.mode===v?'selected':''}>${label}</option>`).join('')}</select></label><label>Hastighet<select onchange="setSpeed(this.value)" aria-label="Uppspelningshastighet">${[[1,'4×'],[2,'8×'],[3,'16×'],[4,'32×']].map(([v,t])=>`<option value="${v}" ${m.speed===v?'selected':''}>${t}</option>`).join('')}</select></label>`}</div></header>${matchScoringView()}${!m.finished&&!m.running?`<p class="mc-pause-reason" role="status">${trainingSafe(medicalPending()?'Spelarbesked måste hanteras.':m.pauseReason||'Matchen väntar på att startas eller återupptas.')}</p>`:''}${matchPreferencesView()}<div class="mc-situation"><strong>${skaters('own')} mot ${skaters('opponent')}${hockeySpecial('own')==='pp'?' · Powerplay':hockeySpecial('own')==='pk'?' · Boxplay':''}</strong><span>${matchPenaltyText()}${m.goaliePulled?' · Eget mål tomt':''}${m.aiGoaliePulled?' · Motståndarens mål tomt':''}</span></div>
 <section class="mc-stats" aria-label="Matchstatistik, ditt lag först">${matchStatCard(m.analysis?.partial?'Registrerade skott på mål':'Skott på mål',s.shots)}${matchStatCard('Farliga chanser',s.danger)}${matchStatCard('Puckinnehav',s.possession,'%')}${matchStatCard('Vunna tekningar',s.faceoffs)}${matchStatCard('Powerplay · mål/försök',s.pp)}${matchStatCard('Räddningar',s.saves)}</section>
 <div class="mc-layout"><div class="mc-ice-column">${studioActive()?studioView():rinkView(true)}<div class="mc-on-ice"><span>PÅ ISEN · ${studioActive()&&(studioEngine().teams[0].change||studioEngine().teams[0].changeQueue.length)?'BYTE PÅGÅR':specialUnitOnIce()?'SPECIAL TEAMS':`KEDJA ${m.currentLine+1} · BACKPAR ${m.currentDefensePair+1}`}</span><p>${[...currentLinePlayers(),...currentDefensePlayers()].map(p=>`<span class="${matchEnergy(p)<55?'tired':''}">${trainingSafe(p.name.split(' ').at(-1))} <small>${Math.round(matchEnergy(p))}% energi</small></span>`).join('')}</p></div>
 ${m.finished?performanceView(m.performance):''}<details class="mc-details" ${matchDesk.details?'open':''} ontoggle="matchMore('details',this.open)"><summary>Matchstatistik · jämför lagen</summary>${matchDetailedStats()}</details><details class="mc-details" data-desk-fold="iceTime" ${deskFolds.iceTime?'open':''} ontoggle="deskFolds.iceTime=this.open"><summary>Spelarstatistik & istid · båda lagen</summary>${matchPlayersView()}</details><details class="mc-details" ${matchDesk.events?'open':''} ontoggle="matchMore('events',this.open)"><summary>Händelser & matchlogg (${m.events.length})</summary><div class="mc-events">${m.events.map(e=>`<p><time>P${e.period} · ${e.time}</time><span>${trainingSafe(e.text)}</span></p>`).join('')}</div></details>${isPlayoffMatch()?seasonMatchPanel():''}</div>${matchCoachView()}</div></div>`;
}

function matchPreferences(){return state.matchPreferences??={stats:false,goal:false,penalty:false,period:true};}
function setMatchPreference(key,value){if(!['stats','goal','penalty','period'].includes(key))return;matchPreferences()[key]=Boolean(value);save();render();}
function matchPreferencesView(){
 const p=matchPreferences();return `<details class="mc-pause-settings" ${matchDesk.pauseSettings?'open':''} ontoggle="matchDesk.pauseSettings=this.open"><summary>Automatiska pauser</summary><div>${[['stats','När jag öppnar statistik, istid eller logg'],['goal','Efter mål'],['penalty','Vid utvisning'],['period','Mellan perioder']].map(([key,label])=>`<label><input type="checkbox" ${p[key]?'checked':''} onchange="setMatchPreference('${key}',this.checked)"> ${label}</label>`).join('')}</div><p>Skador som kräver ett beslut, tränarändringar och att lämna matchvyn pausar alltid.</p></details>`;
}
function matchReadOnlyTab(){return ['stats','players','events'].includes(matchDesk.tab);}
function matchLivePanel(){return matchDesk.tab==='stats'?matchDetailedStats():matchDesk.tab==='players'?matchPlayersView():`<div class="mc-events">${state.live.events.map(e=>`<p>${trainingSafe(e.text)}</p>`).join('')}</div>`;}
function matchPenaltyText(){
 const m=state.live,rows=[...m.penaltiesHV.map(p=>[managerClub(),p]),...m.penaltiesOpp.map(p=>[m.opponent,p])];
 return rows.map(([club,p])=>`${trainingSafe(club)} · ${trainingSafe(p.player||p.name||'Utvisning')}${p.kind?' · '+trainingSafe(p.kind):''} ${analysisTime(typeof p==='number'?p:p.seconds??p.remaining)}${p.queued?' (väntar)':''}`).join(' · ')||'Inga utvisningar';
}
function matchApplyAutoPause(){
 const m=state.live;if(!m?.autoPauseWanted||m.finished)return false;
 const kind=m.autoPauseWanted;delete m.autoPauseWanted;
 if(!matchPreferences()[kind]||!m.running)return false;
 m.running=false;m.pauseReason=kind==='goal'?'Automatisk paus efter mål.':'Automatisk paus vid utvisning.';clearTimeout(matchTimer);return true;
}
function matchPeriodPause(){
 const m=state.live;m.running=!matchPreferences().period&&!medicalPending();m.pauseReason=m.running?'':'Periodpaus.';
 if(m.running)markSocialPeriodStarted();
}
