"use strict";

const J20_CALENDAR_GAPS=[3,4,3,4,4,3,4];
function juniorCalendarDates(year=state.season?.year||2026,league=leagueOf()){
  const clubs=juniorWorldClubs(league),rounds=Math.max(0,(clubs.length-1)*4),dates=[];
  let date=`${year}-09-08`;
  for(let round=1;round<=rounds;round++){
    if(round>1)date=calAdd(date,J20_CALENDAR_GAPS[(round-2)%J20_CALENDAR_GAPS.length]);
    dates.push({round,date});
  }
  return dates;
}
function ensureJuniorCalendar(){
  const world=ensureJuniorWorld();if(!world)return null;
  const year=state.season.year;
  if(!world.calendar||world.calendar.year!==year){
    world.calendar={version:1,year,activationDate:state.calendar?.date||`${year}-09-01`,leagues:{SHL:juniorCalendarDates(year,'SHL'),HA:juniorCalendarDates(year,'HA')},lastProcessed:null};
  }
  return world.calendar;
}
function juniorCalendarFixture(league,round){
  const date=ensureJuniorCalendar()?.leagues?.[league]?.find(x=>x.round===round)?.date||null;
  const pair=juniorWorldPairings(league,round).find(g=>g.home===managerClub()||g.away===managerClub());
  if(!pair||league!==leagueOf(managerClub()))return null;
  return {date,round,home:pair.home,away:pair.away,opponent:pair.home===managerClub()?pair.away:pair.home,venue:pair.home===managerClub()?'Hemma':'Borta'};
}
function juniorCalendarNext(club=managerClub()){
  const league=leagueOf(club),world=ensureJuniorWorld(),rows=ensureJuniorCalendar()?.leagues?.[league]||[];
  const played=new Set(world.results.filter(r=>r.year===state.season.year&&r.league===league&&(r.home===club||r.away===club)).map(r=>r.round));
  for(const row of rows){
    if(row.date<(ensureJuniorCalendar().activationDate||`${state.season.year}-09-01`)||row.date<state.calendar.date||played.has(row.round))continue;
    const pair=juniorWorldPairings(league,row.round).find(g=>g.home===club||g.away===club);if(!pair)continue;
    return {date:row.date,round:row.round,opponent:pair.home===club?pair.away:pair.home,venue:pair.home===club?'Hemma':'Borta'};
  }
  return null;
}
function juniorCalendarLoanAppearance(p,round,date){
  const a=p.academy;if(!a?.loan)return;
  const offer=JUNIOR_LOANS[a.loan.destination],quality=attributeWeighted(p.attributes,PLAYER_ROLES[a.role]);
  const minutes=p.pos==='MV'?(juniorRoll()<.55?60:0):Math.round(Math.max(0,Math.min(24,offer.minutes+(quality-offer.level)*1.5-p.fatigue/12+(juniorRoll()-.5)*6)));
  const row=juniorAppearance(p,minutes*60,offer.level,offer.name);a.loan.games+=row.seconds>0?1:0;a.loan.seconds+=row.seconds;a.loan.remaining--;
  if(a.history?.[0])a.history[0].date=date;
  if(a.loan.remaining<=0){juniorReport(`${p.name} är tillbaka från lån`,`${offer.name}: ${a.loan.games} matcher och ${Math.round(a.loan.seconds/60)} minuter. Läs utvecklingsrapporten innan nästa steg.`);a.loan=null;a.path='junior';}
}
function juniorCalendarManagerReport(pair,round,date,forecast){
  const home=pair.home===managerClub(),opponent=home?pair.away:pair.home,plan=juniorMatchPlan(managerClub(),round),rows=[];
  for(const p of state.juniors.roster){
    if(p.academy.loan){juniorCalendarLoanAppearance(p,round,date);continue;}
    const seconds=plan.playable?(plan.seconds.get(String(p.id))||0):0;
    const row={id:p.id,name:p.name,seconds,goals:0,assists:0};rows.push(row);
    const a=p.academy;a.observations=Math.min(100,(a.observations||0)+1);
    a.history.unshift({year:state.season.year,round,date,opponent:opponent+' J20',seconds,goals:0,assists:0,path:'junior'});a.history=a.history.slice(0,16);
    if(seconds>0){a.games=(a.games||0)+1;a.seconds=(a.seconds||0)+seconds;a.missed=0;if(medicalCanTrain(p))developmentAdvance(p,juniorTarget(p),2*Math.min(2,seconds/900));}
    else a.missed=(a.missed||0)+1;
    p.fatigue=trainingClamp((p.fatigue||0)+seconds/180-8);
  }
  let own=0,against=0,overtime=false,forfeit=!plan.playable;
  if(forfeit){against=3;}
  else{
    own=home?forecast.homeGoals:forecast.awayGoals;against=home?forecast.awayGoals:forecast.homeGoals;overtime=forecast.overtime;
    juniorWorldAssignPoints(managerClub(),rows,opponent,round,own);juniorWorldLeagueRows(managerClub(),round,opponent,rows);
  }
  const result=home?{home:managerClub(),away:opponent,homeGoals:own,awayGoals:against,overtime,forfeit}:{home:opponent,away:managerClub(),homeGoals:against,awayGoals:own,overtime,forfeit};
  if(juniorWorldRecord(result,leagueOf(),round)&&!forfeit)juniorWorldAIReport(opponent,managerClub(),round,against);
  state.juniors.matches.unshift({year:state.season.year,round,date,opponent,own,against,players:rows,j20:true,overtime,forfeit});state.juniors.matches=state.juniors.matches.slice(0,16);
  if(round%4===0||forfeit)juniorReport('J20-avstämning',`${forfeit?'Juniorlaget kunde inte ställa upp med en komplett matchtrupp.':`${managerClub()} J20 ${own}–${against} ${opponent} J20.`}\n${juniorPlayers().slice().sort((a,b)=>(b.academy.missed||0)-(a.academy.missed||0)).slice(0,3).map(p=>`${p.name}: ${juniorAdvice(p)}`).join('\n')}`);
}
function juniorCalendarPlayRound(league,round,date){
  const world=ensureJuniorWorld();if(!world||world.results.some(r=>r.year===state.season.year&&r.league===league&&r.round===round))return;
  for(const pair of juniorWorldPairings(league,round)){
    const forecast=juniorWorldProjectedResult(pair.home,pair.away,round);
    if(pair.home===managerClub()||pair.away===managerClub()){
      if(league===leagueOf())juniorCalendarManagerReport(pair,round,date,forecast);
      continue;
    }
    if(juniorWorldRecord(forecast,league,round)){
      juniorWorldAIReport(pair.home,pair.away,round,forecast.homeGoals);
      juniorWorldAIReport(pair.away,pair.home,round,forecast.awayGoals);
    }
  }
}
function juniorCalendarProcess(date=state.calendar?.date){
  if(!date||state.season?.phase!=='regular')return;
  const cal=ensureJuniorCalendar();
  for(const league of ['SHL','HA'])for(const row of cal.leagues[league]||[]){
    if(row.date!==date||row.date<(cal.activationDate||`${state.season.year}-09-01`))continue;
    juniorCalendarPlayRound(league,row.round,row.date);
  }
  cal.lastProcessed=date;
}

