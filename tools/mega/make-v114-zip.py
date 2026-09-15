#!/usr/bin/env python3
"""Build shivaa-update-v114.zip — checkout invoice FY TypeError fix.

Layout: site files at the ZIP ROOT (no cms/ prefix) so extracting inside
public_html puts api.php where it belongs.
"""
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
CMS = ROOT / 'cms'
OUT = ROOT / 'shivaa-update-v114.zip'

FILES = ['api.php']
ROOT_FILES = ['DEPLOY-v114.md']

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
