"use strict";
const SEASON_STAGES={playin:'Åttondelsfinal',quarter:'Kvartsfinal',semi:'Semifinal',final:'Final'};
function seasonLabel(year=state.season?.year||2026){return `${year}/${String(year+1).slice(-2)}`;}
function ensureSeason(){if(!state.careerStarted)return;if(!state.season)state.season={version:1,year:2026,phase:'regular',series:[],archive:[],freeAgents:[]};}
function regularTable(){return [...state.teams].sort((a,b)=>b.pts-a.pts||(b.gf-b.ga)-(a.gf-a.ga));}
function isPlayoffMatch(){return state.season?.phase==='playoffs'&&Boolean(state.schedule.find(g=>g.round===state.round&&g.seriesId&&(g.home===managerClub()||g.away===managerClub())));}
function currentSeasonFixture(){return state.schedule.find(g=>!g.played&&g.round===state.round&&(g.home===managerClub()||g.away===managerClub()));}
function seasonRank(name){return state.season.standings.findIndex(t=>t.name===name)+1;}
function addSeries(stage,names){
 const s=state.season,ordered=[...names].sort((a,b)=>seasonRank(a)-seasonRank(b));s.stage=stage;
 for(let i=0;i<ordered.length/2;i++)s.series.push({id:`${s.year}-${stage}-${i}`,stage,high:ordered[i],low:ordered[ordered.length-1-i],winsHigh:0,winsLow:0,bestOf:stage==='playin'?3:7,games:[],winner:null});
}
function schedulePlayoffDay(){
 const s=state.season;
 for(const series of s.series.filter(x=>x.stage===s.stage&&!x.winner)){
  if(state.schedule.some(g=>g.seriesId===series.id&&!g.played))continue;
  const index=series.games.length,homeHigh=(series.bestOf===3?[false,true,true]:[true,true,false,false,true,false,true])[index];
  state.schedule.push({round:state.round,home:homeHigh?series.high:series.low,away:homeHigh?series.low:series.high,played:false,homeGoals:null,awayGoals:null,seriesId:series.id,stage:s.stage});
 }
}
function enterPlayoffs(){
 ensureSeason();const s=state.season;if(s.phase!=='regular'||state.schedule.some(g=>!g.seriesId&&!g.played))return false;
 s.standings=JSON.parse(JSON.stringify(regularTable()));s.boardResult=JSON.parse(JSON.stringify(boardProgress()));s.phase='playoffs';
 s.regularStats=managerRoster().map(p=>({id:p.id,name:p.name,pos:p.pos,goals:p.goals||0,assists:p.assists||0,games:p.games||0}));
 state.round=Math.max(53,state.round);state.live=null;
 addSeries('playin',s.standings.slice(6,10).map(t=>t.name));schedulePlayoffDay();
 managerMessage(`playoffs:${s.year}`,'Grundserien är avslutad',`Du slutade på plats ${seasonRank(managerClub())}. Styrelsens grundseriemål har utvärderats. Följ slutspelsträdet under Säsong.`,'Tävlingsledning',{link:'season'});
 state.page='season';save();render();return true;
}
function recordSeriesGame(game,homeGoals,awayGoals){
 if(game.played||homeGoals===awayGoals)return false;
 const series=state.season.series.find(s=>s.id===game.seriesId);if(!series||series.winner)return false;
 game.played=true;game.homeGoals=homeGoals;game.awayGoals=awayGoals;
 const winner=homeGoals>awayGoals?game.home:game.away;
 if(winner===series.high)series.winsHigh++;else series.winsLow++;
 series.games.push({home:game.home,away:game.away,homeGoals,awayGoals});
 if(Math.max(series.winsHigh,series.winsLow)>series.bestOf/2)series.winner=series.winsHigh>series.winsLow?series.high:series.low;
 return true;
}
function simulatePlayoffGame(game){
 const strength=name=>{const ps=(state.clubRosters[name]||[]).filter(p=>p.pos!=='MV');return ps.reduce((n,p)=>n+matchAttributeRating(p),0)/Math.max(1,ps.length);};
 const advantage=(strength(game.home)+2-strength(game.away))/100;
 let h=0,a=0;for(let i=0;i<10;i++){if(Math.random()<.25+advantage/2)h++;if(Math.random()<.25-advantage/2)a++;}
 if(h===a){if(Math.random()<.5+advantage)h++;else a++;}recordSeriesGame(game,h,a);
}
function advancePlayoffStage(){
 const s=state.season,current=s.series.filter(x=>x.stage===s.stage);if(current.some(x=>!x.winner)){schedulePlayoffDay();return;}
 const winners=current.map(x=>x.winner);
 if(s.stage==='final'){s.champion=winners[0];closeSeason();return;}
 const next=s.stage==='playin'?'quarter':s.stage==='quarter'?'semi':'final';
 addSeries(next,s.stage==='playin'?[...s.standings.slice(0,6).map(t=>t.name),...winners]:winners);schedulePlayoffDay();
 managerMessage(`stage:${s.year}:${next}`,`${SEASON_STAGES[next]}erna är klara`,`${state.season.series.filter(x=>x.stage===next).map(x=>`${x.high} – ${x.low}`).join('\n')}`,'Tävlingsledning',{link:'season'});
}
function finishPlayoffDay(){
 for(const game of state.schedule.filter(g=>g.round===state.round&&g.seriesId&&!g.played)){
  if(game.home===managerClub()||game.away===managerClub())return false;
  simulatePlayoffGame(game);
 }
 state.round++;advanceScoutReports();advancePlayoffStage();return true;
}
function finishPlayoffMatch(){
 const m=state.live,g=currentSeasonFixture();if(!m||m.finished||!g||m.hv===m.opp)return;
 if(!recordSeriesGame(g,g.home===managerClub()?m.hv:m.opp,g.home===managerClub()?m.opp:m.hv))return;
 m.running=false;m.finished=true;clearTimeout(matchTimer);
 for(const p of managerRoster()){
  const seconds=m.iceTime?.[p.id]||0;if(seconds>0)p.games=(p.games||0)+1;
  grantMatchDevelopment(p,seconds);p.happiness=trainingClamp((p.happiness||70)+(m.hv>m.opp?1:-1),20,100);
 }
 state.history.unshift(`${SEASON_STAGES[g.stage]}: ${managerClub()} ${m.hv}–${m.opp} ${m.opponent}`);
 clubSettleMatch();afterTrainingMatch();
 const series=state.season.series.find(s=>s.id===g.seriesId);
 managerMessage(`series:${g.seriesId}:${series.games.length}`,`${series.high} ${series.winsHigh}–${series.winsLow} ${series.low}`,`${series.winner?`${series.winner} vinner serien.`:`Nästa match blir match ${series.games.length+1}.`} Återhämtning, kedjor och matchplan kan justeras inför nästa möte.`,'Slutspelsrapport',{link:'season'});
 finishPlayoffDay();state.page="season";save();render();
}
function closeSeason(){
 const s=state.season;if(s.phase==='review')return;s.phase='review';
 const promises=state.training?.promises||[];for(const p of promises.filter(p=>!p.resolved)){p.resolved=true;p.result='Säsongen avslutad – för få matcher för slutbedömning';}
 const playerStats=managerRoster().map(p=>({id:p.id,name:p.name,pos:p.pos,goals:p.goals||0,assists:p.assists||0,games:p.games||0,development:Object.keys(p.attributes||{}).reduce((n,k)=>n+Math.max(0,p.attributes[k]-(p.trainingBaseline?.[k]??p.attributes[k])),0)}));
 const record={year:s.year,champion:s.champion,club:managerClub(),position:seasonRank(managerClub()),standings:JSON.parse(JSON.stringify(s.standings)),series:JSON.parse(JSON.stringify(s.series)),players:playerStats,regularPlayers:s.regularStats,goals:s.boardResult,money:state.money};
 if(!s.archive.some(a=>a.year===s.year))s.archive.unshift(record);
 managerMessage(`review:${s.year}`,`${s.champion} är mästare ${seasonLabel()}`,`Säsongen är avslutad. Din placering i grundserien: ${record.position}. Styrelsens mål: ${record.goals.filter(g=>g.met).length} av ${record.goals.length} uppnådda. Öppna Säsong för utvärdering och nästa försäsong.`,'Säsongsutvärdering',{link:'season'});
 managerSeasonReview();
 state.page='season';
}
function seasonContinue(){
 ensureSeason();const s=state.season;if(!s)return false;
 if(s.phase==='regular')return enterPlayoffs();
 if(s.phase==='review'||s.phase==='preseason'){state.page='season';save();render();return true;}
 if(s.phase==='playoffs'&&!currentSeasonFixture()){finishPlayoffDay();state.page='season';save();render();return true;}
 return false;
}
function watchRemainingPlayoffs(){
 if(state.season?.phase!=='playoffs')return;
 // Stop as soon as the manager has a match; never simulate their fixture.
 for(let i=0;i<40&&state.season.phase==='playoffs'&&!currentSeasonFixture();i++)finishPlayoffDay();
 state.page='season';save();render();
}
function beginPreseason(){
 const s=state.season;if(s?.phase!=='review')return;
 s.phase='preseason';s.year++;s.departures=[];if(state.recruitment)state.recruitment.weeks=0;
 for(const [club,roster] of Object.entries(state.clubRosters))for(const p of roster){
  p.age++;p.contractYears=Math.max(0,(p.contractYears||1)-1);
  if(club!==managerClub()&&p.contractYears===0)p.contractYears=2;
  if(p.age>=33){const a=ensurePlayerAttributes(p);const key=p.pos==='MV'?'movement':'acceleration';a[key]=Math.max(1,a[key]-1);}
  p.fatigue=0;
 }
 const fulfilled=s.boardResult.filter(g=>g.met).length/Math.max(1,s.boardResult.length);
 s.nextWageLimit=Math.round(wageBudget()*(.95+.1*fulfilled)/10000)*10000;
 s.grant=Math.round(careerIdentity(managerClub()).cash*(.4+.2*fulfilled));
 clubNewYear();clubPost("grant",s.grant,"Styrelsens försäsongstilldelning");
 juniorNewYear();
 managerPreseason();
 state.live=null;state.contractNegotiation=null;state.transferNegotiation=null;state.transferOffers=[];
 state.page='season';save();render();
}
function releaseExpiredPlayer(id){
 const s=state.season,p=managerRoster().find(p=>samePlayerId(p.id,id));if(s?.phase!=='preseason'||!p||p.contractYears>0)return;
 state.clubRosters[managerClub()]=managerRoster().filter(x=>!samePlayerId(x.id,id));s.freeAgents.push(p);s.departures.push(p.name);syncManagerRoster();state.lines=null;state.specialTeams=null;save();render();
}
function recruitAcademyPlayer(pos){if(state.season?.phase==='preseason')juniorEmergency(pos);}

