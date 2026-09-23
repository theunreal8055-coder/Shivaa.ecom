#!/usr/bin/env python3
"""Build the v174 code update from a committed revision.

v174 — owner report, 23 Sep 2026: "Photos of the products come and overlap
the title of the product."

ROOT CAUSE. The product gallery's swipe track is a composited layer — v118.css
gives it `will-change: transform` and `translate3d(0,0,0)` so a flick never
stutters. Clipping a composited child is the compositor's job, and a parent
that clips with `overflow: hidden` + `border-radius` is exactly the case where
that clip is unreliable on Android Chrome and some iOS WebKit builds: the
rounded frame stops masking the layer and the photo paints outside its box.
On the product page the photo frame sits directly above the title, so the
leaked pixels land on the words. The same hole exists on every rounded photo
frame in the grids.

THE REPAIR (css/v174.css, loaded last so it wins every tie):
  - `contain: paint` on the photo frames — compositor-enforced clipping that
    keeps the rounded corners, unlike overflow on a parent of a promoted layer
  - `.pd-info { position: relative; z-index: 2 }` — the title, price and CTAs
    win the paint order outright, so even a future leak lands *under* the words
  - `.pd-gallery { isolation: isolate }` — nothing inside the gallery can reach
    the sibling column at all
  - gallery images capped with max-width/max-height 100%, so a zoomed, pinched
    or drag-panned photo can never exceed its frame
  - the desktop sticky gallery is capped to the window height, so its lower
    half can no longer ride under the copy while scrolling
  - on phones the hero is capped at min(58dvh, 430px) so the piece's name,
    live price and "Make It Yours" are on the opening screen instead of below
    a full-bleed 1:1 photo
No size, spacing, radius or motion changes; nothing with transform-style:
preserve-3d is contained (that would flatten the card tilts).

Cumulative on v173 (shared-link crash), v172 (share button) and v171 (gallery
upload + category names): same files as before plus the new stylesheet, so
installing v174 alone on a v165+ site delivers all four.
Requires a full v165-or-newer CMS installation. No DB/uploads/host config.
Usage: python3 tools/mega/make-v174-zip.py [commit-ish; default HEAD]
"""
import hashlib
import subprocess
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
FILES = [
    'api.php', 'index.html', 'sw.js',
    'css/v174.css',          # NEW in v174 — the photo/title repair layer
    'js/app.js', 'js/admin.js',
]

def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT)

def build(revision='HEAD'):
    commit = git('rev-parse', '--verify', revision + '^{commit}').decode().strip()
    contents = {f: git('show', f'{commit}:cms/{f}') for f in FILES}
    stamp = '174'
    assert f'__SHIVAA_REL={stamp};'.encode() in contents['index.html']
    assert f'APP_REL = {stamp};'.encode() in contents['js/app.js']
    assert f"SHELL = 'shivaa-shell-v{stamp}'".encode() in contents['sw.js']
    assert f"'rel'   => {stamp},".encode() in contents['api.php']
    assert b"MEDIA = 'shivaa-media-v168'" in contents['sw.js']   # no media changed
    assert contents['index.html'].count(f'?v={stamp}'.encode()) >= 50
    assert f"'/css/v174.css?v={stamp}'".encode() in contents['sw.js']   # precached
    # the repair sheet must be the LAST stylesheet a real browser applies
    html = contents['index.html'].decode()
    import re
    links = re.findall(r'<link[^>]*rel="stylesheet"[^>]*href="(/css/[^"]+)"', html)
    assert links and links[-1] == f'/css/v174.css?v={stamp}', links[-3:]
    css = contents['css/v174.css'].decode()
    assert re.search(r'\.gal-wrap\s*\{\s*contain:\s*paint', css), 'contain:paint missing'
    assert re.search(r'\.pd-info\s*\{\s*position:\s*relative;\s*z-index:\s*2', css), 'paint order missing'
    assert re.search(r'\.pd-gallery\s*\{\s*isolation:\s*isolate', css), 'isolation missing'
    # v173 + v172 + v171 repairs must still be present (cumulative)
    assert b'const timeFmt = iso => {' in contents['js/app.js']
    assert b'pr = price(p, R)' in contents['js/app.js']
    assert b'window.Shivaa.shareProduct = async id =>' in contents['js/app.js']
    assert b'apgUpload' in contents['js/admin.js']
    assert b'window.Shivaa.CATS' in contents['js/admin.js']
    assert all(not f.startswith(('data/', 'uploads/', 'cms/')) and f != '.htaccess' for f in FILES)
    output = ROOT / 'shivaa-update-v174.zip'
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
