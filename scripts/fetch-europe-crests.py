"""Fetch the exact official images referenced in the European preparation catalog.

No guessing alternate URLs or generating lookalike artwork. Failed items remain
source-located and are reported; an HTTP error is never saved as an image.
Run from the repository root: python scripts/fetch-europe-crests.py
"""
import concurrent.futures
import datetime
import hashlib
import json
import pathlib
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
CATALOG = ROOT / 'data/europe/catalog.json'


def image_extension(data):
    if data.startswith(b'\x89PNG\r\n\x1a\n'):
        return 'png'
    if data.startswith(b'\xff\xd8\xff'):
        return 'jpg'
    if data[:4] == b'RIFF' and data[8:12] == b'WEBP':
        return 'webp'
    raise ValueError('Expected a raster image, received another content type')


def fetch(club):
    crest = club['crest']
    if crest['file'] and (ROOT / crest['file']).exists():
        data = (ROOT / crest['file']).read_bytes()
        if hashlib.sha256(data).hexdigest() == crest['sha256']:
            return club['id'], 'cached'
    try:
        with urllib.request.urlopen(crest['source'], timeout=20) as response:
            data = response.read(4 * 1024 * 1024 + 1)
        if len(data) > 4 * 1024 * 1024:
            raise ValueError('Image exceeds size limit')
        extension = image_extension(data)
        path = ROOT / 'assets/crests/europe' / (club['id'].replace(':', '-') + '.' + extension)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        crest.update(file=str(path.relative_to(ROOT)), sha256=hashlib.sha256(data).hexdigest(),
                     status='downloaded', checked=datetime.datetime.now(datetime.timezone.utc).date().isoformat())
        return club['id'], 'downloaded'
    except Exception as error:
        return club['id'], str(error)


if __name__ == '__main__':
    catalog = json.loads(CATALOG.read_text())
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
        results = list(pool.map(fetch, catalog['clubs']))
    CATALOG.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n')
    for key, result in results:
        print(key, result)
    print('Available:', sum(bool(c['crest']['file']) for c in catalog['clubs']), '/', len(catalog['clubs']))
