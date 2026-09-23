#!/usr/bin/env python3
"""Extract public federation tables from downloaded HTML; no login or live runtime fetch.

python scripts/import-swedish-observations.py /path/to/html
Expected filenames are documented in SOURCES below. Only factual cells are retained.
Identity resolution and generation are separate: node scripts/build-player-evidence.cjs.
"""
import json
import sys
from html.parser import HTMLParser
from pathlib import Path

KINDS = {'goalies': 'LeadingGoaliesSVS', 'fo': 'FaceOffLeaders',
         'scoring': 'ScoringLeaders', 'eff': 'ScoringEfficiencyLeaders'}
COMPETITIONS = {'25-26': {'shl': 18263, 'ha': 18266},
                '24-25': {'shl': 15977, 'ha': 15986}}


class Table(HTMLParser):
    def __init__(self):
        super().__init__()
        self.rows, self.row, self.cell = [], None, None

    def handle_starttag(self, tag, attrs):
        if tag == 'tr':
            self.row = []
        if tag in ('th', 'td'):
            self.cell = []

    def handle_data(self, value):
        if self.cell is not None:
            self.cell.append(value)

    def handle_endtag(self, tag):
        if tag in ('th', 'td') and self.cell is not None:
            if self.row is not None:
                self.row.append(' '.join(''.join(self.cell).split()))
            self.cell = None
        if tag == 'tr' and self.row is not None:
            self.rows.append(self.row)
            self.row = None


def extract(folder):
    tables = []
    for season, leagues in COMPETITIONS.items():
        for league, competition in leagues.items():
            for kind, endpoint in KINDS.items():
                filename = (f'roster-{league}-2024-{endpoint}.html' if season == '24-25'
                            else f'roster-{league}-{kind}.html')
                if filename == 'roster-shl-goalies.html':
                    filename = 'roster-goalies.html'
                parser = Table()
                html = (folder / filename).read_text()
                # A season-selector link can lead to playoffs; refuse those tables.
                title = html.split('<title>', 1)[1].split('</title>', 1)[0]
                assert 'Play Out' not in title and 'slutspel' not in title.lower(), title
                parser.feed(html)
                rows = [r for r in parser.rows if len(r) > 6]
                assert rows and rows[0][0] == 'Rk', filename
                headers = rows.pop(0)
                assert all(len(r) == len(headers) for r in rows), filename
                tables.append({'source': f'https://stats.swehockey.se/Players/Statistics/{endpoint}/{competition}',
                               'checked': '2026-09-23', 'season': season,
                               'league': 'SHL' if league == 'shl' else 'HockeyAllsvenskan',
                               'phase': 'regular', 'kind': kind,
                               'coverage': 'published table; skater leader lists are limited to 25',
                               'rows': [dict(zip(headers, r)) for r in rows]})
    return {'version': 1, 'tables': tables}


if __name__ == '__main__':
    result = extract(Path(sys.argv[1]))
    Path('data/player-stat-observations.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(f"Extracted {len(result['tables'])} tables; no identities or ratings inferred.")