// Once J20 owns its dates, the normal A-team completion hook only records promoted academy players' senior exposure.
// Other explicit fixture calls retain the legacy development-match path for preseason/tools/older flows.
const juniorCalendarLegacyFixture=juniorFixture;
juniorFixture=function(key){
  const seniorKey=`${state.season?.year}:${state.round}`;
  if(state.season?.phase!=='regular'||key!==seniorKey)return juniorCalendarLegacyFixture(key);
  ensureJuniors();const s=state.juniors;if(s.lastFixture===key)return;s.lastFixture=key;
  for(const p of managerRoster().filter(p=>p.academy)){
    const a=p.academy,seconds=state.live?.iceTime?.[p.id]||0;a.observations=Math.min(100,(a.observations||0)+2);
    a.history.unshift({year:s.year,round:state.round,date:state.calendar?.date,opponent:state.live?.opponent||'A-match',seconds,goals:state.live?.analysis?.players?.[p.id]?.goals||0,assists:state.live?.analysis?.players?.[p.id]?.assists||0,path:'senior'});a.history=a.history.slice(0,16);
    if(seconds>=300)a.missed=0;else if(!medicalExcused(p,300))a.missed++;
  }
};
const juniorCalendarStepBase=calendarStep;
calendarStep=function(recovered=false){juniorCalendarProcess(state.calendar?.date);juniorCalendarStepBase(recovered);};

