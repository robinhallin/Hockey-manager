"use strict";
// Season totals are independent of the deliberately short recent-match journal.
const ACADEMY_ENVIRONMENTS={junior:'Juniorlaget',senior:'A-laget',loan:'Lån',unclassified:'Äldre, ej fördelat'};
function juniorSeasonPlayers(){return [...new Map([...juniorPlayers(),...(state.loans?.active||[]).filter(l=>l.owner===managerClub()).map(l=>findPlayerAnywhere(l.playerId)).filter(p=>p?.academy)].map(p=>[String(p.id),p])).values()];}
function juniorSeasonStart(p,year,legacy=false){
 const a=p.academy;a.seasons??=[];let record=a.seasons.find(s=>s.year===year&&s.club===managerClub());if(record)return record;
 const empty=()=>({games:0,seconds:0,goals:0,assists:0});
 record={version:1,year,club:managerClub(),partial:legacy,baseline:{...(a.baseline||p.attributes)},totals:Object.fromEntries(Object.keys(ACADEMY_ENVIRONMENTS).map(k=>[k,empty()])),events:[]};
 if(legacy){
  // Preserve known season totals; never pretend a truncated journal is complete.
  const l=a.leagueStats?.year===year?a.leagueStats:null;
  for(const k of ['games','seconds','goals','assists']){record.totals.junior[k]=Math.max(0,l?.[k]||0);record.totals.unclassified[k]=Math.max(0,(a[k]||0)-record.totals.junior[k]);}
  for(const h of a.history||[])if(h.year===year&&h.path==='senior'&&h.seconds>0){const t=record.totals.senior;t.games++;for(const k of ['seconds','goals','assists'])t[k]+=Math.max(0,h[k]||0);}
 }
 a.seasons.unshift(record);a.seasons=a.seasons.slice(0,10);return record;
}
function juniorSeasonRecord(p,environment,row,key){
 if(!p?.academy||!row||!Object.hasOwn(ACADEMY_ENVIRONMENTS,environment))return;
 if(!juniorSeasonPlayers().some(q=>samePlayerId(q.id,p.id)))return;
 const s=juniorSeasonStart(p,state.season.year,true),event=environment+':'+key;
 if(s.events.includes(event))return;s.events.push(event);
 if(!(row.seconds>0))return;
 const t=s.totals[environment];t.games++;for(const k of ['seconds','goals','assists'])t[k]+=Math.max(0,row[k]||0);
}
function juniorSeasonRow(p,year){
 const a=p.academy,s=a.seasons?.find(s=>s.year===year&&s.club===managerClub());if(!s)return null;
 const keys=Object.keys(PLAYER_ROLES[a.role]||{}).filter(k=>Number.isFinite(s.baseline[k])&&Number.isFinite(p.attributes[k])),changes=keys.map(k=>p.attributes[k]-s.baseline[k]);
 const totals=JSON.parse(JSON.stringify(s.totals)),seconds=Object.values(totals).reduce((n,t)=>n+t.seconds,0),games=Object.values(totals).reduce((n,t)=>n+t.games,0);
 return {id:p.id,name:p.name,age:p.age,pos:p.pos,role:a.role,path:a.path,totals,seconds,minutes:seconds/60,games,partial:s.partial,growth:changes.reduce((n,v)=>n+Math.max(0,v),0),net:changes.reduce((n,v)=>n+v,0),advice:juniorAdvice(p)};
}
function juniorAnnualReview(year=state.juniors?.year||state.season.year){
 ensureJuniors();const s=state.juniors;s.annualReviews??=[];
 const existing=s.annualReviews.find(r=>r.year===year&&(!r.club||r.club===managerClub()));if(existing)return existing;
 if(year!==s.year)return null;
 const rows=juniorSeasonPlayers().map(p=>juniorSeasonRow(p,year)).filter(Boolean).sort((a,b)=>b.growth-a.growth||b.seconds-a.seconds);
 const breakthroughs=rows.filter(r=>!r.partial&&r.growth>=2&&r.net>0&&r.games>=5&&r.seconds>=(r.pos==='MV'?9000:3000)).slice(0,3),stalled=rows.filter(r=>!r.partial&&r.net<=0&&r.seconds<900).slice(0,3),decisions=rows.filter(r=>r.age>=19||/A-lag|lån|låna|flytta/i.test(r.advice)).slice(0,5);
 const review={version:2,year,club:managerClub(),date:state.calendar.date,rows,breakthroughs,stalled,decisions,total:rows.length};s.annualReviews.unshift(review);s.annualReviews=s.annualReviews.slice(0,10);
 juniorReport(`Akademirapport ${seasonLabel(year)}`,[`${rows.length} talanger i klubbens uppföljning. Hela säsongens registrerade matchtid är fryst per miljö.`,...breakthroughs.flatMap(r=>['\n',playerMention(r),`: genombrottsindikation · +${r.growth} rollrelevanta attributsteg · ${Math.round(r.minutes)} min.`]),...decisions.flatMap(r=>['\n',playerMention(r),': nästa steg · '+r.advice])]);return review;
}
function juniorAnnualReviewsView(){
 return `<section class="dv-panel academy-annual"><h2>Akademins säsongsrapporter</h2><p class="dv-note">Frysta före säsongsskiftet. Genombrottsindikation kräver minst två positiva rollrelevanta attributsteg, positiv nettoutveckling och minst fem matcher med meningsfull sammanlagd istid (150 minuter för målvakter, 50 för utespelare). Istid ensam räcker inte.</p>${(state.juniors.annualReviews||[]).map(r=>`<details class="dv-report"><summary>${seasonLabel(r.year)} · ${trainingSafe(r.club||managerClub())} · ${r.total} talanger</summary>${r.version!==2?'<p>Äldre rapport: tidsunderlaget kan vara ofullständigt. Rapporten har bevarats, inte räknats om.</p>':`<p>Genombrottsindikation: ${r.breakthroughs.map(p=>trainingSafe(p.name)).join(', ')||'Inget tillräckligt underlag ännu'}.</p><div class="dv-scroll"><table><thead><tr><th>Spelare</th><th>Rollutveckling</th>${Object.values(ACADEMY_ENVIRONMENTS).map(label=>`<th>${label} · min</th>`).join('')}<th>Totalt · min</th></tr></thead><tbody>${r.rows.map(p=>`<tr data-academy-id="${trainingSafe(p.id)}"><th>${playerReference(p.id,p.name)}${p.partial?'<small>Ofullständigt äldre underlag · minst registrerad tid</small>':''}</th><td>${p.net>0?'+':''}${p.net}</td>${Object.keys(ACADEMY_ENVIRONMENTS).map(k=>`<td>${Math.round(p.totals[k].seconds/60)}</td>`).join('')}<td data-academy-total>${Math.round(p.minutes)}</td></tr>`).join('')}</tbody></table></div><p>Junior- och lånepoäng räknas inte som A-lagsproduktion. Detaljer per miljö:</p>${r.rows.map(p=>`<details><summary>${trainingSafe(p.name)} · nästa steg</summary><p>${trainingSafe(p.advice)}</p>${Object.entries(p.totals).map(([key,t])=>`<p>${ACADEMY_ENVIRONMENTS[key]}: ${t.games} matcher · ${Math.round(t.seconds/60)} min · ${t.goals}+${t.assists} poäng.</p>`).join('')}</details>`).join('')}`}</details>`).join('')||'<p>Första frysta rapporten kommer vid säsongsskiftet.</p>'}</section>`;
}

function validateAcademySeasonSave(s){
 const players=[...(s.juniors?.roster||[]),...Object.values(s.clubRosters||{}).flat(),...(s.playerWorld?.freeAgents||[])];
 const validTotals=t=>t&&Object.keys(ACADEMY_ENVIRONMENTS).every(k=>t[k]&&['games','seconds','goals','assists'].every(f=>Number.isFinite(t[k][f])&&t[k][f]>=0));
 for(const p of players)for(const r of p.academy?.seasons||[])if(r.version!==1||!Number.isInteger(r.year)||typeof r.club!=='string'||!r.baseline||!Array.isArray(r.events)||!validTotals(r.totals))throw Error('Ogiltiga säsongssummor i akademins utvecklingsunderlag.');
 for(const r of s.juniors?.annualReviews||[])if(r.version===2&&(!Number.isInteger(r.year)||!Array.isArray(r.rows)||!['breakthroughs','stalled','decisions'].every(k=>Array.isArray(r[k]))||r.rows.some(p=>!validTotals(p.totals)||!Number.isFinite(p.seconds)||p.seconds<0||!Number.isFinite(p.minutes))))throw Error('Ogiltig fryst akademirapport.');
}
