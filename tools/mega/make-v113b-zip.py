#!/usr/bin/env python3
"""Build shivaa-update-v113.zip — the v113 + v113b upload bundle.

Layout: site files at the ZIP ROOT (no cms/ prefix) so extracting inside
public_html puts index.html, api.php, css/, js/, images/ where they belong.
Only the files this release touches are included.
"""
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
CMS = ROOT / 'cms'
OUT = ROOT / 'shivaa-update-v113.zip'

FILES = [
    'index.html', 'sw.js', 'api.php',
    'css/v113.css',
    'js/app.js', 'js/auth.js',
] + ['images/categories/%s.jpg' % k for k in (
    'rings', 'necklaces', 'earrings', 'bangles', 'bracelets', 'chains', 'pendants',
    'mangalsutra', 'bajubandh', 'rakhdi', 'aad', 'sheeshphool', 'hathphool',
    'punach', 'bridalanklets', 'nosepins', 'silver')]

STORE = {'.mp4', '.pdf', '.zip', '.rar'}

ROOT_FILES = ['DEPLOY-v113.md']          # repo-level docs, still land at the zip root

with zipfile.ZipFile(OUT, 'w', zipfile.ZIP_DEFLATED) as z:
    for rel in FILES:
        f = CMS / rel
        if not f.exists():
            raise SystemExit('missing: ' + str(f))
        z.write(f, rel, compress_type=zipfile.ZIP_STORED if f.suffix in STORE else zipfile.ZIP_DEFLATED)
    for rel in ROOT_FILES:
        f = ROOT / rel
        if not f.exists():
            raise SystemExit('missing: ' + str(f))
        z.write(f, rel)

print('%s — %d files, %.0f KB' % (OUT.name, len(FILES) + len(ROOT_FILES), OUT.stat().st_size / 1024))
