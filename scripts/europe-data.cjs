'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const zlib = require('node:zlib');
const ROOT = path.resolve(__dirname, '..');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const copy = value => JSON.parse(JSON.stringify(value));
const text = value => typeof value === 'string' && value.trim() ? value.trim() : null;
const number = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
const nameKey = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

function validDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}

function readSources(root = ROOT) {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'data/europe/sources.json')));
  const raw = {};
  for (const [key, source] of Object.entries(manifest)) {
    if (!source.file) continue;
    const stored = fs.readFileSync(path.join(root, source.file));
    const bytes = source.file.endsWith('.gz') ? zlib.gunzipSync(stored) : stored;
    if (hash(bytes) !== source.sha256) throw new Error(`Source checksum mismatch: ${key}`);
    raw[key] = JSON.parse(bytes);
  }
  return {manifest, raw};
}

function validateCatalog(catalog) {
  if (catalog.version !== 1 || !validDate(catalog.checked) || !Array.isArray(catalog.clubs) || !Array.isArray(catalog.leagues)) {
    throw new Error('Invalid European catalog schema.');
  }
  const ids = new Set(), aliases = new Map();
  for (const club of catalog.clubs) {
    if (!text(club.id) || !text(club.name) || ids.has(club.id)) throw new Error('Invalid or duplicate club ID.');
    ids.add(club.id);
    if (!catalog.leagues.some(l => l.id === club.league)) throw new Error(`Unknown competition: ${club.id}`);
    for (const name of [club.name, ...club.aliases]) {
      const key = club.league + ':' + nameKey(name);
      if (aliases.has(key) && aliases.get(key) !== club.id) throw new Error(`Ambiguous club alias: ${name}`);
      aliases.set(key, club.id);
    }
  }
  const leagues = new Set();
  for (const league of catalog.leagues) {
    if (leagues.has(league.id)) throw new Error('Duplicate competition ID.');
    leagues.add(league.id);
    if (league.season !== catalog.season || league.targetMode !== 'playable' || league.status !== 'preparation') {
      throw new Error('This catalog prepares playable leagues; it does not activate them.');
    }
    if (catalog.clubs.filter(c => c.league === league.id).length !== league.regular.teams) {
      throw new Error(`Incomplete club membership: ${league.id}`);
    }
  }
  return true;
}

// Source association is not contract ownership. A participation list can contain
// loanees, temporary registrations and players who have since moved.
function normalizePlayers(rows, provider, catalog, source) {
  if (!['liiga', 'nationalleague'].includes(provider) || !Array.isArray(rows)) throw new Error('Unknown player source.');
  const fi = provider === 'liiga', league = fi ? 'FI_LIIGA' : 'CH_NL', seen = new Set();
  const positions = fi ? {GOALIE: 'G', DEFENSEMAN: 'D', STRIKER: 'F'} : {goalkeeper: 'G', defender: 'D', forwarder: 'F'};
  return rows.map(row => {
    const externalId = String(fi ? row.id : row.playerId);
    if (!/^\d+$/.test(externalId) || seen.has(externalId)) throw new Error(`Invalid or duplicate player ID: ${provider}:${externalId}`);
    seen.add(externalId);
    const clubExternalId = String(row.teamId).split(':')[0];
    const club = catalog.clubs.find(c => c.league === league && c.providerId === clubExternalId);
    if (!club) throw new Error(`Unknown player club: ${provider}:${clubExternalId}`);
    const name = [text(row.firstName), text(row.lastName)].filter(Boolean).join(' ');
    const birth = fi ? row.dateOfBirth : row.birth;
    if (!name || !validDate(birth)) throw new Error(`Missing player identity: ${provider}:${externalId}`);
    const position = positions[fi ? row.role : row.position] || null;
    const handedness = fi ? row.handedness : row.hand;
    return {
      id: `${provider}:${externalId}`, externalIds: {[provider]: externalId}, name, birth,
      position, nationality: text(row.nationality),
      shoots: ({LEFT: 'L', RIGHT: 'R', L: 'L', R: 'R'})[handedness] || null,
      height: number(row.height), weight: number(row.weight),
      association: {clubId: club.id, league, season: catalog.season,
        kind: fi ? 'official-player-list' : 'official-season-statistics-list',
        confirmedRegistration: false, removed: typeof row.removed === 'boolean' ? row.removed : null},
      contract: null, stats: [], estimate: null,
      sources: [source], missing: [!position && 'position', !text(row.nationality) && 'nationality',
        'contract', 'registration', position === 'F' && 'forward-position'].filter(Boolean)
    };
  });
}

function normalizeStats(row, provider, season, source) {
  if (!['2024-25', '2025-26'].includes(season)) throw new Error('Only completed evidence seasons are supported.');
  const fi = provider === 'liiga';
  if (!fi && provider !== 'nationalleague') throw new Error('Unknown statistics provider.');
  const goalie = fi ? row.goalkeeper === true : row.position === 'goalkeeper';
  // Liiga games includes dressed backup goalkeepers; playedGames counts appearances.
  const gp = number(fi ? row.playedGames : row.gp);
  const stats = {season: season.slice(2), league: fi ? 'Liiga' : 'NL', team: text(row.teamName),
    gp, goals: number(fi ? row.goals : row.g), assists: number(row.assists),
    faceoffWins: number(fi ? row.faceoffsWon : row.fow),
    faceoffAttempts: fi ? number(row.faceoffsTotal) :
      number(row.fow) !== null && number(row.fol) !== null ? row.fow + row.fol : null,
    sources: [source]};
  if (goalie) {
    const saves = number(fi ? row.blockedOrSavedShots : row.svs);
    const against = number(row.ga), conceded = number(row.goalsAgainst);
    const shots = fi ? saves !== null && conceded !== null ? saves + conceded : null : number(row.sa);
    if (shots !== null && saves !== null && saves > shots) throw new Error('Goalie saves exceed shots.');
    stats.saves = saves; stats.shotsAgainst = shots;
    stats.goalsAgainst = fi ? conceded : against;
    stats.sv = shots > 0 && saves !== null ? saves / shots : null;
    if (fi) stats.shotsAgainstDerivation = 'goalkeeper.blockedOrSavedShots + goalkeeper.goalsAgainst';
  }
  if (stats.faceoffAttempts !== null && stats.faceoffWins !== null && stats.faceoffWins > stats.faceoffAttempts) {
    throw new Error('Faceoff wins exceed attempts.');
  }
  return stats;
}

