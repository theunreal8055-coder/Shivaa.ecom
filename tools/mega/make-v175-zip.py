#!/usr/bin/env python3
"""Build the v175 code update from a committed revision.

v175 — the product photo finally sits ABOVE the product title, plus the
Cashfree phone leak. Owner report, 23 Sep 2026:
  "Still the texts are not under the photos, they are actually now on. The
   photos and overlapping the photos still in phone, sliding options in
   product page is not working, the buttons when sliding change their
   positions and when I click buy now or checkout it shows my number pre
   fixed there 8905005921 on cashfree."

1 · THE PHOTO/TITLE OVERLAP (present since v104).
   styles.css pins the gallery so the photo stays in view while the details
   scroll past it on a desktop: `.pd-gallery{position:sticky;top:100px}`.
   Two later rules then fight over that on a phone:
     · styles.css ≤1080px → `.pd-gallery{position:static}`  — correct, because
       `top` is ignored on a statically positioned box, so the offset dies.
     · boost.css (ALL widths) → `.pd-gallery{position:relative}` so its zoom
       button has a containing block — but `top` DOES apply to a relatively
       positioned box, so this resurrected the 100px offset everywhere.
   On every phone the gallery was shoved 100px down inside its grid row: its
   lower half slid under the title, the title printed straight across the
   photograph, and the bottom of the frame (where the photo dots live) sat
   under the text where a thumb could never reach it — which is why swiping
   the picture "stopped working" and why the buttons looked misplaced.
   Verified in a real browser at 390x844: the title block used to start 76px
   BEFORE the photo ended; it now starts a clean 24px (the grid gap) after.
   Desktop keeps position:sticky;top:100px (boost.css had silently killed it
   at every width) — measured: title now sits entirely to the right of the
   photo, 52px clear.

2 · THE CASHFREE PHONE LEAK. api.php built the gateway's customer_phone with
   a fallback to $db['settings']['phone'] — the OWNER'S number. Every
   Express-lane customer, whose real number Cashfree collects and OTP-verifies
   on its own page exactly as the v154 boundary design intends, was shown the
   owner's personal 8905005921 pre-filled in the payment form. Cashfree only
   needs a syntactically valid 10-digit number at create-order (v143 proved an
   empty one is refused), so the placeholder is now a neutral number that
   belongs to nobody — the same treatment customer_email already gets. The
   shopper's real number is still used whenever we actually have one.

Cumulative on v174 (photo-frame containment + paint order), v173 (shared-link
crash), v172 (share button) and v171 (gallery upload + category names):
same files plus the new stylesheet, so installing v175 alone on a v165+ site
delivers all five. Requires a full v165-or-newer CMS installation. No
DB/uploads/host config. Usage: python3 tools/mega/make-v175-zip.py [commit-ish]
"""
import hashlib
import re
import subprocess
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
FILES = [
    'api.php', 'index.html', 'sw.js',
    'css/v175.css',          # NEW in v175 — the photo/title overlap root cause
    'css/v174.css',          # v174 — photo-frame containment + paint order
    'js/app.js', 'js/admin.js',
]

def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT)

def build(revision='HEAD'):
    commit = git('rev-parse', '--verify', revision + '^{commit}').decode().strip()
    contents = {f: git('show', f'{commit}:cms/{f}') for f in FILES}
    stamp = '175'
    assert f'__SHIVAA_REL={stamp};'.encode() in contents['index.html']
    assert f'APP_REL = {stamp};'.encode() in contents['js/app.js']
    assert f"SHELL = 'shivaa-shell-v{stamp}'".encode() in contents['sw.js']
    assert f"'rel'   => {stamp},".encode() in contents['api.php']
    assert b"MEDIA = 'shivaa-media-v168'" in contents['sw.js']   # no media changed
    assert contents['index.html'].count(f'?v={stamp}'.encode()) >= 50
    html = contents['index.html'].decode()
    # the repair sheet must be the LAST stylesheet a real browser applies
    links = re.findall(r'<link[^>]*rel="stylesheet"[^>]*href="(/css/[^"]+)"', html)
    assert links and links[-1] == f'/css/v175.css?v={stamp}', links[-3:]
    for sheet in ['v174.css', 'v175.css']:
        assert f"'/css/{sheet}?v={stamp}'".encode() in contents['sw.js'], sheet
    css = contents['css/v175.css'].decode()
    assert re.search(r'max-width:\s*1080px[\s\S]*?\.pd-gallery\s*\{\s*top:\s*auto', css), 'offset not dropped'
    assert re.search(r'min-width:\s*1081px[\s\S]*?\.pd-gallery\s*\{\s*position:\s*sticky;\s*top:\s*100px', css), 'desktop sticky'
    css174 = contents['css/v174.css'].decode()
    assert re.search(r'\.gal-wrap\s*\{\s*contain:\s*paint', css174), 'v174 containment'
    assert re.search(r'\.pd-info\s*\{\s*position:\s*relative;\s*z-index:\s*2', css174), 'v174 paint order'
    # the Cashfree phone leak must be closed
    assert b'$storePhone' not in contents['api.php'], 'shop-number fallback still present'
    assert b"$cfPlaceholder = '9000000000'" in contents['api.php'], 'neutral placeholder missing'
    assert b"'customer_phone' => $cfPhone" in contents['api.php']
    # v173 + v172 + v171 repairs must still be present (cumulative)
    assert b'const timeFmt = iso => {' in contents['js/app.js']
    assert b'pr = price(p, R)' in contents['js/app.js']
    assert b'window.Shivaa.shareProduct = async id =>' in contents['js/app.js']
    assert b'apgUpload' in contents['js/admin.js']
    assert b'window.Shivaa.CATS' in contents['js/admin.js']
    assert all(not f.startswith(('data/', 'uploads/', 'cms/')) and f != '.htaccess' for f in FILES)
    output = ROOT / 'shivaa-update-v175.zip'
    with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for name, content in contents.items():
            info = zipfile.ZipInfo(name, date_time=(2026, 9, 23, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            z.writestr(info, content)
    with zipfile.ZipFile(output) as z:
        assert z.testzip() is None
        assert z.namelist() == FILES
        for name, content in contents.items():
            assert z.read(name) == content, name
    print(f'Source commit: {commit}')
    print(f'{output.name}: {len(FILES)} files, {output.stat().st_size} bytes')
    print('SHA-256: ' + hashlib.sha256(output.read_bytes()).hexdigest())
    return output

if __name__ == '__main__':
    build(sys.argv[1] if len(sys.argv) > 1 else 'HEAD')
