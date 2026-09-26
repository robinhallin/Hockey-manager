'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {execFileSync} = require('node:child_process');
const format = require('./competition-format.js');
const data = require('./scripts/europe-data.cjs');
const catalog = require('./data/europe/catalog.json');
const pack = JSON.parse(require('node:zlib').gunzipSync(fs.readFileSync('data/europe/players.json.gz')));

function assertBalanced(games, clubs, gamesPerClub) {
  const rounds = new Map(), meetings = new Map();
  for (const g of games) {
    assert.ok(clubs.includes(g.home) && clubs.includes(g.away));
    assert.notEqual(g.home, g.away);
    if (!rounds.has(g.round)) rounds.set(g.round, new Set());
    for (const club of [g.home, g.away]) {
      assert.ok(!rounds.get(g.round).has(club), 'one game per club and local round');
      rounds.get(g.round).add(club);
    }
    const key = [g.home, g.away].sort().join('|');
    meetings.set(key, (meetings.get(key) || 0) + 1);
  }
  for (const club of clubs) {
    assert.equal(games.filter(g => g.home === club).length, gamesPerClub / 2);
    assert.equal(games.filter(g => g.away === club).length, gamesPerClub / 2);
  }
  assert.equal(meetings.size, clubs.length * (clubs.length - 1) / 2);
  assert.ok([...meetings.values()].every(n => n === 4));
}

