#!/usr/bin/env python3
"""Build shivaa-update-v156.zip — Shivaa's own rates (24K premium) + 4 bug fixes.

Nine files, root layout, unzipped straight into public_html/cms/:
  api.php  index.html  sw.js  manifest.webmanifest  manifest.json
  js/app.js  js/v107.js  js/v120.js  js/admin.js

The file list is DERIVED from `git diff --name-only <branch-point> -- cms/`
plus any untracked file under cms/, so nothing this branch touched can silently
drop out of the zip (the v142 lesson). Two derived files are then excluded on
purpose, and the exclusion is PROVEN rather than asserted:

  data/db.json — never ships. The live database belongs to the server; the zip
                 would overwrite 77 live product rows, the order book and the
                 owner's settings with repo demo data.
  js/bot.js, js/v109.js — rebranded in the repo for consistency, but neither is
                 loaded by index.html nor precached by sw.js (bot.js has been
                 out of the shell since v99, v109.js never went in). Shipping
                 them would change nothing on the live site. The builder strips
                 comments out of the shell and fails if either name turns up in
                 executable code — the day someone re-wires them, the zip
                 refuses to build without them.

CSS is untouched by this release, so no stylesheet ships (and none may: a
re-stamped stylesheet paired with a year-immutable cached one is the v126
"all elements scattered" failure mode).
"""
import hashlib
import re
import subprocess
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
CMS = ROOT / 'cms'
OUT = ROOT / 'shivaa-update-v156.zip'
BRANCH_POINT = 'b3e7f6dd36699c5c68b3b55e50e4d957eb380d5a'      # v155, the tip this branch left from

NEVER = {'data/db.json', '.htaccess'}
DEAD = {'js/bot.js', 'js/v109.js'}

EXPECT = {
    'api.php', 'index.html', 'sw.js', 'manifest.webmanifest', 'manifest.json',
    'js/app.js', 'js/v107.js', 'js/v120.js', 'js/admin.js',
}


def sh(*a):
    return subprocess.run(a, cwd=ROOT, capture_output=True, text=True, check=True).stdout


changed = [l.strip()[len('cms/'):] for l in sh('git', 'diff', '--name-only', BRANCH_POINT, '--', 'cms/').splitlines() if l.strip().startswith('cms/')]
untracked = [l.strip()[len('cms/'):] for l in sh('git', 'ls-files', '--others', '--exclude-standard', 'cms/').splitlines() if l.strip().startswith('cms/')]

files = sorted(set(changed + untracked) - NEVER - DEAD)
missing, extra = EXPECT - set(files), set(files) - EXPECT
if missing or extra:
    raise SystemExit('file list drifted — missing: %s extra: %s' % (sorted(missing), sorted(extra)))

# ── prove the two exclusions are still dead code ────────────────────────────
shell = (CMS / 'index.html').read_text(encoding='utf-8') + (CMS / 'sw.js').read_text(encoding='utf-8')
code = re.sub(r'/\*[\s\S]*?\*/|<!--[\s\S]*?-->|//[^\n]*', '', shell)
for d in sorted(DEAD):
    if d in code or Path(d).name in code:
        raise SystemExit('%s is referenced by executable shell code — it is NOT dead and must ship' % d)

with zipfile.ZipFile(OUT, 'w', zipfile.ZIP_DEFLATED) as z:
    for rel in files:
        f = CMS / rel
        if not f.exists():
            raise SystemExit('missing: ' + str(f))
        z.write(f, rel)

names = zipfile.ZipFile(OUT).namelist()
assert not any(n.startswith('cms/') for n in names), 'zip must be root-layout'
assert not any('db.json' in n or n == '.htaccess' for n in names), 'db.json/.htaccess must never ship'
assert not any(n.startswith('css/') for n in names), 'no stylesheet changed in v156 — none may ship'

