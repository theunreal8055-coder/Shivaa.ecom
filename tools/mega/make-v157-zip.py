#!/usr/bin/env python3
"""Build shivaa-update-v157.zip — 9 files, root layout into public_html/cms/.

api.php · css/styles.css · hallmark.php · index.html · manifest.json ·
manifest.webmanifest · sw.js · js/app.js · js/admin.js

css/styles.css rides along because the rate-card wrapper class was renamed
jaipur-hero → shivaa-hero (the last "Jaipur" left in shipped markup); the file
is otherwise byte-identical to the v107 drop, and its ?v= stamp moved 107 → 157
in both index.html and the sw precache so no browser can pair the new markup
with a year-immutable old stylesheet.

data/db.json is NEVER shipped (uploading it would overwrite live orders,
settings and the live catalogue — the storefront copy is normalised at the
display boundary instead, see cms/hallmark.php · shv_storefront_copy()).
.htaccess is never shipped either.
"""
import hashlib
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
CMS = ROOT / 'cms'
OUT = ROOT / 'shivaa-update-v157.zip'

FILES = ['api.php', 'css/styles.css', 'hallmark.php', 'index.html', 'manifest.json', 'manifest.webmanifest', 'sw.js', 'js/app.js', 'js/admin.js']

with zipfile.ZipFile(OUT, 'w', zipfile.ZIP_DEFLATED) as z:
    for rel in FILES:
        f = CMS / rel
        if not f.exists():
            raise SystemExit('missing: ' + str(f))
        z.write(f, rel)

names = zipfile.ZipFile(OUT).namelist()
assert sorted(names) == sorted(FILES), names
assert not any(n.startswith('cms/') for n in names)
assert not any('db.json' in n or n == '.htaccess' for n in names)

MARKERS = [
    ('index.html', 'window.__SHIVAA_REL=157;'),
    ('index.html', '/js/app.js?v=157'),
    ('sw.js', "shivaa-shell-v157"),
    ('sw.js', "'/js/app.js?v=157'"),
    ('js/app.js', 'const APP_REL = 157;'),
    # the last "Jaipur" in shipped markup — the rate-card wrapper class
    ('index.html', '/css/styles.css?v=157'),
    ('sw.js', "'/css/styles.css?v=157'"),
    ('css/styles.css', '/* ── Shivaa rates hero ── */'),
    ('css/styles.css', '.shivaa-hero{display:grid;grid-template-columns:1.15fr .85fr'),
    ('js/app.js', '<div class="shivaa-hero">'),
    # the sweep's last survivors
    ('js/app.js', 'LIVE SHIVAA RATE'),
    ('js/admin.js', 'BIS HALLMARKED · SHIVAA'),
    ('js/admin.js', '✦ Shivaa Jewellers · Shivaa live rates ✦'),
    ('manifest.json', 'live Shivaa rates'),
    ('manifest.webmanifest', '"name": "Shivaa Jewellers",'),
    ('hallmark.php', 'function shv_storefront_copy(string $s): string'),
    # the three new bug fixes
    ('js/app.js', 'function refreshComparePage()'),
    ('js/app.js', 'const _bbLive = () => {'),
    ('js/app.js', 'const _svLive = () => {'),
    ('js/app.js', 'const g24 = (state.rates && state.rates.gold24)'),
    # the 24K premium chain (carried forward from v156 — must not regress)
    ('api.php', "function gold24_premium(array $db): int"),
    ('api.php', "'gold24' => (int)round($g24) + $gp24,"),
    ('api.php', "'rel'   => 157,"),
]
ABSENT = [
    ('js/app.js', 'LIVE JAIPUR RATE'),
    ('css/styles.css', 'jaipur-hero'),
    ('index.html', 'styles.css?v=107'),
    ('sw.js', 'styles.css?v=107'),
    ('js/app.js', 'class="jaipur-hero"'),
    ('js/app.js', 'const APP_REL = 156;'),
    ('js/admin.js', 'BIS HALLMARKED · JAIPUR'),
    ('js/admin.js', 'Jaipur rates ✦'),
    ('index.html', '__SHIVAA_REL=156;'),
    ('js/app.js?v=156', ''),
]
ABSENT = [a for a in ABSENT if a[1]]

with zipfile.ZipFile(OUT) as z:
    bad = []
    for name, marker in MARKERS:
        if marker.encode() not in z.read(name):
            bad.append('%s ← %r' % (name, marker))
    gone = []
    for name, marker in ABSENT:
        if marker.encode() in z.read(name):
            gone.append('%s still has %r' % (name, marker))
    if ('js/app.js?v=156' in z.read('index.html').decode('utf-8')
            or 'shivaa-shell-v156' in z.read('sw.js').decode('utf-8')):
        gone.append('a v156 loader/shell stamp survived')
    if bad or gone:
        raise SystemExit('ZIP VERIFICATION FAILED:\n  ' + '\n  '.join(bad + gone))

body = OUT.read_bytes()
print('%s — %d files, %.0f KB' % (OUT.name, len(names), OUT.stat().st_size / 1024))
print('md5 %s' % hashlib.md5(body).hexdigest())
print('sha256 %s' % hashlib.sha256(body).hexdigest())
for n in names:
    print('   ', n)
print('all %d v157 markers present inside the built zip ✦' % len(MARKERS))
