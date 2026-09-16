#!/usr/bin/env python3
"""Build shivaa-update-v126.zip — film budget + the glow + the desktop layer.

Layout: site files at the ZIP ROOT (no cms/ prefix) so extracting inside
public_html puts index.html, sw.js, js/..., css/... where they belong.
api.php / .htaccess / db.json deliberately NOT shipped (rates + catalogue
byte-identical). No media: v126 ships code only — the nine owner films and
every poster are already live from v125.

Applies on top of v125.
"""
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
CMS = ROOT / 'cms'
OUT = ROOT / 'shivaa-update-v126.zip'

FILES = [
    'index.html',          # release stamp 126 + the v126 layer
    'sw.js',               # shell shivaa-shell-v126 + precache parity
    'js/app.js',           # APP_REL 126 + ?v=126 stamps
    'js/v116.js',          # ?v=126 stamp
    'js/v117.js',          # boost.js re-stamped ?v=46 -> ?v=126
    'js/v125.js',          # films start cold (preload none + data-film + want flag)
    'js/boost.js',         # five eager films -> cold, governor-driven
    'js/v126.js',          # NEW · the film budget, the glow, the desktop layer
    'css/v126.css',        # NEW · glow + gutter rails + desktop showcase
]
ROOT_FILES = ['DEPLOY-v126.md']

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
assert not any(n.endswith(('.php', '.htaccess')) for n in names), 'no server files in this zip'
print('%s — %d files, %.0f KB' % (OUT.name, len(names), OUT.stat().st_size / 1024))
for n in sorted(names):
    print('   ', n)
