#!/usr/bin/env python3
"""Build shivaa-update-v146.zip — 5 files, root layout into public_html ROOT.

api.php, index.html, sw.js, js/app.js, js/admin.js.
data/db.json and .htaccess are NEVER shipped.
"""
import hashlib
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
CMS = ROOT / 'cms'
OUT = ROOT / 'shivaa-update-v146.zip'

FILES = ['api.php', 'index.html', 'sw.js', 'js/app.js', 'js/admin.js']

with zipfile.ZipFile(OUT, 'w', zipfile.ZIP_DEFLATED) as z:
    for rel in FILES:
        f = CMS / rel
        if not f.exists():
            raise SystemExit('missing: ' + str(f))
        z.write(f, rel)

names = zipfile.ZipFile(OUT).namelist()
assert names == FILES or sorted(names) == sorted(FILES), names
assert not any(n.startswith('cms/') for n in names)
assert not any('db.json' in n or n == '.htaccess' for n in names)

MARKERS = [
    ('index.html', 'window.__SHIVAA_REL=146;'),
    ('index.html', '/js/app.js?v=146'),
    ('sw.js', "shivaa-shell-v146"),
    ('sw.js', "'/js/app.js?v=146'"),
    ('js/app.js', 'const APP_REL = 146;'),
    ('js/app.js', "injectScript('/js/admin.js?v=146')"),
    ('js/app.js', 'Type the <b>10-digit number you just saw in Truecaller</b>'),
    ('js/app.js', "location.hash='${fromCart ? '#/cart' : '#/shop'}'"),
    ('js/admin.js', 'Truecaller Partner Key'),
    ('js/admin.js', 'name="tcAppKey"'),
    ('api.php', "auth/truecaller/callback"),
    ('api.php', "auth/truecaller/result"),
    ('api.php', "auth/truecaller/config"),
    ('api.php', 'tcAppKey'),
    ('api.php', "$gPhone === '9999999999'"),
]
ABSENT = [
    ('js/app.js', 'Waiting for Truecaller verification…'),
    ('index.html', '__SHIVAA_REL=144;'),
    ('js/app.js', 'const APP_REL = 144;'),
    ('sw.js', 'shivaa-shell-v144'),
]

with zipfile.ZipFile(OUT) as z:
    bad = []
    for name, marker in MARKERS:
        if marker.encode() not in z.read(name):
            bad.append('%s ← %r' % (name, marker))
    gone = []
    for name, marker in ABSENT:
        if marker.encode() in z.read(name):
            gone.append('%s still has %r' % (name, marker))
    if bad or gone:
        raise SystemExit('ZIP VERIFICATION FAILED:\n  ' + '\n  '.join(bad + gone))

body = OUT.read_bytes()
print('%s — %d files, %.0f KB' % (OUT.name, len(names), OUT.stat().st_size / 1024))
print('md5 %s' % hashlib.md5(body).hexdigest())
for n in names:
    print('   ', n)
print('all %d v146 markers present inside the built zip ✦' % len(MARKERS))