function juniorCalendarView(){
  const league=leagueOf(),cal=ensureJuniorCalendar(),rows=cal?.leagues?.[league]||[],results=ensureJuniorWorld().results.filter(r=>r.league===league&&r.year===state.season.year);
  const fixtures=rows.map(row=>{const pair=juniorWorldPairings(league,row.round).find(g=>g.home===managerClub()||g.away===managerClub());if(!pair)return null;const g=results.find(r=>r.round===row.round&&(r.home===managerClub()||r.away===managerClub()));return {row,pair,g};}).filter(Boolean);
  return `<details class="dv-report junior-calendar" open><summary>J20-kalender · egna matchdagar</summary><p class="dv-note">J20 har nu egna daterade omgångar och spelas när karriärkalendern når datumet, oberoende av A-lagets matchdag.</p><div class="dv-scroll"><table><thead><tr><th>Datum</th><th>Motstånd</th><th>H/B</th><th>Status</th></tr></thead><tbody>${fixtures.slice(0,52).map(({row,pair,g})=>{const home=pair.home===managerClub(),opp=home?pair.away:pair.home,status=g?(home?`${g.homeGoals}–${g.awayGoals}`:`${g.awayGoals}–${g.homeGoals}`):(row.date<state.calendar.date?'Ej bokförd':'Kommande');return `<tr class="${row.date===state.calendar.date?'selected':''}"><td>${calText(row.date)}</td><th>${trainingSafe(opp)} J20</th><td>${home?'H':'B'}</td><td>${status}</td></tr>`;}).join('')}</tbody></table></div></details>`;
}
const juniorCalendarViewBase=juniorWorldView;
juniorWorldView=function(){const html=juniorCalendarViewBase();return html.replace(juniorWorldScoringView(leagueOf()),juniorCalendarView()+juniorWorldScoringView(leagueOf()));};