# ── what MUST be inside ─────────────────────────────────────────────────────
MARKERS = [
    # the release moves as one lockstep triple, loaders included
    ('index.html', 'window.__SHIVAA_REL=156;'),
    ('index.html', '/js/app.js?v=156'),
    ('index.html', '/js/v107.js?v=156'),
    ('index.html', '/js/v120.js?v=156'),
    ('sw.js', "shivaa-shell-v156"),
    ('sw.js', "'/js/app.js?v=156'"),
    ('sw.js', "'/js/v107.js?v=156'"),
    ('sw.js', "'/js/v120.js?v=156'"),
    ('js/app.js', 'const APP_REL = 156;'),
    ('js/app.js', "injectScript('/js/admin.js?v=' + APP_REL)"),
    ('api.php', "'rel'   => 156,"),
    # the owner's order: 24K carries the same premium as 22K, 18K derives
    ('api.php', 'function gold24_premium(array $db): int'),
    ('api.php', ': gold22_premium($db);'),
    ('api.php', 'function gold18_premium(array $db): int'),
    ('api.php', "'shivaa' => $retail,"),
    ('api.php', "'jaipur' => $retail,"),          # the alias a cached v155 shell still reads
    ('api.php', "'gold24Premium'"),
    ('js/admin.js', 'gold24Premium'),
    ('js/app.js', '24K Shivaa premium'),
    ('js/app.js', '✦ SHIVAA MARKET RATE'),
    # BUG 1 — the retail-basis lift, and the raw series kept beside it
    ('js/app.js', 'merged.history = retailHistory(merged.historySpot, ratePremiums(r));'),
    ('js/app.js', 'function retailHistory(hist, prem)'),
    ('js/app.js', 'pinned ? \'pinned · none added\''),
    # BUG 2 — the footer's arithmetic (spot re-derived from the anchor)
    ('js/v107.js', 'Math.round(Number(AL.goldPerG) * 0.9167)'),
    ('js/v107.js', 'Shivaa premium = '),
    ('js/v107.js', 'pinned its own counter rate'),
    # BUG 3 — the empty hash is a real hash
    ('js/v120.js', "return location.hash || '#/';"),
    # BUG 4 — the chart guard
    ('js/app.js', 'if (data.length < 2) return;'),
    ('js/app.js', 'i / Math.max(1, data.length - 1)'),
    # the render-time brand filter, and the manifests that go with it
    ('js/app.js', 'const brandRate = s =>'),
    ('manifest.webmanifest', 'Shivaa’s own bullion rate'),
    ('manifest.json', 'live Shivaa rates'),
]

# ── what must be GONE from executable code (comments are stripped first) ────
ABSENT = [
    ('index.html', '__SHIVAA_REL=155;'),
    ('index.html', 'Jaipur'),
    ('js/app.js', 'const APP_REL = 155;'),
    ('js/app.js', 'JAIPUR MARKET RATE'),
    ('js/app.js', "'MCX LIVE' : 'JAIPUR LIVE'"),
    ('js/app.js', '22K Jaipur premium'),
    ('js/app.js', 'Jaipur bullion rate'),
    ('js/v107.js', 'Jaipur premium'),
    ('js/v107.js', 'Jaipur'),
    ('js/v120.js', 'Jaipur'),
    ('sw.js', 'shivaa-shell-v155'),
    ('api.php', "'rel'   => 155,"),
    ('manifest.webmanifest', 'Jaipur'),
    ('manifest.json', 'Jaipur'),
]

with zipfile.ZipFile(OUT) as z:
    bad, gone = [], []
    for name, marker in MARKERS:
        if marker.encode() not in z.read(name):
            bad.append('%s ← %r' % (name, marker))
    for name, marker in ABSENT:
        raw = re.sub(rb'/\*[\s\S]*?\*/|<!--[\s\S]*?-->|//[^\n]*', b'', z.read(name))
        if marker.encode() in raw:
            gone.append('%s still carries %r' % (name, marker))
    if bad or gone:
        raise SystemExit('ZIP VERIFICATION FAILED:\n  ' + '\n  '.join(bad + gone))

body = OUT.read_bytes()
print('%s — %d files, %.0f KB' % (OUT.name, len(names), OUT.stat().st_size / 1024))
print('md5    %s' % hashlib.md5(body).hexdigest())
print('sha256 %s' % hashlib.sha256(body).hexdigest())
for n in sorted(names):
    print('   ', n)
print('all %d v156 markers present inside the built zip ✦' % len(MARKERS))
print('all %d stale v155 / Jaipur-brand strings absent from executable code ✦' % len(ABSENT))
