#!/usr/bin/env python3
"""Build shivaa-update-v139.zip — bag / category page / payment page repair.

Layout: site files at the ZIP ROOT (no cms/ prefix) so extracting inside
public_html puts index.html, sw.js, js/..., css/... where they belong.

Recipe (house rule, from the v127 lesson): the file list is derived from
`git diff --name-only <branch-point> -- cms/` PLUS the new untracked files, so
nothing committed on this branch can silently drop out of the zip.

api.php IS shipped this time — v139 adds Cashfree One Click Checkout to the
create-order call. .htaccess and data/db.json are deliberately NOT shipped
(untouched). js/v116.js and js/v117.js are not shipped either: only their ?v=
stamp moved, the files are byte-identical and a query string does not change
the file that is served.
"""
import subprocess
import zipfile
import hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
CMS = ROOT / 'cms'
OUT = ROOT / 'shivaa-update-v139.zip'
BRANCH_POINT = 'ee30b4dd1e4eae50a8773056b255df9aa69c3d46'

# never ship these, whatever the diff says
NEVER = {'.htaccess', 'data/db.json'}


def sh(*a):
    return subprocess.run(a, cwd=ROOT, capture_output=True, text=True, check=True).stdout


changed = [l.strip()[len('cms/'):] for l in sh('git', 'diff', '--name-only', BRANCH_POINT, '--', 'cms/').splitlines() if l.strip()]
untracked = [l.strip()[len('cms/'):] for l in sh('git', 'ls-files', '--others', '--exclude-standard', 'cms/').splitlines() if l.strip()]

files = sorted(set(changed + untracked) - NEVER)
# a stamp-only bump must not drag an unchanged file into the zip: js/v116.js and
# js/v117.js are byte-identical, only their ?v= moved in index.html.
STAMP_ONLY = {'js/v116.js', 'js/v117.js'}
files = [f for f in files if f not in STAMP_ONLY]

EXPECT = {'index.html', 'sw.js', 'js/app.js', 'js/v139.js', 'css/v139.css', 'api.php', 'js/admin.js'}
missing = EXPECT - set(files)
extra = set(files) - EXPECT
if missing or extra:
    raise SystemExit('file list drifted — missing: %s extra: %s' % (sorted(missing), sorted(extra)))

ROOT_FILES = ['DEPLOY-v139.md']

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

body = OUT.read_bytes()
print('%s — %d files, %.0f KB' % (OUT.name, len(names), OUT.stat().st_size / 1024))
print('md5 %s' % hashlib.md5(body).hexdigest())
for n in sorted(names):
    print('   ', n)

# ── the v137.1 lesson: grep INSIDE the built zip for every fix marker ──────
MARKERS = [
    ('js/v139.js', "__shvNavigating = true"),
    ('js/v139.js', "cartDrawer"),
    ('js/v139.js', "foldCatList"),
    ('css/v139.css', ".mcta-bar.mcta-inline"),
    ('css/v139.css', "prefers-reduced-motion"),
    ('js/app.js', "const APP_REL = 139;"),
    ('js/app.js', "catChipsHTML"),
    ('js/app.js', "mcta-bar mcta-inline"),
    ('js/app.js', "shv_lastAddr"),
    ('index.html', "window.__SHIVAA_REL=139;"),
    ('index.html', "/js/v139.js?v=139"),
    ('sw.js', "shivaa-shell-v139"),
    ('api.php', "one_click_checkout"),
    ('api.php', "cashfree-occ-fallback"),
    ('api.php', "/extended"),
    ('js/admin.js', 'name="cfOcc"'),
]
with zipfile.ZipFile(OUT) as z:
    bad = []
    for name, marker in MARKERS:
        if marker.encode() not in z.read(name):
            bad.append('%s ← %r' % (name, marker))
    if bad:
        raise SystemExit('FIX MARKER MISSING FROM THE BUILT ZIP:\n  ' + '\n  '.join(bad))
    print('\nall %d fix markers present inside the built zip ✦' % len(MARKERS))
