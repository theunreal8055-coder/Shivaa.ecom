#!/usr/bin/env python3
"""Build shivaa-update-v128.zip — THE FILM BUDGET ("velocity" release).

Every film on the site mounts cold (poster up, URL in data-film, zero
bytes) and js/v128.js is the only thing that hands out film bytes:
armed near the viewport, played at its own gate, capped at 4 films on a
desktop / 3 on a phone / 0 under Save-Data, nothing before the page has
settled (load + 2.2 s). Pure speed — no design, route, price or rate is
touched.

Layout: site files at the ZIP ROOT (no cms/ prefix) so extracting inside
public_html puts index.html, sw.js, js/... where they belong.
api.php / .htaccess / db.json deliberately NOT shipped (rates + catalogue
byte-identical, owner locks). Applies on top of v125 + v127.
"""
import hashlib
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
CMS = ROOT / 'cms'
OUT = ROOT / 'shivaa-update-v128.zip'

FILES = [
    'index.html',
    'sw.js',
    'js/app.js',
    'js/boost.js',
    'js/v117.js',
    'js/v125.js',
    'js/v128.js',
]
ROOT_FILES = ['DEPLOY-v128.md']

with zipfile.ZipFile(OUT, 'w', zipfile.ZIP_DEFLATED) as z:
    for rel in FILES:
        f = CMS / rel
        if not f.exists():
            raise SystemExit('missing: ' + str(f))
        z.write(f, rel)
    for rel in ROOT_FILES:
        f = ROOT / rel
        if not f.exists():
            raise SystemExit('missing: ' + str(f))
        z.write(f, rel)

names = zipfile.ZipFile(OUT).namelist()
assert not any(n.startswith('cms/') for n in names), 'zip must be root-layout'
forbidden = ('api.php', '.htaccess', 'db.json')
assert not any(n.split('/')[-1] in forbidden for n in names), 'owner locks must not ship'
print('%s — %d files, %.0f KB' % (OUT.name, len(names), OUT.stat().st_size / 1024))
print('md5:', hashlib.md5(OUT.read_bytes()).hexdigest())
for n in sorted(names):
    print('   ', n)
