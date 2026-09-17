#!/usr/bin/env python3
"""Build shivaa-update-v129.zip — surface the reason Cashfree refuses.

TWO files, not three. `sw.js` is deliberately NOT shipped: owner rule #3
(recorded in MEMORY.md after v126) says the service worker is never swapped in
a repair — an out-of-band shell swap makes every device wipe and re-fetch its
whole cache, which is the v126 / "v125-fix" failure mode. The cache-busting the
patch needs is achieved by a brand-new filename (`js/v129.js?v=129`), which no
cache can be holding, plus `index.html` (served `access plus 0 seconds`).

Layout: site files at the ZIP ROOT (no cms/ prefix) so extracting inside
public_html puts index.html and js/v129.js where they belong.
api.php / .htaccess / db.json / sw.js / app.js deliberately NOT shipped.
Applies on top of the live v125 + v127 + v128 tree.
"""
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
CMS = ROOT / 'cms'
OUT = ROOT / 'shivaa-update-v129.zip'

FILES = [
    'index.html',
    'js/v129.js',
]
ROOT_FILES = ['DEPLOY-v129.md']

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
assert 'sw.js' not in names, 'owner rule #3: a repair never swaps sw.js'
assert 'js/app.js' not in names, 'v129 overrides app.js at runtime; it does not replace it'
print('%s — %d files, %.0f KB' % (OUT.name, len(names), OUT.stat().st_size / 1024))
for n in sorted(names):
    print('   ', n)