function ensureJuniorLineup(){
  const world=ensureJuniorWorld();world.lineups??={};const club=managerClub(),year=state.season.year;
  let l=world.lineups[club];
  const roster=state.juniors?.roster||[],valid=id=>roster.some(p=>String(p.id)===String(id)&&p.age<=20&&!p.academy?.loan);
  if(!l||l.year!==year){l=world.lineups[club]={year,forwards:[],defense:[],goalies:[]};}
  for(const key of ['forwards','defense','goalies'])l[key]=(l[key]||[]).filter(valid);
  const used=new Set([...l.forwards,...l.defense,...l.goalies].map(String));
  const score=p=>attributeWeighted(ensurePlayerAttributes(p),PLAYER_ROLES[p.academy?.role]||PLAYER_ROLES[juniorRoles(p)[0]]);
  const fill=(key,filter,target)=>{for(const p of roster.filter(filter).sort((a,b)=>score(b)-score(a)||a.age-b.age)){if(l[key].length>=target)break;if(!used.has(String(p.id))){l[key].push(p.id);used.add(String(p.id));}}};
  fill('goalies',p=>p.pos==='MV'&&p.age<=20&&!p.academy?.loan,2);
  fill('defense',p=>p.pos==='B'&&p.age<=20&&!p.academy?.loan,6);
  fill('forwards',p=>!['MV','B'].includes(p.pos)&&p.age<=20&&!p.academy?.loan,12);
  return l;
}
function juniorSetLineupSlot(group,index,id){
  if(!['forwards','defense','goalies'].includes(group)||!Number.isInteger(index)||index<0||juniorLocked())return;
  const lineup=ensureJuniorLineup(),p=(state.juniors?.roster||[]).find(p=>String(p.id)===String(id));
  const fits=p&&p.age<=20&&!p.academy?.loan&&(group==='goalies'?p.pos==='MV':group==='defense'?p.pos==='B':!['MV','B'].includes(p.pos));
  if(id&&!fits)return;
  for(const key of ['forwards','defense','goalies'])lineup[key]=lineup[key].filter((x,i)=>String(x)!==String(id)||key===group&&i===index);
  lineup[group][index]=id||null;lineup[group]=lineup[group].filter((x,i)=>x||i<index);
  save();render();
}
function juniorLineupRank(p,lineup=ensureJuniorLineup()){
  const group=p.pos==='MV'?'goalies':p.pos==='B'?'defense':'forwards',index=lineup[group].findIndex(id=>String(id)===String(p.id));
  return {group,index,line:group==='forwards'?Math.floor(index/3):group==='defense'?Math.floor(index/2):index};
}
const juniorCalendarMatchPlanBase=juniorMatchPlan;
juniorMatchPlan=function(club=managerClub(),round=state.round){
  if(club!==managerClub())return juniorCalendarMatchPlanBase(club,round);
  const all=juniorWorldRoster(club),lineup=ensureJuniorLineup();
  const pool=all.filter(p=>p.age<=20&&!p.academy?.loan&&medicalReady(p)&&p.fatigue<80&&juniorMatchUsage(p,club)!=='rest');
  const seconds=new Map(all.map(p=>[String(p.id),0])),usage=p=>({priority:1.35,sheltered:.65,auto:1})[juniorMatchUsage(p,club)]||1;
  const ordered=(group,filter)=>{const selected=(lineup[group]||[]).map(id=>pool.find(p=>String(p.id)===String(id))).filter(Boolean),rest=pool.filter(filter).filter(p=>!selected.includes(p));return [...selected,...rest];};
  const allocationWeight=p=>{const r=juniorLineupRank(p,lineup),base=r.group==='forwards'?[1.35,1.15,.95,.75][Math.max(0,r.line)]||.65:r.group==='defense'?[1.25,1,.8][Math.max(0,r.line)]||.7:1;return base*usage(p);};
  const allocate=(players,budget,cap=3600)=>{let remaining=budget,active=players.slice();while(remaining>0&&active.length){const total=active.reduce((n,p)=>n+allocationWeight(p),0),share=remaining;let progress=0;for(const p of active){const id=String(p.id),room=Math.max(0,Math.min(cap,medicalLimit(p))-(seconds.get(id)||0)),grant=Math.min(room,Math.max(1,Math.floor(share*allocationWeight(p)/Math.max(.01,total))),remaining);seconds.set(id,(seconds.get(id)||0)+grant);remaining-=grant;progress+=grant;}if(!progress)break;active=active.filter(p=>(seconds.get(String(p.id))||0)<Math.min(cap,medicalLimit(p)));}return remaining===0;};
  const goalies=ordered('goalies',p=>p.pos==='MV'),backs=ordered('defense',p=>p.pos==='B'),forwards=ordered('forwards',p=>!['MV','B'].includes(p.pos));
  let goalieLeft=3600;for(const p of goalies){const grant=Math.min(goalieLeft,medicalLimit(p));seconds.set(String(p.id),grant);goalieLeft-=grant;if(!goalieLeft)break;}
  const defenseOK=allocate(backs,7200),forwardOK=allocate(forwards,10800),playable=goalies.length>0&&backs.length>=2&&forwards.length>=3&&goalieLeft===0&&defenseOK&&forwardOK;
  if(!playable)for(const id of seconds.keys())seconds.set(id,0);
  return {playable,seconds,starter:goalies.find(p=>(seconds.get(String(p.id))||0)>0)?.id??null,lineup:true};
};
function juniorLineupOptions(group,selected){
  const roster=(state.juniors?.roster||[]).filter(p=>p.age<=20&&!p.academy?.loan&&(group==='goalies'?p.pos==='MV':group==='defense'?p.pos==='B':!['MV','B'].includes(p.pos)));
  return `<option value="">— tom plats —</option>${roster.map(p=>`<option value="${p.id}" ${String(p.id)===String(selected)?'selected':''}>${trainingSafe(p.name)} · ${p.pos} · ${p.age}</option>`).join('')}`;
}
function juniorLineupView(){
  const l=ensureJuniorLineup(),slot=(group,index,label)=>`<label>${label}<select onchange="juniorSetLineupSlot('${group}',${index},this.value)">${juniorLineupOptions(group,l[group][index])}</select></label>`;
  return `<details class="dv-report junior-lineup" open><summary>J20-kedjor & matchtrupp</summary><p class="dv-note">Kedjeordningen styr juniortränarens istidsviktning. Individuell matchroll kan fortfarande ge större eller mindre ansvar, och medicinska gränser gäller alltid.</p><div class="junior-lineup-grid"><section><h3>Forwards</h3>${Array.from({length:4},(_,line)=>`<fieldset><legend>Kedja ${line+1}</legend>${[0,1,2].map(slotIndex=>slot('forwards',line*3+slotIndex,['VF','C','HF'][slotIndex])).join('')}</fieldset>`).join('')}</section><section><h3>Backar</h3>${Array.from({length:3},(_,pair)=>`<fieldset><legend>Backpar ${pair+1}</legend>${slot('defense',pair*2,'Vänster')}${slot('defense',pair*2+1,'Höger')}</fieldset>`).join('')}<h3>Målvakter</h3>${slot('goalies',0,'Start')}${slot('goalies',1,'Backup')}</section></div></details>`;
}
const juniorCalendarWorldViewWithCalendar=juniorWorldView;
juniorWorldView=function(){const html=juniorCalendarWorldViewWithCalendar(),needle=juniorCalendarView();return html.includes(needle)?html.replace(needle,juniorLineupView()+needle):juniorLineupView()+html;};

function managerJ20BriefView(){
  if(state.season?.phase!=='regular')return '';const next=juniorCalendarNext();if(!next)return '';
  const days=calGap(state.calendar.date,next.date);if(days>2)return '';
  const plan=juniorMatchPlan(managerClub(),next.round),label=days===0?'IDAG':days===1?'IMORGON':'OM 2 DAGAR';
  return `<section class="manager-day-preview j20-day-preview"><div><span class="desk-kicker">J20 ${label}</span><strong>${trainingSafe(next.opponent)} · ${next.venue}</strong><p>${plan.playable?'Juniortruppen kan täcka en hel match med nuvarande uttagning.':'Juniortruppen kan inte täcka en hel match inom nuvarande medicinska gränser.'} Kedjor och matchroller styr istidsfördelningen.</p></div>${deskLink('J20-kedjor & kalender',{page:'juniors'})}</section>`;
}
const juniorCalendarMorningBase=managerLifeMorningView;
managerLifeMorningView=function(){return juniorCalendarMorningBase()+managerJ20BriefView();};
