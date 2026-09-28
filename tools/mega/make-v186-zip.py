#!/usr/bin/env python3
"""Build v186 Design Selection mobile layout patch from a committed revision.

DELTA over confirmed LIVE v185 only. No DB, previous release assets, uploads,
configuration, credentials or separate billing app in the update.
Usage: python3 tools/mega/make-v186-zip.py [commit-ish]
"""
import hashlib
import re
import subprocess
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
FILES = ['api.php', 'css/v186.css', 'index.html', 'js/app.js', 'sw.js']

def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT)

def build(revision='HEAD'):
    commit = git('rev-parse', '--verify', revision + '^{commit}').decode().strip()
    contents = {f: git('show', f'{commit}:cms/{f}') for f in FILES}
    html, sw, app, api, css = (contents[f] for f in ['index.html','sw.js','js/app.js','api.php','css/v186.css'])
    stamp = '186'
    assert b'__SHIVAA_REL=186;' in html
    assert b'APP_REL = 186;' in app
    assert b"SHELL = 'shivaa-shell-v186'" in sw and b'const REL = 186;' in sw
    assert b"'rel'   => 186," in api
    assert b"MEDIA = 'shivaa-media-v168'" in sw  # no media generation bump
    assert html.count(b'?v=186') == 60 and sw.count(b'?v=186') == 55
    for name in ['index.html','sw.js','js/app.js']:
        assert b'?v=185' not in contents[name], f'{name} retains a v185 URL'
    links = re.findall(rb'<link[^>]*rel="stylesheet"[^>]*href="(/css/[^"]+)"', html)
    assert links and links[-1] == b'/css/v186.css?v=186'
    # The delta requires the v185 installation, NOT a replacement for it.
    for f in [b'/css/v184.css?v=186',b'/css/v185.css?v=186']:
        assert f in html and f in sw
    assert b'/css/v186.css?v=186' in sw
    assert b'/manifest.webmanifest?v=186' in html and b'/manifest.webmanifest?v=186' in sw
    assert b'aria-label="10g Gold Biscuit Scheme"' in html
    for gate in [b'repeat(2, minmax(0, 1fr))',b'#dsGrid > .ds-card',
                 b'#acctBtn',b'#wishBtn',b'.page-hero h1',b'max-width: 350px']:
        assert gate in css, f'missing Design Selection repair: {gate!r}'
    assert b'overflow-x: clip' not in css and b'overflow-x: hidden' not in css
    assert b'function shv_billing_sync_auth(array $db): array' in api
    assert b'function shv_sql_catalog_overlay(array &$db): void' in api
    for f in FILES:
        assert not f.startswith(('data/','uploads/','billing/'))
    out = ROOT / 'shivaa-update-v186.zip'
    with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED) as z:
        for f in FILES:
            info=zipfile.ZipInfo(f,date_time=(2026,9,28,20,0,0))
            info.compress_type=zipfile.ZIP_DEFLATED
            info.external_attr=0o644 << 16
            z.writestr(info,contents[f])
    data=out.read_bytes()
    print(f'built {out.name}: {len(FILES)} files, {len(data)} bytes')
    print(f'SHA-256 {hashlib.sha256(data).hexdigest()}')
    print(f'source commit {commit}')
    for f in FILES: print(f'  {f:22s} {len(contents[f]):8d}')
    return out

if __name__=='__main__': build(sys.argv[1] if len(sys.argv)>1 else 'HEAD')
