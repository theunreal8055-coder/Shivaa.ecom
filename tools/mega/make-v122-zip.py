#!/usr/bin/env python3
"""Build shivaa-update-v122.zip — B2B design desk: search + sort + sticky bill bar.

Layout: site files at the ZIP ROOT (no cms/ prefix) so extracting inside
public_html puts index.html, sw.js, js/..., css/... where they belong.
api.php is deliberately NOT shipped (rates + billing math byte-identical).
Applies on top of v120 + v121.
"""
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
CMS = ROOT / 'cms'
OUT = ROOT / 'shivaa-update-v122.zip'

FILES = [
    'index.html',
    'sw.js',
    'js/app.js',
    'js/v122.js',
    'css/v122.css',
]
ROOT_FILES = ['DEPLOY-v122.md']

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

print('%s — %d files, %.0f KB' % (OUT.name, len(FILES) + len(ROOT_FILES), OUT.stat().st_size / 1024))
