#!/usr/bin/env python3
"""Fetch dated roster evidence. Never converts camp participation into a playing contract.
Raw responses are cached outside the repo; only factual, minimized fields are emitted.
Usage: python scripts/import-na-roster-evidence.py --cache /tmp/na-rosters --date YYYY-MM-DD
"""
import argparse
import concurrent.futures
import datetime
import hashlib
import json
from pathlib import Path
import urllib.parse
import urllib.request

ESPN = 'https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/'
AHL = 'https://lscluster.hockeytech.com/feed/index.php?'
POSITIONS = {'C': 'C', 'LW': 'VF', 'RW': 'HF', 'D': 'B', 'G': 'MV', 'F': 'F'}


def fetch(url, cache, key):
    path = cache / (key + '.json')
    if path.exists():
        raw = path.read_bytes()
    else:
        with urllib.request.urlopen(url, timeout=30) as response:
            raw = response.read(8_000_000)
        json.loads(raw)
        path.write_bytes(raw)
    return json.loads(raw), hashlib.sha256(raw).hexdigest()


def ahl_url(**kwargs):
    return AHL + urllib.parse.urlencode(dict(feed='modulekit', key='50c2cd9b5e18e390', fmt='json', client_code='ahl', lang='en', **kwargs))


def ahl_players(value):
    # Roster response includes staff arrays. Only player rows have a player_id.
    if isinstance(value, list):
        return [p for item in value for p in ahl_players(item)]
    if isinstance(value, dict):
        if value.get('player_id'):
            return [value]
        return [p for item in value.values() if isinstance(item, (list, dict)) for p in ahl_players(item)]
    return []


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cache', type=Path, required=True)
    parser.add_argument('--date', type=datetime.date.fromisoformat, required=True)
    parser.add_argument('--output', type=Path, default=Path('north-america-roster-data.js'))
    args = parser.parse_args()
    args.cache.mkdir(parents=True, exist_ok=True)
    marker = args.cache / 'snapshot-date.txt'
    if marker.exists() and marker.read_text().strip() != str(args.date):
        raise ValueError('Cache belongs to another date; use a fresh dated directory')
    marker.write_text(str(args.date))
    year = args.date.year if args.date.month >= 7 else args.date.year - 1
    season = f'{year}-{str(year + 1)[2:]}'
    data, _ = fetch(ESPN + 'teams?limit=40', args.cache, 'teams')
    teams = [row['team'] for row in data['sports'][0]['leagues'][0]['teams']]
    if len(teams) != 32:
        raise ValueError('Expected exactly 32 NHL teams; refusing partial snapshot')
    seasons, _ = fetch(ahl_url(view='seasons'), args.cache, 'ahl-seasons')
    found = [s for s in seasons['SiteKit']['Seasons'] if s['season_name'] == season + ' Regular Season']
    if len(found) != 1:
        raise ValueError('AHL season missing or ambiguous; no fallback to previous year')
    ahl_season = found[0]['season_id']
    d, _ = fetch(ahl_url(view='teamsbyseason', season_id=ahl_season), args.cache, 'ahl-teams')
    ahl_teams = d['SiteKit']['Teamsbyseason']
    if len(ahl_teams) != 32:
        raise ValueError('Expected exactly 32 AHL teams')

    def nhl_team(team):
        url = ESPN + f"teams/{team['id']}/roster"
        d, digest = fetch(url, args.cache, 'nhl-' + team['id'])
        if d.get('season', {}).get('year') != year + 1:
            raise ValueError('Stale season for ' + team['displayName'])
        players = []
        for group in d['athletes']:
            for p in group['items']:
                pos = p['position']['abbreviation']
                born = p.get('dateOfBirth', '')[:10]
                if born:
                    datetime.date.fromisoformat(born)
                if pos not in POSITIONS or not p.get('id') or not p.get('fullName'):
                    raise ValueError('Unknown player shape')
                players.append([str(p['id']), p['fullName'], POSITIONS[pos], born,
                                p.get('birthCountry', {}).get('abbreviation', ''),
                                p.get('hand', {}).get('abbreviation', '')])
        if not players or len({p[0] for p in players}) != len(players):
            raise ValueError('Empty or duplicate roster: ' + team['displayName'])
        print(team['displayName'], len(players), flush=True)
        return dict(club=team['displayName'].replace('Montreal', 'Montréal'), league='NHL',
                    source=url, digest=digest, sourceSeason=d['season']['displayName'],
                    kind='preseason-list' if d['season'].get('type') == 1 else 'roster-list', players=players)

    def ahl_team(team):
        url = ahl_url(view='roster', season_id=ahl_season, team_id=team['id'])
        d, digest = fetch(url, args.cache, 'ahl-' + team['id'])
        roster = d['SiteKit'].get('Roster')
        if not isinstance(roster, (list, dict)):
            raise ValueError('Missing AHL roster field')
        rows = ahl_players(roster)
        players = []
        for p in rows:
            name = p.get('name') or (p.get('first_name', '') + ' ' + p.get('last_name', '')).strip()
            pos = p.get('position', '')
            if pos not in POSITIONS or not name:
                raise ValueError('Unrecognized AHL player; inspect response before import')
            players.append([str(p['player_id']), name, POSITIONS[pos], p.get('birthdate', ''), '', p.get('shoots', '')])
        print(team['name'], len(players), flush=True)
        return dict(club=team['name'], league='AHL', source=url, digest=digest,
                    sourceSeason=season, kind='roster-list' if players else 'not-published', players=players)

    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        nhl = list(pool.map(nhl_team, teams))
        ahl = list(pool.map(ahl_team, ahl_teams))
    # Cross-club identities are evidence conflicts, not automatic transfers.
    locations = {}
    for team in nhl + ahl:
        for p in team['players']:
            locations.setdefault(team['league'] + ':' + p[0], []).append(team['club'])
    conflicts = {k: v for k, v in locations.items() if len(v) > 1}
    out = dict(version=1, checked=str(args.date), season=season, fields=['sourceId', 'name', 'position', 'birthDate', 'birthCountry', 'shoots'],
               teams=nhl + ahl, conflicts=conflicts)
    # Atomic publication only after all 64 source responses pass validation.
    output = '"use strict";\n// Generated factual evidence; not a confirmed playing roster. See NORTH-AMERICA-ROSTERS.md.\nconst NA_ROSTER_EVIDENCE=' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n'
    temporary = args.output.with_suffix('.tmp')
    temporary.write_text(output, encoding='utf-8')
    temporary.replace(args.output)
    print('Wrote', args.output, 'unique source identities', len(locations), 'conflicts', len(conflicts))


if __name__ == '__main__':
    main()
