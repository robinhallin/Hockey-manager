"""Download new snapshots for review without replacing the checked-in evidence.

python scripts/fetch-europe-evidence.py --output /tmp/hockey-europe-review
Only URLs already recorded in sources.json are requested. Player facts and
statistics are fetched from public league endpoints; no credentials are used.
"""
import argparse
import concurrent.futures
import datetime
import hashlib
import json
import pathlib
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=pathlib.Path, required=True)
    args = parser.parse_args()
    destination = args.output.resolve()
    if destination.exists():
        parser.error('Use a new output directory; existing snapshots must not be overwritten.')
    destination.mkdir(parents=True)
    sources = json.loads((ROOT / 'data/europe/sources.json').read_text())
    checked = datetime.datetime.now(datetime.timezone.utc).date().isoformat()

    def fetch(item):
        key, source = item
        try:
            with urllib.request.urlopen(source['url'], timeout=25) as response:
                data = response.read(16 * 1024 * 1024 + 1)
            if len(data) > 16 * 1024 * 1024:
                raise ValueError('Response exceeds size limit')
            parsed = json.loads(data)
            if not isinstance(parsed, (dict, list)) or not parsed:
                raise ValueError('Expected non-empty JSON data')
            filename = key + '.json'
            (destination / filename).write_bytes(data)
            return key, {**source, 'file': filename, 'sha256': hashlib.sha256(data).hexdigest(),
                         'checked': checked, 'status': 'needs-review'}
        except Exception as error:
            return key, {'url': source['url'], 'status': 'failed', 'error': str(error)}

    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        results = dict(pool.map(fetch, [(k, v) for k, v in sources.items() if v.get('file')]))
    (destination / 'sources.json').write_text(json.dumps(results, ensure_ascii=False, indent=2) + '\n')
    failed = sum(v['status'] == 'failed' for v in results.values())
    print(f'{len(results)-failed} snapshots downloaded; {failed} failed. Review before updating the game data.')
    raise SystemExit(bool(failed))


if __name__ == '__main__':
    main()
