#!/usr/bin/env python3
"""Build the v173 code update from a committed revision.

v173 — owner-reported crash on shared product links, 23 Sep 2026:
opening a shared #/product/<id> link cold (very first page load of a new
visitor) could render before /api/rates answered; the product page and the
WhatsApp order-message builders read `state.rates.t` / `state.rates.<metal>`
with state.rates still null, and the shopper's first impression of the shared
piece was "Something slipped — Cannot read properties of null (reading 't')".
  - timeFmt() is now null-safe ('' on falsy/invalid input; callers fall back
    to an honest word like 'today' / 'live · just updated').
  - The product page prices with the rates carried in its OWN /api/products/id
    answer and never assumes state.rates is hydrated.
  - Cart hero line, WhatsApp product/cart messages, price-drop alert modal,
    wishlist alerts and the checkout rate-lock reader are all guarded.

Cumulative on v172 (share button) and v171 (gallery upload + category names):
same 5 files, so installing v173 alone on a v165+ site delivers all three.
Requires a full v165-or-newer CMS installation. No DB/uploads/host config.
Usage: python3 tools/mega/make-v173-zip.py [commit-ish; default HEAD]
"""
import hashlib
import subprocess
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
FILES = [
    'api.php', 'index.html', 'sw.js',
    'js/app.js', 'js/admin.js',
]

def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT)

def build(revision='HEAD'):
    commit = git('rev-parse', '--verify', revision + '^{commit}').decode().strip()
    contents = {f: git('show', f'{commit}:cms/{f}') for f in FILES}
    stamp = '173'
    assert f'__SHIVAA_REL={stamp};'.encode() in contents['index.html']
    assert f'APP_REL = {stamp};'.encode() in contents['js/app.js']
    assert f"SHELL = 'shivaa-shell-v{stamp}'".encode() in contents['sw.js']
    assert f"'rel'   => {stamp},".encode() in contents['api.php']
    assert b"MEDIA = 'shivaa-media-v168'" in contents['sw.js']  # no media changed
    # v173 repair must be present in the packaged app.js
    assert b'const timeFmt = iso => {' in contents['js/app.js']
    assert b'pr = price(p, R)' in contents['js/app.js']
    assert b'state.rates.t)' not in contents['js/app.js'].replace(b'state.rates?.t)', b'').replace(b'timeFmt(state.rates.t)', b'')
    # v172 + v171 repairs must still be present (cumulative)
    assert b'window.Shivaa.shareProduct = async id =>' in contents['js/app.js']
    assert b'apgUpload' in contents['js/admin.js']
    assert b'window.Shivaa.CATS' in contents['js/admin.js']
    assert all(not f.startswith(('data/', 'uploads/', 'cms/')) and f != '.htaccess' for f in FILES)
    output = ROOT / 'shivaa-update-v173.zip'
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
