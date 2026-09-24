#!/usr/bin/env python3
"""Build the v171 code update from a committed revision.

v171 — two admin Add-product repairs requested by the owner on 23 Sep 2026:
  1. Product photos can now be uploaded straight from the phone's gallery /
     camera (admin.js posts to the existing admin-only /api/media endpoint);
     before, the form only offered the fixed stock-picture dropdown.
  2. The category dropdown printed "undefined" for every entry (admin.js kept
     a private flat string map while the template read `.name`), and it was
     missing 8 live categories. admin.js now reads window.Shivaa.CATS —
     the exact list the shop renders.

Requires a full v165-or-newer CMS installation. No DB/uploads/host config.
Usage: python3 tools/mega/make-v171-zip.py [commit-ish; default HEAD]
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
    stamp = '171'
    assert f'__SHIVAA_REL={stamp};'.encode() in contents['index.html']
    assert f'APP_REL = {stamp};'.encode() in contents['js/app.js']
    assert f"SHELL = 'shivaa-shell-v{stamp}'".encode() in contents['sw.js']
    assert f"'rel'   => {stamp},".encode() in contents['api.php']
    assert b"MEDIA = 'shivaa-media-v168'" in contents['sw.js']  # no media changed
    # the two v171 repairs must be present in the packaged admin.js
    assert b'apgUpload' in contents['js/admin.js']
    assert b'window.Shivaa.CATS' in contents['js/admin.js']
    assert b'CATS,' in contents['js/app.js']
    assert all(not f.startswith(('data/', 'uploads/', 'cms/')) and f != '.htaccess' for f in FILES)
    output = ROOT / 'shivaa-update-v171.zip'
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
