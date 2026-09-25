'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const zlib = require('node:zlib');
const data = require('./europe-data.cjs');
const format = require('../competition-format.js');
const root = data.ROOT;
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'data/europe/catalog.json')));
data.validateCatalog(catalog);
const {manifest, raw} = data.readSources();
const provenance = key => ({key, url: manifest[key].url, checked: manifest[key].checked,
  season: manifest[key].season, sha256: manifest[key].sha256});
const players = [
  ...data.normalizePlayers(raw['fi-players'], 'liiga', catalog, provenance('fi-players')),
  ...data.normalizePlayers(raw['ch-players'], 'nationalleague', catalog, provenance('ch-players'))
];
for (const year of [2025, 2026]) {
  for (const [prefix, provider] of [['fi', 'liiga'], ['ch', 'nationalleague']]) {
    const key = `${prefix}-stats-${year}`;
    data.attachHistoricalStats(players, raw[key], provider, manifest[key].season, provenance(key));
  }
}
data.estimatePlayers(players, catalog.checked);
players.sort((a, b) => a.id.localeCompare(b.id, 'en'));

// These are fresh-start source rows, never current career rosters or saved state.
const context = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(root, 'allsvenskan-data.js'), 'utf8'), context);
const existing = vm.runInContext('[...Object.values(SHL_DATABASE.clubs), ...Object.values(ALLSVENSKAN_DATABASE.clubs)].flatMap(c => c.players)', context);
const candidates = data.identityCandidates(players, existing);
const report = data.readiness(catalog, players, candidates);
const schedules = Object.fromEntries(catalog.leagues.map(league => [league.id,
  format.schedule(league, catalog.clubs.filter(c => c.league === league.id).map(c => c.id), catalog.season)]));
const outputs = {
  'players.json': {version: 1, checked: catalog.checked, season: catalog.season,
    status: 'staging-only', players},
  'identity-review.json': {version: 1, comparedWith: ['SHL_DATABASE', 'ALLSVENSKAN_DATABASE'],
    remainingScopes: ['north-america', 'free-agents', 'cross-europe-provider-duplicates', 'legacy-save-aliases'], candidates},
  'readiness.json': {version: 1, checked: catalog.checked, leagues: report,
    schedules: Object.entries(schedules).map(([id, games]) => ({id, games: games.length,
      rounds: Math.max(...games.map(g => g.round)), kind: 'generated-preview'}))}
};
if (process.argv.includes('--check')) {
  for (const [file, value] of Object.entries(outputs)) {
    const actual = file === 'players.json' ?
      zlib.gunzipSync(fs.readFileSync(path.join(root, 'data/europe', file + '.gz'))).toString('utf8') :
      fs.readFileSync(path.join(root, 'data/europe', file), 'utf8');
    if (actual !== JSON.stringify(value, null, 2) + '\n') throw new Error(`Stale generated data: ${file}`);
  }
} else {
  for (const [file, value] of Object.entries(outputs)) {
    const content = JSON.stringify(value, null, 2) + '\n';
    if (file === 'players.json') fs.writeFileSync(path.join(root, 'data/europe', file + '.gz'), zlib.gzipSync(content, {level: 9}));
    else fs.writeFileSync(path.join(root, 'data/europe', file), content);
  }
}
for (const league of report) {
  console.log(`${league.name}: ${league.clubs} clubs, ${league.sourcePlayers} source players, ${league.estimatedPlayers} attribute previews, ${league.downloadedCrests} crests; playable=${league.playable}`);
}
console.log(`Identity review: ${candidates.length} possible matches; no automatic merges.`);
