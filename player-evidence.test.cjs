'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const {execFileSync}=require('node:child_process');
const {boot}=require('./scripts/career-test-fixture.cjs');
const {measurement}=require('./scripts/build-player-evidence.cjs');
assert.equal(measurement(194,'lb','weight'),88);
assert.equal(measurement(75,'in','height'),191);
assert.throws(()=>measurement(194,'kg','weight'));
assert.throws(()=>measurement(88,'','weight'));
execFileSync(process.execPath,['scripts/build-player-evidence.cjs','--check']);
const {run:r,storage}=boot();
r('startCareerWithClub("Mora IK")');
assert.equal(r('haAge("2000-09-15")'),25,'age uses start date, not verification date');
assert.equal(r('haAge("2000-09-15","2026-09-23")'),26);
assert.equal(r('findPlayerAnywhere("ep-29607").research.weight'),88);
assert.equal(r('findPlayerAnywhere("ep-29607").research.height'),190);
assert.ok(r('findPlayerAnywhere("ep-29607").research.stats.some(s=>s.shotsAgainst>0)'),'compact save retains observed sample');
assert.ok(r('haResearchPanel(findPlayerAnywhere("ep-29607")).includes("Returkontroll")'),'unmeasured trait still explained');
assert.ok(r('findPlayerAnywhere("ep-29607").research.stats.flatMap(s=>s.sources||[]).every(s=>evidenceSourceURL(s).startsWith("https://stats.swehockey.se/Players/Statistics/"))'),'interned source paths restore original public URLs');
assert.equal(r('ALLSVENSKAN_DATABASE.clubs["Mora IK"].players.find(p=>p.id==="ep-29607").weight'),194,'raw facts retained for reproducibility');
assert.ok(r('Object.values(state.clubRosters).flat().every(p=>!p.research||p.research.weight>=45&&p.research.weight<=140)'));
assert.ok(r('Object.values(state.clubRosters).flat().filter(p=>p.research?.model).every(p=>p.social.basis==="neutral-unobserved"&&p.social.sensitivity===10&&p.social.loyalty===10)'));
// Unmeasured physical/mental traits do not become fake facts through convenient proxies.
r('globalThis.input={birth:"2002-03-01",position:"C",weight:70,stats:[{season:"25-26",league:"SHL",gp:40,goals:8,assists:12,pim:2}]};globalThis.changed=JSON.parse(JSON.stringify(input));changed.weight=120;changed.stats[0].pim=200');
assert.equal(r('JSON.stringify(evidenceProfile(input))'),r('JSON.stringify(evidenceProfile(changed))'));
r('changed.stats[0].goals=35;changed.stats[0].assists=50');
assert.ok(r('haAttributeProfile(changed).shooting>haAttributeProfile(input).shooting&&haAttributeProfile(changed).passing>haAttributeProfile(input).passing'));
for(const k of ['vision','decisions','positioning','workRate','strength','discipline','skating','puckControl'])assert.equal(r(`haAttributeProfile(changed).${k}`),r(`haAttributeProfile(input).${k}`),k);
// Splitting one season across two clubs must not apply the prior twice.
r('changed=JSON.parse(JSON.stringify(input));changed.stats=[{...input.stats[0],gp:20,goals:4,assists:6,team:"A"},{...input.stats[0],gp:20,goals:4,assists:6,team:"B"}]');
assert.equal(r('JSON.stringify(haAttributeProfile(input))'),r('JSON.stringify(haAttributeProfile(changed))'));
r('changed=JSON.parse(JSON.stringify(input));changed.stats.push({season:"26-27",league:"NHL",gp:50,goals:80,assists:80})');
assert.equal(r('JSON.stringify(evidenceProfile(input))'),r('JSON.stringify(evidenceProfile(changed))'),'post-start seasons excluded');
// Same SV and GP, different real shot exposure: uncertainty and influence differ.
r('globalThis.g={birth:"2000-01-01",position:"G",stats:[{season:"25-26",league:"SHL",gp:20,sv:.94,shotsAgainst:50,saves:47}]};globalThis.g2=JSON.parse(JSON.stringify(g));g2.stats[0].shotsAgainst=1000;g2.stats[0].saves=940');
assert.ok(r('haAttributeProfile(g2).reflexes>haAttributeProfile(g).reflexes'));
for(const k of ['reboundControl','handling','movement','composure'])assert.equal(r(`haAttributeProfile(g).${k}`),r(`haAttributeProfile(g2).${k}`));
r('changed=JSON.parse(JSON.stringify(input));changed.stats[0].faceoffAttempts=600;changed.stats[0].faceoffWins=390');
assert.ok(r('haAttributeProfile(changed).faceoffs>haAttributeProfile(input).faceoffs'));
// Similar-age prospects can have different scenarios; lack of evidence widens them.
r('globalThis.young={birth:"2006-01-01",position:"D",stats:[{season:"25-26",league:"SHL",gp:40},{season:"24-25",league:"HockeyAllsvenskan",gp:35}]};globalThis.sparse={...young,stats:[{season:"25-26",league:"J20 Nationell",gp:2}]}');
assert.ok(r('evidencePotential(young).central!==evidencePotential(sparse).central'));
assert.ok(r('(evidencePotential(sparse).high-evidencePotential(sparse).low)>(evidencePotential(young).high-evidencePotential(young).low)'));
// Profiles share public sources, but cannot reveal live private attributes/ceilings.
r('globalThis.external=state.clubRosters.AIK.find(p=>p.pos==="C");globalThis.unknown=JSON.stringify(playerAssessment(external));globalThis.sourceHTML=haResearchPanel(external);external.attributes.shooting=20;external.attributeGrowth=8;external.developmentForecast[1]=8');
assert.equal(r('JSON.stringify(playerAssessment(external))'),r('unknown'));
assert.equal(r('haResearchPanel(external)'),r('sourceHTML'));
r('scoutObserve(external.id,state.calendar.date,{force:true});globalThis.observed=JSON.stringify(playerAssessment(external));external.attributes.shooting=1;external.attributeGrowth=0;external.developmentForecast[1]=0');
assert.equal(r('JSON.stringify(playerAssessment(external))'),r('observed'),'snapshot frozen until next observation');
// Real training consumes the new room and survives save/reload; source facts do not.
r('globalThis.junior=managerRoster().find(p=>p.age<24&&p.pos!=="MV");globalThis.key=Object.keys(junior.attributes).find(k=>ensureDevelopment(junior).ceiling[k]>junior.attributes[k]);globalThis.before=junior.attributes[key];globalThis.facts=JSON.stringify(junior.research);junior.health.injury=null;developmentAdvance(junior,key,10000,"Individuellt fokus");save()');
assert.equal(r('junior.attributes[key]'),r('before+1'));
assert.equal(r('JSON.stringify(junior.research)'),r('facts'));
const loaded=boot(storage.value),id=r('junior.id'),key=r('key');
assert.equal(loaded.run('haResearchPanel(findPlayerAnywhere("ep-29607"))'),r('haResearchPanel(findPlayerAnywhere("ep-29607"))'),'source definitions and public history survive compact save');
assert.equal(loaded.run(`findPlayerAnywhere(${JSON.stringify(id)}).attributes[${JSON.stringify(key)}]`),r('before+1'));
assert.equal(loaded.run(`JSON.stringify(findPlayerAnywhere(${JSON.stringify(id)}).developmentModel)`),r('JSON.stringify(junior.developmentModel)'));
// An earlier real career remains authoritative, including data corrected for new games.
const old=JSON.parse(storage.value),p=old.clubRosters['Mora IK'].find(p=>p.id==='ep-29607');
old.playerDatabaseVersion='se-2026-09-06';p.research.weight=194;p.research.height=null;delete p.research.model;delete p.developmentForecast;
p.attributes.reflexes=19;p.salary=1234567;p.health.injury={name:'Sparad skada',days:3};
const legacy=boot(JSON.stringify(old));
assert.equal(legacy.run('findPlayerAnywhere("ep-29607").attributes.reflexes'),19);
assert.equal(legacy.run('findPlayerAnywhere("ep-29607").research.weight'),194);
assert.equal(legacy.run('findPlayerAnywhere("ep-29607").salary'),1234567);
assert.equal(legacy.run('findPlayerAnywhere("ep-29607").health.injury.name'),'Sparad skada');
assert.ok(!/NaN|undefined/.test(r('assessmentPanel(junior)+haResearchPanel(external)')));
const coverage=JSON.parse(fs.readFileSync('data/player-evidence-coverage.json'));
assert.equal(coverage.clubs.length,28);assert.equal(coverage.factsCorrected,46);
console.log('PASS: explicit units, deterministic rebuild, 28-club coverage, dated start, independent traits, sample-aware goalies/faceoffs/potential, no scout leaks, training and preserved saves.');
