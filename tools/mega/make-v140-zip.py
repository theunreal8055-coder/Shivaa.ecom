#!/usr/bin/env python3
"""Build shivaa-update-v140.zip — install popup removal + automatic login/landing.

Layout: site files at the ZIP ROOT (no cms/ prefix) so extracting inside
public_html puts index.html, sw.js, js/..., css/... where they belong.

Recipe (house rule, from the v127 lesson): the file list is derived from
`git diff --name-only <branch-point> -- cms/` PLUS the new untracked files, so
nothing committed on this branch can silently drop out of the zip.

.htaccess and data/db.json are deliberately NOT shipped (untouched). api.php is
NOT shipped this release — no server change was needed. js/v107.js, js/v116.js
and js/v117.js are not shipped either: only their ?v= stamp moved in
index.html, the files are byte-identical and a query string does not change the
file that is served.
"""
import subprocess
import zipfile
import hashlib
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
CMS = ROOT / 'cms'
OUT = ROOT / 'shivaa-update-v140.zip'
BRANCH_POINT = '5e0953285e6479b113deb7dc453b773955cc1f8f'

# never ship these, whatever the diff says
NEVER = {'.htaccess', 'data/db.json'}


def sh(*a):
    return subprocess.run(a, cwd=ROOT, capture_output=True, text=True, check=True).stdout


changed = [l.strip()[len('cms/'):] for l in sh('git', 'diff', '--name-only', BRANCH_POINT, '--', 'cms/').splitlines() if l.strip()]
untracked = [l.strip()[len('cms/'):] for l in sh('git', 'ls-files', '--others', '--exclude-standard', 'cms/').splitlines() if l.strip()]

files = sorted(set(changed + untracked) - NEVER)
# a stamp-only bump must not drag an unchanged file into the zip
STAMP_ONLY = {'js/v107.js', 'js/v116.js', 'js/v117.js'}
files = [f for f in files if f not in STAMP_ONLY]

EXPECT = {'index.html', 'sw.js', 'js/app.js', 'js/v119.js', 'js/v140.js',
          'css/v119.css', 'css/v120.css', 'css/v116.css', 'css/v140.css'}
missing = EXPECT - set(files)
extra = set(files) - EXPECT
if missing or extra:
    raise SystemExit('file list drifted — missing: %s extra: %s' % (sorted(missing), sorted(extra)))

ROOT_FILES = ['DEPLOY-v140.md']

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

# ── the v137.1 lesson: grep INSIDE the built zip for every fix marker ──────
MARKERS = [
    ('index.html', 'window.__SHIVAA_REL=140;'),
    ('index.html', '/js/v140.js?v=140'),
    ('index.html', '/css/v140.css?v=140'),
    ('index.html', '/css/v119.css?v=140'),
    ('index.html', '/css/v120.css?v=140'),
    ('index.html', '/js/v119.js?v=140'),
    ('index.html', '/js/app.js?v=140'),
    ('sw.js', "shivaa-shell-v140"),
    ('sw.js', "'/js/v140.js?v=140'"),
    ('sw.js', "'/css/v140.css?v=140'"),
    ('sw.js', "'/js/app.js?v=140'"),
    ('js/app.js', 'const APP_REL = 140;'),
    ('js/app.js', 'function welcomeSession()'),
    ('js/app.js', "location.hash = '#/partner'"),
    ('js/v140.js', "getElementById('shvInstallChip')"),
    ('css/v140.css', '.shv-v140-marker'),
]
# the install popup must be ABSENT from the shipped executable code, not merely
# unreferenced — both in the file that built it and the styles that drew it.
ABSENT = [
    ('js/v119.js', 'beforeinstallprompt'),
    ('js/v119.js', 'shvInstallChip'),
    ('js/v119.js', 'Keep Shivaa on your home screen'),
    ('css/v119.css', '#shvInstallChip'),
    ('css/v120.css', '#shvInstallChip'),
    ('css/v116.css', 'shv-install'),
]
with zipfile.ZipFile(OUT) as z:
    bad = []
    for name, marker in MARKERS:
        if marker.encode() not in z.read(name):
            bad.append('%s ← %r' % (name, marker))
    gone = []
    for name, marker in ABSENT:
        raw = z.read(name)
        # only executable code / live rules count: comments naming the removed
        # popup (explaining WHY it was removed) are fine and expected.
        code = re.sub(rb'/\*[\s\S]*?\*/', b'', raw)
        if marker.encode() in code:
            gone.append('%s still carries %r' % (name, marker))
    if bad or gone:
        raise SystemExit('ZIP VERIFICATION FAILED:\n  ' + '\n  '.join(bad + gone))
    print('\nall %d fix markers present inside the built zip ✦' % len(MARKERS))
    print('all %d removed-popup traces absent from executable code ✦' % len(ABSENT))
