#!/usr/bin/env python3
"""Build shivaa-update-v124.zip — Punach swap + New In face + ?v=124 cache-bust.

Layout: site files at the ZIP ROOT (no cms/ prefix) so extracting inside
public_html puts index.html, sw.js, js/..., images/... where they belong.
api.php / .htaccess / db.json deliberately NOT shipped (rates + catalogue
byte-identical). Applies on top of v123.
"""
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
CMS = ROOT / 'cms'
OUT = ROOT / 'shivaa-update-v124.zip'

FILES = [
    'index.html',
    'sw.js',
    'js/app.js',
    'js/v116.js',
    'images/categories/punach.jpg',
    'images/categories/newin.jpg',
]
ROOT_FILES = ['DEPLOY-v124.md']

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
print('%s — %d files, %.0f KB' % (OUT.name, len(names), OUT.stat().st_size / 1024))
for n in sorted(names):
    print('   ', n)
