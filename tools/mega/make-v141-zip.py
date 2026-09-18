#!/usr/bin/env python3
"""Build shivaa-update-v141.zip — the admin panel wasn't being refreshed.

The Cashfree One Click Checkout switch lives in js/admin.js, but app.js loaded
it as /js/admin.js?v=128 — a pre-v139 stamp that .htaccess serves as immutable
for a year, so the owner's browser kept the OLD admin.js with no switch.

Fix: re-stamp the bundle to ?v=141 and ship the admin.js file itself so the
live server's copy is guaranteed to hold the switch regardless of past uploads.

Layout: site files at the ZIP ROOT (no cms/ prefix). File list is derived from
`git diff --name-only <branch-point> -- cms/` PLUS the new untracked files, so
nothing committed on this branch can silently drop out. js/admin.js is added to
the list explicitly — it is byte-identical to the branch point but is the entire
reason this release exists.
"""
import subprocess
import zipfile
import hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
CMS = ROOT / 'cms'
OUT = ROOT / 'shivaa-update-v141.zip'
BRANCH_POINT = 'f8c1c9625a64616158cfff6c42e2dc287a75ec7f'

NEVER = {'.htaccess', 'data/db.json'}


def sh(*a):
    return subprocess.run(a, cwd=ROOT, capture_output=True, text=True, check=True).stdout


changed = [l.strip()[len('cms/'):] for l in sh('git', 'diff', '--name-only', BRANCH_POINT, '--', 'cms/').splitlines() if l.strip()]
untracked = [l.strip()[len('cms/'):] for l in sh('git', 'ls-files', '--others', '--exclude-standard', 'cms/').splitlines() if l.strip()]

files = sorted(set(changed + untracked) - NEVER)
# The admin bundle is the point of this release: ship it even though its bytes
# equal the branch point (the live copy may be stuck on a stale upload).
if 'js/admin.js' not in files:
    files.append('js/admin.js')
files = sorted(set(files))

EXPECT = {'index.html', 'sw.js', 'js/app.js', 'js/admin.js'}
missing = EXPECT - set(files)
extra = set(files) - EXPECT
if missing or extra:
    raise SystemExit('file list drifted — missing: %s extra: %s' % (sorted(missing), sorted(extra)))

ROOT_FILES = ['DEPLOY-v141.md']

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
    ('index.html', 'window.__SHIVAA_REL=141;'),
    ('index.html', '/js/app.js?v=141'),
    ('index.html', '/js/v116.js?v=141'),
    ('index.html', '/js/v117.js?v=141'),
    ('sw.js', "shivaa-shell-v141"),
    ('sw.js', "'/js/app.js?v=141'"),
    ('sw.js', "'/js/v116.js?v=141'"),
    ('sw.js', "'/js/v117.js?v=141'"),
    ('js/app.js', 'const APP_REL = 141;'),
    ('js/app.js', "injectScript('/js/admin.js?v=141')"),
    ('js/admin.js', 'Cashfree One Click Checkout'),
    ('js/admin.js', 'name="cfOcc"'),
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
    print('\nall %d fix markers present inside the built zip ✦' % len(MARKERS))
    print('all %d stale references absent from executable code ✦' % len(ABSENT))
