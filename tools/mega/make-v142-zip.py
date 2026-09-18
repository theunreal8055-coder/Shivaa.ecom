#!/usr/bin/env python3
"""Build shivaa-update-v142.zip — Automatic Guest Checkout (One-Tap Buy).

v142 ships the guest express checkout: api.php (guest gate + access PIN +
per-order gateway-session cap + pay/config flag + return-PIN), js/app.js
(express buyer/page + guest order page), js/admin.js (the admin switch), and
the release triple re-stamped 141 → 142 with the staff bundle moving with it
(the v141 lesson: admin.js must never stay on a stale stamp).

Layout: site files at the ZIP ROOT (no cms/ prefix). The file list is derived
from `git diff --name-only <branch-point> -- cms/` PLUS new untracked files, so
nothing committed on this branch can silently drop out. data/db.json and
.htaccess are NEVER shipped.
"""
import subprocess
import zipfile
import hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
CMS = ROOT / 'cms'
OUT = ROOT / 'shivaa-update-v142.zip'
BRANCH_POINT = '6e8200d2a48bcd6faad6856db7131fb9be1743cb'

NEVER = {'.htaccess', 'data/db.json'}


def sh(*a):
    return subprocess.run(a, cwd=ROOT, capture_output=True, text=True, check=True).stdout


changed = [l.strip()[len('cms/'):] for l in sh('git', 'diff', '--name-only', BRANCH_POINT, '--', 'cms/').splitlines() if l.strip()]
untracked = [l.strip()[len('cms/'):] for l in sh('git', 'ls-files', '--others', '--exclude-standard', 'cms/').splitlines() if l.strip()]

files = sorted(set(changed + untracked) - NEVER)

EXPECT = {'index.html', 'sw.js', 'js/app.js', 'js/admin.js', 'api.php'}
missing = EXPECT - set(files)
extra = set(files) - EXPECT
if missing or extra:
    raise SystemExit('file list drifted — missing: %s extra: %s' % (sorted(missing), sorted(extra)))

ROOT_FILES = ['DEPLOY-v142.md']

with zipfile.ZipFile(OUT, 'w', zipfile.ZIP_DEFLATED) as z:
    for rel in files:
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
assert not any('db.json' in n or n == '.htaccess' for n in names), 'db.json/.htaccess must not ship'

body = OUT.read_bytes()
print('%s — %d files, %.0f KB' % (OUT.name, len(names), OUT.stat().st_size / 1024))
print('md5 %s' % hashlib.md5(body).hexdigest())
for n in sorted(names):
    print('   ', n)

MARKERS = [
    ('index.html', 'window.__SHIVAA_REL=142;'),
    ('index.html', '/js/app.js?v=142'),
    ('index.html', '/js/v116.js?v=142'),
    ('index.html', '/js/v117.js?v=142'),
    ('sw.js', "shivaa-shell-v142"),
    ('sw.js', "'/js/app.js?v=142'"),
    ('sw.js', "'/js/v116.js?v=142'"),
    ('sw.js', "'/js/v117.js?v=142'"),
    ('js/app.js', 'const APP_REL = 142;'),
    ('js/app.js', "injectScript('/js/admin.js?v=142')"),
    ('js/app.js', 'pages.express ='),
    ('js/admin.js', 'Automatic Guest Checkout (One-Tap Buy)'),
    ('js/admin.js', 'name="guestCheckout"'),
    ('api.php', 'guestBuyOk'),
    ('api.php', 'cashfree/return'),
]

ABSENT = [
    ('js/app.js', 'admin.js?v=128'),
]

with zipfile.ZipFile(OUT) as z:
    bad = []
    for name, marker in MARKERS:
        if marker.encode() not in z.read(name):
            bad.append('%s ← %r' % (name, marker))
    gone = []
    for name, marker in ABSENT:
        raw = z.read(name)
        import re as _re
        code = _re.sub(rb'/\*[\s\S]*?\*/', b'', raw)
        if marker.encode() in code:
            gone.append('%s still references %r' % (name, marker))
    if bad or gone:
        raise SystemExit('ZIP VERIFICATION FAILED:\n  ' + '\n  '.join(bad + gone))
    print('\nall %d v142 markers present inside the built zip ✦' % len(MARKERS))
    print('all %d stale references absent from executable code ✦' % len(ABSENT))
