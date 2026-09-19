#!/usr/bin/env python3
"""Build shivaa-update-v159.zip — 11 files, root layout into public_html/cms/.

  api.php · css/styles.css · css/v116.css · hallmark.php · index.html ·
  manifest.json · manifest.webmanifest · sw.js · js/app.js · js/admin.js ·
  js/v116.js

CUMULATIVE on purpose: one extraction brings the live site fully current
whatever the owner last deployed (v156, v157 or v158 alike).

v159 = v158 + THE CATEGORY-TAP GUARANTEE
  · the panel no longer preventDefaults and hides the tile on the next tick, so
    closing it can never cancel the journey the tap started
  · shvNavTo gained a watchdog: if the shopper is still standing where they
    were 450 ms after a tile tap, the app walks them to the category (hash,
    then pushState + route as the last resort). It never fights a real
    navigation — it bails the moment the hash moves for any other reason.
  · an app-wide capture-phase guarantee for every category link (header panel,
    drawer list, home photos, shop chips, footer) that consumes nothing and
    only completes a tap that produced no navigation at all
  · the SCROLL dismissal is gone — it could hide a tile mid-tap
  · plus everything v158 fixed (one owner for #navCats, the scrim below the
    header, the 17 tiles built without an API call, the drawer list folding
    when the drawer closes) and everything v157 carried (Shivaa branding incl.
    the display-boundary normaliser, the 24K ₹398/g premium, the three
    in-place poll fixes)

data/db.json is NEVER shipped (uploading it would overwrite live orders,
settings and the live catalogue — storefront copy is normalised at the display
boundary in cms/hallmark.php · shv_storefront_copy()). .htaccess is never
shipped either.
"""
import hashlib
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
CMS = ROOT / 'cms'
OUT = ROOT / 'shivaa-update-v159.zip'

FILES = ['api.php', 'css/styles.css', 'css/v116.css', 'hallmark.php', 'index.html',
         'manifest.json', 'manifest.webmanifest', 'sw.js', 'js/app.js', 'js/admin.js', 'js/v116.js']

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
    # stamps
    ('index.html', 'window.__SHIVAA_REL=159;'),
    ('index.html', '/js/app.js?v=159'),
    ('index.html', '/css/styles.css?v=158'),
    ('index.html', '/js/v116.js?v=158'),
    ('index.html', '/css/v116.css?v=158'),
    ('sw.js', "shivaa-shell-v159"),
    ('sw.js', "'/js/app.js?v=159'"),
    ('sw.js', "'/js/v116.js?v=158'"),
    ('sw.js', "'/css/v116.css?v=158'"),
    ('sw.js', "'/css/styles.css?v=158'"),
    ('js/app.js', 'const APP_REL = 159;'),
    ('api.php', "'rel'   => 159,"),
    # the v159 guarantee
    ('js/app.js', 'function initCategoryTapGuarantee()'),
    ('js/app.js', 'const SEL = \'a[href^="#/shop?category="]\';'),
    ('js/app.js', 'try { initCategoryTapGuarantee(); } catch (e) {}'),
    ('js/app.js', "shvNavTo(a.getAttribute('href'), { watchdog: true, ev: e });"),
    ('js/app.js', 'setTimeout(() => setPanelOpen(false), 0);'),
    ('js/app.js', "history.pushState(null, '', target)"),
    # the categories control — one owner, reachable, never blank
    ('js/app.js', 'function initCatsMenu()'),
    ('js/app.js', 'function catsPanelHTML()'),
    ('js/app.js', 'function catsListHTML()'),
    ('js/app.js', 'try { initCatsMenu(); } catch (e) {}'),
    ('js/app.js', "if (scrim) scrim.addEventListener('click'"),
    ('js/app.js', "new MutationObserver(() => { if (!nav.classList.contains('open')) foldList(); })"),
    ('css/v116.css', 'top: var(--headerH, 120px);'),
    ('css/v116.css', 'body.cats-open .header { z-index: 2000 !important; }'),
    # v157 content carried forward
    ('js/app.js', 'LIVE SHIVAA RATE'),
    ('js/app.js', 'function refreshComparePage()'),
    ('js/app.js', 'const _bbLive = () => {'),
    ('js/app.js', 'const _svLive = () => {'),
    ('js/app.js', 'const g24 = (state.rates && state.rates.gold24)'),
    ('js/admin.js', 'BIS HALLMARKED · SHIVAA'),
    ('manifest.json', 'live Shivaa rates'),
    ('manifest.webmanifest', '"name": "Shivaa Jewellers",'),
    ('hallmark.php', 'function shv_storefront_copy(string $s): string'),
    ('api.php', 'function gold24_premium(array $db): int'),
    ('api.php', "'gold24' => (int)round($g24) + $gp24,"),
    ('css/styles.css', '.shivaa-hero{display:grid;grid-template-columns:1.15fr .85fr'),
]
ABSENT = [
    # the old duplicate owner must be gone from the shipped v116.js
    ('js/v116.js', 'wireCatsButton'),
    ('js/v116.js', 'catsBtn.onclick'),
    # the old broken wiring must be gone from app.js
    ('js/app.js', "$('#catMenu').innerHTML = `"),
    ('js/app.js', 'const closeMega = () =>'),
    # the sweep must not regress
    ('js/app.js', 'LIVE JAIPUR RATE'),
    ('js/app.js', 'class="jaipur-hero"'),
    ('js/app.js', 'const APP_REL = 157;'),
    ('js/app.js', 'const APP_REL = 158;'),
    ('index.html', 'app.js?v=158'),
    ('sw.js', 'shivaa-shell-v158'),
    ('api.php', "'rel'   => 158,"),
    ('js/app.js', "e.preventDefault(); e.stopPropagation();\n      try { if (window.Shivaa && window.Shivaa.haptic) window.Shivaa.haptic(10); } catch (_) {}\n      shvNavTo"),
    ('js/app.js', "addEventListener('scroll', () => { if (!panel.hidden) setPanelOpen(false); }, { passive: true });"),
    ('css/styles.css', 'jaipur-hero'),
    ('index.html', 'styles.css?v=107'),
    ('index.html', 'app.js?v=157'),
    ('sw.js', 'shivaa-shell-v157'),
    ('api.php', "'rel'   => 157,"),
]
ABSENT = [a for a in ABSENT if a[1]]

with zipfile.ZipFile(OUT) as z:
    bad, gone = [], []
    for name, marker in MARKERS:
        if marker.encode() not in z.read(name):
            bad.append('%s ← %r' % (name, marker))
    for name, marker in ABSENT:
        if marker.encode() in z.read(name):
            gone.append('%s still has %r' % (name, marker))
    import re as _re
    code = _re.sub(r'/\*[\s\S]*?\*/', '', z.read('js/v116.js').decode('utf-8'))
    code = _re.sub(r'^\s*//.*$', '', code, flags=_re.M)
    if 'navCats' in code:
        gone.append('js/v116.js still wires #navCats in code (the duplicate owner returned)')
    if bad or gone:
        raise SystemExit('ZIP VERIFICATION FAILED:\n  ' + '\n  '.join(bad + gone))

body = OUT.read_bytes()
print('%s — %d files, %.0f KB' % (OUT.name, len(names), OUT.stat().st_size / 1024))
print('md5 %s' % hashlib.md5(body).hexdigest())
print('sha256 %s' % hashlib.sha256(body).hexdigest())
for n in names:
    print('   ', n)
print('all %d v159 markers present inside the built zip ✦' % len(MARKERS))