function attachHistoricalStats(players, rows, provider, season, source) {
  const byId = new Map(players.map(p => [p.id, p])), seen = new Set();
  for (const row of rows) {
    const id = `${provider}:${row.playerId}`;
    if (seen.has(id)) throw new Error(`Repeated season total: ${id}:${season}`);
    seen.add(id);
    const player = byId.get(id);
    if (!player) continue;
    if (row.birth && row.birth !== player.birth) throw new Error(`Birth date conflict: ${id}`);
    const stat = normalizeStats(row, provider, season, source);
    // Missing samples remain missing; zero appearances do not contribute evidence.
    if (stat.gp > 0) player.stats.push(stat);
  }
}

function estimatePlayers(players, checked, root = ROOT) {
  const context = vm.createContext({Date, Math});
  // Reuse the existing game model, rather than introducing a second ratings scale.
  for (const file of ['attributes.js', 'allsvenskan.js', 'player-evidence-model.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, {filename: file});
  }
  context.checked = checked;
  vm.runInContext('const ALLSVENSKAN_DATABASE = {asOf: checked};', context);
  const modelHash = hash(fs.readFileSync(path.join(root, 'player-evidence-model.js')));
  for (const player of players) {
    if (!player.position || !player.stats.length) continue;
    context.row = copy(player);
    const profile = copy(vm.runInContext('evidenceProfile(row)', context));
    player.estimate = {...profile, kind: 'game-estimate', status: 'uncalibrated-europe-preview',
      asOf: checked, modelSha256: modelHash,
      limitations: ['Only domestic 2024/25 and 2025/26 evidence collected.',
        'Unmeasured skills use role and league priors.',
        'Potential is a scenario range, not a measured fact.']};
  }
}

// Name + birth date suggests a review candidate only. Never overwrite an existing
// career person or equate identifiers from independent providers automatically.
function identityCandidates(players, existing) {
  const byKey = new Map();
  for (const person of existing) {
    const birth = person.birth || person.research?.birth;
    if (!birth) continue;
    const key = nameKey(person.name) + ':' + birth;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(String(person.id));
  }
  return players.flatMap(p => {
    const matches = [...new Set(byKey.get(nameKey(p.name) + ':' + p.birth) || [])].filter(id => id !== p.id);
    return matches.length ? [{id: p.id, name: p.name, birth: p.birth, candidateIds: matches, status: 'review-required'}] : [];
  });
}

function readiness(catalog, players, candidates = []) {
  return catalog.leagues.map(league => {
    const clubs = catalog.clubs.filter(c => c.league === league.id);
    const people = players.filter(p => p.association.league === league.id);
    const ids = new Set(people.map(p => p.id));
    return {id: league.id, name: league.name, targetMode: 'playable', playable: false,
      clubs: clubs.length, sourcePlayers: people.length,
      estimatedPlayers: people.filter(p => p.estimate).length,
      downloadedCrests: clubs.filter(c => c.crest.file).length,
      excludedRemoved: people.filter(p => p.association.removed === true).length,
      missingNationality: people.filter(p => !p.nationality).length,
      unverifiedRegistrations: people.filter(p => !p.association.confirmedRegistration).length,
      clubCoverage: clubs.map(club => {
        const source = people.filter(p => p.association.clubId === club.id);
        const active = source.filter(p => p.association.removed !== true);
        return {clubId: club.id, name: club.name, sourcePlayers: source.length,
          activeCandidates: active.length, excludedRemoved: source.length - active.length,
          goalies: active.filter(p => p.position === 'G').length,
          defense: active.filter(p => p.position === 'D').length,
          forwards: active.filter(p => p.position === 'F').length,
          unknownPosition: active.filter(p => !p.position).length,
          verifiedRegistrations: active.filter(p => p.association.confirmedRegistration).length,
          missingContracts: active.filter(p => !p.contract).length,
          missingEstimates: active.filter(p => !p.estimate).length};
      }),
      identityReviews: candidates.filter(c => ids.has(c.id)).length,
      blockers: [...(!people.length ? ['player-data-not-imported'] : []),
        'roster-registration-and-contract-verification', 'cross-provider-identity-resolution',
        'attribute-calibration-and-missing-evidence', 'career-and-club-office-integration',
        'date-based-multi-league-progression', 'league-specific-postseason',
        'transfer-loan-and-eligibility-rules', 'season-rollover-and-save-migration',
        'playable-career-acceptance-test', ...league.rulesPending,
        ...(clubs.some(c => !c.crest.file) ? ['crest-downloads'] : [])]};
  });
}

module.exports = {ROOT, hash, validDate, readSources, validateCatalog, normalizePlayers,
  normalizeStats, attachHistoricalStats, estimatePlayers, identityCandidates, readiness};
