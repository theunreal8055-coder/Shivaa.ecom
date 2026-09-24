#!/usr/bin/env python3
"""Build the v172 code update from a committed revision.

v172 — owner request, 23 Sep 2026: every customer gets a "share this piece"
control on the product page itself, so they can send the direct product link
(#/product/<id>) to friends.
  - New single share path window.Shivaa.shareProduct(id): native share sheet
    on phones (WhatsApp / SMS / any installed app), copy-link + toast on
    desktop, with the legacy execCommand clipboard fallback.
  - Product page now carries TWO share surfaces: the share icon next to the
    wishlist heart, and a "🔗 Share" button in the CTA row.
  - The quick-view popup's v102 share button now delegates to the same
    function (duplicated logic removed).
  - v57's per-piece OG cards already make the shared link unfurl with the
    product photo + name on WhatsApp — unchanged, just finally reachable.

Cumulative on v171 (gallery photo upload + category-name fix): includes the
same 5 files, so installing v172 alone on a v165+ site delivers both.
Requires a full v165-or-newer CMS installation. No DB/uploads/host config.
Usage: python3 tools/mega/make-v172-zip.py [commit-ish; default HEAD]
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
    stamp = '172'
    assert f'__SHIVAA_REL={stamp};'.encode() in contents['index.html']
    assert f'APP_REL = {stamp};'.encode() in contents['js/app.js']
    assert f"SHELL = 'shivaa-shell-v{stamp}'".encode() in contents['sw.js']
    assert f"'rel'   => {stamp},".encode() in contents['api.php']
    assert b"MEDIA = 'shivaa-media-v168'" in contents['sw.js']  # no media changed
    # v172 repair must be present in the packaged app.js
    assert b'window.Shivaa.shareProduct = async id =>' in contents['js/app.js']
    assert contents['js/app.js'].count(b'navigator.share(data)') == 1
    # v171 repairs must still be present (cumulative)
    assert b'apgUpload' in contents['js/admin.js']
    assert b'window.Shivaa.CATS' in contents['js/admin.js']
    assert all(not f.startswith(('data/', 'uploads/', 'cms/')) and f != '.htaccess' for f in FILES)
    output = ROOT / 'shivaa-update-v172.zip'
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
