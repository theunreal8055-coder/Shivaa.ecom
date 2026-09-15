#!/usr/bin/env python3
"""Build shivaa-update-v121.zip — mobile smoothness pack.

Layout: site files at the ZIP ROOT (no cms/ prefix) so extracting inside
public_html puts index.html, sw.js, js/..., css/..., images/... where they
belong. api.php is deliberately NOT shipped (rates byte-identical to v120).
"""
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
CMS = ROOT / 'cms'
OUT = ROOT / 'shivaa-update-v121.zip'

FILES = [
    'index.html',
    'sw.js',
    'js/app.js',
    'css/v121.css',
    'images/banners/poster-heritage-m.jpg',
]
ROOT_FILES = ['DEPLOY-v121.md']

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