function preseasonRenew(id){const p=managerRoster().find(p=>samePlayerId(p.id,id));if(!p)return;state.selectedPlayer=p.id;state.page='player';openContractNegotiation(p.id);}
function launchSeason(){
 if(!managerCanPlay())return;
 const s=state.season;if(s?.phase!=='preseason')return;
 if(state.recruitment?.deals.some(d=>d.status==='pending')){s.message='Invänta eller återkalla pågående transferbud under Rekrytering innan premiären.';render();return;}
 const ps=managerRoster();if(ps.some(p=>p.contractYears<=0)){s.message='Förnya eller avsluta samtliga utgående avtal innan premiären.';render();return;}
 if(ps.filter(p=>p.pos==='MV').length<2||ps.filter(p=>p.pos==='B').length<6||ps.filter(p=>!['MV','B'].includes(p.pos)).length<12){s.message='Premiärtruppen behöver minst två målvakter, sex backar och tolv forwards. Du kan flytta upp juniorer.';render();return;}
 for(const roster of Object.values(state.clubRosters))for(const p of roster){for(const key of ['goals','assists','shots','pim','games','saves','goalsAgainst'])p[key]=0;p.fatigue=0;p.trainingBaseline={...p.attributes};}
 state.teams=TEAM_DATA.map(([name,strength,style])=>({name,strength:Math.round(state.clubRosters[name].reduce((n,p)=>n+matchAttributeRating(p),0)/state.clubRosters[name].length),style,gp:0,w:0,l:0,otw:0,otl:0,pts:0,gf:0,ga:0}));
 state.managerCareer.startGames=0;state.managerCareer.lastReview=null;
 state.schedule=createSchedule();state.round=1;state.selectedRound=1;state.live=null;state.lines=null;state.specialTeams=null;
 const oldTraining=state.training;
 state.training=null;state.scoutReports=state.scoutReports||{};
 for(const report of Object.values(state.scoutReports))delete report.dueRound;
 state.boardPlan=null;const offer=careerOffer(managerClub(),state.clubRosters);offer.wageLimit=s.nextWageLimit;offer.cashFloor=Math.min(offer.cashFloor,Math.max(0,state.money));initializeBoardPlan(offer);
 s.phase='regular';s.series=[];delete s.standings;delete s.boardResult;delete s.champion;s.message='';
 ensureTrainingData();if(oldTraining){state.training.plan=oldTraining.plan;state.training.familiarity=oldTraining.familiarity;}
 state.news.unshift(`Säsongen ${seasonLabel()} börjar. Nya styrelsemål och ett nytt spelschema väntar.`);state.page='home';save();render();
}
function seasonMatchPanel(){
 if(!isPlayoffMatch())return '';const g=currentSeasonFixture()||state.schedule.find(g=>g.round===state.round&&g.seriesId);if(!g)return '';
 const series=state.season.series.find(s=>s.id===g.seriesId);
 return `<section class="season-banner"><span>${SEASON_STAGES[g.stage]} · MATCH ${series.games.length+1} · BÄST AV ${series.bestOf}</span><h2>${series.high} <b>${series.winsHigh}–${series.winsLow}</b> ${series.low}</h2><p>${g.home===managerClub()?'Hemmaplan':'Bortaplan'} · Förlängning avgörs med sudden death, utan straffläggning.</p><button class="btn secondary" onclick="trainingOpen('training')">Återhämtning & matchplanering</button></section>`;
}
function seasonOverview(){ensureSeason();const s=state.season;if(!s)return '';return `<section class="season-strip"><span>${seasonLabel()} · ${s.phase==='regular'?'GRUNDSERIE':s.phase==='playoffs'?SEASON_STAGES[s.stage]:s.phase==='preseason'?'FÖRSÄSONG':'SÄSONGSAVSLUT'}</span><button class="btn secondary" onclick="trainingOpen('season')">Säsong & karriärhistorik →</button></section>`;}
function seasonView(){
 ensureSeason();const s=state.season;
 const series=s.series||[],latest=s.archive[0],current=series.filter(x=>x.stage===s.stage);
 return `<section class="season-page"><header class="daily-heading"><div><span class="career-eyebrow">DIN KARRIÄR · ${seasonLabel()}</span><h1>${s.phase==='preseason'?'Bygg nästa års lag.':s.phase==='review'?'En säsong att minnas.':s.phase==='playoffs'?'Vägen till guldet.':'En lång säsong. Ett mål.'}</h1><p>${s.phase==='regular'?'52 omgångar, sedan väntar slutspelet.':s.phase==='playoffs'?'Följ serierna, justera matchplanen och fördela krafterna.':s.phase==='review'?`${s.champion} är mästare ${seasonLabel()}.`:'Förnya avtal, värva och ge nästa generation chansen.'}</p></div><button class="btn secondary" onclick="trainingOpen('home')">Klubbkontoret</button></header>
 ${s.phase==='regular'?`<div class="season-banner"><h2>Grundserien</h2><p>${team(managerClub()).gp} av 52 matcher spelade. Plats ${regularTable().findIndex(t=>t.name===managerClub())+1}.</p><button class="btn" onclick="managerContinue()">Fortsätt säsongen →</button></div>`:''}
 ${s.phase==='playoffs'?`<div class="season-banner"><h2>${SEASON_STAGES[s.stage]}</h2><p>${currentSeasonFixture()?`Nästa motståndare: ${opponent()}.`:'Ditt lag spelar inte i nästa slutspelsomgång.'}</p><button class="btn" onclick="${currentSeasonFixture()?'managerContinue()':'watchRemainingPlayoffs()'}">${currentSeasonFixture()?'Förbered nästa match':'Följ slutspelet till nästa händelse'} →</button></div>`:''}
 ${series.length?`<div class="season-bracket">${Object.entries(SEASON_STAGES).map(([stage,name])=>`<section><h2>${name}</h2>${series.filter(x=>x.stage===stage).map(x=>`<article class="series-card ${[x.high,x.low].includes(managerClub())?'own-series':''}"><div><strong>${x.high}</strong><b>${x.winsHigh}</b></div><div><strong>${x.low}</strong><b>${x.winsLow}</b></div><p>${x.winner?`${x.winner} ${x.stage==='final'?'är mästare':'vidare'}`:`Bäst av ${x.bestOf}`}</p><details><summary>Matcher</summary>${x.games.map(g=>`<p>${g.home} ${g.homeGoals}–${g.awayGoals} ${g.away}</p>`).join('')||'<p>Ingen match spelad.</p>'}</details></article>`).join('')||'<p>Avgörs efter föregående omgång.</p>'}</section>`).join('')}</div>`:''}
 ${s.phase==='review'?`<section class="season-review"><h2>Styrelsens utvärdering</h2>${boardGoalsHTML(s.boardResult,true)}<button class="btn" onclick="beginPreseason()">Inled försäsongen ${seasonLabel(s.year+1)} →</button></section>`:''}
 ${s.phase==='preseason'?preseasonView():''}
 <section class="season-archive"><h2>Karriärhistorik</h2>${s.archive.map(a=>`<details><summary>${seasonLabel(a.year)} · Mästare: ${a.champion} · ${a.club}, plats ${a.position}</summary><p>Styrelsens mål: ${a.goals.filter(g=>g.met).length}/${a.goals.length} uppnådda. Spelarstatistiken nedan omfattar hela säsongen inklusive slutspel.</p>${[...a.players].sort((p,q)=>(q.goals+q.assists)-(p.goals+p.assists)).map(p=>`<div class="row"><span>${p.name}</span><strong>${p.goals} mål · ${p.assists} assist · ${p.development} attributsteg</strong></div>`).join('')}<h3>Sluttabell</h3>${a.standings.map((t,i)=>`<div class="row"><span>${i+1}. ${t.name}</span><b>${t.pts} p</b></div>`).join('')}</details>`).join('')||'<p>Avslutade säsonger sparas här.</p>'}</section><p class="training-note">Ligorna är ännu slutna: samma 14 klubbar fortsätter nästa år. Upp- och nedflyttning byggs tillsammans med fler ligor.</p></section>`;
}
function preseasonView(){const s=state.season,expired=managerRoster().filter(p=>p.contractYears<=0);return `<section class="season-review"><h2>Försäsong ${seasonLabel()}</h2><div class="career-finances"><div><span>Ny tilldelning</span><strong>${careerMoney(s.grant)}</strong></div><div><span>Ny lönebudget</span><strong>${careerMoney(s.nextWageLimit)}</strong></div></div><p>Nuvarande årslöner: ${careerMoney(annualWageCost())}. ${annualWageCost()>s.nextWageLimit?'Du ligger över lönebudgeten. Du kan starta säsongen, men styrelsens ekonomimål kräver att lönerna minskar.':''} Spelarna har blivit ett år äldre. Utgående kontrakt behöver ditt beslut.</p>${expired.map(p=>`<div class="preseason-player"><strong>${p.name} · ${p.pos}</strong><div><button class="btn secondary" onclick="preseasonRenew('${p.id}')">Förhandla nytt avtal</button><button class="btn secondary" onclick="releaseExpiredPlayer('${p.id}')">Avsluta avtalet</button></div></div>`).join('')||'<p>Alla spelare har giltiga kontrakt.</p>'}<h3>Flytta upp juniorer</h3><p>Treårsavtal, 350 000 kr per år. Juniorerna är skapade spelare.</p><div class="training-presets">${['MV','B','C','VF','HF'].map(pos=>`<button onclick="recruitAcademyPlayer('${pos}')">+ ${pos}</button>`).join('')}</div><h3>Kontraktslösa spelare från din klubb</h3>${s.freeAgents.map(p=>`<div class="preseason-player"><span>${p.name} · ${p.pos}</span><button class="btn secondary" onclick="signSeasonFreeAgent('${p.id}')">Tvåårsavtal · ${careerMoney(p.salary)}/år</button></div>`).join('')||'<p>Inga spelare i listan.</p>'}<button class="btn secondary" onclick="trainingOpen('transfers')">Öppna rekrytering & gå försäsongsveckor</button><p role="status">${s.message||''}</p><button class="btn" onclick="launchSeason()">Godkänn truppen och starta grundserien →</button></section>`;}

function signSeasonFreeAgent(id){const s=state.season;if(s?.phase!=='preseason')return;const p=s.freeAgents.find(p=>samePlayerId(p.id,id));if(!p||managerRoster().some(x=>samePlayerId(x.id,id)))return;p.contractYears=2;p.transferListed=false;s.freeAgents=s.freeAgents.filter(x=>!samePlayerId(x.id,id));managerRoster().push(p);save();render();}
