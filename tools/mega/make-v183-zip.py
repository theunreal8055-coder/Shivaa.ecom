#!/usr/bin/env python3
"""Build the v183 mobile responsive recovery update.

The package is a forward overlay on the current v182 storefront. It carries
v182's latest app/API/admin/SQL files so installing this update cannot pair a
new shell with older v181 code, plus the v183 responsive stylesheet.

Usage:
  python3 tools/mega/make-v183-zip.py                 # current working tree
  python3 tools/mega/make-v183-zip.py <commit-ish>     # committed source

The archive is root-layout for the existing CMS web root (public_html/).
"""
import hashlib
import re
import subprocess
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CMS = ROOT / 'cms'
FILES = [
    'api.php',
    'index.html',
    'js/app.js',
    'js/admin.js',
    'sw.js',
    'upgrade-sql.php',
    'css/v183.css',
]

def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT)

def build(revision='WORKTREE'):
    if revision.upper() == 'WORKTREE':
        contents = {name: (CMS / name).read_bytes() for name in FILES}
        source = 'working tree'
    else:
        commit = git('rev-parse', '--verify', revision + '^{commit}').decode().strip()
        contents = {name: git('show', f'{commit}:cms/{name}') for name in FILES}
        source = commit

    stamp = '183'
    for name, needle in [
        ('index.html', f'window.__SHIVAA_REL={stamp};'.encode()),
        ('js/app.js', f'APP_REL = {stamp};'.encode()),
        ('sw.js', f"SHELL = 'shivaa-shell-v{stamp}'".encode()),
        ('sw.js', f'const REL = {stamp};'.encode()),
        ('api.php', f"'rel'   => {stamp},".encode()),
    ]:
        assert needle in contents[name], f'{name} missing {needle.decode()}'

    assert b"MEDIA = 'shivaa-media-v168'" in contents['sw.js']
    assert contents['index.html'].count(b'?v=183') == 57
    assert contents['sw.js'].count(b'?v=183') == 52
    for name in ['index.html', 'js/app.js', 'sw.js']:
        assert b'?v=182' not in contents[name], f'{name} still pins v182 assets'
    assert b"'/css/v183.css?v=183'" in contents['sw.js'], 'responsive layer missing from offline shell'
    assert b'dsf-weight-field' in contents['js/app.js'], 'Design Selection mobile hooks missing'

    html = contents['index.html'].decode()
    styles = re.findall(r'<link[^>]*rel="stylesheet"[^>]*href="(/css/[^"]+)"', html)
    assert styles and styles[-1] == '/css/v183.css?v=183', styles[-3:]

    out = ROOT / 'shivaa-update-v183.zip'
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for name in FILES:
            info = zipfile.ZipInfo(name, date_time=(2026, 10, 4, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            archive.writestr(info, contents[name])

    data = out.read_bytes()
    with zipfile.ZipFile(out) as archive:
        assert archive.testzip() is None
        assert sorted(archive.namelist()) == sorted(FILES)
    print(f'built {out.name}: {len(FILES)} files, {len(data)} bytes')
    print(f'SHA-256 {hashlib.sha256(data).hexdigest()}')
    print(f'source {source}')
    for name in FILES:
        print(f'  {name:22s} {len(contents[name]):8d}')
    return out

if __name__ == '__main__':
    build(sys.argv[1] if len(sys.argv) > 1 else 'WORKTREE')