test('all 45 clubs have stable identities, source links and preparation status', () => {
  assert.equal(data.validateCatalog(catalog), true);
  assert.equal(catalog.clubs.length, 45);
  assert.deepEqual(catalog.leagues.map(l => l.regular.teams), [14, 14, 17]);
  for (const club of catalog.clubs) assert.match(club.crest.source, /^https:\/\//);
  const broken = structuredClone(catalog);
  broken.clubs[1].aliases.push(broken.clubs[0].name);
  assert.throws(() => data.validateCatalog(broken), /Ambiguous/);
});

test('three generated seasons balance opponents, home ice, dates and Finnish byes', () => {
  for (const league of catalog.leagues) {
    const clubs = catalog.clubs.filter(c => c.league === league.id).map(c => c.id);
    const games = format.schedule(league, clubs, catalog.season);
    assertBalanced(games, clubs, league.regular.gamesPerClub);
    assert.equal(games.length, clubs.length * league.regular.gamesPerClub / 2);
    assert.equal(new Set(games.map(g => g.id)).size, games.length);
    assert.equal(games[0].date, league.regular.start);
    assert.equal(games.at(-1).date, league.regular.end);
    assert.ok(games.every(g => g.league === league.id && g.scheduleKind === 'generated'));
    if (league.id === 'FI_LIIGA') {
      assert.equal(games.at(-1).round, 68);
      const byeRound = Array.from({length: 68}, (_, i) => i + 1).find(r =>
        !games.some(g => g.round === r && (g.home === clubs[0] || g.away === clubs[0])));
      const date = games.find(g => g.round === byeRound).date;
      const next = format.next(games, clubs[0], date);
      if (next) assert.ok(next.date > date);
    }
    assert.throws(() => format.schedule(league, clubs, '2027-28'), /season/);
  }
});

test('mixed competitions progress by dates and never return a completed fixture twice', () => {
  const games = catalog.leagues.flatMap(l => format.schedule(l,
    catalog.clubs.filter(c => c.league === l.id).map(c => c.id), catalog.season));
  const first = format.due(games, '2026-09-01');
  assert.equal(first.length, 8);
  assert.ok(first.every(g => g.league === 'FI_LIIGA'));
  first.forEach(g => { g.played = true; });
  assert.equal(format.due(games, '2026-09-01').length, 0);
  assert.ok(format.due(games, '2026-09-15').some(g => g.league === 'CZ_ELH'));
  assert.ok(format.due(games, '2026-09-15').some(g => g.league === 'CH_NL'));
  assert.throws(() => format.due(games, '2026-02-30'), /Invalid/);
  assert.throws(() => format.roundRobin(['a', 'a']), /distinct/);
  assert.throws(() => format.roundRobin(['a', 'b'], 3), /even/);
});

test('Swedish fixture order and serialized shape remain identical to the prior generator', () => {
  const clubs = Array.from({length: 14}, (_, i) => `club-${i}`), before = [];
  let round = 1;
  for (let cycle = 0; cycle < 4; cycle++) {
    const rotating = [...clubs];
    for (let r = 0; r < clubs.length - 1; r++, round++) {
      for (let i = 0; i < clubs.length / 2; i++) {
        const a = rotating[i], b = rotating[rotating.length - 1 - i];
        before.push({round, home: (r + cycle) % 2 ? b : a, away: (r + cycle) % 2 ? a : b,
          played: false, homeGoals: null, awayGoals: null});
      }
      rotating.splice(1, 0, rotating.pop());
    }
  }
  assert.equal(JSON.stringify(format.roundRobin(clubs)), JSON.stringify(before));
});

test('source imports keep unknown facts unknown and reject duplicate or unresolved identities', () => {
  const row = data.readSources().raw['ch-players'][0];
  const [p] = data.normalizePlayers([row], 'nationalleague', catalog, {key: 'test'});
  assert.equal(p.nationality, null);
  assert.equal(p.contract, null);
  assert.equal(p.association.confirmedRegistration, false);
  assert.throws(() => data.normalizePlayers([row, row], 'nationalleague', catalog, {}), /duplicate/);
  assert.throws(() => data.normalizePlayers([{...row, teamId: 'missing'}], 'nationalleague', catalog, {}), /Unknown player club/);
  assert.throws(() => data.normalizePlayers([{...row, birth: '2026-02-30'}], 'nationalleague', catalog, {}), /identity/);
  const pending = data.normalizePlayers([{...row, position: 'unknown'}], 'nationalleague', catalog, {})[0];
  assert.equal(pending.position, null);
  assert.ok(pending.missing.includes('position'));
});

test('goalie appearances, saves and missing samples are not confused with dressed games or zeroes', () => {
  const goalie = data.normalizeStats({goalkeeper: true, games: 40, playedGames: 36,
    blockedOrSavedShots: 829, goalsAgainst: 92}, 'liiga', '2025-26', {});
  assert.equal(goalie.gp, 36);
  assert.equal(goalie.saves, 829);
  assert.equal(goalie.shotsAgainst, 921);
  assert.ok(Math.abs(goalie.sv - .9001) < .0001);
  const empty = data.normalizeStats({goalkeeper: true, games: 3, playedGames: 0}, 'liiga', '2025-26', {});
  assert.equal(empty.gp, 0); assert.equal(empty.sv, null); assert.equal(empty.saves, null);
  assert.throws(() => data.normalizeStats({position: 'goalkeeper', svs: 4, sa: 3}, 'nationalleague', '2025-26', {}), /exceed/);
  assert.throws(() => data.normalizeStats({}, 'liiga', '2026-27', {}), /completed/);
});

test('attribute previews reuse the existing model and retain individual uncertainty', () => {
  assert.equal(pack.players.length, 928);
  assert.equal(new Set(pack.players.map(p => p.id)).size, 928);
  const estimated = pack.players.filter(p => p.estimate);
  assert.equal(estimated.length, 751);
  for (const p of estimated) {
    assert.ok(Object.values(p.estimate.attributes).every(n => Number.isFinite(n) && n >= 1 && n <= 20));
    assert.equal(Object.keys(p.estimate.attributes).length, p.position === 'G' ? 6 : 15);
    assert.equal(p.estimate.status, 'uncalibrated-europe-preview');
    assert.ok(p.estimate.potential.low <= p.estimate.potential.high);
    assert.ok(p.stats.every(s => ['24-25', '25-26'].includes(s.season)));
  }
  const sample = structuredClone(estimated.slice(0, 3)), saved = sample.map(p => p.estimate);
  data.estimatePlayers(sample, catalog.checked);
  assert.deepEqual(sample.map(p => p.estimate), saved);
  const insufficient = {...sample[0], stats: [], estimate: null};
  data.estimatePlayers([insufficient], catalog.checked);
  assert.equal(insufficient.estimate, null);
});

test('identity matches require review and never silently merge namesakes', () => {
  const p = pack.players[0], same = {id: 'ep:123', name: p.name, birth: p.birth};
  const before = JSON.stringify(p);
  assert.equal(data.identityCandidates([p], [same])[0].status, 'review-required');
  assert.equal(data.identityCandidates([p], [{...same, birth: '1990-01-01'}]).length, 0);
  assert.equal(JSON.stringify(p), before);
});

test('all retained source and crest bytes match provenance; generated data is reproducible', () => {
  assert.equal(Object.keys(data.readSources().raw).length, 8);
  const images = catalog.clubs.filter(c => c.crest.file);
  assert.equal(images.length, 31);
  for (const club of images) assert.equal(data.hash(fs.readFileSync(club.crest.file)), club.crest.sha256);
  execFileSync(process.execPath, ['scripts/build-europe-data.cjs', '--check']);
});

test('Swiss opt-in and Europe preparation do not alter an established Swedish career on reload', () => {
  const {boot} = require('./scripts/career-test-fixture.cjs');
  const game = boot(undefined, {production: true});
  game.run('startCareerWithClub("HV71");save()');
  assert.equal(game.run('state.teams.length'), 28);
  assert.deepEqual(Array.from(game.run('Object.keys(activeLeagueNames())')), ['SHL', 'HA']);
  assert.equal(game.run('state.schedule.length'), 728);
  assert.equal(game.run('createSchedule(Object.fromEntries(TEAM_DATA.map(t=>[t[0],"SHL"]))).length'), 364);
  const before = game.run('JSON.stringify({world:state.world,rosters:state.clubRosters,schedule:state.schedule})');
  const reloaded = boot(game.storage.value, {production: true});
  assert.equal(reloaded.run('JSON.stringify({world:state.world,rosters:state.clubRosters,schedule:state.schedule})'), before);
  const report = data.readiness(catalog, pack.players);
  assert.ok(report.every(l => l.targetMode === 'playable' && !l.playable && l.blockers.length));
});


test('club-level readiness excludes removed players and keeps missing evidence visible', () => {
  const report=data.readiness(catalog,pack.players);
  const fi=report.find(l=>l.id==='FI_LIIGA'),ch=report.find(l=>l.id==='CH_NL');
  assert.equal(fi.excludedRemoved,22);
  assert.equal(fi.clubCoverage.reduce((n,c)=>n+c.activeCandidates,0),493);
  assert.equal(ch.missingNationality,411);
  for(const league of report){
    assert.equal(league.clubCoverage.length,league.clubs);
    assert.equal(league.clubCoverage.reduce((n,c)=>n+c.sourcePlayers,0),league.sourcePlayers);
    for(const club of league.clubCoverage){
      assert.equal(club.goalies+club.defense+club.forwards+club.unknownPosition,club.activeCandidates);
      assert.equal(club.verifiedRegistrations,0,'a participation list is not registration proof');
      assert.equal(club.missingContracts,club.activeCandidates);
    }
  }
});
